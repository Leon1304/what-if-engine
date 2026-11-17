// Cogtopia – komplette Spiellogik ohne DOM/Three. Fester Schritt 1/20 s, rein deterministisch:
// aller Zufall kommt aus S.rs (mulberry32), keine Uhrzeit. Läuft in Node (tools/rules.mjs) und im Browser.
// Sprachneutral: Ereignisse tragen nur Ids und Zahlen, die Texte macht i18n.js.
import {
  ITEMS, ITEM_IDS, BUILDINGS, RECIPES, RECIPE_IDS, HIDDEN_RECIPES, RESEARCH, RESEARCH_IDS, PATENTS, PATENT_IDS,
  BIOMES, ACHIEVEMENTS, ACHIEVEMENT_IDS, CRATES, CRATE_IDS, COLORS, COLOR_IDS, TITLES, TUTORIAL, CONTRACT, GOLD_MUL,
  GERALD_LINES, STEVE_LINES, POWER, MK, DRONE, WORLD, WONDER, RAW,
} from './data.js';
import { mix, STEP, hashStr, hash2, fbm } from './rng.js';

export const SAVE_VERSION = 2;
export const TPS = 20, DT = 1 / TPS;
export const PLOT = 16, PLOTS = 7, MAP = PLOT * PLOTS, START_PLOT = 3;
export const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];          // rot 0 = +x, 1 = +z (Sim-y), 2 = −x, 3 = −z
export const START_MONEY = 200;
export const SP = 0.25;                 // Mindestabstand der Teile auf einem Band (→ max. 4 je Feld)
export const BELT_BASE = 1.0;           // Felder pro Sekunde
export const TAKT_GAP = 2.5, TAKT_TIME = 60;   // Lücke etwas großzügiger als 2 s, damit ein Bohrer (alle 2 s) den Takt hält
export const XP_LV = [0, 30, 120, 400, 1200];   // Erfahrung für ★2 … ★5
export const PRESTIGE_AT = 1e6;
export const OFFLINE_CAP = 8 * 3600;
export const UNDO_MAX = 20;
export const AUTO_STALL = 5 * TPS;     // Ticks, die ein unpassendes Teil vor einer Automatik-Maschine wartet, bevor sie umstellt
const EVENT_MAX = 2000;
const GERALD_SPEED = 1.6, GERALD_SIT = 20;
const IDX = Object.fromEntries(ITEM_IDS.map((id, i) => [id, i]));
const BELTLIKE = { belt: 1, tunnel: 1, split: 1, sort: 1 };
const OUTKIND = { drill: 1, machine: 1, exp: 1, store: 1, drone: 1 };        // Gebäude mit Ausgang vorn (outCell)
const PRODKIND = { drill: 1, machine: 1, exp: 1, lab: 1 };                     // Maschinen im Sinne der Strom-Regeln (Mond)
const POWERNODE = { power: 1, solar: 1, mast: 1 };                             // bilden das Stromnetz
const MKSET = new Set(MK.types);
// Verschmelzen: Großbohrer & Co. (BUILDINGS[id].from = Ausgangstyp, parts = Anzahl)
const MERGES = Object.keys(BUILDINGS).filter(id => BUILDINGS[id].from).map(id => ({ id, from: BUILDINGS[id].from, parts: BUILDINGS[id].parts || 4 }));
const MERGE_FROM = Object.fromEntries(MERGES.map(m => [m.from, m.id]));
const HIST_MAX = 3000, UTIL_SECS = 30;
const chebFP = (a, b) => Math.max(0, a.e.x - (b.e.x + b.w - 1), b.e.x - (a.e.x + a.w - 1), a.e.y - (b.e.y + b.h - 1), b.e.y - (a.e.y + a.h - 1));
const LEFT = r => (r + 3) & 3, RIGHT = r => (r + 1) & 3, BACK = r => (r + 2) & 3;

// Rezepte als schnelle Laufzeittabelle
const RT = {};
for (const id of RECIPE_IDS) {
  const r = RECIPES[id];
  RT[id] = { id, b: r.building, ins: r.in.map(([it]) => IDX[it]), need: r.in.map(([, n]) => n), cap: r.in.map(([, n]) => Math.max(4, n * 3)),
    out: IDX[r.out], n: r.n, time: r.time, ocap: Math.max(4, r.n * 2), hidden: r.unlock === 'hidden' };
}
// Experimentiertisch: ungeordnetes Paar → passende Montage-Rezepte mit genau zwei Zutaten
const PAIRS = new Map();
for (const id of RECIPE_IDS) {
  const r = RT[id]; if (r.b !== 'montage' || r.ins.length !== 2) continue;
  const k = pairKey(r.ins[0], r.ins[1]); if (!PAIRS.has(k)) PAIRS.set(k, []); PAIRS.get(k).push(id);
}
function pairKey(a, b) { return a < b ? a * 64 + b : b * 64 + a; }
// Teile in Puffern: Code = Index*2 + gold; im Spielstand als 'id' bzw. 'id*' (golden)
const codeStr = c => ITEM_IDS[c >> 1] + (c & 1 ? '*' : '');
function strCode(s) {
  if (typeof s !== 'string') return -1;
  const g = s.endsWith('*'), id = g ? s.slice(0, -1) : s;
  return has(IDX, id) ? IDX[id] * 2 + (g ? 1 : 0) : -1;
}
export function outCell(x, y, w, h, rot) {
  if (rot === 0) return [x + w, y + (h >> 1)];
  if (rot === 2) return [x - 1, y + (h >> 1)];
  if (rot === 1) return [x + (w >> 1), y + h];
  return [x + (w >> 1), y - 1];
}
const clone = o => JSON.parse(JSON.stringify(o));
// Prüfhilfen fürs Laden (fremde/kaputte Stände): eigene Schlüssel, endliche Zahlen, echte Arrays/Objekte
const has = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v, d, lo = -Infinity, hi = Infinity) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const nint = (v, d) => (Number.isFinite(v) && v >= 0 ? Math.min(Math.floor(v), Number.MAX_SAFE_INTEGER) : d);
const arr = v => (Array.isArray(v) ? v : []);
const uniq = a => [...new Set(a)];
const itemMap = v => { const o = {}; if (isObj(v)) for (const k in v) if (has(IDX, k) && Number.isFinite(v[k]) && v[k] >= 0) o[k] = v[k]; return o; };

export class Factory {
  constructor(opt = {}) {
    this.ev = []; this.undoStack = [];
    // Erweiterungspunkte für Zusatzsysteme (js/meta.js): Rückrufe und Laufzeit-Faktoren, nie gespeichert
    this.hooks = { tick: [], event: [], prestige: [] };
    this.X = { belt: 1, mach: 1, drill: 1, gold: 0, sell: {} };
    // Einstellungen der Oberfläche (nicht gespeichert): Bänder verbinden sich beim Setzen
    this.opts = { autoJoin: true };
    if (opt === null) return;                        // leere Hülle für load()
    this.S = this._freshState(opt.seed ?? 1, has(BIOMES, opt.biome) ? opt.biome : 'wiese', null);
    this._rebuild();
    this._startFactory();
  }

  // =====================================================================================
  // Zustand anlegen / Prestige-Neustart
  // =====================================================================================
  _freshState(seed, biome, keep) {
    seed = (seed >>> 0) || 1;
    const S = {
      v: SAVE_VERSION, seed, biome, rs: (seed * 2654435761) >>> 0, tick: 0,
      money: 0, rp: 0, research: [], patents: [], points: 0, vouchers: 0,
      plots: [START_PLOT * PLOTS + START_PLOT], ents: [], eid: 0, nid: 0,
      contracts: [], daily: null, crates: [], boosts: { turbo: 0, goldrain: 0 },
      ger: { wait: 150, on: 0, ph: '', t: 0, dur: 0, x0: 0, z0: 0, x1: 0, z1: 0, ex: 0, ez: 0, belt: 0, x: 0, z: 0, line: '' },
      book: { found: [], tips: [], fails: [] }, ach: [], deco: { colors: ['standard'], color: 'standard', titles: [], title: '' },
      bonusStart: 0, tut: 0, meta: {},
      // Ausbau 2
      powerGrace: 0, wonder: { stage: 1, have: {}, day: '' }, hist: [], xdep: [], storm: { next: 600, left: 0 }, chal: null,
      stats: { earned: 0, sold: 0, mined: 0, gold: 0, crafted: 0, lost: 0, made: {}, soldBy: {}, rate: {}, mrate: {}, cs: {}, cm: {},
        ring: new Array(180).fill(0), ri: 0, nb: 0, acc: 0, rpGain: 0, burned: 0, wonderIn: 0 },
      total: { earned: 0, sold: 0, gold: 0, scrap: 0, contracts: 0, daily: 0, gerald: 0, prestiges: 0, crates: 0, made: {}, taktMax: 0, playtime: 0, goldMade: {}, perfect: {} },
    };
    if (keep) Object.assign(S, keep);
    return S;
  }
  _startFactory() {
    const S = this.S;
    // Grundwissen-Patent: billige Forschung ist sofort bekannt
    if (this.M.freeRes > 0) {
      let more = true;
      while (more) { more = false; for (const id of RESEARCH_IDS) { const r = RESEARCH[id]; if (!S.research.includes(id) && r.cost <= this.M.freeRes && !r.rp && r.req.every(q => S.research.includes(q))) { S.research.push(id); more = true; } } }
      this._mods();
    }
    S.money = START_MONEY + this.M.start + S.bonusStart;
    const c = START_PLOT * PLOT + 7;                  // Verkaufsstation mitten auf dem Startgrundstück
    const e = this._doPlace('verkauf', c, c, 0, 0); e.paid = 0;
    // Mond: ohne Strom läuft keine Maschine → Strom gilt als erforscht, ein Solarfeld steht schon
    if (BIOMES[S.biome].allPower) {
      if (!S.research.includes('strom')) { S.research.push('strom'); this._mods(); }
      const so = this._doPlace('solar', c, c + 3, 0, 0); so.paid = 0;
    }
    if (S.biome === 'wueste') S.storm.next = this._stormGap();
    this._topo();
    while (S.contracts.length < CONTRACT.slots) S.contracts.push(this._newContract());
  }

  // =====================================================================================
  // Zufall
  // =====================================================================================
  rand() { this.S.rs = (this.S.rs + STEP) >>> 0; return mix(this.S.rs); }
  _ri(a, b) { return a + Math.floor(this.rand() * (b - a + 1)); }

  // =====================================================================================
  // Laufzeit aus dem Zustand aufbauen (Karte, Gitter, Knoten, Boni)
  // =====================================================================================
  _rebuild() {
    this._genMap();
    this.grid = new Int32Array(MAP * MAP);
    this.N = new Map(); this.bn = []; this.mn = []; this.count = {};
    this.plotOpen = new Uint8Array(PLOTS * PLOTS);
    for (const p of this.S.plots) this.plotOpen[p] = 1;
    this._mods();
    for (const e of this.S.ents) this._addNode(e);
    this._topo();
  }
  _genMap() {
    const S = this.S, B = BIOMES[S.biome];
    this.dep = new Uint8Array(MAP * MAP); this.rich = new Uint8Array(MAP * MAP); this.ruin = new Uint8Array(PLOTS * PLOTS);
    const res = Object.entries(B.deposits).map(([id, p], i) => ({ t: IDX[id], seed: (S.seed * 31 + i * 7919 + 17) >>> 0, ...p }));
    for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
      const cx = (x / PLOT) | 0, cy = (y / PLOT) | 0, ring = Math.max(Math.abs(cx - START_PLOT), Math.abs(cy - START_PLOT));
      let best = -1, bv = 0;
      for (const r of res) { if (ring < (r.ring || 0)) continue; const d = fbm(r.seed, x, y, r.scale) - r.thr; if (d > bv) { bv = d; best = r.t; } }
      if (best >= 0) { this.dep[y * MAP + x] = best + 1; this.rich[y * MAP + x] = bv > 0.1 ? 1 : 0; }
    }
    // Startgrundstück: aufgeräumt, garantiert Stein und Eisen in Reichweite der Verkaufsstation
    const o = START_PLOT * PLOT;
    for (let y = o; y < o + PLOT; y++) for (let x = o; x < o + PLOT; x++) { this.dep[y * MAP + x] = 0; this.rich[y * MAP + x] = 0; }
    const fourth = { wiese: 'kohle', wueste: 'sand', eis: 'kristall', mond: 'titanerz' }[S.biome] || 'kohle';
    const stamp = (id, x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const i = y * MAP + x; this.dep[i] = IDX[id] + 1; this.rich[i] = (x > x0 && x < x0 + w - 1 && y > y0 && y < y0 + h - 1) ? 1 : 0; } };
    stamp('stein', o + 1, o + 1, 4, 4); stamp('eisenerz', o + 10, o + 1, 4, 4); stamp('kupfererz', o + 1, o + 10, 4, 4); stamp(fourth, o + 11, o + 11, 3, 3);
    for (let cy = 0; cy < PLOTS; cy++) for (let cx = 0; cx < PLOTS; cx++) if (cx !== START_PLOT || cy !== START_PLOT) this.ruin[cy * PLOTS + cx] = hash2(S.seed ^ 0xa11ce, cx, cy) < 0.3 ? 1 : 0;
    // vorübergehende Vorkommen (addDeposit) liegen über der Karte; das Original merkt sich die Laufzeit
    this.dep0 = new Map();
    for (const d of S.xdep || []) this._applyXdep(d);
  }
  _applyXdep(d) {
    const k = d.y * MAP + d.x;
    if (!this.dep0.has(k)) this.dep0.set(k, [this.dep[k], this.rich[k]]);
    this.dep[k] = IDX[d.item] + 1; this.rich[k] = d.rich ? 1 : 0;
  }
  _sum(key) {
    let s = 0;
    for (const r of this.S.research) { const v = RESEARCH[r]?.fx[key]; if (typeof v === 'number') s += v; }
    for (const p of this.S.patents) { const v = PATENTS[p]?.fx[key]; if (typeof v === 'number') s += v; }
    const ws = this.S.wonder ? this.S.wonder.stage - 1 : 0;           // abgeschlossene Wunder-Stufen wirken dauerhaft
    for (let i = 0; i < ws && i < WONDER.length; i++) { const v = WONDER[i].fx[key]; if (typeof v === 'number') s += v; }
    return s;
  }
  _mods() {
    const S = this.S, B = BIOMES[S.biome], turbo = S.boosts.turbo > 0 ? 2 : 1, M = this.M = {};
    const X = this.X || { belt: 1, mach: 1, drill: 1, gold: 0, sell: {} };
    M.turbo = turbo;
    M.belt = BELT_BASE * (1 + this._sum('belt')) * B.beltMul * turbo * X.belt; M.step = M.belt * DT;
    M.drill = (1 + this._sum('drill')) * B.drillMul * turbo * X.drill;
    M.mach = (1 + this._sum('mach')) * turbo * X.mach;
    M.gold = 0.005 + this._sum('gold') + X.gold;
    M.sell = 1 + this._sum('sell');
    M.taktMax = 2 + this._sum('taktMax');
    M.xp = 1 + this._sum('xp'); M.rp = 1 + this._sum('rp');
    M.offline = 0.5 + this._sum('offline'); M.offlineCap = OFFLINE_CAP + this._sum('offlineCap');
    M.resCost = Math.max(0.1, 1 + this._sum('resCost')); M.plot = Math.max(0.1, 1 + this._sum('plot'));
    M.luck = this._sum('luck'); M.gerald = 1 + this._sum('gerald'); M.startLvl = this._sum('startLvl');
    M.start = this._sum('start'); M.freeRes = this._sum('freeRes');
    this.val = ITEM_IDS.map(id => ITEMS[id].value * (B.valueMul[id] || 1) * M.sell * (X.sell[id] || 1));
  }

  // =====================================================================================
  // Knoten (Laufzeit-Begleiter jedes Gebäudes) und Verbindungen
  // =====================================================================================
  _addNode(e) {
    const d = BUILDINGS[e.type];
    const n = { e, id: e.id, d, kind: d.kind, w: d.w, h: d.h, len: 1, tgt: null, outN: [null, null, null, null], feed: 0, curve: false, inDir: -1, ox: 0, oy: 0, res: -1, cov: 0,
      // Ausbau 2 (Laufzeit): Verbrauch, Netz, Versorgung 0–1, Tempo-Faktor (Mk × Strom), Band-Faktor (Frost × Sturm), Auslastung
      use: 0, net: -1, pw: 1, mkS: 1, sp: 1, sl: 1, frozen: false, out: 0, ub: null, uc: 0, ui: 0, un: 0 };
    if (!BELTLIKE[d.kind]) { n.ub = new Uint8Array(UTIL_SECS); }
    this.N.set(e.id, n);
    (BELTLIKE[n.kind] ? this.bn : this.mn).push(n);
    for (let y = e.y; y < e.y + d.h; y++) for (let x = e.x; x < e.x + d.w; x++) this.grid[y * MAP + x] = e.id;
    this.count[e.type] = (this.count[e.type] || 0) + 1;
    if (n.kind === 'drill') { const di = this._drillInfo(e.x, e.y, d.w); if (di) { n.res = di.t; n.cov = di.cov; } }
    this._pdirty = true;
    return n;
  }
  // Mk-Stufe, Stromverbrauch eines Gebäudes (nach Typ, Mk und Welt)
  _mkOf(e) { return MKSET.has(e.type) ? Math.max(1, Math.min(3, e.mk | 0 || 1)) : 1; }
  _useOf(e, kind) {
    const mk = this._mkOf(e);
    let u = POWER.use[e.type] || 0;
    if (!u && PRODKIND[kind] && BIOMES[this.S.biome].allPower) u = POWER.moon;
    if (PRODKIND[kind] || kind === 'drone') u += POWER.mk[mk];
    return u * (BUILDINGS[e.type].parts || 1);
  }
  _delNode(n) {
    const e = n.e; this.N.delete(e.id);
    const arr = BELTLIKE[n.kind] ? this.bn : this.mn; arr.splice(arr.indexOf(n), 1);
    for (let y = e.y; y < e.y + n.h; y++) for (let x = e.x; x < e.x + n.w; x++) this.grid[y * MAP + x] = 0;
    this.count[e.type]--;
    this._pdirty = true;
  }
  nodeAt(x, y) { if (x < 0 || y < 0 || x >= MAP || y >= MAP) return null; const id = this.grid[y * MAP + x]; return id ? this.N.get(id) : null; }
  at(x, y) { const n = this.nodeAt(x, y); return n ? n.id : 0; }
  _topo() {
    const all = [...this.bn, ...this.mn];
    for (const n of all) { n.tgt = null; n.outN.fill(null); n.feed = 0; n.curve = false; n.inDir = -1; n.len = 1; }
    const reg = (t, dir) => { if (t && t.kind === 'belt') t.feed |= 1 << dir; };
    for (const n of all) {
      const e = n.e, r = e.rot;
      switch (n.kind) {
        case 'belt': n.tgt = this.nodeAt(e.x + DX[r], e.y + DY[r]); reg(n.tgt, r); break;
        case 'tunnel':
          if (e.exit) { n.tgt = this.nodeAt(e.x + DX[r], e.y + DY[r]); reg(n.tgt, r); }
          else if (e.link) { const l = this.N.get(e.link); if (l) { n.tgt = l; n.len = Math.abs(l.e.x - e.x) + Math.abs(l.e.y - e.y); } }
          break;
        case 'split': case 'sort':
          for (const d of [LEFT(r), r, RIGHT(r)]) { const t = this.nodeAt(e.x + DX[d], e.y + DY[d]); n.outN[d] = t; reg(t, d); }
          break;
        case 'sell': case 'lab': case 'power': case 'solar': case 'mast': case 'heater': case 'wonder': break;
        default: {
          const [ox, oy] = outCell(e.x, e.y, n.w, n.h, r); n.ox = ox; n.oy = oy;
          n.tgt = this.nodeAt(ox, oy); reg(n.tgt, r);
        }
      }
    }
    for (const n of this.bn) {
      if (n.kind === 'tunnel') { this._fitTunnel(n); continue; }
      if (n.kind !== 'belt') continue;
      const r = n.e.rot, side = n.feed & ~(1 << r) & ~(1 << BACK(r));
      if (!(n.feed & (1 << r)) && side && !(side & (side - 1))) { n.curve = true; n.inDir = 31 - Math.clz32(side); }
    }
    this._blockId = this.S.ger.on && this.S.ger.ph === 'sit' ? this.S.ger.belt : 0;
    this._pdirty = true;
    this.rev = (this.rev || 0) + 1;
  }

  // =====================================================================================
  // Strom: Netze (Erzeuger + Masten in Reichweite), Verbraucher, Versorgung; Frost und Sturm (Band-Faktoren)
  // Aufbau nur bei Änderung (lazy über _pdirty), pro Tick nur Angebot/Nachfrage je Netz.
  // =====================================================================================
  _powerTopo() {
    this._pdirty = false;
    const nodes = [], users = [], heaters = [];
    for (const n of this.mn) {
      const e = n.e;
      n.mkS = MK.speed[this._mkOf(e)]; n.use = this._useOf(e, n.kind); n.net = -1;
      if (POWERNODE[n.kind]) nodes.push(n);
      if (n.use > 0) users.push(n);
      if (n.kind === 'heater') heaters.push(n);
    }
    // räumliches Raster (16er Blöcke), damit große Fabriken schnell bleiben
    const CH = 16, CW = Math.ceil(MAP / CH), cells = new Map();
    for (const n of nodes) { const k = ((n.e.y / CH) | 0) * CW + ((n.e.x / CH) | 0); if (!cells.has(k)) cells.set(k, []); cells.get(k).push(n); }
    const near = (n, cb) => {
      const cx = (n.e.x / CH) | 0, cy = (n.e.y / CH) | 0;
      for (let j = cy - 1; j <= cy + 1; j++) for (let i = cx - 1; i <= cx + 1; i++) { if (i < 0 || j < 0 || i >= CW || j >= CW) continue; const l = cells.get(j * CW + i); if (l) for (const m of l) cb(m); }
    };
    // Union-Find über Erzeuger/Masten (verbunden, wenn einer den anderen erreicht)
    const par = new Map(nodes.map(n => [n, n]));
    const find = n => { while (par.get(n) !== n) { par.set(n, par.get(par.get(n))); n = par.get(n); } return n; };
    for (const a of nodes) near(a, b => {
      if (b.id <= a.id || chebFP(a, b) > Math.max(a.d.range, b.d.range)) return;
      const ra = find(a), rb = find(b); if (ra !== rb) { if (ra.id < rb.id) par.set(rb, ra); else par.set(ra, rb); }
    });
    const nets = [], idx = new Map();
    for (const n of nodes) { const r = find(n); if (!idx.has(r)) { idx.set(r, nets.length); nets.push({ prod: [], masts: [], users: [], demand: 0, supply: 0, s: -1, root: r.id }); } const k = idx.get(r); n.net = k; (n.kind === 'mast' ? nets[k].masts : nets[k].prod).push(n); }
    // Verbraucher: Netz des nächstgelegenen (dann kleinste Id) Knotens in Reichweite
    this.offgrid = [];
    for (const u of users) {
      let best = null, bd = 1e9;
      near(u, m => { const d = chebFP(u, m); if (d <= m.d.range && (d < bd || (d === bd && m.id < best.id))) { bd = d; best = m; } });
      if (best) { u.net = best.net; nets[best.net].users.push(u); nets[best.net].demand += u.use; } else this.offgrid.push(u);
    }
    this.nets = nets; this.heaters = heaters;
    // Verbraucher ohne Netz: nur in der Schonfrist versorgt
    const g = this.S.powerGrace > 0 ? 1 : 0;
    for (const u of this.offgrid) { u.pw = g; u.sp = u.mkS * g; }
    for (const n of this.mn) if (!n.use) { n.pw = 1; n.sp = n.mkS; }
    this._grace = g; this._heat = '';
    this._powerTick(false);
  }
  _solarOut() { return BUILDINGS.solar.power * (BIOMES[this.S.biome].solarMul || 1) * (this.S.storm.left > 0 ? 0 : 1); }
  // pro Tick: Angebot je Netz, Versorgung s = min(1, Angebot/Bedarf); Kraftwerke verbrennen anteilig zur Last
  _powerTick(burn = true) {
    const S = this.S, g = S.powerGrace > 0 ? 1 : 0, sol = this._solarOut(), K = BUILDINGS.kraftwerk;
    if (g !== this._grace) { this._grace = g; for (const u of this.offgrid) { u.pw = g; u.sp = u.mkS * g; } for (const net of this.nets) net.s = -1; }
    let heat = '';
    for (const net of this.nets) {
      let sup = 0;
      for (const p of net.prod) {
        if (p.kind === 'solar') p.out = sol;
        else p.out = p.e.burn > 0 || p.e.q.length ? K.power : 0;
        sup += p.out;
      }
      net.supply = sup;
      const s = net.demand > 0 ? Math.min(1, sup / net.demand) : 1;
      if (burn && net.demand > 0 && sup > 0) {
        const L = Math.min(1, net.demand / sup);
        for (const p of net.prod) {
          if (p.kind !== 'power' || !p.out) continue;
          const e = p.e;
          if (e.burn <= 0 && e.q.length) { e.q.shift(); S.stats.burned++; e.burn += K.burn; }
          e.burn -= DT * L; if (e.burn < 0 && !e.q.length) e.burn = 0;
          p.uc++;
        }
      }
      if (s !== net.s) { net.s = s; const eff = g ? 1 : s; for (const u of net.users) { u.pw = eff; u.sp = u.mkS * eff; } }
    }
    // Frost (Eis): Heizer mit Strom halten Bänder in Reichweite warm; nur bei Änderung neu berechnen
    if (BIOMES[S.biome].frost) { for (const h of this.heaters) heat += h.pw > 0 ? '1' : '0'; heat += g; }
    heat += S.storm.left > 0 ? 's' : '';
    if (heat !== this._heat) { this._heat = heat; this._beltSlow(); }
  }
  _beltSlow() {
    const B = BIOMES[this.S.biome], storm = this.S.storm.left > 0 ? WORLD.storm.belt : 1;
    let cov = null;
    if (B.frost && !(this.S.powerGrace > 0)) {
      cov = new Uint8Array(MAP * MAP); const R = WORLD.frostRange;
      for (const h of this.heaters) if (h.pw > 0) for (let y = Math.max(0, h.e.y - R); y <= Math.min(MAP - 1, h.e.y + R); y++) for (let x = Math.max(0, h.e.x - R); x <= Math.min(MAP - 1, h.e.x + R); x++) cov[y * MAP + x] = 1;
    }
    for (const n of this.bn) { n.frozen = !!cov && !cov[n.e.y * MAP + n.e.x]; n.sl = (n.frozen ? B.frost : 1) * storm; }
  }
  _ensurePower() { if (this._pdirty) this._powerTopo(); }
  // Für das Strom-Overlay: Netze mit Angebot, Bedarf, Versorgung und Knoten
  powerInfo() {
    this._ensurePower();
    return this.nets.map(n => ({ supply: n.supply, demand: n.demand, s: n.demand > 0 ? Math.min(1, n.supply / n.demand) : 1,
      nodes: [...n.prod, ...n.masts].map(m => m.id).sort((a, b) => a - b), users: n.users.map(u => u.id), grace: this.S.powerGrace > 0 }));
  }
  // Vorkommen unter einem Bohrer (s × s Felder); cov relativ zu einem 2×2-Bohrer (Großbohrer voll belegt = 4)
  _drillInfo(x, y, s = 2) {
    const cnt = {};
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) {
      const xx = x + i, yy = y + j; if (xx < 0 || yy < 0 || xx >= MAP || yy >= MAP) continue;
      const k = yy * MAP + xx, d = this.dep[k]; if (!d) continue;
      cnt[d - 1] = (cnt[d - 1] || 0) + (this.rich[k] ? 1.5 : 1);
    }
    let best = -1, bv = 0; for (const t in cnt) if (cnt[t] > bv || (cnt[t] === bv && +t < best)) { bv = cnt[t]; best = +t; }
    return best < 0 ? null : { t: best, cov: bv / 4 };
  }

  // =====================================================================================
  // Abfragen für Oberfläche und Grafik
  // =====================================================================================
  get contracts() { return this.S.contracts; }
  get daily() { return this.S.daily; }
  get time() { return this.S.tick * DT; }
  plotIndex(x, y) { return ((y / PLOT) | 0) * PLOTS + ((x / PLOT) | 0); }
  isOpen(x, y) { return x >= 0 && y >= 0 && x < MAP && y < MAP && this.plotOpen[this.plotIndex(x, y)] === 1; }
  deposit(x, y) {
    if (!this.isOpen(x, y)) return null;
    const k = y * MAP + x, d = this.dep[k]; return d ? { item: ITEM_IDS[d - 1], rich: !!this.rich[k] } : null;
  }
  plotState(cx, cy) {
    if (cx < 0 || cy < 0 || cx >= PLOTS || cy >= PLOTS) return 'locked';
    if (this.plotOpen[cy * PLOTS + cx]) return 'open';
    for (let d = 0; d < 4; d++) { const a = cx + DX[d], b = cy + DY[d]; if (a >= 0 && b >= 0 && a < PLOTS && b < PLOTS && this.plotOpen[b * PLOTS + a]) return 'buyable'; }
    return 'locked';
  }
  isUnlocked(type) {
    const d = BUILDINGS[type]; if (!d) return false;
    if (d.prestige && this.S.total.prestiges < d.prestige) return false;
    return d.unlock === 'start' || this.S.research.includes(d.unlock);
  }
  recipeAvailable(rid) {
    const r = RECIPES[rid]; if (!r) return false;
    if (r.unlock === 'hidden') return this.S.book.found.includes(rid);
    return r.unlock === 'start' || this.S.research.includes(r.unlock);
  }
  recipesFor(type) { return RECIPE_IDS.filter(r => RECIPES[r].building === type && this.recipeAvailable(r)); }
  costOf(type) { const d = BUILDINGS[type]; return d ? Math.round(d.cost * Math.pow(d.scale, this._cnt(type))) : Infinity; }
  // Anzahl für Preise: ein Großbohrer zählt wie seine 4 Bohrer (Verschmelzen macht Bohrer nicht billiger)
  _cnt(type) { let c = this.count[type] || 0; for (const m of MERGES) if (m.from === type) c += (this.count[m.id] || 0) * m.parts; return c; }
  _dcap(n) { return n.w * n.h * this._buf(n.e); }               // Ausgabepuffer eines Bohrers: 4 (2×2) bzw. 16 (Großbohrer) × Mk-Puffer
  takt(e) { return 1 + (this.M.taktMax - 1) * Math.min(1, e.streak / TAKT_TIME); }
  starMul(e) { return 1 + 0.1 * (e.lvl - 1); }

  entities() { this._ensurePower(); return this.S.ents.map(e => this._snap(this.N.get(e.id))); }
  entity(id) { this._ensurePower(); const n = this.N.get(id); return n ? this._snap(n) : null; }
  _snap(n) {
    const e = n.e, M = this.M;
    const o = { id: e.id, type: e.type, kind: n.kind, x: e.x, y: e.y, rot: e.rot, w: n.w, h: n.h, level: e.lvl, xp: e.xp,
      nextXp: e.lvl < 5 ? XP_LV[e.lvl] : null, busy: false, progress: 0, state: 'idle' };
    switch (n.kind) {
      case 'belt': case 'split': case 'sort': o.count = e.items.length; o.curve = n.curve; o.inDir = n.inDir; o.blocked = e.id === this._blockId;
        if (n.kind === 'sort') o.filter = e.filter; break;
      case 'tunnel': o.count = e.items.length; o.link = e.link; o.exit = e.exit; break;
      case 'drill': { const cap = this._dcap(n); o.item = n.res >= 0 ? ITEM_IDS[n.res] : null; o.rate = n.res >= 0 ? (n.cov * (n.d.bonus || 1) * M.drill * this.starMul(e)) / BUILDINGS.bohrer.time : 0;
        o.progress = e.prog; o.busy = n.res >= 0 && e.out.length < cap; o.state = n.res < 0 ? 'nodeposit' : e.out.length >= cap ? 'full' : 'work'; o.out = e.out.length; o.cap = cap;
        if (n.d.parts) o.parts = n.d.parts; break; }
      case 'machine': {
        const r = e.recipe ? RT[e.recipe] : null;
        o.recipe = e.recipe; o.auto = e.auto; o.busy = !!e.craft; o.progress = e.craft ? e.prog : 0; o.out = e.out.length;
        o.inputs = r ? r.ins.map((t, i) => ({ item: ITEM_IDS[t], n: e.inN[i] || 0, need: r.need[i] })) : [];
        o.state = !r ? 'norecipe' : e.craft ? 'work' : e.out.length + r.n > r.ocap ? 'full' : 'wait';
        o.recipes = this.recipesFor(e.type); break;
      }
      case 'exp': o.a = e.a >= 0 ? ITEM_IDS[e.a >> 1] : null; o.b = e.b >= 0 ? ITEM_IDS[e.b >> 1] : null; o.busy = !!e.craft; o.progress = e.craft ? e.prog : 0;
        o.state = e.craft ? 'work' : e.out.length >= 4 ? 'full' : 'wait'; o.out = e.out.length; break;
      case 'lab': o.count = e.q.length; o.busy = e.q.length > 0; o.progress = e.prog; o.state = e.q.length ? 'work' : 'wait'; break;
      case 'sell': o.takt = this.takt(e); o.streak = e.streak; o.sold = e.sold; o.state = e.age <= TAKT_GAP ? 'work' : 'idle'; o.busy = o.state === 'work'; break;
      case 'store': o.count = e.q.length; o.cap = BUILDINGS.lager.cap * this._buf(e); break;
      case 'power': o.fuel = e.q.length; o.burning = e.burn > 0; o.out = n.out; o.busy = n.out > 0; o.state = n.out > 0 ? 'work' : 'nofuel'; o.range = n.d.range; break;
      case 'solar': o.out = n.out; o.busy = n.out > 0; o.state = n.out > 0 ? 'work' : 'idle'; o.range = n.d.range; break;
      case 'mast': o.range = n.d.range; o.state = n.net >= 0 && this.nets[n.net].supply > 0 ? 'work' : 'idle'; break;
      case 'heater': o.range = n.d.range; o.busy = n.pw > 0; o.state = n.pw > 0 ? 'work' : 'nopower'; break;
      case 'drone': o.link = e.link; o.count = e.q.length; o.out = e.out.length; o.drones = e.dr.length; o.busy = e.dr.some(d => d.s !== 0);
        o.state = !e.link ? (this.mn.some(m => m.kind === 'drone' && m.e.link === e.id) ? 'wait' : 'nolink') : o.busy ? 'work' : 'wait'; break;
      case 'wonder': { const w = this.wonder(); o.stage = w.stage; o.need = w.need; o.have = w.have; o.state = w.done ? 'done' : 'wait'; break; }
    }
    if (OUTKIND[n.kind]) { o.outX = n.ox; o.outY = n.oy; }
    // Ausbau 2: Mk-Stufe, Strom, Band-Faktoren
    if (MKSET.has(e.type)) o.mk = this._mkOf(e);
    o.use = n.use; o.power = n.use > 0 ? n.pw : 1; o.net = n.net;
    if (n.use > 0 && n.pw <= 0) { o.state = 'nopower'; o.busy = false; }
    if (BELTLIKE[n.kind]) { o.frozen = n.frozen; o.slow = n.sl; }
    return o;
  }

  // Teile auf Bändern in Weltkoordinaten (1 Feld = 1 Einheit, Feldmitte x+0.5, Sim-y = Welt-z), zwischen zwei Ticks interpoliert
  forEachItem(alpha, cb) {
    const tk = this.S.tick;
    for (const n of this.bn) {
      const it = n.e.items;
      for (let i = 0; i < it.length; i++) {
        const q = it[i];
        if (!this._pos(n, q.p, q.d)) continue;
        const x1 = this._x, z1 = this._z; let x0 = x1, z0 = z1;
        if (q.mt === tk && alpha < 1) {
          const on = q.oe === n.id ? n : this.N.get(q.oe);
          if (on && this._pos(on, q.op, q.od)) { x0 = this._x; z0 = this._z; }
        }
        cb(x0 + (x1 - x0) * alpha, z0 + (z1 - z0) * alpha, ITEM_IDS[q.t], !!q.g, q.k);
      }
    }
  }
  itemCount() { let c = 0; for (const n of this.bn) c += n.e.items.length; return c; }
  _pos(n, p, d) {
    const e = n.e, cx = e.x + 0.5, cz = e.y + 0.5, r = e.rot;
    switch (n.kind) {
      case 'belt':
        if (n.curve) {
          const a = p * Math.PI / 2, ix = DX[n.inDir], iz = DY[n.inDir];
          const Cx = cx - ix * 0.5 + DX[r] * 0.5, Cz = cz - iz * 0.5 + DY[r] * 0.5, c = Math.cos(a), s = Math.sin(a);
          this._x = Cx - DX[r] * 0.5 * c + ix * 0.5 * s; this._z = Cz - DY[r] * 0.5 * c + iz * 0.5 * s; return true;
        }
        this._x = cx + DX[r] * (p - 0.5); this._z = cz + DY[r] * (p - 0.5); return true;
      case 'tunnel':
        if (e.exit ? p < 0.5 : p > 0.5) return false;
        this._x = cx + DX[r] * (p - 0.5); this._z = cz + DY[r] * (p - 0.5); return true;
      default: {
        const dd = p < 0.5 || d < 0 ? r : d;
        this._x = cx + DX[dd] * (p - 0.5); this._z = cz + DY[dd] * (p - 0.5); return true;
      }
    }
  }

  events() { const e = this.ev; this.ev = []; return e; }
  _emit(type, data) {
    const o = { type, ...data }; this.ev.push(o); if (this.ev.length > EVENT_MAX) this.ev.splice(0, this.ev.length - EVENT_MAX);
    if (this.hooks && this.hooks.event.length && !this._inHook) { this._inHook = true; try { for (const h of this.hooks.event) h(o, this); } finally { this._inHook = false; } }
    return o;
  }
  // Zusatzsysteme: Faktoren in this.X geändert → neu berechnen
  refreshMods() { this._mods(); }

  // =====================================================================================
  // Bauen
  // =====================================================================================
  canPlace(type, x, y, rot = 0) {
    const d = BUILDINGS[type]; if (!d) return { ok: false, reason: 'unknown', cost: 0 };
    const cost = this.costOf(type);
    if (d.prestige && this.S.total.prestiges < d.prestige) return { ok: false, reason: 'prestige', cost, need: d.prestige };
    if (!this.isUnlocked(type)) return { ok: false, reason: 'research', cost, need: d.unlock };
    if (d.unique && (this.count[type] || 0) > 0) return { ok: false, reason: 'unique', cost };
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x + d.w > MAP || y + d.h > MAP) return { ok: false, reason: 'bounds', cost };
    for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) {
      if (!this.isOpen(x + i, y + j)) return { ok: false, reason: 'plot', cost };
      const id = this.grid[(y + j) * MAP + x + i];
      if (id) {
        const o = this.N.get(id);
        if (type === 'band' && o.e.type === 'band') return { ok: true, cost: 0, replace: id };
        return { ok: false, reason: 'occupied', cost, by: id };
      }
    }
    let item;
    if (d.from) return { ok: false, reason: 'merge', cost };
    if (d.kind === 'drill') { const di = this._drillInfo(x, y, d.w); if (!di) return { ok: false, reason: 'deposit', cost }; item = ITEM_IDS[di.t]; }
    if (this.S.money < cost) return { ok: false, reason: 'money', cost, item };
    return { ok: true, cost, item };
  }
  place(type, x, y, rot = 0) {
    rot = ((rot | 0) % 4 + 4) % 4;
    const c = this.canPlace(type, x, y, rot); if (!c.ok) return null;
    if (c.replace) {
      const e = this.N.get(c.replace).e; if (e.rot === rot) return e.id;
      this._undoPush([{ op: 'rot', id: e.id, prev: e.rot }]); e.rot = rot; if (!this._batch) this._topo(); return e.id;
    }
    const e = this._doPlace(type, x, y, rot, c.cost);
    const ops = [{ op: 'place', id: e.id }];
    if (!this._batch && type === 'band' && this.opts.autoJoin) this._joinSingle(this.N.get(e.id), ops);
    this._emit('build', { id: e.id, b: type, x, y, rot: e.rot });
    const big = !this._batch && MERGE_FROM[type] ? this._tryMerge(this.N.get(e.id), ops) : null;
    this._undoPush(ops);
    if (!this._batch) this._topo();
    return big ? big.id : e.id;
  }
  placeLine(type, cells) {
    if (type === 'band' && Array.isArray(cells) && cells.length === 1 && Array.isArray(cells[0])) {   // ein Klick = einzelnes Band
      const [x, y, rot] = cells[0]; return this.place(type, x, y, rot) != null ? 1 : 0;
    }
    let n = 0; const group = [], line = [];
    this._batch = true; const saved = this._undoPush; this._undoPush = ops => group.push(...ops);
    try {
      for (const c of arr(cells)) { if (!Array.isArray(c)) continue; const [x, y, rot] = c; const id = this.place(type, x, y, rot); if (id != null) { n++; line.push(id); } }
      if (type === 'band' && this.opts.autoJoin && line.length) this._joinLine(line, group);
    } finally { this._batch = false; this._undoPush = saved; }
    if (group.length) this._undoPush(group);
    this._topo();
    return n;
  }
  // Weg aus route() (blueprint.js) atomar setzen: [{x,y,rot,type:'band'|'tunnel'}] – alles oder nichts, eine Undo-Aktion
  canPlacePath(cells) {
    if (!Array.isArray(cells) || !cells.length) return { ok: false, reason: 'unknown', cost: 0 };
    let cost = 0; const cnt = {}, seen = new Set();
    for (const c of cells) {
      const type = c && c.type === 'tunnel' ? 'tunnel' : 'band', d = BUILDINGS[type];
      if (!c || !Number.isInteger(c.x) || !Number.isInteger(c.y) || seen.has(c.y * MAP + c.x)) return { ok: false, reason: 'bounds', cost };
      seen.add(c.y * MAP + c.x);
      if (!this.isUnlocked(type)) return { ok: false, reason: 'research', cost, need: d.unlock };
      if (c.x < 0 || c.y < 0 || c.x >= MAP || c.y >= MAP) return { ok: false, reason: 'bounds', cost };
      if (!this.isOpen(c.x, c.y)) return { ok: false, reason: 'plot', cost, at: [c.x, c.y] };
      if (this.grid[c.y * MAP + c.x]) return { ok: false, reason: 'occupied', cost, at: [c.x, c.y] };
      cost += Math.round(d.cost * Math.pow(d.scale, (this.count[type] || 0) + (cnt[type] || 0))); cnt[type] = (cnt[type] || 0) + 1;
    }
    if (this.S.money < cost) return { ok: false, reason: 'money', cost };
    return { ok: true, cost };
  }
  placePath(cells) {
    const c = this.canPlacePath(cells); if (!c.ok) return 0;
    let n = 0; const group = [], line = [];
    this._batch = true; const saved = this._undoPush; this._undoPush = ops => group.push(...ops);
    try {
      for (const q of cells) { const id = this.place(q.type === 'tunnel' ? 'tunnel' : 'band', q.x, q.y, q.rot); if (id != null) { n++; line.push(id); } }
      if (this.opts.autoJoin && line.length) this._joinLine(line, group);
    } finally { this._batch = false; this._undoPush = saved; }
    if (group.length) this._undoPush(group);
    this._topo();
    return n;
  }

  // =====================================================================================
  // Bänder verbinden sich bei Berührung (auto-join)
  // =====================================================================================
  // In welche Richtung schiebt Knoten n Teile auf Feld (x,y)? −1 = gar nicht
  _feedDir(n, x, y) {
    const e = n.e, r = e.rot;
    switch (n.kind) {
      case 'belt': return e.x + DX[r] === x && e.y + DY[r] === y ? r : -1;
      case 'tunnel': return e.exit && e.x + DX[r] === x && e.y + DY[r] === y ? r : -1;
      case 'split': case 'sort': for (const d of [LEFT(r), r, RIGHT(r)]) if (e.x + DX[d] === x && e.y + DY[d] === y) return d; return -1;
      default: if (!OUTKIND[n.kind]) return -1; { const [ox, oy] = outCell(e.x, e.y, n.w, n.h, r); return ox === x && oy === y ? r : -1; }
    }
  }
  // Nimmt Knoten n ein Teil an, das in Richtung dir hineinläuft?
  _takes(n, dir) {
    const e = n.e, r = e.rot;
    switch (n.kind) {
      case 'belt': return dir !== BACK(r);
      case 'tunnel': return !e.exit && dir === r;
      case 'split': case 'sort': return dir === r;
      case 'machine': case 'exp': case 'store': return dir !== BACK(r);
      case 'drone': return !!e.link && dir !== BACK(r);
      case 'sell': case 'lab': case 'wonder': case 'power': return true;
    }
    return false;
  }
  // Richtungen (vom Feld aus gesehen), aus denen das Feld gespeist wird
  _feeders(x, y) {
    const out = [];
    for (let d = 0; d < 4; d++) { const m = this.nodeAt(x - DX[d], y - DY[d]); if (m && this._feedDir(m, x, y) === d) out.push({ d, n: m, from: BACK(d) }); }
    return out;
  }
  // Führt der Bandweg ab Knoten a (über Bänder/Tunnel) zu Knoten b? (Schleifenschutz)
  _reaches(a, b) {
    let cur = a;
    for (let i = 0; i < 4096 && cur; i++) {
      if (cur === b) return true;
      const e = cur.e;
      if (cur.kind === 'belt' || (cur.kind === 'tunnel' && e.exit)) cur = this.nodeAt(e.x + DX[e.rot], e.y + DY[e.rot]);
      else if (cur.kind === 'tunnel' && e.link) cur = this.N.get(e.link);
      else return false;
    }
    return false;
  }
  _deadEnd(n) { const e = n.e; return n.kind === 'belt' && !this.nodeAt(e.x + DX[e.rot], e.y + DY[e.rot]); }
  _turn(n, rot, ops, ids) { ops.push({ op: 'rot', id: n.id, prev: n.e.rot }); n.e.rot = rot; if (!ids.includes(n.id)) ids.push(n.id); }
  // Nachbar-Sackgassen auf Band b drehen (nie rückwärts, nie gegen den eigenen Eingang, nie zur Schleife)
  _joinNeighbors(b, ops, ids, skip) {
    const x = b.e.x, y = b.e.y;
    for (let k = 0; k < 4; k++) {
      const m = this.nodeAt(x + DX[k], y + DY[k]); if (!m || m === b || (skip && skip.has(m.id)) || !this._deadEnd(m)) continue;
      const d = BACK(k);                                   // Richtung von m nach b
      if (d === BACK(m.e.rot) || d === m.e.rot) continue;  // geradeaus wäre schon verbunden, rückwärts nie
      if (!this._takes(b, d)) continue;                    // b zeigt auf m (würde m speisen) oder nimmt so nicht an
      if (this._feeders(m.e.x, m.e.y).some(f => f.from === d)) continue;
      if (this._reaches(b, m)) continue;
      this._turn(m, d, ops, ids);
    }
  }
  // annehmende Nachbarn eines Bandfelds in den Richtungen dirs (ohne Schleifen)
  _acceptors(b, dirs) {
    const out = [];
    for (const o of dirs) {
      const m = this.nodeAt(b.e.x + DX[o], b.e.y + DY[o]);
      if (!m || m === b || !this._takes(m, o)) continue;
      if (m.kind === 'belt' && this._feedDir(m, b.e.x, b.e.y) >= 0) continue;   // Band, das auf b zeigt
      if (BELTLIKE[m.kind] && this._reaches(m, b)) continue;
      out.push({ o, m });
    }
    return out;
  }
  _joinSingle(b, ops) {
    const ids = [];
    this._joinNeighbors(b, ops, ids, null);
    const fd = this._feeders(b.e.x, b.e.y);
    if (fd.length) {
      const bad = new Set(fd.map(f => f.from));
      const free = [0, 1, 2, 3].filter(o => !bad.has(o));
      if (free.length) {
        const acc = this._acceptors(b, free);
        let want = fd[0].d; if (bad.has(want)) want = free[0];
        if (acc.length === 1) want = acc[0].o;
        if (want !== b.e.rot) { b.e.rot = want; ids.push(b.id); }
      }
    }
    if (ids.length) this._emit('join', { ids });
  }
  _joinLine(lineIds, ops) {
    const ids = [], set = new Set(lineIds), nodes = lineIds.map(id => this.N.get(id)).filter(n => n && n.kind === 'belt');
    for (const b of nodes) this._joinNeighbors(b, ops, ids, set);
    // Ende: zeigt es nicht in ein annehmendes Ziel, biegt es in ein angrenzendes ein (eindeutig, Maschinen vor Bändern)
    const last = this.N.get(lineIds[lineIds.length - 1]);
    if (last && last.kind === 'belt') {
      const r = last.e.rot, t = this.nodeAt(last.e.x + DX[r], last.e.y + DY[r]);
      if (!(t && this._takes(t, r))) {
        const bad = new Set(this._feeders(last.e.x, last.e.y).map(f => f.from));
        let acc = this._acceptors(last, [LEFT(r), RIGHT(r)].filter(o => !bad.has(o)));
        if (acc.length > 1) { const mach = acc.filter(a => !BELTLIKE[a.m.kind]); if (mach.length === 1) acc = mach; }
        if (acc.length === 1) this._turn(last, acc[0].o, ops, ids);
      }
    }
    if (ids.length) this._emit('join', { ids });
  }
  _newEnt(type, x, y, rot, id) {
    const d = BUILDINGS[type];
    const e = { id, type, x, y, rot, paid: 0, xp: 0, lvl: 1 + Math.min(4, this.M.startLvl) };
    switch (d.kind) {
      case 'belt': e.items = []; break;
      case 'tunnel': e.items = []; e.link = 0; e.exit = false; break;
      case 'split': e.items = []; e.rr = 0; break;
      case 'sort': e.items = []; e.filter = null; break;
      case 'drill': e.prog = 0; e.out = []; break;
      case 'machine': e.recipe = null; e.auto = true; e.inN = []; e.inG = []; e.out = []; e.prog = 0; e.craft = 0; e.cg = 0; e.st0 = 0; e.st1 = 0; break;
      case 'exp': e.a = -1; e.b = -1; e.prog = 0; e.craft = 0; e.out = []; break;
      case 'lab': e.q = []; e.prog = 0; break;
      case 'sell': e.streak = 0; e.age = 99; e.sold = 0; e.full = 0; break;
      case 'store': e.q = []; break;
      case 'power': e.q = []; e.burn = 0; break;
      case 'drone': e.q = []; e.out = []; e.link = 0; e.dr = [this._drone()]; break;
    }
    if (MKSET.has(type)) e.mk = 1;
    return e;
  }
  _drone() { return { s: 0, p: 0, w: 0, load: [], op: 0, mt: -1 }; }

  // ---------- Verschmelzen: 4 gleiche Bohrer im 2×2-Quadrat (genau ausgerichtet, gleicher Rohstoff, gleiche Mk) → Großbohrer ----------
  // Der Großbohrer übernimmt Inhalt, bezahlten Preis (Abriss erstattet alles), höchste Stufe und Mk; Ausgang: Drehung des neuen
  // Bohrers, wenn dort etwas anschließt, sonst die erste Drehung der vier, an deren Ausgang ein Band liegt. ops → eine Undo-Aktion.
  _mergeGroup(n) {
    const into = n && MERGE_FROM[n.e.type]; if (!into || n.res < 0) return null;
    const e = n.e, mk = this._mkOf(e), s = n.w;
    for (const [dx, dy] of [[0, 0], [-s, 0], [0, -s], [-s, -s]]) {
      const ox = e.x + dx, oy = e.y + dy, g = [];
      for (const [i, j] of [[0, 0], [s, 0], [0, s], [s, s]]) {
        const m = this.nodeAt(ox + i, oy + j);
        if (!m || m.e.type !== e.type || m.e.x !== ox + i || m.e.y !== oy + j || m.res !== n.res || this._mkOf(m.e) !== mk) break;
        g.push(m);
      }
      if (g.length === 4) return { into, g, x: ox, y: oy };
    }
    return null;
  }
  _tryMerge(n, ops = null) {
    const q = this._mergeGroup(n); if (!q) return null;
    const { into, g, x, y } = q, D = BUILDINGS[into], ids = new Set(g.map(m => m.id));
    let rot = n.e.rot;
    for (const r of [n.e.rot, ...g.map(m => m.e.rot)]) { const [cx, cy] = outCell(x, y, D.w, D.h, r), t = this.nodeAt(cx, cy); if (t && !ids.has(t.id)) { rot = r; break; } }
    const snaps = g.map(m => ({ ...this._entSnap(m.e), prog: m.e.prog, out: m.e.out.slice() }));
    let out = [], prog = 0, paid = 0, best = g[0].e;
    for (const m of g) { out.push(...m.e.out); prog += m.e.prog / 4; paid += m.e.paid; if (m.e.lvl > best.lvl || (m.e.lvl === best.lvl && m.e.xp > best.xp)) best = m.e; }
    const mk = this._mkOf(g[0].e), lvl = best.lvl, xp = best.xp;
    for (const m of g) this._dropNode(m);
    const e = this._doPlace(into, x, y, rot, 0);
    e.paid = paid; e.lvl = lvl; e.xp = xp; e.prog = prog; e.mk = mk;
    const big = this.N.get(e.id); e.out = out.slice(0, this._dcap(big));
    if (ops) ops.push({ op: 'merge', id: e.id, snaps });
    this._emit('merge', { id: e.id, b: into, from: e.type, parts: g.length, item: ITEM_IDS[big.res], x: x + D.w / 2, z: y + D.h / 2, rot, mk });
    if (!this._batch) this._topo();
    return e;
  }
  // Gebäude ohne Erstattung, Verlust-Zählung und Abriss-Ereignis aus der Welt nehmen (Verschmelzen und dessen Rückgängig)
  _dropNode(n) { this._hist('r', n.e); this._delNode(n); this.S.ents.splice(this.S.ents.indexOf(n.e), 1); }
  _unmerge(n, snaps) {
    const out = n.e.out.slice(); this._dropNode(n);
    const parts = [];
    for (const s of snaps) {
      if (!this._cellsFree(s)) continue;
      const e = this._doPlace(s.type, s.x, s.y, s.rot, 0, s.id);
      e.paid = s.paid; e.xp = s.xp; e.lvl = s.lvl; e.prog = num(s.prog, 0, 0, 1); if (s.mk && MKSET.has(e.type)) e.mk = s.mk; e.out = [];
      parts.push(this.N.get(e.id));
    }
    for (let i = 0; i < out.length && parts.length; i++) { const p = parts[i % parts.length]; if (p.e.out.length < this._dcap(p)) p.e.out.push(out[i]); else this.S.stats.lost++; }
  }
  // Verschmelzen nach dem Laden (ältere Stände oder Rückgängig-Lücken): ohne Undo
  _mergeAll() { let k = 0; for (const n of [...this.mn]) if (this.N.has(n.id) && this._tryMerge(n)) k++; if (k) this._topo(); return k; }
  _doPlace(type, x, y, rot, cost, id = 0) {
    const e = this._newEnt(type, x, y, rot, id || ++this.S.eid);
    e.paid = cost; this.S.money -= cost;
    this.S.ents.push(e); this._addNode(e);
    if (e.type === 'tunnel') this._pairTunnel(e);
    this._hist('b', e);
    return e;
  }
  // Verlauf für den Zeitraffer: [tick, 'b'|'r'|'u', type, x, y, rot, mk]
  _hist(k, e) { const h = this.S.hist; h.push([this.S.tick, k, e.type, e.x, e.y, e.rot, e.mk || 1]); if (h.length > HIST_MAX) h.splice(0, h.length - HIST_MAX); }
  history() { return this.S.hist.map(h => h.slice()); }
  // Koppeln in beide Richtungen: nächster gleich gedrehter Tunnel dahinter (→ e wird Ausgang) oder davor (→ e wird Eingang)
  _pairTunnel(e) {
    if (e.link) return;
    const range = BUILDINGS.tunnel.range;
    const near = sg => {
      for (let k = 1; k <= range; k++) {
        const n = this.nodeAt(e.x + sg * DX[e.rot] * k, e.y + sg * DY[e.rot] * k);
        if (n && n.e.type === 'tunnel' && n.e.rot === e.rot) return n;
      }
      return null;
    };
    const b = near(-1);
    if (b && !b.e.link) { e.exit = true; e.link = b.id; b.e.link = e.id; b.e.exit = false; return; }
    const a = near(1);
    if (a && !a.e.link) { e.exit = false; e.link = a.id; a.e.link = e.id; a.e.exit = true; }
  }
  // Entkoppeln; gibt den früheren Partner zurück (der danach selbst neu koppeln darf)
  _unpairTunnel(e) {
    e.exit = false; if (!e.link) return null;
    const p = this.N.get(e.link); e.link = 0;
    if (p) { p.e.link = 0; p.e.exit = false; }
    return p ? p.e : null;
  }
  // Teile im Tunnel an die aktuelle Länge anpassen: sortiert, p ≤ len, Mindestabstand; was nicht passt, gilt als verloren
  _fitTunnel(n) {
    const it = n.e.items; if (!it.length) return;
    for (let i = 1; i < it.length; i++) if (it[i].p > it[i - 1].p) { it.sort((a, b) => b.p - a.p); break; }
    let cap = n.len;
    for (let i = 0; i < it.length; i++) {
      const q = it[i];
      if (q.p > cap + 1e-9) { q.p = cap; q.op = cap; }
      if (q.p < -1e-9 || i >= 4 * n.len) { this.S.stats.lost += it.length - i; it.length = i; break; }
      cap = q.p - SP;
    }
  }
  remove(id) {
    const n = this.N.get(id); if (!n) return false;
    const snap = this._entSnap(n.e);
    this._removeNode(n, true);
    this._undoPush([{ op: 'remove', snap }]);
    this._topo();
    return true;
  }
  _removeNode(n, refund) {
    const e = n.e;
    if (refund) this.S.money += e.paid;
    const partner = e.type === 'tunnel' ? this._unpairTunnel(e) : null;
    this.S.stats.lost += this._contentCount(e);
    if (this.S.ger.on && this.S.ger.belt === e.id) this._geraldLeave();
    // Drohnen: Sender, die hierher fliegen, verlieren die Verbindung (Ladung kommt zurück in den Sender)
    if (e.type === 'drohnenhafen') for (const m of this.mn) if (m.kind === 'drone' && m.e.link === e.id && m !== n) this._unlink(m.e);
    this._hist('r', e);
    this._delNode(n);
    this.S.ents.splice(this.S.ents.indexOf(e), 1);
    if (partner && this.N.has(partner.id)) this._pairTunnel(partner);
    this._emit('remove', { id: e.id, b: e.type });
  }
  _contentCount(e) {
    let c = 0; if (e.items) c += e.items.length; if (e.out) c += e.out.length; if (e.q) c += e.q.length;
    if (e.inN) for (const v of e.inN) c += v; if (e.a >= 0) c++; if (e.b >= 0) c++;
    if (e.dr) for (const d of e.dr) c += d.load.length; return c;
  }
  _entSnap(e) { return { id: e.id, type: e.type, x: e.x, y: e.y, rot: e.rot, paid: e.paid, xp: e.xp, lvl: e.lvl, recipe: e.recipe, auto: e.auto, filter: e.filter, mk: e.mk, link: e.type === 'drohnenhafen' ? e.link : 0 }; }
  rotate(id) {
    const n = this.N.get(id); if (!n) return false;
    this._undoPush([{ op: 'rot', id, prev: n.e.rot }]);
    this._setRot(n, (n.e.rot + 1) & 3); return true;
  }
  _setRot(n, rot, topo = true) {
    const e = n.e; e.rot = rot;
    if (e.type === 'tunnel') { const p = this._unpairTunnel(e); this._pairTunnel(e); if (p && p !== e && this.N.has(p.id)) this._pairTunnel(p); }
    if (e.items) for (const q of e.items) q.d = -1;          // Verteiler/Sortierer: gewählte Richtung neu bestimmen
    if (topo) this._topo();
  }
  setRecipe(id, rid) {
    const n = this.N.get(id); if (!n || n.kind !== 'machine') return false;
    const e = n.e;
    if (rid != null && (!RECIPES[rid] || RECIPES[rid].building !== e.type || !this.recipeAvailable(rid))) return false;
    // Automatik behält das aktuelle Rezept samt Puffer, bis ein anderes Teil kommt
    const auto = rid == null, nr = auto ? e.recipe : rid;
    if (nr === e.recipe && auto === e.auto) return true;            // unverändert: nichts verwerfen
    this._undoPush([{ op: 'recipe', id, recipe: e.recipe, auto: e.auto }]);
    this._applyRecipe(e, nr, auto);
    return true;
  }
  // Rezept setzen; bei echtem Wechsel passende Zutaten mitnehmen, laufende Fertigung und Unpassendes zählen als verloren
  _applyRecipe(e, rid, auto) {
    rid = rid ?? null;
    if (rid !== e.recipe) {
      if (e.craft && e.recipe) this.S.stats.lost += RT[e.recipe].need.reduce((a, b) => a + b, 0);
      this._remapRecipe(e, rid); e.craft = 0; e.prog = 0;
    }
    e.auto = auto ?? rid == null;
  }
  setFilter(id, item) {
    const n = this.N.get(id); if (!n || n.kind !== 'sort') return false;
    if (item != null && item !== 'gold' && !has(IDX, item)) return false;
    this._undoPush([{ op: 'filter', id, prev: n.e.filter }]);
    n.e.filter = item ?? null; return true;
  }
  _undoPush(ops) { if (!ops.length) return; this.undoStack.push(ops); if (this.undoStack.length > UNDO_MAX) this.undoStack.shift(); }
  canUndo() { return this.undoStack.length > 0; }
  _cellsFree(s) {
    const d = BUILDINGS[s.type];
    for (let j = 0; j < d.h; j++) for (let k = 0; k < d.w; k++) if (this.grid[(s.y + j) * MAP + s.x + k]) return false;
    return true;
  }
  // Rückgängig: false, wenn nichts zu tun ist oder der Schritt abgelehnt wird (zurückgeholter Abriss kostet wieder,
  // was erstattet wurde – reicht das Geld nicht, bleibt der Schritt auf dem Stapel, Ereignis 'denied')
  undo() {
    const ops = this.undoStack[this.undoStack.length - 1]; if (!ops) return false;
    let cost = 0;
    for (const o of ops) if (o.op === 'remove' && this._cellsFree(o.snap)) cost += o.snap.paid || 0;
    if (cost > 0 && this.S.money < cost) { this._emit('denied', { action: 'undo', reason: 'money', cost }); return false; }
    this.undoStack.pop();
    for (let i = ops.length - 1; i >= 0; i--) {
      const o = ops[i], n = o.id ? this.N.get(o.id) : null;
      if (o.op === 'place') { if (n) this._removeNode(n, true); }
      else if (o.op === 'rot') { if (n) this._setRot(n, o.prev, false); }
      else if (o.op === 'recipe') {
        if (n) { const e = n.e, busy = e.craft || e.inN.some(v => v > 0);
          this._applyRecipe(e, o.recipe == null && o.auto && busy ? e.recipe : o.recipe, o.auto); }
      }
      else if (o.op === 'filter') { if (n) n.e.filter = o.prev; }
      else if (o.op === 'remove') {
        const s = o.snap, d = BUILDINGS[s.type];
        if (!this._cellsFree(s)) continue;
        const e = this._doPlace(s.type, s.x, s.y, s.rot, s.paid, s.id);
        e.xp = s.xp; e.lvl = s.lvl; if (e.type === 'sortierer') e.filter = s.filter ?? null;
        if (d.kind === 'machine') this._applyRecipe(e, s.recipe, s.auto !== false);
        if (s.mk && MKSET.has(e.type)) { e.mk = s.mk; this._fitDrones(e); }
        if (s.link && this.N.get(s.link)?.e.type === 'drohnenhafen') e.link = s.link;
      }
      else if (o.op === 'merge') { if (n) this._unmerge(n, o.snaps); }
      else if (o.op === 'mk') { if (n) { n.e.mk = o.prev; n.e.paid -= o.cost; this.S.money += o.cost; this._fitDrones(n.e); this._hist('u', n.e); } }
      else if (o.op === 'link') { if (n) { this._unlink(n.e); n.e.link = o.prev && this.N.get(o.prev)?.e.type === 'drohnenhafen' ? o.prev : 0; } }
    }
    this._topo();
    this._emit('undo', {});
    return true;
  }

  // =====================================================================================
  // Simulation
  // =====================================================================================
  tick(n = 1) { for (let i = 0; i < n; i++) this._step(); }
  _step() {
    const S = this.S; S.tick++; S.total.playtime += DT;
    // Boosts
    if (S.boosts.turbo > 0) { S.boosts.turbo -= DT; if (S.boosts.turbo <= 0) { S.boosts.turbo = 0; this._mods(); this._emit('boost', { kind: 'turbo', end: true }); } }
    this._gerald();
    // Strom (Netze lazy neu aufbauen), Schonfrist alter Stände
    if (this._pdirty) this._powerTopo();
    if (S.powerGrace > 0) { S.powerGrace -= DT; if (S.powerGrace <= 0) { S.powerGrace = 0; this._emit('power', { kind: 'graceEnd', key: 'event.power.graceEnd' }); } }
    this._powerTick(true);
    for (let i = 0; i < this.bn.length; i++) this._moveBelt(this.bn[i]);
    for (let i = 0; i < this.mn.length; i++) this._work(this.mn[i]);
    // Aufträge
    for (let i = 0; i < S.contracts.length; i++) {
      const c = S.contracts[i]; if (c.done) continue;
      if (c.delay > 0) { c.delay -= DT; if (c.delay <= 0) { c.delay = 0; this._emit('contract', { kind: 'new', i, ...this._cInfo(c) }); } continue; }
      c.left -= DT;
      if (c.left <= 0) { this._emit('contract', { kind: 'expired', i, item: c.item, n: c.n, key: 'contract.expired' }); S.contracts[i] = this._newContract(CONTRACT.delay); }
    }
    // Statistik: 10-Sekunden-Eimer
    if (S.tick % 200 === 0) { const st = S.stats; st.ring[st.ri] = st.acc; st.ri = (st.ri + 1) % st.ring.length; st.nb++; st.acc = 0; }
    if (S.tick % TPS === 0) this._second();
    for (const h of this.hooks.tick) h(this);
  }
  _second() {
    const st = this.S.stats;
    const ema = (rate, cnt) => {
      for (const k in rate) { rate[k] *= 0.95; if (rate[k] < 1e-4) delete rate[k]; }
      for (const k in cnt) rate[k] = (rate[k] || 0) + cnt[k] * 0.05;
    };
    ema(st.rate, st.cs); ema(st.mrate, st.cm); st.cs = {}; st.cm = {};
    // Auslastung je Gebäude (Ring über 30 s, nur Laufzeit)
    for (const n of this.mn) { n.ub[n.ui] = Math.min(255, n.uc); n.ui = (n.ui + 1) % UTIL_SECS; n.uc = 0; if (n.un < UTIL_SECS) n.un++; }
    this._world();
    this._checkAch(); this._checkTut();
  }
  // Welt-Regeln je Sekunde: Sandsturm (Wüste), Ablauf vorübergehender Vorkommen
  _stormGap() { const W = WORLD.storm; return Math.round(W.min + this.rand() * (W.max - W.min)); }
  _world() {
    const S = this.S;
    if (S.biome === 'wueste') {
      const W = S.storm;
      if (W.left > 0) { W.left--; if (W.left <= 0) { W.left = 0; W.next = this._stormGap(); this._emit('storm', { on: false, secs: 0, key: 'event.stormEnd' }); } }
      else if (--W.next <= 0) { W.next = 0; W.left = WORLD.storm.secs; this._emit('storm', { on: true, secs: W.left, key: 'event.storm' }); }
    }
    if (S.xdep.length) {
      let gone = false;
      for (const d of S.xdep) if (--d.left <= 0) gone = true;
      if (gone) {
        const keep = S.xdep.filter(d => d.left > 0), old = S.xdep.filter(d => d.left <= 0);
        for (const d of old) {
          const k = d.y * MAP + d.x, o = this.dep0.get(k);
          if (o) { this.dep[k] = o[0]; this.rich[k] = o[1]; this.dep0.delete(k); }
          this._emit('deposit', { x: d.x, y: d.y, item: d.item, on: false });
        }
        S.xdep = keep;
        this._refitDrills(old);
      }
    }
  }
  // Bohrer über geänderten Feldern passen sich dem neuen Vorkommen an
  _refitDrills(cells) {
    const seen = new Set();
    for (const c of cells) for (let j = -1; j <= 0; j++) for (let i = -1; i <= 0; i++) {
      const n = this.nodeAt(c.x + i, c.y + j); if (!n || n.kind !== 'drill' || seen.has(n)) continue; seen.add(n);
      const di = this._drillInfo(n.e.x, n.e.y, n.w); n.res = di ? di.t : -1; n.cov = di ? di.cov : 0;
    }
  }

  _moveBelt(n) {
    const e = n.e, it = e.items; if (!it.length) return;
    const tk = this.S.tick, L = n.len;
    const step = e.id === this._blockId ? 0 : this.M.step * n.sl;
    let limit = L, i = 0;
    while (i < it.length) {
      const q = it[i];
      if (q.mt !== tk) {
        q.op = q.p; q.oe = e.id; q.od = q.d; q.mt = tk;
        let np = q.p + step;
        if ((n.kind === 'split' || n.kind === 'sort') && q.d < 0 && np >= 0.5) { if (!this._choose(n, q)) np = Math.max(q.p, 0.5); }
        if (np > limit) np = limit;
        if (np > q.p) q.p = np;
        if (i === 0 && q.p >= L && step > 0) {
          const dir = q.d >= 0 ? q.d : e.rot, tgt = q.d >= 0 ? n.outN[q.d] : n.tgt;
          if (tgt && this._push(tgt, q.t * 2 + q.g, dir, q.p - L, n, q)) { it.shift(); limit = L; continue; }
          q.p = L;
        }
      }
      limit = q.p - SP; i++;
    }
  }
  _choose(n, q) {
    const e = n.e, r = e.rot, code = q.t * 2 + q.g;
    if (n.kind === 'sort') {
      const f = e.filter, hit = f != null && (f === 'gold' ? q.g === 1 : IDX[f] === q.t), d = hit ? LEFT(r) : r, t = n.outN[d];
      if (t && this._push(t, code, d, 0, n, null, true)) { q.d = d; return true; }
      return false;
    }
    const dirs = [LEFT(r), r, RIGHT(r)];
    for (let k = 0; k < 3; k++) {
      const idx = (e.rr + k) % 3, d = dirs[idx], t = n.outN[d];
      if (t && this._push(t, code, d, 0, n, null, true)) { q.d = d; e.rr = (idx + 1) % 3; return true; }
    }
    return false;
  }
  // Teil (Code) an Knoten t übergeben; dir = Laufrichtung beim Übertritt; q = vorhandenes Teil-Objekt (Band→Band) oder null
  _push(t, code, dir, ov, from, q, dry = false) {
    if (BELTLIKE[t.kind]) return this._acceptBelt(t, code, dir, ov, from, q, dry);
    return this._acceptCode(t, code, dir, dry);
  }
  _acceptBelt(n, code, dir, ov, from, q, dry) {
    const e = n.e, it = e.items, k = n.kind;
    let side = false;
    if (k === 'belt') {
      if (it.length >= 4 || dir === BACK(e.rot)) return false;
      side = !(dir === e.rot || (n.curve && dir === n.inDir));
    } else if (k === 'tunnel') {
      if (e.exit) { if (!from || from.id !== e.link) return false; }
      else if (dir !== e.rot) return false;
      if (it.length >= 4 * n.len) return false;
    } else { if (dir !== e.rot || it.length >= 4) return false; }
    let p, idx = it.length;
    if (!side) {
      const last = it[it.length - 1]; p = ov > 0 ? Math.min(ov, n.len) : 0;
      if (last) { if (last.p < SP) return false; if (p > last.p - SP) p = last.p - SP; }
    } else {
      p = 0.5;
      for (let i = 0; i < it.length; i++) { const v = it[i].p; if (Math.abs(v - 0.5) < SP) return false; if (v < 0.5 && idx === it.length) idx = i; }
    }
    if (dry) return true;
    const tk = this.S.tick;
    if (!q) q = { t: code >> 1, g: code & 1, p, k: ++this.S.nid, d: -1, op: p, oe: e.id, od: -1, mt: tk };
    else { q.p = p; q.d = -1; }
    if (idx === it.length) it.push(q); else it.splice(idx, 0, q);
    return true;
  }
  _acceptCode(n, code, dir, dry) {
    const e = n.e, t = code >> 1;
    switch (n.kind) {
      case 'sell': if (!dry) this._sell(n, code); return true;
      case 'lab': if (e.q.length >= 6 * this._buf(e)) return false; if (!dry) e.q.push(code); return true;
      case 'store': if (dir === BACK(e.rot) || e.q.length >= BUILDINGS.lager.cap * this._buf(e)) return false; if (!dry) e.q.push(code); return true;
      case 'power': {
        const K = BUILDINGS.kraftwerk; if (e.q.length >= K.cap || !K.fuel.includes(ITEM_IDS[t])) return false;
        if (!dry) e.q.push(code); return true;
      }
      case 'drone': if (!e.link || dir === BACK(e.rot) || e.q.length >= BUILDINGS.drohnenhafen.cap * this._buf(e)) return false; if (!dry) e.q.push(code); return true;
      case 'wonder': {
        const W = this.S.wonder, st = WONDER[W.stage - 1]; if (!st) return false;
        const id = ITEM_IDS[t], need = st.need[id]; if (!need || (W.have[id] || 0) >= need) return false;
        if (!dry) this._wonderIn(n, id); return true;
      }
      case 'exp':
        if (dir === BACK(e.rot) || e.craft) return false;
        if (e.a < 0) { if (!dry) e.a = code; return true; }
        if (e.b < 0) { if (!dry) e.b = code; return true; }
        return false;
      case 'machine': {
        if (dir === BACK(e.rot)) return false;
        let r = e.recipe ? RT[e.recipe] : null, slot = r ? r.ins.indexOf(t) : -1;
        if (slot < 0) {
          // Automatik: Rezept suchen, das alle gepufferten Zutaten und das neue Teil enthält, Puffer umstellen.
          // Passt keins, wartet das Teil; hängt es länger als AUTO_STALL fest, gewinnt das neue Teil
          // (unpassende Puffer-Zutaten zählen als verloren) – so blockiert ein gemischtes Band nie für immer.
          if (!e.auto || e.craft) return false;
          let nr = this._autoRecipe(e, t);
          if (!nr && this._stalled(e)) nr = this._autoRecipe(e, t, true);
          if (!nr) return false;
          if (dry) return true;
          this._remapRecipe(e, nr); r = RT[nr]; slot = r.ins.indexOf(t);
        }
        if (e.inN[slot] >= r.cap[slot] * this._buf(e)) return false;
        if (!dry) { e.inN[slot]++; if (code & 1) e.inG[slot]++; e.st0 = e.st1 = 0; }
        return true;
      }
    }
    return false;
  }
  // Rezept für ein neues Teil t: muss t enthalten und (ohne force) jede schon gepufferte Zutat; sonst das mit den meisten
  _autoRecipe(e, t, force = false) {
    const o = e.recipe ? RT[e.recipe] : null, have = [];
    if (o) for (let i = 0; i < o.ins.length; i++) if ((e.inN[i] || 0) > 0) have.push(o.ins[i]);
    let best = null, bv = -1;
    for (const id of RECIPE_IDS) {
      const r = RT[id]; if (r.b !== e.type || !r.ins.includes(t) || !this.recipeAvailable(id)) continue;
      const cov = have.filter(h => r.ins.includes(h)).length;
      if (!force && cov < have.length) continue;
      if (cov > bv) { bv = cov; best = id; }
    }
    return best;
  }
  // Teil wartet ununterbrochen (jeden Tick ein Versuch) seit AUTO_STALL Ticks vor der Maschine?
  _stalled(e) {
    const tk = this.S.tick;
    if (e.st1 !== tk && e.st1 !== tk - 1) e.st0 = tk;
    e.st1 = tk;
    return tk - e.st0 >= AUTO_STALL;
  }
  // Rezept wechseln, passende Puffer-Zutaten mitnehmen (bis zur Kapazität), der Rest zählt als verloren
  _remapRecipe(e, rid) {
    const o = e.recipe ? RT[e.recipe] : null, r = rid ? RT[rid] : null, st = this.S.stats;
    const inN = r ? r.ins.map(() => 0) : [], inG = r ? r.ins.map(() => 0) : [];
    if (o) for (let i = 0; i < o.ins.length; i++) {
      const n = e.inN[i] || 0; if (!n) continue;
      const j = r ? r.ins.indexOf(o.ins[i]) : -1;
      if (j < 0) { st.lost += n; continue; }
      const keep = Math.min(n, r.cap[j] * this._buf(e)); inN[j] = keep; inG[j] = Math.min(keep, e.inG[i] || 0); st.lost += n - keep;
    }
    e.recipe = rid; e.inN = inN; e.inG = inG; e.st0 = e.st1 = 0;
  }
  _flush(n) {
    const e = n.e; if (!e.out.length || !n.tgt) return;
    if (this._push(n.tgt, e.out[0], e.rot, 0, n, null)) e.out.shift();
  }
  _xp(n) {
    const e = n.e; e.xp += this.M.xp;
    while (e.lvl < 5 && e.xp >= XP_LV[e.lvl]) { e.lvl++; this._emit('levelup', { id: e.id, b: e.type, level: e.lvl, x: e.x + n.w / 2, z: e.y + n.h / 2 }); }
  }
  _made(t, cnt, n = null, gold = 0) {
    const id = ITEM_IDS[t], S = this.S, st = S.stats, tot = S.total.made;
    st.made[id] = (st.made[id] || 0) + cnt; tot[id] = (tot[id] || 0) + cnt; st.cm[id] = (st.cm[id] || 0) + cnt; st.crafted += cnt;
    if (gold) S.total.goldMade[id] = (S.total.goldMade[id] || 0) + gold;          // fürs Album
    if (n && n.e.lvl >= 5) S.total.perfect[id] = (S.total.perfect[id] || 0) + cnt;
  }
  _buf(e) { return MK.buf[this._mkOf(e)]; }
  _work(n) {
    const e = n.e, M = this.M;
    switch (n.kind) {
      case 'drill': {
        if (n.res >= 0 && e.out.length < this._dcap(n) && n.sp > 0) {
          n.uc++;
          e.prog += DT * M.drill * this.starMul(e) * n.cov * (n.d.bonus || 1) * n.sp / BUILDINGS.bohrer.time;
          const cap = this._dcap(n);
          while (e.prog >= 1 && e.out.length < cap) {                // Großbohrer mit Mk III kann mehr als ein Teil je Tick fördern
            e.prog -= 1;
            const S = this.S; let g = 0;
            if (S.boosts.goldrain > 0) { S.boosts.goldrain--; g = 1; } else if (this.rand() < M.gold) g = 1;
            e.out.push(n.res * 2 + g); S.stats.mined++; this._made(n.res, 1, n, g);
            if (g) { S.stats.gold++; S.total.gold++; this._emit('gold', { id: e.id, item: ITEM_IDS[n.res], x: e.x + n.w / 2, z: e.y + n.h / 2 }); }
            this._xp(n);
          }
          if (e.prog > 1) e.prog = 1;
        }
        this._flush(n); break;
      }
      case 'machine': {
        const r = e.recipe ? RT[e.recipe] : null;
        if (r) {
          if (!e.craft) this._tryStart(e, r);
          if (e.craft && n.sp > 0) {
            n.uc++;
            e.prog += DT * M.mach * this.starMul(e) * n.sp / r.time;
            if (e.prog >= 1) {
              e.prog -= 1; e.craft = 0;
              for (let i = 0; i < r.n; i++) e.out.push(r.out * 2 + (i === 0 ? e.cg : 0));
              this._made(r.out, r.n, n, e.cg); this._xp(n);
              this._tryStart(e, r); if (!e.craft) e.prog = 0;
            }
          }
        }
        this._flush(n); break;
      }
      case 'exp': {
        if (!e.craft && e.a >= 0 && e.b >= 0 && e.out.length < 4 * this._buf(e)) { e.craft = 1; e.prog = 0; }
        if (e.craft && n.sp > 0) {
          n.uc++;
          e.prog += DT * M.mach * this.starMul(e) * n.sp / BUILDINGS.experiment.time;
          if (e.prog >= 1) { this._experiment(n); e.craft = 0; e.prog = 0; this._xp(n); }
        }
        this._flush(n); break;
      }
      case 'lab': {
        if (e.q.length && n.sp > 0) {
          n.uc++;
          e.prog += DT * M.mach * this.starMul(e) * n.sp / BUILDINGS.labor.time;
          if (e.prog >= 1) {
            e.prog = 0; const c = e.q.shift(), gain = ITEMS[ITEM_IDS[c >> 1]].rp * (c & 1 ? 10 : 1) * M.rp;
            this.S.rp += gain; this.S.stats.rpGain += gain; this._xp(n);
          }
        } else if (!e.q.length) e.prog = 0;
        break;
      }
      case 'store': if (e.q.length) { n.uc++; if (n.tgt && this._push(n.tgt, e.q[0], e.rot, 0, n, null)) e.q.shift(); } break;
      case 'drone': this._droneWork(n); this._flush(n); break;
      case 'heater': if (n.pw > 0) n.uc++; break;
      case 'solar': if (n.out > 0) n.uc++; break;
      case 'sell': {
        e.age += DT; if (e.age <= TAKT_GAP) n.uc++;
        if (e.age > TAKT_GAP) e.streak = 0; else if (e.sold) e.streak += DT;
        if (!e.full && e.streak >= TAKT_TIME) { e.full = 1; this.S.total.taktMax = 1; this._emit('takt', { id: e.id, takt: this.takt(e), x: e.x + 1, z: e.y + 1 }); }
        if (e.full && e.streak < TAKT_TIME) e.full = 0;
        break;
      }
    }
  }
  _tryStart(e, r) {
    if (e.out.length + r.n > r.ocap * this._buf(e)) return;
    for (let i = 0; i < r.ins.length; i++) if ((e.inN[i] || 0) < r.need[i]) return;
    let g = 0;
    for (let i = 0; i < r.ins.length; i++) { const k = r.need[i], gg = Math.min(e.inG[i], k); e.inG[i] -= gg; e.inN[i] -= k; if (gg) g = 1; }
    e.cg = g; e.craft = 1;
  }
  _experiment(n) {
    const e = n.e, S = this.S, ta = e.a >> 1, tb = e.b >> 1, g = (e.a & 1) | (e.b & 1);
    const list = ta !== tb ? PAIRS.get(pairKey(ta, tb)) : null;
    const pos = { x: e.x + 1.5, z: e.y + 1.5 };
    if (list && list.length) {
      const rid = list.find(r => RT[r].hidden && !S.book.found.includes(r)) || list[0], r = RT[rid];
      if (r.hidden && !S.book.found.includes(rid)) {
        S.book.found.push(rid);
        this._emit('discover', { id: e.id, recipe: rid, item: ITEM_IDS[r.out], key: 'steve.eureka', ...pos });
      }
      e.out.push(r.out * 2 + g); this._made(r.out, 1, n, g);
    } else {
      const [a, b] = [ITEM_IDS[ta], ITEM_IDS[tb]].sort(), combo = a + '+' + b, known = S.book.fails.includes(combo);
      if (!known) S.book.fails.push(combo);
      S.total.scrap++;
      e.out.push(IDX.schrott * 2 + g); this._made(IDX.schrott, 1, n, g);
      this._emit('fail', { id: e.id, a, b, known, ...pos });
    }
    e.a = -1; e.b = -1;
  }
  _sell(n, code) {
    const e = n.e, S = this.S, t = code >> 1, g = code & 1, id = ITEM_IDS[t];
    const takt = this.takt(e), v = this.val[t] * (g ? GOLD_MUL : 1) * takt * (1 + MK.sell[this._mkOf(e)]);
    S.money += v; S.stats.earned += v; S.total.earned += v; S.stats.acc += v;
    S.stats.sold++; S.total.sold++; S.stats.soldBy[id] = (S.stats.soldBy[id] || 0) + 1; S.stats.cs[id] = (S.stats.cs[id] || 0) + 1;
    e.sold++; e.age = 0;
    for (let i = 0; i < S.contracts.length; i++) {
      const c = S.contracts[i];
      if (!c.done && !(c.delay > 0) && c.item === id && ++c.have >= c.n) { c.done = true; this._emit('contract', { kind: 'done', i, ...this._cInfo(c) }); }
    }
    const d = S.daily; if (d && !d.done && d.item === id && ++d.have >= d.n) { d.done = true; this._emit('contract', { kind: 'done', i: 'daily', daily: true, ...this._cInfo(d) }); }
    this._emit('sold', { id: e.id, item: id, gold: !!g, value: v, takt, x: e.x + 1, z: e.y + 1 });
  }

  // =====================================================================================
  // Drohnen: Sender (nimmt von Bändern) → Empfänger (gibt vorn aus); 1 Drohne je Mk-Stufe
  // Zustand je Drohne: s 0 = zu Hause, 1 = Hinflug, 2 = Rückflug, 3 = wartet beim Empfänger; p 0 (Sender) … 1 (Empfänger)
  // =====================================================================================
  _fitDrones(e) {
    if (e.type !== 'drohnenhafen') return;
    const want = this._mkOf(e);
    while (e.dr.length < want) e.dr.push(this._drone());
    // überzählige Drohnen landen sofort; ihre Ladung geht in den Puffer (nichts geht verloren)
    while (e.dr.length > want) { const d = e.dr.pop(); e.q.push(...d.load); }
  }
  _unlink(e) {
    for (const d of e.dr) { if (d.load.length) e.q.push(...d.load); d.load = []; d.s = 0; d.p = 0; d.op = 0; d.w = 0; }
    e.link = 0;
  }
  link(a, b) {
    const A = this.N.get(a); if (!A || A.e.type !== 'drohnenhafen') return false;
    const B = b ? this.N.get(b) : null;
    if (b && (!B || B.e.type !== 'drohnenhafen' || B === A)) return false;
    const to = B ? B.id : 0; if (A.e.link === to) return true;
    this._undoPush([{ op: 'link', id: A.id, prev: A.e.link }]);
    this._unlink(A.e); A.e.link = to;
    this._emit('link', { a: A.id, b: to });
    return true;
  }
  _droneWork(n) {
    const e = n.e, tk = this.S.tick, tg = e.link ? this.N.get(e.link) : null;
    if (e.link && !tg) this._unlink(e);
    let v = 0;
    if (tg) { const dist = Math.max(1, Math.hypot(tg.e.x + tg.w / 2 - e.x - n.w / 2, tg.e.y + tg.h / 2 - e.y - n.h / 2)); v = DRONE.speed * DT * n.pw / dist; }
    const cap = tg ? BUILDINGS.drohnenhafen.cap * this._buf(tg.e) : 0;
    let busy = false;
    for (const d of e.dr) {
      d.op = d.p; d.mt = tk;
      switch (d.s) {
        case 0:
          if (!tg || v <= 0 || !e.q.length) { d.w = 0; break; }
          d.w += DT;
          if (e.q.length >= DRONE.load || d.w >= DRONE.wait) { d.load = e.q.splice(0, DRONE.load); d.s = 1; d.w = 0; this._emit('drone', { kind: 'launch', id: e.id, to: tg.id, n: d.load.length }); }
          break;
        case 1: busy = true; d.p = Math.min(1, d.p + v); if (d.p >= 1) d.s = 3; break;
        case 3: busy = true;
          while (d.load.length && tg.e.out.length < cap) tg.e.out.push(d.load.shift());
          if (!d.load.length) { d.s = 2; this._emit('drone', { kind: 'deliver', id: e.id, to: tg.id }); }
          break;
        case 2: busy = true; d.p = Math.max(0, d.p - v); if (d.p <= 0) { d.s = 0; d.w = 0; if (d.load.length) e.q.push(...d.load.splice(0)); } break;
      }
    }
    if (busy) n.uc++;
  }
  // Drohnen für die Grafik: cb(wx, wz, höhe, itemId|null, gold, key), zwischen zwei Ticks interpoliert
  forEachDrone(alpha, cb) {
    const tk = this.S.tick;
    for (const n of this.mn) {
      if (n.kind !== 'drone') continue;
      const e = n.e, tg = e.link ? this.N.get(e.link) : null;
      const ax = e.x + n.w / 2, az = e.y + n.h / 2, bx = tg ? tg.e.x + tg.w / 2 : ax, bz = tg ? tg.e.y + tg.h / 2 : az;
      for (let i = 0; i < e.dr.length; i++) {
        const d = e.dr[i], p = d.mt === tk && alpha < 1 ? d.op + (d.p - d.op) * alpha : d.p;
        const h = d.s === 0 ? 0.35 + 0.25 * i : 0.8 + 1.6 * Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
        const q = d.load[0];
        cb(ax + (bx - ax) * p + (d.s === 0 ? (i - (e.dr.length - 1) / 2) * 0.4 : 0), az + (bz - az) * p, h, q != null ? ITEM_IDS[q >> 1] : null, q != null && !!(q & 1), e.id * 4 + i);
      }
    }
  }
  droneCount() { let c = 0; for (const n of this.mn) if (n.kind === 'drone') c += n.e.dr.length; return c; }

  // =====================================================================================
  // Weltwunder: nimmt nur Teile der aktuellen Stufe; Fortschritt S.wonder bleibt über Prestige
  // =====================================================================================
  _wonderIn(n, id) {
    const S = this.S, W = S.wonder, st = WONDER[W.stage - 1];
    W.have[id] = (W.have[id] || 0) + 1; S.stats.wonderIn++; n.uc++;
    for (const k in st.need) if ((W.have[k] || 0) < st.need[k]) return;
    const stage = W.stage; W.stage++; W.have = {};
    this._mods();
    const fx = st.fx, ev = { stage, x: n.e.x + n.w / 2, z: n.e.y + n.h / 2, fx, key: 'event.wonder' };
    if (fx.title && !S.deco.titles.includes(fx.title)) S.deco.titles.push(fx.title);
    if (stage === WONDER.length) { ev.launch = true; ev.key = 'event.launch'; }
    this._emit('wonder', ev);
    for (let i = 0; i < (fx.crates || 0); i++) this._addCrate('wonder');
  }
  wonder() {
    const W = this.S.wonder, st = WONDER[W.stage - 1];
    return { stage: W.stage, done: !st, need: st ? { ...st.need } : {}, have: { ...W.have }, fx: st ? { ...st.fx } : null, stages: WONDER.length,
      unlocked: this.isUnlocked('wunder'), built: (this.count.wunder || 0) > 0 };
  }

  // =====================================================================================
  // Upgrades Mk II / Mk III
  // =====================================================================================
  canUpgrade(id) {
    const n = this.N.get(id); if (!n) return { ok: false, reason: 'unknown', cost: 0 };
    const e = n.e; if (!MKSET.has(e.type)) return { ok: false, reason: 'noupgrade', cost: 0 };
    const mk = this._mkOf(e); if (mk >= 3) return { ok: false, reason: 'maxmk', cost: 0, mk };
    const D = BUILDINGS[e.type], base = D.from ? this.costOf(D.from) * D.parts : this.costOf(e.type);   // Großbohrer: wie seine 4 Bohrer
    const next = mk + 1, cost = Math.round(base * MK.cost[next]), need = MK.research[next];
    if (!this.S.research.includes(need)) return { ok: false, reason: 'research', cost, mk: next, need };
    if (this.S.money < cost) return { ok: false, reason: 'money', cost, mk: next };
    return { ok: true, cost, mk: next, power: POWER.mk[next] };
  }
  upgrade(id) {
    const c = this.canUpgrade(id); if (!c.ok) return false;
    const n = this.N.get(id), e = n.e, prev = this._mkOf(e);
    this.S.money -= c.cost; e.paid += c.cost; e.mk = c.mk;
    this._fitDrones(e);
    const ops = [{ op: 'mk', id, prev, cost: c.cost }];
    this._hist('u', e);
    this._pdirty = true;
    this._emit('upgrade', { id, b: e.type, mk: e.mk, cost: c.cost, x: e.x + n.w / 2, z: e.y + n.h / 2 });
    if (MERGE_FROM[e.type]) this._tryMerge(n, ops);                // vier gleich ausgebaute Bohrer verschmelzen
    this._undoPush(ops);
    return true;
  }

  // =====================================================================================
  // Engpässe: Zustand, Auslastung (30 s), fehlende Zutaten, Strom → i18n-Schlüssel diag.*
  // =====================================================================================
  _util(n) { if (!n.ub || !n.un) return 0; let s = 0; for (let i = 0; i < UTIL_SECS; i++) s += n.ub[i]; return Math.min(1, s / (n.un * TPS)); }
  diagnose(id) {
    this._ensurePower();
    const n = this.N.get(id); if (!n) return null;
    const e = n.e, o = { id, state: 'ok', util: this._util(n), missing: [], blocked: false, power: n.use > 0 ? n.pw : 1, key: 'diag.ok', vars: {}, sev: 0 };
    const set = (state, key, sev, vars = {}) => { o.state = state; o.key = key; o.sev = sev; o.vars = vars; };
    o.vars = { pct: Math.round(o.util * 100) };
    if (BELTLIKE[n.kind]) {
      if (e.id === this._blockId) set('gerald', 'diag.gerald', 1);
      else if (n.kind === 'belt' && this._deadEnd(n) && e.items.length >= 4) { set('deadend', 'diag.deadend', 1); o.blocked = true; }
      else if (n.frozen) set('frozen', 'diag.frozen', 0.5);
      return o;
    }
    const outFull = cap => e.out && e.out.length >= cap;
    const noExit = OUTKIND[n.kind] && !n.tgt;
    if (n.use > 0 && n.pw <= 0) { set('nopower', n.net < 0 ? 'diag.nopower' : 'diag.nosupply', 3); return o; }
    switch (n.kind) {
      case 'drill':
        if (n.res < 0) { set('nodeposit', 'diag.nodeposit', 3); break; }
        if (outFull(this._dcap(n))) { o.blocked = true; set('blocked', noExit ? 'diag.noexit' : 'diag.blocked', 2.5); }
        break;
      case 'machine': {
        const r = e.recipe ? RT[e.recipe] : null;
        if (!r) { set('norecipe', 'diag.norecipe', 2); break; }
        if (e.out.length + r.n > r.ocap * this._buf(e)) { o.blocked = true; set('blocked', noExit ? 'diag.noexit' : 'diag.blocked', 2.5); break; }
        if (!e.craft) { for (let i = 0; i < r.ins.length; i++) if ((e.inN[i] || 0) < r.need[i]) o.missing.push(ITEM_IDS[r.ins[i]]);
          if (o.missing.length) set('missing', 'diag.missing', 2, { item: o.missing[0], n: o.missing.length, pct: o.vars.pct }); }
        break;
      }
      case 'exp': if (outFull(4 * this._buf(e))) { o.blocked = true; set('blocked', noExit ? 'diag.noexit' : 'diag.blocked', 2.5); } else if (!e.craft && (e.a < 0 || e.b < 0)) set('starved', 'diag.starved', 1, o.vars); break;
      case 'lab': if (!e.q.length) set('starved', 'diag.starved', 1, o.vars); break;
      case 'store': if (e.q.length >= BUILDINGS.lager.cap * this._buf(e)) { o.blocked = true; set('blocked', noExit ? 'diag.noexit' : 'diag.blocked', 2); } break;
      case 'sell': if (e.age > TAKT_GAP) set('idle', 'diag.idle', 0.5); else if (this.takt(e) < this.M.taktMax - 1e-9 && o.util < 0.9) set('gaps', 'diag.gaps', 0.5, o.vars); break;
      case 'power': if (!e.q.length && e.burn <= 0) set('nofuel', 'diag.nofuel', 3); break;
      case 'drone':
        if (!e.link && !this.mn.some(m => m.kind === 'drone' && m.e.link === e.id)) set('nolink', 'diag.nolink', 2);
        else if (e.out.length >= BUILDINGS.drohnenhafen.cap * this._buf(e)) { o.blocked = true; set('blocked', noExit ? 'diag.noexit' : 'diag.blocked', 2.5); }
        break;
      case 'wonder': { const w = this.wonder(); set(w.done ? 'done' : 'wonder', w.done ? 'diag.wonderDone' : 'diag.wonder', 0, { stage: w.stage }); break; }
      case 'mast': case 'solar': if (n.net >= 0 && this.nets[n.net].demand > this.nets[n.net].supply) set('lowpower', 'diag.lowpower', 1.5, { pct: Math.round(100 * this.nets[n.net].supply / this.nets[n.net].demand) }); break;
    }
    if (o.state === 'ok' && n.use > 0 && n.pw < 1) set('lowpower', 'diag.lowpower', 1.5, { pct: Math.round(n.pw * 100) });
    if (o.state === 'ok' && o.util < 0.25 && n.un >= 10 && (n.kind === 'machine' || n.kind === 'drill')) set('slow', 'diag.slow', 0.8, o.vars);
    return o;
  }
  bottlenecks(n = 5) {
    const out = [];
    for (const m of this.mn) { const d = this.diagnose(m.id); if (d.sev > 0.6) out.push({ id: m.id, key: d.key, vars: d.vars, sev: d.sev, state: d.state }); }
    out.sort((a, b) => b.sev - a.sev || a.id - b.id);
    return out.slice(0, n);
  }

  // =====================================================================================
  // Für Zusatzsysteme (js/meta.js): vorübergehende Vorkommen, Kisten, freie Felder
  // =====================================================================================
  addDeposit(x, y, item, secs, rich = false) {
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= MAP || y >= MAP || !RAW.includes(item) || !(secs > 0)) return false;
    const S = this.S, old = S.xdep.find(d => d.x === x && d.y === y);
    if (old) { old.item = item; old.left = Math.ceil(secs); old.rich = !!rich; this._applyXdep(old); }
    else { const d = { x, y, item, left: Math.ceil(secs), rich: !!rich }; S.xdep.push(d); this._applyXdep(d); }
    this._refitDrills([{ x, y }]);
    this._emit('deposit', { x, y, item, on: true, secs: Math.ceil(secs) });
    return true;
  }
  addCrate(src = 'meta') { this._addCrate(String(src)); return this.S.crates.length - 1; }
  // freie Quadrate size×size auf eigenem Land, nächste zuerst (near = [x, y], sonst Mitte des Startgrundstücks)
  freeCells(n = 1, near = null, size = 1) {
    const [nx, ny] = Array.isArray(near) ? near : [START_PLOT * PLOT + 8, START_PLOT * PLOT + 8], out = [];
    for (const p of this.S.plots) {
      const cx = (p % PLOTS) * PLOT, cy = ((p / PLOTS) | 0) * PLOT;
      for (let y = cy; y < cy + PLOT; y++) for (let x = cx; x < cx + PLOT; x++) {
        let ok = true;
        for (let j = 0; j < size && ok; j++) for (let i = 0; i < size; i++) if (!this.isOpen(x + i, y + j) || this.grid[(y + j) * MAP + x + i]) { ok = false; break; }
        if (ok) out.push([x, y, Math.abs(x - nx) + Math.abs(y - ny)]);
      }
    }
    out.sort((a, b) => a[2] - b[2] || a[1] - b[1] || a[0] - b[0]);
    return out.slice(0, Math.max(0, n | 0)).map(([x, y]) => [x, y]);
  }

  // =====================================================================================
  // Blaupausen: Ausschnitt aufnehmen, prüfen, einfügen (eine Undo-Aktion)
  // =====================================================================================
  capture(x0, y0, x1, y1) {
    const ax = Math.max(0, Math.min(x0, x1) | 0), ay = Math.max(0, Math.min(y0, y1) | 0), bx = Math.min(MAP - 1, Math.max(x0, x1) | 0), by = Math.min(MAP - 1, Math.max(y0, y1) | 0);
    const ents = [];
    for (const e of this.S.ents) {
      const d = BUILDINGS[e.type];
      if (e.type === 'verkauf' || e.type === 'wunder' || e.x < ax || e.y < ay || e.x + d.w - 1 > bx || e.y + d.h - 1 > by) continue;
      if (d.from) { const s = BUILDINGS[d.from].w; for (const [i, j] of [[0, 0], [s, 0], [0, s], [s, s]]) ents.push({ type: d.from, dx: e.x - ax + i, dy: e.y - ay + j, rot: e.rot, recipe: null, filter: null, mk: e.mk || 1 }); continue; }   // verschmilzt beim Einfügen wieder
      ents.push({ type: e.type, dx: e.x - ax, dy: e.y - ay, rot: e.rot, recipe: d.kind === 'machine' && !e.auto ? e.recipe : null, filter: e.type === 'sortierer' ? e.filter ?? null : null, mk: e.mk || 1 });
    }
    ents.sort((a, b) => a.dy - b.dy || a.dx - b.dx);
    return { w: bx - ax + 1, h: by - ay + 1, ents };
  }
  canPaste(bp, x, y) {
    const res = { ok: false, cost: 0, blocked: [], locked: [] };
    if (!bp || !Array.isArray(bp.ents) || !Number.isInteger(x) || !Number.isInteger(y)) return res;
    const cnt = {}, locked = new Set(), seen = new Set();
    for (const q of bp.ents) {
      const d = BUILDINGS[q.type]; if (!d || q.type === 'verkauf' || q.type === 'wunder' || d.from) continue;
      const ex = x + q.dx, ey = y + q.dy;
      if (!this.isUnlocked(q.type)) locked.add(q.type);
      for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) {
        const cx = ex + i, cy = ey + j, k = cy * MAP + cx;
        if (!this.isOpen(cx, cy) || this.grid[k] || seen.has(k)) res.blocked.push([cx, cy]); else seen.add(k);
      }
      if (d.kind === 'drill' && !this._drillInfo(ex, ey, d.w)) for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) res.blocked.push([ex + i, ey + j]);
      const c = Math.round(d.cost * Math.pow(d.scale, this._cnt(q.type) + (cnt[q.type] || 0))); cnt[q.type] = (cnt[q.type] || 0) + 1;
      res.cost += c;
      for (let m = 2; m <= Math.min(3, q.mk | 0); m++) if (this.S.research.includes(MK.research[m])) res.cost += Math.round(c * MK.cost[m]);
    }
    res.locked = [...locked];
    res.ok = !res.blocked.length && !res.locked.length && this.S.money >= res.cost;
    if (!res.ok) res.reason = res.locked.length ? 'research' : res.blocked.length ? 'blocked' : 'money';
    return res;
  }
  paste(bp, x, y) {
    const c = this.canPaste(bp, x, y); if (!c.ok) return 0;
    let n = 0; const group = [], drills = [];
    this._batch = true; const saved = this._undoPush; this._undoPush = ops => group.push(...ops);
    try {
      for (const q of bp.ents) {
        if (q.type === 'verkauf' || q.type === 'wunder' || !BUILDINGS[q.type] || BUILDINGS[q.type].from) continue;
        const id = this.place(q.type, x + q.dx, y + q.dy, q.rot); if (id == null) continue;
        n++; const e = this.N.get(id).e, d = BUILDINGS[q.type], base = e.paid;
        if (d.kind === 'machine' && q.recipe && RECIPES[q.recipe]?.building === q.type && this.recipeAvailable(q.recipe)) this._applyRecipe(e, q.recipe, false);
        if (q.type === 'sortierer' && (q.filter === 'gold' || has(IDX, q.filter))) e.filter = q.filter;
        for (let m = 2; m <= Math.min(3, q.mk | 0); m++) {
          if (!this.S.research.includes(MK.research[m])) break;
          const uc = Math.round(base * MK.cost[m]); this.S.money -= uc; e.paid += uc; e.mk = m; this._fitDrones(e); this._hist('u', e);
        }
        if (MERGE_FROM[q.type]) drills.push(id);
      }
      for (const id of drills) if (this.N.has(id)) this._tryMerge(this.N.get(id), group);
    } finally { this._batch = false; this._undoPush = saved; }
    if (group.length) this._undoPush(group);
    this._topo();
    this._emit('paste', { n, x, y, w: bp.w, h: bp.h });
    return n;
  }

  // =====================================================================================
  // Gerald der Praktikant
  // =====================================================================================
  _gerald() {
    const G = this.S.ger;
    if (!G.on) {
      G.wait -= DT; if (G.wait > 0) return;
      this._geraldSpawn(); return;
    }
    G.t += DT;
    const a = G.dur > 0 ? Math.min(1, G.t / G.dur) : 1;
    G.x = G.x0 + (G.x1 - G.x0) * a; G.z = G.z0 + (G.z1 - G.z0) * a;
    if (G.ph === 'sit') { if (G.t >= GERALD_SIT) this._geraldLeave(); return; }
    if (a < 1) return;
    if (G.ph === 'walk' && G.belt && this.N.get(G.belt)) {
      G.ph = 'sit'; G.t = 0; G.dur = 0; G.x0 = G.x1; G.z0 = G.z1; this._blockId = G.belt;
      this._emit('gerald', { kind: 'sit', belt: G.belt, x: G.x, z: G.z, line: 'belt' });
    } else this._geraldOff('leave');
  }
  _openBounds() {
    let x0 = MAP, y0 = MAP, x1 = 0, y1 = 0;
    for (const p of this.S.plots) { const cx = p % PLOTS, cy = (p / PLOTS) | 0; x0 = Math.min(x0, cx * PLOT); y0 = Math.min(y0, cy * PLOT); x1 = Math.max(x1, cx * PLOT + PLOT); y1 = Math.max(y1, cy * PLOT + PLOT); }
    return { x0, y0, x1, y1 };
  }
  _geraldSpawn() {
    const G = this.S.ger, b = this._openBounds();
    const horiz = this.rand() < 0.5, f1 = this.rand(), f2 = this.rand();
    let sx, sz, ex, ez;
    if (horiz) { sx = b.x0 + 0.5; ex = b.x1 - 0.5; sz = b.y0 + 1 + f1 * (b.y1 - b.y0 - 2); ez = b.y0 + 1 + f2 * (b.y1 - b.y0 - 2); }
    else { sz = b.y0 + 0.5; ez = b.y1 - 0.5; sx = b.x0 + 1 + f1 * (b.x1 - b.x0 - 2); ex = b.x0 + 1 + f2 * (b.x1 - b.x0 - 2); }
    if (this.rand() < 0.5) { [sx, ex] = [ex, sx]; [sz, ez] = [ez, sz]; }
    G.on = 1; G.t = 0; G.ph = 'walk'; G.belt = 0; G.x0 = sx; G.z0 = sz; G.ex = ex; G.ez = ez; G.x = sx; G.z = sz;
    G.line = GERALD_LINES[Math.floor(this.rand() * GERALD_LINES.length)];
    const belts = this.bn.filter(n => n.kind === 'belt');
    if (belts.length && this.rand() < 0.25) {
      const n = belts[Math.floor(this.rand() * belts.length)]; G.belt = n.id; G.x1 = n.e.x + 0.5; G.z1 = n.e.y + 0.5;
    } else { G.x1 = ex; G.z1 = ez; }
    G.dur = Math.hypot(G.x1 - G.x0, G.z1 - G.z0) / GERALD_SPEED;
    this._emit('gerald', { kind: 'appear', x: sx, z: sz, line: G.line });
  }
  _geraldLeave() {
    const G = this.S.ger; if (!G.on) return;
    if (G.ph === 'leave') return;
    G.ph = 'leave'; G.t = 0; G.belt = 0; this._blockId = 0;
    G.x0 = G.x; G.z0 = G.z; G.x1 = G.ex; G.z1 = G.ez; G.dur = Math.hypot(G.x1 - G.x0, G.z1 - G.z0) / GERALD_SPEED;
  }
  _geraldOff(kind) {
    const G = this.S.ger; G.on = 0; G.ph = ''; G.belt = 0; this._blockId = 0;
    G.wait = (180 + this.rand() * 180) / this.M.gerald;
    this._emit('gerald', { kind, x: G.x, z: G.z });
  }
  gerald() { const G = this.S.ger; return G.on ? { x: G.x, z: G.z, phase: G.ph, belt: G.belt, line: G.line, sitLeft: G.ph === 'sit' ? GERALD_SIT - G.t : 0 } : null; }
  clickGerald() {
    const G = this.S.ger; if (!G.on) return false;
    this.S.total.gerald++;
    this._addCrate('gerald');
    this._geraldOff('click');
    return true;
  }

  // =====================================================================================
  // Kisten und Boosts
  // =====================================================================================
  _addCrate(src) { this.S.crates.push({ src }); this._emit('crate', { kind: 'new', src, i: this.S.crates.length - 1 }); }
  openCrate(i = 0) {
    const S = this.S; if (i < 0 || i >= S.crates.length) return null;
    const src = S.crates.splice(i, 1)[0].src; S.total.crates++;
    const luck = this.M.luck, w = CRATE_IDS.map(id => CRATES[id].w * (id === 'patent' ? 1 + luck : 1) * (id === 'farbe' && !this._freeColors().length ? 0 : 1));
    let x = this.rand() * w.reduce((a, b) => a + b, 0), kind = CRATE_IDS[0];
    for (let k = 0; k < w.length; k++) if ((x -= w[k]) < 0) { kind = CRATE_IDS[k]; break; }
    const res = { kind, src };
    switch (kind) {
      case 'geld': res.money = Math.round(Math.max(50, this.incomeRate() * 20) * (1 + 0.5 * luck)); S.money += res.money; S.stats.earned += res.money; S.total.earned += res.money; break;
      case 'turbo': S.boosts.turbo += CRATES.turbo.secs; res.secs = CRATES.turbo.secs; this._mods(); break;
      case 'gutschein': S.vouchers++; break;
      case 'farbe': { const f = this._freeColors(); res.color = f[Math.floor(this.rand() * f.length)]; S.deco.colors.push(res.color); break; }
      case 'goldregen': S.boosts.goldrain += CRATES.goldregen.n; res.n = CRATES.goldregen.n; break;
      case 'patent': S.points++; break;
    }
    this._emit('crate', { kind: 'open', content: res });
    return res;
  }
  _freeColors() { return COLOR_IDS.filter(c => !this.S.deco.colors.includes(c)); }
  setColor(id) { if (!this.S.deco.colors.includes(id)) return false; this.S.deco.color = id; return true; }
  setTitle(id) { if (id && !this.S.deco.titles.includes(id)) return false; this.S.deco.title = id || ''; return true; }

  // =====================================================================================
  // Forschung, Grundstücke, Tipps
  // =====================================================================================
  canResearch(id) {
    const r = RESEARCH[id], S = this.S; if (!r) return { ok: false, reason: 'unknown' };
    const v = S.vouchers > 0 ? 0.5 : 1;
    const cost = Math.round(r.cost * this.M.resCost * v), rp = Math.round(r.rp * this.M.resCost * v);
    const missing = r.req.filter(q => !S.research.includes(q));
    if (S.research.includes(id)) return { ok: false, reason: 'known', cost, rp, known: true };
    if (missing.length) return { ok: false, reason: 'locked', cost, rp, missing };
    if (S.money < cost) return { ok: false, reason: 'money', cost, rp };
    if (S.rp < rp) return { ok: false, reason: 'rp', cost, rp };
    return { ok: true, cost, rp, voucher: v < 1 };
  }
  researchList() { return RESEARCH_IDS.map(id => ({ id, ...this.canResearch(id), req: RESEARCH[id].req, fx: RESEARCH[id].fx })); }
  buyResearch(id) {
    const c = this.canResearch(id); if (!c.ok) return false;
    const S = this.S; S.money -= c.cost; S.rp -= c.rp; if (c.voucher) S.vouchers--;
    S.research.push(id); this._mods();
    this._emit('research', { id, fx: RESEARCH[id].fx, cost: c.cost, rp: c.rp });
    return true;
  }
  plotCost() { return Math.round(1000 * Math.pow(2.5, this.S.plots.length - 1) * this.M.plot); }
  canBuyPlot(cx, cy) {
    const st = this.plotState(cx, cy), cost = this.plotCost();
    if (st === 'open') return { ok: false, reason: 'known', cost };
    if (st === 'locked') return { ok: false, reason: 'locked', cost };
    if (this.S.money < cost) return { ok: false, reason: 'money', cost };
    return { ok: true, cost, ruin: !!this.ruin[cy * PLOTS + cx] };
  }
  buyPlot(cx, cy) {
    const c = this.canBuyPlot(cx, cy); if (!c.ok) return false;
    const S = this.S, p = cy * PLOTS + cx; S.money -= c.cost; S.plots.push(p); this.plotOpen[p] = 1;
    const found = {};
    for (let y = cy * PLOT; y < cy * PLOT + PLOT; y++) for (let x = cx * PLOT; x < cx * PLOT + PLOT; x++) { const d = this.dep[y * MAP + x]; if (d) found[ITEM_IDS[d - 1]] = (found[ITEM_IDS[d - 1]] || 0) + 1; }
    const ruin = !!this.ruin[p];
    this._emit('plot', { cx, cy, ruin, found });
    if (ruin) this._addCrate('ruin');
    return { found, ruin };
  }
  tipCost() { return Math.round(1000 * Math.pow(2.5, this.S.book.tips.length)); }
  canTip() {
    const S = this.S, left = HIDDEN_RECIPES.filter(r => !S.book.found.includes(r) && !S.book.tips.includes(r));
    if (!left.length) return { ok: false, reason: 'known', cost: this.tipCost() };
    if (S.money < this.tipCost()) return { ok: false, reason: 'money', cost: this.tipCost() };
    return { ok: true, cost: this.tipCost() };
  }
  buyTip() {
    const c = this.canTip(); if (!c.ok) return null;
    const S = this.S, left = HIDDEN_RECIPES.filter(r => !S.book.found.includes(r) && !S.book.tips.includes(r));
    const made = id => (S.total.made[id] || 0) > 0;
    const rid = left.find(r => RECIPES[r].in.every(([it]) => made(it))) || left[0];
    S.money -= c.cost; S.book.tips.push(rid);
    const res = { recipe: rid, ins: RECIPES[rid].in.map(([it]) => it), out: RECIPES[rid].out };
    this._emit('tip', { ...res, key: 'steve.tip', line: STEVE_LINES[Math.floor(this.rand() * STEVE_LINES.length)] });
    return res;
  }
  book() {
    const b = this.S.book;
    return { found: [...b.found], tips: [...b.tips], fails: [...b.fails], total: HIDDEN_RECIPES.length,
      entries: HIDDEN_RECIPES.map(id => ({ id, found: b.found.includes(id), tip: b.tips.includes(id), out: RECIPES[id].out, ins: b.found.includes(id) || b.tips.includes(id) ? RECIPES[id].in.map(([it]) => it) : null })) };
  }

  // =====================================================================================
  // Aufträge
  // =====================================================================================
  _candidates() {
    const sb = this.S.stats.soldBy, list = Object.keys(sb).filter(k => sb[k] > 0 && k !== 'schrott' && has(ITEMS, k));
    return list.length ? list.sort((a, b) => ITEMS[b].value - ITEMS[a].value || (a < b ? -1 : 1)) : ['stein', 'eisenerz'];
  }
  _newContract(delay = 0) {
    const S = this.S, list = this._candidates(), used = S.contracts.map(c => c && c.item);
    let pool = list.filter(i => !used.includes(i)); if (!pool.length) pool = list;
    const item = pool[Math.floor(Math.pow(this.rand(), 1.6) * pool.length)];
    const secs = Math.round((CONTRACT.minSecs + this.rand() * (CONTRACT.maxSecs - CONTRACT.minSecs)) / 30) * 30;
    const rate = S.stats.rate[item] || 0;
    const n = Math.max(CONTRACT.minN, Math.round(rate * secs * (0.5 + this.rand() * 0.3) / 5) * 5);
    const reward = Math.round(Math.max(CONTRACT.minReward, n * ITEMS[item].value * CONTRACT.rewardMul));
    return { item, n, have: 0, secs, left: secs, reward, done: false, delay, key: 'contract.deliver' };
  }
  _cInfo(c) { return { item: c.item, n: c.n, secs: c.secs, reward: c.reward, key: c.key, delay: c.delay || 0 }; }
  claimContract(i) {
    const S = this.S;
    if (i === 'daily' || i === 3) {
      const d = S.daily; if (!d || !d.done || d.claimed) return null;
      return this._claimDaily(false);
    }
    const c = S.contracts[i]; if (!c || !c.done) return null;
    S.money += c.reward; S.stats.earned += c.reward; S.total.earned += c.reward; S.total.contracts++;
    this._addCrate('contract');
    this._emit('contract', { kind: 'claimed', i, ...this._cInfo(c) });
    S.contracts[i] = this._newContract(CONTRACT.delay);
    return { money: c.reward, crates: 1 };
  }
  _claimDaily(auto) {
    const S = this.S, d = S.daily;
    d.claimed = true; S.money += d.reward; S.stats.earned += d.reward; S.total.earned += d.reward; S.total.daily++; S.total.contracts++;
    this._addCrate('daily'); this._addCrate('daily');
    this._emit('contract', { kind: 'claimed', i: 'daily', daily: true, auto, ...this._cInfo(d) });
    return { money: d.reward, crates: 2 };
  }
  setToday(date) {
    const S = this.S; date = String(date);
    if (S.daily && S.daily.date === date) return S.daily;
    // erledigt, aber nicht abgeholt: Belohnung beim Tageswechsel automatisch gutschreiben (Ereignis 'claimed' mit auto)
    if (S.daily && S.daily.done && !S.daily.claimed) this._claimDaily(true);
    const list = this._candidates(), h = hashStr(date + ':' + S.seed);
    const item = list[h % Math.min(list.length, 4)];
    const rate = S.stats.rate[item] || 0;
    const n = Math.max(30, Math.round(rate * 900 / 10) * 10);
    S.daily = { date, item, n, have: 0, done: false, claimed: false, reward: Math.round(Math.max(200, n * ITEMS[item].value * CONTRACT.dailyMul)), key: 'contract.daily' };
    this._emit('contract', { kind: 'new', i: 'daily', daily: true, ...this._cInfo(S.daily) });
    // Weltwunder Stufe 4: eine Kiste je Kalendertag
    const dc = this._sum('dailyCrate');
    if (dc > 0 && S.wonder.day !== date) { S.wonder.day = date; for (let i = 0; i < dc; i++) this._addCrate('wonder'); }
    return S.daily;
  }

  // =====================================================================================
  // Einnahmen, Offline
  // =====================================================================================
  incomeRate() {
    const st = this.S.stats, k = Math.min(30, st.nb); let sum = st.acc;
    for (let i = 1; i <= k; i++) sum += st.ring[(st.ri - i + st.ring.length) % st.ring.length];
    const secs = k * 10 + (this.S.tick % 200) * DT;
    return secs > 0 ? sum / secs : 0;
  }
  incomeHistory(minutes = 30) {
    const st = this.S.stats, out = [];
    for (let m = minutes - 1; m >= 0; m--) {
      let s = 0; for (let j = 0; j < 6; j++) { const back = m * 6 + j + 1; if (back <= st.nb && back <= st.ring.length) s += st.ring[(st.ri - back + st.ring.length * 2) % st.ring.length]; }
      out.push(s);
    }
    return out;
  }
  production() { const st = this.S.stats; return { sold: { ...st.rate }, made: { ...st.mrate } }; }
  offline(seconds) {
    const secs = this.S.chal ? 0 : Math.max(0, Math.min(Number(seconds) || 0, this.M.offlineCap));
    const money = Math.round(this.incomeRate() * secs * this.M.offline);
    const S = this.S; S.money += money; S.stats.earned += money; S.total.earned += money;
    if (money > 0) this._emit('offline', { money, seconds: secs, key: 'offline.welcome' });
    return { money, seconds: secs };
  }

  // =====================================================================================
  // Prestige und Patente
  // =====================================================================================
  prestigePoints() { return Math.floor(Math.sqrt(this.S.stats.earned / 1e5)); }
  canPrestige() { return !this.S.chal && this.S.stats.earned >= PRESTIGE_AT; }
  biomes() { return ['wiese', ...this.S.patents.map(p => PATENTS[p].fx.biome).filter(Boolean)]; }
  prestige(biome = 'wiese') {
    if (!this.canPrestige()) return 0;
    const S = this.S, pts = this.prestigePoints();
    if (!this.biomes().includes(biome)) biome = 'wiese';
    const keep = { patents: S.patents, points: S.points + pts, book: S.book, ach: S.ach, deco: S.deco, bonusStart: S.bonusStart,
      total: { ...S.total, prestiges: S.total.prestiges + 1 }, crates: S.crates, vouchers: S.vouchers, tut: S.tut,
      // erledigter Tagesauftrag bleibt (abgeholt: kein zweites Mal; offen: nach dem Neustart abholbar), unerledigter wird neu ausgelost
      daily: S.daily && S.daily.done ? S.daily : null, meta: S.meta, wonder: S.wonder };
    const seed = (Math.floor(this.rand() * 0x7fffffff) + 1) >>> 0;
    this.S = this._freshState(seed, biome, keep);
    this.undoStack = [];
    this._rebuild(); this._startFactory();
    for (const h of this.hooks.prestige) h(this);
    this._emit('prestige', { points: pts, biome });
    this._checkAch();
    return pts;
  }
  canPatent(id) {
    const p = PATENTS[id], S = this.S; if (!p) return { ok: false, reason: 'unknown' };
    if (S.patents.includes(id)) return { ok: false, reason: 'known', cost: p.cost };
    const missing = p.req.filter(q => !S.patents.includes(q)); if (missing.length) return { ok: false, reason: 'locked', cost: p.cost, missing };
    if (S.points < p.cost) return { ok: false, reason: 'points', cost: p.cost };
    return { ok: true, cost: p.cost };
  }
  patentList() { return PATENT_IDS.map(id => ({ id, ...this.canPatent(id), req: PATENTS[id].req, fx: PATENTS[id].fx })); }
  buyPatent(id) {
    const c = this.canPatent(id); if (!c.ok) return false;
    this.S.points -= c.cost; this.S.patents.push(id); this._mods();
    this._emit('patent', { id, fx: PATENTS[id].fx });
    return true;
  }

  // =====================================================================================
  // Erfolge, Kennzahlen, Anleitung
  // =====================================================================================
  metric(m) {
    const S = this.S;
    if (m.startsWith('made_')) return S.total.made[m.slice(5)] || 0;
    switch (m) {
      case 'sold': return S.total.sold;
      case 'earned': return S.stats.earned;
      case 'gold': return S.total.gold;
      case 'found': return S.book.found.length;
      case 'fails': return S.total.scrap;
      case 'contracts': return S.total.contracts;
      case 'daily': return S.total.daily;
      case 'plots': return S.plots.length;
      case 'maxLevel': { let m2 = 0; for (const e of S.ents) if (e.lvl > m2 && e.type !== 'band') m2 = e.lvl; return m2; }
      case 'belts': return this.count.band || 0;
      case 'drills': return this._cnt('bohrer');
      case 'machines': return this.mn.filter(n => n.kind !== 'sell' && n.kind !== 'mast' && n.kind !== 'heater').length;
      case 'taktMax': return S.total.taktMax;
      case 'gerald': return S.total.gerald;
      case 'research': return S.research.length;
      case 'prestiges': return S.total.prestiges;
      case 'crates': return S.total.crates;
    }
    return 0;
  }
  _checkAch() {
    const S = this.S;
    for (const id of ACHIEVEMENT_IDS) {
      if (S.ach.includes(id)) continue;
      const a = ACHIEVEMENTS[id]; if (this.metric(a.cond.m) < a.cond.n) continue;
      S.ach.push(id); const r = a.reward;
      if (r.money) { S.money += r.money; }
      if (r.color && !S.deco.colors.includes(r.color)) S.deco.colors.push(r.color);
      if (r.title && !S.deco.titles.includes(r.title)) S.deco.titles.push(r.title);
      if (r.start) S.bonusStart += r.start;
      this._emit('achievement', { id, reward: r });
      if (r.crate) this._addCrate('achievement');
    }
  }
  _checkTut() {
    const S = this.S;
    while (S.tut < TUTORIAL.length && this.metric(TUTORIAL[S.tut].done.m) >= TUTORIAL[S.tut].done.n) { S.tut++; this._emit('tut', { step: S.tut, id: TUTORIAL[S.tut - 1].id }); }
  }
  help() {
    const S = this.S, step = TUTORIAL[S.tut];
    if (!step) return { step: S.tut, total: TUTORIAL.length, done: true, key: 'tut.done' };
    return { step: S.tut, total: TUTORIAL.length, done: false, id: step.id, key: 'tut.' + step.id, target: step.target };
  }

  // Test-/Sandkasten-Hilfe: ein Teil direkt in ein Gebäude geben (wie von einem Band aus Richtung dir)
  debugInsert(id, item, gold = false, dir = -1) {
    const n = this.N.get(id); if (!n || !has(IDX, item)) return false;
    const code = IDX[item] * 2 + (gold ? 1 : 0), d = dir >= 0 ? dir : n.e.rot;
    return this._push(n, code, d, 0, null, null);
  }

  // =====================================================================================
  // Speichern / Laden
  // =====================================================================================
  toJSON() {
    const S = this.S;
    const ents = S.ents.map(e => {
      const o = { ...e };
      if (e.items) o.items = e.items.map(q => [ITEM_IDS[q.t] + (q.g ? '*' : ''), q.p, q.k, q.d]);
      if (e.out) o.out = e.out.map(codeStr);
      if (e.q) o.q = e.q.map(codeStr);
      if ('a' in e) { o.a = e.a >= 0 ? codeStr(e.a) : null; o.b = e.b >= 0 ? codeStr(e.b) : null; }
      if (e.dr) o.dr = e.dr.map(d => [d.s, d.p, d.w, d.load.map(codeStr)]);
      return o;
    });
    return clone({ ...S, v: SAVE_VERSION, ents });
  }
  // Laden ist robust gegen alte, fremde und kaputte Stände: jedes Feld wird auf Typ, Endlichkeit und bekannte Ids geprüft
  // (sonst Grundwert). Wirft nur bei völlig unbrauchbarem Input (kein JSON-Objekt) einen klaren Error.
  static load(json) {
    let src;
    try { src = typeof json === 'string' ? JSON.parse(json) : clone(json === undefined ? {} : json); } catch { throw new Error('cogtopia: save is not valid JSON'); }
    if (!isObj(src)) throw new Error('cogtopia: save is not an object');
    const biome = has(BIOMES, src.biome) ? src.biome : 'wiese';
    const f = new Factory({ seed: num(src.seed, 1), biome });
    const base = f.S, S = {};
    // Grundwerte für alles, was ein älterer Stand nicht kennt oder falsch typisiert hat
    for (const k in base) {
      const b = base[k], v = src[k];
      if (typeof b === 'number') S[k] = num(v, b);
      else if (typeof b === 'string') S[k] = typeof v === 'string' ? v : b;
      else if (Array.isArray(b)) S[k] = Array.isArray(v) ? v : b;
      else if (b === null) S[k] = isObj(v) ? v : null;
      else if (isObj(b)) S[k] = isObj(v) ? { ...b, ...v } : b;
      else S[k] = v === undefined ? b : v;
    }
    S.v = SAVE_VERSION; S.biome = biome; S.seed = base.seed; S.rs = S.rs >>> 0;
    for (const k of ['tick', 'eid', 'nid', 'points', 'vouchers']) S[k] = nint(S[k], base[k]);
    S.tut = Math.min(TUTORIAL.length, nint(S.tut, 0)); S.bonusStart = Math.max(0, S.bonusStart);
    // Statistik: nur bekannte Teile-Ids, nur endliche Zahlen
    const ss = isObj(src.stats) ? src.stats : {}, sb = base.stats;
    S.stats = { ...sb };
    for (const k in sb) if (typeof sb[k] === 'number') S.stats[k] = num(ss[k], sb[k]);
    for (const k of ['made', 'soldBy', 'rate', 'mrate', 'cs', 'cm']) S.stats[k] = itemMap(ss[k]);
    S.stats.ring = Array.isArray(ss.ring) && ss.ring.length === 180 ? ss.ring.map(x => num(x, 0)) : new Array(180).fill(0);
    S.stats.ri = nint(S.stats.ri, 0) % 180; S.stats.nb = nint(S.stats.nb, 0);
    const ts = isObj(src.total) ? src.total : {}, tb = base.total;
    S.total = { ...tb }; for (const k in tb) if (typeof tb[k] === 'number') S.total[k] = num(ts[k], tb[k]);
    S.total.made = itemMap(ts.made); S.total.goldMade = itemMap(ts.goldMade); S.total.perfect = itemMap(ts.perfect);
    // Ausbau 2: Strom-Schonfrist, Wunder, Verlauf, vorübergehende Vorkommen, Sturm, Herausforderung
    const ver = nint(src.v, 0);
    S.powerGrace = num(src.powerGrace, 0, 0, 1e12);
    const wd = isObj(src.wonder) ? src.wonder : {};
    const stage = Math.max(1, Math.min(WONDER.length + 1, nint(wd.stage, 1) || 1)), wneed = WONDER[stage - 1]?.need || {};
    const whave = {}; if (isObj(wd.have)) for (const k in wneed) if (Number.isFinite(wd.have[k]) && wd.have[k] > 0) whave[k] = Math.min(wneed[k] - 1, Math.floor(wd.have[k]));
    S.wonder = { stage, have: whave, day: typeof wd.day === 'string' ? wd.day : '' };
    S.hist = arr(src.hist).filter(h => Array.isArray(h) && h.length === 7 && Number.isFinite(h[0]) && ['b', 'r', 'u'].includes(h[1]) && has(BUILDINGS, h[2])
      && Number.isInteger(h[3]) && Number.isInteger(h[4]) && Number.isInteger(h[5]) && h[5] >= 0 && h[5] <= 3 && Number.isInteger(h[6]) && h[6] >= 1 && h[6] <= 3).slice(-HIST_MAX);
    const xs = new Set();
    S.xdep = arr(src.xdep).filter(d => isObj(d) && Number.isInteger(d.x) && Number.isInteger(d.y) && d.x >= 0 && d.y >= 0 && d.x < MAP && d.y < MAP && RAW.includes(d.item) && Number.isFinite(d.left) && d.left > 0
      && !xs.has(d.y * MAP + d.x) && xs.add(d.y * MAP + d.x)).map(d => ({ x: d.x, y: d.y, item: d.item, left: Math.ceil(Math.min(d.left, 1e7)), rich: d.rich === true }));
    const sm = isObj(src.storm) ? src.storm : {};
    S.storm = { next: Math.round(num(sm.next, 600, 0, 1e5)), left: Math.round(num(sm.left, 0, 0, WORLD.storm.secs)) };
    const ch = src.chal;
    S.chal = isObj(ch) && (typeof ch.week === 'string' || Number.isFinite(ch.week)) ? { ...ch, week: ch.week, left: num(ch.left, 0, 0) } : null;
    if (S.chal) for (const k in S.chal) if (k !== 'week' && k !== 'left' && !(typeof S.chal[k] === 'string' || Number.isFinite(S.chal[k]) || typeof S.chal[k] === 'boolean')) delete S.chal[k];
    const bs = isObj(src.boosts) ? src.boosts : {};
    S.boosts = { turbo: Math.max(0, num(bs.turbo, 0)), goldrain: nint(bs.goldrain, 0) };
    const gs = isObj(src.ger) ? src.ger : {};
    S.ger = { ...base.ger }; for (const k in base.ger) { const b = base.ger[k], v = gs[k]; S.ger[k] = typeof b === 'number' ? num(v, b) : typeof v === 'string' ? v : b; }
    if (!GERALD_LINES.includes(S.ger.line)) S.ger.line = '';
    if (!S.ger.on || !['walk', 'sit', 'leave'].includes(S.ger.ph)) { S.ger.on = 0; S.ger.ph = ''; S.ger.belt = 0; } else S.ger.on = 1;
    const bk = isObj(src.book) ? src.book : {};
    const hidden = r => has(RECIPES, r) && RECIPES[r].unlock === 'hidden';
    S.book = { found: uniq(arr(bk.found).filter(hidden)), tips: uniq(arr(bk.tips).filter(hidden)),
      fails: uniq(arr(bk.fails).filter(c => typeof c === 'string' && c.split('+').length === 2 && c.split('+').every(i => has(IDX, i)))) };
    const dc = isObj(src.deco) ? src.deco : {};
    S.deco = { ...base.deco, colors: uniq(arr(dc.colors).filter(c => has(COLORS, c))), color: has(COLORS, dc.color) ? dc.color : 'standard',
      titles: uniq(arr(dc.titles).filter(t => has(TITLES, t))), title: '' };
    if (!S.deco.colors.includes('standard')) S.deco.colors.unshift('standard');
    if (!S.deco.colors.includes(S.deco.color)) S.deco.color = 'standard';
    if (S.deco.titles.includes(dc.title)) S.deco.title = dc.title;
    S.research = uniq(S.research.filter(r => has(RESEARCH, r))); S.patents = uniq(S.patents.filter(p => has(PATENTS, p)));
    // Migration v1 → v2: Montage setzt jetzt Strom voraus; Strom-Verbraucher laufen eine Schonfrist lang ohne Netz
    if (ver < 2) { if (S.research.includes('montage') && !S.research.includes('strom')) S.research.push('strom'); S.powerGrace = POWER.grace; }
    if (BIOMES[biome].allPower && !S.research.includes('strom')) S.research.push('strom');
    S.ach = uniq(S.ach.filter(a => has(ACHIEVEMENTS, a)));
    S.plots = [...new Set(S.plots.filter(p => Number.isInteger(p) && p >= 0 && p < PLOTS * PLOTS))];
    if (!S.plots.includes(START_PLOT * PLOTS + START_PLOT)) S.plots.unshift(START_PLOT * PLOTS + START_PLOT);
    S.crates = S.crates.filter(isObj).map(c => ({ src: typeof c.src === 'string' ? c.src : 'old' }));
    S.contracts = S.contracts.filter(c => isObj(c) && has(ITEMS, c.item)).slice(0, CONTRACT.slots).map(c => {
      const secs = num(c.secs, 300, 1);
      return { item: c.item, n: Math.max(1, nint(c.n, 15)), have: nint(c.have, 0), secs, left: num(c.left, secs, 0, secs), reward: num(c.reward, 30, 0),
        done: c.done === true, delay: num(c.delay, 0, 0), key: typeof c.key === 'string' ? c.key : 'contract.deliver' };
    });
    const dy = S.daily;
    S.daily = isObj(dy) && has(ITEMS, dy.item) && typeof dy.date === 'string'
      ? { date: dy.date, item: dy.item, n: Math.max(1, nint(dy.n, 30)), have: nint(dy.have, 0), done: dy.done === true, claimed: dy.claimed === true,
        reward: num(dy.reward, 200, 0), key: typeof dy.key === 'string' ? dy.key : 'contract.daily' }
      : null;
    // Gebäude
    const rawEnts = Array.isArray(src.ents) ? src.ents : Array.isArray(src.entities) ? src.entities : null;
    f.S = S;
    if (rawEnts) {
      S.ents = [];
      f._mods(); f._genMap(); f.grid = new Int32Array(MAP * MAP);
      f.plotOpen = new Uint8Array(PLOTS * PLOTS); for (const p of S.plots) f.plotOpen[p] = 1;
      let maxId = 0; const used = new Set();
      for (const r of rawEnts) {
        const d = isObj(r) && has(BUILDINGS, r.type) ? BUILDINGS[r.type] : null; if (!d) continue;
        const x = r.x | 0, y = r.y | 0; if (x < 0 || y < 0 || x + d.w > MAP || y + d.h > MAP) continue;
        let free = true; for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) if (f.grid[(y + j) * MAP + x + i]) free = false;
        if (!free) continue;
        const id = Number.isInteger(r.id) && r.id > 0 && !used.has(r.id) ? r.id : 0; if (id) used.add(id);
        const e = f._newEnt(r.type, x, y, ((r.rot | 0) % 4 + 4) % 4, id || 0);
        e.paid = num(r.paid, 0, 0); e.xp = num(r.xp, 0, 0); e.lvl = Math.max(1, Math.min(5, r.lvl | 0 || 1));
        Factory._loadEnt(e, r, d);
        if (!e.id) e.id = -1;
        for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) f.grid[(y + j) * MAP + x + i] = 1;
        S.ents.push(e); if (e.id > maxId) maxId = e.id;
      }
      let next = Math.max(maxId, S.eid);
      for (const e of S.ents) if (e.id === -1) e.id = ++next;
      S.eid = next;
      // Tunnelpaare prüfen: Partner muss zurückverweisen, gleich gedreht, genau einer Ausgang, in Reichweite davor liegen
      const byId = new Map(S.ents.map(e => [e.id, e])), range = BUILDINGS.tunnel.range;
      for (const e of S.ents) if (e.type === 'drohnenhafen' && !(e.link && e.link !== e.id && byId.get(e.link)?.type === 'drohnenhafen')) { for (const d of e.dr) { e.q.push(...d.load); d.load = []; d.s = 0; d.p = 0; } e.link = 0; }
      // nur ein Wunder je Fabrik und erst nach dem ersten Prestige
      let wn = 0; S.ents = S.ents.filter(e => e.type !== 'wunder' || (S.total.prestiges >= 1 && ++wn === 1));
      for (const e of S.ents) {
        if (e.type !== 'tunnel') continue;
        const p = e.link ? byId.get(e.link) : null;
        let good = !!p && p.type === 'tunnel' && p.link === e.id && p.rot === e.rot && e.exit !== p.exit;
        if (good) { const a = e.exit ? p : e, b = e.exit ? e : p, k = (b.x - a.x) * DX[a.rot] + (b.y - a.y) * DY[a.rot]; good = k >= 1 && k <= range && a.x + DX[a.rot] * k === b.x && a.y + DY[a.rot] * k === b.y; }
        if (!good) { e.link = 0; e.exit = false; }
      }
    }
    let maxK = S.nid; for (const e of S.ents) if (e.items) for (const q of e.items) if (q.k > maxK) maxK = q.k; S.nid = maxK;
    f.undoStack = []; f.ev = [];
    f._rebuild(); f._mergeAll();                       // ältere Stände: 4 Bohrer im Quadrat werden zum Großbohrer
    // ungekoppelte Tunnel (z. B. aus älteren Ständen) neu koppeln
    let paired = false;
    for (const e of S.ents) if (e.type === 'tunnel' && !e.link) { f._pairTunnel(e); if (e.link) paired = true; }
    if (paired) f._topo();
    while (S.contracts.length < CONTRACT.slots) S.contracts.push(f._newContract());
    if (ver < 2) f._emit('power', { kind: 'grace', secs: S.powerGrace, key: 'event.power.grace' });
    return f;
  }
  static _loadEnt(e, r, d) {
    const codes = a => arr(a).map(strCode).filter(c => c >= 0);
    if (MKSET.has(e.type)) e.mk = Math.max(1, Math.min(3, r.mk | 0 || 1));
    const bm = MK.buf[e.mk || 1];
    switch (d.kind) {
      case 'belt': case 'tunnel': case 'split': case 'sort': {
        const items = arr(r.items).map(a => Array.isArray(a) ? { c: strCode(a[0]), p: num(a[1], 0, 0, 8), k: nint(a[2], 0), d: Number.isInteger(a[3]) && a[3] >= -1 && a[3] <= 3 ? a[3] : -1 } : null)
          .filter(a => a && a.c >= 0).sort((a, b) => b.p - a.p);
        e.items = items.slice(0, d.kind === 'tunnel' ? 4 * d.range : 4).map(a => ({ t: a.c >> 1, g: a.c & 1, p: a.p, k: a.k, d: a.d, op: a.p, oe: e.id, od: a.d, mt: -1 }));
        if (d.kind === 'tunnel') { e.link = nint(r.link, 0); e.exit = r.exit === true; }
        if (d.kind === 'split') e.rr = nint(r.rr, 0) % 3;
        if (d.kind === 'sort') e.filter = r.filter === 'gold' || has(ITEMS, r.filter) ? r.filter : null;
        break;
      }
      case 'drill': e.prog = num(r.prog, 0, 0, 1); e.out = codes(r.out).slice(0, d.w * d.h * bm); break;
      case 'machine': {
        const rid = has(RECIPES, r.recipe) && RECIPES[r.recipe].building === e.type ? r.recipe : null, rt = rid ? RT[rid] : null;
        e.recipe = rid; e.auto = r.auto !== false || !rid;
        const n = rt ? rt.ins.length : 0, inN = arr(r.inN), inG = arr(r.inG);
        e.inN = Array.from({ length: n }, (_, i) => Math.min(rt.cap[i] * bm, nint(inN[i], 0))); e.inG = Array.from({ length: n }, (_, i) => Math.min(e.inN[i], nint(inG[i], 0)));
        e.out = codes(r.out).slice(0, rt ? (rt.ocap + rt.n) * bm : 64 * bm); e.prog = num(r.prog, 0, 0, 1); e.craft = rid && r.craft ? 1 : 0; e.cg = r.cg ? 1 : 0;
        e.st0 = nint(r.st0, 0); e.st1 = nint(r.st1, 0); break;
      }
      case 'exp': { const a = strCode(r.a), b = strCode(r.b); e.a = a; e.b = a >= 0 ? b : -1; e.prog = num(r.prog, 0, 0, 1); e.craft = e.a >= 0 && e.b >= 0 && r.craft ? 1 : 0; e.out = codes(r.out).slice(0, 8 * bm); break; }
      case 'lab': e.q = codes(r.q).slice(0, 6 * bm); e.prog = num(r.prog, 0, 0, 1); break;
      case 'sell': e.streak = num(r.streak, 0, 0); e.age = num(r.age, 99, 0); e.sold = nint(r.sold, 0); e.full = r.full ? 1 : 0; break;
      case 'store': e.q = codes(r.q).slice(0, d.cap * 3); break;
      case 'power': e.q = codes(r.q).filter(c => d.fuel.includes(ITEM_IDS[c >> 1])).slice(0, d.cap); e.burn = num(r.burn, 0, 0, d.burn); break;
      case 'drone': {
        e.q = codes(r.q).slice(0, d.cap * 3 + 12); e.out = codes(r.out).slice(0, d.cap * 3 + 12); e.link = nint(r.link, 0);
        const mk = e.mk || 1;
        const ds = arr(r.dr).filter(Array.isArray).slice(0, mk).map(a => {
          const s = [0, 1, 2, 3].includes(a[0]) ? a[0] : 0, load = codes(a[3]).slice(0, DRONE.load);
          return { s: s === 0 && load.length ? 2 : s, p: num(a[1], 0, 0, 1), w: num(a[2], 0, 0, 60), load, op: 0, mt: -1 };
        });
        for (const x of ds) x.op = x.p;
        while (ds.length < mk) ds.push({ s: 0, p: 0, w: 0, load: [], op: 0, mt: -1 });
        e.dr = ds; break;
      }
    }
  }
}
