# AI 科普图文创作 · 纯代码渲染实测

把「AI 科普」的内容，用**代码渲染**成可以直接发的图文：信息图、小红书卡片、长图、动图。
所有排版与图形都由代码生成（HTML/SVG/CSS → PNG/GIF/MP4），**不依赖任何生图 API**；
需要插画的部分用 **Arena 生图**产出的图片作为素材嵌入（图片本身不进版本库的生成链路，是文件资产）。

> 上一轮「本地渲染服务替换图像 API」的探索已归档到 [`archive/`](archive/)，不再维护。

## 选品标准

1. **不需要 API 接口**：本地跑，不调用 LLM / 生图接口；
2. **通过代码渲染**：产出由 HTML/SVG/CSS 渲染而成；
3. **近 3 个月有更新**（2026-07-13 之后）；
4. **star 高**优先。

## 本期收录的 5 个项目

| # | 项目 | star | 最近更新 | 许可 | 本轮结论 |
|---|------|------|----------|------|----------|
| 1 | [antvis/Infographic](https://github.com/antvis/Infographic) | 6990 | 2026-08 | MIT | ✅ 实跑出图：声明式信息图引擎，SSR/浏览器双通道 |
| 2 | [nexu-io/html-anything](https://github.com/nexu-io/html-anything) | 9098 | 2026-10 | Apache-2.0 | ✅ 实跑出图：75 个 skill 模板，官方自述「无需 API key」 |
| 3 | [OrRon/EpicInfographics](https://github.com/OrRon/EpicInfographics) | 440 | 2026-08 | MIT | ✅ 实跑出图/出片：工作室级信息图 skill，含 check→render→animate 工具链 |
| 4 | [wilbert-MD-PhD/medical-illustration](https://github.com/wilbert-MD-PhD/medical-illustration) | 174 | 2026-10 | MIT/CC BY | ✅ 实跑出图：医学科普绘图 skill（证据约束 + 可编辑排字） |
| 5 | [geekjourneyx/md2wechat-skill](https://github.com/geekjourneyx/md2wechat-skill) | 3696 | 2026-10 | 见仓库 | ⚠️ 环境受限：CLI 二进制需白名单外域名下载，未能实跑（见 [runs/06](runs/06-md2wechat/README.md)） |

同期评估后排除的候选见 [runs/README.md](runs/README.md)。

## 产出（全部实跑所得）

| Run | 项目 | 产出 |
|-----|------|------|
| [01](runs/01-antv-infographic/) | antvis/Infographic | 3 张科普信息图（LLM 三步训练 / 注意力流水线 / 能力边界对比） |
| [02](runs/02-html-anything/) | html-anything | 7 张小红书科普卡片（1080×1440，含 Arena 生图配图） |
| [03](runs/03-epic-infographics/) | EpicInfographics | 1 张竖版长图「大模型的食量」（对数刻度，1080×1920） |
| [04](runs/04-medical-illustration/) | medical-illustration | 1 张机制科普图「AI 是怎么看一张胸片的」（含 Arena 生图头图） |
| [05](runs/05-epic-animated/) | EpicInfographics（动画链路） | 动态版信息图：GIF + MP4（CSS 动画逐帧渲染） |
| [06](runs/06-md2wechat/) | md2wechat-skill | 未能实跑：记录受限原因与已验证的替代路径 |

主题统一为 **AI 科普**：大语言模型原理、模型规模增长、AI 医学影像等。

## 环境与复现

```bash
# 1) 渲染环境（Chromium + 中文字体），只需执行一次
bash archive/setup/render-env.sh

# 2) 各 Run 的复现命令见对应 README；通用前缀：
export LD_LIBRARY_PATH=/tmp/render-env/lib:$LD_LIBRARY_PATH
```

沙箱要点（踩坑记录见 [runs/README.md](runs/README.md)）：无浏览器 → `@sparticuz/chromium` + NSS 私有库；
无中文字体 → noto-cjk 稀疏检出；无 ffmpeg → npm 静态二进制；npm 需 `strict-ssl=false`。

## Arena 生图的用法

本项目把「需要模型生图」的部分与「代码渲染」解耦：

- **图片资产**：由 Arena 生图产出，落在各 Run 的 `assets/gen-*.png`，再用 `sharp` 裁边（`trim-*.png`）后嵌入 HTML/SVG；
- **排版/图形/文字**：全部由代码渲染，可复现、可微调、不消耗算力。

这样既保留了「模型生图」的画面质量，又让版式完全可控。

## 目录结构

```
projects/   收录的 5 个项目源码（剥离 .git / node_modules / 大示例）
runs/       每个项目的实跑记录与产物
archive/    上一轮（图文卡片方向）的完整存档
```
