# Guard tower for the security wall: takes one 6 m slot in a run of own/wall_barrier (same footing depth, same outside face, so it
# lines up when placed on the same line), 24 m high. Concrete shaft with pour lines, grime and smears, observation cabin with a band
# of dark windows and mullions, roof slab, two searchlights, antenna mast with dishes, siren horns, door at the back,
# ladder rungs up the back. Materials: like wall_barrier (+ glass).
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/wall_tower.py
AO = {'strength': 0.6, 'dist': 1.5}

def build(coll):
    R = random.Random(41); out = []
    conc, conc_d = mat('concrete', '#A9A59C', 0.95), mat('concrete_dark', '#86827A', 0.95)
    grime, stain, void = mat('grime', '#6E6A62', 1.0), mat('stain', '#3F3A34', 1.0), mat('void', '#141414', 1.0)
    steel, steel_d, lamp = mat('steel', '#6C7377', 0.5, 0.6), mat('steel_dark', '#33383A', 0.5, 0.7), mat('lamp', '#FFF2C8', 0.3, emit='#FFE2A0')
    glass = mat('glass', '#22303A', 0.15, 0.3)
    add = lambda n, bm, m: out.append(mesh(n, bm, m, coll))
    W, F, HS = 6.0, 0.6, 19.0
    y0, y1 = -0.8, 2.2                       # shaft front (0.5 m proud of the wall face at -0.3) and back
    yc, dep = (y0 + y1) / 2, y1 - y0
    add('footing', box(W, 3.3, F, (0, 0.65, 0), bevel_w=0.04), conc_d)   # y from -1.0 to 2.3, same as wall_barrier
    add('shaft', box(W, dep, HS, (0, yc, F), bevel_w=0.06), conc)
    for z in (4.8, 9.6, 14.4): add(f'pour{z}', box(W + 0.02, dep + 0.02, 0.05, (0, yc, F + z)), conc_d)
    for k in range(6):   # grime streaks narrowing downwards, ragged smears low on the outside
        h, w, u = R.uniform(2, 6), R.uniform(0.15, 0.45), R.uniform(-2.6, 2.6); zt_ = F + HS - 0.1
        add(f'grime{k}', prism([(u - w * 0.15, zt_ - h), (u + w * 0.15, zt_ - h), (u + w / 2, zt_ - h * 0.4), (u + w / 2, zt_), (u - w / 2, zt_), (u - w / 2, zt_ - h * 0.5)], 0.01, y0 - 0.006), grime)
    for k in range(3):
        cx, cz, w, h = R.uniform(-2.2, 2.2), F + R.uniform(0.7, 1.6), R.uniform(0.6, 1.2), R.uniform(1.0, 2.0)
        add(f'stain{k}', prism([(cx + w / 2 * math.cos(2 * math.pi * j / 9) * R.uniform(0.6, 1.1), cz + h / 2 * math.sin(2 * math.pi * j / 9) * R.uniform(0.6, 1.1)) for j in range(9)], 0.01, y0 - 0.008), stain)
    # cable conduits down the front corners, number plate, warning sign
    for x in (-2.75, 2.75):
        add(f'conduit{x}', box(0.12, 0.1, HS - 0.6, (x, y0 - 0.05, F + 0.3)), steel)
        for z in range(1, 6): add(f'conduit_clip{x}{z}', box(0.2, 0.06, 0.08, (x, y0 - 0.07, F + z * 3.2)), steel_d)
    add('plate', box(1.6, 0.03, 0.7, (0, y0 - 0.02, F + 15.5)), mat('white', '#E6E3DA', 0.8))
    for k in range(3): add(f'plate_txt{k}', box(0.25, 0.01, 0.4, (-0.4 + 0.4 * k, y0 - 0.04, F + 15.65)), void)
    sign_y, sign_b = mat('hazard_y', '#E2B322', 0.7), mat('hazard_k', '#1C1C1C', 0.7)
    add('sign_rim', prism([(-0.55, F + 2.6), (0.55, F + 2.6), (0.0, F + 3.55)], 0.02, y0 - 0.03), sign_b)
    add('sign', prism([(-0.45, F + 2.66), (0.45, F + 2.66), (0.0, F + 3.44)], 0.02, y0 - 0.045), sign_y)
    add('sign_bar', box(0.08, 0.01, 0.35, (0, y0 - 0.06, F + 2.95)), sign_b)
    # slit windows up the front of the shaft
    for z in (6.0, 11.0): add(f'slit{z}', box(0.25, 0.02, 1.4, (0, y0 - 0.01, F + z)), void)
    # cabin
    zc = F + HS
    add('cabin_floor', box(W + 0.6, 3.2, 0.3, (0, 0.6, zc), bevel_w=0.04), conc_d)
    add('cabin_low', box(W + 0.4, 3.0, 1.0, (0, 0.6, zc + 0.3), bevel_w=0.03), conc)
    add('cabin_glass', box(W + 0.3, 2.9, 1.3, (0, 0.6, zc + 1.3)), glass)
    for x in (-3.3, -1.65, 0.0, 1.65, 3.3):
        for y in (-0.88, 2.08): add(f'mullion{x}{y}', box(0.1, 0.1, 1.3, (x, y, zc + 1.3)), steel_d)
    for y in (-0.2, 0.6, 1.4):
        for x in (-3.3, 3.3): add(f'mullion_s{x}{y}', box(0.1, 0.1, 1.3, (x, y, zc + 1.3)), steel_d)
    add('cabin_top', box(W + 0.4, 3.0, 0.5, (0, 0.6, zc + 2.6), bevel_w=0.03), conc)
    add('roof', box(W + 1.0, 3.2, 0.25, (0, 0.6, zc + 3.1), bevel_w=0.04), conc_d)
    # gallery round the cabin: posts and two rails on the floor slab's edge (inside the footing depth at the back)
    for x in (-3.25, -1.6, 0.0, 1.6, 3.25):
        add(f'gal_post{x}', box(0.05, 0.05, 1.05, (x, -0.95, zc + 0.3)), steel_d)
    for z in (0.6, 1.3): add(f'gal_rail{z}', box(W + 0.6, 0.05, 0.05, (0, -0.95, zc + 0.3 + z - 0.25)), steel_d)
    # CCTV cameras on the cabin corners, flag pole
    for s in (-1, 1):
        add(f'cam_arm{s}', box(0.06, 0.3, 0.06, (s * 3.3, -0.7, zc + 2.85)), steel_d)
        cam = box(0.18, 0.4, 0.18, (0, 0, -0.09), bevel_w=0.02); bmesh.ops.rotate(cam, cent=(0, 0, 0), matrix=Matrix.Rotation(0.4, 3, 'X'), verts=cam.verts)
        add(f'cam{s}', move(rotz(cam, s * 0.4), (s * 3.3, -0.72, zc + 2.8)), conc)
    add('flagpole', cyl(0.04, 3.5, (2.8, 1.8, zc + 3.35), seg=6), steel)
    # searchlights, mast, dishes, sirens
    for s in (-1, 1):
        x = s * 2.2
        add(f'sl_base{s}', cyl(0.25, 0.25, (x, 0.0, zc + 3.35), seg=10), steel_d)
        for dx in (-0.32, 0.32): add(f'sl_yoke{s}{dx}', box(0.05, 0.08, 0.55, (x + dx, 0.0, zc + 3.55)), steel_d)
        hs = cyl(0.28, 0.55, (0, 0, 0), seg=12, axis='Y'); bmesh.ops.rotate(hs, cent=(0, 0, 0), matrix=Matrix.Rotation(-0.35, 3, 'X'), verts=hs.verts)
        add(f'sl_house{s}', move(hs, (x, -0.25, zc + 4.0)), steel)
        ln = cyl(0.24, 0.03, (0, 0, 0), seg=12, axis='Y'); bmesh.ops.rotate(ln, cent=(0, 0, 0), matrix=Matrix.Rotation(-0.35, 3, 'X'), verts=ln.verts)
        add(f'sl_lens{s}', move(ln, (x, -0.27, zc + 4.0)), lamp)
    add('mast', cyl(0.06, 4.0, (0, 1.6, zc + 3.35), seg=6), steel_d)
    for k, z in enumerate((1.6, 2.6)): add(f'mast_bar{k}', cyl(0.02, 1.0, (-0.5, 1.6, zc + 3.35 + z), seg=4, axis='X'), steel_d)
    d = cyl(0.4, 0.12, (0, 0, 0), seg=10, r2=0.1); bmesh.ops.rotate(d, cent=(0, 0, 0), matrix=Matrix.Rotation(1.2, 3, 'X'), verts=d.verts)
    add('dish', move(d, (0.6, 1.4, zc + 5.0)), conc)
    for s in (-1, 1):
        horn = cyl(0.18, 0.5, (0, 0, 0), seg=8, r2=0.06, axis='Y'); rotz(horn, math.pi + s * 0.5)
        add(f'siren{s}', move(horn, (s * 0.3, 1.9, zc + 6.6)), steel)
    # back: door on the footing, ladder rungs (all within y <= 2.3 so the tower lines up with the wall segments)
    add('door_frame', box(1.4, 0.04, 2.4, (1.6, y1 + 0.02, F)), conc_d)
    add('door', box(1.1, 0.03, 2.2, (1.6, y1 + 0.035, F)), steel_d)
    add('door_handle', box(0.12, 0.02, 0.04, (2.0, y1 + 0.06, F + 1.05)), steel)
    for k in range(int(HS / 0.4) - 1): add(f'rung{k}', box(0.5, 0.03, 0.03, (-1.6, y1 + 0.07, F + 0.6 + k * 0.4)), steel_d)
    for x in (-1.85, -1.35): add(f'ladder_rail{x}', box(0.04, 0.04, HS - 0.4, (x, y1 + 0.07, F + 0.2)), steel_d)
    return out
