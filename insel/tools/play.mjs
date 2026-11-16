// Gesamttest des Spiels im headless Chromium: Start → neue Insel → viele Kacheln setzen (echte Klicks auf freie Felder
// für die ersten, dann über die Logik) → Meilensteine/Aufgaben → Bildrate → Speichern → Neuladen → gleiche Insel → Rückgängig
// → Nahaufnahmen ohne Kamera in Geometrie → Zeitraffer. Endet mit PLAY OK.
//   node insel/tools/play.mjs [ausgabeordner] [--shots]
import http from 'http'; import fs from 'fs'; import path from 'path'; import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.resolve(process.argv[2] || 'work/insel-play'); fs.mkdirSync(out, { recursive: true });
const SHOTS = process.argv.includes('--shots');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const URL0 = `http://localhost:${srv.address().port}/index.html`;
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|favicon/.test(m.text())) { console.log('  console error: ' + m.text()); fails++; } });
page.on('pageerror', e => { console.log('  PAGE ERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')); fails++; });
page.on('dialog', d => { console.log('  native dialog!'); fails++; d.dismiss(); });
const shot = async n => { await page.screenshot({ path: path.join(out, n + '.png') }); console.log('  📷 ' + path.join(out, n + '.png')); };
const W = (ms = 400) => page.waitForTimeout(ms);

const t0 = Date.now();
await page.goto(URL0);
await page.waitForFunction(() => window.__insel && window.__insel.ui.mode === 'menu', null, { timeout: 90000 });
ok(true, `Start bis Menü: ${Date.now() - t0} ms`); await W(1500); if (SHOTS) await shot('01-menu');
await page.locator('.mmenu .btn', { hasText: 'Neue Insel' }).first().click(); await W(300);
await page.locator('.modal input[type=text]').fill('Testinsel');
await page.locator('.modal .btn', { hasText: 'Insel erschaffen' }).first().click(); await W(1500);
ok(await page.evaluate(() => __insel.game.S.name === 'Testinsel' && __insel.ui.mode === 'play'), 'neue Insel läuft');
await page.evaluate(() => { __insel.game.S.tut = 99; __insel.ui.notify('tileRotate', { o: 0 }); });

// Echte Klicks: freie Felder auf den Bildschirm projizieren und anklicken
const clickPlace = async () => page.evaluate(() => {
  const { game, app } = __insel, c = game.current(); let best = null;
  for (const [q, r] of game.slots()) for (let o = 0; o < 6; o++) { const e = game.evaluate(c.k, q, r, o); if (!e.ok) continue;
    const p = app.tilePos(q, r), s = app.screenPos([p[0], .2, p[2]]); if (!s.visible || s.x < 380 || s.x > 900 || s.y < 160 || s.y > 560) continue;
    if (!best || e.pts > best.e.pts) best = { q, r, o, e, sx: s.x, sy: s.y }; }
  return best;
});
let clicked = 0, tried = 0;
for (let i = 0; i < 6; i++) {
  const b = await clickPlace(); if (!b) continue; tried++;
  const n0 = await page.evaluate(() => __insel.game.board.size);
  for (let k = 0; k < 6 && await page.evaluate(() => __insel.app._rot()) !== b.o; k++) await page.keyboard.press('r');
  await page.mouse.move(b.sx, b.sy); await W(150); await page.mouse.down(); await page.mouse.up(); await W(800);
  if (await page.evaluate(() => __insel.game.board.size) > n0) clicked++;
  else console.log('  Klick ohne Wirkung:', JSON.stringify({ q: b.q, r: b.r, o: b.o, rot: await page.evaluate(() => __insel.app._rot()), x: Math.round(b.sx), y: Math.round(b.sy), el: await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.className, [b.sx, b.sy]) }));
}
ok(tried >= 3 && clicked === tried, `Kacheln per Mausklick gesetzt: ${clicked}/${tried}`);
if (SHOTS) await shot('02-erste-kacheln');

// Viele Kacheln über die Logik (wie ein guter Spieler)
const res = await page.evaluate(async () => {
  const { game } = __insel; let n = 0, ms = 0, q = 0, unl = 0;
  for (let i = 0; i < 90 && game.S.stack.length; i++) {
    const c = game.current(); let best = null;
    for (const [qq, r] of game.slots()) for (let o = 0; o < 6; o++) { const e = game.evaluate(c.k, qq, r, o); if (e.ok && (!best || e.pts + Math.random() * 3 > best.e.pts)) best = { qq, r, o, e }; }
    if (!best) { game.S.stack.splice(game.S.pick, 1); continue; }
    const t = performance.now(); const r = game.place(best.qq, best.r, best.o); ms = Math.max(ms, performance.now() - t); n++;
    q += r.quests.length; unl += r.unlocked.length;
    if (i % 10 === 0) await new Promise(r => setTimeout(r, 30));
  }
  return { n, ms: Math.round(ms), q, unl, tiles: game.board.size, score: game.S.score };
});
ok(res.n > 40, `${res.n} weitere Kacheln, Insel ${res.tiles} Kacheln, ${res.score} Punkte, Aufgaben ${res.q}, Freischaltungen ${res.unl}`);
ok(res.ms < 400, `langsamstes Setzen ${res.ms} ms`);
await W(1200);
await page.evaluate(() => { const { ui, game } = __insel; ui._closeAll(); if (!game.S.stack.length) game.endless(); });
{ const b = page.locator('button, .btn', { hasText: 'Anleitung überspringen' }).first(); if (await b.count() && await b.isVisible()) { await b.click({ force: true }); await W(400); } }
for (let i = 0; i < 8; i++) { const b = page.locator('button, .btn', { hasText: 'Prima!' }).first(); if (await b.count() && await b.isVisible()) { await b.click({ force: true }); await W(250); } else break; }
await W(1000);
// Bildrate über 3 s
const fps = await page.evaluate(() => new Promise(r => { let n = 0; const t = performance.now(); const f = () => { n++; if (performance.now() - t < 3000) requestAnimationFrame(f); else r(n / 3); }; requestAnimationFrame(f); }));
const info = await page.evaluate(() => { const i = __insel.stage.renderer.info.render; return { calls: i.calls, tris: i.triangles }; });
console.log(`  Bildrate ${fps.toFixed(0)} fps (headless), ${info.calls} Draw Calls, ${(info.tris / 1e6).toFixed(2)} M Dreiecke`);
ok(fps > 20, 'Bildrate ausreichend');
if (SHOTS) {
  await shot('02b-hud');
  await page.keyboard.press('p'); await W(600);
  await page.evaluate(() => __insel.app.applySettings({ dayCycle: false, time: 10 })); await W(800); await shot('03-insel-tag');
  await page.evaluate(() => __insel.app.applySettings({ time: 18.3 })); await W(800); await shot('04-insel-abend');
  await page.evaluate(() => __insel.app.applySettings({ time: 22.5 })); await W(800); await shot('05-insel-nacht');
  await page.evaluate(() => __insel.app.applySettings({ time: 11, season: 3, weather: 'schnee' })); await W(2500); await shot('06-winter');
  await page.evaluate(() => __insel.app.applySettings({ season: 2, weather: 'klar' })); await W(2000); await shot('07-herbst');
  await page.evaluate(() => __insel.app.applySettings({ season: 'auto', weather: 'auto', time: 10 }));
  await page.keyboard.press('Escape'); await W(500);
}

// Nahaufnahmen aller Häuser: Kamera darf nicht in Geometrie stecken
const close = await page.evaluate(async () => {
  const { world, rig, stage, THREE } = __insel; const bad = []; let n = 0;
  const frames = k => new Promise(r => { let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  const houses = [...world.T.values()].filter(o => ['haus', 'kapelle', 'hof', 'muehle'].includes(o.t.k)).slice(0, 6);
  for (const o of houses) for (const yaw of [0, 1.6, 3.2, 4.8]) for (const dist of [2.5, 6]) {
    rig.jumpTo(new THREE.Vector3(o.cx + .3, 0, o.cz + .2), dist, yaw); await frames(25);
    const cam = stage.camera; cam.updateMatrixWorld(); n++;
    if (cam.position.y < world.groundAt(cam.position.x, cam.position.z) + .1) bad.push(o.t.k + ' unter Boden');
    let back = 0;
    for (const d of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]]) {
      const dir = new THREE.Vector3(...d), h = new THREE.Raycaster(cam.position, dir, 0, 8).intersectObjects(world.blockers(), false)[0];
      if (h && h.face && h.face.normal.clone().transformDirection(h.object.matrixWorld).dot(dir) > 0) back++;
    }
    if (back >= 3) bad.push(o.t.k + ' Kamera im Gebäude');
  }
  return { n, bad };
});
ok(close.bad.length === 0, `Nahaufnahmen an Häusern: ${close.n} Blickwinkel, Probleme: ${close.bad.length ? close.bad.join(', ') : 'keine'}`);
if (SHOTS) {
  await page.evaluate(() => { const { world, rig, THREE } = __insel; const o = [...world.T.values()].find(o => o.t.k === 'haus'); const a = -o.t.o * Math.PI / 3; rig.jumpTo(new THREE.Vector3(o.cx + Math.cos(-a) * 6, 0, o.cz + Math.sin(-a) * 6), 7, Math.PI / 2 - a); });
  await page.keyboard.press('p'); await W(1500); await shot('08-haus-nah'); await page.keyboard.press('Escape'); await W(300);
}

// Speichern → Neuladen → gleiche Insel
const before = await page.evaluate(() => { __insel.ui.auto?.flush?.(); return JSON.stringify(__insel.game.S.tiles); });
await page.reload();
await page.waitForFunction(() => window.__insel && window.__insel.ui.mode === 'menu', null, { timeout: 90000 }); await W(1200);
const after = await page.evaluate(() => JSON.stringify(__insel.game.S.tiles));
ok(before === after, 'Speichern → Neuladen ergibt dieselbe Insel');
await page.locator('.mmenu .btn', { hasText: 'Weiterspielen' }).first().click(); await W(800);
const u = await page.evaluate(() => { const g = __insel.game; if (!g.S.stack.length) g.endless(); const n = g.board.size, c = g.current(); for (const [q, r] of g.slots()) for (let o = 0; o < 6; o++) if (g.evaluate(c.k, q, r, o).ok) { g.place(q, r, o); const m = g.board.size; g.undo(); return [n, m, g.board.size, __insel.world.T.size]; } return null; });
ok(u && u[1] === u[0] + 1 && u[2] === u[0] && u[3] === u[0], 'Rückgängig entfernt die Kachel auch aus der Welt');

// Zeitraffer kurz anspielen
await page.evaluate(() => { __insel.app.timelapse({}); }); await W(2500); if (SHOTS) await shot('09-zeitraffer');
const tl = await page.evaluate(() => [...__insel.world.T.values()].filter(o => o.g.visible).length);
ok(tl > 0, `Zeitraffer läuft (${tl} Kacheln schon sichtbar)`);

await browser.close(); srv.close();
console.log(fails ? `PLAY FEHLER: ${fails}` : 'PLAY OK'); process.exit(fails ? 1 : 0);
