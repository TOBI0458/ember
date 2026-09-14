'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const DEMO = path.join(ROOT, 'demo');
const DIST = path.join(DEMO, 'dist');

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0 ^ -1;
  for (let i = 0; i < buffer.length; i += 1) {
    c = (c >>> 8) ^ CRC_TABLE[(c ^ buffer[i]) & 0xff];
  }
  return (c ^ -1) >>> 0;
}

function makeZip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBuf = Buffer.from(name, 'utf8');
    const raw = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    const deflated = zlib.deflateRawSync(raw, { level: 9 });
    const sum = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(sum, 14);
    local.writeUInt32LE(deflated.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);

    chunks.push(local, nameBuf, deflated);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0, 8);
    dir.writeUInt16LE(8, 10);
    dir.writeUInt16LE(0, 12);
    dir.writeUInt16LE(0x21, 14);
    dir.writeUInt32LE(sum, 16);
    dir.writeUInt32LE(deflated.length, 20);
    dir.writeUInt32LE(raw.length, 24);
    dir.writeUInt16LE(nameBuf.length, 28);
    dir.writeUInt32LE(0, 38);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, nameBuf);

    offset += local.length + nameBuf.length + deflated.length;
  }

  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  const count = Object.keys(files).length;
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(count, 8);
  end.writeUInt16LE(count, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...chunks, centralBuf, end]);
}

function gameHtml({ title, hue, version, tagline }) {
  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><title>${title}</title>
<style>
  html,body{margin:0;height:100%;background:#07090e;color:#e8ecf4;
    font-family:"Segoe UI",system-ui,sans-serif;display:grid;place-items:center;overflow:hidden}
  .wrap{text-align:center}
  h1{margin:0 0 4px;font-size:34px;letter-spacing:-1px;
    background:linear-gradient(120deg,hsl(${hue} 80% 65%),hsl(${(hue + 60) % 360} 80% 62%));
    -webkit-background-clip:text;-webkit-text-fill-color:transparent}
  p{margin:0 0 18px;color:#8b95a8;font-size:14px}
  canvas{border-radius:14px;border:1px solid rgba(255,255,255,.12);background:#0d1119;display:block}
  .hud{margin-top:12px;color:#98a2b6;font-size:13px}
  b{color:hsl(${hue} 80% 66%)}
</style></head><body>
<div class="wrap">
  <h1>${title}</h1>
  <p>${tagline} &middot; Version ${version}</p>
  <canvas id="c" width="640" height="360"></canvas>
  <div class="hud">Maus bewegen &middot; Punkte: <b id="score">0</b> &middot; Bestzeit: <b id="best">0.0</b>s</div>
</div>
<script>
  const c = document.getElementById('c'), ctx = c.getContext('2d');
  const hue = ${hue};
  let player = { x: 320, y: 180 }, score = 0, start = performance.now(), best = 0;
  let orbs = Array.from({ length: 5 }, () => spawn());

  function spawn() {
    const angle = Math.random() * Math.PI * 2, speed = 1 + Math.random() * 1.8;
    return { x: Math.random() * 640, y: Math.random() * 360, r: 6 + Math.random() * 10,
             vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
             good: Math.random() > 0.4 };
  }

  c.addEventListener('mousemove', (e) => {
    const box = c.getBoundingClientRect();
    player.x = e.clientX - box.left;
    player.y = e.clientY - box.top;
  });

  function loop() {
    ctx.fillStyle = 'rgba(13,17,25,.35)';
    ctx.fillRect(0, 0, 640, 360);

    for (let i = 0; i < orbs.length; i++) {
      const o = orbs[i];
      o.x += o.vx; o.y += o.vy;
      if (o.x < o.r || o.x > 640 - o.r) o.vx *= -1;
      if (o.y < o.r || o.y > 360 - o.r) o.vy *= -1;

      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.fillStyle = o.good ? 'hsl(' + hue + ' 80% 60%)' : '#f2555a';
      ctx.fill();

      const d = Math.hypot(o.x - player.x, o.y - player.y);
      if (d < o.r + 9) {
        if (o.good) { score += 10; orbs[i] = spawn(); }
        else {
          best = Math.max(best, (performance.now() - start) / 1000);
          score = 0; start = performance.now();
          orbs = Array.from({ length: 5 }, () => spawn());
          break;
        }
      }
    }

    ctx.beginPath();
    ctx.arc(player.x, player.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'hsl(' + hue + ' 90% 65%)';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;

    document.getElementById('score').textContent = score;
    document.getElementById('best').textContent = Math.max(best, (performance.now() - start) / 1000).toFixed(1);
    requestAnimationFrame(loop);
  }
  loop();
</script></body></html>`;
}

const GAMES = [
  {
    id: 'neon-drift',
    title: 'Neon Drift',
    developer: 'Tobias',
    hue: 265,
    version: '1.2.0',
    tagline: 'Sammle die Lichter, weiche dem Rot aus',
    featured: true,
    tags: ['Arcade', 'Reflexe', 'Singleplayer'],
    releaseDate: '2026-06-14',
    shortDescription:
      'Ein schneller Arcade-Lauf durch pulsierendes Neon. Jede Sekunde zählt, jeder Fehler kostet alles.',
    description:
      'Neon Drift ist ein Reaktionsspiel in einer Stadt aus Licht. Du steuerst einen Funken durch ein Feld treibender Orbs — die blauen bringen Punkte, die roten setzen dich zurück auf null.\n\nJe länger du überlebst, desto schneller wird das Feld. Es gibt kein Ende, nur deine Bestzeit.',
    patchNotes:
      '• Orbs bewegen sich jetzt gleichmäßiger\n• Bestzeit bleibt nach einem Treffer erhalten\n• Trefferzone am Spieler leicht verkleinert'
  },
  {
    id: 'pixel-forge',
    title: 'Pixel Forge',
    developer: 'Tobias',
    hue: 32,
    version: '0.9.4',
    tagline: 'Schmiede aus Licht, was du brauchst',
    tags: ['Puzzle', 'Aufbau', 'Early Access'],
    releaseDate: '2026-07-02',
    shortDescription: 'Ein ruhiges Puzzlespiel über Formen, Farben und Geduld.',
    description:
      'Pixel Forge ist noch in der frühen Phase. Du sammelst Bausteine und setzt sie zu größeren Mustern zusammen.\n\nDiese Version zeigt den Kern der Steuerung. Der Aufbaumodus kommt im nächsten Update.',
    patchNotes: '• Erste spielbare Fassung\n• Steuerung auf die Maus umgestellt'
  },
  {
    id: 'star-relay',
    title: 'Star Relay',
    developer: 'Tobias',
    hue: 190,
    version: '2.0.1',
    tagline: 'Halte die Verbindung offen',
    tags: ['Weltraum', 'Geschick', 'Singleplayer'],
    releaseDate: '2026-05-20',
    shortDescription: 'Lenke ein Signal durch ein Feld aus Trabanten, ohne den Kontakt zu verlieren.',
    description:
      'Star Relay dreht sich um eine einzige Frage: wie lange hältst du die Leitung offen?\n\nDu führst einen Signalpunkt durch ein Feld treibender Körper. Berühre die hellen, meide die roten. Version 2 hat das gesamte Bewegungsmodell neu bekommen.',
    patchNotes:
      '• Bewegungsmodell komplett überarbeitet\n• Kollisionen fühlen sich fairer an\n• Fehler behoben, bei dem der Punktestand hängen blieb'
  }
];

function build() {
  fs.mkdirSync(DIST, { recursive: true });

  const catalogGames = GAMES.map((game) => {
    const zip = makeZip({
      'index.html': gameHtml(game),
      'start.bat': `@echo off\r\nstart "" "%~dp0index.html"\r\n`,
      'README.txt': `${game.title} v${game.version}\r\n\r\n${game.shortDescription}\r\n`
    });

    const fileName = `${game.id}-${game.version}.zip`;
    fs.writeFileSync(path.join(DIST, fileName), zip);
    const sha256 = crypto.createHash('sha256').update(zip).digest('hex');

    return {
      id: game.id,
      title: game.title,
      developer: game.developer,
      shortDescription: game.shortDescription,
      description: game.description,
      tags: game.tags,
      version: game.version,
      releaseDate: game.releaseDate,
      sizeBytes: zip.length,
      featured: Boolean(game.featured),
      executable: 'start.bat',
      patchNotes: game.patchNotes,

      download: { url: `{{DEMO_DIST}}/${fileName}`, sha256 }
    };
  });

  fs.writeFileSync(
    path.join(DEMO, 'games.json'),
    `${JSON.stringify({ manifestVersion: 1, updatedAt: new Date().toISOString(), games: catalogGames }, null, 2)}\n`,
    'utf8'
  );

  console.log(`Demo-Katalog gebaut: ${catalogGames.length} Spiele in ${path.relative(ROOT, DIST)}`);
}

build();
