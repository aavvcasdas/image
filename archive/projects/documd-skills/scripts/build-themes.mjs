#!/usr/bin/env node
/**
 * Theme generator — renders `skills/documd-visuals/styles/themes/<id>.md` from
 * `skills/scripts/themes.json`.
 *
 *   node skills/scripts/build-themes.mjs            # write the theme files
 *   node skills/scripts/build-themes.mjs --check    # fail when a shipped file drifted
 *
 * Why generated: the shipped artifact is five themes × seven engines of copy-paste blocks, and the
 * blocks are 90 % identical between themes — only the values differ. Hand-maintaining that is how
 * a palette drifts. Here the *contract* (what each token is, which uses it may ever have) and the
 * *block shapes* are written once, the per-theme values are one table each, and `--check` makes the
 * shipped files provably equal to the source.
 *
 * Values are literal everywhere, including `html-css`. documd-visuals does not follow the host
 * document's theme: a theme is chosen for the figure, and the figure then looks the same wherever
 * it is pasted.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..'); // repo root
const DATA = path.join(import.meta.dirname, 'themes.json');
const OUT_DIR = path.join(ROOT, 'skills/documd-visuals/styles/themes');
const CHECK = process.argv.includes('--check');

// ------------------------------------------------------------------ colour maths
const toRgb = (hex) => {
  const h = hex.trim().replace(/^#/, '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};
const toHex = (rgb) =>
  `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => toHex(toRgb(a).map((v, i) => v + (toRgb(b)[i] - v) * t));

/** HSL lightness scale, keeping hue and saturation. `amount` is a signed fraction. */
function scaleLightness(hex, amount) {
  const [r, g, b] = toRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = Math.max(0, Math.min(1, ((max + min) / 2) * (1 + amount)));
  if (max === min) return toHex([l * 255, l * 255, l * 255]);
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const hue = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  const h = hue / 6;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    let u = t;
    if (u < 0) u += 1;
    if (u > 1) u -= 1;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  return toHex([f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]);
}

// ------------------------------------------------------------------ block shapes
/**
 * Every block is written once, with `{{token}}` placeholders. A theme supplies the values.
 * `variant` is the name `apply-block.mjs` looks up; `note` is the one thing a writer must know
 * before pasting (the long-form mechanism lives in `engines/<engine>.md`).
 */
const BLOCKS = (t) => [
  {
    engine: 'plantuml',
    variant: 'structure',
    title: 'structure, class, component, deployment',
    note: 'One block per diagram. This is the UML family — `@startmindmap`, `@startgantt`, `@startpacketdiag` and `@startwbs` ignore `skinparam` entirely (measured: byte-identical output with and without it). `Package` carries two lines rather than three: `PackageFontColor` is a measured no-op.',
    lang: 'plantuml',
    lines: [
      ...[
        'Rectangle', 'Component', 'Class', 'Usecase', 'Database', 'Node', 'Actor',
        'State', 'Artifact', 'Cloud', 'Folder', 'Package',
      ].flatMap((el) => [
        `skinparam ${el}BackgroundColor ${t('surface-1')}`,
        `skinparam ${el}BorderColor ${t('line')}`,
        // `PackageFontColor` is the one measured no-op in this family: the key parses, the value is
        // accepted, and the package label keeps the default colour. Shipping a line that provably
        // does nothing is worse than shipping nothing — it reads as a capability. Measured in
        // `research/plantuml/style-support-matrix.md` §4.2; `Package` stays in the list for the two
        // keys that do work.
        ...(el === 'Package' ? [] : [`skinparam ${el}FontColor ${t('ink')}`]),
      ]),
      'skinparam DefaultFontColor ' + t('ink'),
      'skinparam ArrowColor ' + t('line'),
      'skinparam ArrowFontColor ' + t('ink'),
      'skinparam NoteBackgroundColor ' + t('surface-2'),
      'skinparam NoteBorderColor ' + t('line'),
      'skinparam NoteFontColor ' + t('ink'),
      ...['A', 'C', 'E', 'I'].flatMap((L) => [
        `skinparam stereotype${L}BackgroundColor ${t('tint-cat-1')}`,
        `skinparam stereotype${L}BorderColor ${t('line')}`,
      ]),
    ],
  },
  {
    engine: 'plantuml',
    variant: 'sequence',
    title: 'sequence',
    note: 'Sequence diagrams take their own participant and lifeline keys; `ArrowColor` is shared with the structure block.',
    lang: 'plantuml',
    lines: [
      'skinparam DefaultFontColor ' + t('ink'),
      'skinparam ArrowColor ' + t('line'),
      'skinparam ArrowFontColor ' + t('ink'),
      'skinparam ParticipantBackgroundColor ' + t('surface-1'),
      'skinparam ParticipantBorderColor ' + t('line'),
      'skinparam ParticipantFontColor ' + t('ink'),
      'skinparam SequenceLifeLineBorderColor ' + t('line'),
      'skinparam NoteBackgroundColor ' + t('surface-2'),
      'skinparam NoteBorderColor ' + t('line'),
      'skinparam NoteFontColor ' + t('ink'),
    ],
  },
  {
    engine: 'plantuml',
    variant: 'activity',
    title: 'activity',
    note: 'Activity steps take their own keys; the diamond is the decision node. A step can also be coloured on its own with `:step; <<#fill>>` — see the element block.',
    lang: 'plantuml',
    lines: [
      'skinparam DefaultFontColor ' + t('ink'),
      'skinparam ArrowColor ' + t('line'),
      'skinparam ArrowFontColor ' + t('ink'),
      'skinparam ActivityBackgroundColor ' + t('surface-1'),
      'skinparam ActivityBorderColor ' + t('line'),
      'skinparam ActivityDiamondBackgroundColor ' + t('surface-2'),
    ],
  },
  {
    engine: 'plantuml',
    variant: 'element',
    title: 'per-element colour',
    note: 'When a block is not enough, colour one element. Use the **semicolon** form on every shape: `#fill;line:border`, with **no `#`** on the inner value. The `##` form is legal on the `class` family only — on a `rectangle`, official PlantUML does not error, it appends the suffix to the element name and falls back to an unparsed-colour fill, which is worse than a syntax error.',
    lang: 'plantuml',
    lines: [
      `rectangle "Order service" as svc ${t('tint-cat-1')};line:${t('shade-cat-1').slice(1)}`,
      `rectangle "Failed batch" as fail ${t('tint-cat-4')};line:${t('shade-cat-4').slice(1)}`,
    ],
  },
  {
    engine: 'infographic',
    variant: 'theme',
    title: 'theme block',
    note: 'Paste directly after the `infographic <template>` line, before `data`. `palette` must be a **list** — one `- #hex` per line; the space-separated form is a syntax error. Multi-colour templates read the ramp in order; single-colour templates ignore it and derive everything from `colorPrimary`, which is why one block serves all 113 templates.',
    lang: 'infographic',
    lines: [
      'theme',
      `  colorPrimary ${t('cat-1')}`,
      '  palette',
      ...Array.from({ length: 8 }, (_, i) => `    - ${t(`cat-${i + 1}`)}`),
    ],
  },
  {
    engine: 'echarts',
    variant: 'color',
    title: 'colour ramp',
    note: 'One line at the top level of every spec. Multi-series charts take one colour per series; a single series with coloured items (pie, sunburst, treemap, radar) takes one per data item; a plain single-series chart uses only the first. `itemStyle.color` on a series overrides this ramp.',
    lang: 'echarts',
    lines: [`"color": [${Array.from({ length: 8 }, (_, i) => `"${t(`cat-${i + 1}`)}"`).join(', ')}]`],
  },
  {
    engine: 'vega-lite',
    variant: 'config',
    title: 'config (Vega-Lite)',
    note: 'Add as the first key of the spec. This sets the categorical range for every scale that does not declare its own.',
    lang: 'vega-lite',
    lines: [
      `"config": { "range": { "category": [${Array.from({ length: 8 }, (_, i) => `"${t(`cat-${i + 1}`)}"`).join(', ')}] } }`,
    ],
  },
  {
    engine: 'vega',
    variant: 'scale',
    title: 'ordinal colour scale (Vega)',
    note: 'Rewrite the `range` of the ordinal colour scale the marks reference. Replace the `<dataset>` / `<category field>` placeholders with the real names. An explicit `scale.range` beats `config.range.category`, so a Vega spec must carry the ramp here.',
    lang: 'vega',
    lines: [
      `{ "name": "color", "type": "ordinal", "domain": { "data": "<dataset>", "field": "<category field>" }, "range": [${Array.from({ length: 8 }, (_, i) => `"${t(`cat-${i + 1}`)}"`).join(', ')}] }`,
    ],
  },
  {
    engine: 'html-css',
    variant: 'card',
    title: 'card',
    note: 'Bare HTML card, coloured from the theme. The values are literal on purpose: documd-visuals does not follow the host document, so a card looks the same wherever it is pasted.',
    lang: 'css',
    lines: [
      '.card {',
      `  background: ${t('surface-1')};`,
      `  border-left: 4px solid ${t('cat-1')};`,
      `  color: ${t('ink')};`,
      '}',
      `.card .kicker { color: ${t('cat-1')}; }`,
    ],
  },
  {
    engine: 'html-css',
    variant: 'badge',
    title: 'badge',
    note: 'A small status chip: the tint carries the fill, the shade the border, and `ink` the label.',
    lang: 'css',
    lines: [
      '.badge {',
      `  background: ${t('tint-cat-1')};`,
      `  color: ${t('ink')};`,
      `  border: 1px solid ${t('shade-cat-1')};`,
      '}',
    ],
  },
];

/**
 * A **complete figure** for this theme, not a fragment.
 *
 * Every other section of the file shows a *piece* — the skinparam list you paste, one `"color"`
 * line, a CSS rule. Those are the deliverable, but they do not answer "what does this
 * theme look like", which is the first question anyone asks of a theme. This does: eight adjacent
 * stack segments so the ramp can be judged as a set, a surface panel with its `line` border, `ink`
 * and `muted` text, `line` on the axes, and `target` / `negative` as the dashed thresholds.
 *
 * It is a real spec — built as an object and serialised, so it cannot be invalid JSON — and
 * `verify-blocks.mjs` renders it like every other block. A theme with a wrong value therefore cannot
 * ship a plausible-looking preview.
 */
function previewSpec(t) {
  const cats = ['Direct', 'Partner', 'Search', 'Social', 'Email', 'Referral', 'Events', 'Other'];
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const series = cats.map((name, i) => ({
    name,
    type: 'bar',
    stack: 'total',
    barWidth: '52%',
    itemStyle: { color: t(`cat-${i + 1}`) },
    data: quarters.map((_, q) => 18 + ((i * 7 + q * 13) % 26)),
  }));
  // The two dashed thresholds are the semantic line tokens: `target` is the goal marker the contract
  // defines it as, `negative` a limit that has been breached. `warning` is deliberately absent — it
  // is fill-only in every theme, so it may not be a line.
  series[series.length - 1].markLine = {
    silent: true,
    symbol: 'none',
    data: [
      { yAxis: 150, lineStyle: { type: 'dashed', color: t('target') }, label: { color: t('muted'), formatter: 'target' } },
      { yAxis: 185, lineStyle: { type: 'dotted', color: t('negative') }, label: { color: t('muted'), formatter: 'limit' } },
    ],
  };
  return {
    width: 640,
    height: 360,
    // The renderers force a transparent background, so a theme's page colour is drawn as a panel
    // rather than set as `backgroundColor` — which is also how a figure carries its own ground.
    // Two levels of it, page and plot area, because the surface ladder is what most figures use and
    // a single panel would hide the distinction.
    graphic: [
      {
        type: 'rect',
        left: 0,
        top: 0,
        z: -10,
        shape: { width: 640, height: 360 },
        style: { fill: t('surface-0'), stroke: t('line'), lineWidth: 1 },
      },
      {
        type: 'rect',
        left: 42,
        top: 70,
        z: -9,
        shape: { width: 570, height: 228 },
        style: { fill: t('surface-1'), stroke: t('line'), lineWidth: 1 },
      },
    ],
    title: {
      text: 'Quarterly volume by channel',
      subtext: 'all eight categories, adjacent, on this theme’s own surface',
      left: 14,
      top: 10,
      textStyle: { color: t('ink'), fontSize: 15 },
      subtextStyle: { color: t('muted'), fontSize: 11 },
    },
    color: cats.map((_, i) => t(`cat-${i + 1}`)),
    legend: { bottom: 6, itemWidth: 10, itemHeight: 10, textStyle: { color: t('ink'), fontSize: 10 } },
    grid: { left: 52, right: 18, top: 76, bottom: 52 },
    xAxis: {
      type: 'category',
      data: quarters,
      axisLine: { lineStyle: { color: t('line') } },
      axisTick: { lineStyle: { color: t('line') } },
      axisLabel: { color: t('muted') },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: t('muted') },
      splitLine: { lineStyle: { color: t('line') } },
    },
    series,
  };
}

// ------------------------------------------------------------------ data
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const contract = data.contract;
const CONTRACT_TOKENS = Object.keys(contract).filter((k) => !k.startsWith('$'));
const FAMILIES = ['cat-1', 'cat-2', 'cat-3', 'cat-4', 'cat-5', 'cat-6', 'cat-7', 'cat-8', 'positive', 'negative', 'warning'];

const problems = [];
const fail = (msg) => problems.push(msg);

/** Resolve one theme into values, uses, derived colours and a lookup for the blocks. */
function resolve(theme) {
  const where = `themes.json: theme "${theme.id}"`;
  const raw = theme.tokens ?? {};
  const missing = CONTRACT_TOKENS.filter((k) => !raw[k]);
  if (missing.length) fail(`${where}: missing token(s) ${missing.join(', ')}`);
  const unknown = Object.keys(raw).filter((k) => !contract[k]);
  if (unknown.length) fail(`${where}: unknown token(s) ${unknown.join(', ')}`);

  const uses = new Map();
  const values = new Map();
  const textOn = new Map();
  for (const [name, [value, use = '', on]] of Object.entries(raw)) {
    if (!/^#[0-9a-f]{6}$/i.test(value)) fail(`${where}: \`${name}\` value "${value}" is not a 6-digit hex`);
    values.set(name, value.toLowerCase());
    uses.set(name, use);
    if (on) textOn.set(name, on);
    const max = contract[name]?.max ?? '';
    for (const flag of use) {
      if (!max.includes(flag)) {
        fail(`${where}: \`${name}\` claims use "${flag}" but the contract caps it at "${max || 'none'}"`);
      }
    }
  }

  // derived colours — computed, never hand-written
  const derived = new Map();
  for (const family of FAMILIES) {
    const base = values.get(family);
    if (!base) continue;
    const tint = mix(theme.ground, base, 0.18);
    // A family gets a shade only if the theme lets it be a line: the shade's job is to border that
    // family's own fill, and a family too light to be a line is too light to be a border either.
    // The shade is always *darker*: every theme in the set is designed for a light ground, so a
    // fill's border has to be darker than the fill. There is no dark ground and no polarity axis.
    const shade = uses.get(family)?.includes('l') ? scaleLightness(base, -0.12) : null;
    derived.set(family, { family, base, tint, shade });
  }

  const lookup = (name) => {
    if (values.has(name)) return values.get(name);
    if (name.startsWith('tint-') || name.startsWith('shade-')) {
      const family = name.replace(/^(tint|shade)-/, '');
      const d = derived.get(family);
      const v = name.startsWith('tint-') ? d?.tint : d?.shade;
      if (!v) throw new Error(`${where}: block asked for \`${name}\` but ${family} has no such derivation`);
      return v;
    }
    throw new Error(`${where}: block asked for unknown token \`${name}\``);
  };

  const resolveTextOn = (on) => (on.startsWith('#') ? on : values.get(on) ?? on);

  return { ...theme, uses, values, textOn, derived, lookup, resolveTextOn };
}

// ------------------------------------------------------------------ rendering
const dash = '–';
const flag = (uses, f) => (uses.includes(f) ? '✓' : dash);

/**
 * The six engine references, as **file links rather than a directory link** — a reader following this
 * should land on a page. Every theme carries a block for every one of them, so the list is the same in
 * all nine files.
 */
const ENGINE_REFS = ['plantuml', 'echarts', 'vega', 'infographic', 'html-css']
  .map((e) => `[\`../../engines/${e}.md\`](../../engines/${e}.md)`)
  .join(' · ');

/**
 * Serialise JSON with short arrays and objects kept on one line.
 *
 * `JSON.stringify(spec, null, 2)` puts every array element on its own line, which turned a 90-line
 * figure into 250 — and a theme file is meant to be read. Inlining anything under `INLINE` characters
 * keeps the structure legible without the vertical sprawl.
 */
const INLINE = 160;
function prettyJson(value, indent = 0) {
  const pad = ' '.repeat(indent);
  const inner = ' '.repeat(indent + 2);
  const flat = JSON.stringify(value);
  if (!Array.isArray(value) && (value === null || typeof value !== 'object')) return flat;
  if (flat.length <= INLINE) return flat;
  if (Array.isArray(value)) {
    return `[\n${value.map((v) => inner + prettyJson(v, indent + 2)).join(',\n')}\n${pad}]`;
  }
  return `{\n${Object.entries(value).map(([k, v]) => `${inner}${JSON.stringify(k)}: ${prettyJson(v, indent + 2)}`).join(',\n')}\n${pad}}`;
}

function renderTheme(theme) {
  const t = theme.lookup;
  const out = [];
  out.push(`# ${theme.title} theme`, '');
  out.push(theme.summary, '');
  out.push('| | |', '|---|---|');
  out.push(`| scenario | ${theme.scenario} |`);
  out.push(`| ground | \`${theme.ground}\` |`);
  out.push('');

  out.push('## Preview', '');
  out.push('The theme in use, as one whole figure rather than a fragment. Eight adjacent stack segments');
  out.push('so the ramp can be judged as a set; two levels of surface — the page (`surface-0`) and the');
  out.push('plot panel (`surface-1`) — each with its `line` border; `ink` and `muted` text; `line` on the');
  out.push('axes; and `target` / `negative` as the two dashed thresholds. Rendered by the theme gate like');
  out.push('every other block, so a theme with a wrong value cannot ship a plausible-looking preview. What');
  out.push('this figure does not reach — `surface-2`, the derived tints and shades, `warning` — is in the');
  out.push('two tables below.', '');
  out.push('```echarts');
  out.push(...prettyJson(previewSpec(t)).split('\n'));
  out.push('```', '');

  out.push('## Tokens', '');
  out.push('`text` / `line` / `fill` are the uses this theme grants the token; `sits on` is what a');
  out.push('text token may be placed on, `text on it` what may be placed on a fill. The widest use a');
  out.push('token may ever be granted is fixed by the contract in [`palette.md`](../palette.md) — a');
  out.push('theme narrows, it never widens.', '');
  out.push('| token | value | text | line | fill | text on it | sits on | role |');
  out.push('|---|---|---|---|---|---|---|---|');
  for (const name of CONTRACT_TOKENS) {
    const use = theme.uses.get(name) ?? '';
    const on = theme.textOn.has(name) ? `\`${theme.resolveTextOn(theme.textOn.get(name))}\`` : dash;
    const sits = contract[name].sitsOn ? `\`${contract[name].sitsOn}\`` : dash;
    out.push(
      `| \`${name}\` | \`${theme.values.get(name)}\` | ${flag(use, 't')} | ${flag(use, 'l')} | ${flag(use, 'f')} | ${on} | ${sits} | ${contract[name].role} |`,
    );
  }
  out.push('');

  out.push('## Derived colours', '');
  out.push(`Computed from the token values, never hand-picked: \`tint\` = mix(\`${theme.ground}\`, family, 18 %),`);
  out.push(`\`shade\` = darken the family by 12 % (HSL lightness). The mix base is the theme's`);
  out.push('**ground**, not a surface: mixing into a tinted near-white drags every hue towards the same');
  out.push('grey and the tints stop being tellable apart. A family has a shade only when this theme lets');
  out.push('it be a line — a family too light to be a line is too light to border its own fill, so it');
  out.push('takes the neutral `line` border instead.', '');
  out.push('| family | value | tint | shade | ink on tint |');
  out.push('|---|---|---|---|---|');
  for (const family of FAMILIES) {
    const d = theme.derived.get(family);
    if (!d) continue;
    out.push(`| \`${family}\` | \`${d.base}\` | \`${d.tint}\` | ${d.shade ? `\`${d.shade}\`` : dash} | \`${theme.values.get('ink')}\` |`);
  }
  out.push('');

  out.push('## Blocks', '');
  out.push('Copy-paste blocks for this theme. Use exactly one block per figure; mixing blocks, or');
  out.push('adding a hex of your own on top, gives up the consistency the theme exists for.');
  out.push('Every value is literal — no alias layer, here or in any other theme.');
  out.push('');
  for (const block of BLOCKS(t)) {
    out.push(`### ${block.engine} · ${block.variant}`, '');
    out.push(`_${block.title}._ ${block.note}`, '');
    out.push('```' + block.lang);
    out.push(...block.lines);
    out.push('```', '');
  }

  out.push('## Verification', '');
  out.push('Every block above is rendered by the theme gate, which requires the declared values to land');
  out.push('and the engine defaults to be gone. The contrast gate recomputes every ratio in the token');
  out.push('table against this theme\'s ground. Both run per theme; see');
  out.push('[`../palette.md`](../palette.md) for the contract, and for the per-engine mechanism');
  out.push(`${ENGINE_REFS}.`);
  return out.join('\n') + '\n';
}

// ------------------------------------------------------------------ write
const resolved = data.themes.map(resolve);
if (problems.length) {
  console.error(problems.map((p) => `✗ ${p}`).join('\n'));
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const wanted = new Map();
for (const theme of resolved) wanted.set(`${theme.id}.md`, renderTheme(theme));

let drift = 0;
for (const [file, body] of wanted) {
  const target = path.join(OUT_DIR, file);
  const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
  if (current === body) continue;
  drift++;
  if (CHECK) {
    console.error(`✗ ${path.relative(ROOT, target)} is out of date — run: node skills/scripts/build-themes.mjs`);
  } else {
    fs.writeFileSync(target, body);
    console.log(`${current === null ? 'created' : 'updated'}  ${path.relative(ROOT, target)}`);
  }
}

// a theme file with no theme in themes.json is an orphan the gates would keep reading
for (const f of fs.existsSync(OUT_DIR) ? fs.readdirSync(OUT_DIR) : []) {
  if (!f.endsWith('.md') || wanted.has(f)) continue;
  drift++;
  if (CHECK) console.error(`✗ ${f} has no theme in themes.json — delete it or add the theme`);
  else {
    fs.unlinkSync(path.join(OUT_DIR, f));
    console.log(`removed  ${f}`);
  }
}

const tokens = CONTRACT_TOKENS.length;
console.log(`themes: ${resolved.length} · tokens each: ${tokens} · blocks per theme: ${BLOCKS((n) => n).length} · drift: ${drift}`);
if (CHECK && drift) process.exit(1);
