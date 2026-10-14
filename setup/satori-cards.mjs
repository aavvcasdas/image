/**
 * setup/satori-cards.mjs —— 用 vercel/satori（14k★）把 HTML/JSX 结构渲染成金句卡
 *
 * satori 负责 布局 → SVG，@resvg/resvg-js 负责 SVG → PNG，全程**不需要浏览器、不调用任何 API**。
 * 需要模型生图时：把 Arena 生图作为 <img> 内联进卡片（见 --bg 参数），文字由代码排版。
 *
 * 用法：
 *   node setup/satori-cards.mjs --content runs/06-satori/quotes.json --out runs/06-satori --bg-dir runs/assets/arena
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const contentPath = path.resolve(arg('--content', 'runs/06-satori/quotes.json'));
const outDir = path.resolve(arg('--out', 'runs/06-satori'));
const bgDir = arg('--bg-dir');
const FONT_DIR = process.env.FONT_DIR || path.join(os.homedir(), '.fonts');

// ------------------------------------------------------------------ 字体
const FONTS = [
  { name: 'Noto Sans SC', weight: 400, file: 'NotoSansSC-Regular.otf' },
  { name: 'Noto Sans SC', weight: 700, file: 'NotoSansSC-Bold.otf' },
  { name: 'Noto Serif SC', weight: 400, file: 'NotoSerifSC-Regular.otf' },
  { name: 'Noto Serif SC', weight: 700, file: 'NotoSerifSC-Bold.otf' },
];
const fonts = await Promise.all(FONTS.map(async (f) => ({
  name: f.name, weight: f.weight, style: 'normal',
  data: await readFile(path.join(FONT_DIR, f.file)),
})));

const THEMES = {
  'ink-paper':  { bg: '#F7F3EC', fg: '#33302B', sub: '#8C857A', accent: '#B4553C', serif: true },
  'deep-night': { bg: '#12161F', fg: '#EDF1F8', sub: '#94A3B8', accent: '#7CC4FF', serif: false },
  'photo-top':  { bg: '#FFFFFF', fg: '#2B2B2B', sub: '#7A6A5C', accent: '#C2452D', serif: true, photo: true },
};

const content = JSON.parse(await readFile(contentPath, 'utf8'));
const W = content.width ?? 1242;
const H = content.height ?? 1656;

const el = (type, style, children, extra = {}) => ({ type, props: { style, children, ...extra } });

async function bgDataUrl(name) {
  if (!name || !bgDir) return null;
  const p = path.resolve(bgDir, name);
  if (!existsSync(p)) return null;
  const ext = path.extname(p).toLowerCase();
  return `data:${ext === '.png' ? 'image/png' : 'image/jpeg'};base64,${(await readFile(p)).toString('base64')}`;
}

await mkdir(outDir, { recursive: true });

let n = 0;
for (const card of content.cards ?? []) {
  const t = THEMES[card.theme ?? content.theme ?? 'ink-paper'];
  const photo = t.photo ? await bgDataUrl(card.bg) : null;

  const textBlock = [
    card.hint ? el('div', {
      fontSize: 26, letterSpacing: 10, color: t.accent, fontWeight: 700, marginBottom: 44,
    }, card.hint) : null,
    el('div', {
      fontSize: 76, lineHeight: 1.55, fontWeight: 700, color: t.fg, textAlign: 'center',
    }, (card.quote ?? '').split('\n').map((line, i) => el('div', { display: 'flex', justifyContent: 'center' }, line + (i < card.quote.split('\n').length - 1 ? '' : '')))),
    card.source ? el('div', { fontSize: 28, color: t.sub, letterSpacing: 4, marginTop: 56 }, `—— ${card.source}`) : null,
    el('div', { width: 96, height: 6, borderRadius: 3, background: t.accent, opacity: 0.85, marginTop: 60 }),
  ].filter(Boolean);

  const children = photo
    ? [
        el('img', { position: 'absolute', top: 0, left: 0, width: '100%', height: '58%', objectFit: 'cover' }, null, { src: photo }),
        el('div', {
          position: 'absolute', top: 0, left: 0, width: '100%', height: '58%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 55%, rgba(255,255,255,0) 100%)',
        }, ''),
        el('div', {
          position: 'absolute', bottom: 0, left: 0, width: '100%', height: '42%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '0 100px', textAlign: 'center',
        }, textBlock),
      ]
    : [el('div', {
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '0 110px', textAlign: 'center',
      }, textBlock)];

  const svg = await satori(
    el('div', {
      width: '100%', height: '100%', display: 'flex', position: 'relative',
      background: t.bg, fontFamily: t.serif ? 'Noto Serif SC' : 'Noto Sans SC',
    }, children),
    { width: W, height: H, fonts },
  );

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
  const name = `${String(++n).padStart(2, '0')}-${card.slug ?? 'card'}.png`;
  await writeFile(path.join(outDir, name), png);
  console.log(`  ✔ ${name}  ${(png.length / 1024).toFixed(0)} KB  ${W}×${H}`);
}
console.log(`[satori] 完成 → ${outDir}`);
