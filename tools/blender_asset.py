# Own low-poly models built in Blender → assets/own/<name>.glb + assets/index.json, used in scenes with asset(p, 'own/<name>', x, z, …).
#
# Every model has a build script assets/own/src/<name>.py with a function build() that creates the mesh objects (in metres, Z-up as
# Blender is) and returns them. The script sees the helpers below: mat, mesh, box, cyl, torus, prism, bevel, recess, jitter, rotz, move, arch_pts, rect_pts, dome (v3.10: detail
# helpers + ambient occlusion baked into vertex colours; a script sets AO = False to skip it, or AO = {'strength': .., 'dist': ..}). Rebuild headless:
#   /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/tree.py [more.py …]
# Live in Blender (e.g. via the Blender MCP): run this file with exec(compile(open(p).read(), p, 'exec'), g := {'__file__': p}), then
#   g['build_file'](path)  → builds the script into the open scene and exports it,   g['export_asset'](objs, 'name')  → exports given objects.
# Export rules: one GLB per model, objects joined, origin moved to the bottom centre (stands on the ground at y = 0 in three.js),
# flat shading, Principled colours as glTF base colours (sRGB hex in, linear out — the same as three.js reads them), AO as vertex colour
# COLOR_0 (three.js multiplies it with the material colour, also after tint), no animation/camera/light.
# v3.17 hand-over points (the engine moves and lights things, Blender only shapes them): part(objs, 'door', pivot, parent=, **userData) keeps
# objects as a separate movable node with its origin on the pivot (door hinge, lid edge, wheel hub); mark('seat_1', at, rz) is an anchor
# (seats, entrances, paths, light spots, spawn and camera points; rz = heading, 0 = facing the model's front); walk_surface(bm) is a hidden
# mesh figures walk on (stairs, roofs, walkways). All of it goes into the GLB as extras.wie (read synchronously by asset() in the engine).
import bpy, bmesh, json, os, sys, random, math
from mathutils import Vector, Matrix

REPO = os.path.dirname(os.path.dirname(os.path.abspath(globals().get('__file__', 'tools/blender_asset.py'))))
BY = 'what-if-engine (own, CC0 1.0)'

def _lin(x): return ((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92

def mat(name, hexc, rough=0.9, metal=0.0, emit=None, ei=1.0):
    """Principled material from an sRGB hex colour; the material name is what asset(…, { tint: { name: '#hex' } }) addresses.
    emit = glow colour, ei = glow strength (> 1 for neon that should bloom at night; exported as KHR_materials_emissive_strength)."""
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    c = tuple(_lin(int(hexc[i:i + 2], 16) / 255) for i in (1, 3, 5))
    b.inputs['Base Color'].default_value = (*c, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit:
        e = tuple(_lin(int(emit[i:i + 2], 16) / 255) for i in (1, 3, 5))
        for k in ('Emission Color', 'Emission'):
            if k in b.inputs: b.inputs[k].default_value = (*e, 1); break
        if 'Emission Strength' in b.inputs: b.inputs['Emission Strength'].default_value = ei
    m.diffuse_color = (*c, 1)
    return m

def mesh(name, bm, material, coll=None):
    """bmesh → flat-shaded object with one material, linked to coll (default: the scene collection)."""
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(material)
    for p in me.polygons: p.use_smooth = False
    o = bpy.data.objects.new(name, me); (coll or bpy.context.scene.collection).objects.link(o)
    return o

def jitter(bm, amount, seed=1, scale_z=1.0):
    """Random radial offset per vertex (rocks, foliage); deterministic per seed."""
    r = random.Random(seed)
    for v in bm.verts:
        n = v.co.normalized() if v.co.length > 1e-6 else Vector((0, 0, 1))
        v.co += n * r.uniform(-amount, amount); v.co.z *= scale_z
    return bm

# --- detail helpers: each returns a bmesh in Blender axes (x right, y back, z up; the model's front faces -y), placed by its bottom centre ---
def _place(bm, at, rz=0.0):
    if rz: bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(rz, 3, 'Z'), verts=bm.verts)
    bmesh.ops.translate(bm, vec=at, verts=bm.verts); return bm

def bevel(bm, width, seg=1, angle=30):
    """Round the edges sharper than `angle` degrees (width in m, seg 1 = chamfer, 2–3 = soft). The cheapest detail: edges catch light."""
    es = [e for e in bm.edges if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(angle)]
    if es: bmesh.ops.bevel(bm, geom=es, offset=width, segments=seg, profile=0.5, affect='EDGES', clamp_overlap=True)
    return bm

def box(sx, sy, sz, at=(0, 0, 0), bevel_w=0.0, seg=1, rz=0.0):
    """Box sx × sy × sz (m) standing on `at` (bottom centre), turned by rz around the vertical axis; bevel_w rounds all edges."""
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts); bmesh.ops.translate(bm, vec=(0, 0, sz / 2), verts=bm.verts)
    if bevel_w: bevel(bm, bevel_w, seg)
    return _place(bm, at, rz)

def cyl(r, h, at=(0, 0, 0), seg=12, r2=None, axis='Z', bevel_w=0.0):
    """Cylinder (cone with r2) of length h along axis Z / X / Y, its base centre on `at`; seg 6–16 keeps it low-poly."""
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h)
    bmesh.ops.translate(bm, vec=(0, 0, h / 2), verts=bm.verts)
    if bevel_w: bevel(bm, bevel_w, 1)
    if axis != 'Z': bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'Y' if axis == 'X' else 'X'), verts=bm.verts)
    if axis == 'Y': bmesh.ops.scale(bm, vec=(1, -1, 1), verts=bm.verts); bmesh.ops.reverse_faces(bm, faces=bm.faces)
    return _place(bm, at)

def torus(R, r, at=(0, 0, 0), seg=12, seg2=6, axis='Y'):
    """Ring (wheel, handle, tyre) of radius R and tube radius r, centred on `at`, lying in the plane facing `axis`."""
    bm = bmesh.new(); vs = []
    for i in range(seg):
        a = 2 * math.pi * i / seg; row = []
        for j in range(seg2):
            b = 2 * math.pi * j / seg2; d = R + r * math.cos(b)
            row.append(bm.verts.new((d * math.cos(a), d * math.sin(a), r * math.sin(b))))
        vs.append(row)
    for i in range(seg):
        for j in range(seg2):
            a, b = vs[i][j], vs[(i + 1) % seg][j]; c, d = vs[(i + 1) % seg][(j + 1) % seg2], vs[i][(j + 1) % seg2]
            bm.faces.new((a, b, c, d))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if axis == 'Y': bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'), verts=bm.verts)
    elif axis == 'X': bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'Y'), verts=bm.verts)
    bmesh.ops.translate(bm, vec=at, verts=bm.verts); return bm

def prism(pts, depth, y=0.0):
    """Flat outline pts [(x, z), …] (counter-clockwise seen from the front, -y) extruded `depth` m backwards from y: stripes, signs, ramps, gables."""
    bm = bmesh.new(); f = bm.faces.new([bm.verts.new((x, y, z)) for x, z in pts])
    ex = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, vec=(0, depth, 0), verts=[v for v in ex['geom'] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return bm

def recess(bm, normal=(0, -1, 0), inset=0.2, depth=0.15, near=None):
    """Sink the face that looks most along `normal` (largest one, or the one closest to `near`): frame of `inset` m, pushed in `depth` m.
    Door and window frames, panels (negative depth = raised panel). Returns the bmesh."""
    n = Vector(normal).normalized(); bm.faces.ensure_lookup_table()
    cand = [f for f in bm.faces if f.normal.dot(n) > 0.95]
    if not cand: return bm
    f = min(cand, key=lambda f: (f.calc_center_median() - Vector(near)).length) if near else max(cand, key=lambda f: f.calc_area())
    bmesh.ops.inset_region(bm, faces=[f], thickness=inset, depth=-depth, use_even_offset=True)
    return bm

def rotz(bm, a, cent=(0, 0, 0)):
    """Turn a bmesh by a radians around the vertical axis through cent."""
    bmesh.ops.rotate(bm, cent=cent, matrix=Matrix.Rotation(a, 3, 'Z'), verts=bm.verts); return bm

def move(bm, v):
    bmesh.ops.translate(bm, vec=v, verts=bm.verts); return bm

def arch_pts(w, h, x=0.0, z=0.0, seg=6):
    """Outline of a round-arched opening w wide and h high, bottom centre at (x, z), for prism(): windows, doors, arcades."""
    r = w / 2; zs = z + max(h - r, 0.0)
    return [(x - r, z), (x + r, z)] + [(x + r * math.cos(math.pi * i / seg), zs + r * math.sin(math.pi * i / seg)) for i in range(seg + 1)]

def rect_pts(w, h, x=0.0, z=0.0):
    return [(x - w / 2, z), (x + w / 2, z), (x + w / 2, z + h), (x - w / 2, z + h)]

def dome(r, at=(0, 0, 0), seg=16, rings=5, h=None):
    """Hemisphere (h = height, default r) standing on `at`: domes, tanks, lamps."""
    h = r if h is None else h; bm = bmesh.new(); rows = []
    for i in range(rings):
        ph = math.pi / 2 * i / rings
        rows.append([bm.verts.new((r * math.cos(ph) * math.cos(2 * math.pi * k / seg), r * math.cos(ph) * math.sin(2 * math.pi * k / seg), h * math.sin(ph))) for k in range(seg)])
    top = bm.verts.new((0, 0, h))
    for i in range(rings - 1):
        for k in range(seg): bm.faces.new((rows[i][k], rows[i][(k + 1) % seg], rows[i + 1][(k + 1) % seg], rows[i + 1][k]))
    for k in range(seg): bm.faces.new((rows[-1][k], rows[-1][(k + 1) % seg], top))
    bm.faces.new(list(reversed(rows[0])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return move(bm, at)

def bake_ao(o, strength=0.6, dist=1.2, samples=32, keep=()):
    """Ambient occlusion → vertex colour 'AO' (per face corner): joints, corners and undersides darker. Ground plane under the model,
    every other object hidden for the bake; strength 0 = off, 1 = full Cycles AO. Needs Cycles (built into Blender)."""
    scn = bpy.context.scene; prev = scn.render.engine
    try: scn.render.engine = 'CYCLES'
    except TypeError as e: print('ao skipped (no Cycles):', e); return False
    scn.cycles.samples = samples; scn.cycles.seed = 0
    if hasattr(scn.cycles, 'device'): scn.cycles.device = 'CPU'
    if scn.world is None: scn.world = bpy.data.worlds.new('World')
    scn.world.light_settings.distance = dist
    z0 = min((o.matrix_world @ v.co).z for v in o.data.vertices)
    gbm = bmesh.new(); bmesh.ops.create_grid(gbm, x_segments=1, y_segments=1, size=200); bmesh.ops.translate(gbm, vec=(0, 0, z0 - 0.002), verts=gbm.verts)
    gme = bpy.data.meshes.new('_ao_ground'); gbm.to_mesh(gme); gbm.free(); g = bpy.data.objects.new('_ao_ground', gme); scn.collection.objects.link(g)
    hidden = [x for x in scn.objects if x not in (o, g) and x not in keep and not x.hide_render]   # v3.17: the model's other parts still shade it
    for x in hidden: x.hide_render = True
    try:
        me = o.data
        for a in [a for a in me.color_attributes if a.name == 'AO']: me.color_attributes.remove(a)
        ca = me.color_attributes.new('AO', 'BYTE_COLOR', 'CORNER'); me.color_attributes.active_color = ca
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        scn.render.bake.target = 'VERTEX_COLORS'
        bpy.ops.object.bake(type='AO')
        ca = me.color_attributes['AO']
        for d in ca.data:
            v = 1 - strength * (1 - d.color[0]); d.color = (v, v, v, 1)
    finally:
        for x in hidden: x.hide_render = False
        bpy.data.objects.remove(g, do_unlink=True); bpy.data.meshes.remove(gme); scn.render.engine = prev
    return True


# --- v3.17 hand-over points: movable parts, anchors, walk surface (read by the engine: obj.parts.<name>, obj.at('<mark>'), asset(…, { walk: true })) ---
def part(objs, name, pivot=(0, 0, 0), parent=None, **ud):
    """Mark object(s) as the movable part `name`: exported as its own node with its origin on `pivot` (Blender axes, model coordinates),
    nested in the part `parent` if given. Extra keywords go to the node's userData in three.js (door: sign=±1 swing direction, angle=rad)."""
    for o in (objs if isinstance(objs, (list, tuple)) else [objs]):
        o['_part'] = name; o['_pivot'] = list(pivot); o['_parent'] = parent or ''; o['_ud'] = json.dumps(ud)
    return objs

def mark(name, at, rz=0.0, coll=None):
    """Anchor point (empty) `name` at `at` (Blender axes); rz = heading in radians, 0 = facing the model's front (-y here, +z in three.js).
    Names: seat_*, door*, entry*, path_* (path_a_1, path_a_2 … = a walking path), light_*, spawn_*, cam_* — anything the scene needs."""
    e = bpy.data.objects.new(name, None); e.empty_display_type = 'ARROWS'; e.empty_display_size = 0.4
    e.location = at; e.rotation_euler = (0, 0, rz); e['_mark'] = name
    (coll or bpy.context.scene.collection).objects.link(e); return e

def walk_surface(bm, coll=None):
    """Hidden mesh figures walk on (top faces of stairs, roofs, walkways, ramps; only the faces looking up count). Not rendered."""
    o = mesh('_walk', bm, mat('_walk', '#FF00FF'), coll); o['_walk'] = 1; o.display_type = 'WIRE'; return o

def _b2t(v): return [round(v[0], 4), round(v[2], 4), round(-v[1], 4)]   # Blender (x, y back, z up) → three.js (x, y up, z front)

def _glb_extras(path, extras):
    """Write extras into the GLB's JSON chunk (scene and asset), padded to 4 bytes; the binary chunk stays as it is."""
    import struct
    b = open(path, 'rb').read(); n = struct.unpack_from('<I', b, 12)[0]; js = json.loads(b[20:20 + n]); rest = b[20 + n:]
    js.setdefault('asset', {})['extras'] = extras
    out = json.dumps(js, separators=(',', ':')).encode(); out += b' ' * (-len(out) % 4)
    body = struct.pack('<II', len(out), 0x4E4F534A) + out + rest
    open(path, 'wb').write(struct.pack('<III', 0x46546C67, 2, 12 + len(body)) + body)

def _join(objs):
    objs = [o for o in objs if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.hide_set(False); o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1: bpy.ops.object.join()
    return objs[0]

def export_asset(objs, name, by=BY, src=None, ao=True):
    """Join objs into one mesh, put its bottom centre on the origin, export assets/own/<name>.glb and update assets/index.json.
    v3.17: objects tagged with part() stay separate nodes (origin on their pivot), mark() empties and walk_surface() meshes are written
    as data into the GLB (extras.wie: parts, marks, walk triangles, size), nothing of them is rendered."""
    objs = list(objs)
    marks = [o for o in objs if o.type == 'EMPTY' and o.get('_mark')]
    walks = [o for o in objs if o.type == 'MESH' and o.get('_walk')]
    groups = {}
    for o in objs:
        if o.type == 'MESH' and o.get('_part') and not o.get('_walk'): groups.setdefault(o['_part'], []).append(o)
    body = [o for o in objs if o.type == 'MESH' and not o.get('_walk') and not o.get('_part')]
    o = _join(body); o.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    parts = {}
    for n, L in groups.items():
        piv, par, ud = Vector(L[0]['_pivot']), L[0].get('_parent') or None, json.loads(L[0].get('_ud') or '{}')
        po = _join(L); po.name = 'part_' + n
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        po.data.transform(Matrix.Translation(-piv)); po.location = piv
        parts[n] = dict(o=po, piv=piv, parent=par, ud=ud)
    for n, P in parts.items():
        if P['parent'] and P['parent'] not in parts: raise ValueError(f'part {n}: parent part {P["parent"]} missing')
    every = [o] + [P['o'] for P in parts.values()]
    bpy.context.view_layer.update()   # the parts' new origins must be in matrix_world before measuring
    ws = [x.matrix_world @ v.co for x in every for v in x.data.vertices]
    lo = Vector((min(v.x for v in ws), min(v.y for v in ws), min(v.z for v in ws))); hi = Vector((max(v.x for v in ws), max(v.y for v in ws), max(v.z for v in ws)))
    O = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    for x in every: x.location -= O
    bpy.context.view_layer.update()
    aok = ao if isinstance(ao, dict) else {}
    has_ao = bool(ao) and bake_ao(o, keep=every, **aok)
    if has_ao:
        for P in parts.values(): bake_ao(P['o'], keep=every, **aok)
    # hand-over data in three.js axes, relative to the bottom centre
    meta = {'v': 1, 'size': [round(hi.x - lo.x, 3), round(hi.z - lo.z, 3), round(hi.y - lo.y, 3)]}
    if parts: meta['parts'] = {n: {'node': P['o'].name, 'pivot': _b2t(P['piv'] - O), **({'parent': P['parent']} if P['parent'] else {}), **({'ud': P['ud']} if P['ud'] else {})} for n, P in parts.items()}
    if marks:
        bpy.context.view_layer.update()
        meta['marks'] = {e['_mark']: _b2t(e.matrix_world.translation - O) + [round(e.matrix_world.to_euler().z, 4)] for e in marks}
    if walks:
        W = []
        for w in walks:
            w.data.calc_loop_triangles(); M3 = w.matrix_world.to_3x3()
            for lt in w.data.loop_triangles:
                if (M3 @ lt.normal).normalized().z < 0.3: continue   # only faces looking up can be walked on
                for i in lt.vertices: W += _b2t(w.matrix_world @ w.data.vertices[i].co - O)
        meta['walk'] = W
    out = os.path.join(REPO, 'assets', 'own', name + '.glb'); os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    for x in every: x.select_set(True)
    bpy.context.view_layer.objects.active = o
    kw = dict(filepath=out, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_normals=True,
              export_texcoords=False, export_materials='EXPORT', export_vertex_color='ACTIVE' if has_ao else 'NONE', export_all_vertex_colors=False, export_animations=False, export_cameras=False, export_lights=False, export_extras=False)
    props = {p.identifier for p in bpy.ops.export_scene.gltf.get_rna_type().properties}
    bpy.ops.export_scene.gltf(**{k: v for k, v in kw.items() if k in props})
    if len(meta) > 2 or parts or marks or walks: _glb_extras(out, {'wie': meta})
    # index entry in three.js axes (x, y = up, z), like the CC0 packs
    sx, sy, sz = hi.x - lo.x, hi.y - lo.y, hi.z - lo.z
    tris = sum(len(p.vertices) - 2 for x in every for p in x.data.polygons)
    idx_p = os.path.join(REPO, 'assets', 'index.json'); idx = json.load(open(idx_p))
    idx['own/' + name] = {'by': by, 'src': src or 'assets/own/src/' + name + '.py', 'size': [round(sx, 3), round(sz, 3), round(sy, 3)],
                          'min': [round(-sx / 2, 3), 0.0, round(-sy / 2, 3)], 'verts': sum(len(x.data.vertices) for x in every), 'tris': tris, 'ao': has_ao,
                          'kb': round(os.path.getsize(out) / 1024),
                          **({'parts': sorted(parts)} if parts else {}), **({'marks': sorted(meta['marks'])} if marks else {}), **({'walk': len(meta['walk']) // 9} if walks else {})}
    with open(idx_p, 'w') as f:   # same layout as tools/import-assets.mjs: one model per line, sorted
        f.write('{' + ',\n'.join(json.dumps(k) + ':' + json.dumps(v, separators=(',', ':'), ensure_ascii=False) for k, v in sorted(idx.items())) + '}\n')
    extra = (f', parts {", ".join(sorted(parts))}' if parts else '') + (f', {len(marks)} marks' if marks else '') + (f', walk {len(meta["walk"]) // 9} tris' if walks else '')
    print(f'own/{name}: {sx:.2f} x {sz:.2f} x {sy:.2f} m (w x h x d), {tris} tris{extra}, {idx["own/" + name]["kb"]} KB → {out}')
    return o

def build_file(path, clear=False):
    """Run a build script's build() in the open scene and export its objects as own/<file name>."""
    name = os.path.splitext(os.path.basename(path))[0]
    if clear:
        for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    g = dict(globals()); g['__file__'] = path
    g['use'] = lambda part: exec(compile(open(os.path.join(os.path.dirname(path), part)).read(), part, 'exec'), g)   # use('_jlm.py'): shared parts
    exec(compile(open(path).read(), path, 'exec'), g)
    coll = bpy.data.collections.new('own_' + name); bpy.context.scene.collection.children.link(coll)
    before = set(bpy.data.objects)
    objs = list(g['build'](coll))
    objs += [o for o in bpy.data.objects if o not in before and o not in objs and (o.get('_mark') or o.get('_walk'))]   # marks / walk surfaces not returned by build()
    return export_asset(objs, name, src=os.path.relpath(path, REPO), ao=g.get('AO', True))

if __name__ == '__main__' and '--' in sys.argv:
    for p in sys.argv[sys.argv.index('--') + 1:]:
        if not os.path.basename(p).startswith('_'): build_file(os.path.abspath(p), clear=True)   # _*.py = shared parts, not models
