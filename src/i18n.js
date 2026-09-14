'use strict';

const EMBER_I18N = (function () {

const LANGUAGES = [
  { code: 'de', label: 'Deutsch', locale: 'de-DE' },
  { code: 'en', label: 'English', locale: 'en-US' }
];

const STRINGS = {
  de: {
    'tab.store': 'Store',
    'tab.library': 'Bibliothek',
    'tab.downloads': 'Downloads',
    'tab.settings': 'Einstellungen',

    'window.minimize': 'Minimieren',
    'window.maximize': 'Maximieren',
    'window.close': 'Schließen',

    'sidebar.search': 'Suchen',
    'sidebar.installed': 'Installiert',
    'sidebar.allGames': 'Alle Spiele',
    'sidebar.nothingInstalled': 'Noch nichts installiert.',
    'sidebar.refresh': 'Katalog aktualisieren',

    'common.loading': 'Wird geladen…',
    'common.cancel': 'Abbrechen',
    'common.remove': 'Entfernen',
    'common.back': 'Zurück',
    'common.never': '—',
    'common.unknownError': 'Unbekannter Fehler',

    'catalog.loading': 'Katalog wird geladen…',
    'catalog.unreachable': 'Katalog nicht erreichbar.',
    'catalog.demo': 'Demo-Katalog (Beispielspiele)',
    'catalog.empty': 'Noch keine Spiele veröffentlicht',
    'catalog.offline': 'Offline — letzter bekannter Stand',
    'catalog.count_one': '{n} Spiel · aktuell',
    'catalog.count_other': '{n} Spiele · aktuell',
    'catalog.refreshed': 'Katalog aktualisiert.',
    'catalog.failed': 'Katalog konnte nicht geladen werden.',

    'playtime.never': 'Noch nicht gespielt',
    'playtime.minutes': '{n} Min. gespielt',
    'playtime.hours': '{n} Std. gespielt',

    'store.hero.featured': 'Im Rampenlicht',
    'store.hero.new': 'Neu im Store',
    'store.hero.view': 'Ansehen',
    'store.updates': 'Updates verfügbar ({n})',
    'store.all': 'Alle Spiele',
    'store.emptyTitle': 'Der Store ist noch leer',
    'store.emptyText': 'Noch nichts veröffentlicht. Neue Spiele erscheinen hier von allein.',
    'store.emptyOffline': 'Gerade keine Verbindung. Der Store füllt sich, sobald du wieder online bist.',
    'store.noResultsTitle': 'Keine Spiele gefunden',
    'store.noResultsText': 'Andere Suche versuchen.',

    'library.title': 'Bibliothek',
    'library.emptyTitle': 'Deine Bibliothek ist leer',
    'library.emptyText': 'Installiere ein Spiel im Store, dann taucht es hier auf.',
    'library.subtitle_one': '{n} Spiel installiert · {size} belegt',
    'library.subtitle_other': '{n} Spiele installiert · {size} belegt',

    'flag.installed': 'Installiert',
    'flag.update': 'Update',
    'flag.soon': 'Demnächst',
    'flag.soonToday': 'Heute',
    'flag.soonTomorrow': 'Morgen',
    'flag.soonDays': 'In {n} Tagen',
    'flag.soonHours': 'In {n} Std.',

    'detail.notFound': 'Spiel nicht gefunden',
    'detail.localOnly': 'Lokal installiert',
    'detail.goneFromCatalog': 'Dieses Spiel ist nicht mehr im Katalog enthalten.',
    'detail.install': 'Installieren',
    'detail.soon': 'Demnächst verfügbar',
    'detail.soonDate': 'Erscheint am {date}',
    'detail.soonToday': 'Erscheint heute',
    'detail.soonTomorrow': 'Erscheint morgen',
    'detail.soonDays': 'Noch {n} Tage',
    'detail.soonHours': 'Noch {n} Stunden',
    'detail.soonSoon': 'Jeden Moment',
    'detail.soonLate': 'Der Termin ist durch — es dauert noch etwas.',
    'detail.update': 'Aktualisieren',
    'detail.play': 'Spielen',
    'detail.playAnyway': 'Trotzdem spielen',
    'detail.failed': 'Fehlgeschlagen',
    'detail.progress': '{n} % …',
    'detail.openFolder': 'Ordner öffnen',
    'detail.uninstall': 'Deinstallieren',
    'detail.screenshots': 'Eindrücke',
    'detail.whatsNew': 'Was ist neu in v{version}',
    'detail.latestVersion': 'Neueste Version',
    'detail.installedVersion': 'Installiert',
    'detail.sizeOnDisk': 'Größe auf Platte',
    'detail.executable': 'Startdatei',
    'detail.executableUnset': 'nicht gesetzt',
    'detail.playtime': 'Spielzeit',
    'detail.lastPlayed': 'Zuletzt gespielt',
    'detail.downloadSize': 'Downloadgröße',
    'detail.released': 'Veröffentlicht',

    'downloads.title': 'Downloads',
    'downloads.subtitle': 'Ein Download nach dem anderen — das hält die Leitung frei.',
    'downloads.emptyTitle': 'Nichts in der Warteschlange',
    'downloads.emptyText': 'Installationen und Updates erscheinen hier mit Fortschritt.',
    'stage.queued': 'Wartet',
    'stage.downloading': 'Lädt herunter',
    'stage.extracting': 'Entpackt',
    'stage.installing': 'Installiert',
    'stage.done': 'Fertig',
    'stage.error': 'Fehlgeschlagen',
    'stage.preparing': 'Vorbereitung',

    'settings.title': 'Einstellungen',
    'settings.subtitle': 'Launcher v{version} · {platform}',
    'settings.callout':
      '<strong>Ember sieht von selbst nach.</strong> Neue Spiele erscheinen im Store, sobald sie ' +
      'veröffentlicht sind, und nach einer neuen Fassung von Ember sucht der Launcher mehrmals am ' +
      'Tag. Gemeldet wird sie sofort, heruntergeladen erst auf deinen Klick — damit dir auf einer ' +
      'getakteten Verbindung niemand ungefragt hundert Megabyte zieht.',
    'settings.language': 'Sprache',
    'settings.languageAuto': 'Automatisch ({language})',
    'settings.languageHint': 'Gilt sofort, ohne Neustart. Automatisch richtet sich nach der Sprache von Windows.',
    'settings.autoUpdate': 'Spiel-Updates beim Start automatisch herunterladen',
    'settings.autoUpdateHint': 'Aus heißt: Updates werden nur angezeigt, gestartet werden sie von dir.',
    'settings.launcher': 'Launcher',
    'settings.checkUpdate': 'Jetzt nach Updates suchen',
    'settings.checking': 'Wird gesucht…',
    'settings.notices': 'Bescheid sagen, wenn es etwas Neues gibt',
    'settings.noticesHint':
      'Neue Spiele im Katalog, Updates für installierte und neue Fassungen von Ember. Liegt Ember im Hintergrund, kommt die Meldung von Windows.',
    'settings.autostart': 'Mit Windows starten',
    'settings.autostartHint':
      'Ember startet mit dem Rechner und wartet im Infobereich neben der Uhr. Nur so kann es Bescheid sagen, ohne dass du es vorher aufmachst.',
    'settings.background': 'Beim Schließen im Hintergrund weiterlaufen',
    'settings.backgroundHint':
      'Das Fenster geht zu, Ember bleibt im Infobereich. Über „Ember beenden“ im Rechtsklickmenü ist es ganz weg.',
    'settings.openData': 'Datenordner öffnen',
    'settings.dataDirHint': 'Datenordner: {dir}',
    'settings.changelog': 'Was sich zuletzt geändert hat',
    'settings.changelogCurrent': 'installiert',
    'settings.changelogOffline': 'Die Änderungen lassen sich gerade nicht laden — dafür braucht es eine Verbindung.',
    'settings.changelogEmpty': 'Noch keine Fassung veröffentlicht.',

    'settings.dangerTitle': 'Ember entfernen',
    'settings.uninstallText':
      'Entfernt den Launcher von diesem Rechner. Installierte Spiele und deine Bibliothek bleiben liegen, ' +
      'bis du sie selbst löschst.',
    'settings.uninstallButton': 'Ember deinstallieren',
    'settings.showUninstaller': 'Datei im Explorer zeigen',
    'settings.uninstallerPath': 'Deinstallations-Programm: {path}',
    'settings.uninstallerMissing':
      'Kein Deinstallations-Programm gefunden — das gibt es nur in der installierten Fassung, nicht beim Start aus dem Quelltext.',

    'confirm.uninstallGameTitle': '„{title}“ deinstallieren?',
    'confirm.uninstallGameText': 'Der Spielordner wird gelöscht. Du kannst das Spiel jederzeit neu installieren.',
    'confirm.uninstallGameOk': 'Deinstallieren',
    'confirm.uninstallLauncherTitle': 'Ember deinstallieren?',
    'confirm.uninstallLauncherText':
      'Der Launcher schließt sich und übergibt an das Deinstallations-Programm von Windows. ' +
      'Deine Spiele und Einstellungen bleiben auf der Platte.',
    'confirm.uninstallLauncherOk': 'Beenden und deinstallieren',

    'toast.queued': '„{title}“ wurde zur Warteschlange hinzugefügt.',
    'toast.launching': 'Spiel wird gestartet…',
    'toast.uninstalled': '„{title}“ wurde deinstalliert.',
    'toast.launchFailed': 'Start fehlgeschlagen: {error}',
    'toast.updateFound': 'Launcher-Update v{version} gefunden.',
    'toast.upToDate': 'Der Launcher ist auf dem neuesten Stand.',
    'toast.gamesUpToDate': 'Alle Spiele sind auf dem neuesten Stand.',
    'toast.autoUpdates_one': '{n} Update wird geladen.',
    'toast.autoUpdates_other': '{n} Updates werden geladen.',

    'update.available': 'Launcher-Update v{version} steht bereit.',
    'update.download': 'Herunterladen',
    'update.ready': 'Launcher-Update v{version} ist bereit.',
    'update.downloading': 'Launcher-Update wird geladen… {n} %',
    'update.restart': 'Neu starten',

    'notify.title': 'Ember',
    'notify.newGame': '„{title}“ ist neu im Store.',
    'notify.newGames': '{n} neue Spiele im Store.',
    'notify.gameUpdate': 'Für „{title}“ gibt es ein Update.',
    'notify.gameUpdates': 'Für {n} Spiele gibt es Updates.',
    'notify.launcherUpdate': 'Ember v{version} ist da.',
    'notify.released': '„{title}“ ist jetzt da — du kannst es installieren.',
    'notify.soonTomorrow': '„{title}“ erscheint morgen.',
    'notify.soonToday': '„{title}“ erscheint heute.',
    'notify.background': 'Ember läuft weiter im Hintergrund und sagt Bescheid, wenn es etwas Neues gibt.',

    'tray.tip': 'Ember',
    'tray.open': 'Ember öffnen',
    'tray.check': 'Jetzt nach Updates suchen',
    'tray.quit': 'Ember beenden'
  },

  en: {
    'tab.store': 'Store',
    'tab.library': 'Library',
    'tab.downloads': 'Downloads',
    'tab.settings': 'Settings',

    'window.minimize': 'Minimize',
    'window.maximize': 'Maximize',
    'window.close': 'Close',

    'sidebar.search': 'Search',
    'sidebar.installed': 'Installed',
    'sidebar.allGames': 'All games',
    'sidebar.nothingInstalled': 'Nothing installed yet.',
    'sidebar.refresh': 'Refresh catalogue',

    'common.loading': 'Loading…',
    'common.cancel': 'Cancel',
    'common.remove': 'Remove',
    'common.back': 'Back',
    'common.never': '—',
    'common.unknownError': 'Unknown error',

    'catalog.loading': 'Loading catalogue…',
    'catalog.unreachable': 'Catalogue unreachable.',
    'catalog.demo': 'Demo catalogue (sample games)',
    'catalog.empty': 'No games published yet',
    'catalog.offline': 'Offline — last known state',
    'catalog.count_one': '{n} game · up to date',
    'catalog.count_other': '{n} games · up to date',
    'catalog.refreshed': 'Catalogue refreshed.',
    'catalog.failed': 'The catalogue could not be loaded.',

    'playtime.never': 'Never played',
    'playtime.minutes': '{n} min played',
    'playtime.hours': '{n} h played',

    'store.hero.featured': 'In the spotlight',
    'store.hero.new': 'New in the store',
    'store.hero.view': 'View',
    'store.updates': 'Updates available ({n})',
    'store.all': 'All games',
    'store.emptyTitle': 'The store is still empty',
    'store.emptyText': 'Nothing published yet. New games will show up here on their own.',
    'store.emptyOffline': 'No connection right now. The store fills up as soon as you are back online.',
    'store.noResultsTitle': 'No games found',
    'store.noResultsText': 'Try a different search.',

    'library.title': 'Library',
    'library.emptyTitle': 'Your library is empty',
    'library.emptyText': 'Install a game from the store and it will appear here.',
    'library.subtitle_one': '{n} game installed · {size} used',
    'library.subtitle_other': '{n} games installed · {size} used',

    'flag.installed': 'Installed',
    'flag.update': 'Update',
    'flag.soon': 'Coming soon',
    'flag.soonToday': 'Today',
    'flag.soonTomorrow': 'Tomorrow',
    'flag.soonDays': 'In {n} days',
    'flag.soonHours': 'In {n} h',

    'detail.notFound': 'Game not found',
    'detail.localOnly': 'Installed locally',
    'detail.goneFromCatalog': 'This game is no longer part of the catalogue.',
    'detail.install': 'Install',
    'detail.soon': 'Coming soon',
    'detail.soonDate': 'Out on {date}',
    'detail.soonToday': 'Out today',
    'detail.soonTomorrow': 'Out tomorrow',
    'detail.soonDays': '{n} days to go',
    'detail.soonHours': '{n} hours to go',
    'detail.soonSoon': 'Any minute now',
    'detail.soonLate': 'The date has passed — it needs a little longer.',
    'detail.update': 'Update',
    'detail.play': 'Play',
    'detail.playAnyway': 'Play anyway',
    'detail.failed': 'Failed',

    'detail.progress': '{n}% …',
    'detail.openFolder': 'Open folder',
    'detail.uninstall': 'Uninstall',
    'detail.screenshots': 'Impressions',
    'detail.whatsNew': "What's new in v{version}",
    'detail.latestVersion': 'Latest version',
    'detail.installedVersion': 'Installed',
    'detail.sizeOnDisk': 'Size on disk',
    'detail.executable': 'Executable',
    'detail.executableUnset': 'not set',
    'detail.playtime': 'Playtime',
    'detail.lastPlayed': 'Last played',
    'detail.downloadSize': 'Download size',
    'detail.released': 'Released',

    'downloads.title': 'Downloads',
    'downloads.subtitle': 'One download at a time — that keeps the line free.',
    'downloads.emptyTitle': 'Nothing in the queue',
    'downloads.emptyText': 'Installs and updates show up here with their progress.',
    'stage.queued': 'Waiting',
    'stage.downloading': 'Downloading',
    'stage.extracting': 'Extracting',
    'stage.installing': 'Installing',
    'stage.done': 'Done',
    'stage.error': 'Failed',
    'stage.preparing': 'Preparing',

    'settings.title': 'Settings',
    'settings.subtitle': 'Launcher v{version} · {platform}',
    'settings.callout':
      '<strong>Ember checks on its own.</strong> New games appear in the store as soon as they are ' +
      'published, and the launcher looks for a new version of itself several times a day. You are told ' +
      'right away; it downloads only when you click — so nobody pulls a hundred megabytes over a ' +
      'metered connection without asking.',
    'settings.language': 'Language',
    'settings.languageAuto': 'Automatic ({language})',
    'settings.languageHint': 'Applies immediately, no restart needed. Automatic follows your Windows language.',
    'settings.autoUpdate': 'Download game updates automatically on start',
    'settings.autoUpdateHint': 'Off means updates are only shown; you start them yourself.',
    'settings.launcher': 'Launcher',
    'settings.checkUpdate': 'Check for updates now',
    'settings.checking': 'Checking…',
    'settings.notices': 'Tell me when there is something new',
    'settings.noticesHint':
      'New games in the catalog, updates for installed ones and new versions of Ember. If Ember is in the background, Windows delivers the message.',
    'settings.autostart': 'Start with Windows',
    'settings.autostartHint':
      'Ember starts with the computer and waits in the notification area next to the clock. That is the only way it can tell you about something without you opening it first.',
    'settings.background': 'Keep running in the background when closed',
    'settings.backgroundHint':
      'The window closes, Ember stays in the notification area. „Quit Ember“ in its right-click menu closes it for good.',
    'settings.openData': 'Open data folder',
    'settings.dataDirHint': 'Data folder: {dir}',
    'settings.changelog': 'What changed recently',
    'settings.changelogCurrent': 'installed',
    'settings.changelogOffline': 'The changes cannot be loaded right now — that needs a connection.',
    'settings.changelogEmpty': 'No version published yet.',

    'settings.dangerTitle': 'Remove Ember',
    'settings.uninstallText':
      'Removes the launcher from this computer. Installed games and your library stay on disk until you delete them yourself.',
    'settings.uninstallButton': 'Uninstall Ember',
    'settings.showUninstaller': 'Show file in Explorer',
    'settings.uninstallerPath': 'Uninstaller: {path}',
    'settings.uninstallerMissing':
      'No uninstaller found — it only exists in the installed build, not when running from source.',

    'confirm.uninstallGameTitle': 'Uninstall “{title}”?',
    'confirm.uninstallGameText': 'The game folder will be deleted. You can reinstall it at any time.',
    'confirm.uninstallGameOk': 'Uninstall',
    'confirm.uninstallLauncherTitle': 'Uninstall Ember?',
    'confirm.uninstallLauncherText':
      'The launcher will close and hand over to the Windows uninstaller. Your games and settings stay on disk.',
    'confirm.uninstallLauncherOk': 'Quit and uninstall',

    'toast.queued': '“{title}” was added to the queue.',
    'toast.launching': 'Starting game…',
    'toast.uninstalled': '“{title}” was uninstalled.',
    'toast.launchFailed': 'Could not start: {error}',
    'toast.updateFound': 'Launcher update v{version} found.',
    'toast.upToDate': 'The launcher is up to date.',
    'toast.gamesUpToDate': 'All games are up to date.',
    'toast.autoUpdates_one': '{n} update is being downloaded.',
    'toast.autoUpdates_other': '{n} updates are being downloaded.',

    'update.available': 'Launcher update v{version} is available.',
    'update.download': 'Download',
    'update.ready': 'Launcher update v{version} is ready.',
    'update.downloading': 'Downloading launcher update… {n}%',
    'update.restart': 'Restart',

    'notify.title': 'Ember',
    'notify.newGame': '“{title}” is new in the store.',
    'notify.newGames': '{n} new games in the store.',
    'notify.gameUpdate': 'There is an update for “{title}”.',
    'notify.gameUpdates': 'There are updates for {n} games.',
    'notify.launcherUpdate': 'Ember v{version} is available.',
    'notify.released': '“{title}” is out — you can install it now.',
    'notify.soonTomorrow': '“{title}” is out tomorrow.',
    'notify.soonToday': '“{title}” is out today.',
    'notify.background': 'Ember keeps running in the background and will tell you when there is something new.',

    'tray.tip': 'Ember',
    'tray.open': 'Open Ember',
    'tray.check': 'Check for updates now',
    'tray.quit': 'Quit Ember'
  }
};

const FALLBACK = 'en';

let current = 'de';

function resolveLanguage(setting, systemLocale) {
  if (setting && STRINGS[setting]) return setting;
  const base = String(systemLocale || '').slice(0, 2).toLowerCase();
  return STRINGS[base] ? base : FALLBACK;
}

function setLanguage(code) {
  current = STRINGS[code] ? code : FALLBACK;
  return current;
}

function getLanguage() {
  return current;
}

function languageInfo(code = current) {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
}

function locale() {
  return languageInfo().locale;
}

function t(key, vars) {
  const n = vars && vars.n;

  const candidates =
    typeof n === 'number' ? [`${key}_${n === 1 ? 'one' : 'other'}`, key] : [key];

  let text = null;
  for (const candidate of candidates) {
    if (STRINGS[current][candidate] !== undefined) {
      text = STRINGS[current][candidate];
      break;
    }
    if (STRINGS[FALLBACK][candidate] !== undefined) {
      text = STRINGS[FALLBACK][candidate];
      break;
    }
  }
  if (text === null) {
    console.warn(`[i18n] Kein Text für "${key}" (${current})`);
    return key;
  }

  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    vars[name] === undefined ? match : String(vars[name])
  );
}

return { LANGUAGES, resolveLanguage, setLanguage, getLanguage, languageInfo, locale, t };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = EMBER_I18N;
else window.i18n = EMBER_I18N;
