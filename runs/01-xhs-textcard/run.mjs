/**
 * Run 01 · XHS-TextCard（geekfoxcharlie/XHS-TextCard）
 *
 * 目标：验证「纯前端 + Canvas 本地渲染 + 零后端/零 API」的小红书图文卡片工具，
 *      能不能在无人值守环境里批量产出 1242×1656 的成品卡片。
 *
 * 做法：起本地静态服务 → Chromium 打开 editor.html（只为拿到它的全局类）→
 *      直接按它自己的调用链渲染：
 *        TemplateManager.loadTemplate(id) → TextSplitter.split(md)
 *        → CanvasRenderer.render({...}) → canvas.toDataURL()
 *      这与页面里 DownloadManager.capture() 完全同一条路径，只是不弹下载框。
 */
import fs from 'node:fs';
import path from 'node:path';
import { launch, serve, writeDataUrl, repoRoot } from '../../tools/browser.mjs';

const APP_DIR = path.join(repoRoot, 'projects/XHS-TextCard');
const OUT_DIR = path.join(repoRoot, 'runs/01-xhs-textcard/out');
const CONTENT = fs.readFileSync(path.join(repoRoot, 'runs/01-xhs-textcard/content.md'), 'utf8');
const TITLE = '低谷期最该做的 5 件事';
// 选 4 个风格差异大的模板，证明模板系统真的在渲染
const TEMPLATES = ['notion-style', 'swiss-studio', 'starry-night', 'elegant-book'];

const { server, url } = await serve(APP_DIR);
const browser = await launch({ width: 1600, height: 1000 });
const page = await browser.newPage();
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.url().slice(0, 70)}`));

await page.goto(`${url}/editor.html`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof CanvasRenderer === 'function' && typeof TextSplitter === 'function', { timeout: 30000 });

const run = await page.evaluate(async ({ text, title, templates }) => {
  const tm = new TemplateManager();
  await tm.init();
  const out = [];
  for (const id of templates) {
    const config = await tm.loadTemplate(id);
    config.showGrid = false;
    config.hasCover = true;
    config.coverTitle = title;
    // 模板自带封面素材（projects/XHS-TextCard/assets/cover-<模板>.jpg），
    // 不填就只会渲染出「请上传封面图片」的空状态。
    config.coverImage = `assets/cover-${id}.jpg`;
    config.hasSignature = true;
    const splitter = new TextSplitter(config, id);
    const pages = await splitter.split(text);
    const renderer = new CanvasRenderer();
    const files = [];
    for (let i = 0; i < pages.length; i++) {
      const canvas = await renderer.render({
        layouts: pages[i], index: i, totalCount: pages.length,
        config, templateId: id,
        width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT,
        scale: OUTPUT_WIDTH / PREVIEW_WIDTH,
      });
      files.push(canvas.toDataURL('image/png'));
    }
    out.push({ template: id, pages: pages.length, files });
  }
  return out;
}, { text: CONTENT, title: TITLE, templates: TEMPLATES });

const summary = [];
for (const t of run) {
  const files = [];
  for (let i = 0; i < t.files.length; i++) {
    const out = path.join(OUT_DIR, `${t.template}-${String(i + 1).padStart(2, '0')}.png`);
    files.push({ file: path.relative(repoRoot, out), ...writeDataUrl(t.files[i], out) });
  }
  summary.push({ template: t.template, pages: t.pages, files });
}

await browser.close();
server.close();
console.log(JSON.stringify({ summary, problems: [...new Set(problems)].slice(0, 6) }, null, 2));
