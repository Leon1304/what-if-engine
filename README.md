# what-if-engine

Engine for the /what-if video skill (Claude): Three.js template, headless renderer, assembler, offline voice-over.

- `template.html` – engine + example story/scene (zombie farm)
- `render.mjs` – frame-exact renderer (shots, video, cover, audio, remux). Default 2K (1440×2560): `out.mp4` = YouTube master (CRF 18), `out-ig.mp4` = Instagram copy (1080×1920, ~12 Mbps)
- `assemble.py` – builds `<slug>.html` from `<slug>.story.js` + `<slug>.scene.js`
- `voice.py` – Kokoro TTS voice-over with word timings

## Rendering on GitHub Actions
Push an assembled page to `renders/<slug>.html` (output of `assemble.py`, voice embedded). The `render` workflow splits it into 12 frame blocks rendered in parallel, then encodes `<slug>.mp4` (YouTube master, 2K), `<slug>-ig.mp4` (Instagram 1080×1920) and `<slug>-cover.jpg` and attaches them to the release `render-<slug>`:
`https://github.com/Leon1304/what-if-engine/releases/download/render-<slug>/<slug>.mp4`
Manual run: Actions → render → Run workflow (page path, width 1440 / 2160 / 1080).
