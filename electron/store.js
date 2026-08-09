'use strict';

// Winziger JSON-Store für Einstellungen und Bibliothek.
// Alles liegt unter %APPDATA%/claude-launcher/ und ist von Hand lesbar.

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function dataDir() {
  return app.getPath('userData');
}

function readJson(file, fallback) {
  try {
    // BOM abschneiden - die Dateien sind lesbar und werden auch mal von Hand
    // bearbeitet, und Windows-Editoren haengen die Markierung gern vorne dran.
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

const DEFAULT_SETTINGS = {
  // Leer = Demo-Katalog aus demo/games.json. Trage hier die Roh-URL deiner
  // games.json auf GitHub ein, sobald du live gehst.
  manifestUrl: '',
  installDir: '',
  autoUpdateGames: true,
  closeToTray: false
};

class JsonFile {
  constructor(name, fallback) {
    this.name = name;
    this.fallback = fallback;
    this._cache = null;
  }

  get file() {
    return path.join(dataDir(), this.name);
  }

  read() {
    if (!this._cache) {
      this._cache = { ...this.fallback, ...readJson(this.file, {}) };
    }
    return this._cache;
  }

  write(value) {
    this._cache = value;
    writeJson(this.file, value);
    return value;
  }

  patch(partial) {
    return this.write({ ...this.read(), ...partial });
  }
}

const settingsFile = new JsonFile('settings.json', DEFAULT_SETTINGS);
const libraryFile = new JsonFile('library.json', { games: {} });

function getSettings() {
  const s = settingsFile.read();
  if (!s.installDir) {
    s.installDir = path.join(dataDir(), 'Games');
  }
  return s;
}

function setSettings(partial) {
  settingsFile.patch(partial);
  return getSettings();
}

// Bibliothek: { [gameId]: { id, version, installPath, executable, installedAt,
//                           lastPlayed, playtimeSeconds, sizeBytes } }
function getLibrary() {
  return libraryFile.read().games || {};
}

function getInstalled(gameId) {
  return getLibrary()[gameId] || null;
}

function setInstalled(gameId, entry) {
  const games = { ...getLibrary(), [gameId]: entry };
  libraryFile.write({ games });
  return entry;
}

function removeInstalled(gameId) {
  const games = { ...getLibrary() };
  delete games[gameId];
  libraryFile.write({ games });
}

module.exports = {
  dataDir,
  readJson,
  writeJson,
  getSettings,
  setSettings,
  getLibrary,
  getInstalled,
  setInstalled,
  removeInstalled
};
