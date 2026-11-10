// ===== Zombie Farm – world (ep1 at ~03:00: back fence down, barn burning) =====
ground({ color: '#4E6B34', flat: 34, hills: 9 });
box(world, 30, 0.04, 23, '#5C7A3C', 0, 0, -0.5, { cast: false });
box(world, 3, 0.05, 22, '#7A6650', 0.5, 0, 0, { cast: false });
box(world, 16, 0.05, 2.6, '#7A6650', -1, 0, 1.2, { cast: false });
const farmhouse = house(world, -6.5, 5, { w: 5.2, d: 4, h: 2.9, ry: 0.22, lit: 1.6, wall: '#E6D8BE', roof: '#7E2F26' });
tick(t => { farmhouse.winMat.emissiveIntensity = 1.6 * (1 - 0.85 * span(t, 34, 6)); });
lamp(world, -3.4, 8.6, { h: 2.4, intensity: 30, dist: 14 });
barn(world, -7.5, -5.8, { ry: 0.08 });
emit('fire', { at: [-5.6, 3.4, -8.8], t0: -5, rate: 30, jitter: 1.4, size: 0.6 });
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

const cframe = stat(grp(world, -1.2, 0, 4.0));                                        // the cellar (closed)
box(cframe, 2.1, 0.36, 1.9, '#8A8478', 0, 0, 0); box(cframe, 1.95, 0.08, 1.75, '#6B4A2E', 0, 0.36, 0);
const outer = fence(world, [[-15, 11], [15, 11]]);

// ===== The tractor: won't start, gets swarmed, then the getaway south =====
const P0 = [2.2, 6.2], P1 = [1.4, 30.2], TL = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]);
const ux = (P1[0] - P0[0]) / TL, uz = (P1[1] - P0[1]) / TL, T0 = 28.9;
const trD = t => { const u = Math.max(0, t - T0), ta = 7 / 8, raw = u < ta ? 4 * u * u : 3.0625 + 7 * (u - ta);
  return raw < 18 ? raw : 18 + 6 * (1 - Math.exp(-(raw - 18) / 6)); };
const trP = t => { const d = trD(t); return [P0[0] + ux * d, P0[1] + uz * d]; };
const tr = vehicle(world, P0[0], P0[1], { kind: 'tractor', color: '#3E8E41', ry: Math.atan2(ux, uz) }); dyn(tr.g);
(tr.wheels || []).forEach(w => dyn(w));
const tries = [7.0, 8.3, 16.3, 28.6];
tick(t => {
  const [x, z] = trP(t), jit = tries.some(a => t > a && t < a + 0.8) ? 0.035 * Math.sin(t * 60) : 0;
  tr.g.position.x = x + jit; tr.g.position.z = z; tr.g.position.y = Math.abs(jit);
  (tr.wheels || []).forEach(w => { w.rotation.x = trD(t) / 0.55; });
});
track('tractor', tr.g, 1.2);
for (const a of tries.slice(0, 3)) emit('smoke', { at: t => { const [x, z] = trP(t); return [x - ux * 0.6, 2.2, z - uz * 0.6]; }, t0: a + 0.2, burst: 6, size: 0.5 });
emit('smoke', { at: t => { const [x, z] = trP(t); return [x - ux * 0.6, 2.3, z - uz * 0.6]; }, t0: 28.7, t1: 44, rate: 6, size: 0.45 });
emit('dust', { at: t => { const [x, z] = trP(t); return [x - ux * 1.6, 0.3, z - uz * 1.6]; }, t0: 29.0, t1: 46, rate: 14, jitter: 0.8, size: 0.35 });
outer.forEach((s, i) => { if (Math.abs(s.x - 1.8) < 1.7) { knock(s.g, 30.0 + hash(i) * 0.05, { dir: 1, dur: 0.35 }); emit('debris', { at: [s.x, 0.7, s.z], t0: 30.0, burst: 10, speed: 4 }); } });

// farmer runs to the tractor (under the intro card), then drives
const f1 = figure({ shirt: '#C0392B', pants: '#2E3A5C', hat: '#D9B65C', expr: 'scared' }); world.add(f1.root);
walk(f1, [[-5.6, 8.3], [1.2, 6.6]], { t0: 0, speed: 3.4, mode: 'run', endMode: 'idle' });
vanish(f1.root, 2.3, { dur: 0.1 });
const driver = figure({ shirt: '#C0392B', pants: '#2E3A5C', hat: '#D9B65C', expr: t => (t > 16.2 && t < 17.4) || (t > 28.3 && t < 29.4) ? 'shout' : t > 29.4 ? 'happy' : 'scared' });
const dg = grp(tr.g, 0, 1.25, -0.35); dg.add(driver.root);
track('driver', dg, 0.9);
tick(t => { dg.visible = t >= 2.3; pose(driver, t > 29.4 ? 'cheer' : (t > 16.2 && t < 17.4) || (t > 28.3 && t < 29.4) ? 'point' : t > 21 ? 'panic' : 'idle', 0, t); });
glow(4.5, 3.4, 9.8, { intensity: 12, dist: 8, color: '#C8D8FF', flicker: 0 });

// zombie on the hood (the 'worse'), thrown off when it starts
const hz = figure({ kind: 'zombie' });
const hzg = grp(tr.g, 0.1, 1.15, 1.25, Math.PI); hzg.add(hz.root);
tick(t => { hzg.visible = t >= 25.05 && t < 29.6; pose(hz, 'shamble', t * 3, t); hzg.position.y = 1.15 + 0.6 * span(t, 28.9, 0.5) ; hzg.rotation.z = 1.4 * span(t, 28.95, 0.5); });

// Gerald rides on the hood the whole time
const g = gerald({ scale: 1.5 }); const gg = grp(tr.g, -0.45, 1.2, 1.35); gg.add(g.root);
track('gerald', gg, 0.4);

// hordes: mass in the yard, the yell at 16.3 sends them to the tractor
const arms = (t, i) => t > 17.4 + hash(i) * 0.6;
const h1 = horde({ n: 120, from: [3, -20], r: 6, to: P0, stop: 2.6, pile: 6, t0: -4, t1: -1, speed: [2.2, 2.8], armsUp: arms, wait: { line: [[-3, -5], [9, -5]], until: 17.2, stop: 0.5, pile: 3 } });
const h2 = horde({ n: 200, from: [3, -28], r: 10, to: P0, stop: 2.6, pile: 8, t0: 1, t1: 12, speed: [2.2, 2.8], armsUp: arms, wait: { line: [[-3, -5], [9, -5]], until: 17.2, stop: 0.5, pile: 4 } });
LIVE.zombies = t => h1.count(t) + h2.count(t);
