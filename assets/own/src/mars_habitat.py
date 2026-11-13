# Mars base (about 26 × 20 m, hab 7.6 m high): central habitat drum with dome, panel seams, round lit portholes, dust drifts and a crack
# (marsquake), a ring of regolith sandbags as radiation shield; airlock module in front with round hatch, hazard stripes, steps and
# a hand rail; greenhouse dome on the right (transparent panes on a rib cage, glowing grow lights, rows of plants) joined by a tunnel;
# solar array of six tilted panels on stands on the left, two radiator fins, comms mast with dish, whip antenna and red beacon;
# oxygen tanks on a rack, cargo crates, a water ice drill, cables and pipes on the ground, rover tracks, rocks and a dark landing pad.
# Front (airlock hatch) faces -y (+z in three.js). Materials (tint keys): hull, hull_dark, panel, seam, dust, regolith, regolith_dark,
# sandbag, window (glows), glass (transparent), grow (glows), plant, hazard_y, hazard_k, solar, metal, metal_dark, beacon (glows),
# cable, tank, crate, void.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/mars_habitat.py
AO = {'strength': 0.6, 'dist': 1.5}

def rod(p1, p2, r, seg=6):
    a, b = Vector(p1), Vector(p2); d = b - a
    bm = cyl(r, d.length, (0, 0, 0), seg=seg)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix(), verts=bm.verts)
    return move(bm, a)

def build(coll):
    R = random.Random(2035)
    M = {k: mat(k, *v) for k, v in {
        'hull': ('#E6E4DE', 0.6, 0.1), 'hull_dark': ('#B9B6AE', 0.6, 0.2), 'panel': ('#D4D1C8', 0.6), 'seam': ('#8D8A84', 0.7),
        'dust': ('#B86A3C', 0.95), 'regolith': ('#A9583A', 0.95), 'regolith_dark': ('#7A3E28', 0.95), 'sandbag': ('#9C5A3A', 0.95),
        'window': ('#FFD9A0', 0.3, 0.0, '#FFC878'), 'glass': ('#CFE6EE', 0.05), 'grow': ('#FF7AD0', 0.4, 0.0, '#E860C8'),
        'plant': ('#4FA04A', 0.8), 'hazard_y': ('#E8B11F', 0.6), 'hazard_k': ('#222222', 0.6), 'solar': ('#1E2A55', 0.25, 0.3),
        'metal': ('#8E9399', 0.4, 0.7), 'metal_dark': ('#4A4E55', 0.5, 0.6), 'beacon': ('#FF3020', 0.3, 0.0, '#FF2010'),
        'cable': ('#2A2A2C', 0.7), 'tank': ('#D9DCE0', 0.4, 0.4), 'crate': ('#C8C2B0', 0.7), 'void': ('#121212', 1.0)}.items()}
    g = M['glass']; b = next(n for n in g.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); b.inputs['Alpha'].default_value = 0.3
    for k, v in (('surface_render_method', 'BLENDED'), ('blend_method', 'BLEND')):
        try: setattr(g, k, v)
        except (AttributeError, TypeError): pass
    out = []
    def add(n, bm, m): out.append(mesh(n, bm, M[m], coll))
    def ring_place(bm, a, r):   # turn a part built at (0, -r) facing -y around the z axis to angle a
        return rotz(bm, a)

    # ground: landing pad, regolith patches, rover tracks, rocks
    add('pad', cyl(13.0, 0.06, (0, 0, 0), seg=32), 'regolith')
    add('pad_dark', cyl(3.2, 0.03, (-8.5, 6.5, 0.06), seg=16), 'regolith_dark')
    for k in range(10):
        a = k * 0.62; add('pad_mark', box(0.25, 1.2, 0.01, (-8.5 + 2.6 * math.cos(a), 6.5 + 2.6 * math.sin(a), 0.09), rz=a + math.pi / 2), 'hazard_y')
    for s in (-1, 1):
        for k in range(14):
            add('track', box(0.35, 0.5, 0.012, (s * 0.9 + 1.5 * math.sin(k * 0.2), -6.5 - k * 0.45, 0.06), rz=0.2 * math.cos(k * 0.2)), 'regolith_dark')
    for i in range(16):
        rr = bmesh.new(); bmesh.ops.create_icosphere(rr, subdivisions=1, radius=R.uniform(0.15, 0.5)); jitter(rr, 0.08, i)
        bmesh.ops.scale(rr, vec=(1, 1, 0.6), verts=rr.verts); a = R.uniform(0, 2 * math.pi); d = R.uniform(9.5, 12.5)
        add('rock', move(rr, (d * math.cos(a), d * math.sin(a), 0.05)), 'regolith_dark')

    # habitat drum with dome, seams, portholes, sandbag shield, dust, crack
    Rh, Hh = 4.0, 3.6
    add('hab', cyl(Rh, Hh, (0, 0, 0.06), seg=28), 'hull')
    add('hab_dome', dome(Rh, (0, 0, Hh + 0.06), seg=28, rings=7, h=2.6), 'hull')
    add('hab_band', cyl(Rh + 0.06, 0.25, (0, 0, Hh - 0.1), seg=28), 'hull_dark')
    add('hab_band', cyl(Rh + 0.06, 0.2, (0, 0, 1.9), seg=28), 'seam')
    for k in range(14):
        a = 2 * math.pi * k / 14
        add('seam_v', move(rotz(box(0.06, 0.06, Hh - 0.2, (0, -Rh - 0.01, 0.1)), a), (0, 0, 0)), 'seam')
    for k in range(7):
        a = 2 * math.pi * k / 7 + 0.2
        pts = [(0, -(Rh + 0.03) * math.cos(ph), Hh + 0.06 + 2.63 * math.sin(ph)) for ph in [i * math.pi / 2 / 6 for i in range(6)]]
        for p1, p2 in zip(pts, pts[1:]): add('dome_rib', rotz(rod(p1, p2, 0.05, 5), a), 'seam')
    for k in range(8):
        a = 2 * math.pi * k / 8 + math.pi / 8
        if abs(((a + math.pi) % (2 * math.pi)) - math.pi) < 0.5: continue   # airlock side
        add('porthole_rim', rotz(cyl(0.38, 0.12, (0, -Rh - 0.06, 2.6), seg=14, axis='Y'), a), 'hull_dark')
        add('porthole', rotz(cyl(0.3, 0.03, (0, -Rh - 0.16, 2.6), seg=14, axis='Y'), a), 'window')
    add('hatch_top', cyl(0.6, 0.15, (0, 0, Hh + 2.62), seg=14), 'hull_dark')
    # sandbag shield ring (two courses) with a gap at the airlock
    for row in range(2):
        n = 40
        for k in range(n):
            a = 2 * math.pi * (k + 0.5 * row) / n
            if abs(((a + math.pi) % (2 * math.pi)) - math.pi) < 0.36: continue   # gap in front (-y) for the airlock
            sb = box(0.62, 0.42, 0.28, (0, -Rh - 0.28, 0.06 + row * 0.27), bevel_w=0.06); jitter(sb, 0.02, k + 50 * row)
            add('sandbag', rotz(sb, a + math.pi / 2 - math.pi / 2), 'sandbag')
    # dust drifts on the drum and dome, panels with scratches, the crack
    for k in range(9):
        a = R.uniform(0, 2 * math.pi); w = R.uniform(1.0, 2.0)
        add('dust', rotz(box(w, 0.02, R.uniform(0.3, 0.8), (0, -Rh - 0.015, R.uniform(0.6, 1.2))), a), 'dust')
    dd = dome(Rh + 0.03, (0, 0, Hh + 0.06), seg=28, rings=7, h=2.63)   # dust drifts: patches of a slightly larger dome shell
    keep = set(R.sample(range(28 * 3), 16))
    dd.faces.ensure_lookup_table()
    drop = [f for i, f in enumerate(dd.faces) if not (len(f.verts) == 4 and i < 28 * 3 and i in keep)]
    bmesh.ops.delete(dd, geom=drop, context='FACES'); add('dust_dome', dd, 'dust')
    cr = [(0, -Rh - 0.02, 3.4), (0.3, -Rh - 0.02, 2.9), (0.15, -Rh - 0.02, 2.4), (0.55, -Rh - 0.02, 1.95), (0.4, -Rh - 0.02, 1.4)]
    for p1, p2 in zip(cr, cr[1:]): add('crack', rotz(rod(p1, p2, 0.025, 4), 0.55), 'void')

    # airlock module (horizontal cylinder) in front, hatch, stripes, steps, rail
    ya = -Rh - 2.4
    add('airlock', cyl(1.35, 3.0, (0, ya, 1.55), seg=18, axis='Y'), 'hull')
    add('airlock_ring', cyl(1.42, 0.2, (0, ya - 0.05, 1.55), seg=18, axis='Y'), 'hull_dark')
    add('airlock_ring', cyl(1.42, 0.2, (0, ya + 1.4, 1.55), seg=18, axis='Y'), 'hull_dark')
    add('airlock_end', cyl(1.3, 0.12, (0, ya - 0.12, 1.55), seg=18, axis='Y'), 'hull_dark')
    hd = cyl(0.75, 0.1, (0, ya - 0.22, 1.35), seg=16, axis='Y'); recess(hd, (0, -1, 0), 0.12, 0.04); add('hatch', hd, 'panel')
    add('hatch_wheel', torus(0.28, 0.035, (0, ya - 0.3, 1.35), seg=12, seg2=4, axis='Y'), 'metal_dark')
    add('hatch_window', cyl(0.16, 0.02, (0, ya - 0.27, 1.85), seg=10, axis='Y'), 'window')
    for k in range(8):
        add('hazard', box(0.22, 0.03, 0.12, (-0.8 + k * 0.23, ya - 0.2, 2.45), rz=0), 'hazard_y' if k % 2 else 'hazard_k')
    for s in (-1, 1): add('airlock_leg', box(0.25, 0.25, 0.35, (s * 0.9, ya + 1.5, 0.06)), 'metal_dark')
    for k in range(3): add('step', box(1.4, 0.4, 0.12, (0, ya - 0.5 - k * 0.4, 0.06 + (2 - k) * 0.22), bevel_w=0.02), 'metal')
    for s in (-1, 1):
        add('rail_post', rod((s * 0.75, ya - 1.3, 0.1), (s * 0.75, ya - 1.3, 1.1), 0.03, 5), 'metal')
        add('rail', rod((s * 0.75, ya - 1.3, 1.1), (s * 0.75, ya - 0.35, 1.6), 0.03, 5), 'metal')
    add('airlock_light', box(0.3, 0.1, 0.12, (0, ya - 0.2, 2.75)), 'window')

    # greenhouse dome to the right, tunnel, ribs, grow lights, plant rows
    gx = 10.0
    add('tunnel', cyl(0.95, gx - 2.8 - Rh, (Rh - 0.2, 0, 1.1), seg=14, axis='X'), 'hull_dark')
    for k in range(3): add('tunnel_ring', cyl(1.02, 0.15, (Rh + 0.6 + k * 0.9, 0, 1.1), seg=14, axis='X'), 'seam')
    add('gh_base', cyl(3.0, 0.5, (gx, 0, 0.06), seg=24), 'hull_dark')
    add('gh_glass', dome(2.95, (gx, 0, 0.56), seg=24, rings=6, h=2.7), 'glass')
    for k in range(8):
        a = 2 * math.pi * k / 8
        pts = [(gx + 2.95 * math.cos(ph) * math.cos(a), 2.95 * math.cos(ph) * math.sin(a), 0.56 + 2.7 * math.sin(ph)) for ph in [i * math.pi / 12 for i in range(7)]]
        for p1, p2 in zip(pts, pts[1:]): add('gh_rib', rod(p1, p2, 0.05, 5), 'metal')
    add('gh_ring', torus(2.98, 0.05, (gx, 0, 1.6), seg=24, seg2=4, axis='Z'), 'metal')
    for r in (-1.2, 0.0, 1.2):
        add('bed', box(3.4 - abs(r) * 0.8, 0.6, 0.45, (gx, r, 0.56), bevel_w=0.03), 'crate')
        for k in range(6):
            x = gx - 1.3 + abs(r) * 0.3 + k * (0.5 - abs(r) * 0.05)
            p = bmesh.new(); bmesh.ops.create_icosphere(p, subdivisions=1, radius=0.18); jitter(p, 0.05, k + int(r * 10)); add('plant', move(p, (x, r, 1.12)), 'plant')
        add('grow_light', box(3.0 - abs(r) * 0.8, 0.15, 0.06, (gx, r, 2.5 - abs(r) * 0.3)), 'grow')
        add('grow_hanger', rod((gx, r, 2.56 - abs(r) * 0.3), (gx, r * 0.3, 3.2), 0.015, 4), 'metal_dark')

    # solar array (left), radiators, comms mast
    for i in range(6):
        x = -9.0 - (i % 3) * 3.0; y = -3.0 + (i // 3) * 4.0
        add('solar_post', rod((x, y, 0.06), (x, y, 1.2), 0.08, 6), 'metal_dark')
        sp = box(2.6, 1.6, 0.06, (0, 0, 0)); bmesh.ops.rotate(sp, cent=(0, 0, 0), matrix=Matrix.Rotation(-0.5, 3, 'X'), verts=sp.verts)
        add('solar', move(sp, (x, y, 1.2)), 'solar')
        fr = box(2.7, 0.05, 0.08, (0, 0, 0)); bmesh.ops.rotate(fr, cent=(0, 0, 0), matrix=Matrix.Rotation(-0.5, 3, 'X'), verts=fr.verts)
        add('solar_frame', move(fr, (x, y + 0.7, 1.58)), 'metal')
        for k in range(1, 5):
            gl = box(0.03, 1.62, 0.07, (0, 0, 0)); bmesh.ops.rotate(gl, cent=(0, 0, 0), matrix=Matrix.Rotation(-0.5, 3, 'X'), verts=gl.verts)
            add('solar_grid', move(gl, (x - 1.3 + k * 0.52, y, 1.2)), 'metal')
        if i % 2: add('dust_solar', move(rotz(box(0.8, 0.5, 0.07, (0, 0, 0)), 0.2), (x + 0.6, y - 0.3, 1.0)), 'dust')
    for s in (-1, 1):
        add('radiator', box(0.12, 2.6, 2.2, (-Rh - 0.9, s * 1.8, 0.8), bevel_w=0.02), 'panel')
        for k in range(6): add('radiator_fin', box(0.16, 0.03, 2.1, (-Rh - 0.9, s * 1.8 - 1.1 + k * 0.44, 0.85)), 'seam')
        add('radiator_strut', rod((-Rh - 0.85, s * 1.8, 1.9), (-Rh + 0.05, s * 1.8, 2.3), 0.04, 5), 'metal_dark')
    mx, my = -2.0, 5.6
    add('mast', cyl(0.12, 8.0, (mx, my, 0.06), seg=8), 'metal')
    for k in range(4): add('mast_brace', rod((mx, my, 2.0 + k * 1.6), (mx + 0.5, my, 2.8 + k * 1.6), 0.03, 4), 'metal_dark')
    for k in range(3):
        a = k * 2.1; add('guy_wire', rod((mx, my, 6.0), (mx + 3.5 * math.cos(a), my + 3.5 * math.sin(a), 0.06), 0.012, 3), 'cable')
    d = dome(1.1, (0, 0, 0), seg=14, rings=3, h=0.35); bmesh.ops.rotate(d, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(110), 3, 'X'), verts=d.verts)
    add('dish', move(d, (mx, my - 0.4, 6.8)), 'hull')
    add('dish_feed', rod((mx, my - 0.5, 6.8), (mx, my - 1.3, 7.0), 0.03, 5), 'metal')
    add('whip', cyl(0.025, 2.5, (mx, my, 8.06), seg=5), 'metal_dark')
    add('beacon', dome(0.15, (mx, my, 8.0), seg=8, rings=3), 'beacon')
    # tanks, crates, ice drill, cables
    add('tank_rack', box(3.2, 1.0, 0.15, (5.0, -5.6, 0.06)), 'metal_dark')
    for k in range(4):
        add('o2_tank', cyl(0.36, 1.6, (3.8 + k * 0.8, -5.6, 0.21), seg=12), 'tank')
        add('tank_cap', dome(0.36, (3.8 + k * 0.8, -5.6, 1.81), seg=12, rings=3, h=0.25), 'tank')
        add('tank_band', cyl(0.37, 0.12, (3.8 + k * 0.8, -5.6, 1.2), seg=12), 'hazard_y' if k % 2 else 'seam')
    for (x, y, rz, h) in [(-5.8, -6.0, 0.2, 0.9), (-6.9, -5.6, -0.1, 0.9), (-6.3, -5.8, 0.4, 0.7)]:
        c = box(1.0, 0.9, h, (x, y, 0.06 if h > 0.8 else 0.96), bevel_w=0.04, rz=rz); recess(c, (0, -1, 0), 0.08, 0.03); add('crate', c, 'crate')
    for k in range(4): add('drill_leg', rod((6.5, 5.5, 3.6), (6.5 + 1.4 * math.cos(k * 1.57), 5.5 + 1.4 * math.sin(k * 1.57), 0.06), 0.07, 5), 'metal')
    add('drill', cyl(0.12, 3.8, (6.5, 5.5, 0.0), seg=8), 'metal_dark')
    add('drill_motor', box(0.6, 0.6, 0.7, (6.5, 5.5, 3.2), bevel_w=0.05), 'hazard_y')
    for p1, p2 in [((1.0, -Rh, 0.1), (3.6, -5.2, 0.1)), ((Rh, 2.0, 0.1), (6.5, 5.5, 0.1)), ((-Rh - 0.9, 0.0, 0.1), (-9.0, -1.0, 0.1)), ((-9.0, -1.0, 0.1), (-12.0, 1.0, 0.1))]:
        add('cable', rod(p1, p2, 0.05, 5), 'cable')
    return out
