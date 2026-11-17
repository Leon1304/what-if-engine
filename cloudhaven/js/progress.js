// Fortschritt: Erfolge (Abzeichen), Tagesaufgaben und Besucher mit Wünschen. Ohne Grafik, läuft auch in Node (tools/progress.mjs).
//   const prog = new Progress(game, { env: () => app.env(), visitors: () => settings.visitors !== false });
//   prog.on((type, d) => …)  Ereignisse: 'badge' {b, stars} · 'daily' {i, task} · 'dailyAll' · 'claim' {i, pts, kinds} ·
//                            'visitor' {w} · 'wishDone' {w, pts, key} · 'wishGone' {w} · 'change'
// Global über alle Inseln: localStorage 'insel.progress' (try/catch). Je Insel: game.S.prog (wird mit der Insel gespeichert).
// Rückgängig: Erfolge, erfüllte Wünsche und abgeholte Belohnungen bleiben; Belohnungen, die der alte Stand nicht kennt,
// werden wieder gutgeschrieben (nie doppelt), Zähler (Kacheln, perfekte Züge, Verschmelzungen) zählen zurück.
// Im Kreativ-Modus ruht alles. Besucher nur in Klassisch und Endlos. Verschmelzen zählt in Klassisch und Endlos (Grundregel).
// Größen zählen Gewichte (game.js weight: verschmolzene Kacheln zählen so oft, wie Teile in ihnen stecken).
import { TILES, KINDS, GROUP, CATS, MERGE, edgesOf } from './tiles.js';
import { neighbor, key, hash, rng } from './hex.js';

export const PROGRESS_KEY = 'insel.progress';
export const TIER_STARS = [0, 1, 2, 3];                  // Bronze 1 ⭐, Silber 2 ⭐, Gold 3 ⭐
export const DAILY_N = 3, DAILY_PTS = 25, DAILY_TILES = 2, DAILY_STARS = 1;
export const WISH_PTS = 30, MAX_VISITORS = 2;
const HOUSING = new Set(['haus', 'huette', 'reihe']);

// ---------- Erfolge ----------
// val(c) liefert den Stand (c = { S, P, st, kinds }), erreicht bei val ≥ goal. scope 'island' = gilt je Insel (Bestwert zählt).
const B = (id, icon, tier, sec, goal, val, scope = 'global') => ({ id, icon, tier, sec, goal, val, scope });
export const SECTIONS = ['build', 'land', 'village', 'skill', 'merge', 'social'];
export const BADGES = [
  B('first', '🌱', 1, 'build', 1, c => c.P.tot.placed),
  B('placed10', '🧱', 1, 'build', 10, c => c.P.tot.placed),
  B('placed50', '🏗️', 2, 'build', 50, c => c.P.tot.placed),
  B('placed200', '🏛️', 3, 'build', 200, c => c.P.tot.placed),
  B('variety15', '🎨', 2, 'build', 15, c => c.kinds, 'island'),
  B('allCats', '🧭', 2, 'build', CATS.length, c => CATS.filter(k => k.kinds.some(x => c.P.kinds[x])).length),
  B('allKinds', '📚', 3, 'build', KINDS.length, c => KINDS.filter(k => c.P.kinds[k]).length),
  B('waterfall', '🌊', 1, 'land', 1, c => c.st.fall, 'island'),
  B('forest10', '🌲', 1, 'land', 10, c => c.S.best?.wald | 0, 'island'),
  B('forest25', '🌳', 2, 'land', 25, c => c.S.best?.wald | 0, 'island'),
  B('fields15', '🌾', 2, 'land', 15, c => c.S.best?.feld | 0, 'island'),
  B('lake10', '🏞️', 2, 'land', 10, c => c.S.best?.wasser | 0, 'island'),
  B('lighthouse', '🗼', 1, 'land', 1, c => c.st.light, 'island'),
  B('village5', '🏘️', 1, 'village', 5, c => c.st.houses, 'island'),
  B('village20', '🏡', 3, 'village', 20, c => c.st.houses, 'island'),
  B('winter', '❄️', 2, 'village', 8, c => c.st.winter, 'island'),
  B('nightOwl', '🦉', 1, 'village', 1, c => c.P.tot.night),
  B('perfect1', '✨', 1, 'skill', 1, c => c.P.tot.perfect),
  B('perfect5', '💫', 2, 'skill', 5, c => c.P.tot.perfect),
  B('perfect20', '🌟', 3, 'skill', 20, c => c.P.tot.perfect),
  B('milestone', '🏆', 1, 'skill', 1, c => c.P.tot.ms),
  B('quests5', '🚩', 2, 'skill', 5, c => c.P.tot.quests),
  B('score300', '🪙', 1, 'skill', 300, c => c.S.score, 'island'),
  B('score1000', '💰', 2, 'skill', 1000, c => c.S.score, 'island'),
  B('score5000', '👑', 3, 'skill', 5000, c => c.S.score, 'island'),
  B('classicEnd', '🎉', 1, 'skill', 1, c => c.P.tot.ends),
  B('merge1', '🔮', 1, 'merge', 1, c => c.P.tot.merges),
  B('chain', '⛓️', 2, 'merge', 2, c => c.P.tot.chain),
  B('merges50', '⚗️', 2, 'merge', 50, c => c.P.tot.merges),
  B('castle', '🏰', 3, 'merge', 1, c => c.P.tot.castle),
  B('wish1', '💌', 1, 'social', 1, c => c.P.tot.wishes),
  B('wish10', '💝', 2, 'social', 10, c => c.P.tot.wishes),
  B('daily1', '📅', 1, 'social', 1, c => c.P.tot.daily),
  B('dailyAll', '🗓️', 2, 'social', 1, c => c.P.tot.allDays),
  B('daily5', '🌈', 3, 'social', 5, c => c.P.tot.allDays),
  B('islands3', '🏝️', 1, 'social', 3, c => c.P.islands.length),
];
export const BADGE_BY = Object.fromEntries(BADGES.map(b => [b.id, b]));

// ---------- Nachbarschaft ----------
// Ziel b: Art ('feld'), Liste von Arten oder Gruppe ('@wald')
export const matchKind = (k, b) => typeof b === 'string' && b[0] === '@' ? GROUP[k] === b.slice(1) : Array.isArray(b) ? b.includes(k) : k === b;
const nbs = (game, t) => { const o = []; for (let i = 0; i < 6; i++) { const n = game.at(...neighbor(t.q, t.r, i)); if (n) o.push(n); } return o; };
// Liegt nach dem Setzen von t eine Kachel a neben einer Kachel b (egal welche zuerst kam)?
export function pairAt(game, t, a, b) {
  const n = nbs(game, t);
  return (t.k === a && n.some(x => matchKind(x.k, b))) || (matchKind(t.k, b) && n.some(x => x.k === a));
}
const wt = t => (t && t.n > 1 ? t.n : 1);
// zusammenhängende Kacheln aus der Menge set um (q, r), nach Gewicht. Verschmolzene Stufen einer Art aus set zählen mit
// (z. B. Schafweide aus 3 Wiesen = 3 Wiesen), aber nur, wenn sie wirklich verschmolzen sind (t.n > 1)
function kindGroup(game, q, r, set) {
  const res = new Set([...set].map(k => MERGE[k]).filter(Boolean)), inSet = t => t && (set.has(t.k) || (res.has(t.k) && t.n > 1));
  const t0 = game.at(q, r); if (!inSet(t0)) return 0;
  const seen = new Set([key(q, r)]), todo = [[q, r]]; let n0 = wt(t0);
  while (todo.length) { const [a, b] = todo.pop(); for (let i = 0; i < 6; i++) { const [c, d] = neighbor(a, b, i), k = key(c, d), n = game.board.get(k); if (n && !seen.has(k) && inSet(n)) { seen.add(k); todo.push([c, d]); n0 += wt(n); } } }
  return n0;
}

// ---------- Tagesaufgaben ----------
const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
export const ROW_KINDS = { wald: ['wald', 'nadelwald'], wiese: ['wiese'], haus: ['haus'], feld: ['feld'] };
const PATHS = ['weg', 'wegk', 'kreuzung', 'start', 'platz', 'markt'];
// Tagesaufgabe „Baue a neben b“ (id → Text dt.next.<id>)
export const NEXT_PAIRS = [{ id: 'hausWeg', a: 'haus', b: PATHS }, { id: 'muehleFeld', a: 'muehle', b: 'feld' }, { id: 'teichWiese', a: 'teich', b: 'wiese' },
  { id: 'schafeWiese', a: 'schafe', b: 'wiese' }, { id: 'huetteWald', a: 'huette', b: '@wald' }, { id: 'imkerWiese', a: 'imker', b: 'wiese' },
  { id: 'baeckerFeld', a: 'baecker', b: 'feld' }, { id: 'hofFeld', a: 'hof', b: 'feld' }, { id: 'obstHaus', a: 'obst', b: 'haus' }];
export const TASK_TYPES = {
  row: { w: 3, gen: r => { const k = pick(r, Object.keys(ROW_KINDS)); return { k, goal: 4 + Math.floor(r() * 2) }; } },
  next: { w: 3, gen: r => { const p = pick(r, NEXT_PAIRS); return { id: p.id, a: p.a, b: p.b, goal: 1 }; } },
  score: { w: 2, gen: r => ({ goal: pick(r, [300, 500, 800]) }) },
  count: { w: 2, gen: r => ({ goal: pick(r, [12, 18, 25]) }) },
  kinds: { w: 2, gen: r => ({ goal: pick(r, [6, 8]) }) },
  perfect: { w: 2, gen: r => ({ goal: pick(r, [1, 2]) }) },
  wish: { w: 2, gen: r => ({ goal: pick(r, [1, 2]) }) },
  merge: { w: 1, gen: r => ({ goal: pick(r, [3, 5]) }) },
  quest: { w: 1, gen: () => ({ goal: 1 }) },
  night: { w: 1, gen: () => ({ goal: 1 }) },
};
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// 3 Aufgaben je Kalendertag, aus dem Datum gesät (für alle gleich), nie zwei gleiche Arten
export function tasksFor(day) {
  const r = rng(hash('cloudhaven-daily', day)), out = [], used = new Set();
  while (out.length < DAILY_N) {
    const pool = Object.entries(TASK_TYPES).filter(([k]) => !used.has(k));
    let x = r() * pool.reduce((s, [, T]) => s + T.w, 0), type = pool[0][0];
    for (const [k, T] of pool) if ((x -= T.w) < 0) { type = k; break; }
    used.add(type); out.push({ type, ...TASK_TYPES[type].gen(r) });
  }
  return out;
}
export const isNight = h => h >= 20.5 || h < 6;

// ---------- Besucher ----------
// a = gewünschte Art, b = Nachbar (Art, Liste, '@gruppe'), rel 'edge' = am Inselrand (≥ 3 freie Seiten)
export const WISHES = [
  { id: 'hausWeg', a: 'haus', b: PATHS },
  { id: 'wieseBrunnen', a: 'wiese', b: 'start' },
  { id: 'waldHaus', a: 'wald', b: 'haus' },
  { id: 'teichWald', a: 'teich', b: '@wald' },
  { id: 'huetteWald', a: 'huette', b: '@wald' },
  { id: 'muehleFeld', a: 'muehle', b: 'feld' },
  { id: 'schafeWiese', a: 'schafe', b: 'wiese' },
  { id: 'imkerWiese', a: 'imker', b: 'wiese' },
  { id: 'obstHaus', a: 'obst', b: 'haus' },
  { id: 'feldHof', a: 'feld', b: 'hof' },
  { id: 'brueckeBach', a: 'bruecke', b: '@wasser' },
  { id: 'seeBach', a: 'see', b: ['bach', 'bachk', 'bachg', 'quelle'] },
  { id: 'baeckerMarkt', a: 'baecker', b: 'markt' },
  { id: 'gasthausPlatz', a: 'gasthaus', b: ['platz', 'markt'] },
  { id: 'kapelleDorf', a: 'kapelle', b: '@dorf' },
  { id: 'saegeWald', a: 'saege', b: '@wald' },
  { id: 'pavillonWiese', a: 'pavillon', b: 'wiese' },
  { id: 'turmRand', a: 'turm', rel: 'edge' },
];
export const WISH_BY = Object.fromEntries(WISHES.map(w => [w.id, w]));
// Namen ohne Umlaute (gleich in beiden Sprachen)
export const VISITORS = [['Anton', '👴'], ['Ida', '👵'], ['Bruno', '👨‍🌾'], ['Greta', '👩‍🌾'], ['Emil', '👦'], ['Lotte', '👧'], ['Hugo', '🧔'],
  ['Paula', '👩‍🍳'], ['Oskar', '👨‍🎨'], ['Rosa', '👩‍🦰'], ['Theo', '🧑‍🔧'], ['Wilma', '👱‍♀️'], ['Konrad', '🧙'], ['Hanna', '👩‍🎤']];
export function wishFits(game, t, w) {
  const W = WISH_BY[w.tpl]; if (!W) return false;
  if (W.rel === 'edge') return t.k === W.a && game.freeSides(t.q, t.r) >= 3;
  return pairAt(game, t, W.a, W.b);
}

const TOT0 = { placed: 0, perfect: 0, merges: 0, chain: 0, castle: 0, ms: 0, quests: 0, wishes: 0, daily: 0, allDays: 0, days: 0, night: 0, ends: 0 };
const num = x => (Number.isFinite(+x) ? +x : 0);

export class Progress {
  constructor(game, opts = {}) {
    this.game = game; this.fns = [];
    this.store = 'storage' in opts ? opts.storage : (typeof localStorage !== 'undefined' ? localStorage : null);
    this.now = opts.now || (() => new Date());
    this.envFn = opts.env || null;
    this.visFn = opts.visitors || (() => true);
    this.P = this._load(); this.cur = null; this._before = null; this._last = null; this._tasks = null;
    game.on((type, d) => this._onGame(type, d));
    if (game.S) this._adopt();
  }
  on(fn) { this.fns.push(fn); return () => { const i = this.fns.indexOf(fn); if (i >= 0) this.fns.splice(i, 1); }; }
  emit(type, d = {}) { for (const f of this.fns) try { f(type, d); } catch (e) { console.warn(e); } }

  // ================= Speichern =================
  _load() {
    let d = null; try { const s = this.store?.getItem(PROGRESS_KEY); d = s ? JSON.parse(s) : null; } catch { d = null; }
    const P = { v: 1, badges: {}, best: {}, stars: 0, kinds: {}, islands: [], tot: { ...TOT0 }, daily: null };
    if (!d || typeof d !== 'object') return P;
    for (const [k, v] of Object.entries(d.badges || {})) if (BADGE_BY[k]) P.badges[k] = num(v) || 1;
    for (const [k, v] of Object.entries(d.best || {})) if (BADGE_BY[k]) P.best[k] = num(v);
    for (const k of Object.keys(d.kinds || {})) if (TILES[k]) P.kinds[k] = 1;
    for (const k of Object.keys(TOT0)) P.tot[k] = Math.max(0, num(d.tot?.[k]));
    P.stars = Math.max(0, num(d.stars));
    P.islands = Array.isArray(d.islands) ? d.islands.filter(x => x != null).slice(-60) : [];
    const D = d.daily;
    if (D && typeof D.day === 'string') P.daily = { day: D.day, n: [0, 1, 2].map(i => num(D.n?.[i])), done: [0, 1, 2].map(i => num(D.done?.[i])), claimed: [0, 1, 2].map(i => num(D.claimed?.[i])), kinds: Array.isArray(D.kinds) ? D.kinds.filter(k => TILES[k]) : [] };
    return P;
  }
  _save() { try { this.store?.setItem(PROGRESS_KEY, JSON.stringify(this.P)); return true; } catch { return false; } }
  // Inselstand S.prog anlegen/ergänzen (ältere Stände kennen ihn nicht)
  _norm(S) {
    const p = S.prog && typeof S.prog === 'object' ? S.prog : {};
    const st = { wishes: 0, left: 0, daily: 0, houses: 0, winter: 0, fall: 0, light: 0, ...(p.st || {}) };
    st.badges = Array.isArray(st.badges) ? st.badges.filter(b => BADGE_BY[b]) : [];
    const placed = S.stats?.placed | 0;
    const vis = { next: placed + 5, n: 0, ...(p.vis || {}) };
    vis.list = (Array.isArray(p.vis?.list) ? p.vis.list : []).filter(w => w && TILES[w.a] && WISH_BY[w.tpl] && typeof w.home === 'string');
    const got = (Array.isArray(p.got) ? p.got : []).filter(g => g && g.id).map(g => ({ id: String(g.id), pts: num(g.pts), kinds: (g.kinds || []).filter(k => TILES[k]), at: num(g.at) }));
    S.prog = { v: 1, got, vis, st };
    return S.prog;
  }
  _snapLast() { const S = this.game.S; this._last = { created: S.created, placed: S.stats.placed | 0, perfect: S.stats.perfect | 0, merges: S.stats.merges | 0 }; }
  _adopt() { this.cur = this._norm(this.game.S); this._snapLast(); }

  // ================= Abfragen für die Oberfläche =================
  get S() { return this.game.S; }
  active() { const S = this.game.S; return !!S && S.mode !== 'kreativ'; }
  visitorsHere() { const S = this.game.S; return !!S && (S.mode === 'klassisch' || S.mode === 'endlos'); }
  env() {
    try { if (this.envFn) { const e = this.envFn(); if (e) return e; } } catch { }
    const S = this.game.S || {}, d = ((S.day || 1) - 1) + (S.time ?? 12) / 24;
    return { time: S.time ?? 12, season: Math.floor((((d / 2) % 4) + 4 + 1) % 4) };
  }
  badges() {
    return BADGES.map(b => ({ id: b.id, icon: b.icon, tier: b.tier, sec: b.sec, goal: b.goal, scope: b.scope, stars: TIER_STARS[b.tier],
      got: this.P.badges[b.id] || 0, best: Math.min(b.goal, this.P.best[b.id] || 0) }));
  }
  summary() {
    const tiers = [0, 0, 0, 0]; let got = 0;
    for (const b of BADGES) if (this.P.badges[b.id]) { got++; tiers[b.tier]++; }
    return { got, total: BADGES.length, stars: this.P.stars, tiers };
  }
  tasks() { this._rollDay(); if (this._tasks?.day !== this.P.daily.day) this._tasks = { day: this.P.daily.day, list: tasksFor(this.P.daily.day) }; return this._tasks.list; }
  daily() {
    const list = this.tasks(), D = this.P.daily;
    const tasks = list.map((T, i) => ({ ...T, i, val: Math.min(T.goal, D.n[i] || 0), done: !!D.done[i], claimed: !!D.claimed[i] }));
    return { day: D.day, tasks, done: tasks.filter(x => x.done).length, claimable: tasks.filter(x => x.done && !x.claimed).length };
  }
  wishes() {
    const S = this.game.S; if (!S || !this.cur) return [];
    const placed = S.stats.placed | 0;
    return this.cur.vis.list.map(w => ({ ...w, b: WISH_BY[w.tpl].b, rel: WISH_BY[w.tpl].rel, left: Math.max(0, w.turns - (placed - w.from)) }));
  }
  wishedKinds() { return new Set(this.wishes().map(w => w.a)); }
  island() {
    const S = this.game.S; if (!S || !this.cur) return null;
    return { ...this.cur.st, badges: this.cur.st.badges.length, served: this.cur.st.wishes, tiles: Math.max(0, S.tiles.length - 1), score: S.score };
  }

  // ================= Belohnungen =================
  // Tagesaufgabe i abholen: +1 ⭐, +25 Punkte, im Klassisch-Modus +2 Kacheln (auf die aktuelle Insel). → Belohnung oder null
  claimDaily(i) {
    const D = this.daily(), T = D.tasks[i]; if (!T || !T.done || T.claimed) return null;
    this.P.daily.claimed[i] = Date.now(); this.P.stars += DAILY_STARS;
    const g = this._grant(`d:${D.day}:${i}`, DAILY_PTS, DAILY_TILES);
    const r = { i, stars: DAILY_STARS, pts: g ? g.pts : 0, kinds: g ? g.kinds : [] };
    this._check(); this._save(); this.emit('claim', r); this.emit('change');
    return r;
  }
  claimAll() { const out = []; for (const T of this.daily().tasks) if (T.done && !T.claimed) out.push(this.claimDaily(T.i)); return out; }
  // Punkte gutschreiben (z. B. aus main.js); id macht die Gutschrift eindeutig
  rewardPoints(n, id = 'p:' + Date.now() + ':' + Math.random().toString(36).slice(2, 6)) { const g = this._grant(id, n | 0, 0); if (g) { this._check(); this._save(); this.emit('change'); } return g; }
  // Extrakacheln im Klassisch-Modus (n Stück, oder Liste von Arten)
  giveTiles(n = DAILY_TILES, id = 't:' + Date.now()) { const g = this._grant(id, 0, n); if (g) this.emit('change'); return g; }
  _grant(id, pts, tiles = 0) {
    const S = this.game.S; if (!S || S.mode === 'kreativ' || !this.cur) return null;
    if (this.cur.got.some(g => g.id === id)) return null;                 // nie doppelt
    const kinds = S.mode === 'klassisch' ? (Array.isArray(tiles) ? tiles.filter(k => TILES[k]) : this._giftKinds(id, tiles | 0)) : [];
    const g = { id, pts, kinds, at: S.stats.placed | 0 };
    this.cur.got.push(g); if (this.cur.got.length > 300) this.cur.got.splice(0, this.cur.got.length - 300);
    this._apply(g);
    return g;
  }
  _apply(g) {
    const S = this.game.S;
    S.score += g.pts; for (const k of g.kinds) S.stack.push({ k });
    try { this.game._unlockUpTo?.(S.score); } catch { }
    this._dailySet('score', () => S.score);
    this.game.emit('stack');
  }
  // Geschenk-Kacheln: zuerst, was sich Besucher wünschen, sonst nach Häufigkeit aus den freigeschalteten
  _giftKinds(id, n) {
    const S = this.game.S, r = rng(hash('gift', S.seed, S.created, id)), out = [];
    for (const w of this.cur.vis.list) if (out.length < n && S.unlocked.includes(w.a)) out.push(w.a);
    const pool = S.unlocked.filter(k => TILES[k]?.w > 0);
    while (out.length < n && pool.length) {
      let x = r() * pool.reduce((s, k) => s + TILES[k].w, 0), k0 = pool[0];
      for (const k of pool) if ((x -= TILES[k].w) < 0) { k0 = k; break; }
      out.push(k0);
    }
    return out;
  }
  setVisitors(on) {
    if (on || !this.cur?.vis.list.length) return;
    this.cur.vis.list = []; this.emit('change');
  }

  // ================= Spielereignisse =================
  _onGame(type, d) {
    const S = this.game.S; if (!S) return;
    if (type === 'reset') { this._before = this.cur && this._last ? { prog: this.cur, ...this._last } : null; this._adopt(); this.emit('change'); return; }
    if (type === 'undo') { this._undo(); return; }
    if (!this.cur) this._adopt();
    if (S.mode === 'kreativ') { if (type === 'place') this._snapLast(); return; }
    this._rollDay();
    if (type === 'merge') this._merge(d);
    else if (type === 'place') this._place(d);
    else if (type === 'end') { if (S.mode === 'klassisch') { this.P.tot.ends++; this._check(); this._save(); this.emit('change'); } }
  }
  _rollDay() {
    const day = dayKey(this.now());
    if (!this.P.daily || this.P.daily.day !== day) this.P.daily = { day, n: [0, 0, 0], done: [0, 0, 0], claimed: [0, 0, 0], kinds: [] };
  }
  _merge(d) {
    const T = this.P.tot; T.merges++;
    if ((d.step | 0) >= 1) T.chain = Math.max(T.chain, (d.step | 0) + 1);
    if (d.to === 'burg') T.castle++;
    if (TILES[d.to]) this.P.kinds[d.to] = 1;
    this._dailyAdd('merge', 1);
    for (const w of this.cur?.vis.list || []) if (d.keys?.includes(w.home)) w.home = d.at;     // Zuhause verschmolzen → zieht mit
  }
  _place(d) {
    const S = this.game.S, P = this.P, T = P.tot, t = d.tile, st = this.cur.st, env = this.env(), g = this.game;
    T.placed++; if (d.perfect) T.perfect++;
    T.ms += (d.milestones || []).length; T.quests += (d.quests || []).length;
    if (S.created != null && !P.islands.includes(S.created)) { P.islands.push(S.created); if (P.islands.length > 60) P.islands.shift(); }
    const night = isNight(+env.time || 0); if (night) T.night++;
    for (const k of [d.placed || t.k, t.k]) if (TILES[k] && k !== 'start') { P.kinds[k] = 1; if (!P.daily.kinds.includes(k)) P.daily.kinds.push(k); }
    // je Insel: Häuser im Dorf, Winterdorf, Wasserfall, Leuchtturm am Rand
    if (GROUP[t.k] === 'dorf') {
      const grp = g.group(t.q, t.r);
      st.houses = Math.max(st.houses, grp.keys.reduce((n, k) => { const x = g.board.get(k); return n + (HOUSING.has(x?.k) ? wt(x) : 0); }, 0));
      if ((env.season | 0) === 3) st.winter = Math.max(st.winter, grp.size ?? grp.keys.length);
    }
    if (edgesOf(t.k, t.o).some((e, i) => e === 'w' && !g.at(...neighbor(t.q, t.r, i)))) st.fall = 1;
    if (t.k === 'turm' && 6 - (d.nb | 0) >= 4) st.light = 1;
    this._dailyPlace(d, night);
    this._visitors(d);
    this._snapLast(); this._check(); this._save(); this.emit('change');
  }

  // ---------- Tagesaufgaben ----------
  _dailyPlace(d, night) {
    const g = this.game, S = g.S, t = d.tile, D = this.P.daily;
    this.tasks().forEach((T, i) => {
      let v = D.n[i] || 0;
      if (T.type === 'row') { const set = new Set(ROW_KINDS[T.k] || []); if (set.has(d.placed || t.k)) v = Math.max(v, kindGroup(g, t.q, t.r, set)); }
      else if (T.type === 'next') { if (pairAt(g, t, T.a, T.b)) v = 1; }
      else if (T.type === 'score') v = Math.max(v, S.score);
      else if (T.type === 'count') v++;
      else if (T.type === 'kinds') v = D.kinds.length;
      else if (T.type === 'perfect') { if (d.perfect) v++; }
      else if (T.type === 'quest') v += (d.quests || []).length;
      else if (T.type === 'night') { if (night) v = 1; }
      else return;
      this._setTask(i, v);
    });
  }
  _dailyAdd(type, n) { const D = this.P.daily; this.tasks().forEach((T, i) => { if (T.type === type) this._setTask(i, (D.n[i] || 0) + n); }); }
  _dailySet(type, fn) { const D = this.P.daily; this.tasks().forEach((T, i) => { if (T.type === type) this._setTask(i, Math.max(D.n[i] || 0, fn())); }); }
  _setTask(i, v) {
    const D = this.P.daily, T = this.tasks()[i], P = this.P;
    if (D.done[i]) { D.n[i] = Math.max(D.n[i], v); return; }
    D.n[i] = Math.max(0, v);
    if (D.n[i] < T.goal) return;
    const first = !D.done.some(Boolean);
    D.done[i] = Date.now(); P.tot.daily++; if (first) P.tot.days++;
    if (this.cur) this.cur.st.daily++;
    this.emit('daily', { i, task: T });
    if (D.done.every(Boolean)) { P.tot.allDays++; this.emit('dailyAll', {}); }
  }

  // ---------- Besucher ----------
  _visitors(d) {
    const g = this.game, S = g.S, V = this.cur.vis, placed = S.stats.placed | 0;
    if (!this.visitorsHere()) return;
    if (!this.visFn()) { if (V.list.length) V.list = []; V.next = Math.max(V.next, placed + 3); return; }
    // erfüllt?
    for (const w of [...V.list]) {
      if (!wishFits(g, d.tile, w)) continue;
      V.list.splice(V.list.indexOf(w), 1);
      this.cur.st.wishes++; this.P.tot.wishes++;
      const gr = this._grant('w:' + S.created + ':' + w.id, WISH_PTS, 0);
      this._dailyAdd('wish', 1);
      this.emit('wishDone', { w, pts: gr ? gr.pts : 0, key: key(d.tile.q, d.tile.r) });
    }
    // abgelaufen? Freundlich verabschieden
    for (const w of [...V.list]) if (placed - w.from >= w.turns) { V.list.splice(V.list.indexOf(w), 1); this.cur.st.left++; this.emit('wishGone', { w }); }
    // neuer Besuch alle 6–10 Kacheln, höchstens 2 gleichzeitig
    if (placed < V.next) return;
    const r = rng(hash('next', S.seed, S.created, V.n, placed));
    if (V.list.length >= MAX_VISITORS) { V.next = placed + 2; return; }
    const w = this._newWish();
    V.next = placed + 6 + Math.floor(r() * 5);
    if (w) { V.list.push(w); this.emit('visitor', { w }); }
  }
  _newWish() {
    const g = this.game, S = g.S, V = this.cur.vis, r = rng(hash('visit', S.seed, S.created, V.n));
    const tiles = [...g.board.values()], has = b => tiles.some(t => matchKind(t.k, b));
    const act = new Set(V.list.map(w => w.tpl)), actA = new Set(V.list.map(w => w.a)), sup = g.supply();
    const cand = WISHES.filter(W => !act.has(W.id) && !actA.has(W.a) && S.unlocked.includes(W.a) && (W.rel === 'edge' || has(W.b)))
      .map(W => [W, sup[W.a]?.n ? 3 : 1]);
    if (!cand.length) return null;
    let x = r() * cand.reduce((s, [, w]) => s + w, 0), W = cand[0][0];
    for (const [c, w] of cand) if ((x -= w) < 0) { W = c; break; }
    const who = VISITORS.filter(([n]) => !V.list.some(w => w.who === n)), [name, face] = who[Math.floor(r() * who.length)] || VISITORS[0];
    // Zuhause: ein Wohnhaus (sonst Dorf, sonst Brunnen), möglichst nicht dort, wo schon jemand wartet
    const used = new Set(V.list.map(w => w.home));
    let homes = tiles.filter(t => HOUSING.has(t.k)); if (!homes.length) homes = tiles.filter(t => GROUP[t.k] === 'dorf'); if (!homes.length) homes = tiles;
    const free = homes.filter(t => !used.has(key(t.q, t.r))), h0 = (free.length ? free : homes)[Math.floor(r() * (free.length || homes.length))];
    V.n++;
    return { id: V.n, tpl: W.id, a: W.a, who: name, face, home: key(h0.q, h0.r), from: S.stats.placed | 0, turns: 8 + Math.floor(r() * 5), line: Math.floor(r() * 3) };
  }

  // ---------- Rückgängig ----------
  _undo() {
    const S = this.game.S, B0 = this._before; this._before = null;
    if (!B0 || B0.created !== S.created || !B0.prog) { this._adopt(); this.emit('change'); return; }
    S.prog = this.cur = B0.prog;                                          // Besucher, Statistik, Belohnungen bleiben
    const placed = S.stats.placed | 0, dP = Math.max(0, B0.placed - placed);
    const dPf = Math.max(0, B0.perfect - (S.stats.perfect | 0)), dM = Math.max(0, B0.merges - (S.stats.merges | 0));
    if (S.mode !== 'kreativ') {
      const T = this.P.tot; T.placed = Math.max(0, T.placed - dP); T.perfect = Math.max(0, T.perfect - dPf); T.merges = Math.max(0, T.merges - dM);
      this._dailyAdd('count', -dP); this._dailyAdd('perfect', -dPf); this._dailyAdd('merge', -dM);
    }
    for (const g of this.cur.got) if (g.at > placed) { g.at = placed; this._apply(g); }   // Gutschriften, die der alte Stand nicht kennt
    this._snapLast(); this._save(); this.emit('change');
  }

  // ---------- Erfolge prüfen ----------
  _check() {
    const S = this.game.S; if (!S || S.mode === 'kreativ' || !this.cur) return [];
    const c = { S, P: this.P, st: this.cur.st, kinds: new Set([...this.game.board.values()].map(t => t.k).filter(k => k !== 'start')).size }, got = [];
    for (const b of BADGES) {
      let v = 0; try { v = num(b.val(c)); } catch { v = 0; }
      if (v > (this.P.best[b.id] || 0)) this.P.best[b.id] = v;
      if (this.P.badges[b.id] || v < b.goal) continue;
      this.P.badges[b.id] = Date.now(); this.P.stars += TIER_STARS[b.tier]; this.cur.st.badges.push(b.id); got.push(b);
    }
    for (const b of got) this.emit('badge', { b, stars: TIER_STARS[b.tier] });
    return got;
  }
}
