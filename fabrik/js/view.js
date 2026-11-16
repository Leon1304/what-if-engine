// Cogtopia – Sim → Szene. Gebäude werden nur bei Topologie-Änderung (sim.rev) gedifft, Bänder/Tunnel laufen über den
// BeltInstancer, Teile über den ItemRenderer (pro Bild interpoliert), Grundstücke mit Preis-Schild, Gerald und Dr. Steve,
// Ereignis-Effekte + Töne, Geist-Vorschau beim Bauen, Auswahlrahmen, Treffer für Klicks. Kein DOM außer der Icon-Erzeugung.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBuilding, BeltInstancer, beltKind, SIZES, BELT_Y } from './models/buildings.js';
import { ItemRenderer, makeItemMesh } from './models/items.js';
import { makePlot, GROUND } from './models/terrain.js';
import { makeGerald, makeSteve } from './models/people.js';
import { Fx } from './models/fx.js';
import { setBeltStyle } from './materials.js';
import { BUILDINGS, COLORS, ITEM_IDS } from './data.js';
import { PLOT, PLOTS, MAP, outCell, DX, DY, TAKT_GAP } from './sim.js';
import { fmtNum } from './i18n.js';

const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
const angLerp = (a, b, k) => { let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * k; };
const TOP = { 1: .45, 2: 1.35, 3: 1.6 };     // ungefähre Gebäudehöhe für Trefferboxen vor dem ersten Messen

// Pfeilform (flach, zeigt nach +x), für Ausgänge in der Vorschau
function arrowGeo() {
  const s = new THREE.Shape();
  s.moveTo(-.28, -.09); s.lineTo(.04, -.09); s.lineTo(.04, -.2); s.lineTo(.3, 0); s.lineTo(.04, .2); s.lineTo(.04, .09); s.lineTo(-.28, .09); s.closePath();
  const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); return g;
}
// Rahmen n×n (für Auswahl)
function frameGeo(n) {
  const g = [], w = .07, h = .04, s = n + .08;
  for (const [x, z, sx, sz] of [[0, -s / 2, s + w, w], [0, s / 2, s + w, w], [-s / 2, 0, w, s], [s / 2, 0, w, s]]) g.push(new THREE.BoxGeometry(sx, h, sz).translate(x + n / 2, h / 2 + .01, z + n / 2));
  // Ecken etwas dicker
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.push(new THREE.BoxGeometry(.22, h * 1.6, .22).translate(x * s / 2 + n / 2, h * .8 + .01, z * s / 2 + n / 2));
  const merged = mergeGeos(g); g.forEach(x => x.dispose()); return merged;
}
function mergeGeos(list) {
  let n = 0; for (const g of list) n += g.index ? g.index.count : g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  for (const g0 of list) { const g = g0.index ? g0.toNonIndexed() : g0; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; if (g !== g0) g.dispose(); }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return m;
}
// Pfeilfarbe zur Bandfarbe
function arrowFor(id) {
  if (id === 'standard') return 0xf2c230; if (id === 'gold') return 0xfff2b0; if (id === 'schwarz') return 0x7ad8ff;
  const c = new THREE.Color(COLORS[id]?.color || '#3b3f46'); c.lerp(new THREE.Color(0xffffff), .62); return c.getHex();
}
export function beltColorHex(id) { return new THREE.Color(COLORS[id]?.color || '#3b3f46').getHex(); }

export class View {
  constructor(stage, { sound = null } = {}) {
    this.stage = stage; this.scene = stage.scene; this.sound = sound; this.sim = null; this.quiet = false;
    this.root = new THREE.Group(); this.root.name = 'world'; this.scene.add(this.root);
    this.belts = new BeltInstancer(this.root, { capacity: 512 });
    this.items = new ItemRenderer(this.scene, { capacity: 2048 });
    this.fx = new Fx(this.scene, { format: n => fmtNum(n), camera: stage.camera });
    this.B = new Map(); this.P = new Map(); this.pos = new Map(); this.rev = -1; this.t = 0;
    this.st = {};
    // Boden außerhalb der Grundstücke
    this.base = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x5e8a40, roughness: 1 }));
    this.base.position.set(MAP / 2, -.64, MAP / 2); this.base.receiveShadow = false; this.scene.add(this.base);
    // Figuren
    this.G = makeGerald(); this.G.group.visible = false; this.scene.add(this.G.group);
    this.gHit = new THREE.Mesh(new THREE.BoxGeometry(1, 1.3, 1).translate(0, .6, 0), new THREE.MeshBasicMaterial()); this.gHit.visible = false; this.G.group.add(this.gHit);
    this.g = { x: 0, z: 0, yaw: 0, anim: 'idle', since: 0, prev: 'idle', on: false, exit: 0, line: '' };
    this.Steve = makeSteve(); this.Steve.group.visible = false; this.scene.add(this.Steve.group);
    this.steve = { anim: 'think', since: 0, prev: 'think', until: 0, lab: 0 };
    // Vorschau
    this.ghostRoot = new THREE.Group(); this.scene.add(this.ghostRoot);
    this.ghostOk = new THREE.MeshStandardMaterial({ color: 0x5ae07a, transparent: true, opacity: .55, emissive: 0x2a9a40, emissiveIntensity: .45, depthWrite: false, flatShading: true });
    this.ghostBad = new THREE.MeshStandardMaterial({ color: 0xff5a4a, transparent: true, opacity: .5, emissive: 0xb02a20, emissiveIntensity: .45, depthWrite: false, flatShading: true });
    this.ghosts = new Map(); this.ghost = null;
    this.gBelts = new BeltInstancer(this.ghostRoot, { capacity: 64, shadows: false });
    this.tileMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .42, depthWrite: false, fog: false });
    this.tiles = new THREE.InstancedMesh(new THREE.PlaneGeometry(.92, .92).rotateX(-Math.PI / 2), this.tileMat, 256);
    this.tiles.count = 0; this.tiles.frustumCulled = false; this.tiles.renderOrder = 6; this.ghostRoot.add(this.tiles);
    this.arrowMat = new THREE.MeshBasicMaterial({ color: 0x4aff7a, transparent: true, opacity: .95, depthWrite: false, fog: false });
    this.arrows = new THREE.InstancedMesh(arrowGeo(), this.arrowMat, 32); this.arrows.count = 0; this.arrows.frustumCulled = false; this.arrows.renderOrder = 7; this.ghostRoot.add(this.arrows);
    this.arrows.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(32 * 3), 3);
    // Auswahl
    this.selMat = new THREE.MeshBasicMaterial({ color: 0xffd23a, fog: false });
    this.frames = { 1: frameGeo(1), 2: frameGeo(2), 3: frameGeo(3) };
    this.sel = new THREE.Mesh(this.frames[1], this.selMat); this.sel.visible = false; this.scene.add(this.sel);
    this.delFrame = new THREE.Mesh(this.frames[1], new THREE.MeshBasicMaterial({ color: 0xff3a2a, fog: false })); this.delFrame.visible = false; this.ghostRoot.add(this.delFrame);
    this.selId = 0;
    this._m = new THREE.Matrix4(); this._c = new THREE.Color(); this._v = new THREE.Vector3(); this._ray = new THREE.Raycaster(); this._box = new THREE.Box3();
    this.agg = new Map(); this.aggT = 0; this.lastCoin = 0; this.lastBuild = 0; this.lastRemove = 0; this.textBudget = 0;
    this.gridMode = 'build'; this.building = false;
  }

  // ------------------------------------------------------------------ Sim anbinden
  setSim(sim, { menu = false } = {}) {
    this.sim = sim; this.quiet = menu;
    for (const B of this.B.values()) this._drop(B);
    this.B.clear(); this.pos.clear();
    for (const p of this.P.values()) { this.root.remove(p.plot.group); p.plot.dispose(); }
    this.P.clear(); this.rev = -1; this.fx.clear();
    this.biome = sim.S.biome; this.stage.setBiome(this.biome);
    const g = GROUND[this.biome] || GROUND.wiese; this.base.material.color.set(g.cells[0]).multiplyScalar(.82);
    this.g.on = false; this.g.exit = 0; this.G.group.visible = false;
    this.steve.lab = 0; this.Steve.group.visible = false;
    this.applyDeco(); this.syncPlots(); this.sync(true);
  }
  applyDeco() {
    const id = this.sim?.S.deco.color || 'standard';
    setBeltStyle({ color: beltColorHex(id), arrow: arrowFor(id), speed: this.sim ? this.sim.M.belt : 1 });
  }
  _drop(B) { this.root.remove(B.b.group); B.b.dispose(); }

  // Grundstücke: offen, kaufbar und die gesperrten direkt daneben
  syncPlots() {
    const sim = this.sim, want = new Map();
    const open = (cx, cy) => cx >= 0 && cy >= 0 && cx < PLOTS && cy < PLOTS && sim.plotState(cx, cy) === 'open';
    for (let cy = 0; cy < PLOTS; cy++) for (let cx = 0; cx < PLOTS; cx++) {
      let st = sim.plotState(cx, cy); if (this.quiet && st === 'buyable') st = 'locked';
      let near = false; for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (open(cx + dx, cy + dy)) { near = true; break; }
      if (st === 'open' || st === 'buyable' || near) want.set(cx + ',' + cy, { cx, cy, st });
    }
    const cost = sim.plotCost();
    for (const [k, p] of this.P) if (!want.has(k) || want.get(k).st !== p.st) { this.root.remove(p.plot.group); p.plot.dispose(); this.P.delete(k); }
    for (const [k, w] of want) {
      let p = this.P.get(k);
      if (!p) {
        const ruin = w.st === 'buyable' && sim.ruin && sim.ruin[w.cy * PLOTS + w.cx];
        const plot = makePlot(w.cx, w.cy, { biome: this.biome, state: w.st, seed: (sim.S.seed % 997) + w.cx * 7 + w.cy * 13,
          deposit: w.st === 'open' ? (x, y) => sim.deposit(x, y) : () => null, ruins: ruin ? [[w.cx * PLOT + 6, w.cy * PLOT + 7]] : [], label: w.st === 'buyable' ? fmtNum(cost) : '' });
        this.root.add(plot.group); p = { plot, st: w.st, label: '' }; this.P.set(k, p);
      }
      if (w.st === 'buyable') { const l = fmtNum(cost); if (l !== p.label) { p.plot.setLabel(l); p.label = l; } }
    }
    this.occKey = null; this._occupy();
  }
  relabel() { for (const p of this.P.values()) p.label = ''; if (this.sim) this.syncPlots(); }
  _occupy() {
    const grid = this.sim.grid, fn = (x, y) => grid[y * MAP + x] !== 0;
    for (const p of this.P.values()) if (p.st === 'open') p.plot.setOccupied(fn);
  }
  bounds() {
    let x0 = MAP, z0 = MAP, x1 = 0, z1 = 0;
    for (const p of this.sim.S.plots) { const cx = p % PLOTS, cy = (p / PLOTS) | 0; x0 = Math.min(x0, cx * PLOT); z0 = Math.min(z0, cy * PLOT); x1 = Math.max(x1, cx * PLOT + PLOT); z1 = Math.max(z1, cy * PLOT + PLOT); }
    return { minX: x0 - 6, maxX: x1 + 6, minZ: z0 - 6, maxZ: z1 + 6 };
  }

  // Gebäude diffen (nur wenn sich die Topologie geändert hat)
  sync(force = false) {
    const sim = this.sim; if (!sim || (!force && sim.rev === this.rev)) return false;
    this.rev = sim.rev;
    const seen = new Set(), belts = [];
    for (const e of sim.S.ents) {
      const n = sim.N.get(e.id), d = BUILDINGS[e.type]; if (!d) continue;   // unbekannter Typ (fremder Stand): überspringen
      this.pos.set(e.id, [e.x, e.y, d.w, d.h, e.type]);
      if (e.type === 'band') { belts.push(e.x, e.y, e.rot, n && n.curve ? beltKind(n.inDir, e.rot) : 'straight'); continue; }
      if (e.type === 'tunnel') { belts.push(e.x, e.y, e.rot, e.exit ? 'tunnelOut' : 'tunnelIn'); continue; }
      seen.add(e.id);
      let B = this.B.get(e.id);
      if (B && (B.type !== e.type || B.x !== e.x || B.y !== e.y)) { this._drop(B); this.B.delete(e.id); B = null; }
      if (!B) {
        const b = makeBuilding(e.type, { rot: e.rot, level: e.lvl, ore: n && n.res >= 0 ? ITEM_IDS[n.res] : undefined, filter: e.filter ?? null });
        b.group.position.set(e.x, 0, e.y); this.root.add(b.group);
        b.group.updateMatrixWorld(true); this._box.setFromObject(b.group);
        B = { b, type: e.type, x: e.x, y: e.y, rot: e.rot, w: d.w, h: d.h, top: Math.max(.4, Math.min(2.6, this._box.max.y)) };
        this.B.set(e.id, B);
      } else if (B.rot !== e.rot) { B.b.setRot(e.rot); B.rot = e.rot; }
    }
    for (const [id, B] of this.B) if (!seen.has(id)) { this._drop(B); this.B.delete(id); }
    this.belts.begin(); for (let i = 0; i < belts.length; i += 4) this.belts.add(belts[i], belts[i + 1], belts[i + 2], belts[i + 3]); this.belts.end();
    this._occupy();
    // Dr. Steve am ersten Labor
    const lab = sim.S.ents.find(e => e.type === 'labor');
    this.steve.lab = lab ? lab.id : 0; this.steve.spot = lab ? this._steveSpot(lab) : null;
    if (this.selId && !sim.N.get(this.selId)) this.select(0);
    else if (this.selId) this.select(this.selId);
    return true;
  }

  // ------------------------------------------------------------------ Bild für Bild
  update(dt, alpha = 1) {
    const sim = this.sim; if (!sim) return;
    this.t += dt; const T = this.t;
    this.sync();
    const M = sim.M, st = this.st, cam = this.stage.camera;
    const tm1 = Math.max(1e-6, M.taktMax - 1);
    for (const [id, B] of this.B) {
      const n = sim.N.get(id); if (!n) continue; const e = n.e;
      st.busy = false; st.progress = 0; st.gold = false; st.level = e.lvl; st.fill = 0; st.takt = 0;
      switch (n.kind) {
        case 'drill': st.busy = n.res >= 0 && e.out.length < 4; st.progress = e.prog; st.gold = e.out.some(c => c & 1); st.ore = n.res >= 0 ? ITEM_IDS[n.res] : undefined; break;
        case 'machine': st.busy = !!e.craft; st.progress = e.craft ? e.prog : 0; st.gold = !!(e.craft && e.cg) || e.out.some(c => c & 1); break;
        case 'exp': st.busy = !!e.craft; st.progress = e.prog; break;
        case 'lab': st.busy = e.q.length > 0; st.progress = e.prog; break;
        case 'sell': st.busy = e.age <= TAKT_GAP; st.takt = (sim.takt(e) - 1) / tm1; break;
        case 'store': st.fill = e.q.length / BUILDINGS.lager.cap; st.busy = e.q.length > 0; break;
        case 'sort': st.filterColor = e.filter == null ? null : e.filter === 'gold' ? 0xffd040 : e.filter; st.busy = e.items.length > 0; break;
        case 'split': st.busy = e.items.length > 0; break;
      }
      B.b.update(T, st);
      if (n.kind !== 'sort') st.filterColor = undefined;
      st.ore = undefined;
    }
    // Teile
    const it = this.items; it.begin();
    sim.forEachItem(alpha, (x, z, id, g, k) => it.add(x, z, id, g, ((k * 37) % 13 - 6) * .06));
    it.end();
    this._gerald(dt, T);
    this._steve(dt, T);
    // Auswahl pulsiert
    if (this.sel.visible) { const k = .5 + .5 * Math.sin(T * 5); this.selMat.color.setRGB(1, .78 + .12 * k, .2 + .2 * k); }
    // Kosten-Aggregat für Münzen
    this.aggT += dt; this.textBudget = Math.min(8, this.textBudget + dt * 7);
    if (this.aggT > .33) { this.aggT = 0; this._flushSold(); }
    this.fx.update(dt, cam);
    for (const p of this.P.values()) p.plot.update(T);
    if (Math.floor(T) !== this._sec) { this._sec = Math.floor(T); this._perSecond(); }
  }
  _perSecond() {
    this.stage.shadowEvery = this.B.size > 40 ? 2 : 1;          // große Fabrik: Schatten im halben Takt
    const sim = this.sim; let mach = 0, busy = 0;
    for (const n of sim.mn) { if (n.kind === 'sell') continue; mach++; const e = n.e; if (e.craft || (n.kind === 'drill' && n.res >= 0 && e.out.length < 4) || (e.q && e.q.length)) busy++; }
    this.sound?.setFactory({ machines: mach, busy: mach ? busy / mach : 0 });
    setBeltStyle({ speed: sim.M.belt });
  }

  // ------------------------------------------------------------------ Gerald
  _gerald(dt, T) {
    const G = this.sim.gerald(), g = this.g, F = this.G;
    if (G) {
      let tx = G.x, tz = G.z, yaw = g.yaw, anim = 'walk';
      if (G.phase === 'sit') {
        const e = this.sim.N.get(G.belt)?.e;
        if (e) { const r = (e.rot + 1) & 3, px = DX[r], pz = DY[r]; tx = e.x + .5 + px * .3; tz = e.y + .5 + pz * .3; yaw = Math.atan2(-pz, px); }
        anim = 'sit';
      }
      if (!g.on) { g.on = true; g.x = tx; g.z = tz; g.exit = 0; F.group.visible = true; this._ganim('wave', T); g.waveUntil = T + 1.1; }
      const k = 1 - Math.exp(-14 * dt), dx = tx - g.x, dz = tz - g.z;
      g.x += dx * k; g.z += dz * k;
      if (anim === 'walk' && Math.hypot(dx, dz) > 1e-3) yaw = Math.atan2(-dz, dx);
      if (T < (g.waveUntil || 0) && anim === 'walk') anim = 'wave';
      g.yaw = angLerp(g.yaw, yaw, 1 - Math.exp(-10 * dt));
      if (anim !== g.anim) this._ganim(anim, T);
      g.line = G.line;
    } else if (g.on) {
      g.on = false; g.exit = T + (g.clicked ? 1.3 : 0.01); this._ganim(g.clicked ? 'cheer' : 'idle', T);
    }
    if (!g.on && F.group.visible && T >= g.exit) { F.group.visible = false; if (g.clicked) this.fx.poof([g.x, .1, g.z], .7); g.clicked = false; }
    if (F.group.visible) { F.group.position.set(g.x, g.anim === 'sit' ? 0 : 0, g.z); F.group.rotation.y = g.yaw; F.update(T, { anim: g.anim, speed: 1.6, since: g.since, prev: g.prev }); }
  }
  _ganim(a, T) { const g = this.g; g.prev = g.anim; g.anim = a; g.since = T; }
  geraldClicked() { this.g.clicked = true; this.fx.sparkle([this.g.x, .7, this.g.z], 14); this._snd('squeak'); }
  // ------------------------------------------------------------------ Dr. Steve
  _steve(dt, T) {
    const s = this.steve, F = this.Steve, B = s.lab ? this.B.get(s.lab) : null;
    if (!B) { F.group.visible = false; return; }
    F.group.visible = true;
    let p, cx = B.x + B.w / 2, cz = B.y + B.h / 2;
    if (s.spot) p = this._v.set(s.spot.x, 0, s.spot.z);
    else { const inner = B.b.group.children[0]?.children[0]; B.b.group.updateMatrixWorld(true); p = this._v.set(...(B.b.spots.steve || [.8, 0, -.5])); inner.localToWorld(p); }
    F.group.position.set(p.x, 0, p.z); F.group.rotation.y = Math.atan2(-(cz - p.z), cx - p.x);
    const e = this.sim.N.get(s.lab)?.e;
    let want = e && e.q.length ? 'tinker' : 'think';
    if (T < s.until) want = s.forced;
    if (want !== s.anim) { s.prev = s.anim; s.anim = want; s.since = T; }
    F.update(T, { anim: s.anim, since: s.since, prev: s.prev, phase: .3 });
  }
  // freies Feld neben dem Labor (bevorzugt auf der Kameraseite +x/+z), sonst der Platz im Modell
  _steveSpot(e) {
    const sim = this.sim, d = BUILDINGS[e.type], c = [];
    for (let j = 0; j < d.h; j++) c.push([e.x + d.w, e.y + j, 2], [e.x - 1, e.y + j, 0]);
    for (let i = 0; i < d.w; i++) c.push([e.x + i, e.y + d.h, 3], [e.x + i, e.y - 1, 1]);
    c.sort((a, b) => (b[0] + b[1]) - (a[0] + a[1]));
    for (const [x, y, dir] of c) if (sim.isOpen(x, y) && !sim.at(x, y)) return { x: x + .5 + DX[dir] * .15, z: y + .5 + DY[dir] * .15, cx: e.x + d.w / 2, cz: e.y + d.h / 2 };
    return null;
  }
  steveDo(anim, secs = 2.5) { const s = this.steve; s.forced = anim; s.until = this.t + secs; }

  // ------------------------------------------------------------------ Ereignisse → Effekte + Töne
  _snd(name, o) { if (!this.quiet && this.sound) this.sound.play(name, o); }
  _vis(x, y, z) { const v = this._v.set(x, y, z).project(this.stage.camera); return v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1; }
  onEvents(evs) {
    for (const ev of evs) {
      switch (ev.type) {
        case 'sold': {
          if (ev.gold) {
            if (this._vis(ev.x, 1, ev.z)) this.fx.coins([ev.x, 1.3, ev.z], 24, { gold: true, text: '+' + fmtNum(ev.value) });
            this._snd('jackpot'); break;
          }
          let a = this.agg.get(ev.id); if (!a) { a = { v: 0, n: 0, x: ev.x, z: ev.z, takt: 1 }; this.agg.set(ev.id, a); }
          a.v += ev.value; a.n++; a.takt = ev.takt; break;
        }
        case 'gold': if (this._vis(ev.x, .5, ev.z)) this.fx.sparkle([ev.x, .7, ev.z], 12); this._snd('coin', { combo: 1, gain: .35 }); break;
        case 'discover': this.fx.confetti([ev.x, 1.2, ev.z], 120); this.fx.sparkle([ev.x, 1, ev.z], 20); this._snd('discover'); this.steveDo('cheer', 3); break;
        case 'fail': this.fx.smoke([ev.x, .8, ev.z], { n: 8, dark: true }); this.fx.sparks([ev.x, .7, ev.z], 10, 0xff9040); this._snd('error', { gain: .45 }); break;
        case 'levelup': {
          const p = [ev.x, 1.5, ev.z]; this.fx.sparks(p, 16, 0xffd040); this.fx.sparkle(p, 10);
          this.fx.popText('★'.repeat(Math.min(5, ev.level)), [ev.x, 1.7, ev.z], { color: '#ffd84a', size: 1.2 }); this._snd('levelup'); break;
        }
        case 'build': {
          const d = BUILDINGS[ev.b]; if (!d) break;
          if (d.w > 1) this.fx.dust([ev.x + d.w / 2, 0, ev.y + d.h / 2], d.w);
          else if (this.t - this.lastBuild > .05) this.fx.dust([ev.x + .5, 0, ev.y + .5], .6);
          if (this.t - this.lastBuild > .07) { this.lastBuild = this.t; this._snd('build'); }
          break;
        }
        case 'remove': {
          const p = this.pos.get(ev.id); if (p) this.fx.poof([p[0] + p[2] / 2, .1, p[1] + p[3] / 2], p[2] > 1 ? 1.2 : .6);
          if (this.t - this.lastRemove > .07) { this.lastRemove = this.t; this._snd('remove'); }
          break;
        }
        case 'takt': this.fx.popText('×' + (Math.round(ev.takt * 10) / 10), [ev.x, 2, ev.z], { color: '#8dff9a', size: 1.5, life: 2 }); this.fx.sparkle([ev.x, 1.6, ev.z], 16); this._snd('cheer'); break;
        case 'plot': {
          this.syncPlots(); const c = [ev.cx * PLOT + 8, .3, ev.cy * PLOT + 8];
          this.fx.confetti([c[0], 1.5, c[2]], 120); this.fx.dust(c, 6); this._snd('plot');
          if (ev.ruin) this.fx.crateOpen([ev.cx * PLOT + 7, 0, ev.cy * PLOT + 8]);
          break;
        }
        case 'research': case 'patent': this._snd('research'); this.applyDeco(); break;
        case 'contract': if (ev.kind === 'done') this._snd('contract'); else if (ev.kind === 'claimed') this._snd('coin', { combo: 1 }); break;
        case 'achievement': this._snd('cheer'); break;
        case 'gerald': if (ev.kind === 'appear' || ev.kind === 'sit') this._snd('squeak', { gain: .6 }); break;
        case 'undo': this._snd('click'); break;
        case 'tip': this.steveDo('wave', 2.5); this._snd('click'); break;
        case 'prestige': this.setSim(this.sim); break;
      }
    }
  }
  _flushSold() {
    const now = this.t;
    for (const [, a] of this.agg) {
      if (!a.n) continue;
      const vis = this._vis(a.x, 1, a.z);
      if (vis) {
        const show = this.textBudget >= 1; if (show) this.textBudget -= 1;
        this.fx.coins([a.x, 1.25, a.z], Math.min(8, 2 + Math.round(Math.log2(1 + a.v / 4))), { text: show ? '+' + fmtNum(a.v) : null });
      }
      if (now - this.lastCoin > .09) { this.lastCoin = now; const tm = Math.max(1e-6, this.sim.M.taktMax - 1); this._snd('coin', { combo: Math.min(1, (a.takt - 1) / tm), gain: vis ? 1 : .35 }); }
      a.v = 0; a.n = 0;
    }
  }

  // ------------------------------------------------------------------ Vorschau beim Bauen
  _ghostModel(type, variant) {
    const key = type + ':' + variant; let g = this.ghosts.get(key);
    if (!g) {
      const b = makeBuilding(type, { rot: 0, exit: variant === 'exit', kind: type === 'band' ? 'straight' : undefined });
      const meshes = []; b.group.traverse(m => { if (m.isMesh || m.isSprite) { m.castShadow = false; m.receiveShadow = false; if (m.isMesh) { m.material = this.ghostOk; m.renderOrder = 5; meshes.push(m); } } });
      g = { b, meshes, ok: true }; this.ghosts.set(key, g); this.ghostRoot.add(b.group);
    }
    return g;
  }
  // single: { type, x, y, rot, ok, exit } · line: [{x, y, rot, ok}] · remove: [{x, y, w, h}] · null = aus
  setGhost(spec) {
    for (const g of this.ghosts.values()) g.b.group.visible = false;
    this.delFrame.visible = false;
    this.gBelts.begin(); let nt = 0, na = 0;
    const tile = (x, y, ok, col) => { if (nt >= 256) return; this._m.makeTranslation(x + .5, .035, y + .5); this.tiles.setMatrixAt(nt, this._m); this.tiles.setColorAt(nt, this._c.set(col ?? (ok ? 0x4ae070 : 0xff4a3a))); nt++; };
    const arrow = (x, y, dir, ok) => { if (na >= 32) return; const a = -dir * Math.PI / 2; this._m.makeRotationY(a).setPosition(x + .5, .33, y + .5); this.arrows.setMatrixAt(na, this._m); this.arrows.setColorAt(na, this._c.set(ok ? 0x4aff7a : 0xff6a5a)); na++; };
    if (spec && spec.line) {
      for (const c of spec.line) { this.gBelts.add(c.x, c.y, c.rot, c.kind || 'straight'); tile(c.x, c.y, c.ok); }
      const last = spec.line[spec.line.length - 1]; if (last) arrow(last.x + DX[last.rot], last.y + DY[last.rot], last.rot, last.ok);
    } else if (spec && spec.remove) {
      for (const r of spec.remove) for (let j = 0; j < r.h; j++) for (let i = 0; i < r.w; i++) tile(r.x + i, r.y + j, false, 0xff3a2a);
      const r0 = spec.remove[0]; if (r0) { this.delFrame.geometry = this.frames[r0.w] || this.frames[1]; this.delFrame.position.set(r0.x, 0, r0.y); this.delFrame.scale.set(1, 2.5, 1); this.delFrame.visible = true; }
    } else if (spec && spec.type) {
      const d = BUILDINGS[spec.type], variant = spec.type === 'tunnel' ? (spec.exit ? 'exit' : 'entry') : '';
      if (spec.type === 'band') { this.gBelts.add(spec.x, spec.y, spec.rot, spec.kind || 'straight'); }
      else {
        const g = this._ghostModel(spec.type, variant);
        g.b.group.visible = true; g.b.group.position.set(spec.x, .02, spec.y); g.b.setRot(spec.rot);
        if (g.ok !== spec.ok) { g.ok = spec.ok; for (const m of g.meshes) m.material = spec.ok ? this.ghostOk : this.ghostBad; }
      }
      for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) tile(spec.x + i, spec.y + j, spec.ok);
      for (const [ox, oy, dir] of this.outputs(spec.type, spec.x, spec.y, spec.rot, spec.exit)) arrow(ox, oy, dir, spec.ok);
    }
    this.gBelts.end();
    this.tiles.count = nt; this.tiles.instanceMatrix.needsUpdate = true; if (this.tiles.instanceColor) this.tiles.instanceColor.needsUpdate = true;
    this.arrows.count = na; this.arrows.instanceMatrix.needsUpdate = true; this.arrows.instanceColor.needsUpdate = true;
  }
  // Ausgabefelder eines Gebäudes [x, y, Richtung]
  outputs(type, x, y, rot, exit) {
    const d = BUILDINGS[type]; if (!d) return [];
    switch (d.kind) {
      case 'belt': return [[x + DX[rot], y + DY[rot], rot]];
      case 'tunnel': return exit ? [[x + DX[rot], y + DY[rot], rot]] : [];
      case 'split': return [(rot + 3) & 3, rot, (rot + 1) & 3].map(r => [x + DX[r], y + DY[r], r]);
      case 'sort': return [(rot + 3) & 3, rot].map(r => [x + DX[r], y + DY[r], r]);
      case 'sell': case 'lab': return [];
      default: { const [ox, oy] = outCell(x, y, d.w, d.h, rot); return [[ox, oy, rot]]; }
    }
  }
  setGrid(mode, building) { this.gridMode = mode ?? this.gridMode; this.building = building ?? this.building; this.stage.setGrid(this.gridMode === 'on' || (this.gridMode === 'build' && this.building)); }

  select(id) {
    this.selId = id || 0; const p = id ? this.pos.get(id) : null; const n = id && this.sim ? this.sim.N.get(id) : null;
    if (!p || !n) { this.sel.visible = false; this.selId = 0; return; }
    this.sel.geometry = this.frames[p[2]] || this.frames[1]; this.sel.position.set(p[0], 0, p[1]); this.sel.visible = true;
  }

  // ------------------------------------------------------------------ Treffer
  // → { kind: 'gerald' } | { kind: 'entity', id, x, y } | { kind: 'plot', cx, cy, x, y } | { kind: 'cell', x, y } | null
  pick(nx, ny) {
    const cam = this.stage.camera, ray = this._ray; ray.setFromCamera({ x: nx, y: ny }, cam);
    if (this.G.group.visible && this.g.on) { this.G.group.updateMatrixWorld(true); if (ray.intersectObject(this.gHit, false).length) return { kind: 'gerald' }; }
    const R = ray.ray; let best = null, bt = Infinity; const hit = new THREE.Vector3();
    for (const [id, B] of this.B) {
      this._box.min.set(B.x, 0, B.y); this._box.max.set(B.x + B.w, B.top, B.y + B.h);
      const p = R.intersectBox(this._box, hit); if (!p) continue; const d = p.distanceTo(R.origin); if (d < bt) { bt = d; best = id; }
    }
    const g = this.groundCell(nx, ny);
    if (best) return { kind: 'entity', id: best, x: g?.x, y: g?.y };
    if (!g) return null;
    const id = this.sim.at(g.x, g.y); if (id) return { kind: 'entity', id, x: g.x, y: g.y };
    if (g.x >= 0 && g.y >= 0 && g.x < MAP && g.y < MAP && !this.sim.isOpen(g.x, g.y)) return { kind: 'plot', cx: (g.x / PLOT) | 0, cy: (g.y / PLOT) | 0, x: g.x, y: g.y };
    return { kind: 'cell', x: g.x, y: g.y };
  }
  groundCell(nx, ny) {
    const ray = this._ray; ray.setFromCamera({ x: nx, y: ny }, this.stage.camera);
    const D = ray.ray.direction, O = ray.ray.origin; if (D.y > -1e-4) return null; const s = -O.y / D.y;
    const x = O.x + D.x * s, z = O.z + D.z * s; return { x: Math.floor(x), y: Math.floor(z), wx: x, wz: z };
  }
  // Weltpunkte für Sprechblasen/Pfeile
  anchor(what) {
    if (what === 'gerald') return this.G.group.visible ? [this.g.x, this.g.anim === 'sit' ? .75 : .85, this.g.z] : null;
    if (what === 'steve') return this.Steve.group.visible ? [this.Steve.group.position.x, .95, this.Steve.group.position.z] : null;
    const p = this.pos.get(what); if (!p || !this.sim.N.get(what)) return null;
    const B = this.B.get(what); return [p[0] + p[2] / 2, (B ? B.top : .4) + .25, p[1] + p[3] / 2];
  }
  stats() { const i = this.stage.renderer.info.render; return { calls: i.calls, tris: i.triangles, items: this.items.count, buildings: this.B.size }; }
}

// ------------------------------------------------------------------ Icons (eigener kleiner Renderer, danach freigegeben)
// → Promise<{ building: {type: dataURL}, item: {id: dataURL}, gold: {id: dataURL} }>
export async function renderIcons(types, items, { size = 112, goldItems = [] } = {}) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const r = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, preserveDrawingBuffer: true });
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15; r.setClearColor(0, 0);
  const scene = new THREE.Scene(), pm = new THREE.PMREMGenerator(r), env = pm.fromScene(new RoomEnvironment(), .04).texture; pm.dispose();
  scene.environment = env; scene.environmentIntensity = .55;
  scene.add(new THREE.HemisphereLight(0xe8f2ff, 0x9a8a6a, 1.1));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.4); sun.position.set(3, 6, 4); scene.add(sun);
  const cam = new THREE.PerspectiveCamera(26, 1, .05, 100);
  const out = { building: {}, item: {}, gold: {} }, box = new THREE.Box3(), c = new THREE.Vector3(), sz = new THREE.Vector3();
  const shoot = (obj, dirv, pad = 1.18) => {
    scene.add(obj); obj.updateMatrixWorld(true); box.setFromObject(obj); box.getCenter(c); box.getSize(sz);
    const rad = Math.max(sz.x, sz.y, sz.z) * .5 * pad, dist = rad / Math.sin(cam.fov * Math.PI / 360);
    cam.position.copy(c).add(new THREE.Vector3(...dirv).normalize().multiplyScalar(dist)); cam.lookAt(c); cam.updateMatrixWorld();
    r.render(scene, cam); const url = cv.toDataURL('image/png'); scene.remove(obj); return url;
  };
  let n = 0; const yieldUI = () => new Promise(res => setTimeout(res, 0));
  for (const t of types) {
    try { const b = makeBuilding(t, { rot: 1, level: 1, ore: 'eisenerz', filter: 'zahnrad' }); b.update(1.3, { busy: true, progress: .6, level: 1, takt: .6, fill: .6 });
      out.building[t] = shoot(b.group, SIZES[t] === 1 ? [1.1, 1.3, 1.5] : [1.2, 1.05, 1.6]); b.dispose(); } catch (e) { console.warn('icon', t, e); }
    if (++n % 4 === 0) await yieldUI();
  }
  for (const id of items) {
    try { const m = makeItemMesh(id, false); const g = new THREE.Group(); g.add(m); m.rotation.y = .5; out.item[id] = shoot(g, [1, 1.25, 1.3], 1.05); m.geometry.dispose(); } catch (e) { console.warn('icon', id, e); }
    if (++n % 6 === 0) await yieldUI();
  }
  for (const id of goldItems) {
    try { const m = makeItemMesh(id, true); const g = new THREE.Group(); g.add(m); m.rotation.y = .5; out.gold[id] = shoot(g, [1, 1.25, 1.3], 1.05); m.geometry.dispose(); } catch (e) { /* egal */ }
  }
  env.dispose(); r.dispose(); r.forceContextLoss?.();
  return out;
}
