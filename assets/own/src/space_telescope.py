# Space telescope in the style of the big orbital observatories (13.2 m long, 4.2 m across the body, 12 m wing span): forward light
# shield wrapped in crinkled silver foil with seams and patches, aperture door hinged open, dark baffle inside; equipment section with
# twelve access bays, rings, grapple pins and yellow handrails; aft shroud with doors, vents and aft bulkhead; two solar-array wings
# with cell grid, frames, masts and drive boxes; two high-gain dishes on booms, low-gain antennas, magnetometers, star trackers.
# Wear: darker and gold foil patches, peeled foil, scorch marks around the aft end and a dent in the light shield.
# The tube lies along y: the aperture looks along -y (+z in three.js, so it "flies" forward like drive()); wings along x.
# Materials (tint keys): foil, foil_dark, foil_gold, white, metal, metal_dark, void, solar, solar_grid, rail, dish, scorch.
# In space: asset(world, 'own/space_telescope', x, z, { y: 300, dyn: true }) and turn/move the group per frame.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/space_telescope.py
AO = {'strength': 0.55, 'dist': 1.4}

def build(coll):
    R = random.Random(11)
    M = {k: mat(k, *v) for k, v in {
        'foil': ('#C9CDD3', 0.3, 0.7), 'foil_dark': ('#959BA4', 0.35, 0.7), 'foil_gold': ('#C99A44', 0.3, 0.7), 'white': ('#E4E4DF', 0.6),
        'metal': ('#8C9198', 0.4, 0.6), 'metal_dark': ('#4A4F57', 0.5, 0.5), 'void': ('#0A0C10', 1.0), 'solar': ('#1F2E5C', 0.25, 0.3),
        'solar_grid': ('#B9BDC5', 0.4, 0.5), 'rail': ('#D9B43A', 0.5), 'dish': ('#E9E9E4', 0.6), 'scorch': ('#6B5A4C', 0.9)}.items()}
    out = []
    def add(n, bm, m): out.append(mesh(n, bm, M[m], coll))
    def tube(r, y0, y1, seg=24, r2=None):   # cylinder along y from y0 (front) to y1 (back), centred on the axis at z = 0
        return cyl(r, y1 - y0, (0, y0, 0), seg=seg, r2=r2, axis='Y')

    # axis: z = 0 is the tube centre (export moves the bottom to the ground); y from -6.6 (aperture) to +6.6 (aft)
    yA, yS, yE, yB = -6.6, -1.9, 1.9, 5.5      # aperture, light shield / equipment joint, equipment / aft joint, aft bulkhead
    rS, rE = 1.55, 2.1
    add('shield', tube(rS, yA, yS + 0.3), 'foil')
    for y in (-5.6, -4.5, -3.4, -2.4): add('seam', tube(rS + 0.012, y, y + 0.05), 'foil_dark')
    add('shield_lip', tube(rS + 0.06, yA, yA + 0.12), 'metal')
    add('cone', tube(rS, yS + 0.3, yS + 0.75, r2=rE), 'foil')
    add('equip', tube(rE, yS + 0.75, yE), 'foil')
    add('aft', tube(rE, yE, yB), 'foil')
    add('aft_bulkhead', tube(rE * 0.92, yB, yB + 0.25), 'metal_dark')
    add('aft_ring', tube(rE + 0.05, yB - 0.15, yB), 'metal')
    for y in (yS + 0.75, yE, yE + 1.8): add('ring', tube(rE + 0.04, y - 0.06, y + 0.06), 'metal')
    # aperture: dark baffle, secondary-mirror spider and the open door hinged at the top
    add('baffle', tube(rS - 0.08, yA - 0.01, yA + 0.6), 'void')
    for a in (0, math.pi / 2):
        sp = box(2 * (rS - 0.1), 0.04, 0.04, (0, yA + 0.9, -0.02)); bmesh.ops.rotate(sp, cent=(0, yA + 0.9, 0), matrix=Matrix.Rotation(a, 3, 'Y'), verts=sp.verts)
        add('spider', sp, 'metal_dark')
    add('secondary', cyl(0.2, 0.12, (0, yA + 0.84, 0), seg=12, axis='Y'), 'metal')
    door = cyl(rS + 0.08, 0.12, (0, 0, 0), seg=24, axis='Y'); recess(door, (0, -1, 0), 0.18, -0.03)
    bmesh.ops.translate(door, vec=(0, 0, -(rS + 0.08)), verts=door.verts)
    bmesh.ops.rotate(door, cent=(0, 0, 0), matrix=Matrix.Rotation(-math.radians(105), 3, 'X'), verts=door.verts)
    add('door', move(door, (0, yA - 0.02, rS + 0.08)), 'foil')
    add('door_hinge', cyl(0.09, 1.0, (-0.5, yA, rS + 0.08), seg=8, axis='X'), 'metal')
    add('door_arm', box(0.12, 0.7, 0.12, (0.6, yA + 0.05, rS + 0.02), bevel_w=0.02), 'metal_dark')

    # foil wear on the light shield: darker / gold patches, peeled flaps, a dent (flattened patch) and scorch
    def on_tube(r, ang, y, w, l, t=0.012):
        b = box(w, l, t, (0, y, r)); bmesh.ops.rotate(b, cent=(0, 0, 0), matrix=Matrix.Rotation(ang, 3, 'Y'), verts=b.verts); return b
    for i in range(10):
        add('patch', on_tube(rS + 0.004, R.uniform(0, 2 * math.pi), R.uniform(-6.2, -2.4), R.uniform(0.4, 0.9), R.uniform(0.4, 1.0)), 'foil_dark' if i % 3 else 'foil_gold')
    for i in range(4):
        f = on_tube(rS + 0.02, R.uniform(0, 2 * math.pi), R.uniform(-5.8, -2.8), 0.35, 0.5, 0.01)
        f.verts.ensure_lookup_table(); bmesh.ops.rotate(f, cent=f.verts[0].co.copy(), matrix=Matrix.Rotation(0.4, 3, 'X'), verts=f.verts); add('peel', f, 'foil')
    add('dent', on_tube(rS - 0.03, 2.4, -4.0, 0.7, 0.8, 0.06), 'foil_dark')
    for i in range(7):
        add('scorch', on_tube(rE + 0.006, R.uniform(0, 2 * math.pi), R.uniform(yE + 0.3, yB - 0.2), R.uniform(0.5, 1.1), R.uniform(0.4, 1.2)), 'scorch')

    # equipment section: twelve bays with recessed doors and latches; aft shroud doors and vents
    for k in range(12):
        a = 2 * math.pi * (k + 0.5) / 12; w = 2 * math.pi * rE / 12 - 0.18
        b = box(w, 2.3, 0.05, (0, (yS + 0.75 + yE) / 2 - 1.15, rE - 0.02)); recess(b, (0, 0, 1), 0.07, 0.02)
        bmesh.ops.rotate(b, cent=(0, 0, 0), matrix=Matrix.Rotation(a, 3, 'Y'), verts=b.verts); add('bay_door', b, 'foil_gold' if k in (2, 7) else 'white')
        for s in (-1, 1): add('latch', on_tube(rE + 0.035, a + s * 0.17, (yS + yE) / 2 + 0.3, 0.06, 0.12, 0.03), 'metal_dark')
    for k in range(4):
        a = 2 * math.pi * k / 4 + 0.4
        b = box(1.3, 1.6, 0.04, (0, yE + 2.0, rE - 0.01)); recess(b, (0, 0, 1), 0.08, 0.015)
        bmesh.ops.rotate(b, cent=(0, 0, 0), matrix=Matrix.Rotation(a, 3, 'Y'), verts=b.verts); add('aft_door', b, 'white')
        for j in range(4): add('vent', on_tube(rE + 0.03, a + 0.55, yE + 0.6 + 0.18 * j, 0.5, 0.06, 0.03), 'metal_dark')
    # handrails (yellow) along the body: posts + bars
    for a in (0.6, 2.2, 3.8, 5.3):
        for (y0, y1, r) in [(yA + 0.4, yS - 0.2, rS), (yE + 0.2, yB - 0.3, rE)]:
            bar = cyl(0.022, y1 - y0, (0, y0, r + 0.12), seg=6, axis='Y'); bmesh.ops.rotate(bar, cent=(0, 0, 0), matrix=Matrix.Rotation(a, 3, 'Y'), verts=bar.verts); add('handrail', bar, 'rail')
            for y in (y0 + 0.05, (y0 + y1) / 2, y1 - 0.05):
                p = cyl(0.018, 0.12, (0, y, r), seg=5); bmesh.ops.rotate(p, cent=(0, 0, 0), matrix=Matrix.Rotation(a, 3, 'Y'), verts=p.verts); add('rail_post', p, 'rail')
    # grapple pins, star trackers, magnetometers, low-gain antennas
    for a in (0.3, 3.4):
        p = cyl(0.08, 0.35, (0, yE - 0.4, rE), seg=8); bmesh.ops.rotate(p, cent=(0, 0, 0), matrix=Matrix.Rotation(a, 3, 'Y'), verts=p.verts); add('grapple', p, 'metal')
    for a in (1.1, 1.5, 1.9):
        st = box(0.3, 0.4, 0.3, (0, yS + 1.1, rE - 0.05), bevel_w=0.03)
        bmesh.ops.rotate(st, cent=(0, 0, 0), matrix=Matrix.Rotation(a, 3, 'Y'), verts=st.verts); add('star_tracker', st, 'metal_dark')
        ln = cyl(0.09, 0.1, (0, yS + 0.8, rE + 0.1), seg=8, axis='Y')
        bmesh.ops.rotate(ln, cent=(0, 0, 0), matrix=Matrix.Rotation(a, 3, 'Y'), verts=ln.verts); add('tracker_lens', ln, 'void')
    for s in (-1, 1):
        add('magnetometer', box(0.25, 0.5, 0.18, (s * 0.9, yA + 0.6, rS - 0.02), bevel_w=0.03), 'white')
        add('lga', cyl(0.18, 0.35, (s * 0.9, yA + 1.8, -rS - 0.3), seg=10, r2=0.05), 'white')
        add('lga_stem', cyl(0.04, 0.32, (s * 0.9, yA + 1.8, -rS - 0.02), seg=6), 'metal')
    add('lga_aft', cyl(0.18, 0.35, (0, yB + 0.25, 0), seg=10, r2=0.05, axis='Y'), 'white')

    # solar array wings on masts (±x), each 7.4 × 2.6 m, two blankets with cell grid, frames, drive box
    for s in (-1, 1):
        x0 = s * (rE + 0.1); yc = 0.0
        add('drive_box', box(0.5, 0.7, 0.6, (s * (rE + 0.15), yc, -0.3), bevel_w=0.04), 'metal_dark')
        add('mast', cyl(0.08, 7.8, (x0, yc, 0), seg=8, axis='X') if s > 0 else cyl(0.08, 7.8, (x0 - 7.8, yc, 0), seg=8, axis='X'), 'metal')
        for side in (-1, 1):
            xa = x0 + s * 0.5; xb = x0 + s * 7.9; cx = (xa + xb) / 2; L = abs(xb - xa); yy = yc + side * 0.68
            add('solar', box(L, 1.2, 0.025, (cx, yy, -0.012)), 'solar')
            add('frame', box(L + 0.08, 0.06, 0.06, (cx, yy + side * 0.62, -0.03)), 'metal')
            for k in range(1, 12): add('grid', box(0.025, 1.2, 0.03, (xa + s * L * k / 12, yy, -0.015)), 'solar_grid')
            add('grid', box(L, 0.025, 0.03, (cx, yy, -0.015)), 'solar_grid')
        add('spreader', box(0.08, 2.7, 0.08, (xb, yc, -0.04)), 'metal')
        add('spreader', box(0.08, 2.7, 0.08, (xa, yc, -0.04)), 'metal')
    # one wing slightly bent (debris hit): a torn corner
    add('tear', box(0.9, 0.6, 0.03, (-7.4, 1.0, 0.05), rz=0.4), 'solar')

    # high-gain dishes on booms (top and bottom, staggered), with feeds
    for s, y in ((1, 0.6), (-1, -0.6)):
        add('hga_boom', cyl(0.06, 2.6, (0, y, s * rE if s > 0 else -rE - 2.6), seg=8), 'metal')
        add('hga_joint', box(0.3, 0.3, 0.3, (0, y, s * (rE + 2.6) - 0.15), bevel_w=0.04), 'metal_dark')
        d = dome(0.7, (0, 0, 0), seg=14, rings=3, h=0.22)
        bmesh.ops.rotate(d, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2 + 0.3, 3, 'X'), verts=d.verts)
        add('hga_dish', move(d, (0, y - 0.1, s * (rE + 2.75))), 'dish')
        add('hga_feed', cyl(0.025, 0.5, (0, y - 0.6, s * (rE + 2.75)), seg=6, axis='Y'), 'metal')
    return out
