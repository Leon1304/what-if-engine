# Section 7 – backyard and tutorial stations: generator (needs a full canister), wooden shed with diesel drum + hand pump,
# woodpile with axe and chopping block, dumpsters with lids, planter with the back-door key, gas bottle cage, bench + ashtray,
# the broken-down car on the road (start: trunk with backpack + torch, hazard lights, warning triangle), bus stop.
COLL = '07 Hof & Auto'
F = .25

def build(c):
    steel = lp('Stahl', '#9da2a6', .35, .8, var=.04); blk = lp('Kunststoff_schwarz', '#232426', .6, var=.03); grey = lp('Grau_dunkel', '#5b5f63', .6, var=.04)
    red = lp('Waldtank_rot', '#c42a26', .5, var=.03); yel = lp('Warngelb', '#e8b923', .5, var=.03); grn = lp('Waldtank_gruen', '#2f6b3a', .5, var=.03)
    wood = lp('Schuppen_Holz', '#8a6a48', .9, var=.08); wood_d = lp('Schuppen_Holz_d', '#6b5038', .9, var=.08); bark = lp('Rinde', '#5a4030', .9, var=.08)
    cut = lp('Holz_hell', '#c9a273', .8, var=.06); conc = lp('Beton', '#b3b0a8', .9, var=.05)

    # ---- generator on a concrete pad behind the shop, cable into the wall
    gx, gy = 40.0, -1.0
    G = [(box(2.2, 1.3, .15, at=(gx, gy, 0)), conc), (box(1.9, 1.0, 1.1, at=(gx, gy, .15), bevel_w=.04), lp('Aggregat', '#e0a526', .5, .2)),
         (box(1.95, 1.05, .06, at=(gx, gy, 1.25)), grey), (box(.5, .02, .35, at=(gx - .5, gy - .51, .65)), blk),
         (box(.12, .01, .06, at=(gx - .62, gy - .525, .9)), glow('Display_aus', '#1c2a24', .2)), (cyl(.05, .02, at=(gx - .35, gy - .52, .75), seg=8, axis='Y'), red),
         (cyl(.07, .5, at=(gx + .7, gy + .3, 1.25), seg=8), steel), (cyl(.09, .05, at=(gx + .7, gy + .3, 1.75), seg=8), steel),
         (cyl(.08, .06, at=(gx + .3, gy, 1.31), seg=8), blk)]
    for i in range(8): G.append((box(.02, .01, .5, at=(gx + .1 + .1 * i, gy - .51, .5)), grey))
    multi('Generator', G, c, interact='use', use='generator', label='Stromaggregat', needs='kanister_voll')
    cable = []
    pts = [(gx - .95, gy + .2, .4), (gx - 1.6, gy + .2, .05), (36.95, gy + .2, .05), (36.95, gy + .2, 1.0)]
    for a, b in zip(pts, pts[1:]):
        d = Vector(b) - Vector(a); cy_ = cyl(.03, d.length, seg=5); bmesh.ops.transform(cy_, matrix=d.normalized().to_track_quat('Z', 'Y').to_matrix().to_4x4(), verts=cy_.verts)
        cable.append(move(cy_, a))
    obj('Generator_Kabel', merge(*cable), blk, c, collide=0)
    obj('Steckdose_Wand', box(.15, .1, .2, at=(37.0, gy + .2, 1.0)), grey, c, collide=0)
    spot('ziel_generator', (gx, gy, 1.0), quest='generator')

    # ---- shed (3 × 2.6 m) with door, diesel drum + hand pump, tools
    sx, sy = 44.0, -12.0; S = []
    S += [(box(3.2, 2.8, .12, at=(sx, sy, 0)), conc)]
    for i in range(16):                                           # vertical boards
        yy = sy - 1.3 + .173 * i
        S.append((box(.08, .17, 2.4, at=(sx + 1.5, yy, .12)), wood if i % 2 else wood_d))
    for i in range(18):
        xx = sx - 1.5 + .177 * i
        S.append((box(.177, .08, 2.4, at=(xx + .088, sy + 1.3, .12)), wood if i % 2 else wood_d))
        if not (-.6 < xx - sx < .45): S.append((box(.177, .08, 2.4, at=(xx + .088, sy - 1.3, .12)), wood if i % 2 else wood_d))
    S.append((box(1.1, .08, .3, at=(sx - .05, sy - 1.3, 2.22)), wood_d))
    for i in range(16): S.append((box(.08, .173, 2.4, at=(sx - 1.5, sy - 1.3 + .173 * i + .086, .12)), wood if i % 2 else wood_d))
    roof = box(3.6, 3.2, .1, at=(sx, sy, 2.55)); bmesh.ops.rotate(roof, cent=(sx, sy, 2.6), matrix=Matrix.Rotation(.12, 3, 'Y'), verts=roof.verts)
    S.append((roof, lp('Wellblech', '#7b8287', .5, .5, var=.05)))
    multi('Schuppen', S, c)
    door_parts = [(box(1.0, .06, 2.1, at=(sx - .05, sy - 1.32, .12)), wood_d), (box(1.0, .07, .12, at=(sx - .05, sy - 1.32, .5)), wood), (box(1.0, .07, .12, at=(sx - .05, sy - 1.32, 1.7)), wood),
                  (box(.06, .1, .06, at=(sx + .35, sy - 1.36, 1.1)), steel)]
    multi('Schuppen_Tuer', door_parts, c, pivot=(sx - .55, sy - 1.32, .12), interact='door', angle=math.radians(-105), label='Schuppentür')
    multi('Dieselfass', [(cyl(.3, .9, at=(sx + .8, sy + .6, .12), seg=12), lp('Fass_blau', '#2a5aa8', .5, .4)), (torus(.3, .02, at=(sx + .8, sy + .6, .4), seg=12, seg2=4, axis='Z'), steel),
                         (torus(.3, .02, at=(sx + .8, sy + .6, .75), seg=12, seg2=4, axis='Z'), steel), (cyl(.03, .5, at=(sx + .8, sy + .6, 1.02), seg=6), steel),
                         (box(.25, .06, .06, at=(sx + .9, sy + .6, 1.45)), red), (cyl(.02, .3, at=(sx + .7, sy + .45, 1.2), seg=5, axis='Y'), blk)],
          c, interact='use', use='handpumpe', label='Dieselfass mit Handpumpe', needs='kanister')
    multi('Werkbank', [(box(1.4, .6, .05, at=(sx - .6, sy + 1.0, .95)), wood), (box(.05, .55, .83, at=(sx - 1.25, sy + 1.0, .12)), wood_d), (box(.05, .55, .83, at=(sx + .05, sy + 1.0, .12)), wood_d),
                       (box(1.3, .02, .8, at=(sx - .6, sy + 1.25, 1.3)), lp('Lochwand', '#c9a273', .8))] +
          [(box(.04, .02, .3, at=(sx - 1.1 + .25 * i, sy + 1.22, 1.5)), steel) for i in range(5)], c)
    multi('Brecheisen', [(box(.04, .04, .7, at=(sx - .2, sy + 1.2, 1.0), rz=0), red)], c, collide=0, interact='pickup', item='brecheisen', label='Brecheisen')
    multi('Schaufel', [(box(.04, .04, 1.1, at=(sx - 1.3, sy + .4, .3)), wood), (box(.22, .02, .3, at=(sx - 1.3, sy + .4, .12)), steel)], c, collide=0)

    # ---- woodpile with axe + chopping block (trail starts behind it)
    wx, wy = 43.0, 5.5; W = [(box(3.4, 1.1, .1, at=(wx, wy, 0)), wood_d), (box(3.6, 1.4, .08, at=(wx, wy, 1.6)), lp('Wellblech', '#7b8287', .5, .5))]
    for sx_ in (-1.7, 1.7):
        for sy_ in (-.6, .6): W.append((box(.08, .08, 1.6, at=(wx + sx_, wy + sy_, 0)), wood_d))
    R = random.Random(9)
    for row in range(4):
        for i in range(10):
            W.append((cyl(.13 + R.uniform(-.02, .02), 1.0, at=(wx - 1.5 + .32 * i + (row % 2) * .16, wy - .5, .1 + .25 * row + .13), seg=6, axis='Y'), bark))
            W.append((cyl(.12, .02, at=(wx - 1.5 + .32 * i + (row % 2) * .16, wy - .51, .1 + .25 * row + .13), seg=6, axis='Y'), cut))
    multi('Holzstapel', W, c, interact='pickup', item='holz', label='Brennholz', infinite=1)
    multi('Hackklotz', [(cyl(.3, .5, at=(wx + .5, wy - 1.6, 0), seg=8), bark), (cyl(.29, .02, at=(wx + .5, wy - 1.6, .5), seg=8), cut)], c)
    axe = [(box(.05, .05, .75, at=(0, 0, 0)), lp('Axtstiel', '#b08a5a', .8)), (box(.06, .2, .1, at=(0, .06, .68)), steel)]
    ab = []
    for bm_, m in axe:
        bmesh.ops.rotate(bm_, cent=(0, 0, 0), matrix=Matrix.Rotation(.5, 3, 'X'), verts=bm_.verts); move(bm_, (wx + .5, wy - 1.75, .45)); ab.append((bm_, m))
    multi('Axt', ab, c, collide=0, interact='pickup', item='axt', label='Axt')
    for i in range(3):
        b = cyl(.08, .4, seg=5, axis='X'); rotz(b, i * 1.3); move(b, (wx + 1.1 + .1 * i, wy - 1.9 + .2 * i, .05))
        obj(f'Holzscheit_{i}', b, cut, c, collide=0, interact='pickup', item='holz', label='Holzscheit')
    obj('Wegweiser_Pfad', merge(box(.1, .1, 1.4, at=(46.2, 4.4, 0)), box(.6, .05, .18, at=(46.5, 4.4, 1.15), rz=.3)), wood, c)
    obj('Wegweiser_Text', text_bm('HOCHSITZ', .08, at=(46.5, 4.33, 1.2), rz=.3, depth=.01), lp('Waldtank_weiss', '#f1f0ea', .5), c, collide=0)

    # ---- dumpsters with hinged lids, recycling bins
    for k, dy in enumerate((11.5, 13.3)):
        dx = 40.5
        multi(f'Container_{k}', [(box(1.2, 1.6, 1.15, at=(dx, dy, .1), bevel_w=.04), lp('Container', '#2f5f46' if k == 0 else '#3c4a5c', .6, .3)),
                                 (box(1.25, .1, .1, at=(dx, dy - .8, .9)), steel)] + [(cyl(.07, .05, at=(dx + sx_ * .45, dy + sy_ * .65, .03), seg=6), blk) for sx_ in (-1, 1) for sy_ in (-1, 1)], c)
        multi(f'Container_Deckel_{k}', [(box(1.25, 1.65, .05, at=(dx, dy, 1.25)), blk)], c, pivot=(dx + .62, dy, 1.25), interact='lid', axis=[0, 1, 0], angle=math.radians(110),
              label='Müllcontainer', search=('lappen' if k else ''))
    for k, col in enumerate(('#2d7dd2', '#f0b429', '#7a5232')):
        multi(f'Tonne_{k}', [(box(.6, .7, 1.0, at=(38.8, 10.8 + .7 * k, .1), bevel_w=.03), lp(f'Tonne_{k}', col, .6)), (box(.62, .74, .05, at=(38.8, 10.8 + .7 * k, 1.1)), blk)], c)

    # ---- planter next to the back door (hides the key)
    multi('Blumenkuebel', [(box(.6, .6, .55, at=(37.6, -6.4, .1), bevel_w=.03), lp('Kuebel', '#9c5a3c', .8)), (box(.5, .5, .04, at=(37.6, -6.4, .6)), lp('Erde', '#3b2a1e', 1.0)),
                           (ico(.3, at=(37.6, -6.4, .8), sub=1, jit=.25, seed=3, sz=.9), lp('Busch', '#4f7a34', .9, var=.1))], c,
          interact='search', item='schluessel_hinten', label='Blumenkübel', found='Unter dem Kübel liegt ein Schlüssel!')

    # ---- gas bottle cage + bench + ashtray on the sidewalk
    gc = [(box(1.6, .8, .08, at=(19.4, -12.6, .1)), grey)]
    for i in range(9): gc.append((box(.03, .03, 1.5, at=(18.65 + .19 * i, -12.98, .18)), steel))
    for i in range(5): gc.append((box(.03, .03, 1.5, at=(18.62, -12.98 + .19 * i, .18)), steel)); gc.append((box(.03, .03, 1.5, at=(20.18, -12.98 + .19 * i, .18)), steel))
    gc += [(box(1.6, .8, .05, at=(19.4, -12.6, 1.68)), steel)]
    for i in range(6): gc.append((cyl(.15, .65, at=(18.85 + .22 * i, -12.6, .18), seg=8), lp('Gasflasche', '#4e7fb8', .5, .3)))
    gc.append((text_bm('GAS', .2, at=(19.4, -13.02, 1.3), depth=.01), red))
    multi('Gaskaefig', gc, c)
    multi('Bank', [(box(1.8, .45, .05, at=(20.4, 7.5, F + .45)), wood), (box(1.8, .05, .4, at=(20.4, 7.72, F + .55)), wood),
                   (box(.06, .45, .45, at=(19.6, 7.5, F)), steel), (box(.06, .45, .45, at=(21.2, 7.5, F)), steel)], c)
    multi('Aschenbecher', [(cyl(.15, .9, at=(20.3, 6.6, F), seg=8), steel), (cyl(.16, .05, at=(20.3, 6.6, F + .9), seg=8), blk)], c)

    # ---- the broken-down car (start of the game): east shoulder south of the station, facing north, hazard lights on
    y0 = -82.0; x0 = road_x(y0) + 3.0; rz = math.atan2(1, road_x(y0 + .5) - road_x(y0 - .5)) - math.pi / 2
    body = lp('Auto_Lack', '#3e6f9e', .35, .4, var=.03); gl = glass('Autoglas', '#2c3a44', .55); chrome = lp('Chrom', '#cfd3d6', .2, .9)
    tyre = lp('Reifen', '#1b1b1c', .9); rim = lp('Felge', '#b9bdc0', .3, .8); tail = glow('Ruecklicht', '#ff2a1a', 2); head = glow('Scheinwerfer', '#fff6e0', 1)
    blink = glow('Warnblinker', '#ff9a1a', 3)
    def car_local(parts):
        out = []
        for bm_, m in parts:
            rotz(bm_, rz); move(bm_, (x0, y0, .05)); out.append((bm_, m))
        return out
    CB = [(box(1.75, 3.3, .55, at=(0, .4, .3), bevel_w=.08, seg=2), body), (box(1.6, 2.2, .5, at=(0, -.15, .85), bevel_w=.1, seg=2), body),
          (box(1.75, .8, .15, at=(0, -1.65, .3)), body), (box(.08, .8, .55, at=(-.835, -1.65, .3)), body), (box(.08, .8, .55, at=(.835, -1.65, .3)), body),   # open trunk: floor + sides
          (box(1.6, .76, .02, at=(0, -1.65, .45)), lp('Kofferraum_Teppich', '#2a2b2e', .95)),
          (box(1.62, 1.6, .42, at=(0, -.15, .9)), gl), (box(1.5, .05, .4, at=(0, .97, .9), rz=0), gl), (box(1.5, .05, .4, at=(0, -1.27, .9)), gl),
          (box(1.8, .15, .22, at=(0, 2.07, .25), bevel_w=.03), grey), (box(1.8, .15, .22, at=(0, -2.07, .25), bevel_w=.03), grey),
          (box(.35, .03, .14, at=(-.6, 2.06, .55)), head), (box(.35, .03, .14, at=(.6, 2.06, .55)), head), (box(.4, .5, .03, at=(0, 2.1, .35)), chrome),
          (box(.3, .03, .14, at=(-.65, -2.06, .62)), tail), (box(.3, .03, .14, at=(.65, -2.06, .62)), tail),
          (box(.1, .03, .08, at=(-.8, -2.07, .5)), blink), (box(.1, .03, .08, at=(.8, -2.07, .5)), blink), (box(.08, .1, .06, at=(-.88, 1.9, .55)), blink), (box(.08, .1, .06, at=(.88, 1.9, .55)), blink),
          (box(.1, .25, .08, at=(-.92, .55, .95)), body), (box(.1, .25, .08, at=(.92, .55, .95)), body)]
    for sx_ in (-1, 1):
        for sy_ in (-1.3, 1.3):
            CB.append((cyl(.33, .22, at=(sx_ * .8 - (.11 if sx_ > 0 else -.11) * 0, sy_, .33), seg=12, axis='X'), tyre))
            CB.append((cyl(.2, .23, at=(sx_ * .8, sy_, .33), seg=8, axis='X'), rim))
    car = multi('Auto_Panne', car_local(CB), c, label='Dein Auto', interact='use', use='auto', hazard=1)
    # trunk lid (hinged at the roof edge), driver door, hood slightly open (steam point)
    multi('Auto_Kofferraum', car_local([(box(1.74, .06, .45, at=(0, -2.02, .4), bevel_w=.02), body), (box(1.74, .82, .05, at=(0, -1.64, .82), bevel_w=.02), body),
                                        (box(.5, .02, .12, at=(0, -2.06, .45)), lp('Kennzeichen', '#f2f2ee', .5)), (box(.12, .03, .03, at=(0, -2.06, .66)), chrome)]), c,
          pivot=tuple(Matrix.Rotation(rz, 4, 'Z') @ Vector((0, -1.24, .87)) + Vector((x0, y0, .05))), interact='lid', axis=[math.cos(rz), math.sin(rz), 0], angle=math.radians(-85), label='Kofferraum')
    multi('Auto_Fahrertuer', car_local([(box(.06, 1.05, .5, at=(-.89, .35, .3)), body), (box(.04, 1.0, .38, at=(-.82, .35, .82)), gl), (box(.04, .15, .03, at=(-.93, .05, .65)), chrome)]), c,
          pivot=tuple(Matrix.Rotation(rz, 4, 'Z') @ Vector((-.89, .88, 0)) + Vector((x0, y0, .05))), interact='door', angle=math.radians(-70), label='Fahrertür')
    hood = [(box(1.6, 1.2, .05, at=(0, 1.4, .58)), body)]
    hb = car_local(hood); hood_o = multi('Auto_Motorhaube', hb, c, pivot=tuple(Matrix.Rotation(rz, 4, 'Z') @ Vector((0, .8, .62)) + Vector((x0, y0, .05))))
    hood_o.rotation_euler = Matrix.Rotation(math.radians(8), 4, Vector((math.cos(rz), math.sin(rz), 0))).to_euler()
    # trunk contents
    tz = .47
    multi('Rucksack', car_local([(box(.4, .25, .32, at=(-.4, -1.6, tz), bevel_w=.05, seg=2), lp('Rucksack', '#4a6b3a', .9)), (box(.3, .05, .16, at=(-.4, -1.75, tz + .08)), lp('Rucksack_d', '#36502b', .9))]),
          c, collide=0, interact='pickup', item='rucksack', label='Rucksack')
    multi('Taschenlampe', car_local([(cyl(.03, .22, at=(.15, -1.75, tz + .03), seg=8, axis='X'), blk), (cyl(.04, .05, at=(.37, -1.75, tz + .03), seg=8, axis='X'), steel)]),
          c, collide=0, interact='pickup', item='taschenlampe', label='Taschenlampe')
    multi('Wasserflasche_Auto', car_local([(cyl(.035, .22, at=(.55, -1.45, tz), seg=8), lp('Flasche_wasser', '#e9eef0', .3))]), c, collide=0, interact='pickup', item='wasser', label='Wasser')
    tri = car_local([(move(prism([(-.25, 0), (.25, 0), (0, .43)], .03), (0, -12, .05)), red), (move(prism([(-.15, .06), (.15, .06), (0, .32)], .031, y=-.001), (0, -12, .05)), lp('Waldtank_weiss', '#f1f0ea', .5))])
    multi('Warndreieck', tri, c, collide=0)
    sp = Matrix.Rotation(rz, 4, 'Z') @ Vector((-2.4, -1.0, 0)) + Vector((x0, y0, 0))
    spot('spawn', (sp.x, sp.y, 1.7), rz, quest='start')
    light('warnblinker', tuple(Matrix.Rotation(rz, 4, 'Z') @ Vector((0, -2.3, .55)) + Vector((x0, y0, 0))), '#ff9a1a', 20, group='blinker', kind='blink')

    # ---- bus stop on the west side north of the station
    by = 40.0; bx = road_x(by) - 5.2; bz = terrain_h(bx, by)
    B = [(box(3.2, 1.6, .12, at=(bx, by, bz)), conc), (box(3.0, .06, 2.2, at=(bx - .6, by, bz + .12)), glass('Glas_Bus', '#cfe2e8', .3)),
         (box(3.3, 1.5, .08, at=(bx - .1, by, bz + 2.35)), lp('Dach_Bus', '#4a5560', .5, .4))]
    for sy_ in (-1.4, 1.4):
        for sx_ in (-.65, .55): B.append((box(.07, .07, 2.25, at=(bx + sx_, by + sy_, bz + .12)), lp('Mast', '#6d7277', .5, .6)))
    B += [(box(.4, 2.2, .05, at=(bx - .3, by, bz + .55)), wood), (box(.05, 1.4, .9, at=(bx - .6, by, bz + .9)), lp('Fahrplan', '#f2f2ee', .6))]
    B += [(cyl(.04, 2.6, at=(bx + 1.2, by + 1.8, bz), seg=6), lp('Mast', '#6d7277', .5, .6)), (cyl(.25, .04, at=(bx + 1.2, by + 1.8 - .02, bz + 2.4), seg=14, axis='Y'), yel),
          (text_bm('H', .3, at=(bx + 1.2, by + 1.77, bz + 2.27), rz=math.pi, depth=.01), grn)]
    o = multi('Bushaltestelle', B, c)
    multi('Fahrplan', [(box(.02, .5, .6, at=(bx - .57, by, bz + 1.1)), lp('Papier', '#ffffff', .8))], c, collide=0, interact='read', label='Fahrplan',
          text='Linie 412 · Waldtank → Ortsmitte. Mo–Fr 7:12 und 16:40. Wochenende kein Verkehr.')
