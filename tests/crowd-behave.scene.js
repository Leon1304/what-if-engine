  ground({ color: '#8FA07E', flat: 400, hills: 0 });
  const W = wall(world, [[-8, -2], [8, -2]], { h: 2.6, kind: 'concrete' });
  horde({ n: 170, heroes: 3, from: [0, -11], r: 5, to: [0, 14], t0: -3, t1: 0, speed: [0.9, 1.3], stop: 0, pile: 6, wait: { line: W.line, stop: 0.3, pile: 3, climb: { h: W.h, rate: 0.8 } } });
  // square: people crossing (hesitate, glance, trip, fall over each other), zombies walking past (jackets, rags, blood, lunges)
  horde({ kind: 'human', n: 70, from: [56, 0], r: 6, to: [86, 2], stop: 0, pile: 6, t0: -6, t1: -4, speed: [1.1, 1.5], trips: 0.12, domino: 0.8 });
  horde({ n: 40, heroes: 2, from: [70, -14], r: 4, to: [70, 16], stop: 0, pile: 4, t0: -8, t1: -6, speed: [0.9, 1.2] });
  horde({ n: 120, from: [70, 330], r: 20, to: [70, 300], t0: -4, t1: 0, rise: false });   // far away: simplified far level
