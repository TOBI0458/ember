'use strict';

/* =========================================================================
   Alle sichtbaren Texte des Launchers, je Sprache einmal.

   Eine neue Sprache hinzufügen sind zwei Schritte:
     1. In LANGUAGES eine Zeile ergänzen (code, label, locale, flag).
     2. In STRINGS einen Block mit demselben Kürzel anlegen.
   Fehlt dort ein Schlüssel, nimmt der Launcher automatisch den englischen
   Text - eine halb übersetzte Sprache macht die Oberfläche also nicht kaputt.

   Platzhalter stehen in geschweiften Klammern: "{n} Spiele". Für Ein- und
   Mehrzahl gibt es zwei Schlüssel mit den Endungen _one und _other; welcher
   genommen wird, entscheidet t() anhand von {n}.

   Die ganze Datei steckt in einer Funktion, die sofort läuft. Nach außen gibt
   es nur window.i18n - sonst lägen Namen wie t oder LANGUAGES global herum und
   app.js könnte sie nicht mehr unter demselben Namen übernehmen. Der Inhalt ist
   bewusst nicht zusätzlich eingerückt, das würde die Datei nur breiter machen.
   ========================================================================= */

window.i18n = (function () {

// Kein Flaggen-Emoji dahinter: Windows hat keine Flaggen-Schriftzeichen und
// zeichnet stattdessen die Länderkürzel als Buchstaben ("GB English").
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

    'detail.notFound': 'Spiel nicht gefunden',
    'detail.localOnly': 'Lokal installiert',
    'detail.goneFromCatalog': 'Dieses Spiel ist nicht mehr im Katalog enthalten.',
    'detail.install': 'Installieren',
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
      '<strong>Alles aktualisiert sich von selbst.</strong> Neue Spiele erscheinen im Store, ' +
      'sobald sie veröffentlicht sind, und der Launcher zieht sich seine eigenen Updates im ' +
      'Hintergrund. Du musst hier nichts einstellen und nie wieder etwas herunterladen.',
    'settings.language': 'Sprache',
    'settings.languageAuto': 'Automatisch ({language})',
    'settings.languageHint': 'Gilt sofort, ohne Neustart. Automatisch richtet sich nach der Sprache von Windows.',
    'settings.catalogUrl': 'Katalog-URL (games.json)',
    'settings.save': 'Speichern',
    'settings.catalogHint': 'Steht schon richtig drin. Feld leeren und speichern setzt sie zurück. Aktueller Stand: {status}',
    'settings.installDir': 'Installationsordner',
    'settings.change': 'Ändern',
    'settings.installDirHint': 'Bereits installierte Spiele bleiben, wo sie sind.',
    'settings.autoUpdate': 'Spiel-Updates beim Start automatisch herunterladen',
    'settings.autoUpdateHint': 'Aus heißt: Updates werden nur angezeigt, gestartet werden sie von dir.',
    'settings.launcher': 'Launcher',
    'settings.checkUpdate': 'Nach Launcher-Update suchen',
    'settings.openData': 'Datenordner öffnen',
    'settings.dataDirHint': 'Datenordner: {dir}',

    'settings.dangerTitle': 'Ember entfernen',
    'settings.uninstallText':
      'Entfernt den Launcher von diesem Rechner. Installierte Spiele und deine Bibliothek bleiben liegen, ' +
      'bis du sie selbst löschst.',
    'settings.uninstallButton': 'Ember deinstallieren',
    'settings.showUninstaller': 'Datei im Explorer zeigen',
    'settings.uninstallerPath': 'Deinstallations-Programm: {path}',
    'settings.uninstallerMissing':
      'Kein Deinstallations-Programm gefunden — das gibt es nur in der installierten Fassung, nicht beim Start aus dem Quelltext.',

    'confirm.uninstallGameTitle': '„{title}" deinstallieren?',
    'confirm.uninstallGameText': 'Der Spielordner wird gelöscht. Du kannst das Spiel jederzeit neu installieren.',
    'confirm.uninstallGameOk': 'Deinstallieren',
    'confirm.uninstallLauncherTitle': 'Ember deinstallieren?',
    'confirm.uninstallLauncherText':
      'Der Launcher schließt sich und übergibt an das Deinstallations-Programm von Windows. ' +
      'Deine Spiele und Einstellungen bleiben auf der Platte.',
    'confirm.uninstallLauncherOk': 'Beenden und deinstallieren',

    'toast.queued': '„{title}" wurde zur Warteschlange hinzugefügt.',
    'toast.launching': 'Spiel wird gestartet…',
    'toast.uninstalled': '„{title}" wurde deinstalliert.',
    'toast.launchFailed': 'Start fehlgeschlagen: {error}',
    'toast.badUrl': 'Die URL muss mit http:// oder https:// beginnen.',
    'toast.updateFound': 'Launcher-Update v{version} gefunden.',
    'toast.upToDate': 'Der Launcher ist auf dem neuesten Stand.',
    'toast.autoUpdates_one': '{n} Update wird geladen.',
    'toast.autoUpdates_other': '{n} Updates werden geladen.',

    'update.ready': 'Launcher-Update v{version} ist bereit.',
    'update.downloading': 'Launcher-Update wird geladen… {n} %',
    'update.restart': 'Neu starten'
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

    'detail.notFound': 'Game not found',
    'detail.localOnly': 'Installed locally',
    'detail.goneFromCatalog': 'This game is no longer part of the catalogue.',
    'detail.install': 'Install',
    'detail.update': 'Update',
    'detail.play': 'Play',
    'detail.playAnyway': 'Play anyway',
    'detail.failed': 'Failed',
    'detail.progress': '{n} % …',
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
      '<strong>Everything updates itself.</strong> New games appear in the store as soon as they are ' +
      'published, and the launcher pulls its own updates in the background. There is nothing to set up ' +
      'here and never anything to download again.',
    'settings.language': 'Language',
    'settings.languageAuto': 'Automatic ({language})',
    'settings.languageHint': 'Applies immediately, no restart needed. Automatic follows your Windows language.',
    'settings.catalogUrl': 'Catalogue URL (games.json)',
    'settings.save': 'Save',
    'settings.catalogHint': 'Already filled in correctly. Clearing the field and saving resets it. Current state: {status}',
    'settings.installDir': 'Install folder',
    'settings.change': 'Change',
    'settings.installDirHint': 'Games that are already installed stay where they are.',
    'settings.autoUpdate': 'Download game updates automatically on start',
    'settings.autoUpdateHint': 'Off means updates are only shown; you start them yourself.',
    'settings.launcher': 'Launcher',
    'settings.checkUpdate': 'Check for launcher update',
    'settings.openData': 'Open data folder',
    'settings.dataDirHint': 'Data folder: {dir}',

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
    'toast.badUrl': 'The URL has to start with http:// or https://.',
    'toast.updateFound': 'Launcher update v{version} found.',
    'toast.upToDate': 'The launcher is up to date.',
    'toast.autoUpdates_one': '{n} update is being downloaded.',
    'toast.autoUpdates_other': '{n} updates are being downloaded.',

    'update.ready': 'Launcher update v{version} is ready.',
    'update.downloading': 'Downloading launcher update… {n} %',
    'update.restart': 'Restart'
  }
};

const FALLBACK = 'en';

let current = 'de';

/** Aus der Windows-Sprache ("de-DE", "en-GB") die passende Übersetzung. */
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

/** Locale für Datums- und Zahlenformate, passend zur gewählten Sprache. */
function locale() {
  return languageInfo().locale;
}

function t(key, vars) {
  const n = vars && vars.n;
  // Ein- und Mehrzahl: t('library.subtitle', { n: 1 }) findet library.subtitle_one.
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
