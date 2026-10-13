/**
 * Shared theme reader — the one place that knows how to parse
 * `skills/documd-visuals/styles/themes/<id>.md`.
 *
 * Parsing is **anchored**: only the metadata table, the `## Tokens` section and the derived table are
 * read, and the token table must match its header and column count. An earlier revision scanned for
 * “any row that looks like `name | #hex`”, which the appendix tables also match — that silently
 * overwrote the tokens and cut a gate from 330 checks to 126 without ever failing. Both guards stay.
 */
import fs from 'node:fs';
import path from 'node:path';

const yes = (cell) => /✓/.test(cell ?? '');
const clean = (cell) => String(cell ?? '').replace(/`/g, '').trim();
const hexOf = (cell) => (String(cell ?? '').match(/#[0-9a-fA-F]{6}/) ?? [])[0]?.toLowerCase();

/** Every theme file in a directory, sorted so reports are stable. */
export function listThemes(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => path.join(dir, f));
}

/**
 * @param {string} file path to a theme file
 * @returns {{id, title, scenario, ground, summary, tokens, derived, values}}
 *          `values` is every legal colour of that theme: token values plus derived tints/shades.
 */
export function readTheme(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const tokens = new Map();
  const derived = new Map();
  const id = path.basename(file, '.md');

  const titleLine = lines.find((l) => /^#\s+/.test(l));
  const title = titleLine ? titleLine.replace(/^#\s+/, '').replace(/\s+theme$/, '').trim() : id;

  // ---- metadata --------------------------------------------------------------
  const meta = (key) => {
    const row = lines.find((l) => new RegExp(`^\\|\\s*${key}\\s*\\|`).test(l));
    return row ? clean(row.split('|')[2]) : '';
  };
  const ground = hexOf(meta('ground'));
  if (!ground) throw new Error(`${file}: no \`ground\` row (expected \`| ground | #rrggbb |\`)`);
  const summary = (lines.find((l) => l.trim() && !l.startsWith('#') && !l.startsWith('|')) ?? '').trim();

  // ---- token table -----------------------------------------------------------
  const tokenStart = lines.findIndex((l) => /^##\s+Tokens\s*$/.test(l));
  if (tokenStart < 0) throw new Error(`${file}: no \`## Tokens\` section found`);
  let headerSeen = false;
  for (let i = tokenStart + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) break;
    if (/^\|\s*token\s*\|/.test(lines[i])) { headerSeen = true; continue; }
    if (!headerSeen) continue;
    const m = lines[i].match(/^\|\s*`([^`]+)`\s*\|\s*`(#[0-9a-fA-F]{6})`\s*\|(.*)\|\s*$/);
    if (!m) continue;
    const cells = m[3].split('|').map((c) => c.trim());
    if (cells.length !== 6) throw new Error(`${file}: token \`${m[1]}\` has ${cells.length} columns, expected 6`);
    tokens.set(m[1], {
      token: m[1],
      value: m[2].toLowerCase(),
      text: yes(cells[0]),
      line: yes(cells[1]),
      fill: yes(cells[2]),
      textOnIt: clean(cells[3]),
      sitsOn: clean(cells[4]),
      role: clean(cells[5]),
    });
  }
  if (tokens.size < 20) throw new Error(`${file}: only ${tokens.size} tokens parsed — table shape changed?`);

  // ---- derived table ---------------------------------------------------------
  // Located by its header row, not by heading text, so the prose about the formulas is not read.
  const derivedStart = lines.findIndex((l) => /^\|\s*family\s*\|/.test(l));
  if (derivedStart < 0) throw new Error(`${file}: no derived table found (header \`| family |\`)`);
  for (let i = derivedStart + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i]) || !lines[i].startsWith('|')) break;
    const cells = lines[i].split('|').map(clean);
    // Whole-line split keeps the empty cell before the first `|`, so the columns are shifted by one:
    // [ '', family, value, tint, shade, ink-on-tint, '' ]
    if (cells.length < 7) continue;
    const family = cells[1];
    if (!tokens.has(family)) continue;
    derived.set(family, { family, tint: hexOf(cells[3]), shade: hexOf(cells[4]) });
  }
  if (derived.size < 5) throw new Error(`${file}: only ${derived.size} derived families parsed`);

  const values = [...new Set([
    ...[...tokens.values()].map((t) => t.value),
    ...[...derived.values()].flatMap((d) => [d.tint, d.shade].filter(Boolean)),
  ])];

  return { id, file, title, scenario: meta('scenario'), ground, summary, tokens, derived, values };
}

/** Read every theme in the shipped directory. */
export function readAllThemes(dir) {
  return listThemes(dir).map(readTheme);
}
