'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { pathToFileURL, fileURLToPath } = require('url');

const MAX_REDIRECTS = 6;
const USER_AGENT = (() => {
  try {
    return 'Ember/' + require('../package.json').version + ' (+https://github.com)';
  } catch {
    return 'Ember (+https://github.com)';
  }
})();

function request(url, redirectsLeft, from = 0) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'http:' ? http : https;
    const headers = { 'User-Agent': USER_AGENT, Accept: '*/*' };

    if (from > 0) headers.Range = `bytes=${from}-`;

    const req = mod.get(url, { headers }, (res) => {
      const status = res.statusCode || 0;
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume();
        if (redirectsLeft <= 0) {
          reject(new Error('Zu viele Weiterleitungen'));
          return;
        }
        const next = new URL(res.headers.location, url).toString();
        resolve(request(next, redirectsLeft - 1, from));
        return;
      }
      if (status !== 200 && status !== 206) {
        res.resume();

        reject(new Error(status === 416 ? 'RANGE_INVALID' : `HTTP ${status} bei ${parsed.host}${parsed.pathname}`));
        return;
      }
      resolve(res);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('Zeitüberschreitung beim Verbinden')));
  });
}

async function fetchText(url) {
  if (url.startsWith('file://')) {
    return fs.promises.readFile(fileURLToPath(url), 'utf8');
  }
  const res = await request(url, MAX_REDIRECTS);
  const chunks = [];
  for await (const chunk of res) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function bytesOnDisk(file) {
  try {
    const size = fs.statSync(file).size;
    return Number.isFinite(size) && size > 0 ? size : 0;
  } catch {
    return 0;
  }
}

async function downloadFile(url, destination, { onProgress, signal, resume = false } = {}) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });

  if (url.startsWith('file://')) {
    const src = fileURLToPath(url);
    const total = fs.statSync(src).size;
    await fs.promises.copyFile(src, destination);
    if (onProgress) onProgress({ received: total, total, speedBytesPerSecond: 0 });
    return { bytes: total, sha256: await hashFile(destination) };
  }

  let from = resume ? bytesOnDisk(destination) : 0;
  if (!resume) await fs.promises.rm(destination, { force: true }).catch(() => {});

  let res;
  try {
    res = await request(url, MAX_REDIRECTS, from);
  } catch (err) {
    if (err.message !== 'RANGE_INVALID') throw err;

    await fs.promises.rm(destination, { force: true }).catch(() => {});
    from = 0;
    res = await request(url, MAX_REDIRECTS, 0);
  }

  const resuming = from > 0 && res.statusCode === 206;
  if (!resuming) from = 0;

  const hash = crypto.createHash('sha256');
  if (resuming) await feedHash(hash, destination, from);

  const remaining = Number(res.headers['content-length'] || 0);
  const total = remaining ? from + remaining : 0;
  const out = fs.createWriteStream(destination, resuming ? { flags: 'a' } : { flags: 'w' });

  let received = from;
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

function feedHash(hash, file, count) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(file, { start: 0, end: count - 1 });
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
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
