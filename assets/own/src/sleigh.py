# Santa's sleigh (3.6 m body on 4.2 m runners, shafts 2.8 m further forward; 1.6 m wide, 1.8 m high): curved red body with gold trim
# lines and scrolls, swan-neck dash, high scrolled backrest, green velvet bench with buttoned cushion and a draped plaid blanket, wooden
# floor, steel-shod runners that curl up at the front, struts, a row of sleigh bells, a lantern on a bracket, two shafts with crossbar and
# harness straps for the reindeer (animals come from the engine), a bulging gift sack with a rope tie and wrapped presents with ribbons
# and bows in the back, snow on the runners and floor, scuffed paint and chipped gold.
# Faces -y (+z in three.js, like drive()): asset(world, 'own/sleigh', x, z, { dyn: true }) and move/tilt the group per frame to fly.
# Materials (tint keys): paint, paint_dark, gold, velvet, cushion, plaid, wood, steel, leather, sack, rope, gift_red, gift_green,
# gift_blue, gift_gold, ribbon, ribbon_red, lamp (glows), snow.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/sleigh.py
AO = {'strength': 0.6, 'dist': 0.8}

def rod(p1, p2, r, seg=6):
    a, b = Vector(p1), Vector(p2); d = b - a
    bm = cyl(r, d.length, (0, 0, 0), seg=seg)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix(), verts=bm.verts)
    return move(bm, a)

def side_prism(pts, xa, xb):
    """Side profile [(u, z), …] (u along the length, front at negative u) extruded across x from xa to xb."""
    return rotz(prism(pts, xb - xa, -xb), math.pi / 2)

def build(coll):
    R = random.Random(24)
    M = {k: mat(k, *v) for k, v in {
        'paint': ('#B01E28', 0.45), 'paint_dark': ('#7A141B', 0.6), 'gold': ('#E0B04A', 0.3, 0.6), 'velvet': ('#24563A', 0.8),
        'cushion': ('#2E6B48', 0.85), 'plaid': ('#8C2A2A', 0.95), 'wood': ('#6E4A2C', 0.8), 'steel': ('#5A5F66', 0.4, 0.7),
        'leather': ('#4A2E1C', 0.7), 'sack': ('#8E6C46', 0.95), 'rope': ('#C2A46E', 0.9), 'gift_red': ('#C8323A', 0.6),
        'gift_green': ('#2F8A4E', 0.6), 'gift_blue': ('#2F5DA8', 0.6), 'gift_gold': ('#E2BC5A', 0.4, 0.3), 'ribbon': ('#F0E6C8', 0.5),
        'ribbon_red': ('#D82A30', 0.5), 'lamp': ('#FFE2A0', 0.3, 0.0, '#FFD27A'), 'snow': ('#F2F5F8', 0.9)}.items()}
    out = []
    def add(n, bm, m): out.append(mesh(n, bm, M[m], coll))
    Wb = 1.5                      # body width
    # side outline (u along y, front negative) — swan-neck dash at the front, low waist, high scrolled back
    side = [(-1.75, 1.05), (-1.6, 0.62), (-1.35, 0.5), (1.25, 0.5), (1.5, 0.66), (1.62, 1.05), (1.58, 1.5), (1.42, 1.75), (1.22, 1.72),
            (1.1, 1.45), (0.98, 1.05), (0.35, 0.98), (-0.55, 0.98), (-0.95, 1.12), (-1.3, 1.42), (-1.55, 1.55), (-1.78, 1.42)]
    for s in (-1, 1):
        x0 = s * Wb / 2
        add('side', side_prism(side, x0 - 0.04, x0 + 0.04), 'paint')
        # gold trim along the top edge and an inset gold line on the panel
        top = side[4:] + [side[0]]
        for a, b in zip(top, top[1:]): add('trim', rod((x0 + s * 0.045, a[0], a[1]), (x0 + s * 0.045, b[0], b[1]), 0.025, 5), 'gold')
        inner = [(-1.25, 0.72), (0.95, 0.72), (1.25, 0.9), (1.3, 1.3), (0.85, 0.85), (-0.7, 0.85), (-1.25, 1.05)]
        for a, b in zip(inner, inner[1:] + inner[:1]): add('trim_line', rod((x0 + s * 0.042, a[0], a[1]), (x0 + s * 0.042, b[0], b[1]), 0.012, 4), 'gold')
        add('scroll', torus(0.12, 0.03, (x0 + s * 0.05, 1.32, 1.6), seg=12, seg2=4, axis='X'), 'gold')
        add('scroll', torus(0.1, 0.03, (x0 + s * 0.05, -1.62, 1.38), seg=12, seg2=4, axis='X'), 'gold')
        add('bottom_band', box(0.03, 2.7, 0.06, (x0 + s * 0.05, -0.05, 0.5)), 'gold')
        # scuffs low on the panel, chipped gold
        for k in range(3): add('scuff', box(0.01, R.uniform(0.2, 0.45), R.uniform(0.05, 0.1), (x0 + s * 0.042, R.uniform(-1.0, 1.0), 0.55 + R.uniform(0, 0.15))), 'paint_dark')
        # bells on a leather strap along the waist
        add('bell_strap', box(0.02, 1.9, 0.05, (x0 + s * 0.06, -0.2, 0.86)), 'leather')
        for k in range(7):
            b = dome(0.045, (x0 + s * 0.09, -1.05 + k * 0.28, 0.79), seg=8, rings=3); bmesh.ops.scale(b, vec=(1, 1, -1), verts=b.verts, space=Matrix.Translation((-(x0 + s * 0.09), 1.05 - k * 0.28, -0.84)))
            add('bell', b, 'gold')
    # body: floor, back panel, dash panel, bench, backrest cushion, plaid
    add('floor', box(Wb, 2.75, 0.06, (0, -0.05, 0.5)), 'wood')
    for k in range(9): add('floor_board', box(Wb - 0.02, 0.012, 0.012, (0, -1.3 + k * 0.3, 0.56)), 'paint_dark')
    add('back_panel', box(Wb, 0.08, 1.15, (0, 1.55, 0.55)), 'paint')
    add('dash', box(Wb, 0.08, 0.75, (0, -1.62, 0.62), bevel_w=0.02), 'paint')
    add('dash_gold', box(Wb + 0.02, 0.03, 0.05, (0, -1.67, 1.3)), 'gold')
    add('bench', box(Wb - 0.08, 0.75, 0.38, (0, 0.2, 0.56), bevel_w=0.04), 'velvet')
    cu = box(Wb - 0.12, 0.7, 0.12, (0, 0.2, 0.94), bevel_w=0.05, seg=2); add('cushion', cu, 'cushion')
    for k in range(4): add('button', cyl(0.025, 0.02, (-0.5 + k * 0.33, 0.2, 1.055), seg=6), 'gold')
    bk = box(Wb - 0.1, 0.16, 0.6, (0, 0.62, 1.0), bevel_w=0.05, seg=2); add('backrest', bk, 'cushion')
    for k in range(3):
        for j in range(2): add('button', cyl(0.022, 0.02, (-0.4 + k * 0.4, 0.53, 1.2 + j * 0.22), seg=6, axis='Y'), 'gold')
    # plaid blanket: over the right end of the bench and hanging down outside the side panel, with fringe stripes
    add('plaid', box(0.5, 0.7, 0.035, (Wb / 2 - 0.3, 0.2, 1.06), rz=0.05), 'plaid')
    add('plaid', box(0.035, 0.68, 0.5, (Wb / 2 + 0.07, 0.2, 0.62)), 'plaid')
    add('plaid', box(0.12, 0.68, 0.035, (Wb / 2 + 0.01, 0.2, 1.1)), 'plaid')
    for k in range(3): add('plaid_stripe', box(0.04, 0.69, 0.04, (Wb / 2 + 0.072, 0.2, 0.7 + k * 0.14)), 'cushion')
    # runners: steel-shod, curling up at the front, with struts to the body
    curve = [(1.85, 0.06), (1.0, 0.04), (0.0, 0.04), (-1.0, 0.04), (-1.7, 0.06), (-2.1, 0.18), (-2.32, 0.45), (-2.3, 0.75), (-2.12, 0.88), (-1.98, 0.78)]
    for s in (-1, 1):
        x = s * 0.68
        for a, b in zip(curve, curve[1:]):
            add('runner', rod((x, a[0], a[1]), (x, b[0], b[1]), 0.045, 6), 'gold' if a[0] < -2.2 else 'paint_dark')
            add('shoe', rod((x, a[0], a[1] - 0.035), (x, b[0], b[1] - 0.035), 0.022, 5), 'steel')
        add('runner_tip', dome(0.06, (x, -1.98, 0.78), seg=8, rings=3), 'gold')
        add('runner_back', dome(0.05, (x, 1.86, 0.06), seg=8, rings=2), 'gold')
        for u in (-1.35, -0.6, 0.2, 1.0, 1.55):
            add('strut', rod((x, u, 0.07), (s * 0.66, u + 0.05, 0.5), 0.03, 5), 'paint_dark')
        add('brace', rod((x, -1.35, 0.3), (x, 1.55, 0.3), 0.022, 5), 'paint_dark')
    for u in (-1.0, 0.6): add('cross', rod((-0.68, u, 0.3), (0.68, u, 0.3), 0.025, 5), 'paint_dark')
    # shafts with crossbar and harness straps
    for s in (-1, 1):
        add('shaft', rod((s * 0.62, -1.6, 0.62), (s * 0.55, -4.5, 0.86), 0.035, 6), 'wood')
        add('shaft_tip', cyl(0.045, 0.12, (s * 0.55, -4.55, 0.82), seg=6), 'gold')
        add('trace', rod((s * 0.55, -3.2, 0.8), (s * 0.85, -4.3, 0.72), 0.015, 4), 'leather')
        add('trace', rod((s * 0.85, -4.3, 0.72), (s * 0.9, -4.6, 0.95), 0.015, 4), 'leather')
    add('crossbar', rod((-0.6, -2.8, 0.76), (0.6, -2.8, 0.76), 0.04, 6), 'wood')
    add('singletree', rod((-0.35, -3.0, 0.74), (0.35, -3.0, 0.74), 0.03, 5), 'wood')
    add('collar', torus(0.32, 0.05, (0, -4.35, 1.15), seg=12, seg2=5, axis='Y'), 'leather')
    for k in range(5): add('collar_bell', dome(0.04, (-0.24 + k * 0.12, -4.4, 1.43 - abs(k - 2) * 0.05), seg=6, rings=2), 'gold')
    # lantern on a bracket at the front left
    add('lamp_bracket', rod((-Wb / 2 - 0.05, -1.4, 1.2), (-Wb / 2 - 0.25, -1.45, 1.35), 0.02, 4), 'gold')
    add('lamp_glass', cyl(0.08, 0.2, (-Wb / 2 - 0.27, -1.45, 1.22), seg=6), 'lamp')
    add('lamp_top', cyl(0.11, 0.08, (-Wb / 2 - 0.27, -1.45, 1.42), seg=6, r2=0.03), 'gold')
    add('lamp_base', cyl(0.1, 0.04, (-Wb / 2 - 0.27, -1.45, 1.18), seg=6), 'gold')
    # gift sack and presents in the back
    sk = bmesh.new(); bmesh.ops.create_icosphere(sk, subdivisions=2, radius=0.6); jitter(sk, 0.06, 9)
    bmesh.ops.scale(sk, vec=(1.05, 0.85, 1.0), verts=sk.verts); add('sack', move(sk, (-0.15, 1.05, 1.5)), 'sack')
    nk = cyl(0.2, 0.35, (-0.1, 1.1, 2.0), seg=10, r2=0.12); jitter(nk, 0.02, 3); add('sack_neck', nk, 'sack')
    add('sack_tie', torus(0.18, 0.035, (-0.1, 1.1, 2.08), seg=10, seg2=4, axis='Z'), 'rope')
    add('sack_rope', rod((0.05, 1.0, 2.08), (0.25, 0.85, 1.8), 0.02, 4), 'rope')
    add('sack_top', cyl(0.16, 0.12, (-0.1, 1.1, 2.33), seg=10, r2=0.22), 'sack')
    gifts = [((0.5, 0.35, 0.3), (0.45, 1.2, 0.56), 0.2, 'gift_red', 'ribbon'), ((0.35, 0.35, 0.35), (0.48, -0.25, 0.56), -0.15, 'gift_green', 'ribbon_red'),
             ((0.4, 0.3, 0.25), (0.15, -0.55, 0.56), 0.4, 'gift_blue', 'ribbon'), ((0.3, 0.3, 0.3), (0.45, 1.2, 0.86), -0.3, 'gift_gold', 'ribbon_red'),
             ((0.6, 0.4, 0.2), (-0.35, -0.3, 0.56), 0.1, 'gift_red', 'gift_gold'), ((0.25, 0.25, 0.4), (-0.5, 1.25, 0.56), 0.5, 'gift_green', 'ribbon'),
             ((0.3, 0.45, 0.3), (0.3, 0.2, 1.06), 0.2, 'gift_blue', 'ribbon_red')]
    for (sx, sy, sz), (x, y, z), rz, mc, mr in gifts:
        add('gift', box(sx, sy, sz, (x, y, z), bevel_w=0.012, rz=rz), mc)
        add('ribbon', box(sx + 0.012, 0.05, sz + 0.012, (x, y, z - 0.006), rz=rz), mr)
        add('ribbon', box(0.05, sy + 0.012, sz + 0.012, (x, y, z - 0.006), rz=rz), mr)
        for s in (-1, 1):
            bw = torus(0.05, 0.015, (0, 0, 0), seg=8, seg2=3, axis='X'); bmesh.ops.rotate(bw, cent=(0, 0, 0), matrix=Matrix.Rotation(s * 0.5, 3, 'Y'), verts=bw.verts)
            add('bow', move(rotz(bw, rz), (x + s * 0.04 * math.cos(rz), y + s * 0.04 * math.sin(rz), z + sz + 0.03)), mr)
    # snow on the runners, floor and bench edge
    for (x, y, z, sx, sy) in [(0.68, -0.4, 0.09, 0.14, 0.7), (-0.68, 0.7, 0.09, 0.14, 0.5), (-0.4, -1.2, 0.56, 0.5, 0.3), (0.6, 0.62, 0.95, 0.2, 0.15)]:
        sn = box(sx, sy, 0.05, (x, y, z), bevel_w=0.02); jitter(sn, 0.012, int(y * 10)); add('snow', sn, 'snow')
    for k in range(5):
        sn = bmesh.new(); bmesh.ops.create_icosphere(sn, subdivisions=1, radius=R.uniform(0.04, 0.08)); jitter(sn, 0.01, k)
        add('snow_clump', move(sn, (R.choice((-0.72, 0.72)), R.uniform(-1.6, 1.5), 0.1)), 'snow')
    return out
