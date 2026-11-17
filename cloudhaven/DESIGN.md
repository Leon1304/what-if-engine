# Cloudhaven – Spielkonzept (früher Arbeitstitel „Schwebeinsel“)

Gemütliches Aufbauspiel im Low-Poly-Diorama-Stil. Eine kleine Insel schwebt über den Wolken. Man legt Feld für Feld
Landschaft an: Wiese, Wald, Wasser, Felder, Häuser. Daraus wächst ein lebendiges Miniaturdorf. Es gibt keine Gegner,
keinen Zeitdruck und kein Verlieren. Ziel ist eine schöne, belebte Insel, die man gern anschaut und fotografiert.
Läuft im Browser (Three.js), mit Maus oder Touch. Eine Runde dauert 20–40 Minuten, danach geht es im Endlos- oder Kreativ-Modus weiter.

## Kernschleife
1. **Stapel ziehen:** Unten liegt ein Stapel mit 3 Kacheln zur Auswahl (z. B. Wald, Wiese, Bach).
2. **Setzen:** Die Kachel auf ein freies Sechseck am Inselrand legen und mit R oder dem Mausrad drehen.
   Eine Vorschau zeigt die Punkte, bevor man klickt.
3. **Nachbarn zählen:** Passende Nachbarn geben Punkte, zum Beispiel Wald neben Wald, Bach an Bach anschließen
   oder Feld neben Mühle. Unpassende geben 0, aber nie Minus.
4. **Belohnung:** Punkte füllen den Stapel nach. Meilensteine (100, 250, 500 …) schalten neue Kachelarten frei.
5. **Leben:** Jede gesetzte Kachel wird lebendig: Bäume wiegen sich, Bewohner laufen, Rauch steigt, Boote fahren.
6. **Ende:** Ist der Stapel leer, endet die Runde mit Punktzahl und Fotomodus. Im Endlosmodus gibt es immer Nachschub.

## Verschmelzen (Grundregel, in jedem Modus)
Leons Bild: „Stein → Haus → Burg“, und: „Verschmelzen soll kein eigener Modus sein, sondern immer stattfinden.“
- Liegen nach dem Setzen 3 oder mehr gleiche Kacheln zusammen, verschmelzen sie zur nächsten Stufe – an der gesetzten Stelle.
  Die Partner-Felder werden frei; Lücken in der Insel sind erlaubt und wieder bebaubar (ideal für „Perfekt“-Züge). Kettenreaktion möglich.
- Punkte: Nachbarpunkte der gesetzten Kachel wie immer, dazu je verschmolzener Kachel 5 · neue Stufe (über drei doppelt, jeder Kettenschritt ×1,5).
  Linear statt steil, weil mittlere Stufen (Haus, Gasthaus, Markt) auch direkt aus dem Vorrat kommen.
- Ketten bleiben in ihrer Gruppe und enden in Kacheln, die große Flächen bilden dürfen: Wald → Nadelwald, Feld → Windmühle → Bauernhof,
  Wiese → … → Weinberg, Kreuzung → … → Kapelle, Teich → See. Nur die Steinkette wechselt die Gruppe (Felsen → Hütte → … → Burgturm).
  Wege verschmelzen nicht, damit Straßen nicht zerfallen.
- Gewicht: Eine verschmolzene Kachel zählt in Gruppen (Meilensteine, Aufgaben, Hausstufen, Erfolge) so oft, wie Teile in ihr stecken.
  So schrumpfen Wälder, Felder und Dörfer durch Verschmelzen nicht (Probepartien in `tools/merge.mjs`: Gruppen 85–110 % von ohne, Punkte +15–25 %).
- Ablagefach (H) in Klassisch und Endlos, Vorschau mit Ringen/Bögen und Verschmelz-Zeilen, Animation, Stufen-Abzeichen in der Bauleiste.
- Einstellung „🔮 Verschmelzen“ (Standard an) schaltet die Regel für alle Inseln ab; ausgeschaltet spielt es sich wie vorher.

## Kacheln (Sechseck-Raster)
| Kachel | Kanten | passt gut zu | lebt durch |
|---|---|---|---|
| Wiese | Gras | allem | Blumen, Schafe |
| Wald (Nadel/Laub/Misch) | Gras/Wald | Wald, Holzfäller | Wind, Rehe, Vögel |
| Bach (gerade, Kurve, Quelle, Mündung) | Wasser muss anschließen | Mühle, Brücke | fließendes Wasser, Fische |
| See | Wasser | Steg, Bach | Boot, Enten, Spiegelung |
| Feld (Weizen, Kürbis, Raps) | Gras | Mühle, Bauernhof | Wachstum, Ernte |
| Haus, Bauernhof | Weg | Haus (Dorf), Feld | Licht abends, Rauch, Bewohner |
| Mühle (Wind, Wasser) | Gras/Wasser | Feld, Bach | Flügel, Wasserrad |
| Weg, Brücke | Weg | Haus, Bach | Spaziergänger, Karren |
| Fels/Berg, Leuchtturm, Kapelle … | später freigeschaltet | Sonderregeln | – |

**Aufgaben** auf einzelnen Kacheln, z. B. „Dieser Wald will 8 Wälder in einem Stück“. Erfüllt gibt es Bonus-Kacheln.
Das sorgt für Spannung ohne Druck.

## Detail und Zoom (Leons Vorgabe)
Gebäude sind der Star. Man soll von der ganzen Insel bis auf Türklinken-Nähe heranzoomen können, und von nah muss alles stimmen.
- **Zoom stufenlos** von etwa 40 m (ganze Insel) bis 0,3 m (Fensterbank). Unter 2 m wird die Kamera automatisch flacher
  („Spaziergänger-Blick“) und weicht Geometrie aus, statt durch Wände zu fahren. Klick auf ein Gebäude fliegt sanft heran.
- **Gebäude in voller Detailstufe:** Fachwerk, Dachziegel als einzelne Reihen, Dachrinnen und Fallrohre, Fensterrahmen mit Sprossen,
  Vorhängen und Blumenkästen, Türen mit Klinke und Stufe, Schornstein, Briefkasten, Holzstapel, Fahrrad, Zaun, Gebrauchsspuren und Moos.
  Bausteine aus Waldtanks `deco.py` übernehmen und ausbauen.
- **Innenleben hinter Fenstern:** Lampe, Tisch, Regal. Abends leuchtet es warm, Silhouetten bewegen sich.
- **Gebäude wachsen mit dem Dorf:** Ein Haus bekommt Anbau, Garten oder Laden, wenn passende Nachbarn dazukommen. Jede Stufe ist ein eigenes Modell.
- **Detailstufen (LOD) nur für die Leistung:** Von weit sieht man ein vereinfachtes Modell, ab etwa 6 m das volle.
  Gebaut wird immer das volle Modell; das vereinfachte entsteht automatisch per Skript (Decimate).
- **Bewohner** mit Gesicht, Kleidung und Tätigkeit (Holz hacken, gießen, angeln). Anklicken zeigt Name und einen Satz.
- Nah dran: schärfere Schatten, Umgebungsverdeckung (AO) und Tiefenschärfe auf dem fokussierten Gebäude.

## Anleitung
- **Geführter Einstieg (8 Schritte)** mit Hinweis-Blasen direkt am Objekt: umsehen und zoomen → erste Kachel setzen → drehen →
  Punkte-Vorschau lesen → Bach verbinden → Haus neben Weg → heranzoomen und ein Gebäude anklicken → Meilenstein erreichen.
  Jederzeit überspringbar und im Menü wiederholbar.
- **Handbuch (B)**, automatisch aus den Kachel-Daten erzeugt wie in Waldtank: jede Kachel mit Bild, Kantentypen, passenden Nachbarn
  und Punkten; Steuerung; Freischaltungen; Tipps.
- **Hilfe beim Setzen:** Die Vorschau färbt passende Kanten grün und zeigt „+3 Wald angeschlossen“ direkt an der Kante.
- **Kachel-Info:** Rechtsklick oder langes Tippen auf eine Kachel erklärt, was sie gibt und was ihr noch fehlt.

## Speichern (Leons Vorgabe)
- **Automatisch** nach jeder gesetzten Kachel und alle 20 s. Nach dem Neuladen der Seite geht es genau dort weiter.
- **Mehrere Inseln:** 5 Speicherplätze mit Vorschaubild, Name, Punkten und Datum. Neue Insel anlegen, umbenennen, kopieren, löschen (mit Rückfrage).
- **Rückgängig (Strg+Z)** für die letzten 10 Kacheln.
- **Datei sichern/laden** (`.insel.json`) zum Übertragen auf einen anderen Rechner oder als Sicherung.
- **Versionsfest:** gespeichert wird nur über Ids (Kachelart, q, r, Drehung, Ausbaustufe, Fortschritt, Freischaltungen) mit `SAVE_VERSION`.
  Spielstände aus älteren Versionen laden immer; Unbekanntes wird übersprungen.
- Gespeichert wird im Browser (localStorage, bei großen Inseln IndexedDB).

## Stimmung
- Tageszeit und Jahreszeit wechseln langsam (Herbst wie in Waldtank, Winter mit Schnee). Abends gehen Lichter in den Häusern an.
- Die Kamera kreist um die Insel, zoomt per Mausrad und kann gekippt werden. Nah ran sieht man Tilt-Shift und kleine Bewohner.
- Ruhige Musik und Natur-Geräusche je nach Kachel: Bach plätschert, Wald rauscht, Dorf klingt belebt.
- **Fotomodus:** UI aus, freier Blickwinkel, PNG speichern. Taugt auch als Short-Material.

## Eye-Catcher
- **Schwebende Insel:** Jede Kachel hat eine schroffe Felsunterseite mit Wurzeln und nachts leuchtenden Kristallen. Darunter liegt ein Wolkenmeer.
- **Wasserfälle:** Endet ein Bach am Inselrand, stürzt er als Wasserfall mit Gischt in die Wolken.
- **Einschlag-Animation:** Neue Kacheln fallen mit Drehung ein, federn nach und werfen Staub auf. Wachsende Häuser werden gefeiert.
- **Tag und Nacht:** Goldene Stunde, Sterne, Mond, warmes Licht in Fenstern und Laternen (Bloom), Glühwürmchen und ein kreisender Leuchtturm-Strahl.
- **Jahreszeiten und Wetter:** Kirschblüte, goldene Felder, Herbstlaub, Schnee auf allen Dächern und zugefrorene Seen, Regen mit Kringeln auf dem Wasser und anschließendem Regenbogen, Gewitter.
- **Leben:** Bewohner mit Namen und Sätzen, Vogelschwärme, Schmetterlinge, Enten, springende Fische, Rehe, Kühe, Rauch aus Schornsteinen und ein Heißluftballon.
- **Feiern:** Meilensteine lösen je nach Gebiet einen Vogelschwarm, Feuerwerk oder Konfetti, Glitzer oder kreisende Adler aus.
- **Miniatur-Look:** Tilt-Shift von weit weg, scharfe Details ganz nah.
- **Fotomodus mit Filtern** und **Zeitraffer** des Inselaufbaus, auch als Video zum Teilen (Short-Material für den Kanal).

## Technik
- **Ordner:** `cloudhaven/` mit `index.html` und `js/`. Three.js 0.170 per Import-Map wie in `game/`.
- **Modelle als Code statt Blender:** Alle Kacheln, Gebäude und Figuren entstehen prozedural in `js/models/` mit dem Baukasten `js/kit.js`.
  Das passt am besten zu Hunderten Varianten (Seed je Kachel), Hausstufen und nahtlosem Gelände über Kachelgrenzen und braucht keine 20-MB-GLB.
  Volle Detailstufe gilt trotzdem: Fasen, Kleinteile, Gebrauchsspuren, Innenräume hinter den Fenstern.
- **Bewegung über Shader-Uniforms und bewegliche Teile** (`kit.part`): Wind, Wasser, Schnee, Laub, Nacht und Mühlenflügel. Die Geometrie bleibt fest.
- **Gelände** (`js/terrain.js`): Höhenrauschen in Weltkoordinaten, dadurch nahtlos. Bach- und Seebetten sind eingegraben, Wasserfälle sitzen an offenen Bachkanten.
- **Speichern:** siehe Abschnitt „Speichern“.
- **Veröffentlichen:** Der Workflow `game-pages` veröffentlicht die Insel zusätzlich unter `…/what-if-engine/cloudhaven/`.

## Prüfungen (vor jedem Push)
- `tools/rules.mjs`: Kantenregeln, Punkte, Probepartie, Speichern/Laden/Rückgängig, alte Spielstände (ohne Browser) → `RULES OK`.
- `tools/play.mjs`: automatische Runde mit 60 Kacheln im Browser ohne Fehler, Speichern → Neustart → Laden ergibt dieselbe Insel.
- `tools/shots.mjs`: Screenshots (Tag, Abend, Winter, Fotomodus, Nahaufnahme jedes Gebäudes aus 0,5 m) und Leistungsmessung mit 300 Kacheln.
- `tools/zoom.mjs`: Kamerafahrt vom Weitblick bis ganz nah an jedes Gebäude, ohne in Geometrie zu fahren.
- `tools/save.mjs`: alle Speicherwege (Automatik, Plätze, Rückgängig, Datei, alter Spielstand) ergeben dieselbe Insel.

## Meilensteine
1. **Grundgerüst:** Sechseck-Raster, Kamera mit stufenlosem Zoom bis ganz nah, Setzen und Drehen, 4 Kacheln (Wiese, Wald, Bach,
   Haus in voller Detailstufe) aus Blender, Punkte und Vorschau, automatisches Speichern.
2. **Leben:** Wind, Wasser, Rauch, Bewohner auf Wegen, Tag und Nacht, Licht in den Fenstern, Geräusche.
3. **Fortschritt und Anleitung:** Stapel, Meilensteine, Freischalten, Kachel-Aufgaben, Rundenende, geführter Einstieg, Handbuch,
   Speicherplätze, Rückgängig, Datei-Export.
4. **Mehr Inhalt:** Felder und Mühle, See und Boot, Berg, Sonderbauten, Jahreszeiten.
5. **Feinschliff:** Fotomodus, Touch-Steuerung, Musik, Pages-Veröffentlichung.
