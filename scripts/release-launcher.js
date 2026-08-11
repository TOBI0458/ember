'use strict';

/*
 * Baut den Installer und veroeffentlicht ihn als GitHub-Release.
 *
 *   npm run release                      baut die Version, die in package.json steht
 *   npm run release -- --version 0.2.0   erhoeht die Version vorher
 *   npm run release -- --notes "Text"    Beschreibung fuer das Release
 *
 * Das Selbstupdate der bereits verteilten Launcher haengt an genau einer Datei:
 * latest.yml. Sie muss mit ins Release, sonst merkt niemand, dass es etwas
 * Neues gibt. Deshalb prueft dieses Skript ihr Vorhandensein, statt sich auf
 * gutes Gedaechtnis zu verlassen.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const pkgFile = path.join(root, 'package.json');

function fail(message) {
  console.error('\n  FEHLER: ' + message + '\n');
  process.exit(1);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
}

function run(command, args, options = {}) {
  return spawnSync(command, args, { cwd: root, shell: true, encoding: 'utf8', ...options });
}

/* ---------------------------------------------------------------- Ablauf */

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`
  Launcher veroeffentlichen

    npm run release                      baut die Version aus der package.json
    npm run release -- --version 0.2.0   erhoeht die Version vorher
    npm run release -- --notes "Text"    eigene Beschreibung fuer das Release

  Fuer ein Update muss die Version steigen - daran erkennen die schon
  verteilten Launcher, dass es etwas Neues gibt.
`);
  process.exit(0);
}

const pkg = readJson(pkgFile);
const publish = (pkg.build && pkg.build.publish && pkg.build.publish[0]) || {};
const repo = `${publish.owner}/${publish.repo}`;

if (!publish.owner || !publish.repo) {
  fail('In package.json fehlt build.publish (owner und repo).');
}

/* --- Version --- */

if (typeof args.version === 'string') {
  if (!/^\d+\.\d+\.\d+$/.test(args.version)) {
    fail('Version muss die Form x.y.z haben, z. B. 0.2.0');
  }
  if (args.version === pkg.version) {
    fail('Das ist schon die aktuelle Version. Fuer ein Update muss sie hoeher werden.');
  }
  pkg.version = args.version;
  fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log('\n  Version in package.json auf ' + pkg.version + ' gesetzt.');
}

const version = pkg.version;
const tag = 'v' + version;

console.log('\n  Ember ' + tag + '  ->  https://github.com/' + repo);

/* --- bauen --- */

console.log('\n  Baue den Installer ... das dauert beim ersten Mal ein paar Minuten.\n');
const build = run('npm', ['run', 'dist'], { stdio: 'inherit', encoding: undefined });
if (build.status !== 0) fail('Der Build ist fehlgeschlagen. Die Meldung steht oben.');

const distDir = path.join(root, 'dist');
const setup = path.join(distDir, `Ember-Setup-${version}.exe`);
const latest = path.join(distDir, 'latest.yml');
const blockmap = setup + '.blockmap';

if (!fs.existsSync(setup)) fail('Installer nicht gefunden: ' + setup);
if (!fs.existsSync(latest)) {
  fail(
    'latest.yml fehlt im dist-Ordner.\n' +
    '           Ohne sie findet kein bereits verteilter Launcher das Update.'
  );
}

const files = [setup, latest];
if (fs.existsSync(blockmap)) files.push(blockmap);

const size = (file) => {
  const bytes = fs.statSync(file).size;
  return bytes < 1024 * 1024
    ? (bytes / 1024).toFixed(0) + ' KB'
    : (bytes / 1024 / 1024).toFixed(1) + ' MB';
};
console.log('\n  Fertig gebaut:');
for (const file of files) console.log('    ' + path.basename(file).padEnd(32) + size(file));

/* --- hochladen --- */

// Der Installer ist nicht signiert - eine Signatur kostet Geld. Windows warnt
// deshalb beim ersten Start jedes Neuen. Das steht direkt im Release, damit
// niemand ratlos davorsitzt und abbricht.
const DEFAULT_NOTES = [
  'Ember ' + tag,
  '',
  'Installieren: Ember-Setup-' + version + '.exe herunterladen und starten.',
  '',
  'Windows zeigt beim ersten Mal "Der Computer wurde durch Windows geschuetzt".',
  'Das liegt daran, dass der Installer nicht kostenpflichtig signiert ist.',
  'Auf "Weitere Informationen" klicken, dann auf "Trotzdem ausfuehren".',
  '',
  'Danach nie wieder etwas herunterladen: Ember aktualisiert sich selbst,',
  'und neue Spiele erscheinen von allein im Store.'
].join('\n');

const notes = typeof args.notes === 'string' ? args.notes : DEFAULT_NOTES;
const ghReady = run('gh', ['auth', 'status']).status === 0;

if (!ghReady) {
  console.log(`
  ---------------------------------------------------------------
  Die GitHub-Kommandozeile ist nicht angemeldet, also der Rest von Hand:

  1) Einmalig einrichten, dann geht es kuenftig automatisch:
       winget install GitHub.cli
       gh auth login

  2) Oder jetzt im Browser: https://github.com/${repo}/releases/new
       Tag:      ${tag}
       Dateien:  ${files.map((f) => path.basename(f)).join(', ')}
       aus:      ${distDir}

  Die latest.yml muss mit hoch. Ohne sie aktualisiert sich nichts.
  ---------------------------------------------------------------
`);
  process.exit(0);
}

const exists = run('gh', ['release', 'view', tag, '--repo', repo]).status === 0;

if (exists) {
  console.log('\n  Release ' + tag + ' gibt es schon - die Dateien werden ersetzt.');
  const upload = run(
    'gh',
    ['release', 'upload', tag, ...files.map((f) => `"${f}"`), '--repo', repo, '--clobber'],
    { stdio: 'inherit', encoding: undefined }
  );
  if (upload.status !== 0) fail('Hochladen fehlgeschlagen.');
} else {
  // Mehrzeiliger Text ueberlebt den Umweg durch die Eingabeaufforderung nicht,
  // deshalb geht er als Datei an gh.
  const notesFile = path.join(distDir, 'release-notes.txt');
  fs.writeFileSync(notesFile, notes, 'utf8');

  const create = run(
    'gh',
    [
      'release', 'create', tag,
      ...files.map((f) => `"${f}"`),
      '--repo', repo,
      '--title', `"Ember ${tag}"`,
      '--notes-file', `"${notesFile}"`
    ],
    { stdio: 'inherit', encoding: undefined }
  );
  if (create.status !== 0) fail('Release anlegen fehlgeschlagen.');
}

console.log(`
  ---------------------------------------------------------------
  Veroeffentlicht: https://github.com/${repo}/releases/tag/${tag}

  Wer Ember schon installiert hat, bekommt das Update beim naechsten
  Start von allein. Nur beim allerersten Mal brauchen deine Leute
  diesen Link:

    https://github.com/${repo}/releases/latest

  Nicht vergessen, die geaenderte Version auch hochzuladen:
    hochladen.bat
  ---------------------------------------------------------------
`);
