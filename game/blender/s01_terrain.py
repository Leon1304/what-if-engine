# Section 1 – ground (low poly): 220 × 340 m (y −110 … 230, village in the north) of faceted triangles (2 m grid, corners jittered so the facets look hand-made).
# Facet colour by area: grass verge along road and station, forest floor (brown, mossy patches) elsewhere, a ragged edge between.
# Ditches beside the road, rolling hills further out. Heights come from terrain_h() in core.py (shared with every section).
COLL = '01 Gelände'

def forest_w(x, y):
    """0 = grass, 1 = forest floor; ragged edge through noise."""
    d = abs(x - road_x(y)); n = noise.noise(Vector((x * .07, y * .07, 9.0))) * 4 + noise.noise(Vector((x * .25, y * .25, 3.0))) * 1.2
    w = (d - (10 + n)) / 5
    sx = max(0.0, -6 - x, x - 50); sy = max(0.0, -32 - y, y - 34)
    w = min(w, (math.hypot(sx, sy) - 2 + n) / 5)
    vx = max(0.0, abs(x - VILLAGE[0]) - 36); vy = max(0.0, abs(y - VILLAGE[1]) - 32)       # village: meadows
    w = min(w, (math.hypot(vx, vy) - 2 + n) / 5)
    w = min(w, (math.hypot(x - MILL[0], y - MILL[1]) - 9 + n) / 4, (math.hypot(x - TOWER[0], y - TOWER[1]) - 8 + n) / 4)
    w = min(w, (math.hypot(x - LAKE[0], y - LAKE[1]) - 17 + n) / 4)
    return min(1.0, max(0.0, w))

def build(c):
    cols = [lp('Gras', '#6f9a3a', var=.07), lp('Gras_hell', '#8fb04a', var=.06), lp('Waldboden', '#6b5236', var=.08),
            lp('Moos', '#55702f', var=.07), lp('Laub', '#8a5a2c', var=.08), lp('Trampelpfad', '#8b6a45', var=.07), lp('Bachufer', '#6e6250', var=.08), lp('Steinbruch', '#9a948a', var=.1)]
    step = 2.0; NX, NY = int((MAP_X1 - MAP_X0) / step), int((MAP_Y1 - MAP_Y0) / step)
    r = random.Random(7)
    bm = bmesh.new(); vs = []
    for j in range(NY + 1):
        row = []
        for i in range(NX + 1):
            x, y = MAP_X0 + i * step, MAP_Y0 + j * step
            if 0 < i < NX and 0 < j < NY: x += r.uniform(-.45, .45) * step; y += r.uniform(-.45, .45) * step
            row.append(bm.verts.new((x, y, terrain_h(x, y))))
        vs.append(row)
    for j in range(NY):
        for i in range(NX):
            a, b, cc, d = vs[j][i], vs[j][i + 1], vs[j + 1][i + 1], vs[j + 1][i]
            for tri in (((a, b, cc), (a, cc, d)) if (i + j) % 2 else ((a, b, d), (b, cc, d))):
                f = bm.faces.new(tri); p = f.calc_center_median()
                w = forest_w(p.x, p.y) + r.uniform(-.25, .25)
                if math.hypot(p.x - QUARRY[0], p.y - QUARRY[1]) < 17.5 + r.uniform(-1, 1): f.material_index = 7
                elif abs(p.x - creek_x(p.y)) < 2.6 + r.uniform(-.4, .4): f.material_index = 6
                elif math.hypot(p.x - LAKE[0], p.y - LAKE[1]) < 15.5 + r.uniform(-.8, .8): f.material_index = 6
                elif trail_dist(p.x, p.y) < .9 + r.uniform(-.25, .25): f.material_index = 5
                elif w < .5: f.material_index = 1 if noise.noise(Vector((p.x * .2, p.y * .2, 2.0))) > .25 else 0
                else:
                    m = noise.noise(Vector((p.x * .12, p.y * .12, 5.0)))
                    f.material_index = 3 if m > .3 else 4 if m < -.35 else 2
    o = multi_from(bm, cols, c, 'Gelände', ground=1)
    # backyard gravel behind the shop
    g = box(9, 30, .08, at=(42.5, 0, -.02)); jitter(g, .01, 3)
    obj('Schotter_Hof', g, lp('Schotter', '#8f897d', var=.08), c, collide=0)

def multi_from(bm, mats, c, name, **props):
    """bmesh whose faces already have material indices → object."""
    return _finish(name, bm, mats, c, None, False, 1, props, 11)
