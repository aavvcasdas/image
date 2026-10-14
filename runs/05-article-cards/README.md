# Run 05 · xiaohongshu-article-cards（37★，2026-07-23）

上游：https://github.com/qianjiazheng2023/xiaohongshu-article-cards —— Skill + 4 套卡片模板
（cream-editorial / minimal-blue-document / clean-teal / black-tech），自带渲染脚本与布局检查脚本。

## 复现

```bash
bash setup/local-browser.sh && export LD_LIBRARY_PATH=/tmp/render-env/lib:$LD_LIBRARY_PATH
cd projects/xiaohongshu-article-cards

# 1) 把内容 JSON 填进模板占位结构（本项目新增的驱动）
node tools/fill-content.mjs --template assets/cream-editorial/card-generator.html \
     --content ../../runs/05-article-cards/content.json --out ../../runs/05-article-cards/cream-editorial.html
# 2) 用上游渲染脚本出图（沙箱里只要给出 CHROME_PATH）
CHROME_PATH=/tmp/chromium node scripts/render_cards.mjs \
     ../../runs/05-article-cards/cream-editorial.html ../../runs/05-article-cards/cream-editorial cream
```

- 模板共 6 张卡，结构各不相同：分级表（tier-list）、信息清单、4 步时间轴、排名板、对照截图面板、检查清单 + 总结条。
- 输出 1080×1440 PNG；上游脚本会先清掉同名旧图再截图，便于重复回归。

## 验证要点

- 6 张卡全部产出，结构（表格/时间轴/评分环）保留完整 ✅
- 内容刻意做成「信息型鸡汤」：有清单、有步骤、有评分、有发布前检查——属于容易被收藏/转发的类型。
