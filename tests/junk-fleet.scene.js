  // v3.27: ship('junk') sailing, a second junk bobbing that loses its main mast, dice + game tiles rolled on a crate, shipwreck() with survey grid on the seabed
  water({ waves: 0.45, size: 2400, seg: 160 });
  const A = ship('junk', 0, -30, { ry: 0 }); sail(A, [[0, -30], [0, 40]], { t0: 0, speed: 3, len: A.len }); track('junk', A.g, 6);
  const B = ship('junk', -60, 0, { ry: 0.6 }); bob(B.g, { size: B.len * 0.5, depth: 0.3 }); dismast(B, 3.2, { i: 1, side: 1 });
  // deck close-up on a bobbing raft-sized platform: crate, dice and tiles
  const deck = stat(grp(world, 0, 0, 0)); box(deck, 6, 5.2, 6, '#5E3E26', 0, 0, 0); box(deck, 1.4, 0.7, 1.0, '#7A5A36', 0, 5.2, 2, { surf: 'plank' });
  const D = dice(world, 0, 5.9, 2.2, { n: 3, tiles: 6, size: 0.06 }); D.dice.forEach((d, i) => toss(d, 5.3 + i * 0.12, { from: [d.position.x, d.position.y, d.position.z], to: [-0.15 + i * 0.18, 5.9, 2.1 + i * 0.05], h: 0.25, bounces: 2, spin: 6 }));
  // seabed far away: wreck + diver
  const W = shipwreck(world, 1500, 0, { len: 15, ry: 0.4, y: -9 }); stat(box(world, 60, 1, 60, '#C8B78A', 1500, -10, 0));
  const dv = diver({ look: 'cam' }); dv.root.position.set(1501, -7.6, 2); world.add(dv.root);
