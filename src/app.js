'use strict';

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

  status: { key: 'catalog.loading' },
  launcherUpdate: null,

  gemeldet: { launcher: null },

  changelog: null
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

function hashHue(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

function farbverlauf(id) {
  const hue = hashHue(id);
  return (
    `linear-gradient(150deg,` +
    `hsl(${hue} 62% 34%),hsl(${(hue + 48) % 360} 58% 20%) 55%,hsl(${(hue + 92) % 360} 50% 13%))`
  );
}

function artStyle(game, imageKey = 'cover') {
  const url = game[imageKey];
  const verlauf = farbverlauf(game.id);

  if (url) return `background-image:url('${escapeHtml(url)}'),${verlauf}`;
  return `background-image:${verlauf}`;
}

function initials(title) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

function splitVersion(value) {
  const text = String(value == null ? '' : value).trim();
  const trenner = text.search(/[-+]/);
  const kern = trenner < 0 ? text : text.slice(0, trenner);
  const vorab = trenner < 0 || text[trenner] === '+' ? '' : text.slice(trenner + 1).split('+')[0];
  return {
    zahlen: kern.split('.').map((n) => parseInt(n, 10) || 0),
    vorab
  };
}

function compareVersions(a, b) {
  const va = splitVersion(a);
  const vb = splitVersion(b);

  for (let i = 0; i < Math.max(va.zahlen.length, vb.zahlen.length); i += 1) {
    const d = (va.zahlen[i] || 0) - (vb.zahlen[i] || 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }

  if (va.vorab === vb.vorab) return 0;
  if (!va.vorab) return 1;
  if (!vb.vorab) return -1;
  return va.vorab < vb.vorab ? -1 : 1;
}

function statusOf(game) {
  const installed = state.library[game.id];
  const queued = state.queue.find((q) => q.gameId === game.id);
  if (queued) return queued.state === 'error' ? 'error' : 'busy';

  if (!installed && !game.download?.url) return 'soon';

  if (!installed) return 'available';
  if (compareVersions(installed.version, game.version) < 0) return 'update';
  return 'installed';
}

function restzeit(game) {
  const roh = game && game.releaseAt;
  if (!roh) return null;
  const nur = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(roh));
  const ziel = nur
    ? new Date(Number(nur[1]), Number(nur[2]) - 1, Number(nur[3]))
    : new Date(roh);
  if (Number.isNaN(ziel.getTime())) return null;

  const ms = ziel.getTime() - Date.now();

  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const tag = new Date(ziel);
  tag.setHours(0, 0, 0, 0);
  const tage = Math.round((tag - heute) / 86400000);

  const vorbei = nur ? tage < 0 : ms <= 0;

  return { ziel, ms, tage, vorbei };
}

function restzeitKurz(r) {
  if (!r || r.vorbei) return null;
  if (r.tage >= 2) return t('flag.soonDays', { n: r.tage });
  if (r.tage === 1) return t('flag.soonTomorrow');
  if (r.tage === 0) return t('flag.soonToday');
  return t('flag.soonHours', { n: Math.max(1, Math.ceil(r.ms / 3600000)) });
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

function hinweis(text, { titel, kind = 'info' } = {}) {
  if (state.settings.updateHinweise === false) return;
  toast(text, kind);
  api.app.notify(titel || t('notify.title'), text);
}

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

  renderUpdateBar();
}

function renderUpdateBar() {
  const info = state.launcherUpdate;
  if (!info || info.state === 'error') {
    el.updateBar.hidden = true;
    return;
  }

  el.updateBar.hidden = false;

  if (info.state === 'available') {
    el.updateBarText.textContent = t('update.available', { version: info.version });
    el.updateBarAction.textContent = t('update.download');
    el.updateBarAction.hidden = false;
    return;
  }

  if (info.state === 'downloading') {
    el.updateBarText.textContent = t('update.downloading', { n: info.percent });

    el.updateBarAction.hidden = true;
    return;
  }

  if (info.state === 'ready') {
    el.updateBarText.textContent = t('update.ready', { version: info.version });
    el.updateBarAction.textContent = t('update.restart');
    el.updateBarAction.hidden = false;
    return;
  }

  el.updateBar.hidden = true;
}

const modal = {
  root: document.getElementById('modal'),
  title: document.getElementById('modalTitle'),
  text: document.getElementById('modalText'),
  ok: document.getElementById('modalOk'),
  cancel: document.getElementById('modalCancel'),
  backdrop: document.getElementById('modalBackdrop'),
  resolve: null
};

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

function katalogUebernehmen(data) {
  state.catalog = data;
  const count = data.games.length;
  if (data.source === 'demo') state.status = { key: 'catalog.demo' };
  else if (data.source === 'cache') state.status = { key: 'catalog.offline' };
  else if (!count) state.status = { key: 'catalog.empty' };
  else state.status = { key: 'catalog.count', vars: { n: count } };
}

async function loadCatalog({ notify, force } = {}) {
  const data = await call(api.catalog.fetch(Boolean(force)), { silent: true });
  if (!data) {
    state.status = { key: 'catalog.unreachable' };
    if (notify) toast(t('catalog.failed'), 'error');
    render();
    return;
  }
  katalogUebernehmen(data);
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
        : status === 'soon'
          ? `<span class="card__flag card__flag--soon">${
              restzeitKurz(restzeit(game)) || t('flag.soon')
            }</span>`
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
  } else if (status === 'soon') {

    const r = restzeit(view);
    let zaehler = '';
    if (r) {
      const wann = r.vorbei
        ? t('detail.soonLate')
        : r.tage >= 2
          ? t('detail.soonDays', { n: r.tage })
          : r.tage === 1
            ? t('detail.soonTomorrow')
            : r.tage === 0
              ? t('detail.soonToday')
              : r.ms > 3600000
                ? t('detail.soonHours', { n: Math.ceil(r.ms / 3600000) })
                : t('detail.soonSoon');
      const datum = r.ziel.toLocaleDateString(locale(), {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
      zaehler = `<div class="countdown">
        <span class="countdown__big">${escapeHtml(wann)}</span>
        <span class="countdown__date">${escapeHtml(t('detail.soonDate', { date: datum }))}</span>
      </div>`;
    }
    action = `<button class="btn btn--lg" disabled>${t('detail.soon')}</button>${zaehler}`;
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

function notesToHtml(notes) {
  const out = [];
  let list = null;
  let paragraph = [];

  const closeList = () => {
    if (!list) return;
    out.push(`<ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`);
    list = null;
  };
  const closeParagraph = () => {
    if (!paragraph.length) return;
    out.push(`<p>${paragraph.map(escapeHtml).join('<br>')}</p>`);
    paragraph = [];
  };

  for (const raw of String(notes).split('\n')) {
    const line = raw.trim();

    if (!line) {
      closeList();
      closeParagraph();
      continue;
    }

    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      closeParagraph();
      if (!list) list = [];
      list.push(bullet[1]);
      continue;
    }

    if (list && /^\s/.test(raw)) {
      list[list.length - 1] += ' ' + line;
      continue;
    }

    closeList();
    paragraph.push(line);
  }

  closeList();
  closeParagraph();
  return out.join('');
}

function changelogHtml() {
  if (state.changelog === null) return `<div class="hint">${t('common.loading')}</div>`;
  if (state.changelog === 'error') return `<div class="hint">${t('settings.changelogOffline')}</div>`;
  if (!state.changelog.length) return `<div class="hint">${t('settings.changelogEmpty')}</div>`;

  return state.changelog
    .map((entry) => {
      const date = entry.date ? new Date(entry.date).toLocaleDateString(locale()) : '';
      const isCurrent = entry.version === state.appInfo.version;

      const body = notesToHtml(entry.notes);

      return `
        <div class="changelog__entry">
          <div class="changelog__head">
            <span class="changelog__version">v${escapeHtml(entry.version)}</span>
            ${isCurrent ? `<span class="changelog__now">${t('settings.changelogCurrent')}</span>` : ''}
            <span class="changelog__date">${escapeHtml(date)}</span>
          </div>
          <div class="changelog__body">${body}</div>
        </div>`;
    })
    .join('');
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
        <label class="switch">
          <input type="checkbox" id="autoUpdateGames" ${s.autoUpdateGames ? 'checked' : ''} />
          <span>${t('settings.autoUpdate')}</span>
        </label>
        <div class="hint">${t('settings.autoUpdateHint')}</div>
      </div>

      <div class="form-row">
        <label class="switch">
          <input type="checkbox" id="updateHinweise" ${s.updateHinweise !== false ? 'checked' : ''} />
          <span>${t('settings.notices')}</span>
        </label>
        <div class="hint">${t('settings.noticesHint')}</div>
      </div>

      <div class="form-row">
        <label class="switch">
          <input type="checkbox" id="autostart" ${s.autostart !== false ? 'checked' : ''} />
          <span>${t('settings.autostart')}</span>
        </label>
        <div class="hint">${t('settings.autostartHint')}</div>
      </div>

      <div class="form-row">
        <label class="switch">
          <input type="checkbox" id="imHintergrund" ${s.imHintergrund !== false ? 'checked' : ''} />
          <span>${t('settings.background')}</span>
        </label>
        <div class="hint">${t('settings.backgroundHint')}</div>
      </div>

      <h2 class="section-title">${t('settings.launcher')}</h2>
      <div class="form-row">
        <div class="input-group">
          <button class="btn" id="btnCheckLauncher">${t('settings.checkUpdate')}</button>
          <button class="btn btn--ghost" id="btnOpenData">${t('settings.openData')}</button>
        </div>
        <div class="hint">${escapeHtml(t('settings.dataDirHint', { dir: state.appInfo.dataDir || '' }))}</div>
      </div>

      <div class="form-row">
        <label>${t('settings.changelog')}</label>
        <div class="changelog" id="changelog">${changelogHtml()}</div>
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

  if (state.view === 'settings') {
    wireSettings();
    loadChangelog();
  }
}

let changelogPending = false;
async function loadChangelog() {
  if (changelogPending) return;
  if (state.changelog !== null && state.changelog !== 'error') return;

  changelogPending = true;
  const entries = await call(api.app.changelog(), { silent: true });
  changelogPending = false;

  state.changelog = entries || 'error';

  const box = document.getElementById('changelog');
  if (box) box.innerHTML = changelogHtml();
}

function navigate(view, gameId = null) {
  state.view = view;
  state.selectedId = gameId;
  el.content.scrollTop = 0;
  render();
}

function wireSettings() {
  document.getElementById('langSelect').addEventListener('change', async (event) => {
    state.settings = (await call(api.settings.set({ language: event.target.value }))) || state.settings;
    applyLanguage();
    render();
  });

  document.getElementById('autoUpdateGames').addEventListener('change', async (event) => {
    state.settings = (await call(api.settings.set({ autoUpdateGames: event.target.checked }))) || state.settings;
  });

  document.getElementById('updateHinweise').addEventListener('change', async (event) => {
    state.settings = (await call(api.settings.set({ updateHinweise: event.target.checked }))) || state.settings;
  });

  document.getElementById('autostart').addEventListener('change', async (event) => {
    state.settings =
      (await call(api.settings.set({ autostart: event.target.checked }))) || state.settings;
  });

  document.getElementById('imHintergrund').addEventListener('change', async (event) => {
    state.settings =
      (await call(api.settings.set({ imHintergrund: event.target.checked }))) || state.settings;
  });

  document.getElementById('btnCheckLauncher').addEventListener('click', async (event) => {
    const knopf = event.currentTarget;
    knopf.disabled = true;
    knopf.textContent = t('settings.checking');
    try {

      const vorher = state.catalog.games.filter((g) => statusOf(g) === 'update').length;
      await loadCatalog({ force: true });
      const offen = state.catalog.games.filter((g) => statusOf(g) === 'update').length;
      if (!offen && !vorher) toast(t('toast.gamesUpToDate'), 'success');

      const result = await call(api.app.checkForUpdates());
      if (!result) return;
      if (result.note) toast(result.note);
      else if (result.available) toast(t('toast.updateFound', { version: result.version }), 'success');
      else toast(t('toast.upToDate'), 'success');
    } finally {
      knopf.disabled = false;
      knopf.textContent = t('settings.checkUpdate');
    }
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

document.getElementById('btnRefresh').addEventListener('click', () =>
  loadCatalog({ notify: true, force: true })
);

api.catalog.onChanged((data) => {
  if (!data) return;
  katalogUebernehmen(data);
  render();
});

api.app.onWache((m) => {
  if (!m || state.settings.updateHinweise === false) return;
  toast(t(m.key, m.vars), m.kind || 'info');
});
document.getElementById('btnMinimize').addEventListener('click', () => api.window.minimize());
document.getElementById('btnMaximize').addEventListener('click', () => api.window.toggleMaximize());
document.getElementById('btnClose').addEventListener('click', () => api.window.close());

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
  renderUpdateBar();

  if (info.state === 'available' && state.gemeldet.launcher !== info.version) {
    state.gemeldet.launcher = info.version;
    hinweis(t('notify.launcherUpdate', { version: info.version }), { kind: 'success' });
  }
});

el.updateBarAction.addEventListener('click', () => {
  if (state.launcherUpdate?.state === 'available') api.app.downloadLauncherUpdate();
  else api.app.installLauncherUpdate();
});

async function boot() {
  state.settings = (await call(api.settings.get(), { silent: true })) || {};
  state.appInfo = (await call(api.app.info(), { silent: true })) || {};
  state.uninstaller = (await call(api.app.uninstallerInfo(), { silent: true })) || state.uninstaller;

  applyLanguage();

  const stand = await call(api.app.launcherUpdateState(), { silent: true });
  if (stand && !state.launcherUpdate) {
    state.launcherUpdate = stand;
    renderUpdateBar();
    if (stand.state === 'available' && state.gemeldet.launcher !== stand.version) {
      state.gemeldet.launcher = stand.version;
      hinweis(t('notify.launcherUpdate', { version: stand.version }), { kind: 'success' });
    }
  }

  await loadLibrary();
  await loadQueue();
  await loadCatalog();
}

boot();
