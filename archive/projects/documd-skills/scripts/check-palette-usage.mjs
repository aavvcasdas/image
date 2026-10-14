#!/usr/bin/env node
/**
 * Palette usage report — how far the example corpus is from `styles/palette.md`.
 *
 *   node skills/scripts/check-palette-usage.mjs           # report (never fails)
 *   node skills/scripts/check-palette-usage.mjs --strict  # exit 1 when any off-palette hex remains
 *   node skills/scripts/check-palette-usage.mjs --json
 *
 * This is the measurement the migration was planned against, and it became the §8 “off-theme”
 * gate: `--strict` is the error mode. It answers four questions per engine:
 *
 *   1. how many fenced blocks exist, and how many already carry theme values
 *   2. how many colour literals sit outside every theme (`--strict` fails on these)
 *   3. which theme each block is written in, and whether any block mixes two
 *   4. how many references follow the host document (`var(--md-*)`) or veil (`rgba()`)
 *
 * It deliberately does **not** ask whether each block carries its theme's block — that is
 * `apply-block.mjs --all --check`, and it asks with whole-block matching. An earlier revision
 * answered it here too, with a single signature line, and the two answers diverged (measured on
 * `vega`: 0% here against 82% there). One question, one gate.
 *
 * Colours are counted as literals only; `var(--md-*)` references and `rgba(…)` veils are not
 * theme values and not offenders — both are reported separately so the numbers stay explainable.
 */
import fs from 'node:fs';
import path from 'node:path';
import { readAllThemes } from './lib/themes.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const EXAMPLES = path.join(ROOT, 'skills/documd-visuals/examples');
const THEME_DIR = path.join(ROOT, 'skills/documd-visuals/styles/themes');
const STRICT = process.argv.includes('--strict');
const JSON_OUT = process.argv.includes('--json');

/** fenced language → engine name used in the report */
const ENGINES = { plantuml: 'plantuml', puml: 'plantuml', vega: 'vega', 'vega-lite': 'vega-lite', echarts: 'echarts', infographic: 'infographic' };

const THEMES = readAllThemes(THEME_DIR);
const THEME_VALUES = new Map(THEMES.map((t) => [t.id, new Set(t.values)]));
/** Legal anywhere: the union over themes. A block that mixes themes is caught by the theme column. */
const paletteValues = new Set(THEMES.flatMap((t) => t.values));
const DEFAULT_THEME = THEMES.find((t) => t.id === 'default') ?? THEMES[0];
/** Neutral literals that are white/black by definition and therefore not "off-theme". */
const NEUTRALS = new Set(['#ffffff', '#fff', '#000000', '#000']);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

const perEngine = new Map();
const offPalette = new Map(); // hex → count
const worstFiles = [];
let totalBlocks = 0;
let cards = 0;
let cardOffPalette = 0;
let mdVars = 0;
let rgba = 0;
let mixedBlocks = 0;
const themeUse = new Map();
const mixedFiles = new Map();

/**
 * Which theme a block is written in. Scored rather than guessed: the theme that contains the most of
 * the block's non-neutral colours wins, and a block no theme fully contains is *mixed* — the one
 * thing the contract forbids, because it means the figure has two accents and two grounds' worth of
 * assumptions.
 */
function themeFit(hexes) {
  const real = hexes.filter((h) => !NEUTRALS.has(h));
  if (!real.length) return { theme: '—', score: 0, total: 0 };
  let best = { theme: THEMES[0].id, score: -1 };
  for (const t of THEMES) {
    const n = real.filter((h) => THEME_VALUES.get(t.id).has(h)).length;
    if (n > best.score) best = { theme: t.id, score: n };
  }
  return { ...best, total: real.length };
}

const bump = (map, key, by = 1) => map.set(key, (map.get(key) ?? 0) + by);
const engineStats = (engine) => {
  if (!perEngine.has(engine)) perEngine.set(engine, { engine, blocks: 0, withPalette: 0, offPalette: 0 });
  return perEngine.get(engine);
};

for (const file of walk(EXAMPLES)) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(EXAMPLES, file);
  mdVars += (text.match(/var\(--md-[a-z-]+\)/g) ?? []).length;
  rgba += (text.match(/rgba\(/g) ?? []).length;

  // Fenced diagram blocks.
  const re = /```([a-z-]+)\n([\s\S]*?)```/g;
  let m;
  let fileOff = 0;
  while ((m = re.exec(text))) {
    const engine = ENGINES[m[1]];
    if (!engine) continue;
    const block = m[2];
    totalBlocks++;
    const stats = engineStats(engine);
    stats.blocks++;
    const hexes = [...new Set((block.match(/#[0-9a-fA-F]{6}/g) ?? []).map((h) => h.toLowerCase()))];
    const inPalette = hexes.filter((h) => paletteValues.has(h));
    const off = hexes.filter((h) => !paletteValues.has(h) && !NEUTRALS.has(h));
    if (inPalette.length >= 3) stats.withPalette++;
    // Which theme is this block written in?
    const fit = themeFit(hexes);
    if (fit.total) {
      if (fit.score === fit.total) bump(themeUse, fit.theme);
      else {
        mixedBlocks++;
        bump(mixedFiles, `${rel} [${fit.theme} ${fit.score}/${fit.total}]`);
      }
    }
    for (const h of off) {
      bump(offPalette, h);
      stats.offPalette++;
      fileOff++;
    }
  }

  // Bare-HTML cards: no fence, so literal colours are counted from the whole file.
  if (!text.includes('```') && text.includes('<')) {
    cards++;
    const off = [...new Set((text.match(/#[0-9a-fA-F]{6}/g) ?? []).map((h) => h.toLowerCase()))].filter(
      (h) => !paletteValues.has(h) && !NEUTRALS.has(h),
    );
    cardOffPalette += off.length;
    for (const h of off) bump(offPalette, h);
  }
  if (fileOff) worstFiles.push({ file: rel, off: fileOff });
}

worstFiles.sort((a, b) => b.off - a.off);
const engines = [...perEngine.values()].sort((a, b) => b.blocks - a.blocks);
const offTotal = [...offPalette.values()].reduce((a, b) => a + b, 0);
const topHex = [...offPalette.entries()].sort((a, b) => b[1] - a[1]);

if (JSON_OUT) {
  console.log(JSON.stringify({
    themes: { count: THEMES.length, values: paletteValues.size, inUse: Object.fromEntries(themeUse), mixedBlocks },
    blocks: totalBlocks, cards,
    offPalette: { distinct: offPalette.size, occurrences: offTotal, top: topHex.slice(0, 10) },
    hostDocumentRefs: { mdVars, rgba },
    engines,
    worstFiles: worstFiles.slice(0, 15),
  }, null, 2));
} else {
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`themes: ${THEMES.length} · values in play: ${paletteValues.size} · fenced blocks: ${totalBlocks} · bare-HTML cards: ${cards}`);
  console.log(`${pad('ENGINE', 12)} ${pad('BLOCKS', 7)} ${pad('THEMED', 8)} ${pad('OFF-THEME', 11)}`);
  console.log('-'.repeat(66));
  for (const e of engines) {
    console.log(`${pad(e.engine, 12)} ${pad(e.blocks, 7)} ${pad(e.withPalette, 8)} ${pad(e.offPalette, 11)}`);
  }
  console.log('-'.repeat(66));
  console.log(`theme in use: ${THEMES.map((t) => `${t.id} ${themeUse.get(t.id) ?? 0}`).join(' · ')}`);
  console.log(`off-theme literals: ${offTotal} occurrences · ${offPalette.size} distinct` + (cardOffPalette ? ` (incl. ${cardOffPalette} in cards)` : ''));
  console.log(`mixed-theme blocks: ${mixedBlocks}${mixedBlocks ? ' — a figure must stay in one theme' : ''}`);
  console.log(`host-document references: ${mdVars} × var(--md-*) · ${rgba} × rgba() veils (veils are neutral)`);
  if (topHex.length) {
    console.log('\nmost-used off-palette colours:');
    for (const [hex, n] of topHex.slice(0, 12)) console.log(`  ${hex} × ${n}`);
  }
  if (worstFiles.length) {
    console.log('\nbiggest files:');
    for (const f of worstFiles.slice(0, 10)) console.log(`  ${String(f.off).padStart(3)}  ${f.file}`);
  }
  if (mixedFiles.size) {
    console.log('\nmixed-theme blocks:');
    for (const f of [...mixedFiles.keys()].slice(0, 12)) console.log(`  ${f}`);
  }
  if (mdVars) console.log(`\n${mdVars} × var(--md-*) — cards must be literal, the theme does not follow the host document`);
  const bad = offTotal + mixedBlocks + mdVars;
  console.log(
    STRICT && bad ? '\nFAIL (--strict): off-theme literals, mixed themes or host-document references remain'
      : STRICT ? '\nOK (--strict)'
        : '\nreport only — `--strict` turns this into the theme-usage gate',
  );
}
process.exit(STRICT && (offTotal + mixedBlocks + mdVars) ? 1 : 0);
