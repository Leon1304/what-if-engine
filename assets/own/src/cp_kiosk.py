# Cyberpunk street kiosk, booth 3.0 × 2.2 m, 2.75 m high (roof sign to 3.9 m, with awning 3.0 × 3.4 m): steel-panel booth with
# seams, dents, rust streaks, stickers and a graffiti tag; open serving window with a half-raised roll shutter, steel counter with a
# card reader, rows of cans and snack packs on lit shelves inside, magazines with made-up glyph covers on a wire rack outside,
# a hologram ad screen on a pole (glowing panel with frame and emitter), roof sign box with neon glyphs, awning with a pink neon edge,
# AC unit, cables to a junction box, rear door, crates, trash bags, a stool for the clerk, litter.
# Hollow inside (floor 0.12 m): a clerk stands behind the counter.
# Parts: shutter (roll shutter, y > 0 rolls it up), awning, holo (ad screen on its pole), rack (magazine rack), door (rear door,
# hinge at +x, opens outwards with openDoor(K, t): ry < 0 in three.js), stool, junk (crates, trash bags), power (junction box and cable), litter.
# The booth is hollow but one obstacle: put the clerk in with noHit(clerk).
# Marks: customer (in front of the counter, facing it), clerk (behind the counter, facing out), holo (centre of the ad screen),
# rack (in front of the rack), back_door (outside the rear door, facing it), light_window, light_sign, light_holo, cam_front.
# Materials: booth, booth_dark, shelf_light, holo, holo_frame, + _cyber.py.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/cp_kiosk.py
use('_cyber.py')
AO = {'strength': 0.55, 'dist': 0.6}

def build(coll):
    M = cyber_mats(); N = neon_mats(); out = []; R = random.Random(44)
    booth = mat('booth', '#2E6B5E', 0.55, 0.5); booth_d = mat('booth_dark', '#1C3F38', 0.6, 0.5)
    shelf = mat('shelf_light', '#FFF3D6', 0.4, emit='#FFD9A0', ei=0.6); holo = mat('holo', '#58E8FF', 0.2, emit='#20C8FF', ei=2.4)
    holo_f = mat('holo_frame', '#B784FF', 0.3, emit='#8E45FF', ei=3.0); awn = mat('awning', '#2A2F36', 0.7, 0.3)
    shut = mat('shutter', '#7C8288', 0.5, 0.7)
    add = lambda n, bm, m: (out.append(mesh(n, bm, m, coll)), out[-1])[1]
    W, D, H, T = 3.0, 2.2, 2.75, 0.06; F = -D / 2                   # front face at y = F
    wx0, wx1, wz0, wz1 = -1.2, 1.2, 1.0, 2.2                         # serving window
    # shell: floor, roof, back, sides, front blocks around the window
    add('floor', box(W, D, 0.12, (0, 0, 0)), M['metal_d'])
    add('roof', box(W + 0.1, D + 0.1, 0.12, (0, 0, H - 0.12), bevel_w=0.02), booth_d)
    add('back', box(W, T, H - 0.12, (0, D / 2 - T / 2, 0.12)), booth)
    for s in (-1, 1): add(f'side{s}', box(T, D, H - 0.12, (s * (W / 2 - T / 2), 0, 0.12)), booth)
    add('front_low', box(W, T, wz0 - 0.12, (0, F + T / 2, 0.12)), booth)
    add('front_top', box(W, T, H - 0.12 - wz1, (0, F + T / 2, wz1)), booth)
    for s in (-1, 1): add(f'front_post{s}', box(W / 2 - wx1, T, wz1 - wz0, (s * (wx1 + (W / 2 - wx1) / 2), F + T / 2, wz0)), booth)
    add('plinth', box(W + 0.04, D + 0.04, 0.14, (0, 0, 0)), M['concrete_d'])
    add('seams', merge([box(0.015, 0.012, H - 0.3, (x, F - 0.002, 0.15)) for x in (-1.25, 1.25)] + [box(W, 0.012, 0.015, (0, F - 0.002, z)) for z in (0.55,)]
                       + [box(0.012, D, 0.015, (s * (W / 2 + 0.002), 0, z)) for s in (-1, 1) for z in (0.9, 1.8)]), booth_d)
    add('dents', merge([box(0.3, 0.02, 0.2, (R.uniform(-1, 1), F - 0.004, R.uniform(0.3, 0.7)), rz=R.uniform(-0.2, 0.2)) for _ in range(2)]), booth_d)
    add('rust', merge([box(0.05, 0.01, R.uniform(0.3, 0.6), (R.uniform(-1.4, 1.4), F - 0.006, 0.25)) for _ in range(4)] + [box(0.01, 0.06, 0.8, (W / 2 + 0.006, R.uniform(-0.8, 0.8), 0.6)) for _ in range(2)]), M['rust'])
    # counter, card reader, inside shelves with lit backs and goods
    add('counter', box(wx1 - wx0 + 0.1, 0.55, 0.05, (0, F + 0.02, wz0), bevel_w=0.01), M['steel'])
    add('counter_lip', box(wx1 - wx0 + 0.1, 0.03, 0.06, (0, F - 0.24, wz0 - 0.01)), M['metal_d'])
    add('reader', box(0.12, 0.18, 0.05, (0.75, F - 0.1, wz0 + 0.05), bevel_w=0.01), M['plastic'])
    add('reader_screen', box(0.08, 0.1, 0.005, (0.75, F - 0.11, wz0 + 0.1)), N['cyan'])
    by = D / 2 - T - 0.2
    add('shelf_back', box(W - 0.2, 0.02, 1.5, (0, by + 0.12, 0.8)), shelf)
    for k, z in enumerate((1.08, 1.42, 1.76)):
        add(f'shelf{k}', box(W - 0.2, 0.3, 0.025, (0, by, z)), M['metal'])
        goods = []; cols = []
        for i in range(12):
            x = -1.3 + i * 0.235 + R.uniform(-0.02, 0.02)
            if k % 2 == 0: goods.append(cyl(0.035, 0.12, (x, by - 0.03, z + 0.025), seg=8))
            else: goods.append(box(0.16, 0.06, 0.2, (x, by - 0.03, z + 0.025), rz=R.uniform(-0.1, 0.1)))
        add(f'goods{k}', merge(goods[0::3]), [M['sticker_r'], M['sticker_y'], M['paint_tag'], M['sticker_w']][k])
        add(f'goods{k}b', merge(goods[1::3]), [M['sticker_w'], M['sticker_r'], M['sticker_y'], M['paint_tag']][k])
        add(f'goods{k}c', merge(goods[2::3]), [M['paint_tag'], M['steel'], M['sticker_r'], M['sticker_y']][k])
    add('ceiling_lamp', box(2.0, 0.12, 0.04, (0, -0.2, H - 0.17)), N['lamp'])
    # roll shutter (part): box under the top block, half raised
    i0 = len(out)
    add('shutter', box(wx1 - wx0, 0.04, 0.4, (0, F - 0.03, wz1 - 0.4)), shut)
    add('shutter_ribs', merge([box(wx1 - wx0, 0.05, 0.012, (0, F - 0.03, wz1 - 0.4 + k * 0.08)) for k in range(5)]), M['metal_d'])
    add('shutter_handle', box(0.2, 0.05, 0.03, (0, F - 0.06, wz1 - 0.4)), M['metal_d'])
    part(out[i0:], 'shutter', pivot=(0, F - 0.03, wz1 - 0.4))
    add('shutter_box', box(wx1 - wx0 + 0.1, 0.16, 0.18, (0, F - 0.07, wz1), bevel_w=0.01), M['metal_d'])
    # awning (part) with neon edge and drip line
    i0 = len(out); ad = 1.0
    aw = box(W + 0.2, ad, 0.05, (0, 0, 0)); bmesh.ops.rotate(aw, cent=(0, 0, 0), matrix=Matrix.Rotation(-0.18, 3, 'X'), verts=aw.verts)
    add('awning', move(aw, (0, F - ad / 2 - 0.05, H - 0.2)), awn)
    add('awning_neon', box(W + 0.2, 0.03, 0.03, (0, F - ad - 0.04, H - 0.32)), N['pink'])
    add('awning_brackets', merge([beam_(s * 1.4, F, H - 0.55, F - ad + 0.1, H - 0.25) for s in (-1, 1)]), M['metal_d'])
    part(out[i0:], 'awning', pivot=(0, F, H - 0.2))
    # roof sign with glyphs, AC box, cables
    add('sign_box', box(2.4, 0.3, 0.7, (0, -0.4, H), bevel_w=0.02), M['plastic'])
    add('sign_face', box(2.3, 0.01, 0.55, (0, -0.555, H + 0.08)), mat('sign_back', '#14102A', 0.4))
    add('sign_glyphs', merge([glyph(-0.8 + k * 0.53, H + 0.12, -0.565, 0.38, 0.45, 120 + k, r=0.02) for k in range(4)]), N['yellow'])
    add('sign_legs', merge([box(0.06, 0.06, 0.25, (s * 1.0, -0.4, H - 0.05)) for s in (-1, 1)]), M['metal_d'])
    for k, bm in enumerate(ac_box((0.6, 0.55, H), 0.0, w=0.7, h=0.45, d=0.3)): add(f'roof_ac{k}', bm, [M['metal'], M['void']][k])
    i0 = len(out)
    add('cables', merge([tube(sag((W / 2, 0.6, H - 0.1), (W / 2 + 0.6, 0.9, 0.9), 0.15, 6), 0.015, 4), tube([(W / 2 + 0.6, 0.9, 0.9), (W / 2 + 0.6, 0.9, 0.0)], 0.015, 4)]), M['cable'])
    add('jbox', box(0.35, 0.22, 0.5, (W / 2 + 0.6, 0.9, 0.5), bevel_w=0.01), M['metal'])
    add('jbox_led', box(0.03, 0.01, 0.02, (W / 2 + 0.68, 0.785, 0.9)), N['red'])
    part(out[i0:], 'power', pivot=(W / 2 + 0.6, 0.9, 0))
    # stickers and a tag on the front, graffiti on the left side
    for k, st in enumerate(sticker_set(12, 10, (-1.4, 1.4, 0.2, 0.82), F, size=(0.07, 0.16))):
        if st: add(f'stickers{k}', st, [M['sticker_y'], M['sticker_w'], M['sticker_r']][k])
    add('tag', merge([move(rotz(glyph(-0.4 + k * 0.7, 0.5, 0, 0.6, 0.6, 140 + k, r=0.03), -math.pi / 2), (-W / 2 - 0.01, 0, 0)) for k in range(2)]), M['paint_tag'])
    # rear door (part, hinge at +x)
    i0 = len(out)
    add('door', box(0.8, 0.04, 2.0, (0.5, D / 2 + 0.02, 0.14)), booth_d)
    add('door_handle', box(0.04, 0.05, 0.14, (0.18, D / 2 + 0.06, 1.0)), M['steel'])
    add('door_sign', box(0.3, 0.005, 0.2, (0.5, D / 2 + 0.043, 1.6)), M['hazard_y'])
    part(out[i0:], 'door', pivot=(0.9, D / 2 + 0.02, 0.14), sign=-1, angle=1.5)   # opens outwards: openDoor(K, t)
    # hologram ad on a pole (part): frame, glowing panel, emitter box, base
    hx, hy = -W / 2 - 0.55, F - 0.3
    i0 = len(out)
    add('holo_base', cyl(0.22, 0.08, (hx, hy, 0), seg=10), M['metal_d'])
    add('holo_pole', cyl(0.05, 2.1, (hx, hy, 0.08), seg=8), M['metal_d'])
    add('holo_emitter', box(0.25, 0.2, 0.15, (hx, hy, 2.15), bevel_w=0.02), M['plastic'])
    add('holo_frame', merge([box(0.9, 0.03, 0.03, (hx, hy, z)) for z in (2.35, 3.55)] + [box(0.03, 0.03, 1.23, (hx + s * 0.45, hy, 2.35)) for s in (-1, 1)]), holo_f)
    add('holo_panel', box(0.86, 0.01, 1.18, (hx, hy, 2.37)), holo)
    add('holo_lines', merge([box(0.86, 0.012, 0.012, (hx, hy - 0.004, 2.45 + k * 0.12)) for k in range(9)]), mat('holo_scan', '#BFF7FF', 0.2, emit='#9FF0FF', ei=3.0))
    add('holo_glyphs', merge([glyph(hx, 2.75 + k * 0.4, hy - 0.015, 0.4, 0.32, 160 + k, r=0.014) for k in range(2)]), N['pink'])
    part(out[i0:], 'holo', pivot=(hx, hy, 0))
    # magazine rack (part) right of the window
    rx, ry = W / 2 + 0.35, F - 0.2
    i0 = len(out)
    add('rack_frame', merge([box(0.03, 0.03, 1.4, (rx + dx, ry + dy, 0)) for dx in (-0.3, 0.3) for dy in (-0.15, 0.15)] + [box(0.63, 0.3, 0.02, (rx, ry, z)) for z in (0.4, 0.8, 1.2)]), M['steel'])
    covers = [box(0.17, 0.02, 0.24, (rx - 0.2 + i * 0.2, ry - 0.12, z + 0.02), rz=0) for z in (0.4, 0.8, 1.2) for i in range(3)]
    add('rack_covers_a', merge(covers[0::3]), N['pink']); add('rack_covers_b', merge(covers[1::3]), M['sticker_y']); add('rack_covers_c', merge(covers[2::3]), N['cyan'])
    add('rack_glyphs', merge([glyph(rx - 0.2 + i * 0.2, z + 0.08, ry - 0.135, 0.1, 0.12, 180 + i + int(z * 10), r=0.006) for z in (0.4, 0.8, 1.2) for i in range(3)]), M['void'])
    part(out[i0:], 'rack', pivot=(rx, ry, 0))
    # clerk stool (part), crates and trash bags behind, litter
    i0 = len(out)
    add('stool', merge([cyl(0.18, 0.05, (0.3, 0.3, 0.75), seg=10), cyl(0.03, 0.63, (0.3, 0.3, 0.12), seg=6), cyl(0.2, 0.03, (0.3, 0.3, 0.12), seg=10)]), M['metal_d'])
    part(out[i0:], 'stool', pivot=(0.3, 0.3, 0.12))
    i0 = len(out)                                                # crates, bags and the junction box: own part (keeps the booth's hitbox tight)
    for k, (cx, cy, cz) in enumerate([(-W / 2 - 0.4, D / 2 - 0.1, 0), (-W / 2 - 0.4, D / 2 - 0.1, 0.36), (-W / 2 - 0.35, D / 2 - 0.65, 0)]):
        add(f'crate{k}', box(0.5, 0.4, 0.35, (cx, cy, cz), bevel_w=0.015, rz=R.uniform(-0.15, 0.15)), [mat('crate', '#3A6EA5', 0.7), M['sticker_y'], mat('crate', '#3A6EA5', 0.7)][k])
    bags = []
    for k in range(3):
        b = dome(0.28, (0, 0, 0), seg=8, rings=3); jitter(b, 0.04, seed=k)
        for v in b.verts: v.co.z *= 1.3
        bags.append(move(b, (W / 2 + 0.3 + k * 0.25, D / 2 - 0.1 - (k % 2) * 0.3, 0)))
    add('bags', merge(bags), mat('bag', '#17181B', 0.4, 0.1))
    part(out[i0:], 'junk', pivot=(0, D / 2, 0))
    i0 = len(out)
    for k in range(3):
        c = cyl(0.033, 0.12, (0, 0, 0), seg=8); bmesh.ops.rotate(c, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'), verts=c.verts)
        add(f'litter_can{k}', move(rotz(c, R.uniform(0, 3)), (R.uniform(-1.2, 1.4), F - R.uniform(0.6, 1.4), 0.033)), [M['sticker_r'], M['steel'], M['paint_tag']][k])
    part(out[i0:], 'litter', pivot=(0, F - 1.0, 0))
    mark('customer', (0, F - 0.7, 0), math.pi, coll)
    mark('clerk', (0, -0.15, 0.12), 0.0, coll)
    mark('holo', (hx, hy, 2.95), 0.0, coll)
    mark('rack', (rx, ry - 0.7, 0), math.pi, coll)
    mark('back_door', (0.5, D / 2 + 0.8, 0), 0.0, coll)
    mark('light_window', (0, F - 0.5, 1.8), 0.0, coll)
    mark('light_sign', (0, -1.0, H + 0.4), 0.0, coll)
    mark('light_holo', (hx, hy - 0.6, 2.9), 0.0, coll)
    mark('cam_front', (1.6, F - 3.5, 1.5), math.pi + 0.43, coll)
    return out

def beam_(x, y0, z0, y1, z1):
    """Diagonal awning strut at x from (y0, z0) to (y1, z1)."""
    a, b = Vector((x, y0, z0)), Vector((x, y1, z1)); return rod(a, b, 0.02, 4)
