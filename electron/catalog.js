'use strict';

// Der Katalog ist eine einzige games.json.
// Live liegt sie in deinem GitHub-Repo, z. B.
//   https://raw.githubusercontent.com/DEIN-NAME/claude-launcher-catalog/main/games.json
// Solange keine URL eingetragen ist, läuft der Launcher gegen demo/games.json.

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { fetchText } = require('./download');
const { dataDir, readJson, writeJson, getSettings } = require('./store');

function demoDir() {
  // Im gepackten Build liegt demo/ in app.asar, im Dev-Modus daneben.
  return path.join(app.getAppPath(), 'demo');
}

function cacheFile() {
  return path.join(dataDir(), 'catalog-cache.json');
}

// Windows-Editoren setzen gern eine unsichtbare Markierung an den Dateianfang.
// JSON.parse verschluckt sich daran - und zwar auf den Rechnern der Spieler,
// nicht auf dem eigenen. Deshalb hier grundsaetzlich abschneiden.
function parseJson(text) {
  return JSON.parse(String(text).replace(/^﻿/, ''));
}

function loadDemoCatalog() {
  const file = path.join(demoDir(), 'games.json');
  let raw = fs.readFileSync(file, 'utf8');
  // Die Demo-ZIPs liegen lokal. Der Platzhalter wird zur echten file://-URL.
  const distUrl = new URL(`file:///${path.join(demoDir(), 'dist').replace(/\\/g, '/')}`).toString();
  raw = raw.split('{{DEMO_DIST}}').join(distUrl);
  return parseJson(raw);
}

function normalize(catalog) {
  const games = Array.isArray(catalog?.games) ? catalog.games : [];
  return {
    updatedAt: catalog?.updatedAt || null,
    games: games
      .filter((g) => g && g.id && g.title)
      .map((g) => ({
        id: String(g.id),
        title: String(g.title),
        developer: g.developer || 'Unbekannter Entwickler',
        shortDescription: g.shortDescription || '',
        description: g.description || g.shortDescription || '',
        tags: Array.isArray(g.tags) ? g.tags : [],
        cover: g.cover || null,
        hero: g.hero || g.cover || null,
        screenshots: Array.isArray(g.screenshots) ? g.screenshots : [],
        version: String(g.version || '0.0.0'),
        releaseDate: g.releaseDate || null,
        sizeBytes: Number(g.sizeBytes || 0),
        executable: g.executable || null,
        patchNotes: g.patchNotes || '',
        featured: Boolean(g.featured),
        download: g.download || null
      }))
  };
}

/**
 * Holt den Katalog. Bei Netzproblemen fällt er auf den letzten Cache zurück,
 * damit die Bibliothek auch offline benutzbar bleibt.
 */
async function fetchCatalog() {
  const { manifestUrl } = getSettings();

  if (!manifestUrl) {
    return { source: 'demo', ...normalize(loadDemoCatalog()) };
  }

  try {
    const text = await fetchText(manifestUrl);
    const catalog = normalize(parseJson(text));
    writeJson(cacheFile(), { fetchedAt: Date.now(), catalog });
    return { source: 'remote', ...catalog };
  } catch (err) {
    const cached = readJson(cacheFile(), null);
    if (cached?.catalog) {
      return { source: 'cache', offlineError: err.message, ...cached.catalog };
    }
    throw new Error(`Katalog konnte nicht geladen werden: ${err.message}`);
  }
}

module.exports = { fetchCatalog, demoDir };
