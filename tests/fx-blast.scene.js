  // v3.26 effects: fire that follows what burns (a crate falling under physics, a driving car), the light pool (spreadFire over 8 crates = 4 lights),
  // the new explosion (soft scorch, shock ring, dust ring, sparks, debris that lands and lies still), blast() on bodies and ragdolls, glass shards, heat shimmer, a meteor
  ground({ color: '#6E7A4A', flat: 60, hills: 0 });
  const crate = (x, y, z, s = 0.8, c = '#9A6B3E') => { const g = dyn(grp(world, x, y, z)); box(g, s, s, s, c, 0, 0, 0); box(g, s * 1.02, 0.06, s * 1.02, shade(c, -0.2), 0, s * 0.45, 0); return g; };
  // shot 1: a crate drops from 4 m and burns on the way down (flames stay on it), heat shimmer above it, a car drives past on fire
  const c1 = crate(-1.2, 4, 0); phys(c1, { t0: 0.3, spin: [1.2, 0.4, 0.8] }); burn(c1, 0.2, { size: 0.7, char: false }); heatShimmer(c1, { t0: 0.4, r: 0.8, k: 0.7 });
  const car = vehicle(world, -10, 3.5, { kind: 'car', ry: Math.PI / 2 }); drive(car, [[-10, 3.5], [14, 3.5]], { t0: 0, speed: 6, dust: false }); burn(car, 0.1, { size: 0.9, char: false });
  const pane = dyn(grp(world, 2.4, 0, -1.5)); box(pane, 0.06, 1.6, 1.2, '#2A2D33', 0, 0, 0); box(pane, 0.03, 1.2, 1.0, '', 0.0, 0.25, 0, { mat: mat('#BFE6F5', { opacity: 0.4, rough: 0.05 }) });
  shatter(pane, 1.0, { power: 4 });
  // shot 2: a row of crates catches fire one after the other (light pool), then a blast throws bodies and a ragdoll, leaves a scorch mark
  const row = []; for (let i = 0; i < 8; i++) row.push(crate(4 + i * 1.6, 0.4, -4, 0.7, i % 2 ? '#8A5A32' : '#A5784A'));
  spreadFire(row, 3.0, { speed: 6, size: 0.6, char: false });
  for (let i = 0; i < 5; i++) { const b = crate(9 + (i % 3) * 1.1, 0.35, 1 + Math.floor(i / 3) * 1.1, 0.6, '#6A7A8A'); phys(b, { t0: 3.0 }); }
  const f = figure({ shirt: '#3D7BD9' }); world.add(f.root); f.root.position.set(12.5, 0, 0.5); f.root.rotation.y = -1.2; ragdoll(f, 3.6, { from: [10, 0.3, 1.2], power: 2 });
  explode(10, 0, 1.2, 3.6, { size: 1.2 }); blast(10, 0.5, 1.2, 3.6, { power: 8, r: 8 });
  // shot 3: a meteor comes down behind, a wreck burns with its light from the pool
  meteor({ from: [-40, 60, -60], to: [-4, 0, -14], t0: 5.6, t1: 7.2, size: 1.2 });
  const van = vehicle(world, 4, -12, { kind: 'van', ry: 0.4 }); wreck(van, 6.2, { side: 'front', fire: 0.3 });
