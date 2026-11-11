  ground({ color: '#7FA05A', flat: 500, hills: 0 });
  // 1 off a 3 m block: windmills, lands, goes down on its back (stars), gets up
  stat(box(world, 2.4, 3, 2.4, '#9A8A70', 0, 0, -1.2));
  const p1 = figure({ shirt: '#3D7BD9', pants: '#2E3A5C' }); world.add(p1.root); p1.root.position.set(0, 3, -0.3);
  fallDown(p1, 0.9, { to: [0, 1.4], getUp: 4.2 });
  // 2 off a 0.8 m step: knees give, stays on its feet
  stat(box(world, 1.6, 0.8, 1.6, '#8A7A60', 3.4, 0, -0.6));
  const p2 = figure({ shirt: '#E3B23C', pants: '#3B3B3B' }); world.add(p2.root); p2.root.position.set(3.4, 0.8, -0.2);
  fallDown(p2, 1.3, { dist: 1.0 });
  // 3 trapdoor and pit keep the victim lying at the bottom
  const p3 = figure({ shirt: '#D94F3D' }); world.add(p3.root); p3.root.position.set(7, 0, 0); trap(world, 'trapdoor', 7, 0, { t: 1.6, victim: p3, keep: true, depth: 1.2 });
  const p4 = figure({ shirt: '#3DA56A' }); world.add(p4.root); p4.root.position.set(9, 0, 0); trap(world, 'pit', 9, 0, { t: 2.2, victim: p4, keep: true });
  // 4 walking zombie loses a leg and crawls on; another one loses the arm facing the attacker and glances at it
  const z = figure({ kind: 'zombie' }); world.add(z.root); walk(z, [[-4, -6], [-4, 4]], { t0: 0, speed: 0.9, mode: 'shamble' });
  dismember(z, 'leg', 3.6);
  const z2 = figure({ kind: 'zombie' }); world.add(z2.root); z2.root.position.set(-2.2, 0, 0.5);
  dismember(z2, 'arm', 4.0, { from: [-0.5, 1.3, 1] });
  // 5 crowd: pit pile + grenade with sever
  const h = horde({ n: 14, from: [12, -14], r: 2.5, to: [12, 6], t0: 0, t1: 1.2, speed: [1.1, 1.5] });
  h.pit({ at: [12, -2], w: 3, d: 2, t0: 3, depth: 2.6 });
  killNear(h, [12, 1, -8], 6.4, 3, { sever: 2 });
  biome('farm', { density: 0.3, keep: [[2, 0, 8], [12, -2, 6]] });
