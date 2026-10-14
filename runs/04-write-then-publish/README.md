# Run 04 · 写了就发 — 一份 Markdown，两种输出

- **上游**：https://github.com/fxyadela/write-then-publish （569★ / 个人非商业许可 / 2026-10-04）
- **它是什么**：vanilla JS 单页工作台。同一份正文，可切成「图文卡片（自动分页，ZIP 打包）」或「公众号长文（html2canvas 出长图）」，图片可传可裁可拖。
- **跑法**：`node runs/04-write-then-publish/run.mjs`
- **产出**：
  - `out/graphic-layout-pages.zip` → 解出 `out/cards/`：**3 张 1728×2304** 图文卡片 + `原稿/content.md` 可编辑工程
  - `out/write-then-publish-article.zip` → 解出 `out/article-long.png`：**748×1475** 公众号长图
- **离线适配**：html2canvas / lucide 本地化；Supabase 用空桩（只用于云端账号，实测用不到）。

> 两个坑：① 内置「说明书」示例项目是只读的，点下载会被拦（`GUIDE_DOWNLOAD_MESSAGE`），要先「+ 新建」；
> ② 长图默认按侧栏预览宽度截图（只有 518px），脚本注入 `<style>` 覆盖到 750px 才是公众号可用宽度。
