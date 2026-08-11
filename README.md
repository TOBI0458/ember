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

Zum Ausprobieren gibt es drei kleine, wirklich spielbare Beispiele. Dafür in den
Einstellungen als Katalog-URL einfach `demo` eintragen.

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
auf die normale GitHub-Seite — sonst käme HTML statt JSON zurück. Im Feld
**Einstellungen → Katalog-URL** lässt sie sich überschreiben; leert man das Feld,
gilt wieder der eingebaute Wert.

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
npm run release
```

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
| `scripts/publish-game.js` | packt ein Spiel und trägt es in den Katalog ein |
| `scripts/release-launcher.js` | baut den Installer und veröffentlicht ihn |
| `scripts/make-icon.js` | zeichnet `build/icon.png` für den Installer |

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
