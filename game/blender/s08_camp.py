# Section 8 – abandoned caravan in a clearing west of the road (path from the road): caravan with door, bed, dinette, kitchenette,
# searchable cupboard, diary; awning, camping chairs and table, clothesline, gas bottle, jockey wheel. Loot: sleeping bag
# (lets you wait outside), gas stove (cook without fire), beans, matches-free – the diary tells what happened to its owner.
COLL = '08 Wohnwagen'

def build(c):
    cx, cy = CAMP; z0 = terrain_h(cx, cy); rz = math.radians(15)
    cream = lp('Wohnwagen_creme', '#ece3cf', .7, var=.04); brown = lp('Wohnwagen_braun', '#7a4e2c', .6, var=.04); alu = lp('Alu', '#6e7378', .4, .6)
    gl = glass('Glas_Wohnwagen', '#9fb6bf', .35); tyre = lp('Reifen', '#1b1b1c', .9); steel = lp('Stahl', '#9da2a6', .35, .8)
    wood = lp('Holz_Tresen', '#9c6b43', .7, var=.05); fabric = lp('Polster', '#5f7a8a', .9, var=.06); rust = lp('Rost', '#8a4f2a', .9, var=.1)
    blk = lp('Kunststoff_schwarz', '#232426', .6)
    M = Matrix.Rotation(rz, 4, 'Z')
    def T(parts):          # local caravan coordinates (x across, y along, z up; floor at .55) → world
        out = []
        for bm_, m in parts:
            rotz(bm_, rz); move(bm_, (cx, cy, z0)); out.append((bm_, m))
        return out
    W = lambda x, y, z=0: tuple(M @ Vector((x, y, z)) + Vector((cx, cy, z0)))
    L, Wd, H, FZ = 5.2, 2.3, 2.1, .55
    # shell: floor, walls with window + door openings, roof; brown stripe; skirt
    P = [(box(Wd, L, .12, at=(0, 0, FZ - .12)), wood)]
    P += [(box(Wd, .08, H, at=(0, -L / 2 + .04, FZ)), cream), (box(Wd, .08, H, at=(0, L / 2 - .04, FZ)), cream)]          # ends (front = −y)
    P += [(box(.08, L, .9, at=(Wd / 2 - .04, 0, FZ)), cream), (box(.08, L, .5, at=(Wd / 2 - .04, 0, FZ + H - .5)), cream)]  # east side: big window band
    for yy in (-L / 2 + .6, 0, L / 2 - .6): P.append((box(.08, .5, .7, at=(Wd / 2 - .04, yy, FZ + .9)), cream))
    P += [(box(.08, 1.1, H, at=(-Wd / 2 + .04, -L / 2 + .55 + .0, FZ)), cream), (box(.08, L - 2.0, .9, at=(-Wd / 2 + .04, .9, FZ)), cream),   # west: door at y −1.5 … −0.8
          (box(.08, L - 2.0, .5, at=(-Wd / 2 + .04, .9, FZ + H - .5)), cream), (box(.08, .7, .4, at=(-Wd / 2 + .04, -1.15, FZ + H - .4)), cream)]
    for yy in (.2, 1.6): P.append((box(.08, .6, .7, at=(-Wd / 2 + .04, yy, FZ + .9)), cream))
    roof = box(Wd + .1, L + .1, .12, at=(0, 0, FZ + H), bevel_w=.05, seg=2)
    P += [(roof, cream), (box(.6, .6, .15, at=(0, .5, FZ + H + .12), bevel_w=.03), lp('Dachluke', '#cfd2d2', .5))]
    # brown stripe: four thin bands on the outer walls (not a slab through the interior), gap at the door (y −1.5 … −0.7)
    sz = FZ + .65
    P += [(box(.02, L + .02, .14, at=(Wd / 2 + .01, 0, sz)), brown), (box(Wd + .02, .02, .14, at=(0, -L / 2 - .01, sz)), brown), (box(Wd + .02, .02, .14, at=(0, L / 2 + .01, sz)), brown),
          (box(.02, L / 2 - 1.5 + .01, .14, at=(-Wd / 2 - .01, (-L / 2 - 1.5) / 2, sz)), brown), (box(.02, L / 2 + .7 + .01, .14, at=(-Wd / 2 - .01, (L / 2 - .7) / 2, sz)), brown)]
    P += [(box(Wd - .2, L - .4, .45, at=(0, 0, .1)), lp('Schuerze', '#6f6a60', .9))]
    # windows glass + frames
    P += [(box(.03, 1.1, .6, at=(Wd / 2 - .04, -L / 2 + 1.45, FZ + .95)), gl), (box(.03, 1.1, .6, at=(Wd / 2 - .04, L / 2 - 1.45, FZ + .95)), gl),
          (box(.03, .7, .6, at=(-Wd / 2 + .04, .9, FZ + .95)), gl), (box(.03, .6, .6, at=(-Wd / 2 + .04, 2.25, FZ + .95)), gl)]
    # chassis: axle, wheels, drawbar, jockey wheel, gas box
    for s_ in (-1, 1):
        P += [(cyl(.32, .2, at=(s_ * 1.05, .3, .32), seg=10, axis='X'), tyre), (cyl(.18, .21, at=(s_ * 1.05, .3, .32), seg=8, axis='X'), steel),
              (box(.3, .9, .08, at=(s_ * 1.05, .3, .66)), cream)]
    dr = [(box(.08, 1.4, .08, at=(-.4, -L / 2 - .6, .4)), rust), (box(.08, 1.4, .08, at=(.4, -L / 2 - .6, .4)), rust), (box(.15, .3, .12, at=(0, -L / 2 - 1.3, .4)), rust),
          (cyl(.04, .45, at=(0, -L / 2 - 1.15, 0), seg=6), steel), (cyl(.09, .06, at=(0, -L / 2 - 1.15, .05), seg=8, axis='X'), tyre),
          (box(1.0, .5, .5, at=(0, -L / 2 - .3, .55), bevel_w=.03), cream), (cyl(.15, .5, at=(.25, -L / 2 - .3, .6), seg=8), lp('Gasflasche', '#4e7fb8', .5, .3))]
    P += dr
    multi('Wohnwagen', T(P), c)
    # door (hinged at its south edge, opens outwards)
    door = [(box(.05, .66, 1.85, at=(-Wd / 2 - .01, -1.15, FZ + .05)), cream), (box(.05, .66, .1, at=(-Wd / 2 - .01, -1.15, FZ + .7)), brown),
            (box(.04, .3, .35, at=(-Wd / 2 - .02, -1.15, FZ + 1.2)), gl), (box(.06, .1, .03, at=(-Wd / 2 - .05, -.9, FZ + 1.0)), steel)]
    multi('Wohnwagen_Tuer', T(door), c, pivot=W(-Wd / 2 - .01, -1.48, 0), interact='door', angle=math.radians(-100), label='Wohnwagentür')
    # two steps up to the floor (.55): rises ≈ .18 each, sunk into the slope so the lower one never floats
    st = [(box(.42, .8, .55, at=(-Wd / 2 - .27, -1.15, -.18)), lp('Beton', '#b3b0a8', .9)), (box(.4, .8, .51, at=(-Wd / 2 - .68, -1.15, -.32)), lp('Beton', '#b3b0a8', .9))]
    multi('Wohnwagen_Stufe', T(st), c, walk=1)
    # interior: bed at the back (+y), dinette at the front, kitchenette on the east side
    I = [(box(Wd - .2, 1.3, .45, at=(0, L / 2 - .75, FZ)), wood), (box(Wd - .3, 1.2, .15, at=(0, L / 2 - .75, FZ + .45)), fabric),
         (box(.6, .35, .12, at=(-.5, L / 2 - .3, FZ + .6)), lp('Kissen', '#e9e4d8', .9)), (box(.6, .35, .12, at=(.5, L / 2 - .3, FZ + .6)), lp('Kissen', '#e9e4d8', .9)),
         (box(.9, .7, .05, at=(.4, -L / 2 + 1.0, FZ + .7)), wood), (box(.06, .06, .7, at=(.4, -L / 2 + 1.0, FZ)), steel),
         (box(.5, .5, .4, at=(.75, -L / 2 + .35, FZ)), fabric), (box(.5, .5, .4, at=(.75, -L / 2 + 1.65, FZ)), fabric),
         (box(.6, 1.6, .9, at=(Wd / 2 - .38, .7, FZ)), wood), (box(.62, 1.62, .04, at=(Wd / 2 - .38, .7, FZ + .9)), lp('Arbeitsplatte', '#3a3c3f', .4)),
         (box(.35, .35, .02, at=(Wd / 2 - .38, .5, FZ + .94)), lp('Spuele', '#b9bdc0', .3, .8)), (box(.6, .4, .5, at=(Wd / 2 - .38, .7, FZ + 1.5)), wood)]
    multi('Wohnwagen_Innen', T(I), c, indoor=[cx - 2.4, cy - 2.4, cx + 2.4, cy + 2.4, z0 - .5, z0 + FZ + H])          # (rotated 15°: the box is a little generous)
    multi('Wohnwagen_Bett', T([(box(Wd - .32, 1.15, .02, at=(0, L / 2 - .75, FZ + .601)), lp('Wolldecke', '#8a3b32', .95))]), c, collide=0, interact='use', use='bett', label='Bett')
    multi('Wohnwagen_Schrank', T([(box(.6, .5, .9, at=(-Wd / 2 + .38, 1.3, FZ)), wood), (box(.02, .2, .03, at=(-Wd / 2 + .69, 1.3, FZ + .7)), steel)]), c,
          interact='search', item='dosenbohnen', label='Schrank', found='Zwei Dosen Bohnen – und ganz hinten ein Gaskocher!', bonus='gaskocher')
    multi('Schlafsack', T([(box(.8, 1.0, .18, at=(-.2, L / 2 - .9, FZ + .6), bevel_w=.06, seg=2), lp('Schlafsack', '#b5512b', .9))]), c, collide=0,
          interact='pickup', item='schlafsack', label='Schlafsack')
    multi('Tagebuch', T([(box(.18, .24, .03, at=(.3, -L / 2 + 1.0, FZ + .75), rz=.3), lp('Buch', '#3d405b', .7))]), c, collide=0, interact='read', label='Tagebuch',
          text='Tag 9 – Strom im Wagen ist weg. Die Tankstelle hat auch zu. Egal, ich hab Vorräte.\n\nTag 11 – Nachts kommen sie näher. Drei, vielleicht vier. Augen wie Taschenlampen. Licht mögen sie nicht.\n\nTag 12 – Bernd vom Hochsitz sagt, die Bergwacht hört Kanal 7. Ich hab kein Funkgerät.\n\nTag 13 – Ich gehe zur Straße. Lass den Kocher hier, der ist zu schwer.')
    pickup_parts = T([(cyl(.035, .12, at=(Wd / 2 - .5, .3, FZ + .94), seg=8), lp('Dose_rot', '#c8382c', .4, .4))])
    multi('Bohnen_Tresen', pickup_parts, c, collide=0, interact='pickup', item='dosenbohnen', label='Dose Bohnen')
    # outside: awning (fabric on two poles), camping table + chairs, old fire ring, clothesline, rusty bicycle, wood
    aw = [(box(2.0, 3.2, .04, at=(-Wd / 2 - 1.0, .0, FZ + 2.0)), lp('Markise', '#2f6b7a', .9, var=.06))]
    for yy in (-1.5, 1.5): aw.append((cyl(.025, 2.5, at=(-Wd / 2 - 1.95, yy, 0), seg=6), alu))
    a0 = T(aw)
    bmesh.ops.rotate(a0[0][0], cent=W(-Wd / 2, 0, FZ + 2.0), matrix=Matrix.Rotation(-.12, 3, M.to_3x3() @ Vector((0, 1, 0))), verts=a0[0][0].verts)
    multi('Vorzelt', a0, c)
    tb = [(box(.8, .6, .03, at=(-Wd / 2 - 1.3, .4, .7)), alu)] + [(box(.03, .03, .7, at=(-Wd / 2 - 1.3 + sx * .35, .4 + sy * .25, 0)), alu) for sx in (-1, 1) for sy in (-1, 1)]
    for k, yy in enumerate((-.4, 1.2)):
        tb += [(box(.45, .45, .04, at=(-Wd / 2 - 1.3, yy, .42)), lp('Stuhl_gruen', '#4a6b3a', .9)), (box(.45, .04, .5, at=(-Wd / 2 - 1.3, yy + .22 * (1 if k else -1), .45)), lp('Stuhl_gruen', '#4a6b3a', .9))]
        tb += [(box(.03, .03, .42, at=(-Wd / 2 - 1.3 + sx * .2, yy + sy * .2, 0)), alu) for sx in (-1, 1) for sy in (-1, 1)]
    multi('Campingmoebel', T(tb), c)
    ring = []
    for i in range(8):
        a = 6.283 * i / 8; ring.append((ico(.18, at=(-Wd / 2 - 4.0 + .65 * math.cos(a), -1.5 + .65 * math.sin(a), .05), sub=1, jit=.2, seed=500 + i, sz=.7), lp('Fels', '#8a8780', .9)))
    ring.append((cyl(.5, .02, at=(-Wd / 2 - 4.0, -1.5, 0), seg=9), lp('Asche', '#3b3836', .95)))
    multi('Wohnwagen_Feuerstelle', T(ring), c, collide=0, interact='use', use='lagerfeuer', label='Feuerstelle')
    cl = [(cyl(.04, 2.0, at=(-Wd / 2 - 3.0, 2.0, 0), seg=6), wood), (cyl(.04, 2.0, at=(-Wd / 2 - 3.0, 5.0, 0), seg=6), wood), (box(.01, 3.0, .01, at=(-Wd / 2 - 3.0, 3.5, 1.9)), lp('Leine', '#e9e4d8', .9)),
          (box(.03, .5, .6, at=(-Wd / 2 - 3.0, 3.0, 1.3)), lp('Waesche_rot', '#b8452c', .9)), (box(.03, .4, .5, at=(-Wd / 2 - 3.0, 4.0, 1.4)), lp('Waesche_blau', '#2d7dd2', .9))]
    multi('Waescheleine', T(cl), c, collide=0)
    bike = [(torus(.33, .03, at=(0, -.5, .35), seg=12, seg2=4, axis='X'), rust), (torus(.33, .03, at=(0, .55, .35), seg=12, seg2=4, axis='X'), rust),
            (box(.04, 1.0, .04, at=(0, 0, .6)), rust), (box(.04, .04, .4, at=(0, .3, .5)), rust), (box(.12, .25, .05, at=(0, -.2, .85)), blk)]
    bk = []
    for bm_, m in bike:
        bmesh.ops.rotate(bm_, cent=(0, 0, 0), matrix=Matrix.Rotation(1.3, 3, 'Y'), verts=bm_.verts); move(bm_, (Wd / 2 + 1.2, -1.0, .05)); bk.append((bm_, m))
    multi('Fahrrad', T(bk), c, collide=0)
    for i in range(4):
        b = cyl(.06, .9, at=(-.45, 0, 0), seg=5, axis='X'); rotz(b, i * .7); p_ = W(-Wd / 2 - 3.6 + .35 * i, -2.8 + .25 * i, 0); move(b, (p_[0], p_[1], max(terrain_h(p_[0] + .4, p_[1]), terrain_h(p_[0] - .4, p_[1]), p_[2]) + .1))
        obj(f'Ast_Camp_{i}', b, lp('Rinde', '#5a4030', .9), c, collide=0, interact='pickup', item='ast', label='Trockener Ast')
    spot('ziel_wohnwagen', W(0, 0, FZ), quest='wohnwagen')
