'use strict';

const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');

const { fetchCatalog } = require('./catalog');
const { getSettings, setSettings, getLibrary, getInstalled, setInstalled } = require('./store');
const installer = require('./installer');
const { DownloadQueue } = require('./queue');

let mainWindow = null;
let queue = null;

const isDev = !app.isPackaged;

function emit(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
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

  // Zum Nachschauen bei Problemen: LAUNCHER_DEVTOOLS=1 npm start
  if (process.env.LAUNCHER_DEVTOOLS) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
  mainWindow.webContents.on('console-message', (_e, level, message) => {
    if (level >= 2) console.error('[Oberfläche]', message);
  });

  // Externe Links gehören in den Systembrowser, nicht in den Launcher.
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

/* ------------------------------------------------------------------ IPC */

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
  handle('catalog:fetch', () => fetchCatalog());

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
    const full = path.join(entry.installPath, relativePath);
    if (!full.startsWith(entry.installPath) || !fs.existsSync(full)) {
      throw new Error('Datei liegt nicht im Installationsordner.');
    }
    const updated = setInstalled(gameId, { ...entry, executable: relativePath });
    emit('library:changed', { gameId, entry: updated });
    return updated;
  });

  handle('settings:get', () => getSettings());
  handle('settings:set', (partial) => setSettings(partial));

  handle('settings:pickInstallDir', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Installationsordner wählen',
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || !result.filePaths[0]) return getSettings();
    return setSettings({ installDir: result.filePaths[0] });
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
    dataDir: app.getPath('userData')
  }));

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

  // Fensterknöpfe der eigenen Titelleiste
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:toggleMaximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.close());
}

/* -------------------------------------------------- Launcher-Selbstupdate */

function setupAutoUpdater() {
  if (!app.isPackaged) return;
  const { autoUpdater } = require('electron-updater');
  autoUpdater.autoDownload = true;
  autoUpdater.on('update-available', (info) => emit('launcher:update', { state: 'available', ...info }));
  autoUpdater.on('download-progress', (p) =>
    emit('launcher:update', { state: 'downloading', percent: Math.round(p.percent) })
  );
  autoUpdater.on('update-downloaded', (info) =>
    emit('launcher:update', { state: 'ready', version: info.version })
  );
  autoUpdater.on('error', (err) => emit('launcher:update', { state: 'error', error: String(err) }));
  ipcMain.on('launcher:installUpdate', () => autoUpdater.quitAndInstall());
  autoUpdater.checkForUpdates().catch(() => {});
}

/* ------------------------------------------------------------------ Boot */

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(isDev ? Menu.getApplicationMenu() : null);
    queue = new DownloadQueue(emit);
    registerIpc();
    createWindow();
    setupAutoUpdater();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
