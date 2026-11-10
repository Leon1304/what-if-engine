// ===== Zombie Farm – world (as ep2; cellar closed, tractor parked south) =====
ground({ color: '#4E6B34', flat: 34, hills: 9 });
box(world, 30, 0.04, 23, '#5C7A3C', 0, 0, -0.5, { cast: false });
box(world, 3, 0.05, 22, '#7A6650', 0.5, 0, 0, { cast: false });
box(world, 16, 0.05, 2.6, '#7A6650', -1, 0, 1.2, { cast: false });
const farmhouse = house(world, -6.5, 5, { w: 5.2, d: 4, h: 2.9, ry: 0.22, lit: 1.6, wall: '#E6D8BE', roof: '#7E2F26' });
lamp(world, -3.4, 8.6, { h: 2.4, intensity: 30, dist: 14 });
barn(world, -7.5, -5.8, { ry: 0.08 });
emit('smoke', { at: [-6.5, 4.2, -6.5], t0: -5, rate: 2, size: 1.0 });
const sl = silo(world, 10.5, -5.5, { h: 8.5 });
windmill(world, -12.8, 1.5, { h: 8.5, speed: 1.1 });
for (let i = 0; i < 6; i++) rock(world, (i % 2 ? 1 : -1) * rr(6, 16), rr(12.5, 14), rr(0.6, 1.3));
const back = fence(world, [[-15, -12], [15, -12]]);
back.forEach((s, i) => { if (s.x > -6.5 && s.x < 9) knock(s.g, -3 - hash(i), { dir: 1, dur: 0.3 }); });
const outer = fence(world, [[15, -12], [15, 11], [-15, 11], [-15, -12]]);
outer.forEach((s, i) => { if (Math.abs(s.z - 11) < 0.6 && Math.abs(s.x - 0.5) < 4.6) knock(s.g, -3 - hash(i), { dir: 1, dur: 0.3 }); });
fence(world, [[4.5, 2], [13.5, 2], [13.5, 9.5], [4.5, 9.5], [4.5, 2]], { h: 1, color: '#9C7A56' });
field(world, 1, -29.5, 36, 26, { crop: 'wheat' });
field(world, -27, 0, 14, 22, { crop: 'corn' });
field(world, 26, -2, 12, 18, { crop: 'cabbage' });
for (let i = 0; i < 70; i++) { const a = rnd() * TAU, r = rr(46, 88); tree(world, Math.sin(a) * r, Math.cos(a) * r, { kind: rnd() < 0.75 ? 'pine' : 'dead', size: rr(1.4, 2.4) }); }
for (const [x, z] of [[-11, 9], [-14, -6]]) tree(world, x, z, { size: 1.15 });
[[6.5, 4.2], [9.5, 6.8], [11.8, 4]].forEach(([x, z]) => { const cow = animal({ kind: 'cow' }); world.add(cow.root); walk(cow, [[x, z], [x + 0.6, z + 0.4]], { t0: 0, speed: 0.15, graze: 0.7 }); });
const cframe = stat(grp(world, -1.2, 0, 4.0));                                        // ep2's cellar, closed
box(cframe, 2.1, 0.36, 1.9, '#8A8478', 0, 0, 0); box(cframe, 1.95, 0.08, 1.75, '#6B4A2E', 0, 0.36, 0);
vehicle(world, 8, 27, { kind: 'tractor', color: '#3E8E41', ry: 0.5 });              // where ep2 ended

// ===== The hay-bale fortress: 2 rings x 20 bales =====
const [FX, FZ] = F, R = 3.6, N = 20;
const bale = (p, a) => haybale(p, FX + R * Math.sin(a) + 0.55 * Math.cos(a), FZ + R * Math.cos(a) - 0.55 * Math.sin(a), a + Math.PI / 2);
const L1 = [...Array(N).keys()].map(k => bale(world, k / N * TAU));
const top = grp(world, 0, 1.15, 0);
const L2 = [...Array(N).keys()].map(k => bale(top, (k + 0.5) / N * TAU));
const KF = 11, KT = { 6: 11.4, 7: 13.0, 8: 19.6, 9: 21.8, 10: 24.3, 12: 26.8, 13: 28.4 };   // bales pushed off the top
for (const [k, tk] of Object.entries(KT)) { knock(L2[k], tk, { axis: 'z', dir: -1, dur: 0.5 }); const a = (+k + 0.5) / N * TAU; emit('dust', { at: [FX + R * Math.sin(a), 1.4, FZ + R * Math.cos(a)], t0: tk + 0.3, burst: 8, size: 0.35 }); }
const knocked = t => Object.values(KT).filter(x => x <= t).length;
LIVE.bales = t => t < 30.4 ? 40 - knocked(t) : Math.round(33 - 24 * span(t, 30.4, 10));
haybale(world, FX + 0.55, FZ, Math.PI / 2);                                           // Gerald's throne (centre)
for (const L of [L1, L2]) vanish(L[0], 36.4, { dur: 0.2 });                            // you kick out the south bales
emit('dust', { at: [FX, 0.8, FZ + R], t0: 36.4, burst: 14, size: 0.4 });
glow(FX + 1.5, 3.4, FZ + 2.6, { intensity: 14, dist: 12, color: '#FFD9A0', flicker: 0 });   // camp-light fill

// ===== Farmer (yellow raincoat) on the north-west wall, later inside, then tiptoeing out =====
const aF = (KF + 0.5) / N * TAU, fx = FX + R * Math.sin(aF), fz = FZ + R * Math.cos(aF);
const f1 = figure({ shirt: '#F2C230', pants: '#2E3A5C', hat: '#D9B65C', expr: t => t < 16.3 ? 'scared' : t < 23 ? 'happy' : 'scared' });
const f1g = grp(world, fx, 2.35, fz, Math.PI + 0.25); f1g.add(f1.root); dyn(f1g);
track('farmer', f1g, 1.55);
tick(t => { f1g.visible = t < 30.3; pose(f1, t > 16.3 && t < 23 ? 'cheer' : t >= 23 ? 'panic' : 'idle', 0, t); });
const f2 = figure({ shirt: '#F2C230', pants: '#2E3A5C', hat: '#D9B65C', expr: 'scared' });
const f2g = grp(world, 0, 0, 0); f2g.add(f2.root); dyn(f2g);
walk(f2, [[FX - 0.7, FZ + 0.6], [FX, FZ + 2.0], [FX, FZ + 5.4], [7.2, 26.0]], { t0: 36.5, speed: 1.7, mode: 'walk' });
tick(t => { f2g.visible = t >= 30.3; if (t < 36.6) pose(f2, 'panic', 0, t); });
track('farmerOut', f2);

// ===== Hordes from the north, piling against the north wall =====
const arms = (t, i) => t > 10.6 + hash(i) * 0.6 && t < 30.5 + hash(i + 3) * 0.8;
const h1 = horde({ n: 120, from: [0.5, -16], r: 3.5, to: F, stop: 4.6, pile: 7, t0: -3, t1: 2, speed: [2.2, 2.8], armsUp: arms });
const h2 = horde({ n: 240, from: [1, -24], r: 4, to: F, stop: 4.6, pile: 9, t0: 4, t1: 16, speed: [2.2, 2.8], armsUp: arms });
LIVE.zombies = t => h1.count(t) + h2.count(t);

// ===== Gerald on the centre bale =====
const g = gerald({ scale: 1.5 }); world.add(g.root);
g.root.position.set(FX, 1.22, FZ);
track('gerald', g.root, 0.4);

// ===== Lightning strike + the fortress burns =====
const bolt = grp(world, FX - 1.8, 0, FZ - 3.1); dyn(bolt);
let bx = 0, by = 2.4;
for (let i = 0; i < 7; i++) { const nx = bx + rr(-1.2, 1.2), ny = by + 5.5; const seg = grp(bolt, (bx + nx) / 2, (by + ny) / 2, 0, 0); box(seg, 0.18, 5.8, 0.18, '#FFFFFF', 0, -2.9, 0, { rz: Math.atan2(bx - nx, 5.5), mat: mat('#EAF2FF', { basic: true }) }); bx = nx; by = ny; }
tick(t => { bolt.visible = t >= 29.85 && t < 30.1; });
explode(FX - 1.8, 2.4, FZ - 3.1, 29.9, { size: 0.9, crater: false });
for (let j = 2; j <= 8; j++) {
  const a = j / 10 * TAU, t0 = 30.0 + 2.0 * (1 + Math.cos(a)) / 2;
  emit('fire', { at: [FX + R * Math.sin(a), 1.8, FZ + R * Math.cos(a)], t0, rate: 38, jitter: 0.9, size: 0.55 });
}
emit('smoke', { at: [FX, 4.5, FZ - 1], t0: 30.5, rate: 6, size: 1.4, jitter: 2 });
emit('spark', { at: [FX, 2.5, FZ], t0: 30.3, rate: 18, jitter: 3 });
emit('fire', { at: [FX + 0.9, 1.3, FZ - 0.7], t0: 38.0, rate: 22, jitter: 0.3, size: 0.5 });    // Gerald sits in it
glow(FX, 3.2, FZ - 3.4, { t0: 30.1, intensity: 100, dist: 24, color: '#FF9A40' });
