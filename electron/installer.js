'use strict';

// Installieren = ZIP laden, prüfen, entpacken, Ordner atomar tauschen.
// Ein Update ist derselbe Weg mit einer neuen Version.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { shell } = require('electron');
const extract = require('extract-zip');
const { downloadFile } = require('./download');
const { getSettings, getInstalled, setInstalled, removeInstalled } = require('./store');

/** Vergleicht "1.2.10" mit "1.3.0". Gibt -1 / 0 / 1 zurück. */
function compareVersions(a, b) {
  const pa = String(a).split(/[.\-+]/).map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split(/[.\-+]/).map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

function isUpdateAvailable(game, installed) {
  if (!installed) return false;
  return compareVersions(installed.version, game.version) < 0;
}

function gameDir(gameId) {
  return path.join(getSettings().installDir, gameId);
}

/** Entpackte ZIPs haben oft genau einen Wurzelordner - den ziehen wir raus. */
async function flattenSingleRoot(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  if (entries.length !== 1 || !entries[0].isDirectory()) return;
  const inner = path.join(dir, entries[0].name);
  const moved = path.join(path.dirname(dir), `${path.basename(dir)}__flat`);
  await fs.promises.rename(inner, moved);
  await fs.promises.rm(dir, { recursive: true, force: true });
  await fs.promises.rename(moved, dir);
}

/** Sucht die Startdatei, falls das Manifest keine angibt. */
async function findExecutable(dir) {
  const preferred = process.platform === 'win32' ? ['.exe', '.bat', '.cmd'] : ['.sh', ''];
  const stack = [dir];
  const found = [];
  while (stack.length) {
    const current = stack.pop();
    const entries = await fs.promises.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (preferred.some((ext) => ext && entry.name.toLowerCase().endsWith(ext))) {
        found.push(path.relative(dir, full));
      }
    }
  }
  // Datei direkt im Wurzelordner schlägt tief verschachtelte.
  found.sort((a, b) => a.split(path.sep).length - b.split(path.sep).length);
  return found[0] || null;
}

async function dirSize(dir) {
  let total = 0;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    const entries = await fs.promises.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else total += (await fs.promises.stat(full)).size;
    }
  }
  return total;
}

/**
 * Installiert oder aktualisiert ein Spiel.
 * onStage meldet { stage, percent, received, total, speedBytesPerSecond }.
 */
async function installGame(game, { onStage, signal } = {}) {
  if (!game.download?.url) {
    throw new Error(`Für "${game.title}" ist keine Download-URL hinterlegt.`);
  }

  const report = (stage, extra = {}) => onStage && onStage({ stage, ...extra });
  const tempRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ember-'));
  const archive = path.join(tempRoot, 'package.zip');
  const staging = path.join(tempRoot, 'unpacked');

  try {
    report('downloading', { percent: 0 });
    const result = await downloadFile(game.download.url, archive, {
      signal,
      onProgress: ({ received, total, speedBytesPerSecond }) => {
        const known = total || game.sizeBytes || 0;
        report('downloading', {
          percent: known ? Math.min(99, Math.round((received / known) * 100)) : 0,
          received,
          total: known,
          speedBytesPerSecond
        });
      }
    });

    if (game.download.sha256 && game.download.sha256.toLowerCase() !== result.sha256) {
      throw new Error(
        'Prüfsumme stimmt nicht. Die Datei ist beschädigt oder wurde verändert - Installation abgebrochen.'
      );
    }

    report('extracting', { percent: 100 });
    await fs.promises.mkdir(staging, { recursive: true });
    await extract(archive, { dir: staging });
    await flattenSingleRoot(staging);

    report('installing', { percent: 100 });
    const target = gameDir(game.id);
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    // Alte Version erst nach erfolgreichem Entpacken entfernen.
    await fs.promises.rm(target, { recursive: true, force: true });
    await fs.promises.rename(staging, target).catch(async (err) => {
      // rename schlägt über Laufwerksgrenzen fehl - dann kopieren.
      if (err.code !== 'EXDEV') throw err;
      await fs.promises.cp(staging, target, { recursive: true });
    });

    const executable = game.executable || (await findExecutable(target));
    const previous = getInstalled(game.id);
    const entry = {
      id: game.id,
      title: game.title,
      version: game.version,
      installPath: target,
      executable,
      sizeBytes: await dirSize(target),
      installedAt: previous?.installedAt || Date.now(),
      updatedAt: Date.now(),
      lastPlayed: previous?.lastPlayed || null,
      playtimeSeconds: previous?.playtimeSeconds || 0
    };
    setInstalled(game.id, entry);
    report('done', { percent: 100 });
    return entry;
  } finally {
    await fs.promises.rm(tempRoot, { recursive: true, force: true }).catch(() => {});
  }
}

async function uninstallGame(gameId) {
  const entry = getInstalled(gameId);
  if (entry?.installPath) {
    await fs.promises.rm(entry.installPath, { recursive: true, force: true });
  }
  removeInstalled(gameId);
}

/** Startet das Spiel losgelöst vom Launcher und misst die Spielzeit. */
function launchGame(gameId, onExit) {
  const entry = getInstalled(gameId);
  if (!entry) throw new Error('Spiel ist nicht installiert.');
  if (!entry.executable) throw new Error('Keine Startdatei gefunden. Bitte in den Details setzen.');

  const exe = path.join(entry.installPath, entry.executable);
  if (!fs.existsSync(exe)) {
    throw new Error(`Startdatei fehlt: ${entry.executable}`);
  }

  const startedAt = Date.now();
  // Node weigert sich seit 20.12, .bat/.cmd direkt zu starten (CVE-2024-27980).
  // Für Stapeldateien geht der Weg deshalb über die Eingabeaufforderung.
  const ext = path.extname(exe).toLowerCase();
  const useCmd = process.platform === 'win32' && (ext === '.bat' || ext === '.cmd');
  const child = useCmd
    ? spawn(process.env.ComSpec || 'cmd.exe', ['/c', exe], {
        cwd: entry.installPath,
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      })
    : spawn(exe, [], {
        cwd: entry.installPath,
        detached: true,
        stdio: 'ignore',
        windowsHide: false
      });
  child.unref();

  child.on('error', (err) => onExit && onExit({ gameId, error: err.message }));
  child.on('exit', () => {
    const seconds = Math.round((Date.now() - startedAt) / 1000);
    const current = getInstalled(gameId);
    if (current) {
      setInstalled(gameId, {
        ...current,
        lastPlayed: Date.now(),
        playtimeSeconds: (current.playtimeSeconds || 0) + seconds
      });
    }
    if (onExit) onExit({ gameId, seconds });
  });

  const current = getInstalled(gameId);
  setInstalled(gameId, { ...current, lastPlayed: startedAt });
  return { pid: child.pid };
}

function openInstallFolder(gameId) {
  const entry = getInstalled(gameId);
  if (!entry) throw new Error('Spiel ist nicht installiert.');
  shell.openPath(entry.installPath);
}

module.exports = {
  compareVersions,
  isUpdateAvailable,
  installGame,
  uninstallGame,
  launchGame,
  openInstallFolder,
  findExecutable
};
