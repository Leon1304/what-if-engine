# Neu in v3.2: Materialien, Lichtkegel, Lichtpfützen

## Material-Presets: `mat(hex, { kind })`
`kind` = paint · glass · metal · chrome · ceramic · plastic · wood · fabric · rubber · stone. Das Preset setzt Rauheit, Metallanteil und wie stark die Fläche den Himmel spiegelt (Umgebung aus dem Himmel, seit v3.0). Gilt auch für `box`, `cyl`, `cone`, `ball`, `prism`, `plate`, `finPlate` (Option wird an `mat` durchgereicht).
- paint = Autolack (glatt, Himmel spiegelt sich auf Motorhaube und Dach), glass = Scheibe (fast glatt, spiegelt stark), metal = gebürstetes Metall, chrome = Spiegel, ceramic = glasierte Keramik, plastic = Kunststoff mit leichtem Glanz, wood / fabric / rubber / stone = matt.
- Glänzende Sorten (paint, glass, metal, chrome, ceramic, plastic) sind auf runden Teilen glatt schattiert (Kugeln, Zylinder). Kisten und Umrisse bleiben kantig – der Low-Poly-Look bleibt.
- `rough`, `metal`, `flat` zusätzlich angegeben gewinnen. `env: Zahl` = Stärke der Spiegelung (1 = wie bisher), auch ohne `kind`.
- Durchsichtiges Glas: `mat(hex, { kind: 'glass', opacity: 0.4 })`. Standard ist undurchsichtig (Autos und Häuser haben innen nichts).
- `envK(material, k)` hebt die Spiegelung eines beliebigen Standard-Materials an (Shader-Patch, behält frühere Patches).
- Abschalten: `CFG.materials: false` = alle Presets wie das alte matte Material.

Automatisch:
- `vehicle()`: Karosserie in Lack, Scheiben als Glas (etwas dunkler getönt, spiegeln den Himmel), Chromteile als Chrom, graue Zierteile als Metall, schwarze Stoßstangen/Grill als Kunststoff, Reifen als Gummi und Felgen als Metall (zwei Meshes pro Rad). `vehicle(…, { finish: false })` = alter matter Look.
- `tower()`: Fensterscheiben, Schaufenster und Glastüren als Glas (beleuchtete Fenster leuchten wie bisher).
- Straßenmöbel: Laternen- und Ampelmasten als Metall, Hydrant lackiert, Mülleimer lackiert mit Metalldeckel.

## Kugeln und Obst in Nahaufnahme
- `ball(p, r, …)` ohne `detail`: Radius ≤ 0,35 m oder glänzende Sorte → `detail: 2` (rund statt Polyeder). Große Kugeln (Baumkronen, Felsen) bleiben `detail: 1`.
- `food`: Apfel als gedrechselte Form mit Mulden oben und unten, glatt und leicht wachsig; Orange und Tomate feiner und glatt; Trauben rund und glänzend.
- `fruitBowl(p, x, y, z, { color, fruit: [kind…], scale, ry })` → Gruppe: glasierte Keramikschale mit Obst (Äpfel rot und grün, Orange, Banane, Trauben), statisch, y = Tischplatte. Die Küche (`furnish(…, 'appliances')`) nutzt sie statt der fünf kantigen Kugeln.

## Lichtkegel: `beamMat(o)`
Gemeinsames Material für alle Lichtkegel: additiv, ohne Tiefenschreiben; hell an der Lampe und zum Ende hin auslaufend, hellster Kern in der Mitte, weich zum Rand (Blickwinkel), langsam treibender Staub (Weltraum, reine Funktion von t), blendet über dem Boden aus (keine harte Kante, wo der Kegel den Boden schneidet) und im Nebel.
- `o`: `color`, `k` (Stärke, etwa 2 × alte Deckkraft), `soft` (Kern-Schärfe, 1,6), `dust` (0–1), `dustScale` (1/m), `len` (Abfall entlang des Kegels), `floor` (Welt-y), `floorBand` (0,5 m).
- Animieren: `m.uniforms.uK.value`.
- Geometrie: jede `ConeGeometry`/`CylinderGeometry` (offen); Anfang = Spitze bzw. Oberseite (uv.y = 1).
- Benutzt von: `searchlight` (Kegel beginnt jetzt an der Linse, weicher Kern statt weißer Planke; neue Optionen `soft: 7`, `dust: 0.7`; `opacity` wie bisher), `flashlight`, `headlights` (Kegel waren verkehrt herum – jetzt schmal an der Lampe), UFO-Traktorstrahl (`spaceship({ kind: 'ufo', beam })`), Leuchtturm, U-Boot-Scheinwerfer, Polizei-Hubschrauber, Wachturm am Gefängnis, Discokugel.

`beamSpot(beam, { axis, len, tan, color, k, floor, spot })` → Mesh: weicher, elliptischer Lichtfleck, wo der Kegel den Boden trifft (nach dem Posieren der Figuren berechnet, verschwindet mit dem Kegel). Automatisch bei Taschenlampe, Scheinwerfern, UFO-Strahl, Polizei-Hubschrauber und Wachturm. `flashlight(…, { spot: false })` / `headlights(…, { spot: false })` = ohne.

## Lichtpfützen und Halos (keine echten Lichter)
- `lightPool(p, x, y, z, { r, color, k, night, wall, ry, ignore })`: weicher Lichtschein auf dem Boden unter einer Lampe (lokal zu p). Legt sich kurz vor `bake()` über Bordsteine, Stufen, Pflaster (alles bis 0,28 m über dem Lampenfuß; Bänke, Autos und der eigene Sockel – `ignore: Gruppe` – bleiben außen vor). Alle statischen Pfützen = ein Draw-Call. Folgt der Dunkelheit (`NIGHTK`); `night: false` = immer an (Innenräume); `wall: true` = senkrecht an einer Wand (lokal +z aus der Wand).
- `bulbHalo(p, x, y, z, { size, color, k, night })`: kleiner weicher Schein um eine Glühbirne, zur Kamera gedreht, etwas vor die Birne gezogen (Lampengehäuse schneiden ihn nicht). Alle statischen Halos = ein instanzierter Draw-Call.
- Automatisch: `lamp()` (Pfütze r = 1,25 × Höhe, schwächer wenn die Lampe ein echtes Licht hat, Halo um die Birne), `streetlight()` und damit `city()` (Pfütze unter dem Kopf über der Straße, Halo unter dem Kopf).
- Abschalten: `lamp(…, { pool: false, halo: false })`, `streetlight(p, x, z, ry, { pool: false, halo: false })`, `city({ pools: false })`, ganz: `CFG.pools: false` (auch ohne Lichtflecken der Kegel).

Test: `tests/v32-materials` (Autos am Tag, Material-Kugeln, Obst auf dem Tisch, Straße in Dämmerung und Nacht mit Laternen, Suchscheinwerfer, Leuchtturm, UFO-Strahl, Taschenlampe, Scheinwerfer, kleine Stadt von oben).
