# Date palm (~6.5 m) in a round limestone planter (1.6 m across): planter with rim and base band, soil with stones, trunk of stacked,
# slightly offset and leaning rings (leaf scars), crown of 14 drooping fronds (each three tapered, folded segments),
# two hanging date clusters (fronds are folded single sheets; glTF exports them double-sided). Materials: stone, stone_dark (curb), soil, bark, leaf, leaf_dark, dates.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/palm_planter.py
use('_street.py')
AO = {'strength': 0.5, 'dist': 0.8}

def build(coll):
    M = street_mats(); out = []; R = random.Random(12)
    dates = mat('dates', '#C27A2A', 0.8)
    add = lambda n, bm, m: out.append(mesh(n, bm, m, coll))
    add('planter_base', cyl(0.82, 0.12, seg=16, bevel_w=0.02), M['curb'])
    add('planter', cyl(0.78, 0.55, (0, 0, 0.12), seg=16, bevel_w=0.03), M['stone'])
    add('planter_rim', torus(0.76, 0.06, (0, 0, 0.67), seg=16, seg2=4, axis='Z'), M['curb'])
    add('soil', cyl(0.72, 0.02, (0, 0, 0.62), seg=16), M['soil'])
    for k in range(6):
        a = R.uniform(0, 6.28); r = R.uniform(0.3, 0.6)
        s = bmesh.new(); bmesh.ops.create_icosphere(s, subdivisions=1, radius=0.06); jitter(s, 0.02, seed=k)
        add(f'pebble{k}', move(s, (r * math.cos(a), r * math.sin(a), 0.65)), M['curb'])
    # trunk: rings leaning slightly
    z, x, y = 0.62, 0.0, 0.0; n = 16
    for k in range(n):
        h = 0.32; r = 0.2 - 0.004 * k
        add(f'trunk{k}', cyl(r, h, (x, y, z), seg=8, r2=r * 0.86), M['bark'])
        add(f'scar{k}', cyl(r * 1.06, 0.06, (x, y, z + h - 0.06), seg=8), M['bark'])
        z += h - 0.02; x += 0.012; y -= 0.006
    top = (x, y, z)
    add('crown', dome(0.3, (x, y, z - 0.1), seg=8, rings=3, h=0.35), M['bark'])
    # fronds
    for k in range(14):
        a = 2 * math.pi * k / 14 + R.uniform(-0.1, 0.1)
        tilt = R.uniform(0.15, 0.5); L = R.uniform(2.2, 2.8)
        p = Vector(top) + Vector((0, 0, 0.2)); d = Vector((math.cos(a) * math.cos(tilt), math.sin(a) * math.cos(tilt), math.sin(tilt)))
        for j in range(3):
            seg_len = L / 3; w0, w1 = (0.5, 0.45, 0.28)[j], (0.45, 0.28, 0.02)[j]
            q = p + d * seg_len
            side = Vector((-d.y, d.x, 0)).normalized()
            bm = bmesh.new()
            v = [bm.verts.new(p - side * w0 / 2), bm.verts.new(p + side * w0 / 2), bm.verts.new(q + side * w1 / 2), bm.verts.new(q - side * w1 / 2),
                 bm.verts.new(p + Vector((0, 0, 0.04))), bm.verts.new(q + Vector((0, 0, 0.04)))]
            bm.faces.new((v[0], v[4], v[5], v[3])); bm.faces.new((v[4], v[1], v[2], v[5]))
            add(f'frond{k}{j}', bm, M['leaf'] if k % 2 else M['leaf_d'])   # folded leaf: two faces meeting at the raised midrib
            p = q; d = (d + Vector((0, 0, -0.45))).normalized()
    for k in range(2):
        a = k * 3.1 + 0.6
        s = bmesh.new(); bmesh.ops.create_icosphere(s, subdivisions=1, radius=0.22); jitter(s, 0.05, seed=50 + k, scale_z=1.6)
        add(f'dates{k}', move(s, (top[0] + 0.35 * math.cos(a), top[1] + 0.35 * math.sin(a), top[2] - 0.35)), dates)
    return out
