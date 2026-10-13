# Run 01 · XHS-TextCard — Markdown → 小红书竖版卡片

- **上游**：https://github.com/geekfoxcharlie/XHS-TextCard （107★ / MIT / 2026-08-11）
- **它是什么**：纯前端「Markdown 长文 → 小红书系列图」工具，零后端、零上传；12 套模板，Canvas 逐像素渲染，导出 1242×1656。
- **跑法**：`node runs/01-xhs-textcard/run.mjs`（起静态服务 → Chromium 打开 editor.html → 调它自己的 `TemplateManager / TextSplitter / CanvasRenderer` 出 DataURL 落盘）
- **素材**：`content.md`（鸡汤文：低谷期最该做的 5 件事）
- **产出**：`out/` 下 4 套模板 × 3 页 = **12 张 1242×1656**

> 注：模板的封面图要显式给 `config.coverImage = assets/cover-<模板>.jpg`，否则首图会是「请上传封面图片」的空状态。
