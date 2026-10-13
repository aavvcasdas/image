# Run 03 · article-tools — 公众号封面生成器

- **上游**：https://github.com/eternityspring/article-tools （825★ / Apache-2.0 / 2026-08-03）
- **它是什么**：纯前端封面工具，13 套配色 + 多种装饰/字体/模板，用 html-to-image 在浏览器里截图，零依赖零后端。
  同类还有同仓库的二维码、MD→微信排版、MD→X 排版。
- **跑法**：`node runs/03-article-tools/run.mjs`
- **产出**：`out/` 下 **3 张 1808×724**（海蓝 / 琥珀 / 午夜三套配色）
- **离线适配**：`cover.html` 原本从 jsDelivr 取 html-to-image，已改为 `vendor/html-to-image.min.js`。

> 该工具的 `draft.md` 自动加载只写 `.value`、不派发 `input` 事件，预览不会刷新；脚本里显式派发事件后才拿到正确文案。
