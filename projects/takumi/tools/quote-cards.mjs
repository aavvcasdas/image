/**
 * tools/quote-cards.mjs —— 用 takumi 生成「金句卡」静态图 + 动态封面（本仓库沙箱新增）
 *
 * takumi（3098★）：把 HTML/CSS（或 JSX）直接渲染成 PNG/WebP/GIF，**不需要浏览器**。
 * 这里用它给「AI 鸡汤 / 涨粉图文」做两件事：
 *   1) 一组 1242×1656（3:4 小红书竖版）静态金句卡，可叠加 Arena 生图作为底图；
 *   2) 一张动态封面（GIF / 动画 WebP），用于提升点击率。
 *
 * 用法：
 *   node projects/takumi/tools/quote-cards.mjs \
 *     --content runs/04-takumi/quotes.json \
 *     --out runs/04-takumi --bg-dir runs/assets/arena
 *
 * 依赖：npm i takumi-js（仓库根目录已声明）
 * 字体：默认读 ~/.fonts 下的 Noto Sans SC / Noto Serif SC（沙箱脚本见 archive/setup/render-env.sh）
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { render, renderAnimation } from 'takumi-js';

const HOME = os.homedir();
const FONT_DIR = process.env.FONT_DIR || path.join(HOME, '.fonts');

// ------------------------------------------------------------------ 参数
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const contentPath = path.resolve(arg('--content', 'runs/04-takumi/quotes.json'));
const outDir = path.resolve(arg('--out', 'runs/04-takumi'));
const bgDir = arg('--bg-dir');

// ------------------------------------------------------------------ 字体
const load = async (file) => readFile(path.join(FONT_DIR, file));
const FONTS = [
  { name: 'Noto Sans SC', weight: 400, data: await load('NotoSansSC-Regular.otf') },
  { name: 'Noto Sans SC', weight: 700, data: await load('NotoSansSC-Bold.otf') },
  { name: 'Noto Serif SC', weight: 400, data: await load('NotoSerifSC-Regular.otf') },
  { name: 'Noto Serif SC', weight: 700, data: await load('NotoSerifSC-Bold.otf') },
];

// ------------------------------------------------------------------ 主题
// 每套主题 = 一组 CSS 变量；「底图」型主题会把 Arena 生图铺在下方，文字压在上半部
const THEMES = {
  'warm-paper': { // 暖纸：米白 + 衬线 + 印章式署名
    bg: '#FBF7F0', fg: '#3A2E26', accent: '#B4553C', font: "'Noto Serif SC', serif",
    sub: '#8C7A6B', layout: 'center',
  },
  'night-ink': { // 夜读：深蓝 + 大字
    bg: 'linear-gradient(165deg,#101A2B 0%,#1B2A44 100%)', fg: '#EAF0F8', accent: '#7CC4FF',
    font: "'Noto Sans SC', sans-serif", sub: '#9BB0CB', layout: 'center',
  },
  'photo-bottom': { // 图卡：Arena 生图铺底，文字在上方留白区
    bg: '#FFFFFF', fg: '#2B2B2B', accent: '#C2452D', font: "'Noto Serif SC', serif",
    sub: '#7A6A5C', layout: 'photo-bottom',
  },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** 转义后把换行变成硬换行，中文金句需要精确断行 */
const escLines = (s) => esc(s).replace(/\n/g, '<br/>');

/** 生成一页金句卡的 HTML（宽高与 takumi 渲染尺寸一致由 options 决定） */
function cardHtml({ quote, source, theme, hint }, bgDataUrl) {
  const t = THEMES[theme] ?? THEMES['warm-paper'];
  const isPhoto = t.layout === 'photo-bottom' && bgDataUrl;

  const photo = isPhoto
    ? `<div style="position:absolute;left:0;bottom:0;width:100%;height:58%;overflow:hidden">
         <img src="${bgDataUrl}" style="width:100%;height:100%;object-fit:cover;display:block"/>
       </div>
       <div style="position:absolute;left:0;bottom:0;width:100%;height:58%;
           background:linear-gradient(180deg,rgba(251,247,240,.85) 0%,rgba(251,247,240,0) 26%)"></div>`
    : '';

  const justify = isPhoto ? 'flex-start' : 'center';
  const padTop = isPhoto ? '0px' : '0px';
  const area = isPhoto
    ? 'position:absolute;left:0;top:0;width:100%;height:42%;'
    : 'position:relative;width:100%;height:100%;';

  return `<div style="position:relative;width:100%;height:100%;box-sizing:border-box;
      background:${t.bg};font-family:${t.font};overflow:hidden">
    ${photo}
    <div style="${area}box-sizing:border-box;
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        padding:${isPhoto ? '0' : padTop} 110px;text-align:center">
      ${hint ? `<div style="font-size:26px;letter-spacing:10px;color:${t.accent};margin-bottom:${isPhoto ? '36px' : '56px'};font-weight:700">${esc(hint)}</div>` : ''}
      <div style="font-size:${isPhoto ? '76px' : '72px'};line-height:1.55;font-weight:700;color:${t.fg};letter-spacing:2px">${escLines(quote)}</div>
      ${source ? `<div style="margin-top:${isPhoto ? '40px' : '64px'};font-size:28px;color:${t.sub};letter-spacing:4px">—— ${esc(source)}</div>` : ''}
      ${isPhoto ? '' : `<div style="position:absolute;left:0;bottom:96px;width:100%;display:flex;justify-content:center">
        <div style="width:96px;height:6px;border-radius:3px;background:${t.accent};opacity:.85"></div>
      </div>`}
    </div>
  </div>`;
}

// ------------------------------------------------------------------ 主流程
await mkdir(outDir, { recursive: true });
const content = JSON.parse(await readFile(contentPath, 'utf8'));
const bgFiles = (content.cards || []).map((c) => c.bg).filter(Boolean);

/** 读取底图 → dataURL（takumi 的 images 选项用原始字节，这里用 dataURL 直接内联） */
async function bgDataUrl(name) {
  if (!name || !bgDir) return null;
  const p = path.resolve(bgDir, name);
  if (!existsSync(p)) { console.warn(`  ⚠ 底图不存在：${p}`); return null; }
  const ext = path.extname(p).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${(await readFile(p)).toString('base64')}`;
}

const W = content.width ?? 1242;
const H = content.height ?? 1656;

let n = 0;
for (const card of content.cards ?? []) {
  const theme = card.theme ?? content.theme ?? 'warm-paper';
  const html = cardHtml({ ...card, theme }, await bgDataUrl(card.bg));
  const png = await render(html, { width: W, height: H, fonts: FONTS, devicePixelRatio: 1 });
  const name = `${String(++n).padStart(2, '0')}-${card.slug ?? theme}.png`;
  await writeFile(path.join(outDir, name), png);
  console.log(`  ✔ ${name}  ${(png.length / 1024).toFixed(0)} KB  ${W}×${H}`);
}

// ------------------------------------------------------ 动态封面（GIF / WebP）
if (content.animation) {
  const a = content.animation;
  const theme = THEMES[a.theme ?? 'warm-paper'];
  const frames = (a.lines ?? [a.quote]).filter(Boolean);
  const scenes = frames.map((line, i) => ({
    node: `<div style="width:100%;height:100%;display:flex;flex-direction:column;
        align-items:center;justify-content:center;background:${theme.bg};
        font-family:${theme.font};padding:0 110px;text-align:center">
        <div style="font-size:34px;letter-spacing:12px;color:${theme.accent};font-weight:700;margin-bottom:52px">${esc(a.hint ?? '')}</div>
        <div style="font-size:76px;line-height:1.6;font-weight:700;color:${theme.fg}">${escLines(line)}</div>
      </div>`,
    durationMs: a.sceneMs ?? 1400,
  }));
  const anim = await renderAnimation({
    scenes, width: W, height: H, fps: a.fps ?? 20,
    format: a.format ?? 'gif', fonts: FONTS,
  });
  const ext = a.format === 'webp' ? 'webp' : a.format === 'apng' ? 'png' : 'gif';
  const name = `cover-animated.${ext}`;
  await writeFile(path.join(outDir, name), anim);
  console.log(`  ✔ ${name}  ${(anim.length / 1024).toFixed(0)} KB  ${scenes.length} 幕/${(a.sceneMs ?? 1400)}ms`);
}

console.log(`[takumi] 完成 → ${outDir}`);
