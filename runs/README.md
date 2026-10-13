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
