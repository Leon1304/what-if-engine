# Jerusalem-style limestone house, 3 storeys (~10.3 × 13.6 × 9.2 m incl. roof fittings): plinth, quoins, floor courses, arched windows
# with stone surrounds, sills and teal shutters, grilles on the ground floor, arched door with steps and lamp, shop arch with half-open
# roller shutter and awning, balcony with corbels and railing, AC units, parapet, stair bulkhead with small dome, black water tanks,
# solar boilers, satellite dish, antenna, potted plants. Materials: see _jlm.py.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/jlm_house.py
use('_jlm.py')
AO = {'strength': 0.6, 'dist': 1.2}

def build(coll):
    M = jlm_mats(); out = []
    W, D, P, FH, N = 10.0, 8.0, 0.4, 3.2, 3
    top = P + FH * N
    out.append(mesh('plinth', box(W + 0.14, D + 0.14, P, bevel_w=0.03), M['stone_dark'], coll))
    out.append(mesh('body', box(W, D, top - P, (0, 0, P), bevel_w=0.04), M['stone'], coll))
    courses(out, coll, M, W, D, [P + FH * i - 0.06 for i in range(1, N)])
    out.append(mesh('cornice', box(W + 0.3, D + 0.3, 0.18, (0, 0, top - 0.18), bevel_w=0.04), M['stone_light'], coll))
    # quoins: alternating long/short blocks on the four corners
    for sx in (-1, 1):
        for sy in (-1, 1):
            for k in range(int((top - P - 0.3) / 0.5)):
                lx, ly = (0.6, 0.35) if k % 2 else (0.35, 0.6)
                out.append(mesh('quoin', box(lx, ly, 0.44, (sx * (W / 2 - lx / 2 + 0.03), sy * (D / 2 - ly / 2 + 0.03), P + 0.05 + k * 0.5), bevel_w=0.02), M['stone_light'], coll))

    # front: door, shop with roller shutter and awning; upper floors three windows, balcony on the first floor
    L = []
    door(L, M, -3.0)
    L.append(('shop_frame', prism(arch_pts(3.2, 3.15, 1.6, 0.0), 0.1, -0.09), M['stone_light']))
    L.append(('shop', prism(arch_pts(2.8, 2.95, 1.6, 0.0), 0.03, -0.12), M['void']))
    L.append(('shop_shutter', box(2.75, 0.06, 1.1, (1.6, -0.13, 1.45)), M['metal']))
    for k in range(5): L.append(('shutter_rib', box(2.75, 0.02, 0.03, (1.6, -0.17, 1.5 + k * 0.22)), M['rail']))
    aw = box(3.4, 1.3, 0.05, (0, 0, 0)); bmesh.ops.rotate(aw, cent=(0, 0, 0), matrix=Matrix.Rotation(0.32, 3, 'X'), verts=aw.verts)
    L.append(('awning', move(aw, (1.6, -0.75, 3.15)), M['awning']))
    for s in (-1, 1): L.append(('awning_arm', box(0.03, 1.3, 0.03, (1.6 + s * 1.6, -0.7, 2.95)), M['rail']))
    for f in range(1, N):
        zf = P + FH * f
        for u in (-3.0, 0.0, 3.0): window(L, M, u, zf + 0.8, 1.1, 1.9, shutter=True)
    balcony(L, M, 0.0, P + FH + 0.0, 3.2, 1.1)
    ac_unit(L, M, 4.3, P + FH * 2 + 1.0)
    put(out, coll, L, side_xf(0, W, D))
    # sides and back
    for side in (1, 2, 3):
        L = []; span = W if side == 2 else D
        us = (-2.8, 0.0, 2.8) if side == 2 else (-1.8, 1.8)
        for f in range(N):
            zf = P + FH * f
            for u in us: window(L, M, u, zf + (1.0 if f == 0 else 0.8), 1.0 if f == 0 else 1.1, 1.5 if f == 0 else 1.9, shutter=f > 0, grille=f == 0)
        if side == 2: ac_unit(L, M, -4.2, P + FH + 1.0); ac_unit(L, M, 4.2, P + FH * 2 + 1.0)
        if side == 1: L.append(('drainpipe', cyl(0.06, top - 0.3, (span / 2 - 0.5, -0.12, 0.1), seg=8), M['metal']))
        put(out, coll, L, side_xf(side, W, D))

    # roof: parapet, stair bulkhead with dome and door, tanks, solar boilers, dish, antenna, plants
    parapet(out, coll, M, W, D, top)
    bx, by = 3.0, 2.0
    out.append(mesh('bulkhead', box(2.6, 2.6, 2.5, (bx, by, top), bevel_w=0.04), M['stone'], coll))
    out.append(mesh('bulk_cornice', box(2.8, 2.8, 0.14, (bx, by, top + 2.5), bevel_w=0.03), M['stone_light'], coll))
    out.append(mesh('bulk_dome', dome(1.05, (bx, by, top + 2.64), seg=14, rings=5), M['stone_light'], coll))
    out.append(mesh('bulk_finial', cyl(0.06, 0.4, (bx, by, top + 3.65), seg=6), M['metal'], coll))
    L = []; door(L, M, 0.0, 0.9, 2.0, steps=0); put(out, coll, L, side_xf(0, 2.6, 2.6, bx, by))
    for (x, y) in [(-3.6, 2.6), (-2.2, 2.9), (-3.6, 1.2)]: water_tank(out, coll, M, x, y, top)
    solar_heater(out, coll, M, -0.6, -1.8, top); solar_heater(out, coll, M, -2.6, -1.8, top)
    dish(out, coll, M, 4.0, -3.0, top, rz=0.4)
    out.append(mesh('antenna', cyl(0.025, 3.2, (0.8, 3.0, top), seg=6), M['metal'], coll))
    for k in range(3): out.append(mesh('antenna_bar', cyl(0.012, 0.9 - 0.2 * k, (0.35 + 0.1 * k, 3.0, top + 2.2 + 0.35 * k), seg=4, axis='X'), M['metal'], coll))
    pot_plant(out, coll, M, 1.5, -3.3, top); pot_plant(out, coll, M, 4.2, -1.0, top, 0.8)
    pot_plant(out, coll, M, -4.2, -4.6, 0.0, 1.1)
    return out
