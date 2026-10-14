# Run 04 · takumi（3098★，MIT/Apache-2.0，2026-10-13）

上游：https://github.com/kane50613/takumi —— Rust 内核 + JS API，把 **JSX/HTML/CSS 直接渲染成
PNG/JPEG/WebP/GIF**，**完全不需要浏览器**（对比 satori+resvg 方案更快、更省内存）。

## 复现

```bash
cd /home/user/image && npm i            # 安装 takumi-js
node projects/takumi/tools/quote-cards.mjs \
     --content runs/04-takumi/quotes.json \
     --out runs/04-takumi \
     --bg-dir runs/assets/arena
```

- 输入：`quotes.json`（6 张卡 + 1 段动图脚本；`theme` 可选 `warm-paper` / `night-ink` / `photo-bottom`）。
- 输出：1242×1656 静态卡 6 张 + `cover-animated.gif`（3 幕 × 1500ms，20fps，1242×1656）。
- `photo-bottom` 主题把 **Arena 生图**铺在下 58%，文字独占上方留白区——这是「模型生图 + 代码排版」的组合式。
- 字体：直接读 `~/.fonts` 的 Noto Sans/Serif SC（`FONT_DIR` 可覆盖）。

## 验证要点

- 单张渲染 ~0.4s，全程无浏览器进程 ✅
- 中文换行按 `\n` 精确断行（`<br/>`），金句不会乱折 ✅
- GIF 已用 ffmpeg 抽帧目验（第 11 帧内容正确）✅
