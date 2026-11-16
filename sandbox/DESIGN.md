# What If Town – Konzept

## Idee
Der Kanal fragt „Was wäre, wenn …?“ – das Spiel lässt die Zuschauer es selbst ausprobieren. Eine kleine Stadt steht als Diorama auf dem Tisch: Hochhäuser, Vororte mit Pools, Verkehr, Spaziergänger. Der Spieler zieht eine **Szenario-Karte**, zeigt auf einen Ort, ein Countdown läuft – und das Ereignis spielt sich ab. Danach kann er zurückspulen, in Zeitlupe ansehen, die Kamera frei drehen, die Stadt zurücksetzen und es woanders probieren.

Alles läuft auf der Video-Engine (`template.html`): jedes Bild ist eine reine Funktion von t. Darum gibt es Zurückspulen und Zeitlupe gratis, und jede Spielrunde ist später als Short exportierbar (M3).

## Prinzipien
- **Engine statt Spiel-Code:** Die Welt ist eine normale Engine-Seite (`world.story.js` / `world.scene.js`) im Live-Modus (`CFG.live`, v3.50). Neue Effekte, Gebäude, Figuren entstehen in `template.html` (Regeln in `CLAUDE.md`) und kommen damit auch den Videos zugute.
- **Eine Seite, viele Zustände:** Parameter im Hash (`#s=asteroid&x&z&r&from&cam`). Was zur Bauzeit feststehen muss (Einschlagsort), braucht eine neue Welt; die lädt im Hintergrund (zweites iframe), der Countdown überdeckt das Laden.
- **Szenarien sind Tabellen:** `SANDBOX_SCEN` (Länge, Musik, Zähler), `SANDBOX_BUILD` (was die Szene baut), `js/scenarios.js` (Karte, Zielradius, Zeitmarken). Ein neues Szenario = drei Einträge.
- **Schnell zurück:** Die ruhige Stadt bleibt geladen und pausiert, solange ein Szenario läuft.
- **Deutsch** im Spiel (wie „Waldtank“), Englisch nur in exportierten Videos.

## Ablauf (M0)
1. Start: ruhige Stadt (60-s-Schleife, Lo-Fi-Musik, Verkehr, Spaziergänger), Karten links.
2. Karte „Asteroid“ → Zielmodus: Fadenkreuz, roter Ring mit dem Radius der Druckwelle folgt der Maus (grau außerhalb der Stadt).
3. Klick → Countdown 3 · 2 · 1; währenddessen baut das zweite iframe die Asteroiden-Welt (Einschlag bei t = 4 s, Stein ab t = 0 aus einer Richtung quer zur Blickrichtung).
4. Umschalten (Kamera wird übernommen), Abspielen. Zähler oben: Einschlag in · Druckwelle · Gebäude zerstört · Gebäude stehen.
5. Zeitleiste: Play/Pause, Regler, ¼× – 2×, ↺, „Stadt zurücksetzen“, Marke „Einschlag“. Ton auf Knopfdruck.

## Meilensteine

### M0 – Prototyp (dieser Stand)
Stadt, ein Szenario (Asteroid), Zielen, Countdown mit Doppelpuffer, Zeitleiste, Zähler, Ton, Prüfskript `tools/check.mjs`.

### M1 – Fünf Szenarien, Kommentatoren
- Fünf Szenarien nur aus vorhandenen Engine-Funktionen, z. B. Asteroid, Tsunami (Küste + Welle), Mond weg (Himmel/Gezeiten), Zombie-Horde (`horde`), Riesenmonster/Kaiju oder Vulkan; was fehlt, wird erst in `template.html` gebaut.
- Gerald und Dr. Steve kommentieren (Sprechblasen + Kokoro-Stimme bzw. Untertitel, Running Gags aus `docs/projekt/running-gags.md`), zum Ereignis passend getimt (`whatif.events()`).
- Pro Szenario eigene Zähler und Zeitmarken, Karten mit Kurzbeschreibung.

### M2 – Kombinieren, Freischalten, Handbuch, Speichern
- Szenarien kombinieren (z. B. Asteroid ins Meer → Tsunami; zwei Einschläge) – mehrere Einträge im Hash, `SANDBOX_BUILD` baut nacheinander.
- Freischalten: neue Karten nach Zielen („zerstöre 40 Gebäude“, „rette die Vororte“).
- Handbuch mit echten Zahlen (Wie groß war Chicxulub? …) – Stoff aus Erklärvideos.
- Speichern im `localStorage` nur über Ids (Szenario-Id, Ort, Kamera, Freigeschaltetes), mit Versionsnummer → Spielstände laden auch nach Updates.

### M3 – Als Short exportieren, Veröffentlichen
- „Als Short exportieren“: der gespielte Ablauf (Szenario, Ort, Kamera-Spur) → `work/<slug>.scene.js` / `.story.js` mit 9:16-Kamera (`shot()`), Captions, Stimme → `render.mjs` / Render-Workflow wie jedes Video.
- GitHub Pages (wie `game/` beim Waldtank): `world.html` im Workflow bauen und mitveröffentlichen.
- Prüfskript in CI (`node sandbox/tools/check.mjs`) vor dem Veröffentlichen.

## Offene Punkte
- Ladezeit der Welt (Physik-Bake, Massen-Simulation) – bei mehr Szenarien ggf. Vorab-Laden der wahrscheinlichsten Welt oder kleinere Stadt.
- Bildrate im Browser hängt an Schatten, Effekten und Fenstergröße (`maxW`); Messung mit `check.mjs --gpu`.
