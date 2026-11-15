# Section 12 – forest lake west of the road (LAKE in core.py): water surface, reed beds, lily pads, wooden jetty with a rowing boat
# (interactive: E = get in, row with W/S/A/D – the only way to the island), angler's hut (door, bunk to sleep, fishing rod, tackle box,
# cool box, logbook with the hint to the treasure), a bench, and the small island: two pines, rocks, a cross of stones over loose
# ground (E with the spade = dig) and the treasure chest under it (hidden until dug up). Fishing works at the lake and the creek.
COLL = '12 Waldsee'

def build(c):
    R = random.Random(1212)
    lx, ly = LAKE; wz = LAKE_Z; WR = LAKE_R + 5.8           # water disc radius (its edge lies under the shore)
    water = lp('Wasser', '#4f8fae', .05, 0, alpha=.75, var=.03)
    wood = lp('Steg_Holz', '#8a6a48', .9, var=.08); wood_d = lp('Steg_Holz_d', '#6b5038', .9, var=.08); reed = lp('Schilf', '#9a9a4a', .9, var=.1)
    steel = lp('Stahl', '#9da2a6', .35, .8); roof = lp('Dachpappe', '#3a3c40', .9, var=.05); rock = lp('Fels', '#8a8780', .9, var=.1)
    paper = lp('Papier_alt', '#efe4c4', .8, var=.03); rust = lp('Rost', '#8a4f2a', .9, var=.1)
    # water surface: a ragged disc (the terrain bowl decides where you see it)
    bm = bmesh.new(); ctr = bm.verts.new((lx, ly, wz)); ring = []
    for i in range(36):
        a = 6.283 * i / 36; r = WR + R.uniform(-.5, .5); ring.append(bm.verts.new((lx + r * math.cos(a), ly + r * math.sin(a), wz)))
    for i in range(36): bm.faces.new((ctr, ring[i], ring[(i + 1) % 36]))
    obj('See', bm, water, c, collide=0, water=1)
    # reeds + lily pads around the shore (not on the jetty side, not round the island)
    rd = []
    for i in range(46):
        a = R.uniform(0, 6.283); r = R.uniform(LAKE_R + 1.0, LAKE_R + 3.0); x, y = lx + r * math.cos(a), ly + r * math.sin(a)
        if abs(a) < .3 or abs(a - 6.283) < .3: continue                                            # jetty side (east) stays open
        for k in range(5): rd.append(move(cone(.03, R.uniform(.9, 1.6), seg=3), (x + R.uniform(-.3, .3), y + R.uniform(-.3, .3), wz - .3)))
    obj('Schilf', merge(*rd), reed, c, collide=0)
    lil = []
    while len(lil) < 22:
        a_, r_ = R.uniform(0, 6.28), R.uniform(8, 15); x, y = lx + r_ * math.cos(a_), ly + r_ * math.sin(a_)
        if math.hypot(x - ISLAND[0], y - ISLAND[1]) < 7.5 or abs(y - ly) < 2.5 and x > lx: continue
        lil.append(cyl(R.uniform(.25, .4), .02, at=(x, y, wz + .01), seg=7))
    obj('Seerosen', merge(*lil), lp('Seerose', '#4f7a34', .8, var=.1), c, collide=0)
    # jetty from the east shore into the lake (walkable, 1.4 m wide)
    jx1, jy = lx + 8.5, ly; jz = wz + .45; jx0 = jx1 + 3
    while jx0 < lx + 28 and terrain_h(jx0, jy) < jz - .12: jx0 += .3                                  # the jetty reaches the bank
    jx0 += .6; P = []
    for i in range(int((jx0 - jx1) / .3)): P.append((box(.27, 1.4, .06, at=(jx1 + .15 + .3 * i, jy, jz - .06)), wood if i % 2 else wood_d))
    x = jx1 + .2
    while x < jx0 - 1:
        for s_ in (-1, 1): P.append((cyl(.09, 2.2, at=(x, jy + s_ * .62, wz - 1.6), seg=6), wood_d))
        x += 2.5
    P += [(box(jx0 - jx1, .08, .12, at=((jx0 + jx1) / 2, jy + s_ * .7, jz - .15)), wood_d) for s_ in (-1, 1)]
    P.append((box(.08, .08, 1.0, at=(jx1 + .25, jy - .6, jz - .06)), wood_d))                         # mooring post (south side, the boat lies there)
    P.append((torus(.06, .015, at=(jx1 + .29, jy - .64, jz + .7), seg=8, seg2=3, axis='Z'), steel))
    multi('Steg', P, c)
    # rowing boat (interactive): origin = centre of the hull on the water line; built along +y (bow north) then turned
    bx, by, brz = jx1 + 1.4, jy - 1.9, math.pi / 2 - .15
    hull = box(1.15, 2.9, .5, at=(0, 0, -.22), bevel_w=.2, seg=2)
    for v in hull.verts:                                                                           # pointed bow, narrower stern, sheer line
        if v.co.y > .9: v.co.x *= max(.15, 1 - (v.co.y - .9) / 1.3)
        if v.co.y < -1.1: v.co.x *= .85
        if v.co.z > .1: v.co.z += .06 * abs(v.co.y)
    boat = [(hull, lp('Boot', '#3f6a8a', .6, var=.05)), (box(.95, 2.3, .06, at=(0, -.1, -.12)), lp('Boot_innen', '#a07850', .8)),
            (box(1.02, .26, .05, at=(0, .25, .14)), wood), (box(.96, .26, .05, at=(0, -.85, .14)), wood),
            (box(.04, 2.9, .06, at=(.56, 0, .26)), lp('Boot_Rand', '#d9d6cc', .6)), (box(.04, 2.9, .06, at=(-.56, 0, .26)), lp('Boot_Rand', '#d9d6cc', .6))]
    for s_ in (-1, 1):                                                                              # oars resting in the rowlocks
        o = cyl(.025, 2.2, at=(0, -1.1, 0), seg=5, axis='Y'); move(o, (s_ * .5, .1, .3)); boat.append((o, wood_d))
        blade = box(.03, .45, .14, at=(s_ * .5, -1.05, .25)); boat.append((blade, wood_d))
        boat.append((cyl(.02, .1, at=(s_ * .57, .2, .26), seg=5), steel))
    parts = []
    for b_, m in boat: rotz(b_, brz); move(b_, (bx, by, wz)); parts.append((b_, m))
    multi('Ruderboot', parts, c, pivot=(bx, by, wz), collide=0, interact='use', use='boot', label='Ruderboot', boat_yaw=brz)
    # angler's hut on the east bank (3 × 2.6 m), door to the west (lake side), bunk, rod, tackle box, cool box, logbook
    hx, hy = ANGLER; hz = terrain_h(hx, hy); FL = hz + .25; T = .12; H = 2.3; x0, x1, y0, y1 = hx - 1.5, hx + 1.5, hy - 1.3, hy + 1.3
    hw = lp('Huette_gruen', '#4a6a4a', .85, var=.08)
    P = [(box(3.2, 2.8, .3, at=(hx, hy, hz - .05)), wood_d), (box(3.0, 2.6, .02, at=(hx, hy, FL - .02)), wood)]
    P += [(wall((x0 + T / 2, y0), (x0 + T / 2, y1), T, H, [(.9, .9, 0, 2.0)], FL), hw), (wall((x1 - T / 2, y0), (x1 - T / 2, y1), T, H, [(.8, 1.0, 1.0, 1.7)], FL), hw),
          (wall((x0 + T, y0 + T / 2), (x1 - T, y0 + T / 2), T, H, (), FL), hw), (wall((x0 + T, y1 - T / 2), (x1 - T, y1 - T / 2), T, H, (), FL), hw)]
    rf = box(3.8, 3.4, .1, at=(hx, hy, FL + H)); bmesh.ops.rotate(rf, cent=(hx, hy, FL + H), matrix=Matrix.Rotation(.12, 3, 'Y'), verts=rf.verts); P.append((rf, roof))
    P += [(box(.02, .95, .65, at=(x1 - T / 2, y0 + .8 + .5, FL + 1.0)), glass('Glas_Huette', '#bcd3dc', .3))]
    P += [(box(1.9, .8, .4, at=(hx + .3, y1 - .5, FL)), wood_d), (box(1.85, .75, .12, at=(hx + .3, y1 - .5, FL + .4), bevel_w=.04), lp('Matratze', '#8a7a5a', .9))]
    P += [(box(.6, .24, .03, at=(hx + .7, y0 + T + .12, FL + 1.25)), wood), (box(.03, .2, .15, at=(hx + .45, y0 + T + .1, FL + 1.1)), wood_d), (box(.03, .2, .15, at=(hx + .95, y0 + T + .1, FL + 1.1)), wood_d)]   # wall shelf
    n = 1
    for _ in range(4): gz = terrain_h(x0 - .45 * n - .3, y0 + 1.35) - .05; n = max(1, math.ceil((FL - gz) / .26))     # steps up to the door (the bank slopes)
    for k in range(n):
        top = gz + (FL - gz) * (k + 1) / n; P.append((box(.45, 1.1, top - gz + .4, at=(x0 - .225 - .45 * (n - 1 - k), y0 + 1.35, gz - .4)), wood_d))
    multi('Anglerhuette', P, c, indoor=[x0, y0, x1, y1, hz - .5, FL + H])
    multi('Anglerhuette_Pritsche', [(box(1.85, .75, .02, at=(hx + .3, y1 - .5, FL + .53)), lp('Wolldecke', '#8a3b32', .95))], c, collide=0, interact='use', use='bett', label='Pritsche')
    hinge = (x0 + T / 2, y0 + .9 + .03, FL)
    multi('Anglerhuette_Tuer', [(move(box(.05, .84, 1.95, at=(0, .42, 0)), hinge), wood), (move(box(.07, .03, .1, at=(-.03, .74, .95)), hinge), steel)], c, pivot=hinge, interact='door', angle=math.radians(-100), label='Hüttentür')
    rod = [(cyl(.012, 2.2, at=(0, 0, 0), seg=5, r2=.005), lp('Angelrute', '#3a2a1c', .6)), (torus(.04, .012, at=(0, .0, .35), seg=8, seg2=3, axis='X'), steel)]
    multi('Angel_Huette', [(move(rotz(b_, 0), (x0 + T + .05, hy + .6, FL + .1)), m) for b_, m in rod], c, collide=0, interact='pickup', item='angel', label='Angelrute')
    multi('Koederkiste', [(box(.4, .25, .2, at=(hx - .5, y0 + .35, FL), bevel_w=.01), lp('Kiste_gruen', '#3b6b3a', .6))], c, interact='search', label='Angelkiste', item='angel',
          loot=[['seil', 1], ['metall', 1], ['patronen_gewehr', 1]], found='Angelschnur (Seil), Haken (Metall) – und eine Schachtel Gewehrpatronen.')
    cb = lp('Kuehlbox_blau', '#2f6fb0', .5, var=.03); cw = lp('Kuehlbox_weiss', '#eef0ee', .4, var=.02)
    multi('Kuehlbox_Huette', [(box(.55, .36, .34, at=(x1 - .45, y1 - 1.25, FL), bevel_w=.03), cb), (box(.57, .38, .07, at=(x1 - .45, y1 - 1.25, FL + .34), bevel_w=.02), cw),
                              (box(.3, .04, .03, at=(x1 - .45, y1 - 1.25, FL + .43)), cw)], c, collide=0, interact='pickup', item='kuehlbox', label='Kühlbox')
    multi('Logbuch_Huette', [(box(.3, .2, .03, at=(hx + .7, y0 + T + .13, FL + 1.28), rz=.1), lp('Buch_gruen', '#2f5a3a', .7)), (box(.28, .18, .005, at=(hx + .7, y0 + T + .13, FL + 1.31), rz=.1), paper)], c,
          collide=0, interact='read', label='Logbuch der Anglerhütte', reveal='insel',
          text='<b>Logbuch – Angelverein Tannbach</b><br>12.5. Hecht, 74 cm. Opa Willi hat wieder vom Schatz erzählt.<br>3.6. Willi schwört, er hat 1962 seine Goldmünzen auf der <b>Insel</b> vergraben – „unter dem Kreuz aus Steinen, wo die zwei Kiefern stehen“. Ohne Spaten und Boot kommt da keiner hin.<br>4.6. Boot frisch gestrichen, liegt am Steg.<br><i>Die Insel ist jetzt auf deiner Karte eingetragen.</i>')
    multi('Seebank', [(box(1.6, .42, .05, at=(lx + 21.5, ly - 7.0, terrain_h(lx + 21.5, ly - 7) + .45)), wood), (box(1.6, .05, .4, at=(lx + 21.5, ly - 6.8, terrain_h(lx + 21.5, ly - 7) + .55)), wood)] +
          [(box(.08, .42, .45, at=(lx + 21.5 + s_ * .7, ly - 7.0, terrain_h(lx + 21.5, ly - 7))), wood_d) for s_ in (-1, 1)], c)
    # ------------------------------------------------------------ the island: two pines, rocks, cross of stones, buried chest
    ix, iy = ISLAND; iz = terrain_h(ix, iy)
    for k, (dx, dy, s_) in enumerate(((-1.4, 1.1, .75), (1.3, 1.5, .62))):
        inst(bpy.data.objects['Kiefer_0'], f'Kiefer_Insel_{k}', (ix + dx, iy + dy, terrain_h(ix + dx, iy + dy) - .1), k * 2.1, s_, c=c, tree='Kiefer')
    for k, (dx, dy, r_) in enumerate(((2.2, -1.4, .55), (-2.4, -.9, .45), (.4, 2.6, .35))):
        obj(f'Inselfels_{k}', ico(r_, at=(ix + dx, iy + dy, terrain_h(ix + dx, iy + dy) + r_ * .25), sub=1, jit=.3, seed=500 + k, sz=.6), rock, c)
    P = []
    for k in range(9):                                                                              # cross of flat stones on the loose ground
        dx, dy = ((k - 4) * .28, 0) if k < 9 else (0, 0)
        P.append((ico(.13, at=(ix - .3 + dx, iy - .4 + (0 if k != 4 else 0), iz + .03), sub=1, jit=.25, seed=600 + k, sz=.45), rock))
    for k in (-2, -1, 1, 2): P.append((ico(.13, at=(ix - .3, iy - .4 + k * .28, iz + .03), sub=1, jit=.25, seed=620 + k, sz=.45), rock))
    P.append((cyl(.75, .03, at=(ix - .3, iy - .4, iz - .01), seg=9), lp('Erde_locker', '#5a3f2a', 1.0, var=.08)))
    multi('Steinkreuz', P, c, collide=0, interact='use', use='graben', label='Kreuz aus Steinen')
    ch = lp('Schatzkiste', '#6b4630', .8, var=.06); band = lp('Eisenband', '#3a3a38', .5, .6)
    cx_, cy_ = ix + .75, iy - .5
    multi('Schatzkiste', [(box(.62, .4, .32, at=(cx_, cy_, iz - .02), bevel_w=.02), ch), (box(.64, .42, .1, at=(cx_, cy_, iz + .3), bevel_w=.04, seg=2), ch),
                          (box(.66, .05, .44, at=(cx_ - .2, cy_, iz - .02)), band), (box(.66, .05, .44, at=(cx_ + .2, cy_, iz - .02)), band), (box(.08, .03, .1, at=(cx_, cy_ - .22, iz + .22)), rust),
                          (cyl(.5, .02, at=(cx_, cy_, iz - .04), seg=9), lp('Erde_locker', '#5a3f2a', 1.0, var=.08))], c,
          interact='search', label='Schatzkiste', hidden=1, item='goldmuenze', loot=[['goldmuenze', 4], ['patronen_gewehr', 1], ['medizin', 1]],
          found='Opa Willis Schatz: vier alte Goldmünzen (Kurt zahlt gut dafür), eine Schachtel Patronen – und Medizin.')
    spot('ziel_see', (lx, ly, wz), quest='see')
    spot('ziel_insel', (ix, iy, iz), quest='insel')
