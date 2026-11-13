  // v3.23 cinema look: a street with lamps and cars (hot lights → streaks + halation), a figure for the close-ups
  ground({ color: '#6B6656', flat: 60, hills: 3 });
  road(world, [[-60, -4], [60, -4]]);
  tower(world, -14, -16, { w: 8, d: 7, h: 14, style: 'brick', ry: 0.1 }); tower(world, 6, -18, { w: 9, d: 8, h: 20, style: 'glass' }); tower(world, 22, -15, { w: 7, d: 7, h: 11, style: 'brick', ry: -0.2 });
  for (const x of [-12, -4, 4, 12]) streetlight(world, x, -1, 0);
  const cars = [[-8, -5.5, Math.PI / 2, '#B33A2E'], [7, -2.5, -Math.PI / 2, '#2E5FA8']].map(([x, z, ry, color]) => vehicle(world, x, z, { kind: 'car', color, ry }));
  cars.forEach(v => headlights(v, { t0: 3.8, t1: 12 }));
  lamp(world, -1.2, 1.2, { light: true });
  const f = figure({ shirt: '#3C4F6B' }); world.add(f.root); f.root.position.set(0, 0, 1.5); track('hero', f);
  tick(t => { pose(f, 'idle', t, t); });
  glow(0, 1.7, 3.2, { dist: 7, flicker: 0, color: '#FFE2B8', intensity: 12, t0: 8 });
