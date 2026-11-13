  ground({ color: '#8FA860', flat: 200, hills: 0 });
  // own Blender models (assets/own/src/*.py, full detail, baked AO): the bunker as built, and turned + tinted per material
  asset(world, 'own/bunker', 0, -6);
  asset(world, 'own/bunker', 16, -16, { ry: -0.6, tint: { concrete: '#7C8A6A', turf: '#8A7A4A' } });
  // CC0 pack trees around them for scale
  [[-7, -2, 'nature/commontree_1'], [-9, -7, 'nature/pinetree_2'], [7, -1, 'nature/commontree_autumn_1'], [-12, -12, 'nature/pinetree_1'], [6, -14, 'nature/commontree_2'], [10, -9, 'nature/birchtree_1'], [11, 2, 'nature/commontree_3']]
    .forEach(([x, z, n], i) => asset(world, n, x, z, { ry: i }));
