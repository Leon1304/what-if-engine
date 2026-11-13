# Cyberpunk flying car (hover taxi), body 4.9 m long, 3.6 m wide over the fan pods, front -y (three.js +z, as drive()): wedge body in
# dark metallic paint with a magenta stripe, tinted canopy with a frame and pillar, gull-wing doors with seams, four ducted fan pods
# with blades, hubs, guards and pylons, a glowing cyan underbody strip, LED headlight bar and red tail bar, twin rear thrusters with a
# blue glow, spoiler, intake grilles, side vents, panel lines, rivets, a dent and scratches, number plate with made-up glyphs,
# roof taxi light, antenna, camera mirrors, three landing skids. In flight use asset(…, { y, dyn: true }) and move/tilt the group per frame.
# Parts: fan_fl, fan_fr, fan_rl, fan_rr (blades, spin with ry), door_l, door_r (gull-wing, hinged at the roof edge: rz swings them up;
# door_l opens with rz < 0, door_r with rz > 0). Marks: seat_driver, seat_pass (inside, facing forward), door_l_out, door_r_out (standing
# next to the doors, facing the car), light_head, light_under, thrust_l, thrust_r (thruster exits, for smoke()/glow trails).
# Materials: paint, paint_dark, stripe, + _cyber.py (glass, metal, …) and neon.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/cp_hovercar.py
use('_street.py')
use('_cyber.py')
AO = {'strength': 0.55, 'dist': 0.4}

def build(coll):
    M = cyber_mats(); N = neon_mats(); out = []; R = random.Random(5)
    paint = mat('paint', '#2B3240', 0.3, 0.7); paint_d = mat('paint_dark', '#181C24', 0.4, 0.6); stripe = mat('stripe', '#E0207F', 0.35, 0.3)
    thrust = mat('thrust', '#8FD8FF', 0.3, emit='#3AB8FF', ei=4.0); head = mat('headlight', '#F4F8FF', 0.2, emit='#E8F2FF', ei=1.8)
    tail = mat('taillight', '#FF3B4A', 0.3, emit='#FF1A2A', ei=3.0)
    add = lambda n, bm, m: (out.append(mesh(n, bm, m, coll)), out[-1])[1]
    BW = 1.0   # half width of the body
    body = [(-2.45, 0.55), (-2.2, 0.48), (2.2, 0.48), (2.45, 0.62), (2.48, 1.0), (1.6, 1.12), (-0.7, 1.05), (-1.7, 0.93), (-2.42, 0.78)]
    b = side_prism(body, -BW, BW); bevel(b, 0.04, 2, 25)
    for v in b.verts:   # taper the nose and a dent on the left rear quarter
        k = max(0.0, (-v.co.y - 1.4) / 1.1); v.co.x *= 1 - 0.22 * k
        if v.co.x < -BW + 0.1 and 1.2 < v.co.y < 1.7 and 0.6 < v.co.z < 0.85: v.co.x += 0.03
    add('body', b, paint)
    add('skirt', side_prism([(-2.2, 0.42), (2.2, 0.42), (2.2, 0.52), (-2.2, 0.52)], -BW + 0.05, BW - 0.05), paint_d)
    add('stripe', merge([side_prism([(-2.2, 0.8), (2.4, 0.86), (2.4, 0.9), (-2.2, 0.84)], s * BW - 0.01 if s > 0 else -BW - 0.005, s * BW + 0.005 if s > 0 else -BW + 0.01) for s in (-1, 1)]), stripe)
    # canopy with frame
    can = [(-0.95, 1.02), (1.5, 1.1), (1.2, 1.45), (0.2, 1.52), (-0.35, 1.38)]
    add('canopy', bevel(side_prism(can, -0.82, 0.82), 0.03, 1, 25), M['glass'])
    add('canopy_frame', merge([side_prism([(-0.97, 1.01), (1.52, 1.09), (1.52, 1.13), (-0.97, 1.05)], -0.86, 0.86),
                               side_prism([(0.15, 1.04), (0.35, 1.06), (0.32, 1.53), (0.12, 1.52)], -0.84, 0.84)]), paint_d)
    add('roof_spine', side_prism([(0.12, 1.5), (1.25, 1.44), (1.25, 1.49), (0.12, 1.56)], -0.12, 0.12), paint_d)
    add('taxi_light', box(0.5, 0.18, 0.1, (0, 0.6, 1.5), bevel_w=0.02), N['yellow'])
    add('taxi_glyph', merge([glyph(-0.12 + 0.24 * i, 1.52, 0.5, 0.18, 0.06, 140 + i, r=0.006) for i in range(2)]), M['plastic'])
    # gull-wing doors (parts): seam outline + panel on each side
    for s, nm in ((-1, 'door_l'), (1, 'door_r')):
        x = s * (BW + 0.004)
        pan = side_prism([(-0.75, 0.56), (0.9, 0.56), (0.95, 1.0), (-0.7, 0.98)], min(x, x + s * 0.02), max(x, x + s * 0.02))
        d = add(nm, pan, paint)
        sm = add(nm + '_seam', merge([side_prism([(-0.78, 0.55), (0.93, 0.55), (0.93, 0.57), (-0.78, 0.57)], min(x, x + s * 0.025), max(x, x + s * 0.025)),
                                      side_prism([(-0.78, 0.55), (-0.76, 0.55), (-0.71, 1.0), (-0.73, 1.0)], min(x, x + s * 0.025), max(x, x + s * 0.025))]), M['void'])
        hd = add(nm + '_handle', box(0.03, 0.22, 0.04, (x + s * 0.02, 0.6, 0.85)), M['steel'])
        part([d, sm, hd], nm, pivot=(s * 0.8, 0.1, 1.08))
        mark(nm + '_out', (s * 2.3, 0.1, 0.0), -s * math.pi / 2, coll)
    # fan pods: pylon, duct ring, guard, hub, blades (part)
    for nm, (sx, sy) in (('fan_fl', (-1, -1)), ('fan_fr', (1, -1)), ('fan_rl', (-1, 1)), ('fan_rr', (1, 1))):
        cx, cy, cz = sx * 1.42, sy * 1.55, 0.72
        add(nm + '_pylon', box(0.55, 0.36, 0.12, (sx * (BW + 0.15), cy, cz - 0.02), bevel_w=0.02), paint_d)
        duct = cyl(0.56, 0.3, (cx, cy, cz - 0.15), seg=18); bmesh.ops.delete(duct, geom=[f for f in duct.faces if abs(f.normal.z) > 0.9], context='FACES')
        inner = cyl(0.5, 0.3, (cx, cy, cz - 0.15), seg=18); bmesh.ops.delete(inner, geom=[f for f in inner.faces if abs(f.normal.z) > 0.9], context='FACES'); bmesh.ops.reverse_faces(inner, faces=inner.faces)
        add(nm + '_duct', merge([duct, inner, torus(0.53, 0.035, (cx, cy, cz + 0.15), seg=18, seg2=4, axis='Z'), torus(0.53, 0.035, (cx, cy, cz - 0.15), seg=18, seg2=4, axis='Z')]), paint)
        add(nm + '_ring_led', torus(0.565, 0.012, (cx, cy, cz), seg=18, seg2=3, axis='Z'), N['cyan'])
        add(nm + '_guard', merge([rod((cx - 0.5, cy, cz + 0.16), (cx + 0.5, cy, cz + 0.16), 0.01, 3), rod((cx, cy - 0.5, cz + 0.16), (cx, cy + 0.5, cz + 0.16), 0.01, 3)]), M['steel'])
        hub = add(nm + '_hub', merge([cyl(0.1, 0.16, (cx, cy, cz - 0.1), seg=10), dome(0.1, (cx, cy, cz + 0.06), seg=10, rings=2, h=0.05)]), M['metal_d'])
        bl = []
        for k in range(6):
            a = 2 * math.pi * k / 6 + (0.3 if sy > 0 else 0); bb = box(0.36, 0.08, 0.015, (0.28, 0, -0.01))
            bmesh.ops.rotate(bb, cent=(0.28, 0, 0), matrix=Matrix.Rotation(0.35, 3, 'X'), verts=bb.verts); rotz(bb, a); bl.append(move(bb, (cx, cy, cz)))
        bla = add(nm + '_blades', merge(bl), M['metal'])
        part([hub, bla], nm, pivot=(cx, cy, cz))
    # lights, thrusters, underbody glow
    add('headlight_bar', box(1.5, 0.04, 0.05, (0, -2.43, 0.66)), head)
    add('headlight_eyes', merge([box(0.28, 0.06, 0.08, (s * 0.6, -2.4, 0.64)) for s in (-1, 1)]), head)
    add('grille', merge([box(0.9, 0.03, 0.015, (0, -2.44, 0.52 + i * 0.03)) for i in range(4)]), M['void'])
    add('tail_bar', box(1.7, 0.04, 0.05, (0, 2.47, 0.88)), tail)
    add('under_glow', merge([box(0.03, 3.8, 0.02, (s * (BW - 0.15), 0, 0.41)) for s in (-1, 1)] + [box(1.6, 0.03, 0.02, (0, y, 0.41)) for y in (-1.9, 1.9)]), N['cyan'])
    for s in (-1, 1):
        add(f'thruster{s}', merge([cyl(0.17, 0.35, (s * 0.45, 2.4, 0.7), seg=12, axis='Y', r2=0.14), torus(0.15, 0.03, (s * 0.45, 2.75, 0.7), seg=12, seg2=4, axis='Y')]), M['metal_d'])
        add(f'thrust_core{s}', cyl(0.11, 0.02, (s * 0.45, 2.76, 0.7), seg=12, axis='Y'), thrust)
        add(f'side_vent{s}', merge([box(0.012, 0.35, 0.02, (s * (BW + 0.002), 1.6, 0.62 + i * 0.05)) for i in range(4)]), M['void'])
        add(f'intake{s}', merge([box(0.05, 0.5, 0.14, (s * (BW - 0.05), -1.1, 0.95), bevel_w=0.01)]), paint_d)
        add(f'mirror_cam{s}', merge([rod((s * 0.85, -0.85, 1.03), (s * 1.1, -0.9, 1.1), 0.015, 4), box(0.08, 0.12, 0.07, (s * 1.12, -0.92, 1.07), bevel_w=0.01)]), paint_d)
        add(f'mirror_lens{s}', box(0.03, 0.01, 0.03, (s * 1.12, -0.985, 1.09)), N['red'])
        mark(f'thrust_{"l" if s < 0 else "r"}', (s * 0.45, 2.8, 0.7), math.pi, coll)
    add('spoiler', merge([box(1.9, 0.35, 0.05, (0, 2.35, 1.22), bevel_w=0.015)] + [box(0.06, 0.15, 0.22, (s * 0.7, 2.3, 1.0)) for s in (-1, 1)]), paint_d)
    add('panel_lines', merge([side_prism([(u, 0.5), (u + 0.015, 0.5), (u + 0.015, 0.9), (u, 0.9)], -BW - 0.004, BW + 0.004) for u in (-1.6, 1.3)] +
                             [box(0.012, 1.4, 0.004, (0, -1.55, 0.945))]), M['void'])
    add('rivets', merge([cyl(0.01, 0.006, (s * (BW + 0.001), u, 0.5), seg=5, axis='X') for s in (-1, 1) for u in [-2.0 + 0.25 * i for i in range(17)]]), M['steel'])
    add('scratches', merge([rod((-BW - 0.006, 1.2 + 0.05 * i, 0.7 + 0.02 * i), (-BW - 0.006, 1.7 + 0.04 * i, 0.74 + 0.03 * i), 0.004, 3) for i in range(4)]), M['metal'])
    add('plate', box(0.5, 0.02, 0.14, (0, 2.48, 0.62)), M['sticker_y'])
    add('plate_glyphs', merge([glyph(-0.15 + 0.1 * i, 0.64, 2.495, 0.08, 0.1, 150 + i, r=0.006, face=1) for i in range(4)]), M['plastic'])
    add('antenna', rod((0.6, 1.4, 1.4), (0.75, 1.9, 1.85), 0.006, 3), M['metal_d'])
    # landing skids
    sk = [box(0.08, 0.5, 0.05, (0, -1.7, 0.0), bevel_w=0.01), rod((0, -1.7, 0.03), (0, -1.6, 0.45), 0.03, 6)]
    for s in (-1, 1): sk += [box(0.08, 0.6, 0.05, (s * 0.65, 1.6, 0.0), bevel_w=0.01), rod((s * 0.65, 1.6, 0.03), (s * 0.6, 1.5, 0.45), 0.03, 6)]
    add('skids', merge(sk), M['metal_d'])
    mark('seat_driver', (-0.42, 0.15, 0.62), 0.0, coll)
    mark('seat_pass', (0.42, 0.15, 0.62), 0.0, coll)
    mark('light_head', (0, -3.2, 0.66), 0.0, coll)
    mark('light_under', (0, 0, 0.2), 0.0, coll)
    return out
