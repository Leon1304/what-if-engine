# Shared parts for street models (roads, vehicles, street furniture). Not a model itself (leading underscore).
# Vehicles: front faces -y in Blender (= +z in three.js, the direction drive() moves them), length along y.

def street_mats():
    return dict(asphalt=mat('asphalt', '#3A3C3F', 0.95), patch=mat('asphalt_patch', '#47494C', 0.95), marking=mat('marking', '#E8E5D8', 0.8),
                curb=mat('curb', '#BEB49C', 0.9), paver=mat('paver', '#CFC1A0', 0.95), paver_d=mat('paver_dark', '#B1A27F', 0.95),
                metal=mat('metal', '#7B8084', 0.5, 0.6), metal_d=mat('metal_dark', '#2F3335', 0.5, 0.6), void=mat('void', '#151515', 1.0),
                glass=mat('glass', '#24323C', 0.12, 0.3), tire=mat('tire', '#1C1C1C', 0.9), rim=mat('rim', '#A3A8AC', 0.35, 0.8),
                plastic=mat('plastic', '#2B2D2F', 0.7), white=mat('white', '#EDEBE4', 0.7), wood=mat('wood', '#8A6845', 0.85),
                stone=mat('stone', '#D8C8A2', 0.95), soil=mat('soil', '#4E3B2A', 1.0), leaf=mat('leaf', '#4F7A34', 0.95),
                leaf_d=mat('leaf_dark', '#2F4F2A', 0.95), bark=mat('bark', '#7A5B3E', 0.95))

def side_prism(pts, xa, xb):
    """Side profile [(u, z), …] (u along the length, front at negative u) extruded across x from xa to xb (xa < xb): car bodies, vans."""
    bm = prism(pts, xb - xa, -xb)
    return rotz(bm, math.pi / 2)

def wheel(out, coll, M, x, y, r=0.31, w=0.21, side=1, name=None, steer=0):
    """Tyre, rim and hub; side = +1 / -1 (which side of the car the outer face looks to). v3.21: name = movable part (wheel_fl …) on the hub,
    so drive() turns it (asset() collects parts named wheel*); steer=1 for wheels that steer."""
    n0 = len(out)
    out.append(mesh('tire', cyl(r, w, (x - w / 2, y, r), seg=14, axis='X'), M['tire'], coll))
    out.append(mesh('rim', cyl(r * 0.62, 0.02, (x + side * (w / 2) - (0.02 if side > 0 else 0), y, r), seg=10, axis='X'), M['rim'], coll))
    out.append(mesh('hub', cyl(r * 0.18, 0.03, (x + side * (w / 2 + 0.005) - (0.03 if side > 0 else 0), y, r), seg=6, axis='X'), M['metal_d'], coll))
    for k in range(5):
        a = 2 * math.pi * k / 5
        out.append(mesh('lug', box(0.03, 0.03, 0.03, (x + side * (w / 2 + 0.01), y + 0.09 * math.cos(a), r + 0.09 * math.sin(a) - 0.015)), M['metal_d'], coll))
    if name: part(out[n0:], name, (x, y, r), steer=steer)

def light_mats():
    """Emissive signal / lamp materials. Switch one off in a scene with asset(…, { tint: { light_red: '#222222' } })."""
    return dict(red=mat('light_red', '#FF3B2F', 0.3, emit='#FF2A1A'), yellow=mat('light_yellow', '#FFB52E', 0.3, emit='#FFA21A'),
                green=mat('light_green', '#3BFF7A', 0.3, emit='#22F06A'), lamp=mat('lamp', '#FFF1C9', 0.3, emit='#FFE6A8'),
                head=mat('headlight', '#F4F6FF', 0.2, emit='#E8EEFF'), tail=mat('taillight', '#D92A22', 0.3, emit='#C81E16'))
