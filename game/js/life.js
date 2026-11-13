// Creatures and events: wolves (night), deer (day), a car passing on the road at night, campfires.
// All built from low-poly primitives with flat shading (same look as the Blender map).
import * as THREE from 'three';
import { B } from './world.js';

const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: .9, ...o });
function bx(w, h, d, m, x = 0, y = 0, z = 0) { const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); g.position.set(x, y, z); g.castShadow = true; return g; }

// road centre (Blender x as a function of Blender y) – same as core.py road_x
export function roadX(y) { if (y > 30) return -6 - 0.006 * (y - 30) ** 2; if (y < -30) return -6 + 0.0045 * (y + 30) ** 2; return -6; }
export function creekX(y) { return 70 + 6 * Math.sin(y / 22); }

// ---------------------------------------------------------------- animals
function buildAnimal(kind) {
  const g = new THREE.Group(), legs = [];
  if (kind === 'wolf') {
    const fur = M('#6d6a66'), dark = M('#3f3c39'), eye = new THREE.MeshBasicMaterial({ color: '#ffd23a' });
    g.add(bx(.36, .36, 1.0, fur, 0, .62, 0), bx(.4, .42, .4, fur, 0, .66, -.35), bx(.26, .26, .3, fur, 0, .82, -.66), bx(.14, .12, .22, dark, 0, .76, -.86));
    for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(.06, .14, 4), dark); ear.position.set(s * .08, 1.0, -.62); g.add(ear);
      const e = new THREE.Mesh(new THREE.SphereGeometry(.025, 6, 4), eye); e.position.set(s * .08, .86, -.81); g.add(e); }
    const tail = bx(.1, .1, .5, dark, 0, .62, .65); tail.rotation.x = .6; g.add(tail);
    for (const [x, z] of [[-.12, -.35], [.12, -.35], [-.12, .35], [.12, .35]]) { const p = new THREE.Group(); p.position.set(x, .5, z); p.add(bx(.1, .5, .1, dark, 0, -.25, 0)); g.add(p); legs.push(p); }
  } else {
    const fur = M('#8a5a34'), light = M('#e8dcc4'), dark = M('#3a2a1c');
    g.add(bx(.4, .45, 1.1, fur, 0, .95, 0), bx(.26, .5, .26, fur, 0, 1.3, -.55), bx(.22, .24, .38, fur, 0, 1.55, -.72), bx(.16, .14, .1, light, 0, .98, .55));
    for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(.07, .2, 4), fur); ear.position.set(s * .12, 1.74, -.62); ear.rotation.z = -s * .5; g.add(ear); }
    if (Math.random() < .5) for (const s of [-1, 1]) { const a = bx(.03, .4, .03, M('#c9b38a'), s * .1, 1.9, -.62); a.rotation.z = s * .35; g.add(a); }
    for (const [x, z] of [[-.13, -.4], [.13, -.4], [-.13, .4], [.13, .4]]) { const p = new THREE.Group(); p.position.set(x, .75, z); p.add(bx(.08, .75, .08, dark, 0, -.37, 0)); g.add(p); legs.push(p); }
  }
  g.userData.legs = legs; return g;
}

export class Life {
  constructor(scene, world, game) { this.scene = scene; this.W = world; this.g = game; this.animals = []; this.fires = []; this.car = null; this.nextCarAbs = 20.5; this.howlT = 0;
    // one headlight spot that always exists (adding lights later would recompile every shader)
    this.carLight = new THREE.SpotLight('#fff3d8', 0, 45, .5, .5, 1.2); scene.add(this.carLight, this.carLight.target); }
  forestSpot(near, rmin, rmax) {
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * 6.283, d = rmin + Math.random() * (rmax - rmin);
      const x = near.x + Math.cos(a) * d, z = near.z + Math.sin(a) * d, by = -z;
      if (Math.abs(x) > 105 || Math.abs(z) > 105) continue;
      if (Math.abs(x - roadX(by)) < 9 || (x > -6 && x < 50 && by > -30 && by < 32)) continue;
      return new THREE.Vector3(x, this.W.groundY(x, z), z);
    }
    return null;
  }
  spawn(kind, near) {
    const p = this.forestSpot(near, kind === 'wolf' ? 45 : 25, kind === 'wolf' ? 65 : 70); if (!p) return;
    const mesh = buildAnimal(kind); mesh.position.copy(p); this.scene.add(mesh);
    this.animals.push({ kind, mesh, pos: p, heading: Math.random() * 6.28, speed: 0, state: 'roam', t: 0, cool: 0, wander: Math.random() * 6.28, phase: 0 });
  }
  scared(a, P) {      // is the player defending himself?
    const g = this.g, toA = a.pos.clone().sub(P.pos), d = toA.length();
    if (g.S.flags.flashOn && g.S.battery > 0 && d < 20) { const f = P.forward(); toA.y = 0; f.y = 0; if (f.normalize().dot(toA.normalize()) > .93) return true; }
    if (g.torchOn && d < 10) return true;
    for (const f of this.fires) if (f.on && f.pos.distanceTo(a.pos) < 7) return true;
    return false;
  }
  update(dt, P, dark) {
    const g = this.g, inside = g.insideShop(P.pos), high = P.pos.y - this.W.groundY(P.pos.x, P.pos.z, P.pos.y - .5) > 2.5 || g.onHochsitz;
    // spawning
    const wolves = this.animals.filter(a => a.kind === 'wolf'), deer = this.animals.filter(a => a.kind === 'deer');
    const grace = g.S.day === 1 && g.S.time > 12 && g.S.time < 21;          // first evening: time for the tutorial
    const maxW = dark > .75 && !grace ? Math.min(4, 2 + (g.S.day - 1)) : 0;
    if (wolves.length < maxW && Math.random() < dt * .05) { this.spawn('wolf', P.pos); if (!g.S.flags.wolfIntro) { g.S.flags.wolfIntro = 1; g.audio.sfx('howl'); g.ui.toast('Ein Heulen im Wald … Wölfe! Bleib im Licht, leuchte sie mit der Lampe an oder geh nach drinnen.', 'warn'); } }
    if (dark < .35 && deer.length < 3 && Math.random() < dt * .1) this.spawn('deer', P.pos);
    this.howlT -= dt; if (wolves.length && this.howlT < 0) { this.howlT = 25 + Math.random() * 40; g.audio.sfx('howl'); }
    for (const a of [...this.animals]) {
      const to = P.pos.clone().sub(a.pos); to.y = 0; const d = to.length(); a.t -= dt; a.cool -= dt;
      let want = 0, dirA = a.heading;
      if (a.kind === 'wolf') {
        if (dark < .5) a.state = 'leave';
        else if (this.scared(a, P)) { if (a.state !== 'flee') g.audio.sfx('growl'); a.state = 'flee'; a.t = 4; }
        else if (a.state === 'flee' && a.t > 0) { }
        else if (!inside && !high && d < 55 && !g.S.flags.won) a.state = 'hunt';
        else a.state = d < 30 ? 'circle' : 'roam';
        if (a.state === 'hunt') { dirA = Math.atan2(to.x, to.z); want = d > 8 ? 5.5 : 3.2;
          if (d < 1.6) { want = 0; if (a.cool < 0) { a.cool = 2; g.hurt(9, 'Wolf'); g.audio.sfx('bite'); a.state = 'flee'; a.t = 1.8 + Math.random(); } } }   // hit and run
        else if (a.state === 'flee' || a.state === 'leave') { dirA = Math.atan2(-to.x, -to.z); want = 6.5; if (d > 80) { this.remove(a); continue; } }
        else if (a.state === 'circle') { dirA = Math.atan2(to.x, to.z) + Math.PI / 2 * (d < 12 ? 1.4 : 1); want = 2.2; }
        else { if (Math.random() < dt * .3) a.wander += (Math.random() - .5) * 2; dirA = a.wander; want = 1.4; if (d > 110) { this.remove(a); continue; } }
      } else {
        if (dark > .6) { dirA = Math.atan2(-to.x, -to.z); want = 3; if (d > 90) { this.remove(a); continue; } }
        else if (d < 16) { a.state = 'flee'; a.t = 5; }
        if (a.state === 'flee' && a.t > 0) { dirA = Math.atan2(-to.x, -to.z); want = 7.5; }
        else { a.state = 'graze'; if (Math.random() < dt * .2) a.wander += (Math.random() - .5) * 2; dirA = a.wander; want = Math.sin(performance.now() / 3000 + a.mesh.id) > .3 ? .8 : 0; }
        if (d > 120) { this.remove(a); continue; }
      }
      // steer, avoid trunks, the shop and the map edge
      let dh = ((dirA - a.heading + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      a.heading += Math.max(-3 * dt, Math.min(3 * dt, dh)); a.speed += (want - a.speed) * Math.min(1, dt * 3);
      a.pos.x += Math.sin(a.heading) * a.speed * dt; a.pos.z += Math.cos(a.heading) * a.speed * dt;
      for (const t of this.W.treesNear(a.pos.x, a.pos.z)) { const dx = a.pos.x - t.x, dz = a.pos.z - t.z, dd = Math.hypot(dx, dz), m = t.r + .45;
        if (dd < m && dd > 1e-4) { a.pos.x = t.x + dx / dd * m; a.pos.z = t.z + dz / dd * m; } }
      if (a.pos.x > 20.3 && a.pos.x < 37.7 && a.pos.z > -10.7 && a.pos.z < 10.7) { // keep out of the shop
        const ex = [a.pos.x - 20.3, 37.7 - a.pos.x, a.pos.z + 10.7, 10.7 - a.pos.z], i = ex.indexOf(Math.min(...ex));
        if (i === 0) a.pos.x = 20.3; else if (i === 1) a.pos.x = 37.7; else if (i === 2) a.pos.z = -10.7; else a.pos.z = 10.7; }
      a.pos.x = Math.max(-108, Math.min(108, a.pos.x)); a.pos.z = Math.max(-108, Math.min(108, a.pos.z));
      a.pos.y += (this.W.groundY(a.pos.x, a.pos.z, a.pos.y + 1.5) - a.pos.y) * Math.min(1, dt * 10);
      a.mesh.position.copy(a.pos); a.mesh.rotation.y = a.heading + Math.PI;
      a.phase += a.speed * dt * 3.2; const sw = Math.min(.7, a.speed * .12);
      a.mesh.userData.legs.forEach((l, i) => l.rotation.x = Math.sin(a.phase + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * sw);
    }
    this.updateCar(dt, P, dark);
    for (const f of this.fires) this.animateFire(f, dt);
  }
  remove(a) { this.scene.remove(a.mesh); this.animals.splice(this.animals.indexOf(a), 1); }
  clear() { for (const a of [...this.animals]) this.remove(a); }

  // ---------------------------------------------------------------- passing car at night
  buildCar() {
    const g = new THREE.Group(), paint = M(['#8c1f1f', '#2b2b2e', '#d8d8d2'][Math.floor(Math.random() * 3)], { roughness: .4, metalness: .4 });
    g.add(bx(1.8, .6, 4.3, paint, 0, .6, 0), bx(1.6, .55, 2.2, paint, 0, 1.15, .2), bx(1.55, .45, 2.0, M('#1a2228', { roughness: .1 }), 0, 1.17, .2));
    for (const [x, z] of [[-.85, -1.3], [.85, -1.3], [-.85, 1.3], [.85, 1.3]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.33, .33, .22, 10), M('#151515')); w.rotation.z = Math.PI / 2; w.position.set(x, .33, z); g.add(w); }
    const hl = new THREE.MeshBasicMaterial({ color: '#fff6dc' }), tl = new THREE.MeshBasicMaterial({ color: '#ff2a1a' });
    for (const s of [-1, 1]) { g.add(bx(.35, .14, .05, hl, s * .6, .7, -2.16)); g.add(bx(.3, .14, .05, tl, s * .65, .75, 2.16)); }
    return g;
  }
  updateCar(dt, P, dark) {
    const g = this.g;
    if (!this.car && dark > .7 && g.S.abs > this.nextCarAbs) {
      const north = Math.random() < .5, mesh = this.buildCar(); this.scene.add(mesh);
      this.car = { mesh, y: north ? 108 : -108, dir: north ? -1 : 1, v: 16, honk: 0 };
      this.nextCarAbs = g.S.abs + 1.5 + Math.random() * 2.5; g.audio.sfx('car');
    }
    if (!this.car) { this.carLight.intensity = 0; return; }
    const c = this.car, lane = c.dir > 0 ? 1.75 : -1.75;   // right-hand traffic: northbound in the east lane
    // stop for the player standing on the road ahead
    const pb = { x: P.pos.x, y: -P.pos.z }, ahead = (pb.y - c.y) * c.dir;
    const onRoad = Math.abs(pb.x - roadX(pb.y)) < 4.5;
    const want = onRoad && ahead > 0 && ahead < 16 ? 0 : 16;
    c.v += (want - c.v) * Math.min(1, dt * (want ? 1 : 4));
    if (want === 0 && c.v < 1) { c.honk -= dt; if (c.honk < 0) { g.audio.sfx('horn'); c.honk = 2.5; } }
    c.y += c.dir * c.v * dt;
    c.mesh.position.copy(B(roadX(c.y) + lane, c.y, .1));
    c.mesh.lookAt(B(roadX(c.y + c.dir * 3) + lane, c.y + c.dir * 3, .1)); c.mesh.rotateY(Math.PI);
    c.mesh.updateMatrixWorld(); this.carLight.intensity = 80;
    this.carLight.position.copy(new THREE.Vector3(0, .8, -2.3).applyMatrix4(c.mesh.matrixWorld));
    this.carLight.target.position.copy(new THREE.Vector3(0, 0, -16).applyMatrix4(c.mesh.matrixWorld));
    if (Math.abs(c.y) > 112) { this.scene.remove(c.mesh); this.car = null; }
  }

  // ---------------------------------------------------------------- campfires
  addFire(pos, fuel = 6, withRing = true) {
    const g = new THREE.Group(); g.position.copy(pos);
    if (withRing) for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, s = new THREE.Mesh(new THREE.DodecahedronGeometry(.18, 0), M('#7d7a74')); s.position.set(Math.cos(a) * .6, .08, Math.sin(a) * .6); g.add(s); }
    for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .8, 6), M('#4a3020')); l.rotation.z = Math.PI / 2; l.rotation.y = i * 2.1; l.position.y = .12; g.add(l); }
    const flames = [];
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(.18 - i * .03, .7 - i * .1, 5), new THREE.MeshBasicMaterial({ color: i % 2 ? '#ffb030' : '#ff6a1a', transparent: true, opacity: .9 }));
      f.position.set((Math.random() - .5) * .2, .45, (Math.random() - .5) * .2); g.add(f); flames.push(f); }
    this.scene.add(g);
    const fire = { mesh: g, pos: pos.clone(), fuel, on: true, flames, light: { pos: pos.clone().add(new THREE.Vector3(0, .8, 0)), color: new THREE.Color('#ff8a3a'), power: 60, group: 'fire', flicker: 1 } };
    this.fires.push(fire); this.g.extraLights.push(fire.light); return fire;
  }
  animateFire(f, dt) {
    f.fuel -= dt / 60;                       // fuel in real minutes
    if (f.on && f.fuel <= 0) { f.on = false; this.g.ui.toast('Ein Feuer ist ausgegangen.'); }
    f.flames.forEach((m, i) => { m.visible = f.on; const s = .8 + .3 * Math.sin(performance.now() / (90 + i * 23) + i); m.scale.set(s, .7 + .5 * Math.abs(Math.sin(performance.now() / (130 + i * 31))), s); });
    f.light.power = f.on ? 55 + 15 * Math.sin(performance.now() / 70) : 0;
  }
}
