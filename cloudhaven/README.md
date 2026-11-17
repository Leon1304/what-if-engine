# Cloudhaven – ein kleines Dorf über den Wolken

Gemütliches Aufbauspiel im Browser (Three.js, Low Poly), auf Deutsch und Englisch (früher „Schwebeinsel“). Du legst Sechseck-Kacheln wie Wiese, Wald, Bach, Felder, Häuser, Mühlen und eine Kapelle auf eine schwebende Insel.
Passende Nachbarn bringen Punkte, Gruppen erreichen Meilensteine, neue Kacheln werden freigeschaltet und das Dorf wächst. Es gibt keine Gegner und kein Verlieren.
Man kann stufenlos von der ganzen Insel bis vor die Fensterbank zoomen und in die Zimmer schauen.

**Spielen:** https://leon1304.github.io/what-if-engine/cloudhaven/ (Maus, Trackpad oder Touch). Lokal: `cd cloudhaven && python3 -m http.server 8000`, dann http://localhost:8000.
Konzept und Regeln: `DESIGN.md`.

## Steuerung
| Eingabe | Aktion |
|---|---|
| Klick auf freies Feld | Kachel setzen (die Vorschau schwebt darüber: grün = passt, rot = Bach passt nicht) |
| R · Rechtsklick · Shift+Mausrad · ↻-Knöpfe | Kachel drehen (Shift+R andersherum) |
| 1 · 2 · 3 | Kachel aus dem Stapel wählen |
| Linksziehen · Rechtsziehen · Mausrad | Insel schieben · drehen/kippen · zoomen (zum Mauszeiger, bis ganz nah) |
| WASD · Q/E · +/− | schieben · drehen · zoomen |
| Klick auf Gebäude/Bewohner · Doppelklick | Infos · heranfliegen |
| H · Klick aufs Fach | Ablagefach: Kachel beiseitelegen oder tauschen (nicht im Kreativ-Modus) |
| Strg+Z · B · P · Esc | Rückgängig (10 Züge) · Handbuch · Fotomodus · Menü |
| Touch | ein Finger schieben, zwei Finger zoomen/drehen, tippen = setzen, lange drücken = Kachel-Info |

## Spielinhalt
- **18 Kachelarten:** Wiese, Wald, Bach, Bachbiegung, Quelle, See, Weg, Wegbiegung, Fachwerkhaus, Feld, Windmühle, Bauernhof, Brücke, Kapelle, Wassermühle, Marktplatz, Berg, Leuchtturm sowie der Dorfbrunnen als Start.
- **Regeln:**
  - Bäche müssen an Bach oder See anschließen; ins Leere werden sie zum Wasserfall.
  - Gleiche Gebiete nebeneinander geben Punkte, Bach und Weg verbunden geben extra.
  - Eine perfekt eingepasste Kachel bringt +10 Punkte und +1 Kachel.
  - Der Leuchtturm gehört an den Rand.
  - **Verschmelzen (Grundregel in jedem Modus, Einstellung „🔮 Verschmelzen“, Standard an):** Liegen nach dem Setzen 3 oder mehr gleiche
    Kacheln zusammen, werden sie zur nächsten Stufe – an der gesetzten Stelle, die anderen Felder werden frei (Lücken sind wieder bebaubar).
    Kettenreaktion möglich. Punkte: Nachbarpunkte der gesetzten Kachel + 5 · Stufe je verschmolzener Kachel (über 3 doppelt, Kette ×1,5).
    Ketten (`MERGE`/`MERGE_CHAINS` in `js/tiles.js`): Felsen → Blockhütte → Fachwerkhaus → Häuserzeile → Gasthaus → Burgturm ·
    Wiese → Schafweide → Imkerei → Obstwiese → Weinberg · Feld → Windmühle → Bauernhof · Wald → Nadelwald · Kreuzung → Dorfplatz → Marktplatz → Kapelle · Teich → See.
    Wege und Bäche verschmelzen nie. Verschmolzene Kacheln tragen ihr Gewicht (`t.n`, so viele Teile stecken darin) und zählen
    in Gruppen, Aufgaben und Hausstufen entsprechend oft – große Wälder, Felder und Dörfer bleiben möglich. Der Schalter steckt im Inselstand (`S.merge`).
- **Fortschritt:**
  - Meilensteine bei 5/10/20/35/50/75 zusammenhängenden Kacheln eines Gebiets.
  - Aufgaben-Flaggen auf einzelnen Kacheln.
  - Freischaltungen bei 100–1400 Punkten.
  - Häuser wachsen mit dem Dorf: ab 3 Wohnhäusern (Haus, Hütte, Häuserzeile, nach Gewicht) zweistöckig, ab 6 mit Anbau und Garten.
- **Modi:** Klassisch (Vorrat mit 30 Kacheln, Nachschub durch gutes Spiel, Ende mit Auswertung inkl. Verschmelzungen und höchster Stufe), Endlos, Kreativ (alle Kacheln frei).
  Der frühere Modus „Verschmelzen“ (begrenztes Feld) ist entfallen; alte Stände laden als Endlos-Insel mit allem Gebauten.
- **Erfolge, Tagesaufgaben, Besucher** (`js/progress.js`): 36 Abzeichen über alle Inseln, jeden Tag 3 neue Aufgaben, Besucher mit Wünschen („Bäckerei neben dem Markt“).
- **Welt:** Tag und Nacht (ein Spieltag dauert 8 Minuten), Jahreszeiten (alle 2 Spieltage), Wetter (Regen mit Regenbogen, Gewitter, Nebel, Schnee; Seen frieren zu).
- **Leben:** Bewohner mit Namen und Sätzen, Tiere, Vogelschwärme, Ballon und Luftschiff, Rauch, Glühwürmchen, Leuchtturmstrahl, Feuerwerk.
- **Anleitung, Handbuch, Speichern:**
  - Geführter Einstieg in 9 Schritten (inkl. „3 gleiche verschmelzen“).
  - Handbuch, automatisch aus den Kachel-Daten erzeugt.
  - 5 Speicherplätze mit Vorschaubild, automatisches Speichern, Export und Import als `.insel.json`.
- **Sprachen:** Deutsch und Englisch, umschaltbar im Startmenü (🇩🇪/🇬🇧) und in den Einstellungen, wirkt sofort. Standard ist Englisch; die gewählte Sprache wird gespeichert.
- **Fotomodus** mit Filtern und PNG-Export; **Zeitraffer** des Inselaufbaus, auch als Video (MP4 oder WebM).

## Aufbau
| Datei | Inhalt |
|---|---|
| `js/game.js` · `js/tiles.js` · `js/hex.js` | Spiellogik ohne Grafik (Stapel, Punkte, Gruppen, Aufgaben, Freischaltungen, Rückgängig, Spielstand mit `SAVE_VERSION`) · Kachelarten · Sechseck-Mathe, Rauschen |
| `js/kit.js` · `js/materials.js` | Baukasten für Low-Poly-Modelle (Ebenen base/bldg/glow/glass/water/fall, `spot`, `part`) · Shader für Wind, Jahreszeiten, Schnee, Nachtlicht, Wasser, Wasserfall |
| `js/terrain.js` | nahtloses Kachelgelände, Bach- und Seebetten, Wege, Felsunterseite mit Kristallen, Wasserfälle |
| `js/models/` | `nature.js` (Bäume, Pflanzen, Felsen), `house.js` (Fachwerkhaus in 3 Stufen mit Zimmern hinter den Fenstern), `buildings.js` (Mühlen, Kapelle, Hof, Markt, Leuchtturm, Brunnen, Brücke, Stollen, Steg), `tilemodel.js` (Kachel zusammensetzen) |
| `js/world.js` | Kacheln in der Szene: nur Geändertes neu bauen, Einfall-Animation, bewegliche Teile, Vorschau, freie Felder, Zeitraffer |
| `js/stage.js` · `js/camera.js` | Renderer, Himmel, Wolkenmeer, Licht, Wetter, Regenbogen, Post-FX (Tilt-Shift, Bloom, Grading, FXAA), Filter, Fotos · Orbit-Kamera mit Zoom zum Zeiger, Touch und Kollision |
| `js/life.js` · `js/audio.js` | Bewohner, Tiere, Effekte, Feiern · prozeduraler Ton und Musik (WebAudio) |
| `js/ui.js` · `js/storage.js` · `index.html` | Oberfläche, Anleitung, Handbuch, Menüs · Speicherplätze |
| `js/i18n.js` | Texte Deutsch/Englisch: `t(key, vars)`, `setLang`, `tileName`/`tileDesc`, `phrase()` für die deutschen Texte aus `game.js`/`life.js`, Zahlen je Sprache |
| `js/media.js` · `js/main.js` | Kachel-Bilder und Video-Aufnahme · Verdrahtung, Eingabe, Zeit, Wetter |

## Prüfen (vor jedem Push)
```bash
node cloudhaven/tools/rules.mjs                 # RULES OK  (Logik, Probepartie, Speichern/Laden, Rückgängig, alte Stände)
node cloudhaven/tools/play.mjs <ordner> --shots # PLAY OK   (ganzes Spiel im Browser: Klicks, 90 Kacheln, Bildrate, Kamera nie im Haus, Neuladen, Zeitraffer)
node cloudhaven/tools/ui-demo.mjs <ordner>      # UI OK     (alle Bildschirme, Handy, Speicherplätze, Export/Import; Englisch ohne deutsche Reste, Sprache bleibt)
node cloudhaven/tools/stage-shots.mjs <ordner>  # STAGE OK  (Kamera-Tests, Tageszeiten, Wetter, Filter)
node cloudhaven/tools/life-logic.mjs            # LIFE LOGIC OK
node cloudhaven/tools/merge.mjs                 # MERGE OK  (Verschmelzen als Grundregel: Punkte = Vorschau, Gewichte, Kette, Rückgängig, Ablagefach, Schalter aus, alte Stände, Probepartien an/aus: --games 20)
node cloudhaven/tools/mergeplay.mjs <ordner>    # MERGEPLAY OK (Verschmelzen im echten Spiel: Mausklicks, Animation flüssig, Kette, Fach, Ende, Einstellung, Englisch)
node cloudhaven/tools/progress.mjs              # PROGRESS OK (Erfolge, Tagesaufgaben, Besucher)
node cloudhaven/tools/camfeel.mjs <ordner>      # CAM OK    (Ziehen/Zoomen ohne Sprünge und Hänger)
node cloudhaven/tools/perf.mjs <ordner>         # PERF OK   (300 Kacheln: fps, Draw Calls, längstes Bild)
```
Modelle einzeln ansehen: `node cloudhaven/tools/preview.mjs <ordner> name='m=../js/models/house.js&fn=house&a={"stage":3}&cam=11,7,11&look=0,2.5,0'`, ganze Testinsel: `name='../tools/world-demo.html?n=40'`.
Spielstände bleiben über Updates ladbar: gespeichert wird nur über Ids (Kachelart, q, r, Drehung), Unbekanntes wird übersprungen.
