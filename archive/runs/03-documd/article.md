---
title: 大模型为什么会「一本正经地胡说八道」
author: AI 科普图鉴
---

# 大模型为什么会「一本正经地胡说八道」

模型不是数据库，它是一台**下一个词的概率机器**。它优化的是「说得像」，不是「说得对」。
所以当一条事实不在它的记忆里时，它不会停下来，而是用最顺的语言把空位填满——这就是幻觉。

## 幻觉是怎么发生的

```infographic
infographic sequence-steps-simple
theme
  colorPrimary #3b82f6
  colorBg #0f172a
  palette
    - #3b82f6
    - #34d399
    - #fbbf24
    - #a78bfa
    - #f472b6
    - #22d3ee
    - #94a3b8
    - #fb923c
data
  title 一次幻觉的四步生成过程
  desc 模型没有「不知道」这个输出档位
  sequences
    - label 问了个记忆里没有的事
      desc 训练数据里根本没有
    - label 照样开始生成下一个词
      desc 目标是「像人话」
    - label 顺滑语言补上空位
      desc 格式对，内容是编的
    - label 你很难第一时间分辨
      desc 没有引用，没有置信度
```

## 幻觉的三种长相

```infographic
infographic hierarchy-tree
theme
  colorPrimary #3b82f6
  colorBg #0f172a
data
  title 幻觉的三种长相
  desc 同一个根因，三种不同的表现
  root
    label 模型没有「不知道」
    children
      - label 编造不存在的事实
        desc 数字、日期、人名最容易被编
      - label 张冠李戴
        desc 把 A 的说法安到 B 头上
      - label 过度自信
        desc 语气笃定，但没有出处
```

## 幻觉率：模型规模与检索的对照

```echarts
{
  "backgroundColor": "#0f172a",
  "textStyle": { "fontFamily": "Noto Sans SC" },
  "color": ["#f472b6", "#34d399"],
  "title": { "text": "同一批问题的错误率（示意）", "left": "center", "textStyle": { "color": "#e2e8f0", "fontSize": 16 } },
  "legend": { "bottom": 6, "textStyle": { "color": "#94a3b8" }, "data": ["闭卷回答", "检索后回答"] },
  "grid": { "left": 64, "right": 32, "top": 62, "bottom": 54 },
  "xAxis": {
    "type": "category",
    "data": ["参数小", "参数中", "参数大"],
    "axisLine": { "lineStyle": { "color": "#334155" } },
    "axisLabel": { "color": "#94a3b8" }
  },
  "yAxis": {
    "type": "value", "max": 60, "name": "错误率 %",
    "nameTextStyle": { "color": "#94a3b8" },
    "axisLabel": { "color": "#94a3b8" },
    "splitLine": { "lineStyle": { "color": "#1e293b" } }
  },
  "series": [
    { "name": "闭卷回答", "type": "bar", "data": [52, 38, 24], "barWidth": 26 },
    { "name": "检索后回答", "type": "bar", "data": [14, 10, 7], "barWidth": 26 }
  ]
}
```

## 三个能立刻上手的动作

```infographic
infographic list-grid-compact-card
theme
  colorPrimary #3b82f6
  colorBg #0f172a
  palette
    - #3b82f6
    - #34d399
    - #fbbf24
    - #a78bfa
    - #f472b6
    - #22d3ee
    - #94a3b8
    - #fb923c
data
  title 给模型装上刹车
  desc 不用改模型，改用法
  lists
    - label 先要依据
      desc 先列原文出处，再总结
    - label 关键事实复核
      desc 数字日期人名回原始来源
    - label 接上检索
      desc 用 RAG 把记忆换成查资料
```
