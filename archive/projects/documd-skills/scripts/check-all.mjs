#!/usr/bin/env node
/**
 * One command for every theme gate (plus the skills structure gate).
 *
 *   node skills/scripts/check-all.mjs
 *   node skills/scripts/check-all.mjs --with-examples   # also render the whole corpus (~10 min)
 *   node skills/scripts/check-all.mjs --quiet
 *
 * Each gate is a separate script on purpose — they measure different things and can be run alone —
 * but a change to a theme or an example usually needs all of them, and the failure mode this
 * rollout kept hitting was *forgetting one*. The exit code is the number of failing gates, so a CI
 * step can read it directly.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const QUIET = process.argv.includes('--quiet');
const WITH_EXAMPLES = process.argv.includes('--with-examples');

const GATES = [
  ['themes (generated files match the source tables)', 'build-themes.mjs', ['--check']],
  ['contrast (every declared use, per theme)', 'check-palette-contrast.mjs', []],
  ['blocks (render every theme × engine block)', 'verify-blocks.mjs', []],
  ['block coverage (every example block)', 'apply-block.mjs', ['--all', '--check']],
  ['theme usage (no off-theme or mixed literals)', 'check-palette-usage.mjs', ['--strict']],
  ['skills structure', 'validate-skills.mjs', []],
];
if (WITH_EXAMPLES) GATES.push(['examples render (every fence + every bare-HTML figure)', 'verify-examples.mjs', ['--all']]);

const pad = (s, n) => String(s).padEnd(n);
let failed = 0;
const rows = [];
for (const [label, script, args] of GATES) {
  const started = Date.now();
  let code = 0;
  let out = '';
  try {
    out = execFileSync('node', [path.join(import.meta.dirname, script), ...args], { stdio: 'pipe' }).toString();
  } catch (err) {
    code = err.status ?? 1;
    out = `${err.stdout ?? ''}${err.stderr ?? ''}`;
  }
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  rows.push({ label, code, secs, out });
  if (code) failed++;
}

if (!QUIET) {
  console.log(`${pad('GATE', 46)} ${pad('RESULT', 8)} TIME`);
  console.log('-'.repeat(64));
  for (const r of rows) console.log(`${pad(r.label, 46)} ${pad(r.code ? `FAIL(${r.code})` : 'ok', 8)} ${r.secs}s`);
  console.log('-'.repeat(64));
}
for (const r of rows.filter((x) => x.code)) {
  console.log(`\n=== ${r.label} ===`);
  console.log(r.out.split('\n').filter((l) => l.trim()).slice(-12).join('\n'));
}
console.log(`\ngates: ${rows.length} · failing: ${failed}`);
process.exit(failed);
