# what-if-engine

Engine for the /what-if video skill (Claude): Three.js template, headless renderer, assembler, offline voice-over.

- `template.html` – engine + example story/scene (zombie farm)
- `render.mjs` – frame-exact renderer (shots, video, cover, audio, remux). Default 2K (1440×2560): `out.mp4` = YouTube master (CRF 18), `out-ig.mp4` = Instagram copy (1080×1920, ~12 Mbps)
- `assemble.py` – builds `<slug>.html` from `<slug>.story.js` + `<slug>.scene.js`
- `voice.py` – Kokoro TTS voice-over with word timings
