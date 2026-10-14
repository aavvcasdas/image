/**
 * Run 03 · article-tools（eternityspring/article-tools）
 *
 * 目标：纯前端、零依赖的「公众号封面生成器」，能不能在无 UI 环境里批量出封面。
 *      工具本身用 html-to-image 在浏览器里截图，不联网、不调用任何 API。
 *
 * 做法：把 projects/article-tools 的封面工具复制到临时工作目录 →
 *      每套配色/文案写一份 draft.md（工具启动时自己 fetch 它读元数据）→
 *      打开 cover.html → 点页面上原生的「下载 PNG」按钮 → CDP 存盘。
 */
import fs from 'node:fs';
import path from 'node:path';
import { launch, serve, repoRoot } from '../../tools/browser.mjs';

const SRC = path.join(repoRoot, 'projects/article-tools');
const WORK = '/tmp/art-run';
const OUT_DIR = path.join(repoRoot, 'runs/03-article-tools/out');

// 每套：配色 index（工具内置 COLOR_SCHEMES）+ 文案
const VARIANTS = [
  { slug: '01-haier-blue', scheme: 6, name: '海蓝', label: '情绪自救手册', title: '你不是脾气差，只是太累了', subtitle: '3 个立刻能用上的情绪急救法', author: '@情绪自救手册' },
  { slug: '02-amber', scheme: 5, name: '琥珀', label: '给 30 岁前的人', title: '自律不是苦熬，是设计出来的', subtitle: '为什么你总是三分钟热度', author: '@成长笔记' },
  { slug: '03-midnight', scheme: 11, name: '午夜', label: '深夜读物', title: '别把同龄人，当成你的标尺', subtitle: '关于同龄人压力的一点点真话', author: '@深夜读物' },
];

fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(path.join(WORK, 'images'), { recursive: true });
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

for (const item of ['cover.html', 'group-config.json', 'fonts', 'vendor']) {
  fs.cpSync(path.join(SRC, item), path.join(WORK, item), { recursive: true });
}
fs.cpSync(path.join(SRC, 'images/wechat-qr.png'), path.join(WORK, 'images/wechat-qr.png'));

const draftFor = (v) => `类型：文章
选题：${v.label}
生成时间：2026-10-13

\`\`\`json
"changes": {
  "background": { "type": "scheme", "index": ${v.scheme}, "name": "${v.name}" },
  "content": {
    "label": "${v.label}",
    "title": "${v.title}",
    "subtitle": "${v.subtitle}",
    "author": "${v.author}"
  },
  "typography": { "labelSize": 2.7, "titleSize": 5.0, "subtitleSize": 2.1 }
}
\`\`\`
`;

const { server, url } = await serve(WORK);
const browser = await launch({ width: 1600, height: 1200 });
const problems = [];
const results = [];

for (const v of VARIANTS) {
  fs.writeFileSync(path.join(WORK, 'draft.md'), draftFor(v));

  const page = await browser.newPage();
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message.slice(0, 140)}`));
  page.on('dialog', (d) => d.accept().catch(() => {}));
  const cdp = await page.createCDPSession();
  await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: OUT_DIR }).catch(() => {});

  await page.goto(`${url}/cover.html`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 3000)); // 等字体

  // 直接驱动工具自己的输入框与配色按钮（等价于用户在页面里改文案 / 换配色）。
  // 注：工具的 draft.md 自动加载只写 .value、不发 input 事件，预览不会刷新，
  //     所以这里显式派发 input 事件。
  const applied = await page.evaluate(({ v }) => {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (!el) return false;
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    };
    set('inp-label', v.label);
    set('inp-title', v.title.replace(/\n/g, ''));
    set('inp-subtitle', v.subtitle);
    set('inp-author', v.author);
    document.querySelector(`.color-btn[data-scheme="${v.scheme}"]`)?.click();
    return {
      title: document.querySelector('#cover-main h1')?.textContent?.slice(0, 40),
      activeScheme: document.querySelector('.color-btn.active')?.title,
    };
  }, { v });
  await new Promise((r) => setTimeout(r, 1200));

  const before = new Set(fs.readdirSync(OUT_DIR));
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('下载 PNG'))?.click();
  });
  let waited = 0;
  while (waited < 45000) {
    await new Promise((r) => setTimeout(r, 1000));
    waited += 1000;
    const files = fs.readdirSync(OUT_DIR).filter((f) => !f.endsWith('.crdownload'));
    if (files.some((f) => !before.has(f))) break;
  }
  const fresh = fs.readdirSync(OUT_DIR).filter((f) => !before.has(f) && !f.endsWith('.crdownload'));
  for (const f of fresh) {
    fs.renameSync(path.join(OUT_DIR, f), path.join(OUT_DIR, `${v.slug}.png`));
  }
  const out = path.join(OUT_DIR, `${v.slug}.png`);
  const info = fs.existsSync(out) ? (() => {
    const buf = fs.readFileSync(out);
    return { bytes: buf.length, w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  })() : null;
  results.push({ slug: v.slug, scheme: `${v.scheme} ${v.name}`, applied, ...(info || { error: 'no file' }) });
  await page.close();
}

await browser.close();
server.close();
console.log(JSON.stringify({ results, problems: [...new Set(problems)].slice(0, 5) }, null, 2));
