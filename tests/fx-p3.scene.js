  // p3 FX: lava lake (shader crust, pure burn), portal vortex, UFO beam bands, re-entry plasma, explosion fire core, chunks / shards / sparks / steam, x-ray on a hidden figure
  ground({ color: '#6E7A52', flat: 400 });
  const L = lavaLake(world, 0, 0, { r: 8, rim: 3 });
  for (let i = 0; i < 3; i++) L.burn(trashBag(world, 0, -20, 0, { size: 1.2, ry: i, kind: i === 2 ? 'box' : 'bag' }), 0.3 + i * 0.5, { from: [-3 + i * 3, 6, 11], h: 3 });
  L.fountain(1.3, 2, -2, { size: 1 });
  portal(world, 40, 0, 0, { r: 1.6, open: [2.2, 99] });
  spaceship(world, { kind: 'ufo', x: 80, y: 9, z: 0, beam: { t0: 3.8, t1: 99, len: 9 } });
  const S = grp(world, 90, 70, -120); box(S, 6, 1.2, 1.2, '#C8CCD2', 0, 0, 0); for (const sx of [-1, 1]) box(S, 0.1, 4, 7, '#3A4A6A', sx * 3.6, 0, 0); dyn(S);
  reentry(S, [[90, 70, -120], [125, 55, -110], [170, 30, -100]], { t0: 5.2, t1: 8.4, breakAt: 7.2, pieces: 5, size: 5, ease: false });
  explode(160, 0.3, 0, 8.1, { size: 0.8 });
  emit('debris', { at: [154, 1, 3], t0: 8.2, burst: 30, speed: 4 });
  const pane = dyn(grp(world, 156, 0, 4)); box(pane, 0.06, 1.6, 1.2, '#2A2D33', 0, 0.8, 0); box(pane, 0.03, 1.2, 1.0, '', 0.0, 1.05, 0, { mat: mat('#BFE6F5', { opacity: 0.4, rough: 0.05 }) });
  shatter(pane, 8.3, { power: 3 });
  grindSparks([158, 0.9, 4.5], 8.0, 10);
  emit('steam', { at: [163, 1.1, 4], t0: 7.5, rate: 8 });
  const ghost = human({ sex: 'm', shirt: '#3E8E4E' }); world.add(ghost.root); ghost.root.position.set(164, 0, 9); ghost.root.visible = false;   // hidden figure: its x-ray path must not show
  xray(ghost, { t0: 8, t1: 10, path: 'blood' });
