{
  ground({ color: '#4E6B34', flat: 34, hills: 9 });
  box(world, 30, 0.04, 23, '#5C7A3C', 0, 0, -0.5, { cast: false });            // yard grass
  box(world, 3, 0.05, 22, '#7A6650', 0.5, 0, 0, { cast: false });               // dirt track
  box(world, 16, 0.05, 2.6, '#7A6650', -1, 0, 1.2, { cast: false });

  // layout: back fence z = -12 faces the wheat field the zombies come from
  const farmhouse = house(world, -6.5, 5, { w: 5.2, d: 4, h: 2.9, ry: 0.22, lit: 1.6, wall: '#E6D8BE', roof: '#7E2F26' });
  tick(t => { farmhouse.winMat.emissiveIntensity = 1.6 * (1 - 0.85 * span(t, 19, 2.5)); });
  lamp(world, -3.4, 8.6, { h: 2.4, intensity: 30, dist: 14 });
  barn(world, -7.5, -5.8, { ry: 0.08 });
  const sl = silo(world, 10.5, -5.5, { h: 8.5 });
  windmill(world, -12.8, 1.5, { h: 8.5, speed: 1.1 });
  vehicle(world, 2.2, 6.2, { kind: 'tractor', color: '#3E8E41', ry: -0.6 });
  for (const [x, z, ry] of [[-3.2, 0.2, 0.3], [-2.2, -1.4, 1.2], [-3.6, -2.6, 2.0]]) haybale(world, x, z, ry);
  for (let i = 0; i < 6; i++) rock(world, rr(-16, 16), rr(12.5, 15), rr(0.6, 1.3));
  const back = fence(world, [[-15, -12], [15, -12]]);
  fence(world, [[15, -12], [15, 11], [-15, 11], [-15, -12]]);
  fence(world, [[4.5, 2], [13.5, 2], [13.5, 9.5], [4.5, 9.5], [4.5, 2]], { h: 1, color: '#9C7A56' });   // paddock
  field(world, 1, -29.5, 36, 26, { crop: 'wheat' });
  field(world, -27, 0, 14, 22, { crop: 'corn' });
  field(world, 26, -2, 12, 18, { crop: 'cabbage' });
  for (let i = 0; i < 70; i++) { const a = rnd() * TAU, r = rr(46, 88); tree(world, Math.sin(a) * r, Math.cos(a) * r, { kind: rnd() < 0.75 ? 'pine' : 'dead', size: rr(1.4, 2.4) }); }
  for (const [x, z] of [[-11, 9], [3.5, 9.8], [-14, -6]]) tree(world, x, z, { size: 1.15 });

  // cows graze, then panic-run laps in the paddock once the fence breaks
  [[6.5, 4.2], [9.5, 6.8], [11.8, 4]].forEach(([x, z], i) => {
    const cow = animal({ kind: 'cow' }); world.add(cow.root);
    const lap = [[6, 3.5], [12, 3.5], [12, 8], [6, 8]].map(([a, b]) => [a + i * 0.3, b + i * 0.2]);
    walk(cow, [[x, z], ...lap], { t0: 12.4 + i * 0.15, speed: 4.5, stride: 3.2, graze: 0.7 });
  });

  // farmer: on the porch first, later on top of the silo with a flashlight
  const f1 = figure({ shirt: '#C0392B', pants: '#2E3A5C', hat: '#D9B65C' }); world.add(f1.root);
  walk(f1, [[-7.6, 7.9], [-5.2, 8.5]], { t0: 2.8, t1: 12, speed: 0.8 });
  vanish(f1.root, 12.6, { dur: 0.01 });
  const f2 = figure({ shirt: '#C0392B', pants: '#2E3A5C', hat: '#D9B65C', expr: t => t < 15 ? 'scared' : 'happy' });
  const f2g = grp(world, 10.1, sl.top, -5.9, -2.3); f2g.add(f2.root);
  track('farmer', f2g);                                                                      // close-up target (CAM: shot('close', …, 'farmer'))
  glow(8.4, sl.top + 2.4, -7.6, { t0: 14, intensity: 30, dist: 7, color: '#C8D8FF', flicker: 0, rampIn: 0.01 });   // face fill light for the close-up
  tick(t => { f2g.visible = t >= 14; pose(f2, 'hold', 0, t); f2.root.rotation.y = 0.3 * Math.sin(t * 0.8); });
  flashlight(f2, { t0: 14, at: t => [6.8 + 1.6 * Math.sin(t * 0.9), 0, -8.6 + 1.2 * Math.cos(t * 0.7)], arm: false, intensity: 900, dist: 40, width: 0.38, k: 0.2 });   // torch in his hand, beam sweeps the yard

  // hordes rise from the wheat, mass at the back fence, break through at ~12.3 s and surround the silo
  const line = [[-8, -12.6], [13, -12.6]], silo0 = [10.5, -5.5];
  const h1 = horde({ n: 46, from: [2, -25], r: 6.5, to: silo0, around: true, stop: 2.1, pile: 4, t0: -1.4, t1: 2.6, speed: [0.55, 0.85], wait: { line, until: 12.3, stop: 0.5, pile: 2.2 } });
  const h2 = horde({ n: 330, from: [2, -30], r: 12, to: silo0, around: true, stop: 2.1, pile: 6.5, t0: 2.6, t1: 9.5, speed: [1.8, 2.6], wait: { line, until: 12.3, stop: 0.5, pile: 3.4 } });
  LIVE.zombies = t => h1.count(t) + h2.count(t);

  // fence breaks inward, debris + dust; then the barn catches fire
  back.forEach((s, i) => { if (s.x > -6.5 && s.x < 9) { const tb = 11.15 + Math.abs(s.x - 1.5) * 0.12 + hash(i) * 0.25; knock(s.g, tb, { dir: 1, dur: 0.45 }); emit('debris', { at: [s.x, 0.8, s.z], t0: tb, burst: 10, speed: 4 }); } });
  emit('dust', { at: [1.5, 0.2, -11.5], t0: 11.2, t1: 13.5, rate: 18, jitter: 6 });
  emit('fire', { at: [-4.9, 3.0, -9.5], t0: 12.55, rate: 70, jitter: 1.2, size: 0.7 });
  emit('fire', { at: [-6.5, 4.8, -8.0], t0: 13.1, rate: 45, jitter: 1.0, size: 0.6 });
  emit('smoke', { at: [-5.6, 5.5, -9], t0: 12.9, rate: 8, size: 1.1 });
  emit('spark', { at: [-5, 4, -9.4], t0: 12.6, rate: 16 });
  glow(-2.6, 3.6, -7.8, { t0: 12.55, intensity: 140, dist: 24 });
}
