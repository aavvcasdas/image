#!/usr/bin/env node
/**
 * shoot.mjs — 把一个 HTML 页面里的每个「卡片元素」分别截成高清 PNG
 * （archive/setup/shot.mjs 只截第一个匹配元素；这里要的是多张联排卡片逐张出图）
 *
 * 用法：
 *   node shoot.mjs <page.html> <selector> <outDir> [前缀]
 * 例：
 *   node shoot.mjs cards.html .card out card
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadChromium } from '../../archive/setup/shot.mjs';

const [file, selector, outDir, prefix = 'card'] = process.argv.slice(2);
if (!file || !selector || !outDir) {
  console.error('用法: node shoot.mjs <page.html> <selector> <outDir> [prefix]');
  process.exit(2);
}

const DPR = Number(process.env.DPR || 2);
const { chromium, puppeteer } = await loadChromium();
const browser = await puppeteer.launch({
  args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files'],
  executablePath: await chromium.executablePath(),
  headless: 'shell',
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 1000, deviceScaleFactor: DPR });
await page.goto(`file://${path.resolve(file)}`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 400));

const els = await page.$$(selector);
if (!els.length) throw new Error(`没找到元素: ${selector}`);
fs.mkdirSync(outDir, { recursive: true });

let i = 0;
for (const el of els) {
  i += 1;
  const box = await el.boundingBox();
  const out = path.join(outDir, `${prefix}-${String(i).padStart(2, '0')}.png`);
  await el.screenshot({ path: out });
  console.log(`✅ ${path.basename(out)}  ${Math.round(box.width)}×${Math.round(box.height)} @${DPR}x`);
}
console.log(`共 ${i} 张 → ${outDir}`);
await browser.close();
