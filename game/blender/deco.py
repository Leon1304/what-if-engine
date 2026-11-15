# Detail kit for buildings and streets (exec'd by core.py, shares its globals): gutters + downpipes, wall lamps, house numbers,
# mailboxes, rain barrels, firewood stacks, wheelie bins, satellite dishes, TV aerials, bicycles, flower pots, door canopies,
# window sills + glazing bars, power lines on wooden poles, hydrants, manhole covers.
# Every d_*() returns a list of (bmesh, material) in WORLD coordinates, ready to append to a multi() part list or to become its own object.
# Local frame of a facade piece: x along the wall, y = out of the wall (front = +y … turned by rz), z up; `at` = foot point on the wall.
# FACE[side] gives rz for a wall whose outside looks S / N / W / E.
FACE = {'S': math.pi, 'N': 0.0, 'W': math.pi / 2, 'E': -math.pi / 2}

def _gz(x, y):
    """Ground height: the valley terrain, or the mountains (second map, y > 600)."""
    return berg_h(x, y) if y > 600 else terrain_h(x, y)

def _T(parts, at, rz):
    out = []
    for bm_, m in parts:
        if rz: rotz(bm_, rz)
        move(bm_, at); out.append((bm_, m))
    return out

def _dm():
    """Shared detail materials (lp() reuses materials by name)."""
    return dict(
        zink=lp('Zink', '#9aa0a3', .45, .7, var=.04), zink_d=lp('Zink_dunkel', '#6e7478', .5, .6, var=.04),
        iron=lp('Eisen_schwarz', '#2b2c2e', .6, .5, var=.03), lampglas=lp('Lampenglas_warm', '#f1e2b0', .3, var=0),
        blau=lp('Schild_blau', '#244f8f', .5, var=.02), weiss=lp('Weiss_glanz', '#f4f4f1', .3, var=.02),
        gelb=lp('Post_gelb', '#f2c230', .5, var=.02), gruen=lp('Tonne_gruen', '#3e6a3a', .6, var=.04),
        holz=lp('Holz_grau', '#8a7a64', .9, var=.08), holz_d=lp('Holz_dunkel', '#6b4630', .7, var=.05),
        stirn=lp('Hirnholz', '#c8a676', .9, var=.1), rinde=lp('Rinde', '#5a4636', .95, var=.1),
        tonne_g=lp('Tonne_grau', '#4a4e52', .6, var=.03), tonne_b=lp('Tonne_blau', '#2a5a9a', .6, var=.03), tonne_br=lp('Tonne_braun', '#6a4a2e', .6, var=.03),
        gummi=lp('Gummi', '#1c1c1d', .9, var=.02), stahl=lp('Stahl', '#9da2a6', .35, .8, var=.04), rot=lp('Signal_rot', '#b8322a', .5, var=.03),
        ton=lp('Terrakotta', '#b0603a', .9, var=.08), erde=lp('Blumenerde', '#3e2c20', 1.0, var=.08), blatt=lp('Busch', '#4f7a34', .9, var=.1),
        blume=lp('Blumen', '#d6406a', .8, var=.15), blume2=lp('Blumen_gelb', '#e9c23a', .8, var=.15), sandstein=lp('Sandstein', '#b9a888', .9, var=.08),
        mast=lp('Holzmast', '#5e4a36', .95, var=.08), isol=lp('Isolator', '#e8e6df', .3, var=.02), kabel=lp('Kabel', '#1a1a1a', .8, var=0),
        guss=lp('Gusseisen', '#3a3c3e', .7, .4, var=.06), ziegel=lp('Ziegel_Kamin', '#8a4a38', .9, var=.08),
    )

# ---------------------------------------------------------------- roof edge
def d_gutter(a, b, z, out=(0, -1), pipes=(0, 1), wall=.4, inset=.35):
    """Eaves gutter from a to b (x, y) at height z, `out` = unit 2D vector away from the house, `wall` = how far the gutter hangs in front of
    the wall face. Downpipes at the ends listed in pipes (0 = a, 1 = b): a swan neck back to the wall, then down the wall `inset` m in from the
    end of the gutter (inside the wall span) to a shoe at the ground."""
    M = _dm(); ax, ay = a; bx, by = b; L = math.hypot(bx - ax, by - ay); rz = math.atan2(by - ay, bx - ax)
    mx, my = (ax + bx) / 2 + out[0] * .08, (ay + by) / 2 + out[1] * .08
    P = [(box(L + .1, .14, .1, at=(0, 0, -.1)), M['zink']), (box(L + .1, .02, .05, at=(0, .07, -.05)), M['zink_d'])]
    for k in range(int(L / .9) + 1): P.append((box(.02, .16, .02, at=(-L / 2 + .05 + k * .9, 0, -.11)), M['zink_d']))   # hooks
    parts = _T(P, (mx, my, z), rz + (math.pi if out[0] * -math.sin(rz) + out[1] * math.cos(rz) < 0 else 0))
    ux, uy = math.cos(rz), math.sin(rz)
    for e in pipes:
        d = 1 if e == 0 else -1; ex, ey = (ax, ay) if e == 0 else (bx, by)
        gx, gy = ex + ux * d * (inset + wall), ey + uy * d * (inset + wall)            # below the gutter …
        px, py = gx - out[0] * (wall - .1), gy - out[1] * (wall - .1)                    # … and on the wall
        gz = _gz(px, py); top = z - .45
        neck = box(.09, .09, math.hypot(wall - .1, .3) + .05, at=(0, 0, 0)); ang = math.atan2(wall - .1, .3)
        bmesh.ops.rotate(neck, cent=(0, 0, 0), matrix=Matrix.Rotation(ang, 3, 'X'), verts=neck.verts); rotz(neck, math.atan2(out[1], out[0]) - math.pi / 2 + math.pi)
        move(neck, (px, py, top))
        parts += [(cyl(.045, top - gz - .12, at=(px, py, gz + .12), seg=8), M['zink']), (box(.1, .1, .14, at=(px + out[0] * .05, py + out[1] * .05, gz)), M['zink']),
                  (neck, M['zink']), (cyl(.06, .14, at=(gx, gy, z - .2), seg=8, r2=.04), M['zink'])]
        for h in (.6, 1.6, 2.4):
            if gz + h < top - .2: parts.append((cyl(.055, .04, at=(px, py, gz + h), seg=8), M['zink_d']))
    return parts

def d_roof_courses(eave, ridge, length, axis, thick=.14, step=.32, mat=None):
    """Tile courses on a straight roof plane: thin battens from the eave line (x|y, z) up to the ridge line, running along `axis` ('x' | 'y')
    for `length` m, centred on the eave/ridge midpoint. eave / ridge = (horizontal coordinate across the slope, z, centre along the axis)."""
    (e0, ez, c0), (r0, rz_, _) = eave, ridge; n = int(math.hypot(r0 - e0, rz_ - ez) / step); P = []
    for k in range(1, n):
        t = k / n; h = e0 + (r0 - e0) * t; zz = ez + (rz_ - ez) * t + thick
        P.append((box(length, .06, .035, at=(c0, h, zz)) if axis == 'x' else box(.06, length, .035, at=(h, c0, zz)), mat))
    return P

def d_snowguard(a, b, z, out=(0, -1)):
    """Snow guard rail on a roof slope (two thin bars on brackets) – mountain huts."""
    M = _dm(); ax, ay = a; bx, by = b; L = math.hypot(bx - ax, by - ay); rz = math.atan2(by - ay, bx - ax)
    P = [(cyl(.02, L, at=(-L / 2, 0, .12), seg=5, axis='X'), M['iron']), (cyl(.02, L, at=(-L / 2, 0, .22), seg=5, axis='X'), M['iron'])]
    P += [(box(.03, .03, .26, at=(-L / 2 + k * L / 4, 0, 0)), M['iron']) for k in range(5)]
    return _T(P, ((ax + bx) / 2, (ay + by) / 2, z), rz)

# ---------------------------------------------------------------- facade
def d_wall_lamp(at, rz, on_group=None):
    """Lantern on a curled bracket (dark glass – street power is off), at = wall point at mounting height."""
    M = _dm()
    P = [(box(.12, .04, .2, at=(0, .02, -.1)), M['iron']), (box(.03, .32, .03, at=(0, .18, .06)), M['iron']), (torus(.07, .012, at=(0, .12, -.02), seg=8, seg2=4, axis='X'), M['iron']),
         (box(.2, .2, .04, at=(0, .32, -.14)), M['iron']), (box(.16, .16, .22, at=(0, .32, -.36)), M['lampglas']), (cyl(.13, .1, at=(0, .32, -.1), seg=4, r2=.02), M['iron']),
         (cyl(.025, .06, at=(0, .32, -.42), seg=6), M['iron'])]
    for sx in (-1, 1):
        for sy in (-1, 1): P.append((box(.015, .015, .22, at=(sx * .08, .32 + sy * .08, -.36)), M['iron']))
    return _T(P, at, rz)

def d_house_no(at, rz, n):
    """Enamel house-number plate (blue, white rim and number)."""
    M = _dm()
    P = [(box(.26, .02, .2, at=(0, .01, -.1), bevel_w=.006), M['weiss']), (box(.22, .025, .16, at=(0, .012, -.08)), M['blau']),
         (text_bm(str(n), .11, at=(0, .03, -.05), rz=math.pi, depth=.006), M['weiss'])]
    return _T(P, at, rz)

def d_mailbox(at, rz):
    """Yellow letter box on the wall (slot, lid, little post horn)."""
    M = _dm()
    P = [(box(.34, .16, .4, at=(0, .08, 0), bevel_w=.02), M['gelb']), (box(.36, .19, .06, at=(0, .09, .4), bevel_w=.01), M['gelb']),
         (box(.22, .02, .025, at=(0, .17, .3)), M['iron']), (torus(.035, .01, at=(0, .17, .16), seg=8, seg2=4, axis='Y'), M['iron'])]
    return _T(P, at, rz)

def d_canopy(at, rz, w=1.6, d=.8):
    """Small door canopy: slanted roof on two curved brackets (at = wall point above the door)."""
    M = _dm()
    rf = box(w, d, .06, at=(0, d / 2, 0)); bmesh.ops.rotate(rf, cent=(0, 0, 0), matrix=Matrix.Rotation(-.22, 3, 'X'), verts=rf.verts)
    P = [(rf, M['zink_d']), (box(w + .04, .05, .1, at=(0, d * .97, -d * .22 - .06)), M['zink'])]
    for sx in (-1, 1):
        P += [(box(.06, d * .8, .06, at=(sx * (w / 2 - .12), d * .4, -.12)), M['holz_d']), (box(.06, .06, .5, at=(sx * (w / 2 - .12), .03, -.6)), M['holz_d']),
              (box(.05, .45, .05, at=(sx * (w / 2 - .12), .25, -.4)), M['holz_d'])]
    return _T(P, at, rz)

def d_sill(at, rz, w):
    """Stone window sill (at = middle of the window bottom on the wall face)."""
    M = _dm(); return _T([(box(w + .16, .14, .05, at=(0, .05, -.05), bevel_w=.01), M['sandstein'])], at, rz)

def d_glazing(at, rz, w, h):
    """Glazing bars (cross) in front of a window pane (at = middle of the window bottom on the glass)."""
    M = _dm(); return _T([(box(.04, .03, h, at=(0, .02, 0)), M['weiss']), (box(w, .03, .04, at=(0, .02, h * .62)), M['weiss'])], at, rz)

def d_curtains(at, rz, w, h, col):
    """Curtains just inside a window (two panels gathered at the sides)."""
    return _T([(box(w * .22, .03, h * .9, at=(sx * w * .36, -.06, h * .05)), col) for sx in (-1, 1)] + [(box(w, .03, .1, at=(0, -.06, h * .9)), col)], at, rz)

def d_sat(at, rz):
    """Satellite dish on a wall arm (at = mounting point)."""
    M = _dm(); dish = dome(.32, at=(0, 0, 0), seg=10, rings=3, h=.12)
    bmesh.ops.rotate(dish, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(-60), 3, 'X'), verts=dish.verts); move(dish, (0, .45, .15))
    P = [(box(.12, .04, .16, at=(0, .02, -.08)), M['weiss']), (box(.04, .4, .04, at=(0, .22, 0)), M['weiss']), (dish, M['weiss']),
         (box(.03, .3, .03, at=(0, .55, .05)), M['zink_d']), (box(.06, .06, .08, at=(0, .7, .02)), M['iron'])]
    return _T(P, at, rz)

def d_aerial(at, h=1.6):
    """Old TV aerial on the ridge: mast, boom, cross elements, guy foot."""
    M = _dm(); x, y, z = at
    P = [(cyl(.025, h, at=(x, y, z), seg=6), M['zink']), (box(1.1, .03, .03, at=(x, y, z + h - .1)), M['zink'])]
    for k in range(6): P.append((box(.03, .7 - k * .07, .02, at=(x - .5 + k * .2, y, z + h - .1)), M['zink']))
    P.append((box(.03, .5, .02, at=(x, y, z + h * .6)), M['zink']))
    return P

def d_chimney_cap(x, y, z, w=.5):
    """Rain hood on a chimney: four little posts and a sheet-metal cap."""
    M = _dm(); P = [(box(.04, .04, .22, at=(x + sx * (w / 2 - .04), y + sy * (w / 2 - .04), z)), M['zink_d']) for sx in (-1, 1) for sy in (-1, 1)]
    return P + [(box(w + .14, w + .14, .05, at=(x, y, z + .22)), M['zink_d']), (cyl(.06, .3, at=(x + w * .2, y - w * .2, z - .1), seg=6), M['zink'])]

# ---------------------------------------------------------------- yard clutter (stand on the ground)
def d_rain_barrel(x, y, rz=0.0, under=None):
    """Green rain barrel with hoops and lid, standing on two bricks."""
    M = _dm(); z = _gz(x, y)
    P = [(box(.22, .5, .14, at=(0, 0, 0)), M['ziegel']), (cyl(.32, .95, at=(0, 0, .14), seg=12), M['gruen']), (cyl(.34, .04, at=(0, 0, 1.08), seg=12), M['tonne_g'])]
    P += [(cyl(.335, .05, at=(0, 0, .14 + h), seg=12), M['tonne_g']) for h in (.15, .75)]
    P.append((cyl(.025, .1, at=(.32, 0, .3), seg=6, axis='X'), M['zink_d']))
    return _T(P, (x, y, z), rz)

def d_woodpile(x, y, rz=0.0, L=2.4, H=1.2, roof=True):
    """Firewood stack between two posts, end grain to the front (+y), with a plank roof."""
    M = _dm(); z = _gz(x, y); R = random.Random(int(x * 13 + y * 7)); P = [(box(L, .5, .1, at=(0, 0, 0)), M['holz'])]
    r = .085; rows = int((H - .1) / (2 * r)); cols = int(L / (2 * r + .01))
    for i in range(rows):
        for j in range(cols):
            if i == rows - 1 and R.random() < .3: continue
            cx = -L / 2 + r + .01 + j * (2 * r + .01) + (r if i % 2 else 0) * .5; rr = r * R.uniform(.82, 1.0)
            if cx + rr > L / 2: continue
            P.append((cyl(rr, .48, at=(cx, -.24, .1 + r + i * 2 * r * .95), seg=6, axis='Y'), M['stirn' if R.random() < .7 else 'rinde']))
    for sx in (-1, 1): P.append((box(.1, .1, H + .3, at=(sx * (L / 2 + .06), 0, 0)), M['holz_d']))
    if roof:
        rf = box(L + .4, .8, .04, at=(0, 0, 0)); bmesh.ops.rotate(rf, cent=(0, 0, 0), matrix=Matrix.Rotation(.25, 3, 'X'), verts=rf.verts); move(rf, (0, 0, H + .32))
        P.append((rf, M['holz']))
    return _T(P, (x, y, z), rz)

def d_bins(x, y, rz=0.0, cols=('tonne_g', 'tonne_b', 'tonne_br')):
    """Row of wheelie bins (lid, handle, two wheels each), front = +y."""
    M = _dm(); z = _gz(x, y); P = []
    for k, cname in enumerate(cols):
        bx = (k - (len(cols) - 1) / 2) * .66
        P += [(box(.56, .68, .95, at=(bx, 0, .06), bevel_w=.02), M[cname]), (box(.6, .74, .05, at=(bx, -.02, 1.01), bevel_w=.01), M[cname]),
              (box(.5, .04, .04, at=(bx, -.38, .95)), M['gummi'])]
        P += [(cyl(.1, .06, at=(bx + sx * .24, -.3, .1), seg=8, axis='X'), M['gummi']) for sx in (-1, 1)]
    return _T(P, (x, y, z), rz)

def d_bike(x, y, rz=0.0, col=None):
    """Bicycle leaning on a wall (x along the wall)."""
    M = _dm(); z = _gz(x, y); col = col or M['rot']
    P = [(torus(.33, .025, at=(sx * .52, 0, .35), seg=12, seg2=4, axis='Y'), M['gummi']) for sx in (-1, 1)]
    P += [(cyl(.02, .66, at=(-.5, 0, .35), seg=5, axis='X'), col), (box(.04, .03, .45, at=(-.02, 0, .35)), col), (box(.6, .03, .04, at=(.18, 0, .78)), col),
          (box(.2, .1, .05, at=(-.05, 0, .82)), M['gummi']), (box(.04, .45, .04, at=(.5, 0, .95)), M['iron']), (box(.04, .03, .62, at=(.48, 0, .35)), col)]
    bm_all = []
    for bm_, m in P:
        bmesh.ops.rotate(bm_, cent=(0, 0, 0), matrix=Matrix.Rotation(.08, 3, 'X'), verts=bm_.verts); bm_all.append((bm_, m))
    return _T(bm_all, (x, y, z), rz)

def d_pots(x, y, n=3, seed=1):
    """A few terracotta flower pots with plants."""
    M = _dm(); z = _gz(x, y); R = random.Random(seed); P = []
    for k in range(n):
        px, py, s = x + R.uniform(-.4, .4), y + R.uniform(-.25, .25), R.uniform(.7, 1.15)
        P += [(cyl(.16 * s, .26 * s, at=(px, py, z), seg=8, r2=.2 * s), M['ton']), (cyl(.17 * s, .03, at=(px, py, z + .24 * s), seg=8), M['erde']),
              (ico(.17 * s, at=(px, py, z + .36 * s), sub=1, jit=.3, seed=seed + k), M['blatt']), (ico(.07 * s, at=(px + .06, py - .06, z + .48 * s), sub=1, jit=.2, seed=seed + k + 9), M['blume' if k % 2 else 'blume2'])]
    return P

def d_bench(x, y, rz=0.0):
    """Wooden garden bench with cast-iron sides."""
    M = _dm(); z = _gz(x, y)
    P = [(box(1.5, .12, .04, at=(0, k * .13 - .13, .44)), M['holz']) for k in range(3)] + [(box(1.5, .1, .04, at=(0, .2, .6 + k * .14)), M['holz']) for k in range(2)]
    P += [(box(.06, .5, .44, at=(sx * .66, 0, 0)), M['guss']) for sx in (-1, 1)] + [(box(.06, .06, .5, at=(sx * .66, .2, .44)), M['guss']) for sx in (-1, 1)]
    return _T(P, (x, y, z), rz)

def d_hydrant(x, y):
    """Red overground hydrant."""
    M = _dm(); z = _gz(x, y)
    return [(cyl(.12, .7, at=(x, y, z), seg=8), M['rot']), (cyl(.15, .06, at=(x, y, z + .7), seg=8), M['rot']), (dome(.11, at=(x, y, z + .76), seg=8, rings=2), M['rot']),
            (cyl(.05, .3, at=(x - .15, y, z + .45), seg=6, axis='X'), M['rot']), (cyl(.05, .3, at=(x - .15 + 0, y, z + .45), seg=6, axis='X'), M['stahl'])]

def d_manhole(x, y, z=None):
    """Cast-iron manhole cover flush with the asphalt."""
    M = _dm(); z = _gz(x, y) + .01 if z is None else z
    return [(cyl(.36, .025, at=(x, y, z), seg=12), M['guss'])] + [(box(.6, .03, .01, at=(x, y + k * .12, z + .025)), M['iron']) for k in (-2, -1, 0, 1, 2)]

# ---------------------------------------------------------------- power line on wooden poles (sagging wires)
def d_power_line(pts, h=7.5, wires=3, sag=.6, cols=None):
    """Wooden poles at the 2D points pts, cross arm with insulators, wires between neighbours as thin sagging segments.
    Returns (pole parts, wire parts) – wires should be collide=0."""
    M = _dm(); poles, wire = [], []
    tops = []
    for k, (x, y) in enumerate(pts):
        z = _gz(x, y)
        nx, ny = (pts[min(k + 1, len(pts) - 1)][0] - pts[max(k - 1, 0)][0], pts[min(k + 1, len(pts) - 1)][1] - pts[max(k - 1, 0)][1])
        rz = math.atan2(ny, nx) + math.pi / 2
        poles += [(cyl(.13, h, at=(x, y, z - .2), seg=7, r2=.1), M['mast'])]
        arm = box(1.6, .1, .1, at=(0, 0, 0)); rotz(arm, rz); move(arm, (x, y, z + h - .5)); poles.append((arm, M['mast']))
        ins = []
        for j in range(wires):
            off = (j - (wires - 1) / 2) * .65; ix, iy = x + math.cos(rz) * off, y + math.sin(rz) * off
            poles += [(cyl(.04, .14, at=(ix, iy, z + h - .4), seg=6), M['isol']), (cyl(.06, .03, at=(ix, iy, z + h - .32), seg=6), M['isol'])]
            ins.append((ix, iy, z + h - .26))
        brace = box(.05, .05, .8, at=(0, 0, 0)); bmesh.ops.rotate(brace, cent=(0, 0, 0), matrix=Matrix.Rotation(.6, 3, 'Y'), verts=brace.verts); rotz(brace, rz); move(brace, (x, y, z + h - 1.2)); poles.append((brace, M['mast']))
        tops.append(ins)
    for a, b in zip(tops, tops[1:]):
        for (ax, ay, az), (bx, by, bz) in zip(a, b):
            n = 6
            for i in range(n):
                t0, t1 = i / n, (i + 1) / n
                p0 = Vector((ax + (bx - ax) * t0, ay + (by - ay) * t0, az + (bz - az) * t0 - sag * 4 * t0 * (1 - t0)))
                p1 = Vector((ax + (bx - ax) * t1, ay + (by - ay) * t1, az + (bz - az) * t1 - sag * 4 * t1 * (1 - t1)))
                d = p1 - p0; seg = box(.018, d.length, .018, at=(0, 0, -.009))
                bmesh.ops.rotate(seg, cent=(0, 0, 0), matrix=d.to_track_quat('Y', 'Z').to_matrix(), verts=seg.verts)
                c = sum((v.co for v in seg.verts), Vector()) / len(seg.verts); move(seg, (p0 + d / 2) - c)
                wire.append((seg, M['kabel']))
    return poles, wire
