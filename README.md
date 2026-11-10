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
- **Buildings & streets (v2.1):** farmhouse (plinth, framed windows with shutters and flower boxes, panel door, shingles, porch railing), barn (plank seams, corner trims, cupola + weathervane), silo, windmill (12-blade wheel, tail vane), fences with caps. City towers in three facade styles with real relief — `glass` (ledges, mullions), `brick` (recessed windows with sills and lintels, fire escapes, cornice), `deco` (pilasters, spandrels, belt courses, stepped crown, spire) — plus street level shop windows, awnings and entrances. `city()` adds paving, curbs, zebra crossings, manholes, street lights that glow at night, trees, planters, benches, bins, hydrants, bus stops, traffic lights (`props: false` = bare).
- **Vehicles & aircraft:** `vehicle(p,x,z,{kind})` car · sports · taxi · police (flashing light bar) · van · pickup · bus · truck · tractor (lights, bumpers, grille, mirrors, hubcaps); `traffic()` mixes the types (`kinds: […]`). `plane(p,{kind:'jet'|'prop'|'airliner'})`, `heli(p)`, `fly(obj, [[x,y,z],…], {t0, speed, loop, bank})`; `boat(…,{kind:'boat'|'yacht'|'ship'})`. Street furniture: `streetlight`, `planter`, `busstop`, `bench`, `hydrant`, `trashcan`, `trafficLight`.
- **Looks:** `figure({ hatStyle: 'straw'|'cap'|'beanie'|'cowboy', capBack, hairStyle: 'short'|'buzz'|'spiky'|'long'|'bun'|'curly'|'mohawk', glasses })`; `char('you', { outfit: 'cap' | ['capBack', 'shades'] … })` presets (OUTFITS). Default "you" has hair, no hat; series keep their look in cast.json.
- **Thumbnails:** `render.mjs --cover` renders a thumbnail in the video's look: `THUMB = { t, text: 'Zombies *ate* my _farm_', sub: 'Part 3', cam: { p, l, fov }, expr, lookCam, ring, arrow }` (all optional; `--plain` = bare frame).
- **Bloom** only takes the excess above `bloomThreshold` (1.2), capped: lamps, fire, sirens and zombie eyes glow, floodlit surfaces don't wash out.
- **Interactions (v2.2):** `carry(rig, obj, { pick, drop, throw: { t, to, h }, both })` (bend down, carry with one or both hands, put down or throw with wind-up), `toss(obj, t, { to, h, bounces, spin, float })` (arc + bounces; lands in water with a splash), `push(rig, obj, { t0, t1, to })`, `knockAway(obj, t, { dir, power })`, `shatter(obj, t)`, `wobble(obj, t)`. Doors: `openDoor(house | barn | car | gate, t, { i, close })`, `openWindow(house, t)`, `gate(p, x, z)`. `sit(rig, t, { seat: bench | [x,y,z], t1 })`, `enter(rig, vehicle, t, { out })`. Light: `flashlight(rig, { t0, t1 })`, `headlights(vehicle, { t0 })`, `phone(rig, { t0, t1, light })`, `lightning(t, { x, z })`, `lightningStorm(t0, t1)`. Traces: `walk(…, { prints: true | hex })` footprints, `drive(vehicle, pts, { t0, speed, tracks, dust })` (wheels turn, nose dips when braking, tyre tracks + skid marks, brake dust), `splash(x, z, t)`.
