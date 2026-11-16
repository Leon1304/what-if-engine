// Cogtopia – Baupläne ohne DOM/Three: L-förmige Bandwege (Ziehen mit der Maus), Fabrik fürs Startmenü,
// große Test-Fabrik (Leistung). Nur öffentliche Sim-Methoden (place/placeLine/buyPlot/buyResearch) plus Startgeld.
import { DX, DY, PLOT, PLOTS, START_PLOT } from './sim.js';

// Richtung (rot) für einen Einzelschritt
export function dirOf(dx, dy) { return dx > 0 ? 0 : dx < 0 ? 2 : dy > 0 ? 1 : 3; }

// Bandweg von (x0,y0) nach (x1,y1): erst entlang axis ('x' | 'y'), dann um die Ecke.
// Jede Zelle zeigt zur nächsten; die letzte behält die Richtung des letzten Schritts (rot0 bei nur einer Zelle).
export function lPath(x0, y0, x1, y1, axis = 'x', rot0 = 0) {
  const pts = [[x0, y0]];
  let x = x0, y = y0;
  const walk = (ax) => {
    if (ax === 'x') while (x !== x1) { x += Math.sign(x1 - x); pts.push([x, y]); }
    else while (y !== y1) { y += Math.sign(y1 - y); pts.push([x, y]); }
  };
  walk(axis); walk(axis === 'x' ? 'y' : 'x');
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    let r;
    if (i < pts.length - 1) r = dirOf(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    else if (i > 0) r = dirOf(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    else r = rot0;
    out.push([pts[i][0], pts[i][1], r]);
  }
  return out;
}
// Achse für einen Zug: die Richtung, in die zuerst deutlich gezogen wurde
export function dragAxis(dx, dy) { return Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'; }

// Zellen aus Punkten [[x,y],…] mit Richtung zur nächsten; letzte Richtung = endDir (oder die des letzten Schritts)
export function cellsOf(points, endDir) {
  return points.map(([x, y], i) => {
    const n = points[i + 1], p = points[i - 1];
    const r = n ? dirOf(n[0] - x, n[1] - y) : endDir ?? (p ? dirOf(x - p[0], y - p[1]) : 0);
    return [x, y, r];
  });
}

// ---------------------------------------------------------------------------------------------------
// Startmenü: kleine, lebendige Fabrik auf dem Startgrundstück (Verkauf bei 55,55)
export function buildDemo(f) {
  const S = f.S, keep = S.money; S.money = 1e7;
  for (const r of ['kupfer', 'tunnel', 'verteiler', 'labor']) f.buyResearch(r);
  const o = START_PLOT * PLOT;                       // 48
  // Eisen → Ofen → Verkauf
  f.place('bohrer', o + 10, o + 2, 2);              // Ausgang (57,51)
  f.placeLine('band', [[o + 9, o + 3, 2], [o + 8, o + 3, 2]]);
  f.place('ofen', o + 6, o + 2, 1);                 // Ausgang (55,52)
  f.placeLine('band', cellsOf([[o + 7, o + 4], [o + 7, o + 5], [o + 7, o + 6]], 1));
  // Stein → direkt verkaufen
  f.place('bohrer', o + 2, o + 3, 0);               // Ausgang (52,52)
  f.placeLine('band', cellsOf([[o + 4, o + 4], [o + 4, o + 5], [o + 4, o + 6], [o + 4, o + 7], [o + 5, o + 7], [o + 6, o + 7]], 0));
  // Kupfer → Ofen → mündet seitlich in das Steinband
  f.place('bohrer', o + 2, o + 10, 0);              // Ausgang (52,59)
  f.placeLine('band', [[o + 4, o + 11, 0]]);
  f.place('ofen', o + 5, o + 10, 3);                // Ausgang (54,57)
  f.placeLine('band', cellsOf([[o + 6, o + 9], [o + 6, o + 8]], 3));
  // Kohle → lange Schleife → Verkauf
  f.place('bohrer', o + 11, o + 11, 2);             // Ausgang (58,60)
  f.placeLine('band', cellsOf([[o + 10, o + 12], [o + 10, o + 11], [o + 10, o + 10], [o + 10, o + 9], [o + 10, o + 8], [o + 9, o + 8]], 2));
  // Labor mit Dr. Steve (bekommt Ziegel nicht – er denkt nach)
  f.place('labor', o + 12, o + 6, 2);
  S.money = keep + 1500; S.ger.wait = 4;
  return f;
}

// ---------------------------------------------------------------------------------------------------
// Große Fabrik für den Leistungstest: 9 Grundstücke, Module aus Ofen → Band → Verkauf, dazu lange Bänder.
export function buildBig(f, { modules = 40, extra = 180 } = {}) {
  const S = f.S; S.money = 1e12;
  const c = START_PLOT;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) f.buyPlot(c + dx, c + dy);
  for (const r of ['kupfer', 'tunnel', 'verteiler', 'presse', 'labor', 'sortierer', 'lager']) f.buyResearch(r);
  // Startstation wegräumen, damit das Raster frei ist
  for (const e of [...S.ents]) f.remove(e.id);
  const x0 = (c - 1) * PLOT, y0 = (c - 1) * PLOT;
  let made = 0, belts = 0;
  for (let row = 0; row < 16 && made < modules; row++) for (let col = 0; col < 4 && made < modules; col++) {
    const x = x0 + col * 12, y = y0 + row * 3;
    if (f.place('ofen', x, y, 0) == null) continue;
    belts += f.placeLine('band', Array.from({ length: 8 }, (_, i) => [x + 2 + i, y + 1, 0]));
    f.place('verkauf', x + 10, y, 0); made++;
  }
  // lange Bänder in den Zwischenreihen (mit Teilen bestückt)
  for (let row = 0; row < 16 && extra > 0; row++) {
    const y = y0 + row * 3 + 2, n = Math.min(extra, 18);
    const cells = Array.from({ length: n }, (_, i) => [x0 + 4 + i, y, 0]);
    const k = f.placeLine('band', cells); extra -= k; belts += k;
  }
  S.money = 5e6;
  return { modules: made, belts };
}
