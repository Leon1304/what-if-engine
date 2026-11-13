# Motion-capture models

Rigged glTF/GLB characters with animation clips. `assemble.py` embeds every model a video uses (`model('name')` in the scene, or `"model": "name"` in a series `cast.json`).

| File | Source | Licence |
|---|---|---|
| `robot.glb` | RobotExpressive by Tomás Laulhé (Quaternius), modifications by Don McCurdy — from the three.js examples | CC0 1.0 |
| `mocap.json` | the clips of `human_m.glb`, retargeted onto the joints of `figure()` by `build-mocap.mjs` | CC0 1.0 |
| `human_m.glb`, `human_f.glb` | Quaternius: Universal Base Characters (Superhero male / female, hairstyles) + Universal Animation Library 1 and 2 [Standard] — merged by `build-quaternius.mjs` | CC0 1.0 |

Clips in `robot.glb`: Idle, Walking, Running, Dance, Death, Jump, No, Yes, Punch, Sitting, Standing, ThumbsUp, Wave, WalkJump.

**Adding a human mocap body:** download the free *Universal Base Characters* and *Universal Animation Library* (Quaternius, CC0, itch.io → "Download Now", $0), export one character with the clips you need as a single GLB (Blender: import both, File → Export → glTF Binary), save it here as `models/<name>.glb`, commit. Then `model('<name>', { scale, map: { walk: 'Walk_Loop', … } })`.

**`human_m.glb` / `human_f.glb`** (used by `human()` in the engine) are built, not hand-exported:
```
npm i --no-save @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 sharp
node models/build-quaternius.mjs ~/Downloads/quaternius   # folder with the three unzipped [Standard] packs
```
The script merges body, eyes, eyebrows and six hairstyles on one skeleton, copies all clips of both libraries by bone name (rotations only; pelvis height scaled), drops unused UV/colour sets, adds the `_CLOTH` vertex attribute (arm/leg position and weights for painted clothes) plus `extras.cloth` (neck/waist height, average skin colour) and shrinks textures to 1024 px JPEG.

**`mocap.json`** (used by `anim(figure, …)` and `figure({ mocap: true })`): `node models/build-mocap.mjs` (needs `@gltf-transform/core` from above and `three`). Every clip of `human_m.glb` is sampled at 30 fps; each figure joint gets the rotation that points it along the matching mocap bone (limbs and the spine → neck line exactly, twist from the bone), the hips move with the pelvis scaled to the figure's hip height. int16, ~7 KB per second of clip.
