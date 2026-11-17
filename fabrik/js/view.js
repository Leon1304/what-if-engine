// Cogtopia – Sim → Szene. Gebäude werden nur bei Topologie-Änderung (sim.rev) gedifft, Bänder/Tunnel laufen über den
// BeltInstancer (mit Frost und Tempo je Band), Teile über den ItemRenderer (pro Bild interpoliert), Grundstücke mit Preis-Schild,
// Gerald und Dr. Steve, Ereignis-Effekte + Töne, Geist-Vorschau beim Bauen (auch Wegsuche und Blaupausen), Auswahlrahmen, Treffer.
// Ausbau 2: Detailstufen (BuildingLOD), Stromkabel (CableSet) zwischen den Knoten eines Netzes, Drohnen (DroneRenderer), Mk-Stufen,
// Weltwunder-Baustufen + Start, Überlagerungen (Strom, Engpässe, Blitz bei „kein Strom“), Effekte der Zusatzsysteme (meta.js).
// Kein DOM außer der Icon-Erzeugung.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBuilding, BeltInstancer, beltKind, SIZES, BELT_Y } from './models/buildings.js';
import { ItemRenderer, makeItemMesh } from './models/items.js';
import { makePlot, GROUND } from './models/terrain.js';
import { makeGerald, makeSteve } from './models/people.js';
import { Fx } from './models/fx.js';
import { BuildingLOD } from './models/lod.js';
import { CableSet } from './models/power.js';
import { DroneRenderer } from './models/drones.js';
import { Overlay } from './models/overlay.js';
import { setBeltStyle } from './materials.js';
import { BUILDINGS, COLORS, ITEM_IDS } from './data.js';
import { PLOT, PLOTS, MAP, outCell, DX, DY, TAKT_GAP } from './sim.js';
import { fmtNum } from './i18n.js';

const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
const angLerp = (a, b, k) => { let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * k; };
const TOP = { 1: .45, 2: 1.35, 3: 1.6 };     // ungefähre Gebäudehöhe für Trefferboxen vor dem ersten Messen
const POWER_NODE = { power: 1, solar: 1, mast: 1 };
// Gerades Band mit Einmündung von der Seite (Band, Bohrer, Maschine schiebt seitlich hinein): Schiene dort offen.
// Zuführer bewegt sich nach RIGHT(r) → kommt von links (lokal −z) → 'straightL'; nach LEFT(r) → von rechts (+z) → 'straightR'
function mergeKind(n, r) {
  if (!n) return 'straight';
  const L = n.feed & (1 << ((r + 1) & 3)), R = n.feed & (1 << ((r + 3) & 3));
  return L && R ? 'straightLR' : L ? 'straightL' : R ? 'straightR' : 'straight';
}
// Abstand zweier Grundflächen (Chebyshev, 0 = berühren/überlappen)
const cheb = (a, b) => Math.max(0, b.x - (a.x + a.w - 1), a.x - (b.x + b.w - 1), b.y - (a.y + a.h - 1), a.y - (b.y + b.h - 1));

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
  constructor(stage, { sound = null, rig = null } = {}) {
    this.stage = stage; this.scene = stage.scene; this.sound = sound; this.rig = rig; this.sim = null; this.quiet = false;
    this.root = new THREE.Group(); this.root.name = 'world'; this.scene.add(this.root);
    this.belts = new BeltInstancer(this.root, { capacity: 512 });
    this.items = new ItemRenderer(this.scene, { capacity: 2048 });
    this.fx = new Fx(this.scene, { format: n => fmtNum(n), camera: stage.camera, stage, rig });
    this.lod = new BuildingLOD(this.root, { near: 34, maxFull: 70 });
    this.cables = new CableSet(this.root);
    this.drones = new DroneRenderer(this.root, { capacity: 16 });
    this.ov = new Overlay(this.scene); this.ov.visible = false; this.ovOn = { power: false, issues: false }; this.ovT = 0;
    this.ovA = new Overlay(this.scene);                      // immer an: Blitz bei „kein Strom“, Drohnen-Verknüpfung
    this.cam = null;                                         // andere Kamera (Zeitraffer); sonst stage.camera
    this.B = new Map(); this.P = new Map(); this.pos = new Map(); this.rev = -1; this.t = 0;
    this.st = {}; this.pairs = []; this.handles = new Map(); this.dirtyPlots = new Set(); this.beltSig = ''; this.wonderSig = '';
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
    this.ghosts = new Map(); this.ghost = null; this.bpPool = new Map();
    this.gBelts = new BeltInstancer(this.ghostRoot, { capacity: 64, shadows: false });
    this.tileMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .42, depthWrite: false, fog: false });
    this.tileCap = 2600;
    this.tiles = new THREE.InstancedMesh(new THREE.PlaneGeometry(.92, .92).rotateX(-Math.PI / 2), this.tileMat, this.tileCap);
    this.tiles.count = 0; this.tiles.frustumCulled = false; this.tiles.renderOrder = 6; this.ghostRoot.add(this.tiles);
    this.arrowMat = new THREE.MeshBasicMaterial({ color: 0x4aff7a, transparent: true, opacity: .95, depthWrite: false, fog: false });
    this.arrows = new THREE.InstancedMesh(arrowGeo(), this.arrowMat, 64); this.arrows.count = 0; this.arrows.frustumCulled = false; this.arrows.renderOrder = 7; this.ghostRoot.add(this.arrows);
    this.arrows.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(64 * 3), 3);
    // Auswahl
    this.selMat = new THREE.MeshBasicMaterial({ color: 0xffd23a, fog: false });
    this.frames = { 1: frameGeo(1), 2: frameGeo(2), 3: frameGeo(3), 5: frameGeo(5) };
    this.sel = new THREE.Mesh(this.frames[1], this.selMat); this.sel.visible = false; this.scene.add(this.sel);
    this.delFrame = new THREE.Mesh(this.frames[1], new THREE.MeshBasicMaterial({ color: 0xff3a2a, fog: false })); this.delFrame.visible = false; this.ghostRoot.add(this.delFrame);
    this.selId = 0;
    this._m = new THREE.Matrix4(); this._c = new THREE.Color(); this._v = new THREE.Vector3(); this._ray = new THREE.Raycaster(); this._box = new THREE.Box3();
    this.agg = new Map(); this.aggT = 0; this.lastCoin = 0; this.lastBuild = 0; this.lastRemove = 0; this.lastDrone = 0; this.textBudget = 0;
    this.gridMode = 'build'; this.building = false;
  }
  get camera() { return this.cam || this.stage.camera; }

  // ------------------------------------------------------------------ Sim anbinden
  setSim(sim, { menu = false } = {}) {
    this.sim = sim; this.quiet = menu;
    for (const B of this.B.values()) this._drop(B);
    this.B.clear(); this.pos.clear(); this.lod.clear();
    for (const p of this.P.values()) { this.root.remove(p.plot.group); p.plot.dispose(); }
    this.P.clear(); this.rev = -1; this.fx.clear(); this._trimFx(); this.handles.clear(); this.dirtyPlots.clear(); this.beltSig = ''; this.wonderSig = '';
    this.drones.begin(); this.drones.end(this.t); this.cables.set([]); this.pairs = [];
    this.ov.clear(); this.ovA.clear();
    this.biome = sim.S.biome; this.stage.setBiome(this.biome);
    const g = GROUND[this.biome] || GROUND.wiese; this.base.material.color.set(g.cells[0]).multiplyScalar(.82);
    this.g.on = false; this.g.exit = 0; this.G.group.visible = false;
    this.steve.lab = 0; this.Steve.group.visible = false;
    // Welt-Zustand: Sandsturm läuft schon, Frost in der Eiswelt, Musik der Welt
    const storm = !menu && sim.S.storm && sim.S.storm.left > 0;
    this.fx.storm(storm, { strength: 1 }); this.stage.setWeather({ frost: this.biome === 'eis' ? .25 : 0 });
    if (this.sound) { this.sound.setWorld(this.biome); this.sound.setStorm(!!storm); if (menu) this.sound.setPower({ plants: 0, load: 0 }); }
    this.applyDeco(); this.syncPlots(); this.sync(true);
  }
  // Text-Texturen der Effekte (Münzbeträge) beim Fabrikwechsel freigeben – der Zwischenspeicher füllt sich sonst bis 160
  _trimFx() { const F = this.fx; if (!F.tex) return; for (const [k, tx] of F.tex) if (!F.sprites.some(s => s.visible && s.material.map === tx)) { tx.dispose(); F.tex.delete(k); } }
  applyDeco() {
    const id = this.sim?.S.deco.color || 'standard';
    setBeltStyle({ color: beltColorHex(id), arrow: arrowFor(id), speed: this.sim ? this.sim.M.belt : 1 });
  }
  _drop(B) { this.lod.remove(B.b); this.root.remove(B.b.group); B.b.dispose(); }

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
    for (const [k, p] of this.P) if (!want.has(k) || want.get(k).st !== p.st || this.dirtyPlots.has(k)) { this.root.remove(p.plot.group); p.plot.dispose(); this.P.delete(k); }
    this.dirtyPlots.clear();
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
    const seen = new Set();
    for (const e of sim.S.ents) {
      const n = sim.N.get(e.id), d = BUILDINGS[e.type]; if (!d) continue;   // unbekannter Typ (fremder Stand): überspringen
      this.pos.set(e.id, [e.x, e.y, d.w, d.h, e.type]);
      if (e.type === 'band' || e.type === 'tunnel') continue;
      seen.add(e.id);
      let B = this.B.get(e.id);
      if (B && (B.type !== e.type || B.x !== e.x || B.y !== e.y)) { this._drop(B); this.B.delete(e.id); B = null; }
      if (!B) {
        const mk = e.mk || 1;
        const b = makeBuilding(e.type, { rot: e.rot, level: e.lvl, mk, ore: n && n.res >= 0 ? ITEM_IDS[n.res] : undefined, filter: e.filter ?? null });
        b.group.position.set(e.x, 0, e.y); this.root.add(b.group);
        b.group.updateMatrixWorld(true); this._box.setFromObject(b.group);
        B = { b, type: e.type, x: e.x, y: e.y, rot: e.rot, w: d.w, h: d.h, mk: b.mk, top: Math.max(.4, Math.min(e.type === 'wunder' || e.type === 'grossbohrer' ? 4 : 2.6, this._box.max.y)) };
        this.B.set(e.id, B); this.lod.add(b);
      } else if (B.rot !== e.rot) { B.b.setRot(e.rot); B.rot = e.rot; this.lod.refresh(B.b); }
    }
    for (const [id, B] of this.B) if (!seen.has(id)) { this._drop(B); this.B.delete(id); }
    this._syncBelts(true);
    this._occupy();
    this._syncCables();
    // Dr. Steve am ersten Labor
    const lab = sim.S.ents.find(e => e.type === 'labor');
    this.steve.lab = lab ? lab.id : 0; this.steve.spot = lab ? this._steveSpot(lab) : null;
    if (this.selId && !sim.N.get(this.selId)) this.select(0);
    else if (this.selId) this.select(this.selId);
    this.ovT = 99;                                                   // Überlagerungen sofort neu
    return true;
  }
  // Bänder (Frost/Tempo je Band): bei Topologie-Änderung oder wenn sich Frost/Sturm ändert
  _syncBelts(force = false) {
    const sim = this.sim; let sig = '';
    if (!force) { let fr = 0; for (const n of sim.bn) if (n.frozen) fr++; sig = fr + ':' + (sim.S.storm?.left > 0 ? 1 : 0); if (sig === this.beltSig) return; }
    else { let fr = 0; for (const n of sim.bn) if (n.frozen) fr++; sig = fr + ':' + (sim.S.storm?.left > 0 ? 1 : 0); }
    this.beltSig = sig;
    this.belts.begin();
    for (const e of sim.S.ents) {
      if (e.type !== 'band' && e.type !== 'tunnel') continue;
      const n = sim.N.get(e.id), fr = n && n.frozen ? 1 : 0, sp = n && n.sl != null ? n.sl : 1;
      if (e.type === 'band') this.belts.add(e.x, e.y, e.rot, n && n.curve ? beltKind(n.inDir, e.rot) : mergeKind(n, e.rot), fr, sp);
      else this.belts.add(e.x, e.y, e.rot, e.exit ? 'tunnelOut' : 'tunnelIn', fr, sp);
    }
    this.belts.end();
  }
  // Stromkabel: je Netz ein Baum (Prim) über Erzeuger und Masten in Reichweite
  _syncCables() {
    const sim = this.sim; this.pairs = [];
    if (!sim.powerInfo || this.quiet && !this.cam) { this.cables.set([]); return; }
    const nets = sim.powerInfo(), pairs = [];
    nets.forEach((net, ni) => {
      const ns = [];
      for (const id of net.nodes) { const B = this.B.get(id), n = sim.N.get(id); if (!B || !n) continue; const a = B.b.anchor('cable'); if (a) ns.push({ id, x: n.e.x, y: n.e.y, w: n.w, h: n.h, r: BUILDINGS[n.e.type].range || 0, a }); }
      if (ns.length < 2) return;
      const inT = new Set([0]), best = ns.map((q, i) => ({ d: Infinity, j: -1 }));
      const upd = i => { for (let j = 0; j < ns.length; j++) { if (inT.has(j)) continue; const A = ns[i], C = ns[j]; if (cheb(A, C) > Math.max(A.r, C.r)) continue;
        const d = Math.hypot(A.a[0] - C.a[0], A.a[2] - C.a[2]); if (d < best[j].d) best[j] = { d, j: i }; } };
      upd(0);
      for (;;) {
        let k = -1; for (let j = 0; j < ns.length; j++) if (!inT.has(j) && best[j].j >= 0 && (k < 0 || best[j].d < best[k].d)) k = j;
        if (k < 0) break; inT.add(k); pairs.push({ a: ns[best[k].j].a, b: ns[k].a, s: net.s, net: ni, ids: [ns[best[k].j].id, ns[k].id] }); upd(k);
      }
    });
    this.pairs = pairs; this.cables.set(pairs.map(p => [p.a, p.b]));
  }

  // ------------------------------------------------------------------ Bild für Bild
  update(dt, alpha = 1) {
    const sim = this.sim; if (!sim) return;
    this.t += dt; const T = this.t;
    if (this.dirtyPlots.size) this.syncPlots();
    this.sync();
    const M = sim.M, st = this.st, cam = this.camera;
    const tm1 = Math.max(1e-6, M.taktMax - 1), storm = sim.S.storm && sim.S.storm.left > 0;
    let w = null;
    for (const [id, B] of this.B) {
      const n = sim.N.get(id); if (!n) continue; const e = n.e;
      st.busy = false; st.progress = 0; st.gold = false; st.level = e.lvl; st.fill = 0; st.takt = 0;
      st.power = n.use > 0 ? (n.pw ?? 1) : 1;
      const mk = e.mk || 1; if (mk !== B.mk) { B.mk = B.b.setMk(mk); this.lod.refresh(B.b); }
      switch (n.kind) {
        case 'drill': st.busy = n.res >= 0 && e.out.length < this.sim._dcap(n) && st.power > 0; st.progress = e.prog; st.gold = e.out.some(c => c & 1); st.ore = n.res >= 0 ? ITEM_IDS[n.res] : undefined; break;
        case 'machine': st.busy = !!e.craft && st.power > 0; st.progress = e.craft ? e.prog : 0; st.gold = !!(e.craft && e.cg) || e.out.some(c => c & 1); break;
        case 'exp': st.busy = !!e.craft && st.power > 0; st.progress = e.prog; break;
        case 'lab': st.busy = e.q.length > 0 && st.power > 0; st.progress = e.prog; break;
        case 'sell': st.busy = e.age <= TAKT_GAP; st.takt = (sim.takt(e) - 1) / tm1; break;
        case 'store': st.fill = e.q.length / (BUILDINGS.lager.cap * (mk || 1)); st.busy = e.q.length > 0; break;
        case 'sort': st.filterColor = e.filter == null ? null : e.filter === 'gold' ? 0xffd040 : e.filter; st.busy = e.items.length > 0; break;
        case 'split': st.busy = e.items.length > 0; break;
        case 'power': { st.busy = n.out > 0; const net = n.net >= 0 && sim.nets ? sim.nets[n.net] : null; st.load = net && net.supply > 0 ? Math.min(1, net.demand / net.supply) : 0; break; }
        case 'solar': st.sun = n.out > 0 ? 1 : 0; st.storm = storm; st.busy = n.out > 0; break;
        case 'mast': st.busy = n.net >= 0 && sim.nets && sim.nets[n.net]?.supply > 0; break;
        case 'heater': st.busy = n.pw > 0; break;
        case 'drone': { let home = 0; for (const d of e.dr) if (d.s === 0) home++; st.docked = home; st.busy = e.dr.some(d => d.s !== 0) || e.q.length > 0; break; }
        case 'wonder': {
          w ||= sim.wonder(); const done = w.done ? 5 : w.stage - 1; let sn = 0, sh = 0;
          for (const k in w.need) { sn += w.need[k]; sh += Math.min(w.need[k], w.have[k] || 0); }
          st.stage = done; st.progress = w.done ? 0 : sn ? Math.round(sh / sn * 200) / 200 : 0; st.busy = !w.done; break;
        }
      }
      B.b.update(T, st);
      if (n.kind !== 'sort') st.filterColor = undefined;
      st.ore = undefined; st.load = undefined; st.sun = undefined; st.storm = undefined; st.docked = undefined; st.stage = undefined;
    }
    // Detailstufen: nahe Gebäude voll, ferne als Hülle (Schwelle wächst mit dem Kameraabstand)
    const rd = this.rig ? this.rig.distance : 30;
    this.lod.near = this.cam ? 1e4 : Math.max(34, rd * 1.25 + 12); this.lod.maxFull = this.cam ? 400 : 70;
    this.lod.update(cam);
    // Frost/Sturm auf Bändern
    if ((this._bt = (this._bt || 0) + dt) > .5) { this._bt = 0; this._syncBelts(false); }
    // Teile
    const it = this.items; it.begin();
    sim.forEachItem(alpha, (x, z, id, g, k) => it.add(x, z, id, g, ((k * 37) % 13 - 6) * .06));
    it.end();
    // Drohnen
    if (sim.forEachDrone) { const D = this.drones; D.begin(); sim.forEachDrone(alpha, (x, z, h, id, g, k) => D.add(x, z, h, id, g, k)); D.end(T); }
    this._gerald(dt, T);
    this._steve(dt, T);
    // Auswahl pulsiert
    if (this.sel.visible) { const k = .5 + .5 * Math.sin(T * 5); this.selMat.color.setRGB(1, .78 + .12 * k, .2 + .2 * k); }
    // Kosten-Aggregat für Münzen
    this.aggT += dt; this.textBudget = Math.min(8, this.textBudget + dt * 7);
    if (this.aggT > .33) { this.aggT = 0; this._flushSold(); }
    this.fx.camera = cam; this.fx.update(dt, cam);
    for (const p of this.P.values()) p.plot.update(T);
    // Überlagerungen
    if ((this.ovT += dt) > .5) { this.ovT = 0; this._overlays(); }
    this.ov.update(T, cam); this.ovA.update(T, cam);
    if (Math.floor(T) !== this._sec) { this._sec = Math.floor(T); this._perSecond(); }
  }
  _perSecond() {
    this.stage.shadowEvery = this.B.size > 40 ? 2 : 1;          // große Fabrik: Schatten im halben Takt
    const sim = this.sim; let mach = 0, busy = 0, plants = 0, load = 0;
    for (const n of sim.mn) {
      if (n.kind === 'power') { if (n.out > 0) { plants++; const net = sim.nets?.[n.net]; load += net && net.supply > 0 ? Math.min(1, net.demand / net.supply) : 0; } continue; }
      if (n.kind === 'sell' || POWER_NODE[n.kind] || n.kind === 'heater' || n.kind === 'wonder') continue;
      mach++; const e = n.e; if (e.craft || (n.kind === 'drill' && n.res >= 0 && e.out.length < this.sim._dcap(n)) || (e.q && e.q.length)) busy++;
    }
    if (!this.quiet && this.sound) { this.sound.setFactory({ machines: mach, busy: mach ? busy / mach : 0 }); this.sound.setPower({ plants, load: plants ? load / plants : 0 }); }
    setBeltStyle({ speed: sim.M.belt });
  }

  // ------------------------------------------------------------------ Überlagerungen
  setOverlay(kind, on) { this.ovOn[kind] = !!on; this.ov.visible = this.ovOn.power || this.ovOn.issues; this.ovT = 99; }
  _overlays() {
    const sim = this.sim; if (!sim || !sim.powerInfo) return;
    // immer: Blitz über Maschinen ohne Strom (nicht im Menü)
    const np = [];
    if (!this.quiet) for (const n of sim.mn) if (n.use > 0 && n.pw <= 0) { const B = this.B.get(n.id); np.push({ x: n.e.x + n.w / 2, z: n.e.y + n.h / 2, y: (B ? B.top : 1.4) + .6 }); }
    this.ovA.setNoPower(np);
    if (!this.ov.visible) return;
    const nets = sim.powerInfo();
    if (this.ovOn.power) {
      this.ov.setPower(nets.map(net => ({ s: net.demand > 0 ? net.s : 1, areas: net.nodes.map(id => { const n = sim.N.get(id); return n ? { x: n.e.x, y: n.e.y, w: n.w, h: n.h, r: BUILDINGS[n.e.type].range || 0 } : null; }).filter(Boolean) })));
      this.ov.setLines(this.pairs.map(p => ({ a: p.a, b: p.b, s: nets[p.net] ? (nets[p.net].demand > 0 ? nets[p.net].s : 1) : 1 })));
    } else { this.ov.setPower([]); this.ov.setLines([]); }
    const issues = [];
    if (this.ovOn.power) nets.forEach(net => {
      const id = net.nodes[0], n = id && sim.N.get(id); if (!n) return; const B = this.B.get(id);
      issues.push({ x: n.e.x + n.w / 2, z: n.e.y + n.h / 2, y: (B ? B.top : 1.5) + .9, kind: 'power', label: net.demand > 0 ? Math.round(Math.min(1, net.supply / net.demand) * 100) + '%' : '—', sev: net.s < 1 ? 1 : .3 });
    });
    if (this.ovOn.issues) for (const b of sim.bottlenecks(14)) {
      const n = sim.N.get(b.id); if (!n) continue; const B = this.B.get(b.id), d = sim.diagnose(b.id);
      const kind = b.state === 'nopower' || b.state === 'lowpower' ? 'power' : b.state === 'missing' || b.state === 'starved' || b.state === 'idle' ? 'missing' : 'jam';
      issues.push({ x: n.e.x + n.w / 2, z: n.e.y + n.h / 2, y: (B ? B.top : 1.4) + .5, kind, item: d && d.missing[0] || undefined, sev: Math.min(1, b.sev / 3) });
    }
    this.ov.setIssues(issues);
  }
  // Drohnen-Verknüpfung (Vorschau / ausgewählter Hafen): Linien von a nach b
  setLinks(list) {
    const sim = this.sim, segs = [];
    for (const [a, b, s] of list || []) {
      const A = this.anchor(a) || (Array.isArray(a) ? a : null), Bp = Array.isArray(b) ? b : this.anchor(b); if (!A || !Bp) continue;
      segs.push({ a: [A[0], A[1] + .2, A[2]], b: [Bp[0], (Bp[1] ?? 1) + .2, Bp[2]], s: s ?? 1 });
    }
    const key = JSON.stringify(segs); if (key === this._linkKey) return; this._linkKey = key; this.ovA.setLines(segs);
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
  _vis(x, y, z) { const v = this._v.set(x, y, z).project(this.camera); return v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1; }
  // Mitte der Kamera (für Effekte ohne Ort)
  _focus(y = 0) { const t = this.rig ? this.rig.target : { x: 56, z: 56 }; return [t.x, y, t.z]; }
  _firstOf(type) { const e = this.sim.S.ents.find(q => q.type === type); return e ? [e.x + BUILDINGS[type].w / 2, 0, e.y + BUILDINGS[type].h / 2] : null; }
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
        case 'join': {                                               // Bänder haben sich verbunden: kurzes Funkeln
          for (const id of (ev.ids || []).slice(0, 6)) { const p = this.pos.get(id) || (() => { const n = this.sim.N.get(id); return n ? [n.e.x, n.e.y, 1, 1] : null; })(); if (p) this.fx.sparkle([p[0] + .5, .35, p[1] + .5], 6); }
          this._snd('rotate', { gain: .5 }); break;
        }
        case 'paste': this.fx.dust([ev.x + ev.w / 2, 0, ev.y + ev.h / 2], Math.min(6, Math.max(ev.w, ev.h) * .6)); this.fx.sparkle([ev.x + ev.w / 2, .8, ev.y + ev.h / 2], 16); this._snd('build'); break;
        case 'merge': {                                              // 4 Bohrer → Großbohrer: Staub, Funken, Text
          this.fx.dust([ev.x, 0, ev.z], 4); this.fx.upgradeSparks(ev.x - 2, ev.z - 2, 4, { color: 0xffc040, height: 2.4 }); this.fx.sparkle([ev.x, 2.2, ev.z], 24);
          this.fx.popText('×4', [ev.x, 3.4, ev.z], { color: '#ffd84a', size: 1.6 }); this._snd('upgrade'); this.rig?.shake?.(.25, .4); break;
        }
        case 'upgrade': {
          const d = BUILDINGS[ev.b], n = d ? d.w : 2; this.fx.upgradeSparks(ev.x - n / 2, ev.z - n / 2, n);
          this.fx.popText('Mk ' + ['', 'I', 'II', 'III'][ev.mk], [ev.x, 2.1, ev.z], { color: '#9fe0ff', size: 1.1 }); this._snd('upgrade'); break;
        }
        case 'link': this._snd('click'); { const a = this.anchor(ev.a); if (a) this.fx.sparkle(a, 10); const b = ev.b && this.anchor(ev.b); if (b) this.fx.sparkle(b, 10); } break;
        case 'drone': if (ev.kind === 'launch' && this.t - this.lastDrone > .6) { this.lastDrone = this.t; this._snd('drone', { gain: .5 }); } break;
        case 'power': this._snd(ev.kind === 'graceEnd' ? 'blackout' : 'power'); break;
        case 'storm':
          this.fx.storm(!!ev.on, { strength: 1 }); this.sound?.setStorm(!!ev.on && !this.quiet);
          if (ev.on) this._snd('storm'); this._syncBelts(true); break;
        case 'deposit': this.dirtyPlots.add(((ev.x / PLOT) | 0) + ',' + ((ev.y / PLOT) | 0)); break;
        case 'event': this._metaEvent(ev); break;
        case 'breakthrough': { const p = this._firstOf('labor') || this._focus(); this.fx.breakthrough([p[0], 0, p[2]]); this._snd('breakthrough'); this.steveDo('cheer', 3); break; }
        case 'card': { const p = this._firstOf('verkauf') || this._focus(); if (this.t - (this._lastCard || -9) > 1.2) { this._lastCard = this.t; this.fx.albumCard([p[0], 1.4, p[2]], { item: ev.item, variant: ev.variant }); this._snd('card', { variant: ev.variant }); } break; }
        case 'streak': this.fx.wheelConfetti(this._focus(.4), { big: ev.day === 7 }); this._snd('streak'); break;
        case 'album': this.fx.confetti(this._focus(1.4), 140); this._snd('discover'); break;
        case 'wonder': {
          const B = [...this.B.values()].find(q => q.type === 'wunder'), x = ev.x ?? (B ? B.x + 2.5 : this._focus()[0]), z = ev.z ?? (B ? B.y + 2.5 : this._focus()[2]);
          this.fx.confetti([x, 3, z], 160); this.fx.sparkle([x, 2, z], 24); this._snd('wonder', { stage: ev.stage });
          if (ev.launch && B) { B.b.launch?.(this.t); this._snd('launch', { at: 2.4 }); this.rig?.shake?.(.5, 6); }
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
  // Ereignisse der Zusatzsysteme (Meteor, Beben, Goldader, VIP, Boom)
  _metaEvent(ev) {
    const H = this.handles, k = ev.kind;
    if (!ev.on) {
      const h = H.get(k); if (h) { for (const x of [].concat(h)) x?.remove?.(); H.delete(k); }
      if (k === 'vip' && ev.ok) { const s = this._firstOf('verkauf'); if (s) this.fx.coins([s[0], 1.4, s[2]], 30, { gold: true, text: '+' + fmtNum(ev.reward || 0) }); this._snd('jackpot'); }
      return;
    }
    const deps = ev.deps || [];
    switch (k) {
      case 'meteor': { const d = deps[0], x = ev.x ?? (d ? d.x + d.w / 2 : this._focus()[0]), z = ev.z ?? (d ? d.y + d.h / 2 : this._focus()[2]);
        H.set(k, this.fx.meteor(x, z, { size: 1 })); this._snd('meteor'); break; }
      case 'quake': { const hs = deps.map(d => this.fx.quakeCracks(d.x + d.w / 2, d.y + d.h / 2, 2.4, { secs: 14, shake: .4 })); if (!deps.length) hs.push(this.fx.quakeCracks(...[this._focus()[0], this._focus()[2]], 3)); H.set(k, hs); this._snd('quake'); break; }
      case 'goldvein': {
        const drills = this.sim.S.ents.filter(e => e.type === 'bohrer' || e.type === 'grossbohrer').slice(0, 5), secs = ev.secs || 120;
        const hs = drills.length ? drills.map(e => { const w = BUILDINGS[e.type].w; return this.fx.goldvein(e.x + w / 2, e.y + w / 2, w, secs); }) : [this.fx.goldvein(this._focus()[0], this._focus()[2], 2.5, secs)];
        H.set(k, hs); this._snd('discover'); break;
      }
      case 'vip': { const s = this._firstOf('verkauf'); if (s) { const b = this.bounds(); H.set(k, this.fx.vip([b.maxX + 6, s[2]], [s[0], s[2]], {})); } this._snd('contract'); break; }
      case 'boom': { for (const e of this.sim.S.ents.filter(q => q.type === 'verkauf').slice(0, 6)) { this.fx.popText('×' + (ev.mul || 3), [e.x + 1, 2.4, e.y + 1], { color: '#ffd84a', size: 1.4, life: 2.4 }); this.fx.coins([e.x + 1, 1.4, e.y + 1], 10, {}); } this._snd('cheer'); break; }
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
  _ghostify(b) {
    const meshes = []; b.group.traverse(m => { if (m.isMesh || m.isSprite) { m.castShadow = false; m.receiveShadow = false; if (m.isMesh) { m.material = this.ghostOk; m.renderOrder = 5; meshes.push(m); } } });
    return { b, meshes, ok: true };
  }
  _ghostModel(type, variant) {
    const key = type + ':' + variant; let g = this.ghosts.get(key);
    if (!g) {
      g = this._ghostify(makeBuilding(type, { rot: 0, exit: variant === 'exit', kind: type === 'band' ? 'straight' : undefined }));
      this.ghosts.set(key, g); this.ghostRoot.add(g.b.group);
    }
    return g;
  }
  // Blaupausen-Geister: Vorrat je Typ (wiederverwendet, wächst nur)
  _bpGhost(type, i) {
    let list = this.bpPool.get(type); if (!list) this.bpPool.set(type, list = []);
    while (list.length <= i) { const g = this._ghostify(makeBuilding(type, { rot: 0 })); this.ghostRoot.add(g.b.group); list.push(g); }
    return list[i];
  }
  _setOk(g, ok) { if (g.ok !== ok) { g.ok = ok; for (const m of g.meshes) m.material = ok ? this.ghostOk : this.ghostBad; } }
  // single: { type, x, y, rot, ok, exit } · line: [{x, y, rot, ok, kind}] · remove: [{x, y, w, h}] · bp: { ents, x, y, ok, blocked } · rect: {x0,y0,x1,y1} · null = aus
  setGhost(spec) {
    for (const g of this.ghosts.values()) g.b.group.visible = false;
    for (const l of this.bpPool.values()) for (const g of l) g.b.group.visible = false;
    this.delFrame.visible = false;
    this.gBelts.begin(); let nt = 0, na = 0;
    const tile = (x, y, ok, col) => { if (nt >= this.tileCap) return; this._m.makeTranslation(x + .5, .035, y + .5); this.tiles.setMatrixAt(nt, this._m); this.tiles.setColorAt(nt, this._c.set(col ?? (ok ? 0x4ae070 : 0xff4a3a))); nt++; };
    const arrow = (x, y, dir, ok) => { if (na >= 64) return; const a = -dir * Math.PI / 2; this._m.makeRotationY(a).setPosition(x + .5, .33, y + .5); this.arrows.setMatrixAt(na, this._m); this.arrows.setColorAt(na, this._c.set(ok ? 0x4aff7a : 0xff6a5a)); na++; };
    if (spec && spec.line) {
      for (const c of spec.line) { this.gBelts.add(c.x, c.y, c.rot, c.kind || 'straight'); tile(c.x, c.y, c.ok); }
      const last = spec.line[spec.line.length - 1]; if (last) arrow(last.x + DX[last.rot], last.y + DY[last.rot], last.rot, last.ok);
    } else if (spec && spec.remove) {
      for (const r of spec.remove) for (let j = 0; j < r.h; j++) for (let i = 0; i < r.w; i++) tile(r.x + i, r.y + j, false, 0xff3a2a);
      const r0 = spec.remove[0]; if (r0) { this.delFrame.geometry = this.frames[r0.w] || this.frames[1]; this.delFrame.position.set(r0.x, 0, r0.y); this.delFrame.scale.set(1, 2.5, 1); this.delFrame.visible = true; }
    } else if (spec && spec.rect) {                                  // Auswahlrechteck (Blaupause aufnehmen)
      const { x0, y0, x1, y1 } = spec.rect;
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) tile(x, y, true, this.sim && this.sim.at(x, y) ? 0xffd23a : 0x6ab8ff);
    } else if (spec && spec.bp) {                                    // Blaupause einfügen
      const bad = new Set((spec.blocked || []).map(([x, y]) => x + ',' + y)), cnt = new Map();
      for (const q of spec.bp.ents) {
        const d = BUILDINGS[q.type]; if (!d) continue; const ex = spec.x + q.dx, ey = spec.y + q.dy;
        let ok = spec.ok; for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) if (bad.has((ex + i) + ',' + (ey + j))) ok = false;
        if (q.type === 'band') this.gBelts.add(ex, ey, q.rot, 'straight');
        else if (q.type === 'tunnel') this.gBelts.add(ex, ey, q.rot, 'tunnelIn');
        else { const i = cnt.get(q.type) || 0; cnt.set(q.type, i + 1); if (i < 40) { const g = this._bpGhost(q.type, i); g.b.group.visible = true; g.b.group.position.set(ex, .02, ey); g.b.setRot(q.rot); this._setOk(g, ok); } }
        for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) tile(ex + i, ey + j, ok && !bad.has((ex + i) + ',' + (ey + j)));
      }
      for (const [x, y] of spec.blocked || []) tile(x, y, false);
    } else if (spec && spec.type) {
      const d = BUILDINGS[spec.type], variant = spec.type === 'tunnel' ? (spec.exit ? 'exit' : 'entry') : '';
      if (spec.type === 'band') { this.gBelts.add(spec.x, spec.y, spec.rot, spec.kind || 'straight'); }
      else {
        const g = this._ghostModel(spec.type, variant);
        g.b.group.visible = true; g.b.group.position.set(spec.x, .02, spec.y); g.b.setRot(spec.rot);
        this._setOk(g, spec.ok);
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
      case 'sell': case 'lab': case 'power': case 'solar': case 'mast': case 'heater': case 'wonder': return [];
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
  stats() { const i = this.stage.renderer.info.render; return { calls: i.calls, tris: i.triangles, items: this.items.count, buildings: this.B.size, drones: this.drones.count, lod: this.lod.stats }; }
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
    try { const b = makeBuilding(t, { rot: 1, level: 1, ore: 'eisenerz', filter: 'zahnrad' }); if (t === 'wunder') b.setStage?.(3, .5); b.update(1.3, { busy: true, progress: .6, level: 1, takt: .6, fill: .6, power: 1, sun: 1, load: .6, docked: 1 });
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
