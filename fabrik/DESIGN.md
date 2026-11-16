# Cogtopia – Konzept (Ordner `fabrik/`)

Gemütlich-süchtiges Fabrik-Aufbauspiel im Browser (Three.js, Low Poly, alles prozedural, keine GLB).
Bohrer fördern Erz, Bänder tragen es zu Maschinen, Maschinen machen daraus wertvollere Teile, Verkaufsstationen bringen Geld.
Die Fabrik ist nie fertig: neue Rohstoffe, Rezepte, Land, Aufträge und am Ende eine neue Fabrik in einer neuen Welt (Prestige).
Unabhängig von Engine, Waldtank und Schwebeinsel. **Sprache wählbar** (Englisch Standard, Deutsch; erweiterbar über `js/i18n.js` + `js/lang/<code>.js`; die Sim liefert nur Ids/Parameter, nie fertige Sätze); interne Ids bleiben deutsch wie unten, Code-Kommentare deutsch.

## Spielschleife
| Zeitraum | Ziel | Belohnung |
|---|---|---|
| Sekunden | Teil kommt an der Verkaufsstation an | Münzen fliegen hoch, Takt-Zähler steigt |
| unter 1 Min | nächstes Gebäude, nächster Auftrag | neues Gebäude, Kiste |
| eine Sitzung | Forschung, neues Grundstück, neues Rezept | neue Maschinen, Rohstoffe, Einträge im Rezeptbuch |
| viele Sitzungen | Neue Fabrik (Prestige), Erfolge, Rezeptbuch voll | Patente (dauerhafte Boni), neue Welten, Bandfarben |

## Eigene Mechaniken (das Besondere)
1. **Goldteile:** Bohrer fördern selten (0,5 %, Forschung/Patente erhöhen) ein glänzendes Goldteil. Gold bleibt beim Verarbeiten erhalten
   (Gold rein → Gold raus, bei Rezepten mit mehreren Zutaten reicht eine goldene), Wert ×25. Je länger die Kette, desto größer der Jackpot. Funkelt sichtbar auf dem Band.
2. **Takt:** Jede Verkaufsstation hat einen Takt-Multiplikator. Kommt mindestens alle 2 s ein Teil an, steigt er langsam bis ×2 (nach ca. 60 s); eine Lücke setzt ihn zurück.
   Saubere, lückenlose Anlagen lohnen sich. Anzeige als Ring/Balken über der Station.
3. **Maschinen-Sterne:** Jede Maschine sammelt Erfahrung mit jedem Durchlauf, Stufen ★1–★5, je +10 % Tempo. Man hängt an seinen alten Maschinen.
4. **Experimentiertisch + Rezeptbuch:** Zwei beliebige Teile in den Experimentiertisch → passt die Kombination zu einem versteckten Rezept, wird es entdeckt
   (Fanfare, Eintrag im Rezeptbuch, ab dann in der Montage baubar). Sonst entsteht Schrott (wenig wert) und das Buch merkt sich die Fehlkombination.
   Dr. Steve verkauft Tipps (Geld) für ein noch unbekanntes Rezept. Entdeckte Rezepte bleiben über Prestige erhalten.
5. **Gerald der Praktikant:** Alle 3–6 Min läuft Gerald über das Gelände (Running Gag des Kanals). Anklicken → Überraschungskiste. Selten setzt er sich auf ein Band
   und blockiert es, bis man ihn anklickt (höchstens 20 s, dann geht er von selbst). Nie dauerhaft schädlich.
6. **Kisten (Zufallsbelohnung):** aus Aufträgen, Gerald, Ruinen auf neuen Grundstücken, Erfolgen. Inhalt gewichtet zufällig: Geldsack, Turbo (×2 Tempo für 2 Min),
   Forschungs-Gutschein (−50 % auf eine Forschung), Bandfarbe/Deko, Goldregen (nächste 20 geförderte Teile golden), sehr selten Patent.
7. **Grundstücke:** Karte aus 16×16-Feldern; Start ist das Mittelfeld. Nachbarfelder kaufen (Preis steigt) deckt neue Vorkommen auf, manchmal Kristall oder eine Ruine mit Kiste.
8. **Aufträge:** 3 Plätze, z. B. „Liefere 40 Kupferdraht in 4 Min“ (zählt verkaufte Teile). Belohnung Geld + Kiste. Ein Tagesauftrag pro Kalendertag (Datum kommt von außen, Sim bleibt rein), größere Belohnung.
9. **Offline-Fabrik:** Beim Zurückkommen läuft die Fabrik rechnerisch weiter: Durchschnittseinnahmen der letzten 5 Spielminuten × Abwesenheit (max. 8 h) × 50 % (Patente erhöhen). Meldung „Während du weg warst …“.
10. **Neue Fabrik (Prestige):** ab 1 Mio. verdient im aktuellen Durchgang. Patente = floor(sqrt(verdient / 100 000)). Patentbaum mit dauerhaften Boni und neuen Welten.
    Behalten: Patente, Rezeptbuch, Erfolge, Deko, Statistik gesamt. Zurückgesetzt: Geld, Gebäude, Forschung, Grundstücke.
11. **Erfolge** (~25) mit kleinen Belohnungen (Startgeld, Bandfarben, Titel).

## Welten (Biome)
| id | Name | Vorkommen | Besonderheit |
|---|---|---|---|
| `wiese` | Grüne Wiese | stein, eisenerz, kupfererz, kohle, sand | Start |
| `wueste` | Wüste | viel sand, kupfererz, oel | Glas/Öl-Rezepte lohnen mehr |
| `eis` | Eiswelt | eisenerz, kohle, kristall häufiger | Bänder etwas langsamer, Kristall ×2 Wert |
| `mond` | Mond | kristall, titanerz, stein | geringe Schwerkraft: Bohrer schneller |

## Gegenstände (ids, fest)
Rohstoffe: `stein`, `eisenerz`, `kupfererz`, `kohle`, `sand`, `kristall`, `oel`, `titanerz`
Stufe 2: `ziegel` (stein), `eisenbarren`, `kupferbarren`, `glas` (sand), `titanbarren`, `kunststoff` (oel)
Stufe 3: `eisenplatte`, `zahnrad`, `kupferdraht`, `rohr`, `linse` (glas)
Stufe 4: `schaltkreis` (platte + draht), `motor` (zahnrad + draht), `akku` (kupferbarren + kunststoff), `fenster` (glas + rohr)
Stufe 5+: `roboter`, `computer`, `laser`, `solarpanel`, `rakete` (versteckte Rezepte über den Experimentiertisch), `schrott`
Jeder Gegenstand: `name`, `value`, `color`, `shape` (`chunk` | `bar` | `plate` | `gear` | `coil` | `chip` | `box` | `orb` | `pipe` | `lens` | `rocket` | `robot`), `tier`.
Goldteil ist kein eigener Typ, sondern ein Flag am einzelnen Teil (`gold: true`).

## Gebäude (ids, fest)
| id | Name | Größe | Art |
|---|---|---|---|
| `band` | Förderband | 1×1 | trägt Teile in Blickrichtung, bis 4 Teile pro Feld |
| `tunnel` | Tunnelband | 1×1 | Ein- und Ausgang bis 4 Felder Abstand, unter anderem durch |
| `verteiler` | Verteiler | 1×1 | verteilt reihum auf links/geradeaus/rechts |
| `sortierer` | Sortierer | 1×1 | eingestellter Typ geht nach links, Rest geradeaus |
| `bohrer` | Bohrer | 2×2 | auf Vorkommen; fördert den Rohstoff darunter |
| `ofen` | Schmelzofen | 2×2 | 1 Zutat → Barren/Glas/Ziegel |
| `presse` | Presse | 2×2 | Barren → Platte/Zahnrad/Rohr |
| `drahtzug` | Drahtzieher | 2×2 | Kupferbarren → Draht, Glas → Linse |
| `montage` | Montage | 3×3 | 2 Zutaten → Bauteil (nur entdeckte/erforschte Rezepte) |
| `raffinerie` | Raffinerie | 3×3 | Öl → Kunststoff |
| `experiment` | Experimentiertisch | 3×3 | 2 Zutaten → Entdeckung oder Schrott |
| `labor` | Labor (Dr. Steve) | 2×2 | verbraucht Teile → Forschungspunkte |
| `verkauf` | Verkaufsstation | 2×2 | nimmt alles von allen Seiten, Geld + Takt |
| `lager` | Lager | 2×2 | puffert bis 200 Teile, gibt nach vorn aus |
Drehung `rot` 0–3 (0 = +x, 1 = +z, 2 = −x, 3 = −z). Maschinen geben auf ihrer Vorderseite aus (Feld vor der Mitte der Vorderkante), nehmen von Bändern auf den anderen Seiten an.

## Architektur
| Datei | Inhalt | Zuständig |
|---|---|---|
| `js/data.js` | ITEMS, BUILDINGS, RECIPES, RESEARCH, PATENTS, BIOMES, ACHIEVEMENTS, CRATES (reine Daten) | Sim |
| `js/rng.js` | gesäter Zufall (mulberry32), Rauschen für Vorkommen | Sim |
| `js/sim.js` | `Factory`: komplette Spiellogik ohne DOM/Three, fester Takt 20 Ticks/s, deterministisch | Sim |
| `js/storage.js` | Speicherplätze in localStorage (Präfix `fabrik.`), Export/Import `.fabrik.json` | Sim |
| `js/kit.js`, `js/materials.js` | Low-Poly-Baukasten, Materialien (Band-Pfeile per UV-Scroll, Gold-Glanz) | Grafik |
| `js/models/*.js` | Modelle aller Gebäude, Teile (instanziert), Gelände/Vorkommen, Gerald, Dr. Steve, Deko | Grafik |
| `js/stage.js`, `js/camera.js` | Renderer, Licht, Schatten, Himmel je Welt, leichtes Post-FX · schräge Draufsicht, schieben/zoomen/drehen, Touch | Grafik |
| `js/audio.js` | prozeduraler Ton (WebAudio): Klackern, Münzen, Entdeckung, Grundrauschen, ruhige Musik | Grafik |
| `js/view.js` | bindet Sim an Szene (Gebäude rein/raus, Teile auf Bändern interpolieren, Ereignis-Effekte) | Integration |
| `js/ui.js`, `js/main.js`, `index.html` | Oberfläche, Bauleiste, Panels, Anleitung, Eingabe, Zeit | Integration |

### Sim-Schnittstelle (`js/sim.js`)
```js
import { Factory, SAVE_VERSION } from './sim.js';
const f = new Factory({ seed: 123, biome: 'wiese' });   // oder Factory.load(json)
f.canPlace(type, x, y, rot)  // → { ok, reason, cost }
f.place(type, x, y, rot)     // → id | null
f.placeLine(type, cells)     // cells: [[x,y,rot], …] für gezogene Bänder → Anzahl
f.remove(id)                 // volle Rückerstattung
f.rotate(id); f.setRecipe(id, recipeId); f.setFilter(id, itemId)
f.undo()                     // letzte 20 Bauaktionen
f.tick(n = 1)                // n feste Schritte à 1/20 s
f.buyResearch(id); f.buyPlot(cx, cy); f.buyTip(); f.clickGerald(); f.openCrate(i)
f.contracts; f.claimContract(i); f.setToday('2026-11-16')
f.canPrestige(); f.prestige(biome)    // → Patente
f.buyPatent(id)
f.offline(seconds)           // → { money, seconds } und bucht gut
f.toJSON()                   // Spielstand (alles über Namen/Ids), SAVE_VERSION, Migration alter Stände
f.events()                   // leert die Ereignisliste: sold, gold, discover, fail, levelup, contract, crate, achievement, gerald, plot, research …
// Für die Grafik:
f.S                          // Zustand (money, research, entities, plots, …) – nur lesen
f.entities()                 // [{ id, type, x, y, rot, w, h, recipe, level, busy, progress, … }]
f.deposit(x, y)              // → { item, rich } | null
f.plotState(cx, cy)          // 'open' | 'buyable' | 'locked'
f.forEachItem(alpha, cb)     // cb(wx, wz, itemId, gold, key) – Teile auf Bändern, zwischen zwei Ticks interpoliert
```

### Tests
- `node fabrik/tools/rules.mjs` → `RULES OK` (Logik headless: Kette Bohrer → Band → Ofen → Verkauf bringt Geld, Gold bleibt erhalten, Takt, Sterne,
  Experiment entdeckt Rezept, Aufträge, Grundstücke, Offline, Prestige, Speichern/Laden gleich, alte Stände laden, Determinismus)
- `node fabrik/tools/models.mjs <ordner>` → `MODELS OK` (alle Modelle im Browser, Bilder, keine Fehler)
- `node fabrik/tools/play.mjs <ordner> [--shots]` → `PLAY OK` (ganzes Spiel im Browser mit echten Klicks, Bildrate, Neuladen, Handy-Ansicht)
