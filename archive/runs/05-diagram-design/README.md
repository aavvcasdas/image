# Run 5 · diagram-design（⭐ 最高）

**上游**：[cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design) · 53.7k ⭐ · 最近提交 2026-10-13 · MIT

## 用了它什么

| 用到的 | 位置 |
|---|---|
| 设计令牌（语义角色 + 明暗两套值 + 对比度契约） | `references/style-guide.md` |
| 输出规范（format / size 预设 / detail / audience 四个旋钮） | `references/output-spec.md` |
| 非拉丁标签的字体扩展要求 | `references/output-spec.md` §「Non-Latin labels」 |
| SVG 导出脚本（**源码零改动**） | `scripts/export_svg.py` |

## 产出

| 文件 | 说明 |
|---|---|
| `attention.html` | 自包含 HTML（HTML 是唯一源，svg/png 都从它导出） |
| `attention.png` | 1216×1818 @2x（编辑级排版整页） |
| `attention.svg` | 由项目自带脚本导出的**独立矢量图**，可进 Figma/Illustrator 再编辑 |

## 项目规范里被实际执行的点

- **用 token 名而不是硬编 hex**：`paper #f5f5f5` / `paper-2 #ececec` / `ink #2d3142` /
  `muted #4f5d75` / `soft #5a6580` / `rule rgba(45,49,66,0.12)` / `rule-solid #bfc0c0` /
  `accent #bf4520` / `accent-tint rgba(191,69,32,0.08)`
- **尺寸预设 `doc-inline` = `viewBox 0 0 960 600`**，且所有坐标、宽度、间距都能被 4 整除
- **`accent` 只用在 1–2 个焦点节点上**（这里给「小猫」和「垫子」），其余节点走 `ink` + `rule-solid`
- **HTML 是唯一源**：先写 HTML，再用 `scripts/export_svg.py` 导出 SVG，没有手写 SVG 文件
- 结构按规范：`header`（eyebrow + h1 + lede）→ `diagram-container`（SVG）→ `summary cards`（3 张）→ `footer`
- 非拉丁标签处理：Geist 无中文字形 → 在 `<text>` 上把字体族扩展为 `'Geist','Noto Sans SC','PingFang SC'`，
  **没有替换整套 skin**（这是规范明确要求的做法）

## 复现

```bash
node setup/shot.mjs runs/05-diagram-design/attention.html \
  runs/05-diagram-design/attention.png --width=1024 --height=1200 --dpr=2 --selector=.frame
python3 projects/diagram-design/skills/diagram-design/scripts/export_svg.py \
  runs/05-diagram-design/attention.html runs/05-diagram-design/attention.svg --system-fonts
```

## 说明

- `--system-fonts` 让导出脚本跳过 Google Fonts 的 `@import`，产出**不发起任何网络请求**的 SVG。
- SKILL.md 第 0 节有一个「首次使用必须确认 style guide」的门禁：默认皮肤
  （paper `#f5f5f5` / ink `#2d3142` / accent `#bf4520`）在正式项目里应先定制。
  **本次为演示，明确选择保留 shipped default**，故未触发 onboarding 流程。
- 上游的 `scripts/lint-render.py` 等 QA 工具需要 Playwright 绑定的浏览器，本沙箱不可用。
