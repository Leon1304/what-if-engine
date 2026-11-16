  ground({ color: '#6F8F4A', flat: 60, hills: 3 });
  backdrop('hills');
  const RL = interior(world, -4, 0, { kind: 'living', w: 8, d: 5, h: 2.8, right: false, door: 'left' });
  const mom = figure({ shirt: '#D8C4A0', pants: '#4A3A32', hairStyle: 'bun' }); world.add(mom.root); mom.root.position.set(-9.25, 0, 1.4); faceTo(mom, [-7, 1.4], -10, 99); track('mom', mom);
  interior(world, 400, 0, { kind: 'living' });   // far beyond the 520 m ground mesh: stands on the ground skirt
  planetSet(world, 3000, 0, 'venus');
  planetSet(world, 5000, 0, 'jupiter');
  const f = figure({ shirt: '#C83A3A' }); world.add(f.root); f.root.position.set(5000, 0, 0); track('faller', f); fallDown(f, 6.1, { from: [5000, 8, 0], to: [5000, -60, 0], land: 'feet' });
  oceanSection(world, -3000, 0, { y: -60, w: 44, h: 36, d: 6 });
