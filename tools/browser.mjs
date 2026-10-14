/**
 * tools/browser.mjs — 本仓库「视频/图文渲染实测」共用的浏览器驱动层。
 *
 * 沙箱里没有系统浏览器，也没有 libnspr4/libnss3 这些库，所以：
 *   1) Chromium 来自 @sparticuz/chromium（解包到 /tmp/chromium）；
 *   2) 依赖库来自 @achingbrain/nss + chrome-aws-lambda，解包到 /tmp/render-env/lib，
 *      运行前必须 export LD_LIBRARY_PATH=/tmp/render-env/lib。
 *   3) 驱动用 puppeteer-core（不下载自带浏览器）。
 *
 * 首次使用（或沙箱重建后）执行：bash archive/setup/render-env.sh
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const RENDER_HOME = process.env.RENDER_HOME || '/tmp/render-env';
const CHROMIUM = process.env.CHROME_BIN || '/tmp/chromium';

export function ensureLibPath() {
  const lib = path.join(RENDER_HOME, 'lib');
  if (!process.env.LD_LIBRARY_PATH?.includes(lib)) {
    process.env.LD_LIBRARY_PATH = `${lib}:${process.env.LD_LIBRARY_PATH || ''}`;
  }
}

export async function launch({ width = 1440, height = 900, dpr = 1 } = {}) {
  ensureLibPath();
  const require = createRequire(path.join(RENDER_HOME, 'noop.cjs'));
  const puppeteer = require('puppeteer-core');
  return puppeteer.launch({
    executablePath: CHROMIUM,
    headless: true,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--allow-file-access-from-files', '--font-render-hinting=none',
      '--force-color-profile=srgb', '--hide-scrollbars',
    ],
    defaultViewport: { width, height, deviceScaleFactor: dpr },
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};

/** 起一个静态文件服务（给那些必须走 http 协议才能 fetch 资源的前端项目用）。 */
export function serve(root, { port = 0 } = {}) {
  const rootAbs = path.resolve(root);
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(rootAbs, rel);
    if (!file.startsWith(rootAbs) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end('not found'); return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port, url: `http://127.0.0.1:${server.address().port}` }));
  });
}

/** dataURL → 文件 */
export function writeDataUrl(dataUrl, outFile) {
  const [meta, b64] = dataUrl.split(',');
  const buf = Buffer.from(b64, 'base64');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, buf);
  return { bytes: buf.length, mime: meta.match(/data:([^;]+)/)?.[1] };
}

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
