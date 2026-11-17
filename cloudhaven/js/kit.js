// Baukasten für Low-Poly-Modelle: sammelt Grundkörper (mit Farbe je Fläche, Wind-Gewicht, Jahreszeit-Tag und weicher
// Bodenverdunklung als Umgebungsverdeckung) und fügt sie je Ebene zu einer Geometrie zusammen (ein Draw Call je Ebene).
// Ebenen: base (alles Feste), glow (Fenster/Lampen, leuchten nachts), water (Wasserflächen), fall (Wasserfall).
import * as THREE from 'three';
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
const _n3 = new THREE.Matrix3(), _n4 = new THREE.Matrix3(), _be = new THREE.Euler(), _Y = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3(), _bq = new THREE.Quaternion();

// Ebenen-Puffer: wachsende Float32Arrays (Ecken nacheinander, nicht indiziert) + Körper-Liste (Start-Ecke, Umriss-Größe).
// Nach build() gehen die Puffer in einen kleinen Vorrat zurück (weniger Speicher-Wirbel beim Bauen vieler Kacheln).
class Buf {
  constructor() { this.cap = 0; this.n = 0; this.nb = 0; this.bcap = 0; this.uv = null; this._grow(4096); this._growB(256); }
  _grow(need) {
    const cap = Math.max(need, this.cap * 2), n = this.n, a = (old, k) => { const x = new Float32Array(cap * k); if (old) x.set(old.subarray(0, n * k)); return x; };
    this.P = a(this.P, 3); this.N = a(this.N, 3); this.C = a(this.C, 3); this.S = a(this.S, 1); this.G = a(this.G, 1); this.W = a(this.W, 1);
    if (this.uv) this.uv = a(this.uv, 2);
    this.cap = cap;
  }
  _growB(need) {
    const cap = Math.max(need, this.bcap * 2), st = new Uint32Array(cap), sz = new Float64Array(cap);
    if (this.B0) { st.set(this.B0.subarray(0, this.nb)); sz.set(this.BS.subarray(0, this.nb)); }
    this.B0 = st; this.BS = sz; this.bcap = cap;
  }
  // Platz für n Ecken eines neuen Körpers; gibt die erste Ecke zurück
  begin(n) {
    if (this.n + n > this.cap) this._grow(this.n + n);
    if (this.nb >= this.bcap) this._growB(this.nb + 1);
    this.B0[this.nb] = this.n; return this.n;
  }
  // Körper abschließen: Umriss-Größe √(längste·mittlere Kante) der Box (wie bisher in buildLod)
  end(n, x0, y0, z0, x1, y1, z1) {
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, mx = Math.max(dx, dy, dz), mid = Math.max(Math.min(dx, dy), Math.min(Math.max(dx, dy), dz));
    this.BS[this.nb++] = Math.sqrt(mx * mid); this.n += n;
  }
  needUv() { if (!this.uv) this.uv = new Float32Array(this.cap * 2); }
  reset() { this.n = 0; this.nb = 0; this.uv = null; }
  // Geometrie in der Reihenfolge order (Körper-Indizes) oder unverändert
  geometry(order) {
    const n = this.n, g = new THREE.BufferGeometry(), defs = [['position', this.P, 3], ['normal', this.N, 3], ['color', this.C, 3], ['sway', this.S, 1], ['tag', this.G, 1], ['win', this.W, 1]];
    if (this.uv) defs.push(['uv', this.uv, 2]);
    for (const [name, src, k] of defs) {
      let a;
      if (!order) a = src.slice(0, n * k);
      else { a = new Float32Array(n * k); let o = 0; for (const b of order) { const s = this.B0[b], e = b + 1 < this.nb ? this.B0[b + 1] : n; a.set(src.subarray(s * k, e * k), o); o += (e - s) * k; } }
      g.setAttribute(name, new THREE.BufferAttribute(a, k));
    }
    // Hüllen direkt (gleich wie computeBoundingBox/-Sphere)
    const P = g.attributes.position.array; let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (let i = 0; i < P.length; i += 3) { const x = P[i], y = P[i + 1], z = P[i + 2]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z; }
    g.boundingBox = new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2; let r2 = 0;
    for (let i = 0; i < P.length; i += 3) { const dx = P[i] - cx, dy = P[i + 1] - cy, dz = P[i + 2] - cz, d = dx * dx + dy * dy + dz * dz; if (d > r2) r2 = d; }
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, cy, cz), Math.sqrt(r2));
    return g;
  }
}
const POOL = [];
const takeBuf = () => POOL.pop() || new Buf();
const giveBuf = b => { b.reset(); if (POOL.length < 12 && b.cap <= 1 << 20) POOL.push(b); };

export class Kit {
  constructor(seed = 1) { this.seed = seed; this.L = {}; this.stack = [new THREE.Matrix4()]; this.rand = rng(seed); this.ground = 0; this.jit = .09; this.layer = 'base'; }
  get M() { return this.stack[this.stack.length - 1]; }
  R(a = 0, b = 1) { return a + (b - a) * this.rand(); }
  pick(a) { return a[Math.floor(this.rand() * a.length)]; }
  push(p = [0, 0, 0], ry = 0, s = 1) {
    _e.set(0, ry, 0); _q.setFromEuler(_e); _s.set(...(Array.isArray(s) ? s : [s, s, s]));
    this.stack.push(this.M.clone().multiply(_m.compose(_p.set(...p), _q, _s))); return this;
  }
  pushM(m) { this.stack.push(this.M.clone().multiply(m)); return this; }
  pop() { this.stack.pop(); return this; }
  in(p, ry, fn, s = 1) { this.push(p, ry, s); fn(); this.pop(); return this; }
  _buf(layer) { return this.L[layer] ||= takeBuf(); }

  // Grundfunktion: Vorlage + lokale Lage → Ebene. Ecken werden ohne clone direkt in den Ebenen-Puffer geschrieben;
  // gerechnet wie früher (erst lokal, auf float32 gerundet, dann M; Normalen je Schritt normiert) → bitgleiches Ergebnis.
  add(geo, color, p, scale, o = {}) {
    _e.set(...(o.r || [0, 0, 0]), o.order || 'XYZ'); _q.setFromEuler(_e);
    return this._add(geo, color, p, scale, o, _q);
  }
  _add(geo, color, p, scale, o, q) {
    _m.compose(_p.set(p[0], p[1], p[2]), q, _s.set(scale[0], scale[1], scale[2]));
    _n3.getNormalMatrix(_m); _n4.getNormalMatrix(this.M);
    const sp = geo.attributes.position.array, sn = geo.attributes.normal.array, n = sp.length / 3;
    const B = this._buf(o.layer || this.layer), v0 = B.begin(n), P = B.P, N = B.N, C = B.C, S = B.S, G = B.G, W = B.W;
    const e = _m.elements, f = this.M.elements, m = _n3.elements, h = _n4.elements, fr = Math.fround;
    let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
    for (let i = 0, j = v0 * 3; i < n * 3; i += 3, j += 3) {
      let x = sp[i], y = sp[i + 1], z = sp[i + 2];
      let X = fr(e[0] * x + e[4] * y + e[8] * z + e[12]), Y = fr(e[1] * x + e[5] * y + e[9] * z + e[13]), Z = fr(e[2] * x + e[6] * y + e[10] * z + e[14]);
      x = fr(f[0] * X + f[4] * Y + f[8] * Z + f[12]); y = fr(f[1] * X + f[5] * Y + f[9] * Z + f[13]); z = fr(f[2] * X + f[6] * Y + f[10] * Z + f[14]);
      P[j] = x; P[j + 1] = y; P[j + 2] = z;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z;
      x = sn[i]; y = sn[i + 1]; z = sn[i + 2];
      X = m[0] * x + m[3] * y + m[6] * z; Y = m[1] * x + m[4] * y + m[7] * z; Z = m[2] * x + m[5] * y + m[8] * z;
      let il = 1 / (Math.sqrt(X * X + Y * Y + Z * Z) || 1); X = fr(X * il); Y = fr(Y * il); Z = fr(Z * il);
      x = h[0] * X + h[3] * Y + h[6] * Z; y = h[1] * X + h[4] * Y + h[7] * Z; z = h[2] * X + h[5] * Y + h[8] * Z;
      il = 1 / (Math.sqrt(x * x + y * y + z * z) || 1); N[j] = x * il; N[j + 1] = y * il; N[j + 2] = z * il;
    }
    _c.set(color); const jit = o.jit ?? this.jit, ao = o.ao !== false, sw = o.sway || 0, tg = o.tag || 0, swb = o.swayBase ?? this.ground, gr = this.ground, wv = o.win || 0;
    const swN = typeof sw === 'number', swk = swN ? 0 : sw.k, cr = _c.r, cg = _c.g, cb = _c.b;
    for (let f = 0; f < n; f += 3) {
      const k = 1 + (this.rand() - .5) * 2 * jit;
      for (let v = f; v < f + 3 && v < n; v++) {
        const w = v0 + v, Yv = P[w * 3 + 1]; let a = 1;
        if (ao) { const t = Math.min(1, Math.max(0, (Yv - gr) / .9)); a = .6 + .4 * t * t * (3 - 2 * t); }
        C[w * 3] = cr * k * a; C[w * 3 + 1] = cg * k * a; C[w * 3 + 2] = cb * k * a;
        S[w] = swN ? sw : Math.max(0, (Yv - swb) * swk); G[w] = tg; W[w] = wv;
      }
    }
    if (B.uv) B.uv.fill(0, v0 * 2, (v0 + n) * 2);
    B.end(n, x0, y0, z0, x1, y1, z1); return this;
  }
  // Kiste: p = Mitte unten
  box(c, p, s, o) { return this.add(BOX(), c, p, s, o); }
  // Kiste: p = Mitte
  boxc(c, p, s, o) { return this.add(BOXC(), c, p, s, o); }
  // Balken zwischen zwei Punkten (Querschnitt t)
  beam(c, a, b, t = .1, o = {}) {
    _d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const L = _d.length(), mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    _bq.setFromUnitVectors(_Y, _d.normalize()); _be.setFromQuaternion(_bq); _e.set(_be.x, _be.y, _be.z, _be.order); _q.setFromEuler(_e);   // über Euler wie früher
    return this._add(BOXC(), c, mid, [o.w ?? t, L, o.d ?? t], o, _q);
  }
  cyl(c, p, r, h, seg = 8, o = {}) { const top = o.top ?? 1; return this.add(CYL(top, seg), c, p, [r, h, r], o); }
  cone(c, p, r, h, seg = 7, o = {}) { return this.add(CYL(0, seg), c, p, [r, h, r], o); }
  ball(c, p, r, o = {}) { const s = Array.isArray(r) ? r : [r, r, r]; return this.add(o.dod ? DOD() : ICO(o.detail ?? 0), c, p, s, o); }
  prism(c, p, w, h, d, o) { return this.add(PRISM(), c, p, [w, h, d], o); }
  // Fertige Geometrie (Gelände, Wasser, Wasserfall …) mit M in die Ebene; fehlende Attribute: Farbe weiß, sway/tag/win 0,
  // Normalen flach aus den Dreiecken. uv nur mit keepUv.
  raw(g, layer = 'base', keepUv = false) {
    if (g.index) g = g.toNonIndexed();
    const A = g.attributes, n = A.position.count, B = this._buf(layer), v0 = B.begin(n);
    if (keepUv && A.uv) B.needUv();
    const M = this.M, e = M.elements, id = M.equals(_ID), sp = A.position.array, P = B.P, N = B.N;
    let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
    for (let i = 0, j = v0 * 3; i < n * 3; i += 3, j += 3) {
      const x = sp[i], y = sp[i + 1], z = sp[i + 2];
      const X = id ? x : Math.fround(e[0] * x + e[4] * y + e[8] * z + e[12]), Y = id ? y : Math.fround(e[1] * x + e[5] * y + e[9] * z + e[13]), Z = id ? z : Math.fround(e[2] * x + e[6] * y + e[10] * z + e[14]);
      P[j] = X; P[j + 1] = Y; P[j + 2] = Z;
      if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; if (Z < z0) z0 = Z; if (Z > z1) z1 = Z;
    }
    if (A.normal) {
      _n3.getNormalMatrix(M); const m = _n3.elements, sn = A.normal.array;
      for (let i = 0, j = v0 * 3; i < n * 3; i += 3, j += 3) { const a = sn[i], b = sn[i + 1], c = sn[i + 2];
        const nx = m[0] * a + m[3] * b + m[6] * c, ny = m[1] * a + m[4] * b + m[7] * c, nz = m[2] * a + m[5] * b + m[8] * c, il = 1 / (Math.sqrt(nx * nx + ny * ny + nz * nz) || 1);
        N[j] = nx * il; N[j + 1] = ny * il; N[j + 2] = nz * il; }
    } else for (let j = v0 * 3; j < (v0 + n) * 3; j += 9) {       // wie computeVertexNormals (nicht indiziert): (C−B)×(A−B), float32, dann normiert
      const ux = P[j + 6] - P[j + 3], uy = P[j + 7] - P[j + 4], uz = P[j + 8] - P[j + 5], vx = P[j] - P[j + 3], vy = P[j + 1] - P[j + 4], vz = P[j + 2] - P[j + 5], fr = Math.fround;
      const cx = fr(uy * vz - uz * vy), cy = fr(uz * vx - ux * vz), cz = fr(ux * vy - uy * vx), il = 1 / (Math.sqrt(cx * cx + cy * cy + cz * cz) || 1);
      for (let q = 0; q < 9; q += 3) { N[j + q] = cx * il; N[j + q + 1] = cy * il; N[j + q + 2] = cz * il; }
    }
    const cp = (att, dst, k, def) => { if (att) dst.set(att.array.subarray(0, n * k), v0 * k); else dst.fill(def, v0 * k, (v0 + n) * k); };
    cp(A.color, B.C, 3, 1); cp(A.sway, B.S, 1, 0); cp(A.tag, B.G, 1, 0); cp(A.win, B.W, 1, 0);
    if (B.uv) { if (keepUv && A.uv) B.uv.set(A.uv.array.subarray(0, n * 2), v0 * 2); else B.uv.fill(0, v0 * 2, (v0 + n) * 2); }
    B.end(n, x0, y0, z0, x1, y1, z1); return this;
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
  // Stand merken (Ecken je Ebene) · alle Ecken seit einem Stand in Kit-Koordinaten: fn(x, y, z)
  snap() { const s = {}; for (const [k, B] of Object.entries(this.L)) s[k] = B.n; return s; }
  eachPos(s, fn) { for (const [k, B] of Object.entries(this.L)) { const P = B.P; for (let i = (s[k] || 0) * 3; i < B.n * 3; i += 3) fn(P[i], P[i + 1], P[i + 2]); } }
  // Alles, was fn() zeichnet, nachträglich markieren: o.win (Fenster-Wert) und/oder o.tag (nur wo noch kein Tag gesetzt ist)
  mark(o, fn) {
    const n0 = this.snap();
    fn();
    for (const [k, B] of Object.entries(this.L)) for (let v = n0[k] || 0; v < B.n; v++) {
      if (o.win !== undefined) B.W[v] = o.win;
      if (o.tag !== undefined && !B.G[v]) B.G[v] = o.tag;
    }
    return this;
  }
  build(orders = {}) {
    const out = {};
    for (const [k, B] of Object.entries(this.L)) { if (B.nb) out[k] = B.geometry(orders[k]); giveBuf(B); }
    this.L = {}; return out;
  }
  // Kleinkram (Gras, Blumen, Pilze, Farne …) in die Ebene 'detail': gleiches Material wie base, ohne Schattenwurf,
  // wird mit Abstand ausgeblendet (world.js). Ausdrücklich gesetztes o.layer (z. B. 'glow') hat Vorrang.
  detail(fn) { const l = this.layer; this.layer = 'detail'; try { fn(); } finally { this.layer = l; } return this; }
  // Wie build(), aber je Ebene grob → fein sortiert (Umriss-Größe √(längste·mittlere Kante) der Grundkörper-Box, absteigend).
  // Massen aus vielen kleinen Teilen (Laub, Getreide, Dachziegel, Obst) zählen mindestens 0,4 – sonst ändert sich von weit die Farbe.
  // geo.userData.lod = { size, end }: size[i] Größe des i-ten Körpers, end[i] Ecken bis einschließlich i → Detailstufe per drawRange.
  buildLod(skip = LOD_SKIP) {
    const info = {}, orders = {};
    for (const [k, B] of Object.entries(this.L)) {
      if (!B.nb || skip.has(k)) continue;
      const nb = B.nb, s = new Float64Array(nb), idx = new Array(nb);
      for (let i = 0; i < nb; i++) { idx[i] = i; const sz = B.BS[i]; s[i] = LOD_MASS.has(B.G[B.B0[i]] | 0) ? Math.max(sz, .4) : sz; }
      idx.sort((a, b) => s[b] - s[a]);
      const size = new Float32Array(nb), end = new Uint32Array(nb); let c = 0;
      for (let i = 0; i < nb; i++) { const b = idx[i]; c += (b + 1 < nb ? B.B0[b + 1] : B.n) - B.B0[b]; size[i] = s[b]; end[i] = c; }
      info[k] = { size, end }; orders[k] = idx;
    }
    const out = this.build(orders);
    for (const [k, g] of Object.entries(out)) if (info[k]) g.userData.lod = info[k];
    return out;
  }
}
const _ID = new THREE.Matrix4();
const LOD_SKIP = new Set(['glass', 'water', 'fall']);   // durchsichtige Ebenen: Reihenfolge bleibt
const LOD_MASS = new Set([TAG.leaf, TAG.crop, TAG.roof, TAG.fruit ?? 8]);
