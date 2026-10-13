# Run 6 · 本地生图服务替换云端图像 API

**做了什么**：把 `baoyu-skills` 里那条**依赖图像生成模型**的链路（原本走 codex-imagegen / nano-banana）
换成本机渲染，**技能的调用代码一行没改**，只是把 `base_url` 指到 `localimage/` 起的本地服务。

**为什么不能在技能层直接换成 HTML**：`baoyu-xhs-images` 的 SKILL.md 有一条硬规则——

> ⛔ Never substitute SVG, HTML, canvas, or other code-based rendering for raster image generation.

所以替换必须发生在**后端**：接口还是那个接口，返回的还是 PNG 字节，只是图是本地渲染出来的。

---

## 产出

| 文件 | 像素 | 走的哪条链路 |
|---|---|---|
| `01-cover.png` | 1024×1024 | `baoyu-image-gen --provider openai` → `/v1/images/generations` |
| `02-steps.png` | 1024×1024 | `baoyu-image-gen --batchfile` 批量模式 · task-01 |
| `03-xhs-34.png` | 768×1024 | 批量模式 · task-02（小红书 3:4） |
| `04-wide.png` | 1024×768 | 批量模式 · task-03（横版） |
| `05-via-gemini.png` | 1440×1440 | `--provider google` → `/v1beta/models/gemini-3-pro-image:generateContent` |
| `06-via-dashscope.png` | 1024×1024 | `--provider dashscope` → `/api/v1/services/aigc/multimodal-generation/generation` |
| `07-via-edits.png` | 1920×2118 | `POST /v1/images/edits`（multipart，参考图 + 文案） |
| `gallery/` | — | 服务侧的出图记录（同一个文件，保留服务端命名便于对照） |

- `prompts/` — 每个图的提示词文件（遵循 SKILL.md 要求的 `NN-{type}-[slug].md` 命名）
- `batch.json` — 批量任务清单

---

## 实测结果

```
★ provider=openai（单图）
Using openai / gpt-image-2.5-flare for single
/home/user/image/runs/06-local-imagegen/01-cover.png          → 1024×1024 ✓

★ 批量模式（--batchfile，3 个任务并发）
Batch generation summary:
- Total: 3   - Succeeded: 3   - Failed: 0                      → 768×1024 / 1024×1024 / 1024×768 ✓

★ provider=google
Generating image with Gemini... { imageSize: '2K' }
Generation completed.                                           → 1440×1440 ✓

★ provider=dashscope
Generating image with DashScope (wan2.5-t2i-preview)... { size: '1024*1024' } → 1024×1024 ✓

★ 官方 OpenAI SDK（openai npm 包）
SDK 返回 OK, 图片字节: 94976                                     → b64_json 可正常解码 ✓

★ /v1/images/edits（multipart）
HTTP 200, 359041 字节                                           → 1920×2118 ✓
```

服务端日志：

```
[gen #1] img-001-1024x1024.png  theme=editorial  title="为什么要给模型装上刹车"  689ms  (70KB)
[gen #3] img-003-1024x1024.png  theme=swiss  title="一次幻觉的四步生成过程"      545ms  (76KB)
[gemini #1] gemini-001-1440x1440.png  theme=swiss                              759ms
[dashscope #2] wanx-002-1024x1024.png  theme=editorial  ref=false              519ms
[edit #1] edit-001-1920x2118.png  refs=1  theme=swiss                          (330KB)
```

**单张 0.5–0.9 秒，无网络请求，无 API Key。**

---

## 复现

```bash
# 1) 起服务
bash setup/render-env.sh
export LD_LIBRARY_PATH=/tmp/render-env/lib:$LD_LIBRARY_PATH
node localimage/server.mjs --port 7860 --host 0.0.0.0 &

# 2) 用 baoyu-image-gen 打过去（provider=openai）
export OPENAI_BASE_URL=http://127.0.0.1:7860/v1 OPENAI_API_KEY=local
cd projects/baoyu-skills/skills/baoyu-image-gen
npx -y tsx scripts/main.ts --provider openai --model gpt-image-2.5-flare \
  --promptfiles <绝对路径>/runs/06-local-imagegen/prompts/01-cover-hallucination.md \
  --image <绝对路径>/runs/06-local-imagegen/01-cover.png --size 1024x1024

# 3) 批量
npx -y tsx scripts/main.ts --batchfile <绝对路径>/runs/06-local-imagegen/batch.json --jobs 3
```

---

## 踩过的坑

1. **DashScope 返回的必须是 URL，不能是 data URI。** 真实 DashScope 回的是 24 小时有效的图片链接，
   而 `baoyu-image-gen` 的 dashscope provider 直接对这项做 `Buffer.from(imageData,'base64')`。
   一开始我返回 `data:image/png;base64,...`，结果产出的是**损坏的 PNG**（PIL 直接报
   `UnidentifiedImageError`）。改成返回 `http://<host>/gallery/<file>` 后正常。
2. **`/images/edits` 不是 inpainting。** 本地没有扩散模型，实现是「参考图铺满 + 渐变遮罩 + 文案层」。
   第一版遮罩太浅（`.30 → .80`），浅色底图上的白字糊成一片；改成 `.38 → .93` 并给标题加文字阴影后才清楚。
3. **改图路径的尺寸默认取参考图原始尺寸**，除非调用方显式传了 `size`。
   第一次传了一张 1920×2118 的参考图，输出就是 1920×2118（而不是默认的 1024×1024）。
4. **输出像素别被 dpr 放大。** 第一版先算 `logical = size/dpr` 再排版，但把 `logical` 传给了
   HTML 当画布尺寸 → 768×1024 的请求产出 1536×2048。正确做法是：**排版用逻辑尺寸 + `dpr` 只负责放大**，
   因为版式比例与尺寸无关，最终像素才会严丝合缝。
5. **中文关键词不能用 `\b`。** JS 正则里 `\b` 是 `[A-Za-z0-9_]` 与 `\W` 的边界，`\b杂志\b` 永远匹配不到，
   导致「杂志风」这句话识别不出来，全部落到默认主题。中英关键词分开匹配才对。
6. **服务侧模块会被缓存**：`edit.mjs` 改完必须重启服务才生效（否则复现同一个字节数，容易误判成「没改成功」）。
