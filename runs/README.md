# runs/ — 每个入选项目一个实跑现场

| Run | 项目 | 上游 star | 驱动脚本 | 成品 | 数量 |
|---|---|---:|---|---|---:|
| 01 | XHS-TextCard | 107 | `run.mjs` | `out/*.png` | 9 张 1242×1656 |
| 02 | MarkCard Studio | 306 | `run.mjs` | `out/*.png` | 18 张 1080×1440 |
| 03 | article-tools | 825 | `run.mjs` | `out/*.png` | 3 张 1808×724 |
| 04 | 写了就发 | 569 | `run.mjs` | `out/cards/`、`out/article-long.png` | 3 张 1728×2304 + 1 张 748×1475 |
| 05 | ah-xhs-cover-title | 179 | `run.mjs` | `out/*.png` + `plan.json` | 4 张 1242×1656 |
| 06 | qiaomu-codex-imagegen → **Arena 生图** | 131 | `run.mjs` | `out/*.png` | 3 张 1242×1656 |

统一约定：每个 run 目录里有

- `run.mjs` —— 可复现的驱动脚本（起静态服务 → 开 Chromium → 调项目自己的 API/按钮 → 落盘）
- `content.md` —— 该 run 用的素材（鸡汤文，可自行替换）
- `out/` —— 成品图
- `README.md` —— 该项目是什么、怎么跑、踩过什么坑

前置环境：`bash archive/setup/render-env.sh`，并 `export LD_LIBRARY_PATH=/tmp/render-env/lib:$LD_LIBRARY_PATH`。

Run 02 需要先构建：`cd projects/MarkCardStudio && npm i && npx vite build`。
Run 06 的底图由 **Arena 生图** 产出，已放在 `06-arena-imagegen/assets/`；提示词由
`projects/qiaomu-codex-imagegen` 的 `compose` 生成（命令见该 run 的 README）。

---

## 第二批（Run 07–12）

| Run | 项目 | 上游 star | 驱动脚本 | 产物 | 规格 |
|---|---|---:|---|---|---|
| 07 | Auto-Redbook-Skills | 2358 | 上游 `scripts/render_xhs.py`（零改动） | `07-auto-redbook-skills/out-<主题>/` | 4 套主题 × 6 张，1080×1440（`--dpr 2` → 2160×2880） |
| 08 | XHS-TextCard | 107 | `projects/XHS-TextCard/tools/render-cards.mjs`（本仓库新增） | `08-xhs-textcard/` | 3 套模板，1242×1656，封面为 Arena 生图 |
| 09 | MarkCard Studio | 306 | `projects/MarkCardStudio/tools/render-cards.mjs`（本仓库新增） | `09-markcard-studio/` | 2 套主题 × 6 张，1080×1440（走真实「Export PNG set」） |
| 10 | takumi | 3098 | `projects/takumi/tools/quote-cards.mjs` | `10-takumi/` | 6 张金句卡 1242×1656 + `cover-animated.gif`（3 幕） |
| 11 | xiaohongshu-article-cards | 37 | `projects/xiaohongshu-article-cards/tools/fill-content.mjs` + 上游 `scripts/render_cards.mjs` | `11-xiaohongshu-article-cards/` | 6 张轮播卡，1080×1440 |
| 12 | satori + resvg | 14068 | `setup/satori-cards.mjs` | `12-satori/` | 4 张金句卡，1242×1656（1 张含 Arena 生图上半版） |

- 每个目录都有 `README.md`：项目是什么、复现命令、验证要点与已知瑕疵。
- `assets/arena/`：第二批使用的 Arena 生图素材（治愈系插画，预留文字安全区）。
- 体积策略：大于 320KB 的成品图转 JPEG q90（`npm run optimize`），需要无损 PNG 时重跑命令即可。
- 动图抽帧校验：`ffmpeg -i runs/10-takumi/cover-animated.gif -vf "select=eq(n\,10)" -vframes 1 /tmp/frame.png`
- 静态画廊：`npm run gallery` 生成 `runs/gallery.html`（两批共 76 张）。
