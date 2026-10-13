# Run 1 · baoyu-diagram

**上游**：[JimLiu/baoyu-skills](https://github.com/JimLiu/baoyu-skills) · 26.6k ⭐ · 最近提交 2026-09-10 · MIT

## 用了它什么

| 用到的 | 位置 |
|---|---|
| 视觉设计系统（色板 / 字号 / 网格 / 层级顺序 / 间距规则） | `skills/baoyu-diagram/SKILL.md` |
| SVG → PNG 转换脚本（**源码零改动**，用 `tsx` 执行 TS） | `skills/baoyu-diagram/scripts/main.ts` |

## 产出

| 文件 | 说明 |
|---|---|
| `rag.svg` | 手写源文件，viewBox 1170×560 |
| `rag@2x.png` | 2340×1120，由项目自带脚本经 sharp/librsvg 渲染 |

## 项目规范里被实际执行的点

- 底色 `#0f172a` + 40px 网格 pattern
- 语义色板：cyan `#22d3ee`（输入）/ emerald `#34d399`（处理）/ violet `#a78bfa`（存储）/ amber `#fbbf24`（拼装）/ blue `#60a5fa`（生成）
- 绘制顺序：背景 → 区域虚线 → 连线 → **不透明遮罩** → 组件 → 文字 → 图例 → 标题
  （遮罩层是关键：半透明填充挡不住箭头，必须先用 `fill="#0f172a"` 的实心矩形盖一遍）
- 组件框 80px 高、水平间距 30px+、viewBox 四周留 30px
- 标题块在左上、图例在底部且距最低元素 20px 以上

## 复现

```bash
cd projects/baoyu-skills/skills/baoyu-diagram
npx -y tsx scripts/main.ts ../../../../runs/01-baoyu-diagram/rag.svg \
  -o ../../../../runs/01-baoyu-diagram/rag@2x.png --json
```

## 坑

1. 规范里推荐的 `JetBrains Mono` 在沙箱不存在，Web 字体也拉不到 → 字体栈写
   `'JetBrains Mono', 'Noto Sans SC', monospace`，中文由 Noto Sans SC 兜底，等宽感由 monospace 兜底。
2. sharp 渲染 SVG 走的是 **librsvg + fontconfig**（不是浏览器），没有 CSS 继承和外部字体。
   已连接的字体名必须真实存在，`@import` 无效。
3. 上游这一条线是「手写 SVG 而不是套模板」，所以**中文文案要自己控制换行**——
   用 `text-anchor` 与显式坐标，别依赖自动折行（SVG 没有自动折行）。
