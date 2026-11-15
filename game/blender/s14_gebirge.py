# Section 14 – the second map: the mountains „Steinberg“ (own region far north, x −120 … 120, y 900 … 1160; heights from berg_h in core.py).
# High valley closed in by rock walls and a snowy ridge: the pass road climbs in serpentines from the gorge in the south to the alpine plateau
# with the Steinberghütte (forester Henning waits there, bunks to sleep, stove, cupboard). Footpaths to the summit cross (Gipfelbuch marks
# all places), to the old mine „Glück auf“ (timber portal, rails, mine cart, tunnel – rubble at the back to blast with powder + fuse, behind it
# the crystal chamber) and to the mountain lake (fishing). A hay barn on the meadow, jute sacks, spruces below the tree line, snow above.
# The car brings you here over the pass (game: region 'berg'); the spot berg_start is where you arrive.
COLL = '14 Gebirge'

def solid(pts, vec):
    bm = bmesh.new(); f = bm.faces.new([bm.verts.new(p) for p in pts])
    ex = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, vec=vec, verts=[v for v in ex['geom'] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return bm

def heightbox(xa, xb, ya, yb, zb, top, nx=None):
    """Prism over the rectangle xa..xb × ya..yb from zb up to top(x, y) (sampled along x): closes the mine tunnel above / beside it."""
    nx = nx or max(2, int((xb - xa) / 1.5) + 1); bm = bmesh.new(); T, Bt = [], []
    for i in range(nx):
        x = xa + (xb - xa) * i / (nx - 1)
        T.append([bm.verts.new((x, y, max(zb + .3, top(x, y)))) for y in (ya, yb)]); Bt.append([bm.verts.new((x, y, zb)) for y in (ya, yb)])
    for i in range(nx - 1):
        bm.faces.new((T[i][0], T[i + 1][0], T[i + 1][1], T[i][1])); bm.faces.new((Bt[i][1], Bt[i + 1][1], Bt[i + 1][0], Bt[i][0]))
        bm.faces.new((Bt[i][0], Bt[i + 1][0], T[i + 1][0], T[i][0])); bm.faces.new((T[i][1], T[i + 1][1], Bt[i + 1][1], Bt[i][1]))
    bm.faces.new((Bt[0][0], T[0][0], T[0][1], Bt[0][1])); bm.faces.new((Bt[-1][1], T[-1][1], T[-1][0], Bt[-1][0]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return bm

def build(c):
    R = random.Random(1414)
    meadow = [lp('Almwiese', '#7f9a48', .95, var=.08), lp('Almwiese_hell', '#9aae58', .95, var=.07), lp('Almwiese_dunkel', '#62803a', .95, var=.08)]
    rock = lp('Fels_Berg', '#7d7a74', .95, var=.1); scree = lp('Geroell', '#9a948a', .95, var=.1); snow = lp('Schnee', '#eef2f4', .9, var=.03)
    gravel = lp('Bergstrasse', '#8d8678', .95, var=.07); path = lp('Trampelpfad', '#8b6a45', .95, var=.07); water = lp('Wasser', '#4f8fae', .05, 0, alpha=.75, var=.03)
    wood = lp('Huette_Holz', '#7a5638', .85, var=.08); wood_d = lp('Huette_Holz_d', '#5a3e28', .85, var=.08); stone = lp('Bruchstein', '#8f8576', .9, var=.1)
    roof = lp('Schindeln', '#5a4a3a', .9, var=.08); plank = lp('Dielen', '#a07850', .8, var=.06); gl = glass('Glas_Dorf', '#bcd3dc', .3)
    steel = lp('Stahl', '#9da2a6', .35, .8, var=.04); rust = lp('Rost', '#8a4f2a', .9, var=.1); white = lp('Weiss_glanz', '#f4f4f1', .3, var=.02)
    blk = lp('Kunststoff_schwarz', '#232426', .6, var=.03); red = lp('Waldtank_rot', '#c42a26', .5, var=.03); paper = lp('Papier_alt', '#efe4c4', .8, var=.03)
    green_s = lp('Fensterladen', '#3f6a4a', .7, var=.04); hay = lp('Heu', '#d8b863', .95, var=.1); fabric = lp('Wolldecke', '#8a3b32', .95)
    crystal = lp('Bergkristall', '#d9c8ff', .1, .1, emit='#b89cff', ei=1.3, alpha=.85, var=.05)
    Z = berg_h
    tmp = coll('_Vorlagen_Berg', c)

    # ------------------------------------------------------------ terrain (2.5 m grid, jittered); facet colour by height, slope, road, paths
    step = 2.5; X0, X1, Y0, Y1 = BERG_X0 - 7.5, BERG_X1 + 7.5, BERG_Y0 - 7.5, BERG_Y1 + 7.5
    NX, NY = int((X1 - X0) / step), int((Y1 - Y0) / step); r = random.Random(14)
    bm = bmesh.new(); vs = []
    for j in range(NY + 1):
        row = []
        for i in range(NX + 1):
            x, y = X0 + i * step, Y0 + j * step
            if 0 < i < NX and 0 < j < NY: x += r.uniform(-.4, .4) * step; y += r.uniform(-.4, .4) * step
            if _near_poly(x, y, BERG_ROAD_S)[0] < 4.5: x, y = X0 + i * step, Y0 + j * step   # no jitter under the road: flat band stays flat
            row.append(bm.verts.new((x, y, Z(x, y))))
        vs.append(row)
    for j in range(NY):
        for i in range(NX):
            a, b, cc, d = vs[j][i], vs[j][i + 1], vs[j + 1][i + 1], vs[j + 1][i]
            for tri in (((a, b, cc), (a, cc, d)) if (i + j) % 2 else ((a, b, d), (b, cc, d))):
                f = bm.faces.new(tri)
    bm.normal_update()
    for f in bm.faces:
        p = f.calc_center_median(); nz = f.normal.z; dr = _near_poly(p.x, p.y, BERG_ROAD_S)[0]
        sn = noise.noise(Vector((p.x * .08, p.y * .08, 3.3)))
        if dr < 3.6: f.material_index = 4
        elif berg_trail_dist(p.x, p.y) < .9 + r.uniform(-.2, .2): f.material_index = 5
        elif p.z > 52 + sn * 5 and nz > .55: f.material_index = 7
        elif nz < .74: f.material_index = 6 if p.z < 46 + sn * 4 else 7 if nz > .5 else 6
        elif p.z > 40 + sn * 4: f.material_index = 3 if sn > -.1 else 7
        else: m = noise.noise(Vector((p.x * .12, p.y * .12, 5.0))); f.material_index = 1 if m > .3 else 2 if m < -.3 else 0
    _finish('Gelaende_Berg', bm, meadow + [scree, gravel, path, rock, snow], c, None, False, 1, {'region': 'berg'}, 21)   # 0–2 meadow, 3 scree, 4 verge, 5 path, 6 rock, 7 snow

    # ------------------------------------------------------------ pass road: gravel strip along the serpentines, guide posts
    pts = []
    for (ax, ay), (bx, by) in zip(BERG_ROAD_S, BERG_ROAD_S[1:]):                                  # the smoothed centre line, every ~2 m
        L = math.hypot(bx - ax, by - ay); n = max(1, int(L / 2))
        for k in range(n): t = k / n; pts.append((ax + (bx - ax) * t, ay + (by - ay) * t))
    pts.append(BERG_ROAD_S[-1])
    bm = bmesh.new(); prev = None; W2 = 2.7
    for i, (x, y) in enumerate(pts):
        j0, j1 = max(0, i - 2), min(len(pts) - 1, i + 2); tx, ty = pts[j1][0] - pts[j0][0], pts[j1][1] - pts[j0][1]; L = math.hypot(tx, ty) or 1
        nx_, ny_ = -ty / L, tx / L; z = max(Z(x, y), Z(x + nx_ * W2, y + ny_ * W2), Z(x - nx_ * W2, y - ny_ * W2)) + .05
        cur = [bm.verts.new((x + nx_ * W2, y + ny_ * W2, z)), bm.verts.new((x - nx_ * W2, y - ny_ * W2, z))]
        if prev: bm.faces.new((prev[0], prev[1], cur[1], cur[0]))
        prev = cur
    obj('Passstrasse', bm, lp('Asphalt_Berg', '#5d5f62', .9, var=.05), c)
    post = multi('Leitpfosten', [(box(.1, .1, 1.0, at=(0, 0, 0)), white), (box(.11, .11, .2, at=(0, 0, .72)), blk), (box(.02, .06, .1, at=(-.05, 0, .82)), lp('Reflektor', '#ff7a1a', .3))], tmp, collide=0)
    post.location = (0, 0, -500); k = 0
    for i in range(0, len(pts) - 2, 9):
        (x, y), (x2, y2) = pts[i], pts[i + 2]; L = math.hypot(x2 - x, y2 - y) or 1; nx_, ny_ = -(y2 - y) / L, (x2 - x) / L
        for s_ in (-1, 1):
            px, py = x + s_ * nx_ * 3.3, y + s_ * ny_ * 3.3; inst(post, f'Leitpfosten_{k}', (px, py, Z(px, py) - .05), math.atan2(ny_, nx_), 1.0, c=c); k += 1

    # ------------------------------------------------------------ trees below the tree line, rocks, grass (templates from s06)
    V = [bpy.data.objects[f'Fichte_{k}'] for k in range(4)] * 3 + [bpy.data.objects[f'Kiefer_{k}'] for k in range(2)]
    rocks = [bpy.data.objects[f'Fels_{k}'] for k in range(1, 4)]; tufts = [bpy.data.objects[f'Grasbuschel_{k}'] for k in range(2)]
    def free(x, y, r_):
        if _near_poly(x, y, BERG_ROAD_S)[0] < 6.5 + r_ or berg_trail_dist(x, y) < 1.8 + r_: return False
        for (cx_, cy_), rr in ((BERGHUETTE, 15), (BERGSEE, 13), ((STOLLEN[0] - 6, STOLLEN[2]), 10), (GIPFEL, 9), (HEUSTADEL, 7)):
            if math.hypot(x - cx_, y - cy_) < rr + r_: return False
        if STOLLEN[0] - 9 < x < STOLLEN[1] + 3 and abs(y - STOLLEN[2]) < 5: return False
        for sx, sy, _ in SACKS_BERG:
            if math.hypot(x - sx, y - sy) < 1.8 + r_: return False
        return BERG_X0 + 3 < x < BERG_X1 - 3 and BERG_Y0 + 3 < y < BERG_Y1 - 3
    n = 0
    for gx in range(int(BERG_X0) + 2, int(BERG_X1) - 2, 6):
        for gy in range(int(BERG_Y0) + 2, int(BERG_Y1) - 2, 6):
            x, y = gx + R.uniform(0, 6), gy + R.uniform(0, 6); z = Z(x, y)
            slope = math.hypot(Z(x + 1, y) - Z(x - 1, y), Z(x, y + 1) - Z(x, y - 1)) / 2
            line = 38 + 4 * noise.noise(Vector((x * .05, y * .05, 1.1)))
            if z > line or slope > .85 or not free(x, y, .5) or R.random() > .62 - z / 120: continue
            src = R.choice(V); kind = 'Kiefer' if src.name.startswith('Kiefer') else 'Fichte'
            inst(src, f'{kind}_B{n}', (x, y, z - .1), R.uniform(0, 6.28), R.uniform(.75, 1.15) * (1 - max(0, z - 30) / 40), c=c, tree=kind); n += 1
    k = 0
    for i in range(900):
        x, y = R.uniform(BERG_X0 + 4, BERG_X1 - 4), R.uniform(BERG_Y0 + 4, BERG_Y1 - 4); z = Z(x, y)
        slope = math.hypot(Z(x + 1, y) - Z(x - 1, y), Z(x, y + 1) - Z(x, y - 1)) / 2
        if not free(x, y, 0) or z > 64 or slope > .7: continue
        src = R.choice(rocks * 2 + tufts * (3 if z < 38 else 0))
        if src in rocks and not free(x, y, 1.0): continue
        inst(src, f'{src.name}_B{k}', (x, y, z - .08), R.uniform(0, 6.28), R.uniform(.7, 1.6) if src in rocks else R.uniform(.8, 1.3), c=c); k += 1

    # ------------------------------------------------------------ signs at the pass entrance
    sx, sy = 6.0, 912.0; sz = Z(sx, sy)
    multi('Schild_Steinberg', [(cyl(.05, 2.6, at=(sx - .8, sy, sz), seg=6), steel), (cyl(.05, 2.6, at=(sx + .8, sy, sz), seg=6), steel), (box(2.1, .04, .9, at=(sx, sy, sz + 1.65)), lp('Schild_blau', '#2a5aa8', .5)),
                               (text_bm('STEINBERG', .2, at=(sx, sy - .03, sz + 2.15), depth=.01), white), (text_bm('Steinberghütte 3 km ▲', .12, at=(sx, sy - .03, sz + 1.85), depth=.01), white)], c, collide=0)

    # ------------------------------------------------------------ Steinberghütte (11 × 7 m, stone walls, wooden gable, door south, terrace)
    hx, hy = BERGHUETTE; hz = Z(hx, hy); FL = hz + .3; T = .35; H = 2.8
    x0, x1, y0, y1 = hx - 5.5, hx + 5.5, hy - 3.5, hy + 3.5
    P = [(box(11.3, 7.3, .35, at=(hx, hy, hz - .05), bevel_w=.03), stone), (box(11 - 2 * T, 7 - 2 * T, .03, at=(hx, hy, FL - .02)), plank)]
    DOOR = (5.0, 1.06, 0, 2.15)
    sides = {'S': ((x0, y0 + T / 2), (x1, y0 + T / 2), [(1.4, 1.0, .9, 1.9), DOOR, (8.4, 1.0, .9, 1.9)]), 'N': ((x0, y1 - T / 2), (x1, y1 - T / 2), [(3.0, 1.0, .9, 1.9), (7.0, 1.0, .9, 1.9)]),
             'W': ((x0 + T / 2, y0 + T), (x0 + T / 2, y1 - T), [(2.6, 1.0, .9, 1.9)]), 'E': ((x1 - T / 2, y0 + T), (x1 - T / 2, y1 - T), [(2.6, 1.0, .9, 1.9)])}
    for sd, (a, b, ops) in sides.items():
        P.append((wall(a, b, T, H, ops, FL), stone))
        for o in ops:
            P.append((frame(a, b, T, o, FL, .08, T + .04), wood_d))
            if o[2] > 0:
                s_, w_ = o[0], o[1]
                if sd in 'SN':
                    cx_ = a[0] + s_ + w_ / 2; out = -1 if sd == 'S' else 1; P.append((box(w_ - .1, .02, 1.0, at=(cx_, a[1], FL + .9)), gl))
                    P += [(box(.5, .04, 1.05, at=(cx_ + k_ * (w_ / 2 + .27), a[1] + out * (T / 2 + .03), FL + .85)), green_s) for k_ in (-1, 1)]
                    P.append((box(w_, .22, .18, at=(cx_, a[1] + out * (T / 2 + .12), FL + .68)), wood_d)); P.append((ico(.14, at=(cx_, a[1] + out * (T / 2 + .12), FL + .9), sub=1, jit=.3, seed=int(cx_ * 7)), lp('Blumen', '#d6406a', .8, var=.15)))
                else:
                    cy_ = a[1] + s_ + w_ / 2; out = -1 if sd == 'W' else 1; P.append((box(.02, w_ - .1, 1.0, at=(a[0], cy_, FL + .9)), gl))
                    P += [(box(.04, .5, 1.05, at=(a[0] + out * (T / 2 + .03), cy_ + k_ * (w_ / 2 + .27), FL + .85)), green_s) for k_ in (-1, 1)]
    ov = .9; zt = FL + H; half = 3.5 + ov; rh = half * math.tan(math.radians(28))
    for s_ in (-1, 1):
        ye = hy + s_ * half
        P.append((solid([(x0 - ov, ye, zt - ov * .53), (x1 + ov, ye, zt - ov * .53), (x1 + ov, hy, zt + rh - ov * .53), (x0 - ov, hy, zt + rh - ov * .53)], (0, 0, .16)), roof))
    for xx in (x0, x1 - .2): P.append((solid([(xx, y0, zt), (xx, y1, zt), (xx, hy, zt + 3.5 * math.tan(math.radians(28)))], (.2, 0, 0)), wood))
    P.append((box(11 + 2 * ov, .24, .24, at=(hx, hy, zt + rh - ov * .53 + .02)), roof))
    P += [(box(.6, .6, 4.2, at=(x1 - 1.4, hy + 1.6, zt - .6), bevel_w=.02), stone), (box(.7, .7, .08, at=(x1 - 1.4, hy + 1.6, zt + 3.6)), lp('Beton_dunkel', '#7f7d76', .9))]
    # terrace in front (south): deck, railing, table + benches
    P += [(box(11.0, 3.2, .2, at=(hx, y0 - 1.6, hz - .02)), wood)] + [(box(.08, .08, 1.0, at=(x0 + .1 + 1.36 * i, y0 - 3.15, hz + .18)), wood_d) for i in range(9) if i not in (3, 4)]
    P += [(box(4.2, .08, .08, at=(x0 + 2.1, y0 - 3.15, hz + 1.1)), wood_d), (box(4.2, .08, .08, at=(x1 - 2.1, y0 - 3.15, hz + 1.1)), wood_d)]
    for tx_ in (x0 + 2.0, x1 - 2.2):
        P += [(box(1.6, .8, .05, at=(tx_, y0 - 1.6, hz + .9)), wood), (box(.08, .7, .72, at=(tx_ - .6, y0 - 1.6, hz + .18)), wood_d), (box(.08, .7, .72, at=(tx_ + .6, y0 - 1.6, hz + .18)), wood_d),
              (box(1.6, .3, .05, at=(tx_, y0 - 2.4, hz + .62)), wood), (box(1.6, .3, .05, at=(tx_, y0 - .8, hz + .62)), wood)]
    multi('Steinberghuette', P, c, indoor=[x0, y0, x1, y1, round(hz - .5, 2), round(FL + 3.4, 2)])
    multi('Steinberghuette_Schild', [(box(3.0, .05, .5, at=(hx, y0 - .25, zt + .6)), lp('Schild_creme', '#efe4c4', .6)),
                                     (text_bm('STEINBERGHÜTTE · 1420 m', .19, at=(hx, y0 - .28, zt + .7), depth=.01), wood_d)], c, collide=0)
    hinge = (x0 + DOOR[0] + .06, y0 + T / 2, FL)
    leaf = [(box(.94, .07, 2.03, at=(.47, 0, 0), bevel_w=.01), lp('Haustuer', '#5e3a22', .7, var=.04)), (box(.7, .08, .5, at=(.47, 0, 1.3)), lp('Haustuer_hell', '#7a4e30', .7)), (box(.04, .14, .04, at=(.82, 0, 1.0)), steel)]
    multi('Steinberghuette_Tuer', [(move(b_, hinge), m) for b_, m in leaf], c, pivot=hinge, interact='door', angle=math.radians(100), label='Hüttentür')
    # interior: bunk platform (north-west), table + benches, tiled stove (north-east), cupboard (west), Henning by the table
    P = [(box(4.4, 1.9, .5, at=(x0 + T + 2.2, y1 - T - .95, FL)), wood_d), (box(4.3, 1.8, .12, at=(x0 + T + 2.2, y1 - T - .95, FL + .5)), lp('Matratze', '#8a7a5a', .9)),
         ]
    tx_, ty_ = hx + 2.0, hy - .4
    P += [(box(2.0, .9, .05, at=(tx_, ty_, FL + .74)), wood)] + [(box(.07, .07, .74, at=(tx_ + sx_ * .9, ty_ + sy_ * .38, FL)), wood_d) for sx_ in (-1, 1) for sy_ in (-1, 1)]
    P += [(box(2.0, .32, .05, at=(tx_, ty_ + sy_ * .8, FL + .44)), wood) for sy_ in (-1, 1)] + [(box(.06, .3, .44, at=(tx_ + sx_ * .9, ty_ + sy_ * .8, FL)), wood_d) for sx_ in (-1, 1) for sy_ in (-1, 1)]
    P += [(box(1.0, .8, 1.6, at=(x1 - T - .55, y1 - T - .45, FL), bevel_w=.04), lp('Kacheln', '#3f6a6a', .5, var=.06)), (box(1.1, .9, .08, at=(x1 - T - .55, y1 - T - .45, FL + 1.6)), stone)]
    P += [(box(.7, .4, .03, at=(x0 + T + .2 + .35, hy - 1.6, FL + .9 + .45 * i)), wood) for i in range(3)] + [(box(.7, .04, 1.8, at=(x0 + T + .55, hy - 1.6 + s_ * .2, FL)), wood_d) for s_ in (-1, 1)]
    multi('Steinberghuette_Einrichtung', P, c)
    multi('Matratzenlager', [(box(4.2, 1.7, .03, at=(x0 + T + 2.2, y1 - T - .95, FL + .63)), fabric)], c, collide=0, interact='use', use='bett', label='Matratzenlager')
    cp = [(box(.5, 1.0, 1.9, at=(0, 0, 0), bevel_w=.02), wood_d), (box(.02, .47, 1.7, at=(.26, -.25, .1)), wood), (box(.02, .47, 1.7, at=(.26, .25, .1)), wood), (box(.03, .03, .12, at=(.28, -.04, 1.0)), steel), (box(.03, .03, .12, at=(.28, .04, 1.0)), steel)]
    multi('Huettenschrank', [(move(rotz(b_, math.pi), (x1 - T - .26, hy - 1.8, FL)), m) for b_, m in cp], c, interact='search', label='Hüttenschrank', item='dosensuppe',
          loot=[['rucksack_trekking', 1], ['dosensuppe', 2], ['kraeuter', 2], ['medizin', 1], ['kerze', 2]], found='Ein alter Trekkingrucksack, zwei Dosensuppen, getrocknete Kamille, Medizin und Kerzen.')
    multi('Henning', person(hx + 2.0, hy - 1.75, FL, math.pi / 2, lp('Jacke_Loden', '#4a5a3a', .9, var=.08), beard='#8a6a4a', hat='#3a4a2a', trousers='#4a4036'), c, interact='talk', npc='henning', label='Henning (Förster)')
    multi('Wandkarte_Berg', [(box(1.2, .03, .8, at=(hx - .2, y1 - T - .02, FL + 1.3)), paper), (box(1.26, .02, .86, at=(hx - .2, y1 - T - .01, FL + 1.27)), wood_d),
                             (box(.3, .035, .2, at=(hx - .5, y1 - T - .03, FL + 1.65)), lp('Karte_gruen', '#7f9a48', .9)), (box(.25, .035, .15, at=(hx + .1, y1 - T - .03, FL + 1.45)), lp('Karte_blau', '#4f8fae', .9))], c,
          collide=0, interact='read', label='Wanderkarte Steinberg', reveal='gipfel,bergwerk,bergsee,heustadel',
          text='<b>Wanderkarte Steinberg</b><br>▲ Gipfelkreuz (1478 m) – Pfad hinter der Hütte, ca. 40 min<br>⛏ Stollen „Glück auf“ – vom Wendeplatz Richtung Osten<br>💧 Bergsee – vom unteren Kehrenplatz nach Westen<br>🌾 Heustadel auf der unteren Alm<br><i>Alle Orte sind jetzt auf deiner Karte eingetragen.</i>')
    multi('Patronen_Huette', [(box(.12, .08, .06, at=(x0 + T + .55, hy - 1.6, FL + .93), bevel_w=.005), lp('Munition_0', '#3a5a3a', .6))], c, collide=0, interact='pickup', item='patronen_gewehr', label='Gewehrpatronen')
    wx_, wy_ = hx + 7.5, hy - 5.0; wz_ = Z(wx_, wy_)
    multi('Wegweiser_Huette', [(cyl(.06, 2.4, at=(wx_, wy_, wz_), seg=6), wood_d)] + [(box(1.3, .05, .24, at=(wx_ + .5 * s_, wy_, wz_ + 2.0 - .32 * k_), rz=a_), lp('Schild_gelb', '#f2c230', .5)) for k_, (s_, a_) in enumerate(((1, .4), (-1, 0), (1, -.7)))] +
          [(text_bm(t_, .1, at=(wx_ + .5 * s_, wy_ - .03, wz_ + 2.05 - .32 * k_), rz=a_, depth=.01), blk) for k_, (s_, a_, t_) in enumerate(((1, .4, 'Gipfel 40 min'), (-1, 0, 'Bergsee'), (1, -.7, 'Stollen')))], c, collide=0)
    spot('ziel_berghuette', (hx, y0 - 1.0, hz), quest='berghuette'); spot('ziel_henning', (hx + 2.0, hy - 1.75, FL + 1.0), quest='henning')

    # ------------------------------------------------------------ old mine „Glück auf“: cutting, portal, tunnel (closed above by rock), rubble, crystal chamber
    sx0, sx1, yc, hw = STOLLEN; SZ = STOLLEN_Z; IW = 1.7; CH = 2.7
    up = lambda x, y: berg_h(x, y, carve=False) + .15
    P = [(heightbox(sx0, sx1 + 1.5, yc + IW + .4, yc + hw + 1.3, SZ - .1, up), rock), (heightbox(sx0, sx1 + 1.5, yc - hw - 1.3, yc - IW - .4, SZ - .1, up), rock),
         (heightbox(sx0, sx1 + 1.5, yc - IW - .41, yc + IW + .41, SZ + CH + .2, lambda x, y: max(up(x, y), SZ + CH + 1.4)), rock)]
    P += [(box(sx1 - sx0, 2 * IW, .1, at=((sx0 + sx1) / 2, yc, SZ - .1)), lp('Stollenboden', '#5a5248', .95, var=.08)),
          (box(sx1 - sx0, .4, CH + .2, at=((sx0 + sx1) / 2, yc + IW + .2, SZ - .05)), rock), (box(sx1 - sx0, .4, CH + .2, at=((sx0 + sx1) / 2, yc - IW - .2, SZ - .05)), rock),
          (box(sx1 - sx0, 2 * IW + .8, .2, at=((sx0 + sx1) / 2, yc, SZ + CH)), rock), (box(.4, 2 * IW, CH, at=(sx1 + .2, yc, SZ)), rock)]
    for i in range(int((sx1 - sx0) / 2.5) + 1):                                                    # timber supports
        x = sx0 + .3 + 2.5 * i
        if x > sx1 - .3 or 84.9 < x < 88.0: continue
        P += [(box(.22, .22, CH - .2, at=(x, yc + IW - .13, SZ)), wood_d), (box(.22, .22, CH - .2, at=(x, yc - IW + .13, SZ)), wood_d), (box(.26, 2 * IW, .22, at=(x, yc, SZ + CH - .22)), wood_d)]
    P += [(box(.35, .35, CH + .4, at=(sx0 - .15, yc + s_ * (IW + .1), SZ - .05)), wood) for s_ in (-1, 1)] + [(box(.4, 2 * IW + .9, .35, at=(sx0 - .15, yc, SZ + CH)), wood)]
    P += [(box(.05, 1.6, .4, at=(sx0 - .38, yc, SZ + CH + .38)), lp('Schild_creme', '#efe4c4', .6)), (text_bm('GLÜCK AUF · 1887', .16, at=(sx0 - .42, yc, SZ + CH + .45), rz=-math.pi / 2, depth=.01), blk)]
    for x in [sx0 - 7.5 + .6 * i for i in range(int((sx1 - 1 - sx0 + 7.5) / .6))]:                   # rails + sleepers
        P.append((box(.14, 1.3, .06, at=(x, yc, SZ)), wood_d))
    P += [(box(sx1 - 1 - sx0 + 7.5, .05, .08, at=((sx1 - 1 + sx0 - 7.5) / 2, yc + s_ * .45, SZ + .06)), rust) for s_ in (-1, 1)]
    multi('Stollen', P, c, indoor=[sx0, yc - IW, sx1, yc + IW, SZ - .5, SZ + CH])
    lore = [(box(1.1, .9, .6, at=(0, 0, .25), bevel_w=.03), rust), (box(1.0, .8, .05, at=(0, 0, .28)), lp('Rost_d', '#5a3a22', .9))] + [(cyl(.15, .08, at=(sx_ * .35, sy_ * .45, .15), seg=8, axis='Y'), blk) for sx_ in (-1, 1) for sy_ in (-1, 1)]
    lore += [(ico(.18, at=(rx_ * .25, ry_ * .2, .85), sub=1, jit=.3, seed=1400 + k_, sz=.7), scree) for k_, (rx_, ry_) in enumerate(((-1, -1), (1, 0), (0, 1), (-1, 1)))]
    multi('Lore', [(move(b_, (sx0 - 4.0, yc, SZ + .02)), m) for b_, m in lore], c)
    G = []
    for k_ in range(14):                                                                            # rubble: fills the tunnel at x 85 … 87.5
        G.append((ico(R.uniform(.45, .8), at=(R.uniform(85.3, 87.3), yc + R.uniform(-1.3, 1.3), SZ + R.uniform(.2, 2.1)), sub=1, jit=.3, seed=1420 + k_, sz=.8), rock if k_ % 3 else scree))
    G.append((box(2.2, 2 * IW - .05, CH - .1, at=(86.3, yc, SZ)), scree))
    multi('Geroell', G, c, interact='use', use='sprengen', blocker=1, label='Geröll (verschüttet)')
    for k_, (x, y, z_) in enumerate(((90.4, yc + 1.25, SZ + .2), (91.6, yc - 1.2, SZ + .8), (92.4, yc + .6, SZ + .05))):
        C = []
        for j in range(4):
            cc = cone(.07 + .02 * j, .35 + .1 * j, seg=6, r2=.0); bmesh.ops.rotate(cc, cent=(0, 0, 0), matrix=Matrix.Rotation(R.uniform(-.5, .5), 3, 'X') @ Matrix.Rotation(R.uniform(-.5, .5), 3, 'Y'), verts=cc.verts)
            C.append((move(cc, (x + R.uniform(-.1, .1), y + R.uniform(-.1, .1), z_)), crystal))
        multi(f'Bergkristall_{k_}', C, c, collide=0, interact='pickup', item='bergkristall', label='Bergkristall')
    multi('Grubenkiste', [(box(.8, .5, .45, at=(89.5, yc - 1.15, SZ), bevel_w=.02), wood_d), (box(.82, .52, .06, at=(89.5, yc - 1.15, SZ + .45)), wood), (box(.84, .06, .5, at=(89.3, yc - 1.15, SZ)), rust)], c,
          interact='search', label='Alte Grubenkiste', item='goldmuenze', loot=[['goldmuenze', 2], ['metall', 3], ['patronen_gewehr', 1]], found='Zwei Goldmünzen, Metallteile und eine Schachtel Patronen – vergessen seit 1958.')
    light('stollen_kristall', (91.0, yc, SZ + 1.2), color='#b89cff', power=6, group='kristall')
    multi('Sprengkiste', [(box(.7, .45, .4, at=(sx0 - 6.0, yc + 2.55, SZ), bevel_w=.02), lp('Kiste_rot', '#8a2a22', .7)), (box(.72, .47, .05, at=(sx0 - 6.0, yc + 2.55, SZ + .4)), wood_d),
                          (text_bm('VORSICHT', .07, at=(sx0 - 6.0, yc + 2.32, SZ + .2), depth=.005), white)], c,
          interact='search', label='Kiste „Vorsicht Sprengstoff“', item='schwarzpulver', loot=[['schwarzpulver', 2], ['seil', 1]], found='Zwei Päckchen Sprengpulver und eine Rolle Zündschnur (Seil).')
    multi('Stollen_Tafel', [(cyl(.05, 1.5, at=(sx0 - 8.5, yc - 3.2, Z(sx0 - 8.5, yc - 3.2)), seg=6), wood_d), (box(.05, 1.0, .65, at=(sx0 - 8.5, yc - 3.2, Z(sx0 - 8.5, yc - 3.2) + 1.1), rz=.0), wood),
                            (box(.02, .9, .55, at=(sx0 - 8.46, yc - 3.2, Z(sx0 - 8.5, yc - 3.2) + 1.15)), paper)], c, collide=0, interact='read', label='Tafel am Stollen', reveal='bergwerk',
          text='<b>Stollen „Glück auf“</b> – Bergkristall-Abbau 1887 bis 1958.<br>Nach dem Einsturz von 1958 ist der hintere Teil verschüttet. <b>Betreten auf eigene Gefahr!</b><br><i>Mit Sprengpulver, einer Zündschnur und Feuer ließe sich das Geröll sprengen …</i>')
    for k_ in range(9):
        x, y = sx0 - 12 + R.uniform(-3, 3), yc - 7 + R.uniform(-3, 3)
        obj(f'Abraum_{k_}', ico(R.uniform(.5, 1.1), at=(x, y, Z(x, y) + .1), sub=1, jit=.3, seed=1440 + k_, sz=.55), scree, c)
    spot('ziel_bergwerk', (sx0 - 3.0, yc, SZ), quest='bergwerk')

    # ------------------------------------------------------------ summit: cross, summit book, bench
    gx, gy = GIPFEL; gz = Z(gx, gy)
    multi('Gipfelkreuz', [(box(.2, .2, 4.4, at=(gx, gy, gz - .3)), wood_d), (box(1.8, .2, .2, at=(gx, gy, gz + 2.9)), wood_d), (cyl(.4, .4, at=(gx, gy, gz - .3), seg=7), stone),
                          (box(.08, .25, .18, at=(gx + .14, gy, gz + 1.2)), steel)], c)
    multi('Gipfelbuch', [(box(.26, .2, .16, at=(gx + .2, gy, gz + 1.15)), steel), (box(.22, .16, .03, at=(gx + .2, gy, gz + 1.31)), lp('Buch_rot', '#8a2a22', .7))], c, collide=0, interact='read',
          label='Gipfelbuch', reveal='berg_all',
          text='<b>Gipfelbuch Steinberg, 1478 m</b><br>„Endlich oben! Blick bis zum Dorf Tannbach.“ – Familie Huber<br>„Der alte Stollen ist von hier aus gut zu sehen, unten rechts.“ – Brandt<br>„Saibling im Bergsee: 42 cm!“ – Kurt<br><i>Alle Orte im Gebirge sind jetzt auf deiner Karte eingetragen.</i>')
    multi('Gipfelbank', [(box(1.5, .4, .05, at=(gx - 2.5, gy - 1.5, Z(gx - 2.5, gy - 1.5) + .45)), wood), (box(.08, .38, .45, at=(gx - 3.15, gy - 1.5, Z(gx - 2.5, gy - 1.5))), wood_d), (box(.08, .38, .45, at=(gx - 1.85, gy - 1.5, Z(gx - 2.5, gy - 1.5))), wood_d)], c)
    spot('ziel_gipfel', (gx, gy, gz), quest='gipfel')

    # ------------------------------------------------------------ mountain lake, hay barn
    lx, ly = BERGSEE; bm = bmesh.new(); ctr = bm.verts.new((lx, ly, BERGSEE_Z)); ring = []
    for i in range(28): a = 6.283 * i / 28; rr = 11.0 + R.uniform(-.4, .4); ring.append(bm.verts.new((lx + rr * math.cos(a), ly + rr * math.sin(a), BERGSEE_Z)))
    for i in range(28): bm.faces.new((ctr, ring[i], ring[(i + 1) % 28]))
    obj('Bergsee', bm, water, c, collide=0, water=1)
    for k_ in range(10):
        a = R.uniform(0, 6.283); rr = R.uniform(10.5, 12.5); x, y = lx + rr * math.cos(a), ly + rr * math.sin(a)
        if math.hypot(x - (lx + 9), y - (ly - 4)) < 3: continue
        obj(f'Seefels_{k_}', ico(R.uniform(.4, .9), at=(x, y, Z(x, y) + .1), sub=1, jit=.3, seed=1460 + k_, sz=.6), rock, c)
    multi('Bergsee_Bank', [(box(1.5, .4, .05, at=(lx + 11.5, ly - 3.0, Z(lx + 11.5, ly - 3) + .45)), wood), (box(.08, .38, .45, at=(lx + 10.85, ly - 3.0, Z(lx + 11.5, ly - 3))), wood_d), (box(.08, .38, .45, at=(lx + 12.15, ly - 3.0, Z(lx + 11.5, ly - 3))), wood_d)], c)
    spot('ziel_bergsee', (lx, ly, BERGSEE_Z), quest='bergsee')
    bx, by = HEUSTADEL; bz = Z(bx, by); P = [(box(6.4, 4.4, .25, at=(bx, by, bz - .15)), stone)]
    P += [(box(6.0, .14, 2.6, at=(bx, by + 2.0, bz)), wood), (box(6.0, .14, 2.6, at=(bx, by - 2.0, bz)), wood), (box(.14, 4.0, 2.6, at=(bx + 3.0, by, bz)), wood)]
    P += [(box(.2, .2, 2.6, at=(bx - 3.0, by + s_ * 1.9, bz)), wood_d) for s_ in (-1, 1)] + [(box(.2, .2, 2.6, at=(bx - 3.0, by, bz)), wood_d)]
    P.append((solid([(bx - 3.6, by - 2.6, bz + 2.6), (bx + 3.6, by - 2.6, bz + 2.6), (bx + 3.6, by + 2.6, bz + 3.6), (bx - 3.6, by + 2.6, bz + 3.6)], (0, 0, .14)), roof))
    for k_ in range(4): P.append((box(1.0, .7, .6, at=(bx + 1.9 - (k_ % 2) * 1.1, by + 1.2 - (k_ // 2) * .8, bz + .1 + (.6 if k_ == 3 else 0)), bevel_w=.08, seg=2), hay))
    multi('Heustadel', P, c)
    spot('ziel_heustadel', (bx, by, bz), quest='heustadel')

    # ------------------------------------------------------------ jute sacks (template from s10) and the arrival point
    sack = bpy.data.objects['Sack']
    for i, (x, y, loot) in enumerate(SACKS_BERG):
        inst(sack, f'Sack_B{i}', (x, y, Z(x, y) - .02), R.uniform(0, 6.28), R.uniform(.9, 1.1), c=c, loot=loot, item=loot[0][0])
    spot('berg_start', (1.75, 906.0, Z(1.75, 906.0) + .1), rz=0.0, quest='pass')
