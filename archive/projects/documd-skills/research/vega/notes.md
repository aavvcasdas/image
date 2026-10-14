# Vega / Vega-Lite 文档要点摘录（notes）

> 抓取日期：2026-09-21 · 安装版本：vega-lite 6.4.3 / vega 6.3.1

## 1. 官方定位

> “Vega-Lite is a **high-level grammar for interactive graphics**. It provides a concise JSON syntax for
> supporting rapid generation of **interactive multi-view visualizations to support analysis**.”

⇒ 关键词是 **grammar / multi-view / analysis**：它的强项是"一个 spec 组合出多视图与变换"，
而不是"把单张图做到极致漂亮"（后者是 echarts 的领地）。

来源：https://vega.github.io/vega-lite/docs/

## 2. Mark 类型（原文 + Schema 差异）

原文正文（mark.html）：

> “Vega-Lite supports the following primitive `mark` types: ["area", "bar", "circle", "line", "point",
> "rect", "rule", "square", "text", "tick", "geoshape"]. … In addition to primitive marks, Vega-Lite also
> support **composite marks**, … include ["boxplot", "errorband", "errorbar"].”

> “line and area marks represent **multiple data elements as a contiguous line or shape**.”
> （其余 mark 一般是"每个数据元素一个 mark 实例"）

⚠️ **正文列举不全**：文档 TOC 与 JSON Schema 里还有 `arc`、`image`、`trail`
（Schema 的 Mark enum 实测为：arc, area, bar, image, line, point, rect, rule, text, tick, trail,
circle, square, geoshape）。
⇒ 我们以 **Schema 为准**（14 个 primitive + 3 个 composite），并在 dossier 注明"文档正文滞后"。

## 3. Mark 定义对象（可用属性分组，原文 TOC）

| 分组 | 属性示例 |
|---|---|
| 通用 | `type`（必填）· `aria` · `description` · `cursor` · `style` · `tooltip` · `clip` · `invalid` · `order` |
| 位置与偏移 | `x` `x2` `width` `y` `y2` `height` · `xOffset` `x2Offset` `yOffset` `y2Offset` |
| 颜色 | `filled` · `color` · `fill` · `stroke` · `blend` · `opacity` · `fillOpacity` · `strokeOpacity` |
| 描边样式 | `strokeCap` · `strokeDash` · `strokeDashOffset` · `strokeJoin` · `strokeMiterLimit` · `strokeWidth` |
| 超链接 | `href`（定义后 cursor 自动为 pointer） |

内建样式名（style config 也适用于 guides）：`guide-label` · `guide-title` · `group-title`。

## 4. 无效数据（`mark.invalid` 四模式，原文）

| 模式 | 行为 |
|---|---|
| `filter` | 从 mark 与 scale 中排除无效值；**line/area/trail 会跨过无效点连成一条** |
| `break-paths-filter-domains` | 路径类 mark 在无效处**断开**；非路径类等同 filter；scale 域排除这些点 |
| `break-paths-show-domains` | 路径断开；非路径隐藏；scale 域**包含**这些点 |
| `show` / `null` | 全部显示，无效值的表现由 `config.scale.invalid` 决定 |

⇒ 示例里若数据含 null/NaN，必须显式声明 `mark.invalid`，否则会遇到"线莫名其妙连起来"的经典误判。

## 5. 示例画廊结构（用户视角目录，官方）

```
Single-View Plots: Bar · Histograms/Density/Dot · Scatter & Strip · Line · Area & Streamgraphs ·
                   Table-based · Circular · Advanced Calculations
Composite Marks:  Error Bars & Error Bands · Box Plots
Layered Plots:    Labeling & Annotation · Other Layered（candlestick, ranged dot, bullet,
                   dual-axis, horizon, weather, wheat-wages）
Multi-View:       Faceting (Trellis / Small Multiples) · Repeat & Concatenation
Maps:             地理图（choropleth / geo circle / geo layer / geo rule / trellis…）
Interactive:      Interactive Charts · Interactive Multi-View Displays
Community:        社区示例
```

来源：https://vega.github.io/vega-lite/examples/

**对我们的处置**：

- **Advanced Calculations**（waterfall / top-k / rank over time / residuals / percent-of-total / ternary）
  是 Vega-Lite 相对 echarts 的**差异化强项** —— 靠 transform 就能算出来，值得多给示例。
- **Maps** 需要外部 GeoJSON/TopoJSON（`data.url`）→ ❌。
- **Interactive** 需要鼠标交互 → ❌（导出为静态图）。
- **Community** 无官方保证 → 不收录。

## 6. 本仓库实现要点（`src/renderers/vega-renderer.ts`）

- 走 `vega-embed` + `vega-interpreter`（表达式走解释器，**不支持任意 JS 函数体**）。
- `mode` 由 fence 决定：` ```vega-lite ` → vega-lite；` ```vega ` → vega。
- 因此：表达式字符串（`calculate` / `expr`）可用；需要 JS 回调的地方（自定义 mark、自定义 tooltip handler 等）不可用。

## 7. 待确认清单

- [ ] `$schema` 写 v5 / v6 在 6.4.3 下的行为差异（是否影响字段解析）
- [ ] `mark.invalid` 四模式的实渲染效果
- [ ] 大数据量（`data.values` 上千行）在 SVG 渲染下的表现上限
- [ ] Vega（非 Lite）专属图型清单：radar / wordcloud / force / layouts（Vega docs 侧补齐）
- [ ] `arc` / `image` / `trail` 是否值得单独示例（还是并入占比/标注场景）
