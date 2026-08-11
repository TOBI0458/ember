'use strict';

/* =========================================================================
   Oberfläche des Launchers. Reines DOM, kein Framework - der Zustand liegt
   in `state`, jede Änderung ruft render() auf.

   Sichtbare Texte stehen nicht hier, sondern in i18n.js und kommen über
   t("schluessel"). Wer eine Sprache umstellt, löst nur ein render() aus -
   deshalb wechselt die Oberfläche ohne Neustart.
   ========================================================================= */

const api = window.launcher;
const { t, locale, languageInfo, resolveLanguage, setLanguage, LANGUAGES } = window.i18n;

const state = {
  view: 'store',
  selectedId: null,
  search: '',
  catalog: { games: [], source: null, offlineError: null },
  library: {},
  queue: [],
  settings: {},
  appInfo: {},
  uninstaller: { available: false, path: null },
  // Als Schlüssel gemerkt statt als fertiger Satz, sonst bliebe die Zeile
  // nach einem Sprachwechsel in der alten Sprache stehen.
  status: { key: 'catalog.loading' },
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

function number(value, digits) {
  return value.toLocaleString(locale(), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
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
  return `${number(value, value < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(locale(), { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPlaytime(seconds) {
  if (!seconds) return t('playtime.never');
  if (seconds < 3600) return t('playtime.minutes', { n: Math.max(1, Math.round(seconds / 60)) });
  return t('playtime.hours', { n: number(seconds / 3600, 1) });
}

function statusText() {
  return t(state.status.key, state.status.vars);
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
  setTimeout(() => {
    node.classList.add('is-leaving');
    setTimeout(() => node.remove(), 200);
  }, kind === 'error' ? 7000 : 4000);
}

/** Jeder IPC-Aufruf liefert { ok, data|error }; Fehler landen als Toast. */
async function call(promise, { silent } = {}) {
  const result = await promise;
  if (!result?.ok) {
    if (!silent) toast(result?.error || t('common.unknownError'), 'error');
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
      g.tags.some((tag) => tag.toLowerCase().includes(term))
  );
}

/* ------------------------------------------------------------------ Sprache */

/** Setzt die Sprache und schreibt alle festen Texte im HTML neu. */
function applyLanguage() {
  const code = resolveLanguage(state.settings.language, state.appInfo.systemLocale);
  setLanguage(code);
  document.documentElement.lang = code;

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach((node) => {
    const text = t(node.dataset.i18nTitle);
    node.title = text;
    node.setAttribute('aria-label', text);
  });
}

/* ------------------------------------------------------------- Rückfrage */

const modal = {
  root: document.getElementById('modal'),
  title: document.getElementById('modalTitle'),
  text: document.getElementById('modalText'),
  ok: document.getElementById('modalOk'),
  cancel: document.getElementById('modalCancel'),
  backdrop: document.getElementById('modalBackdrop'),
  resolve: null
};

/** Zeigt die Rückfrage und wartet auf die Antwort: true = fortfahren. */
function confirmAction({ title, text, okLabel }) {
  modal.title.textContent = title;
  modal.text.textContent = text;
  modal.ok.textContent = okLabel;
  modal.cancel.textContent = t('common.cancel');
  modal.root.hidden = false;
  modal.ok.focus();
  return new Promise((resolve) => {
    modal.resolve = resolve;
  });
}

function closeModal(answer) {
  if (!modal.resolve) return;
  const resolve = modal.resolve;
  modal.resolve = null;
  modal.root.hidden = true;
  resolve(answer);
}

modal.ok.addEventListener('click', () => closeModal(true));
modal.cancel.addEventListener('click', () => closeModal(false));
modal.backdrop.addEventListener('click', () => closeModal(false));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeModal(false);
});

/* ------------------------------------------------------------- Datenfluss */

async function loadCatalog({ notify } = {}) {
  const data = await call(api.catalog.fetch(), { silent: true });
  if (!data) {
    state.status = { key: 'catalog.unreachable' };
    if (notify) toast(t('catalog.failed'), 'error');
    render();
    return;
  }
  state.catalog = data;
  const count = data.games.length;
  if (data.source === 'demo') {
    state.status = { key: 'catalog.demo' };
  } else if (data.source === 'cache') {
    state.status = { key: 'catalog.offline' };
  } else if (!count) {
    state.status = { key: 'catalog.empty' };
  } else {
    state.status = { key: 'catalog.count', vars: { n: count } };
  }
  if (notify) toast(t('catalog.refreshed'), 'success');
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
  toast(t('toast.queued', { title: game.title }), 'success');
}

async function launch(gameId) {
  const result = await call(api.games.launch(gameId));
  if (result) toast(t('toast.launching'), 'success');
}

async function uninstall(gameId) {
  const entry = state.library[gameId];
  if (!entry) return;
  const sure = await confirmAction({
    title: t('confirm.uninstallGameTitle', { title: entry.title }),
    text: t('confirm.uninstallGameText'),
    okLabel: t('confirm.uninstallGameOk')
  });
  if (!sure) return;
  const done = await call(api.games.uninstall(gameId));
  if (done) toast(t('toast.uninstalled', { title: entry.title }));
}

async function uninstallLauncher() {
  const sure = await confirmAction({
    title: t('confirm.uninstallLauncherTitle'),
    text: t('confirm.uninstallLauncherText'),
    okLabel: t('confirm.uninstallLauncherOk')
  });
  if (!sure) return;
  const result = await api.app.uninstall();
  if (!result?.ok) {
    toast(
      result?.error === 'UNINSTALLER_NOT_FOUND'
        ? t('settings.uninstallerMissing')
        : result?.error || t('common.unknownError'),
      'error'
    );
  }
}

/* --------------------------------------------------------------- Ansichten */

function renderSidebar() {
  const installedGames = Object.values(state.library).sort((a, b) =>
    (b.lastPlayed || 0) - (a.lastPlayed || 0) || a.title.localeCompare(b.title)
  );

  el.installedCount.textContent = installedGames.length;
  el.catalogStatus.textContent = statusText();

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
    : `<li class="sidebar__status" style="padding:4px 10px">${t('sidebar.nothingInstalled')}</li>`;

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
      ? `<span class="card__flag card__flag--update">${t('flag.update')}</span>`
      : status === 'installed'
        ? `<span class="card__flag card__flag--installed">${t('flag.installed')}</span>`
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

/** Flamme für leere Seiten - dieselbe Form wie in der Titelleiste. */
const EMPTY_FLAME = `
  <svg class="empty__flame" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.2c3.4 3.2 5.7 6.2 5.7 9.9a5.7 5.7 0 0 1-11.4 0c0-2.1.9-3.8 2.3-5.3.3 1 .9 1.8 1.7 2.2.6-2.5.3-4.6 1.7-6.8z" />
  </svg>`;

function emptyState(title, text) {
  return `
    <div class="empty">
      <div>
        ${EMPTY_FLAME}
        <div class="empty__title">${title}</div>
        <div>${text}</div>
      </div>
    </div>`;
}

function renderStore() {
  const games = filtered();
  if (!games.length) {
    // Ein leerer Store ist der Normalfall am Anfang, kein Fehler. Deshalb hier
    // kein Hinweis auf Einstellungen - da muss niemand etwas reparieren.
    if (state.search) {
      return `<div class="page">${emptyState(t('store.noResultsTitle'), t('store.noResultsText'))}</div>`;
    }
    const text = state.catalog.source === 'cache' ? t('store.emptyOffline') : t('store.emptyText');
    return `<div class="page">${emptyState(t('store.emptyTitle'), text)}</div>`;
  }

  const featured = games.find((g) => g.featured) || games[0];
  const rest = games.filter((g) => g.id !== featured.id);
  const updates = games.filter((g) => statusOf(g) === 'update');

  return `
    <div class="page">
      <section class="hero" style="${artStyle(featured, 'hero')}" data-open="${escapeHtml(featured.id)}">
        <div class="hero__body">
          <div class="hero__eyebrow">${featured.featured ? t('store.hero.featured') : t('store.hero.new')}</div>
          <h1 class="hero__title">${escapeHtml(featured.title)}</h1>
          <p class="hero__text">${escapeHtml(featured.shortDescription || featured.description).slice(0, 190)}</p>
          <div class="hero__actions">
            <button class="btn btn--primary btn--lg" data-open="${escapeHtml(featured.id)}">${t(
              'store.hero.view'
            )}</button>
          </div>
        </div>
      </section>

      ${
        updates.length
          ? `<h2 class="section-title">${t('store.updates', { n: updates.length })}</h2>
             <div class="grid">${updates.map(cardHtml).join('')}</div>`
          : ''
      }

      <h2 class="section-title">${t('store.all')}</h2>
      <div class="grid">${rest.map(cardHtml).join('')}</div>
    </div>`;
}

function renderLibrary() {
  const entries = Object.values(state.library);
  if (!entries.length) {
    return `
      <div class="page">
        <div class="page__head">
          <div><h1 class="page__title">${t('library.title')}</h1></div>
        </div>
        ${emptyState(t('library.emptyTitle'), t('library.emptyText'))}
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
            ${hasUpdate ? `<span class="card__flag card__flag--update">${t('flag.update')}</span>` : ''}
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
          <h1 class="page__title">${t('library.title')}</h1>
          <p class="page__subtitle">${escapeHtml(
            t('library.subtitle', {
              n: entries.length,
              size: formatBytes(entries.reduce((sum, e) => sum + (e.sizeBytes || 0), 0))
            })
          )}</p>
        </div>
      </div>
      <div class="grid">${cards}</div>
    </div>`;
}

function renderDetail() {
  const game = gameById(state.selectedId);
  const entry = state.library[state.selectedId];

  if (!game && !entry) {
    return `<div class="page">${emptyState(t('detail.notFound'), '')}</div>`;
  }

  // Ist ein installiertes Spiel aus dem Katalog verschwunden, zeigen wir die
  // lokal gespeicherten Daten - sonst wäre es aus der Bibliothek nicht erreichbar.
  const view = game || {
    id: entry.id,
    title: entry.title,
    developer: t('detail.localOnly'),
    description: t('detail.goneFromCatalog'),
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
      queued.state === 'error' ? t('detail.failed') : t('detail.progress', { n: queued.percent || 0 })
    }</button>
      <button class="btn btn--ghost" data-cancel="${escapeHtml(view.id)}">${t('common.cancel')}</button>`;
  } else if (status === 'update') {
    action = `<button class="btn btn--update btn--lg" data-install="${escapeHtml(view.id)}">${t(
      'detail.update'
    )}</button>
      <button class="btn btn--play" data-launch="${escapeHtml(view.id)}">${t('detail.playAnyway')}</button>`;
  } else if (status === 'installed') {
    action = `<button class="btn btn--play btn--lg" data-launch="${escapeHtml(view.id)}">${t(
      'detail.play'
    )}</button>`;
  } else {
    action = `<button class="btn btn--primary btn--lg" data-install="${escapeHtml(view.id)}">${t(
      'detail.install'
    )}</button>`;
  }

  const secondary = entry
    ? `<button class="btn btn--ghost" data-folder="${escapeHtml(view.id)}">${t('detail.openFolder')}</button>
       <button class="btn btn--ghost btn--danger" data-uninstall="${escapeHtml(view.id)}">${t(
         'detail.uninstall'
       )}</button>`
    : '';

  const paragraphs = String(view.description)
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
    .join('');

  return `
    <section class="detail__hero" style="${artStyle(view, 'hero')}">
      <button class="detail__back" data-back>← ${t('common.back')}</button>
      <div class="detail__headline">
        <div class="detail__cover" style="${artStyle(view)}">${
          view.cover ? '' : escapeHtml(initials(view.title))
        }</div>
        <div class="detail__headtext">
          <h1 class="detail__title">${escapeHtml(view.title)}</h1>
          <div class="detail__dev">${escapeHtml(view.developer)}</div>
          <div class="tag-row">
            ${view.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
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
            ? `<h2 class="section-title">${t('detail.screenshots')}</h2>
               <div class="shots">${view.screenshots
                 .map((s) => `<div class="shot" style="background-image:url('${escapeHtml(s)}')"></div>`)
                 .join('')}</div>`
            : ''
        }
        ${
          view.patchNotes
            ? `<div class="notes">
                 <div class="notes__title">${t('detail.whatsNew', { version: escapeHtml(view.version) })}</div>
                 <div class="prose">${escapeHtml(view.patchNotes).replace(/\n/g, '<br>')}</div>
               </div>`
            : ''
        }
      </div>

      <aside class="facts">
        <div class="fact"><span class="fact__key">${t('detail.latestVersion')}</span><span class="fact__value">v${escapeHtml(
          view.version
        )}</span></div>
        ${
          entry
            ? `<div class="fact"><span class="fact__key">${t(
                'detail.installedVersion'
              )}</span><span class="fact__value">v${escapeHtml(entry.version)}</span></div>
               <div class="fact"><span class="fact__key">${t(
                 'detail.sizeOnDisk'
               )}</span><span class="fact__value">${formatBytes(entry.sizeBytes)}</span></div>
               <div class="fact"><span class="fact__key">${t(
                 'detail.executable'
               )}</span><span class="fact__value">${escapeHtml(
                 entry.executable || t('detail.executableUnset')
               )}</span></div>
               <div class="fact"><span class="fact__key">${t(
                 'detail.playtime'
               )}</span><span class="fact__value">${escapeHtml(formatPlaytime(entry.playtimeSeconds))}</span></div>
               <div class="fact"><span class="fact__key">${t(
                 'detail.lastPlayed'
               )}</span><span class="fact__value">${formatDate(entry.lastPlayed)}</span></div>`
            : `<div class="fact"><span class="fact__key">${t(
                'detail.downloadSize'
              )}</span><span class="fact__value">${formatBytes(view.sizeBytes)}</span></div>`
        }
        <div class="fact"><span class="fact__key">${t('detail.released')}</span><span class="fact__value">${formatDate(
          view.releaseDate
        )}</span></div>
      </aside>
    </div>`;
}

function renderDownloads() {
  if (!state.queue.length) {
    return `
      <div class="page">
        <div class="page__head"><div><h1 class="page__title">${t('downloads.title')}</h1></div></div>
        ${emptyState(t('downloads.emptyTitle'), t('downloads.emptyText'))}
      </div>`;
  }

  const rows = state.queue
    .map((item) => {
      const game = gameById(item.gameId) || { id: item.gameId, title: item.title, cover: null };
      const isError = item.state === 'error';
      const indeterminate = item.stage === 'extracting' || item.stage === 'installing';
      const sub = isError
        ? escapeHtml(item.error)
        : [
            item.stage ? t(`stage.${item.stage}`) : t('stage.preparing'),
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
              ? `<button class="btn btn--ghost btn--sm" data-dismiss="${escapeHtml(item.gameId)}">${t(
                  'common.remove'
                )}</button>`
              : `<button class="btn btn--ghost btn--sm" data-cancel="${escapeHtml(item.gameId)}">${t(
                  'common.cancel'
                )}</button>`
          }
        </div>`;
    })
    .join('');

  return `
    <div class="page">
      <div class="page__head">
        <div>
          <h1 class="page__title">${t('downloads.title')}</h1>
          <p class="page__subtitle">${t('downloads.subtitle')}</p>
        </div>
      </div>
      ${rows}
    </div>`;
}

function renderSettings() {
  const s = state.settings;
  const autoCode = resolveLanguage('', state.appInfo.systemLocale);
  const options = [
    `<option value="" ${s.language ? '' : 'selected'}>${escapeHtml(
      t('settings.languageAuto', { language: languageInfo(autoCode).label })
    )}</option>`,
    ...LANGUAGES.map(
      (lang) =>
        `<option value="${lang.code}" ${s.language === lang.code ? 'selected' : ''}>${escapeHtml(
          lang.label
        )}</option>`
    )
  ].join('');

  const uninstallBlock = state.uninstaller.available
    ? `<div class="input-group">
         <button class="btn btn--danger-solid" id="btnUninstall">${t('settings.uninstallButton')}</button>
         <button class="btn btn--ghost" id="btnShowUninstaller">${t('settings.showUninstaller')}</button>
       </div>
       <div class="hint">${escapeHtml(t('settings.uninstallerPath', { path: state.uninstaller.path }))}</div>`
    : `<div class="hint">${t('settings.uninstallerMissing')}</div>`;

  return `
    <div class="page">
      <div class="page__head">
        <div>
          <h1 class="page__title">${t('settings.title')}</h1>
          <p class="page__subtitle">${t('settings.subtitle', {
            version: escapeHtml(state.appInfo.version || '?'),
            platform: escapeHtml(state.appInfo.platform || '')
          })}</p>
        </div>
      </div>

      <div class="callout">${t('settings.callout')}</div>

      <div class="form-row">
        <label for="langSelect">${t('settings.language')}</label>
        <select class="input select" id="langSelect">${options}</select>
        <div class="hint">${t('settings.languageHint')}</div>
      </div>

      <div class="form-row">
        <label for="manifestUrl">${t('settings.catalogUrl')}</label>
        <div class="input-group">
          <input class="input" id="manifestUrl" type="text" spellcheck="false"
                 placeholder="https://raw.githubusercontent.com/DEIN-NAME/REPO/main/games.json"
                 value="${escapeHtml(s.manifestUrl || '')}" />
          <button class="btn" id="btnSaveManifest">${t('settings.save')}</button>
        </div>
        <div class="hint">${escapeHtml(t('settings.catalogHint', { status: statusText() }))}</div>
      </div>

      <div class="form-row">
        <label>${t('settings.installDir')}</label>
        <div class="input-group">
          <input class="input" id="installDir" type="text" readonly value="${escapeHtml(s.installDir || '')}" />
          <button class="btn" id="btnPickDir">${t('settings.change')}</button>
        </div>
        <div class="hint">${t('settings.installDirHint')}</div>
      </div>

      <div class="form-row">
        <label class="switch">
          <input type="checkbox" id="autoUpdateGames" ${s.autoUpdateGames ? 'checked' : ''} />
          <span>${t('settings.autoUpdate')}</span>
        </label>
        <div class="hint">${t('settings.autoUpdateHint')}</div>
      </div>

      <h2 class="section-title">${t('settings.launcher')}</h2>
      <div class="form-row">
        <div class="input-group">
          <button class="btn" id="btnCheckLauncher">${t('settings.checkUpdate')}</button>
          <button class="btn btn--ghost" id="btnOpenData">${t('settings.openData')}</button>
        </div>
        <div class="hint">${escapeHtml(t('settings.dataDirHint', { dir: state.appInfo.dataDir || '' }))}</div>
      </div>

      <h2 class="section-title section-title--danger">${t('settings.dangerTitle')}</h2>
      <div class="danger">
        <p class="danger__text">${t('settings.uninstallText')}</p>
        ${uninstallBlock}
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
  document.getElementById('langSelect').addEventListener('change', async (event) => {
    state.settings = (await call(api.settings.set({ language: event.target.value }))) || state.settings;
    applyLanguage();
    render();
  });

  document.getElementById('btnSaveManifest').addEventListener('click', async () => {
    const url = document.getElementById('manifestUrl').value.trim();
    if (url && !/^https?:\/\//.test(url)) {
      toast(t('toast.badUrl'), 'error');
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
    else if (result.available) toast(t('toast.updateFound', { version: result.version }), 'success');
    else toast(t('toast.upToDate'), 'success');
  });

  document.getElementById('btnOpenData').addEventListener('click', () => {
    call(api.app.openDataDir());
  });

  const btnUninstall = document.getElementById('btnUninstall');
  if (btnUninstall) {
    btnUninstall.addEventListener('click', uninstallLauncher);
    document.getElementById('btnShowUninstaller').addEventListener('click', () => {
      call(api.app.showUninstaller());
    });
  }
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
  if (info.error) toast(t('toast.launchFailed', { error: info.error }), 'error');
});

api.app.onLauncherUpdate((info) => {
  state.launcherUpdate = info;
  if (info.state === 'ready') {
    el.updateBar.hidden = false;
    el.updateBarText.textContent = t('update.ready', { version: info.version });
  } else if (info.state === 'downloading') {
    el.updateBar.hidden = false;
    el.updateBarText.textContent = t('update.downloading', { n: info.percent });
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
    toast(t('toast.autoUpdates', { n: pending.length }), 'success');
  }
}

async function boot() {
  state.settings = (await call(api.settings.get(), { silent: true })) || {};
  state.appInfo = (await call(api.app.info(), { silent: true })) || {};
  state.uninstaller = (await call(api.app.uninstallerInfo(), { silent: true })) || state.uninstaller;

  // Vor dem ersten render(), sonst blitzt kurz die falsche Sprache auf.
  applyLanguage();

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
