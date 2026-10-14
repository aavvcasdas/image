# Run 06 · Arena 生图 + 代码叠字 —— 「模型生图」那条链路

这是用户点名要的链路：**要模型生图，但把生图这一步换成 Arena 的生图**（不用 Codex / 不用任何外部图像 API）。

- **提示词来源**：https://github.com/joeseesun/qiaomu-codex-imagegen （131★ / MIT / 2026-10-04）
  它的 24 套模板 / 48 套预设 / Mondo 海报手法是**纯本地的提示词编排器**，`suggest` 与 `compose` 不需要任何密钥，本 run 直接调用。
- **文案来源**：Run 05 的 `ah-xhs-cover-title` 85 条公式库路由结果。
- **流程**：
  ```
  qiaomu compose（模板 T03-1 / T05-1 / T08-2）→ 提示词
      ↓ 交给 Arena 生图
  assets/01-light-gap.jpg、02-paper-terrace.jpg、03-window-flowers.jpg
      ↓ HTML/CSS 文字层（标题 + 标签 + 落款）
  out/*.png（1242×1656 成品卡片）
  ```
- **跑法**：
  ```bash
  # ① 生成底图（在 Arena 里，用 compose 出来的提示词）
  cd projects/qiaomu-codex-imagegen
  node scripts/cli.mjs compose --template T03-1 --var topic=低谷期 --text-mode none --ratio 3:4
  # ② 叠字出成品
  node runs/06-arena-imagegen/run.mjs
  ```
- **产出**：`assets/` 3 张底图（Arena 生成）+ `out/` **3 张成品**；`trace.json` 记录每张图从哪条公式、哪个模板来。
- **替换点就一处**：原技能的 `generate` 子命令（走本机 Codex CLI）→ **Arena 生图**。其余（风格库、比例、验收清单）原样保留。
