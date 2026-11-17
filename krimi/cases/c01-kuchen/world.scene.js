  // ---- Red String, case 1: the club-house kitchen (5 × 4 m), summer fete outside. Reconstruction 15:00–15:20 = t 0–40, last frame = crime scene ----
  const T0 = { drop: 11.55, print: 13.0, lick: [15.2, 18.8], crumbs: 23.2, pack: 25.0, scoop: 27.2, binIn: 29.9, wads: 30.3, dome: 33.4 };
  ground({ color: '#7E9A5A', flat: 120, hills: 0 });
  const R = interior(world, 0, 0, { kind: 'kitchen', w: 5, d: 4, h: 2.7, items: false, clutter: false, window: false, floorColor: '#6F7F8C', door: 'left', doorway: true, doorZ: 0.9,
    openings: [{ wall: 'right', kind: 'door', u: -0.6, open: 1.25, hinge: 'left' }, { wall: 'right', kind: 'window', u: 1.2, w: 1.1, h: 1.0, y: 1.0, curtain: '#C8352A' }] });
  // back wall: stove, long counter, fridge (4 cm gap under it); right wall: pedal bin, back door, coat hooks, sink under the window, shelf above
  const ST = furnish(world, 'stove', -2.05, -1.67, 0, { detail: true, w: 0.7 });
  const CT = furnish(world, 'counter', -0.5, -1.69, 0, { detail: true, w: 2.4 }), top = CT.top;
  const FR = furnish(world, 'fridge', 1.2, -1.65, 0, { detail: true });
  const SK = furnish(world, 'sink', 2.2, 1.2, -Math.PI / 2, { detail: true, w: 1.1 });
  const SH = FURN.wallShelf(world, 2.5, 1.2, -Math.PI / 2, { y: 2.2, w: 0.95 });
  const TH = thermos(world, 2.3, SK.top, 1.62, { ry: -2.2 });   // Otto's flask, forgotten since the fire-brigade fete
  const atEnd = t => t >= CFG.dur - 0.05;   // game events (opened lid, pocket, plaques) only show on the crime scene, not in the reconstruction
  const WC = wallClock(world, 0.25, 2.1, -1.99, { time: t => 15 + (t < T0.drop + 0.4 ? t / (T0.drop + 0.4) * 10 : 10 + (Math.min(t, 38.5) - T0.drop - 0.4) / (38.5 - T0.drop - 0.4) * 10 + Math.max(0, t - 38.5) / 4) / 60 });
  // cake under its glass dome, the fork bundle Timo was sent for, a jar of icing sugar
  const D = cakeDome(world, -0.95, top, -1.62), C = creamCake(world, -0.95, top + 0.0215, -1.62);
  const FK = cakeForks(world, -0.2, top, -1.5, { ry: 0.4 });
  food(world, 'cherry', 0.25, top, -1.75, { still: true, cream: true }); food(world, 'biscuit', 0.45, top, -1.7, { still: true });
  // note with a strawberry magnet on the fridge door (text from the case, language switch → redrawn)
  const N = paperNote(FR.door, liveText('scene.fridge_paper', 'TIMO!\nONE more broken thing\nand you\'re banned\nfrom the kitchen.\nDad'), { pad: true, x: 0.22, y: 0.6, z: FR.front + 0.001, rz: 0.05 });
  onLiveLang(() => N.set?.(liveText('scene.fridge_paper', 'TIMO!\nONE more broken thing\nand you\'re banned\nfrom the kitchen.\nDad')));
  // pedal bin by the back door: Timo hides the cracked plate under kitchen paper (29.9 / 30.3); the game opens it with the event 'bin_lid'
  const binOpen = keyed([[0, 0], [29.1, 0], [29.45, 1], [30.6, 1], [31.0, 0]]);
  const B = bin(world, 2.12, -1.62, { kind: 'pedal', r: 0.17, h: 0.46, open: t => Math.max(binOpen(t), atEnd(t) ? EASE.inOut(clamp(liveSince('bin_lid') / 0.5)) : 0) });
  const PL = cakePlate(B.inside, 0, 0.02, 0, { r: 0.125, crack: true, ry: 0.8 }); PL.g.rotation.x = 0.28; dyn(PL.g);
  for (let i = 0; i < 3; i++) cherry(PL.g, (hash(i * 5.3) - 0.5) * 0.12, PL.top + 0.012, (hash(i * 2.1) - 0.5) * 0.1, { r: 0.0105, stem: false, cream: true });
  { const cm = mat('#FBF7EF', { rough: 0.55, flat: false }), lm = mesh(PL.g, _kBlob('krestbin', 2, 0.22, 3.3, v => { v.y = v.y > 0 ? v.y * 0.7 : v.y * 0.2; }), cm, 0.01, PL.top + 0.006, 0, { cast: true }); lm.scale.set(0.08, 0.026, 0.07); }
  const W1 = trashBag(B.inside, 0.03, 0.07, 0.02, { kind: 'wad', size: 1.1 }), W2 = trashBag(B.inside, -0.04, 0.09, 0.03, { kind: 'wad', size: 0.9, seed: 3 });
  tick(t => { PL.g.visible = t >= T0.binIn; W1.visible = W2.visible = t >= T0.wads; });
  // coat hooks, Timo's rain jacket: the pocket holds the biscuit pack (open at 20.4–21.2 and 24.6–25.0 in the reconstruction, event 'timo_jacket' in the game)
  const H = coatHooks(world, 2.5, 1.62, 0.35, { ry: -Math.PI / 2, n: 2, w: 0.5 });
  const pocketK = keyed([[0, 0], [20.3, 0], [20.6, 1], [21.3, 1], [21.6, 0], [24.5, 0], [24.75, 1], [25.0, 1], [25.3, 0]]);
  const J = raincoat(world, ...H.hooks[1], { ry: -Math.PI / 2, color: '#E8B32A', pocket: t => Math.max(pocketK(t), atEnd(t) ? EASE.inOut(clamp(liveSince('timo_jacket') / 0.4)) : 0) });
  const BP = biscuitPack(J.inside, 0, 0, 0, {});
  // back door and window: nothing to move, but they can be clicked
  const DOORP = grp(world, 2.5, 1.0, -0.6), WINP = grp(world, 2.5, 1.62, 1.2);
  // outside: the fete — jury table with the other cakes under a gazebo roof, bunting, the garden
  const JT = furnish(world, 'table', 4.6, 1.5, Math.PI / 2, { w: 1.8, d: 0.8 });
  for (const [z, c] of [[0.9, '#7E0C1A'], [1.55, '#4A2818'], [2.15, '#E0A030']]) { const d = cakeDome(world, 4.6, 0.77, z, { r: 0.13, h: 0.21 }); creamCake(world, 4.6, 0.7915, z, { r: 0.1, h: 0.08, cherry: c, cherries: 9, seed: z * 7 }); }
  biome('farm', { area: 40, density: 0.5, keep: [[0, 0, 7], [4.6, 1.5, 2.5]] });

  // ---- people (looks from case.json people[].look) ----
  const hilde = figure({ build: 'old', hairStyle: 'bun', hair: '#E4E0D8', shirt: '#7A3F5E', skirt: '#3D3346', glasses: true, expr: 'calm' }); world.add(hilde.root);
  const marlene = figure({ build: 'woman', hairStyle: 'short', hair: '#B5562A', shirt: '#3F6B5A', pants: '#2C2C34', apron: '#F1EDE3', flour: true, expr: 'smug' }); world.add(marlene.root);
  const timo = figure({ build: 'kid', hatStyle: 'capBack', hat: '#D24A3A', shirt: '#3B7DD8', pants: '#4A5568', expr: t => t < T0.drop + 0.4 ? 'happy' : t < 26 ? 'shocked' : 'nervous' }); world.add(timo.root);
  const Bru = animal({ kind: 'dog', breed: 'dachshund', fur: '#8A4B22', collar: '#2F6FB0', cream: T0.lick[0] + 0.2, crumbs: T0.crumbs, x: 3.9, z: 0.5, ry: -1.6 });
  // Timo: in through the back door, dome off, cake up, two steps, it slips (11.95), a step into the spilt icing sugar (13.0) …
  timo.root.position.set(3.7, 0, -0.6); timo.root.rotation.y = -Math.PI / 2;
  walk(timo, [[3.7, -0.6], [2.2, -0.6], [0.4, -0.8], [-0.7, -1.0], [-0.95, -1.08]], { t0: 0.2, speed: 1.0 });
  shiftItem(timo, D.dome, 4.6, 5.3, { to: [-0.35, top, -1.74], both: true });
  carry(timo, C.g, { pick: 6.6, both: true, drop: T0.drop + 0.45 });
  walk(timo, [[-0.95, -1.08], [-0.55, -0.82], [0.05, -0.72]], { t0: 8.2, speed: 0.55 });
  const tHit = C.drop(T0.drop, { to: [0.12, -1.0], dir: 0.5 });
  rollTo(C.loose, tHit, [[0.3, -1.12], [0.9, -1.27], [1.14, -1.33], [1.2, -1.36]], { r: 0.0115, dur: 1.7 });
  groundDecal(world, -0.32, -1.02, { kind: 'powder', w: 0.5, d: 0.4, t0: tHit + 0.05, from: [0.3, 0.02], print: { x: 0.02, z: 0.02, ry: -0.5, size: 35, t: T0.print } });
  walk(timo, [[0.05, -0.72], [-0.3, -1.0]], { t0: 12.3, speed: 0.8 });
  react(timo, tHit + 0.05, 'startle'); react(timo, 13.6, 'facepalm', { dur: 1.2 });
  // Bruno smells it: in through the back door, licks the cream (15.2–18.8)
  walk(Bru, [[3.9, 0.5], [2.6, -0.55], [0.55, -0.8], [0.32, -0.92]], { t0: 12.4, speed: 1.4 });
  C.lick(...T0.lick); Bru.do('eat', T0.lick[0], { dur: T0.lick[1] - T0.lick[0] });
  // … Timo fetches biscuits from his jacket and lures Bruno out onto the step (crumbs 23.2), puts the pack back (25.0)
  walk(timo, [[-0.3, -1.0], [0.6, -0.35], [1.6, 0.3], [2.02, 0.47]], { t0: 18.2, speed: 1.2 });
  hands(timo, 'grip', 20.4, 21.4, { side: 'R' });
  walk(timo, [[2.02, 0.47], [2.1, -0.05], [2.3, -0.22]], { t0: 21.3, speed: 1.0 });
  walk(Bru, [[0.32, -0.92], [1.3, -0.75], [2.1, -0.72]], { t0: 21.5, speed: 1.1 });
  Bru.do('eat', T0.crumbs - 0.2, { dur: 0.8 }); Bru.do('sit', 24.6);
  walk(timo, [[2.3, -0.22], [2.1, 0.15], [2.02, 0.47]], { t0: 23.6, speed: 1.0 });
  hands(timo, 'grip', 24.5, 25.1, { side: 'R' });
  // … scoops the lump onto the cracked plate (27.2), carries it to the bin (29.9), paper on top (30.3) …
  walk(timo, [[2.02, 0.47], [0.9, -0.4], [0.42, -0.72]], { t0: 25.4, speed: 1.2 });
  C.scoop(T0.scoop);
  carry(timo, C.floorPlate.g, { pick: 27.6, both: true, drop: T0.binIn + 0.1 });
  walk(timo, [[0.42, -0.72], [1.2, -1.0], [1.9, -1.22]], { t0: 28.2, speed: 1.0 });
  DEFER.push(() => late(t => { if (t >= T0.binIn) C.floorPlate.g.visible = false; }));
  hands(timo, 'grip', T0.wads - 0.3, T0.wads + 0.2, { side: 'L' });
  // … puts the empty dome back on its board (33.4) and waits by the back door
  walk(timo, [[1.9, -1.22], [0.2, -1.0], [-0.4, -1.08]], { t0: 31.0, speed: 1.1 });
  shiftItem(timo, D.dome, T0.dome - 0.6, T0.dome, { to: [-0.95, top, -1.62], both: true });
  walk(timo, [[-0.4, -1.08], [0.6, -0.2], [1.3, 0.85]], { t0: 34.2, speed: 1.1 });
  // 15:20: Hilde comes in from the hall and finds the empty dome, Marlene behind her in the doorway
  hilde.root.position.set(-3.6, 0, 0.9); hilde.root.rotation.y = Math.PI / 2;
  walk(hilde, [[-3.6, 0.9], [-2.2, 0.85], [-1.75, 0.2], [-1.78, -0.32]], { t0: 35.0, speed: 1.05 });
  react(hilde, 38.6, 'gasp');
  marlene.root.position.set(-3.9, 0, 1.2); marlene.root.rotation.y = Math.PI / 2;
  walk(marlene, [[-3.9, 1.2], [-2.15, 0.95]], { t0: 36.6, speed: 1.0 });

  // ---- the game: clickable things (ids = case.json objects), clue plaques, standpoints, actors ----
  const P = (o, id, x) => pickable(o, id, x ?? {});
  P(CT, 'counter'); P(ST, 'stove'); P(FR, 'fridge'); P(SK, 'sink'); P(SH, 'shelf'); P(TH, 'otto_thermos', { look: { az: -95, el: 12, dist: 0.6 } }); P(WC.g ?? WC, 'wall_clock');
  P(D.g, 'cake_dome', { look: { az: 10, el: 25, dist: 0.7 } }); P(FK, 'cake_forks'); P(N.g, 'fridge_paper', { proxy: [0.17, 0.23, 0.04], look: { az: 0, el: 4, dist: 0.42 } });
  P(C.loose, 'cherry', { proxy: [0.12, 0.06, 0.12], look: { az: 8, el: 4, dist: 0.34, el0: 1 } });
  P(B, 'bin_lid');   // the whole bin opens its lid (container); the plate inside is its own pick once open P(PL.g, 'cracked_plate', { proxy: [0.26, 0.08, 0.26], look: { az: -70, el: 72, dist: 0.62 } });
  P(H.g, 'coat_hooks'); P(J.g, 'timo_jacket'); P(BP, 'biscuit_packet', { proxy: [0.08, 0.15, 0.06], look: { az: -100, el: 8, dist: 0.45 } });
  P(DOORP, 'back_door', { proxy: [0.14, 2.0, 0.9] }); P(WINP, 'window', { proxy: [0.14, 0.72, 1.1] });
  if (Bru.snout) P(Bru.snout, 'bruno_snout', { proxy: [0.08, 0.07, 0.1], look: { az: -60, el: 14, dist: 0.42 } }); if (Bru.collar) P(Bru.collar, 'bruno_fur', { proxy: [0.14, 0.1, 0.12], look: { az: -100, el: 30, dist: 0.5 } });
  // the spilt icing sugar: a pick box over the patch on the floor
  const SUG = grp(world, -0.32, 0.01, -1.02); P(SUG, 'sugar_patch', { proxy: [0.5, 0.03, 0.4], look: { az: 15, el: 58, dist: 0.75 } });
  liveActor('hilde', hilde, { pick: true }); liveActor('marlene', marlene, { pick: true }); liveActor('timo', timo, { pick: true });
  // yellow clue plaques beside every clue the player has found, numbered in order (liveFound ← events 'found:<obj>')
  const MPOS = { fridge_paper: [0.82, -1.15], cherry: [1.66, -1.18], sugar_patch: [0.02, -0.82], bruno_fur: [1.85, -1.0], biscuit_packet: [2.18, 0.72], cracked_plate: [1.78, -1.3] };
  const MK = []; for (let n = 1; n <= 8; n++) { const m = evidenceMarker(world, 0, 0, 0, { n, ry: 0.3 * n }); dyn(m.g); m.g.visible = false; MK.push(m.g); }
  tick(t => { for (const g of MK) g.visible = false; if (!atEnd(t)) return; for (const f of liveFound()) { const g = MK[f.n - 1], p = MPOS[f.obj]; if (!g || !p) continue; g.visible = true; g.position.set(p[0], 0, p[1]); } });
  liveViews({
    v_entry: { at: [1.3, 1.0, 0.6], az: -78, el: 14, dist: 2.7, fov: 52 },
    v_counter: { at: [-0.55, 0.6, -1.25], az: 12, el: 30, dist: 2.0, fov: 50 },
    v_back: { at: [1.75, 0.55, -0.85], az: -58, el: 24, dist: 2.2, fov: 50 }
  });
  Object.assign(LIVE, { C, B, J, N, timo, hilde, marlene, Bru });
