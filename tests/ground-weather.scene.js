  // v2.35: weather on the ground and street detail — rain wets roads and grass (puddles mirror the sky), snow settles on roofs, roads and ground,
  // roads with asphalt, shoulders, curbs, drains and manholes, a river with reeds and lily pads, the detailed gas station
  ground({ color: '#5C7A3C', flat: 34, hills: 6 });
  house(world, -6.5, 5, { w: 5.2, d: 4, h: 2.9, ry: 0.22 }); barn(world, -9, -9, { ry: 0.08 });
  road(world, [[-30, -1.5], [30, -1.5]], { w: 5 }); road(world, [[6, -30], [6, -4]], { w: 5, curb: true, manholes: true });
  river(world, [[-30, 12], [-10, 10], [4, 11.5], [16, 9], [34, 12]], { w: 4 });
  gasstation(world, 20, -12, { ry: -Math.PI / 2 });
  leafLitter([[-2, 3, 1.6], [3, 4, 1.2]]);
  const f = figure({}); world.add(f.root); f.root.position.set(0.5, 0, 1);
  emit('rain', { at: [0, 0, 0], t0: 0.5, t1: 4.5 });
  emit('snow', { at: [0, 18, 0], t0: 5, t1: 9, rate: 260 });
  snowCover(5, 9, 1, { rise: 3 });
  biome('farm');
