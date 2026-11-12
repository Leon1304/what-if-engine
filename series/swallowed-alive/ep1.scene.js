// ---- world: open sea at z ≈ 300 (land ends at z = 200), whale insides far away on land (x = 2000 throat, x = 4000 stomach)
const Z = 0, WL = -0.3, Y = 300;   // insides float 300 m above the sea (closed, nothing outside is seen)
ground({ color: '#7A8A5A', coast: -150, depth: 40 });
water({ level: WL, waves: 0.35 });

// ---- the whale-watching boat
const S = ship('speedboat', 0, Z, { ry: 0 }); bob(S.g, { size: 4, depth: 0 }); track('boat', S.g, 1.5);
const st = S.seats;
const tourist = figure({ shirt: '#2E6FD9', pants: '#3A3F4A', build: 'woman', hairStyle: 'ponytail', expr: 'happy' }); world.add(tourist.root);
board(S, tourist, 0); react(tourist, 13.4, 'startle'); react(tourist, 47.9, 'startle'); phone(tourist, { t0: 46.6, t1: 60 });
const g = gerald(); S.g.add(g.root); g.root.position.set(st[1][0], st[1][1] + 0.05, st[1][2]); g.root.rotation.y = Math.PI / 2; track('gerald', g.root, 0.4);
food(S.g, 'popcorn', st[1][0] + 0.35, st[1][1] + 0.02, st[1][2] + 0.15, { still: true });

// ---- you on the boat: selfie, falls overboard, treads water, swallowed
const youA = char('you', { expr: t => t < 10.4 ? 'happy' : 'panic' }); world.add(youA.root); track('youA', youA);
board(S, youA, 2, { t1: 10.5 }); phone(youA, { t0: 7.1, t1: 10.6, light: false });
const sp = st[2];
fallDown(youA, 10.6, { from: [sp[0] + 0.6, sp[1] + 0.2, sp[2] + Z], to: [3.2, WL - 0.9, Z + 1], land: 'feet', until: 11.6 });
tread(youA, 11.6, 13.45, { level: WL }); vanish(youA.root, 13.35, { dur: 0.12 });
splash(3.2, Z + 1, 11.15, { size: 1.2 });

// ---- whale 1: spout behind the boat, lunges, swallows, dives
const W1 = sea({ kind: 'spermwhale', x: 3.2, y: WL - 1.2, z: Z - 40 }); track('W1', W1.g, 1);
fly(W1.g, [[3.2, WL - 1.4, Z - 40], [3.2, WL - 0.25, Z - 7.6], [3.8, WL - 5, Z + 6], [5, WL - 30, Z + 60]], { t0: 9.0, speed: 7.5 });
W1.do('spout', 6.0); W1.do('open', 11.9, { dur: 1.2 }); W1.do('bite', 12.95, { dur: 0.5 });

// ---- whale 2: surfaces next to the boat and throws you up
const W2 = sea({ kind: 'spermwhale', x: 10, y: WL - 14, z: Z - 30 }); track('W2', W2.g, 1);
fly(W2.g, [[10, WL - 14, Z - 30], [9.2, WL - 0.25, Z - 4], [9.2, WL - 0.3, Z - 2]], { t0: 40, speed: 6 });
W2.do('spout', 45.3); W2.do('open', 45.8, { dur: 1.8 });
const youD = char('you', { expr: t => t < 47.7 ? 'panic' : 'relieved' }); world.add(youD.root); track('youD', youD); dyn(youD.root);
const A0 = [9.2, WL + 0.4, Z + 6.2], A1 = [4.2, WL - 0.6, Z + 4.2];
tick(t => { const u = clamp((t - 46.5) / 1.05); youD.root.visible = t >= 46.5;
  if (t < 46.5 || t > 47.55) return;
  youD.root.position.set(lerp(A0[0], A1[0], u), lerp(A0[1], A1[1], u) + 4.2 * Math.sin(Math.PI * u), lerp(A0[2], A1[2], u));
  youD.root.rotation.set(-u * 5.5, -1.2, 0); pose(youD, 'panic', t * 3, t); });
tread(youD, 47.55, 60, { level: WL, at: [A1[0], A1[2]] }); splash(A1[0], A1[2], 47.55, { size: 1.6 });
emit('spray', { at: [A0[0], A0[1] + 0.3, A0[2]], t0: 46.4, t1: 46.9, rate: 120, speed: 6, spread: 0.4, size: 0.08, life: 1.2, g: -6 });

// ---- throat (x = 2000): you slide head-first, face up, flashlight on
const TH = innards(world, 2000, 0, { y: Y, kind: 'throat', len: 20, r: 1.7, closed: true, squeeze: [[16.5, 19], [27.5, 30], [31.5, 33.9]] });
glow(2000, Y + 2.6, -6, { intensity: 28, dist: 14, color: '#FF9E8A', flicker: 0 }); glow(2000, Y + 2.6, -15, { intensity: 28, dist: 14, color: '#FF9E8A', flicker: 0 });
const youB = char('you', { expr: t => t > 23.9 && t < 26.8 ? 'confused' : 'panic' }); world.add(youB.root); dyn(youB.root);
flashlight(youB, { t0: 0, t1: 34, intensity: 18 });
const head = dyn(grp(world)); track('youHead', head, 0); track('youB', youB, 0);
const zf = t => t < 15 ? -3 - 1.15 * clamp(t, 0, 4.9) : -1 - 0.85 * clamp(t - 15.6, 0, 18.4);
const yB = t => Y + 0.42 + 0.05 * Math.sin(t * 3);
holdRig(youB, 0, t => [2000 + 0.15 * Math.sin(t * 1.3), yB(t), zf(t)], { rot: t => [-Math.PI / 2 + 0.12, 0, 0.08 * Math.sin(t * 2), 'XYZ'], hide: t => !(t < 4.95 || (t > 15.55 && t < 33.95)) });
tick(t => { head.position.set(2000, yB(t) + 0.25, zf(t) - 1.62); pose(youB, 'panic', t * 2.4, t); });

// ---- stomach (x = 4000): you drop in, get up, kick the wall
const ST = innards(world, 4000, 0, { y: Y, kind: 'stomach', r: 4.4, squeeze: [[37, 39.5], [43.3, 45.2]], amp: 0.26 });
glow(4000.5, Y + 3.4, 1.5, { intensity: 34, dist: 12, color: '#FFC8A8', flicker: 0 });
const youC = char('you', { expr: t => t < 43 ? 'panic' : 'determined' }); world.add(youC.root); track('youC', youC);
fallDown(youC, 34.0, { from: [4000, Y + 3.4, 1.2], to: [4000, Y, 0.8], land: 'front', getUp: 36.4 });
kick(youC, 43.35); react(youC, 44.4, 'startle');
emit('bubble', { at: [3999.2, Y + 0.4, -1.6], t0: 34, t1: 46, rate: 3 });

biome('beach', { backdrop: 'islands', keep: [[0, 0, 60]] });
