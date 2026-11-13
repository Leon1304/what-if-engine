  // v3.24 CAPFACE: one figure looking into the lens for the close-ups, two more for the wide shot
  ground({ color: '#7E9A58', flat: 200, hills: 0 });
  house(world, -5, -7, { w: 5, d: 4, h: 2.9, ry: 0.2 });
  const you = char('you', { expr: 'calm', look: 'cam' }); world.add(you.root); track('you', you);
  const a = figure({ shirt: '#D94F3D' }); world.add(a.root); a.root.position.set(3, 0, -2);
  const b = figure({ shirt: '#3D7BD9' }); world.add(b.root); b.root.position.set(-3, 0, -1.5);
