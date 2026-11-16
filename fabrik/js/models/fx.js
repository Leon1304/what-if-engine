// Cogtopia – Effekte: Münzen, Funken, Rauch, Konfetti, Bau-Staub, Abriss-Puff, Kiste öffnen, Goldglitzern, schwebende Texte.
// Partikel je Art in einem InstancedMesh (feste Kapazität, Ringpuffer: das älteste Teilchen wird überschrieben).
// Texte sind Sprites aus einem Pool; der Text kommt immer von außen (mehrsprachig), Zahlen über opts.format.
import * as THREE from 'three';
import { Kit, instantiate, bevelGeo, starGeo, PI, TAU } from '../kit.js';
import { MATS, makeGoldMat } from '../materials.js';

const R = (a, b) => a + Math.random() * (b - a);
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const sst = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const CONF = [0xff5a5a, 0xffc23a, 0x4ad48a, 0x4aa8ff, 0xb070ff, 0xff8ad0, 0xffffff, 0xff8a2a];

// ---------- Materialien ----------
// Halbdurchsichtige Wölkchen mit Deckkraft je Instanz (Attribut aAlpha)
function puffMat() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, flatShading: true, transparent: true, depthWrite: false });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aAlpha; varying float vAlpha;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlpha = aAlpha;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vAlpha;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vAlpha;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * .18;');
  };
  m.customProgramCacheKey = () => 'fxpuff1'; return m;
}
// Leuchtende Teilchen (Funken, Sterne, Strahlen), additiv mit Deckkraft je Instanz
function glowMat(additive, gain = 1.4, alpha = 1) {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1), transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide, fog: false });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aAlpha; varying float vAlpha;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlpha = aAlpha;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vAlpha;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= ' + gain.toFixed(2) + '; diffuseColor.a *= vAlpha * ' + alpha.toFixed(2) + ';');
  };
  m.customProgramCacheKey = () => 'fxglow' + (additive ? 'a' : 'n') + gain + '_' + alpha; return m;
}

// ---------- Geometrien ----------
function coinGeo() {
  const k = new Kit(9); k.aoH = 1e-3;
  k.cyl(0xffffff, [0, -.008, 0], .055, .016, 14, { bevel: .2, bevel2: true, ao: false, jit: 0 });
  k.cyl(0xd8c890, [0, .0075, 0], .034, .002, 14, { ao: false, jit: 0 });        // Prägung oben/unten
  k.cyl(0xd8c890, [0, -.0095, 0], .034, .002, 14, { ao: false, jit: 0 });
  return k.build().geos.base;
}
const unitGeo = (g) => { g = g.index ? g.toNonIndexed() : g; g.computeVertexNormals(); return g; };

// ---------- Teilchen-Art ----------
// Felder je Teilchen: Lage p, Geschwindigkeit v, Alter, Lebensdauer, Größe s0/s1, Drehachse + Drehrate, Schwerkraft, Luftwiderstand,
// Verhalten (Bit-Flags), Farbe
const F_BOUNCE = 1, F_FLUTTER = 2, F_GROW = 4, F_STREAK = 8, F_FACE = 16, F_POPIN = 32, F_LAND = 64;
class Kind {
  constructor(scene, geo, mat, cap, o = {}) {
    this.cap = cap; this.alpha = !!o.alpha;
    if (this.alpha) geo.setAttribute('aAlpha', new THREE.InstancedBufferAttribute(new Float32Array(cap), 1));
    this.mesh = new THREE.InstancedMesh(geo, mat, cap); this.mesh.count = 0; this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3); this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = !!o.shadow; this.mesh.receiveShadow = false; this.mesh.renderOrder = o.order ?? 0;
    const n = cap;
    this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.ax = new Float32Array(n * 3);
    this.age = new Float32Array(n); this.life = new Float32Array(n).fill(-1); this.s0 = new Float32Array(n); this.s1 = new Float32Array(n);
    this.spin = new Float32Array(n); this.rot0 = new Float32Array(n); this.g = new Float32Array(n); this.drag = new Float32Array(n);
    this.fl = new Uint8Array(n); this.col = new Float32Array(n * 3); this.ph = new Float32Array(n); this.fade = new Float32Array(n); this.stretch = new Float32Array(n);
    this.head = 0; this.alive = 0;
    scene.add(this.mesh);
  }
  spawn(p, v, o) {
    const i = this.head; this.head = (this.head + 1) % this.cap;
    if (this.life[i] < 0) this.alive++;
    this.p.set(p, i * 3); this.v.set(v, i * 3);
    const ax = o.axis || [R(-1, 1), R(-1, 1), R(-1, 1)], L = Math.hypot(ax[0], ax[1], ax[2]) || 1;
    this.ax[i * 3] = ax[0] / L; this.ax[i * 3 + 1] = ax[1] / L; this.ax[i * 3 + 2] = ax[2] / L;
    this.age[i] = -(o.delay || 0); this.life[i] = o.life ?? 1; this.s0[i] = o.size ?? 1; this.s1[i] = o.size1 ?? o.size ?? 1;
    this.spin[i] = o.spin ?? 0; this.rot0[i] = o.rot ?? R(0, TAU); this.g[i] = o.g ?? 0; this.drag[i] = o.drag ?? 0;
    this.fl[i] = o.flags || 0; this.ph[i] = R(0, TAU); this.fade[i] = o.fade ?? .3; this.stretch[i] = o.stretch ?? 1;
    const c = (this._c ||= new THREE.Color()).set(o.color ?? 0xffffff); if (o.bright) c.multiplyScalar(o.bright);
    this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
  }
  update(dt, camQ) {
    const M = this.mesh, arr = M.instanceMatrix.array, ca = M.instanceColor.array, aa = this.alpha ? M.geometry.attributes.aAlpha.array : null;
    const m = _m, q = _q, q2 = _q2, pos = _p, sc = _s, ax = _a; let n = 0;
    for (let i = 0; i < this.cap; i++) {
      if (this.life[i] < 0) continue;
      this.age[i] += dt; const age = this.age[i], life = this.life[i];
      if (age >= life) { this.life[i] = -1; this.alive--; continue; }
      if (age < 0) continue;                                                   // verzögert
      const j = i * 3, fl = this.fl[i], P = this.p, V = this.v;
      // Bewegung
      const dr = Math.exp(-this.drag[i] * dt);
      V[j] *= dr; V[j + 2] *= dr; V[j + 1] = V[j + 1] * dr - this.g[i] * dt;
      if (fl & F_FLUTTER) { const w = this.ph[i] + age * 5.5; V[j] += Math.sin(w) * 2.2 * dt; V[j + 2] += Math.cos(w * .8) * 2.2 * dt; if (V[j + 1] < -.45) V[j + 1] = -.45; }
      P[j] += V[j] * dt; P[j + 1] += V[j + 1] * dt; P[j + 2] += V[j + 2] * dt;
      if (P[j + 1] < .004 && (fl & (F_BOUNCE | F_LAND))) {
        P[j + 1] = .004;
        if (fl & F_BOUNCE && V[j + 1] < -.3) { V[j + 1] *= -.32; V[j] *= .6; V[j + 2] *= .6; this.spin[i] *= .5; }
        else { V[j] = V[j + 1] = V[j + 2] = 0; this.spin[i] = 0; }
      }
      // Größe: ein-/ausblenden
      const u = age / life; let s = this.s0[i] + (this.s1[i] - this.s0[i]) * ((fl & F_GROW) ? 1 - (1 - u) * (1 - u) : u);
      const out = 1 - sst(1 - this.fade[i], 1, u);
      if (fl & F_POPIN) s *= sst(0, .08, age) * (1 + .25 * Math.sin(clamp(age / .25) * PI));
      if (!this.alpha) s *= out;
      // Drehung
      if (fl & F_STREAK) {                                                     // längs zur Geschwindigkeit
        pos.set(V[j], V[j + 1], V[j + 2]); const sp = pos.length(); if (sp > 1e-4) q.setFromUnitVectors(_Y, pos.multiplyScalar(1 / sp)); else q.identity();
        sc.set(s, s * (1 + sp * .09 * this.stretch[i]), s);
      } else {
        ax.set(this.ax[j], this.ax[j + 1], this.ax[j + 2]); q.setFromAxisAngle(ax, this.rot0[i] + this.spin[i] * age);
        if ((fl & F_FACE) && camQ) { q2.copy(camQ).multiply(_toFace); q.premultiply(_I).multiplyQuaternions(q2, _zq.setFromAxisAngle(_Y, this.rot0[i] + this.spin[i] * age)); }
        sc.set(s, s * this.stretch[i], s);
      }
      if (fl & F_LAND && P[j + 1] <= .0041) { q.setFromAxisAngle(_Y, this.rot0[i]); }  // liegt flach
      pos.set(P[j], P[j + 1], P[j + 2]); m.compose(pos, q, sc); m.toArray(arr, n * 16);
      ca[n * 3] = this.col[j]; ca[n * 3 + 1] = this.col[j + 1]; ca[n * 3 + 2] = this.col[j + 2];
      if (aa) aa[n] = out * (fl & F_POPIN ? sst(0, .06, age) : 1) * (this._alphaK ?? 1);
      n++;
    }
    M.count = n; M.instanceMatrix.needsUpdate = true; M.instanceColor.needsUpdate = true;
    if (aa) M.geometry.attributes.aAlpha.needsUpdate = true;
    M.visible = n > 0;
  }
  clear() { this.life.fill(-1); this.alive = 0; this.mesh.count = 0; }
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _zq = new THREE.Quaternion(), _I = new THREE.Quaternion();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _a = new THREE.Vector3(), _Y = new THREE.Vector3(0, 1, 0);
const _toFace = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), PI / 2);   // +y der Form → zur Kamera (+z der Kamera)

// ---------- Text-Sprites ----------
const FONT = '900 64px "Fredoka", "Nunito", "Baloo 2", "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';
function textTexture(text, color, outline) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = FONT; const w = Math.ceil(g.measureText(text).width) + 40, h = 96;
  c.width = w; c.height = h; g.font = FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineWidth = 14; g.strokeStyle = outline; g.strokeText(text, w / 2, h / 2 + 3);
  const gr = g.createLinearGradient(0, h * .2, 0, h * .8); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.35, color); gr.addColorStop(1, color);
  g.fillStyle = gr; g.fillText(text, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData.aspect = w / h; return t;
}

// ---------- Kiste (für crateOpen) ----------
let CRATE;
function crateBuilt() {
  if (CRATE) return CRATE;
  const k = new Kit(77); k.aoH = .1;
  const W = 0xc08a4a, Wd = 0x9a6a36, Wl = 0xd6a462, Mt = 0x7a8088, Gd = 0xffc23a;
  k.bev(W, [0, 0, 0], [.34, .24, .34], .02);
  for (const y of [.03, .1, .17]) for (const s of [-1, 1]) { k.bev(Wl, [s * .171, y, 0], [.006, .055, .3], .004); k.bev(Wl, [0, y, s * .171], [.3, .055, .006], .004); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.bev(Mt, [sx * .162, 0, sz * .162], [.035, .245, .035], .008, { layer: 'metal' });
  k.bev(Wd, [0, .225, 0], [.3, .02, .3], .006);                            // Innenrand (dunkel)
  k.part('lid', [-.17, .24, 0], l => {                                      // Scharnier hinten (−x)
    l.bev(W, [.17, 0, 0], [.36, .05, .36], .018);
    for (const z of [-.09, 0, .09]) l.bev(Wl, [.17, .05, z], [.32, .008, .07], .004);
    l.bev(Mt, [.34, -.02, 0], [.03, .06, .08], .008, { layer: 'metal' });  // Schloss
    l.star(Gd, [.17, .056, 0], .07, .012, { layer: 'gold' });              // Stern-Symbol
  });
  k.ball(0xfff2b0, [0, .2, 0], [.12, .03, .12], { layer: 'glow', detail: 1 });   // Leuchten im Inneren
  return (CRATE = k.build());
}

// =====================================================================================================================
export class Fx {
  constructor(scene, { max = 3000, format = n => String(n), camera = null } = {}) {
    this.scene = scene; this.format = format; this.camera = camera; this.max = max;
    const root = this.root = new THREE.Group(); root.name = 'fx'; scene.add(root);
    const cap = f => Math.max(32, Math.floor(max * f));
    this.goldCoinMat = makeGoldMat({ color: 0xffffff, vertexColors: true });
    this.coinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .3, metalness: .85, flatShading: true, envMapIntensity: 1.3, vertexColors: true });
    const cube = unitGeo(bevelGeo(1, 1, 1, .18).clone().translate(0, -.5, 0));
    this.K = {
      coin: new Kind(root, coinGeo(), this.coinMat, cap(.26), { shadow: true }),
      gcoin: new Kind(root, coinGeo(), this.goldCoinMat, cap(.06), { shadow: true }),
      flake: new Kind(root, unitGeo(new THREE.BoxGeometry(1, .08, .62)), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .6, side: THREE.DoubleSide, flatShading: true }), cap(.22)),
      cube: new Kind(root, cube, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .8, flatShading: true }), cap(.07), { shadow: true }),
      puff: new Kind(root, unitGeo(new THREE.IcosahedronGeometry(1, 1)), puffMat(), cap(.2), { alpha: true, order: 2 }),
      spark: new Kind(root, unitGeo(new THREE.BoxGeometry(.3, 1, .3)), glowMat(false, 1.6), cap(.12), { alpha: true, order: 3 }),
      star: new Kind(root, unitGeo(starGeo(5, .42).clone().translate(0, -.5, 0).scale(1, .12, 1)), glowMat(false, 1.35), cap(.06), { alpha: true, order: 3 }),
      ray: new Kind(root, unitGeo(new THREE.CylinderGeometry(.0, 1, 1, 4, 1, true).translate(0, -.5, 0).rotateX(PI)), glowMat(true, .55, .5), 48, { alpha: true, order: 1 }),
    };
    // Text-Sprites
    this.tex = new Map(); this.sprites = []; this.spriteHead = 0; this.spriteCap = 140;
    // Kisten-Pool
    this.crates = [];
  }
  get count() { let n = 0; for (const k of Object.values(this.K)) n += k.alive; return n + this.sprites.filter(s => s.visible).length + this.crates.filter(c => c.group.visible).length; }

  // ---------------- Münzen ----------------
  coins(pos, n = 5, { gold = false, text = null, color } = {}) {
    const K = gold ? this.K.gcoin : this.K.coin;
    const cnt = Math.min(n, gold ? 30 : 16);
    for (let i = 0; i < cnt; i++) {
      const a = R(0, TAU), sp = R(.25, .7) * (gold ? 1.4 : 1);
      K.spawn([pos[0] + R(-.05, .05), pos[1] + R(0, .06), pos[2] + R(-.05, .05)], [Math.cos(a) * sp, R(2.1, 3.1) * (gold ? 1.15 : 1), Math.sin(a) * sp],
        { life: R(.75, 1.05) * (gold ? 1.3 : 1), size: gold ? 1.3 : 1, g: 7.5, spin: R(9, 16), axis: [R(-.3, .3), 0, 1], delay: i * .025, fade: .25, color: color ?? (gold ? 0xffd860 : 0xffc23c), flags: F_POPIN });
    }
    if (gold) { this.sparkle([pos[0], pos[1] + .35, pos[2]], 14); this.K.star && this.sparks(pos, 10, 0xffe27a); }
    if (text !== null && text !== undefined && text !== '') this.popText(typeof text === 'number' ? '+' + this.format(text) : String(text), [pos[0], pos[1] + .45, pos[2]], { color: gold ? '#ffe45c' : '#ffd84a', size: gold ? 1.35 : 1 });
  }

  // ---------------- schwebender Text ----------------
  popText(text, pos, { color = '#ffd84a', size = 1, rise = .8, life = 1.4, outline = '#4a2a10' } = {}) {
    text = String(text); const key = text + '|' + color + '|' + outline;
    let t = this.tex.get(key);
    if (!t) { t = textTexture(text, color, outline); this.tex.set(key, t); if (this.tex.size > 160) { const [k0, t0] = this.tex.entries().next().value; if (!this.sprites.some(s => s.material.map === t0)) t0.dispose(); this.tex.delete(k0); } }
    else { this.tex.delete(key); this.tex.set(key, t); }
    let s;
    if (this.sprites.length < this.spriteCap) {
      s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false, fog: false }));
      s.renderOrder = 20; this.root.add(s); this.sprites.push(s);
    } else { s = this.sprites[this.spriteHead]; this.spriteHead = (this.spriteHead + 1) % this.spriteCap; }
    s.material.map = t; s.material.needsUpdate = true; s.visible = true;
    const h = .26 * size; s.userData = { p0: [...pos], age: 0, life, rise, h, aspect: t.userData.aspect, wob: R(-.4, .4) };
    s.center.set(.5, 0); s.scale.set(h * t.userData.aspect, h, 1); s.position.set(...pos);
  }

  // ---------------- Funken ----------------
  sparks(pos, n = 12, color = 0xffb040) {
    for (let i = 0; i < n; i++) {
      const a = R(0, TAU), up = R(.6, 1.6), sp = R(.6, 1.6);
      this.K.spark.spawn([pos[0], pos[1], pos[2]], [Math.cos(a) * sp, up, Math.sin(a) * sp], { life: R(.3, .6), size: R(.024, .038), g: 5, drag: 1.5, flags: F_STREAK, color, stretch: 1.3, fade: .5 });
    }
  }
  // ---------------- Rauch ----------------
  smoke(pos, { n = 6, dark = false, size = 1 } = {}) {
    for (let i = 0; i < n; i++) {
      const c = dark ? [0x4a4646, 0x5a5654, 0x3e3a3a][i % 3] : [0xf0eeea, 0xe2e0dc, 0xd6d4d2][i % 3];
      this.K.puff.spawn([pos[0] + R(-.04, .04) * size, pos[1] + R(0, .05), pos[2] + R(-.04, .04) * size], [R(-.06, .06), R(.35, .6) * size, R(-.06, .06)],
        { life: R(1.4, 2.2), size: .045 * size, size1: R(.14, .2) * size, flags: F_GROW, drag: .6, g: -.05, spin: R(-.6, .6), delay: i * .09, color: c, fade: .6 });
    }
  }
  // ---------------- Konfetti ----------------
  confetti(pos, n = 80) {
    for (let i = 0; i < n; i++) {
      const a = R(0, TAU), sp = R(.4, 1.8);
      this.K.flake.spawn([pos[0], pos[1], pos[2]], [Math.cos(a) * sp, R(2.4, 4.2), Math.sin(a) * sp],
        { life: R(2.6, 3.8), size: R(.035, .05), g: 4.5, drag: 1.9, spin: R(6, 14), flags: F_FLUTTER | F_LAND, color: CONF[i % CONF.length], fade: .2, delay: R(0, .08) });
    }
    this.sparkle([pos[0], pos[1] + .6, pos[2]], 10);
  }
  // ---------------- Bau-Staub: Ring aus Wölkchen um die Grundfläche ----------------
  dust(pos, size = 2) {
    const n = Math.round(10 + size * 6), h = size / 2;
    for (let i = 0; i < n; i++) {
      const u = i / n * 4, side = Math.floor(u), f = u - side - .5;
      const ox = side === 0 ? h : side === 2 ? -h : f * size, oz = side === 1 ? h : side === 3 ? -h : -f * size;
      const L = Math.hypot(ox, oz) || 1;
      this.K.puff.spawn([pos[0] + ox, pos[1] + .03, pos[2] + oz], [ox / L * R(.4, .8), R(.15, .35), oz / L * R(.4, .8)],
        { life: R(.8, 1.2), size: .06, size1: R(.13, .2) * Math.min(1.4, .7 + size * .2), flags: F_GROW, drag: 2.6, g: -.02, color: [0xd8c8a8, 0xcbb894, 0xe4d8c0][i % 3], fade: .55 });
    }
    for (let i = 0; i < 6 + size * 2; i++) this.K.cube.spawn([pos[0] + R(-h, h), pos[1] + .05, pos[2] + R(-h, h)], [R(-.5, .5), R(.8, 1.5), R(-.5, .5)],
      { life: R(.7, 1), size: R(.018, .03), g: 7, spin: R(6, 12), flags: F_BOUNCE, color: [0xa89a80, 0x8a7c66][i % 2], fade: .3 });
  }
  // ---------------- Abriss: Puff + Trümmer ----------------
  poof(pos, size = 1) {
    for (let i = 0; i < 9 + size * 4; i++) {
      const a = R(0, TAU), sp = R(.3, .9) * size;
      this.K.puff.spawn([pos[0] + Math.cos(a) * .1 * size, pos[1] + R(.05, .3) * size, pos[2] + Math.sin(a) * .1 * size], [Math.cos(a) * sp, R(.2, .8), Math.sin(a) * sp],
        { life: R(.7, 1.1), size: .1 * size, size1: R(.22, .32) * size, flags: F_GROW, drag: 3, g: -.1, color: [0xeeeae4, 0xd8d4ce, 0xc8c2ba][i % 3], fade: .6 });
    }
    for (let i = 0; i < 10 + size * 6; i++) {
      const a = R(0, TAU), sp = R(.6, 1.6);
      this.K.cube.spawn([pos[0], pos[1] + .2 * size, pos[2]], [Math.cos(a) * sp, R(1.4, 2.6), Math.sin(a) * sp],
        { life: R(.9, 1.4), size: R(.025, .05), g: 8, spin: R(5, 14), flags: F_BOUNCE, color: [0x8a8f98, 0xc08a4a, 0x6a6e76, 0xf2c230][i % 4], fade: .3 });
    }
    this.sparks([pos[0], pos[1] + .15, pos[2]], 6, 0xffd080);
  }
  // ---------------- Goldglitzern ----------------
  sparkle(pos, n = 8) {
    for (let i = 0; i < n; i++) this.K.star.spawn([pos[0] + R(-.2, .2), pos[1] + R(-.1, .2), pos[2] + R(-.2, .2)], [R(-.1, .1), R(.15, .4), R(-.1, .1)],
      { life: R(.5, .9), size: R(.025, .05), size1: 0, spin: R(-4, 4), flags: F_FACE | F_POPIN, color: i % 3 ? 0xffe27a : 0xffffff, delay: R(0, .25), fade: .7 });
  }
  // ---------------- Kiste öffnen: wackeln, Deckel fliegt, Strahlen + Sterne ----------------
  crateOpen(pos, { color = 0xffe27a } = {}) {
    let c = this.crates.find(c => !c.group.visible);
    if (!c) {
      if (this.crates.length < 6) { const I = instantiate(crateBuilt(), MATS); c = { group: I.group, lid: I.parts.lid }; this.root.add(c.group); this.crates.push(c); }
      else c = this.crates.reduce((a, b) => a.age > b.age ? a : b);
    }
    c.group.visible = true; c.age = 0; c.pos = [...pos]; c.color = color; c.burst = false; c.group.position.set(...pos);
  }
  _crate(c, dt) {
    c.age += dt; const a = c.age, g = c.group;
    const appear = sst(0, .18, a), shake = a > .2 && a < .7 ? Math.sin(a * 60) * .08 * sst(.2, .3, a) : 0, open = sst(.7, .9, a), gone = sst(1.9, 2.3, a);
    const sq = a > .62 && a < .75 ? 1 - Math.sin((a - .62) / .13 * PI) * .15 : 1;
    g.scale.set(appear * (2 - sq) * (1 - gone), appear * sq * (1 - gone) + 1e-3, appear * (2 - sq) * (1 - gone));
    g.rotation.set(shake * .4, 0, shake);
    // Deckel: klappt auf und fliegt
    const fly = Math.max(0, a - .7);
    c.lid.rotation.z = open * 1.9 + fly * 3; c.lid.position.set(-fly * .25, fly * 1.4 - fly * fly * 2.2, 0);
    c.lid.visible = a < 1.6;
    if (!c.burst && a >= .7) {
      c.burst = true; const p = [c.pos[0], c.pos[1] + .26, c.pos[2]];
      for (let i = 0; i < 9; i++) {
        const az = i / 9 * TAU + R(-.2, .2), el = R(.1, .6);
        this.K.ray.spawn(p, [0, 0, 0], { axis: null, life: 1.1, size: .035, size1: .05, stretch: R(9, 13), color: c.color, flags: F_POPIN, fade: .6, rot: 0, spin: 0, _dir: [Math.cos(az) * Math.sin(el), Math.cos(el), Math.sin(az) * Math.sin(el)] });
        const K = this.K.ray, j = ((K.head - 1 + K.cap) % K.cap);                // Strahl ausrichten: Achse ⟂ (y → Richtung)
        const d = new THREE.Vector3(Math.cos(az) * Math.sin(el), Math.cos(el), Math.sin(az) * Math.sin(el)), ax = new THREE.Vector3().crossVectors(_Y, d), ang = Math.acos(clamp(d.y, -1, 1));
        if (ax.lengthSq() < 1e-6) ax.set(1, 0, 0); ax.normalize(); K.ax.set([ax.x, ax.y, ax.z], j * 3); K.rot0[j] = ang;
      }
      for (let i = 0; i < 16; i++) { const az = R(0, TAU), sp = R(.5, 1.3);
        this.K.star.spawn(p, [Math.cos(az) * sp, R(1.2, 2.4), Math.sin(az) * sp], { life: R(.8, 1.3), size: R(.04, .07), g: 2.5, drag: 1.2, spin: R(-6, 6), flags: F_FACE | F_POPIN, color: [0xffe27a, 0xffffff, 0xff9ad0, 0x9ae0ff][i % 4], fade: .4 }); }
      this.confetti(p, 40); this.smoke([p[0], p[1] - .1, p[2]], { n: 4, size: .8 });
    }
    if (a > 2.3) g.visible = false;
  }

  // ---------------- Bild für Bild ----------------
  update(dt = 1 / 60, camera = this.camera) {
    dt = clamp(dt, 0, .1);
    const camQ = camera ? camera.quaternion : null;
    for (const K of Object.values(this.K)) K.update(dt, camQ);
    for (const s of this.sprites) {
      if (!s.visible) continue; const u = s.userData; u.age += dt; const k = u.age / u.life;
      if (k >= 1) { s.visible = false; continue; }
      const pop = k < .12 ? .6 + .4 * Math.sin(k / .12 * PI / 2) * 1.15 : 1 + .15 * (1 - sst(.12, .25, k));
      s.position.set(u.p0[0] + u.wob * .05 * k, u.p0[1] + u.rise * (1 - Math.pow(1 - k, 2.2)), u.p0[2]);
      s.scale.set(u.h * u.aspect * pop, u.h * pop, 1); s.material.opacity = 1 - sst(.7, 1, k);
    }
    for (const c of this.crates) if (c.group.visible) this._crate(c, dt);
  }
  clear() { for (const K of Object.values(this.K)) K.clear(); for (const s of this.sprites) s.visible = false; for (const c of this.crates) c.group.visible = false; }
  dispose() {
    this.clear(); this.scene.remove(this.root);
    for (const K of Object.values(this.K)) { K.mesh.geometry.dispose(); K.mesh.material.dispose(); K.mesh.dispose(); }
    for (const t of this.tex.values()) t.dispose(); for (const s of this.sprites) s.material.dispose();
    this.goldCoinMat.dispose(); this.coinMat.dispose();
  }
}
