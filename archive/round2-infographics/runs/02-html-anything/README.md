# Run 02 · nexu-io/html-anything（9098★，Apache-2.0，2026-10）

**项目**：本地优先的「agentic HTML 编辑器」，官方自述 **no API key required**。仓库里有 **81 份 SKILL.md 模板规范**
（小红书卡片、杂志文章、海报、数据报告、九种 deck…），每份规定布局/配色/字体/信息密度，并附 `example.html`。
本 Run 按它的 [`card-xiaohongshu`](../../projects/html-anything/next/src/lib/templates/skills/card-xiaohongshu/SKILL.md) 规范创作。

## 实跑产出

`shots/card-01..07.png` —— 一套 7 张的 AI 科普卡片（1080×1440 @2x，小红书 3:4）：

1. 封面「AI 是怎么"读懂"你的话的」
2. 它在"猜下一个词"，不查字典
3. 一句话先被切成 token，再变成向量
4. 每个词都在"看"其他词（注意力）
5. 它是分三步练出来的（配图）
6. 为什么会一本正经地胡说
7. 尾卡：记住三件事（深色卡）

其中 4 张配图来自 **Arena 生图**：原图（`gen-*.png`，约 1.1–1.2 MB/张）在 `trim.mjs` 裁边后以
`trim-*.png` 入库，避免仓库体积翻倍；原图样例保留在 [Run 01](../01-antv-infographic/assets/gen-brain-circuit.jpg)。
裁边版以 `mix-blend-mode:multiply` 融进卡片底色，深色尾卡改用径向遮罩 + `screen` 混合。

## 复现

```bash
node trim.mjs   # sharp 裁掉配图白边（需 assets/gen-*.png 在场；裁边结果已随仓库提供）
export LD_LIBRARY_PATH=/tmp/render-env/lib:$LD_LIBRARY_PATH
node shoot.mjs cards.html .card shots card                 # 逐张元素截图（DPR=2）
```

## 与模板的差异（必要改动）

- 模板 `example.html` 用 Tailwind CDN + Google Fonts；沙箱离线 → 全部改写为**内联 CSS + 本地 Noto Sans SC**，版式与气质保持一致。
- 示例卡片夹带 emoji；沙箱无 emoji 字体（渲染成方框）→ 文案改为纯文字/符号。
