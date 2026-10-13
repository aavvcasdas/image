#!/usr/bin/env node
/**
 * Theme contrast gate — the machine check behind `documd-visuals/styles/palette.md`.
 *
 *   node skills/scripts/check-palette-contrast.mjs [--json] [--all]
 *
 * For **every theme** in `styles/themes/`:
 *
 *   1. Reads the token table (token · value · text/line/fill flags · text-on-it · sits-on) and the
 *      derived table out of the theme file.
 *   2. Measures each declared use against that theme's own **ground** and against every fill the
 *      token is declared to sit on:
 *        text  ≥ 4.5   against the ground, and against every fill it may sit on
 *        line  ≥ 3.0   against the ground
 *        text on a fill ≥ 4.5  for the colour the theme declares may sit on that fill
 *   3. Recomputes every derived tint/shade from the documented formula and fails when the shipped
 *      table disagrees — a hand-edited derived value is a bug, not a tweak.
 *
 * A theme is graded against its own ground, never against the host document's background: figures
 * carry their own backgrounds by design (palette.md). The ground is the background the theme was
 * designed to sit on.
 *
 * Parsing is anchored to the `## Tokens` section on purpose. An earlier revision scanned for
 * “any row that looks like `name | #hex`”, which the generated *derived* table further down also
 * matches — it silently overwrote the tokens and dropped the check count from 330 to 126 without
 * ever failing. Section + header + column count are therefore all verified, and a shape change
 * throws instead of quietly shrinking the gate.
 */
import path from 'node:path';

import { readAllThemes } from './lib/themes.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..'); // repo root
const THEME_DIR = path.join(ROOT, 'skills/documd-visuals/styles/themes');
const JSON_OUT = process.argv.includes('--json');
const JSON_ALL = process.argv.includes('--all');
const TEXT_MIN = 4.5;
const LINE_MIN = 3.0;
/**
 * A ground must be a light page. Relative luminance 0.7 is roughly L* 86 — every paper, cream and
 * pale grey a document is printed on clears it, and anything that reads as a dark page does not.
 */
const GROUND_MIN_LUMINANCE = 0.7;

// ------------------------------------------------------------------ colour maths
const toRgb = (hex) => {
  const h = hex.trim().replace(/^#/, '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};
const toHex = (rgb) =>
  `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const lin = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
/** WCAG relative luminance. */
const luminance = (hex) => {
  const [r, g, b] = toRgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
/** WCAG contrast ratio, 1 – 21. */
const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const mix = (a, b, t) => toHex(toRgb(a).map((v, i) => v + (toRgb(b)[i] - v) * t));

/** HSL-lightness scale, keeping hue and saturation. `amount` is a signed fraction. */
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

const WHITE_MIX = 0.18; // tint = mix(ground, family, 18 %)
const SHADE_STEP = 0.12; // shade = family scaled 12 % away from the ground

// ------------------------------------------------------------------ checks per theme
const themes = readAllThemes(THEME_DIR);
const report = [];

for (const theme of themes) {
  const { tokens, ground } = theme;
  const checks = [];
  const violations = [];
  const record = (what, r, min, detail) => {
    const ok = r + 1e-9 >= min;
    checks.push({ theme: theme.id, what, ratio: Number(r.toFixed(2)), min, ok, detail });
    if (!ok) violations.push(`${what} = ${r.toFixed(2)} < ${min} ${detail}`);
  };

  // The theme set is light-ground **by decision** (2026-09-22): documd-visuals ships figures for
  // documents, print and projection, and a figure carries its own background, so a dark theme is
  // out of scope rather than a missing feature. Asserted as a measurement of the ground instead of
  // a `polarity` field, so it cannot be satisfied by relabelling the theme.
  record('ground is a light page', luminance(ground), GROUND_MIN_LUMINANCE, `(${ground})`);

  const shadeOf = (value) => scaleLightness(value, -SHADE_STEP);
  const surfaceNames = [...tokens.values()].filter((t) => t.fill && t.token.startsWith('surface-')).map((t) => t.token);

  // derived values, recomputed — the shipped table is compared against these below
  const tints = new Map();
  const shades = new Map();
  for (const t of tokens.values()) {
    if (!t.fill || t.token.startsWith('surface-')) continue;
    tints.set(`tint-${t.token}`, mix(ground, t.value, WHITE_MIX));
    shades.set(`shade-${t.token}`, t.line ? shadeOf(t.value) : null);
  }

  // (1) text against the ground
  for (const t of tokens.values()) {
    if (t.text) record(`text ${t.token} on ground`, ratio(t.value, ground), TEXT_MIN, `(${ground})`);
  }
  // (2) text against the fills it is declared to sit on
  for (const t of tokens.values()) {
    if (!t.text) continue;
    if (/surface-\*/.test(t.sitsOn)) {
      for (const name of surfaceNames) {
        record(`text ${t.token} on ${name}`, ratio(t.value, tokens.get(name).value), TEXT_MIN, '(declared fill)');
      }
    }
    if (/tint-\*/.test(t.sitsOn)) {
      for (const [name, hex] of tints) record(`text ${t.token} on ${name}`, ratio(t.value, hex), TEXT_MIN, '(declared fill)');
    }
  }
  // (3) line against the ground
  for (const t of tokens.values()) {
    if (t.line) record(`line ${t.token} on ground`, ratio(t.value, ground), LINE_MIN, `(${ground})`);
  }
  // (4) the declared text colour on every fill, and ink on every derived tint
  for (const t of tokens.values()) {
    if (!t.fill || !t.textOnIt || t.textOnIt === '–') continue;
    const onTop = t.textOnIt.startsWith('#') ? t.textOnIt : tokens.get(t.textOnIt)?.value;
    if (!onTop) {
      throw new Error(`${theme.id}: \`${t.token}\` declares text on it = \`${t.textOnIt}\`, which is neither a colour nor a token`);
    }
    record(`text-on-fill ${t.token}`, ratio(onTop, t.value), TEXT_MIN, `(${t.textOnIt} on ${t.value})`);
  }
  const ink = tokens.get('ink').value;
  for (const [name, hex] of tints) record(`ink on ${name}`, ratio(ink, hex), TEXT_MIN, '(derived tint)');
  // (5) a family's shade as the border of its own tint
  for (const [name, hex] of tints) {
    const shade = shades.get(name.replace(/^tint-/, 'shade-'));
    if (shade) record(`${name.replace(/^tint-/, 'shade-')} on ${name}`, ratio(shade, hex), LINE_MIN, '(own-fill border)');
  }

  // (6) the shipped derived table must equal the recomputed values
  for (const [family, d] of theme.derived) {
    const wantTint = tints.get(`tint-${family}`);
    const wantShade = shades.get(`shade-${family}`) ?? null;
    if (d.tint !== wantTint) {
      violations.push(`${family}: shipped tint ${d.tint} ≠ recomputed ${wantTint} — the table is generated, do not hand-edit it`);
    }
    if ((d.shade ?? null) !== wantShade) {
      violations.push(`${family}: shipped shade ${d.shade ?? '–'} ≠ recomputed ${wantShade ?? '–'}`);
    }
  }

  // (7) ramp separation — reported, not graded: the smallest luminance step between **any** two ramp
  // entries. Comparing token-order neighbours only (the first implementation) missed collisions
  // between entries that sit far apart in the ramp: one theme had `cat-1` and `cat-8` 0.003 apart
  // while every adjacent pair looked comfortable. The point of the number is greyscale
  // distinguishability, so it has to be over all pairs.
  const ramp = Array.from({ length: 8 }, (_, i) => ({ i: i + 1, value: tokens.get(`cat-${i + 1}`)?.value }))
    .filter((e) => e.value)
    .map((e) => ({ ...e, lum: luminance(e.value) }))
    .sort((a, b) => a.lum - b.lum);
  let rampGap = Infinity;
  let rampPair = '';
  for (let i = 1; i < ramp.length; i++) {
    const gap = ramp[i].lum - ramp[i - 1].lum;
    if (gap < rampGap) {
      rampGap = gap;
      rampPair = `cat-${ramp[i - 1].i}/cat-${ramp[i].i}`;
    }
  }
  report.push({ theme, checks, violations, rampGap: Number.isFinite(rampGap) ? rampGap : 0, rampPair });
}

const allChecks = report.flatMap((r) => r.checks);
const failures = allChecks.filter((c) => !c.ok);
const drift = report.flatMap((r) => r.violations.map((v) => `${r.theme.id}: ${v}`));

if (JSON_OUT) {
  console.log(JSON.stringify({
    themes: report.map((r) => ({
      id: r.theme.id,
      ground: r.theme.ground,
      tokens: r.theme.tokens.size,
      checks: r.checks.length,
      failures: r.checks.filter((c) => !c.ok).length,
      rampGap: Number(r.rampGap.toFixed(3)),
      rampPair: r.rampPair,
      violations: r.violations,
      ...(JSON_ALL ? { all: r.checks } : {}),
    })),
    checks: allChecks.length,
    failures,
    violations: drift,
  }, null, 2));
  process.exit(failures.length || drift.length ? 1 : 0);
}

const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad('THEME', 11)} ${pad('GROUND', 9)} ${pad('TOKENS', 7)} ${pad('CHECKS', 7)} ${pad('FAIL', 5)} ${pad('RAMP GAP', 9)} CLOSEST PAIR`);
console.log('-'.repeat(74));
for (const r of report) {
  const f = r.checks.filter((c) => !c.ok).length;
  console.log(
    `${pad(r.theme.id, 11)} ${pad(r.theme.ground, 9)} ${pad(r.theme.tokens.size, 7)} ${pad(r.checks.length, 7)} ${pad(f, 5)} ${pad(r.rampGap.toFixed(3), 9)} ${r.rampPair}`,
  );
}
console.log('-'.repeat(74));
console.log(`checks: ${allChecks.length} · failures: ${failures.length} · themes: ${report.length}`);
console.log('ramp gap = smallest luminance step between any two ramp entries (reported, not graded)');

if (failures.length || drift.length) {
  console.log('\nviolations:');
  for (const v of [
    ...failures.map((f) => `${f.theme}: ${f.what} = ${f.ratio} < ${f.min} ${f.detail}`),
    ...drift,
  ]) {
    console.log(`  ✗ ${v}`);
  }
  console.log('\nfix the value in skills/scripts/themes.json, then: node skills/scripts/build-themes.mjs');
  process.exit(1);
}
