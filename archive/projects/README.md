# projects/ — 上游项目精简副本

这里是本次实测用到的 5 个开源项目的源码副本。**不是完整 clone**：

- 去掉了几十 MB 的演示截图、hero 图、视频等非必要资源
- 保留：`SKILL.md`、`references/`、`scripts/`、`assets/`（模板）、许可证、README
- 每个项目的 `runs/NN-<name>/README.md` 会说明**实际用了它哪部分**

所有版权归原作者。下面逐条列出来源与许可证。

| 目录 | 上游 | ⭐ | 许可证 | 精简掉了什么 |
|---|---|---|---|---|
| `diagram-design/` | [cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design) @ `1a0b37a` | 53.7k | MIT | `docs/screenshots`、`docs/hero`、`docs/pr-previews`（约 13MB 图片） |
| `baoyu-skills/` | [JimLiu/baoyu-skills](https://github.com/JimLiu/baoyu-skills) @ `1567581` | 26.6k | MIT | 只搬了 6 个技能（见下），其余技能与 16MB `screenshots/` 未搬 |
| `guizang-social-card-skill/` | [op7418/guizang-social-card-skill](https://github.com/op7418/guizang-social-card-skill) @ `cf4b810` | 7.5k | AGPL-3.0 | 无（整仓约 4.4MB，全部保留） |
| `documd-skills/` | [markdown-viewer/skills](https://github.com/markdown-viewer/skills) @ `2672b69` | 3.4k | CC-BY-4.0 | 无（整仓约 4.1MB，全部保留） |
| `qiaomu-info-card-designer/` | [joeseesun/qiaomu-info-card-designer](https://github.com/joeseesun/qiaomu-info-card-designer) @ `0392968` | 272 | MIT | `assets/`（39MB：仓耳今楷 19MB + NotoSerifSC 15MB + profile 6MB） |

### baoyu-skills 保留的技能

搬了 6 个技能。前 3 个是**纯代码渲染**（Run 1 直接用），后 3 个是**图像 API 链路**——
它们在 Run 6 里被接上了本地生图服务：

| 技能 | 作用 | 出图方式 |
|---|---|---|
| `baoyu-diagram` | 手写 SVG 图表（**Run 1** 使用） | 纯代码 |
| `baoyu-markdown-to-html` | Markdown → 带样式的 HTML（含 Mermaid 经 Chrome 转 PNG） | 纯代码 |
| `baoyu-format-markdown` | Markdown 格式化 | 纯代码 |
| `baoyu-image-gen` | **统一图像生成后端**，支持 12 家 provider（**Run 6** 用它的 `--provider openai/google/dashscope`） | 图像 API → **已替换为本地渲染** |
| `baoyu-infographic` | 信息图提示词 / 布局规范（9 种布局家族） | 图像 API（上游） |
| `baoyu-xhs-images` | 小红书图文规范（10 套预设 + 3 套配色 + 元素库） | 图像 API（上游） |

> `baoyu-xhs-images` / `baoyu-infographic` 的 SKILL.md 里有一条硬规则：
> **禁止用 SVG/HTML 顶替光栅图**。所以 Run 6 的替换发生在**后端**（`localimage/`），
> 而不是在技能层——技能代码一行未改。

### 关于缺失的大体积字体

`qiaomu-info-card-designer` 的设计规范指定本地 **仓耳今楷02**（`TsangerJinKai02-W04.ttf`，19MB）。
它体积过大不适合入 Git，且是第三方商业字体。实测时改用系统里的 **Noto Serif SC** 替代——
同为中文衬线，视觉家族一致。若要 1:1 还原，请从上游仓库 `assets/` 目录自行取用。

### AGPL 提示

`guizang-social-card-skill` 使用 **AGPL-3.0**。它要求：如果你修改后作为网络服务提供，
需要向使用者提供源代码。用作本地出图工具不受影响。商业授权说明见其
`COMMERCIAL_LICENSING.md`。
