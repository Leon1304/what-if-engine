// Weapons: knife, pistol, shotgun, hunting rifle, bow. The weapon in the selected hotbar slot is held (first-person model = Blender
// template bp_w_<id>, drawn in its own pass so it never sinks into walls). Left click fires / stabs, R reloads, right click aims
// (rifle: scope). Shots are hit-scan against the animals (two spheres per body) and blocked by the map's collider.
// Magazines live in S.mag, spare rounds in S.ammo (ammo boxes add to it, the bow uses arrows from the backpack).
import * as THREE from 'three';
import { ITEMS, WEAPONS } from './items.js';
import { KIND } from './life.js';

const ray = new THREE.Ray(), tmp = new THREE.Vector3(), dir = new THREE.Vector3(), c1 = new THREE.Vector3();
const HOLD = { messer: [.22, -.24, -.42], pistole: [.2, -.2, -.42], schrotflinte: [.25, -.27, -.2], gewehr: [.24, -.26, -.18], bogen: [.12, -.12, -.5] };

export class Combat {
  constructor(game) {
    this.g = game; this.scene = new THREE.Scene(); this.cam = game.camera;
    this.hemi = new THREE.HemisphereLight('#fff6e8', '#4a3f30', 2.2); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#ffffff', 1.4); this.sun.position.set(.5, 1, .3); this.scene.add(this.sun);
    this.flash = new THREE.PointLight('#ffcf80', 0, 10, 2); game.camera.add(this.flash); this.flash.position.set(.2, -.1, -.8);
    this.holder = new THREE.Group(); this.scene.add(this.holder);
    this.models = {}; this.cur = null; this.cd = 0; this.reloadT = 0; this.kick = 0; this.swing = 0; this.aim = 0; this.fx = [];
    const fm = new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: .9, depthWrite: false });
    this.muzzle = new THREE.Mesh(new THREE.ConeGeometry(.05, .18, 6), fm); this.muzzle.rotation.x = -Math.PI / 2; this.muzzle.visible = false;
  }
  weapon() { const s = this.g.S.inv[this.g.S.sel]; const id = s && ITEMS[s.id]?.weapon; return id && WEAPONS[id] ? id : null; }
  model(id) {
    if (this.models[id]) return this.models[id];
    const tpl = this.g.W.bp['w_' + id]; if (!tpl) return null;
    const o = tpl.clone(true);
    o.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.fog = false; m.castShadow = false; } });
    const g = new THREE.Group(); g.add(o); this.models[id] = g; return g;
  }
  ammoLeft(id) { const w = WEAPONS[id]; return w.ammoItem ? this.g.count(w.ammoItem) : (this.g.S.ammo[id] || 0); }
  hud() {
    const id = this.weapon(); if (!id) return '';
    const w = WEAPONS[id]; if (w.melee) return `${w.name}`;
    return `${w.name} · ${this.g.S.mag[id] || 0} / ${this.ammoLeft(id)}${this.reloadT > 0 ? ' · lädt …' : ''}`;
  }
  // ammo boxes: picked up → spare rounds (no backpack slot)
  addAmmo(item) { const [w, n] = ITEMS[item].ammo; this.g.S.ammo[w] = (this.g.S.ammo[w] || 0) + n; this.g.ui.toast(`+ ${n} Schuss für ${WEAPONS[w].name}`); return true; }
  reload() {
    const id = this.weapon(), g = this.g; if (!id) return; const w = WEAPONS[id]; if (w.melee || this.reloadT > 0) return;
    const have = this.ammoLeft(id), need = w.mag - (g.S.mag[id] || 0); if (need <= 0) return; if (!have) return g.ui.toast('Keine Munition mehr.', 'warn');
    this.reloadT = w.reload; this.reloadId = id; g.audio.sfx('reload');
  }
  finishReload() {
    const id = this.reloadId, w = WEAPONS[id], g = this.g, need = w.mag - (g.S.mag[id] || 0), k = Math.min(need, this.ammoLeft(id));
    if (w.ammoItem) g.take(w.ammoItem, k); else g.S.ammo[id] -= k; g.S.mag[id] = (g.S.mag[id] || 0) + k;
  }
  fire() {
    const g = this.g, id = this.weapon(); if (!id || this.cd > 0 || this.reloadT > 0) return false;
    const w = WEAPONS[id], cam = this.cam;
    if (w.melee) { this.cd = w.cd; this.swing = 1; g.audio.sfx('swing');
      const a = this.pick(cam.position, g.P.forward(dir), w.range, 0); if (a) { this.wound(a, w.dmg, a.hitP); } return true; }
    if (!(g.S.mag[id] > 0)) { g.audio.sfx('click'); if (this.ammoLeft(id)) this.reload(); else g.ui.toast('Leer – keine Munition.', 'warn'); this.cd = .3; return false; }
    g.S.mag[id]--; this.cd = w.cd; this.kick = 1; g.audio.sfx(w.sound);
    if (!w.ammoItem) { this.flash.intensity = 30; this.muzzleT = .06; }
    const f = g.P.forward(new THREE.Vector3()), n = w.pellets || 1, hits = new Map();
    for (let i = 0; i < n; i++) {
      const sp = (w.spread || 0) * (this.aim > .5 ? .35 : 1) * (g.P.sprint ? 2.5 : 1);
      dir.copy(f).add(tmp.set((Math.random() - .5) * 2 * sp, (Math.random() - .5) * 2 * sp, (Math.random() - .5) * 2 * sp)).normalize();
      const a = this.pick(cam.position, dir, w.range, 1);
      if (a) hits.set(a, (hits.get(a) || 0) + w.dmg);
      else { const h = g.W.rayHit(cam.position, dir, w.range); if (h) this.puff(h.point, '#b8b0a0'); }
    }
    let killed = 0;
    for (const [a, d] of hits) { if (id === 'bogen') a.arrows = (a.arrows || 0) + 1; if (this.wound(a, d, a.hitP)) killed++; }
    if (id !== 'bogen') g.life.noise(g.P.pos, id === 'gewehr' ? 120 : 70);
    return true;
  }
  // nearest animal along the ray (two spheres per body), not behind a wall
  pick(o, d, range, gun) {
    const g = this.g, wall = g.W.rayHit(o, d, range), far = wall ? wall.distance : range; let best = null, bt = far;
    ray.set(o, d);
    for (const a of g.life.animals) {
      if (a.state === 'dead') continue; const K = KIND[a.kind];
      const fx = Math.sin(a.heading), fz = Math.cos(a.heading);
      for (const s of [-.3, .3]) {
        c1.set(a.pos.x + fx * K.len * s, a.pos.y + K.hy, a.pos.z + fz * K.len * s);
        const t = ray.intersectSphere(new THREE.Sphere(c1, K.r + (gun ? 0 : .25)), tmp); if (!t) continue;
        const dd = t.distanceTo(o); if (dd < bt) { bt = dd; best = a; a.hitP = t.clone(); }
      }
    }
    return best;
  }
  wound(a, dmg, p) {
    const g = this.g; this.puff(p || a.pos, '#9a1a12', 8); g.ui.hitmark?.();
    const dead = g.life.hit(a, dmg);
    if (dead) g.ui.toast({ wolf: '🐺 Wolf erlegt.', boar: '🐗 Wildschwein erlegt.', bear: '🐻 Bär erlegt!', deer: '🦌 Reh erlegt.' }[a.kind] + ' Mit Messer zerlegen (E).', 'good');
    return dead;
  }
  puff(p, col, n = 5) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, .05), new THREE.MeshBasicMaterial({ color: col, transparent: true }));
      m.position.copy(p); this.g.scene.add(m);
      this.fx.push({ m, v: new THREE.Vector3((Math.random() - .5) * 2, Math.random() * 2, (Math.random() - .5) * 2), t: .5 });
    }
  }
  update(dt, brightness, aimHeld) {
    const g = this.g, id = this.weapon();
    this.cd -= dt; if (this.reloadT > 0) { this.reloadT -= dt; if (this.reloadT <= 0) this.finishReload(); }
    if (this.muzzleT > 0) { this.muzzleT -= dt; if (this.muzzleT <= 0) this.flash.intensity = 0; }
    this.aim += ((aimHeld && id && !WEAPONS[id].melee ? 1 : 0) - this.aim) * Math.min(1, dt * 10);
    this.kick = Math.max(0, this.kick - dt * 6); this.swing = Math.max(0, this.swing - dt * 3);
    for (const f of [...this.fx]) { f.t -= dt; f.v.y -= 9 * dt; f.m.position.addScaledVector(f.v, dt); f.m.material.opacity = f.t * 2; if (f.t <= 0) { this.g.scene.remove(f.m); f.m.geometry.dispose(); this.fx.splice(this.fx.indexOf(f), 1); } }
    // held model
    if (id !== this.cur) { this.holder.clear(); this.cur = id; const m = id && this.model(id); if (m) this.holder.add(m); if (m && id !== 'messer' && id !== 'bogen') m.add(this.muzzle); }
    this.holder.visible = !!id && !g.build?.ghost;
    if (!this.holder.visible) return;
    const m = this.holder.children[0]; if (!m) return;
    const P = g.P, h = HOLD[id] || HOLD.pistole, bob = Math.sin(P.bob * 2) * .01, sway = Math.cos(P.bob) * .012;
    const aimX = this.aim * -h[0], aimY = this.aim * (-h[1] - .07);
    m.position.set(h[0] + aimX + sway, h[1] + aimY + bob - (this.reloadT > 0 ? .12 * Math.sin(Math.min(1, this.reloadT / WEAPONS[id].reload) * Math.PI) : 0), h[2] + this.kick * .06);
    m.rotation.set(this.kick * .25 + (this.reloadT > 0 ? .5 * Math.sin(Math.min(1, this.reloadT / WEAPONS[id].reload) * Math.PI) : 0), 0, id === 'messer' ? -this.swing * 1.2 : 0);
    if (id === 'messer') { m.position.x -= this.swing * .15; m.rotation.x -= this.swing * .8; }
    // Blender models point +y (= −z in three after the axis swap the GLB already did) – the template is already in three axes
    this.muzzle.visible = this.muzzleT > 0; this.muzzle.position.set(0, .07, id === 'pistole' ? -.22 : -.75);
    this.holder.position.copy(this.cam.position); this.holder.quaternion.copy(this.cam.quaternion);
    this.hemi.intensity = .5 + 2.0 * brightness; this.sun.intensity = .2 + 1.4 * brightness;
    const zoom = id === 'gewehr' && this.aim > .9; this.scope = zoom;
    if (zoom) this.holder.visible = false;
  }
  render(renderer) {
    if (!this.holder.visible || !this.holder.children.length) return;
    renderer.autoClear = false; renderer.clearDepth(); renderer.render(this.scene, this.cam); renderer.autoClear = true;
  }
}
