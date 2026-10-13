# Run 3 · documd（markdown-viewer/skills）

**上游**：[markdown-viewer/skills](https://github.com/markdown-viewer/skills) · 3.4k ⭐ · 最近提交 2026-10-05 · CC-BY-4.0
**CLI**：`@markdown-viewer/documd` v5.3.2（npm）

## 用了它什么

| 用到的 | 位置 |
|---|---|
| Infographic 引擎语法（113 个模板） | `documd-visuals/engines/infographic.md` |
| 主题与色板契约（`colorPrimary` / `colorBg` / `palette`） | `documd-visuals/styles/palette.md` |
| 引擎路由与铁律（一种引擎一个围栏、数据内联…） | `documd-visuals/SKILL.md` |
| CLI：`--assets` 导出图表、`--format png` 出长图 | npm 包 `@markdown-viewer/documd` |

## 产出

| 文件 | 说明 |
|---|---|
| `article.md` | 一篇完整科普长文，4 个图全部写在 Markdown 围栏里 |
| `figures/article-0{1,2,4}-infographic.png` | Infographic 引擎：`sequence-steps-simple` / `hierarchy-tree` / `list-grid-compact-card` |
| `figures/article-03-echarts.png` | ECharts 引擎：双系列柱状图 |
| `article-full.png` | 整篇长图（`--format png`） |
| `article.html` | 图文一体 HTML |

## 复现

```bash
export LD_LIBRARY_PATH=/tmp/render-env/lib:$LD_LIBRARY_PATH
npx documd runs/03-documd/article.md --assets runs/03-documd/figures --chrome /tmp/chromium
npx documd runs/03-documd/article.md runs/03-documd/article-full.png --format png --png-width 1000 --chrome /tmp/chromium
npx documd runs/03-documd/article.md runs/03-documd/article.html --chrome /tmp/chromium
```

## 坑（这一条线坑最多，记下来能省几小时）

1. **必须显式指定 `--chrome /tmp/chromium`**。documd 走 playwright-core，沙箱里没有任何浏览器，
   不指定就会静默失败。
2. **默认皮肤是深色的**。`-t <theme>` 只换文档排版主题，对围栏渲染出的图**没有任何影响**
   （用 `swiss` / `minimal` / `official` 三个主题各跑一遍，PNG 字节数完全相同，可验证）。
3. **背景只能靠 `colorBg`**。DSL 里只接受 `colorPrimary` 和 `colorBg`；
   `colorText`、`colorTextSecondary`、`colorBgElevated`、`colorWhite` 等一律**报语法错误**。
   文字颜色交给引擎，改不了。
4. **`compare-*` 系列对中文不友好**。`compare-binary-horizontal-*-vs`、`compare-hierarchy-row-letter-card-*`、
   `compare-swot` 试了 4 个，全都会把标题首字放大成巨型卡片、并把 `desc` 丢掉。
   → 中文对比关系改用 `hierarchy-tree`（根 + 子节点），效果稳定。
5. **ECharts 里的中文必须声明字体**。加 `"textStyle": { "fontFamily": "Noto Sans SC" }`，
   否则中文标题、图例、轴标签全部渲染成空白。
6. **`list-grid-done-list` 模板的 `desc` 不渲染**（只出图标 + label，长图底部还会被裁）。
   换成 `list-grid-compact-card` 后 label + desc 都正常显示。
7. `sequence-*` 模板在高宽比上会被**裁掉底部**，`desc` 超过一行就看不见了 → 文案要压到一行以内。
8. **ECharts 的 `backgroundColor` 只在「导出图表」路径生效**：导出成独立 PNG 时是深色底（文字清晰），
   但嵌进 `--format png/html` 的整篇渲染时，容器会套用文档主题的白底，而 spec 里的浅色文字
   （`#94a3b8`）留在白底上就发灰。**发布用的独立图表没问题**，整篇长图仅供快速预览。
