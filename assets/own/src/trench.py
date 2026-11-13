# Western-front trench section, winter 1914 (12 m long along x, 9 m across, 2.2 m deep, banks up to 2.9 m with sandbags): the trench is
# cut into two earth banks (their tops are the field level). Front side (enemy, -y / +z in three.js): fire step, plank revetment with
# posts, three-row sandbag parapet with a steel loophole plate and a box periscope, barbed-wire belt on corkscrew pickets and a shell crater
# in no man's land. Back side: corrugated-iron revetment, sandbag parados, dugout entrance with timber frame, rolled gas blanket and
# lantern. Floor: mud, puddles and duckboards. Props: two trench ladders, two rifles, ammunition boxes, a brazier with glowing coals,
# helmets, tins, a field telephone box and a small Christmas tree with candles on the parapet (Christmas truce).
# Placement: the trench floor is the model's bottom (y = 0); the banks rise 2.2 m above it. On flat ground the banks read as the field;
# film from inside the trench or low over the parapet. Long axis x: put sections end to end every 12 m.
# Materials (tint keys): earth, earth_top, mud, water, sandbag, sandbag_dark, wood, wood_dark, iron, steel, wire, void, canvas,
# ember, flame, pine, candle, khaki, tin.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/trench.py
AO = {'strength': 0.7, 'dist': 1.0}

def rod(p1, p2, r, seg=6):
    a, b = Vector(p1), Vector(p2); d = b - a
    bm = cyl(r, d.length, (0, 0, 0), seg=seg)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix(), verts=bm.verts)
    return move(bm, a)

def build(coll):
    R = random.Random(1914)
    M = {k: mat(k, *v) for k, v in {
        'earth': ('#6B5340', 0.95), 'earth_top': ('#7A6A4C', 0.95), 'mud': ('#4E3D2D', 0.95), 'water': ('#5C574C', 0.35),
        'sandbag': ('#B39E77', 0.95), 'sandbag_dark': ('#8E7A58', 0.95), 'wood': ('#7C5E3E', 0.85), 'wood_dark': ('#4F3A26', 0.9),
        'iron': ('#77736C', 0.75, 0.2), 'steel': ('#4D5155', 0.5, 0.6), 'wire': ('#3A3532', 0.6, 0.5), 'void': ('#120E0B', 1.0),
        'canvas': ('#8A8466', 0.95), 'ember': ('#FF6A1A', 0.8, 0.0, '#FF5A10'), 'flame': ('#FFD27A', 0.5, 0.0, '#FFC860'),
        'pine': ('#2F4A2E', 0.9), 'candle': ('#EDE6D0', 0.6), 'khaki': ('#6E6A48', 0.8), 'tin': ('#9EA1A4', 0.4, 0.6)}.items()}
    out = []
    def add(n, bm, m): out.append(mesh(n, bm, M[m], coll))
    L, Wt, D = 12.0, 2.4, 2.2         # length, trench width at the floor, depth
    yf, yb = -Wt / 2, Wt / 2           # front and back wall (front = enemy side, -y)

    # earth banks (field level at D) with a darker cut face, rough top
    for y0, y1 in ((-4.6, yf), (yb, 4.4)):
        add('bank', box(L, y1 - y0, D, (0, (y0 + y1) / 2, 0)), 'earth')
        t = box(L, y1 - y0, 0.08, (0, (y0 + y1) / 2, D - 0.02)); jitter(t, 0.03, 3); add('field', t, 'earth_top')
    # fire step on the front side
    add('fire_step', box(L, 0.6, 0.55, (0, yf + 0.3, 0), bevel_w=0.04), 'earth')
    for k in range(13): add('step_board', box(0.9, 0.62, 0.04, (-L / 2 + 0.47 + k * 0.92, yf + 0.3, 0.55)), 'wood' if k % 3 else 'wood_dark')
    # floor: mud with puddles, duckboards (two rails + slats) in sections
    add('floor', box(L, Wt - 0.6, 0.04, (0, 0.3, 0)), 'mud')
    for (x, y, sx, sy) in [(-4.2, 0.7, 1.4, 0.7), (1.0, 0.15, 1.8, 0.9), (4.6, 0.8, 1.0, 0.5)]:
        p = cyl(0.5, 0.02, (x, y, 0.035), seg=10); bmesh.ops.scale(p, vec=(sx, sy, 1), verts=p.verts, space=Matrix.Translation((-x, -y, 0))); add('puddle', p, 'water')
    for k in range(5):
        x0 = -L / 2 + 0.2 + k * 2.4; tilt = R.uniform(-0.03, 0.03)
        for s in (-1, 1): add('duck_rail', box(2.2, 0.08, 0.08, (x0 + 1.1, 0.3 + s * 0.28, 0.04), rz=tilt), 'wood_dark')
        for j in range(11): add('duck_slat', box(0.1, 0.72, 0.03, (x0 + 0.1 + j * 0.2, 0.3, 0.12), rz=tilt), 'wood')

    # front revetment: planks between posts above the fire step
    for k in range(7):
        x = -L / 2 + 0.1 + k * (L - 0.2) / 6
        add('post', box(0.14, 0.14, D + 0.25, (x, yf + 0.02, 0.0), bevel_w=0.015), 'wood_dark')
    for j in range(8):
        z = 0.58 + j * 0.2
        for k in range(3):
            add('plank', box(L / 3 - 0.05, 0.05, 0.18, (-L / 3 + k * L / 3, yf + 0.03, z), bevel_w=0.01, rz=R.uniform(-0.004, 0.004)), 'wood' if (j + k) % 4 else 'wood_dark')
    # back revetment: corrugated iron sheets with ribs, held by pickets; a dugout entrance in the middle-right
    xd = 2.8
    for k in range(6):
        x = -L / 2 + 1.0 + k * 2.0
        if abs(x - xd) < 1.2: continue
        add('iron_sheet', box(1.9, 0.03, 1.9, (x, yb - 0.02, 0.1), rz=R.uniform(-0.03, 0.03)), 'iron')
        for r in range(9): add('iron_rib', box(0.04, 0.035, 1.9, (x - 0.85 + r * 0.21, yb - 0.04, 0.1)), 'iron')
        add('picket', box(0.08, 0.08, 2.3, (x + 0.97, yb - 0.08, 0)), 'wood_dark')
    add('dug_void', box(1.3, 0.02, 1.8, (xd, yb - 0.012, 0)), 'void')
    for s in (-1, 1): add('dug_post', box(0.18, 0.2, 1.95, (xd + s * 0.75, yb - 0.02, 0), bevel_w=0.02), 'wood_dark')
    add('dug_lintel', box(1.75, 0.24, 0.22, (xd, yb - 0.02, 1.95), bevel_w=0.02), 'wood_dark')
    add('gas_blanket', cyl(0.12, 1.4, (xd - 0.7, yb - 0.17, 1.84), seg=8, axis='X'), 'canvas')
    add('blanket_hang', box(1.2, 0.03, 0.6, (xd + 0.05, yb - 0.1, 1.2)), 'canvas')
    add('lantern', cyl(0.07, 0.2, (xd + 0.95, yb - 0.15, 1.6), seg=8), 'flame')
    add('lantern_cap', cyl(0.09, 0.06, (xd + 0.95, yb - 0.15, 1.8), seg=8, r2=0.03), 'steel')
    add('lantern_hook', box(0.03, 0.2, 0.03, (xd + 0.95, yb - 0.08, 1.9)), 'steel')

    # sandbags: parapet (front, 3 rows) and parados (back, 2 rows), staggered, slightly irregular
    def bag(x, y, z, rz, dark=False):
        b = box(0.62, 0.34, 0.17, bevel_w=0.05, seg=1); jitter(b, 0.012, int(x * 10 + y * 7 + z * 13))
        add('sandbag', move(rotz(b, rz), (x, y, z)), 'sandbag_dark' if dark else 'sandbag')
    for row, (y, n, z) in enumerate([(yf - 0.35, 19, D), (yf - 0.6, 19, D + 0.17), (yf - 0.45, 18, D + 0.34)]):
        for k in range(n):
            x = -L / 2 + 0.31 + k * 0.63 + (0.31 if row % 2 else 0)
            if x > L / 2 - 0.3 or (row == 2 and abs(x + 1.5) < 0.4): continue      # gap for the loophole plate
            bag(x, y + R.uniform(-0.04, 0.04), z, R.uniform(-0.08, 0.08), R.random() < 0.25)
    for row, (y, n, z) in enumerate([(yb + 0.4, 18, D), (yb + 0.55, 17, D + 0.17)]):
        for k in range(n):
            x = -L / 2 + 0.35 + k * 0.66 + (0.33 if row % 2 else 0)
            if x > L / 2 - 0.3: continue
            bag(x, y, z, R.uniform(-0.1, 0.1), R.random() < 0.3)
    # loophole plate and periscope
    lp = box(0.6, 0.06, 0.45, (-1.5, yf - 0.45, D + 0.34), bevel_w=0.01); recess(lp, (0, -1, 0), 0.22, 0.05); add('loophole', lp, 'steel')
    add('periscope', box(0.1, 0.08, 1.1, (2.0, yf - 0.1, 1.9)), 'wood_dark')
    add('periscope_head', box(0.12, 0.12, 0.14, (2.0, yf - 0.12, 3.0)), 'wood_dark')
    add('periscope_glass', box(0.08, 0.02, 0.08, (2.0, yf - 0.19, 3.03)), 'tin')

    # no man's land: corkscrew pickets with barbed wire, a shell crater, debris
    pick = [(-5.5 + k * 1.6, -3.7 + (0.35 if k % 2 else 0)) for k in range(8)]
    for (x, y) in pick:
        add('wire_picket', rod((x, y, D - 0.05), (x + 0.04, y, D + 1.1), 0.025), 'wire')
        add('picket_eye', torus(0.05, 0.012, (x + 0.04, y, D + 1.0), seg=6, seg2=3, axis='X'), 'wire')
    for (x0, y0), (x1, y1) in zip(pick, pick[1:]):
        for h in (0.3, 0.65, 1.0): add('wire', rod((x0, y0, D + h), (x1, y1, D + h - 0.03), 0.008, 3), 'wire')
        add('wire', rod((x0, y0, D + 1.0), (x1, y1, D + 0.25), 0.008, 3), 'wire')
        for k in range(4):   # barbs
            t = (k + 0.5) / 4; add('barb', box(0.05, 0.05, 0.01, (x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, D + 0.65), rz=0.7), 'wire')
    cr = cyl(1.2, 0.05, (3.6, -3.2, D - 0.03), seg=12); add('crater', cr, 'mud')
    rim = torus(1.25, 0.18, (3.6, -3.2, D + 0.02), seg=12, seg2=4, axis='Z'); bmesh.ops.scale(rim, vec=(1, 1, 0.5), verts=rim.verts, space=Matrix.Translation((-3.6, 3.2, -D))); add('crater_rim', rim, 'earth')
    for i in range(8):
        rb = bmesh.new(); bmesh.ops.create_icosphere(rb, subdivisions=1, radius=R.uniform(0.07, 0.14)); jitter(rb, 0.03, i)
        add('clod', move(rb, (R.uniform(-5.5, 5.5), R.uniform(-4.4, -2.8), D + 0.04)), 'earth')

    # ladders against the front wall
    for x in (-3.6, 4.0):
        for s in (-1, 1): add('ladder_rail', rod((x + s * 0.22, yf + 0.95, 0.04), (x + s * 0.22, yf - 0.05, D + 0.5), 0.035, 5), 'wood')
        for k in range(7):
            t = (k + 0.7) / 8; y = yf + 0.95 - 1.0 * t; z = 0.04 + (D + 0.46) * t
            add('ladder_rung', rod((x - 0.22, y, z), (x + 0.22, y, z), 0.022, 5), 'wood_dark')
    # rifles leaning on the fire-step wall (stock + barrel + bolt), bayonet on one
    for (x, a) in ((-0.6, 0.18), (-0.2, 0.22)):
        add('rifle_stock', rod((x, yf + 0.5, 0.6), (x + 0.02, yf + 0.5 - 0.95 * math.sin(a), 0.6 + 0.95 * math.cos(a)), 0.035, 5), 'wood')
        add('rifle_barrel', rod((x + 0.02, yf + 0.5 - 0.9 * math.sin(a), 0.6 + 0.9 * math.cos(a)), (x + 0.03, yf + 0.5 - 1.25 * math.sin(a), 0.6 + 1.25 * math.cos(a)), 0.012, 5), 'steel')
    add('bayonet', rod((-0.17, yf + 0.5 - 1.25 * math.sin(0.22), 0.6 + 1.25 * math.cos(0.22)), (-0.16, yf + 0.5 - 1.6 * math.sin(0.22), 0.6 + 1.6 * math.cos(0.22)), 0.008, 4), 'tin')
    # ammunition boxes, telephone box, tins, helmets
    for k, (x, y, z, r) in enumerate([(-5.0, yf + 0.3, 0.57, 0.1), (-4.4, yf + 0.3, 0.57, -0.05), (-4.75, yf + 0.3, 0.83, 0.3)]):
        b = box(0.5, 0.28, 0.26, (x, y, z), bevel_w=0.015, rz=r); recess(b, (0, -1, 0), 0.04, 0.01); add('ammo_box', b, 'wood_dark' if k == 2 else 'wood')
    add('phone_box', box(0.25, 0.2, 0.3, (5.2, yb - 0.2, 0.0), bevel_w=0.02), 'wood_dark')
    add('phone_wire', rod((5.2, yb - 0.15, 0.3), (5.2, yb - 0.05, 2.0), 0.008, 3), 'wire')
    for (x, y, z) in [(0.9, yf + 0.2, 0.57), (0.75, yf + 0.35, 0.57), (-2.6, 0.9, 0.05)]: add('tin', cyl(0.045, 0.11, (x, y, z), seg=8), 'tin')
    def helmet(x, y, z, tilt=0.0):
        h = dome(0.16, (0, 0, 0.0), seg=12, rings=3, h=0.12); add('helmet', move(h, (x, y, z + 0.01)), 'khaki')
        add('helmet_brim', cyl(0.24, 0.015, (x, y, z), seg=14), 'khaki')
    helmet(-2.2, yf - 0.45, D + 0.51); helmet(5.0, yb - 0.3, 0.0)
    # brazier with coals
    add('brazier', cyl(0.2, 0.42, (-1.2, 0.85, 0.06), seg=10, r2=0.23), 'steel')
    for k in range(5): add('brazier_hole', box(0.06, 0.02, 0.06, (-1.2 + 0.18 * math.cos(k * 1.2), 0.85 + 0.18 * math.sin(k * 1.2), 0.25)), 'ember')
    for k in range(3): add('brazier_leg', rod((-1.2 + 0.15 * math.cos(k * 2.1), 0.85 + 0.15 * math.sin(k * 2.1), 0.06), (-1.2 + 0.24 * math.cos(k * 2.1), 0.85 + 0.24 * math.sin(k * 2.1), 0.0), 0.015, 4), 'steel')
    co = bmesh.new(); bmesh.ops.create_icosphere(co, subdivisions=1, radius=0.19); jitter(co, 0.03, 5); bmesh.ops.scale(co, vec=(1, 1, 0.4), verts=co.verts)
    add('coals', move(co, (-1.2, 0.85, 0.47)), 'ember')

    # small Christmas tree with candles on the parapet (truce)
    tx, ty, tz = 0.6, yf - 0.6, D + 0.34
    add('tree_trunk', cyl(0.03, 0.12, (tx, ty, tz), seg=6), 'wood_dark')
    for k, (r, h) in enumerate([(0.26, 0.28), (0.2, 0.25), (0.13, 0.22)]): add('tree_tier', cyl(r, h, (tx, ty, tz + 0.1 + k * 0.17), seg=8, r2=0.02), 'pine')
    for k in range(6):
        a = k * 1.05; r = 0.2 - 0.025 * k; z = tz + 0.18 + 0.07 * k
        add('candle', cyl(0.012, 0.06, (tx + r * math.cos(a), ty + r * math.sin(a), z), seg=5), 'candle')
        add('candle_flame', cyl(0.012, 0.03, (tx + r * math.cos(a), ty + r * math.sin(a), z + 0.06), seg=4, r2=0.0), 'flame')
    return out
