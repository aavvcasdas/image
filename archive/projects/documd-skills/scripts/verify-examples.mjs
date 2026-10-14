#!/usr/bin/env node
/**
 * verify-examples.mjs — 示例渲染冒烟 + 规则门禁
 *
 * 用法（在 skills 仓库任意位置）：
 *   node scripts/verify-examples.mjs                     # 扫描 documd-visuals/examples/
 *   node scripts/verify-examples.mjs --dir examples/_draft # 只扫指定目录
 *   node scripts/verify-examples.mjs --all                # 每个文件里的所有代码块都验（默认只验第一个）
 *   node scripts/verify-examples.mjs --lint-only          # 只跑静态规则，不渲染
 *   node scripts/verify-examples.mjs --json               # 机器可读输出
 *
 * 依赖：documd CLI（默认取环境变量 DOCUMD_BIN，其次 ../markdown-viewer-extension/dist/cli/documd.js）
 *
 * 三条例行门禁：
 *   ① 渲染冒烟：每个示例的代码块必须能被 CLI 渲染成非空 SVG（且不是空图）
 *   ② 语言白名单：示例里不得出现白名单以外的代码块语言（围栏语言必须可渲染或有明确定义）
 *   ③ 空行规则：裸 HTML 块内不得有空行（CommonMark HTML block 会被空行截断）
 *
 * 可选（--plantuml）：用官方 plantuml CLI 做第二意见校验。
 *   注意：draw-uml 的 `mxgraph.*` 图标族是**扩展语法**，官方 PlantUML 一定报错，因此默认不跑；
 *   即使显式开启，含 `mxgraph.` 的块也会被跳过（只标注为 extension）。
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

// ── 配置 ────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(import.meta.dirname, '..');
const DEFAULT_DIRS = ['documd-visuals/examples'];

const FENCE_TO_EXT = {
  plantuml: '.puml',
  puml: '.puml',
  vega: '.vega',
  'vega-lite': '.vl',
  vegalite: '.vl',
  echarts: '.echarts',
  infographic: '.infographic',
};

/** Fences that carry no diagram and are therefore legal but not rendered by this smoke test. */
const NON_DIAGRAM_FENCES = ['text', 'json', 'md', 'markdown', 'bash', 'sh', 'js', 'ts', 'css'];
const HTML_FENCE = 'html';
const MIN_OUTPUT_BYTES = 1000; // 低于此值视为“解析成功但未渲染”

/** 官方 PlantUML CLI（可选）：用于第二意见校验 */
function findPlantumlCli() {
  const explicit = value('--plantuml');
  if (explicit && explicit !== 'true' && fs.existsSync(explicit)) return explicit;
  const candidates = ['/opt/homebrew/bin/plantuml', '/usr/local/bin/plantuml', '/usr/bin/plantuml'];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  try {
    return execFileSync('which', ['plantuml'], { stdio: 'pipe' }).toString().trim() || null;
  } catch { return null; }
}

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const ALL = flag('--all');
const LINT_ONLY = flag('--lint-only');
const JSON_OUT = flag('--json');
const dirArgs = args.reduce((acc, a, i) => (a === '--dir' && args[i + 1] ? [...acc, args[i + 1]] : acc), []);
const DIRS = dirArgs.length ? dirArgs : DEFAULT_DIRS;
// 官方 PlantUML 校验：默认关闭（mxgraph 扩展语法会被它误判）；--plantuml 显式开启
const PLANTUML_CLI = flag('--plantuml') ? findPlantumlCli() : null;
const MXGRAPH_RE = /^\s*mxgraph\.[a-z0-9_]+/im;

const CLI = value('--cli')
  || process.env.DOCUMD_BIN
  || path.resolve(ROOT, '../dist/cli/documd.js');
if (!fs.existsSync(CLI)) {
  console.error(`找不到 documd CLI：${CLI}\n用 --cli <path> 或 DOCUMD_BIN 环境变量指定（例如 markdown-viewer-extension/dist/cli/documd.js）。`);
  process.exit(2);
}

// ── 工具 ────────────────────────────────────────────────────────────────────
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

/** 抽取 fenced code blocks：{lang, body, line} */
function extractBlocks(text) {
  const blocks = [];
  const lines = text.split('\n');
  let current = null;
  lines.forEach((line, i) => {
    const m = /^(`{3,})(\S+)?\s*$/.exec(line);
    if (m && !current) {
      current = { fence: m[1], lang: (m[2] || '').toLowerCase(), body: [], line: i + 2 };
      return;
    }
    if (m && current && line.startsWith(current.fence) && !m[2]) {
      blocks.push({ lang: current.lang, body: current.body.join('\n'), line: current.line });
      current = null;
      return;
    }
    if (current) current.body.push(line);
  });
  return blocks;
}

/** 规则 ③：裸 HTML 块内出现空行（跳过 fenced code 区域，那里的空行是合法的） */
function checkHtmlBlankLines(text) {
  const problems = [];
  const lines = text.split('\n');
  let fence = null;
  let inHtml = false;
  let startLine = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const fenceMatch = /^(`{3,})/.exec(trimmed);
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1];
      else if (trimmed.startsWith(fence)) fence = null;
      continue;
    }
    if (fence) continue; // 代码块内部不检查
    if (!inHtml && /^<(div|section|article|figure|style|table)\b/i.test(trimmed)) {
      inHtml = true;
      startLine = i + 1;
      continue;
    }
    if (!inHtml) continue;
    if (trimmed === '') {
      problems.push({ line: i + 1, after: startLine });
    } else if (/^<\/(div|section|article|figure|style|table)>$/i.test(trimmed)) {
      inHtml = false;
    }
  }
  return problems;
}

/** 官方 PlantUML 语法校验（只对 plantuml 块）；返回 null 表示通过 */
function plantumlCheck(block, tmpDir) {
  const src = path.join(tmpDir, `pu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.puml`);
  fs.writeFileSync(src, block.body + '\n', 'utf8');
  try {
    execFileSync(PLANTUML_CLI, ['-checkonly', '-tsvg', src], { stdio: 'pipe', timeout: 120000 });
  } catch (err) {
    const raw = `${err.stdout || ''}${err.stderr || ''}`.trim();
    fs.unlinkSync(src);
    return raw.split('\n').filter((l) => l.trim()).slice(0, 2).join(' ') || 'plantuml -checkonly failed';
  }
  fs.unlinkSync(src);
  return null;
}

function renderProbe(block, tmpDir) {
  const ext = FENCE_TO_EXT[block.lang];
  const base = `probe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const src = path.join(tmpDir, base + ext);
  const out = path.join(tmpDir, base + '.svg');
  fs.writeFileSync(src, block.body + '\n', 'utf8');
  try {
    execFileSync(process.execPath, [CLI, src, out], { stdio: 'pipe', timeout: 120000 });
  } catch (err) {
    const raw = (err.stderr?.toString() || err.stdout?.toString() || err.message).trim();
    const lines = raw.split('\n').filter((l) => l.trim() && !/^Node\.js v\d/.test(l.trim()) && !/^\s*at /.test(l));
    const msg = lines.slice(-2).join(' ') || 'CLI failed';
    return { ok: false, error: msg };
  }
  if (!fs.existsSync(out) || fs.statSync(out).size === 0) {
    return { ok: false, error: 'empty output' };
  }
  const bytes = fs.statSync(out).size;
  fs.unlinkSync(src);
  fs.unlinkSync(out);
  // 疑似空图：绘制类引擎的最小真实输出也在 1.3 KB 以上，远小于该值说明“解析成功但没画东西”
  if (bytes < MIN_OUTPUT_BYTES) {
    return { ok: false, bytes, error: `输出疑似空图（${bytes} 字节）——通常意味着该语法“能解析但不渲染”` };
  }
  return { ok: true, bytes };
}

/**
 * 裸 HTML 示例的渲染探针。
 *
 * A card or an architecture diagram is bare HTML, so `extractBlocks` finds no fence and the file used to
 * be reported `lint-only` — meaning **no gate rendered it at all**. Measured before this probe existed:
 * 26 bare-HTML files, seven of them architecture figures whose connectors are hand-computed SVG
 * coordinates, had been checked only by eye.
 *
 * It cannot judge the layout: a figure whose arrows point at the wrong box still renders. What it catches
 * is everything below that — HTML that breaks the renderer, a `<style>` that never applies, a figure that
 * rasterises to nothing.
 */
function renderDocumentProbe(file, tmpDir) {
  const base = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const src = path.join(tmpDir, base + '.md');
  const out = path.join(tmpDir, base + '.html');
  fs.copyFileSync(file, src);
  try {
    execFileSync(process.execPath, [CLI, src, out, '--format', 'html'], { stdio: 'pipe', timeout: 120000 });
  } catch (err) {
    const raw = (err.stderr?.toString() || err.stdout?.toString() || err.message).trim();
    const lines = raw.split('\n').filter((l) => l.trim() && !/^Node\.js v\d/.test(l.trim()) && !/^\s*at /.test(l));
    return { ok: false, error: lines.slice(-2).join(' ') || 'CLI failed' };
  }
  if (!fs.existsSync(out)) return { ok: false, error: 'no output file' };
  const html = fs.readFileSync(out, 'utf8');
  // The pipeline rasterises bare HTML into one <img> carrying a data URL, so that payload is the only
  // signal available that anything was drawn — a blank figure compresses to almost nothing.
  const payloads = [...html.matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)].map((m) => m[1].length);
  fs.unlinkSync(src);
  fs.unlinkSync(out);
  if (!payloads.length) return { ok: false, error: '渲染完成但没有产生图像——裸 HTML 未进入渲染' };
  const bytes = Math.max(...payloads);
  if (bytes < MIN_OUTPUT_BYTES) return { ok: false, bytes, error: `图像疑似空白（base64 ${bytes} 字节）` };
  return { ok: true, bytes };
}

// ── 主流程 ──────────────────────────────────────────────────────────────────
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-examples-'));
const results = [];
const lintIssues = [];

for (const dir of DIRS) {
  const abs = path.isAbsolute(dir) ? dir : path.join(ROOT, dir);
  for (const file of walk(abs)) {
    const rel = path.relative(ROOT, file);
    const text = fs.readFileSync(file, 'utf8');
    const blocks = extractBlocks(text);
    const entry = { file: rel, blocks: [], lint: [] };

    // 规则 ③：空行（error）
    for (const problem of checkHtmlBlankLines(text)) {
      entry.lint.push({ level: 'error', msg: `裸 HTML 块内第 ${problem.line} 行出现空行（块起始于第 ${problem.after} 行）` });
    }

    // 规则 ②：语言白名单（error）；```html（warn）—— 不在白名单里的一律拒绝，
    // 所以不需要单独维护“禁用引擎”名单。
    for (const b of blocks) {
      if (FENCE_TO_EXT[b.lang] || NON_DIAGRAM_FENCES.includes(b.lang)) continue;
      entry.lint.push({ level: 'error', msg: `出现不在白名单内的代码块语言：${b.lang}` });
    }
    if (blocks.some((b) => b.lang === HTML_FENCE)) {
      entry.lint.push({ level: 'warn', msg: '出现 ```html 代码块（卡片/版面应裸 HTML 嵌入；若为“反面例子”可忽略）' });
    }

    // 规则 ①：渲染
    const renderable = blocks.filter((b) => FENCE_TO_EXT[b.lang]);
    const targets = ALL ? renderable : renderable.slice(0, 1);
    if (!LINT_ONLY) {
      for (const block of targets) {
        const r = renderProbe(block, tmpDir);
        const isMxgraph = MXGRAPH_RE.test(block.body);
        r.engineExtension = isMxgraph;
        if (r.ok && PLANTUML_CLI && (block.lang === 'plantuml' || block.lang === 'puml')) {
          if (isMxgraph) {
            r.upstream = 'skipped (mxgraph extension — upstream PlantUML cannot parse it)';
          } else {
            const puError = plantumlCheck(block, tmpDir);
            if (puError) {
              r.ok = false;
              r.error = `官方 PlantUML 校验失败：${puError}`;
            } else {
              r.upstream = 'ok';
            }
          }
        }
        entry.blocks.push({ lang: block.lang, line: block.line, ...r });
      }
      if (renderable.length === 0) {
        // No fence to render, so render the document itself — but only when it really carries bare HTML.
        if (/^<(div|section|article|figure|table)\b/im.test(text)) {
          entry.blocks.push({ lang: 'bare-html', line: 0, ...renderDocumentProbe(file, tmpDir) });
        } else if (entry.lint.length === 0) {
          entry.blocks.push({ lang: null, line: 0, ok: true, bytes: 0, note: '无可渲染代码块（仅 lint）' });
        }
      }
    }

    results.push(entry);
    lintIssues.push(...entry.lint.map((l) => ({ file: rel, ...l })));
  }
}

fs.rmSync(tmpDir, { recursive: true, force: true });

// ── 报告 ────────────────────────────────────────────────────────────────────
const rendered = results.flatMap((r) => r.blocks);
const failed = rendered.filter((b) => b.ok === false);
const passed = rendered.filter((b) => b.ok === true && b.bytes);
const skipped = results.filter((r) => r.blocks.length === 0 && r.lint.length === 0);
const errors = lintIssues.filter((l) => l.level === 'error');
const warnings = lintIssues.filter((l) => l.level === 'warn');
if (flag('--strict')) errors.push(...warnings.splice(0));

if (JSON_OUT) {
  console.log(JSON.stringify({ results, lintIssues, summary: { files: results.length, rendered: rendered.length, passed: passed.length, failed: failed.length } }, null, 2));
} else {
  console.log(`verify-examples — ${results.length} 个文件，${rendered.length} 个代码块（CLI: ${path.relative(process.cwd(), CLI)}）\n`);
  for (const r of results) {
    const badge = r.blocks.every((b) => b.ok !== false) && !r.lint.some((l) => l.level === 'error') ? '✓' : '✗';
    const detail = r.blocks
      .map((b) => (b.lang
        ? `${b.lang}${b.ok ? ` ${b.bytes}B` : ' FAIL'}${b.engineExtension ? ' [mxgraph-ext]' : ''}${b.upstream && !b.upstream.startsWith('ok') && !b.upstream.startsWith('skipped') ? ' [upstream-fail]' : ''}`
        : 'lint-only'))
      .join(', ');
    console.log(`  ${badge} ${r.file}${detail ? `  [${detail}]` : ''}`);
    for (const b of r.blocks) if (b.ok === false) console.log(`      ↳ 渲染失败：${b.error}`);
    for (const l of r.lint) console.log(`      ↳ ${l.level === 'error' ? '✗' : '⚠'} ${l.msg}`);
  }
  const extCount = rendered.filter((b) => b.engineExtension).length;
  const checked = rendered.filter((b) => b.upstream === 'ok').length;
  if (skipped.length) console.log(`\n  （${skipped.length} 个文件既无可渲染代码块也无问题）`);
  console.log(`\n汇总：渲染 ${passed.length} 通过 / ${failed.length} 失败 · 错误 ${errors.length} 处 · 提示 ${warnings.length} 处`);
  console.log(`      其中 mxgraph 扩展语法 ${extCount} 块（官方 PlantUML 不可校验）${PLANTUML_CLI ? ` · 官方 PlantUML 校验通过 ${checked} 块` : ' · 官方校验未开启（--plantuml）'}`);
}

process.exit(failed.length || errors.length ? 1 : 0);
