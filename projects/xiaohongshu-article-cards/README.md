# xiaohongshu-article-cards

把长文、网页、文档或纯文本，整理成适合小红书发布的**竖版轮播卡片**，并可生成小红书 / 快手发布文案；文案完成后可选**去 AI 味**与**薯条加热违规预审**。

面向 [Cursor Agent Skills](https://cursor.com/docs)（`SKILL.md` 协议）。

## 功能

- 高保真拆分原文为轮播页结构（先确认结构，再生图）
- 前两页试做确认视觉，再串行或并行生成剩余页面
- 内置**四套**视觉模板 +「自由生成」
- 生成小红书标题 / 正文 / 话题，或快手发布文字 / 话题
- 可选去 AI 味（内置 Humanizer-zh）
- 可选小红书薯条加热规范预审（内置审核流程与规范全文）
- 配套校验与渲染脚本（文案字数、卡片布局、HTML → PNG）

## 工作流程

| 阶段 | 做什么 | 门禁 |
|------|--------|------|
| 1 拆分结构 | 按保真规则拆页，展示每页实际文字 | 用户确认后才能生图 |
| 2 生成图片 | 选模板 → 试做前两页 → 串行或并行出剩余页 | 前两页确认 + 明确选择串行/并行 |
| 3 询问平台 | 是否需要小红书 / 快手 / 双平台文案 | 不需要则结束 |
| 4 生成文案 | 按平台规范生成并跑校验脚本 | — |
| 5 其他功能 | 可选：去 AI 味、违规检测 | 须用户明确选择，默认不执行 |

## 视觉模板

| 模板 | 适用风格 | 画布 | 资源 |
|------|----------|------|------|
| 极简蓝白文档卡 | 极简蓝白、克制文档风、技术说明 | 1024×1536 | `assets/minimal-blue-document/` |
| 奶油信息卡 | 奶油编辑风、粗黑边框、红色胶囊 | 1080×1440 | `assets/cream-editorial/` |
| 黑白科技卡 | 终端 / 开发者工具 / 高对比荧光 | 1080×1440 | `assets/black-tech/` |
| 干净青绿信息卡 | 清爽薄荷绿、浅绿强调、柔和圆角白卡 | 1080×1440 | `assets/clean-teal/` |
| 自由生成 | 不套用具名模板，按内容关系新设计 | 视设计而定 | — |

未指定风格时，Agent 会列出已有模板，并将「自由生成」放在选项最下方。除非用户选定，不得擅自采用具名模板。

## 安装（Cursor）

1. 将本仓库克隆或下载到本机 skills 目录，例如：

   ```text
   ~/.cursor/skills/xiaohongshu-article-cards/
   ```

   Windows 示例：

   ```text
   %USERPROFILE%\.cursor\skills\xiaohongshu-article-cards\
   ```

2. 确认目录内含有 `SKILL.md`。
3. 在 Cursor 对话中直接说明需求即可触发，例如：
   - 「把这篇文章做成小红书轮播卡片」
   - 「用干净青绿风格做卡片」
   - 「生成小红书标题正文和话题」

渲染卡片 PNG 时需要 Node.js，以及 Agent 按 `scripts/render_cards.mjs` 使用的 Playwright 环境。

## 目录结构

```text
xiaohongshu-article-cards/
├── SKILL.md                          # Agent 主入口：五阶段流程、确认门禁、模板选择规则
├── README.md                         # 仓库说明（本文件）
├── .gitignore                        # 忽略缓存、node_modules、日志等
├── agents/
│   └── openai.yaml                   # Skill 展示名、短描述、默认提示词
├── assets/                           
│   ├── minimal-blue-document/
│   │   └── card-generator.html       # 极简蓝白文档卡：白底 + 单一蓝色强调
│   ├── cream-editorial/
│   │   └── card-generator.html       # 奶油信息卡：奶油纸 + 粗黑框 + 红色胶囊
│   ├── black-tech/
│   │   └── card-generator.html       # 黑白科技卡：近黑底 + 荧光强调 + 终端感
│   └── clean-teal/
│       └── card-generator.html       # 干净青绿卡：浅灰暖白 + 青绿强调 + 圆角白卡
├── references/                     
│   ├── content-fidelity.md           # 阶段 1：拆分规则、原文保真与分页原则
│   ├── image-generation.md           # 阶段 2：生图流程、空白密度、可读性与改版规则
│   ├── visual-semantics.md           # 阶段 2：比较/流程/层级等关系如何选视觉结构
│   ├── multi-agent-generation.md     # 阶段 2：多 Agent 并行生图的拆分、自检与合并
│   ├── minimal-blue-document.md      # 极简蓝白文档卡视觉规范
│   ├── cream-editorial-cards.md      # 奶油信息卡视觉规范
│   ├── black-tech-cards.md           # 黑白科技卡视觉规范
│   ├── clean-teal-cards.md           # 干净青绿信息卡视觉规范
│   ├── xiaohongshu-caption.md        # 阶段 4：小红书标题/正文/话题与校验要求
│   ├── kuaishou-caption.md           # 阶段 4：快手发布文字/话题与校验要求
│   ├── optional-post-caption.md      # 阶段 5：询问话术、作用范围与两项都做的顺序
│   ├── humanizer-zh.md               # 阶段 5：去 AI 味改写指南（全文内置）
│   ├── review-xiaohongshu-shutiao.md # 阶段 5：薯条加热违规预审流程与输出格式
│   └── 薯条内容加热规范.md            # 阶段 5：预审所依据的规范全文
└── scripts/                        
    ├── render_cards.mjs              # 将含 .card 的 HTML 逐张导出为 PNG（Playwright）
    ├── check_card_layout.mjs         # 检查卡片溢出、裁切、重叠、异常空白等布局问题
    ├── check_xhs_copy.py             # 校验小红书标题长度、正文字数、话题数与必留链接
    ├── check_kuaishou_copy.py        # 校验快手发布文字字数与话题数量
    └── check_source_coverage.py      # 检查必留原文是否出现在卡片 HTML/文本中
```

## 交付物

同一任务中，轮播图与文案放在**同一文件夹**：

- 卡片图片：由渲染脚本导出的 PNG
- `xiaohongshu-caption.txt`：小红书标题、正文、话题
- `kuaishou-caption.txt`：快手发布文字与话题

## 注意事项

- **结构优先于模板**：不得让模板反向决定信息结构或删减材料中的独立信息。
- **阶段 5 为可选**：去 AI 味与违规检测不会在阶段 1–4 默认执行。
- **违规预审免责**：审核依据所附《薯条内容加热规范》，仅作发布前参考，**不代替**小红书平台最终审核结果；不提供规避禁投品类的写法。
- 卡片例行验收使用本 skill 自带脚本与清单；仅在用户明确要求时才使用外部 `layout-qa`。

## 致谢

- 去 AI 味能力参考 [Humanizer](https://github.com/blader/humanizer) / 中文改编，模式依据 [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)。
- 违规检测流程与规范文本来自小红书薯条内容加热相关公开规则整理，仅供预审参考。

## License

若仓库未另附许可证文件，使用前请自行补充 LICENSE；规范原文与平台规则的权利归属各自权利方。
