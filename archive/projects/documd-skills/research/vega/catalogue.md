# Vega / Vega-Lite — 图表目录与覆盖账本

| 项 | 值 |
|---|---|
| 引擎 | `vega-lite` **6.4.3** + `vega` **6.3.1**（本仓库 `node_modules`） |
| 文档 | https://vega.github.io/vega-lite/docs/ · https://vega.github.io/vega/docs/ |
| fence | ` ```vega-lite `（别名 `vegalite`）/ ` ```vega ` |
| 调研日期 | 2026-09-21 |
| 状态 | 文档 TOC 与示例画廊已全量枚举（§2/§3）；逐图表特性表待补（§6） |
| 定位 | **探索与分析型数据图**（可组合变换、组合视图）；汇报级/仪表盘级图表让位给 echarts |

**验证状态图例**：✅ 已核对 · ⏳ 待实测 · ❌ 不收录

---

## 1. 文档入口

| 入口 | URL | 用途 |
|---|---|---|
| Docs TOC（**权威导航**） | https://vega.github.io/vega-lite/docs/ | 全量属性文档目录（§2 基线） |
| Mark 类型 | https://vega.github.io/vega-lite/docs/mark.html | mark 全集 + mark 定义对象（通用/位置/颜色/描边/超链接属性） |
| Encoding 通道 | https://vega.github.io/vega-lite/docs/encoding.html | 通道全集（位置 / 极坐标 / 地理 / 属性 / 文本 / 顺序 / 分面…） |
| Transform 目录 | https://vega.github.io/vega-lite/docs/transform.html | 19 个变换 |
| 视图组合 | https://vega.github.io/vega-lite/docs/composition.html | facet / layer / concat / repeat / resolve |
| 参数与选择 | https://vega.github.io/vega-lite/docs/parameter.html | params / expr / bind / select（**静态导出下不收录**） |
| 无效数据处理 | https://vega.github.io/vega-lite/docs/invalid-data.html | `mark.invalid` 四种模式 |
| **示例画廊** | https://vega.github.io/vega-lite/examples/ | 面向用户的图表目录（§3 基线） |
| Vega（底层） | https://vega.github.io/vega/docs/ | radar / wordcloud / force 等 Vega-Lite 没有的图型 |

---

## 2. 文档 TOC 全量（查漏基线）

| 章节 | 条目 |
|---|---|
| View Specification | spec · title · **width/height**（size） |
| Data | 数据源类型（inline values / url / named datasets）· format · data generators · datasets |
| **Transform（19）** | aggregate · bin · calculate · density · extent · filter · flatten · fold · impute · joinaggregate · loess · lookup · pivot · quantile · regression · sample · stack · timeUnit · window |
| **Mark** | 类型（见 §3）· 定义对象（通用 / 位置与偏移 / 颜色 / 描边样式 / 超链接）· config · style config（含 `guide-label` / `guide-title` / `group-title` 内建样式名） |
| Encoding | 位置 · 位置偏移 · 极坐标 · 地理 · mark 属性 · text/tooltip · href · description · detail · key · order · facet；字段定义子项：aggregate · axis · bandPosition · bin · condition · datum · field · format · header · impute · legend · scale · stack · sort · timeUnit · type · value |
| Projection | 投影类型与配置（**地理 → ❌**） |
| View Composition | facet · layer · concat · repeat · resolve |
| Parameter | value · expr · bind · select（**交互 → ❌**） |
| Config | 顶层 / 格式化 / 坐标轴 / mark / 样式 / scale / 投影 / 选择 / 标题 / 视图各层配置 |
| Property Types | datetime · gradient · predicate |
| Tooltip | 编码驱动 / 数据驱动 · tooltip 图片 · 关闭 tooltip |
| Invalid Data | `mark.invalid`：`filter` · `break-paths-filter-domains` · `break-paths-show-domains` · `show`/null |

---

## 3. Mark 全集与处置

**原始 mark（primitive）**：文档正文列出的 11 个 =
`area` `bar` `circle` `line` `point` `rect` `rule` `square` `text` `tick` `geoshape`；
文档 TOC 与 JSON Schema 另有 `arc`、`image`、`trail`（正文列举不全，**以 Schema 为准**，共 14 个）。
**复合 mark（composite，宏）**：`boxplot` · `errorband` · `errorbar`。

| mark | 读者问题 | 处置 |
|---|---|---|
| `bar` | 对比 / 排名（含分组、堆叠、归一化） | 收录 |
| `line` | 趋势（多序列、step、slope、插值） | 收录 |
| `area` | 趋势 + 量级（堆叠、归一化、streamgraph、horizon） | 收录 |
| `point` / `circle` / `square` | 相关 / 分布 / 气泡 | 收录 |
| `tick` | 分布条带（strip/dot plot） | 收录 |
| `rect` | 热力 / 表格型（heatmap、lasagna、mosaic） | 收录 |
| `rule` | 参考线 / 区间 / 阈值线 | 收录 |
| `text` | 直接标注（label 层） | 收录 |
| `arc` | 占比（饼 / 环 / 径向 / 金字塔） | 收录（少量分类时） |
| `image` | 图片作为 mark | T2（少见） |
| `trail` | 轨迹（随时间变化的线宽） | T2 |
| `geoshape` | 地理形状 | **❌**：需要 GeoJSON/TopoJSON 外部数据 |
| `boxplot` | 分布形态 / 离群（含预聚合摘要模式） | 收录 |
| `errorbar` | 均值 ± 误差（CI / stdev / stderr） | 收录 |
| `errorband` | 区间带（趋势不确定度） | 收录 |

---

## 4. 示例画廊 = 场景基线（用户视角目录）

| 分区 | 子类 | 处置 |
|---|---|---|
| Single-View | Bar Charts（simple / aggregate / sorted / grouped / stacked / normalized / rounded） | 收录（3–4 个示例） |
| | Histograms · Density · Dot Plots（histogram / log / relative frequency / density / 2D binned） | 收录（2–3） |
| | Scatter & Strip（scatter / colored / bubble / strip / jitter / invalid-grey） | 收录（2–3） |
| | Line Charts（simple / multi-series / step / slope / monotone / halo / 条件轴） | 收录（2–3） |
| | Area & Streamgraphs（area / gradient / overlay / stacked / normalized / streamgraph / horizon） | 收录（2–3） |
| | Table-based（heatmap / 天气热力 / 2D binned / punch card / lasagna / mosaic / wind vector） | 收录（2） |
| | Circular（pie / donut / 带标签 / radial / pyramid） | 收录（1–2） |
| | Advanced Calculations（percent-of-total / diff-from-average / residuals / window rank / **waterfall** / top-k / top-k+others / lookup / impute / ternary） | 收录（3–4，**这是 vega-lite 的差异化强项**） |
| Composite | Error Bars & Bands · Box Plots | 收录（各 1） |
| Layered | Labeling & Annotation（labels / emoji / threshold highlight / mean overlay） | 收录（1–2） |
| | Other Layered（**candlestick** / ranged dot / **bullet** / **dual-axis** / horizon / weather / wheat-wages） | 收录（2–3） |
| Multi-View | Faceting / Trellis（bar / stacked / scatter / histogram / Anscombe / barley / area） | 收录（1–2） |
| | Repeat & Concat（repeat+layer / vconcat / repeated histograms / SPLOM / marginal histograms / population pyramid） | 收录（2） |
| Maps | 全部地理图（choropleth / geo circle / geo layer / geo rule / trellis…） | **❌**：需外部 GeoJSON/TopoJSON |
| Interactive | Interactive Charts · Interactive Multi-View（brush / crossfilter / overview-detail / widgets…） | **❌**：静态导出无意义 |
| Community | 社区示例（unit chart / dot-dash / rank plot…） | 不收录（无官方保证） |

---

## 5. 本仓库实现边界

| 边界 | 事实 | 写作约束 |
|---|---|---|
| 渲染 | `vega-embed` + `vega-interpreter`（表达式解释器） | 允许 Vega 表达式字符串；**不允许 JS 函数体** |
| fence 决定模式 | `vega-lite` → VL 编译；`vega` → Vega 运行时 | 写 VL 用 `vega-lite`；只有 Vega 专属图型（radar/wordcloud/force）才用 `vega` |
| `$schema` | 文档惯例带 `$schema`（v5/v6） | 可写可不写；**示例统一写 v6 schema** 以避免"v5 字段 + v6 引擎"的歧义 |
| 数据 | `data.values`（内联） vs `data.url`（外部拉取） | **一律内联 `values`**；离线/导出路径不会去联网 |
| 交互 | `params` / `select` / `bind` | ❌ 不写进示例（导出为静态图像） |
| 尺寸 | `width` / `height`（spec 层） | 显式给出尺寸，避免默认 200×200 太小 |
| 地图 | `geoshape` + 投影 | ❌ 不写（外部数据） |
| 无效值 | `mark.invalid` 四模式 | 写进 anti-patterns：null/NaN 默认按 `filter` 处理，断线需显式 `break-paths-*` |

---

## 6. 工单（下一轮）

1. **逐图表特性表**（§3.2.2 字段）：从示例画廊逐页提取（每个子类 1 页），补齐「何时用/别用/关键属性」。
2. **Vega 专属图型**：补齐 Vega 文档侧的 radar / wordcloud / force / layouts 清单（Vega-Lite 无法表达）。
3. **实测**：`$schema` v5 与 v6 差异；`mark.invalid` 四模式渲染效果；`data.values` 大数据量上限。
4. **与 echarts 的边界规则**：写进 `goals/data-*.md`（"需要坐标轴/系列样式精细控制 → echarts；需要数据变换或组合视图 → vega-lite"）。
5. **与 infographic `chart-*` 的边界**：轻量指标图 → infographic；有轴有系列的正式图表 → echarts / vega-lite。

---

## 7. 引用

- Vega-Lite Docs：https://vega.github.io/vega-lite/docs/ · Mark：https://vega.github.io/vega-lite/docs/mark.html
- 示例画廊：https://vega.github.io/vega-lite/examples/
- Vega Docs：https://vega.github.io/vega/docs/
- 本仓库实现：`src/renderers/vega-renderer.ts`（仅用于边界）

---

## 8. 缺口审查结论（2026-09-21 第二轮）

对照源：Vega-Lite 画廊全部分区 + Vega 画廊（Tree / Network / Other chart types / Custom designs / Distributions）。
示例集 **22 → 46**（16 个 `vega-lite` fence + 9 个 `vega` fence）。

### 8.1 mark 覆盖

| 状态 | mark |
|---|---|
| ✅ 已示例 | `arc` `area` `bar` `boxplot` `circle/point/square` `errorband` `errorbar` `line` `rect` `rule` `text` `tick` `trail`（16 / 18） |
| ❌ 不收录 | `geoshape`（需 GeoJSON/TopoJSON 外部数据）· `image`（需外部图片） |

### 8.2 布局与变换覆盖（本轮补齐）

`force`（力导向）· `tree` + `treelinks`（径向树）· `treemap` · `pack`（圆堆积）· `partition` + `arc`（旭日）·
`kde`（小提琴 / 密度）· `kde2d` + `isocontour` + `geopath`（等值线）· `fold`（斜率图 / 平行坐标）·
`linkpath`（`line` / `arc` / `radial diagonal` 三种 shape）· `joinaggregate`（行内基线）·
`window rank`（确定性蜂群）· `sequence` 数据生成器（等值单位图）。

### 8.3 明确不补

地理图（外部数据）· 交互（静态导出）· mosaic（需累积偏移，读数已被归一化堆叠柱与 lasagna 覆盖）·
ternary（需自定义坐标变换）· horizon（VL 无 horizon mark）· QQ plot（受众窄，拟合问题已由 regression 示例覆盖）。
理由与替代关系见 `research/coverage-gap-audit.md` §5。

### 8.4 实现边界（实测）

- **Vega 数据定义有顺序要求**：`source: "<dataset>"` 引用的数据集必须**先声明**，否则报
  `Undefined data set name: "..."`（本轮在弧线图上踩到）。
- `force` 变换必须写 `"static": true`，否则导出会捕捉到未收敛的中间布局。
- `kde2d` 的 `x`/`y` 用 `scale('x', datum.field)` 表达式，`bandwidth` 因此是**像素**单位。
- 渲染器会关闭 Vega-Lite 的自动排序（未显式写 `sort` 的编码通道被置为 `null`），
  因此所有有序轴（星期、周次、层序）都必须在编码里显式给出 `sort` 或依赖数据行序。
