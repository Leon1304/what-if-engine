  // v3.59 fgWipe: CFG.lively puts a tall thin thing (tree trunk, lamp post …) close to the lens of each sideways-moving close / mid shot, at the frame edge — it slides through soft.
  // tests/run.sh checks DRESSLOG for 'wipe' props and that the subjects stay clear (QA HIDDEN / CAMCLIP in the smoke log stay empty).
  ground({ color: '#5E8A3C', flat: 80, hills: 0 });
  road(world, [[-60, -3], [60, -3]], { w: 6 });
  house(world, -8, -10, { w: 6, d: 5, h: 2.8, wall: '#EDE3D0', roof: '#4A3A30' }); house(world, 6, -10, { w: 6, d: 5, h: 2.8, wall: '#DCCCB4', roof: '#3E3A36' });
  const W = figure({ seed: 4 }); world.add(W.root); W.root.position.set(-7, 0, 0); W.root.rotation.y = Math.PI / 2; walk(W, [[-7, 0], [5, 0]], { t0: -1, speed: 2.2 }); track('walker', W);
  barn(world, 34, -16, { ry: 0.2 });
  const F = figure({ seed: 12, hat: '#D9B65C' }); world.add(F.root); F.root.position.set(30, 0, -10); F.root.rotation.y = 0.6; track('farmer', F);
  field(world, 46, -6, 14, 20, { crop: 'wheat' });
