#!/usr/bin/env node
/**
 * Validate the skills repository layout (repo-level gate; not shipped in the package).
 *
 *   node scripts/validate-skills.mjs [--json]
 *
 * Checks
 *   1. layout invariants — exactly one SKILL.md, at <pkg>/SKILL.md, and its directory name
 *      equals the frontmatter `name` (installers take the directory as the skill name)
 *   2. self-containment — package files never reference paths outside the package
 *   3. fences — examples only use the recommended fences; no ```html blocks; no blank lines
 *      inside bare HTML blocks (a blank line ends a CommonMark HTML block)
 *   4. budgets — SKILL.md / goals / engines / examples line and byte budgets
 *   5. catalog consistency — catalog/scenarios.json ↔ filesystem ↔ goals/ ↔ SKILL.md router
 *   6. language policy — the shipped package is English-only (no CJK)
 *   7. engine ledgers — every engine reference links its coverage ledger
 *   8. theme reachability — styles/palette.md is linked from SKILL.md, from ≥1 goal doc and from
 *      every engine reference; every styles/themes/*.md is linked from the palette contract
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PKG_DIRS = fs
  .readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !['.git', 'node_modules', 'scripts', 'research'].includes(d.name))
  .map((d) => d.name);

const ALLOWED_FENCES = ['plantuml', 'puml', 'vega', 'vega-lite', 'vegalite', 'echarts', 'infographic'];
// There is deliberately no banned-fence list: anything outside ALLOWED_FENCES is already rejected
// below, so a second list could only drift away from the first.
// Legal attachments are not routing content: nothing should send an agent to read the terms, so they are
// exempt from the reachability rule below. They must still live *inside* the package — the installer
// copies the package directory only, so a repo-root LICENSE never reaches an installed copy.
const LEGAL_FILE_RE = /^(LICENSE|COPYING|NOTICE)(\.(md|txt))?$/i;
const BUDGET = { skill: 300, goal: 200, engine: 300, coverage: 330, example: 120, theme: 400 };
const EXAMPLE_HARD_LIMIT = 200; // Vega/Vega-Lite specs legitimately run longer than prose-only files
const BUDGET_BYTES = { skill: 12 * 1024, description: 1024 };

const problems = [];
const notes = [];
const fail = (file, msg) => problems.push({ file, msg });

// ------------------------------------------------------- 1. layout invariants
const skillFiles = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === 'SKILL.md') skillFiles.push(path.relative(ROOT, p));
  }
};
walk(ROOT);

if (skillFiles.length !== 1) {
  fail('.', `expected exactly one SKILL.md, found ${skillFiles.length}: ${skillFiles.join(', ')}`);
}
const pkg = skillFiles.length === 1 ? skillFiles[0].split('/')[0] : PKG_DIRS[0];
const PKG = path.join(ROOT, pkg);
const skillPath = path.join(PKG, 'SKILL.md');

const skillText = fs.readFileSync(skillPath, 'utf8');
const nameMatch = skillText.match(/^name:\s*(\S+)/m);
if (!nameMatch) fail(`${pkg}/SKILL.md`, 'frontmatter is missing `name`');
else if (nameMatch[1] !== pkg) fail(`${pkg}/SKILL.md`, `frontmatter name "${nameMatch[1]}" ≠ directory "${pkg}"`);
for (const kw of ['plantuml', 'echarts', 'vega', 'infographic', 'not recommended', 'Not for']) {
  if (!skillText.toLowerCase().includes(kw.toLowerCase())) {
    fail(`${pkg}/SKILL.md`, `description/body never mentions "${kw}"`);
  }
}

// ----------------------------------------------------------- 3. fence hygiene
const mdFiles = [];
const collect = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collect(p);
    else if (e.name.endsWith('.md')) mdFiles.push(p);
  }
};
collect(PKG);

const anyFenceRe = /^```([a-z0-9-]+)\b/gm;

let exampleCount = 0;
for (const f of mdFiles) {
  const rel = path.relative(ROOT, f);
  const text = fs.readFileSync(f, 'utf8');
  const lines = text.split('\n');
  const isExample = rel.startsWith(`${pkg}/examples/`);

  if (isExample && /^```html\b/m.test(text)) {
    fail(rel, 'uses a ```html block — cards must be bare HTML');
  }
  if (isExample) {
    exampleCount++;
    for (const m of text.matchAll(anyFenceRe)) {
      const lang = m[1];
      if (lang === 'text' || lang === 'json' || lang === 'md' || lang === 'markdown') continue;
      if (!ALLOWED_FENCES.includes(lang)) {
        fail(rel, `fence "${lang}" is not in the allowed set`);
      }
    }
    // bare HTML must not contain a blank line *inside* the block: a blank line ends a
    // CommonMark HTML block, so markup after one silently becomes a second block
    const srcLines = text.split('\n');
    const startIdx = srcLines.findIndex((l) => /^<[a-z]/.test(l));
    if (startIdx >= 0) {
      for (let i = startIdx; i < srcLines.length; i++) {
        if (srcLines[i].trim() !== '') continue;
        let j = i;
        while (j < srcLines.length && srcLines[j].trim() === '') j++;
        if (/^</.test(srcLines[j] ?? '')) {
          notes.push({ file: rel, msg: `blank line inside bare HTML at line ${i + 1} — it ends the block` });
        } else {
          break; // the card ended; the rest of the file is prose
        }
      }
    }
  }

  // ------------------------------------------------------- 4. budgets
  const isGenerated = rel.includes('/engines/plantuml-stencils/');
  const budget =
    rel === `${pkg}/SKILL.md` ? BUDGET.skill
      : rel.startsWith(`${pkg}/goals/`) ? BUDGET.goal
        : rel.startsWith(`${pkg}/engines/coverage/`) ? BUDGET.coverage
          : rel.startsWith(`${pkg}/engines/`) ? (isGenerated ? null : BUDGET.engine)
            : rel.startsWith(`${pkg}/styles/themes/`) ? BUDGET.theme
              : isExample ? BUDGET.example
              : null;
  if (budget && lines.length > budget) {
    if (isExample && lines.length <= EXAMPLE_HARD_LIMIT) {
      notes.push({ file: rel, msg: `${lines.length} lines over the ${budget}-line target (hard limit ${EXAMPLE_HARD_LIMIT})` });
    } else {
      fail(rel, `${lines.length} lines exceeds the ${budget}-line budget`);
    }
  }
  if (rel === `${pkg}/SKILL.md`) {
    // The body stays lean (progressive disclosure); the frontmatter description is the trigger
    // surface and deliberately names the goal vocabulary, so it has its own budget.
    const body = text.replace(/^---[\s\S]*?^---/m, '');
    // `description: >` is a **folded** scalar, so the value a client parses has its line breaks folded
    // to spaces. The spec's 1024 limit applies to that value, not to the source text — counting source
    // characters added 22 here (indentation and line breaks) and reported an over-long description that
    // was actually inside the limit.
    const desc = (text.match(/^description:\s*>?([\s\S]*?)^---/m) ?? ['', ''])[1].trim().replace(/\n\s*/g, ' ');
    if (Buffer.byteLength(body) > BUDGET_BYTES.skill) {
      fail(rel, `body is ${(Buffer.byteLength(body) / 1024).toFixed(1)} KB, over the 12 KB budget`);
    }
    // The Agent Skills spec caps `description` at 1024 characters, and the cap matters: it is the whole
    // trigger surface, so a client that truncates an over-long one silently loses the tail — which is
    // where the newest domains sit. Measured before this budget existed: 1682 characters, 658 over.
    if (desc.length > BUDGET_BYTES.description) {
      fail(rel, `description is ${desc.length} characters, over the Agent Skills limit of ${BUDGET_BYTES.description}`);
    }
  }
}

// ------------------------------------------------------ 2. self-containment
// Resolve every relative link and fail when it leaves the package directory.
for (const f of mdFiles) {
  const rel = path.relative(ROOT, f);
  const text = fs.readFileSync(f, 'utf8');
  for (const m of text.matchAll(/\]\(([^)#\s]+)\)/g)) {
    const target = m[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const resolved = path.resolve(path.dirname(f), target.split('#')[0]);
    if (!resolved.startsWith(PKG + path.sep) && resolved !== PKG) {
      fail(rel, `link escapes the package: ${target}`);
    } else if (!fs.existsSync(resolved)) {
      // A shipped ledger, goal guide or engine reference must never point at a missing file.
      fail(rel, `link does not resolve: ${target}`);
    }
  }
  // The installed package has no `research/` and no `scripts/`: repo-only paths must never be
  // cited, in links or in inline code, or the agent will look for files that are not there.
  for (const m of text.matchAll(/`([^`\n]*(?:research|scripts)\/[^`\n]*)`/g)) {
    if (/^\s*(node |npm )/.test(m[1])) continue; // commands are fine
    fail(rel, `cites a repo-only path: ${m[1]}`);
  }
}

// ---------------------------------------------------- 5. catalog consistency
const catalogPath = path.join(PKG, 'catalog', 'scenarios.json');
let catalog = null;
if (!fs.existsSync(catalogPath)) {
  fail(`${pkg}/catalog/scenarios.json`, 'missing');
} else {
  catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const onDisk = new Set();
  for (const d of fs.readdirSync(path.join(PKG, 'examples'), { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    for (const f of fs.readdirSync(path.join(PKG, 'examples', d.name))) {
      if (f.endsWith('.md')) onDisk.add(`examples/${d.name}/${f}`);
    }
  }
  const inCatalog = new Set();
  for (const s of catalog.scenarios) {
    if (!fs.existsSync(path.join(PKG, 'goals', `${s.domain}.md`))) {
      fail(`${pkg}/catalog`, `scenario ${s.id} has no goals/${s.domain}.md`);
    }
    for (const e of s.examples) {
      inCatalog.add(e.file);
      if (!fs.existsSync(path.join(PKG, e.file))) fail(`${pkg}/catalog`, `example missing on disk: ${e.file}`);
    }
    if (!skillText.includes(`${s.domain}.md`)) {
      fail(`${pkg}/SKILL.md`, `router never mentions the domain "${s.domain}"`);
    }
  }
  for (const f of onDisk) if (!inCatalog.has(f)) fail(`${pkg}/examples`, `file is not in the catalog: ${f}`);
  for (const f of inCatalog) if (!onDisk.has(f)) fail(`${pkg}/examples`, `catalog entry has no file: ${f}`);

  // An example that points at a sibling must point at a real one. This is how a figure's
  // `Alternatives` table cross-references another figure, and §2 cannot see it: the reference is
  // written as inline code, not as a link, so a broken one is invisible. Measured before this check
  // existed: 11 references to files that had never existed — plausible-looking names that an earlier
  // pass invented (some were infographic *template* names wearing a `.md` suffix).
  const exampleBasenames = new Set([...onDisk].map((f) => f.split('/').pop()));
  // A reference may legitimately name a package file that is not an example — a theme, the contract, a
  // goal guide. Derived from disk rather than hard-coded, so shipping a new file cannot produce a false
  // positive and the check keeps asking only its own question: does this name an example that exists?
  const nonExampleDocs = new Set(
    mdFiles
      .map((f) => path.relative(ROOT, f))
      .filter((r) => r.startsWith(`${pkg}/`) && !r.startsWith(`${pkg}/examples/`))
      .map((r) => r.split('/').pop()),
  );
  for (const f of mdFiles) {
    const rel = path.relative(ROOT, f);
    if (!rel.startsWith(`${pkg}/examples/`)) continue;
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/`([a-z0-9][a-z0-9-]*\.md)`/g)) {
      if (nonExampleDocs.has(m[1]) || exampleBasenames.has(m[1])) continue;
      fail(rel, `names an example file that does not exist: ${m[1]}`);
    }
  }

  // Two rows of an `Alternatives` table pointing at the same figure is redundancy the reader pays for
  // and gains nothing from: the table's job is to offer *different* next steps. The existence check
  // above cannot see it — both names resolve. Measured before this check existed: 2 files offered a
  // duplicate target, both introduced by a bulk rename that mapped two old names onto one new file.
  for (const f of mdFiles) {
    const rel = path.relative(ROOT, f);
    if (!rel.startsWith(`${pkg}/examples/`)) continue;
    const after = fs.readFileSync(f, 'utf8').split(/^## Alternatives\s*$/m)[1];
    if (!after) continue;
    const seen = new Set();
    for (const m of after.split(/^## /m)[0].matchAll(/`([a-z0-9][a-z0-9-]*\.md)`/g)) {
      if (seen.has(m[1])) fail(rel, `Alternatives table offers \`${m[1]}\` twice`);
      seen.add(m[1]);
    }
  }

  // Every file in the package must be **reachable from `SKILL.md`**. A skill package is exactly the set
  // of files an agent can be sent to; anything else is either a leftover or a file nobody links, and
  // both are dead weight the reader pays for. Measured before this check existed: 1 unreachable file —
  // `styles/README.md`, a second theme index that had already drifted out of sync with the contract it
  // duplicated (it still linked the deleted `themes/dark.md`).
  {
    const all = [];
    const gather = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === '.git' || e.name === 'node_modules') continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) gather(p);
        else all.push(p);
      }
    };
    gather(PKG);
    const byBase = new Map();
    for (const f of all) {
      const b = path.basename(f);
      if (!byBase.has(b)) byBase.set(b, []);
      byBase.get(b).push(f);
    }
    // A reference is a markdown link, an inline-code filename, or a `<placeholder>` pattern that stands
    // for a family (`goals/<domain>.md`, `engines/<engine>.md`).
    const refsOf = (text) => {
      const out = new Set();
      for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) out.add(m[1]);
      for (const m of text.matchAll(/`([A-Za-z0-9_./<>*-]+\.(?:md|tsv|json))`/g)) out.add(m[1]);
      for (const m of text.matchAll(/(?:^|[\s`(])((?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]*<[a-z]+>[A-Za-z0-9_.-]*\.md)/g)) out.add(m[1]);
      return out;
    };
    const resolveRef = (target, fromFile) => {
      const clean = target.replace(/#.*$/, '');
      const hits = new Set();
      if (clean.includes('<') || clean.includes('*')) {
        const rx = new RegExp(
          '^' + clean.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/<[a-z]+>/g, '[^/]+').replace(/\*/g, '[^/]*') + '$',
        );
        for (const f of all) if (rx.test(path.relative(PKG, f))) hits.add(f);
        return hits;
      }
      for (const c of [path.resolve(path.dirname(fromFile), clean), path.resolve(PKG, clean)]) {
        if (fs.existsSync(c) && fs.statSync(c).isFile()) hits.add(c);
      }
      if (!hits.size) for (const f of byBase.get(path.basename(clean)) ?? []) hits.add(f);
      return hits;
    };
    const seen = new Set([path.join(PKG, 'SKILL.md')]);
    const queue = [...seen];
    while (queue.length) {
      const f = queue.pop();
      if (!/\.(md|tsv|json)$/.test(f)) continue;
      for (const r of refsOf(fs.readFileSync(f, 'utf8'))) {
        for (const hit of resolveRef(r, f)) {
          if (!seen.has(hit)) {
            seen.add(hit);
            queue.push(hit);
          }
        }
      }
    }
    for (const f of all) {
      if (LEGAL_FILE_RE.test(path.basename(f))) continue; // LICENSE.md ships unlinked, by design
      if (!seen.has(f)) fail(path.relative(ROOT, f), 'unreachable from SKILL.md — nothing links it, so it is dead weight');
    }
  }

  const domains = new Set(catalog.scenarios.map((s) => s.domain));
  const goalFiles = fs.readdirSync(path.join(PKG, 'goals')).filter((f) => f.endsWith('.md'));
  for (const g of goalFiles) {
    if (!domains.has(g.replace(/\.md$/, ''))) fail(`${pkg}/goals/${g}`, 'no scenario in the catalog for this domain');
  }
  for (const d of domains) {
    const n = catalog.scenarios.filter((s) => s.domain === d).length;
    if (n < 3 || n > 8) notes.push({ file: `${pkg}/catalog`, msg: `${d} has ${n} scenarios (rule: 3–8)` });
  }
}

// ------------------------------------------------------- 6. language policy
// The package is distributed to an English-language audience: no CJK text anywhere in it.
const CJK_RE = /[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef]/;
for (const f of mdFiles) {
  const rel = path.relative(ROOT, f);
  const line = fs.readFileSync(f, 'utf8').split('\n').findIndex((l) => CJK_RE.test(l));
  if (line >= 0) fail(rel, `CJK text at line ${line + 1} — the package is English-only`);
}

// The frontmatter description is the trigger surface: it must name one anchor term per goal domain.
// Synonyms are deliberately not required — the description is read by a model, not an indexer.
const GOAL_KEYWORDS = [
  // A — data & metrics
  'latency', 'incident', 'throughput', 'cycle time', 'OKR', 'funnel', 'retention', 'revenue', 'budget',
  'correlation',
  // B — process & systems
  'standup', 'on-call', 'approval', 'BPMN', 'class', 'state machine', 'sequence', 'dependency', 'ER',
  // `architecture` anchors `system-architecture`; without it the trigger surface never mentioned the
  // one domain whose figures are drawn as HTML pages, which is how it stayed invisible to routing.
  'architecture',
  // C — infrastructure & governance
  'cloud', 'Kubernetes', 'ETL', 'network', 'security', 'IAM', 'ArchiMate', 'org chart', 'hiring',
  // D — knowledge & expression
  'mind map', 'roadmap', 'Gantt', 'migration', 'SWOT', 'memo', 'policy', 'catalogue', 'case study',
  'layout',
];
const description = (skillText.match(/^description:\s*>?([\s\S]*?)^---/m) ?? ['', ''])[1].toLowerCase();
const missing = GOAL_KEYWORDS.filter((k) => !description.includes(k.toLowerCase()));
if (missing.length) fail(`${pkg}/SKILL.md`, `description is missing goal keywords: ${missing.join(', ')}`);

// The router's whole job is to send a term to **one** goal. A term on two rows sends the agent to two
// places and leaves it guessing, which is the failure mode this table exists to prevent. The frontmatter
// description may be generous — it is prose a model reads — but the table is a decision, so it must be
// unambiguous. Measured before this check existed: 5 collisions, three of them introduced by a bulk edit
// and two of them genuine semantic overlaps ("outliers" as an alert versus as a finding; "scorecard" as
// status versus as selection).
const keywordOwner = new Map();
for (const m of skillText.matchAll(/^\|\s*([a-z-]+)\s*\|\s*([^|]+?)\s*\|\s*[^|]*\|\s*\[goals\//gm)) {
  const [, domain, words] = m;
  for (const w of words.split('·').map((s) => s.trim().toLowerCase()).filter(Boolean)) {
    const owner = keywordOwner.get(w);
    if (owner && owner !== domain) {
      fail(`${pkg}/SKILL.md`, `trigger keyword "${w}" routes to both ${owner} and ${domain}`);
    }
    keywordOwner.set(w, domain);
  }
}

// ------------------------------------------------------- 7. legacy coverage
// Every engine reference must ship a coverage ledger: the per-unit disposition record that answers
// "is X supported here, and why not" without leaving the package.
const engineFiles = fs.readdirSync(path.join(PKG, 'engines')).filter((f) => f.endsWith('.md'));
for (const f of engineFiles) {
  const ledger = path.join(PKG, 'engines', 'coverage', f);
  if (!fs.existsSync(ledger)) {
    fail(`${pkg}/engines/${f}`, `no coverage ledger at engines/coverage/${f}`);
    continue;
  }
  if (!fs.readFileSync(path.join(PKG, 'engines', f), 'utf8').includes(`coverage/${f}`)) {
    fail(`${pkg}/engines/${f}`, `does not link to its coverage ledger (coverage/${f})`);
  }
}

// ---------------------------------------------------- 8. theme reachability
// Colours live in one contract plus a theme per scenario, and a figure reaches them only through an
// engine block. If any hop is unreachable from the router, the agent writes raw hex — the failure
// this whole layer exists to prevent. Reachability is cheap to check and silent when it breaks.
//
// Match on resolved link *targets*, never on a bare substring: engine docs write
// [`../styles/palette.md`](../styles/palette.md), so a substring test stays green when only the
// label is left behind and the URL is broken.
const linkTargets = (file) => {
  const text = fs.readFileSync(file, 'utf8');
  const out = new Set();
  for (const m of text.matchAll(/\]\(([^)#\s]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(m[1])) continue;
    out.add(path.resolve(path.dirname(file), m[1].split('#')[0]));
  }
  return out;
};
const linkedFrom = (file, absTarget) => linkTargets(file).has(absTarget);

const paletteAbs = path.join(PKG, 'styles', 'palette.md');
const themeDir = path.join(PKG, 'styles', 'themes');
if (!fs.existsSync(paletteAbs)) {
  fail(`${pkg}/styles/palette.md`, 'missing — there is no contract for the tokens');
} else {
  if (!linkedFrom(skillPath, paletteAbs)) {
    fail(`${pkg}/SKILL.md`, 'has no link resolving to styles/palette.md');
  }
  const goalRefs = fs
    .readdirSync(path.join(PKG, 'goals'))
    .filter((f) => f.endsWith('.md'))
    .filter((f) => linkedFrom(path.join(PKG, 'goals', f), paletteAbs));
  if (goalRefs.length === 0) {
    fail(`${pkg}/goals`, 'no goal document links to styles/palette.md');
  }
  // Every engine reference must be able to reach the colours it is expected to use.
  for (const f of engineFiles) {
    if (!linkedFrom(path.join(PKG, 'engines', f), paletteAbs)) {
      fail(`${pkg}/engines/${f}`, 'has no link resolving to styles/palette.md');
    }
  }
}

if (!fs.existsSync(themeDir)) {
  fail(`${pkg}/styles/themes`, 'missing — a palette contract with no theme is unusable');
} else {
  const themeFiles = fs.readdirSync(themeDir).filter((f) => f.endsWith('.md'));
  if (themeFiles.length < 2) {
    fail(`${pkg}/styles/themes`, `only ${themeFiles.length} theme(s) — the point of a theme set is that it is a set`);
  }
  for (const f of themeFiles) {
    // A theme nothing links to is invisible to the agent, however good its colours are.
    if (!linkedFrom(paletteAbs, path.join(themeDir, f))) {
      fail(`${pkg}/styles/palette.md`, `does not link the theme styles/themes/${f}`);
    }
  }
}

// ------------------------------------------------------------------ report
const summary = {
  package: pkg,
  skillFiles: skillFiles.length,
  markdown: mdFiles.length,
  examples: exampleCount,
  domains: catalog ? new Set(catalog.scenarios.map((s) => s.domain)).size : 0,
  scenarios: catalog?.scenarios.length ?? 0,
  errors: problems.length,
  notes: notes.length,
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ summary, problems, notes }, null, 2));
} else {
  for (const p of problems) console.error(`✗ ${p.file}: ${p.msg}`);
  for (const n of notes) console.warn(`⚠ ${n.file}: ${n.msg}`);
  console.log(
    `${problems.length ? '✗' : '✓'} ${pkg} · SKILL.md ×${summary.skillFiles} · ` +
      `${summary.examples} examples · ${summary.scenarios} scenarios · ${summary.domains} domains · ` +
      `${problems.length} errors · ${notes.length} notes`,
  );
}
process.exit(problems.length ? 1 : 0);
