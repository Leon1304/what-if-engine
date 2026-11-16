# Spielhalle – Übersichtsseite aller Spiele

Eine Seite, über die man alle Browser-Spiele des Repos erreicht. Sie läuft auf **Netlify** und zusätzlich auf GitHub Pages
(https://leon1304.github.io/what-if-engine/). Jedes Spiel mit einer `game.json` im eigenen Ordner der Repo-Wurzel erscheint automatisch.

| Datei | Inhalt |
|---|---|
| `hub/` | die Übersichtsseite (`index.html`, Icon, Web-App-Manifest; lässt sich auf dem Handy „zum Startbildschirm“ hinzufügen) |
| `tools/site/build.mjs` | baut `_site/`: Übersicht + alle Spiele (nur die Dateien aus `files`), schreibt die Spieleliste in die Seite und nach `games.json` |
| `tools/site/covers.mjs` | Coverbilder (`<spiel>/cover.jpg`, 1600 × 1000) per headless Chromium |
| `tools/site/check.mjs` | Test der gebauten Seite → `HUB OK` |
| `netlify.toml` | Netlify-Build (Befehl, Ordner, „ignore“ für Engine-Commits, Header) |

## Neues Spiel aufnehmen
1. Im Spielordner eine `game.json` anlegen:
```json
{
  "title": "Name",                       // Pflicht
  "tagline": "Ein Satz, worum es geht",  // Pflicht
  "description": "2–3 Sätze für die große Karte",
  "genre": "Aufbau · Puzzle",
  "tags": ["3D", "Gemütlich", "Handy"],  // werden zu Filtern
  "controls": ["Maus", "Touch"],
  "status": "neu",                       // neu | spielbar | beta | bald („bald“ = Karte ohne Link, Dateien werden nicht veröffentlicht)
  "added": "2026-11-16",                 // „Neu“-Plakette 14 Tage lang (sonst erster Commit des Ordners)
  "order": 10,                           // kleiner = weiter vorn
  "color": "#e8873a",                    // Akzentfarbe von Karte und Knopf
  "emoji": "🏭",                         // Ersatzbild ohne Cover
  "cover": "cover.jpg",
  "files": ["index.html", "js"],         // was online geht (ohne Angabe: alles außer tools/, blender/, *.md, package.json)
  "save": "meinspiel.",                  // localStorage-Präfix der Spielstände → Knopf „Weiterspielen“
  "entry": "index.html",                 // Startdatei, falls nicht index.html
  "coverShot": { "wait": 8000, "click": ["Neues Spiel"], "eval": "JS vor dem Foto", "after": 2500 }
}
```
   (Kommentare hier nur zur Erklärung; echte JSON-Datei ohne Kommentare.)
2. `node tools/site/covers.mjs <ordner>` → Cover ansehen, ggf. `coverShot` anpassen.
3. `node tools/site/build.mjs && node tools/site/check.mjs` → `SITE OK` / `HUB OK`. Vorschau: `node tools/site/build.mjs --serve` → http://localhost:8080/
4. Committen und pushen: Netlify und GitHub Pages bauen von selbst.

Alle Spiele laufen auf derselben Adresse. Deshalb muss jedes Spiel seine localStorage-Schlüssel mit einem eigenen Präfix versehen.
Die Übersicht merkt sich unter `hub.*`, was zuletzt gespielt wurde. Das zuletzt gespielte Spiel steht oben („Weiter, wo du warst“), sonst das neueste.

## Netlify einrichten (einmalig)
- **Mit GitHub verbunden (empfohlen):**
  1. Netlify → „Add new site“ → „Import an existing project“ → GitHub → `Leon1304/what-if-engine`, Branch `main`.
  2. Alles Weitere steht in `netlify.toml`: Befehl `node tools/site/build.mjs`, Ordner `_site`.
  3. Commits, die kein Spiel und nicht die Übersicht betreffen (Engine, Videos), überspringt Netlify über `ignore`.
- **Ohne Verbindung (Drag & Drop):**
  1. `node tools/site/build.mjs` ausführen.
  2. Den Ordner `_site/` auf https://app.netlify.com/drop ziehen.
  3. Oder mit der Netlify-CLI: `netlify deploy --prod --dir _site`.
