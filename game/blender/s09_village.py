# Section 9 – village Tannbach in the north (road straight through at x −63.6, y 150 … 230): town signs, pavements, village square
# with draw well (clean water), lime tree, phone box, benches, notice board with the hiking trails; chapel with tower; six houses
# (four enterable with furniture and searchable cupboards, one locked = crowbar, one burnt-out ruin); village shop with goods and a
# seed rack; farm with barn (sliding door, hay, tractor, spade, seed sacks), old fenced field, hand pump; bus stop.
# Loot containers: interact='search' with loot=[[item, n], …] (the game hands out everything, then the container is empty).
COLL = '09 Dorf'
RX = -63.6                    # road centre in the village
WEST_FRONT, EAST_FRONT = -70.5, -56.8

def solid(pts, vec):
    """Face from 3D points, extruded by vec (roofs, gables, ramps)."""
    bm = bmesh.new(); f = bm.faces.new([bm.verts.new(p) for p in pts])
    ex = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, vec=vec, verts=[v for v in ex['geom'] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return bm

def build(c):
    R = random.Random(909)
    plaster = [lp('Putz_weiss', '#ece6d8', .9, var=.04), lp('Putz_gelb', '#e6cf96', .9, var=.04), lp('Putz_rosa', '#e2b9a4', .9, var=.04), lp('Putz_gruen', '#c4d1b0', .9, var=.04)]
    timber = lp('Fachwerk', '#5b3d28', .8, var=.05); roof_m = [lp('Ziegel_rot', '#a8432e', .8, var=.08), lp('Ziegel_braun', '#7b4a34', .8, var=.08), lp('Schiefer', '#4d535a', .7, var=.06)]
    stone = lp('Sandstein', '#b9a888', .9, var=.08); stone_d = lp('Bruchstein', '#8f8576', .9, var=.1); plank = lp('Dielen', '#a07850', .8, var=.06)
    wood = lp('Holz_Tresen', '#9c6b43', .7, var=.05); wood_d = lp('Holz_dunkel', '#6b4630', .7, var=.05); door_m = lp('Haustuer', '#5e3a22', .7, var=.04)
    gl = glass('Glas_Dorf', '#bcd3dc', .3); steel = lp('Stahl', '#9da2a6', .35, .8, var=.04); blk = lp('Kunststoff_schwarz', '#232426', .6, var=.03)
    green_s = lp('Fensterladen', '#3f6a4a', .7, var=.04); white = lp('Weiss_glanz', '#f4f4f1', .3, var=.02); red = lp('Waldtank_rot', '#c42a26', .5, var=.03)
    yel = lp('Schild_gelb', '#f2c230', .5, var=.02); fabric = [lp('Stoff_blau', '#4a6a8a', .95), lp('Stoff_rot', '#9a3b32', .95), lp('Stoff_gruen', '#58744a', .95)]
    hay = lp('Heu', '#d8b863', .95, var=.1); soil = lp('Acker', '#5a3f2a', 1.0, var=.08); char = lp('Verkohlt', '#2a2420', .95, var=.06)
    cobble = lp('Pflaster', '#8d8a84', .95, var=.1); curb = lp('Bordstein', '#a9a69e', .8, var=.05); pave = lp('Gehweg', '#9b968c', .9, var=.06)
    PAL = [lp(f'Ware_{i}', h, .55, var=.04) for i, h in enumerate(('#d6402f', '#f0b429', '#2d7dd2', '#3bb273', '#e86a92', '#7b4fb0', '#f28e2b',
                                                                   '#f4f1de', '#3d405b', '#81b29a', '#e07a5f', '#2a9d8f', '#e9c46a', '#264653'))]
    Z = lambda x, y: terrain_h(x, y)

    # ------------------------------------------------------------ town signs, pavements with kerbs
    for nm, y, side, rz in (('Ortsschild_S', 147.0, 1, 0.0), ('Ortsschild_N', 218.0, -1, math.pi)):
        x = RX + side * 5.0; z = Z(x, y)
        multi(nm, [(cyl(.04, 2.4, at=(x - .45, y, z), seg=6), steel), (cyl(.04, 2.4, at=(x + .45, y, z), seg=6), steel),
                   (box(1.3, .04, .55, at=(x, y, z + 1.65), rz=rz), yel), (box(1.36, .03, .61, at=(x, y + .01 * (1 if rz else -1), z + 1.62), rz=rz), blk),
                   (text_bm('Tannbach', .2, at=(x, y - .03 * (1 if not rz else -1), z + 1.82), rz=rz, depth=.01), blk),
                   (text_bm('Landkreis Nordwald', .07, at=(x, y - .03 * (1 if not rz else -1), z + 1.7), rz=rz, depth=.01), blk)], c)
    for side, (y0, y1) in ((-1, (150.0, 216.0)), (1, (150.0, 216.0))):
        xa = RX + side * 3.5; xb = RX + side * 5.7; xm = (xa + xb) / 2
        obj(f'Gehweg_{side}', box(abs(xb - xa), y1 - y0, .14, at=(xm, (y0 + y1) / 2, 0)), pave, c)
        obj(f'Bordstein_{side}', box(.16, y1 - y0, .16, at=(xa + side * .08, (y0 + y1) / 2, 0)), curb, c)
    for k, y in enumerate(range(154, 216, 16)):                                      # street lamps (dark – no power out here)
        for side in (-1, 1):
            x = RX + side * 5.3
            multi(f'Laterne_{k}_{side}', [(cyl(.06, 4.2, at=(x, y, .14), seg=6), lp('Mast', '#3d4246', .5, .6)), (box(.08, .9, .06, at=(x, y - .4 * side * 0, 4.3)), lp('Mast', '#3d4246', .5, .6)),
                                          (box(.3, .45, .12, at=(x - side * .35, y, 4.2)), lp('Mast', '#3d4246', .5, .6)), (box(.26, .4, .03, at=(x - side * .35, y, 4.18)), lp('Lampenglas', '#e6e2c8', .3))], c)

    # ------------------------------------------------------------ houses
    def house(name, x0, y0, x1, y1, wall_m, roof, door, windows, label, enter=True, locked=None, ruin=False, chimney=True, sign=None):
        """Axis-aligned house on a 0.3 m stone plinth; walls 2.6 m, gable roof along the long side. door / windows: (side 'W'|'E'|'S'|'N', offset)."""
        z = Z((x0 + x1) / 2, (y0 + y1) / 2); FL = z + .3; T = .25; H = 2.6
        P = [(box(x1 - x0 + .1, y1 - y0 + .1, .3, at=((x0 + x1) / 2, (y0 + y1) / 2, z - .02), bevel_w=.02), stone_d),
             (box(x1 - x0 - 2 * T, y1 - y0 - 2 * T, .03, at=((x0 + x1) / 2, (y0 + y1) / 2, FL - .02)), plank)]
        sides = {'S': ((x0, y0 + T / 2), (x1, y0 + T / 2)), 'N': ((x0, y1 - T / 2), (x1, y1 - T / 2)),
                 'W': ((x0 + T / 2, y0 + T), (x0 + T / 2, y1 - T)), 'E': ((x1 - T / 2, y0 + T), (x1 - T / 2, y1 - T))}
        ops = {k: [] for k in sides}
        if door: ops[door[0]].append((door[1], 1.06, 0, 2.15))
        for sd, off in windows: ops[sd].append((off, 1.0, .85, 1.95))
        top = H if not ruin else None
        for sd, (a, b) in sides.items():
            if ruin:      # burnt-out: walls broken off at random heights, no roof
                L = abs(b[0] - a[0]) + abs(b[1] - a[1]); s0 = 0.0
                while s0 < L - .05:
                    w = min(L - s0, R.uniform(.6, 1.6)); h = R.uniform(.6, H)
                    if not any(o[0] - .05 < s0 + w / 2 < o[0] + o[1] + .05 for o in ops[sd]):
                        if abs(a[1] - b[1]) < 1e-6: P.append((box(w, T, h, at=(a[0] + s0 + w / 2, a[1], FL)), char if R.random() < .4 else wall_m))
                        else: P.append((box(T, w, h, at=(a[0], a[1] + s0 + w / 2, FL)), char if R.random() < .4 else wall_m))
                    s0 += w
                continue
            P.append((wall(a, b, T, H, ops[sd], FL), wall_m))
            for o in ops[sd]: P.append((frame(a, b, T, o, FL, .07, T + .04), timber))
            for o in ops[sd]:
                if o[2] > 0:          # window: glass, shutters, flower box
                    s, w = o[0], o[1]
                    if abs(a[1] - b[1]) < 1e-6:
                        cx = a[0] + s + w / 2; out = -1 if sd == 'S' else 1
                        P.append((box(w - .1, .02, 1.0, at=(cx, a[1], FL + .9)), gl))
                        for k in (-1, 1): P.append((box(.5, .04, 1.1, at=(cx + k * (w / 2 + .27), a[1] + out * (T / 2 + .03), FL + .85)), green_s))
                        P.append((box(w, .22, .18, at=(cx, a[1] + out * (T / 2 + .12), FL + .68)), wood_d))
                        P.append((ico(.14, at=(cx - .25, a[1] + out * (T / 2 + .12), FL + .9), sub=1, jit=.3, seed=int(cx * 7)), lp('Blumen', '#d6406a', .8, var=.15)))
                        P.append((ico(.13, at=(cx + .2, a[1] + out * (T / 2 + .12), FL + .9), sub=1, jit=.3, seed=int(cx * 9)), lp('Busch', '#4f7a34', .9, var=.1)))
                    else:
                        cy = a[1] + s + w / 2; out = -1 if sd == 'W' else 1
                        P.append((box(.02, w - .1, 1.0, at=(a[0], cy, FL + .9)), gl))
                        for k in (-1, 1): P.append((box(.04, .5, 1.1, at=(a[0] + out * (T / 2 + .03), cy + k * (w / 2 + .27), FL + .85)), green_s))
                        P.append((box(.22, w, .18, at=(a[0] + out * (T / 2 + .12), cy, FL + .68)), wood_d))
                        P.append((ico(.14, at=(a[0] + out * (T / 2 + .12), cy - .25, FL + .9), sub=1, jit=.3, seed=int(cy * 7)), lp('Blumen', '#d6406a', .8, var=.15)))
                        P.append((ico(.13, at=(a[0] + out * (T / 2 + .12), cy + .2, FL + .9), sub=1, jit=.3, seed=int(cy * 9)), lp('Busch', '#4f7a34', .9, var=.1)))
        # half-timbering: corner posts + belt beam
        if not ruin:
            for (px, py) in ((x0, y0), (x1, y0), (x0, y1), (x1, y1)): P.append((box(.3, .3, H, at=(px + (.13 if px == x0 else -.13), py + (.13 if py == y0 else -.13), FL)), timber))
            P += [(box(x1 - x0 + .04, .29, .16, at=((x0 + x1) / 2, y0 + .125, FL + H - .16)), timber), (box(x1 - x0 + .04, .29, .16, at=((x0 + x1) / 2, y1 - .125, FL + H - .16)), timber),
                  (box(.29, y1 - y0, .16, at=(x0 + .125, (y0 + y1) / 2, FL + H - .16)), timber), (box(.29, y1 - y0, .16, at=(x1 - .125, (y0 + y1) / 2, FL + H - .16)), timber)]
            # gable roof (ridge along the longer side), 40°, 0.4 m overhang
            ov = .4; zt = FL + H
            if y1 - y0 >= x1 - x0:
                half = (x1 - x0) / 2 + ov; rh = half * math.tan(math.radians(40)); xm = (x0 + x1) / 2
                for s in (-1, 1):
                    xe = xm + s * half
                    P.append((solid([(xe, y0 - ov, zt - ov * .84), (xe, y1 + ov, zt - ov * .84), (xm, y1 + ov, zt + rh - ov * .84), (xm, y0 - ov, zt + rh - ov * .84)], (0, 0, .14)), roof))
                for yy, d in ((y0, T), (y1 - T, T)):
                    P.append((solid([(x0, yy, zt), (x1, yy, zt), (xm, yy, zt + (x1 - x0) / 2 * math.tan(math.radians(40)))], (0, d, 0)), wall_m))
                P.append((box(.2, y1 - y0 + 2 * ov, .2, at=(xm, (y0 + y1) / 2, zt + rh - ov * .84 + .02)), roof))
            else:
                half = (y1 - y0) / 2 + ov; rh = half * math.tan(math.radians(40)); ym = (y0 + y1) / 2
                for s in (-1, 1):
                    ye = ym + s * half
                    P.append((solid([(x0 - ov, ye, zt - ov * .84), (x1 + ov, ye, zt - ov * .84), (x1 + ov, ym, zt + rh - ov * .84), (x0 - ov, ym, zt + rh - ov * .84)], (0, 0, .14)), roof))
                for xx in (x0, x1 - T):
                    P.append((solid([(xx, y0, zt), (xx, y1, zt), (xx, ym, zt + (y1 - y0) / 2 * math.tan(math.radians(40)))], (T, 0, 0)), wall_m))
                P.append((box(x1 - x0 + 2 * ov, .2, .2, at=((x0 + x1) / 2, ym, zt + rh - ov * .84 + .02)), roof))
            if chimney:
                cx_, cy_ = x0 + (x1 - x0) * .7, y0 + (y1 - y0) * .3
                P.append((box(.5, .5, 3.4, at=(cx_, cy_, zt), bevel_w=.02), lp('Ziegel_Kamin', '#8a4a38', .9, var=.08)))
                P.append((box(.6, .6, .08, at=(cx_, cy_, zt + 3.4)), stone_d))
        multi(name, P, c)
        if door:
            sd, off = door; a, b = sides[sd]
            if sd in 'SN':
                hinge = (a[0] + off + .06, a[1], FL); rz = 0; sign_ = 1 if sd == 'S' else -1
            else:
                hinge = (a[0], a[1] + off + .06, FL); rz = math.pi / 2; sign_ = -1 if sd == 'W' else 1
            w = .94
            leaf = [(box(w - .02, .06, 2.03, at=(w / 2, 0, 0), bevel_w=.01), door_m), (box(w - .2, .07, .5, at=(w / 2, 0, 1.3)), lp('Haustuer_hell', '#7a4e30', .7)),
                    (box(.04, .14, .04, at=(w - .12, 0, 1.0)), steel), (box(.3, .08, .3, at=(w / 2, 0, 1.55)), gl)]
            bms = []
            for bm_, m in leaf: rotz(bm_, rz); move(bm_, hinge); bms.append((bm_, m))
            kw = dict(locked=1, locked_msg=locked) if locked else {}
            multi(name + '_Tuer', bms, c, pivot=hinge, interact='door', angle=sign_ * math.radians(100), label=label, **kw)
            # door step
            if sd == 'E': obj(name + '_Stufe', box(.5, 1.3, .15, at=(x1 + .25, hinge[1] + .47, z)), stone, c)
            if sd == 'W': obj(name + '_Stufe', box(.5, 1.3, .15, at=(x0 - .25, hinge[1] + .47, z)), stone, c)
        if sign:
            txt, sd = sign; a, b = sides[sd]; ym = (y0 + y1) / 2
            x = x1 + .02 if sd == 'E' else x0 - .02; rz = math.pi / 2 if sd == 'E' else -math.pi / 2
            multi(name + '_Schild', [(box(.04, 2.6, .5, at=(x + (.02 if sd == 'E' else -.02), ym, FL + 2.0)), lp('Schild_creme', '#efe4c4', .6)),
                                     (text_bm(txt, .28, at=(x + (.05 if sd == 'E' else -.05), ym, FL + 2.08), rz=rz, depth=.01), wood_d)], c, collide=0)
        return FL

    def furn_table(nm, x, y, FL, w=1.2, d=.8, chairs=4):
        P = [(box(w, d, .05, at=(x, y, FL + .72), bevel_w=.01), wood)] + [(box(.06, .06, .72, at=(x + sx * (w / 2 - .08), y + sy * (d / 2 - .08), FL)), wood_d) for sx in (-1, 1) for sy in (-1, 1)]
        for k in range(chairs):
            cx = x + (k % 2 * 2 - 1) * (w / 4); cy = y + (k // 2 * 2 - 1) * (d / 2 + .3)
            P += [(box(.4, .4, .04, at=(cx, cy, FL + .44)), wood), (box(.4, .04, .45, at=(cx, cy + (k // 2 * 2 - 1) * .18, FL + .48)), wood_d)]
            P += [(box(.04, .04, .44, at=(cx + sx * .17, cy + sy * .17, FL)), wood_d) for sx in (-1, 1) for sy in (-1, 1)]
        multi(nm, P, c)
    def furn_bed(nm, x, y, FL, rz=0.0, col=0):
        P = [(box(1.0, 2.0, .35, at=(0, 0, 0), bevel_w=.02), wood), (box(.94, 1.9, .16, at=(0, 0, .35), bevel_w=.04, seg=2), white),
             (box(.95, 1.3, .06, at=(0, -.3, .5), bevel_w=.02), fabric[col % 3]), (box(.6, .35, .12, at=(0, .7, .5), bevel_w=.04, seg=2), white), (box(1.0, .06, .9, at=(0, .97, 0)), wood_d)]
        out = []
        for bm_, m in P: rotz(bm_, rz); move(bm_, (x, y, FL)); out.append((bm_, m))
        multi(nm, out, c)
    def furn_cupboard(nm, x, y, FL, rz, label, loot, found):
        P = [(box(1.0, .5, 1.9, at=(0, 0, 0), bevel_w=.02), wood_d), (box(.47, .02, 1.7, at=(-.25, -.26, .1)), wood), (box(.47, .02, 1.7, at=(.25, -.26, .1)), wood),
             (box(.03, .03, .12, at=(-.04, -.28, 1.0)), steel), (box(.03, .03, .12, at=(.04, -.28, 1.0)), steel), (box(1.06, .54, .06, at=(0, 0, 1.9)), wood)]
        out = []
        for bm_, m in P: rotz(bm_, rz); move(bm_, (x, y, FL)); out.append((bm_, m))
        multi(nm, out, c, interact='search', label=label, item=loot[0][0], loot=loot, found=found)
    def furn_kitchen(nm, x0, x1, y, FL, side):
        """Counter along x at wall y (side −1 = counter in front of the south wall) with sink, stove, wall shelf."""
        d = .6; cy = y - side * d / 2
        P = [(box(x1 - x0, d, .88, at=((x0 + x1) / 2, cy, FL), bevel_w=.01), lp('Kueche', '#d9d2c0', .6)), (box(x1 - x0 + .02, d + .02, .04, at=((x0 + x1) / 2, cy, FL + .88)), lp('Arbeitsplatte', '#3a3c3f', .4))]
        P += [(box(.5, .4, .04, at=(x0 + .5, cy, FL + .9)), steel), (box(.04, .04, .3, at=(x0 + .5, cy + side * .22, FL + .9)), steel)]
        P += [(box(.6, .55, .9, at=(x1 - .4, cy, FL)), lp('Herd', '#2b2d30', .4, .3))] + [(cyl(.09, .02, at=(x1 - .55 + .3 * (i % 2), cy - .12 + .24 * (i // 2), FL + .9), seg=8), blk) for i in range(4)]
        P += [(box(x1 - x0 - .4, .3, .03, at=((x0 + x1) / 2, y - side * .15, FL + 1.6)), wood)]
        for i in range(int((x1 - x0 - .6) / .18)): P.append((cyl(.05, .14 + .04 * (i % 3), at=(x0 + .4 + .18 * i, y - side * .15, FL + 1.63), seg=7), PAL[(i * 5) % 14]))
        multi(nm, P, c)
    def furn_stove(nm, x, y, FL):          # tiled stove (Kachelofen) – just furniture
        multi(nm, [(box(1.0, .7, 1.5, at=(x, y, FL), bevel_w=.04), lp('Kacheln', '#3f6a6a', .5, var=.06)), (box(1.1, .8, .08, at=(x, y, FL + 1.5)), stone),
                   (box(.4, .02, .3, at=(x, y - .36, FL + .4)), lp('Ofentuer', '#232426', .4, .5)), (box(1.4, .5, .45, at=(x + 1.2, y + .1, FL), bevel_w=.03), wood)], c)
    def furn_sofa(nm, x, y, FL, rz, col):
        P = [(box(1.8, .8, .42, at=(0, 0, 0), bevel_w=.06, seg=2), fabric[col]), (box(1.8, .22, .5, at=(0, .3, .42), bevel_w=.06, seg=2), fabric[col]),
             (box(.2, .8, .25, at=(-.8, 0, .42), bevel_w=.05), fabric[col]), (box(.2, .8, .25, at=(.8, 0, .42), bevel_w=.05), fabric[col])]
        out = []
        for bm_, m in P: rotz(bm_, rz); move(bm_, (x, y, FL)); out.append((bm_, m))
        multi(nm, out, c)
    def rug(nm, x, y, FL, w, d, col):
        obj(nm, box(w, d, .015, at=(x, y, FL + .01)), fabric[col], c, collide=0)
    def pickup(nm, parts, item, label, **kw): return multi(nm, parts, c, collide=0, interact='pickup', item=item, label=label, **kw)

    # H1 (west, y 156 … 164): kitchen + living room
    FL = house('Haus_3', -78.5, 156, WEST_FRONT, 164, plaster[0], roof_m[0], ('E', 3.2), [('E', 1.0), ('E', 5.6), ('S', 3.0), ('N', 4.5)], 'Haustür Nr. 3')
    furn_kitchen('Haus_3_Kueche', -78.0, -74.6, 163.75, FL, 1); furn_table('Haus_3_Tisch', -76.0, 161.6, FL)
    furn_cupboard('Haus_3_Schrank', -77.9, 157.4, FL, math.pi / 2, 'Küchenschrank', [['dosenbohnen', 1], ['dosensuppe', 1], ['feuerzeug', 1]], 'Bohnen, eine Dosensuppe – und Streichhölzer (zählt wie ein Feuerzeug).')
    furn_sofa('Haus_3_Sofa', -73.2, 157.2, FL, math.pi, 0); rug('Haus_3_Teppich', -74.0, 159.0, FL, 2.2, 1.6, 1)
    pickup('Haus_3_Brot', [(box(.25, .14, .1, at=(-76.1, 161.5, FL + .77), bevel_w=.04, seg=2), lp('Brot', '#b07a3c', .8))], 'fladenbrot', 'Brot')

    # H2 village shop (west, y 168 … 180)
    FL = house('Dorfladen', -79.5, 168, WEST_FRONT, 180, plaster[1], roof_m[1], ('E', 5.4), [('E', 1.4), ('E', 8.4), ('N', 3.0)], 'Ladentür', sign=('DORFLADEN', 'E'))
    for k, y in enumerate((170.2, 172.6, 175.0)):
        P = [(box(4.6, .5, .08, at=(-75.8, y, FL)), wood_d)] + [(box(4.6, .5, .03, at=(-75.8, y, FL + .45 + .45 * i)), wood) for i in range(4)] + [(box(.05, .5, 1.85, at=(-75.8 + s * 2.28, y, FL)), wood_d) for s in (-1, 1)]
        multi(f'Dorfladen_Regal_{k}', P, c)
        rr = random.Random(300 + k); G = []
        for i in range(4):
            x = -77.95
            while x < -73.7:
                w = rr.choice((.12, .16, .2)); h = rr.choice((.14, .2, .26)); G.append((box(w, .3, h, at=(x + w / 2, y + .06, FL + .48 + .45 * i)), rr.choice(PAL))); x += w + .03
        multi(f'Dorfladen_Waren_{k}', G, c, collide=0)
    multi('Dorfladen_Theke', [(box(.7, 2.4, 1.0, at=(-72.0, 177.2, FL), bevel_w=.02), wood), (box(.8, 2.5, .05, at=(-72.0, 177.2, FL + 1.0)), lp('Arbeitsplatte', '#3a3c3f', .4)),
                              (box(.4, .35, .25, at=(-72.0, 177.6, FL + 1.05)), lp('Kasse_alt', '#6d6a5e', .5, .3))], c)
    sr = [(box(.6, .5, 1.5, at=(-78.6, 178.6, FL)), lp('Regal_gruen', '#2f6b3a', .6))] + [(box(.6, .06, .02, at=(-78.6, 178.33, FL + .4 + .35 * i)), steel) for i in range(3)]
    multi('Samenstaender', sr, c)
    for k, (it, lb, col) in enumerate((('saat_kartoffel', 'Saatkartoffeln', '#c9a273'), ('saat_karotte', 'Karottensamen', '#f28e2b'), ('saat_kuerbis', 'Kürbissamen', '#e9a23b'))):
        pickup(f'Saat_Laden_{k}', [(box(.14, .02, .2, at=(-78.75 + .15 * k, 178.3, FL + .42 + .35 * k)), lp(f'Saat_{k}', col, .6)), (box(.1, .021, .08, at=(-78.75 + .15 * k, 178.3, FL + .5 + .35 * k)), white)], it, lb)
    for k, (it, lb, x, y, z) in enumerate((('dosensuppe', 'Dosensuppe', -76.9, 172.43, .93), ('mehl', 'Mehl', -75.0, 174.83, .48), ('kekse', 'Kekse', -74.4, 170.03, 1.38), ('wasser', 'Wasser', -77.3, 174.83, 1.38))):
        pickup(f'Dorfladen_{lb}_{k}', [(box(.14, .1, .2, at=(x, y, FL + z), bevel_w=.01), PAL[(k * 3 + 1) % 14]), (box(.1, .104, .06, at=(x, y, FL + z + .12)), white)], it, lb)

    # H3 locked (west, y 184 … 192): workshop of a carpenter – saw, pumpkin seeds
    FL = house('Haus_7', -78.5, 184, WEST_FRONT, 192, plaster[2], roof_m[2], ('E', 3.0), [('E', 1.0), ('E', 5.4), ('S', 2.0)], 'Haustür Nr. 7',
               locked='Abgeschlossen. Die Fenster sind vernagelt. Mit einem Brecheisen ginge es.')
    for k in range(2):
        for i in range(3): obj(f'Haus_7_Brett_{k}_{i}', box(.04, 1.4, .12, at=(WEST_FRONT + .03, 184.25 + 1.0 + 4.4 * k + .5, FL + 1.0 + .3 * i), rz=.15 * (i - 1)), wood, c, collide=0)
    multi('Haus_7_Werkbank', [(box(2.2, .8, .06, at=(-75.0, 190.9, FL + .85)), wood), (box(.08, .7, .85, at=(-76.0, 190.9, FL)), wood_d), (box(.08, .7, .85, at=(-74.0, 190.9, FL)), wood_d),
                              (box(2.2, .04, 1.0, at=(-75.0, 191.6, FL + 1.1)), lp('Lochwand', '#c9a273', .8))] + [(box(.04, .03, .3, at=(-75.8 + .3 * i, 191.55, FL + 1.4)), steel) for i in range(6)], c)
    pickup('Saege', [(box(.6, .02, .14, at=(-75.3, 190.8, FL + .91)), steel), (box(.14, .04, .1, at=(-74.95, 190.8, FL + .91)), lp('Axtstiel', '#b08a5a', .8))], 'saege', 'Säge')
    furn_cupboard('Haus_7_Schrank', -77.9, 185.5, FL, math.pi / 2, 'Werkzeugschrank', [['saat_kuerbis', 1], ['lappen', 1], ['batterien', 1]], 'Kürbissamen, ein Lappen und Batterien.')
    for i in range(6): obj(f'Haus_7_Holz_{i}', box(2.0, .2, .03, at=(-77.0, 188.0 + .25 * i, FL + .05 + .03 * (i % 3))), plank, c)

    # H4 (west, y 196 … 206): living room with tiled stove, bedroom
    FL = house('Haus_9', -78.5, 196, WEST_FRONT, 206, plaster[3], roof_m[0], ('E', 4.2), [('E', 1.2), ('E', 7.4), ('N', 3.5), ('S', 4.0)], 'Haustür Nr. 9')
    furn_stove('Haus_9_Ofen', -77.6, 198.2, FL); furn_sofa('Haus_9_Sofa', -74.5, 196.9, FL, math.pi, 2); rug('Haus_9_Teppich', -74.8, 199.0, FL, 2.4, 1.8, 0)
    furn_bed('Haus_9_Bett', -77.4, 204.2, FL, 0, 1); multi('Haus_9_Zwischenwand', [(box(4.0, .12, 2.6, at=(-76.3, 202.0, FL)), plaster[3])], c)
    furn_cupboard('Haus_9_Schrank', -73.8, 205.3, FL, 0, 'Kleiderschrank', [['verband', 1], ['saat_karotte', 1], ['schokolade', 1]], 'Ein Verband, Karottensamen und eine Tafel Schokolade.')

    # H5 (east, y 151 … 159): farmhouse kitchen
    FL = house('Haus_2', EAST_FRONT, 151, -48.8, 159, plaster[0], roof_m[1], ('W', 3.2), [('W', 1.0), ('W', 5.6), ('N', 3.0), ('E', 3.0)], 'Haustür Nr. 2')
    furn_kitchen('Haus_2_Kueche', -55.6, -50.0, 151.25, FL, -1); furn_table('Haus_2_Tisch', -52.4, 156.3, FL, 1.4, .9)
    furn_cupboard('Haus_2_Speisekammer', -49.6, 157.6, FL, -math.pi / 2, 'Speisekammer', [['saat_kartoffel', 2], ['dosenbohnen', 1], ['mehl', 1]], 'Saatkartoffeln, Bohnen und ein Sack Mehl.')

    # H6 burnt-out ruin (east, y 206 … 214)
    house('Haus_Ruine', EAST_FRONT, 206, -48.8, 214, plaster[1], roof_m[0], ('W', 3.0), [('W', 1.0), ('W', 5.6)], 'Ruine', ruin=True, chimney=False)
    for i in range(7):
        b = cyl(.12, 3.0, at=(-1.5, 0, 0), seg=5, axis='X'); rotz(b, R.uniform(0, 3)); move(b, (-54.5 + R.uniform(-.6, .6), 211 + R.uniform(-.8, 1.5), .35 + .1 * i)); obj(f'Ruine_Balken_{i}', b, char, c)
    multi('Ruine_Schutt', [(ico(.7, at=(-50.6, 208.0, .25), sub=1, jit=.3, seed=31, sz=.4), char), (ico(.5, at=(-50.0, 207.3, .2), sub=1, jit=.3, seed=32, sz=.5), stone_d)], c,
          interact='search', label='Schutthaufen', item='stein', loot=[['stein', 3], ['goldmuenze', 1]], found='Unter dem Schutt: ein paar Steine – und eine alte Goldmünze!')

    # ------------------------------------------------------------ village square: paving, well, lime tree, benches, phone box, notice board
    sq = box(14, 19, .06, at=(-50.0, 184.5, 0)); obj('Dorfplatz', sq, cobble, c)
    wx, wy = -50.0, 183.0; Wl = []
    for i in range(12):
        a0 = 6.283 * i / 12; Wl.append((box(.5, .36, .75, at=(wx + 1.1 * math.cos(a0), wy + 1.1 * math.sin(a0), .06), rz=a0 + math.pi / 2, bevel_w=.03), stone))
    Wl += [(cyl(.95, .02, at=(wx, wy, .6), seg=12), lp('Brunnenwasser', '#3a6a7a', .1, var=.02)),
           (box(.15, .15, 2.2, at=(wx - 1.15, wy, .06)), wood_d), (box(.15, .15, 2.2, at=(wx + 1.15, wy, .06)), wood_d), (cyl(.08, 2.3, at=(wx - 1.15, wy, 1.7), seg=6, axis='X'), wood),
           (box(.3, .05, .05, at=(wx + 1.3, wy - .2, 1.7)), steel), (cyl(.12, .2, at=(wx, wy, 1.4), seg=6), wood_d), (cyl(.01, .8, at=(wx, wy, .7), seg=4), lp('Seil', '#c9b38a', .9))]
    rf = [solid([(wx - 1.5, wy - 1.3, 2.2), (wx + 1.5, wy - 1.3, 2.2), (wx + 1.5, wy, 2.9), (wx - 1.5, wy, 2.9)], (0, 0, .08)),
          solid([(wx - 1.5, wy + 1.3, 2.2), (wx + 1.5, wy + 1.3, 2.2), (wx + 1.5, wy, 2.9), (wx - 1.5, wy, 2.9)], (0, 0, .08))]
    Wl += [(rf[0], roof_m[0]), (rf[1], roof_m[0])]
    multi('Dorfbrunnen', Wl, c, interact='use', use='brunnen', label='Brunnen')
    tx, ty = -45.0, 189.0; LT = [(cyl(.45, 4.0, at=(0, 0, 0), seg=8, r2=.35), lp('Rinde', '#5a4030', .9, var=.08))]
    for i in range(6): LT.append((ico(2.4 + .3 * (i % 2), at=(1.6 * math.cos(i), 1.6 * math.sin(i), 4.6 + .6 * (i % 3)), sub=1, jit=.2, seed=600 + i), lp('Linde', '#6f9a3a', .9, var=.08)))
    o = multi('Dorflinde', LT, c, collide_r=.45, tree='Linde'); o.location = (tx, ty, 0)
    for k, (x, y, rz) in enumerate(((-53.5, 179.0, 0), (-46.5, 179.0, 0), (-43.5, 186.0, math.pi / 2))):
        P = [(box(1.6, .42, .05, at=(0, 0, .45)), wood), (box(1.6, .05, .4, at=(0, .2, .55)), wood), (box(.08, .42, .45, at=(-.7, 0, 0)), steel), (box(.08, .42, .45, at=(.7, 0, 0)), steel)]
        out = []
        for bm_, m in P: rotz(bm_, rz); move(bm_, (x, y, .06)); out.append((bm_, m))
        multi(f'Dorfbank_{k}', out, c)
    px, py = -56.0, 176.5
    multi('Telefonzelle', [(box(1.0, 1.0, .1, at=(px, py, .06)), lp('Grau_dunkel', '#5b5f63', .6)), (box(1.0, 1.0, .25, at=(px, py, 2.25)), yel),
                           (box(.06, .06, 2.1, at=(px - .47, py - .47, .16)), yel), (box(.06, .06, 2.1, at=(px + .47, py - .47, .16)), yel), (box(.06, .06, 2.1, at=(px - .47, py + .47, .16)), yel),
                           (box(.06, .06, 2.1, at=(px + .47, py + .47, .16)), yel), (box(.92, .02, 1.9, at=(px, py + .47, .3)), gl), (box(.02, .92, 1.9, at=(px - .47, py, .3)), gl),
                           (box(.02, .92, 1.9, at=(px + .47, py, .3)), gl), (box(.3, .15, .45, at=(px, py + .38, 1.2)), lp('Telefon_grau', '#6d7277', .5, .3)),
                           (text_bm('TELEFON', .1, at=(px, py - .51, 2.3), depth=.01), blk)], c, interact='use', use='telefon', label='Telefonzelle')
    multi('Infotafel', [(box(.1, .1, 1.8, at=(-55.0 + s * .7, 191.0, .06)), wood_d) for s in (-1, 1)] + [(box(1.6, .06, 1.0, at=(-55.0, 191.0, .9)), wood), (box(1.4, .07, .8, at=(-55.0, 191.0, 1.0)), lp('Papier', '#ffffff', .8)),
                        (box(1.8, .5, .06, at=(-55.0, 191.1, 2.0)), roof_m[1])], c, interact='read', label='Infotafel „Wanderwege“',
          text='Tannbach – Wanderwege: <br>🗼 Aussichtsturm Hirschkopf – Ostweg ab der Kurve südlich des Dorfs, auf dem Hügel.<br>🏰 Burgruine Falkenstein – Westweg, auf dem Berg südwestlich.<br>⛏️ Alter Steinbruch – Weg östlich vom Dorf. Steine für alle!<br>⚙️ Alte Mühle – am Bach, unterhalb des Turms.<br>⛽ Tankstelle „Waldtank“ – Landstraße 4 km südlich.',
          reveal='turm,ruine,steinbruch,muehle')

    # ------------------------------------------------------------ chapel with tower (north of the square)
    x0, y0, x1, y1 = -54.0, 194.0, -42.0, 201.0; FLc = .3; T = .35; H = 4.2
    CP = [(box(x1 - x0 + .2, y1 - y0 + .2, .3, at=((x0 + x1) / 2, (y0 + y1) / 2, -.02)), stone_d), (box(x1 - x0 - 2 * T, y1 - y0 - 2 * T, .03, at=((x0 + x1) / 2, (y0 + y1) / 2, FLc - .02)), cobble)]
    sw = [(5.4, 1.2, 0, 2.6), (1.6, .8, 1.4, 3.4), (9.6, .8, 1.4, 3.4)]
    CP += [(wall((x0, y0 + T / 2), (x1, y0 + T / 2), T, H, sw, FLc), plaster[0]), (wall((x0, y1 - T / 2), (x1, y1 - T / 2), T, H, [(1.6, .8, 1.4, 3.4), (5.6, .8, 1.4, 3.4), (9.6, .8, 1.4, 3.4)], FLc), plaster[0]),
           (wall((x0 + T / 2, y0 + T), (x0 + T / 2, y1 - T), T, H, (), FLc), plaster[0]), (wall((x1 - T / 2, y0 + T), (x1 - T / 2, y1 - T), T, H, [(2.65, .6, 1.8, 3.4)], FLc), plaster[0])]
    for o_ in sw[1:]: CP.append((box(.7, .03, 2.0, at=(x0 + o_[0] + .4, y0 + T / 2, FLc + 1.4)), lp('Kirchenfenster', '#7fa6c9', .2, alpha=.5)))
    for o_ in ((1.6, .8, 1.4, 3.4), (5.6, .8, 1.4, 3.4), (9.6, .8, 1.4, 3.4)): CP.append((box(.7, .03, 2.0, at=(x0 + o_[0] + .4, y1 - T / 2, FLc + 1.4)), lp('Kirchenfenster', '#7fa6c9', .2, alpha=.5)))
    CP.append((frame((x0, y0 + T / 2), (x1, y0 + T / 2), T, sw[0], FLc, .1, T + .06), stone))
    half = (y1 - y0) / 2 + .4; ym = (y0 + y1) / 2; zt = FLc + H; rh = half * math.tan(math.radians(48))
    for s in (-1, 1):
        ye = ym + s * half
        CP.append((solid([(x0 - .3, ye, zt - .4), (x1 + .4, ye, zt - .4), (x1 + .4, ym, zt + rh - .4), (x0 - .3, ym, zt + rh - .4)], (0, 0, .15)), roof_m[2]))
    CP.append((solid([(x1 - T, y0, zt), (x1 - T, y1, zt), (x1 - T, ym, zt + (y1 - y0) / 2 * math.tan(math.radians(48)))], (T, 0, 0)), plaster[0]))
    # tower at the west end (4 × 4 m, 15 m, louvres, clock, spire)
    tx0, tx1, ty0, ty1 = -57.6, -54.0, 195.7, 199.3
    CP += [(box(tx1 - tx0, ty1 - ty0, 11.0, at=((tx0 + tx1) / 2, (ty0 + ty1) / 2, -.02)), plaster[0]), (box(tx1 - tx0 + .2, ty1 - ty0 + .2, .3, at=((tx0 + tx1) / 2, (ty0 + ty1) / 2, 10.9)), stone)]
    for s in range(4):
        a0 = s * math.pi / 2; dx, dy = math.cos(a0), math.sin(a0)
        CP.append((box(1.0 if dy else .05, .05 if dy else 1.0, 1.4, at=((tx0 + tx1) / 2 + dx * 1.82, (ty0 + ty1) / 2 + dy * 1.82, 8.6)), lp('Schalllamellen', '#3a3632', .8)))
        CP.append((cyl(.55, .04, at=((tx0 + tx1) / 2 + dx * 1.81, (ty0 + ty1) / 2 + dy * 1.81, 6.6), seg=12, axis='X' if dx else 'Y'), white))
        CP.append((box(.04 if dx else .06, .06 if dx else .04, .45, at=((tx0 + tx1) / 2 + dx * 1.84, (ty0 + ty1) / 2 + dy * 1.84, 6.42)), blk))
    sp_ = cone(2.7, 6.5, at=((tx0 + tx1) / 2, (ty0 + ty1) / 2, 11.2), seg=4); rotz(sp_, math.pi / 4, cent=((tx0 + tx1) / 2, (ty0 + ty1) / 2, 0)); CP.append((sp_, roof_m[2]))
    CP += [(box(.06, .06, 1.2, at=((tx0 + tx1) / 2, (ty0 + ty1) / 2, 17.6)), lp('Gold', '#d4a83a', .3, .8)), (box(.5, .06, .06, at=((tx0 + tx1) / 2, (ty0 + ty1) / 2, 18.4)), lp('Gold', '#d4a83a', .3, .8))]
    multi('Kapelle', CP, c)
    hinge = (x0 + 5.4 + .06, y0 + T / 2, FLc)
    leaf = [(box(1.08, .08, 2.45, at=(.54, 0, 0)), door_m), (box(.04, .14, .04, at=(.9, 0, 1.1)), steel)]
    multi('Kapelle_Tuer', [(move(b_, hinge), m) for b_, m in leaf], c, pivot=hinge, interact='door', angle=math.radians(100), label='Kapellentür')
    obj('Kapelle_Stufe', box(2.0, .8, .15, at=(x0 + 6.0, y0 - .4, 0)), stone, c)
    for row in range(5):
        for s in (-1, 1):
            yy = ym + s * 1.7; xx = -51.5 + 1.25 * row
            multi(f'Kirchenbank_{row}_{s}', [(box(.42, 2.2, .05, at=(xx, yy, FLc + .45)), wood), (box(.05, 2.2, .5, at=(xx + .2, yy, FLc + .5)), wood),
                                            (box(.42, .06, .9, at=(xx, yy - 1.08, FLc)), wood_d), (box(.42, .06, .9, at=(xx, yy + 1.08, FLc)), wood_d)], c)
    multi('Altar', [(box(.9, 2.0, 1.0, at=(-43.6, ym, FLc), bevel_w=.02), stone), (box(1.0, 2.1, .06, at=(-43.6, ym, FLc + 1.0)), white),
                    (box(.06, .06, 1.4, at=(-42.5, ym, FLc + 1.6)), lp('Gold', '#d4a83a', .3, .8)), (box(.06, .7, .06, at=(-42.5, ym, FLc + 2.5)), lp('Gold', '#d4a83a', .3, .8))] +
          [(cyl(.04, .3, at=(-43.6, ym + s * .7, FLc + 1.06), seg=6), white) for s in (-1, 1)], c)
    multi('Sakristeischrank', [(box(.5, 1.2, 1.8, at=(-42.6, y0 + .9, FLc), bevel_w=.02), wood_d), (box(.02, .56, 1.6, at=(-42.88, y0 + .6, FLc + .1)), wood), (box(.02, .56, 1.6, at=(-42.88, y0 + 1.2, FLc + .1)), wood)], c,
          interact='search', label='Sakristeischrank', item='verband', loot=[['verband', 1], ['feuerzeug', 1], ['batterie_9v', 1]],
          found='Ein Verbandskasten, Streichhölzer – und ein 9-V-Block. Den könnte das Funkgerät gebrauchen.')

    # ------------------------------------------------------------ bus stop (west pavement)
    bx, by = RX - 5.0, 183.0
    multi('Bushalt_Dorf', [(box(.06, 3.0, 2.2, at=(bx - .75, by, .14)), gl), (box(1.6, 3.2, .08, at=(bx - .1, by, 2.35)), lp('Dach_Bus', '#4a5560', .5, .4)),
                           (box(.42, 2.4, .05, at=(bx - .45, by, .58)), wood)] + [(box(.07, .07, 2.25, at=(bx + sx_, by + sy_, .14)), lp('Mast', '#6d7277', .5, .6)) for sx_ in (-.75, .55) for sy_ in (-1.5, 1.5)], c)
    multi('Fahrplan_Dorf', [(box(.02, .5, .6, at=(bx - .71, by + .8, 1.0)), lp('Papier', '#ffffff', .8))], c, collide=0, interact='read', label='Fahrplan „Tannbach“',
          text='Linie 412 · Tannbach → Waldtank → Ortsmitte. Mo–Fr 7:05 und 16:30. „Wegen Sturmschäden bis auf Weiteres eingestellt.“')

    # ------------------------------------------------------------ farm: barn with sliding door, hay, tractor, tools, seeds; old field with fence, hand pump
    bx0, bx1, by0, by1 = -46.0, -36.0, 152.0, 164.0; bz = Z(-41, 158); T = .2; H = 3.6
    barn_w = lp('Scheune_rot', '#8a3a2a', .85, var=.08); BP = [(box(bx1 - bx0, by1 - by0, .15, at=((bx0 + bx1) / 2, (by0 + by1) / 2, bz - .05)), lp('Beton', '#b3b0a8', .9, var=.05))]
    BP += [(wall((bx0 + T / 2, by0), (bx0 + T / 2, by1), T, H, [(3.5, 3.2, 0, 3.0)], bz + .1), barn_w), (wall((bx1 - T / 2, by0), (bx1 - T / 2, by1), T, H, [(5.0, 1.0, 1.5, 2.4)], bz + .1), barn_w),
           (wall((bx0 + T, by0 + T / 2), (bx1 - T, by0 + T / 2), T, H, (), bz + .1), barn_w), (wall((bx0 + T, by1 - T / 2), (bx1 - T, by1 - T / 2), T, H, [(4.4, 1.0, 0, 2.1)], bz + .1), barn_w)]
    for i in range(int((by1 - by0) / .6)):
        if not (by0 + 3.4 < by0 + .3 + .6 * i < by0 + 6.8): BP.append((box(.05, .08, H, at=(bx0 - .02, by0 + .3 + .6 * i, bz + .1)), lp('Scheune_Leiste', '#6a2a1e', .85)))
    half = (bx1 - bx0) / 2 + .5; xm = (bx0 + bx1) / 2; zt = bz + .1 + H; rh = half * math.tan(math.radians(38))
    for s in (-1, 1):
        xe = xm + s * half
        BP.append((solid([(xe, by0 - .4, zt - .4), (xe, by1 + .4, zt - .4), (xm, by1 + .4, zt + rh - .4), (xm, by0 - .4, zt + rh - .4)], (0, 0, .12)), lp('Wellblech', '#7b8287', .5, .5, var=.05)))
    for yy in (by0, by1 - T): BP.append((solid([(bx0, yy, zt), (bx1, yy, zt), (xm, yy, zt + (bx1 - bx0) / 2 * math.tan(math.radians(38)))], (0, T, 0)), barn_w))
    multi('Scheune', BP, c)
    multi('Scheunentor', [(box(.1, 3.2, 3.0, at=(bx0 - .12, by0 + 3.5 + 1.6, bz + .1)), lp('Scheunentor', '#7a3326', .85, var=.08)),
                          (box(.12, 3.2, .12, at=(bx0 - .13, by0 + 5.1, bz + 1.5)), wood_d), (box(.12, .12, 3.0, at=(bx0 - .13, by0 + 3.7, bz + .1)), wood_d), (box(.12, .12, 3.0, at=(bx0 - .13, by0 + 6.5, bz + .1)), wood_d)],
          c, pivot=(bx0 - .12, by0 + 5.1, bz + .1), interact='slide', slide=[0, 3.2, 0], label='Scheunentor')
    obj('Scheunentor_Schiene', box(.08, 7.0, .1, at=(bx0 - .14, by0 + 6.5, bz + 3.15)), steel, c, collide=0)
    for i in range(8):
        hx, hy = -38.0 - (i % 2) * 1.3, 153.2 + (i // 2) * 1.1 + (2 if i >= 6 else 0)
        multi(f'Heuballen_{i}', [(box(1.2, 1.0, .9, at=(hx, hy, bz + .1 + (.9 if i in (1, 3) else 0)), bevel_w=.08, seg=2), hay)], c)
    TR = [(box(1.2, 2.2, .7, at=(0, 0, .6), bevel_w=.05), lp('Traktor', '#2e7d3a', .5, .2)), (box(.8, .9, 1.0, at=(0, .55, 1.3), bevel_w=.03), lp('Traktor', '#2e7d3a', .5, .2)),
          (box(.75, .02, .7, at=(0, .1, 1.5)), gl), (cyl(.06, .8, at=(-.3, -.9, 1.2), seg=6), blk)]
    for sx_ in (-1, 1):
        TR += [(cyl(.62, .35, at=(sx_ * .78, .55, .62), seg=12, axis='X'), lp('Reifen', '#1b1b1c', .9)), (cyl(.4, .28, at=(sx_ * .68, -.75, .4), seg=10, axis='X'), lp('Reifen', '#1b1b1c', .9))]
    o = multi('Traktor', [(move(b_, (-43.0, 160.5, bz + .1)), m) for b_, m in TR], c)
    multi('Scheune_Werkbank', [(box(.7, 2.0, .06, at=(-36.6, 160.0, bz + .95)), wood), (box(.6, .08, .85, at=(-36.6, 159.1, bz + .1)), wood_d), (box(.6, .08, .85, at=(-36.6, 160.9, bz + .1)), wood_d)], c)
    pickup('Spaten_Scheune', [(box(.04, .04, 1.0, at=(-36.35, 161.6, bz + .3)), lp('Axtstiel', '#b08a5a', .8)), (box(.2, .03, .28, at=(-36.35, 161.6, bz + .1)), steel), (box(.16, .05, .04, at=(-36.35, 161.6, bz + 1.3)), lp('Axtstiel', '#b08a5a', .8))], 'spaten', 'Spaten')
    pickup('Hammer_Scheune', [(box(.03, .3, .03, at=(-36.8, 159.6, bz + 1.02)), lp('Axtstiel', '#b08a5a', .8)), (box(.05, .05, .12, at=(-36.8, 159.47, bz + 1.0)), steel)], 'hammer', 'Hammer')
    for k, (it, lb) in enumerate((('saat_kartoffel', 'Saatkartoffeln'), ('saat_kartoffel', 'Saatkartoffeln'), ('saat_karotte', 'Karottensamen'))):
        sx, sy = -37.2 + .0, 163.0 - .7 * k
        multi(f'Saatsack_{k}', [(ico(.32, at=(sx, sy, bz + .4), sub=2, jit=.12, seed=700 + k, sz=1.3), lp('Jute', '#b08d57', .95, var=.08)), (cyl(.12, .14, at=(sx, sy, bz + .78), seg=7), lp('Jute', '#b08d57', .95)),
                                (torus(.12, .025, at=(sx, sy, bz + .8), seg=8, seg2=4, axis='Z'), lp('Seil', '#c9b38a', .9))], c, collide=0, interact='pickup', item=it, label=lb)
    # old field with furrows and a fence (gate on the west side)
    fx0, fx1, fy0, fy1 = -32.0, -18.0, 150.0, 168.0
    fz = lambda x, y: Z(x, y)
    fur = []
    for i in range(int((fx1 - fx0) / .9)):
        x = fx0 + .5 + .9 * i; rows = []
        for y in range(int(fy0) + 1, int(fy1), 2): rows.append((y, fz(x, y)))
        for (ya, za), (yb, zb) in zip(rows, rows[1:]):
            fur.append(solid([(x - .3, ya, za + .02), (x + .3, ya, za + .02), (x + .3, yb, zb + .02), (x - .3, yb, zb + .02)], (0, 0, .12)))
    obj('Furchen', merge(*fur), soil, c, collide=0)
    weeds = []
    for k in range(40):
        x, y = R.uniform(fx0 + .5, fx1 - .5), R.uniform(fy0 + .5, fy1 - .5)
        for _ in range(3): weeds.append(cone(.12, R.uniform(.3, .55), at=(x + R.uniform(-.1, .1), y + R.uniform(-.1, .1), fz(x, y)), seg=3))
    obj('Unkraut', merge(*weeds), lp('Grasbuesche', '#7f9c45', .9, var=.1), c, collide=0)
    posts = []
    for (ax, ay), (bx_, by_) in (((fx0, fy0), (fx1, fy0)), ((fx1, fy0), (fx1, fy1)), ((fx1, fy1), (fx0, fy1)), ((fx0, fy1), (fx0, 160.5)), ((fx0, 157.5), (fx0, fy0))):
        L = math.hypot(bx_ - ax, by_ - ay); n = max(1, int(L / 2.0))
        for j in range(n + 1):
            x = ax + (bx_ - ax) * j / n; y = ay + (by_ - ay) * j / n; posts.append(box(.1, .1, 1.1, at=(x, y, fz(x, y) - .1)))
        for j in range(n):
            xa, ya_ = ax + (bx_ - ax) * j / n, ay + (by_ - ay) * j / n; xb, yb = ax + (bx_ - ax) * (j + 1) / n, ay + (by_ - ay) * (j + 1) / n
            for hh in (.45, .85):
                rail = box(math.hypot(xb - xa, yb - ya_), .05, .08, at=(0, 0, 0)); rotz(rail, math.atan2(yb - ya_, xb - xa)); move(rail, ((xa + xb) / 2, (ya_ + yb) / 2, (fz(xa, ya_) + fz(xb, yb)) / 2 + hh))
                posts.append(rail)
    obj('Feldzaun', merge(*posts), lp('Zaun_Holz', '#8a6a48', .9, var=.08), c)
    multi('Schwengelpumpe', [(box(.4, .4, .1, at=(-34.0, 162.0, Z(-34, 162))), stone), (cyl(.08, 1.1, at=(-34.0, 162.0, Z(-34, 162) + .1), seg=8), lp('Pumpe_gruen', '#2f5a3a', .5, .4)),
                             (cyl(.03, .3, at=(-34.0, 162.15, Z(-34, 162) + .85), seg=6, axis='Y'), lp('Pumpe_gruen', '#2f5a3a', .5, .4)),
                             (box(.04, .7, .04, at=(-34.0, 161.7, Z(-34, 162) + 1.2), rz=0), lp('Pumpe_gruen', '#2f5a3a', .5, .4)), (box(.5, .3, .2, at=(-34.0, 162.4, Z(-34, 162))), stone_d)],
          c, interact='use', use='brunnen', label='Schwengelpumpe')
    multi('Misthaufen', [(ico(1.2, at=(-34.0, 166.5, Z(-34, 166.5)), sub=1, jit=.3, seed=88, sz=.45), lp('Mist', '#5a4630', .95, var=.1))], c, collide=0)
    spot('ziel_dorf', (VILLAGE[0] + 14, VILLAGE[1], .2), quest='dorf')
