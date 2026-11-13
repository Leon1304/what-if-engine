  ground({ color: '#8FA860', flat: 200, hills: 0 });
  // own Blender models (assets/own/src/*.py): bunker and its high-detail variant (baked AO), trees at natural size, target height, tint per material, from a list
  asset(world, 'own/bunker', 0, -6);
  asset(world, 'own/bunker_hd', 16, -16, { ry: -0.6, tint: { concrete: '#7C8A6A', turf: '#8A7A4A' } });
  asset(world, 'own/tree', -7, -2);
  asset(world, 'own/tree', -9, -7, { h: 5, ry: 1 });
  asset(world, 'own/tree', 7, -1, { ry: 2, tint: { leaf: '#D9822B' } });
  [[-12, -12], [-6, -14], [6, -14], [10, -9]].forEach(([x, z], i) => asset(world, 'own/tree', x, z, { ry: i, scale: 0.8 + 0.1 * i }));
  // next to a CC0 pack tree for scale
  asset(world, 'nature/commontree_1', 11, 2);
