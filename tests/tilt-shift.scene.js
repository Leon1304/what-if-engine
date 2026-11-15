  // a small city with people on the pavement: the classic tilt-shift subject
  city({ nx: 3, nz: 3, block: 26, street: 10, hmin: 8, hmax: 26 });
  const f = figure({ shirt: '#E67E22' }); world.add(f.root); f.root.position.set(0, 0, 0); track('hero', f);
  tick(t => { pose(f, 'idle', t, t); });
