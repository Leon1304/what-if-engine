// Building, tree felling and farming.
//   G = build menu → pick a blueprint → green/red ghost in front of you → left click / E places it (R or mouse wheel turns, X/Esc cancels).
//   Cabin: four stages (foundation, walls, roof, fireplace) – E at the site adds the next stage when you carry the materials.
//   Trees: E with the axe chops (6 hits, 3 with the saw) → the tree falls (animated), leaves a stump and a log; E on the log → trunks + branches.
//   Fields: plant seeds (E), rain or watering speeds them up, three growth stages, harvest (E). Chest = 20 extra slots, rain barrel = clean water.
// Models are Blender templates (bp_*, game/blender/s11_build.py); everything here is saved in the game state (Build.save / load).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshBVH } from 'three-mesh-bvh';
import { BLUEPRINTS, CROPS, ITEMS } from './items.js';
import { roadX } from './life.js';

const up = new THREE.Vector3(0, 1, 0), v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), q1 = new THREE.Quaternion();
const box = new THREE.Box3(), mat4 = new THREE.Matrix4();
const ghostOk = new THREE.MeshBasicMaterial({ color: '#6fe07a', transparent: true, opacity: .45, depthWrite: false });
const ghostBad = new THREE.MeshBasicMaterial({ color: '#ff5a4a', transparent: true, opacity: .45, depthWrite: false });
const CHEST = 20, WATER_MAX = 8;

function clone(tpl) {          // template → own object (geometry/material shared); the template keeps its (dequantisation) transform inside a group
  const g = new THREE.Group(), o = tpl.clone(true); g.add(o);
  o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return g;
}

export class Build {
  constructor(game) {
    this.g = game; this.W = game.W; this.scene = game.scene;
    this.list = []; this.ghost = null; this.bp = null; this.rot = 0; this.valid = false; this.falling = []; this.logs = []; this.uid = 1;
    this.chest = null;                 // structure whose chest is open in the backpack panel
  }
  can(bp) { const g = this.g; return (bp.tools || []).every(t => g.has(t)); }
  costOf(bp, stage = 0) { return bp.stages ? bp.stages[stage].cost : bp.cost; }
  hasCost(cost) { return Object.entries(cost).every(([k, n]) => this.g.count(k) >= n); }
  pay(cost) { for (const [k, n] of Object.entries(cost)) this.g.take(k, n); }
  costText(cost) { return Object.entries(cost).map(([k, n]) => `${n}× ${ITEMS[k]?.icon || ''} ${ITEMS[k]?.name || k}`).join(' · '); }

  // ---------------------------------------------------------------- menu + ghost
  menuHtml() {
    const g = this.g;
    let h = `<h2>Bauen <small>G · R / Mausrad drehen · Linksklick oder E setzen · X abbrechen</small></h2><div class="bps">`;
    for (const bp of BLUEPRINTS) {
      const cost = this.costOf(bp), toolOk = this.can(bp), ok = toolOk && this.hasCost(cost);
      h += `<div class="bpc ${ok ? 'ok' : ''}"><i>${bp.icon}</i><div><b>${bp.name}</b><small>${bp.desc}</small>
        <small>${bp.stages ? '1. Abschnitt: ' : ''}${this.costText(cost)}${bp.tools?.length ? ` · Werkzeug: ${bp.tools.map(t => ITEMS[t].name).join(', ')}${toolOk ? ' ✔' : ' ✘'}` : ''}</small></div>
        <button data-bp="${bp.id}" ${ok ? '' : 'disabled'}>Bauen</button></div>`;
    }
    return h + `</div><p class="hint">Baumstämme: Bäume mit der Axt fällen. Bretter: Stamm + Axt/Säge im Rucksack (C). Steine: Steinbruch, Burgruine, Säcke.</p>`;
  }
  start(id) {
    const bp = BLUEPRINTS.find(b => b.id === id); if (!bp) return;
    this.cancel(); this.bp = bp; this.rot = Math.round(this.g.P.yaw / (Math.PI / 2)) * Math.PI / 2;
    const grp = new THREE.Group();
    const parts = bp.id === 'huette' ? ['huette_1', 'huette_2', 'huette_3', 'huette_4'] : [bp.id];
    for (const p of parts) { const t = this.W.bp[p]; if (t) grp.add(clone(t)); }
    grp.traverse(m => { if (m.isMesh) { m.castShadow = false; m.material = ghostOk; } });
    this.ghost = grp; this.scene.add(grp);
    this.g.ui.toast(`${bp.icon} ${bp.name}: Platz suchen – Linksklick oder E setzt, R dreht, X bricht ab.`);
  }
  cancel() { if (this.ghost) { this.scene.remove(this.ghost); this.ghost = null; } this.bp = null; }
  turn(d) { this.rot += d; }
  // footprint corners (world) for position p and rotation r
  corners(p, r, w, d) {
    const c = Math.cos(r), s = Math.sin(r), out = [];
    for (const [a, b] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2], [0, 0]]) out.push(new THREE.Vector3(p.x + a * c + b * s, 0, p.z - a * s + b * c));
    return out;
  }
  check(p, r, bp, ignore) {
    const g = this.g, W = this.W, [w, d] = bp.size, cs = this.corners(p, r, w, d);
    if (g.insideShop(p) || (p.x > 20 && p.x < 38 && p.z > -11 && p.z < 11)) return 'Nicht in der Tankstelle.';
    let lo = 1e9, hi = -1e9;
    for (const q of cs) {
      const by = -q.z; if (Math.abs(q.x - roadX(by)) < 4.4) return 'Nicht auf der Straße.';
      const y = W.groundY(q.x, q.z, g.P.pos.y + 4); lo = Math.min(lo, y); hi = Math.max(hi, y);
    }
    if (hi - lo > (bp.id === 'huette' ? 1.1 : bp.id === 'feld' ? .45 : .6)) return 'Der Boden ist hier zu uneben.';
    const R = Math.hypot(w, d) / 2;
    for (const t of W.treesNear(p.x, p.z)) {          // trunks inside the footprint (local coordinates)
      v1.set(t.x - p.x, 0, t.z - p.z).applyAxisAngle(up, -r);
      if (Math.abs(v1.x) < w / 2 + t.r && Math.abs(v1.z) < d / 2 + t.r) return 'Ein Baum steht im Weg – fäll ihn erst (Axt).';
    }
    for (const s of this.list) {
      if (s === ignore) continue; const sb = BLUEPRINTS.find(b => b.id === s.type), sr = Math.hypot(...sb.size) / 2;
      const k = (s.type === 'zaun' || bp.id === 'zaun' || (s.type === 'feld' && bp.id === 'feld')) ? .55 : .8;
      if (Math.hypot(s.x - p.x, s.z - p.z) < (sr + R) * k) return 'Hier steht schon etwas.';
    }
    // static geometry (rocks, buildings, cars …) between knee and head height
    box.min.set(-w / 2 + .05, hi + .35, -d / 2 + .05); box.max.set(w / 2 - .05, hi + 2.2, d / 2 - .05);
    mat4.makeRotationY(r).setPosition(p.x, 0, p.z);
    if (W.collider.geometry.boundsTree.intersectsBox(box, mat4)) return 'Da ist etwas im Weg.';
    p.y = bp.id === 'huette' ? hi : lo + (bp.id === 'feld' ? .05 : 0);
    return '';
  }
  updateGhost() {
    if (!this.ghost) return;
    const P = this.g.P, f = P.forward(v1); f.y = 0; f.normalize();
    const reach = Math.max(...this.bp.size) / 2 + 1.4, p = P.pos.clone().addScaledVector(f, reach);
    p.x = Math.round(p.x * 4) / 4; p.z = Math.round(p.z * 4) / 4;
    const why = this.check(p, this.rot, this.bp); this.valid = !why; this.why = why;
    this.ghost.position.copy(p); if (why) this.ghost.position.y = this.W.groundY(p.x, p.z, P.pos.y + 3);
    this.ghost.rotation.y = this.rot;
    const m = why ? ghostBad : ghostOk; this.ghost.traverse(o => { if (o.isMesh) o.material = m; });
    this.ghostPos = p;
  }
  place() {
    const g = this.g, bp = this.bp; if (!bp) return;
    if (!this.valid) { g.audio.sfx('error'); return g.ui.toast(this.why || 'Hier nicht.', 'warn'); }
    if (!this.can(bp)) { g.audio.sfx('error'); return g.ui.toast(`Du brauchst: ${bp.tools.map(t => ITEMS[t].name).join(', ')}.`, 'warn'); }
    const cost = this.costOf(bp); if (!this.hasCost(cost)) { g.audio.sfx('error'); return g.ui.toast(`Es fehlt Material: ${this.costText(cost)}`, 'warn'); }
    this.pay(cost);
    const s = this.make({ type: bp.id, x: this.ghostPos.x, y: this.ghostPos.y, z: this.ghostPos.z, rot: this.rot, stage: 1 });
    g.audio.sfx('build'); g.ui.toast(bp.stages ? `🔨 ${bp.stages[0].name} steht. Nächster Abschnitt: ${bp.stages[1].name} (E an der Baustelle).` : `🔨 ${bp.name} gebaut.`, 'good');
    g.S.flags.built = 1; this.cancel(); g.save(); return s;
  }

  // ---------------------------------------------------------------- structures
  make(d) {
    const s = { id: this.uid++, type: d.type, x: d.x, y: d.y, z: d.z, rot: d.rot || 0, stage: d.stage || 1, grp: new THREE.Group(), col: null, door: null, fire: null };
    s.grp.position.set(s.x, s.y, s.z); s.grp.rotation.y = s.rot; s.grp.userData.build = s; this.scene.add(s.grp);
    if (s.type === 'feld') s.field = d.field || { crop: '', p: 0, wet: 0 };
    if (s.type === 'kiste') s.inv = (d.inv || []).filter(x => ITEMS[x.id]);
    if (s.type === 'regentonne') s.water = d.water ?? 2;
    this.list.push(s); this.refresh(s, d);
    return s;
  }
  refresh(s, d = {}) {
    const W = this.W;
    // rebuild visuals
    for (const c of [...s.grp.children]) if (!c.userData.keep) s.grp.remove(c);
    const parts = s.type === 'huette' ? ['huette_1', 'huette_2', 'huette_3', 'huette_4'].slice(0, s.stage) : [s.type];
    for (const p of parts) if (W.bp[p]) s.grp.add(clone(W.bp[p]));
    if (s.type === 'feld') this.plants(s);
    s.grp.updateMatrixWorld(true);
    if (s.col) W.removeCollider(s.col);
    s.col = s.type === 'feld' ? null : W.addCollider(s.grp);
    // cabin door (a normal interactive door) from stage 2
    if (s.type === 'huette' && s.stage >= 2 && !s.door) this.addDoor(s, d.doorOpen);
    // fireplace / fire pit: an owned fire (lit with E like any campfire)
    const fireAt = s.type === 'feuerstelle' ? W.bp.feuerstelle.userData.fire : s.type === 'huette' && s.stage >= 4 ? W.bp.huette_4.userData.fire : null;
    if (fireAt && !s.fire) {
      const p = new THREE.Vector3(fireAt[0], fireAt[2], -fireAt[1]).applyMatrix4(s.grp.matrixWorld);
      s.fire = this.g.life.addFire(p, d.fuel || 0, false); s.fire.owned = s; s.fire.on = !!d.fuel;
    }
  }
  addDoor(s, open) {
    const W = this.W, tpl = W.bp.huette_tuer; if (!tpl) return;
    const h = tpl.userData.hinge, node = clone(tpl), pivot = new THREE.Group();
    pivot.position.set(h[0], h[2], -h[1]).applyMatrix4(s.grp.matrixWorld); pivot.rotation.y = s.rot; this.scene.add(pivot); pivot.add(node); pivot.updateMatrixWorld(true);
    const it = { node, pivot, u: { interact: 'door', angle: 1.75, label: 'Hüttentür' }, name: 'Huette_' + s.id + '_Tuer', open: open ? 1 : 0, target: open ? 1 : 0, state: {}, label: 'Hüttentür', built: s };
    it.basePos = pivot.position.clone(); it.baseQuat = pivot.quaternion.clone(); if (open) pivot.rotateY(1.75);
    const inv = pivot.matrixWorld.clone().invert(), gs = []; node.traverse(m => { if (m.isMesh) { m.userData._it = it; gs.push(W.floatGeo(m.geometry, inv.clone().multiply(m.matrixWorld), ['position'])); } });
    it.bvhGeo = mergeGeometries(gs, false); it.bvhGeo.boundsTree = new MeshBVH(it.bvhGeo);
    it.center = new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3()); it.radius = 1.2; it.drawDist = 120;
    W.interactives.push(it); W.movers.push(it); node.traverse(m => { if (m.isMesh) this.g.intMeshes.push(m); }); this.g.byName[it.name] = it;
    s.door = it;
  }
  plants(s) {
    const f = s.field; if (!f.crop) return;
    const st = f.p >= 1 ? 3 : f.p >= .45 ? 2 : 1, tpl = this.W.bp[`p_${f.crop}_${st}`]; if (!tpl) return;
    for (const [a, b] of [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]]) { const o = clone(tpl); o.position.set(a, .08, b); o.rotation.y = (a * 3 + b * 7); s.grp.add(o); }
    s.shown = st;
  }
  remove(s) {
    this.scene.remove(s.grp); if (s.col) this.W.removeCollider(s.col);
    if (s.door) { this.scene.remove(s.door.pivot); for (const L of [this.W.interactives, this.W.movers]) L.splice(L.indexOf(s.door), 1); this.g.intMeshes = this.g.intMeshes.filter(m => m.userData._it !== s.door); }
    if (s.fire) { this.scene.remove(s.fire.mesh); this.g.life.fires.splice(this.g.life.fires.indexOf(s.fire), 1); this.g.extraLights.splice(this.g.extraLights.indexOf(s.fire.light), 1); }
    this.list.splice(this.list.indexOf(s), 1);
  }
  dismantle(s) {          // X while looking at it: half the materials back
    const bp = BLUEPRINTS.find(b => b.id === s.type), g = this.g;
    if (s.type === 'kiste' && s.inv.length) return g.ui.toast('Die Kiste ist nicht leer.', 'warn');
    const back = {};
    const add = c => { for (const [k, n] of Object.entries(c)) back[k] = (back[k] || 0) + Math.floor(n / 2); };
    if (bp.stages) bp.stages.slice(0, s.stage).forEach(st => add(st.cost)); else add(bp.cost);
    for (const [k, n] of Object.entries(back)) if (n) g.add(k, n, true);
    this.remove(s); g.audio.sfx('chop'); g.ui.toast(`🔨 ${bp.name} abgebaut. Ein Teil des Materials ist zurück.`); g.save();
  }
  // where the player is under a roof (cabin with roof, lean-to)
  shelter(p) {
    for (const s of this.list) {
      if (!((s.type === 'huette' && s.stage >= 3) || s.type === 'unterstand')) continue;
      v1.set(p.x - s.x, 0, p.z - s.z).applyAxisAngle(up, -s.rot);
      const [hw, hd] = s.type === 'huette' ? [2.05, 1.75] : [1.3, 1.1];
      if (Math.abs(v1.x) < hw && Math.abs(v1.z) < hd && p.y > s.y - .5 && p.y < s.y + 3) return s;
    }
    return null;
  }
  near(type, p, r) { return this.list.find(s => s.type === type && Math.hypot(s.x - p.x, s.z - p.z) < r); }

  // ---------------------------------------------------------------- what the crosshair points at
  target(o, f) {
    let best = null, bd = 3.2; const ray = this.g.ray; ray.set(o, f); ray.far = 3.2;
    for (const s of this.list) {
      if (s.grp.position.distanceTo(o) > 8) continue;
      const h = ray.intersectObject(s.grp, true)[0]; if (h && h.distance < bd) { bd = h.distance; best = s; }
    }
    for (const L of this.logs) { const h = ray.intersectObject(L.obj, true)[0]; if (h && h.distance < bd) { bd = h.distance; best = { log: L }; } }
    return best ? (best.log ? { log: best.log, d: bd } : { build: best, d: bd }) : null;
  }
  verb(t) {
    const g = this.g;
    if (t.log) return g.has('axt') ? `[E] Stamm zerlegen (Axt) – noch ${t.log.left}` : 'Ein gefällter Stamm – mit einer Axt zerlegen';
    const s = t.build, bp = BLUEPRINTS.find(b => b.id === s.type);
    if (s.type === 'huette' && s.stage < 4) { const st = bp.stages[s.stage]; return `[E] ${st.name} bauen: ${this.costText(st.cost)}${this.hasCost(st.cost) ? '' : ' (fehlt)'}`; }
    if (s.type === 'feld') {
      const f = s.field;
      if (!f.crop) { const seed = this.seedFor(); return seed ? `[E] ${ITEMS[seed].name} pflanzen` : 'Leeres Feld – du brauchst Saatgut'; }
      if (f.p >= 1) return `[E] ${CROPS[f.crop].name} ernten`;
      return `${CROPS[f.crop].name}: ${Math.floor(f.p * 100)} %${f.wet > 0 ? ' · gegossen' : this.waterItem() ? ' · [E] gießen' : ''}`;
    }
    if (s.type === 'kiste') return `[E] Vorratskiste öffnen (${s.inv.length}/${CHEST})`;
    if (s.type === 'regentonne') return s.water >= 1 ? (g.has('topf') ? '[E] Topf mit Regenwasser füllen' : '[E] Regenwasser trinken') : 'Regentonne – leer, wartet auf Regen';
    if (s.type === 'bett') return 'Bett – Z halten zum Schlafen';
    if (s.type === 'unterstand') return 'Unterstand – darunter Z halten zum Warten';
    return bp.name + ' · X = abbauen';
  }
  seedFor() { const sel = this.g.S.inv[this.g.S.sel]; if (sel && ITEMS[sel.id]?.seed) return sel.id; return ['saat_kartoffel', 'saat_karotte', 'saat_kuerbis'].find(k => this.g.has(k)); }
  waterItem() { return ['wasser', 'topf_klar', 'topf_abgekocht', 'topf_wasser'].find(k => this.g.has(k)); }
  interact(t) {
    const g = this.g, A = g.audio;
    if (t.log) return this.chopLog(t.log);
    const s = t.build, bp = BLUEPRINTS.find(b => b.id === s.type);
    if (s.type === 'huette' && s.stage < 4) {
      const st = bp.stages[s.stage];
      if (!g.has('hammer')) { A.sfx('error'); return g.ui.toast('Du brauchst einen Hammer.', 'warn'); }
      if (!this.hasCost(st.cost)) { A.sfx('error'); return g.ui.toast(`Für „${st.name}“ fehlt: ${this.costText(st.cost)}`, 'warn'); }
      this.pay(st.cost); s.stage++; this.refresh(s); A.sfx('build');
      g.ui.toast(s.stage < 4 ? `🔨 ${st.name} fertig! Weiter: ${bp.stages[s.stage].name}.` : '🛖 Deine Blockhütte ist fertig! Im Kamin (E) Feuer machen – drinnen bist du sicher.', 'good');
      if (s.stage >= 4) g.S.flags.cabin = 1; g.save(); return;
    }
    if (s.type === 'feld') {
      const f = s.field;
      if (!f.crop) { const seed = this.seedFor(); if (!seed) return g.ui.toast('Du hast kein Saatgut. Such im Dorfladen, in der Scheune oder in Säcken.');
        g.take(seed); f.crop = ITEMS[seed].seed; f.p = 0; f.wet = 0; A.sfx('dig'); this.refresh(s); g.S.flags.planted = 1; return g.ui.toast(`🌱 ${CROPS[f.crop].name} gepflanzt. Gieß das Feld oder warte auf Regen.`); }
      if (f.p >= 1) { for (const [k, n] of Object.entries(CROPS[f.crop].gives)) g.add(k, n, true);
        g.ui.toast(`🧺 Ernte: ${Object.entries(CROPS[f.crop].gives).map(([k, n]) => `${n}× ${ITEMS[k].name}`).join(', ')}`, 'good'); A.sfx('pickup'); f.crop = ''; f.p = 0; this.refresh(s); return; }
      const w = this.waterItem(); if (f.wet <= 0 && w) { g.take(w); if (ITEMS[w].after) g.add(ITEMS[w].after, 1, true); f.wet = 6; A.sfx('water'); return g.ui.toast('💧 Gegossen – wächst jetzt schneller.'); }
      return g.ui.toast(`${CROPS[f.crop].name} wachsen … ${Math.floor(f.p * 100)} %`);
    }
    if (s.type === 'kiste') { this.chest = s; return g.openPanel?.('inv'); }
    if (s.type === 'regentonne') {
      if (s.water < 1) return g.ui.toast('Die Tonne ist leer. Beim nächsten Regen füllt sie sich.');
      s.water--; A.sfx('water');
      if (g.has('topf')) { g.swap('topf', 'topf_klar'); return g.ui.toast('🫕 Topf mit sauberem Regenwasser gefüllt.'); }
      g.S.stats.thirst = Math.min(100, g.S.stats.thirst + 30); g.S.flags.drank = 1; return g.ui.toast('Kühles Regenwasser.');
    }
    g.ui.toast(this.verb(t));
  }
  chestMove(dir, i) {       // dir 1: backpack → chest, −1: chest → backpack
    const g = this.g, s = this.chest; if (!s) return;
    if (dir > 0) { const it = g.S.inv[i]; if (!it) return; let slot = s.inv.find(x => x.id === it.id && x.n < 30);
      if (!slot) { if (s.inv.length >= CHEST) return g.ui.toast('Die Kiste ist voll.', 'warn'); slot = { id: it.id, n: 0 }; s.inv.push(slot); }
      const k = Math.min(it.n, 30 - slot.n); slot.n += k; g.take(it.id, k); }
    else { const it = s.inv[i]; if (!it) return; if (g.add(it.id, it.n, true)) s.inv.splice(i, 1); }
  }

  // ---------------------------------------------------------------- trees
  chopTree(t) {
    const g = this.g;
    if (t.fixed || t.kind === 'Linde') return g.ui.toast('Diesen mächtigen Baum lässt du lieber stehen.');
    if (t.kind === 'stumpf') return;
    t.hits = (t.hits || 0) + 1; g.audio.sfx('chop'); g.S.stats.stamina = Math.max(0, g.S.stats.stamina - 3);
    const need = g.has('saege') ? 3 : 6;
    if (t.hits < need) return g.ui.toast(`🪓 ${t.hits}/${need}`);
    const P = g.P, dir = new THREE.Vector3(t.x - P.pos.x, 0, t.z - P.pos.z).normalize();
    this.fell(t, dir, true);
  }
  fell(t, dir, animate) {
    const W = this.W, g = this.g;
    W.removeTree(t); W.hideTree(t);
    const base = new THREE.Vector3(t.x, t.y, t.z);
    g.S.felled[t.name] = g.S.felled[t.name] || { rot: Math.atan2(-dir.z, dir.x), left: t.kind === 'Totholz' ? 2 : 3 };
    const rec = g.S.felled[t.name];
    // stump
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
    const g = this.g; if (!g.has('axt')) return g.ui.toast('Dafür brauchst du eine Axt.');
    L.hits++; g.audio.sfx('chop'); g.S.stats.stamina = Math.max(0, g.S.stats.stamina - 2);
    if (L.hits < (g.has('saege') ? 2 : 3)) return;
    L.hits = 0; if (!g.add('stamm', 1, true)) return; g.add('ast', 1, true); L.left--; L.rec.left = L.left;
    g.ui.toast(`+ 🪵 Baumstamm, + Ast${L.left ? ` (noch ${L.left})` : ''}`);
    if (L.left <= 0) { this.scene.remove(L.obj); this.W.removeCollider(L.col); this.logs.splice(this.logs.indexOf(L), 1); }
  }

  // ---------------------------------------------------------------- per frame
  update(dt, hours) {
    this.updateGhost();
    for (const f of [...this.falling]) {           // tree falls: accelerates like a pendulum turned upside down
      f.w += Math.sin(f.a + .08) * 2.4 * dt; f.a = Math.min(Math.PI / 2 - .03, f.a + f.w * dt);
      f.piv.quaternion.setFromAxisAngle(f.axis, f.a);
      if (f.a >= Math.PI / 2 - .031) { this.scene.remove(f.piv); this.falling.splice(this.falling.indexOf(f), 1); this.g.audio.sfx('thud'); this.addLog(f.t, f.rec); }
    }
    const rain = this.g.sky.rainAmount;
    for (const s of this.list) {
      if (s.type === 'feld' && s.field.crop && s.field.p < 1) {
        const f = s.field, k = (f.wet > 0 || rain > .3) ? 1.6 : 1;
        f.p = Math.min(1, f.p + hours / CROPS[f.crop].hours * k); f.wet = Math.max(0, f.wet - hours);
        const st = f.p >= 1 ? 3 : f.p >= .45 ? 2 : 1; if (st !== s.shown) this.refresh(s);
      }
      if (s.type === 'regentonne' && rain > .3) s.water = Math.min(WATER_MAX, s.water + hours * 3 * rain);
    }
  }

  // ---------------------------------------------------------------- save / load
  save() {
    return { list: this.list.map(s => ({ type: s.type, x: +s.x.toFixed(2), y: +s.y.toFixed(2), z: +s.z.toFixed(2), rot: +s.rot.toFixed(3), stage: s.stage, field: s.field, inv: s.inv, water: s.water,
      doorOpen: s.door?.target || 0, fuel: s.fire?.on ? +s.fire.fuel.toFixed(2) : 0 })) };
  }
  load(d) {
    for (const s of [...this.list]) this.remove(s);
    for (const L of this.logs) { this.scene.remove(L.obj); this.W.removeCollider(L.col); } this.logs = [];
    for (const x of d?.list || []) if (BLUEPRINTS.some(b => b.id === x.type)) this.make(x);
    // felled trees (by object name – trees that no longer exist in a newer map are skipped)
    const byName = new Map(this.W.trees.map(t => [t.name, t]));
    for (const [name, rec] of Object.entries(this.g.S.felled || {})) { const t = byName.get(name); if (t && !t.fixed) this.fell(t, null, false); }
  }
}
