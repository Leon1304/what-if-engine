# Cyberpunk street piece, exactly 16 m wide (x = ±8) × 12 m long (y = ±6), same layout as own/jlm_road (tiles end to end along three.js z,
# asphalt top 0.02 m, sidewalk top 0.15 m, two 3.5 m lanes): wet, glossy dark asphalt with patches, cracks and oily puddles, glowing cyan
# edge lines and a dashed amber centre line, a steaming vent grate and a manhole, curbs with a cyan LED strip on their face, gutter
# drains; sidewalks of dark composite plates with joints, cracked plates, tactile strips, drain channels with grates, bollards with
# light rings, a junction box covered in stickers with a cable trench, a valve post, litter (cans, cups, a soggy flyer, a cigarette pile).
# Parts (own nodes, so each is its own obstacle; a car can knock one over): bollard_1…6 (left side 1–3, right 4–6), valve, jbox.
# Marks: vent (steam source on the vent grate, for smoke()), lane_l / lane_r (driving lines: start of each lane, facing its direction),
# walk_l_1/2 and walk_r_1/2 (sidewalk paths), light_curb_l / light_curb_r. Materials: asphalt, asphalt_patch, wet, marking, + _cyber.py.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/cp_street.py
use('_cyber.py')
AO = {'strength': 0.5, 'dist': 0.6}

def build(coll):
    M = cyber_mats(); N = neon_mats(); out = []; R = random.Random(9)
    asphalt = mat('asphalt', '#1E2125', 0.35, 0.1); patch = mat('asphalt_patch', '#2A2D31', 0.5, 0.1); wet = mat('wet', '#0B0E12', 0.04, 0.3)
    edge = mat('neon_edge', '#5CF6FF', 0.4, emit='#14C8E0', ei=1.6); centre = mat('marking', '#E8B53A', 0.5, emit='#7A5410', ei=1.0)
    plate = mat('plate', '#3A3E45', 0.6, 0.2); plate_d = mat('plate_dark', '#25282D', 0.7, 0.2); curb = mat('curb', '#55595F', 0.7)
    tactile = mat('tactile', '#C9A227', 0.6)
    add = lambda n, bm, m: (out.append(mesh(n, bm, m, coll)), out[-1])[1]
    L, AW, SW = 12.0, 10.0, 3.0; nb = [0]
    add('asphalt', box(AW, L, 0.02), asphalt)
    for y in (-4.5, -1.5, 1.5, 4.5): add(f'centre{y}', box(0.15, 1.8, 0.004, (0, y, 0.02)), centre)
    for x in (-3.5, 3.5): add(f'edge{x}', box(0.12, L, 0.004, (x, 0, 0.02)), edge)
    for k in range(4):
        add(f'patch{k}', box(R.uniform(0.8, 2.0), R.uniform(0.6, 1.6), 0.006, (R.uniform(-3, 3), R.uniform(-4.5, 4.5), 0.02), rz=R.uniform(-0.3, 0.3)), patch)
    cracks = []
    for k in range(5):
        x, y = R.uniform(-4, 4), R.uniform(-5.5, 3.0); pts = [(x, y, 0.021)]
        for j in range(5): x += R.uniform(-0.4, 0.4); y += R.uniform(0.2, 0.5); pts.append((x, y, 0.021))
        cracks.append(tube(pts, 0.012, 3))
    add('cracks', merge(cracks), M['void'])
    pud = []
    for k in range(5):
        pz = bmesh.new(); bmesh.ops.create_circle(pz, cap_ends=True, segments=12, radius=R.uniform(0.4, 1.0)); a = R.uniform(0, 3)
        for v in pz.verts: v.co.x *= 1.5 + 0.25 * math.sin(v.co.y * 6 + a); v.co.y *= 0.7 + 0.15 * math.cos(v.co.x * 5)
        rotz(pz, R.uniform(0, 3)); pud.append(move(pz, (R.uniform(-4.4, 4.4), R.uniform(-5, 5), 0.024)))
    add('puddles', merge(pud), wet)
    add('oil_sheen', merge([move(rotz(box(0.5, 0.25, 0.001), R.uniform(0, 3)), (R.uniform(-2, 2), R.uniform(-4, 4), 0.025)) for _ in range(3)]), mat('oil', '#3B2A55', 0.05, 0.6))
    # vent grate with steam (mark) and manhole
    vx, vy = -1.8, -2.4
    add('vent_frame', box(1.2, 0.8, 0.03, (vx, vy, 0.0), bevel_w=0.01), M['metal_d'])
    add('vent_hole', box(1.05, 0.65, 0.01, (vx, vy, 0.025)), M['void'])
    add('vent_bars', merge([box(0.03, 0.66, 0.025, (vx - 0.5 + i * 0.1, vy, 0.01)) for i in range(11)]), M['steel'])
    add('manhole', cyl(0.32, 0.012, (2.0, 2.6, 0.02), seg=14), M['metal_d'])
    add('manhole_rim', torus(0.33, 0.02, (2.0, 2.6, 0.03), seg=14, seg2=3, axis='Z'), M['metal_d'])
    add('manhole_ribs', merge([box(0.5, 0.025, 0.006, (2.0, 2.6 + d, 0.032)) for d in (-0.15, 0, 0.15)]), M['steel'])
    for s in (-1, 1):
        sx = s * (AW / 2 + 0.3 + (SW - 0.3) / 2)
        add(f'curb{s}', box(0.3, L, 0.17, (s * (AW / 2 + 0.15), 0, 0), bevel_w=0.03), curb)
        add(f'curb_led{s}', box(0.012, L, 0.025, (s * (AW / 2 + 0.003), 0, 0.09)), N['cyan'])
        add(f'curb_chips{s}', merge([box(R.uniform(0.15, 0.4), 0.06, 0.04, (s * (AW / 2 + 0.03), R.uniform(-5.5, 5.5), 0.14)) for _ in range(3)]), M['concrete_d'])
        for y in (-4.0, 4.0):
            add(f'drain{s}{y}', box(0.45, 0.9, 0.012, (s * (AW / 2 - 0.25), y, 0.02)), M['metal_d'])
            add(f'drain_slots{s}{y}', merge([box(0.3, 0.035, 0.004, (s * (AW / 2 - 0.25), y - 0.35 + i * 0.1, 0.032)) for i in range(8)]), M['void'])
        # sidewalk plates: 1.5 × 1.0 m composite plates, some cracked or sunk
        add(f'sidewalk{s}', box(SW - 0.3, L, 0.145, (sx, 0, 0)), plate)
        for k in range(1, 12): add(f'pj_y{s}{k}', box(SW - 0.3, 0.02, 0.003, (sx, -L / 2 + k, 0.145)), plate_d)
        add(f'pj_x{s}', box(0.02, L, 0.003, (sx, 0, 0.145)), plate_d)
        for k in range(3):
            y = R.choice(range(-5, 6)) + 0.5; xo = R.choice((-0.67, 0.67))
            add(f'plate_dark{s}{k}', box(1.3, 0.96, 0.004, (sx + xo, y, 0.145)), plate_d)
            add(f'plate_crack{s}{k}', tube([(sx + xo - 0.5, y - 0.3, 0.15), (sx + xo - 0.1, y + 0.05, 0.15), (sx + xo + 0.4, y + 0.35, 0.15)], 0.01, 3), M['void'])
        add(f'tactile{s}', box(0.4, L, 0.006, (s * (AW / 2 + 0.6), 0, 0.145)), tactile)
        add(f'tactile_ribs{s}', merge([box(0.4, 0.03, 0.008, (s * (AW / 2 + 0.6), -L / 2 + 0.1 + i * 0.2, 0.15)) for i in range(60)]), tactile)
        add(f'channel{s}', box(0.2, L, 0.004, (s * (AW / 2 + SW - 0.35), 0, 0.145)), M['metal_d'])
        add(f'channel_slots{s}', merge([box(0.12, 0.03, 0.002, (s * (AW / 2 + SW - 0.35), -L / 2 + 0.15 + i * 0.3, 0.149)) for i in range(40)]), M['void'])
        # bollards with light rings
        for y in (-5.0, 0.0, 5.0):
            bx = s * (AW / 2 + 0.55); nb[0] += 1
            part([add(f'bollard{s}{y}', cyl(0.11, 0.85, (bx, y, 0.15), seg=10, bevel_w=0.015), M['metal_d']),
                  add(f'bollard_ring{s}{y}', cyl(0.115, 0.04, (bx, y, 0.85), seg=10), N['cyan'] if s < 0 else N['pink']),
                  add(f'bollard_cap{s}{y}', dome(0.11, (bx, y, 1.0), seg=10, rings=2, h=0.04), M['steel'])], f'bollard_{nb[0]}', pivot=(bx, y, 0.15))
        mark(f'light_curb_{"l" if s < 0 else "r"}', (s * (AW / 2 + 0.3), 0, 0.4), 0.0, coll)
        mark(f'walk_{"l" if s < 0 else "r"}_1', (s * (AW / 2 + 1.6), -5.5 * s, 0.15), 0.0 if s > 0 else math.pi, coll)
        mark(f'walk_{"l" if s < 0 else "r"}_2', (s * (AW / 2 + 1.6), 5.5 * s, 0.15), 0.0 if s > 0 else math.pi, coll)
    # junction box with stickers and a cable trench (right sidewalk), valve post (left)
    jx, jy = AW / 2 + SW - 0.45, -2.0
    j0 = len(out)
    add('jbox', box(0.5, 0.35, 1.2, (jx, jy, 0.15), bevel_w=0.02), M['metal'])
    add('jbox_door', recess(box(0.4, 0.01, 1.0, (jx, jy - 0.18, 0.25)), (0, -1, 0), 0.03, 0.005), M['metal_d'])
    add('jbox_led', box(0.04, 0.01, 0.02, (jx + 0.12, jy - 0.19, 1.2)), N['red'])
    add('jbox_hazard', merge([box(0.18, 0.004, 0.18, (jx - 0.05, jy - 0.192, 0.9), rz=0)]), M['hazard_y'])
    for k, st in enumerate(sticker_set(5, 10, (jx - 0.22, jx + 0.22, 0.3, 1.25), jy - 0.18)):
        if st: add(f'jbox_stickers{k}', st, [M['sticker_y'], M['sticker_w'], M['sticker_r']][k])
    part(out[j0:], 'jbox', pivot=(jx, jy, 0.15))
    add('trench', box(0.25, 4.0, 0.006, (jx - 0.05, jy + 2.2, 0.145)), M['metal_d'])
    add('trench_bolts', merge([cyl(0.015, 0.004, (jx - 0.05 + dx, jy + 0.4 + i * 0.8, 0.151), seg=6) for i in range(5) for dx in (-0.09, 0.09)]), M['steel'])
    vxp = -(AW / 2 + SW - 0.5)
    v0 = len(out)
    add('valve', merge([cyl(0.12, 0.6, (vxp, 3.0, 0.15), seg=10), dome(0.12, (vxp, 3.0, 0.75), seg=10, rings=3), cyl(0.05, 0.25, (vxp - 0.12, 3.0, 0.5), seg=8, axis='X')]), M['sticker_r'])
    add('valve_chain', tube([(vxp - 0.1, 3.0, 0.62), (vxp - 0.18, 3.0, 0.45), (vxp - 0.25, 3.0, 0.5)], 0.006, 3), M['steel'])
    part(out[v0:], 'valve', pivot=(vxp, 3.0, 0.15))
    # litter
    for k in range(6):
        s = R.choice((-1, 1)); x = s * R.uniform(AW / 2 + 0.4, AW / 2 + SW - 0.4) if k < 4 else R.uniform(-4.6, 4.6); z = 0.15 if k < 4 else 0.02
        c = cyl(0.033, 0.12, (0, 0, 0), seg=8); bmesh.ops.rotate(c, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'), verts=c.verts)
        add(f'litter_can{k}', move(rotz(c, R.uniform(0, 3)), (x, R.uniform(-5.5, 5.5), z + 0.033)), [M['sticker_r'], M['steel'], M['paint_tag']][k % 3])
    add('cup', cyl(0.045, 0.14, (AW / 2 + 1.2, 1.3, 0.15), seg=8, r2=0.035), M['sticker_w'])
    fl = box(0.21, 0.3, 0.003, (0, 0, 0))
    for v in fl.verts: v.co.z += 0.01 * math.sin(v.co.x * 20)
    add('flyer', move(rotz(fl, 0.5), (-(AW / 2) + 0.6, -3.2, 0.021)), N['pink'])
    add('butts', merge([move(rotz(cyl(0.004, 0.025, (0, 0, 0), seg=4, axis='X'), R.uniform(0, 3)), (-(AW / 2 + 1.0) + R.uniform(-0.15, 0.15), -0.4 + R.uniform(-0.15, 0.15), 0.153)) for _ in range(9)]), M['sticker_w'])
    mark('vent', (vx, vy, 0.05), 0.0, coll)
    mark('lane_r', (1.75, -6.0, 0.02), math.pi, coll)       # right-hand traffic as own/jlm_road: x = +1.75 drives towards three.js -z
    mark('lane_l', (-1.75, 6.0, 0.02), 0.0, coll)           # x = -1.75 drives towards three.js +z
    return out
