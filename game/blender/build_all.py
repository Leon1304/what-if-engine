# Headless build of the whole map + GLB export:
#   /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python game/blender/build_all.py [-- s03_forecourt …] [--preview]
# No section names = all sections. Writes game/map.glb (and game/blender/map.blend for opening in Blender).
import bpy, os, sys, time, json
HERE = os.path.dirname(os.path.abspath(__file__))
p = os.path.join(HERE, 'core.py'); G = {'__file__': p}; exec(compile(open(p).read(), p, 'exec'), G)
SECTIONS = ['s00_world', 's01_terrain', 's02_road', 's03_forecourt', 's04_building', 's05_interior', 's06_forest', 's07_props', 's08_camp', 's09_village', 's10_sights', 's11_build']
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
want = [a for a in args if not a.startswith('--')] or SECTIONS
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
t0 = time.time()
for s in want:
    if os.path.exists(os.path.join(HERE, s + '.py')): G['section'](s)
print(f'built in {time.time() - t0:.1f}s, {len(bpy.data.objects)} objects')

def export(path):
    # templates (hidden at z −500) are only mesh sources; Blender lights stay out (the game reads the light_* empties)
    for o in bpy.data.objects:
        o.select_set(False)
    keep = [o for o in bpy.data.objects if not o.get('nogame') and o.type in ('MESH', 'EMPTY') and o.location.z > -400]
    for o in keep:
        o.select_set(True)
        if o.get('collide_r'): o['pos_w'] = json.dumps([round(v, 3) for v in o.location])
        if o.get('interact') or o.get('ladder') or o.get('spin'): o['pivot_w'] = json.dumps([round(v, 4) for v in o.location])   # hinge in Blender world axes (survives quantisation)
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_extras=True, export_apply=True, export_yup=True,
              export_lights=False, export_cameras=False, export_animations=False, export_texcoords=False, export_normals=True)
    props = bpy.ops.export_scene.gltf.get_rna_type().properties
    if 'export_vertex_color' in props: kw['export_vertex_color'] = 'NAME'; kw['export_vertex_color_name'] = 'Col'; kw['export_all_vertex_colors'] = False
    elif 'export_colors' in props: kw['export_colors'] = True
    if 'export_gpu_instances' in props: kw['export_gpu_instances'] = False
    bpy.ops.export_scene.gltf(**kw)
    print('exported', path, os.path.getsize(path) // 1024, 'KB')

if want == SECTIONS or '--export' in args:
    export(os.path.join(G['GAME'], 'map.glb'))
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'map.blend'), compress=True, copy=True)   # copy: no map.blend1 backup
if '--preview' in args:
    import math
    from mathutils import Vector
    sc = bpy.context.scene
    try: sc.render.engine = 'BLENDER_WORKBENCH'
    except TypeError: pass
    sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'VERTEX'; sc.display.shading.show_shadows = True
    sc.render.resolution_x, sc.render.resolution_y = 1280, 720
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = 24; cam.data.clip_end = 1000
    out = os.path.join(G['GAME'], '..', 'work', 'game-preview'); os.makedirs(out, exist_ok=True)
    for name, eye, target in [(n.split('=')[0], tuple(map(float, n.split('=')[1].split(':')[0].split(','))), tuple(map(float, n.split('=')[1].split(':')[1].split(','))))
                              for n in args if '=' in n]:
        cam.location = eye; cam.rotation_euler = (Vector(target) - Vector(eye)).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(out, name + '.png'); bpy.ops.render.render(write_still=True)
        print('preview', sc.render.filepath)
