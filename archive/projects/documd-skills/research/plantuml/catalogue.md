# PlantUML（本仓库实现 = draw-uml）— 图表目录与覆盖账本

| 项 | 值 |
|---|---|
| 文档宇宙 | **PlantUML 语言**（语法兼容；具体实现是 draw-uml） |
| 本仓库引擎 | `@markdown-viewer/draw-uml` **1.4.8**（PlantUML 文本 → drawio XML）+ `@markdown-viewer/drawio2svg` **1.5.5**（→ SVG） |
| **支持范围权威源** | **`~/works/draw-uml-dev`**（draw-uml 开发仓库：PEG 语法 `docs/puml.peggy`、fixture 语料、官方基线 SVG、渲染脚本） |
| fence | ` ```plantuml ` / ` ```puml ` |
| 调研日期 | 2026-09-21（第二轮：接入实现仓库） |
| 状态 | 能力矩阵已定稿（§3）；逐图型「何时用/别用」待补（§6 工单 1） |
| 关键提示 | 本引擎**不是**完整 PlantUML —— 官方图型里的 Salt/Timing 属「能解析但不渲染」的静默失败陷阱（§3） |

**验证状态图例**：✅ 已核对 · ⏳ 待实测 · ❌ 不支持/不收录

**支持层级（比“支持/不支持”更准确）**

| 层级 | 含义 | 判定依据 |
|---|---|---|
| **L1 完整渲染** | 有 fixture 语料 + draw-uml 产出 SVG（并与官方 PlantUML 基线对比） | `fixtures/plantuml/<x>` 与 `fixtures/svg-generated/<x>` 同时存在 |
| **L2 仅解析不渲染** | 语法能被 PEG 解析（不报错），但走「文本直通」路径，**不出图形** | 解析模式为 `verbatim` / `*_text_line`，且无 fixture |
| **L3 不支持** | 语法无解析 | PEG 与 `parsers/` 无对应规则 |

---

## 1. 文档来源与访问状况

| 来源 | URL / 位置 | 状态 |
|---|---|---|
| PlantUML 官方图型索引 | https://github.com/plantuml/plantuml （README "Supported Diagram Types"） | ✅ 已获取（本文件 §2 逐条誊录） |
| PlantUML 语言指南 | https://plantuml.com/guide · https://plantuml.com/en/ | ⛔ **本机被广告拦截/网络层阻断**（fetch 得到 ERR_BLOCKED_BY_CLIENT 或跳转广告域） |
| **draw-uml 语法（权威）** | `~/works/draw-uml-dev/docs/puml.peggy`（95 KB PEG） | ✅ |
| **draw-uml fixture 语料（权威）** | `~/works/draw-uml-dev/fixtures/plantuml/**`（22 类，800+ 用例）+ `fixtures/svg-generated/**` | ✅ |
| draw-uml 实现说明 | `~/works/draw-uml-dev/packages/draw-uml/README.md`（= npm 包 README） | ✅ |
| 图标匹配方法论 | `docs/stdlib-icon-matching.md`、`docs/composite-icon-design.md` | ✅ |
| 布局引擎说明 | `fixtures/plantuml/layout-engine/README.md` | ✅ |

> `~/works/draw-uml-dev/packages/skills` 是**指向本仓库的符号链接**（`→ /Users/lion/works/markdown-viewer-extension/skills`）：
> skills 与 draw-uml 共享同一内容树 ⇒ skills 里的示例可以在 draw-uml 侧就地校验（§5 工具链）。
>
> 阻断是本机网络层问题（非文档不存在）；已按协议「文档不可得时以安装版本/实现仓库为准」处理。

---

## 2. 官方图型索引（PlantUML README 誊录，查漏用）

**UML 图**（9）：Sequence · Use case · Class · Object · Activity（beta；含 legacy syntax）· Component ·
Deployment · State · **Timing**

**非 UML 图**（18）：JSON · YAML · EBNF · Regex · Network diagram (nwdiag) · **Salt**（线框/UI 草图）·
Archimate · SDL · Ditaa · Gantt · Chronology · MindMap · WBS · Mathematical Notations（AsciiMath、JLaTeXMath）·
Entity Relationship (ER) · Information Engineering (IE) · ER (Chen's notation) · Chart diagram · Files (files tree)

**附加特性**（4）：Hyperlinks and tooltips · Rich text (Creole，含 emoticon/unicode/icons) ·
OpenIconic icons · Sprite icons

---

## 3. 能力矩阵：官方图型 → 本仓库支持度 ✅（证据 = fixture 语料 + PEG 语法）

依据：`~/works/draw-uml-dev/fixtures/plantuml/**`（有 fixture 且产出 SVG 基线 = L1）、
`docs/puml.peggy` + `packages/draw-uml/src/parsers/puml.ts`（解析模式判定 = L2/L3）。

### 3.1 UML 图

| 官方图型 | 层级 | 证据 |
|---|---|---|
| Sequence | **L1** | `sequence-diagram/` **99** 用例（含 `autonumber` 12 处） |
| Class | **L1** | `class-diagram/` **82** 用例（继承 / 接口 / 关联 / 包） |
| Activity | **L1** | `activity-diagram/` **56** + `activity-diagram-lane/` **13**（泳道）+ `activity-diagram-legacy/` **19**（旧语法） |
| State | **L1** | `state-diagram/` **32** |
| Use case | **L1** | `use-case-diagram/` **25** |
| Component | **L1** | `component-diagram/` **32** + `detect-context.ts` 的 component 关键字表（**推翻上一轮的 ⏳**） |
| Deployment | **L1** | `deployment-diagram/` **59** |
| Object / Map | **L1** | `object-diagram/` **14** |
| Timing | **L2** | PEG 有 `timing_decl` / `timing_at` / `timing_is`；解析后走 `timing_text_line`（文本直通），无 fixture |

### 3.2 非 UML 图

| 官方图型 | 层级 | 证据 |
|---|---|---|
| Archimate | **L1** | `archimate-diagram/` **11** + `parsers/archimate-macros.ts` |
| MindMap | **L1** | `mindmap-diagram/` **27**（`@startmindmap`） |
| WBS | **L2** | ⚠️ `@startwbs` **能解析但渲染为空图**（实测：`documd wbs.puml` → 342 B 空 SVG）；draw-uml 自带 fixture 也证明：`fixtures/svg-generated/creole/036.svg` = 342 B vs 官方基线 `fixtures/svg/creole/036.svg` = 4535 B。**替代**：mindmap 或矩形树 |
| Gantt | **L1** | `gantt-diagram/` **111**（本仓库最大语料） + `gantt-layout.ts` |
| packetdiag | **L1** | `packetdiag-diagram/` **16** + `packetdiag-layout` |
| **ER（Chen 记法）/ IE** | **L1** | `ie-diagram/` **6**：`Entity01 }\|..\|\| Entity02` 式鸦脚关系（有生成 SVG）（**推翻上一轮的 ❌**） |
| Salt | **L2** | PEG 有 `salt_start` / `salt_layout_start` / `salt_text_line`（整块文本直通），无 fixture |
| JSON · YAML · EBNF · Regex · nwdiag · SDL · Ditaa · Chronology · Math · Chart · Files tree | **L3** | PEG 无对应起始指令；非 `@startuml` 且非 mindmap/gantt/packetdiag 的指令统一落 `verbatim` |

> **L2 的写作禁忌**：`@startwbs` / `@starttiming` / `@startsalt` **不报错但不画图**（输出空 SVG 或原文本）——
> 这类**静默失败**必须写进 `engines/plantuml.md` 的反模式一节。
> （`@startwbs` 是 2026-09-21 由 `verify-examples.mjs` 的“空图”检查发现的，见 §6 工单 1。）

### 3.3 附加特性

| 特性 | 层级 | 证据 |
|---|---|---|
| Rich text（Creole：粗体/斜体/列表/表格/emoji/HTML 片段） | **L1** | `fixtures/plantuml/creole/` **47** 用例 + `src/shared/creole*`（**推翻上一轮的 ⏳**） |
| Preprocessing（`!include` / `!define` / `!pragma` / `!theme` …） | **L1** | `preprocessing/` **30** 用例（fixtures 中 `!include` 出现 123 处） |
| Hyperlinks / tooltips | ⏳ | 未见 fixture；示例不依赖，实测后回填 |
| OpenIconic / Sprite icons | ⏳ | 未见 fixture；图标需求统一走 mxgraph stencil（§4） |

### 3.4 外观与排版（fixture 覆盖面，优先使用这些写法）

`skinparam` 80 · `hide` 71 · `title` 65 · `note` 64 · `left to right` 62 · `scale` 31 ·
`!include` 123 · `!pragma` 23 · `autonumber` 12 · `header` 10 · `legend` 6 · `footer` 3 · `caption` 2 · `together` 3

### 3.5 布局引擎

| PlantUML 写法 | draw-uml 实现 | 说明 |
|---|---|---|
| `!pragma layout elk`（**默认**） | `elkLayout()`（elkjs） | 默认路径；复杂层次图（activity / state） |
| `!pragma layout vizjs` | `dotLayout()`（viz.js/WASM） | 需要 Graphviz 行为时 |
| `!pragma layout smetana` | `dotLayout()`（viz.js） | 语义上映射到 vizjs 路径 |

**序列图固定网格布局**，不受 pragma 影响。默认引擎口径两处表述不一致（npm README 写 "elk (default)"，
layout-fixtures README 把 `smetana` 列为默认）→ §6 工单 3 实测。

**自扩展能力（draw-uml 特有，非 PlantUML 官方）**

| 能力 | 依据 | 处置 |
|---|---|---|
| **mxgraph stencil 图标**（`mxgraph.<family>.<icon> "Label" as alias`） | README「5,000+ DrawIO mxgraph icons」；本仓库清单 **9514 个 / 60 族** | 收录（本引擎**核心差异化**） |
| 内联样式后缀（`#fill` / `##stroke` / `#c;line:red;line.bold;text:blue`） | draw-uml README「Styling」 | 收录 |
| 嵌套容器（`cloud` `node` `rectangle` `database` `package` `frame`） | draw-uml README | 收录 |
| 布局引擎选择（`!pragma layout elk` / `vizjs`） | README「Layout Engines」 | 收录（T2，写进 `engines/plantuml.md`） |
| C4 宏（`C4_*`） | `c4-macros` parser | 收录（架构视角，T2 候选） |
| AWS 库宏（awslib） | `awslib-macros` parser | 收录（与 mxgraph stencil 并存的旧式写法，T2） |
| packetdiag（`@startpacketdiag`） | `packetdiag` parser + layout | 收录（T2：网络协议报文/字段布局） |

---

## 4. Stencil 轴（60 族 / 9514 图标）

清单：`skills/uml/stencils/README.md`，由 **`~/works/draw-uml-dev/scripts/gen-uml-stencils.mjs`** 生成
（输出到 `packages/skills/uml/stencils/` = 本仓库 `uml/stencils/`；新布局下应改为 `<pkg>/engines/plantuml-stencils/`）。

**语料证据**：`fixtures/plantuml/mxgraph-icons/` **60** 用例（逐族图标）+
`fixtures/plantuml/mxgraph/` **10** 个真实场景（aws-serverless · eip-messaging · lean-vsm · gcp-ml-pipeline ·
network-topology · bpmn-order-flow · azure-multi-tier · aws-vpc-deployment · hybrid-datacenter · aws-security）。

**复合图标**：DrawIO 的 `resourceIcon;resIcon=`（AWS4）/ `hexIcon`（GCP2）/ `icon2`（Kubernetes）/
`rect`（Cisco Safe、Cisco19）模式有专门治理（`docs/composite-icon-design.md`：AWS4 侧栏 1023 项中 ~397 为复合渲染）。

60 族：Alibaba Cloud · Android · Archimate · Archimate 3 · Arrows · Atlassian · AWS · AWS2 · AWS3 · AWS 3D ·
AWS4 · Azure · Basic · Bootstrap · BPMN · Cabinets · Cisco · Cisco Safe · Cisco19 · Citrix · Citrix2 · DFD ·
EIP · Electrical · Floorplan · Flowchart · Fluid Power · GCP · GCP2 · GMDL · IBM · IBM Cloud · Infographic ·
iOS7 · Kubernetes · Kubernetes2 · Lean Mapping · Mockup · MSCAE · Networks · Networks 2 · Office · Openstack ·
PID · PID Instruments · PID Misc · PID Valves · Rack · Rack General · Salesforce · SAP · Signs · Sitemap ·
SysML · UML 2.5 · Veeam · Veeam2 · VVD · Webicons · Weblogos

**计划**：不做 60 族全量示例；按目标域精选（草案 ~12–16 族）：
`AWS4`（云）· `Azure`/`GCP`（多云）· `Kubernetes`（容器）· `Networks`/`Cisco`/`Cisco19`（网络）·
`Cisco Safe`（安全）· `BPMN`（流程）· `EIP`（集成）· `Lean Mapping`（价值流）· `Archimate`/`Archimate 3`（EA）·
`Mockup`/`Webicons`（UI 草图，html-css 的替代物）· `Basic`/`Flowchart`（通用）· `PID`*（工业，T2）
→ 其余族在 `engines/plantuml-stencils/` 里保留索引，不出示例。

---

## 5. 工具链（draw-uml-dev 侧，可直接服务于 skill 质量）

| 脚本 | 作用 | 对 skill 的用途 |
|---|---|---|
| `scripts/render-fixtures.mjs` | 渲染 fixture 语料（`--all` 出统计） | 示例渲染校验的参考实现 |
| `scripts/validate-skill-icons.mjs` | **校验 skills 中引用的 `mxgraph.*` 图标是否存在**（扫 `packages/skills/**/*.md`） | 直接改造为门禁（路径随新布局调整） |
| `scripts/gen-uml-stencils.mjs` | 生成 stencil 清单到 skills | stencil 迁入 `<pkg>/engines/plantuml-stencils/` 后改输出路径 |
| `scripts/verify-fixtures.mjs` · `validate-grammar.py` | 语法与 fixture 一致性校验 | 语法变更影响面参考 |

> ⚠️ 扩展仓库的 `scripts/generate-stencil-docs.cjs`（输出到不存在的 `skills/drawio/stencils`）是**过时副本**
> → 计划中「修路径」应改为「退役并指向 draw-uml-dev 的生成器」。

---

## 6. 工单（下一轮）

1. **逐图型「何时用 / 别用 / 数据形态 / 邻近边界」**（§3.2.2 字段）：PlantUML 指南仍被阻断 ⇒ 暂以
   ［OMG UML 语义 + fixture 语料（本实现实际行为）+ 官方 README 图型索引］合成，并在 dossier 标注依据来源；
   日后若取得指南再逐条复核。
2. **⏳ 项实测**：hyperlinks/tooltips · OpenIconic/Sprite · `@startwbs` 与 mindmap 的差异边界 ·
   IE 鸦脚语法的可表达范围（能否带属性/多关系）。
3. **默认布局引擎口径**：实测无 pragma 时的真实默认（elk vs vizjs），写进 `engines/plantuml.md`。
4. **示例种子复用**：`fixtures/plantuml/mxgraph/` 的 10 个真实场景 + `stdlib/{aws,c4}`（38 / 8 用例）
   直接对应目标域（云 / 网络 / 安全 / 集成 / 引擎架构 / 精益），作为示例编写起点（改写为文档内嵌代码块 + 加 `source:`）。
5. **stencil 计数**：新布局下落定 `engines/plantuml-stencils/` 输出路径后重新生成，锁定 9514 口径。

---

## 7. 引用

- PlantUML 官方仓库（图型索引）：https://github.com/plantuml/plantuml
- draw-uml 自述：https://github.com/nicedoc/draw-uml#readme
- **实现仓库（支持范围权威源）**：`~/works/draw-uml-dev`
  —— `docs/puml.peggy`（语法）、`fixtures/plantuml/**` 与 `fixtures/svg-generated/**`（语料 + 基线）、
  `packages/draw-uml/src/**`（解析模式与生成器）、`scripts/*.mjs`（工具链）
- Stencil 清单：`skills/uml/stencils/README.md`
