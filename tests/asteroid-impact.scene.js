  ground({ color: '#8E8A7E', flat: 400 });
  const C = city({ nx: 3, nz: 3, block: 22, street: 9, at: [0, -10], hmin: 10, hmax: 34, backdrop: false });
  // v3.37 suburb + beach next to the city (the front squashes the houses in reach)
  const SB = suburb({ at: [95, -10], nx: 3, rows: 1, seed: 4 });
  beachLife({ x: [-40, 40], z: [40, 50], n: 16, towers: [[0, 45]] });
  const I = asteroidImpact({ at: [0, -75], t1: 3.4, t0: 0, size: 6, radius: 110, speed: 45, dist: 500, breaks: [...C.towers, ...SB.houses] });
  track('rock', I.rock);
