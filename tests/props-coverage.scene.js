  // coverage for props used in videos that had no test scene: street furniture (busstop, trashcan, hydrant, planter), hedgehog, aedBox (door opens),
  // tripodCam (flash), grindSparks on a steel plate · pool villa with airbed (deflates) and divingBoard, portal (opens) · planetSet('mars') far away at x 2000
  ground({ color: '#7FA05A', flat: 300, hills: 0, dress: false });
  busstop(world, 0, -2.5, 0); trashcan(world, 2.2, -1.4); hydrant(world, -2.2, -1.2); planter(world, 3.9, -2.2, 0); hedgehog(world, -4.6, -1.8, { ry: 0.4 });
  tripodCam(world, -1.4, 2.6, { ry: Math.PI - 0.3, flash: [1.5, 2.6] });
  const wl = stat(grp(world, 6.4, 0, -3)); box(wl, 2.6, 3, 0.3, '#C9C2B4', 0, 0, 0, { surf: 'concrete' });   // wall for the AED cabinet, front face z = -2.85
  aedBox(world, 6.4, 1.3, -2.85, { open: 1.2 });
  stat(box(world, 1.2, 1.3, 0.08, '#7A8088', 5.6, 0, 0.6, { kind: 'metal' })); grindSparks([5.1, 0.9, 0.66], 0.3, 2.8);   // steel plate being cut
  // pool villa: terrace pool, air mattress that loses air, diving board from the back deck, a portal on the deck beside it
  const P = swimPool(world, 40, 0, { w: 4.5, d: 10 });
  airbed(world, 40.3, t => P.level(t), 1.2, { deflate: [3.2, 8], ry: 0.3 });
  divingBoard(world, 40, P.top, -5.9);
  portal(world, 44, P.top, -2.5, { r: 1.2, ry: -0.5, open: [3.4, 9], flicker: [5] });
  // planet set far from the main world (x ≥ 1000)
  planetSet(world, 2000, 0, 'mars');
