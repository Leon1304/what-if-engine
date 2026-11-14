# Section 12 – forest lake west of the road (LAKE in core.py): water surface, reed beds, lily pads, wooden jetty with a rowing boat,
# angler's hut (door, bunk to sleep, fishing rod, tackle box) and a bench. Fishing works at the lake and the creek (rod + left click).
COLL = '12 Waldsee'

def build(c):
    R = random.Random(1212)
    lx, ly = LAKE; wz = LAKE_Z
    water = lp('Wasser', '#4f8fae', .05, 0, alpha=.75, var=.03)
    wood = lp('Steg_Holz', '#8a6a48', .9, var=.08); wood_d = lp('Steg_Holz_d', '#6b5038', .9, var=.08); reed = lp('Schilf', '#9a9a4a', .9, var=.1)
    steel = lp('Stahl', '#9da2a6', .35, .8); roof = lp('Dachpappe', '#3a3c40', .9, var=.05)
    # water surface: a ragged disc (the terrain bowl decides where you see it)
    bm = bmesh.new(); ctr = bm.verts.new((lx, ly, wz)); ring = []
    for i in range(28):
        a = 6.283 * i / 28; r = 17.5 + R.uniform(-.6, .6); ring.append(bm.verts.new((lx + r * math.cos(a), ly + r * math.sin(a), wz)))
    for i in range(28): bm.faces.new((ctr, ring[i], ring[(i + 1) % 28]))
    obj('See', bm, water, c, collide=0, water=1)
    # reeds + lily pads around the shore
    rd = []
    for i in range(36):
        a = R.uniform(0, 6.283); r = R.uniform(11.5, 13.5); x, y = lx + r * math.cos(a), ly + r * math.sin(a)
        if abs(a) < .35: continue                                                                    # jetty side (east) stays open
        for k in range(5): rd.append(move(cone(.03, R.uniform(.9, 1.6), seg=3), (x + R.uniform(-.3, .3), y + R.uniform(-.3, .3), wz - .3)))
    obj('Schilf', merge(*rd), reed, c, collide=0)
    lil = [cyl(R.uniform(.25, .4), .02, at=(lx + r_ * math.cos(a_), ly + r_ * math.sin(a_), wz + .01), seg=7) for a_, r_ in ((R.uniform(0, 6.28), R.uniform(4, 10)) for _ in range(18))]
    obj('Seerosen', merge(*lil), lp('Seerose', '#4f7a34', .8, var=.1), c, collide=0)
    # jetty from the east shore into the lake (walkable, 1.4 m wide)
    jx1, jy = lx + 8.5, ly; jz = wz + .45; jx0 = jx1 + 3
    while jx0 < lx + 24 and terrain_h(jx0, jy) < jz - .12: jx0 += .3                                  # the jetty reaches the bank
    jx0 += .6; P = []
    for i in range(int((jx0 - jx1) / .3)): P.append((box(.27, 1.4, .06, at=(jx1 + .15 + .3 * i, jy, jz - .06)), wood if i % 2 else wood_d))
    for x in (jx1 + .2, jx1 + 2.5, jx1 + 5.0, jx1 + 7.5):
        for s_ in (-1, 1): P.append((cyl(.09, 2.2, at=(x, jy + s_ * .62, wz - 1.6), seg=6), wood_d))
    P += [(box(jx0 - jx1, .08, .12, at=((jx0 + jx1) / 2, jy + s_ * .7, jz - .15)), wood_d) for s_ in (-1, 1)]
    P.append((box(.08, .08, 1.0, at=(jx1 + .25, jy + .6, jz - .06)), wood_d))                         # mooring post
    multi('Steg', P, c)
    boat = [(box(1.1, 2.8, .45, at=(0, 0, 0), bevel_w=.18, seg=2), lp('Boot', '#3f6a8a', .6, var=.05)), (box(.9, 2.5, .3, at=(0, 0, .18)), lp('Boot_innen', '#a07850', .8)),
            (box(1.0, .25, .05, at=(0, .2, .42)), wood), (box(1.0, .25, .05, at=(0, -.7, .42)), wood)]
    multi('Ruderboot', [(move(rotz(b_, .3), (jx1 + 1.6, jy - 1.9, wz - .25)), m) for b_, m in boat], c)
    # angler's hut on the east bank (3 × 2.6 m), door to the west (lake side), bunk, rod, tackle box
    hx, hy = lx + 21.0, ly + 5.0; hz = terrain_h(hx, hy); FL = hz + .25; T = .12; H = 2.3; x0, x1, y0, y1 = hx - 1.5, hx + 1.5, hy - 1.3, hy + 1.3
    hw = lp('Huette_gruen', '#4a6a4a', .85, var=.08)
    P = [(box(3.2, 2.8, .3, at=(hx, hy, hz - .05)), wood_d), (box(3.0, 2.6, .02, at=(hx, hy, FL - .02)), wood)]
    P += [(wall((x0 + T / 2, y0), (x0 + T / 2, y1), T, H, [(.9, .9, 0, 2.0)], FL), hw), (wall((x1 - T / 2, y0), (x1 - T / 2, y1), T, H, [(.8, 1.0, 1.0, 1.7)], FL), hw),
          (wall((x0 + T, y0 + T / 2), (x1 - T, y0 + T / 2), T, H, (), FL), hw), (wall((x0 + T, y1 - T / 2), (x1 - T, y1 - T / 2), T, H, (), FL), hw)]
    rf = box(3.8, 3.4, .1, at=(hx, hy, FL + H)); bmesh.ops.rotate(rf, cent=(hx, hy, FL + H), matrix=Matrix.Rotation(.12, 3, 'Y'), verts=rf.verts); P.append((rf, roof))
    P += [(box(.02, .95, .65, at=(x1 - T / 2, y0 + .8 + .5, FL + 1.0)), glass('Glas_Huette', '#bcd3dc', .3))]
    P += [(box(1.9, .8, .4, at=(hx + .3, y1 - .5, FL)), wood_d), (box(1.85, .75, .12, at=(hx + .3, y1 - .5, FL + .4), bevel_w=.04), lp('Matratze', '#8a7a5a', .9))]
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
    multi('Seebank', [(box(1.6, .42, .05, at=(lx + 15.0, ly - 4.0, terrain_h(lx + 15, ly - 4) + .45)), wood), (box(1.6, .05, .4, at=(lx + 15.0, ly - 3.8, terrain_h(lx + 15, ly - 4) + .55)), wood)] +
          [(box(.08, .42, .45, at=(lx + 15.0 + s_ * .7, ly - 4.0, terrain_h(lx + 15, ly - 4))), wood_d) for s_ in (-1, 1)], c)
    spot('ziel_see', (lx, ly, wz), quest='see')
