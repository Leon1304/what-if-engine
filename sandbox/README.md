# What If Town

Browser-Spiel auf der Video-Engine: eine kleine Stadt als 3D-Diorama. Szenario-Karte wählen (M0: **Asteroid**), Ort in der Stadt anklicken, Countdown – dann läuft das Ereignis ab: Zähler live, Zeitleiste mit Zurückspulen und Zeitlupe, freie Kamera. Konzept und Meilensteine: [DESIGN.md](DESIGN.md).

## Bauen

```bash
bash sandbox/build.sh        # → sandbox/world.html (Build-Ergebnis, nicht im Repo)
```

`world.html` ist eine normale Engine-Seite aus `world.story.js` + `world.scene.js` (`assemble.py … --no-voice --no-el`, bettet Sounds, Mocap und Modelle ein) mit `CFG.live` (Live-Modus der Engine, v3.50). Nach jeder Änderung an `template.html`, `world.story.js` oder `world.scene.js` neu bauen.

## Lokal starten

```bash
python3 -m http.server 8000  # in der Repo-Wurzel
```

Dann <http://localhost:8000/sandbox/> öffnen. three.js und Rapier kommen vom CDN (cdn.jsdelivr.net), also Internet nötig. Die Stadt braucht beim ersten Laden einige Sekunden (Physik und Massen werden vorab berechnet), jeder Einschlag baut eine neue Welt – das überdeckt der Countdown.

## Steuerung

| | |
|---|---|
| Ziehen | Kamera drehen |
| Rechts / Shift + Ziehen | verschieben |
| Mausrad / Pinch | zoomen |
| W A S D, Q / E | verschieben, drehen |
| Leertaste | Abspielen / Pause |
| 1 – 4 | Tempo ¼× · ½× · 1× · 2× |
| R | von vorn |
| Esc | Zielen / Countdown abbrechen |

Ton: Knopf oben rechts (wird beim ersten Einschalten pro Welt offline gerendert, dann synchron zur Zeitleiste abgespielt).

## Aufbau

| Datei | Inhalt |
|---|---|
| `world.story.js` / `world.scene.js` | eine Engine-Seite für alle Zustände; Parameter im Hash: `#s=none` (ruhige Stadt, Schleife) · `#s=asteroid&x=12&z=-6&r=110&from=140&cam=az,el,dist,x,z,fov&play=0`. Szenarien als Tabellen `SANDBOX_SCEN` (Story) und `SANDBOX_BUILD` (Szene) |
| `index.html`, `js/main.js` | Hülle: Ablauf, Zeitleiste, Zähler, Tasten |
| `js/world.js` | eine Welt = ein iframe; Doppelpuffer (neue Welt lädt unsichtbar, Umschalten erst wenn `whatif.live` da ist und ein Bild gezeichnet wurde, Kamera wird übernommen). Die ruhige Stadt bleibt geladen → „Stadt zurücksetzen“ ist sofort da |
| `js/audio.js` | Ton im Eltern-Fenster (`whatif.renderAudio` → AudioContext, folgt `live.t` / `rate` / `seek`) |
| `js/scenarios.js` | Szenario-Karten der Hülle (Name, Text, Zielradius, Zeitmarken) |
| `tools/check.mjs` | Prüfskript (s. u.) |

Neues Szenario (M1): Eintrag in `js/scenarios.js`, in `SANDBOX_SCEN` (Länge, Musik, Zähler) und in `SANDBOX_BUILD` (was die Szene baut – nur vorhandene Engine-Funktionen; Neues gehört nach `template.html`, siehe `CLAUDE.md`).

## Prüfen

```bash
bash sandbox/build.sh && node sandbox/tools/check.mjs [--out <ordner>] [--gpu]
```

Öffnet die Hülle headless (Chromium wie `render.mjs`, SwiftShader), wartet auf die Stadt, zielt, löst den Asteroiden an fester Stelle aus und prüft: keine Fehler in Hülle und iframes, Ladezeiten, fps, Zähler, Zurückspulen (Bild bei t = 1 vor und nach dem Einschlag gleich), Tempo, „Stadt zurücksetzen“. Screenshots nach `work/sandbox-shots/` (oder `--out`). Ende: `SANDBOX OK` oder `SANDBOX FAIL` mit Liste. `--gpu` nimmt die echte GPU (Metal) – nur dann sind die fps aussagekräftig.

## Leistung (Einstellungen in `world.story.js`)

`renderScale: 1`, `msaa: 0`, `motionBlur: false`, `maxW: 1600` (größere Fenster werden hochskaliert), Schatten an (`area: 150`), keine Kamerafahrt/Tiefenunschärfe (Live-Kamera). Stadt: 4 × 3 Blöcke, zwei Vorort-Reihen (28 Häuser), 4 kleine Spaziergänger-Gruppen, Verkehr mit einem Auto pro Runde.

Langsamer Rechner: <http://localhost:8000/sandbox/?q=low> (Welten ohne Schatten).
