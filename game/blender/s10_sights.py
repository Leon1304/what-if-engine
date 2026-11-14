# Section 10 – sights with loot: lookout tower „Hirschkopf“ (stair tower 8.4 m, panorama board that marks all sights on the map),
# castle ruin „Falkenstein“ (broken ring wall, gate arch, tower stump with chest, rubble), old quarry (stone piles = endless stones,
# boulders, rusty excavator, worker's trailer with door and cupboard), water mill at the creek (wheel turns in the game, millstones,
# flour sacks) and the jute sacks spread over the map (SACKS in core.py).
COLL = '10 Sehenswuerdigkeiten'

def solid(pts, vec):
    bm = bmesh.new(); f = bm.faces.new([bm.verts.new(p) for p in pts])
    ex = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, vec=vec, verts=[v for v in ex['geom'] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return bm

def build(c):
    R = random.Random(1010)
    wood = lp('Turm_Holz', '#9a7550', .9, var=.08); wood_d = lp('Turm_Holz_d', '#6b5038', .9, var=.08); roof = lp('Schindeln', '#5a4a3a', .9, var=.08)
    stone = lp('Burgstein', '#9b968a', .95, var=.12); stone_d = lp('Burgstein_d', '#7a756b', .95, var=.12); moss = lp('Fels_moos', '#6f7a55', .9, var=.1)
    steel = lp('Stahl', '#9da2a6', .35, .8, var=.04); rust = lp('Rost', '#8a4f2a', .9, var=.1); yel = lp('Bagger_gelb', '#d9a322', .6, .2, var=.06)
    blk = lp('Kunststoff_schwarz', '#232426', .6); gl = glass('Glas_Bauwagen', '#9fb6bf', .35); paper = lp('Papier', '#ffffff', .8)
    jute = lp('Jute', '#b08d57', .95, var=.1); rope = lp('Seil', '#c9b38a', .9); flour = lp('Mehlsack', '#e9e2cf', .95, var=.05)
    Z = terrain_h

    # ------------------------------------------------------------ lookout tower: 4 × 4 m stair tower, six flights of 7 steps (0.2 m) round the open core
    cx, cy = TOWER; z0 = Z(cx, cy) + .05; P = []; RISE, NST = .2, 7; FLIGHT = RISE * NST; TOP = z0 + 6 * FLIGHT
    corners = {'SW': (-1.55, -1.55), 'SE': (1.55, -1.55), 'NE': (1.55, 1.55), 'NW': (-1.55, 1.55)}
    order = ['SW', 'SE', 'NE', 'NW']
    def beam(p0, p1, t=.06):
        d = Vector(p1) - Vector(p0); bm_ = cyl(t / 2, d.length, seg=4)
        bmesh.ops.transform(bm_, matrix=d.normalized().to_track_quat('Z', 'Y').to_matrix().to_4x4(), verts=bm_.verts); return move(bm_, p0)
    P.append((box(4.4, 4.4, .25, at=(cx, cy, z0 - .2)), stone_d))                                   # footing
    for k in range(6):
        a, b = corners[order[k % 4]], corners[order[(k + 1) % 4]]; zb = z0 + k * FLIGHT
        P.append((box(.9, .9, .1, at=(cx + a[0], cy + a[1], zb - .1 + (0 if k else .1))), wood))       # landing at the start corner
        alongx = a[0] != b[0]; sg = math.copysign(1, (b[0] - a[0]) if alongx else (b[1] - a[1]))
        for s_ in range(NST):
            u = a[0 if alongx else 1] + sg * (.45 + 2.2 * (s_ + .5) / NST)
            x, y = (u, a[1]) if alongx else (a[0], u)
            P.append((box(.33 if alongx else .9, .9 if alongx else .33, .07, at=(cx + x, cy + y, zb + RISE * (s_ + 1) - .07)), wood))
        # stringers + inner and outer handrails along the flight
        for off in (1.1, 2.0):
            u0 = a[0 if alongx else 1] + sg * .45; u1 = a[0 if alongx else 1] + sg * 2.65; w_ = math.copysign(off, a[1] if alongx else a[0])
            pa = (cx + u0, cy + w_) if alongx else (cx + w_, cy + u0); pb = (cx + u1, cy + w_) if alongx else (cx + w_, cy + u1)
            P.append((beam((pa[0], pa[1], zb - .05), (pb[0], pb[1], zb + FLIGHT - .05), .12), wood_d))
            for hh in (.5, 1.0): P.append((beam((pa[0], pa[1], zb + hh), (pb[0], pb[1], zb + FLIGHT + hh)), wood_d))
            for t_ in (0, .5, 1): P.append((box(.06, .06, 1.0, at=(pa[0] + (pb[0] - pa[0]) * t_, pa[1] + (pb[1] - pa[1]) * t_, zb + FLIGHT * t_)), wood_d))
    for (px, py) in ((-2.0, -2.0), (2.0, -2.0), (2.0, 2.0), (-2.0, 2.0), (-1.1, -1.1), (1.1, -1.1), (1.1, 1.1), (-1.1, 1.1)):
        P.append((box(.16, .16, TOP - z0 + (2.5 if abs(px) > 1.5 else 0), at=(cx + px, cy + py, z0 - .1)), wood_d))
    for k in range(1, 4):                                                                           # diagonal braces on the outside (not in the bottom storey: entrance)
        for s in (-1, 1):
            zA, zB = z0 + k * 2.1, z0 + (k + 1) * 2.1
            P.append((beam((cx - 2.05, cy + s * 2.05, zA), (cx + 2.05, cy + s * 2.05, zB), .1), wood_d)); P.append((beam((cx + s * 2.05, cy - 2.05, zA), (cx + s * 2.05, cy + 2.05, zB), .1), wood_d))
    # top platform: core + north band + west band (south / east bands stay open above the last flights)
    P += [(box(2.2, 2.2, .1, at=(cx, cy, TOP - .1)), wood), (box(4.0, .9, .1, at=(cx, cy + 1.55, TOP - .1)), wood), (box(.9, 3.1, .1, at=(cx - 1.55, cy - .45, TOP - .1)), wood)]
    for (xa, ya, xb, yb) in ((-1.1, -1.1, 1.1, -1.1), (-1.1, -2.0, -1.1, -1.1), (1.1, -1.1, 1.1, 1.1),        # edges towards the open stair bands
                             (-2.0, 2.0, 2.0, 2.0), (-2.0, -2.0, -2.0, 2.0), (2.0, 1.1, 2.0, 2.0), (-2.0, -2.0, -1.1, -2.0)):
        for hh in (.5, 1.0): P.append((beam((cx + xa, cy + ya, TOP + hh), (cx + xb, cy + yb, TOP + hh)), wood_d))
    rf = TOP + 2.5
    for s in (-1, 1): P.append((solid([(cx - 2.4, cy + s * 2.4, rf), (cx + 2.4, cy + s * 2.4, rf), (cx + 2.4, cy, rf + 1.3), (cx - 2.4, cy, rf + 1.3)], (0, 0, .12)), roof))
    multi('Aussichtsturm', P, c)
    obj('Turm_Schild', text_bm('HIRSCHKOPF 612 m', .14, at=(cx, cy - 2.12, z0 + 1.6), depth=.01), lp('Waldtank_weiss', '#f1f0ea', .5), c, collide=0)
    multi('Panoramatafel', [(box(.08, .08, 1.0, at=(cx - .9, cy + 1.75, TOP)), wood_d), (box(1.2, .5, .05, at=(cx - .9, cy + 1.7, TOP + 1.0), rz=0), wood), (box(1.1, .45, .02, at=(cx - .9, cy + 1.7, TOP + 1.05)), paper)], c,
          collide=0, interact='read', label='Panoramatafel', reveal='all',
          text='Rundblick vom Hirschkopf:<br>Norden – Dorf Tannbach mit Kapelle · Nordosten – alter Steinbruch · Osten – Bach und alte Mühle<br>Süden – Tankstelle „Waldtank“, Bernds Hochsitz am Bach · Südwesten – Burgruine Falkenstein · Weit im Südwesten – ein Wohnwagen im Wald.<br><i>Alle Orte sind jetzt auf deiner Wanderkarte eingetragen.</i>')
    spot('ziel_turm', (cx, cy, TOP), quest='turm')

    # ------------------------------------------------------------ castle ruin Falkenstein: ring wall (16 × 16 m) with gaps, gate arch (east), round tower stump (NW) with chest
    rx, ry = RUIN; rz0 = Z(rx, ry); P = []
    def wall_run(a, b, hmax, t=1.1):
        L = math.hypot(b[0] - a[0], b[1] - a[1]); n = int(L / 1.0); ang = math.atan2(b[1] - a[1], b[0] - a[0])
        for i in range(n):
            if R.random() < .12: continue                                                        # breaches
            h = hmax * R.uniform(.35, 1.0); u = (i + .5) / n; x = a[0] + (b[0] - a[0]) * u; y = a[1] + (b[1] - a[1]) * u
            blk_ = box(L / n + .02, t, h, at=(x, y, Z(x, y) - .4), rz=ang); jitter(blk_, .06, i)
            P.append((blk_, stone if R.random() < .7 else moss))
    H = 8.0
    wall_run((rx - H, ry - H), (rx + H, ry - H), 4.5); wall_run((rx - H, ry + H), (rx - H, ry - H), 5.0); wall_run((rx + H, ry + H), (rx - H, ry + H), 4.0)
    wall_run((rx + H, ry - H), (rx + H, ry - 1.6), 4.5); wall_run((rx + H, ry + 1.6), (rx + H, ry + H), 4.5)
    gz = Z(rx + H, ry)
    P += [(box(1.2, 1.2, 4.2, at=(rx + H, ry - 2.0, gz - .3)), stone), (box(1.2, 1.2, 4.2, at=(rx + H, ry + 2.0, gz - .3)), stone)]
    arch = prism([(-2.6, 0), (2.6, 0), (2.6, 1.6), (-2.6, 1.6)] , 1.2); rotz(arch, math.pi / 2); move(arch, (rx + H + .6, ry, gz + 3.0)); P.append((arch, stone))
    tx, ty = rx - H + 1.0, ry + H - 1.0; tz = Z(tx, ty)
    for i in range(14):
        a0 = 6.283 * i / 14
        if abs(((a0 - math.radians(-45)) + math.pi) % 6.283 - math.pi) < .35: continue          # doorway towards the courtyard (SE)
        P.append((box(1.1, .9, R.uniform(3.5, 6.5), at=(tx + 2.3 * math.cos(a0), ty + 2.3 * math.sin(a0), tz - .3), rz=a0 + math.pi / 2), stone_d))
    P.append((cyl(1.9, .1, at=(tx, ty, tz - .02), seg=12), lp('Steinboden', '#6d685f', .95)))
    for i in range(10):
        x, y = rx + R.uniform(-6, 6), ry + R.uniform(-6, 6)
        if math.hypot(x - tx, y - ty) < 3.2: continue
        P.append((ico(R.uniform(.25, .6), at=(x, y, Z(x, y)), sub=1, jit=.3, seed=900 + i, sz=.6), stone))
    multi('Burgruine', P, c)
    obj('Burg_Brunnen', merge(*[box(.45, .3, .7, at=(rx + 2.5 + 1.0 * math.cos(6.283 * i / 10), ry - 2.5 + 1.0 * math.sin(6.283 * i / 10), Z(rx + 2.5, ry - 2.5) - .05), rz=6.283 * i / 10 + math.pi / 2) for i in range(10)]), stone_d, c)
    multi('Burg_Truhe', [(box(.9, .55, .5, at=(tx, ty + .6, tz), bevel_w=.02), lp('Truhe', '#6b4630', .8)), (box(.94, .59, .08, at=(tx, ty + .6, tz + .5)), lp('Truhe_d', '#4a3020', .8)),
                         (box(.94, .05, .06, at=(tx, ty + .3, tz + .25)), rust), (box(.1, .03, .12, at=(tx, ty + .31, tz + .38)), lp('Gold', '#d4a83a', .3, .8))], c,
          interact='search', label='Alte Truhe', item='goldmuenze', loot=[['goldmuenze', 2], ['verband', 1], ['kerze', 2], ['patronen_schrot', 1]], found='Zwei alte Goldmünzen, ein Verband, Kerzen und Schrotpatronen!')
    multi('Burg_Schutt', [(ico(.9, at=(rx - 3.0, ry - 5.0, Z(rx - 3, ry - 5)), sub=1, jit=.35, seed=950, sz=.45), stone), (ico(.6, at=(rx - 2.2, ry - 5.4, Z(rx - 2.2, ry - 5.4)), sub=1, jit=.35, seed=951, sz=.5), moss)], c,
          interact='pickup', item='stein', label='Mauerschutt (Steine)', infinite=1)
    spot('ziel_ruine', (rx, ry, rz0), quest='ruine')
    obj('Burg_Schild', merge(box(.1, .1, 1.3, at=(rx + H + 4.5, ry + 3.0, Z(rx + H + 4.5, ry + 3) - .05)), box(.9, .05, .3, at=(rx + H + 4.5, ry + 3.0, Z(rx + H + 4.5, ry + 3) + 1.05))), lp('Hochsitz_Holz', '#8a6a48', .9), c)
    obj('Burg_Schild_Text', text_bm('BURGRUINE FALKENSTEIN', .07, at=(rx + H + 4.5, ry + 2.97, Z(rx + H + 4.5, ry + 3) + 1.13), depth=.01), lp('Waldtank_weiss', '#f1f0ea', .5), c, collide=0)

    # ------------------------------------------------------------ quarry: stone piles (endless), boulders, excavator, trailer
    qx, qy = QUARRY; qz = Z(qx, qy)
    for k, (dx, dy) in enumerate(((-4.0, 5.0), (3.5, 6.0), (5.0, -3.0))):
        x, y = qx + dx, qy + dy; P = [(ico(.6 + .15 * i, at=(x + R.uniform(-.6, .6), y + R.uniform(-.6, .6), Z(x, y) - .1), sub=1, jit=.3, seed=1000 + k * 10 + i, sz=.55), stone if i % 2 else stone_d) for i in range(5)]
        multi(f'Steinhaufen_{k}', P, c, interact='pickup', item='stein', label='Steinhaufen', infinite=1)
    for i in range(9):
        a0 = R.uniform(0, 6.283); d = R.uniform(7, 11); x, y = qx + d * math.cos(a0), qy + d * math.sin(a0)
        if abs(((a0 - math.pi) + math.pi) % 6.283 - math.pi) < .5: continue                      # keep the ramp (west) free
        multi(f'Findling_{i}', [(ico(R.uniform(.9, 1.6), at=(x, y, Z(x, y) - .3), sub=1, jit=.25, seed=1100 + i, sz=.7), stone_d)], c)
    ex, ey = qx - 2.0, qy - 6.0; ez = Z(ex, ey); E = [(box(2.4, 3.2, .7, at=(0, 0, 0), bevel_w=.03), blk), (box(2.2, 2.4, .9, at=(0, .1, .7), bevel_w=.05), yel), (box(1.0, 1.1, 1.2, at=(-.5, -.6, 1.6), bevel_w=.04), yel),
                                                      (box(.9, .02, .8, at=(-.5, -1.16, 1.9)), gl)]
    for sx_ in (-1, 1): E.append((box(.5, 3.4, .6, at=(sx_ * 1.0, 0, 0), bevel_w=.1, seg=2), lp('Kette', '#2c2c2c', .7, .4)))
    boom = box(.35, 3.6, .35, at=(0, 0, 0)); bmesh.ops.rotate(boom, cent=(0, 0, 0), matrix=Matrix.Rotation(.6, 3, 'X'), verts=boom.verts); E.append((move(boom, (.4, -1.2, 1.5)), rust))
    arm = box(.3, 2.4, .3, at=(0, 0, 0)); bmesh.ops.rotate(arm, cent=(0, 0, 0), matrix=Matrix.Rotation(-.9, 3, 'X'), verts=arm.verts); E.append((move(arm, (.4, -2.9, 3.0)), rust))
    E.append((box(.9, .7, .6, at=(.4, -4.4, .1), bevel_w=.04), rust))
    multi('Bagger', [(move(rotz(b_, .4), (ex, ey, ez)), m) for b_, m in E], c)
    wx, wy = qx + 8.5, qy + 3.0; wz = Z(wx, wy); T = .1
    BW = [(box(2.4, 5.0, .25, at=(wx, wy, wz + .45)), lp('Bauwagen_Boden', '#5b5f63', .7)), (box(2.4, 5.0, .08, at=(wx, wy, wz + 3.0)), lp('Wellblech', '#7b8287', .5, .5))]
    BW += [(wall((wx - 1.2 + T / 2, wy - 2.5), (wx - 1.2 + T / 2, wy + 2.5), T, 2.3, [(1.2, .9, 0, 2.0), (3.2, 1.0, 1.0, 1.8)], wz + .7), lp('Bauwagen', '#3e7a3e', .6, var=.05)),
           (wall((wx + 1.2 - T / 2, wy - 2.5), (wx + 1.2 - T / 2, wy + 2.5), T, 2.3, [(2.0, 1.0, 1.0, 1.8)], wz + .7), lp('Bauwagen', '#3e7a3e', .6, var=.05)),
           (wall((wx - 1.1, wy - 2.5 + T / 2), (wx + 1.1, wy - 2.5 + T / 2), T, 2.3, (), wz + .7), lp('Bauwagen', '#3e7a3e', .6, var=.05)),
           (wall((wx - 1.1, wy + 2.5 - T / 2), (wx + 1.1, wy + 2.5 - T / 2), T, 2.3, (), wz + .7), lp('Bauwagen', '#3e7a3e', .6, var=.05))]
    BW += [(box(.02, 1.0, .8, at=(wx - 1.2 + T / 2, wy - 2.5 + 3.7, wz + 1.7)), gl), (box(.02, 1.0, .8, at=(wx + 1.2 - T / 2, wy - 2.5 + 2.5, wz + 1.7)), gl)]
    for sy_ in (-1.8, 1.8): BW.append((cyl(.35, .25, at=(wx - 1.1, wy + sy_, wz + .35), seg=10, axis='X'), lp('Reifen', '#1b1b1c', .9))); BW.append((cyl(.35, .25, at=(wx + .85, wy + sy_, wz + .35), seg=10, axis='X'), lp('Reifen', '#1b1b1c', .9)))
    BW += [(box(.6, 1.2, .23, at=(wx - 1.5, wy - 2.5 + 1.65, wz)), lp('Beton', '#b3b0a8', .9)), (box(.3, 1.2, .23, at=(wx - 1.35, wy - 2.5 + 1.65, wz + .23)), lp('Beton', '#b3b0a8', .9))]
    BW += [(box(1.0, .6, .05, at=(wx + .6, wy + 1.6, wz + 1.45)), lp('Holz_Tresen', '#9c6b43', .7)), (box(.06, .06, .75, at=(wx + .6, wy + 1.6, wz + .7)), steel)]
    multi('Bauwagen', BW, c, indoor=[wx - 1.2, wy - 2.5, wx + 1.2, wy + 2.5, wz, wz + 3.0])
    hinge = (wx - 1.2 + T / 2, wy - 2.5 + 1.2 + .03, wz + .7)
    multi('Bauwagen_Tuer', [(move(box(.05, .86, 1.97, at=(0, .43, 0)), hinge), lp('Bauwagen_Tuer', '#2f5a2f', .6)), (move(box(.08, .03, .12, at=(-.03, .74, .95)), hinge), steel)], c,
          pivot=hinge, interact='door', angle=math.radians(-100), label='Bauwagentür')
    multi('Bauwagen_Spind', [(box(.5, .5, 1.8, at=(wx + .85, wy - 1.9, wz + .7), bevel_w=.01), lp('Spind', '#5c7a8a', .5, .4)), (box(.02, .3, .05, at=(wx + .59, wy - 1.9, wz + 2.2)), steel)], c,
          interact='search', label='Spind', item='dosenbohnen', loot=[['dosenbohnen', 1], ['seil', 1], ['batterien', 1], ['schwarzpulver', 2]], found='Bohnen, ein Seil, Batterien – und zwei Dosen Sprengpulver.')
    multi('Notiz_Brandt', [(box(.21, .3, .004, at=(wx + .55, wy + 1.55, wz + 1.505), rz=.15), paper)], c, collide=0, interact='read', note=5, label='Sprengprotokoll',
          text='Steinwerk Brandt – Sprengprotokoll, Abschnitt C. „Damm geprüft: stabil, keine Gefahr.“ Darunter handschriftlich: „Die Räumung verschafft uns vier Wochen Ruhe ohne Beschwerden der Anwohner. Sprengung 10.11. Kein Wort zur Gemeinde! – H. Brandt“')
    multi('Sprengstoffkiste', [(box(.7, .45, .4, at=(qx + 6.0, qy - 4.0, Z(qx + 6, qy - 4) - .02), bevel_w=.01), lp('Kiste_oliv', '#4a5a3a', .7)), (box(.4, .46, .12, at=(qx + 6.0, qy - 4.0, Z(qx + 6, qy - 4) + .15)), lp('Schild_rot', '#c8262b', .5))], c,
          interact='search', label='Kiste „Sprengmittel“', item='schwarzpulver', loot=[['schwarzpulver', 3], ['metall', 2]], found='Sprengpulver und Metallteile – daraus lässt sich Munition machen (Werkbank).')
    multi('Schrotthaufen', [(box(.6 + .1 * i, .3, .15, at=(qx - 6.0 + .3 * i, qy - 7.5 + .2 * i, Z(qx - 6, qy - 7.5) + .1 * i), rz=i * .7), lp('Rost', '#8a4f2a', .9, var=.1)) for i in range(5)], c,
          interact='pickup', item='metall', label='Schrotthaufen (Metall)', infinite=1)
    spot('ziel_bello', (rx + 3.0, ry + 2.0, Z(rx + 3, ry + 2)), quest='bello')
    multi('Steinbruch_Schild', [(box(.1, .1, 1.6, at=(qx - 16.0, qy + 2.0, Z(qx - 16, qy + 2) - .05)), steel), (box(.05, 1.0, .6, at=(qx - 16.0, qy + 2.0, Z(qx - 16, qy + 2) + 1.0)), lp('Schild_weiss', '#f2f2ee', .5))], c)
    obj('Steinbruch_Text', text_bm('STEINBRUCH – BETRETEN VERBOTEN', .05, at=(qx - 16.04, qy + 2.0, Z(qx - 16, qy + 2) + 1.27), rz=-math.pi / 2, depth=.01), lp('Schild_rot', '#c8262b', .5), c, collide=0)
    spot('ziel_steinbruch', (qx, qy, qz), quest='steinbruch')

    # ------------------------------------------------------------ water mill: stone house 6 × 5 m on the bank, wheel on the creek side (turns in the game)
    mx, my = MILL; mz = Z(mx, my); x0, x1, y0, y1 = mx - 3.0, mx + 3.0, my - 2.5, my + 2.5; T = .4; Hm = 3.2; FL = mz + .2
    mw = lp('Muehle_Stein', '#a39a8a', .95, var=.1); P = [(box(6.2, 5.2, .25, at=(mx, my, mz - .05)), stone_d)]
    P += [(wall((x0 + T / 2, y0), (x0 + T / 2, y1), T, Hm, [(2.0, 1.0, 0, 2.2)], FL), mw), (wall((x1 - T / 2, y0), (x1 - T / 2, y1), T, Hm, [(1.9, 1.0, 1.2, 2.2)], FL), mw),
          (wall((x0 + T, y0 + T / 2), (x1 - T, y0 + T / 2), T, Hm, [(2.0, .9, 1.2, 2.1)], FL), mw), (wall((x0 + T, y1 - T / 2), (x1 - T, y1 - T / 2), T, Hm, (), FL), mw)]
    half = 2.5 + .4; rh = half * math.tan(math.radians(42)); zt = FL + Hm
    for s in (-1, 1): P.append((solid([(x0 - .4, my + s * half, zt - .36), (x1 + .4, my + s * half, zt - .36), (x1 + .4, my, zt + rh - .36), (x0 - .4, my, zt + rh - .36)], (0, 0, .14)), roof))
    for xx in (x0, x1 - T): P.append((solid([(xx, y0, zt), (xx, y1, zt), (xx, my, zt + 2.5 * math.tan(math.radians(42)))], (T, 0, 0)), mw))
    P += [(cyl(.7, .35, at=(mx + .5, my + .8, FL), seg=12), stone), (cyl(.7, .25, at=(mx + .5, my + .8, FL + .35), seg=12), stone_d), (box(1.6, 1.6, .9, at=(mx + .5, my + .8, FL - .02)), wood_d),
          (cyl(.08, 1.2, at=(mx + .5, my + .8, FL + .6), seg=6), wood), (cyl(.1, 2.8, at=(x1 - 1.4, my + .3, FL + 1.5), seg=8, axis='X'), wood_d)]
    P += [(box(.4, 4.5, .4, at=(x1 + 1.6, my + 2.0, mz + 2.3)), wood), (box(.08, 4.5, .4, at=(x1 + 1.4, my + 2.0, mz + 2.5)), wood_d), (box(.08, 4.5, .4, at=(x1 + 1.8, my + 2.0, mz + 2.5)), wood_d)]   # flume
    for sy_ in (-1, 1): P.append((box(.2, .2, 3.0, at=(x1 + 1.6, my + 3.0 + sy_ * .9, Z(x1 + 1.6, my + 3) - .3)), wood_d))
    multi('Muehle', P, c, indoor=[x0, y0, x1, y1, mz - .5, FL + Hm])
    hinge = (x0 + T / 2, y0 + 2.0 + .03, FL)
    multi('Muehle_Tuer', [(move(box(.06, .95, 2.15, at=(0, .47, 0)), hinge), lp('Haustuer', '#5e3a22', .7)), (move(box(.08, .04, .14, at=(-.03, .8, 1.0)), hinge), steel)], c, pivot=hinge, interact='door', angle=math.radians(-100), label='Mühlentür')
    WH = []; wr = 2.0; axle = (x1 + 1.6, my - .6, FL + 1.9)
    for side in (-.35, .35): WH.append((torus(wr, .08, at=(side, 0, 0), seg=16, seg2=4, axis='X'), wood_d))
    for i in range(12):
        a0 = 6.283 * i / 12; pd = box(.75, .06, .5, at=(0, 0, 0)); bmesh.ops.rotate(pd, cent=(0, 0, 0), matrix=Matrix.Rotation(a0, 3, 'X'), verts=pd.verts)
        WH.append((move(pd, (0, (wr - .1) * math.cos(a0), (wr - .1) * math.sin(a0) - .25)), wood))
        sp = box(.06, .06, wr, at=(0, 0, 0)); bmesh.ops.rotate(sp, cent=(0, 0, 0), matrix=Matrix.Rotation(a0, 3, 'X'), verts=sp.verts); WH.append((sp, wood_d))
    WH.append((cyl(.12, 1.4, at=(-1.1, 0, 0), seg=8, axis='X'), steel))
    o = multi('Muehlrad', [(move(b_, axle), m) for b_, m in WH], c, pivot=axle, collide=0, spin=1, spin_axis=[1, 0, 0], spin_speed=.6)
    for k in range(2):
        sx, sy = x0 + .9 + .7 * k, y1 - .9
        multi(f'Mehlsack_{k}', [(ico(.3, at=(sx, sy, FL + .35), sub=2, jit=.1, seed=1200 + k, sz=1.25), flour), (torus(.1, .025, at=(sx, sy, FL + .74), seg=8, seg2=4, axis='Z'), rope),
                                (text_bm('MEHL', .08, at=(sx, sy - .28, FL + .3), depth=.005), lp('Schrift_blau', '#2a4a8a', .6))], c, collide=0, interact='pickup', item='mehl', label='Sack Mehl')
    spot('ziel_muehle', (mx, my, FL), quest='muehle')

    # ------------------------------------------------------------ jute sacks with loot (template + linked copies)
    tmp = coll('_Vorlagen_Sack', c)
    body = ico(.3, at=(0, 0, 0), sub=2, jit=.08, seed=77)
    for v in body.verts:
        z = v.co.z; v.co.x *= .95; v.co.y *= .8
        if z < -.12: v.co.z = -.12 - (z + .12) * .2                                               # flat bottom
        if z > .1: k = 1 - (z - .1) / .25 * .55; v.co.x *= k; v.co.y *= k                       # narrows to the neck
        v.co.z = v.co.z * 1.25 + .15
    S = [(body, jute), (cyl(.09, .14, at=(0, 0, .5), seg=7, r2=.07), jute), (cone(.13, .12, at=(0, 0, .62), seg=6, jit=.3, seed=3), jute),
         (torus(.085, .025, at=(0, 0, .55), seg=8, seg2=4, axis='Z'), rope), (move(cyl(.015, .3, seg=4, axis='X'), (.08, 0, .53)), rope),
         (box(.16, .02, .14, at=(.05, -.255, .2)), lp('Jute_Flicken', '#8a6a3a', .95)), (text_bm('★', .1, at=(-.06, -.245, .3), depth=.005), lp('Schrift_rot', '#9a3b32', .7))]
    src = multi('Sack', S, tmp, collide=0, interact='search', label='Jutesack', item='stein'); src.location = (0, 0, -500)
    for i, (x, y, loot) in enumerate(SACKS):
        z = Z(x, y) - .02
        if math.hypot(x - TOWER[0], y - TOWER[1]) < 3: z = TOP
        inst(src, f'Sack_{i}', (x, y, z), R.uniform(0, 6.28), R.uniform(.9, 1.1), c=c, loot=loot, item=loot[0][0])
