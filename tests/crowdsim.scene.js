  ground({ color: '#8FA07E', flat: 300, hills: 0 });
  house(world, 0, 6, { ry: 0 });
  const line = [[-9, -4], [9, -4]];
  fence(world, line, { kind: 'board' });
  const car = vehicle(world, -3, -9.5, { kind: 'car', ry: 0.4 });
  const man = figure({ shirt: '#3D7BD9' }); world.add(man.root); man.root.position.set(4, 0, -8);
  const h = horde({ n: 140, heroes: 4, from: [0, -17], r: 5, to: [0, 6], around: true, stop: 6.2, pile: 3, t0: -2, t1: 2, speed: [0.9, 1.3], wait: { line, until: 6, stop: 0.4, pile: 2.5 } });
  // square: people standing around, a blast at 13 s, they flee in a wave
  const H2 = horde({ kind: 'human', n: 90, heroes: 3, from: [60, 0], r: 9, to: [60, 0], stop: 0, pile: 9, t0: -3, t1: -2, rise: false, speed: [0.3, 0.5], flee: { t: 13, at: [60, 2], speed: 4.5 } });
  emit('smoke', { at: [60, 0.5, 2], t0: 13, t1: 16, rate: 12, size: 1.2 });
