#!/usr/bin/env node
/**
 * render.mjs — 本地「生图后端」的渲染核心
 *
 * 把一个**提示词**编译成一张**设计好的光栅图**（PNG），全程本地、无网络、无 API。
 *
 * 它替换掉的是「云端扩散模型」这个环节：
 *   - 输入契约与图像模型一致：一段 prompt + size
 *   - 输出契约与图像模型一致：指定像素尺寸的 PNG 字节
 *   - 差别：图画是**确定性的代码排版**产出的，不是采样生成的
 *
 * 编译器做三件事：
 *   1. 从提示词里识别风格关键词 → 选主题（配色 / 字体 / 版式家族）
 *   2. 从提示词里抽取「要上图的文案」→ 标题 / 副标题 / 要点
 *   3. 按主题的版式规则排版，交给 Chromium 渲染成 PNG
 *
 * 提示词里推荐带一段结构化文案块（可选，但最可控）：
 *   标题：为什么大模型会产生幻觉
 *   副标题：一句话讲清
 *   要点：
 *   - 它优化的是「说得像」
 *   - 缺口由语言顺畅度填补
 *   品牌：AI 科普图鉴
 */
import fs from 'node:fs';
import path from 'node:path';
import { renderHtmlToPng } from '../setup/shot.mjs';

// ─────────────────────────────────────────────── 主题表
// family: editorial（浅底衬线/编辑）| bold（深底大字）| soft（浅底圆角）
const THEMES = {
  swiss:       { family: 'editorial', bg: '#fafaf8', panel: '#f0f0ee', ink: '#0a0a0a', muted: '#737373', accent: '#002FA7', accentOn: '#ffffff', serif: false },
  editorial:   { family: 'editorial', bg: '#f5f1e8', panel: '#ece5d6', ink: '#2d3142', muted: '#5a6580', accent: '#bf4520', accentOn: '#ffffff', serif: true  },
  minimal:     { family: 'editorial', bg: '#ffffff', panel: '#f4f4f4', ink: '#111111', muted: '#6b7280', accent: '#111111', accentOn: '#ffffff', serif: false },
  notion:      { family: 'editorial', bg: '#ffffff', panel: '#f7f7f5', ink: '#191919', muted: '#787774', accent: '#2f6f4f', accentOn: '#ffffff', serif: false },
  warm:        { family: 'editorial', bg: '#fbf3ea', panel: '#f3e6d4', ink: '#3a2c22', muted: '#8a7361', accent: '#d97706', accentOn: '#ffffff', serif: true  },
  fresh:       { family: 'soft',      bg: '#f0f7f4', panel: '#e2efe9', ink: '#14342b', muted: '#4f7263', accent: '#2f9e6e', accentOn: '#ffffff', serif: false },
  macaron:     { family: 'soft',      bg: '#fdf2f6', panel: '#f9e3ec', ink: '#3b2b33', muted: '#8c6f7c', accent: '#e86fa4', accentOn: '#ffffff', serif: false },
  cute:        { family: 'soft',      bg: '#fff7ed', panel: '#ffe9d1', ink: '#40301f', muted: '#94795d', accent: '#f97316', accentOn: '#ffffff', serif: false },
  bold:        { family: 'bold',      bg: '#0b0b0d', panel: '#17171b', ink: '#ffffff', muted: '#9ca3af', accent: '#ff3b30', accentOn: '#ffffff', serif: false },
  neon:        { family: 'bold',      bg: '#070b1c', panel: '#101736', ink: '#e6f1ff', muted: '#7d8fc0', accent: '#00e5ff', accentOn: '#04121a', serif: false },
  chalkboard:  { family: 'bold',      bg: '#1f2a26', panel: '#26332e', ink: '#f3f1e7', muted: '#9db1a8', accent: '#ffd166', accentOn: '#1f2a26', serif: true  },
  retro:       { family: 'bold',      bg: '#f3e6cf', panel: '#e6d3b3', ink: '#2b2118', muted: '#7a6650', accent: '#d1462f', accentOn: '#ffffff', serif: true  },
  pop:         { family: 'bold',      bg: '#fff200', panel: '#ffe600', ink: '#16130f', muted: '#5c5540', accent: '#ff2d95', accentOn: '#ffffff', serif: false },
  screenprint: { family: 'bold',      bg: '#101418', panel: '#1b2229', ink: '#f5f5f5', muted: '#8b98a5', accent: '#ff5c39', accentOn: '#ffffff', serif: false },
};

// 关键词 → 主题。中文不能用 \b 边界（JS 的 \b 只认 ASCII 单词），所以中英分开匹配。
const THEME_KEYWORDS = [
  { theme: 'neon',        ascii: ['neon', 'cyberpunk', 'glow', 'synthwave'],            cjk: ['赛博', '霓虹', '荧光', '电子感'] },
  { theme: 'chalkboard',  ascii: ['chalk', 'chalkboard', 'blackboard'],                 cjk: ['黑板', '粉笔'] },
  { theme: 'screenprint', ascii: ['screen-print', 'screenprint', 'risograph', 'riso'],   cjk: ['丝网', '孔版'] },
  { theme: 'pop',         ascii: ['pop-art', 'pop art', 'bold-colour', 'vivid'],        cjk: ['波普', '高饱和', '撞色'] },
  { theme: 'retro',       ascii: ['retro', 'vintage', 'film-grain'],                    cjk: ['复古', '胶片', '怀旧'] },
  { theme: 'macaron',     ascii: ['macaron', 'pastel-pink'],                            cjk: ['马卡龙', '粉色', '少女', '粉嫩'] },
  { theme: 'cute',        ascii: ['cute', 'kawaii', 'doodle'],                          cjk: ['可爱', '手绘', '涂鸦'] },
  { theme: 'fresh',       ascii: ['fresh', 'mint', 'nature-clean'],                     cjk: ['清新', '自然', '薄荷', '通透'] },
  { theme: 'notion',      ascii: ['notion'],                                            cjk: ['笔记风', '文档风'] },
  { theme: 'swiss',       ascii: ['swiss', 'helvetica', 'international-style'],         cjk: ['瑞士', '国际主义'] },
  { theme: 'editorial',   ascii: ['magazine', 'editorial', 'masthead'],                 cjk: ['杂志', '编辑风', '编辑质感', '刊物'] },
  { theme: 'minimal',     ascii: ['minimal', 'minimalist', 'whitespace'],              cjk: ['极简', '性冷淡', '留白'] },
  { theme: 'warm',        ascii: ['warm-tone', 'cream-paper'],                          cjk: ['暖色', '奶油', '米色', '暖调'] },
  { theme: 'bold',        ascii: ['bold', 'loud', 'high-contrast'],                     cjk: ['大字', '冲击力', '强对比', '醒目'] },
];

export function detectTheme(prompt) {
  const p = String(prompt || '');
  for (const k of THEME_KEYWORDS) {
    if (k.cjk.some((w) => p.includes(w))) return k.theme;
    for (const w of k.ascii) {
      if (new RegExp(`\\b${w.replace(/-/g, '[- ]?')}\\b`, 'i').test(p)) return k.theme;
    }
  }
  return 'swiss';
}

// ─────────────────────────────────────────────── 提示词编译

/** "768x1024" → {width,height} */
export function parseSize(size) {
  const m = String(size || '').match(/^(\d+)\s*[xX]\s*(\d+)$/);
  if (m) return { width: parseInt(m[1], 10), height: parseInt(m[2], 10) };
  return { width: 1024, height: 1024 };
}

/** 从提示词里抽取要上图的文案 */
export function extractCopy(prompt) {
  const raw = String(prompt || '');
  const lines = raw.split(/\r?\n/).map((l) => l.trim());

  const pick = (labels) => {
    for (const l of lines) {
      const m = l.match(new RegExp(`^(?:[-*>\\s]*)(${labels.join('|')})\\s*[:：]\\s*(.+)$`, 'i'));
      if (m && m[2]) return m[2].trim().replace(/^["'「“]|["'」”]$/g, '');
    }
    return null;
  };

  let title = pick(['标题', '主标题', 'title', 'headline']);
  let subtitle = pick(['副标题', '小标题', 'subtitle', 'sub', 'desc', '描述']);
  let brand = pick(['品牌', '署名', 'brand', 'by', '出处']);

  // 要点：抓「要点/列表/points」之后连续的 - / * / 数字行
  const bullets = [];
  const bulletStart = lines.findIndex((l) => /^(?:[-*>\s]*)(要点|列表|重点|points|key\s*points|bullets)\s*[:：]?\s*$/i.test(l));
  if (bulletStart >= 0) {
    for (let i = bulletStart + 1; i < lines.length; i++) {
      const l = lines[i];
      if (!l) { if (bullets.length) break; else continue; }
      const m = l.match(/^(?:[-*•]|\d+[.、)]|\d+\s*[·|])\s*(.+)$/);
      if (m) bullets.push(m[1].trim());
      else if (bullets.length && /^[^\s].*[:：]/.test(l)) break;
      else if (bullets.length) break;
    }
  }

  // 没写结构化块 → 从引号 / 短句里猜
  if (!title) {
    const quoted = raw.match(/[「“"]([^」”"]{4,40})[」”"]/);
    if (quoted) title = quoted[1];
  }
  if (!title) {
    const cand = lines
      .filter((l) => l && !/^(?:[-*•#]|\d+[.、)])/.test(l))
      .filter((l) => l.length >= 4 && l.length <= 30)
      .filter((l) => !/^(?:style|palette|scene|mood|风格|配色|画面|构图)\s*[:：]/i.test(l));
    title = cand[0] || 'AI 科普';
  }
  if (!subtitle) {
    const cand = lines
      .filter((l) => l && l !== title && l.length >= 6 && l.length <= 48)
      .filter((l) => !/^(?:style|palette|scene|mood|风格|配色|画面|构图)\s*[:：]/i.test(l))
      .filter((l) => !/^(?:[-*•]|\d+[.、)])/.test(l));
    subtitle = cand[0] || '';
  }

  return {
    title: String(title).slice(0, 60),
    subtitle: String(subtitle || '').slice(0, 90),
    bullets: bullets.slice(0, 5).map((b) => b.slice(0, 60)),
    brand: String(brand || '').slice(0, 40),
  };
}

// ─────────────────────────────────────────────── SVG 装饰
function decorations(theme, t, W, H) {
  if (t.family === 'bold') {
    return `<svg class="deco" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="${t.ink}" stroke-opacity="0.055" stroke-width="1"/>
        </pattern>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${t.accent}" stop-opacity="0.30"/>
          <stop offset="100%" stop-color="${t.accent}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#grid)"/>
      <circle cx="${W * 0.86}" cy="${H * 0.14}" r="${Math.round(W * 0.42)}" fill="url(#glow)"/>
    </svg>`;
  }
  if (t.family === 'soft') {
    return `<svg class="deco" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <circle cx="${W * 0.1}" cy="${H * 0.08}" r="${Math.round(W * 0.3)}" fill="${t.accent}" fill-opacity="0.09"/>
      <circle cx="${W * 0.94}" cy="${H * 0.92}" r="${Math.round(W * 0.34)}" fill="${t.accent}" fill-opacity="0.07"/>
    </svg>`;
  }
  return `<svg class="deco" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <rect x="0" y="0" width="${Math.round(W * 0.006)}" height="${H}" fill="${t.accent}"/>
  </svg>`;
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ─────────────────────────────────────────────── 版式
export function buildHtml({ copy, theme = 'swiss', size = { width: 1024, height: 1024 }, displaySize, index = 1, total = 1 }) {
  const t = THEMES[theme] || THEMES.swiss;
  const { width: W, height: H } = size;
  const portrait = H >= W;
  const base = Math.min(W, H);
  const pad = Math.round(base * (portrait ? 0.075 : 0.065));
  const sans = `'Noto Sans SC','PingFang SC',system-ui,sans-serif`;
  const serif = `'Noto Serif SC','Songti SC',serif`;
  const display = t.serif ? serif : sans;

  // 字号随画布短边缩放，保证不同尺寸下观感一致
  const fs = {
    meta:    Math.round(base * 0.021),
    title:   Math.round(base * (portrait ? 0.105 : 0.115)),
    sub:     Math.round(base * 0.033),
    bullet:  Math.round(base * 0.030),
    brand:   Math.round(base * 0.021),
  };

  const titleLines = String(copy.title || '').length > 12 && portrait;
  const bulletHtml = copy.bullets.length
    ? `<ol class="bullets">${copy.bullets
        .map(
          (b, i) =>
            `<li><span class="idx">${String(i + 1).padStart(2, '0')}</span><span class="txt">${esc(b)}</span></li>`
        )
        .join('')}</ol>`
    : '';

  const shown = displaySize || size;
  const frame = copy.brand || 'AI 科普图鉴';
  const page = total > 1 ? `${String(index).padStart(2, '0')} / ${String(total).padStart(2, '0')}` : '';

  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{width:${W}px;height:${H}px;overflow:hidden}
  .card{
    position:relative;width:${W}px;height:${H}px;background:${t.bg};color:${t.ink};
    padding:${pad}px;display:flex;flex-direction:column;
    font-family:${sans};-webkit-font-smoothing:antialiased;
  }
  .deco{position:absolute;inset:0;width:${W}px;height:${H}px;pointer-events:none}
  .inner{position:relative;z-index:1;display:flex;flex-direction:column;height:100%}
  .meta{
    display:flex;justify-content:space-between;align-items:baseline;
    font-family:ui-monospace,'SF Mono',monospace;font-size:${fs.meta}px;letter-spacing:.18em;
    text-transform:uppercase;color:${t.muted};margin-bottom:${Math.round(base * 0.075)}px;
  }
  h1{
    font-family:${display};font-size:${fs.title}px;line-height:1.16;
    font-weight:${t.family === 'bold' ? 900 : t.serif ? 500 : 700};
    letter-spacing:${t.family === 'bold' ? '-.02em' : '.01em'};
    word-break:break-word;
  }
  ${titleLines ? `h1{font-size:${Math.round(fs.title * 0.82)}px}` : ''}
  .sub{
    font-family:${t.serif ? serif : sans};font-size:${fs.sub}px;line-height:1.55;
    color:${t.muted};margin-top:${Math.round(base * 0.035)}px;max-width:${Math.round(W * 0.82)}px;
  }
  .rule{
    height:${t.family === 'bold' ? 4 : 2}px;background:${t.accent};
    width:${Math.round(W * 0.16)}px;margin:${Math.round(base * 0.055)}px 0 0;
  }
  .bullets{list-style:none;margin-top:${Math.round(base * 0.055)}px;display:flex;flex-direction:column;
           gap:${Math.round(base * 0.028)}px}
  .bullets li{display:flex;gap:${Math.round(base * 0.028)}px;align-items:flex-start}
  .bullets .idx{
    font-family:ui-monospace,'SF Mono',monospace;font-size:${Math.round(fs.bullet * 0.72)}px;
    color:${t.accent};letter-spacing:.06em;padding-top:${Math.round(base * 0.008)}px;flex:none;
  }
  .bullets .txt{font-size:${fs.bullet}px;line-height:1.5;color:${t.family === 'bold' ? t.ink : t.ink}}
  .foot{
    margin-top:auto;display:flex;justify-content:space-between;align-items:baseline;
    border-top:1px solid ${t.family === 'bold' ? 'rgba(255,255,255,.16)' : 'rgba(0,0,0,.14)'};
    padding-top:${Math.round(base * 0.026)}px;
    font-family:ui-monospace,'SF Mono',monospace;font-size:${fs.brand}px;letter-spacing:.14em;color:${t.muted};
  }
  .foot .accent{color:${t.accent}}
  </style></head><body>
  <div class="card">
    ${decorations(theme, t, W, H)}
    <div class="inner">
      <div class="meta"><span>${esc(frame)}</span><span>${page || 'POSTER'}</span></div>
      <h1>${esc(copy.title)}</h1>
      ${copy.subtitle ? `<div class="sub">${esc(copy.subtitle)}</div>` : ''}
      <div class="rule"></div>
      ${bulletHtml}
      <div class="foot"><span class="accent">${esc(theme.toUpperCase())}</span><span>${shown.width} × ${shown.height}</span></div>
    </div>
  </div>
  </body></html>`;
}

// ─────────────────────────────────────────────── 主入口
/**
 * 生成一张图。
 * @returns {Promise<{buffer:Buffer, meta:{theme:string,copy:object,size:object,ms:number}}>}
 */
export async function generateImage({ prompt, size = '1024x1024', index = 1, total = 1, outFile }) {
  const t0 = Date.now();
  const px = parseSize(size);
  const theme = detectTheme(prompt);
  const copy = extractCopy(prompt);

  // 高清策略：按逻辑尺寸排版 + dpr 放大。版式比例是尺寸无关的，
  // 所以最终像素严丝合缝等于请求的 size，不会翻倍。
  const dpr = Math.max(px.width, px.height) <= 1536 ? 2 : 1;
  const logical = { width: Math.round(px.width / dpr), height: Math.round(px.height / dpr) };
  const html = buildHtml({ copy, theme, size: logical, displaySize: px, index, total });

  const tmp = outFile || path.join('/tmp', `localimage-${Date.now()}-${process.pid}.png`);
  await renderHtmlToPng(html, tmp, {
    width: logical.width,
    height: logical.height,
    dpr,
    selector: '.card',
    settleMs: 200,
  });

  const buffer = fs.readFileSync(tmp);
  if (!outFile) fs.rmSync(tmp, { force: true });
  return { buffer, meta: { theme, copy, size: px, ms: Date.now() - t0 } };
}

export { THEMES };
export default generateImage;
