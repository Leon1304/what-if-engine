// Spiellogik ohne Grafik: Brett, Stapel, Punkte, Gruppen, Aufgaben, Freischaltungen, Rückgängig, Spielstand.
// Läuft auch in Node (tools/rules.mjs). Der Zufall steckt im Spielstand (S.rs), deshalb ist jede Insel reproduzierbar.
import { DIRS, key, unkey, opp, neighbor, dist } from './hex.js';
import { TILES, KINDS, UNLOCKS, GROUP, GROUP_NAMES, ROAD_OK, affinity, edgesOf, MERGE, MERGE_N, MERGE_POOL, MERGE_CHAINS, LEVEL, mergeValue } from './tiles.js';

export const SAVE_VERSION = 1;
export const START_TILES = 30;
export const MILESTONES = [5, 10, 20, 35, 50, 75];
export const MERGE_MODE = 'verschmelzen';
export const MERGE_R = 3;                              // Standard-Radius des Spielfelds (37 Felder)
export const MERGE_HAND = 3;                           // so viele Teile sind immer im Vorrat
const QUEST_N = { wald: [4, 9], feld: [3, 7], dorf: [3, 7], wasser: [3, 6], berg: [2, 4] };

export class Game {
  constructor() { this.fns = []; this.undoStack = []; this.S = null; this.board = new Map(); }
  on(fn) { this.fns.push(fn); }
  emit(type, d = {}) { for (const f of this.fns) f(type, d); }

  // ---------- neues Spiel / laden / sichern ----------
  newGame({ mode = 'klassisch', seed = (Date.now() % 1e9) | 0, name = 'Meine Insel', maxR = MERGE_R } = {}) {
    this.S = { v: SAVE_VERSION, name, mode, seed, rs: seed || 1, tiles: [], stack: [], pick: 0, score: 0,
      unlocked: [], quests: {}, ms: {}, best: {}, stats: { placed: 0, perfect: 0, quests: 0, playtime: 0 },
      time: 9.5, day: 1, created: Date.now(), tut: 0 };
    this.board.clear(); this.undoStack = [];
    this._put({ k: 'start', q: 0, r: 0, o: 0 });
    this._unlockUpTo(0, true);
    if (mode === 'kreativ') this.S.unlocked = [...KINDS];
    if (mode === MERGE_MODE) this._newMerge(maxR);
    else this._refill(mode === 'klassisch' ? START_TILES : 5);
    this.emit('reset');
    return this;
  }
  serialize() { return JSON.parse(JSON.stringify(this.S)); }
  load(S) {
    const base = new Game().newGame({ seed: S.seed || 1 }).S;            // Grundwerte für Felder, die ältere Stände nicht kennen
    const T = { ...base, ...S, stats: { ...base.stats, ...(S.stats || {}) } };
    T.tiles = (S.tiles || []).filter(t => TILES[t.k]);                    // unbekannte Kacheln überspringen
    T.stack = (S.stack || []).filter(e => TILES[e.k] && e.k !== 'start');
    T.unlocked = (S.unlocked || []).filter(k => TILES[k]);
    const M = T.mode === MERGE_MODE;
    if (M) {                                                              // Verschmelzen: Felder, die ältere Stände nicht kennen
      T.maxR = Number.isFinite(S.maxR) && S.maxR > 0 ? S.maxR | 0 : MERGE_R;
      T.hold = S.hold && TILES[S.hold.k] && S.hold.k !== 'start' ? { k: S.hold.k } : null;
      T.stats.merges = T.stats.merges | 0; T.stats.bestLevel = T.stats.bestLevel || 1; T.stats.bestKind = T.stats.bestKind || '';
      T.tiles = T.tiles.filter(t => dist(t.q, t.r, 0, 0) <= T.maxR);
    }
    T.v = SAVE_VERSION; this.S = T; this.board.clear(); this.undoStack = [];
    for (const t of T.tiles) this.board.set(key(t.q, t.r), t);
    if (!this.board.size) this._put({ k: 'start', q: 0, r: 0, o: 0 });
    if (M) { if (T.stack.length < MERGE_HAND) this._refillMerge(); }
    else {
      this._unlockUpTo(T.score, true);
      if (T.mode !== 'klassisch' && T.stack.length < 3) this._refill(5);
    }
    this.emit('reset');
    return this;
  }
  _put(t) { this.S.tiles.push(t); this.board.set(key(t.q, t.r), t); }

  // ---------- Zufall ----------
  rand() { let t = (this.S.rs = (this.S.rs + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  _draw() {
    const pool = this.S.unlocked.map(k => [k, TILES[k].w]);
    const last = this.S.stack.slice(-2).map(e => e.k);
    let tot = 0; for (const [k, w] of pool) tot += (last.length === 2 && last[0] === k && last[1] === k) ? 0 : w;
    let x = this.rand() * tot, k = pool[0][0];
    for (const [kk, w] of pool) { const ww = (last.length === 2 && last[0] === kk && last[1] === kk) ? 0 : w; if ((x -= ww) < 0) { k = kk; break; } }
    const e = { k }; const g = GROUP[k];
    if (g && QUEST_N[g] && this.S.mode !== 'kreativ' && this.rand() < .16) { const [a, b] = QUEST_N[g]; e.quest = a + Math.floor(this.rand() * (b - a + 1)); }
    return e;
  }
  _refill(n) { for (let i = 0; i < n; i++) this.S.stack.push(this._draw()); }

  // ---------- Abfragen ----------
  at(q, r) { return this.board.get(key(q, r)); }
  edges(t) { return edgesOf(t.k, t.o); }
  current() { return this.S.stack[this.S.pick] || this.S.stack[0]; }
  slots() {
    if (this.S.mode === MERGE_MODE) return this._field().filter(([q, r]) => !this.board.has(key(q, r)));
    const out = new Map();
    for (const t of this.board.values()) for (let i = 0; i < 6; i++) { const [q, r] = neighbor(t.q, t.r, i), k = key(q, r); if (!this.board.has(k)) out.set(k, [q, r]); }
    return [...out.values()];
  }
  freeSides(q, r) { let n = 0; for (let i = 0; i < 6; i++) if (!this.at(...neighbor(q, r, i))) n++; return n; }

  // Bewertung einer möglichen Kachel: gültig? Punkte je Kante, perfekt?
  evaluate(kind, q, r, o) {
    if (this.S.mode === MERGE_MODE) return this._evalMerge(kind, q, r);
    if (this.at(q, r)) return { ok: false, why: 'Hier liegt schon eine Kachel.' };
    const E = edgesOf(kind, o), parts = []; let nb = 0, good = 0, pts = 0, why = '';
    for (let i = 0; i < 6; i++) {
      const n = this.at(...neighbor(q, r, i)); if (!n) continue; nb++;
      const a = E[i], b = this.edges(n)[opp(i)];
      if ((a === 'w' && b !== 'w' && b !== 'l') || (b === 'w' && a !== 'w' && a !== 'l')) { why = 'Ein Bach muss an einen Bach oder See anschließen.'; parts.push({ i, pts: 0, bad: true }); continue; }
      let p = affinity(kind, n.k), label = '';
      if (a === 'w' && b === 'w') { p += 3; label = 'Bach verbunden'; }
      else if ((a === 'w' && b === 'l') || (a === 'l' && b === 'w')) { p += 3; label = 'Bach mündet in den See'; }
      else if (a === 'r' && b === 'r') { p += 2; label = 'Weg verbunden'; }
      else if ((a === 'r' && b === 'g' && ROAD_OK.has(n.k)) || (b === 'r' && a === 'g' && ROAD_OK.has(kind))) { p += 2; label = 'Weg verbindet sich'; }
      if (p > 0) good++;
      parts.push({ i, pts: p, label }); pts += p;
    }
    if (!nb && this.board.size) return { ok: false, why: 'Kacheln müssen an die Insel anschließen.' };
    if (why) return { ok: false, why, parts };
    let perfect = nb === 6 && good === 6, bonus = 0;
    if (perfect) bonus += 10;
    if (TILES[kind].edgeBonus) bonus += TILES[kind].edgeBonus * (6 - nb);
    return { ok: true, parts, pts: pts + bonus, bonus, perfect, nb };
  }

  // Zusammenhängende Gruppe (gleiche GROUP) um eine Kachel
  group(q, r) {
    const t = this.at(q, r), g = t && GROUP[t.k]; if (!g) return { g: null, keys: [] };
    const seen = new Set([key(q, r)]), todo = [[q, r]];
    while (todo.length) { const [a, b] = todo.pop(); for (let i = 0; i < 6; i++) { const [c, d] = neighbor(a, b, i), k = key(c, d), n = this.board.get(k); if (n && !seen.has(k) && GROUP[n.k] === g) { seen.add(k); todo.push([c, d]); } } }
    return { g, keys: [...seen] };
  }
  stageOf(t) { if (t.k !== 'haus') return 1; const n = this.group(t.q, t.r).keys.filter(k => this.board.get(k).k === 'haus').length; return n >= 6 ? 3 : n >= 3 ? 2 : 1; }

  // ---------- Setzen ----------
  pick(i) { if (i >= 0 && i < this.S.stack.length) { this.S.pick = i; this.emit('stack'); } }
  // erste Kachel dieser Art im Vorrat wählen (Aufgaben-Kacheln zuletzt, außer quest = true)
  pickKind(k, quest = false) { const S = this.S; let i = S.stack.findIndex(e => e.k === k && !!e.quest === quest); if (i < 0) i = S.stack.findIndex(e => e.k === k); if (i >= 0) this.pick(i); return i; }
  supply() { const m = {}; for (const e of this.S.stack) { const c = (m[e.k] ||= { n: 0, quest: 0 }); c.n++; if (e.quest) c.quest++; } return m; }
  setKind(k) { if (this.S.mode === 'kreativ' && TILES[k]) { this.S.stack[0] = { k }; this.S.pick = 0; this.emit('stack'); } }
  place(q, r, o) {
    if (this.S.mode === MERGE_MODE) return this._placeMerge(q, r, o);
    const S = this.S, e = this.current(); if (!e) return { ok: false, why: 'Der Stapel ist leer.' };
    const ev = this.evaluate(e.k, q, r, o); if (!ev.ok) return ev;
    this.undoStack.push(JSON.stringify(S)); if (this.undoStack.length > 10) this.undoStack.shift();
    const t = { k: e.k, q, r, o: ((o % 6) + 6) % 6 }; this._put(t);
    if (S.mode !== 'kreativ') { S.stack.splice(S.pick, 1); S.pick = 0; }
    S.stats.placed++; if (ev.perfect) S.stats.perfect++;
    const ev2 = { ...ev, tile: t, gained: [] };
    let pts = ev.pts, extra = 0;
    if (ev.perfect) { extra += 1; ev2.gained.push('Perfekt eingepasst: +10 und +1 Kachel'); }
    // Aufgabe an dieser Kachel?
    const g = this.group(q, r);
    if (e.quest && g.g) S.quests[key(q, r)] = { g: g.g, n: g.keys.length + e.quest };
    // Aufgaben prüfen (alle offenen)
    const done = [];
    for (const [k, Qs] of Object.entries(S.quests)) {
      if (Qs.done || !this.board.has(k)) continue; const [a, b] = unkey(k), gg = this.group(a, b);
      if (gg.keys.length >= Qs.n) { Qs.done = 1; S.stats.quests++; pts += 30; extra += 4; done.push({ key: k, ...Qs }); }
    }
    ev2.quests = done;
    // Meilensteine (Gruppengröße)
    const ms = [];
    if (g.g) {
      const size = g.keys.length; S.best[g.g] = Math.max(S.best[g.g] || 0, size);
      let have = S.ms[g.g] || 0;
      while (have < MILESTONES.length && size >= MILESTONES[have]) { const m = MILESTONES[have]; have++; pts += m * 3; extra += 1 + have; ms.push({ g: g.g, size: m, name: GROUP_NAMES[g.g], tiles: 1 + have }); }
      S.ms[g.g] = have;
    }
    ev2.milestones = ms;
    const before = S.score; S.score += pts; ev2.total = pts;
    if (S.mode === 'klassisch') this._refill(extra); else if (S.stack.length < 5) this._refill(5 - S.stack.length);
    ev2.unlocked = this._unlockUpTo(S.score);
    ev2.extra = extra; ev2.before = before;
    this.emit('place', ev2);
    if (!S.stack.length) this.emit('end', { score: S.score });
    return ev2;
  }
  _unlockUpTo(score, silent) {
    const got = [];
    for (const u of UNLOCKS) if (score >= u.at) for (const k of u.kinds) if (!this.S.unlocked.includes(k)) {
      this.S.unlocked.push(k); got.push(k);
      if (!silent && this.S.mode === 'klassisch') { for (let i = 0; i < 2; i++) this.S.stack.splice(Math.min(this.S.stack.length, 2 + Math.floor(this.rand() * 5)), 0, { k }); }
    }
    if (got.length && !silent) this.emit('unlock', { kinds: got });
    return got;
  }
  nextUnlock() { return UNLOCKS.find(u => u.at > this.S.score && u.kinds.some(k => !this.S.unlocked.includes(k))); }
  canUndo() { return this.undoStack.length > 0; }
  undo() {
    if (!this.undoStack.length) return false;
    const S = JSON.parse(this.undoStack.pop()), keep = this.undoStack;
    const playtime = this.S.stats.playtime; this.load(S); this.S.stats.playtime = playtime; this.undoStack = keep; this.emit('undo'); return true;
  }
  endless() { this.S.mode = 'endlos'; this._refill(5); this.emit('stack'); }
  // Ist die Partie vorbei? (Klassisch: Stapel leer, Verschmelzen: kein freies Feld)
  isOver() { const S = this.S; return S.mode === MERGE_MODE ? !this.slots().length : S.mode === 'klassisch' && !S.stack.length; }

  // ================= Modus „Verschmelzen“ =================
  // Spielfeld: alle Felder mit Abstand ≤ S.maxR um (0,0); gesetzt wird auf jedes freie Feld.
  inField(q, r) { return dist(q, r, 0, 0) <= (this.S.maxR ?? MERGE_R); }
  _field() {
    const R = this.S.maxR ?? MERGE_R, out = [];
    for (let q = -R; q <= R; q++) for (let r = Math.max(-R, -q - R); r <= Math.min(R, -q + R); r++) out.push([q, r]);
    return out;
  }
  _newMerge(maxR) {
    const S = this.S;
    S.maxR = Math.max(1, maxR | 0); S.hold = null;
    Object.assign(S.stats, { merges: 0, bestLevel: 1, bestKind: '' });
    S.unlocked = [...new Set(MERGE_CHAINS.flatMap(c => c.kinds))];        // alles, was im Modus vorkommen kann (Handbuch)
    // 3–5 Grundteile verstreut, keine fertige Dreiergruppe
    const base = Object.keys(MERGE_POOL).filter(k => LEVEL[k] === 1);
    const n = 3 + Math.floor(this.rand() * 3);
    for (let i = 0, tries = 0; i < n && tries < 200; tries++) {
      const free = this.slots().filter(([q, r]) => q || r), [q, r] = free[Math.floor(this.rand() * free.length)];
      const k = this._weighted(base.map(b => [b, MERGE_POOL[b]]));
      if (this._sameGroup(this._kinds(k, q, r), q, r).length >= MERGE_N) continue;
      this._put({ k, q, r, o: Math.floor(this.rand() * 6) }); i++;
    }
    this._refillMerge();
  }
  _weighted(pool) { let tot = 0; for (const [, w] of pool) tot += w; let x = this.rand() * tot; for (const [k, w] of pool) if ((x -= w) < 0) return k; return pool[0][0]; }
  _drawMerge() { return { k: this._weighted(Object.entries(MERGE_POOL)) }; }
  _refillMerge() { while (this.S.stack.length < MERGE_HAND) this.S.stack.push(this._drawMerge()); }
  // Arten auf dem Brett als Map (Schlüssel → Art), optional mit einer gedachten Kachel
  _kinds(kind, q, r) { const m = new Map(); for (const [k, t] of this.board) m.set(k, t.k); if (kind) m.set(key(q, r), kind); return m; }
  // zusammenhängende Kacheln exakt gleicher Art um (q,r)
  _sameGroup(kinds, q, r) {
    const k0 = key(q, r), kind = kinds.get(k0); if (!kind) return [];
    const seen = new Set([k0]), todo = [[q, r]];
    while (todo.length) { const [a, b] = todo.pop(); for (let i = 0; i < 6; i++) { const [c, d] = neighbor(a, b, i), k = key(c, d); if (!seen.has(k) && kinds.get(k) === kind) { seen.add(k); todo.push([c, d]); } } }
    return [...seen];
  }
  // Kettenreaktion durchrechnen (verändert nur die übergebene Map)
  _mergeSteps(kinds, q, r) {
    const at = key(q, r), steps = [];
    for (let step = 0; ; step++) {
      const from = kinds.get(at), to = MERGE[from]; if (!to) break;
      const grp = this._sameGroup(kinds, q, r), size = grp.length; if (size < MERGE_N) break;
      const mult = 1.5 ** step, v = mergeValue(to);
      const bonus = Math.round(v * (size - MERGE_N) * mult);              // mehr als 3 gleiche: jede weitere zählt doppelt
      const pts = Math.round(v * size * mult) + bonus;
      const keys = grp.filter(k => k !== at);
      for (const k of keys) kinds.delete(k); kinds.set(at, to);
      steps.push({ from, to, keys, at, pts, bonus, size, level: LEVEL[to], step });
    }
    return steps;
  }
  // Vorschau: was passiert, wenn Art kind auf (q,r) gesetzt wird? (Zustand bleibt unverändert)
  previewMerge(kind, q, r) {
    if (!TILES[kind] || this.at(q, r) || !this.inField(q, r)) return [];
    return this._mergeSteps(this._kinds(kind, q, r), q, r);
  }
  _whyMerge(q, r) { return this.at(q, r) ? 'Hier liegt schon eine Kachel.' : !this.inField(q, r) ? 'Außerhalb des Spielfelds.' : ''; }
  _evalMerge(kind, q, r) {
    const why = this._whyMerge(q, r); if (why) return { ok: false, why };
    let nb = 0; for (let i = 0; i < 6; i++) if (this.at(...neighbor(q, r, i))) nb++;
    const merges = this.previewMerge(kind, q, r), place = LEVEL[kind] || 1, mergePts = merges.reduce((s, m) => s + m.pts, 0);
    return { ok: true, parts: [], pts: place + mergePts, place, mergePts, merges, bonus: 0, perfect: false, nb,
      result: merges.length ? merges.at(-1).to : kind };
  }
  _snap() { this.undoStack.push(JSON.stringify(this.S)); if (this.undoStack.length > 10) this.undoStack.shift(); }
  _placeMerge(q, r, o = 0) {
    const S = this.S, e = this.current(); if (!e) return { ok: false, why: 'Der Stapel ist leer.' };
    const ev = this._evalMerge(e.k, q, r); if (!ev.ok) return ev;
    this._snap();
    const t = { k: e.k, q, r, o: ((o % 6) + 6) % 6 }; this._put(t);
    S.stack.splice(S.stack[S.pick] ? S.pick : 0, 1); S.pick = 0;
    S.stats.placed++;
    // Verschmelzen Schritt für Schritt: Brett ändern, dann melden (Stand beim Event = nach diesem Schritt)
    const merges = this._mergeSteps(this._kinds(), q, r);
    for (const m of merges) {
      const gone = new Set(m.keys);
      for (const k of m.keys) this.board.delete(k);
      S.tiles = S.tiles.filter(x => !gone.has(key(x.q, x.r)));
      t.k = m.to; S.stats.merges++;
      this.emit('merge', { ...m });
    }
    const lvl = LEVEL[t.k] || 1;
    if (lvl > S.stats.bestLevel || (lvl === S.stats.bestLevel && !S.stats.bestKind)) { S.stats.bestLevel = lvl; S.stats.bestKind = t.k; }
    const before = S.score, total = ev.place + merges.reduce((s, m) => s + m.pts, 0);
    S.score += total;
    this._refillMerge();
    const ev2 = { ...ev, tile: t, placed: e.k, merges, total, before, gained: [], quests: [], milestones: [], unlocked: [], extra: 0 };
    this.emit('place', ev2);
    if (this.isOver()) this.emit('end', this.mergeStats());
    return ev2;
  }
  // Ablagefach: aktuelle Kachel parken (leeres Fach → Nachschub) oder mit der geparkten tauschen
  hold() {
    const S = this.S; if (S.mode !== MERGE_MODE) return false;
    const i = S.stack[S.pick] ? S.pick : 0, e = S.stack[i]; if (!e) return false;
    this._snap();
    const swapped = !!S.hold;
    if (swapped) { S.stack[i] = S.hold; S.hold = e; }
    else { S.hold = e; S.stack.splice(i, 1); this._refillMerge(); S.pick = Math.min(i, S.stack.length - 1); }
    this.emit('hold', { hold: S.hold, swapped });
    this.emit('stack');
    return true;
  }
  mergeStats() {
    const S = this.S;
    return { score: S.score, placed: S.stats.placed, merges: S.stats.merges | 0, bestLevel: S.stats.bestLevel || 1, bestKind: S.stats.bestKind || '',
      tiles: this.board.size, free: this.slots().length };
  }
}
