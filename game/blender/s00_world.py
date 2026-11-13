# Section 0 – sky, sun and viewport (Blender only; the game sets its own sky, fog and day–night cycle).
COLL = '00 Welt'

def build(c):
    s = scene()
    w = s.world or bpy.data.worlds.new('Himmel'); s.world = w; w.use_nodes = True
    bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = (*_rgb('#a9c6dc'), 1); bg.inputs['Strength'].default_value = 1.0
    sd = bpy.data.lights.new('Sonne', 'SUN'); sd.energy = 3.5; sd.color = _rgb('#fff1d6'); sd.angle = math.radians(2)
    so = bpy.data.objects.new('Sonne', sd); so.rotation_euler = (math.radians(50), math.radians(8), math.radians(-35)); c.objects.link(so); so['nogame'] = 1
    for a in bpy.context.screen.areas:
        if a.type == 'VIEW_3D':
            sp = a.spaces.active; sp.shading.type = 'MATERIAL'; sp.clip_end = 3000
            sp.shading.use_scene_lights = True; sp.shading.use_scene_world = True
            sp.overlay.show_floor = False; sp.overlay.show_axis_x = sp.overlay.show_axis_y = False
