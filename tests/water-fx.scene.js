  // p3 water fx — wakes + hull mask, splash, storm swell + lens rain, deep blast collapse
  ground({ color: '#7A8A5A', coast: -400, depth: 30 });
  water({ level: -0.3, waves: t => t < 5 ? 0.3 : t < 7 ? 1.6 : 0.3 });
  const LC = ship('landing', -4, 60, { ry: Math.PI }); sail(LC, [[-4, 60], [-4, -40]], { t0: -6, speed: 6, len: LC.len });
  const SB = ship('speedboat', 6, 50, { ry: Math.PI }); sail(SB, [[6, 50], [8, 20], [14, -20]], { t0: -3, speed: 9, len: SB.len });
  track('lc', LC.g, 1);
  splash(0, 62, 3.4, { size: 1.6 });
  emit('debris', { at: [2.5, -0.3, 64], t0: 3.6, burst: 30, colors: ['#E8F6FF', '#BFD9E5'], size: 0.2, speed: 8, spread: 0.3, basic: true, life: 1.6 });   // old scene-style spray: drawn as water drops
  lensRain(5, 7, 0.8);
  box(world, 60, 1, 60, '#26302E', 3000, -61, 0);
  uwBlast(world, 3000, -56, 0, { t: 5.6, r: 3, pulses: 3, period: 2.2 });
