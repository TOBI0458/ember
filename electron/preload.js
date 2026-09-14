'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

const on = (channel) => (callback) => {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('launcher', {
  catalog: {
    fetch: (force) => invoke('catalog:fetch', force),
    onChanged: on('catalog:changed')
  },
  library: {
    list: () => invoke('library:list'),
    onChanged: on('library:changed')
  },
  games: {
    install: (game) => invoke('game:install', game),
    cancel: (gameId) => invoke('game:cancel', gameId),
    uninstall: (gameId) => invoke('game:uninstall', gameId),
    launch: (gameId) => invoke('game:launch', gameId),
    openFolder: (gameId) => invoke('game:openFolder', gameId),
    setExecutable: (gameId, relativePath) => invoke('game:setExecutable', gameId, relativePath),
    onExited: on('game:exited')
  },
  queue: {
    list: () => invoke('queue:list'),
    dismiss: (gameId) => invoke('queue:dismiss', gameId),
    onChanged: on('queue:changed')
  },
  settings: {
    get: () => invoke('settings:get'),
    set: (partial) => invoke('settings:set', partial)
  },
  app: {
    info: () => invoke('app:info'),
    openDataDir: () => invoke('app:openDataDir'),
    checkForUpdates: () => invoke('app:checkForUpdates'),
    changelog: () => invoke('app:changelog'),
    uninstallerInfo: () => invoke('app:uninstallerInfo'),
    showUninstaller: () => invoke('app:showUninstaller'),
    uninstall: () => invoke('app:uninstall'),
    downloadLauncherUpdate: () => ipcRenderer.send('launcher:downloadUpdate'),
    installLauncherUpdate: () => ipcRenderer.send('launcher:installUpdate'),
    launcherUpdateState: () => invoke('app:launcherUpdateState'),
    onLauncherUpdate: on('launcher:update'),

    notify: (title, body) => ipcRenderer.send('app:notify', { title, body }),
    onWache: on('wache:meldung'),
    openExternal: (url) => invoke('shell:openExternal', url)
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggleMaximize'),
    close: () => ipcRenderer.send('window:close'),
    onState: on('window:state')
  }
});
