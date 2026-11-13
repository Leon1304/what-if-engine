# Waldtank – Überleben im Nordwald

Survival-Erkundungsspiel aus der Ich-Perspektive im Low-Poly-Stil: ein Stück Herbstwald mit Landstraße, einer verlassenen
Tankstelle (mit kompletter Inneneinrichtung), Bach, Hochsitz, Feuerstelle und verlassenem Wohnwagen.

**Spielen:** https://leon1304.github.io/what-if-engine/game/ (Chrome, Edge, Firefox oder Safari; Maus + Tastatur)

## Steuerung
| Taste | Aktion |
|---|---|
| W A S D · Maus | laufen · umschauen |
| Shift · Leertaste · Strg | sprinten · springen · ducken |
| E | benutzen, öffnen, aufheben, durchsuchen, klettern, Holz hacken |
| F | Taschenlampe |
| Tab / C | Rucksack & Herstellen |
| 1–5 · Mausrad · Q | Schnellleiste wählen · essen / trinken / benutzen |
| M | Wanderkarte (wenn gefunden) |
| Z halten | Zeit vorspulen (drinnen mit Strom, am Feuer oder mit Schlafsack) |
| Rechte Maustaste | Fernglas |
| Esc | Pause (Orte, Grafikstufe) |

Spielstand: automatisch alle 20 s im Browser.

## Inhalt
- **Tutorial (12 Schritte)** führt vom liegengebliebenen Auto zur Tankstelle, durch Hintereingang, Essen, Sicherungskasten,
  Diesel aus dem Schuppen und Notstrom-Aggregat bis zum Funkgerät. Danach: 9-V-Block aus Bernds Hochsitz holen, Hilfe rufen,
  bis Sonnenaufgang überleben → Rettung.
- **Werte:** Gesundheit, Hunger, Durst, Wärme, Ausdauer. Kälte nachts und bei Regen, Wärme drinnen mit Strom, am Feuer, mit Jacke.
- **Tag/Nacht** (1 s = 1 Spielminute), Regenschauer, Sterne, Mond.
- **Tiere:** Wölfe nachts (fliehen vor Taschenlampe, Fackel, Feuer; kommen nicht in den Shop), Rehe am Tag.
- **Ereignisse:** nachts fährt ab und zu ein Auto vorbei (hält und hupt, wenn du auf der Straße stehst).
- **Herstellen:** Fackel, Verband, Lagerfeuer überall; kochen am Feuer, in der Mikrowelle oder mit dem Gaskocher.
- **Strom:** Licht, Kühlregale, Kaffeemaschine, Kasse, Geldautomat, Zapfsäulen und Schiebetür funktionieren erst mit dem Aggregat (Tank hält ~10 Spielstunden).
- **Erkunden:** 8 Orte, Wanderkarte, Fernglas, Pilze (rote sind giftig), Bachwasser (abkochen!), Axt zum Holzhacken an jedem Baum.

## Aufbau
| Pfad | Inhalt |
|---|---|
| `blender/core.py` | Helfer: Low-Poly-Materialien (Farbe je Facette als Vertex-Farbe), Wände, Texte, Lichter, Kartenlayout (Straße, Bach, Pfade) |
| `blender/s00_world.py` … `s08_camp.py` | die Map in Abschnitten: Welt, Gelände, Straße, Vorplatz, Gebäude, Einrichtung, Wald, Hof & Auto, Wohnwagen |
| `blender/build_all.py` | baut alles ohne Blender-Oberfläche und exportiert `map.glb` (+ `blender/map.blend` zum Anschauen) |
| `blender/shrink.mjs` | komprimiert `map.glb` (gltf-transform) |
| `js/` | das Spiel (Three.js 0.170): `world.js` Laden/Instancing/Kollision, `player.js`, `game.js` Logik, `life.js` Tiere/Auto/Feuer, `sky.js`, `audio.js`, `ui.js`, `items.js` |
| `tools/shots.mjs` · `tools/playthrough.mjs` | Screenshots und automatischer Komplett-Durchlauf (Headless-Chromium) |

### Map neu bauen
```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python game/blender/build_all.py
node game/blender/shrink.mjs game/map.glb
node game/tools/playthrough.mjs        # muss mit PLAYTHROUGH OK enden
```
Live in Blender (MCP): `core.py` ausführen und `section('s03_forecourt')` aufrufen – baut nur diesen Abschnitt neu.

### Interaktive Objekte (Blender → Spiel)
Eigenschaften am Objekt landen als glTF-Extras im Spiel: `interact` = `door` | `slide` | `lid` | `drawer` | `switch` | `pickup` |
`search` | `use` | `read` | `pump`, dazu `label`, `item`, `angle`, `axis`, `slide`, `needs`, `locked`/`key`, `text`, `glow_group`.
Der Drehpunkt ist der Objekt-Ursprung (`pivot_w` beim Export). Lichter sind Empties `light_*` (`color`, `power`, `group`),
Spielpunkte `spawn` und `ziel_*`. `collide = 0` = begehbar, `collide_r` = Baumstamm-Radius.
