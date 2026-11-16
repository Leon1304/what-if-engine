// Prüfskript für die What If Town (M0):  node sandbox/tools/check.mjs [--out <ordner>] [--gpu] [--keep]
//   startet einen statischen Server (Repo-Wurzel), öffnet sandbox/index.html in Chromium (wie render.mjs: SwiftShader-WebGL, three.js / Rapier aus node_modules),
//   wartet auf die ruhige Stadt, zielt (Maus), löst den Asteroiden per Code an fester Stelle aus, prüft nach dem Einschlag:
//   keine Page-/Console-Errors in Hülle und iframes, Ladezeiten, fps, Zähler ändern sich, Zurückspulen (seek(1) vor dem Einschlag = gleiches Bild wie vorher),
//   Tempo, „Stadt zurücksetzen“. Screenshots nach --out. Letzte Zeile: SANDBOX OK oder SANDBOX FAIL + Fehlerliste.
//   --gpu: echte GPU (ANGLE/Metal) statt SwiftShader → fps sind dann aussagekräftig. Headless mit SwiftShader sind fps nur ein Richtwert.
//   Vorher bauen: bash sandbox/build.sh
import { chromium } from 'playwright';
import { readFileSync, existsSync, mkdirSync, statSync } from 'fs';
import http from 'http';
import path from 'path';

const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i > -1 ? argv[i + 1] : d; }, flag = k => argv.includes('--' + k);
const HERE = path.dirname(new URL(import.meta.url).pathname), ROOT = path.resolve(HERE, '../..');
const OUT = path.resolve(opt('out', path.join(ROOT, 'work/sandbox-shots'))); mkdirSync(OUT, { recursive: true });
const GPU = flag('gpu'), FIRE = [12, -6];   // fester Einschlagsort (Stadtmitte, etwas versetzt)
const fail = [], info = [], log = (...a) => { console.log(...a); info.push(a.join(' ')); };
const sec = ms => (ms / 1000).toFixed(1) + ' s';

const WORLD = path.join(ROOT, 'sandbox/world.html');
if (!existsSync(WORLD)) { console.log('sandbox/world.html fehlt – erst bauen: bash sandbox/build.sh\nSANDBOX FAIL'); process.exit(1); }
for (const f of ['world.story.js', 'world.scene.js']) if (statSync(path.join(ROOT, 'sandbox', f)).mtimeMs > statSync(WORLD).mtimeMs + 1000) log(`HINWEIS: sandbox/${f} ist neuer als world.html – bash sandbox/build.sh vergessen?`);

// ---------- statischer Server ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.mjs': 'application/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !existsSync(f) || statSync(f).isDirectory()) { r.writeHead(404); return r.end('404'); }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] ?? 'application/octet-stream', 'cache-control': 'no-store' }); r.end(readFileSync(f));
}).listen(0, '127.0.0.1');
await new Promise(r => srv.once('listening', r));
const BASE = `http://127.0.0.1:${srv.address().port}`;

// ---------- Browser (Startoptionen wie render.mjs) ----------
const browser = await chromium.launch({
  executablePath: existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined,
  args: GPU ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=metal'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
page.setDefaultTimeout(900000);
const THREE_DIR = path.join(ROOT, 'node_modules/three'), RAPIER = path.join(ROOT, 'node_modules/@dimforge/rapier3d-deterministic-compat');
await page.route(/cdn\.jsdelivr\.net\/npm\//, route => {   // gilt auch für die iframes
  const url = route.request().url(), m = url.match(/three@[\d.]+\/(.*)$/), c = url.match(/rapier3d-deterministic-compat@[\d.]+\/(.*)$/);
  if (m) return route.fulfill({ contentType: 'application/javascript', body: readFileSync(path.join(THREE_DIR, m[1])) });
  if (c && existsSync(path.join(RAPIER, c[1]))) return route.fulfill({ contentType: 'application/javascript', body: readFileSync(path.join(RAPIER, c[1])) });
  return route.continue();
});
const errors = [];
page.on('pageerror', e => errors.push('PAGE ERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(`CONSOLE ERROR (${(m.location()?.url ?? '').split('/').pop().split('#')[0] || '?'}): ${m.text().slice(0, 400)}`); });
page.on('frameattached', () => {});
const shot = async name => { const f = path.join(OUT, name); await page.screenshot({ path: f }); log('screenshot', f); return f; };
const ev = (fn, arg) => page.evaluate(fn, arg);
const settle = () => ev(() => new Promise(r => { const w = window.sandbox.active.win; w.requestAnimationFrame(() => w.requestAnimationFrame(() => setTimeout(r, 50))); }));
const waitMode = async (mode, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(() => window.sandbox?.mode).catch(() => null) === mode) return true; if (errors.some(e => /PAGE ERROR/.test(e))) break; await new Promise(r => setTimeout(r, 250)); } return false; };
const fps = () => ev(() => new Promise(r => { const w = window.sandbox.active.win; let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) w.requestAnimationFrame(f); else r({ raf: n / ((performance.now() - t0) / 1000), engine: w.whatif.live.fps }); }; w.requestAnimationFrame(f); }));
const frames = n => ev(n => new Promise(r => { const w = window.sandbox.active.win; let k = 0; const f = () => (++k >= n ? r() : w.requestAnimationFrame(f)); w.requestAnimationFrame(f); }), n);   // n gezeichnete Bilder abwarten (langsame Rechner)
const stats = t => ev(t => window.sandbox.active.api.stats(t), t);
const val = (st, label) => st.find(s => s.label === label)?.value;

try {
  // 1. ruhige Stadt
  const t0 = Date.now();
  await page.goto(BASE + '/sandbox/');
  if (!await waitMode('city', 900000)) throw new Error('die ruhige Stadt wurde nicht fertig (sandbox.mode ≠ city)');
  const tm = await ev(() => window.sandbox.timings);
  log(`LADEN Stadt: ${sec(tm.city)} (Seite bis bereit: ${sec(Date.now() - t0)})`);
  await page.waitForTimeout(800); await shot('01-stadt.png');
  const L0 = await ev(() => { const a = window.sandbox.active.api; return { t: a.t, playing: a.playing, dur: a.dur }; });
  if (!L0.playing) fail.push('die ruhige Stadt läuft nicht (live.playing = false)');
  const f1 = await fps(); log(`FPS Stadt: ${f1.raf.toFixed(1)} (rAF im iframe, 3 s) · whatif.live.fps ${f1.engine.toFixed(1)}${GPU ? '' : ' – SwiftShader, nur Richtwert'}`);
  const L1 = await ev(() => window.sandbox.active.api.t);
  if (!(((L1 - L0.t) % L0.dur + L0.dur) % L0.dur > 0.05)) fail.push(`die Uhr der Stadt läuft nicht (t ${L0.t.toFixed(2)} → ${L1.toFixed(2)})`);

  // 2. zielen: Karte wählen, Maus über die Stadt → Zielring
  await ev(() => window.sandbox.pick('asteroid'));
  if (await ev(() => window.sandbox.mode) !== 'aim') fail.push('Karte „Asteroid“ startet den Zielmodus nicht');
  await page.mouse.move(700, 470); await page.mouse.move(720, 480, { steps: 4 }); await page.waitForTimeout(300);
  await settle(); await shot('02-zielen.png');
  const mk = await ev(() => window.sandbox.city.win.whatif.probe('LIVEMK ? { v: LIVEMK.visible, x: LIVEMK.position.x, z: LIVEMK.position.z } : null'));
  if (!mk?.v) fail.push('Zielring folgt der Maus nicht (marker unsichtbar)'); else log(`Zielring unter der Maus bei x ${mk.x.toFixed(1)}, z ${mk.z.toFixed(1)}`);

  // 3. auslösen (per Code, feste Stelle) → Countdown, Laden im Hintergrund
  const tf = Date.now();
  await ev(([x, z]) => { window.sandbox.fire('asteroid', x, z); }, FIRE);
  await page.waitForTimeout(1200); await shot('03-countdown.png');
  if (!await waitMode('play', 900000)) throw new Error('das Szenario wurde nicht fertig (sandbox.mode ≠ play)');
  const ts = await ev(() => window.sandbox.timings);
  log(`LADEN Szenario Asteroid: ${sec(ts.scenario)} (Klick bis Abspielen inkl. Countdown: ${sec(Date.now() - tf)})`);
  const A = await ev(() => { const w = window.sandbox.active; return { s: w.params.s, dur: w.api.dur, t: w.api.t, playing: w.api.playing, cam: w.api.cam(), city: w === window.sandbox.city }; });
  if (A.city || A.s !== 'asteroid') fail.push('nach dem Countdown ist nicht die Asteroiden-Welt aktiv');
  if (!A.playing) fail.push('das Szenario spielt nach dem Umschalten nicht ab');
  const camC = await ev(() => window.sandbox.city.api.cam());
  if (Math.abs(camC.az - A.cam.az) > 0.5 || Math.abs(camC.dist - A.cam.dist) > 1) fail.push('Kamera-Stand wurde beim Umschalten nicht übernommen');
  const cityPaused = await ev(() => !window.sandbox.city.api.playing); if (!cityPaused) fail.push('die Stadt im Hintergrund läuft weiter (sollte pausieren)');
  const f2 = await fps(); log(`FPS Szenario: ${f2.raf.toFixed(1)} (rAF) · whatif.live.fps ${f2.engine.toFixed(1)}`);

  // 4. Zurückspulen: Bild bei t = 1 vor und nach dem Einschlag gleich
  await ev(() => { const a = window.sandbox.active.api; a.pause(); a.seek(1); }); await settle();
  const imgA = await page.locator('iframe.world.active').screenshot({ path: path.join(OUT, '04a-welt-t1.png') }); await shot('04-vor-einschlag-t1.png');
  const s1 = await stats(1), s2 = await stats(2.5);
  for (const [t, name] of [[4.6, '05-einschlag.png'], [9, '06-druckwelle.png'], [20, '07-danach.png']]) { await ev(t => window.sandbox.active.api.seek(t), t); await settle(); await shot(name); }
  const s9 = await stats(9), s20 = await stats(20);
  log('ZÄHLER t=1:', s1.map(s => `${s.label} ${s.text}`).join(' · '));
  log('ZÄHLER t=9:', s9.map(s => `${s.label} ${s.text}`).join(' · '));
  log('ZÄHLER t=20:', s20.map(s => `${s.label} ${s.text}`).join(' · '));
  if (!(val(s1, 'Einschlag in') > val(s2, 'Einschlag in'))) fail.push('Zähler „Einschlag in“ zählt nicht herunter');
  if (!(val(s9, 'Gebäude zerstört') > 0)) fail.push('nach dem Einschlag ist kein Gebäude zerstört (Zähler)');
  if (!(val(s20, 'Gebäude zerstört') >= val(s9, 'Gebäude zerstört'))) fail.push('Zähler „Gebäude zerstört“ fällt');
  if (!(val(s9, 'Druckwelle') > 0)) fail.push('Zähler „Druckwelle“ bleibt 0');
  // live ein Stück abspielen (über den Einschlag), dann zurück
  await ev(() => { const a = window.sandbox.active.api; a.seek(3.5); a.play(); }); await page.waitForTimeout(1500); await frames(4);
  const tp = await ev(() => window.sandbox.active.api.t); if (!(tp > 3.6)) fail.push(`die Uhr läuft im Szenario nicht (t = ${tp.toFixed(2)})`);
  await ev(() => { const a = window.sandbox.active.api; a.pause(); a.seek(1); }); await settle();
  const imgB = await page.locator('iframe.world.active').screenshot({ path: path.join(OUT, '04b-zurueckgespult-t1.png') });
  const diff = await ev(async ([a, b]) => {   // mittlere Abweichung pro Kanal (0–255) und Anteil Pixel mit > 24 Abweichung
    const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
    const [ia, ib] = await Promise.all([load(a), load(b)]), c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height; const g = c.getContext('2d');
    g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data; g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, c.width, c.height).data;
    let s = 0, big = 0; for (let i = 0; i < da.length; i += 4) { const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]); s += d; if (d > 72) big++; }
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (let i = 0; i < da.length; i += 4) { const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]); if (d > 72) { const p = i / 4, x = p % c.width, y = (p / c.width) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
    return { mean: s / (da.length / 4) / 3, big: big / (da.length / 4), box: x1 >= 0 ? [x0, y0, x1, y1] : null };
  }, [imgA.toString('base64'), imgB.toString('base64')]);
  log(`ZURÜCKSPULEN: Bild bei t=1 vorher/nachher – Abweichung ${diff.mean.toFixed(3)} / 255, ${(diff.big * 100).toFixed(3)} % Pixel deutlich anders${diff.box ? ' (Bereich ' + diff.box.join(',') + ')' : ''}`);
  if (diff.mean > 0.5 || diff.big > 0.002) fail.push(`seek(1) nach dem Einschlag zeigt nicht dasselbe Bild wie vorher (Abweichung ${diff.mean.toFixed(2)}, ${(diff.big * 100).toFixed(2)} %)`);

  // 5. Tempo
  await ev(() => { window.sandbox.setRate(0.5); const a = window.sandbox.active.api; a.seek(10); a.play(); });
  await frames(2); const r0 = await ev(() => [window.sandbox.active.api.t, performance.now()]); await page.waitForTimeout(1500); await frames(3);
  const r1 = await ev(() => [window.sandbox.active.api.t, performance.now(), window.sandbox.active.api.rate]);
  log(`TEMPO 0,5×: ${((r1[0] - r0[0]) / ((r1[1] - r0[1]) / 1000)).toFixed(2)} s Szenenzeit pro s (dt je Bild ≤ 0,1 s – bei langsamem Rendern weniger)`);
  if (r1[2] !== 0.5 || !(r1[0] > r0[0])) fail.push('Tempo 0,5× wirkt nicht');
  await ev(() => { window.sandbox.setRate(1); window.sandbox.active.api.pause(); });

  // 6. Stadt zurücksetzen
  await ev(() => window.sandbox.reset());
  const R = await ev(() => ({ mode: window.sandbox.mode, city: window.sandbox.active === window.sandbox.city, playing: window.sandbox.city.api.playing, frames: document.querySelectorAll('iframe.world').length }));
  if (R.mode !== 'city' || !R.city || !R.playing) fail.push('„Stadt zurücksetzen“ führt nicht zur laufenden Stadt zurück');
  await page.waitForTimeout(600); await settle(); await shot('08-zurueckgesetzt.png');
  log(`iframes nach dem Zurücksetzen: ${R.frames} (Stadt bleibt geladen, Szene entfernt)`);
  const se = await ev(() => window.sandbox.errors); for (const e of se) errors.push('WELT-FEHLER: ' + e);
} catch (e) { fail.push('ABBRUCH: ' + e.message.split('\n')[0]); try { await shot('99-abbruch.png'); } catch (e2) {} }

for (const e of [...new Set(errors)]) fail.push(e);
await browser.close(); srv.close();
if (fail.length) { console.log('\nSANDBOX FAIL'); for (const f of fail) console.log(' - ' + f); process.exit(1); }
console.log('\nSANDBOX OK');
