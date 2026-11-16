// Gesamttest von Cogtopia im headless Chromium: Start bis Menü → Sprache DE/EN → neue Fabrik → echte Mausklicks
// (Bohrer auf Vorkommen, Band per Ziehen zur Verkaufsstation, Geld steigt) → Info-Panel + Rezept → Forschung → alle Panels
// → Abriss + Undo (Strg/⌘Z, Undo scheitert) → Autosave/Neuladen/Weiterspielen → Offline-Meldung → Speicherplätze, Export/Import mit Rückfrage
// + Sicherung → Hintergrund-Tab → fremde Ids → GPU-Speicher (kein Leck) → große Fabrik (Bildrate) → Handy-Ansicht. Endet mit PLAY OK.
//   node fabrik/tools/play.mjs [ausgabeordner] [--shots]
import http from 'http'; import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const require = createRequire(path.join(ROOT, 'package.json'));
let chromium; try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = require('playwright')); }
const out = path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'work/fabrik-play'); fs.mkdirSync(out, { recursive: true });
const SHOTS = process.argv.includes('--shots');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };
const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const URL0 = `http://localhost:${srv.address().port}/fabrik/index.html`;
// three.js aus dem lokalen node_modules (gleiche Version wie die Importmap), sonst aus dem Netz
const THREE_DIR = [path.join(ROOT, 'node_modules/three'), path.resolve(ROOT, '../../../node_modules/three')].find(p => fs.existsSync(path.join(p, 'package.json')));
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; return c; };
async function newPage(opts) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true, ...opts });
  if (THREE_DIR) await ctx.route('https://cdn.jsdelivr.net/npm/three@0.170.0/**', route => {
    const rel = route.request().url().split('three@0.170.0/')[1], f = path.join(THREE_DIR, rel);
    if (fs.existsSync(f)) route.fulfill({ path: f, contentType: 'text/javascript' }); else route.continue();
  });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|favicon|ERR_INTERNET|net::/.test(m.text())) { console.log('  console error: ' + m.text()); fails++; } });
  page.on('pageerror', e => { console.log('  PAGE ERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')); fails++; });
  page.on('dialog', d => { console.log('  native dialog: ' + d.message()); fails++; d.dismiss(); });
  return { ctx, page };
}
const { ctx, page } = await newPage();
const W = (ms = 400) => page.waitForTimeout(ms);
const shot = async (n, p = page) => { if (!SHOTS) return; const f = path.join(out, n + '.png'); await p.screenshot({ path: f }); console.log('  📷 ' + f); };
const toMenu = p => p.waitForFunction(() => window.__fabrik && window.__fabrik.ui.mode === 'menu', null, { timeout: 90000 });
// Weltpunkt → Bildschirm
const scr = (wx, wz, y = 0) => page.evaluate(([x, z, y]) => __fabrik.stage.screenPos([x, y, z]), [wx, wz, y]);
const money = () => page.evaluate(() => __fabrik.sim.S.money);
const ents = () => page.evaluate(() => __fabrik.sim.S.ents.length);

// ------------------------------------------------------------------------------------------------ Start
let t0 = Date.now();
await page.goto(URL0);
await toMenu(page);
ok(true, `Start bis Menü: ${Date.now() - t0} ms`);
await page.waitForFunction(() => __fabrik.iconsReady, null, { timeout: 30000 }).catch(() => {});
await W(1200); await shot('01-menu');

// ------------------------------------------------------------------------------------------------ Sprache
const menuText = () => page.locator('.menu .mbtns').innerText();
const en0 = await menuText();
await page.locator('.menu .langbtn').click(); await W(400);
const de0 = await menuText(), lang1 = await page.evaluate(() => document.documentElement.lang);
ok(de0 !== en0 && /Neue Fabrik/.test(de0) && lang1 === 'de', `Sprache auf Deutsch: „${de0.split('\n')[0]}“, <html lang=${lang1}>`);
await shot('01b-menu-de');
await page.locator('.menu .langbtn').click(); await W(400);
ok(/New factory/.test(await menuText()) && await page.evaluate(() => document.documentElement.lang) === 'en', 'zurück auf Englisch');

// ------------------------------------------------------------------------------------------------ Neue Fabrik
await page.locator('.menu .btn', { hasText: 'New factory' }).first().click(); await W(300);
if (await page.locator('.modal .btn.main').count()) await page.locator('.modal .btn.main').click();
await page.waitForFunction(() => __fabrik.ui.mode === 'play' && __fabrik.sim, null, { timeout: 10000 });
await W(800);
ok(await page.locator('.tut.on').count() === 1, 'Anleitung sichtbar: ' + (await page.locator('.tut p').first().innerText()).slice(0, 60));
const m0 = await money(); ok(m0 === 200, 'Startgeld 200');

// Bohrer per Mausklick auf das Eisenvorkommen (58,50), Ausgang nach Westen (rot 2)
await page.locator('.buildbar [data-b="bohrer"]').click(); await W(200);
await page.keyboard.press('r'); await page.keyboard.press('r'); await W(100);
ok(await page.evaluate(() => __fabrik.app.tool === 'bohrer' && __fabrik.app.rot === 2), 'Bohrer gewählt, zweimal gedreht');
let p = await scr(59, 51);
await page.mouse.move(p.x - 30, p.y - 20); await page.mouse.move(p.x, p.y, { steps: 5 }); await W(250);
const ghost = await page.evaluate(() => { const g = [...__fabrik.view.ghosts.values()].find(g => g.b.group.visible); return g ? { ok: g.ok, x: g.b.group.position.x, z: g.b.group.position.z } : null; });
ok(ghost && ghost.ok && ghost.x === 58 && ghost.z === 50, 'Geist-Vorschau grün auf (58,50): ' + JSON.stringify(ghost));
ok(await page.locator('.ctip.on').count() === 1 && /Drill/.test(await page.locator('.ctip').innerText()), 'Hinweis am Zeiger: ' + await page.locator('.ctip').innerText());
await shot('04-bauvorschau');
await page.mouse.down(); await page.mouse.up(); await W(300);
const drill = await page.evaluate(() => __fabrik.sim.S.ents.find(e => e.type === 'bohrer'));
ok(drill && drill.x === 58 && drill.y === 50 && drill.rot === 2, 'Bohrer per Klick gesetzt: ' + JSON.stringify(drill && { x: drill.x, y: drill.y, rot: drill.rot }));
// falscher Platz: kein Vorkommen → rot + Hinweis
p = await scr(53, 56.5); await page.mouse.move(p.x, p.y, { steps: 3 }); await W(200);
ok(await page.locator('.ctip.bad').count() === 1, 'ohne Vorkommen rot: ' + await page.locator('.ctip').innerText());

// Band ziehen: (57,51) → (56,51) → (56,54) → in die Verkaufsstation (55..56, 55..56)
await page.keyboard.press('1'); await W(150);
ok(await page.evaluate(() => __fabrik.app.tool === 'band'), 'Taste 1 wählt Förderband');
const cell = async (x, y) => scr(x + .5, y + .5);
p = await cell(57, 51); await page.mouse.move(p.x, p.y); await page.mouse.down();
for (const [x, y] of [[56.6, 51], [56, 51], [56, 52], [56, 53], [56, 54]]) { const q = await cell(x, y); await page.mouse.move(q.x, q.y, { steps: 4 }); await W(60); }
await shot('04b-band-ziehen');
await page.mouse.up(); await W(300);
const belts = await page.evaluate(() => __fabrik.sim.S.ents.filter(e => e.type === 'band').map(e => [e.x, e.y, e.rot]));
ok(JSON.stringify(belts) === '[[57,51,2],[56,51,1],[56,52,1],[56,53,1],[56,54,1]]', 'Band per Ziehen mit Kurve: ' + JSON.stringify(belts));
await page.keyboard.press('Escape'); await W(200);
const mA = await money(); await W(7000); const mB = await money();
ok(mB > mA, `Geld steigt: ${mA.toFixed(0)} → ${mB.toFixed(0)}`);
ok(await page.evaluate(() => __fabrik.sim.S.stats.sold) > 0, 'Teile verkauft');
await shot('02-fruehe-fabrik');

// ------------------------------------------------------------------------------------------------ Info-Panel + Rezept
await page.evaluate(() => { const s = __fabrik.sim; s.S.money += 5000; });
const ofen = await page.evaluate(() => { const s = __fabrik.sim; return s.place('ofen', 51, 56, 0); });
await W(300);
p = await scr(52, 57, .6); await page.mouse.click(p.x, p.y); await W(400);
ok(await page.locator('.info.on').count() === 1 && /Smelter/.test(await page.locator('.info .it b').innerText()), 'Info-Panel nach Klick: ' + await page.locator('.info .it b').innerText().catch(() => '—'));
await page.locator('.info .rb[data-r="eisenbarren"]').click(); await W(300);
const rec = await page.evaluate(id => { const e = __fabrik.sim.entity(id); return { recipe: e.recipe, auto: e.auto }; }, ofen);
ok(rec.recipe === 'eisenbarren' && rec.auto === false, 'Rezept fest auf Eisenbarren: ' + JSON.stringify(rec));
await shot('05-info-panel');
await page.locator('.info .rb[data-r=""]').click(); await W(200);
ok(await page.evaluate(id => __fabrik.sim.entity(id).auto, ofen), 'Rezept zurück auf Automatisch');
await page.keyboard.press('Escape'); await W(200);
ok(await page.locator('.info.on').count() === 0, 'Esc schließt Info-Panel');

// ------------------------------------------------------------------------------------------------ Forschung
await page.locator('.side [data-p="research"]').click(); await W(500);
ok(await page.locator('.sheet.on h2').innerText() === 'Research', 'Forschungs-Panel offen');
const r0 = await page.evaluate(() => __fabrik.sim.S.research.length);
await page.locator('.sheet [data-act="research"]:not([disabled])').first().click(); await W(400);
const r1 = await page.evaluate(() => __fabrik.sim.S.research.slice());
ok(r1.length === r0 + 1, 'Forschung gekauft: ' + r1.join(', '));
await shot('06-forschung');
await page.locator('.sheet .x').click(); await W(250);
ok(await page.locator('.sheet.on').count() === 0, 'Panel geschlossen');

// ------------------------------------------------------------------------------------------------ alle Panels
await page.evaluate(() => { const s = __fabrik.sim; s.S.crates.push({ src: 'gerald' }); s.S.book.fails.push('kohle+stein'); });
const panels = await page.evaluate(() => [...document.querySelectorAll('.side [data-p]')].map(b => b.dataset.p));
let good = 0;
for (const pn of panels) {
  await page.locator(`.side [data-p="${pn}"]`).click(); await W(350);
  const open = await page.locator(`.sheet.on[data-p="${pn}"] .bd`).count() === 1;
  const txt = open ? (await page.locator('.sheet .bd').innerText()).trim() : '';
  if (open && txt.length > 20) good++; else console.log('  Panel leer/zu: ' + pn);
  if (pn === 'book') await shot('07-rezeptbuch');
  if (pn === 'prestige') await shot('08-prestige');
  if (pn === 'contracts') await shot('07b-auftraege');
  if (pn === 'crates') {
    await page.locator('.sheet [data-act="crate"]').first().click(); await W(1600);
    ok(await page.evaluate(() => { const r = document.querySelector('.overlay.on .reveal'); return !!r && +getComputedStyle(r).opacity > .9 && __fabrik.sim.S.crates.length === 0; }), 'Kiste geöffnet mit Animation, Inhalt sichtbar');
    await shot('07c-kiste'); await page.locator('.overlay .reveal .btn').click(); await W(300);
    if (await page.locator('.sheet.on').count() === 0) { await page.locator('.side [data-p="crates"]').click(); await W(300); }
  }
  await page.keyboard.press('Escape'); await W(250);
  if (await page.locator('.sheet.on').count()) { console.log('  Esc schließt ' + pn + ' nicht'); fails++; }
}
ok(good === panels.length, `alle ${panels.length} Panels öffnen mit Inhalt und schließen (${good})`);

// ------------------------------------------------------------------------------------------------ Abriss + Undo
const n0 = await ents();
await page.keyboard.press('x'); await W(150);
ok(await page.evaluate(() => __fabrik.app.tool === 'remove'), 'X = Abriss-Modus');
p = await scr(59, 51, .8); await page.mouse.move(p.x, p.y); await W(150); await page.mouse.down(); await page.mouse.up(); await W(300);
const n1 = await ents();
ok(n1 === n0 - 1 && !(await page.evaluate(() => __fabrik.sim.S.ents.some(e => e.type === 'bohrer'))), `Bohrer abgerissen (${n0} → ${n1})`);
await page.keyboard.press('Escape');
await page.keyboard.press('Control+z'); await W(300);
ok(await ents() === n0 && await page.evaluate(() => __fabrik.sim.S.ents.some(e => e.type === 'bohrer' && e.x === 58)), 'Strg+Z stellt den Bohrer wieder her');
// Pipette: C über dem Bohrer
p = await scr(59, 51, .8); await page.mouse.move(p.x, p.y); await W(100); await page.keyboard.press('c'); await W(150);
ok(await page.evaluate(() => __fabrik.app.tool === 'bohrer' && __fabrik.app.rot === 2), 'Pipette (C) übernimmt Typ und Drehung');
await page.keyboard.press('Escape');

// ------------------------------------------------------------------------------------------------ Undo-Taste, Plural, ⌘Z/Strg Z, Undo scheitert
{
  const kb = () => page.evaluate(() => ({ mac: /Mac|iPhone|iPad|iPod/i.test(navigator.userAgentData?.platform || navigator.platform || ''), k: document.querySelector('.buildbar [data-act="undo"] kbd')?.textContent,
    one: __fabrik.ui._slotLine({ savedAt: Date.now(), money: 5, buildings: 1, biome: 'wiese' }), two: __fabrik.ui._slotLine({ savedAt: Date.now(), money: 5, buildings: 2, biome: 'wiese' }),
    keys: (() => { const d = document.createElement('div'); d.innerHTML = __fabrik.ui._p_settings(); return d.querySelector('.keys')?.textContent || ''; })() }));
  let k = await kb();
  ok(k.k === (k.mac ? '⌘Z' : 'Ctrl Z') && k.keys.includes(k.mac ? '⌘Z' : 'Ctrl Z'), `Undo-Taste EN: „${k.k}“ (Mac: ${k.mac}), auch in der Tastenliste`);
  ok(/· 1 building ·/.test(k.one) && /· 2 buildings ·/.test(k.two), `Plural EN: „${k.one}“ / „${k.two}“`);
  await page.evaluate(() => __fabrik.ui.act('lang', { l: 'de' })); await W(200); k = await kb();
  ok(k.k === (k.mac ? '⌘Z' : 'Strg Z') && k.keys.includes(k.mac ? '⌘Z' : 'Strg Z') && /· 1 Gebäude ·/.test(k.one), `Undo-Taste DE: „${k.k}“, „${k.one}“`);
  await page.evaluate(() => __fabrik.ui.act('lang', { l: 'en' })); await W(200);
  // Meta+Z (Mac) macht ebenfalls rückgängig
  const dr = await page.evaluate(() => { const s = __fabrik.sim, d = s.S.ents.find(e => e.type === 'bohrer'); return d && s.remove(d.id); }); await W(150);
  await page.keyboard.press('Meta+z'); await W(300);
  ok(dr && await page.evaluate(() => __fabrik.sim.S.ents.some(e => e.type === 'bohrer' && e.x === 58)), '⌘Z (Meta+Z) stellt den Bohrer wieder her');
  // nichts mehr rückgängig zu machen → Knopf aus, Taste gibt Fehlerton + Hinweis
  await page.evaluate(() => { __fabrik.sim.undoStack.length = 0; }); await W(450);
  ok(await page.locator('.buildbar [data-act="undo"].dis').count() === 1, 'Undo-Knopf ausgegraut, wenn nichts rückgängig zu machen ist');
  await page.keyboard.press('Control+z'); await W(250);
  ok(/Nothing to undo/.test(await page.locator('.toasts').innerText()), 'Strg+Z ohne Verlauf: Hinweis „Nothing to undo“');
  // Abriss erstattet, Rückgängig kostet wieder → ohne Geld lehnt die Sim ab (false) → Hinweis
  const u = await page.evaluate(() => { const { sim, app } = __fabrik; sim.S.money += 500; const id = sim.place('ofen', 49, 60, 0); sim.remove(id); const keep = sim.S.money; sim.S.money = 0;
    const r = app.undo(); sim.S.money = keep + 500; return { id: !!id, r, n: sim.undoStack.length }; }); await W(250);
  const toastTxt = await page.locator('.toasts').innerText();
  ok(u.id && (u.r === false ? /Not enough coins to undo/.test(toastTxt) : true), u.r === false ? 'Undo ohne Geld abgelehnt: Fehlerton + „Not enough coins to undo“' : 'Undo ohne Geld: Sim erlaubt es noch (alte sim.js) – Hinweis-Pfad nicht aktiv');
  await page.evaluate(() => { const s = __fabrik.sim; for (const e of s.S.ents.filter(e => e.type === 'ofen' && e.x === 49 && e.y === 60)) s.remove(e.id); });
}

// ------------------------------------------------------------------------------------------------ Gerald
await page.evaluate(() => { __fabrik.sim.S.ger.wait = 0.05; });
await page.waitForFunction(() => __fabrik.sim.gerald(), null, { timeout: 5000 }).catch(() => {});
await W(600);
await page.evaluate(() => { const g = __fabrik.sim.gerald(); __fabrik.rig.jumpTo(g.x, g.z, 14); }); await W(400);
await shot('11-gerald');
const g2 = await page.evaluate(() => { const a = __fabrik.view.anchor('gerald'); return a ? __fabrik.stage.screenPos([a[0], .4, a[2]]) : null; });
const c0 = await page.evaluate(() => __fabrik.sim.S.total.gerald);
if (g2) await page.mouse.click(g2.x, g2.y); await W(400);
ok(await page.evaluate(c => __fabrik.sim.S.total.gerald === c + 1, c0), 'Gerald angeklickt → Kiste');
await W(1200);
ok(await page.evaluate(() => !__fabrik.view.G.group.visible), 'Gerald jubelt und verschwindet');

// ------------------------------------------------------------------------------------------------ Autosave → Neuladen → Weiterspielen
await page.evaluate(() => __fabrik.rig.jumpTo(56, 54, 24, 0));
const before = await page.evaluate(() => { __fabrik.app.autosave(); const s = __fabrik.sim.S; return { n: s.ents.length, money: s.money, research: s.research.length }; });
await page.reload(); await toMenu(page); await W(800);
ok(await page.locator('.menu [data-act="continue"]').count() === 1, 'Menü zeigt „Continue“');
await page.locator('.menu [data-act="continue"]').click(); await W(800);
const after = await page.evaluate(() => { const s = __fabrik.sim.S; return { n: s.ents.length, money: s.money, research: s.research.length }; });
ok(after.n === before.n && Math.abs(after.money - before.money) < 50 && after.research === before.research, `gleicher Zustand nach Neuladen: ${JSON.stringify(before)} → ${JSON.stringify(after)}`);
ok(await page.evaluate(() => __fabrik.view.B.size + __fabrik.view.belts.K.size) > 2, 'Fabrik nach dem Laden sichtbar');

// ------------------------------------------------------------------------------------------------ Offline-Meldung
await W(3000);
await page.evaluate(() => { __fabrik.app.autosave(); const k = 'fabrik.save.auto', o = JSON.parse(localStorage.getItem(k)); o.savedAt = Date.now() - 3600 * 1000; localStorage.setItem(k, JSON.stringify(o)); __fabrik.app.mode = 'x'; });
await page.reload(); await toMenu(page); await W(500);
const mOff = await page.evaluate(() => JSON.parse(localStorage.getItem('fabrik.save.auto')).state.money);
await page.locator('.menu [data-act="continue"]').click(); await W(900);
const offTxt = await page.locator('.modal.offline').innerText().catch(() => '');
ok(/While you were away/.test(offTxt) && await money() > mOff, 'Offline-Meldung: ' + offTxt.replace(/\s+/g, ' ').slice(0, 90));
await shot('03-offline');
await page.locator('.modal.offline .btn').click(); await W(300);
ok(await page.locator('.modal').count() === 0, 'Meldung geschlossen');

// ------------------------------------------------------------------------------------------------ Speicherplatz, Export, Import
await page.locator('.side [data-p="game"]').click(); await W(400);
await page.locator('.sheet [data-act="save"][data-s="1"]').click(); await W(300);
if (await page.locator('.modal .btn.main').count()) { await page.locator('.modal .btn.main').click(); await W(200); }
const slot1 = await page.evaluate(() => __fabrik.storage.info(1));
ok(slot1 && !slot1.empty && slot1.savedAt > 0 && slot1.money > 0, 'Speicherplatz 1 mit Datum und Geld: ' + JSON.stringify({ money: Math.round(slot1?.money), n: slot1?.buildings }));
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.locator('.sheet [data-act="export"]').click()]);
const exp = path.join(out, 'export' + (dl.suggestedFilename().endsWith('.cogtopia.json') ? '.cogtopia.json' : '.json')); await dl.saveAs(exp);
const ej = JSON.parse(fs.readFileSync(exp, 'utf8'));
ok(ej.app === 'cogtopia' && dl.suggestedFilename().endsWith('.cogtopia.json') && Array.isArray(ej.state.ents), 'Export als Datei: ' + dl.suggestedFilename());
const preImp = await page.evaluate(() => { const s = __fabrik.sim; s.S.money += 50; const id = s.place('band', 49, 62, 0); s.S.money = 1; return { id: !!id, n: s.S.ents.length }; }); await W(200);
await page.locator('.sheet [data-act="import"]').click(); await page.setInputFiles('input[type=file]', exp); await W(500);
const askImp = await page.locator('.modal').innerText().catch(() => '');
ok(preImp.id && /replaced/.test(askImp) && await ents() === preImp.n, 'Import fragt vor dem Ersetzen (eigener Dialog): ' + askImp.replace(/\s+/g, ' ').slice(0, 70));
await page.locator('.modal .btn.main').click(); await W(600);
ok(Math.abs(await money() - ej.state.money) < 30 && await ents() === ej.state.ents.length && await page.locator('.sheet.on').count() === 0, 'Import stellt die Fabrik wieder her');
ok(await page.evaluate(n => __fabrik.storage.info('backup')?.buildings === n, preImp.n), 'bisheriger Stand vor dem Import liegt in der Sicherung');

// ------------------------------------------------------------------------------------------------ Laden fragt nach + Sicherung (Fund 2)
{
  const info = s => page.evaluate(s => __fabrik.storage.info(s), s);
  await page.evaluate(() => { const s = __fabrik.sim; s.S.money += 1e5; for (let i = 0; i < 6; i++) s.place('band', 49 + i, 63, 0); __fabrik.app.autosave(); });
  const autoN = (await info('auto')).buildings, slot1N = (await info(1)).buildings, simN = await ents();
  await page.locator('.side [data-p="game"]').click(); await W(350);
  await page.locator('.sheet [data-act="load"][data-s="1"]').click(); await W(300);
  ok(await page.locator('.modal').count() === 1 && (await info('auto')).buildings === autoN && await ents() === simN, `Laden von Platz 1 fragt erst (eigener Dialog), Autosave unverändert (${autoN})`);
  await page.locator('.modal .btn.ghost').click(); await W(250);
  ok(await ents() === simN && (await info('auto')).buildings === autoN, 'Abbrechen lässt die Fabrik und den Autosave in Ruhe');
  await page.locator('.sheet [data-act="load"][data-s="1"]').click(); await W(300);
  await page.locator('.modal .btn.main').click(); await W(500);
  ok(await ents() === slot1N && (await info('backup')).buildings === simN, `nach Bestätigen geladen (${slot1N}), bisheriger Stand in der Sicherung (${simN})`);
  await page.locator('.side [data-p="game"]').click(); await W(350);
  const bRow = await page.locator('.sheet .slot.backup').innerText().catch(() => '');
  ok(/Backup/.test(bRow) && await page.locator('.sheet .slot.backup [data-act="load"]').count() === 1, 'Sicherung in der Liste sichtbar und ladbar: ' + bRow.replace(/\s+/g, ' ').slice(0, 70));
  await shot('12-spielstaende-sicherung');
  await page.locator('.sheet .slot.backup [data-act="load"]').click(); await W(300);
  await page.locator('.modal .btn.main').click(); await W(500);
  ok(await ents() === simN && (await info('backup')).buildings === slot1N, 'Sicherung geladen (Stand zurück), getauscht in die Sicherung');
  // Menü → Laden-Dialog zeigt die Sicherung ebenfalls
  await page.evaluate(() => { __fabrik.ui.loadDialog(); }); await W(250);
  ok(await page.locator('.modal .slot.backup [data-act="load"]').count() === 1, 'Laden-Dialog listet die Sicherung');
  await page.keyboard.press('Escape'); await W(200);
}

// ------------------------------------------------------------------------------------------------ Hintergrund-Tab: Offline-Zeit bleibt (Fund 7)
{
  const r = await page.evaluate(async () => {
    const s = __fabrik.sim;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange'));
    const t0 = __fabrik.storage.info('auto').savedAt, tk0 = s.S.tick;
    await new Promise(res => setTimeout(res, 600));
    const tk1 = s.S.tick, real = Date.now; Date.now = () => real() + 3 * 3600e3;
    __fabrik.app.autosave(); dispatchEvent(new Event('pagehide'));
    const t1 = __fabrik.storage.info('auto').savedAt;
    Date.now = real; delete document.hidden; document.dispatchEvent(new Event('visibilitychange'));
    await new Promise(res => setTimeout(res, 300));
    return { moved: t1 - t0, ticked: tk1 - tk0, after: s.S.tick - tk1 };
  });
  ok(r.moved === 0 && r.ticked === 0 && r.after > 0, `im Hintergrund: savedAt bleibt beim Ausblenden (${r.moved} ms verschoben), Sim steht (${r.ticked} Ticks), läuft danach weiter`);
}

// ------------------------------------------------------------------------------------------------ fremde Ids / Laden scheitert (Fund 11)
{
  const r = await page.evaluate(() => {
    const { app, ui, sim, view } = __fabrik, st = sim.S.stats, F = sim.constructor;
    st.rate.titanstaub = .5; st.mrate.titanstaub = .5;
    let html = ''; try { html = ui._p_stats(); } catch (e) { html = 'THROW ' + e.message; }
    delete st.rate.titanstaub; delete st.mrate.titanstaub;
    const f = new F({ seed: 3 }); f.setToday = () => { throw new Error('kaputt'); };
    const a = app.start(f), sameA = __fabrik.sim === sim && app.sim === sim && view.sim === sim && app.mode === 'play';
    const g = new F({ seed: 4 }); g.plotState = () => { throw new Error('kaputt'); };
    const b = app.start(g), sameB = __fabrik.sim === sim && view.sim === sim && view.B.size > 0;
    return { stats: typeof html === 'string' && !html.startsWith('THROW') && html.length > 50, a, sameA, b, sameB };
  });
  ok(r.stats, 'Statistik mit unbekannter Teil-Id stürzt nicht ab');
  ok(r.a === false && r.sameA && r.b === false && r.sameB, 'Fehler beim Laden (setToday / Ansicht) → alter Zustand bleibt, Ansicht wiederhergestellt');
  ok(/could not be loaded/.test(await page.locator('.toasts').innerText()), 'Fehler-Hinweis beim gescheiterten Laden');
}

// ------------------------------------------------------------------------------------------------ GPU-Speicher wächst nicht (Fund 3)
{
  const memo = () => page.evaluate(() => { const m = __fabrik.stage.renderer.info.memory; return { geo: m.geometries, tex: m.textures }; });
  const build = async () => {
    await page.evaluate(() => { const s = __fabrik.sim; s.S.money = 1e9; s.S.rp = 1e9; for (const r of ['kupfer', 'presse', 'labor', 'drahtzug', 'verteiler', 'sortierer', 'lager', 'tunnel']) s.buyResearch(r);
      const types = ['ofen', 'presse', 'labor', 'drahtzug', 'montage', 'verkauf', 'lager', 'verteiler', 'sortierer', 'experiment', 'raffinerie'].filter(t => s.isUnlocked(t));
      window.__leak = [];
      for (const t of types) { let done = false; for (let y = 48; y < 63 && !done; y++) for (let x = 48; x < 63 && !done; x++) if (s.canPlace(t, x, y, 0).ok) { const id = s.place(t, x, y, 0); if (id) { window.__leak.push(id); done = true; } } } });
    await W(90);
    await page.evaluate(() => { for (const id of window.__leak) __fabrik.sim.remove(id); }); await W(90);
  };
  await build(); await build();
  const m0 = await memo(); for (let i = 0; i < 20; i++) await build(); const m1 = await memo();
  ok(m1.geo - m0.geo <= 2 && m1.tex - m0.tex <= 1, `20× Bauen+Abriss: Geometrien ${m0.geo} → ${m1.geo}, Texturen ${m0.tex} → ${m1.tex}`);
  const cyc = async () => {
    await page.evaluate(() => __fabrik.app.newGame()); await W(250);
    await page.evaluate(() => __fabrik.app.toMenu()); await W(250);
    await page.evaluate(() => __fabrik.app.start(__fabrik.storage.load(1).factory)); await W(300);
  };
  await cyc();
  const n0 = await memo(); for (let i = 0; i < 5; i++) await cyc(); const n1 = await memo();
  ok(n1.geo - n0.geo <= 3 && n1.tex - n0.tex <= 1, `5× Neue Fabrik/Menü/Laden: Geometrien ${n0.geo} → ${n1.geo}, Texturen ${n0.tex} → ${n1.tex}`);
}

// ------------------------------------------------------------------------------------------------ große Fabrik + Bildrate
const big = await page.evaluate(() => {
  const { sim, bp } = __fabrik, r = bp.buildBig(sim);
  const ofens = sim.S.ents.filter(e => e.type === 'ofen').map(e => e.id), belts = sim.S.ents.filter(e => e.type === 'band' && e.y % 3 === 1);
  window.__feed = setInterval(() => { for (const id of ofens) { const e = sim.N.get(id)?.e; if (e && (e.inN[0] || 0) < 3) sim.debugInsert(id, 'eisenerz', Math.random() < .02); } }, 400);
  for (const e of sim.S.ents.filter(e => e.type === 'band' && e.y % 3 === 2)) sim.debugInsert(e.id, ['kupferbarren', 'zahnrad', 'schaltkreis', 'eisenplatte'][e.x % 4]);
  __fabrik.rig.jumpTo(56, 56, 52, 0);
  return { ...r, machines: sim.mn.length, belts: sim.count.band, beltsWith: belts.length };
});
ok(big.machines >= 80 && big.belts >= 500, `große Fabrik über die Logik: ${big.machines} Maschinen, ${big.belts} Bänder`);
await W(3500);
const fps = await page.evaluate(() => new Promise(r => { let n = 0; const t = performance.now(); const f = () => { n++; if (performance.now() - t < 3000) requestAnimationFrame(f); else r(n / ((performance.now() - t) / 1000)); }; requestAnimationFrame(f); }));
const vs = await page.evaluate(() => __fabrik.view.stats());
console.log(`  Bildrate ${fps.toFixed(1)} fps (headless), ${vs.calls} Draw Calls, ${(vs.tris / 1e6).toFixed(2)} M Dreiecke, ${vs.items} Teile, ${vs.buildings} Gebäude`);
ok(fps >= 30, 'Bildrate große Fabrik ≥ 30 fps');
await shot('09-grosse-fabrik');
await page.evaluate(() => __fabrik.rig.jumpTo(50, 45, 20, 1)); await W(1200); await shot('09b-grosse-fabrik-nah');
await page.evaluate(() => clearInterval(window.__feed));
ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'kein horizontales Scrollen (Desktop)');
await ctx.close();

// ------------------------------------------------------------------------------------------------ Handy
{
  const { ctx: c2, page: m } = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await m.goto(URL0); await toMenu(m); await m.waitForTimeout(1500);
  const sw = () => m.evaluate(() => ({ sw: document.documentElement.scrollWidth, bw: document.body.scrollWidth, w: innerWidth }));
  let s = await sw(); ok(s.sw <= s.w && s.bw <= s.w, `Handy-Menü ohne horizontales Scrollen (${s.sw}/${s.w})`);
  await shot('10a-handy-menu', m);
  await m.locator('.menu .btn', { hasText: 'New factory' }).first().tap(); await m.waitForTimeout(300);
  if (await m.locator('.modal .btn.main').count()) await m.locator('.modal .btn.main').tap();
  await m.waitForFunction(() => __fabrik.ui.mode === 'play', null, { timeout: 10000 }); await m.waitForTimeout(800);
  await m.locator('.buildbar [data-b="bohrer"]').tap(); await m.waitForTimeout(200);
  // Tippen setzt den Bohrer auf das Steinvorkommen (50,51)
  const q = await m.evaluate(() => __fabrik.stage.screenPos([51, 0, 52]));
  await m.touchscreen.tap(q.x, q.y); await m.waitForTimeout(400);
  ok(await m.evaluate(() => __fabrik.sim.S.ents.some(e => e.type === 'bohrer')), 'Handy: Bohrer per Tippen gesetzt');
  s = await sw(); ok(s.sw <= s.w && s.bw <= s.w, `Handy-Spiel ohne horizontales Scrollen (${s.sw}/${s.w})`);
  const bar = await m.evaluate(() => { const b = document.querySelector('.buildbar'); const r = b.getBoundingClientRect(); return { scroll: b.scrollWidth > b.clientWidth, left: r.left, right: r.right }; });
  ok(bar.scroll && bar.left >= 0 && bar.right <= 390, 'Bauleiste scrollbar und im Bild');
  await shot('10-handy', m);
  await m.locator('.side [data-p="research"]').tap(); await m.waitForTimeout(500);
  const sh = await m.evaluate(() => { const r = document.querySelector('.sheet .card').getBoundingClientRect(); return { w: r.width, b: r.bottom, h: innerHeight }; });
  ok(sh.w >= 380 && Math.abs(sh.b - sh.h) < 2, 'Handy: Panel als Bottom-Sheet');
  await shot('10b-handy-panel', m);
  await c2.close();
}

await browser.close(); srv.close();
console.log(fails ? `PLAY FEHLER: ${fails}` : 'PLAY OK'); process.exit(fails ? 1 : 0);
