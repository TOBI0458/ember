# Verteilen: Launcher und Spiele

Wie du den Launcher einmal an Leute gibst und danach alles automatisch
aktualisierst — Launcher wie Spiele.

---

## Das Grundprinzip in vier Zeilen

```
Du schickst den Launcher EINMAL.          ─►  danach nie wieder eine Datei
Der Launcher aktualisiert sich selbst.    ─►  aus deinem Launcher-Repo
Der Launcher holt die Spieleliste.        ─►  games.json in deinem Katalog-Repo
Der Launcher lädt die Spiele.             ─►  ZIPs aus deinen GitHub-Releases
```

Alles Weitere ist nur noch die Frage, welche Datei wohin gehört.

---

## Schritt 0 — GitHub einrichten (nur einmal, und nur du)

Das ist der einzige Teil, den dir niemand abnehmen kann.

**1. Konto anlegen** auf [github.com](https://github.com) — kostenlos.
Merk dir deinen Benutzernamen, den brauchst du gleich überall.

**2. Zwei öffentliche Repos anlegen:**

| Repo | Wofür |
| --- | --- |
| `launcher-katalog` | die `games.json` **und** die Spiel-ZIPs als Releases |
| `ember` | der Launcher selbst, für seine eigenen Updates |

Beide müssen **öffentlich** sein, sonst kommen deine Spieler nicht an die
Dateien.

**3. Git auf deinem Rechner bekannt machen:**

```bash
git config --global user.name "Tobias"
```

```bash
git config --global user.email "tobias2009.gf@gmail.com"
```

**4. Deinen Namen in die `package.json` eintragen.** Dort steht noch
`DEIN-GITHUB-NAME` als Platzhalter, unter `build` → `publish` → `owner`.
Solange der drinsteht, weigert sich das Veröffentlichungsskript — mit Absicht.

**5. Empfehlenswert: die GitHub-Kommandozeile installieren.** Damit werden
Releases ein Einzeiler statt Klickerei im Browser:

```bash
winget install GitHub.cli
```

Danach einmal anmelden mit `gh auth login`.

---

## Schritt 1 — Den Katalog anlegen

Lege in deinem `launcher-katalog`-Repo eine Datei `games.json` an, erst einmal
mit leerer Liste:

```json
{ "manifestVersion": 1, "games": [] }
```

Klicke dann auf **Raw** und kopiere die Adresse. Sie sieht so aus:

```
https://raw.githubusercontent.com/DEIN-NAME/launcher-katalog/main/games.json
```

Diese URL trägst du im Launcher unter **Einstellungen → Katalog-URL** ein.
Ab jetzt schaut der Launcher dort nach, was es zu spielen gibt.

---

## Schritt 2 — Den Launcher an Leute schicken

```bash
npm run dist
```

Das legt in `dist/` einen Windows-Installer an (`Ember Setup 0.1.0.exe`).

Diesen Installer lädst du als **Release in dein `ember`-Repo** hoch —
zusammen mit der Datei `latest.yml`, die daneben liegt.

> **Die `latest.yml` ist der wichtigste Teil.** An ihr erkennt der Launcher
> später, dass es eine neuere Fassung gibt. Vergisst du sie, funktioniert das
> Selbstupdate nicht, und du merkst es erst beim nächsten Mal.

Deinen Leuten schickst du dann nur noch den Link auf dieses Release. Kein
Anhang, keine Datei per Chat — ein Link, einmal.

---

## Schritt 3 — Den Launcher aktualisieren

1. `version` in der `package.json` erhöhen, z. B. `0.1.0` → `0.2.0`
2. `npm run dist`
3. Alles aus `dist/` als **neues Release** hochladen, `latest.yml` inklusive

Fertig. Beim nächsten Start prüft der Launcher von selbst, lädt im Hintergrund
und blendet unten eine Leiste zum Neustarten ein. **Deine Spieler machen
nichts.**

---

## Schritt 4 — Ein Spiel veröffentlichen oder aktualisieren

Hier ist der Weg jetzt fast vollständig automatisch.

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
das Release anlegen und den Katalog hochladen.

### Für ein Update

Genau derselbe Befehl, nur mit höherer Version. `--title` kannst du weglassen:

```bash
npm run publish-game -- --id hollow-halls --version 0.2.0 --from "C:\Builds\HollowHalls" --notes "Wesen wartet jetzt|Neuer Gang im Untergeschoss"
```

**Deine Beschreibungstexte, Bilder und Tags bleiben dabei unangetastet** — das
Skript fasst nur die technischen Felder an. Patchnotes trennst du mit `|`.

---

## Was deine Spieler davon merken

| Du machst | Sie merken |
| --- | --- |
| Launcher-Update veröffentlicht | Leiste unten: „Neustarten zum Aktualisieren" |
| Neues Spiel veröffentlicht | Es taucht im Store auf |
| Spiel-Update veröffentlicht | Oranges **Update**-Abzeichen, lädt je nach Einstellung von selbst |

Sie bekommen von dir nie wieder eine Datei.

---

## Wenn etwas klemmt

**„Katalog konnte nicht geladen werden"** — Repo ist nicht öffentlich, oder die
URL zeigt auf die normale GitHub-Seite statt auf **Raw**. Sie muss mit
`raw.githubusercontent.com` anfangen.

**Spiel lädt, startet aber nicht** — der `executable`-Eintrag passt nicht zur
echten Datei. Wenn du mit `publish-game` arbeitest, kann das nicht passieren;
bei Handarbeit schon.

**Launcher aktualisiert sich nicht** — fast immer die vergessene `latest.yml`,
oder `owner`/`repo` in der `package.json` stimmen nicht.

**Prüfsummenfehler beim Installieren** — das ZIP im Release ist ein anderes als
das, aus dem die Prüfsumme stammt. Neu hochladen. Der Launcher bricht hier
absichtlich ab, statt eine kaputte Datei zu entpacken — die bereits installierte
Fassung bleibt dabei unversehrt.
