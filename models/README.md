# Motion-capture models

Rigged glTF/GLB characters with animation clips. `assemble.py` embeds every model a video uses (`model('name')` in the scene, or `"model": "name"` in a series `cast.json`).

| File | Source | Licence |
|---|---|---|
| `robot.glb` | RobotExpressive by Tomás Laulhé (Quaternius), modifications by Don McCurdy — from the three.js examples | CC0 1.0 |

Clips in `robot.glb`: Idle, Walking, Running, Dance, Death, Jump, No, Yes, Punch, Sitting, Standing, ThumbsUp, Wave, WalkJump.

**Adding a human mocap body:** download the free *Universal Base Characters* and *Universal Animation Library* (Quaternius, CC0, itch.io → "Download Now", $0), export one character with the clips you need as a single GLB (Blender: import both, File → Export → glTF Binary), save it here as `models/<name>.glb`, commit. Then `model('<name>', { scale, map: { walk: 'Walk_Loop', … } })`.
