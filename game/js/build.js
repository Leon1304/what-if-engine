// Building, tree felling, farming, furniture, lights and fences.
//   G = build menu (tabs: Bauwerke, Einrichtung, Licht, Zäune, Nützliches; some plans need a level) → green/red ghost in front of you →
//   left click / E places it (R or mouse wheel turns, X/Esc cancels). Furniture can stand inside the cabin (on its floor).
//   Cabin: four stages (foundation, walls, roof, fireplace) – E at the site adds the next stage; later three extensions (side room,
//   veranda, workshop) that need levels 3 / 5 / 7.
//   Trees: E with the axe chops (6 hits, 3 with saw or pro axe) → the tree falls (animated), leaves a stump and a log; E on the log → trunks.
//   Fields, chest/shelf storage, rain barrel, trap (rabbits), drying rack, stove, workbench (more recipes nearby), bed (sleep),
//   lights (torch holder, lantern, solar lamp, flood light), motion sensor, solar charger, fences + gate (animals cannot pass).
// Models are Blender templates (bp_*, game/blender/s11_build.py); everything here is saved in the game state (Build.save / load).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshBVH } from 'three-mesh-bvh';
import { BLUEPRINTS, BP_CATS, CROPS, ITEMS } from './items.js';
import { roadX } from './life.js';

const up = new THREE.Vector3(0, 1, 0), v1 = new THREE.Vector3();
const box = new THREE.Box3(), mat4 = new THREE.Matrix4(), mat5 = new THREE.Matrix4();
const ghostOk = new THREE.MeshBasicMaterial({ color: '#6fe07a', transparent: true, opacity: .45, depthWrite: false });
const ghostBad = new THREE.MeshBasicMaterial({ color: '#ff5a4a', transparent: true, opacity: .45, depthWrite: false });
const STORE = { kiste: 20, regal: 12 }, WATER_MAX = 8, FH = .45;
// cabin rooms (local x0, z0, x1, z1 in three axes: z = −Blender y) per extension level: main room, side room, veranda roof, workshop roof
const ROOMS = [[-2.05, -1.75, 2.05, 1.75, 'in'], [2.3, -1.75, 5.85, 1.75, 'in'], [-2.3, 2.0, 6.1, 4.2, 'roof'], [-5.6, -2.0, -2.3, 2.0, 'roof']];
// light structures: colour, power, when it shines, light group (game.updateLights)
const LIGHTS = { fackelhalter: ['#ff9a40', 55, 'fuel', 'fire'], laterne: ['#ffd9a0', 22, 'night', 'lamp'], solarlampe: ['#f2f6ff', 9, 'night', 'lamp'], baustrahler: ['#ffffff', 90, 'battery', 'lamp'] };
const GADGETS = ['solarlampe', 'baustrahler', 'bewegungsmelder', 'solarlader'];

function clone(tpl) {          // template → own object (geometry/material shared); the template keeps its (dequantisation) transform inside a group
  const g = new THREE.Group(), o = tpl.clone(true); g.add(o);
  o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return g;
}
const bpOf = id => BLUEPRINTS.find(b => b.id === id);

export class Build {
  constructor(game) {
    this.g = game; this.W = game.W; this.scene = game.scene;
    this.list = []; this.ghost = null; this.bp = null; this.rot = 0; this.valid = false; this.falling = []; this.logs = []; this.uid = 1;
    this.chest = null; this.cat = 'bau'; this.alarmT = 0;
  }
  lvl() { return this.g.progress.level; }
  can(bp) { const g = this.g; return (bp.tools || []).every(t => g.has(t)); }
  costOf(bp, stage = 0) { return bp.stages ? bp.stages[stage].cost : bp.cost; }
  hasCost(cost) { return Object.entries(cost).every(([k, n]) => this.g.count(k) >= n); }
  pay(cost) { for (const [k, n] of Object.entries(cost)) this.g.take(k, n); }
  costText(cost) { return Object.entries(cost).map(([k, n]) => `${n}× ${ITEMS[k]?.icon || ''} ${ITEMS[k]?.name || k}`).join(' · '); }

  // ---------------------------------------------------------------- menu + ghost
  menuHtml() {
    const L = this.lvl();
    let h = `<h2>Bauen <small>G · R / Mausrad drehen · Linksklick oder E setzen · X abbrechen · dein Level: ${L}</small></h2><div class="tabs">`;
    for (const [id, name] of BP_CATS) h += `<button class="sec ${id === this.cat ? 'on' : ''}" data-cat="${id}">${name}</button>`;
    h += `</div><div class="bps">`;
    for (const bp of BLUEPRINTS.filter(b => b.cat === this.cat)) {
      const cost = this.costOf(bp), toolOk = this.can(bp), lvlOk = L >= bp.lvl, ok = toolOk && lvlOk && this.hasCost(cost);
      h += `<div class="bpc ${ok ? 'ok' : ''}"><i>${bp.icon}</i><div><b>${bp.name}</b>${lvlOk ? '' : ` <span class="lock">🔒 ab Level ${bp.lvl}</span>`}<small>${bp.desc}</small>
        <small>${bp.stages ? '1. Abschnitt: ' : ''}${this.costText(cost)}${bp.tools?.length ? ` · Werkzeug: ${bp.tools.map(t => ITEMS[t].name).join(', ')}${toolOk ? ' ✔' : ' ✘'}` : ''}</small></div>
        <button data-bp="${bp.id}" ${ok ? '' : 'disabled'}>Bauen</button></div>`;
    }
    return h + `</div><p class="hint">Baumstämme: Bäume mit der Axt fällen. Bretter: Stamm + Axt/Säge im Rucksack (C). Steine: Steinbruch, Burgruine. Metall: Schrottkiste in der Werkstatt, Steinbruch. Möbel und Lichter kannst du auch in deine Hütte stellen.</p>`;
  }
  start(id) {
    const bp = bpOf(id); if (!bp) return;
    this.cancel(); this.bp = bp; this.rot = Math.round(this.g.P.yaw / (Math.PI / 2)) * Math.PI / 2;
    const grp = new THREE.Group();
    const parts = bp.id === 'huette' ? ['huette_1', 'huette_2', 'huette_3', 'huette_4'] : [bp.id];
    for (const p of parts) { const t = this.W.bp[p]; if (t) grp.add(clone(t)); }
    if (bp.id === 'gartentor') { const t = clone(this.W.bp.gartentor_tuer); const h = this.W.bp.gartentor_tuer.userData.hinge; t.position.set(h[0], h[2], -h[1]); grp.add(t); }
    grp.traverse(m => { if (m.isMesh) { m.castShadow = false; m.material = ghostOk; } });
    this.ghost = grp; this.scene.add(grp);
    this.g.ui.toast(`${bp.icon} ${bp.name}: Platz suchen – Linksklick oder E setzt, R dreht, X bricht ab.`);
  }
  cancel() { if (this.ghost) { this.scene.remove(this.ghost); this.ghost = null; } this.bp = null; }
  turn(d) { this.rot += d; }
  corners(p, r, w, d) {
    const c = Math.cos(r), s = Math.sin(r), out = [];
    for (const [a, b] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2], [0, 0]]) out.push(new THREE.Vector3(p.x + a * c + b * s, 0, p.z - a * s + b * c));
    return out;
  }
  // the cabin room a point is in (furniture on the cabin floor, shelter, warmth): { s, i, kind 'in' | 'roof', floor }
  room(p, kinds = ['in', 'roof']) {
    for (const s of this.list) {
      if (s.type !== 'huette') continue;
      v1.set(p.x - s.x, 0, p.z - s.z).applyAxisAngle(up, -s.rot);
      for (let i = 0; i < ROOMS.length; i++) {
        if (i > 0 && (s.ext || 0) < i) continue; if (i === 0 && s.stage < 3 && kinds.length === 1) continue;
        const [x0, z0, x1, z1, k] = ROOMS[i];
        if (kinds.includes(k) && v1.x > x0 && v1.x < x1 && v1.z > z0 && v1.z < z1 && p.y > s.y - 1 && p.y < s.y + 4) return { s, i, kind: k, floor: s.y + (i === 3 ? .12 : FH) };
      }
    }
    return null;
  }
  check(p, r, bp, ignore, outside) {
    const g = this.g, W = this.W, [w, d] = bp.size || [1, 1], cs = this.corners(p, r, w, d);
    if (g.insideShop(p) || (p.x > 20 && p.x < 38 && p.z > -11 && p.z < 11)) return 'Nicht in der Tankstelle.';
    const inRoom = !outside && bp.id !== 'huette' && this.room(new THREE.Vector3(p.x, g.P.pos.y, p.z));
    let lo = 1e9, hi = -1e9;
    if (inRoom) { lo = hi = inRoom.floor; if (['feld', 'falle', 'zaun', 'palisade', 'steinmauer', 'gartentor', 'unterstand', 'feuerstelle'].includes(bp.id)) return 'Das gehört nach draußen.'; }
    else for (const q of cs) {
      const by = -q.z; if (Math.abs(q.x - roadX(by)) < 4.4) return 'Nicht auf der Straße.';
      const y = W.groundY(q.x, q.z, g.P.pos.y + 4); lo = Math.min(lo, y); hi = Math.max(hi, y);
    }
    if (hi - lo > (bp.id === 'huette' || bp.ext ? 1.1 : bp.id === 'feld' ? .45 : .6)) return 'Der Boden ist hier zu uneben.';
    const R = Math.hypot(w, d) / 2;
    for (const t of W.treesNear(p.x, p.z)) {
      v1.set(t.x - p.x, 0, t.z - p.z).applyAxisAngle(up, -r);
      if (Math.abs(v1.x) < w / 2 + t.r && Math.abs(v1.z) < d / 2 + t.r) return 'Ein Baum steht im Weg – fäll ihn erst (Axt).';
    }
    for (const s of this.list) {
      if (s === ignore || (inRoom && s === inRoom.s)) continue;
      const sb = bpOf(s.type); let sr = Math.hypot(...sb.size) / 2; if (s.type === 'huette') sr = 2.8;
      const k = (sb.fence && bp.fence) || (s.type === 'feld' && bp.id === 'feld') || inRoom ? .5 : .8;
      if (Math.hypot(s.x - p.x, s.z - p.z) < (sr + R) * k) return 'Hier steht schon etwas.';
    }
    const base = inRoom ? lo + .12 : hi + .35, top = base + (R < .6 ? 1.0 : 1.9);
    box.min.set(-w / 2 + .05, base, -d / 2 + .05); box.max.set(w / 2 - .05, top, d / 2 - .05);
    mat4.makeRotationY(r).setPosition(p.x, 0, p.z);
    if (W.collider.geometry.boundsTree.intersectsBox(box, mat4)) return 'Da ist etwas im Weg.';
    for (const c of W.dyn) {             // built things (cabin walls, furniture, logs)
      const o = c.obj.userData.build; if ((o && o === ignore) || c.pos.distanceTo(p) > c.r + R + 2) continue;
      mat5.copy(c.obj.matrixWorld).invert().multiply(mat4);
      if (c.geo.boundsTree.intersectsBox(box, mat5)) return inRoom ? 'Zu nah an der Wand oder an anderen Möbeln.' : 'Da ist etwas im Weg.';
    }
    p.y = bp.id === 'huette' || bp.ext ? hi : lo + (bp.id === 'feld' ? .05 : 0);
    return '';
  }
  updateGhost() {
    if (!this.ghost) return;
    const P = this.g.P, f = P.forward(v1); f.y = 0; f.normalize();
    const reach = Math.max(...this.bp.size) / 2 + 1.2, p = P.pos.clone().addScaledVector(f, reach);
    p.x = Math.round(p.x * 4) / 4; p.z = Math.round(p.z * 4) / 4;
    const why = this.check(p, this.rot, this.bp); this.valid = !why; this.why = why;
    this.ghost.position.copy(p); if (why) this.ghost.position.y = this.W.groundY(p.x, p.z, P.pos.y + 1.5);
    this.ghost.rotation.y = this.rot;
    const m = why ? ghostBad : ghostOk; this.ghost.traverse(o => { if (o.isMesh) o.material = m; });
    this.ghostPos = p;
  }
  place() {
    const g = this.g, bp = this.bp; if (!bp) return;
    if (this.lvl() < bp.lvl) { g.audio.sfx('error'); return g.ui.toast(`Dafür brauchst du Level ${bp.lvl}.`, 'warn'); }
    if (!this.valid) { g.audio.sfx('error'); return g.ui.toast(this.why || 'Hier nicht.', 'warn'); }
    if (!this.can(bp)) { g.audio.sfx('error'); return g.ui.toast(`Du brauchst: ${bp.tools.map(t => ITEMS[t].name).join(', ')}.`, 'warn'); }
    const cost = this.costOf(bp); if (!this.hasCost(cost)) { g.audio.sfx('error'); return g.ui.toast(`Es fehlt Material: ${this.costText(cost)}`, 'warn'); }
    this.pay(cost);
    const s = this.make({ type: bp.id, x: this.ghostPos.x, y: this.ghostPos.y, z: this.ghostPos.z, rot: this.rot, stage: 1 });
    g.audio.sfx('build'); g.progress.add(bp.stages ? 30 : 15, bp.name);
    g.ui.toast(bp.stages ? `🔨 ${bp.stages[0].name} steht. Nächster Abschnitt: ${bp.stages[1].name} (E an der Baustelle).` : `🔨 ${bp.name} gebaut.`, 'good');
    g.S.flags.built = 1; this.cancel(); g.save(); return s;
  }

  // ---------------------------------------------------------------- structures
  make(d) {
    const s = { id: this.uid++, type: d.type, x: d.x, y: d.y, z: d.z, rot: d.rot || 0, stage: d.stage || 1, ext: d.ext || 0, grp: new THREE.Group(), col: null, door: null, fire: null };
    s.grp.position.set(s.x, s.y, s.z); s.grp.rotation.y = s.rot; s.grp.userData.build = s; this.scene.add(s.grp);
    if (s.type === 'feld') s.field = d.field || { crop: '', p: 0, wet: 0 };
    if (STORE[s.type]) s.inv = (d.inv || []).filter(x => ITEMS[x.id]);
    if (s.type === 'regentonne') s.water = d.water ?? 2;
    if (s.type === 'falle') s.catch = d.catch || 0;
    if (s.type === 'trockengestell') s.dry = d.dry || [];
    if (s.type === 'fackelhalter') { s.fuel = d.fuel ?? 0; s.lit = d.lit || 0; }
    if (s.type === 'baustrahler') s.charge = d.charge ?? 10;
    if (s.type === 'solarlader') s.charge = d.charge ?? 0;
    this.list.push(s); this.refresh(s, d);
    return s;
  }
  refresh(s, d = {}) {
    const W = this.W;
    for (const c of [...s.grp.children]) s.grp.remove(c);
    let parts = [s.type];
    if (s.type === 'huette') { parts = ['huette_1', s.ext >= 1 ? 'huette_2t' : 'huette_2', 'huette_3', 'huette_4'].slice(0, s.stage); for (let i = 1; i <= s.ext; i++) parts.push('huette_x' + i); }
    if (s.type === 'falle') parts = [s.catch ? 'falle_voll' : 'falle'];
    for (const p of parts) if (W.bp[p]) s.grp.add(clone(W.bp[p]));
    if (s.type === 'feld') this.plants(s);
    if (s.type === 'trockengestell' && s.dry.length) s.grp.add(clone(W.bp.trocken_fleisch));
    s.grp.updateMatrixWorld(true);
    if (s.col) W.removeCollider(s.col);
    s.col = ['feld', 'teppich'].includes(s.type) ? null : W.addCollider(s.grp);
    if (s.type === 'huette' && s.stage >= 2 && !s.door) this.addDoor(s, d.doorOpen, 'huette_tuer', 'Hüttentür');
    if (s.type === 'gartentor' && !s.door) this.addDoor(s, d.doorOpen, 'gartentor_tuer', 'Gartentor');
    const fireAt = s.type === 'feuerstelle' ? W.bp.feuerstelle.userData.fire : s.type === 'herd' ? W.bp.herd.userData.fire : s.type === 'huette' && s.stage >= 4 ? W.bp.huette_4.userData.fire : null;
    if (fireAt && !s.fire) {
      const p = new THREE.Vector3(fireAt[0], fireAt[2], -fireAt[1]).applyMatrix4(s.grp.matrixWorld);
      s.fire = this.g.life.addFire(p, d.fuel || 0, false); s.fire.owned = s; s.fire.on = !!d.fuel;
      if (s.type === 'herd') s.fire.mesh.scale.setScalar(.45);
    }
    const L = LIGHTS[s.type];
    if (L && !s.light) {
      const lp = W.bp[s.type].userData.light, p = new THREE.Vector3(lp[0], lp[2], -lp[1]).applyMatrix4(s.grp.matrixWorld);
      s.light = { pos: p, color: new THREE.Color(L[0]), power: 0, group: L[3], max: L[1] }; this.g.extraLights.push(s.light);
      if (s.type === 'fackelhalter') { s.flame = new THREE.Mesh(new THREE.ConeGeometry(.1, .35, 5), new THREE.MeshBasicMaterial({ color: '#ffa030', transparent: true, opacity: .9 })); s.flame.position.copy(p).add(new THREE.Vector3(0, -.12, 0)); this.scene.add(s.flame); }
    }
    if (L && s.type !== 'fackelhalter') { s.glow = []; s.grp.traverse(m => { if (m.isMesh && m.material.transparent) { m.material = m.material.clone(); m.material.emissive = new THREE.Color(L[0]); s.glow.push(m.material); } }); }
  }
  addDoor(s, open, tplName, label) {
    const W = this.W, tpl = W.bp[tplName]; if (!tpl) return;
    const h = tpl.userData.hinge, node = clone(tpl), pivot = new THREE.Group();
    pivot.position.set(h[0], h[2], -h[1]).applyMatrix4(s.grp.matrixWorld); pivot.rotation.y = s.rot; this.scene.add(pivot); pivot.add(node); pivot.updateMatrixWorld(true);
    const angle = s.type === 'gartentor' ? -1.75 : 1.75;
    const it = { node, pivot, u: { interact: 'door', angle, label }, name: `${s.type}_${s.id}_Tuer`, open: open ? 1 : 0, target: open ? 1 : 0, state: {}, label, built: s };
    it.basePos = pivot.position.clone(); it.baseQuat = pivot.quaternion.clone(); if (open) pivot.rotateY(angle);
    const inv = pivot.matrixWorld.clone().invert(), gs = []; node.traverse(m => { if (m.isMesh) { m.userData._it = it; gs.push(W.floatGeo(m.geometry, inv.clone().multiply(m.matrixWorld), ['position'])); } });
    it.bvhGeo = mergeGeometries(gs, false); it.bvhGeo.boundsTree = new MeshBVH(it.bvhGeo);
    it.center = new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3()); it.radius = 1.2; it.drawDist = 120;
    W.interactives.push(it); W.movers.push(it); node.traverse(m => { if (m.isMesh) this.g.intMeshes.push(m); }); this.g.byName[it.name] = it;
    s.door = it;
  }
  removeDoor(s) {
    if (!s.door) return; const it = s.door; this.scene.remove(it.pivot);
    for (const L of [this.W.interactives, this.W.movers]) { const i = L.indexOf(it); if (i >= 0) L.splice(i, 1); }
    this.g.intMeshes = this.g.intMeshes.filter(m => m.userData._it !== it); s.door = null;
  }
  plants(s) {
    const f = s.field; if (!f.crop) return;
    const st = f.p >= 1 ? 3 : f.p >= .45 ? 2 : 1, tpl = this.W.bp[`p_${f.crop}_${st}`]; if (!tpl) return;
    for (const [a, b] of [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]]) { const o = clone(tpl); o.position.set(a, .08, b); o.rotation.y = (a * 3 + b * 7); s.grp.add(o); }
    s.shown = st;
  }
  remove(s) {
    this.scene.remove(s.grp); if (s.col) this.W.removeCollider(s.col);
    this.removeDoor(s);
    if (s.fire) { this.scene.remove(s.fire.mesh); this.g.life.fires.splice(this.g.life.fires.indexOf(s.fire), 1); this.g.extraLights.splice(this.g.extraLights.indexOf(s.fire.light), 1); }
    if (s.light) this.g.extraLights.splice(this.g.extraLights.indexOf(s.light), 1);
    if (s.flame) this.scene.remove(s.flame);
    this.list.splice(this.list.indexOf(s), 1);
  }
  dismantle(s) {          // X while looking at it: half the materials back (gadgets come back whole)
    const bp = bpOf(s.type), g = this.g;
    if (s.inv?.length) return g.ui.toast('Erst ausräumen – da liegt noch etwas drin.', 'warn');
    if (s.type === 'huette' && this.list.some(o => o !== s && this.room(new THREE.Vector3(o.x, o.y + .3, o.z))?.s === s)) return g.ui.toast('Räum erst die Möbel aus der Hütte (X an jedem Möbelstück).', 'warn');
    const back = {};
    const add = c => { for (const [k, n] of Object.entries(c)) back[k] = (back[k] || 0) + (GADGETS.includes(k) ? n : Math.floor(n / 2)); };
    if (bp.stages) { bp.stages.slice(0, s.stage).forEach(st => add(st.cost)); bp.ext.slice(0, s.ext).forEach(e => add(e.cost)); } else add(bp.cost);
    for (const [k, n] of Object.entries(back)) if (n) g.add(k, n, true);
    this.remove(s); g.audio.sfx('chop'); g.ui.toast(`🔨 ${bp.name} abgebaut. ${bp.cat === 'licht' || bp.cat === 'nutz' ? 'Du hast es wieder eingepackt.' : 'Ein Teil des Materials ist zurück.'}`); g.save();
  }
  shelter(p) { const r = this.room(p); if (r) return r.s; return this.list.find(s => s.type === 'unterstand' && this.inLeanTo(s, p)) || null; }
  indoor(p) { return this.room(p, ['in']); }
  inLeanTo(s, p) { v1.set(p.x - s.x, 0, p.z - s.z).applyAxisAngle(up, -s.rot); return Math.abs(v1.x) < 1.3 && Math.abs(v1.z) < 1.1 && p.y > s.y - .5 && p.y < s.y + 3; }
  near(type, p, r) { return this.list.find(s => s.type === type && Math.hypot(s.x - p.x, s.z - p.z) < r && Math.abs(s.y - p.y) < 3); }
  hasBench(p) { if (this.near('werkbank', p, 3)) return true; const r = this.room(p, ['roof']); return !!(r && r.i === 3); }
  // fence segments (for animals): [x0, z0, x1, z1]
  fences() {
    const out = [];
    for (const s of this.list) { const bp = bpOf(s.type); if (!bp?.fence || (s.type === 'gartentor' && s.door?.target)) continue;
      const c = Math.cos(s.rot), sn = Math.sin(s.rot), hw = bp.size[0] / 2; out.push([s.x - hw * c, s.z + hw * sn, s.x + hw * c, s.z - hw * sn]); }
    return out;
  }
  scaresAt(p) { return this.list.some(s => ((s.type === 'fackelhalter' && s.fuel > 0) || (s.type === 'baustrahler' && s.light?.power > 0)) && Math.hypot(s.x - p.x, s.z - p.z) < 8); }

  // ---------------------------------------------------------------- what the crosshair points at
  target(o, f) {
    let best = null, bd = 3.2; const ray = this.g.ray; ray.set(o, f); ray.far = 3.2;
    for (const s of this.list) {
      if (s.grp.position.distanceTo(o) > 9) continue;
      const h = ray.intersectObject(s.grp, true)[0]; if (h && h.distance < bd) { bd = h.distance; best = s; }
    }
    for (const L of this.logs) { const h = ray.intersectObject(L.obj, true)[0]; if (h && h.distance < bd) { bd = h.distance; best = { log: L }; } }
    return best ? (best.log ? { log: best.log, d: bd } : { build: best, d: bd }) : null;
  }
  nextExt(s) { const bp = bpOf('huette'); return s.stage >= 4 && s.ext < bp.ext.length ? bp.ext[s.ext] : null; }
  verb(t) {
    const g = this.g;
    if (t.log) return g.hasAxe() ? `[E] Stamm zerlegen (Axt) – noch ${t.log.left}` : 'Ein gefällter Stamm – mit einer Axt zerlegen';
    const s = t.build, bp = bpOf(s.type);
    if (s.type === 'huette' && s.stage < 4) { const st = bp.stages[s.stage]; return `[E] ${st.name} bauen: ${this.costText(st.cost)}${this.hasCost(st.cost) ? '' : ' (fehlt)'}`; }
    if (s.type === 'huette') { const e = this.nextExt(s); if (!e) return 'Deine Blockhütte – voll ausgebaut'; return this.lvl() < e.lvl ? `Ausbau „${e.name}“ ab Level ${e.lvl}` : `[E] Ausbauen: ${e.name} – ${this.costText(e.cost)}${this.hasCost(e.cost) ? '' : ' (fehlt)'}`; }
    if (s.type === 'feld') {
      const f = s.field;
      if (!f.crop) { const seed = this.seedFor(); return seed ? `[E] ${ITEMS[seed].name} pflanzen` : 'Leeres Feld – du brauchst Saatgut'; }
      if (f.p >= 1) return `[E] ${CROPS[f.crop].name} ernten`;
      return `${CROPS[f.crop].name}: ${Math.floor(f.p * 100)} %${g.seasons?.season === 'Winter' ? ' · im Winter wächst nichts' : ''}${f.wet > 0 ? ' · gegossen' : this.waterItem() ? ' · [E] gießen' : ''}`;
    }
    if (STORE[s.type]) return `[E] ${bp.name} öffnen (${s.inv.length}/${STORE[s.type]})`;
    if (s.type === 'regentonne') return s.water >= 1 ? (g.has('topf') ? '[E] Topf mit Regenwasser füllen' : '[E] Regenwasser trinken') : 'Regentonne – leer, wartet auf Regen';
    if (s.type === 'bett') return '[E] Schlafen';
    if (s.type === 'falle') return s.catch ? '[E] Kaninchen herausnehmen' : 'Kaninchenfalle – gespannt';
    if (s.type === 'trockengestell') { const ready = s.dry.filter(x => x >= 6).length; return ready ? `[E] ${ready} × Trockenfleisch abnehmen` : g.has('fleisch') && s.dry.length < 5 ? '[E] Fleisch aufhängen' : `Trockengestell (${s.dry.length}/5)`; }
    if (s.type === 'fackelhalter') return s.fuel > 0 ? `Fackel brennt (${Math.ceil(s.fuel)} h)` : g.has('feuerzeug') ? `[E] Anzünden${s.lit ? ' (1 Ast)' : ''}` : 'Fackelhalter – Feuerzeug nötig';
    if (s.type === 'baustrahler') return s.charge > 0 ? `Baustrahler: Akku für ${Math.ceil(s.charge)} h${g.has('batterien') ? ' · [E] Batterien einsetzen' : ''}` : g.has('batterien') ? '[E] Batterien einsetzen' : 'Baustrahler – Batterien leer';
    if (s.type === 'solarlader') return s.charge >= 1 ? '[E] Taschenlampe aufladen' : `Solar-Ladegerät lädt … ${Math.floor(s.charge * 100)} %`;
    if (s.type === 'werkbank') return 'Werkbank – in der Nähe zeigt der Rucksack (C) mehr Rezepte';
    if (s.type === 'unterstand') return 'Unterstand – darunter Z halten zum Warten';
    return bp.name + ' · X = abbauen';
  }
  seedFor() { const sel = this.g.S.inv[this.g.S.sel]; if (sel && ITEMS[sel.id]?.seed) return sel.id; return ['saat_kartoffel', 'saat_karotte', 'saat_kuerbis'].find(k => this.g.has(k)); }
  waterItem() { return ['wasser', 'topf_klar', 'topf_abgekocht', 'topf_wasser'].find(k => this.g.has(k)); }
  extPos(s, e) {        // world position of an extension's footprint centre (offset in Blender x / y)
    const c = Math.cos(s.rot), sn = Math.sin(s.rot), x = e.off[0], z = -e.off[1];
    return new THREE.Vector3(s.x + x * c + z * sn, s.y, s.z - x * sn + z * c);
  }
  interact(t) {
    const g = this.g, A = g.audio;
    if (t.log) return this.chopLog(t.log);
    const s = t.build, bp = bpOf(s.type);
    if (s.type === 'huette' && s.stage < 4) {
      const st = bp.stages[s.stage];
      if (!g.has('hammer')) { A.sfx('error'); return g.ui.toast('Du brauchst einen Hammer.', 'warn'); }
      if (!this.hasCost(st.cost)) { A.sfx('error'); return g.ui.toast(`Für „${st.name}“ fehlt: ${this.costText(st.cost)}`, 'warn'); }
      this.pay(st.cost); s.stage++; this.refresh(s); A.sfx('build'); g.progress.add(40, st.name);
      g.ui.toast(s.stage < 4 ? `🔨 ${st.name} fertig! Weiter: ${bp.stages[s.stage].name}.` : '🛖 Deine Blockhütte ist fertig! Im Kamin (E) Feuer machen – drinnen bist du sicher. Ab Level 3 kannst du anbauen.', 'good');
      if (s.stage >= 4) g.S.flags.cabin = 1; g.save(); return;
    }
    if (s.type === 'huette') {
      const e = this.nextExt(s); if (!e) return g.ui.toast('Die Hütte ist voll ausgebaut.');
      if (this.lvl() < e.lvl) { A.sfx('error'); return g.ui.toast(`„${e.name}“ geht ab Level ${e.lvl} (du bist Level ${this.lvl()}).`, 'warn'); }
      if (!g.has('hammer')) { A.sfx('error'); return g.ui.toast('Du brauchst einen Hammer.', 'warn'); }
      if (!this.hasCost(e.cost)) { A.sfx('error'); return g.ui.toast(`Für „${e.name}“ fehlt: ${this.costText(e.cost)}`, 'warn'); }
      const why = this.check(this.extPos(s, e), s.rot, { id: 'ext', size: e.size, ext: 1 }, s, true); if (why) { A.sfx('error'); return g.ui.toast(`${e.name}: ${why}`, 'warn'); }
      this.pay(e.cost); s.ext++; const open = s.door?.target; this.removeDoor(s);
      this.refresh(s, { doorOpen: open }); A.sfx('build'); g.progress.add(80, e.name); g.ui.toast(`🏡 ${e.name} fertig!`, 'good'); g.save(); return;
    }
    if (s.type === 'feld') {
      const f = s.field;
      if (!f.crop) { const seed = this.seedFor(); if (!seed) return g.ui.toast('Du hast kein Saatgut. Such im Dorfladen, in der Scheune oder in Säcken.');
        g.take(seed); f.crop = ITEMS[seed].seed; f.p = 0; f.wet = 0; A.sfx('dig'); this.refresh(s); g.S.flags.planted = 1; g.progress.add(3, 'gepflanzt'); return g.ui.toast(`🌱 ${CROPS[f.crop].name} gepflanzt. Gieß das Feld oder warte auf Regen.`); }
      if (f.p >= 1) { const gives = CROPS[f.crop].gives; if (!g.addAll(gives)) return;
        g.ui.toast(`🧺 Ernte: ${Object.entries(gives).map(([k, n]) => `${n}× ${ITEMS[k].name}`).join(', ')}`, 'good'); A.sfx('pickup'); g.progress.stat('harvest', Object.values(gives)[0]); g.progress.add(12, 'Ernte');
        f.crop = ''; f.p = 0; this.refresh(s); return; }
      const w = this.waterItem(); if (f.wet <= 0 && w) { g.take(w); if (ITEMS[w].after) g.add(ITEMS[w].after, 1, true); f.wet = 6; A.sfx('water'); return g.ui.toast('💧 Gegossen – wächst jetzt schneller.'); }
      return g.ui.toast(`${CROPS[f.crop].name} wachsen … ${Math.floor(f.p * 100)} %`);
    }
    if (STORE[s.type]) { this.chest = s; return g.openPanel?.('inv'); }
    if (s.type === 'regentonne') {
      if (s.water < 1) return g.ui.toast('Die Tonne ist leer. Beim nächsten Regen füllt sie sich.');
      s.water--; A.sfx('water');
      if (g.has('topf')) { g.swap('topf', 'topf_klar'); return g.ui.toast('🫕 Topf mit sauberem Regenwasser gefüllt.'); }
      g.S.stats.thirst = Math.min(100, g.S.stats.thirst + 30); g.S.flags.drank = 1; return g.ui.toast('Kühles Regenwasser.');
    }
    if (s.type === 'bett') return g.sleep(s);
    if (s.type === 'falle') { if (!s.catch) return g.ui.toast('Die Falle ist gespannt. Kaninchen kommen, wenn niemand in der Nähe ist (nicht neben der Hütte).');
      if (!g.add('kaninchen', 1)) return; s.catch = 0; this.refresh(s); g.progress.stat('rabbits'); g.progress.add(10, 'Kaninchen'); return; }
    if (s.type === 'trockengestell') {
      const ready = s.dry.filter(x => x >= 6).length;
      if (ready) { if (!g.add('trockenfleisch', ready)) return; s.dry = s.dry.filter(x => x < 6); this.refresh(s); g.progress.add(4 * ready, 'Trockenfleisch'); return; }
      if (g.has('fleisch') && s.dry.length < 5) { g.take('fleisch'); s.dry.push(0); this.refresh(s); return g.ui.toast('🥓 Fleisch aufgehängt – in 6 Stunden ist es trocken.'); }
      return g.ui.toast('Häng rohes Fleisch auf (E mit Fleisch im Rucksack).');
    }
    if (s.type === 'fackelhalter') {
      if (s.fuel > 0) return g.ui.toast('Die Fackel brennt schon.');
      if (!g.has('feuerzeug')) return g.ui.toast('Du brauchst ein Feuerzeug.');
      if (s.lit && !g.has('ast')) return g.ui.toast('Zum Neu-Anzünden brauchst du einen Ast.');
      if (s.lit) g.take('ast'); s.lit = 1; s.fuel = 8; A.sfx('fire'); return g.ui.toast('🔥 Die Fackel brennt (8 Stunden).');
    }
    if (s.type === 'baustrahler') { if (!g.has('batterien')) return g.ui.toast('Der Baustrahler braucht Batterien (AA).'); g.take('batterien'); s.charge = Math.min(40, s.charge + 30); A.sfx('switch'); return g.ui.toast('🔋 Batterien drin – der Strahler leuchtet die nächsten Nächte.'); }
    if (s.type === 'solarlader') { if (s.charge < 1) return g.ui.toast('Noch nicht voll – es braucht Tageslicht.'); if (!g.has('taschenlampe')) return g.ui.toast('Du hast keine Taschenlampe.');
      s.charge = 0; g.S.battery = 100; A.sfx('switch'); return g.ui.toast('🔦 Taschenlampe voll aufgeladen.', 'good'); }
    g.ui.toast(this.verb(t));
  }
  chestMove(dir, i) {       // dir 1: backpack → storage, −1: storage → backpack
    const g = this.g, s = this.chest; if (!s) return; const cap = STORE[s.type];
    if (dir > 0) { const it = g.S.inv[i]; if (!it) return; let slot = s.inv.find(x => x.id === it.id && x.n < 30);
      if (!slot) { if (s.inv.length >= cap) return g.ui.toast('Hier ist kein Platz mehr.', 'warn'); slot = { id: it.id, n: 0 }; s.inv.push(slot); }
      const k = Math.min(it.n, 30 - slot.n); slot.n += k; g.take(it.id, k); }
    else { const it = s.inv[i]; if (!it) return; if (g.add(it.id, it.n, true)) s.inv.splice(i, 1); }
  }
  storeCap(s) { return STORE[s.type] || 0; }

  // ---------------------------------------------------------------- trees
  chopTree(t) {
    const g = this.g;
    if (t.fixed || t.kind === 'Linde') return g.ui.toast('Diesen mächtigen Baum lässt du lieber stehen.');
    if (t.kind === 'stumpf') return;
    t.hits = (t.hits || 0) + 1; g.audio.sfx('chop'); g.S.stats.stamina = Math.max(0, g.S.stats.stamina - 3);
    const need = this.chopsNeeded();
    if (t.hits < need) return g.ui.toast(`🪓 ${t.hits}/${need}`);
    const P = g.P, dir = new THREE.Vector3(t.x - P.pos.x, 0, t.z - P.pos.z).normalize();
    g.progress.add(15, 'Baum gefällt'); this.fell(t, dir, true);
  }
  chopsNeeded() { return this.g.has('saege') || this.g.has('profiaxt') ? 3 : 6; }
  fell(t, dir, animate) {
    const W = this.W, g = this.g;
    W.removeTree(t); W.hideTree(t);
    const base = new THREE.Vector3(t.x, t.y, t.z);
    g.S.felled[t.name] = g.S.felled[t.name] || { rot: Math.atan2(-dir.z, dir.x), left: t.kind === 'Totholz' ? 2 : 3 };
    const rec = g.S.felled[t.name];
    const st = clone(W.bp.stumpf); st.position.copy(base); this.scene.add(st); W.addTree({ x: t.x, z: t.z, y: t.y, r: .34, kind: 'stumpf', name: t.name + '_stumpf', parts: [] });
    if (animate) {
      const piv = new THREE.Group(); piv.position.copy(base); this.scene.add(piv); piv.updateMatrixWorld(true);
      const inv = piv.matrixWorld.clone().invert();
      for (const p of t.parts) { const m = new THREE.Mesh(p.im.geometry, p.im.material); m.matrixAutoUpdate = false; m.matrix.copy(inv).multiply(p.m); m.castShadow = true; piv.add(m); }
      this.falling.push({ piv, axis: new THREE.Vector3(dir.z, 0, -dir.x), a: 0, w: .05, t, rec });
      g.audio.sfx('creak'); g.ui.toast('🌲 Baum fällt!');
    } else if (rec.left > 0) this.addLog(t, rec);
  }
  addLog(t, rec) {
    const o = clone(this.W.bp.stamm), L = t.kind === 'Kiefer' ? 1.3 : t.kind === 'Birke' ? .9 : t.kind === 'Totholz' ? .8 : 1.1;
    const dir = new THREE.Vector3(Math.cos(rec.rot), 0, -Math.sin(rec.rot)), p = new THREE.Vector3(t.x, t.y, t.z).addScaledVector(dir, 1.2 + 3 * L);
    p.y = this.W.groundY(p.x, p.z, t.y + 4) - .05; o.position.copy(p); o.rotation.y = rec.rot; o.scale.set(L, 1, 1); this.scene.add(o);
    const log = { obj: o, t, rec, left: rec.left, hits: 0 }; log.col = this.W.addCollider(o); this.logs.push(log);
  }
  chopLog(L) {
    const g = this.g; if (!g.hasAxe()) return g.ui.toast('Dafür brauchst du eine Axt.');
    L.hits++; g.audio.sfx('chop'); g.S.stats.stamina = Math.max(0, g.S.stats.stamina - 2);
    if (L.hits < (this.chopsNeeded() < 6 ? 2 : 3)) return;
    L.hits = 0; if (!g.add('stamm', 1, true)) return; g.add('ast', 1, true); L.left--; L.rec.left = L.left; g.progress.add(3, 'Holz');
    g.ui.toast(`+ 🪵 Baumstamm, + Ast${L.left ? ` (noch ${L.left})` : ''}`);
    if (L.left <= 0) { this.scene.remove(L.obj); this.W.removeCollider(L.col); this.logs.splice(this.logs.indexOf(L), 1); }
  }

  // ---------------------------------------------------------------- per frame
  update(dt, hours) {
    const g = this.g; this.updateGhost();
    for (const f of [...this.falling]) {           // tree falls: accelerates like a pendulum turned upside down
      f.w += Math.sin(f.a + .08) * 2.4 * dt; f.a = Math.min(Math.PI / 2 - .03, f.a + f.w * dt);
      f.piv.quaternion.setFromAxisAngle(f.axis, f.a);
      if (f.a >= Math.PI / 2 - .031) { this.scene.remove(f.piv); this.falling.splice(this.falling.indexOf(f), 1); g.audio.sfx('thud'); this.addLog(f.t, f.rec); }
    }
    const rain = g.sky.rainAmount, dark = g.sky.darkness(g.S.time), winter = g.seasons?.season === 'Winter', grow = g.seasons?.growth ?? 1;
    this.alarmT -= dt;
    for (const s of this.list) {
      if (s.type === 'feld' && s.field.crop && s.field.p < 1) {
        const f = s.field, k = ((f.wet > 0 || rain > .3) ? 1.6 : 1) * (winter ? 0 : grow);
        f.p = Math.min(1, f.p + hours / CROPS[f.crop].hours * k); f.wet = Math.max(0, f.wet - hours);
        const st = f.p >= 1 ? 3 : f.p >= .45 ? 2 : 1; if (st !== s.shown) this.refresh(s);
      }
      else if (s.type === 'regentonne' && rain > .3) s.water = Math.min(WATER_MAX, s.water + hours * 3 * rain);
      else if (s.type === 'falle' && !s.catch && hours > 0 && g.P.pos.distanceTo(s.grp.position) > 15 && !this.list.some(o => o.type === 'huette' && Math.hypot(o.x - s.x, o.z - s.z) < 10)) {
        if (Math.random() < hours * .12) { s.catch = 1; this.refresh(s); }
      }
      else if (s.type === 'trockengestell') s.dry = s.dry.map(x => x + hours);
      else if (s.type === 'solarlader') s.charge = Math.min(1, s.charge + hours * (1 - dark) * .12);
      else if (s.type === 'bewegungsmelder' && this.alarmT < 0) {
        const a = g.life.animals.find(a => a.state !== 'dead' && ['wolf', 'boar', 'bear'].includes(a.kind) && a.pos.distanceTo(s.grp.position) < 20);
        if (a) { this.alarmT = 40; g.audio.sfx('alarm'); g.ui.toast(`📡 Bewegungsmelder: ${{ wolf: 'Wolf', boar: 'Wildschwein', bear: 'Bär' }[a.kind]} in der Nähe!`, 'warn'); }
      }
      if (s.light) {               // lights: when they burn / shine
        const mode = LIGHTS[s.type][2]; let on = false;
        if (mode === 'fuel') { if (s.fuel > 0) { s.fuel = Math.max(0, s.fuel - hours); on = s.fuel > 0; } }
        else if (mode === 'night') on = dark > .45;
        else if (mode === 'battery') { on = dark > .45 && s.charge > 0; if (on) s.charge = Math.max(0, s.charge - hours); }
        s.light.power = on ? s.light.max * (s.type === 'fackelhalter' ? .85 + .15 * Math.sin(performance.now() / 80 + s.id) : 1) : 0;
        if (s.flame) { s.flame.visible = on; const k = .8 + .25 * Math.sin(performance.now() / 70 + s.id); s.flame.scale.set(k, .8 + .3 * Math.abs(Math.sin(performance.now() / 110)), k); }
        if (s.glow) for (const m of s.glow) m.emissiveIntensity = on ? 2.2 : 0;
      }
    }
  }

  // ---------------------------------------------------------------- save / load
  save() {
    return { list: this.list.map(s => ({ type: s.type, x: +s.x.toFixed(2), y: +s.y.toFixed(2), z: +s.z.toFixed(2), rot: +s.rot.toFixed(3), stage: s.stage, ext: s.ext, field: s.field, inv: s.inv, water: s.water,
      doorOpen: s.door?.target || 0, fuel: s.type === 'fackelhalter' ? s.fuel : s.fire?.on ? +s.fire.fuel.toFixed(2) : 0, catch: s.catch, dry: s.dry, charge: s.charge, lit: s.lit })) };
  }
  load(d) {
    for (const s of [...this.list]) this.remove(s);
    for (const L of this.logs) { this.scene.remove(L.obj); this.W.removeCollider(L.col); } this.logs = [];
    const L = (d?.list || []).filter(x => bpOf(x.type)).sort((a, b) => (b.type === 'huette') - (a.type === 'huette'));
    for (const x of L) this.make(x);
    const byName = new Map(this.W.trees.map(t => [t.name, t]));
    for (const name of Object.keys(this.g.S.felled || {})) { const t = byName.get(name); if (t && !t.fixed) this.fell(t, null, false); }
  }
}
