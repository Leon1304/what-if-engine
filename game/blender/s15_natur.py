# Section 15 – nature detail in both maps (runs after everything else, own random streams → the forest of s06 stays exactly the same,
# so felled trees in old save games still match):
#   valley: flower meadows (4 kinds), tall grass, leaf litter under broadleaf trees, needle litter under spruces, moss cushions, pebbles,
#           fallen trees with root plates, ant hills, bracket fungi on stumps, moss on logs, reeds along the creek, trail markers, benches
#   mountains: gentian, edelweiss, alpine rose, dwarf pines (Latschen), scree, snow patches, cairns along the paths, a wayside cross
# Everything small is a template (z −500) + linked copies → instanced in the game, one draw per kind and map. Nothing is placed on roads,
# paths, in buildings (bounding boxes of every built object) or at the quest places.
COLL = '15 Natur'

def build(c):
    g6 = dict(globals()); p6 = os.path.join(GAME, 'blender', 's06_forest.py'); exec(compile(open(p6).read(), p6, 'exec'), g6); tree_ok = g6['tree_ok']
    tmp = coll('_Vorlagen_Natur', c)
    def T(name, parts, **kw):
        o = multi(name, parts, tmp, **kw); o.location = (0, 0, -500); return o

    # ---------------- footprints of everything built (2D boxes, hashed in 8 m cells) – no flower grows through a floor
    skip_coll = {'Bäume', 'Unterholz', '_Vorlagen', '_Vorlagen_Natur', COLL}
    cells = {}
    for o in bpy.data.objects:
        if o.type != 'MESH' or o.location.z < -400 or any(cl.name in skip_coll for cl in o.users_collection): continue
        ws = [o.matrix_world @ Vector(v) for v in o.bound_box]; xs = [v.x for v in ws]; ys = [v.y for v in ws]
        x0, x1, y0, y1 = min(xs) - .4, max(xs) + .4, min(ys) - .4, max(ys) + .4
        if (x1 - x0) * (y1 - y0) > 900 or max(v.z for v in ws) - min(v.z for v in ws) < .02: continue     # terrain, road, water surfaces
        for cx in range(int(x0 // 8), int(x1 // 8) + 1):
            for cy in range(int(y0 // 8), int(y1 // 8) + 1): cells.setdefault((cx, cy), []).append((x0, x1, y0, y1))
    def built(x, y, r=0.0):
        for (a, b, c_, d) in cells.get((int(x // 8), int(y // 8)), ()):
            if a - r < x < b + r and c_ - r < y < d + r: return True
        return False

    # ---------------- materials
    stem = lp('Bluete_Stiel', '#5e8a34', .9, var=.1)
    petals = {'weiss': lp('Bluete_Margerite', '#f3f1e8', .8, var=.05), 'gelb': lp('Bluete_Hahnenfuss', '#f0c430', .7, var=.06),
              'lila': lp('Bluete_Glocke', '#8a63c9', .7, var=.06), 'rot': lp('Bluete_Mohn', '#d8342a', .7, var=.06)}
    eye = lp('Bluete_gelb', '#e9c43a', .7); tall = lp('Grasbuesche', '#7f9c45', .9, var=.1); tall2 = lp('Gras_hoch', '#9aa957', .9, var=.1)
    litter = [lp('Laubstreu', '#8e5328', .95, var=.16), lp('Laubstreu_gelb', '#9c7c36', .95, var=.16)]; needles = lp('Nadelstreu', '#5e4630', .95, var=.1)
    moss = lp('Moospolster', '#5d7d33', .95, var=.1); pebble = lp('Kiesel', '#9a968c', .85, var=.12)
    bark = lp('Rinde', '#5a4030', .9, var=.08); wood_l = lp('Holz_hell', '#c9a273', .8); earth = lp('Wurzelerde', '#4a3626', 1.0, var=.1)
    ant = lp('Ameisenhaufen', '#6a4a2a', 1.0, var=.12); fungus = lp('Baumpilz', '#c8a46a', .8, var=.1); reed = lp('Schilf', '#8a9a4a', .9, var=.1)
    cattail = lp('Rohrkolben', '#5a3a22', .9, var=.05); mark_w = lp('Markierung_weiss', '#f1f0ea', .6); mark_r = lp('Markierung_rot', '#c42a26', .6)
    post = lp('Pfahl', '#7a6a50', .9, var=.08)

    # ---------------- templates
    def blob(r, seed, scale, at=(0, 0, 0)):
        """Jittered ico sphere squashed by scale (sx, sy, sz) and moved to at – cushions, patches, snow fields."""
        b_ = ico(r, sub=1, jit=.3, seed=seed); bmesh.ops.scale(b_, vec=scale, verts=b_.verts); return move(b_, at)
    def flower(col, n, h, seed, head='disc'):
        """Clump of n flowers, very low poly (3-sided stems as thin cones, 4/5-sided heads) + two leaves: ~12 triangles per flower."""
        R = random.Random(seed); P = []
        for i in range(n):
            a = R.uniform(0, 6.28); d = R.uniform(0, .22); x, y = d * math.cos(a), d * math.sin(a); hh = h * R.uniform(.7, 1.1)
            P.append((cone(.012, hh, at=(x, y, 0), seg=3), stem))
            if head == 'disc': P.append((cone(.07, .025, at=(x, y, hh - .02), seg=5, r2=.02), petals[col]))
            elif head == 'bell': P.append((cone(.045, .08, at=(x, y, hh - .09), seg=4, r2=.012), petals[col]))
            else: P.append((cone(.045, .05, at=(x, y, hh - .03), seg=4), petals[col]))
        for i in range(2): P.append((cone(.04, h * .45, at=(R.uniform(-.12, .12), R.uniform(-.12, .12), 0), seg=3), stem))
        return P
    FL = [T('Blumen_Margerite', flower('weiss', 7, .45, 1), collide=0), T('Blumen_Hahnenfuss', flower('gelb', 8, .4, 2, 'ball'), collide=0),
          T('Blumen_Glocke', flower('lila', 6, .42, 3, 'bell'), collide=0), T('Blumen_Mohn', flower('rot', 6, .55, 4), collide=0)]
    TG = []
    for k in range(2):
        R = random.Random(30 + k); tb = bmesh.new()
        for i in range(9): tb = merge(tb, rotz(move(cone(.055, R.uniform(.65, 1.1), seg=3), (R.uniform(-.25, .25), R.uniform(-.25, .25), 0)), R.uniform(0, 6)))
        TG.append(T(f'Gras_hoch_{k}', [(tb, (tall, tall2)[k])], collide=0))
    def patch(r, seed, mat, n=3):
        """Flat ragged ground patch: a few overlapping jittered 7-gons (leaf / needle litter)."""
        P = []; R = random.Random(seed)
        for i in range(n):
            pc = cyl(r * R.uniform(.55, .9), .025, at=(R.uniform(-r * .5, r * .5), R.uniform(-r * .5, r * .5), .0 + i * .006), seg=7); jitter(pc, r * .14, seed=seed + i, scale_z=.3)
            P.append((pc, mat))
        return P
    LT = [T(f'Laubstreu_{k}', patch(1.1, 40 + k, litter[k]), collide=0) for k in range(2)]
    NT = T('Nadelstreu', patch(1.3, 50, needles, 4), collide=0)
    MS = T('Moospolster', [(cyl(.45, .1, at=(0, 0, 0), seg=7, r2=.3), moss), (cyl(.3, .12, at=(.4, .2, 0), seg=6, r2=.18), moss)], collide=0)
    Rp = random.Random(70)
    PB = T('Kiesel', [(cone(Rp.uniform(.06, .13), Rp.uniform(.05, .1), at=(Rp.uniform(-.4, .4), Rp.uniform(-.4, .4), 0), seg=5, jit=.2, seed=70 + i), pebble) for i in range(7)], collide=0)
    # fallen tree with root plate (collides)
    FT = []
    for k in range(2):
        L = 7 + 2 * k; P = [(cyl(.3, L, at=(0, 0, .3), seg=7, r2=.16, axis='X'), bark), (move(cyl(.29, .02, seg=7, axis='X'), (L, 0, .3)), wood_l)]
        rp = cyl(1.3, .45, at=(0, 0, 0), seg=9, axis='X'); jitter(rp, .18, seed=80 + k); move(rp, (-.42, 0, .9)); P.append((rp, earth))
        R = random.Random(90 + k)
        for i in range(8):
            a = 6.28 * i / 8; rt = cyl(.07, 1.0, seg=4, r2=.02, axis='X'); bmesh.ops.rotate(rt, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi, 3, 'Z'), verts=rt.verts)
            bmesh.ops.rotate(rt, cent=(0, 0, 0), matrix=Matrix.Rotation(a, 3, 'X'), verts=rt.verts); P.append((move(rt, (-.5, math.cos(a) * 1.0, .9 + math.sin(a) * 1.0)), bark))
        for i in range(3): P.append((ico(.2, at=(R.uniform(1.5, L - 1), R.uniform(-.1, .1), .58), sub=1, jit=.3, seed=95 + i, sz=.4), moss))
        P.append((move(cyl(.04, 1.4, seg=4, axis='Y'), (L * .6, -.7, .4)), bark))
        FT.append(T(f'Baum_umgestuerzt_{k}', P))
    AH = T('Ameisenhaufen', [(cone(.75, .7, seg=9, jit=.12, seed=100, r2=.12), ant), (ico(.18, at=(0, 0, .62), sub=1, jit=.3, seed=101), ant)], collide_r=.6, nochop=1)
    RD = []
    for k in range(2):
        R = random.Random(110 + k); P = []
        for i in range(14):
            x, y = R.uniform(-.35, .35), R.uniform(-.35, .35); h = R.uniform(1.0, 1.7)
            bl = cone(.025, h, seg=3); bmesh.ops.rotate(bl, cent=(0, 0, 0), matrix=Matrix.Rotation(R.uniform(-.15, .15), 3, 'X'), verts=bl.verts); P.append((move(bl, (x, y, 0)), reed))
        for i in range(4):
            x, y = R.uniform(-.25, .25), R.uniform(-.25, .25); h = R.uniform(1.2, 1.6)
            P += [(cyl(.01, h, at=(x, y, 0), seg=3), reed), (cyl(.035, .22, at=(x, y, h - .1), seg=6), cattail)]
        RD.append(T(f'Schilf_{k}', P, collide=0))
    MK = T('Wegmarke', [(cyl(.06, 1.3, seg=6), post), (cyl(.065, .12, at=(0, 0, 1.0), seg=6), mark_w), (cyl(.065, .1, at=(0, 0, 1.12), seg=6), mark_r), (cone(.07, .08, at=(0, 0, 1.3), seg=6), post)], collide=0)

    # ---------------- valley: where may it grow?
    def ok_v(x, y, r=0.0, road=4.8):
        if not (MAP_X0 - 20 < x < MAP_X1 - 2 and MAP_Y0 + 2 < y < MAP_Y1 - 2): return False
        if abs(x - road_x(y)) < road or abs(x - creek_x(y)) < 2.6 or trail_dist(x, y) < 1.1 + r: return False
        if math.hypot(x - LAKE[0], y - LAKE[1]) < LAKE_R + 4.5 or math.hypot(x - ISLAND[0], y - ISLAND[1]) < 6: return False
        if -4 < x < 49 and -27 < y < 29: return False                                   # station plot
        if abs(x + 63.6) < 7.5 and 145 < y < 222: return False                          # village street with pavements
        for cx_, cy_, rr in ((*HOCHSITZ, 3), (*FEUERSTELLE, 4), (*CAMP, 8), (*TOWER, 6), (*RUIN, 11), (*QUARRY, 16), (*FORSTHAUS, 6), (*FUNKTURM, 6)):
            if math.hypot(x - cx_, y - cy_) < rr + r: return False
        for sx, sy, _ in SACKS:
            if math.hypot(x - sx, y - sy) < 1.5 + r: return False
        return not built(x, y, r)
    trees = [(o.location.x, o.location.y, o.get('tree'), o.scale.x) for o in (bpy.data.collections.get('Bäume').objects if bpy.data.collections.get('Bäume') else []) if o.location.y < 600]
    tgrid = {}
    for t in trees: tgrid.setdefault((int(t[0] // 10), int(t[1] // 10)), []).append(t)
    def open_sky(x, y, r=3.5):                                                         # meadow = no tree trunk within r
        for cx in (int(x // 10) - 1, int(x // 10), int(x // 10) + 1):
            for cy in (int(y // 10) - 1, int(y // 10), int(y // 10) + 1):
                for tx, ty, *_ in tgrid.get((cx, cy), ()):
                    if math.hypot(x - tx, y - ty) < r: return False
        return True
    nat = coll('Natur_Tal', c); R = random.Random(1515); k = 0
    # flower meadows: drifts of one kind (clusters), on open ground
    for d in range(800):
        x, y = R.uniform(MAP_X0 - 15, MAP_X1 - 4), R.uniform(MAP_Y0 + 4, MAP_Y1 - 4)
        if not open_sky(x, y, 2.5) or not ok_v(x, y, .3): continue
        src = R.choice(FL)
        for i in range(R.randint(5, 11)):
            px, py = x + R.gauss(0, 1.6), y + R.gauss(0, 1.6)
            if not ok_v(px, py, .2): continue
            inst(R.choice([src, src, src, R.choice(FL)]), f'Blumen_{k}', (px, py, terrain_h(px, py) - .03), R.uniform(0, 6.28), R.uniform(1.0, 1.5), c=nat); k += 1
    # tall grass along verges and forest edges
    for i in range(5000):
        x, y = R.uniform(MAP_X0 - 15, MAP_X1 - 4), R.uniform(MAP_Y0 + 4, MAP_Y1 - 4)
        if not ok_v(x, y, .3, road=5.2) or not open_sky(x, y, 1.5): continue
        inst(R.choice(TG), f'Gras_hoch_{k}', (x, y, terrain_h(x, y) - .05), R.uniform(0, 6.28), R.uniform(.75, 1.2), c=nat); k += 1
    # litter under trees, moss + pebbles on the forest floor
    for tx, ty, kind, s in trees * 2:
        if R.random() > .7: continue
        a = R.uniform(0, 6.28); d = R.uniform(.6, 2.6); x, y = tx + d * math.cos(a), ty + d * math.sin(a)
        if not ok_v(x, y, .5): continue
        src = R.choice(LT) if kind in ('Laubbaum', 'Birke') else NT if kind in ('Fichte', 'Kiefer') else MS
        inst(src, f'{src.name}_{k}', (x, y, terrain_h(x, y) - .01), R.uniform(0, 6.28), R.uniform(.8, 1.3) * s, c=nat); k += 1
    for i in range(2200):
        x, y = R.uniform(MAP_X0 - 15, MAP_X1 - 4), R.uniform(MAP_Y0 + 4, MAP_Y1 - 4)
        if open_sky(x, y, 3.0) or not ok_v(x, y, .4): continue
        src = MS if R.random() < .6 else PB
        inst(src, f'{src.name}_{k}', (x, y, terrain_h(x, y) - .02), R.uniform(0, 6.28), R.uniform(.8, 1.4), c=nat); k += 1
    # fallen trees, ant hills (in the forest, away from paths)
    n_ft = n_ah = 0
    for i in range(2000):
        if n_ft >= 14 and n_ah >= 12: break
        x, y = R.uniform(MAP_X0 + 4, MAP_X1 - 4), R.uniform(MAP_Y0 + 4, MAP_Y1 - 4)
        if abs(x - road_x(y)) < 18 or not tree_ok(x, y, 0) or open_sky(x, y, 4.0): continue
        if n_ft < 14:
            rz = R.uniform(0, 6.28); L = 10.0; ex, ey = x + math.cos(rz) * L, y + math.sin(rz) * L
            if all(ok_v(x + math.cos(rz) * t, y + math.sin(rz) * t, 1.6) and tree_ok(x + math.cos(rz) * t, y + math.sin(rz) * t, 1.0) for t in (-1.5, 0, 3, 6, 9.5)):
                inst(R.choice(FT), f'Baum_umgestuerzt_{n_ft}', (x, y, min(terrain_h(x, y), terrain_h(ex, ey)) - .12), rz, 1.0, c=nat); n_ft += 1; continue
        if n_ah < 12 and ok_v(x, y, 1.8) and tree_ok(x, y, 1.0):
            inst(AH, f'Ameisenhaufen_{n_ah}', (x, y, terrain_h(x, y) - .1), R.uniform(0, 6.28), R.uniform(.8, 1.2), c=nat); n_ah += 1
    # bracket fungi on stumps, moss on lying logs (one merged object)
    F = []
    for o in (bpy.data.collections.get('Unterholz').objects if bpy.data.collections.get('Unterholz') else []):
        if o.name.startswith('Baumstumpf') and R.random() < .6:
            s = o.scale.x
            for j in range(R.randint(2, 3)):
                a = R.uniform(0, 6.28); bf = cyl(.13, .04, seg=7); bmesh.ops.scale(bf, vec=(1, .6, 1), verts=bf.verts); rotz(bf, a + math.pi / 2)
                F.append((move(bf, (o.location.x + math.cos(a) * .3 * s, o.location.y + math.sin(a) * .3 * s, o.location.z + (.12 + .1 * j) * s)), fungus))
        elif o.name.startswith('Baumstamm'):
            for j in range(3):
                t = R.uniform(-2, 2); a = o.rotation_euler.z
                F.append((ico(.22, at=(o.location.x + math.cos(a) * t, o.location.y + math.sin(a) * t, o.location.z + .58), sub=1, jit=.3, seed=k + j, sz=.35), moss))
    if F: multi('Baumpilze_Moos', F, nat, collide=0)
    # reeds where the creek is slow (both banks), trail markers every ~40 m
    for i in range(240):
        y = R.uniform(MAP_Y0 + 3, MAP_Y1 - 3); sd = R.choice((-1, 1)); x = creek_x(y) + sd * R.uniform(1.9, 2.6)
        if abs(x - road_x(y)) < 9 or built(x, y, .3) or 10 < y < 16: continue
        inst(R.choice(RD), f'Schilf_{k}', (x, y, terrain_h(x, y) - .15), R.uniform(0, 6.28), R.uniform(.8, 1.2), c=nat); k += 1
    m = 0
    for pts in trail_pts():
        acc = 20.0
        for (ax, ay), (bx, by) in zip(pts, pts[1:]):
            L = math.hypot(bx - ax, by - ay); t = acc
            while t < L:
                px, py = ax + (bx - ax) * t / L, ay + (by - ay) * t / L; nx, ny = -(by - ay) / L, (bx - ax) / L
                qx, qy = px + nx * 1.5, py + ny * 1.5
                if ok_v(qx, qy, .2) or (trail_dist(qx, qy) >= 1.3 and not built(qx, qy, .3) and abs(qx - road_x(qy)) > 6):
                    inst(MK, f'Wegmarke_{m}', (qx, qy, terrain_h(qx, qy) - .05), math.atan2(ny, nx), 1.0, c=nat); m += 1
                t += 40.0
            acc = t - L
    # benches at three views: lake shore, below the ruin, on the tower hill
    B = []
    for bx, by, rz in ((LAKE[0] + 22.5, LAKE[1] - 6.5, math.pi / 2), (RUIN[0] + 13.5, RUIN[1] - 6.0, -math.pi / 2), (TOWER[0] - 6.0, TOWER[1] - 6.5, math.pi * .75)):
        if not built(bx, by, .8) and trail_dist(bx, by) > 1.3: B += d_bench(bx, by, rz)
    if B: multi('Baenke_Aussicht', B, nat)

    # ---------------- mountains
    alp_b = lp('Enzian', '#2a4fc9', .6, var=.06); alp_w = lp('Edelweiss', '#eceae0', .8, var=.04); alp_r = lp('Alpenrose', '#d0457a', .7, var=.06)
    latsche = lp('Latsche', '#2f4a2c', .9, var=.08); snow = lp('Altschnee', '#eef2f4', .6, var=.03); scree = lp('Geroell_hell', '#9a968e', .9, var=.1)
    ENZ = T('Enzian', [(cyl(.006, .08, at=(x, y, 0), seg=3), stem) for x, y in ((0, 0), (.08, .05), (-.06, .07))] + [(cyl(.035, .07, at=(x, y, .06), seg=5, r2=.018), alp_b) for x, y in ((0, 0), (.08, .05), (-.06, .07))], collide=0)
    EDW = T('Edelweiss', [(cyl(.008, .12, at=(x, y, 0), seg=3), lp('Edelweiss_Stiel', '#a9b39a', .9)) for x, y in ((0, 0), (.07, -.04))] + [(cyl(.04, .01, at=(x, y, .12), seg=5), alp_w) for x, y in ((0, 0), (.07, -.04))], collide=0)
    ARO = T('Alpenrose', [(ico(.35, at=(0, 0, .2), sub=1, jit=.3, seed=130, sz=.6), lp('Alpenrose_Blatt', '#3e5a30', .9, var=.08))] + [(ico(.05, at=(.25 * math.cos(a), .25 * math.sin(a), .33), sub=1), alp_r) for a in (0, 1.3, 2.6, 3.9, 5.2)], collide=0)
    LAT = [T(f'Latsche_{k}', [(ico(.9 + .3 * k, at=(0, 0, .35), sub=1, jit=.3, seed=140 + k, sz=.45), latsche), (ico(.7, at=(.7, .3, .3), sub=1, jit=.3, seed=150 + k, sz=.45), latsche),
                               (cyl(.06, .9, at=(-.4, 0, .15), seg=4, axis='X'), bark)], collide=0) for k in range(2)]
    SN = T('Schneefeld', [(blob(2.2, 160, (1, .65, .06), (0, 0, .05)), snow), (blob(1.4, 161, (1, .8, .06), (1.6, .8, .05)), snow)], collide=0)
    Rs = random.Random(170)
    SC = T('Geroell', [(ico(Rs.uniform(.12, .3), at=(Rs.uniform(-1, 1), Rs.uniform(-.8, .8), .05), sub=1, jit=.3, seed=170 + i), scree) for i in range(14)], collide=0)
    CA = T('Steinmann', [(ico(.32 - .05 * i, at=(0, 0, .15 + .36 * i - .02 * i * i), sub=1, jit=.25, seed=180 + i, sz=.6), lp('Fels', '#8a8780', .9, var=.1)) for i in range(5)], collide_r=.35, nochop=1)
    Zb = berg_h
    def ok_b(x, y, r=0.0):
        if not (BERG_X0 + 4 < x < BERG_X1 - 4 and BERG_Y0 + 6 < y < BERG_Y1 - 4): return False
        if _near_poly(x, y, BERG_ROAD_S)[0] < 5.5 + r or berg_trail_dist(x, y) < 1.3 + r: return False
        for (cx_, cy_), rr in ((BERGHUETTE, 12), (BERGSEE, 12.5), ((STOLLEN[0] - 6, STOLLEN[2]), 9), (GIPFEL, 4), (HEUSTADEL, 6)):
            if math.hypot(x - cx_, y - cy_) < rr + r: return False
        if STOLLEN[0] - 9 < x < STOLLEN[1] + 3 and abs(y - STOLLEN[2]) < 5: return False
        for sx, sy, _ in SACKS_BERG:
            if math.hypot(x - sx, y - sy) < 1.6 + r: return False
        return not built(x, y, r)
    def slope(x, y): return math.hypot(Zb(x + 1, y) - Zb(x - 1, y), Zb(x, y + 1) - Zb(x, y - 1)) / 2
    bn = coll('Natur_Berg', c); R = random.Random(1616)
    for d in range(700):                                                  # alpine flower drifts on the meadows
        x, y = R.uniform(BERG_X0 + 6, BERG_X1 - 6), R.uniform(BERG_Y0 + 10, BERG_Y1 - 6); z = Zb(x, y)
        if z < 28 or z > 60 or slope(x, y) > .55 or not ok_b(x, y, .3): continue
        src = R.choice([ENZ, ENZ, EDW, ARO] if z > 40 else [ENZ, ARO, ARO, R.choice(FL)])
        for i in range(R.randint(3, 8)):
            px, py = x + R.gauss(0, 1.4), y + R.gauss(0, 1.4)
            if ok_b(px, py, .2) and slope(px, py) < .6: inst(src, f'Alpenblume_{k}', (px, py, Zb(px, py) - .03), R.uniform(0, 6.28), R.uniform(1.2, 1.8), c=bn); k += 1
    for i in range(2200):                                                 # dwarf pines above the tree line, scree at the foot of the walls, old snow up high
        x, y = R.uniform(BERG_X0 + 5, BERG_X1 - 5), R.uniform(BERG_Y0 + 8, BERG_Y1 - 5); z = Zb(x, y); sl = slope(x, y)
        if not ok_b(x, y, .8): continue
        if 36 < z < 58 and sl < .7 and R.random() < .55: inst(R.choice(LAT), f'Latsche_{k}', (x, y, z - .1), R.uniform(0, 6.28), R.uniform(.8, 1.4), c=bn)
        elif 40 < z < 80 and .45 < sl < 1.1: inst(SC, f'Geroell_{k}', (x, y, z - .05), R.uniform(0, 6.28), R.uniform(.8, 1.5), c=bn)
        elif z > 58 and sl < .8 and R.random() < .5: inst(SN, f'Schneefeld_{k}', (x, y, z - .08), R.uniform(0, 6.28), R.uniform(.7, 1.6), c=bn)
        else: continue
        k += 1
    m = 0
    for pts in berg_trail():                                              # cairns along the paths
        for (ax, ay), (bx, by) in zip(pts, pts[1:]):
            L = math.hypot(bx - ax, by - ay); nx, ny = -(by - ay) / L, (bx - ax) / L; px, py = (ax + bx) / 2 + nx * 1.6, (ay + by) / 2 + ny * 1.6
            if not built(px, py, .4) and berg_trail_dist(px, py) > 1.3: inst(CA, f'Steinmann_{m}', (px, py, Zb(px, py) - .08), R.uniform(0, 6.28), R.uniform(.8, 1.1), c=bn); m += 1
    # wayside cross at the first hairpin (wooden cross with a little roof, flowers, a bench)
    (ax, ay), (bx, by) = BERG_ROAD[2], BERG_ROAD[3]; L = math.hypot(bx - ax, by - ay); wx, wy = (ax + bx) / 2 - (by - ay) / L * 8.0, (ay + by) / 2 + (bx - ax) / L * 8.0
    if not built(wx, wy, 1):
        wz = Zb(wx, wy); wd = lp('Holz_dunkel', '#6b4630', .7, var=.05)
        X = [(box(.14, .14, 2.6, at=(wx, wy, wz - .1)), wd), (box(1.0, .12, .12, at=(wx, wy, wz + 1.9)), wd), (box(.06, .08, .5, at=(wx, wy - .09, wz + 1.6)), lp('Gold', '#d4a83a', .3, .8)),
             (box(.04, .5, .06, at=(wx, wy - .09, wz + 1.95), rz=math.pi / 2), lp('Gold', '#d4a83a', .3, .8))]
        for s_ in (-1, 1):
            rf = box(.7, .5, .04, at=(0, 0, 0)); bmesh.ops.rotate(rf, cent=(0, 0, 0), matrix=Matrix.Rotation(s_ * .6, 3, 'Y'), verts=rf.verts); X.append((move(rf, (wx + s_ * .26, wy, wz + 2.55)), lp('Schindel', '#4a3a2c', .9, var=.1)))
        X += [(box(.6, .3, .2, at=(wx, wy - .3, wz - .05)), lp('Fels', '#8a8780', .9, var=.1)), (ico(.12, at=(wx - .15, wy - .35, wz + .2), sub=1), alp_r), (ico(.1, at=(wx + .15, wy - .35, wz + .2), sub=1), alp_w)]
        multi('Wegkreuz', X, bn)
