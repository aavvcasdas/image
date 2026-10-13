# Run 02 · MarkCard Studio — Vue3 桌面级图文排版

- **上游**：https://github.com/pangxiaobin/MarkCardStudio （306★ / GPL-3.0 / 2026-08-30）
- **它是什么**：本地优先的 Markdown → 社交媒体卡片工具（Vue 3 + Vite + Tauri），16 套主题、智能分页、导出 PNG/JPG/PDF/长图。
- **跑法**：
  ```bash
  cd projects/MarkCardStudio && npm i && npx vite build && cd -
  node runs/02-markcardstudio/run.mjs
  ```
  脚本用应用自己的 `markcard_studio_settings_v1` 设置项切主题与分页模式（等价于在设置面板点选），
  再走页面自带的「导入 Markdown」与「Export」按钮出图。
- **产出**：`out/` 下 4 主题 × 6 页 = **24 张 1080×1440**（瑞士网格 / 苹果备忘录 / 暗黑极客 / 复古报刊）

> 主题要在 localStorage 里写**配置里的中文名**（如 `瑞士网格`），界面上显示的 English 只是 i18n 翻译。写错名字会静默回落到默认主题。
