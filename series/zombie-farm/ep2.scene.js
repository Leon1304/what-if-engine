// ===== Zombie Farm – world (ep1 at ~03:00: back fence down, barn burning) =====
ground({ color: '#4E6B34', flat: 34, hills: 9 });
box(world, 30, 0.04, 23, '#5C7A3C', 0, 0, -0.5, { cast: false });
box(world, 3, 0.05, 22, '#7A6650', 0.5, 0, 0, { cast: false });
box(world, 16, 0.05, 2.6, '#7A6650', -1, 0, 1.2, { cast: false });
const farmhouse = house(world, -6.5, 5, { w: 5.2, d: 4, h: 2.9, ry: 0.22, lit: 1.6, wall: '#E6D8BE', roof: '#7E2F26' });
tick(t => { farmhouse.winMat.emissiveIntensity = 1.6 * (1 - 0.85 * span(t, 40, 6)); });
lamp(world, -3.4, 8.6, { h: 2.4, intensity: 30, dist: 14 });
barn(world, -7.5, -5.8, { ry: 0.08 });
emit('fire', { at: [-5.6, 3.4, -8.8], t0: -5, rate: 30, jitter: 1.4, size: 0.6 });
emit('smoke', { at: [-6.0, 5.5, -7.5], t0: -5, rate: 4, size: 1.1 });
const sl = silo(world, 10.5, -5.5, { h: 8.5 });
windmill(world, -12.8, 1.5, { h: 8.5, speed: 1.1 });
vehicle(world, 2.2, 6.2, { kind: 'tractor', color: '#3E8E41', ry: -0.6 });
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

// ===== Storm-cellar doors (east of the farmhouse) =====
const CX = -1.2, CZ = 4.0;
const cframe = grp(world, CX, 0, CZ);
box(cframe, 2.1, 0.36, 1.9, '#8A8478', 0, 0, 0);
const leaves = [-1, 1].map(s => {
  const hinge = grp(world, CX + s * 0.98, 0.36, CZ); dyn(hinge);
  box(hinge, 0.95, 0.08, 1.75, '#6B4A2E', -s * 0.48, 0, 0);
  box(hinge, 0.9, 0.1, 0.12, '#4A3320', -s * 0.48, 0.02, -0.5);
  box(hinge, 0.9, 0.1, 0.12, '#4A3320', -s * 0.48, 0.02, 0.5);
  return { hinge, s };
});
tick(t => {
  const open = span(t, 1.45, 0.35, 'out') * (1 - span(t, 2.45, 0.25)) + span(t, 36.3, 0.45, 'out');
  const bang = t > 7.3 && t < 32.3 ? 0.025 * Math.max(0, Math.sin(t * 29)) * (t > 20 ? 2.2 : 1) : 0;
  for (const { hinge, s } of leaves) hinge.rotation.z = s * (Math.min(1, open) * 1.9 + bang);
});
emit('debris', { at: [-0.7, 0.5, 3.25], t0: 20.4, burst: 6, speed: 2, size: 0.12 });
emit('debris', { at: [-1.5, 0.5, 3.25], t0: 21.6, burst: 6, speed: 2, size: 0.12 });
emit('dust', { at: [CX, 0.5, CZ - 0.6], t0: 7.3, t1: 32.3, rate: 3, jitter: 1.2, size: 0.3 });

// ===== Farmer outside: runs to the cellar and drops in (under the intro card) =====
const f1 = figure({ shirt: '#C0392B', pants: '#2E3A5C', hat: '#D9B65C', expr: 'scared' }); world.add(f1.root);
walk(f1, [[-5.6, 8.3], [-1.2, 5.3], [-1.2, 4.2]], { t0: 0, speed: 3.6, mode: 'run', endMode: 'idle' });
vanish(f1.root, 2.35, { dur: 0.15 });

// ===== Hordes pile up at the cellar doors, dance once the radio plays, slump asleep at ~32 s =====
const danceOn = (t, i) => t > 15.4 + hash(i) * 0.8 && t < 32.3;
const lift = (t, i) => t > 32.3 ? -0.45 * span(t, 32.3 + hash(i) * 0.4, 0.7) : danceOn(t, i) ? 0.22 * Math.max(0, Math.sin(t * 8 + i * 0.7)) : 0;
const arms = (t, i) => danceOn(t, i) && hash(i + 7) > 0.3;
const h1 = horde({ n: 50, from: [6, -22], r: 5, to: [CX, CZ], stop: 1.8, pile: 5, t0: -3, t1: -1, speed: [2.2, 2.8], lift, armsUp: arms, freeze: 33.3, ice: '#5E7D4C' });
const h2 = horde({ n: 300, from: [6, -30], r: 11, to: [CX, CZ], stop: 1.8, pile: 9, t0: 1, t1: 13, speed: [2.0, 2.6], lift, armsUp: arms, freeze: 33.3, ice: '#5E7D4C' });
LIVE.zombies = t => h1.count(t) + h2.count(t);

// ===== Gerald: on the cellar door the whole night, bobbing to the music =====
const g = gerald({ scale: 1.5 }); world.add(g.root); dyn(g.root);
g.root.position.set(-1.75, 0.44, 4.15);
tick(t => { g.root.position.y = 0.44 + (t > 15.5 ? 0.06 * Math.abs(Math.sin(t * 8)) : 0); });
track('gerald', g.root, 0.4);
glow(-1.6, 1.6, 6.2, { intensity: 10, dist: 6, color: '#C8D8FF', flicker: 0 });

// ===== Cellar interior (separate set, far below the map) =====
const IX = 150, IY = -40;
const room = stat(grp(world, IX, IY, 0));
box(room, 5.4, 0.1, 7.4, '#5A4A3A', 0, -0.1, 0);
box(room, 5.4, 0.15, 7.4, '#4A3A2C', 0, 2.6, 0);
box(room, 0.2, 2.7, 7.4, '#7D7366', -2.6, 0, 0); box(room, 0.2, 2.7, 7.4, '#7D7366', 2.6, 0, 0);
box(room, 5.4, 2.7, 0.2, '#746A5E', 0, 0, -3.6); box(room, 5.4, 2.7, 0.2, '#746A5E', 0, 0, 3.6);
for (let x = -2; x <= 2; x += 1) box(room, 0.18, 0.18, 7.2, '#3E2E20', x, 2.42, 0);
for (let i = 0; i < 5; i++) box(room, 1.4, 0.45 * (i + 1), 0.3, '#6B4A2E', -1.0, 0, -2.0 - 0.3 * i);
for (const y of [0.7, 1.35, 2.0]) {
  box(room, 0.45, 0.05, 4.0, '#6B4A2E', 2.25, y, 0.6);
  for (let k = 0; k < 7; k++) cyl(room, 0.09, 0.09, 0.26, pick(['#D9822B', '#C0392B', '#E6C35C', '#7FA650']), 2.25, y + 0.05, -1.0 + k * 0.5 + rr(-0.1, 0.1));
}
const idoor = grp(world, IX - 1.0, IY + 2.55, -3.05); dyn(idoor);
box(idoor, 1.4, 0.08, 1.1, '#5A3D24', 0, 0, 0, { rx: 0.35 });
tick(t => { idoor.rotation.z = t > 7.3 && t < 32.3 ? 0.03 * Math.sin(t * 29) * (t > 20 ? 2.5 : 1) : 0; idoor.position.y = IY + 2.55 + (t > 24.45 ? 0.12 : 0); });
const armsIn = grp(world, IX - 1.0, IY + 2.5, -3.0);
for (const [x, z, r] of [[-0.35, 0.1, 0.3], [0.1, -0.15, -0.2], [0.45, 0.2, 0.4]]) { const a = grp(armsIn, x, 0, z, r); cyl(a, 0.07, 0.08, 0.7, '#7BA05B', 0, -0.7, 0); ball(a, 0.1, '#7BA05B', 0, -0.72, 0); }
appear(armsIn, 24.5, { from: 'drop' });
emit('dust', { at: [IX - 0.5, IY + 2.4, -1.5], t0: 24.45, t1: 27.5, rate: 20, jitter: 2.2, size: 0.25 });
const radioMat = mat('#2A2A2A', { own: true, em: '#FF5FD2', ei: 0 });
box(room, 0.55, 0.32, 0.28, '#3A3F44', 2.2, 1.4, -0.6);
box(room, 0.3, 0.2, 0.02, '#000', 2.06, 1.46, -0.6, { ry: Math.PI / 2, mat: radioMat });
tick(t => { radioMat.emissiveIntensity = t > 13.9 ? 1.6 + 0.8 * Math.sin(t * 16) : 0; });
emit('confetti', { at: [IX + 2.0, IY + 1.7, -0.6], t0: 14.0, t1: 16.5, rate: 6, size: 0.12 });
box(world, 0.1, 0.9, 0.1, '#2E2A26', IX, IY + 2.5 - 0.9, 0.6);
box(world, 0.22, 0.3, 0.22, '#FFD58A', IX, IY + 1.3, 0.6, { mat: mat('#FFD58A', { em: '#FFB347', ei: 2.5 }) });
glow(IX + 0.2, IY + 1.95, 1.4, { intensity: 55, dist: 10, color: '#FFC57A', flicker: 0.12 });
const f3 = figure({ shirt: '#C0392B', pants: '#2E3A5C', hat: '#D9B65C', expr: t => t < 13.6 ? 'scared' : t < 20 ? 'happy' : t < 28 ? 'shout' : 'happy' });
const f3g = grp(world, IX, IY, -1.5); f3g.add(f3.root); dyn(f3g);
track('farmerIn', f3g, 1.55);
tick(t => {
  f3g.rotation.y = 0.9 * span(t, 12.6, 0.5) * (1 - span(t, 14.6, 0.5));
  pose(f3, t > 24.4 && t < 28 ? 'panic' : (t > 12.7 && t < 14.6) ? 'point' : (t > 15.5 && t < 20 ? 'cheer' : 'idle'), 0, t);
});

// ===== Day break: you climb out and tiptoe past the sleeping horde =====
const f5 = figure({ shirt: '#C0392B', pants: '#2E3A5C', hat: '#D9B65C', expr: 'happy' });
const f5g = grp(world, 0, 0, 0); f5g.add(f5.root); dyn(f5g);
f5.root.position.set(CX, 0, 4.4);
walk(f5, [[CX, 4.4], [-0.6, 7.0], [1.0, 9.6]], { t0: 36.9, speed: 0.9, mode: 'walk' });
tick(t => { f5g.visible = t >= 36.45; f5g.position.y = -1.5 * (1 - span(t, 36.45, 0.45, 'out')); });
track('farmerOut', f5);
