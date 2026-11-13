# Delivery van (generic, no brand), 5.2 × 1.95 × 2.25 m, front towards -y (= the direction drive() moves it): short bonnet,
# steep windscreen, high box body with sliding side door and twin rear doors (seams, handles, hinges), roof rack with ladder at the back,
# side rub strips, step, mirrors on arms, bumpers, grille, headlights and taillights (glowing), plates, four wheels.
# Materials (tint keys): paint (body colour, white by default), glass, plastic, tire, rim, metal, metal_dark, headlight, taillight, white, void.
# Wheels are parts wheel_fl/fr/rl/rr (drive() turns them, front ones steer). Use: asset(world, 'own/car_van', x, z, { dyn: true, tint: { paint: '#3E6E9E' } }) and drive() it.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/car_van.py
use('_street.py')
AO = {'strength': 0.55, 'dist': 0.5}

def build(coll):
    M = street_mats(); Lm = light_mats(); out = []
    paint = mat('paint', '#E9E8E3', 0.4, 0.3)
    add = lambda n, bm, m: out.append(mesh(n, bm, m, coll))
    W, HW = 1.95, 0.975
    ua, ub = -1.75, 1.7          # axles
    body = [(-2.55, 0.34), (ua - 0.44, 0.34)] + [(ua - 0.44 * math.cos(math.pi * j / 8), 0.36 + 0.42 * math.sin(math.pi * j / 8)) for j in range(1, 8)] + [(ua + 0.44, 0.34),
            (ub - 0.44, 0.34)] + [(ub - 0.44 * math.cos(math.pi * j / 8), 0.36 + 0.42 * math.sin(math.pi * j / 8)) for j in range(1, 8)] + [(ub + 0.44, 0.34),
            (2.6, 0.34), (2.6, 2.2), (-1.2, 2.2), (-1.65, 1.3), (-2.5, 1.12), (-2.62, 0.7)]
    add('body', side_prism(body, -HW, HW), paint)
    add('roof_cap', side_prism([(-1.15, 2.2), (2.58, 2.2), (2.56, 2.25), (-1.1, 2.25)], -HW + 0.05, HW - 0.05), paint)
    # glass: windscreen and cab side windows
    add('windscreen', side_prism([(-1.66, 1.32), (-1.62, 1.3), (-1.18, 2.12), (-1.22, 2.14)], -HW + 0.12, HW - 0.12), M['glass'])
    for s in (-1, 1):
        xa, xb = (HW - 0.005, HW + 0.01) if s > 0 else (-HW - 0.01, -HW + 0.005)
        add(f'cab_window{s}', side_prism([(-1.55, 1.36), (-0.55, 1.36), (-0.55, 2.0), (-1.15, 2.0)], xa, xb), M['glass'])
        add(f'side_window{s}', side_prism([(0.1, 1.45), (1.0, 1.45), (1.0, 1.95), (0.1, 1.95)], xa, xb), M['glass'])
        # seams: cab door, sliding door with rail, handles, rub strip, step, mirror on its arm
        for u in (-1.6, -0.5, 0.05, 1.15): add(f'seam{s}{u}', box(0.012, 0.012, 1.7, (s * (HW + 0.002), u, 0.42)), M['void'])
        add(f'slide_rail{s}', box(0.02, 1.9, 0.03, (s * (HW + 0.01), 0.9, 1.98)), M['metal_d'])
        for u in (-0.75, 0.2): add(f'handle{s}{u}', box(0.03, 0.18, 0.04, (s * (HW + 0.015), u, 1.15)), M['plastic'])
        add(f'rub{s}', box(0.03, 4.4, 0.1, (s * (HW + 0.012), 0.1, 0.78)), M['plastic'])
        add(f'step{s}', box(0.2, 0.9, 0.05, (s * (HW - 0.05), -1.0, 0.3)), M['plastic'])
        add(f'mirror_arm{s}', box(0.25, 0.04, 0.04, (s * (HW + 0.1), -1.5, 1.6)), M['plastic'])
        add(f'mirror{s}', box(0.06, 0.18, 0.32, (s * (HW + 0.24), -1.5, 1.45), bevel_w=0.02), M['plastic'])
        add(f'indicator{s}', box(0.02, 0.1, 0.05, (s * (HW + 0.005), -2.25, 0.95)), Lm['yellow'])
        for u in (ua, ub): wheel(out, coll, M, s * (HW - 0.14), u, r=0.34, w=0.23, side=s, name=f"wheel_{'f' if u < 0 else 'r'}{'r' if s > 0 else 'l'}", steer=1 if u < 0 else 0)
    for u in (ua, ub):
        add(f'well{u}', side_prism([(u + 0.44 * math.cos(math.pi * j / 8), 0.36 + 0.42 * math.sin(math.pi * j / 8)) for j in range(9)], -HW + 0.27, HW - 0.27), M['plastic'])
    # front
    add('bumper_f', box(W + 0.04, 0.25, 0.32, (0, -2.52, 0.28), bevel_w=0.05), M['plastic'])
    add('grille', box(1.1, 0.04, 0.3, (0, -2.63, 0.68)), M['void'])
    for k in range(3): add(f'grille_bar{k}', box(1.1, 0.02, 0.03, (0, -2.66, 0.73 + 0.08 * k)), M['plastic'])
    for s in (-1, 1): add(f'headlight{s}', box(0.36, 0.06, 0.18, (s * 0.7, -2.6, 0.76), bevel_w=0.02), Lm['head'])
    add('plate_f', box(0.52, 0.02, 0.12, (0, -2.66, 0.36)), M['white'])
    for s in (-1, 1): add(f'wiper{s}', box(0.6, 0.02, 0.02, (s * 0.35, -1.6, 1.34), rz=s * 0.1), M['plastic'])
    # back: twin doors, hinges, handle, lights, bumper, plate
    add('door_seam_r', box(0.012, 0.012, 1.75, (0, 2.605, 0.4)), M['void'])
    for s in (-1, 1):
        for z in (0.7, 1.4, 1.95): add(f'hinge{s}{z}', box(0.06, 0.03, 0.1, (s * (HW - 0.05), 2.61, z)), M['metal_d'])
        add(f'taillight{s}', box(0.14, 0.06, 0.5, (s * (HW - 0.1), 2.6, 0.75), bevel_w=0.02), Lm['tail'])
        add(f'rear_window{s}', box(0.6, 0.02, 0.45, (s * 0.42, 2.605, 1.55)), M['glass'])
    add('rear_handle', box(0.04, 0.03, 0.18, (0.1, 2.62, 1.1)), M['plastic'])
    add('bumper_r', box(W + 0.04, 0.2, 0.3, (0, 2.62, 0.28), bevel_w=0.05), M['plastic'])
    add('plate_r', box(0.52, 0.02, 0.12, (0, 2.73, 0.36)), M['white'])
    # roof rack and ladder
    for u in (-0.7, 0.3, 1.3, 2.3): add(f'rack_bar{u}', box(W - 0.2, 0.05, 0.05, (0, u, 2.33)), M['metal'])
    for s in (-1, 1):
        add(f'rack_side{s}', box(0.05, 3.1, 0.05, (s * (HW - 0.12), 0.8, 2.33)), M['metal'])
        for u in (-0.7, 2.3): add(f'rack_foot{s}{u}', box(0.06, 0.06, 0.1, (s * (HW - 0.12), u, 2.25)), M['metal_d'])
    for x in (-0.55, -0.25): add(f'ladder_rail{x}', box(0.04, 0.04, 1.8, (x, 2.66, 0.55)), M['metal'])
    for k in range(6): add(f'ladder_rung{k}', box(0.32, 0.03, 0.03, (-0.4, 2.66, 0.75 + k * 0.3)), M['metal'])
    add('underbody', box(W - 0.4, 4.6, 0.12, (0, 0, 0.22)), M['plastic'])
    return out
