'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 512;
const SAMPLES = 4;

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([head, body, crc]);
}

function writePng(file, pixels, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0))
    ])
  );
}

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * Math.min(1, Math.max(0, t)));

function roundedBox(x, y, inset, radius) {
  const dx = Math.abs(x - 0.5) - (0.5 - inset - radius);
  const dy = Math.abs(y - 0.5) - (0.5 - inset - radius);
  const outX = Math.max(dx, 0);
  const outY = Math.max(dy, 0);
  return Math.hypot(outX, outY) + Math.min(Math.max(dx, dy), 0) - radius;
}

function inFlame(x, y, apexY, centerY, radius, lean) {
  if (y >= centerY) {
    return Math.hypot(x - 0.5, y - centerY) <= radius;
  }
  const u = (centerY - y) / (centerY - apexY);
  if (u > 1) return false;
  const halfWidth = radius * Math.pow(1 - u, 0.62);
  const cx = 0.5 + lean * Math.sin(Math.PI * u);
  return Math.abs(x - cx) <= halfWidth;
}

function sample(x, y) {
  const edge = roundedBox(x, y, 0.025, 0.225);
  if (edge > 0) return [0, 0, 0, 0];

  let color = mix([26, 32, 46], [11, 14, 20], y);

  if (inFlame(x, y, 0.155, 0.675, 0.238, 0.055)) {
    color = mix([255, 178, 59], [236, 76, 20], (y - 0.16) / 0.75);
  }
  if (inFlame(x, y, 0.435, 0.755, 0.128, 0.03)) {
    color = mix([255, 236, 176], [255, 148, 44], (y - 0.44) / 0.47);
  }

  return [color[0], color[1], color[2], 255];
}

function draw() {
  const pixels = Buffer.alloc(SIZE * SIZE * 4);
  const step = 1 / (SIZE * SAMPLES);

  for (let py = 0; py < SIZE; py += 1) {
    for (let px = 0; px < SIZE; px += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const c = sample(
            (px + (sx + 0.5) / SAMPLES) / SIZE,
            (py + (sy + 0.5) / SAMPLES) / SIZE
          );

          r += c[0] * c[3];
          g += c[1] * c[3];
          b += c[2] * c[3];
          a += c[3];
        }
      }
      const i = (py * SIZE + px) * 4;
      if (a > 0) {
        pixels[i] = Math.round(r / a);
        pixels[i + 1] = Math.round(g / a);
        pixels[i + 2] = Math.round(b / a);
      }
      pixels[i + 3] = Math.round(a / (SAMPLES * SAMPLES));
    }
  }
  return pixels;
}

const target = path.join(__dirname, '..', 'build', 'icon.png');
writePng(target, draw(), SIZE);
console.log('  Symbol gezeichnet: ' + target + '  (' + SIZE + ' x ' + SIZE + ')');
