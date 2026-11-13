# Low-poly concrete bunker at full detail (~9.8 × 6.6 × 11.4 m incl. steps and wire, antenna 6 m, ~10 000 tris): bevelled shell on a
# footing with formwork seams, turf roof, entrance block with recessed blast door (wheel, hinges, rivets, locking bars, number plate),
# hazard stripes, caged lamp, gun slits with steel shutters, vent pipes, periscope, antenna, side ladder, conduit, back hatch, exhaust;
# concrete damage with exposed rebar, cracks, grime streaks, moss, rubble, barbed wire on the roof edge, concertina wire, MG nest,
# searchlight, warning sign, drain pipe, ammo crates, oil barrels, sandbag walls, steps. Front = -y in Blender = +z in three.js.
# Materials (tint keys): concrete, concrete_dark, turf, steel, steel_dark, rust, void, sandbag, hazard_y, hazard_k, lamp, wood, moss,
# grime, barrel, white.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/bunker.py
AO = {'strength': 0.7, 'dist': 1.0}

def _shell(coll):
    """Concrete shell, entrance, door, slits, roof fittings, ladder, conduit, back hatch, exhaust, sandbags."""
    R = random.Random(11)
    concrete, concrete_d = mat('concrete', '#8F8C85', 0.95), mat('concrete_dark', '#6E6B65', 0.95)
    turf = mat('turf', '#5B7A36', 1.0)
    steel, steel_d = mat('steel', '#55624F', 0.55, 0.5), mat('steel_dark', '#33383A', 0.5, 0.7)
    rust, void, bag = mat('rust', '#7C4A2A', 0.9), mat('void', '#121212', 1.0), mat('sandbag', '#B19A6C', 1.0)
    hy, hk = mat('hazard_y', '#E2B322', 0.7), mat('hazard_k', '#1C1C1C', 0.7)
    lamp = mat('lamp', '#FFE7A8', 0.3, emit='#FFC45A')
    out = []
    def add(name, bm, m): out.append(mesh(name, bm, m, coll))

    W, D, H, F = 9.0, 7.0, 2.9, 0.3            # shell width, depth, height, footing height
    yf = -D / 2                                  # front wall
    # footing, shell, roof slab with drip edge, turf mound
    add('footing', box(W + 0.4, D + 0.4, F, bevel_w=0.05), concrete_d)
    shell = box(W, D, H, (0, 0, F), bevel_w=0.14, seg=2)
    add('shell', shell, concrete)
    for z in (1.05, 2.1):                         # formwork seams: thin raised bands around the shell
        add(f'seam{z}', box(W + 0.03, D + 0.03, 0.05, (0, 0, F + z)), concrete_d)
    add('roof', box(W + 0.5, D + 0.5, 0.32, (0, 0, F + H), bevel_w=0.07, seg=1), concrete)
    add('roof_edge', box(W + 0.62, D + 0.62, 0.06, (0, 0, F + H + 0.04), bevel_w=0.02), concrete_d)
    m = bmesh.new(); bmesh.ops.create_cube(m, size=1); bmesh.ops.subdivide_edges(m, edges=list(m.edges), cuts=3, use_grid_fill=True)
    zt = F + H + 0.32
    for v in m.verts:
        if v.co.z > 0.25:   # top: domed, tapered, bumpy
            v.co.x *= 0.86; v.co.y *= 0.84; v.co.z += 0.7 * (1 - (abs(v.co.x) + abs(v.co.y)) * 0.9) + R.uniform(-0.18, 0.18)
    bmesh.ops.scale(m, vec=(W - 0.3, D - 0.3, 0.45), verts=m.verts); bmesh.ops.translate(m, vec=(0, 0, zt + 0.2), verts=m.verts)
    add('turf', m, turf)
    roof_top = zt + 0.42

    # entrance block with a recessed door frame
    ED, EW, EH = 1.6, 3.4, 2.75
    ye = yf - ED                                  # front of the entrance block
    ent = box(EW, ED + 0.2, EH + F, (0, yf - ED / 2 + 0.1, 0), bevel_w=0.1, seg=2)   # from the ground: in front of the footing
    recess(ent, (0, -1, 0), inset=0.38, depth=0.28)
    add('entrance', ent, concrete)
    add('ent_cap', box(EW + 0.3, ED + 0.45, 0.22, (0, yf - ED / 2 + 0.05, F + EH), bevel_w=0.05), concrete_d)
    yd = ye + 0.28                                 # recessed face
    DW, DH, dz = 2.1, 1.95, 0.42
    add('door', box(DW, 0.12, DH, (0, yd - 0.05, dz), bevel_w=0.03), steel)
    add('door_panel', recess(box(DW - 0.3, 0.06, DH - 0.3, (0, yd - 0.1, dz + 0.15), bevel_w=0.01), (0, -1, 0), 0.08, -0.02), steel)
    add('wheel', torus(0.3, 0.035, (0.25, yd - 0.2, dz + 1.0), seg=14, seg2=6), steel_d)
    add('wheel_hub', cyl(0.07, 0.12, (0.25, yd - 0.24, dz + 1.0), seg=8, axis='Y'), steel_d)
    for a in range(3):
        sp = box(0.56, 0.04, 0.04, (0.25, yd - 0.2, dz + 1.0 - 0.02), rz=0)
        bmesh.ops.rotate(sp, cent=(0.25, yd - 0.2, dz + 1.0), matrix=Matrix.Rotation(a * math.pi / 3, 3, 'Y'), verts=sp.verts)
        add(f'spoke{a}', sp, steel_d)
    for z in (0.25, DH - 0.45):
        add(f'hinge{z:.1f}', cyl(0.07, 0.22, (-DW / 2 + 0.02, yd - 0.12, dz + z), seg=8), steel_d)
        add(f'rust_h{z:.1f}', box(0.05, 0.01, 0.35 + R.uniform(0, 0.2), (-DW / 2 + 0.03, yd - 0.115, dz + z - 0.4)), rust)
    for i in range(6):                             # rivets along the door edges
        for x in (-DW / 2 + 0.1, DW / 2 - 0.1):
            add(f'rivet{i}{x:.1f}', box(0.05, 0.03, 0.05, (x, yd - 0.12, dz + 0.15 + i * (DH - 0.35) / 5)), steel_d)
    add('sill', box(DW + 0.4, 0.35, 0.1, (0, yd - 0.1, 0.32), bevel_w=0.02), concrete_d)

    # hazard stripes above the door, on the entrance front
    zb, hb, x0 = F + EH - 0.34, 0.22, -EW / 2 + 0.42
    add('hazard_band', box(EW - 0.84, 0.02, hb, (0, ye - 0.01, zb)), hk)
    k = 0
    while x0 < EW / 2 - 0.42 - 0.2:
        x1 = min(x0 + 0.18, EW / 2 - 0.42 - hb)
        add(f'stripe{k}', prism([(x0, zb), (x1, zb), (x1 + hb, zb + hb), (x0 + hb, zb + hb)], 0.02, ye - 0.025), hy)
        x0 += 0.36; k += 1

    # caged lamp over the door
    add('lamp_arm', box(0.08, 0.35, 0.08, (0, ye - 0.15, zb + 0.24)), steel_d)
    add('lamp', cyl(0.11, 0.17, (0, ye - 0.35, zb + 0.16), seg=8), lamp)
    add('lamp_cage', torus(0.13, 0.015, (0, ye - 0.35, zb + 0.25), seg=8, seg2=4, axis='Z'), steel_d)

    # steps up to the door
    add('step0', box(DW + 0.8, 0.8, 0.14, (0, ye - 0.4, 0), bevel_w=0.03), concrete_d)
    add('step1', box(DW + 0.6, 0.4, 0.28, (0, ye - 0.2, 0), bevel_w=0.03), concrete_d)

    # gun slits with frames and steel shutters, front and sides
    def slit(name, at, rz):
        fr = box(1.7, 0.3, 0.6, at, bevel_w=0.06, rz=rz); add(name + '_frame', fr, concrete_d)
        c, s = math.cos(rz), math.sin(rz)
        off = lambda d: (at[0] + s * d, at[1] - c * d, at[2])
        add(name + '_hole', box(1.3, 0.05, 0.2, (off(0.14)[0], off(0.14)[1], at[2] + 0.2), rz=rz), void)
        sh = box(1.4, 0.04, 0.08, (off(0.18)[0], off(0.18)[1], at[2] + 0.44), rz=rz); add(name + '_shutter', sh, steel)
        add(name + '_rust', box(0.06, 0.01, 0.5, (off(0.16)[0], off(0.16)[1], at[2] - 0.45), rz=rz), rust)
    slit('slit_l', (-3.0, yf - 0.1, F + 1.7), 0); slit('slit_r', (3.0, yf - 0.1, F + 1.7), 0)
    slit('slit_e', (W / 2 + 0.1, 0.8, F + 1.7), math.pi / 2); slit('slit_w', (-W / 2 - 0.1, 0.8, F + 1.7), -math.pi / 2)

    # roof: two vent pipes with mushroom caps, periscope, antenna
    for i, (x, y) in enumerate([(-2.6, 1.6), (2.4, 2.0)]):
        add(f'vent{i}', cyl(0.16, 1.1, (x, y, roof_top - 0.3), seg=10), steel)
        add(f'vent_cap{i}', cyl(0.34, 0.16, (x, y, roof_top + 0.78), seg=10, r2=0.08), steel_d)
        add(f'vent_ring{i}', cyl(0.2, 0.08, (x, y, roof_top + 0.3), seg=10), steel_d)
    add('peri_base', box(0.7, 0.7, 0.5, (0.6, -1.2, roof_top - 0.3), bevel_w=0.05), concrete_d)
    add('peri', box(0.32, 0.32, 0.8, (0.6, -1.2, roof_top + 0.2), bevel_w=0.02), steel)
    add('peri_head', box(0.42, 0.5, 0.26, (0.6, -1.25, roof_top + 1.0), bevel_w=0.03), steel)
    add('peri_glass', box(0.3, 0.02, 0.1, (0.6, -1.51, roof_top + 1.08)), void)
    add('ant_base', box(0.4, 0.4, 0.2, (-3.6, -2.6, roof_top - 0.15), bevel_w=0.03), steel_d)
    add('antenna', cyl(0.03, 2.6, (-3.6, -2.6, roof_top), seg=6, r2=0.015), steel_d)
    add('ant_bar', cyl(0.015, 0.7, (-3.95, -2.6, roof_top + 1.9), seg=5, axis='X'), steel_d)

    # ladder on the east wall, conduit along the west wall
    lx = W / 2 + 0.42                             # clear of the roof slab's overhang
    for y in (-2.0, -1.5):
        add(f'rail{y}', box(0.06, 0.06, H + 1.3, (lx, y, F)), steel_d)
        for z in (0.6, 2.2):
            add(f'bracket{y}{z}', box(0.42, 0.05, 0.05, (W / 2 + 0.2, y, F + z)), steel_d)
    for i in range(9):
        add(f'rung{i}', cyl(0.02, 0.5, (lx, -2.0, F + 0.3 + i * 0.36), seg=6, axis='Y'), steel_d)
    add('conduit', cyl(0.07, D - 1.0, (-W / 2 - 0.12, -(D - 1.0) / 2, F + 2.4), seg=8, axis='Y'), steel)
    for y in (-2.5, 0.0, 2.5):
        add(f'clamp{y}', box(0.08, 0.1, 0.2, (-W / 2 - 0.06, y, F + 2.33)), steel_d)
    add('box_el', box(0.4, 0.3, 0.55, (-W / 2 - 0.15, 1.8, F + 1.6), bevel_w=0.03, rz=math.pi / 2), steel)

    # back wall: emergency hatch with frame and an exhaust pipe bending up past the roof
    yb = D / 2
    hatch = box(1.2, 0.25, 1.2, (2.2, yb + 0.05, F + 0.5), bevel_w=0.05, rz=math.pi); recess(hatch, (0, 1, 0), 0.12, 0.08)
    add('hatch_frame', hatch, concrete_d)
    add('hatch', box(0.9, 0.06, 0.9, (2.2, yb + 0.15, F + 0.65), bevel_w=0.02), steel)
    add('hatch_bar', box(0.7, 0.06, 0.06, (2.2, yb + 0.2, F + 1.05)), steel_d)
    add('exhaust_h', cyl(0.12, 0.6, (-2.4, yb, F + 0.9), seg=8, axis='Y'), steel)
    add('exhaust_v', cyl(0.12, H + 0.6, (-2.4, yb + 0.6, F + 0.78), seg=8), steel)
    add('exhaust_elbow', box(0.26, 0.26, 0.26, (-2.4, yb + 0.6, F + 0.78), bevel_w=0.06), steel)
    add('exhaust_top', cyl(0.16, 0.3, (-2.4, yb + 0.6, F + H + 1.3), seg=8, r2=0.12), steel_d)

    # sandbag walls left and right of the steps (staggered rows, slight random turn)
    for side in (-1, 1):
        for row in range(3):
            for i in range(5 - row):
                x = side * (DW / 2 + 1.0 + 0.62 * i + 0.31 * row)
                rz = R.uniform(-0.08, 0.08)
                add(f'bag{side}{row}{i}', box(0.6, 0.38, 0.22, (x, ye - 0.9 + R.uniform(-0.03, 0.03), row * 0.21), bevel_w=0.07, seg=1, rz=rz), bag)
    return out


def build(coll):
    out = _shell(coll)
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
