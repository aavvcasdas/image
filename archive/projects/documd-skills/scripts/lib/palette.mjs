/**
 * Shared palette reader — the one place that knows how to parse
 * `skills/documd-visuals/styles/palette.md`.
 *
 * Parsing is **anchored**: only the `## Tokens` and `## Derived colours (generated)` sections are
 * read, and the token table must match its header and column count. An earlier revision scanned for
 * “any row that looks like `name | #hex`”, which the appendix tables also match — that silently
 * overwrote the tokens and cut a gate from 330 checks to 126 without ever failing. Both guards stay.
 */
import fs from 'node:fs';

const yes = (cell) => /✓/.test(cell ?? '');
const clean = (cell) => String(cell ?? '').replace(/`/g, '').trim();
const hexOf = (cell) => (String(cell ?? '').match(/#[0-9a-fA-F]{6}/) ?? [])[0]?.toLowerCase();

/**
 * @param {string} file path to palette.md
 * @returns {{tokens: Map<string, object>, derived: Map<string, object>, values: string[]}}
 *          `values` is every legal colour of the palette: token values plus derived tints/shades.
 */
export function readPalette(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const tokens = new Map();
  const derived = new Map();

  // ---- token table -----------------------------------------------------------
  const tokenStart = lines.findIndex((l) => /^##\s+Tokens\s*$/.test(l));
  if (tokenStart < 0) throw new Error('palette.md: no `## Tokens` section found');
  let headerSeen = false;
  for (let i = tokenStart + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) break;
    if (/^\|\s*token\s*\|/.test(lines[i])) { headerSeen = true; continue; }
    if (!headerSeen) continue;
    const m = lines[i].match(/^\|\s*`([^`]+)`\s*\|\s*`(#[0-9a-fA-F]{6})`\s*\|(.*)\|\s*$/);
    if (!m) continue;
    const cells = m[3].split('|').map((c) => c.trim());
    if (cells.length !== 6) throw new Error(`palette.md: token \`${m[1]}\` has ${cells.length} columns, expected 6`);
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
  if (tokens.size < 20) throw new Error(`palette.md: only ${tokens.size} tokens parsed — table shape changed?`);

  // ---- derived table ---------------------------------------------------------
  // Located by its header row, not by heading text: the doc has both a formula table
  // (`## Derived colours`) and the generated values table (`## Derived colours (generated)`),
  // and only the second one carries colours.
  const derivedStart = lines.findIndex((l) => /^\|\s*family\s*\|/.test(l));
  if (derivedStart < 0) throw new Error('palette.md: no generated derived table found (header `| family |`)');
  for (let i = derivedStart + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i]) || !lines[i].startsWith('|')) break;
    const cells = lines[i].split('|').map(clean);
    // Whole-line split keeps the empty cell before the first `|`, so the columns are shifted by one:
    // [ '', family, value, tint, shade, ink-on-tint, '' ]
    if (cells.length < 7) continue;
    const family = cells[1];
    if (!tokens.has(family)) continue;
    const tint = hexOf(cells[3]);
    const shade = hexOf(cells[4]);
    derived.set(family, { family, tint, shade });
  }
  if (derived.size < 5) throw new Error(`palette.md: only ${derived.size} derived families parsed`);

  const values = [...new Set([
    ...[...tokens.values()].map((t) => t.value),
    ...[...derived.values()].flatMap((d) => [d.tint, d.shade].filter(Boolean)),
  ])];
  return { tokens, derived, values };
}
