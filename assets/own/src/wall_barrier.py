# Giant precast concrete security wall, one 12 m segment (exactly x = ±6 m, tiles seamlessly at 12 m spacing), 16.5 m high.
# Outside (the side to defend against) faces -y in Blender = +z in three.js; footing from 0.7 m in front of the outside face (y = -0.3) to y = 2.3.
# Four T-wall slabs with dark joints, lifting holes, pour lines, grime streaks, dark smears and claw scratches low on the outside,
# capping beam, concertina wire along the top, steel walkway on brackets behind with railing and toe board, a floodlight mast.
# Materials: concrete, concrete_dark, grime, stain, void, steel, steel_dark, lamp.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/wall_barrier.py
AO = {'strength': 0.6, 'dist': 1.5}

def blob(cx, cz, w, h, n=9):
    """Ragged outline around (cx, cz), w × h, for stains (deterministic through the module's R)."""
    return [(cx + w / 2 * math.cos(2 * math.pi * k / n) * R.uniform(0.6, 1.1), cz + h / 2 * math.sin(2 * math.pi * k / n) * R.uniform(0.6, 1.1)) for k in range(n)]

def build(coll):
    global R
    R = random.Random(31); out = []
    conc, conc_d = mat('concrete', '#A9A59C', 0.95), mat('concrete_dark', '#86827A', 0.95)
    grime, stain, void = mat('grime', '#6E6A62', 1.0), mat('stain', '#3F3A34', 1.0), mat('void', '#141414', 1.0)
    steel, steel_d, lamp = mat('steel', '#6C7377', 0.5, 0.6), mat('steel_dark', '#33383A', 0.5, 0.7), mat('lamp', '#FFF2C8', 0.3, emit='#FFE2A0')
    add = lambda n, bm, m: out.append(mesh(n, bm, m, coll))
    L, H, T, F = 12.0, 15.9, 0.6, 0.6        # length, slab height above footing, slab thickness, footing height
    yf = -T / 2                               # outside face
    add('footing', box(L, 3.3, F, (0, 0.65, 0), bevel_w=0.04), conc_d)   # y from -1.0 to 2.3, same as wall_tower
    for i in range(4):
        x = -L / 2 + 1.5 + 3.0 * i
        add(f'slab{i}', box(2.97, T, H, (x, 0, F), bevel_w=0.04), conc)
        add(f'flange{i}', box(2.97, 1.9, 1.3, (x, 1.25, F), bevel_w=0.04), conc)
        for s in (-1, 1): add(f'lift{i}{s}', box(0.18, 0.02, 0.18, (x + s * 0.7, yf - 0.005, F + H - 1.1)), void)
        for z in (5.3, 10.6): add(f'pour{i}{z}', box(2.9, 0.012, 0.05, (x, yf - 0.004, F + z)), conc_d)
        for k in range(3):   # grime streaks running down from the top, narrowing as they go
            h, w, u = R.uniform(1.5, 5.0), R.uniform(0.12, 0.4), x + R.uniform(-1.2, 1.2); zt_ = F + H - 0.1
            add(f'grime{i}{k}', prism([(u - w * 0.15, zt_ - h), (u + w * 0.15, zt_ - h), (u + w / 2, zt_ - h * 0.4), (u + w / 2, zt_), (u - w / 2, zt_), (u - w / 2, zt_ - h * 0.5)], 0.01, yf - 0.006), grime)
        for k in range(2):   # ragged dark smears low on the outside (from the crowd pushing against it)
            add(f'stain{i}{k}', prism(blob(x + R.uniform(-0.9, 0.9), F + R.uniform(0.6, 1.6), R.uniform(0.5, 1.1), R.uniform(1.0, 2.2)), 0.01, yf - 0.008), stain)
        for k in range(4):   # claw scratches: thin slanted dark strokes
            u, z = x + R.uniform(-1.2, 1.2), F + R.uniform(1.0, 4.5); dx, dz = R.uniform(-0.15, 0.15), R.uniform(0.5, 0.9)
            for j in range(3):
                o = j * 0.07
                add(f'scratch{i}{k}{j}', prism([(u + o, z), (u + o + 0.025, z), (u + o + dx + 0.025, z + dz), (u + o + dx, z + dz)], 0.008, yf - 0.012), stain)
    for i in range(3): add(f'joint{i}', box(0.05, T - 0.1, H, (-L / 2 + 3.0 * (i + 1), 0, F)), void)
    # capping beam with drip lip, concertina wire on top of the outside edge
    zc = F + H
    add('cap', box(L, 1.3, 0.45, (0, 0.2, zc), bevel_w=0.05), conc)
    add('cap_lip', box(L, 0.12, 0.12, (0, yf - 0.1, zc - 0.05)), conc_d)
    for k in range(48):
        x = -L / 2 + 0.125 + 0.25 * k
        ring = torus(0.32, 0.008, (0, 0, 0), seg=8, seg2=3, axis='X')
        bmesh.ops.rotate(ring, cent=(0, 0, 0), matrix=Matrix.Rotation(0.2 * (1 if k % 2 else -1), 3, 'Z'), verts=ring.verts)
        add(f'coil{k}', move(ring, (x, -0.05, zc + 0.45 + 0.33)), steel_d)
    for x in (-5.5, -2.0, 2.0, 5.5):
        add(f'coil_post{x}', box(0.04, 0.04, 0.8, (x, -0.05, zc + 0.45)), steel_d)
    # walkway behind the wall: brackets, grating deck, toe board, railing
    zw = zc - 1.3
    for x in (-5.0, -2.0, 1.0, 4.0):
        add(f'bracket{x}', box(0.12, 1.8, 0.14, (x, 1.2, zw - 0.14)), steel_d)
        st = box(0.1, 0.1, 2.2, (0, 0, 0)); bmesh.ops.rotate(st, cent=(0, 0, 0), matrix=Matrix.Rotation(-0.7, 3, 'X'), verts=st.verts)
        add(f'strut{x}', move(st, (x, 0.32, zw - 1.75)), steel_d)
    add('deck', box(L, 1.8, 0.08, (0, 1.2, zw), bevel_w=0.01), steel)
    for k in range(24): add(f'grating{k}', box(0.03, 1.8, 0.01, (-L / 2 + 0.25 + 0.5 * k, 1.2, zw + 0.08)), steel_d)
    add('toe', box(L, 0.04, 0.15, (0, 2.06, zw + 0.08)), steel)
    for k in range(9): add(f'rail_post{k}', box(0.05, 0.05, 1.1, (-L / 2 + 0.3 + 1.425 * k, 2.06, zw + 0.08)), steel_d)
    for z in (0.55, 1.12): add(f'rail{z}', box(L, 0.05, 0.05, (0, 2.06, zw + 0.08 + z)), steel_d)
    # floodlight mast on the walkway, aimed down the outside
    add('mast', cyl(0.07, 4.2, (0, 1.75, zw + 0.08), seg=8), steel_d)
    add('mast_arm', box(0.08, 2.0, 0.08, (0, 0.8, zw + 4.1)), steel_d)
    head = box(0.8, 0.35, 0.45, (0, 0, -0.22), bevel_w=0.03); bmesh.ops.rotate(head, cent=(0, 0, 0), matrix=Matrix.Rotation(0.6, 3, 'X'), verts=head.verts)
    add('flood', move(head, (0, -0.1, zw + 4.0)), steel)
    lens = box(0.68, 0.02, 0.33, (0, 0, -0.165)); bmesh.ops.rotate(lens, cent=(0, 0, 0), matrix=Matrix.Rotation(0.6, 3, 'X'), verts=lens.verts)
    add('flood_lens', move(lens, (0, -0.29, zw + 3.89)), lamp)
    return out
