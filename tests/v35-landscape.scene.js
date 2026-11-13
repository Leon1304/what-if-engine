  // v3.5 landscape: bare ground() without biome → dressed by itself (hills backdrop, sparse ring trees, tufts, pebbles, flowers);
  // tree rows that must not repeat, wheat / corn / cabbage fields, and a skyline layer (windows lit at dusk, blinking beacons)
  ground({ color: '#5E7C3B', flat: 40, hills: 6 });
  for (let i = 0; i < 9; i++) tree(world, -15 + i * 3.6, -9, { kind: i % 4 === 3 ? 'birch' : 'round', size: 1 });   // one row, same size: variety from the position only
  for (let i = 0; i < 5; i++) tree(world, 16, -5 + i * 3.8, { kind: 'round', color: '#4C7A3A', size: 1.1 });
  field(world, -9, 7, 12, 8, { crop: 'wheat' }); field(world, 6, 7, 9, 8, { crop: 'corn' }); field(world, -1, 17, 10, 5, { crop: 'cabbage' });
  barn(world, -20, 4, { ry: 0.5 });
  const f = figure({}); world.add(f.root); f.root.position.set(0, 0, -1);
  backdrop('skyline', { also: true, r0: 200, sector: [140, 220] });   // extra layer: a city on the horizon behind the farm (−z)
