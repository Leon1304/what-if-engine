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
- Statische Low-Poly-Objekte dürfen auch als eigenes Blender-Modell entstehen (Blender-MCP, Paket `assets/own/`, Bauskript + `tools/blender_asset.py`, siehe `docs/API.md` „Eigene Modelle aus Blender“). Bewegliche/animierte Dinge bleiben Funktionen in `template.html`.
- Neue Blender-Objekte immer nur in voller Detailstufe bauen (Fasen, Aussparungen, Schäden, Gebrauchsspuren, Kleinteile, AO), keine einfache Grundvariante; Name `own/<name>` ohne Zusatz (Leons Vorgabe). In `docs/API.md` und `tests/own-assets` aufnehmen.
- Neue Funktionen in `docs/API.md` beschreiben und mit einer kleinen Testszene in `tests/` absichern.
- Jedes Bild ist eine reine Funktion von t (kein aufaddierter Zustand zwischen Bildern).
- Tests: `bash tests/run.sh` muss grün sein. Auf macOS die GNU-Tools vorn in den PATH nur für den Testlauf:
  `PATH="/opt/homebrew/opt/coreutils/libexec/gnubin:/opt/homebrew/opt/gnu-sed/libexec/gnubin:/opt/homebrew/bin:$PATH" bash tests/run.sh` (läuft parallel, ca. 4–5 Min. auf dem M4; `SMOKE_JOBS=n` ändert die Zahl gleichzeitiger Szenen; Referenzbild-Vergleich `tests/golden.py` macht CI)
- Vor dem Commit: `git fetch -q origin main && git rebase origin/main`, dann die nächste freie Versionsnummer nach `git log -1 origin/main` vergeben.
- Änderungen an Engine und Skill immer direkt nach `main` pushen (Leons Vorgabe).

## Prüfen vor dem Rendern
`node render.mjs … --shots` bzw. `--audit`: MOTION-, HITBOX-, GORE-, QA- und PAGE-ERRORS-Zeilen müssen leer sein. Seit v3.5 gehören dazu auch `QA: DARK` / `EMPTY` / `CAMCLIP` / `HEADCUT` (zu dunkel, leeres Bild/Cover, Kamera in Geometrie, Kopf abgeschnitten); bewusste Ausnahmen im Chat begründen. Null Toleranz für Bildfehler (fremde Linien, Streifen, Kanten).

## Rendern
Lokal für Testframes und Vorschau (schnelle Qualität; `--hq` für einen Qualitätsvergleich). Das finale 2K-Video rendert GitHub Actions automatisch in HQ (3D in voller Auflösung, 4× MSAA; `CFG.renderScale`/`msaa` nicht von Hand hochsetzen): `renders/<slug>.html` pushen → Release `render-<slug>` mit `<slug>.mp4` und Cover. Captions nach `gallery/captions/<slug>.json`, Vorschau-Link in `gallery/previews.json` (siehe Skill Abschnitt 5).

## Stimme
- Erzähler über ElevenLabs, braucht `ELEVENLABS_API_KEY` in der Umgebung (in `~/.zshrc`, nie ins Repo).
- Stimme je Kategorie wählt `voice.py` selbst (`CFG.voice: 'auto'`): Story Denzel · Serie JM · Explain Adam · Conspiracy Declan Sage · Horror Storm Styles · True Crime Declan Sage.
- Kokoro nur für die Figurenstimmen in Serien (Dr. Steve, „you“) und als Ersatz ohne Key. `python3 voice.py <slug> --which` zeigt Kategorie und Stimme.

## Lieferung pro Video
`<slug>.mp4` (2K, 1440 × 2560), Cover A/B, YouTube-Shorts-Text (Titel, Beschreibung, Tags), Instagram-Caption, TikTok-Text.
Immer den GitHub-Download-Link mit ausgeben: Release-Seite `https://github.com/Leon1304/what-if-engine/releases/tag/render-<slug>` und direkt `https://github.com/Leon1304/what-if-engine/releases/download/render-<slug>/<slug>.mp4`. Danach `docs/projekt/running-gags.md` und ggf. Themenliste/Trend-Log aktualisieren und committen.
