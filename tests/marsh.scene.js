  ground({ color: '#5E7A3C', flat: 60, hills: 2 });
  const P = pond(world, 0, 0, { r: 7, rz: 5, seed: 3, open: [[-1.2, -0.6], [5.1, 5.5]] });
  const you = char('you', { outfit: 'peasant', expr: t => t > 9.5 ? 'disgust' : 'calm' }); world.add(you.root); track('you', you);
  walk(you, [[0.8, 2.5], [0.4, 0.6], [3.2, -3.2], [5.6, -4.6]], { t0: 0, speed: 1.2 });
  P.wade(you);
  const W = figure({ costume: 'peasant', build: 'woman', skirt: '#6A4A3A', skirtLen: 0.28, seed: 5 }); world.add(W.root); W.root.position.set(-2.2, 0, -0.8); W.root.rotation.y = 0.6; P.wade(W);
  const J = jar(world, 6.0, 0, -5.3, { leeches: 3 });
  LIVE.n = t => J.count(t);
  for (let i = 0; i < 3; i++) leech({ pond: P, at: [-2 + i, 1.5], swim: [[-2 + i * 0.8, 1.8 - i * 0.3], [0.6, 0.9], [0.5, 0.65]], t0: 0.5 + i * 0.4, speed: 0.4, seed: i + 1 });
  leech({ pond: P, latch: { rig: you, t: 2.5, leg: 'L', u: 0.3, a: 0.3 }, feed: 6, peel: { t: 9.6, by: you, side: 'R', to: J } });
  leech({ pond: P, latch: { rig: you, t: 3, leg: 'R', u: 0.35, a: -0.2 }, feed: 6 });
  // the clinic today: a treatment room, a nurse in scrubs holds up a jar of medicinal leeches
  interior(world, 400, 0, { kind: 'clinic' });
  const N = figure({ costume: 'scrubs', build: 'woman', seed: 9, expr: 'calm' }); world.add(N.root); N.root.position.set(400.6, 0, -0.4); N.root.rotation.y = 0.5;
  const J2 = jar(world, 401.1, 0.93, -2.6, { leeches: 6, lid: false }); showItem(N, J2, 12.6, 14.6, { side: 'R' });
  biome('swamp', { keep: [P.keep] });
