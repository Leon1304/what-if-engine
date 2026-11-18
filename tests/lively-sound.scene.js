  // v3.59 footsteps on three surfaces (stepsPass: grass → plank deck → asphalt), a car rushing past the lens (dopplerPass 'car') and a helicopter passing overhead ('heli').
  // tests/run.sh checks STEPLOG (grass, wood, hard) and DOPPLERLOG (car, heli) with a probe.
  ground({ color: '#5E8A3C', flat: 80, hills: 0 });
  road(world, [[-80, 5], [80, 5]], { w: 6 });
  box(world, 4, 0.04, 2.4, '#8A6440', -1, 0, 0, { surf: 'plank' });   // wooden deck in the walker's way
  house(world, -3, -7, { w: 6, d: 5, h: 2.8, wall: '#EDE3D0', roof: '#4A3A30', flowers: false });
  const W = figure({ seed: 4 }); world.add(W.root); W.root.position.set(-7, 0, 0); W.root.rotation.y = Math.PI / 2;
  walk(W, [[-7, 0], [-1, 0], [3, 3.2], [3.2, 4.4]], { t0: 0.2, speed: 1.6 }); track('walker', W);
  const V = vehicle(world, -60, 6.4, { kind: 'car', ry: Math.PI / 2, color: '#B8302A' }); drive(V, [[-60, 6.4], [60, 6.4]], { t0: 1.2, speed: 16 });
  const H = heli(world, { color: '#2F4F7A' }); fly(H, [[-90, 16, -2], [90, 16, -2]], { t0: 5.9, speed: 34 });
  for (const x of [-12, 9, 16]) tree(world, x, -4, { size: 1.2 });
