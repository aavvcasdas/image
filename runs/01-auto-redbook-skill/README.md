# Run 01 · Auto-Redbook-Skills（2358★，MIT，2026-08-13）

上游：https://github.com/comeonzhj/Auto-Redbook-Skills —— Claude/Codex Skill + 独立渲染脚本，
把 Markdown 变成小红书笔记素材（封面 + 正文卡），支持 **8 套主题**与 **4 种分页模式**。

## 复现

```bash
bash archive/setup/render-env.sh && bash setup/local-browser.sh     # 仓库根执行
export LD_LIBRARY_PATH=/tmp/render-env/lib:$LD_LIBRARY_PATH
cd projects/auto-redbook-skills

for t in default playful-geometric botanical sketch; do
  python3 scripts/render_xhs.py ../../runs/01-auto-redbook-skill/note.md \
      -o ../../runs/01-auto-redbook-skill/out-$t -t $t -m separator --dpr 2
done
```

- 输入：`note.md`（自撰「停止内耗」示例，5 段 + 标签），front-matter 提供封面 emoji/标题/副标题。
- 输出：每套主题 6 张（`cover.png` + `card_1..5.png`），1080×1440，`--dpr 2` 实测为 2160×2880。
- 上游脚本走 Python Playwright；沙箱里通过 `setup/local-browser.sh` 把静态 Chromium 放到 playwright
  期望的路径，**上游代码零改动**。

## 验证要点

- 分页模式 `separator` 按 `---` 切页：5 段 → 5 张正文卡 ✅
- 主题差异明显：`out-default`（简约灰）、`out-playful-geometric`（孟菲斯糖果色）、
  `out-botanical`（森林绿）、`out-sketch`（手绘素描）✅
- 已知瑕疵：YAML front-matter 用了 emoji 时，默认主题封面会把 front-matter 当正文渲染
  （上游行为）——本次示例已避开该组合。

> 说明：仓库里图片已转 JPEG q90 控制体积，重跑即可得到原 PNG。
