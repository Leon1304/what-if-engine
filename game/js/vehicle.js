// Your car: repair it (keilriemen + tool box from the workshop „KFZ Brandt“), fill it up (full canister), then drive.
// E at the car = get in / out. W/S gas + brake/reverse, A/D steer, mouse looks around. Arcade physics: the car follows the ground
// (four wheel heights → pitch/roll), is fast on asphalt and slow in the forest, stops at trunks, walls and built things, runs over animals.
// The car's parts are separate pivots in the GLB (prop vehicle=1): body, trunk lid, driver door, hood, trunk contents.
import * as THREE from 'three';
import { roadX } from './life.js';
import { B } from './world.js';

const up = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ');
const ray = new THREE.Ray();

export class Vehicle {
  constructor(game) {
    this.g = game; const W = game.W;
    this.parts = W.vehicle.map(v => ({ ...v, m0: v.pivot.matrixWorld.clone() }));
    const body = this.parts.find(p => p.name === 'Auto_Panne'); this.body = body;
    this.ok = !!body;
    if (!this.ok) return;
    // car frame: centre of the body on the ground; heading from the trunk lid (back) to the hood (front)
    const bb = new THREE.Box3().setFromObject(body.node), trunk = this.parts.find(p => p.name === 'Auto_Kofferraum'), hood = this.parts.find(p => p.name === 'Auto_Motorhaube');
    this.pos = bb.getCenter(new THREE.Vector3()); this.pos.y = bb.min.y - .05;
    const fwd = hood && trunk ? hood.pivot.position.clone().sub(trunk.pivot.position) : new THREE.Vector3(0, 0, -1);
    this.yaw0 = Math.atan2(-fwd.x, -fwd.z);
    this.root0 = new THREE.Matrix4().compose(this.pos, new THREE.Quaternion().setFromAxisAngle(up, this.yaw0), new THREE.Vector3(1, 1, 1));
    this.rel = this.parts.map(p => new THREE.Matrix4().copy(this.root0).invert().multiply(p.m0));
    this.yaw = this.yaw0; this.v = 0; this.steer = 0; this.pitch = 0; this.roll = 0; this.driving = false;
    this.col = W.addCollider(body.pivot);                    // you bump into the car when on foot
    this.light = new THREE.SpotLight('#fff3d8', 0, 50, .5, .5, 1.2); game.scene.add(this.light, this.light.target);
    this.look = 0; this.lookP = 0;
  }
  get S() { return this.g.S.car || (this.g.S.car = { fixed: 0, fuel: 0 }); }
  verb() {
    const S = this.S, g = this.g;
    if (this.driving) return '[E] Aussteigen';
    if (!S.fixed) return g.has('keilriemen') && g.has('werkzeugkasten') ? '[E] Auto reparieren (Keilriemen + Werkzeugkasten)' : 'Dein Auto – Keilriemen gerissen';
    if (S.fuel <= 0) return g.has('kanister_voll') ? '[E] Tanken (voller Kanister)' : 'Dein Auto – der Tank ist leer (voller Kanister nötig)';
    return `[E] Einsteigen (Tank ${Math.round(S.fuel)} %)`;
  }
  use() {
    const S = this.S, g = this.g, A = g.audio;
    if (!S.fixed) {
      if (!(g.has('keilriemen') && g.has('werkzeugkasten'))) { A.sfx('error'); return g.ui.toast(g.S.flags.carTried ? 'Keilriemen gerissen. In einer Werkstatt gäbe es Ersatz – vielleicht im Dorf?' : (g.S.flags.carTried = 1, 'Der Anlasser orgelt – nichts. Unter der Haube: der Keilriemen ist gerissen. Ersatz + Werkzeug, dann läuft er wieder.')); }
      g.take('keilriemen'); S.fixed = 1; A.sfx('build'); g.progress.add(120, 'Auto repariert');
      return g.ui.toast(S.fuel > 0 ? '🔧 Repariert! Steig ein (E).' : '🔧 Keilriemen gewechselt! Jetzt fehlt nur noch Sprit: voller Kanister (Zapfsäule mit Strom oder Dieselfass).', 'good');
    }
    if (S.fuel <= 0) {
      if (!g.has('kanister_voll')) { A.sfx('error'); return g.ui.toast('Der Tank ist leer. Füll einen Kanister am Dieselfass im Schuppen oder an der Zapfsäule.'); }
      g.swap('kanister_voll', 'kanister'); S.fuel = 100; A.sfx('fuel'); return g.ui.toast('⛽ Getankt (20 Liter reichen für etwa 15 km). Einsteigen mit E.', 'good');
    }
    this.enter();
  }
  enter() {
    const g = this.g; this.driving = true; this.v = 0; g.P.vel.set(0, 0, 0); this.enterYaw = this.yaw; g.P.yaw = this.yaw; g.P.pitch = -.05;
    for (const p of this.parts) if (p.it && ['door', 'lid'].includes(p.it.u.interact)) p.it.target = 0;
    this.camPos = null; this.inside = false; g.audio.sfx('door'); g.audio.sfx('genstart'); g.ui.toast('🚗 W/S Gas und Bremse, A/D lenken, Maus: umsehen, C: Fahrersicht, E: aussteigen.');
  }
  exit() {
    const g = this.g, P = g.P; this.driving = false; this.v = 0;
    const side = new THREE.Vector3(-1.9, 0, .3).applyAxisAngle(up, this.yaw).add(this.pos); side.y = g.W.groundY(side.x, side.z, this.pos.y + 3) + .03;
    P.setPose(side, this.yaw + (P.yaw - this.enterYaw)); if (!P.free()) P.unstick(); g.audio.sfx('door'); this.light.intensity = 0; g.audio.set('engine', 0);
  }
  // place all car parts from the car frame (pos, yaw, pitch, roll)
  pose() {
    q.setFromEuler(e.set(this.pitch, this.yaw, this.roll, 'YXZ'));
    const root = new THREE.Matrix4().compose(this.pos, q, new THREE.Vector3(1, 1, 1)), m = new THREE.Matrix4();
    this.parts.forEach((p, i) => {
      m.multiplyMatrices(root, this.rel[i]); m.decompose(p.pivot.position, p.pivot.quaternion, tmp);
      if (p.it) { p.it.basePos = p.pivot.position.clone(); p.it.baseQuat = p.pivot.quaternion.clone(); p.it.center?.copy(p.pivot.position); if (p.it.open) { p.it.open = 0; } }
      p.pivot.updateMatrixWorld(true);
    });
    this.col.pos.copy(this.pos);
  }
  blocked(from, dir, dist) {
    const W = this.g.W; ray.set(from, dir);
    const h = W.collider.geometry.boundsTree.raycastFirst(ray, THREE.DoubleSide); if (h && h.distance < dist && Math.abs(h.face.normal.y) < .6) return true;
    for (const c of W.dyn) { if (c === this.col || c.pos.distanceTo(from) > c.r + 6) continue;
      const inv = c.obj.matrixWorld.clone().invert(), r2 = ray.clone().applyMatrix4(inv), hh = c.geo.boundsTree.raycastFirst(r2, THREE.DoubleSide); if (hh && hh.distance < dist) return true; }
    for (const t of W.treesNear(from.x + dir.x * dist, from.z + dir.z * dist)) if (Math.hypot(t.x - from.x - dir.x * dist, t.z - from.z - dir.z * dist) < t.r + .5) return true;
    return false;
  }
  update(dt, keys) {
    if (!this.ok) return; const g = this.g, S = this.S;
    if (!this.driving) { this.light.intensity = 0; return; }
    const fw = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), st = (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0);
    const by = -this.pos.z, onRoad = Math.abs(this.pos.x - roadX(by)) < 4.5 || (this.pos.x > -3 && this.pos.x < 38 && by > -24 && by < 26) || (this.pos.x > -70 && this.pos.x < -57 && by > 148 && by < 230);
    const vmax = onRoad ? 24 : 9, fuelOk = S.fuel > 0;
    if (fw > 0 && fuelOk) this.v += (this.v < 0 ? 14 : 7) * dt; else if (fw < 0) this.v -= (this.v > 0 ? 16 : 4) * dt;
    else this.v *= Math.max(0, 1 - dt * (onRoad ? .4 : 1.4));
    this.v = Math.max(-5, Math.min(vmax, this.v)); if (!onRoad && this.v > vmax) this.v -= 10 * dt;
    this.steer += (st * .55 - this.steer) * Math.min(1, dt * 5);
    this.yaw += this.v * Math.tan(this.steer) / 2.6 * dt;
    const dir = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    // collisions in front / behind (bumper height)
    const step = this.v * dt, front = this.pos.clone().addScaledVector(dir, Math.sign(this.v) * 2.1); front.y += .55;
    if (Math.abs(this.v) > .05 && this.blocked(front, dir.clone().multiplyScalar(Math.sign(this.v)), Math.abs(step) + .25)) {
      if (Math.abs(this.v) > 6) { g.audio.sfx('thud'); g.hurt((Math.abs(this.v) - 6) * 3, 'Unfall'); }
      this.v = -this.v * .2;
    } else this.pos.addScaledVector(dir, step);
    S.fuel = Math.max(0, S.fuel - Math.abs(step) / 150);
    if (S.fuel <= 0 && !this._empty) { this._empty = 1; g.ui.toast('⛽ Der Tank ist leer!', 'warn'); }
    if (S.fuel > 0) this._empty = 0;
    // ground: four wheels
    const W = g.W, side = new THREE.Vector3(-dir.z, 0, dir.x), h = (f, s) => { const p = this.pos.clone().addScaledVector(dir, f).addScaledVector(side, s); return W.groundY(p.x, p.z, this.pos.y + 3); };
    const fl = h(1.3, -.8), fr = h(1.3, .8), bl = h(-1.3, -.8), br = h(-1.3, .8), gy = (fl + fr + bl + br) / 4;
    this.pos.y += (gy + .02 - this.pos.y) * Math.min(1, dt * 12);
    this.pitch += (Math.atan2((fl + fr) / 2 - (bl + br) / 2, 2.6) - this.pitch) * Math.min(1, dt * 8);
    this.roll += (Math.atan2((fl + bl) / 2 - (fr + br) / 2, 1.6) * -1 - this.roll) * Math.min(1, dt * 8);
    this.pose();
    // run over animals
    for (const a of g.life.animals) if (a.state !== 'dead' && a.kind !== 'dog' && Math.abs(this.v) > 5 && a.pos.distanceTo(this.pos) < 2.2) { g.life.hit(a, 300); g.audio.sfx('thud'); }
    // chase camera behind the car (mouse turns it around the car, C switches to the driver's seat)
    const P = g.P, seat = new THREE.Vector3(-.4, 1.15, .25).applyQuaternion(q).add(this.pos);
    P.pos.copy(seat).y -= 1.15; P.vel.set(0, 0, 0);
    const look = this.yaw + (P.yaw - this.enterYaw);
    if (this.inside) { P.cam.position.copy(seat); P.cam.rotation.set(P.pitch + this.pitch, look, this.roll * .5, 'YXZ'); }
    else {
      const back = new THREE.Vector3(Math.sin(look), 0, Math.cos(look)).multiplyScalar(6.5), want = this.pos.clone().add(back); want.y = Math.max(this.pos.y, g.W.groundY(want.x, want.z, this.pos.y + 4)) + 2.6 - P.pitch * 4;
      this.camPos = this.camPos ? this.camPos.lerp(want, Math.min(1, dt * 6)) : want.clone();
      P.cam.position.copy(this.camPos); P.cam.lookAt(this.pos.clone().add(new THREE.Vector3(0, 1.2, 0)));
    }
    // headlights at night
    const dark = g.sky.darkness(g.S.time); this.light.intensity = dark > .4 ? 80 : 0;
    this.light.position.copy(new THREE.Vector3(0, .8, -2.2).applyQuaternion(q).add(this.pos)); this.light.target.position.copy(new THREE.Vector3(0, 0, -18).applyQuaternion(q).add(this.pos));
    g.audio.set('engine', .05 + Math.min(.14, Math.abs(this.v) / 140)); g.audio.engineRate?.(Math.abs(this.v));
  }
  hud() { return this.driving ? `🚗 ${Math.round(Math.abs(this.v) * 3.6)} km/h · ⛽ ${Math.round(this.S.fuel)} %` : ''; }
  save() { return { x: +this.pos.x.toFixed(2), y: +this.pos.y.toFixed(2), z: +this.pos.z.toFixed(2), yaw: +this.yaw.toFixed(3) }; }
  load(d) { if (!this.ok || !d) return; this.pos.set(d.x, d.y, d.z); this.yaw = d.yaw; this.pitch = this.roll = 0; this.pose(); }
}
