# HTML/CSS 文档与实现要点摘录（notes）

> 抓取/核实日期：2026-09-21 · 对象：本仓库 HTML 渲染链路 + 存量设计语言库（90 文件）

## 1. 规则原文（两个 SKILL.md 一致）

> **Rule 1: Direct HTML Embedding** —— “Write … as direct HTML in Markdown. NEVER use code blocks
> (` ```html `). The HTML should be embedded directly in the document without any fencing.”

> **Rule 2: No Empty Lines in HTML Structure** —— “Do NOT add any empty lines within the HTML … structure.
> Keep the entire HTML block continuous to prevent parsing errors.”

> **Rule 3（infocard）: Content Analysis Before Layout** —— 三个维度：Density（低/中/高 → 呼吸节奏）、
> Structure（单点/对比/层级/流程/放射/并列 → 版面几何）、Mood（→ 色温）。

> **Rule 4（architecture）: Flexible Layout Structure** —— 单列 / 双列 / 三列；三列语义已约定：
> 左=支撑系统（monitoring, operations, analytics）、中=核心层（user, application, data, infrastructure）、
> 右=横切关注点（security, compliance, governance）。

> **Rule 5（architecture）: Layer-Based Organization** —— 每层要有 clear semantic meaning + consistent
> color coding + grid-based layout。

## 2. 机制：为什么不能有空行

- CommonMark 把 HTML 当作 **HTML block**，**空行是块终止符** —— 卡片中间空一行，后面的 HTML 就变成另一个块。
- 本仓库管线里 `remark-inline-html.ts` 有 `mergeContiguousRootHtmlNodes()`：只合并**相邻**的 html 节点
  （`shouldMergeRootHtmlNodes` 判定 + 分隔符处理），跨越空行的两块合不回来。
- ⇒ 空行会同时破坏**结构**（分成两块）与**样式作用域**（第二块的 `<style>` 可能仍在文档级，但结构断裂后布局失效）。

## 3. 实现链路（导出边界）

```
裸 HTML 块
  → HtmlPlugin（nodeSelector: ['html']，先内联本地/远程图片为 data URL）
  → 预览：浏览器原生渲染（所见即所得）
  → DOCX：docx-exporter → convertNodeToDOCX() → HtmlPlugin.renderToCommon() → 栅格化图片 → 插入文档
          （仅当无插件认领/提取失败时，才落到 convertHtml() 的 “[HTML Content]” 占位段落）
```

- `convertHtml()`（`docx-exporter.ts:1049`）实现就是一行斜体灰字 `[HTML Content]` —— 那是**兜底**，不是正常路径。
- `HtmlRenderer`（`src/renderers/html-renderer.ts`）用 SVG `foreignObject` 把 **` ```html ` 代码块**渲染成 PNG；
  它才是"HTML 作为代码展示"的路径。
- `docx-inline-converter.ts`（698 行）只做**行内元素**到 DOCX run 的映射（strong/emphasis/delete/sup/sub/code/link/image/math/html），
  **不含 grid / flex / border-radius / gradient / box-shadow** ⇒ 版面类 CSS 在 DOCX 里只能靠截图保留。

## 4. `<style scoped>` 失效（重要发现）

- 两个 skill 的 layout 模板普遍写成：
  ```html
  <div style="max-width: 860px; box-sizing: border-box; position: relative;">
    <style scoped>
      .card { ... }
    </style>
    <div class="card">…</div>
  </div>
  ```
- 但 `scoped` 属性**早已被浏览器废弃**，本仓库 `src/`、`scripts/` 里**没有任何处理 `scoped` 的逻辑**
  （`grep -rn "scoped" src scripts` 只命中 webview 样式作用域与脚本文件名）。
- ⇒ 卡片里的 `<style>` 实际上是**文档级**的 ⇒ **类名必须自带前缀**。
- 存量实践已经这么做了：`card-section`(79) · `card-station`(64) · `card-sequence`(59) · `card-map`(58) ·
  `card-kpi`(56) · `card-tile`(50) · `card-panel`(50) · `card-review`(41)。
- ⇒ 写进 `engines/html-css.md`：**所有类名以 `card-` + 语义前缀命名；同文档多卡片时改用 `card-<slug>-*`**。

## 5. 库存命名法的两轴（Phase 2 依据）

| 轴 | 命名特征 | 例子 | 归属 |
|---|---|---|---|
| 业务文档（读者+用途） | 名词短语，行业/文档类型 | board-memo · incident-review · compliance-audit · healthcare-summary · sales-brief · news-bulletin · research-abstract | **L2 场景** |
| 版面几何（交付形态） | 形状/布局词 | bento-grid · split-panel · radial-hub · timeline-flow · staircase-progression · quadrant-matrix | **L3 版面变体** |

⇒ 现有文件名的混乱正是计划里"L2 不按模板定义"的活教材：同一目录下混着两类东西，分类时必须拆。

## 6. 待确认清单（与 catalogue §8 工单对应）

- [ ] 29 + 12 个 style 的收敛表（→ ≤12 语气族 + 变量化）
- [ ] `gap` / `aspect-ratio` / `backdrop-filter` 在各平台 WebView 的支持情况
- [ ] 打印 / PDF 导出时卡片的分页断裂表现
- [ ] DOCX 中卡片的实际清晰度与宽度（图片缩放系数）
- [ ] 零空行规则加入示例冒烟校验（自动化）
