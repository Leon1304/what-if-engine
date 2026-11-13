# Old-city style street lamp (4.4 m): stepped cast-iron base with ribs, fluted pole with collars, scroll arms holding a hexagonal
# lantern with glowing glass panes, frame, cap and finial. Turn it off with tint { lamp: '#3A3A3A' }.
# Materials: metal_dark, lamp, metal.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/street_lamp.py
use('_street.py')
AO = {'strength': 0.5, 'dist': 0.4}

def build(coll):
    M = street_mats(); Lm = light_mats(); out = []
    add = lambda n, bm, m: out.append(mesh(n, bm, m, coll))
    iron = M['metal_d']
    add('base0', cyl(0.24, 0.12, seg=8, bevel_w=0.02), iron)
    add('base1', cyl(0.19, 0.5, (0, 0, 0.12), seg=8, r2=0.13), iron)
    for k in range(8):
        a = 2 * math.pi * k / 8 + math.pi / 8
        add(f'rib{k}', move(rotz(box(0.03, 0.05, 0.45, (0, 0, 0)), a), (0.15 * math.cos(a), 0.15 * math.sin(a), 0.14)), iron)
    add('collar0', cyl(0.11, 0.08, (0, 0, 0.62), seg=10), iron)
    add('pole', cyl(0.065, 3.0, (0, 0, 0.7), seg=8, r2=0.05), iron)
    for z in (1.6, 2.6, 3.7): add(f'collar{z}', cyl(0.075, 0.06, (0, 0, z), seg=10), iron)
    # lantern on top
    zl = 3.75
    add('lantern_floor', cyl(0.2, 0.06, (0, 0, zl), seg=6), iron)
    add('lantern_glass', cyl(0.17, 0.42, (0, 0, zl + 0.06), seg=6, r2=0.21), Lm['lamp'])
    for k in range(6):
        a = 2 * math.pi * k / 6
        bar = cyl(0.012, 0.44, (0, 0, 0), seg=4); bmesh.ops.rotate(bar, cent=(0, 0, 0), matrix=Matrix.Rotation(0.09, 3, Vector((-math.sin(a), math.cos(a), 0))), verts=bar.verts)
        add(f'lantern_bar{k}', move(bar, (0.19 * math.cos(a), 0.19 * math.sin(a), zl + 0.06)), iron)
    add('lantern_cap', cyl(0.28, 0.16, (0, 0, zl + 0.48), seg=6, r2=0.06), iron)
    add('finial', dome(0.05, (0, 0, zl + 0.64), seg=6, rings=3), iron)
    # scroll arms under the lantern
    for k in range(3):
        a = 2 * math.pi * k / 3
        sc = torus(0.12, 0.012, (0, 0, 0), seg=10, seg2=3, axis='X'); rotz(sc, a + math.pi / 2)
        add(f'scroll{k}', move(sc, (0.12 * math.cos(a), 0.12 * math.sin(a), zl - 0.1)), iron)
    return out
