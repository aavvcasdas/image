#!/usr/bin/env node
/**
 * Build the scenario catalog from `documd-visuals/catalog/scenarios.tsv`.
 *
 *   node scripts/build-catalog.mjs            # validate + write json/md
 *   node scripts/build-catalog.mjs --check    # validate only (exit 1 on drift)
 *   node scripts/build-catalog.mjs --apply    # also move examples into examples/<domain>/
 *
 * The TSV is the human-editable source of truth: one row per example file,
 * columns `domain <TAB> scenario <TAB> engine <TAB> file`. A scenario is an intent
 * (reader + what they must decide); several files may serve the same scenario,
 * usually on different engines.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PKG = path.join(ROOT, 'documd-visuals');
const TSV = path.join(PKG, 'catalog', 'scenarios.tsv');
const EXAMPLES = path.join(PKG, 'examples');

const META = {
  // A — data & metrics
  'service-reliability': 'A',
  'ops-monitoring': 'A',
  'delivery-throughput': 'A',
  'goal-and-status-reporting': 'A',
  'product-metrics': 'A',
  'business-reporting': 'A',
  'go-to-market': 'A',
  'cost-and-budget': 'A',
  'data-exploration': 'A',
  // B — process & systems
  'engineering-operations': 'B',
  'incident-management': 'B',
  'process-and-workflow': 'B',
  'software-design': 'B',
  'software-behaviour': 'B',
  'dependencies-and-relations': 'B',
  'system-architecture': 'B',
  // C — infrastructure & governance
  'cloud-architecture': 'C',
  'data-platform': 'C',
  'network-topology': 'C',
  'security-and-compliance': 'C',
  'enterprise-architecture': 'C',
  'organization-and-roles': 'C',
  'people-and-hiring': 'C',
  // D — knowledge & expression
  'knowledge-and-outline': 'D',
  'planning-and-roadmap': 'D',
  'migration-and-rollout': 'D',
  'comparison-and-selection': 'D',
  'internal-documents': 'D',
  'catalogues-and-inventories': 'D',
  'customer-and-partner-comms': 'D',
  'theme-and-tone': 'D',
};

/** One-line reader/use description per domain — used by goals/<domain>.md. */
const DOMAIN_README = {
  'service-reliability': 'SRE and platform engineers measuring whether a service keeps its promises.',
  'ops-monitoring': 'Operators watching incident volume, outliers and service scorecards over time.',
  'delivery-throughput': 'Engineering leadership asking how much we ship and how fast.',
  'goal-and-status-reporting': 'Executives and programme leads reading status against targets on one screen.',
  'product-metrics': 'Product managers tracking funnel conversion, adoption and customer health.',
  'business-reporting': 'Finance and business owners reporting periodic results and revenue mix.',
  'go-to-market': 'Sales and partner teams covering pipeline, channels, partners and market entry.',
  'cost-and-budget': 'FinOps and finance breaking down spend, budgets and cost reduction.',
  'data-exploration': 'Analysts looking for structure, correlations, outliers and missing data.',
  'engineering-operations': 'Engineering managers running the team\'s recurring rituals and release operations.',
  'incident-management': 'Incident commanders and on-call engineers during and after an incident.',
  'process-and-workflow': 'Business and operations teams describing how work moves through approvals.',
  'software-design': 'Engineers describing how a system is put together.',
  'dependencies-and-relations': 'Engineers and architects tracing dependencies, impact and causality.',
  'cloud-architecture': 'Cloud architects placing workloads on AWS, Kubernetes or IoT platforms.',
  'data-platform': 'Data engineers describing pipelines, storage, models and schemas.',
  'network-topology': 'Network and operations engineers mapping devices, links and traffic.',
  'security-and-compliance': 'Security and compliance teams showing controls, boundaries, evidence and risk.',
  'enterprise-architecture': 'Enterprise architects aligning business capabilities with IT.',
  'organization-and-roles': 'HR and managers showing who reports where and what each team can cover.',
  'people-and-hiring': 'Managers and HR running hiring, onboarding, skills and career paths.',
  'knowledge-and-outline': 'Learners and authors organising knowledge, topics and concepts.',
  'planning-and-roadmap': 'Product and programme managers showing when things happen.',
  'migration-and-rollout': 'Programme leads sequencing a migration, cutover or physical rollout.',
  'comparison-and-selection': 'Decision makers choosing between options and recording why.',
  'internal-documents': 'Internal readers getting one page that settles one question.',
  'catalogues-and-inventories': 'Readers looking up what we offer, support or standardise on.',
  'customer-and-partner-comms': 'External audiences receiving a brief, story or bulletin.',
  'theme-and-tone': 'Authors choosing how a figure should look for the medium it will be read in — print, projection, low vision, long-form.',
  'system-architecture': 'Architects and engineers showing a whole system on one page — its layers, its zones, its services, and how they reach each other.',
};


/** Engines that can carry icons / templates — the differentiation score. */
const RICH_ENGINES = new Set(['plantuml', 'infographic', 'html-css']);
/** Engines whose payload must be strict JSON — the failure-risk score. */
const STRICT_ENGINES = new Set(['echarts', 'vega']);
/** Scenarios only one engine can express at all (irreplaceability). */
const SINGLE_ENGINE_SCENARIOS = new Set([
  'migration-programme', 'work-breakdown', 'api-interaction-sequence', 'c4-container',
  'state-machine', 'deployment-topology', 'domain-class-model', 'component-decomposition',
  'entity-relationships', 'packet-layout', 'approval-workflow', 'cicd-pipeline',
  'eip-message-flow', 'event-driven-flow',
]);

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const APPLY = args.includes('--apply');

const rows = fs
  .readFileSync(TSV, 'utf8')
  .split('\n')
  .filter((l) => l.trim() && !l.startsWith('#'))
  .map((l) => {
    const [domain, scenario, engine, file] = l.split('\t');
    return { domain, scenario, engine, file };
  });

// ---------------------------------------------------------------- validation
const errors = [];
const diskFiles = new Map(); // file -> relative dir
for (const dir of fs.readdirSync(EXAMPLES, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const sub = path.join(EXAMPLES, dir.name);
  if (dir.name === '_draft') {
    for (const eng of fs.readdirSync(sub, { withFileTypes: true })) {
      if (!eng.isDirectory()) continue;
      for (const f of fs.readdirSync(path.join(sub, eng.name))) {
        if (f.endsWith('.md')) diskFiles.set(f.replace(/\.md$/, ''), `_draft/${eng.name}`);
      }
    }
  } else {
    for (const f of fs.readdirSync(sub)) {
      if (f.endsWith('.md')) diskFiles.set(f.replace(/\.md$/, ''), dir.name);
    }
  }
}

const seen = new Set();
for (const r of rows) {
  if (!r.domain || !r.scenario || !r.engine || !r.file) {
    errors.push(`malformed row: ${JSON.stringify(r)}`);
    continue;
  }
  if (!META[r.domain]) errors.push(`unknown domain: ${r.domain}`);
  if (seen.has(r.file)) errors.push(`duplicate file in mapping: ${r.file}`);
  seen.add(r.file);
  if (!diskFiles.has(r.file)) errors.push(`mapped file not found on disk: ${r.file}`);
}
for (const f of diskFiles.keys()) {
  if (!seen.has(f)) errors.push(`example not in the mapping: ${f}`);
}

// --------------------------------------------------------------- aggregates
const scenarios = new Map();
for (const r of rows) {
  const key = `${r.domain}/${r.scenario}`;
  if (!scenarios.has(key)) {
    scenarios.set(key, {
      id: key,
      domain: r.domain,
      meta: META[r.domain],
      intent: r.scenario.replace(/-/g, ' '),
      engines: [],
      examples: [],
    });
  }
  const s = scenarios.get(key);
  if (!s.engines.includes(r.engine)) s.engines.push(r.engine);
  s.examples.push({ engine: r.engine, file: `examples/${r.domain}/${r.file}.md` });
}

/** Reproducible score: F frequency · R failure risk · D differentiation · C cost of failure · X irreplaceability */
function score(s) {
  const n = s.examples.length;
  const F = n >= 4 ? 5 : n === 3 ? 4 : n === 2 ? 3 : 2; // how often this intent actually shows up
  const R = Math.max(...s.engines.map((e) => (STRICT_ENGINES.has(e) ? 5 : RICH_ENGINES.has(e) ? 3 : 2)));
  const D = Math.max(...s.engines.map((e) => (RICH_ENGINES.has(e) ? 5 : 3)));
  const C = s.meta === 'A' || s.meta === 'B' ? 5 : 3;
  const X = SINGLE_ENGINE_SCENARIOS.has(s.intent.replace(/ /g, '-'))
    ? 5
    : s.engines.length === 1
      ? 4
      : 3;
  const W = 0.3 * F + 0.25 * R + 0.15 * D + 0.15 * C + 0.15 * X;
  // Tier = how much surface the scenario gets, not how good it is. Every catalogued
  // scenario has at least one verified example; T2 ones are simply not surfaced in
  // the package router.
  const tier = W >= 4.0 ? 'T0' : W >= 3.4 ? 'T1' : W >= 2.6 ? 'T2' : 'T3';
  return { F, R, D, C, X, W: Math.round(W * 100) / 100, tier };
}

const list = [...scenarios.values()].map((s) => ({ ...s, engines: s.engines.sort(), ...score(s) }));
list.sort((a, b) => b.W - a.W || a.id.localeCompare(b.id));

const byDomain = new Map();
for (const s of list) {
  if (!byDomain.has(s.domain)) byDomain.set(s.domain, []);
  byDomain.get(s.domain).push(s);
}

if (errors.length) {
  console.error(`✗ catalog validation failed (${errors.length})`);
  for (const e of errors) console.error(`   ${e}`);
  process.exit(1);
}

console.log(
  `✓ mapping valid: ${rows.length} examples · ${list.length} scenarios · ${byDomain.size} domains`,
);
for (const [d, ss] of [...byDomain].sort((a, b) => b[1].length - a[1].length)) {
  const flag = ss.length < 3 ? ' ⚠ <3' : ss.length > 8 ? ' ⚠ >8' : '';
  console.log(`   ${d.padEnd(30)} ${String(ss.length).padStart(2)} scenarios${flag}`);
}
if (CHECK) process.exit(0);

// ------------------------------------------------------------------- output
const catalog = {
  version: '1.0.0',
  frozen: new Date().toISOString().slice(0, 10),
  metaClusters: {
    A: 'data & metrics',
    B: 'process & systems',
    C: 'infrastructure & governance',
    D: 'knowledge & expression',
  },
  scoring:
    'W = 0.30·F + 0.25·R + 0.15·D + 0.15·C + 0.15·X. F = example count (capped). R = strict-JSON fence present. D = icon/template engine present. C = meta cluster A/B. X = single-engine scenario or not.',
  scenarios: list,
};
fs.writeFileSync(path.join(PKG, 'catalog', 'scenarios.json'), JSON.stringify(catalog, null, 2) + '\n');

const md = [
  '# Scenario catalog',
  '',
  '> Generated from `catalog/scenarios.tsv` — edit the TSV, not this file.',
  '',
  `**${rows.length} examples · ${list.length} scenarios · ${byDomain.size} domains.**`,
  '',
  '| Tier | Count |',
  '|---|---|',
  ...['T0', 'T1', 'T2', 'T3'].map((t) => `| ${t} | ${list.filter((s) => s.tier === t).length} |`),
  '',
];
for (const meta of ['A', 'B', 'C', 'D']) {
  md.push(`## ${meta} — ${catalog.metaClusters[meta]}`, '');
  for (const [domain, ss] of byDomain) {
    if (ss[0].meta !== meta) continue;
    md.push(`### \`${domain}\``, '');
    md.push('| Scenario | Engines | Tier | W | Example |');
    md.push('|---|---|---|---|---|');
    for (const s of ss) {
      md.push(
        `| ${s.intent} | ${s.engines.join(', ')} | ${s.tier} | ${s.W} | ${s.examples
          .map((e) => `\`${e.file.replace('examples/', '')}\``)
          .join('<br>')} |`,
      );
    }
    md.push('');
  }
}
fs.writeFileSync(path.join(PKG, 'catalog', 'scenarios.md'), md.join('\n'));

// ------------------------------------------------------------ optional move
if (APPLY) {
  let moved = 0;
  for (const r of rows) {
    const from = path.join(EXAMPLES, diskFiles.get(r.file), `${r.file}.md`);
    const toDir = path.join(EXAMPLES, r.domain);
    const to = path.join(toDir, `${r.file}.md`);
    if (path.resolve(from) === path.resolve(to)) continue;
    fs.mkdirSync(toDir, { recursive: true });
    fs.renameSync(from, to);
    moved++;
  }
  const draft = path.join(EXAMPLES, '_draft');
  if (fs.existsSync(draft)) {
    for (const d of fs.readdirSync(draft)) {
      const p = path.join(draft, d);
      if (fs.readdirSync(p).length === 0) fs.rmdirSync(p);
    }
    if (fs.readdirSync(draft).length === 0) fs.rmdirSync(draft);
  }
  console.log(`✓ moved ${moved} example files into examples/<domain>/`);
}
