// Spiellogik ohne Grafik: Brett, Stapel, Punkte, Gruppen, Aufgaben, Freischaltungen, Verschmelzen, Rückgängig, Spielstand.
// Läuft auch in Node (tools/rules.mjs). Der Zufall steckt im Spielstand (S.rs), deshalb ist jede Insel reproduzierbar.
// Verschmelzen (Grundregel, abschaltbar über S.merge): Nach dem Setzen werden MERGE_N oder mehr zusammenhängende Kacheln
// exakt gleicher Art zur nächsten Stufe (MERGE) – an der gesetzten Stelle, die Partner-Felder werden frei. Kettenreaktion möglich.
// Die neue Kachel trägt ihr Gewicht t.n (so viele gesetzte Teile stecken in ihr); Gruppen zählen Gewichte (group().size),
// damit Verschmelzen große Wälder, Felder und Dörfer nicht schrumpfen lässt (Meilensteine, Aufgaben, Hausstufen).
import { DIRS, key, unkey, opp, neighbor, dist } from './hex.js';
import { TILES, KINDS, UNLOCKS, GROUP, GROUP_NAMES, ROAD_OK, affinity, edgesOf, MERGE, MERGE_N, LEVEL, mergeValue } from './tiles.js';

export const SAVE_VERSION = 1;
export const START_TILES = 30;
export const MILESTONES = [5, 10, 20, 35, 50, 75];
export const LEGACY_MERGE_MODE = 'verschmelzen';        // früherer eigener Modus: alte Stände werden zu „endlos“
const QUEST_N = { wald: [4, 9], feld: [3, 7], dorf: [3, 7], wasser: [3, 6], berg: [2, 4] };
const HOUSES = new Set(['haus', 'huette', 'reihe']);   // Wohnhäuser für die Hausstufe
export const weight = t => (t && t.n > 1 ? t.n : 1);
const STATS0 = { placed: 0, perfect: 0, quests: 0, playtime: 0, merges: 0, bestLevel: 1, bestKind: '' };

export class Game {
  constructor() { this.fns = []; this.undoStack = []; this.S = null; this.board = new Map(); }
  on(fn) { this.fns.push(fn); }
  emit(type, d = {}) { for (const f of this.fns) f(type, d); }

  // ---------- neues Spiel / laden / sichern ----------
  newGame({ mode = 'klassisch', seed = (Date.now() % 1e9) | 0, name = 'Meine Insel', merge = true } = {}) {
    if (mode === LEGACY_MERGE_MODE) mode = 'endlos';
    this.S = { v: SAVE_VERSION, name, mode, seed, rs: seed || 1, tiles: [], stack: [], pick: 0, score: 0, merge: merge !== false, hold: null,
      unlocked: [], quests: {}, ms: {}, best: {}, stats: { ...STATS0 },
      time: 9.5, day: 1, created: Date.now(), tut: 0 };
    this.board.clear(); this.undoStack = [];
    this._put({ k: 'start', q: 0, r: 0, o: 0 });
    this._unlockUpTo(0, true);
    if (mode === 'kreativ') this.S.unlocked = [...KINDS];
    this._refill(mode === 'klassisch' ? START_TILES : 5);
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
    T.hold = S.hold && TILES[S.hold.k] && S.hold.k !== 'start' ? { ...S.hold } : null;
    T.merge = S.merge !== false;
    T.stats.merges = T.stats.merges | 0; T.stats.bestLevel = T.stats.bestLevel || 1; T.stats.bestKind = TILES[T.stats.bestKind] ? T.stats.bestKind : '';
    // früherer Modus „Verschmelzen“ (begrenztes Spielfeld): wird eine Endlos-Insel, alles Gebaute bleibt
    if (T.mode === LEGACY_MERGE_MODE) { T.mode = 'endlos'; delete T.maxR; }
    if (T.mode === 'kreativ') T.hold = null;
    T.v = SAVE_VERSION; this.S = T; this.board.clear(); this.undoStack = [];
    for (const t of T.tiles) this.board.set(key(t.q, t.r), t);
    if (!this.board.size) this._put({ k: 'start', q: 0, r: 0, o: 0 });
    this._unlockUpTo(T.score, true);
    if (T.mode !== 'klassisch' && T.stack.length < 3) this._refill(5);
    this.emit('reset');
    return this;
  }
  _put(t) { this.S.tiles.push(t); this.board.set(key(t.q, t.r), t); }
  // Verschmelzen an/aus (Einstellung, gilt für diese Insel; Rückgängig behält den Schalter)
  setMerge(on) { if (!this.S) return; this.S.merge = on !== false; this.emit('stack'); }
  get merging() { return !!this.S && this.S.merge !== false; }

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
    const out = new Map();
    for (const t of this.board.values()) for (let i = 0; i < 6; i++) { const [q, r] = neighbor(t.q, t.r, i), k = key(q, r); if (!this.board.has(k)) out.set(k, [q, r]); }
    return [...out.values()];
  }
  freeSides(q, r) { let n = 0; for (let i = 0; i < 6; i++) if (!this.at(...neighbor(q, r, i))) n++; return n; }

  // Bewertung einer möglichen Kachel: gültig? Punkte je Kante, perfekt? Verschmelzungen (merges) samt Punkten sind in pts enthalten.
  evaluate(kind, q, r, o) {
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
    const place = pts + bonus, merges = this.previewMerge(kind, q, r), mergePts = merges.reduce((s, m) => s + m.pts, 0);
    return { ok: true, parts, pts: place + mergePts, place, bonus, perfect, nb, merges, mergePts, result: merges.length ? merges.at(-1).to : kind };
  }

  // Zusammenhängende Gruppe (gleiche GROUP) um eine Kachel; size = Summe der Gewichte (verschmolzene zählen mehrfach)
  group(q, r) {
    const t = this.at(q, r), g = t && GROUP[t.k]; if (!g) return { g: null, keys: [], size: 0 };
    const seen = new Set([key(q, r)]), todo = [[q, r]]; let size = weight(t);
    while (todo.length) { const [a, b] = todo.pop(); for (let i = 0; i < 6; i++) { const [c, d] = neighbor(a, b, i), k = key(c, d), n = this.board.get(k); if (n && !seen.has(k) && GROUP[n.k] === g) { seen.add(k); todo.push([c, d]); size += weight(n); } } }
    return { g, keys: [...seen], size };
  }
  // Hausstufe: ab 3 Wohnhäusern (Haus, Hütte, Häuserzeile; nach Gewicht) im Dorf zweistöckig, ab 6 mit Anbau
  stageOf(t) { if (t.k !== 'haus') return 1; let n = 0; for (const k of this.group(t.q, t.r).keys) { const x = this.board.get(k); if (HOUSES.has(x.k)) n += weight(x); } return n >= 6 ? 3 : n >= 3 ? 2 : 1; }

  // ---------- Verschmelzen ----------
  // Arten auf dem Brett als Map (Schlüssel → Art), optional mit einer gedachten Kachel
  _kinds(kind, q, r) { const m = new Map(); for (const [k, t] of this.board) m.set(k, t.k); if (kind) m.set(key(q, r), kind); return m; }
  // zusammenhängende Kacheln exakt gleicher Art um (q,r)
  _sameGroup(kinds, q, r) {
    const k0 = key(q, r), kind = kinds.get(k0); if (!kind) return [];
    const seen = new Set([k0]), todo = [[q, r]];
    while (todo.length) { const [a, b] = todo.pop(); for (let i = 0; i < 6; i++) { const [c, d] = neighbor(a, b, i), k = key(c, d); if (!seen.has(k) && kinds.get(k) === kind) { seen.add(k); todo.push([c, d]); } } }
    return [...seen];
  }
  // wie viele gleiche lägen nach dem Setzen beisammen? (Hilfe für die Vorschau)
  sameCount(kind, q, r) { return this._sameGroup(this._kinds(kind, q, r), q, r).length; }
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
  // Vorschau: was passiert, wenn Art kind auf (q,r) gesetzt wird? (Zustand bleibt unverändert; Schalter aus → nichts)
  previewMerge(kind, q, r) {
    if (!this.merging || !TILES[kind] || !MERGE[kind] || this.at(q, r)) return [];
    return this._mergeSteps(this._kinds(kind, q, r), q, r);
  }

  // ---------- Setzen ----------
  pick(i) { if (i >= 0 && i < this.S.stack.length) { this.S.pick = i; this.emit('stack'); } }
  // erste Kachel dieser Art im Vorrat wählen (Aufgaben-Kacheln zuletzt, außer quest = true)
  pickKind(k, quest = false) { const S = this.S; let i = S.stack.findIndex(e => e.k === k && !!e.quest === quest); if (i < 0) i = S.stack.findIndex(e => e.k === k); if (i >= 0) this.pick(i); return i; }
  supply() { const m = {}; for (const e of this.S.stack) { const c = (m[e.k] ||= { n: 0, quest: 0 }); c.n++; if (e.quest) c.quest++; } return m; }
  setKind(k) { if (this.S.mode === 'kreativ' && TILES[k]) { this.S.stack[0] = { k }; this.S.pick = 0; this.emit('stack'); } }
  _snap() { this.undoStack.push(JSON.stringify(this.S)); if (this.undoStack.length > 10) this.undoStack.shift(); }
  place(q, r, o) {
    const S = this.S, e = this.current(); if (!e) return { ok: false, why: 'Der Stapel ist leer.' };
    const ev = this.evaluate(e.k, q, r, o); if (!ev.ok) return ev;
    this._snap();
    const t = { k: e.k, q, r, o: ((o % 6) + 6) % 6 }; this._put(t);
    if (S.mode !== 'kreativ') { S.stack.splice(S.stack[S.pick] ? S.pick : 0, 1); S.pick = 0; }
    S.stats.placed++; if (ev.perfect) S.stats.perfect++;
    // Verschmelzen Schritt für Schritt: Brett ändern, dann melden (Stand beim Event = nach diesem Schritt)
    const merges = S.merge !== false && MERGE[t.k] ? this._mergeSteps(this._kinds(), q, r) : [];
    for (const m of merges) {
      const gone = new Set(m.keys);
      let w = weight(t); for (const k of m.keys) w += weight(this.board.get(k));
      t.n = w; m.n = w;
      for (const k of m.keys) this.board.delete(k);
      S.tiles = S.tiles.filter(x => !gone.has(key(x.q, x.r)));
      t.k = m.to; S.stats.merges++;
      this.emit('merge', { ...m });
    }
    for (const m of merges) for (const k of m.keys) this._moveQuest(k, m.at, t.k);
    const lvl = LEVEL[t.k] || 1;
    if (merges.length && (lvl > S.stats.bestLevel || (lvl === S.stats.bestLevel && !S.stats.bestKind))) { S.stats.bestLevel = lvl; S.stats.bestKind = t.k; }
    const ev2 = { ...ev, tile: t, placed: e.k, gained: [] };
    let pts = ev.pts, extra = 0;
    if (ev.perfect) { extra += 1; ev2.gained.push('Perfekt eingepasst: +10 und +1 Kachel'); }
    // ab hier zählt der Stand nach dem Verschmelzen (Gruppen, Aufgaben, Meilensteine, Hausstufen)
    const g = this.group(q, r);
    if (e.quest && g.g) S.quests[key(q, r)] = { g: g.g, n: g.size + e.quest };
    const done = [];
    for (const [k, Qs] of Object.entries(S.quests)) {
      if (Qs.done || !this.board.has(k)) continue; const [a, b] = unkey(k), gg = this.group(a, b);
      if (gg.g === Qs.g && gg.size >= Qs.n) { Qs.done = 1; S.stats.quests++; pts += 30; extra += 4; done.push({ key: k, ...Qs }); }
    }
    ev2.quests = done;
    const ms = [];
    if (g.g) {
      const size = g.size; S.best[g.g] = Math.max(S.best[g.g] || 0, size);
      let have = S.ms[g.g] || 0;
      while (have < MILESTONES.length && size >= MILESTONES[have]) { const m = MILESTONES[have]; have++; pts += m * 3; extra += 1 + have; ms.push({ g: g.g, size: m, name: GROUP_NAMES[g.g], tiles: 1 + have }); }
      S.ms[g.g] = have;
    }
    ev2.milestones = ms;
    const before = S.score; S.score += pts; ev2.total = pts;
    if (S.mode === 'klassisch') this._refill(extra); else if (S.stack.length < 5) this._refill(5 - S.stack.length);
    // Klassisch: Stapel leer, aber etwas im Ablagefach → es kommt zurück in den Vorrat
    if (S.mode === 'klassisch' && !S.stack.length && S.hold) { S.stack.push(S.hold); S.hold = null; }
    ev2.unlocked = this._unlockUpTo(S.score);
    ev2.extra = extra; ev2.before = before;
    this.emit('place', ev2);
    if (this.isOver()) this.emit('end', { score: S.score, ...this.mergeStats() });
    return ev2;
  }
  // offene Aufgabe einer verschmolzenen Partner-Kachel wandert zur neuen Stufe (gleiche Gruppe), sonst verfällt sie
  _moveQuest(from, to, kind) {
    const S = this.S, Q = S.quests[from]; if (!Q) return;
    delete S.quests[from];
    if (!Q.done && GROUP[kind] === Q.g && !S.quests[to]) S.quests[to] = Q;
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
    const playtime = this.S.stats.playtime, merge = this.S.merge;
    this.load(S); this.S.stats.playtime = playtime; this.S.merge = merge; this.undoStack = keep; this.emit('undo'); return true;
  }
  endless() { this.S.mode = 'endlos'; this._refill(5); this.emit('stack'); }
  // Ist die Partie vorbei? (nur Klassisch: Stapel und Ablagefach leer)
  isOver() { const S = this.S; return S.mode === 'klassisch' && !S.stack.length && !S.hold; }

  // Ablagefach (nicht im Kreativ-Modus): aktuelle Kachel parken oder mit der geparkten tauschen
  canHold() { const S = this.S; return !!S && S.mode !== 'kreativ' && (!!S.stack.length || !!S.hold); }
  hold() {
    const S = this.S; if (!S || S.mode === 'kreativ') return false;
    const i = S.stack[S.pick] ? S.pick : 0, e = S.stack[i];
    if (!e && !S.hold) return false;
    if (e && !S.hold && S.mode === 'klassisch' && S.stack.length <= 1) return false;  // letzte Kachel bleibt im Vorrat
    this._snap();
    const swapped = !!S.hold && !!e;
    if (swapped) { S.stack[i] = S.hold; S.hold = e; S.pick = i; }
    else if (e) { S.hold = e; S.stack.splice(i, 1); if (S.mode === 'endlos' && S.stack.length < 5) this._refill(1); S.pick = Math.max(0, Math.min(i, S.stack.length - 1)); }
    else { S.stack.push(S.hold); S.hold = null; S.pick = S.stack.length - 1; }          // Vorrat leer: zurückholen
    this.emit('hold', { hold: S.hold || e, swapped, back: !S.hold });
    this.emit('stack');
    return true;
  }
  mergeStats() {
    const S = this.S;
    return { score: S.score, placed: S.stats.placed, merges: S.stats.merges | 0, bestLevel: S.stats.bestLevel || 1, bestKind: S.stats.bestKind || '', tiles: this.board.size };
  }
}
