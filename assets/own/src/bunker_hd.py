# High-detail variant of bunker.py (same shell, same size): concrete damage with exposed rebar, cracks, grime streaks, moss, rubble,
# barbed wire on the roof edge, concertina wire in front, MG nest and searchlight on the roof, locking bars and number plate on the door,
# warning sign, drain pipe, ammo crates and oil barrels. Extra materials (tint keys): wood, moss, grime, barrel, white.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/bunker_hd.py
_p = os.path.join(os.path.dirname(__file__), 'bunker.py'); exec(compile(open(_p).read(), _p, 'exec'))
_base = build
AO = {'strength': 0.7, 'dist': 1.0}

def build(coll):
    out = _base(coll)
    R = random.Random(23)
    M = bpy.data.materials
    concrete, concrete_d, steel, steel_d, rust, void, bag, hy, hk, lamp = (M[n] for n in
        ('concrete', 'concrete_dark', 'steel', 'steel_dark', 'rust', 'void', 'sandbag', 'hazard_y', 'hazard_k', 'lamp'))
    wood, moss, grime = mat('wood', '#6E5636', 0.9), mat('moss', '#4E6A2C', 1.0), mat('grime', '#56534D', 1.0)
    barrel, white = mat('barrel', '#7D2E22', 0.6, 0.3), mat('white', '#E6E3DA', 0.8)
    def add(n, bm, m): out.append(mesh(n, bm, m, coll))

    W, D, H, F = 9.0, 7.0, 2.9, 0.3
    yf, ye = -D / 2, -D / 2 - 1.6
    yd, DW, DH, dz = ye + 0.28, 2.1, 1.95, 0.42
    top = F + H
    bpy.context.view_layer.update()
    turf = next(o for o in out if o.name.startswith('turf'))
    def tz(x, y):   # height of the turf roof at (x, y)
        hit, loc, _, _ = turf.ray_cast((x, y, 20), (0, 0, -1)); return loc.z if hit else top + 0.7

    # grime streaks under the roof slab and moss along the base (front and both sides)
    def on_wall(fn, n):
        for i in range(n):
            side = R.choice(('f', 'f', 'e', 'w'))
            if side == 'f':
                x = R.uniform(-W / 2 + 0.3, W / 2 - 0.3)
                if abs(x) < 1.95: continue
                fn(i, x, yf - 0.006, 0)
            else:
                fn(i, (W / 2 + 0.006) * (1 if side == 'e' else -1), R.uniform(-D / 2 + 0.4, D / 2 - 0.4), math.pi / 2)
    on_wall(lambda i, x, y, rz: add(f'grime{i}', box(R.uniform(0.06, 0.22), 0.012, (h := R.uniform(0.4, 1.3)), (x, y, top - h), rz=rz), grime), 18)
    on_wall(lambda i, x, y, rz: add(f'moss{i}', jitter(box(R.uniform(0.5, 1.2), 0.05, R.uniform(0.12, 0.3), (x, y, F - 0.02), bevel_w=0.03, rz=rz), 0.03, seed=i), moss), 12)

    # damage: broken patches with exposed rebar, cracks running away from them, rubble below
    def crack(name, x, z, n, y):
        for k in range(n):
            x2, z2 = x + R.uniform(-0.35, 0.35), z + R.uniform(-0.45, -0.15) * R.choice((1, 1, -1))
            dx, dz_ = x2 - x, z2 - z; L = math.hypot(dx, dz_) or 1; nx, nz = -dz_ / L * 0.015, dx / L * 0.015
            add(f'{name}{k}', prism([(x - nx, z - nz), (x2 - nx, z2 - nz), (x2 + nx, z2 + nz), (x + nx, z + nz)], 0.01, y), void)
            x, z = x2, z2
    for i, (x, z) in enumerate([(-3.9, 0.95), (3.7, 2.55), (-1.9 - 0.9, 2.75)]):
        p = bmesh.new(); bmesh.ops.create_icosphere(p, subdivisions=1, radius=0.38); jitter(p, 0.1, seed=40 + i)
        bmesh.ops.scale(p, vec=(1.0, 0.18, 0.7), verts=p.verts); bmesh.ops.translate(p, vec=(x, yf - 0.01, F + z), verts=p.verts)
        add(f'damage{i}', p, concrete_d)
        for k in range(3):
            add(f'rebar{i}{k}', cyl(0.012, 0.3, (x - 0.15 + 0.15 * k, yf - 0.2, F + z - 0.1 + R.uniform(-0.08, 0.08)), seg=5, axis='Y'), rust)
        crack(f'crack{i}_', x + 0.25, F + z - 0.15, 4, yf - 0.012)
        for k in range(4):
            rr = R.uniform(0.07, 0.2); r = bmesh.new(); bmesh.ops.create_icosphere(r, subdivisions=1, radius=rr); jitter(r, 0.04, seed=60 + 4 * i + k)
            z0 = -min(v.co.z for v in r.verts)   # resting on the ground, never below it (the export puts the lowest point at y = 0)
            bmesh.ops.translate(r, vec=(x + R.uniform(-0.6, 0.6), yf - R.uniform(0.3, 0.9), z0), verts=r.verts)
            add(f'rubble{i}{k}', r, concrete if k % 2 else concrete_d)

    # barbed wire on the roof's front edge: posts, three wires, barbs
    zr, yr = top + 0.32, -(D + 0.5) / 2 + 0.06
    xs = [-4.4 + 1.1 * i for i in range(9)]
    for x in xs: add(f'wpost{x:.1f}', box(0.05, 0.05, 0.75, (x, yr, zr)), steel_d)
    for k, z in enumerate((0.25, 0.45, 0.65)):
        add(f'wire{k}', cyl(0.007, 8.8, (-4.4, yr - 0.03, zr + z), seg=4, axis='X'), steel_d)
        for j in range(20):
            add(f'barb{k}{j}', box(0.06, 0.012, 0.012, (-4.3 + j * 0.44, yr - 0.03, zr + z - 0.006), rz=math.pi / 4 * (1 if j % 2 else -1)), steel_d)

    # concertina wire in front of the sandbags, on stakes
    for side in (-1, 1):
        for j in range(14):
            x = side * (2.2 + 0.18 * j)
            ring = torus(0.36, 0.008, (0, 0, 0), seg=10, seg2=3, axis='X')
            bmesh.ops.rotate(ring, cent=(0, 0, 0), matrix=Matrix.Rotation(0.18 * (1 if j % 2 else -1), 3, 'Z'), verts=ring.verts)
            bmesh.ops.translate(ring, vec=(x, ye - 1.7, 0.38), verts=ring.verts); add(f'coil{side}{j}', ring, steel_d)
        for j in (0, 7, 13):
            add(f'stake{side}{j}', box(0.04, 0.04, 0.8, (side * (2.2 + 0.18 * j), ye - 1.7, 0)), steel_d)

    # MG nest on the roof: ring of sandbags, gun on a tripod, ammo box
    cx, cy = 2.6, -1.6; cz = tz(cx, cy) - 0.08
    for layer in range(2):
        for k in range(11):
            a = 2 * math.pi * (k + 0.5 * layer) / 11 + 0.3
            if layer == 1 and abs(math.sin(a / 2 - 1.86)) < 0.12: continue   # gap facing the front
            add(f'nest{layer}{k}', box(0.55, 0.32, 0.21, (cx + 1.05 * math.cos(a), cy + 1.05 * math.sin(a), cz + 0.2 * layer), bevel_w=0.06, rz=a + math.pi / 2), bag)
    add('mg_body', box(0.14, 0.55, 0.14, (cx, cy - 0.1, cz + 0.55), bevel_w=0.02), steel_d)
    add('mg_barrel', cyl(0.022, 0.85, (cx, cy - 1.2, cz + 0.62), seg=6, axis='Y'), steel_d)
    add('mg_shroud', cyl(0.045, 0.4, (cx, cy - 0.75, cz + 0.62), seg=8, axis='Y'), steel_d)
    add('mg_mag', box(0.1, 0.12, 0.18, (cx + 0.12, cy - 0.15, cz + 0.5)), steel)
    for k in range(3):
        a = 2 * math.pi * k / 3 + 0.5
        leg = box(0.03, 0.03, 0.62, (cx, cy, cz)); bmesh.ops.rotate(leg, cent=(cx, cy, cz + 0.6), matrix=Matrix.Rotation(0.45, 3, Vector((math.cos(a), math.sin(a), 0))), verts=leg.verts)
        add(f'mg_leg{k}', leg, steel_d)
    add('ammo_box', box(0.35, 0.18, 0.22, (cx - 0.5, cy + 0.3, cz), bevel_w=0.015), steel)

    # searchlight on the roof, aimed at the yard
    sx, sy = -1.2, -2.3; sz = tz(sx, sy) - 0.05
    add('sl_base', cyl(0.22, 0.25, (sx, sy, sz), seg=10), steel_d)
    for x in (-0.3, 0.3): add(f'sl_yoke{x}', box(0.05, 0.08, 0.55, (sx + x, sy, sz + 0.2)), steel_d)
    hous = cyl(0.27, 0.5, (0, 0, 0), seg=12, axis='Y')
    bmesh.ops.rotate(hous, cent=(0, 0, 0), matrix=Matrix.Rotation(-0.25, 3, 'X'), verts=hous.verts)
    bmesh.ops.translate(hous, vec=(sx, sy - 0.25, sz + 0.65), verts=hous.verts); add('sl_housing', hous, steel)
    lens = cyl(0.23, 0.03, (0, 0, 0), seg=12, axis='Y')
    bmesh.ops.rotate(lens, cent=(0, 0, 0), matrix=Matrix.Rotation(-0.25, 3, 'X'), verts=lens.verts)
    bmesh.ops.translate(lens, vec=(sx, sy - 0.27, sz + 0.65), verts=lens.verts); add('sl_lens', lens, lamp)

    # door: locking bars with brackets, number plate, warning sign on a post
    for z in (0.6, 1.45):
        add(f'lockbar{z}', box(DW + 0.3, 0.08, 0.1, (0, yd - 0.17, dz + z), bevel_w=0.015), steel_d)
        for x in (-DW / 2 - 0.08, DW / 2 + 0.08): add(f'lockbr{z}{x:.1f}', box(0.12, 0.12, 0.2, (x, yd - 0.08, dz + z - 0.05)), steel_d)
    add('plate', box(0.5, 0.02, 0.18, (0, yd - 0.015, dz + DH + 0.08)), white)
    for k, x in enumerate((-0.12, 0.0, 0.12)): add(f'plate_txt{k}', box(0.07, 0.01, 0.1, (x, yd - 0.027, dz + DH + 0.12)), hk)
    px, py = -2.3, ye - 0.35
    add('sign_post', box(0.06, 0.06, 1.55, (px, py, 0)), steel_d)
    tri = lambda s, z0: [(px - s, z0), (px + s, z0), (px, z0 + s * 1.7)]
    add('sign_rim', prism(tri(0.34, 1.12), 0.02, py - 0.05), hk)
    add('sign', prism(tri(0.28, 1.16), 0.02, py - 0.06), hy)
    add('sign_bar', box(0.05, 0.01, 0.22, (px, py - 0.07, 1.3)), hk)
    add('sign_dot', box(0.05, 0.01, 0.05, (px, py - 0.07, 1.21)), hk)

    # drain pipe at the front-right corner
    dx_, dy_ = W / 2 - 0.2, yf - 0.12
    add('drain', cyl(0.055, top - 0.2, (dx_, dy_, 0.2), seg=8), steel)
    add('drain_head', box(0.22, 0.2, 0.18, (dx_, dy_ + 0.02, top - 0.18), bevel_w=0.02), steel)
    add('drain_foot', cyl(0.055, 0.25, (dx_, dy_ - 0.25, 0.12), seg=8, axis='Y'), steel)
    for z in (0.9, 2.0): add(f'drain_clamp{z}', box(0.14, 0.14, 0.04, (dx_, dy_ + 0.02, z)), steel_d)

    # supplies: ammo crates (stacked) right of the entrance, oil barrels left, one tipped over
    for k, (x, y, z, rz) in enumerate([(2.7, -4.1, 0, 0.05), (3.5, -4.15, 0, -0.08), (3.1, -4.1, 0.42, 0.12)]):
        add(f'crate{k}', box(0.75, 0.45, 0.42, (x, y, z), bevel_w=0.02, rz=rz), wood)
        for b in (-0.22, 0.22):
            c, s = math.cos(rz), math.sin(rz)
            add(f'crate_band{k}{b}', box(0.05, 0.47, 0.44, (x + c * b, y + s * b, z - 0.01), rz=rz), steel_d)
    for k, (x, y) in enumerate([(-2.6, -4.05), (-3.25, -4.2)]):
        add(f'barrel{k}', cyl(0.29, 0.88, (x, y, 0), seg=12), barrel)
        for z in (0.28, 0.6): add(f'barrel_ring{k}{z}', cyl(0.3, 0.03, (x, y, z), seg=12), steel_d)
        add(f'barrel_lid{k}', cyl(0.06, 0.02, (x + 0.12, y, 0.88), seg=6), steel_d)
    tb = cyl(0.29, 0.88, (0, 0, 0), seg=12, axis='X'); bmesh.ops.rotate(tb, cent=(0, 0, 0), matrix=Matrix.Rotation(0.5, 3, 'Z'), verts=tb.verts)
    bmesh.ops.translate(tb, vec=(-4.3, -5.0, 0.29), verts=tb.verts); add('barrel_down', tb, barrel)
    add('spill', box(0.9, 0.7, 0.01, (-4.0, -5.5, 0.0), rz=0.4), void)
    return out
