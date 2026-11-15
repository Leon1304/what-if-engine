# Section 13 – forester's house, radio mast and the pass barrier (main map).
#   Forsthaus „Eichengrund“ (west of the road, y 128): wood-clad house, locked – a note on the door says the key is „bei den Rehen“
#   (the deer feeder nearby). Inside: desk with Henning's diary (clue: code of the radio hut = height of the Hirschkopf, 612), wall calendar
#   (14.3. = Bello's birthday), gun cabinet with a 4-digit code lock (1403), bed, tiled stove, table, antlers, herbs.
#   Funkstation Nordwald on the bald hill in the south-west: lattice mast (26 m, red warning light), concrete hut with a keypad door (612),
#   inside the transmitter (needs the generator outside → full canister), the barrier key on a hook and the station logbook.
#   Pass barrier at the north end of the road (PASS_Y): locked boom (key from the radio hut), signs – behind it the road to the mountains.
COLL = '13 Forsthaus & Funkturm'

def solid(pts, vec):
    bm = bmesh.new(); f = bm.faces.new([bm.verts.new(p) for p in pts])
    ex = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, vec=vec, verts=[v for v in ex['geom'] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return bm

def build(c):
    R = random.Random(1313)
    board = lp('Holzverschalung', '#6e4a30', .85, var=.07); board_d = lp('Holzverschalung_d', '#56391f', .85, var=.07); roof = lp('Ziegel_braun', '#7b4a34', .8, var=.08)
    stone = lp('Bruchstein', '#8f8576', .9, var=.1); plank = lp('Dielen', '#a07850', .8, var=.06); wood = lp('Holz_Tresen', '#9c6b43', .7, var=.05); wood_d = lp('Holz_dunkel', '#6b4630', .7, var=.05)
    gl = glass('Glas_Dorf', '#bcd3dc', .3); steel = lp('Stahl', '#9da2a6', .35, .8, var=.04); blk = lp('Kunststoff_schwarz', '#232426', .6, var=.03)
    green_s = lp('Fensterladen', '#3f6a4a', .7, var=.04); paper = lp('Papier', '#ffffff', .8); paper_o = lp('Papier_alt', '#efe4c4', .8, var=.03)
    concrete = lp('Beton', '#a3a199', .9, var=.05); concrete_d = lp('Beton_dunkel', '#7f7d76', .9, var=.05); red = lp('Waldtank_rot', '#c42a26', .5, var=.03)
    white = lp('Weiss_glanz', '#f4f4f1', .3, var=.02); yel = lp('Schild_gelb', '#f2c230', .5, var=.02); bone = lp('Geweih', '#d9cdb4', .7, var=.06)
    hay = lp('Heu', '#d8b863', .95, var=.1); bark = lp('Rinde', '#5a4030', .9, var=.08); door_m = lp('Haustuer', '#5e3a22', .7, var=.04)
    Z = terrain_h

    # ------------------------------------------------------------ forester's house (9 × 7 m, door east, gable along x)
    fx, fy = FORSTHAUS; z = Z(fx, fy); FL = z + .35; T = .22; H = 2.7
    x0, x1, y0, y1 = fx - 4.5, fx + 4.5, fy - 3.5, fy + 3.5
    P = [(box(9.2, 7.2, .4, at=(fx, fy, z - .05), bevel_w=.03), stone), (box(9 - 2 * T, 7 - 2 * T, .03, at=(fx, fy, FL - .02)), plank)]
    DOOR = (3.0, 1.06, 0, 2.15)                                       # east wall, offset from the south corner
    walls = {'S': ((x0, y0 + T / 2), (x1, y0 + T / 2), [(1.4, 1.0, .9, 1.95), (5.6, 1.0, .9, 1.95)]), 'N': ((x0, y1 - T / 2), (x1, y1 - T / 2), [(6.0, 1.0, .9, 1.95)]),
             'W': ((x0 + T / 2, y0 + T), (x0 + T / 2, y1 - T), [(2.4, 1.0, .9, 1.95)]), 'E': ((x1 - T / 2, y0 + T), (x1 - T / 2, y1 - T), [DOOR, (.6, .9, .9, 1.95)])}
    for sd, (a, b, ops) in walls.items():
        P.append((wall(a, b, T, H, ops, FL), board))
        for o in ops:
            P.append((frame(a, b, T, o, FL, .07, T + .04), wood_d))
            if o[2] > 0:
                s_, w_ = o[0], o[1]
                if sd in 'SN': cx_ = a[0] + s_ + w_ / 2; P.append((box(w_ - .1, .02, 1.0, at=(cx_, a[1], FL + .92)), gl)); P += [(box(.5, .04, 1.1, at=(cx_ + k * (w_ / 2 + .27), a[1] + (-1 if sd == 'S' else 1) * (T / 2 + .03), FL + .87)), green_s) for k in (-1, 1)]
                else: cy_ = a[1] + s_ + w_ / 2; P.append((box(.02, w_ - .1, 1.0, at=(a[0], cy_, FL + .92)), gl)); P += [(box(.04, .5, 1.1, at=(a[0] + (-1 if sd == 'W' else 1) * (T / 2 + .03), cy_ + k * (w_ / 2 + .27), FL + .87)), green_s) for k in (-1, 1)]
    for i in range(12):                                                                              # vertical battens on the cladding
        for sd, yy in (('S', y0 - .02), ('N', y1 + .02)):
            xx = x0 + .4 + i * .75
            if not any(a_ - .1 < xx - x0 < a_ + w_ + .1 for a_, w_, *_ in walls[sd][2]): P.append((box(.06, .04, H, at=(xx, yy, FL)), board_d))
    ov = .5; zt = FL + H; half = 3.5 + ov; rh = half * math.tan(math.radians(38))
    for s_ in (-1, 1):
        ye = fy + s_ * half
        P.append((solid([(x0 - ov, ye, zt - ov * .78), (x1 + ov, ye, zt - ov * .78), (x1 + ov, fy, zt + rh - ov * .78), (x0 - ov, fy, zt + rh - ov * .78)], (0, 0, .14)), roof))
    for xx in (x0, x1 - T): P.append((solid([(xx, y0, zt), (xx, y1, zt), (xx, fy, zt + 3.5 * math.tan(math.radians(38)))], (T, 0, 0)), board))
    P.append((box(9 + 2 * ov, .22, .22, at=(fx, fy, zt + rh - ov * .78 + .02)), roof))
    P += [(box(.55, .55, 3.6, at=(x0 + 1.2, fy - 1.6, zt - .4), bevel_w=.02), stone), (box(.65, .65, .08, at=(x0 + 1.2, fy - 1.6, zt + 3.2)), concrete_d)]   # chimney
    P += [(box(1.4, 1.6, .2, at=(x1 + .7, y0 + T + DOOR[0] + .53, z - .02)), stone)]                                                                         # door step
    # antlers over the door + sign
    for k in (-1, 1):
        a_ = cyl(.03, .5, at=(0, 0, 0), seg=4); bmesh.ops.rotate(a_, cent=(0, 0, 0), matrix=Matrix.Rotation(k * .6, 3, 'X'), verts=a_.verts); P.append((move(a_, (x1 + .08, y0 + DOOR[0] + .53, FL + 2.45)), bone))
        for t_ in (.2, .35): b_ = cyl(.02, .2, at=(0, 0, 0), seg=4); bmesh.ops.rotate(b_, cent=(0, 0, 0), matrix=Matrix.Rotation(k * 1.2, 3, 'X'), verts=b_.verts); P.append((move(b_, (x1 + .08, y0 + DOOR[0] + .53 + k * t_ * .55, FL + 2.45 + t_ * .8)), bone))
    P.append((box(.12, .3, .22, at=(x1 + .06, y0 + DOOR[0] + .53, FL + 2.32), bevel_w=.03), wood_d))
    multi('Forsthaus', P, c, indoor=[x0, y0, x1, y1, round(z - .5, 2), round(FL + 3.2, 2)])
    multi('Forsthaus_Schild', [(box(.04, 2.0, .45, at=(x1 + .04, fy + 2.3, FL + 1.95)), lp('Schild_creme', '#efe4c4', .6)),
                               (text_bm('FORSTHAUS EICHENGRUND', .12, at=(x1 + .07, fy + 2.3, FL + 2.1), rz=math.pi / 2, depth=.01), wood_d)], c, collide=0)
    hinge = (x1 - T / 2, y0 + T + DOOR[0] + .06, FL)
    leaf = [(box(.06, .94, 2.03, at=(0, .47, 0), bevel_w=.01), door_m), (box(.07, .7, .5, at=(0, .47, 1.3)), lp('Haustuer_hell', '#7a4e30', .7)), (box(.14, .04, .04, at=(0, .82, 1.0)), steel)]
    multi('Forsthaus_Tuer', [(move(b_, hinge), m) for b_, m in leaf], c, pivot=hinge, interact='door', angle=math.radians(100), label='Haustür Forsthaus', locked=1, key='schluessel_forst',
          locked_msg='Abgeschlossen. An der Tür hängt ein Zettel.')
    multi('Zettel_Forsthaus', [(box(.01, .2, .26, at=(x1 + .02, y0 + T + DOOR[0] - .3, FL + 1.45)), paper)], c, collide=0, interact='read', label='Zettel an der Tür',
          text='Bin oben im Revier und dann rauf zur Steinberghütte.<br>Den Schlüssel findet, wer ihn braucht – <b>wie immer bei den Rehen</b>.<br>– H.')
    # interior: desk with diary (west), calendar, gun cabinet (north), bed (south-west), tiled stove, table, shelf with herbs
    P = [(box(1.4, .7, .05, at=(x0 + .65, fy + .9, FL + .74)), wood), (box(.06, .66, .74, at=(x0 + .02, fy + .9, FL)), wood_d), (box(.06, .66, .74, at=(x0 + 1.3, fy + .9, FL)), wood_d),
         (box(.45, .45, .04, at=(x0 + .95, fy + 1.5, FL + .44)), wood), (box(.45, .04, .5, at=(x0 + .95, fy + 1.73, FL + .46)), wood_d), (box(.25, .18, .2, at=(x0 + .35, fy + .65, FL + .79)), lp('Lampe_gruen', '#2f5a3a', .5))]
    P += [(box(1.0, 2.0, .35, at=(x0 + 1.0, y0 + 1.2, FL), bevel_w=.02), wood), (box(.94, 1.9, .16, at=(x0 + 1.0, y0 + 1.2, FL + .35), bevel_w=.04, seg=2), white),
          (box(.95, 1.3, .06, at=(x0 + 1.0, y0 + 1.5, FL + .5), bevel_w=.02), lp('Stoff_gruen', '#58744a', .95)), (box(.06, 1.0, .9, at=(x0 + .52, y0 + 1.2, FL)), wood_d)]
    P += [(box(1.0, .7, 1.5, at=(fx + .9, y1 - .6, FL), bevel_w=.04), lp('Kacheln', '#7a4a3a', .5, var=.06)), (box(1.1, .8, .08, at=(fx + .9, y1 - .6, FL + 1.5)), stone)]
    P += [(box(1.3, .8, .05, at=(fx - .2, fy - .6, FL + .72), bevel_w=.01), wood)] + [(box(.06, .06, .72, at=(fx - .2 + sx * .55, fy - .6 + sy * .3, FL)), wood_d) for sx in (-1, 1) for sy in (-1, 1)]
    for sx in (-1, 1): P += [(box(.4, .4, .04, at=(fx - .2 + sx * .9, fy - .6, FL + .44)), wood)] + [(box(.04, .04, .44, at=(fx - .2 + sx * .9 + a_ * .16, fy - .6 + b_ * .16, FL)), wood_d) for a_ in (-1, 1) for b_ in (-1, 1)]
    P += [(box(.3, 1.2, .03, at=(x1 - .36, fy + 2.2, FL + .9 + .45 * i)), wood) for i in range(3)] + [(box(.3, .04, 1.85, at=(x1 - .36, fy + 2.2 + s_ * .6, FL)), wood_d) for s_ in (-1, 1)]
    for k, yy in enumerate((fy - .9, fy + .3)):                                                       # antler trophies on the south wall
        P.append((box(.2, .04, .28, at=(x0 + 3.6 + k * 1.6, y0 + T + .02, FL + 1.9), bevel_w=.02), wood_d))
        for s_ in (-1, 1):
            a_ = cyl(.02, .42, seg=4); bmesh.ops.rotate(a_, cent=(0, 0, 0), matrix=Matrix.Rotation(s_ * .55, 3, 'Y'), verts=a_.verts); P.append((move(a_, (x0 + 3.6 + k * 1.6, y0 + T + .06, FL + 2.0)), bone))
    multi('Forsthaus_Einrichtung', P, c)
    multi('Forsthaus_Bett', [(box(.9, 1.85, .02, at=(x0 + 1.0, y0 + 1.25, FL + .52)), lp('Stoff_gruen', '#58744a', .95))], c, collide=0, interact='use', use='bett', label='Bett des Försters')
    multi('Tagebuch_Henning', [(box(.25, .32, .035, at=(x0 + .75, fy + .95, FL + .79), rz=.15), lp('Buch_braun', '#6b4630', .7)), (box(.23, .3, .005, at=(x0 + .75, fy + .95, FL + .83), rz=.15), paper_o)], c,
          collide=0, interact='read', label='Tagebuch des Försters', reveal='funkturm',
          text='<b>Henning Albers, Revierförster</b><br>2.10. Der Steinschlag hat die Passstraße verschüttet. Die Straßenmeisterei hat oben die Schranke zugemacht – den Schlüssel haben sie in die <b>Funkstation</b> auf dem Kahlberg gehängt (südwestlich der Tankstelle).<br>'
               '5.10. Der Code der Funkhütte ist leicht: <b>so hoch wie der Hirschkopf</b>, die Zahl steht ja am Turm.<br>9.10. Ich geh rauf zur Steinberghütte und schau, ob oben alles heil ist. Den Waffenschrank-Code merk ich mir mit Kurts Hund – Bello hat Geburtstag, das steht im Kalender.<br><i>Die Funkstation ist jetzt auf deiner Karte eingetragen.</i>')
    multi('Kalender_Forsthaus', [(box(.32, .02, .45, at=(x0 + 2.6, y1 - T - .02, FL + 1.5)), paper), (box(.32, .025, .1, at=(x0 + 2.6, y1 - T - .025, FL + 1.85)), red)], c, collide=0, interact='read', label='Wandkalender',
          text='<b>März</b><br>3.3. Nistkästen kontrollieren<br><b>14.3. 🎂 Bellos Geburtstag – Wurst mitnehmen!</b><br>21.3. Wildzählung<br>28.3. Holz machen')
    # gun cabinet (north wall, east part): body + door with a 4-digit code (day + month of Bello's birthday: 1403)
    gx, gy = fx + 3.25, y1 - T - .3
    sg = lp('Stahl_gruen', '#3a4a3a', .4, .5)                                                      # hollow steel cabinet, open at the front (door below)
    multi('Waffenschrank', [(box(1.0, .04, 1.95, at=(gx, gy + .23, FL)), sg), (box(.04, .5, 1.95, at=(gx - .48, gy, FL)), sg), (box(.04, .5, 1.95, at=(gx + .48, gy, FL)), sg),
                            (box(1.0, .5, .04, at=(gx, gy, FL + 1.91)), sg), (box(1.0, .5, .06, at=(gx, gy, FL)), sg), (box(.9, .42, .03, at=(gx, gy, FL + .5)), wood_d),
                            (box(.9, .04, .06, at=(gx, gy + .15, FL + 1.35)), wood_d)] + [(box(.04, .06, .5, at=(gx - .3 + .2 * k, gy + .12, FL + .9)), wood_d) for k in range(4)], c)
    multi('Waffenschrank_Inhalt', [(box(.12, .08, .06, at=(gx - .25, gy - .05, FL + .53), bevel_w=.005), lp('Munition_0', '#3a5a3a', .6)), (box(.12, .08, .06, at=(gx - .05, gy - .05, FL + .53), bevel_w=.005), lp('Munition_0', '#3a5a3a', .6)),
                                   (box(.1, .06, .14, at=(gx + .2, gy - .05, FL + .53), bevel_w=.01), white), (box(.04, .065, .04, at=(gx + .2, gy - .08, FL + .62)), red)], c,
          collide=0, interact='search', label='Waffenschrank (innen)', item='patronen_gewehr', loot=[['patronen_gewehr', 2], ['medizin', 1], ['patronen_schrot', 1]],
          found='Zwei Schachteln Gewehrpatronen, Schrotpatronen und eine Packung Medizin.')
    hinge = (gx - .5, gy - .26, FL + .02)
    multi('Waffenschrank_Tuer', [(box(.98, .04, 1.9, at=(gx, gy - .27, FL + .02)), lp('Stahl_gruen', '#3a4a3a', .4, .5)), (box(.12, .05, .16, at=(gx + .32, gy - .3, FL + 1.1)), blk),
                                 (box(.08, .055, .1, at=(gx + .32, gy - .31, FL + 1.12)), lp('Display_Code', '#2a3a2a', .3))], c,
          pivot=hinge, interact='door', angle=math.radians(-105), label='Waffenschrank', locked=1, code='1403', locked_msg='Ein Zahlenschloss mit vier Ziffern.')
    multi('Kraeuter_Forsthaus', [(cyl(.06, .25, at=(x1 - .36, fy + 2.0, FL + .93), seg=6), lp('Kraut_gruen', '#6f9a3a', .9, var=.1)), (cyl(.04, .03, at=(x1 - .36, fy + 2.0, FL + 1.18), seg=6), lp('Bluete_weiss', '#f1efe6', .8))], c,
          collide=0, interact='pickup', item='kraeuter', label='Kamillenbund')
    # woodpile behind the house (endless firewood) + deer feeder with the key in the hay
    multi('Holzstapel_Forsthaus', [(box(.9, 2.2, 1.3, at=(x0 - .75, fy - .6, z - .02)), bark), (box(1.1, 2.4, .08, at=(x0 - .75, fy - .6, z + 1.35)), roof)], c, interact='pickup', item='holz', label='Brennholz', infinite=1)
    kx, ky = fx + 9.0, fy + 9.5; kz = Z(kx, ky); P = []
    for sx in (-1, 1):
        for sy in (-1, 1): P.append((box(.12, .12, 2.1, at=(kx + sx * .9, ky + sy * .5, kz - .1)), bark))
    for s_ in (-1, 1): P.append((solid([(kx - 1.15, ky + s_ * .8, kz + 1.85), (kx + 1.15, ky + s_ * .8, kz + 1.85), (kx + 1.15, ky, kz + 2.4), (kx - 1.15, ky, kz + 2.4)], (0, 0, .08)), roof))
    P += [(box(1.8, .9, .08, at=(kx, ky, kz + .7)), wood_d), (box(1.8, .06, .5, at=(kx, ky - .42, kz + .75)), wood_d), (box(1.8, .06, .5, at=(kx, ky + .42, kz + .75)), wood_d)]
    for i in range(7): P.append((box(.04, .9, .04, at=(kx - .8 + .27 * i, ky, kz + 1.2), rz=0), wood))
    multi('Futterkrippe', P, c)
    multi('Futterkrippe_Heu', [(ico(.45, at=(kx - .4, ky, kz + .95), sub=1, jit=.25, seed=1301, sz=.6), hay), (ico(.42, at=(kx + .45, ky, kz + .92), sub=1, jit=.25, seed=1302, sz=.6), hay)], c,
          collide=0, interact='search', label='Heu in der Futterkrippe', item='schluessel_forst', loot=[['schluessel_forst', 1]], found='Im Heu steckt ein Schlüssel mit Anhänger: „Forsthaus“.')
    multi('Wegweiser_Forsthaus', [(cyl(.06, 2.2, at=(road_x(126) - 5.0, 125.0, Z(road_x(126) - 5, 125)), seg=6), wood_d),
                                  (box(1.4, .05, .3, at=(road_x(126) - 5.6, 125.0, Z(road_x(126) - 5, 125) + 1.8)), lp('Schild_creme', '#efe4c4', .6)),
                                  (text_bm('Forsthaus ◄', .14, at=(road_x(126) - 5.6, 124.97, Z(road_x(126) - 5, 125) + 1.88), depth=.01), wood_d)], c, collide=0)
    spot('ziel_forsthaus', (fx, fy, FL), quest='forsthaus')

    # ------------------------------------------------------------ radio station on the bald hill: lattice mast + concrete hut
    mx, my = FUNKTURM[0] - 2.5, FUNKTURM[1]; mz = Z(mx, my); P = []; Hm = 26.0
    leg = lambda k, t: (mx + (1 if k in (0, 3) else -1) * (1.6 - 1.25 * t), my + (1 if k in (0, 1) else -1) * (1.6 - 1.25 * t), mz + Hm * t)
    def beam(p0, p1, r=.05):
        d = Vector(p1) - Vector(p0); b_ = cyl(r, d.length, seg=4)
        bmesh.ops.transform(b_, matrix=d.normalized().to_track_quat('Z', 'Y').to_matrix().to_4x4(), verts=b_.verts); return move(b_, p0)
    for k in range(4): P.append((beam(leg(k, 0), leg(k, 1), .07), steel))
    for i in range(9):
        t0, t1 = i / 9, (i + 1) / 9
        for k in range(4):
            a0, a1, b0, b1 = leg(k, t0), leg(k, t1), leg((k + 1) % 4, t0), leg((k + 1) % 4, t1)
            P += [(beam(a0, b1, .03), steel), (beam(b0, a1, .03), steel), (beam(a1, b1, .035), red if i % 3 == 2 else white)]
    P.append((box(2.0, 2.0, .08, at=(mx, my, mz + Hm * 4 / 9 - .04)), lp('Gitterrost', '#6f7377', .4, .6)))
    P.append((cyl(.06, 4.0, at=(mx, my, mz + Hm), seg=6), steel))
    for k, (dx, dy, az) in enumerate(((.5, 0, 0), (0, .5, math.pi / 2), (-.5, 0, math.pi))):
        dish = dome(.55, at=(0, 0, 0), seg=10, rings=3, h=.25); bmesh.ops.rotate(dish, cent=(0, 0, 0), matrix=Matrix.Rotation(-math.pi / 2, 3, 'Y'), verts=dish.verts); rotz(dish, az)
        P.append((move(dish, (mx + dx, my + dy, mz + Hm * .8 + k * .9)), white))
    multi('Funkmast', P, c)
    obj('Funkmast_Warnlicht', ico(.16, at=(mx, my, mz + Hm + 4.1), sub=1), glow('Warnlicht_rot', '#ff2a1a', 3.0), c, collide=0)
    light('funkmast', (mx, my, mz + Hm + 4.4), color='#ff3a2a', power=12, group='funk')
    # hut 3.2 × 2.6 (door north, keypad 612)
    hx, hy = FUNKTURM[0] + 3.6, FUNKTURM[1] - .5; hz = Z(hx, hy); HF = hz + .2; T = .2; Hh = 2.5
    x0, x1, y0, y1 = hx - 1.6, hx + 1.6, hy - 1.3, hy + 1.3
    P = [(box(3.4, 2.8, .3, at=(hx, hy, hz - .1)), concrete_d), (box(3.2 - 2 * T, 2.6 - 2 * T, .02, at=(hx, hy, HF - .01)), concrete),
         (wall((x0, y1 - T / 2), (x1, y1 - T / 2), T, Hh, [(1.1, 1.0, 0, 2.05)], HF), concrete), (wall((x0, y0 + T / 2), (x1, y0 + T / 2), T, Hh, [(1.2, .8, 1.3, 1.8)], HF), concrete),
         (wall((x0 + T / 2, y0 + T), (x0 + T / 2, y1 - T), T, Hh, (), HF), concrete), (wall((x1 - T / 2, y0 + T), (x1 - T / 2, y1 - T), T, Hh, (), HF), concrete),
         (box(3.6, 3.0, .15, at=(hx, hy, HF + Hh)), concrete_d), (box(.8, .02, .5, at=(x0 + 1.6, y0 + T / 2, HF + 1.3)), gl)]
    P += [(box(1.0, .04, .5, at=(hx - .2, y1 + .03, HF + 2.15)), yel), (text_bm('FUNKSTATION NORDWALD', .07, at=(hx - .2, y1 + .06, HF + 2.33), rz=math.pi, depth=.005), blk),
          (text_bm('Zutritt verboten', .06, at=(hx - .2, y1 + .06, HF + 2.21), rz=math.pi, depth=.005), blk)]
    P += [(box(.16, .05, .22, at=(x0 + 2.45, y1 + .03, HF + 1.1), bevel_w=.01), blk), (box(.1, .055, .05, at=(x0 + 2.45, y1 + .035, HF + 1.24)), lp('Display_Code', '#2a3a2a', .3))]     # keypad
    # rack with the transmitter, desk with logbook, chair; cable duct up to the mast
    P += [(box(.7, .6, 1.9, at=(x1 - .55, y0 + .5, HF), bevel_w=.01), lp('Rack_grau', '#4a4e52', .4, .4)), (box(1.4, .6, .05, at=(x0 + .9, y0 + .5, HF + .74)), wood),
          (box(.05, .55, .74, at=(x0 + .25, y0 + .5, HF)), steel), (box(.05, .55, .74, at=(x0 + 1.55, y0 + .5, HF)), steel), (box(.12, .12, 3.0, at=(x0 + .1, hy, HF + 2.3)), steel)]
    multi('Funkhuette', P, c, indoor=[x0, y0, x1, y1, hz - .5, HF + Hh + .1])
    hinge = (x0 + 1.1 + .04, y1 - T / 2, HF)
    multi('Funkhuette_Tuer', [(box(.98, .06, 2.0, at=(x0 + 1.1 + .53, y1 - T / 2, HF)), lp('Stahltuer', '#5a6268', .4, .5)), (box(.14, .1, .04, at=(x0 + 1.1 + .9, y1 - T / 2 + .06, HF + 1.0)), steel)], c,
          pivot=hinge, interact='door', angle=math.radians(-100), label='Stahltür (Zahlenschloss)', locked=1, code='612', locked_msg='Ein Tastenfeld mit drei Ziffern. Daneben: „Code: Höhe Hirschkopf“ – mit Bleistift drangekritzelt.')
    multi('Funksender', [(box(.6, .05, .3, at=(x1 - .55, y0 + .79, HF + 1.1)), lp('Display_Funk', '#1a2a22', .3)), (box(.6, .05, .25, at=(x1 - .55, y0 + .79, HF + .7)), blk),
                         (cyl(.04, .04, at=(x1 - .7, y0 + .82, HF + .5), seg=8, axis='Y'), steel), (cyl(.04, .04, at=(x1 - .4, y0 + .82, HF + .5), seg=8, axis='Y'), steel)], c,
          collide=0, interact='use', use='sender', label='Funksender')
    multi('Funk_Logbuch', [(box(.25, .32, .03, at=(x0 + .7, y0 + .45, HF + .79), rz=-.1), lp('Buch_blau', '#2f4a7a', .7)), (box(.23, .3, .005, at=(x0 + .7, y0 + .45, HF + .82), rz=-.1), paper_o)], c,
          collide=0, interact='read', label='Stationsbuch', text='<b>Funkstation Nordwald – Stationsbuch</b><br>Notstrom: Aggregat hinter der Hütte, Diesel nachfüllen!<br>Schlüssel Pass-Schranke hängt am Haken neben der Tür.<br>Kanal 3: Bergwacht · Kanal 7: Steinberghütte.')
    multi('Schluessel_Schranke', [(box(.04, .01, .09, at=(x0 + 1.0, y1 - T - .02, HF + 1.5)), lp('Messing', '#c9a84a', .3, .7)), (torus(.025, .006, at=(x0 + 1.0, y1 - T - .02, HF + 1.57), seg=8, seg2=3, axis='Y'), lp('Messing', '#c9a84a', .3, .7)),
                                  (box(.06, .005, .04, at=(x0 + 1.0, y1 - T - .025, HF + 1.42)), red)], c, collide=0, interact='pickup', item='schluessel_schranke', label='Schlüssel „Pass-Schranke“')
    gx_, gy_ = hx, y0 - 1.1
    multi('Funkaggregat', [(box(1.2, .7, .75, at=(gx_, gy_, Z(gx_, gy_)), bevel_w=.02), lp('Aggregat_gelb', '#d9a322', .6, .2)), (box(1.0, .6, .1, at=(gx_, gy_, Z(gx_, gy_) + .75)), blk),
                           (cyl(.06, .4, at=(gx_ + .45, gy_, Z(gx_, gy_) + .85), seg=6), steel), (box(.3, .02, .2, at=(gx_ - .2, gy_ - .36, Z(gx_, gy_) + .4)), lp('Display_aus', '#1d2a22', .3))], c,
          interact='use', use='funkaggregat', label='Notstrom-Aggregat')
    multi('Wegweiser_Funk', [(cyl(.06, 2.2, at=(CAMP[0] - 4.5, CAMP[1] - 7.5, Z(CAMP[0] - 4.5, CAMP[1] - 7.5)), seg=6), wood_d),
                             (box(1.4, .05, .3, at=(CAMP[0] - 5.1, CAMP[1] - 7.5, Z(CAMP[0] - 4.5, CAMP[1] - 7.5) + 1.8)), lp('Schild_creme', '#efe4c4', .6)),
                             (text_bm('Funkstation ◄', .13, at=(CAMP[0] - 5.1, CAMP[1] - 7.53, Z(CAMP[0] - 4.5, CAMP[1] - 7.5) + 1.88), depth=.01), wood_d)], c, collide=0)
    spot('ziel_funkturm', (FUNKTURM[0], FUNKTURM[1], hz), quest='funkturm')

    # ------------------------------------------------------------ pass barrier at the north end of the road
    rx = road_x(PASS_Y); y = PASS_Y; rz_ = .1
    P = [(box(.35, .35, 1.0, at=(rx - 4.3, y, rz_), bevel_w=.03), white), (box(.37, .37, .12, at=(rx - 4.3, y, rz_ + .45)), red), (box(.3, .3, .9, at=(rx + 4.1, y, rz_)), white), (box(.32, .2, .12, at=(rx + 4.1, y, rz_ + .9)), blk)]
    sx = rx + 6.2; sz = Z(sx, y - 1)
    P += [(cyl(.05, 2.6, at=(sx, y - 1.0, sz), seg=6), steel), (cyl(.05, 2.6, at=(sx + 1.6, y - 1.0, sz), seg=6), steel), (box(2.1, .04, .9, at=(sx + .8, y - 1.0, sz + 1.65)), lp('Schild_blau', '#2a5aa8', .5)),
          (text_bm('STEINBERG-PASS', .17, at=(sx + .8, y - 1.03, sz + 2.2), rz=0, depth=.01), white), (text_bm('Steinberghütte 12 km', .12, at=(sx + .8, y - 1.03, sz + 1.95), depth=.01), white),
          (box(2.1, .04, .35, at=(sx + .8, y - 1.0, sz + 1.25)), red), (text_bm('GESPERRT – STEINSCHLAG', .11, at=(sx + .8, y - 1.03, sz + 1.33), depth=.01), white)]
    multi('Schranke_Pfosten', P, c)
    pv = (rx - 4.3, y, rz_ + .85); B_ = []
    for i in range(8): B_.append((box(1.0, .1, .12, at=(rx - 4.3 + .1 + .5 + i * 1.0, y, rz_ + .79)), red if i % 2 else white))
    B_ += [(box(.3, .3, .3, at=(rx - 4.3 + .05, y, rz_ + .7), bevel_w=.03), white), (box(.02, .08, .02, at=(rx + 3.5, y, rz_ + .92)), red)]
    multi('Schranke', B_, c, pivot=pv, interact='lid', axis=[0, 1, 0], angle=-1.45, label='Schranke', locked=1, key='schluessel_schranke',
          locked_msg='Abgeschlossen. Am Vorhängeschloss baumelt ein Schild: „Schlüssel in der Funkstation Nordwald“.')
    multi('Infotafel_Pass', [(cyl(.05, 1.6, at=(rx - 6.2, y - 2.0, Z(rx - 6.2, y - 2)), seg=6), wood_d), (box(1.0, .05, .7, at=(rx - 6.2, y - 2.0, Z(rx - 6.2, y - 2) + 1.2), rz=.3), wood),
                             (box(.9, .02, .6, at=(rx - 6.2, y - 2.04, Z(rx - 6.2, y - 2) + 1.25), rz=.3), paper_o)], c, collide=0, interact='read', label='Infotafel Passstraße', reveal='funkturm,forsthaus',
          text='<b>Passstraße Steinberg</b><br>Nach dem Steinschlag vom 1.10. gesperrt. Schlüssel für Rettungsdienste: <b>Funkstation Nordwald</b> (Kahlberg, südwestlich der Tankstelle).<br>Revierförster H. Albers: Forsthaus Eichengrund an der Straße südlich des Dorfes.<br><i>Beide Orte sind jetzt auf deiner Karte eingetragen.</i>')
    spot('pass_tal', (rx + 1.75, y - 8.0, .1), rz=math.pi, quest='pass')

    # ------------------------------------------------------------ north beyond the map edge (only seen, never walked): the pass road runs on
    # into the forest and the ground rises to a wooded ridge – so you never look into the void behind the barrier
    cols = [lp('Gras', '#6f9a3a', var=.07), lp('Waldboden', '#6b5236', var=.08), lp('Moos', '#55702f', var=.07)]
    rr = random.Random(1399); step = 2.5; X0, X1, Y0, Y1 = -110.0, 110.0, MAP_Y1 - .5, MAP_Y1 + 60
    def hN(x, y):
        d = abs(x - road_x(y)); rise = (max(0.0, y - MAP_Y1) / 60) ** 1.5 * 22
        return terrain_h(x, MAP_Y1 - .5) * (1 - min(1, (y - MAP_Y1 + .5) / 20)) + (rise if d > 7 else rise * .25) * min(1, max(0, (d - 4) / 8) + .25) - (0 if d > 7 else 0)
    bm = bmesh.new(); vs = []; NX, NY = int((X1 - X0) / step), int((Y1 - Y0) / step)
    for j in range(NY + 1):
        vs.append([bm.verts.new((X0 + i * step + (rr.uniform(-.8, .8) if 0 < i < NX and 0 < j else 0), Y0 + j * step + (rr.uniform(-.8, .8) if 0 < j < NY else 0), 0)) for i in range(NX + 1)])
    for row in vs:
        for v in row: v.co.z = hN(v.co.x, v.co.y)
    for j in range(NY):
        for i in range(NX):
            a, b, cc, d = vs[j][i], vs[j][i + 1], vs[j + 1][i + 1], vs[j + 1][i]
            for tri in ((a, b, cc), (a, cc, d)):
                f = bm.faces.new(tri); p_ = f.calc_center_median(); f.material_index = 0 if abs(p_.x - road_x(p_.y)) < 12 else 1 + (rr.random() < .3)
    _finish('Gelaende_Nord', bm, cols, c, None, False, 0, {}, 13)
    rd = bmesh.new(); prev = None
    for k in range(31):
        y = MAP_Y1 - 1 + k * 2.0; x = road_x(y); z = hN(x, y) + .1
        cur = [rd.verts.new((x - 3.5, y, z)), rd.verts.new((x + 3.5, y, z))]
        if prev: rd.faces.new((prev[0], prev[1], cur[1], cur[0]))
        prev = cur
    obj('Passstrasse_Nord', rd, lp('Asphalt', '#4b4d52', .9, var=.05), c, collide=0)
    V = [bpy.data.objects[f'Fichte_{k}'] for k in range(4)] + [bpy.data.objects[f'Kiefer_{k}'] for k in range(2)]
    n = 0
    for gx in range(-108, 108, 5):
        for gy in range(int(MAP_Y1) + 1, int(MAP_Y1) + 58, 5):
            x, y = gx + rr.uniform(0, 5), gy + rr.uniform(0, 5)
            if abs(x - road_x(y)) < 6 or rr.random() < .25: continue
            src = rr.choice(V); inst(src, f'Nordwald_{n}', (x, y, hN(x, y) - .1), rr.uniform(0, 6.28), rr.uniform(.9, 1.3), c=c, collide=0); n += 1

