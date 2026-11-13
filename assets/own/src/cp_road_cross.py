# Cyberpunk four-way crossing, exactly 16 × 16 m (x, y = ±8): connects own/cp_street (and own/jlm_road) on all four sides
# (10 m asphalt, 3 m sidewalks, sidewalk top 0.15 m). Wet, glossy asphalt with patches, cracks and oily puddles; a hatched amber
# box junction in the middle; LED zebra crossings (white stripes edged with cyan light lines) and stop lines on every arm; a steaming
# vent grate, two manholes, storm drains; sidewalk corners of composite plates with a rounded kerb whose face carries a cyan LED strip,
# tactile paving at the ramps, sticker-covered signal posts with two signal heads and a pedestrian panel, bollards with light rings, litter.
# Parts (own nodes, each its own obstacle): signal_1…4 (corner posts: 1 = −x−y, 2 = +x−y, 3 = +x+y, 4 = −x+y), bollard_1…8.
# Signal lamps use the materials sig_red (lit), sig_amber, sig_green (dim): switch a phase in a scene with
# asset(…, { tint: { sig_red: '#3A0A0A', sig_green: '#3CFF8A' } }).
# Marks: vent (steam source), lane_s / lane_e / lane_n / lane_w (right-hand lane where traffic enters from that side, facing in),
# cross_s / cross_e / cross_n / cross_w (start of each zebra crossing on the kerb, facing across), light_signal_1…4 (signal glow).
# Materials: asphalt, asphalt_patch, wet, marking, box_junction, zebra, + _cyber.py.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/cp_road_cross.py
use('_cyber.py')
AO = {'strength': 0.5, 'dist': 0.6}

def build(coll):
    M = cyber_mats(); N = neon_mats(); out = []; R = random.Random(21)
    asphalt = mat('asphalt', '#1E2125', 0.35, 0.1); patch = mat('asphalt_patch', '#2A2D31', 0.5, 0.1); wet = mat('wet', '#0B0E12', 0.04, 0.3)
    edge = mat('neon_edge', '#5CF6FF', 0.4, emit='#14C8E0', ei=1.6); amber = mat('box_junction', '#E8B53A', 0.5, emit='#7A5410', ei=1.0)
    zebra = mat('zebra', '#E4E8EE', 0.5, emit='#9FB4C8', ei=0.5); stop = mat('marking', '#D8DCE2', 0.6)
    plate = mat('plate', '#3A3E45', 0.6, 0.2); plate_d = mat('plate_dark', '#25282D', 0.7, 0.2); curb = mat('curb', '#55595F', 0.7)
    tactile = mat('tactile', '#C9A227', 0.6)
    red = mat('sig_red', '#FF3B30', 0.3, emit='#FF2015', ei=3.0); amb = mat('sig_amber', '#5A3C08', 0.3, emit='#3A2604', ei=0.3)
    green = mat('sig_green', '#0C3A1E', 0.3, emit='#0A2A14', ei=0.3)
    add = lambda n, bm, m: (out.append(mesh(n, bm, m, coll)), out[-1])[1]
    S, AW, SW, r = 16.0, 10.0, 3.0, 1.5; h = AW / 2
    # asphalt cross (centre column + two side arms)
    add('asphalt', box(AW + 0.02, S, 0.02), asphalt)
    for s in (-1, 1): add(f'asphalt_arm{s}', box(SW, AW, 0.02, (s * (h + SW / 2), 0, 0)), asphalt)
    for k in range(4):
        add(f'patch{k}', box(R.uniform(0.8, 1.8), R.uniform(0.6, 1.4), 0.006, (R.uniform(-3.5, 3.5), R.uniform(-3.5, 3.5), 0.02), rz=R.uniform(-0.4, 0.4)), patch)
    cracks = []
    for k in range(6):
        x, y = R.uniform(-4, 4), R.uniform(-4.5, 2.5); pts = [(x, y, 0.021)]
        for j in range(5): x += R.uniform(-0.4, 0.4); y += R.uniform(0.2, 0.45); pts.append((x, y, 0.021))
        cracks.append(tube(pts, 0.012, 3))
    add('cracks', merge(cracks), M['void'])
    pud = []
    for k in range(6):
        pz = bmesh.new(); bmesh.ops.create_circle(pz, cap_ends=True, segments=12, radius=R.uniform(0.4, 0.9)); a = R.uniform(0, 3)
        for v in pz.verts: v.co.x *= 1.5 + 0.25 * math.sin(v.co.y * 6 + a); v.co.y *= 0.7 + 0.15 * math.cos(v.co.x * 5)
        rotz(pz, R.uniform(0, 3)); px, py = R.choice([(R.uniform(-4.3, 4.3), R.uniform(-7.3, 7.3)), (R.uniform(-7.3, 7.3), R.uniform(-4.3, 4.3))])
        pud.append(move(pz, (px, py, 0.024)))
    add('puddles', merge(pud), wet)
    add('oil_sheen', merge([move(rotz(box(0.6, 0.3, 0.001), R.uniform(0, 3)), (R.uniform(-3, 3), R.uniform(-3, 3), 0.025)) for _ in range(3)]), mat('oil', '#3B2A55', 0.05, 0.6))
    # box junction: amber border and diagonal hatching clipped to the square
    bj = 3.6; hatch = []
    for s in (-1, 1):
        hatch += [box(2 * bj, 0.15, 0.004, (0, s * bj, 0.02)), box(0.15, 2 * bj, 0.004, (s * bj, 0, 0.02))]
    for d in (1, -1):
        for i in range(-4, 5):
            c = i * 1.6; ln = (2 * bj - abs(c)) * math.sqrt(2) - 0.25
            if ln < 0.4: continue
            hatch.append(box(ln, 0.11, 0.004, (c / 2, -d * c / 2, 0.021), rz=d * math.pi / 4))
    add('box_junction', merge(hatch), amber)
    # vent grate (steam) and manholes
    vx, vy = 2.6, -1.0
    add('vent_frame', box(1.2, 0.8, 0.03, (vx, vy, 0.0), bevel_w=0.01), M['metal_d'])
    add('vent_hole', box(1.05, 0.65, 0.01, (vx, vy, 0.025)), M['void'])
    add('vent_bars', merge([box(0.03, 0.66, 0.025, (vx - 0.5 + i * 0.1, vy, 0.01)) for i in range(11)]), M['steel'])
    for k, (mx, my) in enumerate([(-1.6, 2.2), (-6.4, -1.6)]):
        add(f'manhole{k}', cyl(0.32, 0.012, (mx, my, 0.02), seg=14), M['metal_d'])
        add(f'manhole_rim{k}', torus(0.33, 0.02, (mx, my, 0.03), seg=14, seg2=3, axis='Z'), M['metal_d'])
        add(f'manhole_ribs{k}', merge([box(0.5, 0.025, 0.006, (mx, my + dd, 0.032)) for dd in (-0.15, 0, 0.15)]), M['steel'])
    # every arm (built for the −y arm, turned in 90° steps): LED zebra, cyan edge lines, stop line, lane edge lines, drains
    for arm in range(4):
        a = arm * math.pi / 2; zy = -(h + 1.5)
        pieces = [(f'zebra{arm}', merge([box(0.5, 2.4, 0.004, (-4.2 + k * 1.2, zy, 0.02)) for k in range(8)]), zebra),
                  (f'zebra_led{arm}', merge([box(9.0, 0.05, 0.005, (0, zy + s * 1.3, 0.02)) for s in (-1, 1)]), N['cyan']),
                  (f'stop{arm}', box(4.6, 0.3, 0.004, (2.5, -(S / 2 - 0.35), 0.02)), stop),
                  (f'centre{arm}', box(0.15, 1.2, 0.004, (0, -(S / 2 - 0.6), 0.02)), amber),
                  (f'edge{arm}', merge([box(0.12, 2.4, 0.004, (s * 3.5, -(S / 2 - 1.2), 0.02)) for s in (-1, 1)]), edge),
                  (f'drain{arm}', box(0.45, 0.9, 0.012, (h - 0.25, -(h + 2.2), 0.02)), M['metal_d']),
                  (f'drain_slots{arm}', merge([box(0.3, 0.035, 0.004, (h - 0.25, -(h + 2.2) - 0.35 + i * 0.1, 0.032)) for i in range(8)]), M['void'])]
        for n, bm, m in pieces: rotz(bm, a); add(n, bm, m)
        mark(f'lane_{"senw"[arm]}', tuple((Matrix.Rotation(a, 3, 'Z') @ Vector((1.75, -S / 2, 0.02)))), math.pi + a, coll)
        mark(f'cross_{"senw"[arm]}', tuple((Matrix.Rotation(a, 3, 'Z') @ Vector((-h - 0.4, zy, 0.15)))), math.pi / 2 + a, coll)
    # sidewalk corners: plates, rounded kerb with LED face, tactile ramps, signal post, two bollards
    nb = [0]; ns = [0]
    for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        ring = [(sx * (h + SW), sy * (h + SW)), (sx * (h + SW), sy * h), (sx * (h + r), sy * h)]
        ring += [(sx * (h + r) - sx * r * math.sin(math.pi / 2 * j / 6), sy * (h + r) - sy * r * math.cos(math.pi / 2 * j / 6)) for j in range(1, 6)]
        ring += [(sx * h, sy * (h + r)), (sx * h, sy * (h + SW))]
        if sx * sy < 0: ring.reverse()
        bm = bmesh.new(); vs = [bm.verts.new((x, y, 0.0)) for x, y in ring]; f = bm.faces.new(vs)
        ex = bmesh.ops.extrude_face_region(bm, geom=[f]); bmesh.ops.translate(bm, vec=(0, 0, 0.145), verts=[v for v in ex['geom'] if isinstance(v, bmesh.types.BMVert)])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces); add(f'corner{sx}{sy}', bm, plate)
        cx, cy = sx * (h + r), sy * (h + r)
        for j in range(6):
            a0, a1 = math.pi / 2 * j / 6, math.pi / 2 * (j + 1) / 6; am = (a0 + a1) / 2
            ux, uy = -sx * math.sin(am), -sy * math.cos(am)                       # unit vector from arc centre towards the road
            tang = math.atan2(sy * math.sin(am), -sx * math.cos(am))           # tangent of the arc
            ln = 2 * r * math.sin(math.pi / 24) + 0.04
            add(f'curb_r{sx}{sy}{j}', box(ln, 0.3, 0.17, (cx + ux * (r - 0.15), cy + uy * (r - 0.15), 0), rz=tang), curb)
            add(f'curb_rled{sx}{sy}{j}', box(ln * 1.04, 0.012, 0.025, (cx + ux * (r + 0.003), cy + uy * (r + 0.003), 0.09), rz=tang), N['cyan'])
        for (bx, by, w, d, lx, ly, lw, ld) in [(sx * (h + r + (SW - r) / 2), sy * (h + 0.15), SW - r, 0.3, sx * (h + r + (SW - r) / 2), sy * (h + 0.003), SW - r, 0.012),
                                              (sx * (h + 0.15), sy * (h + r + (SW - r) / 2), 0.3, SW - r, sx * (h + 0.003), sy * (h + r + (SW - r) / 2), 0.012, SW - r)]:
            add(f'curb_s{sx}{sy}{w:.1f}', box(w, d, 0.17, (bx, by, 0), bevel_w=0.03), curb)
            add(f'curb_sled{sx}{sy}{w:.1f}', box(lw, ld, 0.025, (lx, ly, 0.09)), N['cyan'])
        for k, (o, x0) in enumerate([(0.75, h + r), (1.5, h + 0.3), (2.25, h + 0.3)]):   # plate joints (start behind the kerb / the curve)
            add(f'pj_a{sx}{sy}{k}', box(h + SW - x0, 0.02, 0.003, (sx * (x0 + h + SW) / 2, sy * (h + o), 0.145)), plate_d)
            add(f'pj_b{sx}{sy}{k}', box(0.02, h + SW - x0, 0.003, (sx * (h + o), sy * (x0 + h + SW) / 2, 0.145)), plate_d)
        add(f'tactile_a{sx}{sy}', box(0.6, 1.2, 0.006, (sx * (h + 0.6), sy * (h + 2.2), 0.145)), tactile)
        add(f'tactile_b{sx}{sy}', box(1.2, 0.6, 0.006, (sx * (h + 2.2), sy * (h + 0.6), 0.145)), tactile)
        add(f'tactile_ribs{sx}{sy}', merge([box(0.6, 0.03, 0.008, (sx * (h + 0.6), sy * (h + 1.7) + j * 0.15, 0.15)) for j in range(8)]
                                         + [box(0.03, 0.6, 0.008, (sx * (h + 1.7) + j * 0.15, sy * (h + 0.6), 0.15)) for j in range(8)]), tactile)
        dk = R.uniform(0, 0.4)
        add(f'plate_crack{sx}{sy}', tube([(sx * (h + 2.2), sy * (h + 1.8 + dk), 0.15), (sx * (h + 2.5), sy * (h + 2.2 + dk), 0.15), (sx * (h + 2.8), sy * (h + 2.4), 0.15)], 0.01, 3), M['void'])
        # signal post: pole, two heads (one per road), pedestrian panel with a walking glyph, stickers, base plate
        ns[0] += 1; i0 = len(out); px, py = sx * 5.95, sy * 5.95
        add(f'sig_pole{ns[0]}', cyl(0.07, 3.4, (px, py, 0.15), seg=10), M['metal_d'])
        add(f'sig_base{ns[0]}', box(0.4, 0.4, 0.05, (px, py, 0.15), bevel_w=0.01), M['metal'])
        add(f'sig_bolts{ns[0]}', merge([cyl(0.018, 0.03, (px + dx, py + dy, 0.2), seg=6) for dx in (-0.14, 0.14) for dy in (-0.14, 0.14)]), M['steel'])
        add(f'sig_cap{ns[0]}', dome(0.08, (px, py, 3.55), seg=10, rings=2, h=0.05), M['steel'])
        for k, face in enumerate([(0, -sy), (-sx, 0)]):                       # heads face oncoming traffic on each road
            fx, fy = face; hx, hy = px + fx * 0.17, py + fy * 0.17; rz = math.atan2(fx, -fy)
            hb = box(0.3, 0.24, 0.9, (0, 0, 0), bevel_w=0.03); rotz(hb, rz); add(f'sig_head{ns[0]}{k}', move(hb, (hx, hy, 2.4)), M['plastic'])
            for j, (m, zz) in enumerate([(red, 3.1), (amb, 2.85), (green, 2.6)]):
                lb = cyl(0.085, 0.02, (0, 0, 0), seg=10, axis='Y'); rotz(lb, rz); add(f'sig_lamp{ns[0]}{k}{j}', move(lb, (hx + fx * 0.125, hy + fy * 0.125, zz + 0.1)), m)
                vb = box(0.22, 0.12, 0.02, (0, 0, 0)); rotz(vb, rz); add(f'sig_visor{ns[0]}{k}{j}', move(vb, (hx + fx * 0.19, hy + fy * 0.19, zz + 0.2)), M['plastic'])
        ped = box(0.26, 0.12, 0.34, (0, 0, 0), bevel_w=0.02); rz = math.atan2(-sx, sy); rotz(ped, rz); add(f'sig_ped{ns[0]}', move(ped, (px - sx * 0.092, py - sy * 0.092, 1.45)), M['plastic'])
        gl = glyph(0, 1.62, 0, 0.14, 0.2, 7 + ns[0], r=0.012); rotz(gl, rz); add(f'sig_walk{ns[0]}', move(gl, (px - sx * 0.138, py - sy * 0.138, 0)), N['cyan'])
        add(f'sig_button{ns[0]}', move(rotz(box(0.1, 0.06, 0.14, (0, 0, 0)), rz), (px - sx * 0.08, py - sy * 0.08, 1.05)), M['hazard_y'])
        for k, st in enumerate(sticker_set(30 + ns[0], 6, (-0.06, 0.06, 0.5, 1.2), -0.075, size=(0.05, 0.11))):
            if st: add(f'sig_stickers{ns[0]}{k}', move(rotz(st, rz), (px, py, 0)), [M['sticker_y'], M['sticker_w'], M['sticker_r']][k])
        part(out[i0:], f'signal_{ns[0]}', pivot=(px, py, 0.15))
        mark(f'light_signal_{ns[0]}', (px, py, 3.0), 0.0, coll)
        for bx, by in ((sx * (h + 0.55), sy * (h + 2.6)), (sx * (h + 2.6), sy * (h + 0.55))):
            nb[0] += 1
            part([add(f'bollard{nb[0]}', cyl(0.11, 0.85, (bx, by, 0.15), seg=10, bevel_w=0.015), M['metal_d']),
                  add(f'bollard_ring{nb[0]}', cyl(0.115, 0.04, (bx, by, 0.85), seg=10), N['cyan'] if nb[0] % 2 else N['pink']),
                  add(f'bollard_cap{nb[0]}', dome(0.11, (bx, by, 1.0), seg=10, rings=2, h=0.04), M['steel'])], f'bollard_{nb[0]}', pivot=(bx, by, 0.15))
    # litter on asphalt and corners
    for k in range(6):
        c = cyl(0.033, 0.12, (0, 0, 0), seg=8); bmesh.ops.rotate(c, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'), verts=c.verts)
        sx, sy = R.choice((-1, 1)), R.choice((-1, 1))
        at = (sx * R.uniform(h + 1.6, h + 2.7), sy * R.uniform(h + 1.6, h + 2.7), 0.183) if k < 3 else (R.uniform(-4.5, 4.5), R.uniform(-4.5, 4.5), 0.053)
        add(f'litter_can{k}', move(rotz(c, R.uniform(0, 3)), at), [M['sticker_r'], M['steel'], M['paint_tag']][k % 3])
    fl = box(0.21, 0.3, 0.003, (0, 0, 0))
    for v in fl.verts: v.co.z += 0.01 * math.sin(v.co.x * 20)
    add('flyer', move(rotz(fl, 0.8), (-3.1, 4.6, 0.021)), N['violet'])
    add('cup', cyl(0.045, 0.14, (h + 2.2, -(h + 1.9), 0.15), seg=8, r2=0.035), M['sticker_w'])
    add('butts', merge([move(rotz(cyl(0.004, 0.025, (0, 0, 0), seg=4, axis='X'), R.uniform(0, 3)), (6.3 + R.uniform(-0.2, 0.2), 6.8 + R.uniform(-0.2, 0.2), 0.153)) for _ in range(9)]), M['sticker_w'])
    mark('vent', (vx, vy, 0.05), 0.0, coll)
    return out
