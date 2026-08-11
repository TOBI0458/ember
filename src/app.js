'use strict';

/* =========================================================================
   Oberfläche des Launchers. Reines DOM, kein Framework - der Zustand liegt
   in `state`, jede Änderung ruft render() auf.
   ========================================================================= */

const api = window.launcher;

const state = {
  view: 'store',
  selectedId: null,
  search: '',
  catalog: { games: [], source: null, offlineError: null },
  library: {},
  queue: [],
  settings: {},
  appInfo: {},
  status: 'Katalog wird geladen…',
  launcherUpdate: null
};

const el = {
  content: document.getElementById('content'),
  tabs: document.getElementById('tabs'),
  search: document.getElementById('search'),
  sidebarInstalled: document.getElementById('sidebarInstalled'),
  sidebarCatalog: document.getElementById('sidebarCatalog'),
  installedCount: document.getElementById('installedCount'),
  catalogStatus: document.getElementById('catalogStatus'),
  queueBadge: document.getElementById('queueBadge'),
  toasts: document.getElementById('toasts'),
  updateBar: document.getElementById('updateBar'),
  updateBarText: document.getElementById('updateBarText'),
  updateBarAction: document.getElementById('updateBarAction')
};

/* ------------------------------------------------------------ Hilfsmittel */

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPlaytime(seconds) {
  if (!seconds) return 'Noch nicht gespielt';
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} Min. gespielt`;
  return `${(seconds / 3600).toFixed(1)} Std. gespielt`;
}

/** Aus der Spiel-ID abgeleiteter Farbverlauf - Ersatz für fehlende Cover. */
function hashHue(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

function artStyle(game, imageKey = 'cover') {
  const url = game[imageKey];
  if (url) return `background-image:url("${escapeHtml(url)}")`;
  const hue = hashHue(game.id);
  return (
    `background-image:linear-gradient(150deg,` +
    `hsl(${hue} 62% 34%),hsl(${(hue + 48) % 360} 58% 20%) 55%,hsl(${(hue + 92) % 360} 50% 13%))`
  );
}

function initials(title) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

function compareVersions(a, b) {
  const pa = String(a).split(/[.\-+]/).map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split(/[.\-+]/).map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

function statusOf(game) {
  const installed = state.library[game.id];
  const queued = state.queue.find((q) => q.gameId === game.id);
  if (queued) return queued.state === 'error' ? 'error' : 'busy';
  if (!installed) return 'available';
  if (compareVersions(installed.version, game.version) < 0) return 'update';
  return 'installed';
}

function toast(message, kind = 'info') {
  const node = document.createElement('div');
  node.className = `toast toast--${kind}`;
  node.textContent = message;
  el.toasts.appendChild(node);
  setTimeout(() => node.remove(), kind === 'error' ? 7000 : 4000);
}

/** Jeder IPC-Aufruf liefert { ok, data|error }; Fehler landen als Toast. */
async function call(promise, { silent } = {}) {
  const result = await promise;
  if (!result?.ok) {
    if (!silent) toast(result?.error || 'Unbekannter Fehler', 'error');
    return null;
  }
  return result.data;
}

function gameById(id) {
  return state.catalog.games.find((g) => g.id === id) || null;
}

function filtered() {
  const term = state.search.trim().toLowerCase();
  if (!term) return state.catalog.games;
  return state.catalog.games.filter(
    (g) =>
      g.title.toLowerCase().includes(term) ||
      g.developer.toLowerCase().includes(term) ||
      g.tags.some((t) => t.toLowerCase().includes(term))
  );
}

/* ------------------------------------------------------------- Datenfluss */

async function loadCatalog({ notify } = {}) {
  el.catalogStatus.textContent = 'Katalog wird geladen…';
  const data = await call(api.catalog.fetch(), { silent: true });
  if (!data) {
    state.status = 'Katalog nicht erreichbar.';
    el.catalogStatus.textContent = state.status;
    if (notify) toast('Katalog konnte nicht geladen werden.', 'error');
    render();
    return;
  }
  state.catalog = data;
  const count = data.games.length;
  const labels = {
    demo: 'Demo-Katalog (Beispielspiele)',
    remote: count ? `${count} Spiele · aktuell` : 'Noch keine Spiele veröffentlicht',
    cache: 'Offline — letzter bekannter Stand'
  };
  state.status = labels[data.source] || `${count} Spiele`;
  el.catalogStatus.textContent = state.status;
  if (notify) toast('Katalog aktualisiert.', 'success');
  render();
}

async function loadLibrary() {
  state.library = (await call(api.library.list(), { silent: true })) || {};
  render();
}

async function loadQueue() {
  state.queue = (await call(api.queue.list(), { silent: true })) || [];
  render();
}

/* ------------------------------------------------------------- Aktionen */

async function install(game) {
  await call(api.games.install(game));
  toast(`"${game.title}" wurde zur Warteschlange hinzugefügt.`, 'success');
}

async function launch(gameId) {
  const result = await call(api.games.launch(gameId));
  if (result) toast('Spiel wird gestartet…', 'success');
}

async function uninstall(gameId) {
  const entry = state.library[gameId];
  if (!entry) return;
  const done = await call(api.games.uninstall(gameId));
  if (done) toast(`"${entry.title}" wurde deinstalliert.`);
}

/* --------------------------------------------------------------- Ansichten */

function renderSidebar() {
  const installedGames = Object.values(state.library).sort((a, b) =>
    (b.lastPlayed || 0) - (a.lastPlayed || 0) || a.title.localeCompare(b.title)
  );

  el.installedCount.textContent = installedGames.length;

  el.sidebarInstalled.innerHTML = installedGames.length
    ? installedGames
        .map((entry) => {
          const game = gameById(entry.id) || { ...entry, cover: null };
          const hasUpdate = gameById(entry.id) && statusOf(gameById(entry.id)) === 'update';
          return `
            <li class="game-list__item ${state.selectedId === entry.id ? 'is-active' : ''}"
                data-open="${escapeHtml(entry.id)}">
              <span class="game-list__thumb" style="${artStyle(game)}">${
                game.cover ? '' : escapeHtml(initials(entry.title))
              }</span>
              <span class="game-list__name">${escapeHtml(entry.title)}</span>
              <span class="game-list__dot game-list__dot--${hasUpdate ? 'update' : 'installed'}"></span>
            </li>`;
        })
        .join('')
    : '<li class="sidebar__status" style="padding:4px 10px">Noch nichts installiert.</li>';

  el.sidebarCatalog.innerHTML = filtered()
    .map(
      (game) => `
        <li class="game-list__item ${state.selectedId === game.id ? 'is-active' : ''}"
            data-open="${escapeHtml(game.id)}">
          <span class="game-list__thumb" style="${artStyle(game)}">${
            game.cover ? '' : escapeHtml(initials(game.title))
          }</span>
          <span class="game-list__name">${escapeHtml(game.title)}</span>
        </li>`
    )
    .join('');

  const active = state.queue.length;
  el.queueBadge.hidden = active === 0;
  el.queueBadge.textContent = active;
}

function cardHtml(game) {
  const status = statusOf(game);
  const flag =
    status === 'update'
      ? '<span class="card__flag card__flag--update">Update</span>'
      : status === 'installed'
        ? '<span class="card__flag card__flag--installed">Installiert</span>'
        : '';
  return `
    <article class="card" data-open="${escapeHtml(game.id)}">
      <div class="card__art" style="${artStyle(game)}">
        ${flag}
        ${game.cover ? '' : `<span class="card__initials">${escapeHtml(initials(game.title))}</span>`}
      </div>
      <div class="card__body">
        <div class="card__title">${escapeHtml(game.title)}</div>
        <div class="card__meta">
          <span>${escapeHtml(game.developer)}</span>
          <span>v${escapeHtml(game.version)}</span>
        </div>
      </div>
    </article>`;
}

function renderStore() {
  const games = filtered();
  if (!games.length) {
    // Ein leerer Store ist der Normalfall am Anfang, kein Fehler. Deshalb hier
    // kein Hinweis auf Einstellungen - da muss niemand etwas reparieren.
    const message = state.search
      ? 'Andere Suche versuchen.'
      : state.catalog.source === 'cache'
        ? 'Gerade keine Verbindung. Der Store füllt sich, sobald du wieder online bist.'
        : 'Noch nichts veröffentlicht. Neue Spiele erscheinen hier von allein.';
    return `
      <div class="page">
        <div class="empty">
          <div>
            <div class="empty__title">${state.search ? 'Keine Spiele gefunden' : 'Der Store ist noch leer'}</div>
            <div>${message}</div>
          </div>
        </div>
      </div>`;
  }

  const featured = games.find((g) => g.featured) || games[0];
  const rest = games.filter((g) => g.id !== featured.id);
  const updates = games.filter((g) => statusOf(g) === 'update');

  return `
    <div class="page">
      <section class="hero" style="${artStyle(featured, 'hero')}" data-open="${escapeHtml(featured.id)}">
        <div class="hero__body">
          <div class="hero__eyebrow">${featured.featured ? 'Im Rampenlicht' : 'Neu im Store'}</div>
          <h1 class="hero__title">${escapeHtml(featured.title)}</h1>
          <p class="hero__text">${escapeHtml(featured.shortDescription || featured.description).slice(0, 190)}</p>
          <div class="hero__actions">
            <button class="btn btn--primary btn--lg" data-open="${escapeHtml(featured.id)}">Ansehen</button>
          </div>
        </div>
      </section>

      ${
        updates.length
          ? `<h2 class="section-title">Updates verfügbar (${updates.length})</h2>
             <div class="grid">${updates.map(cardHtml).join('')}</div>`
          : ''
      }

      <h2 class="section-title">Alle Spiele</h2>
      <div class="grid">${rest.map(cardHtml).join('')}</div>
    </div>`;
}

function renderLibrary() {
  const entries = Object.values(state.library);
  if (!entries.length) {
    return `
      <div class="page">
        <div class="page__head">
          <div><h1 class="page__title">Bibliothek</h1></div>
        </div>
        <div class="empty">
          <div>
            <div class="empty__title">Deine Bibliothek ist leer</div>
            <div>Installiere ein Spiel im Store, dann taucht es hier auf.</div>
          </div>
        </div>
      </div>`;
  }

  const cards = entries
    .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))
    .map((entry) => {
      const game = gameById(entry.id) || { id: entry.id, title: entry.title, cover: null };
      const hasUpdate = gameById(entry.id) ? statusOf(gameById(entry.id)) === 'update' : false;
      return `
        <article class="card" data-open="${escapeHtml(entry.id)}">
          <div class="card__art" style="${artStyle(game)}">
            ${hasUpdate ? '<span class="card__flag card__flag--update">Update</span>' : ''}
            ${game.cover ? '' : `<span class="card__initials">${escapeHtml(initials(entry.title))}</span>`}
          </div>
          <div class="card__body">
            <div class="card__title">${escapeHtml(entry.title)}</div>
            <div class="card__meta">
              <span>${escapeHtml(formatPlaytime(entry.playtimeSeconds))}</span>
              <span>v${escapeHtml(entry.version)}</span>
            </div>
          </div>
        </article>`;
    })
    .join('');

  return `
    <div class="page">
      <div class="page__head">
        <div>
          <h1 class="page__title">Bibliothek</h1>
          <p class="page__subtitle">${entries.length} Spiel${entries.length === 1 ? '' : 'e'} installiert · ${formatBytes(
            entries.reduce((sum, e) => sum + (e.sizeBytes || 0), 0)
          )} belegt</p>
        </div>
      </div>
      <div class="grid">${cards}</div>
    </div>`;
}

function renderDetail() {
  const game = gameById(state.selectedId);
  const entry = state.library[state.selectedId];

  if (!game && !entry) {
    return `<div class="page"><div class="empty"><div class="empty__title">Spiel nicht gefunden</div></div></div>`;
  }

  // Ist ein installiertes Spiel aus dem Katalog verschwunden, zeigen wir die
  // lokal gespeicherten Daten - sonst wäre es aus der Bibliothek nicht erreichbar.
  const view = game || {
    id: entry.id,
    title: entry.title,
    developer: 'Lokal installiert',
    description: 'Dieses Spiel ist nicht mehr im Katalog enthalten.',
    tags: [],
    cover: null,
    hero: null,
    screenshots: [],
    version: entry.version,
    sizeBytes: entry.sizeBytes,
    releaseDate: null,
    patchNotes: ''
  };

  const status = game ? statusOf(game) : 'installed';
  const queued = state.queue.find((q) => q.gameId === view.id);

  let action = '';
  if (queued) {
    action = `<button class="btn btn--lg" disabled>${
      queued.state === 'error' ? 'Fehlgeschlagen' : `${queued.percent || 0} % …`
    }</button>
      <button class="btn btn--ghost" data-cancel="${escapeHtml(view.id)}">Abbrechen</button>`;
  } else if (status === 'update') {
    action = `<button class="btn btn--update btn--lg" data-install="${escapeHtml(view.id)}">Aktualisieren</button>
      <button class="btn btn--play" data-launch="${escapeHtml(view.id)}">Trotzdem spielen</button>`;
  } else if (status === 'installed') {
    action = `<button class="btn btn--play btn--lg" data-launch="${escapeHtml(view.id)}">Spielen</button>`;
  } else {
    action = `<button class="btn btn--primary btn--lg" data-install="${escapeHtml(view.id)}">Installieren</button>`;
  }

  const secondary = entry
    ? `<button class="btn btn--ghost" data-folder="${escapeHtml(view.id)}">Ordner öffnen</button>
       <button class="btn btn--ghost btn--danger" data-uninstall="${escapeHtml(view.id)}">Deinstallieren</button>`
    : '';

  const paragraphs = String(view.description)
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
    .join('');

  return `
    <section class="detail__hero" style="${artStyle(view, 'hero')}">
      <button class="detail__back" data-back>← Zurück</button>
      <div class="detail__headline">
        <div class="detail__cover" style="${artStyle(view)}">${
          view.cover ? '' : escapeHtml(initials(view.title))
        }</div>
        <div class="detail__headtext">
          <h1 class="detail__title">${escapeHtml(view.title)}</h1>
          <div class="detail__dev">${escapeHtml(view.developer)}</div>
          <div class="tag-row">
            ${view.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
          </div>
        </div>
      </div>
    </section>

    <div class="detail__bar">
      ${action}
      <div class="detail__bar-spacer"></div>
      ${secondary}
    </div>

    <div class="detail__body">
      <div>
        <div class="prose">${paragraphs}</div>
        ${
          view.screenshots.length
            ? `<h2 class="section-title">Eindrücke</h2>
               <div class="shots">${view.screenshots
                 .map((s) => `<div class="shot" style="background-image:url('${escapeHtml(s)}')"></div>`)
                 .join('')}</div>`
            : ''
        }
        ${
          view.patchNotes
            ? `<div class="notes">
                 <div class="notes__title">Was ist neu in v${escapeHtml(view.version)}</div>
                 <div class="prose">${escapeHtml(view.patchNotes).replace(/\n/g, '<br>')}</div>
               </div>`
            : ''
        }
      </div>

      <aside class="facts">
        <div class="fact"><span class="fact__key">Neueste Version</span><span class="fact__value">v${escapeHtml(
          view.version
        )}</span></div>
        ${
          entry
            ? `<div class="fact"><span class="fact__key">Installiert</span><span class="fact__value">v${escapeHtml(
                entry.version
              )}</span></div>
               <div class="fact"><span class="fact__key">Größe auf Platte</span><span class="fact__value">${formatBytes(
                 entry.sizeBytes
               )}</span></div>
               <div class="fact"><span class="fact__key">Startdatei</span><span class="fact__value">${escapeHtml(
                 entry.executable || 'nicht gesetzt'
               )}</span></div>
               <div class="fact"><span class="fact__key">Spielzeit</span><span class="fact__value">${escapeHtml(
                 formatPlaytime(entry.playtimeSeconds)
               )}</span></div>
               <div class="fact"><span class="fact__key">Zuletzt gespielt</span><span class="fact__value">${formatDate(
                 entry.lastPlayed
               )}</span></div>`
            : `<div class="fact"><span class="fact__key">Downloadgröße</span><span class="fact__value">${formatBytes(
                view.sizeBytes
              )}</span></div>`
        }
        <div class="fact"><span class="fact__key">Veröffentlicht</span><span class="fact__value">${formatDate(
          view.releaseDate
        )}</span></div>
      </aside>
    </div>`;
}

function renderDownloads() {
  if (!state.queue.length) {
    return `
      <div class="page">
        <div class="page__head"><div><h1 class="page__title">Downloads</h1></div></div>
        <div class="empty">
          <div>
            <div class="empty__title">Nichts in der Warteschlange</div>
            <div>Installationen und Updates erscheinen hier mit Fortschritt.</div>
          </div>
        </div>
      </div>`;
  }

  const stages = {
    queued: 'Wartet',
    downloading: 'Lädt herunter',
    extracting: 'Entpackt',
    installing: 'Installiert',
    done: 'Fertig',
    error: 'Fehlgeschlagen'
  };

  const rows = state.queue
    .map((item) => {
      const game = gameById(item.gameId) || { id: item.gameId, title: item.title, cover: null };
      const isError = item.state === 'error';
      const indeterminate = item.stage === 'extracting' || item.stage === 'installing';
      const sub = isError
        ? escapeHtml(item.error)
        : [
            stages[item.stage] || 'Vorbereitung',
            item.total ? `${formatBytes(item.received || 0)} / ${formatBytes(item.total)}` : '',
            item.speedBytesPerSecond ? `${formatBytes(item.speedBytesPerSecond)}/s` : ''
          ]
            .filter(Boolean)
            .map(escapeHtml)
            .join(' · ');

      return `
        <div class="dl">
          <div class="dl__art" style="${artStyle(game)}">${
            game.cover ? '' : escapeHtml(initials(item.title))
          }</div>
          <div class="dl__main">
            <div class="dl__title">${escapeHtml(item.title)} <span style="color:var(--text-faint);font-weight:400">v${escapeHtml(
              item.version
            )}</span></div>
            <div class="dl__sub">${sub}</div>
            <div class="bar ${indeterminate && !isError ? 'bar--indeterminate' : ''}">
              <div class="bar__fill ${isError ? 'bar__fill--error' : ''}" style="width:${
                isError ? 100 : item.percent || 0
              }%"></div>
            </div>
          </div>
          ${
            isError
              ? `<button class="btn btn--ghost btn--sm" data-dismiss="${escapeHtml(item.gameId)}">Entfernen</button>`
              : `<button class="btn btn--ghost btn--sm" data-cancel="${escapeHtml(item.gameId)}">Abbrechen</button>`
          }
        </div>`;
    })
    .join('');

  return `
    <div class="page">
      <div class="page__head">
        <div>
          <h1 class="page__title">Downloads</h1>
          <p class="page__subtitle">Ein Download nach dem anderen — das hält die Leitung frei.</p>
        </div>
      </div>
      ${rows}
    </div>`;
}

function renderSettings() {
  const s = state.settings;
  return `
    <div class="page">
      <div class="page__head">
        <div>
          <h1 class="page__title">Einstellungen</h1>
          <p class="page__subtitle">Launcher v${escapeHtml(state.appInfo.version || '?')} · ${escapeHtml(
            state.appInfo.platform || ''
          )}</p>
        </div>
      </div>

      <div class="callout">
        <strong>Alles aktualisiert sich von selbst.</strong> Neue Spiele erscheinen im Store,
        sobald sie veröffentlicht sind, und der Launcher zieht sich seine eigenen Updates im
        Hintergrund. Du musst hier nichts einstellen und nie wieder etwas herunterladen.
      </div>

      <div class="form-row">
        <label for="manifestUrl">Katalog-URL (games.json)</label>
        <div class="input-group">
          <input class="input" id="manifestUrl" type="text" spellcheck="false"
                 placeholder="https://raw.githubusercontent.com/DEIN-NAME/REPO/main/games.json"
                 value="${escapeHtml(s.manifestUrl || '')}" />
          <button class="btn" id="btnSaveManifest">Speichern</button>
        </div>
        <div class="hint">Steht schon richtig drin. Feld leeren und speichern setzt sie
          zurück. Aktueller Stand: ${escapeHtml(state.status)}</div>
      </div>

      <div class="form-row">
        <label>Installationsordner</label>
        <div class="input-group">
          <input class="input" id="installDir" type="text" readonly value="${escapeHtml(s.installDir || '')}" />
          <button class="btn" id="btnPickDir">Ändern</button>
        </div>
        <div class="hint">Bereits installierte Spiele bleiben, wo sie sind.</div>
      </div>

      <div class="form-row">
        <label class="switch">
          <input type="checkbox" id="autoUpdateGames" ${s.autoUpdateGames ? 'checked' : ''} />
          <span>Spiel-Updates beim Start automatisch herunterladen</span>
        </label>
        <div class="hint">Aus heißt: Updates werden nur angezeigt, gestartet werden sie von dir.</div>
      </div>

      <h2 class="section-title">Launcher</h2>
      <div class="form-row">
        <div class="input-group">
          <button class="btn" id="btnCheckLauncher">Nach Launcher-Update suchen</button>
          <button class="btn btn--ghost" id="btnOpenData">Datenordner öffnen</button>
        </div>
        <div class="hint">Datenordner: ${escapeHtml(state.appInfo.dataDir || '')}</div>
      </div>
    </div>`;
}

function render() {
  renderSidebar();

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.view === state.view);
  });

  const views = {
    store: renderStore,
    library: renderLibrary,
    downloads: renderDownloads,
    settings: renderSettings,
    detail: renderDetail
  };
  el.content.innerHTML = (views[state.view] || renderStore)();

  if (state.view === 'settings') wireSettings();
}

function navigate(view, gameId = null) {
  state.view = view;
  state.selectedId = gameId;
  el.content.scrollTop = 0;
  render();
}

/* ---------------------------------------------------------- Ereignisse */

function wireSettings() {
  document.getElementById('btnSaveManifest').addEventListener('click', async () => {
    const url = document.getElementById('manifestUrl').value.trim();
    if (url && !/^https?:\/\//.test(url)) {
      toast('Die URL muss mit http:// oder https:// beginnen.', 'error');
      return;
    }
    state.settings = (await call(api.settings.set({ manifestUrl: url }))) || state.settings;
    await loadCatalog({ notify: true });
  });

  document.getElementById('btnPickDir').addEventListener('click', async () => {
    const updated = await call(api.settings.pickInstallDir());
    if (updated) {
      state.settings = updated;
      render();
    }
  });

  document.getElementById('autoUpdateGames').addEventListener('change', async (event) => {
    state.settings = (await call(api.settings.set({ autoUpdateGames: event.target.checked }))) || state.settings;
  });

  document.getElementById('btnCheckLauncher').addEventListener('click', async () => {
    const result = await call(api.app.checkForUpdates());
    if (!result) return;
    if (result.note) toast(result.note);
    else if (result.available) toast(`Launcher-Update v${result.version} gefunden.`, 'success');
    else toast('Der Launcher ist auf dem neuesten Stand.', 'success');
  });

  document.getElementById('btnOpenData').addEventListener('click', () => {
    call(api.app.openDataDir());
  });
}

document.addEventListener('click', async (event) => {
  const target = event.target.closest('[data-open],[data-install],[data-launch],[data-uninstall],[data-folder],[data-cancel],[data-dismiss],[data-back]');
  if (!target) return;

  if (target.dataset.back !== undefined) {
    navigate(state.library[state.selectedId] ? 'library' : 'store');
    return;
  }
  if (target.dataset.install) {
    const game = gameById(target.dataset.install);
    if (game) await install(game);
    return;
  }
  if (target.dataset.launch) {
    await launch(target.dataset.launch);
    return;
  }
  if (target.dataset.uninstall) {
    await uninstall(target.dataset.uninstall);
    return;
  }
  if (target.dataset.folder) {
    await call(api.games.openFolder(target.dataset.folder));
    return;
  }
  if (target.dataset.cancel) {
    await call(api.games.cancel(target.dataset.cancel));
    return;
  }
  if (target.dataset.dismiss) {
    await call(api.queue.dismiss(target.dataset.dismiss));
    return;
  }
  if (target.dataset.open) {
    navigate('detail', target.dataset.open);
  }
});

el.tabs.addEventListener('click', (event) => {
  const tab = event.target.closest('.tab');
  if (tab) navigate(tab.dataset.view);
});

el.search.addEventListener('input', (event) => {
  state.search = event.target.value;
  if (state.view === 'detail') state.view = 'store';
  render();
});

document.getElementById('btnRefresh').addEventListener('click', () => loadCatalog({ notify: true }));
document.getElementById('btnMinimize').addEventListener('click', () => api.window.minimize());
document.getElementById('btnMaximize').addEventListener('click', () => api.window.toggleMaximize());
document.getElementById('btnClose').addEventListener('click', () => api.window.close());

/* ------------------------------------------------------ Push aus dem Main */

api.queue.onChanged((queue) => {
  state.queue = queue;
  render();
});

api.library.onChanged(async () => {
  await loadLibrary();
});

api.games.onExited((info) => {
  if (info.error) toast(`Start fehlgeschlagen: ${info.error}`, 'error');
});

api.app.onLauncherUpdate((info) => {
  state.launcherUpdate = info;
  if (info.state === 'ready') {
    el.updateBar.hidden = false;
    el.updateBarText.textContent = `Launcher-Update v${info.version} ist bereit.`;
  } else if (info.state === 'downloading') {
    el.updateBar.hidden = false;
    el.updateBarText.textContent = `Launcher-Update wird geladen… ${info.percent} %`;
  }
});

el.updateBarAction.addEventListener('click', () => api.app.installLauncherUpdate());

/* ------------------------------------------------------------------ Start */

// Automatische Spiel-Updates: still im Hintergrund einreihen. Die Warteschlange
// kennt jede Kennung nur einmal, doppeltes Einreihen kann also nichts anrichten.
async function queuePendingUpdates() {
  if (!state.settings.autoUpdateGames) return;
  const pending = state.catalog.games.filter((g) => statusOf(g) === 'update');
  for (const game of pending) {
    await call(api.games.install(game), { silent: true });
  }
  if (pending.length) {
    toast(`${pending.length} Update${pending.length === 1 ? '' : 's'} werden geladen.`, 'success');
  }
}

async function boot() {
  state.settings = (await call(api.settings.get(), { silent: true })) || {};
  state.appInfo = (await call(api.app.info(), { silent: true })) || {};
  await loadLibrary();
  await loadQueue();
  await loadCatalog();
  await queuePendingUpdates();

  // Wer den Launcher offen liegen laesst, soll ein neues Spiel trotzdem sehen,
  // ohne ihn neu zu starten. Alle fuenfzehn Minuten ein Blick genuegt dafuer.
  setInterval(async () => {
    await loadCatalog();
    await queuePendingUpdates();
  }, 15 * 60 * 1000);
}

boot();
