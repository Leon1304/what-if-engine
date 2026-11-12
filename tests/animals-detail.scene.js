  ground({ color: '#8FA860', flat: 200, hills: 0 });
  const g = gerald({ scale: 1.5 }); world.add(g.root); g.root.rotation.y = 0.5; track('gerald', g.root, 0.4);
  const h1 = animal({ kind: 'chicken' }); world.add(h1.root); h1.root.position.set(1.2, 0, -0.8);
  const h2 = animal({ kind: 'chicken', color: '#B8642A' }); world.add(h2.root); walk(h2, [[0, 10], [0.9, 10]], { t0: 1.5, speed: 0.7 }); walk(h2, [[0.9, 10], [7, 10]], { t0: 3.0, speed: 3 }); track('hen', h2, 0);
  const hs = beast({ kind: 'horse', seed: 2 }); walk(hs, [[0, 20], [2.2, 20]], { t0: 3.5, speed: 1.3 }); walk(hs, [[2.2, 20], [9, 20]], { t0: 5.4, speed: 3.2 }); track('horse', hs, 0);
  beast({ kind: 'dog', x: 34, z: 0, ry: 0.4 }).do('wag', 6, { dur: 2 }); beast({ kind: 'mammoth', x: 40, z: -2 }).do('trumpet', 6.3); beast({ kind: 'moose', x: 47, z: 0, ry: -0.4 }).do('call', 6.5);
  const cr = beast({ kind: 'croc', seed: 3 }); walk(cr, [[28, 3], [36, 3]], { t0: 5.5, speed: 1.2 });
  const sn = snake(world, { x: 60, z: 0, len: 1.6, pattern: 'diamond' }); slither(sn, [[59.5, -0.8], [60.5, 0.2], [60, 1.4]], { t0: 7.3, speed: 0.5 });
  const sp = spider(world, { x: 61, z: -0.5, size: 0.2 }); walk(sp, [[61, -0.5], [61.3, 1.2]], { t0: 7.4, speed: 0.4 });
  const fr = frog(world, { x: 59.6, z: 0.9 }); hop(fr, [[59.6, 0.9], [59.9, 1.4], [60.3, 1.7]], { t0: 7.6 });
  const eg = bird({ kind: 'eagle', x: 42, z: 4 }); eg.do('spread', 6, { dur: 2 }); bird({ kind: 'gull', x: 38, z: 3, ry: 0.8 });
  // v2.40.x: ground birds and a lizard stepping with planted feet, an ambling elephant, a dog turning round on the spot
  const dk = bird({ kind: 'duck' }); walk(dk, [[2, -1.5], [4, -1.5]], { t0: 0.2, speed: 0.45 }); const pg = bird({ kind: 'pigeon' }); walk(pg, [[-1.5, 1.5], [-1.5, -0.5]], { t0: 0.3, speed: 0.5 });
  const lz = lizard(world, { x: 61.2, z: 0.8 }); walk(lz, [[61.2, 0.8], [60.6, 1.9]], { t0: 7.4, speed: 0.4 });
  const el = beast({ kind: 'elephant', seed: 4 }); walk(el, [[20, 30], [60, 30]], { t0: 4.5, speed: 5 });
  const dg = beast({ kind: 'dog', seed: 6 }); walk(dg, [[30, -4], [32, -4]], { t0: 3, speed: 1.4 }); walk(dg, [[32, -4], [29, -3.8]], { t0: 5.2, speed: 1.4 });
