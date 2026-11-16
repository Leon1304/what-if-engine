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
  const B = await import('/fabrik/js/models/buildings.js'), THREE = __demo.THREE, bad = []; let n = 0;
  let outCell = null; try { ({ outCell } = await import('/fabrik/js/sim.js')); } catch (e) {}
  const DV = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  for (const t of B.BUILDING_TYPES) for (let r = 0; r < 4; r++) for (const o of t === 'band' ? [{}, { inDir: (r + 3) % 4 }, { inDir: (r + 1) % 4 }] : t === 'tunnel' ? [{}, { exit: true }] : [{}]) {
    const b = B.makeBuilding(t, { rot: r, ...o }); b.group.position.set(10, 0, 20); b.group.updateMatrixWorld(true); b.update(1, { busy: true }); b.group.updateMatrixWorld(true); n++;
    const N = b.size, box = new THREE.Box3(), tmp = new THREE.Box3();
    b.group.traverse(m => { if (!m.isMesh || !m.visible) return; let p = m, skip = false; while (p) { if (/^smoke|^dish|^tilt/.test(p.name)) skip = true; p = p.parent; } if (skip) return;
      m.geometry.computeBoundingBox(); tmp.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); box.union(tmp); });
    const tol = .06; if (box.min.x < 10 - tol || box.min.z < 20 - tol || box.max.x > 10 + N + tol || box.max.z > 20 + N + tol || box.min.y < -.01) bad.push(`${t} r${r} ${JSON.stringify(o)} ragt heraus: ${[box.min.x - 10, box.min.z - 20, box.max.x - 10, box.max.z - 20, box.min.y].map(v => v.toFixed(2))}`);
    for (const p of b.ports.out) { const cx = N / 2, cz = N / 2, dx = p.x - cx, dz = p.z - cz, d = DV[p.dir];
      if (dx * d[0] + dz * d[1] <= 0 || Math.abs(Math.max(Math.abs(dx), Math.abs(dz)) - N / 2) > .01) bad.push(`${t} r${r} Port ${JSON.stringify(p)} falsch`); }
    // gleiches Ausgabefeld wie die Sim (outCell)
    if (outCell && N > 1 && t !== 'verkauf') { const p = b.ports.out[0], d = DV[p.dir], c = [Math.floor(p.x + d[0] * .5), Math.floor(p.z + d[1] * .5)], e = outCell(0, 0, N, N, r);
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
const MACH = ['bohrer', 'ofen', 'presse', 'drahtzug', 'montage', 'raffinerie', 'experiment', 'labor', 'verkauf', 'lager', 'verteiler', 'sortierer', 'tunnel', 'band'];
for (const t of MACH) await shot('10-' + t, 'one', [t, 0], null, 800);
for (const t of ['bohrer', 'verkauf', 'montage']) for (const y of [1, 2, 3]) await page.evaluate(([tt, yy]) => { __demo.show('one', tt, 0); const n = { bohrer: 2, verkauf: 2, montage: 3 }[tt]; __demo.rig.jumpTo(6 + n / 2, 6 + n / 2, 2.6 + n * 1.6, yy); }, [t, y]).then(() => W(700)).then(async () => { await page.screenshot({ path: path.join(out, `11-${t}-view${y}.png`) }); shots++; });
// Bildschirm ↔ Feld: Weltpunkt projizieren und zurück
const pick = await page.evaluate(() => { __demo.show('factory'); const st = __demo.stage; st.render(); const bad = [];
  for (const [x, y] of [[3, 4], [9, 5], [12, 7], [6, 2]]) { const s = st.screenPos([x + .5, 0, y + .5]); const c = st.screenToCell(s.x, s.y); if (!c || c.x !== x || c.y !== y) bad.push(`${x},${y} → ${c && c.x},${c && c.y}`); }
  return bad; });
ok(pick.length === 0, 'screenToCell/screenPos stimmen überein' + (pick.length ? ': ' + pick.join(' ') : ''));
// Ton: alle Effekte offline erzeugen (keine Fehler)
const snd = await page.evaluate(async () => { const { Sound, SOUND_NAMES } = await import('/fabrik/js/audio.js'); const ctx = new OfflineAudioContext(2, 44100 * 2, 44100);
  const s = new Sound({ context: ctx }); s.unlock?.(); s.setFactory({ machines: 12, busy: .5 }); let n = 0; for (const nm of SOUND_NAMES) { s.play(nm, { force: true, at: n * .1 }); n++; }
  const buf = await ctx.startRendering(); let peak = 0; for (let c = 0; c < 2; c++) for (const v of buf.getChannelData(c)) peak = Math.max(peak, Math.abs(v)); return { n, peak }; });
ok(snd.n >= 10 && snd.peak > .01 && snd.peak < 1, `Ton: ${snd.n} Effekte, Spitze ${snd.peak.toFixed(2)}`);
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
