#!/usr/bin/env node
/**
 * Generate `documd-visuals/goals/<domain>.md` from `catalog/scenarios.json`.
 *
 *   node scripts/build-goals.mjs            # write goal docs
 *   node scripts/build-goals.mjs --check    # fail if the docs are stale
 *
 * The catalog is the source of truth; this script only formats it. The per-domain
 * reading order and anti-patterns below are maintained by hand on purpose — they are
 * the part no generator can infer.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PKG = path.join(ROOT, 'documd-visuals');
const GOALS = path.join(PKG, 'goals');

const CATALOG = JSON.parse(fs.readFileSync(path.join(PKG, 'catalog', 'scenarios.json'), 'utf8'));

const META_TITLE = {
  A: 'data & metrics',
  B: 'process & systems',
  C: 'infrastructure & governance',
  D: 'knowledge & expression',
};

/** Hand-maintained per domain: how to read the set, and what goes wrong. */
const NOTES = {
  'service-reliability': {
    order: 'Start with a distribution (box plot, swarm, density) to see the shape, then a band or threshold view to show the promise being kept.',
    anti: ['Stacking latency with error rate on one axis → two charts', 'Quoting a p95 without saying which window it covers'],
  },
  'ops-monitoring': {
    order: 'Load concentration is a grid question (heatmap, contour, stripes); trend and outlier views answer the follow-up "since when".',
    anti: ['An auto-scaled heatmap hiding the floor → pin the domain', 'Reading contour lines as probabilities → they are density levels'],
  },
  'delivery-throughput': {
    order: 'Use distributions and small multiples to establish what normal looks like, then rank/bump charts for who moved.',
    anti: ['A rank chart when the underlying values matter → show the values', 'Comparing quarters of different length without saying so'],
  },
  'goal-and-status-reporting': {
    order: 'One screen, one decision: attainment tracks for target versus actual, boards for the standing set of KPIs.',
    anti: ['A dashboard with hover-only detail → exports are static', 'Mixing red/green semantics with arbitrary series colours'],
  },
  'product-metrics': {
    order: 'Funnels for where users drop, mix charts for where they came from, journeys for what happens after.',
    anti: ['A funnel with stages that do not nest → use a bar chart', 'Percentages with no stated base population'],
  },
  'business-reporting': {
    order: 'Periodic results first (what happened), mix second (where it came from), concentration third (how exposed we are).',
    anti: ['Truncated value axes on revenue → keep zero in range', 'Mixing currency or period definitions across panels'],
  },
  'go-to-market': {
    order: 'Pipeline and channel performance for the engine, partner tiers and market entry for the coverage story.',
    anti: ['Sales stages drawn as a funnel when they are gates → show gates', 'Partner numbers that double-count resellers and end customers'],
  },
  'cost-and-budget': {
    order: 'Split by category for the mix, hierarchy views for where the mass sits, waterfalls for what changed.',
    anti: ['A pie with ten cost lines → treemap or ranked bars', 'A waterfall whose steps are independent measures'],
  },
  'data-exploration': {
    order: 'Correlation and regression for relationships, distributions and small multiples for shape, imputation and deviation for data quality.',
    anti: ['Drawing conclusions from a fitted line without showing the spread', 'Hiding dropped records → show the imputed or excluded rows'],
  },
  'engineering-operations': {
    order: 'Ritual boards (standup, rhythm, checklist) are read top-down; deploy/pace calendars are read as texture.',
    anti: ['A twelve-step ritual board → split into recurring and one-off work', 'Checklists with no owner in the description'],
  },
  'incident-management': {
    order: 'Runbooks and escalation paths are the process; triage filters and change control are the gates.',
    anti: ['A runbook with branches → activity diagrams cannot express parallelism in a list', 'Escalation paths without time bounds'],
  },
  'process-and-workflow': {
    order: 'PlantUML activity diagrams when decisions and lanes matter, infographic sequences when it is a straight path with owners.',
    anti: ['A process with no decision points drawn as a list', 'Swimlanes that mix roles and systems'],
  },
  'software-design': {
    order: 'Structure first (classes, components, packages, use cases, SysML blocks), then the C4 view for the audience that thinks in containers.',
    anti: ['A component diagram that shows deployment topology → split the views', 'Class diagrams with every field of every entity'],
  },
  'software-behaviour': {
    order: 'State machines for lifecycle, sequences for the calls, messaging diagrams for asynchronous flow, deployment for where it runs.',
    anti: ['A sequence diagram with no error path', 'Deployment topology drawn without units or scaling facts'],
  },
  'dependencies-and-relations': {
    order: 'Rectangle graphs for computed layouts and rank control, force/arc layouts for topology shape, matrices when the graph is dense.',
    anti: ['A 40-node hairball → aggregate or filter first', 'Reading link length in a force layout as a measurement'],
  },
  'cloud-architecture': {
    order: 'PlantUML with the cloud stencil family for anything that must read as a real platform; one family per diagram.',
    anti: ['Mixing AWS and Azure icon families in one view', 'An architecture diagram with no network boundary or account scope'],
  },
  'data-platform': {
    order: 'Pipeline shape (ingest → transform → serve) first, schema second, model training loops third.',
    anti: ['Drawing storage as a plain box when it is a warehouse/lake distinction', 'Omitting the freshness or ownership of each stage'],
  },
  'network-topology': {
    order: 'Physical or logical topology with vendor stencils, packet layouts for protocol detail, route flows for traffic.',
    anti: ['Topology diagrams without a legend for link type or speed', 'Using a force layout for a deliberately layered network'],
  },
  'security-and-compliance': {
    order: 'Boundaries and layers first (zero trust, baseline), then the threat model, then evidence and audit trails.',
    anti: ['A trust boundary drawn without saying what crosses it', 'Compliance evidence presented without the control it satisfies'],
  },
  'enterprise-architecture': {
    order: 'ArchiMate layering for the full model, capability maps for the business view, stakeholder maps for the political view.',
    anti: ['ArchiMate elements used as decoration rather than with layer semantics', 'Capability maps with no maturity or ownership dimension'],
  },
  'organization-and-roles': {
    order: 'Reporting structure first, then what each team can cover, then the workforce shape.',
    anti: ['An org chart with no indication of team size or scope', 'Capability self-assessments with no evidence trail'],
  },
  'people-and-hiring': {
    order: 'Hiring plan for the shape, hiring loop for the process, onboarding and skills for what happens after.',
    anti: ['A career ladder with no observable criteria', 'Onboarding checklists that mix day-one tasks with quarter-one goals'],
  },
  'knowledge-and-outline': {
    order: 'One mind map as the spine, hierarchies for structure, relations for concepts that cross branches.',
    anti: ['A mind map used as a document outline → it is an exploration tool', 'Keyword clouds presented as analysis'],
  },
  'planning-and-roadmap': {
    order: 'Sequences for the story, timelines for dates, Gantt for overlap and dependencies.',
    anti: ['A roadmap with more than six milestones in one view', 'Dates in a sequence block that is meant to be timeless'],
  },
  'migration-and-rollout': {
    order: 'Waves for sequencing, cutover windows for the risky night, work breakdown for scope ownership.',
    anti: ['A migration plan without a rollback step', 'Rollout stations that run in parallel drawn as a zigzag'],
  },
  'comparison-and-selection': {
    order: 'Quadrants to sort, two-sided folds for trade-offs, scorecards when the decision needs numbers.',
    anti: ['Quadrant slots named Q1–Q4 instead of the decision rule', 'A scorecard with weights that are never shown'],
  },
  'internal-documents': {
    order: 'One page, one question: memo for a decision, brief for a summary, abstract for a study, charter for a mandate.',
    anti: ['Cards with three competing focal points', 'Putting the only copy of a fact inside a card (exports rasterise)'],
  },
  'catalogues-and-inventories': {
    order: 'Flat inventories are read by scanning: keep entries grammatically identical and evenly sized.',
    anti: ['Mixing design decisions with product facts in one grid', 'An inventory with no owner or default column'],
  },
  'customer-and-partner-comms': {
    order: 'Outbound documents need a headline, a proof point and a next step — in that order.',
    anti: ['Internal jargon or metric naming in an external brief', 'A customer story with no quantified outcome'],
  },
  'theme-and-tone': {
    order: 'Pick the theme first, then the figure: the medium decides the colours, and the block you paste follows from the theme, not from the engine.',
    anti: ['Reaching for a second accent because the theme feels quiet → the theme is the whole palette', 'Writing a dark-theme block into a light page → a near-black panel reads as a hole', 'Relying on colour alone in a mono theme → label it, or vary the shape'],
  },
  'system-architecture': {
    order: 'Decide what the figure is *about* first — the layers, the zones, the order, or the calls. Then pick the shape that carries it: a stack, a nesting, a row, a grid, or a connector overlay.',
    anti: ['Arrows on top of containment → nesting already means reachability; pick one', 'Diagonal or curved connectors → right angles only, or it reads as a sketch', 'Equal-weight cards for a system with a clear hierarchy → use a stack', 'Using colour alone for tier or health → the tier is an edge, the health is a chip with words'],
  },
};

const ENGINE_LINE = {
  plantuml: '`plantuml` — diagrams with icon families and UML/ArchiMate/BPMN semantics',
  vega: '`vega` / `vega-lite` — statistical views where the data needs transforms',
  echarts: '`echarts` — report-grade charts and dashboards',
  infographic: '`infographic` — template-driven boards, sequences and comparisons',
  'html-css': 'HTML/CSS — system architecture diagrams, cards and page-level layouts (no fence)',
};

const byDomain = new Map();
for (const s of CATALOG.scenarios) {
  if (!byDomain.has(s.domain)) byDomain.set(s.domain, []);
  byDomain.get(s.domain).push(s);
}

const files = new Map();
for (const [domain, scenarios] of byDomain) {
  const notes = NOTES[domain] ?? { order: '', anti: [] };
  const engines = [...new Set(scenarios.flatMap((s) => s.engines))].sort();
  const examples = scenarios.reduce((n, s) => n + s.examples.length, 0);
  const tierRank = { T0: 0, T1: 1, T2: 2, T3: 3 };
  const sorted = scenarios.sort((a, b) => tierRank[a.tier] - tierRank[b.tier] || b.W - a.W);

  const md = [
    `# Goal: ${domain.replace(/-/g, ' ')}`,
    '',
    `**Reader**: ${readmeFor(domain)}`,
    `**Meta cluster**: ${scenarios[0].meta} — ${META_TITLE[scenarios[0].meta]}`,
    `**Scenarios**: ${scenarios.length} · **Examples**: ${examples}`,
    '',
    '## Scenarios',
    '',
    '| Scenario | Tier | Engines | Example files |',
    '|---|---|---|---|',
    ...sorted.map(
      (s) =>
        `| ${s.intent} | ${s.tier} | ${s.engines.join(', ')} | ${s.examples
          .map((e) => `[\`${path.basename(e.file)}\`](../${e.file})`)
          .join('<br>')} |`,
    ),
    '',
  ];
  if (notes.order) md.push('## Reading order', '', notes.order, '');
  md.push(
    '## Engines in this goal',
    '',
    ...engines.map((e) => `- ${ENGINE_LINE[e] ?? `\`${e}\``}`),
    '',
    // A **file list**, not a directory link: a reader who follows this should land on a page, and the
    // engines this goal actually uses are the only ones worth naming here.
    `Details, limits and anti-patterns: ${engines.map((e) => `[\`../engines/${e}.md\`](../engines/${e}.md)`).join(' · ')}.`,
    '',    // Theme reachability: every goal can produce a figure, so every goal points at the contract,
    // which indexes the themes. One sentence on purpose — the rules live in palette.md, and the
    // theme choice follows where the figure will be *read*, not what it is about, so naming a
    // theme per goal here would be wrong half the time.
    '## Palette',
    '',
    'Every figure takes its colours from a theme. Pick one in',
    '[`../styles/palette.md`](../styles/palette.md) — the token contract, the theme index and the',
    'per-engine blocks all start there.',
    '',
    'Most figures in this set want **Default**. Depart from it for the medium, not the topic:',
    '**Print** when it may be photocopied, **Contrast** for low vision or large-print handouts,',
    '**Vivid** when it will be projected, **Accessible** when colour must not be the only cue,',
    '**Editorial** for long-form reading, **Slate** for technical reference, **Pastel** when the',
    'figure sits inside gentle prose, **Nord** for a cool Nordic register. Every theme is designed',
    'for a light ground — the set has no dark page.',
    '',  );
  if (notes.anti.length) {
    md.push('## Don\'t', '', ...notes.anti.map((a) => `- ${a}`), '');
  }
  md.push('<!-- generated by scripts/build-goals.mjs — edit catalog/scenarios.tsv or the NOTES map -->');
  files.set(domain, md.join('\n') + '\n');
}

function readmeFor(domain) {
  const README = {
    'service-reliability': 'SRE and platform engineers measuring whether a service keeps its promises.',
    'ops-monitoring': 'Operators watching incident volume, outliers and scorecards over time.',
    'delivery-throughput': 'Engineering leadership asking how much we ship and how fast.',
    'goal-and-status-reporting': 'Executives and programme leads reading status against targets.',
    'product-metrics': 'Product managers tracking conversion, adoption and customer health.',
    'business-reporting': 'Finance and business owners reporting periodic results and revenue mix.',
    'go-to-market': 'Sales and partner teams covering pipeline, channels and market entry.',
    'cost-and-budget': 'FinOps and finance breaking down spend and budgets.',
    'data-exploration': 'Analysts looking for structure, correlation, outliers and missing data.',
    'engineering-operations': 'Engineering managers running recurring rituals and release operations.',
    'incident-management': 'Incident commanders and on-call engineers during and after an incident.',
    'process-and-workflow': 'Operations teams describing how work moves through approvals.',
    'software-design': 'Engineers describing how a system is put together — its types, components, packages and scope.',
    'software-behaviour': 'Engineers describing how a system behaves at runtime: states, calls, messaging and placement.',
    'dependencies-and-relations': 'Engineers tracing dependencies, impact and causality.',
    'cloud-architecture': 'Cloud architects placing workloads on AWS, Kubernetes or IoT platforms.',
    'data-platform': 'Data engineers describing pipelines, storage, models and schemas.',
    'network-topology': 'Network engineers mapping devices, links, packets and traffic.',
    'security-and-compliance': 'Security teams showing controls, boundaries, evidence and risk.',
    'enterprise-architecture': 'Enterprise architects aligning capabilities with IT.',
    'organization-and-roles': 'HR and managers showing who reports where and what each team covers.',
    'people-and-hiring': 'Managers running hiring, onboarding, skills and career paths.',
    'knowledge-and-outline': 'Learners and authors organising knowledge, topics and concepts.',
    'planning-and-roadmap': 'Product and programme managers showing when things happen.',
    'migration-and-rollout': 'Programme leads sequencing a migration, cutover or rollout.',
    'comparison-and-selection': 'Decision makers choosing between options and recording why.',
    'internal-documents': 'Internal readers getting one page that settles one question.',
    'catalogues-and-inventories': 'Readers looking up what we offer, support or standardise on.',
    'customer-and-partner-comms': 'External audiences receiving a brief, story or bulletin.',
    'system-architecture': 'Architects and engineers showing a whole system on one page.',
    'theme-and-tone': 'Authors choosing how a figure should look for the medium it will be read in — print, projection, low vision, long-form.',
  };
  return README[domain] ?? '';
}

let stale = 0;
fs.mkdirSync(GOALS, { recursive: true });
for (const [domain, content] of files) {
  const target = path.join(GOALS, `${domain}.md`);
  const existing = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
  if (existing === content) continue;
  if (process.argv.includes('--check')) {
    console.error(`stale goal doc: goals/${domain}.md`);
    stale++;
    continue;
  }
  fs.writeFileSync(target, content);
}
if (process.argv.includes('--check') && stale) process.exit(1);
console.log(
  process.argv.includes('--check')
    ? `✓ ${files.size} goal docs up to date`
    : `✓ wrote ${files.size} goal docs`,
);
