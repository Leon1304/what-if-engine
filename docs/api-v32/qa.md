# v3.2 Bild-QA und HQ-Render (Paket P6)

Zum Einmischen in `docs/API.md` (Abschnitt „Prüfung“) – Stand dieses Branches.

## Bild-Prüfung im Audit (`QA: DARK / EMPTY / CAMCLIP / HEADCUT`)

`node render.mjs page.html --audit` (läuft auch bei `--shots` mit und im Render-Workflow) prüft jetzt zusätzlich, **wie das Bild aussieht**. Die Engine rendert dafür selbst winzige Bilder (72 × 128, quer 128 × 72) in eigene Render-Targets: ein normales `renderer.render(scene, camera)` nach `stepScene(teaseV(t))`, Tone-Mapping + sRGB + Kontrast + Vignette wie im Final-Pass (ohne AO, Bloom, Unschärfe; gleiches Render-Target-Format wie der Composer, damit SwiftShader nichts neu kompiliert), dazu ein zweiter Durchgang nur mit der Tiefe der undurchsichtigen Geometrie. Renderer-Zustand (Render-Target, autoClear, Schatten-Update, Sichtbarkeit, `THUMB`-Modus) wird danach zurückgesetzt – am sichtbaren Bild ändert sich nichts.

**Stichproben:** jedes Cover (`THUMB`, alle A/B-Varianten, im Thumbnail-Modus mit `THUMB.cam`) und die Mitte jeder Kameraeinstellung (`CAM`-Keys zwischen zwei Schnitten; Split-Screens, bildfüllende `MAP2D`-Karten und die Endkarte zählen nicht), zusammen höchstens 30 volle Bilder; lange Einstellungen (> 3,5 s) zusätzlich bei 20 % und 80 %, solange Platz ist. Für `CAMCLIP` und `HEADCUT` außerdem reine Tiefen-Proben kurz nach Beginn und kurz vor Ende jeder Einstellung (12 / 88 %, höchstens 60; die Kamera fährt im Lauf der Bewegung in etwas hinein). Covers und Einstellungsmitten laufen immer (gleiche Zeilen auf jedem Rechner); das Zeitbudget (25 s ab Start der Bild-Prüfung, `qaLook({ budget })`) kürzt nur die Extra-Proben. Kosten: ca. 0,1–0,3 s pro Bild ohne Last, beim ersten Bild einmalig Shader-/Pipeline-Aufbau.

Jede Meldung nennt Art, Ort (`shot n (a–b s) at t s` bzw. `cover A (THUMB at t s)`) und einen kurzen Hinweis. Pro Einstellung und Art nur die schlimmste Stelle, höchstens 6 Zeilen pro Art.

| Zeile | Wann | Schwelle | Typische Abhilfe |
|---|---|---|---|
| `QA: DARK – …` | eine große, fast schwarze Fläche (8×8-Zellen, die zu ≥ 90 % Luma < 0,06 haben – eine schwarze Wand/Platte, nicht die dunklen Lücken einer belebten Nachtszene), **Himmel zählt nicht** | > 35 % des Bildes; bei dunklem Himmel (`night`, `deepsea`, `space`, `mercury`; Nachtanteil ≥ 0,75) > 60 % | Licht ans Motiv (`lamp`, Taschenlampe, Fenster, `CFG.nightLift`), hellerer `SKY`-Eintrag dort, Kamera weg von der dunklen Wand / dem Schatten |
| `QA: EMPTY – …` | Bild fast ohne Details (flacher Himmel, kahler Boden, Nebel, Wasser; das Motiv winzig oder weg) | > 85 % der 8×8-Pixel-Zellen ohne Kontrast (Laplace-Mittel < 0,006 und Spitze < 0,05); nicht wenn schon `CAMCLIP` meldet. Auch: Kamera-Position/Linse `NaN` (nichts wird gezeichnet) | Kamera näher (`dist`, `fov`), aufs Motiv richten (`THUMB.cam` / `THUMB.t` beim Cover) oder etwas ins Bild stellen |
| `QA: CAMCLIP – …` (Linse in etwas) | Geometrie näher als 0,5 m an der Linse | > 20 % des Bildes | Kamera weg (`dist`, `h`, `az`, `p`) oder Objekt verschieben |
| `QA: CAMCLIP – …` (Vordergrund verdeckt) | etwas Großes zwischen Linse und einem weit entfernten Motiv: näher als min(2 m, 0,3 × Abstand zum Blickpunkt), nur wenn der Blickpunkt ≥ 4 m weg ist; nicht der Boden am unteren Rand | > 35 % des Bildes, Schwerpunkt in den oberen 60 % | Kamera daran vorbei (`az`, `h`, `p`) oder Objekt aus dem Weg |
| `QA: HEADCUT – …` | Figur groß im Bild (Kopf bis Hüfte > 30 % der Bildhöhe), Brust im Bild, aber ≥ 30 % des Kopfes über dem oberen Rand | – | tiefer kadrieren (`fy` 0,4–0,5, etwas mehr `dist`/`fov`, auf das Gesicht zielen: `dy`) oder weiter aufziehen |

Nicht gemeldet: Rauch, Glas, Wasser, Strahlen, Partikel und der Himmel bei `CAMCLIP` (nur undurchsichtige Geometrie zählt); Ego-Perspektive (`shot('pov', …)`) bei `CAMCLIP` und `HEADCUT` (eigene Hände/Waffe sind gewollt nah); `HEADCUT` in Makro-Einstellungen (Blickpunkt < 2,3 m, `fov` ≤ 30 oder `hand` 1,5), wenn der Blickpunkt unterhalb des Halses liegt (Hände, gehaltene Dinge); Figuren, deren Brust nicht im Bild ist (bewusst angeschnitten).

`--strict` zählt die neuen Zeilen mit (Exit 3). Debug: `node render.mjs page.html --probe "qaLook({ stats: true, budget: 1e9 })"` liefert die Messwerte jeder Probe (`dead`, `dark`, `flat`, `clip`, `fg`, `fd` = Abstand zum Blickpunkt, `heads`); `probes: false` = ohne die Tiefen-Proben.

Test: `tests/v32-qa.story.js` + `.scene.js` – Einstellung 2 meldet absichtlich `EMPTY`, Einstellung 3 `CAMCLIP`, Einstellung 4 `HEADCUT`; Einstellung 1 und das Cover bleiben still.

**Kalibrierung (Stand dieses Branches, alte Szenen mit neuer Engine neu gebaut):**
- `iss-falls`: `EMPTY` Cover A (96 %) und Einstellung 12 (99 %, blauer Leer-Frame); `DARK` Einstellung 11 (Globus-Nachtseite, 71 %). Feuerball-Einstellung (73 % flach) und ISS im All (76 %) bleiben still.
- `volcano-trash`: `DARK` Cover A (63 %, „Trash into lava“ – im fertigen Cover grau mit Fleck, weil Bloom/Unschärfe das schwarze Gestein überstrahlen) und Einstellung 7 (40 %, schwarze Vulkanwand über der Lava).
- `megalodon-pool`: `CAMCLIP` bei 36,0 s (Linse in der rosa Wand, 74 %), 48,3 s (blauer Pfeiler, 97 %), 39,7 s (Beckenrand unten, 29 %). Die Riesen-Luftmatratze bei 2,3 s ist 1–1,5 m entfernt und selbst das Motiv – nicht gemeldet.
- `zombie-city-ep1`: `DARK` Einstellung 12 (32,1 s, schwarze Fläche oben links, 38 %). Die übrigen Dämmerungs-Einstellungen (dunkle Flächen 17–31 %) und die Stelle um 20 s bleiben still.
- `coffee-test`: still (Köpfe in den Nahaufnahmen knapp, aber nicht angeschnitten).
- Tests: `environment` meldet `DARK` in Einstellung 3 (Kamera vor der Scheunenwand bei Nacht, 91 % schwarz – echter Fehler der Testszene), `horror-kit` meldet `EMPTY` mit `NaN` (die Testszene hat kein `CFG.handheld` → Kamera `NaN`, das Bild ist leer grau), `interiors`, `sea-detail`, `retention`, `long` still.

## HQ-Render (fertiges Video in voller Qualität)

- `node render.mjs page.html --video out.mp4` **ohne** `--draft` setzt `window.__HQ__`; die Engine hebt dann `CFG.renderScale` auf ≥ 1 und `CFG.msaa` auf ≥ 4 (wie bisher schon bei 16:9-Langvideos). `CFG.fast: true` behält überall die schnelle Qualität.
- Vorschau im Browser, `--shots`, `--cover`, `--audit` und `--video --draft` bleiben schnell (`renderScale` 0,75, `msaa` 2), außer mit `--hq`. `--no-hq` schaltet es für `--video` ab.
- Render-Workflow: die Frame-Shards rendern automatisch in HQ; das Cover wird mit `--hq` gerendert (ein Bild, kostet kaum Zeit).
- Mehraufwand (lokal gemessen, M-Mac, 1 Worker, `--w 1440`): reines 3D-Rendern 1,6–1,8× (coffee-test 0,8 → 1,5 s, megalodon-pool 0,93 → 1,6 s pro Bild), ganzer `--video`-Pfad inkl. Screenshot + JPEG ca. 1,5× (megalodon-pool 2,1 → 3,1 s/Bild). Der Workflow nutzt deshalb 18 statt 12 Shards (`SHARDS: 18`; GitHub-Free-Limit 20 gleichzeitige Jobs), die Wandzeit pro Video bleibt etwa gleich (Megalodon-Shards bisher 6–15 min). Job-Timeouts (Standard 6 h) mussten nicht angepasst werden.

## Für CLAUDE.md / Skill `whatif` (Vorschlag)

- **CLAUDE.md, „Prüfen vor dem Rendern“:** „`--audit` meldet jetzt auch `QA: DARK` (Bild zu großen Teilen schwarz), `QA: EMPTY` (Bild ohne Inhalt, v. a. Cover), `QA: CAMCLIP` (Kamera in/an Geometrie oder Riesen-Vordergrund vor dem Motiv) und `QA: HEADCUT` (Kopf in der Nahaufnahme oben abgeschnitten). Auch diese Zeilen müssen leer sein; bewusste Ausnahmen (z. B. Blackout-Moment) im Chat begründen.“
- **CLAUDE.md, „Rendern“:** „Das finale Video rendert automatisch in HQ (3D in voller Auflösung, 4× MSAA). Lokale Testframes, `--shots`, `--cover` bleiben schnell; für einen Qualitätsvergleich `--hq` anhängen. `CFG.renderScale`/`CFG.msaa` nicht mehr von Hand hochsetzen.“
- **Skill, Abschnitt Prüfen/QA:** die vier neuen `QA:`-Arten mit den Abhilfen aus der Tabelle; Cover immer gegen `EMPTY` prüfen (Thumbnail-Kamera nah ans Motiv, nicht ins Leere).
- **Skill, Abschnitt Rendern:** `--draft` = schnelle Vorschau ohne HQ; fertiges Video ohne `--draft` = HQ.
