  // v3.5 look QA: a normal set (figure, house), a wall to put the lens into, a second figure for the bad close-up
  ground({ color: '#5C7A3C', flat: 300, hills: 0 });
  house(world, -4, -4, { w: 5, d: 4, h: 2.9, ry: 0.2 });
  const f = figure({ shirt: '#3D7BD9' }); world.add(f.root); f.root.position.set(0, 0, 0);
  box(world, 4, 3, 0.4, '#C8B8A0', 10, 0, 2, { surf: 'plaster' });
  const g = figure({ shirt: '#D94F3D' }); world.add(g.root); g.root.position.set(20, 0, 0);
