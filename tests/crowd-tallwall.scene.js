  ground({ color: '#8FA07E', flat: 400, hills: 0 });
  const W = wall(world, [[-10, -2], [10, -2]], { h: 14, kind: 'concrete' });
  horde({ n: 260, heroes: 4, from: [0, -16], r: 7, to: [0, 18], t0: -3, t1: 0, speed: [3.2, 4.2], mode: 'run', rise: false, stop: 2, pile: 4, wait: { line: W.line, climb: { h: W.h, rate: 1.6 } } });
