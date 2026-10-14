#!/usr/bin/env node
/**
 * tools/render-cards.mjs —— MarkCard Studio 的无头批量导出驱动（本仓库沙箱新增）
 *
 * MarkCard Studio 是 Vue3 + Vite 的本地优先 Markdown→卡片工具（Tauri 桌面端，
 * 网页端同样可运行）。本脚本用 Playwright 驱动其真实 UI：写入 Markdown →
 * 选主题 → 点「Export PNG set」，把浏览器下载的成套 PNG 收集到输出目录。
 *
 * 用法：
 *   bash ../../setup/local-browser.sh          # 首次：把静态 Chromium 接到 playwright
 *   LD_LIBRARY_PATH=/tmp/render-env/lib node tools/render-cards.mjs \
 *     --md input.md --theme "Swiss Grid" --out output --url http://127.0.0.1:5180
 *
 * 前置：先用 `npm run dev -- --host 0.0.0.0 --port 5180` 起开发服务器。
 */
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };

const mdPath = arg('--md');
const themeName = arg('--theme', 'Swiss Grid');
const outDir = path.resolve(arg('--out', path.join(ROOT, 'output')));
const url = arg('--url', 'http://127.0.0.1:5180');
if (!mdPath) { console.error('用法: node tools/render-cards.mjs --md <file.md> [--theme 名称] [--out dir] [--url ...]'); process.exit(1); }

const markdown = await readFile(path.resolve(mdPath), 'utf8');
const { chromium } = await import('playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/tmp/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1680, height: 1050 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.warn('  [page error]', String(e).split('\n')[0]));

console.log(`[markcard] ${url}  主题="${themeName}"  ${markdown.length} 字`);
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForSelector('.cm-content', { timeout: 30000 });

// 写入内容（CodeMirror 6：全选后输入）
const editor = page.locator('.cm-content').first();
await editor.click();
await page.keyboard.press('Control+A');
await page.keyboard.press('Delete');
await page.keyboard.insertText(markdown);
await page.waitForTimeout(1200);

// 选主题
await page.getByRole('button', { name: /Theme:/ }).click();
await page.waitForTimeout(400);
await page.getByText(themeName, { exact: true }).first().click();
await page.waitForTimeout(1200);
console.log(`[markcard] 已切换到主题「${themeName}」`);

// 打开导出面板（按钮文案随状态变化，取包含 Export 的第一个）
const exportToggle = page.locator('button', { hasText: /^Export$/ }).first();
if (await exportToggle.count()) { await exportToggle.click(); await page.waitForTimeout(600); }

const pngBtn = page.getByRole('button', { name: /Export PNG set/i }).first();
await pngBtn.waitFor({ state: 'visible', timeout: 20000 });
const label = (await pngBtn.textContent())?.trim() ?? '';
const expect = Number(label.match(/\((\d+)\s*pages?\)/i)?.[1] ?? 0);
console.log(`[markcard] ${label}`);

const downloads = [];
page.on('download', (d) => downloads.push(d));

await pngBtn.click();
// 等待下载全部到齐（每张一个 download 事件）
const deadline = Date.now() + 90000;
while (Date.now() < deadline && downloads.length < expect) await page.waitForTimeout(500);

await mkdir(outDir, { recursive: true });
let i = 0;
for (const d of downloads) {
  const target = path.join(outDir, `${path.basename(d.suggestedFilename())}`);
  await d.saveAs(target);
  i++;
  console.log(`  ✔ ${path.basename(target)}`);
}
if (!i) console.warn('  ⚠ 未捕获到下载，检查导出面板状态或页面错误');

await browser.close();
console.log(`[markcard] 完成 → ${outDir}`);
