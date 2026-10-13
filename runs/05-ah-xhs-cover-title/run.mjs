/**
 * Run 05 · ah-xhs-cover-title（ahang008/ah-xhs-cover-title）
 *
 * 这个项目本身是一个「Skill」：把 85 条验证过的爆款封面公式 + 8 种钩子手法 +
 * 6 条内容赛道 + 4 种封面三行拆法做成可路由的知识库，由 Agent 读它来产出
 * 「标题 + 封面三行文案」。它不含渲染器 —— 所以本 run 做两件事：
 *
 *  1) 路由：按 skill 自己的 data/02-路由逻辑说明.md 的规则，对输入选题做
 *     赛道识别 → 钩子匹配 → 拆法选择，并从 data/04-全部85条案例库.md 里
 *     取出同类案例作为「可追溯」证据（不是凭空编的）。
 *  2) 渲染：把生成的三行文案用 HTML/CSS 写成封面，Chromium 截图出成品
 *     （小红书 3:4 = 1242×1656），零 API、纯代码渲染。
 *
 * 说明：沙箱里没有可调用的 LLM，所以路由是用脚本按 skill 文档里的规则表
 * 逐条实现的（规则本来就写在文档里，是可执行的决策表，不是模型能力）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { launch, writeDataUrl, repoRoot } from '../../tools/browser.mjs';

const SKILL_DIR = path.join(repoRoot, 'projects/ah-xhs-cover-title');
const OUT_DIR = path.join(repoRoot, 'runs/05-ah-xhs-cover-title/out');

// ── 1) 读 skill 自带的知识库 ────────────────────────────────────────────────
const casesRaw = fs.readFileSync(path.join(SKILL_DIR, 'data/04-全部85条案例库.md'), 'utf8');
const CASES = casesRaw.split(/\n---+\n/).map((block) => {
  const id = block.match(/(\d{3})\s*\|/)?.[1];
  const tags = block.match(/([A-H][^\s+]*)\s*\+\s*(\d)([^\n]*)/);
  const title = block.match(/标题：(.+)/)?.[1]?.trim();
  const lines = [...block.matchAll(/第[一二三]行：(.+)/g)].map((m) => m[1].trim());
  if (!id || lines.length !== 3) return null;
  return { id, hook: tags?.[1]?.[0], track: tags?.[2], title, lines };
}).filter(Boolean);

// ── 2) 路由（规则来自 skill 文档，逐条实现）────────────────────────────────
const TRACKS = {
  1: { name: '搞钱赚钱', kw: ['赚钱', '财富自由', '搞钱', '生意', '副业', '变现', '收入'] },
  2: { name: '自我成长', kw: ['成长', '执行力', '学习', '改变', '进步', '看书', '自律', '坚持'] },
  3: { name: '趋势洞察', kw: ['经济', '2026', '未来', '风口', '趋势', '布局', '出路'] },
  4: { name: '人际关系', kw: ['社交', '人脉', '信任', '关系', '熟人', '面子', '沟通'] },
  5: { name: '职场生存', kw: ['职场', '上班', '离职', '创业', '打工', '自由职业', '老板'] },
  6: { name: '心态情绪', kw: ['焦虑', '低谷', '内耗', '情绪', '自信', '勇气', '心态', '累'] },
};
const HOOKS = {
  C: { name: '反常识对比', kw: ['不是', '其实', '并不是', '而不是', '真正'] },
  F: { name: '数字锚点', kw: ['个', '条', '步', '年', '万', '天'] },
  B: { name: '顿悟发现', kw: ['发现', '悟', '觉察', '意识到'] },
  E: { name: '身份圈定', kw: ['普通人', '打工人', '女生', '年轻人', '30岁', '应届'] },
  A: { name: '建议祈使', kw: ['建议', '千万不要', '尽早', '尽量', '别'] },
  D: { name: '如何方法', kw: ['如何', '怎么', '方法', '步骤', '做到'] },
  G: { name: '情绪钩子', kw: ['焦虑', '低谷', '讨厌', '害怕', '内耗', '委屈'] },
  H: { name: '热点嫁接', kw: ['2026', '今年', 'AI', '大模型', '时代'] },
};

function route(topic) {
  const hits = [];
  for (const [id, t] of Object.entries(TRACKS)) {
    const n = t.kw.filter((k) => topic.includes(k)).length;
    if (n) hits.push({ id, name: t.name, n });
  }
  hits.sort((a, b) => b.n - a.n);
  const primary = hits[0] || { id: '6', name: '心态情绪', n: 0 };
  const secondary = hits[1] || null;

  const hooks = Object.entries(HOOKS)
    .map(([code, h]) => ({ code, name: h.name, score: h.kw.filter((k) => topic.includes(k)).length }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  if (!hooks.length) hooks.push({ code: 'C', name: '反常识对比', score: 0 }, { code: 'B', name: '顿悟发现', score: 0 });

  // 拆法：内容含情绪痛点→递进悬念；含数字/方法→结论前置；含对比→对比撕裂
  const method = hooks.some((h) => h.code === 'G') ? '递进悬念型'
    : hooks.some((h) => h.code === 'C') ? '对比撕裂型'
      : hooks.some((h) => ['D', 'F'].includes(h.code)) ? '结论前置型' : '结论前置型';

  const evidence = CASES.filter((c) => c.track === primary.id && hooks.some((h) => h.code === c.hook)).slice(0, 3);
  return { primary, secondary, hooks, method, evidence: evidence.length ? evidence : CASES.filter((c) => c.track === primary.id).slice(0, 3) };
}

// 注意：JS 的 \b 对中文无效（本项目第一轮踩过的坑），关键词匹配一律用 includes。
const TOPICS = [
  '为什么你越努力越穷：关于「选择」的三条反常识',
  '职场里最该尽早戒掉的情绪内耗',
];

// ── 3) 封面模板（纯 HTML/CSS，代码渲染）────────────────────────────────────
const THEMES = {
  'ink-red': { bg: 'linear-gradient(160deg,#0f0f10,#1c1a19)', fg: '#f5f2ec', accent: '#ff4d3d', label: '深夜读物' },
  'cream-blue': { bg: 'linear-gradient(160deg,#f6f1e7,#efe6d6)', fg: '#23201c', accent: '#1d4ed8', label: '成长笔记' },
};

function coverHtml(lines, theme, topic) {
  const t = THEMES[theme];
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0}
  body{width:1242px;height:1656px;overflow:hidden}
  .cover{position:relative;width:1242px;height:1656px;background:${t.bg};color:${t.fg};
    font-family:"Noto Sans SC","Noto Sans CJK SC",sans-serif;
    display:flex;flex-direction:column;justify-content:center;padding:0 96px 150px;box-sizing:border-box}
  .bar{position:absolute;left:96px;top:150px;width:120px;height:14px;background:${t.accent}}
  .label{position:absolute;left:96px;top:196px;font-size:34px;letter-spacing:.22em;opacity:.72}
  .line{font-weight:900;line-height:1.22;letter-spacing:.01em}
  .l1{font-size:112px;color:${t.accent}}
  .l2{font-size:132px}
  .l3{font-size:112px;position:relative;display:inline-block}
  .l3::after{content:"";position:absolute;left:0;bottom:6px;width:100%;height:20px;background:${t.accent};opacity:.35;z-index:-1}
  .foot{position:absolute;left:96px;bottom:110px;font-size:32px;opacity:.6;letter-spacing:.05em}
  .tag{position:absolute;right:96px;bottom:104px;font-size:28px;padding:12px 26px;border:2px solid ${t.accent};color:${t.accent};border-radius:999px}
</style></head><body>
<div class="cover">
  <div class="bar"></div>
  <div class="label">${t.label}</div>
  <div class="line l1">${lines[0]}</div>
  <div class="line l2">${lines[1]}</div>
  <div class="line l3">${lines[2]}</div>
  <div class="foot">${topic.slice(0, 18)}</div>
  <div class="tag">收藏后慢慢看</div>
</div></body></html>`;
}

// ── 4) 路由 + 写文案 + 渲染 ────────────────────────────────────────────────
const COPY = {
  '为什么你越努力越穷：关于「选择」的三条反常识': [
    ['选择比努力', '更值钱', '越忙的人越穷'],
    ['穷忙真相', '不是你不努力', '是方向错了'],
  ],
  '职场里最该尽早戒掉的情绪内耗': [
    ['尽早戒掉', '职场情绪内耗', '内耗的人才最累'],
    ['突然发现', '让人累的不是工作', '是内耗'],
  ],
};

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const report = [];
for (const topic of TOPICS) {
  const r = route(topic);
  const variants = COPY[topic];
  const rendered = [];
  const pairs = [['ink-red', variants[0]], ['cream-blue', variants[1]]];
  for (const [theme, lines] of pairs) {
    const html = coverHtml(lines, theme, topic);
    const tmp = path.join('/tmp', `cover-${theme}.html`);
    fs.writeFileSync(tmp, html);
    rendered.push({ theme, lines, html: path.relative(repoRoot, tmp) });
  }
  report.push({
    topic,
    route: {
      track: `${r.primary.id} ${r.primary.name}` + (r.secondary ? ` + ${r.secondary.id} ${r.secondary.name}` : ''),
      hooks: r.hooks.map((h) => `${h.code}${h.name}`).join(' / '),
      method: r.method,
      evidence: r.evidence.map((e) => ({ id: e.id, tag: `${e.hook}+${e.track}`, lines: e.lines })),
    },
    rendered,
  });
}
console.log(JSON.stringify(report, null, 2));

// 把待渲染的 HTML 写进 out，供渲染阶段使用
fs.writeFileSync(path.join(OUT_DIR, 'plan.json'), JSON.stringify(report, null, 2));

const browser = await launch({ width: 1242, height: 1656 });
const page = await browser.newPage();
await page.setViewport({ width: 1242, height: 1656, deviceScaleFactor: 1 });
const outFiles = [];
for (const item of report) {
  const topicSlug = item.topic.slice(0, 6);
  for (const [i, v] of item.rendered.entries()) {
    fs.writeFileSync('/tmp/cover-current.html', coverHtml(v.lines, v.theme, item.topic));
    await page.goto('file:///tmp/cover-current.html', { waitUntil: 'load' });
    await new Promise((r) => setTimeout(r, 400));
    const dataUrl = await page.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 1242; c.height = 1656;
      return null;
    });
    // 直接用截图（封面就是整页，无需再合成 canvas）
    const out = path.join(OUT_DIR, `${topicSlug}-${v.theme}.png`);
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1242, height: 1656 } });
    outFiles.push({ file: path.relative(repoRoot, out), bytes: fs.statSync(out).size, theme: v.theme, lines: v.lines });
  }
}
await browser.close();
console.log(JSON.stringify({ outFiles }, null, 2));
