# Municipal street bin (1.1 m): green steel drum with vertical ribs and bands, domed lid with an opening, ashtray plate, mounted on
# a post with a base plate; a black liner bag shows at the opening. Materials: bin_green, metal_dark, void, plastic.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/trash_bin.py
use('_street.py')
AO = {'strength': 0.55, 'dist': 0.3}

def build(coll):
    M = street_mats(); out = []
    g = mat('bin_green', '#2F6B45', 0.55, 0.4)
    add = lambda n, bm, m: out.append(mesh(n, bm, m, coll))
    add('plate', box(0.36, 0.36, 0.02, bevel_w=0.005), M['metal_d'])
    add('post', box(0.06, 0.06, 1.05, (0, 0.28, 0)), M['metal_d'])
    add('drum', cyl(0.25, 0.72, (0, 0, 0.18), seg=14), g)
    for k in range(14):
        a = 2 * math.pi * k / 14
        add(f'rib{k}', move(rotz(box(0.025, 0.02, 0.66, (0, 0, 0)), a), (0.255 * math.cos(a), 0.255 * math.sin(a), 0.21)), g)
    for z in (0.22, 0.86): add(f'band{z}', cyl(0.265, 0.04, (0, 0, z), seg=14), M['metal_d'])
    add('lid', dome(0.27, (0, 0, 0.9), seg=14, rings=3, h=0.12), g)
    add('opening', box(0.24, 0.02, 0.1, (0, -0.23, 0.9)), M['void'])
    add('bag', box(0.2, 0.02, 0.05, (0, -0.24, 0.88)), M['plastic'])
    add('ashtray', box(0.16, 0.12, 0.02, (0, 0.05, 1.01), bevel_w=0.005), M['metal_d'])
    add('feet', cyl(0.18, 0.18, (0, 0, 0.0), seg=10, r2=0.12), M['metal_d'])
    return out
