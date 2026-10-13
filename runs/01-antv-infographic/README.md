# Run 01 · antvis/Infographic（6990★，MIT，2026-08）

**项目**：AntV 的声明式信息图渲染引擎。用一套缩进式 DSL 描述结构与数据，引擎渲染成高质量 SVG。
~200 个内置模板 + 主题系统，`skills/` 目录里还带 5 个给 AI Agent 用的 skill（本 Run 就是按其 `infographic-creator` / `syntax-creator` 的规范写的语法）。

## 实跑产出

| 文件 | 内容 | 尺寸 |
|------|------|------|
| `01-llm-training.png` | 大语言模型三步训练（预训练 → 指令微调 → 对齐） | 680×211 @2x |
| `02-attention.png` | 注意力机制五步流水线（切词→向量→注意力→汇总→预测） | 1171×531 @2x |
| `03-limits.png` | 能力边界对比（擅长 vs 不擅长，`compare-binary` 模板） | 565×394 @2x |

同名 `.svg` 是矢量产物，便于二次编辑。

## 复现

```bash
bash setup.sh                      # 装 @antv/infographic（会落在仓库根 node_modules）
export LD_LIBRARY_PATH=/tmp/render-env/lib:$LD_LIBRARY_PATH
node render.mjs                    # 渲染全部；DPR=3 node render.mjs 可出更高清
```

## 踩坑（重要）

1. **SSR 只用来探语法，不要用来出图**：`@antv/infographic/ssr` 的 `renderToString()` 用简化 DOM 测量文本，
   中文换行高度算不准 → 卡片内容被裁（本 Run 第一版就是这样，见 git 历史）。浏览器渲染所见即所得。
2. **按 viewBox 自然尺寸 1:1 出图**：引擎算出的内容逻辑尺寸写在 `<svg viewBox>` 里（示例 680×211）；
   给容器设更大的 width/height 只会把内容**拉伸变形**，不会重排。
3. **图标依赖联网**：`icon` 字段会去 `www.weavefox.cn/api/v1/infographic/icon` 取图标，沙箱内失败。
   本 Run 的模板因此避开图标依赖，用配色/形状/图标位承担视觉。
4. 引擎还支持 `illus` 字段（`ResourceConfig{ source:'inline', encoding:'data-uri', data:<base64> }`），
   即可以把外部图片塞进信息图——这是接「模型生图」的官方接口，本 Run 时间盒内未展开。
