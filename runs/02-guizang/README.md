# Run 2 · guizang-social-card-skill

**上游**：[op7418/guizang-social-card-skill](https://github.com/op7418/guizang-social-card-skill) · 7.5k ⭐ · 最近提交 **2026-07-01**（⚠️ 比「近 3 个月」的窗口早约两周） · AGPL-3.0

## 用了它什么

| 用到的 | 位置 |
|---|---|
| Swiss 设计系统：token 层、间距刻度、字号/字重映射 | `assets/template-swiss-card.html`、`references/components.md` |
| 平台规范（尺寸、安全边距、命名、封面结构） | `references/platform-specs.md` |
| 布局配方 `S01 Accent Cover` / `S06 Pipeline` | `references/layout-recipes.md` |

## 产出

| 文件 | 说明 |
|---|---|
| `xhs-01-cover.html` / `.png` | 封面，1080×1440 @2x → 2160×2880 |
| `xhs-02-pipeline.html` / `.png` | 内页，同上 |

## 项目规范里被实际执行的点

- 画布 `1080×1440`（3:4），侧边距 84px、上边距 96px、下边距 104px（落在 72–120px 安全区内）
- token 层：`--paper #fafaf8` / `--ink #0a0a0a` / `--grey-1..3` / `--accent #002FA7`（Klein Blue）
- **"越大越轻"的字重映射**：hero 236px / weight 200，章节标题 112px / weight 300，
  lead 30px / weight 400，mono meta 20px / weight 500 + `.20em` 宽字距
- `S01`：满版强调色 + 大字标题 + 一个节点/连线系统图 + 底部 metadata strip（无装饰色块）
- `S06`：发丝边框（`--grey-2`）+ 中性灰底（`--grey-1`）的三行流水线，每行带序号、标签、动作、后果

## 与上游的唯一偏离（必要）

上游模板从 **Google Fonts** 拉 Inter / Noto Sans SC，从 **unpkg** 拉 lucide 图标脚本。
沙箱无外网可达这些域名，因此：

- 字体 → 本机 Noto Sans SC（`setup/render-env.sh` 安装）
- 图标 → 改为纯 CSS 几何（本套卡片本来也没用到图标）

**其余规范（尺寸、间距、字重、配色、布局结构）全部按原文执行，没有放宽。**

## 复现

```bash
node setup/shot.mjs runs/02-guizang/xhs-01-cover.html \
  runs/02-guizang/xhs-01-cover.png --width=1080 --height=1440 --dpr=2
```

## 坑

1. 上游的 `validate-social-deck.mjs` 是它自带的 QA 门禁（检查溢出 / 页脚碰撞 / 字号下限 /
   密度 / 标题行数等 9 条规则），但依赖 `playwright` 且不接受外部浏览器路径，
   本沙箱无法运行 → 改为**目视核对 + 用通用渲染器在 1080×1440 全尺寸下检查有无溢出**。
2. 卡片排版里**不要写 Markdown 加粗语法**（`**原文**`）——HTML 不解析它，会原样出现在图里。
