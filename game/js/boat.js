// The rowing boat on the forest lake (Blender: Ruderboot, interact use='boot'): E = get in, W/S row forward / back, A/D turn,
// the mouse looks around, E = get out onto the jetty, the island or any shore within reach. It is the only way to the island
// (deep water cannot be waded). The boat stops in shallow water and at the jetty posts. Position and heading are saved (S.boat).
import * as THREE from 'three';

const up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion();

export class Boat {
  constructor(game) {
    this.g = game; const it = game.byName.Ruderboot; this.it = it; this.ok = !!it; if (!it) return;
    this.y0 = it.pivot.position.y; this.q0 = it.pivot.quaternion.clone(); this.a0 = it.u.boat_yaw || 0;
    this.pos = it.pivot.position.clone(); this.yaw = this.a0; this.v = 0; this.turn = 0; this.on = false; this.strokeT = 0; this.t = Math.random() * 6;
  }
  dir(out = new THREE.Vector3()) { return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }
  verb() { return this.on ? '[E] Aussteigen' : '[E] Ins Ruderboot steigen'; }
  enter() {
    const g = this.g; if (g.vehicle?.driving) return;
    this.on = true; this.v = 0; g.P.vel.set(0, 0, 0); g.P.yaw = this.yaw; g.P.pitch = -.08; g.audio.sfx('row');
    g.ui.toast('🚣 W / S rudern, A / D drehen, Maus: umsehen, E: aussteigen (am Steg, an der Insel oder am Ufer).');
    if (!g.S.flags.rowed) { g.S.flags.rowed = 1; g.progress.add(15, 'Ruderboot'); }
  }
  // a free spot on land (or the jetty) next to the boat – the one you look at first
  landing() {
    const g = this.g, W = g.W, P = g.P, f = P.forward(new THREE.Vector3()); f.y = 0; f.normalize(); let best = null, bs = -1e9;
    for (let r = 1.6; r <= 3.6; r += .4) for (let a = 0; a < 6.283; a += .26) {
      const p = new THREE.Vector3(this.pos.x + Math.cos(a) * r, 0, this.pos.z + Math.sin(a) * r);
      p.y = W.groundY(p.x, p.z, this.y0 + 3); if (p.y < this.y0 + .04 || p.y > this.y0 + 1.6) continue;
      p.y += .02; if (!P.free(p)) continue;
      const d = p.clone().sub(this.pos); d.y = 0; const score = d.normalize().dot(f) * 2 - r * .3;
      if (score > bs) { bs = score; best = p; }
    }
    return best;
  }
  exit() {
    const g = this.g, p = this.landing();
    if (!p) { g.audio.sfx('error'); return g.ui.toast('Hier kommst du nicht an Land – ruder näher ans Ufer, an den Steg oder an die Insel.'); }
    this.on = false; this.v = 0; g.P.setPose(p, g.P.yaw); g.audio.sfx('row');
  }
  // something in the way at water level? shallow ground or the jetty / posts (static collider)
  blocked(from, d, dist) {
    const W = this.g.W, ahead = from.clone().addScaledVector(d, dist);
    if (W.groundY(ahead.x, ahead.z, this.y0 + 3) > this.y0 - .35) return true;
    const o = from.clone(); o.y = this.y0 + .25; return !!W.rayHit(o, d, dist);
  }
  update(dt, keys) {
    if (!this.ok) return; const g = this.g, it = this.it; this.t += dt;
    const bob = .03 * Math.sin(this.t * 1.7), roll = .025 * Math.sin(this.t * 1.3);
    if (this.on) {
      const fw = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), st = (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0);
      this.v += (fw * 2.4 - this.v) * Math.min(1, dt * (fw ? .9 : .5));
      this.turn += (st * .75 - this.turn) * Math.min(1, dt * 3); this.yaw += this.turn * dt;
      const d = this.dir(), step = this.v * dt;
      if (Math.abs(step) > 1e-4) {
        const sg = Math.sign(step), probe = this.dir().multiplyScalar(sg);
        if (this.blocked(this.pos, probe, 1.7 + Math.abs(step))) { if (Math.abs(this.v) > 1) g.audio.sfx('thud'); this.v = -this.v * .2; }
        else { this.pos.addScaledVector(d, step); g.progress.stat('row', Math.abs(step)); }
      }
      if ((fw || st) && (this.strokeT -= dt) < 0) { this.strokeT = 1.1; g.audio.sfx('row'); }
      // seat: the camera sits in the boat (mouse = look around)
      const P = g.P; P.pos.set(this.pos.x, this.y0 + .15 + bob, this.pos.z).addScaledVector(d, -.35); P.pos.y -= P.eye - .95; P.vel.set(0, 0, 0); P.sync();
    }
    q.setFromAxisAngle(up, this.yaw - this.a0); it.pivot.quaternion.copy(q).multiply(this.q0);
    it.pivot.rotateOnAxis(new THREE.Vector3(1, 0, 0), roll);
    it.pivot.position.set(this.pos.x, this.y0 + bob, this.pos.z); it.pivot.updateMatrixWorld(true);
    it.center?.copy(it.pivot.position); it.basePos = it.pivot.position.clone(); it.baseQuat = it.pivot.quaternion.clone();
  }
  save() { return { x: +this.pos.x.toFixed(2), z: +this.pos.z.toFixed(2), yaw: +this.yaw.toFixed(3) }; }
  load(d) { if (!this.ok || !d) return; this.pos.set(d.x, this.y0, d.z); this.yaw = d.yaw ?? this.a0; this.update(0, {}); }
}
