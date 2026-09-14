'use strict';

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function dataDir() {
  return app.getPath('userData');
}

function readJson(file, fallback) {
  try {

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

const DEFAULT_CATALOG_URL =
  (() => {
    try {
      return require('../package.json').ember.catalogUrl;
    } catch {
      return 'https://raw.githubusercontent.com/TOBI0458/launcher-katalog/main/games.json';
    }
  })();

const DEFAULT_SETTINGS = {

  manifestUrl: '',
  installDir: '',
  autoUpdateGames: true,

  updateHinweise: true,

  autostart: true,
  imHintergrund: true,

  gesehenSpiele: [],

  language: ''
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

  if (!s.manifestUrl) {
    s.manifestUrl = DEFAULT_CATALOG_URL;
  }
  return s;
}

function setSettings(partial) {
  settingsFile.patch(partial);
  return getSettings();
}

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
