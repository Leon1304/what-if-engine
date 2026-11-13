# Section 1 – ground (low poly): 220 × 220 m of faceted triangles (2 m grid, corners jittered so the facets look hand-made).
# Facet colour by area: grass verge along road and station, forest floor (brown, mossy patches) elsewhere, a ragged edge between.
# Ditches beside the road, rolling hills further out. Heights come from terrain_h() in core.py (shared with every section).
COLL = '01 Gelände'

def forest_w(x, y):
    """0 = grass, 1 = forest floor; ragged edge through noise."""
    d = abs(x - road_x(y)); n = noise.noise(Vector((x * .07, y * .07, 9.0))) * 4 + noise.noise(Vector((x * .25, y * .25, 3.0))) * 1.2
    w = (d - (10 + n)) / 5
    sx = max(0.0, -6 - x, x - 50); sy = max(0.0, -32 - y, y - 34)
    w = min(w, (math.hypot(sx, sy) - 2 + n) / 5)
    return min(1.0, max(0.0, w))

def build(c):
    cols = [lp('Gras', '#6f9a3a', var=.07), lp('Gras_hell', '#8fb04a', var=.06), lp('Waldboden', '#6b5236', var=.08),
            lp('Moos', '#55702f', var=.07), lp('Laub', '#8a5a2c', var=.08), lp('Trampelpfad', '#8b6a45', var=.07), lp('Bachufer', '#6e6250', var=.08)]
    S, N = 220.0, 110; step = S / N
    r = random.Random(7)
    bm = bmesh.new(); vs = []
    for j in range(N + 1):
        row = []
        for i in range(N + 1):
            x, y = -S / 2 + i * step, -S / 2 + j * step
            if 0 < i < N and 0 < j < N: x += r.uniform(-.45, .45) * step; y += r.uniform(-.45, .45) * step
            row.append(bm.verts.new((x, y, terrain_h(x, y))))
        vs.append(row)
    for j in range(N):
        for i in range(N):
            a, b, cc, d = vs[j][i], vs[j][i + 1], vs[j + 1][i + 1], vs[j + 1][i]
            for tri in (((a, b, cc), (a, cc, d)) if (i + j) % 2 else ((a, b, d), (b, cc, d))):
                f = bm.faces.new(tri); p = f.calc_center_median()
                w = forest_w(p.x, p.y) + r.uniform(-.25, .25)
                if abs(p.x - creek_x(p.y)) < 2.6 + r.uniform(-.4, .4): f.material_index = 6
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
