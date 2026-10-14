#!/usr/bin/env node
/**
 * PlantUML style-support probe — re-run after every draw-uml upgrade.
 *
 *   node skills/research/plantuml/probe-style-matrix.mjs            # both engines (slow)
 *   node skills/research/plantuml/probe-style-matrix.mjs --documd   # documd side only (fast)
 *   node skills/research/plantuml/probe-style-matrix.mjs --official # official side only
 *   node skills/research/plantuml/probe-style-matrix.mjs --json
 *   node skills/research/plantuml/probe-style-matrix.mjs --documd --save snapshots/x.json
 *   node skills/research/plantuml/probe-style-matrix.mjs --documd --diff snapshots/x.json
 *
 * Judging rules (style-support-matrix.md §2) — three, deliberately independent:
 *
 *   1. colour probes — a light sentinel only counts when it appears as a *legal colour token*.
 *      `rgb(r, g, b)` is normalised to `#rrggbb` first, and a token glued to another token
 *      (`#cde7ff##2e7dd1`) is NOT a hit: that glued value is the P0-2 defect (an illegal colour
 *      the renderer drops), not a working directive.
 *   2. structure probes — every probe is rendered twice, with and without its own directive, body
 *      unchanged; only that difference counts. Two earlier judge bugs lived here: all structure
 *      probes were compared against one global `rectangle R` baseline (so any probe with a
 *      different body looked "effective"), and colours were matched by whole-document substring
 *      search (so a glued colour token looked like a hit).
 *   3. empty diagrams — under 600 B means "rendered empty": this engine's empty diagram is always
 *      342 B at 100×100.
 *
 * There is deliberately no embedded "what it used to be" column: those baselines go stale the
 * moment the engine changes, which is exactly how §10 of the matrix came to disagree with a later
 * run. Use `--save` now and `--diff` after the next upgrade.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const CLI = path.join(ROOT, '..', 'dist', 'cli', 'documd.js');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'puml-probe-'));
const ONLY_DOCUMD = process.argv.includes('--documd');
const ONLY_OFFICIAL = process.argv.includes('--official');
const JSON_OUT = process.argv.includes('--json');
const opt = (name) => {
  const i = process.argv.indexOf(name);
  if (i < 0) return null;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : null;
};
const SAVE = opt('--save');
const DIFF = opt('--diff');

// Light sentinels: a dark sentinel (#112233) is a black blob in a small diagram, so a human
// checking the render cannot tell "coloured" from "uncoloured". Pairwise non-substring.
const FILL = '#cde7ff', BORDER = '#2e7dd1', TEXT = '#7a3e9d', BG = '#aabbcc', ARROW = '#e07b39', LIFE = '#2f9e68';
const EMPTY_BYTES = 600;

const probes = [];
/**
 * @param id       stable probe id (section + syntax), no sentinel in the id
 * @param directive the statement(s) under test — removed again for the baseline
 * @param body      diagram body; it MUST contain the element type the directive targets
 */
function probe(id, directive, body = '', extra = {}) {
  probes.push({
    id,
    kind: extra.kind ?? 'structure',
    sentinels: extra.sentinels ?? [],
    absent: extra.absent ?? [],
    puml: ['@startuml', directive, body, '@enduml'].filter((l) => l !== '').join('\n'),
    basePuml: ['@startuml', body, '@enduml'].filter((l) => l !== '').join('\n'),
  });
}
const color = (id, directive, body, sentinels, absent = []) => probe(id, directive, body, { kind: 'color', sentinels, absent });

// ------------------------------------------------------------- §4.1 global skinparam
const FLOW = 'rectangle R\nR --> S';
color('4.1 skinparam DefaultFontColor', `skinparam DefaultFontColor ${TEXT}`, FLOW, [TEXT]);
color('4.1 skinparam ArrowColor', `skinparam ArrowColor ${ARROW}`, FLOW, [ARROW]);
// Arrow labels live on class edges — a rectangle diagram does not exercise the label sub-cell.
color('4.1 skinparam ArrowFontColor', `skinparam ArrowFontColor ${TEXT}`, 'class A\nclass B\nA --> B : lbl', [TEXT]);
color('4.1 skinparam backgroundColor', `skinparam backgroundColor ${BG}`, FLOW, [BG]);
probe('4.1 skinparam ArrowThickness 5', 'skinparam ArrowThickness 5', 'rectangle A\nrectangle B\nA --> B');
probe('4.1 skinparam Padding 30', 'skinparam Padding 30', 'rectangle A\nrectangle B\nA --> B');
probe('4.1 skinparam DefaultFontSize 24', 'skinparam DefaultFontSize 24', 'rectangle "Some Label"');
probe('4.1 skinparam nodesep 200', 'skinparam nodesep 200', 'rectangle A\nrectangle B\nrectangle C\nA --> B\nA --> C');

// ---------------------------------------------------------- §4.2 element × property
const ELEMENTS = {
  Rectangle: 'rectangle R', Component: 'component C', Class: 'class K', Usecase: 'usecase U',
  Database: 'database D', Node: 'node N', Actor: 'actor A', State: '[*] --> S',
  Note: 'note "n" as N1', Artifact: 'artifact A', Cloud: 'cloud C', Folder: 'folder F',
  Package: 'package P {\n  rectangle R\n}', Participant: 'participant P\nP -> P : x',
};
for (const [type, body] of Object.entries(ELEMENTS)) {
  color(`4.2 ${type} BackgroundColor`, `skinparam ${type}BackgroundColor ${FILL}`, body, [FILL]);
  color(`4.2 ${type} BorderColor`, `skinparam ${type}BorderColor ${BORDER}`, body, [BORDER]);
  color(`4.2 ${type} FontColor`, `skinparam ${type}FontColor ${TEXT}`, body, [TEXT]);
}
color('4.2 SequenceLifeLineBorderColor', `skinparam SequenceLifeLineBorderColor ${LIFE}`, 'participant P\nP -> P : x', [LIFE]);

// ------------------------------------------------------- §4.3 nesting + stereotypes
color('4.3 rectangle { BackgroundColor }', `skinparam rectangle {\n  BackgroundColor ${FILL}\n}`, 'rectangle R', [FILL]);
color('4.3 rectangle<<tag>> { BackgroundColor }', `skinparam rectangle<<tag>> {\n  BackgroundColor ${FILL}\n}`, 'rectangle R <<tag>>', [FILL]);
color('4.3 stereotypeCBackgroundColor', `skinparam stereotypeCBackgroundColor ${FILL}`, 'class K <<stereo>>', [FILL]);
color('4.3 stereotypeCBorderColor', `skinparam stereotypeCBorderColor ${BORDER}`, 'class K <<stereo>>', [BORDER]);
// The type-badge family is letter-keyed in official PlantUML (measured 1.2026.6):
//   A abstract · C class · E enum · I interface — each honours <letter>BackgroundColor and
//   <letter>BackgroundColor+BorderColor; `<letter>FontColor` has no visible effect, and the
//   letter-less `stereotypeBackgroundColor` does nothing (it must stay `no` on both sides).
// draw-uml is implementing these; until it lands they read `no` here and flip to `yes` on the
// first run after the release (compare with `--diff snapshots/…`).
color('4.3 stereotypeCFontColor', `skinparam stereotypeCFontColor ${TEXT}`, 'class K <<stereo>>', [TEXT]);
color('4.3 stereotypeIBackgroundColor', `skinparam stereotypeIBackgroundColor ${FILL}`, 'interface I <<stereo>>', [FILL]);
color('4.3 stereotypeEBackgroundColor', `skinparam stereotypeEBackgroundColor ${FILL}`, 'enum E <<stereo>>', [FILL]);
color('4.3 stereotypeABackgroundColor', `skinparam stereotypeABackgroundColor ${FILL}`, 'abstract class B <<stereo>>', [FILL]);
color('4.3 stereotypeBackgroundColor (no letter)', `skinparam stereotypeBackgroundColor ${FILL}`, 'class K <<stereo>>', [FILL]);
// Priority (measured on official 1.2026.6): a per-element `<<(L,#hex)>>` spot beats the
// `stereotype<L>*` skinparam — the skinparam value must not appear in the output at all.
// NOTE: this row passes *trivially* while the family is unimplemented (the skinparam is a no-op,
// so only the custom colour can be present). It becomes a real assertion the moment the family
// lands — and it must stay `yes` then, otherwise the implemention let the skinparam win.
color('4.3 custom spot beats stereotypeC*', `skinparam stereotypeCBackgroundColor ${BORDER}\nclass A <<(C,${FILL})>>`, '', [FILL], [BORDER]);

// ------------------------------------------------------- §4.4 element colour suffixes
color('4.4 rectangle #fill', `rectangle R ${FILL}`, '', [FILL]);
color('4.4 rectangle ##border', `rectangle R ##${BORDER.slice(1)}`, '', [BORDER]);
color('4.4 rectangle #fill##border', `rectangle R ${FILL}##${BORDER.slice(1)}`, '', [FILL, BORDER]);
color('4.4 rectangle #fill ##border (spaced)', `rectangle R ${FILL} ##${BORDER.slice(1)}`, '', [FILL, BORDER]);
color('4.4 rectangle #line:;back:;text: (no #)', `rectangle R #line:${BORDER.slice(1)};back:${FILL.slice(1)};text:${TEXT.slice(1)}`, '', [FILL, BORDER, TEXT]);
color('4.4 rectangle #line:;back:;text: (# inside)', `rectangle R #line:${BORDER};back:${FILL};text:${TEXT}`, '', [FILL, BORDER, TEXT]);
color('4.4 rectangle legacy #f;line:x;text:z', `rectangle R ${FILL};line:${BORDER.slice(1)};line.bold;text:${TEXT.slice(1)}`, '', [FILL, BORDER, TEXT]);
color('4.4 class #fill##border', `class C ${FILL}##${BORDER.slice(1)}`, '', [FILL, BORDER]);
color('4.4 class #named##named', 'class C #red##blue', '', ['#ff0000', '#0000ff']);
color('4.4 activity :step; <<#fill>>', `start\n:step; <<${FILL}>>\nstop`, '', [FILL]);
color('4.4 activity #fill:step; (legacy)', `start\n${BORDER}:legacy;\nstop`, '', [BORDER]);

// --------------------------------------------------------------- §4.5 <style> blocks
color('4.5 <style> rectangle', `<style>\nrectangle {\n  BackgroundColor ${FILL}\n  LineColor ${BORDER}\n  FontColor ${TEXT}\n}\n</style>`, 'rectangle R', [FILL, BORDER, TEXT]);
color('4.5 <style> classDiagram', `<style>\nclassDiagram {\n  BackgroundColor ${FILL}\n}\n</style>`, 'class K', [FILL]);
color('4.5 <style> classDiagram { class { } }', `<style>\nclassDiagram {\n  class {\n    BackgroundColor ${FILL}\n  }\n}\n</style>`, 'class K', [FILL]);
color('4.5 <style> root', `allow_mixing\n<style>\nroot {\n  BackgroundColor ${FILL}\n  LineColor ${BORDER}\n  FontColor ${TEXT}\n}\n</style>`, 'rectangle R1\nclass C1', [FILL, BORDER, TEXT]);
color('4.5 <style> activityDiagram', `<style>\nactivityDiagram {\n  BackgroundColor ${FILL}\n  LineColor ${BORDER}\n}\n</style>`, 'start\n:step;\nstop', [FILL, BORDER]);
color('4.5 <style> activity', `<style>\nactivity {\n  BackgroundColor ${FILL}\n}\n</style>`, 'start\n:step;\nstop', [FILL]);
color('4.5 <style> participant', `<style>\nparticipant {\n  BackgroundColor ${FILL}\n}\n</style>`, 'participant A\nparticipant B\nA -> B : msg', [FILL]);
color('4.5 <style> sequenceDiagram', `<style>\nsequenceDiagram {\n  BackgroundColor ${FILL}\n}\n</style>`, 'participant A\nparticipant B\nA -> B : msg', [FILL]);

// ---------------------------------------------------------------- §4.6 sequence
const SEQ = 'participant P\nP -> P : x';
color('4.6 sequenceArrowColor', `skinparam sequenceArrowColor ${ARROW}`, SEQ, [ARROW]);
color('4.6 sequence { ArrowColor }', `skinparam sequence {\n  ArrowColor ${ARROW}\n}`, SEQ, [ARROW]);
color('4.6 sequence { LifeLineBorderColor }', `skinparam sequence {\n  LifeLineBorderColor ${BORDER}\n}`, SEQ, [BORDER]);
color('4.6 SequenceBoxBackgroundColor', `skinparam SequenceBoxBackgroundColor ${FILL}`, SEQ, [FILL]);
color('4.6 SequenceParticipantBorderColor', `skinparam SequenceParticipantBorderColor ${BORDER}`, SEQ, [BORDER]);

// ----------------------------------------------------- §4.7 per-diagram colour params
const ACTIVITY = 'start\n:step;\nstop';
const DIAMOND = 'start\nif (x?) then (yes)\n:y;\nendif\nstop';
const CLASSES = 'class A\nclass B\nA --> B';
const perDiagram = [
  ['ActivityBackgroundColor', ACTIVITY, FILL], ['ActivityBorderColor', ACTIVITY, BORDER],
  ['ActivityDiamondBackgroundColor', DIAMOND, LIFE], ['ActivityStartColor', ACTIVITY, FILL],
  ['ClassHeaderBackgroundColor', 'class K', FILL], ['ClassAttributeFontColor', 'class K', TEXT],
  ['ClassArrowColor', CLASSES, ARROW], ['NoteBorderColor', 'note "n" as N1', BORDER],
  ['NoteFontColor', 'note "n" as N1', TEXT], ['LegendBackgroundColor', 'legend\nL\nendlegend\nrectangle R', FILL],
  ['LegendBorderColor', 'legend\nL\nendlegend\nrectangle R', BORDER], ['TitleFontColor', 'title T\nrectangle R', TEXT],
];
for (const [key, body, sentinel] of perDiagram) color(`4.7 ${key}`, `skinparam ${key} ${sentinel}`, body, [sentinel]);

// ------------------------------------------------------------- §4.8 non-colour params
probe('4.8 shadowing false', 'skinparam shadowing false', 'rectangle R');
probe('4.8 defaultFontName Courier', 'skinparam defaultFontName Courier', 'rectangle "Some Label"');
probe('4.8 roundcorner 20', 'skinparam roundcorner 20', 'rectangle R');
probe('4.8 monochrome true', 'skinparam monochrome true', 'rectangle R');
probe('4.8 handwritten true', 'skinparam handwritten true', 'rectangle R');
probe('4.8 packageStyle rectangle', 'skinparam packageStyle rectangle', 'package P {\n  rectangle R\n}');
probe('4.8 linetype ortho', 'skinparam linetype ortho', 'rectangle A\nrectangle B\nA --> B');
probe('4.8 DefaultFontSize 24', 'skinparam DefaultFontSize 24', 'rectangle "Some Label"');
probe('4.8 nodesep 200', 'skinparam nodesep 200', 'rectangle A\nrectangle B\nrectangle C\nA --> B\nA --> C');
probe('4.8 !theme cerulean', '!theme cerulean', 'rectangle R');
// `!theme plain` only swaps the default fill for white — match the token, not a fingerprint.
color('4.8 !theme plain', '!theme plain', 'rectangle R', ['#ffffff'], ['#f1f1f1']);
// The define value must NOT carry '#' (official expands it to '##cde7ff' and then errors).
color('4.8 !define NAME #hex', `!define BRAND ${FILL.slice(1)}`, 'rectangle R #BRAND', [FILL]);

// -------------------------------------------------------- §5 single-line nesting
const oneLine = [
  ['package P { rectangle R }'], ['package "P" as p { rectangle R }'], ['node N { rectangle R }'],
  ['class K { +int x }'], ['cloud C { rectangle R }'], ['frame Fr { rectangle R }'],
  ['folder F { rectangle R }'], ['rectangle R { rectangle S }'],
];
for (const [body] of oneLine) probe(`5 ${body}`, body, '', { kind: 'empty' });
probe('5 package P {⏎ rectangle R⏎ } (multiline control)', 'package P {\n  rectangle R\n}', '', { kind: 'empty' });

// ------------------------------------------------------------------------ judging
/** `rgb(r, g, b)` → `#rrggbb`, lowercase, so colour tokens can be matched exactly. */
const norm = (s) => s.replace(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g, (_, r, g, b) =>
  `#${[r, g, b].map((v) => (+v).toString(16).padStart(2, '0')).join('')}`).toLowerCase();

/** Legal colour token: not preceded/followed by more hex digits and not glued to another token. */
const hasColor = (nsvg, hex) => new RegExp(`(?<![0-9a-f#])${hex}(?![0-9a-f#])`).test(nsvg);

/** First glued / malformed colour token, or '' — mirrors the upstream `legalColorCells` rule. */
function illegalToken(nsvg) {
  for (const m of nsvg.matchAll(/#(?:#|[0-9a-f]{1,8})/g)) {
    if (/[9a-z(]/.test(nsvg[m.index - 1] ?? '')) continue; // url(#id) and the like
    const body = m[0].slice(1);
    if (!/^[0-9a-f]{3}$/.test(body) && !/^[0-9a-f]{6}$/.test(body)) {
      return nsvg.slice(Math.max(0, m.index - 14), m.index + 18);
    }
  }
  return '';
}

function metrics(svg) {
  const uniq = (a) => [...new Set(a)].sort();
  const tag = svg.match(/<svg\b[^>]*>/)?.[0] ?? '';
  const num = (k) => tag.match(new RegExp(`\\b${k}="([\\d.]+)`))?.[1] ?? '?';
  return {
    bytes: svg.length,
    canvas: `${num('width')}x${num('height')}`,
    colours: uniq(norm(svg).match(/(?<![0-9a-f#])#[0-9a-f]{6}(?![0-9a-f#])/g) ?? []),
    elements: uniq([...svg.matchAll(/<([a-z]+)[\s>]/g)].map((m) => m[1])).length,
    rx: uniq([...svg.matchAll(/\brx="([^"]+)"/g)].map((m) => m[1])),
    fonts: uniq([...svg.matchAll(/font-family="([^"]+)"/g)].map((m) => m[1].slice(0, 18))),
    sizes: uniq([...svg.matchAll(/font-size:\s*([\d.]+)/g)].map((m) => m[1])).concat(uniq([...svg.matchAll(/font-size="([\d.]+)/g)].map((m) => m[1]))),
    strokes: uniq([...svg.matchAll(/stroke-width:\s*([\d.]+)/g)].map((m) => m[1])).concat(uniq([...svg.matchAll(/stroke-width="([\d.]+)/g)].map((m) => m[1]))),
  };
}

/** What changed between a probe and its own baseline — the evidence for an `effect` verdict. */
function describe(a, b) {
  const out = [];
  const trim = (s) => (s.length > 34 ? `${s.slice(0, 31)}…` : s);
  const cmp = (k, label) => {
    const x = JSON.stringify(a[k]), y = JSON.stringify(b[k]);
    if (x !== y) out.push(`${label} ${trim(x)} → ${trim(y)}`);
  };
  cmp('canvas', 'canvas');
  cmp('sizes', 'font-size');
  cmp('strokes', 'stroke-width');
  cmp('rx', 'rx');
  cmp('fonts', 'font-family');
  cmp('colours', 'colours');
  cmp('elements', 'element kinds');
  if (!out.length && a.bytes !== b.bytes) out.push(`bytes ${a.bytes} → ${b.bytes}`);
  return out.slice(0, 3).join(' · ');
}

function renderDocumd(puml) {
  const src = path.join(TMP, 'p.puml');
  const out = path.join(TMP, 'p.svg');
  fs.writeFileSync(src, puml);
  fs.rmSync(out, { force: true });
  try { execFileSync('node', [CLI, src, out], { stdio: 'pipe', timeout: 120000 }); } catch { return ''; }
  return fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
}

function renderOfficial(puml) {
  try {
    // Short timeout on purpose: an unknown `!theme` makes official PlantUML fetch the theme from the
    // network, which can hang for minutes on a bad link; a missing official reading is not worth that.
    return execFileSync('plantuml', ['-tsvg', '-pipe'], { input: puml, stdio: 'pipe', timeout: 20000 }).toString();
  } catch {
    return '';
  }
}

function judge(probe, svg) {
  if (!svg) return { verdict: 'error', why: 'no output' };
  if (svg.length < EMPTY_BYTES) return { verdict: 'empty', why: `${svg.length} B` };
  if (probe.kind === 'empty') return { verdict: 'ok', why: `${svg.length} B` };
  const nsvg = norm(svg);
  const illegal = illegalToken(nsvg);
  if (illegal) return { verdict: 'illegal', why: `glued/invalid colour token near ${JSON.stringify(illegal)}` };
  if (probe.kind === 'color') {
    const hits = probe.sentinels.filter((s) => hasColor(nsvg, s));
    const left = probe.absent.filter((s) => hasColor(nsvg, s));
    if (left.length) return { verdict: 'no', why: `${left.join(', ')} still present` };
    if (hits.length === probe.sentinels.length) return { verdict: 'yes', why: `${hits.length}/${probe.sentinels.length} tokens` };
    return { verdict: hits.length ? 'partial' : 'no', why: `${hits.length}/${probe.sentinels.length} tokens` };
  }
  return { verdict: 'structure', why: '' }; // resolved against the probe's own baseline below
}

const results = [];
for (const p of probes) {
  if (p.kind === 'empty') {
    const svg = ONLY_OFFICIAL ? '' : renderDocumd(p.puml);
    const j = judge(p, svg);
    const verdict = ONLY_OFFICIAL ? '—' : j.verdict === 'error' ? 'error' : svg.length < EMPTY_BYTES ? 'empty' : 'ok';
    let official = '—';
    if (!ONLY_DOCUMD && !ONLY_OFFICIAL) official = judge(p, renderOfficial(p.puml)).verdict;
    if (ONLY_OFFICIAL) official = judge(p, renderOfficial(p.puml)).verdict;
    results.push({ id: p.id, kind: p.kind, documd: verdict, official, why: j.why });
    continue;
  }
  const svg = ONLY_OFFICIAL ? '' : renderDocumd(p.puml);
  const j = judge(p, svg);
  let why = j.why;
  let verdict = ONLY_OFFICIAL ? '—' : j.verdict;
  if (verdict === 'structure') {
    const base = renderDocumd(p.basePuml);
    if (!base || base.length < EMPTY_BYTES) { verdict = 'error'; why = 'baseline did not render'; }
    else {
      why = describe(metrics(base), metrics(svg));
      verdict = why ? 'effect' : 'ignored';
      if (!why) why = 'output identical to the directive-free baseline';
    }
  }
  let official = '—';
  if (!ONLY_DOCUMD) {
    const osvg = renderOfficial(p.puml);
    if (p.kind === 'structure') {
      const obase = osvg ? renderOfficial(p.basePuml) : '';
      const d = obase && osvg.length >= EMPTY_BYTES ? describe(metrics(obase), metrics(osvg)) : '';
      official = !osvg || /syntax error|welcome to plantuml/i.test(osvg) ? 'error' : d ? 'effect' : 'ignored';
    } else {
      official = judge(p, osvg).verdict;
    }
  }
  results.push({ id: p.id, kind: p.kind, documd: verdict, official, why });
}

const tally = results.reduce((a, r) => {
  if (r.documd === '—') return a;
  a[r.documd] = (a[r.documd] ?? 0) + 1;
  return a;
}, {});
const engine = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, '..', 'node_modules/@markdown-viewer/draw-uml/package.json'), 'utf8')).version; } catch { return '?'; }
})();

if (SAVE) {
  fs.writeFileSync(SAVE, `${JSON.stringify({ engine, date: new Date().toISOString().slice(0, 10), cli: CLI, tally, results }, null, 2)}\n`);
}

if (JSON_OUT) {
  console.log(JSON.stringify({ engine, tally, results }, null, 2));
} else {
  const diff = DIFF && fs.existsSync(DIFF) ? new Map(JSON.parse(fs.readFileSync(DIFF, 'utf8')).results.map((r) => [r.id, r])) : null;
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`documd @markdown-viewer/draw-uml ${engine} via ${path.relative(process.cwd(), CLI)}${ONLY_DOCUMD ? '   (documd side only — no official column)' : ''}`);
  console.log(`${pad('PROBE', 46)} ${pad('OFFICIAL', 9)} ${pad('DOCUMD', 9)} ${diff ? pad('WAS', 9) : ''}EVIDENCE`);
  console.log('-'.repeat(diff ? 108 : 96));
  let changed = 0;
  for (const r of results) {
    const was = diff?.get(r.id)?.documd ?? '';
    if (was && was !== r.documd) changed++;
    console.log(`${pad(r.id, 46)} ${pad(r.official, 9)} ${pad(r.documd, 9)} ${diff ? pad(was || '·', 9) : ''}${r.why}`);
  }
  console.log('-'.repeat(diff ? 108 : 96));
  console.log(`documd verdicts: ${JSON.stringify(tally)}${diff ? `   ·   changed vs ${DIFF}: ${changed}` : ''}`);
}
if (!SAVE) fs.rmSync(TMP, { recursive: true, force: true });
