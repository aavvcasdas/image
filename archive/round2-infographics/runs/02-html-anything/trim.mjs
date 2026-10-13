// 把 Arena 生图的白边裁掉，卡片里排得下更多画面
import sharp from 'sharp';
import fs from 'node:fs';
const files = fs.readdirSync('assets').filter(f => f.startsWith('gen-'));
for (const f of files) {
  const out = `assets/trim-${f.replace(/^gen-/, '')}`;
  const info = await sharp(`assets/${f}`).trim({ threshold: 8 }).toFile(out);
  console.log(`${f} → ${out}  ${info.width}×${info.height}`);
}
