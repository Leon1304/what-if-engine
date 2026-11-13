# Pharaoh's burial: quartzite sarcophagus (3.0 × 1.75 × 1.45 m incl. plinth) as found in a royal tomb. The cracked granite lid has been
# slid back and rests askew on the rear rim, so from the front (and from above) the golden anthropoid coffin inside is visible: tapered
# body with feathered (rishi) bands, crossed arms holding crook and flail, nemes headdress with lapis stripes, gold face with inlaid eyes,
# beard, vulture-and-cobra brow. The stone box has a cavetto cornice, winged goddesses in relief on the corners, hieroglyph columns and a
# top band, chipped edges, cracks and dust. Around it: rubble, a wooden lever and wedge, a rope coil, an oil lamp and two canopic jars.
# Faces -y (+z in three.js), long axis along x (head of the coffin at +x).
# Materials (tint keys): stone, stone_dark, stone_light, glyph, lid, gold, gold_dark, lapis, white, black, wood, rope, clay, dust, void.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/sarcophagus.py
AO = {'strength': 0.65, 'dist': 0.8}

def rod(p1, p2, r, seg=6):
    """Cylinder between two points (arms, crook, lever)."""
    a, b = Vector(p1), Vector(p2); d = b - a
    bm = cyl(r, d.length, (0, 0, 0), seg=seg)
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=q.to_matrix(), verts=bm.verts)
    return move(bm, a)

def loft(prof, n=12, flat=0.55):
    """Body of revolution-ish along x: prof [(x, half_width, height, z_bottom), …]; elliptic sections, bottom flattened by `flat`."""
    bm = bmesh.new(); rings = []
    for x, hw, h, z0 in prof:
        zc = z0 + h / 2; ring = []
        for k in range(n):
            a = 2 * math.pi * k / n; s = math.sin(a)
            z = zc + (h / 2) * (s if s > 0 else s * flat)
            ring.append(bm.verts.new((x, hw * math.cos(a), z)))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for k in range(n): bm.faces.new((rings[i][k], rings[i][(k + 1) % n], rings[i + 1][(k + 1) % n], rings[i + 1][k]))
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return bm

def build(coll):
    R = random.Random(7)
    M = {k: mat(k, *v) for k, v in {
        'stone': ('#B5835A', 0.85), 'stone_dark': ('#8C6142', 0.9), 'stone_light': ('#CE9F74', 0.85), 'glyph': ('#5A3A26', 0.9),
        'lid': ('#9A5E48', 0.8), 'gold': ('#E2B23E', 0.35, 0.55), 'gold_dark': ('#A87C26', 0.45, 0.5), 'lapis': ('#21408F', 0.4),
        'white': ('#E8E2D2', 0.5), 'black': ('#15120F', 0.4), 'wood': ('#7A5634', 0.85), 'rope': ('#B49A6A', 0.95),
        'clay': ('#C9B79A', 0.8), 'dust': ('#A68B6A', 1.0), 'void': ('#1B140F', 1.0)}.items()}
    out = []
    def add(n, bm, m): out.append(mesh(n, bm, M[m], coll))
    L, W, H, T, P = 2.75, 1.5, 1.2, 0.17, 0.12        # box length, width, wall height, wall thickness, plinth
    z0 = P; zt = P + H

    # plinth and stone box (four walls + floor), chamfered
    add('plinth', box(L + 0.24, W + 0.24, P, bevel_w=0.03), 'stone_dark')
    add('floor', box(L - 2 * T, W - 2 * T, 0.2, (0, 0, z0), bevel_w=0.0), 'stone_dark')
    for s in (-1, 1):
        add('wall_long', box(L, T, H, (0, s * (W / 2 - T / 2), z0), bevel_w=0.025), 'stone')
        add('wall_short', box(T, W - 2 * T, H, (s * (L / 2 - T / 2), 0, z0), bevel_w=0.025), 'stone')
    # cavetto cornice: two stepped rims around the top
    for k, (dz, grow, hh) in enumerate([(-0.16, 0.04, 0.08), (-0.08, 0.08, 0.08)]):
        for s in (-1, 1):
            add('cornice', box(L + 2 * grow, T + grow, hh, (0, s * (W / 2 - T / 2 + grow / 2), zt + dz), bevel_w=0.015), 'stone_light')
            add('cornice', box(T + grow, W - 2 * T, hh, (s * (L / 2 - T / 2 + grow / 2), 0, zt + dz), bevel_w=0.015), 'stone_light')
    # torus moulding down the four corners
    for sx in (-1, 1):
        for sy in (-1, 1): add('corner_roll', cyl(0.045, H - 0.2, (sx * (L / 2 + 0.005), sy * (W / 2 + 0.005), z0 + 0.02), seg=8), 'stone_light')
    # base band
    for s in (-1, 1):
        add('base_band', box(L + 0.04, 0.03, 0.1, (0, s * (W / 2 + 0.01), z0)), 'stone_dark')
        add('base_band', box(0.03, W + 0.04, 0.1, (s * (L / 2 + 0.01), 0, z0)), 'stone_dark')

    # relief: winged goddesses at the corners of both long sides (outline extruded 3 cm), body column and sun disc
    def goddess(sx, sy):
        y = sy * (W / 2) + (-0.03 if sy < 0 else 0.0); x0 = sx * (L / 2 - 0.12)
        wing = [(0, 0.35), (0, 0.95), (-0.25, 1.0), (-0.55, 0.93), (-0.8, 0.8), (-0.62, 0.68), (-0.75, 0.6), (-0.5, 0.52), (-0.55, 0.42), (-0.25, 0.4)]
        pts = [(x0 + (-sx) * (-u), z0 + v) for u, v in wing]
        if (sx > 0) == (sy < 0): pts = list(reversed(pts))
        add('wing', prism(pts, 0.03, y), 'stone_light')
        for k in range(4):   # feather grooves
            add('feather', box(0.42 - 0.07 * k, 0.012, 0.012, (x0 - sx * (0.3 + 0.03 * k), y - 0.008 if sy < 0 else y + 0.028, z0 + 0.5 + 0.11 * k)), 'glyph')
        add('goddess', box(0.1, 0.035, 0.75, (x0 + sx * 0.03, sy * (W / 2 + 0.012), z0 + 0.12), bevel_w=0.01), 'stone_light')
        add('goddess_head', cyl(0.06, 0.035, (x0 + sx * 0.03, sy * (W / 2 + 0.03), z0 + 0.94), seg=8, axis='Y'), 'stone_light')
    for sx in (-1, 1):
        for sy in (-1, 1): goddess(sx, sy)
    # hieroglyphs: a band under the cornice on all sides and three columns on the front, small cut signs
    def glyphs(x0, x1, z, y, n, vertical=False, face=-1):
        for i in range(n):
            u = x0 + (x1 - x0) * (i + 0.5) / n
            gw, gh = R.uniform(0.04, 0.09), R.uniform(0.05, 0.1)
            if vertical: add('glyph', box(gw, 0.012, gh, (y, face * (W / 2 + 0.004), u)), 'glyph')
            else: add('glyph', box(gw, 0.012, gh, (u, y, z)), 'glyph')
    for s in (-1, 1): glyphs(-L / 2 + 0.95, L / 2 - 0.95, zt - 0.32, s * (W / 2 + 0.004), 9)
    for xc in (-0.35, 0.0, 0.35):
        glyphs(z0 + 0.2, z0 + 0.82, 0, xc, 6, vertical=True)
        for s in (-1, 1): add('glyph_line', box(0.012, 0.012, 0.72, (xc + s * 0.09, -(W / 2 + 0.006), z0 + 0.15)), 'glyph')
    for s in (-1, 1):   # ends: eye panel and two glyph columns
        add('end_panel', box(0.012, 0.6, 0.45, (s * (L / 2 + 0.006), 0, z0 + 0.35)), 'stone_light')
        for yy in (-0.15, 0.15): add('eye', box(0.014, 0.16, 0.05, (s * (L / 2 + 0.01), yy, z0 + 0.6)), 'glyph')
    # damage: chips at corners (dark notches), cracks, dust in the joints
    for (x, y, z, sx_, sz_) in [(-L / 2 + 0.06, -W / 2 - 0.004, zt - 0.1, 0.16, 0.12), (L / 2 - 0.25, -W / 2 - 0.004, z0 + 0.05, 0.22, 0.08), (0.8, -W / 2 - 0.004, zt - 0.05, 0.12, 0.07)]:
        add('chip', box(sx_, 0.014, sz_, (x, y, z)), 'stone_dark')
    for (x, z, h, a) in [(-0.9, z0 + 0.1, 0.55, 0.25), (0.62, z0 + 0.4, 0.45, -0.3), (1.05, z0 + 0.05, 0.3, 0.15)]:
        c = box(0.012, 0.01, h, (0, 0, 0)); bmesh.ops.rotate(c, cent=(0, 0, 0), matrix=Matrix.Rotation(a, 3, 'Y'), verts=c.verts)
        add('crack', move(c, (x, -(W / 2 + 0.008), z)), 'void')
    for s in (-1, 1): add('dust_edge', box(L + 0.3, 0.12, 0.012, (0, s * (W / 2 + 0.17), 0)), 'dust')

    # golden anthropoid coffin inside, head at +x
    cz = z0 + 0.2
    prof = [(-1.1, 0.15, 0.28, cz), (-1.02, 0.22, 0.36, cz), (-0.88, 0.2, 0.33, cz), (-0.5, 0.23, 0.37, cz), (-0.05, 0.28, 0.42, cz),
            (0.35, 0.33, 0.47, cz), (0.6, 0.34, 0.48, cz), (0.72, 0.3, 0.45, cz), (0.8, 0.25, 0.44, cz), (0.9, 0.3, 0.5, cz),
            (1.02, 0.29, 0.47, cz), (1.1, 0.2, 0.36, cz)]
    add('coffin', loft(prof, 14), 'gold')
    add('coffin_rim', loft([(x, hw + 0.012, 0.05, cz + h * 0.22) for x, hw, h, _ in prof[1:-1]], 14), 'gold_dark')
    top = lambda x, hw_f=0.0: cz + next(h for xx, _, h, _ in prof if xx >= x) * 0.98
    def sec(x):   # interpolated section (half width, height) of the coffin at x
        for (xa, wa, ha, _), (xb, wb, hb, _) in zip(prof, prof[1:]):
            if xa <= x <= xb: f = (x - xa) / (xb - xa); return wa + (wb - wa) * f, ha + (hb - ha) * f
        return prof[-1][1], prof[-1][2]
    def band(x, w, grow=0.012):   # ring hugging the coffin surface between x - w/2 and x + w/2
        return loft([(xx, sec(xx)[0] + grow, sec(xx)[1] + 2 * grow, cz - grow * 0.6) for xx in (x - w / 2, x + w / 2)], 14)
    # rishi feather bands across the legs and body
    for i, x in enumerate([-0.85, -0.7, -0.55, -0.4, -0.25, -0.1, 0.05, 0.2]):
        add('feathers', band(x, 0.045), 'lapis' if i % 2 else 'gold_dark')
    add('foot_band', band(-0.98, 0.05), 'lapis')
    # crossed arms with crook and flail
    za = top(0.45) + 0.01
    for s in (-1, 1):
        add('arm', rod((0.66, s * 0.28, za - 0.03), (0.38, -s * 0.06, za + 0.015), 0.045, 7), 'gold')
        add('hand', box(0.08, 0.07, 0.05, (0.37, -s * 0.07, za - 0.01), bevel_w=0.015), 'gold')
        add('bracelet', torus(0.05, 0.012, (0.47, s * 0.04, za + 0.01), seg=10, seg2=4, axis='X'), 'lapis')
    add('crook', rod((0.18, 0.12, za + 0.03), (0.62, -0.1, za + 0.05), 0.016), 'lapis')
    add('crook_hook', torus(0.05, 0.016, (0.66, -0.12, za + 0.07), seg=8, seg2=4, axis='Z'), 'gold')
    add('flail', rod((0.18, -0.12, za + 0.03), (0.6, 0.1, za + 0.05), 0.016), 'gold_dark')
    for k in range(3): add('flail_bead', rod((0.6, 0.1 + 0.03 * k, za + 0.05), (0.66, 0.16 + 0.03 * k, za - 0.02), 0.012, 4), 'lapis')
    add('collar', box(0.14, 0.5, 0.025, (0.72, 0, top(0.72) - 0.005), bevel_w=0.01), 'lapis')
    for k in range(3): add('collar_row', box(0.025, 0.52, 0.03, (0.67 - 0.04 * k, 0, top(0.7) - 0.02 - 0.01 * k)), 'gold' if k % 2 else 'white')
    # head: nemes stripes, face, eyes, beard, brow with vulture and cobra
    zh = top(0.95)
    for k in range(6): add('nemes', band(0.835 + 0.04 * k, 0.018, 0.01), 'lapis')
    for s in (-1, 1):
        for k in range(4): add('lappet', box(0.16, 0.02, 0.025, (0.73, s * 0.3, zh - 0.12 - 0.06 * k)), 'lapis')
    add('face', box(0.2, 0.26, 0.05, (0.92, 0, zh - 0.005), bevel_w=0.02), 'gold')
    for s in (-1, 1):
        add('eye_white', box(0.032, 0.085, 0.012, (0.96, s * 0.065, zh + 0.04)), 'white')
        add('eye_pupil', box(0.03, 0.032, 0.016, (0.96, s * 0.065, zh + 0.042)), 'black')
        add('eye_line', box(0.012, 0.11, 0.015, (0.985, s * 0.075, zh + 0.04)), 'black')
    add('nose', box(0.06, 0.035, 0.03, (0.915, 0, zh + 0.04), bevel_w=0.01), 'gold')
    add('beard', rod((0.82, 0, zh + 0.0), (0.7, 0, zh + 0.06), 0.03, 6), 'lapis')
    add('brow_band', box(0.03, 0.26, 0.04, (1.03, 0, zh + 0.0)), 'gold_dark')
    add('vulture', box(0.05, 0.05, 0.05, (1.05, -0.04, zh + 0.03), bevel_w=0.01), 'gold')
    add('cobra', rod((1.05, 0.04, zh + 0.03), (1.07, 0.04, zh + 0.12), 0.02, 6), 'gold')
    add('cobra_hood', box(0.02, 0.06, 0.05, (1.075, 0.04, zh + 0.1), bevel_w=0.008), 'lapis')

    # cracked lid, slid back and turned: rests on the back wall, front part of the coffin is open
    # (built flat around its centre, then stood up: lower edge on the floor behind, upper edge on the rear cornice)
    LW, LT = W + 0.1, 0.26; yb = W / 2 + 0.95; ang = math.atan2(zt + 0.02, yb - W / 2 - 0.1)
    rot = Matrix.Rotation(math.pi - ang, 3, 'X'); n = rot @ Vector((0, 0, 1))
    ctr = Vector((0.1, (yb + W / 2 + 0.1) / 2, (zt + 0.02) / 2)) - n * (LT / 2 + 0.01)
    def lid_part(bm):
        bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=rot, verts=bm.verts); return move(rotz(bm, 0.04), ctr)
    lid_bm = box(L + 0.12, LW, LT, (0, 0, -LT / 2), bevel_w=0.035); recess(lid_bm, (0, 0, 1), 0.14, -0.04)
    add('lid', lid_part(lid_bm), 'lid')
    c = box(0.02, LW * 0.95, 0.012, (0, 0, LT / 2 + 0.04)); rotz(c, 0.35); add('lid_crack', lid_part(move(c, (0.5, 0, 0))), 'void')
    add('lid_crack', lid_part(box(0.016, 0.02, LT + 0.02, (0.62, -LW / 2 + 0.005, -LT / 2 - 0.01))), 'void')
    for k in range(6):   # glyphs on the lid's raised panel (faces the coffin side now: seen from above and behind)
        add('lid_glyph', lid_part(box(0.08, 0.05, 0.012, (-0.9 + 0.36 * k, 0.08 * (k % 2) - 0.04, LT / 2 + 0.04))), 'glyph')
    add('lid_chip', lid_part(box(0.3, 0.2, 0.02, (-1.2, LW / 2 - 0.1, -LT / 2 - 0.012))), 'stone_dark')

    # props around: wooden lever and wedge, rope coil, rubble, oil lamp, canopic jars, dust patches
    add('lever', rod((-1.75, -1.25, 0.03), (-1.1, -0.82, zt + 0.06), 0.045, 6), 'wood')
    add('wedge', prism([(-0.15, 0), (0.15, 0), (-0.15, 0.1)], 0.16, 0.85), 'wood')
    add('rope', torus(0.22, 0.03, (1.85, -0.9, 0.03), seg=12, seg2=5, axis='Z'), 'rope')
    add('rope', torus(0.17, 0.03, (1.85, -0.9, 0.08), seg=12, seg2=5, axis='Z'), 'rope')
    add('rope_end', rod((1.95, -1.05, 0.03), (2.3, -1.3, 0.02), 0.025, 5), 'rope')
    for i in range(10):
        a = R.uniform(0, 2 * math.pi); d = R.uniform(1.75, 2.3); s = R.uniform(0.05, 0.16)
        rb = bmesh.new(); bmesh.ops.create_icosphere(rb, subdivisions=1, radius=s); jitter(rb, s * 0.3, i)
        bmesh.ops.scale(rb, vec=(1, 1, 0.6), verts=rb.verts)
        add('rubble', move(rb, (math.cos(a) * d * 0.95, math.sin(a) * d * 0.55 - 0.1, s * 0.3)), 'stone' if i % 3 else 'stone_dark')
    add('lamp', cyl(0.09, 0.05, (-1.5, -1.05, 0), seg=10, r2=0.06), 'clay')
    add('lamp_spout', rod((-1.43, -1.05, 0.04), (-1.33, -1.05, 0.05), 0.02, 5), 'clay')
    add('lamp_wick', cyl(0.012, 0.03, (-1.33, -1.05, 0.05), seg=4), 'black')
    for k, (x, y) in enumerate([(-1.9, 0.6), (-1.85, 0.15)]):
        add('jar', cyl(0.11, 0.28, (x, y, 0), seg=10, r2=0.13), 'clay')
        add('jar_neck', cyl(0.13, 0.04, (x, y, 0.28), seg=10, r2=0.09), 'clay')
        add('jar_lid', dome(0.1, (x, y, 0.32), seg=10, rings=3, h=0.13), 'stone_light')
        add('jar_band', cyl(0.122, 0.03, (x, y, 0.16), seg=10), 'lapis')
    for (x, y, sx, sy) in [(-1.6, -0.9, 0.7, 0.5), (1.4, 0.95, 0.8, 0.4), (0.3, -1.15, 1.0, 0.3)]:
        add('dust', box(sx, sy, 0.008, (x, y, 0)), 'dust')
    return out
