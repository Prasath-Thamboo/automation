/**
 * Génère des visuels d'application *provisoires* (icône, écran de lancement).
 * Aplat couleur marque + pastille contrastée, sans texte : ils tiennent la
 * chaîne de build EAS en attendant l'identité définitive.
 *
 *   node apps/mobile/assets/generate-placeholders.mjs
 *
 * À REMPLACER avant soumission (voir apps/mobile/store/README.md).
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// Palette : tokens @tando/config (paper / primary / primaryStrong).
const PAPER = [0xfb, 0xf9, 0xf4, 0xff];
const PRIMARY = [0x2f, 0x7d, 0x4f, 0xff];
const STRONG = [0x1f, 0x5c, 0x39, 0xff];
const CLEAR = [0, 0, 0, 0];

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
}

/** @param {(x:number,y:number)=>number[]} paint RGBA par pixel */
function png(size, paint) {
  const bytesPerRow = size * 4 + 1;
  const raw = Buffer.alloc(bytesPerRow * size);
  for (let y = 0; y < size; y++) {
    raw[y * bytesPerRow] = 0; // filtre "none"
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = paint(x, y);
      const o = y * bytesPerRow + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // profondeur
  ihdr[9] = 6; // couleur RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Pastille arrondie centrée, occupant `frac` de la surface. */
function rounded(x, y, size, frac, inside, outside) {
  const m = (size * (1 - frac)) / 2;
  const r = size * 0.16;
  const x0 = m;
  const y0 = m;
  const x1 = size - m;
  const y1 = size - m;
  if (x < x0 || x > x1 || y < y0 || y > y1) return outside;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return Math.hypot(x - cx, y - cy) <= r + 0.5 ? inside : outside;
}

const files = {
  "icon.png": png(1024, (x, y) => {
    const base = rounded(x, y, 1024, 0.62, PRIMARY, PAPER);
    return rounded(x, y, 1024, 0.28, STRONG, base);
  }),
  "adaptive-icon.png": png(1024, (x, y) => rounded(x, y, 1024, 0.6, PRIMARY, CLEAR)),
  "splash-icon.png": png(512, (x, y) => rounded(x, y, 512, 0.55, PRIMARY, CLEAR)),
  "notification-icon.png": png(96, (x, y) => rounded(x, y, 96, 0.8, [255, 255, 255, 255], CLEAR)),
  "favicon.png": png(48, (x, y) => rounded(x, y, 48, 0.7, PRIMARY, PAPER)),
};

for (const [name, buf] of Object.entries(files)) {
  writeFileSync(resolve(here, name), buf);
  console.log(`écrit ${name} (${buf.length} o)`);
}
