#!/usr/bin/env node
/**
 * tools/render-cards.mjs —— XHS-TextCard 的无头渲染驱动（本仓库沙箱新增）
 *
 * 上游 XHS-TextCard 是纯前端项目：浏览器里编辑 Markdown → Canvas 渲染 → 导出 PNG。
 * 本脚本用 Playwright 驱动完全相同的代码路径（editor.html + App/TextSplitter/
 * DownloadManager 的原生方法），把「人工点 3 次」变成一条命令，方便在服务器上
 * 批量出图与回归验证。**没有修改任何上游 JS**，只做驱动。
 *
 * 用法：
 *   LD_LIBRARY_PATH=/tmp/render-env/lib node tools/render-cards.mjs \
 *     --md <markdown 文件> --template <模板 id> --out <输出目录> [--prefix card]
 *
 * 说明：
 *   - 外部 CDN（jsdelivr / cdnjs）在沙箱内不可达，脚本会拦截并返回空响应，
 *     核心排版与导出不依赖这些资源。
 *   - 输出为 OUTPUT_WIDTH×OUTPUT_HEIGHT（1242×1656，3:4）PNG。
 */
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------- 参数解析
const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : def;
};
const mdPath = arg('--md');
const templateId = arg('--template', 'elegant-book');
const outDir = path.resolve(arg('--out', path.join(ROOT, 'output')));
const prefix = arg('--prefix', 'card');
const coverPath = arg('--cover');   // 可选：用外部图片（如 Arena 生图）替换封面视觉
const signature = arg('--signature');  // 可选：署名文字；传 "-" 表示关闭署名
if (!mdPath) {
  console.error('用法: node tools/render-cards.mjs --md <file.md> [--template id] [--out dir] [--cover img]');
  process.exit(1);
}

// ------------------------------------------------------- 1. 静态文件服务
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};
const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(ROOT, urlPath === '/' ? '/editor.html' : urlPath);
    if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
    if (!existsSync(file)) { res.writeHead(404).end('not found'); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch (e) {
    res.writeHead(500).end(String(e));
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

// ------------------------------------------------------------ 2. 驱动浏览器
const { chromium } = await import('playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/tmp/chromium' });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

// 外部 CDN → 空响应，避免沙箱内长时间等待
await page.route('**/*', (route) => {
  const u = route.request().url();
  return u.startsWith(base) ? route.continue() : route.fulfill({ status: 200, body: '' });
});
page.on('pageerror', (e) => console.warn('  [page error]', String(e).split('\n')[0]));

const markdown = await readFile(path.resolve(mdPath), 'utf8');
console.log(`[render] 模板=${templateId}  Markdown=${mdPath} (${markdown.length} 字)`);

// 可选：把封面换成外部图片（Arena 生图），走项目原生 coverImage 配置字段
let coverDataUrl = null;
if (coverPath) {
  const ext = path.extname(coverPath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  coverDataUrl = `data:${mime};base64,${(await readFile(path.resolve(coverPath))).toString('base64')}`;
}

await page.goto(`${base}/editor.html`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof TemplateManager !== 'undefined' && typeof TextSplitter !== 'undefined',
  null, { timeout: 30000 });

// 用项目原生类完成「选模板 → 分页 → 高清导出」，等价于 UI 内部调用的同一条代码路径
// （TextSplitter 分页 + CanvasRenderer 绘制 + DownloadManager.capture 导出）
const pages = await page.evaluate(async ({ md, tid, cover, sig }) => {
  const tm = new TemplateManager();
  const tpl = await tm.loadTemplate(tid);
  if (!tpl) throw new Error(`模板不存在: ${tid}`);
  const cfg = JSON.parse(JSON.stringify(tpl.config));
  if (cover) cfg.coverImage = cover;
  // 署名/水印是本项目默认的，做自己的内容时按需替换或关闭
  if (sig === '-') { cfg.hasSignature = false; cfg.hasWatermark = false; }
  else if (sig) { cfg.signatureText = sig; cfg.hasSignature = true; cfg.hasWatermark = false; }

  const splitter = new TextSplitter(cfg, tid);
  const result = await splitter.split(md);

  window.__render = { cfg, tid, pages: result, dm: new DownloadManager() };
  return result.length;
}, { md: markdown, tid: templateId, cover: coverDataUrl, sig: signature ?? null });

console.log(`[render] 分页数 = ${pages}`);
if (coverDataUrl) console.log(`[render] 封面已替换为 ${path.basename(coverPath)}（Arena 生图，dataURL 注入）`);
await mkdir(outDir, { recursive: true });

const dataUrls = await page.evaluate(async () => {
  const { cfg, tid, pages, dm } = window.__render;
  const out = [];
  for (let i = 0; i < pages.length; i++) {
    out.push(await dm.capture(pages[i], cfg, tid, i, pages.length));
  }
  return out;
});

for (let i = 0; i < dataUrls.length; i++) {
  const buf = Buffer.from(dataUrls[i].split(',')[1], 'base64');
  const name = `${prefix}_${String(i + 1).padStart(2, '0')}.png`;
  await writeFile(path.join(outDir, name), buf);
  console.log(`  ✔ ${name}  ${(buf.length / 1024).toFixed(0)} KB`);
}

await browser.close();
server.close();
console.log(`[render] 完成 → ${outDir}`);
