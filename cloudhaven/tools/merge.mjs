// Verschmelzen als Grundregel (alle Modi) ohne Browser: node cloudhaven/tools/merge.mjs → endet mit MERGE OK
// Regeln, Punkte (Nachbarpunkte + Verschmelzung = Vorschau), Gewichte in Gruppen, Kettenreaktion, Rückgängig, Ablagefach,
// Schalter aus, alte Stände aus dem früheren Modus „Verschmelzen“, Probepartien (Balance: Verschmelzen an gegen aus).
// Optional: --games n (Probepartien je Modus, Standard 6), --v (jede Partie einzeln ausgeben)
import { Game, LEGACY_MERGE_MODE, MILESTONES } from '../js/game.js';
import { TILES, KINDS, GROUP, MERGE, MERGE_N, MERGE_CHAINS, LEVEL, chainOf, mergeValue } from '../js/tiles.js';
import { key, neighbor } from '../js/hex.js';
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };

// leere Insel (nur Brunnen), damit die Aufbauten exakt sind; alle Arten frei
const fresh = (mode = 'endlos', seed = 1) => { const g = new Game().newGame({ mode, seed }); g.S.unlocked = [...KINDS]; return g; };
const put = (g, k, q, r, o = 0) => { g.S.stack.unshift({ k }); g.S.pick = 0; return g.place(q, r, o); };

// ---------- Daten ----------
ok(Object.entries(MERGE).every(([a, b]) => TILES[a] && TILES[b]), 'MERGE: alle Arten gibt es');
ok(MERGE_CHAINS.length === 6 && MERGE_CHAINS.every(c => c.name && c.en && c.icon && c.kinds.length >= 2), 'MERGE_CHAINS: 6 Ketten mit Name/Icon');
ok(chainOf('haus').join('>') === 'felsen>huette>haus>reihe>gasthaus>burg' && LEVEL.burg === 6 && LEVEL.felsen === 1, 'Stein → Hütte → Haus → … → Burg (Stufe 6)');
ok(!MERGE.weg && !MERGE.wegk && !MERGE.nadelwald && !MERGE.hof && !MERGE.see, 'Wege verschmelzen nicht, Nadelwald/Bauernhof/See sind Endstufen');
ok(MERGE_CHAINS.filter(c => c.id !== 'burg').every(c => new Set(c.kinds.slice(1).map(k => GROUP[k])).size === 1), 'Ketten bleiben ab Stufe 2 in ihrer Gruppe (außer Stein → Burg)');
ok(Object.keys(LEVEL).every(k => !TILES[k].edges.includes('w')), 'keine Bach-Kanten in den Ketten');
ok(mergeValue('huette') === 10 && mergeValue('burg') === 30, 'Wert je Kachel: 5 · Stufe');

// ---------- 3 gleiche → nächste Stufe (normale Regeln) ----------
{
  const g = fresh(), ev = [];
  g.on((type, d) => ev.push([type, d]));
  put(g, 'felsen', 1, 0); put(g, 'felsen', 2, 0);
  ok(g.at(1, 0)?.k === 'felsen' && g.at(2, 0)?.k === 'felsen', 'zwei Felsen bleiben liegen');
  const pre = g.previewMerge('felsen', 1, 1), e = g.evaluate('felsen', 1, 1, 0), s0 = JSON.stringify(g.S), sc = g.S.score;
  ok(JSON.stringify(g.S) === s0 && pre.length === 1 && pre[0].to === 'huette' && pre[0].at === '1,1', 'previewMerge: Felsen → Blockhütte, Zustand unverändert');
  ok(e.place === 6 && e.mergePts === 30 && e.pts === 36 && e.result === 'huette', `Vorschau: Nachbarpunkte ${e.place} + Verschmelzung ${e.mergePts} = ${e.pts}`);
  ev.length = 0;
  const res = put(g, 'felsen', 1, 1);
  ok(res.ok && g.at(1, 1)?.k === 'huette' && !g.at(1, 0) && !g.at(2, 0), '3 Felsen → Blockhütte, die anderen Felder werden frei');
  ok(g.S.score - sc === e.pts && res.total === e.pts && JSON.stringify(res.merges) === JSON.stringify(pre) && res.placed === 'felsen', 'vergebene Punkte = Vorschau, place.merges = Vorschau');
  ok(ev.map(x => x[0]).join(',') === 'merge,place' && ev[0][1].keys.sort().join('|') === '1,0|2,0' && ev[0][1].n === 3, 'Events: merge (keys, Gewicht) vor place');
  ok(g.at(1, 1).n === 3 && g.group(1, 1).size === 3 && g.S.tiles.length === g.board.size, 'Gewicht: Hütte zählt 3, S.tiles = Brett');
  ok(g.slots().some(([q, r]) => q === 1 && r === 0) && g.slots().some(([q, r]) => q === 2 && r === 0), 'freie Felder wieder setzbar (grenzen an die Insel)');
  ok(g.S.stats.merges === 1 && g.S.stats.bestLevel === 2 && g.S.stats.bestKind === 'huette', 'Statistik: merges, bestLevel, bestKind');
  const back = put(g, 'wiese', 1, 0); ok(back.ok && g.at(1, 0)?.k === 'wiese', 'Lücke wieder bebaut');
}
// ---------- 4er-Gruppe, Bonus ----------
{
  const g = fresh(); put(g, 'felsen', 1, 0); put(g, 'felsen', 2, 0); put(g, 'wiese', 0, 1); put(g, 'felsen', 0, 2);
  ok(g.board.size === 5 && g.at(0, 2).k === 'felsen', 'Paar + Einzelner liegen ohne Verschmelzen');
  const e = g.evaluate('felsen', 1, 1, 0), m = e.merges[0], sc = g.S.score; put(g, 'felsen', 1, 1);
  ok(m.size === 4 && m.bonus === 10 && m.pts === 10 * 4 + 10 && g.S.score - sc === e.pts && g.at(1, 1).n === 4, `4 gleiche: ${m.pts} Punkte inkl. Bonus ${m.bonus}, Gewicht 4`);
}
// ---------- Kettenreaktion + Rückgängig ----------
{
  const g = fresh();
  put(g, 'felsen', 1, 0); put(g, 'felsen', 2, 0); put(g, 'felsen', 1, 1);        // Hütte (1,1), Felder 1,0 und 2,0 frei
  put(g, 'felsen', -1, 0); put(g, 'felsen', -1, 1); put(g, 'felsen', 0, 1);      // Hütte (0,1) neben (1,1)
  put(g, 'felsen', 1, 0); put(g, 'felsen', 2, 0);
  ok(g.at(1, 1)?.k === 'huette' && g.at(0, 1)?.k === 'huette' && g.at(1, 0)?.k === 'felsen' && g.at(2, 0)?.k === 'felsen', 'zwei Hütten nebeneinander, zwei Felsen bereit');
  const target = [2, 1];   // grenzt an Felsen (2,0) (mit (1,0) ein Paar) und Hütte (1,1) (mit (0,1) ein Paar)
  g.S.stack.unshift({ k: 'felsen' }); g.S.pick = 0;
  const ev = g.evaluate('felsen', ...target, 0), s0 = JSON.stringify(g.S), sc = g.S.score, steps = [];
  g.on((type, d) => { if (type === 'merge') steps.push({ ...d, size: g.board.size }); });
  const res = g.place(...target, 0);
  ok(res.merges.length === 2 && res.merges[1].to === 'haus' && g.at(...target).k === 'haus' && JSON.stringify(ev.merges) === JSON.stringify(res.merges), 'Kette: Felsen → Blockhütte → Fachwerkhaus (= Vorschau)');
  ok(res.merges[1].pts === Math.round(mergeValue('haus') * 3 * 1.5) && g.S.score - sc === ev.pts, `Kette ×1,5: ${res.merges.map(m => m.pts).join(' + ')}, Punkte = Vorschau (${ev.pts})`);
  ok(steps.length === 2 && steps[1].size < steps[0].size && g.at(...target).n === 9 && g.group(...target).size >= 9, `Gewicht nach der Kette: ${g.at(...target).n} (3 Felsen + 2 Hütten à 3)`);
  ok(g.undo() && JSON.stringify(g.S) === s0 && g.at(1, 1)?.k === 'huette' && !g.at(...target), 'Rückgängig über die Kettenreaktion stellt alles exakt wieder her');
}
// ---------- Gruppen/Meilensteine nach Gewicht ----------
{
  const g = fresh(); let ms = [];
  g.on((t, d) => { if (t === 'place') ms.push(...d.milestones); });
  put(g, 'wald', 1, 0); put(g, 'wald', 2, 0); put(g, 'wald', 1, 1);             // Nadelwald (3)
  put(g, 'wald', 2, 1); put(g, 'wald', 3, 0);                                     // 2 Wälder daneben → 5
  ok(g.at(1, 1).k === 'nadelwald' && g.board.size === 4 && g.group(1, 1).size === 5 && ms.some(m => m.g === 'wald' && m.size === MILESTONES[0]), `Wald-Meilenstein 5 mit 3 Kacheln (Gewicht ${g.group(1, 1).size})`);
  const q = fresh(); q.S.stack.unshift({ k: 'wald', quest: 2 }); q.S.pick = 0; q.place(1, 0, 0);
  ok(q.S.quests['1,0']?.n === 3, 'Aufgabe gesetzt: Gruppe 1 → 3');
  put(q, 'wald', 2, 0); const r = put(q, 'wald', 1, 1);
  ok(!q.S.quests['1,0'] && r.quests.length === 1 && q.S.stats.quests === 1, 'Aufgaben-Kachel verschmolzen: Aufgabe wandert mit und ist erfüllt');
  const h = fresh(); put(h, 'haus', 1, 0); put(h, 'haus', 2, 0); put(h, 'haus', 1, 1); put(h, 'haus', 0, 1);
  ok(h.at(1, 1).k === 'reihe' && h.stageOf(h.at(0, 1)) === 2, 'Hausstufe zählt Häuserzeile mit Gewicht (3 + 1 Wohnhäuser → zweistöckig)');
}
// ---------- Ablagefach ----------
{
  const g = fresh('endlos', 11); g.S.stack = [{ k: 'wald' }, { k: 'feld' }, { k: 'weg' }, { k: 'haus' }, { k: 'see' }]; g.S.pick = 1;
  const s0 = JSON.stringify(g.S), ev = []; g.on(t => ev.push(t));
  ok(g.hold() && g.S.hold.k === 'feld' && g.S.stack.length === 5 && !g.S.stack.slice(0, 4).some(e => e.k === 'feld'), 'Endlos: Feld ins Fach, Nachschub auf 5');
  g.pick(0); ok(g.hold() && g.S.hold.k === 'wald' && g.current().k === 'feld', 'tauschen: Wald ins Fach, Feld zurück');
  ok(ev.join(',') === 'hold,stack,stack,hold,stack', 'Events: hold + stack');
  g.undo(); g.undo(); ok(JSON.stringify(g.S) === s0, 'Rückgängig nimmt Parken/Tauschen zurück');
  const k = fresh('klassisch', 3); k.S.stack = [{ k: 'wald' }, { k: 'feld' }]; k.S.pick = 0;
  ok(k.hold() && k.S.stack.length === 1 && k.S.hold.k === 'wald', 'Klassisch: parken ohne Nachschub');
  ok(!k.hold() || k.S.hold.k === 'feld', 'Klassisch: letzte Kachel tauscht nur');
  const k2 = fresh('klassisch', 4); k2.S.stack = [{ k: 'wiese' }, { k: 'wald' }]; k2.S.pick = 0; k2.hold(); let end = 0; k2.on(t => { if (t === 'end') end++; });
  k2.place(1, 0, 0); ok(k2.S.stack.length === 1 && k2.S.stack[0].k === 'wiese' && !k2.S.hold && !k2.isOver() && !end, 'Klassisch: Stapel leer → Fach kommt zurück in den Vorrat');
  k2.place(-1, 0, 0); ok(k2.isOver() && end === 1, 'danach ist die Partie vorbei');
  ok(new Game().newGame({ seed: 1, mode: 'kreativ' }).hold() === false, 'Kreativ: kein Ablagefach');
  const sv = fresh('endlos', 5); sv.hold(); const L = new Game().load(JSON.parse(JSON.stringify(sv.serialize())));
  ok(L.S.hold?.k === sv.S.hold.k && JSON.stringify(L.serialize()) === JSON.stringify(sv.serialize()), 'Ablagefach wird gespeichert');
}
// ---------- Schalter aus, Kreativ ----------
{
  const g = fresh(); g.setMerge(false); put(g, 'felsen', 1, 0); put(g, 'felsen', 2, 0);
  const e = g.evaluate('felsen', 1, 1, 0), res = put(g, 'felsen', 1, 1);
  ok(!e.merges.length && e.pts === e.place && g.at(1, 1).k === 'felsen' && g.board.size === 4 && !res.merges.length && g.S.stats.merges === 0, 'Schalter aus: keine Verschmelzung, Punkte wie früher');
  const sn = JSON.parse(JSON.stringify(g.serialize())); ok(sn.merge === false && new Game().load(sn).S.merge === false, 'Schalter steckt im Inselstand (Speichern/Laden)');
  g.setMerge(true); g.undo(); ok(g.S.merge === true, 'Rückgängig behält den aktuellen Schalter');
  const k = new Game().newGame({ seed: 2, mode: 'kreativ' }); for (const [q, r] of [[1, 0], [2, 0], [1, 1]]) { k.setKind('wiese'); k.place(q, r, 0); }
  ok(k.at(1, 1).k === 'schafe', 'Kreativ: verschmilzt auch');
  const off = new Game().newGame({ seed: 7, merge: false }); ok(off.S.merge === false, 'newGame({ merge: false })');
}
// ---------- alte Stände aus dem Modus „Verschmelzen“ ----------
{
  const old = { seed: 4, mode: LEGACY_MERGE_MODE, maxR: 3, score: 812, tiles: [{ k: 'start', q: 0, r: 0, o: 0 }, { k: 'huette', q: 1, r: 0, o: 0 }, { k: 'felsen', q: 3, r: -1, o: 2 }, { k: 'felsen', q: 3, r: 0, o: 0 }, { k: 'ufo', q: 2, r: 0, o: 0 }],
    stack: [{ k: 'felsen' }], hold: { k: 'wiese' }, unlocked: ['felsen', 'huette', 'wiese'], stats: { placed: 30, merges: 12, bestLevel: 4, bestKind: 'reihe' } };
  const O = new Game().load(old);
  ok(O.S.mode === 'endlos' && !('maxR' in O.S) && O.board.size === 4 && O.S.hold?.k === 'wiese' && O.S.stats.merges === 12 && O.S.stats.bestKind === 'reihe' && O.S.stack.length >= 3 && O.S.merge === true,
    'alter Verschmelzen-Stand lädt als Endlos-Insel (Kacheln, Punkte, Fach, Statistik bleiben)');
  O.S.stack.unshift({ k: 'felsen' }); O.S.pick = 0; const r = O.place(3, 1, 0);
  ok(r.ok && r.merges.length === 1 && O.at(3, 1).k === 'huette' && O.S.score > 812, 'alter Stand spielt weiter und verschmilzt (auch abseits der Hauptinsel)');
}

// ---------- Probepartien: gieriger Spieler wählt aus dem ganzen Vorrat (Verschmelzen an/aus) ----------
function best(g) {
  let b = null;
  for (const k of new Set(g.S.stack.map(e => e.k))) for (const [q, r] of g.slots()) for (let o = 0; o < 6; o++) {
    const ev = g.evaluate(k, q, r, o); if (ev.ok && (!b || ev.pts > b.ev.pts)) b = { k, q, r, o, ev };
  }
  return b;
}
function play(mode, seed, merge, max) {
  const g = new Game().newGame({ mode, seed, merge }); let match = true, moves = 0;
  while (moves < max && g.S.stack.length) {
    const b = best(g); if (!b) { g.S.stack.splice(g.S.pick, 1); continue; }
    g.pickKind(b.k); const sc = g.S.score, res = g.place(b.q, b.r, b.o); moves++;
    const extra = res.quests.length * 30 + res.milestones.reduce((s, m) => s + m.size * 3, 0);
    if (!res.ok || g.S.score - sc !== b.ev.pts + extra || JSON.stringify(res.merges) !== JSON.stringify(b.ev.merges)) match = false;
  }
  return { seed, moves, match, score: g.S.score, merges: g.S.stats.merges, tiles: g.board.size, lvl: g.S.stats.bestLevel, kind: g.S.stats.bestKind,
    wald: g.S.best.wald | 0, feld: g.S.best.feld | 0, dorf: g.S.best.dorf | 0, ms: Object.values(g.S.ms).reduce((a, b) => a + b, 0), quests: g.S.stats.quests };
}
const N = +(arg('--games') || 6), avg = (R, f) => R.reduce((s, r) => s + f(r), 0) / R.length;
for (const [mode, max] of [['klassisch', 400], ['endlos', 150]]) {
  const on = [], off = [];
  for (let s = 1; s <= N; s++) { on.push(play(mode, s * 7919, true, max)); off.push(play(mode, s * 7919, false, max)); }
  if (process.argv.includes('--v')) for (const r of on) console.log('  ', JSON.stringify(r));
  const line = (R, l) => console.log(`   ${mode} ${l}: Züge Ø ${avg(R, r => r.moves).toFixed(0)} · Punkte Ø ${avg(R, r => r.score).toFixed(0)} · Verschmelzungen Ø ${avg(R, r => r.merges).toFixed(1)} · Meilensteine Ø ${avg(R, r => r.ms).toFixed(1)} · Aufgaben Ø ${avg(R, r => r.quests).toFixed(1)} · größter Wald/Felder/Dorf Ø ${['wald', 'feld', 'dorf'].map(k => avg(R, r => r[k]).toFixed(0)).join('/')} · höchste Stufe ${R.map(r => r.lvl).join(',')}`);
  line(off, 'aus'); line(on, 'an ');
  ok(on.every(r => r.match), `${mode}: Vorschau-Punkte = vergebene Punkte in jedem Zug (mit Verschmelzungen)`);
  const ratio = avg(on, r => r.score) / avg(off, r => r.score);
  ok(ratio >= .95 && ratio <= 1.6, `${mode}: Punkte mit Verschmelzen ${(ratio * 100).toFixed(0)} % von ohne (Ziel 95–160 %)`);
  const gr = ['wald', 'feld', 'dorf'].map(k => avg(on, r => r[k]) / avg(off, r => r[k])), sum = ['wald', 'feld', 'dorf'].reduce((s, k) => s + avg(on, r => r[k]), 0) / ['wald', 'feld', 'dorf'].reduce((s, k) => s + avg(off, r => r[k]), 0);
  ok(gr.every(x => x >= .7) && sum >= .85, `${mode}: große Wälder/Felder/Dörfer bleiben möglich (${gr.map(x => (x * 100).toFixed(0) + ' %').join(' / ')} von ohne, zusammen ${(sum * 100).toFixed(0)} %; Ziel je ≥ 70 %, zusammen ≥ 85 %)`);
  ok(avg(on, r => r.merges) >= 5 && on.filter(r => r.lvl >= 4).length >= N / 2, `${mode}: Verschmelzen passiert oft (Ø ${avg(on, r => r.merges).toFixed(1)}), Stufe 4+ in ${on.filter(r => r.lvl >= 4).length}/${N} Partien`);
  if (mode === 'klassisch') ok(avg(on, r => r.moves) >= .85 * avg(off, r => r.moves), `klassisch: Partie dauert ${(avg(on, r => r.moves) / avg(off, r => r.moves) * 100).toFixed(0)} % so lang wie ohne (≥ 85 %)`);
}

console.log(fail ? `MERGE FAILED (${fail})` : 'MERGE OK'); process.exit(fail ? 1 : 0);
