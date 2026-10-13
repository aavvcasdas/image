# PlantUML / draw-uml 文档要点摘录（notes）

> 抓取日期：2026-09-21 · 实现版本：`@markdown-viewer/draw-uml` 1.4.8 + `drawio2svg` 1.5.5

## 1. 访问状况（重要）

| 来源 | 结果 |
|---|---|
| https://plantuml.com/ · /en/ | ⛔ 跳转广告域（`usersync.gumgum.com` / `eus.rubiconproject.com`），非真实内容 |
| https://plantuml.com/guide · /en/guide | ⛔ `ERR_BLOCKED_BY_CLIENT`（本机网络层/广告拦截） |
| https://github.com/plantuml/plantuml (README) | ✅ 可用 —— 官方图型索引即出自此处 |
| **`~/works/draw-uml-dev`** | ✅ **用户指定的支持范围调研入口**（实现仓库） |
| `~/works/draw-uml-dev/packages/skills` | 🔗 符号链接 → `/Users/lion/works/markdown-viewer-extension/skills`（同一内容树） |

⇒ 语言指南尚缺；但**实现支持范围已可精确判定**（PEG 语法 + fixture 语料 + 生成基线 SVG）。

## 2. 官方图型索引（README 原文分类，逐条誊录）

**UML Diagrams**
- Sequence diagram · Use case diagram · Class diagram · Object diagram · Activity diagram（beta，含 legacy syntax）·
  Component diagram · Deployment diagram · State diagram · Timing diagram

**Non-UML Diagrams**
- JSON · YAML · EBNF · Regex · Network diagram (nwdiag) · Salt (Wireframe graphical interface / UI Mockups) ·
  Archimate diagram · SDL · Ditaa diagram · Gantt diagram · Chronology diagram · MindMap diagram ·
  WBS (Work Breakdown Structure) · Mathematical Notations (AsciiMath, JLaTeXMath) · Entity Relationship (ER) ·
  Information Engineering (IE) · ER (Chen's notation) · Chart diagram · Files (files tree) diagram

**Additional Features**
- Hyperlinks and tooltips · Rich text (Creole) with emoticons/unicode/icons · OpenIconic icons · Sprite icons

## 3. 实现仓库（draw-uml-dev）关键发现

### 3.1 Fixture 语料 = 支持范围的事实标准

`fixtures/plantuml/**`（22 类）+ `fixtures/svg-generated/**`（draw-uml 输出）+ `fixtures/svg/**`（官方 PlantUML
v1.2026.1 基线，用于对比）三者并存。用例数：

```
gantt 111 · sequence 99 · class 82 · deployment 59 · activity 56 · creole 47 · mxgraph-icons 60 ·
component 32 · state 32 · preprocessing 30 · mindmap 27 · stdlib 25 · use-case 25 · issues 24 ·
activity-legacy 19 · layout-engine 16 · packetdiag 16 · object 14 · activity-lane 13 · archimate 11 ·
mxgraph 10 · ie-diagram 6 · (± @startwbs 2)
```

### 3.2 解析模式判定（`parsers/puml.ts`，直接决定 L1/L2/L3）

```ts
const parseMode =
  (directive === '@startmindmap' || '@startwbs') ? 'mindmap'
  : (directive === '@startgantt' || '@startpacketdiag') ? 'default'
  : (directive && directive !== '@startuml') ? 'verbatim'   // ← 任何其它指令 = 文本直通
  : (isTimingHint ? 'timing' : 'default');
```

⇒ `@starttiming` / `@startsalt` 等**不报错也不画图**（静默失败陷阱）。

### 3.3 上下文检测（`detect-context.ts`）

`type DiagramContext = 'sequence' | 'class' | 'usecase' | 'deployment' | 'state' | 'description' | 'activity'`；
优先级：`sequence（若合格）> state > usecase > deployment > class`；component / IE 走各自的判定路径（有 fixture 为证）。

### 3.4 工具链（可直接复用）

- `scripts/render-fixtures.mjs` —— 渲染 fixture（`--all` 出统计）
- `scripts/validate-skill-icons.mjs` —— **校验 skills 里引用的 `mxgraph.*` 图标是否存在**（已有现成门禁）
- `scripts/gen-uml-stencils.mjs` —— 生成 stencil 清单（**真正的生成器在这里**，扩展仓库的
  `generate-stencil-docs.cjs` 是过时副本，输出路径已失效）
- `scripts/verify-fixtures.mjs` / `validate-grammar.py` —— 语法与 fixture 一致性

### 3.5 draw-uml 自述摘录（npm README）

- 定位：**把 PlantUML 文本转成 DrawIO XML**，再由 `drawio2svg` 渲染 SVG。
- 自述所列支持集合：**Class / Sequence / Activity / State / Use-case / Deployment / Object·Map**
  （⚠️ 自述**未列** Component 与 IE —— 但 fixture 语料证明两者都能渲染 ⇒ **自述落后于实现**，
  这本身就是一条要写进 dossier 的发现）。
- 解析器补充（源码清单）：`mindmap` · `gantt` · `packetdiag` · `archimate-macros` · `c4-macros` · `awslib-macros`。
- 布局：`ELK`（elkjs）/ `vizjs`（`!pragma layout vizjs`）；逐图覆盖；**序列图固定网格布局**。
- 图标：**5,000+（本仓库清单 9514 / 60 族）mxgraph 图标**，语法 `mxgraph.<family>.<icon> "Label" as <alias>`，
  可嵌套进 `cloud` / `node` / `rectangle` / `database` / `package` / `frame`，也可作为 activity 的 action 节点。
- 样式后缀：`#fill` / `##stroke` / `#fill ##stroke` / `##[dashed]green` / 细粒度 `#pink;line:red;line.bold;text:blue`。
- 主题：`theme.mode` 支持 `light` / `dark`（暗色只改节点/线/便签/文字色，不注入整幅背景）。
- 工具链：`fibjs --install`（要求 fibjs ≥ 0.38.0）—— 与本仓库的 fibjs 运行时一致。

来源：https://github.com/nicedoc/draw-uml#readme

### 3.6 反模式：`note bottom/top of X` 会报错（2026-09-21 实测）

最小复现：

```plantuml
@startuml
SimpleStorageServiceBucket(a, "A", " ")
SimpleStorageServiceBucket(b, "B", " ")
a --> b : labelled        ' ← 带标签的箭头
note bottom of a          ' ← 这一行直接失败
  x
end note
@enduml
```

→ `documd: Error: Unsupported sequence note position: bottom`

- 机制（`detect-context.ts`）：带标签箭头 `A --> B : text` 是**序列图的消息形式**；而 `note bottom of X` 既不设
  `hasNonSequence`（无 `st.alias`）也不设 `hasSequenceIndicator`（无 `over/across`），分类器因此倒向 sequence，
  而序列图的 note 渲染只支持 left / right / over。
- 实测边界：不带标签的 `a --> b` + `note bottom of a` **可以**；`note right of a` 配带标签箭头也**可以**。
- **写作规则**：一律用 `note right of X` / `note left of X` / 独立 `note "..." as N`，不用 bottom/top。

### 3.7 **可移植性分水岭：stdlib vs `mxgraph.*` 扩展**（2026-09-21 核实）

- **`mxgraph.*` 是 draw-uml 的扩展语法**，官方 PlantUML **一定报错**：
  `Error line N … Syntax Error? (Assumed diagram type: class)`。
  ⇒ 不能拿官方 PlantUML 当门禁去判它（用户明确指出过）。
- **官方 stdlib 家族**（jar 内实测，可移植）：
  `adaml` `archimate` `aws` `awslib`(+10/14/20) `azure` `bootstrap` `c4` `classy` `cloudinsight`
  `cloudogu` `domainstory` `edgy` `eip` `elastic` `gcp` `ibm` `k8s` `kubernetes` `logos` `material`(+2/7)
  `office` `osa`(+2) `tupadr3`
- **无 stdlib 对应 → 只能靠 mxgraph 扩展**：Cisco / Cisco Safe / Citrix / Networks 设备图标、
  BPMN、Lean Mapping、Mockup、Rack、PID、Mockup/Webicons 等。

⇒ **文档策略**：能可移植就优先 stdlib（awslib / azure / gcp / kubernetes / eip / archimate / c4）；
只能扩展时，示例必须显式标注 “uses the draw-uml `mxgraph.*` icon extension (renders in Markdown Viewer only)”。

### 3.8 门禁策略（verify-examples.mjs）

- **默认**：只用 draw-uml（documd）渲染冒烟 + 空图检测 + 规则 lint。
- **`--plantuml`（可选）**：额外用官方 plantuml CLI 做第二意见校验；**含 `mxgraph.` 的块自动跳过**并计数。
- 实战价值：靠这条我们抓到了 `note right of <name>` 在泳道图里非法（应为 `note right` / `floating note right:`）。

## 4. 对本 skill 的直接含义

1. **不能按"PlantUML 有什么就教什么"写**：官方 27 个图型里，本仓库 **L1 完整渲染**的是
   Class / Sequence / Activity（含泳道与 legacy）/ State / Use-case / Component / Deployment / Object /
   Archimate / Mindmap / WBS / Gantt / packetdiag / **ER（Chen 记法 = IE 鸦脚语法）**；
   **L2 静默失败**的是 Timing 与 Salt（能解析、不画图）；其余（JSON / YAML / EBNF / Regex / nwdiag / SDL /
   Ditaa / Chronology / Math / Chart / Files tree）为 L3 不支持。
2. **差异化在图标与容器**：mxgraph stencil（60 族 / 9514 图标）+ 嵌套容器 + 内联样式，是本引擎相对
   vega / echarts 的独占能力，也是示例库最该覆盖的部分。
3. **布局可控但要慎写**：默认 ELK；只有明确需要分层控制时才写 `!pragma layout vizjs`。
4. **序列图布局是固定网格**：不要指望通过布局 pragma 改变时序图的排布。
5. **复用现成语料与门禁**：`fixtures/plantuml/mxgraph/` 的 10 个真实场景是示例的现成种子；
   `scripts/validate-skill-icons.mjs` 是现成的"skill 里图标写错"门禁。

## 5. 待确认清单（与 catalogue §6 工单对应）

- [ ] 语言指南来源（阻断问题）—— 暂以 OMG UML 语义 + fixture 语料合成
- [ ] hyperlinks/tooltips · OpenIconic/Sprite 的实渲染结果
- [ ] `@startwbs` 与 mindmap 的差异边界；IE 鸦脚语法的可表达范围
- [ ] 无 pragma 时默认布局引擎（elk vs vizjs）
- [ ] stencil 数量口径（9514）在新布局下重新生成后复核
