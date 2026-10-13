# HTML/CSS（版面与卡片）— 库存、规则与覆盖账本

| 项 | 值 |
|---|---|
| 引擎 | **无外部引擎**：本仓库自有的 HTML 渲染链路 + 既有设计语言库（`architecture` / `infocard`） |
| fence | **无 fence**（裸 HTML 直接嵌入）；另有 ` ```html ` 代码块路径（用途不同，见 §1） |
| 文档 | MDN（CSS 能力与坑）+ 本仓库存量 90 个模板文件（§3） |
| 调研日期 | 2026-09-21 |
| 状态 | 库存已全量枚举；硬规则与实现边界已核实（§2/§6）；样式轴待收敛（§5） |
| 定位 | **版面与卡片**：一页把一件事讲清（文档卡片）或把系统铺成一页（图层/总览版面） |

---

## 1. 两条 HTML 路径（必须分清）

| 路径 | 写法 | 预览 | **导出（HTML / DOCX / PDF / EPUB）** | 用途 |
|---|---|---|---|---|
| **裸 HTML 块** | 直接写 HTML，**不套代码块** | 原生 HTML（可选文本、跟随主题） | ⚠️ **栅格化成 PNG 图片**（实测：1 个 `<img>` + 62 KB data URL，类名与文本不再存在） | ✅ 卡片 / 图层版面（我们的主路径） |
| ` ```html ` 代码块 | 代码块内写 HTML | `HtmlRenderer` 用 SVG `foreignObject` → PNG | 同上（图片） | ⚠️ 仅用于"展示一段 HTML 代码的样子"；**不能用于卡片**（会变成静态图片、丢失可选中文本） |

> **导出即图片**（2026-09-21 实测，`documd card.md --format html`）：预览里是活 HTML，但**一进导出管道就变成截图**。
> 影响：① 卡片内文字在导出的 HTML/PDF 中**不可选中/不可搜索**；② 主题与缩放被“固化”在截图里；
> ③ 正文信息不要只放在卡片里；④ 卡片宽度需约束（截图尺寸即最终像素）。

> 官方规则原文（两个 skill 一致）：“Write … as **direct HTML** in Markdown. **NEVER** use code blocks
> (` ```html `). The HTML should be embedded directly in the document without any fencing.”

---

## 2. 硬规则（5 条，机制已核实）

| # | 规则 | 机制 / 原因 |
|---|---|---|
| 1 | **直接嵌入 HTML，不套代码块** | 代码块会走 `HtmlRenderer` 变成图片（§1） |
| 2 | **HTML 结构内不得有空行** | CommonMark 的 HTML block 在空行处终止；管线里的 `mergeContiguousRootHtmlNodes` 只能合并**相邻** html 节点 ⇒ 空行会把卡片切成两块，CSS 与结构都会断裂 |
| 3 | **写前先做内容分析**（infocard）：密度 × 结构 × 情绪 | 见 §4 的方法论表；这是"选版面/选配色"的前置判断 |
| 4 | **布局按需选列数**（architecture）：单列 / 双列 / 三列 | 三列的语义已约定：左=支撑系统（监控/运维/分析），中=核心层（用户/应用/数据/基础设施），右=横切关注点（安全/合规/治理） |
| 5 | **图层组织**：每层要有明确语义 + 一致配色 + 网格化组件 | 图层的颜色即语义（不要用颜色做装饰） |

**附加约定（本项目实践，建议写进 `engines/html-css.md`）**

- `<style scoped>` **并不生效**（浏览器早已废弃 `scoped` 属性，本仓库也无任何处理逻辑）⇒ 必须**给类名加前缀**
  （存量约定：`card-*`，实测 79 个 `card-section`、64 个 `card-station`…），否则同文档多张卡片会互相污染。
- 卡片根容器给 `max-width`（存量多为 `860px`）与 `box-sizing: border-box`。
- 图片必须内联为 data URL（管线会把本地/远程图片内联；远程图片在内联失败时保留原样，离线环境不可靠）。

---

## 3. 库存清单（90 个模板文件）

### 3.1 `architecture`：13 layouts × 12 styles

**layouts**：`layer-layouts` · `single-stack` · `two-column-split` · `three-column` · `left-sidebar` ·
`right-sidebar` · `grid-catalog` · `dashboard` · `pipeline` · `hub-spoke` · `nested-containers` ·
`connectors` · `banner-center`

**styles**：`frost-clean` · `slate-dark` · `indigo-deep` · `ocean-teal` · `sage-forest` · `ember-warm` ·
`rose-bloom` · `pastel-mix` · `steel-blue` · `stark-block` · `neon-dark` · `dusk-glow`

> 特征：13 个 layout 全是**版面几何**（单列/多列/网格/管道/枢纽/嵌套/连接线）；12 个 style 全是**色调**。

### 3.2 `infocard`：36 layouts × 29 styles

**layouts（36）**：`architecture-map` · `badge-grid` · `bento-grid` · `board-memo` · `checklist-board` ·
`comparison` · `compliance-audit` · `customer-story` · `education-module` · `financial-snapshot` ·
`funnel-stack` · `healthcare-summary` · `hero-card` · `incident-review` · `layered-sidebar-map` ·
`matrix-table` · `metric-board` · `news-bulletin` · `org-update` · `partner-brief` · `policy-memo` ·
`principle-grid` · `pros-cons` · `quadrant-matrix` · `quote-card` · `radial-hub` · `research-abstract` ·
`risk-register` · `roadmap-board` · `sales-brief` · `split-panel` · `stacked-modules` ·
`staircase-progression` · `station-workflow` · `terminal-window` · `timeline-flow`

**styles（29）**：`academic-paper` · `bold-contrast` · `clinical-brief` · `corporate-clean` ·
`customer-spotlight` · `deep-night` · `editorial-warm` · `education-studio` · `engineering-whiteprint` ·
`glassmorphism` · `incident-desk` · `japanese-minimal` · `lab-journal` · `midcentury` · `navy-formal` ·
`neo-brutalism` · `news-broadcast` · `paper-minimal` · `partner-channel` · `pitch-deck-vc` ·
`policy-paper` · `sales-room` · `slate-chalk` · `soft-neutral` · `sunset-warm` · `swiss-grid` ·
`tech-blueprint` · `terminal-green` · `trust-center`

### 3.3 ⚠️ 关键发现：`infocard` 的 36 个 layout 混了两类东西

| 类别 | 例子 | 归属（按计划 §4.1） |
|---|---|---|
| **内容原型（读者 + 用途）** ≥17 个 | `board-memo` · `policy-memo` · `incident-review` · `compliance-audit` · `financial-snapshot` · `healthcare-summary` · `customer-story` · `research-abstract` · `sales-brief` · `partner-brief` · `news-bulletin` · `org-update` · `education-module` · `risk-register` · `checklist-board` · `metric-board` · `roadmap-board` | **L2 场景** → `documents-and-cards` |
| **版面几何（交付形态）** ≈19 个 | `bento-grid` · `split-panel` · `radial-hub` · `stacked-modules` · `timeline-flow` · `funnel-stack` · `staircase-progression` · `quadrant-matrix` · `matrix-table` · `badge-grid` · `principle-grid` · `pros-cons` · `comparison` · `hero-card` · `quote-card` · `terminal-window` · `station-workflow` · `architecture-map` · `layered-sidebar-map` | **L3 版面** → `layouts-and-overviews` |

⇒ 这正是计划里把 `documents-and-cards` 与 `layouts-and-overviews` 拆开的**经验依据**：
文件名的两套命名法（业务文档 vs 网格几何）本来就对应"场景"与"实现变体"两轴。

---

## 4. 内容分析方法论（infocard Rule 3 原文，**保留为设计方法**）

**密度 → 呼吸节奏**：低（≤50 字）= 大字主导 + 大量留白；中（50–200 字）= Hero + 2~3 个支撑块；
高（200+ 字）= 非对称多栏，主/次/辅三级，**禁止等权平铺**。

**结构 → 版面几何**：单点=一个锚点主导；对比=分屏两极；层级=堆叠模块/金字塔；流程=纵向级联+编号；
放射=中心辐射；并列=非对称网格（**不要等宽列**）。

**情绪 → 色温**：影响配色与排版语气（对应 §5 的 style 轴）。

---

## 5. 样式轴（29 → 收敛目标 ~12）

现有 29 个 style 可按"语气"归族（收敛草案）：

| 语气族 | 现有 style |
|---|---|
| 学术 / 论文 | `academic-paper` · `research-abstract`* · `lab-journal` |
| 企业正式 | `corporate-clean` · `navy-formal` · `policy-paper` · `trust-center` |
| 编辑 / 杂志 | `editorial-warm` · `midcentury` · `paper-minimal` · `soft-neutral` |
| 技术蓝图 | `tech-blueprint` · `engineering-whiteprint` · `swiss-grid` |
| 终端 / 极客 | `terminal-green` · `slate-chalk` |
| 深色 / 夜间 | `deep-night` · `customer-spotlight` |
| 高对比 / 强势 | `bold-contrast` · `neo-brutalism` · `pitch-deck-vc` |
| 行业专用 | `clinical-brief` · `incident-desk` · `news-broadcast` · `sales-room` · `partner-channel` · `education-studio` · `glassmorphism` |

⇒ 收敛策略：保留"语气族"12 个代表样式，把行业专用样式（clinical/incident/news/sales/partner/education）
**并入对应语气族 + 行业配色变量**，而不是各自成为独立模板。

---

## 6. 实现边界（已核实）

| 边界 | 事实 | 写作约束 |
|---|---|---|
| HTML block 终止 | CommonMark HTML block 遇空行终止 | **卡片内零空行**（Rule 2） |
| `<style scoped>` | 浏览器已废弃该属性，本仓库**无处理逻辑** | 类名必须加前缀（`card-*`），否则多卡片互污 |
| DOCX 导出 | 走 `HtmlPlugin → renderToCommon` → **栅格化图片**；无插件认领时才降级为 `[HTML Content]` 占位 | 卡片排版会被"拍照"保留，但**不可编辑**；正文信息不要只放在卡片里 |
| **HTML 导出** | **同样栅格化**（实测：导出 HTML 里只剩一个 `<img>` + data URL，原类名/文本全部消失） | 导出件里的卡片不可选、不可搜；不要指望在导出 HTML 里做样式微调 |
| grid / flex / border-radius / gradient / box-shadow | **无 DOCX 语义映射**（`docx-inline-converter` 只处理行内元素） | 依赖这些特性的版面在 DOCX 里靠截图保留，不要指望可重排 |
| 图片 | 本地/远程图片会被内联为 data URL；远程失败时不可靠 | 卡片内的图用本地或 data URL |
| 字体 | 跟随文档主题字体；不要写死 `font-family`（除非有意） | 主题切换时保持一致 |

---

## 7. 覆盖账本（处置）

| 类别 | 现有 | 收录 | 不收录 / 收敛 |
|---|---|---|---|
| architecture layouts | 13 | 全部（都是版面几何，复用价值高） | — |
| architecture styles | 12 | 收敛为 ~6（与 infocard 的语气族去重） | 与 infocard style 重复的色调合并 |
| infocard layouts | 36 | 17 个内容原型 → L2 场景；19 个版面几何 → L3 变体 | 不作为 36 个独立场景 |
| infocard styles | 29 | 收敛为 ~12 语气族 | 行业专用样式并入语气族 + 行业配色变量 |
| **合计** | **90** | 场景 ≈17–20 + 变体 ≈19 + 语气 ≈12 | 净减约 40 个文件 |

---

## 8. 工单（下一轮）

1. **样式族收敛表定稿**：把 29 + 12 = 41 个 style 归并到 ≤12 个语气族，每个族给"变量化"方案
   （主色/底色/字体/边框/圆角五组变量）。
2. **实测 MDN 侧坑点**：`gap` 在旧 WebView、`aspect-ratio`、`backdrop-filter`（glassmorphism 依赖）、
   打印/导出时的分页断裂。
3. **版面骨架抽取验证**：从 19 个几何 layout 中抽出可组合的"骨架"（栅格列数 + 区块比例），验证
   跨场景复用（例如 `bento-grid` 能否承载 `metric-board` 的内容）。
4. **DOCX 截图质量复核**：卡片在 DOCX 中的实际清晰度与宽度适配（是否 1/4 缩放，见 `docx-inline-converter` 的图片缩放逻辑）。
5. **零空行规则的自动化校验**：在示例冒烟脚本里加一条"HTML 块内不得出现空行"的检查。

---

## 9. 引用

- 规则来源：`skills/architecture/SKILL.md`、`skills/infocard/SKILL.md`（Rule 1–5 原文见 `notes.md`）
- 库存：`skills/architecture/{layouts,styles}/*.md`（25）、`skills/infocard/{layouts,styles}/*.md`（65）
- 实现：`src/plugins/html-plugin.ts`、`src/plugins/remark-inline-html.ts`、`src/renderers/html-renderer.ts`、
  `src/exporters/docx-exporter.ts`（`convertHtml` / `convertNodeToDOCX`）、`src/exporters/docx-inline-converter.ts`
- MDN（CSS 能力与坑）：https://developer.mozilla.org/
