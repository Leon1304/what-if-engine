# Low-poly deciduous tree, ~3 m: six-sided trunk and three stacked, jittered icospheres (80 tris). Materials: bark, leaf.
# Rebuild: Blender -b --factory-startup --python tools/blender_asset.py -- assets/own/src/tree.py
def build(coll):
    bark, leaf = mat('bark', '#6B4A2E'), mat('leaf', '#4C9A3F')
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=0.18, radius2=0.12, depth=1.2)
    bmesh.ops.translate(bm, vec=(0, 0, 0.6), verts=bm.verts)
    parts = [mesh('trunk', bm, bark, coll)]
    for i, (z, r) in enumerate([(1.5, 0.75), (2.1, 0.6), (2.6, 0.4)]):
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r)
        jitter(bm, 0.12 * r, seed=7 + i, scale_z=0.85)
        bmesh.ops.translate(bm, vec=(0.05 * (i - 1), -0.04 * (i - 1), z), verts=bm.verts)
        parts.append(mesh(f'leaf{i}', bm, leaf, coll))
    return parts
