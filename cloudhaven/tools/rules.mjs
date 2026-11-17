// Regeln der Spiellogik ohne Browser: node cloudhaven/tools/rules.mjs → endet mit RULES OK
import { Game, MILESTONES } from '../js/game.js';
import { TILES, KINDS, UNLOCKS, edgesOf, affinity } from '../js/tiles.js';
import { DIRS, neighbor, opp, center, pixelToHex, key } from '../js/hex.js';
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };

// Sechseck-Mathe
ok(DIRS.every((d, i) => { const n = neighbor(0, 0, i), b = neighbor(...n, opp(i)); return b[0] === 0 && b[1] === 0; }), 'Nachbar und Gegenkante passen zusammen');
ok([[0, 0], [3, -2], [-5, 7]].every(([q, r]) => { const c = center(q, r), p = pixelToHex(c.x + .7, c.z - .5); return p[0] === q && p[1] === r; }), 'Pixel → Sechseck');
ok(edgesOf('bach', 1).join('') === 'gwggwg', 'Kanten drehen');
// Alle Kacheln vollständig beschrieben
ok(KINDS.every(k => TILES[k].edges.length === 6 && TILES[k].name && TILES[k].desc && TILES[k].icon), 'jede Kachel hat 6 Kanten, Name, Icon, Beschreibung');
ok(KINDS.every(k => KINDS.every(j => affinity(k, j) === affinity(j, k))), 'Nachbarpunkte symmetrisch');
// Bach-Regel
const g = new Game().newGame({ seed: 1 });
g.S.stack = [{ k: 'bach' }]; const bad = g.evaluate('bach', 1, 0, 0); ok(!bad.ok && /Bach/.test(bad.why), 'Bach an Brunnen-Weg ist ungültig');
ok(g.evaluate('bach', 1, 0, 1).ok, 'Bach quer daneben ist gültig');
ok(!g.evaluate('wald', 5, 5, 0).ok, 'Kachel ohne Anschluss ist ungültig');
// Punkte
g.place(1, 0, 1); const e = g.evaluate('bach', 2, 0, 0);
ok(e.ok === false, 'Bach muss mit Bach verbunden werden (falsche Drehung)');
const e2 = g.evaluate('bachk', 1, 1, 0); ok(typeof e2.ok === 'boolean', 'Bewertung liefert Ergebnis');
// Vorschau = vergebene Punkte; Meilensteine; Aufgaben; Speichern/Laden; Rückgängig
const G = new Game().newGame({ seed: 7 }); let match = true, placed = 0;
for (let n = 0; n < 400 && G.S.stack.length; n++) {
  let best = null; const c = G.current();
  for (const [q, r] of G.slots()) for (let o = 0; o < 6; o++) { const ev = G.evaluate(c.k, q, r, o); if (ev.ok && (!best || ev.pts > best.ev.pts)) best = { q, r, o, ev }; }
  if (!best) { G.S.stack.splice(G.S.pick, 1); continue; }
  const before = G.S.score, res = G.place(best.q, best.r, best.o); placed++;
  const extra = res.quests.length * 30 + res.milestones.reduce((s, m) => s + m.size * 3, 0);
  if (G.S.score - before !== best.ev.pts + extra) match = false;
}
ok(match, 'Vorschau-Punkte = vergebene Punkte (+ Aufgaben/Meilensteine)');
ok(placed > 60 && G.S.score > 500, `Probepartie: ${placed} Kacheln, ${G.S.score} Punkte`);
ok(Object.values(G.S.ms).some(v => v >= 2), 'Meilensteine erreicht: ' + JSON.stringify(G.S.ms));
ok(G.S.stats.quests > 0, 'Aufgaben erfüllt: ' + G.S.stats.quests);
ok(G.S.unlocked.length >= 10, 'Freischaltungen: ' + G.S.unlocked.length + ' Arten');
ok(G.S.stats.merges > 0 && G.S.tiles.some(t => t.n > 1), `Verschmelzen in der Probepartie (Klassisch): ${G.S.stats.merges}×, höchste Stufe ${G.S.stats.bestLevel} (${G.S.stats.bestKind})`);
const snap = JSON.stringify(G.serialize()), L = new Game().load(JSON.parse(snap));
ok(JSON.stringify(L.serialize()) === snap && L.S.tiles.some(t => t.n > 1), 'Speichern → Laden ergibt denselben Stand (inkl. Gewichte verschmolzener Kacheln)');
const old = { seed: 5, tiles: [{ k: 'start', q: 0, r: 0, o: 0 }, { k: 'wald', q: 1, r: 0, o: 0 }, { k: 'gibtsnicht', q: 2, r: 0, o: 0 }], score: 40, stack: [{ k: 'wiese' }, { k: 'ufo' }] };
const O = new Game().load(old); ok(O.board.size === 2 && O.S.stack.length === 1 && O.S.v === 1, 'alter/fremder Spielstand lädt, Unbekanntes wird übersprungen');
const U = new Game().newGame({ seed: 9 }); const s0 = JSON.stringify(U.S); const c = U.current();
let done = false; for (const [q, r] of U.slots()) { for (let o = 0; o < 6 && !done; o++) if (U.evaluate(c.k, q, r, o).ok) { U.place(q, r, o); done = true; } if (done) break; }
U.undo(); ok(JSON.stringify(U.S) === s0, 'Rückgängig stellt den Stand wieder her');
// Rückgängig über eine Kettenreaktion (Felsen → Hütte → Haus)
{
  const C = new Game().newGame({ seed: 3, mode: 'endlos' }); C.S.unlocked = [...KINDS];
  const P = (k, q, r) => { C.S.stack.unshift({ k }); C.S.pick = 0; return C.place(q, r, 0); };
  for (const [q, r] of [[1, 0], [2, 0], [1, 1], [-1, 0], [-1, 1], [0, 1], [1, 0], [2, 0]]) P('felsen', q, r);
  C.S.stack.unshift({ k: 'felsen' }); C.S.pick = 0; const s1 = JSON.stringify(C.S), ev = C.evaluate('felsen', 2, 1, 0), sc = C.S.score, res = C.place(2, 1, 0);
  ok(res.merges.length === 2 && C.at(2, 1).k === 'haus' && C.S.score - sc === ev.pts, `Kettenreaktion: Vorschau ${ev.pts} = vergeben ${C.S.score - sc}`);
  C.undo(); ok(JSON.stringify(C.S) === s1, 'Rückgängig über die Kettenreaktion');
}
// Verschmelzen aus: keine Verschmelzung, Vorschau ohne merges
{
  const F = new Game().newGame({ seed: 7, merge: false }); let n = 0, m = true;
  for (; n < 120 && F.S.stack.length; n++) { const c = F.current(); let b = null; for (const [q, r] of F.slots()) for (let o = 0; o < 6; o++) { const ev = F.evaluate(c.k, q, r, o); if (ev.ok && (!b || ev.pts > b.ev.pts)) b = { q, r, o, ev }; } if (!b) { F.S.stack.splice(F.S.pick, 1); continue; } if (b.ev.merges.length || b.ev.pts !== b.ev.place) m = false; F.place(b.q, b.r, b.o); }
  ok(m && F.S.stats.merges === 0 && F.S.tiles.every(t => !(t.n > 1)), `Verschmelzen aus: ${n} Züge ohne Verschmelzung`);
}
// alter Stand aus dem früheren Modus „Verschmelzen“ (begrenztes Spielfeld) → Endlos-Insel
{
  const V = new Game().load({ seed: 8, mode: 'verschmelzen', maxR: 3, score: 300, tiles: [{ k: 'start', q: 0, r: 0, o: 0 }, { k: 'huette', q: 2, r: -1, o: 0 }, { k: 'felsen', q: 1, r: 0, o: 0 }], stack: [{ k: 'felsen' }, { k: 'wiese' }, { k: 'teich' }], hold: { k: 'wald' }, stats: { placed: 9, merges: 3, bestLevel: 2, bestKind: 'huette' } });
  const okLoad = V.S.mode === 'endlos' && V.S.maxR === undefined && V.board.size === 3 && V.S.hold.k === 'wald' && V.S.stats.merges === 3;
  const c = V.current(); let placed = false; for (const [q, r] of V.slots()) { if (V.evaluate(c.k, q, r, 0).ok) { placed = V.place(q, r, 0).ok; break; } }
  ok(okLoad && placed, 'alter Verschmelzen-Stand lädt als Endlos-Insel und bleibt spielbar');
}
const K = new Game().newGame({ seed: 2, mode: 'kreativ' }); ok(K.S.unlocked.length === KINDS.length, 'Kreativ: alle Kacheln frei');
ok(UNLOCKS[0].at === 0 && MILESTONES[0] === 5, 'Freischaltungen/Meilensteine definiert');
console.log(fail ? `RULES FAILED (${fail})` : 'RULES OK'); process.exit(fail ? 1 : 0);
