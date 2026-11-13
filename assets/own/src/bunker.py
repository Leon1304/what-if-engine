# Low-poly concrete bunker (~9.6 × 4.6 × 9 m incl. steps, antenna 6 m): bevelled shell on a footing, turf roof, entrance block with
# recessed blast door (wheel, hinges, rivets), hazard stripes, caged lamp, gun slits with steel shutters, vent pipes, periscope,
# antenna, side ladder, conduit, sandbag walls, steps, rust streaks. Front = -y in Blender = +z in three.js (faces the camera at ry 0).
# Materials (tint keys): concrete, concrete_dark, turf, steel, steel_dark, rust, void, sandbag, hazard_y, hazard_k, lamp.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/bunker.py
AO = {'strength': 0.65, 'dist': 1.0}

def build(coll):
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
