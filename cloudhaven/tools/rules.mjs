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
const snap = JSON.stringify(G.serialize()), L = new Game().load(JSON.parse(snap));
ok(JSON.stringify(L.serialize()) === snap, 'Speichern → Laden ergibt denselben Stand');
const old = { seed: 5, tiles: [{ k: 'start', q: 0, r: 0, o: 0 }, { k: 'wald', q: 1, r: 0, o: 0 }, { k: 'gibtsnicht', q: 2, r: 0, o: 0 }], score: 40, stack: [{ k: 'wiese' }, { k: 'ufo' }] };
const O = new Game().load(old); ok(O.board.size === 2 && O.S.stack.length === 1 && O.S.v === 1, 'alter/fremder Spielstand lädt, Unbekanntes wird übersprungen');
const U = new Game().newGame({ seed: 9 }); const s0 = JSON.stringify(U.S); const c = U.current();
let done = false; for (const [q, r] of U.slots()) { for (let o = 0; o < 6 && !done; o++) if (U.evaluate(c.k, q, r, o).ok) { U.place(q, r, o); done = true; } if (done) break; }
U.undo(); ok(JSON.stringify(U.S) === s0, 'Rückgängig stellt den Stand wieder her');
const K = new Game().newGame({ seed: 2, mode: 'kreativ' }); ok(K.S.unlocked.length === KINDS.length, 'Kreativ: alle Kacheln frei');
ok(UNLOCKS[0].at === 0 && MILESTONES[0] === 5, 'Freischaltungen/Meilensteine definiert');
console.log(fail ? `RULES FAILED (${fail})` : 'RULES OK'); process.exit(fail ? 1 : 0);
