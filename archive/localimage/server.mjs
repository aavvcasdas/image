#!/usr/bin/env node
/**
 * server.mjs — 本地生图服务：把「云端图像 API」换成本机渲染
 *
 * 它实现的是 **OpenAI Images API 的线上契约**，所以任何原本调用
 * `https://api.openai.com/v1/images/generations` 的技能/脚本，只要把
 * base_url 指过来，就能在**没有任何 API Key、没有外部网络**的情况下拿到真实 PNG。
 *
 * 支持的端点
 *   POST /v1/images/generations     {model,prompt,size,quality?} → {data:[{b64_json,revised_prompt}]}
 *   POST /v1/images/edits           multipart，参考图当底图 + 文案叠加 → 同上
 *   POST /v1/chat/completions       兼容 OPENAI_IMAGE_USE_CHAT=true 的路径，图片以 data:URI 返回
 *   GET  /v1/models                 列出可用「模型」名（仅供探测）
 *   GET  /health                    健康检查
 *   GET  /                          可视化面板：提交提示词出图 + 历史画廊
 *
 * 启动
 *   bash setup/render-env.sh                       # 首次：准备 Chromium + 中文字体
 *   export LD_LIBRARY_PATH=/tmp/render-env/lib:$LD_LIBRARY_PATH
 *   node localimage/server.mjs --port 7860
 *
 * 接到别的工具上
 *   export OPENAI_BASE_URL=http://127.0.0.1:7860/v1
 *   export OPENAI_API_KEY=local            # 随便填，本地不校验
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateImage, detectTheme, extractCopy, parseSize, THEMES } from './render.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const argOf = (name, def) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : def;
};
const PORT = Number(argOf('port', process.env.PORT || 7860));
const HOST = argOf('host', '0.0.0.0');
const OUT_DIR = path.resolve(argOf('out', path.join(__dirname, '..', 'runs', '06-local-imagegen', 'gallery')));
fs.mkdirSync(OUT_DIR, { recursive: true });

// ─────────────────────────────────────────────── 极简 multipart 解析（/v1/images/edits 用）
function parseMultipart(buf, boundary) {
  const fields = {};
  const files = [];
  const sep = Buffer.from(`--${boundary}`);
  let pos = buf.indexOf(sep);
  while (pos !== -1) {
    const next = buf.indexOf(sep, pos + sep.length);
    if (next === -1) break;
    const part = buf.subarray(pos + sep.length + 2, next - 2); // 跳过 \r\n 与结尾 \r\n
    const headEnd = part.indexOf('\r\n\r\n');
    if (headEnd !== -1) {
      const head = part.subarray(0, headEnd).toString('utf8');
      const body = part.subarray(headEnd + 4);
      const nameM = head.match(/name="([^"]+)"/);
      const fileM = head.match(/filename="([^"]*)"/);
      if (nameM) {
        if (fileM) files.push({ name: nameM[1], filename: fileM[1], data: body });
        else fields[nameM[1]] = body.toString('utf8');
      }
    }
    pos = next;
  }
  return { fields, files };
}

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

const json = (res, code, obj) => {
  const s = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(s) });
  res.end(s);
};

// 生成计数：让同名请求产出连续编号（模拟卡组的 01/02/03…）
let seq = 0;
const history = [];

async function handleGenerate({ prompt, size = '1024x1024', model = 'local-render-1' }, res) {
  seq += 1;
  const px = parseSize(size);
  const slug = `img-${String(seq).padStart(3, '0')}-${px.width}x${px.height}.png`;
  const outFile = path.join(OUT_DIR, slug);

  const { buffer, meta } = await generateImage({ prompt, size, outFile });
  history.unshift({
    file: slug,
    theme: meta.theme,
    title: meta.copy.title,
    subtitle: meta.copy.subtitle,
    bullets: meta.copy.bullets.length,
    size: `${px.width}×${px.height}`,
    ms: meta.ms,
    at: new Date().toISOString(),
  });

  console.log(
    `[gen #${seq}] ${slug}  theme=${meta.theme}  title="${meta.copy.title}"  ${meta.ms}ms  (${(
      buffer.length / 1024
    ).toFixed(0)}KB)`
  );

  return json(res, 200, {
    created: Math.floor(Date.now() / 1000),
    data: [{ b64_json: buffer.toString('base64'), revised_prompt: prompt, model }],
    // 非标准字段，方便本地调试；真实 API 会忽略未知字段
    _local: { file: slug, theme: meta.theme, copy: meta.copy, ms: meta.ms },
  });
}

async function handleEdits(req, res) {
  const ctype = req.headers['content-type'] || '';
  const bm = ctype.match(/boundary=(?:"([^"]+)"|([^;]+))/);
  if (!bm) return json(res, 400, { error: { message: 'expected multipart/form-data' } });
  const buf = await readBody(req);
  const { fields, files } = parseMultipart(buf, (bm[1] || bm[2]).trim());
  const prompt = fields.prompt || '';
  const ref = files[0];

  // 尺寸优先级：调用方显式给了 size 就用它；没给就用参考图的原始尺寸
  const explicitSize = normalizeSize(fields.size);
  const { buildEditHtml, sniffImageSize } = await import('./edit.mjs');
  const detected = ref ? sniffImageSize(ref.data) : null;
  const size = explicitSize || (detected ? `${detected.width}x${detected.height}` : '1024x1024');
  const px = parseSize(size);

  // 参考图当底图铺满，再叠一层文案（见 edit.mjs）
  const mime = /\.jpe?g$/i.test(ref?.filename || '') ? 'image/jpeg'
    : /\.webp$/i.test(ref?.filename || '') ? 'image/webp' : 'image/png';
  const refDataUri = ref
    ? `data:${mime};base64,${ref.data.toString('base64')}`
    : 'data:image/gif;base64,R0lGODlhAQABAAAAACw='; // 1x1 透明占位
  const theme = detectTheme(prompt);

  const html = buildEditHtml({ refDataUri, prompt, size: px, theme: THEMES[theme] });

  const { renderHtmlToPng } = await import('../setup/shot.mjs');
  const dpr = Math.max(px.width, px.height) <= 1536 ? 2 : 1;
  const slug = `edit-${String(++seq).padStart(3, '0')}-${px.width}x${px.height}.png`;
  const outFile = path.join(OUT_DIR, slug);
  await renderHtmlToPng(html, outFile, {
    width: Math.round(px.width / dpr),
    height: Math.round(px.height / dpr),
    dpr,
    selector: '.card',
    settleMs: 150,
  });

  const buffer = fs.readFileSync(outFile);
  const copy = extractCopy(prompt);
  console.log(`[edit #${seq}] ${slug}  refs=${files.length}  theme=${theme}  (${(buffer.length / 1024).toFixed(0)}KB)`);
  history.unshift({
    file: slug, theme, title: copy.title, subtitle: copy.subtitle, bullets: 0,
    size: `${px.width}×${px.height}`, ms: 0, at: new Date().toISOString(), kind: 'edit',
  });
  return json(res, 200, { created: Math.floor(Date.now() / 1000), data: [{ b64_json: buffer.toString('base64') }] });
}

async function handleChat(req, res) {
  const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
  const prompt = body.messages?.map((m) => m.content).join('\n') || '';
  const { buffer, meta } = await generateImage({ prompt, size: '1024x1024' });
  const dataUri = `data:image/png;base64,${buffer.toString('base64')}`;
  return json(res, 200, {
    id: `chatcmpl-local-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: body.model || 'local-render-1',
    choices: [{ index: 0, message: { role: 'assistant', content: `已生成图片：\n\n![image](${dataUri})` }, finish_reason: 'stop' }],
    _local: { theme: meta.theme },
  });
}


// ─────────────────────────────────────────────── 尺寸归一化（各家的写法都不一样）
/** 支持 "1024x1024" / "1024*1024" / "1K" / "2K" / "4K" */
function normalizeSize(v) {
  const s = String(v || '').trim();
  const star = s.match(/^(\d+)\s*[*\u00d7xX]\s*(\d+)$/);
  if (star) return `${star[1]}x${star[2]}`;
  const k = s.toUpperCase();
  if (k === '1K') return '1024x1024';
  if (k === '2K') return '1440x1440';
  if (k === '4K') return '2048x2048';
  return null;
}

// ─────────────────────────────────────────────── Google Gemini 形状
// POST /v1beta/models/<model>:generateContent
// 请求 {contents:[{role,parts:[...]}], generationConfig:{responseModalities,imageConfig:{imageSize}}}
// 响应 {candidates:[{content:{parts:[{inlineData:{data,mimeType}}]}}]}
async function handleGoogle(req, res, modelPath) {
  const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
  const parts = body.contents?.[0]?.parts || [];
  const prompt = parts
    .map((p) => p.text)
    .filter(Boolean)
    .join('\n');
  const size = normalizeSize(body.generationConfig?.imageConfig?.imageSize) || '1024x1024';
  if (!prompt) return json(res, 400, { error: { code: 400, message: 'no text part' } });

  seq += 1;
  const px = parseSize(size);
  const slug = `gemini-${String(seq).padStart(3, '0')}-${px.width}x${px.height}.png`;
  const outFile = path.join(OUT_DIR, slug);
  const { buffer, meta } = await generateImage({ prompt, size, outFile });
  history.unshift({ file: slug, theme: meta.theme, title: meta.copy.title, subtitle: meta.copy.subtitle, bullets: meta.copy.bullets.length, size: `${px.width}×${px.height}`, ms: meta.ms, at: new Date().toISOString(), api: 'gemini' });
  console.log(`[gemini #${seq}] ${slug}  theme=${meta.theme}  ${meta.ms}ms`);

  return json(res, 200, {
    candidates: [
      {
        content: {
          role: 'model',
          parts: [{ inlineData: { mimeType: 'image/png', data: buffer.toString('base64') } }],
        },
        finishReason: 'STOP',
      },
    ],
    modelVersion: modelPath || 'local-render-1',
  });
}

// ─────────────────────────────────────────────── DashScope（通义万相）形状
// POST /api/v1/services/aigc/multimodal-generation/generation
// 请求 {model,input:{messages:[{role,content:[{text}|{image}]}]},parameters:{size,n,watermark}}
// 响应 {output:{choices:[{message:{content:[{image: dataURI}]}}]}}
async function handleDashscope(req, res, origin) {
  const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
  const content = body.input?.messages?.[0]?.content || [];
  const prompt = content
    .map((c) => c.text)
    .filter(Boolean)
    .join('\n');
  const size = normalizeSize(body.parameters?.size) || '1024x1024';
  if (!prompt) return json(res, 400, { code: 'InvalidParameter', message: 'no text content' });

  // 若带了参考图，走编辑路径（当底图铺满 + 文案叠加），与 /v1/images/edits 一致
  const refImg = content.find((c) => c.image)?.image;
  seq += 1;
  const px = parseSize(size);
  const slug = `wanx-${String(seq).padStart(3, '0')}-${px.width}x${px.height}.png`;
  const outFile = path.join(OUT_DIR, slug);

  let buffer;
  let meta;
  if (refImg) {
    const { buildEditHtml } = await import('./edit.mjs');
    const { renderHtmlToPng } = await import('../setup/shot.mjs');
    const html = buildEditHtml({ refDataUri: refImg, prompt, size: px });
    const dpr = Math.max(px.width, px.height) <= 1536 ? 2 : 1;
    await renderHtmlToPng(html, outFile, {
      width: Math.round(px.width / dpr),
      height: Math.round(px.height / dpr),
      dpr,
      selector: '.card',
      settleMs: 150,
    });
    buffer = fs.readFileSync(outFile);
    meta = { theme: detectTheme(prompt), copy: extractCopy(prompt), size: px, ms: 0 };
  } else {
    const r = await generateImage({ prompt, size, outFile });
    buffer = r.buffer;
    meta = r.meta;
  }

  history.unshift({ file: slug, theme: meta.theme, title: meta.copy.title, subtitle: meta.copy.subtitle, bullets: meta.copy.bullets.length, size: `${px.width}×${px.height}`, ms: meta.ms, at: new Date().toISOString(), api: 'dashscope' });
  console.log(`[dashscope #${seq}] ${slug}  theme=${meta.theme}  ref=${!!refImg}  ${meta.ms}ms`);

  return json(res, 200, {
    request_id: `local-${Date.now()}`,
    output: {
      choices: [
        {
          finish_reason: 'stop',
          message: {
            role: 'assistant',
            // 真实 DashScope 返回的是**图片 URL**（24h 有效），这里同样返回 URL，
            // 而不是 data URI —— baoyu-image-gen 的 dashscope provider 直接就这项做
            // `Buffer.from(imageData,'base64')`，塞 data URI 会产出损坏文件。
            content: [{ image: `${origin}/gallery/${slug}` }],
          },
        },
      ],
    },
    usage: { image_count: 1 },
  });
}

// ─────────────────────────────────────────────── 可视化面板
function panelHtml() {
  const rows = history
    .slice(0, 24)
    .map(
      (h) => `<figure class="item">
        <img src="/gallery/${h.file}" loading="lazy" alt="${h.title || ''}">
        <figcaption><b>${h.theme}</b> · ${h.size}${h.ms ? ` · ${h.ms}ms` : ''}<br><span class="t">${
        h.title || h.file
      }</span></figcaption>
      </figure>`
    )
    .join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
  <title>本地生图服务 · 替换云端图像 API</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Noto Sans SC',system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:32px;max-width:1200px;margin:0 auto}
    h1{font-size:28px;font-weight:700;margin-bottom:8px}
    .lede{color:#94a3b8;font-size:14px;line-height:1.7;margin-bottom:24px}
    code{background:#1e293b;padding:2px 6px;border-radius:4px;font-size:13px;color:#7dd3fc}
    form{background:#1e293b;padding:20px;border-radius:10px;display:grid;gap:12px;margin-bottom:28px}
    textarea,input,select{width:100%;background:#0f172a;border:1px solid #334155;color:#e2e8f0;
      padding:10px 12px;border-radius:6px;font-family:inherit;font-size:14px}
    textarea{min-height:150px;line-height:1.6;resize:vertical}
    .row{display:grid;grid-template-columns:1fr 1fr 160px;gap:12px}
    button{background:#38bdf8;color:#04121a;border:0;padding:12px 20px;border-radius:6px;font-weight:700;
      cursor:pointer;font-size:15px;font-family:inherit}
    button:disabled{opacity:.5;cursor:progress}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
    .item{background:#1e293b;border-radius:8px;overflow:hidden}
    .item img{width:100%;display:block;background:#0b1220}
    figcaption{padding:10px 12px;font-size:12px;color:#94a3b8;line-height:1.5;font-family:ui-monospace,monospace}
    figcaption b{color:#7dd3fc}
    .t{color:#cbd5e1;font-family:'Noto Sans SC',sans-serif}
    .status{font-size:13px;color:#94a3b8;min-height:18px}
    .empty{color:#64748b;font-size:14px;padding:20px 0}
  </style></head><body>
  <h1>本地生图服务</h1>
  <p class="lede">
    实现了 OpenAI Images API 的线上契约（<code>POST /v1/images/generations</code>），但出图不走云端模型，
    而是本机 Chromium 把提示词编译成排版设计图。<br>
    任何原本调图像 API 的技能，只要 <code>OPENAI_BASE_URL=http://127.0.0.1:${PORT}/v1</code> 指过来即可，
    <b>无需 API Key、无需外网</b>。
  </p>
  <form id="f">
    <textarea id="p" placeholder="粘贴提示词。带上这段结构化文案可以精确控制出图文字：
标题：为什么大模型会一本正经胡说八道
副标题：它优化的是「说得像」，不是「说得对」
要点：
- 问了个记忆里没有的事
- 照样开始生成下一个词
- 顺滑的语言补上空位
品牌：AI 科普图鉴"></textarea>
    <div class="row">
      <select id="s">
        <option value="1024x1024">1024×1024 方图</option>
        <option value="768x1024">768×1024 小红书 3:4</option>
        <option value="1024x768">1024×768 横图</option>
        <option value="1024x1536">1024×1536 竖版 2:3</option>
      </select>
      <input id="th" placeholder="风格关键词（留空自动识别）例：杂志风 / neon / 黑板">
      <button id="go" type="submit">生成</button>
    </div>
    <div class="status" id="st"></div>
  </form>
  <h2 style="font-size:16px;margin-bottom:14px;color:#cbd5e1">画廊（本机已生成）</h2>
  <div class="grid" id="g">${rows || '<p class="empty">还没有图，用上面的表单生成一张。</p>'}</div>
  <script>
    const f=document.getElementById('f'),st=document.getElementById('st'),go=document.getElementById('go');
    f.addEventListener('submit',async e=>{
      e.preventDefault(); go.disabled=true; st.textContent='渲染中…';
      const th=document.getElementById('th').value.trim();
      const body={model:'local-render-1',prompt:th?th+'\\n'+document.getElementById('p').value:document.getElementById('p').value,
                  size:document.getElementById('s').value};
      try{
        const r=await fetch('/v1/images/generations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        const j=await r.json();
        if(j.error) throw new Error(j.error.message||'failed');
        st.textContent='完成：'+j._local.file+'  主题='+j._local.theme+'  '+j._local.ms+'ms';
        const fig=document.createElement('figure'); fig.className='item';
        fig.innerHTML='<img src="/gallery/'+j._local.file+'"><figcaption><b>'+j._local.theme+'</b><br><span class="t">'+
          (j._local.copy.title||'')+'</span></figcaption>';
        const g=document.getElementById('g'); if(g.querySelector('.empty')) g.innerHTML=''; g.prepend(fig);
      }catch(err){ st.textContent='出错：'+err.message; }
      finally{ go.disabled=false; }
    });
  </script></body></html>`;
}

// ─────────────────────────────────────────────── 路由
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();

  try {
    if (url.pathname === '/' && req.method === 'GET') {
      const html = panelHtml();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }
    if (url.pathname === '/health') {
      return json(res, 200, { status: 'ok', engine: 'local-chromium-render', port: PORT, generated: seq });
    }
    if (url.pathname === '/v1/models') {
      return json(res, 200, {
        object: 'list',
        data: [{ id: 'local-render-1', object: 'model', owned_by: 'local' }],
      });
    }
    if (url.pathname.startsWith('/gallery/')) {
      const file = path.basename(url.pathname);
      const full = path.join(OUT_DIR, file);
      if (!fs.existsSync(full)) return json(res, 404, { error: { message: 'not found' } });
      const buf = fs.readFileSync(full);
      res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': buf.length, 'Cache-Control': 'no-cache' });
      return res.end(buf);
    }
    if (url.pathname === '/v1/images/generations' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      if (!body.prompt) return json(res, 400, { error: { message: "'prompt' is required" } });
      return handleGenerate(body, res);
    }
    if (url.pathname === '/v1/images/edits' && req.method === 'POST') {
      return handleEdits(req, res);
    }
    if (url.pathname === '/v1/chat/completions' && req.method === 'POST') {
      return handleChat(req, res);
    }
    // Google Gemini：BASE_URL 指向本服务时，路径形如 /v1beta/models/gemini-x:generateContent
    if (req.method === 'POST' && /\/models\/[^/]+:generateContent$/.test(url.pathname)) {
      const m = url.pathname.match(/\/models\/([^/]+):generateContent$/);
      return handleGoogle(req, res, m && m[1]);
    }
    // DashScope（通义万相）
    if (url.pathname === '/api/v1/services/aigc/multimodal-generation/generation' && req.method === 'POST') {
      const origin = `http://${req.headers.host || `127.0.0.1:${PORT}`}`;
      return handleDashscope(req, res, origin);
    }
    if (url.pathname === '/v1/history') {
      return json(res, 200, { object: 'list', data: history });
    }
    return json(res, 404, { error: { message: `unknown endpoint: ${req.method} ${url.pathname}` } });
  } catch (e) {
    console.error('[error]', e);
    if (!res.headersSent) json(res, 500, { error: { message: String(e.message || e) } });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n  本地生图服务已启动`);
  console.log(`  面板      http://localhost:${PORT}/`);
  console.log(`  出图接口  POST http://localhost:${PORT}/v1/images/generations`);
  console.log(`  接入方式  export OPENAI_BASE_URL=http://127.0.0.1:${PORT}/v1`);
  console.log(`  出图目录  ${OUT_DIR}\n`);
});
