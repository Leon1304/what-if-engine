  // v3.42 focus HUD / caption chunks: one figure for the close-up (its torso is the shot's subject), a house for the wide shots
  ground({ color: '#7E9A58', flat: 200, hills: 0 });
  house(world, -5, -7, { w: 5, d: 4, h: 2.9, ry: 0.2 });
  const f = figure({ shirt: '#D98A3D' }); world.add(f.root); f.root.position.set(0, 0, 1.5); track('hero', f);
  tick(t => { pose(f, 'idle', t, t); });
