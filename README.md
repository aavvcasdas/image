# AI 鸡汤 / 涨粉图文 · 纯代码渲染方案实测

> 目标：找一批**不需要 API 接口**、**靠代码渲染**、**近 3 个月有更新**、**star 高**的「AI 鸡汤 / 涨粉图文」创作项目，
> 全部实跑产出成品。**模型生图的部分统一走 Arena 生图**（不再接任何第三方图像/大模型 API，也不接本地渲染服务）。

本仓库里所有成品图都是**真跑出来的**，不是截图拼贴：`runs/` 下的每一张图都能用下面命令重新生成。
画廊页：`runs/gallery.html`（76 张）。

---

## 一、入选项目（6 个，全部实跑）

| # | 项目 | Star | 最近更新 | 许可 | 形态 | 实跑产物 |
|---|------|------|---------|------|------|---------|
| 01 | [comeonzhj/Auto-Redbook-Skills](https://github.com/comeonzhj/Auto-Redbook-Skills) | **2358** | 2026-08-13 | MIT | Claude/Codex Skill + Node/Python 渲染脚本 | 4 套主题 × 6 张（含封面），1080×1440 / 2160×2880 |
| 02 | [geekfoxcharlie/XHS-TextCard](https://github.com/geekfoxcharlie/XHS-TextCard) | 107 | 2026-08-11 | MIT | 纯前端（零后端、零 API），Canvas 渲染 | 3 套模板 × 5–6 张，1242×1656，**封面换成 Arena 生图** |
| 03 | [pangxiaobin/MarkCardStudio](https://github.com/pangxiaobin/MarkCardStudio) | 306 | 2026-08-30 | GPL-3.0 | Vue3 + Vite 本地优先工作台（Tauri 桌面版同源） | 2 套主题 × 6 张，1080×1440，走真实「Export PNG set」 |
| 04 | [kane50613/takumi](https://github.com/kane50613/takumi) | **3098** | 2026-10-13 | MIT / Apache-2.0 | Rust + JSX/HTML → PNG/GIF，**不需要浏览器** | 6 张金句卡 1242×1656 + **动态 GIF 封面**，含 Arena 生图底图 |
| 05 | [qianjiazheng2023/xiaohongshu-article-cards](https://github.com/qianjiazheng2023/xiaohongshu-article-cards) | 37 | 2026-07-23 | — | Skill + 4 套卡片模板（HTML）+ 渲染/验收脚本 | 奶油信息卡 6 张轮播，1080×1440 |
| 06 | [vercel/satori](https://github.com/vercel/satori) + `@resvg/resvg-js` | **14068** | 2026-10-13 | MPL-2.0 | HTML/CSS → SVG → PNG（Vercel OG 的底座） | 4 张金句卡，1242×1656，含 Arena 生图封面 |

**为什么是这几个**：都满足「本地跑、不调外部 API」（`takumi` 的 API 命中是 Rust 源码里的 `image_resampler` 注释；`XHS-TextCard` 只有 README 提到「官方在线版有 AI 能力」，开源版明确声明零 API Key），且都是 2026-07-13 之后仍有提交。

### 被排除的候选（说明理由，避免重复踩坑）

| 项目 | Star | 排除原因 |
|------|------|---------|
| palxiao/poster-design（迅排设计） | 4914 | 以在线编辑器/服务端为主，需要部署后端与 OSS 等外部服务 |
| fxyadela/write-then-publish | 570 | 渲染可用，但主流程绑定 Supabase 云端与账号体系 |
| carbon-app/carbon | 36110 | 主打代码截图（视觉偏开发向），且 2026-02 后无更新，超出 3 个月窗口 |
| 各类「文生图 / AI 排版」Skill（vox-director、ai-image-prompt-cookbook 等） | 0.1k–2.3k | 依赖图像生成 API，不符合「不需要 API 接口」 |

---

## 二、30 秒跑通（复现）

```bash
# 0) 一次性：搭出无网沙箱里的 Chromium + 中文字体环境（幂等）
bash archive/setup/render-env.sh          # 静态 Chromium → /tmp/chromium，中文字体 → ~/.fonts
bash setup/local-browser.sh               # 让 playwright / puppeteer 直接复用上面的 Chromium
export LD_LIBRARY_PATH=/tmp/render-env/lib:$LD_LIBRARY_PATH
npm i                                     # 根依赖：playwright / sharp / takumi-js

# 01 Auto-Redbook-Skills（8 主题可选，这里跑 4 套）
cd projects/auto-redbook-skills
python3 scripts/render_xhs.py ../../runs/01-auto-redbook-skill/note.md \
        -o ../../runs/01-auto-redbook-skill/out-botanical -t botanical -m separator --dpr 2

# 02 XHS-TextCard（可 --cover 传入 Arena 生图当封面）
cd ../xhs-textcard
node tools/render-cards.mjs --md ../../runs/02-xhs-textcard/note.md --template elegant-book \
     --out ../../runs/02-xhs-textcard/elegant-book --cover ../../runs/assets/arena/03-quiet-lake.png --signature "慢下来"

# 03 MarkCard Studio（先起开发服务器）
cd ../markcard-studio && npm i && npm run dev -- --host 0.0.0.0 --port 5180 &
node tools/render-cards.mjs --md ../../runs/02-xhs-textcard/note.md --theme "Warm Journal" --out ../../runs/03-markcard-studio/warm-journal

# 04 takumi（金句卡 + 动图封面，全程无浏览器）
cd /home/user/image
node projects/takumi/tools/quote-cards.mjs --content runs/04-takumi/quotes.json \
     --out runs/04-takumi --bg-dir runs/assets/arena

# 06 satori（HTML/CSS → SVG → PNG，无需浏览器）
node setup/satori-cards.mjs --content runs/06-satori/quotes.json --out runs/06-satori --bg-dir runs/assets/arena

# 05 小红书轮播卡片 Skill
cd projects/xiaohongshu-article-cards
node tools/fill-content.mjs --template assets/cream-editorial/card-generator.html \
     --content ../../runs/05-article-cards/content.json --out ../../runs/05-article-cards/cream-editorial.html
CHROME_PATH=/tmp/chromium node scripts/render_cards.mjs ../../runs/05-article-cards/cream-editorial.html \
     ../../runs/05-article-cards/cream-editorial cream
```

> 沙箱提示：本项目环境**没有**预装浏览器/中文字体/ffmpeg。`archive/setup/render-env.sh` 会把静态 Chromium、
> NSS 依赖库、Noto Sans SC/Serif SC 字体全部装好；`setup/local-browser.sh` 再把它们接到 playwright 期望的路径上，
> 因此上游脚本**一行都不用改**（`auto-redbook-skills` 直接跑、`xiaohongshu-article-cards` 只需 `CHROME_PATH`）。

---

## 三、模型生图怎么接（用户要求：把 API 换成 Arena 生图）

**原则**：渲染、排版、分页、导出全部由项目自己的代码完成；**只有「需要一张图/一张底图」的地方交给 Arena 生图**。
没有任何项目在运行时调用第三方图像 API。

| 位置 | 接法 | 落地案例 |
|------|------|---------|
| 封面 / 底图 | Arena 生图产物放进 `runs/assets/arena/`，以 **dataURL 注入项目的封面配置** | `runs/02-xhs-textcard/*`（换掉模板自带封面）、`runs/04-takumi/0[126]-*.jpg`（图卡底图） |
| 插图 | 同上，作为卡片的 `bg` / `coverImage` 字段 | `runs/04-takumi/*`、`runs/02-xhs-textcard/*` |
| 动态封面 | takumi 直接渲染 GIF/动画 WebP，底图同样来自 Arena | `runs/04-takumi/cover-animated.gif` |

satori（Run 06）的接法同理：`photo-top` 主题把 Arena 生图铺在上半部，下半部由代码排版文字
（`setup/satori-cards.mjs` 里把图片转成 dataURL 内联，规避 satori 的 SSRF 防护）。

现有 Arena 素材：`runs/assets/arena/01-morning-window.png`、`02-sunrise-mountain.png`、`03-quiet-lake.png`、
`04-night-city-window.png`、`05-desk-watercolor.png`（治愈系扁平/水彩插画，均留了文字安全区）。

---

## 四、目录结构

```
├── README.md               ← 本文件（方向 / 选品 / 复现 / Arena 接法）
├── projects/               ← 5 个项目的 vendor 源码 + 我们加的驱动脚本（见 projects/README.md）
├── runs/                   ← 实跑产物（01–05）+ 画廊 runs/gallery.html + Arena 素材
├── setup/                  ← 本项目自建工具：local-browser.sh、local-chromium.cjs、build-gallery.mjs、optimize-images.mjs
└── archive/                ← 上一轮（图文卡片方向）的完整成果，已归档，保留可回溯
```

---

## 五、实测环境与已知限制

- 沙箱：Linux x64、Node 22、Python 3.11；**无浏览器、无中文字体、无 ffmpeg**（均已用上述脚本补齐）。
- 中文渲染：统一使用 `~/.fonts` 的 Noto Sans SC / Noto Serif SC；Emoji 用 `NotoEmoji`（单色，不是彩色 emoji）。
- 体积策略：`runs/**` 中大于 320KB 的成品图转成 **JPEG q90**（小红书等平台本身会二次压缩），
  原图可用上面的命令随时重生成；转换脚本见 `setup/optimize-images.mjs`。
- `projects/*/node_modules` 不入库（`.gitignore`），按上面命令 `npm i` 即可。
