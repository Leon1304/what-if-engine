# Jerusalem-style apartment block, 5 storeys (~16 × 11 m, ~19 m to the antenna): stone cladding with floor courses and quoins,
# three shop fronts with roller shutters, awnings and blank sign boards, rows of balconies with sliding doors, rectangular windows
# with sills and shutters, AC units, entrance with canopy, parapet, lift bulkhead, eight black water tanks, four solar boilers,
# satellite dishes and antenna. Materials: see _jlm.py (+ sign).
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/jlm_block.py
use('_jlm.py')
AO = {'strength': 0.6, 'dist': 1.2}

def build(coll):
    M = jlm_mats(); M['sign'] = mat('sign', '#EDE6D2', 0.8); out = []
    W, D, P, FH, N = 16.0, 11.0, 0.3, 3.0, 5
    top = P + FH * N
    out.append(mesh('plinth', box(W + 0.14, D + 0.14, P, bevel_w=0.03), M['stone_dark'], coll))
    out.append(mesh('body', box(W, D, top - P, (0, 0, P), bevel_w=0.04), M['stone'], coll))
    courses(out, coll, M, W, D, [P + FH * i - 0.06 for i in range(1, N)])
    out.append(mesh('cornice', box(W + 0.3, D + 0.3, 0.2, (0, 0, top - 0.2), bevel_w=0.04), M['stone_light'], coll))
    for sx in (-1, 1):
        for sy in (-1, 1):
            for k in range(int((top - P - 0.3) / 0.6)):
                lx, ly = (0.7, 0.4) if k % 2 else (0.4, 0.7)
                out.append(mesh('quoin', box(lx, ly, 0.54, (sx * (W / 2 - lx / 2 + 0.03), sy * (D / 2 - ly / 2 + 0.03), P + 0.05 + k * 0.6)), M['stone_light'], coll))

    # front: three shops + entrance on the ground floor, balconies at u = ±4.5 on every upper floor, windows between and outside
    L = []
    for i, u in enumerate((-5.6, -1.4, 5.6)):
        L.append(('shop_frame', prism(rect_pts(3.4, 2.9, u, 0.0), 0.08, -0.08), M['stone_light']))
        L.append(('shop', prism(rect_pts(3.1, 2.7, u, 0.0), 0.03, -0.11), M['void']))
        h = (1.4, 2.3, 0.6)[i]
        L.append(('roller', box(3.05, 0.06, h, (u, -0.13, 2.7 - h)), M['metal']))
        for k in range(int(h / 0.25)): L.append(('roller_rib', box(3.05, 0.02, 0.03, (u, -0.17, 2.7 - h + 0.1 + k * 0.25)), M['rail']))
        L.append(('sign', box(3.2, 0.06, 0.55, (u, -0.11, 2.95), bevel_w=0.01), M['sign']))
        aw = box(3.4, 1.4, 0.05, (0, 0, 0)); bmesh.ops.rotate(aw, cent=(0, 0, 0), matrix=Matrix.Rotation(0.3, 3, 'X'), verts=aw.verts)
        L.append(('awning', move(aw, (u, -0.8, 3.6)), M['awning'] if i != 1 else M['shutter']))
    door(L, M, 2.3, 1.4, 2.5, steps=1)
    L.append(('canopy', box(2.4, 1.2, 0.12, (2.3, -0.6, 2.95), bevel_w=0.02), M['stone_light']))
    for f in range(1, N):
        zf = P + FH * f
        for u in (-4.5, 4.5):
            L.append(('balc_door', prism(rect_pts(1.8, 2.2, u, zf + 0.05), 0.02, -0.07), M['void']))
            L.append(('balc_door_frame', prism(rect_pts(2.0, 2.3, u, zf), 0.05, -0.05), M['stone_light']))
            balcony(L, M, u, zf, 2.8, 1.2)
        for u in (-7.2, -1.3, 1.3, 7.2): window(L, M, u, zf + 0.85, 1.0, 1.45, arched=False, shutter=True)
        if f % 2: ac_unit(L, M, 0.0, zf + 2.3)
    put(out, coll, L, side_xf(0, W, D))
    for side in (1, 2, 3):
        L = []; us = (-5.5, -2.0, 2.0, 5.5) if side == 2 else (-3.2, 0.0, 3.2)
        for f in range(N):
            zf = P + FH * f
            for u in us: window(L, M, u, zf + 0.85, 1.0, 1.45, arched=False, shutter=f > 0, grille=f == 0)
            if side != 2 and f > 0 and f % 2 == 0: ac_unit(L, M, 4.6 if side == 1 else -4.6, zf + 1.3)
        if side == 2:
            for f in (1, 2, 4): ac_unit(L, M, -7.2, P + FH * f + 1.2)
        put(out, coll, L, side_xf(side, W, D))

    # roof
    parapet(out, coll, M, W, D, top, h=0.9)
    out.append(mesh('lift_room', box(3.2, 3.0, 2.6, (5.0, 2.5, top), bevel_w=0.04), M['stone'], coll))
    out.append(mesh('lift_cornice', box(3.4, 3.2, 0.14, (5.0, 2.5, top + 2.6), bevel_w=0.03), M['stone_light'], coll))
    L = []; door(L, M, 0.0, 0.9, 2.0, steps=0); put(out, coll, L, side_xf(0, 3.2, 3.0, 5.0, 2.5))
    for k in range(8): water_tank(out, coll, M, -6.6 + 1.3 * (k % 4), 1.6 + 1.4 * (k // 4), top)
    for k in range(4): solar_heater(out, coll, M, -6.0 + 2.6 * k, -3.0, top)
    dish(out, coll, M, 7.0, -0.5, top, rz=0.3); dish(out, coll, M, 1.5, 3.8, top, rz=-0.2)
    out.append(mesh('antenna', cyl(0.03, 4.0, (2.8, 1.0, top), seg=6), M['metal'], coll))
    for k in range(4): out.append(mesh('antenna_bar', cyl(0.012, 1.0 - 0.18 * k, (2.3 + 0.09 * k, 1.0, top + 2.6 + 0.35 * k), seg=4, axis='X'), M['metal'], coll))
    return out
