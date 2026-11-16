// Die Insel in 3D: hält zu jeder Kachel ihr Modell, baut nur neu, was sich geändert hat (Art, Drehung, Hausstufe,
// Wassernachbarn), lässt neue Kacheln einfallen, dreht bewegliche Teile, zeigt freie Plätze und die Vorschau.
import * as THREE from 'three';
import { key, center, neighbor, pixelToHex, cornerAt, edgeMid, R, INR } from './hex.js';
import { edgesOf, GROUP } from './tiles.js';
import { MATS, ghostMat } from './materials.js';
import { buildTile } from './models/tilemodel.js';
import { WATER_Y } from './terrain.js';

const DROP = .55;
export class World {
  constructor(scene, game) {
    this.scene = scene; this.game = game; this.root = new THREE.Group(); scene.add(this.root);
    this.T = new Map(); this.now = 0; this.reveal = null;
    this.slotMesh = null; this.ghost = null; this.ghostKey = '';
    this.ghostOk = ghostMat(0x9fe08a); this.ghostBad = ghostMat(0xe86a5a);
  }
  nb(q, r) { const out = []; for (let i = 0; i < 6; i++) { const n = this.game.at(...neighbor(q, r, i)); out.push(n ? { k: n.k, E: edgesOf(n.k, n.o) } : null); } return out; }
  sig(t) {
    const E = edgesOf(t.k, t.o); let s = t.k + t.o + ':' + this.game.stageOf(t);
    if (E.includes('w') || E.includes('l')) s += ':' + this.nb(t.q, t.r).map(n => n ? n.k + n.E.join('') : '-').join('|');
    return s;
  }
  // Abgleich mit dem Spielstand. animKey: diese Kachel fällt ein.
  sync(animKey) {
    const want = this.game.board;
    for (const [k, o] of this.T) if (!want.has(k)) { this._remove(o); this.T.delete(k); }
    let i = 0;
    for (const [k, t] of want) {
      const s = this.sig(t), o = this.T.get(k);
      if (o && o.sig === s) continue;
      const born = o ? o.born : (k === animKey ? this.now : -99);
      if (o) this._remove(o);
      const n = this._build(t, s); n.born = born; n.order = i++; this.T.set(k, n);
      if (o && o.stage !== n.stage && t.k === 'haus') (this.grown ||= []).push(n);   // Haus ist gewachsen (main.js feiert)
    }
    this.updateSlots();
  }
  _build(t, sig) {
    const { x, z } = center(t.q, t.r), E = edgesOf(t.k, t.o), nb = this.nb(t.q, t.r), stage = this.game.stageOf(t);
    const m = buildTile(t, E, nb, x, z, { stage });
    const g = new THREE.Group(); g.position.set(x, 0, z); g.userData.tile = t;
    const meshes = [];
    for (const [layer, geo] of Object.entries(m.geo)) {
      const mesh = new THREE.Mesh(geo, MATS[layer] || MATS.base);
      mesh.castShadow = layer === 'base' || layer === 'bldg'; mesh.receiveShadow = layer !== 'fall' && layer !== 'glass';
      if (layer === 'glass' || layer === 'fall') mesh.renderOrder = 2;
      mesh.userData.tile = t; mesh.userData.layer = layer; g.add(mesh); meshes.push(mesh);
    }
    const parts = [];
    const mk = (p, parent) => {
      const outer = new THREE.Group(); outer.applyMatrix4(p.matrix); const inner = new THREE.Group(); outer.add(inner);
      for (const [layer, geo] of Object.entries(p.geo)) { const mm = new THREE.Mesh(geo, MATS[layer] || MATS.base); mm.castShadow = layer === 'base'; mm.receiveShadow = true; mm.userData.tile = t; mm.userData.layer = layer === 'base' ? 'part' : layer; inner.add(mm); meshes.push(mm); }
      parent.add(outer); parts.push({ ...p, inner, phase: Math.random() * 6 });
      for (const c of p.children || []) mk(c, inner);
    };
    for (const p of m.parts) mk(p, g);
    this.root.add(g);
    const spots = m.spots.map(s => ({ ...s, p: [s.p[0] + x, s.p[1], s.p[2] + z] }));
    for (const f of m.F.falls || []) spots.push({ type: 'fall', p: [f[0] + x, f[1], f[2] + z], a: f[3] });
    return { t, g, meshes, parts, spots, F: m.F, sig, stage, cx: x, cz: z, info: m.info };
  }
  _remove(o) { this.root.remove(o.g); o.g.traverse(m => { if (m.isMesh) m.geometry.dispose(); }); }
  clear() { for (const o of this.T.values()) this._remove(o); this.T.clear(); this.updateSlots(); }

  // Boden-Höhe an Welt-Punkt (für Kamera, Leben)
  groundAt(x, z) {
    const [q, r] = pixelToHex(x, z), o = this.T.get(key(q, r));
    if (!o) return -60;
    const lx = x - o.cx, lz = z - o.cz; let h = Math.max(o.F.h(lx, lz), o.F.hasWater ? WATER_Y : -9);
    if (o.t.k === 'bruecke' && o.F.roadD(lx, lz) < 1.2) {           // Brückendeck (Form wie in buildings.js bridge)
      const th = -o.t.o * Math.PI / 3, bz = lx * Math.sin(th) + lz * Math.cos(th), Z = 2.6;
      if (Math.abs(bz) < Z) h = Math.max(h, .32 + .73 * (1 - (bz / Z) ** 2));
    }
    return h;
  }
  blockers() { const a = []; for (const o of this.T.values()) if (o.g.visible) for (const m of o.meshes) if (m.userData.layer === 'bldg') a.push(m); return a; }
  pickables() { const a = []; for (const o of this.T.values()) if (o.g.visible) for (const m of o.meshes) if (m.userData.layer !== 'fall' && m.userData.layer !== 'water') a.push(m); return a; }
  // Für das Leben: Kacheln mit Welt-Spots, Gruppen und Wegpunkten
  lifeList() {
    const out = [], gid = new Map(); let next = 1;
    for (const [k, o] of this.T) {
      const t = o.t, g = GROUP[t.k] || null; let id = 0;
      if (g) { const grp = this.game.group(t.q, t.r); const lead = grp.keys.slice().sort()[0]; if (!gid.has(lead)) gid.set(lead, next++); id = gid.get(lead); }
      const roads = o.F.rEdges.length ? [[o.cx, o.cz], ...o.F.rEdges.map(i => { const [a, b] = edgeMid(i); return [a + o.cx, b + o.cz]; })] : [];
      out.push({ key: k, kind: t.k, q: t.q, r: t.r, cx: o.cx, cz: o.cz, group: g, groupId: id, spots: o.spots, roads, rEdges: o.F.rEdges });
    }
    return out;
  }
  bounds() { let r = 10; for (const o of this.T.values()) r = Math.max(r, Math.hypot(o.cx, o.cz) + R); return r; }

  // Freie Plätze als weiche Sechseck-Umrisse
  updateSlots(show = true) {
    if (this.slotMesh) { this.scene.remove(this.slotMesh); this.slotMesh.geometry.dispose(); this.slotMesh = null; }
    if (!show) return;
    const pts = [];
    for (const [q, r] of this.game.slots()) {
      const { x, z } = center(q, r);
      for (let i = 0; i < 6; i++) { const a = cornerAt(i), b = cornerAt((i + 1) % 6); const s = .9; pts.push(x + a[0] * s, .25, z + a[1] * s, x + b[0] * s, .25, z + b[1] * s); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.slotMesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .35, depthWrite: false }));
    this.slotMesh.renderOrder = 3; this.scene.add(this.slotMesh);
  }
  // Vorschau der aktuellen Kachel
  setGhost(kind, q, r, o, ok) {
    const k = kind + q + ',' + r + ':' + o + ok;
    if (k === this.ghostKey) return; this.clearGhost(); this.ghostKey = k;
    const { x, z } = center(q, r), t = { k: kind, q, r, o }, m = buildTile(t, edgesOf(kind, o), this.nb(q, r), x, z, { stage: 1 });
    const g = new THREE.Group(); g.position.set(x, .6, z);
    const mat = ok ? this.ghostOk : this.ghostBad;
    for (const [layer, geo] of Object.entries(m.geo)) if (layer !== 'fall') g.add(new THREE.Mesh(geo, mat));
    const gp = (p, par) => { const outer = new THREE.Group(); outer.applyMatrix4(p.matrix); for (const geo of Object.values(p.geo)) outer.add(new THREE.Mesh(geo, mat)); par.add(outer); for (const c of p.children || []) gp(c, outer); };
    for (const p of m.parts) gp(p, g);
    this.ghost = g; this.scene.add(g);
  }
  clearGhost() { if (this.ghost) { this.scene.remove(this.ghost); this.ghost.traverse(m => m.isMesh && m.geometry.dispose()); this.ghost = null; } this.ghostKey = ''; }

  // Zeitraffer: alle Kacheln ausblenden, dann in Spielreihenfolge einfallen lassen
  startReveal(interval) {
    const order = this.game.S.tiles.map(t => key(t.q, t.r));
    this.reveal = { order, interval, t0: this.now };
    for (const o of this.T.values()) o.g.visible = false;
    this.updateSlots(false);
  }
  stopReveal() { this.reveal = null; for (const o of this.T.values()) { o.g.visible = true; o.g.position.y = 0; o.g.scale.set(1, 1, 1); } this.updateSlots(); }

  update(dt) {
    this.now += dt; const now = this.now;
    if (this.reveal) {
      const R2 = this.reveal, n = Math.floor((now - R2.t0) / R2.interval);
      R2.order.forEach((k, i) => { const o = this.T.get(k); if (!o) return; if (i <= n && !o.g.visible) { o.g.visible = true; o.born = now; } });
      R2.done = n >= R2.order.length + 2;
    }
    for (const o of this.T.values()) {
      const age = now - o.born, g = o.g;
      if (age < DROP + .5) {
        if (age < DROP) { const u = age / DROP; g.position.y = (1 - u * u) * 9; g.scale.set(1, 1, 1); g.rotation.y = (1 - u) * (1 - u) * .5; }
        else { const v = (age - DROP) / .5; g.position.y = 0; g.rotation.y = 0; const s = 1 - Math.sin(v * Math.PI) * .07 * (1 - v); g.scale.set(1 + (1 - s) * .5, s, 1 + (1 - s) * .5); }
      } else if (g.position.y !== 0 || g.scale.y !== 1) { g.position.y = 0; g.rotation.y = 0; g.scale.set(1, 1, 1); }
      for (const p of o.parts) {
        if (p.spin) p.inner.setRotationFromAxisAngle(_ax.set(...p.spin).normalize(), now * (p.speed || 1) + p.phase);
        if (p.bob) { p.inner.position.y = Math.sin(now * 1.3 + p.phase) * p.bob; p.inner.rotation.z = Math.sin(now * .9 + p.phase) * .04; }
        if (p.swing) p.inner.setRotationFromAxisAngle(_ax.set(...p.swing).normalize(), Math.sin(now * (p.speed || 1) + p.phase) * (p.amp || .3));
      }
    }
    if (this.slotMesh) this.slotMesh.material.opacity = .22 + .14 * Math.sin(now * 2.2);
    if (this.ghost) this.ghost.position.y = .5 + Math.sin(now * 3) * .15;
  }
}
const _ax = new THREE.Vector3();
