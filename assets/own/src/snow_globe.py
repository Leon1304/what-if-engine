# Snow globe at real size (19 cm high, glass 15 cm across): turned wooden base with gold rings, brass name plaque and four little feet;
# inside a snowy village on a mounded ground disc: three houses with gable roofs, chimneys and lit windows, a church with tower, spire
# and clock, fir trees, a snowman with scarf and hat, a picket fence, a street lamp and a tiny sledge; snowflakes hang in the water;
# a clear, slightly blue glass dome (transparent: alpha 0.22) with a sealing ring.
# Faces -y (+z in three.js). For "trapped inside a snow globe" scale it up: asset(world, 'own/snow_globe', x, z, { scale: 60 })
# (then the glass is 9 m across, the houses about 2 m); flakes that fall must come from the engine (particles).
# Materials (tint keys): glass (transparent), wood, gold, brass, snow, house_red, house_blue, house_cream, roof, stone, window (glows),
# pine, coal, carrot, scarf, black, flake.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/snow_globe.py
AO = {'strength': 0.55, 'dist': 0.03}

def build(coll):
    R = random.Random(9)
    M = {k: mat(k, *v) for k, v in {
        'glass': ('#DDEBF5', 0.05, 0.0), 'wood': ('#5E3A22', 0.5), 'gold': ('#D9AE4A', 0.3, 0.7), 'brass': ('#B8913E', 0.35, 0.6),
        'snow': ('#F3F6FA', 0.85), 'house_red': ('#B5413A', 0.8), 'house_blue': ('#4D6F9C', 0.8), 'house_cream': ('#E6D6B0', 0.8),
        'roof': ('#5A3B2E', 0.85), 'stone': ('#A8A49C', 0.9), 'window': ('#FFD98A', 0.4, 0.0, '#FFC660'), 'pine': ('#2E5A3A', 0.9),
        'coal': ('#1A1A1A', 0.6), 'carrot': ('#E07A2A', 0.7), 'scarf': ('#C8282E', 0.8), 'black': ('#202020', 0.6), 'flake': ('#FFFFFF', 0.6)}.items()}
    g = M['glass']; b = next(n for n in g.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); b.inputs['Alpha'].default_value = 0.22
    for k, v in (('surface_render_method', 'BLENDED'), ('blend_method', 'BLEND')):
        try: setattr(g, k, v)
        except (AttributeError, TypeError): pass
    out = []
    def add(n, bm, m): out.append(mesh(n, bm, M[m], coll))
    # base: turned profile from stacked cones, gold rings, plaque, feet
    add('base', cyl(0.07, 0.035, (0, 0, 0.006), seg=32, r2=0.062), 'wood')
    add('base_top', cyl(0.062, 0.012, (0, 0, 0.041), seg=32, r2=0.056), 'wood')
    add('ring', cyl(0.0715, 0.004, (0, 0, 0.012), seg=32), 'gold')
    add('ring', cyl(0.063, 0.003, (0, 0, 0.04), seg=32), 'gold')
    add('seal', cyl(0.057, 0.005, (0, 0, 0.053), seg=32), 'gold')
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2; add('foot', dome(0.009, (0.058 * math.cos(a), 0.058 * math.sin(a), 0.0), seg=8, rings=2, h=0.006), 'gold')
    pq = box(0.05, 0.004, 0.016, (0, -0.066, 0.017), bevel_w=0.001); recess(pq, (0, -1, 0), 0.003, 0.0006); add('plaque', pq, 'brass')
    for k in range(2): add('plaque_line', box(0.03 - 0.01 * k, 0.001, 0.0015, (0, -0.0685, 0.022 - 0.005 * k)), 'black')
    # ground disc with snow mounds
    gz = 0.058
    add('ground', cyl(0.056, 0.006, (0, 0, gz - 0.006), seg=32), 'snow')
    for i in range(7):
        a = R.uniform(0, 2 * math.pi); r = R.uniform(0.03, 0.048)
        m = dome(R.uniform(0.007, 0.012), (r * math.cos(a), r * math.sin(a), gz), seg=10, rings=3, h=R.uniform(0.002, 0.004)); add('mound', m, 'snow')
    # houses
    def house(x, y, rz, w, d, h, wall):
        L = []
        L.append(('wall', box(w, d, h, (0, 0, 0), bevel_w=0.0006), wall))
        L.append(('roof', move(rotz(prism([(-w / 2 - 0.002, h), (w / 2 + 0.002, h), (0, h + w * 0.55)], d + 0.004, -d / 2 - 0.002), 0), (0, 0, 0)), 'roof'))
        L.append(('roof_snow', prism([(-w / 2 + 0.001, h + 0.0022), (w / 2 - 0.001, h + 0.0022), (0, h + w * 0.55 + 0.0012)], d - 0.002, -d / 2 + 0.001), 'snow'))
        L.append(('chimney', box(0.004, 0.004, 0.01, (w * 0.22, d * 0.2, h + w * 0.2)), 'stone'))
        L.append(('chimney_snow', box(0.005, 0.005, 0.0015, (w * 0.22, d * 0.2, h + w * 0.2 + 0.01)), 'snow'))
        L.append(('door', box(0.004, 0.0008, 0.007, (-w * 0.2, -d / 2 - 0.0004, 0)), 'roof'))
        for u in (w * 0.18,): L.append(('window', box(0.005, 0.0008, 0.005, (u, -d / 2 - 0.0004, h * 0.4)), 'window'))
        L.append(('window', box(0.0008, 0.005, 0.005, (w / 2 + 0.0004, 0, h * 0.4)), 'window'))
        L.append(('window', box(0.0008, 0.005, 0.005, (-w / 2 - 0.0004, 0, h * 0.4)), 'window'))
        for n, bm, mm in L: add(n, move(rotz(bm, rz), (x, y, gz)), mm)
    house(-0.024, -0.01, 0.35, 0.02, 0.016, 0.014, 'house_red')
    house(0.024, -0.018, -0.4, 0.018, 0.015, 0.012, 'house_blue')
    house(0.006, 0.026, 0.05, 0.022, 0.016, 0.015, 'house_cream')
    # church with tower, spire and clock (back left)
    cx, cy = -0.02, 0.026
    add('church', box(0.016, 0.026, 0.016, (cx, cy, gz), bevel_w=0.0006), 'stone')
    add('church_roof', move(rotz(prism([(-0.009, 0.016), (0.009, 0.016), (0, 0.025)], 0.028, -0.014), math.pi / 2), (cx, cy, gz)), 'roof')
    add('tower', box(0.009, 0.009, 0.034, (cx, cy - 0.016, gz), bevel_w=0.0005), 'stone')
    add('spire', cyl(0.0068, 0.016, (cx, cy - 0.016, gz + 0.034), seg=4, r2=0.0), 'roof')
    add('clock', cyl(0.003, 0.0008, (cx, cy - 0.0207, gz + 0.026), seg=10, axis='Y'), 'house_cream')
    add('cross', box(0.0008, 0.0008, 0.005, (cx, cy - 0.016, gz + 0.05)), 'gold')
    for k in range(2): add('church_window', box(0.0008, 0.003, 0.006, (cx + 0.0084, cy - 0.004 + k * 0.01, gz + 0.006)), 'window')
    # fir trees (three tiers, snow caps)
    for (x, y, s) in [(0.04, 0.012, 1.0), (0.035, 0.032, 0.8), (-0.042, 0.008, 0.9), (-0.004, -0.04, 0.7), (0.016, 0.044, 0.75), (-0.038, -0.028, 0.65)]:
        add('trunk', cyl(0.0015 * s, 0.004 * s, (x, y, gz), seg=6), 'roof')
        for k in range(3):
            add('fir', cyl((0.008 - 0.002 * k) * s, 0.009 * s, (x, y, gz + (0.003 + 0.0055 * k) * s), seg=8, r2=0.0), 'pine')
        add('fir_snow', cyl(0.0035 * s, 0.003 * s, (x, y, gz + 0.019 * s), seg=8, r2=0.0), 'snow')
    # snowman with hat, scarf, carrot nose, coal eyes and buttons
    sx, sy = 0.012, -0.03
    add('snowman', dome(0.0055, (sx, sy, gz), seg=10, rings=3, h=0.0085), 'snow')
    sp = bmesh.new(); bmesh.ops.create_icosphere(sp, subdivisions=2, radius=0.0042); add('snowman_body', move(sp, (sx, sy, gz + 0.009)), 'snow')
    sp = bmesh.new(); bmesh.ops.create_icosphere(sp, subdivisions=2, radius=0.0032); add('snowman_head', move(sp, (sx, sy, gz + 0.0155)), 'snow')
    add('hat_brim', cyl(0.0034, 0.0006, (sx, sy, gz + 0.0182), seg=10), 'black')
    add('hat', cyl(0.0023, 0.0035, (sx, sy, gz + 0.0186), seg=10), 'black')
    add('scarf', torus(0.0028, 0.0009, (sx, sy, gz + 0.0128), seg=10, seg2=4, axis='Z'), 'scarf')
    add('scarf_end', box(0.0014, 0.0008, 0.004, (sx + 0.0015, sy - 0.003, gz + 0.009)), 'scarf')
    nose = cyl(0.0006, 0.003, (0, 0, 0), seg=5, r2=0.0)
    bmesh.ops.rotate(nose, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'), verts=nose.verts)
    add('nose', move(nose, (sx, sy - 0.0028, gz + 0.0155)), 'carrot')
    for s in (-1, 1): add('eye', box(0.0007, 0.0006, 0.0007, (sx + s * 0.0011, sy - 0.003, gz + 0.0163)), 'coal')
    for k in range(3): add('button', box(0.0008, 0.0006, 0.0008, (sx, sy - 0.0042, gz + 0.0065 + 0.0022 * k)), 'coal')
    # picket fence along the front, lamp post, sledge
    for k in range(9):
        x = -0.034 + k * 0.0055
        add('picket', box(0.0012, 0.0008, 0.006, (x, -0.044, gz)), 'house_cream')
    add('fence_rail', box(0.046, 0.0007, 0.0008, (-0.012, -0.0438, gz + 0.0035)), 'house_cream')
    add('lamp_post', cyl(0.0006, 0.02, (0.03, -0.036, gz), seg=6), 'black')
    add('lamp', box(0.0028, 0.0028, 0.0035, (0.03, -0.036, gz + 0.02)), 'window')
    add('lamp_cap', cyl(0.0024, 0.0016, (0.03, -0.036, gz + 0.0235), seg=4, r2=0.0), 'black')
    add('sledge', box(0.008, 0.004, 0.0012, (-0.008, -0.034, gz + 0.0012), rz=0.3), 'house_red')
    for s in (-1, 1): add('sledge_runner', box(0.009, 0.0006, 0.0012, (-0.008 + s * 0.0006, -0.034 + s * 0.0018, gz), rz=0.3), 'black')
    # flakes floating in the water
    for i in range(40):
        a = R.uniform(0, 2 * math.pi); r = R.uniform(0, 0.05); z = gz + R.uniform(0.01, 0.085)
        if (r * r + (z - (gz + 0.012)) ** 2) > 0.064 ** 2: continue
        f = bmesh.new(); bmesh.ops.create_icosphere(f, subdivisions=0, radius=R.uniform(0.0007, 0.0013))
        add('flake', move(f, (r * math.cos(a), r * math.sin(a), z)), 'flake')
    # glass dome (sphere cut by the base), drawn last
    gl = bmesh.new(); bmesh.ops.create_uvsphere(gl, u_segments=32, v_segments=16, radius=0.075)
    bmesh.ops.delete(gl, geom=[v for v in gl.verts if v.co.z < -0.068], context='VERTS')
    add('glass', move(gl, (0, 0, 0.0565 + 0.068)), 'glass')
    return out
