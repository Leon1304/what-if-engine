# Small five-door hatchback (generic, no brand), 4.0 × 1.76 × 1.5 m, front towards -y (= the direction drive() moves it):
# body side profile with wheel arches, glass house with A/B/C pillars, roof, bonnet and tailgate seams, door seams and handles,
# mirrors, bumpers with grille and number plates, headlights and taillights (glowing), wipers, four wheels with rims, hubs and nuts.
# Materials (tint keys): paint (body colour), glass, plastic, tire, rim, metal_dark, headlight, taillight, white, void.
# Use: asset(world, 'own/car_hatch', x, z, { dyn: true, tint: { paint: '#B03A2E' } }) and drive() it.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/car_hatch.py
use('_street.py')
AO = {'strength': 0.55, 'dist': 0.5}

def build(coll):
    M = street_mats(); Lm = light_mats(); out = []
    paint = mat('paint', '#9EA6AD', 0.35, 0.45)
    add = lambda n, bm, m: out.append(mesh(n, bm, m, coll))
    W, HW = 1.76, 0.88
    # lower body (u = along the car, front at -2.0), belt line at 0.98
    body = [(-1.98, 0.30), (-1.62, 0.30), (-1.6, 0.42), (-1.5, 0.6), (-1.25, 0.66), (-1.0, 0.6), (-0.9, 0.42), (-0.88, 0.30),
            (0.92, 0.30), (0.94, 0.42), (1.04, 0.6), (1.29, 0.66), (1.54, 0.6), (1.64, 0.42), (1.66, 0.30), (1.98, 0.30),
            (2.02, 0.62), (1.98, 0.98), (-1.3, 0.98), (-1.92, 0.86), (-2.02, 0.62)]
    add('body', side_prism(body, -HW, HW), paint)
    add('body_bevel', side_prism([(-1.92, 0.86), (-1.3, 0.98), (1.98, 0.98), (1.96, 1.01), (-1.3, 1.01), (-1.9, 0.89)], -HW + 0.04, HW - 0.04), paint)
    # glass house (slightly narrower) with roof and pillars
    gh = [(-1.25, 0.99), (1.92, 0.99), (1.74, 1.38), (1.2, 1.47), (-0.45, 1.47), (-1.25, 0.99)]
    add('glass', side_prism(gh[:-1], -HW + 0.09, HW - 0.09), M['glass'])
    add('roof', side_prism([(-0.48, 1.45), (1.22, 1.45), (1.24, 1.5), (-0.42, 1.5)], -HW + 0.12, HW - 0.12), paint)
    for s in (-1, 1):
        xa, xb = (HW - 0.095, HW - 0.065) if s > 0 else (-HW + 0.065, -HW + 0.095)   # just outside the glass
        add(f'pillar_a{s}', side_prism([(-1.25, 0.99), (-1.12, 0.99), (-0.38, 1.47), (-0.5, 1.47)], xa, xb), paint)
        add(f'pillar_b{s}', side_prism([(0.32, 0.99), (0.44, 0.99), (0.44, 1.47), (0.32, 1.47)], xa, xb), paint)
        add(f'pillar_c{s}', side_prism([(1.55, 0.99), (1.92, 0.99), (1.74, 1.38), (1.2, 1.47), (1.12, 1.47)], xa, xb), paint)
        # door seams and handles, mirror, wheel arch liners, side skirt
        for u in (-0.88, 0.38, 1.4):
            add(f'seam{s}{u}', box(0.01, 0.012, 0.66, (s * (HW + 0.002), u, 0.33)), M['void'])
        for u in (-0.2, 0.95): add(f'handle{s}{u}', box(0.03, 0.18, 0.04, (s * (HW + 0.012), u, 0.86)), M['plastic'])
        add(f'mirror_arm{s}', box(0.14, 0.06, 0.05, (s * (HW + 0.05), -1.0, 0.98)), M['plastic'])
        add(f'mirror{s}', box(0.1, 0.16, 0.13, (s * (HW + 0.13), -1.0, 0.96), bevel_w=0.02), paint)
        add(f'skirt{s}', box(0.04, 1.75, 0.08, (s * (HW + 0.0), 0.02, 0.3)), M['plastic'])
        for u in (-1.25, 1.29): wheel(out, coll, M, s * (HW - 0.12), u, side=s)
    for u in (-1.25, 1.29):   # dark wheel wells between the wheels
        arch = [(u + 0.4 * math.cos(math.pi * j / 8), 0.3 + 0.38 * math.sin(math.pi * j / 8)) for j in range(9)]
        add(f'liner{u}', side_prism(arch, -HW + 0.24, HW - 0.24), M['plastic'])
    # front: bumper, grille, headlights, plate, bonnet seam, wipers
    add('bumper_f', box(W + 0.02, 0.22, 0.3, (0, -1.92, 0.28), bevel_w=0.05), M['plastic'])
    add('grille', box(0.9, 0.04, 0.18, (0, -2.04, 0.58)), M['void'])
    for s in (-1, 1):
        add(f'headlight{s}', box(0.42, 0.06, 0.13, (s * 0.58, -2.0, 0.72), bevel_w=0.02), Lm['head'])
        add(f'fog{s}', box(0.14, 0.04, 0.07, (s * 0.62, -2.04, 0.36)), Lm['head'])
        add(f'wiper{s}', box(0.5, 0.02, 0.02, (s * 0.3, -1.22, 1.0), rz=s * 0.15), M['plastic'])
        add(f'taillight{s}', box(0.3, 0.06, 0.2, (s * 0.66, 2.0, 0.78), bevel_w=0.02), Lm['tail'])
        add(f'reflector{s}', box(0.12, 0.04, 0.04, (s * 0.7, 2.06, 0.36)), Lm['tail'])
    add('plate_f', box(0.52, 0.02, 0.12, (0, -2.05, 0.36)), M['white'])
    add('bonnet_seam', box(1.5, 0.012, 0.01, (0, -1.32, 0.985)), M['void'])
    # back: bumper, plate, tailgate seam, rear wiper, exhaust
    add('bumper_r', box(W + 0.02, 0.2, 0.3, (0, 1.92, 0.28), bevel_w=0.05), M['plastic'])
    add('plate_r', box(0.52, 0.02, 0.12, (0, 2.05, 0.62)), M['white'])
    add('tailgate_seam', box(1.5, 0.012, 0.012, (0, 2.0, 0.55)), M['void'])
    add('rear_wiper', box(0.4, 0.02, 0.02, (0.1, 1.84, 1.12), rz=0.3), M['plastic'])
    add('exhaust', cyl(0.035, 0.12, (0.55, 1.98, 0.25), seg=8, axis='Y'), M['metal_d'])
    add('underbody', box(W - 0.3, 3.4, 0.12, (0, 0, 0.2)), M['plastic'])
    # roof rails with feet, shark-fin antenna, rear spoiler, window trim along the belt, side indicators, tow hook
    for s in (-1, 1):
        add(f'rail{s}', box(0.04, 1.5, 0.04, (s * (HW - 0.2), 0.38, 1.55)), M['plastic'])
        for u in (-0.3, 1.05): add(f'rail_foot{s}{u}', box(0.05, 0.08, 0.06, (s * (HW - 0.2), u, 1.5)), M['plastic'])
        add(f'trim{s}', box(0.012, 3.05, 0.025, (s * (HW - 0.085), 0.33, 0.99)), M['rim'])
        add(f'indicator{s}', box(0.02, 0.1, 0.04, (s * (HW + 0.005), -1.55, 0.78)), Lm['yellow'] if 'yellow' in Lm else M['white'])
    add('antenna', side_prism([(0.95, 1.5), (1.15, 1.5), (1.12, 1.58)], -0.03, 0.03), M['plastic'])
    add('spoiler', side_prism([(1.12, 1.47), (1.3, 1.47), (1.36, 1.44), (1.2, 1.5)], -HW + 0.14, HW - 0.14), paint)
    add('tow_hook', box(0.06, 0.08, 0.05, (0.45, -2.05, 0.2)), M['metal_d'])
    return out
