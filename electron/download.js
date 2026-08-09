'use strict';

// Datei-Download mit Redirect-Verfolgung, Fortschritt und Abbruch.
// GitHub-Release-Assets leiten auf objects.githubusercontent.com um,
// deshalb ist die Redirect-Behandlung hier Pflicht.

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { pathToFileURL, fileURLToPath } = require('url');

const MAX_REDIRECTS = 6;
const USER_AGENT = 'Ember/0.1 (+https://github.com)';

function request(url, redirectsLeft) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'http:' ? http : https;
    const req = mod.get(
      url,
      { headers: { 'User-Agent': USER_AGENT, Accept: '*/*' } },
      (res) => {
        const status = res.statusCode || 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          if (redirectsLeft <= 0) {
            reject(new Error('Zu viele Weiterleitungen'));
            return;
          }
          const next = new URL(res.headers.location, url).toString();
          resolve(request(next, redirectsLeft - 1));
          return;
        }
        if (status !== 200) {
          res.resume();
          reject(new Error(`HTTP ${status} bei ${parsed.host}${parsed.pathname}`));
          return;
        }
        resolve(res);
      }
    );
    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('Zeitüberschreitung beim Verbinden')));
  });
}

/** Lädt eine URL als Text (für das Katalog-Manifest). */
async function fetchText(url) {
  if (url.startsWith('file://')) {
    return fs.promises.readFile(fileURLToPath(url), 'utf8');
  }
  const res = await request(url, MAX_REDIRECTS);
  const chunks = [];
  for await (const chunk of res) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * Lädt eine Datei auf die Platte.
 * onProgress bekommt { received, total, speedBytesPerSecond }.
 * signal ist ein AbortSignal zum Abbrechen.
 */
async function downloadFile(url, destination, { onProgress, signal } = {}) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });

  // Lokale Dateien einfach kopieren - das lässt den Demo-Katalog ohne Netz laufen.
  if (url.startsWith('file://')) {
    const src = fileURLToPath(url);
    const total = fs.statSync(src).size;
    await fs.promises.copyFile(src, destination);
    if (onProgress) onProgress({ received: total, total, speedBytesPerSecond: 0 });
    return { bytes: total, sha256: await hashFile(destination) };
  }

  const res = await request(url, MAX_REDIRECTS);
  const total = Number(res.headers['content-length'] || 0);
  const out = fs.createWriteStream(destination);
  const hash = crypto.createHash('sha256');

  let received = 0;
  let windowStart = Date.now();
  let windowBytes = 0;
  let speed = 0;

  return new Promise((resolve, reject) => {
    const abort = () => {
      res.destroy();
      out.destroy();
      fs.promises.rm(destination, { force: true }).catch(() => {});
      reject(new Error('ABORTED'));
    };
    if (signal) {
      if (signal.aborted) return abort();
      signal.addEventListener('abort', abort, { once: true });
    }

    res.on('data', (chunk) => {
      received += chunk.length;
      windowBytes += chunk.length;
      hash.update(chunk);
      const elapsed = Date.now() - windowStart;
      if (elapsed >= 400) {
        speed = Math.round((windowBytes / elapsed) * 1000);
        windowStart = Date.now();
        windowBytes = 0;
        if (onProgress) onProgress({ received, total, speedBytesPerSecond: speed });
      }
    });
    res.on('error', reject);
    out.on('error', reject);
    res.pipe(out);
    out.on('finish', () => {
      if (onProgress) onProgress({ received, total: total || received, speedBytesPerSecond: speed });
      resolve({ bytes: received, sha256: hash.digest('hex') });
    });
  });
}

function hashFile(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(file);
    stream.on('data', (c) => hash.update(c));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

module.exports = { fetchText, downloadFile, hashFile, pathToFileURL };
