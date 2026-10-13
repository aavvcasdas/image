#!/usr/bin/env node
/**
 * Run draw-uml's own style-support fixture suite through the **published** engine bundle
 * (`dist/cli/documd.js`), not through the workspace source.
 *
 * Why this exists
 * ---------------
 * `style-support-matrix.md` compares official PlantUML with the engine the extension actually
 * ships. That engine is bundled into `dist/cli/browser-renderer.js` **at build time**, so after
 * upgrading `@markdown-viewer/draw-uml` the CLI keeps running the previous copy until
 * `npm run build:cli`. That is how §10 of the matrix ("workspace version") came to disagree
 * with a later CLI measurement: the two runs were measuring different engines.
 *
 * The upstream suite (`draw-uml-dev/scripts/verify-style-fixtures.mjs`) runs in-process against
 * the workspace source via fibjs. This script replays the same fixture inputs and manifest
 * expectations against the bundled CLI, so a stale bundle or a packaging difference shows up as
 * a divergence between the two verdict tables.
 *
 * Usage
 *   node skills/research/plantuml/verify-fixtures.mjs [--dir <fixture dir>] [--json]
 *   DRAW_UML_FIXTURES=/path/to/fixtures/plantuml/style-support node ... verify-fixtures.mjs
 *
 * Default fixture dir: ~/works/draw-uml-dev/fixtures/plantuml/style-support
 *
 * Assertions supported here (subset of the upstream verifier — the rest need the JS API):
 *   noParseErrors · notEmpty · noSilentDrop · hasLabels · hasCellIds · cellStyles ·
 *   legalColorCells · forbidColorTokens · svgColors · svgPatterns · minSvgSize ·
 *   sameAs · differsFrom
 * Assertions that need `onDiagnostic` (minWarnings / maxWarnings / warningCodes) are reported as
 * SKIP: the CLI does not surface renderer diagnostics at all, so they cannot be checked from
 * outside. Verdict = FAIL when an invariant is broken, TODO when a target is still unmet, else
 * PASS — the same three levels the upstream verifier uses.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..'); // skills/
const CLI = path.join(ROOT, '..', 'dist', 'cli', 'documd.js');
const EMPTY_BYTES = 600; // this engine's empty diagram is 342 B

function opt(name, dflt) {
  const i = process.argv.indexOf(name);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : dflt;
}

const JSON_OUT = process.argv.includes('--json');
const DIR = path.resolve(
  opt('--dir', process.env.DRAW_UML_FIXTURES ?? path.join(os.homedir(), 'works/draw-uml-dev/fixtures/plantuml/style-support')),
);
const MANIFEST = path.join(DIR, 'expectations.json');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'uml-fixtures-'));

// ---------------------------------------------------------------- normalisation

/** `rgb(r, g, b)` → `#rrggbb`, lowercase — the engine emits both spellings. */
const norm = (s) => s.replace(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g, (_, r, g, b) =>
  `#${[r, g, b].map((v) => (+v).toString(16).padStart(2, '0')).join('')}`).toLowerCase();

const LEGAL_COLOR = /^#[0-9a-f]{3}$|^#[0-9a-f]{6}$/;
const decodeXml = (s) => s.replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const collapse = (s) => s.replace(/\s+/g, ' ').trim();

/** mxCell id → { value, style } — the DrawIO side of the assertion set. */
function parseCells(xml) {
  const cells = new Map();
  for (const m of xml.matchAll(/<mxCell\b([^>]*)>/g)) {
    const attrs = m[1];
    const id = attrs.match(/\bid="([^"]*)"/)?.[1];
    if (!id) continue;
    const value = decodeXml(attrs.match(/\bvalue="([^"]*)"/)?.[1] ?? '');
    const style = new Map();
    // DrawIO styles are `key=value;key=value`, but `key:value` also appears — accept both.
    for (const part of (attrs.match(/\bstyle="([^"]*)"/)?.[1] ?? '').split(';')) {
      const sep = part.search(/[=:]/);
      if (sep > 0) style.set(part.slice(0, sep).trim(), part.slice(sep + 1).trim());
    }
    cells.set(id, { value, style });
  }
  return cells;
}

function svgBox(svg) {
  const tag = svg.match(/<svg\b[^>]*>/)?.[0] ?? '';
  const w = Number(tag.match(/\bwidth="([\d.]+)/)?.[1] ?? NaN);
  const h = Number(tag.match(/\bheight="([\d.]+)/)?.[1] ?? NaN);
  return { w, h };
}

// ------------------------------------------------------------------- rendering

function render(file, to) {
  const src = path.join(DIR, file);
  if (!fs.existsSync(src)) return { error: `fixture missing: ${src}` };
  const out = path.join(TMP, `${path.basename(file, '.puml')}.${to}`);
  fs.rmSync(out, { force: true });
  try {
    execFileSync('node', [CLI, src, out], { stdio: 'pipe', timeout: 120000 });
  } catch (err) {
    return { error: `CLI exit ${err.status ?? '?'}: ${(err.stderr ?? '').toString().trim().slice(0, 200)}` };
  }
  if (!fs.existsSync(out)) return { error: 'CLI produced no output file' };
  return { text: fs.readFileSync(out, 'utf8') };
}

// ------------------------------------------------------------------ assertions

const EVAL = {
  noParseErrors: (_e, c) => ({
    ok: !c.svgError && !/syntax error/i.test(c.svg) && c.svg.length >= EMPTY_BYTES,
    detail: c.svgError || `svg=${c.svg.length}B`,
  }),
  notEmpty: (_e, c) => {
    const { w, h } = svgBox(c.svg);
    return { ok: c.svg.length >= EMPTY_BYTES && !(w === 100 && h === 100), detail: `${c.svg.length}B ${w}×${h}` };
  },
  noSilentDrop: (_e, c) => ({ ok: c.svg.length >= EMPTY_BYTES, detail: `${c.svg.length}B` }),
  hasLabels: (want, c) => {
    const hit = want.filter((v) => [...c.cells.values()].some((cell) => cell.value.includes(v)) || norm(c.svg).includes(norm(v)));
    return { ok: hit.length === want.length, detail: `${hit.length}/${want.length} found${hit.length === want.length ? '' : ` — missing ${want.filter((v) => !hit.includes(v)).join(', ')}`}` };
  },
  hasCellIds: (want, c) => {
    const hit = want.filter((id) => c.cells.has(id));
    return { ok: hit.length === want.length, detail: `${hit.length}/${want.length} present${hit.length === want.length ? '' : ` — missing ${want.filter((id) => !hit.includes(id)).join(', ')}`}` };
  },
  cellStyles: (want, c) => {
    const bad = [];
    const excused = [];
    for (const [id, props] of Object.entries(want)) {
      const cell = c.cells.get(id);
      if (!cell) { bad.push(`${id} missing`); continue; }
      for (const [k, v] of Object.entries(props)) {
        const got = cell.style.get(k);
        if (norm(String(got)) === norm(String(v))) continue;
        const key = `${id}.${k}`;
        const ex = RENDER_OPTION_DIFFS.find(([file, k2]) => file === c.file && k2 === key);
        if (ex) excused.push(`N/A ${key}: ${got} ≠ ${v} — ${ex[2]}`);
        else bad.push(`${key}: ${got ?? '∅'} ≠ ${v}`);
      }
    }
    return { ok: bad.length === 0, detail: [...bad, ...excused].join('; ') || 'all match' };
  },
  legalColorCells: (ids, c) => {
    const bad = [];
    for (const id of ids) {
      const cell = c.cells.get(id);
      if (!cell) { bad.push(`${id} missing`); continue; }
      for (const k of ['fillColor', 'strokeColor', 'fontColor']) {
        const v = cell.style.get(k);
        if (v === undefined) continue;
        if (!LEGAL_COLOR.test(norm(v))) bad.push(`${id}.${k}="${v}"`);
      }
    }
    return { ok: bad.length === 0, detail: bad.join('; ') || 'legal' };
  },
  forbidColorTokens: (tokens, c) => {
    const hay = norm(c.svg + c.xml);
    const hit = tokens.filter((t) => hay.includes(norm(t)));
    return { ok: hit.length === 0, detail: hit.length ? `leaked ${hit.join(', ')}` : 'absent' };
  },
  svgColors: (want, c) => {
    const hay = norm(c.svg);
    const hit = want.filter((t) => hay.includes(norm(t)));
    return { ok: hit.length === want.length, detail: `${hit.length}/${want.length} present${hit.length === want.length ? '' : ` — missing ${want.filter((t) => !hit.includes(t)).join(', ')}`}` };
  },
  svgPatterns: (want, c) => {
    const hit = want.filter((p) => c.svg.includes(p));
    return { ok: hit.length === want.length, detail: `${hit.length}/${want.length} matched${hit.length === want.length ? '' : ` — missing ${want.filter((p) => !hit.includes(p)).map((p) => JSON.stringify(p)).join(', ')}`}` };
  },
  minSvgSize: (want, c) => {
    const { w, h } = svgBox(c.svg);
    const ok = !(w < want.width) && !(h < want.height);
    return { ok, detail: `${w}×${h} vs ≥${want.width}×${want.height}` };
  },
  // `sameAs` / `differsFrom` need every case rendered first — resolved in a second pass.
  // A reference that points at an `inlineCases` entry cannot be resolved here: SKIP it.
  sameAs: (other, c) => (c.sameAs === UNRESOLVED
    ? { ok: true, skip: true, detail: c.sameAsNote }
    : { ok: c.sameAs === other, detail: c.sameAsNote ?? `vs ${other}` }),
  differsFrom: (other, c) => (c.differsFrom === UNRESOLVED
    ? { ok: true, skip: true, detail: c.differsFromNote }
    : { ok: c.differsFrom === other, detail: c.differsFromNote ?? `vs ${other}` }),
};

const UNRESOLVED = '__unresolved__';

const UNSUPPORTED = new Set(['minWarnings', 'maxWarnings', 'warningCodes']);

/**
 * The fixture baseline renders with `{ fontSize: 16, fontFamily: 'Times New Roman, serif' }`
 * (`scripts/verify-style-fixtures.mjs`, `RENDER_THEME`), while the viewer/CLI renders diagrams at
 * `fontSize: 12`. Every theme-derived number is therefore 0.75× in the CLI output
 * (fontSize 12 vs 16 · arcSize 10 vs 13.3333 · strokeWidth 1 vs 1.3333 · spacingTop 2 vs 3).
 * Multipliers are unaffected, which is what these cases are about, so the absoute-value
 * assertions below are excused with the ratio spelled out instead of being dropped silently.
 */
const RENDER_OPTION_DIFFS = [
  ['003c-color-suffix-divergence.puml', '_D3.strokeWidth',
    'render scale only — CLI fontSize 12 vs baseline 16: 1.3333→2.6666 vs 1→2, line.bold ×2 matches'],
];

function runAssertions(spec, ctx) {
  const out = [];
  for (const [key, expected] of Object.entries(spec ?? {})) {
    if (UNSUPPORTED.has(key)) { out.push({ key, ok: true, skip: true, detail: 'SKIP — needs onDiagnostic, CLI has no diagnostics channel' }); continue; }
    const fn = EVAL[key];
    if (!fn) { out.push({ key, ok: true, skip: true, detail: 'SKIP — assertion not implemented in this runner' }); continue; }
    out.push({ key, ...fn(expected, ctx) });
  }
  return out;
}

// ------------------------------------------------------------------------ main

if (!fs.existsSync(MANIFEST)) {
  console.error(`fixture manifest not found: ${MANIFEST}\nPass --dir or set DRAW_UML_FIXTURES.`);
  process.exit(2);
}
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const cases = Array.isArray(manifest.cases) ? manifest.cases.map((c, i) => [String(i), c]) : Object.entries(manifest.cases);

const rendered = new Map();
for (const [key, spec] of cases) {
  // DrawIO XML is only rendered when an assertion needs it — each CLI call costs real time.
  const needsXml = JSON.stringify(spec).match(/cellStyles|legalColorCells|hasCellIds|hasLabels|sameAs|differsFrom/);
  const svg = render(spec.file, 'svg');
  const xml = needsXml ? render(spec.file, 'drawio') : { text: '' };
  rendered.set(key, {
    key,
    file: spec.file,
    defect: spec.defect ?? '-',
    note: spec.note ?? '',
    official: spec.official ?? '',
    svg: svg.text ?? '',
    svgError: svg.error ?? '',
    xml: xml.text ?? '',
    cells: parseCells(xml.text ?? ''),
    xmlNeeded: Boolean(needsXml),
  });
}

// Second pass. `sameAs` / `differsFrom` live inside `invariant` / `target` (not at the top level)
// and compare normalised DrawIO XML across cases, so both sides are rendered on demand.
const normXml = new Map();
const xmlOf = (key) => {
  if (!normXml.has(key)) {
    const c = rendered.get(key);
    normXml.set(key, collapse(norm(!c ? '' : c.xml || render(c.file, 'drawio').text || '')));
  }
  return normXml.get(key);
};
const keyOfFile = (file) => cases.find(([, s]) => s.file === file)?.[0];

const results = [];
for (const [key, spec] of cases) {
  const c = rendered.get(key);
  const ctx = { ...c };
  const merged = { ...(spec.invariant ?? {}), ...(spec.target ?? {}) };
  for (const kind of ['sameAs', 'differsFrom']) {
    const other = merged[kind];
    if (!other) continue;
    const otherKey = keyOfFile(other);
    if (otherKey === undefined) {
      ctx[kind] = UNRESOLVED;
      ctx[`${kind}Note`] = `${other} is not a file case (inline case — not covered by this runner)`;
      continue;
    }
    const a = xmlOf(key);
    const b = xmlOf(otherKey);
    const equal = a === b;
    let i = 0;
    while (i < a.length && a[i] === b[i]) i++;
    ctx[`${kind}Note`] = equal
      ? `identical to ${other}`
      : `differs from ${other} at char ${i}: ${JSON.stringify(a.slice(i, i + 44))} vs ${JSON.stringify(b.slice(i, i + 44))}`;
    ctx[kind] = kind === 'sameAs' ? (equal ? other : '') : (equal ? '' : other);
  }
  const inv = runAssertions(spec.invariant, ctx);
  const tgt = runAssertions(spec.target, ctx);
  const verdict = (list) => (list.some((a) => !a.ok && !a.skip) ? 'fail' : 'ok');
  const v = verdict(inv) === 'fail' ? 'FAIL' : verdict(tgt) === 'fail' ? 'TODO' : 'PASS';
  results.push({ ...ctx, invariant: inv, target: tgt, verdict: v, svg: undefined, xml: undefined, cells: undefined });
}

const pad = (s, n) => String(s).padEnd(n);
const tally = results.reduce((a, r) => ((a[r.verdict] = (a[r.verdict] ?? 0) + 1), a), {});
const skips = results.flatMap((r) => [...r.invariant, ...r.target].filter((a) => a.skip)).length;

// Rendered files of non-PASS cases are kept for manual inspection.
const keep = results.filter((r) => r.verdict !== 'PASS').map((r) => path.join(TMP, path.basename(r.file, '.puml')));
if (!keep.length) fs.rmSync(TMP, { recursive: true, force: true });

if (JSON_OUT) {
  console.log(JSON.stringify({ dir: DIR, tally, skips, artifacts: keep, results }, null, 2));
} else {
  const engine = (() => {
    try { return JSON.parse(fs.readFileSync(path.join(ROOT, '..', 'node_modules/@markdown-viewer/draw-uml/package.json'), 'utf8')).version; } catch { return '?'; }
  })();
  console.log(`fixtures: ${DIR}`);
  console.log(`engine:   @markdown-viewer/draw-uml ${engine} via dist/cli/documd.js`);
  console.log(`${pad('CASE', 42)} ${pad('DEFECT', 7)} ${pad('VERDICT', 8)} EVIDENCE`);
  console.log('-'.repeat(110));
  for (const r of results) {
    const failed = [...r.invariant, ...r.target].filter((a) => !a.ok && !a.skip);
    const evidence = failed.length
      ? `${failed.map((a) => `${a.key}: ${a.detail}`).join(' | ')}${r.svgError ? ` [${r.svgError}]` : ''}`
      : r.official === 'error-image' ? 'invariants hold (official itself errors — see note)' : 'all assertions hold';
    console.log(`${pad(r.file, 42)} ${pad(r.defect, 7)} ${pad(r.verdict, 8)} ${evidence}`);
  }
  console.log('-'.repeat(110));
  console.log(`verdicts: ${JSON.stringify(tally)}   ·   skipped assertions: ${skips}`);
  if (keep.length) console.log(`\nrendered non-PASS cases kept in\n  ${TMP}`);
  console.log(`note: \`inlineCases\` (${manifest.inlineCases ? Object.keys(manifest.inlineCases).length : 0}) is not covered by this runner`);
}
