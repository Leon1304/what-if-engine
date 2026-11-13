// First-person player: capsule (r 0.32, 1.75 m) against the static BVH, the movers' own BVHs (doors …) and tree trunks.
// WASD, mouse look, Shift sprint (stamina), Ctrl crouch, Space jump, head bob, footsteps per surface, fall damage, ladders.
import * as THREE from 'three';

const tp = new THREE.Vector3(), cp = new THREE.Vector3(), dir = new THREE.Vector3(), inv = new THREE.Matrix4();
const box = new THREE.Box3(), seg = new THREE.Line3(), s0 = new THREE.Vector3(), w0 = new THREE.Vector3(), w1 = new THREE.Vector3();

export class Player {
  constructor(camera, world, audio) {
    this.cam = camera; this.W = world; this.audio = audio;
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0; this.r = .32; this.h = 1.75; this.eyeH = 1.62; this.eye = 1.62;
    this.keys = {}; this.onGround = false; this.stepAcc = 0; this.bob = 0; this.crouch = false; this.sprint = false;
    this.locked = false; this.climb = null; this.fallV = 0; this.zoom = false;
    this.flash = new THREE.SpotLight('#fff2d8', 0, 34, .45, .45, 1.4); this.flash.castShadow = false;
    this.flash.position.set(.18, -.15, 0); this.flash.target.position.set(0, -.1, -5);
    camera.add(this.flash); camera.add(this.flash.target);
    this.torch = new THREE.PointLight('#ff9a40', 0, 14, 1.6); this.torch.position.set(.25, -.1, -.4); camera.add(this.torch);
  }
  setPose(p, yaw = 0) { this.pos.copy(p); this.vel.set(0, 0, 0); this.yaw = yaw; this.pitch = 0; this.sync(0); }
  look(dx, dy) {
    const s = this.zoom ? .0007 : .0022;
    this.yaw -= dx * s; this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch - dy * s));
  }
  forward(out = new THREE.Vector3()) { return out.set(0, 0, -1).applyQuaternion(this.cam.quaternion); }
  collide(bvh, matrix) {
    const r = this.r, p = this.pos;
    seg.start.set(p.x, p.y + r, p.z); seg.end.set(p.x, p.y + this.h - r, p.z);
    if (matrix) { inv.copy(matrix).invert(); seg.start.applyMatrix4(inv); seg.end.applyMatrix4(inv); }
    s0.copy(seg.start);
    box.makeEmpty(); box.expandByPoint(seg.start); box.expandByPoint(seg.end); box.min.addScalar(-r); box.max.addScalar(r);
    let ground = false;
    bvh.shapecast({
      intersectsBounds: b => b.intersectsBox(box),
      intersectsTriangle: tri => {
        const d = tri.closestPointToSegment(seg, tp, cp);
        if (d < r) {
          const depth = r - d; dir.subVectors(cp, tp).normalize();
          if (dir.y > .62) { seg.start.y += depth / dir.y; seg.end.y += depth / dir.y; ground = true; }      // walkable: push straight up, no sliding
          else { seg.start.addScaledVector(dir, depth); seg.end.addScaledVector(dir, depth); }
        }
      }
    });
    if (matrix) { w0.copy(s0).applyMatrix4(matrix); w1.copy(seg.start).applyMatrix4(matrix); } else { w0.copy(s0); w1.copy(seg.start); }
    const dx = w1.x - w0.x, dy = w1.y - w0.y, dz = w1.z - w0.z;
    if (ground || (dy > 1e-4 && dy > Math.hypot(dx, dz))) { this.onGround = true; if (this.vel.y < 0) { this.fallV = Math.min(this.fallV, this.vel.y); this.vel.y = 0; } }
    else if (dy < -1e-4 && this.vel.y > 0) this.vel.y = 0;        // head bump
    p.x += dx; p.y += dy; p.z += dz;
  }
  resolve() {
    this.collide(this.W.collider.geometry.boundsTree, null);
    for (const it of this.W.movers) {
      if (!it.bvhGeo || it.node.visible === false) continue;
      if (it.pivot.position.distanceToSquared(this.pos) > 36) continue;
      this.collide(it.bvhGeo.boundsTree, it.pivot.matrixWorld);
    }
    for (const t of this.W.treesNear(this.pos.x, this.pos.z)) {
      const dx = this.pos.x - t.x, dz = this.pos.z - t.z, d = Math.hypot(dx, dz), m = t.r + this.r;
      if (d < m && d > 1e-5) { this.pos.x = t.x + dx / d * m; this.pos.z = t.z + dz / d * m; }
    }
  }
  update(dt, g) {
    if (this.climb) { this.updateClimb(dt); return; }
    const k = this.keys, fw = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0), st = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0);
    this.crouch = !!(k.ControlLeft || k.KeyC && false);
    const wantSprint = !!(k.ShiftLeft || k.ShiftRight) && fw > 0 && !this.crouch;
    this.sprint = wantSprint && g.stats.stamina > 1;
    const speed = this.crouch ? 1.5 : this.sprint ? 6.2 : 3.3;
    const wish = new THREE.Vector3(st, 0, -fw);
    if (wish.lengthSq() > 0) wish.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw).multiplyScalar(speed * g.slow);
    const acc = this.onGround ? 14 : 2.5;
    this.vel.x += (wish.x - this.vel.x) * Math.min(1, acc * dt); this.vel.z += (wish.z - this.vel.z) * Math.min(1, acc * dt);
    if (k.Space && this.onGround && g.stats.stamina > 8) { this.vel.y = 4.8; this.onGround = false; g.stats.stamina -= 8; k.Space = false; }
    this.vel.y -= 18 * dt;
    const wasGround = this.onGround; this.onGround = false; this.fallV = 0;
    const N = 4;
    for (let i = 0; i < N; i++) { this.pos.addScaledVector(this.vel, dt / N); this.resolve(); }
    if (this.fallV < -10.5) g.hurt((-this.fallV - 10.5) * 9, 'Sturz');
    if (this.pos.y < -30) g.respawnFall();
    // eye height (crouch), head bob, footsteps
    this.eye += ((this.crouch ? 1.0 : this.eyeH) - this.eye) * Math.min(1, dt * 10);
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (this.onGround && hs > .5) {
      this.bob += hs * dt * 1.9; this.stepAcc += hs * dt;
      const stride = this.sprint ? 1.05 : .75;
      if (this.stepAcc > stride) { this.stepAcc = 0; this.audio.step(g.surface(this.pos)); }
    } else this.bob += (Math.round(this.bob / Math.PI) * Math.PI - this.bob) * Math.min(1, dt * 6);
    if (!wasGround && this.onGround && this.fallV < -4) this.audio.step(g.surface(this.pos));
    this.sync(dt);
  }
  sync() {
    const bobY = Math.sin(this.bob * 2) * .035 * (this.sprint ? 1.6 : 1), bobX = Math.cos(this.bob) * .025;
    this.cam.position.set(this.pos.x, this.pos.y + this.eye + bobY, this.pos.z);
    this.cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    this.cam.translateX(bobX);
  }
  startClimb(from, to) { this.climb = { from: from.clone(), to: to.clone(), t: 0 }; this.vel.set(0, 0, 0); }
  updateClimb(dt) {
    const c = this.climb; c.t += dt / 2.2; const t = Math.min(1, c.t), e = t * t * (3 - 2 * t);
    this.pos.lerpVectors(c.from, c.to, e); this.bob += dt * 6;
    if (Math.floor(c.t * 8) !== Math.floor((c.t - dt / 2.2) * 8)) this.audio.step('wood');
    if (t >= 1) this.climb = null;
    this.sync(dt);
  }
}
