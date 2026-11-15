# Section 16 – story, secrets and rare finds (built before s15_natur, so the nature pass keeps clear of them):
#   · H. Brandt's diary pages Tagebuch_1 … 6 (interact 'read', diary = k; the game supplies the text): workshop „KFZ Brandt“, quarry trailer,
#     castle ruin, lookout tower top, mine portal, inside the mine behind the rubble
#   · the quarry: detonator `Zuendmaschine` (use 'zuender' – the story's decision), dynamite bundles on the pit wall, cable to the detonator
#   · six secret stashes Versteck_* (search, stash = 1, loot with one rare item each) – hollow stump, loose stone, tin box under the jetty,
#     bird box, tin box at the summit cross, hay pile in the hay barn
#   · pickups: chanterelles (valley forest) and edelweiss (rocks below the summit)
#   · rare-item templates bp_r_* (album pictures, dropped items): pocket watch, amber, compass, medal, edelweiss badge, music box, meteorite, bear claw
#   · the bear's den „Baerenhoehle“ on the eastern slope of the mountains + quest spot ziel_grimm (the boss bear „der alte Grimm“)
COLL = '16 Extras'
BPZ = -200.0


def build(c):
    R = random.Random(1616)
    paper = lp('Papier_Tagebuch', '#f1e8cf', .8, var=.03); ink = lp('Tinte', '#2c3550', .6, var=0); leather = lp('Leder_braun', '#6a4428', .8, var=.06)
    wood = lp('Kiste_Holz', '#8a6a48', .9, var=.1); wood_d = lp('Kiste_Holz_d', '#5e4530', .9, var=.1); bark = lp('Rinde', '#5a4030', .9, var=.08)
    moss = lp('Moos_Stumpf', '#5f7a3a', .95, var=.1); rot = lp('Morschholz', '#3a2a1e', .95, var=.08); stone = lp('Burgstein', '#9b968a', .95, var=.12)
    stone_d = lp('Burgstein_d', '#7a756b', .95, var=.12); mortar = lp('Moertel_dunkel', '#4a463f', .95, var=.05); steel = lp('Stahl', '#9da2a6', .35, .8, var=.04)
    tin = lp('Blech_gruen', '#4d5f45', .5, .5, var=.06); tin_g = lp('Blech_grau', '#7d848a', .45, .6, var=.06); rust = lp('Rost', '#8a4f2a', .9, var=.1)
    rope = lp('Seil', '#c9b38a', .9); red = lp('Dynamit_rot', '#b8261f', .7, var=.05); tape = lp('Klebeband', '#26282a', .7, var=.02); wire = lp('Kabel_gelb', '#d8b21e', .6, var=.02)
    wire_r = lp('Kabel_rot', '#a8261e', .6, var=.02); brass = lp('Messing', '#c9a24a', .3, .8, var=.04); gold = lp('Gold', '#d4a83a', .3, .8, var=.03)
    silver = lp('Silber', '#d6d8dc', .25, .9, var=.03); blk = lp('Kunststoff_schwarz', '#232426', .6, var=.03); white = lp('Weiss_glanz', '#f4f4f1', .3, var=.02)
    hay = lp('Heu', '#d8b863', .95, var=.1); hay_d = lp('Heu_alt', '#b39548', .95, var=.1); bone = lp('Knochen', '#e6dcc4', .8, var=.06)
    rock = lp('Fels_Berg', '#7d7a74', .95, var=.1); rock_d = lp('Fels_Berg_d', '#5f5c57', .95, var=.1); scree = lp('Geroell', '#9a948a', .95, var=.1)
    soil = lp('Erde_dunkel', '#3b2e22', 1.0, var=.08); straw = lp('Stroh', '#d8b863', .95, var=.1); bark_s = lp('Rinde_hell', '#b49a78', .9, var=.06)
    chant = lp('Pfifferling', '#e8a92a', .7, var=.08); chant_d = lp('Pfifferling_d', '#c98a1e', .7, var=.08)
    ew = lp('Edelweiss_weiss', '#f1f1ea', .9, var=.04); ew_y = lp('Edelweiss_gelb', '#d9cf8a', .9, var=.05); ew_l = lp('Edelweiss_Blatt', '#9aa58a', .9, var=.06)
    amber = lp('Bernstein', '#e08a1e', .15, 0, alpha=.82, var=.04); glass_c = glass('Glas_Kompass', '#dfeef2', .3)
    lava = lp('Meteorit_Glut', '#ff7a1e', .5, emit='#ff6a10', ei=3.0, var=.05); metrock = lp('Meteorit_Stein', '#2e2a28', .95, var=.08)
    ribbon_r = lp('Band_rot', '#b8261f', .8, var=.02); ribbon_w = lp('Band_weiss', '#efece4', .8, var=.02); ivory = lp('Kralle', '#d9cdb0', .5, var=.04)
    dial = lp('Zifferblatt', '#f6f1e2', .5, var=.0); needle_r = lp('Nadel_rot', '#c42a26', .5, var=0)

    # ---------------------------------------------------------------- free-spot check (trunks, existing objects), so nothing stands inside something else
    obst = []
    for o in bpy.data.objects:
        if o.type != 'MESH' or o.location.z < -100: continue
        if o.get('collide_r'): obst.append((o.location.x - o['collide_r'], o.location.y - o['collide_r'], o.location.x + o['collide_r'], o.location.y + o['collide_r'])); continue
        if o.get('collide') == 0 and not o.get('interact'): continue
        mw = o.matrix_world; cs = [mw @ Vector(b) for b in o.bound_box]
        x0, x1 = min(v.x for v in cs), max(v.x for v in cs); y0, y1 = min(v.y for v in cs), max(v.y for v in cs)
        if x1 - x0 > 12 or y1 - y0 > 12: continue                                         # terrain, merged walls … (placed by hand)
        obst.append((x0, y0, x1, y1))
    def free(x, y, r):
        return not any(x + r > a and x - r < cx and y + r > b and y - r < d for a, b, cx, d in obst)
    def first_free(cands, r):
        for x, y in cands:
            if free(x, y, r): return x, y
        print('s16: no free spot in', cands[:2], '… using the first'); return cands[0]

    def tilt(bm_, ax, a): bmesh.ops.rotate(bm_, cent=(0, 0, 0), matrix=Matrix.Rotation(a, 3, ax), verts=bm_.verts); return bm_
    def T(parts, at, rz=0.0):                                    # parts built around the origin → placed (turned rz, moved to at)
        return [(move(rotz(b_, rz), at), m) for b_, m in parts]

    # ---------------------------------------------------------------- diary page: torn notebook page, written lines, bent corner (lies flat)
    def page(k):
        P = [(box(.15, .205, .002, at=(0, 0, 0)), paper), (tilt(box(.035, .035, .002, at=(0, 0, 0)), 'X', .5), paper)]
        P[1] = (move(P[1][0], (.055, .085, .004)), paper)
        for i in range(7): P.append((box(.11 - .02 * (i % 3 == 2), .0025, .0006, at=(-.008, -.075 + .024 * i, .002)), ink))
        for i in range(5): P.append((box(.006, .006, .001, at=(-.071, -.08 + .04 * i, .0015)), lp('Papier_Loch', '#8a7a5a', .8, var=0)))   # torn ring holes
        if k in (1, 4): P.append((cyl(.004, .14, at=(-.02, -.12, .004), seg=6, axis='X'), lp('Bleistift', '#d9a322', .6, var=0)))
        return P

    def diary(k, at, rz, extra=()):
        multi(f'Tagebuch_{k}', T(page(k), at, rz) + list(extra), c, collide=0, interact='read', diary=k, label='Tagebuchseite')

    # 1 – workshop „KFZ Brandt“: on the workbench next to the tool box
    gz = terrain_h(-52.8, 167.5); GF = gz + .12
    diary(1, (-49.62, 170.15, GF + .952), .35)
    # 2 – quarry: in the worker's trailer on the counter, beside the blasting record
    qx, qy = QUARRY; wx, wy = qx + 8.5, qy + 3.0; wz = terrain_h(wx, wy)
    diary(2, (wx + .9, wy + 1.48, wz + 1.502), -.25)
    # 3 – castle ruin: on a fallen wall block in the courtyard (own block, collides)
    rx, ry = RUIN; bx_, by_ = first_free([(rx + 4.0, ry + 4.2), (rx + 3.0, ry + 5.0), (rx + 5.0, ry + 3.0), (rx - 1.0, ry + 4.5)], 1.0)
    print('s16: ruin block', bx_, by_); bz_ = terrain_h(bx_, by_); blk_ = box(1.3, .8, .62, at=(bx_, by_, bz_ - .12), rz=.4, bevel_w=.04); jitter(blk_, .03, 7)
    multi('Burg_Mauerblock', [(blk_, stone), (box(.5, .4, .1, at=(bx_ + .3, by_ - .1, bz_ - .12), rz=.9), moss)], c)
    diary(3, (bx_ - .05, by_ + .02, bz_ + .5 + .003), 1.1, [(move(ico(.05, sub=1, jit=.3, seed=3), (bx_ + .1, by_ + .1, bz_ + .54)), stone_d)])   # a pebble as paperweight
    # 4 – lookout tower: top platform, on an old fruit crate
    cx, cy = TOWER; TOP = terrain_h(cx, cy) + .05 + 6 * 1.4
    crate = [(box(.42, .3, .02, at=(0, 0, 0)), wood_d)] + [(box(.42, .02, .26, at=(0, s_ * .14, .02)), wood) for s_ in (-1, 1)] + [(box(.02, .3, .26, at=(s_ * .2, 0, .02)), wood) for s_ in (-1, 1)]
    crate += [(box(.42, .3, .015, at=(0, 0, .28)), wood)]
    diary(4, (cx + .62, cy + .55, TOP + .3), .2, T(crate, (cx + .62, cy + .55, TOP), .2))
    # 5 – mine portal (mountains): on a stack of sleepers beside the track, just outside the timber frame
    sx0, sx1, yc, hw = STOLLEN; SZ = STOLLEN_Z
    sl = [(box(.9, .16, .12, at=(0, 0, .12 * i), rz=.1 * (i % 2)), wood_d if i % 2 else wood) for i in range(3)]
    mz = berg_h(sx0 - 1.5, yc - 2.2)
    diary(5, (sx0 - 1.5, yc - 2.2, mz + .362), -.4, T(sl, (sx0 - 1.5, yc - 2.2, mz), .05))
    # 6 – inside the mine behind the rubble: on a flat stone between the crystals
    fs = ico(.22, at=(0, 0, 0), sub=1, jit=.2, seed=61); bmesh.ops.scale(fs, vec=(1.3, 1.0, .35), verts=fs.verts)
    diary(6, (90.9, yc - .25, SZ + .1), .6, [(move(fs, (90.9, yc - .25, SZ + .02)), scree)])

    # ---------------------------------------------------------------- quarry: dynamite on the north wall of the pit, cable, detonator
    qz = terrain_h(qx, qy); Dz = []
    for k, a in enumerate((1.25, 1.5, 1.75)):                                                    # three bundles in drill holes high on the wall
        r_ = 15.2; x, y = qx + r_ * math.cos(a), qy + r_ * math.sin(a); z = terrain_h(x, y)
        out = Vector((math.cos(a), math.sin(a), 0)); tang = Vector((-math.sin(a), math.cos(a), 0))
        B_ = [(cyl(.06, .02, seg=8), lp('Bohrloch', '#1c1a18', .95, var=0))]
        for j in range(4):
            st = cyl(.022, .22, at=((j % 2 - .5) * .045, (j // 2 - .5) * .045, 0), seg=6); B_.append((st, red))
        B_ += [(cyl(.05, .03, at=(0, 0, .06), seg=8), tape), (cyl(.05, .03, at=(0, 0, .16), seg=8), tape), (cyl(.006, .06, at=(0, 0, .22), seg=5), steel)]
        tiltA = math.atan2(1, .9)                                                                  # stick out of the slope (about square to it)
        for b_, m in B_:
            bmesh.ops.rotate(b_, cent=(0, 0, 0), matrix=Matrix.Rotation(-tiltA, 3, tang), verts=b_.verts); move(b_, (x - out.x * .05, y - out.y * .05, z - .04)); Dz.append((b_, m))
        Dz.append((move(box(.12, .08, .002, at=(0, 0, 0), rz=a), (x + tang.x * .18, y + tang.y * .18, z + .02)), lp('Schild_rot', '#c8262b', .5)))   # warning tag
    # cable: from each bundle down the wall, then along the pit floor to the detonator
    det = first_free([(qx + 4.5, qy + 9.0), (qx + 2.0, qy + 9.5), (qx + 6.0, qy + 8.0), (qx - 1.0, qy + 9.5)], .8)
    dzz = terrain_h(*det)
    def cable(pts, m):
        out_ = []
        for (ax, ay), (bx2, by2) in zip(pts, pts[1:]):
            za, zb = terrain_h(ax, ay) + .03, terrain_h(bx2, by2) + .03
            d = Vector((bx2 - ax, by2 - ay, zb - za)); bm_ = cyl(.012, d.length, seg=4)
            bmesh.ops.transform(bm_, matrix=d.normalized().to_track_quat('Z', 'Y').to_matrix().to_4x4(), verts=bm_.verts); out_.append((move(bm_, (ax, ay, za)), m))
        return out_
    hub = (qx + 1.0, qy + 12.0)
    for k, a in enumerate((1.25, 1.5, 1.75)):
        x, y = qx + 15.0 * math.cos(a), qy + 15.0 * math.sin(a)
        Dz += cable([(x, y), ((x + hub[0]) / 2 + .4 * k, (y + hub[1]) / 2), hub], wire)
    rot_d = math.atan2(hub[1] - det[1], hub[0] - det[0]) + math.pi / 2                   # local −y (cable side, reel) faces the charges
    rw = (det[0] + .68 * math.sin(rot_d), det[1] - .68 * math.cos(rot_d))
    pts = [hub]; n = 6
    for i in range(1, n + 1):
        t = i / n; pts.append((hub[0] + (rw[0] - hub[0]) * t + .5 * math.sin(t * 3.14) * (1 - t), hub[1] + (rw[1] - hub[1]) * t))
    Dz += cable(pts, wire_r)
    multi('Sprengladungen', Dz, c, collide=0)
    # detonator: wooden box with T-handle plunger, brass terminals, stencil plate, cable reel beside it
    Dm = [(box(.32, .24, .26, at=(0, 0, 0), bevel_w=.012), wood_d), (box(.34, .26, .03, at=(0, 0, .26), bevel_w=.006), wood), (box(.3, .22, .02, at=(0, 0, .0)), rust),
          (cyl(.012, .32, at=(0, 0, .26), seg=6), steel), (cyl(.016, .26, at=(-.13, 0, .58), seg=6, axis='X'), blk),
          (cyl(.022, .04, at=(-.15, 0, .58), seg=8, axis='X'), blk), (cyl(.022, .04, at=(.11, 0, .58), seg=8, axis='X'), blk)]
    for s_ in (-1, 1): Dm += [(cyl(.014, .035, at=(s_ * .08, -.09, .29), seg=8), brass), (cyl(.02, .008, at=(s_ * .08, -.09, .3), seg=8), brass)]
    Dm += [(box(.2, .004, .08, at=(0, -.122, .11)), lp('Schild_creme', '#efe4c4', .6)), (box(.16, .002, .012, at=(0, -.125, .14)), red), (box(.14, .002, .008, at=(0, -.125, .12)), blk)]
    Dm += [(box(.03, .02, .06, at=(s_ * .17, 0, .1)), steel) for s_ in (-1, 1)]                    # carry handles
    def wseg(p0, p1, m, r=.006):
        d = Vector(p1) - Vector(p0); bm_ = cyl(r, d.length, seg=4)
        bmesh.ops.transform(bm_, matrix=d.normalized().to_track_quat('Z', 'Y').to_matrix().to_4x4(), verts=bm_.verts); return (move(bm_, p0), m)
    for s_, m in ((-1, wire_r), (1, wire)):
        Dm += [wseg((s_ * .08, -.09, .31), (s_ * .1, -.2, .26), m), wseg((s_ * .1, -.2, .26), (s_ * .12, -.26, .01), m), wseg((s_ * .12, -.26, .01), (s_ * .04, -.5, .01), m)]
    reel = [(cyl(.15, .02, at=(-.12, 0, .2), seg=12, axis='X'), wood), (cyl(.15, .02, at=(.1, 0, .2), seg=12, axis='X'), wood), (cyl(.09, .22, at=(-.11, 0, .2), seg=10, axis='X'), wire_r),
            (box(.3, .06, .03, at=(0, 0, 0)), wood_d), (box(.03, .03, .2, at=(-.14, 0, 0)), wood_d), (box(.03, .03, .2, at=(.14, 0, 0)), wood_d)]
    for i in range(5): reel.append((torus(.092, .006, at=(-.09 + .045 * i, 0, .2), seg=10, seg2=3, axis='X'), wire_r))
    Dm += T(reel, (0, -.68, 0)) + [wseg((-.04, -.5, .01), (-.02, -.6, .11), wire_r)]
    multi('Zuendmaschine', T(Dm, (det[0], det[1], dzz - .01), rot_d), c, interact='use', use='zuender', label='Zündmaschine')
    print('s16: detonator at', [round(v, 1) for v in det], 'z', round(dzz, 2))

    # ---------------------------------------------------------------- secret stashes
    def stash(name, parts, label, loot, found, collide=0):
        return multi(name, parts, c, collide=collide, interact='search', stash=1, label=label, item=loot[0][0], loot=loot, found=found)

    # hollow stump by the trail between the gas station and the hunter's stand
    sx, sy = first_free([(54.5, 12.2), (53.5, 4.5), (58.0, 15.0), (57.5, 6.5), (59.5, 20.0), (61.5, 17.5)], .9); sz = terrain_h(sx, sy)
    S_ = []
    for i in range(9):                                                                            # ragged rim: staves of bark round a dark hole
        a = 6.283 * i / 9; h = .95 + .3 * R.random()
        st = box(.27, .14, h, at=(.47 * math.cos(a), .47 * math.sin(a), -.1), rz=a + math.pi / 2); jitter(st, .02, i); S_.append((st, bark))
    S_ += [(cyl(.42, .75, at=(0, 0, -.1), seg=9), rot), (cyl(.4, .02, at=(0, 0, .64), seg=9), lp('Hoehle_dunkel', '#15110d', .95, var=0))]
    for i in range(5):                                                                            # roots
        a = 6.283 * i / 5 + .3; rt = cyl(.09, .7, at=(0, 0, 0), seg=5, r2=.02); tilt(rt, 'Y', math.pi / 2 - .35); rotz(rt, a); S_.append((move(rt, (.4 * math.cos(a), .4 * math.sin(a), .05)), bark))
    S_ += [(move(ico(.18, sub=1, jit=.3, seed=40 + i, sz=.4), (.45 * math.cos(i * 2.1), .45 * math.sin(i * 2.1), .75 + .15 * (i % 2))), moss) for i in range(3)]
    for i in range(3):                                                                            # bracket fungi
        S_.append((move(cyl(.08 - .015 * i, .025, seg=7, r2=.03), (.53 * math.cos(-.6), .53 * math.sin(-.6), .25 + .14 * i)), lp('Baumpilz', '#c9a273', .8, var=.08)))
    stash('Versteck_Baum', T(S_, (sx, sy, sz), R.uniform(0, 6)), 'Hohler Baumstumpf', [['bernstein', 1], ['patronen_gewehr', 1]],
          'Im hohlen Stumpf, unter morschem Holz: ein Stück Bernstein mit einer Mücke darin – und eine Schachtel Gewehrpatronen!', collide=1)
    print('s16: stump at', round(sx, 1), round(sy, 1))

    # loose stone in the west wall of the castle ruin (own patch of masonry, so a breach in the random wall can't leave it floating)
    lx_, ly_ = rx - 8.0, ry - 3.0; lz_ = terrain_h(lx_ + .6, ly_)
    PT = [(box(1.0, 1.5, 2.4, at=(lx_ - .03, ly_, lz_ - .45)), mortar)]                                 # core, then a face of blocks
    for row in range(6):
        for j in range(3):
            if row == 4 and j == 1: continue                                                       # the gap for the loose stone
            w_ = .48 + .06 * ((row + j) % 2); b_ = box(1.1, w_, .36, at=(lx_, ly_ - .5 + j * .5 + (.12 if row % 2 else 0) * (1 if j < 2 else -1), lz_ - .45 + .02 + row * .38), bevel_w=.03)
            jitter(b_, .025, row * 3 + j); PT.append((b_, stone if (row + j) % 3 else stone_d))
    multi('Burg_Mauerstueck', PT, c)
    lz2 = lz_ - .45 + .02 + 4 * .38
    ST = [(box(.5, .4, .34, at=(lx_ + .38, ly_, lz2 + .01), bevel_w=.03), stone_d), (box(.06, .1, .05, at=(lx_ + .64, ly_ + .12, lz2 + .26)), moss)]
    stash('Versteck_Ruine', ST, 'Lockerer Stein in der Mauer', [['taschenuhr', 1], ['goldmuenze', 1]],
          'Der Stein wackelt – dahinter ein Hohlraum mit einem Lederbeutel: eine goldene Taschenuhr („H. Brandt 1923“) und eine Goldmünze.')

    # tin box tied to the north beam of the lake jetty (seen from the jetty, looking down over the edge)
    jx, jy, jz = LAKE[0] + 11.5, LAKE[1], LAKE_Z + .45
    TB = [(box(.3, .18, .19, at=(jx, jy + .87, jz - .45), bevel_w=.012), tin_g), (box(.31, .19, .03, at=(jx, jy + .87, jz - .27)), rust), (box(.06, .02, .04, at=(jx, jy + .775, jz - .33)), steel)]
    for s_ in (-1, 1): TB += [(cyl(.008, .3, at=(jx + s_ * .1, jy + .82, jz - .27), seg=4), rope), (box(.02, .12, .02, at=(jx + s_ * .1, jy + .76, jz - .1)), rope)]
    stash('Versteck_Steg', TB, 'Blechkiste unter dem Steg', [['kompass', 1], ['patronen_schrot', 1]],
          'An einer Schnur unter dem Steg hängt eine Blechkiste: ein Messingkompass („W. H.“) und Schrotpatronen. Opa Willis Versteck!')

    # bird box on a post at the forester's house (Henning: „Nistkästen kontrollieren“)
    fx, fy = FORSTHAUS; nx_, ny_ = first_free([(fx + 6.5, fy + 5.5), (fx + 3.0, fy + 6.5), (fx - 5.5, fy + 6.0), (fx + 7.0, fy - 5.0)], .4); nz_ = terrain_h(nx_, ny_); print('s16: bird box', nx_, ny_)
    multi('Nistkasten_Pfahl', [(box(.11, .11, 2.05, at=(nx_, ny_, nz_ - .2), bevel_w=.01), wood_d), (box(.16, .16, .05, at=(nx_, ny_, nz_ - .02)), stone_d)], c)
    face = math.atan2(fy - ny_, fx - nx_)                                                        # entry hole looks towards the house
    NB = [(box(.2, .2, .28, at=(.0, 0, 0), bevel_w=.008), wood), (box(.26, .28, .025, at=(-.01, 0, .3), rz=0), wood_d),
          (cyl(.032, .02, at=(.101, 0, .18), seg=10, axis='X'), lp('Hoehle_dunkel', '#15110d', .95, var=0)), (cyl(.008, .05, at=(.1, 0, .1), seg=5, axis='X'), wood_d),
          (box(.02, .21, .29, at=(-.11, 0, -.005)), wood_d)]
    NB[1] = (tilt(NB[1][0], 'Y', -.25), wood_d); move(NB[1][0], (0, 0, .03))
    stash('Versteck_Nistkasten', T(NB, (nx_ + .12 * math.cos(face), ny_ + .12 * math.sin(face), nz_ + 1.45), face), 'Nistkasten',
          [['medaille', 1], ['medizin', 1]], 'Kein Vogel drin – aber ein Tuch mit einer alten Schützenmedaille von 1962 und eine Packung Tabletten.')

    # tin box at the foot of the summit cross
    gx, gy = GIPFEL; gzz = berg_h(gx - .5, gy + .45)
    GB = [(box(.26, .15, .13, at=(0, 0, 0), bevel_w=.01), tin), (box(.27, .16, .02, at=(0, 0, .13)), tin), (box(.06, .02, .03, at=(0, -.08, .1)), steel), (box(.12, .03, .015, at=(0, 0, .15)), blk)]
    GB += [(move(ico(.12, sub=1, jit=.3, seed=70 + i, sz=.6), (.22 * (i - .5), .12, .02)), rock) for i in range(2)]
    stash('Versteck_Gipfel', T(GB, (gx - .55, gy + .45, gzz - .02), .3), 'Blechkassette am Gipfelkreuz', [['abzeichen', 1], ['schokolade', 2]],
          'Zwischen den Steinen am Kreuz: eine Blechkassette mit einem silbernen Edelweiß-Abzeichen der Bergwacht – und zwei Tafeln Schokolade.')

    # hay pile in the south-east corner of the hay barn
    hx_, hy_ = HEUSTADEL; hz_ = berg_h(hx_, hy_)
    HP = []
    for i in range(6):
        p_ = ico(.38 + .08 * (i % 3), sub=1, jit=.3, seed=80 + i, sz=.75); move(p_, (hx_ + 2.0 + .35 * math.cos(i * 1.1), hy_ - 1.15 + .3 * math.sin(i * 1.1), hz_ + .12)); HP.append((p_, hay if i % 2 else hay_d))
    HP += [(box(.18, .12, .1, at=(hx_ + 1.58, hy_ - 1.42, hz_ + .1), rz=.4), wood_d)]                                       # a corner of a little box peeks out
    stash('Versteck_Heustadel', HP, 'Heuhaufen', [['spieluhr', 1], ['energy', 1]],
          'Tief im Heu steckt eine kleine Holzkiste: eine alte Spieluhr – und eine Dose Energydrink.')

    # ---------------------------------------------------------------- pickups: chanterelles (valley) and edelweiss (mountains)
    def chanterelles(seed):
        r_ = random.Random(seed); P = []
        for i in range(5):
            a = r_.uniform(0, 6.28); d = r_.uniform(0, .09); x, y = d * math.cos(a), d * math.sin(a); s = r_.uniform(1.0, 1.6)
            P += [(cyl(.009 * s, .035 * s, at=(x, y, 0), seg=6, r2=.014 * s), chant_d), (cyl(.016 * s, .018 * s, at=(x, y, .035 * s), seg=8, r2=.03 * s), chant)]
            P.append((cyl(.026 * s, .005, at=(x, y, .052 * s), seg=8, r2=.02 * s), chant_d))                          # funnel cap: wavy rim
        P += [(move(box(.05, .02, .003, at=(0, 0, 0), rz=r_.uniform(0, 3)), (r_.uniform(-.1, .1), r_.uniform(-.1, .1), .002)), lp('Laubstreu_gelb', '#c7a04a', .9, var=.1)) for _ in range(3)]
        return P
    trails = trail_pts(); cands = []
    for ti, frac, side in ((6, .45, 1), (3, .5, -1), (8, .55, 1), (2, .6, -1), (9, .35, 1), (6, .8, -1), (3, .25, 1)):
        pts_ = trails[ti]; L = len(pts_) - 1; f = frac * L; i0 = min(L - 1, int(f)); t = f - i0
        (ax, ay), (bx2, by2) = pts_[i0], pts_[i0 + 1]; x, y = ax + (bx2 - ax) * t, ay + (by2 - ay) * t
        d = math.hypot(bx2 - ax, by2 - ay) or 1; cands.append((x - side * (by2 - ay) / d * 2.6, y + side * (bx2 - ax) / d * 2.6))
    k = 0
    for x, y in cands:
        if k >= 5: break
        if not free(x, y, .5) or abs(x - road_x(y)) < 9: continue
        k += 1; multi(f'Pfifferling_{k}', T(chanterelles(90 + k), (x, y, terrain_h(x, y) - .01), 0), c, collide=0, interact='pickup', item='pfifferling', label='Pfifferlinge')
        print('s16: chanterelles', k, round(x, 1), round(y, 1))
    def edelweiss(seed):
        r_ = random.Random(seed); P = [(ico(.22, sub=1, jit=.3, seed=seed, sz=.45), rock)]
        for i in range(9): lf = box(.018, .09, .008, at=(0, .045, 0)); tilt(lf, 'X', .5); rotz(lf, i * .9); P.append((move(lf, (0, 0, .06)), ew_l))
        for j in range(5):
            a = j * 1.26 + r_.uniform(-.3, .3); x, y, h = .06 * math.cos(a), .06 * math.sin(a), .09 + .03 * (j % 3)
            P.append((cyl(.004, h, at=(x, y, .06), seg=4), ew_l))
            for i in range(9): pt = box(.014, .042, .005, at=(0, .021, 0)); tilt(pt, 'X', -.25); rotz(pt, i * .698); P.append((move(pt, (x, y, .06 + h)), ew))
            P.append((ico(.014, sub=1, at=(x, y, .064 + h)), ew_y))
        return P
    ek = 0
    for (x, y) in ((33.5, 1128.2), (29.0, 1126.5), (30.5, 1132.5), (36.0, 1134.0), (26.0, 1121.0), (35.5, 1128.5), (38.0, 1131.0)):
        if ek >= 3 or not 39 < berg_h(x, y) < 49 or not free(x, y, .3): continue
        ek += 1; multi(f'Edelweiss_{ek}', T(edelweiss(100 + ek), (x, y, berg_h(x, y) - .04), 0), c, collide=0, interact='pickup', item='edelweiss', label='Edelweiß')
        print('s16: edelweiss', ek, x, y, round(berg_h(x, y), 1))

    # ---------------------------------------------------------------- the bear's den „Baerenhoehle“ (east slope of the mountains): ziel_grimm
    lx, ly = 59.0, 1088.0; lz = berg_h(lx, ly)
    for o in [o for o in bpy.data.objects if o.get('collide_r') and o.location.z > -100 and math.hypot(o.location.x - lx - 1.5, o.location.y - ly) < 7.5]:
        print('s16: den clears tree', o.name); bpy.data.objects.remove(o, do_unlink=True)          # spruces of s14 standing in the den
    dark = lp('Hoehle_dunkel', '#15110d', .95, var=0)
    def boulder(r, at, scl, seed, m):
        b_ = ico(r, sub=2, jit=.16, seed=seed); bmesh.ops.scale(b_, vec=scl, verts=b_.verts); return (move(b_, at), m)
    # cave mouth facing west (−x): two flanks, a massive lintel resting on them, the slope mass behind, dark inside
    Hs = [boulder(2.0, (lx + 1.6, ly + s_ * 2.85, lz + .7), (1.35, 1.0, 1.35), 200 + (s_ > 0), rock if s_ > 0 else rock_d) for s_ in (-1, 1)]
    Hs += [boulder(2.6, (lx + 2.2, ly, lz + 3.75), (1.25, 1.55, .55), 210, rock), boulder(3.2, (lx + 5.6, ly, lz + 1.6), (1.0, 1.45, 1.05), 211, rock_d),
           boulder(1.6, (lx + 3.6, ly + 3.6, lz + 2.6), (1.2, 1.0, 1.0), 212, rock), boulder(1.5, (lx + 3.4, ly - 3.7, lz + 2.4), (1.2, 1.0, 1.0), 213, rock_d)]
    Hs += [(box(.3, 2.4, 2.6, at=(lx + 3.4, ly, lz - .3)), dark), (box(2.4, 2.2, .25, at=(lx + 2.4, ly, lz + 2.25)), dark)]       # dark back + ceiling
    for i in range(5):                                                                            # loose boulders before the mouth
        x, y = lx - 2.2 - R.uniform(0, 2.2), ly + (i - 2) * 2.3 + R.uniform(-.4, .4)
        if abs(y - ly) < 1.8: continue
        b_ = ico(R.uniform(.45, .8), sub=1, jit=.3, seed=240 + i, sz=.7); move(b_, (x, y, berg_h(x, y) + .05)); Hs.append((b_, scree))
    # the scratched dead pine at the mouth (collides – part of the den)
    tx_, ty_ = lx - 1.6, ly + 3.4; tz_ = berg_h(tx_, ty_)
    Hs += [(cyl(.22, 4.6, at=(tx_, ty_, tz_ - .2), seg=7, r2=.12), bark), (cyl(.12, 1.4, at=(tx_, ty_, tz_ + 3.4), seg=5, r2=.0), bark)]
    for j in range(3): br = cyl(.05, 1.0, seg=4, r2=.01); tilt(br, 'Y', 1.1 + .2 * j); rotz(br, j * 2.2); Hs.append((move(br, (tx_, ty_, tz_ + 2.2 + .6 * j)), bark))
    multi('Baerenhoehle', Hs, c)
    Dd = [(move(cyl(1.7, .04, seg=10), (lx + 1.6, ly, berg_h(lx + 1.6, ly) - .02)), soil)]                                     # trodden earth in the mouth
    for i in range(14):                                                                           # flattened straw bed at the back
        a = R.uniform(0, 6.28); d = R.uniform(0, 1.0); st = box(R.uniform(.25, .45), .03, .015, at=(0, 0, 0), rz=R.uniform(0, 3))
        Dd.append((move(st, (lx + 2.6 + d * math.cos(a), ly + d * math.sin(a), berg_h(lx + 2.6, ly) + .02)), straw))
    Dd.append((move(ico(.8, sub=1, jit=.2, seed=250, sz=.18), (lx + 2.6, ly, berg_h(lx + 2.6, ly) - .02)), hay_d))
    def bone_(L, at, a):
        b_ = [(cyl(.025, L, at=(0, 0, 0), seg=5, axis='X'), bone), (ico(.045, sub=1, at=(0, 0, .02)), bone), (ico(.045, sub=1, at=(L, 0, .02)), bone)]
        return T(b_, at, a)
    for i in range(7):
        x, y = lx - .5 - R.uniform(0, 3.0), ly + R.uniform(-2.2, 2.2); Dd += bone_(R.uniform(.25, .5), (x, y, berg_h(x, y) + .02), R.uniform(0, 6))
    sk = [(ico(.12, sub=1, jit=.08, seed=260, sz=.8), bone), (box(.07, .16, .06, at=(0, -.12, -.06)), bone), (ico(.025, sub=1, at=(.05, -.06, .03)), lp('Hoehle_dunkel', '#15110d', .95, var=0)),
          (ico(.025, sub=1, at=(-.05, -.06, .03)), lp('Hoehle_dunkel', '#15110d', .95, var=0))]
    Dd += T(sk, (lx - 1.2, ly - 1.6, berg_h(lx - 1.2, ly - 1.6) + .08), .7)
    for j in range(5):                                                                            # claw marks: pale gashes in the bark
        a = math.radians(200 + j * 9); Dd.append((move(box(.012, .02, .55, at=(0, 0, 0), rz=a), (tx_ + .215 * math.cos(a), ty_ + .215 * math.sin(a), tz_ + 1.1 + .03 * j)), bark_s))
    for i in range(6):                                                                            # tufts of fur on the rocks
        a = R.uniform(-1.2, 1.2); Dd.append((move(ico(.05, sub=1, jit=.3, seed=270 + i, sz=.5), (lx + 1.5 + 2.4 * math.cos(a), ly + 2.4 * math.sin(a), lz + .5 + R.uniform(0, .6))), lp('Baerenfell', '#5a3f2a', .95, var=.08)))
    multi('Baerenhoehle_Spuren', Dd, c, collide=0)
    spot('ziel_grimm', (lx - 4.5, ly, berg_h(lx - 4.5, ly) + .02), quest='grimm')
    print('s16: bear den at', lx, ly, round(lz, 1))

    # ---------------------------------------------------------------- rare items as templates (bp_r_*, origin = base centre, real size)
    tmp = coll('_Baupläne', c)
    def bp(name, parts): o = multi('bp_r_' + name, parts, tmp, collide=0); o.location = (0, 0, BPZ); return o
    # golden pocket watch, lying on its back, open lid, chain
    W_ = [(cyl(.024, .009, seg=16, bevel_w=.002), gold), (cyl(.02, .0015, at=(0, 0, .009), seg=16), dial), (cyl(.0215, .0012, at=(0, 0, .0095), seg=16), glass_c),
          (box(.0015, .014, .0008, at=(0, .005, .0106), rz=.4), blk), (box(.0012, .01, .0008, at=(.002, .003, .0108), rz=-1.2), blk),
          (cyl(.004, .006, at=(0, .026, .002), seg=8, axis='Y'), gold), (torus(.005, .0012, at=(0, .033, .0045), seg=8, seg2=3, axis='X'), gold)]
    for i in range(12): a = i * .5236; W_.append((box(.0012, .0035, .0006, at=(.0165 * math.cos(a), .0165 * math.sin(a), .0103), rz=a + math.pi / 2), blk))
    lid = cyl(.024, .003, seg=16); tilt(lid, 'X', -1.9); W_.append((move(lid, (0, -.024, .006)), gold))
    for i in range(7): W_.append((torus(.0035, .0009, at=(.006 * i, .04 + .005 * i * (i % 2), .001), seg=6, seg2=3, axis='Z' if i % 2 else 'X'), gold))
    bp('taschenuhr', W_)
    # amber with a mosquito
    am = ico(.03, sub=2, jit=.25, seed=301, sz=.7); bmesh.ops.scale(am, vec=(1.3, 1.0, .75), verts=am.verts); move(am, (0, 0, .022))
    bug = [(box(.006, .014, .004, at=(0, 0, .02)), lp('Muecke', '#2a2018', .7, var=0))] + [(move(box(.0006, .012, .0006, at=(0, 0, 0), rz=s_ * (.6 + .4 * j)), (s_ * .004, .002 * j, .022)), lp('Muecke', '#2a2018', .7, var=0)) for s_ in (-1, 1) for j in range(3)]
    bug += [(move(box(.008, .004, .0005, at=(0, 0, 0), rz=s_ * .4), (s_ * .006, .002, .025)), lp('Fluegel', '#d8d4c8', .3, alpha=.6, var=0)) for s_ in (-1, 1)]
    bp('bernstein', bug + [(am, amber)])
    # brass compass with open lid
    K_ = [(cyl(.035, .014, seg=16, bevel_w=.002), brass), (cyl(.03, .002, at=(0, 0, .013), seg=16), dial), (box(.003, .05, .0012, at=(0, 0, .0152), rz=.3), needle_r),
          (box(.0032, .024, .0013, at=(-.0036, -.011, .0153), rz=.3), white), (cyl(.004, .003, at=(0, 0, .015), seg=8), brass), (cyl(.031, .0012, at=(0, 0, .0165), seg=16), glass_c),
          (cyl(.005, .008, at=(0, .036, .004), seg=8, axis='Y'), brass), (torus(.006, .0015, at=(0, .046, .008), seg=8, seg2=3, axis='X'), brass)]
    for i in range(4): a = i * math.pi / 2; K_.append((box(.002, .007, .0008, at=(.024 * math.cos(a), .024 * math.sin(a), .0152), rz=a + math.pi / 2), blk))
    kl = cyl(.035, .004, seg=16); tilt(kl, 'X', 1.75); K_.append((move(kl, (0, -.036, .012)), brass))
    bp('kompass', K_)
    # shooting medal on a red-white ribbon
    M_ = [(cyl(.022, .004, seg=16, bevel_w=.001), gold), (cyl(.016, .0012, at=(0, 0, .004), seg=16), lp('Gold_matt', '#b88c2a', .5, .7, var=.02)),
          (box(.012, .002, .0008, at=(0, 0, .0052)), gold), (box(.002, .012, .0008, at=(0, 0, .0052)), gold), (torus(.004, .001, at=(0, .024, .002), seg=8, seg2=3, axis='X'), gold)]
    for s_ in (-1, 1):
        rb = box(.016, .06, .002, at=(0, .03, 0)); rotz(rb, s_ * .35); M_.append((move(rb, (0, .026, .001)), ribbon_r))
        st_ = box(.005, .06, .0022, at=(0, .03, 0)); rotz(st_, s_ * .35); M_.append((move(st_, (0, .026, .0012)), ribbon_w))
    M_.append((box(.04, .008, .004, at=(0, .085, 0)), brass))
    bp('medaille', M_)
    # silver edelweiss badge (Bergwacht)
    E_ = []
    for i in range(10): pt = box(.008, .022, .003, at=(0, .011, 0)); rotz(pt, i * .628); E_.append((pt, silver))
    E_ += [(cyl(.009, .005, seg=10), lp('Gold', '#d4a83a', .3, .8, var=.03)), (cyl(.03, .002, at=(0, 0, -.002), seg=16), lp('Emaille_rot', '#a8261e', .4, var=.02)),
           (torus(.03, .0018, at=(0, 0, 0), seg=16, seg2=3, axis='Z'), silver), (box(.04, .002, .002, at=(0, 0, -.004)), steel)]
    for i in range(5): E_.append((ico(.0025, sub=1, at=(.003 * math.cos(i * 1.25), .003 * math.sin(i * 1.25), .006)), lp('Gold', '#d4a83a', .3, .8, var=.03)))
    for e_ in E_: move(e_[0], (0, 0, .004))
    bp('abzeichen', E_)
    # music box: carved wooden case, lid up, brass comb + cylinder, crank on the side
    S2 = [(box(.1, .07, .045, at=(0, 0, 0), bevel_w=.003), lp('Holz_Nuss', '#6a3f24', .6, var=.06)), (box(.092, .062, .002, at=(0, 0, .044)), lp('Samt_rot', '#7a1e22', .95, var=.02)),
          (cyl(.009, .05, at=(-.025, -.012, .052), seg=10, axis='X'), brass), (box(.03, .02, .002, at=(.012, -.012, .05)), steel)]
    for i in range(8): S2.append((box(.002, .016, .0015, at=(.004 + .0035 * i, -.012 + .0, .051)), steel))
    lidm = box(.1, .07, .008, at=(0, .035, 0), bevel_w=.002); tilt(lidm, 'X', -1.85); S2.append((move(lidm, (0, .035, .045)), lp('Holz_Nuss', '#6a3f24', .6, var=.06)))
    S2 += [(box(.004, .004, .02, at=(.052, 0, .02)), brass), (box(.004, .02, .004, at=(.054, .008, .038)), brass), (cyl(.003, .01, at=(.054, .018, .038), seg=6, axis='X'), wood)]
    for i in range(4): S2.append((box(.002, .072, .002, at=(-.04 + .027 * i, 0, .02)), gold))
    bp('spieluhr', S2)
    # meteorite: charred shell with gaps, glowing core shows through
    sh = ico(.07, sub=2, jit=.3, seed=331, sz=.8)
    rr = random.Random(5); dead = [f for f in sh.faces if rr.random() < .22]
    bmesh.ops.delete(sh, geom=dead, context='FACES_ONLY'); move(sh, (0, 0, .055))
    core = ico(.058, sub=1, jit=.25, seed=332, sz=.8); move(core, (0, 0, .055))
    bp('meteorit', [(sh, metrock), (core, lava)] + [(move(ico(.012, sub=1, jit=.3, seed=340 + i), (.07 * math.cos(i * 2.4), .07 * math.sin(i * 2.4), .006)), metrock) for i in range(3)])
    # bear claw on a leather cord with beads
    CL = []
    for j in range(5):
        t = j / 4; seg_ = cyl(.012 * (1 - .75 * t) + .003, .03, seg=6, r2=.012 * (1 - .75 * (t + .25)) + .002); tilt(seg_, 'Y', math.pi / 2 - .35 * j)
        CL.append((move(seg_, (.03 * j - .004 * j * j, 0, .012 + .004 * j * j * .5)), ivory if j < 4 else lp('Kralle_Spitze', '#4a4038', .5, var=.02)))
    CL += [(cyl(.014, .012, at=(-.012, 0, .012), seg=8, axis='X'), leather), (torus(.05, .0022, at=(-.05, 0, .003), seg=16, seg2=3, axis='Z'), leather)]
    for i in range(4): a = math.pi + (i - 1.5) * .35; CL.append((ico(.0055, sub=1, at=(-.05 + .05 * math.cos(a), .05 * math.sin(a), .004)), ribbon_r if i % 2 else bone))
    bp('kralle', CL)
