# Traffic light on a kerbside pole (4.6 m): base, pole with banding, vehicle signal head facing -y (the approaching traffic) with
# backplate, three lamps with visors (red, yellow, green, all glowing), a pedestrian head with red/green figures, push-button box,
# a small sign plate and a camera on a short arm. Switch lamps per scene with tint (glow follows): e.g. red on, others off:
# asset(world, 'own/traffic_light', x, z, { ry, tint: { light_yellow: '#2A2A2A', light_green: '#2A2A2A', ped_green: '#2A2A2A' } }).
# Materials: metal_dark, plastic, white, light_red, light_yellow, light_green, ped_red, ped_green, void, metal.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/traffic_light.py
use('_street.py')
AO = {'strength': 0.5, 'dist': 0.4}

def build(coll):
    M = street_mats(); Lm = light_mats(); out = []
    ped_r, ped_g = mat('ped_red', '#FF3B2F', 0.3, emit='#FF2A1A'), mat('ped_green', '#3BFF7A', 0.3, emit='#22F06A')
    add = lambda n, bm, m: out.append(mesh(n, bm, m, coll))
    add('base', cyl(0.16, 0.25, seg=10, bevel_w=0.02), M['metal_d'])
    add('pole', cyl(0.07, 4.2, (0, 0, 0.25), seg=10), M['metal_d'])
    for z in (1.0, 1.25): add(f'band{z}', cyl(0.075, 0.12, (0, 0, z), seg=10), M['white'])
    add('cap', dome(0.08, (0, 0, 4.45), seg=10, rings=3), M['metal_d'])
    # vehicle head
    zh = 3.1
    add('backplate', box(0.62, 0.03, 1.2, (0, -0.06, zh - 0.1), bevel_w=0.01), M['plastic'])
    add('backplate_rim', box(0.66, 0.02, 1.24, (0, -0.045, zh - 0.12)), M['white'])
    add('housing', box(0.34, 0.26, 1.0, (0, -0.2, zh), bevel_w=0.03), M['plastic'])
    for k, (lm, z) in enumerate(((Lm['red'], zh + 0.78), (Lm['yellow'], zh + 0.5), (Lm['green'], zh + 0.22))):
        add(f'lamp_ring{k}', cyl(0.13, 0.02, (0, -0.33, z), seg=12, axis='Y'), M['metal_d'])
        add(f'lamp{k}', cyl(0.115, 0.03, (0, -0.35, z), seg=12, axis='Y'), lm)
        add(f'visor{k}', box(0.28, 0.12, 0.02, (0, -0.4, z + 0.13)), M['plastic'])   # short hood over the top only
        for s in (-1, 1): add(f'visor_side{k}{s}', box(0.02, 0.1, 0.06, (s * 0.14, -0.39, z + 0.07)), M['plastic'])
    add('bracket', box(0.1, 0.16, 0.1, (0, -0.1, zh + 0.45)), M['metal_d'])
    # pedestrian head (lower, facing the crossing to the side, +x)
    ph = 2.1
    add('ped_housing', box(0.24, 0.24, 0.6, (0.17, 0, ph), bevel_w=0.02), M['plastic'])
    add('ped_red', box(0.02, 0.16, 0.18, (0.3, 0, ph + 0.34)), ped_r)
    add('ped_green', box(0.02, 0.16, 0.18, (0.3, 0, ph + 0.08)), ped_g)
    for z in (ph + 0.53, ph + 0.27): add(f'ped_visor{z}', box(0.12, 0.2, 0.02, (0.36, 0, z)), M['plastic'])
    # push-button box, sign plate, camera
    add('button_box', box(0.14, 0.12, 0.28, (0, 0.11, 1.05), bevel_w=0.015), M['metal'])
    add('button', cyl(0.03, 0.02, (0, 0.17, 1.2), seg=8, axis='Y'), M['white'])
    add('sign', box(0.36, 0.02, 0.26, (0, -0.09, 2.55)), M['white'])
    add('sign_mark', box(0.2, 0.01, 0.06, (0, -0.105, 2.65)), M['plastic'])
    add('cam_arm', box(0.04, 0.3, 0.04, (0, -0.15, 4.3)), M['metal_d'])
    add('camera', box(0.1, 0.24, 0.1, (0, -0.35, 4.24), bevel_w=0.015), M['white'])
    return out
