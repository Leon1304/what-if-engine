# Red String

Detektivspiel im Ordner `krimi/`. Konzept: [DESIGN.md](DESIGN.md).

Prüfen vor dem Push:
- `node krimi/tools/case-check.mjs` → `CASE OK` (Schema, Übersetzungen auch von `js/lang/`, Fairness-Regeln 1–11, kürzester Lösungsweg, Ton, `ids.lock.json`)
- `node krimi/tools/solve.mjs` → `SOLVE OK` (löst jeden Fall, alle Fehlanklagen werden abgelehnt, Rang, `migrate`)
- `node krimi/tools/ui-check.mjs` → `UI OK` (Oberfläche, Sprachen, Speichern, Handy)
- `bash krimi/build.sh && node krimi/tools/play.mjs` → `PLAY OK` (3D-Tatort mit echten Klicks)

`krimi/package.json` (`"type": "module"`) sorgt dafür, dass Node die Browser-Module in `js/` als ES-Module lädt,
auch wenn weiter oben ein `package.json` mit `"type": "commonjs"` liegt.

## Logik-API

`js/logic.js` und `js/case.js` sind reine ES-Module ohne DOM- oder Node-APIs. Sie laufen im Browser und in den Prüfskripten.
Die Logik ist deterministisch (keine Zeit, kein Zufall), und `apply()` verändert den Eingabezustand nie.

### case.js
| Export | Zweck |
|---|---|
| `loadCase(json)` | JSON-Text oder Objekt → Fall; wirft bei Schemafehlern (`err.errors` = Liste) |
| `validateCase(c)` | → `[fehlertexte]` (leer = gültig): Ids eindeutig, Verweise, kein Text in `case.json`, Werte erlaubt |
| `textKeys(c)` | alle Textschlüssel, die `text/<sprache>.json` braucht: `[{ key, max, time, timeEnd }]` |
| `allIds(c)` | `Map(id → art)` aller Bausteine |
| `FINDS`, `KINDS`, `EXPRS`, `REACTS`, `PLACEHOLDERS`, `MAX` | erlaubte Werte und Textlängen |

### logic.js
| Export | Ergebnis |
|---|---|
| `SAVE_VERSION` | `1` |
| `newState(c)` | `{ v, case, caseV, found: [], heard: [], topics: [Start-Themen], threads: [], insights: [], accusations: [], hints: 0, hinted: {}, events: [], view: null, solved: false }` |
| `apply(c, s, action)` | `{ state, result }`, `state` ist immer ein neues Objekt |
| `topicsFor(c, s, person)` | offene Themen-Ids, zu denen die Person etwas sagt |
| `cards(c, s)` | Pinnwand: `[{ id, kind, ref, … }]` |
| `progress(c, s)` | `{ clues: [gefundene Pflichtspuren, Pflichtspuren], insights: [Erkenntnisse, mögliche] }` |
| `rank(c, s)` | `'gold' \| 'silver' \| 'bronze'`; `score(c, s)` liefert die Punkte dazu |
| `migrate(c, saved)` | gültiger Zustand aus einem alten oder fremden Spielstand |
| `cluesAt(c, place)` | `[{ id, obj, find, needs, opens, view, born }]` für die 3D-Brücke |
| `labFor(c, on)` | Laborsätze zu einem Auslöser: `'start'`, `'solved'`, Spur-Id oder Objekt-Id → `[{ id, who, text }]` |
| `known(c, s)`, `looseThreads(c, s)`, `THREAD_KINDS` | Helfer |

**Aktionen für `apply`:**
| Aktion | `result` |
|---|---|
| `{ type: 'find', clue }` | `{ ok, new, unlocks: [themen] }`. `ok: false`, wenn `needs` fehlt. Bei `find: 'open'` öffnet die Szene vorher den Behälter `opens` (als `event`) |
| `{ type: 'ask', person, topic }` | `{ ok, statements: [alle Aussagen der Person zum Thema], new: [davon neu], unlocks }`. Thema muss offen sein |
| `{ type: 'present', statement, card }` | `{ ok, follow, new, unlocks }`. `ok: false` = „Und?“ (kein Widerspruch). Aussage gehört, Karte liegt auf der Pinnwand |
| `{ type: 'thread', from: [a, b(, c)], kind }` | `{ ok, gives, new, stored, unlocks }`. `ok: true`, wenn ein Schluss genau diese Karten (Reihenfolge egal) und diese Art hat. Jeder gültige Faden wird einmal in `threads` gespeichert (`[a, b, kind]`), auch lockere. Karten, die nicht auf der Pinnwand liegen → `ok: false`, nicht gespeichert |
| `{ type: 'accuse', who: [personen], how, when, why }` | `{ ok, reject: null \| 'who' \| 'how' \| 'when' \| 'why' }` (erste falsche Säule). Eine Karte zählt, wenn sie auf der Pinnwand liegt und in `solution.cards.<säule>` steht. Nicht verdächtige Personen → `who`. Bis zur Lösung wird jeder Versuch in `accusations` gespeichert (`{ who, how, when, why, reject }`) |
| `{ type: 'hint' }` | `{ ok, level: 1–3, text: 'hint.<id>.<level>', args: {}, goal }`. Nimmt das erste offene Ziel aus `hints` (Fakt in `insights` bzw. `accuse` = gelöst) und steigert dessen Stufe; erhöht `hints`. Alles gelöst → `ok: false, level: 0` |
| `{ type: 'event', id, at }` | `{ ok }`; hängt `{ id, at }` an `events`. `id` muss ein Objekt aus `case.objects` sein (z. B. `bin_lid`) |
| `{ type: 'view', id }` | `{ ok }`; setzt `view` (Standpunkt-Id oder `null`) |

**Karten** (`cards`): Personen (ohne Labor-Duo) und Orte von Anfang an, Spuren nach dem Fund, Aussagen nach dem Hören,
Erkenntnisse nach dem Schluss. Karten-Id = Baustein-Id. `ref` ist der Anfang des Textschlüssels:
`person.<id>` (→ `.name`, `.role`, `.bio`), `place.<id>`, `clue.<id>` (→ `.detail`), `stmt.<id>`, `fact.<id>`.
Zusätzlich: Spuren `place`, Aussagen `person`, Erkenntnisse `at`/`timeEnd` (Minuten, für `{time}`/`{timeEnd}`).

**Rang:** Punkte = 3 je Fehlanklage + 1 je Hinweis + 0,5 je losem Faden ab dem dritten. Gold < 1, Silber < 6, sonst Bronze
(je Fall änderbar über `meta.rank: { gold, silver, freeLoose }`). Die Zeit zählt nie.

**Spielstand:** nur Ids und Zahlen, sprachunabhängig. `migrate` übernimmt nur bekannte Ids, wendet `renamed` an
(auch Ketten), ergänzt fehlende Felder, verwirft Stände anderer Fälle (→ `newState`) und berechnet die offenen Themen neu.
`ids.lock.json` hält die Ids veröffentlichter Fälle fest (`case-check.mjs --lock` trägt neue ein, nie entfernen).

**Abweichungen vom ersten Entwurf (nur Zusätze):** `newState` enthält schon die Start-Themen und das Feld `hinted`
(Stufe je Hinweisziel); Ergebnisse haben zusätzliche Felder (`new`, `stored`, `unlocks`, `goal`); Karten tragen `place`/`person`/`at`.

## Fall-Format kurz

Ein Fall liegt in `cases/<ordner>/`: `case.json` (nur Logik und Ids, kein einziger Text) und `text/<sprache>.json` (flache Schlüssel).
`cases/index.json` listet die Fälle: `[{ "id", "dir", "level", "kind" }]`.

| Baustein | Felder |
|---|---|
| `meta` | `level` 1–3, `minutes`, `version`, `kind` (theft · sabotage · fraud · missing · murder), `replay` (Länge der Nachstellung in s), `at` (Uhrzeit für `{time}` in `meta.brief`), `clock` [von, bis], optional `rank` |
| `places` | `{ id, views: [{ id }], walk: { ort: minuten } }` |
| `people` | `{ id, type: human\|dog…, suspect, lab, mood, stand: view, look: {Figur-Optionen}, cleared: fakt }` (`cleared` = Entlastung eines Unschuldigen) |
| `facts` | `{ id, person, place, at, timeEnd, truth: false, refuted: fakt }`, Uhrzeiten in Minuten seit Mitternacht |
| `topics` | `{ id, after: [ids] }`: offen ab Start oder sobald eine der Ids bekannt ist (Spur, Aussage, Erkenntnis, Thema) |
| `clues` | `{ id, place, view, obj, find, opens, needs, supports: [fakten], born, optional }` |
| `statements` | `{ id, person, topic, expr, react, kind: speech\|action, claims: [fakt \| '!fakt'], lie, guess, follow, unlock }` (`action` = erzählte Handlung, z. B. beim Dackel; `guess` = Vermutung, kein Beleg) |
| `contradictions` | `{ id, statement, cards: [karten], follow: aussage }` (die Folgeaussage trägt `follow: true`) |
| `deductions` | `{ id, from: [2–3 karten], kind: red\|green\|blue, gives: fakt }` |
| `solution` | `{ who, how, when, why, cards: { how: [], when: [], why: [] } }` |
| `hints` | `{ id, goal: fakt \| 'accuse' }`, Texte `hint.<id>.1–3` |
| `objects` | Szenen-Objekte: `{ id, place, view, role: clue\|container\|prop\|extra, size: [b, h, t] m, on, in, proxy, readable, langCheck }` |
| `extras` | `thermos: { obj, place, badge }`, `lab: [{ id, who: pia\|otto, on }]`, bei Mord `victim: { covered, inspect: false, cause }` |
| `renamed` | `{ alteId: neueId }` |

**Textschlüssel** (`text/<sprache>.json`): `meta.title`, `meta.intro`, `meta.brief`, `place.<id>`, `view.<id>`,
`person.<id>.name|role|bio`, `topic.<id>`, `stmt.<id>`, `clue.<id>`, `clue.<id>.detail`, `fact.<id>`,
`accuse.ok`, `accuse.reject.who|how|when|why`, `hint.<id>.1|2|3`, `lab.<id>`, `solution.text`,
`scene.<objekt>` (lesbarer Text im Bild bei `readable: true`). Platzhalter `{time}` und `{timeEnd}` kommen aus `at`/`timeEnd`
desselben Bausteins (Minuten, das UI formatiert sie je Sprache), `{name}`, `{n}`. Eine weitere Sprache darf `"draft": true` tragen.

### Fall 1 „Der Kuchen ist weg“ (M0)
Sommerfest im Vereinsheim, Backwettbewerb. Um 15:20 ist Hildes Kirsch-Sahne-Torte (sieben Siege in Folge) verschwunden.
Wahrheit: Timo (12) hat sie um 15:10 fallen lassen und aus Angst vor dem angedrohten Küchenverbot alles versteckt; Bruno
hat nur die Sahne vom Boden geleckt und wurde mit Keksen hinausgelockt; Marlene stand die ganze Zeit am Jurytisch.
Statt des Kühlraums aus dem DESIGN liegt der Tortenrest in M0 mit der Platte im Mülleimer (Regel 8: nichts, was man nicht finden kann).

Kürzester Lösungsweg (9 Schritte): Zettel am Kühlschrank · Kirsche unter dem Kühlschrank · Schuhabdruck · Teller im Mülleimer ·
Hilde fragen „Wo waren Sie ab drei Uhr?“ · blauer Faden Kirsche + Teller → *Torte ist heruntergefallen* · roter Faden
Schuhabdruck + Hildes Aussage zu den Kuchengabeln → *Timo war um 15:10 allein in der Küche* · roter Faden Zettel + Teller →
*Timo hatte Angst vor dem Küchenverbot* · Anklage Timo mit den drei Erkenntnissen.
Entlastungen: Bruno (grün: Kekskrümel + Kekspackung), Marlene (grün: Aussagen von Hilde und Timo). Vorhalten (optional):
Hildes „Der Hund war’s“ + Teller oder Erkenntnis „heruntergefallen“ → sie zieht die Anzeige zurück.

**Szenen-Objekte Fall 1** (alle in `kitchen`; Küche etwa 5 × 4 m; Größe b × h × t in m):

| obj-Id | Standpunkt | Was es ist | Größe | Wie man es findet |
|---|---|---|---|---|
| `counter` | v_counter | Anrichte mit Arbeitsplatte, Schubladen, Gebrauchsspuren | 2,4 × 0,9 × 0,65 | – |
| `cake_dome` | v_counter | leere gläserne Tortenhaube auf Holzbrett, auf `counter`, Zuckerreste am Rand | 0,32 × 0,27 × 0,32 | – (Blickfang) |
| `cake_forks` | v_counter | Bündel Kuchengabeln mit Gummiband, auf `counter` | 0,18 × 0,03 × 0,08 | – |
| `sugar_patch` | v_counter (auch von v_entry sichtbar) | Puderzucker-Fleck vor der Anrichte, darin ein Kinderschuh-Abdruck (0,22 × 0,08) mit Sohlengröße „35“ | 0,5 × 0,003 × 0,4 | Spur `sugar_print`, **zoom** (Zahl erst aus der Nähe lesbar) |
| `stove` | v_counter | Herd mit Backofen | 0,9 × 0,9 × 0,65 | – |
| `fridge` | v_back | hoher Standkühlschrank, 4 cm Spalt am Boden | 0,7 × 1,85 × 0,7 | – |
| `fridge_paper` | v_back | Zettel mit Erdbeer-Magnet an der Kühlschranktür, lesbarer Text `scene.fridge_paper` | 0,15 × 0,21 × 0,003 | Spur `fridge_note`, **look** |
| `cherry` | v_back | Kirsche mit Sahneklecks hinten im Spalt unter `fridge`; Trefferhülle `proxy` 0,12 × 0,06 × 0,12 | 0,025 × 0,025 × 0,025 | Spur `cherry_floor`, **zoom** |
| `bin` | v_back | Treteimer (Pedal) neben der Hintertür | 0,3 × 0,45 × 0,3 | – |
| `bin_lid` | v_back | Deckel von `bin`, Behälter (Event `bin_lid` öffnet) | 0,3 × 0,03 × 0,3 | öffnen |
| `cracked_plate` | v_back | Tortenplatte mit frischem Sprung und Tortenrest, unter zerknülltem Küchenpapier in `bin` | 0,3 × 0,04 × 0,3 | Spur `plate_crack`, **open** (`opens: bin_lid`) |
| `coat_hooks` | v_entry | Garderobenleiste neben der Hintertür | 0,8 × 0,1 × 0,08 | – |
| `timo_jacket` | v_entry | kleine Regenjacke an `coat_hooks`, Tasche = Behälter (Event `timo_jacket`) | 0,45 × 0,6 × 0,12 | öffnen |
| `biscuit_packet` | v_entry | angebrochene Butterkeks-Packung in der Jackentasche | 0,06 × 0,13 × 0,03 | Spur `biscuit_pack`, **open** (`opens: timo_jacket`, braucht vorher `bruno_crumbs`) |
| `back_door` | v_back | offene Hintertür zum Garten | 0,9 × 2,0 × 0,05 | – |
| `bruno_snout` | v_back | Brunos Schnauze mit Sahne (Teil des Dackels auf der Türschwelle) | 0,06 × 0,05 × 0,08 | – (Laborsatz `pia_cream`) |
| `bruno_fur` | v_back | Halsband-Bereich mit Butterkekskrümeln im Fell | 0,12 × 0,08 × 0,1 | Spur `bruno_crumbs`, **zoom** |
| `sink` | v_entry | Spüle mit Abtropfgitter | 1,2 × 0,9 × 0,6 | – |
| `shelf` | v_entry | Wandregal über der Spüle | 1,0 × 0,25 × 0,3 | – |
| `otto_thermos` | v_entry | Ottos Thermoskanne auf der Spüle unter `shelf` (seit dem Feuerwehrfest vergessen) | 0,09 × 0,3 × 0,09 | Extra, Abzeichen „Ottos Thermoskanne“ (`lab.otto_flask`) |
| `window` | v_entry | Fenster mit Blick auf Garten und Jurytisch | 1,2 × 1,0 × 0,1 | – |
| `wall_clock` | v_entry | Küchenuhr an der Wand (zeigt die Szenenzeit) | 0,3 × 0,3 × 0,05 | – |

Figuren im Raum (`people[].stand`): Hilde an der Anrichte, Marlene am Durchgang zum Saal, Timo an der Hintertür,
Bruno (Dackel) auf der Türschwelle. Pia und Otto sind nur im Laborbus (Sätze `lab.*`, kein Beleg).

Nachstellung (40 s für 15:00–15:20, `born` in s, so in `world.scene.js`): Zettel hängt schon (0) · Timo kommt durch die Hintertür,
nimmt die Haube ab (4,6) und hebt die Torte (6,6), sie rutscht ihm nach zwei Schritten weg (Aufprall 12,0), die Kirsche rollt bis an die
Kante unter den Kühlschrank (12–13,7), Puderzucker staubt, Timo tritt hinein (13) · Bruno kommt herein und leckt die Sahne (15,2–18,8) ·
Timo holt Kekse aus der Jacke und lockt ihn auf die Schwelle, Krümel im Fell (23,2), Packung zurück in die Tasche (25) · er kratzt den Rest
auf die gesprungene Platte (27,2), trägt sie zum Treteimer (Platte drin 29,9, Küchenpapier darüber 30,3), stellt die leere Haube zurück
(33,4) · 15:20 Hilde kommt aus dem Saal (35–38,6, erschrickt), Marlene bleibt im Durchgang. Die Wanduhr zeigt die Szenenzeit
(Aufprall = 15:10). Das letzte Bild ist der Tatort.

## 3D-Welt (Engine im Live-Modus)
- `cases/<ordner>/world.story.js` + `world.scene.js` sind eine normale Engine-Szene (`CFG.live`, `start: 'end'`); `bash krimi/build.sh` baut
  daraus `world.html` (nicht im Repo, `.gitignore`). Ohne `world.html` (oder mit `?world=0`) zeigt `stage.js` die Ersatzansicht.
- Tatort-Werkzeuge der Engine (v3.52, `docs/API.md` → „Tatort-Werkzeuge“): `pickable(obj, id, { proxy, look })` (Ids = `case.objects`),
  `liveViews` (Standpunkte = `places[].views`), `liveSince(id)` für Behälter (`bin_lid`, `timo_jacket`), `liveFound()` für die gelben
  Spurentafeln, `liveText('scene.<obj>')` + `onLiveLang` für Texte im Bild, `liveActor` für die Figuren. Ereignisse und Tafeln wirken nur
  im letzten Bild (Tatort), nicht während der Nachstellung.
- Ein Klick auf einen Behälter findet, was darin liegt (`opens`).
- `node krimi/tools/play.mjs` → `PLAY OK`: echte Mausklicks ins 3D-Bild für jede Spur von ihrem Standpunkt aus (Ziel ≥ 44 px über
  `live.screen(id)`), Spurentafeln, Sprachwechsel zeichnet den Zettel neu, Neuladen behält den Stand, Nachstellung, Konsole ohne
  Fehler – in jeder Sprache. `node krimi/tools/ui-check.mjs` testet die Oberfläche über die Ersatzansicht (`?world=0`).

## Oberfläche

Host-Seite `index.html` (DOM, kein eigenes 3D) mit `css/krimi.css` (Grundlook, Akte, Gespräch, Anklage, Fenster) und `css/board.css` (Pinnwand).
Schriften von Google Fonts (Special Elite, Kalam, Source Sans 3), sonst alles lokal. Ab 360 px Breite, kein horizontales Scrollen.

| Datei | Aufgabe |
|---|---|
| `js/main.js` | Start, Startmenü, Fallauswahl, Akte, Tabs (Tatort · Befragen · Pinnwand · Anklage), Aktionen über `logic.apply`, Laborbus, Auflösung, Einstellungen, Tasten |
| `js/i18n.js` | Sprachen aus `js/lang/languages.json` (nur ohne `draft`), `t('ui.…')` für die Oberfläche, `tc('clue.…')` für den aktiven Fall, `applyDom()` für `data-t`/`data-t-title`/`data-t-aria`/`data-t-ph`, Uhrzeiten und Zahlen per `Intl` (`{time}`, `{timeEnd}` = Minuten), `onLang(fn)` |
| `js/ui.js` | DOM-Helfer, Symbole, Porträt-Ersatz (SVG, bis gerenderte Porträts kommen), Fenster, Meldungen, Laborbus-Blase, `cardInfo` (Kartentexte), Kartenwahl |
| `js/stage.js` | Brücke zur 3D-Welt (siehe unten), Ersatzansicht ohne 3D, Nachstellung mit Regler |
| `js/dialog.js` | Befragen: Personen, Nahaufnahme, Themen, Aussagen, Vorhalten |
| `js/board.js` | Pinnwand: Karten, SVG-Fäden (locker mit Durchhang, eingerastet straff), Ziehen mit Maus/Finger, Kartenpositionen |
| `js/accuse.js` | Anklage: Täter + drei Säulen (Wie · Wann/Wo · Warum) mit je einer Karte |
| `js/notebook.js` | Notizbuch: Spuren, Aussagen, Erkenntnisse, Hinweise in drei Stufen |
| `js/storage.js` | localStorage mit Präfix `krimi.`, alles in try/catch |
| `js/lang/` | `languages.json` (code, name, dir, locale, hour12, voice), `de.json`, `en.json` (flache Schlüssel `ui.…`) |

**Sprachen:** Startmenü und Einstellungen zeigen die Liste aus `languages.json` (jede Sprache in ihrem eigenen Namen, keine Flaggen),
die Kopfzeile eine Auswahl. Erster Start: `navigator.languages` → passende Sprache, sonst Englisch. Umschalten wirkt sofort überall
(auch im Gespräch, an der Pinnwand, in offenen Fenstern) und schickt `lang(code)` an die Welt. Gespeichert unter `krimi.settings.lang`.
Fehlt ein Text, kommt Englisch und eine Warnung `[i18n] …` in der Konsole. Neue Sprache: Eintrag in `languages.json`,
`js/lang/<code>.json`, `cases/<id>/text/<code>.json` – kein Code.

**Steuerung:** Tab = Pinnwand an/aus · N = Notizbuch · H = Hinweise · ←/→ = Standpunkt (Tatort) bzw. spulen (Nachstellung) ·
Leertaste = Nachstellung Pause · Esc = Fenster zu / Menü. Pinnwand: Faden an der roten Nadel ziehen (oder Nadel antippen, dann
Zielkarte), auf den Knoten eines Fadens = drei Karten; Fadenart vorher wählen (rot/grün/blau); Karte ziehen = verschieben;
antippen oder lange drücken = Details. Alle Ziele ≥ 44 px.

**Speichern:** nach jeder Aktion (kurz entprellt), alle 20 s und beim Verlassen der Seite:
`krimi.slot.<n> = { v, meta: { case, caseV, clues, insights, rank, solved, updated }, state, user }`, `krimi.current`, `krimi.settings`
(u. a. `screen`: nach dem Neuladen direkt zurück ins Spiel), `krimi.settings.lang`. `state` ist der Spielstand der Logik
(nur Ids), geladen über `migrate`. `user` sind Nutzerdaten ohne Übersetzung: `ui` (Tab, Person, offenes Fenster), `board`
(`pos: { karte: [x-Anteil 0–1, y px] }`, Fadenart), `accuse` (Entwurf), `hints` (erhaltene Hinweis-Schlüssel), `lab` (gezeigte
Laborsätze), `touched`/`badges` (Extras wie die Thermoskanne), `notes`, `started`. Fünf Plätze und Datei (`.krimi.json`) sind in
`storage.js` schon da (`list`, `save`, `duplicate`, `rename`, `remove`, `exportFile`, `importFile`); die Oberfläche nutzt in M0 Platz 1
und Datei sichern/laden in den Einstellungen.

**Laborbus:** Sätze `lab.<id>` aus `case.extras.lab` (`on` = `start`, `solved`, Spur-Id oder Objekt-Id) erscheinen einmal als
Sprechblase von Pia oder Otto. Hinweise spricht Otto.

### Brücke zur 3D-Welt (`stage.js`)
Gibt es `cases/<ordner>/world.html` (HEAD-Anfrage; `world: true/false` in `cases/index.json` überspringt die Prüfung), lädt `stage.js`
sie als `<iframe>` (`?live=1&lang=<code>`) und wartet bis zu 90 s auf `iframe.contentWindow.whatif.live`. Sonst zeigt sie die
Ersatzansicht: je Standpunkt eine Kreideskizze mit anklickbaren Objekt-Kärtchen aus `cluesAt` (Fundarten `look`, `zoom`, `open`,
`tool:*`) plus Extras (`role: extra`, Auslöser von Laborsätzen). Gefundene Spuren tragen die gelbe Spurentafel mit Nummer; der
„Lupen-Modus“ ist ein Blatt mit Spurtext, Detail und `scene.<obj>` (lesbarer Text im Bild).

| Host → `stage` | Welt (`whatif.live`) |
|---|---|
| `mount(el, { c, dir, id, lang, state, world, touched })` | lädt die Welt oder die Ersatzansicht → `'world' \| 'fallback'` |
| `goto(view)` | `live.view(name)` – Standpunkt anfliegen |
| `onFind(cb)` → `cb({ obj, clues, point })` | aus `live.on('click', fn)` mit `{ id, point }`; `clues` = Spuren an diesem Objekt (leer bei Extras/Requisiten) |
| `onView(cb)` | Spieler wechselt den Standpunkt in der Ansicht |
| `inspect(obj \| null)` | `live.inspect(id)` – Lupen-Modus an/aus |
| `highlight(obj, on)` | `live.highlight(id, on)` |
| `setState(s)` / `events(list)` | `live.events(list)`: Ereignisse der Logik `{ id, at }` plus Spurentafeln `{ id: 'found:<obj>', clue, n, at: 0 }` |
| `lang(code)` | `live.lang(code)` – Texte im Bild neu zeichnen |
| `say(person, opts)` | `live.say(person, { expr, react, talk, look: 'cam', shot: 'close' })` beim Fragen und Vorhalten |
| `pick(x, y)` | `live.pick(x, y)` → `{ id, point } \| null` |
| `replay()` | Nachstellung: `live.seek(0)`, `play`, `pause`, `setRate`, `live.dur`, `live.time`; Steuerleiste mit Kapitelmarken (`born`), Uhrzeit aus `meta.clock`; am Ende `seek(dur)` (letztes Bild = Tatort) |
| `step(±1)` | nächster/voriger Standpunkt (←/→) |

Prüfung: `node krimi/tools/ui-check.mjs [ausgabeordner]` → `UI OK` (spielt Fall 1 über die Ersatzansicht mit echten Klicks und
Mausbewegungen durch, Sprachwechsel, Neuladen, Ziele ≥ 44 px, kein horizontales Scrollen auf 390/360 px, Screenshots de/en Desktop/Handy).
