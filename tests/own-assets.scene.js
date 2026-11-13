  ground({ color: '#8FA860', flat: 200, hills: 0 });
  // own Blender tree: natural size, scaled to a target height, autumn tint per material, and a row built from a list
  asset(world, 'own/tree', 0, 0);
  asset(world, 'own/tree', -4, -2, { h: 5, ry: 1 });
  asset(world, 'own/tree', 4, -1, { ry: 2, tint: { leaf: '#D9822B' } });
  [[-8, -6], [-3, -8], [3, -7], [8, -6]].forEach(([x, z], i) => asset(world, 'own/tree', x, z, { ry: i, scale: 0.8 + 0.1 * i }));
  // next to a CC0 pack tree for scale
  asset(world, 'nature/commontree_1', 8, 1);
