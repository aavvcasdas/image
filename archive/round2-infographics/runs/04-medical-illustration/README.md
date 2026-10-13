# Run 04 · wilbert-MD-PhD/medical-illustration（174★，MIT/CC BY，2026-10）

**项目**：面向 AI Agent 的医学绘图 skill —— 医学插画、科普漫画、涉及医学结构的科研示意图。
特点是**证据约束**：解剖/机制/比喻/影像要明确区分，不允许编造医学因果，交付物要留审核记录与可编辑源文件。

## 实跑产出

`figure.png` —— 机制科普图「**AI 是怎么"看"一张胸片的？**」（1080×2366 @2x）

- 五步机制：影像数字化 → 卷积提特征 → 逐层抽象 → 热力图定位 → 医生复核
- 头图来自 **Arena 生图**（`assets/gen-ai-radiology.png`，胸片 + AI 分析面板示意图）
- 明确标注：机制示意、非诊断依据、未使用真实病例；并说明 AI 辅助读片的**辅助**定位与已获批场景

`figure-spec.md` 按项目模板（`references/research-figure-spec.md`）逐项填写：
图稿 ID/版本、图型读者用途、一句话主旨、证据范围（已证实 vs 示意）、结构、机制关系、构图、图注与检查记录。

## 复现

```bash
export LD_LIBRARY_PATH=/tmp/render-env/lib:$LD_LIBRARY_PATH CHROME_BIN=/tmp/chromium
node ../../projects/epic-infographics/skills/epic-infographics/scripts/render.mjs \
     figure.html figure.png --width 1080 --height auto --scale 2
```

> 注：本项目本身不含渲染器（它是「给 Agent 的规范 + 资源」），所以渲染复用仓库内已适配的 HTML→PNG 链路；
> 这是 skill 类项目的正常用法——它约束「画什么、怎么标、留什么证据」，画布由通用渲染器完成。
