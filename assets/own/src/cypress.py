# Mediterranean cypress (~9 m): short trunk with root flare, a slim spindle of foliage built from stacked, jittered rings that
# narrow to a point, two tones of dark green, a few protruding clumps. Materials: bark, leaf_dark, leaf.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/cypress.py
use('_street.py')
AO = {'strength': 0.6, 'dist': 0.8}

def build(coll):
    M = street_mats(); out = []; R = random.Random(21)
    add = lambda n, bm, m: out.append(mesh(n, bm, m, coll))
    add('flare', cyl(0.3, 0.25, seg=7, r2=0.16), M['bark'])
    add('trunk', cyl(0.16, 1.2, (0, 0, 0.2), seg=7, r2=0.12), M['bark'])
    H, z0 = 8.6, 0.8
    n = 16
    prof = lambda t: 0.95 * math.sin(math.pi * min(1.0, t * 1.05 + 0.08)) ** 0.8 * (1 - t) ** 0.35 + 0.02
    for k in range(n):   # overlapping, slightly twisted rings in one dark tone (no stripes)
        t0, t1 = k / n, (k + 1) / n
        c = cyl(prof(t0) + 0.04, (H - z0) / n + 0.3, (0, 0, z0 + t0 * (H - z0) - 0.12), seg=11, r2=prof(t1) + 0.02)
        rotz(c, k * 0.37); jitter(c, 0.05, seed=k)
        add(f'foliage{k}', c, M['leaf_d'])
    for k in range(26):
        t = R.uniform(0.05, 0.8); a = R.uniform(0, 6.28); r = 0.9 * math.sin(math.pi * (t + 0.08)) * (1 - t) ** 0.35
        s = bmesh.new(); bmesh.ops.create_icosphere(s, subdivisions=1, radius=R.uniform(0.2, 0.35)); jitter(s, 0.08, seed=30 + k, scale_z=1.6)
        add(f'clump{k}', move(s, (r * math.cos(a), r * math.sin(a), z0 + t * (H - z0))), M['leaf'] if k % 3 == 0 else M['leaf_d'])
    return out
