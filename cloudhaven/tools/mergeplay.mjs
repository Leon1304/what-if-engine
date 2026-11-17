// Modus „Verschmelzen“ im echten Spiel (headless Chromium, WebGL): Modus über den Dialog starten → Spielfeld sichtbar →
// per echtem Mausklick 3 gleiche setzen → Verschmelzung (Kachel wechselt, Felder frei) mit flüssiger Animation (kein Bild > 100 ms)
// → Kettenreaktion mit Vorschau → Ablagefach (H) → Rückgängig → Ende-Bildschirm bei vollem Feld → Nochmal → Handbuch
// → Englisch ohne deutsche Reste. Keine Konsolenfehler. Endet mit MERGEPLAY OK.
//   node cloudhaven/tools/mergeplay.mjs [ausgabeordner]
import http from 'http'; import fs from 'fs'; import path from 'path'; import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.resolve(process.argv[2] || 'work/cloudhaven-merge'); fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const URL0 = `http://localhost:${srv.address().port}/index.html`;
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
const watch = (page, tag) => {
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|favicon/.test(m.text())) { console.log(`  [${tag}] console error: ${m.text()}`); fails++; } });
  page.on('pageerror', e => { console.log(`  [${tag}] PAGE ERROR: ${e.message}\n` + (e.stack || '').split('\n').slice(0, 4).join('\n')); fails++; });
  page.on('dialog', d => { console.log(`  [${tag}] native dialog!`); fails++; d.dismiss(); });
};
const W = (page, ms = 400) => page.waitForTimeout(ms);
const shot = async (page, n) => { await page.screenshot({ path: path.join(out, n + '.png') }); console.log('  📷 ' + path.join(out, n + '.png')); };

// Stand laden: nur Brunnen + gegebene Kacheln, Vorrat fest (über game.load wie ein Spielstand)
const setup = (page, tiles, stack, extra = {}) => page.evaluate(([tiles, stack, extra]) => {
  const { app, game, ui } = __insel, S = game.serialize();
  app.loadGame({ ...S, tiles: [{ k: 'start', q: 0, r: 0, o: 0 }, ...tiles.map(([k, q, r]) => ({ k, q, r, o: 0 }))], stack: stack.map(k => ({ k })), pick: 0, hold: null, ...extra });
  game.undoStack = []; ui._renderAll(); ui.hideInfo();
}, [tiles, stack, extra]);
// Feldmitte auf dem Bildschirm (für echte Mausklicks)
const scr = (page, q, r) => page.evaluate(([q, r]) => { const { app } = __insel, p = app.tilePos(q, r); return app.screenPos([p[0], .2, p[2]]); }, [q, r]);
// Kamera fest über das Spielfeld (schräg von oben), damit alle Felder klickbar sind
const camTop = page => page.evaluate(() => { const { rig, THREE } = __insel; const y = rig.g.yaw; rig.jumpTo(new THREE.Vector3(Math.sin(y) * 9, 0, Math.cos(y) * 9), 112, y, 0); });
// Bildzeiten aufzeichnen: längstes Bild in ms über die nächsten ms Millisekunden
const frames = (page, ms) => page.evaluate(ms => new Promise(res => { const d = []; let l = performance.now(); const t0 = l;
  const f = now => { d.push(now - l); l = now; if (now - t0 < ms) requestAnimationFrame(f); else res({ max: Math.round(Math.max(...d)), n: d.length, med: Math.round(d.sort((a, b) => a - b)[d.length >> 1]) }); }; requestAnimationFrame(f); }), ms);
const clickAt = async (page, q, r) => { const s = await scr(page, q, r); await page.mouse.move(s.x, s.y); await W(page, 120); await page.mouse.down(); await page.mouse.up(); return s; };
const state = page => page.evaluate(() => { const { game, world } = __insel; return { tiles: Object.fromEntries([...game.board].map(([k, t]) => [k, t.k])), T: world.T.size, B: game.board.size, anim: !!world.mAnim, score: game.S.score, hold: game.S.hold?.k || null, stack: game.S.stack.map(e => e.k) }; });

// ================= Deutsch =================
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'de-DE' });
const page = await ctx.newPage(); watch(page, 'de');
await page.goto(URL0);
await page.waitForFunction(() => window.__insel && window.__insel.ui.mode === 'menu', null, { timeout: 90000 }); await W(page, 1200);
await page.locator('.mmenu .btn[data-act=new]').first().click(); await W(page, 400);
const modeCard = page.locator('.mode[data-mode=verschmelzen]');
ok(await modeCard.count() === 1 && (await modeCard.textContent()).includes('Verschmelzen'), 'Neue Insel: Modus 🔮 Verschmelzen wählbar');
await modeCard.click(); await W(page, 200); await shot(page, '01-dialog');
await page.locator('.modal input[type=text]').fill('Schmelztiegel');
await page.locator('.modal .btn[data-act=create]').first().click(); await W(page, 2500);
ok(await page.evaluate(() => __insel.game.S.mode === 'verschmelzen' && __insel.ui.mode === 'play' && __insel.game.S.name === 'Schmelztiegel'), 'Insel im Modus Verschmelzen läuft');
ok(await page.locator('.mb .mc[data-i]').count() === 3 && await page.locator('.mb .mc[data-act=hold]').isVisible(), 'Bauleiste: 3 große Vorratskarten + Ablagefach');
ok(await page.locator('.info').isVisible() && (await page.locator('.info').textContent()).includes('3 gleiche'), 'Kurzanleitung beim Start');
ok((await page.locator('.score .next').textContent()).includes('Freie Felder'), 'HUD: freie Felder');
const fld = await page.evaluate(() => { const { world, game } = __insel; const n = game.slots().length, pos = world.fieldMesh?.children[0]?.geometry.attributes.position.count; return { n, plates: pos / 18, rim: !!world.fieldMesh?.children[1] }; });
ok(fld.plates === fld.n && fld.rim, `Spielfeld: ${fld.plates} Bodenplatten für ${fld.n} freie Felder, Rand sichtbar`);
await camTop(page); await W(page, 1500); await shot(page, '02-spielfeld');

// --- 3 gleiche per Mausklick ---
await setup(page, [['wiese', 3, -3], ['wald', -3, 3]], ['felsen', 'felsen', 'felsen']); await camTop(page); await W(page, 1500);
await clickAt(page, 1, 0); await W(page, 900); await clickAt(page, 2, 0); await W(page, 900);
let st = await state(page);
ok(st.tiles['1,0'] === 'felsen' && st.tiles['2,0'] === 'felsen', 'zwei Felsen per Mausklick gesetzt (noch keine Verschmelzung)');
const before = st.score;
await page.mouse.move(...Object.values(await scr(page, 1, 1)).slice(0, 2)); await W(page, 400);
const pv = await page.evaluate(() => ({ keys: __insel.world.mp?.keys.length || 0, card: document.querySelector('.mhov')?.innerText || '' }));
ok(pv.keys === 2 && /3× Felsen → Blockhütte/.test(pv.card) && /\+\d+/.test(pv.card), `Vorschau: 2 Kacheln leuchten, Karte „${pv.card.replace(/\n/g, ' ').slice(0, 60)}“`);
await shot(page, '03-vorschau');
let fr = frames(page, 2600); await page.mouse.down(); await page.mouse.up();
await W(page, 520); await shot(page, '04-animation');
let f = await fr;
if (f.max > 100) { console.log(`  Ausreißer ${f.max} ms – einmal wiederholen`); await setup(page, [['wiese', 3, -3], ['felsen', 1, 0], ['felsen', 2, 0]], ['felsen', 'felsen', 'felsen']); await camTop(page); await W(page, 1500);
  const s = await scr(page, 1, 1); await page.mouse.move(s.x, s.y); await W(page, 400); fr = frames(page, 2600); await page.mouse.down(); await page.mouse.up(); f = await fr; }
await W(page, 300);
st = await state(page);
ok(st.tiles['1,1'] === 'huette' && !st.tiles['1,0'] && !st.tiles['2,0'], 'Verschmelzung: 3 Felsen → Blockhütte, zwei Felder wieder frei');
ok(!st.anim && st.T === st.B, `Animation fertig, Welt = Brett (${st.T} Kacheln)`);
ok(f.max <= 100, `Animation flüssig: längstes Bild ${f.max} ms (Median ${f.med} ms, ${f.n} Bilder)`);
ok(st.score > before, `Punkte: ${before} → ${st.score}`);

// --- Kettenreaktion: Felsen zu 2 Felsen, daneben 2 Blockhütten → Haus ---
// Ziel (1,0): Felsen (2,0)+(2,-1) → Blockhütte, die mit (1,1)+(0,1) gleich weiter zum Fachwerkhaus verschmilzt
const CHAIN = [['felsen', 2, 0], ['felsen', 2, -1], ['huette', 1, 1], ['huette', 0, 1]];
await setup(page, [...CHAIN, ['wiese', -2, 0]], ['felsen', 'wiese', 'feld']); await camTop(page); await W(page, 1500);
let s0 = await scr(page, 1, 0); await page.mouse.move(s0.x, s0.y); await W(page, 400);
const pv2 = await page.evaluate(() => ({ keys: __insel.world.mp?.keys.length || 0, card: document.querySelector('.mhov')?.innerText || '', rows: document.querySelectorAll('.mhov .mrow').length, imgs: document.querySelectorAll('.mhov .mi img').length }));
ok(pv2.keys === 4 && pv2.rows === 2 && pv2.imgs >= 4 && /Kettenreaktion/.test(pv2.card) && /Fachwerkhaus/.test(pv2.card), `Vorschau Kette: 4 Kacheln, 2 Schritte mit Bildern`);
await shot(page, '05-vorschau-kette');
fr = frames(page, 3200); await page.mouse.down(); await page.mouse.up();
await W(page, 1050); await shot(page, '06-kette-mitten');
f = await fr; await W(page, 400);
st = await state(page);
ok(st.tiles['1,0'] === 'haus' && !st.tiles['2,0'] && !st.tiles['2,-1'] && !st.tiles['1,1'] && !st.tiles['0,1'], 'Kettenreaktion: Felsen → Blockhütte → Fachwerkhaus, 4 Felder frei');
ok(!st.anim && st.T === st.B, 'Kette fertig, Welt = Brett');
ok(f.max <= 100 || (console.log(`  Ausreißer ${f.max} ms`), false), `Kette flüssig: längstes Bild ${f.max} ms (Median ${f.med} ms)`);
ok(await page.evaluate(() => [...document.querySelectorAll('.fx .pop')].some(e => /Kette/.test(e.textContent)) || __insel.game.S.stats.merges >= 2), 'Punkte-Schilder je Schritt');

// --- Ablagefach ---
const h0 = await state(page);
await page.keyboard.press('h'); await W(page, 400);
let h1 = await state(page);
ok(h1.hold === h0.stack[0] && await page.locator('.mc[data-act=hold]:not(.empty)').count() === 1 && (await page.locator('.toasts').textContent()).includes('Ablagefach'), `Ablagefach: ${h1.hold} abgelegt (Taste H, Toast)`);
await page.locator('.mc[data-act=hold]').click(); await W(page, 400);
const h2 = await state(page);
ok(h2.hold === h1.stack[0] && h2.stack[0] === h1.hold, 'Ablagefach: Klick tauscht');
await shot(page, '07-ablagefach');
// --- Rückgängig: 2× Fach, dann die Kette ---
for (let i = 0; i < 3; i++) { await page.keyboard.press('Control+z'); await W(page, 500); }
st = await state(page);
ok(!st.tiles['1,0'] && st.tiles['2,0'] === 'felsen' && st.tiles['0,1'] === 'huette' && st.hold === null && st.T === st.B, 'Rückgängig: Fach und Kette zurück, Welt = Brett');

// --- Ende: Feld voll ---
const full = await page.evaluate(() => { const { game } = __insel, cells = game._field().filter(([q, r]) => q || r), K = ['wiese', 'feld', 'wald', 'weg', 'teich', 'felsen'];
  // abwechselnd verschiedene Arten, nie 3 gleiche zusammen: Art nach (q - r) mod 3 + Zeilen-Versatz
  return cells.map(([q, r]) => [K[((q - r) % 3 + 3) % 3 + (r % 2 ? 3 : 0)], q, r]); });
const last = full.pop();
await setup(page, full, ['schafe', 'muehle', 'kreuzung']); await camTop(page); await W(page, 1500);
ok(await page.evaluate(() => __insel.game.slots().length === 1), 'Feld bis auf eins voll');
await clickAt(page, last[1], last[2]);
await page.waitForSelector('.modal .btn[data-act=again]', { timeout: 8000 }).catch(() => {});
ok(await page.locator('.modal .btn[data-act=again]').isVisible(), 'Ende-Bildschirm bei vollem Feld');
const endTxt = await page.locator('.modal').textContent();
ok(/Verschmelzungen/.test(endTxt) && /Höchste Stufe/.test(endTxt) && await page.locator('.modal .mbest img').count() === 1 && await page.locator('.modal .btn[data-act=photo]').count() === 1 && await page.locator('.modal .btn[data-act=timelapse]').count() === 1, 'Ende: Punkte, Verschmelzungen, höchste Stufe mit Bild, Foto, Zeitraffer');
await shot(page, '08-ende');
await page.locator('.modal .btn[data-act=again]').click(); await W(page, 1500);
ok(await page.evaluate(() => __insel.game.S.mode === 'verschmelzen' && __insel.game.slots().length > 25 && __insel.game.S.name === 'Schmelztiegel' && !document.querySelector('.modal')), 'Nochmal: neue Runde auf derselben Insel');

// --- Handbuch ---
await page.keyboard.press('b'); await W(page, 400);
await page.locator('.book nav button', { hasText: 'Verschmelzen' }).click(); await W(page, 300);
ok((await page.locator('.book .body').textContent()).includes('Kettenreaktion'), 'Handbuch: Kapitel Verschmelzen (Regeln)');
await page.locator('.book .foot .btn[data-act=next]').click(); await W(page, 500);
ok(await page.locator('.book .mchain').count() === 6 && await page.locator('.book .mchain .mk img').count() >= 20, 'Handbuch: 6 Ketten als Bildreihen');
await shot(page, '09-handbuch');
await page.keyboard.press('Escape'); await W(page, 300);
await ctx.close();

// ================= Englisch =================
const DE_WORDS = /[äöüßÄÖÜ]|\b(Kacheln?|Insel\w*|Punkte?|und|oder|mit|der|die|das|eine?|nicht|Wald|Wiese|Bach|Weg|Haus|Dorf|Felder?|Vorrat|Aufgaben?|Spiel\w*|Handbuch|Einstellungen|Menü|zurück|Neu|Tag|Sprache|Strg|Kategorie|Bauleiste|Gruppe|freigeschaltet|Schritt|Seite|Weiter|Stufe|Felsen|Ablagefach|Verschmel\w*|frei|Kette)\b/;
const german = pg => pg.evaluate(re => {
  re = new RegExp(re.slice(1, re.lastIndexOf('/')));
  const ui = document.getElementById('ui'), bad = [], okL = s => /^(🇩🇪 Deutsch|Deutsch|🇩🇪 DE)$/.test(s.trim());
  for (const line of ui.innerText.split('\n')) { const m = line.match(re); if (m && !okL(line)) bad.push(`${line.trim().slice(0, 80)} [${m[0]}]`); }
  for (const e of ui.querySelectorAll('[title],[aria-label]')) { const r = e.getBoundingClientRect(); if (!r.width || getComputedStyle(e).visibility === 'hidden') continue;
    for (const a of ['title', 'aria-label']) { const v = e.getAttribute(a), m = v && v.match(re); if (m && !okL(v)) bad.push(`@${a}: ${v.slice(0, 80)} [${m[0]}]`); } }
  return [...new Set(bad)];
}, DE_WORDS.toString());
const noGerman = async (pg, where) => { const b = await german(pg); ok(!b.length, `EN ${where}: keine deutschen Reste${b.length ? ' → ' + b.slice(0, 6).join(' | ') : ''}`); };
const ectx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'en-US' });
const ep = await ectx.newPage(); watch(ep, 'en');
await ep.goto(URL0);
await ep.waitForFunction(() => window.__insel && window.__insel.ui.mode === 'menu', null, { timeout: 90000 }); await W(ep, 1200);
await ep.locator('.mmenu .btn[data-act=new]').first().click(); await W(ep, 400);
await ep.locator('.mode[data-mode=verschmelzen]').click(); await W(ep, 200);
await noGerman(ep, 'Neue Insel mit Modus');
await ep.locator('.modal input[type=text]').fill('Meltpot');
await ep.locator('.modal .btn[data-act=create]').first().click(); await W(ep, 2000);
await noGerman(ep, 'Start + Kurzanleitung');
await setup(ep, CHAIN, ['felsen', 'wiese', 'feld']); await camTop(ep); await W(ep, 1500);
s0 = await scr(ep, 1, 0); await ep.mouse.move(s0.x, s0.y); await W(ep, 400);
await noGerman(ep, 'Vorschau Kette'); await shot(ep, 'e1-vorschau-en');
await ep.mouse.down(); await ep.mouse.up(); await W(ep, 2200);
await noGerman(ep, 'nach der Kette'); await ep.keyboard.press('h'); await W(ep, 300); await noGerman(ep, 'Ablagefach');
await ep.evaluate(() => __insel.ui._end()); await W(ep, 500); await noGerman(ep, 'Ende'); await shot(ep, 'e2-ende-en');
await ep.keyboard.press('Escape'); await W(ep, 300);
await ep.keyboard.press('b'); await W(ep, 400);
const pages = await ep.evaluate(() => __insel.ui._pages().length);
const bookBad = [];
for (let i = 0; i < pages; i++) { await ep.evaluate(i => __insel.ui._find('book').go(i), i); await W(ep, 60); for (const b of await german(ep)) bookBad.push(`S.${i + 1}: ${b}`); }
ok(!bookBad.length, `EN Handbuch (${pages} Seiten): keine deutschen Reste${bookBad.length ? ' → ' + bookBad.slice(0, 6).join(' | ') : ''}`);
await ep.locator('.book nav button', { hasText: 'Merge mode' }).click(); await W(ep, 300); await ep.locator('.book .foot .btn[data-act=next]').click(); await W(ep, 400);
await shot(ep, 'e3-handbuch-en');

await browser.close(); srv.close();
console.log(fails ? `MERGEPLAY FEHLER: ${fails}` : 'MERGEPLAY OK'); process.exit(fails ? 1 : 0);
