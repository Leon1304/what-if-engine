# Own low-poly models built in Blender → assets/own/<name>.glb + assets/index.json, used in scenes with asset(p, 'own/<name>', x, z, …).
#
# Every model has a build script assets/own/src/<name>.py with a function build() that creates the mesh objects (in metres, Z-up as
# Blender is) and returns them. The script sees the helpers below: mat, mesh, box, cyl, torus, prism, bevel, recess, jitter (v3.10: detail
# helpers + ambient occlusion baked into vertex colours; a script sets AO = False to skip it, or AO = {'strength': .., 'dist': ..}). Rebuild headless:
#   /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/tree.py [more.py …]
# Live in Blender (e.g. via the Blender MCP): run this file with exec(compile(open(p).read(), p, 'exec'), g := {'__file__': p}), then
#   g['build_file'](path)  → builds the script into the open scene and exports it,   g['export_asset'](objs, 'name')  → exports given objects.
# Export rules: one GLB per model, objects joined, origin moved to the bottom centre (stands on the ground at y = 0 in three.js),
# flat shading, Principled colours as glTF base colours (sRGB hex in, linear out — the same as three.js reads them), AO as vertex colour
# COLOR_0 (three.js multiplies it with the material colour, also after tint), no animation/camera/light.
import bpy, bmesh, json, os, sys, random, math
from mathutils import Vector, Matrix

REPO = os.path.dirname(os.path.dirname(os.path.abspath(globals().get('__file__', 'tools/blender_asset.py'))))
BY = 'what-if-engine (own, CC0 1.0)'

def _lin(x): return ((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92

def mat(name, hexc, rough=0.9, metal=0.0, emit=None):
    """Principled material from an sRGB hex colour; the material name is what asset(…, { tint: { name: '#hex' } }) addresses."""
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    c = tuple(_lin(int(hexc[i:i + 2], 16) / 255) for i in (1, 3, 5))
    b.inputs['Base Color'].default_value = (*c, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit:
        e = tuple(_lin(int(emit[i:i + 2], 16) / 255) for i in (1, 3, 5))
        for k in ('Emission Color', 'Emission'):
            if k in b.inputs: b.inputs[k].default_value = (*e, 1); break
        if 'Emission Strength' in b.inputs: b.inputs['Emission Strength'].default_value = 1.0
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

def bake_ao(o, strength=0.6, dist=1.2, samples=32):
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
    hidden = [x for x in scn.objects if x not in (o, g) and not x.hide_render]
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

def _join(objs):
    objs = [o for o in objs if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.hide_set(False); o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1: bpy.ops.object.join()
    return objs[0]

def export_asset(objs, name, by=BY, src=None, ao=True):
    """Join objs into one mesh, put its bottom centre on the origin, export assets/own/<name>.glb and update assets/index.json."""
    o = _join(list(objs)); o.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    ws = [o.matrix_world @ v.co for v in o.data.vertices]
    lo = Vector((min(v.x for v in ws), min(v.y for v in ws), min(v.z for v in ws))); hi = Vector((max(v.x for v in ws), max(v.y for v in ws), max(v.z for v in ws)))
    o.location -= Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    has_ao = bool(ao) and bake_ao(o, **(ao if isinstance(ao, dict) else {}))
    out = os.path.join(REPO, 'assets', 'own', name + '.glb'); os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    kw = dict(filepath=out, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_normals=True,
              export_texcoords=False, export_materials='EXPORT', export_vertex_color='ACTIVE' if has_ao else 'NONE', export_all_vertex_colors=False, export_animations=False, export_cameras=False, export_lights=False, export_extras=False)
    props = {p.identifier for p in bpy.ops.export_scene.gltf.get_rna_type().properties}
    bpy.ops.export_scene.gltf(**{k: v for k, v in kw.items() if k in props})
    # index entry in three.js axes (x, y = up, z), like the CC0 packs
    sx, sy, sz = hi.x - lo.x, hi.y - lo.y, hi.z - lo.z
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    idx_p = os.path.join(REPO, 'assets', 'index.json'); idx = json.load(open(idx_p))
    idx['own/' + name] = {'by': by, 'src': src or 'assets/own/src/' + name + '.py', 'size': [round(sx, 3), round(sz, 3), round(sy, 3)],
                          'min': [round(-sx / 2, 3), 0.0, round(-sy / 2, 3)], 'verts': len(o.data.vertices), 'tris': tris, 'ao': has_ao,
                          'kb': round(os.path.getsize(out) / 1024)}
    with open(idx_p, 'w') as f:   # same layout as tools/import-assets.mjs: one model per line, sorted
        f.write('{' + ',\n'.join(json.dumps(k) + ':' + json.dumps(v, separators=(',', ':'), ensure_ascii=False) for k, v in sorted(idx.items())) + '}\n')
    print(f'own/{name}: {sx:.2f} x {sz:.2f} x {sy:.2f} m (w x h x d), {tris} tris, {idx["own/" + name]["kb"]} KB → {out}')
    return o

def build_file(path, clear=False):
    """Run a build script's build() in the open scene and export its objects as own/<file name>."""
    name = os.path.splitext(os.path.basename(path))[0]
    if clear:
        for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    g = dict(globals()); g['__file__'] = path
    exec(compile(open(path).read(), path, 'exec'), g)
    coll = bpy.data.collections.new('own_' + name); bpy.context.scene.collection.children.link(coll)
    objs = g['build'](coll)
    return export_asset(objs, name, src=os.path.relpath(path, REPO), ao=g.get('AO', True))

if __name__ == '__main__' and '--' in sys.argv:
    for p in sys.argv[sys.argv.index('--') + 1:]: build_file(os.path.abspath(p), clear=True)
