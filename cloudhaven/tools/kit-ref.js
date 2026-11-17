// REFERENZ (alte Fassung von js/kit.js, nur für tools/kitcheck.mjs): geo.clone() + 2× applyMatrix4 + mergeGeometries.
// Baukasten für Low-Poly-Modelle: sammelt Grundkörper (mit Farbe je Fläche, Wind-Gewicht, Jahreszeit-Tag und weicher
// Bodenverdunklung als Umgebungsverdeckung) und fügt sie je Ebene zu einer Geometrie zusammen (ein Draw Call je Ebene).
// Ebenen: base (alles Feste), glow (Fenster/Lampen, leuchten nachts), water (Wasserflächen), fall (Wasserfall).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './hex.js';

export const TAG = { none: 0, leaf: 1, grass: 2, crop: 3, needle: 4, flower: 5, roof: 6, room: 7, fruit: 8 };
// room: Innenraum hinter Fenstern (tags aufgehellt, nachts warm wie sein Fenster) · fruit: Obst (Blüte im Frühling, Schnee im Winter)
// Vertex-Attribut win: Zufallswert je Fenster aus k.winVal() (0 = keiner → Weltraster). Fenster/Zimmer mit gleichem win gehen gemeinsam an/aus;
// Glas vor einem Zimmer bekommt win + 1 (leuchtet dezenter, das Zimmer trägt das Licht). Zimmer markieren: k.mark({ win, tag: TAG.room }, fn).
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
  constructor(seed = 1) { this.seed = seed; this.L = {}; this.stack = [new THREE.Matrix4()]; this.rand = rng(seed); this.ground = 0; this.jit = .09; this.layer = 'base'; }
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
    g.setAttribute('win', new THREE.BufferAttribute(new Float32Array(n).fill(o.win || 0), 1));
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
    if (!g.attributes.win) g.setAttribute('win', new THREE.BufferAttribute(new Float32Array(n), 1));
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
  // Zufallswert für ein Fenster (0.02…1), eigene Folge aus dem seed → ändert die übrigen Zufallszahlen nicht
  winVal() { this._wn = (this._wn || 0) + 1; const v = Math.sin(this.seed * 12.9898 + this._wn * 78.233 + 4.17) * 43758.5453; return .02 + .98 * (v - Math.floor(v)); }
  // Alles, was fn() zeichnet, nachträglich markieren: o.win (Fenster-Wert) und/oder o.tag (nur wo noch kein Tag gesetzt ist)
  mark(o, fn) {
    const n0 = {}; for (const [k, l] of Object.entries(this.L)) n0[k] = l.length;
    fn();
    for (const [k, l] of Object.entries(this.L)) for (let i = n0[k] || 0; i < l.length; i++) {
      const g = l[i], n = g.attributes.position.count;
      if (o.win !== undefined) { if (!g.attributes.win) g.setAttribute('win', new THREE.BufferAttribute(new Float32Array(n), 1)); g.attributes.win.array.fill(o.win); }
      if (o.tag !== undefined && g.attributes.tag) { const a = g.attributes.tag.array; for (let v = 0; v < n; v++) if (!a[v]) a[v] = o.tag; }
    }
    return this;
  }
  // wie in js/kit.js: Stand merken / alle Ecken seit einem Stand (Kit-Koordinaten)
  snap() { return Object.fromEntries(Object.entries(this.L).map(([n, l]) => [n, l.length])); }
  eachPos(s, fn) { for (const [n, list] of Object.entries(this.L)) for (const g of list.slice(s[n] || 0)) { const p = g.attributes.position.array; for (let i = 0; i < p.length; i += 3) fn(p[i], p[i + 1], p[i + 2]); } }
  build() {
    const out = {};
    for (const list of Object.values(this.L)) for (const g of list) if (!g.attributes.win) g.setAttribute('win', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count), 1));
    for (const [k, list] of Object.entries(this.L)) if (list.length) { out[k] = mergeGeometries(list, false); out[k].computeBoundingSphere(); out[k].computeBoundingBox(); }
    this.L = {}; return out;
  }
  // Kleinkram (Gras, Blumen, Pilze, Farne …) in die Ebene 'detail': gleiches Material wie base, ohne Schattenwurf,
  // wird mit Abstand ausgeblendet (world.js). Ausdrücklich gesetztes o.layer (z. B. 'glow') hat Vorrang.
  detail(fn) { const l = this.layer; this.layer = 'detail'; try { fn(); } finally { this.layer = l; } return this; }
  // Wie build(), aber je Ebene grob → fein sortiert (Umriss-Größe √(längste·mittlere Kante) der Grundkörper-Box, absteigend).
  // Massen aus vielen kleinen Teilen (Laub, Getreide, Dachziegel, Obst) zählen mindestens 0,4 – sonst ändert sich von weit die Farbe.
  // geo.userData.lod = { size, end }: size[i] Größe des i-ten Körpers, end[i] Ecken bis einschließlich i → Detailstufe per drawRange.
  buildLod(skip = LOD_SKIP) {
    const info = {};
    for (const [k, list] of Object.entries(this.L)) {
      if (!list.length || skip.has(k)) continue;
      const it = list.map(g => { const a = g.attributes.position.array; let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
        for (let i = 0; i < a.length; i += 3) { const x = a[i], y = a[i + 1], z = a[i + 2]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z; }
        const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, mx = Math.max(dx, dy, dz), mid = Math.max(Math.min(dx, dy), Math.min(Math.max(dx, dy), dz));
        const tg = g.attributes.tag?.array[0] | 0, sz = Math.sqrt(mx * mid);            // ≈ Umriss-Größe (lange dünne Halme zählen mit)
        return { g, s: LOD_MASS.has(tg) ? Math.max(sz, .4) : sz, n: g.attributes.position.count }; });
      it.sort((a, b) => b.s - a.s);
      this.L[k] = it.map(e => e.g);
      const size = new Float32Array(it.length), end = new Uint32Array(it.length); let c = 0;
      it.forEach((e, i) => { c += e.n; size[i] = e.s; end[i] = c; });
      info[k] = { size, end };
    }
    const out = this.build();
    for (const [k, g] of Object.entries(out)) if (info[k]) g.userData.lod = info[k];
    return out;
  }
}
const LOD_SKIP = new Set(['glass', 'water', 'fall']);   // durchsichtige Ebenen: Reihenfolge bleibt
const LOD_MASS = new Set([TAG.leaf, TAG.crop, TAG.roof, TAG.fruit ?? 8]);
