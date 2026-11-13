  ground({ color: '#8FA860', flat: 200, hills: 0 });
  // zombies shambling past the camera, people walking the other way; at x 20 a square of people standing, fleeing from 7 s; a horde with mocap: false next to it
  horde({ n: 14, from: [-1.5, -5], r: 1.5, to: [-1.5, 12], stop: 0, t0: -6, t1: -5, speed: [0.7, 0.9], rise: false });
  horde({ kind: 'human', n: 10, from: [1.5, 7], r: 1.5, to: [1.5, -12], stop: 0, t0: -4, t1: -3, speed: [1.2, 1.5] });
  horde({ kind: 'human', n: 16, from: [20, 0], r: 2.5, to: [20, 0], stop: 0, pile: 3, t0: -3, t1: -2, rise: false, flee: { t: 7, at: [20, -4], speed: 4.5 } });
  horde({ kind: 'human', n: 6, mocap: false, from: [16, -4], r: 1.5, to: [16, -4], stop: 0, pile: 2, t0: -3, t1: -2, rise: false });
