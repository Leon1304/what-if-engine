  ground({ color: '#7FA05A', flat: 120, hills: 0 });
  const R = interior(world, 0, 0, { kind: 'tudor' });
  const S = closeStool(world, 2.6, -2.6, { ry: 0.2, open: [[1.0, 2.6], [3.6, 8.5]] });
  const F = foldScreen(world, 4.0, -2.0, { ry: 0.5 });
  const C = coffer(world, -2.5, 1.6, { open: 5 });
  const T = R.at('table'); courtProp(world, 'ewer', T[0] - 0.35, T[1], T[2]); courtProp(world, 'basin', T[0] + 0.1, T[1], T[2]); courtProp(world, 'towel', T[0] + 0.45, T[1], T[2] + 0.05);
  courtProp(world, 'ledger', T[0] - 0.05, T[1], T[2] + 0.14, { ry: 0.3 }); courtProp(world, 'quill', T[0] + 0.3, T[1], T[2] - 0.15); courtProp(world, 'goblet', T[0] - 0.55, T[1], T[2] - 0.1);
  const y = char('you', { outfit: 'courtier' }); world.add(y.root); y.root.position.set(1.6, 0, -1.4); y.root.rotation.y = 0.4;
  const k = figure({ costume: 'tudorKing', seed: 5, expr: 'smug' }); world.add(k.root); k.root.position.set(-0.4, 0, -0.6); k.root.rotation.y = 0.2;
  const P = interior(world, 40, 0, { kind: 'tudor', bed: false, w: 10, d: 7 });
  for (let i = 0; i < 3; i++) { const c = figure({ costume: 'courtier', seed: 11 + i, shirt: ['#2A4A3A', '#6A1E2A', '#2A3A5A'][i] }); world.add(c.root); c.root.position.set(38.6 + i * 1.2, 0, 0.8); c.root.rotation.y = Math.PI * 0.9; }
  const k2 = figure({ costume: 'tudorKing', seed: 6 }); world.add(k2.root); sit(k2, -1, { seat: P.seat('stateChair') });
