  // set 1 (x = 0): the summit pokes 60 m out of a cloud deck, climbers on the ridge, a balloon chair drifts up past it
  const M = mountain(world, 0, 0, { h: 320, r: 420, y: -260, climbers: 2 });
  cloudSea(world, { y: -10, r: 1200 });
  const c1 = balloonChair(world, { at: t => [14, 58 + t * 2.2, 8], ry: -0.6, rider: char('you', { expr: 'happy' }) });
  // set 2 (x = 3000): cruising altitude, an airliner passes, clouds far below
  cloudSea(world, { x: 3000, y: -220, r: 1300 });
  const A = aircraft({ kind: 'airliner', x: 3000, y: 22, z: -60, ry: Math.PI / 2, gear: 'up' }); fly(A, [[2880, 22, -60], [3200, 22, -60]], { t0: 3, speed: 70 }); contrail(A, 3, 6);
  const c2 = balloonChair(world, { at: t => [3000, 0 + (t - 3) * 0.4, 0], ry: 0.4, rider: char('you', { expr: 'scared' }) });
  // set 3 (x = 6000): stratosphere — black sky, curved Earth, the rider's spit boils, balloons burst
  planet(world, 6000, -1240, 0, { kind: 'earth', r: 1100, axis: 0.4 });
  const yu = char('you', { expr: 'scared' }); const c3 = balloonChair(world, { at: t => [6000, 0 + Math.max(0, t - 6) * 0.15, 0], ry: 0.5, rider: yu, pop: [7.6, 8.8] });
  faceFx(yu, 'boil', 6.2, 9);
  track('yu', yu);
