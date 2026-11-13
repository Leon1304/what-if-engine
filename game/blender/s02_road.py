# Section 2 – the country road: two lanes (7 m), faceted asphalt, gravel shoulders, centre dashes (6 m line / 12 m gap),
# edge lines, repaired patches and cracks, reflector posts (Leitpfosten) every 25 m, guard rails on the outside of the bends,
# signs (speed limit, fuel station ahead, bend warnings). The station's driveways (y −24 … 26, east side) are left open for s03.
COLL = '02 Straße'
Y0, Y1, DY = -110.0, 110.0, 2.0
GAP = (-24.0, 26.0)            # east side: no shoulder / edge line here (forecourt + driveways from s03)

def tangent(y):
    dx = (road_x(y + .5) - road_x(y - .5)); t = Vector((dx, 1, 0)).normalized(); return t, Vector((t.y, -t.x, 0))   # tangent, right normal (east)

def strip(o0, o1, z, ys, jit=0.0, seed=1):
    """Band between lateral offsets o0..o1 (m, + = east) along the centre line, sampled at ys."""
    bm = bmesh.new(); r = random.Random(seed); rows = []
    for y in ys:
        t, n = tangent(y); cx = road_x(y); p = Vector((cx, y, 0))
        a = p + n * o0; b = p + n * o1
        rows.append((bm.verts.new((a.x, a.y, z + r.uniform(-jit, jit))), bm.verts.new((b.x, b.y, z + r.uniform(-jit, jit)))))
    for (a0, b0), (a1, b1) in zip(rows, rows[1:]): bm.faces.new((a0, b0, b1, a1))
    return bm

def frange(a, b, d):
    n = int(round((b - a) / d)); return [a + i * d for i in range(n + 1)]

def build(c):
    asph = lp('Asphalt', '#4b4d52', .9, var=.05); asph2 = lp('Asphalt_Flick', '#3c3e42', .9, var=.04)
    shoul = lp('Bankett', '#8a8377', 1.0, var=.09); white = lp('Markierung', '#e9e8e2', .6, var=.02)
    ys = frange(Y0, Y1, DY); hw = ROAD_W / 2
    # asphalt with a slight crown (higher in the middle)
    bm = bmesh.new(); r = random.Random(3); rows = []
    for y in ys:
        t, n = tangent(y); p = Vector((road_x(y), y, 0)); row = []
        for k, o in enumerate((-hw, -hw / 2, 0, hw / 2, hw)):
            q = p + n * o; z = .1 - .05 * (abs(o) / hw) ** 2 + r.uniform(-.008, .008)
            row.append(bm.verts.new((q.x, q.y, z)))
        rows.append(row)
    for r0, r1 in zip(rows, rows[1:]):
        for k in range(4): bm.faces.new((r0[k], r0[k + 1], r1[k + 1], r1[k]))
    # skirt down to the ground so the edge has thickness
    obj('Fahrbahn', bm, asph, c, walk=1)
    # gravel shoulders (west everywhere, east outside the station)
    obj('Bankett_W', strip(-hw - 1.0, -hw, .045, ys, .015, 4), shoul, c, collide=0)
    for i, (a, b) in enumerate(((Y0, GAP[0]), (GAP[1], Y1))):
        obj(f'Bankett_O{i}', strip(hw, hw + 1.0, .045, frange(a, b, DY), .015, 5 + i), shoul, c, collide=0)
    # markings: edge lines (0.15 m, 0.25 m inside the edge), centre dashes 6 / 12 m
    lines = [strip(-hw + .25, -hw + .4, .108, ys)]
    for a, b in ((Y0, GAP[0]), (GAP[1], Y1)): lines.append(strip(hw - .4, hw - .25, .108, frange(a, b, 1.0)))
    y = Y0 + 3
    while y + 6 < Y1:
        lines.append(strip(-.06, .06, .112, frange(y, y + 6, 1.0))); y += 18
    obj('Markierung', merge(*lines), white, c, collide=0)
    # repaired patches (darker, slightly raised) and cracks
    pr = random.Random(9); patches = []
    for k in range(14):
        y = pr.uniform(Y0 + 5, Y1 - 5); o = pr.uniform(-2.6, 2.6); L, W = pr.uniform(1.2, 4), pr.uniform(.8, 2)
        if GAP[0] < y < GAP[1] and o > 0: continue
        patches.append(strip(o - W / 2, o + W / 2, .111, frange(y, y + L, L / 2), .004, k))
    obj('Flickstellen', merge(*patches), asph2, c, collide=0)
    cracks = []
    for k in range(40):
        y = pr.uniform(Y0, Y1); o = pr.uniform(-3, 3); pts = []
        for s in range(5): pts.append((o + pr.uniform(-.25, .25), y + s * pr.uniform(.3, .6)))
        for (o0, y0), (o1, y1) in zip(pts, pts[1:]):
            if abs(y1 - y0) < .05: continue
            cracks.append(strip(min(o0, o1) - .02, min(o0, o1) + .02, .109, (y0, y1)))
    obj('Risse', merge(*cracks), lp('Riss', '#2c2d30', .9, var=0), c, collide=0)
    # reflector posts every 25 m on both sides (white, black band; right side relative to driving = orange reflector)
    post = multi('Leitpfosten', [
        (box(.12, .1, 1.0, bevel_w=.012), lp('Pfosten_weiss', '#f0efe8', .5, var=.03)),
        (box(.125, .105, .25, at=(0, 0, .72)), lp('Pfosten_schwarz', '#1d1e20', .6, var=.02)),
        (box(.05, .11, .16, at=(0, 0, .77)), glow('Reflektor', '#ff9a2a', 1.5)),
    ], c, pivot=None)
    post.location = (0, 0, -100); post.hide_viewport = True; post['template'] = 1
    k = 0
    for y in frange(Y0 + 2, Y1 - 2, 25.0):
        t, n = tangent(y); p = Vector((road_x(y), y, 0)); rz = math.atan2(t.y, t.x) - math.pi / 2
        for side in (-1, 1):
            if side > 0 and GAP[0] - 4 < y < GAP[1] + 4: continue
            q = p + n * side * (hw + .8); inst(post, f'Leitpfosten_{k}', (q.x, q.y, terrain_h(q.x, q.y) + .03), rz + (math.pi if side < 0 else 0), c=c); k += 1
    # guard rails on the outer side of both bends
    rail_m = lp('Leitplanke', '#b8bcbf', .35, .8, var=.04); post_m = lp('Planken_Pfosten', '#8d9195', .5, .7, var=.04)
    for name, ya, yb, side in (('Nord', 40, 108, 1), ('Sued', -108, -42, -1)):
        parts = []; ysr = frange(ya, yb, 2.0)
        for y in ysr:
            t, n = tangent(y); q = Vector((road_x(y), y, 0)) + n * side * (hw + 1.1); rz = math.atan2(t.y, t.x)
            parts.append(box(.08, .14, .75, at=(q.x, q.y, terrain_h(q.x, q.y) - .05), rz=rz))
        bmr = bmesh.new(); prof = [(0, .45), (.06, .5), (.03, .58), (.06, .66), (0, .71)]   # W-profile (offset outwards, height)
        rings = []
        for y in ysr:
            t, n = tangent(y); q = Vector((road_x(y), y, 0)) + n * side * (hw + .95); zb = terrain_h(q.x, q.y) - .05
            rings.append([bmr.verts.new((q.x + n.x * side * o, q.y + n.y * side * o, zb + h)) for o, h in prof])
        for r0, r1 in zip(rings, rings[1:]):
            for k2 in range(len(prof) - 1): bmr.faces.new((r0[k2], r0[k2 + 1], r1[k2 + 1], r1[k2]))
        bmesh.ops.recalc_face_normals(bmr, faces=bmr.faces)
        multi(f'Leitplanke_{name}', [(merge(*parts), post_m), (bmr, rail_m)], c)
    # signs
    pole = lp('Schildmast', '#9aa0a4', .4, .7, var=.03); red = lp('Schild_rot', '#c8262b', .5, var=.02)
    wht = lp('Schild_weiss', '#f2f2ee', .5, var=.02); blu = lp('Schild_blau', '#1f5aa8', .5, var=.02); blk = lp('Schild_schwarz', '#1a1a1a', .5, var=.02)
    yel = lp('Schild_gelb', '#f2c230', .5, var=.02)
    def sign(name, y, side, face):
        t, n = tangent(y); q = Vector((road_x(y), y, 0)) + n * side * (hw + 1.6); rz = math.atan2(t.y, t.x) - math.pi / 2 + (0 if side > 0 else math.pi)
        parts = [(cyl(.04, 2.6, seg=8), pole)] + face
        o = multi(name, parts, c); o.location = (q.x, q.y, terrain_h(q.x, q.y)); o.rotation_euler = (0, 0, rz); return o
    def disc(r, z, m, y=-.03, seg=16): return (cyl(r, .02, at=(0, y, z), seg=seg, axis='Y'), m)
    # speed limit 70 (both directions)
    for nm, y, sd in (('Schild_70_N', -60, 1), ('Schild_70_S', 62, -1)):
        f = [disc(.32, 2.3, red), disc(.25, 2.3, wht, -.05)]
        f += [(box(.04, .01, .22, at=(-.08, -.065, 2.19)), blk), (box(.12, .01, .04, at=(-.06, -.065, 2.37)), blk),
              (box(.03, .01, .2, at=(.08, -.065, 2.2), rz=0), blk), (box(.12, .01, .03, at=(.08, -.065, 2.39)), blk), (box(.12, .01, .03, at=(.08, -.065, 2.2)), blk),
              (box(.03, .01, .2, at=(.03, -.065, 2.2)), blk), (box(.03, .01, .2, at=(.13, -.065, 2.2)), blk)]
        sign(nm, y, sd, f)
    # fuel station ahead (blue square with white pump pictogram)
    for nm, y, sd in (('Schild_Tankstelle_N', -45, 1), ('Schild_Tankstelle_S', 46, -1)):
        f = [(box(.62, .03, .62, at=(0, -.03, 1.95)), blu), (box(.56, .01, .56, at=(0, -.05, 1.98)), wht), (box(.5, .01, .5, at=(0, -.056, 2.01)), blu),
             (box(.16, .01, .26, at=(-.04, -.062, 2.08)), wht), (box(.1, .01, .06, at=(-.04, -.064, 2.24)), blu),
             (box(.03, .01, .16, at=(.09, -.062, 2.14)), wht), (box(.08, .01, .03, at=(.06, -.062, 2.3)), wht)]
        sign(nm, y, sd, f)
    # bend warnings (white triangle with red border, black curve arrow)
    for nm, y, sd in (('Schild_Kurve_N', 26, 1), ('Schild_Kurve_S', -24, -1)):
        tri = lambda s, yy, m: (move(prism([(-s, 0), (s, 0), (0, s * 1.73)], .02, y=yy), (0, 0, 1.95)), m)
        f = [tri(.4, -.03, red), tri(.32, -.05, wht), (box(.05, .01, .28, at=(-.03, -.062, 2.05), rz=0), blk), (box(.16, .01, .05, at=(.04, -.062, 2.3)), blk)]
        sign(nm, y, sd, f)
