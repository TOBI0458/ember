'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function fail(message) {
  console.error('\n  FEHLER: ' + message + '\n');
  process.exit(1);
}

const psQuote = (s) => "'" + String(s).replace(/'/g, "''") + "'";

function zipFolder(sourceDir, zipPath) {

  const script =
    'Add-Type -AssemblyName System.IO.Compression.FileSystem; ' +
    '[System.IO.Compression.ZipFile]::CreateFromDirectory(' +
    psQuote(sourceDir) + ',' + psQuote(zipPath) + ',' +
    '[System.IO.Compression.CompressionLevel]::Optimal,$false)';

  const res = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
    stdio: ['ignore', 'inherit', 'pipe'],
    encoding: 'utf8'
  });
  if (res.status !== 0) {
    fail('Packen fehlgeschlagen.\n' + (res.stderr || '').trim());
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
}

function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(file);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function folderSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? folderSize(full) : fs.statSync(full).size;
  }
  return total;
}

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1) + ' MB';

function findExecutable(dir) {
  const exes = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.exe'))
    .map((e) => e.name)
    .filter((n) => !/^(UnityCrashHandler|UnityPlayer)/i.test(n));
  if (exes.length === 0) fail('Keine .exe im Build-Ordner gefunden: ' + dir);
  return exes[0];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = path.join(__dirname, '..');

  if (args.help || !args.from || !args.id || !args.version) {
    console.log(`
  Spiel veroeffentlichen

    npm run publish-game -- --id <kennung> --version <x.y.z> --from <build-ordner>

  Pflicht:
    --id        Kennung des Spiels, z.B. hollow-halls
    --version   neue Versionsnummer, z.B. 0.2.0
    --from      Ordner mit dem fertigen Build (die .exe liegt direkt darin)

  Optional:
    --title     Anzeigename (nur beim ersten Mal noetig)
    --catalog   Ordner deines Katalog-Repos   (Standard: ../launcher-katalog)
    --out       wohin das ZIP gelegt wird     (Standard: <katalog>/../builds)
    --notes     Patchnotes, Zeilen mit | trennen
`);
    process.exit(args.help ? 0 : 1);
  }

  const buildDir = path.resolve(args.from);
  if (!fs.existsSync(buildDir)) fail('Build-Ordner existiert nicht: ' + buildDir);

  const catalogDir = path.resolve(args.catalog || path.join(root, '..', 'launcher-katalog'));
  const catalogFile = path.join(catalogDir, 'games.json');
  if (!fs.existsSync(catalogFile)) {
    fail(
      'Keine games.json gefunden unter:\n           ' + catalogFile +
      '\n\n  Lege zuerst dein Katalog-Repo an (siehe VERTEILEN.md) oder gib den' +
      '\n  Pfad mit --catalog an.'
    );
  }

  const pkg = readJson(path.join(root, 'package.json'));
  const publish = (pkg.build && pkg.build.publish && pkg.build.publish[0]) || {};
  const owner = args.owner || publish.owner;
  if (!owner || owner === 'DEIN-GITHUB-NAME') {
    fail(
      'In package.json steht noch der Platzhalter statt deines GitHub-Namens.\n' +
      '           Trage ihn unter build.publish.owner ein.'
    );
  }

  const assetRepo = args.repo || (pkg.ember && pkg.ember.gamesRepo) || args.id;

  const outDir = path.resolve(args.out || path.join(catalogDir, '..', 'builds'));
  fs.mkdirSync(outDir, { recursive: true });
  const zipName = `${args.id}-${args.version}.zip`;
  const zipPath = path.join(outDir, zipName);

  const exe = findExecutable(buildDir);
  const raw = folderSize(buildDir);

  console.log('\n  Spiel      ' + args.id + '  v' + args.version);
  console.log('  Startdatei ' + exe);
  console.log('  Build      ' + mb(raw) + '  (' + buildDir + ')');
  console.log('\n  Packe ... das dauert bei grossen Builds ein paar Minuten.');

  fs.rmSync(zipPath, { force: true });
  const started = Date.now();
  zipFolder(buildDir, zipPath);

  const zipped = fs.statSync(zipPath).size;
  const digest = await sha256(zipPath);
  const seconds = Math.round((Date.now() - started) / 1000);

  console.log('  Fertig in ' + seconds + ' s: ' + mb(zipped) +
    '  (' + Math.round((1 - zipped / raw) * 100) + ' % kleiner)');

  if (zipped > 2 * 1024 * 1024 * 1024) {
    console.log('\n  ACHTUNG: ueber 2 GB. GitHub nimmt keine groesseren Dateien in ein Release.');
  }

  const catalog = readJson(catalogFile);
  if (!Array.isArray(catalog.games)) catalog.games = [];

  const url =
    `https://github.com/${owner}/${assetRepo}/releases/download/v${args.version}/${zipName}`;

  let entry = catalog.games.find((g) => g.id === args.id);
  const isNew = !entry;

  if (isNew) {
    if (!args.title) fail('Neues Spiel: bitte einmalig --title mitgeben.');
    entry = {
      id: args.id,
      title: args.title,
      developer: pkg.author || 'Tobias',
      shortDescription: '',
      description: '',
      tags: [],
      featured: catalog.games.length === 0,
      releaseDate: new Date().toISOString().slice(0, 10)
    };
    catalog.games.push(entry);
  }

  entry.version = args.version;
  entry.executable = exe;
  entry.sizeBytes = zipped;
  entry.download = { url, sha256: digest };
  if (args.title) entry.title = args.title;
  if (args.notes) entry.patchNotes = String(args.notes).split('|').map((s) => s.trim()).join('\n');

  fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2) + '\n', 'utf8');

  const tag = 'v' + args.version;
  console.log('\n  games.json aktualisiert' + (isNew ? '  (neuer Eintrag)' : ''));
  console.log('\n  ---------------------------------------------------------------');
  console.log('  Jetzt noch zwei Schritte:\n');
  console.log('  1) Release anlegen und ZIP hochladen');
  console.log('     Repo:  https://github.com/' + owner + '/' + assetRepo + '/releases/new');
  console.log('     Tag:   ' + tag);
  console.log('     Datei: ' + zipPath);
  console.log('\n     Mit installierter gh-Kommandozeile geht es auch so:');
  console.log('     gh release create ' + tag + ' "' + zipPath + '" --repo ' +
    owner + '/' + assetRepo + ' --title "' + (entry.title || args.id) + ' ' + tag + '" --notes ""');
  console.log('\n  2) Katalog hochladen');
  console.log('     cd "' + catalogDir + '"');
  console.log('     git add games.json && git commit -m "' + args.id + ' ' + tag +
    '" && git push');
  console.log('  ---------------------------------------------------------------\n');
}

main().catch((err) => fail(err.stack || err.message));
