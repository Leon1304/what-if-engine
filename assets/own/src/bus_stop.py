# Bus shelter (3.6 × 1.6 × 2.6 m), open towards -y (the road): steel frame, curved-edge roof with gutter, glass back and side panels
# with frame bars, a glowing advert box on one side, slatted bench, timetable case, bus-stop sign on its own pole, litter bin.
# Materials: metal, metal_dark, glass, wood, white, lamp, plastic, void.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/bus_stop.py
use('_street.py')
AO = {'strength': 0.55, 'dist': 0.5}

def build(coll):
    M = street_mats(); Lm = light_mats(); out = []
    sign = mat('sign_green', '#2E7D4F', 0.6)
    add = lambda n, bm, m: out.append(mesh(n, bm, m, coll))
    L, D, H = 3.6, 1.5, 2.45
    for x in (-L / 2, 0.0, L / 2):
        add(f'post_back{x}', box(0.08, 0.08, H, (x, D / 2, 0)), M['metal'])
    for x in (-L / 2, L / 2): add(f'post_front{x}', box(0.08, 0.08, H, (x, -D / 2 + 0.2, 0)), M['metal'])
    add('roof', box(L + 0.4, D + 0.3, 0.1, (0, 0.05, H), bevel_w=0.03), M['metal_d'])
    add('roof_edge', box(L + 0.42, 0.08, 0.16, (0, -D / 2 - 0.1, H - 0.03), bevel_w=0.02), M['metal'])
    add('gutter', cyl(0.05, L + 0.3, (-L / 2 - 0.15, D / 2 + 0.2, H - 0.02), seg=8, axis='X'), M['metal'])
    add('beam_back', box(L, 0.08, 0.12, (0, D / 2, H - 0.12)), M['metal'])
    # glass panels with bottom and middle bars
    for k, x in enumerate((-L / 4, L / 4)):
        add(f'glass_back{k}', box(L / 2 - 0.1, 0.02, H - 0.35, (x, D / 2, 0.2)), M['glass'])
    add('rail_back', box(L, 0.05, 0.05, (0, D / 2, 1.1)), M['metal'])
    add('glass_side', box(0.02, D - 0.25, H - 0.35, (-L / 2, 0.1, 0.2)), M['glass'])
    # advert box on the right side (glowing)
    add('ad_frame', box(0.16, D - 0.2, H - 0.3, (L / 2, 0.1, 0.15), bevel_w=0.02), M['metal_d'])
    for s in (-1, 1): add(f'ad{s}', box(0.01, D - 0.4, H - 0.6, (L / 2 + s * 0.085, 0.1, 0.3)), Lm['lamp'])
    # bench, timetable, sign pole, bin
    for k in range(3): add(f'bench_slat{k}', box(2.2, 0.09, 0.035, (-0.4, 0.35 + k * 0.11, 0.45), bevel_w=0.008), M['wood'])
    for x in (-1.4, 0.6): add(f'bench_leg{x}', box(0.05, 0.4, 0.45, (x, 0.46, 0)), M['metal_d'])
    add('timetable', box(0.5, 0.03, 0.7, (-1.3, D / 2 - 0.03, 1.2)), M['white'])
    add('timetable_rows', box(0.4, 0.01, 0.5, (-1.3, D / 2 - 0.05, 1.3)), M['plastic'])
    add('sign_pole', cyl(0.04, 2.9, (L / 2 + 0.5, -D / 2 - 0.1, 0), seg=8), M['metal'])
    add('sign', box(0.5, 0.04, 0.5, (L / 2 + 0.5, -D / 2 - 0.1, 2.4), bevel_w=0.02), sign)
    add('sign_bus', box(0.3, 0.01, 0.16, (L / 2 + 0.5, -D / 2 - 0.13, 2.6)), M['white'])
    add('bin', cyl(0.18, 0.6, (-L / 2 - 0.4, -D / 2 + 0.2, 0.25), seg=10), M['metal'])
    add('bin_post', box(0.05, 0.05, 0.85, (-L / 2 - 0.4, -D / 2 + 0.42, 0)), M['metal_d'])
    add('bin_hole', cyl(0.12, 0.01, (-L / 2 - 0.4, -D / 2 + 0.2, 0.85), seg=10), M['void'])
    add('pad', box(L + 0.6, D + 0.4, 0.03, (0, 0.05, 0)), M['paver_d'])
    return out
