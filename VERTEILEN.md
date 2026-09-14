# Verteilen: Launcher und Spiele

Wie du den Launcher einmal an Leute gibst und danach alles automatisch
aktualisierst — Launcher wie Spiele.

---

## Das Grundprinzip in vier Zeilen

```
Du schickst einen Link. EINMAL.           ─►  danach nie wieder eine Datei
Der Launcher aktualisiert sich selbst.    ─►  aus dem Repo TOBI0458/ember
Der Launcher holt die Spieleliste.        ─►  games.json aus launcher-katalog
Der Launcher lädt die Spiele.             ─►  ZIPs aus deinen GitHub-Releases
```

---

## Was schon eingerichtet ist

Das musst du nicht mehr anfassen:

| | |
| --- | --- |
| `github.com/TOBI0458/ember` | öffentlich, hier liegen die Launcher-Releases |
| `github.com/TOBI0458/launcher-katalog` | öffentlich, hier liegt die `games.json` |
| Katalog-Adresse | **fest im Launcher eingebaut** |
| Selbstupdate | verdrahtet, zeigt auf das `ember`-Repo |
| Symbol | wird beim Bauen aus `scripts/make-icon.js` gezeichnet |

Wichtig ist der dritte Punkt: Wer den Launcher installiert, sieht deine Spiele
**sofort**. Niemand muss in den Einstellungen eine URL eintragen.

---

## Einmalig: GitHub-Kommandozeile anmelden

Ohne sie geht alles auch, nur von Hand im Browser. Mit ihr ist Veröffentlichen
ein einziger Befehl.

```bash
winget install GitHub.cli
```

```bash
gh auth login
```

Wähle dort **GitHub.com → HTTPS → Login with a web browser**. Das musst du
selbst machen — dein Passwort geht niemanden sonst etwas an.

---

## Den Launcher veröffentlichen

```bash
npm run release
```

Das Skript baut den Installer, prüft die Dateien und legt das GitHub-Release an.
Dauert beim ersten Mal ein paar Minuten.

> **Warum es die `latest.yml` extra prüft:** An dieser kleinen Datei erkennen
> alle schon verteilten Launcher, dass es etwas Neues gibt. Fehlt sie im
> Release, passiert einfach nichts — und du merkst es erst Wochen später.

---

## Den Link verschicken

```
https://github.com/TOBI0458/ember/releases/latest
```

Diesen einen Link. Mehr braucht niemand, für immer.

**Sag dazu, dass Windows warnen wird.** Beim ersten Start erscheint „Der
Computer wurde durch Windows geschützt". Der Grund ist nicht dein Programm,
sondern die fehlende Signatur — die kostet mehrere hundert Euro im Jahr.

> Auf **„Weitere Informationen"** klicken, dann auf **„Trotzdem ausführen"**.

Dieser Hinweis steht auch automatisch in jedem Release, das `npm run release`
anlegt. Deine Leute lesen ihn also direkt neben dem Download.

---

## Den Launcher aktualisieren

```bash
npm run release -- --version 0.2.0
```

Ein Befehl. Er setzt die Version hoch, baut neu und veröffentlicht.

Beim nächsten Start prüft jeder Launcher von selbst, lädt im Hintergrund und
blendet unten eine Leiste zum Neustarten ein. **Deine Leute machen nichts.**

Die Version **muss steigen** — sonst gibt es nichts zu erkennen. Das Skript
weigert sich, wenn du dieselbe Nummer noch einmal nimmst.

Danach den Quelltext hochladen, damit das Repo zum Release passt:

```bash
hochladen.bat
```

---

## Ein Spiel veröffentlichen oder aktualisieren

**In Unity bauen:** `Datei → Build Settings → Windows → Build`, in einen Ordner
wie `C:\Builds\HollowHalls`.

**Dann ein Befehl:**

```bash
npm run publish-game -- --id hollow-halls --title "The Hollow Halls" --version 0.1.0 --from "C:\Builds\HollowHalls"
```

Das Skript erledigt dabei allein:

- findet die richtige `.exe` im Build (Unitys Absturzhelfer wird übersprungen)
- packt den ganzen Ordner in ein ZIP
- rechnet Größe und SHA-256-Prüfsumme aus
- trägt Version, Startdatei, Größe, Prüfsumme und Download-Adresse in die
  `games.json` ein
- **warnt, wenn das ZIP über 2 GB liegt** — mehr nimmt GitHub pro Datei nicht an

Am Ende druckt es die zwei verbleibenden Schritte mit fertigen Befehlen aus:
das Release mit dem ZIP anlegen und den Katalog hochladen (`hochladen.bat`).

### Für ein Update

Derselbe Befehl, nur mit höherer Version. `--title` kannst du weglassen:

```bash
npm run publish-game -- --id hollow-halls --version 0.2.0 --from "C:\Builds\HollowHalls" --notes "Wesen wartet jetzt|Neuer Gang im Untergeschoss"
```

**Deine Beschreibungstexte, Bilder und Tags bleiben dabei unangetastet** — das
Skript fasst nur die technischen Felder an. Patchnotes trennst du mit `|`.

---

## Was deine Leute davon merken

| Du machst | Sie merken |
| --- | --- |
| Launcher-Update veröffentlicht | Leiste oben: „Update steht bereit" mit einem Knopf zum **Herunterladen**, danach zum Neustarten. Ab 0.3.0 wird still eingespielt — kein Assistent, keine Ordnerwahl |
| Neues Spiel veröffentlicht | Es taucht im Store auf — spätestens nach 15 Minuten, ohne Neustart |
| Spiel-Update veröffentlicht | Oranges **Update**-Abzeichen, lädt je nach Einstellung von selbst |

Sie bekommen von dir nie wieder eine Datei.

---

## Wenn etwas klemmt

**Store bleibt leer** — normal, solange in der `games.json` nichts steht. Der
Launcher sagt das auch offen: „Der Store ist noch leer".

**„Katalog konnte nicht geladen werden"** — das Katalog-Repo steht auf privat.
Es muss öffentlich sein, sonst kommt niemand an die Datei.

**Launcher aktualisiert sich nicht** — fast immer die fehlende `latest.yml` im
Release, oder die Version wurde nicht erhöht.

**„Die Änderungen lassen sich gerade nicht laden"** trotz Internet — dann fehlt
im gepackten Launcher eine Angabe aus der `package.json`. Beim Packen räumt
electron-builder dort auf; was zur Laufzeit gebraucht wird, gehört in den
`ember`-Abschnitt. `npm run release` prüft das seit v0.5.0 selbst und bricht
vorher ab.

**Spiel lädt, startet aber nicht** — der `executable`-Eintrag passt nicht zur
echten Datei. Mit `publish-game` kann das nicht passieren, bei Handarbeit schon.

**Prüfsummenfehler beim Installieren** — das ZIP im Release ist ein anderes als
das, aus dem die Prüfsumme stammt. Neu hochladen. Der Launcher bricht hier
absichtlich ab, statt eine kaputte Datei zu entpacken — die bereits installierte
Fassung bleibt dabei unversehrt, und das kaputte Teilstück wird verworfen,
damit der nächste Versuch nicht dieselben Bytes fortsetzt.

**„Fehlt eine gültige Prüfsumme"** — im Katalogeintrag steht keine `sha256`.
Seit der Absicherung wird ohne sie nicht mehr installiert. `publish-game`
schreibt sie immer; bei einem von Hand gepflegten Eintrag nachtragen.

**„Zu wenig Speicherplatz"** — kommt jetzt VOR dem Download statt mittendrin.
Gerechnet wird mit dem 2,2-Fachen der Downloadgröße, weil das ZIP und die
entpackte Fassung eine Zeit lang nebeneinander liegen.

**Windows warnt beim Installieren** — erwartet, siehe oben. Kein Fehler.
