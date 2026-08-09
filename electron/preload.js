'use strict';

// Die einzige Brücke zwischen Oberfläche und Node. Alles läuft über
// benannte Kanäle - der Renderer bekommt keinen direkten Dateisystemzugriff.

const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

const on = (channel) => (callback) => {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('launcher', {
  catalog: {
    fetch: () => invoke('catalog:fetch')
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
    set: (partial) => invoke('settings:set', partial),
    pickInstallDir: () => invoke('settings:pickInstallDir')
  },
  app: {
    info: () => invoke('app:info'),
    openDataDir: () => invoke('app:openDataDir'),
    checkForUpdates: () => invoke('app:checkForUpdates'),
    installLauncherUpdate: () => ipcRenderer.send('launcher:installUpdate'),
    onLauncherUpdate: on('launcher:update'),
    openExternal: (url) => invoke('shell:openExternal', url)
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggleMaximize'),
    close: () => ipcRenderer.send('window:close'),
    onState: on('window:state')
  }
});
