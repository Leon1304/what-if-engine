# Four-way crossing, exactly 16 × 16 m (x, y = ±8): connects own/jlm_road on all four sides (10 m asphalt, 3 m sidewalks).
# Asphalt square with stop lines and zebra crossings on every arm, sidewalk corners with curbs that follow a rounded corner,
# tactile paving at the kerb ramps, storm drains, manhole, patches. Materials: like jlm_road (+ tactile).
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/jlm_road_cross.py
use('_street.py')
AO = {'strength': 0.5, 'dist': 0.6}

def build(coll):
    M = street_mats(); out = []; R = random.Random(4)
    tactile = mat('tactile', '#C9A33A', 0.9)
    add = lambda n, bm, m: out.append(mesh(n, bm, m, coll))
    S, AW, SW = 16.0, 10.0, 3.0
    add('asphalt', box(AW + 0.02, S, 0.02), M['asphalt'])
    for s in (-1, 1): add(f'asphalt_arm{s}', box(SW, AW, 0.02, (s * (AW / 2 + SW / 2), 0, 0)), M['asphalt'])
    for k in range(2):
        add(f'patch{k}', box(R.uniform(0.8, 1.6), R.uniform(0.6, 1.2), 0.006, (R.uniform(-3, 3), R.uniform(-3, 3), 0.02), rz=R.uniform(-0.3, 0.3)), M['patch'])
    add('manhole', cyl(0.32, 0.012, (-1.2, -1.6, 0.02), seg=14), M['metal_d'])
    add('manhole_rim', torus(0.33, 0.02, (-1.2, -1.6, 0.03), seg=14, seg2=3, axis='Z'), M['metal_d'])
    # zebra crossings and stop lines on the four arms (built for the -y arm, turned by 90° steps)
    for arm in range(4):
        parts = []
        for k in range(8): parts.append(('zebra', box(0.5, 2.6, 0.004, (-4.2 + k * 1.2, -6.4, 0.02)), M['marking']))
        parts.append(('stop', box(4.6, 0.3, 0.004, (2.5, -4.9, 0.02)), M['marking']))
        for n, bm, m in parts: rotz(bm, arm * math.pi / 2); add(n, bm, m)
    # sidewalk corners: square block with the inner corner rounded (curb follows), tactile paving at the ramps
    for sx in (-1, 1):
        for sy in (-1, 1):
            cx, cy = sx * (AW / 2 + SW / 2), sy * (AW / 2 + SW / 2)
            r = 1.5
            # outline: outer corner → along the x edge → rounded inner corner → along the y edge (sidewalk block of SW × SW)
            ring = [(sx * (AW / 2 + SW), sy * (AW / 2 + SW)), (sx * (AW / 2 + SW), sy * (AW / 2)), (sx * (AW / 2 + r), sy * (AW / 2))]
            ring += [(sx * (AW / 2 + r) - sx * r * math.sin(math.pi / 2 * j / 6), sy * (AW / 2 + r) - sy * r * math.cos(math.pi / 2 * j / 6)) for j in range(1, 6)]
            ring += [(sx * (AW / 2), sy * (AW / 2 + r)), (sx * (AW / 2), sy * (AW / 2 + SW))]
            bm = bmesh.new(); vs = [bm.verts.new((x, y, 0.0)) for x, y in ring]; f = bm.faces.new(vs)
            ex = bmesh.ops.extrude_face_region(bm, geom=[f]); bmesh.ops.translate(bm, vec=(0, 0, 0.15), verts=[v for v in ex['geom'] if isinstance(v, bmesh.types.BMVert)])
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces); add(f'corner{sx}{sy}', bm, M['paver'])
            # curb band along the rounded edge
            for j in range(6):
                a0, a1 = math.pi / 2 * j / 6, math.pi / 2 * (j + 1) / 6
                p0 = (sx * (AW / 2 + r) - sx * r * math.sin(a0), sy * (AW / 2 + r) - sy * r * math.cos(a0))
                p1 = (sx * (AW / 2 + r) - sx * r * math.sin(a1), sy * (AW / 2 + r) - sy * r * math.cos(a1))
                mx, my = (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2; ln = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
                add(f'curb_r{sx}{sy}{j}', box(ln + 0.05, 0.3, 0.17, (mx, my, 0), rz=math.atan2(p1[1] - p0[1], p1[0] - p0[0])), M['curb'])
            for (bx, by, w, d) in [(sx * (AW / 2 + r + (SW - r) / 2), sy * (AW / 2), SW - r, 0.3), (sx * (AW / 2), sy * (AW / 2 + r + (SW - r) / 2), 0.3, SW - r)]:
                add(f'curb_s{sx}{sy}{bx:.1f}', box(w, d, 0.17, (bx, by, 0), bevel_w=0.03), M['curb'])
            add(f'tactile_a{sx}{sy}', box(0.6, 1.2, 0.005, (sx * (AW / 2 + 0.6), sy * (AW / 2 + 2.2), 0.15)), tactile)
            add(f'tactile_b{sx}{sy}', box(1.2, 0.6, 0.005, (sx * (AW / 2 + 2.2), sy * (AW / 2 + 0.6), 0.15)), tactile)
            for k in range(1, 5): add(f'pj{sx}{sy}{k}', box(SW - 0.4, 0.015, 0.002, (sx * (AW / 2 + SW / 2 + 0.2), sy * (AW / 2 + k * 0.6), 0.15)), M['paver_d'])
            add(f'drain{sx}{sy}', box(0.9, 0.5, 0.012, (sx * (AW / 2 + 2.3), sy * (AW / 2 - 0.3), 0.02)), M['metal_d'])
    return out
