# Ember

Ein Spiele-Launcher im Steam/Epic-Stil. Du lädst deine Spiele einmal als ZIP zu
GitHub hoch — alle anderen bekommen sie und jedes spätere Update automatisch über
den Launcher. Du musst niemandem mehr eine Datei schicken.

```bash
npm install
npm start
```

Beim ersten Start läuft der Launcher gegen einen mitgelieferten Demo-Katalog mit
drei kleinen, wirklich spielbaren Spielen. Damit kannst du Installieren,
Aktualisieren, Starten und Deinstallieren sofort ausprobieren, ohne irgendetwas
einzurichten.

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

### 2. Die Roh-URL im Launcher eintragen

Öffne auf GitHub deine `games.json`, klicke **Raw** und kopiere die Adresse. Sie
sieht so aus:

```
https://raw.githubusercontent.com/DEIN-NAME/mein-launcher-katalog/main/games.json
```

Diese URL trägst du im Launcher unter **Einstellungen → Katalog-URL** ein. Fertig.

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

## Ein Update ausliefern

Genau derselbe Weg, nur mit einer höheren `version`. Der Launcher vergleicht die
Versionsnummern, zeigt ein oranges **Update**-Abzeichen und lädt — je nach
Einstellung — beim Start automatisch herunter. Der alte Spielordner wird erst
ersetzt, wenn das neue ZIP vollständig geladen und entpackt ist. Bricht der
Download ab, bleibt die installierte Version unangetastet.

Die `sha256` ist optional, aber empfohlen: stimmt sie nicht, bricht der Launcher
die Installation ab, statt eine kaputte Datei zu entpacken.

---

## Den Launcher selbst verteilen

```bash
npm run dist
```

Das erzeugt einen Windows-Installer unter `dist/`. Den schickst du **einmal** an
deine Spieler. Danach aktualisiert sich der Launcher selbst über GitHub-Releases:

1. In `package.json` unter `build.publish` deinen GitHub-Namen und das Repo eintragen.
2. `version` in `package.json` erhöhen, `npm run dist` laufen lassen.
3. Die Dateien aus `dist/` (inklusive `latest.yml`) als GitHub-Release hochladen.

Der Launcher prüft beim Start auf neue Versionen, lädt sie im Hintergrund und
zeigt unten eine Leiste zum Neustarten an.

---

## Aufbau des Projekts

| Pfad | Aufgabe |
| --- | --- |
| `electron/main.js` | Fenster, IPC, Selbstupdate |
| `electron/preload.js` | die einzige Brücke zwischen Oberfläche und Node |
| `electron/catalog.js` | `games.json` laden, mit Offline-Cache |
| `electron/download.js` | HTTPS-Download mit Weiterleitungen, Fortschritt, sha256 |
| `electron/installer.js` | entpacken, Ordner tauschen, starten, deinstallieren |
| `electron/queue.js` | Warteschlange, ein Download nach dem anderen |
| `electron/store.js` | Einstellungen und Bibliothek als JSON |
| `src/` | die Oberfläche (HTML, CSS, ein JS) |
| `scripts/make-demo.js` | baut den Demo-Katalog |

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
