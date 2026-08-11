'use strict';

// Winziger JSON-Store für Einstellungen und Bibliothek.
// Alles liegt unter %APPDATA%/Ember/ und ist von Hand lesbar.

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

// Wohin der Launcher schaut, wenn niemand etwas umgestellt hat. Der Wert steht
// in der package.json, damit Launcher und Veroeffentlichungs-Skripte dieselbe
// Adresse benutzen. Wichtig: Wer den Launcher geschickt bekommt, soll die
// Spiele sofort sehen - ohne in den Einstellungen irgendetwas einzutragen.
const DEFAULT_CATALOG_URL =
  (() => {
    try {
      return require('../package.json').ember.catalogUrl;
    } catch {
      return 'https://raw.githubusercontent.com/TOBI0458/launcher-katalog/main/games.json';
    }
  })();

const DEFAULT_SETTINGS = {
  // Leer = eingebauter Katalog (siehe oben). "demo" = mitgelieferte Beispiele.
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
  // Ein leeres Feld heisst "Standard", nicht "kein Katalog". Sonst stuende bei
  // allen, die den Launcher vor dieser Aenderung installiert haben, weiter die
  // alte leere Einstellung in der settings.json - und ihr Store bliebe leer.
  if (!s.manifestUrl) {
    s.manifestUrl = DEFAULT_CATALOG_URL;
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
  DEFAULT_CATALOG_URL,
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
