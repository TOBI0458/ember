'use strict';

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const {
  app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray, nativeImage, Notification
} = require('electron');

const { fetchText } = require('./download');
const { getSettings, setSettings, getLibrary, getInstalled, setInstalled } = require('./store');
const installer = require('./installer');
const { DownloadQueue } = require('./queue');
const { Wache } = require('./wache');
const i18n = require('../src/i18n');

let mainWindow = null;
let queue = null;
let tray = null;
let wache = null;
let letzterLauncherStand = null;
let hintergrundGesagt = false;

const isDev = !app.isPackaged;
const startVersteckt = process.argv.includes('--hintergrund');

if (startVersteckt) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-software-rasterizer');
}

function sprache() {
  const gewaehlt = getSettings().language;
  return i18n.setLanguage(i18n.resolveLanguage(gewaehlt, app.getLocale()));
}

function tx(key, vars) {
  sprache();
  return i18n.t(key, vars);
}

function emit(channel, payload) {
  if (channel === 'queue:changed') showTaskbarProgress(payload);
  if (channel === 'launcher:update') letzterLauncherStand = payload;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function fensterSichtbar() {
  return Boolean(
    mainWindow &&
      !mainWindow.isDestroyed() &&
      mainWindow.isVisible() &&
      !mainWindow.isMinimized() &&
      mainWindow.isFocused()
  );
}

function melden(titel, text) {
  if (!Notification.isSupported()) return;
  if (fensterSichtbar()) return;

  const meldung = new Notification({ title: titel, body: text, silent: false });

  meldung.on('click', () => fensterZeigen());
  meldung.show();
}

function fensterZeigen() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function anwendungsKennung() {
  const p = require('../package.json');
  return (p.ember && p.ember.appId) || (p.build && p.build.appId) || 'com.tobias.ember';
}

function symbolDatei() {
  return path.join(app.getAppPath(), 'build', 'icon.png');
}

function trayAufbauen() {
  if (tray) return;
  let bild;
  try {
    bild = nativeImage.createFromPath(symbolDatei()).resize({ width: 16, height: 16 });
  } catch {
    bild = nativeImage.createEmpty();
  }
  tray = new Tray(bild);
  tray.setToolTip(tx('tray.tip'));
  trayMenue();
  tray.on('click', () => fensterZeigen());
  tray.on('double-click', () => fensterZeigen());
}

function trayMenue() {
  if (!tray) return;
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: tx('tray.open'), click: () => fensterZeigen() },
      { label: tx('tray.check'), click: () => wache && wache.pruefen() },
      { type: 'separator' },
      { label: tx('tray.quit'), click: () => beenden() }
    ])
  );
}

let beendet = false;
function beenden() {
  beendet = true;
  if (wache) wache.stoppen();
  if (tray) { tray.destroy(); tray = null; }
  app.quit();
}

function alteAutostartEintraegeEntfernen() {
  if (process.platform !== 'win32') return;
  const jetzt = anwendungsKennung();
  const alt = ['electron.app.Ember', 'Ember'].filter((n) => n !== jetzt);
  for (const name of alt) {
    try {
      require('child_process').execFileSync('reg', [
        'delete', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
        '/v', name, '/f'
      ], { stdio: 'ignore' });
    } catch {}
  }
}

function autostartSetzen(an) {
  if (process.platform === 'darwin' || process.platform === 'win32') {
    app.setLoginItemSettings({
      openAtLogin: Boolean(an),
      openAsHidden: true,
      path: process.execPath,
      args: ['--hintergrund']
    });
  }
}

function autostartAbgleichen() {
  if (!app.isPackaged) return;
  const gewollt = getSettings().autostart !== false;
  let ist = false;
  try {
    ist = Boolean(app.getLoginItemSettings({ path: process.execPath, args: ['--hintergrund'] }).openAtLogin);
  } catch {
    ist = !gewollt;
  }
  if (ist !== gewollt) autostartSetzen(gewollt);
  alteAutostartEintraegeEntfernen();
}

function showTaskbarProgress(queueSnapshot) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const active = Array.isArray(queueSnapshot)
    ? queueSnapshot.find((item) => item.state === 'active')
    : null;

  if (!active) {
    mainWindow.setProgressBar(-1);
    return;
  }
  if (active.stage === 'downloading' && active.percent > 0) {
    mainWindow.setProgressBar(Math.min(1, active.percent / 100));
    return;
  }

  mainWindow.setProgressBar(2, { mode: 'indeterminate' });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    frame: false,
    backgroundColor: '#0b0e14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());

  if (process.env.LAUNCHER_DEVTOOLS) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
  mainWindow.webContents.on('console-message', (_e, level, message) => {
    if (level >= 2) console.error('[Oberfläche]', message);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  const sendWindowState = () =>
    emit('window:state', { maximized: mainWindow.isMaximized() });
  mainWindow.on('maximize', sendWindowState);
  mainWindow.on('unmaximize', sendWindowState);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function findUninstaller() {
  if (!app.isPackaged || process.platform !== 'win32') return null;
  const dir = path.dirname(app.getPath('exe'));
  try {
    const hit = fs.readdirSync(dir).find((name) => /^Uninstall .+\.exe$/i.test(name));
    return hit ? path.join(dir, hit) : null;
  } catch {
    return null;
  }
}

function releaseRepo() {
  try {
    const [owner, repo] = String(require('../package.json').ember.launcherRepo).split('/');
    return owner && repo ? { owner, repo } : {};
  } catch {
    return {};
  }
}

function handle(channel, fn) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return { ok: true, data: await fn(...args) };
    } catch (err) {
      console.error(`[${channel}]`, err.stack || err.message);
      return { ok: false, error: err.message || String(err) };
    }
  });
}

function registerIpc() {
  handle('catalog:fetch', (force) => wache.holen({ force: Boolean(force) }));

  handle('library:list', () => getLibrary());

  handle('game:install', async (game) => queue.add(game));
  handle('game:cancel', async (gameId) => {
    queue.cancel(gameId);
    return queue.snapshot();
  });
  handle('queue:dismiss', async (gameId) => {
    queue.remove(gameId);
    return queue.snapshot();
  });
  handle('queue:list', () => queue.snapshot());

  handle('game:uninstall', async (gameId) => {
    await installer.uninstallGame(gameId);
    emit('library:changed', { gameId, entry: null });
    return getLibrary();
  });

  handle('game:launch', async (gameId) =>
    installer.launchGame(gameId, (info) => {
      emit('game:exited', info);
      emit('library:changed', { gameId, entry: getInstalled(gameId) });
    })
  );

  handle('game:openFolder', async (gameId) => {
    installer.openInstallFolder(gameId);
    return true;
  });

  handle('game:setExecutable', async (gameId, relativePath) => {
    const entry = getInstalled(gameId);
    if (!entry) throw new Error('Spiel ist nicht installiert.');

    const full = path.resolve(entry.installPath, relativePath);
    const inside = path.relative(path.resolve(entry.installPath), full);
    if (!inside || inside.startsWith('..') || path.isAbsolute(inside) || !fs.existsSync(full)) {
      throw new Error('Datei liegt nicht im Installationsordner.');
    }

    const updated = setInstalled(gameId, { ...entry, executable: inside });
    emit('library:changed', { gameId, entry: updated });
    return updated;
  });

  handle('settings:get', () => getSettings());
  handle('settings:set', (partial) => {
    const neu = setSettings(partial);
    if (Object.prototype.hasOwnProperty.call(partial || {}, 'autostart')) {
      autostartSetzen(neu.autostart !== false);
    }
    if (Object.prototype.hasOwnProperty.call(partial || {}, 'language')) trayMenue();
    return neu;
  });

  handle('app:openDataDir', async () => {
    await shell.openPath(app.getPath('userData'));
    return true;
  });

  handle('shell:openExternal', async (url) => {
    if (!/^https?:\/\//.test(url)) throw new Error('Nur http(s)-Links erlaubt.');
    await shell.openExternal(url);
    return true;
  });

  handle('app:info', () => ({
    version: app.getVersion(),
    isPackaged: app.isPackaged,
    platform: process.platform,
    dataDir: app.getPath('userData'),

    systemLocale: app.getLocale()
  }));

  handle('app:uninstallerInfo', () => {
    const file = findUninstaller();
    return { available: Boolean(file), path: file };
  });

  handle('app:showUninstaller', async () => {
    const file = findUninstaller();
    if (!file) throw new Error('UNINSTALLER_NOT_FOUND');
    shell.showItemInFolder(file);
    return true;
  });

  handle('app:uninstall', async () => {
    const file = findUninstaller();
    if (!file) throw new Error('UNINSTALLER_NOT_FOUND');

    spawn(file, [], { detached: true, stdio: 'ignore' }).unref();

    setTimeout(() => app.quit(), 800);
    return true;
  });

  handle('app:changelog', async () => {
    const { owner, repo } = releaseRepo();
    if (!owner || !repo) throw new Error('Kein Repository hinterlegt.');

    const text = await fetchText(
      `https://api.github.com/repos/${owner}/${repo}/releases?per_page=10`
    );

    const releases = JSON.parse(text);
    if (!Array.isArray(releases)) throw new Error('Unerwartete Antwort von GitHub.');

    return releases
      .filter((entry) => entry && !entry.draft)
      .map((entry) => ({
        version: String(entry.tag_name || '').replace(/^v/, ''),
        title: entry.name || entry.tag_name || '',
        date: entry.published_at || entry.created_at || null,
        notes: String(entry.body || '').trim(),
        url: entry.html_url || null
      }));
  });

  handle('app:checkForUpdates', async () => {
    if (!app.isPackaged) {
      return { available: false, note: 'Launcher-Updates gibt es nur im gebauten Build.' };
    }
    const { autoUpdater } = require('electron-updater');
    const result = await autoUpdater.checkForUpdates();
    return {
      available: Boolean(result?.updateInfo && result.updateInfo.version !== app.getVersion()),
      version: result?.updateInfo?.version || null
    };
  });

  handle('app:launcherUpdateState', () => letzterLauncherStand);

  ipcMain.on('app:notify', (_event, payload) => {
    if (!payload || typeof payload.title !== 'string') return;
    melden(payload.title, String(payload.body || ''));
  });

  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:toggleMaximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.close());
}

function setupAutoUpdater() {
  if (!app.isPackaged) return;
  const { autoUpdater } = require('electron-updater');

  autoUpdater.autoDownload = false;

  autoUpdater.on('update-available', (info) =>
    emit('launcher:update', { state: 'available', version: info.version })
  );
  autoUpdater.on('download-progress', (p) =>
    emit('launcher:update', { state: 'downloading', percent: Math.round(p.percent) })
  );
  autoUpdater.on('update-downloaded', (info) =>
    emit('launcher:update', { state: 'ready', version: info.version })
  );
  autoUpdater.on('error', (err) => emit('launcher:update', { state: 'error', error: String(err) }));

  ipcMain.on('launcher:downloadUpdate', () => {
    autoUpdater.downloadUpdate().catch((err) =>
      emit('launcher:update', { state: 'error', error: String(err) })
    );
  });

  ipcMain.on('launcher:installUpdate', () => autoUpdater.quitAndInstall(true, true));

  const suchen = () => autoUpdater.checkForUpdates().catch(() => {});
  suchen();
  setInterval(suchen, 6 * 60 * 60 * 1000);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => fensterZeigen());

  app.whenReady().then(() => {

    app.setAppUserModelId(anwendungsKennung());

    Menu.setApplicationMenu(isDev ? Menu.getApplicationMenu() : null);
    queue = new DownloadQueue(emit);

    wache = new Wache({
      melden: (m) => {
        emit('wache:meldung', m);
        melden(tx('notify.title'), tx(m.key, m.vars));
      },
      katalogFertig: (katalog) => emit('catalog:changed', katalog),
      einreihen: (game) => queue.add(game)
    });

    registerIpc();
    autostartAbgleichen();
    trayAufbauen();
    if (!startVersteckt) createWindow();
    wache.starten();
    setupAutoUpdater();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('before-quit', () => { beendet = true; });

  app.on('window-all-closed', () => {
    if (beendet) return;
    if (getSettings().imHintergrund === false) { beenden(); return; }
    if (!hintergrundGesagt) {
      hintergrundGesagt = true;
      melden(tx('notify.title'), tx('notify.background'));
    }
  });
}
