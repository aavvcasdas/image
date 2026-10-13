# localimage — 本地生图服务：把云端图像 API 换成本机渲染

> 一句话：**实现 OpenAI / Gemini / DashScope 三种图像接口的线上契约，但出图不走云端模型，而是本机 Chromium 把提示词编译成排版设计图。**
> 于是所有原本需要图像 API Key 的技能与脚本，改一个 `base_url` 就能零成本、离线、确定性地出图。

## 为什么这么做

那些「API 类」的图文项目（`baoyu-xhs-images`、`baoyu-infographic` 等）在它自己的 SKILL.md 里
写了一条硬规则：

> ⛔ **Never substitute SVG, HTML, canvas, or other code-based rendering for raster image generation.**

也就是说，**不能**在技能层把「出图」偷偷换成 HTML 截图——技能要的就是光栅图。
所以正确的替换点是**后端**：让 API 背后返回一张真图，只是这张图是本地算出来的。
技能一行代码都不用改，它拿到的仍是符合契约的 PNG 字节。

## 它实现了什么

| 端点 | 对应真实服务 | 请求形状 | 返回形状 |
|---|---|---|---|
| `POST /v1/images/generations` | OpenAI Images API | `{model,prompt,size,quality?}` | `{data:[{b64_json,...}]}` |
| `POST /v1/images/edits` | OpenAI Images Edit | multipart（`image[]` + `prompt` + `size`） | 同上 |
| `POST /v1/chat/completions` | OpenAI Chat（图片走 content） | `{messages:[...]}` | `choices[0].message.content` 含 `data:image/...;base64,` |
| `POST /v1beta/models/<m>:generateContent` | Google Gemini | `{contents:[{parts:[...]}],generationConfig:{imageConfig:{imageSize}}}` | `candidates[0].content.parts[0].inlineData.data` |
| `POST /api/v1/services/aigc/multimodal-generation/generation` | 阿里云 DashScope（通义万相） | `{model,input:{messages:[...]},parameters:{size}}` | `output.choices[0].message.content[0].image`（**URL**） |
| `GET /v1/models` · `/health` · `/v1/history` | — | — | 探测与观测 |
| `GET /` | — | — | 可视化面板：填提示词出图 + 画廊 |

尺寸写法各家不同，服务统一兼容：`1024x1024` / `1024*1024`（DashScope）/ `1K` / `2K` / `4K`（Gemini）。

## 提示词 → 图的编译过程

`render.mjs` 做三件事：

1. **识别风格** → 选主题。中英双语关键词表（中文不能用 `\b` 边界，JS 的 `\b` 只认 ASCII 单词）。
   14 个主题分三族：`editorial`（浅底衬线，swiss/editorial/minimal/notion/warm）、
   `soft`（浅底圆角，fresh/macaron/cute）、`bold`（深底大字，bold/neon/chalkboard/retro/pop/screenprint）。
2. **抽取文案** → 推荐在提示词里给一段结构化块，最可控：

   ```
   风格：杂志编辑风，暖色纸张
   标题：为什么大模型会一本正经地胡说八道
   副标题：它优化的是「说得像」，不是「说得对」
   要点：
   - 它是一台下一个词的概率机器
   - 缺口由语言顺畅度填补
   品牌：AI 科普图鉴
   ```

   没写结构化块时，会从引号内容 / 短句里猜标题。
3. **排版渲染** → 按主题的版式家族出 HTML，Chromium 截图。
   字号随画布短边的比例缩放，所以同一份文案在 768×1024 和 1024×1024 下观感一致。

**输出像素严丝合缝等于请求的 size**（不是 2 倍）：先按「逻辑尺寸」排版，再用 `dpr` 放大，
因为版式比例本身与尺寸无关。

## 启动

```bash
# 首次：准备 Chromium + 中文字体（只需一次）
bash setup/render-env.sh
export LD_LIBRARY_PATH=/tmp/render-env/lib:$LD_LIBRARY_PATH

# 启动服务
node localimage/server.mjs --port 7860 --host 0.0.0.0
```

- 面板：`http://localhost:7860/`
- 出图目录：`runs/06-local-imagegen/gallery/`（可用 `--out=<dir>` 改）

## 接入别的工具

只要它支持覆盖 base_url，就能接过来。已验证的几种：

```bash
# ① 官方 OpenAI SDK
export OPENAI_BASE_URL=http://127.0.0.1:7860/v1
export OPENAI_API_KEY=local          # 随便填，本地不校验

# ② baoyu-image-gen —— provider=openai
export OPENAI_BASE_URL=http://127.0.0.1:7860/v1 OPENAI_API_KEY=local
npx tsx projects/baoyu-skills/skills/baoyu-image-gen/scripts/main.ts \
  --provider openai --model gpt-image-2.5-flare \
  --promptfiles prompts/01-cover.md --image out/01.png --size 1024x1024

# ③ baoyu-image-gen —— provider=google
export GOOGLE_BASE_URL=http://127.0.0.1:7860 GOOGLE_API_KEY=local
npx tsx .../main.ts --provider google --model gemini-3-pro-image ...

# ④ baoyu-image-gen —— provider=dashscope
export DASHSCOPE_BASE_URL=http://127.0.0.1:7860 DASHSCOPE_API_KEY=local
npx tsx .../main.ts --provider dashscope --model wan2.5-t2i-preview ...
```

## 能力边界（说清楚，别误用）

| 能做 | 不能做 |
|---|---|
| 出**排版设计图**：大标题 + 副标题 + 要点 + 品牌页脚 | **画插画 / 场景 / 人物**——本地没有扩散模型，提示词里的画面描述不会变成画面 |
| 精确控制图上每个字（这是代码渲染的强项） | 把写实的「照片感」当输出 |
| 确定性出图：同提示词同结果，适合进 CI | 需要「每次都不一样的创意发散」 |
| `/images/edits`：保留参考图画面 + 叠一层文案 | 真·inpainting（擦除 / 局部重绘） |

`/images/edits` 的本地实现是**「底图铺满 + 渐变遮罩 + 文案层」**，覆盖科普图文最常见的
「拿一张图当底，把标题和要点压上去」。遮罩要够重，否则浅色底图上的白字会看不清。

## 文件

| 文件 | 作用 |
|---|---|
| `server.mjs` | HTTP 服务与三种 API 契约的适配层（含极简 multipart 解析） |
| `render.mjs` | 提示词编译器 + 主题表 + 14 套版式（复用 `setup/shot.mjs` 渲染） |
| `edit.mjs` | 改图路径（`/images/edits`、DashScope 带参考图）的渲染 |

依赖：`setup/shot.mjs`（Chromium 渲染）+ `setup/render-env.sh` 装好的环境。**不需要任何第三方 npm 包、不需要任何 API Key。**
