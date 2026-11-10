# what-if-engine

Engine for the /what-if video skill (Claude): Three.js template, headless renderer, assembler, offline voice-over.

- `template.html` – engine + example story/scene (zombie farm)
- `render.mjs` – frame-exact renderer (shots, video, cover, audio, remux). Default 2K (1440×2560): `out.mp4` = YouTube master (CRF 18); `--ig` adds an Instagram copy (1080×1920), not used by default
- `assemble.py` – builds `<slug>.html` from `<slug>.story.js` + `<slug>.scene.js`
- `voice.py` – Kokoro TTS voice-over with word timings

## Rendering on GitHub Actions
Push an assembled page to `renders/<slug>.html` (output of `assemble.py`, voice embedded). The `render` workflow splits it into 12 frame blocks rendered in parallel, then encodes `<slug>.mp4` (YouTube master, 2K) and `<slug>-cover.jpg` and attaches them to the release `render-<slug>`:
`https://github.com/Leon1304/what-if-engine/releases/download/render-<slug>/<slug>.mp4`
Manual run: Actions → render → Run workflow (page path, width 1440 / 2160 / 1080).

## Engine v2 (Nov 2026): motion, faces, nature, image
- **Jointed figures:** hips, knees, feet, elbows; feet are placed by IK and stay planted, hips bob and sway, shoulders counter-rotate, arms swing opposite to the legs. Everybody breathes, blinks and glances around. `walk()` accelerates/brakes, turns ahead of corners and blends walk ↔ idle.
- **Acting:** `react(f, t, 'startle'|'hit'|'shrug'|'nod'|'shake'|'facepalm'|'wave'|'sigh'|'flinch')`, `jump(obj, t, { h })` (crouch, stretch, squash; any object), `figure({ look: 'cam' | [x,y,z] | name })`.
- **Faces:** eyes with pupils and glints, nose, ears, cheeks, lips, teeth, mouth corners. Expressions: calm happy scared angry shout sad surprised smug annoyed. `talk: [[t0, t1]]` or `t => bool` moves the lips (Dr. Steve talks during his beats automatically). Animals have eyes and nostrils; chickens head-lock when they walk.
- **Crowds:** same jointed body, per-member quirks (arm height, head tilt, dangling arm, stumbles).
- **Nature:** detailed trees (round, pine, snowpine, birch, dead, palm), rock clusters, cacti, `bush()`, `stump()`, `log()`, ground colour patches, wind sway (`CFG.wind`). `biome('farm'|'forest'|'beach'|'desert'|'snow'|'swamp'|'city'|'moon')` dresses the scene and keeps buildings, paths, crowd lanes and camera sight lines free.
- **Image:** ambient occlusion (`CFG.ao`), bloom (`CFG.bloom`), shadows fitted to the shot (`CFG.shadowFit`), real motion blur on fast frames (`CFG.motionBlur: 'auto'|'all'|false`, `MBLUR = [[t0, t1]]`), rounded smooth-shaded figures (`CFG.smooth`), optional environment light (`CFG.env`).
- **Captions:** long narrated beats are shown in pages (one sentence or ≤ `CFG.capWords` = 7 words) that follow the voice.
- **Motion capture:** `model('robot')` + `anim(rig, [[t, 'Wave'], …])`, works with `walk()`/`pose()`; see `models/README.md`.
- Render time: about 1.8× per frame, up to 3× on motion-blurred frames. Faster: `motionBlur: false`, `ao: 0`, `bloom: 0`.
