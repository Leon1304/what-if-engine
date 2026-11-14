# Game map "Waldtankstelle" (low-poly style) – shared helpers for the section scripts (s01_*.py …).
# Live in Blender (MCP):   p = '<repo>/game/blender/core.py'; exec(compile(open(p).read(), p, 'exec'), G := {'__file__': p}); G['section']('s01_terrain')
# Headless, everything:    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python game/blender/build_all.py
# Units: metres, Blender axes (x east, y north, z up). The road runs north–south (y), the station lies east of it.
#
# Look: flat-shaded facets, no textures. Every material is a solid colour (lp()); obj() writes that colour per face into the colour
# attribute 'Col' with a small random variation per facet (plus darker undersides), and the material reads 'Col' as base colour.
# In the GLB that is COLOR_0 × white base colour → three.js shows exactly what Blender shows.
#
# Every object is built in world coordinates. Interactive things are separate objects whose origin sits on their pivot and carry
# custom properties (→ glTF extras → three.js userData): interact = door | slide | drawer | switch | pickup | search | use …,
# label = text in the game, item = what you get, plus per-type values (angle, slide = [dx, dy, dz] in Blender axes, group …).
# collide = 0 → the game walks through it (grass, leaves, decals, small items). Game lights are empties light_* (color, power, group, kind).
import bpy, bmesh, math, os, random, json
from mathutils import Vector, Matrix, noise

GAME = os.path.dirname(os.path.dirname(os.path.abspath(globals().get('__file__', 'game/blender/core.py'))))
REPO = os.path.dirname(GAME)
_h = os.path.join(REPO, 'tools', 'blender_asset.py')
exec(compile(open(_h).read(), _h, 'exec'), globals())      # box, cyl, torus, prism, recess, bevel, dome, jitter, rotz, move, rect_pts, arch_pts, _lin …

SCENE = 'Spielmap'

# ---------------------------------------------------------------- scene / collections
def scene():
    s = bpy.data.scenes.get(SCENE)
    if s is None:
        s = bpy.context.scene; s.name = SCENE
    return s

def coll(name, parent=None):
    c = bpy.data.collections.get(name)
    if c is None:
        c = bpy.data.collections.new(name); (parent or scene().collection).children.link(c)
    return c

def clear_coll(name):
    c = bpy.data.collections.get(name)
    if not c: return
    for ch in list(c.children): clear_coll(ch.name)
    for o in list(c.objects):
        d = o.data; bpy.data.objects.remove(o, do_unlink=True)
        if d is not None and getattr(d, 'users', 1) == 0:
            for coll_ in (bpy.data.meshes, bpy.data.lights, bpy.data.curves):
                if d.name in coll_ and coll_[d.name] == d: coll_.remove(d); break
    bpy.data.collections.remove(c)

# ---------------------------------------------------------------- materials
def _srgb(v):
    v = max(0.0, min(1.0, v)); return 1.055 * v ** (1 / 2.4) - .055 if v > .0031308 else 12.92 * v

def _rgb(hexc): return tuple(_lin(int(hexc[i:i + 2], 16) / 255) for i in (1, 3, 5))

def lp(name, hexc, rough=0.85, metal=0.0, emit=None, ei=1.0, alpha=1.0, var=0.06):
    """Low-poly material: base colour comes from the colour attribute 'Col' (set per facet by obj()).
    hexc = sRGB colour, var = how much facets vary (0 = uniform), emit/ei = glow, alpha < 1 = glass."""
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    ca = nt.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'Col'; ca.location = (-300, 250)
    nt.links.new(ca.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit:
        for k in ('Emission Color', 'Emission'):
            if k in b.inputs: b.inputs[k].default_value = (*_rgb(emit), 1); break
        if 'Emission Strength' in b.inputs: b.inputs['Emission Strength'].default_value = ei
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
        try: m.surface_render_method = 'BLENDED'
        except Exception: pass
    c = _rgb(hexc); m.diffuse_color = (*c, alpha)
    m['col'] = list(c); m['var'] = var
    return m

def glass(name='Glas', hexc='#bcd8e0', alpha=.28): return lp(name, hexc, .05, 0, alpha=alpha, var=0)
def glow(name, hexc, ei=4.0): return lp(name, hexc, .5, 0, emit=hexc, ei=ei, var=0)

# ---------------------------------------------------------------- objects
def paint(bm, mats, seed=0, var_scale=1.0, under=0.18):
    """Facet colours → loop colour layer 'Col': material colour × (1 ± var) × darker when the facet looks down."""
    cl = bm.loops.layers.color.get('Col') or bm.loops.layers.color.new('Col')
    r = random.Random(seed); bm.normal_update()
    for f in bm.faces:
        m = mats[min(f.material_index, len(mats) - 1)]
        base = m.get('col', (1, 1, 1)); var = m.get('var', .06) * var_scale
        k = 1 + r.uniform(-var, var)
        if f.normal.z < -.3: k *= 1 - under
        col = (_srgb(base[0] * k), _srgb(base[1] * k), _srgb(base[2] * k), 1)   # byte colour attributes store sRGB
        for l in f.loops: l[cl] = col

def _finish(name, bm, mats, c, pivot, smooth, collide, props, seed):
    paint(bm, mats, seed if seed is not None else hash(name) & 0xffff)
    if pivot is not None: bmesh.ops.translate(bm, vec=-Vector(pivot), verts=bm.verts)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(m)
    for p in me.polygons: p.use_smooth = smooth
    if 'Col' in me.color_attributes:
        me.color_attributes.active_color_name = 'Col'
        try: me.color_attributes.default_color_name = 'Col'
        except Exception: pass
    o = bpy.data.objects.new(name, me); c.objects.link(o)
    if pivot is not None: o.location = pivot
    if not collide: o['collide'] = 0
    for k, v in props.items(): o[k] = json.dumps(v) if isinstance(v, (list, dict)) else v
    return o

def obj(name, bm, material, c, pivot=None, smooth=False, collide=1, seed=None, **props):
    """bmesh (world coordinates) → flat-shaded object in collection c. pivot = origin (interactive parts turn/slide around it).
    Extra keywords become custom properties (glTF extras → userData)."""
    for f in bm.faces: f.material_index = 0
    return _finish(name, bm, [material], c, pivot, smooth, collide, props, seed)

def multi(name, parts, c, pivot=None, collide=1, seed=None, **props):
    """Several (bmesh, material) pairs → one object with several materials (fewer objects, fewer draws)."""
    big = bmesh.new(); mats = []
    for bm, m in parts:
        if m not in mats: mats.append(m)
        mi = mats.index(m)
        for f in bm.faces: f.material_index = mi
        tmp = bpy.data.meshes.new('_t'); bm.to_mesh(tmp); bm.free(); big.from_mesh(tmp); bpy.data.meshes.remove(tmp)
    return _finish(name, big, mats, c, pivot, False, collide, props, seed)

def merge(*bms):
    out = bms[0]
    for b in bms[1:]:
        me = bpy.data.meshes.new('_m'); b.to_mesh(me); b.free(); out.from_mesh(me); bpy.data.meshes.remove(me)
    return out

def inst(src, name, at, rz=0.0, s=1.0, c=None, **props):
    """Linked duplicate of src (same mesh data → one geometry in the GLB, instanced in the game)."""
    o = bpy.data.objects.new(name, src.data); (c or src.users_collection[0]).objects.link(o)
    o.location = at; o.rotation_euler = (0, 0, rz); o.scale = (s, s, s) if not isinstance(s, (tuple, list)) else s
    for k in src.keys():
        if k not in props: o[k] = src[k]
    for k, v in props.items(): o[k] = json.dumps(v) if isinstance(v, (list, dict)) else v
    return o

def ico(r, at=(0, 0, 0), sub=1, jit=0.0, seed=1, sz=1.0):
    """Faceted ball (bushes, tree crowns, rocks): icosphere, randomly dented by jit (fraction of r), squashed by sz."""
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    rr = random.Random(seed)
    for v in bm.verts:
        v.co *= 1 + rr.uniform(-jit, jit); v.co.z *= sz
    return move(bm, at)

def cone(r, h, at=(0, 0, 0), seg=7, jit=0.0, seed=1, r2=0.0):
    """Faceted cone (spruce tiers, spikes)."""
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r2, depth=h)
    bmesh.ops.translate(bm, vec=(0, 0, h / 2), verts=bm.verts)
    rr = random.Random(seed)
    for v in bm.verts:
        if v.co.z < h * .99: v.co.x *= 1 + rr.uniform(-jit, jit); v.co.y *= 1 + rr.uniform(-jit, jit); v.co.z += rr.uniform(-jit, jit) * h * .15
    return move(bm, at)

def light(name, at, color='#fff4e0', power=40, group='', kind='point', c=None, **props):
    """Light marker for the game (empty light_*) + a real Blender light so the viewport shows it."""
    c = c or coll('Lichter')
    e = bpy.data.objects.new('light_' + name, None); e.empty_display_type = 'SPHERE'; e.empty_display_size = .15
    e.location = at; e['color'] = color; e['power'] = power; e['group'] = group; e['kind'] = kind
    for k, v in props.items(): e[k] = v
    c.objects.link(e)
    ld = bpy.data.lights.new('L_' + name, 'AREA' if kind == 'panel' else 'POINT'); ld.energy = power * 10; ld.color = _rgb(color)
    if kind == 'panel': ld.size = 1.2
    lo = bpy.data.objects.new('L_' + name, ld); lo.parent = e; c.objects.link(lo); lo['nogame'] = 1
    return e

def spot(name, at, rz=0.0, c=None, **props):
    """Named point for the game (spawn, quest target, sound, trigger)."""
    c = c or coll('Punkte')
    e = bpy.data.objects.new(name, None); e.empty_display_type = 'ARROWS'; e.empty_display_size = .5
    e.location = at; e.rotation_euler = (0, 0, rz); c.objects.link(e)
    for k, v in props.items(): e[k] = v
    return e

# ---------------------------------------------------------------- map layout (shared by all sections)
ROAD_W = 7.0            # two lanes à 3.5 m
MAP_X0, MAP_X1, MAP_Y0, MAP_Y1 = -110.0, 110.0, -110.0, 230.0     # ground extent (the village lies in the north extension)
VILLAGE = (-64.0, 182.0)         # village Tannbach (road runs straight through at x −63.6, y 150 … 230)
TOWER = (30.0, 122.0)            # wooden lookout tower on a hill
RUIN = (-86.0, 74.0)             # castle ruin on a hill west of the road
QUARRY = (28.0, 178.0)           # old quarry (pit) – stones for building
MILL = (64.0, 140.0)             # water mill on the west bank of the creek
LAKE = (-86.0, 18.0)             # forest lake west of the road (fishing, jetty, angler's hut)
LAKE_Z = -.55                    # its water level
# jute sacks with loot, spread over the map (x, y, loot); s06 keeps trees away from them, s10 builds them
SACKS = [
    (24.0, -62.0, [['stein', 2], ['wasser', 1], ['patronen_pistole', 1]]), (-30.0, -72.0, [['saat_kartoffel', 1], ['kekse', 1]]), (-38.0, -26.0, [['batterien', 1], ['ast', 2]]),
    (58.5, -33.0, [['holz', 2], ['dosensuppe', 1], ['patronen_schrot', 1]]), (82.0, 18.0, [['topf', 1], ['stein', 2]]), (57.0, 60.0, [['schokolade', 1], ['saat_karotte', 1], ['patronen_gewehr', 1]]),
    (-26.0, 42.0, [['verband', 1], ['wasser', 1]]), (12.0, 86.0, [['stein', 3], ['brett', 2], ['metall', 2]]), (-74.0, 78.0, [['goldmuenze', 1], ['cola', 1], ['patronen_pistole', 1]]),
    (20.5, 175.0, [['stein', 3], ['hammer', 1], ['schwarzpulver', 1]]), (-12.0, 205.0, [['saat_kuerbis', 1], ['sandwich', 1], ['solarlampe', 1]]), (-96.0, 150.0, [['brett', 3], ['lappen', 1], ['patronen_schrot', 1]]),
    (92.0, 188.0, [['dosenbohnen', 1], ['energy', 1], ['patronen_gewehr', 1]]), (88.0, -92.0, [['batterie_9v_leer', 1], ['chips', 1], ['metall', 1]]), (-92.0, -92.0, [['kerze', 2], ['fladenbrot', 1]]),
    (-52.0, 112.0, [['wasser', 1], ['saat_kartoffel', 1], ['patronen_pistole', 1]]), (95.0, 100.0, [['stamm', 1], ['seil', 1], ['schwarzpulver', 1]]), (-100.0, 20.0, [['seil', 1], ['mehl', 1]]),
    (-62.0, 30.0, [['angel', 1], ['wasser', 1]]), (40.0, 100.0, [['patronen_schrot', 1], ['goldmuenze', 1]]), (-100.0, 200.0, [['bewegungsmelder', 1], ['verband', 1]]),
    (70.0, 210.0, [['patronen_gewehr', 1], ['metall', 2]]), (-20.0, -100.0, [['solarlampe', 1], ['seil', 1]]), (100.0, 40.0, [['schwarzpulver', 1], ['patronen_pistole', 1]]),
]

def road_x(y):
    """Centre line of the road: straight past the station, S-bend beyond |y| > 30, back to straight through the village (y > 150)."""
    if y > 150: return -63.6
    if y > 110: d = y - 110; return -44.4 - .96 * d + .012 * d * d
    if y > 30: return -6 - 0.006 * (y - 30) ** 2
    if y < -30: return -6 + 0.0045 * (y + 30) ** 2
    return -6.0

def _pad(x, y, c, r, fall):
    """0 … 1 weight: 1 inside radius r around c, falling to 0 over `fall` metres."""
    return max(0.0, min(1.0, 1 - (math.hypot(x - c[0], y - c[1]) - r) / fall))

def terrain_h(x, y):
    """Ground height: flat around road and station, ditches beside the road, rolling forest floor further out."""
    rx = road_x(y); d = abs(x - rx)
    n = noise.noise(Vector((x * .025, y * .025, .3))) * 2.2 + noise.noise(Vector((x * .09, y * .09, 1.7))) * .45
    far = min(1.0, max(0.0, (d - 9) / 14))
    inside = -2 <= x <= 48 and -28 <= y <= 30                      # station plot stays flat
    if inside: k = 0.0
    else:
        sx = max(0.0, -2 - x, x - 48); sy = max(0.0, -28 - y, y - 30)
        k = min(far, min(1.0, math.hypot(sx, sy) / 12)) if (-14 <= x <= 60 and -40 <= y <= 42) else far
    ditch = 0.0
    if 4.3 < d < 7.5 and not (-2 < x < 48 and -26 < y < 28): ditch = -0.5 * math.sin(math.pi * (d - 4.3) / 3.2)
    h = n * k + ditch * (1 - k) + 0.6 * k
    # village: flat ground (houses, square, farm); hills under tower and ruin; quarry pit; flat bank at the mill
    vx = max(0.0, abs(x - VILLAGE[0]) - 34); vy = max(0.0, abs(y - VILLAGE[1]) - 30); wv = max(0.0, min(1.0, 1 - math.hypot(vx, vy) / 14))
    if wv > 0: h *= 1 - wv                                                       # flat like the station plot (road surface .1 above)
    for c_, r_, R_, H_ in ((TOWER, 6.0, 30.0, 7.0), (RUIN, 12.0, 34.0, 8.5)):       # hills with a flat top
        dd = math.hypot(x - c_[0], y - c_[1])
        if dd < R_: t_ = 1 - max(0.0, dd - r_) / (R_ - r_); h += H_ * t_ * t_ * (3 - 2 * t_); h -= n * k * (1 if dd < r_ else 0) * .9
    wl = _pad(x, y, LAKE, 12, 7)                                                               # forest lake: bowl down to −2.3
    if wl > 0: h = h * (1 - wl) + (-2.3) * wl
    west = abs(abs(math.atan2(y - QUARRY[1], x - QUARRY[0])) - math.pi) < .3                       # ramp into the pit from the west
    wq = _pad(x, y, QUARRY, 13, 16 if west else 5); h -= 4.5 * wq
    wm = _pad(x, y, MILL, 7, 8); h = h * (1 - wm) + .9 * wm
    dc = abs(x - creek_x(y))                               # creek bed: 1.1 m deep, banks 4 m wide
    if dc < 4.0: h -= 1.1 * (1 - (dc / 4.0) ** 2)
    return h

def creek_x(y):
    """Centre of the creek east of the station (runs the full length of the map)."""
    return 70 + 6 * math.sin(y / 22)

def creek_z(y):
    """Water level of the creek."""
    return terrain_h(creek_x(y), y) + .45

HOCHSITZ = (63.0, 52.0)          # hunter's stand (clearing r 9, looks east over the creek)
FEUERSTELLE = (55.0, -36.0)      # old campfire (clearing r 5)
CAMP = (-46.0, -40.0)            # abandoned caravan west of the road (clearing r 9)
def trail_pts():
    """Footpath: behind the woodpile → east to the creek → north along the west bank → hunter's stand."""
    pts = [(46.0, 5.0), (51.0, 7.0), (56.0, 9.5), (60.5, 12.0)]
    for y in range(14, 46, 4): pts.append((creek_x(y) - 4.5 - 1.2 * math.sin(y / 7), float(y)))
    pts += [(HOCHSITZ[0] + 1.5, HOCHSITZ[1] - 3.0)]
    pts2 = [(48.0, -4.0), (51.0, -14.0), (53.0, -25.0), (FEUERSTELLE[0] - 1, FEUERSTELLE[1] + 4)]   # side path to the campfire
    pts3 = [(road_x(-38) - 5.0, -38.0), (-18.0, -37.0), (-27.0, -41.0), (-36.0, -39.0), (CAMP[0] + 5.0, CAMP[1] + .5)]   # from the road to the caravan
    pts4 = [(road_x(120) + 5.0, 120.0), (-30.0, 121.0), (-5.0, 118.0), (TOWER[0] - 4.0, TOWER[1] - 1.0)]                     # road → lookout tower
    pts5 = [(TOWER[0] + 4.0, TOWER[1] + 2.0), (45.0, 130.0), (MILL[0] - 6.0, MILL[1] - 1.0)]                                  # tower → mill
    pts6 = [(road_x(176) + 6.0, 176.0), (-35.0, 178.0), (0.0, 177.0), (QUARRY[0] - 13.0, QUARRY[1])]                         # village → quarry
    pts7 = [(road_x(80) - 5.0, 80.0), (-40.0, 79.0), (-62.0, 76.0), (RUIN[0] + 8.0, RUIN[1] + 1.0)]                          # road → ruin
    pts8 = [(road_x(16) - 5.0, 16.0), (-30.0, 18.0), (-50.0, 21.0), (LAKE[0] + 22.0, LAKE[1] + 3.0)]                       # road → lake
    return [pts, pts2, pts3, pts4, pts5, pts6, pts7, pts8]

def trail_dist(x, y):
    best = 1e9
    for pts in trail_pts():
        for (ax, ay), (bx, by) in zip(pts, pts[1:]):
            vx, vy = bx - ax, by - ay; L2 = vx * vx + vy * vy
            t = max(0.0, min(1.0, ((x - ax) * vx + (y - ay) * vy) / L2)) if L2 else 0
            best = min(best, math.hypot(x - ax - t * vx, y - ay - t * vy))
    return best

def section(name, rebuild=True):
    """Build one section script (game/blender/<name>.py → build(c)) into its own collection; rebuild = remove the old one first."""
    path = os.path.join(GAME, 'blender', name + '.py')
    g = dict(globals()); g['__file__'] = path
    exec(compile(open(path).read(), path, 'exec'), g)
    cname = g.get('COLL', name)
    if rebuild: clear_coll(cname)
    c = coll(cname); n0 = len(bpy.data.objects)
    g['build'](c)
    print(f'{name}: +{len(bpy.data.objects) - n0} objects in "{cname}"')
    return c

def text_bm(txt, size, at=(0, 0, 0), rz=0.0, depth=.02, align='CENTER', rx=math.pi / 2):
    """Text as low-poly mesh (bmesh), standing upright facing -y (rx = 90°), bottom centre on `at`."""
    cu = bpy.data.curves.new('_txt', 'FONT'); cu.body = txt; cu.size = size; cu.extrude = depth / 2
    cu.align_x = align; cu.resolution_u = 2
    ob = bpy.data.objects.new('_txt', cu); bpy.context.scene.collection.objects.link(ob)
    dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bm = bmesh.new(); bm.from_mesh(me)
    bpy.data.objects.remove(ob); bpy.data.curves.remove(cu); bpy.data.meshes.remove(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(rx, 3, 'X'), verts=bm.verts)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(rz, 3, 'Z'), verts=bm.verts)
    return move(bm, at)

def place(bm, at=(0, 0, 0), rz=0.0):
    """Turn a bmesh built around the origin by rz and move it to `at`."""
    if rz: rotz(bm, rz)
    return move(bm, at)

def wall(a, b, t, h, openings=(), z0=0.0):
    """Straight wall from a to b (x or y aligned, (x, y)), thickness t, from z0 to z0 + h.
    openings: (start along the wall from a, width, bottom, top) in m – doors (bottom 0) and windows. Returns a bmesh."""
    ax = 'x' if abs(a[1] - b[1]) < 1e-6 else 'y'
    L = abs(b[0] - a[0]) if ax == 'x' else abs(b[1] - a[1]); sgn = 1 if (b[0] - a[0] if ax == 'x' else b[1] - a[1]) > 0 else -1
    def seg(s0, s1, zb, zt):
        if s1 - s0 < 1e-3 or zt - zb < 1e-3: return None
        m = (s0 + s1) / 2 * sgn
        if ax == 'x': return box(s1 - s0, t, zt - zb, at=(a[0] + m, a[1], z0 + zb))
        return box(t, s1 - s0, zt - zb, at=(a[0], a[1] + m, z0 + zb))
    parts = []; cur = 0.0
    for s, w, ob, ot in sorted(openings):
        parts += [seg(cur, s, 0, h), seg(s, s + w, 0, ob), seg(s, s + w, ot, h)]; cur = s + w
    parts.append(seg(cur, L, 0, h))
    return merge(*[p for p in parts if p is not None])

def frame(a, b, t, opening, z0=0.0, fw=.06, depth=None):
    """Window / door frame (profile fw) for one opening of wall(a, b, …): returns a bmesh ring around it."""
    s, w, ob, ot = opening; ax = 'x' if abs(a[1] - b[1]) < 1e-6 else 'y'
    sgn = 1 if (b[0] - a[0] if ax == 'x' else b[1] - a[1]) > 0 else -1; d = depth or t + .02
    def bx(s0, s1, zb, zt):
        m = (s0 + s1) / 2 * sgn
        if ax == 'x': return box(s1 - s0, d, zt - zb, at=(a[0] + m, a[1], z0 + zb))
        return box(d, s1 - s0, zt - zb, at=(a[0], a[1] + m, z0 + zb))
    out = [bx(s, s + fw, ob, ot), bx(s + w - fw, s + w, ob, ot), bx(s, s + w, ot - fw, ot)]
    if ob > .01: out.append(bx(s, s + w, ob, ob + fw))
    return merge(*out)
