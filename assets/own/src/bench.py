# Park / street bench (1.9 m): two limestone end blocks with chamfered edges, cast-iron frame, five wooden seat slats and three back
# slats with screw heads, armrests, a small plaque. Sits facing -y. Materials: stone, metal_dark, wood, metal.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/bench.py
use('_street.py')
AO = {'strength': 0.6, 'dist': 0.35}

def build(coll):
    M = street_mats(); out = []
    add = lambda n, bm, m: out.append(mesh(n, bm, m, coll))
    L = 1.9
    for s in (-1, 1):
        x = s * (L / 2 - 0.12)
        add(f'leg{s}', box(0.2, 0.55, 0.4, (x, 0, 0), bevel_w=0.03), M['stone'])
        add(f'frame_seat{s}', box(0.05, 0.5, 0.05, (x, 0, 0.4)), M['metal_d'])
        back = box(0.05, 0.05, 0.55, (0, 0, 0)); bmesh.ops.rotate(back, cent=(0, 0, 0), matrix=Matrix.Rotation(-0.25, 3, 'X'), verts=back.verts)
        add(f'frame_back{s}', move(back, (x, 0.23, 0.42)), M['metal_d'])
        add(f'arm{s}', box(0.07, 0.42, 0.04, (s * (L / 2 - 0.05), -0.02, 0.62), bevel_w=0.01), M['metal_d'])
        add(f'arm_post{s}', box(0.04, 0.04, 0.2, (s * (L / 2 - 0.05), -0.2, 0.43)), M['metal_d'])
    for k in range(5):
        y = -0.22 + k * 0.105
        add(f'slat{k}', box(L - 0.08, 0.09, 0.035, (0, y, 0.45), bevel_w=0.008), M['wood'])
        for s in (-1, 1): add(f'screw{k}{s}', box(0.015, 0.015, 0.006, (s * (L / 2 - 0.12), y, 0.485)), M['metal'])
    for k in range(3):
        z = 0.58 + k * 0.13
        sl = box(L - 0.08, 0.09, 0.035, (0, 0, 0), bevel_w=0.008); bmesh.ops.rotate(sl, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2 - 0.25, 3, 'X'), verts=sl.verts)
        add(f'back_slat{k}', move(sl, (0, 0.27 + (z - 0.58) * 0.26, z)), M['wood'])
    add('plaque', box(0.14, 0.01, 0.05, (0, 0.24 - 0.01, 0.95)), M['metal'])
    return out
