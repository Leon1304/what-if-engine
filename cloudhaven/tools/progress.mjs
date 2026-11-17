// Fortschritt ohne Browser (echte Spiellogik): node cloudhaven/tools/progress.mjs → endet mit PROGRESS OK
// Erfolge (auch über Neuladen), Tagesaufgaben je Datum deterministisch und erfüllbar, Besucher-Wünsche erfüllt/abgelaufen,
// Belohnungen, Rückgängig (Erfolge bleiben, Belohnungen nie doppelt), Kreativ ruht, kaputter Speicher stürzt nicht ab.
import { Game } from '../js/game.js';
import { TILES, KINDS, GROUP, MERGE } from '../js/tiles.js';
import { neighbor, key } from '../js/hex.js';
import { Progress, BADGES, BADGE_BY, TASK_TYPES, WISHES, WISH_BY, tasksFor, dayKey, matchKind, wishFits, PROGRESS_KEY,
  DAILY_PTS, DAILY_TILES, WISH_PTS, MAX_VISITORS, ROW_KINDS } from '../js/progress.js';
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };

// ---------- Hilfen ----------
const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m }; };
const at = (y, mo, d, h = 12) => () => new Date(y, mo - 1, d, h);
const DAY = at(2026, 11, 16);
function mk({ mode = 'endlos', seed = 7, storage = mem(), now = DAY, env = () => ({ time: 12, season: 1 }), visitors = () => true } = {}) {
  const g = new Game().newGame({ mode, seed }); g.S.created = 1000 + seed;
  const p = new Progress(g, { storage, now, env, visitors }), ev = [];
  p.on((t, d) => ev.push([t, d]));
  return { g, p, ev, storage, count: t => ev.filter(e => e[0] === t).length };
}
const force = (g, k, quest) => { g.S.stack.splice(g.S.pick, 0, quest ? { k, quest } : { k }); };
const adjTo = (g, test) => (q, r) => { for (let i = 0; i < 6; i++) { const n = g.at(...neighbor(q, r, i)); if (n && test(n)) return true; } return false; };
// Art k an die beste gültige Stelle (optional nur Felder, die filter erfüllen); null, wenn es keine gibt
function put(g, k, filter = () => true, quest) {
  let best = null;
  for (const [q, r] of g.slots()) { if (!filter(q, r)) continue; for (let o = 0; o < 6; o++) { const e = g.evaluate(k, q, r, o); if (e.ok && (!best || e.pts > best.e.pts)) best = { q, r, o, e }; } }
  if (!best) return null;
  force(g, k, quest); return g.place(best.q, best.r, best.o);
}
function bestMove(g) {
  const c = g.current(); if (!c) return null; let best = null;
  for (const [q, r] of g.slots()) for (let o = 0; o < 6; o++) { const e = g.evaluate(c.k, q, r, o); if (e.ok && (!best || e.pts > best.e.pts)) best = { q, r, o, e }; }
  if (!best) { g.S.stack.splice(g.S.pick, 1); return null; }
  return g.place(best.q, best.r, best.o);
}
const kindOf = b => (typeof b === 'string' && b[0] === '@' ? { wald: 'wald', wasser: 'bach', dorf: 'haus', feld: 'feld', berg: 'berg' }[b.slice(1)] : Array.isArray(b) ? b.find(k => k !== 'start') || b[0] : b);
// Wunsch erfüllen: a neben b (b wird bei Bedarf gesetzt) bzw. Leuchtturm an den Rand
function solveWish(g, w) {
  const W = WISH_BY[w.tpl];
  if (W.rel === 'edge') return put(g, W.a, (q, r) => g.freeSides(q, r) >= 4);
  if (![...g.board.values()].some(t => matchKind(t.k, W.b))) put(g, kindOf(W.b));
  let res = put(g, W.a, adjTo(g, n => matchKind(n.k, W.b)));
  if (!res) { put(g, kindOf(W.b), adjTo(g, () => true)); res = put(g, W.a, adjTo(g, n => matchKind(n.k, W.b))); }
  return res;
}
// perfekter Zug: Nachbarn eines freien Feldes mit See füllen, dann eine Wiese hinein
function perfectMove(g) {
  const N = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
  for (const [q, r] of g.slots()) {
    if (N.some(([a, b], i) => { const n = g.at(q + a, r + b); return n && g.edges(n)[(i + 3) % 6] === 'w'; })) continue;
    for (let pass = 0; pass < 6; pass++) for (const [a, b] of N) if (!g.at(q + a, r + b)) { force(g, 'see'); if (!g.place(q + a, r + b, 0).ok) g.S.stack.splice(g.S.pick, 1); }
    if (N.some(([a, b]) => !g.at(q + a, r + b))) continue;
    force(g, 'wiese'); return g.place(q, r, 0);
  }
  return null;
}
// Brett leeren (nur Brunnen) und Kacheln direkt hinlegen (Verschmelzen ist eine Grundregel in jedem Modus)
function mergeBoard(g, tiles) {
  g.S.tiles = g.S.tiles.filter(t => t.k === 'start'); g.board.clear(); for (const t of g.S.tiles) g.board.set(key(t.q, t.r), t);
  for (const [k, q, r] of tiles) g._put({ k, q, r, o: 0 });
}
const mergeAt = (g, k, q, r) => { g.S.stack[0] = { k }; g.S.pick = 0; return g.place(q, r, 0); };
const taskDone = (p, type) => p.daily().tasks.find(x => x.type === type)?.done;
// Tag finden, an dem eine Aufgabe dieser Art (optional mit Bedingung) dran ist
function dayWith(type, test = () => true) {
  for (let i = 0; i < 2000; i++) { const d = new Date(2026, 10, 16 + i), T = tasksFor(dayKey(d)).find(x => x.type === type && test(x)); if (T) return { now: () => d, T, day: dayKey(d) }; }
  return null;
}

// ================= Tagesaufgaben: deterministisch, gültig =================
console.log('Tagesaufgaben');
ok(JSON.stringify(tasksFor('2026-11-16')) === JSON.stringify(tasksFor('2026-11-16')), 'gleicher Tag → gleiche Aufgaben');
const year = [...Array(365)].map((_, i) => dayKey(new Date(2026, 0, 1 + i)));
ok(year.every(d => { const T = tasksFor(d); return T.length === 3 && new Set(T.map(x => x.type)).size === 3; }), '365 Tage: je 3 Aufgaben, nie zwei gleiche Arten');
ok(new Set(year.map(d => JSON.stringify(tasksFor(d)))).size > 300, 'Aufgaben wechseln von Tag zu Tag');
ok(Object.keys(TASK_TYPES).every(t => year.some(d => tasksFor(d).some(x => x.type === t))), 'jede Aufgabenart kommt im Jahr vor');
ok(year.every(d => tasksFor(d).every(x => x.goal > 0 && (x.type !== 'next' || (TILES[x.a] && x.id)) && (x.type !== 'row' || ROW_KINDS[x.k]))), 'Parameter gültig (Kacheln existieren)');
ok(dayKey(new Date(2026, 10, 16, 23, 59)) === '2026-11-16' && dayKey(new Date(2026, 10, 17, 0, 1)) === '2026-11-17', 'Kalendertag nach Ortszeit');

// jede Aufgabe ist erfüllbar (echte Spielzüge)
const solved = {};
for (const type of Object.keys(TASK_TYPES)) {
  const variants = type === 'next' ? NEXT_IDS() : type === 'row' ? Object.keys(ROW_KINDS) : [null];
  for (const v of variants) {
    const f = dayWith(type, x => v == null || x.id === v || x.k === v); if (!f) { ok(false, `kein Tag mit ${type} ${v || ''}`); continue; }
    const T = f.T, night = type === 'night';
    const E = mk({ mode: 'endlos', seed: 31, now: f.now, env: () => ({ time: night ? 23 : 12, season: 1 }) }), { g, p } = E;
    if (type === 'merge') for (let i = 0; i < T.goal; i++) { mergeBoard(g, [['felsen', 1, 0], ['felsen', 2, 0]]); mergeAt(g, 'felsen', 3, 0); }
    else if (type === 'row') { const set = new Set(ROW_KINDS[T.k]); put(g, T.k); for (let i = 1; i < T.goal; i++) put(g, T.k, adjTo(g, n => set.has(n.k) || (n.n > 1 && ROW_KINDS[T.k].some(k => MERGE[k] === n.k)))); }
    else if (type === 'next') { put(g, kindOf(T.b), adjTo(g, () => true)); put(g, T.a, adjTo(g, n => matchKind(n.k, T.b))); }
    else if (type === 'score') { for (let i = 0; i < 400 && g.S.score < T.goal; i++) bestMove(g); }
    else if (type === 'count') { for (let i = 0; i < T.goal; i++) put(g, 'wiese'); }
    else if (type === 'kinds') { for (const k of ['wiese', 'wald', 'haus', 'weg', 'feld', 'teich', 'schafe', 'obst', 'imker'].slice(0, T.goal)) put(g, k); }
    else if (type === 'perfect') { for (let i = 0; i < T.goal; i++) perfectMove(g); }
    else if (type === 'quest') { const r0 = put(g, 'wald', () => true, 2), t0 = r0.tile; put(g, 'wald', adjTo(g, n => n === g.at(t0.q, t0.r))); put(g, 'wald', adjTo(g, n => n.k === 'wald')); }
    else if (type === 'night') put(g, 'wiese');
    else if (type === 'wish') { for (let i = 0; i < 200 && !taskDone(p, 'wish'); i++) { const w = p.wishes()[0]; if (w) solveWish(g, w); else put(g, 'wiese'); } }
    const done = taskDone(p, type); solved[type] = (solved[type] || 0) + (done ? 1 : 0);
    if (!done) ok(false, `Aufgabe ${type} ${v || ''} am ${f.day} nicht geschafft: ${JSON.stringify(p.daily().tasks.find(x => x.type === type))}`);
    if (done) { const i = p.daily().tasks.findIndex(x => x.type === type), s0 = g.S.score, n0 = g.S.stack.length, st0 = p.P.stars, r = p.claimDaily(i);
      if (!(r && g.S.score === s0 + DAILY_PTS && p.P.stars === st0 + 1 && g.S.stack.length === n0 && !p.claimDaily(i))) ok(false, `Abholen ${type}: ${JSON.stringify(r)}`); }
  }
}
function NEXT_IDS() { return [...new Set(year.flatMap(d => tasksFor(d).filter(x => x.type === 'next').map(x => x.id)))]; }
ok(Object.keys(TASK_TYPES).every(t => solved[t] > 0), 'jede Aufgabenart in echten Zügen erfüllt und abgeholt: ' + Object.entries(solved).map(([k, v]) => k + ' ' + v).join(', '));

// Abholen im Klassisch-Modus: +25 Punkte, +2 Kacheln, +1 ⭐; Rückgängig hebt nichts doppelt auf
{
  const f = dayWith('count'), E = mk({ mode: 'klassisch', seed: 5, now: f.now }), { g, p } = E;
  const i = p.daily().tasks.findIndex(x => x.type === 'count');
  for (let n = 0; n < f.T.goal - 2; n++) put(g, 'wiese');
  put(g, 'wiese'); g.undo();
  ok(!p.daily().tasks[i].done && p.daily().tasks[i].val === f.T.goal - 2, `Rückgängig zählt die Aufgabe zurück (${f.T.goal - 2}/${f.T.goal})`);
  put(g, 'wiese');
  const s0 = g.S.score, n0 = g.S.stack.length; put(g, 'wiese');
  const s1 = g.S.score, n1 = g.S.stack.length;
  ok(p.daily().tasks[i].done && E.count('daily') >= 1, 'Aufgabe geschafft → Ereignis daily');
  const r = p.claimDaily(i);
  ok(r && g.S.score === s1 + DAILY_PTS && g.S.stack.length === n1 + DAILY_TILES && r.kinds.length === DAILY_TILES, `Klassisch: +${DAILY_PTS} Punkte, +${DAILY_TILES} Kacheln (${r?.kinds})`);
  ok(p.claimDaily(i) === null, 'zweites Abholen bringt nichts');
  g.undo();   // Zug vor dem Abholen zurück: Belohnung bleibt (wird wieder gutgeschrieben)
  ok(g.S.score === s0 + DAILY_PTS && g.S.stack.length === n0 + 1 + DAILY_TILES && p.daily().tasks[i].claimed, `Rückgängig: Belohnung bleibt genau einmal (${g.S.score} = ${s0} + ${DAILY_PTS}, Vorrat ${g.S.stack.length} = ${n0} + ${DAILY_TILES})`);
  put(g, 'wiese'); const s2 = g.S.score; g.undo();
  ok(g.S.score === s0 + DAILY_PTS && s2 > s0 + DAILY_PTS, 'erneut setzen + rückgängig: keine doppelte Gutschrift');
  ok(p.claimDaily(i) === null && p.daily().tasks[i].done, 'Aufgabe bleibt erledigt und abgeholt');
}
// neuer Tag → neue Aufgaben, Fortschritt gespeichert
{
  const st = mem(); let now = new Date(2026, 10, 16, 23, 50);
  const E = mk({ seed: 3, storage: st, now: () => now }); for (let i = 0; i < 4; i++) put(E.g, 'wiese');
  const d1 = E.p.daily(); now = new Date(2026, 10, 17, 0, 10); const d2 = E.p.daily();
  ok(d1.day === '2026-11-16' && d2.day === '2026-11-17' && d2.tasks.every(x => !x.done && !x.val) && JSON.stringify(d2.tasks.map(x => x.type)) === JSON.stringify(tasksFor('2026-11-17').map(x => x.type)), 'Mitternacht: neue Aufgaben, Fortschritt auf 0');
  put(E.g, 'wiese'); const P2 = new Progress(new Game().newGame({ seed: 1 }), { storage: st, now: () => now });
  ok(JSON.stringify(P2.daily()) === JSON.stringify(E.p.daily()), 'Tagesstand bleibt nach Neuladen');
}

// ================= Erfolge =================
console.log('Erfolge');
{
  const st = mem(), E = mk({ seed: 7, storage: st }), { g, p } = E;
  for (let i = 0; i < 230; i++) bestMove(g);
  const P = p.P, got = Object.keys(P.badges);
  ok(P.tot.placed === g.S.stats.placed && P.tot.placed >= 200, `${P.tot.placed} Kacheln gezählt`);
  for (const id of ['first', 'placed10', 'placed50', 'placed200', 'milestone', 'score300', 'score1000', 'quests5']) ok(P.badges[id], `Erfolg ${id}`);
  ok(E.count('badge') === got.length && got.every(id => BADGE_BY[id]), `${got.length} Erfolge, je ein Ereignis`);
  // jeder Erfolg passt zu seiner Bedingung, keiner fehlt
  const c = { S: g.S, P, st: p.cur.st, kinds: new Set([...g.board.values()].map(t => t.k).filter(k => k !== 'start')).size };
  const wrong = BADGES.filter(b => !!P.badges[b.id] !== (P.best[b.id] >= b.goal) || (b.scope === 'island' ? b.val(c) >= b.goal && !P.badges[b.id] : false));
  ok(!wrong.length, 'Erfolge stimmen mit Bedingungen überein' + (wrong.length ? ': ' + wrong.map(b => b.id).join(', ') : ''));
  ok(P.stars === got.reduce((s, id) => s + BADGE_BY[id].tier, 0) + P.daily.claimed.filter(Boolean).length, `Sterne ${P.stars} = Bronze 1 · Silber 2 · Gold 3`);
  ok(p.cur.st.badges.length === got.length && g.S.prog === p.cur, 'Inselstatistik: auf dieser Insel verdiente Erfolge');
  // Neuladen (Spielstand + globaler Speicher)
  const S = JSON.parse(JSON.stringify(g.serialize())), g2 = new Game().load(S), p2 = new Progress(g2, { storage: st, now: DAY }), ev2 = [];
  p2.on((t, d) => ev2.push(t));
  ok(JSON.stringify(p2.summary()) === JSON.stringify(p.summary()) && JSON.stringify(g2.S.prog.st) === JSON.stringify(g.S.prog.st), 'nach Neuladen: gleiche Erfolge, Sterne und Inselstatistik');
  bestMove(g2);
  ok(!ev2.includes('badge') || Object.keys(p2.P.badges).length > got.length, 'nach Neuladen werden Erfolge nicht noch einmal vergeben');
  // Rückgängig: Erfolge bleiben, Zähler zählen zurück
  const n0 = p2.P.tot.placed, b0 = Object.keys(p2.P.badges).length; g2.undo();
  ok(p2.P.tot.placed === n0 - 1 && Object.keys(p2.P.badges).length === b0, 'Rückgängig: Zähler −1, Erfolge bleiben');
}
{ // Erste Kachel: Rückgängig und neu setzen → kein zweites Ereignis
  const E = mk({ seed: 2 }); put(E.g, 'wald'); E.g.undo(); put(E.g, 'wald');
  ok(E.p.P.badges.first && E.ev.filter(e => e[0] === 'badge' && e[1].b.id === 'first').length === 1, 'Erste Kachel: nach Rückgängig kein zweites Mal');
}
{ // Nachteule, Winterdorf, Wasserfall, Leuchtturm, Wald 10
  let env = { time: 23, season: 3 };
  const E = mk({ seed: 4, env: () => env }), { g, p } = E;
  put(g, 'wiese'); ok(p.P.badges.nightOwl, 'Nachteule: bei Nacht gesetzt');
  for (let i = 0; i < 8; i++) put(g, 'haus', adjTo(g, n => n.k === 'haus' || n.k === 'start'));
  ok(p.P.badges.winter && p.P.badges.village5, `Winterdorf (Dorf ${p.cur.st.winter} im Winter), Weiler (${p.cur.st.houses} Häuser)`);
  put(g, 'bach'); ok(p.P.badges.waterfall, 'Wasserfall: Bach endet am Rand');
  put(g, 'turm', (q, r) => g.freeSides(q, r) >= 4); ok(p.P.badges.lighthouse, 'Leuchtfeuer: Leuchtturm am Rand');
  env = { time: 12, season: 1 }; put(g, 'wald'); for (let i = 1; i < 10; i++) put(g, 'wald', adjTo(g, n => GROUP[n.k] === 'wald'));
  ok(p.P.badges.forest10 && !p.P.badges.forest25 && g.S.stats.merges > 0, `Wald mit ${g.S.best.wald} Kacheln (verschmolzene zählen mehrfach, ${g.S.stats.merges} Verschmelzungen)`);
}
{ // Kategorien und alle Bauteile (über zwei Inseln hinweg)
  const st = mem(), A = mk({ seed: 8, storage: st });
  for (const k of KINDS.slice(0, 20)) put(A.g, k);
  const Bb = mk({ seed: 9, storage: st }); for (const k of KINDS.slice(20)) put(Bb.g, k);
  ok(Bb.p.P.badges.allCats && Bb.p.P.badges.allKinds && Bb.p.P.badges.islands3 === undefined, 'alle 7 Kategorien und jedes Bauteil – über zwei Inseln');
  const C = mk({ seed: 10, storage: st }); put(C.g, 'wiese'); ok(C.p.P.badges.islands3 && C.p.P.islands.length === 3, '3 Inseln gegründet');
}
{ // Verschmelzen (Grundregel, hier Endlos): erste Verschmelzung, Kettenreaktion, Burg
  const E = mk({ mode: 'endlos', seed: 3 }), { g, p } = E; g.S.unlocked = [...KINDS];
  mergeBoard(g, [['felsen', 1, 0], ['felsen', 2, 0]]); mergeAt(g, 'felsen', 3, 0);
  ok(p.P.badges.merge1 && p.P.tot.merges === 1 && g.at(3, 0).k === 'huette', 'erste Verschmelzung (Felsen → Blockhütte)');
  g.undo(); ok(p.P.tot.merges === 0 && p.P.badges.merge1, 'Rückgängig: Verschmelzung zählt zurück, Erfolg bleibt');
  mergeBoard(g, [['felsen', 2, 1], ['felsen', 1, 2], ['huette', 0, 1], ['huette', 1, 0]]); const r = mergeAt(g, 'felsen', 1, 1);
  ok(r.merges.length === 2 && p.P.badges.chain, 'Kettenreaktion: zwei Verschmelzungen in einem Zug');
  mergeBoard(g, [['gasthaus', -2, 0], ['gasthaus', -2, -1]]); mergeAt(g, 'gasthaus', -1, -1);
  ok(g.at(-1, -1).k === 'burg' && p.P.badges.castle, 'Burgherr: bis zum Burgturm verschmolzen');
  // Zuhause eines Besuchers wird verschmolzen → der Wunsch zieht mit zur neuen Stufe
  mergeBoard(g, [['haus', 3, -1], ['haus', 3, -2]]); p.cur.vis.list = [{ id: 50, tpl: 'turmRand', a: 'turm', who: 'Ida', face: '👵', home: '3,-1', from: g.S.stats.placed, turns: 10, line: 0 }]; p.cur.vis.next = 1e9;
  mergeAt(g, 'haus', 4, -2);
  ok(g.at(4, -2).k === 'reihe' && p.wishes()[0]?.home === '4,-2', 'Zuhause verschmolzen: Wunsch zieht zur Häuserzeile');
  // Klassisch: Verschmelzungen zählen ebenso
  const C = mk({ mode: 'klassisch', seed: 4 }); const m0 = C.p.P.tot.merges;
  mergeBoard(C.g, [['wiese', 1, 0], ['wiese', 2, 0]]); C.g.S.stack.unshift({ k: 'wiese' }); C.g.S.pick = 0; C.g.place(3, 0, 0);
  ok(C.g.at(3, 0).k === 'schafe' && C.p.P.tot.merges === m0 + 1, 'Klassisch: Verschmelzung zählt für Erfolge/Tagesaufgaben');
}
{ // Kreativ ruht
  const E = mk({ mode: 'kreativ', seed: 6 }); for (let i = 0; i < 20; i++) put(E.g, 'wald');
  ok(!E.count('badge') && E.p.P.tot.placed === 0 && !E.p.daily().done && !E.count('visitor'), 'Kreativ: keine Erfolge, Aufgaben, Besucher');
}
{ // kaputter oder voller Speicher
  const bad = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('voll'); } };
  let okk = true; try { const E = mk({ storage: bad }); for (let i = 0; i < 12; i++) bestMove(E.g); okk = E.p.P.badges.first > 0; } catch (e) { okk = false; console.log(e); }
  ok(okk, 'Speicher gesperrt/voll: läuft weiter ohne Absturz');
  const junk = mem(); junk.setItem(PROGRESS_KEY, '{kaputt'); const E2 = mk({ storage: junk }); ok(E2.p.summary().got === 0, 'kaputter Eintrag → leerer Fortschritt');
  const weird = mem(); weird.setItem(PROGRESS_KEY, JSON.stringify({ badges: { first: 5, gibtsnicht: 1 }, tot: { placed: 'x' }, kinds: { ufo: 1 } }));
  const E3 = mk({ storage: weird }); ok(E3.p.P.badges.first && !E3.p.P.badges.gibtsnicht && E3.p.P.tot.placed === 0 && !E3.p.P.kinds.ufo, 'fremde Einträge werden übersprungen');
}
{ // alter Spielstand ohne S.prog lädt
  const g = new Game().load({ seed: 5, tiles: [{ k: 'start', q: 0, r: 0, o: 0 }, { k: 'wald', q: 1, r: 0, o: 0 }], score: 40, stack: [{ k: 'wiese' }], mode: 'endlos' });
  const p = new Progress(g, { storage: mem(), now: DAY }); ok(g.S.prog && p.wishes().length === 0 && p.island().tiles === 1, 'alter Spielstand bekommt S.prog');
}

// ================= Besucher =================
console.log('Besucher');
{
  const E = mk({ mode: 'klassisch', seed: 11 }), { g, p } = E; let maxV = 0, gaps = [], last = 0;
  E.p.on(t => { if (t === 'visitor') { gaps.push(g.S.stats.placed - last); last = g.S.stats.placed; } });
  for (let i = 0; i < 90 && g.S.stack.length; i++) { bestMove(g); maxV = Math.max(maxV, p.wishes().length); }
  ok(E.count('visitor') >= 5, `${E.count('visitor')} Besucher in 90 Zügen (Abstände ${gaps.join(',')})`);
  ok(maxV <= MAX_VISITORS && maxV >= 1, `höchstens ${MAX_VISITORS} gleichzeitig (max ${maxV})`);
  ok(gaps.slice(1).every(x => x >= 2 && x <= 12), 'Abstand zwischen Besuchen 6–10 Kacheln (2, wenn gerade 2 warten)');
  ok(p.wishes().every(w => TILES[w.a] && g.S.unlocked.includes(w.a) && g.at(...w.home.split(',').map(Number))), 'Wünsche nur für freigeschaltete Kacheln, Zuhause liegt auf der Insel');
  // gleiche Insel, gleiche Züge → gleiche Besucher
  const F = mk({ mode: 'klassisch', seed: 11 }); for (let i = 0; i < 90 && F.g.S.stack.length; i++) bestMove(F.g);
  ok(JSON.stringify(F.p.cur.vis) === JSON.stringify(p.cur.vis), 'Besucher je Insel reproduzierbar');
}
{ // jeder Wunsch ist erfüllbar; Belohnung; Rückgängig hebt nichts doppelt auf
  let all = 0;
  for (const W of WISHES) {
    const E = mk({ mode: 'endlos', seed: 21 }), { g, p } = E; g.S.unlocked = [...KINDS];
    put(g, 'haus', adjTo(g, n => n.k === 'start'));
    if (W.b) put(g, kindOf(W.b), adjTo(g, () => true));
    p.cur.vis.list.push({ id: 99, tpl: W.id, a: W.a, who: 'Ida', face: '👵', home: '0,0', from: g.S.stats.placed, turns: 10, line: 0 });
    p.cur.vis.next = 1e9;
    const s0 = g.S.score, res = solveWish(g, p.cur.vis.list[0]);
    const done = E.ev.find(e => e[0] === 'wishDone');
    if (done && res && g.S.score === s0 + res.total + WISH_PTS && p.wishes().length === 0 && p.island().served === 1) all++;
    else ok(false, `Wunsch ${W.id}: ${res ? 'gesetzt' : 'nicht setzbar'}, erfüllt ${!!done}, Punkte ${g.S.score - s0}`);
  }
  ok(all === WISHES.length, `alle ${WISHES.length} Wunscharten erfüllbar, je +${WISH_PTS} Punkte`);
  // Rückgängig nach erfülltem Wunsch
  const E = mk({ mode: 'klassisch', seed: 22 }), { g, p } = E; g.S.unlocked = [...KINDS];
  const sH = g.S.score; put(g, 'haus', adjTo(g, n => n.k === 'start'));
  p.cur.vis.list.push({ id: 7, tpl: 'waldHaus', a: 'wald', who: 'Emil', face: '👦', home: '0,0', from: g.S.stats.placed, turns: 10, line: 1 }); p.cur.vis.next = 1e9;
  const s0 = g.S.score, r1 = put(g, 'wald', adjTo(g, n => n.k === 'haus'));
  ok(g.S.score === s0 + r1.total + WISH_PTS && E.count('wishDone') === 1 && p.P.tot.wishes === 1 && p.P.badges.wish1, 'Wunsch erfüllt: Dank, +30, Erfolg Gute Nachbarn');
  g.undo();
  ok(g.S.score === s0 + WISH_PTS && p.wishes().length === 0 && p.island().served === 1, 'Rückgängig: Wunsch bleibt erfüllt, Belohnung genau einmal');
  const r2 = put(g, 'wald', adjTo(g, n => n.k === 'haus'));
  ok(g.S.score === s0 + WISH_PTS + r2.total && E.count('wishDone') === 1 && p.P.tot.wishes === 1, 'erneut gesetzt: keine zweite Belohnung');
  g.undo(); g.undo();
  ok(g.S.score === sH + WISH_PTS && g.S.stats.placed === 0, 'mehrfach rückgängig: Belohnung weiterhin genau einmal');
  // Ablaufen
  p.cur.vis.list.push({ id: 8, tpl: 'turmRand', a: 'turm', who: 'Rosa', face: '👩‍🦰', home: '0,0', from: g.S.stats.placed, turns: 3, line: 2 });
  for (let i = 0; i < 3; i++) put(g, 'wiese');
  ok(E.count('wishGone') === 1 && p.wishes().length === 0 && p.island().left === 1, 'abgelaufener Wunsch verabschiedet sich');
  // Besucher aus
  const off = mk({ mode: 'klassisch', seed: 11, visitors: () => false }); for (let i = 0; i < 40 && off.g.S.stack.length; i++) bestMove(off.g);
  ok(!off.count('visitor') && !off.p.wishes().length, 'Besucher aus (Einstellung): niemand kommt');
  const on = mk({ mode: 'endlos', seed: 12 }); for (let i = 0; i < 25; i++) bestMove(on.g);
  ok(on.count('visitor') >= 2, 'Endlos: Besucher kommen');
  // Wünsche bleiben beim Speichern/Laden
  const S = JSON.parse(JSON.stringify(on.g.serialize())), g2 = new Game().load(S), p2 = new Progress(g2, { storage: mem(), now: DAY });
  ok(JSON.stringify(p2.wishes()) === JSON.stringify(on.p.wishes()), 'offene Wünsche nach Neuladen gleich');
}

// ================= Punkte von außen =================
{
  const E = mk({ mode: 'klassisch', seed: 13 }), { g, p } = E; put(g, 'wiese');
  const s0 = g.S.score, gr = p.rewardPoints(15, 'test:1'); ok(gr && g.S.score === s0 + 15 && p.rewardPoints(15, 'test:1') === null, 'rewardPoints: einmal je id');
  const n0 = g.S.stack.length; p.giveTiles(2, 'test:t'); ok(g.S.stack.length === n0 + 2, 'giveTiles: 2 Extrakacheln im Klassisch-Modus');
}

console.log(fail ? `PROGRESS FAILED (${fail})` : 'PROGRESS OK'); process.exit(fail ? 1 : 0);
