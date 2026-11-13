# Cyberpunk street-food stall (ramen bar), about 4.0 × 3.3 × 3.4 m, counter faces -y (three.js +z): steel frame with corner posts,
# wooden counter with a steel top, drip edge and dented kick panel, four bar stools with torn cushions, noren curtain strips with
# made-up glyphs hanging from the roof edge, red paper lanterns (glow), corrugated roof sloping forward with a gutter and a pink
# neon glyph sign on top, a glowing menu screen, kitchen behind the counter: two big stock pots and a wok on a burner range with
# blue flames, a ladle rack, bowls, a cutting board with a cleaver, bottle shelf, extractor hood with a duct, a side tarp, a generator
# box with a cable to the roof, gas bottle, crates, trash bags, cans and a puddle. Steam comes from the engine (smoke()/steam particles).
# Parts (own nodes, so they are separate obstacles): stool_1…4, roof (roof, sign, lanterns, curtains: above head height), downpipe, litter.
# Marks: seat_1…seat_4 (stools, facing the counter), cook (behind the counter, facing the customers), light_lanterns, light_sign,
# light_kitchen, cam_counter. Materials: wood, wood_dark, cloth, cloth_dark, lantern, flame_blue, pot, broth, roof + _cyber.py.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/cp_ramen_stall.py
use('_cyber.py')
AO = {'strength': 0.6, 'dist': 0.6}

def build(coll):
    M = cyber_mats(); N = neon_mats(); out = []
    wood = mat('wood', '#7A5235', 0.8); wood_d = mat('wood_dark', '#4A3020', 0.85)
    cloth = mat('cloth', '#1F2C4A', 0.95); cloth_d = mat('cloth_dark', '#141B2E', 0.95)
    lantern = mat('lantern', '#FF5A3A', 0.6, emit='#FF3A1A', ei=2.5); flame = mat('flame_blue', '#6FB8FF', 0.4, emit='#3A8CFF', ei=3.0)
    pot = mat('pot', '#A8ADB2', 0.3, 0.85); broth = mat('broth', '#C88A3E', 0.4); roof = mat('roof', '#4C5257', 0.6, 0.5)
    cushion = mat('cushion', '#8E1E2A', 0.7); bowl = mat('bowl', '#E9E4DA', 0.5); bag = mat('trash_bag', '#151618', 0.4)
    add = lambda n, bm, m: (out.append(mesh(n, bm, m, coll)), out[-1])[1]
    R = random.Random(3)
    W, D, H = 3.6, 2.2, 2.55          # frame
    yf, yb = -D / 2, D / 2            # front and back of the frame
    # floor plinth and frame
    add('plinth', box(W + 0.1, D + 0.1, 0.12, (0, 0, 0), bevel_w=0.02), M['concrete_d'])
    for x in (-W / 2, W / 2):
        for y in (yf, yb): add(f'post{x}{y}', box(0.09, 0.09, H + (0.25 if y == yf else 0), (x, y, 0.12)), M['metal_d'])
    add('back_wall', recess(box(W, 0.05, H, (0, yb, 0.12)), (0, -1, 0), 0.1, 0.02), M['metal'])
    add('back_panels', merge([box(0.03, 0.01, H - 0.2, (-W / 2 + 0.6 * i, yb - 0.03, 0.2)) for i in range(1, 6)]), M['metal_d'])
    # counter (customer side) with steel top and kick panel
    cy = yf + 0.35
    add('counter', box(W - 0.1, 0.55, 1.0, (0, cy, 0.12), bevel_w=0.015), wood)
    for i in range(9): add(f'counter_slat{i}', box(0.02, 0.01, 0.82, (-W / 2 + 0.25 + i * 0.39, cy - 0.28, 0.2)), wood_d)
    add('counter_top', box(W, 0.7, 0.05, (0, cy - 0.05, 1.12), bevel_w=0.012), M['steel'])
    add('drip_edge', box(W, 0.03, 0.06, (0, cy - 0.4, 1.08)), M['metal_d'])
    kick = box(W - 0.1, 0.02, 0.16, (0, cy - 0.285, 0.12))
    for v in kick.verts:
        if v.co.y < cy - 0.29 and abs(v.co.x - 0.6) < 0.25: v.co.y += 0.012
    add('kick_panel', kick, M['metal'])
    add('rust_kick', merge([box(R.uniform(0.1, 0.3), 0.004, R.uniform(0.03, 0.1), (R.uniform(-1.6, 1.6), cy - 0.297, 0.12)) for _ in range(5)]), M['rust'])
    # bowls, chopsticks and condiments on the counter
    for i, x in enumerate((-1.2, -0.4, 0.4, 1.2)):
        if i != 2:
            add(f'bowl{i}', cyl(0.11, 0.08, (x, cy - 0.2, 1.17), seg=10, r2=0.13), bowl)
            add(f'soup{i}', cyl(0.115, 0.005, (x, cy - 0.2, 1.235), seg=10), broth)
            add(f'sticks{i}', merge([rod((x + 0.05 + d, cy - 0.32, 1.25), (x + 0.12 + d, cy - 0.05, 1.3), 0.004, 3) for d in (0, 0.015)]), wood_d)
        add(f'sauce{i}', cyl(0.025, 0.12, (x + 0.25, cy - 0.05, 1.17), seg=6), M['sticker_r'] if i % 2 else M['plastic'])
    add('napkins', box(0.14, 0.1, 0.1, (1.65, cy + 0.05, 1.17)), M['sticker_w'])
    # stools
    for i, x in enumerate((-1.35, -0.45, 0.45, 1.35)):
        sy = yf - 0.45; tilt = R.uniform(-0.08, 0.08); s0 = len(out)
        add(f'stool_leg{i}', cyl(0.035, 0.68, (x, sy, 0.0), seg=8), M['steel'])
        add(f'stool_foot{i}', cyl(0.18, 0.03, (x, sy, 0.0), seg=10, r2=0.15), M['metal_d'])
        add(f'stool_ring{i}', torus(0.13, 0.012, (x, sy, 0.3), seg=10, seg2=4, axis='Z'), M['steel'])
        c = cyl(0.19, 0.08, (0, 0, 0), seg=12, bevel_w=0.02); rotz(c, tilt * 10); move(c, (x, sy, 0.68))
        add(f'stool_seat{i}', c, cushion)
        if i == 1: add('seat_tear', box(0.12, 0.08, 0.005, (x + 0.04, sy, 0.762)), mat('foam', '#D8C88E', 0.95))
        part(out[s0:], f'stool_{i + 1}', pivot=(x, sy, 0.0))
        mark(f'seat_{i + 1}', (x, sy, 0.76), math.pi, coll)
    # roof: corrugated sheet sloping forward, gutter, beams
    rt, rf = H + 0.12 + 0.12, H + 0.12 + 0.3        # back and front height of the roof
    r0 = len(out)
    sheet = bmesh.new(); nx = 36; cols = []
    for i in range(nx + 1):
        x = -W / 2 - 0.3 + (W + 0.6) * i / nx; z = 0.04 * (i % 2)
        cols.append((sheet.verts.new((x, yb + 0.15, rt + z)), sheet.verts.new((x, yf - 0.55, rf + z))))
    for a, b in zip(cols, cols[1:]): sheet.faces.new((a[0], b[0], b[1], a[1]))
    bmesh.ops.solidify(sheet, geom=sheet.faces[:], thickness=0.015)
    add('roof_sheet', sheet, roof)
    add('roof_rust', merge([box(R.uniform(0.2, 0.6), R.uniform(0.2, 0.5), 0.01, (R.uniform(-1.8, 1.8), R.uniform(-1.3, 1.0), 0)) for _ in range(4)]), M['rust'])
    for v in out[-1].data.vertices: v.co.z += rt + (rf - rt) * (yb + 0.15 - v.co.y) / (yb + 0.15 - yf + 0.55) + 0.05
    for y in (yf, yb): add(f'beam{y}', box(W + 0.1, 0.08, 0.1, (0, y, (rf if y == yf else rt) - 0.1)), M['metal_d'])
    add('gutter', cyl(0.05, W + 0.6, (-W / 2 - 0.3, yf - 0.58, rf - 0.04), seg=8, axis='X'), M['metal'])
    part(add('downpipe', cyl(0.035, rf, (W / 2 + 0.28, yf - 0.58, 0), seg=8), M['metal']), 'downpipe', pivot=(W / 2 + 0.28, yf - 0.58, 0))
    # noren curtain strips with glyphs
    for i in range(6):
        x = -W / 2 + 0.35 + i * 0.58
        n = box(0.5, 0.01, 0.55, (x, yf - 0.05, rf - 0.75)); R2 = random.Random(i)
        for v in n.verts:
            if v.co.z < rf - 0.5: v.co.y += R2.uniform(-0.03, 0.03); v.co.x += 0.02 * R2.uniform(-1, 1)
        add(f'noren{i}', n, cloth if i % 2 else cloth_d)
        add(f'noren_glyph{i}', glyph(x, rf - 0.62, yf - 0.06, 0.28, 0.3, 80 + i, r=0.012), M['sticker_w'])
    add('noren_rod', cyl(0.015, W + 0.1, (-W / 2 - 0.05, yf - 0.05, rf - 0.18), seg=6, axis='X'), wood_d)
    # lanterns on a wire under the roof edge
    wire = sag((-W / 2 - 0.2, yf - 0.4, rf - 0.12), (W / 2 + 0.2, yf - 0.4, rf - 0.12), 0.18, 10)
    add('lantern_wire', tube(wire, 0.006, 4), M['cable'])
    for i, p in enumerate(wire[1:-1:2]):
        add(f'lantern{i}', cyl(0.13, 0.32, (p.x, p.y, p.z - 0.42), seg=10, r2=0.13), lantern)
        add(f'lantern_cap{i}', merge([cyl(0.08, 0.04, (p.x, p.y, p.z - 0.46), seg=8), cyl(0.08, 0.04, (p.x, p.y, p.z - 0.1), seg=8)]), M['plastic'])
        add(f'lantern_cord{i}', rod((p.x, p.y, p.z - 0.1), p, 0.004, 3), M['cable'])
    # neon sign on the roof
    sx, sz = 0.0, rf + 0.08
    add('sign_frame', box(2.6, 0.12, 0.85, (sx, yf - 0.3, sz), bevel_w=0.02), M['metal_d'])
    add('sign_back', box(2.5, 0.01, 0.75, (sx, yf - 0.365, sz + 0.05)), mat('sign_back', '#22091A', 0.6))
    add('sign_glyphs', merge([glyph(-0.84 + 0.56 * i, sz + 0.12, yf - 0.375, 0.42, 0.6, 20 + i, r=0.022) for i in range(4)]), N['pink'])
    add('sign_border', tube([(-1.22, yf - 0.375, sz + 0.06), (1.22, yf - 0.375, sz + 0.06), (1.22, yf - 0.375, sz + 0.82), (-1.22, yf - 0.375, sz + 0.82), (-1.22, yf - 0.375, sz + 0.06)], 0.012, 4), N['cyan'])
    add('sign_struts', merge([rod((x, yf - 0.25, sz + 0.3), (x, yf + 0.5, rf - 0.03), 0.02, 5) for x in (-1.0, 1.0)]), M['metal_d'])
    add('sign_dead_tube', rod((0.7, yf - 0.376, sz + 0.68), (1.0, yf - 0.376, sz + 0.72), 0.012, 4), mat('neon_dead', '#5A4A55', 0.4))   # one tube burnt out
    part([o for o in out[r0:] if not o.get('_part')], 'roof', pivot=(0, yb, rt))
    # menu screen on the left post
    add('menu', box(0.6, 0.05, 0.9, (-W / 2 + 0.45, yb - 0.08, 1.45), bevel_w=0.01), M['plastic'])
    add('menu_screen', box(0.52, 0.01, 0.8, (-W / 2 + 0.45, yb - 0.11, 1.5)), N['screen'])
    add('menu_rows', merge([box(0.38 - 0.06 * (i % 3), 0.005, 0.03, (-W / 2 + 0.42, yb - 0.118, 1.6 + i * 0.12)) for i in range(5)]), M['sticker_w'])
    # kitchen: range, pots, wok, hood
    ky = yb - 0.4
    add('range', box(2.0, 0.6, 0.9, (0.5, ky, 0.12), bevel_w=0.015), M['steel'])
    add('range_front', merge([box(0.08, 0.01, 0.08, (-0.3 + 0.25 * i, ky - 0.305, 0.75)) for i in range(5)]), M['plastic'])
    for i, (x, r, h) in enumerate(((-0.1, 0.27, 0.45), (0.55, 0.24, 0.38))):
        add(f'flame{i}', torus(r * 0.6, 0.02, (x, ky, 1.04), seg=10, seg2=3, axis='Z'), flame)
        add(f'pot{i}', cyl(r, h, (x, ky, 1.05), seg=14), pot)
        add(f'pot_rim{i}', torus(r, 0.015, (x, ky, 1.05 + h), seg=14, seg2=4, axis='Z'), pot)
        add(f'broth{i}', cyl(r - 0.02, 0.01, (x, ky, 1.0 + h), seg=14), broth)
        add(f'pot_handles{i}', merge([torus(0.05, 0.01, (x + s * (r + 0.03), ky, 1.0 + h), seg=6, seg2=3, axis='Y') for s in (-1, 1)]), M['metal_d'])
    wok = dome(0.24, (0, 0, 0), seg=12, rings=3, h=0.12); bmesh.ops.scale(wok, vec=(1, 1, -1), verts=wok.verts)
    bmesh.ops.reverse_faces(wok, faces=wok.faces); add('wok', move(wok, (1.2, ky, 1.2)), M['metal_d'])
    add('wok_handle', rod((1.44, ky, 1.15), (1.75, ky - 0.1, 1.2), 0.015, 5), wood_d)
    add('flame2', torus(0.14, 0.02, (1.2, ky, 1.04), seg=10, seg2=3, axis='Z'), flame)
    add('hood', box(2.2, 0.7, 0.35, (0.5, ky + 0.05, 2.1), bevel_w=0.02), M['steel'])
    add('hood_void', box(2.0, 0.6, 0.01, (0.5, ky + 0.05, 2.095)), M['void'])
    add('duct', merge([cyl(0.12, 0.6, (1.3, ky + 0.15, 2.45), seg=10), rod((1.3, ky + 0.15, 3.0), (1.3, yb + 0.35, 3.0), 0.12, 10)]), M['metal'])
    add('ladle_rack', box(1.6, 0.03, 0.04, (0.5, yb - 0.06, 1.75)), M['steel'])
    for i in range(5): add(f'ladle{i}', merge([rod((-0.2 + 0.35 * i, yb - 0.08, 1.75), (-0.2 + 0.35 * i, yb - 0.08, 1.35), 0.008, 4), dome(0.05, (-0.2 + 0.35 * i, yb - 0.08, 1.3), seg=8, rings=2)]), M['steel'])
    add('board', box(0.5, 0.32, 0.03, (-0.95, ky, 1.02), bevel_w=0.005), wood)
    add('cleaver', merge([box(0.18, 0.005, 0.09, (-0.9, ky - 0.02, 1.05)), box(0.1, 0.02, 0.025, (-0.76, ky - 0.02, 1.08))]), M['steel'])
    add('worktop', box(1.0, 0.6, 0.9, (-1.25, ky, 0.12), bevel_w=0.015), M['steel'])
    add('shelf', box(1.0, 0.25, 0.03, (-1.25, yb - 0.15, 1.9)), wood_d)
    for i in range(6): add(f'bottle{i}', cyl(0.035, 0.26, (-1.65 + i * 0.16, yb - 0.15, 1.93), seg=6, r2=0.015), [M['sticker_r'], M['glass'], M['paint_tag']][i % 3])
    add('light_tube', rod((-W / 2 + 0.2, yb - 0.3, H + 0.02), (W / 2 - 0.2, yb - 0.3, H + 0.02), 0.02, 6), N['lamp'])
    # side tarp, generator, cable to the roof, clutter
    tarp = box(0.01, D, 1.8, (W / 2 + 0.05, 0, 0.6))
    for v in tarp.verts: v.co.x += 0.04 * math.sin(v.co.y * 5) if v.co.z < 1.0 else 0
    add('tarp', tarp, mat('tarp', '#2F5A60', 0.95))
    add('generator', box(0.7, 0.5, 0.55, (W / 2 + 0.55, 0.3, 0), bevel_w=0.03), M['hazard_y'])
    add('gen_grille', box(0.01, 0.35, 0.3, (W / 2 + 0.195, 0.3, 0.12)), M['void'])
    add('gen_stripes', merge([box(0.705, 0.04, 0.05, (W / 2 + 0.55, 0.3 + s * 0.2, 0.42)) for s in (-1, 1)]), M['hazard_k'])
    add('gen_cable', tube([Vector((W / 2 + 0.5, 0.55, 0.5)), Vector((W / 2 + 0.5, 0.9, 0.05)), Vector((W / 2 + 0.2, yb + 0.15, 0.05)), Vector((W / 2 + 0.06, yb + 0.15, rt))], 0.015, 5), M['cable'])
    add('gas_bottle', merge([cyl(0.15, 0.85, (-W / 2 - 0.35, 0.6, 0), seg=10, bevel_w=0.02), cyl(0.04, 0.1, (-W / 2 - 0.35, 0.6, 0.85), seg=6)]), M['sticker_r'])
    add('crates', merge([box(0.55, 0.4, 0.3, (-W / 2 - 0.4, -0.2, 0), bevel_w=0.01), box(0.55, 0.4, 0.3, (-W / 2 - 0.38, -0.18, 0.3), bevel_w=0.01, rz=0.12)]), M['sticker_y'])
    for i in range(3):
        b = dome(0.28, (0, 0, 0), seg=10, rings=4, h=0.42); jitter(b, 0.04, 30 + i)
        add(f'trash_bag{i}', move(b, (W / 2 + 0.3 + 0.35 * i, yb + 0.35, 0)), bag)
    l0 = len(out)
    for i in range(3): add(f'can{i}', cyl(0.033, 0.12, (R.uniform(-1.5, 1.5), yf - R.uniform(0.9, 1.3), 0), seg=8), M['steel'])
    pz = bmesh.new(); bmesh.ops.create_circle(pz, cap_ends=True, segments=12, radius=0.5)
    for v in pz.verts: v.co.x *= 1.6 + 0.2 * math.sin(v.co.y * 7); v.co.y *= 0.6
    add('puddle', move(pz, (0.9, yf - 1.1, 0.004)), mat('water', '#0E141A', 0.05, 0.2))
    part(out[l0:], 'litter', pivot=(0, yf - 1.1, 0))
    mark('cook', (0.2, ky - 0.6, 0.12), 0.0, coll)
    mark('light_lanterns', (0, yf - 0.5, rf - 0.6), 0.0, coll)
    mark('light_sign', (0, yf - 0.9, rf + 0.5), 0.0, coll)
    mark('light_kitchen', (0.3, ky - 0.3, 1.9), 0.0, coll)
    mark('cam_counter', (1.8, yf - 1.6, 1.4), 0.6, coll)
    return out
