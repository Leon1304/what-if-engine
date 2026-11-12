# Neu in v3.2: Landschaft (Hintergrund, Skyline, Boden von selbst, Bäume, Felder)

Alles hier wirkt ohne Änderung an der Szene. Test: `tests/v32-landscape.story.js` + `.scene.js`.

## Hintergrund: `backdrop(kind, { coast, seed, r, r0, sector, also })`
- `hills` · `islands` · `alps` · `snow`: statt einzelner Kegel („Pyramiden“) jetzt zwei durchgehende, weiche Hügelbänder rund um die Szene: vorn (~310 m) grüner mit Baumkante am Kamm und dunkleren Waldflecken, hinten (~450 m) bläulich. Höhe entlang des Rings aus mehreren Sinuswellen (Zufall aus dem Backdrop-Seed), Querschnitt mit Vorderhang, Kamm und Rückhang, die Kammlinie schwankt vor und zurück. In jedem 9:16-Bild stehen mehrere Hügel, nie ein einzelner Berg.
- `alps` / `snow`: hinten eine zackige Kette (Gipfel mit Sätteln dazwischen) mit Schneekappen ab einer unregelmäßigen Schneegrenze; vorn bewaldete (bzw. verschneite) Rücken.
- `mesa`: Tafelberge wie bisher, dazwischen und dahinter niedrige Sandrücken, damit keine Lücken im Horizont bleiben.
- Küste (`coast`): die Bänder tauchen zur Seeseite unter den Meeresspiegel; `islands` legt flache Inseln mit Sandrand aufs Meer.
- Dunst wie bisher (nimmt die Nebelfarbe jeder Tageszeit an). Neu: die untersten Meter jedes Bandes bekommen den echten Nebel, so endet der Boden nicht mehr in einem hellen Streifen vor klareren Hügeln.
- `skyline`: Türme mit Rücksprüngen (2–3 Stufen), Dachaufbauten, Antennen; mehr Farben (Beton, Glas, Klinker). Fensterraster pro Fassade im Shader: am Tag dunkles Glas, ab der Dämmerung geht ein wachsender, zufälliger Anteil an (meist warm, einige kalt-weiß), gesteuert von `NIGHTK`; die Fenster leuchten durch den Dunst. Fenster unter ~2 Pixeln werden zu ihrem Mittelwert (kein Flimmern). Rote Flugwarnlichter auf Antennen blinken in Dämmerung und Nacht (reine Funktion von t).
- `sector: [vonGrad, bisGrad]` (nur `skyline`): Türme nur in diesem Bereich des Horizonts (0° = +z, 90° = +x), z. B. eine Stadt auf einer Seite.
- `also: true`: zusätzliche Ebene, z. B. `backdrop('skyline', { also: true, r0: 200, sector: [140, 220] })` vor den Hügeln. Zählt nicht als „Szene hat einen Hintergrund“.
- `NIGHTU` (Uniform mit `NIGHTK`) und `BDT` (Uniform mit t) stehen für eigene Shader bereit; ein `tick` setzt sie, sobald eine Skyline gebaut ist.

## Boden kleidet sich selbst: `ground()` ohne `biome()`/`city()`/`backdrop()`
- Bisher: endlose grüne/graue Fläche bis zum verschwommenen Horizont. Jetzt bekommt die Szene beim Backen (DEFER) eine leichte Ausstattung passend zur Bodenfarbe:
  - grün → `plain` + `hills` (vereinzelte Laubbäume, Birken, Kiefern, Büsche, Felsen im Ring; Grasbüschel in Bodenfarbe, Kiesel, wenige Blumen auf der Spielfläche)
  - sandfarben → `plain-sand` + `mesa` (Kiesel, wenige trockene Büsche, Felsen, vereinzelt Kakteen/tote Bäume)
  - weiß → `plain-snow` + `snow` (Schneekiefern, Felsen, Schneewehen)
  - grau → `plain-stone` + `skyline`; dunkelgrau/braun → `plain-stone` + `hills`
  - bläulicher Boden, `SKY` unter Wasser, Tiefsee, Weltraum oder Planeten: nichts.
- Der Ring beginnt hinter allem, was gebaut ist (höchstens `CFG.area` × 3), und bleibt auf dem Boden (`ground({ size })`). Wie bei `biome()` bleiben Kameras und ihre Sichtlinien, `walk`-Wege, `horde`-Bahnen, Gebäude, Fahrzeuge, Figuren frei; Seen und Fluten (`water()` ohne Küste) auch. Eigener Zufall, der globale bleibt unverändert (Layout der Szene wie vorher). Innenräume auf der Bodenplatte stehen dann im Garten.
- Aus: `ground({ dress: false })` oder `CFG.autoDress: false`. Die Biome gibt es auch direkt: `biome('plain')`, `'plain-sand'`, `'plain-snow'`, `'plain-stone'`.
- `runBiome(kind, { dry: true })`: hält Wasserflächen (`water()`) frei; `{ flowers: false }`: keine Blumen.

## Bäume: `tree(p, x, z, { kind: 'round' | 'birch' })`
- Jeder Baum hat aus seiner Position eigene Form: Krone gestreckt oder gedrungen, breiter oder schmaler, leicht seitlich versetzt, 6–11 unregelmäßig verteilte, leicht gestauchte Blätterballen, 1–2 helle Kuppen oben, leichte Schräglage (Wurzeln bleiben am Boden), Farbton, Sättigung und Helligkeit leicht verschieden. Reihen gleich großer Bäume wiederholen sich nicht mehr. Seed-Layout unverändert (gleich viele `rnd()`-Aufrufe).

## Felder: `field(p, x, z, w, d, { crop })`
- `wheat`: Büschel aus 5 Halmen mit Ähren statt eines Kegels; Boden darunter stoppelbraun (`soil` wie bisher änderbar).
- `corn`: Stängel mit 7 gebogenen Blättern, Kolben im Hüllblatt, Fahne oben.
- `cabbage`: fester Kopf in einer Rosette aus gewölbten Blättern.
- Weiter instanziert, wiegen sich im Wind wie bisher (Kohl steht still), `colors` färbt wie bisher (Schattierung kommt aus Vertex-Faktoren).
