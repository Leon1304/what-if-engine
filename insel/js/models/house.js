// Fachwerkhaus in drei Ausbaustufen (volle Detailstufe). Ursprung = Boden in der Mitte der Grundfläche, Haustür zeigt nach +x.
//   stage 1: einstöckig, verputzt, Steinsockel · stage 2: Fachwerk-Obergeschoss mit Auskragung, Vordach
//   stage 3: + Anbau (Pultdach) an −z und Garten hinten (−x): Zaun, Beete, Wäscheleine, Bank
// Wandrahmen: u entlang der Wand, v = Höhe, w nach außen (Außenfläche bei w = 0, Wand reicht bis w = −t).
// Alles, was vom Zufall abhängt, kommt aus eigenen Folgen je seed und Bauteil → Farben und Details bleiben beim Ausbau gleich.
import * as THREE from 'three';
import { TAG } from '../kit.js';
import { rng, hash } from '../hex.js';

const PI = Math.PI;
// ---------------------------------------------------------------- Farben
const PUTZ = [0xeee0c4, 0xf3f0e8, 0xf0dc9e, 0xecc4b6, 0xc6d9e6];          // creme, weiß, hellgelb, rosa, hellblau
const DACH = [0xb4532f, 0x8c3427, 0x5c636c, 0x7b4b30];                    // ziegelrot, dunkelrot, Schiefer, braun
const LADEN = [0x3f7a4a, 0x3a5f90, 0x9b3b31, 0x2e6e74];                   // grün, blau, rot, petrol
const BALKEN = [0x4a3324, 0x3b2a20, 0x553826, 0x5e2a20];
const TAPETE = [0xd9c393, 0xc79d8a, 0x9fb3c6, 0xb4c49a, 0xe1cfae, 0xc2a3b8, 0xd8b07a];
const GARDINE = [0xf4f0e6, 0xeadca8, 0xd88a7a, 0xa8c4d8, 0xf0e4d0];
const STEIN = [0x8f8b84, 0x7d7a74, 0x9a958c, 0xa39a88, 0x857a6a, 0x6f6c66, 0x948a7c];
const BLUME = [0xe8423a, 0xf2e14a, 0xffffff, 0xe85a9a, 0x9a6ae8, 0xf28a3a, 0xd8304a];
const BUCH = [0x8a2a24, 0x2a4a7a, 0x3a6a3a, 0xc8a050, 0x5a3a6a, 0x2a2a2a, 0xa86a3a, 0xd8d0b8];
const HOLZ = 0x8a6a48, HOLZ_D = 0x6b4f36, HOLZ_G = 0x8f8270, GLAS = 0x9ec3d6, MESSING = 0xc9a23a, EISEN = 0x2e2e30, ZINK = 0x8e969c, ZINK_D = 0x6c7478;
const ERDE = 0x4a3424, MOOS = 0x5f7f34, TON = 0xb0603a, MOERTEL = 0x7a766e, LAUB = 0x4f8a3a;
const NO_AO = { ao: false };

// ---------------------------------------------------------------- Zufall und Hilfen
function RNG(seed, key) {
  const f = rng(hash('haus', seed, key));
  return { f, R: (a = 0, b = 1) => a + (b - a) * f(), pick: a => a[Math.floor(f() * a.length)], p: x => f() < x, i: n => Math.floor(f() * n) };
}
const C = (c, m = 1) => new THREE.Color(c).multiplyScalar(m);
const MIX = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
// Kiste aus Min/Max-Grenzen im aktuellen Rahmen
const B = (k, c, x0, x1, y0, y1, z0, z1, o) => k.box(c, [(x0 + x1) / 2, Math.min(y0, y1), (z0 + z1) / 2], [Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)], o);
// Zylinder zwischen zwei Punkten
const _v = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _q = new THREE.Quaternion(), _eu = new THREE.Euler();
function tube(k, c, a, b, r, seg = 6, o = {}) {
  _v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const L = _v.length(); _q.setFromUnitVectors(_up, _v.normalize()); _eu.setFromQuaternion(_q);
  k.cyl(c, a, r, L, seg, { ...o, r: [_eu.x, _eu.y, _eu.z], order: _eu.order });
}
// Eigene Vorlagen (nur position + normal, nicht indiziert – wie im Kit)
const TPL = {};
function prep(g) { if (g.index) g = g.toNonIndexed(); if (g.attributes.uv) g.deleteAttribute('uv'); if (g.attributes.uv1) g.deleteAttribute('uv1'); g.clearGroups(); if (!g.attributes.normal) g.computeVertexNormals(); return g; }
function tpl(name, make) { return TPL[name] ||= prep(make()); }
// Kiste nur mit den sichtbaren Seiten (Reihenfolge der BoxGeometry: +x, −x, +y, −y, +z, −z)
function partBox(faces) {
  const b = new THREE.BoxGeometry(1, 1, 1).toNonIndexed(), P = b.attributes.position.array, N = b.attributes.normal.array, p = [], n = [];
  for (const f of faces) { p.push(...P.slice(f * 18, f * 18 + 18)); n.push(...N.slice(f * 18, f * 18 + 18)); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
  return g;
}
// Ziegel: nur Oberseite und Unterkante (Rest liegt unter der Nachbarreihe), Ursprung hinten unten, reicht z 0…1
const TILE = () => tpl('tile', () => partBox([2, 4]).translate(0, .5, .5));
// Stein/Ziegelstein: ohne Rückseite (−z, steckt im Mörtel) und ohne Unterseite; Ursprung Mitte unten
const STONE = () => tpl('stone', () => partBox([0, 1, 2, 4]).translate(0, .5, 0));
// Fläche (Normale +z), für Innenwände und Vorhänge, die man nur von vorn sieht
const PLANE = () => tpl('plane', () => new THREE.PlaneGeometry(1, 1));
// Lamellen-Füllung eines Ladens: n schräge Brettchen (beidseitig), Feld x 0…1, y 0…1, Tiefe z ±0.5
const LOUVRE = n => tpl('louvre' + n, () => {
  const p = [], h = 1 / n;
  for (let i = 0; i < n; i++) {
    const y0 = i * h + h * .15, y1 = y0 + h * .95, A = [0, y0, -.5], Bq = [1, y0, -.5], Cq = [1, y1, .5], D = [0, y1, .5];
    p.push(...A, ...Bq, ...Cq, ...A, ...Cq, ...D, ...A, ...Cq, ...Bq, ...A, ...D, ...Cq);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals(); return g;
});
// Holzscheit: dreieckiges Prisma ohne hintere Stirnfläche, Achse +z (0…1), Ursprung hinten
const SCHEIT = () => tpl('scheit', () => {
  const v = [0, 1, 2].map(i => { const a = i * 2 * PI / 3 + PI / 2; return [Math.cos(a), Math.sin(a)]; }), p = [];
  for (let i = 0; i < 3; i++) { const [ax, ay] = v[i], [bx, by] = v[(i + 1) % 3]; p.push(ax, ay, 0, bx, by, 0, bx, by, 1, ax, ay, 0, bx, by, 1, ax, ay, 1); }
  p.push(...v[0], 1, ...v[1], 1, ...v[2], 1);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals(); return g;
});
// Firstziegel: obere Halbschale (offen), Achse +z (0…1)
const RIDGE = () => tpl('ridge', () => new THREE.CylinderGeometry(.9, 1, 1, 6, 1, true, -PI / 2, PI).rotateX(PI / 2).translate(0, 0, .5));
const PL = (k, c, p, w, h, r, o = {}) => k.add(PLANE(), c, p, [w, h, 1], { ao: false, ...o, r });
const RING = () => tpl('ring', () => new THREE.TorusGeometry(1, .08, 3, 12));
// Rahmen aus Basisvektoren (x, y, z) und Ursprung
function basis(X, Y, Z, o) { return new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(...o); }
// Dachebene: Z = hangabwärts (horizontal dir · cos, −sin), Y = Flächennormale, X = Y × Z
function slopeFrame(dirX, dirZ, ang, o) {
  const Z = new THREE.Vector3(dirX * Math.cos(ang), -Math.sin(ang), dirZ * Math.cos(ang)), Y = new THREE.Vector3(dirX * Math.sin(ang), Math.cos(ang), dirZ * Math.sin(ang));
  return basis(new THREE.Vector3().crossVectors(Y, Z), Y, Z, o);
}
// Wandrahmen: F = vorn (+x), K = hinten (−x), R = rechts (+z), L = links (−z)
const WALL = { F: (a, b) => [[a, 0, 0], PI / 2], K: (a, b) => [[-a, 0, 0], -PI / 2], R: (a, b) => [[0, 0, b], 0], L: (a, b) => [[0, 0, -b], PI] };
function onWall(k, s, a, b, fn) { const [p, ry] = WALL[s](a, b); k.push(p, ry); fn(); k.pop(); }

// ---------------------------------------------------------------- Wand aus Stücken um die Öffnungen
// holes: [{a, b, lo, hi}] in u/v. band: Höhe der dunkleren Spritzwasserzone über v0.
function wallPieces(k, col, u0, u1, v0, v1, t, holes, r, o = {}) {
  const cuts = [u0, u1];
  for (const h of holes) cuts.push(Math.max(u0, h.a), Math.min(u1, h.b));
  const us = [...new Set(cuts.map(x => Math.round(x * 1e4) / 1e4))].sort((a, b) => a - b);
  const dark = o.band ? MIX(col, 0x6a6052, .32) : null;
  for (let i = 0; i < us.length - 1; i++) {
    const a = us[i], b = us[i + 1]; if (b - a < 1e-3) continue; const m = (a + b) / 2;
    let iv = [[v0, v1]];
    for (const h of holes) if (h.a < m && m < h.b) iv = iv.flatMap(([lo, hi]) => { const out = []; if (h.lo > lo) out.push([lo, Math.min(hi, h.lo)]); if (h.hi < hi) out.push([Math.max(lo, h.hi), hi]); return out; });
    for (const [lo, hi] of iv) {
      if (hi - lo < 1e-3) continue;
      const c = C(col, r.R(.975, 1.025)), O = { ao: false, jit: .02 };
      if (dark && lo <= v0 + 1e-4 && hi > v0 + o.band + .05) { B(k, C(dark, r.R(.96, 1.04)), a, b, lo, v0 + o.band, -t, 0, O); B(k, c, a, b, v0 + o.band, hi, -t, 0, O); }
      else B(k, c, a, b, lo, hi, -t, 0, O);
    }
  }
}
// Wetterspuren auf Putz: Schlieren unter Fensterbänken, Flecken, abgeplatzter Putz mit Ziegeln
function weather(k, S, r, u0, u1, v0, v1, wins, avoid = []) {
  const d = MIX(S.putz, 0x5a564c, .22);
  for (const w of wins) for (const s of [-1, 1]) if (r.p(.7)) {
    const x = w.u + s * (w.W / 2 + r.R(-.05, .05)), h = r.R(.25, .55);
    B(k, C(d, r.R(.95, 1.05)), x - .025, x + .025, w.v0 - .06 - h, w.v0 - .06, -.01, .006, { ao: false, jit: .02 });
  }
  for (let i = 0; i < 2; i++) if (r.p(.6)) {
    const x = r.R(u0 + .4, u1 - .4), y = r.R(v0 + .5, v1 - .5), w = r.R(.18, .32), h = r.R(.14, .26);
    if ([...wins, ...avoid].some(o => Math.abs(o.u - x) < o.W / 2 + .5 && y > o.v0 - .4 && y < o.v0 + o.H + .3)) continue;
    B(k, MIX(S.putz, 0xa89a88, .45), x - w / 2, x + w / 2, y - h / 2, y + h / 2, -.01, .008, { ao: false, jit: .03 });   // Putzloch (Grund)
    for (let j = 0; j < 3; j++) { const bx = x - w / 2 + .03 + j * (w - .06) / 3 + (j % 2) * .02, by = y - h / 2 + .03 + (j % 2) * .07; B(k, C(0x9a4a34, r.R(.85, 1.1)), bx, bx + .07, by, by + .045, -.01, .016, { ao: false }); }
  }
}

// ---------------------------------------------------------------- Fachwerk (Ständer, Riegel, Streben) im Wandrahmen
// U0/U1 = Innenkanten der Eckständer, v0 = Oberkante Schwelle, v1 = Unterkante Rähm. wins: [{a, b, lo, hi}]
function fachwerk(k, S, r, U0, U1, v0, v1, wins) {
  const bw = .15, col = () => C(S.balken, r.R(.88, 1.1)), O = { jit: .06 };
  const posts = [];                                     // Ständer als [u-Mitte]
  for (const w of wins) posts.push(w.a - bw / 2, w.b + bw / 2);
  posts.sort((a, b) => a - b);
  const edges = [U0, ...posts.flatMap(p => [p - bw / 2, p + bw / 2]), U1];
  // Lücken > 1,3 m mit Zwischenständern füllen
  const all = [...posts];
  for (let i = 0; i < edges.length; i += 2) { const g0 = edges[i], g1 = edges[i + 1], gap = g1 - g0; if (gap > 1.3) { const n = Math.ceil(gap / 1.15) - 1; for (let j = 1; j <= n; j++) all.push(g0 + (gap) * j / (n + 1)); } }
  all.sort((a, b) => a - b);
  for (const p of all) B(k, col(), p - bw / 2, p + bw / 2, v0, v1, -.06, .045, O);
  const bays = []; let last = U0;
  for (const p of all) { bays.push([last, p - bw / 2]); last = p + bw / 2; }
  bays.push([last, U1]);
  const vm = (v0 + v1) / 2;
  bays.forEach(([x0, x1], i) => {
    if (x1 - x0 < .2) return;
    const win = wins.find(w => w.a >= x0 - 1e-3 && w.b <= x1 + 1e-3);
    if (win) {
      B(k, col(), x0, x1, win.lo - bw, win.lo, -.06, .035, O);                 // Brüstungsriegel
      B(k, col(), x0, x1, win.hi, win.hi + bw, -.06, .035, O);                 // Sturzriegel
      const ph = win.lo - bw - v0;
      if (ph > .3) {                                                           // Andreaskreuz in der Brüstung
        k.beam(col(), [x0, v0, -.02], [x1, win.lo - bw, -.02], .1, { w: .11, d: .09, jit: .06 });
        k.beam(col(), [x1, v0, -.025], [x0, win.lo - bw, -.025], .1, { w: .11, d: .07, jit: .06 });
      }
      return;
    }
    B(k, col(), x0, x1, vm - bw / 2, vm + bw / 2, -.06, .035, O);              // Riegel
    const corner = i === 0 ? -1 : i === bays.length - 1 ? 1 : 0;
    if (corner) {                                                              // Strebe vom Eckständer schräg nach oben innen
      const a = corner < 0 ? [x0, v0, -.02] : [x1, v0, -.02], b = corner < 0 ? [x1, v1, -.02] : [x0, v1, -.02];
      k.beam(col(), a, b, .1, { w: .13, d: .09, jit: .06 });
    } else if (r.p(.5)) {                                                      // Andreaskreuz unten
      k.beam(col(), [x0, v0, -.02], [x1, vm - bw / 2, -.02], .1, { w: .1, d: .09, jit: .06 });
      k.beam(col(), [x1, v0, -.025], [x0, vm - bw / 2, -.025], .1, { w: .1, d: .07, jit: .06 });
    } else {                                                                   // Fußstreben oben
      k.beam(col(), [x0, vm + bw / 2, -.02], [(x0 + x1) / 2, v1, -.02], .1, { w: .1, d: .09, jit: .06 });
      k.beam(col(), [x1, vm + bw / 2, -.02], [(x0 + x1) / 2, v1, -.02], .1, { w: .1, d: .07, jit: .06 });
    }
  });
}

// ---------------------------------------------------------------- Innenleben hinter einem Fenster
function lamp(k, x, y, z, shade) {
  B(k, 0x222222, x - .006, x + .006, y + .07, y + .5, z - .006, z + .006, NO_AO);
  k.cyl(shade, [x, y, z], .15, .13, 6, { top: .4, ao: false });
  k.boxc(0xfff0c0, [x, y + .01, z], [.08, .06, .08], { layer: 'glow', ao: false, r: [0, PI / 4, 0] });
}
function room(k, S, r, u, W, t, vF, vC, depth, o = {}) {
  const Wr = W + .44, u0 = u - Wr / 2, u1 = u + Wr / 2, w0 = -t + .04, w1 = -t - depth;
  const tap = C(o.tap ?? r.pick(TAPETE)), boden = C(r.pick([0x8a5e3c, 0x9c7048, 0x6e4a30])), D = NO_AO;
  if (o.attic) { boden.set(0x7a5a3a); tap.set(0xa08a6a); }
  // Hülle aus Flächen, die nach innen zeigen (man sieht sie nur durchs Fenster)
  const dep = w0 - w1, wc = (w0 + w1) / 2, vc = (vF + vC) / 2;
  if (!o.attic && r.p(.5)) {                                   // Holzvertäfelung unten, Tapete oben
    const vp = Math.min(vF + .8, vC - .4);
    PL(k, C(boden, 1.15), [u, (vF + vp) / 2, w1], Wr, vp - vF); B(k, C(boden, .75), u0, u1, vp - .03, vp + .03, w1 - .01, w1 + .025, D);
    PL(k, tap, [u, (vp + vC) / 2, w1], Wr, vC - vp);
  } else { const n = 4, t2 = C(tap, .86); for (let i = 0; i < n; i++) PL(k, i % 2 ? t2 : tap, [u0 + (i + .5) * Wr / n, vc, w1], Wr / n, vC - vF); }
  const side = C(tap, .88);
  PL(k, side, [u0, vc, wc], dep, vC - vF, [0, PI / 2, 0]); PL(k, side, [u1, vc, wc], dep, vC - vF, [0, -PI / 2, 0]);
  PL(k, boden, [u, vF, wc], Wr, dep, [-PI / 2, 0, 0]);
  PL(k, o.attic ? 0x6a5038 : 0xe8e0d0, [u, vC, wc], Wr, dep, [PI / 2, 0, 0]);
  const wb = w1 + depth * .22; B(k, 0x5a3e2a, u0, u1, vC - .1, vC, wb - .05, wb + .05, D);   // Deckenbalken
  const wm = w1 + depth * .58;
  let items = o.items || [];
  if (!o.items) { if (r.p(.75)) items.push('lamp'); const pool = ['bild', 'regal', 'pflanze', 'tisch', 'kommode']; items.push(r.pick(pool)); if (items.length < 2) items.push(r.pick(pool)); }
  const side0 = r.p(.5) ? -1 : 1;
  for (const it of items) {
    if (it === 'lamp') lamp(k, u + r.R(-.1, .1), vC - .55, wm, r.pick([0xe8d8b0, 0x8a3a2a, 0x3a5a3a, 0xf0f0e8]));
    else if (it === 'bild') {
      const pu = u + r.R(-.15, .15), py = Math.min(vC - .4, vF + 1.45);
      B(k, r.pick([0xb08a3a, 0x4a3020, 0x2a2a2a]), pu - .21, pu + .21, py - .16, py + .16, w1, w1 + .02, D);
      B(k, r.pick([0x9ac0e0, 0xe8b070, 0xc0d0e0]), pu - .18, pu + .18, py, py + .13, w1 + .015, w1 + .03, D);
      B(k, r.pick([0x5a8a3a, 0x3a6a8a, 0x8a7a3a]), pu - .18, pu + .18, py - .13, py, w1 + .015, w1 + .03, D);
      k.ball(0xf0e0a0, [pu + .08, py + .07, w1 + .03], .025, D);
    } else if (it === 'regal') {
      const pu = u + side0 * r.R(0, .12), py = Math.min(vC - .55, vF + 1.25);
      B(k, 0x6a4a30, pu - .32, pu + .32, py - .025, py, w1, w1 + .2, D);
      for (const s of [-1, 1]) B(k, 0x3a2a1a, pu + s * .25 - .01, pu + s * .25 + .01, py - .12, py - .025, w1, w1 + .12, D);
      let x = pu - .29;
      while (x < pu + .22) { const bw = r.R(.045, .08), bh = r.R(.15, .23); B(k, C(r.pick(BUCH), r.R(.85, 1.1)), x, x + bw, py, py + bh, w1 + .02, w1 + r.R(.13, .17), D); x += bw + .004; }
      k.box(C(r.pick(BUCH)), [pu + .27, py, w1 + .09], [.035, .2, .14], { r: [0, 0, .35], ao: false });
    } else if (it === 'pflanze') {
      const pu = u + side0 * (Wr / 2 - .2), pw = w1 + .25;
      k.cyl(TON, [pu, vF, pw], .12, .26, 7, { top: 1.2, ao: false }); B(k, ERDE, pu - .09, pu + .09, vF + .22, vF + .25, pw - .09, pw + .09, D);
      for (let i = 0; i < 4; i++) k.ball(C(LAUB, r.R(.8, 1.15)), [pu + r.R(-.12, .12), vF + .4 + i * .14, pw + r.R(-.08, .08)], [.16, .13, .14], { ao: false, jit: .12 });
    } else if (it === 'tisch') {
      const pu = u + r.R(-.1, .1), pw = w1 + .32, ty = vF + .74;
      B(k, 0x7a5232, pu - .4, pu + .4, ty - .04, ty, pw - .25, pw + .25, D);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(k, 0x5a3a22, pu + sx * .34 - .025, pu + sx * .34 + .025, vF, ty - .04, pw + sz * .2 - .025, pw + sz * .2 + .025, D);
      B(k, r.pick([0xf0ece0, 0xc84a3a, 0x8ab0d8]), pu - .38, pu + .38, ty, ty + .006, pw - .23, pw + .23, D);   // Tischdecke
      k.cyl(r.pick([0x3a6a9a, 0xe0d8c8, 0x9a3a2a]), [pu + .1, ty, pw], .05, .18, 6, { top: .7, ao: false });
      k.ball(C(r.pick(BLUME)), [pu + .1, ty + .24, pw], .07, D);
    } else if (it === 'kommode') {
      const pu = u + side0 * r.R(0, .12), pw = w1 + .2, c = r.pick([0x6a4a30, 0x8a6a48, 0xd8ccb0]);
      B(k, c, pu - .38, pu + .38, vF, vF + .82, w1, pw, D);
      for (let i = 0; i < 3; i++) { const y = vF + .1 + i * .25; B(k, C(c, .82), pu - .34, pu + .34, y, y + .22, pw, pw + .012, D); k.ball(MESSING, [pu, y + .11, pw + .02], .018, D); }
      k.cyl(0xf4ead0, [pu - .2, vF + .82, pw - .1], .025, .16, 6, D); k.ball(0xffd080, [pu - .2, vF + 1.0, pw - .1], .018, { layer: 'glow', ao: false });
      k.cyl(0x5a7a9a, [pu + .18, vF + .82, pw - .1], .07, .2, 7, { top: .8, ao: false });
    } else if (it === 'truhe') {
      const pu = u + side0 * .15, pw = w1 + .3;
      B(k, 0x6a4a2a, pu - .35, pu + .35, vF, vF + .4, pw - .22, pw + .22, D); B(k, 0x5a3a20, pu - .37, pu + .37, vF + .4, vF + .47, pw - .24, pw + .24, D);
      for (const s of [-1, 1]) B(k, EISEN, pu + s * .22 - .02, pu + s * .22 + .02, vF, vF + .48, pw + .24, pw + .25, D);
      B(k, 0xd8c8a0, pu + .05, pu + .4, vF + .47, vF + .7, pw - .15, pw + .15, D);              // Kiste obendrauf
    }
  }
}
function curtains(k, S, r, u, v0, W, H, t) {
  const top = v0 + H + .1, bot = v0 - .04, c = S.gardine;
  B(k, 0x5a3e2a, u - W / 2 - .2, u + W / 2 + .2, top - .012, top + .012, -t - .095, -t - .07, NO_AO);
  for (const s of [-1, 1]) {
    const e = u + s * W / 2, a = s < 0 ? e - .16 : e - .1, w3 = .26 / 3;
    for (let j = 0; j < 3; j++) { const f = j % 2; PL(k, C(c, f ? .86 : 1), [a + (j + .5) * w3, (bot + top) / 2 - .006, -t - (f ? .07 : .05)], w3 + .012, top - .012 - bot); }
  }
}

// ---------------------------------------------------------------- Fenster, Läden, Blumenkasten
function shutter(k, S, r, hu, v0, H, sw, side, al) {
  const ry = side > 0 ? -al : PI + al, d = .032, cf = C(S.laden, .86 * r.R(.95, 1.05)), c = C(S.laden, r.R(.94, 1.06));
  k.push([hu, v0, .046], ry);
  if (S.ladenArt === 'lamellen') {
    B(k, cf, .004, .055, 0, H, -d / 2, d / 2); B(k, cf, sw - .055, sw, 0, H, -d / 2, d / 2);
    const dd = d * .44;
    B(k, cf, .055, sw - .055, 0, .07, -dd, dd); B(k, cf, .055, sw - .055, H / 2 - .03, H / 2 + .03, -dd, dd); B(k, cf, .055, sw - .055, H - .07, H, -dd, dd);
    for (const [y0, y1] of [[.07, H / 2 - .03], [H / 2 + .03, H - .07]]) k.add(LOUVRE(Math.max(3, Math.round((y1 - y0) / .085))), c, [.055, y0, 0], [sw - .11, y1 - y0, .03], { ao: false, jit: .04 });
  } else {
    const n = 4, pw = (sw - .004) / n;
    for (let i = 0; i < n; i++) B(k, C(S.laden, r.R(.88, 1.08)), .004 + i * pw + .002, .004 + (i + 1) * pw - .002, 0, H - r.R(0, .015), -d * .45, d * .45 + r.R(-.003, .003), { ao: false });
    const ls = side > 0 ? 1 : -1;                                                     // Querleisten zeigen im offenen Zustand nach außen
    for (const y of [.12, H - .2]) B(k, cf, .03, sw - .03, y, y + .09, ls * (d / 2 + .016), ls * (d / 2 - .004));
    k.beam(cf, [.08, .2, ls * (d / 2 + .006)], [sw - .08, H - .21, ls * (d / 2 + .006)], .08, { w: .07, d: .016 });
    for (const y of [.1, H - .16]) B(k, EISEN, -.012, .22, y + .045, y + .075, -d / 2 - .02 * (ls < 0), d / 2 + .02 * (ls > 0));   // Bänder auf den Leisten
  }
  k.pop();
}
function flowerBox(k, S, r, u, y, W) {
  const bw = W + .04, c = S.kasten;
  B(k, c, u - bw / 2, u + bw / 2, y, y + .17, .055, .23);
  B(k, C(c, .8), u - bw / 2 - .01, u + bw / 2 + .01, y + .15, y + .175, .05, .235);
  B(k, ERDE, u - bw / 2 + .02, u + bw / 2 - .02, y + .175, y + .182, .07, .215, NO_AO);
  for (const s of [-1, 1]) { const x = u + s * (bw / 2 - .1); B(k, EISEN, x - .012, x + .012, y - .014, y, 0, .2); }
  const fc = r.pick(BLUME), n = Math.round(W / .19);
  for (let i = 0; i < 2; i++) k.ball(C(LAUB, r.R(.85, 1.1)), [u + (i - .5) * bw * .45, y + .21, .14], [bw * .28, .08, .08], { tag: TAG.grass, sway: .15, jit: .12 });
  for (let i = 0; i < n; i++) {
    const x = u - bw / 2 + .07 + i * (bw - .14) / Math.max(1, n - 1), c2 = r.p(.75) ? fc : r.pick(BLUME);
    k.ball(C(c2, r.R(.9, 1.1)), [x + r.R(-.02, .02), y + r.R(.27, .32), r.R(.11, .18)], [.05, .035, .05], { r: [r.R(-.4, .4), r.R(0, 3), r.R(-.4, .4)], tag: TAG.flower, sway: .25, ao: false });
  }
  for (let i = 0; i < 1; i++) k.ball(C(LAUB, .9), [u + r.R(-.3, .3) * W, y + .1, .24], [.06, .09, .035], { tag: TAG.grass, sway: .2, ao: false });   // hängende Ranken
}
// o: { faschen, shutters, box, room: {vF, vC, depth, …}, curtain, hinge (Abstand Ladenband von der Öffnung), cat }
function windowAt(k, S, r, u, v0, W, H, t, o = {}) {
  const fw = .06, fr = S.rahmen, x0 = u - W / 2, x1 = u + W / 2, y1 = v0 + H;
  B(k, fr, x0 - .01, x0 + fw, v0 - .01, y1 + .01, -.13, -.05); B(k, fr, x1 - fw, x1 + .01, v0 - .01, y1 + .01, -.13, -.05);
  B(k, fr, x0 + fw - .005, x1 - fw + .005, y1 - fw, y1 + .01, -.13, -.054); B(k, fr, x0 + fw - .005, x1 - fw + .005, v0 - .01, v0 + fw, -.13, -.054);
  PL(k, GLAS, [u, v0 + H / 2, -.1], W - 2 * fw + .012, H - 2 * fw + .012, [0, 0, 0], { layer: 'glass', jit: 0 });          // Glas (nur von außen sichtbar)
  if (W > .6) B(k, fr, u - .02, u + .02, v0 + fw, y1 - fw, -.125, -.062);                         // Mittelpfosten
  const vk = v0 + H * .64; B(k, fr, x0 + fw, x1 - fw, vk - .018, vk + .018, -.125, -.067);       // Kämpfer
  k.box(S.bank, [u, v0 - .05, -.02], [W + .14, .05, .22], { r: [.07, 0, 0] });                       // Fensterbank
  if (o.trim) { const c = C(S.brett, .75); B(k, c, x0 - .09, x0 + .005, v0 - .05, y1 + .1, .03, .058); B(k, c, x1 - .005, x1 + .09, v0 - .05, y1 + .1, .03, .058); B(k, c, x0 + .005, x1 - .005, y1, y1 + .1, .03, .054); }
  if (o.faschen) { const fc = S.fasche; B(k, fc, x0 - .1, x0, v0 - .05, y1 + .1, -.02, .02, NO_AO); B(k, fc, x1, x1 + .1, v0 - .05, y1 + .1, -.02, .02, NO_AO); B(k, fc, x0, x1, y1, y1 + .1, -.02, .02, NO_AO); }
  if (o.shutters) { const h = o.hinge ?? (o.faschen ? .1 : .02), sw = W / 2 + .015; shutter(k, S, r, x0 - h, v0 - .01, H + .02, sw, -1, r.R(.06, .45)); shutter(k, S, r, x1 + h, v0 - .01, H + .02, sw, 1, r.R(.06, .45)); }
  if (o.box) flowerBox(k, S, r, u, v0 - .3, W);
  if (o.curtain !== false) curtains(k, S, r, u, v0, W, H, t);
  if (o.room) room(k, S, r, u, W, t, o.room.vF, o.room.vC, o.room.depth ?? .88, o.room);
  if (o.cat) cat(k, r, [u + W * .25, v0, .06], PI / 2 + r.R(-.3, .3));
}

// ---------------------------------------------------------------- Tür, Laterne, Hausnummer
function doorAt(k, S, r, u, v0, W, H, t, o = {}) {
  const x0 = u - W / 2, x1 = u + W / 2, y1 = v0 + H, zc = S.zarge;
  B(k, zc, x0 - .02, x0 + .08, v0, y1 + .02, -.17, .03); B(k, zc, x1 - .08, x1 + .02, v0, y1 + .02, -.17, .03);
  B(k, zc, x0 + .08, x1 - .08, y1 - .08, y1 + .02, -.17, .026);
  B(k, 0xa8a49a, x0 - .03, x1 + .03, v0 - .06, v0 + .02, -t + .02, .1);                         // Schwelle
  const by0 = v0 + .02, by1 = y1 - .08, n = Math.max(4, Math.round((W - .16) / .15)), bw = (W - .16) / n;
  B(k, C(S.tuer, .45), x0 + .07, x1 - .07, by0, by1, -.15, -.138);                                 // Rückseite (dunkel)
  for (let i = 0; i < n; i++) B(k, C(S.tuer, r.R(.86, 1.08)), x0 + .08 + i * bw + .003, x0 + .08 + (i + 1) * bw - .003, by0, by1 - r.R(0, .012), -.14, -.095 + r.R(-.004, .004), { jit: .06 });
  const ld = C(S.tuer, .8), lY = [by0 + .26, by1 - .3];
  for (const y of lY) B(k, ld, x0 + .1, x1 - .1, y - .06, y + .06, -.1, -.072);
  k.beam(ld, [x0 + .17, lY[0] + .05, -.086], [x1 - .17, lY[1] - .05, -.086], .1, { w: .1, d: .02 });
  for (const y of lY) { B(k, EISEN, x0 + .05, x0 + .52, y - .022, y + .022, -.074, -.064); k.ball(EISEN, [x0 + .45, y, -.064], .012); }   // Langbänder
  const hx = x1 - .15, hy = v0 + 1.02;
  B(k, MESSING, hx - .026, hx + .026, hy - .15, hy + .06, -.097, -.084);
  B(k, MESSING, hx - .014, hx + .014, hy - .014, hy + .014, -.084, -.045);
  B(k, MESSING, hx - .13, hx + .012, hy - .016, hy + .012, -.055, -.033);
  B(k, 0x1a1a1a, hx - .008, hx + .008, hy - .11, hy - .06, -.0845, -.0815);
  if (o.knocker) { k.add(RING(), MESSING, [u, v0 + 1.45, -.08], [.045, .045, .3]); B(k, MESSING, u - .02, u + .02, v0 + 1.47, v0 + 1.51, -.096, -.08); }
}
function lantern(k, u, v) {
  B(k, EISEN, u - .014, u + .014, v + .06, v + .09, 0, .27);
  tube(k, EISEN, [u, v - .12, .005], [u, v + .065, .2], .01, 4);
  const w = .24, y = v + .05;
  B(k, EISEN, u - .006, u + .006, y - .05, y + .02, w - .006, w + .006);
  k.cone(EISEN, [u, y - .07, w], .105, .09, 4, { r: [0, PI / 4, 0] });
  B(k, EISEN, u - .08, u + .08, y - .09, y - .07, w - .08, w + .08);
  B(k, 0xffe2a8, u - .06, u + .06, y - .3, y - .09, w - .06, w + .06, { layer: 'glow', ao: false, jit: 0 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(k, EISEN, u + sx * .062 - .008, u + sx * .062 + .008, y - .3, y - .09, w + sz * .062 - .008, w + sz * .062 + .008);
  B(k, EISEN, u - .075, u + .075, y - .33, y - .3, w - .075, w + .075);
  k.ball(EISEN, [u, y - .35, w], .02);
  k.spot('light', [u, y - .2, w]);
}
const SEG = { a: [0, .045, .05, .012], b: [.022, .0225, .012, .045], c: [.022, -.0225, .012, .045], d: [0, -.045, .05, .012], e: [-.022, -.0225, .012, .045], f: [-.022, .0225, .012, .045], g: [0, 0, .05, .012] };
const DIG = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abcdfg'];
function houseNumber(k, u, v, n) {
  B(k, 0x24508f, u - .055, u + .055, v - .075, v + .075, -.01, .012, NO_AO);
  B(k, 0xf4f4f0, u - .05, u + .05, v - .07, v + .07, .011, .0135, NO_AO);
  B(k, 0x24508f, u - .044, u + .044, v - .064, v + .064, .012, .016, NO_AO);
  for (const s of DIG[n % 10]) { const [cx, cy, w, h] = SEG[s]; B(k, 0xf4f4f0, u + cx * .8 - w * .4, u + cx * .8 + w * .4, v + cy - h / 2, v + cy + h / 2, .014, .022, NO_AO); }
}

// ---------------------------------------------------------------- Steinsockel aus einzelnen Steinen
// Rechteck mit halben Maßen ax (x) / bz (z) um (cx, cz), Oberkante top. sides: welche Seiten (F, K, R, L)
function plinth(k, r, ax, bz, top, cx = 0, cz = 0, sides = 'FKRL', courses = 2) {
  B(k, MOERTEL, cx - ax - .012, cx + ax + .012, -.8, top - .012, cz - bz - .012, cz + bz + .012, { jit: .05 });
  for (const s of sides) {
    const front = s === 'F' || s === 'K', L = front ? 2 * bz + .14 : 2 * ax - .1, [p, ry] = WALL[s](ax, bz);
    k.push([p[0] + cx, 0, p[2] + cz], ry);
    let y = top - .012;
    for (let c = 0; c < courses; c++) {
      const h = c === courses - 1 ? Math.max(.2, y + .32) : r.R(.2, .27), y0 = y - h;
      let u = -L / 2 - r.R(0, .2);
      while (u < L / 2) {
        const len = r.R(.4, .7), a = Math.max(-L / 2, u), b = Math.min(L / 2, u + len); u += len;
        if (b - a < .08) continue;
        const pr = r.R(.022, .055), d = .18, col = C(r.pick(STEIN), r.R(.88, 1.1));
        k.add(STONE(), col, [(a + b) / 2, y0 + .012, pr - d / 2], [b - a - .028, h - .026, d], { r: [r.R(-.04, .04), r.R(-.05, .05), r.R(-.03, .03)], jit: .12 });
        if (c === 0 && r.p(.12)) k.ball(C(MOOS, r.R(.85, 1.1)), [(a + b) / 2 + r.R(-.05, .05), y - .015, pr - .04], [(b - a) * .35, .025, .06], { tag: TAG.grass, ao: false });
      }
      y = y0;
    }
    k.pop();
  }
}

// ---------------------------------------------------------------- Dach
// Ziegelreihen in einem Dachrahmen (X entlang der Traufe, Y Normale, Z hangabwärts). base = Oberkante Dachplatte.
function tiles(k, S, r, X0, X1, s0, s1, base, o = {}) {
  const step = .34, L = .4, tw = .39, gap = .012, phi = .08, holes = o.holes || [];
  let row = 0;
  for (let sf = s1; sf > s0 + .02; sf -= step, row++) {
    const sb = Math.max(s0 - .08, sf - L), off = (row % 2) * tw / 2;
    for (let x = X0 - off; x < X1 - .02; x += tw) {
      const xa = Math.max(X0, x), xb = Math.min(X1, x + tw) - gap; if (xb - xa < .06) continue;
      const xm = (xa + xb) / 2, sm = (sb + sf) / 2;
      if (holes.some(h => xm > h[0] && xm < h[1] && sm > h[2] && sm < h[3])) continue;
      const q = r.f(), eave = row === 0;
      if (!eave && row > 1 && q < .0025) { B(k, HOLZ_D, xa - .02, xb + .02, base, base + .025, sb + .12, sb + .16, NO_AO); continue; }    // fehlt: Latte sichtbar
      let col = C(S.dach, r.R(.88, 1.08)); if (q > .988) col = C(S.dach, r.R(.7, .8)); else if (q > .98) col = MIX(S.dach, 0x8a6a50, .25);
      const moss = r.p(o.moss ?? .03) && !eave; if (moss) col = MIX(col, 0x6a7a3a, r.R(.15, .32));
      const slip = q > .94 && q < .946 && !eave ? r.R(.06, .1) : 0;
      k.add(TILE(), col, [xm, base, sb + slip], [xb - xa, .03, sf - sb], { r: [-phi, slip ? r.R(-.12, .12) : 0, 0], jit: .05, tag: TAG.roof });
      if (moss && r.p(.4)) k.ball(C(MOOS, r.R(.8, 1.1)), [xm, base + .03 + (sf - sb) * .5 * phi, sf - .1], [.1, .025, .09], { tag: TAG.grass, ao: false });
    }
  }
}
// Satteldach, First entlang z. aR = halbe Haustiefe (Außenwand), Lz = halbe Länge (Giebelwand außen), Ye = Wandoberkante.
function roof(k, S, r, aR, Lz, Ye, th, o, og, chim) {
  const tn = Math.tan(th), cs = Math.cos(th), sT = .14, Yr = Ye + aR * tn, sE = (aR + o) / cs, E = Lz + og, cc = sT * .9;
  for (const sx of [1, -1]) {
    k.pushM(slopeFrame(sx, 0, th, [0, Yr, 0]));
    // Plattenunterseite = Dachuntersicht
    B(k, 0x3a2a20, -E, E, 0, sT, -cc, sE, { ao: false, jit: .03 });
    B(k, S.unter, -E + .01, E - .01, -.02, .001, 0, sE - .005, { ao: false, jit: .03 });                                     // Untersicht (auch am Ortgang)
    for (let x = -Lz + .25; x <= Lz - .2; x += .62) B(k, S.sparren, x - .045, x + .045, -.13, 0, aR / cs - .3, sE - .03, { ao: false });     // Sparrenköpfe
    // Löcher für den Schornstein (Rahmen X = sx·(−z))
    const holes = [];
    if (chim && Math.sign(chim.x) === sx) { const Xc = -sx * chim.z, s0 = (Math.abs(chim.x) - chim.w / 2) / cs, s1 = (Math.abs(chim.x) + chim.w / 2) / cs; holes.push([Xc - chim.w / 2 - .05, Xc + chim.w / 2 + .05, s0 - .1, s1 + .05]); }
    tiles(k, S, r, -E + .045, E - .045, 0, sE + .04, sT, { holes, moss: sx < 0 ? .04 : .015 });
    for (const s of [-1, 1]) B(k, S.wind, s * E - .045 * s, s * E, -.12, sT + .1, -cc, sE + .05, { jit: .05 });                                // Windbretter
    if (chim && Math.sign(chim.x) === sx) {                                                                    // Blech um den Schornstein
      const Xc = -sx * chim.z, sc = Math.abs(chim.x) / cs, hw = chim.w / 2 + .07;
      B(k, ZINK_D, Xc - hw, Xc + hw, sT + .02, sT + .045, sc - hw / cs - .02, sc + hw / cs, { ao: false });
    }
    k.pop();
  }
  // Firstziegel
  const yA = Yr + sT / cs + .01;
  for (let z = -E; z < E - .05; z += .36) k.add(RIDGE(), C(S.dach, r.R(.82, 1)), [0, yA - .03, z], [.14, .14, Math.min(.39, E - z)], { jit: .05, tag: TAG.roof });
  for (const s of [-1, 1]) k.ball(C(S.dach, .9), [0, yA - .02, s * (E - .03)], [.125, .11, .04], { ao: false });
  // Pfettenköpfe unter dem Ortgang
  for (const s of [-1, 1]) {
    const z0 = s * (Lz - .15), z1 = s * (E - .07);
    B(k, S.sparren, -.09, .09, Yr - .26, Yr + .03, z0, z1, { ao: false });
    for (const sx of [-1, 1]) { const xi = aR * .45, xo = xi + .16, top = Ye + (aR - xi) * tn + .02; B(k, S.sparren, sx * xi, sx * xo, top - .24, top, z0, z1, { ao: false }); }
  }
  return { Yr, yA, tn, cs, sT, sE, E };
}
// Giebeldreieck (im Seiten-Wandrahmen) mit Fensteröffnung, Fachwerk und Giebelfenster
function gable(k, S, r, aR, Ye, th, t, win, opts = {}) {
  const tn = Math.tan(th), apex = Ye + aR * tn, sh = new THREE.Shape();
  sh.moveTo(-aR, Ye); sh.lineTo(aR, Ye); sh.lineTo(0, apex + .07); sh.closePath();
  const x0 = win.u - win.W / 2, x1 = win.u + win.W / 2, y0 = win.v0, y1 = win.v0 + win.H, hole = new THREE.Path();
  hole.moveTo(x0, y0); hole.lineTo(x0, y1); hole.lineTo(x1, y1); hole.lineTo(x1, y0); hole.closePath(); sh.holes.push(hole);
  const g = prep(new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false, curveSegments: 1 })).translate(0, 0, -t);
  k.add(g, S.gefach, [0, 0, 0], [1, 1, 1], { ao: false, jit: .015 });
  const col = () => C(S.balken, r.R(.88, 1.1)), O = { jit: .06 }, bw = .15, vt = u => Ye + (aR - Math.abs(u)) * tn;
  const sb = opts.sill ? Ye + .14 : Ye;
  if (opts.sill) B(k, col(), -aR - .03, aR + .03, Ye - .02, Ye + .14, -.06, .055, O);
  for (const s of [-1, 1]) k.beam(col(), [s * (aR - .05), Ye + .06, -.01], [0, apex - .02, -.01], .1, { w: .16, d: .11, jit: .06 });    // Ortgangbalken
  const pu = win.W / 2 + bw / 2;
  for (const s of [-1, 1]) B(k, col(), win.u + s * pu - bw / 2, win.u + s * pu + bw / 2, sb, vt(win.u + s * pu) - .05, -.06, .04, O);        // Ständer am Fenster
  const ct = y1 + bw, cw = aR - (ct - Ye) / tn - .02;
  B(k, col(), win.u - pu + bw / 2, win.u + pu - bw / 2, y0 - bw, y0, -.06, .035, O);                                                          // Brüstungsriegel
  B(k, col(), -cw, cw, y1, ct, -.06, .035, O);                                                                                               // Kehlbalken
  for (const s of [-1, 1]) {
    const ua = s * (aR * .74), ub = win.u + s * (pu + bw / 2);
    k.beam(col(), [ua, sb, -.02], [ub, Math.min(y1 - .05, sb + (Math.abs(ua - ub)) * .85), -.02], .1, { w: .12, d: .09, jit: .06 });         // Fußstreben
    const um = s * (aR * .5), top = vt(um) - .05;
    if (top - sb > .35) B(k, col(), um - bw / 2, um + bw / 2, sb, Math.min(top, y1), -.06, .04, O);
  }
  windowAt(k, S, r, win.u, y0, win.W, win.H, t, { room: { vF: Ye + .05, vC: Math.min(apex - .5, y1 + .6), depth: .75, attic: true, items: r.p(.5) ? ['lamp', 'truhe'] : ['truhe'] }, curtain: r.p(.4) });
}
// Schornstein aus Ziegelreihen, Abdeckplatte, Rauchrohr
function chimney(k, r, x, z, w, yb, yt) {
  B(k, MOERTEL, x - w / 2 + .008, x + w / 2 - .008, yb - .6, yt, z - w / 2 + .008, z + w / 2 - .008, { jit: .04 });
  const ch = .115, d = .12, h = w / 2, n = Math.floor((yt - yb) / ch);
  for (let j = 0; j < n; j++) {
    const y0 = yb + j * ch, m = j % 2 ? 1 : -1;
    // Verband: Reihe für Reihe laufen abwechselnd die x- oder z-Seiten über die Ecke, Stoßfugen versetzt
    for (const [nx, nz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const full = (j % 2 === 0) === (nz !== 0), e0 = full ? -h : -h + d, e1 = full ? h : h - d, sp = (e0 + e1) / 2 + m * .06;
      const cxp = x + nx * (h - d / 2), czp = z + nz * (h - d / 2);
      for (const [t0, t1] of full ? [[e0, sp - .006], [sp + .006, e1]] : [[e0, e1]]) {
        const col = C(r.pick([0x9a4a34, 0x8a3e2c, 0xa85a3e, 0x7e3a2a]), r.R(.85, 1.1));
        const tm = (t0 + t1) / 2, len = t1 - t0 - .006;
        k.add(STONE(), col, nx ? [cxp, y0 + .006, z + tm] : [x + tm, y0 + .006, czp], [len, ch - .012, d], { r: [0, Math.atan2(nx, nz), 0], jit: .06 });
      }
    }
  }
  const top = yb + n * ch;
  B(k, 0x8a8a84, x - h - .06, x + h + .06, top, top + .07, z - h - .06, z + h + .06, { jit: .05 });
  B(k, 0x2a2a2a, x - h + .06, x + h - .06, top + .07, top + .072, z - h + .06, z + h - .06, NO_AO);    // Ruß
  k.cyl(0x4a4a4c, [x, top + .07, z], .085, .34, 6, { ao: false });
  k.cyl(0x3a3a3c, [x, top + .38, z], .1, .04, 6, { ao: false });
  for (const s of [-1, 1]) B(k, 0x3a3a3c, x + s * .07 - .008, x + s * .07 + .008, top + .42, top + .52, z - .008, z + .008, NO_AO);
  k.cone(0x3a3a3c, [x, top + .5, z], .17, .1, 6, { ao: false });
  return top + .46;
}
// Dachrinne an der Traufe (sx = Seite) + Fallrohr(e)
// s = Richtung vom Haus weg (±1 in x)
function gutter(k, x, y, z0, z1, s = 1) {
  B(k, ZINK, x - .06, x + .06, y - .1, y - .088, z0, z1, { ao: false });
  B(k, ZINK, x + s * .058, x + s * .07, y - .1, y + .005, z0, z1, { ao: false });
  B(k, ZINK, x - s * .07, x - s * .058, y - .1, y - .02, z0, z1, { ao: false });
  tube(k, ZINK, [x + s * .064, y + .008, z0], [x + s * .064, y + .008, z1], .012, 4, NO_AO);
  for (const z of [z0, z1]) B(k, ZINK_D, x - .07, x + .07, y - .1, y, z - .006, z + .006, NO_AO);
  for (let z = z0 + .3; z < z1 - .2; z += 1.1) B(k, ZINK_D, x - s * .075, x + s * .08, y - .106, y - .094, z - .015, z + .015, NO_AO);
}
// Fallrohr: Punkte von oben nach unten; Schellen an senkrechten Stücken (wall = Wandseite: [nx, nz])
function downpipe(k, pts, wall) {
  for (let i = 0; i < pts.length - 1; i++) tube(k, ZINK, pts[i], pts[i + 1], .045, 6, NO_AO);
  for (let i = 1; i < pts.length - 1; i++) k.ball(ZINK, pts[i], .047, NO_AO);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1]; if (Math.abs(a[0] - b[0]) > .01 || Math.abs(a[2] - b[2]) > .01) continue;
    for (let y = b[1] + .5; y < a[1] - .2; y += 1.1) {
      k.cyl(ZINK_D, [a[0], y, a[2]], .055, .035, 6, NO_AO);
      const xr = wall[0] ? [a[0] - wall[0] * .13, a[0] - wall[0] * .04] : [a[0] - .012, a[0] + .012], zr = wall[1] ? [a[2] - wall[1] * .13, a[2] - wall[1] * .04] : [a[2] - .012, a[2] + .012];
      B(k, ZINK_D, xr[0], xr[1], y + .005, y + .03, zr[0], zr[1], NO_AO);
    }
  }
}

// ---------------------------------------------------------------- Requisiten
function cat(k, r, p, ry) {
  const c = r.pick([0xd8883a, 0x2a2a2c, 0x8a8a8c, 0xeeeae2, 0x6a4a32]);
  k.in(p, ry, () => {
    k.ball(c, [0, .1, 0], [.17, .1, .1], { ao: false });
    k.ball(c, [.15, .2, 0], [.075, .07, .075], { ao: false });
    for (const s of [-1, 1]) k.cone(c, [.15, .25, s * .035], .025, .05, 4, { ao: false });
    k.ball(0x2a2a20, [.215, .21, .025], .012, NO_AO); k.ball(0x2a2a20, [.215, .21, -.025], .012, NO_AO);
    k.ball(0xe8a0a0, [.225, .19, 0], .01, NO_AO);
    k.beam(c, [-.15, .07, .02], [-.25, .03, .12], .04, { ao: false }); k.beam(c, [-.25, .03, .12], [-.1, .02, .16], .035, { ao: false });
    for (const s of [-1, 1]) k.ball(c, [.1, .02, s * .05], [.04, .02, .025], NO_AO);
  });
}
function bench(k, r, p, ry, col) {
  k.in(p, ry, () => {
    for (const x of [-.52, .52]) {
      B(k, C(col, .85), x - .03, x + .03, -.25, .42, -.2, -.14); B(k, C(col, .85), x - .03, x + .03, -.25, .82, .15, .21);
      B(k, C(col, .85), x - .03, x + .03, .38, .42, -.2, .21);
    }
    for (let i = 0; i < 3; i++) B(k, C(col, r.R(.92, 1.08)), -.65, .65, .42, .455, -.22 + i * .14, -.1 + i * .14, { jit: .06 });
    for (const y of [.58, .72]) k.box(C(col, r.R(.92, 1.08)), [0, y, .2], [1.3, .1, .03], { r: [-.12, 0, 0], jit: .06 });
  });
}
function woodpile(k, r, x0, x1, zw) {
  for (const dz of [.08, .34]) B(k, HOLZ_D, x0 - .05, x1 + .05, -.35, .1, zw + dz - .04, zw + dz + .04);
  for (const x of [x0 - .08, x1 + .08]) for (const dz of [.07, .36]) B(k, HOLZ_D, x - .03, x + .03, -.3, 1.08, zw + dz - .03, zw + dz + .03);
  const dx = .19;
  for (let j = 0; j < 5; j++) {
    const y = .19 + j * .16, end = j === 4 ? x1 - .4 - r.R(0, .5) : x1 - .04;
    for (let x = x0 + .07 + (j % 2) * dx / 2; x < end; x += dx) {
      const c = r.p(.8) ? C(r.pick([0xc89a62, 0xb88a52, 0xd4a872]), r.R(.9, 1.05)) : C(0x7a5a3e, r.R(.85, 1.1)), rr = r.R(.09, .1);
      k.add(SCHEIT(), c, [x + r.R(-.01, .01), y, zw + .02 + r.R(0, .05)], [rr, rr, r.R(.34, .4)], { r: [0, 0, r.R(0, 6.28)], jit: .1 });
    }
  }
  for (let i = 0; i < 2; i++) k.box(C(HOLZ_G, r.R(.9, 1.1)), [(x0 + x1) / 2, 1.0, zw + .02 + i * .25], [x1 - x0 + .35, .03, .26], { r: [.18, 0, 0], jit: .05 });
}
function choppingBlock(k, r, p) {
  k.cyl(0x6b4a32, [p[0], p[1] - .3, p[2]], .24, .75, 8, { top: .95 }); k.cyl(0xc9a878, [p[0], p[1] + .45, p[2]], .225, .012, 8, NO_AO);
  k.beam(0x9a7a4a, [p[0] + .05, p[1] + .46, p[2]], [p[0] + .45, p[1] + .78, p[2] + .1], .035);
  k.box(0x6a6e72, [p[0] + .05, p[1] + .43, p[2]], [.16, .1, .025], { r: [0, -.24, -.65] });
  for (let i = 0; i < 4; i++) k.add(SCHEIT(), C(0xc89a62, r.R(.9, 1.1)), [p[0] + r.R(-.5, .4), p[1] + .06, p[2] + r.R(-.1, .25)], [.075, .075, .36], { r: [0, r.R(0, 6), r.R(0, 6)] });
}
function bike(k, r, p, ry, lean, col) {
  const M = new THREE.Matrix4().makeRotationY(ry).premultiply(new THREE.Matrix4().makeTranslation(...p)).multiply(new THREE.Matrix4().makeRotationX(lean));
  k.pushM(M);
  const R = [-.52, .33, 0], F = [.52, .33, 0], BB = [-.04, .3, 0], St = [-.16, .8, 0], H = [.4, .86, 0], H2 = [.43, .72, 0];
  for (const c of [R, F]) {
    k.add(RING(), 0x1e1e1e, c, [.33, .33, .33], { ao: false });
    k.add(RING(), 0x9a9a9a, c, [.29, .29, .15], { ao: false });                                                   // Felge
    k.cyl(0x9a9a9a, [c[0], c[1], -.04], .03, .08, 6, { r: [PI / 2, 0, 0], ao: false });
    for (let i = 0; i < 3; i++) { const a = i * PI / 3 + .3; k.beam(0xb0b0b0, [c[0] + Math.cos(a) * .28, c[1] + Math.sin(a) * .28, 0], [c[0] - Math.cos(a) * .28, c[1] - Math.sin(a) * .28, 0], .006, NO_AO); }
  }
  const T = (a, b, t = .026) => tube(k, col, a, b, t, 5, NO_AO);
  T(BB, St); T(St, H2); T(BB, H2, .03); T(BB, R, .018); T([St[0] + .03, St[1] - .05, 0], R, .016); T(H2, F, .02); T(H2, H, .024);
  T([-.18, .86, 0], [-.16, .8, 0], .015);
  k.box(0x2a2018, [-.2, .86, 0], [.22, .05, .1], { ao: false });
  tube(k, 0x2a2a2a, [H[0] - .04, H[1] + .03, -.26], [H[0] - .04, H[1] + .03, .26], .014, 5, NO_AO);
  for (const s of [-1, 1]) tube(k, 0x2a2018, [H[0] - .04, H[1] + .03, s * .26], [H[0] - .04, H[1] + .03, s * .17], .022, 5, NO_AO);
  B(k, 0x8a6a40, F[0] - .1, F[0] + .16, .9, .92, -.14, .14, NO_AO);                                                  // Korb aus Weide
  for (const s of [-1, 1]) { B(k, 0x9a7a4a, F[0] - .1, F[0] + .16, .92, 1.07, s * .14 - .012, s * .14 + .012, NO_AO); B(k, 0x9a7a4a, F[0] + (s > 0 ? .148 : -.1), F[0] + (s > 0 ? .16 : -.088), .92, 1.07, -.13, .13, NO_AO); }
  for (const s of [-1, 1]) tube(k, 0x7a7a7a, [F[0], F[1], s * .03], [F[0] + .03, .9, s * .1], .008, 4, NO_AO);
  k.cyl(0x7a7a7a, [BB[0], BB[1], -.06], .07, .12, 8, { r: [PI / 2, 0, 0], ao: false });
  for (const s of [-1, 1]) { const pz = s * .1, px = BB[0] + s * .05, py = BB[1] - s * .15; tube(k, 0x5a5a5a, [BB[0], BB[1], pz], [px, py, pz], .012, 4, NO_AO); B(k, 0x2a2a2a, px - .05, px + .05, py - .012, py + .012, pz - .02 + s * .04, pz + .02 + s * .04, NO_AO); }
  k.box(C(col, .9), [R[0], .62, 0], [.42, .02, .09], { r: [0, 0, .25], ao: false });                              // Gepäckträger/Schutzblech
  k.pop();
}
function wheelbarrow(k, r, p, ry) {
  k.in(p, ry, () => {
    const c = r.pick([0x3a6a3a, 0x8a2a24, 0x2a4a7a]);
    k.box(c, [0, .32, 0], [.7, .04, .5], { r: [0, 0, -.05] });
    for (const s of [-1, 1]) k.box(C(c, .9), [0, .34, s * .27], [.82, .26, .03], { r: [s * .25, 0, -.05] });
    k.box(C(c, .9), [.38, .34, 0], [.03, .26, .52], { r: [0, 0, -.45] }); k.box(C(c, .9), [-.36, .34, 0], [.03, .26, .52], { r: [0, 0, .35] });
    k.cyl(0x1e1e1e, [.6, .18, -.04], .18, .08, 10, { r: [PI / 2, 0, 0] });
    for (const s of [-1, 1]) { k.beam(HOLZ, [.6, .18, s * .1], [-.95, .5, s * .26], .04); B(k, EISEN, -.3, -.26, 0, .32, s * .2 - .015, s * .2 + .015); }
    for (let i = 0; i < 3; i++) k.cyl(C(0xc89a62, r.R(.9, 1.1)), [r.R(-.2, .1), .4, r.R(-.15, .15) - .15], .07, .36, 3, { r: [PI / 2, r.R(0, 6), r.R(-.4, .4)] });
  });
}
function mailbox(k, r, p, col) {
  B(k, HOLZ_D, p[0] - .04, p[0] + .04, -.3, 1.02, p[2] - .04, p[2] + .04);
  B(k, col, p[0] - .13, p[0] + .13, 1.02, 1.24, p[2] - .1, p[2] + .1);
  k.cyl(col, [p[0] - .13, 1.24, p[2]], .1, .26, 8, { r: [0, 0, -PI / 2] });
  B(k, 0x1a1a1a, p[0] + .13, p[0] + .14, 1.16, 1.19, p[2] - .07, p[2] + .07, NO_AO);
  B(k, C(col, .8), p[0] + .13, p[0] + .145, 1.19, 1.215, p[2] - .08, p[2] + .08, NO_AO);
  B(k, 0xd83a2a, p[0] - .05, p[0] + .05, 1.25, 1.31, p[2] + .1, p[2] + .115, NO_AO);
  B(k, EISEN, p[0] - .01, p[0] + .01, 1.12, 1.27, p[2] + .1, p[2] + .11, NO_AO);
}
function pot(k, r, p, s = 1, flowers = true) {
  k.cyl(C(TON, r.R(.9, 1.1)), [p[0], p[1] - .06, p[2]], .13 * s, .24 * s + .06, 7, { top: 1.2 });
  k.cyl(C(TON, .85), [p[0], p[1] + .2 * s, p[2]], .158 * s, .045 * s, 7);
  B(k, ERDE, p[0] - .1 * s, p[0] + .1 * s, p[1] + .2 * s, p[1] + .235 * s, p[2] - .1 * s, p[2] + .1 * s, NO_AO);
  k.ball(C(LAUB, r.R(.85, 1.1)), [p[0], p[1] + .33 * s, p[2]], [.17 * s, .13 * s, .17 * s], { tag: TAG.grass, sway: .2, jit: .12 });
  if (flowers) { const fc = r.pick(BLUME); for (let i = 0; i < 4; i++) k.boxc(C(fc, r.R(.9, 1.1)), [p[0] + r.R(-.1, .1) * s, p[1] + r.R(.4, .48) * s, p[2] + r.R(-.1, .1) * s], [.06 * s, .045 * s, .06 * s], { r: [r.R(0, 1), r.R(0, 1), 0], tag: TAG.flower, sway: .3, ao: false }); }
}
function barrel(k, r, p) {
  k.cyl(C(0x7a5a3a, r.R(.9, 1.05)), [p[0], -.3, p[2]], .3, 1.07, 12, { top: .94, jit: .1 });
  for (const y of [.12, .62]) k.cyl(EISEN, [p[0], y, p[2]], .305 - y * .02, .035, 12, { ao: false });
  k.cyl(0x2a3a44, [p[0], .74, p[2]], .275, .01, 12, NO_AO);
  k.cyl(0x5a4028, [p[0], .74, p[2]], .29, .025, 12, { top: 1, ao: false });
}

// ---------------------------------------------------------------- Bretterwand (Boden-Deckel-Schalung) für den Anbau
// vTop(u) = Oberkante; holes werden auf das Brettraster gerundet und zurückgegeben
function boards(k, S, r, U0, U1, v0, vTop, holes) {
  const bw = .16, n = Math.round((U1 - U0) / bw), w = (U1 - U0) / n;
  const snap = holes.map(h => ({ ...h, a: U0 + Math.round((h.a - U0) / w) * w, b: U0 + Math.round((h.b - U0) / w) * w }));
  for (let i = 0; i < n; i++) {
    const a = U0 + i * w, b = a + w, m = (a + b) / 2, top = Math.max(vTop(a), vTop(b)) + .05, odd = i % 2;
    const c = C(S.brett, r.R(.86, 1.08)), x0 = odd ? a - .02 : a, x1 = odd ? b + .02 : b, z0 = odd ? .012 : -.03, z1 = odd ? .036 : -.005 + r.R(-.002, .002);
    let iv = [[v0, top]];
    for (const h of snap) if (h.a < m && m < h.b) iv = iv.flatMap(([lo, hi]) => { const o = []; if (h.lo > lo) o.push([lo, Math.min(hi, h.lo)]); if (h.hi < hi) o.push([Math.max(lo, h.hi), hi]); return o; });
    for (const [lo, hi] of iv) if (hi - lo > .01) B(k, c, x0, x1, lo, hi - (odd ? r.R(0, .01) : 0), z0, z1, { jit: .07 });
  }
  return snap;
}

// ---------------------------------------------------------------- Haus
export function house(k, { stage = 1, seed = 0 } = {}) {
  stage = Math.max(1, Math.min(3, stage | 0));
  const L0 = Object.fromEntries(Object.entries(k.L).map(([n, l]) => [n, l.length])), inv = k.M.clone().invert(), _p = new THREE.Vector3();
  const V = RNG(seed, 'variante');
  const putz = V.pick(PUTZ), dach = V.pick(DACH), laden = V.pick(LADEN), balken = V.p(.12) ? BALKEN[3] : V.pick(BALKEN.slice(0, 3));
  const S = {
    putz, dach, laden, balken,
    gefach: MIX(putz, 0xffffff, .45), fasche: MIX(putz, 0xffffff, .55), bank: V.pick([0xc8c0b0, 0xa89a84, 0xe8e4dc]),
    rahmen: V.p(.65) ? 0xf2efe6 : MIX(laden, 0xffffff, .25), tuer: V.p(.5) ? laden : V.pick([HOLZ_D, 0x7a4a2a, 0x5a3a24]),
    zarge: MIX(balken, 0x6a5038, .4), unter: V.pick([0x9a7a58, 0xd8d0c0, 0x8a6a4a]), sparren: MIX(balken, 0x6a5038, .3), wind: balken,
    kasten: V.pick([0x8a6a48, 0x5a4030, TON, 0x3a5a3a]), gardine: V.pick(GARDINE), brett: V.pick([0x7a5a3a, 0x8a7a64, 0x5a4a3a]),
    ladenArt: V.p(.68) ? 'lamellen' : 'brett',
  };
  const num = 1 + V.i(9), catWhere = V.p(.22) ? V.pick(['bank', 'fenster']) : null, useBike = V.p(.55), th = V.R(.76, .84), mailCol = V.pick([0xe8b830, 0x3a6a3a, 0xb8322a, 0x2a5a9a]);
  const chimZ = V.R(.9, 1.4) * (V.p(.5) ? 1 : -1);

  const two = stage >= 2, a1 = 2.2, b = 2.8, t = .25, FL = .38;
  const Ye1 = two ? 2.84 : 2.9, ov = .25, a2 = a1 + ov, Y2 = 3.16, Ye2 = 5.52;
  const aR = two ? a2 : a1, Ye = two ? Ye2 : Ye1, o = .42, og = .4;
  const rW = RNG(seed, 'wand'), rF = RNG(seed, 'fenster'), rI = RNG(seed, 'innen'), rD = RNG(seed, 'dach'), rS = RNG(seed, 'sockel'), rP = RNG(seed, 'deko'), rO = RNG(seed, 'og'), rA = RNG(seed, 'anbau'), rG = RNG(seed, 'garten');

  // ---------- Erdgeschoss
  const v0g = FL + .85, Hg = 1.05, Wg = .8, doorU = .1, doorW = 1.0, doorH = 2.0;
  const gW = { F: [{ u: 1.8, W: Wg }, { u: -1.65, W: Wg }], K: [{ u: -1.3, W: Wg }, { u: 1.3, W: Wg }], R: [{ u: .3, W: .75 }], L: stage < 3 ? [{ u: .3, W: .75 }] : [] };
  for (const s of 'FKRL') {
    const len = s === 'F' || s === 'K' ? b : a1 - t, wins = gW[s].map(w => ({ ...w, v0: v0g, H: Hg }));
    const holes = wins.map(w => ({ a: w.u - w.W / 2, b: w.u + w.W / 2, lo: w.v0, hi: w.v0 + w.H }));
    if (s === 'F') holes.push({ a: doorU - doorW / 2, b: doorU + doorW / 2, lo: FL, hi: FL + doorH });
    onWall(k, s, a1, b, () => {
      wallPieces(k, putz, -len, len, FL, Ye1, t, holes, rW, { band: .3 });
      weather(k, S, rW, -len, len, FL, Ye1, wins, s === 'F' ? [{ u: doorU, W: doorW + .5, v0: FL, H: doorH }, { u: -.62, W: .3, v0: 1.5, H: .6 }] : []);
      wins.forEach((w, i) => windowAt(k, S, rF, w.u, w.v0, w.W, w.H, t, {
        faschen: true, shutters: true, box: (s === 'F' && !(catWhere === 'fenster' && i === 0)) || (s === 'K' && rF.p(.5)), cat: catWhere === 'fenster' && s === 'F' && i === 0,
        room: { vF: FL, vC: Ye1 - .14, depth: .88 },
      }));
      if (s === 'F') {
        doorAt(k, S, rF, doorU, FL, doorW, doorH, t, { knocker: V.p(.4) });
        lantern(k, -.62, 1.95);
        houseNumber(k, .79, FL + 1.5, num);
      }
    });
  }
  plinth(k, rS, a1, b, FL);
  // Treppe vor der Tür (Tür liegt bei z = −doorU)
  const dz = -doorU;
  k.box(C(0x9a958c, 1.02), [a1 + .16, -.3, dz], [.38, .66, 1.16], { r: [0, .01, 0], jit: .08 });
  k.box(C(0x8f8b84, 1), [a1 + .5, -.35, dz + .02], [.44, .53, 1.0], { r: [0, -.03, 0], jit: .08 });
  B(k, 0x7a5a3a, a1 + .04, a1 + .3, .36, .372, dz - .3, dz + .3, { jit: .15 });                  // Fußmatte
  k.box(C(0x8f8b84, .95), [a1 + 1.05, -.2, dz + .05], [.5, .24, .6], { r: [0, .2, 0], jit: .1 });   // Trittplatte im Weg

  // ---------- Obergeschoss (Fachwerk)
  if (two) {
    const bal = () => C(balken, rO.R(.9, 1.08)), O = { jit: .06 };
    for (const sx of [1, -1]) {
      B(k, bal(), sx * (a1 - .2), sx * (a1 + .03), 2.84, 2.99, -(b - .2), b - .2, O);                      // Rähm
      for (let z = -b + .45; z <= b - .44; z += (2 * b - .9) / 9) B(k, bal(), sx * (a1 - .25), sx * (a2 + .03), 2.98, 3.16, z - .065, z + .065, O);   // Deckenbalken
      B(k, S.unter, sx * (a1 - .02), sx * (a2 - .05), 2.985, 3.005, -(b - .2), b - .2, NO_AO);              // Untersicht
      B(k, C(balken, .8), sx * (a2 - .2), sx * (a2 - .02), 2.98, 3.16, -(b - .2), b - .2, NO_AO);            // Füllholz
      B(k, bal(), sx * (a2 - .2), sx * (a2 + .05), Y2, Y2 + .16, -(b + .05), b + .05, O);                  // Schwelle
      B(k, bal(), sx * (a2 - .2), sx * (a2 + .05), Ye2 - .15, Ye2, -(b + .05), b + .05, O);                // Rähm OG
    }
    for (const sz of [1, -1]) {
      B(k, bal(), -(a2 + .03), a2 + .03, 2.84, 3.16, sz * (b - .2), sz * (b + .03), O);                    // Stockschwelle
      B(k, bal(), -(a2 - .2), a2 - .2, Y2, Y2 + .16, sz * (b - .2), sz * (b + .05), O);
      B(k, bal(), -(a2 - .2), a2 - .2, Ye2 - .15, Ye2, sz * (b - .2), sz * (b + .05), O);
      for (const sx of [1, -1]) B(k, bal(), sx * (a2 - .15), sx * (a2 + .045), Y2 + .16, Ye2 - .15, sz * (b - .15), sz * (b + .045), O);   // Eckständer
    }
    const v0u = Y2 + .72, Hu = 1.0, uW = { F: [{ u: 1.4, W: Wg }, { u: -1.4, W: Wg }], K: [{ u: -1.4, W: Wg }, { u: 1.4, W: Wg }], R: [{ u: -.35, W: .75 }], L: [{ u: .35, W: .75 }] };
    for (const s of 'FKRL') {
      const fr = s === 'F' || s === 'K', len = fr ? b : a2 - t, U = (fr ? b : a2) - .15, wins = uW[s].map(w => ({ ...w, v0: v0u, H: Hu }));
      const holes = wins.map(w => ({ a: w.u - w.W / 2, b: w.u + w.W / 2, lo: w.v0, hi: w.v0 + w.H }));
      onWall(k, s, a2, b, () => {
        wallPieces(k, S.gefach, -len, len, Y2, Ye2, t, holes, rW);
        fachwerk(k, S, rO, -U, U, Y2 + .16, Ye2 - .15, holes);
        wins.forEach(w => windowAt(k, S, rF, w.u, w.v0, w.W, w.H, t, { shutters: true, hinge: .16, box: s === 'F' && rF.p(.7), room: { vF: Y2 + .05, vC: Ye2 - .18, depth: .85 } }));
      });
    }
    // Vordach über der Tür
    const cy = 2.66, cd = .82, ca = .32;
    k.pushM(slopeFrame(1, 0, ca, [a1 - .02, cy, dz]));
    B(k, 0x3a2a20, -.78, .78, 0, .07, -.02, cd, { ao: false }); B(k, S.unter, -.77, .77, -.015, .001, .02, cd - .005, NO_AO);
    tiles(k, S, rD, -.76, .76, 0, cd + .04, .07, { moss: .05 });
    for (const s of [-1, 1]) B(k, S.wind, s * .78 - .035 * s, s * .78, -.06, .15, -.02, cd + .03);
    k.pop();
    for (const s of [-1, 1]) {
      const z = dz + s * .62;
      k.beam(C(balken), [a1 + .01, 2.2, z], [a1 + .62, cy - .62 * Math.tan(ca) - .04, z], .09);
      B(k, C(balken), a1 - .02, a1 + .72, cy - .72 * Math.tan(ca) - .1, cy - .72 * Math.tan(ca) - .02, z - .045, z + .045, { r: [0, 0, 0] });
    }
    B(k, ZINK_D, a1 - .02, a1 + .06, cy + .02, cy + .2, dz - .8, dz + .8, NO_AO);                                 // Anschlussblech
  }

  // ---------- Dach, Giebel, Schornstein
  const chim = { x: -.52, z: chimZ, w: .5 };
  const R = roof(k, S, rD, aR, b, Ye, th, o, og, chim);
  const gw = { u: 0, W: .5, v0: Ye + .42, H: .6 };
  for (const s of 'RL') onWall(k, s, aR, b, () => gable(k, S, rD, aR, Ye, th, t, gw, { sill: !two }));
  const yLow = Ye + (aR - (Math.abs(chim.x) + chim.w / 2)) * R.tn + R.sT / R.cs;
  const smoke = chimney(k, rD, chim.x, chim.z, chim.w, yLow - .02, R.yA + .75);
  k.spot('smoke', [chim.x, smoke, chim.z]);
  // Dachrinnen und Fallrohre
  const gx = aR + o + .12, gy = Ye - o * R.tn + .03;
  for (const sx of [1, -1]) {
    gutter(k, sx * gx, gy, -R.E + .03, R.E - .03, sx);
    const zp = sx > 0 ? b - .17 : -(b - .17), wx = sx * (aR + .12), top = gy - .1;
    const pts = [[sx * gx, top, zp], [sx * gx, top - .15, zp], [wx, top - .5, zp]];
    if (two) pts.push([wx, 2.72, zp], [sx * (a1 + .12), 2.42, zp]);
    const lx = sx * (a1 + .12);
    if (sx > 0) pts.push([lx, .25, zp], [sx * (a1 + .3), .08, zp]);
    else pts.push([lx, 1.0, zp], [sx * (a1 + .4), .86, zp]);
    downpipe(k, pts, [sx, 0]);
    if (sx > 0) k.box(0x9a958c, [a1 + .38, -.25, zp], [.28, .31, .2], { jit: .1 });                // Wasserstein
  }
  barrel(k, rP, [-(a1 + .43), 0, -(b - .3)]);

  // ---------- Rund ums Haus
  bench(k, rP, [a1 + .42, 0, 1.65], -PI / 2, V.pick([HOLZ, 0x6a7a5a, 0x7a5a3a]));
  k.spot('sit', [a1 + .45, .45, 1.65], { ry: PI / 2 });
  if (catWhere === 'bank') cat(k, rP, [a1 + .45, .455, 1.95], rP.R(-1, 1));
  woodpile(k, rP, -1.7, .55, b + .05);
  choppingBlock(k, rP, [-.9, 0, b + 1.0]);
  if (useBike) bike(k, rP, [1.65, 0, b + .45], 0, -.16, V.pick([0x2a5a9a, 0x9a2a2a, 0x2a6a4a, 0xd8d0c0, 0x2a2a2a]));
  else wheelbarrow(k, rP, [1.6, 0, b + .75], .3);
  mailbox(k, rP, [a1 + 1.5, 0, dz - .95], mailCol);
  pot(k, rP, [a1 + .45, 0, dz + .78], 1); pot(k, rP, [a1 + .42, 0, dz - .78], .85); if (rP.p(.6)) pot(k, rP, [a1 + .75, 0, dz + .8], .7, false);
  k.spot('door', [a1 + 1.0, 0, dz]);

  // ---------- Stufe 3: Anbau und Garten
  if (stage >= 3) {
    const xa0 = -1.35, xa1 = 1.25, zb = -4.15, FA = .25, yA = 2.62, run = -zb - b, phi = Math.atan2(yA - 2.02, -zb - b), tp = Math.tan(phi);
    const yAt = z => yA - (-b - z) * tp, xm = (xa0 + xa1) / 2, hw = (xa1 - xa0) / 2, zm = (zb - b) / 2;
    plinth(k, rA, hw, (-b - zb) / 2, FA, xm, zm, 'FKL', 1);
    // Außenwand −z mit Fenster
    const aw = { u: .15, W: .7, v0: FA + .82, H: .7 };
    k.push([xm, 0, zb], PI);
    let h = boards(k, S, rA, -hw, hw, FA, () => yAt(zb), [{ a: aw.u - aw.W / 2, b: aw.u + aw.W / 2, lo: aw.v0, hi: aw.v0 + aw.H }])[0];
    windowAt(k, S, rA, (h.a + h.b) / 2, h.lo, h.b - h.a, h.hi - h.lo, .05, { trim: true, shutters: true, hinge: .1, box: rA.p(.6), room: { vF: FA, vC: yAt(zb) - .1, depth: .9, items: ['lamp', rA.pick(['regal', 'kommode', 'pflanze'])] } });
    k.pop();
    // Seitenwand +x mit Tür, −x geschlossen
    const dW = .75;
    k.push([xa1, 0, zm], PI / 2);
    h = boards(k, S, rA, -(-b - zb) / 2, (-b - zb) / 2, FA, u => yAt(-u + zm), [{ a: -.06 - dW / 2, b: -.06 + dW / 2, lo: FA, hi: FA + 1.75 }])[0];
    doorAt(k, { ...S, tuer: S.brett }, rA, (h.a + h.b) / 2, FA, h.b - h.a, 1.75, .05);
    { const c = C(S.brett, .75), x0 = h.a, x1 = h.b, y1 = FA + 1.75; B(k, c, x0 - .1, x0 - .005, FA, y1 + .1, .03, .058); B(k, c, x1 + .005, x1 + .1, FA, y1 + .1, .03, .058); B(k, c, x0 - .005, x1 + .005, y1 + .02, y1 + .1, .03, .054); }
    B(k, 0x9a958c, (h.a + h.b) / 2 - .45, (h.a + h.b) / 2 + .45, -.25, FA - .02, -.02, .4, { jit: .08 });         // Stufe
    lantern(k, h.b + .19, 1.72);
    k.pop();
    k.push([xa0, 0, zm], -PI / 2);
    boards(k, S, rA, -(-b - zb) / 2, (-b - zb) / 2, FA, u => yAt(u + zm), []);
    k.pop();
    for (const [x, z] of [[xa0, zb], [xa1, zb]]) B(k, C(S.brett, .8), x - .06, x + .06, FA, yAt(zb) + .05, z - .06, z + .06);   // Eckbretter
    // Pultdach
    k.pushM(slopeFrame(0, -1, phi, [xm, yA, -b]));
    const sEa = (run + .22) / Math.cos(phi), Xa = hw + .18;
    B(k, S.unter, -Xa, Xa, 0, .12, -.05, sEa, { ao: false });
    for (let x = -hw + .1; x < hw; x += .6) B(k, S.sparren, x - .04, x + .04, -.11, 0, -.05, sEa - .03, NO_AO);
    tiles(k, S, rA, -Xa + .04, Xa - .04, 0, sEa + .04, .12, { moss: .06 });
    for (const s of [-1, 1]) B(k, S.wind, s * Xa - .04 * s, s * Xa, -.1, .22, -.05, sEa + .04);
    k.pop();
    B(k, ZINK_D, xa0 - .2, xa1 + .2, yA + .12, yA + .3, -b - .1, -b + .03, NO_AO);                                // Anschlussblech
    const gyA = yA - (run + .22) * tp + .02, gzA = zb - .22 - .1;
    k.push([0, 0, 0], PI / 2); gutter(k, -gzA, gyA, xa0 - .16, xa1 + .16, 1); k.pop();                    // Rinne entlang x
    downpipe(k, [[xa0 + .05, gyA - .1, gzA], [xa0 + .05, gyA - .25, gzA], [xa0 + .1, gyA - .45, zb - .1], [xa0 + .1, .2, zb - .1], [xa0 + .1, .08, zb - .3]], [0, -1]);
    // Kleinkram am Anbau
    pot(k, rA, [xa1 + .35, 0, zb + .25], .8); pot(k, rA, [xa1 + .62, 0, zb + .1], .6, false);
    k.cyl(0x3a6a5a, [xa1 + .3, 0, -2.95], .1, .22, 8, { top: .85 }); tube(k, 0x3a6a5a, [xa1 + .35, .15, -2.95], [xa1 + .6, .3, -2.95], .015, 4);   // Gießkanne

    // Garten hinten
    const P = [[-2.25, 2.98], [-3.55, 3.05], [-4.45, 1.55], [-4.45, -1.55], [-3.55, -3.05], [-2.25, -2.98]];
    for (let i = 0; i < P.length - 1; i++) fence(k, rG, P[i], P[i + 1], i === 2, i === 0);
    bed(k, rG, -3.3, -1.25, .8, 1.4, 'kohl'); bed(k, rG, -3.3, 1.1, .8, 1.4, 'mix');
    clothesline(k, rG, -4.05, 1.45);
    bench(k, rG, [-(a1 + .42), 0, 0], PI / 2, V.pick([HOLZ, 0x6a7a5a, 0x7a5a3a]));
    k.spot('sit', [-(a1 + .45), .45, 0], { ry: -PI / 2 });
    k.cyl(0x8a8a8c, [-3.0, 0, 2.55], .12, .24, 8, { top: 1.15 }); tube(k, 0x8a8a8c, [-2.95, .18, 2.55], [-2.7, .32, 2.6], .015, 4);   // Gießkanne
  }

  // Belegter Radius aus der Geometrie
  let rad = 0;
  for (const [n, list] of Object.entries(k.L)) for (const g of list.slice(L0[n] || 0)) { const p = g.attributes.position.array; for (let i = 0; i < p.length; i += 3) { _p.set(p[i], p[i + 1], p[i + 2]).applyMatrix4(inv); rad = Math.max(rad, Math.hypot(_p.x, _p.z)); } }
  return { radius: Math.ceil(rad * 10) / 10, door: [a1 + .05, 0, dz] };
}

// ---------------------------------------------------------------- Garten
function fence(k, r, a, b, gate, first = true) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]), n = Math.max(1, Math.round(L / 1.3));
  const post = 0x7a5a3a, lat = 0xe8e2d4;
  k.push([a[0], 0, a[1]], -ang);
  for (let i = first ? 0 : 1; i <= n; i++) { const x = L * i / n; B(k, C(post, r.R(.85, 1.1)), x - .045, x + .045, -.35, .95, -.045, .045); k.box(C(post, .85), [x, .95, 0], [.11, .03, .11]); }
  for (const y of [.25, .7]) B(k, C(post, .95), 0, L, y - .035, y + .035, -.08, -.045);
  const m = Math.round(L / .14);
  for (let i = 1; i < m; i++) {
    const x = L * i / m; if (r.p(.03)) continue;                                          // eine Latte fehlt
    const h = .85 + (i % 2) * .03, c = r.p(.15) ? C(0xa8a090, r.R(.9, 1.1)) : C(lat, r.R(.92, 1.04)), tilt = r.p(.05) ? r.R(-.12, .12) : 0;
    k.box(c, [x, .06, -.095], [.065, h - .06, .022], { r: [0, 0, tilt], jit: .05 });
    k.prism(c, [x - Math.sin(tilt) * (h - .06), h, -.095], .065, .05, .022, { r: [0, 0, tilt] });
  }
  if (gate) {                                                                               // Pforte mit Z-Strebe
    const g0 = L / 2 - .45, g1 = L / 2 + .45;
    for (const y of [.25, .7]) B(k, 0x8a6a48, g0, g1, y - .04, y + .04, -.14, -.11);
    k.beam(0x8a6a48, [g0 + .05, .26, -.125], [g1 - .05, .69, -.125], .06, { w: .07, d: .03 });
    B(k, EISEN, g1 - .1, g1 - .02, .45, .5, -.16, -.14);
  }
  k.pop();
}
function bed(k, r, x, z, w, d, kind) {
  for (const s of [-1, 1]) { B(k, C(HOLZ, r.R(.85, 1.05)), x - w / 2, x + w / 2, -.35, .28, z + s * d / 2 - .03, z + s * d / 2 + .03); B(k, C(HOLZ, r.R(.85, 1.05)), x + s * w / 2 - .03, x + s * w / 2 + .03, -.35, .28, z - d / 2 + .03, z + d / 2 - .03); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(k, HOLZ_D, x + sx * w / 2 - .04, x + sx * w / 2 + .04, -.2, .32, z + sz * d / 2 - .04, z + sz * d / 2 + .04);
  B(k, ERDE, x - w / 2 + .03, x + w / 2 - .03, -.1, .24, z - d / 2 + .03, z + d / 2 - .03, { jit: .12 });
  const rows = 2;
  for (let i = 0; i < rows; i++) {
    const px = x + (i - .5) * w * .45;
    for (let j = 0; j < 4; j++) {
      const pz = z - d / 2 + .2 + j * (d - .4) / 3, y = .24;
      const what = kind === 'kohl' ? (i ? 'salat' : 'kohl') : (i ? 'karotte' : (j % 2 ? 'tomate' : 'salat'));
      if (what === 'kohl') { k.ball(C(0x7aa86a, r.R(.9, 1.1)), [px, y + .08, pz], [.13, .1, .13], { tag: TAG.grass, jit: .12 }); k.ball(0xb8d88a, [px, y + .14, pz], .06, { ao: false }); }
      else if (what === 'salat') k.ball(C(0x8ac84a, r.R(.9, 1.1)), [px, y + .06, pz], [.11, .07, .11], { tag: TAG.grass, jit: .15 });
      else if (what === 'karotte') for (let q = 0; q < 3; q++) k.cone(C(0x5a9a3a, r.R(.9, 1.1)), [px + r.R(-.05, .05), y, pz + r.R(-.05, .05)], .04, .2, 4, { tag: TAG.grass, sway: { k: .6 }, swayBase: y, ao: false });
      else { k.cyl(HOLZ, [px, y, pz], .012, .75, 4, NO_AO); k.ball(C(LAUB, .9), [px, y + .4, pz], [.12, .2, .12], { tag: TAG.grass, sway: { k: .3 }, swayBase: y, jit: .15 }); for (let q = 0; q < 3; q++) k.ball(0xd83a2a, [px + r.R(-.08, .08), y + r.R(.25, .55), pz + r.R(-.08, .08)], .035, { ao: false, sway: { k: .3 }, swayBase: y }); }
    }
  }
}
function clothesline(k, r, x, zA) {
  for (const s of [-1, 1]) { const z = s * zA; B(k, HOLZ_G, x - .04, x + .04, -.3, 1.9, z - .04, z + .04); B(k, HOLZ_G, x - .28, x + .28, 1.8, 1.86, z - .03, z + .03); }
  for (const dx of [-.22, .22]) B(k, 0xe8e8e0, x + dx - .005, x + dx + .005, 1.86, 1.87, -zA, zA, NO_AO);
  const lx = x + .22, cols = [0xf0f0e8, 0x8ab0d8, 0xd87a7a, 0xe8d8a0, 0x9ac89a, 0xd8d8e8];
  let z = -zA + .2;
  const items = ['laken', 'hemd', 'hose', 'socke', 'socke', 'hemd', 'tuch'];
  for (const it of items) {
    if (z > zA - .25) break;
    const c = C(r.pick(cols), r.R(.95, 1.05)), sw = .3, w = it === 'laken' ? .7 : it === 'hemd' ? .42 : it === 'hose' ? .34 : it === 'socke' ? .09 : .3;
    const zc = z + w / 2;
    if (it === 'laken') B(k, c, lx - .008, lx + .008, 1.86 - .85, 1.865, z, z + w, { sway: sw, ao: false });
    else if (it === 'tuch') B(k, c, lx - .008, lx + .008, 1.86 - .3, 1.865, z, z + w, { sway: sw, ao: false });
    else if (it === 'hemd') { B(k, c, lx - .01, lx + .01, 1.86 - .48, 1.865, zc - .15, zc + .15, { sway: sw, ao: false }); for (const s of [-1, 1]) k.box(c, [lx, 1.86 - .32, zc + s * .17], [.018, .3, .09], { r: [s * .5, 0, 0], sway: sw, ao: false }); }
    else if (it === 'hose') for (const s of [-1, 1]) B(k, c, lx - .01, lx + .01, 1.86 - .62, 1.865, zc + s * .085 - .075, zc + s * .085 + .075, { sway: sw, ao: false });
    else B(k, c, lx - .012, lx + .012, 1.86 - .2, 1.865, z, z + w, { sway: sw, ao: false });
    for (const pz of it === 'socke' ? [z + .045] : [z + .03, z + w - .03]) B(k, C(r.pick([0xd8b878, 0x5a9ad8, 0xd85a5a]), 1), lx - .012, lx + .012, 1.83, 1.9, pz - .01, pz + .01, NO_AO);
    z += w + .08;
  }
  B(k, 0xd8c8a0, x - .3, x - .14, 1.6, 1.84, zA - .34, zA - .2, { ao: false, sway: .15 }); B(k, 0x6a4a2a, x - .23, x - .21, 1.84, 1.87, zA - .28, zA - .26, NO_AO);   // Klammerbeutel
}
