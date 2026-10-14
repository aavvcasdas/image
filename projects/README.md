# projects/ — 本仓库 vendor 的第三方项目

按「**创建 AI 鸡汤图文 / 容易涨粉的图文**」这个目标选品，入选标准：

| 标准 | 说明 |
|---|---|
| **不需要 API Key** | 克隆下来就能跑，不依赖任何云端服务/密钥 |
| **代码渲染** | 产出由 HTML/CSS/Canvas/Markdown 渲染出来，不靠文生图模型「一次成型」 |
| **近 3 个月有更新** | `pushed_at` ≥ 2026-07-13 |
| **star 高** | 尽量取同品类头部 |

选品时的 star / 最近推送（2026-10-13 核查）：

| 项目 | star | pushed_at | License | 渲染方式 | 在本仓库对应 Run |
|---|---:|---|---|---|---|
| [geekfoxcharlie/XHS-TextCard](https://github.com/geekfoxcharlie/XHS-TextCard) | 107 | 2026-08-11 | MIT | 纯前端 Canvas 渲染，12 套模板 | `runs/01-xhs-textcard` |
| [pangxiaobin/MarkCardStudio](https://github.com/pangxiaobin/MarkCardStudio) | 306 | 2026-08-30 | GPL-3.0 | Vue3 + html-to-image，16 套主题 | `runs/02-markcardstudio` |
| [eternityspring/article-tools](https://github.com/eternityspring/article-tools) | 825 | 2026-08-03 | Apache-2.0 | 纯 HTML/CSS + html-to-image | `runs/03-article-tools` |
| [fxyadela/write-then-publish](https://github.com/fxyadela/write-then-publish) | 569 | 2026-10-04 | 个人非商业许可 | 原生 JS + html2canvas | `runs/04-write-then-publish` |
| [ahang008/ah-xhs-cover-title](https://github.com/ahang008/ah-xhs-cover-title) | 179 | 2026-10-03 | MIT | 85 条爆款公式库（Skill，配代码渲染出封面） | `runs/05-ah-xhs-cover-title` |
| [joeseesun/qiaomu-codex-imagegen](https://github.com/joeseesun/qiaomu-codex-imagegen) | 131 | 2026-10-04 | MIT | 24 模板 / 48 预设的**生图提示词**库（生图那步换成 Arena） | `runs/06-arena-imagegen` |

## 关于「生图 API」的处理

用户明确要求：**要模型生图，但把原来的生图 API / 模型换成 Arena 的生图。**

- 上面 5 个渲染类项目本来就**不涉及生图**：文字卡片、封面、长图全部由代码排版渲染，直接跑通并出图（Run 01–05）。
- `qiaomu-codex-imagegen`（Run 06）原本把生图请求转发给本机的 **Codex CLI**。本仓库只保留它的**风格库与提示词编排**（`suggest` / `compose`，纯本地、零网络），
  真正出图那一步改为 **Arena 生图**，再用代码把标题层叠上去 → 成品既是「模型生图」又不依赖任何外部图像 API。

## 各项目的离线适配（只改「取依赖」，不改功能）

沙箱与浏览器环境没有外网，页面里指向 CDN 的 `<script>` 会静默失败。为此把依赖本地化：

| 项目 | 改动 | 原因 |
|---|---|---|
| `write-then-publish` | `index.html` 里 html2canvas / lucide 指向 `src/vendor/`；新增 `src/vendor/supabase-stub.js` | 原页面从 jsDelivr 取包；Supabase 只用于云端账号，实测用不到 |
| `article-tools` | `cover.html` 等把 html-to-image / marked / jsQR / qrcodejs 指向 `vendor/` | 同上 |
| `MarkCardStudio` | 补齐 `vite.config.js`，`npm i && npx vite build` | 上游没把 vite 配置一并发布到本仓库快照里 |
| 全部 | 未改动任何渲染逻辑 | 出图效果与上游一致 |

## 未收录的候选（含原因）

| 项目 | star | 原因 |
|---|---:|---|
| `Jamailar/Beav`（小红书 AI 运营工作台） | 1937 | 采集/写作链路依赖平台接口，非「零 API + 代码渲染」 |
| `tiniwap/AIWriteX`（公众号全自动） | 2088 | 全流程依赖 LLM / 生图接口 |
| `aiworkskills/wechat-article-skills` | 679 | 21 处 API Key 依赖（生图/LLM），纯 Agent 编排无渲染器 |
| `caol64/wenyan`（文颜排版） | 1071 | 排版面向公众号富文本，导出图能力弱于 article-tools |
| `dromara/yft-design` | 1660 | 在线设计工具，偏交互编辑器，非批量出图 |
| `geekjourneyx/md2wechat-skill` | 3696 | 发布链路绑定微信草稿接口 |
| `toil-oil/oil-cover` | 266 | 仓库已 404（改名/删除） |

## 许可证

各项目版权归原作者，`projects/<name>/LICENSE` 为原始许可证文件。使用前请自行确认是否符合你的用途
（`write-then-publish` 是**个人非商业**许可，`MarkCardStudio` 是 GPL-3.0）。

---

## 第二批 vendor（Run 07–12）

| 项目 | star | pushed_at | License | 渲染方式 | 对应 Run |
|---|---:|---|---|---|---|
| [comeonzhj/Auto-Redbook-Skills](https://github.com/comeonzhj/Auto-Redbook-Skills) | 2358 | 2026-08-13 | MIT | Python/Node + Playwright，8 主题 × 4 分页模式 | `runs/07-auto-redbook-skills` |
| [kane50613/takumi](https://github.com/kane50613/takumi) | 3098 | 2026-10-13 | MIT / Apache-2.0 | Rust 内核 + JSX/HTML → PNG/GIF，**无需浏览器** | `runs/10-takumi` |
| [qianjiazheng2023/xiaohongshu-article-cards](https://github.com/qianjiazheng2023/xiaohongshu-article-cards) | 37 | 2026-07-23 | 见目录 | HTML 卡片模板 + Playwright 渲染 / 布局验收脚本 | `runs/11-xiaohongshu-article-cards` |
| [vercel/satori](https://github.com/vercel/satori)（作为依赖，不 vendor） | 14068 | 2026-10-13 | MPL-2.0 | HTML/CSS → SVG；配 `@resvg/resvg-js` 出 PNG | `runs/12-satori`（驱动：`setup/satori-cards.mjs`） |

**去重说明**：`XHS-TextCard` 与 `MarkCardStudio` 在两批里都入选，仓库只保留**一份 vendor 源码**
（`projects/XHS-TextCard`、`projects/MarkCardStudio`）；第二批的驱动脚本 `tools/render-cards.mjs`
直接放在这两个目录里，与第一批的 `runs/*/run.mjs` 共用同一份源码（已实测两条链路都能跑通）。

**第二批体积裁剪**（不影响功能）：
`projects/takumi` 去掉 `takumi/tests/`、`assets/fonts/`、`assets/images/`（Rust 测试与文档配图）；
`projects/XHS-TextCard` 去掉 `assets/readme/`（README 配图）。
