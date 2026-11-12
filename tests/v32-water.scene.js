  // v3.2 water: pool (surface, tint, caustics, waterline, tiles, coping, drain), red salt lake (ripples, glint), underwater sky without underwater() (auto)
  ground({ color: '#B9A27E', coast: 30, depth: 8, sand: true });
  water({ level: -0.25, color: '#B4473C', shallow: '#C8563E', reflect: 0.3, waves: 0.05 });
  saltCrust(world, 6, 40, { r: 4, n: 9, y: -0.23 });
  const P = swimPool(world, 0, -6, { w: 4, d: 8, h: 1.6, drain: [5.2, 6.6] });
  const f = figure({ shirt: '#E05A3A' }); world.add(f.root); f.root.position.set(-0.8, 0.2, -7.5); track('swimmer', f);
  const sh = sea({ kind: 'white', len: 1.6, x: 0.6, y: 0.75, z: -5 }); track('fish', sh.g, 0);
  tick(t => { const a = t * 0.9; sh.g.position.set(0.6 + 0.7 * Math.sin(a), Math.min(0.75, P.level(t) - 0.45), -5 + 1.6 * Math.cos(a)); sh.g.rotation.y = a + Math.PI / 2; });
  floatie(world, 1.1, t => P.level(t), -8.6, { kind: 'ring' });
  // under the lake (auto underwater from t = 7)
  const wh = sea({ kind: 'white', x: 40, y: -4, z: 110 }); fly(wh.g, [[30, -4, 110], [60, -4, 110]], { speed: 3 }); track('deep', wh.g, 0);
  school({ at: [44, -3, 114], n: 20, r: 3 });
