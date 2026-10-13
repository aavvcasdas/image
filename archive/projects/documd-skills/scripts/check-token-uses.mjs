#!/usr/bin/env node
/**
 * Token use-class gate — does every colour literal sit in a role its token allows?
 *
 *   node skills/scripts/check-token-uses.mjs
 *   node skills/scripts/check-token-uses.mjs --json
 *
 * The contract's central table is `may be used as` (text · line · fill). Nothing checked it: the
 * usage gate only asks whether a colour belongs to *some* theme, so a **text-only** token used as a
 * line passed. Measured, before this gate existed: 5 graph examples set `edge [color="#4b5563", …]`,
 * and `#4b5563` is `ink-soft` (text on a page) — it silently overrode the block's own edge colour.
 *
 * **How a role is decided.** Only syntax that *names* the role is classified:
 *
 *   plantuml      `skinparam <X>BackgroundColor` → fill · `<X>BorderColor` / `ArrowColor` → line ·
 *                 `<X>FontColor` / `DefaultFontColor` → text
 *   infographic   `colorPrimary` and `palette` entries → fill
 *   echarts/vega* the JSON key path, via `JSON_ROLE_RULES` below
 *   css           `background*` → fill · `border*` / `outline` → line · `color` → text
 *
 * Anything else is **unclassified**, not assumed: it is counted, listed, and it fails the gate. That
 * is deliberate — a colour whose role cannot be named is a hole in this gate, and the rollout this
 * belongs to kept shipping holes because a check returned silently instead of saying so.
 *
 * **Theme attribution is deliberately not done here.** Which theme a block is written in is
 * `check-palette-usage.mjs`'s question, and answering it twice is how two gates come to disagree.
 * Instead every theme's claim on a value is unioned: a use is a violation only when **no** theme
 * allows that role for that value. That is sound (it cannot invent a violation) and exact whenever
 * the value belongs to one theme — reported as `shared` so the loss of precision is visible.
 */
import fs from 'node:fs';
import path from 'node:path';

import { readAllThemes } from './lib/themes.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const EXAMPLES = path.join(ROOT, 'skills/documd-visuals/examples');
const THEME_DIR = path.join(ROOT, 'skills/documd-visuals/styles/themes');
const JSON_OUT = process.argv.includes('--json');

/** `#fff` / `#000` are neutral by definition; whether they belong is the usage gate's question. */
const NEUTRALS = new Set(['#ffffff', '#fff', '#000000', '#000']);

/** fenced language → engine */
const FENCES = {
  plantuml: 'plantuml',
  puml: 'plantuml',
  echarts: 'echarts',
  'vega-lite': 'vega-lite',
  vega: 'vega',
  infographic: 'infographic',
  css: 'css',
};

/**
 * JSON key paths that carry a colour, and the role each names. Ordered: the specific keys come
 * first, because `series.itemStyle.borderColor` also ends in `Color`.
 *
 * An unmatched path is an error, not a default. Measured corpus paths (2026-09-22): echarts
 * `color` · `series.itemStyle.{color,color0,borderColor,borderColor0}` · `series.lineStyle.color` ·
 * `data.itemStyle.color` · `visualMap.inRange.color` · `markLine.lineStyle.color` ·
 * `markLine.label.color` · `radar.axisName.color`; vega `scales.range` ·
 * `{enter,update}.{fill,stroke}.value` · `title.{color,subtitleColor}`; vega-lite
 * `config.range.category` · `color.scale.range` · `encoding.color.value` ·
 * `color.condition.value` · `{layer,}mark.color` · `mark.line.color` · `vconcat.mark.color`.
 */
const JSON_ROLE_RULES = [
  // A **text mark** paints ink, not a shape fill: `marks.<text>.encode.enter.fill.value`,
  // `mark.<text>.color`. Same property name, opposite role — a surface token here is an invisible
  // label, which is exactly the failure this gate exists to catch.
  [/(^|\.)<text>\..*?(fill|color)(\.value)?$/, 'text'],
  // A line is the more specific reading, so those rules come first: `series.itemStyle.borderColor`
  // also ends in `Color`, and `mark.line.color` also contains `mark`.
  [/(^|\.)(borderColor0?|lineStyle\.color|stroke\.value)$/, 'line'],
  [/(^|\.)mark\.line\.color$/, 'line'],
  [/(^|\.)(label\.color|axisName\.color|title\.color|title\.subtitleColor)$/, 'text'],
  [/^(color|color0)$/, 'fill'],
  [/(^|\.)(itemStyle\.color0?|inRange\.color|condition\.value)$/, 'fill'],
  [/(^|\.)(mark\.color|encoding\.color\.value|fill\.value)$/, 'fill'],
  [/(^|\.)range(\.category)?$/, 'fill'],
];

/**
 * CSS `fill:` paints ink when the selector's class is used on an SVG `<text>` element in the same
 * block, and a shape fill otherwise. Read from the markup rather than assumed: `fill` is the one
 * property whose role depends on the element it lands on.
 */
function cssFillPaintsText(body, line) {
  const cls = line.slice(0, line.indexOf('{')).match(/\.([a-z0-9_-]+)/i)?.[1];
  return cls ? new RegExp(`<text[^>]*class="[^"]*\\b${cls}\\b`, 'i').test(body) : false;
}

/** CSS property → role. `background`/`border` prefixes are matched, so shorthands are covered. */
function cssRole(prop) {
  const p = prop.toLowerCase();
  if (p === 'color') return 'text';
  if (p === 'fill') return 'fill';
  if (p.startsWith('background')) return 'fill';
  if (p.startsWith('border') || p.startsWith('outline') || p === 'stroke' || p === 'box-shadow') return 'line';
  return null;
}

/** plantuml skinparam suffix → role. */
function plantumlRole(key) {
  const k = key.toLowerCase();
  if (k.endsWith('backgroundcolor')) return 'fill';
  if (k.endsWith('bordercolor') || k.endsWith('arrowcolor') || k.endsWith('linecolor')) return 'line';
  if (k.endsWith('fontcolor')) return 'text';
  return null;
}

const HEX = /#[0-9a-fA-F]{6}/g;

/**
 * Every colour literal in one body, with the role its syntax names (`null` = unclassified).
 * @returns {{hex:string, role:string|null, where:string}[]}
 */
function occurrences(engine, body) {
  const out = [];
  const push = (hex, role, where) => out.push({ hex: hex.toLowerCase(), role, where });

  if (engine === 'plantuml') {
    for (const line of body.split('\n')) {
      for (const m of line.matchAll(/skinparam\s+(\S+)\s+(#[0-9a-fA-F]{6})/gi)) push(m[2], plantumlRole(m[1]), line.trim());
      // An element suffix (`#fill;line:border;text:ink`) names its roles too.
      for (const m of line.matchAll(/#([0-9a-fA-F]{6})\s*;\s*line\s*:\s*([0-9a-fA-F]{6})/gi)) {
        push(`#${m[1]}`, 'fill', line.trim());
        push(`#${m[2]}`, 'line', line.trim());
      }
      for (const m of line.matchAll(/;\s*text\s*:\s*([0-9a-fA-F]{6})/gi)) push(`#${m[1]}`, 'text', line.trim());
      for (const m of line.matchAll(/<<\s*(#[0-9a-fA-F]{6})\s*>>/g)) push(m[1], 'fill', line.trim());
      // An element *declaration* suffix — `package "Ops" as ops #f8fafc {` — names a fill, with or
      // without the `;line:` half the rule above already classified.
      for (const m of line.matchAll(/^\s*(?:rectangle|class|package|component|node|cloud|database|folder|usecase|actor|state|artifact|entity|object|interface|enum)\b[^#]*#([0-9a-fA-F]{6})/gi)) {
        const hex = `#${m[1]}`.toLowerCase();
        if (!out.some((o) => o.hex === hex && o.where === line.trim())) push(hex, 'fill', line.trim());
      }
      // An arrow colour — `A -[#hex]-> B`, with optional style flags (`-[#hex,dashed]->`) — names a
      // line. The `#fill;line:border` form used on nodes does not apply to arrows.
      for (const m of line.matchAll(/\[#([0-9a-fA-F]{6})(?:\s*,\s*[a-z]+)*\]/gi)) {
        const hex = `#${m[1]}`.toLowerCase();
        if (!out.some((o) => o.hex === hex && o.where === line.trim())) push(hex, 'line', line.trim());
      }
    }
    // Anything left over: a hex on a line no rule above recognised.
    for (const line of body.split('\n')) {
      for (const m of line.matchAll(HEX)) {
        if (!out.some((o) => o.hex === m[0].toLowerCase() && o.where === line.trim())) push(m[0], null, line.trim());
      }
    }
    return out;
  }


  if (engine === 'infographic') {
    for (const line of body.split('\n')) {
      const t = line.trim();
      if (/^colorPrimary\b/.test(t)) {
        for (const m of t.matchAll(HEX)) push(m[0], 'fill', t);
      } else if (/^-\s*#/.test(t)) {
        for (const m of t.matchAll(HEX)) push(m[0], 'fill', t);
      } else {
        for (const m of t.matchAll(HEX)) push(m[0], null, t);
      }
    }
    return out;
  }

  if (engine === 'css') {
    for (const line of body.split('\n')) {
      let matched = false;
      for (const m of line.matchAll(/([a-z-]+)\s*:\s*[^;{}]*?(#[0-9a-fA-F]{6})/gi)) {
        const prop = m[1].toLowerCase();
        const role = prop === 'fill' && cssFillPaintsText(body, line) ? 'text' : cssRole(prop);
        push(m[2], role, line.trim());
        matched = true;
      }
      // Inline SVG presentation attributes — `stroke="#hex"`, `fill="#hex"` — name their role the
      // same way the CSS properties do; `fill="none"` carries no colour and is skipped.
      for (const m of line.matchAll(/\bstroke="(#[0-9a-fA-F]{6})"/gi)) {
        push(m[1], 'line', line.trim());
        matched = true;
      }
      for (const m of line.matchAll(/\bfill="(#[0-9a-fA-F]{6})"/gi)) {
        push(m[1], /<text\b/i.test(line) ? 'text' : 'fill', line.trim());
        matched = true;
      }
      if (!matched) for (const m of line.matchAll(HEX)) push(m[0], null, line.trim());
    }
    return out;
  }

  // JSON engines.
  let spec;
  try {
    spec = JSON.parse(body);
  } catch {
    for (const line of body.split('\n')) for (const m of line.matchAll(HEX)) push(m[0], null, line.trim());
    return out;
  }
  const at = [];
  const walk = (node) => {
    if (typeof node === 'string') {
      if (/^#[0-9a-fA-F]{6}$/.test(node)) {
        const joined = at.filter((s) => s !== '[]').join('.');
        const rule = JSON_ROLE_RULES.find(([re]) => re.test(joined));
        if (!rule) throw new Error(`${engine}: colour at path \`${joined}\` has no role rule — add one to JSON_ROLE_RULES`);
        push(node, rule[1], joined || '(root)');
      }
      return;
    }
    if (Array.isArray(node)) {
      at.push('[]');
      for (const v of node) walk(v);
      at.pop();
      return;
    }
    if (node && typeof node === 'object') {
      // A **text mark** is the one case where a colour's role is not what its property name says: its
      // `fill` / `color` is ink, not a shape fill. Carry that into the path as `<text>` so a rule can
      // see it — every other mark type keeps the property's own reading, and its path unchanged.
      // Vega marks have `encode`/`from`; a Vega-Lite `mark` object is the value of a `mark` key.
      const isTextMark =
        node.type === 'text' && (node.encode || node.from || at.at(-1) === 'mark');
      if (isTextMark) at.push('<text>');
      for (const [k, v] of Object.entries(node)) {
        at.push(k);
        walk(v);
        at.pop();
      }
      if (isTextMark) at.pop();
    }
  };
  walk(spec);
  return out;
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

// ---------------------------------------------------------------- the index
/**
 * value → the roles any theme grants it. Derived tints and shades are not tokens: the contract
 * fixes their roles (a tint is a fill, a shade is a line), so they are added as such.
 */
const themes = readAllThemes(THEME_DIR);
const index = new Map();
const claim = (hex, theme, name, roles) => {
  if (!index.has(hex)) index.set(hex, { roles: { text: false, line: false, fill: false }, owners: [] });
  const e = index.get(hex);
  for (const r of ['text', 'line', 'fill']) if (roles[r]) e.roles[r] = true;
  e.owners.push(`${theme.id}:${name}`);
};
for (const t of themes) {
  for (const tok of t.tokens.values()) claim(tok.value, t, tok.token, { text: tok.text, line: tok.line, fill: tok.fill });
  for (const [family, d] of t.derived) {
    if (d.tint) claim(d.tint, t, `tint-${family}`, { text: false, line: false, fill: true });
    if (d.shade) claim(d.shade, t, `shade-${family}`, { text: false, line: true, fill: false });
  }
}

// ---------------------------------------------------------------- the sweep
const perEngine = new Map();
const violations = [];
const unclassified = [];
let total = 0;
let skipped = 0;
let shared = 0;

const stat = (engine) => {
  if (!perEngine.has(engine)) perEngine.set(engine, { engine, occurrences: 0, checked: 0, violations: 0, unclassified: 0 });
  return perEngine.get(engine);
};

function sweep(engine, body, rel, lineHint) {
  const s = stat(engine);
  for (const o of occurrences(engine, body)) {
    total++;
    s.occurrences++;
    if (NEUTRALS.has(o.hex) || !index.has(o.hex)) {
      skipped++;
      continue;
    }
    const entry = index.get(o.hex);
    if (entry.owners.length > 1) shared++;
    if (!o.role) {
      s.unclassified++;
      unclassified.push({ engine, file: rel, hex: o.hex, where: o.where, line: lineHint });
      continue;
    }
    s.checked++;
    if (!entry.roles[o.role]) {
      s.violations++;
      violations.push({
        engine,
        file: rel,
        hex: o.hex,
        role: o.role,
        where: o.where,
        owners: entry.owners,
        allows: ['text', 'line', 'fill'].filter((r) => entry.roles[r]),
      });
    }
  }
}

for (const file of walk(EXAMPLES)) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(EXAMPLES, file);
  const re = new RegExp('```(' + Object.keys(FENCES).join('|') + ')\\n([\\s\\S]*?)```', 'g');
  let sawFence = false;
  for (const m of text.matchAll(re)) {
    sawFence = true;
    sweep(FENCES[m[1]], m[2], rel, null);
  }
  // A bare-HTML card carries no fence; its `<style>` is read from the whole file.
  if (!sawFence && text.includes('<')) sweep('css', text, rel, null);
}

// ---------------------------------------------------------------- report
const rows = [...perEngine.values()].sort((a, b) => b.occurrences - a.occurrences);

if (JSON_OUT) {
  console.log(JSON.stringify({ themes: themes.map((t) => t.id), total, skipped, shared, engines: rows, violations, unclassified }, null, 2));
  process.exit(violations.length || unclassified.length ? 1 : 0);
}

const pad = (s, n) => String(s).padEnd(n);
console.log(`themes: ${themes.length} · colour literals: ${total} · theme values checked: ${total - skipped} · not a theme value: ${skipped} · value shared by >1 theme: ${shared}`);
console.log(`${pad('ENGINE', 12)} ${pad('LITERALS', 9)} ${pad('CHECKED', 8)} ${pad('UNCLASS', 8)} VIOLATIONS`);
console.log('-'.repeat(60));
for (const r of rows) {
  console.log(`${pad(r.engine, 12)} ${pad(r.occurrences, 9)} ${pad(r.checked, 8)} ${pad(r.unclassified, 8)} ${r.violations}`);
}

if (violations.length) {
  console.log(`\n${violations.length} use(s) a token does not allow:`);
  for (const v of violations.slice(0, 40)) {
    console.log(`  ${v.file} [${v.engine}] ${v.hex} used as ${v.role} — ${v.owners.join(', ')} allow${v.allows.length === 1 ? 's' : ''} ${v.allows.join('/') || 'nothing'}`);
    console.log(`      ${v.where.slice(0, 120)}`);
  }
  if (violations.length > 40) console.log(`  … ${violations.length - 40} more`);
}

if (unclassified.length) {
  console.log(`\n${unclassified.length} colour(s) whose role this gate cannot name (a hole — teach it the syntax):`);
  for (const u of unclassified.slice(0, 40)) console.log(`  ${u.file} [${u.engine}] ${u.hex} — ${u.where.slice(0, 120)}`);
  if (unclassified.length > 40) console.log(`  … ${unclassified.length - 40} more`);
}

const bad = violations.length + unclassified.length;
console.log(bad ? `\nFAIL — ${violations.length} violation(s) · ${unclassified.length} unclassified` : '\nOK — every named use is allowed by the token that carries the value');
process.exit(bad ? 1 : 0);
