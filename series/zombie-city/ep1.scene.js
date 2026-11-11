// Zombie City — the street: road along x (z = 0, 10 m wide), sidewalks at z ±5..9, towers behind, bridge + gate at x = 26
ground({ color: '#4E5A48', flat: 120, hills: 0 });
backdrop('skyline');
road(world, [[-48, 0], [27, 0]], { w: 10, curb: true, manholes: true });
for (const s of [-1, 1]) box(world, 75, 0.14, 4.2, '#9C9890', -10.5, 0, s * 7.1, { surf: 'paving' });
for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const x = -40 + i * 11.5 + (s > 0 ? 3 : 0); tower(world, x, s * 21, { w: 9, d: 9, h: 18 + hash(i * 3 + s) * 26, lit: 1 }); }
for (let i = 0; i < 6; i++) for (const s of [-1, 1]) streetlight(world, -38 + i * 12, s * 5.6, s > 0 ? Math.PI : 0);
busstop(world, 4, 7.6, Math.PI);
bench(world, -14, 7.6, Math.PI); trashcan(world, -2, 6.2); trashcan(world, 12, -6.2); hydrant(world, 9, 6.0);
roadBridge(world, 27, 80, 0, { w: 10 });
const BOOTH = tollBooth(world, 28.6, 7.0, { ry: Math.PI });
boomGate(world, 26.2, 5.7, { w: 11, ry: Math.PI / 2, close: 42.4, dur: 2.2 });
// smoke over the city
for (const [x, z, d] of [[-30, -40, 0], [10, -55, 1.3], [-60, 20, 2.1]]) { emit('smoke', { at: [x, 14, z], t0: -8 + d, rate: 5, size: 4 }); emit('fire', { at: [x, 13, z], t0: -8 + d, rate: 9, size: 1.6 }); }
// the bus, stopped in the middle of it (heading −x, doors on the sidewalk side)
const bus = vehicle(world, -6, 2.5, { kind: 'bus', ry: -Math.PI / 2, color: '#6A3FA0' });
headlights(bus, { t0: -5, t1: 99 });
// traffic jam
const JAM = [[-30, -2.6, 'car'], [-22, -2.6, 'van'], [-16, -2.6, 'taxi'], [-24, 2.6, 'car'], [-17, 2.6, 'pickup'], [5, -2.6, 'car'], [12, -2.7, 'taxi'], [16, 2.7, 'car'], [22, -2.6, 'sports'], [9, 2.7, 'van']];
JAM.forEach(([x, z, kind], i) => vehicle(world, x, z, { kind, ry: z < 0 ? Math.PI / 2 : -Math.PI / 2, color: ['#C0392B', '#2E86AB', '#E8C66A', '#5A6170', '#3E8A5A'][i % 5] }));
// the horde: around the bus, then the bus shelter; a second wave chases the scooter to the gate
const H1 = horde({ kind: 'zombie', n: 120, from: [-8, 1], r: 13, t0: -6, t1: 0.5, to: [4, 7.4], around: true, speed: [1.6, 2.3], mode: 'shamble', wait: { at: [-7, 3], until: 27.5 } });
const H2 = horde({ kind: 'zombie', n: 150, from: [-14, 0], r: 9, t0: 37.5, t1: 39, to: [23.2, 0.3], stop: 1.2, pile: true, speed: [3.0, 4.0], mode: 'run' });
LIVE.z = t => H1.count(t) + H2.count(t);
// you: out of the bus door, along the sidewalk, phone call, shelter, scooter
const you = char('you', { expr: t => t < 25.5 ? 'scared' : t < 33 ? 'annoyed' : 'scared' });
world.add(you.root); you.root.position.set(-9.8, 0, 4.4); track('you', you);
tick(t => { you.root.visible = t >= 15.2; });
walk(you, [[-9.8, 4.4], [-7.4, 8.2], [2.6, 8.4]], { t0: 15.3, speed: 4.6, mode: 'run' });
faceTo(you, [0, 0], 19.0, 32.2);
phone(you, { t0: 25.5, t1: 31.0 });
react(you, 31.3, 'facepalm'); react(you, 16.0, 'startle');
walk(you, [[2.6, 8.4], [4.0, 7.95]], { t0: 32.2, speed: 2.5 });
faceTo(you, [4.0, 0], 33.0, 37.6);
walk(you, [[4.0, 7.95], [6.4, 8.3], [8.0, 7.9]], { t0: 37.9, speed: 4.5, mode: 'run' });
const V = bike(world, { kind: 'scooter', x: 8.2, z: 7.8, ry: Math.PI });
rideBike(you, V, { t0: 38.8, t1: 99 });
drive(V, [[8.2, 7.8], [10, 4], [14, 0.4], [18, -1.2], [21, 0.9], [24.4, 0.3]], { t0: 38.8, speed: 4.2, dust: false });
// a guy filming everything
const film = figure({ shirt: '#E8C66A', pants: '#2E3A5C', hatStyle: 'cap', hat: '#1E1A18', expr: 'happy' }); world.add(film.root); film.root.position.set(14, 0, 7.4); faceTo(film, [12, 0], -5, 99);
phone(film, { t0: -5, t1: 99 });
// Dr. Steve, already in the shelter, then gone
const steve = char('steve', { expr: t => t < 33.6 ? 'smug' : 'scared' }); world.add(steve.root); steve.root.position.set(4.75, 0, 8.05); track('steve', steve);
faceTo(steve, [4.75, 0], -5, 33.8);
tick(t => { steve.root.visible = t >= 25.0; });
walk(steve, [[4.75, 8.05], [6.4, 8.7], [15, 9.3], [24, 9.0]], { t0: 33.9, speed: 5.2, mode: 'run' });
// Gerald: on the bus roof first, later already across the gate on the toll booth, with fries
const g1 = gerald(); world.add(g1.root); g1.root.position.set(-3.6, 3.15, 2.5); g1.root.rotation.y = 0.4;
const g2 = gerald(); world.add(g2.root); g2.root.position.set(...BOOTH.roof); g2.root.rotation.y = -Math.PI / 2; track('gerald', g2, 0.4);
tick(t => { g1.root.visible = t < 20.5; g2.root.visible = t >= 20.5 || t < -1; });
glow(27.6, 4.2, 5.2, { intensity: 10, dist: 7, color: '#FFE2B0', flicker: 0, t0: -10 });
const fries = food(world, 'fries', BOOTH.roof[0] - 0.35, BOOTH.roof[1], BOOTH.roof[2] + 0.3);
biome('city', { keep: [[0, 0, 40], [50, 0, 30]] });
