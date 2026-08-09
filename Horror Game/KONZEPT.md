# THE HOLLOW HALLS

*Ego-Horror · Unity 6.3 · Konzeptstand: 9. August 2026*

---

## Der Kern in einem Satz

**Du bist in einem stockdunklen Bunker mit etwas, das blind ist — aber alles hört.
Und du machst Geräusche, ob du willst oder nicht.**

---

## Warum genau diese Idee

Das ist kein zufälliger Einfall. Die Idee ist danach ausgesucht, dass **du sie
allein fertig bekommst.** Drei Dinge, die sonst ein ganzes Team brauchen, fallen
hier weg:

| Übliches Problem | Wie diese Idee es umgeht |
| --- | --- |
| Du brauchst gute 3D-Modelle | Ein Wesen, das man nie richtig sieht, ist gruseliger **und** billiger. Dunkelheit ist hier kein Verstecken von Schwächen, sondern die Spielmechanik. |
| Du brauchst Texturen und Materialien | Beton. Grau. Deine Graubox-Testszene **ist** schon die fertige Optik. |
| Du brauchst Gegner-KI, die den Spieler sieht | Sichtkegel, Verdeckung, Sichtlinien — das ist der Teil, an dem Anfängerprojekte hängen bleiben. Ein blindes Wesen braucht davon nichts. Es läuft zum lautesten Geräusch. Das ist ein Bruchteil des Aufwands und geht fast nie kaputt. |

Dazu kommt der eigentliche Grund: **Angst, die der Spieler sich selbst macht,
ist stärker als jeder Schreckmoment, den du einbaust.** Wenn das Wesen dich
findet, weil *du* zu schnell gerannt bist, ist das deine Schuld. Genau das
bleibt hängen.

---

## Der Ort

Eine **Zivilschutzanlage aus dem Kalten Krieg**, seit den Neunzigern
stillgelegt. Vier Ebenen tief unter der Stadt. Betongänge, Schleusentüren,
Stockbetten in Reihen, ein Maschinenraum, ein Wassereinbruch im untersten
Geschoss.

Kein Strom außer der Notbeleuchtung, die alle paar Sekunden flackert.

Aber die Anlage ist nicht bloß verlassen — **sie ist aufgebrochen.** Wände sind
durchbrochen, Armierungseisen ragen frei, ganze Trennmauern sind eingestürzt.
Schutt liegt in den Gängen. Durch die Löcher siehst du in Räume, die auf keinem
Plan stehen.

### Warum die kaputten Wände so viel wert sind

Sie sind nicht nur Kulisse. Sie leisten drei Dinge auf einmal:

**Sie erzählen die Geschichte, ohne ein Wort zu sagen.** Der Beton ist nach
*innen* gedrückt — in die Gänge hinein. Was auch immer diese Wände
durchbrochen hat, kam nicht von draußen herein. Es wollte heraus.

**Sie sind eine Spielmechanik.** Schutt knirscht unter den Schuhen. Wo eine Wand
zusammengebrochen ist, liegt Geröll — und Geröll ist laut. Der Verfall ist damit
direkt die Gefahrenkarte: Die kaputtesten Stellen sind die gefährlichsten.
Zerstörung ist hier kein Dekor, sondern Spielregel.

**Sie brechen den Grundriss auf.** Ein Loch in der Wand ist eine Abkürzung, die
auf keinem Plan steht. Du kannst dem Spieler Wege geben, die er selbst findet —
und dem Wesen Wege, mit denen er nicht rechnet.

### Und in Unity ist es billiger, als es aussieht

Kaputt zu bauen klingt aufwendiger als glatt. Ist es hier nicht: Du brauchst
etwa acht bis zehn Wandbruchstücke und ein paar Schutthaufen und setzt sie
immer wieder neu zusammen. Weil es Trümmer sind, fällt Wiederholung nicht auf —
bei glatten Wänden dagegen sofort. **Unordnung verzeiht, was Ordnung verrät.**

Solche Anlagen gibt es wirklich. Du kannst Referenzfotos von echten Bunkern
suchen und musst dir nichts ausdenken.

---

## Warum bist du da unten

Du bist **Forscher aus der Zukunft**. Die alte Erde ist längst unbewohnbar,
und du gehörst zu denen, die zurückgeschickt werden, um zu dokumentieren, was
von ihr übrig ist. Diese Anlage steht auf deiner Liste. Reine Routine.

Bei dir ist **ORPHEUS**, ein Assistent, der dir am oberen Bildschirmrand
zugeschaltet ist. Er kennt Baupläne, liest Beschriftungen, misst Luftwerte und
sagt dir freundlich, wo es langgeht.

Das Zeitreisen-Gerüst leistet dabei still drei Dinge auf einmal: Es erklärt den
Verfall (Jahrhunderte, nicht Jahrzehnte), es erklärt, warum du einen Assistenten
hast — und es erklärt, warum du trotzdem **nichts** über diesen Ort weißt.

### ORPHEUS ist keine Hilfe. Er ist ein Risiko.

Ein freundlicher Begleiter macht Horror normalerweise kaputt: Angst braucht
Einsamkeit, und eine Stimme, die dir Tipps gibt, ist Gesellschaft. Eine einzige
Regel dreht das um:

> **ORPHEUS spricht laut. Und alles, was laut ist, hört das Wesen.**

Damit ist jeder Tipp eine Wette. Zuhören und riskieren, gefunden zu werden —
oder stummschalten und allein im Dunkeln zurechtkommen. Deine Hilfe ist deine
Gefahr, und sie läuft über dasselbe Geräuschsystem wie alles andere. Kostet
also fast keine zusätzliche Arbeit.

Zwei Dinge fallen daraus fast von selbst:

**Er kann das Wesen nicht wahrnehmen.** Er kennt nur seine Sensoren. Also sagt
er in ruhigem Ton *„der Gang voraus ist frei"* — während du Atmen hörst. Diese
Lücke zwischen dem, was er sagt, und dem, was du hörst, ist der beste Horror im
ganzen Spiel. Und sie kostet dich nur Textzeilen.

**Und irgendwann spricht das Wesen mit seiner Stimme.** Ab da lügt deine eigene
Anzeige, und du weißt nie mehr sicher, wer da redet.

> **Warum eine KI-Stimme hier keine Notlösung ist:** Eine synthetische Stimme
> für eine synthetische Figur ist die *richtige* Besetzung, nicht die
> zweitbeste. Du brauchst keinen Sprecher, keine Termine, und du kannst jede
> Zeile jederzeit ändern, ohne jemanden neu einzubestellen.

---

## Das Wesen

Es hat feste, ehrliche Regeln. Der Spieler muss sie durchschauen können — sonst
fühlt sich der Tod ungerecht an statt spannend.

1. **Es ist vollständig blind.** Deine Taschenlampe ist ihm völlig egal.
2. **Es hört alles.** Jedes Geräusch hat eine Reichweite. Es geht zum lautesten,
   das es wahrnimmt.
3. **Es weiß nie, wo du bist.** Es weiß nur, wo es zuletzt geknallt hat. Es
   schummelt nicht.
4. **Es sucht.** Am Geräuschort angekommen, tastet es die Umgebung ab, bevor es
   weiterzieht.
5. **Berührung heißt Tod.** Es gibt keine Waffe. Kämpfen ist keine Option.
6. **Du hörst es auch.** Schritte, Atmen, wie es an Wänden entlangstreift. Ihr
   belauert euch gegenseitig mit den Ohren.

### Der Zusatz, der es unvergesslich macht

Das Wesen **wiederholt Geräusche, die es gehört hat.** Eine zufallende Tür.
Ein Husten.

Und irgendwann, drei Ebenen tief, spricht es mit ORPHEUS' Stimme.

Das kostet dich technisch fast nichts — es ist dieselbe Tonspur, nur an
falscher Stelle abgespielt — und es ist der Moment, über den die Leute reden.

### Es wird schlauer

Nicht in einer einzigen Stufe, sondern über das ganze Spiel. Pro gefundener
Sicherung wird es ein anderes Tier:

| Stufe | Was sich ändert |
| --- | --- |
| 1 | Läuft zum Geräusch, sucht kurz, zieht weiter. Fällt zuverlässig auf Geworfenes herein. |
| 2 | Sucht länger. Öffnet Türen. Merkt sich Stellen, an denen es dich fast hatte. |
| 3 | **Es lernt zu warten.** Es geht hörbar weg — und bleibt dann lautlos stehen. |
| 4 | Wurfköder wirken nicht mehr: Es hört den Wurf *und* prüft, von wo geworfen wurde. |

Stufe 3 ist der Moment, in dem Leute den Controller weglegen. Du hörst es
weggehen, du kommst aus dem Spind — und es steht da.

> **Wichtig: das ist kein maschinelles Lernen, und das soll es auch nicht sein.**
> Echte lernende KI ist der Punkt, an dem Projekte sterben — nicht testbar,
> nicht nachvollziehbar, und wenn sie sich falsch verhält, weißt du nie warum.
>
> Was der Spieler als Lernen empfindet, sind ein paar Zähler: Welches Versteck
> nimmt er meistens? Rennt er oder schleicht er? Welchen Weg läuft er? Danach
> gewichtest du das Verhalten — beliebte Verstecke werden zuerst nachgesehen,
> die Lieblingsroute öfter patrouilliert.
>
> Das sind Zählvariablen, keine KI. Spieler schwören danach trotzdem Stein und
> Bein, dass es sie beobachtet hat. Und du kannst jederzeit nachstellen, wenn
> es zu hart oder zu lasch ist.

---

## Was du machst

Der Notausgang ist verriegelt, weil kein Strom da ist. Du musst den
Notstromdiesel im untersten Geschoss anwerfen. Dafür fehlen **drei Sicherungen**,
die in verschiedenen Ecken der Anlage liegen.

Das ist der Rahmen. Der Reiz steckt nicht im Suchen, sondern im **Wie**: Jeder
Weg zu jeder Sicherung ist eine Frage von Lautstärke.

### Wie du Lärm machst

| Was du tust | Wie weit man es hört |
| --- | --- |
| Geduckt schleichen | fast nichts — aber quälend langsam |
| Normal gehen | mittel |
| Rennen | sehr weit |
| Tür schnell aufreißen | laut |
| Tür langsam aufdrücken (Taste halten) | leise |
| Etwas werfen | laut — **dort, wo es aufkommt** |

**Der Boden zählt mit.** Beton ist normal. Pfützen platschen. **Schutt knirscht.**
Scherben sind eine Katastrophe. Metallgitter dröhnen.

Damit wird Leveldesign zu Sounddesign: Wenn du eine Pfütze in einen Gang legst,
hast du eine Gefahrenzone gebaut, ohne ein einziges Skript zu schreiben.

### Und jetzt der Haken

**Rennen macht außer Atem. Außer Atem sein macht Lärm.**

Du rennst weg, du entkommst — und dann steht dein Charakter keuchend im Dunkeln
und verrät sich selbst. Du kannst die **Luft anhalten** (Taste halten): Dann bist
du still. Aber nur ein paar Sekunden, und wenn du loslässt, schnappst du hörbar
nach Luft.

Das ist der emotionale Kern des Spiels: der Moment, in dem dein eigener Körper
gegen dich arbeitet und du nur noch eine Taste hast, um dagegenzuhalten.

### Verstecken

Spinde und Stockbetten. Aber ein Versteck ist **nicht automatisch sicher** —
es ist nur ein Ort, an dem du still sein musst, während es vorbeigeht. Sicherheit
kommt nie vom Ort, immer vom Verhalten.

### Der Dieselgenerator

Läuft er, ist er ohrenbetäubend. Er übertönt jeden Laut, den du machst — **und
jeden Laut, den das Wesen macht.** Du bist unhörbar und gleichzeitig taub.

Das letzte Stück des Spiels spielst du blind und taub zugleich. Dafür läuft der
ganze Rest des Spiels auf diesen Moment zu.

---

## Was das Spiel gruselig macht

Vier Grundsätze, an denen ich jede spätere Entscheidung messen würde:

**Stille ist die Hauptzutat.** Keine Dauermusik. Musik markiert, dass gleich
etwas passiert — und nimmt damit die Angst weg. Töne nur sparsam und tief.

**Nicht zeigen.** Das Wesen darf höchstens dreimal im ganzen Spiel wirklich zu
sehen sein, und nie lange. Was der Spieler sich selbst zusammenreimt, ist immer
schlimmer als jedes Modell, das du bauen könntest.

**Keine Erklärung.** Was da unten passiert ist, steht nirgends vollständig.
Notizen und Marisas Stimme deuten an. Ein erklärtes Monster ist ein zahmes
Monster.

**Fair bleiben.** Nie aus dem Nichts hinter dem Spieler auftauchen. Immer eine
Vorwarnung — ein Geräusch, ein Schatten. Der Spieler soll denken *„ich hätte es
wissen können"*, nicht *„das war unfair"*.

---

## Umfang — bitte klein bleiben

Der häufigste Grund, warum erste Spiele nie fertig werden, ist nicht fehlendes
Können. Es ist zu viel Umfang.

**Ziel: 45 bis 60 Minuten Spielzeit.** Das klingt nach wenig. Es ist für ein
erstes Projekt allein trotzdem viel Arbeit — und ein fertiges kurzes Spiel ist
unendlich mehr wert als ein halbes langes.

### In drei Stufen

**Stufe 1 — Prototyp**
Ein Gang, ein Raum, ein Spinde. Laufen, ducken, Luft anhalten, Taschenlampe.
Das Wesen läuft zu Geräuschen. Es fängt dich, du stirbst.
*Ziel: herausfinden, ob die Geräuschmechanik Spaß macht. Sonst bauen wir um.*

**Stufe 2 — Erste Ebene komplett**
Eine ganze Bunkerebene, eine Sicherung, Marisa im Funk, Türen mit
Geschwindigkeit, Untergrundmaterialien, Sterben und Neuladen.
*Ziel: einmal von vorne bis hinten spielbar. Ab hier kannst du es Leuten zeigen.*

**Stufe 3 — Volles Spiel**
Alle Ebenen, drei Sicherungen, der Generator, das Ende, die Stimme des Wesens.

### Was nicht ins erste Spiel gehört

Mehrspieler. Kampf. Ein Inventar mit vielen Gegenständen. Mehrere Enden.
Sprachausgabe in mehreren Sprachen. Konsolen.

Alles davon kann später kommen. Nichts davon macht Stufe 1 besser.

---

## Die Engine: Unity, nicht Unreal

Entschieden am 9. August 2026, nach einem Blick auf die Hardware.

Der Laptop hat einen **Ryzen 7 7730U mit integrierter Grafik** — keine
dedizierte Grafikkarte. Damit fällt Unreal aus, und zwar aus dem einzigen
Grund, der zählt: **Lumen und Nanite, also genau das, wofür man Unreal nimmt,
laufen darauf nicht.** Dazu kommen Shader-Kompilierzeiten von einer Stunde auf
einem 15-Watt-Chip. Alle Nachteile, kein Vorteil.

Dazu drei praktische Gründe:

- **C#-Skripte sind Textdateien** — die kann ich dir schreiben. Unreals
  Blueprints sind zusammengeklickte Grafiken; da könnte ich dir nur beschreiben,
  was du selbst verbinden musst.
- **Buildgröße.** Unity landet bei 100–500 MB, Unreal schnell bei mehreren
  Gigabyte. GitHub-Releases erlauben 2 GB pro Datei — das ist der Weg, über den
  der Launcher ausliefert.
- **Wartezeit.** Codeänderung in Unity: Sekunden. In Unreal: Minuten. Über ein
  ganzes Projekt gerechnet ist das der größte Posten überhaupt.

*Sollte später ein Rechner mit richtiger Grafikkarte dazukommen, ist Unreal für
ein Folgeprojekt eine ernsthafte Überlegung wert. Für dieses Spiel — dunkel,
kantig, vom Ton getragen — bringt es nichts, was fehlen würde.*

---

## Technischer Plan (Unity 6.3)

| Baustein | Womit |
| --- | --- |
| Render-Pipeline | URP, Forward+ — gut für viele kleine Lichter |
| Bewegung | `CharacterController`, nicht Rigidbody. Deutlich weniger Ärger. |
| Eingabe | neues Input System |
| Wesen | `NavMeshAgent` + AI-Navigation-Paket, dazu ein Zustandsautomat: *Streifen → Nachsehen → Suchen → Verfolgen → Verloren* |
| Hören | ein `NoiseEvent(Position, Lautstärke)`, das gesendet wird. Das Wesen bewertet Lautstärke gegen Entfernung und nimmt das stärkste. Rund 150 Zeilen für das ganze System. |
| Ton | Unity-Bordmittel mit 3D-Blend und AudioMixer-Schnappschüssen (gedämpft beim Luftanhalten, Herzschlag bei Nähe). FMOD wäre besser, aber erst später. |
| Licht | gebackene Lightmaps für den Bunker, nur die Taschenlampe in Echtzeit |
| Bildlook | Post-Processing: Vignette, Filmkorn, leichte Farbverschiebung |

**Kostenlose Bausteine, die du brauchen wirst:** Töne von *freesound.org*
(oder selbst aufnehmen — dein Handy in einem Treppenhaus reicht für Schritte),
Texturen von *Poly Haven*, Modelle von *Kenney.nl*. Alles frei nutzbar.

### Was die Hardware dir vorgibt

Integrierte Grafik heißt: **URP, nicht HDRP**, und **gebackenes Licht, wo immer
es geht.** In Echtzeit leuchtet nur die Taschenlampe. Das ist keine
Einschränkung, die weh tut — ein Bunker steht still, da muss nichts an der
Beleuchtung dynamisch sein.

Der angenehme Nebeneffekt: Wenn das Spiel auf deinem Laptop flüssig läuft,
läuft es bei praktisch jedem. Du entwickelst automatisch auf dem schwächsten
Gerät und wirst nie böse überrascht.

---

## Und dann in deinen Launcher

Der Weg steht schon:

```
Unity: Build (Windows)  ─►  Ordner zippen  ─►  GitHub-Release  ─►  games.json  ─►  Launcher
```

Zwei Dinge, die du wissen musst, wenn es so weit ist:

- **GitHub erlaubt 2 GB pro Datei im Release.** Ein Unity-Horrorspiel dieser
  Größe landet üblicherweise bei 200 MB bis 1 GB — das passt, aber behalte es
  im Blick.
- In `games.json` muss `executable` genau so heißen wie deine gebaute
  `.exe`. Den `_Data`-Ordner daneben mit ins ZIP packen, sonst startet nichts.

---

## Entschieden

- ✅ **Titel:** *The Hollow Halls*
- ✅ **Kern:** blindes Wesen, Geräusche als Spielmechanik
- ✅ **Ort:** aufgebrochene Bunkeranlage, Schutt in den Gängen
- ✅ **Engine:** Unity 6.3

- ✅ **Begleiter:** ORPHEUS, KI-Stimme, spricht laut — und ist damit gefährlich
- ✅ **Rahmen:** Forscher aus der Zukunft auf der alten Erde
- ✅ **Wesen:** wird in vier Stufen schlauer, „Lernen" über Zähler statt echter KI

## Noch offen

1. **Wie schnell soll das Wesen sein?** Langsam und unausweichlich, oder schnell
   und panisch? Das ändert das Spielgefühl komplett — und lässt sich am
   Prototyp in zwei Minuten ausprobieren, statt es jetzt zu erraten.
2. **Welche Stimme für ORPHEUS?** Es gibt kostenlose und bezahlte
   Sprachsynthese. Für den Prototyp reicht Text am Bildschirmrand; die Stimme
   kann später darüber.
3. **Was hat die Wände durchbrochen?** Das musst du noch nicht beantworten —
   aber du solltest es irgendwann für dich wissen, auch wenn es nie im Spiel
   ausgesprochen wird.
