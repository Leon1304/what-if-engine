// Vergleich Baukasten neu (js/kit.js) gegen die alte Implementierung (tools/kit-ref.js) und Bauzeit je Kachelart.
// Beide Fassungen laufen in derselben Seite: /ref/… liefert dieselben Dateien, nur js/kit.js wird durch tools/kit-ref.js ersetzt.
// Geprüft je Kachel und Ebene: Ecken, Bounding-Box, alle Attribute Wert für Wert (Toleranz für Rundung), Detailstufen (lod),
// bewegliche Teile (rekursiv) und Markierungen. Endet mit KIT OK.
//   node cloudhaven/tools/kitcheck.mjs [--n=5] [--kinds=haus,wald]
import http from 'http'; import fs from 'fs'; import path from 'path'; import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (n, d) => { const a = process.argv.find(a => a.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
const REPS = +arg('n', 5), ONLY = arg('kinds', '');
const PAGE = `<!doctype html><meta charset="utf-8"><script type="importmap">{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/" } }</script><body></body>`;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const srv = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/') { r.writeHead(200, { 'content-type': 'text/html' }); return r.end(PAGE); }
  const ref = u.startsWith('/ref/'); if (ref) u = u.slice(4);
  const f = ref && u === '/js/kit.js' ? path.join(ROOT, 'tools/kit-ref.js') : path.join(ROOT, u);
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0);
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGE ERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error') console.log('console: ' + m.text()); });
await page.goto(`http://localhost:${srv.address().port}/`);
const res = await page.evaluate(async ({ REPS, ONLY }) => {
  const A = await import('/js/models/tilemodel.js'), B = await import('/ref/js/models/tilemodel.js');
  const { TILES, edgesOf } = await import('/js/tiles.js');
  const kinds = ONLY ? ONLY.split(',') : Object.keys(TILES);
  // Fälle je Art: ohne Nachbarn, Drehung 2 mit Wiese/Bach/See/Weg ringsum, Häuser in Stufe 1–3
  const nbOf = (k, o) => [0, 1, 2, 3, 4, 5].map(i => { const kk = ['wiese', 'bach', 'see', 'weg', null, 'wald'][i]; return kk ? { k: kk, E: edgesOf(kk, (i + o) % 6) } : null; });
  const cases = [];
  for (const k of kinds) {
    cases.push({ t: { k, q: 3, r: -2, o: 0 }, nb: [null, null, null, null, null, null], stage: 1 });
    cases.push({ t: { k, q: -5, r: 4, o: 2 }, nb: nbOf(k, 2), stage: 2 });
    if (['haus', 'reihe', 'gasthaus', 'huette'].includes(k)) cases.push({ t: { k, q: 1, r: 7, o: 4 }, nb: nbOf(k, 4), stage: 3 });
  }
  const fails = [], worst = {};
  const cmpArr = (a, b, name, tol) => { if (a.length !== b.length) return `${name}: Länge ${a.length} ≠ ${b.length}`; let m = 0, at = -1; for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); if (!(d <= m)) { m = d; at = i; } }
    worst[name] = Math.max(worst[name] || 0, m); return m > tol || Number.isNaN(m) ? `${name}: max. Abweichung ${m} bei ${at} (${a[at]} / ${b[at]})` : null; };
  const TOL = { position: 2e-4, normal: 2e-3, color: 2e-4, sway: 2e-4, tag: 0, win: 0, uv: 1e-6 };
  const cmpGeo = (ga, gb, where) => {
    const la = Object.keys(ga).sort(), lb = Object.keys(gb).sort();
    if (la.join() !== lb.join()) { fails.push(`${where}: Ebenen ${la} ≠ ${lb}`); return; }
    for (const l of la) {
      const a = ga[l], b = gb[l], an = Object.keys(a.attributes).sort(), bn = Object.keys(b.attributes).sort();
      if (an.join() !== bn.join()) { fails.push(`${where}/${l}: Attribute ${an} ≠ ${bn}`); continue; }
      for (const n of an) { const e = cmpArr(a.attributes[n].array, b.attributes[n].array, n, TOL[n] ?? 1e-4); if (e) fails.push(`${where}/${l}: ${e}`); if (a.attributes[n].itemSize !== b.attributes[n].itemSize) fails.push(`${where}/${l}: itemSize ${n}`); }
      for (const s of ['min', 'max']) if (a.boundingBox[s].distanceTo(b.boundingBox[s]) > 2e-4) fails.push(`${where}/${l}: boundingBox.${s}`);
      if (Math.abs(a.boundingSphere.radius - b.boundingSphere.radius) > 2e-3) fails.push(`${where}/${l}: boundingSphere`);
      const lo = a.userData.lod, lr = b.userData.lod;
      if (!!lo !== !!lr) fails.push(`${where}/${l}: lod fehlt`);
      else if (lo) { const e1 = cmpArr(lo.end, lr.end, 'lod.end', 0), e2 = cmpArr(lo.size, lr.size, 'lod.size', 2e-4); if (e1) fails.push(`${where}/${l}: ${e1}`); if (e2) fails.push(`${where}/${l}: ${e2}`); }
    }
  };
  const cmpParts = (pa, pb, where) => {
    if (pa.length !== pb.length) { fails.push(`${where}: ${pa.length} ≠ ${pb.length} Teile`); return; }
    pa.forEach((p, i) => { const q = pb[i], w = where + '/' + p.name;
      if (p.name !== q.name) fails.push(`${w}: Name ${q.name}`);
      if (p.matrix.elements.some((v, j) => Math.abs(v - q.matrix.elements[j]) > 1e-5)) fails.push(`${w}: Matrix`);
      if (JSON.stringify(p.spots) !== JSON.stringify(q.spots)) fails.push(`${w}: Markierungen`);
      cmpGeo(p.geo, q.geo, w); cmpParts(p.children || [], q.children || [], w); });
  };
  const time = {}, tris = {};
  for (const c of cases) {
    const E = edgesOf(c.t.k, c.t.o), where = `${c.t.k}@${c.t.q},${c.t.r}/o${c.t.o}/s${c.stage}`;
    let a, b;
    try { a = A.buildTile(c.t, E, c.nb, 0, 0, { stage: c.stage }); b = B.buildTile(c.t, E, c.nb, 0, 0, { stage: c.stage }); }
    catch (e) { fails.push(`${where}: ${e.message}`); continue; }
    cmpGeo(a.geo, b.geo, where); cmpParts(a.parts, b.parts, where);
    if (JSON.stringify(a.spots) !== JSON.stringify(b.spots)) fails.push(`${where}: Markierungen`);
    tris[c.t.k] = Math.max(tris[c.t.k] || 0, Object.values(a.geo).reduce((s, g) => s + g.attributes.position.count / 3, 0));
    // Zeit: abwechselnd neu/alt, Median aus REPS Läufen
    const ta = [], tb = [];
    for (let i = 0; i < REPS; i++) {
      let t0 = performance.now(); A.buildTile(c.t, E, c.nb, 0, 0, { stage: c.stage }); ta.push(performance.now() - t0);
      t0 = performance.now(); B.buildTile(c.t, E, c.nb, 0, 0, { stage: c.stage }); tb.push(performance.now() - t0);
    }
    const med = a => a.sort((x, y) => x - y)[a.length >> 1], T = time[c.t.k] ||= { neu: 0, alt: 0 };
    T.neu = Math.max(T.neu, med(ta)); T.alt = Math.max(T.alt, med(tb));
  }
  return { fails, worst, time, tris, n: cases.length };
}, { REPS, ONLY });
await browser.close(); srv.close();
let sa = 0, sb = 0;
console.log('Art          neu ms   alt ms   Faktor   Dreiecke');
for (const [k, t] of Object.entries(res.time).sort((a, b) => b[1].neu - a[1].neu)) { sa += t.neu; sb += t.alt;
  console.log(`${k.padEnd(11)} ${t.neu.toFixed(1).padStart(7)}  ${t.alt.toFixed(1).padStart(7)}   ${(t.alt / t.neu).toFixed(2).padStart(5)}×  ${String(Math.round(res.tris[k])).padStart(8)}`); }
console.log(`Summe       ${sa.toFixed(0).padStart(7)}  ${sb.toFixed(0).padStart(7)}   ${(sb / sa).toFixed(2).padStart(5)}×   (${res.n} Fälle, Median aus ${REPS})`);
console.log('größte Abweichung je Attribut: ' + Object.entries(res.worst).map(([k, v]) => `${k} ${v.toExponential(1)}`).join(', '));
for (const f of res.fails.slice(0, 30)) console.log('✗ ' + f);
console.log(res.fails.length ? `KIT FEHLER: ${res.fails.length}` : 'KIT OK'); process.exit(res.fails.length ? 1 : 0);
