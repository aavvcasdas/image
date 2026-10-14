/**
 * setup/optimize-images.mjs — 把 runs/ 下的大图转成 JPEG(q90)，控制仓库体积
 *
 * 工具原生产出是 PNG（无损）；「小红书」等平台本身会二次压缩，
 * 为控制仓库体积，这里把大于 320KB 的成品图统一转 JPEG（质量 90），
 * 小于阈值的保留原格式。原图随时可用 README 里的命令重新生成。
 *
 * 用法：node setup/optimize-images.mjs [目录 ...]
 */
import sharp from 'sharp';
import { readdir, stat, unlink, rename } from 'node:fs/promises';
import path from 'node:path';

const MIN = 320 * 1024;
const dirs = process.argv.slice(2);
if (!dirs.length) { console.error('用法: node setup/optimize-images.mjs <目录...>'); process.exit(1); }

let before = 0, after = 0, converted = 0, kept = 0;
for (const d of dirs) {
  const files = (await readdir(d, { recursive: true })).filter((f) => /\.(png|jpe?g)$/i.test(f));
  for (const f of files) {
    const p = path.join(d, f);
    const st = await stat(p);
    if (!st.isFile()) continue;
    before += st.size;
    if (st.size < MIN) { kept++; after += st.size; continue; }

    const out = p.replace(/\.(png|jpe?g)$/i, '.jpg');
    const tmp = `${out}.tmp`;
    await sharp(p).jpeg({ quality: 90, mozjpeg: true }).toFile(tmp);
    const nst = await stat(tmp);
    if (nst.size < st.size * 0.85) {
      await rename(tmp, out);
      if (out !== p) await unlink(p);
      after += nst.size; converted++;
    } else {
      await unlink(tmp); after += st.size; kept++;
    }
  }
}
console.log(`转换 ${converted} 张 / 保留 ${kept} 张：${(before / 1048576).toFixed(1)}MB → ${(after / 1048576).toFixed(1)}MB`);
