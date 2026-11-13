# Cyberpunk station stairs up to an elevated platform, 4.4 m wide × 11.4 m long, platform deck at 4.5 m (top of the gate arch 8 m).
# Straight run from the front (−y) to the back: cast-concrete lower flight (15 steps, worn nosings, chipped edges, grime), concrete
# landing, upper flight of steel grating treads on two steel stringers, the space below closed by corrugated panels with graffiti
# and a padlocked service gate; platform on a concrete utility room (steel door with sign, vent, AC box, posters, downpipe, conduit);
# railings on both flights with a cyan neon strip under the handrail and stickers on the posts; on the platform a gate arch with a
# neon station sign in made-up glyphs and two lamps, three turnstiles with lit arrows, a ticket machine, a bench, cables, litter.
# Walk surface: both flights, the landing and the platform (nothing walkable below any of them).
# Parts: turnstile_1…3 (arms, rx turns), door (utility room door, hinge at its −y edge, rz > 0 opens outwards), sign (station sign),
# litter (cans and the puddle at the foot).
# Marks: foot (in front of the first step, facing up), landing, top (head of the stairs), gate (in front of the turnstiles),
# ticket (in front of the ticket machine), bench, room_door (outside the utility room door, facing it), path_1…4 (centre line foot
# → landing → upper flight → platform, for walk()), light_sign, light_stairs, cam_foot.
# Materials: concrete, concrete_dark, grating, + _cyber.py.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/cp_stairs.py
use('_cyber.py')
AO = {'strength': 0.6, 'dist': 0.8}

def beam(a, b, w, h):
    """Rectangular bar from a to b: w across (world x), h in the plane of the run (stringers, handrails)."""
    a, b = Vector(a), Vector(b); d = b - a; L = d.length
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * w, v.co.y * h, (v.co.z + 0.5) * L))
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=d.normalized().to_track_quat('Z', 'X').to_matrix(), verts=bm.verts)
    return move(bm, a)

def side_panel(x, pts, t):
    """Panel in the y-z plane at x, outline pts [(y, z), …], thickness t (closes the space under a flight)."""
    bm = bmesh.new(); vs = [bm.verts.new((x - t / 2, y, z)) for y, z in pts]; f = bm.faces.new(vs)
    ex = bmesh.ops.extrude_face_region(bm, geom=[f]); bmesh.ops.translate(bm, vec=(t, 0, 0), verts=[v for v in ex['geom'] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return bm

def build(coll):
    M = cyber_mats(); N = neon_mats(); out = []; R = random.Random(33)
    conc = mat('concrete', '#5B5E63', 0.95); conc_d = mat('concrete_dark', '#3C3F44', 0.95); grate = mat('grating', '#4A4F55', 0.5, 0.7)
    corr = mat('corrugated', '#3E4A52', 0.6, 0.5); door_m = mat('door', '#2F5A66', 0.5, 0.4)
    add = lambda n, bm, m: (out.append(mesh(n, bm, m, coll)), out[-1])[1]
    W, RISE, RUN, NS = 2.4, 0.15, 0.30, 15
    y0 = -6.9; yl0 = y0 + NS * RUN; yl1 = yl0 + 1.4; yt = yl1 + NS * RUN; zl, zt = NS * RISE, 2 * NS * RISE      # -2.4, -1.0, 3.5, 2.25, 4.5
    yb = yt + 2.4; PW = 4.4
    walk = []
    # lower flight: solid cast concrete, worn nosings, chips
    for i in range(NS):
        y = y0 + RUN * i; z = RISE * (i + 1)
        add(f'step{i}', box(W, RUN, z, (0, y + RUN / 2, 0)), conc if i % 4 else conc_d)
        add(f'nosing{i}', box(W - 0.1, 0.04, 0.012, (0, y + 0.03, z - 0.004)), M['hazard_y'] if i in (0, NS - 1) else M['steel'])
        walk.append(box(W, RUN, 0.01, (0, y + RUN / 2, z - 0.01)))
    add('chips', merge([box(R.uniform(0.08, 0.2), 0.05, 0.05, (R.choice((-1, 1)) * (W / 2 - 0.03), y0 + RUN * k + 0.02, RISE * (k + 1) - 0.05)) for k in range(0, NS, 3)]), M['void'])
    add('grime_low', box(W + 0.02, 0.5, 0.25, (0, y0 + 0.2, 0)), M['grime'])
    # landing block, then the upper flight on stringers
    add('landing', box(W, 1.4, zl, (0, (yl0 + yl1) / 2, 0)), conc)
    add('landing_edge', box(W - 0.1, 0.04, 0.012, (0, yl0 + 0.03, zl - 0.004)), M['hazard_y'])
    walk.append(box(W, 1.4, 0.01, (0, (yl0 + yl1) / 2, zl - 0.01)))
    for i in range(NS):
        y = yl1 + RUN * i; z = zl + RISE * (i + 1)
        add(f'tread{i}', box(W - 0.2, RUN + 0.02, 0.04, (0, y + RUN / 2, z - 0.04)), grate)
        add(f'tread_bars{i}', merge([box(0.02, RUN - 0.04, 0.005, (-1.0 + k * 0.2, y + RUN / 2, z)) for k in range(11)]), M['metal_d'])
        add(f'tread_edge{i}', box(W - 0.2, 0.04, 0.01, (0, y + 0.02, z - 0.005)), M['hazard_y'] if i == NS - 1 else M['steel'])
        walk.append(box(W, RUN, 0.01, (0, y + RUN / 2, z - 0.01)))
    for s in (-1, 1):
        add(f'stringer{s}', beam((s * (W / 2 - 0.08), yl1 - 0.05, zl - 0.25), (s * (W / 2 - 0.08), yt + 0.05, zt - 0.2), 0.12, 0.3), M['metal_d'])
        add(f'stringer_rust{s}', beam((s * (W / 2 - 0.01), yl1 + 1.0, zl + 0.35), (s * (W / 2 - 0.01), yl1 + 1.6, zl + 0.6), 0.02, 0.18), M['rust'])
        # corrugated panels close the space below the upper flight
        add(f'under_panel{s}', side_panel(s * (W / 2 - 0.05), [(yl1, 0), (yt, 0), (yt, zt - 0.32), (yl1, zl - 0.3)], 0.05), corr)
        ribs = [yl1 + 0.15 + k * 0.3 for k in range(15)]           # ribs end at the panel's sloped top edge
        add(f'under_ribs{s}', merge([box(0.06, 0.05, zl - 0.32 + (y - yl1) / (yt - yl1) * (zt - zl - 0.02), (s * (W / 2 - 0.02), y, 0)) for y in ribs]), corr)
    # padlocked service gate in the right panel, graffiti on both panels
    gx = W / 2 + 0.01; gy = yl1 + 1.1
    add('svc_gate', box(0.03, 1.2, 1.9, (gx, gy + 0.6, 0.05)), M['metal'])
    add('svc_gate_bars', merge([box(0.02, 0.03, 1.8, (gx + 0.02, gy + 0.1 + k * 0.2, 0.1)) for k in range(6)]), M['metal_d'])
    add('padlock', box(0.03, 0.07, 0.09, (gx + 0.04, gy + 1.05, 1.0)), M['sticker_y'])
    add('padlock_chain', tube([(gx + 0.03, gy + 0.98, 1.08), (gx + 0.06, gy + 1.05, 0.98), (gx + 0.03, gy + 1.15, 1.08)], 0.008, 3), M['steel'])
    for s in (-1, 1):
        gl = merge([glyph(0, 0.5 + 0.55 * k, 0, 0.5, 0.45, 50 + k + (s > 0) * 7, r=0.035) for k in range(3)])
        rotz(gl, s * math.pi / 2); add(f'graffiti{s}', move(gl, (s * (W / 2 + 0.01), yl1 + (2.6 if s > 0 else 1.2), 0)), M['paint_tag'] if s < 0 else N['pink'])
    # platform deck on the utility room
    add('room', box(PW, yb - yt, zt - 0.25, (0, (yt + yb) / 2, 0), bevel_w=0.02), conc_d)
    add('deck', box(PW, yb - yt + 0.1, 0.25, (0, (yt + yb) / 2 - 0.05, zt - 0.25), bevel_w=0.02), conc)
    add('deck_edge', box(PW, 0.06, 0.03, (0, yt - 0.06, zt - 0.02)), M['hazard_y'])
    walk.append(box(PW, yb - yt + 0.1, 0.01, (0, (yt + yb) / 2 - 0.05, zt - 0.01)))
    add('room_seams', merge([box(0.02, yb - yt + 0.02, 0.02, (s * (PW / 2 + 0.001), (yt + yb) / 2, z)) for s in (-1, 1) for z in (1.4, 2.8)]), M['void'])
    add('room_stain', box(0.02, 0.8, 2.4, (PW / 2 + 0.005, yt + 0.5, 1.6)), M['grime'])
    # utility room door on +x (part), sign, vent, AC box, posters, downpipe, conduit
    dx, dy0 = PW / 2 + 0.02, yt + 0.6
    add('door_frame', box(0.06, 1.15, 2.2, (dx - 0.01, dy0 + 0.55, 0)), M['metal_d'])
    i0 = len(out)
    add('door_leaf', box(0.04, 1.0, 2.05, (dx + 0.02, dy0 + 0.55, 0.02)), door_m)
    add('door_handle', box(0.05, 0.04, 0.16, (dx + 0.06, dy0 + 0.95, 1.0)), M['steel'])
    add('door_hazard', box(0.005, 0.4, 0.3, (dx + 0.042, dy0 + 0.55, 1.5)), M['hazard_y'])
    part(out[i0:], 'door', pivot=(dx + 0.02, dy0 + 0.05, 0.02))
    add('door_light', box(0.12, 0.3, 0.06, (dx + 0.06, dy0 + 0.55, 2.3)), N['lamp'])
    add('vent', box(0.04, 0.6, 0.35, (dx, yt + 1.7, 2.6)), M['metal'])
    add('vent_slats', merge([box(0.05, 0.56, 0.02, (dx + 0.01, yt + 1.7, 2.65 + k * 0.07)) for k in range(4)]), M['void'])
    for k, bm in enumerate(ac_box((-PW / 2 - 0.16, yt + 1.2, 1.6), -math.pi / 2)): add(f'room_ac{k}', bm, [M['metal'], M['void']][k])
    for k in range(3):
        add(f'poster{k}', box(0.005, 0.6, 0.85, (-PW / 2 - 0.004, yt + 0.4 + k * 0.7, 0.6 + R.uniform(0, 0.15)), rz=0), [M['sticker_w'], N['violet'], M['sticker_y']][k])
    add('poster_glyphs', merge([move(rotz(glyph(0, 0.9, 0, 0.3, 0.35, 70 + k, r=0.015), -math.pi / 2), (-PW / 2 - 0.01, yt + 0.4 + k * 0.7, 0)) for k in range(3)]), M['void'])
    add('downpipe', merge([cyl(0.05, zt + 0.1, (-PW / 2 + 0.08, yb + 0.06, 0), seg=8), cyl(0.06, 0.12, (-PW / 2 + 0.08, yb + 0.06, 1.4), seg=8), cyl(0.06, 0.12, (-PW / 2 + 0.08, yb + 0.06, 3.0), seg=8)]), M['metal'])
    add('conduit', tube([(PW / 2 + 0.04, yb - 0.1, 0.1), (PW / 2 + 0.04, yb - 0.1, 3.9), (PW / 2 + 0.04, yt + 2.0, 3.9), (PW / 2 + 0.04, yt + 2.0, 2.95)], 0.025, 6), M['cable'])
    # railings: flights (sloped) and platform (level), neon under the handrail, stickers on posts
    rails, posts, neon, stick = [], [], [], []
    def rail_run(x, a, b):
        a, b = Vector(a), Vector(b); n = max(2, int((b - a).length / 1.3) + 1)
        for k in range(n):
            p = a.lerp(b, k / (n - 1)); posts.append(cyl(0.035, 1.0, (x, p.y, p.z), seg=6))
            if k % 2 == 0: stick.append(box(0.075, 0.06, 0.09, (x, p.y, p.z + R.uniform(0.3, 0.7))))
        rails.append(beam((x, a.y, a.z + 1.0), (x, b.y, b.z + 1.0), 0.06, 0.05))
        rails.append(beam((x, a.y, a.z + 0.5), (x, b.y, b.z + 0.5), 0.03, 0.03))
        neon.append(beam((x, a.y, a.z + 0.955), (x, b.y, b.z + 0.955), 0.03, 0.02))
    for s in (-1, 1):
        x = s * (W / 2 - 0.06)
        rail_run(x, (0, y0 + 0.1, RISE), (0, yl0 - 0.1, zl))
        rail_run(x, (0, yl0, zl), (0, yl1, zl))
        rail_run(x, (0, yl1 + 0.1, zl + RISE), (0, yt - 0.05, zt))
        rail_run(s * (PW / 2 - 0.06), (0, yt + 0.05, zt), (0, yb - 0.05, zt))
    for s in (-1, 1):                                            # front edge of the deck beside the stair opening
        for k in range(2):
            posts.append(cyl(0.035, 1.0, (s * (W / 2 + 0.06 + k * 0.86), yt + 0.05, zt), seg=6))
        rails.append(beam((s * (W / 2 + 0.03), yt + 0.05, zt + 1.0), (s * (PW / 2 - 0.03), yt + 0.05, zt + 1.0), 0.05, 0.06))
        rails.append(beam((s * (W / 2 + 0.03), yt + 0.05, zt + 0.5), (s * (PW / 2 - 0.03), yt + 0.05, zt + 0.5), 0.03, 0.03))
    add('rail_posts', merge(posts), M['metal_d']); add('rails', merge(rails), M['steel']); add('rail_neon', merge(neon), N['cyan'])
    add('rail_stickers', merge(stick), M['sticker_w'])
    # gate arch with the station sign (part), lamps, turnstiles (parts), ticket machine, bench, cables, litter
    ay = yb - 0.35
    add('arch_posts', merge([box(0.25, 0.25, 3.3, (s * 1.95, ay, zt), bevel_w=0.02) for s in (-1, 1)]), M['metal_d'])
    add('arch_beam', box(4.15, 0.3, 0.3, (0, ay, zt + 3.2), bevel_w=0.02), M['metal_d'])
    i0 = len(out)
    add('sign_box', box(3.4, 0.22, 0.75, (0, ay - 0.05, zt + 2.35), bevel_w=0.02), M['plastic'])
    add('sign_face', box(3.25, 0.01, 0.6, (0, ay - 0.165, zt + 2.42)), mat('sign_back', '#14102A', 0.4))
    add('sign_glyphs', merge([glyph(-1.2 + k * 0.6, zt + 2.47, ay - 0.175, 0.42, 0.5, 90 + k, r=0.022) for k in range(5)]), N['violet'])
    add('sign_frame_neon', merge([box(3.3, 0.02, 0.025, (0, ay - 0.17, zt + 2.38 + dz)) for dz in (0, 0.6)]), N['pink'])
    part(out[i0:], 'sign', pivot=(0, ay, zt + 2.35))
    add('sign_hangers', merge([cyl(0.015, 0.1, (s * 1.4, ay, zt + 3.1), seg=4) for s in (-1, 1)]), M['steel'])
    add('arch_lamps', merge([box(0.35, 0.2, 0.08, (s * 1.95, ay - 0.2, zt + 3.25)) for s in (-1, 1)]), N['lamp'])
    for k, tx in enumerate((-1.1, 0.0, 1.1)):
        add(f'turnstile_body{k}', box(0.22, 0.7, 1.0, (tx - 0.42, ay - 0.6, zt), bevel_w=0.03), M['metal'])
        add(f'turnstile_top{k}', box(0.24, 0.72, 0.03, (tx - 0.42, ay - 0.6, zt + 1.0)), M['plastic'])
        add(f'turnstile_arrow{k}', glyph(tx - 0.42, zt + 0.85, ay - 0.955, 0.12, 0.1, 5, r=0.012), N['cyan'] if k != 1 else N['red'])
        i0 = len(out)
        hub = (tx - 0.3, ay - 0.6, zt + 0.85)
        add(f'turnstile_arms{k}', merge([cyl(0.04, 0.06, hub, seg=8, axis='X')] + [beam(hub, (hub[0] + 0.45, hub[1] + 0.25 * math.cos(a), hub[2] + 0.25 * math.sin(a) - 0.0), 0.03, 0.03) for a in (0.3, 2.4, 4.5)]), M['steel'])
        part(out[i0:], f'turnstile_{k + 1}', pivot=hub)
    add('side_gate', box(0.08, 0.06, 1.0, (1.75, ay - 0.6, zt)), M['metal_d'])
    tmx, tmy = -1.75, yt + 0.7
    add('ticket_body', box(0.55, 0.45, 1.65, (tmx, tmy, zt), bevel_w=0.03), mat('ticket', '#2B6FB0', 0.5, 0.3))
    add('ticket_screen', box(0.36, 0.01, 0.26, (tmx + 0.02, tmy - 0.23, zt + 1.2)), N['screen'])
    add('ticket_slot', box(0.18, 0.02, 0.03, (tmx, tmy - 0.23, zt + 0.95)), M['void'])
    add('ticket_tray', box(0.3, 0.08, 0.1, (tmx, tmy - 0.25, zt + 0.55)), M['metal_d'])
    add('ticket_header', box(0.55, 0.02, 0.12, (tmx, tmy - 0.23, zt + 1.5)), N['cyan'])
    add('bench_seat', box(1.2, 0.4, 0.05, (1.5, yt + 1.0, zt + 0.42)), M['steel'])
    add('bench_legs', merge([box(0.05, 0.36, 0.42, (1.5 + s * 0.5, yt + 1.0, zt)) for s in (-1, 1)]), M['metal_d'])
    add('cables', merge([tube(sag((s * 1.95, ay + 0.1, zt + 3.0), (s * (PW / 2 - 0.06), yt + 0.1, zt + 1.0), 0.35, 8), 0.015, 4) for s in (-1, 1)]), M['cable'])
    i0 = len(out)                                                # litter and puddle: own part, so the ground in front of the stairs stays free
    for k in range(5):
        c = cyl(0.033, 0.12, (0, 0, 0), seg=8); bmesh.ops.rotate(c, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'), verts=c.verts)
        at = [(0.7, y0 - 0.6, 0.033), (-0.9, y0 - 1.1, 0.033), (0.5, yl0 + 0.6, zl + 0.033), (0.6, yt + 1.8, zt + 0.033), (-0.4, yt + 0.4, zt + 0.033)][k]
        add(f'litter_can{k}', move(rotz(c, R.uniform(0, 3)), at), [M['sticker_r'], M['steel'], M['paint_tag']][k % 3])
    pz = bmesh.new(); bmesh.ops.create_circle(pz, cap_ends=True, segments=12, radius=0.8)
    for v in pz.verts: v.co.x *= 1.4 + 0.2 * math.sin(v.co.y * 5); v.co.y *= 0.8
    add('puddle', move(pz, (-0.4, y0 - 0.9, 0.006)), mat('wet', '#0B0E12', 0.04, 0.3))
    part(out[i0:], 'litter', pivot=(0, y0, 0))
    walk_surface(merge(walk), coll)
    mark('foot', (0, y0 - 0.7, 0), math.pi, coll)
    mark('landing', (0, (yl0 + yl1) / 2, zl), math.pi, coll)
    mark('top', (0, yt + 0.4, zt), math.pi, coll)
    mark('gate', (0, ay - 1.3, zt), math.pi, coll)
    mark('ticket', (tmx, tmy - 0.7, zt), math.pi, coll)
    mark('bench', (1.5, yt + 0.95, zt + 0.45), 0.0, coll)
    mark('room_door', (dx + 0.8, dy0 + 0.55, 0), math.pi / 2, coll)
    for k, (y, z) in enumerate([(y0 - 0.4, 0), (yl0 + 0.7, zl), (yl1 + 0.2, zl + RISE), (yt + 0.6, zt)]):
        mark(f'path_{k + 1}', (0, y, z), math.pi, coll)
    mark('light_sign', (0, ay - 0.8, zt + 2.4), 0.0, coll)
    mark('light_stairs', (0, yl0, zl + 2.0), 0.0, coll)
    mark('cam_foot', (2.6, y0 - 4.0, 1.4), math.pi + 0.4, coll)
    return out
