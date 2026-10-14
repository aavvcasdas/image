/**
 * setup/build-gallery.mjs —— 扫描 runs/ 生成静态画廊 runs/gallery.html
 *
 * 用法：node setup/build-gallery.mjs
 * 预览：npx serve . 或 node setup/preview-server.mjs（仓库根启动，打开 /runs/gallery.html）
 */
import { readdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUNS = path.join(ROOT, 'runs');

const TITLES = {
  '01-auto-redbook-skill': 'Run 01 · Auto-Redbook-Skills（2358★）多主题小红书卡片',
  '02-xhs-textcard': 'Run 02 · XHS-TextCard（107★）三套模板 + Arena 生图封面',
  '03-markcard-studio': 'Run 03 · MarkCard Studio（306★）导出 PNG 套图',
  '04-takumi': 'Run 04 · takumi（3098★）金句卡 + 动态 GIF 封面',
  '05-article-cards': 'Run 05 · xiaohongshu-article-cards（37★）奶油信息卡轮播',
  'assets': null, // 素材目录不出现在画廊
};

const IMG = /\.(png|jpe?g|gif|webp)$/i;
const entries = (await readdir(RUNS, { withFileTypes: true }))
  .filter((e) => e.isDirectory() && TITLES[e.name] !== null)
  .map((e) => e.name)
  .sort();

const groups = [];
for (const dir of entries) {
  const walk = async (d, rel = '') => {
    const out = [];
    for (const f of await readdir(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) out.push(...await walk(p, path.join(rel, f.name)));
      else if (IMG.test(f.name)) out.push({ path: path.join(rel, f.name), size: (await stat(p)).size });
    }
    return out;
  };
  const imgs = await walk(path.join(RUNS, dir));
  if (!imgs.length) continue;
  groups.push({ dir, title: TITLES[dir] ?? dir, imgs });
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>AI 鸡汤 / 涨粉图文 · 代码渲染实测画廊</title>
<style>
  :root { color-scheme: light dark; --bg:#0f1117; --card:#171a23; --fg:#e8ecf4; --muted:#9aa4b8; --accent:#ff6b6b; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg);
         font-family: -apple-system, "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif; }
  header { padding:36px 28px 12px; }
  h1 { margin:0 0 8px; font-size:26px; }
  .sub { color:var(--muted); font-size:14px; line-height:1.7; }
  .sub code { background:#00000055; padding:2px 6px; border-radius:5px; }
  section { padding:18px 28px 8px; }
  h2 { font-size:18px; margin:26px 0 14px; padding-left:12px; border-left:4px solid var(--accent); }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:16px; }
  figure { margin:0; background:var(--card); border-radius:14px; overflow:hidden;
           box-shadow:0 6px 20px #0006; display:flex; flex-direction:column; }
  figure img { width:100%; display:block; background:#fff; }
  figcaption { padding:8px 10px; font-size:12px; color:var(--muted); display:flex; justify-content:space-between; gap:8px; }
  footer { padding:30px 28px 60px; color:var(--muted); font-size:13px; }
</style></head>
<body>
<header>
  <h1>AI 鸡汤 / 涨粉图文 · 代码渲染实测画廊</h1>
  <p class="sub">
    5 个「不需要 API 接口」的图文创作项目，全部在本仓库实跑产出。<br/>
    模型生图部分（封面/底图）来自 <strong>Arena 生图</strong>，代码渲染部分完全离线运行；近 3 个月均有更新。<br/>
    复现命令见 <code>README.md</code> 与各 <code>runs/&lt;编号&gt;/README.md</code>。
  </p>
</header>
${groups.map((g) => `<section>
  <h2>${g.title} <span style="color:var(--muted);font-weight:400;font-size:13px">（${g.imgs.length} 张）</span></h2>
  <div class="grid">
${g.imgs.map((i) => `    <figure><img loading="lazy" src="${encodeURI(g.dir + '/' + i.path)}" alt="${i.path}"/>
      <figcaption><span>${i.path}</span><span>${kb(i.size)}</span></figcaption></figure>`).join('\n')}
  </div>
</section>`).join('\n')}
<footer>由 <code>setup/build-gallery.mjs</code> 生成 · 图片为工具原生产出（&gt;320KB 的转 JPEG q90 以控制体积）</footer>
</body></html>`;

await writeFile(path.join(RUNS, 'gallery.html'), html);
console.log(`已生成 runs/gallery.html：${groups.length} 组 / ${groups.reduce((n, g) => n + g.imgs.length, 0)} 张图`);
