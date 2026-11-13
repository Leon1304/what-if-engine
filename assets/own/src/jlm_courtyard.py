# Jerusalem-style domed house, 2 storeys (~11 × 13 m footprint incl. loggia and stair, ~11.6 m to the finial): arcaded loggia with
# columns and a roof terrace with balustrade, arched windows with shutters and grilles, central stone dome on a windowed drum,
# exterior stair with railing up the right side, parapet, water tanks, solar boiler, olive tree and potted plants. Materials: see _jlm.py.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/jlm_courtyard.py
use('_jlm.py')
AO = {'strength': 0.6, 'dist': 1.2}

def build(coll):
    M = jlm_mats(); out = []
    W, D, P, FH, N = 11.0, 9.0, 0.4, 3.4, 2
    top = P + FH * N
    out.append(mesh('plinth', box(W + 0.14, D + 0.14, P, bevel_w=0.03), M['stone_dark'], coll))
    out.append(mesh('body', box(W, D, top - P, (0, 0, P), bevel_w=0.04), M['stone'], coll))
    courses(out, coll, M, W, D, [P + FH - 0.06])
    out.append(mesh('cornice', box(W + 0.3, D + 0.3, 0.18, (0, 0, top - 0.18), bevel_w=0.04), M['stone_light'], coll))

    # loggia in front: four columns, three arches, slab with balustrade (terrace for the upper floor)
    LD, zs, zt = 2.4, 2.3, 3.7
    yl = -D / 2 - LD
    out.append(mesh('loggia_floor', box(W - 0.6, LD + 0.1, P, (0, -D / 2 - LD / 2, 0), bevel_w=0.03), M['stone_dark'], coll))
    for u in (-4.5, -1.5, 1.5, 4.5):
        out.append(mesh('col_base', box(0.55, 0.55, 0.25, (u, yl + 0.3, P), bevel_w=0.03), M['stone_light'], coll))
        out.append(mesh('column', cyl(0.2, zs - P - 0.45, (u, yl + 0.3, P + 0.25), seg=10), M['stone_light'], coll))
        out.append(mesh('capital', box(0.55, 0.55, 0.2, (u, yl + 0.3, zs - 0.2), bevel_w=0.04), M['stone_light'], coll))
    for c in (-3.0, 0.0, 3.0):
        out.append(mesh('spandrel', prism(spandrel(c, 2.6, zs, zt), 0.5, yl + 0.05), M['stone'], coll))
        out.append(mesh('arch_ring', prism(spandrel(c, 2.6, zs, zs + 1.3 + 0.12), 0.06, yl - 0.01), M['stone_light'], coll))
    for c in (-4.5, 4.5): out.append(mesh('spandrel_end', box(0.4, 0.5, zt - zs, (c, yl + 0.3, zs)), M['stone'], coll))
    out.append(mesh('loggia_roof', box(W - 0.4, LD + 0.1, 0.25, (0, -D / 2 - LD / 2, zt), bevel_w=0.03), M['stone_light'], coll))
    for k in range(17):
        u = -4.8 + k * 0.6
        out.append(mesh('baluster', cyl(0.07, 0.65, (u, yl + 0.15, zt + 0.25), seg=6, r2=0.05), M['stone_light'], coll))
    out.append(mesh('bal_rail', box(W - 0.6, 0.22, 0.12, (0, yl + 0.15, zt + 0.9), bevel_w=0.02), M['stone_light'], coll))
    for s in (-1, 1): out.append(mesh('bal_side', box(0.22, LD - 0.2, 0.12, (s * (W / 2 - 0.5), -D / 2 - LD / 2 + 0.1, zt + 0.9)), M['stone_light'], coll))

    L = []
    door(L, M, 0.0, 1.5, 2.6, steps=0)
    for u in (-3.2, 3.2): window(L, M, u, P + 0.9, 1.1, 1.6, grille=True)
    for u in (-3.2, 0.0, 3.2): window(L, M, u, P + FH + 0.8, 1.1, 1.9, shutter=True)
    put(out, coll, L, side_xf(0, W, D))
    for side in (1, 2, 3):
        L = []; span = W if side == 2 else D
        for f in range(N):
            for u in ((-3.0, 0.0, 3.0) if side == 2 else (-2.4, 2.4)):
                if side == 1 and f == 1 and u > 0: continue   # stair landing
                window(L, M, u, P + FH * f + (1.0 if f == 0 else 0.8), 1.0, 1.6 if f == 0 else 1.9, shutter=f > 0, grille=f == 0)
        if side == 2: ac_unit(L, M, 4.5, P + FH + 1.2)
        put(out, coll, L, side_xf(side, W, D))

    # exterior stair up the right side to the roof
    n = 20; rise = (top - 0.0) / n
    for k in range(n):
        y = -D / 2 + 0.6 + k * (D - 1.4) / n
        out.append(mesh('stair', box(1.1, (D - 1.4) / n + 0.02, rise * (k + 1), (W / 2 + 0.55, y + (D - 1.4) / n / 2, 0)), M['stone'], coll))
        out.append(mesh('stair_nose', box(1.16, 0.07, 0.05, (W / 2 + 0.55, y + 0.02, rise * (k + 1) - 0.03)), M['stone_light'], coll))
        if k % 2 == 0: out.append(mesh('stair_joint', box(0.02, (D - 1.4) / n, rise * (k + 1) - 0.1, (W / 2 + 1.105, y + (D - 1.4) / n / 2, 0.05)), M['stone_dark'], coll))
    for k in range(0, n + 1, 4):
        y = -D / 2 + 0.6 + k * (D - 1.4) / n
        out.append(mesh('stair_post', box(0.04, 0.04, 1.0, (W / 2 + 1.06, y, rise * k)), M['rail'], coll))
    rl = cyl(0.025, math.hypot(D - 1.4, top), (0, 0, 0), seg=5, axis='Y')
    bmesh.ops.rotate(rl, cent=(0, 0, 0), matrix=Matrix.Rotation(math.atan2(top, D - 1.4), 3, 'X'), verts=rl.verts)
    out.append(mesh('stair_rail', move(rl, (W / 2 + 1.06, -D / 2 + 0.6, 1.0)), M['rail'], coll))

    # roof: parapet, drum with small windows, dome, finial; tanks, solar boiler
    parapet(out, coll, M, W, D, top, h=0.7)
    out.append(mesh('drum', cyl(2.7, 1.3, (0, 0.5, top), seg=16, bevel_w=0.03), M['stone'], coll))
    out.append(mesh('drum_cornice', cyl(2.85, 0.15, (0, 0.5, top + 1.3), seg=16), M['stone_light'], coll))
    for k in range(8):
        a = 2 * math.pi * k / 8
        w_ = prism(arch_pts(0.35, 0.7, 0, 0), 0.04, -0.03); bmesh.ops.rotate(w_, cent=(0, 0, 0), matrix=Matrix.Rotation(a + math.pi / 2, 3, 'Z'), verts=w_.verts)
        out.append(mesh('drum_win', move(w_, (2.7 * math.cos(a), 0.5 + 2.7 * math.sin(a), top + 0.3)), M['void'], coll))
    out.append(mesh('dome', dome(2.7, (0, 0.5, top + 1.45), seg=20, rings=6, h=2.3), M['stone_light'], coll))
    out.append(mesh('finial', cyl(0.07, 0.6, (0, 0.5, top + 3.7), seg=6), M['metal'], coll))
    out.append(mesh('finial_ball', dome(0.14, (0, 0.5, top + 4.2), seg=8, rings=3), M['metal'], coll))
    for (x, y) in [(-4.2, 3.2), (-3.0, 3.4)]: water_tank(out, coll, M, x, y, top)
    solar_heater(out, coll, M, 3.8, -2.6, top)
    pot_plant(out, coll, M, -4.4, -3.6, top, 0.9); pot_plant(out, coll, M, -3.8, -D / 2 - 1.6, P, 1.0); pot_plant(out, coll, M, 3.8, -D / 2 - 1.6, P, 1.0)
    olive_tree(out, coll, M, -W / 2 - 1.3, -D / 2 - 2.2, 0, 1.2)
    return out
