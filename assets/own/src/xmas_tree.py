# Decorated Christmas tree (2.45 m incl. star, 1.5 m across) with presents: Nordmann fir from nine jagged, drooping branch tiers
# (two greens, snow-free), trunk in a red cast-iron stand with feet and a water bowl, a tree skirt with white border, baubles in red,
# gold, silver and blue with caps, a warm string of lights wound around the tree, gold tinsel garland, candy canes, a glowing star on top,
# and under the tree ten wrapped presents (boxes, a tall one, a flat one, a cylinder) with ribbons and bows, a fallen bauble and needles.
# Faces -y (+z in three.js; the front of the gift pile). Materials (tint keys): needle, needle_dark, bark, stand, stand_dark, skirt,
# skirt_trim, red, gold, silver, blue, cap, light (glows), star (glows), tinsel, cane, cane_stripe, gift_red, gift_green, gift_blue,
# gift_white, gift_gold, ribbon, ribbon_red, ribbon_gold.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/xmas_tree.py
AO = {'strength': 0.6, 'dist': 0.5}

def rod(p1, p2, r, seg=6):
    a, b = Vector(p1), Vector(p2); d = b - a
    bm = cyl(r, d.length, (0, 0, 0), seg=seg)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix(), verts=bm.verts)
    return move(bm, a)

def build(coll):
    R = random.Random(2412)
    M = {k: mat(k, *v) for k, v in {
        'needle': ('#2F6B3F', 0.9), 'needle_dark': ('#1F4C2E', 0.9), 'bark': ('#5A3E2A', 0.95), 'stand': ('#A0222A', 0.5, 0.4),
        'stand_dark': ('#3A3A3E', 0.5, 0.6), 'skirt': ('#9E1E26', 0.9), 'skirt_trim': ('#F2EEE6', 0.95), 'red': ('#D0242E', 0.25, 0.3),
        'gold': ('#E2B44A', 0.25, 0.7), 'silver': ('#C9CED6', 0.2, 0.8), 'blue': ('#2E5CB8', 0.25, 0.3), 'cap': ('#B89A50', 0.3, 0.8),
        'light': ('#FFE3A0', 0.3, 0.0, '#FFD480'), 'star': ('#FFE07A', 0.3, 0.3, '#FFD050'), 'tinsel': ('#E6C25A', 0.3, 0.8),
        'cane': ('#F4F1EA', 0.5), 'cane_stripe': ('#D3222C', 0.5), 'gift_red': ('#C3313A', 0.6), 'gift_green': ('#2E7D4E', 0.6),
        'gift_blue': ('#3561AE', 0.6), 'gift_white': ('#EDEAE2', 0.6), 'gift_gold': ('#D9B154', 0.4, 0.4), 'ribbon': ('#F3EBD3', 0.5),
        'ribbon_red': ('#D8262E', 0.5), 'ribbon_gold': ('#E3BC55', 0.35, 0.5)}.items()}
    out = []
    def add(n, bm, m): out.append(mesh(n, bm, M[m], coll))
    # stand, skirt, trunk
    add('skirt', cyl(0.75, 0.02, (0, 0, 0), seg=24), 'skirt')
    add('skirt_trim', torus(0.75, 0.035, (0, 0, 0.02), seg=24, seg2=4, axis='Z'), 'skirt_trim')
    add('stand_bowl', cyl(0.2, 0.18, (0, 0, 0.06), seg=14, r2=0.24), 'stand')
    add('stand_rim', torus(0.24, 0.02, (0, 0, 0.24), seg=14, seg2=4, axis='Z'), 'stand_dark')
    for k in range(4):
        a = k * math.pi / 2 + 0.4
        add('stand_foot', rod((0.18 * math.cos(a), 0.18 * math.sin(a), 0.12), (0.36 * math.cos(a), 0.36 * math.sin(a), 0.02), 0.03, 6), 'stand_dark')
        add('stand_screw', rod((0.23 * math.cos(a), 0.23 * math.sin(a), 0.22), (0.1 * math.cos(a), 0.1 * math.sin(a), 0.22), 0.012, 5), 'stand_dark')
    add('trunk', cyl(0.06, 0.55, (0, 0, 0.1), seg=8, r2=0.05), 'bark')
    # branch tiers: jagged drooping cones, alternating greens, each tier rotated
    tiers = [(0.72, 0.42, 0.42), (0.66, 0.62, 0.42), (0.6, 0.8, 0.4), (0.53, 0.98, 0.38), (0.46, 1.16, 0.36), (0.39, 1.33, 0.34),
             (0.31, 1.5, 0.32), (0.23, 1.66, 0.3), (0.15, 1.81, 0.3)]
    for i, (r, z, h) in enumerate(tiers):
        bm = cyl(r, h, (0, 0, 0), seg=18, r2=0.0)
        bm.verts.ensure_lookup_table()
        for v in bm.verts:
            if v.co.z < h * 0.5:
                ang = math.atan2(v.co.y, v.co.x); k = round(ang / (2 * math.pi / 18))
                if k % 2: v.co.x *= 0.72; v.co.y *= 0.72; v.co.z += 0.06
                else: v.co.z -= 0.05
        jitter(bm, 0.02, i); rotz(bm, i * 0.37)
        add('tier', move(bm, (0, 0, z)), 'needle' if i % 2 else 'needle_dark')
    add('tip', cyl(0.05, 0.3, (0, 0, 2.0), seg=6, r2=0.0), 'needle')
    # star on top (flat 5-point star, extruded) with a short stem
    pts = []
    for k in range(10):
        a = math.pi / 2 + k * math.pi / 5; rr = 0.14 if k % 2 == 0 else 0.06
        pts.append((rr * math.cos(a), 2.3 + rr * math.sin(a)))
    add('star', prism(pts, 0.04, -0.02), 'star')
    add('star_stem', cyl(0.015, 0.12, (0, 0, 2.14), seg=6), 'gold')
    def surf(z):   # radius of the tree hull at height z (for decorations)
        for (r0, z0, h0), (r1, z1, h1) in zip(tiers, tiers[1:]):
            if z0 <= z < z1: return r0 + (r1 - r0) * (z - z0) / (z1 - z0)
        return 0.72 if z < tiers[0][1] else 0.1
    # string of lights: spiral of small glowing bulbs, with a dark wire between them
    prev = None
    for k in range(70):
        t = k / 69; z = 0.45 + t * 1.5; a = t * 2 * math.pi * 6.5; r = surf(z) * 0.86 + 0.02
        p = (r * math.cos(a), r * math.sin(a), z - 0.02)
        add('bulb', cyl(0.012, 0.03, p, seg=5), 'light')
        if prev: add('wire', rod(prev, p, 0.004, 3), 'needle_dark')
        prev = p
    # tinsel garland: a second spiral, opposite direction, slightly lower
    prev = None
    for k in range(48):
        t = k / 47; z = 0.5 + t * 1.3; a = -t * 2 * math.pi * 4 + 1.0; r = surf(z) * 0.8 + 0.04
        p = (r * math.cos(a), r * math.sin(a), z - 0.06 - 0.03 * math.sin(k * 1.3))
        if prev: add('tinsel', rod(prev, p, 0.011, 5), 'tinsel')
        prev = p
    # baubles with caps and hooks
    cols = ['red', 'gold', 'silver', 'blue', 'red', 'gold']
    for k in range(34):
        z = R.uniform(0.5, 1.75); a = R.uniform(0, 2 * math.pi); r = surf(z) * 0.97; s = R.uniform(0.035, 0.055)
        b = bmesh.new(); bmesh.ops.create_icosphere(b, subdivisions=1, radius=s)
        add('bauble', move(b, (r * math.cos(a), r * math.sin(a), z - s - 0.04)), cols[k % len(cols)])
        add('bauble_cap', cyl(s * 0.35, s * 0.35, (r * math.cos(a), r * math.sin(a), z - 0.045), seg=6), 'cap')
    # candy canes hanging on the outer tiers
    for k in range(6):
        z = 0.6 + k * 0.2; a = k * 1.9 + 0.3; r = surf(z) * 0.9
        x, y = r * math.cos(a), r * math.sin(a)
        add('cane', rod((x, y, z - 0.2), (x, y, z), 0.012, 5), 'cane')
        add('cane_hook', torus(0.03, 0.012, (x + 0.03 * math.cos(a + 1.57), y + 0.03 * math.sin(a + 1.57), z), seg=8, seg2=4, axis='X'), 'cane')
        for j in range(3): add('cane_stripe', cyl(0.0135, 0.015, (x, y, z - 0.17 + j * 0.06), seg=5), 'cane_stripe')
    # presents under the tree
    gifts = [((0.42, 0.32, 0.26), (0.35, -0.55, 0.02), 0.25, 'gift_red', 'ribbon_gold'), ((0.3, 0.3, 0.3), (-0.2, -0.65, 0.02), -0.2, 'gift_green', 'ribbon_red'),
             ((0.55, 0.4, 0.12), (-0.55, -0.3, 0.02), 0.5, 'gift_blue', 'ribbon'), ((0.22, 0.22, 0.5), (0.68, -0.15, 0.02), 0.1, 'gift_white', 'ribbon_red'),
             ((0.26, 0.2, 0.18), (0.08, -0.85, 0.02), 0.6, 'gift_gold', 'ribbon_red'), ((0.32, 0.26, 0.2), (-0.62, 0.25, 0.02), -0.3, 'gift_red', 'ribbon'),
             ((0.24, 0.24, 0.16), (0.45, 0.45, 0.02), 0.2, 'gift_green', 'ribbon_gold'), ((0.2, 0.16, 0.12), (-0.4, -0.55, 0.14), 0.9, 'gift_white', 'ribbon_gold'),
             ((0.35, 0.28, 0.2), (0.2, 0.62, 0.02), -0.5, 'gift_blue', 'ribbon_red')]
    for (sx, sy, sz), (x, y, z), rz, mc, mr in gifts:
        g = box(sx, sy, sz, (x, y, z), bevel_w=0.008, rz=rz); add('gift', g, mc)
        add('ribbon', box(sx + 0.008, 0.035, sz + 0.008, (x, y, z - 0.004), rz=rz), mr)
        add('ribbon', box(0.035, sy + 0.008, sz + 0.008, (x, y, z - 0.004), rz=rz), mr)
        for s in (-1, 1):
            bw = torus(0.04, 0.012, (0, 0, 0), seg=8, seg2=3, axis='X'); bmesh.ops.rotate(bw, cent=(0, 0, 0), matrix=Matrix.Rotation(s * 0.55, 3, 'Y'), verts=bw.verts)
            add('bow', move(rotz(bw, rz), (x + s * 0.035 * math.cos(rz), y + s * 0.035 * math.sin(rz), z + sz + 0.025)), mr)
    # round gift box (cylinder with lid)
    add('gift_round', cyl(0.13, 0.2, (-0.15, 0.55, 0.02), seg=14), 'gift_gold')
    add('gift_round_lid', cyl(0.14, 0.05, (-0.15, 0.55, 0.2), seg=14), 'gift_red')
    add('gift_round_band', cyl(0.132, 0.03, (-0.15, 0.55, 0.1), seg=14), 'ribbon_red')
    # fallen bauble and needles on the skirt
    b = bmesh.new(); bmesh.ops.create_icosphere(b, subdivisions=1, radius=0.045); add('fallen_bauble', move(b, (0.62, -0.55, 0.065)), 'blue')
    add('fallen_cap', cyl(0.016, 0.016, (0.66, -0.56, 0.06), seg=6, axis='X'), 'cap')
    for k in range(18):
        a = R.uniform(0, 2 * math.pi); r = R.uniform(0.3, 0.7)
        add('needle_fall', box(0.03, 0.004, 0.004, (r * math.cos(a), r * math.sin(a), 0.022), rz=R.uniform(0, 3)), 'needle_dark')
    return out
