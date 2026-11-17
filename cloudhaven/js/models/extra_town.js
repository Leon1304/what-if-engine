// Neue Dorf-Kacheln in voller Detailstufe: Kreuzung, Dorfplatz, Blockhütte, Häuserzeile, Bäckerei, Schmiede, Gasthaus,
// Sägewerk, Burgturm, Musikpavillon. tilemodel.js ruft tile_<art>(k, F, ctx) auf, Gelände und Wege sind schon gebaut.
// Gebäude stehen in einem Rahmen (site): lokal +x zeigt zum Weg, Ursprung = höchster Bodenpunkt der Grundfläche.
// Wandrahmen wie in house.js: u entlang der Wand, v = Höhe, w nach außen (Außenfläche w = 0, Wand bis w = −t).
import * as THREE from 'three';
import { TAG } from '../kit.js';
import { rng, hash } from '../hex.js';
import { INR, edgeMid, edgeAngle, N, groundMax, rot, meadow, scatter, firstEdge } from './tilekit.js';

const PI = Math.PI, TAU = PI * 2, NO = { ao: false };
// ---------------------------------------------------------------- Farben
const PUTZ = [0xeee0c4, 0xf3f0e8, 0xf0dc9e, 0xecc4b6, 0xc6d9e6, 0xd8e4c4, 0xe8c8a0];
const ZIEGEL = [0xb4532f, 0x8c3427, 0xa8482e, 0x9e4028];
const SCHIEFER = [0x4a5058, 0x434950, 0x535a63, 0x3d434b];
const LADEN = [0x3f7a4a, 0x3a5f90, 0x9b3b31, 0x2e6e74, 0x6a4a7a];
const BALKEN = [0x4a3324, 0x3b2a20, 0x553826];
const TAPETE = [0xd9c393, 0xc79d8a, 0x9fb3c6, 0xb4c49a, 0xe1cfae, 0xc2a3b8, 0xd8b07a];
const GARDINE = [0xf4f0e6, 0xeadca8, 0xd88a7a, 0xa8c4d8, 0xf0e4d0];
const STEIN = [0x8f8b84, 0x7d7a74, 0x9a958c, 0xa39a88, 0x857a6a, 0x6f6c66, 0x948a7c];
const PFLASTER = [0xa49a8c, 0x9a9184, 0xb0a696, 0x8e877c, 0xa89c88, 0x989088];
const BLUME = [0xe8423a, 0xf2e14a, 0xffffff, 0xe85a9a, 0x9a6ae8, 0xf28a3a, 0xd8304a];
const BUCH = [0x8a2a24, 0x2a4a7a, 0x3a6a3a, 0xc8a050, 0x5a3a6a, 0x2a2a2a, 0xa86a3a, 0xd8d0b8];
const BROT = [0xb8783a, 0xc8884a, 0xa86a30, 0xd09a5a, 0x9a5a28];
const HOLZ = 0x8a6a48, HOLZ_D = 0x6b4f36, HOLZ_H = 0xa8845a, HOLZ_G = 0x8f8270, HOLZ_A = 0x5a4632;
const EISEN = 0x2e2e30, ROST = 0x7a4a2e, MESSING = 0xc9a23a, GOLD = 0xd8a830, GLAS = 0x9ec3d6, ZINK = 0x8e969c, ZINK_D = 0x6c7478;
const MOERTEL = 0x7a766e, MOOS = 0x5f7f34, ERDE = 0x4a3424, LAUB = 0x4f8a3a, TON = 0xb0603a, RUSS = 0x242222;
const GUSS = 0x2a3a30;                                                     // Gusseisen (dunkelgrün)

// ---------------------------------------------------------------- Zufall und kleine Helfer
function RNG(seed, key) {
  const f = rng(hash('town', seed, key));
  return { f, R: (a = 0, b = 1) => a + (b - a) * f(), pick: a => a[Math.floor(f() * a.length)], p: x => f() < x, i: n => Math.floor(f() * n) };
}
const C = (c, m = 1) => new THREE.Color(c).multiplyScalar(m);
const MIX = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
// Kiste aus Min/Max-Grenzen
const B = (k, c, x0, x1, y0, y1, z0, z1, o) => k.box(c, [(x0 + x1) / 2, Math.min(y0, y1), (z0 + z1) / 2], [Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)], o);
const _v = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _q = new THREE.Quaternion(), _eu = new THREE.Euler();
// Zylinder von a nach b
function tube(k, c, a, b, r, seg = 6, o = {}) {
  _v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const L = _v.length(); if (L < 1e-5) return;
  _q.setFromUnitVectors(_up, _v.normalize()); _eu.setFromQuaternion(_q);
  k.cyl(c, a, r, L, seg, { ...o, r: [_eu.x, _eu.y, _eu.z], order: _eu.order });
}
// Rohrzug durch Punkte (mit Kugeln an den Knicken)
function tubes(k, c, pts, r, seg = 5, o = {}) { for (let i = 0; i < pts.length - 1; i++) tube(k, c, pts[i], pts[i + 1], r, seg, o); for (let i = 1; i < pts.length - 1; i++) k.ball(c, pts[i], r * 1.02, o); }
// Eigene Vorlagen (wie im Kit: nicht indiziert, ohne uv)
const TPL = {};
function prep(g) { if (g.index) g = g.toNonIndexed(); for (const a of ['uv', 'uv1']) if (g.attributes[a]) g.deleteAttribute(a); g.clearGroups(); if (!g.attributes.normal) g.computeVertexNormals(); return g; }
const tpl = (name, make) => TPL[name] ||= prep(make());
// Kiste nur mit den sichtbaren Seiten (BoxGeometry: +x, −x, +y, −y, +z, −z)
function partBox(faces) {
  const b = new THREE.BoxGeometry(1, 1, 1).toNonIndexed(), P = b.attributes.position.array, Nn = b.attributes.normal.array, p = [], n = [];
  for (const f of faces) { p.push(...P.slice(f * 18, f * 18 + 18)); n.push(...Nn.slice(f * 18, f * 18 + 18)); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); return g;
}
const STONE = () => tpl('stone', () => partBox([0, 1, 2, 4, 5]).translate(0, .5, 0));        // ohne Unterseite, Ursprung Mitte unten
const WSTONE = () => tpl('wstone', () => partBox([0, 1, 2, 3, 4]).translate(0, .5, 0));       // Mauerstein ohne Rückseite (−z)
const TILE = () => tpl('tile', () => partBox([2, 4]).translate(0, .5, .5));                   // Ziegel/Schindel: Oberseite + Unterkante, z 0…1
const PLANE = () => tpl('plane', () => new THREE.PlaneGeometry(1, 1));
const DISC = seg => tpl('disc' + seg, () => new THREE.CircleGeometry(1, seg).rotateX(-PI / 2));   // Scheibe, Normale +y
const TORUS = (seg, tr = .1, ts = 4) => tpl('tor' + seg + '_' + tr + '_' + ts, () => new THREE.TorusGeometry(1, tr, ts, seg));   // in xy-Ebene
const ARC = (seg, tr, arc) => tpl('arc' + seg + '_' + tr + '_' + arc, () => new THREE.TorusGeometry(1, tr, 4, seg, arc));
const HALFO = seg => tpl('halfo' + seg, () => new THREE.CylinderGeometry(1, 1, 1, seg, 1, true, 0, PI).translate(0, .5, 0));   // offene Halbschale
const PL = (k, c, p, w, h, r, o = {}) => k.add(PLANE(), c, p, [w, h, 1], { ao: false, ...o, r });
function basis(X, Y, Z, o) { return new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(...o); }
// Dachebene: Z = hangabwärts, Y = Flächennormale, X = Y × Z
function slopeFrame(dirX, dirZ, ang, o) {
  const Z = new THREE.Vector3(dirX * Math.cos(ang), -Math.sin(ang), dirZ * Math.cos(ang)), Y = new THREE.Vector3(dirX * Math.sin(ang), Math.cos(ang), dirZ * Math.sin(ang));
  return basis(new THREE.Vector3().crossVectors(Y, Z), Y, Z, o);
}
// Wandrahmen: F = vorn (+x), K = hinten (−x), R = rechts (+z), L = links (−z). a = halbe Tiefe (x), b = halbe Breite (z)
const WALL = { F: (a, b) => [[a, 0, 0], PI / 2], K: (a, b) => [[-a, 0, 0], -PI / 2], R: (a, b) => [[0, 0, b], 0], L: (a, b) => [[0, 0, -b], PI] };
function onWall(k, s, a, b, fn) { const [p, ry] = WALL[s](a, b); k.push(p, ry); fn(); k.pop(); }
const wallLen = (s, a, b, t) => s === 'F' || s === 'K' ? b : a - t;

// Gebäude-Rahmen: wie place(), liefert dazu Boden-Abfragen im lokalen Rahmen
function site(k, F, x, z, r, ry, fn) {
  const y0 = groundMax(F, x, z, r), c = Math.cos(ry), s = Math.sin(ry);
  const T = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  const G = {
    y0, T,
    h: (lx, lz) => { const [a, b] = T(lx, lz); return F.h(a, b) - y0; },
    free: (lx, lz, rr = .3) => { const [a, b] = T(lx, lz); return F.free(a, b, rr); },
    // Kleinkram auf dem echten Boden (Ebene base, nicht Kamera-Hindernis)
    on: (lx, lz, ry2, fn2, layer = 'base') => { const h = G.h(lx, lz), g0 = k.ground, l0 = k.layer; k.ground = y0 + h; k.layer = layer; k.push([lx, h, lz], ry2); fn2(); k.pop(); k.ground = g0; k.layer = l0; },
  };
  k.ground = y0; k.push([x, y0, z], ry); k.layer = 'bldg'; const out = fn(G) || {}; k.layer = 'base'; k.pop(); k.ground = 0; return out;
}
// Kleinkram auf dem Boden in Kachel-Koordinaten
function onG(k, F, x, z, ry, fn, dy = 0) { const y = F.h(x, z) + dy, g0 = k.ground; k.ground = y - dy; k.push([x, y, z], ry); fn(); k.pop(); k.ground = g0; }
// Sitzplatz: Blickrichtung (dx, dz) im aktuellen Rahmen → ry in Kachel-Koordinaten (life.js: Blick = (sin ry, cos ry))
function sitSpot(k, p, dx, dz) { const a = k.world(p), b = k.world([p[0] + dx, p[1], p[2] + dz]); k.spot('sit', p, { ry: Math.atan2(b[0] - a[0], b[2] - a[2]) }); }

// ---------------------------------------------------------------- Wand aus Stücken um Öffnungen
// holes: [{a, b, lo, hi}] in u/v. o.band: dunklere Sockelzone
function wallPieces(k, col, u0, u1, v0, v1, t, holes, r, o = {}) {
  const cuts = [u0, u1];
  for (const h of holes) cuts.push(Math.max(u0, h.a), Math.min(u1, h.b));
  const us = [...new Set(cuts.map(x => Math.round(x * 1e4) / 1e4))].sort((a, b) => a - b);
  const dark = o.band ? MIX(col, 0x6a6052, .3) : null;
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
// Wetterspuren auf Putz: Schlieren unter Fensterbänken, Flecken, abgeplatzter Putz mit Ziegeln darunter
function weather(k, col, r, u0, u1, v0, v1, wins) {
  const d = MIX(col, 0x5a564c, .22);
  for (const w of wins) for (const s of [-1, 1]) if (r.p(.6)) { const x = w.u + s * (w.W / 2 + r.R(-.05, .05)), h = r.R(.2, .5); B(k, C(d, r.R(.95, 1.05)), x - .025, x + .025, w.v0 - .06 - h, w.v0 - .06, -.01, .006, { ao: false, jit: .02 }); }
  for (let i = 0; i < 2; i++) if (r.p(.55)) {
    const x = r.R(u0 + .35, u1 - .35), y = r.R(v0 + .4, v1 - .4), w = r.R(.16, .3), h = r.R(.12, .24);
    if (wins.some(o => Math.abs(o.u - x) < o.W / 2 + .45 && y > o.v0 - .4 && y < o.v0 + o.H + .3)) continue;
    B(k, MIX(col, 0xa89a88, .45), x - w / 2, x + w / 2, y - h / 2, y + h / 2, -.01, .008, { ao: false, jit: .03 });
    for (let j = 0; j < 3; j++) { const bx = x - w / 2 + .03 + j * (w - .06) / 3 + (j % 2) * .02, by = y - h / 2 + .03 + (j % 2) * .06; B(k, C(0x9a4a34, r.R(.85, 1.1)), bx, bx + .07, by, by + .045, -.01, .016, NO); }
  }
}

// ---------------------------------------------------------------- Innenleben hinter einem Fenster
function roomLamp(k, x, y, z, shade) {
  B(k, 0x222222, x - .006, x + .006, y + .07, y + .5, z - .006, z + .006, NO);
  k.cyl(shade, [x, y, z], .15, .13, 6, { top: .4, ao: false });
  k.boxc(0xfff0c0, [x, y + .01, z], [.08, .06, .08], { layer: 'glow', ao: false, r: [0, PI / 4, 0] });
}
// Zimmer: Hülle aus nach innen zeigenden Flächen + Möbel. o.items: Liste, o.fill(k, u0, u1, vF, w1, w0): eigener Inhalt
function room(k, r, u, W, t, vF, vC, depth, o = {}) {
  const Wr = W + .44, u0 = u - Wr / 2, u1 = u + Wr / 2, w0 = -t + .03, w1 = -t - depth, dep = w0 - w1, wc = (w0 + w1) / 2, vc = (vF + vC) / 2;
  const tap = C(o.tap ?? r.pick(TAPETE)), boden = C(o.floor ?? r.pick([0x8a5e3c, 0x9c7048, 0x6e4a30]));
  if (r.p(.5) && !o.plain) { const vp = Math.min(vF + .8, vC - .4); PL(k, C(boden, 1.15), [u, (vF + vp) / 2, w1], Wr, vp - vF); B(k, C(boden, .75), u0, u1, vp - .03, vp + .03, w1 - .01, w1 + .025, NO); PL(k, tap, [u, (vp + vC) / 2, w1], Wr, vC - vp); }
  else { const n = 4, t2 = C(tap, .86); for (let i = 0; i < n; i++) PL(k, i % 2 ? t2 : tap, [u0 + (i + .5) * Wr / n, vc, w1], Wr / n, vC - vF); }
  const side = C(tap, .86);
  PL(k, side, [u0, vc, wc], dep, vC - vF, [0, PI / 2, 0]); PL(k, side, [u1, vc, wc], dep, vC - vF, [0, -PI / 2, 0]);
  PL(k, boden, [u, vF, wc], Wr, dep, [-PI / 2, 0, 0]);
  PL(k, o.ceil ?? 0xe8e0d0, [u, vC, wc], Wr, dep, [PI / 2, 0, 0]);
  B(k, 0x5a3e2a, u0, u1, vC - .09, vC, w1 + dep * .25 - .05, w1 + dep * .25 + .05, NO);   // Deckenbalken
  if (o.fill) { o.fill(k, u0, u1, vF, w1, w0); return; }
  const items = o.items ? o.items.slice() : [r.p(.75) ? 'lamp' : null, r.pick(['bild', 'regal', 'pflanze', 'tisch', 'kommode', 'uhr'])].filter(Boolean);
  if (!o.items && r.p(.5)) items.push(r.pick(['bild', 'regal', 'pflanze']));
  const s0 = r.p(.5) ? -1 : 1, wm = w1 + dep * .58;
  for (const it of items) {
    if (it === 'lamp') roomLamp(k, u + r.R(-.1, .1), vC - .55, wm, r.pick([0xe8d8b0, 0x8a3a2a, 0x3a5a3a, 0xf0f0e8]));
    else if (it === 'bild') {
      const pu = u + r.R(-.15, .15), py = Math.min(vC - .4, vF + 1.45);
      B(k, r.pick([0xb08a3a, 0x4a3020, 0x2a2a2a]), pu - .21, pu + .21, py - .16, py + .16, w1, w1 + .02, NO);
      B(k, r.pick([0x9ac0e0, 0xe8b070, 0xc0d0e0]), pu - .18, pu + .18, py, py + .13, w1 + .015, w1 + .03, NO);
      B(k, r.pick([0x5a8a3a, 0x3a6a8a, 0x8a7a3a]), pu - .18, pu + .18, py - .13, py, w1 + .015, w1 + .03, NO);
    } else if (it === 'regal') {
      const pu = u + s0 * r.R(0, .12), py = Math.min(vC - .55, vF + 1.2);
      for (const yy of [py, py - .4]) { B(k, 0x6a4a30, pu - .32, pu + .32, yy - .025, yy, w1, w1 + .2, NO); let x = pu - .29; while (x < pu + .24) { const bw = r.R(.045, .08), bh = r.R(.15, .25); B(k, C(r.pick(BUCH), r.R(.85, 1.1)), x, x + bw, yy, yy + bh, w1 + .02, w1 + r.R(.13, .17), NO); x += bw + .004; } }
    } else if (it === 'pflanze') {
      const pu = u + s0 * (Wr / 2 - .2), pw = w1 + .25;
      k.cyl(TON, [pu, vF, pw], .12, .26, 7, { top: 1.2, ao: false });
      for (let i = 0; i < 4; i++) k.ball(C(LAUB, r.R(.8, 1.15)), [pu + r.R(-.12, .12), vF + .4 + i * .14, pw + r.R(-.08, .08)], [.16, .13, .14], { ao: false, jit: .12 });
    } else if (it === 'tisch') {
      const pu = u + r.R(-.1, .1), pw = w1 + .32, ty = vF + .74;
      B(k, 0x7a5232, pu - .4, pu + .4, ty - .04, ty, pw - .25, pw + .25, NO);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(k, 0x5a3a22, pu + sx * .34 - .025, pu + sx * .34 + .025, vF, ty - .04, pw + sz * .2 - .025, pw + sz * .2 + .025, NO);
      B(k, r.pick([0xf0ece0, 0xc84a3a, 0x8ab0d8]), pu - .38, pu + .38, ty, ty + .006, pw - .23, pw + .23, NO);
      k.cyl(r.pick([0x3a6a9a, 0xe0d8c8, 0x9a3a2a]), [pu + .1, ty, pw], .05, .18, 6, { top: .7, ao: false }); k.ball(C(r.pick(BLUME)), [pu + .1, ty + .24, pw], .07, NO);
    } else if (it === 'kommode') {
      const pu = u + s0 * r.R(0, .12), pw = w1 + .2, c = r.pick([0x6a4a30, 0x8a6a48, 0xd8ccb0]);
      B(k, c, pu - .38, pu + .38, vF, vF + .82, w1, pw, NO);
      for (let i = 0; i < 3; i++) { const y = vF + .1 + i * .25; B(k, C(c, .82), pu - .34, pu + .34, y, y + .22, pw, pw + .012, NO); k.ball(MESSING, [pu, y + .11, pw + .02], .018, NO); }
      k.cyl(0x5a7a9a, [pu + .18, vF + .82, pw - .1], .07, .2, 7, { top: .8, ao: false });
    } else if (it === 'uhr') {
      const pu = u + s0 * (Wr / 2 - .22), pw = w1 + .14;
      B(k, 0x5a3a22, pu - .14, pu + .14, vF, vF + 1.85, w1, pw, NO); B(k, 0xe8e0c8, pu - .09, pu + .09, vF + 1.45, vF + 1.65, pw, pw + .01, NO);
      B(k, MESSING, pu - .015, pu + .015, vF + .6, vF + 1.2, pw, pw + .01, NO); k.cyl(MESSING, [pu, vF + .62, pw + .005], .05, .01, 8, { r: [PI / 2, 0, 0], ao: false });
    } else if (it === 'bett') {
      const pw = w1 + .45; B(k, 0x6a4a30, u - .5, u + .5, vF, vF + .42, w1, pw + .2, NO); B(k, 0xf0ece0, u - .48, u + .48, vF + .42, vF + .5, w1 + .02, pw + .18, NO);
      B(k, r.pick([0xc84a3a, 0x4a6aa8, 0x6a9a5a]), u - .48, u + .48, vF + .5, vF + .55, w1 + .25, pw + .19, NO); B(k, 0x6a4a30, u - .5, u + .5, vF, vF + .9, w1, w1 + .05, NO);
    }
  }
}
function curtains(k, col, u, v0, W, H, t) {
  const top = v0 + H + .1, bot = v0 - .04;
  B(k, 0x5a3e2a, u - W / 2 - .2, u + W / 2 + .2, top - .012, top + .012, -t - .095, -t - .07, NO);
  for (const s of [-1, 1]) { const e = u + s * W / 2, a = s < 0 ? e - .16 : e - .1, w3 = .26 / 3; for (let j = 0; j < 3; j++) { const f = j % 2; PL(k, C(col, f ? .86 : 1), [a + (j + .5) * w3, (bot + top) / 2 - .006, -t - (f ? .07 : .05)], w3 + .012, top - .012 - bot); } }
}
// Fensterladen (offen, Winkel al)
function shutter(k, col, r, hu, v0, H, sw, side, al) {
  const ry = side > 0 ? -al : PI + al, d = .032;
  k.push([hu, v0, .046], ry);
  const n = 4, pw = (sw - .004) / n;
  for (let i = 0; i < n; i++) B(k, C(col, r.R(.88, 1.08)), .004 + i * pw + .002, .004 + (i + 1) * pw - .002, 0, H - r.R(0, .015), -d * .45, d * .45, NO);
  const ls = side > 0 ? 1 : -1, cf = C(col, .82);
  for (const y of [.12, H - .2]) B(k, cf, .03, sw - .03, y, y + .09, ls * (d / 2 + .016), ls * (d / 2 - .004));
  k.beam(cf, [.08, .2, ls * (d / 2 + .006)], [sw - .08, H - .21, ls * (d / 2 + .006)], .08, { w: .07, d: .016 });
  for (const y of [.1, H - .16]) B(k, EISEN, -.012, .22, y + .045, y + .075, -d / 2 - .02 * (ls < 0), d / 2 + .02 * (ls > 0));
  k.pop();
}
function flowerBox(k, r, u, y, W, c = HOLZ) {
  const bw = W + .04;
  B(k, c, u - bw / 2, u + bw / 2, y, y + .17, .055, .23); B(k, C(c, .8), u - bw / 2 - .01, u + bw / 2 + .01, y + .15, y + .175, .05, .235);
  for (const s of [-1, 1]) { const x = u + s * (bw / 2 - .1); B(k, EISEN, x - .012, x + .012, y - .014, y, 0, .2); }
  const fc = r.pick(BLUME), n = Math.max(2, Math.round(W / .24));
  for (let i = 0; i < 2; i++) k.ball(C(LAUB, r.R(.85, 1.1)), [u + (i - .5) * bw * .45, y + .21, .14], [bw * .28, .08, .08], { tag: TAG.grass, sway: .15, jit: .12 });
  for (let i = 0; i < n; i++) { const x = u - bw / 2 + .07 + i * (bw - .14) / Math.max(1, n - 1); k.ball(C(r.p(.75) ? fc : r.pick(BLUME), r.R(.9, 1.1)), [x, y + r.R(.27, .32), r.R(.11, .18)], [.05, .035, .05], { tag: TAG.flower, sway: .25, ao: false }); }
  k.ball(C(LAUB, .9), [u + r.R(-.3, .3) * W, y + .08, .24], [.06, .09, .035], { tag: TAG.grass, sway: .2, ao: false });
}
// Fenster im Wandrahmen. S: {frame, sill, laden, gardine}. o: { shutters, box, room, curtain, rows, bars }
function win(k, S, r, u, v0, W, H, t, o = {}) {
  const fw = .055, fr = o.frame ?? S.frame, x0 = u - W / 2, x1 = u + W / 2, y1 = v0 + H, z0 = -.13, z1 = -.05;
  B(k, fr, x0 - .01, x0 + fw, v0 - .01, y1 + .01, z0, z1); B(k, fr, x1 - fw, x1 + .01, v0 - .01, y1 + .01, z0, z1);
  B(k, fr, x0 + fw - .005, x1 - fw + .005, y1 - fw, y1 + .01, z0, z1 - .004); B(k, fr, x0 + fw - .005, x1 - fw + .005, v0 - .01, v0 + fw, z0, z1 - .004);
  const wv = k.winVal();                                                                          // eigener Zufallswert je Fenster
  PL(k, o.glass ?? GLAS, [u, v0 + H / 2, -.1], W - 2 * fw + .012, H - 2 * fw + .012, [0, 0, 0], { layer: 'glass', jit: 0, win: o.room ? wv + 1 : wv });   // +1: Zimmer dahinter
  if (o.bars !== false) {
    if (W > .55) B(k, fr, u - .018, u + .018, v0 + fw, y1 - fw, -.125, -.064);
    const rows = o.rows ?? 1; for (let i = 1; i <= rows; i++) { const vk = v0 + H * (rows === 1 ? .64 : i / (rows + 1)); B(k, fr, x0 + fw, x1 - fw, vk - .016, vk + .016, -.125, -.066); }
  }
  if (o.sill !== false) k.box(o.sillC ?? S.sill, [u, v0 - .05, -.02], [W + .14, .05, .22], { r: [.07, 0, 0] });
  if (o.shutters) { const sw = W / 2 + .015, h = o.hinge ?? .03; shutter(k, S.laden, r, x0 - h, v0 - .01, H + .02, sw, -1, r.R(.06, .45)); shutter(k, S.laden, r, x1 + h, v0 - .01, H + .02, sw, 1, r.R(.06, .45)); }
  if (o.box) flowerBox(k, r, u, v0 - .3, W, o.boxC ?? S.kasten ?? HOLZ);
  if (o.curtain !== false) curtains(k, S.gardine ?? r.pick(GARDINE), u, v0, W, H, t);
  if (o.room) k.mark({ win: wv, tag: TAG.room }, () => room(k, r, u, W, t, o.room.vF, o.room.vC, o.room.depth ?? .8, o.room));
}
// Brettertür im Wandrahmen (geschlossen). S.tuer, S.zarge
function door(k, S, r, u, v0, W, H, t, o = {}) {
  const x0 = u - W / 2, x1 = u + W / 2, y1 = v0 + H, zc = o.zarge ?? S.zarge ?? HOLZ_D, tc = o.color ?? S.tuer;
  B(k, zc, x0 - .02, x0 + .08, v0, y1 + .02, -t + .02, .03); B(k, zc, x1 - .08, x1 + .02, v0, y1 + .02, -t + .02, .03);
  B(k, zc, x0 + .08, x1 - .08, y1 - .08, y1 + .02, -t + .02, .026);
  if (o.sill !== false) B(k, 0xa8a49a, x0 - .03, x1 + .03, v0 - .06, v0 + .02, -t + .02, .1);
  const by0 = v0 + .02, by1 = y1 - .08, n = Math.max(4, Math.round((W - .16) / .15)), bw = (W - .16) / n;
  B(k, C(tc, .45), x0 + .07, x1 - .07, by0, by1, -.15, -.138);
  for (let i = 0; i < n; i++) B(k, C(tc, r.R(.86, 1.08)), x0 + .08 + i * bw + .003, x0 + .08 + (i + 1) * bw - .003, by0, by1 - r.R(0, .012), -.14, -.095 + r.R(-.004, .004), { jit: .06 });
  const ld = C(tc, .8), lY = [by0 + .26, by1 - .3];
  for (const y of lY) B(k, ld, x0 + .1, x1 - .1, y - .06, y + .06, -.1, -.072);
  k.beam(ld, [x0 + .17, lY[0] + .05, -.086], [x1 - .17, lY[1] - .05, -.086], .1, { w: .1, d: .02 });
  for (const y of lY) { B(k, EISEN, x0 + .05, x0 + .5, y - .022, y + .022, -.074, -.064); k.ball(EISEN, [x0 + .44, y, -.064], .012); }
  const hx = x1 - .15, hy = v0 + 1.02;
  B(k, MESSING, hx - .026, hx + .026, hy - .15, hy + .06, -.097, -.084); B(k, MESSING, hx - .014, hx + .014, hy - .014, hy + .014, -.084, -.045); B(k, MESSING, hx - .13, hx + .012, hy - .016, hy + .012, -.055, -.033);
  if (o.glass) { const gy = y1 - .5; B(k, C(tc, .7), u - .2, u + .2, gy - .02, gy + .3, -.094, -.08); PL(k, GLAS, [u, gy + .14, -.078], .32, .26, [0, 0, 0], { layer: 'glass', jit: 0, win: k.winVal() }); }
}
// Laterne am Wandarm (Wandrahmen), setzt spot 'light'
function wallLamp(k, u, v, out = .27) {
  B(k, EISEN, u - .04, u + .04, v - .02, v + .16, 0, .02);
  B(k, EISEN, u - .014, u + .014, v + .06, v + .09, 0, out); tube(k, EISEN, [u, v - .12, .005], [u, v + .065, out * .75], .01, 4);
  const w = out - .03, y = v + .05;
  B(k, EISEN, u - .006, u + .006, y - .05, y + .02, w - .006, w + .006);
  k.cone(EISEN, [u, y - .07, w], .105, .09, 4, { r: [0, PI / 4, 0] }); B(k, EISEN, u - .08, u + .08, y - .09, y - .07, w - .08, w + .08);
  B(k, 0xffe2a8, u - .06, u + .06, y - .3, y - .09, w - .06, w + .06, { layer: 'glow', tag: 1, ao: false, jit: 0 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(k, EISEN, u + sx * .062 - .008, u + sx * .062 + .008, y - .3, y - .09, w + sz * .062 - .008, w + sz * .062 + .008);
  B(k, EISEN, u - .075, u + .075, y - .33, y - .3, w - .075, w + .075); k.ball(EISEN, [u, y - .35, w], .02);
  k.spot('light', [u, y - .2, w]);
}
// Dachrinne entlang z an der Traufe (x, y), s = Seite (±1)
function gutter(k, x, y, z0, z1, s = 1) {
  B(k, ZINK, x - .06, x + .06, y - .1, y - .088, z0, z1, NO); B(k, ZINK, x + s * .058, x + s * .07, y - .1, y + .005, z0, z1, NO); B(k, ZINK, x - s * .07, x - s * .058, y - .1, y - .02, z0, z1, NO);
  for (const z of [z0, z1]) B(k, ZINK_D, x - .07, x + .07, y - .1, y, z - .006, z + .006, NO);
}
function downpipe(k, pts) { for (let i = 0; i < pts.length - 1; i++) tube(k, ZINK, pts[i], pts[i + 1], .045, 6, NO); for (let i = 1; i < pts.length - 1; i++) k.ball(ZINK, pts[i], .047, NO); }

// ---------------------------------------------------------------- Mauerwerk
// Steine auf einer Wandfläche (Wandrahmen, Außenfläche w = 0): u0…u1, v0…v1. skip(u, v) lässt Öffnungen frei
function stones(k, r, u0, u1, v0, v1, o = {}) {
  const ch = o.ch ?? .26, d = o.d ?? .06, gap = o.gap ?? .025, cols = o.cols || STEIN, sl = o.len || [.3, .58];
  let row = 0;
  for (let y = v0; y < v1 - .04; y += ch, row++) {
    const h = Math.min(ch, v1 - y) - gap; let u = u0 - (row % 2 ? r.R(.08, .22) : 0);
    while (u < u1 - .03) {
      const L = r.R(sl[0], sl[1]), a = Math.max(u, u0), b = Math.min(u + L, u1); u += L;
      if (b - a < .06 || (o.skip && o.skip((a + b) / 2, y + h / 2, a, b))) continue;
      const dd = d * r.R(.55, 1.25);
      k.add(WSTONE(), C(r.pick(cols), r.R(.86, 1.1)), [(a + b) / 2, y + gap / 2, dd / 2 - .02], [b - a - gap, h, dd + .04], { r: [r.R(-.03, .03), r.R(-.03, .03), r.R(-.02, .02)], jit: .08 });
      if (o.moss && y < v0 + .5 && r.p(o.moss)) k.ball(C(MOOS, r.R(.85, 1.1)), [(a + b) / 2, y + h, dd], [(b - a) * .35, .03, .05], { tag: TAG.grass, ao: false });
    }
  }
}
// Gemauerter Quader: Mörtelkern + Steine auf den Seiten (Seiten 'FKRL' wie WALL)
function masonry(k, r, x0, x1, y0, y1, z0, z1, o = {}) {
  const a = (x1 - x0) / 2, b = (z1 - z0) / 2, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  if (!o.noCore) B(k, o.mortar ?? MOERTEL, x0 + .01, x1 - .01, y0, y1, z0 + .01, z1 - .01, { jit: .03 });
  k.push([cx, 0, cz], 0);
  for (const s of o.sides || 'FKRL') onWall(k, s, a, b, () => { const L = s === 'F' || s === 'K' ? b : a; stones(k, r, -L + .01, L - .01, y0, y1, { ...o, skip: o.skip?.[s] }); });
  k.pop();
  if (o.cap) B(k, o.cap, x0 - .06, x1 + .06, y1, y1 + .09, z0 - .06, z1 + .06, { jit: .04 });
}
// Schornstein aus Ziegelreihen mit Abdeckplatte und Rohr; gibt Rauchpunkt-Höhe zurück
function chimney(k, r, x, z, w, yb, yt, cols = [0x9a4a34, 0x8a3e2c, 0xa85a3e, 0x7e3a2a], ch = .14) {
  B(k, MOERTEL, x - w / 2 + .008, x + w / 2 - .008, yb - .5, yt, z - w / 2 + .008, z + w / 2 - .008, { jit: .04 });
  const d = .1, h = w / 2, n = Math.floor((yt - yb) / ch);
  for (let j = 0; j < n; j++) {
    const y0 = yb + j * ch, m = j % 2 ? 1 : -1;
    for (const [nx, nz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const full = (j % 2 === 0) === (nz !== 0), e0 = full ? -h : -h + d, e1 = full ? h : h - d, sp = (e0 + e1) / 2 + m * .06;
      const cxp = x + nx * (h - d / 2), czp = z + nz * (h - d / 2);
      for (const [t0, t1] of full ? [[e0, sp - .006], [sp + .006, e1]] : [[e0, e1]]) {
        const tm = (t0 + t1) / 2, len = t1 - t0 - .006;
        k.add(STONE(), C(r.pick(cols), r.R(.85, 1.1)), nx ? [cxp, y0 + .006, z + tm] : [x + tm, y0 + .006, czp], [len, ch - .012, d], { r: [0, Math.atan2(nx, nz), 0], jit: .06 });
      }
    }
  }
  const top = yb + n * ch;
  B(k, 0x8a8a84, x - h - .06, x + h + .06, top, top + .07, z - h - .06, z + h + .06, { jit: .05 });
  B(k, RUSS, x - h + .06, x + h - .06, top + .07, top + .072, z - h + .06, z + h - .06, NO);
  k.cyl(0x4a4a4c, [x, top + .07, z], .085, .3, 6, NO); k.cone(0x3a3a3c, [x, top + .44, z], .16, .1, 6, NO);
  for (const s of [-1, 1]) B(k, 0x3a3a3c, x + s * .07 - .008, x + s * .07 + .008, top + .36, top + .46, z - .008, z + .008, NO);
  return top + .42;
}

// ---------------------------------------------------------------- Dach
// Ziegel-/Schindelreihen im Dachrahmen (X entlang Traufe, Z hangabwärts). base = Oberkante Dachplatte. o.kind: 'ziegel' | 'schindel' | 'schiefer'
function roofTiles(k, r, col, X0, X1, s0, s1, base, o = {}) {
  const kind = o.kind || 'ziegel', step = kind === 'ziegel' ? .34 : kind === 'schindel' ? .2 : .17, L = step * 1.25, phi = kind === 'ziegel' ? .08 : .06, holes = o.holes || [];
  let row = 0;
  for (let sf = s1; sf > s0 + .02; sf -= step, row++) {
    const sb = Math.max(s0 - .06, sf - L);
    let x = X0 - (row % 2) * (kind === 'ziegel' ? .195 : .08);
    while (x < X1 - .02) {
      const tw = kind === 'ziegel' ? .39 : kind === 'schindel' ? r.R(.1, .2) : r.R(.2, .28);
      const xa = Math.max(X0, x), xb = Math.min(X1, x + tw) - (kind === 'ziegel' ? .012 : .008); x += tw;
      if (xb - xa < .05) continue;
      const xm = (xa + xb) / 2, sm = (sb + sf) / 2;
      if (holes.some(h => xm > h[0] && xm < h[1] && sm > h[2] && sm < h[3])) continue;
      const q = r.f(), eave = row === 0;
      let c = C(col, r.R(.86, 1.1)); if (q > .985) c = C(col, r.R(.68, .8)); else if (q > .975) c = MIX(col, 0x8a7a60, .3);
      const moss = !eave && r.p(o.moss ?? .03); if (moss) c = MIX(c, 0x6a7a3a, r.R(.15, .35));
      const slip = !eave && kind === 'ziegel' && q > .94 && q < .947 ? r.R(.04, .08) : 0;
      k.add(TILE(), c, [xm, base, sb + slip], [xb - xa, kind === 'ziegel' ? .03 : .022, sf - sb], { r: [-phi, slip ? r.R(-.1, .1) : (kind === 'ziegel' ? 0 : r.R(-.03, .03)), 0], jit: .05, tag: TAG.roof });
      if (moss && r.p(.35)) k.ball(C(MOOS, r.R(.8, 1.1)), [xm, base + .03, sf - .08], [.09, .022, .08], { tag: TAG.grass, ao: false });
    }
  }
}
// Satteldach, First entlang z. aR = halbe Tiefe (Wand außen), Lz = halbe Länge, Ye = Traufhöhe an der Wand, th = Neigung,
// o = Überstand Traufe, og = Überstand Giebel. opt: { col, kind, chim: {x,z,w}, unter, sparren, wind, ridge, moss }
function roof(k, r, aR, Lz, Ye, th, o, og, opt = {}) {
  const tn = Math.tan(th), cs = Math.cos(th), sT = opt.sT ?? .13, Yr = Ye + aR * tn, sE = (aR + o) / cs, E = Lz + og, cc = sT * .9;
  const col = opt.col ?? ZIEGEL[0], chim = opt.chim, sides = opt.sides || [1, -1];
  for (const sx of sides) {
    k.pushM(slopeFrame(sx, 0, th, [0, Yr, 0]));
    B(k, 0x3a2a20, -E, E, 0, sT, -cc, sE, { ao: false, jit: .03 });
    B(k, opt.unter ?? 0x9a7a58, -E + .01, E - .01, -.02, .001, 0, sE - .005, { ao: false, jit: .03 });
    for (let x = -Lz + .25; x <= Lz - .2; x += .62) B(k, opt.sparren ?? HOLZ_D, x - .045, x + .045, -.13, 0, aR / cs - .3, sE - .03, NO);
    const holes = [];
    if (chim && Math.sign(chim.x) === sx) { const Xc = -sx * chim.z, s0 = (Math.abs(chim.x) - chim.w / 2) / cs, s1 = (Math.abs(chim.x) + chim.w / 2) / cs; holes.push([Xc - chim.w / 2 - .05, Xc + chim.w / 2 + .05, s0 - .1, s1 + .05]); }
    roofTiles(k, r, col, -E + .045, E - .045, 0, sE + .04, sT, { holes, moss: opt.moss ?? (sx < 0 ? .05 : .02), kind: opt.kind });
    const wh = Math.min(.1, sE * .04); for (const s of [-1, 1]) B(k, opt.wind ?? HOLZ_D, s * E - .045 * s, s * E, -wh - .02, sT + wh, -cc, sE + .05, { jit: .05 });
    if (chim && Math.sign(chim.x) === sx) { const Xc = -sx * chim.z, sc = Math.abs(chim.x) / cs, hw = chim.w / 2 + .07; B(k, ZINK_D, Xc - hw, Xc + hw, sT + .02, sT + .045, sc - hw / cs - .02, sc + hw / cs, NO); }
    k.pop();
  }
  const yA = Yr + sT / cs + .01;
  if (opt.noRidge) {} else if (opt.kind === 'schindel') { for (const s of [-1, 1]) k.box(C(col, .8), [0, yA - .06, 0], [.2, .05, 2 * E + .02], { r: [0, 0, s * (PI / 2 - th) * .5], jit: .05 }); }
  else for (let z = -E; z < E - .05; z += .36) k.add(RIDGE(), C(opt.ridge ?? col, r.R(.82, 1)), [0, yA - .03, z], [.14, .14, Math.min(.39, E - z)], { jit: .05, tag: TAG.roof });
  return { Yr, yA, tn, cs, sT, sE, E };
}
const VAULT = () => tpl('vault', () => new THREE.CylinderGeometry(1, 1, 1, 12, 1, false, 0, PI).rotateZ(PI / 2));   // Halbtonne, Achse x, Wölbung oben
const RIDGE = () => tpl('ridge', () => new THREE.CylinderGeometry(.9, 1, 1, 6, 1, true, -PI / 2, PI).rotateX(PI / 2).translate(0, 0, .5));
// Giebeldreieck im Wandrahmen (R/L) von Ye bis First, mit optionaler Fensteröffnung
function gableWall(k, col, aR, Ye, th, t, hole) {
  const tn = Math.tan(th), sh = new THREE.Shape();
  sh.moveTo(-aR, Ye); sh.lineTo(aR, Ye); sh.lineTo(0, Ye + aR * tn + .06); sh.closePath();
  if (hole) { const p = new THREE.Path(), x0 = hole.u - hole.W / 2, x1 = hole.u + hole.W / 2; p.moveTo(x0, hole.v0); p.lineTo(x0, hole.v0 + hole.H); p.lineTo(x1, hole.v0 + hole.H); p.lineTo(x1, hole.v0); p.closePath(); sh.holes.push(p); }
  k.add(prep(new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false, curveSegments: 1 })).translate(0, 0, -t), col, [0, 0, 0], [1, 1, 1], { ao: false, jit: .015 });
}
// Bretter-Giebel (Boden-Deckel-Schalung) im Wandrahmen
function boardGable(k, r, col, aR, Ye, th, hole) {
  const tn = Math.tan(th), bw = .17, n = Math.ceil(2 * aR / bw);
  for (let i = 0; i < n; i++) {
    const a = -aR + i * bw, b = Math.min(aR, a + bw), m = (a + b) / 2, top = Ye + (aR - Math.max(Math.abs(a), Math.abs(b)) + (Math.abs(b - a) * .5)) * tn, odd = i % 2;
    const c = C(col, r.R(.85, 1.1)), x0 = odd ? a - .02 : a, x1 = odd ? b + .02 : b, z0 = odd ? .012 : -.03, z1 = odd ? .036 : -.005;
    let iv = [[Ye, top]];
    if (hole && m > hole.u - hole.W / 2 && m < hole.u + hole.W / 2) iv = [[Ye, hole.v0], [hole.v0 + hole.H, top]];
    for (const [lo, hi] of iv) if (hi - lo > .02) B(k, c, x0, x1, lo, hi, z0, z1, { jit: .07 });
  }
}

// ---------------------------------------------------------------- Kleinteile
// Straßenlaterne (gusseisern), setzt spot 'light'
function streetLamp(k, p, h = 2.6, col = GUSS) {
  const [x, y, z] = p;
  k.box(C(0x8f8b84), [x, y - .25, z], [.32, .32, .32], { jit: .06 }); k.box(C(0x9a958c), [x, y + .06, z], [.26, .05, .26], { jit: .05 });
  k.cyl(col, [x, y + .1, z], .1, .35, 8, { top: .55 }); k.cyl(col, [x, y + .45, z], .055, h - .75, 8, { top: .75 });
  for (const yy of [.42, 1.25, h - .32]) k.cyl(C(col, 1.15), [x, y + yy, z], .075, .045, 8, NO);
  for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; tube(k, col, [x + Math.cos(a) * .04, y + h - .5, z + Math.sin(a) * .04], [x + Math.cos(a) * .13, y + h - .3, z + Math.sin(a) * .13], .012, 4, NO); }
  B(k, col, x - .11, x + .11, y + h - .3, y + h - .26, z - .11, z + .11);
  B(k, 0xffe2a8, x - .085, x + .085, y + h - .26, y + h + .04, z - .085, z + .085, { layer: 'glow', tag: 1, ao: false, jit: 0 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(k, col, x + sx * .095 - .01, x + sx * .095 + .01, y + h - .26, y + h + .06, z + sz * .095 - .01, z + sz * .095 + .01, NO);
  B(k, col, x - .13, x + .13, y + h + .04, y + h + .07, z - .13, z + .13); k.cone(col, [x, y + h + .07, z], .15, .16, 4, { r: [0, PI / 4, 0] });
  k.ball(col, [x, y + h + .25, z], .03, NO);
  for (const s of [-1, 1]) B(k, col, x + s * .2 - .012, x + s * .2 + .012, y + h - .62, y + h - .58, z - .012, z + .012, NO);   // Leiterstütze
  B(k, col, x - .21, x + .21, y + h - .6, y + h - .58, z - .012, z + .012, NO);
  k.spot('light', [x, y + h - .1, z]);
}
// Parkbank: Sitz blickt nach +x
function parkBench(k, p, ry = 0, L = 1.4, col = GUSS, wood = 0x9a6a3a) {
  k.in(p, ry, () => {
    for (const z of [-L / 2 + .1, L / 2 - .1]) {
      k.beam(col, [.2, -.15, z], [.12, .44, z], .05, { w: .05, d: .04 }); k.beam(col, [-.2, -.15, z], [-.16, .44, z], .05, { w: .05, d: .04 });
      k.beam(col, [-.16, .42, z], [-.26, .92, z], .045, { w: .045, d: .04 }); B(k, col, -.22, .24, .4, .44, z - .02, z + .02, NO);
      k.beam(col, [.22, .62, z], [-.2, .66, z], .04, { w: .04, d: .05 }); k.beam(col, [.22, .62, z], [.18, .44, z], .035, NO);   // Armlehne
      k.ball(col, [.23, .62, z], .035, NO);
    }
    for (let i = 0; i < 4; i++) B(k, C(wood, k.R(.88, 1.1)), -.2 + i * .11, -.11 + i * .11, .44, .475, -L / 2, L / 2, { jit: .06 });
    for (let i = 0; i < 3; i++) k.box(C(wood, k.R(.88, 1.1)), [-.2 - i * .028, .55 + i * .13, 0], [.03, .09, L], { r: [0, 0, .2], jit: .06 });
  });
}
// Einfache Holzbank (Sitz blickt nach +x)
function woodBench(k, p, ry = 0, L = 1.3, c = HOLZ) {
  k.in(p, ry, () => {
    for (const z of [-L / 2 + .15, L / 2 - .15]) { B(k, C(c, .8), -.18, .18, -.2, .4, z - .04, z + .04); B(k, C(c, .8), -.22, -.16, -.2, .86, z - .035, z + .035); }
    for (let i = 0; i < 3; i++) B(k, C(c, k.R(.9, 1.1)), -.2 + i * .135, -.08 + i * .135, .4, .44, -L / 2, L / 2, { jit: .06 });
    for (const y of [.58, .74]) k.box(C(c, k.R(.9, 1.1)), [-.21, y, 0], [.03, .1, L], { r: [0, 0, .12], jit: .06 });
  });
}
function barrel(k, p, s = 1, c = 0x7a5a3a) {
  const [x, y, z] = p;
  k.cyl(C(c, k.R(.9, 1.05)), [x, y, z], .26 * s, .42 * s, 10, { top: 1.12, jit: .1 }); k.cyl(C(c, k.R(.9, 1.05)), [x, y + .42 * s, z], .29 * s, .42 * s, 10, { top: .9, jit: .1 });
  for (const yy of [.07, .34, .5, .77]) k.cyl(EISEN, [x, y + yy * s, z], (yy < .2 || yy > .7 ? .27 : .295) * s + .01, .035 * s, 10, NO);
  k.cyl(C(c, .75), [x, y + .84 * s, z], .25 * s, .012, 10, NO); k.cyl(C(c, .6), [x - .1 * s, y + .845 * s, z], .03 * s, .012, 6, NO);
}
function barrelLying(k, p, ry, s = 1, c = 0x7a5a3a) {
  k.in(p, ry, () => {
    k.ground = -1e9;
    tube(k, C(c, k.R(.9, 1.05)), [-.42 * s, .29 * s, 0], [0, .29 * s, 0], .29 * s, 12, { top: 1.12 }); tube(k, C(c, k.R(.9, 1.05)), [.42 * s, .29 * s, 0], [0, .29 * s, 0], .29 * s, 12, { top: 1.12 });
    for (const xx of [-.36, -.12, .12, .36]) tube(k, EISEN, [xx * s - .018, .29 * s, 0], [xx * s + .018, .29 * s, 0], (Math.abs(xx) > .3 ? .27 : .3) * s, 12, NO);
    k.add(DISC(12), C(c, .7), [.425 * s, .29 * s, 0], [.255 * s, 1, .255 * s], { r: [0, 0, -PI / 2], ao: false });
    k.cyl(MESSING, [.43 * s, .2 * s, 0], .03 * s, .06, 6, { r: [0, 0, -PI / 2], ao: false });
    B(k, HOLZ_D, -.3 * s, -.2 * s, -.1, .07, -.3 * s, .3 * s); B(k, HOLZ_D, .2 * s, .3 * s, -.1, .07, -.3 * s, .3 * s);
  });
}
function crate(k, p, ry = 0, s = 1, fill) {
  k.in(p, ry, () => {
    const w = .55 * s, h = .36 * s, d = .42 * s;
    B(k, 0x5a4632, -w / 2 + .02, w / 2 - .02, 0, h * .9, -d / 2 + .02, d / 2 - .02, NO);
    for (const yy of [.02, h * .5]) for (const zz of [-1, 1]) B(k, C(HOLZ_H, k.R(.9, 1.1)), -w / 2, w / 2, yy, yy + h * .4, zz * d / 2 - .012, zz * d / 2 + .012, { jit: .08 });
    for (const yy of [.02, h * .5]) for (const xx of [-1, 1]) B(k, C(HOLZ_H, k.R(.9, 1.1)), xx * w / 2 - .012, xx * w / 2 + .012, yy, yy + h * .4, -d / 2, d / 2, { jit: .08 });
    for (const xx of [-1, 1]) for (const zz of [-1, 1]) B(k, C(HOLZ, .85), xx * (w / 2 - .02) - .02, xx * (w / 2 - .02) + .02, 0, h * .92, zz * (d / 2 - .02) - .02, zz * (d / 2 - .02) + .02, NO);
    if (fill) for (let i = 0; i < 10; i++) k.ball(k.pick(fill), [k.R(-w * .36, w * .36), h * .8, k.R(-d * .34, d * .34)], k.R(.055, .075) * s, { ao: false, jit: .1 });
  });
}
const SACK = [0xe2d6b6, 0xd8caa6, 0xe8dec2, 0xcfc0a0];
function sack(k, p, ry = 0, s = 1, lying = false, print = null) {
  const c = k.pick(SACK);
  k.in(p, ry, () => {
    if (lying) {
      k.cyl(c, [-.28 * s, .17 * s, 0], .17 * s, .56 * s, 8, { r: [0, 0, -PI / 2], jit: .06 }); k.ball(c, [.3 * s, .17 * s, 0], [.08 * s, .14 * s, .15 * s], { jit: .05 });
      k.cyl(0x8a6a3a, [.33 * s, .16 * s, 0], .05 * s, .06 * s, 5, { r: [0, 0, -PI / 2], ao: false });
    } else {
      k.cyl(c, [0, 0, 0], .2 * s, .44 * s, 8, { top: .86, jit: .06 }); k.ball(c, [0, .44 * s, 0], [.17 * s, .08 * s, .17 * s], { jit: .05 });
      k.cyl(0x8a6a3a, [0, .46 * s, 0], .06 * s, .05 * s, 5, NO); k.cone(c, [0, .51 * s, 0], .07 * s, .08 * s, 5, NO);
      if (print) { B(k, print, -.08 * s, .08 * s, .14 * s, .3 * s, .19 * s, .205 * s, NO); B(k, C(c, 1.05), -.05 * s, .05 * s, .19 * s, .25 * s, .2 * s, .21 * s, NO); }
    }
  });
}
function pot(k, r, p, s = 1, flowers = true, c = TON) {
  k.cyl(C(c, r.R(.9, 1.1)), [p[0], p[1] - .06, p[2]], .13 * s, .24 * s + .06, 8, { top: 1.2 }); k.cyl(C(c, .85), [p[0], p[1] + .2 * s, p[2]], .158 * s, .045 * s, 8);
  k.cyl(ERDE, [p[0], p[1] + .23 * s, p[2]], .14 * s, .01, 8, NO);
  k.ball(C(LAUB, r.R(.85, 1.1)), [p[0], p[1] + .33 * s, p[2]], [.17 * s, .13 * s, .17 * s], { tag: TAG.grass, sway: .2, jit: .12 });
  if (flowers) { const fc = r.pick(BLUME); for (let i = 0; i < 5; i++) k.boxc(C(fc, r.R(.9, 1.1)), [p[0] + r.R(-.11, .11) * s, p[1] + r.R(.4, .48) * s, p[2] + r.R(-.11, .11) * s], [.06 * s, .045 * s, .06 * s], { r: [r.R(0, 1), r.R(0, 1), 0], tag: TAG.flower, sway: .3, ao: false }); }
}
// Blumentuff in Kachel-Koordinaten (nur auf freiem Boden)
function flowers(k, F, x, z, rad, n, col) { for (let i = 0; i < n; i++) { const a = k.R(0, TAU), d = Math.sqrt(k.rand()) * rad, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; if (F.free(px, pz, .05)) N.flower(k, [px, F.h(px, pz), pz], k.rand() < .75 ? col : undefined); } }
function tufts(k, F, x, z, rad, n) { for (let i = 0; i < n; i++) { const a = k.R(0, TAU), d = Math.sqrt(k.rand()) * rad, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; if (F.free(px, pz, .08)) N.grass(k, [px, F.h(px, pz), pz], k.R(.7, 1.2)); } }
// Wiese nur außerhalb eines Radius (Gras, Blumengruppen, Steine)
function meadowOut(k, F, r0, amount = 1) {
  const ok = (x, z, rr) => Math.hypot(x, z) > r0 + rr && F.free(x, z, rr);
  for (let i = 0; i < 26 * amount; i++) { const a = k.R(0, TAU), d = k.R(r0, INR), x = Math.cos(a) * d, z = Math.sin(a) * d; if (ok(x, z, .12)) N.grass(k, [x, F.h(x, z), z], k.R(.8, 1.3)); }
  for (let c = 0; c < 4 * amount; c++) { const a = k.R(0, TAU), d = k.R(r0 + .3, INR - .4), fc = k.pick(BLUME); for (let i = 0; i < 5; i++) { const x = Math.cos(a) * d + k.R(-.5, .5), z = Math.sin(a) * d + k.R(-.5, .5); if (ok(x, z, .06)) N.flower(k, [x, F.h(x, z), z], k.rand() < .7 ? fc : undefined); } }
}
// Holzscheit-Stapel an einer Wand (entlang x von x0 bis x1, Tiefe ab z = zw nach +z)
const SCHEIT = () => tpl('scheit', () => {
  const v = [0, 1, 2].map(i => { const a = i * 2 * PI / 3 + PI / 2; return [Math.cos(a), Math.sin(a)]; }), p = [];
  for (let i = 0; i < 3; i++) { const [ax, ay] = v[i], [bx, by] = v[(i + 1) % 3]; p.push(ax, ay, 0, bx, by, 0, bx, by, 1, ax, ay, 0, bx, by, 1, ax, ay, 1); }
  p.push(...v[0], 1, ...v[1], 1, ...v[2], 1);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals(); return g;
});
function woodpile(k, r, x0, x1, zw, rows = 5, roofed = true) {
  for (const dz of [.08, .34]) B(k, HOLZ_D, x0 - .05, x1 + .05, -.3, .1, zw + dz - .04, zw + dz + .04);
  for (const x of [x0 - .08, x1 + .08]) for (const dz of [.07, .36]) B(k, HOLZ_D, x - .03, x + .03, -.3, .14 + rows * .16 + .1, zw + dz - .03, zw + dz + .03);
  const dx = .19;
  for (let j = 0; j < rows; j++) {
    const y = .19 + j * .16, end = j === rows - 1 ? x1 - .3 - r.R(0, .5) : x1 - .04;
    for (let x = x0 + .07 + (j % 2) * dx / 2; x < end; x += dx) {
      const c = r.p(.8) ? C(r.pick([0xc89a62, 0xb88a52, 0xd4a872]), r.R(.9, 1.05)) : C(0x7a5a3e, r.R(.85, 1.1)), rr = r.R(.085, .1);
      k.add(SCHEIT(), c, [x + r.R(-.01, .01), y, zw + .02 + r.R(0, .05)], [rr, rr, r.R(.34, .4)], { r: [0, 0, r.R(0, 6.28)], jit: .1 });
    }
  }
  if (roofed) for (let i = 0; i < 2; i++) k.box(C(HOLZ_G, r.R(.9, 1.1)), [(x0 + x1) / 2, .2 + rows * .16 + .1, zw + .02 + i * .25], [x1 - x0 + .35, .03, .26], { r: [.18, 0, 0], jit: .05 });
}
function choppingBlock(k, r, p, axe = true) {
  k.cyl(0x6b4a32, [p[0], p[1] - .3, p[2]], .24, .75, 8, { top: .95 }); k.add(DISC(8), 0xc9a878, [p[0], p[1] + .452, p[2]], [.225, 1, .225], NO);
  k.add(TORUS(8, .06, 3), 0xa8865a, [p[0], p[1] + .455, p[2]], [.12, .12, .12], { r: [PI / 2, 0, 0], ao: false });
  if (axe) { k.beam(0x9a7a4a, [p[0] + .05, p[1] + .46, p[2]], [p[0] + .45, p[1] + .8, p[2] + .1], .035); k.box(0x6a6e72, [p[0] + .05, p[1] + .43, p[2]], [.16, .1, .025], { r: [0, -.24, -.65] }); k.box(0xb8bcc0, [p[0] - .02, p[1] + .43, p[2] + .02], [.03, .09, .026], { r: [0, -.24, -.65], ao: false }); }
  for (let i = 0; i < 5; i++) k.add(SCHEIT(), C(0xc89a62, r.R(.9, 1.1)), [p[0] + r.R(-.55, .45), p[1] + .06, p[2] + r.R(-.2, .35)], [.075, .075, .36], { r: [0, r.R(0, 6), r.R(0, 6)] });
  k.detail(() => { for (let i = 0; i < 8; i++) k.box(0xd8b888, [p[0] + r.R(-.6, .6), p[1] + .005, p[2] + r.R(-.5, .5)], [.06, .01, .03], { r: [0, r.R(0, 3), 0], ao: false }); });   // Späne (Kleinkram)
}
function bucket(k, p, s = 1, water = false) {
  const [x, y, z] = p;
  k.cyl(HOLZ_H, [x, y, z], .12 * s, .24 * s, 8, { top: 1.25, jit: .08 });
  for (const yy of [.04, .19]) k.cyl(EISEN, [x, y + yy * s, z], (.125 + yy * .13) * s, .025 * s, 8, NO);
  if (water) k.cyl(0x3f8fa8, [x, y + .2 * s, z], .135 * s, .02, 8, { layer: 'water', ao: false });
  k.add(ARC(8, .08, PI), EISEN, [x, y + .24 * s, z], [.15 * s, .15 * s, .15 * s], { ao: false });
}
// Stein-Sockel aus Einzelsteinen unter einem Rechteck (halbe Maße a, b), Oberkante top
function plinth(k, r, a, b, top, sides = 'FKRL', cx = 0, cz = 0) {
  B(k, MOERTEL, cx - a + .01, cx + a - .01, -.7, top - .012, cz - b + .01, cz + b - .01, { jit: .05 });
  k.push([cx, 0, cz], 0);
  for (const s of sides) onWall(k, s, a, b, () => { const L = s === 'F' || s === 'K' ? b + .03 : a - .03; stones(k, r, -L, L, -.35, top, { ch: .25, len: [.45, .8], d: .07, moss: .12 }); });
  k.pop();
}
// Sonnenblumen-/Wildblumenbeet mit Steineinfassung (in Kachel-Koordinaten, ellipsenförmig)
function flowerBed(k, F, x, z, rx, rz, ry, col) {
  const y = F.h(x, z), n = Math.round((rx + rz) * 6);
  k.in([x, y, z], ry, () => {
    k.ball(ERDE, [0, -.06, 0], [rx, .12, rz], { jit: .1, ao: false });
    for (let i = 0; i < n; i++) { const a = i / n * TAU; k.ball(C(k.pick(STEIN), k.R(.9, 1.1)), [Math.cos(a) * rx, .02, Math.sin(a) * rz], [.11, .07, .09], { dod: true, r: [0, -a, 0], jit: .1 }); }
    for (let i = 0; i < n * 1.6; i++) { const a = k.R(0, TAU), d = Math.sqrt(k.rand()) * .85, px = Math.cos(a) * rx * d, pz = Math.sin(a) * rz * d; N.flower(k, [px, .04, pz], k.rand() < .6 ? col : undefined); }
    for (let i = 0; i < 4; i++) k.ball(C(LAUB, k.R(.85, 1.1)), [k.R(-.5, .5) * rx, .1, k.R(-.5, .5) * rz], [.18, .12, .18], { tag: TAG.grass, sway: .15, jit: .12 });
  });
}
// Frei-Sektoren zwischen den Wegen (Kachel-Koordinaten): Kanten ohne Weg, Richtung als Winkel
function freeSectors(E, F, pref = 'g') { const out = []; for (let i = 0; i < 6; i++) if (E[i] === pref && !F.rEdges.includes(i)) out.push(i); return out; }
// Richtungen (alle 30°) mit dem größten Winkelabstand zu den Wegen; je Richtung { a, clr } (clr = Abstand im Bogenmaß)
function openDirs(F, n = 3, minSep = PI / 3 - .01) {
  const roads = F.rEdges.map(edgeAngle), out = [], cand = [];
  for (let i = 0; i < 12; i++) { const a = i * PI / 6; let c = PI; for (const q of roads) c = Math.min(c, Math.abs(Math.atan2(Math.sin(a - q), Math.cos(a - q)))); cand.push({ a, clr: c }); }
  cand.sort((p, q) => q.clr - p.clr || p.a - q.a);
  for (const c of cand) { if (out.length >= n || c.clr < .4) break; if (out.every(o => Math.abs(Math.atan2(Math.sin(o.a - c.a), Math.cos(o.a - c.a))) >= minSep)) out.push(c); }
  return out;
}
// Mindestabstand von der Mitte, damit ein Ding mit Radius rr neben den Wegen frei bleibt
const clearR = (clr, rr) => clr >= PI / 2 ? 0 : (.85 + rr + .1) / Math.sin(clr);
// Punkt in Richtung a mit Abstand d, seitlich versetzt um s
const polar = (a, d, s = 0) => [Math.cos(a) * d - Math.sin(a) * s, Math.sin(a) * d + Math.cos(a) * s];

// =====================================================================================================
// Kreuzung: drei Wege treffen sich in der Mitte. Wegweiser, Bank mit Laterne, Wegkreuz, Meilenstein, Blumen
// =====================================================================================================
function signpost(k, r, F, x, z, roadAngles) {
  onG(k, F, x, z, 0, () => {
    k.box(C(0x8f8b84), [0, -.25, 0], [.34, .36, .34], { jit: .06 }); k.box(C(0x9a958c), [0, .08, 0], [.28, .05, .28], { r: [0, .2, 0], jit: .05 });
    k.box(C(HOLZ, .95), [0, .1, 0], [.11, 2.25, .11], { r: [0, .2, 0], jit: .05 });
    for (const [a, b] of [[0, 1], [1, 0]]) k.box(C(HOLZ_D, .9), [0, .1, 0], [a ? .118 : .02, 2.25, b ? .118 : .02], { r: [0, .2 + PI / 4, 0], ao: false });   // Fasen
    k.cone(HOLZ_D, [0, 2.35, 0], .14, .18, 4, { r: [0, .2 + PI / 4, 0] }); B(k, HOLZ_D, -.1, .1, 2.33, 2.36, -.1, .1, NO);
    k.ball(MOOS, [.05, 2.38, .02], [.06, .02, .05], { tag: TAG.grass, ao: false });
    const SC = [0xe8d8a8, 0xd8c898, 0xe0d0a0, 0xd0c090, 0xe8dcb0, 0xd8cca0];
    roadAngles.forEach((a, i) => k.in([0, 1.95 - i * .27, 0], -a, () => {
      const c = C(SC[i % SC.length], r.R(.92, 1.05)), L = r.R(.62, .74);
      B(k, c, .07, .07 + L, -.09, .09, -.022, .022, { jit: .05 });
      k.prism(c, [.07 + L, -.09, 0], .18, .13, .044, { r: [0, 0, -PI / 2] });
      B(k, C(c, .75), .07, .07 + L, -.095, -.085, -.024, .024, NO);                                     // Unterkante verwittert
      for (let j = 0, xx = .14; j < 4 && xx < L - .02; j++) { const lw = r.R(.07, .13); B(k, 0x3a3028, xx, xx + lw, -.025, .025, .021, .027, NO); xx += lw + .03; }   // Schrift
      for (let j = 0, xx = .16; j < 3 && xx < L - .1; j++) { const lw = r.R(.05, .09); B(k, 0x5a4a38, xx, xx + lw, -.06, -.045, .021, .026, NO); xx += lw + .04; }
      for (const zz of [.024, -.024]) k.ball(EISEN, [.1, 0, zz], .012, NO);                              // Nägel
      B(k, EISEN, .0, .11, -.02, .02, -.03, .03, NO);                                                    // Schelle am Pfosten
    }));
  });
}
function milestone(k, r, F, x, z, ry) {
  onG(k, F, x, z, ry, () => {
    const c = C(0xc8c0ac, r.R(.92, 1.04));
    k.box(c, [0, -.3, 0], [.22, .78, .38], { jit: .04 }); k.cyl(c, [.11, .48, 0], .19, .22, 10, { r: [0, 0, PI / 2], jit: .04 });
    B(k, 0xe8e4d8, .11, .118, .2, .4, -.13, .13, NO);                                                       // geweißtes Feld
    for (const [yy, w] of [[.32, .14], [.24, .08]]) B(k, 0x3a3428, .117, .124, yy, yy + .05, -w / 2, w / 2, NO);   // Zahl
    for (let i = 0; i < 4; i++) B(k, 0x3a3428, .117, .124, .42 + (i % 2) * .0, .445, -.1 + i * .055, -.07 + i * .055, NO);
    for (let i = 0; i < 3; i++) k.ball(C(MOOS, r.R(.85, 1.1)), [r.R(-.08, .08), r.R(.1, .5), r.R(-.18, .18)], [.04, .05, .06], { tag: TAG.grass, ao: false });
    k.ball(C(0x9aa070, 1), [.0, .58, -.05], [.09, .02, .08], { ao: false });                                  // Flechte oben
  });
}
// Wegkreuz mit Blechdach, Christus, Blumen und Kniebank (blickt nach +x)
function wayCross(k, r, F, x, z, ry) {
  onG(k, F, x, z, ry, () => {
    k.box(C(0x8f8b84), [0, -.3, 0], [.5, .42, .5], { jit: .06 }); k.box(C(0x9a958c), [0, .1, 0], [.4, .06, .4], { jit: .05 });
    const wc = C(0x5a3a26);
    k.box(wc, [0, .1, 0], [.14, 2.7, .14], { jit: .05 }); k.box(wc, [0, 2.0, 0], [.12, .12, 1.1], { jit: .05 });
    for (const s of [-1, 1]) k.box(C(wc, .85), [0, 2.0, s * .55], [.13, .13, .03], NO);
    // Blechdach über dem Querbalken
    k.in([0, 2.8, 0], 0, () => { for (const s of [-1, 1]) { k.box(ZINK_D, [s * .13, -.09, 0], [.29, .018, 1.36], { r: [0, 0, -s * .6], jit: .03 }); k.box(ZINK, [s * .255, -.175, 0], [.02, .04, 1.36], { r: [0, 0, -s * .6], ao: false }); } B(k, ZINK, -.025, .025, -.02, .03, -.69, .69, NO);
      for (const s of [-1, 1]) k.prism(C(0x5a3a26, .9), [0, -.2, s * .64], .44, .2, .04, NO); });
    k.box(0xd8c8a0, [.08, 2.72, 0], [.04, .14, .26], NO); B(k, 0x3a3028, .1, .105, 2.77, 2.8, -.08, .08, NO);   // INRI-Tafel
    // Figur
    const sk = 0xe0c8a8, cl = 0xf0ece0;
    k.ball(sk, [.12, 2.18, 0], [.06, .075, .06], NO); k.cone(0xb8a040, [.12, 2.24, 0], .07, .03, 6, NO);
    k.box(sk, [.12, 1.72, 0], [.07, .4, .13], NO); k.box(cl, [.12, 1.6, 0], [.08, .14, .15], NO);
    for (const s of [-1, 1]) { k.beam(sk, [.11, 2.05, s * .06], [.1, 2.07, s * .48], .045, NO); k.beam(sk, [.11, 1.6, s * .03], [.11, 1.15, s * .02], .05, NO); }
    k.box(0x6a6a6a, [.12, 1.08, 0], [.08, .06, .12], NO);
    // Blumen am Fuß, Kerze
    for (const s of [-1, 1]) { pot(k, r, [.32, .13, s * .18], .65, true); }
    k.cyl(0xc83a2a, [.3, .13, 0], .045, .12, 6, NO); k.ball(0xffb040, [.3, .3, 0], [.02, .04, .02], { layer: 'glow', tag: 2, ao: false });
    // Kniebank
    B(k, HOLZ, .62, .68, -.3, .2, -.4, -.34); B(k, HOLZ, .62, .68, -.3, .2, .34, .4); B(k, C(HOLZ, 1.1), .55, .8, .2, .25, -.45, .45);
    // Zäunchen
    for (const s of [-1, 1]) for (const xx of [-.35, .1]) B(k, C(0xe8e2d4, r.R(.9, 1.05)), xx - .025, xx + .025, -.2, .55, s * .45 - .025, s * .45 + .025);
    for (const s of [-1, 1]) B(k, 0xe8e2d4, -.38, .13, .42, .46, s * .45 - .02, s * .45 + .02, NO);
  });
}
export function tile_kreuzung(k, F, ctx) {
  const r = RNG(ctx.seed, 'kreuzung'), taken = [];
  const roads = F.rEdges.map(i => edgeAngle(i));
  const groups = ['sign', 'rest', 'cross'];
  openDirs(F, 3).forEach(({ a, clr }, gi) => {
    const g = groups[gi]; if (!g) return;
    if (g === 'sign') {
      const [x, z] = polar(a, Math.max(1.75, clearR(clr, .25)));
      if (F.free(x, z, .25)) { signpost(k, r, F, x, z, roads.slice().sort((p, q) => p - q)); taken.push([x, z, .5]); flowers(k, F, x, z, .6, 9, r.pick(BLUME)); tufts(k, F, x, z, .5, 4); }
      const [mx, mz] = polar(a, 3.75, .9);
      if (F.free(mx, mz, .3)) { milestone(k, r, F, mx, mz, -a + PI); taken.push([mx, mz, .5]); tufts(k, F, mx, mz, .4, 3); }
      const [bx, bz] = polar(a, 4.2, -.8); if (F.free(bx, bz, .6)) { onG(k, F, bx, bz, 0, () => N.bush(k, [0, 0, 0], .9, r.p(.5) ? 0xd83a5a : 0)); taken.push([bx, bz, .8]); }
      if (roads.length > 3) { const [lx, lz] = polar(a, 3.3, -1.0); if (F.free(lx, lz, .2)) { onG(k, F, lx, lz, 0, () => streetLamp(k, [0, 0, 0], 2.65)); taken.push([lx, lz, .3]); } }
    } else if (g === 'rest') {
      const [x, z] = polar(a, Math.max(3.25, clearR(clr, .55))), ry = PI - a;
      if (F.free(x, z, .55)) {
        onG(k, F, x, z, ry, () => { parkBench(k, [0, 0, 0], 0, 1.5); sitSpot(k, [.05, .45, 0], 1, 0); });
        taken.push([x, z, .9]);
        const [lx, lz] = polar(a, 3.35, 1.1); if (F.free(lx, lz, .2)) { onG(k, F, lx, lz, 0, () => streetLamp(k, [0, 0, 0], 2.65)); taken.push([lx, lz, .3]); }
        const [px, pz] = polar(a, 3.2, -1.05); if (F.free(px, pz, .2)) { onG(k, F, px, pz, 0, () => pot(k, r, [0, 0, 0], 1.1)); }
        const [fx, fz] = polar(a, 4.25); if (F.free(fx, fz, .6)) { flowerBed(k, F, fx, fz, 1.0, .45, -a + PI / 2, r.pick(BLUME)); taken.push([fx, fz, 1]); }
      }
    } else if (g === 'cross') {
      const [x, z] = polar(a, Math.max(3.35, clearR(clr, .5))), ry = PI - a;
      if (F.free(x, z, .5)) { wayCross(k, r, F, x, z, ry); taken.push([x, z, .9]); flowers(k, F, x, z, .9, 10, r.pick(BLUME)); }
      const [tx, tz] = polar(a, 4.25, 1.1); if (F.free(tx, tz, 1)) { onG(k, F, tx, tz, 0, () => N.leafTree(k, [0, 0, 0], .95)); taken.push([tx, tz, 1.2]); }
    }
  });
  if (!(k.spots || []).some(q => q.type === 'light')) for (let i = 0; i < 24; i++) { const [lx, lz] = polar((i % 12) * PI / 6, i < 12 ? 3.4 : 2.6); if (F.free(lx, lz, .25) && !taken.some(q => Math.hypot(q[0] - lx, q[1] - lz) < q[2] + .3)) { onG(k, F, lx, lz, 0, () => streetLamp(k, [0, 0, 0], 2.65)); taken.push([lx, lz, .3]); break; } }
  meadow(k, F, .55, taken);
  scatter(k, F, 2, .5, (x, y, z) => N.bush(k, [x, y, z], .75), 20, taken);
}

// =====================================================================================================
// Dorfplatz: Kopfsteinpflaster, Linde mit Rundbank, kleiner Brunnen, Bänke, Laternen, Maibaum, Litfaßsäule
// =====================================================================================================
// Pflaster in Ringen (Kachel-Koordinaten) mit Sandbett und Randsteinen; gibt Oberkanten-Abstand zurück
const PAVE = .06;
function paving(k, r, F, r0, r1) {
  // Sandbett als Fläche über dem Gelände
  const pos = [], col = [], c = new THREE.Color(), nA = 40, nR = Math.ceil((r1 + .15 - r0 + .1) / .3);
  const P = (i, j) => { const a = i / nA * TAU, rr = r0 - .1 + (r1 + .15 - r0 + .1) * j / nR, x = Math.cos(a) * rr, z = Math.sin(a) * rr; return [x, F.h(x, z) + .025, z]; };
  for (let i = 0; i < nA; i++) for (let j = 0; j < nR; j++) {
    const a = P(i, j), b = P(i + 1, j), d = P(i, j + 1), e = P(i + 1, j + 1);
    pos.push(...a, ...d, ...b, ...b, ...d, ...e); c.set(0x8a8070).multiplyScalar(r.R(.92, 1.06)); for (let q = 0; q < 6; q++) col.push(c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  g.setAttribute('tag', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3), 1)); k.raw(g);
  // Steine
  for (let rr = r0 + .13, ring = 0; rr < r1 - .1; rr += .255, ring++) {
    const n = Math.round(TAU * rr / .27), off = r.R(0, 1);
    for (let i = 0; i < n; i++) {
      const a = (i + off) / n * TAU, x = Math.cos(a) * rr, z = Math.sin(a) * rr, h = F.h(x, z), w = TAU * rr / n - .03;
      const q = r.f(); let cc = C(r.pick(PFLASTER), r.R(.85, 1.12)); if (q > .97) cc = MIX(cc, MOOS, .35); else if (q > .95) cc = C(cc, .75);
      k.add(STONE(), cc, [x, h - .04 + (q > .93 && q < .95 ? -.015 : 0), z], [w * r.R(.88, 1), .1 + r.R(-.01, .01), .225], { r: [r.R(-.03, .03), -a + PI / 2, r.R(-.03, .03)], jit: .07 });
      if (q < .04) N.grass(k, [x + .12, h + .03, z], .35);
    }
  }
  // Randsteine
  const nB = Math.round(TAU * r1 / .42);
  for (let i = 0; i < nB; i++) { const a = i / nB * TAU, x = Math.cos(a) * r1, z = Math.sin(a) * r1; k.add(STONE(), C(r.pick([0xb8b2a6, 0xaea89c, 0xa49e92]), r.R(.9, 1.05)), [x, F.h(x, z) - .1, z], [TAU * r1 / nB - .025, .2, .13], { r: [0, -a + PI / 2, r.R(-.04, .04)], jit: .05 }); }
}
// Linde mit Rundbank (Ursprung = Stammfuß, y = Pflasteroberkante)
function linden(k, r, p, s = 1) {
  const [x, y, z] = p, tc = 0x5e4632, tc2 = 0x6a5038;
  k.in([x, y, z], 0, () => {
    // Baumscheibe mit Einfassung
    k.cyl(ERDE, [0, -.05, 0], .78, .08, 10, NO);
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; k.add(STONE(), C(r.pick(STEIN), r.R(.9, 1.05)), [Math.cos(a) * .82, -.06, Math.sin(a) * .82], [.36, .12, .12], { r: [0, -a + PI / 2, 0], jit: .06 }); }
    for (let i = 0; i < 6; i++) { const a = r.R(0, TAU), d = r.R(.5, .7); N.grass(k, [Math.cos(a) * d, 0, Math.sin(a) * d], .6); }
    // Stamm, Wurzelanläufe, Knorren
    k.cyl(tc, [0, -.1, 0], .4 * s, 1.2 * s, 9, { top: .82, jit: .1 }); k.cyl(tc, [.03, 1.05 * s, .02], .33 * s, 1.5 * s, 8, { top: .85, jit: .1 }); k.cyl(tc2, [-.02, 2.5 * s, 0], .29 * s, 1.1 * s, 7, { top: .8, jit: .1 });
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + r.R(-.3, .3); k.beam(tc, [Math.cos(a) * .2, .32, Math.sin(a) * .2], [Math.cos(a) * .6, -.02, Math.sin(a) * .6], .18, { w: .2, d: .16 }); }
    for (let i = 0; i < 5; i++) { const a = r.R(0, TAU), yy = r.R(.6, 2.6); k.ball(C(tc, r.R(.85, 1.1)), [Math.cos(a) * .33, yy, Math.sin(a) * .33], [.12, .16, .12], { jit: .12 }); }
    for (let i = 0; i < 6; i++) { const a = r.R(0, TAU), yy = r.R(.3, 3); k.box(C(0x4a3a2a, r.R(.8, 1)), [Math.cos(a) * .36, yy, Math.sin(a) * .36], [.03, r.R(.3, .7), .05], { r: [0, -a, 0], ao: false }); }   // Rindenfurchen
    k.ball(C(MOOS, 1), [-.3, .35, .12], [.1, .2, .12], { tag: TAG.grass, ao: false });
    // Äste in die Krone
    const tops = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + r.R(-.3, .3), y0 = r.R(2.9, 3.4) * s, L = r.R(1.3, 1.8) * s, e = [Math.cos(a) * L, y0 + L * r.R(.8, 1.1), Math.sin(a) * L]; tube(k, tc2, [0, y0, 0], e, .12 * s, 6, { top: .5 }); tops.push([e[0] * .85, e[1], e[2] * .85]); }
    // Krone
    const LC = [0x4f8f3a, 0x5a9a40, 0x467f34, 0x62a446, 0x52923c];
    for (let i = 0; i < 18; i++) {
      const a = r.R(0, TAU), d = Math.sqrt(r.f()) * 1.8 * s, yy = (4.9 + r.R(-.4, 2.0) - d * .3) * s, rr = r.R(.85, 1.2) * s;
      k.ball(C(r.pick(LC), r.R(.9, 1.08)), [Math.cos(a) * d, yy, Math.sin(a) * d], [rr, rr * .8, rr], { tag: TAG.leaf, sway: { k: .03 }, swayBase: 0, jit: .14, detail: 1 });
    }
    for (const e of tops) k.ball(C(r.pick(LC)), [e[0] * 1.1, e[1] - .2, e[2] * 1.1], [1.0 * s, .75 * s, 1.0 * s], { tag: TAG.leaf, sway: { k: .03 }, swayBase: 0, jit: .14, detail: 1 });
    // Rundbank (achteckig), Rücken am Stamm, Sitz außen
    const n = 8, ri = .62, ro = 1.08;
    for (let i = 0; i < n; i++) {
      const a = (i + .5) / n * TAU;
      k.in([0, 0, 0], -a, () => {
        const rm = (ri + ro) / 2, L = 2 * ro * Math.tan(PI / n) - .02;
        for (let j = 0; j < 4; j++) { const x0 = ri + .03 + j * (ro - ri - .04) / 4, x1 = x0 + (ro - ri - .04) / 4 - .015, Lj = 2 * (x0 + x1) / 2 * Math.tan(PI / n); B(k, C(HOLZ_H, r.R(.88, 1.08)), x0, x1, .42, .455, -Lj / 2, Lj / 2, { jit: .06 }); }
        for (let j = 0; j < 2; j++) { const yy = .58 + j * .15, xx = ri - .02 - j * .025; B(k, C(HOLZ_H, r.R(.88, 1.08)), xx - .015, xx + .015, yy, yy + .1, -ri * Math.tan(PI / n), ri * Math.tan(PI / n), { jit: .06 }); }
        B(k, GUSS, ro - .1, ro - .05, -.05, .42, -.02, .02, NO); B(k, GUSS, ri, ri + .05, -.05, .42, -.02, .02, NO); B(k, GUSS, ri, ro - .05, .38, .42, -.02, .02, NO);
        B(k, GUSS, ri - .06, ri - .02, .42, .85, -.02, .02, NO);
      });
    }
  });
  return [.85, 1.08];
}
// Schwengelbrunnen mit achteckigem Trog (Ursprung = Boden)
function smallFountain(k, r, p) {
  k.in(p, 0, () => {
    const Ro = .78, Ri = .64, h = .5, n = 8;
    k.cyl(0x5a5650, [0, -.3, 0], Ri, .45, n, { r: [0, PI / n, 0] });
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, L = 2 * Ro * Math.sin(PI / n), am = (Ro + Ri) / 2 * Math.cos(PI / n);
      k.in([Math.cos(a) * am, 0, Math.sin(a) * am], -a, () => {
        B(k, C(r.pick([0xb8b0a0, 0xaea696]), r.R(.94, 1.04)), -(Ro - Ri) / 2, (Ro - Ri) / 2, -.2, h, -L / 2 + .01, L / 2 - .01, { jit: .04 });
        B(k, C(0xc8c0b0, r.R(.95, 1.03)), -(Ro - Ri) / 2 - .03, (Ro - Ri) / 2 + .03, h, h + .06, -L / 2 - .005, L / 2 + .005, { jit: .03 });
        if (r.p(.5)) k.ball(MOOS, [(Ro - Ri) / 2 + .005, .05, r.R(-.1, .1)], [.02, .06, .12], { tag: TAG.grass, ao: false });
      });
    }
    k.cyl(0x3f8fa8, [0, h - .1, 0], Ri + .01, .02, n, { layer: 'water', r: [0, PI / n, 0], ao: false });
    // Brunnenstock mit Rohr und Strahl
    const sx = -.22;
    k.box(C(0xb0a898), [sx, -.1, 0], [.26, 1.65, .26], { jit: .04 }); k.box(C(0xc0b8a8), [sx, 1.55, 0], [.32, .08, .32]); k.cone(C(0xb8b0a0), [sx, 1.63, 0], .2, .22, 4, { r: [0, PI / 4, 0] }); k.ball(0xb8b0a0, [sx, 1.9, 0], .07);
    k.cyl(MESSING, [sx + .13, 1.05, 0], .03, .3, 6, { r: [0, 0, -PI / 2 + .25], ao: false });
    k.beam(0x7ac0d8, [sx + .42, 1.12, 0], [sx + .5, h - .08, 0], .045, { layer: 'water', ao: false });
    for (let i = 0; i < 4; i++) k.ball(0xe8f4f8, [sx + .5 + r.R(-.06, .06), h - .07, r.R(-.06, .06)], .04, { layer: 'water', ao: false });
    // Schwengel
    k.cyl(EISEN, [sx - .13, 1.2, 0], .025, .05, 6, { r: [0, 0, PI / 2], ao: false });
    k.beam(EISEN, [sx - .16, 1.2, 0], [sx - .62, 1.38, 0], .035); k.ball(HOLZ_D, [sx - .64, 1.39, 0], [.06, .04, .04]);
    B(k, C(0x6a6a5a), sx + .14, sx + .15, .7, .9, -.08, .08, NO);                                   // Wappenschild
    k.ball(0x2a5a9a, [sx + .155, .8, 0], [.005, .07, .05], NO);
    bucket(k, [Ro + .25, 0, .35], .9, true);
  });
}
function maypole(k, r, p, ang = 0) {
  k.in(p, -ang, () => {
    const H = 8.6, R0 = .16;
    k.box(C(0x9a958c), [0, -.3, 0], [.7, .45, .7], { jit: .05 }); k.box(C(0xa8a296), [0, .13, 0], [.6, .06, .6], { jit: .05 });
    for (const [dx, dz] of [[1, 0], [-1, 0]]) { k.beam(HOLZ_D, [dx * .06, .2, dz], [dx * (dx > 0 ? .4 : .75), -.1, dz], .1); B(k, EISEN, dx * .12 - .02, dx * .12 + .02, .2, .55, -.1, .1, NO); }
    // Spirale aus Halbschalen (blau/weiß)
    const seg = 28, sh = (H - .3) / seg;
    for (let i = 0; i < seg; i++) {
      const y = .2 + i * sh, rr = R0 * (1 - i / seg * .55);
      for (let hlf = 0; hlf < 2; hlf++) k.add(HALFO(6), hlf ? 0x2a5aa8 : 0xf4f2ea, [0, y, 0], [rr, sh + .002, rr], { r: [0, i * .45 + hlf * PI, 0], jit: .03 });
    }
    k.cone(0x2a5aa8, [0, H - .1, 0], R0 * .45, .2, 6);
    // Kränze mit Bändern
    for (const [yy, rw] of [[H * .62, .75], [H * .82, .55]]) {
      k.add(TORUS(12, .12, 4), C(0x3f7a34), [0, yy, 0], [rw, rw, rw], { r: [PI / 2, 0, 0], tag: TAG.needle, jit: .1 });
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, c = [0x2a5aa8, 0xf4f2ea, 0xd8302a][i % 3]; k.add(TORUS(6, .3, 3), c, [Math.cos(a) * rw, yy - .02, Math.sin(a) * rw], [.04, .04, .04], { ao: false }); k.box(c, [Math.cos(a) * rw, yy - .55, Math.sin(a) * rw], [.025, .5, .05], { r: [0, -a, 0], sway: .6, ao: false }); }
      for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + .5; k.beam(0xd8d0c0, [0, yy + 1.5, 0], [Math.cos(a) * rw, yy, Math.sin(a) * rw], .012, NO); }
    }
    // Zunftschilder an Armen
    const SH = [[0xd8302a, 0xf2c43a], [0x2a5aa8, 0xffffff], [0x3a7a34, 0xf2c43a], [0x8a5a2a, 0xf4f2ea], [0xd8302a, 0xffffff], [0x2a5aa8, 0xf2c43a]];
    for (let i = 0; i < 6; i++) {
      const a = i * PI * .8 + .3, yy = 2.3 + i * .52, s2 = SH[i];
      k.in([0, yy, 0], -a, () => {
        k.beam(EISEN, [0, 0, 0], [.55, 0, 0], .03); k.beam(EISEN, [0, -.25, 0], [.4, 0, 0], .02);
        B(k, s2[0], .45, .5, -.5, .05, -.22, .22); B(k, C(s2[0], .7), .44, .51, .03, .07, -.24, .24, NO);
        B(k, s2[1], .505, .515, -.4, -.05, -.12, .12, NO); k.ball(s2[1], [.512, -.32, 0], [.005, .05, .1], NO);
      });
    }
    // Krone: Bäumchen und Fähnchen
    for (let i = 0; i < 3; i++) k.cone(C(0x3f7a34, .9 + i * .08), [0, H + .1 + i * .35, 0], .55 - i * .14, .65, 7, { tag: TAG.needle, sway: { k: .03 }, swayBase: 0, jit: .12 });
    k.cyl(HOLZ_D, [0, H - .2, 0], .04, 1.6, 5);
  });
}
function litfass(k, r, p) {
  k.in(p, 0, () => {
    const R0 = .42, H = 2.3;
    k.cyl(GUSS, [0, -.1, 0], R0 + .06, .3, 12); k.cyl(C(GUSS, 1.2), [0, .2, 0], R0 + .08, .05, 12, NO);
    k.cyl(0x8a8a80, [0, .2, 0], R0, H, 12);
    const PC = [[0xe8d8a8, 0xc83a2a], [0x2a5a9a, 0xf2e8c8], [0xf2c43a, 0x2a2a2a], [0xe8e4dc, 0x3a7a3a], [0xd8302a, 0xf4f0e6], [0xc8b8e8, 0x4a2a6a], [0xf4f0e6, 0x2a4a7a]];
    const nP = 7;
    for (let i = 0; i < nP; i++) for (let j = 0; j < 2; j++) {
      const a = (i + j * .5) / nP * TAU, pc = PC[(i * 2 + j) % PC.length], y0 = .35 + j * 1.0 + r.R(-.05, .05), hh = r.R(.8, .95);
      k.in([0, y0, 0], -a, () => {
        B(k, C(pc[0], r.R(.92, 1.04)), R0 - .005, R0 + .008, 0, hh, -.15, .15, NO);
        for (let l = 0; l < 3; l++) { const ly = hh - .14 - l * .2, lw = r.R(.08, .12); B(k, pc[1], R0 + .008, R0 + .012, ly, ly + (l ? .05 : .09), -lw, lw, NO); }
        k.ball(C(pc[1], 1), [R0 + .01, .2, 0], [.004, .1, .1], NO);
        if (r.p(.25)) k.box(C(pc[0], .95), [R0 + .02, hh - .05, .1], [.01, .12, .08], { r: [0, 0, .5], ao: false });   // abgelöste Ecke
      });
    }
    k.cyl(GUSS, [0, H + .2, 0], R0 + .1, .08, 12); k.cyl(C(GUSS, 1.1), [0, H + .28, 0], R0 + .06, .1, 12, { top: .9 });
    k.add(tpl('dome12', () => new THREE.SphereGeometry(1, 12, 4, 0, TAU, 0, PI / 2)), GUSS, [0, H + .38, 0], [R0 + .02, .35, R0 + .02], {});
    k.cyl(GUSS, [0, H + .72, 0], .03, .12, 6); k.ball(MESSING, [0, H + .88, 0], .06, NO);
  });
}
function pigeon(k, p, ry, c = 0x8a8c94) { k.detail(() => {
  k.in(p, ry, () => {
    k.ball(c, [0, .07, 0], [.09, .055, .055], NO); k.ball(C(c, .85), [.08, .12, 0], [.035, .035, .035], NO); k.ball(0x6a8a7a, [.06, .095, 0], [.03, .03, .045], NO);
    k.cone(0x3a3030, [.115, .12, 0], .01, .03, 4, { r: [0, 0, -PI / 2], ao: false }); k.box(C(c, .7), [-.1, .06, 0], [.06, .015, .05], { r: [0, 0, .3], ao: false });
    for (const s of [-1, 1]) B(k, 0xc86a5a, -.005, .005, 0, .03, s * .02 - .004, s * .02 + .004, NO);
  });
  }); }
export function tile_platz(k, F, ctx) {
  const r = RNG(ctx.seed, 'platz'), RP = 3.6;
  paving(k, r, F, .95, RP);
  const top = (x, z) => F.h(x, z) + PAVE;
  linden(k, r, [0, top(0, 0) - .02, 0], 1);
  for (let i = 0; i < 4; i++) { const a = (i + .5) / 4 * TAU; k.push([0, top(0, 0), 0], 0); sitSpot(k, [Math.cos(a) * 1.0, .45, Math.sin(a) * 1.0], Math.cos(a), Math.sin(a)); k.pop(); }
  const used = [[0, 0, 1.15]], ok = (x, z, m) => F.roadD(x, z) >= .85 + m && used.every(q => Math.hypot(q[0] - x, q[1] - z) >= q[2] + m), use = (x, z, m) => used.push([x, z, m]);
  let lamps = 0;
  openDirs(F, 3).forEach(({ a, clr }, gi) => {
    const job = ['brunnen', 'maibaum', 'litfass'][gi];
    if (job === 'brunnen') { const [x, z] = polar(a, 2.45); if (ok(x, z, .9)) { use(x, z, .9); smallFountain(k, r, [x, top(x, z), z]); k.spot('fountain', [x, top(x, z) + .4, z]); for (let i = 0; i < 3; i++) { const [px, pz] = polar(a, 1.45 + r.R(0, .2), r.R(-.9, .9)); if (ok(px, pz, .05)) pigeon(k, [px, top(px, pz), pz], r.R(0, TAU)); } } }
    if (job === 'maibaum') { const [x, z] = polar(a, Math.max(3.05, clearR(clr, .45)), clr > 1 ? -.5 : 0); if (ok(x, z, .45)) { use(x, z, .5); maypole(k, r, [x, top(x, z), z], Math.atan2(z, x)); } }
    if (job === 'litfass') { const [x, z] = polar(a, Math.max(2.9, clearR(clr, .5)), clr > 1 ? .7 : 0); if (ok(x, z, .55)) { use(x, z, .55); litfass(k, r, [x, top(x, z), z]); } }
    if (gi > 0 && clr > 1) { const [x, z] = polar(a, 2.5, gi === 1 ? .75 : -.75); if (ok(x, z, .5)) { use(x, z, .75); k.push([x, top(x, z), z], PI - a); parkBench(k, [0, 0, 0], 0, 1.45); sitSpot(k, [.05, .45, 0], 1, 0); k.pop(); } }
    if (clr > 1) { const [lx, lz] = polar(a, 3.25, gi === 2 ? -1.5 : 1.5); if (ok(lx, lz, .25)) { use(lx, lz, .3); streetLamp(k, [lx, top(lx, lz), lz], 2.7); lamps++; } }
    const [px, pz] = polar(a, 3.3, gi === 2 ? .2 : -1.4); if (clr > 1 && gi !== 1 && ok(px, pz, .35)) { use(px, pz, .35); k.push([px, top(px, pz), pz], 0); pot(k, r, [0, 0, 0], 1.6, true); k.pop(); }
  });
  for (let i = 0; i < 12 && lamps < 2; i++) { const [lx, lz] = polar(i * PI / 6, 3.3); if (ok(lx, lz, .3)) { use(lx, lz, .4); streetLamp(k, [lx, top(lx, lz), lz], 2.7); lamps++; } }
  // Rand: Blumen, Gras, ein Busch außerhalb des Pflasters
  const taken = [[0, 0, RP + .3]];
  meadowOut(k, F, RP + .25, .8);
  scatter(k, F, 3, .5, (x, y, z) => N.bush(k, [x, y, z], .8, k.rand() < .4 ? 0xe85a8a : 0), 20, taken);
}

// =====================================================================================================
// Blockhütte: Rundstämme mit Eckverkämmung, Schindeldach, Veranda mit Schaukelstuhl, Holzstapel, Axt, Schornstein
// =====================================================================================================
function rockingChair(k, r) {
  const c = 0x7a5232, c2 = 0x6a4428;
  for (const s of [-1, 1]) {
    k.add(ARC(10, .07, 1.2), C(c2), [0, 1.2, s * .24], [1.2, 1.2, .6], { r: [0, 0, -PI / 2 - .6], ao: false });   // Kufe
    B(k, c, .12, .17, .03, .45, s * .24 - .025, s * .24 + .025); B(k, c, -.2, -.15, .03, 1.05, s * .24 - .025, s * .24 + .025);
    B(k, c, -.18, .22, .62, .66, s * .24 - .035, s * .24 + .035); k.ball(c, [.22, .64, s * .24], .035, NO);
    B(k, c, .17, .2, .45, .63, s * .24 - .015, s * .24 + .015);
  }
  for (let i = 0; i < 4; i++) B(k, C(HOLZ_H, r.R(.9, 1.1)), -.18 + i * .095, -.1 + i * .095, .44, .47, -.26, .26);
  for (let i = 0; i < 5; i++) k.box(C(c, 1.05), [-.18, .5, -.16 + i * .08], [.03, .5, .035], { r: [0, 0, .12] });
  k.box(c, [-.23, .98, 0], [.05, .08, .56], { r: [0, 0, .12] }); k.box(c, [-.15, .46, 0], [.04, .05, .5]);
  B(k, 0xa83a2a, -.12, .1, .47, .5, -.2, .2, NO); k.box(0xc85a3a, [-.16, .6, 0], [.06, .3, .34], { r: [0, 0, .12], ao: false });   // Kissen
  k.box(0xd8c8a0, [-.05, .5, .05], [.25, .05, .3], { r: [0, .4, .05], ao: false });                                                // Decke
}
function logWall(k, r, s, a, b, y0, n, offs, holes, col) {
  const L = s === 'F' || s === 'K' ? b : a, ext = .32, rr = .13;
  onWall(k, s, a, b, () => {
    k.push([0, 0, -.06], 0); wallPieces(k, 0xbfb49a, -L + .05, L - .05, y0, y0 + offs + n * .24 - .02, .14, holes, r); k.pop();   // Lehmfugen
    for (let j = 0; j < n; j++) {
      const y = y0 + offs + rr + j * .24, c = C(col, r.R(.82, 1.12)), segs = [[-L - ext - r.R(0, .05), L + ext + r.R(0, .05)]];
      for (const h of holes) if (y > h.lo - rr * .3 && y < h.hi + rr * .3) for (let i = segs.length - 1; i >= 0; i--) { const [u0, u1] = segs[i]; if (h.a < u1 && h.b > u0) segs.splice(i, 1, ...[[u0, h.a], [h.b, u1]].filter(q => q[1] - q[0] > .05)); }
      for (const [u0, u1] of segs) {
        tube(k, c, [u0, y, -rr], [u1, y, -rr], rr * r.R(.94, 1.05), 7, { jit: .08 });
        for (const [ue, sg] of [[u0, -1], [u1, 1]]) if (Math.abs(ue) > L) {
          k.add(DISC(7), C(0xc8a878, r.R(.88, 1.05)), [ue + sg * .002, y, -rr], [rr * .97, 1, rr * .97], { r: [0, 0, -sg * PI / 2], ao: false });
          k.add(DISC(7), C(0xa8865a, 1), [ue + sg * .004, y, -rr], [rr * .5, 1, rr * .5], { r: [0, 0, -sg * PI / 2], ao: false });
        }
      }
      if (r.p(.12)) k.ball(C(MOOS, r.R(.85, 1.1)), [r.R(-L, L), y + rr * .7, -.04], [.12, .02, .04], { tag: TAG.grass, ao: false });
    }
    for (const h of holes) {                                                                                   // Bohlenzarge
      const c = C(HOLZ_A, 1.05);
      B(k, c, h.a - .07, h.a, h.lo - (h.door ? 0 : .06), h.hi + .06, -.26, .02); B(k, c, h.b, h.b + .07, h.lo - (h.door ? 0 : .06), h.hi + .06, -.26, .02);
      B(k, c, h.a - .07, h.b + .07, h.hi, h.hi + .08, -.26, .02); if (!h.door) B(k, c, h.a - .07, h.b + .07, h.lo - .06, h.lo, -.26, .03);
    }
  });
}
export function tile_huette(k, F, ctx) {
  const r = RNG(ctx.seed, 'huette'), ry = rot(firstEdge(ctx.E, 'r'));
  const a = 1.55, b = 2.05, y0 = .32, nC = 11, Ye = y0 + nC * .24, th = .56, col = r.pick([0x8a6440, 0x7a5a3a, 0x94704a]);
  const S = { frame: 0xe8dcc0, sill: HOLZ_A, laden: r.pick([0x3f7a4a, 0x9b3b31, 0x3a5f90]), gardine: r.pick([0xd88a7a, 0xf0e4d0, 0xa8c4d8, 0xd8c070]), tuer: 0x6a4428, zarge: HOLZ_A, kasten: HOLZ_A };
  site(k, F, 0, 0, 3.2, ry, G => {
    plinth(k, r, a + .02, b + .02, y0);
    const FL = y0 + .1;
    const hF = [{ a: -1.55, b: -.95, lo: 1.15, hi: 1.95 }, { a: .95, b: 1.55, lo: 1.15, hi: 1.95 }, { a: -.45, b: .45, lo: FL, hi: 2.3, door: true }];
    const hK = [{ a: -.35, b: .35, lo: 1.15, hi: 1.95 }], hR = [{ a: -.6, b: 0, lo: 1.15, hi: 1.95 }], hL = [{ a: -.9, b: -.4, lo: 1.25, hi: 1.85 }];
    logWall(k, r, 'F', a, b, y0, nC, 0, hF, col); logWall(k, r, 'K', a, b, y0, nC, 0, hK, col);
    logWall(k, r, 'R', a, b, y0, nC, .12, hR, col); logWall(k, r, 'L', a, b, y0, nC, .12, hL, col);
    const rm = { vF: FL, vC: Ye - .1, depth: .85 };
    onWall(k, 'F', a, b, () => {
      for (const h of hF) if (!h.door) win(k, S, r, (h.a + h.b) / 2, h.lo, h.b - h.a, h.hi - h.lo, .26, { shutters: true, hinge: .07, box: true, room: { ...rm, items: ['lamp', r.pick(['tisch', 'regal', 'uhr'])] } });
      door(k, S, r, 0, FL, .9, 2.3 - FL, .26, { sill: false, glass: true });
      wallLamp(k, .72, 2.05, .3);
      B(k, 0xd8cbb0, -.2, .2, 2.38, 2.52, 0, .03); for (let i = 0; i < 3; i++) B(k, 0x5a3a24, -.15 + i * .1, -.09 + i * .1, 2.42, 2.48, .03, .035, NO);   // Namensbrett
      k.add(ARC(8, .12, PI), 0x8a8a8a, [0, 2.6, .04], [.12, .12, .12], { r: [0, 0, PI], ao: false });               // Hufeisen über der Tür
    });
    onWall(k, 'K', a, b, () => { const h = hK[0]; win(k, S, r, 0, h.lo, .7, .8, .26, { shutters: true, hinge: .07, room: { ...rm, items: ['bett', 'bild'] } }); });
    onWall(k, 'R', a, b, () => { const h = hR[0]; win(k, S, r, -.3, h.lo, .6, .8, .26, { room: { ...rm, items: ['regal', 'lamp'] } }); });
    onWall(k, 'L', a, b, () => { const h = hL[0]; win(k, S, r, -.65, h.lo, .5, .6, .26, { room: { ...rm, items: ['kommode'] } }); });
    // Giebel aus Brettern mit Fensterchen
    const aR = a, gw = { u: 0, W: .42, v0: Ye + .25, H: .45 };
    for (const s of 'RL') onWall(k, s, a, b - .13, () => { boardGable(k, r, HOLZ_G, aR + .02, Ye + .02, th, gw); win(k, { frame: 0xe8dcc0, sill: HOLZ_A }, r, 0, gw.v0, gw.W, gw.H, .05, { sill: false, curtain: false, room: { vF: Ye, vC: Ye + .9, depth: .6, items: ['lamp'], plain: true, tap: 0xa08a6a, floor: 0x7a5a3a, ceil: 0x6a5038 } }); });
    // Dach: vorne lang heruntergezogen über die Veranda
    const chim = { x: -.6, z: -1.1, w: .55 }, rc = r.pick([0x7a6a58, 0x6e5e4e, 0x84705a]);
    roof(k, r, aR, b, Ye, th, .42, .5, { kind: 'schindel', col: rc, chim, sides: [-1], unter: 0x8a6a4a });
    const R2 = roof(k, r, aR, b, Ye, th, 1.4, .5, { kind: 'schindel', col: rc, sides: [1], unter: 0x8a6a4a, noRidge: true });
    const st = chimney(k, r, chim.x, chim.z, chim.w, Ye + (aR - Math.abs(chim.x) - chim.w / 2) * Math.tan(th), R2.yA + .8, STEIN, .2);
    k.spot('smoke', [chim.x, st, chim.z]);
    // Veranda
    const vx0 = a + .02, vx1 = a + 1.2, vy = FL - .02, eaveY = Ye - 1.4 * Math.tan(th);
    for (const z of [-b - .05, -.55, .55, b + .05]) for (const x of [vx0 + .1, vx1 - .08]) { k.cyl(HOLZ_A, [x, G.h(x, z) - .25, z], .07, vy - G.h(x, z) + .2, 6); }
    for (const z of [-b - .05, b + .05]) B(k, HOLZ_A, vx0, vx1, vy - .2, vy - .05, z - .06, z + .06);
    B(k, HOLZ_A, vx1 - .14, vx1 - .02, vy - .2, vy - .05, -b - .05, b + .05);
    for (let z = -b - .1, i = 0; z < b + .1; z += .155, i++) B(k, C(0x9a7a52, r.R(.82, 1.08)), vx0, vx1 + r.R(-.02, .02), vy - .05, vy, z, Math.min(b + .12, z + .14), { jit: .06 });
    for (const z of [-b, -.62, .62, b]) { const x = vx1 - .1, yt = eaveY - .05; k.cyl(C(HOLZ_A, r.R(.95, 1.05)), [x, vy, z], .075, yt - vy, 7); B(k, HOLZ_A, x - .07, x + .07, yt - .08, yt + .02, z - .25, z + .25); k.beam(HOLZ_A, [x, yt - .45, z], [x - .4, yt - .02 + .4 * Math.tan(th) * .0, z], .06); }
    B(k, HOLZ_D, vx1 - .2, vx1, eaveY - .1, eaveY, -b - .2, b + .2);
    // Geländer mit Sprossen (ohne Treppe in der Mitte)
    for (const [z0, z1] of [[-b, -.62], [.62, b]]) {
      B(k, C(HOLZ_H, .95), vx1 - .14, vx1 - .04, vy + .85, vy + .9, z0, z1); B(k, HOLZ_A, vx1 - .12, vx1 - .06, vy + .1, vy + .14, z0, z1);
      for (let z = z0 + .14; z < z1 - .08; z += .14) B(k, C(HOLZ_H, r.R(.85, 1.05)), vx1 - .11, vx1 - .07, vy + .14, vy + .85, z - .02, z + .02);
    }
    for (const s of [-1, 1]) { const z = s * b; B(k, C(HOLZ_H, .95), vx0 + .1, vx1 - .1, vy + .85, vy + .9, z - .03, z + .03); for (let x = vx0 + .2; x < vx1 - .15; x += .14) B(k, C(HOLZ_H, r.R(.85, 1.05)), x - .02, x + .02, vy + .1, vy + .85, z - .02, z + .02); }
    // Treppe
    for (let i = 0; i < 2; i++) { const yy = vy - (i + 1) * (vy / 3), x0 = vx1 + i * .28; B(k, C(0x8a6a48, r.R(.9, 1.05)), x0, x0 + .3, Math.min(-.2, G.h(x0 + .2, 0) - .1), yy + .02, -.6, .6, { jit: .06 }); B(k, C(0x9a7a52, r.R(.9, 1.1)), x0, x0 + .32, yy - .02, yy + .03, -.62, .62, NO); }
    // Schaukelstuhl (schaukelt), Bank, Tischchen, Kram
    k.part('rocker', [vx0 + .55, vy, 1.35], s => rockingChair(s, r), { swing: [0, 0, 1], amp: .07, speed: 1.3 });
    woodBench(k, [vx0 + .32, vy, -1.3], 0, 1.1, 0x7a5232); sitSpot(k, [vx0 + .42, vy + .45, -1.3], 1, 0);
    B(k, 0x6a4428, vx0 + .55, vx0 + .95, vy + .5, vy + .54, .7, 1.0); for (const [x, z] of [[vx0 + .58, .73], [vx0 + .92, .73], [vx0 + .58, .97], [vx0 + .92, .97]]) B(k, 0x5a3a20, x - .02, x + .02, vy, vy + .5, z - .02, z + .02);
    k.cyl(0xe8e0d0, [vx0 + .7, vy + .54, .85], .045, .1, 7, NO); k.add(ARC(6, .2, PI), 0xe8e0d0, [vx0 + .75, vy + .6, .85], [.03, .03, .03], { r: [0, 0, -PI / 2], ao: false });
    bucket(k, [vx0 + .3, vy, -1.95], .85, true);
    for (const s of [-1, 1]) k.ball(0x3a2a20, [vx0 + .18, vy + .06, .45 + s * .07], [.12, .06, .045], NO);   // Stiefel
    for (const s of [-1, 1]) { k.box(0x3a2a20, [vx0 + .12, vy, .45 + s * .07], [.06, .25, .07], NO); }
    pot(k, r, [vx1 - .25, vy, -.8], .8); pot(k, r, [vx1 - .25, vy, .8], .7);
    // Holzstapel rechts, Hackklotz mit Axt, Sägebock, Fass
    k.push([0, 0, b + .08], 0); woodpile(k, r, -1.15, .95, 0, 6, false); k.pop();
    G.on(1.2, 3.2, r.R(0, 3), () => choppingBlock(k, r, [0, 0, 0]));
    G.on(-.6, 3.35, .3, () => {
      for (const s of [-1, 1]) { k.beam(HOLZ_D, [s * .45, .75, -.25], [s * .45, -.05, .05], .06); k.beam(HOLZ_D, [s * .45, .75, .25], [s * .45, -.05, -.05], .06); }
      tube(k, C(col, 1.05), [-.75, .78, 0], [.75, .78, 0], .13, 7); k.add(DISC(7), 0xc8a878, [.752, .78, 0], [.125, 1, .125], { r: [0, 0, -PI / 2], ao: false });
      B(k, 0x9a9aa0, .2, .23, .75, 1.05, -.2, .2, NO); B(k, HOLZ_D, .19, .24, 1.0, 1.08, -.25, .25, NO);
    });
    barrel(k, [-a - .45, G.h(-a - .45, b - .2), b - .2], .8, 0x6a4a30); k.cyl(0x2a3a44, [-a - .45, G.h(-a - .45, b - .2) + .68, b - .2], .2, .01, 10, { layer: 'water', ao: false });
    G.on(-2.3, -1.2, .4, () => { for (const [x, y] of [[-.13, .1], [.13, .1], [0, .31]]) { tube(k, C(col, r.R(.9, 1.05)), [x, y, -.9], [x, y, .9], .12, 7); for (const zz of [-.9, .9]) { k.add(DISC(7), 0xc8a878, [x, y, zz + Math.sign(zz) * .002], [.115, 1, .115], { r: [Math.sign(zz) * PI / 2, 0, 0], ao: false }); k.add(DISC(7), 0xa8865a, [x, y, zz + Math.sign(zz) * .004], [.05, 1, .05], { r: [Math.sign(zz) * PI / 2, 0, 0], ao: false }); } } });
    k.spot('door', [a + 1.9, 0, 0]);
  });
  const taken = [[0, 0, 3.8]];
  scatter(k, F, 2, 1.3, (x, y, z) => N.pine(k, [x, y, z], k.R(.75, .95)), 30, taken);
  scatter(k, F, 3, .5, (x, y, z) => N.fern(k, [x, y, z], k.R(.9, 1.3)), 20, taken);
  scatter(k, F, 4, .1, (x, y, z) => N.mushroom(k, [x, y, z], k.rand() < .5), 20, taken);
  meadowOut(k, F, 3.5, .7);
}

// =====================================================================================================
// Häuserzeile: drei schmale Stadthäuser Wand an Wand, Läden unten (Schaufenster, Markise, Schild), Wohnungen oben
// =====================================================================================================
// Balkon im Wandrahmen: Platte auf Höhe v, Breite W, Tiefe D, Geländer, Blumenkästen
function balcony(k, r, u, v, W, D, col = EISEN) {
  B(k, C(0xb8b0a0), u - W / 2, u + W / 2, v - .12, v, 0, D, { jit: .04 }); B(k, C(0xa8a090), u - W / 2 - .02, u + W / 2 + .02, v - .15, v - .1, D - .04, D + .02, NO);
  for (const s of [-1, 1]) { k.beam(C(0xb0a898), [u + s * (W / 2 - .12), v - .5, .02], [u + s * (W / 2 - .12), v - .12, D - .1], .08, { w: .08, d: .08 }); }   // Konsolen
  const H = .85, yt = v + H;
  B(k, col, u - W / 2, u + W / 2, yt - .03, yt, D - .05, D - .01, NO); B(k, col, u - W / 2, u + W / 2, v + .08, v + .1, D - .045, D - .015, NO);
  for (const s of [-1, 1]) { const x = u + s * (W / 2 - .01); B(k, col, x - .012, x + .012, yt - .03, yt, 0, D, NO); B(k, col, x - .01, x + .01, v + .08, v + .1, 0, D - .03, NO); for (let z = .1; z < D - .06; z += .1) B(k, col, x - .008, x + .008, v + .1, yt - .03, z - .008, z + .008, NO); B(k, col, x - .015, x + .015, v, yt, D - .05, D - .01, NO); }
  for (let x = u - W / 2 + .12; x < u + W / 2 - .05; x += .13) { B(k, col, x - .008, x + .008, v + .1, yt - .03, D - .035, D - .025, NO); if (Math.round((x - u) / .1) % 3 === 0) k.add(TORUS(6, .2, 3), col, [x + .05, v + .55, D - .03], [.04, .06, .04], { ao: false }); }
  flowerBox(k, r, u, yt - .02, W - .3, TON); k.push([0, 0, D - .26], 0); k.pop();
}
// Markise im Wandrahmen: von (v1, w=0) nach (v0, w=D), Breite W
function awning(k, r, u, v1, v0, W, D, cols) {
  const sl = Math.hypot(D, v1 - v0), ang = Math.atan2(v1 - v0, D), n = Math.max(4, Math.round(W / .22));
  k.push([u, v1, 0], 0);
  k.pushM(new THREE.Matrix4().makeRotationX(ang));
  for (let i = 0; i < n; i++) B(k, C(cols[i % 2], r.R(.95, 1.03)), -W / 2 + i * W / n, -W / 2 + (i + 1) * W / n + .002, -.015, .015, 0, sl, { ao: false, jit: .02 });
  k.pop();
  for (let i = 0; i < n; i++) { const x = -W / 2 + (i + .5) * W / n; B(k, C(cols[i % 2], .95), x - W / n / 2, x + W / n / 2, -(v1 - v0) - .16, -(v1 - v0), D - .005, D + .01, { ao: false, sway: .1 }); k.prism(C(cols[i % 2], .95), [x, -(v1 - v0) - .16, D], W / n, .07, .012, { r: [PI, 0, 0], ao: false, sway: .1 }); }
  B(k, EISEN, -W / 2 - .02, W / 2 + .02, -.03, .03, -.02, .06, NO);                                           // Kasten
  for (const s of [-1, 1]) tube(k, EISEN, [s * (W / 2 - .05), -(v1 - v0) - .45, .01], [s * (W / 2 - .05), -(v1 - v0) + .01, D - .02], .012, 4, NO);
  k.pop();
}
// Ladeninhalt hinter dem Schaufenster
function shopFill(kind, r) {
  return (k, u0, u1, vF, w1, w0) => {
    const W = u1 - u0, um = (u0 + u1) / 2;
    B(k, 0x5a3a24, u0 + .05, u1 - .05, vF, vF + .45, w0 - .45, w0 - .05, NO); B(k, 0xe8dcc0, u0 + .03, u1 - .03, vF + .45, vF + .48, w0 - .47, w0 - .03, NO);   // Auslage
    for (const yy of [vF + 1.1, vF + 1.65]) B(k, 0x6a4a30, u0 + .1, u1 - .1, yy - .03, yy, w1, w1 + .3, NO);                                                    // Regale
    const ty = vF + .48, items = Math.round(W / .32);
    for (let i = 0; i < items; i++) {
      const x = u0 + .2 + i * (W - .4) / Math.max(1, items - 1), z = w0 - .25 + r.R(-.08, .08);
      if (kind === 'hut') { const c = C(r.pick([0x2a2a2a, 0x8a3a2a, 0x3a4a6a, 0xc8b080, 0x5a7a3a]), r.R(.9, 1.1)); B(k, 0xc8c0b0, x - .01, x + .01, ty, ty + .25, z - .01, z + .01, NO); k.cyl(c, [x, ty + .25, z], .14, .03, 8, NO); k.cyl(c, [x, ty + .27, z], .085, .13, 8, { top: .9, ao: false }); B(k, 0xd8302a, x - .09, x + .09, ty + .3, ty + .32, z - .09, z + .09, NO); }
      else if (kind === 'buch') { for (let j = 0; j < 3; j++) B(k, C(r.pick(BUCH), r.R(.9, 1.1)), x - .09, x + .09, ty + j * .04, ty + j * .04 + .035, z - .07 + j * .01, z + .06 + j * .01, NO); k.box(C(r.pick(BUCH)), [x, ty + .12, z + .05], [.15, .22, .03], { r: [-.25, 0, 0], ao: false }); }
      else if (kind === 'gemuese') { B(k, HOLZ_H, x - .11, x + .11, ty, ty + .1, z - .1, z + .1, NO); const fc = r.pick([[0xd83a2a], [0xf28a2a], [0x8ac83a], [0xe8d040], [0x6a3a8a]]); for (let j = 0; j < 4; j++) k.ball(fc[0], [x + r.R(-.06, .06), ty + .12, z + r.R(-.06, .06)], .045, NO); }
      else if (kind === 'spiel') { const c = r.pick([0xd83a2a, 0x3a6ad8, 0xf2c43a, 0x3a9a5a]); if (i % 2) { k.ball(c, [x, ty + .09, z], .09, NO); B(k, 0xffffff, x - .09, x + .09, ty + .085, ty + .095, z - .005, z + .005, NO); } else { B(k, c, x - .07, x + .07, ty, ty + .1, z - .05, z + .05, NO); B(k, C(c, .7), x - .04, x + .04, ty + .1, ty + .17, z - .04, z + .04, NO); k.cyl(0x2a2a2a, [x - .05, ty + .03, z + .05], .03, .02, 6, { r: [PI / 2, 0, 0], ao: false }); k.cyl(0x2a2a2a, [x + .05, ty + .03, z + .05], .03, .02, 6, { r: [PI / 2, 0, 0], ao: false }); } }
      else { const c = r.pick([0xc8e0f0, 0xe0c8a0, 0xa8d0a8, 0xe8b8c8]); k.cyl(c, [x, ty, z], .06, .18, 7, { ao: false }); k.cyl(0xe8e0d0, [x, ty + .18, z], .045, .05, 7, NO); }
    }
    for (const yy of [vF + 1.1, vF + 1.65]) for (let x = u0 + .15; x < u1 - .15; x += r.R(.17, .28)) { const c = C(r.pick(kind === 'buch' ? BUCH : [0xc8b080, 0xe8e0d0, 0x8a5a3a, 0x3a6a8a, 0xb84a3a, 0x5a8a4a]), r.R(.85, 1.1)); B(k, c, x, x + .08, yy, yy + r.R(.12, .26), w1 + .03, w1 + .25, NO); }
    roomLamp(k, um, vF + 2.25, w1 + .5, 0xf0e8d0);
    B(k, 0x5a3a24, um + W * .2, um + W * .2 + .6, vF, vF + .9, w1 + .25, w1 + .6, NO);                                          // Ladentisch
    k.box(0xc9a23a, [um + W * .2 + .45, vF + .9, w1 + .42], [.18, .12, .14], NO);                                             // Kasse
  };
}
// Ein Stadthaus (Hausrahmen: Front +x zur Straße, a = halbe Tiefe, b = halbe Breite). Gibt Türpunkt (lokal) zurück
function townHouse(k, r, P) {
  const { a, b, floors, gable } = P, t = .22, FL = .32, G0 = 3.0, FH = 2.45, Ye = G0 + floors * FH, S = P.S;
  const pz = MIX(P.putz, 0xffffff, .2), dz = .0;
  // Erdgeschoss: Ladenfront über die ganze Breite (Glastür + Schaufenster)
  const sfW = 2 * b - .34, sfH = 2.2, doorW = .74, dL = P.doorLeft ? 1 : -1, doorU = dL * (sfW / 2 - doorW / 2), shopU = doorU - dL * (sfW / 2), shopW = sfW - doorW - .06, winU = -dL * (sfW / 2 - shopW / 2);
  const open = { F: [{ u: 0, v0: FL, W: sfW, H: sfH, shop: true }], K: [], R: [], L: [] };
  for (let f = 0; f < floors; f++) {
    const v = G0 + f * FH;
    if (f === 0 && P.balcony) open.F.push({ u: 0, v0: v + .05, W: .9, H: 2.0, french: true, f });
    else for (const s of [-1, 1]) open.F.push({ u: s * (b - .55) * .82, v0: v + .75, W: .62, H: 1.15, f });
    open.K.push({ u: r.R(-.25, .25), v0: v + .8, W: .6, H: 1.05, f });
    if (P.endL) open.L.push({ u: .2, v0: v + .8, W: .55, H: 1.0, f });
    if (P.endR) open.R.push({ u: -.2, v0: v + .8, W: .55, H: 1.0, f });
  }
  open.K.push({ u: -b * .4, v0: FL + .9, W: .6, H: .9 });
  for (const s of 'FKRL') {
    const len = wallLen(s, a, b, t), wins = open[s];
    const holes = wins.map(w => ({ a: w.u - w.W / 2, b: w.u + w.W / 2, lo: w.v0, hi: w.v0 + w.H }));
    onWall(k, s, a, b, () => {
      // EG mit Steinputz/Quaderung, darüber Farbputz
      wallPieces(k, s === 'F' ? MIX(P.putz, 0x9a9488, .55) : MIX(P.putz, 0x9a9488, .25), -len, len, FL, G0, t, holes.filter(h => h.lo < G0), r, { band: .25 });
      wallPieces(k, P.putz, -len, len, G0, Ye, t, holes.filter(h => h.lo >= G0), r);
      if (s === 'F' || (s === 'L' && P.endL) || (s === 'R' && P.endR)) weather(k, P.putz, r, -len, len, G0, Ye, wins.filter(w => !w.shop && !w.door).map(w => ({ ...w })));
      if (s === 'F') {
        for (let yy = FL + .5; yy < G0 - .1; yy += .5) B(k, C(MIX(P.putz, 0x9a9488, .65), .95), -len, len, yy - .02, yy + .01, -.01, .012, NO);   // Quaderfugen EG
        B(k, C(0xc8c0b0), -len - .02, len + .02, G0 - .06, G0 + .1, 0, .12, { jit: .03 });                                                      // Gurtgesims
        for (let f = 1; f < floors; f++) B(k, C(MIX(P.putz, 0xffffff, .5)), -len, len, G0 + f * FH - .04, G0 + f * FH + .06, 0, .07, NO);
        B(k, C(0xb8b0a0), -len - .02, len + .02, Ye - .14, Ye, 0, .14, { jit: .03 });                                                          // Traufgesims
        for (const sx of [-1, 1]) if ((sx < 0 ? P.endR : P.endL) || P.gable === 'stufen') for (let yy = G0 + .1, i = 0; yy < Ye - .3; yy += .32, i++) B(k, C(MIX(P.putz, 0xffffff, .55), r.R(.95, 1.03)), sx * len - (sx > 0 ? (i % 2 ? .32 : .22) : -(i % 2 ? .32 : .22)), sx * len, yy, yy + .27, 0, .025, NO);   // Eckquader
      }
    });
  }
  plinth(k, r, a, b, FL, 'FK');
  // Öffnungen füllen
  onWall(k, 'F', a, b, () => {
    // Ladenfront: Pfosten, Schaufenster mit Brüstung, Glastür, Oberlicht
    const fc = P.ladenC, x0 = -sfW / 2, x1 = sfW / 2, y1 = FL + sfH, sv0 = FL + .48, mU = doorU - dL * (doorW / 2 + .03);
    for (const xx of [x0, x1, mU]) B(k, fc, xx - .06, xx + .06, FL, y1 + .02, -.1, .05);
    B(k, fc, x0 - .06, x1 + .06, y1, y1 + .1, -.1, .06); B(k, C(fc, 1.1), x0 - .08, x1 + .08, y1 + .1, y1 + .14, -.1, .09, NO);
    const wx0 = Math.min(winU - shopW / 2, winU + shopW / 2), wx1 = wx0 + shopW;
    B(k, C(fc, .85), wx0, wx1, FL, sv0, -.06, .03); B(k, C(fc, 1.1), wx0 + .08, wx1 - .08, FL + .08, sv0 - .08, .03, .045, NO); B(k, C(fc, 1.05), wx0 - .02, wx1 + .02, sv0 - .04, sv0, -.12, .08, NO);
    B(k, fc, wx0, wx1, y1 - .42, y1 - .38, -.1, -.03); if (shopW > .7) B(k, fc, winU - .022, winU + .022, sv0, y1 - .4, -.1, -.03);
    const shopWin = k.winVal();                                                                    // Laden: Schaufenster, Tür und Raum gemeinsam
    PL(k, GLAS, [winU, (sv0 + y1) / 2, -.07], shopW, y1 - sv0, [0, 0, 0], { layer: 'glass', jit: 0, win: shopWin + 1 });
    // Glastür (leicht zurückgesetzt) mit Oberlicht
    const dx0 = doorU - doorW / 2 + .03, dx1 = doorU + doorW / 2 - .03, dy1 = y1 - .45;
    B(k, C(P.tuerC, .5), dx0, dx1, FL, y1, -.2, -.19, NO);
    for (const xx of [dx0, dx1 - .09]) B(k, P.tuerC, xx, xx + .09, FL, dy1, -.17, -.12); B(k, P.tuerC, dx0, dx1, FL, FL + .35, -.17, -.12); B(k, P.tuerC, dx0, dx1, dy1 - .09, dy1, -.17, -.12);
    B(k, P.tuerC, dx0, dx1, dy1, dy1 + .05, -.15, -.08);
    PL(k, GLAS, [doorU, (FL + .35 + dy1 - .09) / 2, -.145], dx1 - dx0 - .18, dy1 - .09 - FL - .35, [0, 0, 0], { layer: 'glass', jit: 0, win: shopWin + 1 });
    PL(k, GLAS, [doorU, (dy1 + .05 + y1) / 2, -.1], dx1 - dx0, y1 - dy1 - .05, [0, 0, 0], { layer: 'glass', jit: 0, win: shopWin + 1 });
    B(k, MESSING, doorU + dL * -.0 - .01 + (dx1 - dx0) * .3 * -dL, doorU + .01 + (dx1 - dx0) * .3 * -dL, FL + .8, FL + 1.25, -.12, -.1, NO);   // Griffstange
    B(k, MESSING, dx0 + .1, dx1 - .1, FL + .18, FL + .22, -.12, -.115, NO);
    k.add(TORUS(6, .25, 3), MESSING, [doorU, y1 - .2, -.06], [.05, .05, .05], NO); B(k, MESSING, doorU - .003, doorU + .003, y1 - .17, y1 + .02, -.07, -.05, NO);   // Ladenglocke
    B(k, 0x9a958c, x0 - .1, x1 + .1, FL - .16, FL - .01, -.02, .32, { jit: .05 });                                                      // Stufe
    k.mark({ win: shopWin, tag: TAG.room }, () => room(k, r, 0, sfW - .5, t, FL + .03, G0 - .1, 1.25, { fill: shopFill(P.shop, r), tap: MIX(P.putz, 0xffffff, .3), floor: 0x7a5a3a }));
    // Ladenschild und Markise
    const sy = y1 + .17; B(k, C(P.schildC, .8), x0 - .02, x1 + .02, sy, sy + .36, 0, .06); B(k, P.schildC, x0 + .03, x1 - .03, sy + .03, sy + .33, .06, .075, NO);
    let lx = x0 + .14; const lc = P.schildC === 0xf2ead8 ? 0x2a2a2a : 0xe8c050; while (lx < x1 - .22) { const lw = r.R(.07, .13); B(k, lc, lx, lx + lw, sy + .1, sy + .26, .075, .085, NO); lx += lw + (r.p(.2) ? .12 : .04); }
    awning(k, r, winU, y1 + .1, y1 - .38, shopW + .16, .95, P.markise);
    B(k, 0xc9a23a, mU - .06, mU + .06, y1 - .7, y1 - .6, .05, .065, NO);                                                                  // Hausnummer
    // Obergeschosse
    for (const w of open.F) {
      if (w.shop || w.door) continue;
      const rm = { vF: G0 + w.f * FH + .03, vC: G0 + (w.f + 1) * FH - .12, depth: .85 };
      if (w.french) { win(k, S, r, w.u, w.v0, w.W, w.H, t, { rows: 2, sill: false, room: { ...rm, items: ['lamp', r.pick(['tisch', 'kommode', 'pflanze'])] } }); balcony(k, r, w.u, w.v0, w.W + .5, .6, P.gitter); }
      else { win(k, S, r, w.u, w.v0, w.W, w.H, t, { shutters: P.shutters && w.f === floors - 1, hinge: .05, box: r.p(.6), rows: 1, room: { ...rm } }); B(k, C(MIX(P.putz, 0xffffff, .5)), w.u - w.W / 2 - .06, w.u + w.W / 2 + .06, w.v0 + w.H + .02, w.v0 + w.H + .12, 0, .06, NO); }
    }
  });
  for (const s of 'KRL') onWall(k, s, a, b, () => { for (const w of open[s]) { const rm = w.f == null ? { vF: FL + .05, vC: G0 - .1, depth: .8 } : { vF: G0 + w.f * FH + .03, vC: G0 + (w.f + 1) * FH - .12, depth: .8 }; win(k, S, r, w.u, w.v0, w.W, w.H, t, { shutters: s !== 'K' && P.shutters, box: s === 'K' && r.p(.4), curtain: s !== 'K' || r.p(.5), room: { ...rm, items: r.pick([['lamp', 'bett'], ['lamp'], ['bild', 'lamp'], ['pflanze']]) } }); } });
  // Dach
  const th = P.pitch, chim = P.chim;
  if (gable === 'eave') {
    const R = roof(k, r, a, b, Ye, th, .35, .03, { col: P.dach, kind: P.dachArt, chim });
    for (const s of 'RL') onWall(k, s, a, b, () => gableWall(k, P.putz, a, Ye, th, t));
    // Zwerchhaus über der Mitte (Giebel zur Straße)
    const dw = .7, dy = Ye - .1, dx = a - .05, dh = .95;
    k.in([dx - .55, 0, 0], 0, () => {
      for (const sz of [-1, 1]) B(k, P.putz, -.55, .55, dy, dy + dh, sz * dw - .1 * (sz > 0), sz * dw + .1 * (sz < 0), { ao: false, jit: .02 });
      onWall(k, 'F', .55, dw, () => { wallPieces(k, P.putz, -dw, dw, dy, dy + dh, .1, [{ a: -.3, b: .3, lo: dy + .22, hi: dy + .84 }], r); win(k, S, r, 0, dy + .22, .6, .62, .1, { room: { vF: dy, vC: dy + dh, depth: .45, items: ['lamp'], plain: true } }); });
      k.in([0, 0, 0], PI / 2, () => { roof(k, r, dw, .55, dy + dh, .7, .12, .06, { col: P.dach, kind: P.dachArt, sT: .06 }); onWall(k, 'R', dw, .55, () => gableWall(k, P.putz, dw, dy + dh, .7, .05)); });
    });
    if (chim) k.spot('smoke', [chim.x, chimney(k, r, chim.x, chim.z, chim.w, Ye + (a - Math.abs(chim.x) - chim.w / 2) * Math.tan(th), R.yA + .5, undefined, .2), chim.z]);
  } else {
    k.in([0, 0, 0], PI / 2, () => {
      const R = roof(k, r, b, a, Ye, th, .1, gable === 'stufen' ? -.02 : .2, { col: P.dach, kind: P.dachArt, chim, sides: [1, -1] });
      if (gable === 'stufen') {
        for (const s of 'RL') onWall(k, s, b, a, () => {
          const n = 4, aR = b, dw = aR / (n + .6), dh = dw * Math.tan(th), cap = C(0xb8b0a0), hole = s === 'R' ? { a: -.28, b: .28, lo: Ye + .35, hi: Ye + 1.1 } : null;
          for (let i = 0; i <= n; i++) {
            const u = aR - i * dw, y0 = Ye + i * dh, yt = y0 + dh + (i === n ? .55 : .25);
            wallPieces(k, P.putz, -u, u, y0, yt, t, hole ? [hole] : [], r);
            if (i < n) for (const sx of [-1, 1]) { const ua = aR - (i + 1) * dw - .04, ub = u + .05; B(k, C(cap, r.R(.95, 1.04)), sx > 0 ? ua : -ub, sx > 0 ? ub : -ua, yt, yt + .07, -t - .04, .05, { jit: .03 }); }
            else { B(k, cap, -u - .05, u + .05, yt, yt + .09, -t - .04, .05, { jit: .03 }); k.ball(cap, [0, yt + .19, -.1], .1); }
          }
          if (hole) win(k, S, r, 0, hole.lo, .5, .55, t, { room: { vF: Ye + .02, vC: Ye + 1.3, depth: .5, items: ['lamp'], plain: true } });
        });
      } else {
        for (const s of 'RL') onWall(k, s, b, a, () => {
          gableWall(k, P.putz, b, Ye, th, t, s === 'R' ? { u: 0, W: .55, v0: Ye + .35, H: .75 } : null);
          if (s === 'R') { win(k, S, r, 0, Ye + .35, .55, .75, t, { room: { vF: Ye + .02, vC: Ye + 1.3, depth: .5, items: ['lamp'], plain: true } });
            const bc = C(P.balken); for (const sx of [-1, 1]) k.beam(bc, [sx * (b - .1), Ye + .05, .02], [0, Ye + b * Math.tan(th) - .05, .02], .1, { w: .12, d: .06 }); B(k, bc, -b, b, Ye, Ye + .12, -.02, .05);
            for (const sx of [-1, 1]) B(k, bc, sx * .38 - .06, sx * .38 + .06, Ye + .12, Ye + .12 + (b - .44) * Math.tan(th), -.02, .045); }
        });
      }
      if (chim) k.spot('smoke', [chim.x, chimney(k, r, chim.x, chim.z, chim.w, Ye + (b - Math.abs(chim.x) - chim.w / 2) * Math.tan(th), R.yA + .5, undefined, .2), chim.z]);
    });
  }
  return { door: [a + .75, 0, -doorU] };
}
export function tile_reihe(k, F, ctx) {
  const r = RNG(ctx.seed, 'reihe'), o = firstEdge(ctx.E, 'r'), ry = rot(o), c = Math.cos(ry), s = Math.sin(ry);
  const T = (lx, lz) => [lx * c + lz * s, -lx * s + lz * c];                         // Straßenrahmen → Kachel
  const zr = 2.65, [sx, sz] = T(0, zr);
  const ws = [1.9, 2.0, 1.9], tot = ws.reduce((p, q) => p + q, 0), D = 2.5;
  const SHOPS = ['hut', 'buch', 'gemuese', 'spiel', 'apo']; const sh0 = r.i(5);
  const puts = [...PUTZ].sort(() => r.f() - .5), gab = [['giebel', 'eave', 'stufen'], ['stufen', 'eave', 'giebel'], ['eave', 'giebel', 'stufen']][r.i(3)];
  const MK = [[0xd83a3a, 0xf4efe6], [0x2a6a4a, 0xf4efe6], [0x2a4a8a, 0xf2e8c8], [0xe8a83a, 0xf4efe6], [0x8a3a5a, 0xf2e8c8]];
  site(k, F, sx, sz, 3.1, ry, G => {
    // Gehweg mit Bordstein vor den Häusern (lokal z = −D/2 … −zr + .85)
    const zf = -D / 2 - .02, zc = -zr + .88;
    for (let x = -tot / 2 - .3; x < tot / 2 + .25; x += .46) {
      const h = Math.max(G.h(x + .23, (zf + zc) / 2), -.25);
      B(k, C(r.pick(PFLASTER), r.R(.9, 1.08)), x + .01, x + .45, h - .18, h + .05, zc + .02, zf, { jit: .05 });
      B(k, C(0xb8b2a6, r.R(.92, 1.04)), x + .005, x + .455, h - .2, h + .06, zc - .1, zc + .02, { jit: .04 });
    }
    let x0 = -tot / 2;
    ws.forEach((w, i) => {
      const xc = x0 + w / 2; x0 += w;
      const floors = [2, 1, 2][(i + r.i(2)) % 3] + (r.p(.25) ? 0 : 0), putz = puts[i];
      const P = {
        a: D / 2, b: w / 2, floors, gable: gab[i], putz, pitch: gab[i] === 'eave' ? .62 : .82, dach: r.pick(gab[i] === 'stufen' ? SCHIEFER : ZIEGEL), dachArt: gab[i] === 'stufen' ? 'schiefer' : 'ziegel',
        S: { frame: r.p(.6) ? 0xf2efe6 : MIX(r.pick(LADEN), 0xffffff, .3), sill: r.pick([0xc8c0b0, 0xa89a84, 0xe8e4dc]), laden: r.pick(LADEN), gardine: r.pick(GARDINE), kasten: r.pick([HOLZ, TON, 0x3a5a3a]) },
        ladenC: r.pick([0x2a4a3a, 0x3a2a24, 0x2a3a5a, 0x5a2a24, 0xe8e0d0]), schildC: r.pick([0x1e3a2a, 0x3a1e1e, 0x1e2a4a, 0xf2ead8]), tuerC: r.pick([0x5a3a24, 0x2a4a3a, 0x3a2a4a]), markise: MK[(i + r.i(5)) % 5],
        shop: SHOPS[(sh0 + i) % 5], balcony: i !== 1, shutters: r.p(.6), gitter: r.pick([EISEN, GUSS, 0x3a2a2a]), balken: r.pick(BALKEN), doorLeft: i === 2 ? true : i === 0 ? false : r.p(.5),
        endL: i === 0, endR: i === 2, chim: i !== 1 ? { x: gab[i] === 'eave' ? -.45 : (i === 0 ? .32 : -.32), z: gab[i] === 'eave' ? r.R(-.3, .3) : -.5, w: .42 } : null,
      };
      k.push([xc, 0, 0], PI / 2);
      const res = townHouse(k, r, P);
      k.spot('door', res.door);
      k.pop();
    });
    // Rückseite: Mülltonne, Fahrrad-Ständer, Blumen
    G.on(-1.6, D / 2 + .55, .1, () => { barrel(k, [0, 0, 0], .75, 0x5a6a5a); }, 'bldg');
    G.on(.9, D / 2 + .5, 0, () => { crate(k, [0, 0, 0], .2, .9, [0xd83a2a, 0x8ac83a]); crate(k, [.05, .33, 0], -.1, .85); });
  });
  // Gegenüber: Laternen, Bank, Baum, Blumenwagen, Tauben
  const opp = (lx, lz, rr, fn) => { const [x, z] = T(lx, lz); if (F.free(x, z, rr)) { fn(x, z); return true; } return false; };
  opp(-1.9, -1.25, .2, (x, z) => onG(k, F, x, z, 0, () => streetLamp(k, [0, 0, 0], 2.7)));
  opp(2.3, -1.25, .2, (x, z) => onG(k, F, x, z, 0, () => streetLamp(k, [0, 0, 0], 2.7)));
  opp(.2, -1.55, .5, (x, z) => onG(k, F, x, z, ry - PI / 2, () => { parkBench(k, [0, 0, 0], 0, 1.4); sitSpot(k, [.05, .45, 0], 1, 0); }));
  opp(3.0, -2.7, 1.0, (x, z) => onG(k, F, x, z, 0, () => N.leafTree(k, [0, 0, 0], .95)));
  opp(-2.4, -2.4, .7, (x, z) => onG(k, F, x, z, ry + .3, () => {
    for (const s2 of [-1, 1]) { k.cyl(EISEN, [-.2, .3, s2 * .4], .3, .05, 10, { r: [PI / 2, 0, 0], ao: false }); k.add(TORUS(10, .08, 3), 0x3a3a3a, [-.2, .3, s2 * .43], [.3, .3, .3], { ao: false }); }
    B(k, 0x3a6a4a, -.55, .55, .45, .52, -.38, .38); for (const s2 of [-1, 1]) B(k, 0x3a6a4a, -.55, .55, .52, .68, s2 * .38 - .02, s2 * .38 + .02);
    k.beam(HOLZ_D, [.55, .5, -.25], [1.0, .1, -.25], .04); k.beam(HOLZ_D, [.55, .5, .25], [1.0, .1, .25], .04);
    for (let i = 0; i < 6; i++) { const bx = -.4 + (i % 3) * .38, bz = (i < 3 ? -.18 : .18), fc = BLUME[i % BLUME.length]; k.cyl(ZINK, [bx, .52, bz], .12, .26, 8, { top: 1.15 }); for (let j = 0; j < 4; j++) { k.cyl(LAUB, [bx + k.R(-.06, .06), .7, bz + k.R(-.06, .06)], .01, .25, 3, NO); k.ball(fc, [bx + k.R(-.1, .1), .96 + k.R(0, .1), bz + k.R(-.1, .1)], .045, { tag: TAG.flower, ao: false }); } }
    B(k, 0xf2ead8, -.2, .2, .68, .92, -.4, -.39, NO);
  }));
  for (let i = 0; i < 3; i++) opp(-.6 + i * .5, -1.1 - i * .15, .05, (x, z) => pigeon(k, [x, F.h(x, z), z], k.R(0, TAU)));
  meadowOut(k, F, 0, .5);
}

// ---------------------------------------------------------------- gemeinsame Helfer für die Handwerkshäuser
// Fachwerk im Wandrahmen: Ständer, Schwelle, Rähm, Riegel, Streben. wins: [{a, b, lo, hi}]
function timber(k, col, r, U0, U1, v0, v1, wins) {
  const bw = .14, cc = () => C(col, r.R(.88, 1.1)), O = { jit: .06 };
  B(k, cc(), U0, U1, v0, v0 + bw, -.06, .045, O); B(k, cc(), U0, U1, v1 - bw, v1, -.06, .045, O);
  const posts = [U0 + bw / 2, U1 - bw / 2]; for (const w of wins) posts.push(w.a - bw / 2, w.b + bw / 2);
  posts.sort((a, b) => a - b); const all = [];
  for (let i = 0; i < posts.length; i++) { all.push(posts[i]); if (i < posts.length - 1) { const g = posts[i + 1] - posts[i]; if (g > 1.25) { const n = Math.ceil(g / 1.1) - 1; for (let j = 1; j <= n; j++) all.push(posts[i] + g * j / (n + 1)); } } }
  all.sort((a, b) => a - b);
  const p2 = all.filter((p, i) => i === 0 || p - all[i - 1] > .05);
  for (const p of p2) B(k, cc(), p - bw / 2, p + bw / 2, v0 + bw, v1 - bw, -.06, .04, O);
  const vm = (v0 + v1) / 2;
  for (let i = 0; i < p2.length - 1; i++) {
    const x0 = p2[i] + bw / 2, x1 = p2[i + 1] - bw / 2; if (x1 - x0 < .2) continue;
    const w = wins.find(q => q.a >= x0 - .02 && q.b <= x1 + .02);
    if (w) { B(k, cc(), x0, x1, w.lo - bw, w.lo, -.06, .035, O); B(k, cc(), x0, x1, w.hi, w.hi + bw, -.06, .035, O); if (w.lo - bw - v0 - bw > .3) { k.beam(cc(), [x0, v0 + bw, -.02], [x1, w.lo - bw, -.02], .1, { w: .1, d: .09, jit: .06 }); k.beam(cc(), [x1, v0 + bw, -.025], [x0, w.lo - bw, -.025], .1, { w: .1, d: .07, jit: .06 }); } continue; }
    B(k, cc(), x0, x1, vm - bw / 2, vm + bw / 2, -.06, .035, O);
    if (i === 0) k.beam(cc(), [x0, v0 + bw, -.02], [x1, v1 - bw, -.02], .1, { w: .12, d: .09, jit: .06 });
    else if (i === p2.length - 2) k.beam(cc(), [x1, v0 + bw, -.02], [x0, v1 - bw, -.02], .1, { w: .12, d: .09, jit: .06 });
    else { k.beam(cc(), [x0, v0 + bw, -.02], [x1, vm - bw / 2, -.02], .1, { w: .1, d: .09, jit: .06 }); k.beam(cc(), [x1, v0 + bw, -.025], [x0, vm - bw / 2, -.025], .1, { w: .1, d: .07, jit: .06 }); }
  }
}
// Brezel aus Rohrstücken in der xy-Ebene (Höhe ~ s)
function pretzel(k, p, s, col, o = {}) {
  const P = [[-.36, -.3], [-.18, -.02], [.2, .26], [.4, .56], [.24, .82], [0, .7], [-.24, .82], [-.4, .56], [-.2, .26], [.18, -.02], [.36, -.3]];
  const Q = P.map(([x, y]) => [p[0] + x * s, p[1] + y * s, p[2] + (Math.abs(x) < .21 && y > -.05 && y < .3 ? (x > 0 === y > .12 ? .03 : -.03) * s : 0)]);
  tubes(k, col, Q, .075 * s, 6, { ao: false, ...o });
  if (o.salt) for (let i = 0; i < 9; i++) { const j = 1 + Math.floor(i * (Q.length - 2) / 9); k.boxc(0xf4f0e6, [Q[j][0] + .02 * s, Q[j][1] + .05 * s, Q[j][2] + .05 * s], [.02 * s, .02 * s, .02 * s], { ao: false }); }   // Salz
}
// Hängeschild am Wandausleger (Wandrahmen, Wandpunkt u/v), drawFn(sub) zeichnet das Schild unter dem Drehpunkt
function hangSign(k, u, v, L, drawFn, name) {
  B(k, EISEN, u - .06, u + .06, v - .5, v + .06, 0, .03);
  k.beam(EISEN, [u, v, .02], [u, v, L + .05], .04, { w: .04, d: .04 }); k.beam(EISEN, [u, v - .45, .02], [u, v, L * .65], .025);
  for (let i = 0; i < 3; i++) k.add(TORUS(8, .18, 3), EISEN, [u, v - .2 + i * .02, .25 + i * .22], [.08, .08, .08], { r: [0, PI / 2, 0], ao: false });   // Schnörkel
  k.ball(MESSING, [u, v, L + .07], .04, NO);
  k.part(name, [u, v - .03, L * .62], s => { for (const z of [-L * .25, L * .25]) s.beam(EISEN, [0, 0, z], [0, -.2, z * .8], .012, NO); drawFn(s); }, { swing: [1, 0, 0], amp: .1, speed: 1.4 });
}

// =====================================================================================================
// Bäckerei: Haus mit Steinofen-Anbau, Brezel-Zunftschild, Schaufenster mit Broten, Mehlsäcke, Bank, Verkaufstheke
// =====================================================================================================
function breadFill(r) {
  return (k, u0, u1, vF, w1, w0) => {
    const um = (u0 + u1) / 2, W = u1 - u0;
    B(k, 0x6a4a30, u0 + .05, u1 - .05, vF, vF + .55, w0 - .42, w0 - .05, NO); B(k, 0xf0e8d8, u0 + .03, u1 - .03, vF + .55, vF + .57, w0 - .44, w0 - .03, NO);
    for (let i = 0; i < 4; i++) { const x = u0 + .25 + i * (W - .5) / 3, z = w0 - .23; k.cyl(0xb8925a, [x, vF + .57, z], .14, .08, 8, { top: 1.2, ao: false }); for (let j = 0; j < 3; j++) k.ball(C(r.pick(BROT), r.R(.9, 1.1)), [x + r.R(-.06, .06), vF + .68, z + r.R(-.06, .06)], [.09, .06, .07], { ao: false }); }
    for (let i = 0; i < 3; i++) pretzel(k, [u0 + .35 + i * (W - .7) / 2, vF + .62, w0 - .38], .32, 0xa8602a);
    for (const yy of [vF + 1.0, vF + 1.4, vF + 1.8]) { B(k, 0x6a4a30, u0 + .1, u1 - .1, yy - .03, yy, w1, w1 + .32, NO); for (let x = u0 + .2; x < u1 - .2; x += r.R(.17, .24)) k.ball(C(r.pick(BROT), r.R(.88, 1.1)), [x, yy + .07, w1 + .17], [.1, .07, .13], { ao: false, r: [0, r.R(-.4, .4), 0] }); }
    for (let i = 0; i < 2; i++) { const x = um + (i - .5) * .5; k.cyl(0xf0e0c0, [x, vF + .57, w0 - .2], .12, .09, 10, NO); k.cyl(0xc84a5a, [x, vF + .66, w0 - .2], .12, .015, 10, NO); }   // Torten
    roomLamp(k, um, vF + 2.0, w1 + .5, 0xf0e8d0);
    B(k, 0xf4f0e6, um - .6, um + .6, vF + 2.2, vF + 2.35, w1, w1 + .02, NO);
  };
}
// Verkaufstheke mit Markise (Front +x zur Kundschaft), spot 'stall'
function breadStall(k, r) {
  const w = 1.6, d = .7;
  for (const [x, z, h] of [[d / 2, -w / 2, 2.05], [d / 2, w / 2, 2.05], [-d / 2, -w / 2, 2.3], [-d / 2, w / 2, 2.3]]) { k.box(HOLZ_D, [x, -.3, z], [.08, h + .3, .08]); }
  B(k, C(HOLZ, 1.05), -d / 2, d / 2 + .06, .86, .92, -w / 2, w / 2, { jit: .06 });
  for (let z = -w / 2 + .02; z < w / 2 - .02; z += .16) B(k, C(HOLZ_H, r.R(.85, 1.05)), d / 2 - .03, d / 2 + .01, .05, .86, z, z + .145, { jit: .06 });
  B(k, HOLZ_D, -d / 2 + .05, d / 2 - .05, .1, .14, -w / 2 + .05, w / 2 - .05);
  const sl = Math.hypot(d + .4, .25), ang = Math.atan2(.25, d + .4), cols = [0xd8a03a, 0xf4efe6];
  k.push([-d / 2 - .05, 2.32, 0], 0); k.pushM(new THREE.Matrix4().makeRotationZ(-ang));
  for (let i = 0; i < 7; i++) B(k, cols[i % 2], 0, sl, -.015, .015, -w / 2 - .1 + i * (w + .2) / 7, -w / 2 - .1 + (i + 1) * (w + .2) / 7 + .003, { ao: false });
  k.pop(); k.pop();
  for (let i = 0; i < 7; i++) { const z = -w / 2 - .1 + (i + .5) * (w + .2) / 7; B(k, cols[i % 2], d / 2 + .34, d / 2 + .355, 1.9, 2.07, z - (w + .2) / 14, z + (w + .2) / 14, { ao: false, sway: .15 }); }
  for (let i = 0; i < 3; i++) { const z = -.5 + i * .5; k.cyl(0xb8925a, [.05, .92, z], .17, .1, 8, { top: 1.25 }); for (let j = 0; j < 4; j++) k.ball(C(r.pick(BROT), r.R(.9, 1.1)), [.05 + r.R(-.07, .07), 1.05, z + r.R(-.07, .07)], [.08, .055, .065], { ao: false }); }
  // Brezelständer
  k.cyl(HOLZ_D, [-.15, .92, .62], .015, .55, 4); for (let i = 0; i < 3; i++) pretzel(k, [-.15, 1.15 + i * .1, .62 + (i - 1) * .02], .2, 0xa8602a);
  B(k, 0x3a3a3a, .2, .45, .92, 1.15, -.78, -.6); B(k, 0xf4f0e6, .21, .44, .95, 1.12, -.6, -.598, NO);   // Preistafel
  k.spot('stall', [-.6, 0, 0], { a: 0 });
}
export function tile_baecker(k, F, ctx) {
  const r = RNG(ctx.seed, 'baecker'), ry = rot(firstEdge(ctx.E, 'r')), V = RNG(ctx.seed, 'farbe');
  const putz = V.pick([0xf0dc9e, 0xeee0c4, 0xf3f0e8, 0xe8c8a0]), laden = V.pick(LADEN), balken = V.pick(BALKEN);
  const S = { frame: 0xf2efe6, sill: 0xc8c0b0, laden, gardine: V.pick(GARDINE), tuer: V.pick([0x6a3a24, laden]), zarge: MIX(balken, 0x6a5038, .4), kasten: TON };
  site(k, F, 0, 0, 3.0, ry, G => {
    const hx = .25, hz = .05, a = 1.65, b = 1.75, t = .24, FL = .34, G0 = 2.85, Ye = 5.25, th = .78;
    k.push([hx, 0, hz], 0);
    const doorU = .15, gW = { F: [{ u: -1.05, v0: FL + .5, W: 1.15, H: 1.45, shop: true }, { u: 1.25, v0: FL + .85, W: .7, H: 1.05 }], K: [{ u: 0, v0: FL + .85, W: .7, H: 1.0 }], R: [{ u: .2, v0: FL + .85, W: .7, H: 1.0 }], L: [] };
    const oW = { F: [-1.15, 0, 1.15], K: [-.8, .8], R: [-.6, .6], L: [-.5, .7] };
    for (const s of 'FKRL') {
      const len = wallLen(s, a, b, t), wins = gW[s], holes = wins.map(w => ({ a: w.u - w.W / 2, b: w.u + w.W / 2, lo: w.v0, hi: w.v0 + w.H }));
      if (s === 'F') holes.push({ a: doorU - .5, b: doorU + .5, lo: FL, hi: FL + 2.15 });
      const up = oW[s].map(u => ({ u, v0: G0 + .65, W: .66, H: .95 })), uh = up.map(w => ({ a: w.u - w.W / 2, b: w.u + w.W / 2, lo: w.v0, hi: w.v0 + w.H }));
      onWall(k, s, a, b, () => {
        wallPieces(k, putz, -len, len, FL, G0, t, holes, r, { band: .35 }); weather(k, putz, r, -len, len, FL, G0, wins);
        wallPieces(k, MIX(putz, 0xffffff, .45), -len, len, G0, Ye, t, uh, r);
        const U = s === 'F' || s === 'K' ? b : a; timber(k, balken, r, -U - .02, U + .02, G0, Ye, uh);
        B(k, C(balken, .9), -len - .03, len + .03, G0 - .12, G0 + .02, -.06, .08, { jit: .05 });
        for (const w of up) win(k, S, r, w.u, w.v0, w.W, w.H, t, { shutters: s === 'F' || s === 'R', hinge: .1, box: s === 'F', curtain: s !== 'K', room: { vF: G0 + .05, vC: Ye - .15, depth: .8, items: s === 'F' ? undefined : ['lamp'] } });
        for (const w of wins) {
          if (w.shop) {
            win(k, { ...S, frame: laden }, r, w.u, w.v0, w.W, w.H, t, { rows: 1, curtain: false, sillC: 0xb8b0a0, room: { vF: FL + .02, vC: G0 - .1, depth: 1.1, fill: breadFill(r) } });
            B(k, C(laden, .9), w.u - w.W / 2 - .1, w.u + w.W / 2 + .1, w.v0 + w.H + .05, w.v0 + w.H + .4, 0, .06);
            let lx = w.u - w.W / 2; while (lx < w.u + w.W / 2 - .1) { const lw = r.R(.08, .13); B(k, 0xf2d070, lx, lx + lw, w.v0 + w.H + .13, w.v0 + w.H + .32, .06, .07, NO); lx += lw + .05; }
            awning(k, r, w.u, w.v0 + w.H + .03, w.v0 + w.H - .4, w.W + .3, .8, [laden, 0xf4efe6]);
          } else win(k, S, r, w.u, w.v0, w.W, w.H, t, { shutters: true, box: s !== 'K', room: { vF: FL + .02, vC: G0 - .1, depth: .85, items: s === 'F' ? ['lamp', 'tisch'] : undefined } });
        }
        if (s === 'F') {
          door(k, S, r, doorU, FL, 1.0, 2.15, t, { glass: true });
          B(k, 0xe8d8a8, doorU - .35, doorU + .35, FL + 2.2, FL + 2.42, 0, .04); for (let i = 0; i < 5; i++) B(k, 0x5a3a24, doorU - .28 + i * .12, doorU - .2 + i * .12, FL + 2.26, FL + 2.36, .04, .045, NO);
          wallLamp(k, doorU + .72, 2.25);
          hangSign(k, .72, 3.35 - .5, 1.0, sub => {
            sub.add(TORUS(18, .05, 4), EISEN, [0, -.6, 0], [.4, .4, .4], { r: [0, PI / 2, 0], ao: false });
            sub.in([0, 0, 0], PI / 2, () => pretzel(sub, [0, -.86, 0], .62, GOLD, { salt: true }));
          }, 'brezel');
        }
      });
    }
    plinth(k, r, a, b, FL);
    // Dach + Schornstein
    const chim = { x: -.6, z: .7, w: .5 }, R = roof(k, r, a, b, Ye, th, .4, .38, { col: V.pick(ZIEGEL), chim });
    for (const s of 'RL') onWall(k, s, a, b, () => { gableWall(k, MIX(putz, 0xffffff, .45), a, Ye, th, t, s === 'R' ? { u: 0, W: .5, v0: Ye + .4, H: .6 } : null); if (s === 'R') win(k, S, r, 0, Ye + .4, .5, .6, t, { room: { vF: Ye, vC: Ye + 1.2, depth: .6, items: ['lamp'], plain: true } }); const bc = C(balken); for (const sx of [-1, 1]) k.beam(bc, [sx * (a - .1), Ye + .05, .02], [0, Ye + a * Math.tan(th) - .05, .02], .1, { w: .13, d: .06 }); });
    k.spot('smoke', [chim.x, chimney(k, r, chim.x, chim.z, chim.w, Ye + (a - Math.abs(chim.x) - chim.w / 2) * Math.tan(th), R.yA + .6), chim.z]);
    // Treppe
    B(k, 0x9a958c, a, a + .4, -.3, FL - .02, doorU - .6 - hz * 0, doorU + .6, { jit: .06 }); B(k, 0x8f8b84, a + .4, a + .75, -.3, FL * .5, doorU - .55, doorU + .55, { jit: .06 });
    k.pop();
    // Steinofen-Anbau links (−z): Gewölbe aus Ziegeln, Ofenloch mit Glut, eigener Schlot
    const ox0 = -1.05, ox1 = 1.25, oz0 = -3.2, oz1 = hz - b - .02, oh = 1.55, oc = (oz0 + oz1) / 2, orr = (oz1 - oz0) / 2;
    masonry(k, r, ox0, ox1, -.5, oh, oz0, oz1, { sides: 'FKL', ch: .24, moss: .2, noCore: true, skip: { F: (u, v) => Math.abs(u) < .42 && v > .35 && v < 1.15 } });
    { const M = MOERTEL, mx = ox1 - .55; B(k, M, ox0 + .01, mx, -.5, oh, oz0 + .01, oz1 - .01); B(k, M, mx, ox1 - .01, -.5, oh, oz0 + .01, oc - .42); B(k, M, mx, ox1 - .01, -.5, oh, oc + .42, oz1 - .01); B(k, M, mx, ox1 - .01, -.5, .35, oc - .42, oc + .42); B(k, M, mx, ox1 - .01, 1.15, oh, oc - .42, oc + .42); }
    k.in([(ox0 + ox1) / 2, oh, oc], 0, () => {
      const L = ox1 - ox0 + .1, n = 9;
      k.add(VAULT(), 0x8a7a68, [0, 0, 0], [L, orr + .02, orr + .02], { jit: .03 });
      for (let i = 0; i < n; i++) { const aa = (i + .5) / n * PI, rr = orr + .05; k.box(C(r.pick([0x9a4a34, 0x8a3e2c, 0xa85a3e, 0x7e3a2a]), r.R(.85, 1.1)), [0, Math.sin(aa) * rr - .04, Math.cos(aa) * rr], [L + .02, .08, 2 * rr * Math.sin(PI / n / 2) * 2 + .01], { r: [PI / 2 - aa, 0, 0], jit: .06 }); }
      for (const s2 of [-1, 1]) for (let i = 0; i < n; i++) { const aa = (i + .5) / n * PI; k.box(C(r.pick([0x9a4a34, 0x8a3e2c, 0xa85a3e]), r.R(.85, 1.1)), [s2 * (L / 2 + .02), Math.sin(aa) * (orr - .06), Math.cos(aa) * (orr - .06)], [.06, .1, .2], { r: [PI / 2 - aa, 0, 0], jit: .06 }); }
      for (let i = 0; i < 5; i++) { const aa = r.R(.4, 2.7); k.ball(MOOS, [r.R(-1, 1), Math.sin(aa) * (orr + .12), Math.cos(aa) * (orr + .12)], [.15, .03, .1], { tag: TAG.grass, ao: false }); }
    });
    onWall(k, 'F', ox1, 0, () => {
      k.push([-oc, 0, 0], 0);
      B(k, 0x2a1a14, -.42, .42, .35, 1.15, -.56, -.54, NO); B(k, RUSS, -.42, .42, 1.12, 1.15, -.55, -.02, NO); B(k, 0x3a2a22, -.42, .42, .35, .37, -.55, .02, NO);
      B(k, C(0x8f8b84), -.58, .58, 1.15, 1.34, -.06, .08, { jit: .05 }); for (let i = 0; i < 6; i++) B(k, C(0x9a4a34, r.R(.85, 1.1)), -.55 + i * .185, -.38 + i * .185, 1.34, 1.42, -.05, .06, { jit: .06 });   // Sturz
      for (let i = 0; i < 7; i++) k.ball(r.p(.6) ? 0xff6a1a : 0xffa030, [r.R(-.3, .3), .4 + r.R(0, .08), r.R(-.45, -.15)], r.R(.05, .09), { layer: 'glow', tag: 2, ao: false });
      for (let i = 0; i < 4; i++) k.ball(0x2a2422, [r.R(-.3, .3), .4, r.R(-.4, -.2)], .07, NO);
      k.in([-.42, .35, .03], -1.2, () => { B(k, EISEN, 0, .78, 0, .76, -.02, .02); for (const y of [.15, .6]) B(k, C(EISEN, 1.3), .02, .76, y, y + .05, .02, .035, NO); k.ball(MESSING, [.68, .38, .04], .025, NO); });
      B(k, 0x9a958c, -.6, .6, .3, .37, -.02, .3, { jit: .04 });
      k.beam(HOLZ_H, [.6, .02, .25], [.95, 1.9, .2], .03); B(k, HOLZ_H, .82, 1.12, 1.88, 1.9, .05, .35, NO);   // Brotschieber
      k.pop();
    });
    const sy = chimney(k, r, ox0 + .45, oc, .55, -.2, 4.3, [0x9a958c, 0x8f8b84, 0xa8a296, 0x857a6a], .22);
    k.spot('smoke', [ox0 + .45, sy, oc]);
    // Holz für den Ofen, Mehlsäcke, Karren
    k.push([0, 0, oz0 - .05], PI); woodpile(k, r, -1.15, .95, 0, 4, true); k.pop();
    G.on(1.85, -2.35, .2, () => { B(k, HOLZ_D, -.45, .45, -.1, .1, -.35, .35); for (const [x, z, y, l] of [[-.2, -.15, .1, 0], [.2, -.15, .1, 0], [-.2, .18, .1, 0], [.2, .18, .1, 0], [0, 0, .42, 1]]) sack(k, [x, y, z], r.R(-.3, .3) + (l ? 1.57 : 0), .82, l === 1, 0x3a5a9a); });
    G.on(1.75, -3.4, -.4, () => { k.ground = -1e9; for (const s2 of [-1, 1]) { k.cyl(HOLZ_D, [0, .3, s2 * .38], .3, .05, 10, { r: [PI / 2, 0, 0] }); k.add(TORUS(10, .08, 3), EISEN, [0, .3, s2 * .41], [.3, .3, .3], NO); } B(k, HOLZ, -.5, .5, .4, .46, -.35, .35); for (const s2 of [-1, 1]) B(k, HOLZ, -.5, .5, .46, .7, s2 * .35 - .02, s2 * .35 + .02); k.beam(HOLZ_D, [.5, .43, .2], [1.1, .05, .15], .045); k.beam(HOLZ_D, [.5, .43, -.2], [1.1, .05, -.15], .045); sack(k, [-.15, .46, 0], 1.6, .8, true); sack(k, [.2, .46, .05], .3, .75, false, 0x3a5a9a); k.ground = 0; });
    // Bank am Haus, Verkaufstheke auf freier Seite
    woodBench(k, [hx + a + .4, G.h(hx + a + .4, 1.1), 1.1], 0, 1.2, 0x7a5232); sitSpot(k, [hx + a + .5, G.h(hx + a + .4, 1.1) + .45, 1.1], 1, 0);
    pot(k, r, [hx + a + .35, G.h(hx + a + .35, -.55), -.55], .9); pot(k, r, [hx + a + .35, G.h(hx + a + .35, .65), .65], .75);
    for (const [x, z, ry2] of [[3.0, 2.55, PI / 2], [-1.6, 2.6, PI / 2 + .5]]) if (G.free(x, z, .75)) { G.on(x, z, ry2, () => breadStall(k, r), 'bldg'); break; }
    k.spot('door', [hx + a + 1.0, 0, hz - doorU]);
  });
  const taken = [[0, 0, 4.0]];
  scatter(k, F, 1, 1.2, (x, y, z) => N.leafTree(k, [x, y, z], .9), 30, taken);
  meadowOut(k, F, 3.6, .6);
}

// =====================================================================================================
// Schmiede: offene Werkstatt mit Esse (Glut), Amboss, Wassertrog, Hufeisen, Werkzeug, Blasebalg
// =====================================================================================================
function horseshoe(k, p, rx = 0, ry = 0, rz = 0, s = 1, c = 0x6a6a6e) { k.detail(() => {
  k.add(ARC(10, .14, PI * 1.3), c, p, [.07 * s, .07 * s, .07 * s], { r: [rx, ry, rz - PI * .15], ao: false });
  for (let i = 0; i < 3; i++) { const aa = i / 2 * PI * 1.2 - PI * .1 + rz; k.ball(0x3a3a3a, [p[0] + Math.cos(aa) * .07 * s * Math.cos(ry), p[1] + Math.sin(aa) * .07 * s, p[2] - Math.cos(aa) * .07 * s * Math.sin(ry)], .007, NO); }
  }); }
function anvil(k, p, ry) {
  k.in(p, ry, () => {
    k.cyl(0x6a4a30, [0, -.2, 0], .3, .72, 9, { top: .9 }); k.add(DISC(9), 0xb89a6a, [0, .521, 0], [.27, 1, .27], NO);
    for (let i = 0; i < 2; i++) k.cyl(EISEN, [0, .12 + i * .25, 0], .3 - i * .015, .04, 9, NO);
    const c = 0x3c3c40;
    B(k, c, -.2, .2, .52, .6, -.12, .12); B(k, c, -.12, .12, .6, .74, -.07, .07); B(k, c, -.3, .26, .74, .86, -.1, .1, { jit: .03 });
    k.cone(c, [.26, .8, 0], .07, .3, 6, { r: [0, 0, -PI / 2] }); B(k, C(c, 1.4), -.28, .24, .86, .865, -.09, .09, NO);
    B(k, 0x1a1a1a, -.24, -.2, .85, .87, -.02, .02, NO);
    k.ball(0xff7a20, [-.05, .89, 0], [.12, .02, .025], { layer: 'glow', tag: 2, ao: false });          // glühendes Eisen
    k.beam(0x6a5038, [.05, .87, .15], [.45, .87, .3], .025); B(k, 0x2a2a2c, .0, .1, .85, .9, .1, .18);     // Hammer
    k.beam(0x3a3a3a, [-.35, .88, -.05], [-.05, .89, 0], .012); k.beam(0x3a3a3a, [-.35, .88, -.08], [-.06, .885, -.03], .012);   // Zange
  });
}
function bellows(k, r, p, ry) {
  k.in(p, ry, () => {
    for (const [x, z] of [[-.5, -.3], [-.5, .3], [.5, -.3], [.5, .3]]) B(k, HOLZ_D, x - .05, x + .05, -.2, .6, z - .05, z + .05);
    B(k, HOLZ, -.6, .6, .55, .62, -.35, .35);
    k.prism(0x5a3a28, [0, .62, 0], .7, .4, 1.2, { r: [PI, PI / 2, 0], ao: false });
    for (let i = 0; i < 4; i++) B(k, 0x4a2e1e, -.55 + i * .3, -.5 + i * .3, .63, .8, -.36, .36, NO);
    B(k, C(HOLZ, 1.1), -.62, .5, .83, .88, -.37, .37); k.cone(EISEN, [.6, .74, 0], .07, .3, 6, { r: [0, 0, -PI / 2] });
    k.beam(HOLZ_D, [-.3, .88, 0], [-.3, 1.9, 0], .05); k.beam(HOLZ_D, [-.3, 1.9, 0], [-.9, 1.6, 0], .05); B(k, 0xc8b080, -.92, -.88, .9, 1.6, -.01, .01, NO);
  });
}
export function tile_schmiede(k, F, ctx) {
  const r = RNG(ctx.seed, 'schmiede'), ry = rot(firstEdge(ctx.E, 'r'));
  site(k, F, 0, 0, 3.0, ry, G => {
    const x0 = -1.8, x1 = 1.55, z0 = -2.2, z1 = 2.0, Ye = 2.75, th = .62, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, a = (x1 - x0) / 2, b = (z1 - z0) / 2;
    // Boden: gestampfter Lehm mit Steinplatten
    B(k, 0x6a5a48, x0 + .1, x1, -.3, .06, z0 + .1, z1 - .1, { jit: .08 });
    for (let i = 0; i < 14; i++) B(k, C(r.pick(STEIN), r.R(.85, 1.05)), cx + r.R(-a + .3, a - .2) - .2, 0, .02, .075, 0, 0, NO);
    for (let i = 0; i < 18; i++) { const x = r.R(x0 + .3, x1 - .1), z = r.R(z0 + .3, z1 - .3); k.box(C(r.pick(STEIN), r.R(.85, 1.05)), [x, .02, z], [r.R(.3, .5), .05, r.R(.3, .5)], { r: [0, r.R(0, 1), 0], jit: .08 }); }
    for (let i = 0; i < 20; i++) k.box(0x2a2624, [r.R(x0 + .3, x0 + 1.4), .065, r.R(z0 + .2, z0 + 1.6)], [.08, .01, .06], { r: [0, r.R(0, 3), 0], ao: false });   // Kohlestaub
    // Rückwand und linke Wand aus Bruchstein, rechte Wand aus Brettern bis halbe Höhe
    k.push([cx, 0, cz], 0);
    onWall(k, 'K', a, b, () => { B(k, MOERTEL, -b, b, -.3, Ye, -.3, -.02); stones(k, r, -b - .02, b + .02, -.3, Ye, { ch: .28, d: .08, moss: .15 }); });
    onWall(k, 'L', a - .3, b, () => { B(k, MOERTEL, -a + .3, a - .3, -.3, Ye, -.3, -.02); stones(k, r, -a + .3, a - .25, -.3, Ye, { ch: .28, d: .08, moss: .15 }); });
    onWall(k, 'R', a - .3, b, () => { for (let u = -a + .3, i = 0; u < a - .35; u += .2, i++) B(k, C(0x6a5038, r.R(.82, 1.1)), u, u + .19, -.2, 1.15 - r.R(0, .04), -.04 + (i % 2) * .02, -.0 + (i % 2) * .02, { jit: .07 }); B(k, HOLZ_A, -a + .3, a - .3, 1.1, 1.2, -.08, .03); });
    k.pop();
    // Pfosten, Rähm, Kopfbänder
    const posts = [[x1 - .1, z0 + .1], [x1 - .1, 0], [x1 - .1, z1 - .1], [x0 + .15, z1 - .1], [cx, z1 - .1]];
    for (const [x, z] of posts) { k.box(C(0x5a4030, r.R(.9, 1.05)), [x, -.2, z], [.2, Ye + .2, .2], { jit: .06 }); k.box(0x8f8b84, [x, -.25, z], [.32, .3, .32], { jit: .06 }); }
    B(k, 0x5a4030, x1 - .22, x1 + .02, Ye - .22, Ye, z0 - .02, z1 + .02, { jit: .05 }); B(k, 0x5a4030, x0, x1, Ye - .22, Ye, z1 - .2, z1, { jit: .05 });
    for (const z of [z0 + .1, 0, z1 - .1]) for (const sg of z === 0 ? [-1, 1] : [z < 0 ? 1 : -1]) k.beam(0x5a4030, [x1 - .1, Ye - .75, z], [x1 - .1, Ye - .2, z + sg * .55], .1);
    for (const x of [x0 + .5, cx, x1 - .5]) B(k, 0x5a4030, x - .08, x + .08, Ye - .18, Ye, z0, z1, { jit: .05 });    // Zugbalken
    // Dach (Ziegel, dunkel) mit Schlot der Esse
    const ex = x0 + .6, ez = z0 + .7, chim = { x: ex - cx, z: ez - cz, w: .6 };
    k.in([cx, 0, cz], 0, () => {
      const sl = r.p(.5), R = roof(k, r, a, b, Ye, th, .45, .35, { col: sl ? r.pick(SCHIEFER) : r.pick([0x7a3a2a, 0x6a3426]), kind: sl ? 'schiefer' : 'ziegel', chim, moss: .06 });
      for (const s of 'RL') onWall(k, s, a, b, () => boardGable(k, r, 0x6a5038, a, Ye, th, s === 'R' ? { u: 0, W: .5, v0: Ye + .4, H: .5 } : null));
      const sm = chimney(k, r, chim.x, chim.z, chim.w, 1.9, R.yA + .55, [0x9a958c, 0x8f8b84, 0x7d7a74], .2);
      k.spot('smoke', [chim.x, sm, chim.z]);
    });
    // Esse: gemauerter Herd, Rauchfang, Glut
    masonry(k, r, ex - .55, ex + .45, -.2, .85, ez - .5, ez + .55, { sides: 'FR', ch: .22, cap: 0x7a7670 });
    B(k, RUSS, ex - .4, ex + .3, .94, .97, ez - .35, ez + .4, NO);
    for (let i = 0; i < 16; i++) k.ball(r.p(.55) ? 0xff5a10 : r.p(.5) ? 0xffa030 : 0xd83a10, [ex + r.R(-.3, .2), .98 + r.R(0, .05), ez + r.R(-.25, .3)], r.R(.04, .08), { layer: 'glow', tag: 2, ao: false, jit: .2 });
    for (let i = 0; i < 10; i++) k.ball(0x262222, [ex + r.R(-.35, .25), .98, ez + r.R(-.3, .35)], r.R(.04, .07), { dod: true, ao: false });
    k.in([ex - .05, 0, ez + .02], 0, () => { k.cyl(0x8a4a34, [0, 1.46, 0], .88, .5, 4, { top: .42, r: [0, PI / 4, 0], jit: .05 }); for (let i = 0; i < 4; i++) k.cyl(C(0x7a3e2c, r.R(.9, 1.05)), [0, 1.52 + i * .12, 0], .86 - i * .1, .02, 4, { r: [0, PI / 4, 0], ao: false }); k.cyl(EISEN, [0, 1.38, 0], .9, .08, 4, { r: [0, PI / 4, 0] }); });
    for (const [px, pz] of [[ex + .4, ez + .5], [ex + .4, ez - .45]]) B(k, EISEN, px - .03, px + .03, .85, 1.42, pz - .03, pz + .03);
    k.cyl(EISEN, [ex + .45, .55, ez + .05], .05, .5, 6, { r: [0, 0, PI / 2] });                                  // Windrohr
    bellows(k, r, [ex + 1.1, 0, ez + .1], 0);
    k.add(TORUS(8, .2, 3), 0x6a6a6e, [ex + .1, 1.3, ez - .6], [.08, .08, .08], NO);
    // Amboss, Trog, Werkzeugwand, Schleifstein
    anvil(k, [cx + .55, 0, -.25], .4);
    k.in([x1 - .8, 0, z0 + .45], 0, () => {
      B(k, C(0x8f8b84), -.55, .55, -.2, .55, -.25, .25, { jit: .05 }); B(k, 0x3f8fa8, -.48, .48, .44, .46, -.18, .18, { layer: 'water', ao: false });
      B(k, 0x7d7a74, -.6, .6, .55, .6, -.3, -.22); B(k, 0x7d7a74, -.6, .6, .55, .6, .22, .3);
      k.beam(0x3a3a3a, [.3, .47, .05], [.75, .9, .1], .015); k.beam(0x3a3a3a, [.3, .47, .1], [.75, .92, .14], .015);
    });
    k.in([cx, 0, z1 - .22], PI, () => {
      B(k, HOLZ_A, -1.0, .8, 1.2, 1.28, -.05, .02); B(k, HOLZ_A, -1.0, .8, 1.75, 1.83, -.05, .02);
      for (let i = 0; i < 8; i++) {
        const u = -.9 + i * .22, kind = i % 4;
        B(k, 0x3a3a3a, u - .01, u + .01, 1.72, 1.85, .02, .06, NO);
        if (kind === 0) { k.beam(0x7a5a3a, [u, 1.7, .05], [u, 1.25, .05], .025); B(k, 0x2e2e30, u - .06, u + .06, 1.18, 1.27, .02, .08); }
        else if (kind === 1) { k.beam(0x3a3a3a, [u - .02, 1.72, .05], [u - .05, 1.15, .06], .015); k.beam(0x3a3a3a, [u + .02, 1.72, .05], [u + .05, 1.15, .06], .015); }
        else if (kind === 2) horseshoe(k, [u, 1.62, .06], 0, 0, PI, 1.1);
        else { k.beam(0x7a5a3a, [u, 1.7, .05], [u + .04, 1.3, .05], .02); k.box(0x3a3a3a, [u + .05, 1.22, .05], [.03, .12, .05], NO); }
      }
      for (let i = 0; i < 5; i++) horseshoe(k, [-.8 + i * .2, 2.15, .04], 0, 0, PI, 1);
    });
    k.in([x1 + .55, 0, z1 - .35], .3, () => {                                                               // Schleifstein
      for (const s of [-1, 1]) k.beam(HOLZ_D, [s * .25, -.1, -.3], [s * .25, .65, 0], .06), k.beam(HOLZ_D, [s * .25, -.1, .3], [s * .25, .65, 0], .06);
      k.cyl(0xa8a296, [-.06, .7, 0], .35, .12, 12, { r: [0, 0, PI / 2], jit: .05 }); k.cyl(EISEN, [-.3, .7, 0], .025, .6, 5, { r: [0, 0, -PI / 2], ao: false }); k.beam(EISEN, [.3, .7, 0], [.3, .45, .15], .02);
      B(k, HOLZ, -.2, .2, .3, .45, -.12, .12);
    });
    // Hufeisen-Haufen, Wagenrad, Fass, Kohlensack, Anbindebalken
    for (let i = 0; i < 7; i++) horseshoe(k, [x1 + r.R(.4, .8), .02 + i * .012, r.R(-1.6, -1.2)], PI / 2, 0, r.R(0, TAU), 1);
    k.in([x1 + .05, 0, -.75], 0, () => { k.add(TORUS(14, .07, 4), 0x6a4a30, [0, .62, .15], [.6, .6, .6], { r: [0, 0, 0], ao: false }); k.add(TORUS(14, .03, 3), EISEN, [0, .62, .17], [.62, .62, .62], NO); for (let i = 0; i < 6; i++) { const aa = i / 6 * PI; k.beam(0x6a4a30, [Math.cos(aa) * .55, .62 + Math.sin(aa) * .55, .15], [-Math.cos(aa) * .55, .62 - Math.sin(aa) * .55, .15], .035); } k.cyl(0x5a3a28, [0, .62, .08], .1, .16, 8, { r: [PI / 2, 0, 0] }); });
    barrel(k, [x0 + .45, 0, z1 - .55], .85, 0x5a4a3a); k.cyl(0x3f8fa8, [x0 + .45, .73, z1 - .55], .22, .01, 10, { layer: 'water', ao: false });
    sack(k, [x0 + .5, 0, -.2], .4, .9, false, 0x2a2a2a); sack(k, [x0 + .55, 0, .25], 1.2, .85, true);
    for (let i = 0; i < 8; i++) k.ball(0x262222, [x0 + .6 + r.R(-.25, .25), .05, r.R(-.4, -.1)], .05, { dod: true, ao: false });
    if (G.free(2.3, 2.3, .4)) G.on(2.3, 2.3, .2, () => { for (const s2 of [-1, 1]) { k.box(HOLZ_D, [0, -.3, s2 * .7], [.12, 1.35, .12]); } k.box(HOLZ, [0, .95, 0], [.1, .1, 1.6], { jit: .05 }); k.add(TORUS(8, .2, 3), EISEN, [.06, .9, .3], [.06, .06, .06], { r: [0, PI / 2, 0], ao: false }); bucket(k, [.3, 0, -.3], .9, true); });
    horseshoe(k, [x1 + .02, Ye - .4, 0], 0, PI / 2, 0, 1.4, 0x8a8a90);                                         // Glückshufeisen
    k.push([x1 - .1, 0, 0], PI / 2); k.pop();
    k.in([x1 + .01, 0, .55], PI / 2, () => wallLamp(k, 0, 2.1, .25));
    k.spot('door', [2.6, 0, 0]);
  });
  const taken = [[0, 0, 3.9]];
  scatter(k, F, 4, .6, (x, y, z) => N.rock(k, [x, y, z], k.R(.4, .8)), 20, taken);
  meadowOut(k, F, 3.4, .6);
}

// =====================================================================================================
// Gasthaus: großes Fachwerk-Wirtshaus, Ausleger-Schild, Biergarten mit Tischen, Schirmen, Lichterkette, Fässer
// =====================================================================================================
// Biertisch mit zwei Bänken (Tisch entlang x), optional Sonnenschirm; setzt zwei Sitzplätze
function beerTable(k, r, umbrella, cols) {
  const L = 1.5, c = 0x9a7048, leg = 0x4a4a4a;
  B(k, C(c, r.R(.95, 1.05)), -L / 2, L / 2, .72, .76, -.28, .28, { jit: .06 }); for (let i = 1; i < 4; i++) B(k, C(c, .82), -L / 2, L / 2, .758, .762, -.28 + i * .14 - .004, -.28 + i * .14 + .004, NO);
  for (const sx of [-1, 1]) { k.beam(leg, [sx * (L / 2 - .15), .72, -.2], [sx * (L / 2 - .15), -.05, .2], .025); k.beam(leg, [sx * (L / 2 - .15), .72, .2], [sx * (L / 2 - .15), -.05, -.2], .025); }
  for (const sz of [-1, 1]) {
    B(k, C(c, r.R(.95, 1.05)), -L / 2, L / 2, .44, .48, sz * .62 - .13, sz * .62 + .13, { jit: .06 });
    for (const sx of [-1, 1]) { k.beam(leg, [sx * (L / 2 - .15), .44, sz * .62 - .1], [sx * (L / 2 - .15), -.05, sz * .62 + .1], .02); k.beam(leg, [sx * (L / 2 - .15), .44, sz * .62 + .1], [sx * (L / 2 - .15), -.05, sz * .62 - .1], .02); }
    sitSpot(k, [0, .45, sz * .62], 0, -sz);
  }
  // Krüge, Brezel, Tischdecke-Läufer
  B(k, 0xe8e0d0, -.25, .25, .76, .765, -.28, .28, NO);
  for (let i = 0; i < 2; i++) { const x = (i - .5) * .8 + r.R(-.15, .15), z = r.R(-.18, .18); k.cyl(0xc8b880, [x, .76, z], .045, .17, 6, { ao: false }); k.cyl(0xf4f0e6, [x, .93, z], .047, .03, 6, NO); k.add(ARC(6, .25, PI), 0xc8b880, [x + .05, .85, z], [.05, .05, .05], { r: [0, 0, -PI / 2], ao: false }); }
  k.cyl(0xb8925a, [r.R(-.4, .4), .76, 0], .09, .06, 7, { top: 1.3, ao: false });
  if (umbrella) {
    k.cyl(0xe8e4dc, [0, .76, 0], .025, 1.6, 6); k.cyl(0x6a6a6a, [0, -.05, 0], .2, .06, 8);
    const n = 8, R = 1.25, h = .45;
    for (let i = 0; i < n; i++) { const a0 = i / n * TAU, a1 = (i + 1) / n * TAU, cc = cols[i % 2]; const p0 = [Math.cos(a0) * R, 2.0, Math.sin(a0) * R], p1 = [Math.cos(a1) * R, 2.0, Math.sin(a1) * R];
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 2.0 + h, 0, ...p1, ...p0, 0, 2.0 + h - .01, 0, ...p0, ...p1], 3)); g.computeVertexNormals(); k.add(g, cc, [0, 0, 0], [1, 1, 1], { ao: false, jit: .03 });
      k.box(cc, [(p0[0] + p1[0]) / 2, 1.88, (p0[2] + p1[2]) / 2], [.02, .12, R * .76], { r: [0, -(a0 + a1) / 2, 0], ao: false, sway: .1 });
      k.beam(0xd8d0c0, [0, 1.75, 0], [Math.cos(a0) * R * .6, 1.98 + h * .4, Math.sin(a0) * R * .6], .01, NO); }
    k.ball(0xe8e4dc, [0, 2.0 + h + .03, 0], .04, NO);
  }
}
// Lichterkette von a nach b mit Durchhang (Glühbirnen als Lampen)
function lightString(k, a, b, sag = .35, n = 10) {
  const P = []; for (let i = 0; i <= n; i++) { const t = i / n; P.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t]); }
  for (let i = 0; i < n; i++) k.beam(0x2a2a2a, P[i], P[i + 1], .01, NO);
  const BUL = [0xfff0b0, 0xffe090, 0xffd070, 0xfff4d0];
  for (let i = 1; i < n; i++) { const p = P[i]; B(k, 0x2a2a2a, p[0] - .012, p[0] + .012, p[1] - .06, p[1], p[2] - .012, p[2] + .012, NO); k.boxc(BUL[i % 4], [p[0], p[1] - .09, p[2]], [.05, .065, .05], { layer: 'glow', tag: 1, ao: false, r: [0, PI / 4, 0] }); }
}
export function tile_gasthaus(k, F, ctx) {
  const r = RNG(ctx.seed, 'gasthaus'), ry = rot(firstEdge(ctx.E, 'r')), V = RNG(ctx.seed, 'farbe');
  const putz = V.pick([0xf3f0e8, 0xeee0c4, 0xf0dc9e]), balken = V.pick(BALKEN), laden = V.pick(LADEN);
  const S = { frame: 0xf2efe6, sill: 0xc8c0b0, laden, gardine: V.pick([0xd88a7a, 0xf0e4d0, 0xc84a3a]), tuer: 0x5a3420, zarge: MIX(balken, 0x6a5038, .4), kasten: TON };
  site(k, F, 0, 0, 3.2, ry, G => {
    const hx = .2, hz = -.75, a = 1.7, b = 2.3, t = .25, FL = .36, G0 = 2.9, Ye = 5.35, th = .86;
    k.push([hx, 0, hz], 0);
    const doorU = hz, eg = { F: [{ u: -1.75, W: .75 }, { u: .9, W: .75 }, { u: 1.8, W: .75 }], K: [{ u: -1.2, W: .7 }, { u: 1.0, W: .7 }], R: [{ u: .6, W: .7 }, { u: -.6, W: .7, door: true }], L: [{ u: 0, W: .7 }] };
    const og = { F: [-1.75, -.65, .55, 1.65], K: [-1.3, 0, 1.3], R: [-.75, .75], L: [-.7, .7] };
    for (const s of 'FKRL') {
      const len = wallLen(s, a, b, t), wins = eg[s].map(w => ({ ...w, v0: w.door ? FL : FL + .8, H: w.door ? 2.0 : 1.1 }));
      const holes = wins.map(w => ({ a: w.u - w.W / 2, b: w.u + w.W / 2, lo: w.v0, hi: w.v0 + w.H }));
      if (s === 'F') holes.push({ a: doorU - .65, b: doorU + .65, lo: FL, hi: FL + 2.35 });
      const up = og[s].map(u => ({ u, v0: G0 + .7, W: .66, H: 1.0 })), uh = up.map(w => ({ a: w.u - w.W / 2, b: w.u + w.W / 2, lo: w.v0, hi: w.v0 + w.H }));
      onWall(k, s, a, b, () => {
        wallPieces(k, MIX(putz, 0xc8b8a0, .2), -len, len, FL, G0, t, holes, r, { band: .4 }); weather(k, putz, r, -len, len, FL, G0, wins);
        wallPieces(k, MIX(putz, 0xffffff, .5), -len, len, G0, Ye, t, uh, r);
        const U = s === 'F' || s === 'K' ? b : a; timber(k, balken, r, -U - .02, U + .02, G0, Ye, uh);
        B(k, C(balken, .85), -len - .04, len + .04, G0 - .14, G0 + .02, -.06, .1, { jit: .05 });
        for (const w of up) win(k, S, r, w.u, w.v0, w.W, w.H, t, { shutters: s === 'F' || s === 'R', hinge: .1, box: s === 'F', curtain: s !== 'K', room: { vF: G0 + .05, vC: Ye - .15, depth: .8, items: s === 'F' ? (r.p(.5) ? ['lamp', 'bett'] : ['lamp', 'bild']) : ['lamp'] } });
        for (const w of wins) {
          if (w.door) { door(k, S, r, w.u, w.v0, w.W + .1, w.H, t); continue; }
          win(k, S, r, w.u, w.v0, w.W, w.H, t, { rows: 1, box: s === 'F', curtain: s !== 'K', room: { vF: FL + .02, vC: G0 - .1, depth: .9, items: s === 'F' ? ['lamp', 'tisch', r.pick(['bild', 'regal', 'uhr'])] : ['lamp', 'tisch'] } });
        }
        if (s === 'F') {
          // Doppeltür mit Rundbogen-Oberlicht, Stufen, zwei Laternen, Speisekarte
          door(k, S, r, doorU - .3, FL, .6, 2.0, t, { sill: false }); door(k, S, r, doorU + .3, FL, .6, 2.0, t, { sill: false });
          B(k, S.zarge, doorU - .65, doorU + .65, FL + 2.0, FL + 2.08, -t + .02, .04); PL(k, GLAS, [doorU, FL + 2.2, -.1], 1.1, .22, [0, 0, 0], { layer: 'glass', jit: 0, win: k.winVal() });
          B(k, S.zarge, doorU - .03, doorU + .03, FL + 2.08, FL + 2.35, -.12, -.04); B(k, S.zarge, doorU - .65, doorU + .65, FL + 2.3, FL + 2.4, -t + .02, .05);
          for (const sx of [-1, 1]) wallLamp(k, doorU + sx * .9, 2.35, .28);
          B(k, 0x3a2a20, doorU + 1.0, doorU + 1.45, 1.05, 1.65, 0, .04); B(k, 0x2a2a2a, doorU + 1.03, doorU + 1.42, 1.08, 1.62, .04, .045, NO); for (let i = 0; i < 5; i++) B(k, 0xe8e4dc, doorU + 1.08, doorU + 1.08 + r.R(.12, .3), 1.5 - i * .09, 1.53 - i * .09, .045, .05, NO);
          // Name über der Tür
          B(k, 0x2a3a2a, doorU - .85, doorU + .85, G0 - .55, G0 - .22, 0, .05); let lx = doorU - .75; while (lx < doorU + .7) { const lw = r.R(.07, .12); B(k, GOLD, lx, lx + lw, G0 - .48, G0 - .29, .05, .06, NO); lx += lw + (r.p(.15) ? .1 : .035); }
          // Ausleger mit Schild (Bierkrug)
          hangSign(k, -b + .35, 3.45, 1.15, sub => {
            sub.add(TORUS(18, .05, 4), EISEN, [0, -.62, 0], [.42, .42, .42], { r: [0, PI / 2, 0], ao: false });
            sub.in([0, -.62, 0], PI / 2, () => {
              B(sub, 0x2a4a2a, -.3, .3, -.28, .28, -.025, .025); B(sub, GOLD, -.32, .32, .26, .3, -.03, .03, NO); B(sub, GOLD, -.32, .32, -.3, -.26, -.03, .03, NO);
              for (const z of [-.03, .03]) { const sg = Math.sign(z); B(sub, 0xe8b830, -.12, .1, -.18, .1, z, z + sg * .012, NO); B(sub, 0xf4f0e6, -.14, .12, .08, .17, z, z + sg * .014, NO); B(sub, 0xe8b830, .1, .18, -.1, .04, z, z + sg * .012, NO); }
            });
          }, 'schild');
        }
      });
    }
    plinth(k, r, a, b, FL);
    // Dach mit zwei Gauben und zwei Schornsteinen
    const chim = { x: -.55, z: -1.3, w: .55 }, R = roof(k, r, a, b, Ye, th, .45, .45, { col: V.pick(ZIEGEL), chim });
    for (const s of 'RL') onWall(k, s, a, b, () => { gableWall(k, MIX(putz, 0xffffff, .5), a, Ye, th, t, { u: 0, W: .6, v0: Ye + .5, H: .75 }); win(k, S, r, 0, Ye + .5, .6, .75, t, { shutters: true, room: { vF: Ye, vC: Ye + 1.5, depth: .6, items: ['lamp'], plain: true } }); const bc = C(balken); for (const sx of [-1, 1]) k.beam(bc, [sx * (a - .1), Ye + .05, .02], [0, Ye + a * Math.tan(th) - .05, .02], .1, { w: .14, d: .06 }); B(k, bc, -a, a, Ye, Ye + .14, -.02, .05); B(k, bc, -.85, .85, Ye + 1.38, Ye + 1.5, -.02, .045); });
    k.spot('smoke', [chim.x, chimney(k, r, chim.x, chim.z, chim.w, Ye + (a - Math.abs(chim.x) - chim.w / 2) * Math.tan(th), R.yA + .6), chim.z]);
    for (const gz of [-1.2, 1.1]) k.in([a - .25, 0, gz], 0, () => {                                                  // Gauben
      const dy = Ye - .25, dh = .95, dw = .5;
      for (const sz of [-1, 1]) B(k, MIX(putz, 0xffffff, .5), -.9, .3, dy, dy + dh, sz * dw - .08 * (sz > 0), sz * dw + .08 * (sz < 0), { ao: false, jit: .02 });
      onWall(k, 'F', .3, dw, () => { wallPieces(k, MIX(putz, 0xffffff, .5), -dw, dw, dy, dy + dh, .08, [{ a: -.27, b: .27, lo: dy + .2, hi: dy + .8 }], r); win(k, S, r, 0, dy + .2, .54, .6, .08, { room: { vF: dy, vC: dy + dh, depth: .5, items: ['lamp'], plain: true } }); });
      k.in([-.3, 0, 0], PI / 2, () => { roof(k, r, dw, .6, dy + dh, .75, .12, .06, { col: ZIEGEL[1], sT: .06 }); onWall(k, 'R', dw, .6, () => gableWall(k, MIX(putz, 0xffffff, .5), dw, dy + dh, .75, .08)); });
    });
    // Treppe vor der Tür
    for (let i = 0; i < 2; i++) B(k, C(0x9a958c, r.R(.95, 1.05)), a + i * .32, a + .34 + i * .32, -.3, FL - .02 - i * .17, -doorU - .85 + i * .1, -doorU + .85 - i * .1, { jit: .05 });
    k.pop();
    // Biergarten (lokal +z), Kies, Tische, Lichterkette
    const tabs = [[-.35, 2.75, 0, true], [-1.95, 3.0, .1, false], [-.95, 4.0, -.15, true], [.85, 3.85, .05, false]], used = [];
    const UMB = [[0xd83a3a, 0xf4efe6], [0x2a6a4a, 0xf4efe6], [0x2a4a8a, 0xf4efe6]];
    for (const [x, z, a2, um] of tabs) if (G.free(x, z, .85) && G.free(x - .7, z, .5) && G.free(x + .7, z, .5)) { G.on(x, z, a2, () => { k.ball(0xb8a888, [0, -.09, 0], [1.05, .1, .9], { jit: .1, ao: false }); beerTable(k, r, um, UMB[used.length % 3]); }); used.push([x, z]); }
    const poles = [[1.45, 2.05], [1.45, 4.5], [-2.85, 4.15], [-2.85, 2.05]].filter(([x, z]) => G.free(x, z, .15));
    const ph = 2.6, ptop = poles.map(([x, z]) => [x, G.h(x, z) + ph, z]);
    for (const [x, z] of poles) G.on(x, z, 0, () => { k.cyl(HOLZ_D, [0, -.3, 0], .06, ph + .35, 6); k.ball(HOLZ_D, [0, ph + .06, 0], .07, NO); });
    const house = [hx + a + .02, 2.6, hz + b - .3], houseB = [hx - a - .02, 2.6, hz + b - .3];
    if (ptop.length >= 2) { for (let i = 0; i < ptop.length - 1; i++) lightString(k, ptop[i], ptop[i + 1], .35, 10); lightString(k, house, ptop[0], .3, 6); lightString(k, houseB, ptop[ptop.length - 1], .3, 7); if (ptop.length === 4) lightString(k, ptop[0], ptop[2], .55, 14); }
    k.spot('light', [-.6, 2.4, 3.2]);
    // Fässer hinter dem Haus
    G.on(-2.55, -1.1, PI / 2, () => { barrelLying(k, [0, 0, -.32], 0, .85); barrelLying(k, [0, 0, .32], 0, .85); barrelLying(k, [0, .5, 0], 0, .8); });
    G.on(-2.5, .2, 0, () => { barrel(k, [0, 0, 0], .95, 0x6a4a2a); crate(k, [.05, .82, 0], .3, .9, [0x3a6a3a, 0x6a3a1a]); });
    G.on(-2.45, -2.4, 0, () => { barrel(k, [0, 0, 0], .9, 0x7a5a3a); });
    G.on(1.7, 2.75, .3, () => { for (const s2 of [-1, 1]) k.cyl(HOLZ_D, [-.3, -.2, s2 * .5], .05, 1.3, 6); B(k, HOLZ_D, -.35, -.25, 1.0, 1.08, -.55, .55); B(k, 0x2a2a2a, -.34, -.28, .45, 1.0, -.45, .45); B(k, 0xe8e4dc, -.28, -.275, .5, .95, -.4, .4, NO); });   // Tafel
    k.spot('door', [hx + a + 1.0, 0, hz - doorU]);
  });
  const taken = [[0, 0, 4.6]];
  scatter(k, F, 1, 1.2, (x, y, z) => N.leafTree(k, [x, y, z], 1.05), 30, taken);
  meadowOut(k, F, 4.3, .6);
}

// =====================================================================================================
// Sägewerk: offene Halle mit Gattersäge (bewegt), Schwungrad, Rundholz-Stapel, Bretterstapel, Späne, Ladekran
// =====================================================================================================
function logEnd(k, p, ax, rr) { const rot2 = ax === 'x' ? [0, 0, -Math.sign(p[3] || 1) * PI / 2] : [Math.sign(p[3] || 1) * PI / 2, 0, 0]; k.add(DISC(7), 0xd0b080, [p[0], p[1], p[2]], [rr * .96, 1, rr * .96], { r: rot2, ao: false }); k.add(DISC(7), 0xb08a5a, [p[0] + (ax === 'x' ? .002 * Math.sign(p[3] || 1) : 0), p[1], p[2] + (ax === 'z' ? .002 * Math.sign(p[3] || 1) : 0)], [rr * .45, 1, rr * .45], { r: rot2, ao: false }); }
function trunk(k, r, a, b, rr, col) { tube(k, C(col, r.R(.85, 1.1)), a, b, rr, 7, { jit: .1 }); const ax = Math.abs(b[0] - a[0]) > Math.abs(b[2] - a[2]) ? 'x' : 'z', i = ax === 'x' ? 0 : 2; logEnd(k, [a[0] - (ax === 'x' ? .002 * Math.sign(b[0] - a[0]) : 0), a[1], a[2] - (ax === 'z' ? .002 * Math.sign(b[2] - a[2]) : 0), -Math.sign(b[i] - a[i])], ax, rr); logEnd(k, [b[0], b[1], b[2], Math.sign(b[i] - a[i])], ax, rr); }
export function tile_saege(k, F, ctx) {
  const r = RNG(ctx.seed, 'saege'), ry = rot(firstEdge(ctx.E, 'r')), LOG = 0x7a5a3a;
  site(k, F, 0, 0, 3.0, ry, G => {
    const a = 1.35, b = 2.55, Ye = 2.65, th = .5;
    // Bühne (Bretterboden auf Steinen)
    for (let x = -a - .1; x < a + .1; x += .5) for (const z of [-b, 0, b]) k.box(0x8f8b84, [x + .25, -.3, z], [.25, .38, .25], { jit: .06 });
    for (let z = -b - .1, i = 0; z < b + .1; z += .2, i++) B(k, C(0x9a7a52, r.R(.82, 1.08)), -a - .15, a + .15 + r.R(-.03, .03), .02, .08, z, z + .19, { jit: .06 });
    k.detail(() => { for (let i = 0; i < 30; i++) k.box(0xe0c890, [r.R(-a, a), .085, r.R(-b, b)], [r.R(.05, .15), .01, r.R(.03, .08)], { r: [0, r.R(0, 3), 0], ao: false }); });   // Späne (Kleinkram)
    // Pfosten, Pfetten, Kopfbänder, Dach
    for (const x of [-a, a]) for (const z of [-b, -b / 3, b / 3, b]) { k.box(C(0x5a4030, r.R(.9, 1.05)), [x, .05, z], [.18, Ye - .05, .18], { jit: .05 }); for (const sg of [-1, 1]) if (Math.abs(z + sg * .5) < b) k.beam(0x5a4030, [x, Ye - .7, z], [x, Ye - .15, z + sg * .5], .09); }
    for (const x of [-a, a]) B(k, 0x5a4030, x - .1, x + .1, Ye - .2, Ye, -b - .1, b + .1, { jit: .04 });
    for (const z of [-b, -b / 3, b / 3, b]) B(k, 0x5a4030, -a, a, Ye - .18, Ye - .02, z - .08, z + .08, { jit: .04 });
    roof(k, r, a, b, Ye, th, .5, .4, { kind: 'schindel', col: r.pick([0x6e5e4e, 0x7a6a58]), unter: 0x8a6a4a });
    for (const s of 'RL') onWall(k, s, a, b, () => boardGable(k, r, 0x7a6048, a, Ye, th, null));
    // Gleis mit Wagen und Stamm
    for (const x of [-.32, .32]) B(k, EISEN, x - .03, x + .03, .08, .14, -b - .3, b + .3, NO);
    for (let z = -b - .2; z < b + .3; z += .5) B(k, HOLZ_D, -.5, .5, .06, .1, z - .06, z + .06);
    k.in([0, .14, -1.2], 0, () => {
      B(k, 0x5a4a3a, -.4, .4, .08, .2, -.9, .9); for (const z of [-.7, .7]) for (const x of [-.32, .32]) k.cyl(EISEN, [x - .03, .08, z], .08, .06, 8, { r: [0, 0, PI / 2], ao: false });
      for (const z of [-.8, .8]) { B(k, EISEN, -.35, -.25, .2, .55, z - .04, z + .04); B(k, EISEN, .25, .35, .2, .55, z - .04, z + .04); }
      trunk(k, r, [0, .48, -1.1], [0, .48, 1.05], .28, LOG);
      for (let i = 0; i < 4; i++) B(k, 0xe8d0a0, -.2 + i * .13 - .004, -.2 + i * .13 + .004, .22, .74, .55, 1.06, NO);   // Schnittfugen
    });
    // Gattersäge: Gestell fest, Gatter bewegt sich auf und ab
    for (const x of [-.55, .55]) { k.box(0x5a4030, [x, .08, 0], [.2, 3.0, .24], { jit: .04 }); for (const sz of [-1, 1]) k.beam(0x5a4030, [x, .08, sz * .7], [x, 1.2, 0], .1); }
    B(k, 0x5a4030, -.7, .7, 2.9, 3.1, -.14, .14); B(k, 0x5a4030, -.7, .7, .06, .26, -.16, .16);
    k.part('gatter', [0, 1.35, 0], s => {
      B(s, 0x4a3a2a, -.45, .45, -.55, -.45, -.06, .06); B(s, 0x4a3a2a, -.45, .45, .75, .85, -.06, .06);
      for (const x of [-.45, .45]) B(s, 0x4a3a2a, x - .05, x + .05, -.55, .85, -.06, .06);
      for (let i = 0; i < 4; i++) { const x = -.2 + i * .13; B(s, 0xc8ccd0, x - .004, x + .004, -.45, .75, -.05, .05, NO); for (let j = 0; j < 8; j++) k.prism && s.prism(0xb8bcc0, [x, -.4 + j * .14, -.05], .01, .03, .02, { r: [PI / 2, 0, 0], ao: false }); }
      B(s, EISEN, -.04, .04, -1.3, -.55, -.03, .03);                                                        // Pleuel
    }, { bob: .12 });
    // Schwungrad mit Riemen
    k.part('rad', [-.95, .95, 0], s => {
      s.add(TORUS(16, .1, 4), 0x3a3a3c, [0, 0, 0], [.7, .7, .7], { r: [0, PI / 2, 0] }); s.cyl(0x3a3a3c, [-.08, 0, 0], .12, .16, 8, { r: [0, 0, PI / 2] });
      for (let i = 0; i < 6; i++) { const aa = i / 6 * TAU; s.beam(0x3a3a3c, [0, 0, 0], [0, Math.sin(aa) * .66, Math.cos(aa) * .66], .045); }
    }, { spin: [1, 0, 0], speed: 2.2 });
    for (const sz of [-1, 1]) B(k, 0x5a4030, -1.1, -.8, -.3, .95, sz * .25 - .06, sz * .25 + .06);
    k.cyl(EISEN, [-1.15, .95, 0], .04, .7, 6, { r: [0, 0, -PI / 2], ao: false });
    tube(k, 0x3a2a20, [-.95, 1.62, -.03], [-.5, 2.85, -.03], .02, 4, NO); tube(k, 0x3a2a20, [-.95, .28, .03], [-.5, 2.85, .03], .02, 4, NO);
    // Werkbank mit Sägen, Laterne
    k.in([1.05, 0, 1.7], 0, () => { B(k, HOLZ, -.25, .25, .75, .8, -.6, .6); for (const z of [-.5, .5]) for (const x of [-.2, .2]) B(k, HOLZ_D, x - .03, x + .03, .08, .75, z - .03, z + .03); k.box(0xc8ccd0, [0, .8, .1], [.04, .01, .6], { r: [0, .2, 0] }); k.beam(HOLZ_H, [.0, .82, -.25], [.0, .82, -.45], .04); });
    k.in([a + .01, 0, b / 3 + .3], PI / 2, () => wallLamp(k, 0, 2.15, .25));
    // Rundholz-Stapel hinten mit Kran
    G.on(-2.35, 0, 0, () => {
      for (const z of [-1.6, 1.6]) B(k, HOLZ_D, -.7, .7, -.2, .12, z - .1, z + .1);
      const rows = [[-.5, -.2, .1, .3], [-.38, .1, .38, .58]]; let y = .12 + .21;
      const xs = [[-.48, -.16, .16, .48], [-.32, 0, .32], [-.16, .16]];
      xs.forEach((row, j) => { for (const x of row) trunk(k, r, [x, y, -1.85 + r.R(-.1, .1)], [x, y, 1.85 + r.R(-.1, .1)], .17 * r.R(.9, 1.08), LOG); y += .29; });
      // Kran: zwei Böcke, Querbalken, Flaschenzug mit Haken
      for (const z of [-1.3, 1.3]) { k.beam(0x5a4030, [-.75, -.2, z], [0, 2.9, z], .12); k.beam(0x5a4030, [.75, -.2, z], [0, 2.9, z], .12); B(k, 0x5a4030, -.4, .4, 1.2, 1.3, z - .05, z + .05); }
      B(k, 0x5a4030, -.1, .1, 2.85, 3.05, -1.5, 1.5);
      k.cyl(EISEN, [0, 2.6, .4], .1, .25, 8); k.add(TORUS(8, .25, 3), EISEN, [0, 2.95, .4], [.06, .06, .06], NO);
      for (let i = 0; i < 9; i++) k.add(TORUS(6, .3, 3), 0x5a5a5e, [0, 2.55 - i * .09, .4], [.035, .045, .035], { r: [0, i % 2 ? PI / 2 : 0, 0], ao: false });
      k.add(ARC(8, .2, PI * 1.4), EISEN, [0, 1.7, .4], [.08, .08, .08], { r: [0, 0, PI * .9], ao: false });
    });
    // Bretterstapel mit Stapellatten (lokal +z vorne/hinten)
    for (const [x0, z0] of [[-.6, 3.2], [-1.85, 2.4]]) if (G.free(x0, z0, .8)) G.on(x0, z0, .05, () => {
      for (const x of [-.7, 0, .7]) B(k, HOLZ_D, x - .06, x + .06, -.2, .1, -.55, .55);
      for (let j = 0; j < 7; j++) { const y = .1 + j * .095; for (let i = 0; i < 5; i++) B(k, C(0xd8b888, r.R(.85, 1.08)), -.95 + r.R(-.03, .03), .95 + r.R(-.03, .03), y, y + .05, -.55 + i * .22, -.55 + i * .22 + .2, { jit: .05 }); for (const x of [-.7, 0, .7]) B(k, HOLZ_A, x - .025, x + .025, y + .05, y + .095, -.58, .58, NO); }
      B(k, HOLZ_G, -1.05, 1.05, .1 + 7 * .095, .1 + 7 * .095 + .03, -.62, .62, { jit: .05 });
    });
    // Sägespäne-Haufen, Schubkarre, Wendehaken
    if (G.free(1.7, -2.6, .7)) G.on(1.7, -2.6, 0, () => { k.cone(0xe0c890, [0, -.1, 0], .75, .6, 9, { jit: .08 }); for (let i = 0; i < 8; i++) { const aa = r.R(0, TAU), d = r.R(.5, .9); k.box(0xe8d4a0, [Math.cos(aa) * d, .01, Math.sin(aa) * d], [.12, .02, .08], { r: [0, aa, 0], ao: false }); } k.beam(HOLZ_H, [.2, .2, .1], [.7, .9, .35], .025); B(k, 0x6a6e72, .66, .8, .85, 1.05, .3, .42); });
    G.on(1.85, 1.0, -.3, () => { k.beam(HOLZ_H, [0, .05, 0], [.1, 1.2, .25], .03); k.add(ARC(8, .12, PI), EISEN, [.06, .7, .14], [.15, .15, .15], { r: [0, PI / 2, 0], ao: false }); });
    k.spot('door', [2.6, 0, 0]);
  });
  const taken = [[0, 0, 3.9]];
  scatter(k, F, 2, 1.2, (x, y, z) => N.pine(k, [x, y, z], k.R(.8, 1)), 30, taken);
  scatter(k, F, 2, .4, (x, y, z) => N.stump(k, [x, y, z]), 20, taken);
  meadowOut(k, F, 3.6, .5);
}

// =====================================================================================================
// Burgturm auf Felsen: runder Bergfried mit Zinnen, Schießscharten, Holztor, Mauerrest, Fahne, Fackeln
// =====================================================================================================
// Steinring (Turmschale) zwischen y0 und y1 mit Radius R; skip(a, y) lässt Öffnungen frei
function stoneRing(k, r, R, y0, y1, o = {}) {
  const ch = o.ch ?? .3, cols = o.cols || STEIN; let row = 0;
  for (let y = y0; y < y1 - .05; y += ch, row++) {
    const h = Math.min(ch, y1 - y) - .03, n = Math.max(6, Math.round(TAU * R / (o.len ?? .5))), off = (row % 2) * .5 + r.R(-.1, .1);
    for (let i = 0; i < n; i++) {
      const a = (i + off) / n * TAU; if (o.skip && o.skip(a, y + h / 2)) continue;
      const L = TAU * R / n - .03, d = r.R(.06, .12), c = C(r.pick(cols), r.R(.85, 1.1));
      k.in([Math.cos(a) * R, y + .015, Math.sin(a) * R], -a + PI / 2, () => k.add(WSTONE(), o.moss && y < y0 + .6 && r.p(.25) ? MIX(c, MOOS, .4) : c, [0, 0, d / 2 - .03], [L, h, d + .03], { r: [r.R(-.02, .02), r.R(-.03, .03), r.R(-.02, .02)], jit: .07 }));
    }
  }
}
function torch(k, p, a) {
  k.in(p, -a, () => {
    B(k, EISEN, -.02, .02, -.12, .12, -.05, .05); k.beam(EISEN, [0, 0, 0], [.22, .05, 0], .025); k.beam(EISEN, [0, -.1, 0], [.18, .02, 0], .02);
    k.add(TORUS(8, .2, 3), EISEN, [.22, .06, 0], [.06, .06, .06], { r: [PI / 2, 0, 0], ao: false });
    k.cyl(0x5a3a22, [.22, -.2, 0], .035, .42, 6, { top: 1.3, r: [0, 0, -.12] }); k.cyl(0x2a2422, [.25, .2, 0], .055, .1, 6, NO);
    k.cone(0xff8a20, [.25, .28, 0], .09, .3, 6, { layer: 'glow', tag: 2, ao: false, sway: .3 }); k.cone(0xffd060, [.25, .28, 0], .05, .2, 5, { layer: 'glow', tag: 2, ao: false, sway: .3 });
    k.spot('light', [.25, .35, 0]);
  });
}
export function tile_burg(k, F, ctx) {
  const r = RNG(ctx.seed, 'burg'), ry = rot(ctx.o);
  const y0 = groundMax(F, 0, 0, 2.8), c = Math.cos(ry), s = Math.sin(ry);
  k.push([0, y0, 0], ry); k.ground = y0;
  // Felsen: Brocken im Kreis, Plateau
  const RT = 1.65, top = 1.05, RC = [0x8f8b84, 0x7d7a74, 0x9a958c, 0x86827a, 0x76726c];
  k.layer = 'bldg';
  k.cyl(0x7d7a74, [0, -.8, 0], 2.1, 1.6 + top, 9, { top: .85, jit: .08 });
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + .2 + r.R(-.15, .15), d = r.R(1.85, 2.5), sc = r.R(.75, 1.15); if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < .45) continue; k.ball(C(r.pick(RC), r.R(.9, 1.08)), [Math.cos(a) * d, r.R(-.2, .35) + top * .3, Math.sin(a) * d], [sc, sc * r.R(.65, 1), sc * r.R(.8, 1.1)], { dod: true, r: [r.R(0, 1), r.R(0, 6), 0], jit: .12 }); if (r.p(.45)) k.ball(MOOS, [Math.cos(a) * d, sc * .7 + top * .3, Math.sin(a) * d], [sc * .5, .06, sc * .45], { tag: TAG.grass, ao: false }); }
  for (let i = 0; i < 9; i++) { const a = r.R(.5, TAU - .5), d = r.R(1.4, 2.0), sc = r.R(.6, .95); k.ball(C(r.pick(RC), r.R(.9, 1.05)), [Math.cos(a) * d, top - sc * .35, Math.sin(a) * d], [sc, sc * .6, sc], { dod: true, r: [0, r.R(0, 6), 0], jit: .1 }); }
  k.cyl(0x86827a, [0, top - .1, 0], 2.2, .12, 10, { jit: .06 });
  k.cyl(0x6a8a40, [0, top + .02, 0], 2.15, .02, 10, { ao: false, tag: TAG.grass, r: [0, .3, 0] });
  // Turm
  const H = 7.6, yb = top, yt = yb + H, door = { a: 0, w: .5, h: 1.75 };
  k.cyl(MOERTEL, [0, yb - .3, 0], RT - .05, H + .3, 14, { jit: .03 });
  const slits = [[.9, 2.0], [2.6, 3.2], [4.4, 2.6], [1.7, 4.6], [3.5, 5.6], [5.4, 4.2], [.2, 6.4], [3.0, 7.0]];
  const winA = [[1.2, 5.2], [4.9, 6.2]];
  stoneRing(k, r, RT, yb - .25, yt, { ch: .3, len: .48, moss: true, skip: (a, y) => {
    const da = q => Math.abs(Math.atan2(Math.sin(a - q), Math.cos(a - q)));
    if (da(door.a) < .36 && y < yb + door.h + .5) return true;
    for (const [sa, sy] of slits) if (da(sa) < .11 && Math.abs(y - (yb + sy)) < .45) return true;
    for (const [wa, wy] of winA) if (da(wa) < .2 && y > yb + wy - .1 && y < yb + wy + .85) return true;
    return false; } });
  // Schießscharten (dunkler Schlitz mit Laibung)
  for (const [sa, sy] of slits) k.in([Math.cos(sa) * (RT - .02), yb + sy, Math.sin(sa) * (RT - .02)], -sa, () => { B(k, 0x141210, -.02, .02, -.4, .4, -.03, .03, NO); B(k, 0x141210, -.02, .02, -.04, .04, -.12, .12, NO); for (const sg of [-1, 1]) B(k, C(0xa8a296), -.02, .1, -.45, .45, sg * .08 - .03, sg * .08 + .03, NO); B(k, C(0xb0aa9e), -.02, .12, -.48, -.42, -.12, .12, NO); });
  // Fenster mit Rundbogen und Kammer
  for (const [wa, wy] of winA) k.in([Math.cos(wa) * (RT + .12), yb + wy, Math.sin(wa) * (RT + .12)], -wa + PI / 2, () => {
    for (const sg of [-1, 1]) B(k, C(0xa8a296), sg * .17 - .03, sg * .17 + .03, 0, .55, -.16, .02, NO);
    win(k, { frame: 0x5a3a22, sill: 0xb0aa9e, gardine: 0xc84a3a }, r, 0, 0, .34, .55, .12, { bars: true, curtain: false, glass: 0x4a5a68 });
    for (let i = 0; i <= 6; i++) { const t2 = i / 6 * PI; k.box(C(0xb0aa9e, r.R(.95, 1.05)), [Math.cos(t2) * .22, .5 + Math.sin(t2) * .22, -.04], [.1, .12, .14], { r: [0, 0, t2 - PI / 2], jit: .04 }); }
    B(k, C(0xb0aa9e), -.28, .28, -.08, 0, -.05, .1);
  });
  // Tor mit Rundbogen
  k.in([RT - .1, yb, 0], 0, () => {
    k.in([0, 0, 0], PI / 2, () => {});
    B(k, 0x1a1614, -.3, .1, 0, door.h, -door.w, door.w, NO);
    const n = 6; for (let i = 0; i < n; i++) B(k, C(0x6a4428, r.R(.85, 1.08)), .06, .16, 0, door.h - .02, -door.w + i * 2 * door.w / n + .005, -door.w + (i + 1) * 2 * door.w / n - .005, { jit: .06 });
    for (const y of [.35, 1.35]) B(k, EISEN, .16, .18, y, y + .08, -door.w, door.w, NO);
    for (let i = 0; i < 12; i++) k.ball(EISEN, [.18, .2 + (i % 4) * .4, -door.w + .12 + Math.floor(i / 4) * .38], .022, NO);
    k.add(TORUS(8, .2, 3), EISEN, [.19, 1.0, .25], [.07, .07, .07], { r: [0, PI / 2, 0], ao: false });
    for (let i = 0; i <= 8; i++) { const t2 = i / 8 * PI; k.box(C(0xb8b2a6, r.R(.95, 1.05)), [.12, door.h + Math.sin(t2) * (door.w + .1), Math.cos(t2) * (door.w + .1)], [.3, .14, .2], { r: [PI / 2 - t2, 0, 0], jit: .04 }); }
    k.add(tpl('halfdisc', () => new THREE.CircleGeometry(1, 8, 0, PI).rotateY(PI / 2)), 0x5a3a22, [.13, door.h, 0], [1, door.w, door.w], { ao: false });
    for (const sg of [-1, 1]) B(k, C(0xb0aa9e), 0, .3, 0, door.h, sg * (door.w + .04) - .1, sg * (door.w + .04) + .1, { jit: .05 });
    B(k, C(0xa8a296), .1, .45, -.08, .02, -door.w - .1, door.w + .1);
    for (const sg of [-1, 1]) torch(k, [.32, 1.75, sg * (door.w + .38)], 0);
    k.spot('door', [1.6, -top + .05, 0]);
  });
  // Holztreppe den Felsen hinauf
  for (let i = 0; i < 5; i++) { const x = RT + .45 + i * .32, y = top - (i + 1) * top / 5.5; B(k, C(0x7a5a3a, r.R(.9, 1.05)), x - .16, x + .16, y - .05, y + .03, -.5, .5, { jit: .06 }); for (const sg of [-1, 1]) B(k, HOLZ_D, x - .03, x + .03, y - .6, y, sg * .45 - .03, sg * .45 + .03); }
  for (const sg of [-1, 1]) { k.beam(HOLZ_D, [RT + .35, top + .9, sg * .48], [RT + 1.85, .7, sg * .48], .05); for (let i = 0; i < 3; i++) { const x = RT + .45 + i * .6; B(k, HOLZ_D, x - .03, x + .03, top - i * .3 - .2, top - i * .3 + .75, sg * .48 - .03, sg * .48 + .03); } }
  // Konsolen, Wehrgang, Zinnen
  const RB = RT + .28;
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; k.in([Math.cos(a) * RT, yt - .45, Math.sin(a) * RT], -a, () => { for (let j = 0; j < 3; j++) B(k, C(0xa8a296, r.R(.95, 1.05)), -.02, .1 + j * .1, j * .14, j * .14 + .14, -.1, .1, { jit: .04 }); }); }
  k.cyl(0x9a958c, [0, yt - .03, 0], RB, .14, 18, { jit: .03 });
  stoneRing(k, r, RB - .12, yt + .11, yt + .65, { ch: .27, len: .42 });
  k.cyl(MOERTEL, [0, yt + .11, 0], RB - .14, .5, 18, { jit: .03 });
  k.cyl(0x6a6258, [0, yt + .1, 0], RB - .3, .02, 18, NO);
  const nM = 10;
  for (let i = 0; i < nM; i++) { const a = i / nM * TAU; k.in([Math.cos(a) * (RB - .1), yt + .65, Math.sin(a) * (RB - .1)], -a + PI / 2, () => { B(k, C(r.pick(STEIN), r.R(.9, 1.06)), -.22, .22, 0, .55, -.16, .1, { jit: .06 }); B(k, C(0xb0aa9e), -.24, .24, .55, .62, -.18, .12, { jit: .04 }); B(k, 0x141210, -.025, .025, .1, .42, .09, .105, NO); }); }
  // Fahnenmast mit Fahne (weht)
  k.cyl(HOLZ_D, [0, yt + .1, 0], .05, 3.0, 6); k.ball(GOLD, [0, yt + 3.15, 0], .07, NO);
  const FC = r.pick([[0xc83a2a, 0xf2c43a], [0x2a4a8a, 0xf4efe6], [0x2a6a3a, 0xf2c43a], [0x7a2a5a, 0xf4efe6]]);
  k.part('fahne', [0, yt + 2.95, 0], sb => {
    for (let i = 0; i < 4; i++) { const x0 = .05 + i * .28; sb.box(i % 2 ? FC[0] : C(FC[0], .92), [x0 + .14, -.75 + i * .015, 0], [.28, .72 - i * .03, .02], { r: [0, Math.sin(i * 1.3) * .25, 0], ao: false, sway: .3 + i * .2 }); }
    sb.box(FC[1], [.45, -.5, .012], [.3, .25, .005], { ao: false, sway: .5 }); sb.box(FC[1], [.45, -.5, -.012], [.3, .25, .005], { ao: false, sway: .5 });
  }, { swing: [0, 1, 0], amp: .35, speed: .9 });
  // Efeu am Turm
  for (let i = 0; i < 22; i++) { const a = r.R(2.0, 4.0), y = yb + r.R(0, 4.2) * (1 - r.f() * .4); k.ball(C(r.pick([0x3f7a34, 0x4a8a3a, 0x356a2e]), r.R(.9, 1.1)), [Math.cos(a) * (RT + .06), y, Math.sin(a) * (RT + .06)], [.22, .2, .22], { tag: TAG.leaf, sway: .1, jit: .15 }); }
  // Mauerrest um den Turm (gebrochene Krone)
  const ra = 2.35, a0 = 2.2, a1 = 4.6, nW = 12;
  for (let i = 0; i < nW; i++) {
    const aa = a0 + (a1 - a0) * (i + .5) / nW, L = (a1 - a0) / nW * ra + .02, hh = Math.max(.3, 1.6 * Math.sin((i + .5) / nW * PI) * r.R(.55, 1.15));
    k.in([Math.cos(aa) * ra, top - .2, Math.sin(aa) * ra], -aa + PI / 2, () => {
      B(k, MOERTEL, -L / 2, L / 2, -.4, hh, -.22, .22, { jit: .05 });
      for (const sg of [-1, 1]) k.in([0, 0, sg * .22], sg > 0 ? 0 : PI, () => stones(k, r, -L / 2, L / 2, -.35, hh, { ch: .26, len: [.2, .4], moss: .3 }));
      for (let j = 0; j < 2; j++) k.box(C(r.pick(STEIN), r.R(.9, 1.05)), [r.R(-L / 3, L / 3), hh, r.R(-.1, .1)], [r.R(.2, .35), .14, r.R(.2, .3)], { r: [r.R(-.2, .2), r.R(0, 1), r.R(-.2, .2)], jit: .08 });
      if (r.p(.5)) k.ball(MOOS, [0, hh + .07, 0], [L * .4, .05, .2], { tag: TAG.grass, ao: false });
    });
  }
  for (let i = 0; i < 4; i++) { const aa = r.R(a0, a1), d = ra + r.R(.4, .8); k.box(C(r.pick(STEIN), r.R(.9, 1.05)), [Math.cos(aa) * d, top - .25, Math.sin(aa) * d], [.32, .22, .26], { r: [r.R(-.3, .3), r.R(0, 3), r.R(-.3, .3)], jit: .08 }); }
  k.layer = 'base'; k.ground = 0; k.pop();
  // Umgebung: Bergkiefern, Gras, Blumen
  const taken = [[0, 0, 3.2]];
  scatter(k, F, 3, .9, (x, y, z) => N.pine(k, [x, y, z], k.R(.6, .85)), 30, taken);
  scatter(k, F, 3, .6, (x, y, z) => N.rock(k, [x, y, z], k.R(.5, .9)), 20, taken);
  meadowOut(k, F, 3.2, .7);
}

// =====================================================================================================
// Musikpavillon im Park: achteckig, Säulen, Geländer, Glockendach mit Spitze, Notenständer und Instrumente,
// Blumenbeete, Parkbänke, Laternen, Hecke
// =====================================================================================================
function chair(k, p, ry, c = 0x6a4a30) {
  k.in(p, ry, () => { B(k, c, -.18, .18, .42, .46, -.18, .18); for (const [x, z] of [[-.15, -.15], [.15, -.15], [-.15, .15], [.15, .15]]) B(k, c, x - .02, x + .02, 0, .42, z - .02, z + .02); for (const z of [-.15, .15]) B(k, c, -.19, -.15, .42, .9, z - .02, z + .02); B(k, c, -.19, -.15, .7, .88, -.17, .17); });
}
function musicStand(k, p, ry) {
  k.in(p, ry, () => { for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; k.beam(0x2a2a2a, [0, .25, 0], [Math.cos(a) * .2, 0, Math.sin(a) * .2], .012, NO); } k.cyl(0x2a2a2a, [0, .25, 0], .012, .85, 4, NO); k.box(0x2a2a2a, [.02, 1.05, 0], [.015, .32, .42], { r: [0, 0, .35] }); k.box(0xf4f0e6, [.04, 1.07, 0], [.005, .28, .36], { r: [0, 0, .35], ao: false }); for (let i = 0; i < 4; i++) k.box(0x3a3a3a, [.046, 1.0 + i * .045, 0], [.003, .005, .3], { r: [0, 0, .35], ao: false }); });
}
export function tile_pavillon(k, F, ctx) {
  const r = RNG(ctx.seed, 'pavillon'), y0 = groundMax(F, 0, 0, 2.3) + .05, R = 1.95, n = 8, ph = .55, PH = 2.55, WOOD = 0xf2efe6, ROOF = r.pick([0x5a9a8a, 0x6a8a9a, 0xa84a3a]);
  const roads = F.rEdges.map(edgeAngle), entries = roads.length ? roads : [edgeAngle(ctx.o)];
  const isEntry = a => entries.some(e => Math.abs(Math.atan2(Math.sin(a - e), Math.cos(a - e))) < PI / n + .01);
  k.push([0, y0, 0], 0); k.ground = y0; k.layer = 'bldg';
  // Sockel aus Steinen, Holzboden
  const RS = R + .12;
  k.cyl(MOERTEL, [0, -.5, 0], RS - .03, ph + .5, n, { r: [0, PI / n, 0] });
  for (let i = 0; i < n; i++) { const a = i / n * TAU, L = 2 * RS * Math.sin(PI / n), am = RS * Math.cos(PI / n); k.in([Math.cos(a) * am, 0, Math.sin(a) * am], -a + PI / 2, () => stones(k, r, -L / 2, L / 2, -.4, ph, { ch: .2, len: [.25, .45], moss: .2 })); }
  k.cyl(0xb8b0a0, [0, ph, 0], RS + .06, .07, n, { r: [0, PI / n, 0], jit: .03 });
  for (let i = -8; i <= 8; i++) { const z = i * .23, half = Math.sqrt(Math.max(0, (R * Math.cos(PI / n) + .05) ** 2 - z * z)); if (half < .1) continue; B(k, C(0xa8845a, r.R(.88, 1.06)), -half, half, ph + .07, ph + .1, z - .11, z + .11, { jit: .05 }); }
  // Treppen zu den Eingängen
  for (const e of entries) k.in([0, 0, 0], -e, () => { for (let i = 0; i < 3; i++) { const x = RS + .15 + i * .3, y = ph - (i + 1) * ph / 3.3; B(k, C(0xb0aa9e, r.R(.94, 1.04)), x - .16, x + .16, -.3, y + .04, -.62, .62, { jit: .05 }); } });
  // Säulen, Bögen, Geländer
  for (let i = 0; i < n; i++) {
    const a = (i + .5) / n * TAU, x = Math.cos(a) * R, z = Math.sin(a) * R;
    k.cyl(WOOD, [x, ph + .1, z], .085, .2, 8); k.cyl(WOOD, [x, ph + .3, z], .06, PH - .45, 8, { top: .85 }); k.cyl(C(WOOD, .95), [x, ph + PH - .15, z], .1, .12, 8);
    for (let j = 0; j < 4; j++) k.box(C(WOOD, .92), [x, ph + .4 + j * .55, z], [.13, .03, .13], { r: [0, -a, 0], ao: false });
  }
  for (let i = 0; i < n; i++) {
    const a0 = (i + .5) / n * TAU, a1 = (i + 1.5) / n * TAU, am = (i + 1) / n * TAU, p0 = [Math.cos(a0) * R, Math.sin(a0) * R], p1 = [Math.cos(a1) * R, Math.sin(a1) * R], L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    k.in([(p0[0] + p1[0]) / 2, ph, (p0[1] + p1[1]) / 2], -am + PI / 2, () => {
      B(k, WOOD, -L / 2, L / 2, PH - .05, PH + .08, -.06, .06);                                                // Rähm
      k.add(ARC(10, .07, PI), WOOD, [0, PH - .05, 0], [L / 2 - .05, .35, .5], { ao: false });                 // Zierbogen
      for (let j = 0; j < 5; j++) { const xx = -L / 2 + (j + 1) * L / 6; B(k, WOOD, xx - .012, xx + .012, PH - .05 - .3 * Math.sqrt(Math.max(0, 1 - (xx / (L / 2 - .05)) ** 2)), PH - .05, -.02, .02, NO); }
      if (!isEntry(am)) { B(k, WOOD, -L / 2, L / 2, .85, .92, -.05, .05); B(k, WOOD, -L / 2, L / 2, .12, .17, -.04, .04); for (let j = 1; j < 9; j++) { const xx = -L / 2 + j * L / 9; k.cyl(WOOD, [xx, .17, 0], .025, .68, 6, { top: .7 }); k.ball(WOOD, [xx, .5, 0], .035, NO); } }
    });
  }
  // Dach: Glockenform aus zwei Kegelringen, Spitze
  const yR = ph + PH + .08;
  k.cyl(C(WOOD, .95), [0, yR, 0], R + .3, .1, n, { r: [0, PI / n, 0] });
  k.cyl(ROOF, [0, yR + .1, 0], R + .38, .45, n, { top: .62, r: [0, PI / n, 0], jit: .04 });
  k.cyl(C(ROOF, .9), [0, yR + .55, 0], (R + .38) * .62, 1.0, n, { top: .18, r: [0, PI / n, 0], jit: .04 });
  for (let i = 0; i < n; i++) { const a = i / n * TAU; k.beam(C(ROOF, .75), [Math.cos(a) * (R + .38), yR + .12, Math.sin(a) * (R + .38)], [Math.cos(a) * (R + .38) * .62, yR + .57, Math.sin(a) * (R + .38) * .62], .05, NO); k.beam(C(ROOF, .75), [Math.cos(a) * (R + .38) * .62, yR + .57, Math.sin(a) * (R + .38) * .62], [Math.cos(a) * (R + .38) * .11, yR + 1.55, Math.sin(a) * (R + .38) * .11], .045, NO); }
  for (let i = 0; i < n * 2; i++) { const a = (i + .5) / (n * 2) * TAU, rr = (R + .38) * Math.cos(PI / n) + .02; k.prism(C(WOOD, .95), [Math.cos(a) * rr, yR + .02, Math.sin(a) * rr], .16, .1, .02, { r: [PI, -a + PI / 2, 0], ao: false }); }   // Zackenblende
  k.cyl(C(ROOF, 1.1), [0, yR + 1.5, 0], .16, .25, 8); k.ball(GOLD, [0, yR + 1.85, 0], .12, { detail: 1, ao: false }); k.cone(GOLD, [0, yR + 1.95, 0], .03, .45, 4, NO);
  k.add(DISC(8), 0xe8e0d0, [0, yR - .001, 0], [R + .25, 1, R + .25], { r: [PI, 0, 0], ao: false });          // Untersicht
  // Lampe innen
  k.cyl(0x2a2a2a, [0, yR - .55, 0], .01, .55, 4, NO); k.cone(0x2a2a2a, [0, yR - .62, 0], .2, .1, 8, NO); k.ball(0xffe2a8, [0, yR - .66, 0], .09, { layer: 'glow', tag: 1, ao: false }); k.spot('light', [0, yR - .7, 0]);
  // Musik: Stühle, Notenständer, Tuba, Pauke, Geige im Kasten
  const fy = ph + .1, back = entries[0] + PI;
  for (let i = 0; i < 4; i++) { const a = back + (i - 1.5) * .6, cx2 = Math.cos(a) * 1.1, cz2 = Math.sin(a) * 1.1; chair(k, [cx2, fy, cz2], -a + PI); musicStand(k, [Math.cos(a) * .55, fy, Math.sin(a) * .55], -a + PI); }
  k.in([Math.cos(back + 1.6) * 1.25, fy, Math.sin(back + 1.6) * 1.25], 0, () => { k.cyl(0xb8862a, [0, 0, 0], .28, .5, 12, { top: .85 }); k.cyl(0xe8e0d0, [0, .5, 0], .25, .02, 12, NO); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; k.box(0x9a6a2a, [Math.cos(a) * .27, .2, Math.sin(a) * .27], [.02, .3, .02], { r: [0, -a, 0], ao: false }); } for (const sg of [-1, 1]) k.beam(0x7a5a3a, [sg * .1, .52, 0], [sg * .25, .7, .15], .012, NO); });
  k.in([Math.cos(back - 1.5) * 1.15, fy, Math.sin(back - 1.5) * 1.15], 0, () => { k.add(TORUS(12, .22, 5), 0xd8b040, [0, .35, 0], [.2, .2, .2], { r: [0, .4, 0], ao: false }); k.add(TORUS(10, .25, 4), 0xd8b040, [0, .35, 0], [.12, .12, .12], { r: [0, .4, 0], ao: false }); tube(k, 0xd8b040, [.05, .5, .02], [.08, .95, .05], .05, 8, { top: 3.5, ao: false }); tube(k, 0xd8b040, [-.1, .2, 0], [-.1, 0, 0], .02, 5, NO); });
  k.in([Math.cos(back) * .2, fy, Math.sin(back) * .2], .7, () => { B(k, 0x3a2418, -.38, .38, 0, .12, -.13, .13); k.ball(0x3a2418, [.3, .06, 0], [.12, .06, .14], NO); B(k, 0x8a2a3a, -.35, .35, .12, .125, -.11, .11, NO); });
  k.layer = 'base'; k.ground = 0; k.pop();
  // Park ringsum: Bänke, Laternen, Beete, Hecke (nur auf freiem Boden)
  const taken = [[0, 0, 2.55]];
  const freeAt = (x, z, rr) => F.free(x, z, rr) && !taken.some(p => Math.hypot(p[0] - x, p[1] - z) < p[2] + rr);
  const ang = []; for (let i = 0; i < 6; i++) ang.push((i + .5) * PI / 3);
  let nb = 0, nl = 0;
  for (const a of ang) {
    const [bx, bz] = polar(a, 3.45);
    if (nb < 3 && freeAt(bx, bz, .6)) { onG(k, F, bx, bz, PI - a, () => { parkBench(k, [0, 0, 0], 0, 1.4, GUSS, 0x8a5a32); sitSpot(k, [.05, .45, 0], 1, 0); }); taken.push([bx, bz, .8]); nb++;
      const [lx, lz] = polar(a, 3.55, 1.05); if (nl < 3 && freeAt(lx, lz, .2)) { onG(k, F, lx, lz, 0, () => streetLamp(k, [0, 0, 0], 2.6)); taken.push([lx, lz, .3]); nl++; }
      const [px, pz] = polar(a, 3.5, -1.0); if (freeAt(px, pz, .2)) onG(k, F, px, pz, 0, () => { k.cyl(0x7a7a72, [0, -.1, 0], .18, .45, 8, { top: 1.3 }); N.bush(k, [0, .35, 0], .45, r.pick([0xe85a8a, 0xf2c43a, 0xffffff])); });
    } else { const [fx, fz] = polar(a, 3.4); if (freeAt(fx, fz, .7)) { flowerBed(k, F, fx, fz, .85, .5, -a + PI / 2, r.pick(BLUME)); taken.push([fx, fz, .95]); } }
  }
  // Hecke am Rand (Stücke, wo frei)
  for (let i = 0; i < 30; i++) { const a = i / 30 * TAU, [x, z] = polar(a, 4.45); if (i % 6 === 5 || !freeAt(x, z, .3)) continue; const hh = r.R(.55, .65); onG(k, F, x, z, -a, () => { k.box(C(0x3f7a34, r.R(.9, 1.1)), [0, -.05, 0], [.5, hh, .95], { tag: TAG.leaf, jit: .12 }); k.box(C(0x4a8a3a, r.R(.9, 1.1)), [0, hh - .06, 0], [.46, .06, .9], { tag: TAG.leaf, jit: .1, ao: false }); }); }
  // Blumen am Sockel
  for (let i = 0; i < 16; i++) { const a = r.R(0, TAU), d = r.R(2.35, 2.7), x = Math.cos(a) * d, z = Math.sin(a) * d; if (F.free(x, z, .05) && !isEntry(a)) N.flower(k, [x, F.h(x, z), z], r.pick(BLUME)); }
  scatter(k, F, 1, 1.2, (x, y, z) => N.leafTree(k, [x, y, z], 1.0), 30, taken);
  meadowOut(k, F, 2.9, .5);
}
