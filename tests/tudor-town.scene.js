  ground({ color: '#5A5A48', flat: 200, hills: 0, dress: false });
  // a lane along z with houses on both sides; a yard gap on the right (+x) with the cesspit
  cobbleLane(world, 0, -6, { len: 36, w: 4 });
  const L = [], Rr = [];
  [-20.4, -14.8, -9.2, -3.6].forEach((z, i) => L.push(tudorHouse(world, -5.6, z, { w: 5.2, d: 6.5, ry: Math.PI / 2, seed: 10 + i, lit: 0.9, lantern: i === 2 ? true : false })));
  [-20.4, -14.8, -9.2, 5.6].forEach((z, i) => Rr.push(tudorHouse(world, 5.6, z, { w: 5.2, d: 6.5, ry: -Math.PI / 2, seed: 20 + i, lit: 0.9, sign: i === 1, smoke: i === 0 })));
  const P = cesspit(world, 6, 0, { open: 3.2, fumes: 4, privy: true, ry: 0 });
  const you = char('you', { outfit: 'tudor', expr: t => t > 4 ? 'disgust' : 'calm' }); world.add(you.root); you.root.position.set(8.4, 0, 0.6); you.root.rotation.y = -Math.PI / 2; walk(you, [[8.4, 0.6], [5.6, 1.9], [5.15, 0]], { t0: 4.2, speed: 1.2 });
  track('you', you);
  const tD = P.down(you, 6.4); P.stand(you, tD, 12, { at: [6.3, 0.2], ry: Math.PI / 2 }); shovel(you, tD + 0.4, 12);
  const lan = lantern(world, 0, 0, 0, { kind: 'hand', light: { intensity: 1.2, dist: 5 } }); holdItem(you, lan.g, 0, 5.8, { side: 'L', after: 'hide', reach: false });
  const B = bucket(world, 7.6, 0, 1.6, { fill: t => clamp((t - 7) / 4) });
  const C = cart(world, 0.8, 3, { kind: 'horse', ry: Math.PI, load: 'barrels' }); C.go([[0.8, 0.6], [0.8, -18]], { t0: 8.5, speed: 1.4 });
  const H2 = cart(world, -1.2, -12, { kind: 'hand', ry: 0.2, load: 'barrels', n: 2 });
  sack(world, 3.3, -6.5, { n: 3 }); stink(you, { t0: 4.5, t1: 6 });
  lantern(world, 2.1, 3.2, -9.2, { kind: 'hang', light: false });
  dress('medieval', { area: [-4, -24, 12, 8] });
