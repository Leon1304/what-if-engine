// ===== Zombie Farm – world (same as ep1; barn burnt out, back fence already down) =====
ground({ color: '#4E6B34', flat: 34, hills: 9 });
box(world, 30, 0.04, 23, '#5C7A3C', 0, 0, -0.5, { cast: false });
box(world, 3, 0.05, 22, '#7A6650', 0.5, 0, 0, { cast: false });
box(world, 16, 0.05, 2.6, '#7A6650', -1, 0, 1.2, { cast: false });

const farmhouse = house(world, -6.5, 5, { w: 5.2, d: 4, h: 2.9, ry: 0.22, lit: 1.6, wall: '#E6D8BE', roof: '#7E2F26' });
tick(t => { farmhouse.winMat.emissiveIntensity = 1.6 * (1 - 0.85 * span(t, 44, 6)); });
lamp(world, -3.4, 8.6, { h: 2.4, intensity: 30, dist: 14 });
barn(world, -7.5, -5.8, { ry: 0.08 });
emit('smoke', { at: [-6.5, 4.2, -6.5], t0: -5, rate: 3, size: 1.0 });           // ep1's fire still smoulders
emit('spark', { at: [-6.2, 3.0, -7.5], t0: -5, rate: 3 });
const sl = silo(world, 10.5, -5.5, { h: 8.5 });
windmill(world, -12.8, 1.5, { h: 8.5, speed: 1.1 });
for (const [x, z, ry] of [[13.2, -9.4, 0.3], [11.8, -10.6, 1.2], [14.0, -11.0, 2.0]]) haybale(world, x, z, ry);
for (let i = 0; i < 6; i++) rock(world, (i % 2 ? 1 : -1) * rr(5, 16), rr(12.5, 15), rr(0.6, 1.3));
const back = fence(world, [[-15, -12], [15, -12]]);
back.forEach((s, i) => { if (s.x > -6.5 && s.x < 9) knock(s.g, -3 - hash(i), { dir: 1, dur: 0.3 }); });
const outer = fence(world, [[15, -12], [15, 11], [-15, 11], [-15, -12]]);
fence(world, [[4.5, 2], [13.5, 2], [13.5, 9.5], [4.5, 9.5], [4.5, 2]], { h: 1, color: '#9C7A56' });
field(world, 1, -29.5, 36, 26, { crop: 'wheat' });
field(world, -27, 0, 14, 22, { crop: 'corn' });
field(world, 26, -2, 12, 18, { crop: 'cabbage' });
for (let i = 0; i < 70; i++) { const a = rnd() * TAU, r = rr(46, 88); tree(world, Math.sin(a) * r, Math.cos(a) * r, { kind: rnd() < 0.75 ? 'pine' : 'dead', size: rr(1.4, 2.4) }); }
for (const [x, z] of [[-11, 9], [-14, -6]]) tree(world, x, z, { size: 1.15 });
[[6.5, 4.2], [9.5, 6.8], [11.8, 4]].forEach(([x, z], i) => {
  const cow = animal({ kind: 'cow' }); world.add(cow.root);
  walk(cow, [[x, z], [x + 0.6, z + 0.4]], { t0: 0, speed: 0.15, graze: 0.7 });
});

// ===== Storm-cellar doors (east of the farmhouse) =====
const CX = -1.2, CZ = 4.0;
const cframe = grp(world, CX, 0, CZ);
box(cframe, 2.1, 0.36, 1.9, '#8A8478', 0, 0, 0);                                    // concrete frame
const leaves = [-1, 1].map(s => {
  const hinge = grp(world, CX + s * 0.98, 0.36, CZ); dyn(hinge);
  box(hinge, 0.95, 0.08, 1.75, '#6B4A2E', -s * 0.48, 0, 0);
  box(hinge, 0.9, 0.1, 0.12, '#4A3320', -s * 0.48, 0.02, -0.5);
  box(hinge, 0.9, 0.1, 0.12, '#4A3320', -s * 0.48, 0.02, 0.5);
  return { hinge, s };
});
tick(t => {
  const open = span(t, 1.45, 0.35, 'out') * (1 - span(t, 2.45, 0.25));
  const bang = t > 10.5 ? 0.025 * Math.max(0, Math.sin(t * 29)) * (t > 26 ? 2.2 : 1) : 0;
  for (const { hinge, s } of leaves) hinge.rotation.z = s * (open * 1.9 + bang);
});
emit('debris', { at: [-0.7, 0.5, 3.25], t0: 26.6, burst: 6, speed: 2, size: 0.12 });
emit('debris', { at: [-1.5, 0.5, 3.25], t0: 27.8, burst: 6, speed: 2, size: 0.12 });
emit('dust', { at: [CX, 0.5, CZ - 0.6], t0: 10.5, t1: 44, rate: 3, jitter: 1.2, size: 0.3 });

// ===== Farmer outside: runs to the cellar and drops in =====
const f1 = figure({ shirt: '#C0392B', pants: '#2E3A5C', hat: '#D9B65C', expr: 'scared' }); world.add(f1.root);
walk(f1, [[-5.6, 8.3], [-1.2, 5.3], [-1.2, 4.2]], { t0: 0, speed: 3.6, mode: 'run', endMode: 'idle' });
vanish(f1.root, 2.35, { dur: 0.15 });

// ===== Hordes from the wheat field, piling up at the cellar doors, dancing once the radio plays =====
const dance = (t, i) => t > 17.3 + hash(i) * 0.8 ? 0.22 * Math.max(0, Math.sin(t * 8 + i * 0.7)) : 0;
const arms = (t, i) => t > 17.3 + hash(i) * 0.8 && hash(i + 7) > 0.3;
const h1 = horde({ n: 50, from: [6, -22], r: 5, to: [CX, CZ], stop: 1.8, pile: 5, t0: -1, t1: 1, speed: [2.2, 2.8], lift: dance, armsUp: arms });
const h2 = horde({ n: 300, from: [6, -30], r: 11, to: [CX, CZ], stop: 1.8, pile: 9, t0: 8, t1: 22, speed: [2.0, 2.6], lift: dance, armsUp: arms });
LIVE.zombies = t => h1.count(t) + h2.count(t);

// ===== Gerald: on the cellar door the whole time, bobbing to the music =====
const g = gerald({ scale: 1.5 }); world.add(g.root); dyn(g.root);
g.root.position.set(-1.75, 0.44, 4.15);
tick(t => { g.root.position.y = 0.44 + (t > 17.5 ? 0.06 * Math.abs(Math.sin(t * 8)) : 0); });
track('gerald', g.root, 0.4);
glow(-1.6, 1.6, 6.2, { intensity: 10, dist: 6, color: '#C8D8FF', flicker: 0 });          // fill for Gerald + door close-ups

// ===== Cellar interior (separate set, far below the map) =====
const IX = 150, IY = -40;
const room = stat(grp(world, IX, IY, 0));
box(room, 5.4, 0.1, 7.4, '#5A4A3A', 0, -0.1, 0);                                     // floor
box(room, 5.4, 0.15, 7.4, '#4A3A2C', 0, 2.6, 0);                                     // ceiling
box(room, 0.2, 2.7, 7.4, '#7D7366', -2.6, 0, 0); box(room, 0.2, 2.7, 7.4, '#7D7366', 2.6, 0, 0);
box(room, 5.4, 2.7, 0.2, '#746A5E', 0, 0, -3.6); box(room, 5.4, 2.7, 0.2, '#746A5E', 0, 0, 3.6);
for (let x = -2; x <= 2; x += 1) box(room, 0.18, 0.18, 7.2, '#3E2E20', x, 2.42, 0);  // ceiling beams
for (let i = 0; i < 5; i++) box(room, 1.4, 0.45 * (i + 1), 0.3, '#6B4A2E', -1.0, 0, -2.0 - 0.3 * i);   // stairs
for (const y of [0.7, 1.35, 2.0]) {                                                  // shelves + jars (east wall)
  box(room, 0.45, 0.05, 4.0, '#6B4A2E', 2.25, y, 0.6);
  for (let k = 0; k < 7; k++) cyl(room, 0.09, 0.09, 0.26, pick(['#D9822B', '#C0392B', '#E6C35C', '#7FA650']), 2.25, y + 0.05, -1.0 + k * 0.5 + rr(-0.1, 0.1));
}
const idoor = grp(world, IX - 1.0, IY + 2.55, -3.05); dyn(idoor);                    // cellar door from inside
box(idoor, 1.4, 0.08, 1.1, '#5A3D24', 0, 0, 0, { rx: 0.35 });
tick(t => { idoor.rotation.z = t > 10.5 ? 0.03 * Math.sin(t * 29) * (t > 26 ? 2.5 : 1) : 0; idoor.position.y = IY + 2.55 + (t > 29.8 ? 0.12 : 0); });
const armsIn = grp(world, IX - 1.0, IY + 2.5, -3.0);
for (const [x, z, r] of [[-0.35, 0.1, 0.3], [0.1, -0.15, -0.2], [0.45, 0.2, 0.4]]) { const a = grp(armsIn, x, 0, z, r); cyl(a, 0.07, 0.08, 0.7, '#7BA05B', 0, -0.7, 0); ball(a, 0.1, '#7BA05B', 0, -0.72, 0); }
appear(armsIn, 29.85, { from: 'drop' });
emit('dust', { at: [IX - 0.5, IY + 2.4, -1.5], t0: 29.8, t1: 33, rate: 20, jitter: 2.2, size: 0.25 });
const radioMat = mat('#2A2A2A', { own: true, em: '#FF5FD2', ei: 0 });
const radio = box(room, 0.55, 0.32, 0.28, '#3A3F44', 2.2, 1.4, -0.6);
box(room, 0.3, 0.2, 0.02, '#000', 2.06, 1.46, -0.6, { ry: Math.PI / 2, mat: radioMat });
tick(t => { radioMat.emissiveIntensity = t > 16.9 ? 1.6 + 0.8 * Math.sin(t * 16) : 0; });
emit('confetti', { at: [IX + 2.0, IY + 1.7, -0.6], t0: 17.0, t1: 19.5, rate: 6, size: 0.12 });    // "music notes"
const hatchIn = grp(world, IX + 0.85, IY + 0.01, -1.15); dyn(hatchIn);
box(hatchIn, 0.9, 0.06, 0.9, '#4A3320', 0, 0, -0.45);
tick(t => { hatchIn.rotation.x = 1.9 * span(t, 33.4, 0.6, 'out'); });
box(world, 0.85, 0.02, 0.85, '#111111', IX + 0.85, IY + 0.005, -1.6);                 // dark tunnel hole
box(world, 0.1, 0.9, 0.1, '#2E2A26', IX, IY + 2.5 - 0.9, 0.6);                         // lantern hook
box(world, 0.22, 0.3, 0.22, '#FFD58A', IX, IY + 1.3, 0.6, { mat: mat('#FFD58A', { em: '#FFB347', ei: 2.5 }) });
glow(IX + 0.2, IY + 1.95, 1.4, { intensity: 55, dist: 10, color: '#FFC57A', flicker: 0.12 });

const f3 = figure({ shirt: '#C0392B', pants: '#2E3A5C', hat: '#D9B65C', expr: t => t < 32.9 ? (t > 29.7 ? 'shout' : 'scared') : 'happy' });
const f3g = grp(world, IX, IY, -1.5); f3g.add(f3.root); dyn(f3g);
track('farmerIn', f3g, 1.55);
tick(t => {
  const toRadio = span(t, 15.3, 0.5) * (1 - span(t, 17.6, 0.5)), toHatch = span(t, 33.0, 0.5);
  f3g.rotation.y = 0.9 * toRadio + 0.7 * toHatch;
  const mode = t > 33.0 ? 'point' : t > 29.75 ? 'panic' : (t > 15.4 && t < 17.6) ? 'point' : 'idle';
  pose(f3, mode, 0, t);
});

// ===== Tunnel exit next to the tractor, then the getaway =====
const hatchOut = grp(world, 0.6, 0.02, 6.2); dyn(hatchOut);
box(hatchOut, 0.9, 0.06, 0.9, '#4A3320', 0, 0, 0.45);
tick(t => { hatchOut.rotation.x = -1.9 * span(t, 36.45, 0.4, 'out'); });
const f4 = figure({ shirt: '#C0392B', pants: '#2E3A5C', hat: '#D9B65C', expr: 'happy' });
const f4g = grp(world, 0, 0, 0); f4g.add(f4.root); f4.root.position.set(0.6, 0, 6.6);
walk(f4, [[0.6, 6.6], [1.4, 6.3]], { t0: 36.6, speed: 2.2, mode: 'run' });
dyn(f4g); tick(t => { f4g.visible = t >= 36.55 && t < 37.0; f4g.position.y = -1.6 * (1 - span(t, 36.55, 0.3, 'out')); });

const P0 = [2.2, 6.2], P1 = [1.4, 30.2], TL = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]);
const ux = (P1[0] - P0[0]) / TL, uz = (P1[1] - P0[1]) / TL, T0 = 37.05;
const trD = t => { const u = Math.max(0, t - T0), ta = 7 / 8, raw = u < ta ? 4 * u * u : 3.0625 + 7 * (u - ta);
  return raw < 18 ? raw : 18 + 6 * (1 - Math.exp(-(raw - 18) / 6)); };
const trP = t => { const d = trD(t); return [P0[0] + ux * d, P0[1] + uz * d]; };
const tr = vehicle(world, P0[0], P0[1], { kind: 'tractor', color: '#3E8E41', ry: Math.atan2(ux, uz) }); dyn(tr.g);
(tr.wheels || []).forEach(w => dyn(w));
tick(t => { const [x, z] = trP(t); tr.g.position.x = x; tr.g.position.z = z; (tr.wheels || []).forEach(w => { w.rotation.x = trD(t) / 0.55; }); });
const driver = figure({ shirt: '#C0392B', pants: '#2E3A5C', hat: '#D9B65C', expr: 'shout' });
const dg = grp(tr.g, 0, 1.25, -0.35); dg.add(driver.root);
tick(t => { dg.visible = t >= 37.0; pose(driver, 'cheer', 0, t); });
emit('dust', { at: t => { const [x, z] = trP(t); return [x - ux * 1.6, 0.3, z - uz * 1.6]; }, t0: 37.1, t1: 46, rate: 14, jitter: 0.8, size: 0.35 });
outer.forEach((s, i) => { if (Math.abs(s.z - 11) < 0.6 && Math.abs(s.x - 1.8) < 1.7) { knock(s.g, 38.15 + hash(i) * 0.05, { dir: 1, dur: 0.35 }); emit('debris', { at: [s.x, 0.7, s.z], t0: 38.15, burst: 10, speed: 4 }); } });
