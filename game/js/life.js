// Creatures and events: wolves (night), wild boars (day, charge when you come close), bears (rare, strong), deer (prey),
// a car passing on the road at night, campfires. Difficulty (DIFF) sets how many enemies come and how hard they bite.
// Animals have hit points: weapons (combat.js) hurt them, dead ones stay as carcass (E with a knife = meat + fur).
// All built from low-poly primitives with flat shading (same look as the Blender map).
import * as THREE from 'three';
import { B } from './world.js';

const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: .9, ...o });
function bx(w, h, d, m, x = 0, y = 0, z = 0) { const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); g.position.set(x, y, z); g.castShadow = true; return g; }

// road centre (Blender x as a function of Blender y) – same as core.py road_x
export function roadX(y) { if (y > 30) return -6 - 0.006 * (y - 30) ** 2; if (y < -30) return -6 + 0.0045 * (y + 30) ** 2; return -6; }
export function creekX(y) { return 70 + 6 * Math.sin(y / 22); }
export const MAP = { x0: -108, x1: 108, y0: -108, y1: 228 };         // walkable map in Blender x / y (ground: −110 … 110, −110 … 230)

// difficulty: max wolves (night), boars, bears; damage factor; boar aggression distance; wolves also at dusk
export const DIFF = {
  aus:    { name: 'Keine Feinde', wolves: 0, boars: 0, bears: 0, dmg: 0, boarAggro: 0, dusk: false },
  leicht: { name: 'Leicht', wolves: 1, boars: 1, bears: 0, dmg: .6, boarAggro: 0, dusk: false },
  mittel: { name: 'Mittel', wolves: 3, boars: 2, bears: 1, dmg: 1, boarAggro: 6, dusk: false },
  schwer: { name: 'Schwer', wolves: 5, boars: 3, bears: 2, dmg: 1.4, boarAggro: 10, dusk: true },
};
const KIND = {          // hit points, bite damage, run speed, body length / height / radius (hit test), loot when butchered
  wolf: { hp: 60, dmg: 9, run: 5.5, len: .9, hy: .65, r: .42, loot: { fleisch: 2, fell: 1 } },
  boar: { hp: 90, dmg: 13, run: 6.2, len: 1.0, hy: .55, r: .45, loot: { fleisch: 4 } },
  bear: { hp: 260, dmg: 24, run: 5.0, len: 1.6, hy: 1.0, r: .8, loot: { fleisch: 6, fell: 2 } },
  deer: { hp: 50, dmg: 0, run: 7.5, len: 1.0, hy: 1.0, r: .45, loot: { fleisch: 3, fell: 1 } },
  rabbit: { hp: 12, dmg: 0, run: 7, len: .3, hy: .2, r: .22, loot: { kaninchen: 1 } },
};
export { KIND };

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
  } else if (kind === 'boar') {
    const fur = M('#4a3a2e'), dark = M('#2a211b'), tusk = M('#efe6d0'), snout = M('#8a6a5a');
    g.add(bx(.5, .5, 1.0, fur, 0, .55, 0), bx(.52, .58, .45, fur, 0, .6, -.3), bx(.36, .36, .38, fur, 0, .55, -.68), bx(.2, .16, .14, snout, 0, .48, -.9), bx(.08, .5, .9, dark, 0, .86, -.05));
    for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.ConeGeometry(.025, .14, 4), tusk); t.position.set(s * .1, .55, -.86); t.rotation.x = -.6; g.add(t);
      const ear = new THREE.Mesh(new THREE.ConeGeometry(.06, .14, 4), dark); ear.position.set(s * .13, .78, -.6); g.add(ear); }
    const tail = bx(.04, .04, .22, dark, 0, .62, .55); tail.rotation.x = .9; g.add(tail);
    for (const [x, z] of [[-.15, -.32], [.15, -.32], [-.15, .32], [.15, .32]]) { const p = new THREE.Group(); p.position.set(x, .35, z); p.add(bx(.1, .35, .1, dark, 0, -.17, 0)); g.add(p); legs.push(p); }
  } else if (kind === 'bear') {
    const fur = M('#5a3f2a'), dark = M('#3a2818'), snout = M('#8a6a4a');
    g.add(bx(.9, .9, 1.6, fur, 0, 1.05, 0), bx(.95, 1.0, .7, fur, 0, 1.15, -.5), bx(.6, .55, .6, fur, 0, 1.25, -1.05), bx(.3, .26, .3, snout, 0, 1.15, -1.4), bx(.12, .1, .08, dark, 0, 1.2, -1.56));
    for (const s of [-1, 1]) { const ear = bx(.16, .16, .1, dark, s * .22, 1.6, -1.0); g.add(ear); }
    for (const [x, z] of [[-.3, -.5], [.3, -.5], [-.3, .55], [.3, .55]]) { const p = new THREE.Group(); p.position.set(x, .7, z); p.add(bx(.26, .7, .3, dark, 0, -.35, 0)); g.add(p); legs.push(p); }
  } else if (kind === 'rabbit') {
    const fur = M('#8a7a68'), light = M('#efe8dc');
    g.add(bx(.18, .18, .3, fur, 0, .17, 0), bx(.13, .13, .14, fur, 0, .27, -.17), bx(.03, .14, .03, fur, -.035, .4, -.15), bx(.03, .14, .03, fur, .035, .4, -.15), bx(.07, .07, .06, light, 0, .2, .17));
  } else if (kind === 'dog') {
    const fur = M('#9a6a3a'), light = M('#efe4d0'), dark = M('#3a2a1c'), collar = M('#c42a26');
    g.add(bx(.28, .3, .75, fur, 0, .5, 0), bx(.3, .32, .3, fur, 0, .55, -.3), bx(.22, .22, .26, fur, 0, .72, -.5), bx(.12, .1, .18, light, 0, .66, -.68), bx(.06, .05, .05, dark, 0, .7, -.78),
      bx(.24, .06, .26, collar, 0, .62, -.4), bx(.2, .26, .4, light, 0, .44, -.2));
    for (const s of [-1, 1]) { const ear = bx(.05, .14, .1, dark, s * .12, .74, -.47); ear.rotation.z = s * .4; g.add(ear); }
    const tail = bx(.06, .06, .35, fur, 0, .62, .48); tail.rotation.x = -.7; tail.name = 'tail'; g.add(tail);
    for (const [x, z] of [[-.09, -.25], [.09, -.25], [-.09, .25], [.09, .25]]) { const p = new THREE.Group(); p.position.set(x, .38, z); p.add(bx(.08, .38, .08, fur, 0, -.19, 0)); g.add(p); legs.push(p); }
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
      if (x < MAP.x0 + 3 || x > MAP.x1 - 3 || by < MAP.y0 + 3 || by > MAP.y1 - 3) continue;
      if (Math.abs(x - roadX(by)) < 9 || (x > -6 && x < 50 && by > -30 && by < 32) || (x > -100 && x < -28 && by > 146 && by < 218)) continue;
      return new THREE.Vector3(x, this.W.groundY(x, z), z);
    }
    return null;
  }
  spawn(kind, near, at) {
    const p = at || this.forestSpot(near, kind === 'deer' ? 25 : 45, kind === 'deer' ? 70 : 70); if (!p) return;
    const mesh = buildAnimal(kind); mesh.position.copy(p); this.scene.add(mesh);
    const a = { kind, mesh, pos: p, heading: Math.random() * 6.28, speed: 0, state: 'roam', t: 0, cool: 0, wander: Math.random() * 6.28, phase: 0, hp: KIND[kind].hp, angry: 0 };
    this.animals.push(a); return a;
  }
  diff() { return DIFF[this.g.S.diff] || DIFF.mittel; }
  // weapon hit (combat.js): damage, reaction, death → carcass
  hit(a, dmg) {
    if (a.state === 'dead') return;
    a.hp -= dmg; a.angry = 20; this.g.audio.sfx(a.kind === 'bear' ? 'roar' : a.kind === 'deer' ? 'none' : 'growl');
    if (a.hp <= 0) { a.state = 'dead'; a.dead = 0; a.speed = 0; a.rotTo = (Math.random() < .5 ? 1 : -1) * Math.PI / 2; this.g.S.flags.hunted = 1; return true; }
    if (a.kind === 'deer') { a.state = 'flee'; a.t = 6; }
    else if (a.kind === 'wolf' && Math.random() < .5) { a.state = 'flee'; a.t = 3; }
    return false;
  }
  noise(pos, r) {          // a gunshot: deer and wolves run, boars and bears come for you (not on easy)
    const D = this.diff();
    for (const a of this.animals) { if (a.state === 'dead') continue; const d = a.pos.distanceTo(pos); if (d > r) continue;
      if (a.kind === 'deer' || (a.kind === 'wolf' && this.g.S.diff !== 'schwer')) { a.state = 'flee'; a.t = 4 + Math.random() * 3; }
      else if (D.boarAggro && (a.kind === 'boar' || a.kind === 'bear') && d < r * .6) a.angry = 12; }
  }
  carcass(o, f) {          // dead animal in front of the player (for E)
    for (const a of this.animals) { if (a.state !== 'dead') continue; const c = a.pos.clone(); c.y += .3; const d = c.sub(o); if (d.length() < 2.8 && d.normalize().angleTo(f) < .45) return a; }
    return null;
  }
  butcher(a) {
    const g = this.g; if (!g.has('messer') && a.kind !== 'rabbit') return g.ui.toast('Zum Zerlegen brauchst du ein Messer.');
    const loot = a.left || { ...KIND[a.kind].loot, ...(a.arrows ? { pfeil: a.arrows } : {}) }, got = [], left = {};
    for (const [k, n] of Object.entries(loot)) { if (g.add(k, n, true)) got.push(`${n}× ${{ fleisch: 'Fleisch', fell: 'Fell', pfeil: 'Pfeil', kaninchen: 'Kaninchen' }[k] || k}`); else left[k] = n; }
    g.audio.sfx('chop'); if (got.length) g.ui.toast(`🔪 Zerlegt: ${got.join(', ')}`);
    if (Object.keys(left).length) { a.left = left; g.ui.toast('Dein Rucksack ist voll – der Rest bleibt liegen.', 'warn'); } else this.remove(a);
  }
  sheltered(P) {           // where enemies do not attack: in buildings (shop, houses, cabin …), high up, in the car
    const g = this.g; return g.insideShop(P.pos) || g.onHochsitz || !!g.indoor?.(P.pos) || !!g.vehicle?.driving;
  }
  scared(a, P) {      // is the player defending himself?
    const g = this.g, toA = a.pos.clone().sub(P.pos), d = toA.length();
    if (g.build?.scaresAt(a.pos) && (a.kind !== 'bear' || g.build.list.some(s => s.type === 'fackelhalter' && s.fuel > 0 && Math.hypot(s.x - a.pos.x, s.z - a.pos.z) < 8))) return true;
    if (a.kind === 'bear') { for (const f of this.fires) if (f.on && f.pos.distanceTo(a.pos) < 7) return true; return false; }
    if (g.S.flags.flashOn && g.S.battery > 0 && d < 20) { const f = P.forward(); toA.y = 0; f.y = 0; if (f.normalize().dot(toA.normalize()) > .93) return true; }
    if (g.torchOn && d < 10) return true;
    for (const f of this.fires) if (f.on && f.pos.distanceTo(a.pos) < 7) return true;
    return false;
  }
  update(dt, P, dark) {
    const g = this.g, D = this.diff(), inside = this.sheltered(P), high = P.pos.y - this.W.groundY(P.pos.x, P.pos.z, P.pos.y - .5) > 2.5 || g.onHochsitz;
    // spawning (difficulty)
    const live = k => this.animals.filter(a => a.kind === k && a.state !== 'dead').length;
    const grace = g.S.day === 1 && g.S.time > 12 && g.S.time < 21;          // first evening: time for the tutorial
    const night = dark > (D.dusk ? .45 : .75);
    const maxW = night && !grace ? Math.min(D.wolves + (D.wolves ? Math.min(2, g.S.day - 1) : 0), D.wolves + 2) : 0;
    if (live('wolf') < maxW && Math.random() < dt * .05) { this.spawn('wolf', P.pos); if (!g.S.flags.wolfIntro) { g.S.flags.wolfIntro = 1; g.audio.sfx('howl'); g.ui.toast('Ein Heulen im Wald … Wölfe! Bleib im Licht, leuchte sie mit der Lampe an oder geh nach drinnen.', 'warn'); } }
    if (!grace && live('boar') < D.boars && dark < .8 && Math.random() < dt * .02) this.spawn('boar', P.pos);
    if (!grace && live('bear') < D.bears && (-P.pos.z > 60 || g.S.diff === 'schwer') && Math.random() < dt * .006) { this.spawn('bear', P.pos); g.ui.toast('Irgendwo im Wald bricht Unterholz. Etwas Großes ist unterwegs …', 'warn'); }
    if (dark < .35 && live('deer') < (g.seasons?.season === 'Winter' ? 1 : 3) && Math.random() < dt * .1) this.spawn('deer', P.pos);
    if (dark < .6 && live('rabbit') < 3 && Math.random() < dt * .06) { const p = this.forestSpot(P.pos, 15, 40); if (p) this.spawn('rabbit', null, p); }
    this.updateDog(dt, P);
    this.howlT -= dt; if (live('wolf') && this.howlT < 0) { this.howlT = 25 + Math.random() * 40; g.audio.sfx('howl'); }
    for (const a of [...this.animals]) {
      const to = P.pos.clone().sub(a.pos); to.y = 0; const d = to.length(); a.t -= dt; a.cool -= dt; a.angry -= dt;
      let want = 0, dirA = a.heading; const K = KIND[a.kind];
      if (a.state === 'dead') { a.dead += dt; a.mesh.rotation.z += ((a.rotTo || 0) - a.mesh.rotation.z) * Math.min(1, dt * 6); if (a.dead > 600 || d > 160) this.remove(a); continue; }
      if (a.kind === 'boar' || a.kind === 'bear') {
        const aggro = a.kind === 'bear' ? (D.boarAggro ? 14 + D.boarAggro : 0) : D.boarAggro;
        if (this.scared(a, P)) { a.state = 'flee'; a.t = 3; }
        else if (a.state === 'flee' && a.t > 0) { }
        else if (!inside && !high && !g.S.flags.won && D.dmg && (d < aggro || a.angry > 0) && d < 50) a.state = 'hunt';
        else a.state = 'roam';
        if (a.state === 'hunt') { dirA = Math.atan2(to.x, to.z); want = K.run;
          if (d < 1.4 + K.len / 2) { want = 0; if (a.cool < 0) { a.cool = a.kind === 'bear' ? 1.6 : 1.3; g.hurt(K.dmg * D.dmg, a.kind === 'bear' ? 'Bär' : 'Wildschwein'); g.audio.sfx(a.kind === 'bear' ? 'roar' : 'grunt');
            if (a.kind === 'boar') { a.state = 'flee'; a.t = 1.2; } } } }
        else if (a.state === 'flee') { dirA = Math.atan2(-to.x, -to.z); want = K.run * .8; }
        else { if (Math.random() < dt * .3) a.wander += (Math.random() - .5) * 2; dirA = a.wander; want = Math.sin(performance.now() / 4000 + a.mesh.id) > .2 ? 1.1 : 0; if (d > 120) { this.remove(a); continue; } }
      } else if (a.kind === 'wolf') {
        if (!D.dmg) a.state = 'leave';
        else if (dark < (D.dusk ? .3 : .5)) a.state = 'leave';
        else if (this.scared(a, P)) { if (a.state !== 'flee') g.audio.sfx('growl'); a.state = 'flee'; a.t = 4; }
        else if (a.state === 'flee' && a.t > 0) { }
        else if (!inside && !high && d < 55 && !g.S.flags.won) a.state = 'hunt';
        else a.state = d < 30 ? 'circle' : 'roam';
        if (a.state === 'hunt') { dirA = Math.atan2(to.x, to.z); want = d > 8 ? 5.5 : 3.2;
          if (d < 1.6) { want = 0; if (a.cool < 0) { a.cool = 2; g.hurt(K.dmg * D.dmg, 'Wolf'); g.audio.sfx('bite'); a.state = 'flee'; a.t = 1.8 + Math.random(); } } }   // hit and run
        else if (a.state === 'flee' || a.state === 'leave') { dirA = Math.atan2(-to.x, -to.z); want = 6.5; if (d > 80) { this.remove(a); continue; } }
        else if (a.state === 'circle') { dirA = Math.atan2(to.x, to.z) + Math.PI / 2 * (d < 12 ? 1.4 : 1); want = 2.2; }
        else { if (Math.random() < dt * .3) a.wander += (Math.random() - .5) * 2; dirA = a.wander; want = 1.4; if (d > 110) { this.remove(a); continue; } }
      } else if (a.kind === 'rabbit') {
        if (d < 10 || (a.state === 'flee' && a.t > 0)) { if (a.state !== 'flee') { a.state = 'flee'; a.t = 3; } dirA = Math.atan2(-to.x, -to.z) + Math.sin(a.t * 5) * .6; want = 7; }
        else { a.state = 'roam'; if (Math.random() < dt * .5) a.wander += (Math.random() - .5) * 3; dirA = a.wander; want = Math.sin(performance.now() / 900 + a.mesh.id) > .5 ? 1.5 : 0; }
        if (d > 90) { this.remove(a); continue; }
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
      this.fencePush(a.pos, .45);
      for (const s of g.build?.list || []) { if (!['huette', 'unterstand', 'kiste', 'regal', 'bett', 'werkbank', 'herd', 'regentonne'].includes(s.type)) continue; const dx = a.pos.x - s.x, dz = a.pos.z - s.z, dd = Math.hypot(dx, dz), m = s.type === 'huette' ? 3.0 : 1.2;
        if (dd < m && dd > 1e-4) { a.pos.x = s.x + dx / dd * m; a.pos.z = s.z + dz / dd * m; } }
      a.pos.x = Math.max(MAP.x0, Math.min(MAP.x1, a.pos.x)); a.pos.z = Math.max(-MAP.y1, Math.min(-MAP.y0, a.pos.z));
      a.pos.y += (this.W.groundY(a.pos.x, a.pos.z, a.pos.y + 1.5) - a.pos.y) * Math.min(1, dt * 10);
      a.mesh.position.copy(a.pos); a.mesh.rotation.y = a.heading + Math.PI;
      if (a.kind === 'rabbit') a.mesh.position.y += Math.abs(Math.sin(a.phase * 1.5)) * Math.min(.25, a.speed * .05);
      a.phase += a.speed * dt * 3.2; const sw = Math.min(.7, a.speed * .12);
      a.mesh.userData.legs.forEach((l, i) => l.rotation.x = Math.sin(a.phase + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * sw);
    }
    this.updateCar(dt, P, dark);
    for (const f of this.fires) this.animateFire(f, dt);
  }
  remove(a) { this.scene.remove(a.mesh); this.animals.splice(this.animals.indexOf(a), 1); }
  // fences (built): keep animals (and the dog) on their side – segments from build.fences()
  fencePush(p, r) {
    for (const [x0, z0, x1, z1] of this.g.build?.fences() || []) {
      const vx = x1 - x0, vz = z1 - z0, L2 = vx * vx + vz * vz, t = Math.max(0, Math.min(1, ((p.x - x0) * vx + (p.z - z0) * vz) / L2));
      const cx = x0 + vx * t, cz = z0 + vz * t, dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
      if (d < r && d > 1e-4) { p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
    }
  }
  // ---------------------------------------------------------------- Bello, the farmer's dog (side quest): waits at the castle ruin, follows you once fed
  updateDog(dt, P) {
    const g = this.g, S = g.S; S.dog = S.dog || { tame: 0, sit: 0 };
    if (!this.dog) {
      const spot = g.W.spots.ziel_bello; if (!spot) return;
      const mesh = buildAnimal('dog'); this.scene.add(mesh); const pos = S.dog.pos ? new THREE.Vector3().fromArray(S.dog.pos) : spot.pos.clone();
      this.dog = { mesh, pos, heading: 0, speed: 0, phase: 0, barkT: 0, biteT: 0, home: spot.pos.clone() };
    }
    const D = this.dog, to = P.pos.clone().sub(D.pos); to.y = 0; const d = to.length(); let want = 0, dirA = D.heading;
    D.barkT -= dt; D.biteT -= dt;
    if (!S.dog.tame) { const h = D.home.clone().sub(D.pos); h.y = 0; if (h.length() > 5) { dirA = Math.atan2(h.x, h.z); want = 1.2; } else if (d < 8) { dirA = Math.atan2(to.x, to.z); want = 0; } }
    else {
      if (d > 45 && !S.dog.sit) { D.pos.copy(P.pos).add(new THREE.Vector3(1.5, 0, 1.5)); }
      const foe = this.animals.find(a => ['wolf', 'boar', 'bear'].includes(a.kind) && a.state !== 'dead' && a.pos.distanceTo(D.pos) < 35);
      if (foe && D.barkT < 0) { D.barkT = 25; g.audio.sfx('bark'); g.ui.toast(`🐕 Bello knurrt – ${foe.kind === 'wolf' ? 'Wölfe' : foe.kind === 'bear' ? 'ein Bär' : 'ein Wildschwein'} in der Nähe!`, 'warn'); }
      const near = foe && foe.kind === 'wolf' && foe.pos.distanceTo(D.pos) < 12 ? foe : null;
      if (near) { const t = near.pos.clone().sub(D.pos); t.y = 0; dirA = Math.atan2(t.x, t.z); want = 6.5; if (t.length() < 1.4 && D.biteT < 0) { D.biteT = 1.2; this.hit(near, 14); g.audio.sfx('bite'); } }
      else if (!S.dog.sit && d > 3) { dirA = Math.atan2(to.x, to.z); want = Math.min(6.5, (d - 2.5) * 1.6); }
    }
    let dh = ((dirA - D.heading + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    D.heading += Math.max(-4 * dt, Math.min(4 * dt, dh)); D.speed += (want - D.speed) * Math.min(1, dt * 4);
    D.pos.x += Math.sin(D.heading) * D.speed * dt; D.pos.z += Math.cos(D.heading) * D.speed * dt;
    for (const t of this.W.treesNear(D.pos.x, D.pos.z)) { const dx = D.pos.x - t.x, dz = D.pos.z - t.z, dd = Math.hypot(dx, dz), m = t.r + .35; if (dd < m && dd > 1e-4) { D.pos.x = t.x + dx / dd * m; D.pos.z = t.z + dz / dd * m; } }
    this.fencePush(D.pos, .35);
    D.pos.y += (this.W.groundY(D.pos.x, D.pos.z, Math.max(D.pos.y, P.pos.y) + 1.2) - D.pos.y) * Math.min(1, dt * 10);
    D.mesh.position.copy(D.pos); D.mesh.rotation.y = D.heading + Math.PI;
    D.phase += D.speed * dt * 3.5; const sw = Math.min(.7, D.speed * .14);
    D.mesh.userData.legs.forEach((l, i) => l.rotation.x = Math.sin(D.phase + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * sw);
    const tail = D.mesh.getObjectByName('tail'); if (tail) tail.rotation.y = S.dog.tame ? Math.sin(performance.now() / 90) * .5 : 0;
    S.dog.pos = D.pos.toArray().map(v => +v.toFixed(2));
  }
  dogTarget(o, f) { const D = this.dog; if (!D) return null; const c = D.pos.clone(); c.y += .5; const d = c.sub(o); return d.length() < 2.8 && d.normalize().angleTo(f) < .5 ? D : null; }
  dogVerb() { const S = this.g.S.dog; if (!S.tame) return ['fleisch', 'fleisch_gebraten', 'kaninchen', 'trockenfleisch'].some(k => this.g.has(k)) ? '[E] Bello etwas zu fressen geben' : 'Ein Hund mit rotem Halsband – er sieht hungrig aus'; return S.sit ? '[E] Bello: „Komm!“' : '[E] Bello: „Bleib!“'; }
  dogUse() {
    const g = this.g, S = g.S.dog;
    if (!S.tame) { const food = ['trockenfleisch', 'fleisch_gebraten', 'fleisch', 'kaninchen'].find(k => g.has(k)); if (!food) return g.ui.toast('Bello knurrt leise. Er hat Hunger – bring ihm Fleisch.');
      g.take(food); S.tame = 1; g.audio.sfx('bark'); return g.ui.toast('🐕 Bello frisst gierig – und wedelt. Er folgt dir jetzt und warnt dich vor Raubtieren!', 'good'); }
    S.sit = S.sit ? 0 : 1; g.audio.sfx('bark'); g.ui.toast(S.sit ? 'Bello bleibt hier.' : 'Bello kommt mit.');
  }
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
      this.car = { mesh, y: north ? MAP.y1 : MAP.y0, dir: north ? -1 : 1, v: 16, honk: 0 };
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
    if (c.y > MAP.y1 + 4 || c.y < MAP.y0 - 4) { this.scene.remove(c.mesh); this.car = null; }
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
