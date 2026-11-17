// Leistungstest mit großer Insel: 300 Kacheln, Qualität „mittel“, Retina-Auflösung (Pixel-Verhältnis 2).
// Misst Bildrate, Draw Calls und Dreiecke aus drei Abständen (Überblick, mittel, nah), das längste Bild beim Setzen
// einer Kachel und das längste Bild beim ersten Heranzoomen, die Neubauzeit je Kachelart (alle Arten, world._build),
// life.setTiles bei voller Insel und den ersten Klick (Ton entsperren + erster Effekt). Grenzwerte unten (LIMIT); endet mit PERF OK.
//   node cloudhaven/tools/perf.mjs [ausgabeordner] [--tiles=300] [--q=mittel]
import http from 'http'; import fs from 'fs'; import path from 'path'; import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'work/cloudhaven-perf'); fs.mkdirSync(out, { recursive: true });
const arg = (n, d) => { const a = process.argv.find(a => a.startsWith('--' + n + '=')); return a ? a.split('=')[1] : d; };
const N = +arg('tiles', 300), QUAL = arg('q', 'mittel'), LODQ = arg('lod', '1') === '0' ? '&lod=0' : '';
// Grenzwerte (M4, headless Chromium mit Metal). fps: Mittel über 2,5 s; Bild: längstes einzelnes Bild in ms.
const LIMIT = { fpsFar: 50, fpsMid: 50, fpsNear: 50, callsFar: 1000, trisFar: 3.8e6, callsNear: 400, placeFrame: 100, hoverFrame: 120, zoomFrame: 100,
  rebuild: 120, setTiles: 15, firstClick: 30 };
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })).newPage();
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
page.on('pageerror', e => { console.log('PAGE ERROR ' + e.message); fails++; });
await page.goto(`http://localhost:${srv.address().port}/index.html?neu&q=${QUAL}&dyn=0${LODQ}`);
await page.waitForFunction(() => window.__insel && __insel.ui.mode === 'menu', null, { timeout: 90000 });
// Erster Klick: Ton entsperren (AudioContext ist in einer Lücke nach dem Laden vorbereitet) + erster Effekt, vor jeder anderen Eingabe
await page.waitForTimeout(1600);
const click = await page.evaluate(() => { const { sound } = __insel; const t0 = performance.now(); sound.unlock(); const t1 = performance.now(); sound.play('click'); sound.play('place', { pts: 6 }); const t2 = performance.now();
  return { unlock: +(t1 - t0).toFixed(1), sfx: +(t2 - t1).toFixed(1), total: +(t2 - t0).toFixed(1), prepared: !!sound.ctx }; });
console.log(`  Erster Klick: ${click.total} ms (Ton entsperren ${click.unlock} ms, erste Effekte ${click.sfx} ms)`);
await page.locator('.mmenu .btn[data-act=new]').first().click(); await page.waitForTimeout(300);
await page.locator('.modal .btn[data-act=create]').first().click(); await page.waitForTimeout(800);
// Insel mit N Kacheln aufbauen (wie ein guter Spieler, alle Kacheln frei, Tageszeit fest)
const build = await page.evaluate(async n => {
  const { game, ui, app } = __insel; app.applySettings({ dayCycle: false, time: 11, weather: 'klar', season: 1 });
  game.S.unlocked = Object.keys((await import('./js/tiles.js')).TILES).filter(k => k !== 'start'); game.S.mode = 'endlos';
  ui._closeAll(); game.S.tut = 99; document.querySelectorAll('.tut, .cards, .card').forEach(e => e.remove?.());
  let rs = 12345; const rand = () => (rs = (rs * 16807) % 2147483647) / 2147483647;   // gleiche Insel in jedem Lauf
  app.newGame({ seed: 4242, mode: 'endlos', name: 'Perf' }); app.applySettings({ dayCycle: false, time: 11, weather: 'klar', season: 1 }); game.S.unlocked = Object.keys((await import('./js/tiles.js')).TILES).filter(k => k !== 'start'); game.S.stack = []; game._refill(5);
  const t0 = performance.now(); let maxMs = 0;
  for (let i = 0; game.board.size < n && i < n * 2; i++) {
    if (game.S.stack.length < 3) game._refill(5);
    const c = game.current(); let best = null;
    for (const [q, r] of game.slots()) { const d = Math.hypot(q + r / 2, r * .866); for (let o = 0; o < 6; o++) { const e = game.evaluate(c.k, q, r, o); const s = e.pts - d * 3 + rand() * 2; if (e.ok && (!best || s > best.s)) best = { q, r, o, s }; } }
    const t = performance.now();
    if (best) game.place(best.q, best.r, best.o); else game.S.stack.splice(game.S.pick, 1);
    maxMs = Math.max(maxMs, performance.now() - t);
    if (i % 25 === 0) await new Promise(r => setTimeout(r, 0));
  }
  ui._closeAll();
  return { tiles: game.board.size, ms: Math.round(performance.now() - t0), maxMs: Math.round(maxMs) };
}, N);
console.log(`  Insel: ${build.tiles} Kacheln in ${(build.ms / 1000).toFixed(1)} s aufgebaut (langsamstes Setzen ${build.maxMs} ms, ohne Bild)`);
await page.waitForTimeout(2500);
// Neubauzeit je Kachelart: world._build (Modell + Meshes) außerhalb der Insel, Median aus 3 (Häuser in Stufe 1–3), danach wieder weg
const rebuild = await page.evaluate(async () => { const { world, game } = __insel, { TILES } = await import('./js/tiles.js'), out = {};
  const so = game.stageOf.bind(game);
  for (const k of Object.keys(TILES).filter(k => k !== 'start')) {
    const ts = [];
    for (let i = 0; i < 3; i++) { const t = { k, q: 60 + i * 3, r: -60, o: i * 2 }; game.stageOf = tt => tt === t ? i + 1 : so(tt);
      const t0 = performance.now(); const o = world._build(t, 'perf'); ts.push(performance.now() - t0); world._remove(o); }
    game.stageOf = so; ts.sort((a, b) => a - b); out[k] = +ts[1].toFixed(1);
    await new Promise(r => setTimeout(r, 0));
  }
  return out; });
const rb = Object.entries(rebuild).sort((a, b) => b[1] - a[1]);
console.log(`  Neubau je Art (${rb.length} Arten, Median ms): ` + rb.map(([k, v]) => `${k} ${v}`).join(', '));
// life.setTiles bei voller Insel: eine Kachel neu gebaut (neues spots-Array), Median aus 5
const lifeT = await page.evaluate(() => { const { life, world } = __insel, ts = [];
  for (let i = 0; i < 6; i++) { const L = world.lifeList(), j = (i * 37) % L.length; L[j] = { ...L[j], spots: L[j].spots.slice() }; const t0 = performance.now(); life.setTiles(L); ts.push(performance.now() - t0); }
  life.setTiles(world.lifeList()); ts.shift(); ts.sort((a, b) => a - b); return { med: +ts[ts.length >> 1].toFixed(1), max: +ts[ts.length - 1].toFixed(1) }; });
console.log(`  life.setTiles (${build.tiles} Kacheln, eine geändert): Median ${lifeT.med} ms, max ${lifeT.max} ms`);
const view = (d, yaw = .6) => page.evaluate(([d, yaw]) => { const { rig, world, THREE } = __insel; const o = [...world.T.values()].find(o => o.t.k === 'haus') || [...world.T.values()][0];
  rig.jumpTo(d > 60 ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(o.cx + 3, 0, o.cz + 2), d, yaw); }, [d, yaw]);
const measure = (ms = 2500) => page.evaluate(ms => new Promise(res => { const { stage } = __insel; const dts = []; let last = performance.now(), calls = 0, tris = 0, n = 0; const t0 = last;
  const f = now => { dts.push(now - last); __mark(now - last); last = now; const i = stage.renderer.info.render; calls += i.calls; tris += i.triangles; n++;
    if (now - t0 < ms) requestAnimationFrame(f); else res({ fps: n / ((now - t0) / 1000), calls: Math.round(calls / n), tris: Math.round(tris / n), max: Math.round(Math.max(...dts.slice(2))) }); };
  requestAnimationFrame(f); }), ms);
// Zeit je Teil und Bild (für lange Bilder: wer war es?)
await page.evaluate(() => { const I = __insel; window.__fp = {}; window.__slowF = [];
  const wrap = (o, name, label) => { const f = o[name].bind(o); o[name] = (...a) => { const t = performance.now(); try { return f(...a); } finally { window.__fp[label] = (window.__fp[label] || 0) + performance.now() - t; } }; };
  for (const [o, n, l] of [[I.world, 'update', 'world.update'], [I.world, 'updateLod', 'world.lod'], [I.world, 'setGhost', 'Vorschau bauen'], [I.world, 'sync', 'world.sync'], [I.life, 'update', 'life.update'],
    [I.life, 'setTiles', 'life.setTiles'], [I.stage, 'render', 'render'], [I.stage, 'update', 'stage.update'], [I.ui, 'frame', 'ui'], [I.game, 'place', 'game.place'], [I.dyn, 'apply', 'Auflösung'], [I.world, '_drain', 'Nachbar neu bauen']]) wrap(o, n, l);
  window.__mark = dt => { if (dt > 50) window.__slowF.push(Math.round(dt) + ' ms: ' + Object.entries(window.__fp).filter(e => e[1] > 4).map(([k, v]) => k + ' ' + Math.round(v)).join(', ')); window.__fp = {}; }; });
const slow = async label => { const s = await page.evaluate(() => { const s = window.__slowF; window.__slowF = []; return s; }); if (s.length) console.log(`    lange Bilder (${label}): ` + s.slice(0, 5).join(' | ')); };
const R = {};
for (const [name, d] of [['far', 0], ['mid', 28], ['near', 5]]) {
  const dist = d || await page.evaluate(() => Math.max(38, __insel.world.bounds() * 2.1));
  await view(dist); await page.waitForTimeout(900); R[name] = await measure();
  await page.screenshot({ path: path.join(out, 'perf-' + name + '.png') });
  console.log(`  ${name.padEnd(4)} d=${dist.toFixed(0).padStart(3)}: ${R[name].fps.toFixed(1)} fps, ${R[name].calls} Draw Calls, ${(R[name].tris / 1e6).toFixed(2)} M Dreiecke, längstes Bild ${R[name].max} ms`); await slow(name);
}
// Heranzoomen von weit nach nah in einem Flug (neue Detailstufen, Schatten, Leben) – längstes Bild
await view(Math.max(38, await page.evaluate(() => __insel.world.bounds() * 2.1)), 2.4); await page.waitForTimeout(800);
const zoom = await page.evaluate(() => new Promise(res => { const { rig, world, THREE } = __insel; const all = [...world.T.values()], o = all[Math.floor(all.length * .77)];
  rig.flyTo(new THREE.Vector3(o.cx, 0, o.cz), 3, 4); const dts = []; let last = performance.now(); const t0 = last;
  const f = now => { dts.push(now - last); __mark(now - last); last = now; if (now - t0 < 4000) requestAnimationFrame(f); else res({ max: Math.round(Math.max(...dts.slice(1))), n: dts.length }); }; requestAnimationFrame(f); }));
console.log(`  Heranzoomen: ${zoom.n} Bilder, längstes Bild ${zoom.max} ms`); await slow('Zoom');
// Kachel setzen: längstes Bild im Spiel (aus mittlerem Abstand)
await view(28); await page.waitForTimeout(900);
const place = await page.evaluate(() => new Promise(async res => { const { game, world } = __insel; const fr = () => new Promise(r => requestAnimationFrame(r)); let worst = 0, hover = 0, sum = 0, n = 0;
  const run = async (k, fn) => { fn(); let last = performance.now(); for (let i = 0; i < k; i++) { await fr(); const now = performance.now(), dt = now - last; __mark(dt); last = now; sum += dt; n++; if (fn.hover) hover = Math.max(hover, dt); else worst = Math.max(worst, dt); } };
  for (let k = 0; k < 6; k++) {
    if (game.S.stack.length < 3) game._refill(5);
    const c = game.current(); let best = null;
    for (const [q, r] of game.slots()) for (let o = 0; o < 6; o++) { const e = game.evaluate(c.k, q, r, o); if (e.ok && (!best || e.pts > best.pts)) best = { q, r, o, pts: e.pts }; }
    if (!best) continue;
    await fr(); const h = () => world.setGhost(c.k, best.q, best.r, best.o, true); h.hover = 1; await run(10, h);
    await run(40, () => game.place(best.q, best.r, best.o));
  }
  res({ worst: Math.round(worst), hover: Math.round(hover), mean: +(sum / n).toFixed(1) }); }));
console.log(`  Kachel setzen: längstes Bild ${place.worst} ms beim Setzen, ${place.hover} ms beim Zeigen der Vorschau (Mittel ${place.mean} ms)`); await slow('Setzen');
// Dynamische Auflösung: künstlich langsame Bilder (je 32 ms Rechenzeit) → Pixel-Verhältnis muss sinken
const dynr = await page.evaluate(() => new Promise(res => { const { dyn, stage } = __insel; dyn.on = true; dyn.reset(); const pr0 = stage.pr; let busy = true;
  const f = () => { if (!busy) return; const t = performance.now(); while (performance.now() - t < 32); requestAnimationFrame(f); }; requestAnimationFrame(f);
  setTimeout(() => { busy = false; const r = { pr0, pr1: stage.pr, scale: dyn.scale }; dyn.on = false; dyn.reset(); res(r); }, 5200); }));
console.log(`  Dynamische Auflösung: Pixel-Verhältnis ${dynr.pr0} → ${dynr.pr1.toFixed(2)} bei langsamen Bildern`);
await browser.close(); srv.close();
ok(dynr.pr1 < dynr.pr0, 'dynamische Auflösung senkt das Pixel-Verhältnis bei < 40 fps');
ok(build.tiles >= N * .95, `Insel mit ${build.tiles} Kacheln`);
ok(R.far.fps >= LIMIT.fpsFar && R.mid.fps >= LIMIT.fpsMid && R.near.fps >= LIMIT.fpsNear, `Bildrate ≥ ${LIMIT.fpsFar} fps (weit ${R.far.fps.toFixed(0)}, mittel ${R.mid.fps.toFixed(0)}, nah ${R.near.fps.toFixed(0)})`);
ok(R.far.calls <= LIMIT.callsFar && R.near.calls <= LIMIT.callsNear, `Draw Calls weit ${R.far.calls} ≤ ${LIMIT.callsFar}, nah ${R.near.calls} ≤ ${LIMIT.callsNear}`);
ok(R.far.tris <= LIMIT.trisFar, `Dreiecke weit ${(R.far.tris / 1e6).toFixed(2)} M ≤ ${LIMIT.trisFar / 1e6} M`);
ok(place.worst <= LIMIT.placeFrame, `längstes Bild beim Setzen ${place.worst} ms ≤ ${LIMIT.placeFrame} ms`);
ok(place.hover <= LIMIT.hoverFrame, `längstes Bild beim Zeigen der Vorschau ${place.hover} ms ≤ ${LIMIT.hoverFrame} ms`);
ok(zoom.max <= LIMIT.zoomFrame, `längstes Bild beim Heranzoomen ${zoom.max} ms ≤ ${LIMIT.zoomFrame} ms`);
ok(rb[0][1] <= LIMIT.rebuild, `Neubau der teuersten Kachelart (${rb[0][0]}) ${rb[0][1]} ms ≤ ${LIMIT.rebuild} ms`);
ok(lifeT.med <= LIMIT.setTiles, `life.setTiles ${lifeT.med} ms ≤ ${LIMIT.setTiles} ms`);
ok(click.prepared && click.total <= LIMIT.firstClick, `erster Klick (Ton) ${click.total} ms ≤ ${LIMIT.firstClick} ms`);
fs.writeFileSync(path.join(out, 'perf.json'), JSON.stringify({ N, QUAL, build, R, zoom, place, dynr, rebuild, lifeT, click }, null, 1));
console.log(fails ? `PERF FEHLER: ${fails}` : 'PERF OK'); process.exit(fails ? 1 : 0);
