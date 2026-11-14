  ground({ color: '#8FA07E', flat: 300, hills: 0 });
  // v3.26 crowd mix: women (long hair, ponytails, skirts), kids (small, big heads), old people (grey, stooped, slower) between the men — seeded per member
  const h = horde({ kind: 'human', n: 60, mix: { woman: 0.35, kid: 0.15, old: 0.15 }, from: [0, -12], r: 5, to: [0, 10], stop: 0, pile: 5, t0: -6, t1: -4, speed: [1.0, 1.4], trips: 0 });
  // v3.26 hits by position after the simulation: a bomb and a mine pick the members that are really there (the plan paths are metres off once the sim steers them)
  killNear(h, [0, 0, 1], 5, 1.6);
  const z = horde({ n: 30, from: [14, -10], r: 4, to: [14, 8], stop: 0, pile: 4, t0: -5, t1: -3, speed: [0.9, 1.2], mix: { woman: 0.4, old: 0.2 } });
  killNear(z, [14, 0, 2], 7, 1.4);
  // a crowd hit (h.hit) buckles at the knees before it goes down
  h.hit(3, 6.5, { from: [0, 0, 20] });
