// ===== Zombie Farm – world (ep1 at ~03:00: back fence down, barn burning) =====
ground({ color: '#4E6B34', flat: 34, hills: 9 });
box(world, 30, 0.04, 23, '#5C7A3C', 0, 0, -0.5, { cast: false });
box(world, 3, 0.05, 22, '#7A6650', 0.5, 0, 0, { cast: false });
box(world, 16, 0.05, 2.6, '#7A6650', -1, 0, 1.2, { cast: false });
const farmhouse = house(world, -6.5, 5, { w: 5.2, d: 4, h: 2.9, ry: 0.22, lit: 1.6, wall: '#E6D8BE', roof: '#7E2F26' });
tick(t => { farmhouse.winMat.emissiveIntensity = 0.2 + 1.4 * span(t, 28, 4); });
lamp(world, -3.4, 8.6, { h: 2.4, intensity: 30, dist: 14 });
barn(world, -7.5, -5.8, { ry: 0.08 });
emit('smoke', { at: [-6.0, 5.5, -7.5], t0: -5, rate: 4, size: 1.1 });
const sl = silo(world, 10.5, -5.5, { h: 8.5 });
windmill(world, -12.8, 1.5, { h: 8.5, speed: 1.1 });
for (let i = 0; i < 6; i++) rock(world, (i % 2 ? 1 : -1) * rr(5, 16), rr(12.5, 15), rr(0.6, 1.3));
const back = fence(world, [[-15, -12], [15, -12]]);
back.forEach((s, i) => { if (s.x > -6.5 && s.x < 9) knock(s.g, -3 - hash(i), { dir: 1, dur: 0.3 }); });
fence(world, [[15, -12], [15, 11], [-15, 11], [-15, -12]]);
fence(world, [[4.5, 2], [13.5, 2], [13.5, 9.5], [4.5, 9.5], [4.5, 2]], { h: 1, color: '#9C7A56' });
field(world, 1, -29.5, 36, 26, { crop: 'wheat' });
field(world, -27, 0, 14, 22, { crop: 'corn' });
field(world, 26, -2, 12, 18, { crop: 'cabbage' });
for (let i = 0; i < 70; i++) { const a = rnd() * TAU, r = rr(46, 88); tree(world, Math.sin(a) * r, Math.cos(a) * r, { kind: rnd() < 0.75 ? 'pine' : 'dead', size: rr(1.4, 2.4) }); }
for (const [x, z] of [[-11, 9], [-14, -6]]) tree(world, x, z, { size: 1.15 });
[[6.5, 4.2], [9.5, 6.8], [11.8, 4]].forEach(([x, z]) => { const cow = animal({ kind: 'cow' }); world.add(cow.root); walk(cow, [[x, z], [x + 0.6, z + 0.4]], { t0: 0, speed: 0.15, graze: 0.7 }); });

const cframe = stat(grp(world, -1.2, 0, 4.0));
box(cframe, 2.1, 0.36, 1.9, '#8A8478', 0, 0, 0); box(cframe, 1.95, 0.08, 1.75, '#6B4A2E', 0, 0.36, 0);
field(world, -6, 19.6, 36, 5.6, { crop: 'corn' }); field(world, -6, 28.4, 36, 5.6, { crop: 'corn' });   // corn field with a dirt road through it
box(world, 40, 0.05, 3.2, '#7A6650', -6, 0, 24, { cast: false });

// ===== The tractor: drives east, zigzags (Steve), runs dry in the middle of the corn at 21 s =====
const X0 = -26, X1 = 4, ZR = 24;
const dOf = t => (X1 - X0) * EASE.out(clamp(t / 21));
const zig = t => 1.1 * Math.sin((t - 15.6) * 2.4) * span(t, 15.6, 0.6) * (1 - span(t, 20.2, 0.8));
const trP = t => [X0 + dOf(t), ZR + zig(t)];
const tr = vehicle(world, X0, ZR, { kind: 'tractor', color: '#3E8E41', ry: Math.PI / 2 }); dyn(tr.g);
(tr.wheels || []).forEach(w => dyn(w));
tick(t => {
  const [x, z] = trP(t), [x2, z2] = trP(t + 0.05);
  tr.g.position.x = x; tr.g.position.z = z;
  if (Math.hypot(x2 - x, z2 - z) > 1e-4) tr.g.rotation.y = Math.atan2(x2 - x, z2 - z);
  (tr.wheels || []).forEach(w => { w.rotation.x = dOf(t) / 0.55; });
});
track('tractor', tr.g, 1.2);
emit('dust', { at: t => { const [x, z] = trP(t); return [x - 1.6, 0.3, z]; }, t0: 0, t1: 21, rate: 12, jitter: 0.8, size: 0.35 });
emit('smoke', { at: t => { const [x, z] = trP(t); return [x - 0.6, 2.3, z]; }, t0: 0, t1: 21.2, rate: 5, size: 0.4 });
emit('smoke', { at: [X1 - 0.6, 2.3, ZR], t0: 21.0, burst: 8, size: 0.5 });

const driver = figure({ shirt: '#C0392B', pants: '#2E3A5C', hat: '#D9B65C', expr: t => t < 21 ? 'happy' : t < 25 ? 'calm' : 'scared' });
const dg = grp(tr.g, 0, 1.25, -0.35); dg.add(driver.root);
track('driver', dg, 0.9);
tick(t => pose(driver, t < 21 ? 'idle' : t < 25 ? 'idle' : 'panic', 0, t));
glow(X1 + 3.5, 3.4, ZR + 2.5, { t0: 20, intensity: 12, dist: 8, color: '#FFE2B8', flicker: 0 });

// ===== Zombies rise out of the corn around the tractor (from 25.1 s) =====
const arms = (t, i) => t > 27 + hash(i);
const h1 = horde({ n: 260, from: [X1, ZR], r: 9, to: [X1, ZR], around: true, stop: 2.6, pile: 6, t0: 25.15, t1: 27.6, speed: [0.5, 0.8], armsUp: arms });
LIVE.zombies = t => h1.count(t);
emit('dust', { at: [X1, 0.3, ZR], t0: 25.15, t1: 27.6, rate: 30, jitter: 8, size: 0.35 });

// ===== Gerald: rides on the hood, then simply flies away (39.3 s) =====
const g = gerald({ scale: 1.5 }); const gg = grp(tr.g, -0.45, 1.2, 1.35); gg.add(g.root);
const gf = grp(world, 0, 0, 0); dyn(gf);
const g2 = gerald({ scale: 1.5 }); gf.add(g2.root);
tick(t => {
  gg.visible = t < 39.25; gf.visible = t >= 39.25;
  const [x, z] = trP(t), k = span(t, 39.3, 4.5, 'in');
  gf.position.set(x + 1.3 + 2 * k, 1.2 + 9 * k, z - 0.45 + 0.4 * Math.sin(t * 3)); gf.rotation.y = Math.PI / 2;
  g2.root.rotation.z = 0.15 * Math.sin(t * 14);
});
track('gerald', gf, 0.4);
emit('confetti', { at: t => [gf.position.x, gf.position.y + 0.4, gf.position.z], t0: 39.4, t1: 43, rate: 8, size: 0.1 });
