// MB1 megalodon-pool: villa terrace with an infinity pool at the origin (deck y 1.9, infinity edge z = 5), slope and sea towards +z
const T = ST;   // scene times after the slow-motion (39.8)
ground({ color: '#9DB36A', coast: 9, depth: 5 }); water({ level: -0.3 });
house(world, 0, -14, { w: 11, d: 6, h: 3.6 });
const P = swimPool(world, 0, 0, { w: 5.5, d: 16, h: 3.0, drain: [T(42.3), T(45.2)] });
const DB = divingBoard(world, 0, 3.0, -9.6, { len: 2.6 });
for (const [x, z] of [[-4.6, -5], [-4.6, -1], [4.6, -3], [4.6, 2]]) { const g = stat(grp(world, x, 3.05, z, Math.PI / 2)); box(g, 0.66, 0.05, 1.7, '#F2F2F2', 0, 0.3, 0); box(g, 0.66, 0.55, 0.05, '#F2F2F2', 0, 0.32, -0.85, { rx: -0.6 }); }

// you on the leaking float, then the diving board
const AB = airbed(world, 0, t => P.level(t), -6.6, { color: '#2ECC71', deflate: [8.8, 37.9], pop: 38.0 }); track('bed', AB.g, 0.2);
const you = char('you', { expr: t => t < 1.6 ? 'nervous' : t < 5.2 ? 'panic' : t < 8.6 ? 'happy' : t < T(47) ? 'panic' : 'relieved' }); world.add(you.root); track('you', you);
sit(you, 0, { seat: AB.g, h: 0.12, t1: 38.0 });
react(you, 9.0, 'startle'); react(you, 24.2, 'startle', { dur: 1.2 }); for (const t of [24.3, 24.8]) splash(0.6, -6.6, t, { size: 0.8 });
const hang = [0, DB.tip[1] - 2.05, DB.tip[2] - 0.15];
late(t => { if (t < 38.25) return; const k = clamp((t - 38.25) / 0.35), r = you.root; r.position.set(lerp(0, hang[0], k), lerp(P.level(t) + 0.1, hang[1], k) + Math.sin(Math.PI * k) * 0.5, lerp(-6.6, hang[2], k)); r.rotation.y = 0; });
you.fx.push((t, S) => { const e = clamp((t - 38.25) / 0.3); if (!e) return; S.las = S.ras = lerp(S.las, -3.0, e); S.lae = S.rae = lerp(S.lae, 0, e); S.laz = -0.12 * e; S.raz = 0.12 * e; S.lt = lerp(S.lt, 0.15 + 0.15 * Math.sin(t * 7), e); S.rt = lerp(S.rt, 0.15 - 0.15 * Math.sin(t * 7), e); S.lk = S.rk = lerp(S.lk, 0.4, e); S.H = lerp(S.H, 0.84, e); });

// the Megalodon: too long for the pool, tail over the infinity edge
const SH = sea({ kind: 'megalodon', x: 0, y: 1.5, z: 4, len: 18 }); SH.g.rotation.y = Math.PI; SH.g.scale.set(0.66, 0.66, 1); track('shark', SH.g, 0.6);
tick(t => { const g = SH.g, lunge = bump(t, 24.9, 1.4) * 1.0 + bump(t, T(39.6), 1.0) * 2.0, k = EASE.inOut(clamp((t - T(42.4)) / (T(45.6) - T(42.4))));
  g.position.z = 4 + 0.35 * Math.sin(t * 0.45) - lunge + k * 26; g.position.y = 1.5 - k * 4.6; g.rotation.x = -0.18 * k; });
SH.do('open', 24.9, { dur: 1.2 }); SH.do('bite', 25.6); SH.do('bite', T(40.0)); SH.do('thrash', T(42.6), { dur: 2 });

// the wall breaks: the water rushes down the slope and takes the shark
breakApart(P.wall, T(42.0), { dir: [0, -0.3, 1], power: 4 });
emit('spray', { at: [0, 2.8, 8.3], t0: T(42.1), t1: T(45.6), rate: 220, speed: 4.5, spread: 1.4, size: 0.28, life: 1.3 });
const sheet = dyn(grp(world, 0, 0, 8.2)); { const m = box(sheet, 4.4, 0.06, 13, '', 0, 0, 6.5, { mat: mat('#8FD6F0', { own: true, opacity: 0.6, rough: 0.05 }), cast: false }); m.position.y = 2.6; sheet.rotation.x = 0.3; }
tick(t => { sheet.visible = t > T(42.1) && t < T(45.8); });

// Gerald on his flamingo, rides the water down into the empty pool
const FL = floatie(world, 2.0, t => P.level(t), -1.2, { kind: 'flamingo', ry: 0.6 }); const ger = gerald({ scale: 1.5 }); FL.seat.add(ger.root); track('gerald', ger.root, 0.4);
biome('beach', { keep: [[0, 0, 15]] });
