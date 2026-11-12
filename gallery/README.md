# Video-Übersicht (Artifact „WhatIf – Videos“)

Alle gerenderten Videos mit Thumbnail, Posting-Texten (YouTube, Instagram, TikTok, Hooks) und Download-Links.

- Artifact: https://claude.ai/artifact/6yHXeXNyVDPDVSChMFyeNt (slug `305987c8-acf8-42b3-98f3-8293bcfc89c9`)
- Daten: `site/videos.json` (aus `renders/*.html` + Releases `render-<slug>`), Cover verkleinert in `site/covers/`
  (Artifacts laden keine fremden Bilder). MP4, Cover und SRT werden direkt aus dem Release geladen.
- Posting-Texte: `captions/<slug>.json` – schreibt der /whatif-Skill beim Liefern:
  `{ "youtube": { "title", "description", "tags": [..] }, "instagram": "…", "tiktok": "…", "hooks": ["…"] }`.
  Fehlt die Datei, erzeugt `build.py` Texte aus der Story (in der Übersicht als „automatisch“ markiert).
- Live-Vorschau-Links: `previews.json` (slug → Artifact-URL).

Aktualisieren (nach jedem neuen Video, der Skill macht das in Abschnitt 5):

    python3 gallery/build.py --files-json     # gleicht alle Videos ab, gibt die geänderten Dateien aus
    # dann publish_files: slug 305987c8-…, base_version (list_files), files = Zeile „FILES“, mode patch
    git add gallery && git commit -m "gallery: <slug>" && git push
