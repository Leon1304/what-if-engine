// Cogtopia – Detailstufen für große Fabriken (#17). Nahe Gebäude bleiben volle Modelle mit Bewegung; weit entfernte
// werden ausgeblendet und als instanzierte Hülle gezeichnet (gleiche Geometrie, Teile in Ruhelage, gemeinsame Materialien) –
// ein Draw Call je Typ/Stufe/Ebene statt ~15–40 je Gebäude. makeBuilding().update() rechnet für ausgeblendete Gebäude nichts.
//   const lod = new BuildingLOD(scene, { near: 24, maxFull: 60 });
//   lod.add(b) / lod.remove(b) / lod.refresh(b) (nach setRot, setMk oder Verschieben) / lod.update(camera) je Bild / lod.stats
import * as THREE from 'three';
import { hullFor, HULL_MATS } from './buildings.js';

export class BuildingLOD {
  // near: Abstand Kamera → Gebäude, bis zu dem volle Modelle gezeigt werden; maxFull: höchstens so viele volle Modelle (die nächsten)
  constructor(scene, { near = 24, maxFull = 60, shadows = true, enabled = true } = {}) {
    this.scene = scene; this.near = near; this.maxFull = maxFull; this.shadows = shadows; this.enabled = enabled;
    this.root = new THREE.Group(); this.root.name = 'lod'; scene.add(this.root);
    this.E = new Map(); this.G = new Map(); this._cam = new THREE.Vector3(1e9, 0, 0); this._dirty = true; this._v = new THREE.Vector3(); this.full = 0; this.hull = 0;
  }
  _key(b) { const k = b.lodKey(); return k.type + ':' + k.variant + ':' + k.mk + (k.mirror ? ':m' : ''); }
  add(b) {
    if (this.E.has(b)) return this.refresh(b);
    const e = { b, key: this._key(b), m: b.lodMatrix(), c: new THREE.Vector3(), far: false, d: 0 };
    e.c.setFromMatrixPosition(e.m); this.E.set(b, e); this._dirty = true; return e;
  }
  remove(b) { const e = this.E.get(b); if (!e) return; if (e.far) this._grp(e.key).dirty = true; b.group.visible = true; this.E.delete(b); this._dirty = true; }
  refresh(b) {
    const e = this.E.get(b); if (!e) return this.add(b);
    if (e.far) this._grp(e.key).dirty = true;
    e.key = this._key(b); b.lodMatrix(e.m); e.c.setFromMatrixPosition(e.m);
    if (e.far) this._grp(e.key).dirty = true;
    this._dirty = true; return e;
  }
  clear() { for (const e of this.E.values()) e.b.group.visible = true; this.E.clear(); for (const g of this.G.values()) g.dirty = true; this._dirty = true; this._flush(); }
  setEnabled(on) { this.enabled = !!on; this._dirty = true; }
  _grp(key) {
    let g = this.G.get(key); if (g) return g;
    const [type, variant, mk, m] = key.split(':'), H = hullFor(type, variant, +mk, m === 'm');
    g = { key, dirty: true, cap: 0, meshes: [], layers: Object.entries(H) }; this.G.set(key, g); return g;
  }
  _fit(g, n) {
    if (n <= g.cap) return;
    const cap = Math.max(8, 1 << Math.ceil(Math.log2(n)));
    for (const m of g.meshes) { this.root.remove(m); m.dispose(); }
    g.meshes = g.layers.map(([layer, geo]) => { const m = new THREE.InstancedMesh(geo, HULL_MATS[layer] || HULL_MATS.base, cap);
      m.castShadow = this.shadows && layer !== 'glow' && layer !== 'glass' && layer !== 'hlamp'; m.receiveShadow = layer !== 'glow'; m.frustumCulled = false; m.count = 0; m.name = 'lod ' + g.key + ' ' + layer; this.root.add(m); return m; });
    g.cap = cap;
  }
  // je Bild: entscheidet neu, wenn sich die Kamera bewegt hat oder etwas dazukam (sonst fast kostenlos)
  update(camera) {
    const cp = camera.getWorldPosition(this._v);
    if (!this._dirty && cp.distanceToSquared(this._cam) < .25) return;
    this._cam.copy(cp); this._dirty = false;
    const list = [...this.E.values()];
    for (const e of list) e.d = e.c.distanceTo(cp);
    let fullSet;
    if (!this.enabled) fullSet = new Set(list);
    else {
      const near = list.filter(e => e.d < this.near + (e.far ? -1 : 1)).sort((a, b) => a.d - b.d);   // kleine Schwelle gegen Flackern
      fullSet = new Set(near.slice(0, this.maxFull));
    }
    for (const e of list) {
      const far = !fullSet.has(e);
      if (far !== e.far) { e.far = far; this._grp(e.key).dirty = true; e.b.group.visible = !far; }
    }
    this._flush();
  }
  _flush() {
    const by = new Map();
    for (const e of this.E.values()) if (e.far) { let a = by.get(e.key); if (!a) by.set(e.key, a = []); a.push(e); }
    let hull = 0;
    for (const g of this.G.values()) {
      const arr = by.get(g.key) || []; hull += arr.length;
      if (!g.dirty) continue; g.dirty = false;
      this._fit(g, arr.length);
      for (const m of g.meshes) { arr.forEach((e, i) => m.setMatrixAt(i, e.m)); m.count = arr.length; m.visible = arr.length > 0; m.instanceMatrix.needsUpdate = true; if (arr.length) m.computeBoundingSphere(); }
    }
    this.hull = hull; this.full = this.E.size - hull;
  }
  get stats() { let calls = 0; for (const g of this.G.values()) for (const m of g.meshes) if (m.visible) calls++; return { full: this.full, hull: this.hull, hullCalls: calls, types: this.G.size }; }
  dispose() { for (const g of this.G.values()) for (const m of g.meshes) { this.root.remove(m); m.dispose(); } this.G.clear(); this.E.clear(); this.scene.remove(this.root); }
}
