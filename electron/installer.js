'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { shell } = require('electron');
const extract = require('extract-zip');
const { downloadFile } = require('./download');
const { getSettings, getInstalled, setInstalled, removeInstalled } = require('./store');

const WORK_PREFIX = '.ember-work-';

const STALE_WORK_DAYS = 14;

function splitVersion(value) {
  const text = String(value == null ? '' : value).trim();
  const trenner = text.search(/[-+]/);
  const kern = trenner < 0 ? text : text.slice(0, trenner);
  const vorab = trenner < 0 || text[trenner] === '+' ? '' : text.slice(trenner + 1).split('+')[0];
  return {
    zahlen: kern.split('.').map((n) => parseInt(n, 10) || 0),
    vorab
  };
}

function compareVersions(a, b) {
  const va = splitVersion(a);
  const vb = splitVersion(b);

  for (let i = 0; i < Math.max(va.zahlen.length, vb.zahlen.length); i += 1) {
    const d = (va.zahlen[i] || 0) - (vb.zahlen[i] || 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }

  if (va.vorab === vb.vorab) return 0;
  if (!va.vorab) return 1;
  if (!vb.vorab) return -1;
  return va.vorab < vb.vorab ? -1 : 1;
}

function isUpdateAvailable(game, installed) {
  if (!installed) return false;
  return compareVersions(installed.version, game.version) < 0;
}

function gameDir(gameId) {
  return path.join(getSettings().installDir, gameId);
}

function workDir(gameId) {
  return path.join(getSettings().installDir, WORK_PREFIX + gameId);
}

async function flattenSingleRoot(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  if (entries.length !== 1 || !entries[0].isDirectory()) return;
  const inner = path.join(dir, entries[0].name);
  const moved = path.join(path.dirname(dir), `${path.basename(dir)}__flat`);
  await fs.promises.rename(inner, moved);
  await fs.promises.rm(dir, { recursive: true, force: true });
  await fs.promises.rename(moved, dir);
}

const HELPER_EXECUTABLES = [
  /^unitycrashhandler/i,
  /^unityplayer/i,
  /^crashpad/i,
  /^crashreport/i,
  /^ue[45]?prereqsetup/i,
  /^vc_?redist/i,
  /^dxsetup/i,
  /^dotnetfx/i,
  /^oalinst/i,
  /^directx/i,
  /^unins\d*/i
];

function isHelper(relativePath) {
  const name = path.basename(relativePath);
  return HELPER_EXECUTABLES.some((pattern) => pattern.test(name));
}

async function findExecutable(dir) {
  const wanted = process.platform === 'win32' ? ['.exe', '.bat', '.cmd'] : ['.sh'];
  const stack = [dir];
  const found = [];

  while (stack.length) {
    const current = stack.pop();
    const entries = await fs.promises.readdir(current, { withFileTypes: true });
    const names = new Set(entries.map((e) => e.name.toLowerCase()));

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      const lower = entry.name.toLowerCase();
      if (!wanted.some((ext) => lower.endsWith(ext))) continue;

      const relative = path.relative(dir, full);
      const base = entry.name.slice(0, entry.name.length - path.extname(entry.name).length);

      let score = 0;
      if (names.has(`${base.toLowerCase()}_data`)) score += 100;
      if (path.dirname(relative) === '.') score += 40;
      score -= relative.split(path.sep).length;
      if (lower.endsWith('.exe')) score += 5;

      found.push({ relative, score, helper: isHelper(relative) });
    }
  }

  if (!found.length) return null;

  const real = found.filter((item) => !item.helper);
  const pool = real.length ? real : found;
  pool.sort((a, b) => b.score - a.score);
  return pool[0].relative;
}

async function freeBytes(dir) {
  try {
    const stat = await fs.promises.statfs(dir);
    return Number(stat.bavail) * Number(stat.bsize);
  } catch {
    return null;
  }
}

function gb(bytes) {
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

async function ensureSpace(dir, zipBytes, title) {
  if (!zipBytes) return;
  const free = await freeBytes(dir);
  if (free === null) return;

  const need = Math.round(zipBytes * 2.2) + 200 * 1024 * 1024;
  if (free >= need) return;

  throw new Error(
    `Zu wenig Speicherplatz für "${title}": etwa ${gb(need)} nötig, ` +
      `${gb(free)} frei auf ${path.parse(path.resolve(dir)).root}`
  );
}

async function sweepStaleWork(root, keepGameId) {
  const keep = WORK_PREFIX + keepGameId;
  const limit = Date.now() - STALE_WORK_DAYS * 24 * 60 * 60 * 1000;

  let entries;
  try {
    entries = await fs.promises.readdir(root, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(WORK_PREFIX)) continue;
    if (entry.name === keep) continue;
    const full = path.join(root, entry.name);
    try {
      const stat = await fs.promises.stat(full);
      if (stat.mtimeMs < limit) await fs.promises.rm(full, { recursive: true, force: true });
    } catch {

    }
  }
}

async function swapInPlace(staging, target) {
  const backup = `${target}.alt`;
  await fs.promises.rm(backup, { recursive: true, force: true });

  const hadPrevious = fs.existsSync(target);
  if (hadPrevious) await fs.promises.rename(target, backup);

  try {
    await fs.promises.rename(staging, target);
  } catch (err) {
    if (hadPrevious) await fs.promises.rename(backup, target).catch(() => {});
    throw err;
  }

  await fs.promises.rm(backup, { recursive: true, force: true }).catch(() => {});
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

async function installGame(game, { onStage, signal } = {}) {
  if (!game.download?.url) {
    throw new Error(`Für "${game.title}" ist keine Download-URL hinterlegt.`);
  }

  const expected = String(game.download.sha256 || '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expected)) {
    throw new Error(
      `Für "${game.title}" fehlt eine gültige Prüfsumme im Katalog - Installation abgelehnt.`
    );
  }

  const report = (stage, extra = {}) => onStage && onStage({ stage, ...extra });

  const target = gameDir(game.id);
  const root = path.dirname(target);
  await fs.promises.mkdir(root, { recursive: true });

  await sweepStaleWork(root, game.id);
  await ensureSpace(root, game.sizeBytes, game.title);

  const work = workDir(game.id);
  const archive = path.join(work, 'package.zip');
  const staging = path.join(work, 'unpacked');
  await fs.promises.mkdir(work, { recursive: true });

  await dropMismatchedPartial(work, archive, game.download.url, expected);

  let keepPartial = false;

  try {
    report('downloading', { percent: 0 });
    const result = await downloadFile(game.download.url, archive, {
      signal,
      resume: true,
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

    if (expected !== result.sha256) {

      await fs.promises.rm(archive, { force: true }).catch(() => {});
      throw new Error(
        'Prüfsumme stimmt nicht. Die Datei ist beschädigt oder wurde verändert - Installation abgebrochen.'
      );
    }

    report('extracting', { percent: 100 });
    await fs.promises.rm(staging, { recursive: true, force: true });
    await fs.promises.mkdir(staging, { recursive: true });
    await extract(archive, { dir: staging });
    await flattenSingleRoot(staging);

    report('installing', { percent: 100 });
    await swapInPlace(staging, target);

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
  } catch (err) {

    keepPartial = err.message !== 'ABORTED' && fs.existsSync(archive);
    throw err;
  } finally {
    if (keepPartial) {
      await fs.promises.rm(staging, { recursive: true, force: true }).catch(() => {});
    } else {
      await fs.promises.rm(work, { recursive: true, force: true }).catch(() => {});
    }
  }
}

async function dropMismatchedPartial(work, archive, url, sha256) {
  const stampFile = path.join(work, 'partial.json');
  const stamp = { url, sha256 };

  let previous = null;
  try {
    previous = JSON.parse(await fs.promises.readFile(stampFile, 'utf8'));
  } catch {
    previous = null;
  }

  if (!previous || previous.url !== stamp.url || previous.sha256 !== stamp.sha256) {
    await fs.promises.rm(archive, { force: true }).catch(() => {});
  }

  await fs.promises.writeFile(stampFile, JSON.stringify(stamp), 'utf8').catch(() => {});
}

async function uninstallGame(gameId) {
  const entry = getInstalled(gameId);
  if (entry?.installPath) {
    await fs.promises.rm(entry.installPath, { recursive: true, force: true });
  }

  await fs.promises.rm(workDir(gameId), { recursive: true, force: true }).catch(() => {});
  removeInstalled(gameId);
}

function launchGame(gameId, onExit) {
  const entry = getInstalled(gameId);
  if (!entry) throw new Error('Spiel ist nicht installiert.');
  if (!entry.executable) throw new Error('Keine Startdatei gefunden. Bitte in den Details setzen.');

  const exe = path.join(entry.installPath, entry.executable);
  if (!fs.existsSync(exe)) {
    throw new Error(`Startdatei fehlt: ${entry.executable}`);
  }

  const startedAt = Date.now();

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
