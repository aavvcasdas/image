#!/usr/bin/env node
/**
 * Block verification — renders every block in `documd-visuals/styles/themes/*.md` through the
 * shipped CLI and checks that the theme actually reaches the output.
 *
 *   node skills/scripts/verify-blocks.mjs            # every theme × engine
 *   node skills/scripts/verify-blocks.mjs --json
 *
 * A theme document is a deliverable that examples copy verbatim, so the document is the source:
 * the script extracts each fenced block, wraps it into something renderable for that engine, and
 * asserts that the theme's values survived the trip. Two block kinds, per engine:
 *
 *   plantuml — a **block** (has `skinparam`) is rendered with a body that exercises the
 *     elements it themes; the values it declares must appear *and* the engine defaults
 *     (`#f1f1f1` fill, `#add1b2` badge) must be gone. A **fragment** (element-suffix example, no
 *     `skinparam`) is rendered alone and every literal colour in it must land.
 *   infographic — the block is a `theme` block, rendered against two templates: a ramp template
 *     (`chart-pie-simple`), where every colour in the block must land, and a single-colour one
 *     (`sequence-steps-simple`), where `colorPrimary` must land. The engine's default accent
 *     `#ff356a` must be gone in both.
 *
 * A block that renders but leaves an engine default in place is a FAIL: that is exactly the
 * "silently ignored" class of bug this rollout must not ship. The same goes for a theme whose
 * values never reach the output — five themes that all render in the default theme's colours would
 * be worse than one palette.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { readAllThemes } from './lib/themes.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const CLI = path.join(ROOT, 'dist', 'cli', 'documd.js');
const DIR = path.join(ROOT, 'skills/documd-visuals/styles/themes');
const JSON_OUT = process.argv.includes('--json');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'blocks-'));

const THEMES = readAllThemes(DIR);

/**
 * Every legal colour of one theme: token values plus the derived tints and shades. A block may use
 * any of them; anything else is off-theme and the assertion below will not find it.
 */
function valuesOf(theme) {
  const out = {};
  for (const [name, t] of theme.tokens) out[name] = t.value;
  for (const [family, d] of theme.derived) {
    if (d.tint) out[`tint-${family}`] = d.tint;
    if (d.shade) out[`shade-${family}`] = d.shade;
  }
  return out;
}

/** plantuml bodies per diagram family — each contains every element kind its block themes. */
const PLANTUML_BODIES = {
  structure: ['rectangle R', 'component C', 'class K <<x>>', 'package P {', '  rectangle Inner', '}', 'note "n" as N1', 'R --> C'].join('\n'),
  sequence: ['participant A', 'participant B', 'A -> B : msg', 'note over A : n'].join('\n'),
  activity: ['start', ':step;', 'if (ok?) then (yes)', ':y;', 'endif', 'stop'].join('\n'),
};

const igChart = ['data', '  title T', '  values', ...Array.from({ length: 8 }, (_, i) => [`    - label I${i + 1}`, `      value ${8 - i}`]).flat()].join('\n');
const igMono = ['data', '  title T', '  sequences', '    - label One', '      desc first', '    - label Two', '      desc second', '    - label Three', '      desc third'].join('\n');

/** Eight nominal categories, the shape every chart ramp needs to exercise. */
const CATS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const jsonValues = `[${CATS.map((c, i) => `{ "c": "${c}", "v": ${i + 1} }`).join(', ')}]`;
/** Vega-Lite: the block is a JSON property, so it is wrapped as a spec key. */
const vlSpec = (block) => `{ ${block},
  "width": 420, "height": 240,
  "data": { "values": ${jsonValues} },
  "mark": "bar",
  "encoding": { "x": { "field": "c", "type": "nominal" }, "y": { "field": "v", "type": "quantitative" }, "color": { "field": "c", "type": "nominal" } } }`;
/** Pure Vega: the block is a scale object, wrapped into a band chart whose rects read it.
 *  The block carries the two placeholders the document prescribes (`<dataset>` / `<category field>`)
 *  so it cannot hard-code a dataset name; the gate substitutes the dataset it builds. */
const vgSpec = (block) => `{ "$schema": "https://vega.github.io/schema/vega/v6.json", "width": 420, "height": 240,
  "data": [{ "name": "t", "values": ${jsonValues} }],
  "scales": [
    { "name": "x", "type": "band", "domain": { "data": "t", "field": "c" }, "range": "width", "padding": 0.1 },
    { "name": "y", "domain": { "data": "t", "field": "v" }, "range": "height", "nice": true },
    ${block.replaceAll('<dataset>', 't').replaceAll('<category field>', 'c')} ],
  "axes": [{ "orient": "bottom", "scale": "x" }, { "orient": "left", "scale": "y" }],
  "marks": [{ "type": "rect", "from": { "data": "t" }, "encode": { "enter": { "x": { "scale": "x", "field": "c" }, "width": { "scale": "x", "band": 1 }, "y": { "scale": "y", "field": "v" }, "y2": { "scale": "y", "value": 0 }, "fill": { "scale": "color", "field": "c" } } } }] }`;

/** Engines that know how to render a block from their theme document. */
const ENGINES = {
  plantuml: {
    ext: 'puml',
    /** @returns {{name:string, doc:string, expect:'palette'|'literals', body:string}[]} */
    variants: (block, isBlock) => {
      if (!isBlock) {
        const literals = (block.match(/#[0-9a-fA-F]{6}/g) ?? []).map((h) => h.toLowerCase());
        return [{ name: 'fragment', doc: `@startuml\n${block}\n@enduml`, expect: 'literals', body: literals.join(' ') }];
      }
      const family = /skinparam Activity/.test(block) ? 'activity' : /skinparam Participant/.test(block) ? 'sequence' : 'structure';
      return [{ name: family, doc: `@startuml\n${block}\n${PLANTUML_BODIES[family]}\n@enduml`, expect: 'palette', body: family }];
    },
    defaults: [['engine default fill #f1f1f1', '#f1f1f1'], ['engine default badge #add1b2', '#add1b2']],
  },
  infographic: {
    ext: 'infographic',
    variants: (block) => [
      { name: 'ramp (chart-pie-simple)', doc: `infographic chart-pie-simple\n${block}\n${igChart}\n`, expect: 'palette', body: 'chart' },
      { name: 'mono (sequence-steps-simple)', doc: `infographic sequence-steps-simple\n${block}\n${igMono}\n`, expect: 'primary', body: 'mono' },
    ],
    defaults: [['engine default accent #ff356a', '#ff356a']],
  },
  // Two shapes live under the `echarts` fence. The *ramp* block is a bare JSON property
  // (`"color": […]`), which a spec carries at its top level, so the gate wraps it into a document —
  // a pie is the shape that puts one colour on every data item. The *preview* is already a complete
  // spec, so wrapping it would produce nonsense; it renders as itself.
  echarts: {
    ext: 'echarts',
    variants: (block) => {
      if (/"series"\s*:/.test(block)) {
        return [{ name: 'complete figure', doc: block, expect: 'palette', body: 'figure' }];
      }
      return [{
        name: 'ramp (pie, 8 items)',
        doc: `{\n${block},\n"width": 640, "height": 320,\n"series": [{ "type": "pie", "radius": "70%", "data": [\n${Array.from({ length: 8 }, (_, i) => `  { "name": "I${i + 1}", "value": ${8 - i} }`).join(',\n')}\n] }]\n}`,
        expect: 'palette',
        body: 'pie',
      }];
    },
    defaults: [['engine default accent #5070dd', '#5070dd']],
  },
  'vega-lite': {
    ext: 'vl',
    variants: (block) => [{ name: 'ramp (8 nominal categories)', doc: vlSpec(block), expect: 'palette', body: 'vl' }],
    defaults: [['vega-lite default scheme #4c78a8', '#4c78a8']],
  },
  vega: {
    ext: 'vega',
    variants: (block) => [{ name: 'ramp (band chart, 8 bars)', doc: vgSpec(block), expect: 'palette', body: 'vg' }],
    defaults: [['vega default mark blue #4c78a8', '#4c78a8']],
  },
  // html-css has no diagram fence — a card is prose plus markup, so there is nothing to render.
  // Its blocks are checked statically instead: theme literals only, no host-document variable.
  css: {
    ext: null,
    isBlock: () => true,
    variants: () => [{ name: 'static (literals, no host variable)', static: true, body: 'css' }],
    defaults: [],
  },
};

/** Fences this gate knows how to render. A *diagram* fence outside this set is invisible to the
 *  gate, so seeing one is a failure — a typo in a fence name must not silently skip a document. */
const FENCES = ['plantuml', 'infographic', 'echarts', 'vega-lite', 'vega', 'css'];
const DIAGRAM_FENCES = ['plantuml', 'infographic', 'echarts', 'vega', 'vega-lite', 'vl', 'dl', 'html', 'html-css'];

function blocks() {
  const out = [];
  for (const theme of THEMES) {
    const file = path.basename(theme.file);
    const text = fs.readFileSync(theme.file, 'utf8');
    const all = [...text.matchAll(/```([a-z-]+)\n/g)].map((m) => m[1]);
    const unknown = [...new Set(all.filter((f) => DIAGRAM_FENCES.includes(f) && !FENCES.includes(f)))];
    if (unknown.length) out.push({ theme, file, index: 0, fence: unknown[0], block: '', unrecognised: true });
    const re = new RegExp('```(' + FENCES.join('|') + ')\n([\\s\\S]*?)```', 'g');
    let m;
    let i = 0;
    while ((m = re.exec(text))) out.push({ theme, file, index: ++i, fence: m[1], block: m[2].trimEnd() });
  }
  // Each fragment block is rendered in the context of the first full block of the same
  // theme+fence — an override only works on top of the block, which is how the docs read too.
  const defaults = (fence) => ENGINES[fence]?.isBlock ?? ((b) => /skinparam|theme|"color"|"config"|"ordinal"/.test(b));
  const firstBlock = new Map();
  for (const e of out) {
    const key = `${e.theme.id}|${e.fence}`;
    if (!e.unrecognised && defaults(e.fence)(e.block) && !firstBlock.has(key)) firstBlock.set(key, e.block);
  }
  for (const e of out) {
    if (!e.unrecognised && !defaults(e.fence)(e.block)) e.ctx = firstBlock.get(`${e.theme.id}|${e.fence}`);
  }
  return out;
}

function render(ext, doc) {
  const src = path.join(TMP, `p.${ext}`);
  const out = path.join(TMP, `p-${ext}.svg`);
  fs.writeFileSync(src, doc);
  fs.rmSync(out, { force: true });
  try {
    execFileSync('node', [CLI, src, out], { stdio: 'pipe', timeout: 120000 });
  } catch (err) {
    return { error: `CLI exit ${err.status ?? '?'}: ${(err.stderr ?? '').toString().trim().slice(0, 160)}` };
  }
  return { svg: fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '' };
}

/** A colour must appear as its own token, in either spelling. Non-hex needles (e.g. the graphviz
 *  keyword `black`) are matched as words, which is how a leaked engine default is detected. */
function appears(svg, needle) {
  if (!needle.startsWith('#')) return new RegExp(`\\b${needle}\\b`, 'i').test(svg);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(needle.slice(i, i + 2), 16));
  return svg.toLowerCase().includes(needle.toLowerCase()) || svg.includes(`rgb(${r}, ${g}, ${b})`);
}

const results = [];
for (const { theme, file, index, fence, block, ctx, unrecognised } of blocks()) {
  const PAL = valuesOf(theme);
  if (unrecognised) {
    results.push({ theme: theme.id, file, index: '—', engine: fence, variant: '—', verdict: 'FAIL', detail: `unrecognised fence \`${fence}\` — add it to FENCES so its blocks are actually checked` });
    continue;
  }
  const engine = ENGINES[fence];
  if (!engine) {
    results.push({ theme: theme.id, file, index, engine: fence, variant: '—', verdict: 'FAIL', detail: 'fence is listed in FENCES but has no renderer wired' });
    continue;
  }
  const isBlock = (engine.isBlock ?? ((b) => /skinparam|theme|"color"|"config"|"ordinal"/.test(b)))(block);
  for (const v of engine.variants(block, isBlock, ctx)) {
    const base = { theme: theme.id, file, index, engine: fence, variant: v.name };
    if (v.static) {
      // Static check (html-css). Two rules, both from the contract: a card is coloured from the
      // theme, and it does **not** follow the host document — so a viewer variable is a failure
      // here, not a convenience. `rgba(…)` veils are not inspected: they are neutral, not theme
      // colours.
      const vars = [...new Set([...block.matchAll(/var\(\s*--md-([a-z-]+)/g)].map((m) => m[1]))];
      const literals = [...new Set((block.match(/#[0-9a-fA-F]{6}/g) ?? []).map((h) => h.toLowerCase()))];
      const badColours = literals.filter((hex) => !Object.values(PAL).includes(hex));
      results.push({
        ...base,
        verdict: vars.length || badColours.length ? 'FAIL' : 'PASS',
        detail: [
          vars.length ? `follows the host document: --md-${vars.join(', --md-')}` : '',
          badColours.length ? `off-theme literal: ${badColours.join(', ')}` : '',
        ].filter(Boolean).join(' · ') || `${literals.length} theme literals`,
      });
      continue;
    }
    const { svg, error } = render(engine.ext, v.doc);
    if (error) {
      results.push({ ...base, verdict: 'FAIL', detail: error });
      continue;
    }
    if (v.expect === 'literals') {
      const missing = v.body.split(' ').filter((hex) => !appears(svg, hex));
      results.push({
        ...base,
        verdict: missing.length || svg.length < 600 ? 'FAIL' : 'PASS',
        detail: missing.length ? `literal not rendered: ${missing.join(', ')}`
          : svg.length < 600 ? `rendered empty (${svg.length} B)` : `${v.body.split(' ').length} literals rendered`,
      });
      continue;
    }
    // Which palette values must land: everything the block declares, or just its colorPrimary.
    // Values are matched without the `#` too — the plantuml blocks pass them through `!define`
    // aliases (`!define P_INK 1f2937`), where the `#` is illegal.
    const flat = block.toLowerCase();
    const declared = [...new Set(Object.values(PAL).filter((hex) => flat.includes(hex.slice(1))))];
    const mono = v.expect === 'primary';
    const primary = block.match(/colorPrimary\s+#?([0-9a-fA-F]{6})/)?.[1].toLowerCase();
    const wanted = mono ? (primary ? [`#${primary}`] : []) : declared;
    if (!wanted.length) throw new Error(`${file} #${index}: no palette value detected in the block — the assertion would be vacuous`);
    const missing = wanted.filter((hex) => !appears(svg, hex));
    const leaked = engine.defaults.filter(([, hex]) => appears(svg, hex)).map(([name]) => name);
    results.push({
      ...base,
      verdict: missing.length || leaked.length ? 'FAIL' : 'PASS',
      detail: [
        missing.length ? `missing palette values: ${missing.join(', ')}` : '',
        leaked.length ? `${leaked.join(', ')} still present` : '',
      ].filter(Boolean).join(' · ') || `${wanted.length} palette values present, no engine defaults`,
    });
  }
}

if (JSON_OUT) {
  console.log(JSON.stringify({ themes: THEMES.map((t) => t.id), blocks: results }, null, 2));
} else {
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`${pad('THEME', 11)} ${pad('BLK', 5)} ${pad('ENGINE', 12)} ${pad('VARIANT', 28)} ${pad('VERDICT', 8)} EVIDENCE`);
  console.log('-'.repeat(130));
  for (const r of results) {
    console.log(`${pad(r.theme, 11)} ${pad(`#${r.index}`, 5)} ${pad(r.engine, 12)} ${pad(r.variant, 28)} ${pad(r.verdict, 8)} ${r.detail}`);
  }
  console.log('-'.repeat(130));
  const fails = results.filter((r) => r.verdict === 'FAIL').length;
  const skips = results.filter((r) => r.verdict === 'SKIP').length;
  const perTheme = THEMES.map((t) => `${t.id} ${results.filter((r) => r.theme === t.id && r.verdict === 'PASS').length}/${results.filter((r) => r.theme === t.id).length}`);
  console.log(`themes: ${THEMES.length} (${perTheme.join(' · ')})`);
  console.log(`blocks: ${results.length} · failures: ${fails}${skips ? ` · skipped: ${skips}` : ''}`);
  if (!fails) fs.rmSync(TMP, { recursive: true, force: true });
  process.exit(fails ? 1 : 0);
}
