# Ember

Ein Spiele-Launcher im Steam/Epic-Stil. Du lädst deine Spiele einmal als ZIP zu
GitHub hoch — alle anderen bekommen sie und jedes spätere Update automatisch über
den Launcher. Du musst niemandem mehr eine Datei schicken.

```bash
npm install
npm start
```

Der Launcher zeigt den echten Katalog aus `launcher-katalog` — die Adresse steht
unter `ember.catalogUrl` in der `package.json` und ist fest eingebaut. Wer den
Launcher geschickt bekommt, sieht die Spiele also sofort und muss nichts
einstellen.

Zum Ausprobieren gibt es drei kleine, wirklich spielbare Beispiele. Dafür in
`%APPDATA%Embersettings.json` als `manifestUrl` einfach `demo` eintragen.

Wie du den Launcher verschickst und aktuell hältst, steht in
[VERTEILEN.md](VERTEILEN.md).

---

## Wie es funktioniert

Es gibt genau zwei bewegliche Teile:

1. **`games.json`** — eine Datei in einem GitHub-Repo. Sie listet alle Spiele mit
   Titel, Beschreibung, Version und Download-Link.
2. **Die ZIPs** — deine Spiele, hochgeladen als Assets in GitHub-Releases.

Der Launcher lädt beim Start die `games.json`. Steht dort eine höhere Version als
lokal installiert, erscheint ein Update. Mehr Server brauchst du nicht — GitHub
übernimmt Hosting und Traffic kostenlos.

```
Du: ZIP in ein Release hochladen  ─┐
Du: Version in games.json erhöhen ─┴─► GitHub ──► Launcher aller Spieler
```

---

## Einrichtung (einmalig)

### 1. Katalog-Repo anlegen

Erstelle auf GitHub ein **öffentliches** Repo, zum Beispiel `mein-launcher-katalog`.
Lege darin eine Datei `games.json` an:

```json
{
  "manifestVersion": 1,
  "games": [
    {
      "id": "mein-spiel",
      "title": "Mein Spiel",
      "developer": "Tobias",
      "shortDescription": "Ein Satz für die Store-Kachel.",
      "description": "Längerer Text.\n\nLeerzeile trennt Absätze.",
      "tags": ["Action", "Singleplayer"],
      "version": "1.0.0",
      "releaseDate": "2026-08-09",
      "sizeBytes": 48210934,
      "executable": "MeinSpiel.exe",
      "featured": true,
      "patchNotes": "• Erste Fassung",
      "cover": "https://.../cover.jpg",
      "hero": "https://.../banner.jpg",
      "screenshots": ["https://.../1.jpg"],
      "download": {
        "url": "https://github.com/DEIN-NAME/mein-spiel/releases/download/v1.0.0/mein-spiel.zip",
        "sha256": "…"
      }
    }
  ]
}
```

`cover`, `hero` und `screenshots` darfst du weglassen — der Launcher erzeugt dann
aus der Spiel-ID einen eigenen Farbverlauf als Platzhalter.

### 2. Wo der Launcher sie sucht

Die Adresse steht in der `package.json`:

```json
"ember": {
  "catalogUrl": "https://raw.githubusercontent.com/TOBI0458/launcher-katalog/main/games.json"
}
```

Von dort landet sie beim Bauen im fertigen Launcher. Sie zeigt auf **Raw**, nicht
auf die normale GitHub-Seite — sonst käme HTML statt JSON zurück.

In den Einstellungen steht sie **nicht** mehr. Sie stand dort einmal, zusammen
mit dem Installationsordner, und beide waren dieselbe Sorte Feld: richtig
ausgefüllt, von niemandem je angefasst, und wer sie doch anfasste, machte den
Launcher damit kaputt. Zum Ausprobieren lässt sich `manifestUrl` weiterhin in
`%APPDATA%Embersettings.json` überschreiben; ein leerer Wert holt den
eingebauten zurück. Der Installationsordner liegt fest unter `%APPDATA%EmberGames`
— der Knopf **Datenordner öffnen** führt hin.

---

## Ein Spiel veröffentlichen

1. Spielordner als ZIP packen. Die Startdatei sollte direkt im ZIP liegen (ein
   einzelner Wurzelordner ist auch in Ordnung — der Launcher zieht ihn heraus).
2. Prüfsumme berechnen:
   ```bash
   node -e "const c=require('crypto'),f=require('fs');console.log(c.createHash('sha256').update(f.readFileSync('mein-spiel.zip')).digest('hex'))"
   ```
3. Auf GitHub ein Release anlegen (z. B. Tag `v1.0.0`) und das ZIP als Asset
   anhängen.
4. In `games.json` den Eintrag ergänzen: `version`, `download.url`, `download.sha256`,
   `sizeBytes`.
5. Committen.

Beim nächsten Start des Launchers ist das Spiel bei allen sichtbar.

## Bilder für den Store

Ohne Bilder zeichnet Ember eine Farbfläche mit den Anfangsbuchstaben — als
Notnagel gedacht, nicht als Zustand. Drei Felder füllen ihn:

| Feld | wofür | Format |
| --- | --- | --- |
| `cover` | Kachel im Store, Miniatur in der Seitenleiste | hochkant, etwa 3:4 |
| `hero` | Banner im Rampenlicht und über der Detailseite | breit, etwa 8:3 |
| `screenshots` | Reihe „Eindrücke" auf der Detailseite | 16:9, zwei bis vier Stück |

Sie liegen im Katalog-Repo unter `art/` und werden über dieselbe Raw-Adresse
geholt wie die `games.json`. Embers CSP erlaubt Bilder nur von `https:` und aus
dem Launcher selbst — ein Bild von einem `http://`-Server wird stillschweigend
geblockt.

**Beim Banner links Platz lassen.** Titel, Entwickler und Schlagwörter liegen
dort darüber; ein Motiv in der linken Hälfte verschwindet unter der Schrift.

Der Farbverlauf bleibt unter dem Bild liegen, statt durch es ersetzt zu werden.
Lädt eine Adresse nicht — kein Netz, Datei umbenannt, Tippfehler —, steht
wenigstens die Farbe des Spiels da statt eines leeren grauen Rechtecks.

---

## Ein Spiel ankündigen, bevor es fertig ist

Einen Katalogeintrag **ohne `download`** anlegen. Der Launcher zeigt dann
„Demnächst verfügbar" statt eines Installieren-Knopfes. Sobald `publish-game`
die Download-Adresse einträgt, wird von selbst ein Knopf daraus — es gibt kein
zusätzliches Feld, das man später wieder entfernen müsste.

Kommt ein **`releaseAt`** dazu, wird aus der Ankündigung ein Countdown:

```json
"releaseAt": "2026-09-18"
```

Auf der Kachel steht dann „In 7 Tagen", „Morgen" oder „Heute", auf der
Detailseite zusätzlich das ausgeschriebene Datum. Ein reines Datum zählt als
Kalendertag und nicht als Zeitpunkt — sonst wäre ein Spiel, das für Freitag
angekündigt ist, am Freitag um 0:01 Uhr schon überfällig, und „erscheint heute"
käme nie. Eine Uhrzeit darf trotzdem dabeistehen
(`"2026-09-18T17:00:00+02:00"`), dann zählt sie stundengenau.

Ember meldet sich dazu **zweimal, nicht täglich**: am Tag davor und am Tag
selbst. Und noch einmal, wenn aus der Ankündigung wirklich etwas geworden ist —
sobald der Eintrag eine Download-Adresse bekommt, heißt es „ist jetzt da".
Verstreicht der Termin, ohne dass etwas nachkommt, schweigt Ember und schreibt
auf die Detailseite, dass es noch dauert. Ein Countdown, der ein Versprechen
wiederholt, das keiner einhält, ist schlimmer als gar keiner.

---

## Ein Update ausliefern

Genau derselbe Weg, nur mit einer höheren `version`. Der Launcher vergleicht die
Versionsnummern, zeigt ein oranges **Update**-Abzeichen und lädt — je nach
Einstellung — beim Start automatisch herunter.

Die alte Fassung wird erst beiseitegeschoben, wenn das neue ZIP vollständig
geladen und entpackt ist, und erst nach dem geglückten Tausch gelöscht. Geht
dabei etwas schief, kommt sie zurück. Der Arbeitsordner liegt dafür **im**
Installationsordner (`.ember-work-<id>`) und nicht im Temp-Ordner: Nur so ist
das Verschieben immer auf demselben Laufwerk und damit unteilbar.

**Die `sha256` ist Pflicht.** Fehlt sie im Katalog oder stimmt sie nicht,
verweigert der Launcher die Installation, statt eine unbekannte Datei zu
entpacken. `publish-game.js` und der Demo-Katalog schreiben sie immer.

**Abgebrochene Downloads werden fortgesetzt.** Reißt die Verbindung ab, bleibt
das Teilstück liegen und der nächste Versuch lädt nur den Rest — über eine
`Range`-Anfrage. Ein Abbruch **von Hand** verwirft es dagegen; das ist eine
Entscheidung, kein Fehler. Liegengebliebene Teilstücke räumt der Launcher nach
zwei Wochen selbst weg.

Vor dem Download wird geprüft, ob überhaupt genug Platz frei ist — grob mit dem
2,2-Fachen der Downloadgröße gerechnet.

### Wann Ember nachsieht — und wann es etwas sagt

| | wie oft | was dann passiert |
| --- | --- | --- |
| Katalog (neue Spiele, Spiel-Updates) | alle 15 Minuten | Meldung; Updates werden geladen, wenn die Automatik an ist |
| Ember selbst | alle 6 Stunden | Meldung; geladen wird erst auf Klick |
| Angekündigte Spiele | bei jedem Blick in den Katalog | Meldung am Tag davor, am Tag selbst und wenn es wirklich da ist |

Beides lief vorher schlechter, und beide Lücken fallen erst nach Stunden auf.
Die Suche nach einer neuen Ember-Fassung lief **genau einmal beim Start** —
schlug sie fehl, weil das WLAN noch nicht stand, hielt sich der Launcher den
Rest der Sitzung für aktuell. Und gemeldet wurde ein Spiel-Update nur, wenn
Ember es **selbst herunterlud**: Wer „automatisch herunterladen" abgewählt
hatte — also gerade der, der selbst entscheiden will —, erfuhr überhaupt
nichts davon.

Liegt Ember im Hintergrund oder eingeklappt, kommt die Meldung zusätzlich von
Windows; im Vordergrund bleibt es bei der Einblendung, weil zwei Meldungen für
dieselbe Sache nicht doppelt so hilfreich sind. Dafür setzt `main.js` beim
Start die `AppUserModelId` — **ohne sie verwirft Windows jede Benachrichtigung
stillschweigend**, ohne Fehler und ohne Hinweis.

Abschalten lässt sich das Ganze unter *Einstellungen → „Bescheid sagen, wenn es
etwas Neues gibt"*. Updates werden dann weiter geladen, nur eben wortlos.

### Warum das Nachsehen im Hauptprozess liegt

Bis 0.6.1 zählte die Oberfläche mit: Sie holte den Katalog, verglich die
Fassungen und schickte die Meldung an Windows. Das setzt ein offenes Fenster
voraus — und damit meldete sich Ember genau dann, wenn man ohnehin schon
hinsah. Seit 0.6.2 macht das `electron/wache.js` im Hauptprozess. Die
Oberfläche bekommt den fertigen Katalog über `catalog:changed` und die Meldung
über `wache:meldung` zugeschickt und zeigt beides nur noch an.

Das ist die Bedingung dafür, dass Ember ohne Fenster laufen kann — und das ist
der eigentliche Zweck: ein Launcher, der nichts anzukündigen hat, solange
niemand ihn aufmacht, kündigt nie etwas an.

---

## Mit Windows starten, im Hintergrund warten

Ember trägt sich beim ersten Start selbst in den Autostart ein, mit dem
Zusatz `--hintergrund`. Mit diesem Zusatz wird **kein Fenster gebaut** — es
gibt nur das Symbol im Infobereich neben der Uhr, und dahinter das
Viertelstunden-Nachsehen.

Gemessen auf einem Rechner mit 16 Kernen:

| | Prozesse | Speicher | Rechenzeit im Leerlauf |
| --- | --- | --- | --- |
| Fenster offen | 4 | ~385 MB | — |
| `--hintergrund` | 3 | ~175 MB | 0,016 s in 60 s |

Der Unterschied ist der Renderer: Wo kein Fenster ist, gibt es keinen. Dazu
schaltet Ember im Hintergrundstart die Grafikbeschleunigung ab
(`disableHardwareAcceleration`), die ohne Fenster nichts zu tun hat.

Zwei Schalter in den Einstellungen:

| Schalter | Vorgabe | was er tut |
| --- | --- | --- |
| Mit Windows starten | an | `app.setLoginItemSettings` mit `--hintergrund` |
| Beim Schließen im Hintergrund weiterlaufen | an | das X schließt das Fenster, nicht das Programm |

Ganz beenden geht über *Rechtsklick auf das Symbol → „Ember beenden"*. Beim
ersten Zuklappen sagt Ember einmal Bescheid, dass es noch da ist — sonst sucht
man es im Task-Manager.

Im Entwicklungsbetrieb (`npm start`) wird der Autostart **nicht** gesetzt.
Sonst trüge sich der Ordner mit dem Quelltext in den Autostart ein.

---

## Den Launcher selbst verteilen

```bash
npm run release
```

> Mehrzeilige Beschreibungen gehören in eine Datei: `--notes-file notizen.txt`.
> `--notes "…"` funktioniert nur einzeilig — npm reicht Argumente durch die
> Konsole weiter, und dabei überlebt kein Zeilenumbruch. Bei v0.2.0 stand
> deshalb nur die erste Zeile im Release. Das Skript lehnt mehrzeilige
> `--notes` inzwischen ab, statt sie still abzuschneiden.
>
> Die Release-Beschreibung ist nicht nur Zierde: Der Launcher zeigt sie unter
> **Einstellungen → Launcher** als Änderungsliste an.

### Die Falle beim Packen

**electron-builder wirft seinen eigenen `build`-Abschnitt beim Packen aus der
`package.json` heraus.** Im Quelltext ist er da, im ausgelieferten Launcher
nicht. Wer zur Laufzeit etwas aus `build.*` liest, baut sich damit einen Fehler,
den man im Entwicklungsmodus **grundsätzlich nicht sehen kann** — genau das ist
in v0.4.0 passiert, die Änderungsliste meldete „keine Verbindung" bei bestem
Netz.

Alles, was der laufende Launcher aus der `package.json` liest, gehört deshalb in
den eigenen **`ember`**-Abschnitt:

```json
"ember": {
  "catalogUrl": "https://raw.githubusercontent.com/…/games.json",
  "gamesRepo": "launcher-katalog",
  "launcherRepo": "TOBI0458/ember"
}
```

`launcherRepo` steht bewusst doppelt — einmal hier, einmal unter
`build.publish`, weil electron-builder es dort braucht. Zwei Stellen, die
dasselbe sagen müssen, laufen irgendwann auseinander; deshalb **vergleicht
`npm run release` sie** und bricht bei Widerspruch ab. Zusätzlich sieht das
Skript nach dem Bauen in das fertige `app.asar` hinein und prüft, ob dort noch
alles steht, was zur Laufzeit gebraucht wird.

Baut den Windows-Installer, legt das GitHub-Release an und hängt `latest.yml`
mit dazu — die Datei, an der alle schon verteilten Launcher das Update erkennen.

Für eine neue Fassung dasselbe mit höherer Nummer:

```bash
npm run release -- --version 0.2.0
```

Der Launcher prüft beim Start auf neue Versionen, lädt sie im Hintergrund und
zeigt unten eine Leiste zum Neustarten an. Ausführlich in
[VERTEILEN.md](VERTEILEN.md).

`npm run dist` baut nur, ohne zu veröffentlichen.

---

## Sprache

Der Launcher spricht Deutsch und Englisch. Ohne Einstellung richtet er sich nach
der Sprache von Windows; unter **Einstellungen → Sprache** lässt sich eine feste
Sprache wählen. Der Wechsel gilt sofort, ohne Neustart.

Eine weitere Sprache sind zwei Schritte in [`src/i18n.js`](src/i18n.js): eine
Zeile in `LANGUAGES` und ein Block mit denselben Schlüsseln in `STRINGS`. Fehlt
ein Schlüssel, nimmt der Launcher den englischen Text — eine halb übersetzte
Sprache macht die Oberfläche also nicht kaputt.

## Ember wieder loswerden

Drei Wege, alle führen zum selben Programm:

- **Einstellungen → Ember entfernen → Ember deinstallieren**
- `Uninstall Ember.exe` im Installationsordner
- Windows-Einstellungen → Apps

Installierte Spiele und die Bibliothek unter `%APPDATA%\Ember\` bleiben dabei
liegen. Wer auch die loswerden will, löscht den Ordner von Hand.

---

## Aufbau des Projekts

| Pfad | Aufgabe |
| --- | --- |
| `electron/main.js` | Fenster, Infobereich, Autostart, IPC, Selbstupdate, Changelog aus der GitHub-API |
| `electron/wache.js` | sieht alle 15 Minuten im Katalog nach und meldet, was neu ist |
| `electron/preload.js` | die einzige Brücke zwischen Oberfläche und Node |
| `electron/catalog.js` | `games.json` laden, mit Offline-Cache |
| `electron/download.js` | HTTPS-Download mit Weiterleitungen, Fortsetzen, Fortschritt, sha256 |
| `electron/installer.js` | entpacken, Ordner tauschen, starten, deinstallieren |
| `electron/queue.js` | Warteschlange, ein Download nach dem anderen |
| `electron/store.js` | Einstellungen und Bibliothek als JSON |
| `src/` | die Oberfläche (HTML, CSS, ein JS) |
| `src/i18n.js` | alle sichtbaren Texte, je Sprache einmal — auch die des Hauptprozesses |
| `nsis/installer.nsh` | Willkommens- und Schlussseite des Installers |
| `scripts/make-demo.js` | baut den Demo-Katalog |
| `scripts/publish-game.js` | packt ein Spiel und trägt es in den Katalog ein |
| `scripts/release-launcher.js` | baut den Installer und veröffentlicht ihn |
| `scripts/make-icon.js` | zeichnet `build/icon.png` für den Installer |
| `scripts/make-installer-art.js` | zeichnet die beiden Bilder im Installer |

Einstellungen und Bibliothek liegen unter
`%APPDATA%\Ember\` und sind normale, lesbare JSON-Dateien.

Wenn etwas klemmt, startet

```bash
set LAUNCHER_DEVTOOLS=1 && npm start
```

den Launcher mit offenen Entwicklerwerkzeugen. Fehler aus dem Hauptprozess
stehen ohnehin im Terminal.

---

## Was noch fehlt

Bewusst nicht gebaut, weil dafür ein eigener Server nötig wäre: Nutzerkonten,
Freundeslisten, Käufe, Cloud-Spielstände und ein Upload-Formular im Launcher.
Das Hochladen läuft aktuell über GitHub.
