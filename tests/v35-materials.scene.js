  ground({ color: '#7F9A55', flat: 600, hills: 0 });
  // 1) cars in daylight: lacquer, glass, chrome, rubber; material presets on balls
  road(world, [[-12, 0], [26, 0]], { w: 8 });
  ['car', 'sports', 'taxi', 'police'].forEach((k, i) => vehicle(world, -4.5 + i * 3, i % 2 ? 1.6 : -1.6, { kind: k, ry: Math.PI / 2, color: ['#C0392B', '#F2C230', undefined, undefined][i], siren: false }));
  vehicle(world, 6, -1.8, { kind: 'van', ry: Math.PI / 2, color: '#F2F2F2' }); vehicle(world, 11, 1.8, { kind: 'pickup', ry: -Math.PI / 2, color: '#2E6FD9' }); vehicle(world, 18, -1.8, { kind: 'bus', ry: Math.PI / 2 });
  ['plastic', 'ceramic', 'metal', 'chrome', 'paint', 'rubber'].forEach((k, i) => ball(world, 0.28, ['#D94F3D', '#F2EEE6', '#B8BEC6', '#C9CED6', '#2E6FD9', '#2A2D33'][i], -8.5 + i * 0.75, 0.28, 4.2, { kind: k }));
  // 2) fruit on a kitchen table (close-up)
  const tb = stat(grp(world, 60, 0, 0)); box(tb, 1.2, 0.04, 0.8, '#9A6A44', 0, 0.75, 0, { kind: 'wood' }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(tb, 0.06, 0.75, 0.06, '#7A5034', sx * 0.52, 0, sz * 0.32);
  if (typeof fruitBowl === 'function') fruitBowl(tb, 0.05, 0.79, -0.05); else furnish(tb, 'appliances', -0.4, -0.05, 0);
  food(world, 'apple', 60.42, 0.79, 0.2, { still: true }); food(world, 'orange', 60.3, 0.79, 0.24, { still: true }); food(world, 'grapes', 59.72, 0.79, 0.16, { still: true }); food(world, 'tomato', 59.62, 0.79, -0.14, { still: true }); food(world, 'banana', 59.9, 0.79, 0.25, { still: true, ry: 1.2 });
  furnish(world, 'counter', 60, -1.6, 0); furnish(world, 'appliances', 60, -1.6, 0);   // the appliances stand on a counter (they floated at counter height, QA FLOAT)
  // 3) street at dusk / night: post lamps and street lights with light pools, parked cars
  road(world, [[95, 0], [145, 0]], { w: 7, curb: true });
  box(world, 50, 0.16, 4, '#9A9C9F', 120, 0, 5.6, { cast: false, stat: true, surf: 'paving' }); box(world, 50, 0.16, 4, '#9A9C9F', 120, 0, -5.6, { cast: false, stat: true, surf: 'paving' });
  for (let i = 0; i < 4; i++) { streetlight(world, 106 + i * 9, 4.2, Math.PI); lamp(world, 110.5 + i * 9, -4.4, { light: i === 1, h: 2.6 }); }
  vehicle(world, 116, 2.3, { kind: 'car', ry: Math.PI / 2, color: '#7A2E8A' }); vehicle(world, 126, -2.3, { kind: 'taxi', ry: -Math.PI / 2 });
  for (let i = 0; i < 3; i++) tower(world, 108 + i * 12, -15, { w: 9, d: 7, h: 14 + i * 4 });
  // 4) searchlights at night (+ lighthouse beam)
  searchlight(world, 190, -40, { t0: 6 }); searchlight(world, 215, -50, { t0: 6, az: t => -25 + 18 * Math.sin(t * 0.3) });
  lighthouse(world, 228, -30, {});
  // 5) UFO tractor beam, flashlight, headlights
  spaceship(world, { kind: 'ufo', x: 300, y: 9, z: -2, beam: { t0: 0, t1: 99, len: 9 } });
  const f = figure({ shirt: '#3D7BD9' }); world.add(f.root); f.root.position.set(297, 0, 6); f.root.rotation.y = -0.4; flashlight(f, { t0: 0 });
  const hv = vehicle(world, 304, 6, { kind: 'car', ry: -Math.PI / 2 - 0.4, color: '#2A2D33' }); headlights(hv, { t0: 0, light: false });
  // 6) a small city: street lights on every block corner
  city({ nx: 2, nz: 2, at: [120, 60], hmin: 8, hmax: 18 });
