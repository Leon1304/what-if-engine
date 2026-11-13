# Cyberpunk apartment tower, 14 × 12 m, about 35 m with roof gear, front -y (three.js +z): concrete panel facade with seams, grime
# streaks and rust stains, ground-floor shop with a half-open roller shutter (movable part) and a glowing interior, entrance with a
# steel door, eight upper floors of framed windows (warm lit, blue screen-lit or dark, a few broken and boarded), AC boxes with drip
# stains, two caged balconies with clutter, a vertical neon blade sign of stacked glyphs on the corner, a large billboard screen with
# a frame and service catwalk, horizontal neon bands, pipes and drooping cables, side windows, a back fire escape, a roof with parapet,
# water tank on legs, dish, antenna mast with a red beacon, rooftop neon glyphs, vents, and graffiti at street level.
# Parts: shutter (roller shutter, y > 0 rolls it up), balcony_1, balcony_2, billboard (own nodes: separate obstacles high up, can fall off). Marks: door (in front of the entrance, facing in), shop (in front of the shutter,
# facing in), roof (centre of the roof), billboard (centre of the screen, facing out: for a projected video or tinted screen),
# light_shop, light_sign, light_beacon, cam_street (low, looking up the facade). Walk surface: roof deck.
# Materials: concrete, concrete_dark, panel_seam, window_warm, window_blue, window_dark, billboard, shop_light, door + _cyber.py.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/cp_tower.py
use('_cyber.py')
AO = {'strength': 0.55, 'dist': 1.2}

def build(coll):
    M = cyber_mats(); N = neon_mats(); out = []; R = random.Random(21)
    seam = mat('panel_seam', '#2C2F33', 0.95)
    warm = mat('window_warm', '#FFC98A', 0.3, emit='#FFB060', ei=1.0); blue = mat('window_blue', '#7FB4FF', 0.3, emit='#4C86FF', ei=0.85)
    dark = mat('window_dark', '#11161C', 0.1, 0.4); board = mat('board', '#6E5A40', 0.9)
    bill = mat('billboard', '#FF3FA4', 0.3, emit='#E0207F', ei=2.0); shop = mat('shop_light', '#CFF6FF', 0.4, emit='#9EEBFF', ei=1.8)
    add = lambda n, bm, m: (out.append(mesh(n, bm, m, coll)), out[-1])[1]
    W, D, FH, NF, G = 14.0, 12.0, 3.2, 8, 4.4          # width, depth, floor height, upper floors, ground floor height
    H = G + NF * FH; yf = -D / 2
    # core: ground floor slightly set back, upper block, cornice
    sd = 1.25   # shop depth: the ground floor is open from x -6.2 to -0.2 for that depth
    add('core', merge([box(W, D, H - G, (0, 0, G)), box(W, D - sd, G, (0, sd / 2, 0)),
                       box(0.8, sd, G, (-6.6, yf + sd / 2, 0)), box(W / 2 + 0.2, sd, G, ((W / 2 - 0.2) / 2, yf + sd / 2, 0))]), M['concrete'])
    add('plinth', box(W + 0.1, D + 0.1, 0.5, (0, 0, 0), bevel_w=0.02), M['concrete_d'])
    add('slab_ground', box(W + 0.3, D + 0.3, 0.3, (0, 0, G - 0.3), bevel_w=0.03), M['concrete_d'])
    add('cornice', box(W + 0.4, D + 0.4, 0.4, (0, 0, H), bevel_w=0.04), M['concrete_d'])
    # panel seams (front and sides) and grime streaks
    sm = []
    for f in range(NF + 1): z = G + f * FH; sm += [box(W + 0.02, 0.02, 0.05, (0, yf - 0.005, z)), box(0.02, D + 0.02, 0.05, (-W / 2 - 0.005, 0, z)), box(0.02, D + 0.02, 0.05, (W / 2 + 0.005, 0, z))]
    for k in range(1, 4): sm.append(box(0.05, 0.02, H - G, (-W / 2 + k * W / 4, yf - 0.005, G)))
    add('seams', merge(sm), seam)
    gr = []
    for k in range(26):
        x = R.uniform(-W / 2 + 0.3, W / 2 - 0.3); z = G + R.randrange(NF) * FH + 0.6; gr.append(box(R.uniform(0.08, 0.3), 0.01, R.uniform(0.8, 2.2), (x, yf - 0.006, z - 1.4)))
    add('grime', merge(gr), M['grime'])
    add('rust_stains', merge([box(R.uniform(0.05, 0.15), 0.01, R.uniform(0.6, 1.5), (R.uniform(-6, 6), yf - 0.008, G + R.uniform(0, NF * FH - 2))) for _ in range(8)]), M['rust'])
    # windows: front 5 per floor, sides 4 per floor
    lit = {'w': [], 'b': [], 'd': [], 'f': [], 'board': []}
    def window(x, z, face, w=1.5, h=1.6):
        k = R.random(); kind = 'w' if k < 0.38 else 'b' if k < 0.6 else 'board' if k < 0.64 else 'd'
        def P(u, y, zz, sx, sy, sz):      # place a box on a facade: face 'f' = front, 'l' / 'r' = sides (u along the facade)
            if face == 'f': return box(sx, sy, sz, (u, yf - y, zz))
            s = -1 if face == 'l' else 1; return box(sy, sx, sz, (s * (W / 2 + y), u, zz))
        lit[kind if kind != 'board' else 'd'].append(P(x, 0.04, z, w, 0.02, h))          # pane in front of its frame plate
        if kind == 'board': lit['board'] += [P(x, 0.06, z + 0.2 + i * 0.45, w + 0.1, 0.03, 0.3) for i in range(3)]
        lit['f'] += [P(x, 0.015, z - 0.08, w + 0.18, 0.03, h + 0.16), P(x, 0.07, z - 0.1, w + 0.26, 0.14, 0.07)]   # frame plate, sill
    for f in range(NF):
        z = G + f * FH + 0.8
        for i in range(5): window(-W / 2 + 1.4 + i * 2.8, z, 'f')
        for s in ('l', 'r'):
            for i in range(4): window(-D / 2 + 1.5 + i * 3.0, z, s, w=1.3)
    add('windows_warm', merge(lit['w']), warm); add('windows_blue', merge(lit['b']), blue); add('windows_dark', merge(lit['d']), dark)
    add('window_frames', merge(lit['f']), M['metal_d']); add('boards', merge(lit['board']), board)
    # AC boxes with drip stains
    acb, acf = [], []
    for k in range(14):
        f = R.randrange(NF); x = -W / 2 + 1.4 + R.randrange(5) * 2.8 + R.choice((-1, 1)) * 1.15
        if abs(x) > W / 2 - 0.6: continue
        b, fan = ac_box((x, yf - 0.16, G + f * FH + 0.2), 0, 0.7, 0.5, 0.3); acb.append(b); acf.append(fan)
        gr.append(box(0.05, 0.01, 1.2, (x + 0.2, yf - 0.007, G + f * FH - 1.0)))
    add('ac_units', merge(acb), M['metal']); add('ac_fans', merge(acf), M['void'])
    add('ac_drips', merge([box(0.05, 0.01, 1.0, (R.uniform(-6, 6), yf - 0.007, G + R.randrange(NF) * FH - 0.8)) for _ in range(6)]), M['grime'])
    # caged balconies
    for k, (x, f) in enumerate(((-4.2, 2), (4.2, 5))):
        z = G + f * FH; y0 = yf - 1.0; b0 = len(out)
        add(f'balcony_slab{k}', box(2.6, 1.0, 0.15, (x, yf - 0.5, z), bevel_w=0.02), M['concrete_d'])
        cage = [rod((x + dx, y0, z + 0.15), (x + dx, y0, z + 2.6), 0.015, 4) for dx in [-1.25 + i * 0.25 for i in range(11)]]
        cage += [rod((x - 1.3, y0, z + h), (x + 1.3, y0, z + h), 0.02, 4) for h in (1.0, 2.6)]
        cage += [rod((x + s * 1.3, y0, z + h), (x + s * 1.3, yf, z + h), 0.02, 4) for s in (-1, 1) for h in (1.0, 2.6)]
        add(f'balcony_cage{k}', merge(cage), M['steel'])
        add(f'balcony_clutter{k}', merge([box(0.5, 0.4, 0.5, (x - 0.8, yf - 0.4, z + 0.15), bevel_w=0.01), cyl(0.2, 0.6, (x + 0.7, yf - 0.4, z + 0.15), seg=8)]), M['sticker_y'] if k else M['paint_tag'])
        add(f'balcony_plant{k}', jitter(dome(0.35, (x, yf - 0.45, z + 0.15), seg=8, rings=3), 0.06, k), mat('leaf', '#3F6E3A', 0.9))
        line = sag((x - 1.2, yf - 0.6, z + 2.2), (x + 1.2, yf - 0.6, z + 2.2), 0.2, 6)
        add(f'laundry_line{k}', tube(line, 0.005, 3), M['cable'])
        add(f'laundry{k}', merge([box(0.35, 0.02, 0.5, (p.x, p.y, p.z - 0.5)) for p in line[1:-1:2]]), [M['sticker_w'], M['sticker_r']][k])
        part(out[b0:], f'balcony_{k + 1}', pivot=(x, yf, z))
    # ground floor: shop with roller shutter (part), entrance, graffiti
    add('shop_back', box(6.0, 0.05, 3.2, (-3.2, yf + 1.2, 0.5)), shop)
    add('shop_void', box(6.0, 1.2, 0.01, (-3.2, yf + 0.6, 0.5)), M['concrete_d'])
    add('shop_hole_l', box(0.01, 1.2, 3.2, (-6.2, yf + 0.6, 0.5)), M['metal_d'])
    add('shop_hole_r', box(0.01, 1.2, 3.2, (-0.2, yf + 0.6, 0.5)), M['metal_d'])
    add('shop_shelves', merge([box(5.6, 0.4, 0.04, (-3.2, yf + 1.0, 0.9 + i * 0.7)) for i in range(4)]), M['metal'])
    add('shop_goods', merge([box(0.25, 0.25, R.uniform(0.15, 0.4), (-5.8 + i * 0.4, yf + 1.0, 0.94 + (i % 4) * 0.7)) for i in range(14)]), M['sticker_y'])
    add('shop_hood', box(6.4, 0.25, 0.5, (-3.2, yf - 0.1, 3.7), bevel_w=0.02), M['metal_d'])
    add('shop_hood_neon', rod((-6.3, yf - 0.24, 3.8), (-0.1, yf - 0.24, 3.8), 0.02, 5), N['cyan'])
    sh = [box(6.0, 0.04, 0.09, (-3.2, yf + 0.05, 2.0 + i * 0.1)) for i in range(17)]
    sh.append(box(6.05, 0.08, 0.1, (-3.2, yf + 0.05, 1.95)))
    shutter = add('shutter', merge(sh), M['steel'])
    add('shutter_box', box(6.2, 0.4, 0.35, (-3.2, yf - 0.05, 3.7 - 0.35)), M['metal_d'])
    add('shutter_rails', merge([box(0.08, 0.08, 3.2, (x, yf + 0.0, 0.5)) for x in (-6.25, -0.15)]), M['metal_d'])
    part([shutter], 'shutter', pivot=(-3.2, yf + 0.05, 1.95))
    add('door_frame', box(1.6, 0.4, 2.7, (2.6, yf + 0.05, 0.5), bevel_w=0.02), M['metal_d'])
    add('door', recess(box(1.2, 0.05, 2.3, (2.6, yf - 0.16, 0.5)), (0, -1, 0), 0.08, 0.02), mat('door', '#3D4A55', 0.5, 0.5))
    add('door_handle', box(0.04, 0.06, 0.3, (3.0, yf - 0.2, 1.4)), M['steel'])
    add('door_light', box(0.6, 0.15, 0.06, (2.6, yf - 0.1, 3.25)), N['lamp'])
    add('door_keypad', box(0.15, 0.04, 0.22, (3.55, yf - 0.03, 1.4)), N['screen'])
    add('intercom_plate', box(0.25, 0.03, 0.5, (1.75, yf - 0.02, 1.2)), M['steel'])
    add('graffiti_a', tube([(4.2, yf - 0.01, 0.9), (4.6, yf - 0.01, 2.2), (5.0, yf - 0.01, 1.0), (5.4, yf - 0.01, 2.1), (5.9, yf - 0.01, 1.2), (6.4, yf - 0.01, 2.0)], 0.04, 4), M['paint_tag'])
    add('graffiti_b', tube([(4.4, yf - 0.012, 2.6), (5.2, yf - 0.012, 2.9), (6.2, yf - 0.012, 2.55)], 0.05, 4), N['pink'])
    for k, st in enumerate(sticker_set(31, 14, (0.3, 6.6, 0.6, 2.4), yf - 0.01)):
        if st: add(f'posters{k}', st, [M['sticker_y'], M['sticker_w'], M['sticker_r']][k])
    # vertical blade sign on the right front corner
    bx, bz = W / 2 + 0.45, G + 0.5
    add('blade', box(0.25, 1.1, 14.0, (bx, yf + 0.8, bz), bevel_w=0.03), M['metal_d'])
    add('blade_arms', merge([box(0.5, 0.15, 0.15, (W / 2 + 0.2, yf + 0.8, bz + h)) for h in (0.6, 7.0, 13.2)]), M['metal'])
    gl = []
    for i in range(7):
        g = glyph(0, bz + 0.6 + i * 1.9, 0, 0.7, 1.4, 60 + i, r=0.035); rotz(g, -math.pi / 2); move(g, (bx + 0.13, yf + 0.8, 0)); gl.append(g)
        g = glyph(0, bz + 0.6 + i * 1.9, 0, 0.7, 1.4, 60 + i, r=0.035); rotz(g, math.pi / 2); move(g, (bx - 0.13, yf + 0.8, 0)); gl.append(g)
    add('blade_glyphs', merge(gl), N['pink'])
    add('blade_border', merge([tube([(bx + s, yf + 0.27, bz + 0.15), (bx + s, yf + 1.33, bz + 0.15), (bx + s, yf + 1.33, bz + 13.85), (bx + s, yf + 0.27, bz + 13.85), (bx + s, yf + 0.27, bz + 0.15)], 0.025, 4) for s in (0.13, -0.13)]), N['cyan'])
    # billboard screen with frame and catwalk (upper left)
    bw, bh, bxc, bzc = 6.8, 4.2, -2.6, G + 5 * FH + 0.3; g0 = len(out)
    add('billboard_frame', box(bw + 0.4, 0.5, bh + 0.4, (bxc, yf - 0.4, bzc - 0.2), bevel_w=0.04), M['metal_d'])
    add('billboard', box(bw, 0.02, bh, (bxc, yf - 0.66, bzc)), bill)
    add('billboard_glyphs', merge([glyph(bxc - 2.4 + i * 1.6, bzc + 1.1, yf - 0.68, 1.2, 2.0, 90 + i, r=0.06) for i in range(4)]), M['sticker_w'])
    add('billboard_lights', merge([box(0.3, 0.3, 0.2, (bxc - bw / 2 + 0.6 + i * 1.4, yf - 1.1, bzc - 0.5)) for i in range(5)]), M['metal'])
    add('catwalk', box(bw + 0.4, 0.7, 0.06, (bxc, yf - 0.95, bzc - 0.6)), M['metal_d'])
    add('catwalk_rail', merge([rod((bxc - bw / 2 - 0.2 + i * 0.6, yf - 1.28, bzc - 0.55), (bxc - bw / 2 - 0.2 + i * 0.6, yf - 1.28, bzc + 0.4), 0.015, 4) for i in range(13)] +
                              [rod((bxc - bw / 2 - 0.2, yf - 1.28, bzc + 0.4), (bxc + bw / 2 + 0.2, yf - 1.28, bzc + 0.4), 0.02, 4)]), M['steel'])
    add('billboard_struts', merge([rod((bxc + dx, yf - 0.4, bzc + 1.5), (bxc + dx, yf, bzc + 3.0), 0.05, 5) for dx in (-2.5, 0, 2.5)]), M['metal'])
    part(out[g0:], 'billboard', pivot=(bxc, yf, bzc))
    # neon bands on two floor slabs, pipes and cables
    add('band_cyan', box(W + 0.04, 0.05, 0.08, (0, yf - 0.03, G + 2 * FH - 0.04)), N['cyan'])
    add('band_violet', box(W + 0.04, 0.05, 0.08, (0, yf - 0.03, G + 7 * FH - 0.04)), N['violet'])
    add('pipes', merge([cyl(0.09, H - 0.6, (-W / 2 + 0.25, yf - 0.12, 0.5), seg=8), cyl(0.06, H - 0.6, (-W / 2 + 0.5, yf - 0.1, 0.5), seg=8)] +
                       [box(0.4, 0.12, 0.06, (-W / 2 + 0.37, yf - 0.08, 1.0 + i * 3.2)) for i in range(10)]), M['metal'])
    cb = [tube(sag((-W / 2 + 0.6, yf - 0.15, G + f * FH + 2.6), (W / 2 - 0.2, yf - 0.15, G + f * FH + 2.4), 0.6 + 0.3 * (f % 2), 10), 0.025, 4) for f in (0, 3, 6)]
    cb.append(tube([(W / 2 + 0.3, yf + 1.4, H), (W / 2 + 0.3, yf + 1.4, G + 0.3), (W / 2 + 0.3, yf + 3, 0.5)], 0.03, 4))
    add('cables', merge(cb), M['cable'])
    # back: fire escape (stairs drawn as stringers + treads)
    fe = []
    for f in range(NF):
        z = G + f * FH; fe.append(box(3.0, 1.2, 0.06, (2.0, D / 2 + 0.6, z)))
        a, b = ((0.6, z + 0.06), (3.4, z + FH)) if f % 2 == 0 else ((3.4, z + 0.06), (0.6, z + FH))
        fe.append(rod((a[0], D / 2 + 0.45, a[1]), (b[0], D / 2 + 0.45, b[1]), 0.04, 4)); fe.append(rod((a[0], D / 2 + 0.9, a[1]), (b[0], D / 2 + 0.9, b[1]), 0.04, 4))
        for i in range(1, 9):
            u = i / 9; fe.append(box(0.2, 0.5, 0.03, (a[0] + (b[0] - a[0]) * u, D / 2 + 0.68, a[1] + (b[1] - a[1]) * u)))
        fe.append(rod((0.5, D / 2 + 1.2, z + 1.0), (3.5, D / 2 + 1.2, z + 1.0), 0.02, 4))
    add('fire_escape', merge(fe), M['rust'])
    # roof: parapet, deck, water tank, dish, antenna with beacon, vents, rooftop neon
    rz = H + 0.4
    add('roof_deck', box(W - 0.4, D - 0.4, 0.05, (0, 0, rz)), M['concrete_d'])
    add('parapet', merge([box(W + 0.4, 0.3, 1.0, (0, s * (D / 2 + 0.05), rz)) for s in (-1, 1)] + [box(0.3, D + 0.4, 1.0, (s * (W / 2 + 0.05), 0, rz)) for s in (-1, 1)]), M['concrete'])
    add('tank_legs', merge([rod((3.5 + dx, 2.5 + dy, rz), (3.5 + dx, 2.5 + dy, rz + 2.4), 0.08, 5) for dx in (-1, 1) for dy in (-1, 1)]), M['rust'])
    add('tank', merge([cyl(1.4, 2.6, (3.5, 2.5, rz + 2.4), seg=12), cyl(1.5, 0.8, (3.5, 2.5, rz + 5.0), seg=12, r2=0.1)]), mat('tank_wood', '#5A4535', 0.9))
    add('tank_bands', merge([torus(1.41, 0.03, (3.5, 2.5, rz + 2.8 + i * 0.8), seg=14, seg2=3, axis='Z') for i in range(3)]), M['metal_d'])
    d = dome(0.9, (0, 0, 0), seg=12, rings=3, h=0.35); bmesh.ops.rotate(d, cent=(0, 0, 0), matrix=Matrix.Rotation(-1.9, 3, 'X'), verts=d.verts)
    add('dish', move(d, (-4.0, -2.5, rz + 1.6)), M['sticker_w'])
    add('dish_post', rod((-4.0, -2.2, rz), (-4.0, -2.4, rz + 1.6), 0.05, 6), M['metal'])
    add('mast', merge([rod((-1.0, 3.5, rz), (-1.0, 3.5, rz + 7.0), 0.07, 6)] + [rod((-1.0, 3.5, rz + 1.5 * i), (-1.0 + 0.8, 3.5, rz + 1.5 * i + 0.4), 0.02, 3) for i in range(1, 4)]), M['steel'])
    add('beacon', dome(0.12, (-1.0, 3.5, rz + 7.0), seg=8, rings=2, h=0.18), N['red'])
    add('vents', merge([box(1.2, 1.2, 0.9, (x, y, rz), bevel_w=0.03) for x, y in ((0.5, -3.5), (-5.0, 3.5))]), M['metal'])
    add('vent_tops', merge([box(1.0, 1.0, 0.05, (x, y, rz + 0.9)) for x, y in ((0.5, -3.5), (-5.0, 3.5))]), M['void'])
    add('roof_sign_frame', merge([box(0.15, 0.15, 3.0, (x, yf + 1.0, rz)) for x in (-5.5, -1.0, 3.5)] + [box(9.6, 0.1, 0.1, (-1.0, yf + 1.0, rz + 1.5))]), M['metal_d'])
    add('roof_sign', merge([glyph(-4.6 + i * 1.8, rz + 1.4, yf + 0.9, 1.4, 1.9, 120 + i, r=0.05) for i in range(5)]), N['yellow'])
    walk_surface(box(W - 0.6, D - 0.6, 0.01, (0, 0, rz + 0.04)), coll)
    mark('door', (2.6, yf - 1.2, 0), math.pi, coll)
    mark('shop', (-3.2, yf - 1.2, 0), math.pi, coll)
    mark('roof', (0, 0, rz + 0.05), 0.0, coll)
    mark('billboard', (bxc, yf - 0.7, bzc + bh / 2), 0.0, coll)
    mark('light_shop', (-3.2, yf - 1.5, 2.5), 0.0, coll)
    mark('light_sign', (bx + 1.5, yf, bz + 7), 0.0, coll)
    mark('light_beacon', (-1.0, 3.5, rz + 7.0), 0.0, coll)
    mark('cam_street', (5.0, yf - 9.0, 1.2), 0.3, coll)
    return out
