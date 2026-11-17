// Cogtopia – Baupläne ohne DOM/Three: L-förmige Bandwege (Ziehen mit der Maus), Wegsuche (A*), Blaupausen drehen/teilen,
// Fabrik fürs Startmenü, große Test-Fabrik (Leistung). Nur öffentliche Sim-Methoden (place/placeLine/buyPlot/buyResearch) plus Startgeld.
import { DX, DY, PLOT, PLOTS, START_PLOT, MAP, outCell } from './sim.js';
import { BUILDINGS, BUILDING_IDS, RECIPES, RECIPE_IDS, ITEM_IDS } from './data.js';

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

// ---------------------------------------------------------------------------------------------------
// Wegsuche: A* über freie, eigene Felder mit Abbiege-Kosten. Mit Tunneln (erforscht) springt der Weg über Hindernisse:
// Eingang geradeaus anfahren, Ausgang 2 … range Felder weiter, danach geradeaus weiter.
// from = [x, y] (frei), to = [x, y]: frei → Weg endet dort; belegt von einem annehmenden Gebäude → Weg endet davor und zeigt hinein.
// Rückgabe [{x, y, rot, type: 'band' | 'tunnel'}] oder [] (kein Weg). Rein: ändert nichts an der Fabrik.
const TURN = 0.5, TUN = 3;
export function route(f, from, to, opts = {}) {
  const fx = from?.[0] ?? from?.x, fy = from?.[1] ?? from?.y, tx = to?.[0] ?? to?.x, ty = to?.[1] ?? to?.y;
  if (![fx, fy, tx, ty].every(Number.isInteger)) return [];
  const free = (x, y) => x >= 0 && y >= 0 && x < MAP && y < MAP && f.isOpen(x, y) && !f.grid[y * MAP + x];
  if (!free(fx, fy)) return [];
  const tunnels = (opts.tunnels ?? true) && f.isUnlocked('tunnel'), range = BUILDINGS.tunnel.range;
  const tn = f.nodeAt(tx, ty), goalFree = free(tx, ty);
  if (!goalFree && !(tn && f._takes && ['machine', 'exp', 'store', 'sell', 'lab', 'wonder', 'power', 'drone', 'belt'].includes(tn.kind))) return [];
  // Ziel: (x, y, Richtung des Ausgangs) passt?
  const goalDir = (x, y, d) => {
    if (goalFree) return x === tx && y === ty;
    const m = f.nodeAt(x + DX[d], y + DY[d]); return m === tn && f._takes(m, d);
  };
  const hx = goalFree ? tx : tn.e.x, hy = goalFree ? ty : tn.e.y, hw = goalFree ? 1 : tn.w, hh = goalFree ? 1 : tn.h;
  const H = (x, y) => Math.max(0, hx - x, x - (hx + hw - 1)) + Math.max(0, hy - y, y - (hy + hh - 1));
  // Zustand: Feld × Ankunftsrichtung (4, 4 = Start) × geradeaus-Pflicht (nach Tunnelausgang)
  const NS = MAP * MAP * 10, g = new Float64Array(NS).fill(Infinity), prev = new Int32Array(NS).fill(-1), kindArr = new Uint8Array(NS);
  const key = (x, y, d, st) => ((y * MAP + x) * 5 + d) * 2 + st;
  const heap = []; let ctr = 0;
  const push = (k, fsc) => { heap.push([fsc, ctr++, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] < heap[i][0] || (heap[p][0] === heap[i][0] && heap[p][1] < heap[i][1])) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; const lt = (a, b) => heap[a][0] < heap[b][0] || (heap[a][0] === heap[b][0] && heap[a][1] < heap[b][1]); if (l < heap.length && lt(l, m)) m = l; if (r < heap.length && lt(r, m)) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const k0 = key(fx, fy, 4, 0); g[k0] = 0; push(k0, H(fx, fy));
  let end = -1, endDir = -1, n = 0;
  const maxN = opts.maxNodes || 200000;
  while (heap.length && n++ < maxN) {
    const [, , k] = pop(); const st = k & 1, d = ((k >> 1) % 5), c = Math.floor(k / 10), x = c % MAP, y = (c / MAP) | 0, gc = g[k];
    // Ziel erreicht? (Ausgangsrichtung od: nicht rückwärts, nach Tunnel nur geradeaus)
    const outs = st ? [d] : d === 4 ? [0, 1, 2, 3] : [d, (d + 1) & 3, (d + 3) & 3];
    if (goalFree ? goalDir(x, y, 0) : outs.some(od => goalDir(x, y, od))) {
      end = k; endDir = goalFree ? (opts.endRot ?? (d === 4 ? 0 : d)) : outs.find(od => goalDir(x, y, od)); break;
    }
    for (const od of outs) {
      const turn = d !== 4 && od !== d ? TURN : 0;
      const nx = x + DX[od], ny = y + DY[od];
      if (free(nx, ny)) { const nk = key(nx, ny, od, 0), ng = gc + 1 + turn; if (ng < g[nk]) { g[nk] = ng; prev[nk] = k; kindArr[nk] = 0; push(nk, ng + H(nx, ny)); } }
      // Tunnel: Eingang hier (geradeaus angefahren oder Start), Ausgang k Felder weiter
      if (!tunnels || st || (d !== 4 && od !== d) || !blockedAhead(x, y, od)) continue;
      if (hijack(x, y, od)) continue;
      for (let j = 2; j <= range; j++) {
        const bx = x + DX[od] * j, by = y + DY[od] * j;
        if (sameRot(x + DX[od] * (j - 1), y + DY[od] * (j - 1), od)) break;   // fremder gleich gedrehter Tunnel dazwischen würde koppeln
        if (!free(bx, by)) continue;
        let blocked = false; for (let i = 1; i < j; i++) if (!free(x + DX[od] * i, y + DY[od] * i)) blocked = true;
        if (!blocked) continue;
        const nk = key(bx, by, od, 1), ng = gc + j + TUN;
        if (ng < g[nk]) { g[nk] = ng; prev[nk] = k; kindArr[nk] = 1; push(nk, ng + H(bx, by)); }
      }
    }
  }
  function blockedAhead(x, y, d) { return !free(x + DX[d], y + DY[d]); }
  function sameRot(x, y, d) { const m = f.nodeAt(x, y); return !!m && m.e.type === 'tunnel' && m.e.rot === d; }
  function hijack(x, y, d) { for (let i = 1; i <= range; i++) { const m = f.nodeAt(x - DX[d] * i, y - DY[d] * i); if (m && m.e.type === 'tunnel' && m.e.rot === d) return !m.e.link; } return false; }
  if (end < 0) return [];
  // zurückverfolgen
  const chain = []; for (let k = end; k >= 0; k = prev[k]) chain.unshift(k);
  const cells = chain.map(k => { const c = Math.floor(k / 10); return { x: c % MAP, y: (c / MAP) | 0, t: kindArr[k] }; });
  const out = [];
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i], nx = cells[i + 1];
    let rot;
    if (nx) rot = dirOf(Math.sign(nx.x - c.x), Math.sign(nx.y - c.y)); else rot = endDir;
    const tun = (nx && nx.t === 1) || c.t === 1;
    out.push({ x: c.x, y: c.y, rot, type: tun ? 'tunnel' : 'band' });
  }
  // Tunnelausgang hat die Richtung des Sprungs
  for (let i = 1; i < out.length; i++) if (cells[i].t === 1) out[i].rot = out[i - 1].rot;
  return out;
}

// ---------------------------------------------------------------------------------------------------
// Blaupausen: {w, h, ents:[{type, dx, dy, rot, recipe, filter, mk}]}
// bpRotate dreht im Uhrzeigersinn (rot +1 je Schritt). 2×2-Maschinen haben ihren Ausgang nicht genau mittig (outCell);
// sie rücken deshalb um ein Feld, damit das Ausgabefeld mitdreht – außer das Feld ist in der Blaupause schon belegt.
export function bpRotate(bp, r = 1) {
  r = ((r | 0) % 4 + 4) % 4;
  let cur = { w: bp.w, h: bp.h, ents: bp.ents.map(e => ({ ...e })) };
  for (let k = 0; k < r; k++) {
    const W = cur.w, H = cur.h;
    const ents = cur.ents.map(e => {
      const d = BUILDINGS[e.type], s = d ? d.w : 1;
      return { ...e, dx: H - e.dy - s, dy: e.dx, rot: (e.rot + 1) & 3, _o: e };
    });
    const occ = new Map();
    const mark = (e, v) => { const s = BUILDINGS[e.type]?.w || 1; for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) { const kk = (e.dy + j + 8) * 1024 + e.dx + i + 8; if (v) occ.set(kk, (occ.get(kk) || 0) + 1); else occ.set(kk, occ.get(kk) - 1); } };
    for (const e of ents) mark(e, 1);
    for (const e of ents) {
      const d = BUILDINGS[e.type]; if (!d || d.w !== 2 || !(['drill', 'machine', 'exp', 'store', 'drone'].includes(d.kind))) continue;
      const o = e._o, [ox, oy] = outCell(o.dx, o.dy, 2, 2, o.rot);
      const wx = H - 1 - oy, wy = ox;                        // wohin das Ausgabefeld gedreht wurde
      const [sx, sy] = outCell(e.dx, e.dy, 2, 2, e.rot);
      const mx = wx - sx, my = wy - sy; if (!mx && !my) continue;
      const nx = e.dx + mx, ny = e.dy + my;
      mark(e, 0);
      let clash = false; for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) if (occ.get((ny + j + 8) * 1024 + nx + i + 8) > 0) clash = true;
      if (clash) { mark(e, 1); continue; }
      e.dx = nx; e.dy = ny; mark(e, 1);
    }
    for (const e of ents) delete e._o;
    // ragt ein verschobenes Teil über den Rand, wächst der Rahmen (alles rückt nach)
    let minX = 0, minY = 0, nw = H, nh = W;
    for (const e of ents) { const s = BUILDINGS[e.type]?.w || 1; minX = Math.min(minX, e.dx); minY = Math.min(minY, e.dy); nw = Math.max(nw, e.dx + s); nh = Math.max(nh, e.dy + s); }
    if (minX || minY) for (const e of ents) { e.dx -= minX; e.dy -= minY; }
    ents.sort((a, b) => a.dy - b.dy || a.dx - b.dx);
    cur = { w: nw - minX, h: nh - minY, ents };
  }
  return cur;
}

// Teilen: 'COG1:' + base64url(Bytes): [1, w, h, n_hi, n_lo, je Teil: typ, dx, dy, rot|mk<<2|flags<<4, (rezept), (filter)], Prüfsumme
const BP_MAX = 48, NOCOPY = new Set(['verkauf', 'wunder']);
const b64 = typeof btoa === 'function' ? btoa : (s => Buffer.from(s, 'binary').toString('base64'));
const unb64 = typeof atob === 'function' ? atob : (s => Buffer.from(s, 'base64').toString('binary'));
export function encodeBp(bp) {
  if (!bp || !Array.isArray(bp.ents)) return '';
  const ents = bp.ents.filter(e => BUILDINGS[e.type] && !NOCOPY.has(e.type));
  const by = [1, Math.min(255, bp.w | 0), Math.min(255, bp.h | 0), (ents.length >> 8) & 255, ents.length & 255];
  for (const e of ents) {
    const ri = e.recipe ? RECIPE_IDS.indexOf(e.recipe) : -1, fi = e.filter === 'gold' ? 254 : e.filter ? ITEM_IDS.indexOf(e.filter) : -1;
    const mk = Math.max(1, Math.min(3, e.mk | 0 || 1));
    by.push(BUILDING_IDS.indexOf(e.type), e.dx & 255, e.dy & 255, (e.rot & 3) | (mk << 2) | (ri >= 0 ? 16 : 0) | (fi >= 0 ? 32 : 0));
    if (ri >= 0) by.push(ri); if (fi >= 0) by.push(fi);
  }
  let sum = 0; for (const b of by) sum = (sum * 31 + b) % 251; by.push(sum);
  return 'COG1:' + b64(String.fromCharCode(...by)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeBp(str) {
  try {
    if (typeof str !== 'string') return null;
    str = str.trim(); if (!str.startsWith('COG1:') || str.length > 20000) return null;
    const body = str.slice(5); if (!/^[A-Za-z0-9_-]+$/.test(body)) return null;
    const bin = unb64(body.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - body.length % 4) % 4));
    const by = Array.from(bin, c => c.charCodeAt(0));
    if (by.length < 6) return null;
    let sum = 0; for (let i = 0; i < by.length - 1; i++) sum = (sum * 31 + by[i]) % 251; if (sum !== by[by.length - 1]) return null;
    const [ver, w, h, nh, nl] = by; if (ver !== 1 || w < 1 || h < 1 || w > BP_MAX || h > BP_MAX) return null;
    const n = nh * 256 + nl; if (n > w * h) return null;
    let i = 5; const ents = [], occ = new Set();
    for (let k = 0; k < n; k++) {
      if (i + 4 > by.length - 1) return null;
      const type = BUILDING_IDS[by[i]], dx = by[i + 1], dy = by[i + 2], fl = by[i + 3]; i += 4;
      if (!type || NOCOPY.has(type) || fl >> 6) return null;
      const d = BUILDINGS[type], rot = fl & 3, mk = (fl >> 2) & 3;
      if (mk < 1 || dx + d.w > w || dy + d.h > h) return null;
      let recipe = null, filter = null;
      if (fl & 16) { recipe = RECIPE_IDS[by[i++]]; if (!recipe || RECIPES[recipe].building !== type) return null; }
      if (fl & 32) { const v = by[i++]; filter = v === 254 ? 'gold' : ITEM_IDS[v]; if (!filter || type !== 'sortierer') return null; }
      if (mk > 1 && !['bohrer', 'ofen', 'presse', 'drahtzug', 'montage', 'raffinerie', 'experiment', 'labor', 'lager', 'drohnenhafen'].includes(type)) return null;
      for (let jj = 0; jj < d.h; jj++) for (let ii = 0; ii < d.w; ii++) { const c = (dy + jj) * 64 + dx + ii; if (occ.has(c)) return null; occ.add(c); }
      ents.push({ type, dx, dy, rot, recipe, filter, mk });
    }
    if (i !== by.length - 1) return null;
    return { w, h, ents };
  } catch { return null; }
}
