  // v3.39 dress() + prop library: four sets far apart, each dressed by its own dress() call with an area
  ground({ color: '#7FA052', flat: 900, hills: 0, dress: false });
  // city street (x 0): towers on both sides, kerbs, a walker on the pavement, traffic in one lane
  road(world, [[-60, 0], [60, 0]], { w: 10, curb: true });
  for (const x of [-30, -18, -6, 6, 18, 30]) { tower(world, x, -12, { w: 10, d: 8, h: 14 + (x % 7 + 7) }); tower(world, x, 12, { w: 10, d: 8, h: 12 + (x % 5 + 5), ry: Math.PI }); }
  const CW = figure({ seed: 3 }); world.add(CW.root); CW.root.position.set(-10, 0, -6.5); walk(CW, [[-10, -6.5], [10, -6.5]], { t0: 0, speed: 1.2 }); track('cw', CW);
  const V = vehicle(world, -55, 2, { kind: 'car', ry: Math.PI / 2, color: '#3A7BD5' }); drive(V, [[-55, 2], [55, 2]], { t0: 0, speed: 9 });
  dress('city', { area: [-60, -25, 60, 25] });
  // apron (x 300)
  stat(box(world, 120, 0.04, 120, '#5A5E64', 300, 0, 0, { surf: 'asphalt' }));
  const CR = figure({ seed: 12, shirt: '#E8772E' }); world.add(CR.root); CR.root.position.set(300, 0.04, 0); track('crew', CR);
  dress('apron', { area: [260, -40, 340, 40] });
  // tunnel (x 600): wooden lining, a digger walking toward the lens
  smuggleTunnel(world, 600, 0, { len: 30, w: 1.6, h: 2.0, y: 0, lining: 'wood', bulbs: 2.5 });
  glow(600, 1.7, -8, { intensity: 3, dist: 8, color: '#FFC878', flicker: 0 }); glow(600, 1.7, -20, { intensity: 3, dist: 8, color: '#FFC878', flicker: 0 });
  const TW = figure({ seed: 8, costume: 'prisoner' }); world.add(TW.root); TW.root.position.set(600, 0, -22); walk(TW, [[600, -22], [600, -14]], { t0: 8.5, speed: 0.8 }); track('tw', TW);
  dress('tunnel', { area: [595, -32, 605, 2] });
  // suburb in half-melted snow (x -300): house, garden wall, picket fence, a walker leaving prints
  snowCover(11.5, 1e9, 0.6, { rise: 0.5 });
  house(world, -300, -6, { yard: true, details: true, variant: 'garage', season: 'xmas' }); house(world, -312, -7, { variant: 'dormer', ry: 0.2 });
  wall(world, [[-292, -2], [-292, 8]], { kind: 'brick', h: 1.6, dress: true }); fence(world, [[-310, 6], [-302, 6]], { kind: 'picket' });
  road(world, [[-340, 10], [-260, 10]], { w: 7 });
  const SW = figure({ seed: 15, coat: true }); world.add(SW.root); SW.root.position.set(-306, 0, 3); walk(SW, [[-306, 3], [-296, 4]], { t0: 11.6, speed: 1.1 }); track('sw', SW);
  dress('suburb-winter', { area: [-340, -25, -260, 25] });
