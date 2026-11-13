# Straight street piece, exactly 16 m wide (x = ±8) × 12 m long (y = ±6): tiles end to end along its length (three.js z) and fits
# own/jlm_road_cross. Two 3.5 m lanes plus 1.5 m gutters on asphalt (top 0.02 m), dashed centre line and solid edge lines, stone curbs
# with joints, 3 m limestone-paver sidewalks (top 0.15 m) with joint grid, storm drains, manhole cover, asphalt patches and cracks,
# a tree pit with grating on each sidewalk. Materials: asphalt, asphalt_patch, marking, curb, paver, paver_dark, metal_dark, soil, void.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/jlm_road.py
use('_street.py')
AO = {'strength': 0.5, 'dist': 0.6}

def build(coll):
    M = street_mats(); out = []; R = random.Random(3)
    add = lambda n, bm, m: out.append(mesh(n, bm, m, coll))
    L, AW, SW = 12.0, 10.0, 3.0                     # length, asphalt width, sidewalk width
    add('asphalt', box(AW, L, 0.02), M['asphalt'])
    # markings: dashed centre (3 m dash, 3 m gap), solid edge lines 1.5 m from the curb
    for y in (-3.0, 3.0): add(f'centre{y}', box(0.15, 3.0, 0.004, (0, y, 0.02)), M['marking'])
    for x in (-3.5, 3.5): add(f'edge{x}', box(0.12, L, 0.004, (x, 0, 0.02)), M['marking'])
    # patches and cracks
    for k in range(3):
        cx, cy, w, d = R.uniform(-3, 3), R.uniform(-4.5, 4.5), R.uniform(0.8, 1.8), R.uniform(0.6, 1.4)
        add(f'patch{k}', box(w, d, 0.006, (cx, cy, 0.02), rz=R.uniform(-0.2, 0.2)), M['patch'])
    for k in range(4):
        x, y = R.uniform(-4, 4), R.uniform(-5, 5)
        for j in range(4):
            x2, y2 = x + R.uniform(-0.4, 0.4), y + R.uniform(0.2, 0.5)
            dx, dy = x2 - x, y2 - y; ln = math.hypot(dx, dy); nx, ny = -dy / ln * 0.012, dx / ln * 0.012
            bm = bmesh.new(); f = bm.faces.new([bm.verts.new(v) for v in ((x - nx, y - ny, 0.021), (x2 - nx, y2 - ny, 0.021), (x2 + nx, y2 + ny, 0.021), (x + nx, y + ny, 0.021))])
            ex = bmesh.ops.extrude_face_region(bm, geom=[f]); move_v = [v for v in ex['geom'] if isinstance(v, bmesh.types.BMVert)]
            bmesh.ops.translate(bm, vec=(0, 0, 0.003), verts=move_v); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            add(f'crack{k}{j}', bm, M['void']); x, y = x2, y2
    add('manhole', cyl(0.32, 0.012, (1.6, 2.2, 0.02), seg=14), M['metal_d'])
    add('manhole_rim', torus(0.33, 0.02, (1.6, 2.2, 0.03), seg=14, seg2=3, axis='Z'), M['metal_d'])
    for s in (-1, 1):
        sx = s * (AW / 2 + SW / 2)
        # curb with joints every metre, drains in the gutter, sidewalk with paver joints, tree pit
        add(f'curb{s}', box(0.3, L, 0.17, (s * (AW / 2 + 0.15), 0, 0), bevel_w=0.03), M['curb'])
        for k in range(1, 12): add(f'curb_joint{s}{k}', box(0.31, 0.012, 0.171, (s * (AW / 2 + 0.15), -L / 2 + k, 0)), M['paver_d'])
        add(f'sidewalk{s}', box(SW - 0.3, L, 0.15, (s * (AW / 2 + 0.3 + (SW - 0.3) / 2), 0, 0)), M['paver'])
        for k in range(1, 20): add(f'pj_y{s}{k}', box(SW - 0.3, 0.015, 0.002, (s * (AW / 2 + 0.3 + (SW - 0.3) / 2), -L / 2 + k * 0.6, 0.15)), M['paver_d'])
        for k in range(1, 5): add(f'pj_x{s}{k}', box(0.015, L, 0.002, (s * (AW / 2 + 0.3) + s * k * 0.54, 0, 0.15)), M['paver_d'])
        for y in (-3.5, 3.5):
            add(f'drain{s}{y}', box(0.5, 0.9, 0.012, (s * (AW / 2 - 0.3), y, 0.02)), M['metal_d'])
            for j in range(5): add(f'drain_slot{s}{y}{j}', box(0.36, 0.06, 0.004, (s * (AW / 2 - 0.3), y - 0.32 + j * 0.16, 0.032)), M['void'])
        add(f'tree_pit{s}', box(1.2, 1.2, 0.006, (sx + s * 0.2, 0.0, 0.15)), M['soil'])
        for j in range(5): add(f'pit_grate{s}{j}', box(1.2, 0.04, 0.012, (sx + s * 0.2, -0.5 + j * 0.25, 0.15)), M['metal_d'])
        add(f'pit_frame{s}', box(1.3, 1.3, 0.004, (sx + s * 0.2, 0.0, 0.148)), M['curb'])
    return out
