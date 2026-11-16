// Erweiterung Land: Nadelwald, Felsen, Teich, Bachgabelung, Obstwiese, Weinberg, Imkerei, Schafweide, Steinkreis.
// Je Kachelart tile_<art>(k, F, ctx); Gelände ist schon gebaut. Kachel-Koordinaten, Mitte = (0, 0), y = Höhe.
// Volle Detailstufe: Fasen, Kleinteile, Gebrauchsspuren – man zoomt bis 0,3 m heran.
import * as THREE from 'three';
import { TAG } from '../kit.js';
import { INR, WATER_Y, N, scatter, meadow, banks, place, bld, groundMax } from './tilekit.js';

const PI = Math.PI, TAU = PI * 2;

// ---------- Farben ----------
const W = { dark: 0x56402c, mid: 0x7a5636, light: 0x9c7a52, gray: 0x8a7f70, worn: 0x6e5a44, pale: 0xb89a6e, silver: 0x9d968a, tar: 0x3a3230 };
const STONE = [0x9a958c, 0x8c877e, 0xa8a296, 0x827d74, 0x948c80, 0xa09484];
const LIME = [0xb8ab94, 0xa89a82, 0xc4b8a0, 0x9a8e78, 0xb0a088, 0xbcae96];
const CRAG = [0x8e8a84, 0x7f7b75, 0x989389, 0x86817a, 0x77736e];
const MOSS = [0x5a7a38, 0x4f7034, 0x648a3e], LICHEN = [0xc8c070, 0xd8b050, 0xa8b890, 0xe0d8a0, 0xd89a48];
const SPRUCE = [0x24502f, 0x1f4a2c, 0x2a5734, 0x274d33], FIR = [0x2a5a4a, 0x2f6150, 0x26544a];
const IRON = 0x3a3a3e, DARK = 0x1e1a18, ROPE = 0xc8b080;
const shade = (c, f) => ((Math.min(255, ((c >> 16) & 255) * f) | 0) << 16) | ((Math.min(255, ((c >> 8) & 255) * f) | 0) << 8) | (Math.min(255, (c & 255) * f) | 0);

// ---------- Rahmen- und Form-Helfer ----------
const _M = new THREE.Matrix4(), _X = new THREE.Vector3(), _Y = new THREE.Vector3(), _Z = new THREE.Vector3(), _E = new THREE.Euler();
const _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
// Drehung (Euler XYZ), die die y-Achse auf dir legt (x möglichst nach hint)
function alignY(dir, hint) {
  _Y.set(...dir).normalize(); _X.set(...(hint || [1, 0, 0]));
  _Z.crossVectors(_X, _Y); if (_Z.lengthSq() < 1e-6) { _X.set(0, 0, 1); _Z.crossVectors(_X, _Y); }
  _Z.normalize(); _X.crossVectors(_Y, _Z).normalize(); _M.makeBasis(_X, _Y, _Z); _E.setFromRotationMatrix(_M, 'XYZ'); return [_E.x, _E.y, _E.z];
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const len3 = v => Math.hypot(v[0], v[1], v[2]);
// Zylinder von a nach b
function cylAB(k, c, a, b, r, seg = 7, o = {}) { const d = sub(b, a); return k.cyl(c, a, r, len3(d), seg, { ...o, r: alignY(d) }); }
function coneAB(k, c, a, b, r, seg = 6, o = {}) { const d = sub(b, a); return k.cone(c, a, r, len3(d), seg, { ...o, r: alignY(d) }); }
// Flaches Band von a nach b (Breite w waagerecht, Dicke t), z. B. Farnwedel, Bretter
function strip(k, c, a, b, w, t, o = {}) {
  const d = sub(b, a), side = [-d[2], 0, d[0]];
  return k.boxc(c, lerp3(a, b, .5), [w, len3(d), t], { ...o, r: alignY(d, Math.hypot(side[0], side[2]) > 1e-5 ? side : [1, 0, 0]) });
}
// Abstand zum Kachelrand
function room(x, z) { let m = -1e9; for (let i = 0; i < 6; i++) { const a = i * PI / 3; m = Math.max(m, x * Math.cos(a) + z * Math.sin(a)); } return INR - m; }
function groundMin(F, x, z, r) { let m = 9; for (let a = 0; a < 6.28; a += .7) for (const d of [0, r * .5, r]) m = Math.min(m, F.h(x + Math.cos(a) * d, z + Math.sin(a) * d)); return m; }
const on = (k, y, fn) => { const g = k.ground; k.ground = y; fn(); k.ground = g; };
// Bodennormale aus dem Gelände
function gN(F, x, z) { const e = .25, dx = F.h(x + e, z) - F.h(x - e, z), dz = F.h(x, z + e) - F.h(x, z - e), v = [-dx / (2 * e), 1, -dz / (2 * e)], L = len3(v); return v.map(c => c / L); }

// Eigene Vorlagen (für unregelmäßige Steine), Verformung über die Lage → keine Risse an doppelten Ecken
const TP = {};
function tp(name, make) { if (!TP[name]) { let g = make(); g.deleteAttribute('uv'); if (g.index) g = g.toNonIndexed(); g.computeVertexNormals(); TP[name] = g; } return TP[name]; }
function h3(x, y, z, s) { const v = Math.sin(Math.round(x * 997) * 12.9898 + Math.round(y * 991) * 78.233 + Math.round(z * 983) * 37.719 + s * 4.581) * 43758.5453; return v - Math.floor(v); }
function warp(g, s, ax, ay, radial) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (radial) { const f = 1 + (h3(x, y, z, s) - .5) * 2 * ax; p.setXYZ(i, x * f, y * (1 + (h3(z, x, y, s + 3) - .5) * 2 * ay), z * f); }
    else p.setXYZ(i, x + (h3(x, y, z, s) - .5) * 2 * ax, y + (h3(z, y, x, s + 1) - .5) * 2 * ay, z + (h3(y, x, z, s + 2) - .5) * 2 * ax);
  }
  return g;
}
const ROCK = i => tp('rock' + i, () => warp(new THREE.IcosahedronGeometry(1, 1), i + 1, .2, .12, true));
const SLAB = i => tp('slab' + i, () => warp(new THREE.BoxGeometry(1, 1, 1, 2, 1, 2), i + 11, .09, .07, false));
const ICO = d => tp('ico' + d, () => new THREE.IcosahedronGeometry(1, d));
// Behauener Menhir: sechseckig, oben schmaler, grob verformt (Ursprung unten)
const HEWN = (i, seg) => tp('hewn' + i + '_' + seg, () => warp(new THREE.CylinderGeometry(.62, 1, 1, seg, 4).translate(0, .5, 0), i + 21, .07, .025, false));
// Form setzen und die verschobene Geometrie zurückgeben (für Strahltests: Moos, Flechten, Runen, Früchte)
function put(k, geo, c, p, s, o = {}) {
  const g = geo.clone(); _E.set(...(o.r || [0, 0, 0]), o.order || 'XYZ'); _q.setFromEuler(_E);
  _M.compose(_p.set(...p), _q, _s.set(...s)); g.applyMatrix4(_M);
  const { r, order, ...rest } = o; k.add(g, c, [0, 0, 0], [1, 1, 1], rest); return g;
}
const _ray = new THREE.Raycaster(), _rmat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
function hitter(geos) {
  const ms = geos.map(g => { const m = new THREE.Mesh(g, _rmat); m.updateMatrixWorld(); return m; });
  return (o, d) => { _ray.set(new THREE.Vector3(...o), new THREE.Vector3(...d).normalize()); const h = _ray.intersectObjects(ms, false)[0]; return h ? { p: h.point.toArray(), n: h.face.normal.toArray() } : null; };
}
// n Treffer auf der Oberseite einer Form (Richtungen mit y ≥ minY)
function dress(k, hit, c, n, fn, minY = .3, spread = 1) {
  for (let i = 0; i < n; i++) {
    const d = [k.R(-1, 1) * spread, k.R(minY, 1), k.R(-1, 1) * spread], L = len3(d), u = d.map(v => v / L);
    const h = hit([c[0] + u[0] * 8, c[1] + u[1] * 8, c[2] + u[2] * 8], [-u[0], -u[1], -u[2]]);
    if (h) fn(h.p, h.n);
  }
}
// Flecken (Moos/Flechte) auf einer Fläche
function flatAt(hit, p, n, r, tol) {             // liegt der Fleck ganz auf der Fläche?
  const t1 = Math.abs(n[1]) < .9 ? [n[2], 0, -n[0]] : [1, 0, 0], L1 = len3(t1), a = t1.map(v => v / L1);
  const b = [n[1] * a[2] - n[2] * a[1], n[2] * a[0] - n[0] * a[2], n[0] * a[1] - n[1] * a[0]];
  for (const [u, s] of [[a, 1], [a, -1], [b, 1], [b, -1]]) {
    const q = p.map((v, i) => v + u[i] * s * r * .95), h = hit(q.map((v, i) => v + n[i] * .4), n.map(v => -v));
    if (!h || Math.abs((h.p[0] - p[0]) * n[0] + (h.p[1] - p[1]) * n[1] + (h.p[2] - p[2]) * n[2]) > tol) return false;
  }
  return true;
}
function spatch(k, hit, col, p, n, r, th, tag) { if (flatAt(hit, p, n, r, th * .45)) patch(k, col, p, n, r, th, tag); }
function patch(k, col, p, n, r, th, tag = TAG.none) { k.ball(col, p, [r, th, r * k.R(.6, 1)], { r: alignY(n, [n[2], 0, -n[0]]), tag, ao: false, jit: .12 }); }
function boulder(k, p, s, c, o = {}) { return put(k, ROCK(Math.floor(k.rand() * 6)), c ?? k.pick(STONE), p, s, { r: [k.R(-.25, .25), k.R(0, TAU), k.R(-.25, .25)], jit: .07, ...o }); }

// ---------- kleine Natur ----------
function moss(k, p, r, c) { k.ball(c ?? k.pick(MOSS), p, [r, r * .26, r * k.R(.7, 1)], { r: [0, k.R(0, 3), 0], tag: TAG.grass, ao: false, jit: .12 }); }
// flaches Polster dem Hang folgend (Moos, Nadelstreu)
function gpatch(k, F, x, z, col, r, th, tag = TAG.grass) { const n = gN(F, x, z); k.ball(col, [x, F.h(x, z) - th * .25, z], [r, th, r * k.R(.65, 1)], { r: alignY(n, [Math.cos(k.R(0, 6)), 0, Math.sin(k.R(0, 6))]), tag, ao: false, jit: .1 }); }
function bloom(k, p, c, h) { h ??= k.R(.18, .38); k.cyl(0x4f8a3a, p, .012, h, 3, { sway: { k: 1.2 }, swayBase: p[1], ao: false, tag: TAG.grass }); k.ball(c, [p[0], p[1] + h, p[2]], [.055, .035, .055], { sway: { k: 1.2 }, swayBase: p[1], tag: TAG.flower, ao: false }); }
function clover(k, p, c) {             // Kleeblätter + Blütenköpfchen
  for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + k.R(0, 1), d = k.R(.03, .07); k.ball(0x4f8a3a, [p[0] + Math.cos(a) * d, p[1] + .03 + i * .005, p[2] + Math.sin(a) * d], [.04, .006, .035], { r: [0, -a, 0], ao: false, tag: TAG.grass }); }
  k.cyl(0x5a8a3a, p, .006, .07, 3, { ao: false, tag: TAG.grass }); k.ball(c, [p[0], p[1] + .08, p[2]], [.026, .024, .026], { ao: false, tag: TAG.flower });
}
function pebble(k, p, s, c) { k.ball(c ?? k.pick(STONE), [p[0], p[1] + s * .2, p[2]], [s, s * k.R(.45, .7), s * k.R(.6, .9)], { dod: true, r: [k.R(-.3, .3), k.R(0, 6), 0], jit: .1 }); }
function fernF(k, p, s = 1) {
  const n = 6 + Math.floor(k.R(0, 3)), c0 = k.pick([0x4a8a3a, 0x569440, 0x3f7a34]);
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + k.R(-.25, .25), L = k.R(.38, .6) * s, ca = Math.cos(a), sa = Math.sin(a), c = shade(c0, k.R(.9, 1.1));
    const P0 = [p[0] + ca * .03, p[1] + .01, p[2] + sa * .03], P1 = [p[0] + ca * L * .45, p[1] + L * .6, p[2] + sa * L * .45], P2 = [p[0] + ca * L * .85, p[1] + L * .52, p[2] + sa * L * .85], P3 = [p[0] + ca * L * 1.1, p[1] + L * .28, p[2] + sa * L * 1.1];
    const o = { tag: TAG.grass, sway: { k: .9 }, swayBase: p[1], ao: false, jit: .08 };
    strip(k, c, P0, P1, .1 * s, .012, o); strip(k, c, P1, P2, .14 * s, .012, o); strip(k, c, P2, P3, .07 * s, .012, o);
  }
  if (k.rand() < .5) for (let i = 0; i < 2; i++) { const a = k.R(0, TAU); k.cyl(0x6a8a3a, [p[0] + Math.cos(a) * .06, p[1], p[2] + Math.sin(a) * .06], .012, .18 * s, 3, { ao: false, tag: TAG.grass }); k.ball(0x6a8a3a, [p[0] + Math.cos(a) * .06, p[1] + .19 * s, p[2] + Math.sin(a) * .06], .025, { ao: false }); }  // eingerollte Triebe
}
function bolete(k, p, s = 1) {        // Steinpilz
  k.cyl(0xe8dcc0, p, .045 * s, .1 * s, 6, { top: .75, ao: false });
  k.ball(k.pick([0x7a4a2a, 0x8a5a32, 0x6a3e24]), [p[0], p[1] + .11 * s, p[2]], [.085 * s, .05 * s, .085 * s], { ao: false });
}
function blueberry(k, p) {
  for (let i = 0; i < 3; i++) k.ball(k.pick([0x3a6a3a, 0x416f3c, 0x355f36]), [p[0] + k.R(-.15, .15), p[1] + .1, p[2] + k.R(-.15, .15)], [.17, .12, .17], { tag: TAG.leaf, sway: .3, jit: .15 });
  for (let i = 0; i < 7; i++) k.ball(0x3a3a8a, [p[0] + k.R(-.2, .2), p[1] + k.R(.08, .2), p[2] + k.R(-.2, .2)], .022, { ao: false, tag: TAG.flower });
}
function cone_(k, p, ry) { k.ball(k.pick([0x6a4a2a, 0x7a5432]), [p[0], p[1] + .025, p[2]], [.025, .025, .06], { r: [0, ry, 0], ao: false, jit: .15 }); }

// ---------- Bäume ----------
function spruce(k, p, s = 1, fir = false) {
  const [x, y, z] = p, h = (5 + k.R(0, 2.5)) * s, c = k.pick(fir ? FIR : SPRUCE), bark = fir ? 0x7a7268 : 0x5a3e2a;
  k.cyl(bark, [x, y - .1, z], .19 * s, h * .9, 7, { top: .25 });
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + k.R(0, .8); k.beam(bark, [x + Math.cos(a) * .08 * s, y + .18 * s, z + Math.sin(a) * .08 * s], [x + Math.cos(a) * .42 * s, y - .06, z + Math.sin(a) * .42 * s], .09 * s); }
  for (let i = 0; i < 3; i++) { const a = k.R(0, TAU), yy = y + h * k.R(.1, .2); k.beam(0x4a3626, [x, yy, z], [x + Math.cos(a) * .55 * s, yy + k.R(-.12, .15), z + Math.sin(a) * .55 * s], .03 * s, { ao: false }); }  // dürre Äste
  const n = fir ? 6 + Math.floor(k.R(0, 2)) : 7 + Math.floor(k.R(0, 3)), nd = { tag: TAG.needle, sway: { k: .08 / s }, swayBase: y, jit: .14 };
  for (let i = 0; i < n; i++) {
    const t = i / n, yy = y + h * (.2 + t * .64), r = (1.45 - t * 1.15) * s * k.R(.88, 1.08), hh = h * (fir ? .2 : .25);
    k.cone(shade(c, .92 + t * .2), [x + k.R(-.05, .05), yy, z + k.R(-.05, .05)], r, hh, fir ? 8 : 7, { ...nd, r: [k.R(-.05, .05), k.R(0, 1), k.R(-.05, .05)] });
    if (fir) k.cyl(shade(c, .75), [x, yy - .06 * s, z], r * 1.02, .08 * s, 8, { ...nd, top: .85 });     // Tanne: dichter Astkranz unten
  }
  k.cone(c, [x, y + h * .84, z], .3 * s, h * .22, 6, nd);
  for (let i = 0; i < (fir ? 4 : 5); i++) {               // Zapfen: Fichte hängend, Tanne stehend
    const a = k.R(0, TAU), t = fir ? .82 : k.R(.68, .8), r = (1.45 - t * 1.15) * s * .55, yy = y + h * (.2 + t * .64);
    if (fir) k.ball(0x5a4a3a, [x + Math.cos(a) * r, yy + .12 * s, z + Math.sin(a) * r], [.035 * s, .09 * s, .035 * s], { ao: false, sway: { k: .08 / s }, swayBase: y });
    else k.ball(0x7a4a2a, [x + Math.cos(a) * r, yy - .02, z + Math.sin(a) * r], [.035 * s, .09 * s, .035 * s], { ao: false, sway: { k: .08 / s }, swayBase: y });
  }
}
// Bergkiefer: krummer, rötlicher Stamm, schirmartige Nadelbüschel
function mountainPine(k, p, s = 1, maxR = 9) {
  const [x, y, z] = p, nd = { tag: TAG.needle, sway: { k: .07 / s }, swayBase: y, jit: .15 };
  const lim = (T, m) => { const dx = T[0] - x, dz = T[2] - z, d = Math.hypot(dx, dz), M = maxR - m; if (d > M && d > 0) { T[0] = x + dx / d * Math.max(0, M); T[2] = z + dz / d * Math.max(0, M); } return T; };
  const la = k.R(0, TAU); let P = [x, y - .12, z], r = .15 * s; const tips = [];
  for (let i = 0; i < 3; i++) {
    const a = la + k.R(-.9, .9), Q = lim([P[0] + Math.cos(a) * .26 * s, P[1] + k.R(.6, .8) * s, P[2] + Math.sin(a) * .26 * s], .8 * s);
    cylAB(k, i < 1 ? 0x6a4a34 : 0x9a5a3a, P, Q, r, 6, { top: .82 }); k.ball(i < 1 ? 0x6a4a34 : 0x9a5a3a, Q, r * .85, { ao: false });
    if (i > 0) for (let j = 0; j < 2; j++) { const b = k.R(0, TAU), L = k.R(.45, .8) * s, T = lim([Q[0] + Math.cos(b) * L, Q[1] + k.R(.05, .3) * s, Q[2] + Math.sin(b) * L], .75 * s); cylAB(k, 0x8a5a3a, Q, T, r * .5, 5); tips.push(T); }
    P = Q; r *= .78;
  }
  tips.push([P[0], P[1] + .1 * s, P[2]]);
  for (const T of tips) for (let j = 0; j < 3; j++) { const rr = k.R(.42, .62) * s * (j ? .75 : 1); const B = lim([T[0] + k.R(-.2, .2) * s, T[1] + .02 * s + j * .1 * s, T[2] + k.R(-.2, .2) * s], rr + .05); k.ball(k.pick([0x2f5a34, 0x3a6a3a, 0x2a5030, 0x335e37]), B, [rr, rr * .36, rr], { ...nd, detail: 0, r: [0, k.R(0, 3), 0] }); }
  for (let i = 0; i < 3; i++) { const T = k.pick(tips); k.ball(0x7a5a3a, [T[0] + k.R(-.15, .15), T[1] - .05, T[2] + k.R(-.15, .15)], [.03, .05, .03], { ao: false }); }   // Zapfen
}
// Latsche: niedriges Krummholz
function latsche(k, p, s = 1) {
  for (let i = 0; i < 4; i++) { const a = k.R(0, TAU), L = k.R(.4, .8) * s; cylAB(k, 0x6a4a34, [p[0], p[1] + .02, p[2]], [p[0] + Math.cos(a) * L, p[1] + .25 * s, p[2] + Math.sin(a) * L], .05 * s, 5); }
  for (let i = 0; i < 5; i++) { const rr = k.R(.3, .48) * s; k.ball(k.pick([0x2f5a34, 0x3a6a3a, 0x335e37]), [p[0] + k.R(-.6, .6) * s, p[1] + .25 * s, p[2] + k.R(-.6, .6) * s], [rr, rr * .5, rr], { tag: TAG.needle, sway: .25, jit: .15 }); }
}
// Trauerweide: dicker Stamm, Krone und herabhängende Ruten
function willow(k, F, p, s = 1, lean = 0) {
  const [x, y, z] = p, bark = 0x6a5e4e;
  const top = [x + Math.cos(lean) * .45 * s, y + 1.8 * s, z + Math.sin(lean) * .45 * s];
  cylAB(k, bark, [x, y - .15, z], top, .3 * s, 8, { top: .72, jit: .1 });
  for (let i = 0; i < 3; i++) { const a = k.R(0, TAU), yy = k.R(.3, 1.3) * s; k.ball(shade(bark, .9), lerp3([x, y, z], top, yy / (1.8 * s)), [.22 * s, .18 * s, .22 * s], { jit: .12 }); }  // Knorren
  for (let i = 0; i < 4; i++) { const a = k.R(0, TAU), b = Math.cos(a) * .2; k.beam(bark, [x, y + .1, z], [x + Math.cos(a) * .55 * s, y - .08, z + Math.sin(a) * .55 * s], .13 * s); }  // Wurzeln
  const C = [top[0], top[1] + 1.25 * s, top[2]], leaf = { tag: TAG.leaf, sway: { k: .04 / s }, swayBase: y, jit: .12 };
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + k.R(0, .6), E = [C[0] + Math.cos(a) * .9 * s, C[1] - .1 * s, C[2] + Math.sin(a) * .9 * s]; cylAB(k, bark, top, E, .12 * s, 6, { top: .6 }); }
  for (let i = 0; i < 7; i++) { const a = k.R(0, TAU), d = k.R(0, .8) * s; k.ball(k.pick([0x8ab84a, 0x7aa840, 0x9cc85a]), [C[0] + Math.cos(a) * d, C[1] + k.R(-.1, .45) * s, C[2] + Math.sin(a) * d], [k.R(.8, 1.05) * s, .55 * s, k.R(.8, 1.05) * s], leaf); }
  for (let i = 0; i < 120; i++) {                // Ruten
    const a = k.R(0, TAU), d = Math.sqrt(k.R(.08, 1)) * 1.85 * s, px = C[0] + Math.cos(a) * d, pz = C[2] + Math.sin(a) * d;
    const yb = C[1] + .45 * s * (1 - (d / (2.1 * s)) ** 2) - .1 * s;
    const floor = Math.max(F.h(px, pz), WATER_Y) + .22, L = Math.min(k.R(1.3, 2.5) * s, yb - floor);
    if (L > .3) k.cone(k.pick([0x8ab84a, 0x9cc85a, 0x7aa840, 0xa0c860, 0x86b048]), [px, yb, pz], k.R(.045, .07) * s, L, 3, { r: [PI, k.R(0, 2), 0], tag: TAG.leaf, sway: .35, ao: false, jit: .1 });
  }
}
// Obstbaum: Kalkanstrich, knorrige Äste, runde Krone mit Früchten (kind: apfel | birne | kirsche)
function fruitTree(k, p, s, kind, young) {
  const [x, y, z] = p, h = (young ? 1.2 : 1.5 + k.R(0, .35)) * s, la = k.R(0, TAU), lt = young ? 0 : k.R(.05, .22);
  const T = [x + Math.cos(la) * lt, y + h, z + Math.sin(la) * lt], bark = kind === 'kirsche' ? 0x5a3a32 : 0x6a5038;
  cylAB(k, bark, [x, y - .1, z], T, (young ? .07 : .16) * s, 7, { top: .78, jit: .1 });
  if (!young) {
    cylAB(k, 0xeae6da, [x, y - .05, z], lerp3([x, y, z], T, .42), .168 * s, 7, { top: .9, jit: .04 });     // Kalkanstrich
    for (let i = 0; i < 2; i++) k.ball(shade(bark, .85), lerp3([x, y, z], T, k.R(.5, .9)), [.07 * s, .09 * s, .07 * s], { jit: .1 });
    for (let i = 0; i < 3; i++) { const a = k.R(0, TAU); k.beam(bark, [x, y + .08, z], [x + Math.cos(a) * .35 * s, y - .05, z + Math.sin(a) * .35 * s], .09 * s); }
  } else {                                      // Baumpfahl mit Bindung
    k.cyl(W.pale, [x + .18, y - .2, z], .035, 1.55, 6); k.cyl(0x6a8a4a, [x + .09, y + .9, z], .1, .04, 6, { ao: false }); k.cyl(0x6a8a4a, [x + .09, y + .5, z], .1, .04, 6, { ao: false });
  }
  const Rc = (young ? .65 : kind === 'birne' ? 1.05 : kind === 'kirsche' ? 1.3 : 1.22) * s * k.R(.92, 1.06), C = [T[0], T[1] + Rc * (kind === 'birne' ? .95 : .7), T[2]];
  const nb = young ? 3 : 5;
  for (let i = 0; i < nb; i++) { const a = i / nb * TAU + k.R(-.3, .3), E = [T[0] + Math.cos(a) * Rc * .7, T[1] + Rc * k.R(.45, .8), T[2] + Math.sin(a) * Rc * .7]; cylAB(k, bark, T, E, .07 * s * (young ? .5 : 1), 5, { top: .55 }); }
  const lc = kind === 'kirsche' ? [0x4f8a3a, 0x457f36, 0x55903c] : kind === 'birne' ? [0x6aa848, 0x62a044, 0x74b04e] : [0x5fa040, 0x58983c, 0x66a845];
  const leaf = { tag: TAG.leaf, sway: { k: .05 / s }, swayBase: y, jit: .13 }, geos = [];
  const sy = kind === 'birne' ? 1.2 : .82;
  geos.push(put(k, ICO(1), k.pick(lc), C, [Rc, Rc * sy, Rc], { ...leaf, r: [0, k.R(0, 3), 0] }));
  for (let i = 0; i < (young ? 3 : 7); i++) {
    const a = i / 7 * TAU + k.R(-.3, .3), e = k.R(-.25, .55), rr = Rc * k.R(.42, .58);
    geos.push(put(k, ICO(0), k.pick(lc), [C[0] + Math.cos(a) * Math.cos(e) * Rc * .72, C[1] + Math.sin(e) * Rc * sy * .7, C[2] + Math.sin(a) * Math.cos(e) * Rc * .72], [rr, rr * .9, rr], { ...leaf, r: [k.R(0, 3), k.R(0, 3), 0] }));
  }
  const hit = hitter(geos), fsw = { sway: { k: .05 / s }, swayBase: y, ao: false };
  const fruitC = kind === 'kirsche' ? [0xa0102a, 0xb81830, 0x8a0c24] : kind === 'birne' ? [0xd8c84a, 0xc8c040, 0xe0b848] : k.rand() < .6 ? [0xd8302a, 0xc82a24, 0xe04a2a, 0xe8a02a] : [0xc8d040, 0xd8c040, 0xe8b02a];
  dress(k, hit, C, young ? 6 : kind === 'kirsche' ? 34 : 24, (q, n) => {
    const c = k.pick(fruitC), out = kind === 'kirsche' ? .02 : .045;
    const f = [q[0] + n[0] * out, q[1] + n[1] * out - .02, q[2] + n[2] * out];
    if (kind === 'kirsche') { k.ball(c, f, .028, fsw); k.ball(c, [f[0] + .05, f[1] - .01, f[2]], .028, fsw); k.beam(0x4a6a2a, [f[0] + .025, f[1] + .08, f[2]], f, .006, fsw); }
    else if (kind === 'birne') { k.ball(c, f, [.055, .06, .055], fsw); k.ball(c, [f[0], f[1] + .07, f[2]], .036, fsw); k.cyl(0x5a4a2a, [f[0], f[1] + .09, f[2]], .006, .04, 3, fsw); }
    else { k.ball(c, f, [.065, .058, .065], fsw); k.cyl(0x5a4a2a, [f[0], f[1] + .05, f[2]], .006, .03, 3, fsw); }
  }, -.35, 1);
  return { C, Rc, T };
}

// ---------- Holz- und Hofkleinkram ----------
function bench(k, p, ry = 0, L = 1.4) {        // Sitz nach +z
  k.in(p, ry, () => {
    for (const s of [-1, 1]) { k.box(W.dark, [s * (L / 2 - .15), -.08, .02], [.08, .52, .36]); k.box(W.dark, [s * (L / 2 - .15), -.08, -.18], [.07, .98, .06]); k.box(W.dark, [s * (L / 2 - .15), .26, .02], [.07, .05, .4]); }
    for (let i = 0; i < 3; i++) k.box(i === 1 ? W.pale : W.light, [k.R(-.01, .01), .44, -.12 + i * .13], [L, .04, .11], { jit: .07 });
    for (let i = 0; i < 2; i++) k.box(W.light, [0, .58 + i * .16, -.205], [L, .1, .03], { jit: .07 });
    k.beam(W.dark, [-L / 2 + .15, .12, -.12], [L / 2 - .15, .12, -.12], .05);
    for (const s of [-1, 1]) k.box(IRON, [s * (L / 2 - .15), .43, .16], [.09, .015, .02], { ao: false });   // Schrauben-Blech
  });
}
function barrel(k, p, s = 1, c = W.mid) {
  const [x, y, z] = p;
  k.cyl(c, [x, y, z], .26 * s, .35 * s, 10, { top: 1.12, jit: .05 }); k.cyl(c, [x, y + .35 * s, z], .29 * s, .35 * s, 10, { top: .9, jit: .05 });
  for (const yy of [.06, .3, .4, .64]) k.cyl(IRON, [x, y + yy * s, z], (yy < .2 || yy > .6 ? .27 : .295) * s + .012, .04 * s, 10, { ao: false });
  k.cyl(0x6a4a30, [x, y + .7 * s, z], .25 * s, .012, 10, { ao: false });
  k.cyl(0x4a3626, [x + .1 * s, y + .712 * s, z], .03 * s, .012, 6, { ao: false });     // Spund
}
// liegendes Fass auf Lager, Achse entlang local x
function barrelLying(k, p, ry, s = 1) {
  k.in(p, ry, () => {
    for (const sx of [-1, 1]) { k.box(W.dark, [sx * .25 * s, 0, 0], [.1 * s, .1 * s, .62 * s]); k.box(W.dark, [sx * .25 * s, .1 * s, .24 * s], [.1 * s, .08 * s, .1 * s]); k.box(W.dark, [sx * .25 * s, .1 * s, -.24 * s], [.1 * s, .08 * s, .1 * s]); }
    const yc = .4 * s, rx = [0, 0, -PI / 2];
    k.cyl(W.mid, [-.38 * s, yc, 0], .25 * s, .38 * s, 10, { top: 1.14, r: rx, jit: .05 }); k.cyl(W.mid, [0, yc, 0], .285 * s, .38 * s, 10, { top: .877, r: rx, jit: .05 });
    // r: [0,0,-PI/2] → Zylinder-y zeigt nach +x
    for (const xx of [-.33, -.1, .1, .33]) k.cyl(IRON, [xx * s - .02 * s, yc, 0], (Math.abs(xx) > .2 ? .27 : .295) * s + .012, .04 * s, 10, { r: rx, ao: false });
    for (const sx of [-1, 1]) k.cyl(0x6a4a30, [sx * .38 * s - (sx > 0 ? 0 : .012), yc, 0], .24 * s, .012, 10, { r: rx, ao: false });
    k.cyl(0x8a6a48, [.39 * s, yc - .12 * s, 0], .03 * s, .06 * s, 6, { r: rx, ao: false });                 // Zapfhahn
    k.box(0x4a3020, [0, yc + .28 * s, 0], [.05 * s, .02, .05 * s], { ao: false });                        // Spund
  });
}
function basket(k, p, fill, s = 1) {       // Weidenkorb mit Henkel
  const [x, y, z] = p;
  k.cyl(0xa8804a, [x, y, z], .21 * s, .24 * s, 9, { top: 1.18, jit: .14 });
  for (const yy of [.06, .14]) k.cyl(0x8a6438, [x, y + yy * s, z], (.218 + yy * .19) * s, .025 * s, 9, { ao: false, jit: .1 });
  k.cyl(0x7a5a32, [x, y + .23 * s, z], .255 * s, .035 * s, 9, { ao: false });
  for (let i = 0; i <= 6; i++) { const a = i / 6 * PI, b = (i + 1) / 6 * PI; if (i < 6) k.beam(0x8a6438, [x + Math.cos(a) * .24 * s, y + (.25 + Math.sin(a) * .3) * s, z], [x + Math.cos(b) * .24 * s, y + (.25 + Math.sin(b) * .3) * s, z], .022 * s, { ao: false }); }
  if (fill) for (let i = 0; i < 9; i++) { const a = k.R(0, TAU), d = k.R(0, .15) * s; k.ball(k.pick(fill), [x + Math.cos(a) * d, y + (.24 + k.R(0, .06)) * s, z + Math.sin(a) * d], .06 * s, { ao: false, jit: .08 }); }
}
function crate(k, p, ry, fill, s = 1) {
  k.in(p, ry, () => {
    const w = .55 * s, h = .32 * s, d = .4 * s;
    k.box(0x4a3626, [0, .02, 0], [w - .04, h - .04, d - .04]);
    for (const yy of [.02, h * .55]) for (const zz of [-1, 1]) k.box(k.pick([W.pale, 0xa8885e, 0xb8986a]), [0, yy, zz * d / 2], [w, h * .38, .02], { jit: .08 });
    for (const xx of [-1, 1]) k.box(0xa8885e, [xx * w / 2, 0, 0], [.025, h, d], { jit: .08 });
    for (const xx of [-1, 1]) for (const zz of [-1, 1]) k.box(0x8a6a48, [xx * (w / 2 - .02), 0, zz * (d / 2 - .02)], [.04, h + .01, .04], { ao: false });
    if (fill) for (let i = 0; i < 10; i++) k.ball(k.pick(fill), [k.R(-w * .36, w * .36), h - .02, k.R(-d * .32, d * .32)], .06 * s, { ao: false, jit: .08 });
  });
}
function ladder(k, A, B, w = .42) {
  const d = sub(B, A), L = len3(d), side = [-d[2], 0, d[0]], sl = Math.hypot(side[0], side[2]) || 1, sx = side[0] / sl * w / 2, sz = side[2] / sl * w / 2;
  for (const s of [-1, 1]) k.beam(W.pale, [A[0] + sx * s, A[1], A[2] + sz * s], [B[0] + sx * s, B[1], B[2] + sz * s], .05, { jit: .06 });
  for (let t = .25; t < L - .1; t += .3) { const q = lerp3(A, B, t / L); k.beam(W.light, [q[0] - sx * 1.1, q[1], q[2] - sz * 1.1], [q[0] + sx * 1.1, q[1], q[2] + sz * 1.1], .035, { ao: false }); }
}
function bucket(k, p, fill) {
  k.cyl(0x9aa0a4, p, .13, .24, 9, { top: 1.25, jit: .04 }); k.cyl(0x7a8084, [p[0], p[1] + .23, p[2]], .165, .025, 9, { ao: false });
  for (const yy of [.05, .17]) k.cyl(0x8a9094, [p[0], p[1] + yy, p[2]], .14 + yy * .1, .015, 9, { ao: false });
  if (fill) k.cyl(fill, [p[0], p[1] + .2, p[2]], .145, .02, 9, { ao: false });
  for (let i = 0; i < 6; i++) { const a = i / 6 * PI, b = (i + 1) / 6 * PI; k.beam(IRON, [p[0] + Math.cos(a) * .16, p[1] + .25 + Math.sin(a) * .18, p[2]], [p[0] + Math.cos(b) * .16, p[1] + .25 + Math.sin(b) * .18, p[2]], .01, { ao: false }); }
}
// Bretterwand entlang local z bei x = 0 (Bretter senkrecht), y0…y1
function boards(k, z0, z1, y0, y1, o = {}) {
  const bw = o.bw ?? .17, cols = o.cols || [W.mid, W.light, W.worn, 0x8a6a48];
  for (let z = z0; z < z1 - .02; z += bw) {
    const zb = Math.min(z + bw, z1), top = typeof y1 === 'function' ? y1(z + bw / 2) : y1;
    if (o.skip && o.skip((z + zb) / 2)) continue;
    k.box(k.pick(cols), [0, y0, (z + zb) / 2], [o.t ?? .04, top - y0 + k.R(-.02, .02), zb - z - .012], { jit: .06 });
    if (k.rand() < .1) k.box(0x5a4a3a, [.022, y0 + k.R(.2, top - y0 - .2), (z + zb) / 2], [.01, .04, .04], { ao: false });   // Astloch
  }
}

// ---------- Nadelwald ----------
function hochsitz(k) {
  const H = 2.45, b = .72, t = .5, hw = y => b + (t - b) * (y + .3) / (H + .35);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cylAB(k, W.silver, [sx * b, -.3, sz * b], [sx * t, H + .02, sz * t], .065, 6, { jit: .06 });
  for (const sz of [-1, 1]) { k.beam(W.gray, [-hw(.3), .3, sz * (hw(.3) + .06)], [hw(1.9), 1.9, sz * (hw(1.9) + .06)], .06); k.beam(W.gray, [hw(.3), .3, sz * (hw(.3) + .06)], [-hw(1.9), 1.9, sz * (hw(1.9) + .06)], .06); }
  for (const sx of [-1, 1]) k.beam(W.gray, [sx * (hw(1.2) + .06), 1.2, -hw(1.2)], [sx * (hw(1.2) + .06), 1.2, hw(1.2)], .06);
  for (let i = 0; i < 7; i++) k.box(k.pick([W.light, W.pale, W.gray]), [-.6 + i * .2, H, 0], [.18, .05, 1.25], { jit: .07 });   // Boden
  for (const sz of [-1, 1]) k.box(W.gray, [0, H - .1, sz * .55], [1.3, .1, .08]);
  // Kanzel
  const cy = H + .05;
  k.in([-.6, cy, 0], 0, () => boards(k, -.62, .62, 0, 1.05, { cols: [W.gray, W.silver, W.worn] }));
  for (const sz of [-1, 1]) k.in([0, cy, sz * .6], PI / 2, () => boards(k, -.62, .62, 0, z => 1.05 - (z + .62) / 1.24 * .0, { cols: [W.gray, W.silver, W.worn] }));
  k.in([.6, cy, 0], PI, () => boards(k, -.62, .62, 0, .55, { cols: [W.gray, W.silver, W.worn] }));   // Brüstung vorn (Schießfenster darüber)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(W.dark, [sx * .58, cy, sz * .58], [.07, sx > 0 ? 1.35 : 1.15, .07]);
  k.box(W.dark, [.6, cy + .55, 0], [.08, .06, 1.24]);
  // Pultdach mit Dachpappe und Leisten
  k.in([0, cy + 1.27, 0], 0, () => {
    k.boxc(DARK, [0, 0, 0], [1.6, .05, 1.55], { r: [0, 0, .14] });
    for (let i = 0; i < 5; i++) k.boxc(0x2e2a28, [0, .035, -.66 + i * .33], [1.62, .02, .04], { r: [0, 0, .14], ao: false });
    for (const sz of [-1, 1]) k.boxc(W.dark, [0, -.05, sz * .76], [1.62, .08, .04], { r: [0, 0, .14] });
  });
  ladder(k, [1.75, -.05, 0], [.62, H + .5, 0], .44);
  k.box(0x6a6a5e, [-.4, cy, -.4], [.3, .42, .3]);                   // Sitzkiste
}
function antHill(k, p) {
  const [x, y, z] = p, r = k.R(.45, .6);
  k.ball(0x6e5034, [x, y - .05, z], [r, r * .85, r], { detail: 1, jit: .16 });
  k.ball(0x7a5a38, [x + .05, y + r * .3, z], [r * .7, r * .55, r * .7], { jit: .2 });
  for (let i = 0; i < 26; i++) { const a = k.R(0, TAU), e = k.R(.15, 1.2), q = [x + Math.cos(a) * Math.cos(e) * r * .92, y - .05 + Math.sin(e) * r * .8, z + Math.sin(a) * Math.cos(e) * r * .92]; k.beam(k.pick([0x8a6a48, 0x9a7a52, 0x5a4030]), q, [q[0] + k.R(-.1, .1), q[1] + k.R(-.03, .03), q[2] + k.R(-.1, .1)], .012, { ao: false }); }
  for (let i = 0; i < 12; i++) { const a = k.R(0, TAU), d = k.R(.1, r * 1.5), yy = d < r * .9 ? y - .05 + Math.sqrt(Math.max(0, 1 - (d / r) ** 2)) * r * .85 : y + .005; k.box(DARK, [x + Math.cos(a) * d, yy, z + Math.sin(a) * d], [.03, .012, .012], { r: [0, a, 0], ao: false }); }
}
function fallenLog(k, F, x, z, a, L) {
  const ca = Math.cos(a), sa = Math.sin(a), r = k.R(.2, .27), pts = [];
  for (let i = 0; i <= 6; i++) { const t = i / 6 - .5; pts.push([x + ca * L * t, z + sa * L * t]); }
  const hA = F.h(...pts[0]), hB = F.h(...pts[6]); let lift = -9;
  pts.forEach((q, i) => { lift = Math.max(lift, F.h(...q) - (hA + (hB - hA) * i / 6)); });
  const A = [pts[0][0], hA + lift + r * .82, pts[0][1]], B = [pts[6][0], hB + lift + r * .82, pts[6][1]], dir = [ca, 0, sa], side = [-sa, 0, ca];
  const P = t => lerp3(A, B, t);
  k.ground = Math.min(hA, hB);
  cylAB(k, 0x5e4630, A, B, r, 8, { jit: .1 });
  for (let i = 0; i < 4; i++) { const t0 = k.R(.1, .7), q0 = P(t0), q1 = P(t0 + .2), w = k.R(-1, 1); k.beam(0x4a3626, [q0[0] + side[0] * r * .9 * w, q0[1] + r * Math.sqrt(1 - w * w * .8), q0[2] + side[2] * r * .9 * w], [q1[0] + side[0] * r * .9 * w, q1[1] + r * Math.sqrt(1 - w * w * .8), q1[2] + side[2] * r * .9 * w], .035, { ao: false }); }  // Rindenrisse
  // Wurzelteller bei A
  const C0 = [A[0] - ca * .05, A[1] + .3, A[2] - sa * .05];
  cylAB(k, 0x5a4632, C0, [C0[0] - ca * .32, C0[1], C0[2] - sa * .32], .78, 9, { jit: .18, top: .85 });
  for (let i = 0; i < 9; i++) { const b = k.R(0, TAU), Lr = k.R(.75, 1.1), e = [side[0] * Math.cos(b) * Lr, Math.sin(b) * Lr, side[2] * Math.cos(b) * Lr]; k.beam(0x5a4030, [C0[0] - ca * .2, C0[1], C0[2] - sa * .2], [C0[0] - ca * k.R(.25, .5) + e[0], C0[1] + e[1], C0[2] - sa * k.R(.25, .5) + e[2]], k.R(.04, .08)); }
  for (let i = 0; i < 4; i++) k.ball(0x4a3a28, [C0[0] - ca * .36 + side[0] * k.R(-.4, .4), C0[1] + k.R(-.3, .4), C0[2] - sa * .36 + side[2] * k.R(-.4, .4)], [.2, .16, .2], { jit: .2 });
  pebble(k, [C0[0] - ca * .38 + side[0] * .2, C0[1] + .1, C0[2] - sa * .38 + side[2] * .2], .14);
  // Bruchende B: Splitter
  k.cyl(0xb89868, B, r * .97, .02, 8, { r: alignY(dir), ao: false });
  for (let i = 0; i < 6; i++) { const w = k.R(-.6, .6), v = k.R(-.6, .6), q = [B[0] + side[0] * r * w, B[1] + r * v, B[2] + side[2] * r * w]; coneAB(k, k.pick([0xc9a878, 0xb89868, 0xd8b888]), [q[0] - ca * .02, q[1], q[2] - sa * .02], [q[0] + ca * k.R(.12, .35), q[1] + k.R(-.03, .05), q[2] + sa * k.R(.12, .35)], k.R(.04, .07), 4, { ao: false }); }
  // Astreste, Moos, Baumpilze
  for (let i = 0; i < 3; i++) { const q = P(k.R(.2, .85)), s = k.rand() < .5 ? 1 : -1; k.beam(0x4a3626, [q[0], q[1] + r * .5, q[2]], [q[0] + side[0] * s * .45, q[1] + k.R(.2, .5), q[2] + side[2] * s * .45], .045); }
  for (let i = 0; i < 5; i++) { const q = P(k.R(.08, .92)); moss(k, [q[0] + side[0] * k.R(-.08, .08), q[1] + r * .88, q[2] + side[2] * k.R(-.08, .08)], k.R(.16, .28)); }
  for (let i = 0; i < 5; i++) { const q = P(k.R(.15, .9)), s = k.rand() < .5 ? 1 : -1, yy = k.R(-.35, .35) * r; k.cyl(k.pick([0xc8a070, 0xe8d8b0, 0xa87a48]), [q[0] + side[0] * s * r * .92, q[1] + yy, q[2] + side[2] * s * r * .92], k.R(.06, .1), .028, 7, { top: .85, ao: false }); }
  if (k.rand() < .7) for (let i = 0; i < 3; i++) { const q = P(k.R(.3, .7)); N.mushroom(k, [q[0] + side[0] * (r + .12 + i * .07), F.h(q[0] + side[0] * (r + .12), q[2] + side[2] * (r + .12)), q[2] + side[2] * (r + .12 + i * .07)], false); }
  k.ground = 0;
}
export function tile_nadelwald(k, F, ctx) {
  const taken = [];
  if (k.rand() < .35) for (let t = 0; t < 12; t++) {               // seltener Hochsitz am Waldrand
    const a = k.R(0, TAU), d = k.R(2.3, 3.1), x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (!F.free(x, z, 1.6)) continue;
    place(k, F, x, z, 1.1, PI - a, () => hochsitz(k)); taken.push([x, z, 1.4], [x - Math.cos(a) * 1.6, z - Math.sin(a) * 1.6, .5]); break;
  }
  if (k.rand() < .8) scatter(k, F, 1, 2.0, (x, y, z) => { fallenLog(k, F, x, z, k.R(0, TAU), k.R(2.4, 2.9)); }, 40, taken);
  if (k.rand() < .7) scatter(k, F, 1, .7, (x, y, z) => antHill(k, [x, y, z]), 30, taken);
  // Bäume: große in der Mitte, junge dazwischen
  const nT = 18 + Math.floor(k.R(0, 5));
  scatter(k, F, nT, .82, (x, y, z) => {
    const fir = k.rand() < .38, s = Math.min(k.R(.8, 1.35), (room(x, z) - .08) / 1.58);
    spruce(k, [x, y, z], s, fir);
  }, 40, taken);
  scatter(k, F, 5, .4, (x, y, z) => spruce(k, [x, y, z], Math.min(k.R(.3, .5), (room(x, z) - .08) / 1.58), k.rand() < .4), 30, taken);
  if (k.rand() < .5) scatter(k, F, 1, .4, (x, y, z) => { N.stump(k, [x, y, z], 1.1); moss(k, [x + .1, y + .37, z], .14); for (let i = 0; i < 3; i++) N.mushroom(k, [x + .3 + i * .06, y, z + k.R(-.1, .1)], false); }, 20, taken);
  // Waldboden: Nadelstreu, Moospolster, Farne, Heidelbeeren, Pilze, Zapfen
  for (let i = 0; i < 70; i++) { const a = k.R(0, TAU), d = Math.sqrt(k.rand()) * (INR - .6), x = Math.cos(a) * d, z = Math.sin(a) * d; if (!F.free(x, z, .2)) continue; const r = k.R(.4, .75); if (room(x, z) < r + .05) continue; const lit = k.rand() < .35; for (let j = 0; j < 2; j++) { const px = x + k.R(-.3, .3), pz = z + k.R(-.3, .3); if (room(px, pz) > r * .7 + .05 && F.free(px, pz, .1)) gpatch(k, F, px, pz, lit ? k.pick([0x6a5a3a, 0x625238, 0x705c3e]) : k.pick([0x4a7234, 0x52783a, 0x45693a]), r * k.R(.6, .85), .05, lit ? TAG.none : TAG.grass); } }
  scatter(k, F, 22, .3, (x, y, z) => gpatch(k, F, x, z, k.pick(MOSS), k.R(.25, .5), k.R(.07, .12)), 15, taken);
  scatter(k, F, 9, .35, (x, y, z) => fernF(k, [x, y, z], Math.min(k.R(.8, 1.3), (room(x, z) - .05) / .7)), 20, taken);
  scatter(k, F, 5, .3, (x, y, z) => blueberry(k, [x, y, z]), 20, taken);
  scatter(k, F, 4, .1, (x, y, z) => N.mushroom(k, [x, y, z], true), 20, taken);
  scatter(k, F, 3, .15, (x, y, z) => { for (let i = 0; i < 3; i++) bolete(k, [x + k.R(-.12, .12), F.h(x, z), z + k.R(-.12, .12)], k.R(.7, 1.2)); }, 20, taken);
  scatter(k, F, 16, .05, (x, y, z) => cone_(k, [x, y, z], k.R(0, TAU)), 8, taken);
  scatter(k, F, 2, .5, (x, y, z) => { N.rock(k, [x, y, z], k.R(.5, .8)); moss(k, [x, y + .32, z], .3); }, 20, taken);
  scatter(k, F, 3, .5, (x, y, z) => { const a = k.R(0, TAU); k.beam(0x5a4030, [x - Math.cos(a) * .5, y + .04, z - Math.sin(a) * .5], [x + Math.cos(a) * .5, y + .05, z + Math.sin(a) * .5], .05); k.beam(0x5a4030, [x, y + .045, z], [x + Math.cos(a + 1) * .3, y + .1, z + Math.sin(a + 1) * .3], .025); }, 15, taken);
  scatter(k, F, 14, .1, (x, y, z) => N.grass(k, [x, y, z], .8, 0x3f7a34), 10, taken);
  ctx.S('forest', 0, 0);
}

// ---------- Felsen ----------
// Felsstapel aus Schichtplatten (helle/dunkle Lagen), oben abgerundet; gibt Oberkante zurück
function crag(k, F, x, z, w, d, h, ry, geos) {
  const g0 = groundMin(F, x, z, Math.max(w, d) * .5) - .35, top = groundMax(F, x, z, .3) + h, ph = k.rand() < .5 ? 1 : 0; let y = g0, i = 0;
  while (y < top - .25) {
    const th = Math.min(k.R(.42, .66), top - y), f = 1 - (y - g0) / (top - g0 + .01) * .2;
    geos.push(put(k, SLAB(Math.floor(k.rand() * 4)), shade(k.pick(CRAG), (i + ph) % 2 ? .88 : 1.06), [x + k.R(-.05, .05), y + th / 2, z + k.R(-.05, .05)], [w * f * k.R(.95, 1.05), th, d * f * k.R(.92, 1.05)], { r: [k.R(-.025, .025), ry + k.R(-.06, .06), k.R(-.025, .025)], jit: .08 }));
    y += th * .98; i++;
  }
  geos.push(put(k, ROCK(Math.floor(k.rand() * 6)), k.pick(CRAG), [x, y - .04, z], [w * .46, .24, d * .42], { r: [0, ry, 0], jit: .07 }));
  return y + .12;
}
export function tile_felsen(k, F, ctx) {
  const taken = [], geos = [], A = k.R(0, TAU), rc = 2.35, hmax = k.R(2.2, 2.9);
  // Klippe: Bogen aus Felsstapeln mit steiler Front zur Mitte, nach hinten abgestuft
  let peak = null;
  for (let j = 0; j < 3; j++) for (let i = 0; i < 4 - j; i++) {
    const t = (i - (3 - j) / 2) / 1.5, a = A + t * .72, rr = rc + j * .95 + k.R(-.1, .1), x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    const w = k.R(1.35, 1.6) - j * .15, d = k.R(1.05, 1.25);
    if (room(x, z) < Math.hypot(w, d) * .55 + .2) continue;
    const h = hmax * (1 - t * t * .5) * [1, .58, .28][j] * k.R(.9, 1.05);
    if (h < .4) continue;
    const top = crag(k, F, x, z, w, d, h, -a - PI / 2, geos);
    taken.push([x, z, .9]);
    if (j === 0 && (!peak || top > peak[1])) peak = [x, top, z, a];
  }
  const hit = hitter(geos);
  // Moos, Gras und Flechten auf den Felsen
  const c0 = [Math.cos(A) * (rc + 1), 0, Math.sin(A) * (rc + 1)];
  dress(k, hit, c0, 34, (p, n) => { if (n[1] > .6) spatch(k, hit, k.pick(MOSS), p, n, k.R(.12, .3), .035, TAG.grass); else spatch(k, hit, k.pick(LICHEN), p, n, k.R(.05, .1), .012); }, .5, 1.4);
  dress(k, hit, c0, 30, (p, n) => spatch(k, hit, k.pick(LICHEN), p, n, k.R(.04, .09), .01), .05, 2.2);
  dress(k, hit, c0, 10, (p, n) => { if (n[1] > .75) N.grass(k, p, k.R(.6, .9), 0x6a8a3e); }, .6, 1.4);
  if (peak) { mountainPine(k, [peak[0], peak[1] - .15, peak[2]], k.R(.65, .8), room(peak[0], peak[2]) - .1); }
  // Geröllhalde vor der Klippe
  for (let i = 0; i < 34; i++) {
    const a = A + k.R(-1.1, 1.1), rr = rc - k.R(.7, 1.6) + Math.abs(a - A) * .2, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (!F.free(x, z, .2)) continue; pebble(k, [x, F.h(x, z) - .03, z], k.R(.06, .2) * (1.5 - (rc - rr) * .4), k.pick(CRAG));
  }
  for (let i = 0; i < 4; i++) { const a = A + k.R(-.9, .9), rr = rc - k.R(.9, 1.4), x = Math.cos(a) * rr, z = Math.sin(a) * rr; if (F.free(x, z, .4)) { const s = k.R(.3, .5); boulder(k, [x, F.h(x, z) + s * .25, z], [s, s * .7, s * .85], k.pick(CRAG)); taken.push([x, z, .45]); } }
  // Findlinge, teils gestapelt, eingesunken
  const bgeos = [];
  scatter(k, F, 3, 1.2, (x, y, z) => {
    const s = k.R(.7, 1.05), sy = s * k.R(.6, .8), c = k.pick(STONE), g0 = groundMin(F, x, z, s * .7);
    bgeos.push(boulder(k, [x, g0 + sy * .55, z], [s, sy, s * k.R(.75, .95)], c));
    if (k.rand() < .6) { const s2 = s * k.R(.45, .65); bgeos.push(boulder(k, [x + k.R(-.2, .2), g0 + sy * 1.4 + s2 * .45, z + k.R(-.2, .2)], [s2, s2 * .7, s2 * .85], k.pick(STONE))); }
    for (let i = 0; i < 4; i++) { const a = k.R(0, TAU); pebble(k, [x + Math.cos(a) * (s + .15), F.h(x + Math.cos(a) * (s + .15), z + Math.sin(a) * (s + .15)) - .02, z + Math.sin(a) * (s + .15)], k.R(.08, .16)); }
  }, 30, taken);
  if (bgeos.length) {
    const bh = hitter(bgeos);
    for (const g of bgeos) { g.computeBoundingSphere(); const c = g.boundingSphere.center.toArray();
      dress(k, bh, c, 7, (p, n) => spatch(k, bh, k.pick(LICHEN), p, n, k.R(.05, .1), .01), .2, 1);
      dress(k, bh, c, 3, (p, n) => { if (n[1] > .5) spatch(k, bh, k.pick(MOSS), p, n, k.R(.15, .28), .04, TAG.grass); }, .6, .6); }
  }
  // Bergkiefern, Latschen, alpine Blumen
  scatter(k, F, 2, .9, (x, y, z) => mountainPine(k, [x, y, z], k.R(.9, 1.15), room(x, z) - .1), 30, taken);
  scatter(k, F, 4, .7, (x, y, z) => latsche(k, [x, y, z], Math.min(k.R(.8, 1.1), (room(x, z) - .05) / 1.15)), 30, taken);
  scatter(k, F, 18, .15, (x, y, z) => N.grass(k, [x, y, z], k.R(.7, 1.1), 0x6a8f45), 10, taken);
  for (let c = 0; c < 4; c++) { const a = k.R(0, TAU), d = k.R(.5, INR * .8), cx = Math.cos(a) * d, cz = Math.sin(a) * d, col = k.pick([0x3a5ad8, 0xffffff, 0xe85a8a, 0xf2e14a]);
    for (let i = 0; i < 6; i++) { const x = cx + k.R(-.5, .5), z = cz + k.R(-.5, .5); if (F.free(x, z, .1) && !taken.some(q => Math.hypot(q[0] - x, q[1] - z) < q[2])) bloom(k, [x, F.h(x, z), z], col, k.R(.1, .2)); } }
  scatter(k, F, 10, .1, (x, y, z) => pebble(k, [x, y - .02, z], k.R(.05, .12)), 10, taken);
}

// ---------- Teich ----------
function cattail(k, p, h) {                     // Rohrkolben: Blätter + Kolben, gibt Spitze zurück
  h ??= k.R(.9, 1.4); const o = { sway: { k: .5 }, swayBase: p[1], tag: TAG.grass, ao: false };
  for (let i = 0; i < 3; i++) { const a = k.R(0, TAU), L = h * k.R(.6, .9); strip(k, k.pick([0x6a8a3a, 0x7a9a4a, 0x5f8040]), [p[0], p[1], p[2]], [p[0] + Math.cos(a) * .18, p[1] + L, p[2] + Math.sin(a) * .18], .05, .01, o); }
  const tx = p[0] + k.R(-.05, .05), tz = p[2] + k.R(-.05, .05);
  k.cyl(0x7a9a4a, p, .012, h, 3, o); k.cyl(0x5a3a22, [tx, p[1] + h * .72, tz], .035, h * .17, 6, { ...o, tag: 0 }); k.cyl(0x7a9a4a, [tx, p[1] + h * .89, tz], .008, h * .1, 3, o);
  return [tx, p[1] + h * .99, tz];
}
function dragonfly(k, p, ry, c = 0x2a7ae8) {
  k.in(p, ry, () => {
    k.beam(c, [-.06, .012, 0], [.04, .012, 0], .009, { ao: false }); k.ball(c, [.05, .014, 0], .012, { ao: false }); k.ball(DARK, [.058, .02, 0], [.007, .006, .013], { ao: false });
    for (const sx of [.015, -.005]) for (const sz of [-1, 1]) k.boxc(0xdfeef5, [sx, .02, sz * .04], [.018, .002, .07], { r: [0, sz * .15 + (sx < 0 ? -.25 * sz : 0), 0], ao: false });
  });
}
function frog(k, p, ry) {
  const g = 0x5a9a3a, b = 0xc8d88a;
  k.in(p, ry, () => {
    k.ball(g, [0, .04, 0], [.06, .04, .05], { ao: false }); k.ball(b, [.01, .025, 0], [.05, .02, .04], { ao: false });
    k.ball(g, [.055, .055, 0], [.035, .028, .038], { ao: false });
    for (const s of [-1, 1]) {
      k.ball(0xe8d84a, [.065, .078, s * .022], .013, { ao: false }); k.ball(DARK, [.072, .082, s * .026], .006, { ao: false });
      k.ball(g, [-.035, .03, s * .045], [.035, .022, .02], { ao: false }); k.box(g, [-.005, 0, s * .06], [.05, .008, .02], { r: [0, s * .4, 0], ao: false });   // Hinterbeine
      k.beam(g, [.04, .035, s * .03], [.06, .002, s * .045], .012, { ao: false });                                              // Vorderbeine
    }
    k.box(0x3a6a2a, [-.02, .078, 0], [.03, .004, .03], { ao: false });   // Fleck
  });
}
// Seerosenblatt mit Kerbe (flache Scheibe)
function lilyPad(k, p, r, a0) {
  const seg = 11, gap = .5, pos = [], col = [], c = new THREE.Color(k.pick([0x4f9a3a, 0x45903a, 0x5aa040])), y = p[1];
  for (let i = 0; i < seg; i++) {
    const a = a0 + gap / 2 + i / seg * (TAU - gap), b = a0 + gap / 2 + (i + 1) / seg * (TAU - gap), f = .92 + k.rand() * .14;
    const A = [p[0] + Math.cos(a) * r, y, p[2] + Math.sin(a) * r], B = [p[0] + Math.cos(b) * r, y, p[2] + Math.sin(b) * r];
    pos.push(p[0], y + .012, p[2], ...B, ...A); for (let j = 0; j < 3; j++) col.push(c.r * f, c.g * f, c.b * f);
    pos.push(...A, ...B, B[0], y - .025, B[2], ...A, B[0], y - .025, B[2], A[0], y - .025, A[2]); for (let j = 0; j < 6; j++) col.push(c.r * .7, c.g * .7, c.b * .7);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals(); k.raw(g);
}
function waterLily(k, p, c) {
  for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 7; i++) {
    const a = i / 7 * TAU + ring * .45, r = ring ? .045 : .075, tilt = ring ? .9 : .5;
    k.boxc(ring ? c : 0xffffff, [p[0] + Math.cos(a) * r, p[1] + .025 + ring * .02, p[2] + Math.sin(a) * r], [.075, .012, .032], { r: [0, -a, tilt], order: 'YXZ', ao: false });
  }
  k.ball(0xf2d84a, [p[0], p[1] + .045, p[2]], .022, { ao: false });
}
// Steg: local +x vom Ufer ins Wasser, Deck auf Höhe dy (absolut)
function jetty(k, F, x0, z0, ry, L, dy, W_ = .95) {
  const cr = Math.cos(ry), sr = Math.sin(ry), wx = (lx, lz) => [x0 + cr * lx + sr * lz, z0 - sr * lx + cr * lz];
  bld(k, [x0, 0, z0], ry, () => {
    const miss = Math.floor(k.R(3, L / .19 - 2));
    for (let i = 0, x = .05; x < L - .1; x += .19, i++) { if (i === miss) continue; k.box(k.pick([W.light, W.pale, W.silver, W.gray]), [x + .08, dy - .045, k.R(-.02, .02)], [.16, .045, W_ + k.R(-.04, .04)], { jit: .07, r: [0, k.R(-.03, .03), 0] }); if (k.rand() < .5) for (const s of [-1, 1]) k.box(IRON, [x + .08, dy, s * (W_ / 2 - .08)], [.02, .006, .02], { ao: false }); }
    for (const s of [-1, 1]) k.box(W.dark, [L / 2, dy - .16, s * .36], [L, .11, .09]);
    for (let x = .3; x < L; x += 1) for (const s of [-1, 1]) {
      const [px, pz] = wx(x, s * .45), bed = F.h(px, pz) - .25, top = dy + (x + 1 > L && s > 0 ? .55 : .02);
      k.cyl(k.pick([W.dark, W.worn]), [x, bed, s * .45], .07, top - bed, 7, { jit: .06 });
      if (top - bed > 0 && dy - .55 > bed) k.cyl(0x4a5a3a, [x, WATER_Y - .02, s * .45], .075, .07, 7, { ao: false });   // Algenrand
    }
    // Pfahl mit Tau, Eimer, Angel
    const xe = Math.floor((L - .3) / 1) + .3; k.cyl(ROPE, [xe, dy + .35, .45], .085, .05, 7, { ao: false }); k.cyl(ROPE, [xe, dy + .28, .45], .085, .04, 7, { ao: false }); k.beam(ROPE, [xe + .05, dy + .3, .45], [xe + .25, dy - .3, .55], .02, { ao: false });
    bucket(k, [L - .7, dy, -.25], 0x3a7a9a);
    k.beam(0x8a6a3a, [L - 1.6, dy + .03, -.3], [L + .2, dy + .45, -.1], .018); k.beam(W.dark, [L - .25, dy - .02, -.17], [L - .25, dy + .34, -.15], .025); k.beam(0xe8e8e0, [L + .2, dy + .45, -.1], [L + .25, WATER_Y, -.05], .003, { ao: false });
    k.ball(0xe83a2a, [L + .25, WATER_Y + .02, -.05], .025, { ao: false });
  });
}
export function tile_teich(k, F, ctx) {
  const taken = [];
  const shoreR = a => { for (let r = .4; r < 4.5; r += .04) if (F.h(Math.cos(a) * r, Math.sin(a) * r) > WATER_Y) return r; return 4.5; };
  const P = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];
  const angFar = (a, b) => Math.abs(((a - b) % TAU + TAU + PI) % TAU - PI);
  // Steg
  const aj = k.R(0, TAU), rsj = shoreR(aj), r0 = rsj + .9, r1 = Math.max(.7, rsj - 1.3);
  const [x0, z0] = P(aj, r0), dy = Math.max(F.h(x0, z0) + .14, WATER_Y + .42);
  jetty(k, F, x0, z0, PI - aj, r0 - r1, dy); taken.push([...P(aj, r0 - .2), .9], [...P(aj, r0 + .4), .5]);
  // Weide am Ufer
  let wa = null;
  for (let t = 0; t < 24 && !wa; t++) {
    const a = aj + PI * k.R(.55, 1.45), rr = shoreR(a) + k.R(.9, 1.4), [x, z] = P(a, rr), s = Math.min(1.05, (room(x, z) - .15) / 1.9);
    if (s > .72 && F.free(x, z, .5)) { const y = F.h(x, z); on(k, y, () => willow(k, F, [x, y, z], s, a + PI)); taken.push([x, z, 1.1]); wa = a; }
  }
  // Schilfgürtel mit Rohrkolben und Libellen
  const ar = (wa ?? aj + PI) + k.R(.9, 1.3) * (k.rand() < .5 ? 1 : -1), tips = [];
  for (let i = 0; i < 34; i++) {
    const a = ar + k.R(-1, 1), rr = shoreR(a) + k.R(-.55, .25), [x, z] = P(a, rr);
    if (angFar(a, aj) < .35 || room(x, z) < .4) continue;
    const y = Math.max(F.h(x, z), WATER_Y) - .04;
    if (k.rand() < .45) tips.push(cattail(k, [x, y, z])); else N.reed(k, [x, y, z]);
  }
  for (let i = 0; i < Math.min(2, tips.length); i++) dragonfly(k, tips[Math.floor(k.R(0, tips.length))], k.R(0, TAU), i ? 0x3ab88a : 0x2a7ae8);
  // Trittsteine im Flachwasser
  const as = aj + k.R(1.6, 2.2) * (k.rand() < .5 ? 1 : -1);
  for (let i = 0; i < 5; i++) {
    const a = as + i * .2, rr = shoreR(a) - .4, [x, z] = P(a, rr), bed = F.h(x, z), top = WATER_Y + .06, hh = (top - bed) / 2 + .06;
    if (bed > WATER_Y - .05 || angFar(a, aj) < .4) continue;
    k.ball(k.pick([0x8a8780, 0x9a958c, 0x7d7a74]), [x, top - hh, z], [k.R(.2, .26), hh, k.R(.18, .24)], { dod: true, r: [0, k.R(0, 6), 0], jit: .08 });
    if (k.rand() < .5) k.ball(0x4f6a3a, [x, WATER_Y + .005, z], [.24, .03, .22], { ao: false });     // Algen am Stein
  }
  // Ufersteine, ein Frosch obendrauf
  let frogRock = false;
  for (let i = 0; i < 13; i++) {
    const a = k.R(0, TAU); if (angFar(a, aj) < .4) continue;
    const rr = shoreR(a) + k.R(-.05, .2), [x, z] = P(a, rr), s = k.R(.15, .32), y = F.h(x, z);
    k.ball(k.pick(STONE), [x, y + s * .1, z], [s, s * .6, s * .8], { dod: true, r: [k.R(-.2, .2), k.R(0, 6), 0], jit: .1 });
    if (k.rand() < .4) k.ball(k.pick(MOSS), [x, y + s * .62, z], [s * .6, .03, s * .5], { ao: false, tag: TAG.grass });
    else if (!frogRock && s > .25) { frog(k, [x, y + s * .7 - .01, z], a + PI); frogRock = true; }
  }
  // Seerosen, Frösche auf Blättern
  let frogs = 0;
  for (let i = 0, n = 0; i < 60 && n < 12; i++) {
    const a = k.R(0, TAU), rr = k.R(.2, 2.4), [x, z] = P(a, rr);
    if (F.h(x, z) > WATER_Y - .22 || angFar(a, aj) < .3 && rr > r1 - .5) continue;
    if (taken.some(q => Math.hypot(q[0] - x, q[1] - z) < q[2] + .3)) continue;
    const r = k.R(.17, .28), y = WATER_Y + .04; lilyPad(k, [x, y, z], r, k.R(0, TAU)); taken.push([x, z, r + .05]); n++;
    if (k.rand() < .3) waterLily(k, [x + r * .3, y, z - r * .2], k.pick([0xf2a8c8, 0xffffff, 0xf8c8d8]));
    else if (frogs < 2 && r > .22) { frog(k, [x, y + .004, z], k.R(0, TAU)); frogs++; }
  }
  // Wiese, Vergissmeinnicht am Ufer, Bank
  for (let i = 0; i < 22; i++) { const a = k.R(0, TAU), rr = shoreR(a) + k.R(.3, 1), [x, z] = P(a, rr); if (F.free(x, z, .1) && room(x, z) > .3 && angFar(a, aj) > .3) bloom(k, [x, F.h(x, z), z], k.pick([0x6aa8f2, 0x5a98e8, 0xffffff]), k.R(.12, .22)); }
  if (k.rand() < .6) for (let t = 0; t < 20; t++) {
    const a = k.R(0, TAU), rr = shoreR(a) + 1.1, [x, z] = P(a, rr);
    if (angFar(a, aj) < .7 || (wa != null && angFar(a, wa) < .8) || angFar(a, ar) < 1.1 || !F.free(x, z, .8)) continue;
    const y = groundMax(F, x, z, .7), ry = Math.atan2(-x, -z); on(k, y, () => bench(k, [x, y, z], ry, 1.3)); k.spot('sit', [x, y + .45, z], { ry }); taken.push([x, z, .9]); break;
  }
  meadow(k, F, 1.1, taken);
  scatter(k, F, 2, .6, (x, y, z) => N.bush(k, [x, y, z], .85, k.rand() < .4 ? 0xd83a5a : 0), 20, taken);
  k.spot('lake', [0, WATER_Y, 0]);
}

// ---------- Bachgabelung ----------
function footbridge(k, F, A, B) {           // kleiner Holzsteg mit Geländer über einen Bacharm
  const dx = B[0] - A[0], dz = B[1] - A[1], L = Math.hypot(dx, dz), ry = -Math.atan2(dz, dx), mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2;
  const yA = F.h(...A), yB = F.h(...B), y0 = Math.max(yA, yB, WATER_Y + .35) + .12;
  const arch = x => y0 + .22 * (1 - (2 * x / L) ** 2), hy = x => yA + (yB - yA) * (x / L + .5);
  bld(k, [mx, 0, mz], ry, () => {
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { const xa = -L / 2 + i * L / 6, xb = xa + L / 6; k.beam(W.dark, [xa, arch(xa) - .1, s * .32], [xb, arch(xb) - .1, s * .32], .1, { w: .1, d: .08 }); }
    for (let x = -L / 2 + .08; x < L / 2 - .05; x += .17) k.box(k.pick([W.light, W.pale, W.mid]), [x, arch(x) - .05, k.R(-.015, .015)], [.15, .045, .86 + k.R(-.04, .04)], { jit: .07, r: [0, 0, Math.atan(-8 * .22 * x / (L * L))] });
    for (const sx of [-1, 1]) { k.box(k.pick(STONE), [sx * (L / 2 - .1), hy(sx * (L / 2 - .1)) - .2, 0], [.5, arch(sx * (L / 2 - .1)) - hy(sx * (L / 2 - .1)) + .05, 1.0], { jit: .08 }); for (let i = 0; i < 3; i++) pebble(k, [sx * (L / 2 + .15), hy(sx * (L / 2 + .15)) - .02, k.R(-.5, .5)], k.R(.1, .16)); }
    const posts = [-L / 2 + .25, -L / 6, L / 6, L / 2 - .25];
    for (const x of posts) { k.box(W.dark, [x, arch(x) - .1, .44], [.08, .95, .08]); k.box(W.dark, [x, arch(x) - .25, .4], [.06, .18, .12]); }
    for (let i = 0; i < 3; i++) { const a = posts[i], b = posts[i + 1]; k.beam(W.mid, [a, arch(a) + .82, .44], [b, arch(b) + .82, .44], .07); k.beam(W.mid, [a, arch(a) + .02, .44], [b, arch(b) + .6, .44], .045); }
  });
}
export function tile_bachg(k, F, ctx) {
  banks(k, F);
  const arms = F.wEdges.length ? F.wEdges : [0, 2, 4];
  // Steine im Wasser mit Schaum
  for (const i of arms) {
    const a = i * PI / 3, ux = Math.cos(a), uz = Math.sin(a), vx = -uz, vz = ux;
    for (let j = 0; j < 4; j++) {
      const t = k.R(1.3, 4.6), l = k.R(-.75, .75), x = ux * t + vx * l, z = uz * t + vz * l, bed = F.h(x, z), s = k.R(.16, .3), top = WATER_Y + k.R(.03, .14);
      if (bed > WATER_Y - .1) continue;
      k.ball(k.pick([0x6a6e6a, 0x7a7c78, 0x5e625e]), [x, (top + bed) / 2, z], [s, (top - bed) / 2 + .05, s * .8], { dod: true, r: [0, k.R(0, 6), 0], jit: .1 });
      k.ball(0x8a8c88, [x, top + .02, z], [s * .7, .04, s * .55], { ao: false });
      if (k.rand() < .7) for (let f = 0; f < 3; f++) k.ball(0xeaf4f6, [x + k.R(-s, s) * 1.2, WATER_Y + .012, z + k.R(-s, s) * 1.2], [k.R(.06, .12), .02, k.R(.04, .08)], { ao: false, r: [0, k.R(0, 3), 0] });
    }
  }
  // Inselfels in der Gabelung
  const cs = k.R(.45, .6), bed0 = F.h(0, 0);
  const cg = boulder(k, [0, (WATER_Y + .3 + bed0) / 2, 0], [cs, (WATER_Y + .3 - bed0) / 2 + .1, cs * .85], k.pick(STONE));
  const ch = hitter([cg]);
  dress(k, ch, [0, WATER_Y + .3, 0], 4, (p, n) => { if (n[1] > .5) spatch(k, ch, k.pick(MOSS), p, n, k.R(.15, .25), .05, TAG.grass); }, .7, .5);
  fernF(k, [0, WATER_Y + .38, 0], .55);
  for (let f = 0; f < 6; f++) { const a = k.R(0, TAU); k.ball(0xeaf4f6, [Math.cos(a) * (cs + .1), WATER_Y + .012, Math.sin(a) * (cs + .1)], [k.R(.08, .15), .02, .06], { ao: false, r: [0, -a, 0] }); }
  // Holzsteg über einen Arm
  const bi = arms[Math.floor(k.R(0, arms.length))], ba = bi * PI / 3, ux = Math.cos(ba), uz = Math.sin(ba), vx = -uz, vz = ux, td = k.R(2.7, 3.2);
  footbridge(k, F, [ux * td - vx * 2.0, uz * td - vz * 2.0], [ux * td + vx * 2.0, uz * td + vz * 2.0]);
  const taken = [[ux * td - vx * 2.2, uz * td - vz * 2.2, .7], [ux * td + vx * 2.2, uz * td + vz * 2.2, .7]];
  // Wiese, Erle, Büsche, Vergissmeinnicht
  meadow(k, F, 1.2, taken);
  scatter(k, F, 1, 1.2, (x, y, z) => N.leafTree(k, [x, y, z], Math.min(1.05, (room(x, z) + .2) / 1.6)), 30, taken);
  scatter(k, F, 3, .6, (x, y, z) => N.bush(k, [x, y, z], k.R(.7, .95), k.rand() < .3 ? 0xd83a3a : 0), 20, taken);
  scatter(k, F, 14, .1, (x, y, z) => { if (F.riverD(x, z) < 2.4) bloom(k, [x, y, z], k.pick([0x6aa8f2, 0x5a98e8, 0xf2e14a]), k.R(.12, .22)); }, 20, taken);
  scatter(k, F, 3, .3, (x, y, z) => cattail(k, [x, y - .03, z]), 20, taken);
  ctx.S('water', 0, 0);
}

// ---------- Obstwiese ----------
function wheelbarrow(k, p, ry, fill) {
  k.in(p, ry, () => {
    k.cyl(W.dark, [.62, .2, -.02], .2, .05, 10, { r: [PI / 2, 0, 0] }); k.cyl(IRON, [.62, .2, -.03], .205, .045, 10, { r: [PI / 2, 0, 0], top: 1, ao: false });
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; k.beam(W.mid, [.62, .2, 0], [.62 + Math.cos(a) * .18, .2 + Math.sin(a) * .18, 0], .025, { ao: false }); }
    for (const s of [-1, 1]) { k.beam(W.dark, [.62, .2, s * .05], [-.75, .5, s * .28], .055); k.box(W.dark, [-.35, -.05, s * .26], [.05, .47, .05]); }
    k.box(W.light, [-.05, .38, 0], [.75, .04, .52], { jit: .08 });
    for (const s of [-1, 1]) k.box(W.mid, [-.05, .42, s * .27], [.78, .22, .035], { r: [s * .2, 0, 0], jit: .08 });
    k.box(W.mid, [.33, .42, 0], [.035, .22, .56], { r: [0, 0, -.25] }); k.box(W.mid, [-.43, .42, 0], [.035, .22, .56]);
    if (fill) for (let i = 0; i < 14; i++) k.ball(k.pick(fill), [k.R(-.35, .25), .5 + k.R(0, .07), k.R(-.2, .2)], .06, { ao: false });
  });
}
export function tile_obst(k, F, ctx) {
  const taken = [], trees = [], kinds = k.rand() < .5 ? ['apfel', 'apfel', 'birne', 'kirsche'] : ['apfel', 'birne', 'kirsche'];
  const a0 = k.R(0, TAU), drop = new Set([Math.floor(k.R(0, 6)), k.rand() < .4 ? Math.floor(k.R(0, 6)) : -1]);
  const cand = [[k.R(-.4, .4), k.R(-.4, .4)]];
  for (let i = 0; i < 6; i++) if (!drop.has(i)) { const a = a0 + i * PI / 3 + k.R(-.12, .12), r = k.R(2.85, 3.15); cand.push([Math.cos(a) * r, Math.sin(a) * r]); }
  for (const [x, z] of cand) { if (!F.free(x, z, .6)) continue; const y = F.h(x, z), s = Math.min(k.R(.9, 1.08), (room(x, z) - .1) / 1.55); if (s < .6) continue;
    on(k, y, () => trees.push({ x, z, y, ...fruitTree(k, [x, y, z], s, k.pick(kinds)) })); taken.push([x, z, .55]); }
  for (const i of drop) if (i >= 0) {                       // junge Bäume in den Lücken
    const a = a0 + i * PI / 3 + k.R(-.2, .2), r = k.R(3.2, 3.8), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (F.free(x, z, .6) && room(x, z) > .9) { const y = F.h(x, z); on(k, y, () => fruitTree(k, [x, y, z], 1, k.pick(kinds), true)); taken.push([x, z, .5]); }
  }
  // Fallobst unter den Bäumen
  for (const t of trees) for (let i = 0; i < 9; i++) {
    const a = k.R(0, TAU), d = k.R(.3, t.Rc * .95), x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d;
    if (!F.free(x, z, .05)) continue; const rot = k.rand() < .25;
    k.ball(rot ? 0x7a5a2a : k.pick([0xd8302a, 0xc82a24, 0xe8a02a, 0xc8c040]), [x, F.h(x, z) + .04, z], [.06, .05, .06], { ao: false, jit: .1 });
  }
  // Leitern, Körbe, Kisten, Schubkarre
  const fruit = [0xd8302a, 0xc82a24, 0xe04a2a, 0xe8a02a];
  trees.slice(0, 1 + Math.floor(k.R(0, 2))).forEach((t, n) => {
    const a = k.R(0, TAU), bx = t.x + Math.cos(a) * 1.15, bz = t.z + Math.sin(a) * 1.15;
    if (!F.free(bx, bz, .2)) return;
    ladder(k, [bx, F.h(bx, bz) - .05, bz], [t.x + Math.cos(a) * .25, t.T[1] + .85, t.z + Math.sin(a) * .25]); taken.push([bx, bz, .35]);
    const c = [bx + Math.cos(a + 1.2) * .55, bz + Math.sin(a + 1.2) * .55]; if (F.free(c[0], c[1], .25)) { basket(k, [c[0], F.h(...c) - .01, c[1]], fruit); taken.push([c[0], c[1], .3]); }
  });
  scatter(k, F, 2, .35, (x, y, z) => basket(k, [x, y - .01, z], k.rand() < .5 ? fruit : [0xd8c84a, 0xc8c040]), 30, taken);
  scatter(k, F, 1, .5, (x, y, z) => { const ry = k.R(0, TAU); crate(k, [x, y, z], ry, fruit); if (k.rand() < .6) crate(k, [x, y + .32, z], ry + k.R(-.2, .2), [0xd8c84a, 0xc8c040]); }, 30, taken);
  if (k.rand() < .5) scatter(k, F, 1, .8, (x, y, z) => wheelbarrow(k, [x, groundMax(F, x, z, .6), z], k.R(0, TAU), fruit), 30, taken);
  // Bank mit Blick auf die Bäume
  for (let t = 0; t < 30; t++) { const a = k.R(0, TAU), r = k.R(1.4, 2.0), x = Math.cos(a) * r, z = Math.sin(a) * r; if (!F.free(x, z, .8) || taken.some(q => Math.hypot(q[0] - x, q[1] - z) < q[2] + .8)) continue;
    const y = groundMax(F, x, z, .7), ry = a; on(k, y, () => bench(k, [x, y, z], ry, 1.3)); k.spot('sit', [x, y + .45, z], { ry }); taken.push([x, z, .85]); break; }
  meadow(k, F, 1.4, taken);
  scatter(k, F, 30, .05, (x, y, z) => bloom(k, [x, y, z], k.pick([0xffffff, 0xf8f0c0, 0xffffff]), k.R(.08, .14)), 6, taken);  // Gänseblümchen
  ctx.S('meadow', 0, 0);
}

// ---------- Weinberg ----------
function clip(P, nx, nz, c) {               // Teil des Vielecks mit nx·x + nz·z ≤ c
  const out = [];
  for (let i = 0; i < P.length; i++) {
    const A = P[i], B = P[(i + 1) % P.length], da = nx * A[0] + nz * A[1] - c, db = nx * B[0] + nz * B[1] - c;
    if (da <= 0) out.push(A);
    if ((da < 0) !== (db < 0) && da !== db) { const t = da / (da - db); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); }
  }
  return out;
}
// Terrassenkörper: Oberseite aus geraden Streifen (cells → [[Vieleck, Boden?]]), Seiten aus Erde; Ebene bldg
function platform(k, P, y, yb, cells, skipEdge) {
  const pos = [], col = [], tag = [], n = 3;
  const G = new THREE.Color(0x6a9a48), S = new THREE.Color(0x7a5a3a), E = new THREE.Color(0x6a5034), c = new THREE.Color();
  const tri = (a, b, d, cc, tg) => {
    const ux = b[0] - a[0], uz = b[2] - a[2], wx = d[0] - a[0], wz = d[2] - a[2], q = uz * wx - ux * wz < 0 ? [a, d, b] : [a, b, d];
    for (const v of q) pos.push(...v); const f = .93 + k.rand() * .12; for (let j = 0; j < 3; j++) { col.push(cc.r * f, cc.g * f, cc.b * f); tag.push(tg); }
  };
  for (const [Q, soil] of cells(P)) {
    if (Q.length < 3) continue;
    const C = [Q.reduce((s, p) => s + p[0], 0) / Q.length, Q.reduce((s, p) => s + p[1], 0) / Q.length];
    for (let i = 0; i < Q.length; i++) {
      const A = Q[i], B = Q[(i + 1) % Q.length], V = (a, b) => [C[0] + (A[0] - C[0]) * a / n + (B[0] - C[0]) * b / n, y, C[1] + (A[1] - C[1]) * a / n + (B[1] - C[1]) * b / n];
      for (let a = 0; a < n; a++) for (let b = 0; b < n - a; b++) for (const t of [[V(a, b), V(a + 1, b), V(a, b + 1)], a + b < n - 1 ? [V(a + 1, b), V(a + 1, b + 1), V(a, b + 1)] : null]) if (t) {
        c.copy(soil ? S : G); if (soil) c.lerp(E, k.rand() * .4); tri(t[0], t[1], t[2], c, soil ? TAG.none : TAG.grass);
      }
    }
  }
  const C = [P.reduce((s, p) => s + p[0], 0) / P.length, P.reduce((s, p) => s + p[1], 0) / P.length];
  for (let i = 0; i < P.length; i++) {
    const A = P[i], B = P[(i + 1) % P.length];
    if (skipEdge && skipEdge(A, B)) continue;
    const ox = (A[0] + B[0]) / 2 - C[0], oz = (A[1] + B[1]) / 2 - C[1], ex = B[0] - A[0], ez = B[1] - A[1], out = ex * oz - ez * ox;
    const q = out > 0 ? [[A[0], y, A[1]], [A[0], yb, A[1]], [B[0], yb, B[1]], [B[0], y, B[1]]] : [[A[0], y, A[1]], [B[0], y, B[1]], [B[0], yb, B[1]], [A[0], yb, A[1]]];
    for (const v of [q[0], q[1], q[2], q[0], q[2], q[3]]) pos.push(...v); for (let j = 0; j < 6; j++) { col.push(E.r, E.g, E.b); tag.push(0); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('tag', new THREE.Float32BufferAttribute(tag, 1));
  g.computeVertexNormals(); k.raw(g, 'bldg');
}
// Trockenmauer vor der Kante A→B (out = Außenrichtung), von bot(x,z) bis top
function dryWall(k, A, B, out, top, bot, skip) {
  const dx = B[0] - A[0], dz = B[1] - A[1], L = Math.hypot(dx, dz), tx = dx / L, tz = dz / L, ry = -Math.atan2(tz, tx);
  const pt = (s, o) => [A[0] + tx * s + out[0] * o, A[1] + tz * s + out[1] * o];
  const mid = pt(L / 2, 0), nC = Math.max(2, Math.round((top - bot(...mid)) / .21));
  k.layer = 'bldg';
  for (let c = 0; c <= nC; c++) {
    let s = c % 2 ? -k.R(.08, .2) : 0;
    while (s < L) {
      const len = c === nC ? k.R(.4, .6) : k.R(.25, .46), s0 = Math.max(s, .02), s1 = Math.min(s + len, L - .02);
      if (s1 - s0 > .07) {
        const sm = (s0 + s1) / 2, q = pt(sm, 0), yb = bot(...q) - .1, h = (top - yb) / nC;
        if (skip && skip(...q)) { s += len; continue; }
        if (c < nC) { const y0 = yb + h * c, dd = k.R(.2, .3), [px, pz] = pt(sm, dd / 2 - .1 + k.R(-.02, .02)); k.boxc(k.pick(LIME), [px, y0 + h / 2, pz], [s1 - s0 - .025, h - .02, dd], { r: [k.R(-.04, .04), ry + k.R(-.06, .06), k.R(-.04, .04)], jit: .09 }); }
        else { const [px, pz] = pt(sm, .02); k.boxc(shade(k.pick(LIME), .95), [px, top + .02, pz], [s1 - s0 - .02, .09, .38], { r: [k.R(-.03, .03), ry + k.R(-.08, .08), k.R(-.03, .03)], jit: .08 }); if (k.rand() < .15) N.grass(k, [px, top + .06, pz], .6, 0x6a8f45); }
      }
      s += len;
    }
  }
  k.layer = 'base';
}
function vine(k, x, y, z, ry, grape, sx = 1) {
  const o = { ao: false }, leaf = { tag: TAG.leaf, sway: .18, jit: .14, ao: false };
  k.in([x, y, z], ry, () => {
    k.beam(0x5a4030, [0, -.02, 0], [.03, .35, .02], .04); k.beam(0x5a4030, [.03, .35, .02], [-.01, .64, 0], .035);
    for (const s of [-1, 1]) k.beam(0x6a4a34, [-.01, .62, 0], [s * .34, .66, 0], .022, o);
    for (const sx of [-1, 1]) k.ball(k.pick([0x5a9a3a, 0x4f8f36, 0x66a844, 0x5a9440]), [sx * k.R(.2, .26), k.R(.84, .92), k.R(-.03, .03)], [k.R(.37, .43), k.R(.24, .3), .15], { ...leaf, r: [0, k.R(-.1, .1), k.R(-.15, .15)] });
    if (grape && k.rand() < .8) for (let i = 0; i < 1 + (k.rand() < .4 ? 1 : 0); i++) {
      const gx = k.R(-.25, .25), gz = k.pick([-.11, .11]), gy = .7;
      k.cone(grape, [gx, gy, gz], .058, .16, 6, { r: [PI, 0, 0], ao: false, jit: .1 });
      for (let j = 0; j < 2; j++) k.ball(shade(grape, k.R(.85, 1.15)), [gx + k.R(-.04, .04), gy - k.R(.0, .06), gz + k.R(-.03, .03)], .032, o);
      k.beam(0x4a6a2a, [gx, gy, gz], [gx, gy + .06, gz * .5], .008, o);
    }
  });
}
function winzerhaus(k) {                     // Weinberghäuschen aus Bruchstein, Tür nach +x
  const w = 1.7, d = 1.5, h = 1.95;
  k.box(0xd8ccb0, [0, -.1, 0], [w, h + .1, d], { jit: .04 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let y = -.05; y < h - .1; y += .3) { const long = (Math.round(y / .3) % 2 === 0) === (sx * sz > 0); k.boxc(k.pick(LIME), [sx * (w / 2 - (long ? .15 : .1)) + sx * .02, y + .14, sz * (d / 2 - (long ? .1 : .15)) + sz * .02], [long ? .34 : .24, .26, long ? .24 : .34], { jit: .08 }); }  // Ecksteine
  for (let i = 0; i < 14; i++) { const f = k.rand() < .5 ? 1 : -1, side = k.rand() < .5; const p = side ? [k.R(-w / 2 + .3, w / 2 - .3), k.R(.1, h - .3), f * (d / 2 + .005)] : [-(w / 2 + .005), k.R(.1, h - .3), k.R(-d / 2 + .3, d / 2 - .3)]; k.boxc(k.pick(LIME), p, side ? [k.R(.2, .35), k.R(.12, .2), .03] : [.03, k.R(.12, .2), k.R(.2, .35)], { jit: .1 }); }  // Bruchsteine im Putz
  // Tür mit Bogen-Sturz und Beschlägen
  k.box(0x8a7a62, [w / 2 + .01, 0, 0], [.04, 1.55, .9]);
  for (let i = 0; i < 4; i++) k.box(k.pick([0x7a4a2a, 0x6a3e24, 0x84502e]), [w / 2 + .03, .02, -.3 + i * .2], [.03, 1.45, .19], { jit: .06 });
  for (const yy of [.3, 1.15]) k.box(IRON, [w / 2 + .05, yy, -.08], [.012, .04, .45], { ao: false });
  k.ball(0xc8a040, [w / 2 + .055, .8, .28], .025, { ao: false });
  k.boxc(k.pick(LIME), [w / 2 + .03, 1.62, 0], [.08, .16, 1.0], { jit: .06 });
  k.box(0x9a8e78, [w / 2 + .1, -.02, 0], [.3, .08, 1.0]);                          // Schwelle
  // Fensterchen mit Laden an der Seite
  k.box(0x2a2a30, [0, 1.0, d / 2 + .005], [.35, .38, .02], { layer: 'glow' });
  k.box(W.dark, [0, .98, d / 2 + .02], [.45, .04, .05]); k.box(W.dark, [0, 1.38, d / 2 + .02], [.45, .04, .04]);
  k.box(0x3a6a4a, [.36, 1.0, d / 2 + .04], [.22, .38, .025], { r: [0, -.5, 0] });
  // Satteldach mit Biberschwanzziegeln
  const a = .62, rise = d / 2 * Math.tan(a), ry = h + rise;
  k.prism(0xd8ccb0, [0, h, 0], d, rise, w, { r: [0, PI / 2, 0] });
  for (const s of [-1, 1]) k.in([0, ry + .03, 0], 0, () => {
    const L = (d / 2 + .25) / Math.cos(a);
    for (let i = 0; i < 6; i++) { const t = (i + .5) / 6 * L, yy = -Math.sin(a) * t, zz = s * Math.cos(a) * t;
      for (let x = -w / 2 - .25 + (i % 2) * .11; x < w / 2 + .25; x += .22) k.boxc(k.pick([0xa8482e, 0x9e4028, 0xb05234, 0x94402a]), [x + .11, yy, zz], [.21, .035, L / 6 * 1.3], { r: [s * a, 0, 0], jit: .06 }); }
    k.boxc(0x6a4a34, [0, -Math.sin(a) * L / 2 - .04, s * Math.cos(a) * L / 2], [w + .5, .04, L], { r: [s * a, 0, 0] });   // Dachschalung
  });
  k.boxc(0x8a3a24, [0, ry + .07, 0], [w + .55, .1, .14], { r: [PI / 4, 0, 0] });
  k.cyl(0x3a3a3a, [-.4, ry - .2, .2], .1, .5, 6);                                 // Ofenrohr
  k.cone(0x2a2a2a, [-.4, ry + .3, .2], .16, .1, 6);
  // Laterne neben der Tür
  k.box(DARK, [w / 2 + .02, 1.6, .62], [.12, .02, .04]); k.box(0x2e2a26, [w / 2 + .1, 1.42, .62], [.14, .03, .14]); k.box(0xffd890, [w / 2 + .1, 1.45, .62], [.1, .16, .1], { layer: 'glow', tag: 1 }); k.cone(0x2a2622, [w / 2 + .1, 1.61, .62], .1, .1, 4, { r: [0, PI / 4, 0] });
  k.spot('light', [w / 2 + .1, 1.52, .62]);
  return { w, d };
}
export function tile_wein(k, F, ctx) {
  const ei = Math.floor(k.R(0, 6)), ua = ei * PI / 3, U = [Math.cos(ua), Math.sin(ua)], V = [-U[1], U[0]];
  const W2 = (u, v) => [U[0] * u + V[0] * v, U[1] * u + V[1] * v];
  const Rin = INR - .45, hex = []; for (let j = 0; j < 6; j++) { const a = (60 * j - 30) * PI / 180, r = Rin / Math.cos(PI / 6); hex.push([Math.cos(a) * r, Math.sin(a) * r]); }
  const vRange = (u, m) => { let lo = -9, hi = 9; for (let j = 0; j < 6; j++) { const nx = Math.cos(j * PI / 3), nz = Math.sin(j * PI / 3), a = nx * U[0] + nz * U[1], b = nx * V[0] + nz * V[1], r = Rin - m - a * u; if (Math.abs(b) < 1e-6) { if (r < 0) return null; continue; } if (b > 0) hi = Math.min(hi, r / b); else lo = Math.max(lo, r / b); } return lo < hi ? [lo, hi] : null; };
  const u1 = -1.75, u2 = 1.3, band = (a, b) => clip(clip(hex, -U[0], -U[1], -a), U[0], U[1], b);
  const P1 = band(u1, u2), P2 = band(u2, 9);
  const sampleMax = P => { let m = -9; for (let i = 0; i < 40; i++) { const A = P[Math.floor(k.rand() * P.length)], B = P[Math.floor(k.rand() * P.length)], t = k.rand(); m = Math.max(m, F.h(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t)); } for (const p of P) m = Math.max(m, F.h(...p)); return m; };
  const y1 = sampleMax(P1) + .48, y2 = Math.max(y1 + .48, sampleMax(P2) + .5), yb = -.6;
  const uOf = (x, z) => x * U[0] + z * U[1], vOf = (x, z) => x * V[0] + z * V[1];
  const vs = k.rand() < .5 ? 2.0 : -2.0;                 // Treppen-Gasse
  const rows = [[-2.35, 0, 0x4a2a6a], [-3.2, 0, 0x4a2a6a], [-4.05, 0, 0x4a2a6a], [-1.1, 1, 0xb8d06a], [-.25, 1, 0xb8d06a], [.6, 1, 0xb8d06a], [1.95, 2, 0x5a2a72], [2.8, 2, 0x5a2a72], [3.65, 2, 0x5a2a72]];
  if (k.rand() < .5) for (const r of rows) r[2] = r[2] === 0xb8d06a ? 0x4a2a6a : 0xb8d06a;
  const lvlY = [null, y1, y2];
  // Oberseite in Streifen schneiden: Bodenstreifen unter den Zeilen, Gras dazwischen und in der Treppengasse
  const uc = [-9, ...rows.flatMap(r => [r[0] - .2, r[0] + .2]).sort((a, b) => a - b), 9], vc = [-9, vs - .55, vs + .55, 9];
  const cells = P => { const out = []; for (let i = 0; i < uc.length - 1; i++) for (let j = 0; j < vc.length - 1; j++) {
    let Q = clip(clip(P, -U[0], -U[1], -uc[i]), U[0], U[1], uc[i + 1]); Q = clip(clip(Q, -V[0], -V[1], -vc[j]), V[0], V[1], vc[j + 1]);
    if (Q.length > 2) out.push([Q, i % 2 === 1 && j !== 1]); } return out; };
  const onLine = (A, B, uu) => Math.abs(uOf(...A) - uu) < .01 && Math.abs(uOf(...B) - uu) < .01;
  platform(k, P1, y1, yb, cells, (A, B) => onLine(A, B, u2));
  platform(k, P2, y2, yb, cells);
  // Trockenmauern an allen sichtbaren Kanten
  const walls = (P, top, botFn, skip) => { const C = [P.reduce((s, p) => s + p[0], 0) / P.length, P.reduce((s, p) => s + p[1], 0) / P.length];
    for (let i = 0; i < P.length; i++) { const A = P[i], B = P[(i + 1) % P.length]; if (Math.hypot(B[0] - A[0], B[1] - A[1]) < .1 || (skip && skip(A, B))) continue;
      const ex = B[0] - A[0], ez = B[1] - A[1], l = Math.hypot(ex, ez); let ox = ez / l, oz = -ex / l; if (ox * ((A[0] + B[0]) / 2 - C[0]) + oz * ((A[1] + B[1]) / 2 - C[1]) < 0) { ox = -ox; oz = -oz; }
      dryWall(k, A, B, [ox, oz], top, (x, z) => botFn(x, z, A, B), (x, z) => Math.abs(vOf(x, z) - vs) < .42 && (Math.abs(uOf(x, z) - u1) < .1 || Math.abs(uOf(x, z) - u2) < .1)); } };
  walls(P1, y1, (x, z) => F.h(x, z), (A, B) => onLine(A, B, u2));
  walls(P2, y2, (x, z, A, B) => onLine(A, B, u2) ? y1 : F.h(x, z));
  // Treppen in der Gasse
  const stairs = (u0, gy, ty) => { const n = Math.max(2, Math.ceil((ty - gy) / .17)), rise = (ty - gy) / n;
    k.layer = 'bldg'; for (let i = 0; i < n; i++) { const ua0 = u0 - .3 * (n - i) - .12, [x, z] = W2((ua0 + u0) / 2, vs); k.boxc(k.pick(LIME), [x, (gy - .1 + gy + rise * (i + 1)) / 2, z], [u0 - ua0, gy + rise * (i + 1) - gy + .1, .85], { r: [0, -ua, 0], jit: .07 }); } k.layer = 'base'; return u0 - .3 * n - .12; };
  const sFoot = W2(u1 - .8, vs), s0 = stairs(u1, F.h(...sFoot), y1), s1 = stairs(u2, y1, y2);
  // Winzerhäuschen oben, Fässer davor
  const hv = -Math.sign(vs) * 1.75, hu = 3.25, [hx, hz] = W2(hu, hv);
  k.ground = y2; bld(k, [hx, y2, hz], -ua + PI, () => winzerhaus(k)); k.ground = 0;
  const [bx, bz] = W2(hu - 1.35, hv + Math.sign(vs) * .5); on(k, y2, () => barrelLying(k, [bx, y2, bz], -ua + PI / 2, .9));
  const [b2x, b2z] = W2(hu - 1.25, hv - Math.sign(vs) * .55); on(k, y2, () => barrel(k, [b2x, y2, b2z], .85, W.mid));
  const hutBox = (u, v) => u > hu - 1.0 - .55 && Math.abs(v - hv) < 1.25;
  // Rebzeilen: Pfähle, Drähte, Reben
  for (const [ru, lv, grape] of rows) {
    const rg = vRange(ru, .5); if (!rg) continue;
    const base = (x, z) => lv ? lvlY[lv] : F.h(x, z);
    const seg = []; let cur = null;
    for (let v = rg[0]; v <= rg[1] + 1e-6; v += .1) { const ok = Math.abs(v - vs) > .6 && !(lv === 2 && hutBox(ru, v)) && !(lv === 0 && Math.abs(v - vs) < .9 && ru > s0 - .4); if (ok) { if (!cur) seg.push(cur = [v, v]); else cur[1] = v; } else cur = null; }
    for (const [va, vb] of seg) {
      if (vb - va < .6) continue;
      const np = Math.max(1, Math.round((vb - va) / 1.4)), posts = [];
      for (let i = 0; i <= np; i++) { const v = va + (vb - va) * i / np, [x, z] = W2(ru, v), y = base(x, z); posts.push([x, y, z]); const end = i === 0 || i === np;
        k.box(k.pick([0x8a7a62, 0x7a6a52, 0x958670]), [x, y - .15, z], [end ? .08 : .055, 1.3, end ? .08 : .055], { r: [k.R(-.03, .03), -ua, k.R(-.03, .03)], jit: .06 });
        if (end) { const [ax, az] = W2(ru, v + (i === 0 ? -.45 : .45)); k.beam(0x8a8a88, [x, y + 1.05, z], [ax, base(ax, az) + .02, az], .008, { ao: false }); k.box(0x6a6a68, [ax, base(ax, az) - .02, az], [.06, .06, .06], { ao: false }); } }
      for (let i = 0; i < np; i++) for (const hy of [.55, .95]) k.beam(0x9a9a98, [posts[i][0], posts[i][1] + hy, posts[i][2]], [posts[i + 1][0], posts[i + 1][1] + hy, posts[i + 1][2]], .008, { ao: false });
      for (let v = va + .4; v < vb - .25; v += .85) { const [x, z] = W2(ru, v), y = base(x, z); on(k, y, () => vine(k, x, y, z, -ua + PI / 2, grape));
        if (!lv) k.box(0x6a4a2e, [x, y - .04, z], [.35, .07, .75], { r: [0, -ua, 0], jit: .1, tag: 0 }); }
    }
  }
  // Grasbüschel zwischen den Zeilen, Lesekorb, Bütte
  for (let i = 0; i < 40; i++) { const u = k.R(-4.3, 4.3), rg = vRange(u, .55); if (!rg) continue; const v = k.R(rg[0], rg[1]); if (rows.some(r => Math.abs(u - r[0]) < .3) || Math.abs(v - vs) < .5 || hutBox(u, v)) continue;
    const lv = u < u1 - .3 ? 0 : u > u1 + .3 && u < u2 - .3 ? 1 : u > u2 + .3 ? 2 : -1; if (lv < 0) continue; const [x, z] = W2(u, v); N.grass(k, [x, lv ? lvlY[lv] : F.h(x, z), z], k.R(.6, 1), 0x6a9a48); }
  const [kx, kz] = W2(-.65, vs + Math.sign(vs) * -.95); on(k, y1, () => basket(k, [kx, y1, kz], [0x4a2a6a, 0x5a3a7a], .9));
  const [tx, tz] = W2(-3.65, vs); const ty = F.h(tx, tz); on(k, ty, () => { k.cyl(W.mid, [tx, ty, tz], .32, .38, 10, { top: 1.12, jit: .06 }); for (const yy of [.06, .3]) k.cyl(IRON, [tx, ty + yy, tz], .335 + yy * .1, .035, 10, { ao: false }); for (let i = 0; i < 12; i++) k.ball(k.pick([0x4a2a6a, 0x5a3a7a, 0x3a2050]), [tx + k.R(-.22, .22), ty + .38 + k.R(0, .05), tz + k.R(-.22, .22)], .045, { ao: false }); });
  k.spot('field', [0, y1, 0]);
}

// ---------- Imkerei ----------
function beehive(k, c, ry, roof) {       // Holzbeute, Flugloch nach +x
  const w = .5, d = .5;
  for (const s of [-1, 1]) { k.box(0x9a958c, [0, -.15, s * .17], [.62, .35, .14], { jit: .06 }); }   // Steinsockel
  k.box(W.dark, [0, .2, 0], [.56, .05, .56]);
  k.box(W.mid, [w / 2 + .1, .2, 0], [.22, .025, .4], { r: [0, 0, -.18] });                    // Anflugbrett
  const n = 2 + (k.rand() < .5 ? 1 : 0); let y = .25;
  for (let i = 0; i < n; i++) {
    const hh = i === 0 ? .32 : k.R(.22, .3), cc = shade(c, k.R(.92, 1.06));
    k.box(cc, [0, y, 0], [w, hh - .008, d], { jit: .04 });
    k.box(shade(cc, .8), [0, y + hh - .012, 0], [w - .02, .012, d - .02], { ao: false });       // Fuge
    for (const s of [-1, 1]) k.box(shade(cc, .7), [0, y + hh * .62, s * (d / 2 + .012)], [.16, .035, .025], { ao: false });   // Griffleiste
    if (k.rand() < .5) k.box(shade(cc, 1.15), [k.R(-.15, .15), y + k.R(.05, hh - .1), d / 2 + .003], [k.R(.05, .12), .04, .005], { ao: false });   // abgeplatzte Farbe
    y += hh;
  }
  k.box(DARK, [w / 2 + .002, .265, 0], [.008, .022, .22], { ao: false });                  // Flugloch
  k.box(0xe8e4dc, [w / 2 + .004, .42, 0], [.006, .08, .08], { r: [PI / 4, 0, 0], ao: false });  // Merkzeichen
  if (roof === 'gable') { k.box(W.dark, [0, y, 0], [w + .1, .04, d + .1]); k.prism(shade(c, .75), [0, y + .04, 0], d + .14, .18, w + .14, { r: [0, PI / 2, 0] }); k.boxc(0x5a5e62, [0, y + .2, 0], [w + .16, .02, .06], { r: [0, 0, 0], ao: false }); }
  else { k.box(0x8a8e90, [0, y, 0], [w + .08, .07, d + .08], { jit: .04 }); k.box(0x7a7e80, [0, y + .07, 0], [w + .1, .012, d + .1], { ao: false }); k.box(0xa8482e, [k.R(-.1, .1), y + .082, k.R(-.1, .1)], [.22, .07, .11], { r: [0, k.R(0, 1), 0], jit: .08 }); }   // Ziegel als Beschwerer
  for (let i = 0; i < 4; i++) { const bx = w / 2 + k.R(.0, .16), bz = k.R(-.15, .15), by = .2 + .025 - (bx - w / 2) * .18 + .01; k.ball(0xf2c42a, [bx, by, bz], [.012, .009, .009], { ao: false }); k.box(DARK, [bx - .004, by - .008, bz], [.004, .016, .016], { ao: false }); k.boxc(0xe8f0f4, [bx - .002, by + .01, bz], [.012, .002, .02], { ao: false }); }   // Bienen
}
function frame_(k, p, ry, lean) {       // Wabenrahmen, angelehnt (kippt um lean Richtung +x)
  k.in(p, ry, () => {
    k.pushM(new THREE.Matrix4().makeRotationZ(-lean)); const o = { ao: false };
    k.boxc(W.pale, [0, .46, 0], [.022, .022, .5], o);
    for (const zz of [-.21, .21]) k.boxc(W.pale, [0, .23, zz], [.02, .44, .02], o);
    k.boxc(W.pale, [0, .015, 0], [.02, .02, .44], o);
    k.boxc(0xd8a030, [0, .235, 0], [.014, .41, .4], o);
    for (let i = 0; i < 12; i++) k.cyl(k.rand() < .5 ? 0xb87a20 : 0xf2c040, [.007, k.R(.07, .4), k.R(-.17, .17)], .02, .006, 6, { r: [0, 0, -PI / 2], ao: false });
    k.pop();
  });
}
function beeHat(k, p) {
  k.cyl(0xe8e4d8, p, .2, .012, 12, { ao: false });
  k.cyl(0xe8e4d8, [p[0], p[1] + .01, p[2]], .1, .09, 10, { top: .85, ao: false });
  k.cyl(0x3a3a3a, [p[0], p[1] - .2, p[2]], .19, .2, 12, { top: 1.04, ao: false });   // Schleier (dunkles Netz)
  k.cyl(0xe8e4d8, [p[0], p[1] - .21, p[2]], .195, .015, 12, { ao: false });
}
function smoker(k, p) {
  k.cyl(0xb8bcc0, p, .055, .17, 9, { ao: false }); k.cone(0xb8bcc0, [p[0], p[1] + .17, p[2]], .055, .07, 9, { ao: false }); k.beam(0xb8bcc0, [p[0], p[1] + .23, p[2]], [p[0] + .05, p[1] + .27, p[2]], .018, { ao: false });
  k.box(W.light, [p[0] - .085, p[1] + .02, p[2]], [.03, .14, .07], { r: [0, 0, .25], ao: false }); k.box(0x6a3a2a, [p[0] - .1, p[1] + .05, p[2]], [.02, .09, .072], { r: [0, 0, .35], ao: false });
}
function honeyJar(k, p) { k.cyl(0xd88a18, p, .035, .08, 7, { ao: false }); k.cyl(0xe8a028, [p[0], p[1] + .07, p[2]], .033, .005, 7, { ao: false }); k.cyl(k.pick([0xd83a3a, 0xe8e4dc, 0x3a7ad8]), [p[0], p[1] + .08, p[2]], .038, .02, 7, { ao: false }); }
function beeShed(k) {                       // Bienenhaus/Schuppen, Front +x
  const w = 1.5, d = 2.1, hf = 2.0, hb = 1.65;
  k.box(0x8a8a84, [0, -.15, 0], [w + .1, .2, d + .1], { jit: .05 });
  for (const [x, z] of [[-w / 2, -d / 2], [-w / 2, d / 2], [w / 2, -d / 2], [w / 2, d / 2]]) k.box(W.dark, [x, 0, z], [.09, x > 0 ? hf : hb, .09]);
  const hy = x => hb + (hf - hb) * (x + w / 2) / w;
  k.in([w / 2, .05, 0], 0, () => boards(k, -d / 2, d / 2, 0, hf - .05, { skip: z => (z > -.35 && z < .35) || (z > .5 && z < .9), cols: [0x7a5a3a, 0x86643e, 0x6e5034] }));
  const fc = { cols: [0x7a5a3a, 0x86643e, 0x6e5034] };
  k.in([w / 2, .05, 0], 0, () => { boards(k, .5, .9, 0, .93, fc); boards(k, .5, .9, 1.47, hf - .05, fc); boards(k, -.35, .35, 1.75, hf - .05, fc); });   // unter/über Fenster, über der Tür
  k.in([-w / 2, .05, 0], PI, () => boards(k, -d / 2, d / 2, 0, hb - .05, { cols: [0x7a5a3a, 0x86643e, 0x6e5034] }));
  for (const s of [-1, 1]) k.in([0, .05, s * d / 2], s * -PI / 2, () => boards(k, -w / 2, w / 2, 0, z => hy(s > 0 ? -z : z) - .05, { cols: [0x7a5a3a, 0x86643e, 0x6e5034] }));
  // Tür (zu, mit Z-Strebe) und Fenster
  for (let i = 0; i < 4; i++) k.box(k.pick([0x9a6a3a, 0x8a5e34]), [w / 2 + .03, .05, -.3 + i * .2 - .0], [.03, 1.75, .18], { jit: .05 });
  for (const yy of [.3, 1.45]) k.box(0x6a4a2a, [w / 2 + .055, yy, 0], [.02, .1, .7]);
  k.beam(0x6a4a2a, [w / 2 + .055, .35, -.28], [w / 2 + .055, 1.45, .28], .07, { w: .07, d: .02 });
  k.box(IRON, [w / 2 + .07, .9, .27], [.02, .04, .04], { ao: false });
  k.box(0x2a2a30, [w / 2 + .01, 1.0, .7], [.02, .5, .4], { layer: 'glow' }); k.box(W.light, [w / 2 + .03, .98, .7], [.04, .04, .48]); k.box(W.light, [w / 2 + .03, 1.5, .7], [.04, .04, .48]); k.box(W.light, [w / 2 + .03, .98, .7], [.04, .54, .04]);
  k.box(W.light, [w / 2 + .08, .96, .7], [.14, .03, .5]);                                   // Fensterbank mit Honig
  for (let i = 0; i < 3; i++) honeyJar(k, [w / 2 + .08, .99, .55 + i * .14]);
  k.box(0xe8d8a0, [w / 2 + .06, 1.62, -.0], [.02, .16, .5]); for (let i = 0; i < 4; i++) k.box(0x6a4a2a, [w / 2 + .072, 1.66, -.15 + i * .1], [.005, .08, .05], { ao: false });   // Schild
  // Pultdach mit Schindeln
  const a = Math.atan((hf - hb) / w);
  k.in([0, (hf + hb) / 2 + .05, 0], 0, () => {
    k.boxc(W.dark, [0, 0, 0], [w + .5, .05, d + .4], { r: [0, 0, a] });
    for (let i = 0; i < 7; i++) { const x = -w / 2 - .25 + (i + .5) * (w + .5) / 7; for (let z = -d / 2 - .2 + (i % 2) * .12; z < d / 2 + .2; z += .24) k.boxc(k.pick([0x6a4a34, 0x5e4230, 0x765238, 0x4e3828]), [x, Math.tan(a) * x + .035, Math.min(z + .12, d / 2 + .08)], [(w + .5) / 7 * 1.25, .03, .22], { r: [0, 0, a + .06], jit: .06 }); }
  });
}
export function tile_imker(k, F, ctx) {
  const taken = [], A = k.R(0, TAU), U = [Math.cos(A), Math.sin(A)], V = [-U[1], U[0]], W2 = (u, v) => [U[0] * u + V[0] * v, U[1] * u + V[1] * v];
  const COL = [0x3a7ad8, 0xf2c43a, 0x5aa85a, 0xd84a3a, 0xf4efe6, 0x5ac8c8, 0xe88a3a, 0x8a6ac8];
  const n = 5 + Math.floor(k.R(0, 4)), cols = [...COL].sort(() => k.rand() - .5);
  // Bienenstöcke in einer Reihe (zweite Reihe bei vielen), Flugloch zur Mitte
  for (let i = 0; i < n; i++) {
    const second = i >= 6, m = second ? n - 6 : Math.min(n, 6), j = second ? i - 6 : i;
    const u = second ? -3.55 : -2.45, v = (j - (m - 1) / 2) * .95 + (second ? .45 : 0), [x, z] = W2(u + k.R(-.08, .08), v);
    if (room(x, z) < .5) continue;
    const y = groundMax(F, x, z, .35); on(k, y, () => k.in([x, y, z], -A + k.R(-.08, .08), () => beehive(k, cols[i % cols.length], 0, k.rand() < .5 ? 'gable' : 'flat')));
    taken.push([x, z, .5]);
  }
  // Schuppen gegenüber
  const sv = k.rand() < .5 ? 1.7 : -1.7, [shx, shz] = W2(2.55, sv);
  place(k, F, shx, shz, 1.25, -A + PI, () => beeShed(k)); taken.push([shx, shz, 1.45]);
  // Bank mit Imkerhaube, Smoker, Handschuhen; Wabenrahmen am Schuppen
  const [bx, bz] = W2(1.25, sv - Math.sign(sv) * 2.0), by = groundMax(F, bx, bz, .7), bry = -A - PI / 2;
  if (F.free(bx, bz, .6)) {
    on(k, by, () => { bench(k, [bx, by, bz], bry, 1.3); k.in([bx, by, bz], bry, () => { beeHat(k, [-.35, .67, 0]); smoker(k, [.15, .46, -.05]); k.box(0xe8dca0, [.42, .46, .02], [.16, .025, .1], { r: [0, .3, 0], ao: false }); k.box(0xe8dca0, [.44, .485, .05], [.14, .02, .09], { r: [0, -.2, 0], ao: false }); }); });
    k.spot('sit', [bx, by + .45, bz], { ry: bry }); taken.push([bx, bz, .9]);
  }
  for (let i = 0; i < 3; i++) { const [fx, fz] = W2(1.645, sv + .55 + i * .2); frame_(k, [fx, F.h(fx, fz) - .01, fz], -A + PI, .36); }
  // Honigtischchen
  const [tx, tz] = W2(1.0, sv + Math.sign(sv) * .1);
  if (F.free(tx, tz, .4) && !taken.some(q => Math.hypot(q[0] - tx, q[1] - tz) < q[2] + .35)) { const ty = groundMax(F, tx, tz, .3); on(k, ty, () => k.in([tx, ty, tz], -A, () => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(W.dark, [sx * .2, 0, sz * .25], [.05, .72, .05]);
    k.box(W.light, [0, .72, 0], [.52, .04, .64], { jit: .06 }); k.box(0xe8e0d0, [0, .76, 0], [.5, .005, .3], { ao: false });
    for (let i = 0; i < 5; i++) honeyJar(k, [k.R(-.15, .15), .765, -.22 + i * .11]);
    k.box(0x9a7a52, [0, .76, .26], [.12, .04, .08]); }));
    taken.push([tx, tz, .45]); }
  // dichte Blumenwiese, Lavendel, Sonnenblumen, Klee
  const FL = [0xf2e14a, 0xffffff, 0xe85a8a, 0x8a6ae8, 0xf28a3a, 0xe84a4a, 0x6aa8f2, 0xb86ae8];
  scatter(k, F, 5, .4, (x, y, z) => { for (let i = 0; i < 9; i++) { const a = k.R(0, TAU), d = k.R(0, .25), px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, h = k.R(.3, .5); k.cyl(0x6a8a5a, [px, y, pz], .01, h, 3, { sway: { k: 1 }, swayBase: y, tag: TAG.grass, ao: false, r: [k.R(-.2, .2), 0, k.R(-.2, .2)] }); k.cyl(0x8a6ac8, [px, y + h - .02, pz], .022, .14, 4, { top: .3, sway: { k: 1 }, swayBase: y, tag: TAG.flower, ao: false }); } k.ball(0x6a8a5a, [x, y + .06, z], [.25, .1, .25], { tag: TAG.grass, ao: false }); }, 25, taken);
  scatter(k, F, 3, .3, (x, y, z) => N.sunflower(k, [x, y, z]), 25, taken);
  scatter(k, F, 45, .05, (x, y, z) => { const c = k.pick(FL); for (let i = 0; i < 4; i++) { const px = x + k.R(-.18, .18), pz = z + k.R(-.18, .18); if (F.free(px, pz, .02)) bloom(k, [px, F.h(px, pz), pz], k.rand() < .8 ? c : k.pick(FL)); } }, 8, taken);
  scatter(k, F, 90, .05, (x, y, z) => bloom(k, [x, y, z], k.pick(FL)), 6, taken);
  scatter(k, F, 30, .05, (x, y, z) => clover(k, [x, y, z], 0xe8e0e8), 6, taken);
  scatter(k, F, 28, .12, (x, y, z) => N.grass(k, [x, y, z], k.R(.8, 1.2)), 8, taken);
  ctx.S('meadow', 0, 0);
}

// ---------- Schafweide ----------
function fenceRun(k, F, A, B, gapFn) {
  const L = Math.hypot(B[0] - A[0], B[1] - A[1]), n = Math.max(1, Math.round(L / 1.25)), P = [];
  for (let i = 0; i <= n; i++) { const t = i / n, x = A[0] + (B[0] - A[0]) * t, z = A[1] + (B[1] - A[1]) * t; P.push([x, F.h(x, z), z, t]); }
  for (let i = 0; i <= n; i++) { const [x, y, z, t] = P[i]; if (gapFn && gapFn(t, true)) continue; const cn = i === 0 || i === n;
    k.cyl(k.pick([W.silver, W.gray, 0x8a7a64]), [x, y - .25, z], cn ? .075 : .06, 1.25 + (cn ? .08 : 0), 6, { top: .9, jit: .07, r: [k.R(-.03, .03), 0, k.R(-.03, .03)] });
    k.cone(shade(W.silver, .9), [x, y + 1.0 + (cn ? .08 : 0), z], cn ? .075 : .06, .06, 6, { ao: false });
    if (k.rand() < .2) k.ball(k.pick(MOSS), [x, y + 1.02, z], [.05, .03, .05], { ao: false, tag: TAG.grass }); }
  for (let i = 0; i < n; i++) { const a = P[i], b = P[i + 1]; if (gapFn && gapFn((a[3] + b[3]) / 2)) continue;
    for (const hy of [.42, .82]) { const sag = k.R(.0, .04), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + hy - sag, (a[2] + b[2]) / 2], c = k.rand() < .12 ? W.pale : k.pick([W.silver, W.gray, 0x9a8a72]);
      k.beam(c, [a[0], a[1] + hy, a[2]], m, .06, { w: .07, d: .045 }); k.beam(c, m, [b[0], b[1] + hy + k.R(-.02, .02), b[2]], .06, { w: .07, d: .045 }); } }
}
function gate(k, F, A, B) {                // Tor zwischen den Pfosten A und B, leicht offen
  const dx = B[0] - A[0], dz = B[1] - A[1], L = Math.hypot(dx, dz), ry = -Math.atan2(dz, dx), yA = F.h(...A);
  for (const P of [A, B]) { const y = F.h(...P); k.cyl(W.dark, [P[0], y - .3, P[1]], .09, 1.55, 7, { jit: .06 }); k.cone(W.dark, [P[0], y + 1.25, P[1]], .09, .08, 7, { ao: false }); }
  k.in([A[0], yA, A[1]], ry - .45, () => {
    const l = L - .2;
    for (const hy of [.25, .55, .85, 1.1]) k.box(W.pale, [l / 2 + .08, hy, 0], [l, .07, .045], { jit: .07 });
    for (const x of [.1, l + .05]) k.box(W.light, [x, .15, 0], [.07, 1.05, .05]);
    k.beam(W.light, [.12, .25, .03], [l, 1.1, .03], .06, { w: .06, d: .03 });
    for (const hy of [.3, 1.0]) k.box(IRON, [.09, hy, 0], [.14, .03, .06], { ao: false });
    k.box(IRON, [l + .08, .85, .02], [.08, .03, .06], { ao: false });
  });
}
function sheepShelter(k) {                 // offener Unterstand, Front +x, mit Heuraufe
  const w = 1.8, d = 2.6, hf = 2.0, hb = 1.5, hy = x => hb + (hf - hb) * (x + w / 2) / w;
  for (const [x, z] of [[-w / 2, -d / 2], [-w / 2, d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, 0]]) k.box(W.dark, [x, -.2, z], [.11, hy(x) + .2, .11], { jit: .05 });
  k.in([-w / 2 - .05, 0, 0], PI, () => boards(k, -d / 2, d / 2, -.05, hb, { cols: [W.gray, W.worn, W.mid, W.silver] }));
  for (const s of [-1, 1]) k.in([0, 0, s * (d / 2 + .05)], s * -PI / 2, () => boards(k, s > 0 ? -w / 2 + .5 : -w / 2, s > 0 ? w / 2 : w / 2 - .5, -.05, z => (hy(s > 0 ? -z : z) - .55), { cols: [W.gray, W.worn, W.mid] }));
  for (const s of [-1, 1]) k.beam(W.dark, [w / 2, hf - .1, s * d / 2], [w / 2 - .45, hf - .55, s * d / 2], .07);
  k.beam(W.dark, [w / 2, hf - .05, -d / 2], [w / 2, hf - .05, d / 2], .1); k.beam(W.dark, [-w / 2, hb - .05, -d / 2], [-w / 2, hb - .05, d / 2], .1);
  const a = Math.atan((hf - hb) / w);
  k.in([0, (hf + hb) / 2 + .03, 0], 0, () => {
    for (let z = -d / 2 - .25; z < d / 2 + .25; z += .2) k.boxc(k.pick([W.mid, W.worn, W.gray, W.light]), [0, 0, z + .1], [(w + .5) / Math.cos(a), .04, .19], { r: [0, 0, a], jit: .06 });
    for (let i = 0; i < 3; i++) { const x = -w / 2 + .1 + i * (w - .2) / 2; k.boxc(W.dark, [x, Math.tan(a) * x - .05, 0], [.07, .06, d + .5], { r: [0, 0, a] }); }
    for (let i = 0; i < 4; i++) { const x = k.R(-.6, .6); k.boxc(k.pick(MOSS), [x, Math.tan(a) * x + .045, k.R(-1.2, 1.2)], [k.R(.2, .4), .025, k.R(.15, .3)], { r: [0, 0, a], ao: false, tag: TAG.grass }); }
  });
  // Heuraufe an der Rückwand
  k.box(W.dark, [-w / 2 + .15, .45, 0], [.1, .08, d - .3]); k.box(W.dark, [-w / 2 + .5, .45, 0], [.08, .08, d - .3]);
  for (let z = -d / 2 + .25; z < d / 2 - .2; z += .14) k.beam(W.light, [-w / 2 + .52, .5, z], [-w / 2 + .15, 1.25, z], .03, { ao: false });
  k.beam(W.dark, [-w / 2 + .5, 1.27, -d / 2 + .15], [-w / 2 + .5, 1.27, d / 2 - .15], .06);
  for (let i = 0; i < 9; i++) k.ball(k.pick([0xd8b858, 0xc8a848, 0xe0c068]), [-w / 2 + .3, k.R(.6, 1.05), k.R(-d / 2 + .35, d / 2 - .35)], [.18, .2, .25], { jit: .2 });
  for (let i = 0; i < 20; i++) k.box(k.pick([0xd8b858, 0xc8a848]), [k.R(-w / 2 + .3, w / 2), -.02, k.R(-d / 2 + .1, d / 2 - .1)], [k.R(.15, .3), .04, .025], { r: [0, k.R(0, 3), 0], ao: false });   // Stroh
  k.ball(0xd8b858, [-.1, -.05, .3], [.5, .12, .55], { jit: .2 });
}
export function tile_schafe(k, F, ctx) {
  const taken = [], Rf = INR - .4, Cn = []; for (let j = 0; j < 6; j++) { const a = (60 * j - 30) * PI / 180, r = Rf / Math.cos(PI / 6); Cn.push([Math.cos(a) * r, Math.sin(a) * r]); }
  const gi = Math.floor(k.R(0, 6));          // Tor an Kante gi (zwischen Ecke gi und gi+1)
  for (let j = 0; j < 6; j++) {
    const A = Cn[j], B = Cn[(j + 1) % 6];
    if (j !== gi) { fenceRun(k, F, A, B); continue; }
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]), g0 = .5 - .8 / L, g1 = .5 + .8 / L, at = t => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
    fenceRun(k, F, A, at(g0)); fenceRun(k, F, at(g1), B); gate(k, F, at(g0), at(g1));
    const m = at(.5); taken.push([m[0] * .82, m[1] * .82, .9]);
  }
  // Unterstand an der Gegenseite
  const ga = gi * PI / 3, sa = ga + PI + k.R(-.5, .5), sx = Math.cos(sa) * 2.75, sz = Math.sin(sa) * 2.75;
  place(k, F, sx, sz, 1.5, PI - sa, () => sheepShelter(k)); taken.push([sx, sz, 1.75]);
  // Tränke mit Pumpe
  const ta = sa + PI / 2 * (k.rand() < .5 ? 1 : -1), tx = Math.cos(ta) * 2.6, tz = Math.sin(ta) * 2.6, ty = groundMax(F, tx, tz, .8), try_ = -ta + PI / 2;
  on(k, ty, () => k.in([tx, ty, tz], try_, () => {
    k.box(0x9a958c, [0, -.1, 0], [1.4, .2, .55], { jit: .05 });
    for (const s of [-1, 1]) { k.box(0x9a958c, [0, .1, s * .235], [1.4, .36, .08], { jit: .05 }); k.box(0x9a958c, [s * .66, .1, 0], [.08, .36, .39], { jit: .05 }); k.box(0x7a766e, [0, .46, s * .24], [1.44, .04, .11], { jit: .04 }); k.box(0x7a766e, [s * .67, .46, 0], [.11, .04, .38], { jit: .04 }); }
    k.box(0x4a4a44, [0, .1, 0], [1.24, .02, .39], { ao: false });
    k.box(0xffffff, [0, .1, 0], [1.21, .2, .36], { layer: 'water' });
    for (let i = 0; i < 4; i++) k.box(k.pick(MOSS), [k.R(-.6, .6), -.06, .28], [k.R(.15, .3), k.R(.08, .15), .02], { ao: false, tag: TAG.grass });
    k.cyl(0x3a5a4a, [.85, -.1, 0], .08, 1.1, 8); k.cyl(0x3a5a4a, [.85, .95, 0], .1, .12, 8); k.cone(0x3a5a4a, [.85, 1.07, 0], .1, .08, 8);
    k.beam(0x3a5a4a, [.85, .85, 0], [.6, .72, 0], .05); k.beam(0x2e4a3e, [.85, 1.05, 0], [1.3, 1.2, 0], .035); k.ball(0x2e4a3e, [1.3, 1.2, 0], .03, { ao: false });
    k.box(0x9a958c, [.6, -.1, 0], [.3, .15, .3]); bucket(k, [.92, -.02, .45]);
  }));
  taken.push([tx, tz, 1.0]);
  // Futtertrog
  const fa = ta + PI + k.R(-.3, .3), fx = Math.cos(fa) * 2.4, fz = Math.sin(fa) * 2.4, fy = groundMax(F, fx, fz, .7);
  on(k, fy, () => k.in([fx, fy, fz], -fa + PI / 2, () => {
    for (const sx of [-.5, .5]) for (const s of [-1, 1]) k.beam(W.dark, [sx, -.05, s * .25], [sx, .5, -s * .05], .06);
    for (const s of [-1, 1]) k.box(W.light, [0, .38, s * .12], [1.3, .04, .26], { r: [s * .7, 0, 0], jit: .07 });
    for (const sx of [-.65, .65]) k.box(W.mid, [sx, .36, 0], [.04, .22, .42]);
    for (let i = 0; i < 16; i++) k.ball(k.pick([0xc8a050, 0xb08a40, 0xd8b868]), [k.R(-.55, .55), .45, k.R(-.06, .06)], .04, { ao: false });
  }));
  taken.push([fx, fz, .85]);
  // Leckstein am Pfahl, Schattenbaum, Weidegras mit Klee
  scatter(k, F, 1, .3, (x, y, z) => { k.cyl(W.gray, [x, y - .2, z], .06, 1.1, 6); k.box(0xe8e0e8, [x + .07, y + .65, z], [.14, .14, .12], { jit: .05 }); }, 20, taken);
  if (k.rand() < .55) scatter(k, F, 1, 1.4, (x, y, z) => N.leafTree(k, [x, y, z], Math.min(1.05, (room(x, z) - .4) / 1.5)), 30, taken);
  let sheep = 0; for (const r of [.8, .8, .8, .6, .6, .5, .45]) { if (sheep >= 3) break; scatter(k, F, 1, r, (x, y, z) => { if (room(x, z) > 1.15) { ctx.S('sheep', x, z, { ry: k.R(0, TAU) }); sheep++; } }, 60, taken); }
  scatter(k, F, 30, .12, (x, y, z) => N.grass(k, [x, y, z], k.R(.6, .95), k.pick([0x6aa84f, 0x5f9a3e])), 8, taken);
  scatter(k, F, 26, .05, (x, y, z) => clover(k, [x, y, z], k.pick([0xe8e0e8, 0xe8a0c8, 0xffffff])), 6, taken);
  scatter(k, F, 2, .4, (x, y, z) => N.rock(k, [x, y, z], k.R(.4, .7)), 20, taken);
  scatter(k, F, 8, .1, (x, y, z) => k.ball(0x5a4a30, [x, y + .015, z], [.05, .025, .05], { ao: false }), 8, taken);   // Köttel
  ctx.S('meadow', 0, 0);
}

// ---------- Steinkreis ----------
// Runen (Striche in Einheitskoordinaten x −.5….5, y 0…1)
const RUNES = [
  [[0, 0, 0, 1], [0, .75, .4, 1], [0, .5, .4, .75]],          // ᚠ
  [[-.3, 0, -.3, 1], [-.3, 1, .3, .7], [.3, .7, .3, 0]],        // ᚢ
  [[-.2, 0, -.2, 1], [-.2, .75, .25, .5], [.25, .5, -.2, .25]], // ᚦ
  [[0, 0, 0, 1], [0, 1, .35, .75], [0, .65, .35, .4]],          // ᚨ
  [[-.3, 0, .3, 1], [.3, 0, -.3, 1]],                           // ᚷ
  [[0, 0, 0, 1], [0, .5, .35, .75], [0, .5, -.35, .75], [0, .5, .35, .25], [0, .5, -.35, .25]],   // ᛉ-artig
  [[0, 0, 0, 1], [0, 1, -.3, .7], [0, 1, .3, .7]],              // ᛏ
  [[-.25, 0, -.25, 1], [.25, 0, .25, 1], [-.25, .6, .25, .4]],  // ᚺ
  [[-.3, 1, .3, .5], [.3, .5, -.3, 0], [-.3, .5, .3, 0], [.3, 1, -.3, .5]],   // ᛟ-artig
  [[0, 0, 0, 1], [0, .7, .3, .45], [.3, .45, 0, .2]],           // ᛒ-artig
  [[0, 0, 0, 1], [-.3, .3, .3, .7]],                            // ᚾ
  [[-.3, .5, 0, 1], [0, 1, .3, .5], [.3, .5, 0, 0], [0, 0, -.3, .5]],   // ᛜ
];
function runeRow(k, hit, base, up, right, fwd, n, size, col, step) {  // fwd = Blickrichtung auf die Fläche, step = Richtung der Zeile
  step ??= up;
  for (let g = 0; g < n; g++) {
    const R = k.pick(RUNES), o = g * size * 1.35;
    for (const [ax, ay, bx, by] of R) {
      const ends = [[ax, ay], [bx, by]].map(([u, v]) => { const p = [0, 1, 2].map(q => base[q] + step[q] * o + right[q] * u * size + up[q] * v * size);
        return hit([p[0] - fwd[0] * 2, p[1] - fwd[1] * 2, p[2] - fwd[2] * 2], fwd); });
      if (!ends[0] || !ends[1]) continue;
      const [a, b] = ends.map(h => [h.p[0] + h.n[0] * .004, h.p[1] + h.n[1] * .004, h.p[2] + h.n[2] * .004]);
      if (len3(sub(a, b)) < .01 || len3(sub(a, b)) > size * 1.6) continue;
      k.beam(col, a, b, .026, { layer: 'glow', tag: 2, ao: false, jit: 0 });
    }
  }
}
function menhir(k, F, x, z, h, w, d, face, hitOut) {   // face = Winkel zur Mitte
  const g0 = groundMin(F, x, z, w) - .3, lean = [k.R(-.05, .05), 0, k.R(-.05, .05)], seg = k.rand() < .5 ? 5 : 6;
  const geo = put(k, HEWN(Math.floor(k.rand() * 5), seg), k.pick([0x8f8b84, 0x9a958c, 0x86827a, 0xa09a90]), [x, g0, z], [w, h + .3, d], { r: [lean[0], -face + PI / 2, lean[2]], jit: .06 });
  hitOut.push(geo); return { g0, top: g0 + h + .3 };
}
export function tile_steine(k, F, ctx) {
  const taken = [], n = 7 + Math.floor(k.R(0, 3)), a0 = k.R(0, TAU), rr = 3.25, runeC = k.pick([0x6ae0ff, 0x6ae0ff, 0x8affc8, 0xa88aff]);
  const fallen = k.rand() < .5 ? Math.floor(k.R(0, n)) : -1, king = Math.floor(k.R(0, n));
  const all = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + i / n * TAU + k.R(-.06, .06), r = rr + k.R(-.15, .15), x = Math.cos(a) * r, z = Math.sin(a) * r;
    taken.push([x, z, .7]);
    if (i === fallen) {                       // umgestürzter Stein, halb eingesunken
      const geo = put(k, HEWN(2, 6), 0x8f8b84, [x + Math.sin(a) * 1.0, F.h(x, z) + .02, z - Math.cos(a) * 1.0], [.5, 2.0, .36], { r: [0, PI / 2 - a, PI / 2 - .06], order: 'YXZ', jit: .06 });
      const hh = hitter([geo]); dress(k, hh, [x, F.h(x, z) + .3, z], 8, (p, nn) => { if (nn[1] > .4) spatch(k, hh, k.pick(MOSS), p, nn, k.R(.12, .22), .04, TAG.grass); }, .5, 1.3);
      for (let j = 0; j < 6; j++) N.grass(k, [x + k.R(-1, 1), F.h(x, z), z + k.R(-1, 1)], .8);
      continue;
    }
    const h = i === king ? k.R(2.5, 2.8) : k.R(1.5, 2.3), w = k.R(.42, .55), d = k.R(.28, .36), geos = [];
    const { g0, top } = menhir(k, F, x, z, h, w, d, a + PI, geos); all.push(...geos);
    const hit = hitter(geos), C = [x, g0 + h * .5, z], fwd = [Math.cos(a), 0, Math.sin(a)];   // von innen auf die Innenseite
    // Moos unten und oben, Flechten
    dress(k, hit, [x, g0 + .55, z], 7, (p, nn) => { if (p[1] < F.h(x, z) + .7) spatch(k, hit, k.pick(MOSS), p, nn, k.R(.08, .16), .03, TAG.grass); }, -.6, 1.4);
    dress(k, hit, [x, top - .2, z], 3, (p, nn) => { if (nn[1] > .3) spatch(k, hit, k.pick(MOSS), p, nn, k.R(.08, .15), .03, TAG.grass); }, .6, .7);
    dress(k, hit, C, 12, (p, nn) => spatch(k, hit, k.pick(LICHEN), p, nn, k.R(.035, .08), .008), -.5, 1.4);
    // Runen auf der Innenseite
    const up = [0, 1, 0], right = [-Math.sin(a), 0, Math.cos(a)], ng = 2 + Math.floor(k.R(0, i === king ? 3 : 2));
    runeRow(k, hit, [x - fwd[0] * 0, F.h(x, z) + .55, z - fwd[2] * 0], up, right, fwd, ng, .2, runeC);
    // Grasbüschel am Fuß
    for (let j = 0; j < 4; j++) { const b = k.R(0, TAU), px = x + Math.cos(b) * (w + .1), pz = z + Math.sin(b) * (w + .1); N.grass(k, [px, F.h(px, pz), pz], k.R(.7, 1.1), 0x5f9a3e); }
  }
  // Altarstein: Tragsteine und Deckplatte mit Runenkreis, Kerzen, Opfergaben
  const aa = k.R(0, TAU), ca = Math.cos(aa), sa = Math.sin(aa), gA = groundMin(F, 0, 0, .9) - .15, alt = [];
  for (const s of [-1, 1]) alt.push(put(k, SLAB(s > 0 ? 1 : 2), 0x8a867e, [s * ca * .42, gA + .3, s * sa * .42], [.36, .7, .7], { r: [0, -aa, 0], jit: .06 }));
  const capY = gA + .65 + .14;
  alt.push(put(k, SLAB(3), 0x9a958c, [0, capY, 0], [1.45, .26, .95], { r: [k.R(-.03, .03), -aa, k.R(-.03, .03)], jit: .05 }));
  const ah = hitter(alt);
  for (let j = 0; j < 12; j++) {                // Runenkreis oben auf der Platte
    const t0 = j / 12 * TAU, t1 = (j + .7) / 12 * TAU, r = .3;
    const pts = [t0, t1].map(t => ah([Math.cos(t) * r * 1.3 * ca - Math.sin(t) * r * sa, capY + 2, Math.cos(t) * r * 1.3 * sa + Math.sin(t) * r * ca], [0, -1, 0]));
    if (pts[0] && pts[1]) k.beam(runeC, pts[0].p.map((v, q) => v + pts[0].n[q] * .004), pts[1].p.map((v, q) => v + pts[1].n[q] * .004), .024, { layer: 'glow', tag: 2, ao: false, jit: 0 });
  }
  for (const sd of [-1, 1]) runeRow(k, ah, [-ca * .4 * sd, capY - .085, -sa * .4 * sd], [0, 1, 0], [ca * sd, 0, sa * sd], [sa * sd, 0, -ca * sd], 5, .12, runeC, [ca * sd, 0, sa * sd]);
  dress(k, ah, [0, capY, 0], 4, (p, nn) => { if (nn[1] > .7 && Math.hypot(p[0], p[2]) > .45) {
    const ch = k.R(.06, .12); k.cyl(0xf2ead8, [p[0], p[1] - .01, p[2]], .03, ch, 7, { ao: false }); k.cyl(DARK, [p[0], p[1] + ch - .01, p[2]], .004, .02, 3, { ao: false }); k.cone(0xffd890, [p[0], p[1] + ch + .005, p[2]], .012, .04, 5, { layer: 'glow', tag: 1, ao: false }); } }, .9, .5);  // Kerzenstummel
  dress(k, ah, [0, capY, 0], 3, (p, nn) => { if (nn[1] > .7) bloom(k, p, k.pick([0xe85a8a, 0xf2e14a, 0xffffff]), .05); }, .9, .6);
  dress(k, ah, [0, capY, 0], 7, (p, nn) => spatch(k, ah, k.pick(LICHEN), p, nn, k.R(.04, .09), .008), -.2, 1.4);
  const bp = ah([ca * .05, capY + 2, sa * .05], [0, -1, 0]); if (bp) { k.cyl(0x8a6a48, bp.p, .1, .05, 9, { top: 1.3, ao: false }); for (let j = 0; j < 4; j++) k.ball(k.pick([0xd8302a, 0xa0102a]), [bp.p[0] + k.R(-.05, .05), bp.p[1] + .06, bp.p[2] + k.R(-.05, .05)], .03, { ao: false }); }   // Schale mit Beeren
  taken.push([0, 0, 1.1]);
  // Pilzring (Hexenring) mit schwach leuchtenden Hüten
  for (let t = 0; t < 30; t++) {
    const a = k.R(0, TAU), d = k.R(1.6, 2.1), cx = Math.cos(a) * d, cz = Math.sin(a) * d, R = k.R(.45, .6);
    if (taken.some(q => Math.hypot(q[0] - cx, q[1] - cz) < q[2] + R) || !F.free(cx, cz, R)) continue;
    for (let j = 0; j < 13; j++) { const b = j / 13 * TAU + k.R(-.1, .1), px = cx + Math.cos(b) * R, pz = cz + Math.sin(b) * R, y = F.h(px, pz), s = k.R(.6, 1);
      k.cyl(0xf2ead8, [px, y, pz], .02 * s, .09 * s, 5, { ao: false }); k.ball(0xe8d8b8, [px, y + .09 * s, pz], [.05 * s, .03 * s, .05 * s], { ao: false });
      k.ball(0xc8f0b0, [px, y + .12 * s, pz], [.022 * s, .006, .022 * s], { layer: 'glow', tag: 2, ao: false }); N.grass(k, [px + k.R(-.1, .1), y, pz + k.R(-.1, .1)], .7, 0x3f7a34); }
    taken.push([cx, cz, R + .2]); break;
  }
  meadow(k, F, 1.0, taken);
  scatter(k, F, 2, .7, (x, y, z) => N.bush(k, [x, y, z], .8, k.rand() < .5 ? 0x3a3a9a : 0), 20, taken);
  ctx.S('meadow', 0, 0);
}
