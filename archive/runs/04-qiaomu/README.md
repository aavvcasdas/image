# Run 4 · qiaomu-info-card-designer

**上游**：[joeseesun/qiaomu-info-card-designer](https://github.com/joeseesun/qiaomu-info-card-designer) · 272 ⭐ · 最近提交 2026-10-13 · MIT

## 用了它什么

| 用到的 | 位置 |
|---|---|
| 内容提炼方法论（结论性主标题 / 数字驱动 / 4–6 个要点 / 叙事弧线） | `SKILL.md` Step 1 |
| 卡片设计规范（尺寸、字号表、配色、基础 CSS） | `references/design-spec.md` |
| 长图智能切分脚本（**源码零改动**） | `scripts/split_card.py` |

## 产出

| 文件 | 说明 |
|---|---|
| `info-card.html` | 卡片源文件 |
| `info-card.png` | 1200×2626（600px 卡 × 2x 截图） |
| `info-card-{1,2,3}.png` | 由项目自带脚本切出的 3 张，切点都在空白带 |

## 项目规范里被实际执行的点

- 卡片宽 `600px`，2x 截图 = `1200px`（规范里的换算逻辑：CSS px × 2 ÷ 3 ≈ 手机 pt）
- 字号严格按表：主标题 56px / 条目标题 28px / 正文 20px / 金句 22px / 标签 16px / 页脚 15px
- 配色 token：`--color-bg #f5f3ed`（奶油底）、`--color-text #1a1a1a`、`--color-accent #2c3e8c`、`--color-muted #555`
- 主标题写成**结论式**而不是描述式：「模型算不对 7×8，却能帮你订机票」
- 要点顺序走叙事弧线：老本行 → 转机 → 循环 → 边界
- 金句出处用 `#777` 而不是 `#999`（规范明确要求）
- 长图切分调 `scripts/split_card.py <png> 1200 1400`：脚本找「整行都是背景色」的空白带作为切点，
  保证不切断文字（实测 2626px → 3 张）

## 与上游的唯一偏离（必要）

规范指定本地 **仓耳今楷02**（`TsangerJinKai02-W04.ttf`，19MB），且上游把字体文件直接放在
`assets/` 里。这个体积不适合入 Git，所以改用系统的 **Noto Serif SC**——
同为中文衬线，视觉家族一致。字体栈仍写成
`--font-title:'Noto Serif SC',serif`，要 1:1 还原时把 `@font-face` 指向仓耳今楷即可。

## 复现

```bash
node setup/shot.mjs runs/04-qiaomu/info-card.html runs/04-qiaomu/info-card.png \
  --width=600 --height=1400 --dpr=2 --selector=.card
python3 projects/qiaomu-info-card-designer/scripts/split_card.py \
  runs/04-qiaomu/info-card.png 1200 1400
```

## 坑

1. `split_card.py` 依赖 `pillow` + `numpy`。沙箱里 `pip install --user` 会被 PEP 668 拒绝
   （externally-managed-environment），要加 `--break-system-packages`。
2. 卡片是**纵向流式布局**，没有固定高度——用 `--selector=.card` 只截卡片本体，
   不要用固定视口高度，否则底部会被裁掉。
