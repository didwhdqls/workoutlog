// public/icon.svg 와 같은 모양의 PNG 아이콘을 외부 라이브러리 없이 만듭니다.
// 사용: npm run icons
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0x5b, 0x8c, 0xff];
const FG = [0xff, 0xff, 0xff];
// 512 기준 좌표 (x, y, w, h, r)
const BARS = [
  [96, 176, 44, 160, 14],
  [148, 140, 52, 232, 16],
  [312, 140, 52, 232, 16],
  [372, 176, 44, 160, 14],
  [196, 236, 120, 40, 10],
];

function inRRect(px, py, x, y, w, h, r) {
  if (px < x || py < y || px > x + w || py > y + h) return false;
  const cx = Math.min(Math.max(px, x + r), x + w - r);
  const cy = Math.min(Math.max(py, y + r), y + h - r);
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

function render(size, { maskable = false } = {}) {
  const S = 4; // 안티앨리어싱 샘플
  const scale = 512 / size;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let bg = 0;
      let fg = 0;
      for (let sy = 0; sy < S; sy++)
        for (let sx = 0; sx < S; sx++) {
          let px = (x + (sx + 0.5) / S) * scale;
          let py = (y + (sy + 0.5) / S) * scale;
          const inBg = maskable || inRRect(px, py, 0, 0, 512, 512, 112);
          if (!inBg) continue;
          bg++;
          if (maskable) {
            // 마스커블 아이콘은 안전 영역(80%) 안에 그림을 넣습니다.
            px = (px - 256) / 0.8 + 256;
            py = (py - 256) / 0.8 + 256;
          }
          if (BARS.some(([bx, by, bw, bh, br]) => inRRect(px, py, bx, by, bw, bh, br))) fg++;
        }
      const n = S * S;
      const o = y * (size * 4 + 1) + 1 + x * 4;
      for (let c = 0; c < 3; c++) raw[o + c] = bg ? Math.round((BG[c] * (bg - fg) + FG[c] * fg) / bg) : 0;
      raw[o + 3] = Math.round((bg / n) * 255);
    }
  }
  return png(size, size, raw);
}

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync(new URL('../public/icon-192.png', import.meta.url), render(192));
writeFileSync(new URL('../public/icon-512.png', import.meta.url), render(512, { maskable: true }));
console.log('icons written: public/icon-192.png, public/icon-512.png');
