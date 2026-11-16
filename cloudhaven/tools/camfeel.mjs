// Misst, ob Ziehen und Zoomen ruckeln: echte Maus-/Rad-Eingaben, je Bild Kameraposition und Bildzeit.
// Meldet Sprünge (Kamera springt mehr als 4× so weit wie im Mittel), lange Bilder (> 50 ms) und Ausreißer beim Ziel (y).
//   node cloudhaven/tools/camfeel.mjs [ausgabeordner]  → CAM OK
import http from 'http'; import fs from 'fs'; import path from 'path'; import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.resolve(process.argv[2] || 'work/cloudhaven-cam'); fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
page.on('pageerror', e => { console.log('PAGE ERROR ' + e.message); fails++; });
await page.goto(`http://localhost:${srv.address().port}/index.html?neu`);
await page.waitForFunction(() => window.__insel && __insel.ui.mode === 'menu', null, { timeout: 90000 });
await page.locator('.mmenu .btn[data-act=new]').first().click(); await page.waitForTimeout(300);
await page.locator('.modal .btn[data-act=create]').first().click(); await page.waitForTimeout(800);
await page.evaluate(async () => { const { game, ui } = __insel; game.S.unlocked = Object.keys((await import('./js/tiles.js')).TILES).filter(k => k !== 'start'); game.S.stack = []; game._refill(80);
  for (let i = 0; i < 70; i++) { const c = game.current(); let best = null; for (const [q, r] of game.slots()) for (let o = 0; o < 6; o++) { const e = game.evaluate(c.k, q, r, o); if (e.ok && (!best || e.pts + Math.random() * 2 > best.e.pts)) best = { q, r, o, e }; } if (best) game.place(best.q, best.r, best.o); else game.S.stack.shift(); }
  ui._closeAll(); game.S.tut = 99; document.querySelectorAll('.tut, .cards, .card').forEach(e => e.remove?.()); });
await page.waitForTimeout(3000);
// Zeitmessung je Teil (wer verursacht lange Bilder?)
await page.evaluate(() => { const I = __insel; window.__slow = [];
  const wrap = (o, name, label) => { const f = o[name].bind(o); o[name] = (...a) => { const t = performance.now(); const r = f(...a); const d = performance.now() - t; if (d > 40) window.__slow.push(label + ' ' + Math.round(d)); return r; }; };
  wrap(I.world, 'update', 'world.update'); wrap(I.life, 'update', 'life.update'); wrap(I.stage, 'update', 'stage.update'); wrap(I.stage, 'render', 'stage.render'); wrap(I.rig, 'update', 'rig.update'); wrap(I.ui, 'frame', 'ui.frame'); wrap(I.sound, 'update', 'sound.update');
  wrap(I.world, 'setGhost', 'world.setGhost'); });
// Aufzeichnung je Bild
await page.evaluate(() => { const { stage, rig } = __insel; window.__rec = []; let last = performance.now();
  const f = now => { const c = stage.camera.position; window.__rec.push({ dt: now - last, x: c.x, y: c.y, z: c.z, ty: rig.target.y, d: rig.camDistance ?? rig.distance, gd: rig.goal.d, tx: rig.target.x, tz: rig.target.z, col: rig.colDist, hit: rig._hit, lift: rig.liftS }); last = now; if (window.__recOn) requestAnimationFrame(f); };
  window.__recOn = true; requestAnimationFrame(f); });
const cx = 640, cy = 400;
// 1) Weit raus → ganz nah ran über dem Dorf (Rad in kleinen Schritten, Zeiger wandert)
const village = await page.evaluate(() => { const o = [...__insel.world.T.values()].find(o => o.t.k === 'haus') || [...__insel.world.T.values()][0]; const s = __insel.app.screenPos([o.cx + 4, .2, o.cz]); return [s.x, s.y]; });
await page.mouse.move(village[0], village[1]);
for (let i = 0; i < 45; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(40); }
await page.waitForTimeout(800);
// 2) Ziehen (schieben) nah am Boden quer durchs Dorf
await page.evaluate(() => window.__rec.push({ mark: 'drag' }));
await page.mouse.move(cx, cy); await page.mouse.down();
for (let i = 0; i < 60; i++) { await page.mouse.move(cx - i * 9, cy + Math.sin(i / 6) * 40); await page.waitForTimeout(16); }
await page.mouse.up(); await page.waitForTimeout(800);
await page.evaluate(() => window.__rec.push({ mark: 'rot' }));
// 3) Drehen mit rechter Maustaste
await page.mouse.move(cx, cy); await page.mouse.down({ button: 'right' });
for (let i = 0; i < 50; i++) { await page.mouse.move(cx + i * 8, cy - i * 2); await page.waitForTimeout(16); }
await page.mouse.up({ button: 'right' }); await page.waitForTimeout(600);
await page.evaluate(() => window.__rec.push({ mark: 'out' }));
// 4) Raus zoomen über den Rand ins Leere, dann ziehen über den Inselrand
await page.mouse.move(60, 60); for (let i = 0; i < 30; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(40); }
await page.mouse.move(200, 200); await page.mouse.down(); for (let i = 0; i < 50; i++) { await page.mouse.move(200 + i * 14, 200 + i * 8); await page.waitForTimeout(16); } await page.mouse.up();
await page.waitForTimeout(800);
await page.evaluate(() => window.__rec.push({ mark: 'edgezoom' }));
// 5) Zoom ganz nah an den Rand (Zeiger über Leere)
await page.mouse.move(1200, 120); for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(40); }
await page.waitForTimeout(1000);
const rec0 = await page.evaluate(() => { window.__recOn = false; return window.__rec; });
const marks = []; const rec = []; for (const r of rec0) { if (r.mark) marks.push(r.mark + '@' + rec.length); else rec.push(r); } console.log('  Abschnitte:', marks.join(' '));
console.log('  langsame Teile:', JSON.stringify(await page.evaluate(() => window.__slow)));
await page.screenshot({ path: path.join(out, 'ende.png') });
// Auswertung
const vel = []; for (let i = 1; i < rec.length; i++) vel.push(Math.hypot(rec[i].x - rec[i - 1].x, rec[i].y - rec[i - 1].y, rec[i].z - rec[i - 1].z) / Math.max(8, rec[i].dt) * 16.7);
const jumps = []; for (let i = 6; i < vel.length - 6; i++) { const win = vel.slice(i - 6, i).concat(vel.slice(i + 1, i + 7)).sort((a, b) => a - b), med = win[8] + .02 * rec[i].d + .01; if (vel[i] > med * 4 && vel[i] > .08 * Math.max(1, rec[i].d)) jumps.push({ i, v: +vel[i].toFixed(2), med: +med.toFixed(2), d: +rec[i].d.toFixed(1), dt: Math.round(rec[i + 1]?.dt || 0) }); }
if (process.env.DUMP) for (const j of jumps.filter(j => j.v > 1).slice(0, 2)) for (let i = j.i - 3; i <= j.i + 3; i++) console.log(i, JSON.stringify(rec[i], (k, v) => typeof v === 'number' ? +v.toFixed(2) : v));
console.log('  langsame Teile:', JSON.stringify(await page.evaluate(() => window.__slow)));
const longF = rec.map((r, i) => [i, r.dt]).slice(3).filter(r => r[1] > 50).map(r => r[0] + ':' + Math.round(r[1]));
const tys = rec.map(r => r.ty), tyJ = []; for (let i = 1; i < tys.length; i++) if (Math.abs(tys[i] - tys[i - 1]) > .5) tyJ.push(+(tys[i] - tys[i - 1]).toFixed(2));
console.log(`  ${rec.length} Bilder, mittlere Bildzeit ${(rec.reduce((s, r) => s + r.dt, 0) / rec.length).toFixed(1)} ms, min Ziel-y ${Math.min(...tys).toFixed(1)}`);
ok(jumps.length === 0, `Kamerasprünge: ${jumps.length} ${JSON.stringify(jumps.slice(0, 8))}`);
ok(longF.length <= 2, `lange Bilder (> 50 ms): ${longF.length} ${JSON.stringify(longF.slice(0, 12))}`);
ok(tyJ.length === 0 && Math.min(...tys) > -2, `Ziel-Höhe springt: ${tyJ.length} ${JSON.stringify(tyJ.slice(0, 8))}`);
await browser.close(); srv.close();
console.log(fails ? `CAM FEHLER: ${fails}` : 'CAM OK'); process.exit(fails ? 1 : 0);
