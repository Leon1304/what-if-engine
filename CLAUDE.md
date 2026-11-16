# what-if-engine – Regeln für Claude Code (lokal auf Leons Mac)

Antworten an Leon: Deutsch, knapp, direkt. Videos, Captions und Posting-Texte: Englisch.
Kanal: @whatifthishappenedscenarios (YouTube Shorts, Instagram Reels, TikTok).

## Skill
Videos entstehen mit dem Skill `/whatif` (`.claude/skills/whatif/SKILL.md`, Kopie des claude.ai-Skills).
Der Skill wurde für claude.ai geschrieben. Lokal gilt diese Übersetzung:

| Im Skill | Lokal |
|---|---|
| `.engine/` (Klon der Engine) | dieses Repo (Wurzel). Nicht noch einmal klonen. |
| Arbeitsordner `whatif/` | `work/` im Repo (in `.gitignore`, wird nicht committet) |
| Projekt-Dateien `claude/<name>.md` (`project_read` / `project_write`) | `docs/projekt/<name>.md`; lesen, nach jedem Video aktualisieren und mitcommitten |
| `add_repo`, `SendUserFile`, Artifacts, `publish_files` | entfällt. Dateien liegen lokal; Pfad nennen, ggf. mit `open <datei>` zeigen |
| Video-Übersicht (Artifact „WhatIf – Videos“) | nur `gallery/` im Repo pflegen; das Artifact zieht ein claude.ai-Chat nach |
| Setup-Abschnitt (Repo klonen, Pakete) | einmalig erledigt; nur ergänzen, was fehlt |

`docs/projekt/` ist ab jetzt die Hauptquelle für Running Gags, Themenliste, Trend-Log usw. Die Kopien im claude.ai-Projekt „WhatIf“ sind der Stand vom 12.11.2026 und werden dort nicht mehr automatisch gepflegt.

## Engine ändern (Pflicht)
- Neue Gegenstände, Gebäude, Fahrzeuge, Tiere, Animationen, Effekte und Geräusche immer als wiederverwendbare, detaillierte, animierte Funktion in `template.html` bauen, nicht nur in `<slug>.scene.js`. Erst `grep -n -i '<begriff>' docs/API.md`, Vorhandenes per Option/`kind` erweitern.
- Das gilt für alles, was ein Video zeigt: auch Kamerafahrten und Übergänge, HUD-, Caption- und Zählerarten, Cover/Thumbnail-Funktionen, Post-FX/Grading, `CFG`-Optionen und QA-Prüfungen gehören in `template.html` (bzw. `render.mjs`/`assemble.py`, wo es hingehört), mit Eintrag in `docs/API.md` (auch `CFG`-Schlüssel) und Testszene. Kamerabezogenes (lookAt zur Kamera, Himmel um die Kamera) nur in `POSTCAM`.
- Statische Low-Poly-Objekte dürfen auch als eigenes Blender-Modell entstehen (Blender-MCP, Paket `assets/own/`, Bauskript + `tools/blender_asset.py`, siehe `docs/API.md` „Eigene Modelle aus Blender“). Bewegliche/animierte Dinge bleiben Funktionen in `template.html`.
- Arbeitsteilung Blender ↔ Engine (v3.17, Details `docs/API.md` „Übergabe aus Blender“): Blender liefert Formen, die Engine alles, was sich mit t ändert. Keine Animationen, Lichter oder Kameras in die GLB; stattdessen bringt jedes neue Modell seine Übergabepunkte mit: bewegliche Teile mit Drehpunkt (`part`), Markierungen für Sitze, Eingänge, Laufwege, Lichter und Kamerapunkte (`mark`), bei Treppen/Dächern/Laufstegen eine Lauffläche (`walk_surface`, nie über einem Durchgang). Was weit vor das Modell ragt (Vordach, Balkon, Billboard, Hocker, Poller), wird ein eigenes Teil, sonst liegt der Platz davor in der Hitbox des ganzen Modells. Enge Kamerafahrten in Blender planen (`tools/blender_cam.py` → `camPath`). Sieht ein Modell im Bild falsch aus: im Bauskript korrigieren, nicht in der Szene flicken.
- Neue Blender-Objekte immer nur in voller Detailstufe bauen (Fasen, Aussparungen, Schäden, Gebrauchsspuren, Kleinteile, AO), keine einfache Grundvariante; Name `own/<name>` ohne Zusatz (Leons Vorgabe). In `docs/API.md` und `tests/own-assets` aufnehmen.
- Neue Funktionen in `docs/API.md` beschreiben und mit einer kleinen Testszene in `tests/` absichern.
- Jedes Bild ist eine reine Funktion von t (kein aufaddierter Zustand zwischen Bildern).
- Tests: `bash tests/run.sh` muss grün sein. Auf macOS die GNU-Tools vorn in den PATH nur für den Testlauf:
  `PATH="/opt/homebrew/opt/coreutils/libexec/gnubin:/opt/homebrew/opt/gnu-sed/libexec/gnubin:/opt/homebrew/bin:$PATH" bash tests/run.sh` (läuft parallel, ca. 4–5 Min. auf dem M4; `SMOKE_JOBS=n` ändert die Zahl gleichzeitiger Szenen; Referenzbild-Vergleich `tests/golden.py` macht CI)
- Vor dem Commit: `git fetch -q origin main && git rebase origin/main`, dann die nächste freie Versionsnummer nach `git log -1 origin/main` vergeben.
- Änderungen an Engine und Skill immer direkt nach `main` pushen (Leons Vorgabe).

## Prüfen vor dem Rendern
`node render.mjs … --shots` bzw. `--gate`: MOTION-, HITBOX-, GORE-, QA- und PAGE-ERRORS-Zeilen müssen leer sein, die Ausgabe endet mit `GATE: ok` (v3.24; Korrekturrunden unbegrenzt, gerendert wird erst danach). Bewusste Ausnahmen nur als `QA_OK` in der Story mit Grund (zählt sonst als Fehler) und im Chat nennen. Seit v3.24 auch `QA: CAPFACE` / `FLOAT` / `BURIED` / `GHOST` und Massen „close to the camera“. CI prüft dasselbe vor dem Rendern (Job `gate`); ein Release mit ⚠ (Pre-Release) ist nicht lieferbar. Pre-Push-Hook einmalig: `bash tools/install-hooks.sh`. Seit v3.5 gehören dazu auch `QA: DARK` / `EMPTY` / `CAMCLIP` / `HEADCUT` (zu dunkel, leeres Bild/Cover, Kamera in Geometrie, Kopf abgeschnitten), seit v3.19 `QA: VEHICLE` / `BACKWARD` (Auto oder Hubschrauber durch Menge, Figur oder Gebäude; Figur läuft rückwärts), seit v3.39 `QA: CRAB` / `FOOTSLIDE` / `SIT` / `SLIP` (Figur rutscht seitwärts, Fuß rutscht, Sitzende schweben, Auto driftet) und `ROADBURIED` / `DECALOFF` / `COPLANAR` (Straße im Hang, Markierung neben dem Asphalt, flimmernde Flächen); bewusste Ausnahmen im Chat begründen. `QA-INFO: SPARSE` (leere Bildflächen) zählt nicht, soll aber mit `dress(kind)` für jedes Set, Haus-Optionen und Requisiten klein werden. Null Toleranz für Bildfehler (fremde Linien, Streifen, Kanten). Seit v3.44 außerdem: Bild am fertigen Frame `QA: LINES` / `BLOCKY` / `FRINGE` / `WASHOUT` (Punktreihen, Klötzchen-Unschärfe, Farbsäume, milchiger Blitz); Kollision `QA: OVERLAP` (Gebäude ineinander) / `INSIDE` (Figur in einem Körper) / `HEADCLIP` (Kopf in etwas); Regie `QA: PACING` (Einstellung > 2,5 s, im Hook > 1,5 s; `CFG.autoCut` schneidet automatisch) / `HOOK` (erste 0,5 s ohne Bewegung) / `YOU` ("you" ohne die you-Figur im Bild) / `MISMATCH` (gesprochene Zahl ≠ Zähler) / `ENDCARD` (Endkarte > 1,5 s oder Standbild) / `REACTCUT`; Untertitel `QA: CAPHL` (Hervorhebung auf Funktionswort). Seit v3.46: `QA: HUDFACE` (Zähler, Karte oder Stempel über einem Gesicht), `HIDDEN` (Figur der Einstellung hinter einer Wand), `VOID` (fast leere Kulisse, zählt), `TOPPLE` (kippender Turm durch einen Nachbarn), `LEGS` (Beine unter dem Fahrzeugboden), `VEHICLE` auch für Hubschrauber, `CAMCLIP` auch für Linse in Körpern/Mengen; `CAPFACE` erkennt jetzt auch Untertitel über großen Nahaufnahme-Gesichtern, `WASHOUT` auch milchige Bilder ohne Blitz und `DARK` auch an Schnitträndern. Regie-Checkliste im Skill (2d) befolgen: jeder Satz mit passendem Bild, eine durchgehende you-Figur, nach jedem großen Moment `reactCut()`, Bedrohung mit `shot('low')`, Tilt-Shift nur für Größenvergleiche.

## Rendern
Lokal für Testframes und Vorschau (schnelle Qualität; `--hq` für einen Qualitätsvergleich). Das finale 2K-Video rendert GitHub Actions automatisch in HQ (3D in voller Auflösung, 4× MSAA; `CFG.renderScale`/`msaa` nicht von Hand hochsetzen): `renders/<slug>.html` pushen → Release `render-<slug>` mit `<slug>.mp4` und Cover. Captions nach `gallery/captions/<slug>.json`, Vorschau-Link in `gallery/previews.json` (siehe Skill Abschnitt 5).

## Stimme, Musik, Sounds
- Erzähler über ElevenLabs, braucht `ELEVENLABS_API_KEY` in der Umgebung (in `~/.zshrc`, nie ins Repo).
- Stimme je Kategorie wählt `voice.py` selbst (`CFG.voice: 'auto'`): Story Denzel · Serie JM · Explain Adam · Conspiracy Declan Sage · Horror Storm Styles · True Crime Declan Sage.
- Musik und Sounds kommen aus der Engine, **nicht von ElevenLabs** (v3.36, Leons Vorgabe: zu viele Credits): pro Video eigener Musik-Stil `AUDIO.style` (bluegrass, western, military, orchestral, synthwave, middleeast, asian … in `STYLES`, `template.html`) über `AUDIO.score`; fehlt ein Stil oder Soundeffekt, wird er in `template.html` gebaut (`STYLES`, `SFX`, `AMB`, oder CC0-Datei in `sfx/`). ElevenLabs-Musik/-SFX (`elaudio.py`) nur auf ausdrücklichen Wunsch mit `--el` bzw. `AUDIO.el: true`.
- Kokoro nur für die Figurenstimmen in Serien (Dr. Steve, „you“) und als Ersatz ohne Key. `python3 voice.py <slug> --which` zeigt Kategorie und Stimme.

## Lieferung pro Video
Länge: jedes Short höchstens 45 s (Story 38–45 s, Erklär/Conspiracy 35–43 s; Leons Vorgabe ab 15.11.2026, `assemble.py` warnt).
`<slug>.mp4` (2K, 1440 × 2560), Cover A/B, YouTube-Shorts-Text (Titel, Beschreibung, Tags), Instagram-Caption, TikTok-Text.
Die Posting-Texte liegen zusätzlich als Textdatei `<slug>-captions.txt` im Release neben MP4 und Cover (Leons Vorgabe ab 15.11.2026): kommt automatisch, sobald `gallery/captions/<slug>.json` gepusht ist (Workflow `captions`, Skript `tools/captions_txt.py`); im Chat den Direktlink mit ausgeben.
Immer den GitHub-Download-Link mit ausgeben: Release-Seite `https://github.com/Leon1304/what-if-engine/releases/tag/render-<slug>` und direkt `https://github.com/Leon1304/what-if-engine/releases/download/render-<slug>/<slug>.mp4`. Danach `docs/projekt/running-gags.md` und ggf. Themenliste/Trend-Log aktualisieren und committen.

## Spiel „Waldtank“ (game/)
Survival-Erkundungsspiel (POV, Low-Poly, Three.js), unabhängig von der Video-Engine. Map entsteht aus Blender-Skripten `game/blender/s*.py`
(headless: `Blender -b --factory-startup --python game/blender/build_all.py`, dann `node game/blender/shrink.mjs game/map.glb`), Spiel in `game/js/`.
Vor dem Push `node game/tools/playthrough.mjs` → `PLAYTHROUGH OK`, `node game/tools/routes.mjs` → `ROUTES OK` (Laufwege mit echter Kollision; Möbel nie vor Türen/in Gänge), `node game/tools/pickups.mjs` → `PICKUPS OK` (Gegenstände nie in Füllware/Wänden verstecken) und `node game/tools/features.mjs` → `FEATURES OK`. Spielstände müssen nach Updates weiter laden (alles über Namen/Ids speichern, `SAVE_VERSION` in `game.js`). GitHub Pages (Workflow `game-pages`): https://leon1304.github.io/what-if-engine/game/ — Details `game/README.md`.
Blender nur live öffnen, wenn Leon zuschauen will (Mac wird warm); Viewport dann Solid + Vertex-Farben statt Materialvorschau.

## Spiel „Schwebeinsel“ (insel/)
Gemütliches Sechseck-Aufbauspiel (Three.js, Low Poly, alles prozedural in `insel/js/models/`, keine GLB), unabhängig von Engine und Waldtank. Konzept `insel/DESIGN.md`, Aufbau `insel/README.md`.
Vor dem Push: `node insel/tools/rules.mjs` → `RULES OK` und `node insel/tools/play.mjs <ordner>` → `PLAY OK` (bei UI-/Kamera-/Leben-Änderungen auch `ui-demo.mjs`, `stage-shots.mjs`, `life-logic.mjs`).
Spielstände müssen nach Updates laden (`SAVE_VERSION` in `insel/js/game.js`). GitHub Pages (Workflow `game-pages`): https://leon1304.github.io/what-if-engine/insel/
