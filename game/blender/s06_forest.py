# Section 6 – forest (autumn, low poly): spruces, pines, birches, autumn broadleaf trees, dead trees; bushes, ferns, grass tufts,
# rocks, fallen logs, stumps, mushrooms (pickups, some poisonous); creek with water surface and stepping stones; footpath to the
# hunter's stand (Hochsitz, with the 9 V battery for the radio) and the old campfire. Trees are linked duplicates of a few
# variants (one geometry each in the GLB → InstancedMesh in the game); collide_r = trunk radius for the game's collision.
COLL = '06 Wald'

def tree_ok(x, y, r):
    """Free spot for a tree / bush: not on road, station plot, creek, footpaths, clearings."""
    if abs(x - road_x(y)) < 8.5: return False
    if -6 < x < 50 and -30 < y < 32: return False
    if abs(x - creek_x(y)) < 3.2 + r: return False
    if trail_dist(x, y) < 1.6 + r: return False
    if math.hypot(x - HOCHSITZ[0], y - HOCHSITZ[1]) < 8: return False
    if math.hypot(x - FEUERSTELLE[0], y - FEUERSTELLE[1]) < 5.5: return False
    if math.hypot(x - CAMP[0], y - CAMP[1]) < 9 + r: return False
    if abs(x - VILLAGE[0]) < 40 + r and abs(y - VILLAGE[1]) < 36 + r: return False
    for sx, sy, _ in SACKS:
        if math.hypot(x - sx, y - sy) < 1.6 + r: return False
    for c_, rr in ((TOWER, 9), (RUIN, 15), (QUARRY, 19), (MILL, 10)):
        if math.hypot(x - c_[0], y - c_[1]) < rr + r: return False
    return MAP_X0 + 2 < x < MAP_X1 - 2 and MAP_Y0 + 2 < y < MAP_Y1 - 2

def build(c):
    bark = lp('Rinde', '#5a4030', .9, var=.08); bark_d = lp('Rinde_dunkel', '#463226', .9, var=.08)
    birch_b = lp('Birkenrinde', '#e6e2d6', .8, var=.05); birch_s = lp('Birke_Flecken', '#2b2622', .8, var=.04)
    spruce = [lp('Fichte_a', '#2f5a34', .9, var=.08), lp('Fichte_b', '#3a6b3c', .9, var=.08)]
    pine_m = lp('Kiefer', '#4d7a3a', .9, var=.08)
    autumn = [lp('Laub_orange', '#d9822b', .9, var=.08), lp('Laub_gelb', '#e3b63a', .9, var=.08), lp('Laub_rot', '#b8452c', .9, var=.08), lp('Laub_gruen', '#7c9a3a', .9, var=.08)]
    birch_l = lp('Birke_Laub', '#c9c24a', .9, var=.08)
    rock_m = [lp('Fels', '#8a8780', .9, var=.1), lp('Fels_moos', '#6f7a55', .9, var=.1)]
    bush_m = [lp('Busch', '#4f7a34', .9, var=.1), lp('Busch_herbst', '#a8692e', .9, var=.1)]
    fern_m = lp('Farn', '#5f8a36', .9, var=.1); grass_m = lp('Grasbuesche', '#7f9c45', .9, var=.1)
    tmp = coll('_Vorlagen', c)

    def T(name, parts, **kw):
        o = multi(name, parts, tmp, **kw); o.location = (0, 0, -500); return o

    # ---------------- tree variants (built at the origin, standing on z = 0)
    V = []
    for k in range(4):                              # spruce: trunk + 5–6 stacked jittered cones
        h = 9 + 3 * k; parts = [(cyl(.22 + .04 * k, h * .35, seg=6, r2=.15), bark_d)]
        tiers = 5 + k % 2
        for t in range(tiers):
            z = h * (.18 + .8 * t / tiers); rr = (1 - t / tiers) * (2.0 + .3 * k) + .4
            parts.append((cone(rr, h * .32, at=(0, 0, z), seg=7, jit=.12, seed=k * 10 + t), spruce[(k + t) % 2]))
        V.append(('Fichte', T(f'Fichte_{k}', parts, collide_r=.3 + .04 * k), 4))
    for k in range(2):                              # pine: tall bare trunk, flat crown clusters
        h = 13 + 3 * k; parts = [(cyl(.25, h, seg=6, r2=.12), bark)]
        rr = random.Random(50 + k)
        for i in range(5):
            a = rr.uniform(0, 6.28); d = rr.uniform(.4, 1.4); z = h * rr.uniform(.72, .98)
            parts.append((ico(rr.uniform(1.3, 2.0), at=(d * math.cos(a), d * math.sin(a), z), sub=1, jit=.15, seed=i + 7 * k, sz=.55), pine_m))
            parts.append((cyl(.06, d + .3, at=(0, 0, z - .3), seg=4, axis='X'), bark))
        V.append(('Kiefer', T(f'Kiefer_{k}', parts, collide_r=.28), 2))
    for k in range(2):                              # birch: white trunk with dark marks, light round crown
        h = 8 + 2 * k; parts = [(cyl(.16, h * .8, seg=6, r2=.08), birch_b)]
        for i in range(6): parts.append((box(.33, .33, .05, at=(0, 0, .8 + i * h * .12), rz=i * .9), birch_s))
        rr = random.Random(60 + k)
        for i in range(4): parts.append((ico(rr.uniform(1.2, 1.7), at=(rr.uniform(-.8, .8), rr.uniform(-.8, .8), h * rr.uniform(.6, .9)), sub=1, jit=.18, seed=i + 3 * k, sz=1.2), birch_l))
        V.append(('Birke', T(f'Birke_{k}', parts, collide_r=.18), 2))
    for k in range(4):                              # autumn broadleaf: forked trunk, big lumpy crown
        h = 7 + k; parts = [(cyl(.3, h * .55, seg=6, r2=.2), bark)]
        for s in (-1, 1):
            br = cyl(.14, h * .35, seg=5, r2=.08); bmesh.ops.rotate(br, cent=(0, 0, 0), matrix=Matrix.Rotation(s * .45, 3, 'Y'), verts=br.verts)
            parts.append((move(br, (0, 0, h * .45)), bark))
        rr = random.Random(70 + k)
        for i in range(5): parts.append((ico(rr.uniform(1.6, 2.4), at=(rr.uniform(-1.3, 1.3), rr.uniform(-1.3, 1.3), h * rr.uniform(.65, .9)), sub=1, jit=.2, seed=i + 5 * k), autumn[(k + i % 2) % 4]))
        V.append(('Laubbaum', T(f'Laubbaum_{k}', parts, collide_r=.32), 2))
    dead = [(cyl(.25, 7, seg=6, r2=.05), bark_d), (move(cyl(.08, 2, seg=4, axis='X'), (0, 0, 4)), bark_d), (move(cyl(.07, 1.6, seg=4, axis='Y'), (0, 0, 5.2)), bark_d)]
    V.append(('Totholz', T('Baum_tot', dead, collide_r=.25), 1))
    pool = [v for v in V for _ in range(v[2])]

    # ---------------- place trees on a jittered grid (density rises with distance from the road)
    R = random.Random(2024); n = 0; trees = coll('Bäume', c)
    for gx in range(int(MAP_X0) + 2, int(MAP_X1) - 2, 5):
        for gy in range(int(MAP_Y0) + 2, int(MAP_Y1) - 2, 5):
            x, y = gx + R.uniform(0, 5), gy + R.uniform(0, 5)
            if not tree_ok(x, y, .5): continue
            d = abs(x - road_x(y))
            if R.random() > min(.85, .35 + (d - 8) / 30): continue
            kind, src, _ = R.choice(pool)
            if kind == 'Birke' and d > 30 and R.random() < .6: kind, src, _ = R.choice(pool)
            s = R.uniform(.8, 1.25)
            inst(src, f'{kind}_{n}', (x, y, terrain_h(x, y) - .1), R.uniform(0, 6.28), s, c=trees, tree=kind); n += 1

    # ---------------- undergrowth: bushes, ferns, grass tufts, rocks, stumps, logs
    ug = coll('Unterholz', c)
    bush = [T(f'Busch_{k}', [(ico(.9 + .2 * k, at=(0, 0, .5), sub=1, jit=.25, seed=80 + k, sz=.75), bush_m[k % 2]), (ico(.6, at=(.6, .2, .4), sub=1, jit=.2, seed=90 + k, sz=.7), bush_m[k % 2])], collide=0) for k in range(3)]
    fern = []
    for k in range(2):
        fr = bmesh.new()
        for i in range(7):
            a = 6.28 * i / 7 + k * .3; L = .8 + .15 * (i % 3)
            leaf = prism([(-.08, 0), (.08, 0), (.02, L), (-.02, L)], .02)
            bmesh.ops.rotate(leaf, cent=(0, 0, 0), matrix=Matrix.Rotation(-1.0, 3, 'X'), verts=leaf.verts)   # lean out
            rotz(leaf, a); fr = merge(fr, leaf)
        fern.append(T(f'Farn_{k}', [(fr, fern_m)], collide=0))
    tuft = []
    for k in range(2):
        tb = bmesh.new(); rr = random.Random(100 + k)
        for i in range(6): tb = merge(tb, rotz(move(cone(.06, rr.uniform(.35, .6), seg=3), (rr.uniform(-.15, .15), rr.uniform(-.15, .15), 0)), rr.uniform(0, 6)))
        tuft.append(T(f'Grasbuschel_{k}', [(tb, grass_m)], collide=0))
    rocks = [T(f'Fels_{k}', [(ico(.5 + .5 * k, at=(0, 0, .2 + .2 * k), sub=1, jit=.3, seed=110 + k, sz=.6), rock_m[k % 2])], collide=1 if k > 0 else 0) for k in range(4)]
    stump = T('Baumstumpf', [(cyl(.35, .45, seg=7, r2=.3), bark), (cyl(.3, .02, at=(0, 0, .45), seg=7), lp('Holz_hell', '#c9a273', .8))], collide_r=.35)
    logs = [T(f'Baumstamm_{k}', [(cyl(.28 - .05 * k, 5 + 2 * k, seg=7, axis='X'), bark), (move(cyl(.27 - .05 * k, .02, seg=7, axis='X'), (5 + 2 * k, 0, 0)), lp('Holz_hell', '#c9a273', .8))]) for k in range(2)]
    for lg in logs:
        for v in lg.data.vertices: v.co.z += .28; v.co.x -= 2.5
    R = random.Random(77); k = 0
    for i in range(2200):
        x, y = R.uniform(MAP_X0 + 2, MAP_X1 - 2), R.uniform(MAP_Y0 + 2, MAP_Y1 - 2)
        d = abs(x - road_x(y))
        if d < 4.6 or (-3 < x < 48 and -26 < y < 28) or (abs(x - VILLAGE[0]) < 38 and abs(y - VILLAGE[1]) < 34) or abs(x - creek_x(y)) < 2.4 or trail_dist(x, y) < .9 or math.hypot(x - CAMP[0], y - CAMP[1]) < 7: continue
        z = terrain_h(x, y)
        if d < 9: src = R.choice(tuft)          # verge: grass tufts only
        else:
            src = R.choice(bush * 3 + fern * 4 + tuft * 3 + rocks + [stump])
            if src in rocks + [stump] + bush and not tree_ok(x, y, 0): continue
        inst(src, f'{src.name}_{k}', (x, y, z - .05), R.uniform(0, 6.28), R.uniform(.7, 1.3), c=ug); k += 1
    for i in range(20):
        x, y = R.uniform(-100, 100), R.uniform(-100, 220)
        if tree_ok(x, y, 3): lg = R.choice(logs); inst(lg, f'Baumstamm_{i}', (x, y, terrain_h(x, y) - .1), R.uniform(0, 6.28), 1.0, c=ug)

    # ---------------- mushrooms (pickups): red fly agaric = poisonous, brown = edible
    mush_ok = lp('Pilz_braun', '#8a5a34', .8); mush_bad = lp('Pilz_rot', '#d23a2a', .7); stem = lp('Pilz_Stiel', '#efe8d8', .8)
    R = random.Random(5); k = 0
    while k < 34:
        x, y = R.uniform(-100, 100), R.uniform(-100, 220)
        if not tree_ok(x, y, 0) or abs(x - road_x(y)) < 15: continue
        bad = k % 3 == 0; z = terrain_h(x, y)
        parts = [(cyl(.03, .1, at=(x, y, z - .02), seg=6), stem), (dome(.08, at=(x, y, z + .08), seg=8, rings=3, h=.06), mush_bad if bad else mush_ok)]
        multi(f'Pilz_{k}', parts, ug, collide=0, interact='pickup', item='fliegenpilz' if bad else 'steinpilz', label='Roter Pilz' if bad else 'Brauner Pilz'); k += 1
    # dry branches (pickups for the fire) along the paths
    R = random.Random(6)
    for k in range(30):
        pts = trail_pts()[k % 7]; i = R.randrange(len(pts) - 1); (ax, ay), (bx, by) = pts[i], pts[i + 1]; t = R.random()
        x, y = ax + (bx - ax) * t + R.uniform(-3, 3), ay + (by - ay) * t + R.uniform(-3, 3); z = terrain_h(x, y)
        br = cyl(.04, 1.1, at=(-.55, 0, 0), seg=5, axis='X'); rotz(br, R.uniform(0, 6)); move(br, (x, y, max(z, terrain_h(x + .5, y), terrain_h(x - .5, y)) + .1))
        obj(f'Ast_{k}', br, bark, ug, collide=0, interact='pickup', item='ast', label='Trockener Ast')

    # ---------------- creek: water surface strip + stepping stones + drink spot
    water = lp('Wasser', '#4f8fae', .05, 0, alpha=.75, var=.03)
    bm = bmesh.new(); rows = []
    for y in range(int(MAP_Y0), int(MAP_Y1) + 1, 2):
        cx, cz = creek_x(y), creek_z(y)
        rows.append([bm.verts.new((cx + o, y, cz)) for o in (-2.2, -.7, .7, 2.2)])
    for r0, r1 in zip(rows, rows[1:]):
        for i in range(3): bm.faces.new((r0[i], r0[i + 1], r1[i + 1], r1[i]))
    obj('Bach', bm, water, c, collide=0, interact='use', use='bachwasser', label='Bachwasser trinken', water=1)
    for i, y in enumerate((12.0, 12.9, 13.7)):
        st = ico(.45, at=(creek_x(y) - 1.0 + i * 1.0, y, creek_z(y) - .25), sub=1, jit=.2, seed=300 + i, sz=.6)
        obj(f'Trittstein_{i}', st, rock_m[0], c)
    for i in range(44):
        y = R.uniform(-105, 225); s = R.choice((-1, 1)); x = creek_x(y) + s * R.uniform(1.8, 3.2)
        inst(rocks[R.randrange(2)], f'Uferstein_{i}', (x, y, terrain_h(x, y) - .1), R.uniform(0, 6), R.uniform(.5, 1.0), c=ug)

    # ---------------- hunter's stand (Hochsitz) at the clearing, looking east over the creek
    hx, hy = HOCHSITZ; hz = terrain_h(hx, hy); wd = lp('Hochsitz_Holz', '#8a6a48', .9, var=.08); wd2 = lp('Hochsitz_Holz_d', '#6b5038', .9, var=.08)
    roof = lp('Hochsitz_Dach', '#3f4a3a', .9, var=.06); P = []
    F0, HH = hz + 3.6, 2.0                                                              # cabin floor, cabin height
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append((cyl(.1, 3.8, at=(hx + sx * 1.1, hy + sy * 1.1, hz - .2), seg=6), wd2))   # legs
            P.append((box(.1, .1, HH, at=(hx + sx * .95, hy + sy * .95, F0)), wd2))           # cabin corner posts
    P += [(box(2.0, 2.0, .1, at=(hx, hy, F0 - .1)), wd)]                                 # floor
    P += [(box(2.0, .08, HH, at=(hx, hy - .95, F0)), wd), (box(2.0, .08, HH, at=(hx, hy + .95, F0)), wd)]   # south / north
    P += [(box(.08, .55, HH, at=(hx - .95, hy - .67, F0)), wd), (box(.08, .55, HH, at=(hx - .95, hy + .67, F0)), wd),
          (box(.08, .8, .2, at=(hx - .95, hy, F0 + HH - .2)), wd)]                         # west: door opening to the ladder
    P += [(box(.08, 2.0, 1.0, at=(hx + .95, hy, F0)), wd), (box(.08, 2.0, .4, at=(hx + .95, hy, F0 + 1.6)), wd)]   # east: window slit over the creek
    rf = box(2.5, 2.5, .08, at=(hx, hy, F0 + HH)); bmesh.ops.rotate(rf, cent=(hx, hy, F0 + HH), matrix=Matrix.Rotation(.12, 3, 'Y'), verts=rf.verts)
    P += [(rf, roof), (box(.45, 1.6, .05, at=(hx + .65, hy, F0 + .45)), wd2), (box(.45, .05, .45, at=(hx + .65, hy - .78, F0)), wd2), (box(.45, .05, .45, at=(hx + .65, hy + .78, F0)), wd2)]   # shelf
    obj_ = multi('Hochsitz', P, c)
    lad = [(box(.08, .08, 4.3, at=(hx - 1.85, hy + s * .3, hz - .1)), wd2) for s in (-1, 1)] + [(box(.08, .7, .06, at=(hx - 1.85, hy, hz + .3 + .35 * i)), wd) for i in range(11)]
    lb = []
    for bm_, m in lad:   # lean the ladder against the door sill
        bmesh.ops.rotate(bm_, cent=(hx - 1.85, hy, hz), matrix=Matrix.Rotation(.2, 3, 'Y'), verts=bm_.verts); lb.append((bm_, m))
    multi('Hochsitz_Leiter', lb, c, ladder=1, label='Leiter', top=[hx - .2, hy, F0 + .02], bottom=[hx - 2.6, hy, hz])
    multi('Batterie_9V', [(box(.05, .03, .045, at=(hx + .6, hy + .3, F0 + .5)), lp('Batterie_9V', '#2a63b8', .5)), (box(.03, .02, .01, at=(hx + .6, hy + .3, F0 + .545)), lp('Stahl', '#9da2a6', .35, .8))],
          c, collide=0, interact='pickup', item='batterie_9v', label='9-V-Block')
    multi('Fernglas', [(cyl(.03, .12, at=(hx + .55, hy - .3 + .04 * s, F0 + .5), seg=6, axis='X'), lp('Kunststoff_schwarz', '#232426', .6)) for s in (-1, 1)], c, collide=0,
          interact='pickup', item='fernglas', label='Fernglas')
    obj('Hochsitz_Schild', text_bm('BERND', .15, at=(hx - 1.0, hy - .67, hz + 3.6 + 1.5), rz=-math.pi / 2, depth=.01), lp('Waldtank_weiss', '#f1f0ea', .5), c, collide=0)
    spot('ziel_hochsitz', (hx, hy, hz + 3.6), quest='hochsitz')

    # ---------------- old campfire: stone ring, charred wood, log benches
    fx, fy = FEUERSTELLE; fz = terrain_h(fx, fy); P = []
    for i in range(9):
        a = 6.28 * i / 9; P.append((ico(.22, at=(fx + .75 * math.cos(a), fy + .75 * math.sin(a), fz + .05), sub=1, jit=.2, seed=400 + i, sz=.7), rock_m[0]))
    P += [(cyl(.6, .03, at=(fx, fy, fz), seg=9), lp('Asche', '#3b3836', .95)), (move(rotz(cyl(.06, .8, seg=5, axis='X'), .5), (fx - .4, fy, fz + .08)), lp('Holzkohle', '#1f1c1a', .9)),
          (move(rotz(cyl(.06, .7, seg=5, axis='X'), 2.1), (fx + .2, fy - .3, fz + .08)), lp('Holzkohle', '#1f1c1a', .9))]
    multi('Feuerstelle', P, c, collide=0, interact='use', use='lagerfeuer', label='Feuerstelle', needs='ast:3,feuerzeug')
    for i, a in enumerate((0.3, 2.4, 4.4)):
        x, y = fx + 2.2 * math.cos(a), fy + 2.2 * math.sin(a)
        b = cyl(.22, 1.8, seg=7, axis='X'); move(b, (-.9, 0, .2)); rotz(b, a + math.pi / 2); move(b, (x, y, terrain_h(x, y)))
        obj(f'Sitzstamm_{i}', b, bark, c)
    spot('ziel_feuerstelle', (fx, fy, fz), quest='feuerstelle')
