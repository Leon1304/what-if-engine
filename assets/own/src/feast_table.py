# Thanksgiving dinner table (table 2.4 × 1.1 m, with chairs 3.3 × 2.3 m): wooden table with turned legs and apron, white tablecloth with
# hanging edges and a rust table runner; roast turkey on an oval platter (glazed body, drumsticks with paper frills, wings, herbs and
# lemon), carving knife and fork; mashed potatoes with butter, gravy boat, cranberry sauce, green bean casserole, corn on the cob, a
# basket of bread rolls, pumpkin pie with one slice cut, two candles with glowing flames and wax drips, a centrepiece of small pumpkins,
# gourds and autumn leaves; six place settings (plate, napkin, fork, knife, wine or water glass); six spindle-back chairs pushed in
# unevenly; a wine stain and crumbs on the cloth.
# Long side along x, faces -y (+z in three.js). Materials (tint keys): wood, wood_dark, cloth, runner, china, turkey, turkey_dark,
# frill, herb, lemon, potato, butter, gravy, cranberry, bean, casserole, corn, bread, wicker, pie, pie_fill, candle, flame (glows),
# pumpkin, gourd, leaf, leaf_red, glass (transparent), wine, steel, stain.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/feast_table.py
AO = {'strength': 0.6, 'dist': 0.35}

def rod(p1, p2, r, seg=6):
    a, b = Vector(p1), Vector(p2); d = b - a
    bm = cyl(r, d.length, (0, 0, 0), seg=seg)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix(), verts=bm.verts)
    return move(bm, a)

def blob(r, at, sc=(1, 1, 1), j=0.0, seed=0, sub=1):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    if j: jitter(bm, j, seed)
    bmesh.ops.scale(bm, vec=sc, verts=bm.verts); return move(bm, at)

def build(coll):
    R = random.Random(1125)
    M = {k: mat(k, *v) for k, v in {
        'wood': ('#7A4E2E', 0.6), 'wood_dark': ('#4E3020', 0.7), 'cloth': ('#F1EDE4', 0.9), 'runner': ('#A4532A', 0.9), 'china': ('#F7F5EF', 0.3),
        'turkey': ('#B8692A', 0.45), 'turkey_dark': ('#7E4018', 0.5), 'frill': ('#FFFFFF', 0.9), 'herb': ('#4E7A34', 0.8), 'lemon': ('#E8C93A', 0.6),
        'potato': ('#EFE3B8', 0.8), 'butter': ('#F4D35E', 0.5), 'gravy': ('#6B4022', 0.3), 'cranberry': ('#9E1A2E', 0.3), 'bean': ('#5C8A3A', 0.7),
        'casserole': ('#C98A4A', 0.8), 'corn': ('#F0C23A', 0.6), 'bread': ('#C8894A', 0.8), 'wicker': ('#A07A48', 0.9), 'pie': ('#D29A55', 0.8),
        'pie_fill': ('#C0662A', 0.6), 'candle': ('#EFE6CF', 0.6), 'flame': ('#FFD27A', 0.4, 0.0, '#FFC050'), 'pumpkin': ('#E07A26', 0.7),
        'gourd': ('#D8B84A', 0.7), 'leaf': ('#C8762A', 0.8), 'leaf_red': ('#A33A22', 0.8), 'glass': ('#E6EEF2', 0.05), 'wine': ('#6A1020', 0.2),
        'steel': ('#B8BCC2', 0.3, 0.8), 'stain': ('#8E3A44', 0.9)}.items()}
    g = M['glass']; b = next(n for n in g.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); b.inputs['Alpha'].default_value = 0.3
    for k, v in (('surface_render_method', 'BLENDED'), ('blend_method', 'BLEND')):
        try: setattr(g, k, v)
        except (AttributeError, TypeError): pass
    out = []
    def add(n, bm, m): out.append(mesh(n, bm, M[m], coll))
    TL, TW, TH = 2.4, 1.1, 0.76; zt = TH + 0.008   # table top surface (on the cloth)
    # table: top, apron, turned legs
    add('top', box(TL, TW, 0.05, (0, 0, TH - 0.05), bevel_w=0.01), 'wood')
    for s in (-1, 1):
        add('apron', box(TL - 0.2, 0.03, 0.12, (0, s * (TW / 2 - 0.1), TH - 0.17)), 'wood_dark')
        add('apron', box(0.03, TW - 0.2, 0.12, (s * (TL / 2 - 0.1), 0, TH - 0.17)), 'wood_dark')
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * (TL / 2 - 0.1), sy * (TW / 2 - 0.1)
            add('leg', cyl(0.035, 0.55, (x, y, 0.0), seg=8, r2=0.045), 'wood')
            add('leg_turn', blob(0.055, (x, y, 0.58), (1, 1, 0.7), sub=1), 'wood')
            add('leg_top', box(0.08, 0.08, 0.1, (x, y, 0.61)), 'wood')
    # cloth: top layer and hanging edges (folds), runner
    add('cloth', box(TL + 0.1, TW + 0.1, 0.008, (0, 0, TH)), 'cloth')
    for s in (-1, 1):
        for k in range(8):
            add('cloth_drop', box(TL / 8 + 0.01, 0.01, 0.28 - 0.03 * (k % 2), (-TL / 2 - 0.05 + (k + 0.5) * (TL + 0.1) / 8, s * (TW / 2 + 0.055 + 0.006 * (k % 2)), TH - 0.27 + 0.03 * (k % 2))), 'cloth')
        add('cloth_drop', box(0.01, TW + 0.12, 0.28, (s * (TL / 2 + 0.055), 0, TH - 0.27)), 'cloth')
    add('runner', box(TL + 0.3, 0.36, 0.006, (0, 0, zt)), 'runner')
    for s in (-1, 1): add('runner_end', box(0.006, 0.36, 0.2, (s * (TL / 2 + 0.153), 0, zt - 0.2)), 'runner')
    zr = zt + 0.006
    # turkey on a platter
    add('platter', cyl(0.25, 0.025, (0, 0, zr), seg=20), 'china')
    out[-1].scale = (1.35, 1, 1)
    add('platter_rim', torus(0.24, 0.012, (0, 0, zr + 0.025), seg=20, seg2=4, axis='Z'), 'china'); out[-1].scale = (1.35, 1, 1)
    add('turkey', blob(0.15, (0, 0.0, zr + 0.13), (1.35, 1.0, 0.75), 0.012, 4, 2), 'turkey')
    add('turkey_breast', blob(0.1, (-0.06, 0.0, zr + 0.2), (1.2, 1.1, 0.6), 0.0, 0, 2), 'turkey')
    for s in (-1, 1):
        add('drumstick', blob(0.065, (0.12, s * 0.12, zr + 0.11), (1.6, 0.9, 0.9), 0.006, 7, 1), 'turkey_dark')
        add('bone', rod((0.2, s * 0.13, zr + 0.13), (0.29, s * 0.12, zr + 0.17), 0.012, 5), 'frill')
        add('frill', cyl(0.022, 0.035, (0.29, s * 0.12, zr + 0.17), seg=8, r2=0.03), 'frill')
        add('wing', blob(0.05, (-0.08, s * 0.14, zr + 0.09), (1.3, 0.6, 0.6), 0.006, 9, 1), 'turkey_dark')
        for k in range(3): add('herb', blob(0.03, (-0.2 + k * 0.17, s * 0.22, zr + 0.035), (1.4, 1, 0.4), 0.008, k, 1), 'herb')
        add('lemon', cyl(0.035, 0.012, (-0.28, s * 0.13, zr + 0.026), seg=10), 'lemon')
    for k in range(5): add('glaze', blob(0.02, (-0.12 + k * 0.05, R.uniform(-0.06, 0.06), zr + 0.235), (1.5, 1, 0.3)), 'turkey_dark')
    add('knife', box(0.26, 0.025, 0.004, (0.1, -0.33, zr), rz=0.3), 'steel')
    add('knife_handle', box(0.11, 0.025, 0.02, (-0.08, -0.38, zr), rz=0.3), 'wood_dark')
    add('carving_fork', box(0.24, 0.018, 0.004, (0.12, 0.32, zr), rz=-0.3), 'steel')
    # side dishes along the runner
    def bowl(x, y, r, h, fill, mfill, top=None):
        add('bowl', cyl(r * 0.7, h, (x, y, zr), seg=14, r2=r), 'china')
        add('bowl_fill', blob(r * 0.92, (x, y, zr + h - 0.005), (1, 1, 0.3), 0.004, int(x * 100), 1), mfill)
        if top: top(x, y, zr + h + r * 0.2)
    bowl(-0.65, 0.05, 0.13, 0.08, 1, 'potato', lambda x, y, z: add('butter', box(0.04, 0.04, 0.025, (x, y, z), rz=0.4), 'butter'))
    add('gravy_boat', blob(0.08, (0.6, 0.12, zr + 0.06), (1.6, 0.8, 0.6), 0.0, 0, 1), 'china')
    add('gravy', cyl(0.06, 0.005, (0.6, 0.12, zr + 0.09), seg=10), 'gravy'); out[-1].scale = (1.6, 0.8, 1)
    add('gravy_spout', rod((0.72, 0.12, zr + 0.08), (0.8, 0.12, zr + 0.11), 0.018, 5), 'china')
    add('gravy_saucer', cyl(0.12, 0.012, (0.6, 0.12, zr), seg=14), 'china')
    bowl(0.62, -0.18, 0.08, 0.06, 1, 'cranberry')
    add('casserole_dish', box(0.3, 0.2, 0.06, (-0.62, -0.25, zr), bevel_w=0.015), 'china')
    add('casserole', box(0.27, 0.17, 0.02, (-0.62, -0.25, zr + 0.05)), 'casserole')
    for k in range(10): add('bean', rod((-0.74 + 0.025 * k, -0.3 + R.uniform(0, 0.08), zr + 0.072), (-0.71 + 0.025 * k, -0.25 + R.uniform(0, 0.08), zr + 0.074), 0.006, 4), 'bean')
    add('corn_plate', cyl(0.14, 0.015, (0.95, -0.05, zr), seg=14), 'china'); out[-1].scale = (1.3, 0.8, 1)
    for k in range(3): add('corn', rod((0.86, -0.1 + k * 0.05, zr + 0.04), (1.05, -0.1 + k * 0.05, zr + 0.045), 0.024, 7), 'corn')
    add('basket', cyl(0.12, 0.08, (-0.95, 0.1, zr), seg=12, r2=0.15), 'wicker')
    add('basket_rim', torus(0.15, 0.012, (-0.95, 0.1, zr + 0.08), seg=12, seg2=4, axis='Z'), 'wicker')
    for k in range(5): add('roll', blob(0.045, (-0.95 + 0.06 * math.cos(k * 1.3), 0.1 + 0.06 * math.sin(k * 1.3), zr + 0.1), (1.2, 1, 0.75), 0.005, k, 1), 'bread')
    # pumpkin pie with one slice cut out (pie built as wedge sectors)
    px, py = 0.95, 0.25
    add('pie_plate', cyl(0.14, 0.02, (px, py, zr), seg=16), 'china')
    for k in range(7):
        a0, a1 = k * 2 * math.pi / 8, (k + 1) * 2 * math.pi / 8
        pts = [(0, 0)] + [(0.12 * math.cos(a0 + (a1 - a0) * i / 2), 0.12 * math.sin(a0 + (a1 - a0) * i / 2)) for i in range(3)]
        w = bmesh.new(); vs = [w.verts.new((x, y, 0)) for x, y in pts]; w.faces.new(vs)
        ex = bmesh.ops.extrude_face_region(w, geom=w.faces[:]); bmesh.ops.translate(w, vec=(0, 0, 0.035), verts=[v for v in ex['geom'] if isinstance(v, bmesh.types.BMVert)])
        bmesh.ops.recalc_face_normals(w, faces=w.faces); add('pie', move(w, (px, py, zr + 0.02)), 'pie_fill')
    add('pie_crust', torus(0.122, 0.014, (px, py, zr + 0.05), seg=16, seg2=4, axis='Z'), 'pie')
    add('slice_plate', cyl(0.08, 0.012, (0.8, 0.42, zr), seg=12), 'china')
    sl = bmesh.new(); vs = [sl.verts.new(v) for v in ((0, 0, 0), (0.11, -0.04, 0), (0.11, 0.04, 0))]; sl.faces.new(vs)
    ex = bmesh.ops.extrude_face_region(sl, geom=sl.faces[:]); bmesh.ops.translate(sl, vec=(0, 0, 0.035), verts=[v for v in ex['geom'] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(sl, faces=sl.faces); add('pie_slice', move(sl, (0.75, 0.42, zr + 0.012)), 'pie_fill')
    # candles, centrepiece
    for x in (-0.35, 0.35):
        add('candle_holder', cyl(0.05, 0.03, (x, 0.0, zr), seg=10, r2=0.03), 'steel')
        add('candle_stem', cyl(0.015, 0.1, (x, 0.0, zr + 0.03), seg=8), 'steel')
        add('candle', cyl(0.018, 0.22, (x, 0.0, zr + 0.13), seg=8), 'candle')
        add('flame', blob(0.012, (x, 0.0, zr + 0.37), (1, 1, 2.2), sub=1), 'flame')
        for k in range(2): add('wax_drip', box(0.008, 0.006, 0.04, (x + 0.015 * (1 - 2 * k), 0.0 + 0.012, zr + 0.3)), 'candle')
    for (x, y, r, m) in [(-0.22, 0.12, 0.06, 'pumpkin'), (0.22, -0.12, 0.05, 'pumpkin'), (-0.2, -0.13, 0.04, 'gourd'), (0.24, 0.13, 0.045, 'gourd')]:
        add('pumpkin', blob(r, (x, y, zr + r * 0.7), (1, 1, 0.75), 0.004, int(r * 1000), 2), m)
        add('pumpkin_stem', cyl(0.008, 0.03, (x, y, zr + r * 1.4), seg=5), 'wood_dark')
    for k in range(12):
        x = R.uniform(-1.1, 1.1); y = R.uniform(-0.15, 0.15)
        add('leaf', prism([(-0.03, 0), (0.0, -0.02), (0.035, 0), (0.0, 0.025)], 0.003, 0), 'leaf' if k % 2 else 'leaf_red')
        bm_last = out[-1]; bm_last.location = (x, y, zr + 0.004); bm_last.rotation_euler = (math.pi / 2, 0, R.uniform(0, 3))
    # place settings: three per long side
    for s in (-1, 1):
        for k in range(3):
            x = -0.75 + k * 0.75; y = s * (TW / 2 - 0.2)
            add('plate', cyl(0.13, 0.015, (x, y, zt), seg=16), 'china')
            add('plate_rim', torus(0.12, 0.008, (x, y, zt + 0.015), seg=16, seg2=3, axis='Z'), 'china')
            add('napkin', box(0.1, 0.14, 0.012, (x - 0.21, y, zt), bevel_w=0.003), 'runner' if k % 2 else 'cloth')
            add('fork', box(0.018, 0.17, 0.004, (x - 0.165, y, zt + 0.012)), 'steel')
            add('knife_p', box(0.016, 0.19, 0.004, (x + 0.17, y, zt)), 'steel')
            gx, gy = x + 0.2, y - s * 0.11
            add('glass_foot', cyl(0.035, 0.005, (gx, gy, zt), seg=10), 'glass')
            add('glass_stem', cyl(0.006, 0.08, (gx, gy, zt + 0.005), seg=6), 'glass')
            add('glass_bowl', cyl(0.025, 0.1, (gx, gy, zt + 0.085), seg=10, r2=0.04), 'glass')
            if (k + (s > 0)) % 2: add('wine', cyl(0.03, 0.04, (gx, gy, zt + 0.09), seg=10, r2=0.034), 'wine')
            # chair, pushed in a little unevenly
            cy = s * (TW / 2 + 0.12 + R.uniform(0.0, 0.15)); rz = R.uniform(-0.08, 0.08)
            L = []
            L.append(('seat', box(0.44, 0.42, 0.04, (0, 0, 0.44), bevel_w=0.01), 'wood'))
            for ax in (-1, 1):
                for ay in (-1, 1): L.append(('chair_leg', cyl(0.018, 0.44, (ax * 0.19, ay * 0.18, 0), seg=6, r2=0.022), 'wood_dark'))
                L.append(('back_post', cyl(0.02, 0.5, (ax * 0.19, 0.18, 0.48), seg=6), 'wood_dark'))
            L.append(('back_rail', box(0.42, 0.03, 0.06, (0, 0.18, 0.92), bevel_w=0.01), 'wood'))
            for j in range(4): L.append(('spindle', cyl(0.01, 0.42, (-0.12 + j * 0.08, 0.18, 0.49), seg=5), 'wood_dark'))
            L.append(('stretcher', box(0.38, 0.015, 0.015, (0, -0.18, 0.15)), 'wood_dark'))
            for n, bm, m in L:
                if s < 0: rotz(bm, math.pi)   # chair back away from the table
                add(n, move(rotz(bm, rz), (x + R.uniform(-0.05, 0.05), cy + s * 0.12, 0)), m)
    # stain and crumbs
    add('stain', cyl(0.05, 0.002, (0.92, -0.37, zt + 0.001), seg=10), 'stain'); out[-1].scale = (1.3, 0.8, 1)
    for k in range(10): add('crumb', box(0.008, 0.008, 0.005, (-0.95 + R.uniform(-0.15, 0.15), -0.32 + R.uniform(-0.06, 0.06), zt + 0.002)), 'bread')
    return out
