# projects/ — 5 个 vendor 进本仓库的项目源码

这些目录是**上游项目的完整源码副本**（不含 `.git`），保留原许可证文件（见各自目录内 LICENSE）。
我们只做了两类改动，均已在下面注明，方便回溯：

1. **新增 `tools/` 驱动脚本**（不修改上游任何源码），用于在无网沙箱里批量出图；
2. **个别配置放宽**（如 MarkCard Studio 的 `vite.config.js` 允许反向代理域名访问），仅影响本地预览。

| 目录 | 上游 | 协议 | 我们加的东西 |
|------|------|------|-------------|
| `auto-redbook-skills/` | comeonzhj/Auto-Redbook-Skills | MIT | 无（上游脚本本身就支持 `-t/-m/--dpr`，直接调用） |
| `xhs-textcard/` | geekfoxcharlie/XHS-TextCard | MIT | `tools/render-cards.mjs`：无头驱动「选模板 → 分页 → 1242×1656 高清导出」，支持 `--cover` 注入 Arena 生图；为控制体积移除了 `assets/readme/`（README 配图，不影响运行） |
| `markcard-studio/` | pangxiaobin/MarkCardStudio | GPL-3.0 | `tools/render-cards.mjs`：驱动真实 UI 导出 PNG 套图；`vite.config.js` 的 `strictPort` 放宽为 `false` 并加 `allowedHosts: true`（原为 Tauri 桌面端配置，浏览器预览需要） |
| `takumi/` | kane50613/takumi | MIT / Apache-2.0 | `tools/quote-cards.mjs`：用 takumi 生成金句卡 + GIF 动态封面；为控制体积移除了 `takumi/tests/`、`assets/fonts/`、`assets/images/`（Rust 测试与文档配图，不影响 JS 用法） |
| `satori`（Run 06） | vercel/satori + @resvg/resvg-js | MPL-2.0 | **不 vendor**：当作依赖安装在仓库根（`npm i satori @resvg/resvg-js`），驱动脚本为 `setup/satori-cards.mjs` |
| `xiaohongshu-article-cards/` | qianjiazheng2023/xiaohongshu-article-cards | 见目录 | `tools/fill-content.mjs`：把内容 JSON 填进模板的卡片占位结构，产出可交给上游 `scripts/render_cards.mjs` 渲染的 HTML |

## 运行方式

见仓库根 `README.md` 的「30 秒跑通」。要点：

- 先 `bash archive/setup/render-env.sh`（Chromium + 中文字体），再 `bash setup/local-browser.sh`（把 Chromium 接到 playwright 期望的路径）。
- `playwright` / `sharp` / `takumi-js` 都是在**仓库根**安装的；`projects/auto-redbook-skills` 与 `projects/markcard-studio` 有自己的 `node_modules`，需要各自 `npm i`。

## 许可证提醒

- `markcard-studio` 是 **GPL-3.0**：若二次分发其衍生版本需遵守 GPL。
- `takumi` 为 MIT / Apache-2.0 双许可；其余见各目录 LICENSE。
- 本项目仅为技术实测，文案为自撰示例，未使用他人受版权保护的内容。
