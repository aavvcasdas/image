# 收录项目（vendored）

本目录是本期收录项目的**源码快照**（剥离 `.git`、`node_modules` 与体积大的示例/文档目录），
便于在没有外网的环境里复现各 Run。上游信息与快照对应的 commit 如下：

| 目录 | 上游仓库 | 快照 commit | 许可 | 说明 |
|------|----------|-------------|------|------|
| `antv-infographic/` | [antvis/Infographic](https://github.com/antvis/Infographic) | `2ea1894` | MIT | 声明式信息图引擎；保留 `src/`、`skills/`、`__tests__/`，剥离 `site/` 官网 |
| `html-anything/` | [nexu-io/html-anything](https://github.com/nexu-io/html-anything) | `975fb3b` | Apache-2.0 | agentic HTML 编辑器；保留 `next/`（含 81 份 SKILL.md 模板）、`cli/`，剥离 `docs/`（15M 截图）与 `e2e/` |
| `epic-infographics/` | [OrRon/EpicInfographics](https://github.com/OrRon/EpicInfographics) | `bf97e58` | MIT | 信息图 skill + 工具链；保留 `skills/`（含 check/render/animate 脚本），剥离 examples 里的 png/mp4/gif |
| `medical-illustration/` | [wilbert-MD-PhD/medical-illustration](https://github.com/wilbert-MD-PhD/medical-illustration) | `7e435b1` | MIT（代码）/ CC BY 4.0（内容） | 医学绘图 skill；保留 `plugins/`、`scripts/`，剥离 `docs/`（85M 展示素材） |
| `md2wechat-skill/` | [geekjourneyx/md2wechat-skill](https://github.com/geekjourneyx/md2wechat-skill) | `75b9a48` | 见其 LICENSE | 公众号创作 CLI（Go）；保留全部源码与文档，剥离 `assets/theme-showcase`。**本期未能实跑**，原因见 [runs/06](../runs/06-md2wechat/README.md) |

## 本地改动说明

对 vendor 源码的唯一功能性改动在 `epic-infographics/skills/epic-infographics/scripts/*.mjs`：
把 `playwright` 换成 `playwright-core` 并支持 `CHROME_BIN` 指向本地 Chromium
（沙箱无法下载 playwright 自带浏览器）。改动位置与原因见 [runs/03](../runs/03-epic-infographics/README.md)。

其余目录保持上游原样。
