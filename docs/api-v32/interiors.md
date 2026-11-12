## Innenräume, Gemälde, Museum, Plätze (v3.2)

### Geschlossene Räume, die sich nach der Kamera richten
- `interior(…, { closed: 'auto' })` (Standard): Der Raum bekommt eine **Vorderwand** (mit Fenster, Steckdosen, Fußleiste) und eine **Decke**. Beide sind nur zu sehen, solange die Kamera im Raum ist. Von außen bleibt der Raum offen wie ein Puppenhaus, von innen sieht man keinen Himmel und kein Gras mehr. Die Sichtbarkeit wird in jedem Bild aus der Kamera berechnet (reine Funktion von t), auch für Splitscreen und Cover-Kamera.
  - Vorderwand: sichtbar, wenn die Kamera innerhalb der Grundfläche und unter Deckenhöhe steht.
  - Decke: blendet auf dem letzten Meter vor der offenen Seite ein (`ceilFade: 1.0` m), es gibt also keinen Sprung, wenn die Kamera hineinfliegt.
  - Beide werfen keinen Schatten. Das Licht im Raum sieht also aus wie vorher (Sonne von oben), und `bake()` fasst sie nicht mit anderen Teilen zusammen. Für die Hitboxen zählen sie nicht.
  - `closed: true` = immer zu, `closed: false` = alter offener Schnitt. Für alle Räume: `CFG.closedRooms: false`.
  - `front: true` und `ceiling: true` funktionieren wie bisher (feste Wand bzw. Decke mit Schatten). Mit `ceiling: true` gibt es keine Auto-Decke, mit `front: true` keine Auto-Vorderwand.
  - `frontWindow: false | 'high'` steuert das Fenster in der Vorderwand. `ceilColor` setzt die Deckenfarbe. Ohne Hängelampe (`ceiling`/`lamps`) bekommt die Auto-Decke an den Lampenplätzen flache Deckenleuchten.
  - Funktioniert auch mit `ry` und erhöhtem `y`. `R.frontW` und `R.ceilG` sind die Gruppen.
- Wenn die Kamera im Raum steht und nach draußen sehen soll (Monster vor dem Haus), `closed: false` setzen.

### Türen führen in einen beleuchteten Flur
- Die Türwand eines `interior()` hat jetzt eine echte Öffnung. Dahinter liegt ein kurzer, warm beleuchteter Flur (Dielen, Läufer, Tapete, Deckenleuchte, Bild mit Lichtkegel gegenüber der Tür, Konsole, Garderobe). Eine offene Tür (`openDoor(R, t)`) zeigt also nie mehr Schwarz oder Gras. Keller: Ziegel und Glühbirne, Bunker: Beton, Garage/Bad/Laden/Klassenzimmer: schlicht.
  - `hall: false` (oder `CFG.halls: false`) = alte dunkle Türfläche. `hallStyle`, `hallD` (Tiefe, 1,5 m), `hallLen` (Länge entlang der Wand, 3,4 m). `R.hall` = Gruppe, `R.at('hall')` = Mitte des Flurs.
  - `doorW`, `doorH`, `doorZ`: Maße und Lage der Tür. `doorway: true` = offener Durchgang ohne Türblatt.
- `house()`: Hinter der Haustür liegt jetzt ein kleiner Flur (Garderobe, Bild, Lampe), der Hauskörper ist dort ausgeschnitten. `hall: false` = alte dunkle Fläche, `hallWall` = Flurfarbe.
- `museumGallery()`: Hinter dem Durchgang bei +z liegt der nächste Saal (Bild mit Lichtkegel, Büste) statt einer schwarzen Fläche. `next: false` = alt. `M.next` = Gruppe.
- Einzeln: `hallStub(p, x, y, z, ry, { x0, x1, d, h, style: 'home' | 'museum' | 'cellar' | 'bunker' | 'plain', wall, lit, shell, art })`. Die Öffnung liegt in der Ebene z = 0 und schaut nach +z, der Flur läuft von x0 bis x1 und d tief nach −z. Die Wände leuchten leicht selbst (kein echtes Licht). `shell: false` = nur die Innenverkleidung, wenn der Flur in einen festen Körper geschnitten ist.

### Gemälde
- `painting(p, x, y, z, ry, { w, h, art, seed, frame, mount, lit })`: gerahmtes Gemälde mit gemaltem Bild (Canvas-Textur). y = Unterkante, z = Wandfläche (der Rahmen ist 5 cm tief).
  - `art`: `'auto'` (Standard, je nach Position) · `'landscape'` · `'portrait'` · `'still'` (Stillleben) · `'sea'` (Seestück mit Schiff) · `'abstract'` (Raster, Farbfelder, Kreise, Drips, Quadrate) · `'child'` (Kinderzeichnung, mit Klebeband an der Wand) · `false` = altes flaches Bild.
  - Rahmen: Gold mit Lippe und Perlstab, dunkles Holz oder schmal (Abstraktes). `frame: 'gold' | hex | 'none'`. Kleine Bilder bekommen manchmal ein Passepartout (`mount`).
  - Leichter Firnisglanz, vergilbter Firnis, dunkle Ränder, feine Risse. `lit: 0..1` lässt die Leinwand leicht leuchten (angestrahlt).
  - Gleiche Szene = gleiche Bilder. Texturen werden geteilt, höchstens `CFG.artMax` (28) verschiedene (zusammen ca. 7 MB). Alle Gemälde zusammen zeichnet eine einzige Funktion, `CFG.paintings: false` schaltet auf das alte flache Bild um.
- `FURN.picture` / `R.wallPut('picture', …)` und die Bilder an Seitenwänden nutzen das automatisch, das Kinderzimmer bekommt eine Kinderzeichnung, `museumGallery()` echte Gemälde mit Bilderleuchten und Lichtkegeln, auch das große Bild an der Stirnwand statt der Farbblöcke (`paintings: false` = alt, `M.paintings`).
- `pictureLight(p, x, y, z, ry, { w })`: Bilderleuchte aus Messing (Wandplatte, Arm, Schirm mit leuchtendem Schlitz).
- `glowDecal(p, x, y, z, ry, { w, h, kind: 'cone' | 'round', color, i, flat })`: Lichtfleck ohne echtes Licht (additiv, kein Schatten, zählt nicht zum Lichtbudget). `'cone'` = Lichtkegel an der Wand unter einer Lampe, `'round'` = runder Fleck, `flat: true` = auf dem Boden.

### Museum
- `interior(…, { kind: 'museum' })` (11 × 8 m, 4,6 m hoch): dunkelrote Wände, Parkett, drei Gemälde an der Rückwand (das mittlere groß, hinter einer Kordel), Bilder an den Seitenwänden, alle mit Bilderleuchte, Lichtkegel und Schildchen, zwei Vitrinen (`jewelCase`) auf Sockeln mit Kordel-Absperrung und Lichtfleck am Boden, Museumsbank, Büste und Amphore auf Sockeln, breiter offener Durchgang in den nächsten Saal (mit Flur). Die Auto-Decke hat ein Oberlicht (`skylight: false` = ohne).
- `kind: 'gallery'`: dasselbe modern (weiße Wände, helles Parkett, abstrakte Bilder, Bronzeskulptur). `style: 'modern' | 'classic'` wählt das auch für `museum`.
- `R.cases` (jewelCase-Objekte: `C.smash(t)`, `C.cut(t0, t1)`, `C.items`), `R.paintings`, `R.at('case0' | 'case1' | 'museumBench' | 'door' | 'hall')`, `R.seat('museumBench', i)`.
- Bausteine für eigene Räume: `R.art(wand, u, y, { w, h, art, lit, spot: true })` hängt ein Bild an `'back'` (u = x), `'left'` / `'right'` (u = z) oder `'front'`, mit `spot` samt Leuchte, Lichtkegel und Schild. `R.rope([[x, z], …], { closed })` = Kordel-Absperrung.
- Einzelstücke (`furnish` / `R.put`): `museumBench`, `vitrine` (jewelCase, `items`), `sculpture` (`kind: 'bust' | 'vase' | 'bronze'`), `ropeLine` (`w`, `n`). Frei: `stanchions(p, [[x, z], …], { closed, gap, color, rope, sag })`.

### Plätze
- `plaza(p, x, z, { w: 24, d: 18, ry, y, style, fountain, benches, trees, lamps, lights: 0, bollards, gutter, props, entrance: 2.4, colors })` → P: gepflasterter Platz. Plattenmuster (`paving`), dunkleres Randband, eingelegte Bänder zu den vier Eingängen, Rosette oder Brunnen in der Mitte, Granitbordstein, Rinne mit Gullys, Poller mit Lücken an den Eingängen, Bänke um die Mitte und an den Längsseiten, Mülleimer, Laternen (`lamp()`, echtes Licht nur mit `lights: n`), Bäume in Pflanzkübeln.
  - `style`: `'classic'` (heller Stein, Eisenpoller, Holzbänke) · `'modern'` (Beton, Stahlpoller) · `'old'` (dunkles Pflaster, Steinpoller) · `'forecourt'` (großer hellgrauer Vorplatz wie vor dem Louvre). `colors: { pave, band, inlay, curb, gutter }` überschreibt einzelne Farben.
  - Brunnen ab 12 m kürzester Seite automatisch (`fountain: false` = Rosette).
  - `P.top` (Pflasterhöhe 0,12 m), `P.at('center' | 'n' | 's' | 'e' | 'w' | 'fountain')`, `P.seat(i)` (Bank- und Brunnenrandplätze für `sit`), `P.toWorld(lx, lz)`, `P.lamps`, `P.benches`, `P.bins`, `P.bollards`, `P.fountain`.
- `fountain(p, x, z, { r: 2.2, jets: 8, color, water })` → F: Steinbecken mit profiliertem Rand, Wasser mit Ringwellen, Säule mit überlaufender Schale (Wasserschleier) und Bögen aus Tropfen (instanziert, reine Funktion von t). `F.seats`, `F.seat(i)`, `F.at()` (Spitze des Strahls).
- Einzelstücke: `FURN.bollard` (`kind: 'iron' | 'steel' | 'stone'`), `FURN.parkBench` (`kind: 'wood' | 'concrete' | 'stone'`, Sitzplätze in `userData.seats`), `FURN.litterBin` (`'iron' | 'steel'`), `FURN.treePlanter` (`size`, `tree: false` = Blumen).

Test/Vorschau: `tests/v32-interiors.*` (Kamera fliegt in ein Wohnzimmer, Tür öffnet auf den Flur, Museum, gedrehte erhöhte Küche, Platz mit Brunnen, Haus mit Flur, Galerie von außen).
