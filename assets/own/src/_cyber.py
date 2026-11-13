# Shared parts for the cyberpunk set (cp_*): neon materials, neon tubes, sign glyphs, cables, pipes, AC boxes, stickers.
# Not a model itself (leading underscore). Load with use('_cyber.py').
# Neon glows with ei > 1 so it blooms at night; switch a colour off in a scene with asset(…, { tint: { neon_pink: '#2A1A22' } }).
# Glyphs are made-up signs (bars and hooks in a cell), never real brands or real words.

def cyber_mats():
    return dict(
        metal=mat('metal', '#6E747A', 0.45, 0.7), metal_d=mat('metal_dark', '#24272B', 0.5, 0.6), steel=mat('steel', '#9AA1A8', 0.3, 0.85),
        plastic=mat('plastic', '#1E2024', 0.6), void=mat('void', '#07080A', 1.0), glass=mat('glass', '#16222C', 0.08, 0.4),
        concrete=mat('concrete', '#5B5E63', 0.95), concrete_d=mat('concrete_dark', '#3C3F44', 0.95), grime=mat('grime', '#2A2722', 1.0),
        rust=mat('rust', '#6E3B22', 0.95, 0.2), rubber=mat('rubber', '#141414', 0.9), cable=mat('cable', '#101112', 0.7),
        sticker_y=mat('sticker_yellow', '#E8C43A', 0.7), sticker_w=mat('sticker_white', '#D9D6CF', 0.7), sticker_r=mat('sticker_red', '#C2333A', 0.7),
        paint_tag=mat('paint_tag', '#3DE07A', 0.8), hazard_y=mat('hazard_y', '#E2B11F', 0.7), hazard_k=mat('hazard_k', '#16171A', 0.7))

def neon_mats():
    """Neon tube colours (glow strength 4) plus a dimmer screen blue and warm lamp."""
    return dict(pink=mat('neon_pink', '#FF4FA3', 0.3, emit='#FF2E88', ei=4.0), cyan=mat('neon_cyan', '#5CF6FF', 0.3, emit='#22E8FF', ei=4.0),
                violet=mat('neon_violet', '#B784FF', 0.3, emit='#8E45FF', ei=4.0), yellow=mat('neon_yellow', '#FFE070', 0.3, emit='#FFC428', ei=3.5),
                red=mat('neon_red', '#FF5A4A', 0.3, emit='#FF2A1A', ei=4.0), screen=mat('screen', '#2F7BFF', 0.2, emit='#1E63FF', ei=2.2),
                lamp=mat('lamp', '#FFF1C9', 0.3, emit='#FFE6A8', ei=2.0))

def rod(a, b, r, seg=6):
    """Round bar of radius r from point a to point b (3D): neon tubes, cables, pipes, struts."""
    a, b = Vector(a), Vector(b); d = b - a; L = d.length
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=L)
    bmesh.ops.translate(bm, vec=(0, 0, L / 2), verts=bm.verts)
    q = d.normalized().to_track_quat('Z', 'Y')
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=q.to_matrix(), verts=bm.verts)
    return move(bm, a)

def tube(pts, r=0.02, seg=6):
    """Polyline of rods with round joints: one bmesh."""
    bm = bmesh.new()
    for p, q in zip(pts, pts[1:]):
        t = rod(p, q, r, seg); me = bpy.data.meshes.new('_t'); t.to_mesh(me); t.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)
    return bm

def merge(bms):
    """Several bmeshes → one (same material)."""
    out = bmesh.new()
    for b in bms:
        me = bpy.data.meshes.new('_m'); b.to_mesh(me); b.free(); out.from_mesh(me); bpy.data.meshes.remove(me)
    return out

def sag(a, b, drop, n=8):
    """Points of a hanging cable from a to b sagging `drop` m in the middle."""
    a, b = Vector(a), Vector(b)
    return [a.lerp(b, i / n) - Vector((0, 0, drop * 4 * (i / n) * (1 - i / n))) for i in range(n + 1)]

def glyph(x, z, y, w, h, seed, r=0.018, face=-1):
    """A made-up sign character as neon strokes in a w × h cell, bottom centre (x, z) on the plane y (face -1 = front -y, +1 = back,
    'x+' / 'x-' = side planes with x and y swapped). Returns a bmesh (merge several into one neon object)."""
    R = random.Random(seed); X = lambda u: x + (u - 0.5) * w; Z = lambda v: z + v * h
    strokes = []
    kind = R.randrange(4)
    if kind == 0: strokes = [[(0.1, 0.85), (0.9, 0.85)], [(0.5, 0.85), (0.5, 0.05)], [(0.15, 0.4), (0.85, 0.4)]]
    elif kind == 1: strokes = [[(0.15, 0.9), (0.85, 0.9), (0.6, 0.45), (0.2, 0.1)], [(0.45, 0.6), (0.85, 0.1)]]
    elif kind == 2: strokes = [[(0.2, 0.95), (0.2, 0.05), (0.85, 0.05)], [(0.2, 0.5), (0.75, 0.5), (0.75, 0.95)]]
    else: strokes = [[(0.1, 0.7), (0.9, 0.7)], [(0.3, 0.95), (0.3, 0.1)], [(0.7, 0.95), (0.65, 0.35), (0.3, 0.05)]]
    j = lambda p: (p[0] + R.uniform(-0.06, 0.06), p[1] + R.uniform(-0.05, 0.05))
    bms = []
    for s in strokes:
        s = [j(p) for p in s]
        if face in (-1, 1): pts = [(X(u), y, Z(v)) for u, v in s]
        else: pts = [(y, x + (u - 0.5) * w * (1 if face == 'x+' else -1), Z(v)) for u, v in s]
        bms.append(tube(pts, r, 5))
    return merge(bms)

def ac_box(at, rz=0.0, w=0.8, h=0.55, d=0.32):
    """Outdoor AC unit: beveled box with a recessed fan grille (front -y before turning). Returns (body, fan) bmeshes."""
    b = box(w, d, h, (0, 0, 0), bevel_w=0.02); recess(b, (0, -1, 0), 0.05, 0.03)
    fan = cyl(h * 0.36, 0.02, (-w * 0.15, -d / 2 + 0.01, h / 2), seg=12, axis='Y')
    for bm in (b, fan): rotz(bm, rz); move(bm, at)
    return b, fan

def sticker_set(seed, n, area, y, face=-1, size=(0.08, 0.18)):
    """n small flat stickers / flyers scattered over area = (x0, x1, z0, z1) on plane y; returns three bmeshes (yellow, white, red)."""
    R = random.Random(seed); out = [[], [], []]
    for i in range(n):
        w, h = R.uniform(*size), R.uniform(*size); x, z = R.uniform(area[0], area[1]), R.uniform(area[2], area[3])
        out[R.randrange(3)].append(box(w, 0.004, h, (x, y + face * 0.002, z), rz=0))
    return [merge(o) if o else None for o in out]
