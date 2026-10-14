import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

const [, , htmlArg, outDirArg, prefixArg = 'card'] = process.argv;

if (!htmlArg || !outDirArg) {
  console.error('用法：node render_cards.mjs <输入 HTML> <输出目录> [文件名前缀]');
  process.exit(1);
}

const root = process.cwd();
const htmlPath = path.resolve(root, htmlArg);
const outDir = path.resolve(root, outDirArg);

async function loadPlaywright() {
  const candidates = [];

  if (process.env.PLAYWRIGHT_MODULE_PATH) {
    candidates.push(process.env.PLAYWRIGHT_MODULE_PATH);
  }
  candidates.push('playwright');

  const pnpmRoot = path.join(
    os.homedir(),
    '.cache',
    'codex-runtimes',
    'codex-primary-runtime',
    'dependencies',
    'node',
    'node_modules',
    '.pnpm',
  );

  const pnpmEntries = await fs.readdir(pnpmRoot).catch(() => []);
  for (const entry of pnpmEntries.filter((name) => name.startsWith('playwright@')).sort().reverse()) {
    candidates.push(path.join(pnpmRoot, entry, 'node_modules', 'playwright'));
  }

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // 继续尝试下一个来源。
    }
  }

  throw new Error(
    '未找到 Playwright。请运行 npm install playwright，或设置 PLAYWRIGHT_MODULE_PATH。',
  );
}

async function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // 继续尝试下一个浏览器路径。
    }
  }

  return undefined;
}

const { chromium } = await loadPlaywright();

await fs.mkdir(outDir, { recursive: true });

const oldFiles = await fs.readdir(outDir).catch(() => []);
for (const oldFile of oldFiles) {
  if (oldFile.endsWith('.png') && oldFile.startsWith(prefixArg)) {
    await fs.unlink(path.join(outDir, oldFile));
  }
}

const chromePath = await findChrome();
const browser = await chromium.launch(chromePath ? { executablePath: chromePath } : {});
const page = await browser.newPage({
  viewport: { width: 1080, height: 1440 },
  deviceScaleFactor: 1,
});

await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
await page.emulateMedia({ media: 'screen' });
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all(
    [...document.images].map((image) => (
      image.complete ? Promise.resolve() : new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      })
    )),
  );
});

const cards = await page.locator('.card').count();
if (cards === 0) {
  await browser.close();
  throw new Error('HTML 中没有找到带有 .card 类的元素。');
}

for (let i = 0; i < cards; i += 1) {
  const filename = `${prefixArg}-${String(i + 1).padStart(2, '0')}.png`;
  await page.locator('.card').nth(i).screenshot({
    path: path.join(outDir, filename),
    animations: 'disabled',
  });
}

await browser.close();
console.log(JSON.stringify({ outDir, cards }, null, 2));
