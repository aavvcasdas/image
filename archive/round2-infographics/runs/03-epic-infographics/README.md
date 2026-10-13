# Run 03 · OrRon/EpicInfographics（440★，MIT，2026-08）

**项目**：一套「不让图看起来像 AI 做的」信息图 skill。核心是三件事：
多样化的数据表现（不要什么都是柱状图）、严格执行一种设计语言（design tokens 即法律）、**check→render→review 闭环**。
自带工具链：`scripts/check.mjs`（布局预检）、`render.mjs`（HTML → PNG）、`animate.mjs`（HTML → MP4/GIF）。

## 实跑产出

`infographic.png` —— 竖版长图「**六年，涨了 1.5 万倍**」（1080×1920 @2x）：

- 数据：GPT-1 117M → GPT-2 1.5B → GPT-3 175B → GPT-4 ~1.8T（业界估计，图中已标注）
- 视觉隐喻：**对数阶梯**——四级台阶 ∝ log10(参数量)，否则第一根柱子不足 1 像素
- 设计语言：editorial（纸白 #f7f4ec + 墨黑 + 单一强调色 #b23c17）
- 全部图形是手写 SVG，含台阶纹理 pattern、刻度线、倍数标注线

`brief.md` 是按 skill 流程先写的 brief（一句话主旨 / 读者站位 / 隐喻 / 数据映射 / 必标免责）。

## 复现

```bash
export LD_LIBRARY_PATH=/tmp/render-env/lib:$LD_LIBRARY_PATH CHROME_BIN=/tmp/chromium
SC=../../projects/epic-infographics/skills/epic-infographics/scripts
node $SC/check.mjs infographic.html --width 1080 --height 1920    # 预检：0 error
node $SC/render.mjs infographic.html infographic.png --width 1080 --height 1920 --scale 2
```

## 本地适配（改了 vendor 里的 3 个脚本）

项目脚本 import 的是 `playwright`（自带浏览器下载源不在白名单）。已把它改成：
`import { chromium } from 'playwright-core'` + `chromium.launch(LAUNCH_OPTS)`，
`LAUNCH_OPTS` 读取 `CHROME_BIN` 指向本地 Chromium。三处改动分别位于 `render.mjs` / `check.mjs` / `animate.mjs` 顶部。
