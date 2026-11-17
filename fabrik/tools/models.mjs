// Modelltest im headless Chromium: zeigt alle Gebäude (alle Drehungen), Bänder mit Teilen, alle Teile (normal + Gold),
// Gelände aller 4 Welten, Figuren und Effekte; macht Bilder und prüft, dass keine Konsolen-/Seitenfehler auftreten und
// kein Bild leer ist. Endet mit MODELS OK.
//   node fabrik/tools/models.mjs [ausgabeordner]
import http from 'http'; import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const require = createRequire(path.join(ROOT, 'package.json'));
let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = require('playwright')); }
const out = path.resolve(process.argv[2] || 'work/fabrik-models'); fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const BASE = `http://localhost:${srv.address().port}/fabrik/tools/models-demo.html`;
// three.js aus dem lokalen node_modules (gleiche Version wie im Importmap), sonst aus dem Netz
const THREE_DIR = [path.join(ROOT, 'node_modules/three'), path.resolve(ROOT, '../../../node_modules/three')].find(p => fs.existsSync(path.join(p, 'package.json')));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
if (THREE_DIR) await ctx.route('https://cdn.jsdelivr.net/npm/three@0.170.0/**', (route) => {
  const rel = route.request().url().split('three@0.170.0/')[1], f = path.join(THREE_DIR, rel);
  if (fs.existsSync(f)) route.fulfill({ path: f, contentType: 'text/javascript' }); else route.continue();
});
const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) { console.log('  console error: ' + m.text()); fails++; } });
page.on('pageerror', e => { console.log('  PAGE ERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')); fails++; });
const W = (ms) => page.waitForTimeout(ms);
// Bild nicht leer: genug verschiedene Farben und Helligkeitsstreuung
const notEmpty = async (buf) => page.evaluate(async (b64) => {
  const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
  const w = 160, h = 100, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'); g.drawImage(im, 0, 0, w, h); const d = g.getImageData(0, 0, w, h).data; const set = new Set(); let s = 0, s2 = 0;
  for (let i = 0; i < d.length; i += 4) { const l = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; s += l; s2 += l * l; set.add((d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | (d[i + 2] >> 4)); }
  const n = d.length / 4, sd = Math.sqrt(s2 / n - (s / n) ** 2); return { colors: set.size, sd: Math.round(sd) };
}, buf.toString('base64'));
let shots = 0;
const shot = async (name, view, args = [], cam = null, wait = 900) => {
  await page.evaluate(([v, a, c]) => { __demo.show(v, ...a); if (c) __demo.rig.jumpTo(...c); }, [view, args, cam]); await W(wait);
  const file = path.join(out, name + '.png'); const buf = await page.screenshot({ path: file }); shots++; const e = await notEmpty(buf);
  ok(e.colors > 40 && e.sd > 6, `${name}: ${e.colors} Farben, Streuung ${e.sd}`); console.log('  📷 ' + file);
};

await page.goto(BASE + '?shot=1');
await page.waitForFunction(() => window.__demo, null, { timeout: 60000 }); await W(1500);
// Geometrie-Prüfung: Ausgang an der Rutsche, Richtung stimmt, nichts ragt aus dem Grundriss (alle Drehungen)
const geo = await page.evaluate(async () => {
  const B = await import('/fabrik/js/models/buildings.js'), { MK_TYPES } = await import('/fabrik/js/models/upgrades.js'), THREE = __demo.THREE, bad = []; let n = 0;
  let outCell = null; try { ({ outCell } = await import('/fabrik/js/sim.js')); } catch (e) {}
  const DV = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  for (const t of B.BUILDING_TYPES) for (let r = 0; r < 4; r++) for (const o of t === 'band' ? [{}, { inDir: (r + 3) % 4 }, { inDir: (r + 1) % 4 }] : t === 'tunnel' ? [{}, { exit: true }] : MK_TYPES.includes(t) ? [{}, { mk: 2 }, { mk: 3 }] : [{}]) {
    const b = B.makeBuilding(t, { rot: r, ...o }); b.group.position.set(10, 0, 20); b.group.updateMatrixWorld(true); b.update(1, { busy: true }); b.group.updateMatrixWorld(true); n++;
    const N = b.size, box = new THREE.Box3(), tmp = new THREE.Box3();
    b.group.traverse(m => { if (!m.isMesh || !m.visible) return; let p = m, skip = false; while (p) { if (/^smoke|^dish|^tilt|^fx|^rocket/.test(p.name)) skip = true; p = p.parent; } if (skip) return;
      m.geometry.computeBoundingBox(); tmp.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); box.union(tmp); });
    const tol = .06; if (box.min.x < 10 - tol || box.min.z < 20 - tol || box.max.x > 10 + N + tol || box.max.z > 20 + N + tol || box.min.y < -.01) bad.push(`${t} r${r} ${JSON.stringify(o)} ragt heraus: ${[box.min.x - 10, box.min.z - 20, box.max.x - 10, box.max.z - 20, box.min.y].map(v => v.toFixed(2))}`);
    for (const p of b.ports.out) { const cx = N / 2, cz = N / 2, dx = p.x - cx, dz = p.z - cz, d = DV[p.dir];
      if (dx * d[0] + dz * d[1] <= 0 || Math.abs(Math.max(Math.abs(dx), Math.abs(dz)) - N / 2) > .01) bad.push(`${t} r${r} Port ${JSON.stringify(p)} falsch`); }
    // gleiches Ausgabefeld wie die Sim (outCell)
    if (outCell && N > 1 && t !== 'verkauf' && b.ports.out.length) { const p = b.ports.out[0], d = DV[p.dir], c = [Math.floor(p.x + d[0] * .5), Math.floor(p.z + d[1] * .5)], e = outCell(0, 0, N, N, r);
      if (c[0] !== e[0] || c[1] !== e[1]) bad.push(`${t} r${r} Ausgabefeld ${c} ≠ Sim ${e}`); }
    if (b.parts.flap && N > 1 && b.ports.out.length) { const w = new THREE.Vector3(); b.parts.flap.getWorldPosition(w); const p = b.ports.out[0];
      if (Math.hypot(w.x - 10 - p.x, w.z - 20 - p.z) > .4) bad.push(`${t} r${r} Rutsche nicht am Ausgang (${(w.x - 10).toFixed(2)},${(w.z - 20).toFixed(2)} vs ${p.x},${p.z})`); }
    b.dispose();
  }
  return { n, bad, sim: !!outCell };
});
ok(geo.bad.length === 0, `Geometrie/Drehungen: ${geo.n} Varianten geprüft${geo.sim ? ' (Ausgabefeld = sim.outCell)' : ''}` + (geo.bad.length ? '\n    ' + geo.bad.slice(0, 30).join('\n    ') : ''));
await shot('00-factory', 'factory', [], null, 2000);
await shot('01-buildings', 'buildings', [], null, 1500);
await shot('02-rotations', 'rotations', [], null, 1200);
await shot('02b-rot-ofen', 'rotations', ['ofen'], [8, 2.5, 9, 0], 1000);
await shot('03-belts', 'belts', [], null, 1200);
await shot('03b-belts-close', 'belts', [], [10, 4, 6, 0], 1000);
await shot('04-items', 'items', [], null, 1000);
for (const b of ['wiese', 'wueste', 'eis', 'mond']) await shot('05-terrain-' + b, 'terrain', [b], null, 1200);
await shot('06-people', 'people', [], null, 1200);
await shot('07-fx', 'fx', [], null, 1700);
const MACH = ['bohrer', 'grossbohrer', 'ofen', 'presse', 'drahtzug', 'montage', 'raffinerie', 'experiment', 'labor', 'verkauf', 'lager', 'verteiler', 'sortierer', 'tunnel', 'band'];
for (const t of MACH) await shot('10-' + t, 'one', [t, 0], null, 800);
for (const t of ['bohrer', 'grossbohrer', 'verkauf', 'montage']) for (const y of [1, 2, 3]) await page.evaluate(([tt, yy]) => { __demo.show('one', tt, 0); const n = { bohrer: 2, grossbohrer: 4, verkauf: 2, montage: 3 }[tt]; __demo.rig.jumpTo(6 + n / 2, 6 + n / 2, 2.6 + n * 1.6, yy); }, [t, y]).then(() => W(700)).then(async () => { await page.screenshot({ path: path.join(out, `11-${t}-view${y}.png`) }); shots++; });
// Bildschirm ↔ Feld: Weltpunkt projizieren und zurück
const pick = await page.evaluate(() => { __demo.show('factory'); const st = __demo.stage; st.render(); const bad = [];
  for (const [x, y] of [[3, 4], [9, 5], [12, 7], [6, 2]]) { const s = st.screenPos([x + .5, 0, y + .5]); const c = st.screenToCell(s.x, s.y); if (!c || c.x !== x || c.y !== y) bad.push(`${x},${y} → ${c && c.x},${c && c.y}`); }
  return bad; });
ok(pick.length === 0, 'screenToCell/screenPos stimmen überein' + (pick.length ? ': ' + pick.join(' ') : ''));
// ==== TESTS MK (Agent Upgrades) ====
await shot('12-mk', 'mk', [], null, 1500);
for (const t of ['bohrer', 'grossbohrer', 'montage', 'verkauf']) await shot('12-mk-' + t, 'mkone', [t], null, 1000);
// ==== ENDE MK ====
// ==== TESTS EFFEKTE/OVERLAYS (Agent Fx) ====
await shot('13-events-all', 'eventsAll', [], [14, 9, 15, 0], 2200);
await shot('13b-storm', 'storm', [], null, 3000);
await shot('13c-overlay', 'overlay', [], [12, 8, 16, 0], 1200);
await shot('13d-card', 'events', ['5'], [12, 7, 8, 0], 1100);
await shot('13e-vip', 'events', ['2'], [16, 7, 9, 0], 2600);
const fxApi = await page.evaluate(async () => { const fx = __demo.fx, bad = [];
  for (const m of ['meteor', 'quakeCracks', 'storm', 'vip', 'goldvein', 'breakthrough', 'albumCard', 'wheelConfetti', 'upgradeSparks']) if (typeof fx[m] !== 'function') bad.push('fehlt ' + m);
  const h = [fx.meteor(3, 3), fx.quakeCracks(5, 5, 2, { secs: 1 }), fx.vip([20, 5], [10, 5]), fx.goldvein(4, 4, 2, 1), fx.breakthrough([6, 0, 6]), fx.albumCard([6, 1, 6], { item: 'motor', variant: 'mega' }), fx.wheelConfetti([6, .5, 6]), fx.upgradeSparks(2, 2, 3)];
  for (let i = 0; i < 400; i++) fx.update(1 / 30, __demo.stage.camera);
  const alive = fx.events.length; const ks = h.filter(x => !x.done).length; fx.clear();
  return { bad, alive, ks, after: fx.events.length };
});
ok(!fxApi.bad.length && fxApi.alive === 1 && fxApi.after === 0, `Ereignis-Effekte: alle laufen ab (übrig nach 13 s: ${fxApi.alive} = Krater), clear räumt auf` + (fxApi.bad.length ? ' ' + fxApi.bad.join(', ') : ''));
// ==== ENDE EFFEKTE ====
// ==== TESTS TON (Agent Ton) ====
// Ton: alle Effekte offline erzeugen (einzeln hörbar, zusammen ohne Übersteuern), Musik je Welt mit großer Fabrik
const snd = await page.evaluate(async () => {
  const { Sound, SOUND_NAMES, WORLDS } = await import('/fabrik/js/audio.js');
  const st = (buf) => { let pk = 0, ss = 0, zc = 0, n = 0; for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { const v = d[i]; pk = Math.max(pk, Math.abs(v)); ss += v * v; n++; if (c === 0 && i && (v >= 0) !== (d[i - 1] >= 0)) zc++; } }
    return { peak: pk, rms: Math.sqrt(ss / n), zcr: zc / buf.length * buf.sampleRate }; };
  const ctx = new OfflineAudioContext(2, 44100 * 13, 44100), s = new Sound({ context: ctx });
  s.setFactory({ machines: 150, busy: .8 }); s.setPower({ plants: 3, load: .9 }); s.setStorm(true);
  let n = 0; for (const nm of SOUND_NAMES) { if (s.play(nm, { force: true, at: n * .12, variant: 'mega', stage: 5 })) n++; }
  const ticks = s.wheelSpin(2.5); s.renderAhead(13);
  const all = st(await ctx.startRendering());
  const quiet = [];                                                       // jeder neue Effekt allein hörbar
  for (const nm of ['power', 'blackout', 'drone', 'meteor', 'quake', 'storm', 'wheel', 'win', 'streak', 'breakthrough', 'card', 'upgrade', 'wonder', 'launch']) {
    const c2 = new OfflineAudioContext(1, 44100 * (nm === 'launch' ? 6 : 3), 44100), s2 = new Sound({ context: c2, musicOn: false }); s2.play(nm, { force: true });
    const r = st(await c2.startRendering()); if (!(r.peak > .02 && r.peak < 1)) quiet.push(nm + ' ' + r.peak.toFixed(3));
  }
  const music = {};
  for (const w of WORLDS) { const c3 = new OfflineAudioContext(2, 44100 * 6, 44100), s3 = new Sound({ context: c3, world: w }); s3.setFactory({ machines: 150, busy: .8 }); s3.renderAhead(6); if (w === 'wiese') s3.setWorld('mond'); music[w] = st(await c3.startRendering()); }
  return { n, ticks, all, quiet, music };
});
ok(snd.n >= 29 && snd.all.peak > .01 && snd.all.peak < 1, `Ton: ${snd.n} Effekte + ${snd.ticks} Rad-Ticks + Strom/Sturm-Atmo zusammen, Spitze ${snd.all.peak.toFixed(2)}`);
ok(snd.quiet.length === 0, 'neue Effekte einzeln hörbar und unter 1' + (snd.quiet.length ? ': ' + snd.quiet.join(', ') : ''));
{ const M = snd.music, W = Object.keys(M), same = [];
  for (let i = 0; i < W.length; i++) for (let j = i + 1; j < W.length; j++) { const a = M[W[i]], b = M[W[j]], d = Math.max(Math.abs(a.zcr - b.zcr) / Math.max(a.zcr, b.zcr), Math.abs(a.rms - b.rms) / Math.max(a.rms, b.rms)); if (d < .05) same.push(W[i] + '≈' + W[j]); }
  ok(W.length === 4 && W.every(w => M[w].peak > .01 && M[w].peak < 1) && !same.length, 'Musik je Welt: ' + W.map(w => `${w} Spitze ${M[w].peak.toFixed(2)} ZCR ${M[w].zcr.toFixed(0)}`).join(' · ') + (same.length ? ' – zu ähnlich: ' + same.join(' ') : '')); }
// ==== ENDE TON ====
// ==== TESTS STROM/WUNDER/DROHNEN/LOD/FOTO (Agent Grafik) ====
await shot('14-power', 'power', [], [9, 6, 14, 0], 1400);
for (const t of ['kraftwerk', 'solar', 'mast', 'heizer', 'drohnenhafen']) await shot('14-' + t, 'one', [t, 0], null, 900);
await shot('15-wonder', 'wonder', [], [17.5, 6.5, 26, 0], 1400);
await page.evaluate(() => __demo.setT(6)); await shot('15b-launch', 'launch', [], [15.5, 15.5, 16, 0], 1200); await page.evaluate(() => __demo.setT(null));
await shot('16-drones', 'drones', [], [8, 7, 9, 0], 1200);
await shot('17-frost', 'frost', [], [8, 7.5, 11, 0], 1000);
await shot('19-photo', 'photo', ['warm'], null, 1500);
const api = await page.evaluate(async () => {
  const B = await import('/fabrik/js/models/buildings.js'), PW = await import('/fabrik/js/models/power.js'), bad = [];
  for (const t of ['kraftwerk', 'solar', 'mast', 'heizer', 'drohnenhafen']) { const b = B.makeBuilding(t, { rot: 1 }); b.group.position.set(5, 0, 5); const a = b.anchor('cable'); if (!a || a.some(v => !isFinite(v)) || a[1] < .3) bad.push(t + ' Kabelpunkt ' + a); b.dispose(); }
  const g = PW.cableGeometry([0, 2, 0], [6, 2, 0]); g.computeBoundingBox(); if (!(g.boundingBox.min.y < 1.8)) bad.push('Kabel ohne Durchhang ' + g.boundingBox.min.y.toFixed(2));
  const w = B.makeBuilding('wunder', {}); for (let s = 0; s <= 5; s++) { w.setStage(s, .5); w.update(s, { busy: true }); }
  if (w.stage !== 5) bad.push('Wunder-Stufe'); w.launch(10); for (let t = 10; t < 30; t += .1) w.update(t, {}); if (!w.launched) bad.push('Rakete nicht gestartet'); w.resetLaunch(); w.update(31, {}); if (w.launched) bad.push('resetLaunch'); w.dispose();
  const b = B.makeBuilding('bohrer', { mk: 1 }); b.setMk(3); if (b.mk !== 3) bad.push('setMk'); b.update(1, { mk: 2 }); if (b.mk !== 2) bad.push('state.mk'); b.dispose();
  return bad;
});
ok(api.length === 0, 'Kabelpunkte, Durchhang, Wunder-Stufen/Start, setMk' + (api.length ? ': ' + api.join('; ') : ''));
// Fotomodus: hochauflösend und 9:16 unabhängig von der Fenstergröße
const ph = await page.evaluate(async () => { const st = __demo.stage; const url = st.capture({ scale: 2 }); const im = new Image(); im.src = url; await im.decode();
  const cv = st.renderFrame(1080, 1920); const d = cv.getContext('2d').getImageData(0, 0, 1080, 1920).data; let s = 0, s2 = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 97) { const l = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; s += l; s2 += l * l; n++; }
  return { w: im.width, h: im.height, cw: st.width * (st.pr || 1), fw: cv.width, fh: cv.height, sd: Math.sqrt(s2 / n - (s / n) ** 2), url: cv.toDataURL('image/jpeg', .85) }; });
fs.writeFileSync(path.join(out, '19b-frame-9x16.jpg'), Buffer.from(ph.url.split(',')[1], 'base64')); shots++;
ok(ph.w >= ph.cw * 1.9 && ph.fw === 1080 && ph.fh === 1920 && ph.sd > 6, `Foto ${ph.w}×${ph.h} (2×), renderFrame ${ph.fw}×${ph.fh} (Streuung ${ph.sd.toFixed(0)})`);
// Leistung (#17): 300 Maschinen, ~2200 Bänder, 3800 Teile – mit LOD (Übersicht und nah) und ohne
const perf = async (args, cam) => { await page.evaluate(([a, c]) => { __demo.show('stress300', ...a); if (c) __demo.rig.jumpTo(...c); }, [args, cam]); await W(1500);
  const fps = await page.evaluate(() => new Promise(r => { let n = 0; const t = performance.now(); const f = () => { n++; if (performance.now() - t < 3000) requestAnimationFrame(f); else r(n / 3); }; requestAnimationFrame(f); }));
  const i = await page.evaluate(async () => { const L = (await import('/fabrik/js/models/lod.js')); return { ...__demo.info, belts: __demo.belts.K ? [...__demo.belts.K.values()].reduce((a, k) => a + k.n, 0) : 0 }; });
  return { fps, ...i }; };
const pLod = await perf([true], null); await page.screenshot({ path: path.join(out, '18-stress300.png') }); shots++;
const pNear = await perf([true], [30, 30, 18, 0]); await page.screenshot({ path: path.join(out, '18b-stress300-near.png') }); shots++;
const pFull = await perf([false], null);
console.log(`  Stress 300 Maschinen, ${pLod.belts} Bänder: LOD Übersicht ${pLod.fps.toFixed(0)} fps / ${pLod.calls} Draw Calls / ${(pLod.tris / 1e6).toFixed(2)} M Dreiecke · LOD nah ${pNear.fps.toFixed(0)} fps / ${pNear.calls} Calls · ohne LOD ${pFull.fps.toFixed(0)} fps / ${pFull.calls} Calls`);
ok(pLod.belts >= 2000, '≥ 2000 Bänder'); ok(pLod.fps >= 45 && pNear.fps >= 45, 'Stress mit LOD ≥ 45 fps (headless)'); ok(pLod.calls < pFull.calls / 3, 'LOD spart Draw Calls');
// ==== ENDE STROM ====
// Leistung: 20 000 Teile
await page.evaluate(() => __demo.show('stress')); await W(1500);
const fps = await page.evaluate(() => new Promise(r => { let n = 0; const t = performance.now(); const f = () => { n++; if (performance.now() - t < 3000) requestAnimationFrame(f); else r(n / 3); }; requestAnimationFrame(f); }));
const info = await page.evaluate(() => ({ ...__demo.info, items: __demo.items.count }));
console.log(`  Stress: ${info.items} Teile, ${fps.toFixed(0)} fps (headless), ${info.calls} Draw Calls, ${(info.tris / 1e6).toFixed(2)} M Dreiecke`);
ok(info.items >= 20000, '20 000 Teile gezeichnet'); ok(fps > 15, 'Bildrate ausreichend');
await page.screenshot({ path: path.join(out, '08-stress.png') }); shots++;
// Qualitätsstufen umschalten
for (const q of ['mittel', 'niedrig', 'hoch']) { await page.evaluate(q => __demo.stage.setQuality(q), q); await W(400); }
ok(true, 'Qualitätsstufen umgeschaltet');
await browser.close(); srv.close();
console.log(`${shots} Bilder in ${out}`);
console.log(fails ? `MODELS FEHLER: ${fails}` : 'MODELS OK'); process.exit(fails ? 1 : 0);
