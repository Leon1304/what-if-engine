// Sonderbauten der Schwebeinsel: Windmühle, Kapelle, Bauernhof, Wassermühle, Markt, Leuchtturm, Dorfbrunnen, Brücke, Stollen, Steg.
// Alle Funktionen: (k, opts) → zeichnen ab Ursprung (Boden), Vorderseite/Eingang nach +x, alles innerhalb r = 4,8 m.
// Bewegliche Teile über k.part, Markierungen über k.spot. Volle Detailstufe (Fasen, Gebrauchsspuren, Kleinteile).
import * as THREE from 'three';
import { TAG } from '../kit.js';
import * as N from './nature.js';

const PI = Math.PI, TAU = PI * 2;

// ---------- Farben ----------
const STONE = [0x9a958c, 0x8c877e, 0xa8a296, 0x827d74, 0x948c80, 0xa09484];
const MORTAR = 0x6e6a62;
const W = { dark: 0x56402c, mid: 0x7a5636, light: 0x9c7a52, gray: 0x8a7f70, worn: 0x6e5a44, pale: 0xb89a6e, tar: 0x3a3230 };
const IRON = 0x3a3a3e, RUST = 0x7a4a2e, BRASS = 0xc8a040;
const SLATE = [0x4a5058, 0x434950, 0x535a63, 0x3d434b];
const TILE = [0xa8482e, 0x9e4028, 0xb05234, 0x94402a];
const CLOTH = 0xeee6d2, SACK = [0xe2d6b6, 0xd8caa6, 0xe8dec2];
const MOSS = 0x5a7438, DARK = 0x1e1a18;

// ---------- eigene Grundkörper (Vorlagen) ----------
const TPL = {};
function tpl(name, make) { if (!TPL[name]) { let g = make(); g.deleteAttribute('uv'); if (g.index) g = g.toNonIndexed(); g.computeVertexNormals(); TPL[name] = g; } return TPL[name]; }
// Halbzylinder: Achse y (0…1), obere Hälfte zeigt nach −x (nach Drehung um z um −90° nach oben)
const HALF = seg => tpl('half' + seg, () => new THREE.CylinderGeometry(1, 1, 1, seg, 1, false, PI, PI).translate(0, .5, 0));
// Ring (Torus-artig, flach): Rohr mit Loch
const RING = (seg, ri) => tpl('ring' + seg + '_' + ri, () => {
  const s = new THREE.Shape(); s.absarc(0, 0, 1, 0, TAU, false); const h = new THREE.Path(); h.absarc(0, 0, ri, 0, TAU, true); s.holes.push(h);
  return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: seg }).rotateX(-PI / 2);
});

// ---------- Rahmen-Helfer ----------
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1);
// Rahmen mit voller Drehung (Reihenfolge YXZ: erst gieren, dann kippen, dann rollen)
function rot(k, p, r, fn) {
  _e.set(r[0], r[1], r[2], 'YXZ'); _q.setFromEuler(_e);
  k.pushM(new THREE.Matrix4().compose(_v.set(...p), _q, _one)); fn(); k.pop();
}
// Wandrahmen: Fläche bei x = 0, nach außen +x, entlang der Wand z. a = Richtung der Außenseite (Winkel von +x nach +z)
function face(k, p, a, fn, lean = 0) { rot(k, p, [0, -a, lean], fn); }
// Scherung (für schräge Brücke): x' = x + z * s
function shear(k, s, fn) { const m = new THREE.Matrix4().set(1, 0, s, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1); k.pushM(m); fn(); k.pop(); }

// ---------- Mauerwerk ----------
// Steine auf einer Wandfläche (Rahmen von face): z0…z1, y0…y1, ragen d heraus. skip(z, y) → true lässt eine Öffnung frei.
function stones(k, z0, z1, y0, y1, o = {}) {
  const ch = o.ch ?? .28, d = o.d ?? .05, gap = o.gap ?? .03, cols = o.cols || STONE, sl = o.len || [.32, .6];
  let row = 0;
  for (let y = y0; y < y1 - .05; y += ch, row++) {
    const h = Math.min(ch, y1 - y) - gap;
    let z = z0 + (row % 2 ? -k.R(.1, .25) : 0);
    while (z < z1 - .04) {
      let L = k.R(sl[0], sl[1]); const za = Math.max(z, z0), zb = Math.min(z + L, z1);
      const zm = (za + zb) / 2, ym = y + h / 2;
      if (zb - za > .06 && !(o.skip && o.skip(zm, ym, za, zb))) {
        const dd = d * k.R(.5, 1.3);
        k.boxc(k.pick(cols), [dd / 2 - .02, ym, zm], [dd + .04, h, zb - za - gap], { jit: .07, r: [0, 0, k.R(-.02, .02)] });
        if (o.moss && y > -.12 && y < .3 && k.rand() < o.moss) k.boxc(MOSS, [dd + .005, y + .035, zm], [.03, .07, (zb - za) * .6], { jit: .15 });
      }
      z += L;
    }
  }
}
// Gemauerter Quader mit Mörtelkern und Steinen auf allen vier Seiten
function masonry(k, x0, x1, y0, y1, z0, z1, o = {}) {
  k.box(o.mortar ?? MORTAR, [(x0 + x1) / 2, y0, (z0 + z1) / 2], [x1 - x0, y1 - y0, z1 - z0], { jit: .03 });
  const sides = o.sides || [0, 1, 2, 3];
  const F = [[[x1, 0, (z0 + z1) / 2], 0, z1 - z0], [[(x0 + x1) / 2, 0, z1], PI / 2, x1 - x0], [[x0, 0, (z0 + z1) / 2], PI, z1 - z0], [[(x0 + x1) / 2, 0, z0], -PI / 2, x1 - x0]];
  for (const i of sides) { const [p, a, L] = F[i]; face(k, p, a, () => stones(k, -L / 2 + .02, L / 2 - .02, y0, y1, { ...o, skip: o.skip && o.skip[i] })); }
  if (o.cap) k.box(o.cap, [(x0 + x1) / 2, y1, (z0 + z1) / 2], [x1 - x0 + .12, .1, z1 - z0 + .12]);
}

// ---------- Dach ----------
// Schindel-/Ziegelreihen auf einer Dachfläche. Rahmen: Ursprung am First, +z hangabwärts, +y nach außen. Fläche w breit, L lang.
function roofRows(k, w, L, o = {}) {
  const rh = o.rh ?? .22, t = o.t ?? .05, cols = o.cols || SLATE, n = Math.ceil(L / rh);
  k.box(o.under ?? 0x3a3430, [0, -t * 1.2, L / 2], [w, t * 1.2, L], { r: [0, 0, 0] }); // Dachhaut darunter
  for (let i = 0; i < n; i++) {
    const z = L - (i + 1) * rh, c = k.pick(cols);
    if (o.single) {                         // einzelne Schindeln (für nahe Dächer / kleine Flächen)
      const sw = o.sw ?? .32; let x = -w / 2 + (i % 2) * sw / 2 - sw / 2;
      while (x < w / 2) { const a = Math.max(x, -w / 2), b = Math.min(x + sw, w / 2); if (b - a > .05) k.box(k.rand() < .1 ? k.pick(cols) : c, [(a + b) / 2, 0, z + rh * .55], [b - a - .02, t, rh * 1.35], { r: [-.1 - k.R(0, .05), 0, 0], jit: .05 }); x += sw; }
    } else {
      k.box(c, [0, 0, z + rh * .55], [w, t, rh * 1.35], { r: [-.1, 0, 0], jit: .04 });
      if (k.rand() < (o.wear ?? .25)) k.box(k.pick(cols), [k.R(-w / 2 + .3, w / 2 - .3), t * .4, z + rh * .5], [k.R(.2, .4), t, rh * 1.2], { r: [-.16, k.R(-.1, .1), 0] });
    }
    if (o.moss && i < 3 && k.rand() < o.moss) k.box(MOSS, [k.R(-w / 2 + .3, w / 2 - .3), t * .9, z + rh * .75], [k.R(.2, .45), .03, rh * .6], { r: [-.1, 0, 0], jit: .15 });
  }
}
// Satteldach (First entlang x) über Breite d (z), Länge len (x), Traufhöhe y0, Neigung a, Überstand ov
function gable(k, len, d, y0, a, o = {}) {
  const ov = o.ov ?? .3, L = (d / 2 + ov) / Math.cos(a), ry = y0 + (d / 2) * Math.tan(a);
  for (const s of [1, -1]) rot(k, [0, ry + .04, 0], [a, s > 0 ? 0 : PI, 0], () => roofRows(k, len + 2 * (o.ovx ?? .3), L, o));
  // Firstkappe
  k.boxc(o.ridge ?? 0x3a3e44, [0, ry + .1, 0], [len + 2 * (o.ovx ?? .3) + .04, .12, .2], { r: [PI / 4, 0, 0] });
  return ry;
}

// ---------- Fenster, Türen ----------
// Fenster im Wandrahmen (Fläche x = 0): Mitte z, Unterkante y, Breite w, Höhe h. o.arch: 'round' | 'point', o.stained, o.shutters, o.box
function windowAt(k, z, y, w, h, o = {}) {
  const fc = o.frame ?? 0xe8e0d0, fd = o.fd ?? .07, ft = o.ft ?? .07;
  k.box(DARK, [.012, y, z], [.03, h, w], { ao: false });                                   // dunkle Laibung
  if (o.stained) {                                                                          // Bleiglas: bunte Felder
    const cols = o.stained, nx = 2, ny = Math.max(2, Math.round(h / .28));
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++)
      k.box(cols[(i + j * 3 + Math.floor(k.rand() * 2)) % cols.length], [.03, y + j * h / ny, z - w / 2 + (i + .5) * w / nx], [.02, h / ny - .025, w / nx - .025], { layer: 'glass', tag: 2, ao: false, jit: .12 });
  } else k.box(0x9ab8c8, [.03, y, z], [.02, h, w], { layer: 'glass', ao: false, jit: 0 });
  // Rahmen
  k.box(fc, [fd / 2, y - ft, z], [fd, ft, w + 2 * ft], { ao: false });
  if (!o.arch) k.box(fc, [fd / 2, y + h, z], [fd, ft, w + 2 * ft], { ao: false });
  for (const s of [-1, 1]) k.box(fc, [fd / 2, y - ft / 2, z + s * (w / 2 + ft / 2)], [fd, h + ft * 1.5, ft], { ao: false });
  // Sprossen
  if (o.bars !== false) { k.box(fc, [.045, y, z], [.03, h, .035], { ao: false }); k.box(fc, [.045, y + h * (o.split ?? .55), z], [.03, .035, w], { ao: false }); }
  // Bogen
  if (o.arch === 'round') {
    const r = w / 2 + ft;
    k.add(HALF(10), DARK, [.012, y + h, z], [w / 2, .03, w / 2], { r: [0, 0, -PI / 2], ao: false });
    k.add(HALF(10), o.stained ? o.stained[1] : 0x9ab8c8, [.03, y + h, z], [w / 2 - .02, .02, w / 2 - .02], { r: [0, 0, -PI / 2], layer: 'glass', tag: o.stained ? 2 : 0, ao: false });
    for (let i = 0; i <= 6; i++) { const t = i / 6 * PI; k.boxc(fc, [fd / 2, y + h + Math.sin(t) * (r - ft / 2), z + Math.cos(t) * (r - ft / 2)], [fd, ft, r * PI / 6 + .02], { r: [PI / 2 - t, 0, 0], ao: false }); }
  } else if (o.arch === 'point') {
    const ah = w * .75;
    k.prism(DARK, [.012, y + h, z], w, ah, .03, { r: [0, PI / 2, 0], ao: false });
    k.prism(o.stained ? o.stained[2 % o.stained.length] : 0x9ab8c8, [.03, y + h + .02, z], w - .06, ah - .06, .02, { r: [0, PI / 2, 0], layer: 'glass', tag: o.stained ? 2 : 0, ao: false });
    for (const s of [-1, 1]) k.beam(fc, [fd / 2, y + h - ft / 2, z + s * (w / 2 + ft / 2)], [fd / 2, y + h + ah + ft * .3, z], ft, { w: ft, d: fd, ao: false });
  }
  if (o.sill !== false) k.box(o.sillC ?? 0xb8b0a0, [.08, y - ft - .06, z], [.18, .06, w + 2 * ft + .1]);
  if (o.shutters) for (const s of [-1, 1]) {
    const sz = z + s * (w / 2 + ft + w * .27);
    k.box(o.shutters, [.04, y - .02, sz], [.04, h + .04, w * .52]);
    for (const yy of [.2, .8]) k.box(W.dark, [.07, y + h * yy, sz], [.02, .05, w * .5], { ao: false });
    k.box(IRON, [.06, y + h * .5, z + s * (w / 2 + ft + .02)], [.03, .04, .04], { ao: false });
  }
  if (o.box) {                                                               // Blumenkasten
    k.box(o.box === true ? 0x8a5a3a : o.box, [.17, y - ft - .32, z], [.2, .24, w + .1]);
    for (let i = 0; i < 5; i++) k.ball(k.pick([0xe84a4a, 0xf2e14a, 0xe85a8a, 0xffffff]), [.18 + k.R(-.05, .05), y - ft - .05, z - w / 2 + (i + .5) * w / 5], .07, { ao: false, tag: TAG.flower });
    for (let i = 0; i < 6; i++) k.ball(0x4f9a3a, [.15 + k.R(-.05, .05), y - ft - .1, z - w / 2 + (i + .5) * w / 6], [.09, .07, .09], { ao: false, tag: TAG.leaf });
  }
}
// Brettertür im Wandrahmen: Mitte z, Unterkante y, Breite w, Höhe h. o.double, o.arch, o.color
function doorAt(k, z, y, w, h, o = {}) {
  const c = o.color ?? W.mid, fc = o.frame ?? W.dark, ft = .1;
  k.box(DARK, [.01, y, z], [.03, h, w], { ao: false });
  const n = Math.max(3, Math.round(w / .16));
  for (let i = 0; i < n; i++) k.box(i % 2 ? c : (o.color2 ?? c), [.05, y, z - w / 2 + (i + .5) * w / n], [.06, h - .02, w / n - .015], { jit: .1 });
  for (const yy of [.15, .8]) k.box(o.band ?? IRON, [.085, y + h * yy, z], [.025, .07, w - .04], { ao: false });     // Beschläge
  if (o.double) k.box(fc, [.09, y, z], [.03, h, .04], { ao: false });
  // Klinke + Schloss
  const kz = o.double ? .12 : w / 2 - .14;
  k.box(BRASS, [.1, y + h * .48, z + kz], [.03, .14, .07], { ao: false, jit: 0 });
  k.boxc(BRASS, [.14, y + h * .5, z + kz - .03], [.04, .025, .12], { ao: false, jit: 0 });
  if (o.double) { k.box(BRASS, [.1, y + h * .48, z - kz], [.03, .14, .07], { ao: false }); k.boxc(BRASS, [.14, y + h * .5, z - kz + .03], [.04, .025, .12], { ao: false }); }
  // Zarge
  for (const s of [-1, 1]) k.box(fc, [.06, y, z + s * (w / 2 + ft / 2)], [.12, h + ft, ft]);
  if (o.arch === 'round') {
    k.add(HALF(10), DARK, [.01, y + h, z], [w / 2, .03, w / 2], { r: [0, 0, -PI / 2], ao: false });
    k.add(HALF(10), c, [.03, y + h, z], [w / 2 - .02, .05, w / 2 - .02], { r: [0, 0, -PI / 2] });
    const r = w / 2 + ft / 2;
    for (let i = 0; i <= 7; i++) { const t = i / 7 * PI; k.boxc(fc, [.06, y + h + Math.sin(t) * r, z + Math.cos(t) * r], [.12, ft, r * PI / 7 + .03], { r: [PI / 2 - t, 0, 0] }); }
  } else k.box(fc, [.06, y + h, z], [.12, ft, w + 2 * ft]);
  if (o.step !== false) { k.box(o.stepC ?? 0x9a958c, [.25, y - .18, z], [.5, .18, w + .4], { jit: .05 }); }
}

// ---------- Kleinteile ----------
// Laterne an Wandarm (Rahmen von face) oder auf Pfahl. Gibt Lampenpunkt zurück.
function lanternHead(k, p, s = 1) {
  const [x, y, z] = p;
  k.cyl(IRON, [x, y - .04 * s, z], .1 * s, .04 * s, 6);
  k.cyl(0xffd27a, [x, y, z], .085 * s, .22 * s, 6, { layer: 'glow', tag: 1, ao: false });
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + PI / 4; k.box(IRON, [x + Math.cos(a) * .088 * s, y, z + Math.sin(a) * .088 * s], [.02 * s, .22 * s, .02 * s], { ao: false }); }
  k.cone(IRON, [x, y + .22 * s, z], .13 * s, .12 * s, 6);
  k.cyl(IRON, [x, y + .34 * s, z], .02 * s, .06 * s, 4); k.add(RING(6, .5), IRON, [x, y + .4 * s, z], [.04 * s, .015, .04 * s], { ao: false });
  return [x, y + .11 * s, z];
}
function wallLantern(k, p, a) {                // p = Wandpunkt, a = Richtung nach außen; setzt spot 'light'
  let L;
  face(k, p, a, () => {
    k.box(IRON, [.01, -.12, 0], [.03, .3, .08], { ao: false });
    k.beam(IRON, [.02, 0, 0], [.32, 0, 0], .035); k.beam(IRON, [.02, -.12, 0], [.24, 0, 0], .025);
    k.cyl(IRON, [.32, -.06, 0], .012, .06, 4);
    L = lanternHead(k, [.32, -.32, 0], .9);
    k.spot('light', L);
  });
}
function postLantern(k, p, h = 2.2) {
  const [x, y, z] = p;
  k.box(0x8a8780, [x, y - .3, z], [.3, .42, .3], { jit: .06 });
  k.cyl(IRON, [x, y + .1, z], .06, h - .2, 6, { top: .7 });
  k.cyl(IRON, [x, y + .1, z], .1, .15, 6);
  k.beam(IRON, [x, y + h - .2, z], [x + .3, y + h - .05, z], .03);
  return lanternHead(k, [x, y + h - .1, z], 1);
}
function sack(k, p, ry = 0, s = 1, lying = false) {
  const c = k.pick(SACK);
  k.in(p, ry, () => {
    if (lying) {
      k.cyl(c, [-.28 * s, .17 * s, 0], .17 * s, .56 * s, 7, { r: [0, 0, -PI / 2], jit: .06 });
      k.ball(c, [.3 * s, .17 * s, 0], [.08 * s, .14 * s, .15 * s], { jit: .05 });
      k.cyl(0x8a6a3a, [.33 * s, .16 * s, 0], .05 * s, .06 * s, 5, { r: [0, 0, -PI / 2], ao: false });
    } else {
      k.cyl(c, [0, 0, 0], .2 * s, .42 * s, 7, { top: .85, jit: .06 });
      k.ball(c, [0, .42 * s, 0], [.17 * s, .08 * s, .17 * s], { jit: .05 });
      k.cyl(0x8a6a3a, [0, .44 * s, 0], .06 * s, .05 * s, 5, { ao: false });
      k.cone(c, [0, .49 * s, 0], .07 * s, .08 * s, 5, { ao: false });
    }
  });
}
function barrel(k, p, s = 1, c = W.mid) {
  const [x, y, z] = p;
  k.cyl(c, [x, y, z], .26 * s, .35 * s, 9, { top: 1.12 }); k.cyl(c, [x, y + .35 * s, z], .29 * s, .35 * s, 9, { top: .9 });
  for (const yy of [.06, .3, .4, .64]) k.cyl(IRON, [x, y + yy * s, z], (yy < .2 || yy > .6 ? .27 : .295) * s + .012, .04 * s, 9, { ao: false });
  k.cyl(0x6a4a30, [x, y + .7 * s, z], .25 * s, .015, 9, { ao: false });
}
function crate(k, p, ry = 0, s = 1, fill) {
  k.in(p, ry, () => {
    const w = .55 * s, h = .38 * s;
    k.box(W.pale, [0, 0, 0], [w, h * .9, w * .75], { jit: .1 });
    for (const yy of [.04, h * .55]) for (const zz of [-1, 1]) k.box(0xa8885e, [0, yy, zz * w * .38], [w + .02, .1 * s, .02], { ao: false });
    for (const xx of [-1, 1]) k.box(0xa8885e, [xx * w * .5, 0, 0], [.02, h * .9, w * .78], { ao: false });
    if (fill) for (let i = 0; i < 9; i++) k.ball(k.pick(fill), [k.R(-w * .35, w * .35), h * .85, k.R(-w * .26, w * .26)], k.R(.06, .08) * s, { ao: false, jit: .1 });
  });
}
function wheel(k, p, r, ry = 0, spokes = 8, c = W.mid) {   // Rad stehend, Achse entlang z (nach Drehung ry)
  k.in(p, ry, () => {
    k.add(RING(14, .82), c, [0, 0, -.05], [r, .1, r], { r: [PI / 2, 0, 0], ao: false });
    k.add(RING(14, .93), IRON, [0, 0, -.055], [r + .015, .11, r + .015], { r: [PI / 2, 0, 0], ao: false });
    k.cyl(W.dark, [0, 0, -.09], r * .2, .18, 8, { r: [PI / 2, 0, 0], ao: false });
    for (let i = 0; i < spokes; i++) { const a = i / spokes * TAU; k.beam(c, [0, 0, 0], [Math.cos(a) * r * .85, Math.sin(a) * r * .85, 0], .045, { ao: false }); }
  });
}
// Handkarren: Deichsel nach +x
function cart(k, p, ry = 0, load) {
  k.in(p, ry, () => {
    k.ground = -1e9;
    const y0 = .5;
    for (const s of [-1, 1]) wheel(k, [-.2, .4, s * .58], .4, 0, 8);
    k.cyl(IRON, [-.2, .4, -.62], .03, 1.24, 5, { r: [PI / 2, 0, 0] });
    k.box(W.light, [-.2, y0, 0], [1.5, .07, 1.0], { jit: .08 });                       // Ladefläche
    for (let i = 0; i < 6; i++) k.box(W.pale, [-.2 - .75 + (i + .5) * .25, y0 + .07, 0], [.23, .02, 1.0], { ao: false, jit: .12 });
    for (const s of [-1, 1]) { k.box(W.mid, [-.2, y0 + .07, s * .48], [1.5, .3, .05]); k.box(W.dark, [-.2, y0 + .38, s * .48], [1.56, .04, .08]); }
    k.box(W.mid, [-.97, y0 + .07, 0], [.05, .3, 1.0]);
    for (const s of [-1, 1]) { k.beam(W.dark, [.4, y0 + .02, s * .35], [1.45, .62, s * .32], .07); k.box(W.dark, [-.9, 0, s * .4], [.07, y0, .07]); }
    k.beam(W.dark, [1.35, .62, -.32], [1.35, .62, .32], .05);
    k.ground = 0;
  });
  if (load) load();
}
function millstone(k, p, ry = 0, lean = .25) {
  rot(k, [p[0], p[1] + .56 * Math.cos(lean) - .04, p[2]], [0, ry, lean - PI / 2], () => {
    k.cyl(0xa8a094, [0, -.14, 0], .58, .26, 12, { jit: .05 });
    k.cyl(0x8e877c, [0, .12, 0], .16, .02, 8, { ao: false });
    k.cyl(DARK, [0, .121, 0], .1, .02, 8, { ao: false });
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; k.box(0x8a837a, [Math.cos(a) * .37, .12, Math.sin(a) * .37], [.36, .01, .03], { r: [0, -a - .5, 0], ao: false }); }
  });
}
function bench(k, p, ry = 0, L = 1.4) {
  k.in(p, ry, () => {
    for (const s of [-1, 1]) { k.box(W.dark, [s * (L / 2 - .15), 0, 0], [.08, .44, .38]); k.box(W.dark, [s * (L / 2 - .15), 0, -.18], [.08, .9, .06]); }
    for (let i = 0; i < 3; i++) k.box(W.light, [0, .44, -.12 + i * .13], [L, .04, .11], { jit: .06 });
    for (let i = 0; i < 2; i++) k.box(W.light, [0, .58 + i * .16, -.2], [L, .1, .03], { jit: .06 });
  });
}
function tufts(k, list) { for (const [x, z, s] of list) N.grass(k, [x, 0, z], s ?? 1); }
function pickaxe(k, p, ry = 0) {
  k.in(p, ry, () => {
    k.beam(W.pale, [0, .02, 0], [.85, .55, 0], .04);
    rot(k, [.82, .53, 0], [0, 0, .57], () => { k.boxc(IRON, [0, 0, 0], [.05, .5, .05]); k.cone(IRON, [0, .24, 0], .03, .1, 4); k.cone(IRON, [0, -.24, 0], .03, .1, 4, { r: [PI, 0, 0] }); });
  });
}

// =====================================================================================================
// 1) Windmühle (Turmholländer)
// =====================================================================================================
export function windmill(k, opts = {}) {
  const C8 = Math.cos(PI / 8), S8 = Math.sin(PI / 8);
  const yb = 2.2, yt = 8.5, R0 = 2.05, R1 = 1.32, Rb = 2.35;
  const Rt = y => R0 + (R1 - R0) * (y - yb) / (yt - yb);
  const tau = Math.atan((R0 - R1) * C8 / (yt - yb)), slant = (yt - yb) / Math.cos(tau);
  // --- Steinsockel (achteckig) ---
  k.cyl(MORTAR, [0, -.8, 0], Rb, yb + .8, 8, { r: [0, PI / 8, 0], jit: .02 });
  for (let i = 0; i < 8; i++) {
    const a = i * PI / 4, ap = Rb * C8, fw = 2 * Rb * S8;
    face(k, [Math.cos(a) * ap, 0, Math.sin(a) * ap], a, () => {
      const door = i === 0, win = i === 2 || i === 5;
      stones(k, -fw / 2 - .02, fw / 2 + .02, -.2, yb - .05, { ch: .3, moss: .35,
        skip: (z, y, za, zb) => (door && zb > -.56 && za < .56 && y < 2.15) || (win && zb > -.3 && za < .3 && y > 1.0 && y < 1.75) });
      if (door) doorAt(k, 0, .08, .9, 1.5, { arch: 'round', color: 0x6a8a5a, color2: 0x5e7e50, stepC: 0x9a958c });
      if (win) windowAt(k, 0, 1.1, .45, .5, { frame: 0xe8e0d0, box: i === 2 });
    });
  }
  // Sockel-Abschluss (Holzschwelle)
  k.cyl(W.dark, [0, yb - .05, 0], Rb + .08, .16, 8, { r: [0, PI / 8, 0] });
  // --- Holzturm ---
  k.cyl(0xb8ae98, [0, yb, 0], R0 - .02, yt - yb, 8, { top: (R1 - .02) / (R0 - .02), r: [0, PI / 8, 0], jit: .02 });
  const SH = [0xd8ccb2, 0xcfc2a4, 0xddd2ba, 0xc8b898];
  for (let i = 0; i < 8; i++) {
    const a = i * PI / 4;
    face(k, [Math.cos(a) * R0 * C8, yb + .08, Math.sin(a) * R0 * C8], a, () => {
      const rh = .24, n = Math.ceil(slant / rh);
      for (let j = 0; j < n; j++) {
        const s = j * rh, R = Rt(yb + s * Math.cos(tau)), w = 2 * R * S8 + .06;
        const gapWin = (i === 0 && s > 1.0 && s < 1.9) || ((i === 2 || i === 6) && s > 3.0 && s < 3.6) || (i === 4 && s > 2.2 && s < 2.9);
        if (gapWin) { // Brett-Reihe links/rechts vom Fenster/der Tür
          const hw = i === 0 ? .48 : .32;
          for (const sd of [-1, 1]) k.box(k.pick(SH), [.02, s, sd * (hw + (w / 2 - hw) / 2)], [.05, rh * 1.25, w / 2 - hw], { r: [0, 0, .1], jit: .05 });
        } else k.box(k.pick(SH), [.02, s, 0], [.05, rh * 1.25, w], { r: [0, 0, .1], jit: .05 });
        if (k.rand() < .06) k.box(0xa89878, [.05, s, k.R(-w / 3, w / 3)], [.04, rh, k.R(.2, .4)], { r: [0, 0, .14] }); // geflickte Schindel
      }
      // Fenster und Galerie-Tür
      if (i === 0) doorAt(k, 0, 1.12, .82, 1.55, { color: 0x6a8a5a, color2: 0x5e7e50, step: false });
      if (i === 2 || i === 6) windowAt(k, 0, 3.05, .42, .5, { frame: 0x5a3e2a, sill: true, sillC: W.mid });
      if (i === 4) windowAt(k, 0, 2.25, .42, .55, { frame: 0x5a3e2a, sillC: W.mid });
      if (i === 1 || i === 7) windowAt(k, 0, 4.7, .34, .42, { frame: 0x5a3e2a, sillC: W.mid, bars: false });
    }, tau);
  }
  for (let i = 0; i < 8; i++) {                                             // Eckpfosten
    const a = i * PI / 4 + PI / 8;
    k.beam(W.dark, [Math.cos(a) * (R0 + .03), yb, Math.sin(a) * (R0 + .03)], [Math.cos(a) * (R1 + .03), yt, Math.sin(a) * (R1 + .03)], .11);
  }
  // --- Galerie ---
  const yg = 3.25, Rg = Rt(yg), Ao = 3.05, Ro = Ao / C8;
  for (let i = 0; i < 8; i++) {
    const a = i * PI / 4;
    face(k, [0, yg, 0], a, () => {
      for (let d = Rg * C8 - .1; d < Ao; d += .23) k.box(k.pick([W.light, W.pale, 0xa88a60]), [d + .1, 0, 0], [.21, .07, 2 * (d + .2) * S8 * 1.02], { jit: .08 });
      k.box(W.dark, [Ao - .05, -.08, 0], [.1, .12, 2 * Ao * S8]);                       // Randbalken
      // Geländer
      const L = 2 * Ao * S8;
      for (const yy of [.5, .95]) k.box(W.mid, [Ao - .05, yy, 0], [.06, .06, L + .02]);
      for (let b = 1; b < 6; b++) k.box(W.mid, [Ao - .05, .07, -L / 2 + b * L / 6], [.04, .88, .04], { ao: false });
      // Strebe darunter
      k.beam(W.dark, [Rg * C8 + .05, -1.2, 0], [Ao - .3, -.04, 0], .09);
    });
    const ca = a + PI / 8;
    k.box(W.dark, [Math.cos(ca) * Ro * .985, yg - .1, Math.sin(ca) * Ro * .985], [.1, 1.2, .1]);   // Eckpfosten Geländer
    k.box(W.dark, [Math.cos(ca) * Ro * .985, yg + 1.1, Math.sin(ca) * Ro * .985], [.13, .05, .13]);
  }
  // Seil und Sack am Geländer, Eimer
  k.box(0xc8b080, [Ao - .02, yg - 1.2, 1.0], [.02, 1.3, .02], { ao: false });
  sack(k, [3.05, .0, 1.0], .4, .8);
  // --- Kappe ---
  k.cyl(W.tar, [0, yt - .05, 0], R1 + .14, .22, 8, { r: [0, PI / 8, 0] });            // Drehkranz
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; k.box(IRON, [Math.cos(a) * (R1 + .15), yt + .02, Math.sin(a) * (R1 + .15)], [.04, .06, .04], { ao: false }); }
  const yc = yt + .17, Rc = 1.45, Lc = 3.2;
  k.cyl(0x8a3a2a, [0, yc - .02, 0], R1 + .2, .3, 8, { r: [0, PI / 8, 0] });
  k.add(HALF(12), 0x7a3226, [-Lc / 2, yc + .28, 0], [Rc, Lc, Rc], { r: [0, 0, -PI / 2], jit: .04 });
  const ns = 11;
  for (let j = 0; j < ns; j++) {
    const ps = (j + .5) / ns * PI, c = j % 2 ? 0x8e3c2c : 0x9a4434;
    k.boxc(c, [0, yc + .28 + Math.sin(ps) * (Rc + .03), Math.cos(ps) * (Rc + .03)], [Lc + .12, .06, PI * Rc / ns + .03], { r: [PI / 2 - ps, 0, 0], jit: .05 });
  }
  k.boxc(W.tar, [0, yc + .28 + Rc + .08, 0], [Lc + .2, .1, .14]);                     // First
  for (const s of [-1, 1]) for (let j = 0; j < 8; j++) {                               // Stirnbretter
    const ps = (j + .5) / 8 * PI; k.boxc(0xe8e0d0, [s * (Lc / 2 + .04), yc + .28 + Math.sin(ps) * Rc, Math.cos(ps) * Rc], [.06, .08, PI * Rc / 8 + .04], { r: [PI / 2 - ps, 0, 0], ao: false });
  }
  k.box(0xe8e0d0, [Lc / 2 + .03, yc + .28, 0], [.05, .04, 2 * Rc], { ao: false });
  face(k, [-Lc / 2 - .02, yc + .45, 0], PI, () => windowAt(k, 0, 0, .4, .4, { frame: 0xe8e0d0, sill: false }));
  // Wetterfahne
  k.cyl(IRON, [0, yc + .28 + Rc, 0], .03, .9, 4);
  k.ball(BRASS, [0, yc + .28 + Rc + .45, 0], .07, { ao: false });
  k.prism(IRON, [0, yc + .28 + Rc + .75, -.0], .5, .25, .02, { r: [PI / 2, 0, 0] });
  k.beam(IRON, [-.35, yc + .28 + Rc + .62, 0], [.35, yc + .28 + Rc + .62, 0], .025);
  // Welle (Achse)
  const yh = yc + .28, xh = Lc / 2 + .55;
  k.cyl(W.dark, [Lc / 2 - .2, yh, 0], .2, .8, 8, { r: [0, 0, -PI / 2] });
  k.cyl(IRON, [Lc / 2 + .05, yh, 0], .24, .08, 8, { r: [0, 0, -PI / 2], ao: false });
  // Steert (Schwanzbalken) mit Kreuzhaspel
  const tb = [-Lc / 2 + .3, yc + .1, 0], te = [-3.25, 4.75, 0];
  k.beam(W.dark, tb, te, .16);
  for (const s of [-1, 1]) k.beam(W.mid, [-1.1, yc + .2, s * 1.1], [-2.3, 6.9, 0], .08);
  k.beam(W.mid, [-.9, yc + .1, 0], [-2.0, 7.4, 0], .1);
  rot(k, te, [0, 0, 0], () => {
    k.cyl(W.mid, [0, 0, -.06], .34, .12, 8, { r: [PI / 2, 0, 0] });
    for (let i = 0; i < 4; i++) { const a = i / 4 * PI + PI / 8; k.beam(W.light, [Math.cos(a) * -.55, Math.sin(a) * -.55, .05], [Math.cos(a) * .55, Math.sin(a) * .55, .05], .05); }
  });
  k.beam(IRON, [te[0] + .05, te[1] - .1, 0], [-3.0, yg + .95, .25], .025, { ao: false });  // Kette zum Geländer
  // --- Flügel (drehend) ---
  k.part('sails', [xh, yh, 0], s => {
    s.cyl(W.dark, [-.35, 0, 0], .28, .5, 8, { r: [0, 0, -PI / 2] });                   // Nabe/Wellkopf
    s.cyl(IRON, [.12, 0, 0], .3, .08, 8, { r: [0, 0, -PI / 2], ao: false });
    s.cone(IRON, [.2, 0, 0], .14, .2, 8, { r: [0, 0, -PI / 2] });
    for (let i = 0; i < 4; i++) {
      rot(s, [0, 0, 0], [i * PI / 2 + PI / 4, 0, 0], () => {
        const L = 4.0, r0 = .75, sw = 1.0;
        s.box(W.dark, [0, 0, 0], [.16, L, .16]);                                       // Rute
        s.box(IRON, [-.01, .2, 0], [.19, .4, .19], { ao: false });
        for (const zz of [-.25, -sw]) s.box(0x6a3a2a, [0, r0, zz], [.06, L - r0 + .02, .05]); // Längsleisten
        s.box(0x6a3a2a, [0, r0, .22], [.06, L - r0 + .02, .05]);
        const nb = 10;
        for (let b = 0; b <= nb; b++) s.boxc(0x7a4232, [.03, r0 + b * (L - r0) / nb, -sw / 2 + .11], [.05, .05, sw + .45]);   // Sprossen
        // Segeltuch (leicht gewölbt, aus drei Bahnen); zwei Flügel voll, zwei halb gerefft
        const full = i % 2 === 0, top = full ? L - .1 : r0 + (L - r0) * .55;
        for (let b = 0; b < 3; b++) s.box(i % 2 ? 0xe8dcc2 : CLOTH, [-.05 - b * .01, r0 + .05, -.3 - b * .23 - .11], [.02, top - r0 - .1, .25], { r: [0, .06 * (b - 1), 0], ao: false, jit: .03 });
        if (!full) for (let b = 0; b < 3; b++) s.cyl(CLOTH, [-.06, top, -.3 - b * .23 - .11], .07, .02, 6, { ao: false });
        s.beam(0xc8b080, [.04, r0, .22], [.04, L, -sw], .015, { ao: false });          // Seil diagonal
      });
    }
  }, { spin: [1, 0, 0], speed: .6 });
  // --- Vorplatz: Mehlsäcke, Karren, Mühlstein, Fass, Laterne ---
  wallLantern(k, [Rb * C8 + .02, 1.85, -.75], 0);
  sack(k, [2.9, 0, .95], .3, 1); sack(k, [3.25, 0, 1.25], 1.2, .95); sack(k, [2.85, .0, 1.45], 2.2, .9, true); sack(k, [3.1, .46, 1.05], .8, .85, true);
  cart(k, [2.2, 0, -2.7], -.7, () => { sack(k, [2.05, .58, -2.75], .9, .85, true); sack(k, [2.45, .58, -2.42], .7, .85, true); });
  millstone(k, [1.72, 0, 1.72], -PI / 4, .22);
  barrel(k, [-1.9, 0, 2.4], 1, W.mid);
  crate(k, [-2.45, 0, 1.85], .4, 1, [0xd8a83a, 0xc89a2a]);
  tufts(k, [[2.6, -1.0], [2.0, -1.7, .8], [-2.4, -.8], [-1.0, -2.6, 1.2], [1.2, 2.6], [-2.7, .6, .9], [.3, -2.75], [2.7, .3, .7]]);
  for (const [x, z] of [[-1.3, -2.4], [-1.6, -2.2], [-1.0, -2.55], [2.5, -1.4], [2.55, -1.1]]) N.flower(k, [x, 0, z]);
  k.spot('door', [Rb * C8 + .6, 0, 0], { a: 0 });
  return { tris: 0 };
}

// Pyramide / Kegelstumpf mit n Seiten und Schindelreihen: y0…y1, Apothem A0…A1 (A1 = 0 → Spitze)
function taperRows(k, n, y0, y1, A0, A1, o = {}) {
  const tn = Math.tan(PI / n), cn = Math.cos(PI / n), tau = Math.atan((A0 - A1) / (y1 - y0)), sl = (y1 - y0) / Math.cos(tau);
  const rh = o.rh ?? .2, cols = o.cols || SLATE, ov = o.ov ?? .04;
  k.cyl(o.under ?? 0x2e3236, [0, y0, 0], A0 / cn - .02, y1 - y0, n, { top: A1 / A0, r: [0, PI / n, 0], jit: .02 });
  for (let i = 0; i < n; i++) {
    const a = i * TAU / n;
    face(k, [Math.cos(a) * A0, y0, Math.sin(a) * A0], a, () => {
      for (let s = 0; s < sl - .05; s += rh) {
        const A = A0 + (A1 - A0) * (s * Math.cos(tau)) / (y1 - y0), w = 2 * A * tn + ov;
        if (w < .04) break;
        k.box(k.pick(cols), [.015, s, 0], [.04, Math.min(rh * 1.3, sl - s), w], { r: [0, 0, .12], jit: .05 });
      }
    }, tau);
    if (o.hip !== false) { const b = a + PI / n; k.beam(o.hip ?? 0x2a2e33, [Math.cos(b) * (A0 / cn + .03), y0, Math.sin(b) * (A0 / cn + .03)], [Math.cos(b) * (A1 / cn + .03), y1, Math.sin(b) * (A1 / cn + .03)], .07); }
  }
}
// Grabstein: rund oben, leicht schief, Moos
function headstone(k, p, ry, c = 0x9a978f) {
  rot(k, p, [k.R(-.08, .08), ry, k.R(-.07, .07)], () => {
    k.box(c, [0, -.2, 0], [.1, .62, .42], { jit: .06 });
    k.add(HALF(8), c, [-.05, .42, 0], [.21, .1, .21], { r: [0, 0, -PI / 2], jit: .06 });
    for (let i = 0; i < 3; i++) k.box(0x5a5a56, [.05, .2 + i * .07, 0], [.012, .02, .26 - i * .06], { ao: false });
    k.box(MOSS, [.0, -.02, 0], [.12, .08, .44], { ao: false });
  });
}
function graveCross(k, p, ry, c = W.dark) {
  rot(k, p, [k.R(-.06, .06), ry, k.R(-.08, .08)], () => {
    k.box(c, [0, -.25, 0], [.07, 1.05, .07]); k.box(c, [0, .5, 0], [.06, .07, .46]);
    k.cone(c, [0, .8, 0], .06, .06, 4);
  });
}
function graveMound(k, p, ry, flowers) {
  k.in(p, ry, () => {
    k.ball(0x5a7a3a, [0, .02, 0], [.75, .14, .35], { tag: TAG.grass, jit: .1 });
    for (const s of [-1, 1]) { k.box(0x9a978f, [0, -.05, s * .4], [1.5, .14, .07], { jit: .06 }); k.box(0x9a978f, [s * .72, -.05, 0], [.07, .14, .87], { jit: .06 }); }
    if (flowers) for (let i = 0; i < 4; i++) N.flower(k, [k.R(-.5, .5), .05, k.R(-.22, .22)], flowers);
  });
}
// Zypresse / Eibe: schlank, dunkel
function cypress(k, p, s = 1) {
  const [x, y, z] = p; k.cyl(W.dark, [x, y, z], .1 * s, .6 * s, 5);
  const C = [0x2e5a32, 0x355f38, 0x2a5030];
  for (let i = 0; i < 6; i++) { const t = i / 6; k.ball(k.pick(C), [x + k.R(-.05, .05), y + (.8 + t * 3.0) * s, z + k.R(-.05, .05)], [(.62 - t * .38) * s, .75 * s, (.62 - t * .38) * s], { tag: TAG.needle, sway: { k: .05 }, swayBase: y, jit: .1 }); }
  k.cone(C[0], [x, y + 3.6 * s, z], .22 * s, .7 * s, 6, { tag: TAG.needle, sway: { k: .05 }, swayBase: y });
}
// Niedrige Mauer von a nach b (Höhe h, Dicke t), Abdeckplatten
function lowWall(k, a, b, h = .62, t = .34) {
  const dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz), ang = Math.atan2(dz, dx);
  k.in([a[0], a[1], a[2]], -ang, () => {
    masonry(k, 0, L, -.3, h, -t / 2, t / 2, { sides: [1, 3], ch: .26, len: [.38, .62], moss: .3 });
    for (let x = 0; x < L - .05; x += .5) k.box(k.pick([0xa8a296, 0x9a958c, 0xb0aa9e]), [x + .25, h, 0], [Math.min(.48, L - x), .08, t + .1], { r: [0, k.R(-.03, .03), 0], jit: .05 });
  });
}

// =====================================================================================================
// 2) Kapelle
// =====================================================================================================
export function chapel(k, opts = {}) {
  const PL = 0xe8e2d6, x0 = -3.0, x1 = .9, hw = 1.45, ye = 3.2, pitch = 55 * PI / 180;
  const GL = [0xd83a3a, 0x3a6ad8, 0xe8c83a, 0x3aa85a, 0x8a4ad8, 0xe87a2a];
  // --- Schiff ---
  masonry(k, x0, x1, -.8, .55, -hw - .06, hw + .06, { ch: .25, moss: .3 });                     // Sockel
  k.box(PL, [(x0 + x1) / 2, .5, 0], [x1 - x0, ye - .5, hw * 2], { jit: .02 });
  k.prism(PL, [(x0 + x1) / 2, ye, 0], hw * 2, hw * Math.tan(pitch), x1 - x0, { r: [0, PI / 2, 0], jit: .02 });
  k.box(0xc8c0b0, [(x0 + x1) / 2, ye - .12, 0], [x1 - x0 + .06, .12, hw * 2 + .1]);              // Traufgesims
  // Eckquader
  for (const [cx, cz] of [[x0, -hw], [x0, hw], [x1, -hw], [x1, hw]]) for (let y = .55, i = 0; y < ye - .2; y += .3, i++) {
    const lx = i % 2 ? .42 : .26, lz = i % 2 ? .26 : .42;
    k.box(k.pick(STONE), [cx - Math.sign(cx - (x0 + x1) / 2) * (lx / 2 - .03), y, cz - Math.sign(cz) * (lz / 2 - .03)], [lx, .26, lz], { jit: .06 });
  }
  // Fenster (Spitzbogen, Bleiglas) und Strebepfeiler an beiden Seiten
  for (const s of [-1, 1]) {
    face(k, [0, 0, s * hw], s * PI / 2, () => {
      for (const x of [-.55, -2.25]) windowAt(k, -s * x, 1.25, .5, 1.15, { arch: 'point', stained: GL, frame: 0xb8b0a0, bars: false, sillC: 0xb8b0a0 });
      for (const x of [.3, -1.4, -2.9 + .12]) {                          // Strebepfeiler (lokal z = s * x)
        const z = -s * x;
        k.box(k.pick(STONE), [.2, -.2, z], [.42, 2.0, .34], { jit: .05 });
        k.box(k.pick(STONE), [.14, 1.8, z], [.3, .7, .3], { jit: .05 });
        k.box(0xa8a296, [.17, 2.42, z], [.4, .1, .36], { r: [0, 0, .5] });
      }
    });
  }
  // Dach
  k.in([(x0 + x1) / 2, 0, 0], 0, () => gable(k, x1 - x0, hw * 2, ye, pitch, { ov: .32, ovx: .25, cols: SLATE, single: true, sw: .46, rh: .24, moss: .5 }));
  // --- Apsis (halbes Achteck) ---
  k.cyl(MORTAR, [x0, -.8, 0], 1.25, 1.35, 8, { r: [0, PI / 8, 0] });
  for (let i = 3; i <= 5; i++) { const a = i * PI / 4, ap = 1.25 * Math.cos(PI / 8); face(k, [x0 + Math.cos(a) * ap, 0, Math.sin(a) * ap], a, () => stones(k, -.48, .48, -.3, .53, { ch: .25, moss: .3 })); }
  k.cyl(PL, [x0, .5, 0], 1.2, ye - .55, 8, { r: [0, PI / 8, 0], jit: .02 });
  k.cyl(0xc8c0b0, [x0, ye - .2, 0], 1.25, .14, 8, { r: [0, PI / 8, 0] });
  k.in([x0, 0, 0], 0, () => taperRows(k, 8, ye - .08, ye + 1.5, 1.32, .05, { rh: .2 }));
  face(k, [x0 - 1.2 * Math.cos(PI / 8) - .005, 0, 0], PI, () => windowAt(k, 0, 1.4, .4, .9, { arch: 'round', stained: GL, frame: 0xb8b0a0, bars: false }));
  for (const a of [PI - PI / 4, PI + PI / 4]) face(k, [x0 + Math.cos(a) * 1.2 * Math.cos(PI / 8), 0, Math.sin(a) * 1.2 * Math.cos(PI / 8)], a, () => windowAt(k, 0, 1.5, .3, .7, { arch: 'round', stained: GL, frame: 0xb8b0a0, bars: false }));
  // --- Turm ---
  const tx0 = x1 - .05, tx1 = 2.3, tw = .72, yb = 5.5, yf = 6.85;
  masonry(k, tx0, tx1, -.8, yb, -tw, tw, { ch: .29, moss: .4, len: [.36, .62], skip: [(z, y, za, zb) => (zb > -.55 && za < .55 && y < 2.65), null, (z, y) => y < 5.2 - Math.abs(z) * 1.43] });
  k.box(0xc8c0b0, [(tx0 + tx1) / 2, yb - .02, 0], [tx1 - tx0 + .16, .14, tw * 2 + .16]);      // Gesims
  face(k, [tx1, 0, 0], 0, () => {
    doorAt(k, 0, .05, 1.0, 1.75, { double: true, arch: 'round', color: 0x7a4a2a, color2: 0x6e4226, frame: 0xb8b0a0, stepC: 0xa8a296 });
    k.box(0xb8b0a0, [.3, -.35, 0], [.6, .2, 1.6]);                                            // zweite Stufe
    windowAt(k, 0, 3.0, .3, .6, { arch: 'round', stained: GL, frame: 0xb8b0a0, bars: false });
  });
  // Uhren (vorn und an den Seiten)
  const clock = (p, a) => face(k, p, a, () => {
    k.cyl(0xc8c0b0, [0, 0, 0], .44, .06, 14, { r: [0, 0, -PI / 2] });
    k.cyl(0xb8b4a8, [.06, 0, 0], .38, .02, 14, { r: [0, 0, -PI / 2], ao: false, layer: 'glow', tag: 2 });     // leuchtet nachts
    for (let i = 0; i < 12; i++) { const t = i / 12 * TAU; k.boxc(DARK, [.085, Math.cos(t) * .31, Math.sin(t) * .31], [.01, i % 3 ? .04 : .08, .025], { r: [t, 0, 0], ao: false }); }
    const th = k.R(0, TAU), tm = k.R(0, TAU);
    k.boxc(DARK, [.095, Math.cos(th) * .09, Math.sin(th) * .09], [.012, .2, .035], { r: [th, 0, 0], ao: false });   // Stundenzeiger
    k.boxc(DARK, [.1, Math.cos(tm) * .13, Math.sin(tm) * .13], [.012, .28, .022], { r: [tm, 0, 0], ao: false });     // Minutenzeiger
    k.ball(BRASS, [.1, 0, 0], .03, { ao: false });
  });
  clock([tx1 + .02, 4.6, 0], 0); clock([(tx0 + tx1) / 2 + .1, 4.6, tw + .02], PI / 2); clock([(tx0 + tx1) / 2 + .1, 4.6, -tw - .02], -PI / 2);
  // Glockenstube (offen, Holz)
  const cx = (tx0 + tx1) / 2, hp = tw - .08;
  k.box(0x8a7a64, [cx, yb + .1, 0], [tx1 - tx0 - .1, .06, tw * 2 - .1]);                      // Boden
  for (const [px, pz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) k.box(W.dark, [cx + px * (cx - tx0 - .12), yb + .1, pz * hp], [.16, yf - yb - .1, .16]);
  for (const s of [-1, 1]) {
    for (const [a, b] of [[[cx - .6, yf - .55, s * hp], [cx - .2, yf - .08, s * hp]], [[cx + .6, yf - .55, s * hp], [cx + .2, yf - .08, s * hp]], [[cx + s * .6, yf - .55, -hp + .02], [cx + s * .6, yf - .08, -hp + .4]], [[cx + s * .6, yf - .55, hp - .02], [cx + s * .6, yf - .08, hp - .4]]]) k.beam(W.mid, a, b, .07);
    for (let i = 0; i < 3; i++) k.box(W.mid, [cx, yb + .2 + i * .14, s * hp], [tx1 - tx0 - .2, .05, .05], { r: [.5, 0, 0] });    // Schallbretter
    for (let i = 0; i < 3; i++) k.box(W.mid, [cx + s * (cx - tx0 - .12), yb + .2 + i * .14, 0], [.05, .05, tw * 2 - .3], { r: [0, 0, .5] });
  }
  k.box(W.dark, [cx, yf - .06, 0], [tx1 - tx0 + .05, .1, tw * 2 + .05]);                   // Rähm
  k.box(W.dark, [cx, yf - .4, 0], [.12, .14, tw * 2 - .2]);                                 // Glockenjoch
  // Glocke
  const by = yf - .42;
  k.cyl(0xb88a3a, [cx, by - .5, 0], .3, .1, 10, { top: .92 });
  k.cyl(0xc8983e, [cx, by - .4, 0], .27, .32, 10, { top: .62 });
  k.ball(0xb88a3a, [cx, by - .08, 0], [.17, .1, .17]);
  k.cyl(0x9a7230, [cx, by - .02, 0], .05, .1, 6);
  k.add(RING(10, .8), 0x9a7230, [cx, by - .44, 0], [.29, .03, .29], { ao: false });
  k.ball(IRON, [cx, by - .58, 0], .07, { ao: false }); k.cyl(IRON, [cx, by - .55, 0], .015, .4, 4);
  k.beam(0xc8b080, [cx + .1, by - .1, 0], [cx + .1, yb + .12, -.3], .015, { ao: false });     // Glockenseil
  k.spot('bell', [cx, by - .3, 0]);
  // Helm
  k.box(W.dark, [cx, yf + .04, 0], [tx1 - tx0 + .4, .1, tw * 2 + .4]);
  k.in([cx, 0, 0], 0, () => {
    taperRows(k, 4, yf + .14, yf + 3.4, tw + .14, .02, { rh: .19, hip: 0x2a2e33 });
    for (let i = 0; i < 4; i++) { const a = i * PI / 2;                                  // kleine Gauben
      face(k, [Math.cos(a) * (tw - .05), yf + .7, Math.sin(a) * (tw - .05)], a, () => {
        k.box(0x3d434b, [0, 0, 0], [.32, .38, .24]); k.box(DARK, [.15, .04, 0], [.04, .24, .14], { ao: false });
        k.prism(0x3d434b, [.02, .38, 0], .3, .16, .44, { r: [0, PI / 2, 0] });
      }, 0); }
    const yt = yf + 3.4;
    k.cyl(BRASS, [0, yt - .05, 0], .03, .5, 5); k.ball(BRASS, [0, yt + .22, 0], .09, { detail: 1, ao: false });
    k.box(BRASS, [0, yt + .3, 0], [.05, .6, .05], { ao: false }); k.box(BRASS, [0, yt + .62, 0], [.05, .05, .34], { ao: false });
    k.box(IRON, [0, yt + .9, 0], [.02, .12, .02]);
  });
  // --- Friedhof (Seite +z) ---
  const gw = [[1.65, 0, 1.95], [1.65, 0, 3.75], [-1.95, 0, 4.0], [-3.3, 0, 2.85], [-3.3, 0, 1.9]];
  lowWall(k, [1.65, 0, 2.95], gw[1]); for (let i = 1; i < gw.length - 1; i++) lowWall(k, gw[i], gw[i + 1]);
  for (const p of [[1.65, 0, 2.95], [1.65, 0, 1.95]]) { k.box(0xa8a296, [p[0], -.3, p[2]], [.42, 1.2, .42], { jit: .05 }); k.box(0xb8b2a6, [p[0], .9, p[2]], [.5, .08, .5]); k.ball(0xb8b2a6, [p[0], 1.02, p[2]], .12); }
  // offenes Eisentor
  k.in([1.65, 0, 2.74], .5, () => { for (let i = 0; i < 6; i++) k.box(IRON, [.05 + i * .14, .05, 0], [.025, .85 - Math.abs(i - 2.5) * .03, .025], { ao: false }); for (const y of [.15, .75]) k.box(IRON, [.42, y, 0], [.8, .03, .03], { ao: false }); });
  const graves = [[.75, 'stone', 0xffffff], [-.3, 'cross', null], [-1.3, 'stone', 0xe85a8a], [-2.3, 'iron', null]];
  for (const [gx, kind, fl] of graves) {
    const gz = 2.75 + k.R(-.08, .08);
    graveMound(k, [gx, 0, gz], PI / 2 + k.R(-.05, .05), fl);
    if (kind === 'stone') headstone(k, [gx, 0, gz - .8], -PI / 2, k.pick([0x9a978f, 0x8a8780, 0xa8a090]));
    else graveCross(k, [gx, 0, gz - .78], -PI / 2, kind === 'iron' ? IRON : W.dark);
  }
  k.cyl(0x8a3030, [-1.3 + .3, 0, 3.5], .05, .12, 6); k.cyl(0xffb050, [-1.0, .12, 3.5], .02, .04, 4, { layer: 'glow', tag: 1, ao: false });   // Grablicht
  cypress(k, [-2.95, 0, 2.35], .9);
  // --- Linde, Bank, Laterne (Seite −z) ---
  N.leafTree(k, [1.75, 0, -2.85], .6);
  bench(k, [.3, 0, -2.5], PI, 1.3); k.spot('sit', [.3, .45, -2.5], { a: -PI / 2 });
  const Lp = postLantern(k, [2.85, 0, -1.2], 2.3); k.spot('light', Lp);
  wallLantern(k, [tx1, 2.3, .62], 0);
  // Wegplatten zum Tor
  for (let i = 0; i < 4; i++) k.box(0xa8a296, [2.6 + i * .5, -.08, 0], [.42, .1, .9 + k.R(-.1, .1)], { r: [0, k.R(-.1, .1), 0], jit: .06 });
  tufts(k, [[-3.6, -.8], [-2.2, -1.9], [-.8, -1.8, .8], [1.0, 1.1], [-3.8, 1.2], [.2, -1.85, .7], [2.6, 1.0]]);
  for (const [x, z] of [[-1.0, -1.8], [-1.2, -1.85], [-2.6, -1.8], [.9, 1.15]]) N.flower(k, [x, 0, z]);
  k.spot('door', [tx1 + .7, 0, 0], { a: 0 });
}

// Prisma aus beliebigem Querschnitt (Punkte [z, y]), entlang x von 0 bis 1 extrudiert
function profileGeo(name, pts) {
  return tpl('prof_' + name, () => { const s = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y))); return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }).rotateY(PI / 2); });
}
// Bretterwand im Wandrahmen: z0…z1, y0 bis top(z) (Funktion oder Zahl), Brettbreite bw. skip(z, y0, y1) → Lücke
function boards(k, z0, z1, y0, top, o = {}) {
  const bw = o.bw ?? .22, cols = o.cols || [W.mid], t = o.t ?? .05;
  for (let z = z0; z < z1 - .02; z += bw) {
    const za = z, zb = Math.min(z + bw, z1), zm = (za + zb) / 2;
    const y1 = typeof top === 'function' ? Math.min(top(za), top(zb)) : top;
    if (y1 - y0 < .04) continue;
    if (o.skip) { const g = o.skip(zm); if (g) { if (g[0] > y0 + .02) k.box(k.pick(cols), [t / 2, y0, zm], [t, g[0] - y0, zb - za - .025], { jit: .07 }); if (g[1] < y1 - .02) k.box(k.pick(cols), [t / 2, g[1], zm], [t, y1 - g[1], zb - za - .025], { jit: .07 }); continue; } }
    k.box(k.pick(cols), [t / 2, y0, zm], [t, y1 - y0, zb - za - .025], { jit: .07 });
    if (o.knots && k.rand() < o.knots) k.box(0x5a1a16, [t + .002, y0 + k.R(.3, y1 - y0 - .3), zm + k.R(-.04, .04)], [.01, .05, .05], { ao: false });
  }
}
function milkCan(k, p) {
  const [x, y, z] = p;
  k.cyl(0xb8bcc0, [x, y, z], .14, .38, 8); k.cyl(0xa8acb0, [x, y + .38, z], .14, .1, 8, { top: .5 });
  k.cyl(0xb8bcc0, [x, y + .48, z], .075, .08, 8); k.cyl(0x8a8e92, [x, y + .56, z], .09, .03, 8);
  k.cyl(0x8a8e92, [x, y + .12, z], .145, .025, 8, { ao: false }); k.cyl(0x8a8e92, [x, y + .3, z], .145, .025, 8, { ao: false });
}
function pitchfork(k, p, ry = 0, lean = .25) {
  rot(k, p, [0, ry, lean], () => {
    k.cyl(W.pale, [0, 0, 0], .025, 1.35, 4);
    k.box(IRON, [0, 1.35, 0], [.04, .04, .26]);
    for (const z of [-.11, 0, .11]) k.cone(IRON, [0, 1.37, z], .018, .32, 4);
  });
}
// Hahn als Wetterfahne
function rooster(k, p) {
  const [x, y, z] = p;
  k.cyl(IRON, [x, y, z], .025, .55, 4);
  k.beam(IRON, [x - .25, y + .3, z], [x + .25, y + .3, z], .02); k.beam(IRON, [x, y + .3, z - .25], [x, y + .3, z + .25], .02);
  k.ball(IRON, [x, y + .62, z], [.15, .09, .03]); k.ball(IRON, [x + .12, y + .72, z], [.05, .06, .03]); k.prism(0xa83a2a, [x + .12, y + .77, z], .06, .06, .03);
  k.box(IRON, [x - .18, y + .6, z], [.08, .2, .025], { r: [0, 0, .4] });
}

// =====================================================================================================
// 3) Bauernhof
// =====================================================================================================
export function farm(k, opts = {}) {
  const bx0 = -2.0, bx1 = 1.9, hw = 1.6, ye = 2.4, kz = 1.0, yk = 3.4, yr = 4.0, yp = .3;
  const RED = [0xa8322a, 0x9e2e26, 0xb03a2e, 0x962a24], WHITE = 0xeee8dc;
  const prof = z => { z = Math.abs(z); return z <= kz ? yr - (z / kz) * (yr - yk) : yk - (z - kz) / (hw - kz) * (yk - ye); };
  // --- Scheune ---
  masonry(k, bx0, bx1, -.8, yp, -hw - .04, hw + .04, { ch: .26, moss: .3, skip: [(z, y, za, zb) => zb > -1.05 && za < 1.05 && y > 0] });
  k.add(profileGeo('barn', [[-hw, 0], [hw, 0], [hw, ye - yp], [kz, yk - yp], [0, yr - yp], [-kz, yk - yp], [-hw, ye - yp]]), 0x7a2420, [bx0 + .02, yp, 0], [bx1 - bx0 - .04, 1, 1], { jit: .02 });
  // Seitenwände
  for (const s of [-1, 1]) face(k, [(bx0 + bx1) / 2, 0, s * hw], s * PI / 2, () => {
    const L = bx1 - bx0, win = z => (Math.abs(z - .9) < .32 || Math.abs(z + .9) < .32) ? [1.15, 1.75] : null;
    boards(k, -L / 2, L / 2, yp, ye, { cols: RED, knots: .3, skip: win });
    for (const z of [-.9, .9]) {
      windowAt(k, z, 1.15, .5, .6, { frame: WHITE, sill: false });
      k.beam(WHITE, [.07, 1.15, z - .25], [.07, 1.75, z + .25], .04); k.beam(WHITE, [.07, 1.15, z + .25], [.07, 1.75, z - .25], .04);
    }
    k.box(WHITE, [.06, ye - .14, 0], [.06, .14, L]);
  });
  // Giebelseiten
  for (const [x, a] of [[bx1, 0], [bx0, PI]]) face(k, [x, 0, 0], a, () => {
    const front = a === 0;
    boards(k, -hw, hw, yp, z => prof(z) - .02, { cols: RED, knots: .25, skip: front ? z => (Math.abs(z) < .46 ? [yp, 3.5] : Math.abs(z) < .9 ? [yp, 2.32] : null) : z => (Math.abs(z) < .3 ? [1.5, 2.2] : null) });
    // Ortgang weiß (Gambrel-Linie)
    const P = [[-hw - .08, ye - .06], [-kz, yk], [0, yr], [kz, yk], [hw + .08, ye - .06]];
    for (let i = 0; i < 4; i++) k.beam(WHITE, [.08, P[i][1] + .03, P[i][0]], [.08, P[i + 1][1] + .03, P[i + 1][0]], .14, { d: .06 });
    for (const s of [-1, 1]) k.box(WHITE, [.07, yp, s * (hw - .06)], [.07, ye - yp, .14]);           // Eckbretter
    if (!front) { windowAt(k, 0, 1.5, .6, .7, { frame: WHITE, sill: false }); k.beam(WHITE, [.07, 1.5, -.3], [.07, 2.2, .3], .04); }
  });
  for (const [x, a] of [[bx1, 0]]) face(k, [x, 0, 0], a, () => {
    // Heuboden-Luke (offen) mit Heu
    const ly = 2.65, lh = .8, lw = .9;
    k.box(0x2a2018, [.01, ly, 0], [.04, lh, lw], { ao: false });
    k.box(RED[0], [.025, 2.3, 0], [.05, ly - 2.3, lw + .04], { jit: .05 });
    k.ball(0xd8b858, [.0, ly + .15, 0], [.14, .3, .4], { jit: .12 });
    for (let i = 0; i < 9; i++) k.cone(0xe0c060, [.03, ly + .02, k.R(-.38, .38)], .04, k.R(.12, .3), 3, { r: [0, 0, k.R(-1.6, -1.1)], ao: false });
    for (const s of [-1, 1]) k.box(WHITE, [.06, ly - .05, s * (lw / 2 + .05)], [.08, lh + .1, .1]);
    k.box(WHITE, [.06, ly - .1, 0], [.08, .1, lw + .2]); k.box(WHITE, [.06, ly + lh, 0], [.08, .1, lw + .2]);
    k.in([.06, ly, lw / 2 + .05], -1.75, () => { boards(k, 0, lw, 0, lh, { cols: RED, bw: .18 }); k.beam(WHITE, [.06, 0, .05], [.06, lh, lw - .05], .05); });
    // Lastenbalken mit Rolle und Seil
    k.box(W.dark, [.35, 3.62, 0], [.8, .14, .14]);
    k.cyl(IRON, [.68, 3.5, -.03], .07, .06, 8, { r: [PI / 2, 0, 0] });
    k.cyl(0xc8b080, [.75, 1.9, 0], .012, 1.6, 4, { ao: false }); k.box(IRON, [.75, 1.8, 0], [.04, .12, .04]);
    // Großes Schiebetor: linker Flügel zu, rechter halb offen
    k.box(DARK, [.01, yp, 0], [.03, 2.02, 1.8], { ao: false });
    for (let i = 0; i < 6; i++) k.cone(0xe0c060, [.03, yp, k.R(-.0, .8)], .05, k.R(.1, .25), 3, { r: [0, 0, k.R(-1.5, -1.2)], ao: false });
    const leaf = (z0, off) => k.in([off, yp, z0], 0, () => {
      boards(k, 0, .9, 0, 2.0, { cols: RED, bw: .15 });
      k.box(WHITE, [.07, 0, .45], [.05, .12, .9]); k.box(WHITE, [.07, 1.88, .45], [.05, .12, .9]); k.box(WHITE, [.07, .95, .45], [.05, .1, .9]);
      for (const z of [.05, .85]) k.box(WHITE, [.07, 0, z], [.05, 2.0, .1]);
      k.beam(WHITE, [.08, .1, .1], [.08, .95, .8], .07, { d: .04 }); k.beam(WHITE, [.08, .1, .8], [.08, .95, .1], .07, { d: .04 });
      k.beam(WHITE, [.08, 1.0, .1], [.08, 1.85, .8], .07, { d: .04 }); k.beam(WHITE, [.08, 1.0, .8], [.08, 1.85, .1], .07, { d: .04 });
      k.cyl(IRON, [.1, 2.0, .2], .04, .04, 6, { r: [0, 0, PI / 2] }); k.cyl(IRON, [.1, 2.0, .7], .04, .04, 6, { r: [0, 0, PI / 2] });
      k.box(IRON, [.11, 1.0, .82], [.03, .2, .04], { ao: false });
    });
    leaf(-.9, .02); leaf(.55, .1);
    k.box(IRON, [.12, yp + 2.06, -.2], [.05, .06, 2.8]);                                          // Laufschiene
    k.box(0x9a958c, [.4, yp - .12, 0], [.8, .12, 2.2], { jit: .05 });                              // Rampe
  });
  wallLantern(k, [bx1 + .06, 2.2, -1.25], 0);
  // Dach (Gambrel: oben flach, unten steil)
  const a2 = Math.atan((yr - yk) / kz), a1 = Math.atan((yk - ye) / (hw - kz)), len = bx1 - bx0 + .5;
  const RC = [0x5e5652, 0x6a605a, 0x55504c, 0x625a54];
  k.in([(bx0 + bx1) / 2, 0, 0], 0, () => {
    for (const s of [0, PI]) {
      rot(k, [0, yr + .05, 0], [a2, s, 0], () => roofRows(k, len, Math.hypot(kz, yr - yk) + .06, { cols: RC, rh: .2, single: true, sw: .42, under: 0x3a3430 }));
      rot(k, [0, yk + .05, kz], [a1, s, 0], () => roofRows(k, len, Math.hypot(hw - kz, yk - ye) + .32, { cols: RC, rh: .2, single: true, sw: .42, moss: .4, under: 0x3a3430 }));
    }
    k.boxc(0x4a4440, [0, yr + .1, 0], [len + .04, .12, .22], { r: [PI / 4, 0, 0] });
    for (const s of [-1, 1]) k.box(0x4a4440, [0, yk, s * kz], [len + .02, .1, .14]);
    // Dachreiter (Lüftung) mit Hahn
    k.box(WHITE, [0, yr - .2, 0], [.62, .78, .62]);
    for (let i = 0; i < 4; i++) face(k, [Math.cos(i * PI / 2) * .31, 0, Math.sin(i * PI / 2) * .31], i * PI / 2, () => { for (let j = 0; j < 4; j++) k.box(0x4a4440, [.02, yr + .02 + j * .11, 0], [.04, .04, .45], { r: [0, 0, .5], ao: false }); });
    taperRows(k, 4, yr + .56, yr + 1.0, .42, .02, { cols: RC, rh: .12 });
    rooster(k, [0, yr + .98, 0]);
  });
  // Rinne + Fallrohr
  for (const s of [-1, 1]) { k.box(0x8a8e92, [(bx0 + bx1) / 2, ye - .26, s * (hw + .28)], [bx1 - bx0 + .4, .1, .1], { ao: false }); k.cyl(0x8a8e92, [bx0 + .1, 0, s * (hw + .28)], .04, ye - .2, 6); }
  // --- Silo ---
  const sx = -2.85, sz = -2.65, sr = .78, sh = 5.0;
  k.cyl(0x9a958c, [sx, -.8, sz], sr + .12, 1.15, 12, { jit: .05 });
  k.cyl(0xc8c0b0, [sx, .35, sz], sr, sh, 12, { jit: .03 });
  for (let y = .7; y < sh; y += .55) k.cyl(0x8a8e92, [sx, y, sz], sr + .025, .05, 12, { ao: false });
  for (let i = 0; i < 12; i++) if (k.rand() < .5) { const a = i / 12 * TAU; k.box(0xb0a898, [sx + Math.cos(a) * sr, k.R(.6, sh - .5), sz + Math.sin(a) * sr], [.03, k.R(.4, 1.2), .25], { r: [0, -a, 0], ao: false }); }
  k.ball(0x6a7a8a, [sx, sh + .35, sz], [sr + .06, sr * .8, sr + .06], { detail: 1, jit: .05 });
  k.cyl(0x5a6a7a, [sx, sh + .3, sz], sr + .09, .08, 12);
  k.cyl(0x6a7a8a, [sx, sh + .35 + sr * .78, sz], .12, .2, 6, { top: .6 }); k.cone(0x5a6a7a, [sx, sh + .55 + sr * .78, sz], .2, .18, 6);
  // Leiter am Silo (Richtung Scheune/vorn)
  { const a = .5, lx = sx + Math.cos(a) * (sr + .14), lz = sz + Math.sin(a) * (sr + .14);
    k.in([lx, 0, lz], -a, () => { for (const s of [-1, 1]) k.box(IRON, [0, .3, s * .17], [.04, sh + .1, .04]); for (let y = .6; y < sh + .3; y += .3) k.box(IRON, [0, y, 0], [.03, .03, .34], { ao: false }); });
  }
  // --- Koppel (Seite +z) ---
  const pc = [[2.3, 0, 2.05], [2.0, 0, 4.0], [-.8, 0, 4.6], [-2.9, 0, 3.5], [-3.2, 0, 2.0]];
  for (let i = 0; i < pc.length - 1; i++) N.fencePost(k, pc[i], pc[i + 1], 0x8a6a48, false);
  N.fencePost(k, pc[4], [-2.05, 0, 2.0], 0x8a6a48, false); N.fencePost(k, [.6, 0, 2.0], pc[0], 0x8a6a48, false);
  // Gatter (offen)
  k.in([-.4, 0, 2.0], -.9, () => { for (const y of [.2, .5, .8]) k.box(W.pale, [.5, y, 0], [1.0, .08, .05]); k.beam(W.pale, [.05, .2, 0], [.95, .85, 0], .05); for (const x of [0, 1]) k.box(W.pale, [x * .95 + .03, .1, 0], [.06, .82, .06]); });
  // Wassertrog
  k.in([-1.6, 0, 3.25], .35, () => {
    k.box(W.mid, [0, .1, 0], [1.3, .42, .52], { jit: .08 });
    for (const s of [-1, 1]) { k.box(W.dark, [s * .55, -.1, 0], [.1, .22, .6]); k.box(IRON, [s * .45, .1, 0], [.03, .44, .56], { ao: false }); }
    k.box(0x4a8aa0, [0, .44, 0], [1.18, .06, .4], { layer: 'water', ao: false });
    k.box(DARK, [0, .48, 0], [1.2, .01, .42], { ao: false });
  });
  // Pumpe am Trog
  k.in([-2.4, 0, 3.0], 0, () => { k.box(0x3a5a3a, [0, 0, 0], [.16, .9, .16]); k.cyl(0x3a5a3a, [0, .9, 0], .1, .12, 6); k.beam(0x3a5a3a, [0, .78, .08], [.3, .58, .35], .04); k.beam(0x3a5a3a, [0, .95, 0], [-.05, 1.05, .45], .03); });
  k.spot('cow', [.4, 0, 3.3], { a: .3 }); k.spot('cow', [-1.2, 0, 4.1], { a: 2.8 }); k.spot('cow', [1.5, 0, 2.9], { a: -1.2 });
  // Futterraufe mit Heu an der Scheunenwand (Koppelseite)
  k.in([-.8, 0, hw + .12], 0, () => { k.box(W.dark, [0, .4, .15], [1.4, .08, .4]); for (let i = 0; i < 8; i++) k.box(W.mid, [-.6 + i * .17, .45, .3], [.04, .7, .04], { r: [-.3, 0, 0] }); k.ball(0xd8b858, [0, .7, .16], [.65, .3, .2], { jit: .1 }); });
  // --- Hühnerstall (Seite −z, vorn) ---
  k.in([.9, 0, -3.15], .15, () => {
    for (const [x, z] of [[-.5, -.38], [.5, -.38], [-.5, .38], [.5, .38]]) k.box(W.dark, [x, -.3, z], [.08, .78, .08]);
    k.box(W.light, [0, .45, 0], [1.2, .08, .95]);
    for (const [px, a, L] of [[.55, 0, .9], [-.55, PI, .9]]) face(k, [px, 0, 0], a, () => boards(k, -L / 2, L / 2, .5, 1.25, { cols: [0xd8c8a0, 0xcfbf98], bw: .15, skip: a === 0 ? z => (Math.abs(z) < .16 ? [.5, .85] : null) : null }));
    for (const s of [-1, 1]) face(k, [0, 0, s * .45], s * PI / 2, () => boards(k, -.55, .55, .5, z => 1.25 + (s > 0 ? 0 : 0), { cols: [0xd8c8a0, 0xcfbf98], bw: .15 }));
    k.box(0xd8c8a0, [0, .5, 0], [1.08, .75, .88]);
    k.box(DARK, [.56, .5, 0], [.02, .35, .3], { ao: false });
    k.prism(0xd8c8a0, [0, 1.25, 0], .95, .475 * Math.tan(.6), 1.08, { r: [0, PI / 2, 0] });
    gable(k, 1.2, .95, 1.25, .6, { ov: .12, ovx: .1, cols: TILE, rh: .14, t: .04, ridge: 0x7a3020 });
    k.beam(W.light, [1.25, 0, 0], [.6, .5, 0], .05, { w: .28, d: .3 });                                // Hühnerleiter
    for (let i = 0; i < 4; i++) k.box(W.dark, [.7 + i * .14, .12 + i * .1, 0], [.03, .03, .26], { ao: false });
    // Legekasten seitlich
    k.box(0xc8b890, [0, .55, -.62], [.7, .4, .3]); k.box(TILE[0], [0, .95, -.65], [.8, .05, .4], { r: [.35, 0, 0] });
    k.spot('chicken', [1.5, 0, .4]); k.spot('chicken', [1.6, 0, -.5]);
  });
  // Auslauf aus Maschendraht (Pfosten + Drahtfeld als feine Leisten)
  { const run = [[1.65, 0, -2.4], [2.6, 0, -2.6], [2.5, 0, -3.7], [1.4, 0, -3.95]];
    for (let i = 0; i < run.length - 1; i++) { const [a, b] = [run[i], run[i + 1]];
      k.box(W.dark, [a[0], -.2, a[2]], [.06, .85, .06]);
      for (const y of [.05, .62]) k.beam(W.pale, [a[0], y, a[2]], [b[0], y, b[2]], .03);
      const n = 8; for (let j = 1; j < n; j++) { const t = j / n; k.box(0xb8bcc0, [a[0] + (b[0] - a[0]) * t, .05, a[2] + (b[2] - a[2]) * t], [.012, .57, .012], { ao: false }); }
    }
    k.box(W.dark, [1.4, -.2, -3.95], [.06, .85, .06]);
  }
  for (let i = 0; i < 10; i++) k.cone(0xd8b858, [k.R(1.7, 2.4), 0, k.R(-3.6, -2.7)], .04, .08, 3, { r: [k.R(-1, 1), 0, k.R(-1, 1)], ao: false }); // Streu
  // --- Heuballen, Karren, Milchkannen, Gabel ---
  N.hay(k, [3.3, 0, -1.35], .4); N.hay(k, [3.45, 0, -2.5], -.2); N.hay(k, [3.38, .8, -1.93], .1);
  cart(k, [-3.6, 0, .6], PI / 2 + .25, () => { for (let i = 0; i < 5; i++) k.ball(0xd8b858, [-3.6 + k.R(-.3, .3), .9, .6 + k.R(-.3, .3) - .15], [.4, .25, .4], { jit: .1 }); });
  milkCan(k, [2.15, 0, 1.25]); milkCan(k, [2.4, 0, 1.45]); milkCan(k, [2.12, 0, 1.6]);
  pitchfork(k, [bx1 + .12, 0, 1.15], 0, -.22);
  barrel(k, [-2.4, 0, -1.25], .9, 0x6a5a48);
  tufts(k, [[2.4, -.95], [-2.4, .2], [1.0, -1.85], [-1.2, -1.9], [2.2, 3.0], [-.6, 3.6], [0, -2.6, .8], [-3.6, -1.2]]);
  k.spot('door', [bx1 + .9, 0, 0], { a: 0 });
}

// Steinhaus-Körper mit Öffnungen: Seiten 0 = +x, 1 = +z, 2 = −x, 3 = −z; je Seite Liste { z, y, w, h, door?, o } (z lokal entlang der Wand)
function stoneBody(k, x0, x1, z0, z1, y1, open = {}, o = {}) {
  const fr = (s, z, y, za, zb) => (open[s] || []).some(q => zb > q.z - q.w / 2 - .08 && za < q.z + q.w / 2 + .08 && y > q.y - .15 && y < q.y + q.h + (q.o?.arch ? q.w / 2 + .1 : .1));
  masonry(k, x0, x1, -.8, y1, z0, z1, { ...o, skip: [0, 1, 2, 3].map(s => (z, y, za, zb) => fr(s, z, y, za, zb)) });
  const F = [[[x1, 0, (z0 + z1) / 2], 0], [[(x0 + x1) / 2, 0, z1], PI / 2], [[x0, 0, (z0 + z1) / 2], PI], [[(x0 + x1) / 2, 0, z0], -PI / 2]];
  for (const s of [0, 1, 2, 3]) if (open[s]) face(k, F[s][0], F[s][1], () => { for (const q of open[s]) q.door ? doorAt(k, q.z, q.y, q.w, q.h, q.o) : windowAt(k, q.z, q.y, q.w, q.h, q.o); });
}
function chimney(k, p, h, c) {
  const [x, y, z] = p;
  masonry(k, x - .28, x + .28, y, y + h, z - .28, z + .28, { ch: .2, len: [.18, .3], cols: c || [0x9a5a44, 0x8a4e3a, 0xa86450, 0x7e4634], mortar: 0x6a4a3e });
  k.box(0x6a6a66, [x, y + h, z], [.68, .08, .68]); k.box(0x3a3836, [x, y + h + .08, z], [.36, .14, .36]);
  return [x, y + h + .25, z];
}
function woodpile(k, p, ry = 0, L = 1.2, rows = 4) {
  k.in(p, ry, () => {
    k.box(W.dark, [0, 0, 0], [L + .1, .06, .5]);
    for (let r = 0; r < rows; r++) for (let i = 0; i < Math.round(L / .16) - (r % 2); i++) {
      const x = -L / 2 + .08 + i * .16 + (r % 2) * .08, y = .14 + r * .14;
      k.cyl(k.pick([0x8a6a48, 0x7a5a3c, 0x9a7a52]), [x, y, -.25], .075, .5, 5, { r: [PI / 2, 0, k.R(0, 1)], jit: .1 });
      k.cyl(0xc8a878, [x, y, .255], .065, .01, 5, { r: [PI / 2, 0, 0], ao: false });
    }
    for (const s of [-1, 1]) k.box(W.dark, [s * (L / 2 + .06), 0, 0], [.06, rows * .14 + .1, .06]);
  });
}

// =====================================================================================================
// 4) Wassermühle (Bach entlang x, Bachbett |z| < 1,5 frei bis auf das Rad)
// =====================================================================================================
export function watermill(k, opts = {}) {
  const x0 = -1.7, x1 = 1.7, z0 = 1.85, z1 = 4.1, yw = 2.65, zc = (z0 + z1) / 2, pitch = 45 * PI / 180;
  const WC = { x: .15, y: 1.05, z: 1.0, r: 1.38 };
  // --- Haus ---
  const fr = 0xe8e0d0;
  stoneBody(k, x0, x1, z0, z1, yw, {
    0: [{ z: -.35, y: .45, w: .9, h: 1.75, door: true, o: { color: 0x4a6a8a, color2: 0x42607e, stepC: 0x8a857c } }, { z: .7, y: 1.2, w: .5, h: .7, o: { frame: fr, shutters: 0x4a6a8a, box: true } }],
    1: [{ z: -.9, y: 1.1, w: .6, h: .8, o: { frame: fr, shutters: 0x4a6a8a } }, { z: .9, y: 1.1, w: .6, h: .8, o: { frame: fr, shutters: 0x4a6a8a, box: true } }],
    2: [{ z: 0, y: 1.1, w: .55, h: .75, o: { frame: fr } }],
    3: [{ z: 1.15, y: 1.25, w: .55, h: .7, o: { frame: fr, shutters: 0x4a6a8a } }],
  }, { ch: .28, moss: .4 });
  k.box(0xb8b0a0, [(x0 + x1) / 2, yw - .1, zc], [x1 - x0 + .08, .12, z1 - z0 + .08]);
  // Giebel aus Brettern
  const gh = (z1 - z0) / 2 * Math.tan(pitch);
  k.prism(0x6a4a30, [(x0 + x1) / 2, yw, zc], z1 - z0, gh, x1 - x0 - .04, { r: [0, PI / 2, 0] });
  for (const [x, a] of [[x1, 0], [x0, PI]]) face(k, [x - (a ? -.02 : .02), 0, zc], a, () => {
    boards(k, -(z1 - z0) / 2, (z1 - z0) / 2, yw, z => yw + gh * (1 - Math.abs(z) / ((z1 - z0) / 2)) - .03, { cols: [W.mid, W.worn, 0x846040], bw: .2, skip: z => Math.abs(z) < .3 ? [yw + .35, yw + .85] : null });
    windowAt(k, 0, yw + .35, .45, .5, { frame: fr, sill: false });
  });
  k.in([(x0 + x1) / 2, 0, zc], 0, () => gable(k, x1 - x0, z1 - z0, yw, pitch, { ov: .2, ovx: .2, cols: TILE, rh: .2, single: true, sw: .3, moss: .5, ridge: 0x7a3020 }));
  const sm = chimney(k, [x0 + .7, yw + .9, zc + .55], 1.25);
  k.spot('smoke', sm);
  // Achslager an der Wand
  k.box(W.dark, [WC.x - .35, WC.y - .4, z0 - .25], [.7, .8, .25]);
  k.box(IRON, [WC.x - .2, WC.y - .2, z0 - .3], [.4, .4, .06], { ao: false });
  // --- Wasserrad ---
  k.part('wheel', [WC.x, WC.y, WC.z], s => {
    const R = WC.r, hw = .27;
    for (const zz of [-hw, hw]) {
      s.add(RING(18, .86), W.mid, [0, 0, zz - .04], [R, .08, R], { r: [PI / 2, 0, 0] });
      s.add(RING(18, .94), W.dark, [0, 0, zz - .045], [R * .72, .09, R * .72], { r: [PI / 2, 0, 0] });
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; s.beam(W.mid, [0, 0, zz], [Math.cos(a) * R * .9, Math.sin(a) * R * .9, zz], .07); }
      for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; s.box(IRON, [Math.cos(a) * R * .93, Math.sin(a) * R * .93, zz + Math.sign(zz) * .045], [.04, .04, .02], { ao: false }); }
    }
    for (let i = 0; i < 18; i++) {                                   // Schaufeln (Zellen)
      const a = i / 18 * TAU;
      s.boxc(k.pick([W.mid, W.worn, 0x846040]), [Math.cos(a) * (R - .13), Math.sin(a) * (R - .13), 0], [.26, .04, hw * 2 + .02], { r: [0, 0, a + .5] });
      s.boxc(W.dark, [Math.cos(a) * (R - .26), Math.sin(a) * (R - .26), 0], [.04, .3, hw * 2 + .02], { r: [0, 0, a] });
    }
    s.boxc(W.worn, [0, 0, 0], [.04, .04, .04]);
    s.cyl(W.dark, [0, 0, -hw - .1], .2, hw * 2 + .2, 8, { r: [PI / 2, 0, 0] });                      // Nabe
    s.cyl(IRON, [0, 0, -hw - .12], .1, z0 - WC.z + hw + .05, 8, { r: [PI / 2, 0, 0] });               // Welle bis zur Wand
    for (const zz of [-hw - .05, hw + .05]) s.cyl(IRON, [0, 0, zz - .02], .23, .04, 8, { r: [PI / 2, 0, 0] });
  }, { spin: [0, 0, 1], speed: -.8 });
  // --- Gerinne (Holzrinne auf Böcken, oberschlächtig) ---
  const fy = WC.y + WC.r + .14, fx0 = -4.4, fx1 = WC.x + .1;
  k.in([0, 0, WC.z], 0, () => {
    k.box(W.mid, [(fx0 + fx1) / 2, fy, 0], [fx1 - fx0, .06, .6]);
    for (const s of [-1, 1]) { k.box(W.mid, [(fx0 + fx1) / 2, fy, s * .28], [fx1 - fx0, .3, .05], { jit: .06 }); k.box(W.dark, [(fx0 + fx1) / 2, fy + .3, s * .28], [fx1 - fx0, .04, .08]); }
    k.box(0x3f8fa8, [(fx0 + fx1) / 2 - .1, fy + .06, 0], [fx1 - fx0 - .2, .16, .5], { layer: 'water', ao: false });
    for (let x = fx0 + .3; x < fx1; x += .8) { k.box(IRON, [x, fy - .03, 0], [.05, .03, .66], { ao: false }); for (const s of [-1, 1]) k.box(IRON, [x, fy - .03, s * .315], [.05, .34, .03], { ao: false }); }
    // herabstürzendes Wasser auf die Zellen
    k.beam(0x5fb0c8, [fx1 - .05, fy + .12, 0], [fx1 + .35, fy - .45, 0], .14, { w: .1, d: .44, layer: 'water' });
    for (let i = 0; i < 5; i++) k.ball(0xe8f4f8, [fx1 + k.R(.2, .5), fy - k.R(.3, .6), k.R(-.2, .2)], .07, { layer: 'water', ao: false });
    // Schütz am Anfang
    k.box(W.dark, [fx0 + .1, fy, -.36], [.08, .9, .08]); k.box(W.dark, [fx0 + .1, fy, .36], [.08, .9, .08]); k.box(W.mid, [fx0 + .1, fy + .2, 0], [.05, .45, .6]);
    k.box(W.dark, [fx0 + .1, fy + .85, 0], [.1, .08, .8]); k.cyl(IRON, [fx0 + .1, fy + .65, 0], .02, .4, 4);
  });
  for (const x of [-4.0, -2.75, -1.5]) {                                   // Böcke am Ufer (außerhalb des Betts)
    const h = fy - .05;
    k.box(W.dark, [x, -.4, 1.58], [.14, h + .4, .14]);
    k.beam(W.dark, [x, h - .1, 1.6], [x, h - .1, WC.z - .38], .12);
    k.beam(W.mid, [x, h - .9, 1.58], [x, h - .16, WC.z - .2], .07);
  }
  // Ufermauer unter dem Rad
  face(k, [WC.x, 0, 1.62], -PI / 2, () => stones(k, -1.5, 1.5, -.7, .3, { ch: .25, moss: .5 }));
  k.box(MORTAR, [WC.x, -.7, 1.77], [3.0, 1.0, .3]);
  // --- Vorplatz am Eingang ---
  wallLantern(k, [x1, 2.0, zc + .25], 0);
  sack(k, [2.05, 0, 1.92], .3); sack(k, [2.4, 0, 2.0], 1.4, .95); sack(k, [1.95, .4, 1.95], 2, .85, true);
  crate(k, [2.0, 0, 3.95], .2, 1, [0xd8a83a]);
  bench(k, [-.2, 0, z1 + .32], PI, 1.2); k.spot('sit', [-.2, .45, z1 + .32], { a: -PI / 2 });
  woodpile(k, [x0 - .32, 0, zc + .2], PI / 2, 1.4, 4);
  barrel(k, [-2.35, 0, 1.95], .85, W.worn);
  millstone(k, [2.5, 0, 3.25], 0, .25);
  tufts(k, [[2.2, 1.7], [-2.5, 2.7], [1.9, 3.9, .8], [-1.2, 4.3, .8], [.9, 4.3, .7]]);
  for (const [x, z] of [[2.6, 2.0], [2.7, 2.3], [-2.3, 3.6], [-2.5, 3.3]]) N.flower(k, [x, 0, z]);
  k.spot('door', [x1 + .7, 0, zc - .35], { a: 0 });
}

// Wimpelkette von a nach b mit Durchhang
function bunting(k, a, b, sag = .4, cols = [0xd83a3a, 0xf2c43a, 0x3a7ad8, 0x3aa85a, 0xffffff]) {
  const n = 10, P = [];
  for (let i = 0; i <= n; i++) { const t = i / n; P.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t]); }
  for (let i = 0; i < n; i++) k.beam(0xe8e0d0, P[i], P[i + 1], .012, { ao: false });
  const L = Math.hypot(b[0] - a[0], b[2] - a[2]), m = Math.round(L / .32), ang = Math.atan2(b[2] - a[2], b[0] - a[0]);
  for (let j = 1; j < m; j++) {
    const t = j / m, y = a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t);
    k.in([a[0] + (b[0] - a[0]) * t, y, a[2] + (b[2] - a[2]) * t], -ang, () => {
      k.prism(cols[j % cols.length], [0, 0, 0], .2, .26, .012, { r: [PI, 0, k.R(-.08, .08)], ao: false, sway: .5, jit: .05 });
      k.prism(cols[j % cols.length], [0, 0, 0], .2, .26, .012, { r: [PI, PI, k.R(-.08, .08)], ao: false, sway: .5, jit: .05 });
    });
  }
}
// Marktstand: lokal +x = zur Kundschaft. kind: 'fruit' | 'bread' | 'pots'
function stall(k, p, ry, kind, stripes) {
  k.in(p, ry, () => {
    const w = 2.0, d = 1.2, yf = 2.05, yb = 2.45;
    for (const [x, z, h] of [[d / 2, -w / 2, yf], [d / 2, w / 2, yf], [-d / 2, -w / 2, yb], [-d / 2, w / 2, yb]]) {
      k.box(W.mid, [x, -.6, z], [.09, h + .6, .09]); k.box(0x8a857c, [x, -.05, z], [.18, .1, .18]);
    }
    // Theke
    k.box(W.light, [.35, .85, 0], [.6, .06, w - .1], { jit: .06 });
    face(k, [.65, 0, 0], 0, () => boards(k, -w / 2 + .05, w / 2 - .05, .1, .86, { cols: [W.mid, W.worn, 0x846040], bw: .2 }));
    k.box(W.dark, [.35, .1, 0], [.6, .75, w - .2]);
    k.box(W.dark, [-.35, .5, 0], [.4, .05, w - .2]); k.box(W.dark, [-.35, 1.3, 0], [.3, .04, w - .2]);   // Regale hinten
    // Markise gestreift mit Zacken
    const sl = Math.hypot(d + .5, yb - yf), a = Math.atan2(yb - yf, d + .5), n = 8;
    rot(k, [-d / 2 - .1, yb + .06, 0], [0, PI / 2, 0], () => rot(k, [0, 0, 0], [a, 0, 0], () => {
      for (let i = 0; i < n; i++) k.box(stripes[i % 2], [-w / 2 - .1 + (i + .5) * (w + .2) / n, 0, sl / 2], [(w + .2) / n + .005, .03, sl], { ao: false, jit: .03 });
      for (let i = 0; i < n; i++) rot(k, [-w / 2 - .1 + (i + .5) * (w + .2) / n, 0, sl], [-a, 0, 0], () => k.box(stripes[i % 2], [0, -.17, 0], [(w + .2) / n - .03, .18, .02], { ao: false, sway: .3 }));
    }));
    // Waren
    if (kind === 'fruit') {
      crate(k, [.35, .91, -.55], .1, .9, [0xd83a2a, 0xc8302a, 0xe8502a]); crate(k, [.38, .91, .05], -.05, .9, [0xf28a2a, 0xe8822a]); crate(k, [.33, .91, .62], .15, .9, [0x8ac83a, 0x9ad84a]);
      for (let i = 0; i < 3; i++) N.cabbage(k, [-.2 + i * .1, .55, -.6 + i * .5]);
      N.pumpkin(k, [.95, 0, -.6]); N.pumpkin(k, [1.0, 0, .7]); crate(k, [.9, 0, .1], .3, 1, [0x6a3a8a, 0x7a3a9a]);
    } else if (kind === 'bread') {
      for (let i = 0; i < 6; i++) k.ball(k.pick([0xb8783a, 0xc8884a, 0xa86a30]), [.3 + k.R(-.15, .15), .97, -.75 + i * .3], [.14, .08, .09], { r: [0, k.R(-.5, .5), 0], detail: 1 });
      for (let i = 0; i < 3; i++) { k.cyl(0xf2c43a, [.35, .91 + i * .1, .7], .18, .1, 10); k.cyl(0xe0a830, [.35, .91 + i * .1, .7], .182, .02, 10, { ao: false }); }
      for (let i = 0; i < 4; i++) k.ball(0xa86a30, [-.35, .6, -.7 + i * .45], [.14, .1, .14], { detail: 1 });
      barrel(k, [1.0, 0, -.5], .8, W.mid); sack(k, [.95, 0, .6], .4, .9);
    } else {
      for (let i = 0; i < 5; i++) { const z = -.75 + i * .38, c = k.pick([0xb8683a, 0xa85a30, 0xc87a4a, 0x5a7aa8]); k.cyl(c, [.35, .91, z], .1, .16, 8, { top: 1.3 }); k.cyl(c, [.35, 1.07, z], .13, .1, 8, { top: .6 }); k.cyl(c, [.35, 1.17, z], .06, .06, 8, { top: 1.3 }); }
      for (let i = 0; i < 4; i++) { const z = -.7 + i * .45; k.cyl(0xb8683a, [-.35, 1.34, z], .12, .16, 8, { top: 1.3 }); for (let f = 0; f < 3; f++) N.flower(k, [-.35 + k.R(-.06, .06), 1.38, z + k.R(-.06, .06)]); }
      k.cyl(0xb8683a, [1.0, 0, -.6], .2, .35, 8, { top: 1.2 }); N.bush(k, [1.0, .3, -.6], .4); k.cyl(0xa85a30, [1.0, 0, .6], .18, .3, 8, { top: 1.2 }); N.bush(k, [1.0, .25, .6], .35, 0xe85a8a);
    }
    k.spot('stall', [-.25, 0, 0], { a: 0 });
  });
}

// =====================================================================================================
// 5) Marktplatz (Wege aus 0°, 120°, 240° bleiben 1,8 m breit frei)
// =====================================================================================================
export function market(k, opts = {}) {
  // --- Springbrunnen ---
  const Ro = 1.3, Ri = 1.08, hb = .55;
  k.cyl(0x6a6660, [0, -.8, 0], Ri, .85, 8, { r: [0, PI / 8, 0] });                                     // Beckenboden
  for (let i = 0; i < 8; i++) {
    const a = i * PI / 4, ap = (Ro + Ri) / 2 * Math.cos(PI / 8), L = 2 * Ro * Math.sin(PI / 8);
    k.in([Math.cos(a) * ap, 0, Math.sin(a) * ap], -a, () => {
      masonry(k, -(Ro - Ri) / 2, (Ro - Ri) / 2, -.8, hb, -L / 2, L / 2, { sides: [0, 2], ch: .2, len: [.25, .45], moss: .3 });
      k.box(k.pick([0xb8b2a6, 0xaea89c]), [.02, hb, 0], [Ro - Ri + .12, .1, L + .04], { jit: .04 });
    });
    const ca = a + PI / 8; k.box(0xb0aa9e, [Math.cos(ca) * Ro * .97, -.2, Math.sin(ca) * Ro * .97], [.26, hb + .32, .26], { r: [0, -ca, 0] });
  }
  k.cyl(0x3f8fa8, [0, .32, 0], Ri + .05, .06, 8, { layer: 'water', r: [0, PI / 8, 0], ao: false });
  // Säule mit Schale
  k.cyl(0xa8a296, [0, 0, 0], .38, .55, 8, { r: [0, PI / 8, 0] }); k.cyl(0xb8b2a6, [0, .55, 0], .42, .08, 8, { r: [0, PI / 8, 0] });
  k.cyl(0xb0aa9e, [0, .63, 0], .17, .85, 8, { top: .8 });
  k.cyl(0xb8b2a6, [0, 1.42, 0], .22, .3, 10, { top: 3.2 });
  k.cyl(0xa8a296, [0, 1.72, 0], .72, .08, 10);
  k.cyl(0x4f9fb8, [0, 1.74, 0], .64, .07, 10, { layer: 'water', ao: false });
  k.cyl(0xb0aa9e, [0, 1.8, 0], .09, .35, 8); k.cone(0xb8b2a6, [0, 2.12, 0], .15, .22, 8); k.ball(0xb8b2a6, [0, 2.3, 0], .08);
  for (let i = 0; i < 4; i++) {                                                    // Wasserstrahlen
    const a = i * PI / 2 + PI / 4, c = Math.cos(a), s = Math.sin(a);
    k.box(0x9a948a, [c * .68, 1.66, s * .68], [.1, .1, .1], { r: [0, -a, 0] });
    k.beam(0x6ab8d0, [c * .74, 1.72, s * .74], [c * .9, 1.35, s * .9], .06, { layer: 'water', ao: false });
    k.beam(0x6ab8d0, [c * .9, 1.35, s * .9], [c * .98, .36, s * .98], .05, { layer: 'water', ao: false });
    for (let j = 0; j < 3; j++) k.ball(0xe8f4f8, [c * .98 + k.R(-.08, .08), .38, s * .98 + k.R(-.08, .08)], .05, { layer: 'water', ao: false });
  }
  k.beam(0x8ac8e0, [0, 2.36, 0], [0, 2.75, 0], .04, { layer: 'water', ao: false });
  k.spot('fountain', [0, .4, 0]);
  for (const a of [PI / 3, PI, 5 * PI / 3]) k.spot('sit', [Math.cos(a) * 1.3, hb + .1, Math.sin(a) * 1.3], { a });
  // --- Stände in den drei Feldern zwischen den Wegen ---
  const SC = [[0xd83a3a, 0xf4efe6], [0x3a6ad8, 0xf4efe6], [0x3a9a5a, 0xf2d84a]], kinds = ['fruit', 'bread', 'pots'];
  [PI / 3, PI, 5 * PI / 3].forEach((a, i) => stall(k, [Math.cos(a) * 3.15, 0, Math.sin(a) * 3.15], -(a + PI), kinds[i], SC[i]));
  // --- Masten mit Wimpelketten und Laternen ---
  const M = [PI / 3 + .42, PI + .42, 5 * PI / 3 + .42].map(a => [Math.cos(a) * 3.85, 0, Math.sin(a) * 3.85]);
  for (const m of M) {
    k.box(0x8a857c, [m[0], -.4, m[2]], [.3, .5, .3]);
    k.cyl(W.dark, [m[0], 0, m[2]], .08, 3.5, 6, { top: .7 });
    k.ball(BRASS, [m[0], 3.55, m[2]], .08, { ao: false });
    const d = [-m[0] / 3.85, 0, -m[2] / 3.85];
    k.beam(IRON, [m[0], 2.55, m[2]], [m[0] + d[0] * .45, 2.6, m[2] + d[2] * .45], .03);
    const L = lanternHead(k, [m[0] + d[0] * .45, 2.25, m[2] + d[2] * .45], .9); k.spot('light', L);
  }
  for (let i = 0; i < 3; i++) bunting(k, [M[i][0], 3.3, M[i][2]], [M[(i + 1) % 3][0], 3.3, M[(i + 1) % 3][2]], .55);
  for (let i = 0; i < 3; i++) bunting(k, [M[i][0], 3.1, M[i][2]], [0, 2.75, 0], .25, [0xf2c43a, 0xd83a3a, 0xffffff]);
  // --- Kleinkram ---
  barrel(k, [-2.9, 0, 1.75], .85); barrel(k, [-3.45, 0, 1.6], .85, W.worn);
  crate(k, [2.75, 0, -1.25], .3, 1, [0xd83a2a]); crate(k, [2.95, .34, -1.4], .1, .9);
  sack(k, [-3.05, 0, -2.1], .5); sack(k, [-3.4, 0, -1.8], 1.9, .9, true);
  for (const [x, z] of [[2.65, 1.45], [-3.5, -1.25]]) { k.cyl(0xb8683a, [x, 0, z], .25, .4, 8, { top: 1.25 }); N.bush(k, [x, .35, z], .5, 0xe84a6a); }
}

function lifebuoy(k, p, a) { face(k, p, a, () => { for (let i = 0; i < 8; i++) { const t = i / 8 * TAU; k.boxc(i % 2 ? 0xd83a2a : 0xf4efe6, [.06, Math.sin(t) * .22, Math.cos(t) * .22], [.1, .1, .19], { r: [PI / 2 - t, 0, 0], ao: false }); } }); }
function ropeCoil(k, p) { for (let i = 0; i < 4; i++) k.add(RING(10, .6), 0xc8b080, [p[0], p[1] + i * .045, p[2]], [.28 - i * .02, .045, .28 - i * .02], { ao: false }); }
function anchor(k, p, ry) {
  rot(k, p, [0, ry, .35], () => {
    k.box(IRON, [0, 0, 0], [.07, 1.0, .07]); k.box(IRON, [0, .8, 0], [.06, .06, .5]); k.add(RING(8, .6), IRON, [0, 1.02, 0], [.09, .03, .09], { r: [PI / 2, 0, 0] });
    for (const s of [-1, 1]) { k.beam(IRON, [0, .02, 0], [0, .25, s * .38], .07); k.cone(IRON, [0, .25, s * .38], .07, .14, 4, { r: [0, 0, 0] }); }
  });
}

// =====================================================================================================
// 6) Leuchtturm auf Felsen
// =====================================================================================================
export function lighthouse(k, opts = {}) {
  const y0 = .6, y1 = 8.0, R0 = 1.08, R1 = .74, Rt = y => R0 + (R1 - R0) * (y - y0) / (y1 - y0), seg = 14;
  // --- Felsen ---
  k.cyl(0x7d7a74, [0, -.8, 0], 2.0, 1.2, 9, { jit: .08 });
  for (let i = 0; i < 11; i++) { const a = i / 11 * TAU + k.R(-.2, .2), d = k.R(1.6, 2.15), s = k.R(.55, .85);
    k.ball(k.pick([0x8f8b84, 0x7d7a74, 0x9a958c, 0x86827a]), [Math.cos(a) * d, k.R(-.1, .15), Math.sin(a) * d], [s, s * k.R(.6, .9), s * k.R(.8, 1.1)], { dod: true, r: [k.R(0, 1), k.R(0, 6), 0], jit: .12 });
    if (k.rand() < .5) k.ball(MOSS, [Math.cos(a) * d, s * .55, Math.sin(a) * d], [s * .5, .06, s * .45], { tag: TAG.grass }); }
  k.cyl(0x8a857c, [0, .2, 0], 1.45, .4, 12, { jit: .05 });                                     // Sockelplatte
  // --- Turm: rot-weiße Bänder ---
  const bands = [[y0, 2.45, 0xf2efe8], [2.45, 4.3, 0xc8302a], [4.3, 6.15, 0xf2efe8], [6.15, y1, 0xc8302a]];
  k.cyl(0x9a958c, [0, .2, 0], R0 + .1, y0 - .2 + .1, seg);
  for (const [a, b, c] of bands) k.cyl(c, [0, a, 0], Rt(a), b - a, seg, { top: Rt(b) / Rt(a), jit: .03 });
  for (const y of [2.45, 4.3, 6.15]) k.cyl(0xd8d4cc, [0, y - .03, 0], Rt(y) + .02, .06, seg, { ao: false });     // Fugen
  // Gebrauchsspuren: Rostfahnen, abgeplatzte Farbe
  for (let i = 0; i < 9; i++) { const a = k.R(0, TAU), y = k.R(1, 7.4); k.box(k.pick([0xb8a898, 0x9a5a40, 0xdcd6cc]), [Math.cos(a) * (Rt(y) - .01), y, Math.sin(a) * (Rt(y) - .01)], [.03, k.R(.2, .6), k.R(.08, .2)], { r: [0, -a, 0], ao: false }); }
  // Fenster (spiralförmig)
  const tau = Math.atan((R0 - R1) / (y1 - y0));
  for (const [a, y] of [[.9, 2.6], [2.6, 4.0], [4.5, 5.4], [-.4, 6.6]]) face(k, [Math.cos(a) * (Rt(y) - .04), y, Math.sin(a) * (Rt(y) - .04)], a, () => windowAt(k, 0, 0, .28, .44, { frame: 0x3a3a3e, bars: false, sillC: 0xd8d4cc, ft: .05 }), tau);
  // Portal mit Tür
  k.box(0xb8b2a6, [R0 - .05, .58, 0], [.42, 2.15, 1.2], { jit: .04 });
  k.prism(0xb8b2a6, [R0 - .05, 2.73, 0], 1.3, .35, .46, { r: [0, PI / 2, 0] });
  face(k, [R0 + .16, 0, 0], 0, () => doorAt(k, 0, .62, .8, 1.7, { color: 0x2a4a6a, color2: 0x24425e, stepC: 0x9a958c }));
  for (let i = 0; i < 3; i++) k.box(0x9a958c, [R0 + .35 + i * .3, .2 + .14 * (2 - i) - .14, 0], [.32, .16, 1.1 - i * .05], { jit: .05 });
  // --- Konsolen + Galerie ---
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU;
    face(k, [Math.cos(a) * (R1 - .04), y1, Math.sin(a) * (R1 - .04)], a, () => {
      k.box(0xd8d4cc, [.25, -.14, 0], [.52, .14, .1]);
      k.beam(0xd8d4cc, [.0, -.5, 0], [.46, -.1, 0], .09, { w: .1, d: .09 });
    }); }
  k.cyl(0xd8d4cc, [0, y1 - .6, 0], Rt(y1 - .6) + .05, .08, seg, { ao: false });
  k.cyl(0x3a3a3e, [0, y1, 0], 1.32, .12, 16);
  k.cyl(0x55555a, [0, y1 + .12, 0], 1.28, .02, 16, { ao: false });
  for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; k.box(IRON, [Math.cos(a) * 1.25, y1 + .12, Math.sin(a) * 1.25], [.035, .82, .035], { ao: false }); }
  for (const y of [.5, .92]) k.add(RING(20, .97), IRON, [0, y1 + y, 0], [1.27, .035, 1.27], { ao: false });
  // --- Laternenraum ---
  const yl = y1 + .12, hl = 1.15, Rl = .66;
  k.cyl(0xc8302a, [0, yl, 0], Rl + .04, .35, 8, { r: [0, PI / 8, 0] });
  for (let i = 0; i < 8; i++) { const a = i * PI / 4;
    face(k, [Math.cos(a) * Rl * Math.cos(PI / 8) * .97, 0, Math.sin(a) * Rl * Math.cos(PI / 8) * .97], a, () => k.box(0xcfe8f2, [0, yl + .35, 0], [.02, hl - .4, 2 * Rl * Math.sin(PI / 8)], { layer: 'glass', ao: false, jit: 0 }));
    const b = a + PI / 8; k.box(IRON, [Math.cos(b) * Rl, yl + .33, Math.sin(b) * Rl], [.06, hl - .33, .06]);
  }
  k.add(RING(8, .9), IRON, [0, yl + .7, 0], [Rl + .01, .04, Rl + .01], { r: [0, PI / 8, 0], ao: false });
  // Lampe + Linse
  k.cyl(IRON, [0, yl + .2, 0], .1, .3, 6);
  k.ball(0xfff2b0, [0, yl + .72, 0], .2, { layer: 'glow', tag: 2, ao: false, detail: 1 });
  k.cyl(0xe8f4ff, [0, yl + .45, 0], .32, .55, 10, { layer: 'glass', tag: 0, ao: false, top: .85 });
  for (let i = 0; i < 4; i++) k.cyl(0xb8d0d8, [0, yl + .5 + i * .12, 0], .335 - i * .01, .02, 10, { layer: 'glass', ao: false });
  k.spot('beam', [0, yl + .72, 0]);
  // Dach
  k.cyl(0xa82a24, [0, yl + hl, 0], Rl + .16, .1, 16);
  k.cyl(0xb8322a, [0, yl + hl + .1, 0], Rl + .1, .55, 16, { top: .25 });
  k.ball(0xa82a24, [0, yl + hl + .7, 0], .17, { detail: 1 });
  k.cyl(IRON, [0, yl + hl + .8, 0], .025, .6, 4); k.cone(BRASS, [0, yl + hl + 1.4, 0], .04, .12, 4);
  k.prism(IRON, [.12, yl + hl + 1.15, 0], .3, .18, .02, { r: [PI / 2, 0, -PI / 2] });
  // --- Wärterhäuschen (+z) ---
  const hx0 = -1.5, hx1 = 1.1, hz0 = 2.05, hz1 = 3.55, hy = 2.0;
  k.box(0x8a857c, [(hx0 + hx1) / 2, -.8, (hz0 + hz1) / 2], [hx1 - hx0 + .1, 1.1, hz1 - hz0 + .1], { jit: .04 });
  k.box(0xf2efe8, [(hx0 + hx1) / 2, .3, (hz0 + hz1) / 2], [hx1 - hx0, hy - .3, hz1 - hz0], { jit: .02 });
  for (const [x, z] of [[hx0, hz0], [hx0, hz1], [hx1, hz0], [hx1, hz1]]) k.box(0xc8302a, [x, .3, z], [.12, hy - .3, .12]);
  face(k, [hx1, 0, (hz0 + hz1) / 2], 0, () => { doorAt(k, -.2, .3, .7, 1.55, { color: 0x2a4a6a, stepC: 0x9a958c }); windowAt(k, .45, 1.0, .35, .5, { frame: 0x2a4a6a, sill: true, sillC: 0xd8d4cc }); });
  face(k, [(hx0 + hx1) / 2, 0, hz1], PI / 2, () => { windowAt(k, -.5, .95, .5, .55, { frame: 0x2a4a6a, shutters: 0xc8302a, box: true }); windowAt(k, .6, .95, .5, .55, { frame: 0x2a4a6a, shutters: 0xc8302a }); });
  face(k, [hx0, 0, (hz0 + hz1) / 2], PI, () => windowAt(k, 0, .95, .45, .55, { frame: 0x2a4a6a }));
  k.prism(0xf2efe8, [(hx0 + hx1) / 2, hy, (hz0 + hz1) / 2], hz1 - hz0, .75, hx1 - hx0, { r: [0, PI / 2, 0] });
  k.in([(hx0 + hx1) / 2, 0, (hz0 + hz1) / 2], 0, () => gable(k, hx1 - hx0, hz1 - hz0, hy, Math.atan(.75 / ((hz1 - hz0) / 2)), { ov: .25, ovx: .2, cols: TILE, rh: .18, single: true, sw: .28, ridge: 0x7a3020 }));
  k.spot('smoke', chimney(k, [hx0 + .45, hy + .3, (hz0 + hz1) / 2 + .35], .9, [0xb8b2a6, 0xa8a296, 0xc0baae]));
  lifebuoy(k, [hx1 + .01, 1.25, hz1 - .32], 0);
  wallLantern(k, [hx1, 1.95, (hz0 + hz1) / 2 + .2], 0);
  // --- Kleinkram ---
  anchor(k, [2.3, 0, -1.0], .5); ropeCoil(k, [2.0, 0, 1.55]); barrel(k, [-1.85, 0, 2.2], .85, W.worn); crate(k, [1.55, 0, 2.05], .3, .9);
  bench(k, [-2.2, 0, -1.6], PI / 2 + .6, 1.2); k.spot('sit', [-2.2, .45, -1.6], { a: 0 });
  N.fencePost(k, [1.6, 0, 3.75], [-1.7, 0, 3.95], 0xe8e0d0, true);
  tufts(k, [[2.4, .9], [-2.5, .5], [-.8, -2.4], [1.0, -2.4, .8], [2.6, 2.6], [-2.8, 2.4]]);
  for (const [x, z] of [[-2.3, 1.2], [-2.5, 1.5], [1.9, -1.9], [2.1, -2.1], [.3, -2.6]]) N.flower(k, [x, 0, z]);
  k.spot('door', [R0 + 1.3, 0, 0], { a: 0 });
}

function bucket(k, p, s = 1, water = false) {
  const [x, y, z] = p;
  k.cyl(W.light, [x, y, z], .12 * s, .24 * s, 8, { top: 1.25, jit: .08 });
  for (const yy of [.04, .19]) k.cyl(IRON, [x, y + yy * s, z], (.125 + yy * .13) * s, .025 * s, 8, { ao: false });
  if (water) k.cyl(0x3f8fa8, [x, y + .2 * s, z], .135 * s, .02, 8, { layer: 'water', ao: false });
  k.add(RING(8, .88), IRON, [x, y + .24 * s, z - .01], [.15 * s, .02, .15 * s], { r: [PI / 2, 0, 0], ao: false });
}
// Kübel mit Blumen
function planter(k, p, s = 1, c = 0xe85a8a) {
  const [x, y, z] = p;
  k.cyl(W.mid, [x, y, z], .32 * s, .42 * s, 8, { top: 1.12 });
  for (const yy of [.08, .32]) k.cyl(IRON, [x, y + yy * s, z], (.33 + yy * .1) * s, .03, 8, { ao: false });
  k.cyl(0x4a3626, [x, y + .4 * s, z], .32 * s, .02, 8, { ao: false });
  N.bush(k, [x, y + .32 * s, z], .5 * s);
  for (let i = 0; i < 7; i++) k.ball(c, [x + k.R(-.25, .25) * s, y + k.R(.6, .8) * s, z + k.R(-.25, .25) * s], .07, { ao: false, tag: TAG.flower });
}
// Wegweiser mit Pfeilschildern (Winkel a je Schild)
function signpost(k, p, dirs) {
  const [x, y, z] = p;
  k.box(0x8a857c, [x, y - .3, z], [.3, .38, .3]);
  k.box(W.mid, [x, y, z], [.11, 2.3, .11]); k.cone(W.dark, [x, y + 2.3, z], .1, .15, 4, { r: [0, PI / 4, 0] });
  dirs.forEach(([a, c], i) => k.in([x, y + 1.95 - i * .3, z], -a, () => {
    k.box(c, [.38, -.1, 0], [.65, .2, .04], { jit: .06 });
    k.prism(c, [.71, -.1, 0], .2, .12, .04, { r: [0, 0, -PI / 2] });
    for (let j = 0; j < 3; j++) k.box(0x3a3028, [.2 + j * .15, -.03, .022], [.1, .03, .01], { ao: false });
  }));
}

// =====================================================================================================
// 7) Dorfbrunnen (Startkachel; Wege aus 0° und 240° frei)
// =====================================================================================================
export function well(k, opts = {}) {
  const Ro = .88, Ri = .6, h = .78;
  // Schacht und Steinring
  k.cyl(0x1a2024, [0, -.8, 0], Ri, .4, 10);
  k.cyl(0x2f6f88, [0, -.25, 0], Ri, .02, 10, { layer: 'water', ao: false });
  for (let c = 0, y = -.3; y < h - .05; c++, y += .21) {
    const n = 11;
    for (let i = 0; i < n; i++) {
      const a = (i + (c % 2) * .5) / n * TAU, rm = (Ro + Ri) / 2, L = 2 * Ro * Math.sin(PI / n) + .01;
      k.in([Math.cos(a) * rm, y, Math.sin(a) * rm], -a, () => k.box(k.pick(STONE), [0, 0, 0], [Ro - Ri + k.R(-.02, .03), .19, L - .03], { jit: .07 }));
    }
  }
  for (let i = 0; i < 11; i++) { const a = (i + .25) / 11 * TAU; k.in([Math.cos(a) * (Ro + Ri) / 2, h - .05, Math.sin(a) * (Ro + Ri) / 2], -a, () => k.box(k.pick([0xb8b2a6, 0xaea89c]), [0, 0, 0], [Ro - Ri + .1, .09, 2 * Ro * Math.sin(PI / 11) + .02], { jit: .04 })); }
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; k.in([Math.cos(a) * (Ro + .22), -.06, Math.sin(a) * (Ro + .22)], -a, () => k.box(k.pick([0xa8a296, 0x9a958c, 0xb0aa9e]), [0, 0, 0], [.42, .1, 2 * (Ro + .22) * Math.sin(PI / 16) - .03], { jit: .05 })); }   // Pflasterring
  for (let i = 0; i < 5; i++) { const a = k.R(0, TAU); k.box(MOSS, [Math.cos(a) * (Ro + .005), k.R(-.05, .2), Math.sin(a) * (Ro + .005)], [.03, .08, .2], { r: [0, -a, 0] }); }
  // Pfosten, Dach, Haspel
  const yr = 1.95;
  for (const s of [-1, 1]) {
    k.box(W.dark, [0, h - .05, s * (Ro - .1)], [.14, yr - h + .05, .14]);
    k.beam(W.mid, [0, h + .4, s * (Ro - .1)], [0, h + .05, s * (Ro + .2)], .07);                      // Stütze außen
    k.box(W.dark, [0, 1.35, s * (Ro - .02)], [.24, .14, .06]);                                        // Lagerbock
  }
  k.box(W.dark, [0, yr, 0], [.16, .12, 2 * Ro + .1]);
  k.in([0, 0, 0], PI / 2, () => {
    for (const s of [-1, 1]) { k.prism(W.mid, [s * (Ro + .02), yr + .06, 0], .98, .55, .04, { r: [0, PI / 2, 0], jit: .03 }); k.box(W.dark, [s * (Ro + .05), yr + .06, 0], [.04, .5, .06]); }
    gable(k, 2 * Ro + .1, 1.0, yr + .1, Math.atan(.55 / .5), { ov: .22, ovx: .18, cols: [0x6a5a4e, 0x5e5046, 0x74645a], rh: .14, single: true, sw: .22, t: .04, moss: .6, ridge: 0x4a3a2e });
  });
  // Haspel mit Seil und Kurbel
  k.cyl(W.light, [0, 1.42, -Ro + .05], .1, 2 * Ro - .1, 8, { r: [PI / 2, 0, 0] });
  k.cyl(0xc8b080, [0, 1.42, -.3], .125, .6, 8, { r: [PI / 2, 0, 0], ao: false });
  for (let i = 0; i < 5; i++) k.cyl(0xb8a070, [0, 1.42, -.28 + i * .13], .13, .03, 8, { r: [PI / 2, 0, 0], ao: false });
  k.cyl(IRON, [0, 1.42, Ro - .1], .03, .35, 5, { r: [PI / 2, 0, 0] });
  k.beam(IRON, [0, 1.42, Ro + .22], [0, 1.12, Ro + .22], .04); k.cyl(W.pale, [0, 1.12, Ro + .2], .035, .2, 5, { r: [PI / 2, 0, 0] });
  // Eimer am Seil (pendelt leicht)
  k.part('bucket', [0, 1.3, .05], s => { s.cyl(0xc8b080, [0, -.3, 0], .012, .3, 4, { ao: false }); bucket(s, [0, -.58, 0], 1, true); }, { swing: [1, 0, 0], amp: .06, speed: 1.1 });
  bucket(k, [.62, h + .04, -.48], .9, true);
  // Wegweiser, Bank, Laterne, Blumenkübel
  signpost(k, [1.15, 0, 1.55], [[0, 0xe8d8a8], [4 * PI / 3, 0xd8c898], [2.3, 0xe0d0a0]]);
  bench(k, [-1.3, 0, 2.05], 5 * PI / 6, 1.4); k.spot('sit', [-1.3, .45, 2.05], { a: -PI / 3 });
  bench(k, [-2.25, 0, -.05], PI / 2 + .1, 1.3); k.spot('sit', [-2.25, .45, -.05], { a: 0 });
  const L = postLantern(k, [1.15, 0, -1.85], 2.4); k.spot('light', L);
  planter(k, [-.2, 0, 2.6], 1, 0xe85a8a); planter(k, [-2.3, 0, 1.2], .85, 0xf2c43a); planter(k, [2.25, 0, -1.5], .9, 0xffffff);
  crate(k, [.35, 0, 2.15], .4, .85, [0xd83a2a]); sack(k, [.9, 0, 2.45], .2, .9);
  tufts(k, [[1.6, 2.6], [-1.9, 2.9], [-3.0, .6], [2.8, -2.1], [-.6, -1.0, .6], [.75, .95, .5]]);
}

// =====================================================================================================
// 8) Steinbogenbrücke (Bach entlang x, Weg in Richtung 60° darüber)
// =====================================================================================================
export function bridge(k, opts = {}) {
  // Schiefer Rahmen: lokal z läuft entlang des Wegs (60°), lokal x quer; Bogen öffnet sich entlang des Bachs (x)
  const s = 1 / Math.tan(PI / 3), hx = 1.0 / Math.sin(PI / 3), Z = 2.6, span = 1.5, rise = 1.0, ys = -.45, pt = .22, ph = .55;
  const Rr = (span * span + rise * rise) / (2 * rise), cy = ys + rise - Rr, ring = .32;
  const top = z => .32 + .73 * (1 - (z / Z) ** 2), arch = z => cy + Math.sqrt(Math.max(0, Rr * Rr - z * z)), extr = z => cy + Math.sqrt(Math.max(0, (Rr + ring) ** 2 - z * z));
  const P = [];
  for (let i = 0; i <= 14; i++) { const z = -Z + i / 14 * 2 * Z; P.push([z, top(z)]); }
  P.push([Z, -.8], [span + .05, -.8], [span, ys]);
  const f0 = Math.asin((ys - cy) / Rr);
  for (let i = 1; i < 12; i++) { const f = f0 + i / 12 * (PI - 2 * f0); P.push([Rr * Math.cos(f), cy + Rr * Math.sin(f)]); }
  P.push([-span, ys], [-span - .05, -.8], [-Z, -.8]);
  const PP = []; for (let i = 0; i <= 14; i++) { const z = -Z + i / 14 * 2 * Z; PP.push([z, top(z) - .02]); } for (let i = 14; i >= 0; i--) { const z = -Z + i / 14 * 2 * Z; PP.push([z, top(z) + ph]); }
  const seg = (fn, n = 18, z0 = -Z, z1 = Z, yf = top) => { for (let i = 0; i < n; i++) { const a = z0 + i / n * (z1 - z0), b = z0 + (i + 1) / n * (z1 - z0); fn((a + b) / 2, b - a, -Math.atan((yf(b) - yf(a)) / (b - a)), yf((a + b) / 2)); } };
  shear(k, s, () => {
    k.add(profileGeo('bridge', P), MORTAR, [-hx + .02, 0, 0], [2 * hx - .04, 1, 1], { jit: .02 });
    for (const xx of [hx - pt, -hx]) k.add(profileGeo('parapet', PP), MORTAR, [xx, 0, 0], [pt, 1, 1], { jit: .02 });
    // Außenseiten: Zwickel + Brüstung in einem
    for (const [x, a] of [[hx, 0], [-hx, PI]]) face(k, [x, 0, 0], a, () => {
      stones(k, -Z, Z, -.75, top(0) + ph, { ch: .24, len: [.3, .55], moss: .4, skip: (z, y, za, zb) => y > Math.min(top(za), top(zb)) + ph - .12 || (Math.abs(z) < span + .45 && y < extr(Math.abs(z) + .1) + .04) || (Math.abs(z) < span + .02) && y < ys + .3 });
    });
    // Innenseiten der Brüstung
    for (const [x, a] of [[hx - pt, PI], [-hx + pt, 0]]) face(k, [x, 0, 0], a, () => stones(k, -Z, Z, .1, top(0) + ph, { ch: .2, len: [.3, .5], d: .03, skip: (z, y, za, zb) => y < Math.max(top(za), top(zb)) - .02 || y > Math.min(top(za), top(zb)) + ph - .12 }));
    // Bogensteine (über die ganze Breite, versetzt)
    const nv = 13;
    for (let i = 0; i < nv; i++) {
      const f = f0 + (i + .5) / nv * (PI - 2 * f0), L = (PI - 2 * f0) / nv * (Rr + ring / 2) - .03;
      const cyv = cy + (Rr + ring / 2) * Math.sin(f), cz = (Rr + ring / 2) * Math.cos(f);
      const cuts = i % 2 ? [-hx, -.35, .45, hx] : [-hx, .1, hx];
      for (let j = 0; j < cuts.length - 1; j++) k.boxc(k.pick([0xa8a296, 0x9a958c, 0xb0aa9e, 0x948c80]), [(cuts[j] + cuts[j + 1]) / 2, cyv, cz], [cuts[j + 1] - cuts[j] - .03 + (j === 0 || j === cuts.length - 2 ? .06 : 0), ring, L], { r: [PI / 2 - f, 0, 0], jit: .06 });
    }
    k.boxc(0xc8c0b0, [0, cy + Rr + ring * .5, 0], [2 * hx + .1, ring + .04, .26], { jit: .03 });     // Schlussstein
    // Fahrbahn: Pflaster in Reihen
    const iw = 2 * (hx - pt);
    seg((z, L, r, y) => { const n = 6, off = (Math.round((z + Z) / L) % 2) * .5; for (let j = 0; j < n; j++) { const a = -iw / 2 + Math.max(0, (j - off) / n) * iw, b = -iw / 2 + Math.min(n, j + 1 - off) / n * iw; if (b - a > .05) k.boxc(k.pick([0xa49a8c, 0x989080, 0xb0a698, 0x8e8678]), [(a + b) / 2, y + .02, z], [b - a - .025, .08, L - .025], { r: [r, 0, 0], jit: .05 }); } if (off) k.boxc(0x989080, [iw / 2 - iw / 12, y + .02, z], [iw / 6 - .025, .08, L - .025], { r: [r, 0, 0] }); }, 18);
    // Abdeckplatten auf der Brüstung
    for (const x of [hx - pt / 2, -hx + pt / 2]) seg((z, L, r, y) => k.boxc(k.pick([0xb8b2a6, 0xaea89c, 0xc0baae]), [x, y + ph + .04, z], [pt + .08, .09, L - .015], { r: [r, 0, 0], jit: .04 }), 10);
    // Rampen am Ende
    for (const sg of [-1, 1]) for (let i = 0; i < 3; i++) { const z = sg * (Z + .15 + i * .25), y = top(Z) - (i + 1) * .1; k.boxc(k.pick([0xa49a8c, 0x989080]), [0, y - .02, z], [iw + .3, .1, .26], { jit: .05 }); k.box(0x8a857c, [0, -.4, z], [iw + .3, y + .4 - .07, .26]); }
    // Efeu an der Außenseite
    for (let i = 0; i < 14; i++) { const z = k.R(-Z + .3, Z - .3), y = k.R(-.3, top(z) + .3), sx = k.rand() < .5 ? 1 : -1; if (Math.abs(z) < span + .4 && y < extr(Math.abs(z))) continue; k.ball(k.pick([0x3f7a34, 0x4f8a3a, 0x356a30]), [sx * (hx + .06), y, z], [.06, k.R(.12, .25), k.R(.15, .3)], { tag: TAG.leaf, sway: .2, ao: false }); }
  });
  // Endpfeiler mit Laternen (im Weltrahmen, nicht geschert)
  const W2 = (x, z) => [x + z * s, 0, z];
  for (const [xl, zl, lamp] of [[hx - pt / 2, Z, true], [-hx + pt / 2, Z, false], [hx - pt / 2, -Z, false], [-hx + pt / 2, -Z, true]]) {
    const p = W2(xl, zl), y = top(Z);
    k.in(p, -PI / 3, () => {
      k.box(k.pick([0xa8a296, 0x9a958c]), [0, -.6, 0], [.42, y + ph + .85, .42], { jit: .05 });
      for (let j = 0; j < 4; j++) k.box(k.pick(STONE), [0, y - .3 + j * .3, 0], [.46, .26, .46], { jit: .06 });
      k.box(0xc0baae, [0, y + ph + .25, 0], [.52, .1, .52]); k.cone(0xb8b2a6, [0, y + ph + .35, 0], .3, .22, 4, { r: [0, PI / 4, 0] });
      if (lamp) { k.cyl(IRON, [0, y + ph + .5, 0], .03, .5, 5); const L = lanternHead(k, [0, y + ph + 1.0, 0], .85); k.spot('light', L); }
    });
  }
  // Steine am Fuß der Widerlager (außerhalb des Betts)
  for (const [xl, zl] of [[hx + .3, 1.95], [-hx - .35, 2.0], [hx + .35, -2.0], [-hx - .25, -1.95]]) { const p = W2(xl, zl); N.rock(k, [p[0], -.2, p[2]], .45); }
  tufts(k, [[2.6, 1.0], [-2.4, -1.6], [-.5, 2.2, .8], [.6, -2.1, .8]]);
}

// Lore auf Schienen (Spur 0,6 m, entlang x)
function minecart(k, p, ry = 0) {
  k.in(p, ry, () => {
    for (const sx of [-.32, .32]) for (const sz of [-.3, .3]) { k.cyl(IRON, [sx, .14, sz - .03 * Math.sign(sz)], .13, .06, 8, { r: [PI / 2, 0, 0] }); k.cyl(0x55555a, [sx, .14, sz + .02 * Math.sign(sz)], .05, .04, 6, { r: [PI / 2, 0, 0] }); }
    k.box(0x4a3a2e, [0, .14, 0], [1.0, .1, .5]);
    k.cyl(0x6a4a30, [0, .24, 0], .62, .55, 4, { top: 1.2, r: [0, PI / 4, 0], jit: .06 });
    for (const y of [.3, .7]) k.cyl(IRON, [0, y, 0], .64 + (y - .24) * .2 * .7, .05, 4, { r: [0, PI / 4, 0], ao: false });
    for (const s of [-1, 1]) for (const z of [-.25, .25]) k.box(IRON, [s * .45, .28, z], [.04, .5, .05], { r: [0, 0, s * -.14], ao: false });
    k.box(IRON, [.62, .14, 0], [.2, .05, .06]); k.add(RING(6, .6), IRON, [.74, .14, 0], [.06, .03, .06], { ao: false });
    // Erz
    for (let i = 0; i < 14; i++) k.ball(k.pick([0x5a5650, 0x4a4844, 0x6a645c, 0x3e3c3a]), [k.R(-.35, .35), .72 + k.R(0, .12), k.R(-.3, .3)], k.R(.09, .14), { dod: true, jit: .12, r: [k.R(0, 3), k.R(0, 3), 0] });
    for (let i = 0; i < 6; i++) k.ball(k.pick([0xe8b83a, 0xd8a030, 0x8ad0e0]), [k.R(-.3, .3), .82 + k.R(0, .06), k.R(-.25, .25)], .05, { dod: true, ao: false, layer: i < 4 ? 'base' : 'glow', tag: 2 });
  });
}
function rails(k, x0, x1, y = 0) {
  for (let x = x0 + .15; x < x1; x += .45) k.box(k.pick([W.dark, W.worn, 0x5e4a36]), [x, y, 0], [.16, .08, .9], { r: [0, k.R(-.06, .06), 0], jit: .1 });
  for (const z of [-.3, .3]) { k.box(0x55555a, [(x0 + x1) / 2, y + .08, z], [x1 - x0, .07, .05], { jit: .02 }); k.box(0x8a8a90, [(x0 + x1) / 2, y + .15, z], [x1 - x0, .01, .06], { ao: false, jit: 0 }); }
}

// =====================================================================================================
// 9) Stolleneingang (am Hang; Öffnung nach +x, dahinter steigt der Berg an)
// =====================================================================================================
export function mine(k, opts = {}) {
  const ow = 1.45, oh = 1.85, ROCK = [0x8a8780, 0x7a7770, 0x96928a, 0x6e6b66];
  // --- Sturzbühne: Bretterboden auf Pfosten (der Hang fällt nach +x ab), darunter die Halde ---
  k.box(0x6a6052, [-.1, -1.2, 0], [1.2, 1.2, 2.4], { jit: .06 });                                // Felsabsatz am Mundloch
  for (let x = .5; x < 2.3; x += .26) k.box(k.pick([W.worn, W.mid, 0x846040]), [x, -.08, 0], [.24, .07, 2.0], { jit: .1, r: [0, k.R(-.02, .02), 0] });
  for (const z of [-.95, .95]) k.box(W.dark, [1.4, -.24, z], [1.9, .16, .14]);
  for (const x of [.65, 1.4, 2.15]) for (const z of [-.9, .9]) k.box(W.dark, [x, -2.8, z], [.16, 2.72, .16]);
  for (const z of [-.9, .9]) { k.beam(W.mid, [.65, -2.2, z], [1.4, -.35, z], .08); k.beam(W.mid, [2.15, -2.2, z], [1.4, -.35, z], .08); }
  for (const x of [.65, 2.15]) k.beam(W.mid, [x, -1.9, -.9], [x, -.4, .9], .08);
  // Geländer an den Seiten
  for (const z of [-1.0, 1.0]) { for (const x of [.6, 1.4, 2.2]) k.box(W.dark, [x, -.08, z], [.08, 1.0, .08]); k.box(W.mid, [1.4, .8, z], [1.7, .06, .06]); k.box(W.mid, [1.4, .45, z], [1.7, .05, .05]); }
  // --- Felswand um das Mundloch ---
  k.box(0x5a5650, [-1.6, -1.0, 0], [2.6, 4.2, 4.0], { jit: .05 });
  const R1 = [[-.35, .2, -1.45, .8], [-.3, .9, -1.55, .75], [-.4, 1.7, -1.3, .8], [-.35, .2, 1.45, .8], [-.3, .95, 1.6, .75], [-.45, 1.75, 1.35, .8], [-.5, 2.55, -.6, .9], [-.55, 2.6, .55, .9], [-.7, 2.9, -1.6, .8], [-.8, 2.95, 1.6, .85], [-.9, 3.4, 0, 1.0], [-.4, .1, -2.1, .7], [-.4, .3, 2.15, .7]];
  for (const [x, y, z, s] of R1) { k.ball(k.pick(ROCK), [x, y, z], [s * k.R(.8, 1.1), s * k.R(.7, .9), s * k.R(.8, 1.1)], { dod: true, jit: .12, r: [k.R(0, 2), k.R(0, 6), 0] });
    if (k.rand() < .5) k.ball(0x5a7a3a, [x + .1, y + s * .65, z], [s * .55, .08, s * .5], { tag: TAG.grass }); }
  for (const [x, z] of [[-.2, -2.3], [-.4, 2.4], [-.9, 3.6]]) N.grass(k, [x, 1.0, z], 1.1);
  // --- Stollen innen (dunkel, nach hinten dunkler) ---
  for (let i = 0; i < 3; i++) {
    const x = -.15 - i * .65, c = [0x3a3430, 0x2a2622, 0x1e1b19][i];
    k.box(c, [x - .32, -.05, -ow / 2 - .1], [.66, oh + .1, .2]); k.box(c, [x - .32, -.05, ow / 2 + .1], [.66, oh + .1, .2]);
    k.box(c, [x - .32, oh, 0], [.66, .2, ow + .4]);
    k.box([0x4a4038, 0x3a322c, 0x2a2420][i], [x - .32, -.1, 0], [.66, .1, ow]);
  }
  k.box(0x0e0c0b, [-2.1, -.1, 0], [.1, oh + .3, ow + .4], { ao: false });
  // --- Türstock (Holzrahmen) ---
  const TS = (x, c, s = 1) => {
    for (const sg of [-1, 1]) k.beam(c, [x, -.05, sg * (ow / 2 - .02)], [x, oh - .05, sg * (ow / 2 - .1)], .17 * s);
    k.box(c, [x, oh - .06, 0], [.2 * s, .2 * s, ow + .35]);
    for (const sg of [-1, 1]) k.box(c, [x, oh - .3, sg * (ow / 2 - .2)], [.12 * s, .18, .12], { r: [sg * .7, 0, 0] });
  };
  TS(.08, W.worn); TS(-.6, 0x4a3a2c, .9); TS(-1.25, 0x2e2620, .85);
  for (let i = 0; i < 7; i++) k.box(k.pick([W.worn, W.dark, 0x5e4a36]), [.0, oh + .14, -ow / 2 - .1 + i * (ow + .2) / 6], [.5, .07, .16], { jit: .1 });   // Verzug über der Kappe
  // Schild „Glück auf“ mit Schlägel und Eisen
  k.in([.24, oh - .02, 0], 0, () => {
    for (const z of [-.35, .35]) k.box(IRON, [0, -.12, z], [.02, .14, .02], { ao: false });
    k.box(0xb8925a, [0, -.5, 0], [.06, .38, 1.05], { jit: .08 });
    k.box(0x6a4a30, [.035, -.5, 0], [.01, .02, 1.0], { ao: false }); k.box(0x6a4a30, [.035, -.14, 0], [.01, .02, 1.0], { ao: false });
    for (const sg of [-1, 1]) rot(k, [.04, -.31, 0], [sg * .75, 0, 0], () => { k.box(0x5a3a22, [0, -.13, 0], [.01, .26, .03], { ao: false }); k.box(0x2a2a2e, [0, .1, 0], [.015, .06, .12], { ao: false }); });
    for (const z of [-.42, -.28, .28, .42]) k.box(0x3a2818, [.035, -.36, z], [.01, .1, .06], { ao: false });
  });
  // Laterne am Kappholz
  k.beam(IRON, [.18, oh + .02, -ow / 2 - .05], [.45, oh + .02, -ow / 2 - .05], .03);
  k.spot('light', lanternHead(k, [.45, oh - .38, -ow / 2 - .05], .9));
  k.cyl(IRON, [.45, oh - .2, -ow / 2 - .05], .01, .2, 3);
  // --- Gleis mit Lore und Prellbock ---
  rails(k, -1.9, 2.0, 0);
  minecart(k, [.95, .12, 0], 0);
  for (const z of [-.3, .3]) { k.box(W.dark, [2.05, .0, z], [.14, .42, .14]); k.beam(W.dark, [1.8, .1, z], [2.0, .38, z], .08); }
  k.box(W.mid, [2.0, .3, 0], [.12, .16, .9]); k.box(0xc8b830, [2.07, .32, 0], [.01, .1, .86], { ao: false });
  for (let i = 0; i < 6; i++) k.ball(k.pick([0x5a5650, 0x4a4844, 0x6a645c]), [1.85 + k.R(-.15, .1), k.R(0, .05), k.R(-.6, .6)], k.R(.08, .14), { dod: true });  // verschüttetes Erz
  // Werkzeug und Kram
  pickaxe(k, [.3, 0, ow / 2 + .25], -1.4);
  k.in([.35, 0, -ow / 2 - .35], 0, () => { k.beam(W.pale, [0, 0, 0], [0, 1.1, .12], .04); k.box(IRON, [0, -.05, 0], [.22, .28, .03], { r: [-.12, 0, 0] }); });  // Schaufel
  crate(k, [1.55, 0, -.65], .3, .9, [0x5a5650, 0xe8b83a]); barrel(k, [1.65, 0, .62], .8, W.worn);
  for (let i = 0; i < 4; i++) k.cyl(0x8a6a48, [.8, .07 + (i > 2 ? .13 : 0), .55 + (i % 3) * .13 + (i > 2 ? .06 : 0)], .065, .9, 5, { r: [0, 0, -PI / 2] });  // Stempelholz
}

// Ruderboot-Rumpf (Bug +x, Heckspiegel −x), Kiel bei y = 0. Liefert { outer, inner } Geometrien.
function hullGeo() {
  if (TPL.hull) return TPL.hull;
  const st = [], n = 9, L = 2.5;
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = -L / 2 + t * L, w = i === n ? 0 : .46 * Math.min(1, 1.25 * (1 - t ** 2.6)) * (t < .08 ? .85 + t * 2 : 1), h = .44 + .12 * (2 * t - 1) ** 2 + (t > .85 ? (t - .85) * .8 : 0);
    st.push({ x, w, h, k: t > .9 ? (t - .9) * 2.2 : 0 });
  }
  const sec = (s, sg, ins) => { const f = ins ? .86 : 1, dy = ins ? .06 : 0; return [[s.x, s.k + dy, 0], [s.x, .12 + s.k * .5 + dy, sg * s.w * .72 * f], [s.x, s.h, sg * s.w * f]]; };
  const mk = (ins) => {
    const p = [];
    const tri = (a, b, c, ref) => { const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], nx = u[1] * v[2] - u[2] * v[1], ny = u[2] * v[0] - u[0] * v[2], nz = u[0] * v[1] - u[1] * v[0];
      const cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3, cz = (a[2] + b[2] + c[2]) / 3, d = nx * (cx - ref[0]) + ny * (cy - ref[1]) + nz * (cz - ref[2]);
      if ((d > 0) !== !ins) p.push(...a, ...c, ...b); else p.push(...a, ...b, ...c); };
    for (const sg of [-1, 1]) for (let i = 0; i < n; i++) {
      const A = sec(st[i], sg, ins), B = sec(st[i + 1], sg, ins);
      for (let j = 0; j < 2; j++) { const ref = [(st[i].x + st[i + 1].x) / 2, .5, 0]; tri(A[j], B[j], B[j + 1], ref); tri(A[j], B[j + 1], A[j + 1], ref); }
    }
    // Heckspiegel
    const S = st[0], o = sec(S, 1, ins), u = sec(S, -1, ins), ref = [S.x + .5, .3, 0];
    tri(u[2], u[1], o[1], ref); tri(u[2], o[1], o[2], ref); tri(u[1], u[0], o[1], ref);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals(); return g;
  };
  return TPL.hull = { outer: mk(false), inner: mk(true), st };
}
function rowboat(s, hullC = 0x3a7a8a) {
  const H = hullGeo();
  s.add(H.outer, hullC, [0, 0, 0], [1, 1, 1], { jit: .05 });
  s.add(H.inner, 0xa8885e, [0, 0, 0], [1, 1, 1], { jit: .08 });
  for (let i = 0; i < H.st.length - 1; i++) for (const sg of [-1, 1]) { const a = H.st[i], b = H.st[i + 1]; s.beam(0xeee8dc, [a.x, a.h + .02, sg * a.w], [b.x, b.h + .02, sg * b.w], .06, { ao: false }); }
  s.box(0xeee8dc, [H.st[0].x - .01, .1, 0], [.05, H.st[0].h - .06, 2 * H.st[0].w * .95], { ao: false });
  for (const [x, w] of [[-.6, .4], [.25, .44]]) s.box(W.light, [x, .3, 0], [.22, .05, 2 * w * .9]);
  s.box(W.light, [-1.05, .28, 0], [.25, .05, .6]);
  for (const sg of [-1, 1]) { s.cyl(IRON, [-.15, H.st[4].h, sg * .44], .02, .1, 4); }
  // Ruder im Boot
  for (const sg of [-1, 1]) { s.beam(W.pale, [-1.0, .36, sg * .14], [.45, .4, sg * .18], .045, { ao: false }); s.box(W.pale, [.6, .39, sg * .18], [.4, .02, .12], { r: [0, sg * .05, 0], ao: false }); }
  s.box(0x3a7aa0, [-.2, .08, 0], [1.4, .02, .4], { layer: 'water', ao: false });                 // etwas Wasser im Boot
}

// =====================================================================================================
// 10) Bootssteg (am Seeufer, führt nach +x aufs Wasser; Wasserspiegel lokal opts.water, Standard −0,44 = −0,32 Welt bei Höhe 0,12)
// =====================================================================================================
export function jetty(k, opts = {}) {
  const WL = opts.water ?? -.44, yd = .08, x0 = -.45, x1 = 3.6, hw = .68;
  // Pfähle (paarweise), nasser Rand an der Wasserlinie
  const piles = [.35, 1.45, 2.55, 3.5];
  for (const x of piles) for (const z of [-hw + .06, hw - .06]) {
    const top = x === 3.5 ? yd + .55 : yd - .02;
    k.cyl(k.pick([W.worn, 0x5e4a36, W.gray]), [x, -1.8, z], .1, top + 1.8, 7, { jit: .08 });
    k.cyl(0x3a4a32, [x, WL - .12, z], .108, .18, 7, { ao: false });
    if (x === 3.5) k.cone(W.worn, [x, top, z], .1, .06, 7);
  }
  for (const x of piles.slice(0, -1)) for (const sg of [-1, 1]) k.beam(W.dark, [x, WL + .05, sg * (hw - .06)], [x + 1.1, yd - .2, sg * (hw - .06)], .06);       // Streben
  for (const x of piles) k.box(W.dark, [x, yd - .26, 0], [.12, .14, 2 * hw]);                                                        // Querjoche
  for (const z of [-hw + .12, hw - .12, 0]) k.box(W.dark, [(x0 + x1) / 2, yd - .14, z], [x1 - x0, .12, .1]);                         // Längsträger
  // Bretter quer, ein paar fehlen oder sind verzogen
  for (let x = x0 + .1, i = 0; x < x1 - .05; x += .2, i++) {
    if (i === 9) continue;
    const c = k.pick([W.light, W.pale, 0xa88a60, W.gray]), tilt = k.rand() < .15 ? k.R(-.04, .04) : 0;
    k.box(c, [x, yd - .02, k.R(-.03, .03)], [.18, .05, 2 * hw + k.R(-.05, .1)], { r: [tilt, k.R(-.03, .03), 0], jit: .08 });
    for (const z of [-hw + .12, hw - .12]) k.box(0x3a3a3e, [x, yd + .03, z], [.03, .01, .03], { ao: false });
  }
  // Landseite: Stufen/Steine
  k.box(W.dark, [x0 + .05, -.3, 0], [.2, .34, 2 * hw + .2]);
  for (const z of [-.95, .95]) N.rock(k, [x0 + .05, -.15, z], .45);
  // Poller mit Tau, Leiter am Ende, Rettungsring, Laterne
  k.cyl(0xc8b080, [3.5, yd + .3, hw - .06], .115, .12, 7, { ao: false });
  k.add(RING(8, .7), 0xc8b080, [3.5, yd + .22, -hw + .06], [.15, .05, .15], { ao: false });
  for (const sg of [-1, 1]) k.box(IRON, [x1 + .05, WL - .5, sg * .22], [.04, yd - WL + .55, .04]);
  for (let y = WL - .4; y < yd; y += .22) k.box(IRON, [x1 + .05, y, 0], [.03, .03, .44], { ao: false });
  k.box(W.dark, [2.55, yd, -hw + .02], [.1, 1.25, .1]);
  lifebuoy(k, [2.55, yd + .85, -hw - .03], -PI / 2);
  k.beam(IRON, [3.5, yd + .55, hw - .06], [3.5, yd + 1.25, hw - .06], .04);
  k.beam(IRON, [3.5, yd + 1.25, hw - .06], [3.2, yd + 1.25, hw - .06], .03);
  k.spot('light', lanternHead(k, [3.2, yd + .92, hw - .06], .8));
  // Kram: Angel, Eimer, Reuse, Seilrolle, Kiste
  k.beam(0x8a6a48, [3.15, yd + .03, -.35], [4.3, yd + 1.2, -.9], .025, { ao: false });
  k.beam(0xe8e0d0, [4.3, yd + 1.2, -.9], [4.35, WL, -1.0], .005, { ao: false });
  k.ball(0xd83a2a, [4.35, WL + .02, -1.0], .035, { ao: false });
  bucket(k, [2.95, yd + .03, -.38], .9, true);
  k.spot('sit', [3.3, yd + .05, -.3], { a: 0 });
  k.in([1.2, yd + .03, -.35], .3, () => { k.cyl(0x8a6a48, [0, .2, -.25], .2, .5, 7, { r: [PI / 2, 0, 0] }); for (let i = 0; i < 4; i++) k.add(RING(7, .9), 0x6a4a30, [0, .2, -.2 + i * .14], [.21, .02, .21], { r: [PI / 2, 0, 0], ao: false }); });  // Reuse
  ropeCoil(k, [.6, yd + .03, .38]); crate(k, [.05, yd + .03, -.4], .2, .8, [0x9ab8c8]);
  // --- Ruderboot (schaukelt) längsseits ---
  const bp = [2.0, WL - .14, hw + .62];
  k.part('boat', bp, s => { rot(s, [0, 0, 0], [0, PI, 0], () => rowboat(s)); s.beam(0xc8b080, [-1.2, .5, 0], [-1.5, yd - WL + .3, -.62], .02, { ao: false }); }, { bob: .05 });
  k.spot('boat', bp, { a: PI });
}
