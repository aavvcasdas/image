# Run 03 · MarkCard Studio（306★，GPL-3.0，2026-08-30）

上游：https://github.com/pangxiaobin/MarkCardStudio —— Vue 3 + Vite 的**本地优先** Markdown→卡片工作台
（同源 Tauri 桌面端），16 套主题、多种分页方式、导出 PNG/JPG/PDF/长图。

## 复现

```bash
# 1) 起开发服务器（本仓库把 vite.config.js 的 allowedHosts 打开、strictPort 放宽，便于浏览器预览）
cd projects/markcard-studio && npm i && npm run dev -- --host 0.0.0.0 --port 5180
# 2) 另一个终端：驱动真实 UI 导出
export LD_LIBRARY_PATH=/tmp/render-env/lib:$LD_LIBRARY_PATH
node tools/render-cards.mjs --md ../../runs/02-xhs-textcard/note.md --theme "Swiss Grid"   --out ../../runs/03-markcard-studio/swiss-grid
node tools/render-cards.mjs --md ../../runs/02-xhs-textcard/note.md --theme "Warm Journal" --out ../../runs/03-markcard-studio/warm-journal
```

- `tools/render-cards.mjs`（本项目新增）：Playwright 写入 CodeMirror 编辑器 → 选主题 → 点
  「Export PNG set (N pages)」→ 收集浏览器下载，等价于手工操作。
- 输出：1080×1440 PNG，每套 6 页。

## 验证要点

- 真实导出流程（浏览器 download 事件）拿到完整套图 ✅
- 主题差异：Swiss Grid（网格 + 荧光红块）、Warm Journal（暖纸 + 手账感）✅
- 已知情况：页脚默认带 `MarkCard Studio` 与日期水印，属上游行为；批量生产时可在设置里改署名或裁掉底栏。
