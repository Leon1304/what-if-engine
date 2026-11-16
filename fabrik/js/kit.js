// Fließband – Low-Poly-Baukasten. Sammelt Grundkörper mit Vertex-Farben (eine Farbe je Körper, leichte Streuung,
// weiche Bodenverdunklung als Umgebungsverdeckung) und fügt sie je Ebene zu einer Geometrie zusammen (ein Draw Call je Ebene).
// Ebenen: base (matt), metal (Metall, glänzt), glow (leuchtet immer), heat (Glühen je Gebäude regelbar), glass (durchsichtig),
// gold (Goldglanz). Bewegliche Teile über k.part(name, pivot, fn) → nach toGroup() als Object3D in parts[name].
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';

export const PI = Math.PI, TAU = Math.PI * 2;
// Oberkante der Bänder (darauf liegen die Teile), 1 Feld = 1 Einheit
export const BELT_Y = 0.2;

// gesäter Zufall (mulberry32)
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function hash2(x, y, s = 0) {
  let h = Math.imul((x | 0) * 374761393 + (y | 0) * 668265263 + s * 2147483647, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------- Vorlagen (ohne uv, nicht indiziert) ----------
const T = {};
function prep(g, keepUv) { if (!keepUv) g.deleteAttribute('uv'); if (g.index) g = g.toNonIndexed(); g.computeVertexNormals(); return g; }
export function tpl(name, make, keepUv = false) { if (!T[name]) T[name] = prep(make(), keepUv); return T[name]; }
const r3 = v => Math.round(v * 1000) / 1000;
const BOX = () => tpl('box', () => new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0));
const BOXC = () => tpl('boxc', () => new THREE.BoxGeometry(1, 1, 1));
const CYL = (top, seg) => tpl('cyl' + top + '_' + seg, () => new THREE.CylinderGeometry(top, 1, 1, seg, 1).translate(0, .5, 0));
const ICO = d => tpl('ico' + d, () => new THREE.IcosahedronGeometry(1, d));
const DOD = () => tpl('dod', () => new THREE.DodecahedronGeometry(1, 0));
const SPH = (w, h) => tpl('sph' + w + '_' + h, () => new THREE.SphereGeometry(1, w, h));
const TOR = (seg, tube, ratio, arc) => tpl(`tor${seg}_${tube}_${ratio}_${arc}`, () => new THREE.TorusGeometry(1, ratio, tube, seg, arc));
// Kiste mit Fasen (absolute Fasenbreite b), Mitte unten
export function bevelGeo(w, h, d, b) {
  b = Math.min(b, w * .45, h * .45, d * .45);
  return tpl(`bev${r3(w)}_${r3(h)}_${r3(d)}_${r3(b)}`, () => {
    const W = w / 2, D = d / 2, pts = [];
    for (const sx of [-1, 1]) for (const sy of [0, 1]) for (const sz of [-1, 1]) {
      const y0 = sy ? h : 0, yi = sy ? h - b : b;
      pts.push(new THREE.Vector3(sx * W, yi, sz * (D - b)), new THREE.Vector3(sx * (W - b), y0, sz * (D - b)), new THREE.Vector3(sx * (W - b), yi, sz * D));
    }
    return new ConvexGeometry(pts);
  });
}
// Zylinder mit Fase oben (und optional unten) als Drehkörper
function bcylGeo(b, seg, bottom) {
  return tpl(`bcyl${r3(b)}_${seg}_${bottom ? 1 : 0}`, () => {
    const p = [new THREE.Vector2(0, 0)];
    if (bottom) p.push(new THREE.Vector2(1 - b, 0), new THREE.Vector2(1, b)); else p.push(new THREE.Vector2(1, 0));
    p.push(new THREE.Vector2(1, 1 - b), new THREE.Vector2(1 - b, 1), new THREE.Vector2(0, 1));
    return new THREE.LatheGeometry(p, seg);
  });
}
// Zahnrad: Achse y, Dicke 1 (0…1), Außenradius 1
export function gearGeo(teeth = 10, hole = .3, depth = .22) {
  return tpl(`gear${teeth}_${hole}_${depth}`, () => {
    const s = new THREE.Shape(), n = teeth * 4;
    for (let i = 0; i <= n; i++) {
      const a = i / n * TAU, q = i % 4, r = q === 1 || q === 2 ? 1 : 1 - depth;
      const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y);
    }
    if (hole > 0) { const h = new THREE.Path(); h.absarc(0, 0, hole, 0, TAU, true); s.holes.push(h); }
    return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 6 }).rotateX(-PI / 2);
  });
}
// Ring (flach, mit Loch), Achse y, Höhe 0…1
export function ringGeo(seg, ri) {
  return tpl(`ring${seg}_${ri}`, () => {
    const s = new THREE.Shape(); s.absarc(0, 0, 1, 0, TAU, false); const h = new THREE.Path(); h.absarc(0, 0, ri, 0, TAU, true); s.holes.push(h);
    return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: seg }).rotateX(-PI / 2);
  });
}
// Stern (flach, Achse y, Höhe 0…1), Außenradius 1
export function starGeo(pts = 5, inner = .45) {
  return tpl(`star${pts}_${inner}`, () => {
    const s = new THREE.Shape();
    for (let i = 0; i <= pts * 2; i++) { const a = PI / 2 + i / (pts * 2) * TAU, r = i % 2 ? inner : 1; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }).rotateX(-PI / 2);
  });
}
// Giebel-Prisma: Basis x −0.5…0.5 bei y 0, First (0, 1), Tiefe z −0.5…0.5
const PRISM = () => tpl('prism', () => {
  const s = new THREE.Shape(); s.moveTo(-.5, 0); s.lineTo(.5, 0); s.lineTo(0, 1); s.lineTo(-.5, 0);
  return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }).translate(0, 0, -.5);
});
// Keil: Grundfläche 1×1 (Mitte unten), steigt von −x (Höhe 0) nach +x (Höhe 1)
const WEDGE = () => tpl('wedge', () => {
  const s = new THREE.Shape(); s.moveTo(-.5, 0); s.lineTo(.5, 0); s.lineTo(.5, 1); s.lineTo(-.5, 0);
  return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }).translate(0, 0, -.5);
});

// Warnstreifen: Streifen entlang x (Länge L, Breite w, Dicke h), schräg; liefert zwei Geometrien (gelb, schwarz)
function clipX(poly, lo, hi) {
  const clip = (P, f) => { const out = []; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a); if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } } return out; };
  return clip(clip(poly, p => p[0] - lo), p => hi - p[0]);
}
function stripeGeos(L, w, h, s) {
  const key = `str${r3(L)}_${r3(w)}_${r3(h)}_${r3(s)}`;
  if (T[key]) return T[key];
  const A = [], B = [], sk = w * .9;
  for (let i = -Math.ceil(L / s) - 2, j = 0; i * s < L / 2 + sk + s; i++, j++) {
    const x0 = i * s, poly = clipX([[x0 - sk / 2, -w / 2], [x0 + s - sk / 2, -w / 2], [x0 + s + sk / 2, w / 2], [x0 + sk / 2, w / 2]], -L / 2, L / 2);
    if (poly.length < 3) continue;
    const sh = new THREE.Shape(); poly.forEach((p, k) => k ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]));
    const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false }).rotateX(PI / 2).translate(0, h, 0);
    ((i & 1) ? B : A).push(prep(g));
  }
  return (T[key] = [A.length ? mergeGeometries(A) : null, B.length ? mergeGeometries(B) : null]);
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const ONE = new THREE.Vector3(1, 1, 1);

export class Kit {
  constructor(seed = 1) { this.L = {}; this.stack = [new THREE.Matrix4()]; this.rand = rng(seed); this.ground = 0; this.jit = .05; this.layer = 'base'; this.aoH = .55; this.parts = []; }
  get M() { return this.stack[this.stack.length - 1]; }
  R(a = 0, b = 1) { return a + (b - a) * this.rand(); }
  pick(a) { return a[Math.floor(this.rand() * a.length)]; }
  // Rahmen: Lage p, Drehung ry (oder [rx, ry, rz] in Reihenfolge YXZ), Maßstab s
  push(p = [0, 0, 0], r = 0, s = 1) {
    if (Array.isArray(r)) _e.set(r[0], r[1], r[2], 'YXZ'); else _e.set(0, r, 0);
    _q.setFromEuler(_e); _s.set(...(Array.isArray(s) ? s : [s, s, s]));
    this.stack.push(this.M.clone().multiply(new THREE.Matrix4().compose(_p.set(...p), _q.clone(), _s.clone()))); return this;
  }
  pushM(m) { this.stack.push(this.M.clone().multiply(m)); return this; }
  pop() { this.stack.pop(); return this; }
  in(p, r, fn, s = 1) { this.push(p, r, s); fn(); this.pop(); return this; }
  world(p) { return new THREE.Vector3(...p).applyMatrix4(this.M).toArray(); }

  // Grundfunktion: Vorlage + lokale Lage → Ebene. o: r (Drehung), order, layer, jit, ao (false = aus), shade (fester Faktor)
  add(geo, color, p, scale, o = {}) {
    if (!geo) return this;
    const g = geo.clone();
    _e.set(...(o.r || [0, 0, 0]), o.order || 'XYZ'); _q.setFromEuler(_e);
    _m.compose(_p.set(...p), _q, _s.set(...scale)); g.applyMatrix4(_m); g.applyMatrix4(this.M);
    const pos = g.attributes.position, n = pos.count, col = new Float32Array(n * 3);
    _c.set(color); const jit = o.jit ?? this.jit, ao = o.ao !== false, k = (1 + (this.rand() - .5) * 2 * jit) * (o.shade ?? 1);
    for (let v = 0; v < n; v++) {
      let a = 1;
      if (ao) { const y = pos.getY(v) - this.ground, t = Math.min(1, Math.max(0, y / this.aoH)); a = .66 + .34 * t * t * (3 - 2 * t); }
      col[v * 3] = _c.r * k * a; col[v * 3 + 1] = _c.g * k * a; col[v * 3 + 2] = _c.b * k * a;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (g.attributes.uv && !o.keepUv) g.deleteAttribute('uv');
    (this.L[o.layer || this.layer] ||= []).push(g); return this;
  }
  // Kiste, p = Mitte unten / Mitte
  box(c, p, s, o) { return this.add(BOX(), c, p, s, o); }
  boxc(c, p, s, o) { return this.add(BOXC(), c, p, s, o); }
  // Kiste mit Fasen (Mitte unten), b = Fasenbreite absolut
  bev(c, p, s, b = .04, o) { return this.add(bevelGeo(s[0], s[1], s[2], b), c, p, [1, 1, 1], o); }
  // Kiste mit Fasen (Mitte)
  bevc(c, p, s, b = .04, o) { return this.add(bevelGeo(s[0], s[1], s[2], b), c, [p[0], p[1] - s[1] / 2, p[2]], [1, 1, 1], o); }
  // Balken zwischen zwei Punkten (Querschnitt t)
  beam(c, a, b, t = .06, o = {}) {
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length(), mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), e = new THREE.Euler().setFromQuaternion(q);
    return this.add(BOXC(), c, mid, [o.w ?? t, L, o.d ?? t], { ...o, r: [e.x, e.y, e.z], order: e.order });
  }
  // Zylinder (Achse y, p = Mitte unten), o.top = Verhältnis oben, o.bevel = Fase (relativ), o.ax = 'x' | 'z' legt ihn hin (p = Mitte)
  cyl(c, p, r, h, seg = 10, o = {}) {
    const geo = o.bevel ? bcylGeo(o.bevel, seg, o.bevel2) : CYL(o.top ?? 1, seg);
    if (o.ax === 'x') return this.add(geo, c, [p[0] - h / 2, p[1], p[2]], [r, h, r], { ...o, r: [0, 0, -PI / 2] });
    if (o.ax === 'z') return this.add(geo, c, [p[0], p[1], p[2] - h / 2], [r, h, r], { ...o, r: [PI / 2, 0, 0] });
    return this.add(geo, c, p, [r, h, r], o);
  }
  cone(c, p, r, h, seg = 8, o = {}) { return this.add(CYL(0, seg), c, p, [r, h, r], o); }
  ball(c, p, r, o = {}) { const s = Array.isArray(r) ? r : [r, r, r]; return this.add(o.dod ? DOD() : o.smooth ? SPH(o.smooth, Math.ceil(o.smooth / 2)) : ICO(o.detail ?? 1), c, p, s, o); }
  torus(c, p, R, tube, seg = 14, o = {}) { return this.add(TOR(seg, o.tseg ?? 6, r3(tube / R), o.arc ?? TAU), c, p, [R, R, R], o); }
  ring(c, p, r, ri, h, seg = 16, o = {}) { return this.add(ringGeo(seg, r3(ri / r)), c, p, [r, h, r], o); }
  gear(c, p, r, h, teeth = 10, o = {}) { return this.add(gearGeo(teeth, o.hole ?? .3, o.depth ?? .22), c, p, [r, h, r], o); }
  star(c, p, r, h, o = {}) { return this.add(starGeo(o.points ?? 5, o.inner ?? .45), c, p, [r, h, r], o); }
  prism(c, p, w, h, d, o) { return this.add(PRISM(), c, p, [w, h, d], o); }
  wedge(c, p, w, h, d, o) { return this.add(WEDGE(), c, p, [w, h, d], o); }
  lathe(c, p, profile, seg = 12, o = {}) {
    const key = 'lathe' + seg + ':' + profile.map(q => q.map(r3).join(',')).join(';');
    return this.add(tpl(key, () => new THREE.LatheGeometry(profile.map(q => new THREE.Vector2(q[0], q[1])), seg)), c, p, [1, 1, 1], o);
  }
  // Rohr entlang Punkten mit Muffen an den Knicken
  pipe(c, pts, r = .04, o = {}) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), e = new THREE.Euler().setFromQuaternion(q);
      this.add(CYL(1, o.seg ?? 8), c, a, [r, L, r], { ...o, r: [e.x, e.y, e.z], order: e.order });
    }
    const fc = o.flange ?? c;
    for (let i = 1; i < pts.length - 1; i++) this.ball(fc, pts[i], r * 1.25, { ...o, detail: 1 });
    if (o.caps !== false) for (const i of [0, pts.length - 1]) {
      const a = pts[i], b = pts[i ? i - 1 : 1], d = new THREE.Vector3(a[0] - b[0], a[1] - b[1], a[2] - b[2]).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d), e = new THREE.Euler().setFromQuaternion(q);
      this.add(CYL(1, o.seg ?? 8), fc, [a[0] - d.x * r * .8, a[1] - d.y * r * .8, a[2] - d.z * r * .8], [r * 1.35, r * 1.2, r * 1.35], { ...o, r: [e.x, e.y, e.z], order: e.order });
    }
    return this;
  }
  // Nietenreihe von a nach b (n Stück), Kopf zeigt nach n (Normale, Standard +y)
  rivets(c, a, b, n, r = .018, o = {}) {
    for (let i = 0; i < n; i++) { const t = n === 1 ? .5 : i / (n - 1); this.ball(c, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], [r, r * .7, r], { detail: 0, layer: 'metal', ...o }); }
    return this;
  }
  // Warnstreifen (gelb/schwarz) auf einer Fläche: Mitte unten p, Länge entlang x, Breite entlang z
  stripes(p, L, w, h = .012, o = {}) {
    const [A, B] = stripeGeos(L, w, h, o.step ?? Math.max(.06, w * 1.1));
    this.add(A, o.c1 ?? 0xf2c230, p, [1, 1, 1], { ...o, jit: 0 }); this.add(B, o.c2 ?? 0x2a2622, p, [1, 1, 1], { ...o, jit: 0 }); return this;
  }
  // Fremdgeometrie übernehmen (Farbe c, wenn keine Vertex-Farben)
  raw(g, c = 0xffffff, o = {}) { return this.add(g.index ? g.toNonIndexed() : g, c, [0, 0, 0], [1, 1, 1], o); }

  // Bewegliches Teil: fn(sub) zeichnet um den Drehpunkt (0,0,0). Nach toGroup: parts[name] (Object3D, Ruhelage = Identität)
  part(name, pivot, fn, r = 0) {
    const sub = new Kit(Math.floor(this.rand() * 1e9)); sub.jit = this.jit; sub.aoH = this.aoH;
    // Bodenverdunklung im Teil relativ zur Welt-Höhe des Drehpunkts
    const wp = new THREE.Vector3(...pivot).applyMatrix4(this.M); sub.ground = this.ground - wp.y;
    fn(sub);
    if (Array.isArray(r)) _e.set(r[0], r[1], r[2], 'YXZ'); else _e.set(0, r, 0);
    const matrix = this.M.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(...pivot), new THREE.Quaternion().setFromEuler(_e), ONE));
    this.parts.push({ name, matrix, kit: sub }); return this;
  }
  // Geometrien je Ebene (zusammengeführt) + Teile als Baum (zum Zwischenspeichern)
  build() {
    const geos = {};
    for (const [k, list] of Object.entries(this.L)) if (list.length) { geos[k] = mergeGeometries(list, false); geos[k].computeBoundingSphere(); geos[k].computeBoundingBox(); }
    this.L = {};
    return { geos, parts: this.parts.map(p => ({ name: p.name, matrix: p.matrix, ...p.kit.build() })) };
  }
}

// Gebaute Vorlage → Group mit Meshes; mats: { base, metal, glow, heat, glass, gold, … } (fehlende Ebene → base)
// Gibt { group, parts: { name: Object3D } , meshes: [] } zurück. Geometrien werden geteilt (nicht kopiert).
export function instantiate(built, mats, o = {}) {
  const group = new THREE.Group(), parts = {}, meshes = [];
  const fill = (node, tree) => {
    for (const [k, g] of Object.entries(tree.geos)) {
      const m = new THREE.Mesh(g, mats[k] || mats.base); m.castShadow = o.cast !== false && k !== 'glass' && k !== 'glow'; m.receiveShadow = k !== 'glow';
      m.userData.layer = k; node.add(m); meshes.push(m);
    }
    for (const p of tree.parts) {
      const holder = new THREE.Object3D(); p.matrix.decompose(holder.position, holder.quaternion, holder.scale);
      const inner = new THREE.Object3D(); inner.name = p.name; holder.add(inner); node.add(holder);
      parts[p.name] = inner; fill(inner, p);
    }
  };
  fill(group, built);
  return { group, parts, meshes };
}

// Hilfe: Farbe heller/dunkler
export const shade = (c, k) => { _c.set(c).multiplyScalar(k); return _c.getHex(); };
export const mixc = (a, b, t) => { const x = new THREE.Color(a); x.lerp(new THREE.Color(b), t); return x.getHex(); };
