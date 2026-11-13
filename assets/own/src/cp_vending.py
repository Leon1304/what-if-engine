# Cyberpunk vending machine (1.05 × 0.85 × 2.05 m with base and litter), front -y (three.js +z): dented magenta steel cabinet with
# beveled edges, glowing header with made-up neon glyphs, lit display window with four rows of cans and bottles behind glass,
# cyan neon strip down the side, keypad column with lit buttons, card slot and small screen, recessed pickup bay with a hinged flap,
# coin return, vents, rust and grime at the foot, stickers, a spray tag, scratches, a power cable to a floor box, a crushed can and a puddle.
# Parts: flap (pickup flap, hinged at its top edge, rx > 0 swings it in). Marks: front (customer stands here, facing the machine),
# bay (the flap, where a can drops out), light_screen (glow spot in front of the display). Materials: body, body_dark, + _cyber.py.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/cp_vending.py
use('_cyber.py')
AO = {'strength': 0.6, 'dist': 0.35}

def build(coll):
    M = cyber_mats(); N = neon_mats(); out = []
    body = mat('body', '#B4246E', 0.45, 0.55); body_d = mat('body_dark', '#5E1239', 0.5, 0.5)
    can = [mat('can_red', '#D23A2F', 0.35, 0.6), mat('can_blue', '#2A64C9', 0.35, 0.6), mat('can_green', '#3BAA4F', 0.35, 0.6), mat('can_silver', '#C9CED4', 0.25, 0.9)]
    water = mat('water', '#0E141A', 0.05, 0.2)
    add = lambda n, bm, m: (out.append(mesh(n, bm, m, coll)), out[-1])[1]
    W, D, H, F = 1.0, 0.8, 1.95, -0.4   # cabinet; F = front plane y
    add('base', box(W + 0.06, D + 0.04, 0.08, (0, 0, 0), bevel_w=0.01), M['metal_d'])
    wx, wz, ww, wh = -0.13, 0.78, 0.62, 0.95   # display window (opening in the front)
    R = random.Random(7); B = 0.08; fd = 0.4      # base height, depth of the front shell around the window
    xl, xr = wx - ww / 2, wx + ww / 2
    cab = [box(W, D - fd, H, (0, F + fd + (D - fd) / 2, B), bevel_w=0.03, seg=2),                             # back block
           box(xl + W / 2, fd + 0.03, H, ((xl - W / 2) / 2, F + fd / 2, B), bevel_w=0.02),                      # left of the window
           box(W / 2 - xr, fd + 0.03, H, ((xr + W / 2) / 2, F + fd / 2, B), bevel_w=0.02),                      # right (keypad side)
           box(ww, fd + 0.03, wz - B, (wx, F + fd / 2, B), bevel_w=0.01),                                       # below
           box(ww, fd + 0.03, B + H - wz - wh, (wx, F + fd / 2, wz + wh), bevel_w=0.01)]                        # above
    cab = merge(cab)
    for v in cab.verts:   # dents: a kicked front corner and a dented side
        if v.co.y < F + 0.05 and v.co.z < 0.6 and v.co.x > 0.2: v.co.y += 0.025 * R.random()
        if v.co.x > W / 2 - 0.05 and 0.9 < v.co.z < 1.3: v.co.x -= 0.015
    add('cabinet', cab, body)
    add('side_panel', box(0.01, D - 0.1, H - 0.3, (-W / 2 - 0.004, 0, 0.25)), body_d)
    # header sign
    add('header_box', box(W + 0.04, 0.12, 0.34, (0, F - 0.04, H - 0.32), bevel_w=0.015), M['metal_d'])
    add('header_panel', box(W - 0.06, 0.01, 0.26, (0, F - 0.105, H - 0.28)), mat('header', '#3A0D2A', 0.4, emit='#5A1240', ei=1.4))
    add('header_glyphs', merge([glyph(-0.33 + 0.22 * i, H - 0.25, F - 0.115, 0.17, 0.2, 40 + i) for i in range(4)]), N['cyan'])
    # display window with shelves of cans
    fr = [box(ww + 0.06, 0.05, 0.035, (wx, F - 0.02, z), bevel_w=0.008) for z in (wz - 0.035, wz + wh)]
    fr += [box(0.035, 0.05, wh + 0.07, (x, F - 0.02, wz - 0.035), bevel_w=0.008) for x in (wx - ww / 2 - 0.0175, wx + ww / 2 + 0.0175)]
    add('window_frame', merge(fr), M['metal_d'])
    add('window_box', box(ww, 0.38, 0.01, (wx, F + 0.15, wz - 0.01)), M['void'])
    for x in (wx - ww / 2, wx + ww / 2): add(f'window_wall{x}', box(0.01, 0.38, wh, (x, F + 0.15, wz)), M['steel'])
    add('window_top', box(ww, 0.38, 0.01, (wx, F + 0.15, wz + wh - 0.01)), mat('window_light', '#A9CBE6', 0.4, emit='#7FB2DD', ei=0.35))
    add('window_back', box(ww, 0.02, wh, (wx, F + 0.32, wz)), mat('window_light', '#A9CBE6', 0.4, emit='#7FB2DD', ei=0.35))
    for r in range(4):
        z = wz + 0.04 + r * 0.235
        add(f'shelf{r}', box(ww, 0.3, 0.012, (wx, F + 0.17, z - 0.012)), M['steel'])
        for k in range(6):
            x = wx - ww / 2 + 0.06 + k * 0.1; m = can[(r + k * (r + 1)) % 4]
            if r == 3 and k % 2: add(f'bottle{r}{k}', cyl(0.032, 0.17, (x, F + 0.1, z), seg=8, r2=0.016), m)
            elif not (r == 1 and k == 4): add(f'can{r}{k}', cyl(0.033, 0.12, (x, F + 0.1, z), seg=8), m)   # one slot sold out
            add(f'tag{r}{k}', box(0.05, 0.005, 0.02, (x, F + 0.04, z - 0.03)), N['yellow'] if k % 3 == 0 else M['sticker_w'])
            add(f'coil{r}{k}', torus(0.03, 0.004, (x, F + 0.2, z + 0.05), seg=8, seg2=3, axis='Y'), M['steel'])
    add('glare', merge([rod((wx - ww / 2 + 0.05 + 0.12 * i, F - 0.006, wz + 0.05), (wx - ww / 2 + 0.25 + 0.12 * i, F - 0.006, wz + wh - 0.05), 0.006 - 0.0015 * i, 3) for i in range(3)]), mat('glare', '#DCEBFF', 0.1))   # glass is left open so the cans read; glare streaks stand for it
    add('glass_scratch', merge([rod((wx - 0.2 + 0.1 * i, F - 0.012, wz + 0.3 + 0.05 * i), (wx + 0.05 + 0.1 * i, F - 0.012, wz + 0.45 + 0.03 * i), 0.002, 3) for i in range(3)]), M['sticker_w'])
    # side neon strip and keypad column
    add('neon_strip', rod((W / 2 - 0.04, F - 0.012, 0.3), (W / 2 - 0.04, F - 0.012, H - 0.4), 0.012), N['cyan'])
    add('neon_strip_l', rod((-W / 2 + 0.03, F - 0.012, 0.3), (-W / 2 + 0.03, F - 0.012, H - 0.4), 0.008), N['pink'])
    kx = 0.33
    add('keypad_plate', box(0.2, 0.02, 0.72, (kx, F - 0.01, 0.95), bevel_w=0.008), M['metal_d'])
    add('mini_screen', box(0.15, 0.01, 0.09, (kx, F - 0.022, 1.53)), N['screen'])
    for i in range(4):
        for j in range(3):
            add(f'key{i}{j}', box(0.04, 0.015, 0.035, (kx - 0.05 + j * 0.05, F - 0.025, 1.25 + i * 0.06), bevel_w=0.004), N['yellow'] if (i, j) == (0, 2) else M['steel'])
    add('card_slot', box(0.11, 0.03, 0.04, (kx, F - 0.03, 1.12), bevel_w=0.005), M['plastic'])
    add('card_light', box(0.07, 0.005, 0.006, (kx, F - 0.046, 1.15)), N['red'])
    add('coin_slot', box(0.05, 0.02, 0.07, (kx, F - 0.022, 1.01)), M['steel'])
    add('coin_return', box(0.09, 0.05, 0.06, (kx, F - 0.02, 0.88)), M['void'])
    # pickup bay with hinged flap (part)
    add('bay_frame', box(0.66, 0.04, 0.26, (-0.1, F - 0.015, 0.3), bevel_w=0.01), M['metal_d'])
    add('bay_void', box(0.58, 0.02, 0.19, (-0.1, F - 0.02, 0.335)), M['void'])
    flap = add('flap', box(0.56, 0.015, 0.18, (-0.1, F - 0.04, 0.34), bevel_w=0.004), M['plastic'])
    fl = add('flap_label', box(0.2, 0.004, 0.03, (-0.1, F - 0.048, 0.44)), M['sticker_w'])
    part([flap, fl], 'flap', pivot=(-0.1, F - 0.035, 0.52))
    # vents, kick plate, rust, grime
    for i in range(5): add(f'vent{i}', box(0.3, 0.012, 0.012, (0.3, F - 0.006, 0.12 + i * 0.03)), M['void'])
    add('kick_plate', box(W - 0.02, 0.012, 0.1, (0, F - 0.006, 0.08)), M['steel'])
    add('rust_foot', merge([box(R.uniform(0.06, 0.18), 0.004, R.uniform(0.03, 0.09), (R.uniform(-0.45, 0.45), F - 0.0135, 0.18)) for _ in range(6)]), M['rust'])
    add('grime_side', merge([box(0.004, R.uniform(0.1, 0.3), R.uniform(0.05, 0.22), (W / 2 + 0.001, R.uniform(-0.3, 0.3), 0.08)) for _ in range(5)]), M['grime'])
    add('drip_streak', merge([box(0.012, 0.004, R.uniform(0.2, 0.5), (R.uniform(-0.45, -0.25), F - 0.0105, 1.0)) for _ in range(3)]), M['grime'])
    # stickers and tag
    for k, s in enumerate(sticker_set(11, 9, (-0.48, 0.48, 0.2, 0.7), F - 0.011)):
        if s: add(f'stickers{k}', s, [M['sticker_y'], M['sticker_w'], M['sticker_r']][k])
    side_st = sticker_set(12, 6, (-0.3, 0.3, 0.9, 1.6), 0, face=1)
    for k, s in enumerate(side_st):
        if s: add(f'side_stickers{k}', move(rotz(s, -math.pi / 2), (W / 2 + 0.003, 0, 0)), [M['sticker_y'], M['sticker_w'], M['sticker_r']][k])
    tag = [(-0.3, 1.0), (-0.2, 1.25), (-0.05, 1.05), (0.05, 1.3), (0.2, 1.1), (0.15, 0.95)]
    add('tag', tube([(W / 2 + 0.006, y, z) for y, z in tag], 0.012, 4), M['paint_tag'])
    # back cable to a floor box, crushed can, puddle
    add('cable', tube([(0.3, D / 2 - 0.05, 0.2), (0.32, D / 2 + 0.12, 0.1), (0.45, D / 2 + 0.35, 0.02), (0.75, D / 2 + 0.45, 0.02)], 0.014, 6), M['cable'])
    add('floor_box', box(0.18, 0.14, 0.12, (0.8, D / 2 + 0.45, 0), bevel_w=0.01), M['metal_d'])
    add('floor_box_led', box(0.02, 0.005, 0.02, (0.8, D / 2 + 0.378, 0.08)), N['red'])
    c = cyl(0.033, 0.06, (0, 0, 0), seg=8); rotz(c, 0.6)
    for v in c.verts: v.co.z *= 0.5; v.co.x *= 1.25
    bmesh.ops.rotate(c, cent=(0, 0, 0), matrix=Matrix.Rotation(1.4, 3, 'X'), verts=c.verts); move(c, (0.52, F - 0.35, 0.03))
    add('crushed_can', c, can[0])
    pz = bmesh.new(); bmesh.ops.create_circle(pz, cap_ends=True, segments=10, radius=0.22)
    for v in pz.verts: v.co.x *= 1.4 + 0.15 * math.sin(v.co.y * 9); v.co.y *= 0.7
    add('puddle', move(pz, (-0.25, F - 0.38, 0.004)), water)
    mark('front', (-0.05, F - 0.7, 0), math.pi, coll)
    mark('bay', (-0.1, F - 0.05, 0.4), 0.0, coll)
    mark('light_screen', (-0.1, F - 0.45, 1.3), 0.0, coll)
    return out
