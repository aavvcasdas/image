/**
 * Run 06 · Arena 生图 + 代码渲染文字层（鸡汤图文成品）
 *
 * 这是用户要求的那条链路：**模型生图换成 Arena 的生图，排版/文字层用代码渲染**。
 *
 * 流程：
 *   1) 文案路由：projects/ah-xhs-cover-title 的 85 条爆款公式库 → 出标题与封面三行；
 *   2) 画面：projects/qiaomu-codex-imagegen 的风格库（24 模板 / 48 预设）compose 出
 *      提示词 → 交给 **Arena 生图** 出底图（替代原技能的 Codex 生图 / 任何图像 API）；
 *   3) 合成：底图 + HTML/CSS 文字层（可换文案、可换版式）→ Chromium 截图 → 成品卡片。
 *   全程不调用任何外部图像接口，生图那一步由 Arena 提供。
 */
import fs from 'node:fs';
import path from 'node:path';
import { launch, repoRoot } from '../../tools/browser.mjs';

const RUN = path.join(repoRoot, 'runs/06-arena-imagegen');
const ASSETS = path.join(RUN, 'assets');
const OUT = path.join(RUN, 'out');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// 底图（Arena 生图）+ 文案（来自 ah-xhs-cover-title 的路由结果）+ 版式
const CARDS = [
  {
    slug: '01-di-gu-period',
    image: '01-light-gap.png',
    template: 'T03-1 中央光隙 · 清润春生',
    topic: '低谷期自我救赎',
    hook: 'G情绪钩子 + 6心态情绪',
    lines: ['你不是不够好', '你只是在', '爬一段很长的坡'],
    footer: '@情绪自救手册',
    theme: { fg: '#22201d', accent: '#d9761f', scrim: 'linear-gradient(180deg, rgba(248,246,241,.55) 0%, rgba(248,246,241,.86) 42%, rgba(248,246,241,.95) 100%)' },
  },
  {
    slug: '02-grow-slowly',
    image: '02-paper-terrace.png',
    template: 'T05-1 纸雕田垄',
    topic: '慢慢变好',
    hook: 'B顿悟发现 + 2自我成长',
    lines: ['变好这件事', '从来不是', '一夜之间发生的'],
    footer: '@成长笔记',
    theme: { fg: '#2a2622', accent: '#c86a3c', scrim: 'linear-gradient(180deg, rgba(252,250,246,.72) 0%, rgba(252,250,246,.9) 55%, rgba(252,250,246,.97) 100%)' },
  },
  {
    slug: '03-alone-is-fine',
    image: '03-window-flowers.png',
    template: 'T08-2 旅行手账',
    topic: '一个人也很好',
    hook: 'A建议祈使 + 4人际关系',
    lines: ['一个人', '也可以把日子', '过得很热闹'],
    footer: '@深夜读物',
    theme: { fg: '#232b2a', accent: '#3f7d6e', scrim: 'linear-gradient(180deg, rgba(246,248,247,.78) 0%, rgba(246,248,247,.9) 60%, rgba(246,248,247,.96) 100%)' },
  },
];

const cardHtml = (card) => {
  const img = `file://${path.join(ASSETS, card.image)}`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<style>
  html,body{margin:0}
  body{width:1242px;height:1656px;overflow:hidden}
  .card{position:relative;width:1242px;height:1656px;overflow:hidden;background:#fff;
    font-family:"Noto Sans SC","Noto Sans CJK SC",sans-serif}
  .card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .scrim{position:absolute;inset:0;background:${card.theme.scrim}}
  .content{position:absolute;left:0;right:0;bottom:150px;padding:0 96px;color:${card.theme.fg}}
  .kicker{display:inline-block;font-size:30px;letter-spacing:.2em;padding:10px 22px;border-radius:999px;
    border:2px solid ${card.theme.accent};color:${card.theme.accent};margin-bottom:34px}
  h1{margin:0;font-size:104px;line-height:1.16;font-weight:900;letter-spacing:.01em}
  h1 em{font-style:normal;color:${card.theme.accent}}
  .rule{width:120px;height:12px;background:${card.theme.accent};margin:38px 0 30px}
  .footer{position:absolute;left:96px;bottom:74px;font-size:30px;letter-spacing:.08em;opacity:.72;color:${card.theme.fg}}
  .tag{position:absolute;right:96px;bottom:70px;font-size:26px;color:${card.theme.fg};opacity:.6}
</style></head><body>
<div class="card">
  <img src="${img}">
  <div class="scrim"></div>
  <div class="content">
    <div class="kicker">${card.topic}</div>
    <h1>${card.lines[0]}<br>${card.lines[1]}<br><em>${card.lines[2]}</em></h1>
    <div class="rule"></div>
  </div>
  <div class="footer">${card.footer}</div>
  <div class="tag">收藏 · 转发给需要的人</div>
</div></body></html>`;
};

const browser = await launch({ width: 1242, height: 1656 });
const page = await browser.newPage();
await page.setViewport({ width: 1242, height: 1656, deviceScaleFactor: 1 });

const results = [];
for (const card of CARDS) {
  const htmlPath = path.join('/tmp', `card-${card.slug}.html`);
  fs.writeFileSync(htmlPath, cardHtml(card));
  await page.goto(`file://${htmlPath}`, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 600));
  const out = path.join(OUT, `${card.slug}.png`);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1242, height: 1656 } });
  const buf = fs.readFileSync(out);
  results.push({
    file: path.relative(repoRoot, out), bytes: buf.length,
    w: buf.readUInt32BE(16), h: buf.readUInt32BE(20),
    base: `runs/06-arena-imagegen/assets/${card.image}`,
    styleTemplate: card.template, hook: card.hook,
  });
}
await browser.close();

// 记录「哪张图是 Arena 生的、哪套文案是哪条公式路由出来的」，保证可追溯
fs.writeFileSync(path.join(RUN, 'trace.json'), JSON.stringify({ chain: [
  '文案：projects/ah-xhs-cover-title（85 条爆款公式库）路由 → 标题 + 封面三行',
  '画面提示词：projects/qiaomu-codex-imagegen（24 模板 / 48 预设）compose',
  '出图：Arena 生图（替代原技能的 Codex 生图 / 任何图像 API）',
  '合成：HTML/CSS 文字层 + Chromium 截图（本脚本）',
], cards: results }, null, 2));
console.log(JSON.stringify(results, null, 2));
