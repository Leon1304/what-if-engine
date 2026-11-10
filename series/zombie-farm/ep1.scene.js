ground({ color: '#4E6B34', flat: 34, hills: 9 });
box(world, 30, 0.04, 23, '#5C7A3C', 0, 0, -0.5, { cast: false });
box(world, 3, 0.05, 22, '#7A6650', 0.5, 0, 0, { cast: false });
box(world, 16, 0.05, 2.6, '#7A6650', -1, 0, 1.2, { cast: false });

const farmhouse = house(world, -6.5, 5, { w: 5.2, d: 4, h: 2.9, ry: 0.22, lit: 1.6, wall: '#E6D8BE', roof: '#7E2F26' });
tick(t => { farmhouse.winMat.emissiveIntensity = 1.6 * (1 - 0.85 * span(t, 50, 4)); });
lamp(world, -3.4, 8.6, { h: 2.4, intensity: 30, dist: 14 });
barn(world, -7.5, -5.8, { ry: 0.08 });
const sl = silo(world, 10.5, -5.5, { h: 8.5 });
windmill(world, -12.8, 1.5, { h: 8.5, speed: 1.1 });
vehicle(world, 2.2, 6.2, { kind: 'tractor', color: '#3E8E41', ry: -0.6 });
for (const [x, z, ry] of [[-3.2, 0.2, 0.3], [-2.2, -1.4, 1.2], [-3.6, -2.6, 2.0]]) haybale(world, x, z, ry);
for (let i = 0; i < 6; i++) rock(world, rr(-16, 16), rr(12.5, 15), rr(0.6, 1.3));
const back = fence(world, [[-15, -12], [15, -12]]);
fence(world, [[15, -12], [15, 11], [-15, 11], [-15, -12]]);
fence(world, [[4.5, 2], [13.5, 2], [13.5, 9.5], [4.5, 9.5], [4.5, 2]], { h: 1, color: '#9C7A56' });
field(world, 1, -29.5, 36, 26, { crop: 'wheat' });
field(world, -27, 0, 14, 22, { crop: 'corn' });
field(world, 26, -2, 12, 18, { crop: 'cabbage' });
for (let i = 0; i < 70; i++) { const a = rnd() * TAU, r = rr(46, 88); tree(world, Math.sin(a) * r, Math.cos(a) * r, { kind: rnd() < 0.75 ? 'pine' : 'dead', size: rr(1.4, 2.4) }); }
for (const [x, z] of [[-11, 9], [3.5, 9.8], [-14, -6]]) tree(world, x, z, { size: 1.15 });

// cows graze, then panic-run laps once the fence breaks
[[6.5, 4.2], [9.5, 6.8], [11.8, 4]].forEach(([x, z], i) => {
  const cow = animal({ kind: 'cow' }); world.add(cow.root);
  const lap = [[6, 3.5], [12, 3.5], [12, 8], [6, 8]].map(([a, b]) => [a + i * 0.3, b + i * 0.2]);
  walk(cow, [[x, z], ...lap], { t0: 29.5 + i * 0.15, speed: 4.5, stride: 3.2, graze: 0.7 });
});

// farmer A: porch (lowkey panicking), then Steve's tip: shambles toward the fence like a zombie
const fA = figure({ shirt: '#C0392B', pants: '#2E3A5C', hat: '#D9B65C', expr: t => t < 16.4 ? 'scared' : t < 20.4 ? 'calm' : 'scared' });
const fAg = grp(world, 0, 0, 0); fAg.add(fA.root); dyn(fAg);
walk(fA, [[-7.6, 7.9], [-5.2, 8.5], [-3.0, 7.2]], { t0: 3.5, speed: 0.8 });
walk(fA, [[-3.0, 7.2], [-1.0, 0.0]], { t0: 16.6, speed: 0.85, mode: 'shamble' });
tick(t => { fAg.visible = t < 28.6; });
track('farmerA', fA);
glow(-1.2, 3.0, 4.6, { intensity: 18, dist: 9, color: '#FFE2B8', flicker: 0 });          // face fill on the porch

// farmer B: runs to the silo, then climbs the ladder
const fB = figure({ shirt: '#C0392B', pants: '#2E3A5C', hat: '#D9B65C', expr: 'shout' });
const fBg = grp(world, 0, 0, 0); fBg.add(fB.root); dyn(fBg);
walk(fB, [[-1.0, 0.0], [10.3, -3.0]], { t0: 28.6, speed: 4.4, mode: 'run' });
tick(t => { fBg.visible = t >= 28.6 && t < 31.3; });
const fC = figure({ shirt: '#C0392B', pants: '#2E3A5C', hat: '#D9B65C', expr: 'scared' });
const fCg = grp(world, 10.5, 0, -3.62, Math.PI); fCg.add(fC.root); dyn(fCg);
tick(t => { fCg.visible = t >= 31.3 && t < 35.4; fCg.position.y = (sl.top - 0.2) * span(t, 31.3, 4.0, 'soft'); pose(fC, Math.floor(t * 4) % 2 ? 'cheer' : 'hold', 0, t); });

// farmer on top of the silo with a flashlight (from 35.4)
const f2 = figure({ shirt: '#C0392B', pants: '#2E3A5C', hat: '#D9B65C', hold: '#30343A', expr: t => t < 37.5 ? 'scared' : 'happy' });
const f2g = grp(world, 10.1, sl.top, -5.9, -2.3); f2g.add(f2.root);
track('farmer', f2g);
glow(8.4, sl.top + 2.4, -7.6, { t0: 35.4, intensity: 30, dist: 7, color: '#C8D8FF', flicker: 0, rampIn: 0.01 });
tick(t => { f2g.visible = t >= 35.4; pose(f2, 'hold', 0, t); f2.root.rotation.y = 0.3 * Math.sin(t * 0.8); });
const LP = new THREE.Vector3(9.6, sl.top + 1.4, -6.2), TP = new THREE.Vector3(6.5, 0, -8.5);
const beam = new THREE.SpotLight('#FFF6D8', 0, 40, 0.36, 0.6, 1.2); beam.position.copy(LP); world.add(beam, beam.target);
const cone3 = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 18, 1, true), mat('#FFF3C4', { basic: true, opacity: 0.09 })); world.add(cone3);
tick(t => {
  TP.set(6.8 + 1.6 * Math.sin(t * 0.9), 0, -8.6 + 1.2 * Math.cos(t * 0.7));
  beam.target.position.copy(TP); beam.intensity = t >= 35.4 ? 900 : 0; cone3.visible = t >= 35.4;
  const len = LP.distanceTo(TP); cone3.scale.set(len * 0.38, len, len * 0.38);
  cone3.position.copy(LP).add(TP).multiplyScalar(0.5); cone3.lookAt(TP); cone3.rotateX(-Math.PI / 2);
});

// hordes rise from the wheat, mass at the back fence (arms up once they spot the fake zombie), break through at ~28.3 and surround the silo
const line = [[-8, -12.6], [13, -12.6]], silo0 = [10.5, -5.5];
const spotted = (t, i) => t > 20.2 + hash(i) * 0.8 && t < 29.4;
const h1 = horde({ n: 46, from: [2, -25], r: 6.5, to: silo0, around: true, stop: 2.1, pile: 4, t0: -1.4, t1: 2.6, speed: [0.55, 0.85], armsUp: spotted, wait: { line, until: 29.4, stop: 0.5, pile: 2.2 } });
const h2 = horde({ n: 330, from: [2, -30], r: 12, to: silo0, around: true, stop: 2.1, pile: 6.5, t0: 2.6, t1: 16, speed: [1.8, 2.6], armsUp: spotted, wait: { line, until: 29.4, stop: 0.5, pile: 3.4 } });
LIVE.zombies = t => h1.count(t) + h2.count(t);

// fence breaks inward, debris + dust; then the barn catches fire
back.forEach((s, i) => { if (s.x > -6.5 && s.x < 9) { const tb = 28.3 + Math.abs(s.x - 1.5) * 0.12 + hash(i) * 0.25; knock(s.g, tb, { dir: 1, dur: 0.45 }); emit('debris', { at: [s.x, 0.8, s.z], t0: tb, burst: 10, speed: 4 }); } });
emit('dust', { at: [1.5, 0.2, -11.5], t0: 28.35, t1: 30.6, rate: 18, jitter: 6 });
emit('fire', { at: [-4.9, 3.0, -9.5], t0: 29.8, rate: 70, jitter: 1.2, size: 0.7 });
emit('fire', { at: [-6.5, 4.8, -8.0], t0: 30.35, rate: 45, jitter: 1.0, size: 0.6 });
emit('smoke', { at: [-5.6, 5.5, -9], t0: 30.1, rate: 8, size: 1.1 });
emit('spark', { at: [-5, 4, -9.4], t0: 29.85, rate: 16 });
glow(-2.6, 3.6, -7.8, { t0: 29.8, intensity: 140, dist: 24 });

// Gerald: on the hay bale the whole night, embers drifting past, unbothered
const g = gerald({ scale: 1.5 }); world.add(g.root);
g.root.position.set(-3.2, 1.2, 0.2);
track('gerald', g.root, 0.4);
emit('spark', { at: [-3.6, 2.4, -0.6], t0: 30.5, rate: 5, jitter: 1.2 });
