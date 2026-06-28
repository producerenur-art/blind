// Dependency-free PNG icon generator for SoundCore PWA.
// Draws the SoundCore equalizer logo (matches the favicon in index.html)
// with 4x supersampled anti-aliasing, then encodes 8-bit RGBA PNGs via zlib.
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const BG = [10, 10, 15];        // #0a0a0f
const BAR = [167, 139, 250];    // #a78bfa

// Bars from the 32x32 favicon viewBox: {x, y1, y2, strokeWidth}
const BARS = [
  { x: 16,   y1: 8,    y2: 24,   w: 2.4 },
  { x: 11,   y1: 12,   y2: 20,   w: 2.4 },
  { x: 21,   y1: 12,   y2: 20,   w: 2.4 },
  { x: 6.5,  y1: 14.5, y2: 17.5, w: 2.4 },
  { x: 25.5, y1: 14.5, y2: 17.5, w: 2.4 },
];

// Distance from point to a vertical capsule (rounded line) in 32-grid units
function capsuleInside(px, py, bar, r) {
  const cyTop = Math.min(bar.y1, bar.y2);
  const cyBot = Math.max(bar.y1, bar.y2);
  const cy = Math.max(cyTop, Math.min(py, cyBot));
  const dx = px - bar.x;
  const dy = py - cy;
  return Math.sqrt(dx * dx + dy * dy) <= r;
}

function renderIcon(size, opts = {}) {
  const ss = 4;                 // supersample factor
  const big = size * ss;
  const rounded = opts.rounded !== false;   // rounded-square bg
  const cornerR = rounded ? big * 0.22 : 0;
  const contentScale = opts.contentScale || 1; // shrink bars (maskable safe zone)

  // accumulate premultiplied for clean downscale
  const out = Buffer.alloc(size * size * 4);

  // For each final pixel, average ss*ss subpixels
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let aR = 0, aG = 0, aB = 0, aA = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const bx = x * ss + sx + 0.5;
          const by = y * ss + sy + 0.5;

          // rounded-square coverage (alpha)
          let inside = true;
          if (rounded) {
            const rx = Math.min(bx, big - bx);
            const ry = Math.min(by, big - by);
            if (rx < cornerR && ry < cornerR) {
              const ddx = cornerR - rx, ddy = cornerR - ry;
              inside = (ddx * ddx + ddy * ddy) <= cornerR * cornerR;
            }
          }
          if (!inside) continue; // transparent subpixel

          // map to 32-grid (with content scaling around center 16,16)
          const gx = (bx / big) * 32;
          const gy = (by / big) * 32;
          let isBar = false;
          const r = (2.4 / 2) * contentScale;
          for (const b of BARS) {
            const sb = {
              x: 16 + (b.x - 16) * contentScale,
              y1: 16 + (b.y1 - 16) * contentScale,
              y2: 16 + (b.y2 - 16) * contentScale,
            };
            if (capsuleInside(gx, gy, sb, r)) { isBar = true; break; }
          }
          const c = isBar ? BAR : BG;
          aR += c[0]; aG += c[1]; aB += c[2]; aA += 255;
        }
      }
      const n = ss * ss;
      const alpha = aA / n;            // 0..255
      const idx = (y * size + x) * 4;
      if (alpha <= 0) {
        out[idx] = out[idx + 1] = out[idx + 2] = out[idx + 3] = 0;
      } else {
        // color = sum(color over covered subpixels)/coveredCount
        const covered = aA / 255;
        out[idx]     = Math.round(aR / covered);
        out[idx + 1] = Math.round(aG / covered);
        out[idx + 2] = Math.round(aB / covered);
        out[idx + 3] = Math.round(alpha);
      }
    }
  }
  return out; // raw RGBA
}

// ---- minimal PNG encoder (8-bit RGBA, color type 6) ----
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePNG(rgba, size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  // 10,11,12 = compression/filter/interlace = 0
  // raw with filter byte 0 per row
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const outDir = process.argv[2] || 'assets';
fs.mkdirSync(outDir, { recursive: true });
const jobs = [
  { file: 'icon-192.png',         size: 192, opts: { rounded: true } },
  { file: 'icon-512.png',         size: 512, opts: { rounded: true } },
  { file: 'icon-maskable-512.png',size: 512, opts: { rounded: false, contentScale: 0.66 } },
  { file: 'apple-touch-icon.png', size: 180, opts: { rounded: false } }, // iOS adds its own mask
];
for (const j of jobs) {
  const rgba = renderIcon(j.size, j.opts);
  const png = encodePNG(rgba, j.size);
  const p = path.join(outDir, j.file);
  fs.writeFileSync(p, png);
  console.log(`wrote ${p} (${png.length} bytes, ${j.size}x${j.size})`);
}
console.log('done');
