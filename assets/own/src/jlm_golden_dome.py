# Large octagonal shrine with a golden dome in the style of Jerusalem's skyline landmark, at real scale (~56 m across the platform,
# ~36 m to the finial): stepped stone platform, octagon with white marble lower walls and blue tiled upper walls, seven arched windows
# per side, crenellated parapet, four entrance porches with columns, tiled drum with sixteen windows, gilded dome and finial.
# Materials: stone, stone_light, stone_dark, marble, tile_blue, tile_dark, lead, gold, void, metal.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/jlm_golden_dome.py
use('_jlm.py')
AO = {'strength': 0.55, 'dist': 3.0}

def build(coll):
    M = jlm_mats(); out = []
    marble, tile, tile_d = mat('marble', '#E8E5DC', 0.6), mat('tile_blue', '#2F6CA6', 0.45), mat('tile_dark', '#1F4A78', 0.5)
    gold = mat('gold', '#D9AC3C', 0.3, 0.85)
    R = 20.6 / (2 * math.sin(math.pi / 8))           # circumradius of an octagon with 20.6 m sides
    oct8 = lambda r, h, z, m, name: out.append(mesh(name, rotz(cyl(r, h, (0, 0, z), seg=8), math.pi / 8), m, coll))
    # stepped platform
    for k, (r, h) in enumerate([(R + 3.0, 0.3), (R + 2.4, 0.3), (R + 1.8, 0.3)]):
        oct8(r, h, 0.3 * k, M['stone_dark'] if k % 2 == 0 else M['stone'], f'platform{k}')
    z0 = 0.9
    oct8(R, 5.5, z0, marble, 'wall_low')
    oct8(R + 0.15, 0.35, z0 + 5.5, M['stone_light'], 'band')
    oct8(R - 0.05, 6.2, z0 + 5.85, tile, 'wall_tiles')
    oct8(R + 0.2, 0.4, z0 + 12.05, tile_d, 'frieze')
    zt = z0 + 12.45
    # crenellations along each side, windows on each side (upper tile zone), corner pilasters
    side_len = 20.6; a_r = R * math.cos(math.pi / 8)   # apothem
    for s in range(8):
        a = math.pi / 4 * s + math.pi / 2                   # facade facing direction angle
        L = []
        for k in range(7):
            u = -side_len / 2 + side_len * (k + 0.5) / 7
            L.append(('win_frame', prism(arch_pts(1.55, 3.2, u, 6.9 - 0.05), 0.06, -0.06), tile_d))
            L.append(('win', prism(arch_pts(1.25, 2.95, u, 6.9), 0.02, -0.075), M['void']))
            L.append(('win_grille', box(0.04, 0.03, 2.4, (u, -0.09, 6.95)), M['metal']))
            L.append(('panel', prism(arch_pts(1.6, 3.2, u, 1.6), 0.03, -0.04), M['stone_light']))
        for k in range(14):
            u = -side_len / 2 + side_len * (k + 0.5) / 14
            L.append(('merlon', box(0.7, 0.5, 0.7, (u, 0.25, 12.45)), M['stone_light']))
        if s % 2 == 0:   # entrance porch on four sides
            for u in (-3.2, -1.1, 1.1, 3.2):
                L.append(('porch_col', cyl(0.3, 4.2, (u, -3.4, 0.0), seg=10), marble))
                L.append(('porch_cap', box(0.8, 0.8, 0.3, (u, -3.4, 4.2), bevel_w=0.05), M['stone_light']))
            L.append(('porch_spandrel', prism(spandrel(0.0, 2.2, 4.5, 6.4) , 0.6, -3.7), M['stone_light']))
            for c in (-2.15, 2.15): L.append(('porch_side', prism(spandrel(c, 1.9, 4.5, 6.4), 0.6, -3.7), M['stone_light']))
            L.append(('porch_roof', box(7.6, 3.8, 0.5, (0, -1.9, 6.4), bevel_w=0.06), M['stone_light']))
            L.append(('porch_door', prism(arch_pts(2.2, 4.0, 0, 0.0), 0.05, -0.06), tile_d))
            L.append(('porch_floor', box(7.6, 3.8, 0.12, (0, -1.9, 0.0)), marble))
        c, sn = math.cos(a), math.sin(a)
        for n, bm, m in L:
            rotz(bm, a + math.pi / 2); move(bm, (a_r * c, a_r * sn, z0)); out.append(mesh(n, bm, m, coll))
    # lead roof sloping from the parapet up to the drum
    lead = mat('lead', '#8C9196', 0.6, 0.3)
    rd = 10.2
    rf = cyl(R - 0.3, 1.6, (0, 0, zt - 0.05), seg=8, r2=rd + 0.6); rotz(rf, math.pi / 8)
    out.append(mesh('roof', rf, lead, coll))
    # drum and dome
    out.append(mesh('drum_base', cyl(rd + 0.5, 0.6, (0, 0, zt + 1.4), seg=24), M['stone_light'], coll))
    out.append(mesh('drum', cyl(rd, 7.6, (0, 0, zt + 1.4), seg=24), tile, coll))
    for k in range(16):
        a = 2 * math.pi * k / 16
        for n, bm, m in [('drum_win_frame', prism(arch_pts(1.3, 3.4, 0, 2.3), 0.06, -0.06), tile_d), ('drum_win', prism(arch_pts(1.0, 3.1, 0, 2.45), 0.02, -0.08), M['void'])]:
            rotz(bm, a + math.pi / 2); move(bm, (rd * math.cos(a), rd * math.sin(a), zt + 0.6)); out.append(mesh(n, bm, m, coll))
    out.append(mesh('drum_cornice', cyl(rd + 0.35, 0.5, (0, 0, zt + 9.0), seg=24), tile_d, coll))
    out.append(mesh('dome', dome(rd + 0.2, (0, 0, zt + 9.5), seg=32, rings=10, h=11.0), gold, coll))
    for k in range(32):   # gilded ribs
        a = 2 * math.pi * k / 32
        if k % 4: continue
        for j in range(9):
            ph = math.pi / 2 * (j + 0.5) / 10
            out.append(mesh('dome_rib', move(rotz(box(0.25, 0.4, 0.5, (0, 0, 0)), a), ((rd + 0.27) * math.cos(ph) * math.cos(a), (rd + 0.27) * math.cos(ph) * math.sin(a), zt + 9.3 + 11.0 * math.sin(ph))), gold, coll))
    out.append(mesh('finial_base', cyl(0.6, 0.8, (0, 0, zt + 20.4), seg=10), gold, coll))
    for k, (r, z) in enumerate([(0.45, 21.4), (0.32, 22.2), (0.22, 22.8)]):
        out.append(mesh(f'finial_ball{k}', dome(r, (0, 0, zt + z), seg=10, rings=3), gold, coll))
    out.append(mesh('finial_rod', cyl(0.08, 2.8, (0, 0, zt + 21.0), seg=6), gold, coll))
    return out
