  ground({ color: '#9AAE78', flat: 200, hills: 0 });
  box(world, 1.2, 0.8, 0.8, '#8C6A44', -2.4, 0, -1.5); box(world, 0.6, 1.4, 0.6, '#5E7A9C', 2.6, 0, -2);
  // the moonwalker: faces −x and slides towards +x at 1.6 m/s from 1 s to 4.5 s → QA: BACKWARD (waived in QA_OK; f.back = true would silence it in the engine)
  const f = figure({ build: 'man', shirt: '#D94F3D', hairStyle: 'short', seed: 2 }); world.add(f.root);
  tick(t => { const k = Math.min(Math.max(t - 1, 0), 3.5); f.root.position.set(-2.8 + k * 1.6, 0, 0.6); f.root.rotation.y = -Math.PI / 2; });
