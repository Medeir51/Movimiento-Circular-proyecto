// Genera los íconos PNG de la PWA sin dependencias externas.
// Uso: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(import.meta.dirname, '..', 'public');
mkdirSync(OUT, { recursive: true });

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 6; // RGBA
  const rows = [];
  for (let y = 0; y < size; y++) {
    rows.push(Buffer.from([0]));
    rows.push(rgba.subarray(y * size * 4, (y + 1) * size * 4));
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const BLUE = [37, 99, 235];
const WHITE = [255, 255, 255];
const AMBER = [245, 158, 11];

/** Devuelve el color de un punto (u, v) en [0, 1]² o null si es transparente. */
function shade(u, v, { maskable }) {
  const x = u - 0.5;
  const y = v - 0.5;
  // Fondo: cuadrado redondeado (o lleno si es «maskable»).
  if (!maskable) {
    const r = 0.22;
    const qx = Math.max(Math.abs(x) - (0.5 - r), 0);
    const qy = Math.max(Math.abs(y) - (0.5 - r), 0);
    if (Math.hypot(qx, qy) > r) return null;
  }
  const s = maskable ? 0.78 : 1; // zona segura del ícono adaptable
  const d = Math.hypot(x, y) / s;
  const ang = Math.atan2(y, x);
  const dot = Math.hypot(
    x / s - 0.33 * Math.cos(-Math.PI / 4),
    y / s - 0.33 * Math.sin(-Math.PI / 4),
  );
  if (dot < 0.07) return AMBER;
  if (d > 0.3 && d < 0.37) return WHITE;
  if (d < 0.065) return WHITE;
  if (d < 0.3) {
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      const diff = Math.abs(Math.atan2(Math.sin(ang - a), Math.cos(ang - a)));
      if (d * Math.sin(Math.min(diff, Math.PI / 2)) < 0.014 && diff < Math.PI / 2) return WHITE;
    }
  }
  return BLUE;
}

function render(size, opts) {
  const rgba = Buffer.alloc(size * size * 4);
  const ss = 4;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const c = shade((px + (sx + 0.5) / ss) / size, (py + (sy + 0.5) / ss) / size, opts);
          if (c) {
            r += c[0];
            g += c[1];
            b += c[2];
            a += 1;
          }
        }
      }
      const i = (py * size + px) * 4;
      if (a > 0) {
        rgba[i] = Math.round(r / a);
        rgba[i + 1] = Math.round(g / a);
        rgba[i + 2] = Math.round(b / a);
      }
      rgba[i + 3] = Math.round((255 * a) / (ss * ss));
    }
  }
  return png(size, rgba);
}

writeFileSync(join(OUT, 'pwa-192x192.png'), render(192, { maskable: false }));
writeFileSync(join(OUT, 'pwa-512x512.png'), render(512, { maskable: false }));
writeFileSync(join(OUT, 'pwa-512x512-maskable.png'), render(512, { maskable: true }));
writeFileSync(join(OUT, 'apple-touch-icon.png'), render(180, { maskable: true }));
console.log('Íconos generados en', OUT);
