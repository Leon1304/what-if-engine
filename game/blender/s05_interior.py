# Section 5 – interior: sales area (counter with register drawer, tobacco shelf, light switch, 3 gondolas full of goods, 8 fridge doors,
# ice cream chest with sliding lid, coffee corner with microwave, bistro tables, ATM, newspaper rack), WC (flush, tap, first-aid cabinet),
# office (fuse box, radio, note, jacket, locker, desk), storage (heavy shelving, canister, rag, pot, crates).
# Pickups are separate small objects: interact='pickup', item=<id> (the game's item list knows name, effect and icon).
COLL = '05 Einrichtung'
F = .25

def build(c):
    R = random.Random(42)
    wood = lp('Holz_Tresen', '#9c6b43', .7, var=.05); wood_d = lp('Holz_dunkel', '#6b4630', .7, var=.05)
    top = lp('Arbeitsplatte', '#3a3c3f', .4, var=.03); shelf_m = lp('Regal_weiss', '#e4e4df', .6, .1, var=.03)
    shelf_g = lp('Regal_grau', '#7d8287', .5, .4, var=.04); steel = lp('Stahl', '#9da2a6', .35, .8, var=.04)
    blk = lp('Kunststoff_schwarz', '#232426', .6, var=.03); grey = lp('Grau_dunkel', '#5b5f63', .6, var=.04)
    gl = glass('Glas_Kuehl', '#d5ecf2', .22); red = lp('Waldtank_rot', '#c42a26', .5, var=.03); grn = lp('Waldtank_gruen', '#2f6b3a', .5, var=.03)
    white = lp('Weiss_glanz', '#f4f4f1', .3, var=.02); screen = glow('Bildschirm', '#9fd4ff', .6)
    PAL = [lp(f'Ware_{i}', h, .55, var=.04) for i, h in enumerate(('#d6402f', '#f0b429', '#2d7dd2', '#3bb273', '#e86a92', '#7b4fb0', '#f28e2b',
                                                                   '#f4f1de', '#3d405b', '#81b29a', '#e07a5f', '#2a9d8f', '#e9c46a', '#264653'))]
    groups = {}
    def add(m, bm): groups.setdefault(m, []).append(bm)
    def flush(name, collide=0, **kw):
        if not groups: return None
        o = multi(name, [(merge(*v), m) for m, v in groups.items()], c, collide=collide, **kw); groups.clear(); return o
    def pickup(name, parts, item, label, **kw):
        return multi(name, parts, c, collide=0, interact='pickup', item=item, label=label, **kw)

    def goods_row(x0, x1, y, z, face, kind, seed, depth=.32, avoid=()):
        """One shelf level of goods between x0 and x1 at height z, front edge at y; face = direction from the front edge into the shelf.
        avoid: x intervals kept free for pickups (they stand in the front row and must stay visible)."""
        r = random.Random(seed); x = x0 + .03
        while x < x1 - .08:
            hit = next(((a, b) for a, b in avoid if a - .22 < x < b), None)
            if hit: x = hit[1] + .02; continue
            m = r.choice(PAL)
            if kind == 'snack':        # chip bags (puffy) and chocolate bars
                w, h, d = r.choice(((.2, .3, .08), (.16, .24, .07), (.1, .16, .03)))
                n = 2 if d > .05 else 4
            elif kind == 'cans':
                w, h, d = .09, .12, .09; n = 3
            elif kind == 'bottles':
                w, h, d = .08, .26, .08; n = 3
            elif kind == 'car':
                w, h, d = r.choice(((.12, .28, .08), (.2, .3, .12), (.25, .12, .18))); n = 2
            else:
                w, h, d = r.choice(((.18, .26, .06), (.12, .2, .08), (.22, .1, .15))); n = 2
            face_cnt = max(1, int(r.uniform(.6, 1.0) * depth / (d + .01)))
            for k in range(min(n, face_cnt)):
                yy = y + face * (d / 2 + .02 + k * (d + .01))
                if kind in ('cans', 'bottles'):
                    b = cyl(w / 2, h, at=(x + w / 2, yy, z), seg=8)
                    if kind == 'bottles': b = merge(b, cyl(w / 5, .06, at=(x + w / 2, yy, z + h), seg=6))
                else:
                    b = box(w, d, h, at=(x + w / 2, yy, z), bevel_w=.008 if kind == 'snack' and d > .05 else 0)
                add(m, b)
            x += w + .015

    # ================================================================ counter (x 23 … 28, y 5.4 … 6.2) + cashier zone
    cnt = [(box(5.0, .8, 1.0, at=(25.5, 5.8, F), bevel_w=.02), wood), (box(5.1, .9, .05, at=(25.5, 5.8, F + 1.0), bevel_w=.01), top),
           (box(5.0, .05, .1, at=(25.5, 5.38, F)), blk)]
    for k in range(5): cnt.append((box(.9, .02, .8, at=(23.5 + k, 5.39, F + .12)), wood_d))   # front panels
    cnt += [(box(.8, 2.5, 1.0, at=(23.4, 7.45, F)), wood), (box(.9, 2.5, .05, at=(23.4, 7.45, F + 1.0)), top)]     # return to the wall
    multi('Tresen', cnt, c)
    # register: base, screen, keypad; drawer = interactive
    reg = [(box(.45, .4, .1, at=(26.2, 6.0, F + 1.05)), blk), (box(.4, .05, .3, at=(26.2, 6.05, F + 1.25), rz=0), blk),
           (box(.36, .01, .24, at=(26.2, 6.02, F + 1.28)), screen), (cyl(.03, .15, at=(26.2, 6.1, F + 1.15), seg=6), grey),
           (box(.3, .18, .04, at=(26.2, 5.75, F + 1.05)), grey)]
    multi('Kasse', reg, c, collide=0, interact='use', use='kasse', label='Kasse', needs='strom', glow_group='strom')
    multi('Kassenschublade', [(box(.42, .38, .1, at=(26.2, 6.0, F + .93)), grey), (box(.12, .02, .03, at=(26.2, 5.8, F + .97)), steel)]
          + [(box(.08, .3, .005, at=(26.03 + .085 * i, 6.0, F + 1.0)), lp('Geld', '#9cc28a', .6, var=.05)) for i in range(4)],
          c, pivot=(26.2, 6.0, F + .93), collide=0, interact='drawer', slide=[0, .3, 0], label='Kassenschublade', item='geld', item_label='Wechselgeld')
    multi('Kartenterminal', [(box(.1, .18, .05, at=(25.4, 5.6, F + 1.05), rz=.3), blk), (box(.08, .06, .005, at=(25.39, 5.56, F + 1.1), rz=.3), screen)], c, collide=0, glow_group='strom')
    multi('Bondrucker', [(box(.18, .2, .14, at=(26.75, 6.0, F + 1.05), bevel_w=.02), blk), (box(.08, .01, .1, at=(26.75, 5.89, F + 1.19)), white)], c, collide=0)
    # impulse goods on the counter: gum rack, lighters (pickup), charity box
    rack = [(box(.5, .25, .02, at=(24.2, 5.55, F + 1.05 + .12 * i)), shelf_g) for i in range(3)] + [(box(.02, .25, .36, at=(24.2 + s * .25, 5.55, F + 1.05)), shelf_g) for s in (-1, 1)]
    multi('Kaugummiregal', rack, c, collide=0)
    for i in range(3):
        for j in range(5): add(PAL[(i * 5 + j) % len(PAL)], box(.08, .18, .06, at=(24.0 + .1 * j, 5.55, F + 1.07 + .12 * i)))
    flush('Kaugummis')
    pickup('Feuerzeug', [(box(.025, .012, .08, at=(24.9, 5.6, F + 1.07)), red), (box(.025, .012, .015, at=(24.9, 5.6, F + 1.15)), steel)], 'feuerzeug', 'Feuerzeug')
    for j in range(5): add(PAL[(j * 3) % len(PAL)], box(.025, .012, .08, at=(24.75 - .04 * j, 5.6, F + 1.07)))
    flush('Feuerzeuge')
    multi('Spendendose', [(cyl(.06, .14, at=(27.6, 5.6, F + 1.05), seg=8), red), (cyl(.065, .01, at=(27.6, 5.6, F + 1.19), seg=8), steel)], c, collide=0)
    # cashier stool, tobacco shelf on the north wall, light switch
    multi('Kassenhocker', [(cyl(.2, .05, at=(26.2, 7.0, F + .7), seg=10), blk), (cyl(.03, .6, at=(26.2, 7.0, F + .1), seg=6), steel), (cyl(.25, .04, at=(26.2, 7.0, F + .05), seg=5), steel)], c)
    tab = [(box(5.5, .45, .3, at=(26.5, 9.52, F)), wood_d), (box(5.5, .03, 2.2, at=(26.5, 9.73, F)), lp('Rueckwand', '#2b2d30', .5)),
           (box(.05, .45, 2.2, at=(23.75, 9.52, F)), wood_d), (box(.05, .45, 2.2, at=(29.25, 9.52, F)), wood_d), (box(5.5, .45, .06, at=(26.5, 9.52, F + 2.2)), wood_d),
           (box(5.5, .02, .2, at=(26.5, 9.3, F + 2.06)), glow('Tabak_Schild', '#ffe9a8', 1.2))]
    for i in range(6): tab.append((box(5.4, .4, .02, at=(26.5, 9.52, F + .35 + .3 * i)), shelf_g))
    multi('Tabakregal', tab, c, glow_group='innen')
    for i in range(6):
        x = 23.85
        while x < 29.15:
            for k in range(3): add(R.choice(PAL) if k == 0 else PAL[7], box(.055, .025, .09, at=(x, 9.36 + .03 * k, F + .37 + .3 * i)))
            x += .07
    flush('Zigaretten')
    multi('Lichtschalter', [(box(.08, .02, .12, at=(23.0 + .5, 9.73, F + 1.25)), white), (box(.03, .015, .05, at=(23.5, 9.72, F + 1.27)), grey)],
          c, collide=0, interact='switch', group='innen', needs='strom', label='Lichtschalter')
    multi('Ueberwachungsmonitor', [(box(.4, .06, .28, at=(28.2, 9.6, F + 2.3), rz=0), blk), (box(.36, .01, .22, at=(28.2, 9.56, F + 2.33)), screen)], c, collide=0, glow_group='strom')

    # ================================================================ gondolas (3 rows along x, double sided)
    # pickups on the gondola shelves: front row, the filler goods leave their x range free (see avoid)
    P = [('Chips_1', 'chips', 'Chips', PAL[0], (25.3, -4.62, F + .535), (.2, .08, .3)), ('Chips_2', 'chips', 'Chips', PAL[1], (28.6, -3.78, F + .905), (.2, .08, .3)),
         ('Schokolade_1', 'schokolade', 'Schokolade', PAL[5], (26.1, -4.62, F + 1.275), (.16, .03, .1)), ('Schokolade_2', 'schokolade', 'Schokolade', PAL[9], (29.2, -3.78, F + .165), (.16, .03, .1)),
         ('Kekse', 'kekse', 'Kekse', PAL[6], (27.2, -4.62, F + .165), (.2, .06, .14)),
         ('Batterien_AA', 'batterien', 'Batterien (AA)', PAL[1], (25.8, 2.22, F + 1.275), (.1, .03, .16)), ('Verbandskasten', 'verband', 'Verbandskasten', lp('Erste_Hilfe', '#2f9e44', .5), (28.9, 2.22, F + .535), (.3, .1, .2)),
         ('Eiskratzer', 'eiskratzer', 'Eiskratzer', PAL[2], (27.9, 1.38, F + .905), (.12, .03, .25)), ('Taschenlampe_Laden', 'taschenlampe2', 'Taschenlampe', blk, (26.5, 1.38, F + 1.275), (.06, .2, .06))]
    SOUP = [(25.6, -1.62), (27.0, -.78), (29.1, -1.62)]
    LEVELS = (.165, .535, .905, 1.275); GY = (-4.2, -1.2, 1.8)
    avoid = {}
    def slot(x, y, z, w):
        gi = min(range(3), key=lambda i: abs(GY[i] - y)); s_ = 1 if y > GY[gi] else -1; li = min(range(4), key=lambda i: abs(LEVELS[i] - (z - F)))
        avoid.setdefault((gi, s_, li), []).append((x - w / 2, x + w / 2)); return GY[gi] + s_ * .42 - s_ * .02
    for nm, it, lb, m, (x, y, z), (w, d, h) in P: slot(x, y, z, w)
    for x, y in SOUP: slot(x, y, F + .905, .1)
    kinds = (('snack', 'snack'), ('cans', 'other'), ('car', 'other'))
    for gi, gy in enumerate((-4.2, -1.2, 1.8)):
        g = [(box(5.5, .9, .12, at=(27.25, gy, F), bevel_w=.01), grey), (box(5.5, .04, 1.55, at=(27.25, gy, F + .12)), shelf_m)]
        for zz in (.15, .52, .89, 1.26):
            for s in (-1, 1): g.append((box(5.5, .4, .025, at=(27.25, gy + s * .22, F + zz)), shelf_m))
        for ex in (24.5, 30.0): g.append((box(.05, .9, 1.6, at=(ex, gy, F)), shelf_m))
        g.append((box(5.5, .92, .05, at=(27.25, gy, F + 1.62)), shelf_g))
        # price strips on the shelf fronts
        for zz in (.15, .52, .89, 1.26):
            for s in (-1, 1): g.append((box(5.5, .01, .04, at=(27.25, gy + s * .425, F + zz - .02)), lp('Preisleiste', '#f5d63d', .6, var=0)))
        multi(f'Regal_{gi + 1}', g, c)
        # end cap displays (west end: towards the entrance)
        multi(f'Regal_{gi + 1}_Kopf', [(box(.45, .85, 1.2, at=(24.25, gy, F)), red), (box(.5, .9, .3, at=(24.25, gy, F + 1.6)), grn)], c)
        for s in (-1, 1):
            for li, zz in enumerate((.165, .535, .905, 1.275)):
                goods_row(24.6, 29.9, gy + s * .42, F + zz, -s, kinds[gi][0 if s < 0 else 1], 100 + gi * 10 + li * 2 + (s > 0), avoid=avoid.get((gi, s, li), ()))
        flush(f'Waren_{gi + 1}')
        for k in range(3):
            add(PAL[(gi * 4 + k) % len(PAL)], box(.35, .35, .3, at=(24.25, gy + (k - 1) * .27, F + 1.2)))
        flush(f'Waren_Kopf_{gi + 1}')
    for nm, it, lb, m, (x, y, z), (w, d, h) in P:
        gi = min(range(3), key=lambda i: abs(GY[i] - y)); s_ = 1 if y > GY[gi] else -1; yy = GY[gi] + s_ * (.42 - .03 - d / 2)
        pickup(nm, [(box(w, d, h, at=(x, yy, z), bevel_w=.006), m), (box(w * .7, d + .004, h * .25, at=(x, yy, z + h * .5)), PAL[7])], it, lb)
    for k, (x, y) in enumerate(SOUP):
        gi = min(range(3), key=lambda i: abs(GY[i] - y)); s_ = 1 if y > GY[gi] else -1; yy = GY[gi] + s_ * (.42 - .03 - .05)
        pickup(f'Dosensuppe_{k + 1}', [(cyl(.05, .12, at=(x, yy, F + .905), seg=10), lp('Dose_rot', '#c8382c', .4, .4)), (cyl(.051, .02, at=(x, yy, F + .955), seg=10), PAL[7])], 'dosensuppe', 'Dosensuppe')

    # ================================================================ fridges (x 32.1 … 32.875, y −5.9 … 0.1), 8 glass doors hinged on the south side
    FX0, FX1, FY0 = 32.0, 32.875, -5.9
    fr = [(box(FX1 - FX0, 6.0, .25, at=((FX0 + FX1) / 2, FY0 + 3.0, F)), blk), (box(FX1 - FX0, 6.0, .35, at=((FX0 + FX1) / 2, FY0 + 3.0, F + 2.25)), grn),
          (box(.05, 6.0, 2.0, at=(FX1 - .03, FY0 + 3.0, F + .25)), lp('Kuehl_innen', '#dfe6ea', .4, var=.02))]
    for i in range(9): fr.append((box(FX1 - FX0, .06, 2.25, at=((FX0 + FX1) / 2, FY0 + .75 * i, F + .25)), blk))
    for i in range(8):
        for zz in (.45, .85, 1.25, 1.65): fr.append((box(.7, .7, .02, at=(FX0 + .45, FY0 + .375 + .75 * i, F + zz)), shelf_g))
    fr.append((text_bm('GETRÄNKE', .2, at=(FX0 - .01, FY0 + 3.0, F + 2.32), rz=-math.pi / 2, depth=.01), white))
    multi('Kuehlregal', fr, c)
    obj('Kuehlregal_Licht', box(.02, 5.9, .04, at=(FX0 + .1, FY0 + 3.0, F + 2.18)), glow('Kuehl_LED', '#e8f6ff', 3), c, collide=0, glow_group='strom')
    drink_cols = ['#2d7dd2', '#d6402f', '#3bb273', '#f0b429', '#7b4fb0', '#e9eef0', '#264653', '#f28e2b']
    for i in range(8):
        for zi, zz in enumerate((.47, .87, 1.27, 1.67)):
            m = lp(f'Getraenk_{(i + zi) % 8}', drink_cols[(i + zi) % 8], .3, var=.04)
            for k in range(4):
                for j in range(2): add(m, merge(cyl(.035, .2, at=(FX0 + .25 + .2 * j, FY0 + .14 + .75 * i + .16 * k, F + zz), seg=7), cyl(.015, .05, at=(FX0 + .25 + .2 * j, FY0 + .14 + .75 * i + .16 * k, F + zz + .2), seg=5)))
    flush('Getraenke')
    for i in range(8):
        y0 = FY0 + .75 * i + .03
        d = [(box(.04, .69, 2.18, at=(FX0 - .02, y0 + .345, F + .28)), gl), (box(.05, .69, .06, at=(FX0 - .02, y0 + .345, F + .28)), blk),
             (box(.05, .69, .06, at=(FX0 - .02, y0 + .345, F + 2.4)), blk), (box(.05, .05, 2.18, at=(FX0 - .02, y0 + .025, F + .28)), blk),
             (box(.05, .05, 2.18, at=(FX0 - .02, y0 + .665, F + .28)), blk), (box(.04, .03, .6, at=(FX0 - .07, y0 + .62, F + 1.0)), steel)]
        multi(f'Kuehlschranktuer_{i + 1}', d, c, pivot=(FX0 - .02, y0, F), interact='door', angle=math.radians(95), label='Kühlschrank')
    for k, (it, lb, col, i, zz) in enumerate((('wasser', 'Wasser', '#e9eef0', 0, .47), ('wasser', 'Wasser', '#e9eef0', 1, .87), ('cola', 'Cola', '#d6402f', 2, 1.27),
                                             ('energy', 'Energydrink', '#3bb273', 4, .87), ('wasser', 'Wasser', '#e9eef0', 6, .47))):
        y = FY0 + .75 * i + .62; x = FX0 + .1
        pickup(f'{lb}_{k + 1}', [(cyl(.035, .2, at=(x, y, F + zz), seg=8), lp('Flasche_' + it, col, .3)), (cyl(.016, .05, at=(x, y, F + zz + .2), seg=6), PAL[2])], it, lb)
    for k, i in enumerate((3, 5)):
        y = FY0 + .75 * i + .38
        pickup(f'Sandwich_{k + 1}', [(prism([(-.08, 0), (.08, 0), (-.08, .12)], .08, y=-.04), lp('Sandwich', '#e9d8a6', .6)), (box(.01, .08, .12, at=(-.075, 0, 0)), lp('Folie', '#cfe3ea', .2))], 'sandwich', 'Sandwich').location = (FX0 + .1, y, F + 1.66)

    # ================================================================ ice cream chest with sliding lid
    multi('Eistruhe', [(box(1.5, .75, .45, at=(29.6, 3.6, F), bevel_w=.04), white), (box(1.5, .06, .4, at=(29.6, 3.255, F + .45)), white), (box(1.5, .06, .4, at=(29.6, 3.945, F + .45)), white),
                       (box(.06, .63, .4, at=(28.88, 3.6, F + .45)), white), (box(.06, .63, .4, at=(30.32, 3.6, F + .45)), white), (box(1.38, .63, .01, at=(29.6, 3.6, F + .45)), lp('Kuehl_innen', '#dfe6ea', .4, var=.02)),
                       (box(1.52, .06, .05, at=(29.6, 3.25, F + .85)), lp('Eis_blau', '#2d7dd2', .5)), (box(1.52, .06, .05, at=(29.6, 3.95, F + .85)), lp('Eis_blau', '#2d7dd2', .5)),
                       (text_bm('EIS', .16, at=(29.6, 3.215, F + .5), depth=.01), lp('Eis_blau', '#2d7dd2', .5))], c)
    for k in range(18):
        if k != 1: add(PAL[k % len(PAL)], box(.12, .2, .06, at=(29.0 + .14 * (k % 9), 3.45 + .3 * (k // 9), F + .46 + .07 * (k % 2))))
    flush('Eis')
    multi('Eistruhe_Deckel', [(box(.74, .7, .03, at=(29.24, 3.6, F + .9)), gl), (box(.76, .72, .02, at=(29.24, 3.6, F + .89)), white)], c,
          pivot=(29.24, 3.6, F + .9), interact='slide', slide=[.7, 0, .03], label='Eistruhe')
    pickup('Eis_Stiel', [(box(.07, .16, .05, at=(29.14, 3.45, F + .46)), lp('Eis_pink', '#e86a92', .5)), (box(.02, .05, .01, at=(29.14, 3.55, F + .51)), lp('Holz_hell', '#c9a273', .8))], 'eis', 'Eis am Stiel')

    # ================================================================ coffee corner (south wall) + bistro
    cc = [(box(3.2, .65, .9, at=(27.2, -9.42, F), bevel_w=.02), wood), (box(3.3, .7, .04, at=(27.2, -9.42, F + .9)), top), (box(3.2, .3, .7, at=(27.2, -9.65, F + 1.7)), wood)]
    multi('Kaffeetheke', cc, c)
    multi('Kaffeemaschine', [(box(.5, .45, .7, at=(26.2, -9.45, F + .94), bevel_w=.03), blk), (box(.4, .02, .22, at=(26.2, -9.23, F + 1.35)), screen),
                             (box(.3, .1, .05, at=(26.2, -9.2, F + 1.12)), steel), (box(.2, .15, .02, at=(26.2, -9.25, F + .96)), steel),
                             (text_bm('KAFFEE', .07, at=(26.2, -9.215, F + 1.58), depth=.005), white)], c, collide=0, interact='use', use='kaffee', needs='strom', label='Kaffeemaschine', glow_group='strom')
    for k in range(6): add(white, cyl(.045 - .002 * 0, .1, at=(26.75, -9.55, F + .94 + .1 * k), seg=8, r2=.04))
    for k in range(4): add(lp('Deckel_braun', '#5a3a28', .6), cyl(.046, .012, at=(26.95, -9.6, F + .94 + .012 * k), seg=8))
    add(lp('Zuckerdose', '#e4e4df', .4), box(.25, .12, .12, at=(27.4, -9.5, F + .94)))
    flush('Kaffeezubehoer')
    multi('Mikrowelle', [(box(.5, .38, .3, at=(28.2, -9.45, F + .94), bevel_w=.02), lp('Mikro', '#d9dbdc', .4, .3)), (box(.32, .01, .22, at=(28.12, -9.25, F + .98)), lp('Mikro_Glas', '#3a3f44', .2)),
                         (box(.1, .01, .2, at=(28.38, -9.255, F + .99)), grey)], c, collide=0, interact='use', use='mikrowelle', needs='strom', label='Mikrowelle')
    multi('Muelleimer_Kaffee', [(box(.4, .4, .75, at=(25.3, -9.3, F), bevel_w=.03), grey), (box(.42, .42, .05, at=(25.3, -9.3, F + .75)), steel)], c)
    for k, (tx, ty) in enumerate(((22.4, -8.2), (24.1, -7.4))):
        multi(f'Stehtisch_{k + 1}', [(cyl(.4, .04, at=(tx, ty, F + 1.06), seg=12), top), (cyl(.04, 1.06, at=(tx, ty, F), seg=8), steel), (cyl(.28, .03, at=(tx, ty, F), seg=10), steel)], c)
        for s in range(2):
            a = s * math.pi + .6 * k; sx, sy = tx + .65 * math.cos(a), ty + .65 * math.sin(a)
            multi(f'Barhocker_{k + 1}_{s + 1}', [(cyl(.18, .06, at=(sx, sy, F + .74), seg=10), red), (cyl(.025, .74, at=(sx, sy, F), seg=6), steel), (cyl(.22, .02, at=(sx, sy, F), seg=8), steel),
                                                (torus(.17, .012, at=(sx, sy, F + .3), seg=10, seg2=4, axis='Z'), steel)], c)
    multi('Tablett_Becher', [(cyl(.04, .1, at=(22.3, -8.1, F + 1.1), seg=8, r2=.035), white), (cyl(.041, .01, at=(22.3, -8.1, F + 1.2), seg=8), lp('Deckel_braun', '#5a3a28', .6))], c, collide=0)

    # ================================================================ ATM, newspaper rack, washer fluid stack, bins, posters
    multi('Geldautomat', [(box(.7, .6, 1.6, at=(21.9, 9.35, F), bevel_w=.03), lp('ATM', '#5b6770', .4, .5)), (box(.36, .02, .28, at=(21.9, 9.04, F + 1.25)), screen),
                          (box(.3, .1, .2, at=(21.9, 9.0, F + .95), rz=0), grey), (box(.12, .02, .02, at=(22.05, 9.03, F + 1.12)), blk),
                          (box(.7, .62, .1, at=(21.9, 9.35, F + 1.6)), lp('ATM_Kopf', '#1f5aa8', .5))], c, interact='use', use='atm', needs='strom', label='Geldautomat', glow_group='strom')
    nr = [(box(.9, .4, 1.1, at=(22.2, -3.2, F)), shelf_g)]
    for i in range(3): nr.append((box(.9, .3, .02, at=(22.2, -3.25 + .02 * i, F + .35 + .3 * i), rz=0), shelf_g))
    multi('Zeitungsstaender', nr, c)
    for i in range(3):
        for j in range(4): add(PAL[(i * 4 + j + 3) % len(PAL)], box(.2, .02, .28, at=(21.85 + .23 * j, -3.35 + .05 * i, F + .37 + .3 * i)))
    flush('Zeitschriften')
    pickup('Karte_Region', [(box(.2, .02, .28, at=(22.55, -3.2, F + 1.12)), lp('Karte', '#e9c46a', .6)), (box(.16, .021, .12, at=(22.55, -3.2, F + 1.2)), PAL[3])], 'karte', 'Wanderkarte')
    for i in range(3):
        for j in range(4 - i):
            add(lp('Kanister_blau', '#4aa3df', .4), box(.25, .14, .32, at=(21.5 + .27 * j + .135 * i, 3.6, F + .32 * i), bevel_w=.02))
    flush('Scheibenwischwasser', collide=1)
    for k, (x, y) in enumerate(((22.0, -5.5), (31.0, 5.0))):
        multi(f'Abfalleimer_{k}', [(cyl(.22, .7, at=(x, y, F), seg=10), grn), (dome(.23, at=(x, y, F + .7), seg=10, rings=3, h=.12), steel)], c)
    for k, (x, y, rz, col) in enumerate(((32.86, 2.5, math.pi / 2, '#e07a5f'), (24.5, 9.74, math.pi, '#2a9d8f'), (31.0, -6.6 + .09, 0, '#e9c46a'))):
        poster = box(.8, .01, 1.1, at=(0, 0, 0)); rotz(poster, rz); move(poster, (x, y, F + 1.4))
        obj(f'Plakat_{k}', poster, lp(f'Plakat_{k}', col, .7, var=.06), c, collide=0)

    # ================================================================ WC (x 29.1 … 32.9, y −9.9 … −6.7)
    wcw = lp('Fliese_wand', '#eef0ef', .3, var=.02)
    obj('WC_Fliesen', merge(box(3.75, .01, 1.5, at=(31.0, -9.87, F)), box(.01, 3.1, 1.5, at=(32.87, -8.3, F))), wcw, c, collide=0)
    multi('Toilette', [(box(.38, .55, .4, at=(32.4, -9.2, F), bevel_w=.06, seg=2), white), (box(.4, .2, .45, at=(32.4, -9.65, F + .3), bevel_w=.03), white),
                       (box(.4, .45, .03, at=(32.4, -9.15, F + .42)), white), (box(.08, .04, .02, at=(32.4, -9.65, F + .76)), steel)], c, interact='use', use='spuelen', label='Toilette')
    multi('Waschbecken', [(box(.55, .4, .15, at=(30.2, -9.65, F + .75), bevel_w=.04), white), (cyl(.02, .2, at=(30.2, -9.8, F + .9), seg=6), steel),
                          (box(.02, .12, .02, at=(30.2, -9.72, F + 1.08)), steel), (box(.5, .02, .7, at=(30.2, -9.86, F + 1.15)), lp('Spiegel', '#cfe0e6', .02, .9))],
          c, interact='use', use='wasserhahn', label='Waschbecken')
    multi('WC_Zubehoer', [(box(.1, .08, .2, at=(30.65, -9.82, F + 1.1)), white), (box(.3, .15, .3, at=(31.3, -9.8, F + 1.3)), white), (box(.3, .2, .35, at=(29.6, -9.78, F + .9)), steel),
                          (cyl(.06, .1, at=(32.85, -8.9, F + .7), seg=8, axis='X'), white), (cyl(.15, .4, at=(31.6, -9.6, F), seg=8), steel)], c, collide=0)
    multi('Erste_Hilfe_Schrank', [(box(.4, .15, .45, at=(32.75, -7.6, F + 1.3)), white), (box(.02, .2, .06, at=(32.67, -7.6, F + 1.5)), lp('Erste_Hilfe', '#2f9e44', .5)),
                                  (box(.02, .06, .2, at=(32.67, -7.6, F + 1.45)), lp('Erste_Hilfe', '#2f9e44', .5))], c, collide=0)
    obj('WC_Ablage', box(.3, .18, .02, at=(32.75, -7.6, F + 1.08)), lp('Weiss_glanz', '#f4f4f1', .3, var=.02), c, collide=0)
    pickup('Desinfektion', [(cyl(.03, .15, at=(32.7, -7.6, F + 1.1), seg=8), lp('Desinfekt', '#e9eef0', .3)), (cyl(.012, .04, at=(32.7, -7.6, F + 1.25), seg=6), PAL[2])], 'desinfektion', 'Desinfektionsmittel')

    # ================================================================ office (x 33.1 … 36.9, y 3.1 … 9.9)
    multi('Schreibtisch', [(box(1.6, .8, .04, at=(35.6, 9.4, F + .74)), wood), (box(.04, .76, .74, at=(34.82, 9.4, F)), wood_d), (box(.04, .76, .74, at=(36.38, 9.4, F)), wood_d),
                           (box(.4, .7, .6, at=(36.1, 9.4, F + .1)), wood_d)], c)
    multi('Computer', [(box(.55, .05, .35, at=(35.6, 9.6, F + .95)), blk), (box(.5, .01, .3, at=(35.6, 9.57, F + .98)), lp('Bildschirm_aus', '#1b2228', .2)),
                       (box(.08, .08, .2, at=(35.6, 9.65, F + .78)), blk), (box(.45, .15, .02, at=(35.6, 9.25, F + .78)), grey), (box(.06, .1, .03, at=(35.95, 9.25, F + .78)), grey)], c, collide=0)
    multi('Funkgeraet', [(box(.35, .22, .14, at=(35.05, 9.45, F + .78), bevel_w=.01), lp('Funk', '#4a5a3a', .6)), (box(.12, .01, .06, at=(34.98, 9.335, F + .84)), lp('Bildschirm_aus', '#1b2228', .2)),
                         (cyl(.02, .02, at=(35.17, 9.34, F + .86), seg=8, axis='Y'), grey), (cyl(.006, .5, at=(35.18, 9.5, F + .92), seg=4), steel),
                         (box(.06, .04, .1, at=(34.85, 9.3, F + .78)), blk)], c, collide=0, interact='use', use='funk', label='Funkgerät', needs='batterie_9v')
    pickup('Notizzettel', [(box(.15, .2, .002, at=(35.9, 9.1, F + .78), rz=.2), lp('Zettel', '#fff6a8', .8))], 'notiz_hochsitz', 'Notizzettel',
           text='Ersatzbatterien fürs Funkgerät liegen oben im Hochsitz. Pfad hinter dem Holzstapel, immer am Bach lang. – Bernd')
    multi('Buerostuhl', [(box(.45, .45, .08, at=(35.6, 8.7, F + .45), bevel_w=.03), blk), (box(.45, .08, .5, at=(35.6, 8.45, F + .55), bevel_w=.03), blk),
                         (cyl(.03, .4, at=(35.6, 8.7, F + .05), seg=6), steel), (cyl(.3, .03, at=(35.6, 8.7, F + .03), seg=5), steel)], c)
    multi('Sicherungskasten', [(box(.5, .14, .7, at=(33.35, 4.2, F + 1.2)), lp('Sicherung', '#c9cccd', .5, .3)), (box(.02, .1, .1, at=(33.43, 4.0, F + 1.75)), lp('Warngelb', '#e8b923', .5)),
                               (box(.03, .4, .05, at=(33.43, 4.2, F + 1.4)), blk), (box(.03, .4, .05, at=(33.43, 4.2, F + 1.55)), blk)], c, collide=0,
          interact='use', use='sicherung', label='Sicherungskasten')
    multi('Spind', [(box(.5, .5, 1.9, at=(36.6, 4.5, F), bevel_w=.01), lp('Spind', '#5c7a8a', .5, .4)), (box(.02, .3, .05, at=(36.34, 4.5, F + 1.7)), grey),
                    (box(.02, .02, .15, at=(36.34, 4.7, F + 1.0)), steel)], c,
          interact='search', label='Spind', item='pistole', loot=[['pistole', 1], ['patronen_pistole', 1]], found='Im Spind: eine alte Dienstpistole und eine Schachtel Munition. Bernd war wohl vorsichtig.')
    pickup('Jacke', [(box(.1, .45, .65, at=(36.68, 6.0, F + 1.05), bevel_w=.03), lp('Jacke', '#b5512b', .9)), (box(.1, .04, .04, at=(36.7, 6.0, F + 1.7)), steel)], 'jacke', 'Warme Jacke')
    multi('Pinnwand', [(box(.03, 1.0, .7, at=(36.73, 7.6, F + 1.3)), lp('Kork', '#b8875a', .9))] + [(box(.01, .2, .15, at=(36.71, 7.25 + .25 * i, F + 1.5 - .2 * (i % 2))), PAL[(i * 3) % 14]) for i in range(4)], c, collide=0)
    multi('Aktenschrank', [(box(.5, .6, 1.2, at=(33.5, 8.8, F)), shelf_g)] + [(box(.02, .1, .02, at=(33.76, 8.8, F + .2 + .3 * i)), steel) for i in range(4)], c)
    multi('Telefon', [(box(.18, .2, .06, at=(36.3, 9.4, F + .78)), lp('Telefon', '#e4e4df', .4)), (box(.05, .2, .04, at=(36.22, 9.4, F + .84)), lp('Telefon', '#e4e4df', .4))], c, collide=0,
          interact='use', use='telefon', label='Telefon')

    # ================================================================ storage (x 33.1 … 36.9, y −9.9 … 2.9)
    def heavy_shelf(name, x, y, w, d, rz, seed, gaps=()):
        """Steel shelf with cartons; gaps = [(level z, local x0, local x1)] stay empty for pickups."""
        parts = []
        for sx in (-w / 2 + .03, w / 2 - .03):
            for sy in (-d / 2 + .03, d / 2 - .03): parts.append((box(.05, .05, 2.0, at=(sx, sy, 0)), lp('Regal_blau', '#2a63b8', .5, .3)))
        for zz in (.1, .7, 1.3, 1.9): parts.append((box(w, d, .03, at=(0, 0, zz)), lp('Regal_Holz', '#c9a273', .8)))
        rr = random.Random(seed)
        for zz in (.13, .73, 1.33):
            xx = -w / 2 + .05
            while xx < w / 2 - .3:
                bw = rr.uniform(.25, .5); bh = rr.uniform(.2, .45)
                if any(abs(gz - zz) < .01 and xx < g1 and xx + bw > g0 for gz, g0, g1 in gaps): xx += .1; continue
                parts.append((box(bw, d * .8, bh, at=(xx + bw / 2, 0, zz), bevel_w=.01), lp('Karton', '#b98b5a', .9, var=.08))); xx += bw + .03
        bms = []
        for bm, m in parts: rotz(bm, rz); move(bm, (x, y, F)); bms.append((bm, m))
        return multi(name, bms, c)
    heavy_shelf('Lagerregal_1', 36.55, -7.55, 2.9, .6, math.pi / 2, 1, gaps=[(1.33, .4, .9), (.73, -1.0, -.5)])          # south of the back door (y −4.6 … −3.7) – keeps the way in free
    heavy_shelf('Lagerregal_2', 33.55, -7.0, 2.4, .6, math.pi / 2, 2)
    heavy_shelf('Lagerregal_3', 35.0, -9.5, 2.0, .6, 0, 3, gaps=[(1.33, .0, .4)])
    pickup('Kanister', [(box(.18, .35, .45, at=(33.6, 1.3, F), bevel_w=.03), red), (box(.06, .2, .05, at=(33.6, 1.25, F + .47)), red), (cyl(.025, .06, at=(33.6, 1.48, F + .45), seg=6), blk)],
           'kanister', 'Benzinkanister (leer)')
    pickup('Lappen', [(box(.25, .2, .03, at=(36.35, -6.9, F + 1.36)), lp('Lappen', '#d9c38a', .95))], 'lappen', 'Lappen')
    pickup('Topf', [(cyl(.13, .14, at=(36.4, -8.3, F + .76), seg=10), steel), (box(.03, .12, .02, at=(36.22, -8.3, F + .87)), blk)], 'topf', 'Kochtopf')
    pickup('Taschenlampe_Batterie_9V', [(box(.07, .04, .06, at=(35.2, -9.3, F + 1.36)), PAL[12])], 'batterie_9v_leer', '9-V-Block (leer)')
    for k in range(3):
        for j in range(2 - (k > 1)):
            add(lp('Kiste_rot', '#c8382c', .6), box(.4, .3, .28, at=(33.55 + .45 * j, -4.9, F + .28 * k), bevel_w=.01))
            for bx_ in range(4):
                for by_ in range(3): add(lp('Flasche_braun', '#6b3a1e', .3), cyl(.03, .26, at=(33.4 + .45 * j + .1 * bx_, -5.0 + .1 * by_, F + .28 * k + .02), seg=6))
    flush('Getraenkekisten', collide=1)
    multi('Wischeimer', [(cyl(.18, .3, at=(36.4, 1.6, F), seg=10), lp('Eimer_gelb', '#e8b923', .5)), (cyl(.015, 1.3, at=(36.45, 1.7, F + .2), seg=5), steel),
                         (box(.3, .12, .1, at=(36.45, 1.7, F + .1)), lp('Mopp', '#e4e4df', .95))], c)
    multi('Leiter', [(box(.05, .05, 2.2, at=(33.3, 2.5 + s * .22, F), rz=0), steel) for s in (-1, 1)] + [(box(.04, .44, .04, at=(33.3, 2.5, F + .3 * i)), steel) for i in range(1, 7)], c)
    multi('Palette', [(box(1.2, .8, .14, at=(35.4, -.6, F)), lp('Palette', '#b08a5a', .9))] + [(box(1.1, .7, .3, at=(35.4, -.6, F + .14 + .3 * i), bevel_w=.01), lp('Folie_Pack', '#d9e2e6', .3)) for i in range(3)], c)
    multi('Boiler', [(cyl(.25, .8, at=(36.6, -1.5, F + 1.2), seg=10), white), (cyl(.02, .5, at=(36.6, -1.6, F + .7), seg=5), steel)], c)
