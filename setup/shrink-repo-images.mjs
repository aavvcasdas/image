/**
 * setup/shrink-repo-images.mjs —— 把仓库里「体积过大的 PNG」转成 JPEG q90，并同步改写引用
 *
 * 背景：本仓库要把成品图直接入库，两批实测累计的 PNG 会撑爆仓库体积上限。
 * 小红书/公众号等平台本身会二次压缩，因此对 > --min-kb 的 PNG 统一转 JPEG（质量 90），
 * 并把 markdown / html 里出现的文件名引用同步改成 .jpg（原 PNG 由各自的运行命令重新生成）。
 *
 * 用法：
 *   node setup/shrink-repo-images.mjs --dry-run          # 只看会处理哪些文件
 *   node setup/shrink-repo-images.mjs                    # 默认扫描 runs/ 与 archive/
 *   node setup/shrink-repo-images.mjs runs archive projects --min-kb 320
 */
import sharp from 'sharp';
import { readdir, stat, unlink, rename, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const minKbIdx = argv.indexOf('--min-kb');
const MIN = (minKbIdx >= 0 ? Number(argv[minKbIdx + 1]) : 320) * 1024;
const dirs = argv.filter((a) => !a.startsWith('--') && !/^\d+$/.test(a));
const targets = (dirs.length ? dirs : ['runs', 'archive']).map((d) => path.resolve(ROOT, d));

const TEXT_EXT = new Set(['.md', '.html', '.json', '.mjs', '.js', '.txt']);

/** 收集待处理 PNG */
const candidates = [];
for (const t of targets) {
  for (const rel of await readdir(t, { recursive: true }).catch(() => [])) {
    if (!rel.toLowerCase().endsWith('.png')) continue;
    const p = path.join(t, rel);
    const st = await stat(p).catch(() => null);
    if (st?.isFile() && st.size > MIN) candidates.push({ p, size: st.size });
  }
}
console.log(`[shrink] 命中 ${candidates.length} 个大于 ${MIN / 1024}KB 的 PNG（目录：${targets.map((t) => path.relative(ROOT, t)).join(', ')}）`);
if (dryRun) {
  for (const c of candidates.sort((a, b) => b.size - a.size)) console.log(`  ${(c.size / 1024).toFixed(0).padStart(6)} KB  ${path.relative(ROOT, c.p)}`);
  process.exit(0);
}

/** 逐个转 JPEG（只有明显变小才替换） */
const renames = new Map();  // 旧文件名 → 新文件名
let before = 0, after = 0, done = 0, skipped = 0;
for (const { p, size } of candidates) {
  const out = p.replace(/\.png$/i, '.jpg');
  const tmp = `${out}.tmp`;
  await sharp(p).jpeg({ quality: 90, mozjpeg: true }).toFile(tmp);
  const nst = await stat(tmp);
  if (nst.size < size * 0.85) {
    await rename(tmp, out);
    await unlink(p);
    renames.set(path.basename(p), path.basename(out));
    before += size; after += nst.size; done++;
  } else {
    await unlink(tmp);
    before += size; after += size; skipped++;
  }
}
console.log(`[shrink] 转换 ${done} 张 / 保留 ${skipped} 张：${(before / 1048576).toFixed(1)}MB → ${(after / 1048576).toFixed(1)}MB`);

/** 同步改写文本引用 */
let touched = 0;
const walk = async (dir) => {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { await walk(p); continue; }
    if (!TEXT_EXT.has(path.extname(e.name))) continue;
    let s = await readFile(p, 'utf8');
    const o = s;
    for (const [from, to] of renames) s = s.split(from).join(to);
    if (s !== o) { await writeFile(p, s); touched++; console.log(`  引用更新: ${path.relative(ROOT, p)}`); }
  }
};
for (const t of targets) if (existsSync(t)) await walk(t);
for (const f of ['README.md', 'runs/README.md', 'projects/README.md']) {
  const p = path.join(ROOT, f);
  if (!existsSync(p)) continue;
  let s = await readFile(p, 'utf8');
  const o = s;
  for (const [from, to] of renames) s = s.split(from).join(to);
  if (s !== o) { await writeFile(p, s); touched++; console.log(`  引用更新: ${f}`); }
}
console.log(`[shrink] 文本引用更新 ${touched} 处`);
