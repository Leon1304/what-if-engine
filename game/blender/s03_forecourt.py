# Section 3 – forecourt: asphalt plot with driveways, curbed green island along the road with the price pylon, canopy (WALDTANK fascia,
# light panels underneath), two pump islands with 4 pumps (nozzles, hoses, displays, card readers), air/water station, lamp posts,
# drains, oil stains, parking bays with lines, curbs. Pumps are interactive (they need power: game state 'strom').
COLL = '03 Vorplatz'
CX, CY = 10.0, 0.0                     # canopy centre
ISLANDS = (6.5, 13.5)                   # pump islands (x), running along y
PUMPS_Y = (-1.25, 1.25)

def build(c):
    asph = lp('Asphalt_Platz', '#55575b', .9, var=.05); conc = lp('Beton', '#b3b0a8', .9, var=.05)
    curb = lp('Bordstein', '#c9c6be', .8, var=.06); grass = lp('Gras_Insel', '#6f9a3a', .95, var=.08)
    white = lp('Markierung', '#e9e8e2', .6, var=.02); dark = lp('Ölfleck', '#2e2f31', .4, var=.05)
    red = lp('Waldtank_rot', '#c42a26', .5, var=.03); wh = lp('Waldtank_weiss', '#f1f0ea', .5, var=.03)
    grn = lp('Waldtank_gruen', '#2f6b3a', .5, var=.03); steel = lp('Stahl', '#9da2a6', .35, .8, var=.04)
    blk = lp('Kunststoff_schwarz', '#232426', .6, var=.03); yel = lp('Warngelb', '#e8b923', .5, var=.03)
    grey = lp('Grau_dunkel', '#5b5f63', .6, var=.04)

    # ---- ground: asphalt plot (x −2.5 … 38, y −24 … 26), concrete slab under the canopy
    bm = bmesh.new(); xs = [-2.5 + i * 2.5 for i in range(17)] + [38.0]; ys = [-24 + i * 2.5 for i in range(21)]
    r = random.Random(2); grid = [[bm.verts.new((x, y, .1 + r.uniform(-.006, .006))) for x in xs] for y in ys]
    for j in range(len(ys) - 1):
        for i in range(len(xs) - 1): bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    obj('Vorplatz_Asphalt', bm, asph, c, walk=1)
    slab = box(16, 20, .04, at=(CX, CY, .1)); obj('Tankdach_Beton', slab, conc, c, collide=0)
    seams = [box(.03, 20, .005, at=(CX - 8 + 2 * i, CY, .14)) for i in range(1, 8)] + [box(16, .03, .005, at=(CX, CY - 10 + 2.5 * i, .14)) for i in range(1, 8)]
    obj('Beton_Fugen', merge(*seams), lp('Fuge', '#8c8a84', .9, var=0), c, collide=0)

    # ---- curbs: plot border north / south, green island along the road (x −1.6 … 1.2, y −10 … 10)
    def curb_ring(x0, x1, y0, y1, name, fill=None):
        parts = [box(x1 - x0, .16, .16, at=((x0 + x1) / 2, y0 + .08, .1), bevel_w=.02), box(x1 - x0, .16, .16, at=((x0 + x1) / 2, y1 - .08, .1), bevel_w=.02),
                 box(.16, y1 - y0 - .32, .16, at=(x0 + .08, (y0 + y1) / 2, .1), bevel_w=.02), box(.16, y1 - y0 - .32, .16, at=(x1 - .08, (y0 + y1) / 2, .1), bevel_w=.02)]
        obj(name, merge(*parts), curb, c)
        if fill:
            g = box(x1 - x0 - .32, y1 - y0 - .32, .2, at=((x0 + x1) / 2, (y0 + y1) / 2, .02)); jitter(g, .015, 5)
            obj(name + '_Gras', g, fill, c, collide=0)
    curb_ring(-1.6, 1.2, -10, 10, 'Insel_Strasse', grass)
    curb_ring(-2.5, 38, -24.6, -24, 'Bord_Sued'); curb_ring(-2.5, 38, 26, 26.6, 'Bord_Nord')
    # small planted islands at the plot corners next to the driveways
    curb_ring(17.5, 20.5, -24, -18, 'Insel_SO', grass); curb_ring(17.5, 20.5, 20, 26, 'Insel_NO', grass)

    # ---- pump islands (raised concrete, yellow crash guards, columns)
    for k, ix in enumerate(ISLANDS):
        isl = box(1.3, 7.0, .2, at=(ix, CY, .1), bevel_w=.04, seg=2)
        nose = [cyl(.65, .2, at=(ix, CY + s * 3.5, .1), seg=10) for s in (-1, 1)]
        obj(f'Zapfinsel_{k}', merge(isl, *nose), curb, c)
        guards = []
        for s in (-1, 1):
            for gx in (-.45, .45):
                g = cyl(.06, .9, at=(ix + gx, CY + s * 3.75, .3), seg=8); guards.append(g)
            bar = cyl(.05, .9, at=(ix - .45, CY + s * 3.75, 1.15), seg=8, axis='X'); guards.append(bar)
        multi(f'Rammschutz_{k}', [(merge(*guards), yel)], c)
        # canopy columns on the island ends, clad, with black/yellow foot
        for s in (-1, 1):
            col = box(.42, .42, 4.6, at=(ix, CY + s * 2.75, .3), bevel_w=.03)
            foot = box(.46, .46, .5, at=(ix, CY + s * 2.75, .3), bevel_w=.02)
            stripes = [box(.47, .47, .08, at=(ix, CY + s * 2.75, .36 + .16 * i)) for i in range(3)]
            multi(f'Stuetze_{k}_{s}', [(col, wh), (foot, blk), (merge(*stripes), yel)], c)
        # island furniture: bin, paper towels, squeegee bucket
        multi(f'Insel_Eimer_{k}', [(cyl(.22, .55, at=(ix, CY + 2.1, .3), seg=10), grn), (cyl(.24, .05, at=(ix, CY + 2.1, .85), seg=10), blk),
                                    (cyl(.11, .5, at=(ix + .25, CY - 2.15, .3), seg=8), blu_bucket()), (box(.03, .03, .6, at=(ix + .25, CY - 2.15, .6), rz=.3), blk),
                                    (box(.26, .14, .34, at=(ix - .25, CY - 2.15, .9)), wh)], c, collide=0)
        for pj, py in enumerate(PUMPS_Y):
            pump(c, f'Zapfsaeule_{k * 2 + pj + 1}', (ix, CY + py, .3), k * 2 + pj + 1, red, wh, grn, blk, steel, grey)
        # oil stains on both lanes
        rr = random.Random(20 + k)
        for s in (-1, 1):
            for n in range(3):
                d = cyl(rr.uniform(.3, .8), .004, at=(ix + s * rr.uniform(1.8, 3.0), CY + rr.uniform(-2.5, 2.5), .102), seg=9)
                for v in d.verts: v.co.x += rr.uniform(-.15, .15); v.co.y += rr.uniform(-.15, .15)
                obj(f'Oelfleck_{k}_{s}_{n}', d, dark, c, collide=0)

    # ---- canopy
    roof = box(15, 19, .9, at=(CX, CY, 4.9), bevel_w=.05)
    fascia_r = [box(15.06, 19.06, .22, at=(CX, CY, 5.02))]
    under = box(14.4, 18.4, .02, at=(CX, CY, 4.89))
    multi('Tankdach', [(roof, wh), (merge(*fascia_r), red), (under, lp('Dach_unten', '#d9d8d3', .8, var=.03))], c)
    panels = []
    for px in (CX - 4.5, CX - 1.5, CX + 1.5, CX + 4.5):
        for py in (-6, -2, 2, 6): panels.append(box(1.6, .6, .03, at=(px, py, 4.86)))
    obj('Tankdach_Lichter', merge(*panels), glow('Leuchte_kalt', '#f4f8ff', 6), c, collide=0, glow_group='dach')
    for px in (CX - 3, CX + 3):
        for py in (-4, 4): light(f'dach_{px:.0f}_{py}', (px, py, 4.6), '#eef4ff', 120, group='dach', kind='spot_down')
    # WALDTANK lettering on all four sides + leaf logo
    for side, (tx, ty, rz) in {'W': (CX - 7.53, CY, -math.pi / 2), 'O': (CX + 7.53, CY, math.pi / 2), 'S': (CX, CY - 9.53, 0), 'N': (CX, CY + 9.53, math.pi)}.items():
        t = text_bm('WALDTANK', .5, rz=rz, depth=.04); bmesh.ops.translate(t, vec=(tx, ty, 5.3), verts=t.verts)
        obj(f'Schriftzug_{side}', t, grn, c, collide=0)

    # ---- price pylon on the green island
    py_parts = [(box(1.5, .5, 6.2, at=(0, 0, .2), bevel_w=.04), wh), (box(1.56, .56, .3, at=(0, 0, .2)), grey),
                (box(1.52, .52, 1.3, at=(0, 0, 5.1)), grn), (box(1.52, .52, .12, at=(0, 0, 5.0)), red)]
    leaf = ico(.32, at=(0, -.27, 5.75), sub=1, sz=1.3); bmesh.ops.scale(leaf, vec=(1, .15, 1), verts=leaf.verts)
    py_parts.append((leaf, lp('Blatt_hell', '#8fd06a', .5, var=.05)))
    rows = (('SUPER E10', '1,79'), ('SUPER', '1,85'), ('DIESEL', '1,69'))
    for i, (nm, pr) in enumerate(rows):
        z = 4.1 - i * 1.0
        py_parts += [(box(1.4, .54, .8, at=(0, 0, z)), blk)]
        for sgn in (-1, 1):
            py_parts += [(text_bm(nm, .16, at=(0, sgn * .275, z + .56), rz=0 if sgn < 0 else math.pi, depth=.01), wh),
                         (text_bm(pr, .36, at=(-.08, sgn * .275, z + .1), rz=0 if sgn < 0 else math.pi, depth=.01), glow('LED_rot', '#ff3b2a', 3)),
                         (text_bm('9', .2, at=(.5 * (1 if sgn < 0 else -1), sgn * .275, z + .3), rz=0 if sgn < 0 else math.pi, depth=.01), glow('LED_rot', '#ff3b2a', 3))]
    for sgn in (-1, 1):
        py_parts.append((text_bm('WALDTANK', .2, at=(0, sgn * .265, 5.3), rz=0 if sgn < 0 else math.pi, depth=.01), wh))
    o = multi('Preissaeule', py_parts, c, glow_group='strom'); o.location = (-.2, 0, 0); o.rotation_euler = (0, 0, math.pi / 2)

    # ---- air / water station (north-east corner of the forecourt)
    aw = [(box(.5, .35, 1.4, at=(0, 0, .1), bevel_w=.03), lp('Luft_blau', '#2a63b8', .5, var=.03)), (box(.4, .02, .3, at=(0, -.18, 1.05)), blk),
          (box(.3, .01, .12, at=(0, -.19, 1.15)), glow('Display_gruen', '#59ff8a', 2)), (box(.2, .1, .08, at=(0, -.2, .8)), steel),
          (torus(.18, .025, at=(.32, 0, .8), seg=10, seg2=5, axis='X'), blk), (cyl(.03, .2, at=(.32, -.05, .55), seg=6), steel),
          (box(.58, .43, .1, at=(0, 0, .1)), grey), (cyl(.025, .5, at=(-.15, -.2, .5), seg=6, axis='Y'), blk)]
    multi('Luft_Wasser', aw, c, interact='use', label='Luft & Wasser', needs='strom', glow_group='strom').location = (18.8, 14, 0)

    # ---- lamp posts along the driveways and the parking bays
    lampm = lp('Mast', '#6d7277', .5, .6, var=.03)
    for k, (lx, ly) in enumerate(((-.8, -20), (-.8, 22), (19, -21), (36, 24), (36, -22))):
        parts = [(cyl(.09, 7.5, at=(0, 0, .1), seg=8, r2=.06), lampm), (box(.08, 1.4, .08, at=(0, .7, 7.4)), lampm),
                 (box(.35, .7, .14, at=(0, 1.4, 7.32), bevel_w=.02), grey), (box(.28, .6, .02, at=(0, 1.4, 7.31)), glow('Leuchte_warm', '#ffd9a0', 5)),
                 (cyl(.2, .5, at=(0, 0, .1), seg=8), grey)]
        rz = math.atan2(-(ly - CY), -(lx - CX)) - math.pi / 2
        o = multi(f'Laterne_{k}', parts, c, glow_group='aussen'); o.location = (lx, ly, 0); o.rotation_euler = (0, 0, rz)
        q = o.matrix_world @ Vector((0, 1.4, 7.2)); light(f'laterne_{k}', tuple(q), '#ffd9a0', 150, group='aussen', kind='spot_down')

    # ---- drains and manhole covers
    for k, (x, y) in enumerate(((CX, -7.5), (CX, 7.5), (2, -16), (2, 18), (28, 20))):
        obj(f'Gully_{k}', merge(box(.5, .5, .012, at=(x, y, .1)), *[box(.04, .44, .016, at=(x - .2 + .08 * i, y, .1)) for i in range(6)]), lp('Gusseisen', '#3a3a3a', .6, .5, var=.03), c, collide=0)
    obj('Schacht_Tank', merge(cyl(.45, .015, at=(CX - 8.6, 14, .1), seg=14), *[box(.8, .04, .02, at=(CX - 8.6, 14 - .3 + .15 * i, .1)) for i in range(5)]), lp('Gusseisen', '#3a3a3a', .6, .5), c, collide=0)
    for k in range(3):
        obj(f'Tankdeckel_{k}', cyl(.35, .03, at=(1.5 + 1.0 * k, 14, .1), seg=12), lp('Tankdeckel', '#d7c33c', .5, .2, var=.03) if k < 2 else lp('Tankdeckel_d', '#3c3c3c', .5, .2), c, collide=0)

    # ---- parking bays north of the shop (7 bays, 2.6 m) + disabled bay
    lines = []
    for i in range(7): lines.append(box(.12, 5.0, .006, at=(22.0 + 2.6 * i, 22.0, .1)))
    lines.append(box(2.6 * 6 + .12, .12, .006, at=(22.0 + 2.6 * 3, 19.5, .1)))
    obj('Parkplatz_Linien', merge(*lines), white, c, collide=0)
    sym = [box(1.2, 1.2, .006, at=(22.0 + 1.3, 22.4, .101))]
    obj('Behindertenparkplatz', merge(*sym), lp('Parkplatz_blau', '#2a63b8', .6, var=.02), c, collide=0)
    stops = [box(1.6, .2, .12, at=(22.0 + 1.3 + 2.6 * i, 24.2, .1), bevel_w=.03) for i in range(6)]
    obj('Radstopper', merge(*stops), lp('Beton_dunkel', '#8b8983', .8, var=.06), c)
    # arrows on the asphalt (entry south, exit north)
    for k, (x, y, rz) in enumerate(((0, -17, 0), (0, 18, 0), (CX, -14, 0), (CX, 14, 0))):
        obj(f'Pfeil_{k}', place(arrow_bm(), (x, y, .1), rz), white, c, collide=0)

def arrow_bm():
    """Flat arrow on the ground pointing +y (2.6 m long)."""
    bm = bmesh.new(); pts = [(-.13, -1.3), (.13, -1.3), (.13, .4), (.45, .4), (0, 1.3), (-.45, .4), (-.13, .4)]
    f = bm.faces.new([bm.verts.new((x, y, .002)) for x, y in pts])
    ex = bmesh.ops.extrude_face_region(bm, geom=[f]); bmesh.ops.translate(bm, vec=(0, 0, .005), verts=[v for v in ex['geom'] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return bm

def blu_bucket(): return lp('Eimer_blau', '#2a63b8', .6, var=.03)

def pump(c, name, at, nr, red, wh, grn, blk, steel, grey):
    """Fuel dispenser: plinth, body with bevels, header with brand stripe, displays on both long sides (x ±), 3 nozzles per side in holsters
    with coloured grips (green E10, red Super, black Diesel) and hoses hanging in loops, card reader, number plate."""
    x, y, z = at; P = []
    P += [(box(.6, .95, .12, at=(0, 0, 0), bevel_w=.02), grey), (box(.5, .85, 1.55, at=(0, 0, .12), bevel_w=.04, seg=2), wh),
          (box(.56, .92, .42, at=(0, 0, 1.67), bevel_w=.04, seg=2), wh), (box(.57, .93, .08, at=(0, 0, 1.75)), red),
          (box(.57, .93, .05, at=(0, 0, 2.05)), grn), (text_bm(str(nr), .18, at=(0, -.47, 1.85), depth=.01), blk), (text_bm(str(nr), .18, at=(0, .47, 1.85), rz=math.pi, depth=.01), blk)]
    for s in (-1, 1):                   # both long sides face ±x (the lanes)
        rz = -math.pi / 2 if s > 0 else math.pi / 2
        def side(bm): return place(bm, (0, 0, 0), rz)
        P += [(side(box(.6, .03, .34, at=(0, -.27, 1.2))), blk),                                       # display bezel
              (side(box(.52, .01, .1, at=(0, -.287, 1.4))), glow('Display_aus', '#1c2a24', .2)),        # € line
              (side(box(.52, .01, .08, at=(0, -.287, 1.27))), glow('Display_aus', '#1c2a24', .2)),      # litre line
              (side(box(.2, .02, .14, at=(.2, -.28, .95))), grey), (side(box(.12, .01, .06, at=(.2, -.292, 1.0))), glow('Display_aus', '#1c2a24', .2)),
              (side(box(.08, .02, .1, at=(-.22, -.28, .95))), blk)]                                    # card slot
        for k, (gx, gm) in enumerate(((-.25, grn), (0, red), (.25, blk))):
            P += [(side(box(.12, .1, .22, at=(gx, -.3, .55))), grey)]                                    # holster
            P += [(side(box(.06, .12, .2, at=(gx, -.36, .58), rz=0)), gm), (side(cyl(.018, .22, at=(gx, -.42, .75), seg=6, axis='Y')), steel)]
            # hose: from the top of the body down in a loop to the nozzle
            pts = [(gx * 1.3, -.26, 1.0), (gx * 1.35, -.48, .92), (gx * 1.2, -.62, .62), (gx, -.56, .3), (gx, -.44, .5)]
            hb = bmesh.new()
            for a, b in zip(pts, pts[1:]):
                d = Vector(b) - Vector(a); L = d.length; cy_ = cyl(.022, L, seg=6)
                q = d.normalized().to_track_quat('Z', 'Y').to_matrix().to_4x4(); bmesh.ops.transform(cy_, matrix=q, verts=cy_.verts); move(cy_, a)
                hb = merge(hb, cy_)
            P += [(side(hb), blk)]
    o = multi(name, P, c, interact='pump', label=f'Zapfsäule {nr}', needs='strom', nr=nr)
    o.location = at
    return o
