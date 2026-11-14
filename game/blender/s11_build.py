# Section 11 – building blueprints (bp_*), plants, felled-tree parts and weapons.
# bp_* objects are templates: built around their own origin (ground centre), exported at z −200 and cloned by the game
# (game/js/build.js): log cabin in four stages (foundation, walls, roof, fireplace) + door leaf (hinge = its origin, prop hinge = local
# position), lean-to, fire pit, bed, storage chest, rain barrel, fence, field bed, crops in three growth stages, tree stump, felled log.
# Weapons: first-person models bp_w_* (pointing +y, grip at the origin) and the same models as pickups in the world
# (hunting rifle in the Hochsitz, shotgun in the barn, knife in the kitchen of Haus 3, pistol in the Tankstelle office locker).
COLL = '11 Baupläne & Waffen'
BPZ = -200.0

def solid(pts, vec):
    bm = bmesh.new(); f = bm.faces.new([bm.verts.new(p) for p in pts])
    ex = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, vec=vec, verts=[v for v in ex['geom'] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return bm

def beam(p0, p1, r=.03, seg=5):
    d = Vector(p1) - Vector(p0); bm = cyl(r, d.length, seg=seg)
    bmesh.ops.transform(bm, matrix=d.normalized().to_track_quat('Z', 'Y').to_matrix().to_4x4(), verts=bm.verts); return move(bm, p0)

def build(c):
    R = random.Random(1111)
    log = lp('Blockholz', '#8a6240', .9, var=.1); log_end = lp('Holz_hell', '#c9a273', .8, var=.06); plank = lp('Bretter', '#a07850', .85, var=.08)
    plank_d = lp('Bretter_d', '#7a5638', .85, var=.08); stone = lp('Feldstein', '#8f8b84', .95, var=.12); stone_d = lp('Feldstein_d', '#6f6b64', .95, var=.12)
    shingle = lp('Holzschindeln', '#6a4e36', .9, var=.1); soot = lp('Russ', '#2a2522', .95, var=.05); ash = lp('Asche', '#3b3836', .95)
    steel = lp('Stahl', '#9da2a6', .35, .8, var=.04); gun = lp('Waffenstahl', '#2b2e31', .35, .7, var=.03); gun_l = lp('Waffenstahl_hell', '#4a4f54', .35, .7, var=.03)
    stock = lp('Schaftholz', '#7a4a2a', .6, var=.05); straw = lp('Stroh', '#d8b863', .95, var=.1); wool = lp('Wolldecke', '#8a3b32', .95, var=.06)
    leaf = lp('Blattwerk', '#5f8a36', .9, var=.1); leaf_d = lp('Blattwerk_d', '#46702c', .9, var=.1); soil = lp('Beeterde', '#4a3324', 1.0, var=.08)
    flower = lp('Bluete_weiss', '#f1efe6', .8); carrot = lp('Karotte', '#e8792b', .7); pumpkin = lp('Kuerbis', '#e08a2a', .7, var=.06); bark = lp('Rinde', '#5a4030', .9, var=.08)
    tmp = coll('_Baupläne', c)

    def bp(name, parts, **props):
        o = multi('bp_' + name, parts, tmp, **props); o.location = (0, 0, BPZ); return o

    # ------------------------------------------------------------ log cabin 4.6 × 4.0 m, floor .45, walls to 2.85, door front (−y) left, windows front right + east
    X, Y, FH, WT = 2.3, 2.0, .45, 2.85
    P = []
    for px in (-X + .25, 0, X - .25):
        for py in (-Y + .25, Y - .25): P.append((box(.5, .5, 1.45, at=(px, py, -1.2), bevel_w=.04), stone))
    P += [(cyl(.14, 2 * X, at=(-X, sy * (Y - .13), .16), seg=7, axis='X'), log) for sy in (-1, 1)] + [(cyl(.14, 2 * Y, at=(sx * (X - .13), -Y, .16), seg=7, axis='Y'), log) for sx in (-1, 1)]
    for i in range(16): P.append((box(.285, 2 * Y - .1, .06, at=(-X + .15 + .286 * i + .14, 0, FH - .06)), plank if i % 2 else plank_d))
    P.append((box(1.0, .6, .22, at=(-.83, -Y - .3, 0)), plank_d))
    bp('huette_1', P, label='Fundament')
    # walls: stacked logs, openings cut out
    DOOR = (-1.3, -.35, FH, FH + 2.0); WIN_F = (.6, 1.4, 1.3, 2.1); WIN_E = (-.5, .5, 1.3, 2.1); r = .125
    def cabin_walls(east_door):
        P = []; n = int((WT - FH) / (2 * r)); WE = (-.5, .5, FH, FH + 2.0) if east_door else WIN_E
        for i in range(n):
            zc = FH + r + 2 * r * i
            for sy in (-1, 1):                         # front / back walls along x (logs stick out .15 at the corners)
                segs = [(-X - .15, X + .15)]
                if sy < 0:
                    cut = []
                    if DOOR[2] <= zc <= DOOR[3]: cut.append((DOOR[0], DOOR[1]))
                    if WIN_F[2] <= zc <= WIN_F[3]: cut.append((WIN_F[0], WIN_F[1]))
                    segs = []; cur = -X - .15
                    for a, b in sorted(cut): segs.append((cur, a)); cur = b
                    segs.append((cur, X + .15))
                for a, b in segs:
                    if b - a > .05: P.append((cyl(r, b - a, at=(a, sy * (Y - r), zc), seg=7, axis='X'), log)); P.append((cyl(r * .85, .02, at=(a - .01, sy * (Y - r), zc), seg=7, axis='X'), log_end))
            for sx in (-1, 1):
                segs = [(-Y + 2 * r, Y - 2 * r)]
                if sx > 0 and WE[2] <= zc <= WE[3]: segs = [(-Y + 2 * r, WE[0]), (WE[1], Y - 2 * r)]
                for a, b in segs: P.append((cyl(r, b - a, at=(sx * (X - r), a, zc), seg=7, axis='Y'), log))
        P += [(box(.08, .3, 2.0, at=(DOOR[0] - .04, -Y + r, FH)), plank_d), (box(.08, .3, 2.0, at=(DOOR[1] + .04, -Y + r, FH)), plank_d), (box(1.05, .3, .1, at=((DOOR[0] + DOOR[1]) / 2, -Y + r, DOOR[3])), plank_d)]
        for (a, b, zb, zt) in (WIN_F,):
            P += [(box(b - a + .1, .3, .08, at=((a + b) / 2, -Y + r, zb - .08)), plank_d), (box(b - a + .1, .3, .08, at=((a + b) / 2, -Y + r, zt)), plank_d),
                  (box(b - a - .04, .02, zt - zb, at=((a + b) / 2, -Y + r, zb)), glass('Glas_Huette', '#bcd3dc', .3))]
        if east_door: P += [(box(.3, .08, 2.0, at=(X - r, WE[0] - .04, FH)), plank_d), (box(.3, .08, 2.0, at=(X - r, WE[1] + .04, FH)), plank_d), (box(.3, 1.1, .1, at=(X - r, 0, WE[3])), plank_d)]
        else: P += [(box(.3, WIN_E[1] - WIN_E[0] + .1, .08, at=(X - r, 0, WIN_E[2] - .08)), plank_d), (box(.3, WIN_E[1] - WIN_E[0] + .1, .08, at=(X - r, 0, WIN_E[3])), plank_d),
              (box(.02, WIN_E[1] - WIN_E[0] - .04, WIN_E[3] - WIN_E[2], at=(X - r, 0, WIN_E[2])), glass('Glas_Huette', '#bcd3dc', .3))]
        return P
    bp('huette_2', cabin_walls(False), label='Wände'); bp('huette_2t', cabin_walls(True), label='Wände')
    # roof (ridge along x), gables of planks
    P = []; ov = .45; half = Y + ov; pitch = math.radians(35); rh = half * math.tan(pitch); zr = WT - ov * math.tan(pitch)
    for s in (-1, 1):
        for i in range(8):                    # shingle rows
            t0, t1 = i / 8, (i + 1.15) / 8
            y0, y1 = s * half * (1 - t0), s * half * (1 - min(1, t1)); z0_, z1_ = zr + rh * t0, zr + rh * min(1, t1)
            P.append((solid([(-X - ov, y0, z0_), (X + ov, y0, z0_), (X + ov, y1, z1_), (-X - ov, y1, z1_)], (0, 0, .07)), shingle if i % 2 else plank_d))
    for sx in (-1, 1):
        P.append((solid([(sx * (X - .02), -Y, WT), (sx * (X - .02), Y, WT), (sx * (X - .02), 0, WT + Y * math.tan(pitch))], (-sx * .08, 0, 0)), plank))
    P.append((box(2 * X + 2 * ov, .22, .22, at=(0, 0, WT + Y * math.tan(pitch) - .02)), log))
    bp('huette_3', P, label='Dach')
    # fireplace in the back-left corner + chimney through the roof
    P = []; fx, fy = -1.45, Y - .52
    P += [(box(1.25, .7, .55, at=(fx, fy, FH), bevel_w=.03), stone), (box(1.25, .2, 1.0, at=(fx, fy + .25, FH + .55)), stone_d), (box(.22, .5, .6, at=(fx - .51, fy - .1, FH + .55)), stone),
          (box(.22, .5, .6, at=(fx + .51, fy - .1, FH + .55)), stone), (box(1.35, .62, .1, at=(fx, fy - .02, FH + 1.15)), plank_d), (box(1.0, .55, .7, at=(fx, fy + .05, FH + 1.25)), stone),
          (box(.62, .5, WT + 2.3 - FH - 1.95, at=(fx, fy + .1, FH + 1.95)), stone_d), (box(.72, .6, .1, at=(fx, fy + .1, WT + 2.3)), stone), (box(.8, .4, .02, at=(fx, fy - .1, FH + .555)), soot),
          (box(.8, .03, .6, at=(fx, fy + .14, FH + .56)), soot)]
    for i in range(6): P.append((ico(.09, at=(fx - .5 + .2 * i, fy - .42, FH + .55), sub=1, jit=.3, seed=50 + i, sz=.7), stone_d))
    bp('huette_4', P, label='Kamin', fire=[fx, fy - .08, FH + .58])
    P = []
    for i in range(5): P.append((box(.18, .05, 1.98, at=(.1 + .19 * i, 0, 0)), plank if i % 2 else plank_d))
    P += [(box(.9, .06, .12, at=(.48, -.035, .3)), plank_d), (box(.9, .06, .12, at=(.48, -.035, 1.6)), plank_d), (beam((.1, -.04, .4), (.86, -.04, 1.55), .04), plank_d),
          (box(.04, .1, .04, at=(.82, -.06, .95)), steel)]
    bp('huette_tuer', P, hinge=[DOOR[0] + .02, -Y + r, FH], label='Hüttentür')

    # ---------------- cabin extensions (level 3 / 5 / 7): side room east, veranda in front, open workshop west
    X2 = 6.1; P = []
    for px in (X + .4, (X + X2) / 2, X2 - .25):
        for py in (-Y + .25, Y - .25): P.append((box(.5, .5, 1.45, at=(px, py, -1.2), bevel_w=.04), stone))
    for i in range(13): P.append((box(.285, 2 * Y - .1, .06, at=(X + .1 + .286 * i + .14, 0, FH - .06)), plank if i % 2 else plank_d))
    WS = (3.6, 4.4, 1.3, 2.1)
    for i in range(int((WT - FH) / (2 * r))):
        zc = FH + r + 2 * r * i
        for sy in (-1, 1):
            segs = [(X + .15, X2 + .15)]
            if sy < 0 and WS[2] <= zc <= WS[3]: segs = [(X + .15, WS[0]), (WS[1], X2 + .15)]
            for a_, b_ in segs: P.append((cyl(r, b_ - a_, at=(a_, sy * (Y - r), zc), seg=7, axis='X'), log)); P.append((cyl(r * .85, .02, at=(b_ - .01, sy * (Y - r), zc), seg=7, axis='X'), log_end))
        segs = [(-Y + 2 * r, Y - 2 * r)] if not (WIN_E[2] <= zc <= WIN_E[3]) else [(-Y + 2 * r, WIN_E[0]), (WIN_E[1], Y - 2 * r)]
        for a_, b_ in segs: P.append((cyl(r, b_ - a_, at=(X2 - r, a_, zc), seg=7, axis='Y'), log))
    P += [(box(WS[1] - WS[0] - .04, .02, WS[3] - WS[2], at=((WS[0] + WS[1]) / 2, -Y + r, WS[2])), glass('Glas_Huette', '#bcd3dc', .3)),
          (box(.02, .96, .8, at=(X2 - r, 0, WIN_E[2])), glass('Glas_Huette', '#bcd3dc', .3))]
    p30 = math.radians(30); rh2 = (Y + ov) * math.tan(p30); zr2 = WT - ov * math.tan(p30)
    for sy in (-1, 1): P.append((solid([(X, sy * (Y + ov), zr2), (X2 + ov, sy * (Y + ov), zr2), (X2 + ov, 0, zr2 + rh2), (X, 0, zr2 + rh2)], (0, 0, .08)), shingle))
    P.append((solid([(X2 - .02, -Y, WT), (X2 - .02, Y, WT), (X2 - .02, 0, WT + Y * math.tan(p30))], (-.08, 0, 0)), plank))
    bp('huette_x1', P, label='Anbau')
    P = []; VY0, VY1 = -Y, -Y - 2.2
    for i in range(int((X2 + X + .4) / .3)): P.append((box(.28, 2.2, .06, at=(-X - .2 + .15 + .3 * i, (VY0 + VY1) / 2, FH - .06)), plank if i % 2 else plank_d))
    for px in (-X - .1, -.1, 2.0, 4.1, X2 + .1):
        P += [(box(.16, .16, 1.65 + FH, at=(px, VY1 + .15, -1.2 + .0)), log), (box(.5, .5, 1.2, at=(px, VY1 + .15, -1.2)), stone)]
        P.append((box(.14, .14, 2.25 - FH, at=(px, VY1 + .15, FH)), log))
    P.append((solid([(-X - .4, VY0 - ov, zr - .02), (X2 + .4, VY0 - ov, zr - .02), (X2 + .4, VY1 - .3, 2.2), (-X - .4, VY1 - .3, 2.2)], (0, 0, .08)), shingle))
    P.append((box(2 * X + X2 - X + .8, .16, .16, at=((X2 - X) / 2, VY1 + .15, 2.12)), log))
    for (a_, b_) in ((-X - .1, -1.5), (-.1, X2 + .1)):
        P += [(box(b_ - a_, .08, .08, at=((a_ + b_) / 2, VY1 + .15, FH + .9)), plank_d), (box(b_ - a_, .06, .06, at=((a_ + b_) / 2, VY1 + .15, FH + .45)), plank_d)]
    P += [(box(1.1, .6, .15, at=(-.83, VY1 - .3, 0)), stone), (box(1.1, .3, .15, at=(-.83, VY1 - .15, .15)), stone)]
    P += [(box(1.5, .42, .05, at=(3.2, VY1 + .6, FH + .42)), plank), (box(1.5, .05, .4, at=(3.2, VY1 + .4, FH + .5)), plank_d)] + [(box(.07, .4, .42, at=(3.2 + s_ * .65, VY1 + .6, FH)), plank_d) for s_ in (-1, 1)]
    bp('huette_x2', P, label='Veranda')
    P = []; WX0 = -X - 3.3
    P.append((box(3.3, 2 * Y, .1, at=((WX0 - X) / 2, 0, 0)), plank_d))
    for py in (-Y + .1, Y - .1): P += [(box(.16, .16, 2.15, at=(WX0 + .1, py, 0)), log), (box(.5, .5, .6, at=(WX0 + .1, py, -.55)), stone)]
    P.append((solid([(-X + .02, -Y - .3, 2.7), (-X + .02, Y + .3, 2.7), (WX0 - .3, Y + .3, 2.1), (WX0 - .3, -Y - .3, 2.1)], (0, 0, .08)), shingle))
    P.append((box(.16, 2 * Y + .2, .16, at=(WX0 + .1, 0, 2.08)), log))
    P += [(box(.7, 1.8, .06, at=(WX0 + .5, .6, .9)), plank), (box(.6, .08, .8, at=(WX0 + .5, -.25, .1)), plank_d), (box(.6, .08, .8, at=(WX0 + .5, 1.45, .1)), plank_d),
          (box(.04, 1.8, 1.0, at=(-X - .1, .6, 1.2)), plank), (box(.12, .12, .14, at=(WX0 + .5, 1.3, .96)), steel), (cyl(.3, .5, at=(WX0 + 1.8, -1.2, .1), seg=8), log),
          (cyl(.29, .02, at=(WX0 + 1.8, -1.2, .6), seg=8), log_end)] + [(box(.03, .03, .3, at=(-X - .14, -.1 + .25 * i, 1.5)), steel) for i in range(6)]
    bp('huette_x3', P, label='Werkstatt')

    # ---------------- furniture
    bp('tisch', [(box(1.2, .8, .05, at=(0, 0, .72), bevel_w=.01), plank)] + [(box(.07, .07, .72, at=(sx * .52, sy * .32, 0)), plank_d) for sx in (-1, 1) for sy in (-1, 1)] +
       [(cyl(.18, .04, at=(sx * .3, sy * .7, .44), seg=8), plank) for sx in (-1, 1) for sy in (-1, 1)] + [(cyl(.03, .44, at=(sx * .3, sy * .7, 0), seg=5), plank_d) for sx in (-1, 1) for sy in (-1, 1)], label='Tisch')
    bp('regal', [(box(1.2, .45, .04, at=(0, 0, .05 + .43 * i)), plank) for i in range(5)] + [(box(.05, .45, 1.8, at=(sx * .58, 0, 0)), plank_d) for sx in (-1, 1)] +
       [(box(1.2, .02, 1.8, at=(0, .22, 0)), plank_d)] + [(box(.22, .3, .28, at=(-.35 + .35 * i, -.02, .48 + .43 * (i % 2)), bevel_w=.02), lp('Karton', '#b98b5a', .9, var=.08)) for i in range(3)], label='Regal')
    bp('teppich', [(box(1.6, 1.1, .02, at=(0, 0, .005), bevel_w=.01), lp('Fellteppich', '#8a6a4a', .95, var=.12)), (box(1.3, .8, .021, at=(0, 0, .006)), lp('Fellteppich_hell', '#a8865e', .95, var=.1))], label='Fellteppich')
    W_ = [(box(1.6, .7, .07, at=(0, 0, .86)), plank), (box(1.5, .06, .4, at=(0, .3, .2)), plank_d)] + [(box(.08, .08, .86, at=(sx * .72, sy * .28, 0)), log) for sx in (-1, 1) for sy in (-1, 1)]
    W_ += [(box(1.6, .04, .9, at=(0, .35, .93)), plank_d), (box(.14, .2, .1, at=(.6, -.2, .93)), steel), (box(.04, .26, .06, at=(.6, -.35, .98)), steel),
           (box(.5, .02, .12, at=(-.3, .32, 1.4)), steel), (box(.03, .25, .03, at=(.1, .32, 1.5)), plank), (box(.06, .06, .1, at=(.1, .3, 1.38)), steel)]
    bp('werkbank', W_, label='Werkbank')
    H_ = [(box(.9, .7, .8, at=(0, 0, 0), bevel_w=.03), stone), (box(1.0, .8, .08, at=(0, 0, .8)), lp('Herdplatte', '#2b2d30', .4, .5)), (box(.45, .02, .3, at=(0, -.36, .2)), lp('Ofentuer', '#232426', .4, .5)),
          (cyl(.08, 1.6, at=(.3, .25, .88), seg=8), lp('Ofenrohr', '#3a3c40', .5, .5)), (cyl(.16, .02, at=(-.2, -.1, .88), seg=8), lp('Herdplatte', '#2b2d30', .4, .5))]
    bp('herd', H_, label='Steinofen', fire=[0, -.15, .12])
    T_ = [(box(.08, .08, 1.6, at=(sx * .7, 0, 0)), log) for sx in (-1, 1)] + [(cyl(.03, 1.5, at=(-.75, 0, .9 + .3 * i), seg=5, axis='X'), log) for i in range(3)]
    T_ += [(box(.3, .3, .04, at=(sx * .7, 0, 0)), stone) for sx in (-1, 1)]
    bp('trockengestell', T_, label='Trockengestell')
    bp('trocken_fleisch', [(box(.08, .02, .3, at=(-.5 + .25 * i, 0, 1.4 - .3 * (i % 2) - .28)), lp('Trockenfleisch', '#7a2f22', .8, var=.1)) for i in range(5)])
    F_ = lambda: [(box(.7, .35, .02, at=(0, 0, 0)), plank_d), (box(.7, .02, .35, at=(0, -.17, 0)), plank_d), (box(.7, .02, .35, at=(0, .17, 0)), plank_d), (box(.02, .35, .35, at=(.34, 0, 0)), plank_d),
          (box(.7, .35, .02, at=(0, 0, .35)), plank)]
    bp('falle', F_() + [(box(.02, .35, .3, at=(-.34, 0, .35)), plank), (beam((-.3, 0, .02), (-.4, 0, .5), .015), log)], label='Kaninchenfalle')
    rab = [(ico(.12, at=(.05, 0, .13), sub=1, sz=.8), lp('Kaninchen', '#9a8a7a', .9)), (ico(.07, at=(-.1, 0, .2), sub=1), lp('Kaninchen', '#9a8a7a', .9)), (box(.03, .02, .1, at=(-.12, .03, .28)), lp('Kaninchen', '#9a8a7a', .9)),
           (box(.03, .02, .1, at=(-.12, -.03, .28)), lp('Kaninchen', '#9a8a7a', .9)), (ico(.035, at=(.17, 0, .14), sub=1), lp('Bluete_weiss', '#f1efe6', .8))]
    bp('falle_voll', F_() + [(box(.02, .35, .35, at=(-.34, 0, 0)), plank)] + rab, label='Kaninchenfalle')
    # ---------------- fences and gate (2 m segments along x)
    bp('palisade', [(cyl(.12, 2.0, at=(-.9 + .3 * i, 0, -.2), seg=6), log) for i in range(7)] + [(cone(.12, .3, at=(-.9 + .3 * i, 0, 1.8), seg=6), log) for i in range(7)] +
       [(box(2.0, .06, .12, at=(0, -.13, h_)), plank_d) for h_ in (.5, 1.4)], label='Palisade')
    bp('steinmauer', [(box(.48, .45, .3, at=(-.76 + .5 * i - (.25 if row % 2 else 0) + (.5 if row % 2 and i == 0 else 0), 0, .3 * row), bevel_w=.04), stone if (i + row) % 2 else stone_d) for row in range(3) for i in range(4)], label='Steinmauer')
    bp('gartentor', [(box(.14, .14, 1.4, at=(sx * .72, 0, -.15)), log) for sx in (-1, 1)] + [(cone(.1, .15, at=(sx * .72, 0, 1.25), seg=4), log) for sx in (-1, 1)], label='Gartentor')
    bp('gartentor_tuer', [(box(1.28, .05, .1, at=(.64, 0, h_)), plank) for h_ in (.25, .85)] + [(box(.1, .05, 1.0, at=(.06 + .29 * i, 0, .15)), plank_d) for i in range(5)] +
       [(beam((.1, 0, .3), (1.2, 0, .9), .025), plank_d)], hinge=[-.65, 0, 0], label='Gartentor')
    # ---------------- lights + modern gadgets
    iron = lp('Eisen', '#3a3c3e', .5, .6)
    bp('fackelhalter', [(cyl(.04, 1.5, at=(0, 0, -.1), seg=6), log), (cyl(.12, .18, at=(0, 0, 1.4), seg=6, r2=.16), iron), (cyl(.05, .15, at=(0, 0, 1.45), seg=5), lp('Holzkohle', '#1f1c1a', .9))], light=[0, 0, 1.75], label='Fackelhalter')
    bp('laterne', [(cyl(.05, 2.0, at=(0, 0, 0), seg=6), iron), (box(.4, .06, .06, at=(.18, 0, 1.95)), iron), (box(.2, .2, .28, at=(.33, 0, 1.6), bevel_w=.01), glass('Laternenglas', '#ffe6a8', .5)),
                   (cone(.16, .12, at=(.33, 0, 1.88), seg=4), iron), (box(.22, .22, .03, at=(.33, 0, 1.58)), iron)], light=[.33, 0, 1.72], label='Laterne')
    bp('solarlampe', [(cyl(.025, .55, at=(0, 0, -.05), seg=6), steel), (cyl(.07, .12, at=(0, 0, .45), seg=8), glass('Lampenglas_s', '#f0f2e8', .6)), (box(.16, .16, .02, at=(0, 0, .58)), lp('Solarzelle', '#203a6a', .2, .4))],
       light=[0, 0, .52], label='Solarlampe')
    bp('baustrahler', [(beam((sx * .35, sy * .3, 0), (0, 0, 1.4), .025), lp('Strahler_gelb', '#e0b020', .5, .2)) for sx, sy in ((-1, -1), (1, -1), (0, 1))] +
       [(box(.36, .14, .28, at=(0, -.05, 1.38)), lp('Strahler_gelb', '#e0b020', .5, .2)), (box(.32, .02, .24, at=(0, -.13, 1.4)), lp('Lampenglas', '#e6e2c8', .3))], light=[0, -.4, 1.5], label='Baustrahler')
    bp('bewegungsmelder', [(cyl(.03, 1.2, at=(0, 0, 0), seg=6), plank_d), (box(.1, .1, .12, at=(0, -.05, 1.1), bevel_w=.02), lp('Weiss_glanz', '#f4f4f1', .3)),
                           (ico(.035, at=(0, -.11, 1.17), sub=1), lp('Sensor', '#3a3c40', .3)), (box(.02, .02, .02, at=(.03, -.11, 1.2)), lp('LED_rot', '#ff3a2a', .3, emit='#ff3a2a', ei=2))], label='Bewegungsmelder')
    bp('solarlader', [(beam((sx * .25, .2, 0), (sx * .25, 0, .7), .02), steel) for sx in (-1, 1)] + [(solid([(-.35, -.05, .55), (.35, -.05, .55), (.35, .25, .85), (-.35, .25, .85)], (0, 0, .03)), lp('Solarzelle', '#203a6a', .2, .4)),
                      (box(.12, .08, .1, at=(0, .05, .1)), lp('Kunststoff_schwarz', '#232426', .6))], label='Solar-Ladegerät')
    # ---------------- held tools: flashlight, fishing rod, float
    bp('w_taschenlampe', [(cyl(.022, .19, at=(0, -.05, 0), seg=8, axis='Y'), lp('Kunststoff_schwarz', '#232426', .6)), (cyl(.032, .05, at=(0, .13, 0), seg=8, axis='Y'), steel),
                          (cyl(.028, .005, at=(0, .181, 0), seg=8, axis='Y'), lp('Lampenglas_l', '#fff6d8', .2, emit='#fff6d8', ei=3)), (box(.012, .02, .01, at=(0, .0, .024)), lp('Schalter_rot', '#c42a26', .5))])
    bp('w_angel', [(beam((0, -.1, -.05), (0, 1.6, .9), .012), lp('Angelrute', '#3a2a1c', .6)), (cyl(.035, .05, at=(.03, .05, .02), seg=8, axis='X'), steel), (box(.03, .1, .03, at=(0, -.05, -.06)), lp('Griffschale', '#3a3028', .7))])
    bp('pose', [(ico(.04, at=(0, 0, .0), sub=1, sz=1.3), lp('Pose_rot', '#d23a2a', .5)), (ico(.035, at=(0, 0, -.04), sub=1, sz=1.0), lp('Weiss_glanz', '#f4f4f1', .3)), (cyl(.005, .1, at=(0, 0, .04), seg=4), lp('Kunststoff_schwarz', '#232426', .6))])

    # lean-to: two forked posts, slanted roof of poles + leaf cover, fern bed
    P = [(cyl(.07, 1.85, at=(sx, -1.0, 0), seg=6), bark) for sx in (-1.2, 1.2)] + [(cyl(.06, 2.6, at=(-1.3, -1.0, 1.8), seg=6, axis='X'), bark)]
    for i in range(7):
        x = -1.2 + .4 * i; P.append((beam((x, -1.05, 1.85), (x, 1.15, .05), .045), bark))
    P.append((solid([(-1.4, -1.15, 1.92), (1.4, -1.15, 1.92), (1.4, 1.2, .12), (-1.4, 1.2, .12)], (0, 0, .1)), leaf))
    for i in range(6): P.append((ico(.35, at=(-1.1 + .44 * i, R.uniform(-.2, .6), R.uniform(.7, 1.3)), sub=1, jit=.3, seed=80 + i, sz=.4), leaf_d))
    P.append((box(1.8, 1.0, .1, at=(0, .2, 0)), lp('Farn', '#5f8a36', .9, var=.1)))
    bp('unterstand', P, label='Unterstand', inside=[-1.3, -1.0, 1.3, 1.2, 0, 1.8])
    # fire pit: stone ring, ash, two log seats
    P = [(ico(.2, at=(.72 * math.cos(6.283 * i / 10), .72 * math.sin(6.283 * i / 10), .05), sub=1, jit=.25, seed=90 + i, sz=.7), stone if i % 3 else stone_d) for i in range(10)]
    P += [(cyl(.62, .03, at=(0, 0, 0), seg=10), ash)]
    for a0 in (.5, 3.4):
        b = cyl(.2, 1.6, seg=7, axis='X'); move(b, (-.8, 0, .2)); rotz(b, a0 + math.pi / 2); move(b, (1.9 * math.cos(a0), 1.9 * math.sin(a0), 0)); P.append((b, log))
    bp('feuerstelle', P, label='Feuerstelle', fire=[0, 0, .03])
    # bed: log frame, straw mattress, wool blanket, pillow
    P = [(cyl(.08, 2.1, at=(sx, -1.05, .25), seg=6, axis='Y'), log) for sx in (-.5, .5)] + [(cyl(.08, 1.1, at=(-.55, sy, .25), seg=6, axis='X'), log) for sy in (-1.0, 1.0)]
    P += [(box(.1, .1, .4 + (.35 if sy > 0 else 0), at=(sx, sy, 0)), log) for sx in (-.5, .5) for sy in (-1.0, 1.0)]
    P += [(box(.95, 2.0, .16, at=(0, 0, .3), bevel_w=.05, seg=2), straw), (box(.97, 1.3, .06, at=(0, -.3, .45), bevel_w=.02), wool), (box(.55, .32, .12, at=(0, .72, .45), bevel_w=.05, seg=2), lp('Leinen', '#e9e2cf', .9))]
    bp('bett', P, label='Bett')
    # storage chest
    P = [(box(.9, .55, .45, at=(0, 0, 0), bevel_w=.015), plank), (box(.94, .59, .1, at=(0, 0, .45), bevel_w=.02), plank_d)] + [(box(.04, .6, .56, at=(sx, 0, 0)), lp('Eisenband', '#3a3c3e', .5, .6)) for sx in (-.3, .3)]
    P += [(box(.1, .03, .12, at=(0, -.29, .38)), lp('Eisenband', '#3a3c3e', .5, .6))]
    bp('kiste', P, label='Vorratskiste')
    # rain barrel with funnel and tap
    P = [(cyl(.42, 1.0, at=(0, 0, .12), seg=12, r2=.4), plank), (torus(.425, .025, at=(0, 0, .35), seg=12, seg2=4, axis='Z'), lp('Eisenband', '#3a3c3e', .5, .6)),
         (torus(.41, .025, at=(0, 0, .9), seg=12, seg2=4, axis='Z'), lp('Eisenband', '#3a3c3e', .5, .6)), (cyl(.55, .25, at=(0, 0, 1.12), seg=12, r2=.2), plank_d),
         (cyl(.37, .02, at=(0, 0, 1.08), seg=12), lp('Regenwasser', '#3a6a7a', .1)), (cyl(.03, .12, at=(0, -.42, .3), seg=6, axis='Y'), steel)]
    P += [(box(.15, .15, .12, at=(sx, sy, 0)), stone_d) for sx in (-.25, .25) for sy in (-.25, .25)]
    bp('regentonne', P, label='Regentonne')
    # fence segment (2 m along x)
    P = [(cyl(.06, 1.2, at=(sx, 0, -.1), seg=6), bark) for sx in (-1.0, 1.0)] + [(box(2.1, .05, .1, at=(0, .05, hh)), plank) for hh in (.4, .85)]
    bp('zaun', P, label='Zaun')
    # field bed 2 × 2 m: plank border, soil, furrows
    P = [(box(2.1, .08, .2, at=(0, sy * 1.0, -.05)), plank_d) for sy in (-1, 1)] + [(box(.08, 2.0, .2, at=(sx * 1.0, 0, -.05)), plank_d) for sx in (-1, 1)]
    P += [(box(1.92, 1.92, .12, at=(0, 0, -.05)), soil)] + [(box(.3, 1.85, .06, at=(-.6 + .6 * i, 0, .07), bevel_w=.02), soil) for i in range(3)]
    bp('feld', P, label='Feld')
    # crops, 3 stages each (one plant at the origin; the game sets 4 per field)
    for st in range(3):
        k = st + 1
        P = [(cyl(.012, .1 + .12 * st, seg=4), leaf_d)] + [(move(rotz(cone(.08 + .06 * st, .12 + .1 * st, seg=4), a0), (math.cos(a0) * .06 * k, math.sin(a0) * .06 * k, .08 + .1 * st)), leaf if i % 2 else leaf_d) for i, a0 in enumerate(R.uniform(0, 6.28) for _ in range(3 + 2 * st))]
        if st == 2: P += [(ico(.035, at=(R.uniform(-.12, .12), R.uniform(-.12, .12), .42), sub=1), flower) for _ in range(5)]
        bp(f'p_kartoffel_{k}', P)
        P = []
        for i in range(4 + 3 * st):
            a0 = 6.283 * i / (4 + 3 * st); L = .12 + .12 * st
            P.append((beam((0, 0, 0), (math.cos(a0) * L * .35, math.sin(a0) * L * .35, L * 1.3), .012, 4), leaf))
            P.append((move(ico(.03 + .015 * st, sub=1, jit=.3, seed=i), (math.cos(a0) * L * .35, math.sin(a0) * L * .35, L * 1.3)), leaf_d))
        if st == 2: P.append((cone(.045, .08, at=(0, 0, -.02), seg=6, r2=.035), carrot))
        bp(f'p_karotte_{k}', P)
        P = [(move(rotz(box(.14 + .08 * st, .14 + .08 * st, .02), a0), (math.cos(a0) * (.12 + .15 * st), math.sin(a0) * (.12 + .15 * st), .1 + .05 * st)), leaf if i % 2 else leaf_d) for i, a0 in enumerate([j * 1.3 for j in range(3 + 2 * st)])]
        P += [(beam((0, 0, .02), (math.cos(j * 1.3) * (.12 + .15 * st), math.sin(j * 1.3) * (.12 + .15 * st), .1 + .05 * st), .012, 4), leaf_d) for j in range(3 + 2 * st)]
        if st == 1: P.append((ico(.06, at=(.08, 0, .05), sub=1), lp('Bluete_gelb', '#f0c030', .7)))
        if st == 2: P += [(ico(.24, at=(.1, -.05, .2), sub=2, jit=.05, seed=5, sz=.75), pumpkin), (cyl(.025, .08, at=(.1, -.05, .36), seg=5), leaf_d)]
        bp(f'p_kuerbis_{k}', P)
    # felled tree: stump + log on the ground (6 m along x, centred)
    bp('stumpf', [(cyl(.34, .5, seg=8, r2=.3), bark), (cyl(.3, .02, at=(0, 0, .5), seg=8), log_end), (ico(.12, at=(.25, .1, .02), sub=1, jit=.3, seed=7, sz=.4), lp('Saegemehl', '#d9bf8a', .9))])
    bp('stamm', [(cyl(.3, 6.0, at=(-3.0, 0, .3), seg=8, axis='X', r2=.18), bark), (cyl(.29, .02, at=(-3.01, 0, .3), seg=8, axis='X'), log_end), (cyl(.17, .02, at=(2.99, 0, .3), seg=8, axis='X'), log_end),
                 (cyl(.05, .8, at=(.5, 0, .5), seg=4), bark), (cyl(.04, .7, at=(-1.2, .2, .5), seg=4, axis='Y'), bark)])

    # ------------------------------------------------------------ weapons (pointing +y, grip at the origin)
    def w_pistole():
        P = [(box(.032, .2, .036, at=(0, .07, .045), bevel_w=.004), gun), (box(.03, .17, .026, at=(0, .065, .02)), gun_l), (cyl(.007, .01, at=(0, .17, .062), seg=6, axis='Y'), lp('Muendung', '#111111', .4)),
             (box(.028, .055, .11, at=(0, -.005, -.09)), lp('Griffschale', '#3a3028', .7)), (torus(.022, .004, at=(0, .025, .005), seg=8, seg2=3, axis='X'), gun), (box(.005, .012, .02, at=(0, .03, .0)), gun_l),
             (box(.006, .008, .01, at=(0, .165, .081)), gun_l), (box(.012, .008, .01, at=(0, -.02, .081)), gun_l)]
        return P
    def w_schrot():
        P = [(cyl(.016, .72, at=(0, -.05, .05), seg=8, axis='Y'), gun), (cyl(.016, .62, at=(0, -.05, .02), seg=8, axis='Y'), gun_l), (box(.045, .2, .06, at=(0, -.12, .005), bevel_w=.01), gun),
             (box(.05, .2, .045, at=(0, .25, .005), bevel_w=.01), stock), (torus(.03, .005, at=(0, -.12, -.03), seg=8, seg2=3, axis='X'), gun)]
        P.append((box(.044, .36, .07, at=(0, -.4, -.04), bevel_w=.01), stock))
        P.append((box(.046, .05, .13, at=(0, -.6, -.08), bevel_w=.01), stock))
        return P
    def w_gewehr():
        P = [(cyl(.011, .6, at=(0, .1, .06), seg=8, axis='Y'), gun), (box(.04, .26, .055, at=(0, -.1, .03), bevel_w=.008), gun), (box(.05, .5, .06, at=(0, .1, -.005), bevel_w=.01), stock),
             (box(.05, .38, .07, at=(0, -.42, -.04), bevel_w=.01), stock), (box(.052, .06, .14, at=(0, -.62, -.09), bevel_w=.01), stock),
             (cyl(.02, .3, at=(0, -.25, .12), seg=10, axis='Y'), gun), (cyl(.026, .05, at=(0, .03, .12), seg=10, axis='Y'), gun), (cyl(.024, .05, at=(0, -.27, .12), seg=10, axis='Y'), gun),
             (box(.012, .02, .04, at=(0, -.12, .07)), gun_l), (box(.02, .02, .03, at=(.03, -.08, .05)), gun_l), (torus(.024, .004, at=(0, -.06, -.02), seg=8, seg2=3, axis='X'), gun)]
        return P
    def w_bogen():
        P = []; pts = [(0, .0 + .1 * math.sin(math.pi * t / 10), -.55 + 1.1 * t / 10) for t in range(11)]
        for a, b in zip(pts, pts[1:]): P.append((beam(a, b, .014, 5), stock))
        P.append((box(.03, .04, .14, at=(0, .1, -.07)), lp('Griffband', '#3a3028', .8)))
        P.append((beam(pts[0], pts[-1], .0025, 3), lp('Sehne', '#e9e2cf', .8)))
        return P
    def w_messer():
        return [(box(.004, .16, .025, at=(0, .09, -.005)), steel), (box(.004, .05, .012, at=(0, .19, .0)), steel), (box(.02, .1, .028, at=(0, -.03, -.008), bevel_w=.006), lp('Griffschale', '#3a3028', .7)),
                (box(.03, .012, .036, at=(0, .015, -.01)), gun_l)]
    W = {'pistole': w_pistole, 'schrotflinte': w_schrot, 'gewehr': w_gewehr, 'bogen': w_bogen, 'messer': w_messer}
    for k, f in W.items(): bp('w_' + k, f())

    def place(name, parts, at, rz, rx=0.0, **kw):
        out = []
        for bm_, m in parts:
            if rx: bmesh.ops.rotate(bm_, cent=(0, 0, 0), matrix=Matrix.Rotation(rx, 3, 'X'), verts=bm_.verts)
            rotz(bm_, rz); move(bm_, at); out.append((bm_, m))
        return multi(name, out, c, collide=0, interact='pickup', **kw)
    # hunting rifle on the Hochsitz shelf, shotgun on the barn wall, knife in Haus 3's kitchen, pistol in the shop office locker (search)
    hx, hy = HOCHSITZ; hz = terrain_h(hx, hy) + 3.6
    place('Jagdgewehr', w_gewehr(), (hx, hy + .84, hz + 1.3), -math.pi / 2, item='gewehr', label='Jagdgewehr')
    bz = terrain_h(-41, 158) + .1
    place('Schrotflinte', w_schrot(), (-36.32, 160.0, bz + 1.65), 0, item='schrotflinte', label='Schrotflinte')
    obj('Waffenhaken', merge(*[box(.12, .03, .03, at=(-36.3, 160.0 + dy, bz + 1.55)) for dy in (-.35, .3)], *[box(.03, .25, .03, at=(hx + dx, hy + .86, hz + 1.2)) for dx in (-.35, .3)]), steel, c, collide=0)
    place('Kuechenmesser', w_messer(), (-76.6, 163.4, .3 + .93), math.pi / 2, item='messer', label='Messer')
    for k, (x, y, z, item, label) in enumerate(((hx + .65, hy + .55, hz + .5, 'patronen_gewehr', 'Gewehrpatronen'), (-36.8, 160.6, terrain_h(-41, 158) + 1.1, 'patronen_schrot', 'Schrotpatronen'),
                                                  (-72.0, 176.4, .3 + 1.05, 'patronen_pistole', 'Pistolenmunition'))):
        multi(f'Munition_{k}', [(box(.12, .08, .06, at=(x, y, z), bevel_w=.005), lp(f'Munition_{k}', ('#3a5a3a', '#a8432e', '#3d405b')[k], .6)), (box(.08, .081, .03, at=(x, y, z + .015)), lp('Papier', '#ffffff', .8))],
              c, collide=0, interact='pickup', item=item, label=label)
