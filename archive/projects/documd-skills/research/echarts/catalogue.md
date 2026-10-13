# ECharts — 图表目录与覆盖账本（Engine Capability Catalogue）

| 项 | 值 |
|---|---|
| 引擎 | Apache ECharts **6.1.0**（本仓库 `node_modules/echarts`） |
| 文档版本 | echarts.apache.org 英文站（Option / Handbook / Examples Gallery） |
| 调研日期 | 2026-09-21 |
| 调研人 | Copilot（阶段 1a 首轮） |
| 状态 | **进行中**：能力全集已枚举完毕；逐图表特性表仅 `bar` 已按文档全文核对，其余待逐页核对（§6 工单） |
| 依据 | `plans/skills-restructure-plan.md` §3.2 调研协议（docs-first，代码只用于标注实现边界） |

**验证状态图例**

| 标记 | 含义 |
|---|---|
| ✅ | 已按官方文档核对，本行带引用 |
| ⏳ | 已枚举，但「何时用 / 何时别用」等结论**待逐页核对**（入口见 §6） |
| ❌ | 不收录（理由已写明） |

> `F D` 表示字段来源：`F` = 该行已在 §2 全集清单里逐条处置；`D` = 已对照官方文档。

---

## 1. 文档入口（调研范围）

| 入口 | URL | 用途 |
|---|---|---|
| Option 手册 | https://echarts.apache.org/en/option.html | 组件与 series 全量配置（按 `#series-<type>` 锚点引用） |
| Examples Gallery | https://echarts.apache.org/examples/en/index.html | **图表族目录**（本文件 §2.1 的基线） |
| Handbook | https://echarts.apache.org/handbook/en/ | 概念 / How-To / 最佳实践 |
| Handbook · Chart Container | https://echarts.apache.org/handbook/en/concepts/chart-size | 图表尺寸（对应本仓库 `width`/`height` 用法） |
| Handbook · Canvas vs SVG | https://echarts.apache.org/handbook/en/best-practices/canvas-vs-svg | 渲染器选择（本仓库用 SVG 渲染器） |
| Handbook · Aria | https://echarts.apache.org/handbook/en/best-practices/aria | 无障碍 |
| Handbook · Security | https://echarts.apache.org/handbook/en/best-practices/security | `title.link` 等不做净化，勿接不可信来源 |
| GL（3D）手册 | https://echarts.apache.org/en/option-gl.html | 3D/GL 能力（本仓库 **无** echarts-gl → ❌） |

**Handbook 导航全量**（用于查漏，2026-09-21 抓取）

- Basics: Download / Import / Get Help / What's New
- Concepts: Chart Container · Style · Dataset · Data Transform · Axis · Visual Mapping · Legend · Event and Action
- How-To: **Common Charts**（Bar: Basic/Stacked/Bar Racing/Waterfall；Line；Pie；Scatter）· Custom Series · Common Components · Cross Platform · Data · Label · Animation · Interaction
- Best Practices: Canvas vs. SVG · Aria · Security Guidelines

---

## 2. 能力全集（官方目录基线，逐条处置）

### 2.1 图表族（Examples Gallery 的 chart-type 分组，**24 族**）

| # | 族（官方分组） | series `type` | 读者问题（§Phase2 用） | 处置 |
|---|---|---|---|---|
| 1 | Line | `line` | 趋势 / 随时间变化 | 收录 |
| 2 | Bar | `bar` | 对比 / 排名 / 构成（堆叠） | 收录 |
| 3 | Pie | `pie` | 占比（少量分类） | 收录 |
| 4 | Scatter | `scatter` `effectScatter` | 相关 / 分布 / 离群 | 收录 |
| 5 | GEO/Map | `map` / `geo` | 地理分布 | **❌ 不收录**：需 `registerMap`，本仓库包内无内建地图（§4 边界） |
| 6 | Candlestick | `candlestick` | 金融区间（OHLC） | 收录（T2 候选） |
| 7 | Radar | `radar` | 多指标画像 | 收录 |
| 8 | Boxplot | `boxplot` | 分布形态 / 离群 | 收录 |
| 9 | Heatmap | `heatmap` | 二维密度 / 日历热力 | 收录（⚠️ blend 效果依赖 canvas） |
| 10 | Graph | `graph` | 关系网络 | 收录（⚠️ 力导向为动画） |
| 11 | Lines | `lines` | 大规模轨迹（流向） | 收录（⚠️ trail 效果依赖 canvas） |
| 12 | Tree | `tree` | 层级 / 组织结构 | 收录 |
| 13 | Treemap | `treemap` | 层级 + 量级占比 | 收录 |
| 14 | Sunburst | `sunburst` | 层级占比（环形） | 收录 |
| 15 | Parallel | `parallel` | 多维对比 | 收录（T2 候选） |
| 16 | Sankey | `sankey` | 流向 / 构成转移 | 收录 |
| 17 | Funnel | `funnel` | 转化 / 阶段流失 | 收录 |
| 18 | Gauge | `gauge` | 单指标达成度 | 收录 |
| 19 | PictorialBar | `pictorialBar` | 图文对比（符号化柱） | 收录（T2 候选） |
| 20 | ThemeRiver | `themeRiver` | 主题随时间构成变化 | 收录（T2 候选） |
| 21 | Calendar | `calendar` | 日粒度时间分布 | 收录（T2 候选） |
| 22 | Matrix | `matrix` | 多图矩阵 / 相关矩阵 | 收录（v6 新能力，T2 候选） |
| 23 | Chord | `chord` | 双向关系强度 | 收录（v6 新增，T2 候选） |
| 24 | Custom | `custom` | 任意自定义图形 | **❌ 不收录**：需写 `renderItem` JS 函数，而本 skill 只产出 JSON option |

非图表族的 Gallery 分组（概念类，不产出示例）：`Dataset`、`DataZoom`、`Graphic`、`Rich Text` → 归入 §2.4 能力项。

### 2.2 GL / 3D（11 族）—— 全部 ❌

`globe`(3D Globe) · `bar3D` · `scatter3D` · `surface` · `map3D` · `lines3D` · `line3D` · `scatterGL` · `linesGL` · `flowGL` · `graphGL`

理由：需要 **echarts-gl** 扩展，本仓库 `node_modules` 无此包（`import * as echarts from 'echarts'` 不含 GL）。替代：二维等价图型（`scatter`/`graph`/`heatmap`）。

### 2.3 顶层组件（Option 手册 setOption 骨架，**28 项**）

| 组件 | 作用 | 处置 |
|---|---|---|
| `title` | 标题 / 副标题（支持富文本 `rich`） | 收录（示例统一带 `title`） |
| `legend` | 系列图例 | 收录 |
| `grid` | 直角坐标系容器（多图布局） | 收录 |
| `xAxis` / `yAxis` | 直角坐标轴（含 `min`/`max`/`type`/`axisLabel`） | 收录 |
| `polar` / `radiusAxis` / `angleAxis` | 极坐标（径向柱、玫瑰图） | 收录（T2） |
| `radar` | 雷达坐标系 | 收录 |
| `dataZoom` | 缩放/滚动条 | **❌ 交互专属**（静态导出生效但无意义）→ 在 `engines/echarts.md` 记一句 |
| `visualMap` | 视觉映射（颜色/大小） | 收录 |
| `tooltip` | 悬停提示 | **❌ 交互专属**（导出不可见） |
| `axisPointer` | 轴指示器 | ❌ 交互专属 |
| `toolbox` | 工具箱（保存图片等） | ❌ 交互专属 |
| `brush` | 框选 | ❌ 交互专属 |
| `geo` | 地理坐标系 | ❌（同 2.1 #5） |
| `parallel` / `parallelAxis` | 平行坐标 | 收录（T2） |
| `singleAxis` | 单轴（ThemeRiver 基础） | 收录 |
| `timeline` | 时间轴（多帧轮播） | **❌ 交互/动画专属**（静态只能取一帧） |
| `graphic` | 任意图形元素（水印、标注） | 收录（T2，静态可用） |
| `calendar` | 日历坐标系 | 收录（T2） |
| `matrix` | 矩阵坐标系（v6） | 收录（T2） |
| `thumbnail` | 缩略图导航（v6） | ❌ 交互专属 |
| `dataset` | 数据源 + 编码（`encode`/`dimensions`） | 收录（推荐写法） |
| `transform` | 数据变换（filter/sort/boxplot/...） | 收录（推荐写法） |
| `aria` | 无障碍描述 | 收录（导出为 SVG 时利于可读性） |

### 2.4 数据与呈现能力项

| 能力 | 文档入口 | 处置 |
|---|---|---|
| `dataset` + `encode` + `dimensions` | handbook/concepts/dataset | 收录 |
| `transform`（filter / sort / boxplot / 聚合） | handbook/concepts/data-transform | 收录 |
| 富文本 label（`rich`） | handbook（Rich Text） | 收录（T2） |
| 视觉映射（颜色/大小编码） | handbook/concepts/visual-map | 收录 |
| 事件与 action | handbook/concepts/event | ❌ 交互专属 |
| SVG / Canvas 渲染器 | handbook/best-practices/canvas-vs-svg | **本仓库固定 SVG 渲染器**（§4） |

---

## 3. 逐图表特性表

> 字段定义见 `plans/skills-restructure-plan.md` §3.2.2。**仅 `bar` 行已完成文档级核对**，其余为枚举 + 读者问题归类，
> 「何时用/别用」「关键选项」待 §6 工单逐页补齐（当前标 ⏳）。

### 3.1 已核对

#### bar（柱状 / 条形）✅

| 字段 | 内容 |
|---|---|
| 名称 | Bar Chart（`series.type = 'bar'`） |
| 回答什么问题 | 离散类别之间的**对比**（文档原文：“presents the comparisons among discrete data”，bar 长度与类别值成比例） |
| 什么时候用 | 类别数适中、需要精确比较量级；横向条形用于长类别名 / 排名 |
| 什么时候别用 | 类别极多（改 `heatmap` / 表格）；要表达趋势（改 `line`）；要表达占比且类别少（`pie` 亦可，但柱状更易比较） |
| 数据形态 | 类别轴 + 数值轴；多系列 = 多个 `series` 条目 |
| 关键选项 | `barWidth` / `barMaxWidth` / `barMinHeight`（柱宽、最大宽、最小高）；`barGap`（同类别内系列间距）、`barCategoryGap`（类别间间距）；`showBackground` + `backgroundStyle`（v4.7+ 柱底色）；`itemStyle`（圆角/描边/阴影）；**堆叠用 `stack`** |
| 邻近边界 | 时间序列 → `line`；多类别构成 → `bar` + `stack` 或 `treemap`；占比 → `pie`（少量）/ `treemap`（层级） |
| 官方注意 | 同一笛卡尔坐标系内 `barGap`/`barCategoryGap` **由多个柱系列共享，需设在最后一个柱系列上**才生效 |
| 引用 | https://echarts.apache.org/handbook/en/how-to/chart-types/bar/basic-bar · https://echarts.apache.org/en/option.html#series-bar |

**官方 How-To 子页**（同族变体，需各自判断是否单独出示例）：Basic Bar · Stacked Bar · Bar Racing（动画比赛）· Waterfall（瀑布）

### 3.2 待逐页核对（⏳）

| 图表 | type | 读者问题（初判） | 数据形态（初判） | 核对入口 |
|---|---|---|---|---|
| 折线 | `line` | 趋势 / 随时间变化 | 时间或有序数值 + 多系列 | handbook how-to Common Charts · Line；option#series-line |
| 饼 / 环 | `pie` | 占比（少量分类） | 单层/嵌套 `data[{value,name}]` | how-to Common Charts · Pie；option#series-pie |
| 散点 / 涟漪 | `scatter` / `effectScatter` | 相关 / 分布 / 离群 | 二维数值对；`symbolSize` 可编码第三维 | how-to Common Charts · Scatter；option#series-scatter |
| 雷达 | `radar` | 多指标画像对比 | `radar.indicator` + 每系列等长数值数组 | option#series-radar |
| 箱线 | `boxplot` | 分布形态 / 离群 | `transform: boxplot` 或预计算五数 | option#series-boxplot；examples boxplot-* |
| 热力 | `heatmap` | 二维密度 / 日历分布 | `[x, y, value]` 三元组 | option#series-heatmap；examples heatmap-* |
| 关系图 | `graph` | 关系网络 / 依赖 | `nodes[{id,name}]` + `links[{source,target}]` | option#series-graph；examples graph-* |
| 轨迹线 | `lines` | 大规模流向 | 起止坐标对（geo/cartesian 上） | option#series-lines |
| 树 | `tree` | 层级 / 组织结构 | 嵌套 `children` | option#series-tree |
| 矩形树图 | `treemap` | 层级 + 量级占比 | 嵌套 `children` + `value` | option#series-treemap |
| 旭日 | `sunburst` | 层级占比（环形） | 嵌套 `children` | option#series-sunburst |
| 平行坐标 | `parallel` | 多维对比 | 行式多列数据 + `parallelAxis` | option#series-parallel |
| 桑基 | `sankey` | 流向 / 构成转移 | `nodes` + `links{source,target,value}` | option#series-sankey |
| 漏斗 | `funnel` | 转化 / 阶段流失 | `data[{value,name}]`（有序） | option#series-funnel |
| 仪表盘 | `gauge` | 单指标达成度 | 单值 + `min`/`max` | option#series-gauge |
| 象形柱 | `pictorialBar` | 图文对比（符号化柱） | 同 bar + `symbol` | option#series-pictorialBar |
| 主题河流 | `themeRiver` | 主题随时间构成变化 | `[date, value, name]` 三元组 | option#series-themeRiver |
| 日历 | `calendar` + `heatmap`/`scatter` | 日粒度时间分布 | 日期 + 值 | option#calendar |
| 矩阵 | `matrix` | 多图矩阵 / 相关矩阵 | 行列坐标 + 嵌套 series | option#matrix（v6） |
| 弦图 | `chord` | 双向关系强度 | 矩阵或 `links` | option#series-chord（v6） |
| K 线 | `candlestick` | 金融区间 | `[open, close, low, high]` | option#series-candlestick |

---

## 4. 能力边界（negative knowledge）

### 4.1 本仓库实现边界（来源：`src/renderers/echarts-renderer.ts`，代码事实）

> 代码只用于标注边界，不作为能力来源（§3.2 原则）。

| 边界 | 事实 | 对示例写作的约束 |
|---|---|---|
| 渲染器 | 固定 **SVG 渲染器**（`echarts.init(container, theme, { renderer: 'svg' })`） | 依赖 canvas 的特效不可用：`series-lines.effect`（trail）、heatmap blending（文档明示“still relies on Canvas”） |
| 动画 | **默认关闭**（未显式设置 `animation` 时由渲染器置 `false`）；`finished` 事件兜底 500ms | 动画类图型（`graph` 力导向、`effectScatter`、`themeRiver`）不得依赖动画收敛；示例应给静态可读的布局参数（如 `graph` 的固定 `layout: 'none'` + 坐标） |
| 尺寸 | `width` / `height` 从 option 顶层读取（默认 800×450），不传给 ECharts 本体 | 示例需给出合适尺寸；过大尺寸会被 clamp |
| 主题 | 深色文档主题 → `'dark'`；`textStyle.fontFamily` 默认注入；`backgroundColor` 强制 `transparent` | 不要在示例里写死背景色 |
| 输入 | option 必须是 **JSON**（`src/plugins/echarts-plugin.ts` + `JSON.parse`） | **不能出现 JS 函数**：`formatter` 回调、`renderItem`（custom series）一律不可用 |
| 3D / 地图 | 无 echarts-gl；无内建地图（无 `registerMap`） | `map` / `geo` / 3D 全部不收录 |

### 4.2 文档级边界

- `title.link` / `title.sublink` 等 URL 不做净化（Security Guidelines）→ 示例不写外链 URL。
- 交互组件（`tooltip` / `dataZoom` / `toolbox` / `brush` / `axisPointer` / `timeline` / `thumbnail`）在静态导出中无意义 → 不写进示例。
- `>1k` 数据量官方推荐 canvas 渲染器；本仓库固定 SVG → 大数据量示例不提供。

---

## 5. 覆盖账本（处置汇总）

| 类别 | 总数 | 收录 | 不收录 | 不收录理由分布 |
|---|---|---|---|---|
| 图表族（Gallery） | 24 | 21 | 3 | `map`/`geo`（无地图数据）、`custom`（需 JS 函数） |
| GL / 3D 族 | 11 | 0 | 11 | 无 echarts-gl |
| 顶层组件 | 28 | 21 | 7 | 交互专属（`tooltip`/`dataZoom`/`toolbox`/`brush`/`axisPointer`/`timeline`/`thumbnail`）；`geo` 单列 |
| 能力项（数据/呈现） | 6 | 4 | 2 | 交互专属（event/action）、渲染器固定（SVG/Canvas 二选一在此不可选） |

**V6 新能力**（矩阵 `matrix`、弦图 `chord`、缩略图 `thumbnail`、`coordinateSystem` 布局）已在 2.1/2.3 逐条处置。

---

## 6. 待验证工单（下一轮调研）

1. **逐页核对 §3.2 的 21 行**：优先 T0 相关（line / pie / scatter / heatmap / gauge / sankey / funnel / radar），
   入口：`option.html#series-<type>` + Handbook how-to（Bar/Line/Pie/Scatter 已有专门页）。
2. **Handbook 剩余章节**：Concepts（Style / Dataset / Data Transform / Axis / Visual Mapping / Legend）、
   How-To（Common Components、Data、Label、Animation、Interaction）、Best Practices（Aria、Security）——
   用于抽取「推荐写法」与「导出/静态场景注意事项」。
3. **静态渲染实测**：`graph`（力导向）、`effectScatter`、`themeRiver`、`lines` 在
   「动画默认关闭 + 500ms 兜底」下是否产出可读图（这决定它们是 T1 还是 ❌）。
4. **确认 v6 行为差异**：`matrix` / `chord` / `richInheritPlainLabel` 的默认值变化对示例的影响。

---

## 7. 引用

- Option 手册：https://echarts.apache.org/en/option.html
- Examples Gallery：https://echarts.apache.org/examples/en/index.html
- Handbook（含 Chart Container / Canvas vs SVG / Aria / Security）：https://echarts.apache.org/handbook/en/
- Basic Bar How-To：https://echarts.apache.org/handbook/en/how-to/chart-types/bar/basic-bar
- 本仓库实现：`src/renderers/echarts-renderer.ts`、`src/plugins/echarts-plugin.ts`（仅用于 §4.1 边界）

---

## 8. 缺口审查结论（2026-09-21 第二轮）

对照源：Examples Gallery 的 24 个 chart-type 分组 + Option 手册组件表。示例集 **25 → 38**。

| 结论 | 内容 |
|---|---|
| 图表族覆盖 | **22 / 24**；不收录 `map`/`geo`（无地图数据）与 `custom`（需 JS 函数） |
| 本轮补齐形态 | 有符号发散柱 · 瀑布（stack 技巧）· 归一化堆叠 · **极坐标径向柱** · 玫瑰图 · 嵌套饼 + `label.rich` · 堆叠面积 · 排名迁移（bump）· 区间带（stack + 透明 area）· 阈值带（`markArea`/`markLine`/`markPoint`）· 目标轨道（`showBackground`）· 环形 graph 布局 · `dataset` + `encode` |
| 关键实测边界 | `dataset.transform` **完全不可用**（见 §2.3），已同步修正示例与本文档 |
| 仍未覆盖的组件 | `tooltip` / `dataZoom` / `toolbox` / `brush` / `axisPointer` / `timeline` / `thumbnail`（交互专属，静态导出无意义） |

新增示例清单与判定依据见 `research/coverage-gap-audit.md` §3。
