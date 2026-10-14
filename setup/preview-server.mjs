/**
 * setup/preview-server.mjs —— 本地预览服务器（画廊 + 可交互的浏览器工具）
 *
 *   node setup/preview-server.mjs [--port 8099]
 *
 * 路由：
 *   /                      → 仓库根（README 等），默认跳到 /runs/gallery.html
 *   /runs/...              → 实跑产物与画廊
 *   /app/xhs-textcard/...  → XHS-TextCard 编辑器（纯前端，可自己改字看效果）
 *   /app/article-cards/... → 小红书轮播卡片模板（可直接编辑）
 *   /app/markcard/...      → 反向代理到 MarkCard Studio 的 Vite 开发服务器（默认 5180）
 */
import { createServer, request as httpRequest } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const port = Number((argv[argv.indexOf('--port') + 1] ?? '') || process.env.PORT || 8099);
const MARKCARD = process.env.MARKCARD_URL || 'http://127.0.0.1:5180';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2', '.otf': 'font/otf', '.ttf': 'font/ttf', '.pdf': 'application/pdf',
};

/** /app/xhs-textcard/... → projects/xhs-textcard/... */
const APP_MAP = {
  'xhs-textcard': 'projects/xhs-textcard',
  'article-cards': 'projects/xiaohongshu-article-cards',
  'takumi': 'projects/takumi',
};

function send(res, code, body, headers = {}) {
  res.writeHead(code, { 'cache-control': 'no-store', ...headers });
  res.end(body);
}

async function serveFile(res, filePath) {
  const st = await stat(filePath).catch(() => null);
  if (!st || !st.isFile()) return send(res, 404, 'not found');
  const body = await readFile(filePath);
  return send(res, 200, body, { 'content-type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
}

const server = createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);

    // MarkCard Studio：反向代理到 Vite（浏览器侧永远同源，避免跨域与 localhost 依赖）
    // Vite 的 HMR 与模块请求走绝对路径（/@vite/*、/src/*、/node_modules/*），一并转发
    const isMarkcard = pathname === '/app/markcard' || pathname.startsWith('/app/markcard/');
    const isViteAsset = /^\/(@vite|@id|@fs|src|node_modules|public|__vite_ping)(\/|$)/.test(pathname)
      || /\.[a-z0-9]+$/.test(pathname) && /\.(js|mjs|ts|vue|css|json|map|woff2?|png|jpe?g|svg|gif|webp)$/i.test(pathname)
        && (req.headers.referer ?? '').includes('/app/markcard');
    if (isMarkcard || isViteAsset) {
      const sub = isMarkcard ? (pathname.replace(/^\/app\/markcard/, '') || '/') : pathname;
      const upstream = new URL(sub + (new URL(req.url, 'http://x').search || ''), MARKCARD);
      const proxy = httpRequest(upstream, { method: req.method, headers: { ...req.headers, host: upstream.host } }, (ur) => {
        res.writeHead(ur.statusCode ?? 502, ur.headers);
        ur.pipe(res);
      });
      proxy.on('error', (e) => send(res, 502, `MarkCard 开发服务器未启动（${MARKCARD}）：${e.message}`));
      req.pipe(proxy);
      return;
    }

    if (pathname === '/') return send(res, 302, '', { location: '/runs/gallery.html' });

    // 浏览器工具：静态托管上游前端项目
    const appMatch = pathname.match(/^\/app\/([^/]+)(\/.*)?$/);
    if (appMatch) {
      const base = APP_MAP[appMatch[1]];
      if (!base) return send(res, 404, 'unknown app');
      const rel = appMatch[2] && appMatch[2] !== '/' ? appMatch[2] : '/editor.html';
      const file = path.join(ROOT, base, rel);
      if (!file.startsWith(path.join(ROOT, base))) return send(res, 403, 'forbidden');
      return serveFile(res, file);
    }

    const file = path.join(ROOT, pathname);
    if (!file.startsWith(ROOT)) return send(res, 403, 'forbidden');
    return serveFile(res, file);
  } catch (e) {
    return send(res, 500, String(e));
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`[preview] http://0.0.0.0:${port}/`);
  console.log(`  画廊        /runs/gallery.html`);
  console.log(`  XHS 编辑器  /app/xhs-textcard/editor.html`);
  console.log(`  轮播模板    /app/article-cards/assets/cream-editorial/card-generator.html`);
  console.log(`  MarkCard    /app/markcard/  （反向代理 → ${MARKCARD}）`);
});
