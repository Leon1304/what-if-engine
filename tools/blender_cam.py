# v3.17 camera paths planned in Blender → assets/cams/<name>.json, played in a scene with ...camPath('<name>', t0, { at: model }).
#
# Why: a flight through a door, along a trench or past the floors of a cut-open building is easiest to set right in the Blender viewport,
# next to the real model. The engine still renders, cuts and checks the shot (CAMCLIP, shot audit); Blender only gives the path.
#
# Live in Blender (Blender MCP), after building the model with tools/blender_asset.py (the model then stands with its bottom centre on the
# origin, so scene coordinates = model coordinates):
#   p = '<repo>/tools/blender_cam.py'; exec(compile(open(p).read(), p, 'exec'), g := {'__file__': p})
#   cam = g['cam_setup']('fly_in')               # 9:16 camera (1440 × 2560), 30 fps, lens 24 mm; animate it (keyframes, follow path …)
#   g['export_cam']('bunker_door_in', cam, model='own/bunker')   # samples every frame of the scene's frame range
# Headless from a script: export_cam(name, cam, frames=(start, end)).
# JSON (three.js axes, metres, relative to the model's bottom centre): { model, fps, n, p: [x, y, z, …], l: [x, y, z, …], fov: deg | [deg …], roll: 0 | [rad …] }
import bpy, json, math, os
from mathutils import Vector

REPO = os.path.dirname(os.path.dirname(os.path.abspath(globals().get('__file__', 'tools/blender_cam.py'))))

def _t(v): return [round(v[0], 4), round(v[2], 4), round(-v[1], 4)]   # Blender (x, y back, z up) → three.js (x, y up, z front)

def cam_setup(name='cam', lens=24.0, fps=30, aspect=(1440, 2560)):
    """Camera with the video's frame (9:16, or aspect=(2560, 1440) for 16:9) and the scene set to that resolution and fps; becomes the active camera."""
    scn = bpy.context.scene; scn.render.resolution_x, scn.render.resolution_y = aspect; scn.render.fps = fps; scn.render.fps_base = 1
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.sensor_fit = 'AUTO'; cd.clip_start = 0.05
    c = bpy.data.objects.new(name, cd); scn.collection.objects.link(c); scn.camera = c
    return c

def vfov(cam):
    """Vertical field of view in degrees of `cam` at the scene's resolution (what three.js calls fov)."""
    d, r = cam.data, bpy.context.scene.render
    rx, ry = r.resolution_x * r.pixel_aspect_x, r.resolution_y * r.pixel_aspect_y
    fit = d.sensor_fit if d.sensor_fit != 'AUTO' else ('HORIZONTAL' if rx >= ry else 'VERTICAL')
    size = d.sensor_width if d.sensor_fit in ('AUTO', 'HORIZONTAL') else d.sensor_height
    if fit == "HORIZONTAL": return math.degrees(2 * math.atan(size / 2 / d.lens * ry / rx))
    return math.degrees(2 * math.atan(size / 2 / d.lens))

def export_cam(name, cam=None, model=None, frames=None, look=10.0):
    """Sample `cam` (default: the scene camera) on every frame → assets/cams/<name>.json. model: the asset the path was planned around
    ('own/bunker'); the scene then places it with camPath(…, { at: thatAsset }). Returns the file path."""
    scn = bpy.context.scene; cam = cam or scn.camera
    if cam is None or cam.type != 'CAMERA': raise ValueError('export_cam: no camera')
    if cam.data.type != 'PERSP': raise ValueError('export_cam: only perspective cameras')
    f0, f1 = frames or (scn.frame_start, scn.frame_end); keep = scn.frame_current
    P, L, F, R = [], [], [], []
    for f in range(f0, f1 + 1):
        scn.frame_set(f); M = cam.matrix_world; q = M.to_quaternion(); pos = M.translation
        fwd = (q @ Vector((0, 0, -1))).normalized(); up = (q @ Vector((0, 1, 0))).normalized()
        right = fwd.cross(Vector((0, 0, 1)))
        if right.length < 1e-6: right = Vector((1, 0, 0))   # looking straight up or down: no roll defined
        nup = right.normalized().cross(fwd)
        roll = math.atan2(nup.cross(up).dot(-fwd), nup.dot(up))   # three.js: camera.lookAt(l) and then rotateZ(roll)
        P += _t(pos); L += _t(pos + fwd * look); F.append(round(vfov(cam), 3)); R.append(round(roll, 4))
    scn.frame_set(keep)
    fps = scn.render.fps / scn.render.fps_base
    data = {'model': model, 'fps': fps, 'n': f1 - f0 + 1, 'p': P, 'l': L,
            'fov': F[0] if max(F) - min(F) < 0.01 else F, 'roll': 0 if max(abs(r) for r in R) < 1e-3 else R}
    out = os.path.join(REPO, 'assets', 'cams', name + '.json'); os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w') as fh: json.dump(data, fh, separators=(',', ':'))
    print(f'cam/{name}: {data["n"]} frames ({data["n"] / fps:.2f} s at {fps:g} fps) → {out}')
    return out
