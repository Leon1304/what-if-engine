# Delivery van (generic, no brand), 5.2 × 1.95 × 2.25 m, front towards -y (= the direction drive() moves it): short bonnet,
# steep windscreen, high box body with sliding side door and twin rear doors (seams, handles, hinges), roof rack with ladder at the back,
# side rub strips, step, mirrors on arms, bumpers, grille, headlights and taillights (glowing), plates, four wheels.
# Materials (tint keys): paint (body colour, white by default), glass, plastic, tire, rim, metal, metal_dark, headlight, taillight, white, void.
# Wheels are parts wheel_fl/fr/rl/rr (drive() turns them, front ones steer). Use: asset(world, 'own/car_van', x, z, { dyn: true, tint: { paint: '#3E6E9E' } }) and drive() it.
# v3.26 doors (parts, openDoor(van, t, { i })): door_1 driver cab door (+x in three.js), door_2 passenger cab door (both with window, mirror, handle, inner card),
# door_3 / door_4 rear doors (+x / -x, hinged at the rear pillars, swing out ~95°; door_4 carries the ladder); dark cab and cargo openings behind them.
# Marks: seat_driver, seat_pass (seat surface, facing forward), door_1_out, door_2_out (beside the cab doors, facing the van), door_3_out, door_4_out (behind the van, facing it).
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/car_van.py
use('_street.py')
AO = {'strength': 0.55, 'dist': 0.5}

def build(coll):
    M = street_mats(); Lm = light_mats(); out = []
    paint = mat('paint', '#E9E8E3', 0.4, 0.3)
    def add(n, bm, m): o = mesh(n, bm, m, coll); out.append(o); return o
    W, HW = 1.95, 0.975
    SK, UR = 0.06, 2.55          # side skin depth; the core ends at UR, the rear doors fill UR … 2.6
    D = {n: [] for n in ('door_1', 'door_2', 'door_3', 'door_4')}
    cab = lambda s: 'door_1' if s > 0 else 'door_2'
    def dadd(n, nm, bm, m): o = add(nm, bm, m); D[n].append(o); return o
    ua, ub = -1.75, 1.7          # axles
    body = [(-2.55, 0.34), (ua - 0.44, 0.34)] + [(ua - 0.44 * math.cos(math.pi * j / 8), 0.36 + 0.42 * math.sin(math.pi * j / 8)) for j in range(1, 8)] + [(ua + 0.44, 0.34),
            (ub - 0.44, 0.34)] + [(ub - 0.44 * math.cos(math.pi * j / 8), 0.36 + 0.42 * math.sin(math.pi * j / 8)) for j in range(1, 8)] + [(ub + 0.44, 0.34),
            (2.6, 0.34), (2.6, 2.2), (-1.2, 2.2), (-1.65, 1.3), (-2.5, 1.12), (-2.62, 0.7)]
    add('body', side_prism(clip_poly(body, u1=UR), -HW + SK, HW - SK), paint)
    for s in (-1, 1):   # side skins: nose, cab door (up to the roof seam), the rest; dark cab behind the door; scuff plate
        add(f'skin_front{s}', side_prism(clip_poly(body, u1=-1.6), *side_x(s, HW, 0, SK)), paint)
        dadd(cab(s), f'door_skin{s}', side_prism(clip_poly(body, -1.6, -0.5, 2.05), *side_x(s, HW, 0, SK)), paint)
        add(f'skin_top{s}', side_prism(clip_poly(body, -1.6, -0.5, z0=2.05), *side_x(s, HW, 0, SK)), paint)
        add(f'skin_side{s}', side_prism(clip_poly(body, u0=-0.5), *side_x(s, HW, 0, SK)), paint)
        add(f'cab_dark{s}', box(0.025, 0.98, 1.56, (s * (HW - SK - 0.0075), -1.05, 0.42)), M['void'])
        add(f'cab_scuff{s}', box(0.05, 0.9, 0.012, (s * (HW - SK - 0.02), -1.05, 0.4)), M['rim'])
        x0, x1 = side_x(s, HW, SK, SK + 0.01)
        dadd(cab(s), f'door_card{s}', side_prism(clip_poly(body, -1.56, -0.54, 1.95, 0.45), x0, x1), M['plastic'])
        dadd(cab(s), f'door_arm{s}', box(0.05, 0.45, 0.05, (s * (HW - SK - 0.035), -0.95, 1.05), bevel_w=0.01), M['plastic'])
        dadd(cab(s), f'door_pull{s}', box(0.03, 0.12, 0.03, (s * (HW - SK - 0.02), -1.25, 1.2)), M['rim'])
        dadd(cab(s), f'door_pocket{s}', box(0.04, 0.6, 0.18, (s * (HW - SK - 0.03), -1.0, 0.55)), M['plastic'])
    add('roof_cap', side_prism([(-1.15, 2.2), (2.58, 2.2), (2.56, 2.25), (-1.1, 2.25)], -HW + 0.05, HW - 0.05), paint)
    # glass: windscreen and cab side windows
    add('windscreen', side_prism([(-1.66, 1.32), (-1.62, 1.3), (-1.18, 2.12), (-1.22, 2.14)], -HW + 0.12, HW - 0.12), M['glass'])
    for s in (-1, 1):
        xa, xb = (HW - 0.005, HW + 0.01) if s > 0 else (-HW - 0.01, -HW + 0.005)
        dadd(cab(s), f'cab_window{s}', side_prism([(-1.55, 1.36), (-0.55, 1.36), (-0.55, 2.0), (-1.15, 2.0)], xa, xb), M['glass'])
        add(f'side_window{s}', side_prism([(0.1, 1.45), (1.0, 1.45), (1.0, 1.95), (0.1, 1.95)], xa, xb), M['glass'])
        # seams: cab door, sliding door with rail, handles, rub strip, step, mirror on its arm
        for u in (-1.6, -0.5, 0.05, 1.15):
            if u < 0: dadd(cab(s), f'seam{s}{u}', box(0.012, 0.012, 1.62, (s * (HW + 0.002), u + (0.006 if u < -1 else -0.006), 0.42)), M['void'])
            else: add(f'seam{s}{u}', box(0.012, 0.012, 1.7, (s * (HW + 0.002), u, 0.42)), M['void'])
        dadd(cab(s), f'seam_top{s}', box(0.012, 1.1, 0.012, (s * (HW + 0.002), -1.05, 2.04)), M['void'])
        add(f'slide_rail{s}', box(0.02, 1.9, 0.03, (s * (HW + 0.01), 0.9, 1.98)), M['metal_d'])
        dadd(cab(s), f'handle{s}-0.75', box(0.03, 0.18, 0.04, (s * (HW + 0.015), -0.75, 1.15)), M['plastic'])
        add(f'handle{s}0.2', box(0.03, 0.18, 0.04, (s * (HW + 0.015), 0.2, 1.15)), M['plastic'])
        for u0, u1 in ((-2.1, -1.6), (-1.6, -0.5), (-0.5, 2.3)):   # rub strip, cut at the cab door
            rb = box(0.03, u1 - u0, 0.1, (s * (HW + 0.012), (u0 + u1) / 2, 0.78))
            if u0 == -1.6: dadd(cab(s), f'rub{s}{u0}', rb, M['plastic'])
            else: add(f'rub{s}{u0}', rb, M['plastic'])
        add(f'step{s}', box(0.2, 0.9, 0.05, (s * (HW - 0.05), -1.0, 0.27)), M['plastic'])
        dadd(cab(s), f'mirror_arm{s}', box(0.25, 0.04, 0.04, (s * (HW + 0.1), -1.5, 1.6)), M['plastic'])
        dadd(cab(s), f'mirror{s}', box(0.06, 0.18, 0.32, (s * (HW + 0.24), -1.5, 1.45), bevel_w=0.02), M['plastic'])
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
    # back: twin doors (parts) between the rear pillars, sill under them, header over them, dark cargo bay behind
    XP, Z0, Z1 = HW - 0.2, 0.6, 2.15
    for s in (-1, 1):
        x0, x1 = side_x(s, HW, SK, 0.2)
        add(f'pillar_r{s}', box(x1 - x0, 2.6 - UR, 2.2 - 0.34, ((x0 + x1) / 2, (UR + 2.6) / 2, 0.34)), paint)
    add('rear_sill', box(2 * XP, 2.6 - UR, Z0 - 0.34, (0, (UR + 2.6) / 2, 0.34)), paint)
    add('rear_header', box(2 * XP, 2.6 - UR, 2.2 - Z1, (0, (UR + 2.6) / 2, Z1)), paint)
    add('cargo_dark', box(2 * XP - 0.04, 0.025, Z1 - Z0 - 0.04, (0, UR - 0.0075, Z0 + 0.02)), M['void'])
    add('cargo_floor', box(2 * XP - 0.1, 0.06, 0.012, (0, UR + 0.0, Z0 - 0.012)), M['metal'])
    for s, n in ((1, 'door_3'), (-1, 'door_4')):
        dadd(n, f'rdoor{s}', box(XP - 0.004, 2.6 - UR, Z1 - Z0, (s * (XP / 2 + 0.002), (UR + 2.6) / 2, Z0)), paint)
        dadd(n, f'rdoor_card{s}', box(XP - 0.1, 0.01, Z1 - Z0 - 0.12, (s * XP / 2, UR - 0.005, Z0 + 0.06)), M['plastic'])
        dadd(n, f'rear_window{s}', box(0.6, 0.02, 0.45, (s * 0.42, 2.605, 1.55)), M['glass'])
        for z in (0.75, 1.4, 1.95): add(f'hinge{s}{z}', box(0.06, 0.03, 0.1, (s * (XP + 0.01), 2.61, z)), M['metal_d'])
        add(f'taillight{s}', box(0.14, 0.06, 0.5, (s * (HW - 0.1), 2.6, 0.75), bevel_w=0.02), Lm['tail'])
    dadd('door_3', 'door_seam_r', box(0.012, 0.012, Z1 - Z0, (0.006, 2.605, Z0)), M['void'])
    dadd('door_3', 'rear_handle', box(0.04, 0.03, 0.18, (0.1, 2.62, 1.1)), M['plastic'])
    add('bumper_r', box(W + 0.04, 0.2, 0.3, (0, 2.62, 0.28), bevel_w=0.05), M['plastic'])
    add('plate_r', box(0.52, 0.02, 0.12, (0, 2.73, 0.36)), M['white'])
    # roof rack and ladder
    for u in (-0.7, 0.3, 1.3, 2.3): add(f'rack_bar{u}', box(W - 0.2, 0.05, 0.05, (0, u, 2.33)), M['metal'])
    for s in (-1, 1):
        add(f'rack_side{s}', box(0.05, 3.1, 0.05, (s * (HW - 0.12), 0.8, 2.33)), M['metal'])
        for u in (-0.7, 2.3): add(f'rack_foot{s}{u}', box(0.06, 0.06, 0.1, (s * (HW - 0.12), u, 2.25)), M['metal_d'])
    for x in (-0.55, -0.25): dadd('door_4', f'ladder_rail{x}', box(0.04, 0.04, 1.73, (x, 2.66, 0.62)), M['metal'])   # ladder on the left rear door (swings with it)
    for k in range(6): dadd('door_4', f'ladder_rung{k}', box(0.32, 0.03, 0.03, (-0.4, 2.66, 0.75 + k * 0.3)), M['metal'])
    add('underbody', box(W - 0.4, 4.6, 0.12, (0, 0, 0.22)), M['plastic'])
    for s in (-1, 1):   # cab doors: hinge on the skin at the front edge; rear doors: hinge at the rear pillars, swing out to the sides
        part(D[cab(s)], cab(s), pivot=(s * HW, -1.6, 1.0), sign=-s, angle=1.15)
        mark(cab(s) + '_out', (s * (HW + 0.55), -0.85, 0.0), -s * math.pi / 2, coll)
    part(D['door_3'], 'door_3', pivot=(XP, 2.6, 1.0), sign=-1, angle=1.65)
    part(D['door_4'], 'door_4', pivot=(-XP, 2.6, 1.0), sign=1, angle=1.65)
    mark('door_3_out', (0.4, 3.5, 0.0), 0.0, coll); mark('door_4_out', (-0.4, 3.5, 0.0), 0.0, coll)
    mark('seat_driver', (0.45, -0.95, 0.95), 0.0, coll)
    mark('seat_pass', (-0.45, -0.95, 0.95), 0.0, coll)
    return out
