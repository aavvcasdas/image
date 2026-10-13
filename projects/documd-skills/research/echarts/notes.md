# ECharts 文档要点摘录（notes）

> 用途：`catalogue.md` 的支撑材料；后续引擎升级或复核时先看这里。
> 抓取日期：2026-09-21 · 版本：ECharts 6.1.0

## 1. Handbook 结构（导航全量，用于查漏）

- **Basics**：Download ECharts · Import ECharts · Get Help · What's New
- **Concepts**：Chart Container · Style · Dataset · Data Transform · Axis · Visual Mapping · Legend · Event and Action
- **How-To Guides**：Common Charts（Bar / Line / Pie / Scatter）· Custom Series · Common Components · Cross Platform · Data · Label · Animation · Interaction
- **Best Practices**：Canvas vs. SVG · Aria · Security Guidelines
- Best Practices 安全页提示：`title.link`、`title.sublink` 等 URL 字段**不做内部净化**，不可信来源有安全风险。

来源：https://echarts.apache.org/handbook/en/

## 2. 渲染器（对本仓库最关键）

> “Generally, Canvas is more suitable for charts with a large number of elements (heat map, large-scale line or scatter plot in geo or parallel coordinates, etc.), and with visual effect. However, SVG has an important advantage: It has less memory usage (which is important for mobile devices) and won't be blurry when zooming in.”

> “For larger amounts of data (>1k is an experience value), canvas renderer is always recommended.”

> “Note: Currently, some special effects still relies on Canvas: e.g. **trail effect** (`series-lines.effect`), **heatmap with blending effect**.”

SVG 渲染器自 v5.3.0 起用 Virtual DOM 重构，性能提升 2–10 倍。

**对本仓库的含义**：渲染器固定为 `svg` ⇒ ① trail / blending 类效果不可用，不得写进示例；② >1k 数据量的图不推荐在文档里出现；③ 放大不失真（适合导出为高分辨率图）是我们要保留的优点。

来源：https://echarts.apache.org/handbook/en/best-practices/canvas-vs-svg

## 3. 图表尺寸

- 容器有宽高时，`echarts.init(dom)` 默认取容器尺寸；
- 需要指定时用 `echarts.init(dom, null, { width, height })`；
- 运行时改尺寸用 `chart.resize()` 或 `chart.resize({ width, height })`（**不是** `resize(800, 400)`）；
- 容器被移除后必须 `dispose()` 再重建，否则内存泄漏。

**对本仓库的含义**：本仓库 `echarts-renderer.ts` 从 option 顶层读 `width`/`height`（默认 800×450）再传给 `init` —— 与文档的“指定尺寸”用法一致；示例里写 `width`/`height` 是安全的（该字段会被渲染器剥离后不进 `setOption`）。

来源：https://echarts.apache.org/handbook/en/concepts/chart-size

## 4. Bar 图表（已核对范例）

- 定义（文档原文）：“Bar Chart, is a chart that presents the **comparisons** among discrete data. The length of the bars is proportionally related to the categorical data.”
- 需 `series.type = 'bar'`；类别轴给 `xAxis.data`，数值轴范围由 `series.data` 自动生成。
- 多系列：`series` 数组里再加一个对象。
- 样式：`series.itemStyle`（`color` / `borderColor` / `borderWidth` / `borderType` / `barBorderRadius` / `opacity` / `shadow*`）；单柱可单独给 `itemStyle`（数据项写成 `{ value, itemStyle }`）。
- 柱宽：`barWidth`（可百分比，基准是类别宽度）、`barMaxWidth`、`barMinHeight`。
- 间距：`barGap`（同类别内系列间距，相对柱宽）、`barCategoryGap`（类别间间距）。
- 底色：`showBackground` + `backgroundStyle`（v4.7.0+）。
- ⚠️ 文档注意：“In the same cartesian coordinate system, the property will be shared by several column series. To make sure it takes effect on the graph, please set the property on the **last** bar chart series of the system.”

Bar 同族 How-To：Basic Bar · Stacked Bar · Bar Racing · Waterfall。
来源：https://echarts.apache.org/handbook/en/how-to/chart-types/bar/basic-bar

## 5. Option 手册顶层骨架（28 项，用于查漏）

```
title · legend · grid · xAxis · yAxis · polar · radiusAxis · angleAxis · radar ·
dataZoom · visualMap · tooltip · axisPointer · toolbox · brush · geo · parallel ·
parallelAxis · singleAxis · timeline · graphic · calendar · matrix · thumbnail ·
dataset · aria · series
```

来源：https://echarts.apache.org/en/option.html（setOption 骨架）

## 6. V6 变化（6.0.0+，影响示例写法）

- 新增 `matrix` 坐标系、`chord` 系列、`thumbnail` 组件；
- 组件/系列可用 `coordinateSystem` + `coordinateSystemUsage` 布局到 calendar/matrix 等坐标系；
- `richInheritPlainLabel`（默认 `true`）：v6 起 `label.rich` / `textStyle.rich` 的字体类属性继承普通文本样式，需要旧行为可设 `false`。

来源：Option 手册 `title.coordinateSystem` / `title.textStyle.richInheritPlainLabel` 条目；Examples Gallery 的 `matrix-*` / `chord-*` 分组。

## 7. Glossary（本项目内部用语）

- **读者问题**：这个图表回答读者什么问题（趋势/对比/构成/分布/关系/流向/层级/时间/达成度）——阶段 2 聚类的第一维度。
- **静态可读**：在「动画关闭 + PNG/SVG 导出」路径下仍然成立（不依赖交互与动画收敛）。
