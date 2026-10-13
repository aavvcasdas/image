#!/usr/bin/env node
/**
 * render.mjs — AntV Infographic 语法 → 高清 PNG（纯代码渲染，零 API）
 *
 * 为什么用浏览器而不是 SSR：
 *   SSR(renderToString) 用简化 DOM 测量文本，中文换行高度算不准，
 *   卡片会被裁掉；浏览器里是真实排版测量，所见即所得。
 *   同时浏览器版会用系统里的 Noto Sans SC 渲染中文。
 *
 * 用法：
 *   node render.mjs                 # 渲染本目录所有 *.infographic
 *   node render.mjs 01-llm-training # 只渲染一个
 *   DPR=3 node render.mjs           # 提高像素密度（默认 2）
 *
 * 产物：<name>.png（2x/3x 高清）、<name>.svg（矢量，便于二次编辑）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadChromium } from '../../archive/setup/shot.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DPR = Number(process.env.DPR || 2);

/** 从脚本目录向上找 node_modules 里的引擎 UMD 包（npm 可能把它装在仓库根） */
function resolveUmd() {
  let dir = HERE;
  for (;;) {
    const p = path.join(dir, 'node_modules/@antv/infographic/dist/infographic.min.js');
    if (fs.existsSync(p)) return p;
    const up = path.dirname(dir);
    if (up === dir) throw new Error('找不到 @antv/infographic，请先执行 bash setup.sh');
    dir = up;
  }
}
const UMD = resolveUmd();

const PAGE = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<style>html,body{margin:0;background:#fff;font-family:"Noto Sans SC",sans-serif}#stage{display:inline-block}
#stage svg{display:block}</style></head><body><div id="stage"></div></body></html>`;

async function main() {
  const only = process.argv[2];
  const jobs = fs
    .readdirSync(HERE)
    .filter((f) => f.endsWith('.infographic'))
    .map((f) => f.replace(/\.infographic$/, ''))
    .filter((n) => !only || n === only)
    .sort();
  if (!jobs.length) throw new Error('没有找到 .infographic 文件');

  const { chromium, puppeteer } = await loadChromium();
  const browser = await puppeteer.launch({
    args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    executablePath: await chromium.executablePath(),
    headless: 'shell',
  });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  await page.setContent(PAGE, { waitUntil: 'load' });
  await page.addScriptTag({ path: UMD });
  await page.evaluate(() => document.fonts.ready);

  for (const name of jobs) {
    const syntax = fs.readFileSync(path.join(HERE, `${name}.infographic`), 'utf8');
    // 引擎自己算出的内容逻辑尺寸就在 viewBox 里：按它 1:1 出图才不会变形
    const natural = await page.evaluate((syntax) => {
      const stage = document.getElementById('stage');
      stage.innerHTML = '';
      const inst = new window.AntVInfographic.Infographic({
        container: '#stage',
        width: 1200,
        height: 900,
        editable: false,
      });
      inst.render(syntax);
      const svg = stage.querySelector('svg');
      const [, , w, h] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
      return { w, h };
    }, syntax);

    const shot = await page.evaluate(
      (syntax, w, h) => {
        const stage = document.getElementById('stage');
        stage.innerHTML = '';
        const inst = new window.AntVInfographic.Infographic({
          container: '#stage',
          width: w,
          height: h,
          editable: false,
        });
        inst.render(syntax);
        const svg = stage.querySelector('svg');
        svg.setAttribute('width', String(w));
        svg.setAttribute('height', String(h));
        return svg.outerHTML;
      },
      syntax,
      natural.w,
      natural.h
    );

    fs.writeFileSync(path.join(HERE, `${name}.svg`), shot);
    const el = await page.$('#stage');
    await page.setViewport({ width: natural.w, height: natural.h, deviceScaleFactor: DPR });
    await el.screenshot({ path: path.join(HERE, `${name}.png`) });
    console.log(`✅ ${name}  →  ${natural.w}×${natural.h} @${DPR}x`);
  }
  await browser.close();
}

await main();
