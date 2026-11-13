# Shared parts for the Jerusalem-style buildings (jlm_*.py load this file; it is not a model itself — files starting with _ are skipped).
# Materials: stone (Jerusalem limestone), stone_light (frames, cornices), stone_dark (courses, sills), void, shutter (teal), door (green),
# metal, tank (black water tanks), solar (collector glass), plaster, awning, plant, pot. Facades are built facing -y at y = 0, then turned
# onto a side of a W × D body: side 0 = front (-y), 1 = right (+x), 2 = back (+y), 3 = left (-x).

def jlm_mats():
    return dict(stone=mat('stone', '#D8C8A2', 0.95), stone_light=mat('stone_light', '#E8DCBC', 0.9), stone_dark=mat('stone_dark', '#B49F78', 0.95),
                void=mat('void', '#1B1815', 1.0), shutter=mat('shutter', '#4C7C88', 0.8), door=mat('door', '#3F6B4B', 0.7, 0.3),
                metal=mat('metal', '#7B8084', 0.5, 0.6), tank=mat('tank', '#242424', 0.6), solar=mat('solar', '#2A3D5E', 0.25, 0.4),
                plaster=mat('plaster', '#CBB994', 1.0), awning=mat('awning', '#B4553D', 0.9), plant=mat('plant', '#55763A', 1.0),
                pot=mat('pot', '#A65E3A', 0.9), rail=mat('rail', '#34383A', 0.5, 0.6), bark=mat('bark', '#5E4A36', 0.95))

def side_xf(side, W, D, cx=0.0, cy=0.0):
    """(angle, offset) that puts a facade built at y = 0 facing -y onto the given side of a W × D body centred at (cx, cy)."""
    return [(0.0, (cx, cy - D / 2, 0)), (math.pi / 2, (cx + W / 2, cy, 0)), (math.pi, (cx, cy + D / 2, 0)), (-math.pi / 2, (cx - W / 2, cy, 0))][side]

def put(out, coll, items, xf):
    a, off = xf
    for k, (name, bm, m) in enumerate(items):
        rotz(bm, a); move(bm, off); out.append(mesh(name, bm, m, coll))

def window(L, M, u, z, w, h, arched=True, shutter=False, grille=False, sill=True):
    """Window at facade position u (along the wall), bottom z: stone surround, dark pane, sill, optional open shutters / iron grille."""
    pane = arch_pts(w, h, u, z) if arched else rect_pts(w, h, u, z)
    fr = arch_pts(w + 0.26, h + 0.15, u, z - 0.03) if arched else rect_pts(w + 0.24, h + 0.2, u, z - 0.05)
    L.append(('win_frame', prism(fr, 0.07, -0.06), M['stone_light']))
    L.append(('win', prism(pane, 0.02, -0.075), M['void']))
    if sill: L.append(('win_sill', box(w + 0.4, 0.18, 0.07, (u, -0.07, z - 0.09)), M['stone_dark']))
    if shutter:
        for s in (-1, 1): L.append(('shutter', box(w / 2 + 0.02, 0.04, min(h, h - w / 2 + 0.2) if arched else h, (u + s * (w * 0.75 + 0.16), -0.085, z)), M['shutter']))
    if grille:
        for k in range(3): L.append(('grille', box(0.025, 0.025, h * 0.75, (u - w / 3 + k * w / 3, -0.1, z)), M['rail']))
        L.append(('grille_h', box(w, 0.025, 0.025, (u, -0.1, z + h * 0.35)), M['rail']))

def door(L, M, u, w=1.3, h=2.4, steps=2):
    """Arched door with stone surround, panelled green door, lamp and steps."""
    L.append(('door_frame', prism(arch_pts(w + 0.4, h + 0.25, u, 0.0), 0.1, -0.09), M['stone_light']))
    L.append(('door', prism(arch_pts(w, h, u, 0.0), 0.05, -0.12), M['door']))
    for k in range(2): L.append(('door_panel', box(w * 0.36, 0.03, h * 0.35, (u + (k - 0.5) * w * 0.45, -0.135, 0.25)), M['door']))
    L.append(('door_knob', box(0.06, 0.06, 0.06, (u + w * 0.3, -0.16, 1.05)), M['metal']))
    for k in range(steps): L.append(('step', box(w + 0.8 - 0.3 * k, 0.35 * (steps - k), 0.15 * (k + 1), (u, -0.17 * (steps - k) - 0.1, 0), bevel_w=0.02), M['stone_dark']))
    L.append(('door_lamp', box(0.14, 0.18, 0.22, (u + w / 2 + 0.35, -0.12, h - 0.1)), M['metal']))

def balcony(L, M, u, z, w, depth=1.0):
    L.append(('balc_slab', box(w, depth, 0.16, (u, -depth / 2, z), bevel_w=0.03), M['stone_light']))
    for k in range(3): L.append(('balc_corbel', box(0.18, depth * 0.8, 0.28, (u - w / 2 + 0.3 + k * (w - 0.6) / 2, -depth * 0.4, z - 0.28)), M['stone_dark']))
    n = max(3, int(w / 0.26))
    for k in range(n + 1): L.append(('balc_bar', box(0.03, 0.03, 0.9, (u - w / 2 + 0.05 + k * (w - 0.1) / n, -depth + 0.05, z + 0.16)), M['rail']))
    for x in (-w / 2 + 0.05, w / 2 - 0.05): L.append(('balc_side', box(0.03, depth - 0.05, 0.03, (x + u, -depth / 2, z + 1.03)), M['rail']))
    L.append(('balc_rail', box(w, 0.05, 0.04, (u, -depth + 0.05, z + 1.04)), M['rail']))

def ac_unit(L, M, u, z):
    L.append(('ac', box(0.8, 0.3, 0.55, (u, -0.17, z)), M['stone_light']))
    L.append(('ac_fan', cyl(0.2, 0.02, (u - 0.12, -0.33, z + 0.27), seg=10, axis='Y'), M['void']))
    L.append(('ac_bracket', box(0.7, 0.32, 0.04, (u, -0.17, z - 0.04)), M['metal']))

def water_tank(out, coll, M, x, y, z, r=0.55, h=1.1):
    """Black rooftop water tank on a steel stand."""
    for sx in (-1, 1):
        for sy in (-1, 1): out.append(mesh('tank_leg', box(0.05, 0.05, 0.5, (x + sx * r * 0.6, y + sy * r * 0.6, z)), M['metal'], coll))
    out.append(mesh('tank', cyl(r, h, (x, y, z + 0.5), seg=12), M['tank'], coll))
    out.append(mesh('tank_lid', cyl(r * 0.35, 0.08, (x, y, z + 0.5 + h), seg=8), M['tank'], coll))
    out.append(mesh('tank_ring', cyl(r + 0.02, 0.05, (x, y, z + 0.5 + h * 0.5), seg=12), M['tank'], coll))

def solar_heater(out, coll, M, x, y, z, rz=0.0):
    """Israeli rooftop solar boiler: tilted collector panel and horizontal tank on a frame, facing -y before rz."""
    parts = []
    p = box(1.0, 2.0, 0.06, (0, 0, 0), bevel_w=0.01)
    bmesh.ops.rotate(p, cent=(0, 0, 0), matrix=Matrix.Rotation(-0.6, 3, 'X'), verts=p.verts); move(p, (0, -0.2, 0.75)); parts.append(('solar', p, M['solar']))
    parts.append(('solar_tank', cyl(0.28, 1.4, (-0.7, 0.75, 1.55), seg=10, axis='X'), M['plaster']))
    for sx in (-0.45, 0.45):
        parts.append(('solar_leg', box(0.04, 0.04, 1.55, (sx, 0.75, 0)), M['metal']))
        parts.append(('solar_leg', box(0.04, 0.04, 0.3, (sx, -1.0, 0)), M['metal']))
        parts.append(('solar_strut', box(0.04, 1.75, 0.04, (sx, -0.12, 0.25)), M['metal']))
    for n, bm, m in parts: rotz(bm, rz); move(bm, (x, y, z)); out.append(mesh(n, bm, m, coll))

def dish(out, coll, M, x, y, z, rz=0.0):
    d = cyl(0.45, 0.12, (0, 0, 0), seg=10, r2=0.1)
    bmesh.ops.rotate(d, cent=(0, 0, 0), matrix=Matrix.Rotation(1.1, 3, 'X'), verts=d.verts); move(d, (0, -0.1, 0.75)); rotz(d, rz); move(d, (x, y, z))
    out.append(mesh('dish', d, M['stone_light'], coll))
    out.append(mesh('dish_pole', move(rotz(box(0.05, 0.05, 0.8, (0, 0, 0)), rz), (x, y, z)), M['metal'], coll))

def parapet(out, coll, M, W, D, z, h=0.8, t=0.25, cx=0.0, cy=0.0):
    for (sx, sy, w, d) in [(0, -D / 2 + t / 2, W, t), (0, D / 2 - t / 2, W, t), (-W / 2 + t / 2, 0, t, D - 2 * t), (W / 2 - t / 2, 0, t, D - 2 * t)]:
        out.append(mesh('parapet', box(w, d, h, (cx + sx, cy + sy, z), bevel_w=0.03), M['stone'], coll))
        out.append(mesh('parapet_cap', box(w + (0.08 if w > t else 0.1), d + (0.1 if w > t else 0.0), 0.08, (cx + sx, cy + sy, z + h), bevel_w=0.02), M['stone_light'], coll))

def courses(out, coll, M, W, D, zs, cx=0.0, cy=0.0):
    """Thin stone_dark bands around the body at floor levels (cornice lines)."""
    for z in zs: out.append(mesh('course', box(W + 0.08, D + 0.08, 0.12, (cx, cy, z), bevel_w=0.02), M['stone_dark'], coll))

def pot_plant(out, coll, M, x, y, z, s=1.0):
    out.append(mesh('pot', cyl(0.25 * s, 0.4 * s, (x, y, z), seg=8, r2=0.18 * s), M['pot'], coll))
    p = bmesh.new(); bmesh.ops.create_icosphere(p, subdivisions=1, radius=0.4 * s); jitter(p, 0.1 * s, seed=int(x * 7 + y * 13) % 997)
    out.append(mesh('plant', move(p, (x, y, z + 0.6 * s)), M['plant'], coll))

def spandrel(c, w, zs, zt, seg=8):
    """Solid stone above a round arch of width w (springing at zs) up to zt, centred at c: arcades, gates, loggias (for prism())."""
    r = w / 2
    return [(c - r, zs)] + [(c - r * math.cos(math.pi * i / seg), zs + r * math.sin(math.pi * i / seg)) for i in range(1, seg)] + [(c + r, zs), (c + r, zt), (c - r, zt)]

def olive_tree(out, coll, M, x, y, z=0.0, s=1.0):
    t = cyl(0.18 * s, 1.8 * s, (0, 0, 0), seg=6, r2=0.1 * s); bmesh.ops.rotate(t, cent=(0, 0, 0), matrix=Matrix.Rotation(0.15, 3, 'Y'), verts=t.verts)
    out.append(mesh('olive_trunk', move(t, (x, y, z)), M['bark'], coll))
    for k in range(4):
        p = bmesh.new(); bmesh.ops.create_icosphere(p, subdivisions=1, radius=(0.9 - 0.1 * k) * s); jitter(p, 0.18 * s, seed=300 + k, scale_z=0.7)
        out.append(mesh('olive', move(p, (x + 0.6 * s * math.cos(k * 1.7), y + 0.6 * s * math.sin(k * 1.7), z + (1.9 + 0.25 * (k % 2)) * s)), M['plant'], coll))
