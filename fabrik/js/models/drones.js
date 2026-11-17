// Cogtopia – Lieferdrohnen. droneKit(k) baut eine Drohne (Rumpf, vier Rotoren als Teile 'rot0…3', Kiste als Teil 'crate',
// Positionslichter rot links / grün rechts, weißer Blitz oben). makeDrone() → einzelnes Modell mit update(t, state);
// DroneRenderer → viele Drohnen instanziert (wenige Draw Calls): begin() → add(wx, wz, h, itemId, gold, key) … → end(t).
// Blickrichtung +x, Mitte im Ursprung, Kufen bei y = 0. Größe ca. 0,5 × 0,5.
import * as THREE from 'three';
import { Kit, instantiate, PI, TAU } from '../kit.js';
import { MATS } from '../materials.js';
import { C } from './parts.js';
import { ITEM_LOOK } from './items.js';

const ARM = .17, BODY_Y = .13;
// Kiste: Ebene 'crate' nimmt die Farbe des Teils an (weiß gebaut), Rest feste Farben
function crateKit(s) {
  s.bev(0xffffff, [0, -.14, 0], [.15, .12, .15], .015, { layer: 'crate', jit: 0 });
  for (const z of [-.076, .076]) s.box(0xffffff, [0, -.14, z], [.152, .12, .012], { layer: 'crate', shade: .78, jit: 0 });
  s.box(C.dark, [0, -.09, 0], [.154, .014, .154], { layer: 'metal' });                     // Spanngurt
  for (const [x, z] of [[-.05, -.05], [.05, -.05], [-.05, .05], [.05, .05]]) s.beam(C.dark, [x, -.02, z], [x * .8, 0, z * .8], .008, { layer: 'metal' });
}
export function droneKit(k, o = {}) {
  const body = o.color ?? C.white, acc = o.accent ?? C.teal;
  k.in([0, BODY_Y, 0], 0, () => {
    // Rumpf mit Akzent-Streifen, Glaskuppel, Kamera vorn
    k.bev(body, [0, -.03, 0], [.24, .09, .17], .03);
    k.bev(acc, [0, .055, 0], [.2, .025, .14], .012);
    k.box(acc, [0, -.005, 0], [.245, .02, .175], { jit: 0 });
    k.ball(C.glass, [.02, .085, 0], [.06, .035, .05], { layer: 'glass', detail: 1 });
    k.ball(C.dark, [.13, -.015, 0], .028, { layer: 'metal', detail: 1 });
    k.ball(0x6ae0ff, [.152, -.015, 0], .012, { layer: 'glow', detail: 0 });
    // Arme mit Motoren und Rotorringen
    for (const [i, sx, sz] of [[0, 1, 1], [1, 1, -1], [2, -1, -1], [3, -1, 1]]) {
      const x = sx * ARM, z = sz * ARM;
      k.beam(C.dark, [sx * .06, .0, sz * .05], [x, .01, z], .024, { layer: 'metal' });
      k.cyl(C.steelD, [x, -.01, z], .026, .05, 8, { layer: 'metal', bevel: .2 });
      k.torus(acc, [x, .035, z], .085, .009, 16, { r: [PI / 2, 0, 0], tseg: 4 });
      for (let j = 0; j < 3; j++) { const a = j * TAU / 3 + .5; k.beam(C.dark, [x, .03, z], [x + Math.cos(a) * .08, .035, z + Math.sin(a) * .08], .006, { layer: 'metal' }); }
      // Positionslicht an der Armspitze (links rot, rechts grün)
      k.ball(sz < 0 ? 0xff3a2a : 0x3aff6a, [x + sx * .03, .0, z + sz * .03], .012, { layer: 'glow', detail: 0 });
      if (o.parts !== false) k.part('rot' + i, [x, .04, z], r => rotorKit(r));
    }
    // Kufen
    for (const s of [-1, 1]) { k.beam(C.dark, [-.04, -.04, s * .05], [-.04, -.12, s * .08], .012, { layer: 'metal' }); k.beam(C.dark, [.05, -.04, s * .05], [.05, -.12, s * .08], .012, { layer: 'metal' });
      k.box(C.dark, [0, -.125, s * .08], [.2, .012, .014], { layer: 'metal' }); }
    k.ball(0xffffff, [-.04, .075, 0], .014, { layer: 'strobe', detail: 0 });
  });
  if (o.parts !== false) k.part('crate', [0, BODY_Y - .02, 0], s => crateKit(s));
}
function rotorKit(r) {
  r.cyl(C.dark, [0, -.005, 0], .014, .016, 8, { layer: 'metal' });
  for (const s of [-1, 1]) r.boxc(0x2a2c32, [s * .036, .006, 0], [.072, .005, .016], { r: [s * .12, 0, 0] });
  r.box(C.yel, [.066, .004, 0], [.006, .006, .017], { jit: 0 });
}

// Gebaute Vorlagen (einmal)
let BUILT = null;
function built() {
  if (BUILT) return BUILT;
  const k = new Kit(321); k.aoH = .05; droneKit(k);
  const full = k.build();
  const rot = new Kit(322); rot.aoH = .001; rotorKit(rot);
  const cr = new Kit(323); cr.aoH = .001; crateKit(cr);
  const st = new Kit(324); st.aoH = .001; droneKit(st, { parts: false });
  return (BUILT = { full, rotor: rot.build().geos, crate: cr.build().geos, body: st.build().geos, rotorPos: full.parts.filter(p => /^rot/.test(p.name)).map(p => new THREE.Vector3().setFromMatrixPosition(p.matrix)) });
}
const CRATE_C = new THREE.Color(0xc08a4a);
const strobeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3) });

// =====================================================================================================================
// makeDrone(opts) → { group, update(t, { item, gold, carry (bool), fly (0…1 Rotortempo), tilt }), dispose() }
export function makeDrone(opts = {}) {
  const B = built(), crateMat = new THREE.MeshStandardMaterial({ color: 0xc08a4a, roughness: .7, flatShading: true });
  const gold = MATS.gold, strobe = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3) });
  const I = instantiate(B.full, { ...MATS, crate: crateMat, strobe });
  const group = new THREE.Group(); group.add(I.group); group.name = 'drone';
  let item = null, isGold = false;
  const update = (t, s = {}) => {
    const fly = s.fly ?? 1;
    for (let i = 0; i < 4; i++) I.parts['rot' + i].rotation.y = t * (6 + 44 * fly) * (i % 2 ? -1 : 1);
    I.parts.crate.visible = s.carry ?? !!s.item;
    if (s.item !== undefined && (s.item !== item || !!s.gold !== isGold)) {
      item = s.item; isGold = !!s.gold; const L = ITEM_LOOK[item];
      I.meshes.filter(m => m.userData.layer === 'crate').forEach(m => { m.material = isGold ? gold : crateMat; });
      if (L) crateMat.color.set(L.color).lerp(new THREE.Color(0xc08a4a), .35);
    }
    I.group.position.y = Math.sin(t * 2.2 + (opts.phase || 0)) * .015 * fly;
    I.group.rotation.z = -(s.tilt ?? 0) * .25;
    strobe.color.setScalar(Math.sin(t * 7 + (opts.phase || 0)) > .85 ? 4 : .3);
  };
  update(0, { item: opts.item ?? 'eisenplatte', fly: 1 });
  return { group, parts: I.parts, update, dispose() { crateMat.dispose(); strobe.dispose(); } };
}

// =====================================================================================================================
// Viele Drohnen: begin() → add(wx, wz, h, itemId, gold, key) … → end(t). Flughöhe h über dem Boden (Kufen),
// Kurs und Neigung aus der Bewegung je key (vorheriges Bild). itemId = null → ohne Kiste.
export class DroneRenderer {
  constructor(parent, { capacity = 64, shadows = true, scale = 1.4 } = {}) {
    this.parent = parent; this.scale = scale; this.shadows = shadows; this.cap = 0; this.n = 0; this.prev = new Map(); this.seen = new Set();
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1); this._small = new THREE.Matrix4().makeScale(.001, .001, .001);
    this._c = new THREE.Color(); this._o = new THREE.Object3D(); this.meshes = []; this.t = 0;
    this._grow(capacity);
  }
  _grow(cap) {
    const B = built(), old = this.meshes; this.meshes = [];
    const mk = (geo, mat, n, color, shadow = this.shadows) => { const m = new THREE.InstancedMesh(geo, mat, n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = shadow; m.count = 0;
      if (color) { m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); m.instanceColor.setUsage(THREE.DynamicDrawUsage); } this.parent.add(m); this.meshes.push(m); return m; };
    this.body = Object.entries(B.body).map(([l, g]) => mk(g, l === 'strobe' ? strobeMat : (MATS[l] || MATS.base), cap, false, l !== 'glow' && l !== 'strobe' && l !== 'glass'));
    this.strobe = this.body[Object.keys(B.body).indexOf('strobe')] || null;
    this.rotors = Object.entries(B.rotor).map(([l, g]) => mk(g, MATS[l] || MATS.base, cap * 4, false, false));
    this.crates = Object.entries(B.crate).map(([l, g]) => l === 'crate'
      ? [mk(g, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .7, flatShading: true }), cap, true), mk(g, MATS.gold, cap, false)]
      : [mk(g, MATS[l] || MATS.base, cap, false)]).flat();
    for (const m of old) { this.parent.remove(m); m.dispose(); }
    this.cap = cap;
  }
  begin() { this.n = 0; this.nc = 0; this.ng = 0; this.seen.clear(); this.items = []; }
  add(wx, wz, h = 1.2, itemId = null, gold = false, key = this.n) {
    if (this.n >= this.cap) this._grow(this.cap * 2);
    this.items.push([wx, wz, h, itemId, gold, key]); this.n++;
  }
  end(t = this.t) {
    const dtT = Math.max(0, Math.min(.1, t - this.t)); this.t = t;
    const B = built(), M = this._m, q = this._q, e = this._e, p = this._p, one = this._s.setScalar(this.scale), o = this._o;
    let nr = 0, nc = 0, ng = 0;
    const crateMeshes = this.crates;                           // [tint, gold, Gurte…]
    this.items.forEach(([wx, wz, h, id, gold, key], i) => {
      let pr = this.prev.get(key);
      if (!pr) { pr = { x: wx, z: wz, yaw: 0, tilt: 0, roll: 0 }; this.prev.set(key, pr); }
      const dx = wx - pr.x, dz = wz - pr.z, sp = Math.hypot(dx, dz) / Math.max(1e-3, dtT || 1 / 60);
      if (sp > .05) { const want = Math.atan2(-dz, dx); let d = ((want - pr.yaw + PI) % TAU + TAU) % TAU - PI; pr.yaw += d * Math.min(1, dtT * 6); }
      pr.tilt += (Math.min(1, sp / 6) - pr.tilt) * Math.min(1, dtT * 4); pr.x = wx; pr.z = wz; this.seen.add(key);
      const bob = Math.sin(t * 2.2 + i * 1.7) * .02;
      e.set(0, pr.yaw, -pr.tilt * .28, 'YXZ'); q.setFromEuler(e); p.set(wx, h + bob, wz); M.compose(p, q, one);
      for (const m of this.body) M.toArray(m.instanceMatrix.array, i * 16);
      if (this.strobe) { const on = Math.sin(t * 7 + i * 2.3) > .85; if (!on) { o.matrix.copy(M).multiply(this._small); o.matrix.toArray(this.strobe.instanceMatrix.array, i * 16); } }
      for (let r = 0; r < 4; r++) {
        o.position.copy(B.rotorPos[r]); o.rotation.set(0, t * 48 * (r % 2 ? -1 : 1) + r, 0); o.updateMatrix();
        o.matrix.premultiply(M); for (const m of this.rotors) o.matrix.toArray(m.instanceMatrix.array, nr * 16); nr++;
      }
      if (id) {
        o.position.set(0, .09 + Math.sin(t * 3 + i) * .004, 0); o.rotation.set(0, 0, Math.sin(t * 2.1 + i) * .05 * (1 + pr.tilt)); o.scale.setScalar(1.25); o.updateMatrix(); o.scale.setScalar(1); o.matrix.premultiply(M);
        const tint = gold ? crateMeshes[1] : crateMeshes[0], j = gold ? ng++ : nc++;
        o.matrix.toArray(tint.instanceMatrix.array, j * 16);
        if (!gold) { const L = ITEM_LOOK[id]; this._c.set(L ? L.color : 0xc08a4a).lerp(CRATE_C, .2); this._c.toArray(tint.instanceColor.array, j * 3); }
        for (let s = 2; s < crateMeshes.length; s++) o.matrix.toArray(crateMeshes[s].instanceMatrix.array, (nc + ng - 1) * 16);
      }
    });
    for (const m of this.body) { m.count = this.n; m.instanceMatrix.needsUpdate = true; m.visible = this.n > 0; }
    for (const m of this.rotors) { m.count = nr; m.instanceMatrix.needsUpdate = true; m.visible = nr > 0; }
    crateMeshes[0].count = nc; crateMeshes[1].count = ng; for (let s = 2; s < crateMeshes.length; s++) crateMeshes[s].count = nc + ng;
    for (const m of crateMeshes) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.visible = m.count > 0; }
    if (this.prev.size > this.n * 2 + 32) for (const k of [...this.prev.keys()]) if (!this.seen.has(k)) this.prev.delete(k);
  }
  get count() { return this.n; }
  dispose() { for (const m of this.meshes) { this.parent.remove(m); m.dispose(); } this.meshes = []; this.prev.clear(); }
}
