# Run 06 · vercel/satori（14068★，MPL-2.0，2026-10-13）

上游：https://github.com/vercel/satori —— 业界最常用的「HTML/CSS → SVG」渲染器（Vercel OG 的底座），
配 `@resvg/resvg-js` 完成 SVG → PNG。**不需要浏览器、不调用任何 API**，是最经典的「代码排图」方案。

## 复现

```bash
cd /home/user/image && npm i            # 安装 satori 与 @resvg/resvg-js
node setup/satori-cards.mjs --content runs/12-satori/quotes.json --out runs/12-satori --bg-dir runs/assets/arena
```

- 输入：`quotes.json`（4 张卡，主题 `ink-paper` / `deep-night` / `photo-top`）。
- `photo-top`：上半部铺 **Arena 生图**，下半部纯代码排版文字（模型生图 + 代码排版的标准组合）。
- 字体：直接读 `~/.fonts` 的 Noto Sans/Serif SC 字体文件；输出 1242×1656 PNG。

## 验证要点

- 单张 < 0.5s；中文换行正确（`\n` → 逐行 div）✅
- 渐变遮罩（`linear-gradient`）与图片 `objectFit` 生效 ✅
- satori 会在 fetch 图片时做 SSRF 防护，本地文件请用 **dataURL** 内联（本脚本已这样做）。
