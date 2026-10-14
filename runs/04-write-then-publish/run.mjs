/**
 * Run 04 · 写了就发 Write Then Publish（fxyadela/write-then-publish）
 *
 * 目标：一份 Markdown 正文 → 图文卡片（小红书）+ 公众号长图，两套输出。
 *      纯前端 vanilla JS，本地分页 / 本地 Canvas+html2canvas 出图，无后端。
 *
 * 做法：静态托管仓库 → Chromium 打开 index.html →
 *      1) 往 #contentInput 注入正文并触发 input（等价于用户粘贴内容）；
 *      2) 点「下载」→ downloadAll() 打包 ZIP（内含每页卡片 PNG）；
 *      3) 切到「公众号长文」模式 → 点「下载长图」→ html2canvas 生成长图。
 * 离线适配：原页面从 CDN 取 html2canvas / lucide / supabase，
 *      本仓库已把这几个依赖 vendored 到 src/vendor/ 并改写 index.html（见 projects 说明）。
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { launch, serve, repoRoot } from '../../tools/browser.mjs';

const APP = path.join(repoRoot, 'projects/write-then-publish');
const OUT_DIR = path.join(repoRoot, 'runs/04-write-then-publish/out');
const CONTENT = fs.readFileSync(path.join(repoRoot, 'runs/04-write-then-publish/content.md'), 'utf8');

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const { server, url } = await serve(APP);
const browser = await launch({ width: 1680, height: 1100 });
const page = await browser.newPage();
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message.slice(0, 160)}`));
page.on('dialog', (d) => d.accept().catch(() => {}));

const cdp = await page.createCDPSession();
await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: OUT_DIR }).catch(() => {});
await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: OUT_DIR, eventsEnabled: true }).catch(() => {});

await page.goto(`${url}/index.html`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await new Promise((r) => setTimeout(r, 5000)); // 等字体与首屏渲染

const boot = await page.evaluate(() => ({
  hasEditor: !!document.querySelector('#contentInput'),
  hasJsZip: !!window.JSZip,
  hasHtml2canvas: !!window.html2canvas,
  hasLucide: !!window.lucide,
  mode: document.querySelector('#downloadArticle')?.hidden === false ? 'article' : 'card',
}));

// 0) 内置「说明书」示例项目是只读的、会拦截下载（GUIDE_DOWNLOAD_MESSAGE），
//    所以先点「+ 新建」建一个自己的项目，再往里灌内容。
await page.evaluate(() => document.querySelector('#newProjectBtn')?.click());
await new Promise((r) => setTimeout(r, 2500));
const afterNew = await page.evaluate(() => document.querySelector('#status')?.textContent?.slice(0, 80));

// 1) 注入正文
await page.evaluate((text) => {
  const ta = document.querySelector('#contentInput');
  ta.value = text;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}, CONTENT);
await new Promise((r) => setTimeout(r, 6000)); // 等分页 + 卡片渲染

const afterInput = await page.evaluate(() => {
  const cards = document.querySelectorAll('.card-canvas, canvas');
  return {
    canvases: cards.length,
    cardSizes: [...cards].slice(0, 4).map((c) => `${c.width}x${c.height}`),
    status: document.querySelector('#status')?.textContent?.slice(0, 80),
  };
});

// 2) 图文卡片：downloadAll() → ZIP
const beforeZip = new Set(fs.readdirSync(OUT_DIR));
await page.evaluate(async () => { await downloadAll(); });
let waited = 0;
while (waited < 90000) {
  await new Promise((r) => setTimeout(r, 1000));
  waited += 1000;
  const files = fs.readdirSync(OUT_DIR);
  if (files.some((f) => /\.zip$/i.test(f) && !beforeZip.has(f)) && !files.some((f) => f.endsWith('.crdownload'))) break;
}
const zipName = fs.readdirSync(OUT_DIR).find((f) => /\.zip$/i.test(f) && !beforeZip.has(f));

// 解 ZIP 里的 PNG（自己解，避免依赖额外包）
const unzipPngs = (zipPath, destDir) => {
  const buf = fs.readFileSync(zipPath);
  fs.mkdirSync(destDir, { recursive: true });
  const out = [];
  for (let i = 0; i < buf.length - 4; i++) {
    if (buf.readUInt32LE(i) !== 0x04034b50) continue; // local file header
    const method = buf.readUInt16LE(i + 8);
    const compSize = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26);
    const extraLen = buf.readUInt16LE(i + 28);
    const name = buf.subarray(i + 30, i + 30 + nameLen).toString('utf8');
    const dataStart = i + 30 + nameLen + extraLen;
    if (!compSize || dataStart + compSize > buf.length) continue;
    const data = buf.subarray(dataStart, dataStart + compSize);
    if (!/\.(png|jpe?g)$/i.test(name)) { i = dataStart + compSize - 1; continue; }
    try {
      const content = method === 8 ? zlib.inflateRawSync(data) : data;
      const rel = name.split('/').pop();
      const file = path.join(destDir, rel);
      fs.writeFileSync(file, content);
      out.push(rel);
    } catch { /* 跳过异常条目 */ }
    i = dataStart + compSize - 1;
  }
  return out;
};

const zipInfo = zipName ? { zip: zipName, bytes: fs.statSync(path.join(OUT_DIR, zipName)).size } : null;
const cardImages = zipName ? unzipPngs(path.join(OUT_DIR, zipName), path.join(OUT_DIR, 'cards')) : [];

// 3) 公众号长图：切 article 模式后点下载长图
await page.evaluate(() => document.querySelector('#convertMode')?.click());
await new Promise((r) => setTimeout(r, 6000));
const beforeArticle = new Set(fs.readdirSync(OUT_DIR));
await page.evaluate(async () => {
  // 长图默认按侧栏预览宽度（~518px）截图，太窄不适合公众号；
  // 把预览文章本身加宽到 750px（公众号正文常用宽度），再走它的导出流程。
  // 注意：downloadArticleImage() 内部会重新 renderArticlePreview() 重建 DOM，
  // 所以行内样式会被丢掉，必须用 <style> 覆盖它自己的预览宽度。
  const st = document.createElement('style');
  st.textContent = '.pages.article-mode .article-preview{width:750px!important;max-width:750px!important}';
  document.head.appendChild(st);
  await downloadArticleImage();
});
waited = 0;
while (waited < 120000) {
  await new Promise((r) => setTimeout(r, 1500));
  waited += 1500;
  const files = fs.readdirSync(OUT_DIR).filter((f) => !f.endsWith('.crdownload'));
  if (files.some((f) => /\.(png|zip)$/i.test(f) && !beforeArticle.has(f))) break;
}
const articleFiles = fs.readdirSync(OUT_DIR).filter((f) => !beforeArticle.has(f) && !f.endsWith('.crdownload'));

const dims = (file) => {
  try {
    const b = fs.readFileSync(file);
    if (b.subarray(1, 4).toString() !== 'PNG') return {};
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), bytes: b.length };
  } catch { return {}; }
};

await browser.close();
server.close();

console.log(JSON.stringify({
  boot, afterNew, afterInput, zipInfo,
  cardCount: cardImages.length,
  cards: cardImages.slice(0, 12).map((f) => ({ f, ...dims(path.join(OUT_DIR, 'cards', f)) })),
  articleFiles: articleFiles.map((f) => ({ f, ...dims(path.join(OUT_DIR, f)) })),
  problems: [...new Set(problems)].slice(0, 6),
}, null, 2));
