  // v3.42: one of everything — each a pure function of t
  ground({ color: '#7E8A5C', flat: 400 });
  const T1 = tower(world, 0, -20, { w: 9, d: 9, h: 30, style: 'brick' }), T2 = tower(world, 24, -22, { w: 8, d: 8, h: 34, style: 'glass' }), T3 = tower(world, -22, -24, { w: 8, d: 8, h: 26, style: 'deco' });
  for (let i = 0; i < 9; i++) tree(world, -30 + i * 7, 4 + (i % 2) * 3, { kind: i % 3 ? 'round' : 'pine' });
  const Hs = house(world, 30, 8, { w: 6, d: 5, h: 3 });
  smokeColumn(30, 4, 8, { t0: 0, r: 1.4, heat: 0.8 });   // a burning house
  explode(4, 0.5, 2, 0.55, { size: 1.6 });   // fireball, streak sparks, embers, smoke column, shimmer
  meteor({ from: [70, 130, -230], to: [-15, 0, -80], t0: -1, t1: 2.2, size: 2.2 });   // rough glowing rock, plasma, ionised trail
  collapse(T1, 2.4, { style: 'pancake' }); collapse(T2, 2.8, { style: 'topple', dir: [0.3, 1] }); collapse(T3, 3.1, { style: 'topple', dir: [-1, 0.6] });
  shockwave({ at: [-15, -80], t0: 2.25, radius: 120, speed: 34, h: 6 });   // dust wall over the ground, trees bend as it passes
  mushroomCloud({ at: [-30, -140], t0: 2.4, h: 70, r: 30, dur: 12 });
