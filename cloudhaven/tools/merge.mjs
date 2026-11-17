// Modus „Verschmelzen“ ohne Browser: node cloudhaven/tools/merge.mjs → endet mit MERGE OK
// Optional: --games n (Probepartien, Standard 30), --v (jede Partie einzeln ausgeben)
import { Game, MERGE_MODE, MERGE_HAND } from '../js/game.js';
import { TILES, MERGE, MERGE_N, MERGE_POOL, MERGE_CHAINS, LEVEL, chainOf, mergeValue } from '../js/tiles.js';
import { key, neighbor, dist } from '../js/hex.js';
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };

// leeres Spielfeld (nur Brunnen), damit die Aufbauten exakt sind
const fresh = (seed = 1) => { const g = new Game().newGame({ mode: MERGE_MODE, seed }); g.board.clear(); g.S.tiles = []; g._put({ k: 'start', q: 0, r: 0, o: 0 }); return g; };
const put = (g, k, q, r) => { g.S.stack.unshift({ k }); g.S.pick = 0; return g.place(q, r, 0); };

// ---------- Daten ----------
ok(Object.entries(MERGE).every(([a, b]) => TILES[a] && TILES[b]), 'MERGE: alle Arten gibt es');
ok(MERGE_CHAINS.length === 6 && MERGE_CHAINS.every(c => c.name && c.en && c.icon && c.kinds.length >= 2), 'MERGE_CHAINS: 6 Ketten mit Name/Icon');
ok(chainOf('haus').join('>') === 'felsen>huette>haus>reihe>gasthaus>burg' && LEVEL.burg === 6 && LEVEL.felsen === 1, 'chainOf/LEVEL: Stein → … → Burg (Stufe 6)');
{ const w = Object.entries(MERGE_POOL), tot = w.reduce((s, [, x]) => s + x, 0), l2 = w.filter(([k]) => LEVEL[k] === 2).reduce((s, [, x]) => s + x, 0);
  ok(w.every(([k]) => LEVEL[k] <= 2) && l2 / tot < .2 && w.every(([k, x]) => LEVEL[k] === 1 || x <= Math.min(...w.filter(([j]) => LEVEL[j] === 1).map(([, y]) => y)) * 2), `MERGE_POOL: Grundstufen häufig, Stufe 2 selten (${(l2 / tot * 100).toFixed(0)} %), nichts ab Stufe 3`); }
ok(Object.keys(LEVEL).every(k => !TILES[k].edges.includes('w')), 'keine Bach-Kanten im Modus');

// ---------- Start ----------
{
  let good = true;
  for (let s = 1; s <= 40; s++) {
    const g = new Game().newGame({ mode: MERGE_MODE, seed: s }), n = g.board.size - 1;
    if (g.at(0, 0)?.k !== 'start' || n < 3 || n > 5 || g.S.stack.length !== MERGE_HAND || g.S.maxR !== 3 || g.S.hold !== null) good = false;
    for (const t of g.board.values()) if (dist(t.q, t.r, 0, 0) > 3 || (t.k !== 'start' && (LEVEL[t.k] !== 1 || g._sameGroup(g._kinds(), t.q, t.r).length >= MERGE_N))) good = false;
  }
  ok(good, 'Start: Brunnen + 3–5 Grundteile im Radius, keine Dreiergruppe, 3 Teile im Vorrat');
  const g = fresh();
  ok(g.slots().length === 36 && g.slots().every(([q, r]) => dist(q, r, 0, 0) <= 3), 'slots(): alle 36 freien Felder im Radius 3');
  ok(!g.evaluate('wald', 4, 0, 0).ok && !put(g, 'wald', 0, 4).ok && !g.at(0, 4), 'Radius-Grenze: außerhalb nicht setzbar');
  const big = new Game().newGame({ mode: MERGE_MODE, seed: 3, maxR: 4 }); ok(big.slots().length === 61 - big.board.size, 'maxR: 4 → 61 Felder');
}

// ---------- 3 gleiche → nächste Stufe ----------
{
  const g = fresh(), ev = [];
  g.on((type, d) => ev.push([type, d]));
  put(g, 'felsen', 2, 0); put(g, 'felsen', 3, 0);
  ok(g.at(2, 0)?.k === 'felsen' && g.at(3, 0)?.k === 'felsen', 'zwei Felsen bleiben liegen');
  const pre = g.previewMerge('felsen', 2, 1), e = g.evaluate('felsen', 2, 1, 0), s0 = JSON.stringify(g.S), sc = g.S.score;
  ok(JSON.stringify(g.S) === s0 && pre.length === 1 && pre[0].from === 'felsen' && pre[0].to === 'huette' && pre[0].at === '2,1', 'previewMerge: Felsen → Blockhütte, Zustand unverändert');
  ev.length = 0;
  const res = put(g, 'felsen', 2, 1);
  ok(res.ok && g.at(2, 1)?.k === 'huette' && !g.at(2, 0) && !g.at(3, 0), '3 Felsen → Blockhütte, die anderen Felder werden frei');
  ok(g.slots().some(([q, r]) => q === 2 && r === 0) && g.S.tiles.length === g.board.size, 'freie Felder wieder in slots(), S.tiles = Brett');
  ok(JSON.stringify(res.merges) === JSON.stringify(pre), 'place.merges = Vorschau');
  ok(res.merges[0].pts === mergeValue('huette') * 3 && g.S.score - sc === 1 + 45 && e.pts === 46, `Punkte: Setzen 1 + 15 × 3 = ${g.S.score - sc} (Vorschau ${e.pts})`);
  ok(ev.map(x => x[0]).join(',') === 'merge,place' && ev[0][1].step === 0 && ev[0][1].keys.sort().join('|') === '2,0|3,0', 'Events: merge (mit keys, step) vor place');
  ok(g.S.stats.merges === 1 && g.S.stats.bestLevel === 2 && g.S.stats.bestKind === 'huette', 'Statistik: merges, bestLevel, bestKind');
  const w = fresh(); put(w, 'wald', 1, 0); const r2 = put(w, 'wald', 2, 0);
  ok(r2.total === 1 && w.S.score === 2, 'keine Nachbarpunkte im Modus (Wald an Wald = nur Setzen)');
}

// ---------- 4er-Gruppe mit Bonus ----------
{
  const g = fresh(); put(g, 'felsen', 2, 0); put(g, 'felsen', 3, 0); put(g, 'felsen', 2, -2);
  ok(g.board.size === 4, 'Paar + Einzelner liegen ohne Verschmelzen');
  const sc = g.S.score, res = put(g, 'felsen', 2, -1), m = res.merges[0];
  ok(m.size === 4 && m.keys.length === 3 && m.bonus === 15 && m.pts === 15 * 4 + 15 && g.S.score - sc === 1 + 75, `4 gleiche: ${m.pts} Punkte inkl. Bonus ${m.bonus}`);
  ok(g.board.size === 2 && g.at(2, -1).k === 'huette', '4er-Gruppe: drei Felder frei, eine Hütte');
}

// ---------- Kettenreaktion Felsen → Hütte → Haus, Rückgängig ----------
{
  const g = fresh();
  put(g, 'felsen', -1, 0); put(g, 'felsen', -2, 0); put(g, 'felsen', -1, 1);       // erste Hütte (-1,1)
  put(g, 'felsen', 0, 2); put(g, 'felsen', 0, 3); put(g, 'felsen', -1, 2);         // zweite Hütte (-1,2) daneben
  put(g, 'felsen', -3, 1); put(g, 'felsen', -3, 2);
  ok(g.at(-1, 1)?.k === 'huette' && g.at(-1, 2)?.k === 'huette' && g.board.size === 5, 'zwei Hütten nebeneinander, zwei Felsen bereit');
  g.S.stack.unshift({ k: 'felsen' }); g.S.pick = 0;
  const pre = g.previewMerge('felsen', -2, 1), s0 = JSON.stringify(g.S), sc = g.S.score, steps = [];
  g.on((type, d) => { if (type === 'merge') steps.push({ ...d, size: g.board.size }); });
  const res = g.place(-2, 1, 0);
  ok(res.merges.length === 2 && res.merges[0].to === 'huette' && res.merges[1].to === 'haus' && g.at(-2, 1).k === 'haus', 'Kette: Felsen → Hütte → Fachwerkhaus');
  ok(res.merges[1].pts === Math.round(45 * 3 * 1.5) && g.S.score - sc === 1 + 45 + 203 && JSON.stringify(pre) === JSON.stringify(res.merges), `Kette ×1,5: ${res.merges.map(m => m.pts).join(' + ')} (= Vorschau)`);
  ok(steps.length === 2 && steps[0].step === 0 && steps[1].step === 1 && steps[0].size === 4 && steps[1].size === 2, 'merge-Events je Schritt, Brett beim Event = nach dem Schritt');
  ok(['-1,1', '-1,2', '-3,1', '-3,2'].every(k => !g.board.has(k)) && g.board.size === 2, 'alle Kettenkacheln entfernt');
  ok(g.undo() && JSON.stringify(g.S) === s0 && g.at(-1, 1)?.k === 'huette' && !g.at(-2, 1), 'Rückgängig über die Kettenreaktion stellt alles exakt wieder her');
}

// ---------- Ablagefach ----------
{
  const g = new Game().newGame({ mode: MERGE_MODE, seed: 11 });
  g.S.stack = [{ k: 'wald' }, { k: 'feld' }, { k: 'weg' }]; g.S.pick = 1;
  const s0 = JSON.stringify(g.S), ev = [];
  g.on(t => ev.push(t));
  ok(g.hold() && g.S.hold.k === 'feld' && g.S.stack.length === 3 && g.S.stack[0].k === 'wald' && g.S.stack[1].k === 'weg', 'parken: Feld ins Fach, Nachschub auf 3');
  g.pick(0);
  ok(g.hold() && g.S.hold.k === 'wald' && g.current().k === 'feld' && g.S.stack.length === 3, 'tauschen: Wald ins Fach, Feld zurück');
  ok(ev.join(',') === 'hold,stack,stack,hold,stack', 'Events: hold + stack');
  g.undo(); g.undo(); ok(JSON.stringify(g.S) === s0, 'Rückgängig nimmt Parken/Tauschen zurück');
  ok(new Game().newGame({ seed: 1 }).hold() === false, 'Ablagefach nur im Verschmelzen-Modus');
}

// ---------- Ende bei vollem Feld ----------
{
  const g = fresh(); let end = null; g.on((t, d) => { if (t === 'end') end = d; });
  const free = g.slots(); for (const [q, r] of free.slice(1)) g._put({ k: 'burg', q, r, o: 0 });
  ok(!g.isOver() && g.slots().length === 1, 'ein Feld frei: noch nicht vorbei');
  put(g, 'felsen', ...free[0]);
  ok(g.isOver() && end && end.tiles === 37 && end.free === 0 && 'bestLevel' in end && 'merges' in end && 'score' in end, 'kein freies Feld → end mit Statistik ' + JSON.stringify(end));
  const h = fresh(); for (const [q, r] of h.slots().slice(1)) h._put({ k: 'felsen', q, r, o: 0 });
  ok(!h.isOver(), 'Felsen-Brett: noch nicht voll');
}

// ---------- Speichern / Laden ----------
{
  const g = new Game().newGame({ mode: MERGE_MODE, seed: 21 }); g.hold();
  for (let i = 0; i < 12; i++) { const [q, r] = g.slots()[i * 2 % g.slots().length]; g.place(q, r, 0); }
  const snap = JSON.stringify(g.serialize()), L = new Game().load(JSON.parse(snap));
  ok(JSON.stringify(L.serialize()) === snap && L.S.hold?.k === g.S.hold.k, 'Speichern → Laden ergibt denselben Stand (inkl. Ablagefach)');
  const old = { seed: 4, mode: MERGE_MODE, score: 12, tiles: [{ k: 'start', q: 0, r: 0, o: 0 }, { k: 'felsen', q: 1, r: 0, o: 0 }, { k: 'wald', q: 9, r: 0, o: 0 }, { k: 'ufo', q: 2, r: 0, o: 0 }], stack: [{ k: 'wiese' }], stats: { placed: 3 } };
  const O = new Game().load(old);
  ok(O.S.maxR === 3 && O.S.hold === null && O.S.stats.merges === 0 && O.S.stats.bestLevel === 1 && O.S.stack.length === 3 && O.board.size === 2 && O.S.v === 1, 'alter Stand ohne maxR/hold/Statistik lädt (Unbekanntes/Außerhalb übersprungen, Vorrat auf 3)');
  O.S.stack.unshift({ k: 'felsen' }); O.S.pick = 0; O.place(2, 0, 0); O.S.stack.unshift({ k: 'felsen' }); O.S.pick = 0;
  ok(O.place(1, 1, 0).merges.length === 1, 'geladener Stand spielt weiter (verschmilzt)');
}

// ---------- Probepartien: gieriger Spieler ----------
// Bewertung eines Zugs: Verschmelzpunkte + Aussicht (gleiche Nachbarn der Ergebnis-Kachel gut, fremde schlecht)
function moveValue(g, kind, q, r) {
  const ev = g.evaluate(kind, q, r, 0); if (!ev.ok) return -1e9;
  const kinds = g._kinds(kind, q, r); g._mergeSteps(kinds, q, r);
  const res = kinds.get(key(q, r)); let v = ev.pts * 2;
  for (let i = 0; i < 6; i++) {
    const n = kinds.get(key(...neighbor(q, r, i)));
    if (!n) continue;
    if (n === res) v += MERGE[res] ? 8 : 0; else if (n !== 'start') v -= LEVEL[n] >= 2 ? 1.5 : 1;
  }
  return v + dist(q, r, 0, 0) * .4;                               // Rand zuerst, Mitte bleibt beweglich
}
function bestFor(g, kind) { let b = null; for (const [q, r] of g.slots()) { const v = moveValue(g, kind, q, r); if (!b || v > b.v) b = { q, r, v }; } return b; }
function playGreedy(seed, max = 200) {
  const g = new Game().newGame({ mode: MERGE_MODE, seed }); let match = true, moves = 0;
  while (moves < max && !g.isOver()) {
    if (!g.S.hold) { g.pick(0); g.hold(); continue; }               // Fach zuerst füllen
    let best = null;
    g.S.stack.forEach((e, i) => { const b = bestFor(g, e.k); if (b && (!best || b.v > best.v)) best = { ...b, i, held: false }; });
    const bh = bestFor(g, g.S.hold.k); if (bh && bh.v > best.v + 2) best = { ...bh, i: 0, held: true };
    if (best.held) { g.pick(best.i); g.hold(); } else g.pick(best.i);
    const k = g.current().k, pre = g.evaluate(k, best.q, best.r, 0), sc = g.S.score, res = g.place(best.q, best.r, 0); moves++;
    if (!res.ok || g.S.score - sc !== pre.pts || JSON.stringify(res.merges) !== JSON.stringify(pre.merges)) match = false;
  }
  return { seed, moves, over: g.isOver(), match, ...g.mergeStats(), undo: g.canUndo() };
}
const N = +(arg('--games') || 30), runs = [];
for (let s = 1; s <= N; s++) runs.push(playGreedy(s * 7919));
if (process.argv.includes('--v')) for (const r of runs) console.log('  ', JSON.stringify(r));
const avg = f => runs.reduce((s, r) => s + f(r), 0) / runs.length, lv = {};
for (const r of runs) lv[r.bestLevel] = (lv[r.bestLevel] || 0) + 1;
const kinds = {}; for (const r of runs) kinds[r.bestKind] = (kinds[r.bestKind] || 0) + 1;
console.log(`   Probepartien: ${N} · Züge Ø ${avg(r => r.moves).toFixed(0)} (min ${Math.min(...runs.map(r => r.moves))}, max ${Math.max(...runs.map(r => r.moves))}) · Verschmelzungen Ø ${avg(r => r.merges).toFixed(1)} · Punkte Ø ${avg(r => r.score).toFixed(0)}`);
console.log(`   höchste Stufe: ${JSON.stringify(lv)} · Art: ${JSON.stringify(kinds)}`);
ok(runs.every(r => r.match), 'Probepartie: Vorschau-Punkte = vergebene Punkte in jedem Zug');
ok(runs.every(r => r.over || r.moves === 200), 'Probepartie endet (volles Feld) oder erreicht 200 Züge');
const mv = avg(r => r.moves), l45 = runs.filter(r => r.bestLevel >= 4).length / N;
ok(mv >= 60 && mv <= 120, `Balance: Runde dauert Ø ${mv.toFixed(0)} Züge (Ziel 60–120)`);
ok(l45 >= .5, `Balance: ${(l45 * 100).toFixed(0)} % der Partien erreichen Stufe 4+ (Ziel: guter Spieler 4–5)`);
ok(runs.filter(r => r.bestLevel >= 6).length / N < .25, 'Balance: Burg (Stufe 6) bleibt selten');

console.log(fail ? `MERGE FAILED (${fail})` : 'MERGE OK'); process.exit(fail ? 1 : 0);
