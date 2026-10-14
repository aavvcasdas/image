/**
 * tools/fill-content.mjs —— 把内容 JSON 填进 card-generator.html 的占位结构（本仓库新增）
 *
 * 上游 xiaohongshu-article-cards 的模板卡片用 [占位符] 描述每页结构，
 * 本脚本按卡片顺序把 data-card-content / data-card-footer 的 innerHTML
 * 替换为真实内容，产出一个可交给 scripts/render_cards.mjs 渲染的 HTML。
 *
 * 用法：
 *   node tools/fill-content.mjs --template assets/cream-editorial/card-generator.html \
 *        --content ../../runs/05-article-cards/content.json --out ../../runs/05-article-cards/cards.html
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };

const tpl = path.resolve(arg('--template'));
const contentPath = path.resolve(arg('--content'));
const outHtml = path.resolve(arg('--out'));
if (!tpl || !contentPath || !outHtml) { console.error('缺少参数'); process.exit(1); }

const { cards } = JSON.parse(await readFile(contentPath, 'utf8'));
const { chromium } = await import('playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/tmp/chromium' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1440 } });
await page.goto(pathToFileURL(tpl).href, { waitUntil: 'networkidle' });

const count = await page.locator('.card').count();
console.log(`[fill] 模板 ${path.basename(tpl)} 共 ${count} 张卡；内容 ${cards.length} 组`);
if (cards.length !== count) console.warn(`  ⚠ 内容组数与模板卡数不一致（${cards.length} vs ${count}）`);

await page.evaluate((cards) => {
  document.querySelectorAll('.card').forEach((card, i) => {
    const spec = cards[i];
    if (!spec) return;
    const content = card.querySelector('[data-card-content]');
    if (content && spec.content) content.innerHTML = spec.content;
    const footer = card.querySelector('[data-card-footer]');
    if (footer && spec.footer) footer.innerHTML = spec.footer;
  });
}, cards);

const html = await page.content();
await writeFile(outHtml, html);
await browser.close();
console.log(`[fill] 已写出 ${outHtml}`);
