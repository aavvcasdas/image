#!/usr/bin/env node
/**
 * Build `documd-visuals/engines/coverage/<engine>.md` — one ledger per engine.
 *
 *   node scripts/build-coverage.mjs            # regenerate the ledgers
 *   node scripts/build-coverage.mjs --check    # fail when a ledger is stale
 *   node scripts/build-coverage.mjs --seed     # one-time: lift the editorial unit tables out of
 *                                              # the shipped ledgers into scripts/coverage-sources/
 *
 * A ledger is assembled from two halves that never both live in the shipped file:
 *   1. **Units** — curated, from `scripts/coverage-sources/<engine>.md` (what the engine does with
 *      each unit of its official documentation: kept / excluded, and why).
 *   2. **Examples by goal** — collected from `catalog/scenarios.json`, so every example is a real,
 *      resolvable link and the goal grouping is the catalog's, not a hand-written guess.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PKG = path.join(ROOT, 'documd-visuals');
const COVERAGE = path.join(PKG, 'engines', 'coverage');
const SOURCES = path.join(ROOT, 'scripts', 'coverage-sources');

/**
 * The version of an installed engine, read from `node_modules` rather than written down here.
 *
 * These were hand-written strings and two of them had gone stale (`draw-uml` 1.4.8 when 1.5.2 was
 * installed, `@viz-js/viz` 3.29 when 3.30.0 was) — a ledger that names the wrong runtime is worse than
 * one that names none, because it is the file a reader checks first. Returns `?` when the package is
 * not installed, which is honest rather than wrong.
 */
const installedVersion = (name) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, '..', 'node_modules', name, 'package.json'), 'utf8')).version;
  } catch {
    return '?';
  }
};

/** Catalog engine key → shipped ledger file name (= the engine reference it belongs to) + its runtime. */
const ENGINES = {
  plantuml: {
    file: 'plantuml.md',
    runtime: () => `\`@markdown-viewer/draw-uml\` ${installedVersion('@markdown-viewer/draw-uml')} → \`@markdown-viewer/drawio2svg\` ${installedVersion('@markdown-viewer/drawio2svg')}`,
  },
  vega: { file: 'vega.md', runtime: () => `vega ${installedVersion('vega')} + vega-lite ${installedVersion('vega-lite')}` },
  echarts: { file: 'echarts.md', runtime: () => `echarts ${installedVersion('echarts')} (full package, no \`echarts-gl\`)` },
  infographic: { file: 'infographic.md', runtime: () => `\`@antv/infographic\` ${installedVersion('@antv/infographic')}` },
  'html-css': {
    file: 'html-css.md',
    runtime: () => 'the document renderer plus the page-skeleton and connector patterns in the engine reference',
  },
};

const catalog = JSON.parse(fs.readFileSync(path.join(PKG, 'catalog', 'scenarios.json'), 'utf8'));
const today = new Date().toISOString().slice(0, 10);

// ------------------------------------------------------------------ --seed
if (process.argv.includes('--seed')) {
  fs.mkdirSync(SOURCES, { recursive: true });
  for (const [engine, meta] of Object.entries(ENGINES)) {
    const file = path.join(COVERAGE, meta.file);
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    const first = text.search(/^## /m);
    if (first < 0) continue;
    const tail = text.slice(first).search(/^## (Counts|Sources)/m);
    const body = (tail > 0 ? text.slice(first, first + tail) : text.slice(first)).trim();
    fs.writeFileSync(path.join(SOURCES, `${engine}.md`), body + '\n');
    console.log(`seeded coverage-sources/${engine}.md (${body.split('\n').length} lines)`);
  }
  process.exit(0);
}

// ------------------------------------------------------------- per engine
const TIER_RANK = { T0: 0, T1: 1, T2: 2, T3: 3 };
const EXAMPLE_RE = /`([a-z][a-z0-9-]*)\/([a-z0-9-]+)`/g;
const DOMAIN_RE = /`([a-z][a-z0-9-]*)\/`/g;

/**
 * Turn compact `domain/file` references in a unit table into links that resolve from the shipped
 * ledger, and refuse to build when a reference points at nothing.
 */
function linkify(text, engine) {
  const bad = [];
  // Legacy inventory names, which no longer exist as files anywhere in the repo.
  let out = text
    .replace(/`(?:architecture|infocard)\/(?:layouts|styles)`/g, 'the engine reference')
    .replace(/`(?:architecture|infocard)\/layouts`/g, 'the engine reference')
    .replace(/`(?:architecture|infocard)\/styles`/g, 'the engine reference');
  out = out.replace(EXAMPLE_RE, (m, domain, name) => {
    const rel = `../../examples/${domain}/${name}.md`;
    if (!fs.existsSync(path.join(COVERAGE, rel))) {
      bad.push(m);
      return m;
    }
    return `[${name}](${rel})`;
  });
  out = out.replace(DOMAIN_RE, (m, domain) => {
    const rel = `../../goals/${domain}.md`;
    if (!fs.existsSync(path.join(COVERAGE, rel))) return m;
    return `[${domain}](${rel})`;
  });
  if (bad.length) {
    console.error(`✗ engines/coverage/${ENGINES[engine].file}: ${bad.length} unresolvable reference(s)`);
    for (const b of bad) console.error(`   ${b}`);
    badRefs += bad.length;
  }
  return out;
}
let badRefs = 0;

/** Infographic units are derived from the shipped registry snapshot instead of a hand-written table. */
function infographicUnits() {
  const tsv = fs
    .readFileSync(path.join(PKG, 'engines', 'infographic-templates.tsv'), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('\t'));
  const version = /@antv\/infographic ([\d.]+)/.exec(
    fs.readFileSync(path.join(PKG, 'engines', 'infographic-templates.tsv'), 'utf8'),
  )?.[1] ?? '?';
  const used = new Set();
  (function scan(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) scan(p);
      else if (e.name.endsWith('.md')) {
        for (const m of fs.readFileSync(p, 'utf8').matchAll(/```infographic\n([\s\S]*?)\n```/g)) {
          const head = m[1].trim().split('\n')[0].trim().split(/\s+/);
          if (head[0] === 'infographic' && head[1] && head[1] !== 'design') used.add(head[1]);
        }
      }
    }
  })(path.join(PKG, 'examples'));

  const byStructure = new Map();
  const allStyles = new Map();
  for (const [name, structure, styles] of tsv) {
    if (!byStructure.has(structure)) byStructure.set(structure, { n: 0, used: 0, styles: new Set() });
    const s = byStructure.get(structure);
    s.n++;
    if (used.has(name)) s.used++;
    for (const st of styles.split(',').filter(Boolean)) {
      s.styles.add(st);
      allStyles.set(st, (allStyles.get(st) ?? 0) + 1);
    }
  }
  const byFamily = new Map();
  for (const [structure, s] of byStructure) {
    const family = structure.split('-')[0];
    const f = byFamily.get(family) ?? { structures: 0, n: 0, used: 0 };
    f.structures++;
    f.n += s.n;
    f.used += s.used;
    byFamily.set(family, f);
  }
  const coveredStyles = new Set();
  for (const [name, , styles] of tsv) {
    if (!used.has(name)) continue;
    for (const st of styles.split(',').filter(Boolean)) coveredStyles.add(st);
  }

  return [
    `## Template families (registry ${version})`,
    '',
    '| Family | Structures | Templates | With an example |',
    '|---|---|---|---|',
    ...[...byFamily].sort().map(([f, v]) => `| \`${f}-*\` | ${v.structures} | ${v.n} | ${v.used} |`),
    `| **total** | **${byStructure.size + 4}** | **${tsv.length}** | **${used.size}** |`,
    '',
    '## Structures',
    '',
    '| Structure | Templates | Item styles | Example |',
    '|---|---|---|---|',
    ...[...byStructure].sort().map(
      ([s, v]) => `| \`${s}\` | ${v.n} | ${[...v.styles].sort().join(', ')} | ${v.used ? 'yes' : '—'} |`,
    ),
    '| `sequence-interaction` | 0 — inline `design` | — | yes |',
    '| `relation-dagre-flow` | 0 — inline `design` | — | yes |',
    '| `hierarchy-tree` | 0 — inline `design` | — | yes |',
    '| `hierarchy-mindmap` | 0 — inline `design` | — | yes |',
    '',
    `## Item styles (${allStyles.size})`,
    '',
    '| Style | Templates | Covered by an example |',
    '|---|---|---|',
    ...[...allStyles]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([s, n]) => `| \`${s}\` | ${n} | ${coveredStyles.has(s) ? 'yes' : '—'} |`),
    '',
    `**${used.size} of ${tsv.length} templates** are demonstrated by an example. The remainder are item-style`,
    'permutations of a structure that already has one, so they add no new reading.',
  ].join('\n');
}

const ledgers = new Map();

for (const [engine, meta] of Object.entries(ENGINES)) {
  const scenarios = catalog.scenarios.filter((s) => s.engines.includes(engine));
  const byDomain = new Map();
  for (const s of scenarios) {
    if (!byDomain.has(s.domain)) byDomain.set(s.domain, []);
    byDomain.get(s.domain).push(s);
  }
  const examples = scenarios.reduce((n, s) => n + s.examples.filter((e) => e.engine === engine).length, 0);
  const source = path.join(SOURCES, `${engine}.md`);
  const units = engine === 'infographic'
    ? infographicUnits()
    : linkify(
      fs.existsSync(source) ? fs.readFileSync(source, 'utf8').trim() : `## Units\n\n_not recorded_`,
      engine,
    );

  const md = [
    `# ${meta.file.replace(/\.md$/, '')} coverage ledger`,
    '',
    `> Generated from \`catalog/scenarios.json\` plus the curated unit table for this engine.`,
    `> Runtime: ${meta.runtime()}. Last generated: ${today}.`,
    '',
    '**Units** record what this engine does with each unit of its official documentation — kept, or',
    'excluded with the reason. **Examples by goal** is collected from the catalog, so every link below is',
    'resolvable from this file.',
    '',
    units,
    '',
    '## Examples by goal',
    '',
    `${examples} examples across ${byDomain.size} goal domains.`,
    '',
  ];
  for (const [domain, list] of [...byDomain].sort((a, b) => b[1].length - a[1].length)) {
    md.push(`### [${domain}](../../goals/${domain}.md)`, '');
    md.push('| Scenario | Tier | Example |', '|---|---|---|');
    for (const s of list.sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || b.W - a.W)) {
      const mine = s.examples.filter((e) => e.engine === engine);
      md.push(
        `| ${s.intent} | ${s.tier} | ${mine
          .map((e) => `[${path.basename(e.file)}](../../${e.file})`)
          .join('<br>')} |`,
      );
    }
    md.push('');
  }
  md.push(
    '## Counts',
    '',
    '| | |',
    '|---|---|',
    `| Examples using this engine | ${examples} |`,
    `| Goal domains reached | ${byDomain.size} |`,
    `| Scenarios | ${scenarios.length} |`,
    `| T0 scenarios | ${scenarios.filter((s) => s.tier === 'T0').length} |`,
    '',
    '## Sources',
    '',
    `- Engine reference: [\`../${meta.file}\`](../${meta.file})`,
    '- Catalog: [`../../catalog/scenarios.md`](../../catalog/scenarios.md)',
    '',
  );
  ledgers.set(meta.file, md.join('\n'));
}

if (badRefs) {
  console.error(`✗ ${badRefs} reference(s) in coverage-sources/*.md do not resolve — fix them first`);
  process.exit(1);
}

// --------------------------------------------------------------- write/check
let stale = 0;
fs.mkdirSync(COVERAGE, { recursive: true });
for (const [file, content] of ledgers) {
  const target = path.join(COVERAGE, file);
  const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
  // Compare everything except the generation date, which changes daily by design. The **runtime text is
  // not exempt** — it is read from the installed packages now, and exempting the whole line is what let
  // two stale versions (`draw-uml` 1.4.8, `@viz-js/viz` 3.29) sit in a shipped ledger unnoticed: the
  // drift check could not see the one line most likely to drift.
  const strip = (s) => (s ?? '').replace(/Last generated: \d{4}-\d{2}-\d{2}/, 'Last generated: <date>');
  if (strip(current) === strip(content)) continue;
  if (process.argv.includes('--check')) {
    console.error(`✗ stale coverage ledger: engines/coverage/${file}`);
    stale++;
    continue;
  }
  fs.writeFileSync(target, content);
}
if (stale) process.exit(1);
console.log(
  process.argv.includes('--check')
    ? `✓ ${ledgers.size} coverage ledgers up to date`
    : `✓ wrote ${ledgers.size} coverage ledgers (one per engine, grouped by goal)`,
);
