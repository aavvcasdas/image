#!/usr/bin/env node
/**
 * shot.mjs — 通用「HTML/SVG → PNG」渲染器（纯代码，无任何 API）
 *
 * 用法：
 *   node setup/shot.mjs <input.html> [output.png] [options]
 *
 * 选项：
 *   --width=1080       视口宽（默认按 .card / body 的 CSS 宽度自动探测）
 *   --height=1440      视口高（默认自动撑到内容高度）
 *   --dpr=2            设备像素比（导出 2x 高清图）
 *   --selector=.card   只截图该元素（默认整页）
 *   --selftest         渲染内置测试图，验证环境
 *
 * 环境变量：
 *   RENDER_HOME        渲染环境目录（默认 /tmp/render-env）
 *   LD_LIBRARY_PATH    需包含 $RENDER_HOME/lib（Chromium 的 nss/nspr 依赖）
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const RENDER_HOME = process.env.RENDER_HOME || '/tmp/render-env';
const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args.filter((a) => a.startsWith('--')).map((a) => {
    const [k, v = true] = a.replace(/^--/, '').split('=');
    return [k, v];
  })
);
const positional = args.filter((a) => !a.startsWith('--'));

/** 从 $RENDER_HOME/node_modules 里按包名解析 ESM 入口并 import（不依赖 NODE_PATH） */
async function importFromEnv(pkg) {
  const dir = path.join(RENDER_HOME, 'node_modules', pkg);
  const pj = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const rel =
    (pj.exports && pj.exports['.'] && (pj.exports['.'].import || pj.exports['.'].default)) ||
    pj.module ||
    pj.main ||
    'index.js';
  const { pathToFileURL } = await import('node:url');
  return import(pathToFileURL(path.join(dir, rel)).href);
}

async function loadChromium() {
  const chromium = (await importFromEnv('@sparticuz/chromium')).default;
  const puppeteer = (await importFromEnv('puppeteer-core')).default;
  return { chromium, puppeteer };
}

/** 把 @font-face 内联进 HTML，保证任何环境都能拿到中文字体 */
function inlineFonts(html) {
  const dir = path.join(os.homedir(), '.fonts');
  const faces = [
    ['Noto Sans SC', 400, 'NotoSansSC-Regular.otf'],
    ['Noto Sans SC', 500, 'NotoSansSC-Medium.otf'],
    ['Noto Sans SC', 700, 'NotoSansSC-Bold.otf'],
    ['Noto Sans SC', 900, 'NotoSansSC-Black.otf'],
    ['Noto Sans SC', 300, 'NotoSansSC-Light.otf'],
    ['Noto Serif SC', 400, 'NotoSerifSC-Regular.otf'],
    ['Noto Serif SC', 700, 'NotoSerifSC-Bold.otf'],
  ];
  let css = '';
  for (const [family, weight, file] of faces) {
    const p = path.join(dir, file);
    if (!fs.existsSync(p)) continue;
    css += `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;` +
      `src:url('file://${p}') format('opentype');font-display:block;}\n`;
  }
  if (!css) return html;
  const style = `<style id="__inline_fonts">${css}</style>`;
  return html.includes('</head>') ? html.replace('</head>', style + '</head>') : style + html;
}

const SELFTEST_HTML = `<!doctype html><html><head><meta charset="utf-8"></head>
<body style="margin:0"><div id="card" style="width:900px;padding:60px;background:#0f172a;color:#e8eefc;
  font-family:'Noto Sans SC',sans-serif">
  <div style="font-size:24px;letter-spacing:6px;color:#38bdf8;margin-bottom:20px">AI 科普 · 渲染自检</div>
  <div style="font-size:64px;font-weight:900;line-height:1.2">为什么大模型会「一本正经胡说八道」？</div>
  <div style="font-size:28px;line-height:1.7;color:#9fb3d1;margin-top:24px">
    中文标点、弯引号「测试」、数字 2026、英文 LLM/RAG 混排。</div>
</div></body></html>`;

async function main() {
  const { chromium, puppeteer } = await loadChromium();
  const executablePath = await chromium.executablePath();

  const isSelftest = !!flags.selftest;
  const inFile = isSelftest ? null : positional[0];
  if (!isSelftest && !inFile) {
    console.error('用法: node setup/shot.mjs <input.html> [output.png] [--width=.. --height=.. --dpr=.. --selector=..]');
    process.exit(2);
  }
  const outFile = isSelftest
    ? path.join(RENDER_HOME, 'selftest.png')
    : positional[1] || path.join(path.dirname(inFile), 'shot.png');

  const raw = isSelftest ? SELFTEST_HTML : fs.readFileSync(inFile, 'utf8');
  const html = inlineFonts(raw);

  const browser = await puppeteer.launch({
    args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
    executablePath,
    headless: 'shell',
  });
  try {
    const page = await browser.newPage();
    const dpr = Number(flags.dpr || 2);
    const selector = isSelftest ? '#card' : flags.selector;
    await page.setViewport({
      width: Number(flags.width || 1440),
      height: Number(flags.height || 900),
      deviceScaleFactor: dpr,
    });
    await page.setContent(html, { waitUntil: 'load' });
    // 字体加载完毕再截图，否则中文可能回退成方框
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await new Promise((r) => setTimeout(r, 350));

    let target = page;
    if (selector) {
      const el = await page.$(selector);
      if (!el) throw new Error(`selector not found: ${selector}`);
      target = el;
    }
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    await target.screenshot({ path: outFile });
    const st = fs.statSync(outFile);
    console.log(`✔ ${outFile}  (${(st.size / 1024).toFixed(0)} KB @${dpr}x)`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error('✘ 渲染失败:', e.message);
  if (/libnspr4|error while loading shared libraries/.test(e.message)) {
    console.error('  提示：需要 export LD_LIBRARY_PATH=$RENDER_HOME/lib:$LD_LIBRARY_PATH');
  }
  process.exit(1);
});
