# Red String – Spielkonzept

Der Titel meint den roten Faden an der Pinnwand. Der Ordner heißt `krimi/`.

Kleines Detektivspiel im Low-Poly-Look mit „True Crime“-Stimmung, aber nur mit **erfundenen Fällen**. Man untersucht einen Tatort
in voller Detailstufe bis auf Kaffeetassen-Nähe, findet Spuren und befragt Zeugen, deren Gesichter beim Lügen verräterisch zucken.
An der Pinnwand verbindet man Spuren, Personen und Uhrzeiten mit roten Fäden, bis die Geschichte trägt, und erhebt Anklage mit Begründung.
Zur Auflösung spielt eine zurückspulbare **Nachstellung** des Tathergangs ab, deren letztes Bild genau der Tatort ist, den man untersucht hat.
- **Zielgruppe:** Zuschauer des Kanals (ab etwa 12), Gelegenheitsspieler am Handy, Fans von Rätselkrimis (Ace Attorney, Golden Idol,
  Cluedo), die lieber kombinieren als suchen. Kein Zeitdruck, kein Game Over.
- **Länge:** ein Fall dauert 10–15 Minuten (leicht) bis 30–45 Minuten (schwer). Zwischen Fällen kann man jederzeit aufhören.
- **Plattform:** Browser (Three.js), Maus oder Touch, Handy hochkant und quer, Desktop. GitHub Pages unter `…/what-if-engine/krimi/`.

## Abgrenzung
Es gibt zwei ähnliche Titel: „The Red Strings Club“ (Cyberpunk-Erzählspiel, 2018) und „The Scarlet Thread“ (viktorianischer Krimi
mit Faden-Pinnwand, erscheint bald auf Steam). Red String hebt sich in drei Punkten ab:
- **Kurze Fälle** von 10–45 Minuten im Browser, auch am Handy, statt eines langen Abends am PC.
- **Der Humor des Kanals** (trocken, absurde Situationen, Figuren mit Macken) in einem ernsten True-Crime-Rahmen. Dazu kommen
  eigene Figuren für jeden Fall und das wiederkehrende Labor-Duo nur für Red String, gebaut mit derselben Figuren-Engine wie die Shorts.
- **Die Nachstellung des Tathergangs** als zurückspulbare 3D-Szene, deren letztes Bild der untersuchte Tatort ist.

## Kernschleife
1. **Akte lesen:** Eine Karteikarte zeigt den Vorfall, den Ort, die Uhrzeit und die Beteiligten mit Fotos. Ein Erzähler im Stil von
   Declan Sage spricht den Einstieg in 2–3 Sätzen. Während man liest, lädt der Tatort.
2. **Tatort untersuchen:** Jeder Raum hat 3–5 **Standpunkte**, zwischen denen die Kamera sanft fliegt. Von dort kann man sich frei
   umsehen und stufenlos zoomen. Ein Klick auf ein Objekt fliegt heran, in den **Lupen-Modus** (Objekt umkreisen, bis 0,15 m nah).
   - Spuren gibt es in mehreren Arten: einfach sichtbar, erst aus der Nähe lesbar (Gravur, Kassenbon, Uhrzeit auf dem Display),
     hinter Schubladen, Deckeln und Türen, nur mit Werkzeug sichtbar (UV-Lampe für Flecken, Puder für Fingerabdrücke, Maßband
     für Schuhgröße) oder als Kombination zweier Spuren zu einer neuen.
   - Eine gefundene Spur wird fotografiert und landet als Karte im Notizbuch und auf der Pinnwand. Eine gelbe Spurentafel mit Nummer
     bleibt im Raum stehen.
   - Keine Pixeljagd: Jede Pflichtspur ist von einem Standpunkt aus zu sehen und groß genug zum Antippen. Auf Wunsch leuchten
     untersuchbare Dinge kurz auf („Spürsinn“, kostet einen Hinweis-Punkt).
3. **Befragen:** Gespräch in Nahaufnahme (Schuss/Gegenschuss). Die Figur spricht mit Mimik, Lippenbewegung und Gesten.
   - **Themen** schalten sich mit Spuren frei („Fragen zu: Kühlraumschlüssel“).
   - **Vorhalten:** Während einer Aussage kann man eine Karte vorlegen. Passt sie als Widerspruch, reagiert die Figur (`gasp`,
     `nervous+sweat`), und eine neue, ehrlichere Aussage folgt. Passt sie nicht, schaut die Figur verwirrt („Und?“). Das kostet
     nichts außer etwas Rang.
   - **Untersuchen an der Person:** „Darf ich mal Ihre Schuhe sehen?“ Ärmel, Hände und Taschen werden zu Spuren, wenn ein Thema
     sie begründet.
   - **Tells** (Blick zur Seite, Schweißtropfen, Räuspern) sind nur Würze. Sie beweisen nie etwas allein.
4. **Pinnwand:** Kork, Fotos, Zettel und Fäden, gezogen mit dem Finger.
   - **Karten:** Personen (gerenderte Porträts), Spuren (Fotos aus dem Lupen-Modus), Aussagen (Zettel mit Zitat), Orte und
     Erkenntnisse.
   - **Fäden** mit Art: rot = belastet, grün = entlastet, blau = gehört zeitlich zusammen. Verbindet man zwei oder drei Karten,
     die zusammen einen Schluss im Fall ergeben, rastet der Faden mit einem Klick ein, und eine neue **Erkenntnis-Karte**
     erscheint (z. B. „Der Kuchen wurde nicht weggetragen, er ist heruntergefallen“). Falsche Fäden bleiben locker hängen.
     Kein Minus, aber das Durchprobieren von allem fällt im Rang auf.
   - **Zeitleiste** am unteren Rand mit einer Bahn pro Person und Viertelstunden-Raster. Aussagen und Spuren mit Uhrzeit zieht man
     hinein. Steht eine Person zur selben Zeit an zwei Orten, wird der Konflikt markiert. Er schaltet im Gespräch „Vorhalten“ frei.
5. **Anklage:** Bei der Staatsanwältin (feste Nebenfigur) wählt man den Täter (in späteren Fällen auch mehrere) und beantwortet
   drei Fragen mit je einer Karte von der Pinnwand: **Wie** (Mittel/Hergang), **Wann/Wo** (Gelegenheit), **Warum** (Motiv).
   Trägt eine Säule nicht, lehnt sie ab und sagt, welche („Das Motiv reicht mir nicht.“). Danach geht der Fall weiter.
   Es gibt kein Verlieren, nur einen schlechteren Rang.
6. **Auflösung und Nachstellung:** Ein Stempel „GELÖST“ landet auf der Akte. Dann spielt die Nachstellung (30–60 s) im Tatort:
   Figuren laufen den wahren Ablauf, oben läuft die Uhrzeit, und jede Spur leuchtet in dem Moment auf, in dem sie entsteht
   („Hier fällt die Kirsche unter den Kühlschrank“). Ein Regler zum **Vor- und Zurückspulen**, Kapitelmarken je Spur, Zeitlupe,
   freie Kamera. Danach kommt die Rangkarte: Spürnase Bronze, Silber oder Gold, je nach Fehlanklagen, Hinweisen und
   losen Fäden. Die Zeit zählt nie.

## Fall-Format (ein Fall = Daten + Szene)
Jeder Fall liegt in `krimi/cases/<id>/`. Das entspricht den Videos mit `<slug>.story.js` + `<slug>.scene.js`:
- `case.json`: die ganze Logik, reine Daten ohne einen einzigen Text (in Node und im Browser lesbar). Sie gibt es nur einmal, für alle Sprachen.
- `text/<sprache>.json` (z. B. `de.json`, `en.json`): alle Texte des Falls in einer Sprache, mit denselben Ids wie in `case.json`
  (siehe **Sprachen**).
- `scene.js`: der Tatort und die Nachstellung als Engine-Szene, alles als Funktion von t. Spurenobjekte tragen dieselben Ids wie in
  `case.json`. Lesbare Texte im Bild (Zettel, Schilder, Bildschirme) holt die Szene über ihre Id aus der aktiven Sprachdatei.
- `portraits/`: automatisch gerenderte Porträts je Person und Ausdruck (`calm`, `nervous`, `angry` …) für Pinnwand und Akte.
  Sie enthalten keinen Text.

**Bausteine in `case.json`** (alle mit eindeutiger `id`; jeder Text dazu steht unter derselben Id in `text/<sprache>.json`):
| Baustein | Inhalt |
|---|---|
| `meta` | Stufe (1–3), geschätzte Dauer, Fall-Version. Titel und Erzähler-Einstieg stehen in den Textdateien |
| `places` | Räume mit Standpunkten und Wegzeiten untereinander (Minuten) |
| `people` | Rolle, Look (Figur-Optionen), Grundstimmung, `suspect: true/false`. Name und Kurzbeschreibung kommen aus der Textdatei (Namen dürfen je Sprache angepasst werden) |
| `facts` | einzelne Aussagen über die Welt als Id mit optionaler Zeit und Ort, z. B. `timo_kitchen_1510` (Text de: „Timo war um 15:10 in der Küche“) |
| `clues` | Spur: Ort, Objekt-Id in der Szene, Fundart (`look`, `zoom`, `open`, `tool:uv`, `tool:powder`, `person`, `combine`), `needs` (Voraussetzung), `supports` (Fakten), `born` (Zeitpunkt der Entstehung in der Nachstellung) |
| `statements` | Aussage: Person, Thema, Ausdruck, `claims` (Fakt oder dessen Gegenteil), `lie: true/false`, `unlock` (welche Spur oder welches Thema sie freischaltet). Der gesprochene Text steht in der Textdatei |
| `contradictions` | Aussage ↔ Karte, die sie widerlegt, und die Folgeaussage |
| `deductions` | Pinnwand-Schlüsse: `from` (2–3 Karten), `kind` (rot/grün/blau), `gives` (Erkenntnis-Fakt) |
| `solution` | Täter, `how`, `when`, `why` (je ein Fakt) und die Karten, die als Begründung zählen |
| `extras` | Versteck von Ottos Thermoskanne, Auftritte des Labor-Duos, Abzeichen, bei Mord `victim` (`covered: true`, Todesart) |

Kurzbeispiel (Ausschnitt Fall 1), zuerst die Logik in `case.json`:
```json
{ "id": "c01-kuchen", "meta": { "level": 1, "minutes": 12 },
  "facts":  [{ "id": "cake_fell" }],
  "clues":  [{ "id": "cherry_floor", "place": "kitchen", "obj": "cherry_under_fridge", "find": "zoom",
               "supports": ["cake_fell"], "born": 14.2 },
             { "id": "plate_crack",  "place": "kitchen", "obj": "bin_plate", "find": "open",
               "supports": ["cake_fell"], "born": 21.0 }],
  "deductions": [{ "id": "d_fell", "from": ["cherry_floor", "plate_crack"], "kind": "blue", "gives": "cake_fell" }],
  "solution": { "who": ["timo"], "how": "cake_fell", "when": "timo_kitchen_1510", "why": "timo_afraid" } }
```
Dazu die Texte, je Sprache eine Datei mit denselben Ids (`text/de.json`, `text/en.json`):
```json
{ "meta.title": "Der Kuchen ist weg",
  "fact.cake_fell": "Der Kuchen ist heruntergefallen",
  "clue.cherry_floor": "Eine Kirsche unter dem Kühlschrank, noch mit Sahne",
  "clue.plate_crack":  "Ein Kuchenteller mit Sprung, ganz unten im Müll" }
```
```json
{ "meta.title": "The Missing Cake",
  "fact.cake_fell": "The cake was dropped",
  "clue.cherry_floor": "A cherry under the fridge, still with cream on it",
  "clue.plate_crack":  "A cracked cake plate at the bottom of the bin" }
```

### Fairness-Regeln (jeder Fall muss sie erfüllen)
1. **Zwei Belege:** Jeder Fakt, den die Lösung braucht, und jede Erkenntnis ist durch **mindestens 2 unabhängige Belege** gedeckt:
   verschiedene Spuren oder eine Spur plus die Aussage einer anderen Person. Lügen, Tells und bloße Vermutungen (auch die des Labor-Duos) zählen nie als Beleg.
2. **Erreichbar ohne Glück:** Alle Pflichtspuren sind vom Start aus über normale Aktionen erreichbar. Keine liegt hinter einer
   Fehlhandlung oder einer optionalen Spur.
3. **Keine Sackgassen:** Wissen wächst nur, nichts geht verloren, und keine Aktion verbaut die Lösung.
4. **Eindeutig:** Für jede andere Anklage (anderer Täter oder andere Säule) gibt es mindestens einen ableitbaren, zweifach belegten
   Fakt, der ihr widerspricht. Jeder Unschuldige lässt sich entlasten.
5. **Nicht erratbar:** Die Anklage verlangt Täter plus drei passende Karten. Zufällig richtig liegt man mit höchstens 1 %.
   Auf einen Verdächtigen zu tippen reicht nie.
6. **Lügen sind aufdeckbar:** Jede Lüge, die einen Lösungsfakt verdeckt, hat mindestens einen Widerspruch.
7. **Zeit stimmt:** Wahre Fakten stellen nie eine Person zur selben Zeit an zwei Orte. Wege zwischen den Orten passen zu den Wegzeiten.
8. **Nichts erst in der Auflösung:** Die Nachstellung zeigt nur, was man schon erschließen konnte.
9. **Tatort = Ende der Nachstellung:** Jede Spur entsteht in der Nachstellung (`born`) und liegt im letzten Bild genau dort, wo
   man sie findet. Deshalb können Tatort und Auflösung sich nie widersprechen.
10. **Rote Heringe erlaubt, aber mit Ausgang:** Jede falsche Fährte lässt sich mit Spuren auflösen.
11. **Lösbar in jeder Sprache:** Keine Spur hängt an einem Wortspiel, Anfangsbuchstaben, Reim oder an der Schreibweise eines Wortes.
    Zahlen, Uhrzeiten, Bilder und Formen funktionieren überall. Bei einem Text-Rätsel (z. B. Initialen auf einem Zettel) muss es in
    jeder Sprachdatei passen, und das steht als `langCheck` am Hinweis.

### Prüfskript `krimi/tools/case-check.mjs` → `CASE OK`
Läuft ohne Browser in Node auf der echten Spiellogik (`js/logic.js`).
- **Schema und Ids:** alles eindeutig, alle Verweise vorhanden, kein Text in `case.json`.
- **Übersetzungen:** Für jede Sprache in `text/` und in `js/lang/` meldet es fehlende Ids (Text fehlt) und überzählige Ids
  (Text ohne Gegenstück in der Logik, meist ein Tippfehler) mit Liste je Sprache. Leere Texte, ungleiche Platzhalter
  (`{name}`, `{time}`) und Texte, die im Gespräch oder auf der Karte zu lang sind, zählen auch als Fehler. Deutsch und Englisch müssen
  vollständig sein. Eine weitere Sprache darf als `"draft": true` unvollständig sein, erscheint dann aber nicht im Menü.
- **Lösbarkeits-Graph:** Zustandssuche ab Spielbeginn über alle Aktionen (Spur finden, Thema fragen, Vorhalten, Faden ziehen)
  prüft die Regeln 2 und 3. Ausgegeben wird der kürzeste Lösungsweg als Text, zum Gegenlesen.
- **Belege zählen:** Regel 1 je Fakt mit Quellenliste, Regel 6 je Lüge.
- **Eindeutigkeit und Rate-Schutz:** zählt alle möglichen Anklagen, prüft für jede falsche einen Widerspruch (Regel 4) und berechnet
  die Rate-Wahrscheinlichkeit (Regel 5).
- **Zeitleiste:** Regel 7 mit Wegzeiten.
- **Schwierigkeit:** Pflichtspuren, Tiefe des Graphen, Zahl der Lügen und falschen Fährten müssen zur Stufe passen
  (Stufe 1: ≤ 8 Pflichtspuren, keine Lüge im Kern; Stufe 3: Lügen, die erst über die Zeitleiste fallen).
- **Ton:** meldet Wörter aus einer Sperrliste (Blut, Wunde, Messer …) in allen Sprachen. Sachliche Wörter wie „tot“ und
  „Gift“ sind nur in Fällen mit `meta.kind: 'murder'` erlaubt. Außerdem warnt es bei Namen, die zu echten Kriminalfällen oder bekannten
  Personen gehören (kleine Liste in `tools/blocklist.json`).
- **Spielstände:** Ids veröffentlichter Fälle stehen in `cases/ids.lock.json` und dürfen nie verschwinden. Umbenennungen gehen nur
  über `renamed`.

Die Browser-Prüfungen stehen unter **Prüfungen**.

## Ton
- **Nur Erfundenes:** keine echten Verbrechen, keine echten Personen, Orte nur erfunden oder allgemein („ein Dorf an der Küste“).
  Die True-Crime-Videos des Kanals bleiben echten Fällen vorbehalten, und das Spiel zitiert sie nicht.
- **Vorfälle:** Leichte Fälle drehen sich um Diebstahl, Sabotage, Betrug oder Verschwinden. Ab Stufe 2–3 sind auch **Mordfälle**
  erlaubt, nach der Darstellungsregel unten.
- **Kein Gore (Kanal-Regel, gilt auch für alle Teaser-Shorts auf YouTube und Instagram):** kein Blut, keine Wunden, keine Waffe im
  Einsatz, nichts Drastisches im Bild. Andeuten statt zeigen.
- **Stimmung:** True-Crime-Rahmen mit Akte, Spurentafeln, Absperrband, Regen am Fenster, Jazz/Noir-Musik (`AUDIO.style: 'jazz'`
  gibt es) und ernstem Erzähler. Darin dürfen Figuren und Situationen komisch sein. Spannend wie ein Sonntagskrimi; Mordfälle sind
  ernster, aber nie grausam.
- **Keine Running Gags der Kanal-Videos** (Entscheidung 3). Den Humor tragen die eigenen Figuren jedes Falls und das Labor-Duo.

### Darstellungsregel für Mord
1. **Die Tat ist nie im Bild.** Die Nachstellung zeigt den Moment davor und danach und schneidet weg: Die Tasse wird gereicht,
   das Licht geht aus, ein Schatten an der Wand, eine Tür fällt zu. Dann folgt der Schnitt zum Morgen.
2. **Das Opfer** liegt unter einer Decke, höchstens ein Schuh oder eine Hand schaut hervor, oder es ist schon abtransportiert und
   nur ein Kreideumriss bleibt. Das Gesicht ist nie zu sehen, eine Nahaufnahme gibt es nicht. Der Lupen-Modus ist am Opfer gesperrt.
   Was am Opfer zu finden ist, kommt als Bericht der Forensikerin (Karte mit Text).
3. **Todesarten** nur ohne sichtbare Verletzung: Gift, Sturz, ein als Unfall getarnter Tod. Keine Schuss- oder Stichwaffen in Benutzung.
   Ein Gegenstand darf als Spur herumliegen (zerbrochene Tasse, umgekippte Laterne), aber nie als Waffe in Szene gesetzt werden.
4. **Sprache:** sachlich wie ein Polizeibericht („wurde am Morgen tot aufgefunden“, „vergiftet“). Keine drastischen Beschreibungen.
   Teaser-Texte nutzen Wörter, die auf den Plattformen unauffällig sind („found dead“, „never woke up“).
5. **Kennzeichnung:** Mordfälle tragen in der Fallauswahl ein Symbol. In den Einstellungen lassen sie sich ausblenden
   („Nur Fälle ohne Mord“).
6. **Prüfung:** `case-check.mjs` kennt `meta.kind: 'murder'` und prüft die Regeln 2 und 3 an den Daten: Das Opfer hat `covered: true`,
   `inspect` ist gesperrt, die Todesart steht auf der Liste. Die Sperrliste (Blut, Wunde, Messer …) gilt für alle Texte aller
   Sprachen. Die Nachstellung besteht `render.mjs --gate` mit `CFG.gore: 'off'` und leerer GORE-Zeile.

### Eigene Figuren: das Labor-Duo
Ein wiederkehrendes Paar nur für Red String, das Hinweise und Labor übernimmt und den Humor trägt:
- **Pia Okafor**, Forensikerin, ruhig, präzise und trocken. Sie wertet Spuren aus, die man in den Laborbus schickt (Puder,
  Fasern, Gift-Test, Schuhgröße). **Ihre Messwerte stimmen immer**, Deutungen überlässt sie dem Spieler („Ich sage nur, was die
  Tasse sagt.“).
- **Otto Brandl**, Fahrer des alten Laborbusses und Archivar, redselig und gemütlich, kennt jedes Dorf. Er gibt die **Hinweise in
  drei Stufen** („Fassen wir mal zusammen …“). Seine Thermoskanne bleibt in jedem Fall irgendwo am Tatort liegen. Wer sie findet,
  bekommt das Abzeichen „Ottos Thermoskanne“.
- Die Running Gags des Duos: Ottos Kaffeemaschine im Bus ist immer kaputt, und Pia hat für jeden Fall ein neues, absurd genaues
  Messgerät. Vermutungen der beiden zählen nie als Beleg (Fairness-Regel 1), Pias Messwerte schon.
- **„you“** ist der Ermittler im Mantel (`char('you')`, `coat: true`). Im Gespräch sieht man nur Schulter und Hände, in der Akte das Foto.

## Drei Beispielfälle (steigende Schwierigkeit)
| | Fall 1 – „Der Kuchen ist weg“ (Stufe 1, M0 + Einstieg) | Fall 2 – „Die stehengebliebene Uhr“ (Stufe 2) | Fall 3 – „Dinner im Leuchtturm“ (Stufe 3, Mordfall) |
|---|---|---|---|
| **Ort** | Vereinsheim beim Dorffest: Küche mit Kühlraum, Garten mit Jury-Tisch | Kleines Heimatmuseum in der Museumsnacht: Ausstellungssaal, Restaurator-Werkstatt, Lagerkeller | Leuchtturminsel bei Sturm (niemand kommt weg): Speisesaal, Wärterhaus, Laternenraum mit Wendeltreppe, Bootsschuppen |
| **Vorfall** | Der Siegerkuchen des Backwettbewerbs verschwindet 10 Minuten vor der Jury | Die goldene Taschenuhr, das Prunkstück, wurde gegen eine Attrappe getauscht | Gastgeber und Erfinder Konrad Wendt wird am Morgen tot am Fuß der Wendeltreppe gefunden. Er liegt unter einer Decke, die Okke über ihn gelegt hat. Es sieht nach einem Sturz im Stromausfall aus |
| **Verdächtige** | Konkurrentin Marlene (Mehl an der Schürze, klares Motiv) · Timo, 12, Sohn des Vereinswirts. Dackel Bruno, der Hund des Wirts, sitzt mit Sahne an der Schnauze vor der Tür | Kuratorin Dr. Falk · Nachtwächter Bernd · Restaurator Kemal · Influencer Jayden mit Livestream | Tochter Ida · Geschäftspartner Roth · Köchin Frau Lenz · Journalistin Mara · Leuchtturmwärter Okke |
| **Schlüsselspur** | Kirsche unter dem Kühlschrank und Teller mit Sprung im Müll (er fiel herunter) · Puderzucker-Abdruck Größe 35 · Butterkekskrümel in Brunos Fell = Kekspackung in Timos Jacke | Im Livestream läuft um 22:40 der Sekundenzeiger, die Attrappe steht auf 22:47. Getauscht wurde also in diesen 7 Minuten. Dazu Messingspäne und ein Gravurfehler („1897“ statt „1879“) in der Werkstatt | **Kein Sturz:** Pias Test findet Fingerhut-Gift im Rest der Teekanne im Wärterhaus. Wendts Lesebrille steckt zusammengeklappt in der Brusttasche, und der Staub auf dem Geländer ist unberührt. **Die Zeit:** Seit dem Stromausfall um 23:30 stehen die elektrischen Uhren (Okkes Logbuch: Notstrom 23:30). Die Kerzen beim Dinner brennen 1 cm pro Stunde, und ihre Länge verrät, wann jemand den Tisch verließ |
| **Wendung** | Kein Diebstahl: Timo hat den Kuchen fallen lassen und den Rest im Kühlraum versteckt, aus Angst vor Ärger. Bruno hat die Sahne vom Boden geleckt, und Timo hat ihn mit Keksen nach draußen gelockt. Die verdächtige Marlene ist unschuldig (Jury-Foto mit Uhrzeit und Aussage der Jurorin) | Wächter Bernd lügt, ist aber unschuldig: Er hat im Keller geschlafen (Kontrollstempel 22:45 im Keller). Der Restaurator hat die Attrappe gebaut | Tochter Ida lügt („Wir haben nicht gestritten“) und wirkt schuldig. Okke hat aber den Streit um 22:30 gehört, und ein zerknüllter Brief erklärt ihn: Sie wollte nicht in die Firma. Danach war sie im Bootsschuppen (Laternen-Eintrag im Logbuch und nasse Stiefel). Roth hat das **scheinbar wasserdichte Uhr-Alibi** („bis 23:45 im Speisesaal, sehen Sie auf die Uhr“). Genau die stehengebliebene Uhr und seine nur 2 cm abgebrannte Kerze (vom Tisch um 23:00) entlarven ihn, dazu die Köchin, die beim Nachtisch seinen leeren Stuhl sah. Motiv: der Bauplan im Futter seines Koffers und Maras Recherche zu seinen Schulden |
| **Fair lösbar** | jede Säule zweifach belegt (s. o.) | Tauschzeit über Stream + Attrappe, Täter über Späne + Gravur | Wie (Gift, Sturz inszeniert): Gift-Test + Brille/Geländer. Wann (Roth vom Tisch um 23:00): Kerze + Köchin. Warum: Bauplan + Recherche. Ida entlastet durch Logbuch + Stiefel |
| **Lehrt** | zwei Belege statt Bauchgefühl, Lupe, Pinnwand | Zeitleiste, Vorhalten, Lüge ≠ Schuld | unzuverlässige Zeiten, inszenierter Tatort, das Alibi als Beweis |
| **Humor** | Bruno schaut in jede Kamera schuldig, wedelt beim Verhör, und Pia untersucht todernst die Sahne an seiner Schnauze | Jayden kommentiert jede Befragung live für seine 14 Zuschauer, die Kuratorin erklärt ungefragt jede Vitrine | leise, nie über das Opfer: Otto sitzt wegen des Sturms am Festland fest und hilft per Funk, Frau Lenz serviert trotz allem weiter Nachtisch |

## Detail und Zoom (Leons Vorgabe)
- Tatorte sind der Star. Von „ganzer Raum“ bis Kassenbon-Nähe muss alles stimmen: eingerichtete Innenräume, Gebrauchsspuren,
  Kleinteile, lesbare Texte auf Zetteln, Bildschirmen und Gravuren.
- Ab 0,5 m zum Objekt: schärfere Schatten, Tiefenschärfe auf dem fokussierten Ding, Kamera weicht Geometrie aus (nie durch Wände).
- Figuren in Nahaufnahme mit voller Mimik (Ausdrücke, Blick, Blinzeln, Lippen), passender Kleidung und Kostüm je Rolle.
- Jede neue Requisite wird gleich in voller Detailstufe gebaut, ohne einfache Grundvariante.

## Technik: zwei Wege
**(A) Auf der Video-Engine im Live-Modus.** Der Live-Modus entsteht gerade im Worktree des dritten Spiels „What If Town“ und ist auf main noch
nicht da. Er bindet `template.html` mit `CFG.live` als iframe ein, mit Orbit-Kamera und einer Uhr über `whatif.live`. Alles bleibt
eine reine Funktion von t. Darüber liegt eine leichte Host-Seite mit Akte, Gesprächstexten, Pinnwand, Anklage und Speichern als
DOM-Oberfläche ohne eigenes 3D.

**(B) Eigenständig wie Schwebeinsel.** Eigenes Three.js mit prozeduralen Modellen in `js/models/` über einen Baukasten wie `insel/js/kit.js`.

| | (A) Engine-Live-Modus | (B) eigenständig |
|---|---|---|
| Figuren mit Gesicht | vorhanden: `figure()` mit 20+ Ausdrücken, Blick, Blinzeln, Lippen (`talk`), `react()` (gasp, point, nervous …), Kostüme (`police`, `suit`, `worker` …), Mocap | fehlt fast ganz (Insel-Bewohner sind klein und instanziert). Mimik und Lippen neu bauen ist der größte Brocken |
| Innenräume, Requisiten | vorhanden: `interior()` (kitchen, office, living, cellar, shop …), `furnish()`, Schilder/Bildschirme (`uiScreen`, `phone`, `laptop`), Geld, Tresor, Gebäude | alles neu |
| Nachstellung | gratis: die Szene ist schon eine Funktion von t, Zurückspulen = anderes t | eigenes Zeitleisten-System nötig |
| Look wie der Kanal | identisch (dieselben Figuren und dasselbe Licht wie in den Videos) | eigener Look |
| Shorts-Teaser | dieselbe `scene.js` rendert mit `render.mjs` direkt ein Short | Szene muss für die Engine doppelt gebaut werden |
| Ladezeit | `template.html` 2,9 MB (0,94 MB gzip). Mit Mocap kommen `human_m/f.glb` je 4,7 MB und `mocap.json` 0,7 MB dazu, also ~11 MB beim ersten Mal (danach Cache). Die Akte überbrückt das Laden | < 1 MB, sofort da |
| Leistung am Handy | Engine ist für Offline-Rendern gebaut (GTAO, MSAA, Post-FX) und braucht eine leichte Live-Stufe | leicht, 60 fps |
| Abhängigkeit | hängt am Live-Modus und an täglichen Engine-Änderungen, die Prüfskripte müssen das abfangen | unabhängig |
| Aufwand bis M0 | klein bis mittel, wenn der Live-Modus steht | groß (Figuren, Räume, Gesichter) |

**Was bei (A) fehlt.** Alles wird nach der Engine-Regel als wiederverwendbare Funktion in `template.html` gebaut, mit Eintrag in
`docs/API.md` und Testszene in `tests/`. Vorher jeweils mit `grep -n -i` prüfen, was es schon gibt, und Vorhandenes erweitern.
1. **Objekte anklicken statt nur Bodenpunkt:** `pickable(obj, id, { proxy, minPx: 44 })` und `whatif.live.pick(x, y)` →
   `{ id, point, normal }`. Kleine Dinge bekommen eine unsichtbare, größere Trefferhülle für Finger.
2. **Hervorheben:** `highlight(id, on)` als Umriss/Glimmen (Post-FX) für Hover, „Spürsinn“ und gefundene Spuren.
3. **Kamera:** Standpunkte `whatif.live.view(name)` und `whatif.live.inspect(id)` (Flug heran, Orbit um das Objekt, bis 0,15 m,
   Tiefenschärfe aufs Objekt, Ausweichen statt Durchfahren wie bei QA CAMCLIP). Kamerabezogenes bleibt in `POSTCAM`.
4. **Zustand als Ereignisliste:** Der Host schickt `whatif.live.events([{ id: 'drawer_2', at: 412.3 }, …])`. Die Szene rechnet
   `openDrawer(t − at)`. So bleibt jedes Bild eine reine Funktion von t (Uhr + Ereignisse), Speichern ist trivial, und ein Durchlauf lässt sich wiederholen.
5. **Gesprächsregie live:** `whatif.live.say(person, { expr, talk: dauer, react, look: 'cam', shot: 'close' })` legt ab jetzt
   eine Schauspiel-Schicht (`fxw`-Fenster) auf die Figur.
6. **Live-Qualitätsstufen:** `CFG.live.quality: 'low' | 'mid' | 'high'` (Handy ohne GTAO/MSAA, kleinere `renderScale`), Ziel 30 fps
   auf einem iPhone 12. Mocap und Assets nur laden, wenn ein Fall sie braucht, mit Fortschritt über `whatif.live.progress`.
7. **Nachstellung steuern:** `whatif.live.seek(t)`, `play`, `pause`, `rate`, Kapitelmarken, eingeblendete Uhrzeit als HUD-Art,
   Spur-Aufleuchten bei `born`, halbdurchsichtige Figur `ghost(rig, a)` für „so hätte es sein können“.
8. **Requisiten und Effekte für Krimis:** gelbe Spurentafeln mit Nummer, Absperrband, Pinnwand (für Teaser), UV-Lampe mit
   `uvReveal` (Flecken und Abdrücke leuchten nur im Lichtkegel), Fingerabdruck- und Schuhabdruck-Decals im Innenraum (Erweiterung
   `groundDecal`), Vitrine, Taschenuhr, Kerzen mit Brennlänge, Kühlraum, Kuchen, für Mordfälle eine Decke über dem Opfer (`coverSheet`) und ein Kreideumriss (`groundDecal kind: 'chalk'`) (Abschnitt „Essen und Trinken“ erweitern).
9. **Porträts:** `node render.mjs <scene> --portrait <person> --expr nervous` → PNG für Pinnwand und Akte.

**Was bei (B) fehlt:** Figuren mit Gesichtern, Mimik, Lippen und Gesten; Innenräume und Möbel; Kostüme; ein Zeitleisten-System
für die Nachstellung; Porträts; Teaser nur mit Doppelarbeit. Übernehmen ließen sich `kit.js`, `stage.js`, `camera.js` (Orbit,
Zoom zum Zeiger, Kollision), `storage.js`, Muster aus `ui.js` und `audio.js`.

**Empfehlung: (A).** Ein Krimi lebt von Gesichtern in Nahaufnahme, eingerichteten Räumen und einer Auflösung, die man sehen kann.
Genau das hat die Engine schon, und die Nachstellung ist dort kein Extra, sondern der Fall selbst (Regel 9). Dazu kommen
Kanal-Look und Teaser aus derselben Datei. Die Nachteile lassen sich auffangen: Die Akte überbrückt die Ladezeit, die Live-Stufe
macht das Handy flüssig, und Prüfskripte in CI fangen Engine-Änderungen ab. Wichtig: Logik, Prüfskript, Pinnwand und Gesprächs-
oberfläche hängen nicht am 3D. Sie können sofort beginnen, auch bevor der Live-Modus auf main ist.

### Ordnerstruktur (A)
```
krimi/
  DESIGN.md · README.md · index.html     Host-Seite (lädt die Engine als iframe)
  js/
    main.js        verdrahtet alles
    case.js        Fall laden, Schema prüfen                       ┐ laufen auch in Node
    logic.js       Wissen, Schlüsse, Widersprüche, Anklage, Rang   ┘ (Prüfskripte)
    stage.js       Brücke zur Engine: iframe, postMessage, pick/inspect/view/events/say/seek
    dialog.js      Gespräche, Themen, Vorhalten
    board.js       Pinnwand (Karten, SVG-Fäden, Zeitleiste, Drag & Drop, Touch)
    accuse.js      Anklage · replay.js Nachstellung (Regler, Kapitel)
    notebook.js    Notizbuch · hints.js Hinweise in 3 Stufen
    tutorial.js · handbook.js · ui.js · audio.js
    i18n.js        Sprachwahl, Texte nachschlagen t(id, {platzhalter}), Rückfall auf Englisch, Zahlen/Uhrzeiten je Sprache
    lang/          languages.json (Liste der Sprachen) · de.json · en.json   (Oberfläche, Handbuch, Tutorial, Glossar)
    storage.js     aus insel/ übernommen und angepasst
  cases/
    c01-kuchen/ case.json · text/de.json · text/en.json · scene.js · portraits/ · voice/<sprache>/
    c02-uhr/ … · c03-leuchtturm/ …
    ids.lock.json
  tools/
    case-check.mjs  solve.mjs  play.mjs  save.mjs  shots.mjs  perf.mjs  portraits.mjs  teaser.mjs  blocklist.json
```
Veröffentlichen: Der Workflow `game-pages` sammelt zusätzlich `krimi/index.html`, `js/`, `cases/` und eine Kopie von
`template.html` mit nur den Assets, die die Fälle brauchen (`tools/bundle`-Schritt). Der Pfad-Filter bekommt `krimi/**` und
`template.html`, damit Engine-Änderungen das Spiel neu bauen und prüfen.

## Steuerung
- **Maus:** Klick = untersuchen/fliegen, Ziehen = umsehen, Rad = zoomen, Rechtsklick = zurück zum Standpunkt. Tasten: Tab = Pinnwand,
  N = Notizbuch, H = Hinweis, Leertaste = Nachstellung Pause, ←/→ = spulen.
- **Touch:** tippen, mit einem Finger umsehen, mit zwei Fingern zoomen. Fäden zieht man von Karte zu Karte, langes Tippen zeigt Details.
  Alle Ziele sind mindestens 44 px groß.

## Sprachen (Leons Vorgabe)
- **Sprachwahl** im Startmenü (Liste ohne Flaggen, jede Sprache in ihrem eigenen Namen: „Deutsch“, „English“) und in den
  Einstellungen. Man kann jederzeit umschalten, auch mitten im Gespräch oder an der Pinnwand. Alles wechselt sofort, auch Texte im
  3D-Bild: Der Host schickt `whatif.live.lang('en')`, die Szene zeichnet Zettel und Schilder neu. Die Wahl wird gespeichert
  (`krimi.settings.lang`, unabhängig vom Speicherplatz).
- **Erster Start:** Die Browsersprache (`navigator.languages`) wird vorgeschlagen und vorausgewählt, wenn es sie gibt, sonst Englisch.
  Man bestätigt sie mit einem Klick.
- **Zum Start Deutsch und Englisch, weitere ohne Codeänderung:** Eine neue Sprache besteht nur aus Dateien: Eintrag in
  `js/lang/languages.json` (Code, Name, Schreibrichtung, Zahlen- und Uhrzeitformat), `js/lang/<code>.json` für Oberfläche,
  Handbuch, Tutorial und Glossar sowie `cases/<id>/text/<code>.json` je Fall. Das Menü liest die Liste und zeigt nur Sprachen ohne `draft`.
- **Alle Texte aus Sprachdateien:** Oberfläche, Handbuch, Tutorial-Blasen, Abzeichen, Akte, Namen und Rollen, Aussagen und
  Dialogzeilen, Themen, Spuren- und Erkenntnis-Texte, Texte im Bild, Anklage-Fragen, Antworten der Staatsanwältin und die Auflösung.
  Im Code steht kein Satz, nur Ids (`t('ui.board.title')`).
- **Logik nur einmal:** `case.json` mit Spuren-Graph, Schlüssen, Widersprüchen und Lösung ist für alle Sprachen gleich und enthält
  keinen Text. Eine Übersetzung kann einen Fall daher nie unlösbar machen. Regel 11 sorgt dafür, dass auch keine Spur an der
  Sprache hängt.
- **Fehlender Text:** Im Spiel fällt ein fehlender Text auf Englisch zurück und wird in der Konsole gemeldet. Vor dem Push meldet
  `case-check.mjs` fehlende und überzählige Ids je Sprache, damit es dazu gar nicht erst kommt.
- **Formate:** Uhrzeiten, Daten und Zahlen kommen aus `Intl` passend zur Sprache („15:10“ / „3:10 PM“). In den Daten stehen sie
  neutral (Minuten seit Mitternacht).
- **Platz:** Karten, Zettel und Sprechblasen wachsen mit dem Text (Englisch ist kürzer, Deutsch länger). `shots.mjs` macht jede
  Ansicht in jeder Sprache, damit nichts überläuft.
- **Sprachausgabe (Entscheidung 2: nur das Erzähler-Intro):** eine Stimme pro Sprache und Rolle in `languages.json` (z. B. Erzähler
  en = Declan Sage, de = eine deutsche Stimme). Die Audiodateien werden vorab erzeugt und liegen unter `cases/<id>/voice/<code>/<text-id>.mp3`.
  Fehlt eine Datei, läuft die Zeile ohne Stimme mit Lippenbewegung (`talk`) weiter. Die Lippen richten sich nach der Länge der
  Datei bzw. des Textes in der aktiven Sprache.
- **Teaser-Shorts** entstehen immer aus `text/en.json`, weil der Kanal englisch ist.

## Anleitung
- **Geführter Einstieg = Fall 1** in 8 Schritten mit Hinweis-Blasen direkt am Objekt: umsehen und zoomen → erste Spur im Lupen-Modus →
  Schublade öffnen → Zeugin befragen → Thema durch Spur freischalten → zwei Karten mit einem Faden verbinden → Erkenntnis lesen →
  Anklage mit drei Karten. Jederzeit überspringbar und im Menü wiederholbar.
- **Handbuch**, automatisch aus den Daten erzeugt wie in Waldtank und Schwebeinsel: Steuerung, Werkzeuge (mit Bild), Fadenarten,
  Anklage-Säulen, Rang-Regeln, **Personenkartei** aller getroffenen Figuren (Porträt, Rolle, gelöste Fälle), **Spurenalbum**,
  Abzeichen (darunter „Ottos Thermoskanne“) und ein Glossar (Alibi, Motiv, Gelegenheit …).
- **Hinweise in 3 Stufen** im Notizbuch: „Was weißt du schon?“ → „Wo lohnt es sich zu suchen?“ → „Welche zwei Karten gehören
  zusammen?“. Jede Stufe kostet etwas Rang, nie den Fall.

## Speichern (Leons Vorgabe)
- **Automatisch** nach jeder Aktion (Spur, Aussage, Faden, Anklage) und alle 20 s. Nach dem Neuladen geht es genau dort weiter,
  am selben Standpunkt.
- **5 Speicherplätze** mit Vorschaubild, Fall, Fortschritt (Spuren x/y), Rang und Datum. Anlegen, umbenennen, kopieren und löschen
  mit Rückfrage. Fälle lassen sich einzeln neu starten.
- **Datei sichern/laden** (`.krimi.json`) als Sicherung oder für einen anderen Rechner.
- **Versionsfest:** Gespeichert werden nur Ids (Fall-Id und -Version, gefundene Spuren, gehörte Aussagen, Fäden als
  `[a, b, Art]`, Zeitleisten-Plätze, Ereignisliste, Anklage-Versuche, Hinweise, Abzeichen) mit `SAVE_VERSION`. Unbekanntes wird
  übersprungen, `renamed` übersetzt alte Ids, `ids.lock.json` verhindert, dass Ids verschwinden. Gespeichert wird im Browser
  (localStorage, alles in try/catch).
- **Kein Text im Spielstand:** Auch eigene Notizen an der Pinnwand werden nicht übersetzt, sondern als Nutzertext getrennt
  abgelegt. Alles andere sind Ids. Ein Spielstand aus der deutschen Fassung lädt deshalb unverändert in der englischen und umgekehrt
  (`save.mjs` prüft genau das).

## Kanal-Synergie
- **„Who did it?“-Shorts:** `tools/teaser.mjs` macht aus einem Fall eine Story für `/whatif`: Hook am Tatort, drei Verdächtige mit
  Porträt und Satz, eine Schlüsselspur in Nahaufnahme. Am Ende die gewohnte Endcard mit drei Optionen („Marlene? Timo? The dog?“)
  und „Comment who did it“. Höchstens 45 s, gerendert aus derselben `scene.js`.
- **Auflösungs-Short** 2–3 Tage später mit der Nachstellung (Teil 2), Link zum Spiel in Beschreibung und angepinntem Kommentar.
  Die häufigste falsche Antwort aus den Kommentaren kann der Erzähler aufgreifen („Most of you said Marlene. She was at the jury table.“).
- **Eigene Badge statt „True Crime“:** Vorschlag `CFG.kind: 'casefile'` mit Badge „Case File“ und Declan Sage als Stimme. So
  bleibt True Crime den echten Fällen vorbehalten, ernst und ohne Namen.
- **Community-Fall:** Bei Fall 3 entscheiden die Kommentare, welcher Verdächtige im nächsten Teaser befragt wird.
- **Clip teilen:** Die Nachstellung lässt sich als kurzes Video aufnehmen (MediaRecorder) und teilen, ebenso die Pinnwand als Bild
  („Meine Pinnwand zu Fall 2“).

## Prüfungen (vor jedem Push)
- `tools/case-check.mjs`: Fairness-Regeln, Lösbarkeits-Graph, Eindeutigkeit, Rate-Schutz, Zeitleiste, Ton, Id-Sperre und
  Übersetzungs-Ids je Sprache (fehlend/überzählig, auch für `js/lang/`) für alle Fälle → `CASE OK`.
- `tools/solve.mjs`: löst jeden Fall automatisch über die echte Logik (kürzester Weg, Fehlanklagen werden abgelehnt) → `SOLVE OK`.
- `tools/play.mjs`: spielt Fall 1 im Browser mit echten Klicks durch (jede Pflichtspur von einem Standpunkt aus anklickbar und
  ≥ 44 px groß wie `pickups.mjs` in Waldtank, Gespräch, Faden, Anklage, Nachstellung spulen) → `PLAY OK`.
- `tools/save.mjs`: Automatik, Plätze, Datei, alter Spielstand, umbenannte Ids und Sprachwechsel (speichern auf Deutsch, laden auf
  Englisch) ergeben denselben Zustand → `SAVE OK`.
- `tools/shots.mjs`: Screenshots von jedem Standpunkt, jede Spur aus 0,3 m, Porträts; `tools/perf.mjs`: fps und Ladezeit
  (Desktop und Handy-Emulation).
- Neue Engine-Funktionen: Testszene in `tests/`, `bash tests/run.sh` grün. Die Nachstellung jedes Falls besteht `render.mjs --gate`
  (kein GORE, keine QA-Fehler), denn sie ist zugleich Teaser-Material.

## Meilensteine
- **M0 – ein kleiner spielbarer Fall:** Fall 1 in verkürzter Form: Tatort Küche in voller Detailstufe mit 3 Standpunkten,
  6 Spuren, 2 Verdächtige (Marlene, Timo) plus Dackel Bruno als falsche Fährte, Pia und Otto im Laborbus, Gespräche mit Themen, Pinnwand mit Fäden und Erkenntnissen,
  Anklage mit drei Säulen, Nachstellung als einfaches Abspielen. Automatisches Speichern. **Sprachwahl Deutsch/Englisch** im
  Startmenü und in den Einstellungen (Browsersprache vorgeschlagen, jederzeit umschaltbar, gespeichert), alle Texte aus
  `js/lang/` und `cases/c01-kuchen/text/`. Engine: `pickable`/`pick`, `inspect`, `highlight`, Ereignisliste, `lang`, Live-Stufe `low`.
  Dazu `case-check.mjs` → `CASE OK` (inklusive Übersetzungs-Ids), `solve.mjs` → `SOLVE OK`, `play.mjs` → `PLAY OK` (in beiden Sprachen).
- **M1 – volle Kernschleife:** Zeitleiste mit Konflikten, Vorhalten, Werkzeuge (Lupe, UV-Lampe, Puder), Untersuchen an der Person,
  Hinweise, Rang, Nachstellung mit Regler, Kapiteln und Spur-Aufleuchten, geführter Einstieg, Speicherplätze und Datei, `SAVE OK`.
- **M2 – Inhalt und Stimmung:** Fälle 2 und 3 (mit Mord-Darstellungsregel, Decke über dem Opfer, Kreideumriss), Pias Labor-Tests, Thermoskannen-Abzeichen, Einstellung „Nur Fälle ohne Mord“, Porträts per Skript, Handbuch, Noir-Musik und
  Geräusche (Regen, Uhrticken), Touch-Feinschliff, Handy-Leistung, Veröffentlichung auf Pages.
- **M3 – Kanal und mehr:** `teaser.mjs` und Badge „Case File“, erstes „Who did it?“-Short mit Auflösungs-Short, Erzähler-Einstieg
  als vorab erzeugte Audiodatei je Fall und Sprache, eine dritte Sprache als Probe, dass nur Dateien nötig sind (z. B. Spanisch),
  weitere Fälle (Ziel: 1 Fall pro Monat).

## Entscheidungen (16.11.2026)
1. **Technik:** (A), Video-Engine im Live-Modus von „What If Town“. Logik, Prüfskript und Pinnwand starten sofort, das 3D folgt,
   sobald der Live-Modus auf main ist.
2. **Stimme:** nur ein Erzähler-Intro pro Fall und Sprache, vorab erzeugt (en = Declan Sage, de = eigene deutsche Stimme). Figuren
   sprechen als Text mit Lippenbewegung (`talk`).
3. **Gerald und Dr. Steve:** nein, sie kommen in Red String nicht vor. Den Humor tragen eigene Figuren pro Fall und das wiederkehrende
   Labor-Duo Pia Okafor und Otto Brandl (siehe **Ton**).
4. **Fälle:** Mordfälle sind erlaubt, ohne Blut und Gore und nur angedeutet (siehe **Darstellungsregel für Mord**). Leichte Fälle
   bleiben bei Diebstahl und Ähnlichem. Fall 3 „Dinner im Leuchtturm“ ist der erste Mordfall.
