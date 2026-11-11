// Earth Glitch ep1 — a backyard on a Saturday; gravity switches off for 5 seconds (stretched in slow motion until TG)
const B = BEATS, TG = B[8].t + 0.5, GR = 9.8, HC = 0.95, MATY = 0.95, TR = [-4, 2], NP = [-15, 2];
ground({ color: '#6DAA4A', flat: 42, hills: 6 });

// ---- houses, fences, patio ----
house(world, 2, -13, { w: 11, d: 7, h: 6, wall: '#EADCC6', roof: '#8A3E2E', porch: true });
house(world, -20, -12, { w: 9, d: 7, h: 5.5, wall: '#BFD8E8', roof: '#3E4A5C' });
house(world, 25, -12, { w: 9, d: 7, h: 5.5, wall: '#E8D4A2', roof: '#5A4636' });
fence(world, [[-9.5, -9], [-9.5, 11]], { h: 1.4, color: '#D8C4A0' });
fence(world, [[14, -9], [14, 11]], { h: 1.4, color: '#D8C4A0' });
stat(box(world, 8, 0.06, 4.4, '#C9C2B6', 1, 0, -6.2));
grill(world, -2, -6, { t0: 0 });

// ---- pools (own above-ground pool + the neighbor's) ----
const waterM = (c, op) => mat(c, { opacity: op, rough: 0.08, metal: 0.05, own: true });
function pool(x, z, r, h, wall) {
  const g = stat(grp(world, x, 0, z));
  const wm = mat(wall, { own: true }); wm.side = THREE.DoubleSide;
  const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 36, 1, true), wm); w.position.y = h / 2; w.castShadow = true; g.add(w);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.08, 6, 36), mat('#F4F4F2')); rim.rotation.x = Math.PI / 2; rim.position.y = h; g.add(rim);
  cyl(g, r - 0.02, r - 0.02, 0.04, '#8FD3EE', 0, 0.02, 0);
  const wd = dyn(new THREE.Mesh(new THREE.CylinderGeometry(r - 0.04, r - 0.04, 0.05, 36), waterM('#3BB0E0', 0.85))); wd.position.set(x, h - 0.12, z); world.add(wd);
  return wd;
}
const myWater = pool(7, -1, 2.4, 1.1, '#5FB2DA');
const npWater = pool(NP[0], NP[1], 2.6, 1.35, '#E9A3C0');
tick(t => { const l = lerp(0.98, 0.07, span(t, -1.6, 3.0)); myWater.position.y = l; myWater.visible = l > 0.1; npWater.position.y = 1.22 + 0.03 * Math.sin(t * 1.7); });
const ring = dyn(new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.18, 8, 20), mat('#FFD23F'))); ring.rotation.x = Math.PI / 2; world.add(ring);
tick(t => ring.position.set(NP[0] + 1.2, 1.32 + 0.04 * Math.sin(t * 1.9) + 0.25 * bump(t, 43.1, 0.6), NP[1] - 0.6));

// ---- trampoline (mat dips into a funnel when you land) ----
const TRg = stat(grp(world, TR[0], 0, TR[1]));
for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; cyl(TRg, 0.035, 0.035, MATY, '#2C2F36', Math.cos(a) * 1.92, 0, Math.sin(a) * 1.92); }
{ const fr = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.045, 6, 40), mat('#2C2F36')); fr.rotation.x = Math.PI / 2; fr.position.y = MATY; TRg.add(fr);
  const pad = new THREE.Mesh(new THREE.TorusGeometry(1.86, 0.14, 8, 40), mat('#2E86DE')); pad.rotation.x = Math.PI / 2; pad.scale.z = 0.45; pad.position.y = MATY + 0.02; TRg.add(pad); }
const fm = mat('#17181C', { own: true }); fm.side = THREE.DoubleSide;
const fgeo = new THREE.CylinderGeometry(1.74, 0.3, 1, 28, 1, true); fgeo.translate(0, -0.5, 0);
const funnel = dyn(new THREE.Mesh(fgeo, fm)); funnel.position.set(TR[0], MATY, TR[1]); world.add(funnel);
const mbot = dyn(new THREE.Mesh(new THREE.CircleGeometry(0.31, 20), fm)); mbot.rotation.x = -Math.PI / 2; world.add(mbot);

// ---- you: the path of the body centre (pure function of t) ----
const C0 = 3.2, V0 = 0.25, AC = (25.95 - C0 - V0 * TG) / (TG * TG), cyUp = t => C0 + V0 * t + AC * t * t;
const CTOP = cyUp(TG), TI = TG + Math.sqrt(2 * (CTOP - 1.2) / GR), TL0 = TI + 0.2, FT = 2.3, VZ = (0.58 - 1.2 + 4.9 * FT * FT) / FT, TS = TL0 + FT;
const sway = t => 1 - span(t, TG - 8, 7);
function C(t) {
  if (t <= TG) { const w = sway(t); return [TR[0] + 0.7 * Math.sin(t * 0.16) * w, cyUp(t), TR[1] + 0.5 * Math.sin(t * 0.11 + 1) * w]; }
  if (t <= TI) { const d = t - TG; return [TR[0], CTOP - 0.5 * GR * d * d, TR[1]]; }
  if (t <= TL0) return [TR[0], 1.2 - 0.55 * Math.sin(Math.PI * (t - TI) / 0.2), TR[1]];
  if (t <= TS) { const u = t - TL0; return [lerp(TR[0], NP[0], u / FT), 1.2 + VZ * u - 0.5 * GR * u * u, TR[1]]; }
  const u = t - TS; return [NP[0], 0.58 + 0.42 * span(u, 0, 0.7, 'out') + 0.04 * Math.sin(u * 2.2) * span(u, 0.5, 1), NP[1]];
}
function ORI(t) {
  let rx = 0.12 * Math.sin(t * 0.5) * (1 - span(t, TG - 3, 3)) - TAU * span(t, B[5].t + 0.6, 3.6, 'inOut');
  if (t > TG) rx = lerp(rx, -TAU - 1.45, span(t, TG, 1.4));
  if (t > TL0) rx = lerp(-TAU - 1.45, -2 * TAU, span(t, TL0, FT * 0.95, 'inOut'));
  const ry = t > TS ? lerp(0.45, 0.35, span(t, TS, 1)) : 0.45;
  return [rx, ry, t <= TG ? 0.08 * Math.sin(t * 0.37) : 0];
}
LIVE.c = C;
LIVE.height = t => Math.max(0, C(t)[1] - HC);
const you = char('you', { expr: t => t > TS + 0.4 ? 'surprised' : t > TG ? 'shout' : t > B[5].t && t < B[6].t ? 'surprised' : t > B[3].t + 1.5 && t < B[4].t ? 'happy' : 'scared' });
world.add(you.root); dyn(you.root);
const youC = dyn(grp(world, 0, 0, 0)); track('youC', youC, 0.3); track('you', you);
const eu = new THREE.Euler(0, 0, 0, 'YXZ'), qv = new THREE.Vector3();
late(t => {
  const c = C(t), o = ORI(t); eu.set(o[0], o[1], o[2]);
  you.root.rotation.copy(eu); qv.set(0, HC, 0).applyEuler(eu);
  you.root.position.set(c[0] - qv.x, c[1] - qv.y, c[2] - qv.z); youC.position.set(c[0], c[1], c[2]);
  const dip = t > TI && t < TL0 ? 0.55 * Math.sin(Math.PI * (t - TI) / 0.2) : 0;
  funnel.scale.y = Math.max(0.001, dip); mbot.position.set(TR[0], MATY - dip + 0.002, TR[1]);
  you.look = t > TS + 0.8 ? 'cam' : t > TG && t < TI ? [TR[0], 0, TR[1]] : null;
});
you.fx.push((t, S) => {   // weightless limbs, Steve's flapping, panic on the way down, standing in the pool at the end
  if (t > TS + 0.3) return;
  const A = rigState('float', 0, t, { sd: you.sd }); for (const k in A) if (S[k] != null) S[k] = A[k];
  const fl = env3(t, B[5].t - 0.2, B[5].t + 3.8, 0.3, 0.4);
  if (fl) { const s = 0.5 + 0.5 * Math.sin(t * 13); S.laz = lerp(S.laz, -0.35 - 1.25 * s, fl); S.raz = lerp(S.raz, 0.35 + 1.25 * s, fl); S.las = lerp(S.las, 0, fl); S.ras = lerp(S.ras, 0, fl); S.lae = lerp(S.lae, -0.12, fl); S.rae = lerp(S.rae, -0.12, fl); }
  if (t > TG) { const P = rigState('panic', 0, t, { sd: you.sd }), e = clamp((t - TG) / 0.4) * (1 - span(t, TS - 0.3, 0.5)); for (const k of ['las', 'ras', 'laz', 'raz', 'lae', 'rae']) S[k] = lerp(S[k], P[k], e); }
});
wet(you, TS + 0.05);
// the drink you were holding when it happened — you never let go
const can = food(world, 'can', TR[0], 3, TR[1], { color: '#2E86DE' });
holdItem(you, can, -5, 1e9, { side: 'L' });
// the burger that floats by — you eat it mid-air
const EAT = B[3].t + 1.3;
const bur = food(world, 'burger', -1, 3, 1);
tick(t => { if (t >= EAT - 0.4) return; const c = C(t), k = span(t, EAT - 3.2, 2.8); bur.g.position.set(c[0] + lerp(2.4, 0.5, k), c[1] + lerp(-1.2, 0.15, k), c[2] + lerp(1.4, 0.45, k)); bur.g.rotation.set(t * 0.4, t * 0.7, t * 0.3); });
eat(you, bur, EAT, { bites: 2, every: 0.9, side: 'R', after: 'hide' });
sfx(TI, 'boing', 1);
splash(NP[0], NP[1], TS, { size: 1.6 });

// ---- everything else that floats: rises with the air, falls back when gravity returns ----
const FL = [];
function floater(g, o = {}) {
  dyn(g); const F = { g, p0: g.position.clone(), r0: g.rotation.clone(), up: o.up ?? 6, dx: o.dx ?? 0, dz: o.dz ?? 0, sp: o.sp ?? [0.2, 0.3, 0.15], rest: o.rest ?? 0, t0: o.t0 ?? -1.5 };
  F.yTG = F.p0.y + F.up; F.tl = TG + Math.sqrt(2 * Math.max(0, F.yTG - F.rest) / GR); if (o.thud) sfx(F.tl, 'impact', o.thud);
  FL.push(F); return g;
}
tick(t => { for (const F of FL) {
  const kk = 0.15 * span(Math.min(t, TG), -3.2, 2.6, 'out') + 0.85 * Math.pow(clamp((Math.min(t, TG) - F.t0) / (TG - F.t0)), 1.5);
  const y = t <= TG ? F.p0.y + F.up * kk : Math.max(F.rest, F.yTG - 0.5 * GR * (t - TG) * (t - TG));
  F.g.position.set(F.p0.x + F.dx * kk, y, F.p0.z + F.dz * kk);
  const ts = Math.min(t, F.tl) - F.t0, land = span(t, F.tl, 0.25, 'out');
  F.g.rotation.set(lerp(F.r0.x + F.sp[0] * ts, F.r0.x, land), F.r0.y + F.sp[1] * ts, lerp(F.r0.z + F.sp[2] * ts, F.r0.z, land));
} });
function lawnChair(x, z, ry, col) { const g = grp(world, x, 0, z, ry); box(g, 0.5, 0.05, 0.5, col, 0, 0.42, 0); box(g, 0.5, 0.55, 0.05, col, 0, 0.45, -0.24, { rx: -0.15 });
  for (const [a, b] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) cyl(g, 0.025, 0.025, 0.42, '#DADADA', a, 0, b); return g; }
// patio table with umbrella
{ const g = grp(world, 1.5, 0, -5.6); cyl(g, 0.62, 0.62, 0.05, '#F2F2F0', 0, 0.72, 0); cyl(g, 0.05, 0.08, 0.72, '#CFCFCF', 0, 0, 0); cyl(g, 0.025, 0.025, 2.3, '#BDBDBD', 0, 0.72, 0); cone(g, 1.25, 0.5, '#E74C3C', 0, 2.55, 0);
  floater(g, { up: 9, dx: 1.5, dz: 2, sp: [0.08, 0.15, 0.12], thud: 0.5 }); }
floater(lawnChair(0.2, -6.1, 0.4, '#F7F7F5'), { up: 6.5, dx: -1, dz: 2.5, sp: [0.35, 0.2, 0.25], thud: 0.4 });
floater(lawnChair(2.9, -4.7, -0.5, '#F7F7F5'), { up: 7.5, dx: 2, dz: 3, sp: [-0.25, -0.3, 0.3] });
for (let i = 0; i < 3; i++) { const F = food(world, 'can', 1.2 + i * 0.25, 0.75, -5.5 + i * 0.2, { color: ['#C0392B', '#27AE60', '#F39C12'][i] }); floater(F.g, { up: 8 + i * 3, dx: rr(-2, 2), dz: rr(1, 4), sp: [rr(-1, 1), rr(-1, 1), rr(-1, 1)], t0: -1 }); }
for (let i = 0; i < 2; i++) { const F = food(world, 'burger', -2.1 + i * 0.35, 0.95, -6, {}); floater(F.g, { up: 10 + i * 4, dx: rr(-1, 1), dz: rr(2, 5), sp: [rr(-0.8, 0.8), rr(-1, 1), rr(-0.8, 0.8)], t0: -1.2 }); }
{ const g = grp(world, 4.2, 0.11, 1.2); ball(g, 0.11, '#F4F4F4', 0, 0, 0); ball(g, 0.05, '#222222', 0.07, 0.05, 0.06); floater(g, { up: 12, dx: -2, dz: 1, sp: [1.2, 0.6, 0.9], rest: 0.11 }); }
{ const g = grp(world, -6.6, 0, -3); cyl(g, 0.16, 0.2, 0.32, '#2E6FD9', 0, 0, 0); ball(g, 0.13, '#F1C7A5', 0, 0.42, 0); cone(g, 0.12, 0.3, '#D63031', 0, 0.5, 0); cone(g, 0.12, 0.18, '#FFFFFF', 0, 0.22, 0.08, { rx: Math.PI });
  floater(g, { up: 5, dx: 1.5, dz: 2, sp: [0.5, 0.4, 0.6], thud: 0.3 }); }
for (let i = 0; i < 26; i++) { const g = grp(world, rr(-8, 12), 0.02, rr(-8, 9)); box(g, 0.14, 0.01, 0.09, pick(['#5E9E3A', '#7DB24A', '#C9A13B']), 0, 0, 0);
  floater(g, { up: rr(4, 22), dx: rr(-2, 2), dz: rr(-2, 2), sp: [rr(-2, 2), rr(-2, 2), rr(-2, 2)], t0: rr(-2, 1), rest: 0.02 }); }
emit('dust', { at: [1, 0.2, 0], t0: -2, t1: TG, rate: 7, jitter: 9, g: 2.6, life: 3.2, size: 0.32, opacity: 0.22, speed: 0.6 });

// ---- the pool water becomes one giant floating blob ----
const blob = dyn(grp(world, 7, 1.4, -1)); track('blob', blob, 0);
const bm = new THREE.Mesh(new THREE.SphereGeometry(1.6, 28, 18), waterM('#49B8E8', 0.78)); blob.add(bm);
const drops = []; for (let i = 0; i < 7; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(rr(0.12, 0.3), 12, 8), bm.material); blob.add(d); drops.push([d, rr(2, 3.2), rr(0, TAU), rr(0.3, 0.8), rr(-0.8, 0.8)]); }
const BY0 = 17.6, TW = TG + Math.sqrt(2 * (BY0 - 1.4) / GR), BX = -0.5, BZ = 1;
tick(t => {
  const k = clamp((t + 1.5) / (TG + 1.5)), s = 0.35 + 0.65 * span(t, -1.6, 3.4, 'out');
  if (t <= TG) blob.position.set(lerp(7, BX, EASE.inOut(k)), 1.4 + (BY0 - 1.4) * Math.pow(k, 1.3), lerp(-1, BZ, k));
  else blob.position.set(BX, Math.max(1.4, BY0 - 0.5 * GR * (t - TG) * (t - TG)), BZ);
  blob.visible = t < TW;
  bm.scale.set(s * (1 + 0.07 * Math.sin(t * 3.1)), s * (1 + 0.07 * Math.sin(t * 2.7 + 1)) * (t > TG ? 1.12 : 1), s * (1 + 0.06 * Math.sin(t * 3.5 + 2)));
  for (const [d, r, a, w, yy] of drops) d.position.set(Math.cos(a + t * w) * r * s, yy * s + 0.2 * Math.sin(t + a), Math.sin(a + t * w) * r * s);
});
splash(BX, BZ, TW, { size: 3.2 });
const pud = dyn(new THREE.Mesh(new THREE.CircleGeometry(1, 40), waterM('#5CC2EC', 0.5))); pud.rotation.x = -Math.PI / 2; pud.position.set(BX, 0.03, BZ); world.add(pud);
tick(t => { const k = span(t, TW, 0.8, 'out'); pud.visible = t > TW; pud.scale.setScalar(0.5 + 4.5 * k); pud.material.opacity = 0.55 - 0.25 * k; });

// ---- the dog: floats, paddles, lands on its feet ----
const dog = beast({ kind: 'dog', seed: 3 }), dgw = dyn(grp(world, 0, 0, 0)); dgw.add(dog.root); track('dog', dgw, 0.4);
const DTL = TG + Math.sqrt(2 * 3.4 / GR);
tick(t => { const kk = 0.2 * span(Math.min(t, TG), -3.2, 2.6, 'out') + 0.8 * Math.pow(clamp((Math.min(t, TG) + 1.5) / (TG + 1.5)), 1.4);
  const y = t <= TG ? 3.4 * kk : Math.max(0, 3.4 - 0.5 * GR * (t - TG) * (t - TG));
  dgw.position.set(1.4 + 1.2 * kk, y, 3.3 - 0.8 * kk); dgw.rotation.set(0.25 * Math.sin(t * 0.6) * (t < DTL ? 1 : 0), -0.6 + 0.5 * kk + (t > DTL ? 0 : 0.2 * Math.sin(t * 0.4)), 0.2 * Math.sin(t * 0.45) * (t < DTL ? 1 : 0)); });
boing(dgw, DTL, { amp: 0.25 });

// ---- Gerald: lawn chair, side table, never moves ----
{ const g = stat(grp(world, 3.2, 0, 5.4, 0.5)); box(g, 0.62, 0.05, 0.55, '#3D7BD9', 0, 0.4, 0); box(g, 0.62, 0.6, 0.05, '#F2F2F2', 0, 0.45, -0.27, { rx: -0.3 });
  for (const s of [-1, 1]) { box(g, 0.04, 0.04, 0.6, '#BBBBBB', s * 0.32, 0.58, 0); cyl(g, 0.02, 0.02, 0.4, '#BBBBBB', s * 0.3, 0, 0.24); cyl(g, 0.02, 0.02, 0.4, '#BBBBBB', s * 0.3, 0, -0.24); } }
const ger = gerald({ scale: 1.5 }); world.add(ger.root); ger.root.position.set(3.2, 0.43, 5.4); ger.root.rotation.y = 0.5; track('gerald', ger.root, 0.4);
stat(cyl(world, 0.26, 0.26, 0.04, '#8A6A4A', 3.95, 0.52, 5.85)); stat(cyl(world, 0.04, 0.04, 0.52, '#6A4E36', 3.95, 0, 5.85));
food(world, 'plate', 3.95, 0.56, 5.85, { still: true });
const TB = B[10].t + 0.8, lb = food(world, 'burger', 3.95, 0.58, 5.85);
tick(t => { const y = t <= TG ? 0.58 + 337 * span(t, -1, TG + 1, 'in') : Math.max(0.58, 0.58 + 0.5 * GR * Math.max(0, TB - t) * Math.max(0, TB - t));
  lb.g.position.set(3.95, y, 5.85); lb.g.rotation.y = t < TB ? t * 0.6 : TB * 0.6; });
sfx(TB, 'pop', 0.6);

biome('farm', { density: 0.6, keep: [[1, 0, 16], [NP[0], NP[1], 5], [25, -12, 6], [-20, -12, 6]] });
