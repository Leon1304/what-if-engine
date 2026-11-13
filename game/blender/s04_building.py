# Section 4 – shop building (x 21 … 37, y −10 … 10): plinth, walls with windows, glass front with automatic sliding door,
# rooms: sales area, WC, office, storage; doors (WC, staff, office↔storage, locked back door), suspended ceiling with light panels,
# flat roof with parapet, AC units, vents, hatch; entrance canopy over the sidewalk, WALDTANK / SHOP lettering, downpipes, sidewalk.
COLL = '04 Gebäude'
X0, X1, Y0, Y1 = 21.0, 37.0, -10.0, 10.0
T = .25            # wall thickness
F = .25            # floor top (sidewalk height)
H = 4.0            # wall height above the floor (roof slab on top)
CEIL = 3.1         # suspended ceiling above the floor
XP = 33.0          # partition sales | back rooms
YO = 3.0           # partition storage (south) | office (north)
WCX, WCY = 29.0, -6.6   # WC corner (x WCX … XP, y Y0 … WCY)

def build(c):
    plaster = lp('Putz', '#e7e2d6', .9, var=.04); plinth = lp('Sockel', '#5d6064', .8, var=.05)
    inner = lp('Wand_innen', '#efece4', .9, var=.03); alu = lp('Alu', '#6e7378', .4, .6, var=.03)
    red = lp('Waldtank_rot', '#c42a26', .5, var=.03); grn = lp('Waldtank_gruen', '#2f6b3a', .5, var=.03); wh = lp('Waldtank_weiss', '#f1f0ea', .5, var=.03)
    gl = glass(); door_m = lp('Tuer_grau', '#9aa1a8', .6, .2, var=.03); door_w = lp('Tuer_weiss', '#e9e9e4', .6, var=.03)
    roof_m = lp('Dachpappe', '#575551', .95, var=.07); metal = lp('Blech', '#a3a8ac', .45, .6, var=.04)
    steel = lp('Stahl', '#9da2a6', .35, .8, var=.04); blk = lp('Kunststoff_schwarz', '#232426', .6, var=.03)

    # ---- floor slab + floors per room (tiles = facets with alternating tones)
    obj('Bodenplatte', box(X1 - X0 + .3, Y1 - Y0 + .3, F - .1, at=((X0 + X1) / 2, (Y0 + Y1) / 2, .1)), plinth, c)
    def tiles(name, x0, x1, y0, y1, s, ma, mb, z=F):
        bm = bmesh.new(); nx, ny = max(1, round((x1 - x0) / s)), max(1, round((y1 - y0) / s)); sx, sy = (x1 - x0) / nx, (y1 - y0) / ny
        for i in range(nx):
            for j in range(ny):
                q = [bm.verts.new((x0 + i * sx + dx, y0 + j * sy + dy, z)) for dx, dy in ((0, 0), (sx, 0), (sx, sy), (0, sy))]
                f = bm.faces.new(q); f.material_index = (i + j) % 2
        o = _finish(name, bm, [ma, mb], c, None, False, 0, {'walk': 1}, 3); return o
    tiles('Boden_Verkauf', X0 + T / 2, XP - T / 2, Y0 + T / 2, Y1 - T / 2, .6, lp('Fliese_a', '#cfcbc2', .5, var=.03), lp('Fliese_b', '#bdb8ad', .5, var=.03), F + .002)
    tiles('Boden_WC', WCX + T / 2, XP - T / 2, Y0 + T / 2, WCY - T / 2, .3, lp('Fliese_wc_a', '#e3e6e6', .4, var=.02), lp('Fliese_wc_b', '#d3d8d8', .4, var=.02), F + .004)
    tiles('Boden_Lager', XP + T / 2, X1 - T / 2, Y0 + T / 2, YO - T / 2, 1.0, lp('Estrich', '#9c9a93', .9, var=.05), lp('Estrich_b', '#93918a', .9, var=.05), F + .002)
    tiles('Boden_Buero', XP + T / 2, X1 - T / 2, YO + T / 2, Y1 - T / 2, .5, lp('Linoleum', '#8a7a62', .7, var=.03), lp('Linoleum_b', '#7f705a', .7, var=.03), F + .002)

    # ---- outer walls (front x = X0 is glass, built below)
    sw = [(.6, 6.2, .9, 2.4)]                                   # south wall: bistro window
    nw = [(12.6, 1.6, 1.2, 2.2)]                                # north wall: office window
    ew = [(5.4, 1.0, 0, 2.15), (13.0, 1.2, 1.2, 2.2)]           # east wall: back door (storage), office window... measured from the south
    walls = [wall((X0, Y0 + T / 2), (X1, Y0 + T / 2), T, H, sw, F), wall((X0, Y1 - T / 2), (X1, Y1 - T / 2), T, H, nw, F),
             wall((X1 - T / 2, Y0), (X1 - T / 2, Y1), T, H, ew, F)]
    pillars = [box(.4, .4, H, at=(X0 + .2, y, F)) for y in (Y0 + .2, Y1 - .2, -4.5, 4.5)]
    lintel = box(.4, Y1 - Y0, .9, at=(X0 + .2, 0, F + 3.1))
    obj('Aussenwaende', merge(*walls, *pillars, lintel), plaster, c)
    obj('Sockel_aussen', merge(box(X1 - X0 + .06, .03, .5, at=((X0 + X1) / 2, Y0 - .015, F - .15)), box(X1 - X0 + .06, .03, .5, at=((X0 + X1) / 2, Y1 + .015, F - .15)),
                                box(.03, Y1 - Y0, .5, at=(X1 + .015, 0, F - .15))), plinth, c, collide=0)
    frames = [frame((X0, Y0 + T / 2), (X1, Y0 + T / 2), T, o, F) for o in sw] + [frame((X0, Y1 - T / 2), (X1, Y1 - T / 2), T, o, F) for o in nw] + \
             [frame((X1 - T / 2, Y0), (X1 - T / 2, Y1), T, ew[1], F)]
    obj('Fensterrahmen', merge(*frames), alu, c, collide=0)
    obj('Fenster_Glas', merge(box(6.2 - .1, .03, 1.4, at=(X0 + .6 + 3.1, Y0 + T / 2, F + .95)), box(1.5, .03, .9, at=(X0 + 12.6 + .8, Y1 - T / 2, F + 1.25)),
                              box(.03, 1.1, .9, at=(X1 - T / 2, Y0 + 13.6, F + 1.25))), gl, c)
    # mullions in the bistro window
    obj('Fenstersprossen', merge(*[box(.06, .3, 1.5, at=(X0 + .6 + 6.2 * k / 3, Y0 + T / 2, F + .9)) for k in (1, 2)]), alu, c, collide=0)

    # ---- glass front (x = X0): 4 fixed panes + sliding door (y −1 … 1)
    fr = []
    for ya, yb in ((Y0 + .4, -4.5 - .2), (-4.5 + .2, -1.1), (1.1, 4.5 - .2), (4.5 + .2, Y1 - .4)):
        fr += [box(.12, yb - ya, .1, at=(X0 + .2, (ya + yb) / 2, F)), box(.12, yb - ya, .1, at=(X0 + .2, (ya + yb) / 2, F + 3.0)),
               box(.12, .08, 3.1, at=(X0 + .2, ya + .04, F)), box(.12, .08, 3.1, at=(X0 + .2, yb - .04, F)), box(.12, yb - ya, .06, at=(X0 + .2, (ya + yb) / 2, F + 2.3))]
        obj(f'Glasfront_{ya:.0f}', box(.03, yb - ya - .1, 2.95, at=(X0 + .2, (ya + yb) / 2, F + .05)), gl, c)
    fr += [box(.14, 2.3, .25, at=(X0 + .2, 0, F + 2.3)), box(.14, .1, 2.55, at=(X0 + .2, -1.15, F)), box(.14, .1, 2.55, at=(X0 + .2, 1.15, F)),
           box(.3, 2.0, .22, at=(X0 + .38, 0, F + 2.33), bevel_w=.02)]          # door operator box inside
    obj('Glasfront_Rahmen', merge(*fr), alu, c)
    obj('Glasfront_Oberlicht', box(.03, 2.1, .7, at=(X0 + .2, 0, F + 2.55)), gl, c, collide=0)
    obj('Sensor_Tuer', merge(box(.12, .25, .08, at=(X0 + .05, 0, F + 2.6)), box(.02, .2, .04, at=(X0 - .01, 0, F + 2.62))), blk, c, collide=0)
    for s in (-1, 1):            # two leaves, each slides 1 m outwards
        leaf = [(box(.06, 1.0, 2.25, at=(X0 + .28, s * .5, F + .02)), gl), (box(.07, 1.0, .08, at=(X0 + .28, s * .5, F + .02)), alu),
                (box(.07, 1.0, .08, at=(X0 + .28, s * .5, F + 2.19)), alu), (box(.07, .06, 2.25, at=(X0 + .28, s * .97, F + .02)), alu),
                (box(.07, .06, 2.25, at=(X0 + .28, s * .03, F + .02)), alu), (box(.075, .7, .07, at=(X0 + .28, s * .5, F + 1.05)), steel)]
        multi(f'Schiebetuer_{"S" if s < 0 else "N"}', leaf, c, pivot=(X0 + .28, s * .5, F), interact='slide', slide=[0, s * .98, 0], auto=1,
              needs='strom', label='Schiebetür', locked_msg='Die Schiebetür bewegt sich nicht. Kein Strom.')
    obj('Fussmatte', box(1.6, 2.2, .02, at=(X0 + 1.2, 0, F)), lp('Matte', '#3b3d40', .95, var=.06), c, collide=0)
    obj('Fussmatte_aussen', box(1.2, 2.0, .02, at=(X0 - .8, 0, F)), lp('Matte_gruen', '#2f4a34', .95, var=.06), c, collide=0)

    # ---- inner walls with door openings
    iw = []
    iw.append(wall((XP, Y0 + T), (XP, Y1 - T), T, CEIL, [(15.4, 1.0, 0, 2.1)], F))                      # sales | back rooms, staff door at y 5.4 … 6.4
    iw.append(wall((XP + T / 2, YO), (X1 - T / 2, YO), T, CEIL, [(1.3, .9, 0, 2.1)], F))                # storage | office, door at x 34.55 … 35.45
    iw.append(wall((WCX, WCY), (XP - T / 2, WCY), .15, CEIL, [(.5, .85, 0, 2.05)], F))                  # WC front wall, door at x 29.5 … 30.35
    iw.append(wall((WCX, Y0 + T), (WCX, WCY + .075), .15, CEIL, (), F))
    obj('Innenwaende', merge(*iw), inner, c)
    # door frames
    obj('Zargen', merge(frame((XP, Y0 + T), (XP, Y1 - T), T, (15.4, 1.0, 0, 2.1), F, .05), frame((XP + T / 2, YO), (X1 - T / 2, YO), T, (1.3, .9, 0, 2.1), F, .05),
                        frame((WCX, WCY), (XP - T / 2, WCY), .15, (.5, .85, 0, 2.05), F, .05), frame((X1 - T / 2, Y0), (X1 - T / 2, Y1), T, ew[0], F, .06)), alu, c, collide=0)
    def door(name, hinge, w, rz, sign, mat_, label, **kw):
        """Hinged door leaf (w wide, 2.0 high) with handle; origin on the hinge, closed along rz; opens by sign·100°."""
        leaf = [(box(w - .02, .045, 2.03, at=(w / 2, 0, 0)), mat_), (box(.03, .1, .03, at=(w - .12, -.05, .98)), steel), (box(.03, .1, .03, at=(w - .12, .05, .98)), steel),
                (box(.05, .02, .14, at=(w - .12, -.03, .92)), steel), (box(.05, .02, .14, at=(w - .12, .03, .92)), steel)]
        bms = []
        for bm, m in leaf:
            rotz(bm, rz); move(bm, hinge); bms.append((bm, m))
        return multi(name, bms, c, pivot=hinge, interact='door', angle=sign * math.radians(100), label=label, **kw)
    door('Tuer_Personal', (XP, Y0 + T + 15.4 + .03, F), .94, math.pi / 2, -1, door_m, 'Tür „Personal“')
    door('Tuer_Lager', (XP + T / 2 + 1.3 + .03, YO, F), .84, 0, 1, door_m, 'Lagertür')
    door('Tuer_WC', (WCX + .5 + .03, WCY, F), .79, 0, -1, door_w, 'WC')
    door('Hintertuer', (X1 - T / 2, Y0 + 5.4 + .03, F), .94, math.pi / 2, 1, lp('Tuer_stahl', '#5f6b62', .5, .4, var=.03), 'Hintertür',
         locked=1, key='schluessel_hinten', locked_msg='Abgeschlossen. Vielleicht liegt irgendwo ein Schlüssel?')
    obj('Schild_Personal', merge(box(.02, .4, .12, at=(XP - T / 2 - .01, Y0 + T + 15.9, F + 2.25))), lp('Schild_gelb', '#f2c230', .5), c, collide=0)
    obj('Schild_WC', text_bm('WC', .14, at=(WCX + .9, WCY - .085, F + 2.2), rz=0, depth=.01), blk, c, collide=0)

    # ---- suspended ceiling with light panels (sales) and simple ceilings in back rooms
    cz = F + CEIL
    ceil = [box(XP - X0 - .3, Y1 - Y0 - .4, .04, at=((X0 + XP) / 2, 0, cz)), box(X1 - XP - .3, Y1 - Y0 - .4, .04, at=((XP + X1) / 2, 0, cz))]
    obj('Decke', merge(*ceil), lp('Decke', '#f0efea', .9, var=.025), c, collide=0)
    grid = [box(.03, Y1 - Y0 - .4, .02, at=(X0 + .3 + .6 * i, 0, cz - .02)) for i in range(1, 20)] + [box(XP - X0 - .3, .03, .02, at=((X0 + XP) / 2, Y0 + .2 + .6 * j, cz - .02)) for j in range(1, 33)]
    obj('Deckenraster', merge(*grid), lp('Raster', '#c9c8c2', .7, var=0), c, collide=0)
    panels = []; k = 0
    for px in (23.0, 26.0, 29.0, 31.8):
        for py in (-7.2, -3.6, 0.0, 3.6, 7.2):
            if px > WCX and py < WCY: continue
            panels.append(box(1.2, .6, .02, at=(px, py, cz - .03))); light(f'innen_{k}', (px, py, cz - .3), '#f6f8ff', 30, group='innen', kind='panel'); k += 1
    panels += [box(1.2, .3, .02, at=(31, -8.2, cz - .03)), box(1.2, .3, .02, at=(35, -3.5, cz - .03)), box(1.2, .3, .02, at=(35, 6.5, cz - .03))]
    for nm, at in (('wc', (31, -8.2, cz - .3)), ('lager', (35, -3.5, cz - .3)), ('buero', (35, 6.5, cz - .3))): light(nm, at, '#fff2dc', 25, group='innen', kind='panel')
    obj('Deckenleuchten', merge(*panels), glow('Panel_licht', '#f6f8ff', 5), c, collide=0, glow_group='innen')

    # ---- roof: slab, parapet with metal cap, gravel-felt, AC units, vents, hatch, downpipes
    obj('Dach', box(X1 - X0 + .3, Y1 - Y0 + .3, .3, at=((X0 + X1) / 2, 0, F + H)), roof_m, c)
    par = [box(X1 - X0 + .3, .25, .45, at=((X0 + X1) / 2, Y0 - .02, F + H + .3)), box(X1 - X0 + .3, .25, .45, at=((X0 + X1) / 2, Y1 + .02, F + H + .3)),
           box(.25, Y1 - Y0, .45, at=(X0 - .02, 0, F + H + .3)), box(.25, Y1 - Y0, .45, at=(X1 + .02, 0, F + H + .3))]
    obj('Attika', merge(*par), plaster, c)
    obj('Attika_Abdeckung', merge(box(X1 - X0 + .4, .32, .05, at=((X0 + X1) / 2, Y0 - .02, F + H + .75)), box(X1 - X0 + .4, .32, .05, at=((X0 + X1) / 2, Y1 + .02, F + H + .75)),
                                  box(.32, Y1 - Y0, .05, at=(X0 - .02, 0, F + H + .75)), box(.32, Y1 - Y0, .05, at=(X1 + .02, 0, F + H + .75))), metal, c, collide=0)
    for k, (x, y) in enumerate(((31, 5), (34.5, -6))):
        ac = [(box(1.6, 1.0, 1.0, at=(x, y, F + H + .3), bevel_w=.04), lp('Klima', '#c9cccd', .5, .3, var=.04)), (cyl(.38, .02, at=(x, y, F + H + 1.3), seg=12), blk),
              (box(1.7, 1.1, .1, at=(x, y, F + H + .3)), plinth)] + [(box(.02, .8, .02, at=(x - .3 + .1 * i, y, F + H + 1.31)), steel) for i in range(7)]
        multi(f'Klimageraet_{k}', ac, c)
    obj('Dachluke', box(1.0, 1.0, .35, at=(27, -4, F + H + .3), bevel_w=.03), metal, c)
    obj('Lueftungsrohre', merge(cyl(.12, .8, at=(25, 6, F + H + .3), seg=8), cyl(.16, .05, at=(25, 6, F + H + 1.1), seg=8), cyl(.08, .6, at=(35.5, 8, F + H + .3), seg=8)), metal, c)
    pipes = []
    for (x, y) in ((X1 + .12, Y0 + .3), (X1 + .12, Y1 - .3), (X0 + 1, Y1 + .12), (X0 + 1, Y0 - .12)):
        pipes += [cyl(.06, F + H + .5, at=(x, y, 0), seg=8), box(.18, .18, .12, at=(x, y, F + H + .55))]
    obj('Fallrohre', merge(*pipes), metal, c, collide=0)

    # ---- entrance canopy over the sidewalk + lettering
    obj('Vordach', box(2.4, Y1 - Y0 + 1.0, .35, at=(X0 - 1.0, 0, F + 3.4), bevel_w=.03), wh, c)
    obj('Vordach_Streifen', box(2.42, Y1 - Y0 + 1.02, .1, at=(X0 - 1.0, 0, F + 3.5)), red, c, collide=0)
    vl = []
    for k, y in enumerate((-8, -4, 0, 4, 8)):
        vl.append(box(.5, .5, .02, at=(X0 - 1.0, y, F + 3.38))); light(f'vordach_{k}', (X0 - 1.0, y, F + 3.2), '#ffe6c0', 40, group='aussen', kind='spot_down')
    obj('Vordach_Spots', merge(*vl), glow('Leuchte_warm', '#ffd9a0', 5), c, collide=0, glow_group='aussen')
    fa = text_bm('WALDTANK', .62, at=(X0 - .17, -2.2, F + 3.95), rz=-math.pi / 2, depth=.06); obj('Schriftzug_Shop', fa, grn, c, collide=0)
    sh = text_bm('SHOP · 24h', .4, at=(X0 - .17, 5.6, F + 4.02), rz=-math.pi / 2, depth=.05); obj('Schriftzug_24h', sh, red, c, collide=0)
    leaf = ico(.45, at=(X0 - .2, -7.0, F + 4.2), sub=1, sz=1.3); bmesh.ops.scale(leaf, vec=(.15, 1, 1), verts=leaf.verts)
    obj('Logo_Blatt', leaf, lp('Blatt_hell', '#8fd06a', .5), c, collide=0)
    obj('Fassade_Band', box(.1, Y1 - Y0 + .4, .9, at=(X0 - .08, 0, F + 3.85)), wh, c, collide=0)

    # ---- sidewalk (x 19 … 21) with curb, bollards
    obj('Gehweg', box(2.2, Y1 - Y0 + 2.0, F - .1, at=(X0 - 1.1, 0, .1)), lp('Pflaster', '#a9a59b', .9, var=.07), c, walk=1)
    joints = [box(2.2, .02, .004, at=(X0 - 1.1, Y0 - 1 + .4 * j, F)) for j in range(1, 55)]
    obj('Pflaster_Fugen', merge(*joints), lp('Fuge', '#8c8a84', .9, var=0), c, collide=0)
    obj('Bordstein_Gehweg', box(.16, Y1 - Y0 + 2.0, .2, at=(X0 - 2.2, 0, .1), bevel_w=.02), lp('Bordstein', '#c9c6be', .8, var=.06), c)
    bol = [cyl(.08, .9, at=(X0 - 2.0, y, F), seg=8) for y in (-10, -6.5, -3, 3, 6.5, 10)]
    obj('Poller', merge(*bol), lp('Warngelb', '#e8b923', .5, var=.03), c)
    # rear step + small roof over the back door, wall lamp
    obj('Hintertuer_Stufe', box(1.3, 1.6, F - .05, at=(X1 + .65, Y0 + 5.9, .05)), lp('Beton', '#b3b0a8', .9, var=.05), c, walk=1)
    obj('Hintertuer_Dach', box(1.0, 1.8, .12, at=(X1 + .5, Y0 + 5.9, F + 2.5)), metal, c, collide=0)
    obj('Wandlampe_hinten', box(.15, .25, .2, at=(X1 + .08, Y0 + 7.1, F + 2.2)), glow('Leuchte_warm', '#ffd9a0', 5), c, collide=0, glow_group='aussen')
    light('hinten', (X1 + .4, Y0 + 7.1, F + 2.1), '#ffd9a0', 35, group='aussen')
