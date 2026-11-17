// Cogtopia – Zusatzsysteme (Ausbau 2, DOM-frei): Glücksrad + Serie, Ereignisse, Durchbrüche, Album, Ziele, Wochen-Herausforderung.
// Zustand nur in f.S.meta (wird mit dem Spielstand gespeichert und bleibt über Prestige), Zufall aus eigenem gesätem
// Generator in S.meta.rs (stört den Zufall der Sim nicht), Datum kommt immer von außen ('YYYY-MM-DD').
// Verbindung zur Sim nur über f.hooks.{tick,event,prestige}, f.X + f.refreshMods(), f._emit und öffentliche Methoden.
import { Factory, MAP, PLOT, TPS, DT, PRESTIGE_AT } from './sim.js';
import * as DATA from './data.js';
import { mix, STEP, hashStr } from './rng.js';

const { ITEMS, ITEM_IDS, BUILDINGS, BUILDING_IDS, RESEARCH, RESEARCH_IDS, ACHIEVEMENTS, ACHIEVEMENT_IDS, BIOMES, COLOR_IDS, TITLES, CONTRACT } = DATA;

export const META_V = 1;
const MIN = 60 * TPS;                                  // Ticks pro Minute
export const EVENT_GAP = [10 * MIN, 15 * MIN];         // Abstand zwischen zwei Ereignissen (Ticks)

// Glücksrad: 8 Segmente, Gewichte in Prozent
export const WHEEL = [
  { id: 'geld', w: 30 }, { id: 'geldgross', w: 8 }, { id: 'rp', w: 16 }, { id: 'kiste', w: 18 },
  { id: 'turbo', w: 10, secs: 120 }, { id: 'goldregen', w: 8, n: 20 }, { id: 'gutschein', w: 8 }, { id: 'jackpot', w: 2 },
];
// Serie: Belohnung je Tag 1–7, danach wieder Tag 1
export const STREAK = ['kiste', 'geld', 'kisten2', 'turbo', 'gutschein', 'kisten3', 'patent'];
// Ereignisse: Dauer (s) und Gewicht
export const EVENTS = {
  goldvein: { secs: 120, w: 25, gold: 0.05 },
  meteor:   { secs: 600, w: 15 },
  quake:    { secs: 900, w: 15, n: 3 },
  vip:      { secs: 300, w: 25, mul: 3, crates: 2 },
  boom:     { secs: 120, w: 20, mul: 3 },
};
export const EVENT_IDS = Object.keys(EVENTS);
export const BT_CHANCE = 0.12, BT_LUCK = 0.03;          // Durchbruch: 12 % + 3 % je Glückspunkt
export const BT_KINDS = ['refund', 'gutschein', 'kiste', 'rp'];
export const CARDS = ['normal', 'gold', 'perfect', 'mega'];
export const MEGA_N = 1000;
export const ALBUM_TITLE = 'sammler';
export const CHAL_SECS = 1800;
const CHAL_BIOMES = ['wiese', 'wueste', 'eis', 'mond'];

// Album: alle Teile außer Schrott, Seiten nach Stufe
export const ALBUM_ITEMS = ITEM_IDS.filter(i => ITEMS[i].tier > 0);
export const ALBUM_PAGES = [...new Set(ALBUM_ITEMS.map(i => ITEMS[i].tier))].sort((a, b) => a - b)
  .map(tier => ({ tier, items: ALBUM_ITEMS.filter(i => ITEMS[i].tier === tier) }));

// ---------- Datum (rein rechnerisch, nie die Uhr) ----------
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
export function dayNum(date) {
  const m = DATE_RE.exec(String(date)); if (!m) return NaN;
  const y = +m[1], mo = +m[2], d = +m[3]; if (mo < 1 || mo > 12 || d < 1 || d > 31) return NaN;
  const t = Date.UTC(y, mo - 1, d); const back = new Date(t);
  if (back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return NaN;   // 2026-02-30 u. Ä.
  return Math.round(t / 86400000);
}
// ISO-Kalenderwoche eines Datums → '2026-W47'
export function isoWeek(date) {
  const n = dayNum(date); if (!Number.isFinite(n)) return null;
  const d = new Date(n * 86400000), wd = (d.getUTCDay() + 6) % 7;           // Mo = 0
  const thu = new Date((n - wd + 3) * 86400000), y = thu.getUTCFullYear();
  const jan4 = Date.UTC(y, 0, 4), w1 = Math.round(jan4 / 86400000) - ((new Date(jan4).getUTCDay() + 6) % 7);
  const wk = 1 + Math.floor((n - wd - w1) / 7);
  return `${y}-W${String(wk).padStart(2, '0')}`;
}
const WEEK_RE = /^(\d{4})-W(\d{2})$/;

// ---------- Wochen-Herausforderung (ohne Fabrik nutzbar) ----------
export function challengeSpec(week) {
  const m = WEEK_RE.exec(String(week)); if (!m || +m[2] < 1 || +m[2] > 53) return null;
  const h = hashStr('cogtopia-week:' + week);
  return { week, seed: (h % 0x7fffffff) + 1, biome: CHAL_BIOMES[(h >>> 8) % CHAL_BIOMES.length], secs: CHAL_SECS, startMoney: 2000 + ((h >>> 16) % 5) * 500 };
}
const chk = (week, score) => (hashStr(`${week}|${score}|cogtopia`) % 1679616).toString(36).toUpperCase().padStart(4, '0');
export function resultCode(week, score) {
  if (!WEEK_RE.test(String(week))) return null;
  const s = Math.max(0, Math.floor(Number(score) || 0));
  return `COG-${week}-${s.toString(36).toUpperCase()}-${chk(week, s)}`;
}
export function parseResultCode(code) {
  const m = /^COG-(\d{4}-W\d{2})-([0-9A-Z]+)-([0-9A-Z]{4})$/.exec(String(code).trim().toUpperCase()); if (!m) return null;
  const score = parseInt(m[2], 36); if (!Number.isSafeInteger(score)) return null;
  return chk(m[1], score) === m[3] ? { week: m[1], score } : null;
}
// Neue Fabrik für die Herausforderung einer Woche (eigener Speicherplatz macht die Oberfläche)
export function startChallenge(week, FactoryClass = Factory) {
  const sp = challengeSpec(week); if (!sp) return null;
  const f = new FactoryClass({ seed: sp.seed, biome: sp.biome });
  f.S.money = sp.startMoney;
  const c = { week: sp.week, left: sp.secs, secs: sp.secs, lt: sp.secs * TPS, done: false, score: 0 };
  if ('chal' in f.S) f.S.chal = c; else f.S.meta.chal = c;
  return f;
}

// ---------- Hilfen ----------
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const fin = (v, d) => (Number.isFinite(v) ? v : d);
const nint = (v, d) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : d);
const str = (v, d = '') => (typeof v === 'string' ? v : d);
const has = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
const IDX = Object.fromEntries(ITEM_IDS.map((id, i) => [id, i]));
const clamp01 = v => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);
const r5 = v => Math.round(v / 5) * 5;

export class Meta {
  constructor(f) {
    this.f = null;
    this._onTick = f2 => this._tick(f2);
    this._onEvent = (o, f2) => this._event(o, f2);
    this._onPrestige = f2 => this._prestige(f2);
    if (f) this.attach(f);
  }

  // =====================================================================================
  // Verbinden / Lösen
  // =====================================================================================
  attach(f) {
    if (this.f) this.detach();
    this.f = f;
    const H = f.hooks;
    if (!H.tick.includes(this._onTick)) H.tick.push(this._onTick);
    if (!H.event.includes(this._onEvent)) H.event.push(this._onEvent);
    if (!H.prestige.includes(this._onPrestige)) H.prestige.push(this._onPrestige);
    this._m();                                    // Zustand anlegen/prüfen
    this._applyFdep(true);                        // Ersatz-Vorkommen (nur ohne f.addDeposit) wieder auflegen
    this._applyX();                               // laufende Ereignisse → Faktoren
    this._guardChal();
    return this;
  }
  detach() {
    const f = this.f; if (!f) return;
    const rm = (a, h) => { let i; while ((i = a.indexOf(h)) >= 0) a.splice(i, 1); };
    rm(f.hooks.tick, this._onTick); rm(f.hooks.event, this._onEvent); rm(f.hooks.prestige, this._onPrestige);
    this._applyFdep(false);
    Object.assign(f.X, { belt: 1, mach: 1, drill: 1, gold: 0, sell: {} }); f.refreshMods();
    for (const k of ['canPrestige', 'prestige', 'offline']) if (Object.prototype.hasOwnProperty.call(f, k)) delete f[k];
    this.f = null;
  }

  // Zustand in S.meta anlegen und gegen alte/kaputte Stände absichern
  _m() {
    const S = this.f.S;
    if (!isObj(S.meta)) S.meta = {};
    const m = S.meta;
    if (m._ok === META_V && m._s === S) return m;
    m.v = META_V;
    m.rs = Number.isFinite(m.rs) ? m.rs >>> 0 : (hashStr('meta:' + S.seed) || 1);
    m.rpg = Math.max(0, fin(m.rpg, 0));
    const w = isObj(m.wheel) ? m.wheel : {};
    m.wheel = { last: dayNum(w.last) ? w.last : '', n: nint(w.n, 0) };
    const s = isObj(m.streak) ? m.streak : {};
    m.streak = { day: Math.min(7, nint(s.day, 0)), len: nint(s.len, 0), best: nint(s.best, 0), last: dayNum(s.last) ? s.last : '', n: nint(s.n, 0) };
    const e = isObj(m.ev) ? m.ev : {};
    m.ev = { wait: nint(e.wait, -1), n: nint(e.n, 0), act: (Array.isArray(e.act) ? e.act : []).filter(a => isObj(a) && has(EVENTS, a.kind) && nint(a.lt, 0) > 0).map(a => this._normEv(a)).filter(Boolean) };
    if (m.ev.wait < 0) m.ev.wait = this._gap();
    m.fdep = (Array.isArray(m.fdep) ? m.fdep : []).filter(d => isObj(d) && [d.x, d.y, d.t, d.pt, d.lt].every(Number.isInteger) && d.x >= 0 && d.y >= 0 && d.x < MAP && d.y < MAP && d.t > 0 && d.t <= ITEM_IDS.length && d.lt > 0)
      .map(d => ({ x: d.x, y: d.y, t: d.t, r: d.r ? 1 : 0, pt: Math.max(0, Math.min(ITEM_IDS.length, d.pt)), pr: d.pr ? 1 : 0, lt: d.lt }));
    const b = isObj(m.bt) ? m.bt : {};
    m.bt = { n: nint(b.n, 0), tries: nint(b.tries, 0) };
    const al = isObj(m.album) ? m.album : {};
    const c = {}; if (isObj(al.c)) for (const k in al.c) if (ALBUM_ITEMS.includes(k) && Number.isInteger(al.c[k])) c[k] = al.c[k] & 15;
    const set = v => (Array.isArray(v) ? [...new Set(v.filter(i => ALBUM_ITEMS.includes(i)))] : []);
    m.album = { c, gm: set(al.gm), pages: Array.isArray(al.pages) ? [...new Set(al.pages.filter(t => ALBUM_PAGES.some(p => p.tier === t)))] : [], full: al.full === true };
    if (m.chal !== undefined) m.chal = this._normChal(m.chal);
    Object.defineProperty(m, '_ok', { value: META_V, enumerable: false, configurable: true, writable: true });
    Object.defineProperty(m, '_s', { value: S, enumerable: false, configurable: true, writable: true });
    return m;
  }
  _normEv(a) {
    const o = { kind: a.kind, secs: fin(a.secs, EVENTS[a.kind].secs), lt: nint(a.lt, 0) };
    switch (a.kind) {
      case 'goldvein': o.gold = fin(a.gold, EVENTS.goldvein.gold); break;
      case 'boom': if (!has(IDX, a.item)) return null; o.item = a.item; o.mul = fin(a.mul, EVENTS.boom.mul); break;
      case 'vip': if (!has(IDX, a.item)) return null; o.item = a.item; o.n = Math.max(1, nint(a.n, 20)); o.have = nint(a.have, 0); o.reward = Math.max(0, fin(a.reward, 0)); o.done = a.done === true; break;
      case 'meteor': case 'quake': o.deps = (Array.isArray(a.deps) ? a.deps : []).filter(d => isObj(d) && Number.isInteger(d.x) && Number.isInteger(d.y) && has(IDX, d.item))
        .map(d => ({ x: d.x, y: d.y, w: Math.max(1, nint(d.w, 1)), h: Math.max(1, nint(d.h, 1)), item: d.item, rich: d.rich === true })); break;
    }
    return o;
  }
  _normChal(c) {
    if (!isObj(c) || !WEEK_RE.test(str(c.week))) return null;
    const secs = Math.max(1, fin(c.secs, CHAL_SECS)), lt = Number.isInteger(c.lt) ? Math.max(0, c.lt) : Math.round(Math.max(0, fin(c.left, secs)) * TPS);
    return { week: c.week, secs, lt, left: lt / TPS, done: c.done === true, score: Math.max(0, fin(c.score, 0)) };
  }
  // eigener Zufall
  _rand() { const m = this.f.S.meta; m.rs = (m.rs + STEP) >>> 0; return mix(m.rs); }
  _gap() { return EVENT_GAP[0] + Math.floor(this._rand() * (EVENT_GAP[1] - EVENT_GAP[0] + 1)); }
  _pickW(list) {
    let x = this._rand() * list.reduce((a, b) => a + b.w, 0);
    for (const it of list) if ((x -= it.w) < 0) return it;
    return list[list.length - 1];
  }

  // =====================================================================================
  // Belohnungen (gemeinsam für Rad, Serie, Durchbruch, Album, VIP)
  // =====================================================================================
  _money(v) { const S = this.f.S; v = Math.round(v); S.money += v; S.stats.earned += v; S.total.earned += v; return v; }
  _crate(src) {
    const f = this.f;
    if (typeof f.addCrate === 'function') return f.addCrate(src);
    if (typeof f._addCrate === 'function') return f._addCrate(src);
    f.S.crates.push({ src }); f._emit('crate', { kind: 'new', src, i: f.S.crates.length - 1 });
  }
  _turbo(secs) { this.f.S.boosts.turbo += secs; this.f.refreshMods(); }
  // Forschungspunkte pro Sekunde aus dem Labor (ohne die von Meta geschenkten, sonst schaukelt es sich auf)
  _rpRate() { const S = this.f.S, t = Math.max(60, S.tick * DT); return Math.max(0, S.stats.rpGain - (S.meta.rpg || 0)) / t; }
  _rp(v) { const S = this.f.S; v = Math.round(v); S.rp += v; S.stats.rpGain += v; S.meta.rpg = (S.meta.rpg || 0) + v; return v; }
  _grant(kind, src) {
    const f = this.f, S = f.S, inc = f.incomeRate(), r = { kind };
    switch (kind) {
      case 'geld': r.money = this._money(Math.max(src === 'streak' ? 1000 : 500, inc * (src === 'streak' ? 300 : 120))); break;
      case 'geldgross': r.money = this._money(Math.max(2500, inc * 600)); break;
      case 'rp': r.rp = this._rp(Math.max(25, this._rpRate() * 300)); break;
      case 'kiste': r.crates = 1; this._crate(src); break;
      case 'kisten2': r.crates = 2; this._crate(src); this._crate(src); break;
      case 'kisten3': r.crates = 3; for (let i = 0; i < 3; i++) this._crate(src); break;
      case 'turbo': r.secs = 120; this._turbo(120); break;
      case 'goldregen': r.n = 20; S.boosts.goldrain += 20; break;
      case 'gutschein': r.vouchers = 1; S.vouchers++; break;
      case 'jackpot': case 'patent': r.points = 1; S.points++; break;
    }
    return r;
  }
  _chal() { const S = this.f.S; return (S.chal && isObj(S.chal) ? S.chal : null) || (S.meta.chal || null); }
  inChallenge() { return !!this._chal(); }

  // =====================================================================================
  // 5. Glücksrad + Serie
  // =====================================================================================
  canSpin(today) {
    const n = dayNum(today); if (!Number.isFinite(n) || this.inChallenge()) return false;
    const last = this._m().wheel.last;
    return !last || n > dayNum(last);                // gleicher Tag oder Uhr zurückgestellt → nein
  }
  spin(today) {
    if (!this.canSpin(today)) return null;
    const m = this._m(), seg = this._pickW(WHEEL), i = WHEEL.indexOf(seg);
    m.wheel.last = String(today); m.wheel.n++;
    const reward = this._grant(seg.id, 'wheel');
    this.f._emit('wheel', { seg: i, kind: seg.id, reward, key: 'wheel.got.' + seg.id });
    return { seg: i, kind: seg.id, reward };
  }
  wheelInfo(today) { const m = this._m(); return { can: this.canSpin(today), last: m.wheel.last, spins: m.wheel.n, segs: WHEEL.map(s => ({ id: s.id, w: s.w })) }; }

  canCheckIn(today) {
    const n = dayNum(today); if (!Number.isFinite(n) || this.inChallenge()) return false;
    const last = this._m().streak.last;
    return !last || n > dayNum(last);
  }
  checkIn(today) {
    if (!this.canCheckIn(today)) return null;
    const s = this._m().streak, n = dayNum(today), gap = s.last ? n - dayNum(s.last) : Infinity;
    const broken = !!s.last && gap > 1;
    s.day = gap === 1 ? (s.day % 7) + 1 : 1;
    s.len = gap === 1 ? s.len + 1 : 1; s.best = Math.max(s.best, s.len); s.last = String(today); s.n++;
    const kind = STREAK[s.day - 1], reward = this._grant(kind, 'streak');
    this.f._emit('streak', { day: s.day, len: s.len, broken, kind, reward, key: 'streak.got.' + kind });
    return { day: s.day, len: s.len, broken, kind, reward };
  }
  // Für den Kalender: welcher Tag als Nächstes käme, ob die Serie gerade reißen würde
  streakInfo(today) {
    const s = this._m().streak, n = dayNum(today), gap = s.last && Number.isFinite(n) ? n - dayNum(s.last) : Infinity;
    const alive = gap <= 1;
    return { day: alive ? s.day : 0, len: alive ? s.len : 0, best: s.best, last: s.last, can: this.canCheckIn(today),
      next: gap === 1 ? (s.day % 7) + 1 : gap <= 0 ? s.day : 1, willBreak: !!s.last && gap > 1, rewards: STREAK.slice() };
  }

  // =====================================================================================
  // 6. Ereignisse
  // =====================================================================================
  active() {
    const m = this._m();
    return m.ev.act.map(a => {
      const o = { kind: a.kind, secs: a.secs, left: a.lt / TPS };
      for (const k of ['item', 'n', 'have', 'reward', 'mul', 'gold', 'deps']) if (a[k] !== undefined) o[k] = Array.isArray(a[k]) ? a[k].map(d => ({ ...d })) : a[k];
      return o;
    });
  }
  nextEventIn() { return this._m().ev.wait / TPS; }
  // Ereignis sofort starten (Tests, Fehlersuche); opt überschreibt z. B. { item, n } – false, wenn es gerade nicht geht
  trigger(kind, opt = {}) { if (!has(EVENTS, kind)) return null; return this._start(kind, opt); }

  _start(kind, opt = {}) {
    const f = this.f, S = f.S, m = this._m(), cfg = EVENTS[kind];
    if (m.ev.act.some(a => a.kind === kind)) return null;
    const a = { kind, secs: cfg.secs, lt: cfg.secs * TPS }, info = {};
    switch (kind) {
      case 'goldvein': a.gold = cfg.gold; break;
      case 'boom': {
        const item = opt.item && has(IDX, opt.item) ? opt.item : this._soldPick(false); if (!item) return null;
        a.item = item; a.mul = cfg.mul; break;
      }
      case 'vip': {
        const item = opt.item && has(IDX, opt.item) ? opt.item : this._soldPick(true); if (!item) return null;
        const rate = S.stats.rate[item] || 0;
        a.item = item; a.n = opt.n > 0 ? Math.floor(opt.n) : Math.max(20, r5(rate * cfg.secs * 0.8)); a.have = 0; a.done = false;
        a.reward = Math.round(Math.max(300, a.n * ITEMS[item].value * (CONTRACT?.rewardMul || 1) * cfg.mul)); break;
      }
      case 'meteor': {
        const b = this._freeBlock(3, 3, new Set()); if (!b) return null;
        a.deps = [{ x: b[0], y: b[1], w: 3, h: 3, item: 'kristall', rich: true }];
        info.x = b[0] + 1.5; info.z = b[1] + 1.5; break;
      }
      case 'quake': {
        const own = Object.keys(BIOMES[S.biome].deposits || {}).filter(i => has(IDX, i)), used = new Set(); a.deps = [];
        for (let k = 0; k < cfg.n; k++) {
          const b = this._freeBlock(2, 2, used); if (!b) break;
          const item = own.length ? own[Math.floor(this._rand() * own.length)] : 'stein';
          a.deps.push({ x: b[0], y: b[1], w: 2, h: 2, item, rich: this._rand() < 0.3 });
          for (let j = -1; j <= 2; j++) for (let i = -1; i <= 2; i++) used.add((b[1] + j) * MAP + b[0] + i);
        }
        if (!a.deps.length) return null; break;
      }
    }
    if (a.deps) for (const d of a.deps) this._addDep(d, a.secs);
    m.ev.act.push(a); m.ev.n++;
    this._applyX();
    const ev = { kind, on: true, secs: a.secs, key: `event.${kind}.on`, ...info };
    for (const k of ['item', 'n', 'reward', 'mul', 'gold']) if (a[k] !== undefined) ev[k] = a[k];
    if (a.deps) ev.deps = a.deps.map(d => ({ ...d }));
    f._emit('event', ev);
    return this.active().find(x => x.kind === kind);
  }
  _end(a, ok) {
    const m = this._m(); m.ev.act.splice(m.ev.act.indexOf(a), 1);
    this._applyX();
    const ev = { kind: a.kind, on: false, secs: a.secs, key: `event.${a.kind}.off` };
    if (a.kind === 'vip') { ev.ok = !!ok; ev.item = a.item; ev.n = a.n; ev.have = a.have; ev.key = ok ? 'event.vip.done' : 'event.vip.fail'; if (ok) ev.reward = a.reward; }
    if (a.item && a.kind === 'boom') ev.item = a.item;
    this.f._emit('event', ev);
  }
  // verkauftes Teil wählen (VIP: eines der wertvollsten, Boom: beliebig) – null, wenn noch nichts verkauft wurde
  _soldPick(top) {
    const sb = this.f.S.stats.soldBy, list = Object.keys(sb).filter(k => sb[k] > 0 && k !== 'schrott' && has(IDX, k)).sort((a, b) => ITEMS[b].value - ITEMS[a].value || (a < b ? -1 : 1));
    if (!list.length) return null;
    const pool = top ? list.slice(0, 4) : list;
    return pool[Math.floor(this._rand() * pool.length)];
  }
  // freier Block w×h auf eigenem Land (kein Gebäude, kein Vorkommen), zufällig gewählt
  _freeBlock(w, h, used) {
    const f = this.f, S = f.S, P = Math.round(MAP / PLOT), cand = [];
    const free = (x, y) => !used.has(y * MAP + x) && f.isOpen(x, y) && !f.at(x, y) && !f.deposit(x, y);
    for (const p of [...S.plots].sort((a, b) => a - b)) {
      const px = (p % P) * PLOT, py = Math.floor(p / P) * PLOT;
      for (let y = py; y + h <= py + PLOT; y++) for (let x = px; x + w <= px + PLOT; x++) {
        let ok = true;
        for (let j = 0; j < h && ok; j++) for (let i = 0; i < w && ok; i++) if (!free(x + i, y + j)) ok = false;
        if (ok) cand.push([x, y]);
      }
    }
    return cand.length ? cand[Math.floor(this._rand() * cand.length)] : null;
  }
  // vorübergehendes Vorkommen: über die Sim (f.addDeposit) oder als Ersatz direkt in der Karte (S.meta.fdep)
  _addDep(d, secs) {
    const f = this.f;
    for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) {
      const x = d.x + i, y = d.y + j, rich = !!d.rich && (d.w < 3 || (i === 1 && j === 1));   // Meteor: nur die Mitte reich
      if (typeof f.addDeposit === 'function') { f.addDeposit(x, y, d.item, secs, rich); continue; }
      const k = y * MAP + x, m = this._m();
      m.fdep.push({ x, y, t: IDX[d.item] + 1, r: rich ? 1 : 0, pt: f.dep[k], pr: f.rich[k], lt: Math.round(secs * TPS) });
      f.dep[k] = IDX[d.item] + 1; f.rich[k] = rich ? 1 : 0;
    }
    if (typeof f.addDeposit !== 'function') this._fixDrills();
  }
  _applyFdep(on) {
    const f = this.f, m = this._m(); if (!m.fdep.length || !f.dep) return;
    for (const d of m.fdep) { const k = d.y * MAP + d.x; f.dep[k] = on ? d.t : d.pt; f.rich[k] = on ? d.r : d.pr; }
    this._fixDrills();
  }
  // Ersatzweg ohne f.addDeposit: Bohrer auf geänderten Feldern neu ausrichten
  _fixDrills() {
    const f = this.f; if (!f.mn || typeof f._drillInfo !== 'function') return;
    for (const n of f.mn) if (n.kind === 'drill') { const di = f._drillInfo(n.e.x, n.e.y, n.w); n.res = di ? di.t : -1; n.cov = di ? di.cov : 0; }
  }
  // Laufzeit-Faktoren aus den laufenden Ereignissen
  _applyX() {
    const f = this.f, m = this._m(), X = f.X;
    X.belt = 1; X.mach = 1; X.drill = 1; X.gold = 0; X.sell = {};
    for (const a of m.ev.act) {
      if (a.kind === 'goldvein') X.gold += a.gold;
      if (a.kind === 'boom') X.sell[a.item] = (X.sell[a.item] || 1) * a.mul;
    }
    f.refreshMods();
  }

  // =====================================================================================
  // Rückrufe der Sim
  // =====================================================================================
  _tick(f) {
    if (f !== this.f) return;
    const m = this._m(), S = f.S;
    // Wochen-Herausforderung
    const c = this._chal();
    if (c && !c.done) {
      c.lt = (Number.isInteger(c.lt) ? c.lt : Math.round(fin(c.left, 0) * TPS)) - 1; c.left = Math.max(0, c.lt) / TPS;
      if (c.lt <= 0) {
        c.lt = 0; c.done = true; c.score = Math.floor(S.stats.earned);
        f._emit('challengeEnd', { week: c.week, score: c.score, code: resultCode(c.week, c.score), key: 'chal.end' });
      }
    }
    // Ersatz-Vorkommen ablaufen lassen
    if (m.fdep.length) {
      let gone = false;
      for (let i = m.fdep.length - 1; i >= 0; i--) { const d = m.fdep[i]; if (--d.lt <= 0) { const k = d.y * MAP + d.x; f.dep[k] = d.pt; f.rich[k] = d.pr; m.fdep.splice(i, 1); gone = true; } }
      if (gone) this._fixDrills();
    }
    // laufende Ereignisse
    for (let i = m.ev.act.length - 1; i >= 0; i--) { const a = m.ev.act[i]; if (--a.lt <= 0) this._end(a, a.kind === 'vip' ? a.done : true); }
    // nächstes Ereignis
    if (--m.ev.wait <= 0) {
      m.ev.wait = this._gap();
      const free = EVENT_IDS.filter(k => !m.ev.act.some(a => a.kind === k)).map(k => ({ id: k, w: EVENTS[k].w }));
      while (free.length) { const p = this._pickW(free); if (this._start(p.id)) break; free.splice(free.indexOf(p), 1); }
    }
    if (S.tick % TPS === 0) this._checkAlbum();
  }
  _event(o, f) {
    if (f !== this.f) return;
    switch (o.type) {
      case 'sold': {
        const m = this._m();
        if (o.gold && has(IDX, o.item) && !m.album.gm.includes(o.item) && ALBUM_ITEMS.includes(o.item)) m.album.gm.push(o.item);
        for (const a of m.ev.act) {
          if (a.kind !== 'vip' || a.done || a.item !== o.item) continue;
          if (++a.have >= a.n) {
            a.done = true; this._money(a.reward); for (let i = 0; i < EVENTS.vip.crates; i++) this._crate('vip');
            this._end(a, true);
          }
          break;
        }
        break;
      }
      case 'gold': { const m = this._m(); if (ALBUM_ITEMS.includes(o.item) && !m.album.gm.includes(o.item)) m.album.gm.push(o.item); break; }
      case 'research': this._breakthrough(o); break;
    }
  }
  _prestige(f) {
    if (f !== this.f) return;
    const m = this._m();
    // laufende Ereignisse enden mit der alten Fabrik (Karte ist neu, Ersatz-Vorkommen verfallen ohne Rückbau)
    m.ev.act = []; m.fdep = []; m.ev.wait = this._gap();
    this._applyX();
  }

  // =====================================================================================
  // 7. Durchbrüche
  // =====================================================================================
  _breakthrough(o) {
    const f = this.f, S = f.S, m = this._m(), r = RESEARCH[o.id]; if (!r) return null;
    m.bt.tries++;
    const luck = (f.M && f.M.luck) || 0;
    if (this._rand() >= BT_CHANCE + BT_LUCK * luck) return null;
    const kind = BT_KINDS[Math.floor(this._rand() * BT_KINDS.length)], res = { id: o.id, kind };
    const resCost = (f.M && f.M.resCost) || 1;
    switch (kind) {
      case 'refund': {
        const cost = Number.isFinite(o.cost) ? o.cost : Math.round(r.cost * resCost), rp = Number.isFinite(o.rp) ? o.rp : Math.round((r.rp || 0) * resCost);
        res.money = Math.round(cost * 0.5); res.rp = Math.round(rp * 0.5); S.money += res.money; S.rp += res.rp; break;
      }
      case 'gutschein': S.vouchers++; res.vouchers = 1; break;
      case 'kiste': this._crate('bt'); res.crates = 1; break;
      case 'rp': res.rp = this._rp(Math.max(25, Math.max(r.rp || 0, r.cost / 100) * 0.5)); break;
    }
    m.bt.n++;
    f._emit('breakthrough', { ...res, key: 'bt.' + kind });
    return res;
  }

  // =====================================================================================
  // 8. Album
  // =====================================================================================
  _cardBits(item) {
    const S = this.f.S, T = S.total, m = this._m();
    const made = (T.made && T.made[item]) || 0;
    let b = 0;
    if (made >= 1) b |= 1;
    if ((isObj(T.goldMade) && T.goldMade[item] > 0) || m.album.gm.includes(item)) b |= 2;
    if ((isObj(T.perfect) && T.perfect[item] > 0) || this._perfectNow(item)) b |= 4;
    if (made >= MEGA_N) b |= 8;
    return b;
  }
  // Ersatz, solange die Sim keinen Zähler S.total.perfect führt: eine ★5-Maschine, die seit ★5 weitergearbeitet hat, stellt das Teil her
  _perfectNow(item) {
    const f = this.f; if (isObj(f.S.total.perfect) || !this._p5) return false;
    return this._p5.has(item);
  }
  _scanPerfect() {
    const f = this.f; this._p5 = null;
    if (isObj(f.S.total.perfect) || !f.mn) return;
    const XP5 = 1200, s = new Set();
    for (const n of f.mn) {
      const e = n.e; if (e.lvl < 5 || e.xp <= XP5) continue;
      if (n.kind === 'drill' && n.res >= 0) s.add(ITEM_IDS[n.res]);
      else if (n.kind === 'machine' && e.recipe && DATA.RECIPES[e.recipe]) s.add(DATA.RECIPES[e.recipe].out);
    }
    this._p5 = s;
  }
  _checkAlbum() {
    const f = this.f, S = f.S, m = this._m(), al = m.album;
    this._scanPerfect();
    for (const item of ALBUM_ITEMS) {
      const old = al.c[item] || 0, now = old | this._cardBits(item);
      if (now === old) continue;
      al.c[item] = now;
      for (let v = 0; v < 4; v++) if ((now & (1 << v)) && !(old & (1 << v))) f._emit('card', { item, variant: CARDS[v], key: 'album.new.' + CARDS[v] });
    }
    for (const p of ALBUM_PAGES) {
      if (al.pages.includes(p.tier) || !p.items.every(i => (al.c[i] || 0) === 15)) continue;
      al.pages.push(p.tier);
      const free = COLOR_IDS.filter(c => !S.deco.colors.includes(c)), reward = {};
      if (free.length) { reward.color = free[Math.floor(this._rand() * free.length)]; S.deco.colors.push(reward.color); }
      else { reward.crates = 1; this._crate('album'); }
      f._emit('album', { kind: 'page', tier: p.tier, reward, key: reward.color ? 'album.pageColor' : 'album.pageCrate' });
    }
    if (!al.full && al.pages.length === ALBUM_PAGES.length) {
      al.full = true; S.points++;
      if (has(TITLES, ALBUM_TITLE) && !S.deco.titles.includes(ALBUM_TITLE)) S.deco.titles.push(ALBUM_TITLE);
      f._emit('album', { kind: 'full', reward: { points: 1, title: ALBUM_TITLE }, key: 'album.full' });
    }
  }
  album() {
    const S = this.f.S, al = this._m().album, T = S.total;
    let have = 0;
    const pages = ALBUM_PAGES.map(p => {
      const items = p.items.map(item => {
        const b = al.c[item] || 0, cards = {}; CARDS.forEach((c, v) => { cards[c] = !!(b & (1 << v)); if (cards[c]) have++; });
        return { item, cards, made: (T.made && T.made[item]) || 0, mega: MEGA_N };
      });
      return { tier: p.tier, items, full: items.every(i => CARDS.every(c => i.cards[c])), claimed: al.pages.includes(p.tier) };
    });
    const total = ALBUM_ITEMS.length * CARDS.length;
    return { pages, have, total, progress: have / total, full: al.full, title: al.full ? ALBUM_TITLE : null };
  }

  // =====================================================================================
  // 9. Ziele
  // =====================================================================================
  nextGoals(n = 3) {
    const f = this.f, S = f.S, out = [], money = Math.max(0, S.money);
    const add = g => { g.progress = clamp01(g.progress); out.push(g); };
    if (this.inChallenge()) {
      const c = this._chal();
      add({ key: c.done ? 'goal.chalDone' : 'goal.chal', vars: { score: Math.floor(c.done ? c.score : S.stats.earned), secs: c.left }, progress: 1 - c.left / c.secs, target: { type: 'challenge', id: c.week } });
    }
    if (f.canPrestige()) add({ key: 'goal.prestigeReady', vars: { n: f.prestigePoints() }, progress: 1, target: { type: 'prestige', id: null } });
    // nächste Forschung: die billigste, deren Voraussetzungen erfüllt sind
    const res = RESEARCH_IDS.map(id => ({ id, c: f.canResearch(id) })).filter(r => r.c.reason !== 'known' && r.c.reason !== 'locked' && r.c.reason !== 'unknown')
      .sort((a, b) => a.c.cost - b.c.cost || (a.id < b.id ? -1 : 1))[0];
    if (res) {
      const c = res.c, p = Math.min(c.cost > 0 ? money / c.cost : 1, c.rp > 0 ? S.rp / c.rp : 1);
      add({ key: c.ok ? 'goal.researchReady' : 'goal.research', vars: { id: res.id, cost: c.cost, rp: c.rp }, progress: p, target: { type: 'research', id: res.id } });
    }
    // nächstes Gebäude: freigeschaltet, aber noch keins gebaut
    const bt = BUILDING_IDS.filter(b => b !== 'band' && f.isUnlocked(b) && !(f.count && f.count[b] > 0) && !((BUILDINGS[b].prestige || 0) > S.total.prestiges))
      .sort((a, b) => f.costOf(a) - f.costOf(b) || (a < b ? -1 : 1))[0];
    if (bt) add({ key: 'goal.build', vars: { id: bt, cost: f.costOf(bt) }, progress: money / Math.max(1, f.costOf(bt)), target: { type: 'building', id: bt } });
    // Grundstück
    const P = Math.round(MAP / PLOT); let plot = null;
    for (let cy = 0; cy < P && !plot; cy++) for (let cx = 0; cx < P && !plot; cx++) if (f.plotState(cx, cy) === 'buyable') plot = { cx, cy };
    if (plot) { const cost = f.plotCost(); add({ key: 'goal.plot', vars: { cost }, progress: money / Math.max(1, cost), target: { type: 'plot', id: plot.cy * P + plot.cx, cx: plot.cx, cy: plot.cy } }); }
    // nächster Erfolg: der mit dem größten Fortschritt
    let ach = null, ap = -1;
    for (const id of ACHIEVEMENT_IDS) {
      if (S.ach.includes(id)) continue;
      const cd = ACHIEVEMENTS[id].cond, have = f.metric(cd.m), p = clamp01(have / cd.n);
      if (p > ap) { ap = p; ach = { id, have, n: cd.n }; }
    }
    if (ach) add({ key: 'goal.achievement', vars: { id: ach.id, have: Math.floor(ach.have), n: ach.n }, progress: ap, target: { type: 'achievement', id: ach.id } });
    // Wunderstufe (nach dem ersten Prestige, wenn die Sim Wunder kennt)
    const W = DATA.WONDER, ws = S.wonder;
    if (Array.isArray(W) && isObj(ws) && S.total.prestiges >= 1 && Number.isInteger(ws.stage)) {
      const spec = W[ws.stage - 1], need = spec && spec.need;
      if (isObj(need)) {
        let sn = 0, sh = 0; for (const k in need) if (typeof need[k] === 'number') { sn += need[k]; sh += Math.min(need[k], (ws.have && ws.have[k]) || 0); }
        if (sn > 0) add({ key: 'goal.wonder', vars: { stage: ws.stage }, progress: sh / sn, target: { type: 'wonder', id: ws.stage } });
      }
    }
    // Prestige vorbereiten
    if (!f.canPrestige() && !this.inChallenge() && S.stats.earned >= PRESTIGE_AT * 0.05)
      add({ key: 'goal.prestige', vars: { n: PRESTIGE_AT }, progress: S.stats.earned / PRESTIGE_AT, target: { type: 'prestige', id: null } });
    return out.slice(0, Math.max(0, n | 0));
  }

  // =====================================================================================
  // 15. Wochen-Herausforderung
  // =====================================================================================
  challengeSpec(week) { return challengeSpec(week); }
  resultCode(week, score) { return resultCode(week, score); }
  challenge() { const c = this._chal(); return c ? { week: c.week, left: c.left, secs: c.secs, done: c.done, score: c.done ? c.score : Math.floor(this.f.S.stats.earned), code: c.done ? resultCode(c.week, c.score) : null } : null; }
  // In der Herausforderung gibt es kein Prestige und kein Offline-Geld (eigene Methoden auf der Instanz, detach() entfernt sie)
  _guardChal() {
    const f = this.f; if (!this.inChallenge()) return;
    f.canPrestige = () => false; f.prestige = () => 0; f.offline = () => ({ money: 0, seconds: 0 });
  }
}
