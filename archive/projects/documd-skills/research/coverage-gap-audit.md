# 覆盖缺口审查 — vega / echarts / infographic 对照官方文档

| 项 | 值 |
|---|---|
| 日期 | 2026-09-21 |
| 范围 | `skills/examples/_draft/{vega,echarts,infographic}` 对照三份官方画廊/手册 |
| 对照源 | Vega-Lite 示例画廊 · Vega 示例画廊 · ECharts Examples + Option 手册 · AntV Infographic 画廊（v0.2.20） |
| 结论 | 三个引擎的**结构级覆盖已闭合**；本轮补齐 45 个形态缺口示例，并实测出一条 ECharts 硬边界 |
| 状态 | ✅ 已完成 · 剩余不接受补的项在 §5 逐条给了理由 |

---

## 1. 方法

1. **枚举本仓库已覆盖的形态**：从 `examples/_draft/<engine>/*.md` 的代码块里解析出实际使用的
   mark / series type / coordinate system / template / structure（脚本见 §6）。
2. **枚举官方全集**：Vega-Lite 画廊（Single-View / Composite / Layered / Multi-View / Maps /
   Interactive）、Vega 画廊（含 Tree / Network / Other chart types / Custom designs）、
   ECharts Gallery 的 24 个 chart-type 分组 + 11 个 GL 分组 + Option 手册组件表、
   Infographic 画廊的 7 个 family 与 template registry。
3. **求差集**，逐条判定「形态缺失」还是「仅样式变体」，再按读者场景命名补示例。
4. 每个新示例都过 `skills/scripts/verify-examples.mjs` 的真实渲染闸门。

---

## 2. Infographic — 结论：结构级已闭合

| 量 | 值 |
|---|---|
| 官方画廊（v0.2.20） | 276 张卡片 / 7 个 family，暴露 **39 个 structure token** |
| 本仓库 registry（0.2.20 实测枚举） | **113 templates**，其中 template-map 覆盖 38 个 structure |
| 注册 structure 总数 | **42**（比 template 可达的多 4 个：`hierarchy-tree` / `hierarchy-mindmap` / `relation-dagre-flow` / `sequence-interaction`，需内联 `design` 表达，已各有示例） |
| 示例覆盖（本轮后） | **87 / 113 templates**，**38 / 38** template 可达 structure，**42 / 42** 注册 structure |
| item style 覆盖 | 26 个 item style **全部**至少被一个示例演示（26 / 26） |

**缺口判定**：未演示的 26 个 template 全部是**同一 structure 下的 item-style 排列组合**
（`-underline-text` / `-compact-card` / `-simple-illus` / `-plain-text` / `-badge-card` / `-arrow|-vs|-fold`），
其所属 structure 与 item style 都已各有代表性示例。**结论：不存在缺失的图形结构，只存在缺失的样式组合。**

本轮补的 8 个示例（每个都消掉一个此前完全没有示例的 template）：

| 新示例 | template | 读者场景 |
|---|---|---|
| `device-rollout-phases.md` | `sequence-zigzag-pucks-3d-simple` | 硬件设备的现场部署阶段 |
| `field-ops-playbook.md` | `sequence-steps-simple-illus` | 现场运维作业手册 |
| `data-platform-migration-waves.md` | `sequence-roadmap-vertical-quarter-circular` | 按季度推进的数据平台迁移波次 |
| `bug-triage-filters.md` | `sequence-filter-mesh-underline-text` | 缺陷分诊的逐级过滤 |
| `support-tier-entitlements.md` | `list-row-horizontal-icon-arrow` | 支持等级权益清单 |
| `security-hardening-sprint.md` | `list-zigzag-down-simple` | 安全加固冲刺的工作流 |
| `tooling-standard-inventory.md` | `list-grid-simple` | 内部工具标准清单 |
| `monolith-vs-modular.md` | `compare-binary-horizontal-underline-text-fold` | 单体 vs 模块化的二元对比 |

---

## 3. ECharts — 结论：24 个图表族已覆盖 22 / 24

### 3.1 本轮补齐的形态（13 个新示例，25 → 38）

| 新示例 | 官方对应形态 | 此前缺口 |
|---|---|---|
| `headcount-variance-diverging-bars.md` | Bar（negative value） | 有符号发散柱 |
| `run-rate-waterfall.md` | Bar（waterfall，stack 技巧） | 瀑布图 |
| `engineering-time-100pct-bars.md` | Bar（normalized stack） | 归一化堆叠 |
| `support-volume-radial-bars.md` | Bar（polar / radial label） | **极坐标系整体缺席** |
| `lead-source-rose.md` | Pie（roseType） | 玫瑰图 |
| `cloud-spend-nested-pie.md` | Pie（rich text / nested） | 嵌套饼 + `label.rich` |
| `incident-trend-stacked-area.md` | Line（stacked area） | 堆叠面积 + `areaStyle` |
| `team-rank-bump-chart.md` | Line（bump chart） | 排名迁移图 |
| `throughput-band-range-area.md` | 置信带（stack + 透明 area） | 区间带 |
| `delivery-score-threshold-bands.md` | markArea / markLine / markPoint | 阈值带与注释层 |
| `goal-attainment-background-bars.md` | Bar（showBackground） | 目标轨道 |
| `service-ownership-circle-graph.md` | Graph（circular layout） | 确定性环形布局 |
| `backlog-ranking-dataset.md` | Dataset + encode | `dataset` 作者写法 |

### 3.2 实测边界：`dataset.transform` 不可用 ❗

最小复现（独立 Playwright 页面 + `node_modules/echarts/dist/echarts.min.js`）：

| 用例 | 结果 |
|---|---|
| `dataset.source` + `encode`（无 transform） | ✅ 渲染成功 |
| `dataset.transform: [{type:"sort"}]` + SVG renderer | ❌ `RangeError: Maximum call stack size exceeded` |
| 同上 + Canvas renderer | ❌ 同样失败 |
| `dataset.transform: [{type:"filter"}]` | ❌ 同样失败 |

ECharts 6.1.0 即当时最新发布版本（`npm view echarts version`），因此这是**当前版本缺陷**而非渲染器问题。
`research/echarts/catalogue.md` §2.3 原把 `transform` 标为「收录（推荐写法）」，已按实测改为 ❌。

### 3.3 仍不覆盖的族

| 族 | 理由 |
|---|---|
| GEO / Map（`map` / `geo`） | 需要 `registerMap` 地图数据，包内无内建地图 |
| Custom（`custom`） | 需要 JS `renderItem` 函数，而示例只允许纯 JSON |
| GL / 3D（11 族） | 无 `echarts-gl` 依赖 |

---

## 4. Vega / Vega-Lite — 结论：mark 与布局缺口已补齐

### 4.1 本轮补齐（24 个新示例，22 → 46）

**Vega-Lite（16）**

| 新示例 | 补的形态 |
|---|---|
| `release-time-split-donut.md` | `arc` mark（饼/环） |
| `deploy-frequency-calendar.md` | 日历/表格型 rect 栅格 |
| `service-latency-density.md` | `density` transform 密度曲线 |
| `workforce-seniority-pyramid.md` | 人口金字塔（负值镜像） |
| `release-window-schedule.md` | `x`/`x2` 甘特式排期 |
| `before-after-latency-gap.md` | 哑铃 / ranged dot |
| `adoption-shift-slope.md` | 斜率图（`fold`） |
| `growth-vs-efficiency-path.md` | 连通散点（`order`） |
| `service-drift-lasagna.md` | Lasagna（`joinaggregate` 行内基线） |
| `deploy-punchcard-weekday-hour.md` | 打卡图（size 编码） |
| `latency-beeswarm-regions.md` | 确定性蜂群（`window rank` + `yOffset`） |
| `build-time-candles.md` | K 线（rule + bar 双层） |
| `error-budget-burn-trail.md` | **`trail` mark**（宽度编码） |
| `incident-rate-stripes.md` | Warming stripes（无轴色带） |
| `support-capacity-units.md` | 等值单位图 / isotype（`sequence` 数据生成器） |

**Vega（9）**

| 新示例 | 补的形态 |
|---|---|
| `service-call-force-map.md` | `force` 力导向 + `linkpath` |
| `org-chart-radial-tree.md` | `tree`（cluster）径向树 + `treelinks` |
| `cost-center-treemap.md` | `treemap` |
| `asset-size-packing.md` | `pack` 圆堆积 |
| `catalog-sunburst-share.md` | `partition` + `arc` 旭日 |
| `alert-density-contours.md` | `kde2d` + `isocontour` + `geopath` 等值线 |
| `release-size-violin.md` | `kde` 小提琴（`yc`+`height` 横向带） |
| `risk-profile-parallel.md` | 平行坐标（`fold` + facet 分组） |
| `module-import-arcs.md` | 弧线图（`linkpath shape: arc` + degree 聚合） |

### 4.2 覆盖账本

| 维度 | 覆盖 |
|---|---|
| mark | `arc` `area` `bar` `boxplot` `circle/point/square` `errorband` `errorbar` `line` `rect` `rule` `text` `tick` `trail` — 16 / 18 |
| 未覆盖 mark | `geoshape`（需 GeoJSON 外部数据）、`image`（需外部图片） |
| 复合 mark | `boxplot` ✓ `errorbar` ✓ `errorband` ✓ |
| 变换 | aggregate · bin · calculate · density · filter · fold · impute · joinaggregate · kde · kde2d · isocontour · loess · lookup · regression · window · sequence · stratify · tree · treelinks · treemap · pack · partition · force · linkpath · geopath ✓ |
| 组合视图 | layer · facet · concat/repeat ✓ |
| 交互 | ❌ 静态导出无意义（政策排除） |
| 地图 | ❌ 政策排除（外部数据） |

---

## 5. 明确不补的项（Negative knowledge）

| 引擎 | 项 | 理由 |
|---|---|---|
| Vega / Vega-Lite | 地理图（choropleth / geo line / 投影） | 需 GeoJSON/TopoJSON 外部数据，导出路径不联网 |
| Vega / Vega-Lite | `image` mark | 需外部图片资源 |
| Vega / Vega-Lite | 交互（brush / crossfilter / overview+detail 选择器） | 静态导出无意义；`demand-overview-detail.md` 已覆盖静态的 overview+detail 版面 |
| Vega-Lite | mosaic chart | 需要 `window` 累积偏移手工算宽；读数已被归一化堆叠柱 + lasagna 覆盖 |
| Vega-Lite | ternary chart | 官方示例依赖自定义坐标变换；受众极窄 |
| Vega-Lite | horizon graph | Vega-Lite 无 horizon mark，需多带折叠；读数已被密度/流图覆盖 |
| 两者 | QQ plot | 分析型窄受众；拟合问题已由 `regression-trend-fit.md` 覆盖 |
| ECharts | `map` / `geo` / GL / `custom` | 见 §3.3 |
| ECharts | `tooltip` / `dataZoom` / `toolbox` / `brush` / `axisPointer` / `timeline` | 交互专属，静态导出不可见 |

---

## 6. 复现脚本

- 覆盖统计（infographic template / structure / item style）：
  解析 ```` ```infographic ```` 块首行 `infographic <template-name>`，与
  `research/infographic/template-structure-map.tsv` 求差集。
- ECharts series type / 组件统计：解析 ```` ```echarts ```` 块的 JSON，收集 `series[].type` 与顶层组件键。
- Vega mark / transform 统计：递归遍历 spec，收集 `mark`（字符串或对象）与 `transform[].type`。
- 渲染闸门：`node skills/scripts/verify-examples.mjs --dir examples/_draft/<engine> --all`。

---

## 7. 引用

- Vega-Lite 画廊：https://vega.github.io/vega-lite/examples/ · Vega 画廊：https://vega.github.io/vega/examples/
- Vega 变换：https://vega.github.io/vega/docs/transforms/
- ECharts 画廊：https://echarts.apache.org/examples/en/index.html · Option：https://echarts.apache.org/en/option.html
- Infographic 画廊：https://infographic.antv.vision/gallery · 文档：https://infographic.antv.vision/learn
- 各引擎账本：`research/vega/catalogue.md` · `research/echarts/catalogue.md` · `research/infographic/catalogue.md`
