# AntV Infographic 文档要点摘录（notes）

> 抓取日期：2026-09-21 · 安装版本：`@antv/infographic` 0.2.19 · 文档站点：v0.2.20

## 1. 官方定位

> “Infographic syntax is a **diagram-as-text grammar** for describing templates, designs, data, and themes.
> It works well with **AI streaming output** and manual editing alike, and you can render it directly via
> `Infographic.render(syntax)`.”

> “We express an infographic as: **Infographic = Information Structure + Graphic Semantics**”

来源：https://infographic.antv.vision/learn/infographic-syntax

## 2. 语法结构（原文誊录）

```
infographic <template-name>
design
  structure <structure-name>
    gap 12
  item <item-name>
    showIcon true
  title default
    align center
data
  title …
  desc  …
  lists | sequences | values | compares | nodes+relations | root+children
    - label …
      value …
      desc …
      icon …
theme <theme-name>
```

规则（原文要点）：

- “The entry starts with `infographic [template-name]`.”
- “Key-value pairs use **spaces** for separation, and indentation is done with **two spaces**.”
- “blocks like `structure [name]`, `item [name]`, or `title [name]` **omit the `type`**.”
- “Object arrays use `-` on new lines (e.g. `data.lists`), while simple arrays stay inline (e.g. `palette`).”
- “Container-specific configurations belong in `new Infographic({ ... })` (such as `width`, `height`, `padding`,
  `editable`); inside the syntax you only define `template`, `design`, or `theme`.”
- 点路径：`theme.base.text.fill #fff` ≡ 嵌套块；**路径穿过数组会报语法错误**；同一路径重复赋值以最后一次为准。

## 3. 六类数据结构（原文定义）

| 结构 | 字段 | 原文要点 |
|---|---|---|
| 列表 | `lists` | “a group of peer items **without ordering** — common for checklists or feature lists” |
| 序列 | `sequences` | “similar to lists but **ordered** — timelines or steps”；`order asc\|desc` 控制排序 |
| 层级 | `root` + `children` | “tree structure — org charts or taxonomies”；children 递归 |
| 对比 | `compares` | “side-by-side or grouped comparisons (**SWOT** or **quadrant** charts)”；项可带 `children` 作为各维指标 |
| 统计 | `values` | “showcases metrics”；`category` 支持分组（如按城市/月份） |
| 关系 | `nodes` + `relations` | “node-to-node connections, such as **flowcharts and networks**” |

数据项字段：`label` / `desc` / `value` / `icon`（“keyword (auto-mapped to an icon)”）。
兜底：“If you are unsure, you can use the generic **`items`** field and the template will adapt.”

节点/边属性（原文）：

- nodes：`id`（省略则取 label；重复定义后者胜）· `label`（省略则取 id）· `group`（分组着色）
- relations：`from` · `to` · `label` · `direction`（`forward` 默认 / `both` / `none`）· `showArrow` ·
  `arrowType`（`arrow` / `triangle` / `diamond`）

边语法表（原文）：

| 写法 | 含义 |
|---|---|
| `A -> B` | from A to B |
| `A <- B` | from B to A |
| `A -- B` | undirected edge (`direction none`) |
| `A<->B` | bidirectional edge (`direction both`) |
| `A -relation label-> B` | relation label（不允许特殊字符） |
| `A -->\|relation label\| B` | 同上，允许特殊字符 |
| `A --> B[label]` | node label |

规范化：`A ----> B` / `-.-` / `==>` / `--x` / `--o` → 归一为 `--` 或 `->`；`id1(label)` ≡ `id1[label]`；
`id@{...}` 属性被忽略。
关系示例支持两种风格：**YAML 风格**（`nodes` + `relations` 列表）与 **边列表风格**（`relations` 里直接写边）。

## 4. 本仓库实现要点（`src/renderers/infographic-renderer.ts`）

- 走官方 `Infographic` 类 + `render(code)`；容器尺寸固定 `900 × 600`、`padding 24`（**语法无法覆盖**）。
- 深色文档 → `theme = 'dark'`；手绘风格 → `themeConfig.stylize = { type: 'rough', roughness, bowing }`。
- 输出 `toDataURL({ type: 'svg', embedResources: true })`（资源内嵌）→ 再转 PNG。
- 错误处理：聚合解析错误并给出期望格式提示 —— 提示文案写的是
  `infographic <template-name> / data / title … / items / - label …`
  （与本文件第 3 节的"具体字段优先、`items` 兜底"并不矛盾，但**写示例时应优先用具体字段名**）。

## 5. 模板命名法（本项目的关键发现）

模板名是**结构化的**：`<族>-<结构/布局>-[方向]-<项样式>`

| 例子 | 拆解 |
|---|---|
| `list-grid-compact-card` | 族 list · 布局 grid · 项样式 compact-card |
| `list-pyramid-badge-card` | 族 list · 布局 pyramid · 项样式 badge-card |
| `sequence-roadmap-vertical-pill-badge` | 族 sequence · 形态 roadmap · 方向 vertical · 项样式 pill-badge |
| `sequence-horizontal-zigzag-underline-text` | 族 sequence · 方向 horizontal · 布局 zigzag · 文字风格 underline-text |
| `compare-binary-horizontal-underline-text-vs` | 族 compare · 元数 binary · 方向 horizontal · 文字风格 underline-text · 标记 vs |
| `chart-pie-donut-plain-text` | 族 chart · 图形 pie · 变体 donut · 文字风格 plain-text |
| `relation-dagre-flow-tb-simple-circle-node` | 族 relation · 布局 dagre-flow · 方向 tb · 样式 simple · 节点 circle-node |

⇒ **同一场景 = 族 + 结构/布局**，方向/项样式/文字风格是可替换后缀。
这条结论直接支持计划的「L2 场景按读者+用途定义，不按模板定义」，并解释了 113 个模板为何不该变成 113 个场景。

## 6. 待确认清单

- [x] `/learn/template`、`/learn/data`、`/learn/theme` 三页细读 —— 主题名 **`light` / `dark` / `hand-drawn`**；
  内置调色板 **`antv` / `spectral`**；主题键 `colorPrimary` · `colorBg` · `palette` · `base.text` ·
  `base.shape` · `title` / `desc` · `item.label` / `item.desc` / `item.value` / `item.icon`。
- [x] 结构注册表与模板的关系 —— 注册 42 个结构，模板只能到达 38 个；
  `hierarchy-tree` / `hierarchy-mindmap` / `relation-dagre-flow` / `sequence-interaction` 必须用内联 `design` 块。
- [x] 字段选择规则（源码 `options/parser.js`）—— `parseData` 按 **模板名前缀** 优先取字段
  （list→`lists`，sequence→`sequences`，compare→`compares`，relation→`nodes`，chart→`values`，hierarchy→`root`），
  否则按 `lists→sequences→compares→nodes→values→root→items` 兜底；`order desc` 会反转 `sequences`。
- [x] 画布尺寸 —— 输出 SVG **由内容决定尺寸**（实测 185×330 … 2970×306），
  宽成本：`hierarchy-tree` ≈365 px/叶、`sequence-interaction` ≈390 px/条、`hierarchy-mindmap` 固定 2086 px。
- [x] 内联 `design` 入口可用（已过渲染门禁）：`infographic` + `design structure <name>` + `item <item-name>`。
- [ ] 无效 `icon` 关键字的行为（未专项实测；示例统一用官方文档出现过的 `mdi/*` 形式）。
- [ ] `relation-*` 与 plantuml 的取舍规则（阶段 2 定稿，写入 `goals/`）。
