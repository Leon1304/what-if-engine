// Baukasten für Low-Poly-Modelle: sammelt Grundkörper (mit Farbe je Fläche, Wind-Gewicht, Jahreszeit-Tag und weicher
// Bodenverdunklung als Umgebungsverdeckung) und fügt sie je Ebene zu einer Geometrie zusammen (ein Draw Call je Ebene).
// Ebenen: base (alles Feste), glow (Fenster/Lampen, leuchten nachts), water (Wasserflächen), fall (Wasserfall).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './hex.js';

export const TAG = { none: 0, leaf: 1, grass: 2, crop: 3, needle: 4, flower: 5, roof: 6 };
const T = {};
function tpl(name, make) { if (!T[name]) { let g = make(); g.deleteAttribute('uv'); if (g.index) g = g.toNonIndexed(); T[name] = g; } return T[name]; }
const BOX = () => tpl('box', () => new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0));
const BOXC = () => tpl('boxc', () => new THREE.BoxGeometry(1, 1, 1));
const CYL = (top, seg) => tpl('cyl' + top + '_' + seg, () => new THREE.CylinderGeometry(top, 1, 1, seg, 1).translate(0, .5, 0));
const ICO = d => tpl('ico' + d, () => new THREE.IcosahedronGeometry(1, d));
const DOD = () => tpl('dod', () => new THREE.DodecahedronGeometry(1, 0));
const PRISM = () => tpl('prism', () => {          // Giebel-Dreieck: Basis x −0.5…0.5 bei y 0, Spitze (0, 1), Tiefe z −0.5…0.5
  const g = new THREE.BufferGeometry(), A = [-.5, 0], B = [.5, 0], C = [0, 1], p = [];
  const tri = (a, b, c) => p.push(...a, ...b, ...c);
  const f = (v, z) => [v[0], v[1], z];
  tri(f(A, .5), f(B, .5), f(C, .5)); tri(f(B, -.5), f(A, -.5), f(C, -.5));
  for (const [u, w] of [[A, B], [B, C], [C, A]]) { tri(f(u, -.5), f(w, -.5), f(w, .5)); tri(f(u, -.5), f(w, .5), f(u, .5)); }
  // Unterseite (u→w gegen den Uhrzeigersinn je nach Seite): A→B ist der Boden
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals(); return g;
});

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

export class Kit {
  constructor(seed = 1) { this.L = {}; this.stack = [new THREE.Matrix4()]; this.rand = rng(seed); this.ground = 0; this.jit = .09; this.layer = 'base'; }
  get M() { return this.stack[this.stack.length - 1]; }
  R(a = 0, b = 1) { return a + (b - a) * this.rand(); }
  pick(a) { return a[Math.floor(this.rand() * a.length)]; }
  push(p = [0, 0, 0], ry = 0, s = 1) {
    _e.set(0, ry, 0); _q.setFromEuler(_e); _s.set(...(Array.isArray(s) ? s : [s, s, s]));
    this.stack.push(this.M.clone().multiply(new THREE.Matrix4().compose(_p.set(...p), _q.clone(), _s.clone()))); return this;
  }
  pushM(m) { this.stack.push(this.M.clone().multiply(m)); return this; }
  pop() { this.stack.pop(); return this; }
  in(p, ry, fn, s = 1) { this.push(p, ry, s); fn(); this.pop(); return this; }

  // Grundfunktion: Vorlage + lokale Lage → Ebene
  add(geo, color, p, scale, o = {}) {
    const g = geo.clone();
    _e.set(...(o.r || [0, 0, 0]), o.order || 'XYZ'); _q.setFromEuler(_e);
    _m.compose(_p.set(...p), _q, _s.set(...scale)); g.applyMatrix4(_m); g.applyMatrix4(this.M);
    const pos = g.attributes.position, n = pos.count, col = new Float32Array(n * 3), sway = new Float32Array(n), tag = new Float32Array(n);
    _c.set(color); const jit = o.jit ?? this.jit, ao = o.ao !== false, sw = o.sway || 0, tg = o.tag || 0, swBase = o.swayBase;
    for (let f = 0; f < n; f += 3) {
      const k = 1 + (this.rand() - .5) * 2 * jit;
      for (let v = f; v < f + 3 && v < n; v++) {
        const y = pos.getY(v) - this.ground; let a = 1;
        if (ao) { const t = Math.min(1, Math.max(0, y / .9)); a = .6 + .4 * t * t * (3 - 2 * t); }
        col[v * 3] = _c.r * k * a; col[v * 3 + 1] = _c.g * k * a; col[v * 3 + 2] = _c.b * k * a;
        sway[v] = typeof sw === 'number' ? sw : Math.max(0, (pos.getY(v) - (swBase ?? this.ground)) * sw.k);
        tag[v] = tg;
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('sway', new THREE.BufferAttribute(sway, 1)); g.setAttribute('tag', new THREE.BufferAttribute(tag, 1));
    (this.L[o.layer || this.layer] ||= []).push(g); return this;
  }
  // Kiste: p = Mitte unten
  box(c, p, s, o) { return this.add(BOX(), c, p, s, o); }
  // Kiste: p = Mitte
  boxc(c, p, s, o) { return this.add(BOXC(), c, p, s, o); }
  // Balken zwischen zwei Punkten (Querschnitt t)
  beam(c, a, b, t = .1, o = {}) {
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length(), mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), e = new THREE.Euler().setFromQuaternion(q);
    return this.add(BOXC(), c, mid, [o.w ?? t, L, o.d ?? t], { ...o, r: [e.x, e.y, e.z], order: e.order });
  }
  cyl(c, p, r, h, seg = 8, o = {}) { const top = o.top ?? 1; return this.add(CYL(top, seg), c, p, [r, h, r], o); }
  cone(c, p, r, h, seg = 7, o = {}) { return this.add(CYL(0, seg), c, p, [r, h, r], o); }
  ball(c, p, r, o = {}) { const s = Array.isArray(r) ? r : [r, r, r]; return this.add(o.dod ? DOD() : ICO(o.detail ?? 0), c, p, s, o); }
  prism(c, p, w, h, d, o) { return this.add(PRISM(), c, p, [w, h, d], o); }
  raw(g, layer = 'base', keepUv = false) {
    g = g.index ? g.toNonIndexed() : g.clone(); g.applyMatrix4(this.M);
    const n = g.attributes.position.count;
    if (!g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    if (!g.attributes.sway) g.setAttribute('sway', new THREE.BufferAttribute(new Float32Array(n), 1));
    if (!g.attributes.tag) g.setAttribute('tag', new THREE.BufferAttribute(new Float32Array(n), 1));
    if (!g.attributes.normal) g.computeVertexNormals();
    if (g.attributes.uv && !keepUv) g.deleteAttribute('uv');
    (this.L[layer] ||= []).push(g); return this;
  }
  // Punkt aus dem aktuellen lokalen Rahmen in Kit-Koordinaten (Kachel-lokal)
  world(p) { return new THREE.Vector3(...p).applyMatrix4(this.M).toArray(); }
  // Markierung für Spiel/Leben: type z. B. 'door', 'smoke', 'light', 'beam', 'sit', 'boat', 'bell'. Liegt in Kit-Koordinaten.
  spot(type, p, extra = {}) { (this.spots ||= []).push({ type, p: this.world(p), ...extra }); return this; }
  // Bewegliches Teil (Mühlenflügel, Wasserrad, Tür, Boot …): fn(sub) zeichnet um den Drehpunkt (0,0,0) im aktuellen Rahmen.
  // info: { spin: [ax, ay, az] (Achse im Teil-Rahmen), speed: rad/s } oder { bob: Höhe } oder { swing: [ax,ay,az], amp, speed }
  part(name, pivot, fn, info = {}) {
    const sub = new Kit(Math.floor(this.rand() * 1e9)); sub.jit = this.jit; sub.ground = -1e9; fn(sub);
    const matrix = this.M.clone().multiply(new THREE.Matrix4().makeTranslation(...pivot));
    (this.parts ||= []).push({ name, geo: sub.build(), matrix, spots: sub.spots || [], children: sub.parts || [], ...info }); return this;
  }
  build() {
    const out = {};
    for (const [k, list] of Object.entries(this.L)) if (list.length) { out[k] = mergeGeometries(list, false); out[k].computeBoundingSphere(); out[k].computeBoundingBox(); }
    this.L = {}; return out;
  }
}
