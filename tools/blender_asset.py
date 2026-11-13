# Own low-poly models built in Blender → assets/own/<name>.glb + assets/index.json, used in scenes with asset(p, 'own/<name>', x, z, …).
#
# Every model has a build script assets/own/src/<name>.py with a function build() that creates the mesh objects (in metres, Z-up as
# Blender is) and returns them. The script sees the helpers below (mat, mesh, lowpoly_flat, jitter, HEX colours). Rebuild headless:
#   /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/tree.py [more.py …]
# Live in Blender (e.g. via the Blender MCP): run this file with exec(compile(open(p).read(), p, 'exec'), g := {'__file__': p}), then
#   g['build_file'](path)  → builds the script into the open scene and exports it,   g['export_asset'](objs, 'name')  → exports given objects.
# Export rules: one GLB per model, objects joined, origin moved to the bottom centre (stands on the ground at y = 0 in three.js),
# flat shading, Principled colours as glTF base colours (sRGB hex in, linear out — the same as three.js reads them), no animation/camera/light.
import bpy, bmesh, json, os, sys, random
from mathutils import Vector

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

def _join(objs):
    objs = [o for o in objs if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.hide_set(False); o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1: bpy.ops.object.join()
    return objs[0]

def export_asset(objs, name, by=BY, src=None):
    """Join objs into one mesh, put its bottom centre on the origin, export assets/own/<name>.glb and update assets/index.json."""
    o = _join(list(objs)); o.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    ws = [o.matrix_world @ v.co for v in o.data.vertices]
    lo = Vector((min(v.x for v in ws), min(v.y for v in ws), min(v.z for v in ws))); hi = Vector((max(v.x for v in ws), max(v.y for v in ws), max(v.z for v in ws)))
    o.location -= Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    out = os.path.join(REPO, 'assets', 'own', name + '.glb'); os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    kw = dict(filepath=out, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_normals=True,
              export_texcoords=False, export_materials='EXPORT', export_animations=False, export_cameras=False, export_lights=False, export_extras=False)
    props = {p.identifier for p in bpy.ops.export_scene.gltf.get_rna_type().properties}
    bpy.ops.export_scene.gltf(**{k: v for k, v in kw.items() if k in props})
    # index entry in three.js axes (x, y = up, z), like the CC0 packs
    sx, sy, sz = hi.x - lo.x, hi.y - lo.y, hi.z - lo.z
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    idx_p = os.path.join(REPO, 'assets', 'index.json'); idx = json.load(open(idx_p))
    idx['own/' + name] = {'by': by, 'src': src or 'assets/own/src/' + name + '.py', 'size': [round(sx, 3), round(sz, 3), round(sy, 3)],
                          'min': [round(-sx / 2, 3), 0.0, round(-sy / 2, 3)], 'verts': len(o.data.vertices), 'tris': tris,
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
    return export_asset(objs, name, src=os.path.relpath(path, REPO))

if __name__ == '__main__' and '--' in sys.argv:
    for p in sys.argv[sys.argv.index('--') + 1:]: build_file(os.path.abspath(p), clear=True)
