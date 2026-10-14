# runs/ — 实跑产物

跑法见根 `README.md`；每个目录的 `README.md` 记录该项目的复现命令、输出规格与验证要点。
**画廊页**：`gallery.html`（用 `node setup/build-gallery.mjs` 重新生成）。

| 目录 | 项目 / Star | 产物 | 规格 |
|------|------------|------|------|
| `01-auto-redbook-skill/` | Auto-Redbook-Skills · 2358★ | 4 套主题（default / playful-geometric / botanical / sketch）各 6 张（封面 + 5 正文） | 1080×1440（`--dpr 2` 时 2160×2880） |
| `02-xhs-textcard/` | XHS-TextCard · 107★ | 3 套模板（elegant-book / cinematic-film / ios-memo）；elegant-book 与 cinematic-film 的**封面用 Arena 生图替换** | 1242×1656 PNG |
| `03-markcard-studio/` | MarkCard Studio · 306★ | 2 套主题（Swiss Grid / Warm Journal）各 6 张，走真实「Export PNG set」下载流 | 1080×1440 PNG |
| `04-takumi/` | takumi · 3098★ | 6 张金句卡（其中 3 张以 Arena 生图为底图）+ **动态 GIF 封面** | 1242×1656；GIF 1242×1656 × 3 幕 |
| `05-article-cards/` | xiaohongshu-article-cards · 37★ | 奶油信息卡 6 张轮播（分级表 / 清单 / 步骤 / 排名 / 对照 / 检查表） | 1080×1440 PNG |
| `06-satori/` | satori · 14068★ + resvg | 4 张金句卡（其中 1 张以 Arena 生图为上半版） | 1242×1656 PNG |
| `assets/arena/` | — | Arena 生图的治愈系插图 5 张（文字安全区预留） | 竖版 3:4 PNG |

## 体积说明

大于 320KB 的成品图已按 `setup/optimize-images.mjs` 转成 **JPEG q90**（小红书等平台会二次压缩，肉眼无差别）。
需要无损 PNG 时，按各 `README.md` 的命令重跑即可。

## 帧级验证

动图产物的抽帧检查用 ffmpeg（沙箱内可用 npm 包自带的静态二进制）：

```bash
FF=$(find /tmp/ff/node_modules -name ffmpeg -type f | head -1)   # 见根 README 的安装片段
$FF -y -i runs/04-takumi/cover-animated.gif -vf "select=eq(n\,10)" -vframes 1 /tmp/frame.png
```
