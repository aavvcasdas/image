# AntV Infographic — 模板目录与覆盖账本

| 项 | 值 |
|---|---|
| 引擎 | `@antv/infographic` **0.2.19**（本仓库 `node_modules`） |
| 文档 | https://infographic.antv.vision （站点版本 v0.2.20） |
| fence | ` ```infographic ` |
| 调研日期 | 2026-09-21 |
| 状态 | 模板全集已枚举（113，见 `templates.txt`，与站点 0.2.20 同版）；**模板→结构映射已由源码生成**（`template-structure-map.tsv`，38 个可通过模板到达的结构）；主题/调色板已核对；示例覆盖 **91 条，覆盖全部 42 个结构 / 87 个模板 / 26 个 item style**（§5、§8） |
| 关键洞察 | 模板名自带「族-布局-样式」三段结构 ⇒ **场景应按「结构 × 布局」定义，样式变体作为可替换后缀**（与计划 §4.1「L2 不按模板定义」一致） |

**验证状态图例**：✅ 已核对 · ⏳ 待实测 · ❌ 不收录

---

## 1. 文档入口

| 入口 | URL | 用途 |
|---|---|---|
| Learn（总览） | https://infographic.antv.vision/learn | 入门、快速开始 |
| **Infographic Syntax（权威）** | https://infographic.antv.vision/learn/infographic-syntax | 语法结构与规则、六类数据结构 |
| Core Concepts | https://infographic.antv.vision/learn/core-concepts | Design / Templates / Data / Themes / Editor / Resources |
| Templates | https://infographic.antv.vision/learn/template | 模板机制（待抓） |
| Data | https://infographic.antv.vision/learn/data | 数据结构（待抓） |
| Themes | https://infographic.antv.vision/learn/theme | 预置主题 / palette / stylize（待抓） |
| **Gallery** | https://infographic.antv.vision/gallery | 官方模板库（七族过滤：Chart / Comparison / Hierarchy / List / Quadrant / Relation / Sequence，共 276 条） |
| API / JSX 参考 | /reference/infographic-api · /reference/jsx | 容器参数、React 用法 |

---

## 2. 语法模型（官方文档核对结果）

```
infographic <template-name>
design
  structure <structure-name>
  item <item-name>
  title default
data
  title <文本>
  desc  <文本>
  <lists|sequences|values|compares|nodes+relations|root+children>
    - label <文本>
      desc  <文本>
      value <数值>
      icon  <图标关键字>
theme <theme-name>
```

**规则要点**（引自官方 syntax 页）

- 入口固定为 `infographic [template-name]`；键值对**空格分隔**，缩进**两个空格**。
- `structure [name]` / `item [name]` / `title [name]` 这类块可省略 `type` 键。
- 对象数组用 `-` 换行（`data.lists` 等）；简单数组内联（如 `palette`）。
- 支持**点路径**（`theme.base.text.fill #fff`）等价于嵌套块；但**路径穿过数组**（如 `data.items`）会报语法错误。
- 容器配置（`width` / `height` / `padding` / `editable`）**属于构造函数**，不在语法里 —— 写进语法无效。

**六类数据结构**（决定"这个模板要喂什么"）

| 结构 | 字段 | 语义 | 典型模板族 |
|---|---|---|---|
| 列表 | `lists` | 无先后关系的并列项（清单/特性） | `list-*` |
| 序列 | `sequences`（可配 `order asc\|desc`） | 有序项（时间线/步骤） | `sequence-*` |
| 层级 | `root` + `children`（递归） | 树（组织/分类） | `hierarchy-*` |
| 对比 | `compares`（项可带 `children` 作为各维指标） | 并列对比（SWOT / 象限） | `compare-*` |
| 统计 | `values`（可配 `category` 做分组） | 指标数值（图表） | `chart-*` |
| 关系 | `nodes` + `relations` | 节点-边（流程/网络） | `relation-*` |

**数据项字段**：`label` · `desc` · `value` · `icon`（图标关键字，自动映射）。
兜底字段：**`items`**（不确定模板结构时使用，模板会自适应）。

**关系边语法**（官方表格誊录）

| 写法 | 含义 |
|---|---|
| `A -> B` | 从 A 到 B |
| `A <- B` | 从 B 到 A |
| `A -- B` | 无向边（direction none） |
| `A<->B` | 双向边（direction both） |
| `A -relation label-> B` | 带关系标签（标签不能含特殊字符） |
| `A -->\|relation label\| B` | 同上，允许特殊字符 |
| `A --> B[node label]` | 节点标签 |

关系边属性：`direction: forward（默认）| both | none` · `showArrow` · `arrowType: arrow | triangle | diamond`。
规范化行为：多余破折号（`A ----> B`）、`-.-`、`==>`、`--x`、`--o` 一律归一为 `--` 或 `->`；`id1(label)` 等价于 `id1[label]`；`id@{...}` 属性被忽略。

---

## 3. 模板全集（113，安装版本实测）

清单见 **`templates.txt`**（本目录，逐条枚举，可作查漏 checklist）。

| 族 | 数量 | 命名规律示例 |
|---|---|---|
| `sequence-*` | 47 | `sequence-roadmap-vertical-pill-badge`（族-roadmap-方向-项样式） |
| `list-*` | 29 | `list-grid-compact-card`（族-布局-项样式） |
| `compare-*` | 20 | `compare-binary-horizontal-underline-text-vs`（族-元数-方向-文字风格-标记） |
| `chart-*` | 11 | `chart-pie-donut-plain-text`（族-图形-变体-标签风格） |
| `relation-*` | 4 | `relation-dagre-flow-tb-simple-circle-node` |
| `hierarchy-*` | 2 | `hierarchy-structure` · `hierarchy-tree` |

> 官方 gallery（站点 v0.2.20）另有 Quadrant 族与更多变体，共 276 条（含组件）；本仓库安装版本为 113 个模板键。
> **版本差异需在 dossier 记录**：写示例只用 `templates.txt` 里存在的名字。

**命名法的用处**（阶段 1b 的选型依据）：模板名 = `族-结构/布局-方向-项样式`，同一场景只需固定「族 + 结构/布局」，
项样式与方向可作为可替换后缀 —— 于是 **L2 场景数不再随模板数膨胀**。

---

## 3b. 结构 ≠ 模板（源码核对，关键发现）

模板是「结构 + 项 + 标题」的预设组合，**结构注册表里有 42 个结构，但只有 38 个能被模板名到达**（113 个模板）。
两处差异对写作有直接影响：

| 事实 | 证据 | 写作影响 |
|---|---|---|
| 结构 42 个（`designs/structures/*.js` + `compare-binary-horizontal/`），模板 113 个 | `template-structure-map.tsv`：每行 `模板名 ⇥ 结构 ⇥ 项样式` | 选模板先查结构，再挑样式后缀 |
| `hierarchy-tree` / `hierarchy-mindmap` / `sequence-interaction` / `relation-dagre-flow` **没有对应模板** | 模板清单中不存在 `hierarchy-tree-*` 等键 | 想用这些结构必须走 **内联 design**（下方） |
| 内联 design 与模板等价 | 官方 template 页：「Configure structure and items directly through `design`」 | `infographic`（空模板名）+ `design` 块是合法入口 |

**内联 design 写法**（用于没有模板的结构）：

```
infographic
design
  structure hierarchy-tree
  item rounded-rect-node
data
  root
    label 总部
```

**可用项名（28 个，源码 `registerItem` 实测）**：
`simple` · `plain-text` · `underline-text` · `badge-card` · `compact-card` · `candy-card-lite` · `ribbon-card` ·
`progress-card` · `circular-progress` · `done-list` · `indexed-card` · `letter-card` · `l-corner-card` ·
`pill-badge` · `rounded-rect-node` · `circle-node` · `simple-circle-node` · `quarter-circular` ·
`quarter-simple-card` · `simple-illus` · `icon-badge` · `horizontal-icon-arrow` · `horizontal-icon-line` ·
`vertical-icon-arrow` · `simple-horizontal-arrow` · `simple-vertical-arrow` · `capsule-item` · `lined-text`

**可用结构名（42 个）**：
`chart-bar` · `chart-column` · `chart-line` · `chart-pie` · `chart-wordcloud` · `compare-binary-horizontal` ·
`compare-hierarchy-left-right` · `compare-hierarchy-row` · `quadrant` · `hierarchy-structure` · `hierarchy-tree` ·
`hierarchy-mindmap` · `list-column` · `list-grid` · `list-pyramid` · `list-row` · `list-sector` · `list-waterfall` ·
`list-zigzag-up` · `list-zigzag-down` · `relation-circle` · `relation-network` · `relation-dagre-flow` ·
`sequence-ascending-stairs-3d` · `sequence-ascending-steps` · `sequence-circle-arrows` · `sequence-circular` ·
`sequence-color-snake-steps` · `sequence-cylinders-3d` · `sequence-filter-mesh` · `sequence-funnel` ·
`sequence-horizontal-zigzag` · `sequence-mountain` · `sequence-pyramid` · `sequence-roadmap-vertical` ·
`sequence-snake-steps` · `sequence-stairs-front` · `sequence-steps` · `sequence-timeline` ·
`sequence-zigzag-pucks-3d` · `sequence-zigzag-steps` · `sequence-interaction`

**归属映射（写示例时的选型表）**：

| 数据字段 | 结构族 | 备注 |
|---|---|---|
| `lists` | `list-*` | 并列无先后 |
| `sequences`（+`order asc\|desc`） | `sequence-*` | 有序 |
| `compares`（项可带 `children`） | `compare-*` · `quadrant` | 并列对比 |
| `values`（+`category`） | `chart-bar\|column\|line\|pie\|wordcloud` | 指标 |
| `nodes`+`relations` | `relation-*` | 图/网络 |
| `root`+`children` | `hierarchy-*` | 树 |
| `items` | 任意（兜底） | 结构不确定时用 |

**数据项字段**：`label` · `desc` · `value` · `icon`（`icon mdi/rocket-launch` 官方示例写法；也接受 URL / data URI / `ref:search:…`）。

---

## 3c. 主题与调色板（源码 `themes/built-in.js`、`renderer/palettes/built-in.js`）

| 名称 | 注册内容 | 用途 |
|---|---|---|
| `light` | `colorBg #ffffff` | 默认 |
| `dark` | `colorBg #1F1F1F` + 白色文字 | 本仓库深色文档自动注入 |
| `hand-drawn` | 手写字体 `851tegakizatsu` + `stylize: rough` | 手绘风 |

其它主题键（语法内可用）：`colorPrimary` · `colorBg` · `palette`（名称或颜色数组）· `base.text` · `base.shape` ·
`title` / `desc` · `item.label` / `item.desc` / `item.value` / `item.icon`。
内置调色板名：**`antv`** · **`spectral`**（数组形式可写多条颜色，超出长度循环取色）。

> ⚠️ 本仓库渲染器固定 `width 900 × height 600 × padding 24`，并在深色主题下注入 `theme = 'dark'`。
> 示例**不要**写 `width`/`height`，也**不要**写死 `colorBg`（会与文档深浅色冲突）。

---

## 4. 本仓库实现边界（来源：`src/renderers/infographic-renderer.ts`）

| 边界 | 事实 | 写作约束 |
|---|---|---|
| 容器尺寸 | 构造时传 `width: 900, height: 600, padding: 24`，但**输出 SVG 的 viewBox 由内容决定**（实测 185×330 … 2970×306） | 语法里不要写 `width`/`height`；控制**条目数量**才能控制画布 |
| 深色 | 文档深色主题 → `theme = 'dark'` | 不要写死背景色 |
| 手绘风格 | `themeConfig.stylize = { type: 'rough', roughness, bowing }` | 需要手绘时用主题层，不要逐项写样式 |
| 输出 | `toDataURL({ type: 'svg', embedResources: true })` → PNG | 图标资源会被内嵌（离线可用） |
| 错误路径 | 监听 `error` 事件，把解析错误聚合成 `Syntax error: … Expected format: infographic <template-name> …` | **模板名写错 = 直接失败**，示例必须用 `templates.txt` 中的名字 |
| 兜底字段 | `parseData` 按模板前缀优先取字段（list→lists / sequence→sequences / compare→compares / relation→nodes / chart→values / hierarchy→root），再按 lists→sequences→compares→nodes→values→root→items 兜底 | 用内联 design（无模板名）时靠兜底字段，**不要混用多族字段** |

### 4b. 画布尺寸实测（83 条示例逐条渲染）

结构不同，**每个条目占用的宽度差别很大**；宽画布在文档里会被缩到页面宽度，字会变小：

| 结构 | 实测宽度成本 | 例 |
|---|---|---|
| `hierarchy-tree` | 约 **365 px / 叶子节点**（3 叶 1074，6 叶 2212，8 叶 2970） | `department-capability-tree`（已裁到 3 叶 → 1074） |
| `sequence-interaction` | 约 **390 px / 条目**（3 条 1190，4 条 1559） | `support-shift-handover`（已裁到 3 条 → 1190） |
| `hierarchy-mindmap` | **固定 2086 px 宽**（与条目数无关；高度随层级 117→264） | `enterprise-knowledge-map` |
| 行/网格类（list-row / list-grid / compare-hierarchy-row / sequence-steps） | 随条目数线性增长，4–6 条通常落在 700–1250 | 多数示例 |

**结论**：写示例时，“一个画布放几条”比“选哪个模板”更决定可读性；宽结构（tree / interaction / mindmap）
要严格限量（叶子 ≤4），需要更多条目时换网格类结构。

---

## 5. 覆盖账本（处置策略）

**收录原则（2026-09-21 修订，用户要求）**：不按图表类型、**按场景**出示例，每个**结构**都要有代表例，
结构内的样式变体按「第二个读者场景」再补 1–2 例；示例总数 **≥ 70**，名称必须直接体现业务场景
（如 `release-blockers-escalation.md`，而非 `list-row-horizontal-icon-line.md`）。

**落地结果（2026-09-21 第二轮后）**：**91 条示例 / 87 个不同模板 / 42 个结构（全覆盖）/ 26 个 item style（全覆盖）**，
113 个模板的覆盖率 **77%**，全部通过 `verify-examples.mjs` 渲染门禁（91 通过 / 0 失败）。

| 族 | 示例数 | 结构覆盖 | 代表场景例 |
|---|---|---|---|
| `sequence-*` | 32（含 `sequence-interaction` 内联 1） | 19/19 | `incident-response-runbook` · `migration-cutover-window` · `bug-triage-filters` · `device-rollout-phases` |
| `list-*` | 27 | 8/8（grid/column/row/pyramid/sector×3 变体/waterfall×2/zigzag-up/zigzag-down） | `daily-ops-checklist-columns` · `budget-drawdown-waterfall` · `tooling-standard-inventory` · `security-hardening-sprint` |
| `compare-*` + `quadrant` | 12 | 4/4（binary×4 样式 / hierarchy-left-right / hierarchy-row×2 / quadrant×3） | `backlog-priority-quadrant` · `monolith-vs-modular` · `release-plan-tradeoff-fold` |
| `chart-*` | 11 | 5/5（bar/column/line/pie×5 变体/wordcloud×2） | `traffic-source-mix-split` · `survey-themes-rotated-cloud` |
| `relation-*` | 5（含 `relation-dagre-flow` 内联 1） | 3/3 | `stakeholder-circle-wheel` · `incident-escalation-path` |
| `hierarchy-*` | 4（含 tree / mindmap 内联 2） | 4/4 | `platform-org-structure` · `department-capability-tree` · `enterprise-knowledge-map` |
| **合计** | **91** | **42/42** | — |

**未演示的 26 个模板**：全部是已演示结构下的 item-style 排列组合（`-underline-text` / `-compact-card` /
`-simple-illus` / `-plain-text` / `-badge-card` / `-arrow|-vs|-fold`），结构与样式本身都已各有代表例，
详见 §8 与 `research/coverage-gap-audit.md` §2。

**四族迁移规范**（内联 design 写法，见 §3b）：`hierarchy-tree` · `hierarchy-mindmap` · `relation-dagre-flow` ·
`sequence-interaction` 四条示例在语法里直接写 `design structure …`，因为官方模板注册表里没有对应模板名
（0.2.20 实测一致）。

**已落地（21，第一批，阶段 1b 初稿）**：`leadership-metric-board` · `service-offerings-grid` · `budget-allocation-donut` ·
`topic-emphasis-wordcloud` · `team-throughput-bars` · `quarterly-results-columns` · `feature-adoption-trend` ·
`platform-org-structure` · `team-reporting-tree` · `service-dependency-network` · `capability-relationship-map` ·
`market-entry-swot` · `buy-vs-build-comparison` · `operating-model-option-map` · `launch-readiness-checklist` ·
`conversion-funnel-journey` · `product-roadmap-sequence` · `customer-onboarding-journey` · `career-growth-ladder` ·
`platform-milestone-timeline` · `operating-cycle-loop`。

> ⚠️ 与 echarts / vega-lite 的边界：infographic 的 `chart-*` 只做「轻量指标图」；需要坐标轴控制、
> 多系列、统计变换时改用 `echarts` / `vega-lite`（写进 `goals/` 与引擎 reference）。

---

## 6. 工单（下一轮）

1. ✅ 抓 `/learn/template`、`/learn/data`、`/learn/theme`：模板机制、字段细则、预置主题名（`light`/`dark`/`hand-drawn`）已核对。
2. ⏳ 实测：无效 `icon` 关键字的表现（降级/空白/报错）；`order desc`；`relations` 全部边语法；内联 `design` 入口。
3. ✅ 场景示例已扩充至 **91**（本轮补 8 个，每个消掉一个此前零示例的 template），全部过 `verify-examples.mjs` 门禁。
4. ⏳ 边界确认：`relation-*`（infographic 内建 dagre）与 `plantuml` 的取舍规则。
5. ✅ 版本差异记录：**安装版本实测为 0.2.20**，与站点同版；用 registry 静态解析确认仍是 **113 模板 / 38 个 template 可达结构**，站点 276 张卡片 = 模板 × 主题/调色板组合，**未新增结构**。

---

## 7. 引用

- 语法（权威）：https://infographic.antv.vision/learn/infographic-syntax
- 概念：https://infographic.antv.vision/learn/core-concepts
- 模板库：https://infographic.antv.vision/gallery
- 模板机制：https://infographic.antv.vision/learn/template
- 数据：https://infographic.antv.vision/learn/data
- 主题：https://infographic.antv.vision/learn/theme
- 模板清单（本项目生成）：`research/infographic/templates.txt`
- 模板→结构映射（本项目生成）：`research/infographic/template-structure-map.tsv`
- 本仓库实现：`src/renderers/infographic-renderer.ts`、`src/plugins/infographic-plugin.ts`（仅用于边界）

---

## 8. 缺口审查结论（2026-09-21 第二轮）

对照源：官方画廊（v0.2.20，276 张卡片 / 7 个 family）+ 本仓库 registry 静态解析。

| 量 | 值 |
|---|---|
| registry 模板 | **113**（与站点同版 0.2.20 实测一致） |
| 示例覆盖模板 | **87 / 113** |
| template 可达结构 | **38 / 38** |
| 注册结构（含 4 个需内联 `design` 的） | **42 / 42** |
| item style 覆盖 | **26 / 26**（每个样式至少被一个示例演示） |
| 未演示模板 | **26**，全部是同一结构下的 **item-style 排列组合**（`-underline-text` / `-compact-card` / `-simple-illus` / `-plain-text` / `-badge-card` / `-arrow|-vs|-fold`），其结构与样式均已各有代表示例 |

**判定**：infographic 不存在缺失的图形结构，只存在缺失的样式组合；结构级覆盖已闭合。
本轮补入 8 个示例（`sequence-zigzag-pucks-3d-simple`、`sequence-steps-simple-illus`、
`sequence-roadmap-vertical-quarter-circular`、`sequence-filter-mesh-underline-text`、
`list-row-horizontal-icon-arrow`、`list-zigzag-down-simple`、`list-grid-simple`、
`compare-binary-horizontal-underline-text-fold`），清单与依据见 `research/coverage-gap-audit.md` §2。
