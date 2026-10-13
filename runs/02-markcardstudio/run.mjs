/**
 * Run 02 · MarkCard Studio（pangxiaobin/MarkCardStudio）
 *
 * 目标：Vue3 + Vite 的「本地优先 Markdown → 社交媒体卡片」工具，
 *      在纯 Web 构建（不带 Tauri 桌面壳）下能不能跑通并导出成品图。
 *
 * 做法：vite build → 静态托管 dist → Chromium 打开 →
 *      1) 先用 App 自己持久化用法的 localStorage（markcard_studio_settings_v1）
 *         指定主题与分页模式，再 reload —— 等价于用户在设置面板里点选；
 *      2) 用页面自带的「导入 Markdown」file input 喂内容；
 *      3) 点 Export，CDP 把下载目录指到 runs/02-markcardstudio/out。
 * 全程零 API：解析、分页、排版、导出（html-to-image）都在浏览器本地完成。
 */
import fs from 'node:fs';
import path from 'node:path';
import { launch, serve, repoRoot } from '../../tools/browser.mjs';

const DIST = path.join(repoRoot, 'projects/MarkCardStudio/dist');
const OUT_DIR = path.join(repoRoot, 'runs/02-markcardstudio/out');
const MD = path.join(repoRoot, 'runs/02-markcardstudio/content.md');
const SETTINGS_KEY = 'markcard_studio_settings_v1';
const DRAFT_KEY = 'markcard_studio_draft_v1';

// 三套视觉差异最大的主题，各自单独配色 / 版式
const THEMES = [
  { theme: '瑞士网格', slug: 'swiss-grid' },      // 国际主义网格 + 荧光红标记
  { theme: '苹果备忘录', slug: 'apple-notes' },    // 横线纸 + 手写划线 + 黄色荧光笔
  { theme: '暗黑极客', slug: 'cyberpunk' },        // 终端扫描线 + 霓虹发光边框
  { theme: '复古报刊', slug: 'newspaper' },        // 旧报纸 + 首字下沉 + 双线报头
];

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const { server, url } = await serve(DIST);
const browser = await launch({ width: 1680, height: 1100 });
const log = [];
const problems = [];

// 应用注册了 beforeunload（关闭确认），reload 会被浏览器拦下；
// 于是改用「同一个 browser profile 里逐主题开新页」，localStorage 自然继承。
for (const { theme, slug } of THEMES) {
  const page = await browser.newPage();
  page.on('dialog', (d) => d.accept().catch(() => {}));
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message.slice(0, 140)}`));
  const cdp = await page.createCDPSession();
  await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: OUT_DIR }).catch(() => {});

  // ── 主题 & 分页：写进应用自己的设置项（等价于在设置面板里点选）
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.evaluate(({ key, draftKey, themeName }) => {
    localStorage.removeItem(draftKey);
    localStorage.setItem(key, JSON.stringify({
      selectedTheme: themeName,
      paginationMode: 'smart',        // 自适应智能分页：内容填满整页
      maxPageLength: 240,
      selectedPlatformName: '小红书',  // 1080 × 1440
      selectedFormat: 'PNG',
      scale: 2,
      showTopLeft: true, showTopRight: true, showBottomLeft: true, showBottomRight: true,
    }));
  }, { key: SETTINGS_KEY, draftKey: DRAFT_KEY, themeName: theme });
  await page.close();

  // ── 带着主题设置重新打开
  const page2 = await browser.newPage();
  page2.on('dialog', (d) => d.accept().catch(() => {}));
  page2.on('pageerror', (e) => problems.push(`pageerror: ${e.message.slice(0, 140)}`));
  const cdp2 = await page2.createCDPSession();
  await cdp2.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: OUT_DIR }).catch(() => {});
  await page2.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page2.waitForSelector('.cm-content', { timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2500));

  // ── 导入 Markdown
  const input = await page2.$('input[type=file]');
  await input.uploadFile(MD);
  await new Promise((r) => setTimeout(r, 4500));

  const state = await page2.evaluate(() => {
    const themeBtn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim().startsWith('Theme:'));
    const pageCount = [...document.querySelectorAll('*')]
      .map((e) => e.children.length === 0 ? (e.textContent || '').trim() : '')
      .find((t) => /^\d+ \/ \d+$/.test(t));
    return { themeBtn: (themeBtn?.textContent || '').trim(), counter: pageCount };
  });

  const before = fs.readdirSync(OUT_DIR).length;
  await page2.evaluate(() => {
    [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === 'Export')?.click();
  });
  // 导出是「一页一次下载」，所以要等下载全部落盘：无 .crdownload 且文件数连续 4 秒不变
  let waited = 0, lastCount = -1, stable = 0;
  while (waited < 90000) {
    await new Promise((r) => setTimeout(r, 1000));
    waited += 1000;
    const files = fs.readdirSync(OUT_DIR);
    const done = files.filter((f) => !f.endsWith('.crdownload')).length;
    if (done !== lastCount) { lastCount = done; stable = 0; } else stable += 1;
    if (done > before && stable >= 4 && !files.some((f) => f.endsWith('.crdownload'))) break;
  }

  // 按主题重命名，方便对照
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (!f.startsWith('markcard-page-')) continue;
    fs.renameSync(path.join(OUT_DIR, f), path.join(OUT_DIR, `${slug}-${f}`));
  }
  log.push({ theme, slug, state, files: fs.readdirSync(OUT_DIR).filter((f) => f.startsWith(slug)).length });
  await page2.close();
}

await browser.close();
server.close();

const files = fs.readdirSync(OUT_DIR).filter((f) => !f.endsWith('.crdownload')).sort();
const meta = files.map((f) => {
  const buf = fs.readFileSync(path.join(OUT_DIR, f));
  const isPng = buf.subarray(1, 4).toString() === 'PNG';
  return {
    file: `runs/02-markcardstudio/out/${f}`, bytes: buf.length,
    ...(isPng ? { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) } : {}),
  };
});
console.log(JSON.stringify({ log, count: files.length, meta, problems: [...new Set(problems)].slice(0, 5) }, null, 2));
