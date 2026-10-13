#!/usr/bin/env node
/**
 * Migrate every remaining off-palette literal in the example corpus onto the palette.
 *
 *   node skills/scripts/migrate-literals.mjs --check
 *   node skills/scripts/migrate-literals.mjs --apply
 *
 * Two contexts, because they need different rules:
 *
 * **Cards** (bare HTML, no fence) — property-aware:
 *   `color:` + neutral dark → declaration dropped (the document theme supplies the text colour)
 *   `color:` + saturated dark → the matching semantic ink (`negative` / `warning-ink` / `positive-ink`)
 *   `background:` + light → `var(--md-surface)`; palette backgrounds are kept
 *
 * **Diagram blocks** — value-aware, and two rules on top:
 *   a categorical colour list (`"color": …`, `config.range.category`, `theme.palette`) is replaced by the
 *   ramp from the palette (in token order) — that is what the plan's “palette 一致性” gate asks for
 *   every other literal becomes its nearest palette value, **without repeating a value already used in
 *   the same block**: a nearest-colour mapping would otherwise collapse three hand-picked blues into one
 *
 * `rgba(0, 0, 0, α)` veils and the neutral `#fff` / `#000` are never touched.
 */
import fs from 'node:fs';
import path from 'node:path';
import { readAllThemes } from './lib/themes.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const EXAMPLES = path.join(ROOT, 'skills/documd-visuals/examples');
const APPLY = process.argv.includes('--apply');

const { tokens, derived, values } = (() => {
  const t = readAllThemes(path.join(ROOT, 'skills/documd-visuals/styles/themes'));
  const all = t.flatMap((x) => x.values);
  const def = t.find((x) => x.id === 'default') ?? t[0];
  return { tokens: def.tokens, derived: def.derived, values: [...new Set(all)] };
})();
const PALETTE = new Set(values);
const NEUTRALS = new Set(['#ffffff', '#000000']);
const TINTS = [...new Set([...derived.values()].flatMap((d) => [d.tint, d.shade].filter(Boolean)))];
const TOKENS = [...tokens.values()].map((t) => t.value);
/** The categorical ramp, in token order — the one list every chart should carry. */
const RAMP = Array.from({ length: 8 }, (_, i) => tokens.get(`cat-${i + 1}`).value);

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const luma = (hex) => {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const chroma = (hex) => {
  const [r, g, b] = toRgb(hex);
  return Math.max(r, g, b) - Math.min(r, g, b);
};
const hue = (hex) => {
  const [r, g, b] = toRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return null;
  const d = max - min;
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};
const distance = (a, b) => {
  const [r1, g1, b1] = toRgb(a);
  const [r2, g2, b2] = toRgb(b);
  return 2 * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + 3 * (b1 - b2) ** 2;
};
/**
 * Nearest palette colour inside a pool, by **hue first, lightness second**.
 * Plain RGB distance mixes light fills with saturated marks and sends a saturated accent to a
 * near-white blue (measured: `#7ca6ff` → `surface-2`), which is exactly the drift we are removing.
 * Grey literals (no hue) fall back to lightness distance.
 */
const hueDistance = (a, b) => {
  const [ha, hb] = [hue(a), hue(b)];
  if (ha === null || hb === null) return 361;
  return Math.min(Math.abs(ha - hb), 360 - Math.abs(ha - hb));
};
const nearest = (hex, pool, used = new Set()) => {
  const free = pool.filter((c) => !used.has(c));
  const from = free.length ? free : pool;
  const l = luma(hex);
  const score = (c) => hueDistance(hex, c) + 60 * Math.abs(luma(c) - l);
  return from.reduce((best, c) => (score(c) < score(best) ? c : best), from[0]);
};
/** Pools by saturation: greys never become tints, light colours never become marks. */
const GREYS = [tokens.get('ink').value, tokens.get('ink-soft').value, tokens.get('muted').value, tokens.get('line').value, tokens.get('line-strong').value, tokens.get('target').value, tokens.get('surface-1').value, tokens.get('surface-2').value];
const MARKS = Array.from({ length: 8 }, (_, i) => tokens.get(`cat-${i + 1}`).value).concat([tokens.get('positive').value, tokens.get('negative').value, tokens.get('warning').value]);
const poolFor = (hex) => (chroma(hex) < 25 ? GREYS : luma(hex) > 0.75 ? TINTS : MARKS);
function semanticText(hex) {
  const h = hue(hex);
  if (h === null) return tokens.get('muted').value;
  if (h < 20 || h > 340) return tokens.get('negative').value;
  if (h >= 20 && h < 60) return tokens.get('warning-ink').value;
  if (h >= 70 && h < 180) return tokens.get('positive-ink').value;
  return tokens.get('muted').value;
}

/** Cards: property-aware, see the header. */
function migrateCard(text, note) {
  let out = text;
  out = out.replace(/([;\s"])color:\s*(#[0-9a-fA-F]{6})\s*(;?)/g, (m, pre, hex, semi) => {
    const h = hex.toLowerCase();
    if (PALETTE.has(h)) return m;
    if (luma(h) < 0.35 && chroma(h) <= 40) {
      note(`color:${h}`, 'dropped (inherit)');
      return semi ? pre : `${pre};`;
    }
    const to = semanticText(h);
    note(`color:${h}`, to);
    return `${pre}color: ${to}${semi}`;
  });
  out = out.replace(/(background(?:-color)?:\s*)(#[0-9a-fA-F]{6})/g, (m, prop, hex) => {
    const h = hex.toLowerCase();
    if (PALETTE.has(h)) return m;
    if (luma(h) > 0.5) {
      note(`${prop}${h}`, 'var(--md-surface)');
      return `${prop}var(--md-surface)`;
    }
    const to = nearest(h, TINTS);
    note(`${prop}${h}`, to);
    return `${prop}${to}`;
  });
  return out.replace(/#[0-9a-fA-F]{6}/g, (hex) => {
    const h = hex.toLowerCase();
    if (PALETTE.has(h) || NEUTRALS.has(h)) return hex;
    const to = nearest(h, poolFor(h));
    note(h, to);
    return to;
  });
}

/** Diagram blocks: colour lists become the ramp; other literals go to the nearest unused value. */
function migrateBlock(body, note) {
  let out = body;
  // a) categorical colour lists → the canonical ramp, truncated to the number of entries it had
  out = out.replace(/("color"\s*:\s*)\[[^\]]*\]/g, (m, head) => {
    const n = Math.max(1, (m.match(/#[0-9a-fA-F]{6}/g) ?? []).length);
    note(`"color": [${n}]`, `ramp[0..${n - 1}]`);
    return `${head}[${RAMP.slice(0, Math.min(n, 8)).map((c) => `"${c}"`).join(', ')}]`;
  });
  out = out.replace(/(palette\s*\n)((?:\s*-\s*#[0-9a-fA-F]{6}\n?)+)/g, (m, head) => {
    const n = Math.max(1, (m.match(/#[0-9a-fA-F]{6}/g) ?? []).length);
    note(`palette list [${n}]`, `ramp[0..${Math.min(n, 8) - 1}]`);
    return `${head}${RAMP.slice(0, Math.min(n, 8)).map((c) => `    - ${c}`).join('\n')}\n`;
  });
  // b) everything else: nearest palette value, never repeating one within the block
  const used = new Set((out.match(/#[0-9a-fA-F]{6}/g) ?? []).map((h) => h.toLowerCase()).filter((h) => PALETTE.has(h)));
  return out.replace(/#[0-9a-fA-F]{6}/g, (hex) => {
    const h = hex.toLowerCase();
    if (PALETTE.has(h) || NEUTRALS.has(h)) return hex;
    const to = nearest(h, poolFor(h), used);
    used.add(to);
    note(h, to);
    return to;
  });
}

const files = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.md')) files.push(p);
  }
};
walk(EXAMPLES);

const isCard = (text) => /^<(div|section|table|figure|article)/m.test(text) && !text.includes('```');
let touched = 0;
let total = 0;
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const changes = [];
  const note = (from, to) => changes.push(`${from} → ${to}`);
  let out;
  if (isCard(text)) {
    out = migrateCard(text, note);
  } else {
    out = text.replace(/```([a-z-]+)\n([\s\S]*?)```/g, (whole, fence, body) => `\`\`\`${fence}\n${migrateBlock(body, note)}\`\`\``);
  }
  if (!changes.length) continue;
  touched++;
  total += changes.length;
  if (changes.length) {
    console.log(`${path.relative(EXAMPLES, file)}  (${changes.length})`);
    const counts = new Map();
    for (const c of changes) counts.set(c, (counts.get(c) ?? 0) + 1);
    for (const [c, n] of [...counts].sort((a, b) => b[1] - a[1]).slice(0, 4)) console.log(`   ${c}${n > 1 ? ` ×${n}` : ''}`);
  }
  if (APPLY) fs.writeFileSync(file, out);
}
console.log(`\nfiles touched: ${touched} · replacements: ${total}${APPLY ? '  [applied]' : '  (dry run — pass --apply)'}`);
