# Runs 总览

本期共尝试 5 个项目、6 条实跑链路。下面按「实跑结果 / 环境坑 / 排除候选」三部分记录。

## 实跑结果

| Run | 项目（star） | 产出 | 状态 |
|-----|--------------|------|------|
| 01 | antvis/Infographic（6990★） | 3 张信息图 PNG + SVG | ✅ |
| 02 | html-anything（9098★） | 7 张卡片 PNG（含 Arena 生图配图） | ✅ |
| 03 | EpicInfographics（440★） | 1 张长图 PNG | ✅ |
| 04 | medical-illustration（174★） | 1 张机制图 PNG（含 Arena 生图头图） | ✅ |
| 05 | EpicInfographics 动画链路 | GIF + MP4 + 抽帧 contact sheet | ✅ |
| 06 | md2wechat-skill（3696★） | — | ⚠️ 环境受限 |

## 环境坑与解决（沙箱无网白名单内）

| 问题 | 现象 | 解决 |
|------|------|------|
| npm 证书链 | `UNABLE_TO_VERIFY_LEAF_SIGNATURE` | `npm config set strict-ssl false` |
| Node 侧 TLS | postinstall 下载二进制 `unable to verify the first certificate` / `ECONNRESET` | 无解时改走白名单内路径（见 06） |
| 无浏览器 | Chromium 缺 `libnspr4.so` | `@achingbrain/nss` 提取私有 so + `LD_LIBRARY_PATH` |
| 无中文字体 | 中文渲染为方块 | noto-cjk 稀疏检出到 `~/.fonts` |
| 无 ffmpeg | `animate.mjs` 无法合成 GIF/MP4 | npm 包 `@ffmpeg-installer/ffmpeg` 自带静态二进制，用 `FFMPEG=` 指过去 |
| 无 emoji 字体 | 🧠/✅ 渲染成方框 | 卡片文案里移除 emoji，改用文字与符号 |
| Playwright 无浏览器 | `playwright` 自带下载源不在白名单 | 改用 `playwright-core` + `executablePath` 指向本地 Chromium（`CHROME_BIN`） |
| AntV SSR 中文测量 | 文字溢出、卡片被裁 | SSR 仅用于快速探语法，出图一律走浏览器渲染 |
| AntV 图标服务 | icon 需访问 `weavefox.cn`，离线失败 | 出图模板避开图标依赖，用配色与形状承担视觉 |
| 生图配图白边 | 模型生图四周留白，排版显脏 | `sharp .trim()` 裁边后再嵌入 |
| 首轮排版拥挤 | 卡片文字撞边 | 渲染后**必须抽帧/出图目检**再交付（沿用 EpicInfographics 的 check→render→review 纪律） |

## 排除的候选（本期评估过）

| 项目 | star | 排除原因 |
|------|------|----------|
| wechat-article/wechat-article-exporter | 13060 | 文章**下载**工具，不产出图文 |
| Anionex/banana-slides | 15746 | 依赖云端 AI 生成 PPT/图片 |
| xpzouying/xiaohongshu-mcp / XHS-Downloader / res-downloader | 1w+ | 采集/发布工具，非创作渲染 |
| white0dew/XiaohongshuSkills / Auto-Redbook-Skills | 3496 / 2357 | 需要登录态发布，且生图走 API |
| iniwap/AIWriteX | 2086 | 全流程依赖 LLM 与生图 API |
| caol64/wenyan | 1071 | macOS 原生 App（SwiftUI + Xcode），Linux 无法实跑 |
| Binaryify/open-kimi-ppt-skill | 1594 | 仓库仅一份 README，无实现 |
| liangdabiao/stem-illustration-skill | 127 | star 偏低，且生图脚本强绑定 API（本项目用 Arena 生图替代） |
| Affitor/affiliate-skills、ythx-101/live-panel-skill | 710 / 707 | 方向不符（联盟营销 / 架构图动画） |
| calesthio/OpenMontage | 67859 | 视频生产管线，且大量环节需要 Pexels/fal.ai 等 API Key |

## 一句话结论

**可实跑的组合**：AntV Infographic（信息图引擎）+ html-anything（卡片/杂志模板）+ EpicInfographics（工作室级长图与动图）+ medical-illustration（严谨科普图）
**配图方式**：Arena 生图负责画面，代码负责版式；二者通过文件资产解耦。

---

## 归档说明（2026-10-14）

本目录是「AI 科普图文 · 纯代码渲染」那一轮次的完整现场，已归档、不再改动：

- `projects/` 5 个当时 vendor 进来的上游项目：antv-infographic / html-anything / epic-infographics / medical-illustration / md2wechat-skill
- `runs/` 当时 6 个 run 的脚本与成品：信息图、HTML 长图、动图、医学插画、MD→微信排版

后续轮次（当前主线）在仓库根目录 `projects/` 与 `runs/`。
其中「本地渲染生图服务替换图像 API」那条路线（`archive/localimage/`）已被用户判定不合格，仅作留存。
