// ===== Zombie Farm – world (after ep3; you live on the silo now) =====
ground({ color: '#4E6B34', flat: 34, hills: 9 });
box(world, 30, 0.04, 23, '#5C7A3C', 0, 0, -0.5, { cast: false });
box(world, 3, 0.05, 22, '#7A6650', 0.5, 0, 0, { cast: false });
box(world, 16, 0.05, 2.6, '#7A6650', -1, 0, 1.2, { cast: false });
const farmhouse = house(world, -6.5, 5, { w: 5.2, d: 4, h: 2.9, ry: 0.22, lit: 1.6, wall: '#E6D8BE', roof: '#7E2F26' });
tick(t => { farmhouse.winMat.emissiveIntensity = t < 10.4 ? 1.6 : 0.2; });
lamp(world, -3.4, 8.6, { h: 2.4, intensity: 30, dist: 14 });
barn(world, -7.5, -5.8, { ry: 0.08 });
const sl = silo(world, 10.5, -5.5, { h: 8.5 }), TOP = sl.top;
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
const cframe = stat(grp(world, -1.2, 0, 4.0));
box(cframe, 2.1, 0.36, 1.9, '#8A8478', 0, 0, 0); box(cframe, 1.95, 0.08, 1.75, '#6B4A2E', 0, 0.36, 0);
vehicle(world, 8, 27, { kind: 'tractor', color: '#3E8E41', ry: 0.5 });
const ash = stat(grp(world, 1.4, 0, 19));                                             // what's left of the fortress
for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; box(ash, 1.0, 0.35, 0.8, '#3A332B', 3.6 * Math.sin(a), 0, 3.6 * Math.cos(a), { ry: a }); }

// ===== Silo top: farmer, Gerald, the corn pile =====
const glowTop = glow(10.9, TOP + 2.2, -3.6, { intensity: 26, dist: 9, color: '#C8D8FF', flicker: 0 });
const f1 = figure({ shirt: '#F2C230', pants: '#2E3A5C', hat: '#D9B65C', expr: t => t < 16.6 ? 'calm' : t < 29.8 ? 'happy' : t < 32.7 ? 'scared' : 'happy' });
const f1g = grp(world, 11.0, TOP, -5.1, 0.6); f1g.add(f1.root); dyn(f1g);
track('farmer', f1g, 1.55);
tick(t => {
  f1g.visible = t < 36.45;
  const jj = t > 16.8 && t < 29.75;
  f1g.position.y = TOP + (jj ? 0.25 * Math.abs(Math.sin(t * Math.PI * 2)) : 0);
  pose(f1, jj ? (Math.floor(t * 2) % 2 ? 'cheer' : 'idle') : t >= 29.75 && t < 32.7 ? 'panic' : 'idle', 0, t);
});
const corn = grp(world, 10.3, TOP, -6.2); dyn(corn);
const cobs = [...Array(8).keys()].map(k => { const c = grp(corn, (k % 4) * 0.22 - 0.33, 0.06 + Math.floor(k / 4) * 0.14, (k % 2) * 0.1, 0.3 * k); cyl(c, 0.07, 0.07, 0.34, '#F2C230', 0, 0, 0, { rz: Math.PI / 2 }); dyn(c); return c; });
const cobsLeft = t => t < 10.4 ? 8 : t < 22.55 ? 7 : t < 26.3 ? 5 : t < 36.45 ? 3 : 0;
tick(t => { const n = cobsLeft(t); cobs.forEach((c, k) => { c.visible = k < n; }); });
track('corn', corn, 0.2);
const g = gerald({ scale: 1.5 }); world.add(g.root);
g.root.position.set(10.0, TOP, -4.65);
track('gerald', g.root, 0.4);

// ===== The ring of zombies around the silo: pound, copy the jumping jacks, freeze on day 99 =====
const jack = (t, i) => t > 17.4 + hash(i) * 0.6 && t < 30.4;
const lift = (t, i) => jack(t, i) ? 0.3 * Math.abs(Math.sin(t * Math.PI * 2 + hash(i) * 0.6)) : 0;
const armsUp = (t, i) => jack(t, i) ? Math.sin(t * TAU + hash(i) * 0.6) > 0 : t >= 30.4 && hash(i + 5) > 0.55;
const h1 = horde({ n: 150, from: [8, -26], r: 8, to: [10.5, -5.5], around: true, stop: 2.1, pile: 4.5, t0: -60, t1: -50, speed: [1.2, 1.6], lift, armsUp, freeze: 30.4 });
const h2 = horde({ n: 250, from: [8, -30], r: 10, to: [10.5, -5.5], around: true, stop: 2.1, pile: 6.0, t0: -58, t1: -45, speed: [1.2, 1.6], lift, armsUp, freeze: 30.4 });
LIVE.zombies = t => h1.count(t) + h2.count(t);

// ===== Day 99: snow =====
emit('snow', { at: [8, 18, -3], t0: 29.85, t1: 36.4, rate: 260 });
const snowMat = mat('#F4F8FF', { own: true, opacity: 0, rough: 0.9 });
box(world, 90, 0.02, 90, '#F4F8FF', 0, 0.07, 0, { mat: snowMat, cast: false });
tick(t => { snowMat.opacity = 0.82 * span(t, 30.0, 4.5); snowMat.transparent = true; snowMat.visible = t > 30.0; });

// ===== Day 100: you climb down and walk out between the frozen zombies =====
const f2 = figure({ shirt: '#F2C230', pants: '#2E3A5C', hat: '#D9B65C', expr: 'happy' });
const f2g = grp(world, 0, 0, 0); f2g.add(f2.root); dyn(f2g);
walk(f2, [[10.9, -3.3], [9.6, 0.4], [7.2, 4.0], [4.2, 9.0]], { t0: 36.5, speed: 1.4, mode: 'walk' });
tick(t => { f2g.visible = t >= 36.45; });
track('farmerOut', f2);
glow(9.0, 3.0, 2.0, { t0: 36.4, intensity: 16, dist: 10, color: '#FFE2B8', flicker: 0 });
