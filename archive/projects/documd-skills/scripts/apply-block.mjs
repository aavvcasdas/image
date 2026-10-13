#!/usr/bin/env node
/**
 * Apply or verify the engine blocks across the example corpus.
 *
 *   node skills/scripts/apply-block.mjs --engine infographic --check
 *   node skills/scripts/apply-block.mjs --engine infographic --apply
 *   node skills/scripts/apply-block.mjs --all --check          # the §8 consistency gate
 *   node skills/scripts/apply-block.mjs --all --check --theme dark
 *
 * The canonical block comes from `styles/themes/<theme>.md`, so there is exactly one source for
 * what "the block" means: this script never carries its own copy, and `verify-blocks.mjs` renders
 * the same block in isolation. `--check` exits 1 when any block is missing it (the plan's
 * “block consistency” gate); `--apply` writes it. `--theme` selects the theme (default: `default`),
 * which changes both the inserted values and the block the corpus is matched against.
 *
 * Placement is per engine because a block is not always a prefix: `infographic` wants it after the
 * template line, `plantuml` after `@startuml`, and the JSON engines
 * want one property added to the spec — or, for `vega`, one scale pushed into `scales`.
 *
 * `--apply` also **upgrades** a block that is present but stale (a theme value changed, or the block
 * gained a line): the run the block occupies is replaced, never duplicated beside. Without that,
 * every theme change would leave the corpus silently on the old values — for `plantuml` the later
 * statement wins, so the figure would keep the old colour while the file looked themed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { readTheme, listThemes } from './lib/themes.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const THEME_DIR = path.join(ROOT, 'skills/documd-visuals/styles/themes');
const EXAMPLES = path.join(ROOT, 'skills/documd-visuals/examples');
/**
 * `--theme` selects the theme to *apply*. Without it, `--check` asks a different question: does every
 * example block carry **some** theme's block? That is the coverage gate — a figure written in the Dark
 * theme is covered, not missing. Applying without `--theme` still needs one, so it defaults.
 */
const THEME_ARG = (() => {
  const i = process.argv.indexOf('--theme');
  return i >= 0 ? process.argv[i + 1] : null;
})();
const THEME = THEME_ARG ?? 'default';
const THEME_FILE = path.join(THEME_DIR, `${THEME}.md`);
if (!fs.existsSync(THEME_FILE)) throw new Error(`unknown theme \`${THEME}\` — expected a file at styles/themes/${THEME}.md`);
const theme = readTheme(THEME_FILE);
/** Every theme, for the any-theme coverage check. */
const ALL_THEMES = listThemes(THEME_DIR).map(readTheme);
const ANY_THEME = !THEME_ARG;
/** The categorical ramp of the selected theme, in token order — what every chart's colour list must equal. */
const RAMP = Array.from({ length: 8 }, (_, i) => theme.tokens.get(`cat-${i + 1}`).value);
/** First three ramp entries, adjacent — only an applied ramp matches this. */
const rampSigs = (t) => `${t.tokens.get('cat-1').value}", "${t.tokens.get('cat-2').value}", "${t.tokens.get('cat-3').value}`;
const RAMP_SIGS = ALL_THEMES.map(rampSigs);
const APPLY = process.argv.includes('--apply');
const JSON_OUT = process.argv.includes('--json');
const ENGINE = (() => {
  const i = process.argv.indexOf('--engine');
  return i >= 0 ? process.argv[i + 1] : null;
})();
const ALL = process.argv.includes('--all');

/** Which block of the theme document each engine uses, and how it is placed. */
const ENGINES = {
  infographic: {
    fences: ['infographic'],
    variants: ['theme'],
    indent: '',
    // after the `infographic <template>` line
    place: (lines) => (lines[0].startsWith('infographic') ? 1 : -1),
  },
  plantuml: {
    fences: ['plantuml', 'puml'],
    variants: ['structure'],
    // Coverage accepts the block for the example's **own diagram family**. PlantUML's families take
    // disjoint skinparams, so a sequence diagram carrying the structure block would theme nothing it
    // uses — requiring `structure` everywhere flagged a correct activity figure as “missing the
    // block”. `element` is not a family block (it is a per-element escalation), so it does not
    // satisfy coverage on its own.
    coverageVariants: ['structure', 'sequence', 'activity'],
    indent: '',
    // Non-UML diagram types ignore `skinparam` entirely (measured: byte-identical output with and
    // without the globals), so they are “not applicable”, not missing.
    nonUml: /^@(startmindmap|startgantt|startpacketdiag|startwbs|startsalt|startjson|startyaml|startditaa|startmath|startchart|startregex|startebnf|startnwdiag)\b/,
    place: (lines) => {
      if (ENGINES.plantuml.nonUml.test(lines[0].trim())) return -2;
      return lines.findIndex((l) => /^@(start|begin)uml/.test(l.trim())) + 1 || -1;
    },
  },
  echarts: {
    fences: ['echarts'],
    variants: ['color'],
    indent: '  ',
    json: true,
    comma: true,
    place: (lines) => lines.findIndex((l) => l.trim() === '{') + 1 || -1,
  },
  // Both dialects live in one theme file, distinguished by variant.
  'vega-lite': {
    fences: ['vega-lite'],
    variants: ['config'],
    indent: '  ',
    json: true,
    comma: true,
    place: (lines) => lines.findIndex((l) => l.trim() === '{') + 1 || -1,
  },
  vega: {
    fences: ['vega'],
    variants: ['scale'],
    indent: '    ',
    json: true,
    comma: true,
    // Pure Vega specs already carry a `color` scale; inserting a second one (the block, whose
    // domain is a placeholder) produced duplicate names and “Undefined data set name: <dataset>”. So a
    // vega block is **patched**: drop any placeholder scale, then point the ordinal colour scale that
    // the marks reference at the ramp. A spec whose marks use literal palette fills needs no scale.
    patch: (body, ramp) => {
      let out = body;
      const removed = removeScaleContaining(out, '<dataset>') || removeScaleContaining(out, '<category field>');
      if (removed) out = removed;
      const targets = ordinalColourScales(out);
      let patched = 0;
      for (const t of targets.reverse()) {
        const rampText = `"range": [${ramp.map((c) => `"${c}"`).join(', ')}]`;
        // Idempotent: a scale that already carries the ramp (in any spacing) is left alone, so a second
        // run reports “unchanged” instead of pretending it still needs patching.
        const hasRamp = new RegExp(`"range"\\s*:\\s*\\[\\s*${ramp.map((c) => `"${c}"`).join('\\s*,\\s*')}\\s*\\]`).test(t.text);
        if (hasRamp) continue;
        const replacement = rampText;
        let inner = t.text;
        // Three shapes carry a colour range in Vega: an explicit array, a named range such as
        // `"range": "category"`, and a scheme object. Only the first is a list; the other two
        // reference a built-in scheme and have to be replaced outright.
        if (/"range"\s*:\s*\[/.test(inner)) inner = inner.replace(/"range"\s*:\s*\[[^\]]*\]/, replacement);
        else if (/"range"\s*:\s*"[^"]*"/.test(inner)) inner = inner.replace(/"range"\s*:\s*"[^"]*"/, replacement);
        else if (/"scheme"\s*:\s*"[^"]*"/.test(inner)) inner = inner.replace(/"scheme"\s*:\s*"[^"]*"/, replacement);
        else continue;
        out = out.slice(0, t.start) + inner + out.slice(t.end);
        patched++;
      }
      return { body: out, patched, removed: removed ? 1 : 0 };
    },
    // A vega block conforms when its colour scale carries the ramp, or when it has no ordinal colour
    // scale at all (its marks use theme literals, which is fine).
    conforms: (body, sigs) => sigs.some((s) => body.includes(s)) || !/"type"\s*:\s*"ordinal"/.test(body),
  },
};

/** All top-level objects inside the spec's `scales` array whose type is ordinal and which marks use. */
function ordinalColourScales(body) {
  const scalesAt = body.indexOf('"scales"');
  if (scalesAt < 0) return [];
  const arrStart = body.indexOf('[', scalesAt);
  const objs = [];
  let depth = 0;
  let start = -1;
  for (let i = arrStart; i < body.length; i++) {
    const ch = body[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        objs.push({ start, end: i + 1, text: body.slice(start, i + 1) });
        start = -1;
      }
    } else if (ch === ']' && depth === 0) break;
  }
  const refs = new Set(
    [...body.matchAll(/"(?:fill|stroke|color)"\s*:\s*\{[^}]*?"scale"\s*:\s*"([^"]+)"/g)].map((m) => m[1]),
  );
  return objs.filter((o) => /"type"\s*:\s*"ordinal"/.test(o.text) && refs.has(o.text.match(/"name"\s*:\s*"([^"]+)"/)?.[1]));
}

/** Remove the first scale object whose text contains a marker (used to undo the placeholder pass). */
function removeScaleContaining(body, marker) {
  const scalesAt = body.indexOf('"scales"');
  if (scalesAt < 0 || !body.includes(marker)) return null;
  const arrStart = body.indexOf('[', scalesAt);
  let depth = 0;
  let start = -1;
  for (let i = arrStart; i < body.length; i++) {
    const ch = body[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        const obj = body.slice(start, i + 1);
        if (obj.includes(marker)) {
          // also swallow the following comma/newline so the array stays valid
          const after = body.slice(i + 1).match(/^\s*,?\s*\n?/)?.[0] ?? '';
          return body.slice(0, start) + body.slice(i + 1 + after.length);
        }
        start = -1;
      }
    } else if (ch === ']' && depth === 0) break;
  }
  return null;
}

/** The block of one theme file for this engine. `variantList` overrides the engine's own variant. */
function canonicalBlock(engine, themeFile = THEME_FILE, variantList = null) {
  const file = themeFile;
  const text = fs.readFileSync(file, 'utf8');
  const variants = variantList ?? ENGINES[engine].variants ?? null;
  const wanted = variants ? new Set(variants) : null;
  for (const m of text.matchAll(/```([a-z-]+)\n([\s\S]*?)```/g)) {
    if (!ENGINES[engine].fences.includes(m[1])) continue;
    // A theme file carries several blocks per engine (`plantuml` has structure / sequence /
    // activity / element). The variant is identified by the heading above the fence.
    if (wanted) {
      const before = text.slice(0, m.index).split('\n').reverse().find((l) => /^###\s/.test(l)) ?? '';
      const variant = before.replace(/^###\s+\S+\s*·\s*/, '').trim();
      if (!wanted.has(variant)) continue;
    }
    return m[2].trimEnd();
  }
  throw new Error(`${path.basename(file)}: no matching \`\`\`${ENGINES[engine].fences[0]} block found`);
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

/**
 * Does `body` carry `block`?
 *
 * Compared line by line, with indentation and trailing commas removed — the same block gains a
 * trailing comma once it sits inside a JSON spec — and blank lines ignored,
 * because an example may separate the block from its neighbours differently.
 *
 * A *signature line* was the first implementation, and it stopped being sound the moment PlantUML
 * got four family blocks: the sequence and activity blocks open with the same
 * `skinparam DefaultFontColor`, so one line certified a block that was not there.
 */
function hasBlock(body, block) {
  const present = new Set(body.split('\n').map((l) => l.trim().replace(/,$/, '')));
  return block
    .split('\n')
    .map((l) => l.trim().replace(/,$/, ''))
    .filter(Boolean)
    .every((l) => present.has(l));
}

/**
 * The identity of a block line: two lines with the same key set the same property.
 *
 * Deliberately coarse — it identifies *positions*, not values, which is what makes it usable both to
 * find a stale block and to tell the block apart from the rest of the diagram.
 */
function keyOf(engine, line) {
  const l = line.trim().replace(/,$/, '');
  if (engine === 'plantuml') return (l.match(/^skinparam\s+(\S+)/i)?.[1] ?? l).toLowerCase();
  if (engine === 'infographic') {
    // Palette entries are positional; the line is pasted *after* the `infographic <template>` line, so
    // absolute line numbers are no use. They all share one key, and the region walk keeps them
    // together.
    if (l.startsWith('- ')) return 'palette';
    return (l.split(/\s+/)[0] ?? l).toLowerCase();
  }
  return (l.match(/"([^"]+)"\s*:/)?.[1] ?? l).toLowerCase();
}

/**
 * Where the block already lives inside a fence body: the contiguous run of lines from the first line
 * that sets one of the block's properties. Returns `[start, end)` or null.
 *
 * A *contiguous run from the first match*, rather than “the first N lines at the placement point”,
 * because the JSON engines put the property wherever the spec's author put it — and because the
 * alternative, inserting a second `"config"` key beside the stale one, yields valid-looking JSON with
 * a duplicated property. The run is what gets replaced when a theme value changes.
 */
function blockRegion(engine, lines, blockKeys) {
  const start = lines.findIndex((l) => blockKeys.has(keyOf(engine, l)));
  if (start < 0) return null;
  let end = start;
  while (end < lines.length && blockKeys.has(keyOf(engine, lines[end]))) end++;
  return [start, end];
}

function run(engineName) {
  const cfg = ENGINES[engineName];
  const block = canonicalBlock(engineName);
  const blockLines = block.split('\n').map((l) => (cfg.indent && /^\s/.test(l) ? l : cfg.indent + l));
  // A JSON property needs its trailing comma once it sits inside a spec (or an array).
  const inserted = cfg.comma ? blockLines.map((l, i) => (i === blockLines.length - 1 ? `${l},` : l)) : blockLines;
  // In any-theme mode every theme contributes every family block: the question is coverage, not
  // compliance with one theme — a figure written in the Vivid theme, or a sequence diagram carrying
  // the sequence block, is covered.
  const coverageVariants = cfg.coverageVariants ?? cfg.variants ?? [];
  const candidates = ANY_THEME
    ? [...new Set(ALL_THEMES.flatMap((t) => coverageVariants.map((v) => canonicalBlock(engineName, t.file, [v]))))]
    : [block];
  // The property names this block sets. A body that carries some of them but not all of them is
  // holding a stale copy of the block, not a different block.
  const blockKeys = new Set(block.split('\n').map((l) => keyOf(engineName, l)).filter(Boolean));
  const files = [];
  let blocks = 0;
  let conforming = 0;
  let insertedCount = 0;
  let repaired = 0;
  let skipped = 0;
  let na = 0;
  // Blocks that have a placement point but do not carry the block yet. `--apply` inserts them, so
  // the count is transient there; in `--check` mode it is the actual finding — and an earlier
  // revision returned early *without counting anything*, so two missing blocks made this gate fail
  // while the report named no file and the per-engine percentages looked merely “not 100%”.
  let absent = 0;
  /** Blocks whose signature is present but whose canonical line is not — a stale insertion. */
  let stale = 0;

  const re = new RegExp('```(' + cfg.fences.join('|') + ')\n([\\s\\S]*?)```', 'g');
  for (const file of walk(EXAMPLES)) {
    let text = fs.readFileSync(file, 'utf8');
    let touched = false;
    text = text.replace(re, (whole, fence, body) => {
      blocks++;
      // Engines that are patched rather than prefixed (pure Vega: the spec owns its colour scale).
      if (cfg.patch) {
        const { body: patched, patched: n, removed } = cfg.patch(body, RAMP);
        if (!n && !removed) {
          if (cfg.conforms(patched, ANY_THEME ? RAMP_SIGS : [rampSigs(theme)])) conforming++;
          else {
            skipped++;
            files.push(`${path.relative(EXAMPLES, file)} (nothing to patch, no colour scale)`);
          }
          return whole;
        }
        if (!APPLY) {
          skipped++;
          files.push(`${path.relative(EXAMPLES, file)} (needs patching)`);
          return whole;
        }
        touched = true;
        repaired += n + (removed ? 1 : 0);
        return `\`\`\`${fence}\n${patched}\n\`\`\``;
      }
      const lines = body.trimEnd().split('\n');
      if (candidates.some((c) => hasBlock(body, c))) {
        conforming++;
        return whole;
      }
      // The block is not fully present. It may still be *partly* present — a theme value changed, or
      // the block gained a line — and then the run it occupies is **replaced**. Inserting beside it
      // would leave the stale copy in force: for `plantuml` the later statement wins, so the
      // figure would keep the old colour while the file looked themed; for the JSON engines it would
      // duplicate the property.
      const region = blockRegion(engineName, lines, blockKeys);
      if (region) {
        if (!APPLY) {
          stale++;
          files.push(`${path.relative(EXAMPLES, file)} (stale block — ${region[1] - region[0]} of ${inserted.length} lines)`);
          return whole;
        }
        touched = true;
        repaired++;
        const next = [...lines.slice(0, region[0]), ...inserted, ...lines.slice(region[1])];
        return `\`\`\`${fence}\n${next.join('\n')}\n\`\`\``;
      }
      const at = cfg.place(lines);
      if (at === -2) {
        na++;
        return whole;
      }
      if (at <= 0) {
        skipped++;
        files.push(`${path.relative(EXAMPLES, file)} (no placement point)`);
        return whole;
      }
      if (!APPLY) {
        absent++;
        files.push(`${path.relative(EXAMPLES, file)} (missing the block)`);
        return whole;
      }
      touched = true;
      insertedCount++;
      const body2 = [...lines.slice(0, at), ...inserted, ...lines.slice(at)].join('\n');
      return `\`\`\`${fence}\n${body2}\n\`\`\``;
    });
    if (touched) fs.writeFileSync(file, text);
  }
  return { engine: engineName, blocks, conforming, inserted: insertedCount, repaired, skipped, absent, stale, na, notes: files };
}

const targets = ALL ? Object.keys(ENGINES) : [ENGINE];
if (!targets[0] || !ENGINES[targets[0]]) {
  console.error(`usage: --engine <${Object.keys(ENGINES).join('|')}> | --all   [--apply|--check]`);
  process.exit(2);
}

const reports = targets.map(run);
if (JSON_OUT) {
  console.log(JSON.stringify(reports, null, 2));
} else {
  for (const r of reports) {
    const pct = r.blocks ? Math.round((r.conforming / r.blocks) * 100) : 0;
    console.log(`${r.engine.padEnd(12)} blocks ${String(r.blocks).padStart(3)} · conforming ${String(r.conforming).padStart(3)} (${pct}%)${r.inserted ? ` · inserted ${r.inserted}` : ''}${r.repaired ? ` · repaired ${r.repaired}` : ''}${r.absent ? ` · absent ${r.absent}` : ''}${r.stale ? ` · stale ${r.stale}` : ''}${r.na ? ` · not applicable ${r.na}` : ''}${r.skipped ? ` · no placement point ${r.skipped}` : ''}`);
    for (const n of r.notes.slice(0, 8)) console.log(`   ! ${n}`);
  }
}
// Every block must land in exactly one bucket. A residual here means the classifier has a blind
// spot, which is how two missing blocks stayed invisible while this gate reported “failing”.
const unaccounted = reports.reduce(
  (a, r) => a + (r.blocks - r.conforming - r.inserted - r.repaired - r.absent - r.stale - r.na - r.skipped),
  0,
);
if (unaccounted) console.error(`!! ${unaccounted} block(s) were not classified — the coverage gate has a blind spot`);
process.exit(unaccounted || (!APPLY && reports.some((r) => r.absent || r.stale)) ? 1 : 0);
