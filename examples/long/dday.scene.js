// D-Day — one world for the 16:9 film and the 9:16 short. Event times come from EV (story).
const inWin = (t, W) => W.some(([a, b]) => t >= a && t < b);
const gate = (obj, W) => { const r = obj?.root ?? obj?.g ?? obj; if (!r) return obj; dyn(r); tick(t => { r.visible = inWin(t, W); }); return obj; };
const gateNew = (W, fn) => { const before = new Set(world.children), out = fn(); for (const c of [...world.children]) if (!before.has(c)) { dyn(c); tick(t => { c.visible = inWin(t, W); }); } return out; };
const NEVER = [[-9, -8]], OLIVE = ['#5B6340', '#626B45', '#545C3C', '#6A6A48'], PANTS = ['#4E5536', '#59603F', '#4A5034'], SKIN = ['#E8BC98', '#D9A47E', '#C68E68', '#F0C9A8'];
tick(() => { const c = document.getElementById('chan'); if (c && c.textContent !== '@whatifthishappenedscenarios') c.textContent = '@whatifthishappenedscenarios'; });
const at3 = (x, z, dy = 0) => [x, groundH(x, z) + dy, z];
const mark = (name, x, z, dy = 1) => { const o = new THREE.Object3D(); o.position.set(x, groundH(x, z), z); world.add(o); track(name, o, dy); return o; };

// ---------- terrain: Omaha-like beach under a bluff, cliff to the west, bocage inland ----------
ground({ size: 720, coast: 60, beach: 46, flat: 95, hills: 9, color: '#5E7C3B', sand: '#D2BE8C' });
const ST = EV.storm ?? [1e4, 1e4];
water({ level: -0.3, size: 1150, seg: 170, color: '#355E70', shallow: '#4E8A8C', waves: t => lerp(0.42, 1.55, clamp((t - ST[0] + 0.6) / 0.6) * (1 - clamp((t - ST[1]) / 0.6))) });
ridge({ x0: -175, x1: 175, foot: 14, crest: -12, back: -82, end: -128, h: 17, grass: '#5C7A39', face: '#8E7C57' });
ridge({ kind: 'cliff', x0: -440, x1: -292, foot: 47, crest: 46, back: -30, end: -70, h: 28, taper: 16 });

// ---------- Atlantic Wall ----------
const LANES = [-46, -20, 6, 30, 52], keep = [];
for (const x of [...LANES, -6]) for (let z = 30; z <= 58; z += 4) keep.push([x, z, 4.6]);
const OBS = beachObstacles(world, { x0: -84, x1: 84, rows: [33, 39, 45, 51], gap: 6.4, keep, seed: 6 });
hedgehog(world, -11.2, 43); hedgehog(world, -1.6, 38.6); hedgehog(world, -9.4, 34.2);
const st1 = OBS.find(o => o.kind === 'stake' && o.x > -40 && o.x < 30) ?? OBS[1], rp1 = OBS.find(o => o.kind === 'ramp' && o.x > -50 && o.x < 40) ?? OBS[2];
mark('stake', st1.x, st1.z, 1.8); mark('ramp', rp1.x, rp1.z, 1.0);
const BK = [bunker(world, -28, -5, { kind: 'casemate', ry: 0.12 }), bunker(world, 36, -7, { kind: 'casemate', ry: -0.18 }), bunker(world, -64, 1, { kind: 'pillbox', ry: 0.25 }),
  bunker(world, 9, -1, { kind: 'pillbox' }), bunker(world, 54, 3, { kind: 'tobruk', ry: -0.3 }), bunker(world, -45, 4, { kind: 'tobruk', ry: 0.2 })];
mark('cas1', -28, -5, 2);
wire(world, [[-96, 17.2], [-52, 16.2], [-30, 17]]); wire(world, [[-15, 16.6], [20, 16.1], [44, 17]]); wire(world, [[60, 16.6], [98, 17.4]]);
sandbags(world, 54, 6.4, { len: 3.2, ry: -0.3, y: groundH(54, 6.4) - 0.1 }); sandbags(world, -45, 7.2, { len: 3.2, ry: 0.2, y: groundH(-45, 7.2) - 0.1 });
for (const x of [-120, -80, 75, 118]) bunker(world, x, -2, { kind: x < 0 ? 'pillbox' : 'tobruk' });
hedgerow(world, [[-150, -70], [-60, -66], [20, -74], [110, -68], [160, -72]], { seed: 2 });
hedgerow(world, [[-30, -66], [-26, -120]], { seed: 5 }); hedgerow(world, [[70, -70], [76, -125]], { seed: 8 });

// ---------- the fleet offshore (anchored; balloons) ----------
const FW = EV.fleet ?? NEVER, fleet = [];
const BS = ship(world, 'battleship', -90, 430, { ry: Math.PI * 0.6 }); bob(BS.g, { size: 60, depth: 0 }); fleet.push(BS);
for (const [x, z, ry] of [[70, 300, 0.45], [-200, 330, 0.7], [160, 380, 0.4], [-20, 520, 0.6]]) { const D = ship(world, 'destroyer', x, z, { ry: Math.PI * ry }); bob(D.g, { size: 30, depth: 0 }); fleet.push(D); }
for (let i = 0; i < 9; i++) { const L = ship(world, 'landing', -110 + i * 28 + hash(i) * 8, 170 + hash(i * 3) * 60, { ry: Math.PI * (0.9 + hash(i * 7) * 0.2) }); bob(L.g, { size: 5, depth: 0 }); fleet.push(L); }
for (const S of fleet) gate(S.g, FW);
for (const [S, h] of [[fleet[0], 55], [fleet[1], 48], [fleet[2], 50], [fleet[4], 44]]) { const Bb = barrageBalloon(world, { at: () => [S.g.position.x, 9, S.g.position.z], h, seed: h }); gate(Bb.g, FW); gate(Bb.line, FW); }
track('bship', BS.g, 10);

// ---------- a landing wave: boats, ramps, soldiers, fire from the bluff (no one is shown being hit) ----------
function battle(T0, T1, o = {}) {
  const W = [[T0 - 14, T1]], sd = o.seed ?? 1, A = o.arrive ?? T0 + 2;
  LANES.forEach((x, i) => {
    const Ta = A + (o.lag ?? [1.2, 3.0, 0.4, 2.2, 3.6])[i], z0 = 64 + (i % 2) * 1.6, start = z0 + 4.6 * 30;
    const S = ship(world, 'landing', x, start, { ry: Math.PI }); sail(S, [[x, start], [x, z0]], { t0: Ta - 30, speed: 4.6, len: S.len }); rampDown(S, Ta + 0.4); gate(S.g, W);
    if (o.utah && i === 0) track('utah', S.g, 1.6);
    gateNew(W, () => horde({ kind: 'human', n: 26, from: [x, z0 - 6.2], r: 1.4, to: [x + (hash(i + sd) - 0.5) * 16, o.climb ? -26 : 20], t0: Ta + 1.0, t1: Ta + 7, speed: [2.4, 4.0], mode: 'run',
      wait: { line: [[x - 11, 19.5], [x + 11, 19.5]], until: o.climb ?? 1e9 }, shirts: OLIVE, pants: PANTS, skin: SKIN }));
  });
  // hero boat in the middle lane: six soldiers, ramp, run for the hedgehogs
  const Th = A + (o.heroLag ?? 0), H = ship(world, 'landing', -6, 64 + 4.6 * 30, { ry: Math.PI }); sail(H, [[-6, 64 + 4.6 * 30], [-6, 64]], { t0: Th - 30, speed: 4.6, len: H.len }); rampDown(H, Th + 0.4); gate(H.g, W);
  track(o.hero ?? 'hero1', H.g, 1.4);
  const sq = squad('soldier', 6, { weapon: 'rifle', seed: sd * 7 + 3, at: [-6, 64] }), cover = [[-11.4, 44.5], [-2.0, 40.1], [-9.2, 35.7], [-12.6, 45.3], [-0.6, 40.8], [-8.0, 36.6]];
  sq.forEach((f, i) => { const tj = Th + 1.0 + i * 0.32, a0 = seatAt(H, i, tj), a1 = [-6 + (i - 2.5) * 0.4, 58.5], L = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) + Math.hypot(cover[i][0] - a1[0], cover[i][1] - a1[1]), ta = tj + L / 3.4 + 0.6;
    board(H, f, i, { t1: tj }); walk(f, [a0, a1, cover[i]], { t0: tj, t1: ta, speed: 3.4, mode: 'run' }); walk(f, [cover[i], [cover[i][0] + 0.3, cover[i][1] - 0.4]], { t0: ta + 0.05, speed: 0.6, mode: 'sneak', endMode: 'sneak' }); gate(f, W);
    if (o.coverTrack && i === 0) track(o.coverTrack, f, 0.9); });
  // fire from the bluff
  BK[4].mg(T0 + 0.6, T1 - 0.3, { at: [[-40, 54], [30, 36]], flash: 0.55, sound: 0.35, seed: sd * 3 + 1 });
  BK[5].mg(T0 + 1.4, T1 - 0.3, { at: [[48, 52], [-30, 40]], flash: 0.55, sound: 0.3, seed: sd * 5 + 2 });
  BK[3].mg(T0 + 2.2, T1 - 0.3, { at: [[-60, 46], [60, 30]], flash: 0.55, sound: 0.25, seed: sd * 11 + 4, rate: 7 });
  for (let t = T0 + 1.5, k = 0; t < T1 - 1; t += 2.6 + hash(sd + k) * 2.4, k++) {   // shells: splashes in the surf, bursts on the sand between the lanes
    const x = LANES[k % 5] + 12 + (hash(k * 3.1 + sd) - 0.5) * 6, z = hash(k * 5.3 + sd) < 0.55 ? 68 + hash(k) * 30 : 30 + hash(k * 2.2) * 18;
    sfx(t - 1.0, 'whistle', 0.5); if (z > 62) { splash(x, z, t, { size: 4.2 }); sfx(t, 'boom', 0.55); emit('debris', { at: [x, 0, z], t0: t, burst: 40, colors: ['#E8F6FF', '#BFD9E5'], size: 0.22, speed: 12, spread: 0.25, basic: true, life: 1.8 }); }
    else { explode(x, groundH(x, z), z, t, { size: 1.1, crater: false, fx: false }); sfx(t, 'explosion', 0.5); }
    if (k % 3 === 0) BK[k % 2].fire(t - 0.6);
  }
  for (const [x, z] of [[-34, -36], [22, -42], [-74, -32], [58, -46]]) emit('smoke', { at: at3(x, z, 1), t0: T0 - 14, t1: T1, rate: 2.5, size: 3, speed: 1.6, opacity: 0.32, wind: [1.2, 0] });   // burning grass on the bluff
  return { sq };
}
if (EV.open) battle(EV.open[0], EV.open[1], { seed: 1, arrive: EV.open[0] + 2.0, hero: 'hero1' });
if (EV.land) battle(EV.land[0], EV.land[1], { seed: 2, arrive: EV.landArrive, heroLag: (EV.heroArrive ?? EV.landArrive) - EV.landArrive, hero: 'hero2', coverTrack: 'cover', climb: EV.climb, utah: true });

// dawn bombardment: battleship salvo, bombers over the bluff (their bombs fall inland)
if (EV.salvo) { for (const t of EV.salvo) { salvo(BS, t, { at: [-20 + hash(t) * 40, 20, -40] }); } }
if (EV.bomb) { const bw = [[EV.bomb - 12, EV.bomb + 10]]; for (let i = 0; i < 4; i++) { const A2 = aircraft({ kind: 'bomber', x: -60 + i * 26, y: 70, z: 160 }); fly(A2, [[-60 + i * 26, 70 + i * 3, 160 + i * 10], [-60 + i * 26, 72, -400]], { t0: EV.bomb - 6, speed: 42 }); A2.drop(EV.bomb + 0.6 + i * 0.5, { n: 6, interval: 0.18 }); gate(A2.g ?? A2, bw); } }

// Pointe du Hoc: rangers on ropes
if (EV.cliff) { const W = [EV.cliff], T = EV.cliff[0];
  for (const [x, k] of [[-374, 0], [-366, 1], [-357, 2], [-349, 3]]) { const top = [x, 28.6, 45.6], bot = [x + 0.3, 0.2, 47.6]; gate(rope(top, bot, { r: 0.025, sag: 0.05 }), W);
    if (k < 3) { const f = warrior('soldier', { seed: 40 + k, weapon: 'rifle', at: [x, 47.3] }); climb(f, { at: [x, 47.5], ry: Math.PI, y0: 5 + k * 3.5, y1: 27, t0: T + 0.4 + k * 0.5, speed: 1.15, ladder: false }); gate(f, W); if (k === 1) track('ranger', f, 1.0); } }
  for (let i = 0; i < 4; i++) { const f = warrior('soldier', { seed: 50 + i, weapon: 'rifle', at: [-370 + i * 5, 49 + hash(i) * 2], ry: Math.PI }); gate(f, W); }
  const L2 = ship(world, 'landing', -362, 58, { ry: Math.PI * 0.95 }); bob(L2.g, { size: 5, depth: 0 }); gate(L2.g, W);
  for (let k = 0; k < 4; k++) { explode(-380 + k * 12, 28, 30 - k * 4, T + 1.5 + k * 2.6, { size: 1.2, fx: false }); sfx(T + 1.5 + k * 2.6, 'explosion', 0.5); } }

// inland on the bluff top
if (EV.inland) { const W = [EV.inland], T = EV.inland[0];
  gateNew(W, () => horde({ kind: 'human', n: 30, from: [8, -30], r: 6, to: [-2, -110], t0: T - 0.5, t1: T + 3, speed: [1.2, 1.7], mode: 'walk', shirts: OLIVE, pants: PANTS, skin: SKIN }));
  const Tk = tank(world, 18, -24, { color: '#5A6440', ry: Math.PI }); drive(Tk, [[18, -24], [12, -60], [4, -100]], { t0: T, speed: 3 }); gate(Tk, W); }

// evening: calm beach, boats and vehicles
if (EV.evening) { const W = [EV.evening];
  for (let i = 0; i < 7; i++) { const L = ship(world, 'landing', -70 + i * 22, 64 + (i % 2) * 2, { ry: Math.PI }); rampDown(L, EV.evening[0] - 5, { sfx: false }); gate(L.g, W); }
  for (let i = 0; i < 5; i++) { const Tk = tank(world, -50 + i * 24, 30 + hash(i) * 10, { color: '#5A6440', ry: Math.PI + (hash(i * 3) - 0.5) * 0.4 }); gate(Tk, W); }
  for (let i = 0; i < 3; i++) { const V = vehicle(world, -20 + i * 16, 24, { kind: 'truck', color: '#5A6440', ry: Math.PI }); gate(V, W); }
  gateNew(W, () => horde({ kind: 'human', n: 60, from: [0, 40], r: 30, to: [0, 18], t0: EV.evening[0] - 4, t1: EV.evening[0] - 3.9, speed: [0.6, 1.0], mode: 'walk', shirts: OLIVE, pants: PANTS, skin: SKIN })); }

// ---------- the storm ----------
if (EV.storm) { lightningStorm(ST[0], ST[1], { every: 2.4 }); for (const [x, z] of [[50, 270], [-20, 250], [-80, 420]]) emit('rain', { at: [x, 0, z], t0: ST[0], t1: ST[1], area: [80, 80], height: 30 }); for (const [a, b] of EV.lens ?? []) lensRain(a, b, 0.6); }

// ---------- the night: airborne drop over the bocage ----------
if (EV.night) { const W = [EV.night], T = EV.night[0];
  for (const L of [[[-130, -170], [-40, -168], [60, -175], [140, -170]], [[-130, -290], [0, -300], [130, -292]], [[-40, -168], [-44, -300]], [[60, -175], [64, -292]], [[-130, -170], [-128, -290]], [[140, -170], [138, -292]]]) hedgerow(world, L, { seed: L[0][0] });
  house(world, 26, -244, { ry: 0.3 }); field(world, -86, -230, 60, 80, { crop: 'wheat' });
  const planes = [];
  for (let i = 0; i < 6; i++) { const x = -40 + (i % 3) * 28 + (i > 2 ? 14 : 0), y = 120 + (i % 2) * 6, z0 = 260 + Math.floor(i / 3) * 40, A2 = aircraft({ kind: 'cargo', x, y, z: z0 });
    fly(A2, [[x, y, z0], [x, y, -700]], { t0: EV.drop + i * 0.4 - (z0 + 230) / 46, speed: 46 }); planes.push(A2); gate(A2.g ?? A2, W);
    gateNew(W, () => paradrop(A2, EV.drop + i * 0.4, 5, { every: 0.45 })); }
  flak({ t0: T - 1, t1: EV.night[1], rate: 2.4, box: [[-160, 160], [140, 260], [-380, -120]], tracers: { from: [[-90, -265], [70, -310], [-20, -335]], rate: 5 }, sound: 0.3 });
  for (const [x, z, a] of [[-80, -270, 10], [60, -320, -15], [120, -250, -35]]) searchlight(world, x, z, { t0: T - 1, t1: EV.night[1], az: t => a + 22 * Math.sin(t * 0.33 + x) });
  const sq = squad('soldier', 4, { weapon: 'rifle', seed: 77, at: [22, -236], ry: -0.6 }); sq.forEach(f => gate(f, W)); flashlight(sq[0], { t0: T, t1: EV.night[1] }); }

// ---------- England: the rubber army ----------
if (EV.inflate) { const T = EV.inflate, cx = 150, cz = -196;
  for (let i = 0; i < 6; i++) { const I = inflatable(world, cx - 10 + (i % 3) * 9, cz - 6 + Math.floor(i / 3) * 12, { kind: 'tank', ry: 0.15, t0: T + i * 0.55, dur: 2.6 }); if (i === 4) track('decoy1', I.g, 1.2); }
  inflatable(world, cx + 20, cz - 4, { kind: 'truck', ry: -0.2 }); inflatable(world, cx + 22, cz + 7, { kind: 'gun', ry: -0.2 });
  const P = inflatable(world, cx - 18, cz + 14, { kind: 'tank', ry: Math.PI / 2 }), pu = warrior('soldier', { seed: 91, weapon: false, at: [cx - 22.5, cz + 14], ry: Math.PI / 2 });
  push(pu, P.g, { t0: EV.push, t1: EV.push + 6, to: [cx - 8, cz + 15] }); track('pusher', pu, 1.1);
  for (let i = 0; i < 5; i++) { const g = stat(grp(world, cx - 30 + i * 7, groundH(cx - 30 + i * 7, cz - 22), cz - 22, 0)); prism(g, 3.2, 2.2, 4.4, '#7B7A5C', 0, 0, 0); }
  squad('soldier', 3, { weapon: 'rifle', seed: 12, at: [cx + 6, cz - 16], ry: 0.4 });
  const R = aircraft({ kind: 'fighter', x: cx + 200, y: 160, z: cz }); fly(R, [[cx + 260, 150, cz + 40], [cx - 400, 170, cz - 60]], { t0: EV.recon - 3, speed: 90 }); }

// ---------- war room with the maps ----------
warRoom(world, 2000, 0, { w: 14, d: 10, h: 3.6, y: 0, wallMap: 'channel', wallW: 3.6, wallX: 0, light: 30 });
const EUm = warMap(world, EUMAP.x, EUMAP.z, { region: 'europe', w: EUMAP.w, y: 0, title: 'WESTERN EUROPE · SPRING 1944' });
const NMm = warMap(world, NMAP.x, NMAP.z, { region: 'normandy', w: NMAP.w, y: 0, drops: true, title: 'OPERATION NEPTUNE · 6 JUNE 1944' });
const MV = EV.map ?? {}, DE = '#6A6F64', UKc = '#C8402F', USc = '#3B7FD9';
if (MV.occ != null) {
  [[2.4, 47.5], [0.2, 48.6], [4.2, 49.4], [1.6, 50.4], [5.2, 51.7], [-1.0, 48.1], [6.4, 50.6], [9.6, 50.6], [11.2, 52.2], [8.6, 48.6]].forEach(([lo, la], i) => EUm.piece(lo, la, { kind: 'block', color: DE, t0: MV.occ + i * 0.18, t1: MV.hide2 }));
  [[-1.2, 51.6], [-2.4, 51.2], [-0.4, 52.4], [-3.4, 50.7]].forEach(([lo, la], i) => EUm.piece(lo, la, { kind: 'block', color: UKc, t0: MV.brit + i * 0.2 }));
  EUm.pin(-0.13, 51.5, { t0: MV.brit + 0.4, t1: MV.hide1 });
  EUm.label('EASTERN FRONT →', 12.4, 50.3, { t0: MV.east, t1: MV.hide1, size: 0.13 });
  [[9.6, 50.6], [11.2, 52.2]].forEach(([lo, la], i) => EUm.piece(lo, la, { kind: 'block', color: DE, t0: MV.east - 0.3, to: [14.3, la + 0.3], move: [MV.east + 0.4 + i * 0.3, MV.east + 2.6], t1: MV.hide1 }));
  EUm.label('A SECOND FRONT?', -0.6, 50.15, { t0: MV.second, t1: MV.hide1, size: 0.12 });
  [[-8.2, 48.6], [-8.2, 49.6], [-8.2, 50.4]].forEach(([lo, la], i) => EUm.piece(lo, la, { kind: 'ship', color: USc, t0: MV.ships + i * 0.25, to: [-1.8 + i * 0.6, 50.6], move: [MV.ships + 0.4, MV.ships + 4.5], scale: 1.2 }));
  [[-1.8, 51.0], [-0.9, 51.3], [-2.8, 51.2]].forEach(([lo, la], i) => EUm.piece(lo, la, { kind: 'block', color: USc, t0: MV.ships + 4.6 + i * 0.25 }));
  EUm.label('TEHRAN, NOV 1943: INVADE FRANCE IN 1944', 3.4, 54.9, { t0: MV.tehran, t1: MV.hide1, size: 0.12 });
  MAPA.over = EUm.arrow([[-1.2, 50.7], [-0.7, 49.9], [0.4, 49.0], [2.6, 48.8], [6.0, 49.6], [8.6, 50.2]], { t0: MV.overlord, t1: MV.overlord + 4.5, color: USc, w: 0.06, t1hide: 0 });
  EUm.label('OPERATION OVERLORD', 2.0, 47.9, { t0: MV.overlord + 1.2, t1: MV.hide1, size: 0.13 });
  EUm.arrow([[1.3, 51.12], [1.84, 50.97]], { t0: MV.calais, t1: MV.calais + 0.8, color: DE, w: 0.04, head: true }); EUm.label('~30 km', 1.0, 50.7, { t0: MV.calais + 0.6, size: 0.1 });
  EUm.pin(1.86, 50.95, { t0: MV.calais - 0.6, color: '#555' });
  EUm.arrow([[-1.1, 50.75], [-1.0, 50.1], [-0.85, 49.45]], { t0: MV.normandy, t1: MV.normandy + 1.6, color: USc, w: 0.05, layer: 1 }); EUm.pin(-1.62, 49.64, { t0: MV.normandy + 2.2 }); EUm.label('NORMANDY', -0.5, 49.05, { t0: MV.normandy + 1.4, size: 0.12 });
  EUm.arrow([[0.9, 51.25], [1.5, 51.05], [1.8, 50.98]], { t0: MV.fake, t1: MV.fake + 1.4, color: '#8E8E86', w: 0.05, layer: 2 }); EUm.label('FAKE ARMY', 0.4, 51.55, { t0: MV.fake + 1, size: 0.1 });
  [[2.2, 50.7], [2.9, 50.5], [2.4, 50.2]].forEach(([lo, la], i) => EUm.piece(lo, la, { kind: 'block', color: DE, t0: MV.fake + 2 + i * 0.25 }));
  EUm.arrow([[-0.4, 49.3], [0.9, 49.1], [2.2, 48.9]], { t0: MV.paris, t1: MV.paris + 2.2, color: USc, w: 0.05, layer: 3 }); EUm.label('PARIS · 25 AUG 1944', 2.4, 48.45, { t0: MV.paris + 2, size: 0.11 });
  EUm.arrow([[2.6, 49.2], [5.6, 50.3], [8.4, 50.9]], { t0: MV.end, t1: MV.end + 2.4, color: USc, w: 0.06, layer: 3 }); EUm.arrow([[14.5, 52.2], [13.4, 52.5]], { t0: MV.end + 0.6, t1: MV.end + 2, color: UKc, w: 0.05, layer: 3 });
  EUm.label('MAY 1945 · WAR IN EUROPE ENDS', 9.2, 53.6, { t0: MV.end + 2.2, size: 0.12 });
  NMm.label('D-DAY: 6 JUNE', -0.6, 49.62, { t0: MV.go, size: 0.1 });
  for (const [n, a, b, l, side] of BEACHES) { const tt = MV.beaches + (side === 'us' ? 0 : 3.2) + (n === 'OMAHA' ? 0.5 : n === 'JUNO' ? 0.5 : n === 'SWORD' ? 1 : 0); NMm.arrow([[l[0], l[1] + 0.25], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.02]], { t0: tt, t1: tt + 1.2, color: WM_COL[side], w: 0.035 }); }
}

// ---------- remembrance: the cemetery above the beach ----------
cemetery(world, -112, -44, { rows: 9, cols: 22, gap: [2.0, 2.7], t0: EV.cem ?? 1e9, y: groundH(-112, -44) + 0.05 });
for (let i = 0; i < 12; i++) tree(world, -142 + i * 5.5, -66, { kind: 'pine', size: 1.2 });

biome('farm', { keep: [[0, 36, 100], [-112, -44, 32], [150, -196, 62], [2000, 0, 30], [-365, 50, 40], [0, -230, 30]] });
