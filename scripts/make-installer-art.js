'use strict';

/*
 * Malt die beiden Bilder, die der Installer anzeigt:
 *
 *   build/installerSidebar.bmp   164 x 314   dunkel, Willkommens- und Schlussseite
 *   build/installerHeader.bmp    150 x  57   hell, Kopfzeile der Seiten dazwischen
 *
 * Die Groessen sind von NSIS fest vorgegeben - weicht eine ab, bricht der Build
 * ab. Deshalb stehen sie hier als Konstanten und werden nirgends gerechnet.
 *
 * Warum BMP und nicht PNG? NSIS kann nur BMP. Dafuer ist das Format simpel:
 * ein Kopf und danach die Bildpunkte, zeilenweise von unten nach oben.
 *
 * Die Kopfzeile ist absichtlich hell: sie sitzt im Dialogfenster von Windows,
 * und ein dunkler Klotz auf weissem Grund sieht aus wie ein Fehler.
 *
 *   npm run art
 */

const fs = require('fs');
const path = require('path');

const SAMPLES = 3; // 3x3 Unterabtastung je Bildpunkt - glaettet Kanten

/* ------------------------------------------------------------------- BMP */

function writeBmp(file, width, height, rgb) {
  // Jede Bildzeile wird auf ein Vielfaches von 4 Byte aufgefuellt.
  const pad = (4 - ((width * 3) % 4)) % 4;
  const rowSize = width * 3 + pad;
  const pixels = rowSize * height;

  const buf = Buffer.alloc(54 + pixels);
  buf.write('BM', 0, 'ascii');
  buf.writeUInt32LE(54 + pixels, 2);
  buf.writeUInt32LE(54, 10); // wo die Bildpunkte anfangen
  buf.writeUInt32LE(40, 14); // Groesse des Info-Kopfes
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22); // positiv heisst: unterste Zeile zuerst
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28); // 24 Bit, kein Alphakanal
  buf.writeUInt32LE(0, 30);
  buf.writeUInt32LE(pixels, 34);
  buf.writeInt32LE(2835, 38); // ~72 dpi
  buf.writeInt32LE(2835, 42);

  for (let y = 0; y < height; y += 1) {
    const dst = 54 + (height - 1 - y) * rowSize;
    for (let x = 0; x < width; x += 1) {
      const src = (y * width + x) * 3;
      buf[dst + x * 3] = rgb[src + 2]; // BMP speichert Blau zuerst
      buf[dst + x * 3 + 1] = rgb[src + 1];
      buf[dst + x * 3 + 2] = rgb[src];
    }
  }

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
}

/* ------------------------------------------------------------- Geometrie */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function mix(a, b, t) {
  const u = clamp(t, 0, 1);
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

// Abstand eines Punktes zu einer Strecke.
function distToSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const len = bax * bax + bay * bay;
  const h = len === 0 ? 0 : clamp((pax * bax + pay * bay) / len, 0, 1);
  return Math.hypot(pax - bax * h, pay - bay * h);
}

function distToStrokes(px, py, strokes) {
  let best = Infinity;
  for (const line of strokes) {
    for (let i = 1; i < line.length; i += 1) {
      const d = distToSegment(px, py, line[i - 1][0], line[i - 1][1], line[i][0], line[i][1]);
      if (d < best) best = d;
    }
  }
  return best;
}

/* ---------------------------------------------------------------- Schrift */

// Ein Bogen als Streckenzug. Winkel 0 zeigt nach oben, 180 nach unten,
// die Woelbung geht nach rechts.
function arc(cx, cy, r, from, to, steps) {
  const pts = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = ((from + ((to - from) * i) / steps) * Math.PI) / 180;
    pts.push([cx + r * Math.sin(t), cy - r * Math.cos(t)]);
  }
  return pts;
}

// Die fuenf Buchstaben von EMBER, gezeichnet als Linienzuege in einem Kaestchen
// der Hoehe 1. y = 0 ist oben. Mehr Buchstaben braucht hier niemand.
const GLYPHS = {
  E: {
    width: 0.6,
    strokes: [
      [[0, 0], [0, 1]],
      [[0, 0], [0.6, 0]],
      [[0, 0.5], [0.48, 0.5]],
      [[0, 1], [0.6, 1]]
    ]
  },
  M: {
    width: 0.86,
    strokes: [[[0, 1], [0, 0], [0.43, 0.58], [0.86, 0], [0.86, 1]]]
  },
  B: {
    width: 0.63,
    strokes: [
      [[0, 0], [0, 1]],
      [[0, 0], ...arc(0.34, 0.25, 0.25, 0, 180, 14), [0, 0.5]],
      [[0, 0.5], ...arc(0.36, 0.75, 0.25, 0, 180, 14), [0, 1]]
    ]
  },
  R: {
    width: 0.64,
    strokes: [
      [[0, 0], [0, 1]],
      [[0, 0], ...arc(0.34, 0.26, 0.26, 0, 180, 14), [0, 0.52]],
      [[0.3, 0.52], [0.64, 1]]
    ]
  }
};

// Setzt das Wort und liefert die Linienzuege in Bildpunkten.
function layout(text, x0, yTop, height, tracking) {
  const strokes = [];
  let x = x0;
  for (const ch of text) {
    const g = GLYPHS[ch];
    for (const line of g.strokes) {
      strokes.push(line.map(([gx, gy]) => [x + gx * height, yTop + gy * height]));
    }
    x += (g.width + tracking) * height;
  }
  return { strokes, width: x - x0 - tracking * height };
}

// Einmal trocken setzen, um die Breite zu kennen, dann mittig richtig setzen.
function centered(text, centerX, yTop, height, tracking) {
  const probe = layout(text, 0, yTop, height, tracking);
  return layout(text, centerX - probe.width / 2, yTop, height, tracking);
}

/* ----------------------------------------------------------------- Flamme */

// Dieselbe Form wie in make-icon.js: unten ein Kreis, nach oben zur Spitze.
function inFlame(x, y, apexY, centerY, radius, lean) {
  if (y >= centerY) return Math.hypot(x - 0.5, y - centerY) <= radius;
  const u = (centerY - y) / (centerY - apexY);
  if (u > 1) return false;
  const halfWidth = radius * Math.pow(1 - u, 0.62);
  const cx = 0.5 + lean * Math.sin(Math.PI * u);
  return Math.abs(x - cx) <= halfWidth;
}

// Malt die Flamme in ein quadratisches Kaestchen und gibt die Farbe zurueck -
// oder null, wenn der Punkt daneben liegt.
function flameColor(x, y, centerX, centerY, size) {
  const u = (x - (centerX - size / 2)) / size;
  const v = (y - (centerY - size / 2)) / size;
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;
  if (inFlame(u, v, 0.435, 0.755, 0.128, 0.03)) {
    return mix([255, 236, 176], [255, 148, 44], (v - 0.44) / 0.47);
  }
  if (inFlame(u, v, 0.155, 0.675, 0.238, 0.055)) {
    return mix([255, 178, 59], [236, 76, 20], (v - 0.16) / 0.75);
  }
  return null;
}

/* ------------------------------------------------------------- Seitenbild */

const SIDE_W = 164;
const SIDE_H = 314;

const SIDE_FLAME = { x: 82, y: 126, size: 118 };
const SIDE_WORD = centered('EMBER', 82, 206, 26, 0.2);
const SIDE_WORD_STROKE = 3.4;

// Aufsteigende Glut. Fest verdrahtet statt zufaellig, damit zwei Builds
// dasselbe Bild ergeben - sonst waere jeder Installer minimal anders.
const SIDE_EMBERS = [
  [46, 96, 2.6, 0.55], [122, 78, 2.0, 0.45], [38, 158, 1.8, 0.4],
  [130, 148, 2.4, 0.5], [58, 54, 1.6, 0.32], [110, 40, 2.2, 0.28],
  [30, 122, 1.5, 0.3], [138, 106, 1.7, 0.35], [70, 24, 1.4, 0.22],
  [96, 176, 2.0, 0.42], [24, 66, 1.3, 0.24], [144, 60, 1.5, 0.26],
  [52, 186, 1.6, 0.3], [126, 190, 1.4, 0.26]
];

function sidebar(x, y) {
  let c = mix([19, 24, 34], [8, 10, 15], y / SIDE_H);

  // Warmer Schein hinter der Flamme, damit die Flaeche nicht tot wirkt.
  const glow = Math.hypot(x - SIDE_FLAME.x, y - SIDE_FLAME.y);
  c = mix(c, [62, 38, 27], Math.max(0, 1 - glow / 115) * 0.8);

  for (const [ex, ey, er, alpha] of SIDE_EMBERS) {
    const d = Math.hypot(x - ex, y - ey);
    if (d < er) c = mix(c, [255, 170, 70], (1 - d / er) * alpha);
  }

  const flame = flameColor(x, y, SIDE_FLAME.x, SIDE_FLAME.y, SIDE_FLAME.size);
  if (flame) c = flame;

  if (distToStrokes(x, y, SIDE_WORD.strokes) <= SIDE_WORD_STROKE / 2) {
    c = [243, 246, 251];
  }

  // Kleiner Strich unter dem Schriftzug.
  if (Math.abs(y - 252) <= 1 && Math.abs(x - 82) <= 26) c = [236, 108, 34];

  return c;
}

/* ------------------------------------------------------------- Kopfzeile */

const HEAD_W = 150;
const HEAD_H = 57;

const HEAD_TEXT_H = 15;
const HEAD_PROBE = layout('EMBER', 0, 0, HEAD_TEXT_H, 0.18);
const HEAD_FLAME_BOX = 36;
const HEAD_GROUP = HEAD_FLAME_BOX * 0.52 + 7 + HEAD_PROBE.width;
const HEAD_LEFT = (HEAD_W - HEAD_GROUP) / 2;
const HEAD_FLAME = { x: HEAD_LEFT + HEAD_FLAME_BOX * 0.26, y: 28, size: HEAD_FLAME_BOX };
const HEAD_WORD = layout('EMBER', HEAD_LEFT + HEAD_FLAME_BOX * 0.52 + 7, 21, HEAD_TEXT_H, 0.18);
const HEAD_WORD_STROKE = 2.1;

function header(x, y) {
  let c = mix([255, 255, 255], [237, 240, 245], y / HEAD_H);

  const flame = flameColor(x, y, HEAD_FLAME.x, HEAD_FLAME.y, HEAD_FLAME.size);
  if (flame) c = flame;

  if (distToStrokes(x, y, HEAD_WORD.strokes) <= HEAD_WORD_STROKE / 2) {
    c = [26, 31, 43];
  }

  return c;
}

/* ------------------------------------------------------------------ Bauen */

function render(width, height, fn) {
  const out = Buffer.alloc(width * height * 3);
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const c = fn(px + (sx + 0.5) / SAMPLES, py + (sy + 0.5) / SAMPLES);
          r += c[0];
          g += c[1];
          b += c[2];
        }
      }
      const n = SAMPLES * SAMPLES;
      const i = (py * width + px) * 3;
      out[i] = clamp(Math.round(r / n), 0, 255);
      out[i + 1] = clamp(Math.round(g / n), 0, 255);
      out[i + 2] = clamp(Math.round(b / n), 0, 255);
    }
  }
  return out;
}

const buildDir = path.join(__dirname, '..', 'build');

const sideFile = path.join(buildDir, 'installerSidebar.bmp');
writeBmp(sideFile, SIDE_W, SIDE_H, render(SIDE_W, SIDE_H, sidebar));
console.log('  Seitenbild gezeichnet:  ' + sideFile + '  (' + SIDE_W + ' x ' + SIDE_H + ')');

const headFile = path.join(buildDir, 'installerHeader.bmp');
writeBmp(headFile, HEAD_W, HEAD_H, render(HEAD_W, HEAD_H, header));
console.log('  Kopfzeile gezeichnet:   ' + headFile + '  (' + HEAD_W + ' x ' + HEAD_H + ')');
