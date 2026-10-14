# Run 02 · XHS-TextCard（107★，MIT，2026-08-11）

上游：https://github.com/geekfoxcharlie/XHS-TextCard —— **纯前端、零后端、零 API Key** 的
小红书文字卡片生成器：Markdown → Canvas 渲染 → 导出 1242×1656（3:4）PNG，含 12 套模板。

## 复现

```bash
bash archive/setup/render-env.sh && bash setup/local-browser.sh
export LD_LIBRARY_PATH=/tmp/render-env/lib:$LD_LIBRARY_PATH
cd projects/XHS-TextCard

# elegant-book / cinematic-film 用 Arena 生图当封面；ios-memo 关掉署名
node tools/render-cards.mjs --md ../../runs/08-xhs-textcard/note.md --template elegant-book \
     --out ../../runs/08-xhs-textcard/elegant-book --cover ../../runs/assets/arena/03-quiet-lake.png --signature "慢下来"
node tools/render-cards.mjs --md ../../runs/08-xhs-textcard/note.md --template cinematic-film \
     --out ../../runs/08-xhs-textcard/cinematic-film --cover ../../runs/assets/arena/04-night-city-window.png --signature "慢下来"
node tools/render-cards.mjs --md ../../runs/08-xhs-textcard/note.md --template ios-memo \
     --out ../../runs/08-xhs-textcard/ios-memo --signature -
```

- `tools/render-cards.mjs`（本项目新增）：起本地静态服务 → 用项目原生类 `TemplateManager` /
  `TextSplitter` / `DownloadManager.capture` 完成「选模板 → 分页 → 高清导出」，**不改上游 JS**。
- `--cover` 把 Arena 生图以 dataURL 注入 `config.coverImage` —— 这就是「API 换成 Arena 生图」的落地方式：
  排版/分页/导出全是代码，只有图片来自 Arena。
- `--signature` 覆盖模板默认署名（原作者署名不适用于我们的内容）。

## 验证要点

- 三套模板均产出 1242×1656 PNG ✅（elegant-book 6 张、cinematic-film 5 张、ios-memo 5 张）
- 封面为 Arena 生图（湖景 / 夜窗）且与下方文字区自然衔接 ✅
- 正文卡保留模板的页眉页脚、页码与排版规则 ✅
