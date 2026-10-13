#!/usr/bin/env node
/**
 * edit.mjs — 「改图」路径的渲染核心（对应图像 API 的 /images/edits）
 *
 * 本地没有扩散模型可以做 inpainting，所以这里的策略是：
 *   **保留参考图画面 + 叠加一层文案版式**。
 * 这正好覆盖科普图文最常见的用法——「用这张图当底，把标题/要点压上去」。
 *
 * 输入：一张参考图（data URI）+ 提示词（含结构化文案块）
 * 输出：与参考图同尺寸的 PNG
 */

/** 把参考图尺寸读出来（PNG/JPEG 头解析，不依赖第三方库） */
export function sniffImageSize(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // JPEG: 扫 SOF 段
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
  }
  return null;
}

export function buildEditHtml({ refDataUri, prompt, size, theme }) {
  const { width: W, height: H } = size;
  const base = Math.min(W, H);
  const accent = (theme && theme.accent) || '#38bdf8';

  // 文案从提示词里抽出来（与生图路径共用同一套抽取逻辑）
  const lines = String(prompt || '').split(/\r?\n/).map((l) => l.trim());
  const pick = (labels) => {
    for (const l of lines) {
      const m = l.match(new RegExp(`^(?:[-*>\\s]*)(${labels.join('|')})\\s*[:：]\\s*(.+)$`, 'i'));
      if (m) return m[2].trim();
    }
    return null;
  };
  const title = (pick(['标题', '主标题', 'title', 'headline']) || lines.find((l) => l.length >= 4 && l.length <= 30) || 'AI 科普').slice(0, 60);
  const subtitle = (pick(['副标题', '小标题', 'subtitle', 'sub', 'desc']) || '').slice(0, 90);

  const clean = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{width:${W}px;height:${H}px;overflow:hidden;font-family:'Noto Sans SC',system-ui,sans-serif}
  .card{position:relative;width:${W}px;height:${H}px;background:#000;overflow:hidden}
  .bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
  .veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05) 0%,rgba(0,0,0,.38) 42%,rgba(0,0,0,.93) 100%)}
  .bar{position:absolute;left:0;right:0;bottom:0;padding:${Math.round(base * 0.075)}px;
       color:#fff;display:flex;flex-direction:column;gap:${Math.round(base * 0.024)}px}
  .kicker{font-family:ui-monospace,'SF Mono',monospace;font-size:${Math.round(base * 0.022)}px;
          letter-spacing:.20em;color:${accent};text-transform:uppercase}
  h1{font-size:${Math.round(base * 0.084)}px;line-height:1.2;font-weight:700;letter-spacing:.01em;text-shadow:0 2px 8px rgba(0,0,0,.45)}
  .sub{font-size:${Math.round(base * 0.030)}px;line-height:1.5;opacity:.92;text-shadow:0 1px 3px rgba(0,0,0,.5)}
  .rule{width:${Math.round(W * 0.16)}px;height:${Math.max(3, Math.round(base * 0.006))}px;background:${accent}}
  </style></head><body>
  <div class="card">
    <img class="bg" src="${refDataUri}">
    <div class="veil"></div>
    <div class="bar">
      <div class="kicker">LOCAL EDIT</div>
      <h1>${clean(title)}</h1>
      ${subtitle ? `<div class="sub">${clean(subtitle)}</div>` : ''}
      <div class="rule"></div>
    </div>
  </div></body></html>`;
}

export default buildEditHtml;
