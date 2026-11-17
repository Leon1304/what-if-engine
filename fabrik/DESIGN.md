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
7. **Grundstücke:** Karte aus 5 × 5 Grundstücken à 24×24 Feldern (bis 17.11.2026: 7 × 7 à 16×16); Start ist das Mittelfeld. Nachbarfelder kaufen (Preis steigt) deckt neue Vorkommen auf, manchmal Kristall oder eine Ruine mit Kiste.
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
| `grossbohrer` | Großbohrer | 4×4 | nicht baubar: entsteht von selbst aus 4 Bohrern (genau 2×2-Quadrat, gleicher Rohstoff, gleiche Mk); ein Ausgang, Förderung = Summe der 4 + 25 %, 16er-Puffer, Preis/Strom/Ausbau wie 4 Bohrer |
| `ofen` | Schmelzofen | 2×2 | 1 Zutat → Barren/Glas/Ziegel |
| `presse` | Presse | 2×2 | Barren → Platte/Zahnrad/Rohr |
| `drahtzug` | Drahtzieher | 2×2 | Kupferbarren → Draht, Glas → Linse |
| `montage` | Montage | 3×3 | 2 Zutaten → Bauteil (nur entdeckte/erforschte Rezepte) |
| `raffinerie` | Raffinerie | 3×3 | Öl → Kunststoff |
| `experiment` | Experimentiertisch | 3×3 | 2 Zutaten → Entdeckung oder Schrott |
| `labor` | Labor (Dr. Steve) | 2×2 | verbraucht Teile → Forschungspunkte |
| `verkauf` | Verkaufsstation | 2×2 | nimmt alles von allen Seiten, Geld + Takt |
| `lager` | Lager | 2×2 | puffert bis 200 Teile, gibt nach vorn aus |
| `kraftwerk` | Kraftwerk | 3×3 | verbrennt Kohle/Öl von Bändern → 40 Leistung, Reichweite 5 (Ausbau 2) |
| `solar` | Solarfeld | 2×2 | 8 Leistung × Welt, im Sandsturm 0, Reichweite 3 |
| `mast` | Strommast | 1×1 | trägt Strom 6 Felder weit, Masten in Reichweite bilden ein Netz |
| `heizer` | Heizer | 1×1 | Eiswelt: Bänder im Umkreis 4 frieren nicht (2 Leistung) |
| `drohnenhafen` | Drohnenhafen | 2×2 | Sender → Empfänger per `link`, Drohnen tragen 4 Teile (5 Leistung) |
| `wunder` | Weltwunder | 5×5 | eins je Fabrik ab dem ersten Prestige, 5 Stufen mit dauerhaften Boni |
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

---
# Ausbau 2 (ab 16.11.2026) – Vertrag für alle Agenten
Ziel: Bauen angenehmer, mehr Belohnungen, Langzeit-Tiefe. Alles in EN + DE, deterministisch (Sim), Spielstände alter Version laden weiter
(`SAVE_VERSION` 1 → 2 mit Migration). Erweiterungspunkte in `sim.js`: `f.hooks.{tick,event,prestige}` (Rückrufe), `f.X = {belt, mach, drill, gold, sell:{item:mul}}`
(Laufzeit-Faktoren, nach Änderung `f.refreshMods()`), `S.meta` (gespeicherter Zustand der Zusatzsysteme, bleibt über Prestige).

## Logik in sim.js / data.js / blueprint.js (Agent „Sim“)
0. **Bänder verbinden sich bei Berührung (auto-join):** Beim Setzen eines Bands (einzeln oder gezogen) werden passende Nachbarn verbunden:
   - ein Nachbarband, dessen Ausgang ins Leere zeigt (Sackgasse), und das nicht vom neuen Band gespeist wird, dreht seinen Ausgang auf das neue Feld (nie rückwärts gegen seinen Eingang);
   - ein einzeln gesetztes Band richtet sich selbst aus: wird es von einem Nachbarn gespeist, läuft es geradeaus weiter bzw. zum einzigen annehmenden Nachbarn (Maschinen-Eingangsseite, Verkauf, Lager, Band das nicht auf es zeigt);
   - Band auf dem Ausgangsfeld einer Maschine zeigt von ihr weg; Enden gezogener Linien biegen in ein angrenzendes annehmendes Ziel ein, Anfänge nehmen eine angrenzende Sackgasse auf.
   - Teil derselben Undo-Aktion, abschaltbar (`f.opts.autoJoin`, Standard an). Ereignis `join {ids}` für einen kleinen Effekt.
1. **Wegsuche:** `route(f, from, to, {tunnels})` in `blueprint.js` (rein): A* über freie, eigene Felder mit Abbiege-Kosten; ist `tunnel` erforscht, springt der Weg mit Tunnelpaaren (Reichweite 4) über Hindernisse. Rückgabe `[{x,y,rot,type:'band'|'tunnel'}]`. `f.placePath(cells)` setzt alles atomar (eine Undo-Aktion, Kostenprüfung gesamt).
2. **Blaupausen:** `f.capture(x0,y0,x1,y1)` → `{w,h,ents:[{type,dx,dy,rot,recipe,filter,mk}]}`, `bpRotate(bp,r)`, `f.canPaste(bp,x,y)` → `{ok,cost,blocked:[[x,y]],locked:[types]}`, `f.paste(bp,x,y)` (eine Undo-Aktion; Verkaufsstationen/Wunder werden nicht kopiert).
16. **Teilen:** `encodeBp(bp)` → `COG1:` + base64url (kompakt), `decodeBp(str)` → bp | null (streng geprüft, nur bekannte Typen, Größe ≤ 48×48).
3. **Upgrades:** Feld `mk` (1–3) an Bohrer, Ofen, Presse, Drahtzug, Montage, Raffinerie, Experiment, Labor, Lager, Verkauf. `f.canUpgrade(id)`/`f.upgrade(id)`: Mk II = 4 × aktueller Baupreis des Typs, Mk III = 12 ×; Forschung `upgrade1`/`upgrade2`.
   Tempo ×1,6 / ×2,5, Puffer ×2 / ×3, Lager-Kapazität ×2 / ×3, Verkauf Wert +15 % / +30 %. Abriss erstattet alles Bezahlte. Undo-fähig.
4. **Engpässe:** `f.diagnose(id)` → `{state, util (0–1, letzte 30 s), missing:[item], blocked:bool, power:0–1, key, vars}` (i18n-Schlüssel `diag.*` mit Tipp),
   `f.bottlenecks(n=5)` → wichtigste Probleme `[{id, key, vars, sev}]`.
10. **Strom:** neue Gebäude `kraftwerk` (3×3, verbrennt `kohle` oder `oel` aus Bändern, 1 Teil / 4 s → 40 Leistung), `solar` (2×2, 8 Leistung × Welt: wueste 1,5, eis 0,6, mond 2; 0 im Sandsturm), `mast` (1×1, Reichweite 6).
    Reichweite: Kraftwerk 5, Solar 3, Mast 6 (Chebyshev ab Grundfläche); Erzeuger und Masten in Reichweite bilden ein Netz. Verbraucher im Netz (irgendein Feld in Reichweite):
    `montage` 10, `raffinerie` 15, `experiment` 8, `heizer` 2, `drohnenhafen` 5, jede Maschine ab Mk II 4 (Mk III 8); auf dem Mond brauchen alle Maschinen Strom (Mk I = 3).
    Versorgung je Netz s = min(1, Angebot/Bedarf) → Tempo × s; ohne Netz Zustand `nopower`. Forschung `strom` (vor `montage`; `montage` setzt `strom` voraus).
    Migration v1→v2: `S.powerGrace = 1800` s, in denen unversorgte Verbraucher voll laufen (Hinweis-Ereignis). `f.powerInfo()` → Netze `[{supply, demand, s, nodes:[ids]}]` für Overlay.
11. **Drohnen:** `drohnenhafen` (2×2). `f.link(a,b)` verbindet Sender (nimmt Teile von Bändern) mit Empfänger (gibt vorn aus). Drohne trägt 4 Teile, 6 Felder/s, 1 Drohne je Hafen (+1 je Mk). `forEachDrone(alpha, cb(wx,wz,h,itemId,gold,key))` für die Grafik. Forschung `drohnen`.
12. **Weltwunder:** `wunder` (5×5, eins je Fabrik, erst nach dem ersten Prestige). 5 Stufen (data.js `WONDER`): 1 {ziegel 2000, eisenplatte 1000}, 2 {motor 300, schaltkreis 300}, 3 {computer 150, akku 300},
    4 {laser 100, solarpanel 100}, 5 {rakete 50, roboter 50}. Nimmt nur Teile der aktuellen Stufe an; Fortschritt `S.wonder = {stage, have:{}}` bleibt über Prestige (auch wenn abgerissen).
    Jede Stufe: dauerhafter Bonus (z. B. +10 % Verkauf, +0,5 % Gold, +10 % Bänder, +1 Kiste/Tag, Titel) + Ereignis `wonder {stage}`; Stufe 5: `wonder {stage:5, launch:true}`, Titel „Rocket Tycoon“, 10 Kisten.
13. **Welt-Regeln:** Wüste: Sandsturm alle 8–12 min für 45 s (Bänder × 0,5, Solar 0, Ereignis `storm {on, secs}`); Eis: Bänder außerhalb Reichweite 4 eines versorgten `heizer` (1×1) laufen × 0,6 (`frozen` je Band für die Grafik); Mond: siehe Strom. Bandtempo je Band (`n.slow`), nicht nur global.
14. **Verlauf für Zeitraffer:** `S.hist` (Ringpuffer 3000 Einträge `[tick, 'b'|'r'|'u', type, x, y, rot, mk]`, über Prestige geleert), `f.history()`.
-  **Für Zusatzsysteme:** `f.addDeposit(x, y, item, secs, rich)` (vorübergehendes Vorkommen, gespeichert in `S.xdep`, läuft ab und stellt das Alte wieder her, Bohrer darauf passen sich an), `f.addCrate(src)`, `f.freeCells(n, near?)`,
   Zähler `S.total.goldMade{item}` und `S.total.perfect{item}` (von ★5-Maschinen gefertigt) für das Album.

## Zusatzsysteme in js/meta.js (Agent „Meta“, DOM-frei, nur öffentliche API + Hooks + S.meta)
`export class Meta { constructor(f); attach(f); detach(); … }` – nach jedem `new Factory`/`load` mit `attach(f)` verbunden. Datum kommt von außen (`'YYYY-MM-DD'`). Ereignisse über `f._emit`.
5. **Glücksrad + Serie:** `canSpin(today)`, `spin(today)` → `{seg, reward}` (8 Segmente gewichtet: Geld = Einnahmen × 2 min (mind. 500), großes Geld × 10 min, Forschungspunkte, Kiste, Turbo 120 s, Goldregen 20, Gutschein, Jackpot Patentpunkt 2 %).
   `checkIn(today)` → Tagesbelohnung der Serie (Tag 1–7: Kiste, Geld, 2 Kisten, Turbo, Gutschein, 3 Kisten, Patentpunkt; dann wieder Tag 1), Serie reißt nach einem verpassten Tag.
6. **Ereignisse** alle 10–15 Spielminuten (gesät): `goldvein` (Gold +5 % für 120 s), `meteor` (Kristall-Vorkommen 3×3 auf eigenem freiem Land, 10 min), `quake` (3 neue Vorkommen, 15 min),
   `vip` (Großauftrag: n Teile in 5 min, Belohnung ×3 + 2 Kisten), `boom` (ein verkauftes Teil ×3 Wert für 120 s). Ereignis `event {kind, secs, …}`, laufende in `meta.active()`.
7. **Durchbrüche:** nach `research`-Ereignis 12 % (+Glück) Chance: 50 % Rückerstattung, Gutschein, Kiste oder Forschungspunkte. Ereignis `breakthrough {id, kind, …}`.
8. **Album:** je Teil 4 Karten: normal (je hergestellt/gefördert), gold (golden hergestellt), perfekt (★5-Maschine), mega (1000 insgesamt). Seiten je Stufe; volle Seite → Belohnung (Bandfarbe/Kiste), volles Album → Patentpunkt + Titel. `album()` → Seiten/Karten/Status, Ereignis `card {item, variant}`.
9. **Ziele:** `nextGoals(n=3)` → `[{key, vars, progress 0–1, target:{type,id}}]` (nächste Forschung, nächstes Gebäude, Grundstück, nächster Erfolg, Prestige, Wunderstufe).
15. **Wochen-Herausforderung:** `challengeSpec(isoWeek)` → `{week, seed, biome, secs:1800, startMoney}`; Fabrik mit `S.chal = {week, left}` (kein Prestige/Offline, eigener Speicherplatz); Ende → Ereignis `challengeEnd {score}`; `resultCode(week, score)`.
Test: `node fabrik/tools/meta-rules.mjs` → `META OK`.

## Grafik/Ton (Agent „Grafik“)
Modelle: kraftwerk, solar, mast (+ `makeCable(a,b)` mit Durchhang), heizer, drohnenhafen + `makeDrone()`, wunder (5 sichtbare Baustufen + Startanimation), Upgrade-Stufen `setMk(1–3)` aller Maschinen,
Effekte (Meteor-Einschlag + Krater, Beben-Risse + Wackeln, Sandsturm, Frost auf Bändern, VIP-Laster, Goldader-Glühen, Durchbruch, Album-Karte), Overlays (Strom-Reichweite, Netz-Linien, Blitz-Symbol „kein Strom“,
Engpass-Symbole über Gebäuden), Instancing/LOD für Fabriken mit 300+ Maschinen (#17), Fotomodus-Post-FX (Tilt-Shift, Vignette, Filter, Hochauflösung) (#19), Musik je Welt mit Dichte nach Fabrikgröße (#18),
`stage.renderFrame(w,h)` für 9:16-Zeitraffer (#14). Test `models.mjs` → `MODELS OK`.

## Oberfläche (Agent „UI“, umgesetzt 17.11.2026)
Alle neuen Systeme bedienbar, plus: Bänder ziehen mit Wegsuche-Vorschau, Blaupausen-Werkzeug + Bibliothek (`fabrik.bp.*`, bleibt über Prestige) + Code teilen/einfügen, Upgrade im Info-Panel,
Engpass-Overlay + Liste, Strom-Overlay, Drohnen verknüpfen, Glücksrad-Bildschirm, Serien-Kalender, Ereignis-Banner mit Timer, Durchbruch-Animation, Album, Ziel-Leiste oben, Wunder-Panel,
Wochen-Herausforderung (Modus im Menü, Bestenliste lokal, Ergebnis-Code), Zeitraffer als 9:16-Video (WebM/MP4) exportieren, Fotomodus, Einstellung „Bänder automatisch verbinden“. Test `play.mjs` → `PLAY OK`.

Umsetzung (Dateien `js/ui.js` + Mixins `js/ui/meta.js`, `js/ui/tools.js`, `js/ui/common.js`, `js/media.js`, `js/main.js`, `js/view.js`):
- **Ordnung:** rechte Leiste = Forschung, Aufträge, Rezeptbuch, Kisten, Glücksrad (Punkt, wenn drehbar), Menü ☰ (Abzeichen bei offener Serie).
  Menü mit Kacheln in Gruppen Fabrik / Jeden Tag / Werkzeuge & Teilen / Spiel. Bauleiste: Werkzeuge (Abriss, Rückgängig, Blaupause `B`, Strom `P`, Engpässe `I`)
  und nur die Gebäude, die freigeschaltet sind oder deren Forschung gerade kaufbar ist (Wunder erst nach dem Prestige).
- **Bauen:** L-Form ↔ Wegsuche (`F`, Umschalter in der Werkzeugzeile, Einstellung `beltMode`); Wegsuche-Vorschau mit Tunneln, Kosten, rot + „Kein Durchkommen“.
  auto-join (Einstellung → `f.opts.autoJoin`), Funkeln bei `join`. Ziehen fängt den Zeiger (Loslassen über der Oberfläche schluckt keinen Tipp mehr).
- **Blaupausen:** Rechteck ziehen → `capture`, Vorschau mit Geist-Gebäuden (Vorrat je Typ), blockierte Felder rot, Kosten in der Werkzeugzeile, `R` → `bpRotate`,
  Touch: Tipp setzt Vorschau, ✓ baut. Bibliothek `fabrik.bp.<id>` (Name, Umbenennen, Löschen, SVG-Vorschau), Code kopieren (Zwischenablage + Dialog), Code einfügen mit Fehlertext.
- **Info-Panel:** Mk-Abzeichen, Upgrade-Knopf (Kosten, Grund, Strombedarf), Strom-Zeile (Versorgung, Verbrauch, Schonfrist), Diagnose mit Tipp (`diagnose`),
  Kraftwerk (Brennstoff, Leistung, Reichweite, Netz), Solar/Mast/Heizer, Drohnenhafen (Ziel, Absender, „Verbinden“ → Ziel anklicken, „Trennen“), Wunder (Bedarf).
- **Überlagerungen:** Strom (Reichweiten, Netzlinien, %-Schild je Netz, Karte mit Angebot/Bedarf, Maschinen außerhalb), Engpässe (Symbole + Liste `bottlenecks`,
  Klick → Kamera fliegt hin). Roter Blitz über Maschinen ohne Strom immer sichtbar.
- **Ansicht:** `BuildingLOD` (Schwelle wächst mit dem Kameraabstand), Bänder mit Frost/Tempo, `CableSet` (Baum je Netz), `DroneRenderer`, `setMk`, Wunder-Stufen + Start,
  Effekte für alle neuen Ereignisse, `sound.setWorld/setPower/setStorm`.
- **Zusatzsysteme:** Glücksrad (SVG, 8 Segmente, CSS-Drehung passend zu `sound.wheelSpin`, Ergebnis-Karte, Konfetti), Serie (Kalender, Check-in-Popup beim Start
  nach der Anleitung), Ereignis-Banner mit Timer und VIP-Fortschritt, Durchbruch-Karte, Album (Seiten-Reiter, 4 Karten je Teil, „???“ mit Hinweis), Ziel-Leiste (Klick →
  Panel/Werkzeug/Kamera), Wunder-Panel, Wochen-Herausforderung (Platz `save.chal`, HUD-Timer, Ende-Bildschirm, Bestenliste `fabrik.chal.<Woche>`, Codes).
- **Zeitraffer:** Kopie der Fabrik (leer, gleiche Welt/Land/Forschung) baut `history()` + Abgleich mit dem Ist-Stand nach; Kamera folgt der wachsenden Fabrik und kreist,
  Vorspann + Titelkarte mit Kennzahlen; `stage.renderFrame(1080, 1920)` → MediaRecorder (MP4, sonst WebM), Fortschritt mit Vorschau, Abbrechen, Video-Vorschau + Download.
- **Fotomodus:** `K`, Oberfläche aus, Kamera ohne Einrasten, Regler (Tilt-Shift, Fokus, Unschärfe, Vignette, Kamerawinkel), Filter, PNG über `capture({scale:2})`.
- **Hinweise** nach der Anleitung (einmal je Gerät, `set.hints`): Strom, Ausbau, Blaupausen, Drohnen, Wunder.

## Großbohrer (Verschmelzen, 17.11.2026)
Leons Wunsch: „Wenn ich auf einer Ressource 4 Fabriken habe, soll daraus eine große, detaillierte werden.“
- Vier Bohrer, die genau ein 2×2-Quadrat aus Bohrern bilden (Ursprünge x/x+2, y/y+2), denselben Rohstoff fördern und dieselbe Mk-Stufe haben, verschmelzen beim Setzen des vierten (auch per Ausbau auf gleiche Mk, Blaupause und beim Laden älterer Stände) zum `grossbohrer` (4×4).
- Ein Ausgang: Drehung des zuletzt gesetzten Bohrers, wenn dort etwas anschließt, sonst die erste Drehung der vier, an deren Ausgang ein Band liegt.
- Förderung: Belegung über alle 16 Felder (= Summe der vier) × 1,25; Puffer 16 × Mk-Puffer; Strom und Ausbaukosten wie vier Bohrer; Preis für neue Bohrer zählt ihn wie vier (`_cnt`).
- Übernimmt Inhalt, Summe der bezahlten Preise (Abriss erstattet alles), höchste Stufe. Rückgängig trennt ihn wieder in die vier alten Bohrer (gleiche Ids).
- Blaupausen speichern ihn als 4 Bohrer; Pipette (C) wählt den Bohrer. Ereignis `merge {id, b, from, parts, item, x, z, rot, mk}` → Staub, Funken, „×4“, Meldung, Hinweis `merge`; ab 3 Bohrern Tipp `mergeTip`.
- Modell `MACH.grossbohrer` (buildings.js): Bohrturm mit Kronenrad und stampfendem Bohrkopf, vier Eckbohrer mit Sammelrohren in einen Erztrichter über der Rutsche, Leitstand mit Fenstern und Schüssel, Tanks, Leiter, Geländer; Mk II/III in upgrades.js.
- Tests: `rules.mjs` Abschnitt 28, `play.mjs` (vierter Bohrer per Klick, Bild `41-grossbohrer`).

## Durchsatz-Anzeige (17.11.2026)
`f.flow(id)` (Bohrer, Maschine) → `{ item, supply, belt, demand, cons, wrong, main, per, need, limit }` in Teilen/s: folgt Bändern, Tunneln, Verteilern, Sortierern und Lagern bis zu den Abnehmern.
`belt` = was das Band bis zum ersten Verteiler trägt (Tempo ÷ Teileabstand), `demand` = was die Abnehmer schaffen (Verkauf = unbegrenzt), `need` = wie viele Abnehmer vom häufigsten Typ noch fehlen.
Ein gestauter Bohrer/eine gestaute Maschine bekommt in `diagnose` die Schlüssel `diag.flowCons` („noch 4× Schmelzofen nötig“), `diag.flowBelt` (Band zu langsam) oder `diag.flowWrong` (festes Rezept nimmt das Teil nicht). Das Info-Panel zeigt den Block „Durchsatz“ (liefert / Band trägt / Abnehmer schaffen) mit der Warnung, auch bevor sich etwas staut.

## Mehr Platz, Band-Einmündungen (17.11.2026)
- Land: `PLOT_COST = 1000`, Anstieg `PLOT_GROW = 1,7` je Grundstück (vorher 1000 × 2,5 für kleinere Flächen): 1.000, 1.700, 2.890, 4.913 … Wer auf noch nicht gekauftes Nachbarland baut oder ein Band dorthin zieht, bekommt sofort den Kauf angeboten (Zeiger-Hinweis „klick, um das Grundstück zu kaufen“). Bot: Prestige 87:26 statt 97:48.
- Bänder, die seitlich in ein gerades Band laufen (auch Rutschen von Bohrern/Maschinen), zeigen dort eine offene Schiene mit Übergangsplatte: Band-Varianten `straightL` / `straightR` / `straightLR` (view.js `mergeKind` aus `n.feed`).

## Größere Grundstücke (17.11.2026, SAVE_VERSION 3)
Leon: „mehr Platz auf einer einzelnen Fläche“ → `PLOT = 24`, `PLOTS = 5` (Karte 120 × 120), Start (2,2). Die Start-Anordnung (Verkauf, vier Start-Vorkommen) liegt wie früher bei 48 (`START_BASE`), der neue Platz rechts und unten.
Ältere Stände (v ≤ 2) behalten alle Koordinaten; `S.geo = 1` erzeugt Vorkommen, Ringe und die geräumte Startfläche wie früher (geprüft: alle 112 × 112 Felder gleich), gekaufte 16er-Grundstücke werden zu allen 24er-Grundstücken, die sie berühren. Neue Fabriken/Prestige: `geo = 2`. Bot: Prestige 77 min.
