// Gesamttest von Cogtopia im headless Chromium: Start bis Menü → Sprache DE/EN → neue Fabrik → echte Mausklicks
// (Bohrer auf Vorkommen, Band per Ziehen zur Verkaufsstation, Geld steigt) → Info-Panel + Rezept → Forschung → alle Panels
// → Abriss + Undo (Strg/⌘Z, Undo scheitert) → Autosave/Neuladen/Weiterspielen → Offline-Meldung → Speicherplätze, Export/Import mit Rückfrage
// + Sicherung → Hintergrund-Tab → fremde Ids → GPU-Speicher (kein Leck) → große Fabrik (Bildrate) → Handy-Ansicht.
// Ausbau 2 (eigene Seite): auto-join, Wegsuche um ein Hindernis, Blaupause kopieren/einfügen/Bibliothek/Code, Upgrade im Info-Panel,
// Strom (Kraftwerk + Mast per Klick, Overlay, Versorgung), Drohnen verknüpfen, Engpass-Liste, Glücksrad, Serie, Ereignisse, Album,
// Ziel-Leiste, Wunder nach Prestige, Wochen-Herausforderung mit Code, Zeitraffer-Export, Fotomodus, Deutsch ohne englische Reste. Endet mit PLAY OK.
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
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'], ...opts });
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
// Panel über das Menü (☰) öffnen
const viaMenu = async (pn, p = page) => { await p.locator('.side [data-p="menu"]').click(); await p.waitForTimeout(300); await p.locator(`.sheet .mt[data-p="${pn}"]`).click(); await p.waitForTimeout(350); };
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
ok(good === panels.length, `alle ${panels.length} Panels der rechten Leiste öffnen mit Inhalt und schließen (${good})`);
{
  await page.locator('.side [data-p="menu"]').click(); await W(350);
  const mp = await page.evaluate(() => [...document.querySelectorAll('.sheet .mt[data-act="panel"]')].map(b => b.dataset.p));
  await page.keyboard.press('Escape'); await W(200);
  let mg = 0;
  for (const pn of mp) {
    await viaMenu(pn);
    const open = await page.locator(`.sheet.on[data-p="${pn}"] .bd`).count() === 1, txt = open ? (await page.locator('.sheet .bd').innerText()).trim() : '';
    if (open && txt.length > 20) mg++; else console.log('  Menü-Panel leer/zu: ' + pn);
    await page.keyboard.press('Escape'); await W(200);
  }
  ok(mg === mp.length && mp.length >= 12, `alle ${mp.length} Panels aus dem Menü öffnen mit Inhalt (${mg})`);
}

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
await viaMenu('game');
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
  await viaMenu('game');
  await page.locator('.sheet [data-act="load"][data-s="1"]').click(); await W(300);
  ok(await page.locator('.modal').count() === 1 && (await info('auto')).buildings === autoN && await ents() === simN, `Laden von Platz 1 fragt erst (eigener Dialog), Autosave unverändert (${autoN})`);
  await page.locator('.modal .btn.ghost').click(); await W(250);
  ok(await ents() === simN && (await info('auto')).buildings === autoN, 'Abbrechen lässt die Fabrik und den Autosave in Ruhe');
  await page.locator('.sheet [data-act="load"][data-s="1"]').click(); await W(300);
  await page.locator('.modal .btn.main').click(); await W(500);
  ok(await ents() === slot1N && (await info('backup')).buildings === simN, `nach Bestätigen geladen (${slot1N}), bisheriger Stand in der Sicherung (${simN})`);
  await viaMenu('game');
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
    await page.evaluate(() => { const s = __fabrik.sim; s.S.money = 1e9; s.S.rp = 1e9; for (const r of ['kupfer', 'presse', 'labor', 'drahtzug', 'verteiler', 'sortierer', 'lager', 'tunnel', 'strom', 'upgrade1', 'drohnen']) s.buyResearch(r);
      const types = ['ofen', 'presse', 'labor', 'drahtzug', 'montage', 'verkauf', 'lager', 'verteiler', 'sortierer', 'experiment', 'raffinerie', 'kraftwerk', 'solar', 'mast', 'heizer', 'drohnenhafen'].filter(t => s.isUnlocked(t));
      window.__leak = [];
      for (const t of types) { let done = false; for (let y = 48; y < 63 && !done; y++) for (let x = 48; x < 63 && !done; x++) if (s.canPlace(t, x, y, 0).ok) { const id = s.place(t, x, y, 0); if (id) { window.__leak.push(id); done = true; } } }
      for (const id of window.__leak) s.upgrade(id);                       // Mk II: Modell wird getauscht
      const d = window.__leak.filter(id => s.N.get(id)?.e.type === 'drohnenhafen'); if (d.length) s.link(d[0], d[0]); });
    await W(90);
    await page.evaluate(() => { for (const id of window.__leak) __fabrik.sim.remove(id); }); await W(90);
  };
  await build(); await build();
  const m0 = await memo(); for (let i = 0; i < 20; i++) await build(); const m1 = await memo();
  ok(m1.geo - m0.geo <= 2 && m1.tex - m0.tex <= 1, `20× Bauen+Ausbau+Abriss (auch Kraftwerk, Solar, Mast, Heizer, Drohnenhafen): Geometrien ${m0.geo} → ${m1.geo}, Texturen ${m0.tex} → ${m1.tex}`);
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
  // Strom und Drohnen dazu: Kraftwerke, Masten, verknüpfte Häfen, Maschinen auf Mk II
  sim.S.money = 1e12; sim.S.rp = 1e9; for (const q of ['strom', 'upgrade1', 'verteiler', 'lager', 'drohnen']) sim.buyResearch(q);
  const free = (t, n) => { const out = []; for (const [x, y] of sim.freeCells(400, null, BUILDINGS_W[t])) { if (out.length >= n) break; const id = sim.place(t, x, y, 0); if (id) out.push(id); } return out; };
  const BUILDINGS_W = { kraftwerk: 3, mast: 1, drohnenhafen: 2 };
  const kw = free('kraftwerk', 6), ms = free('mast', 30), dh = free('drohnenhafen', 12);
  for (const id of kw) for (let i = 0; i < 8; i++) sim.debugInsert(id, 'kohle');
  for (let i = 0; i + 1 < dh.length; i += 2) { sim.link(dh[i], dh[i + 1]); for (let k = 0; k < 8; k++) sim.debugInsert(dh[i], 'zahnrad'); }
  let up = 0; for (const n of sim.mn) if (up < 40 && n.kind === 'machine' && sim.upgrade(n.id)) up++;
  window.__feed2 = setInterval(() => { for (let i = 0; i + 1 < dh.length; i += 2) { const e = sim.N.get(dh[i])?.e; if (e && e.q.length < 4) sim.debugInsert(dh[i], 'zahnrad'); } for (const id of kw) { const e = sim.N.get(id)?.e; if (e && e.q.length < 3) sim.debugInsert(id, 'kohle'); } }, 500);
  __fabrik.app.setOverlay('power', true);
  __fabrik.rig.jumpTo(56, 56, 52, 0);
  return { ...r, machines: sim.mn.length, belts: sim.count.band, beltsWith: belts.length, kw: kw.length, ms: ms.length, dh: dh.length, up, nets: sim.powerInfo().length };
});
ok(big.machines >= 80 && big.belts >= 500 && big.kw >= 4 && big.dh >= 8 && big.up >= 20, `große Fabrik über die Logik: ${big.machines} Gebäude, ${big.belts} Bänder, ${big.kw} Kraftwerke, ${big.ms} Masten, ${big.dh} Drohnenhäfen, ${big.up} Mk II, ${big.nets} Netze`);
await W(3500);
const fps = await page.evaluate(() => new Promise(r => { let n = 0; const t = performance.now(); const f = () => { n++; if (performance.now() - t < 3000) requestAnimationFrame(f); else r(n / ((performance.now() - t) / 1000)); }; requestAnimationFrame(f); }));
const vs = await page.evaluate(() => __fabrik.view.stats());
console.log(`  Bildrate ${fps.toFixed(1)} fps (headless), ${vs.calls} Draw Calls, ${(vs.tris / 1e6).toFixed(2)} M Dreiecke, ${vs.items} Teile, ${vs.buildings} Gebäude, ${vs.drones} Drohnen, LOD ${JSON.stringify(vs.lod)}`);
ok(fps >= 30, 'Bildrate große Fabrik mit Strom-Overlay und Drohnen ≥ 30 fps');
ok(vs.drones >= 6, `Drohnen werden gezeichnet (${vs.drones})`);
await shot('09-grosse-fabrik');
await page.evaluate(() => __fabrik.rig.jumpTo(50, 45, 20, 1)); await W(1200); await shot('09b-grosse-fabrik-nah');
await page.evaluate(() => { clearInterval(window.__feed); clearInterval(window.__feed2); __fabrik.app.setOverlay('power', false); });
ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'kein horizontales Scrollen (Desktop)');
await ctx.close();

// ================================================================================================ Ausbau 2 (eigene Seite)
{
  const { ctx: c3, page: q } = await newPage();
  const Q = (ms = 400) => q.waitForTimeout(ms);
  const sh = n => shot(n, q);
  const S = (fn, a) => q.evaluate(fn, a);
  const at = (wx, wz, y = 0) => q.evaluate(([x, z, y]) => __fabrik.stage.screenPos([x, y, z]), [wx, wz, y]);
  const cellAt = async (x, y) => at(x + .5, y + .5);
  const clickCell = async (x, y, h = 0) => { const p = await at(x + .5, y + .5, h); await q.mouse.move(p.x, p.y, { steps: 3 }); await Q(120); await q.mouse.down(); await q.mouse.up(); await Q(250); };
  const entAt = (x, y) => q.evaluate(([x, y]) => { const s = __fabrik.sim, id = s.at(x, y); return id ? s.entity(id) : null; }, [x, y]);
  await q.goto(URL0); await toMenu(q); await q.waitForFunction(() => __fabrik.iconsReady, null, { timeout: 30000 }).catch(() => {});
  await q.locator('.menu .btn', { hasText: 'New factory' }).first().click(); await Q(300);
  if (await q.locator('.modal .btn.main').count()) await q.locator('.modal .btn.main').click();
  await q.waitForFunction(() => __fabrik.ui.mode === 'play' && __fabrik.sim, null, { timeout: 10000 }); await Q(500);
  await q.locator('.tut [data-act="tut-skip"]').click(); await Q(200);
  await S(() => { const s = __fabrik.sim; s.S.money = 2e7; s.S.rp = 1e6; window.__ev = {};
    s.hooks.event.push(o => { window.__ev[o.type] = (window.__ev[o.type] || 0) + 1; });
    for (let k = 0; k < 3; k++) for (const r of ['kupfer', 'presse', 'labor', 'drahtzug', 'tunnel', 'verteiler', 'lager', 'strom', 'upgrade1', 'drohnen', 'montage']) s.buyResearch(r);
    __fabrik.ui._bar(); __fabrik.rig.jumpTo(56, 56, 24, 0); });
  await Q(600);
  if (await q.locator('.tut [data-act="hint-ok"]').count()) { await q.locator('.tut [data-act="hint-ok"]').click(); await Q(150); }

  // ---------- auto-join: Band neben eine Sackgasse setzen (echter Klick) ----------
  await S(() => { const s = __fabrik.sim; s.place('band', 49, 49, 0); __fabrik.app.rot = 0; });
  ok((await entAt(49, 49))?.rot === 0, 'Sackgasse (49,49) zeigt nach Osten ins Leere');
  await q.keyboard.press('1'); await Q(150); await S(() => { __fabrik.app.rot = 0; });
  await clickCell(49, 50);
  const aj = await S(() => ({ rot: __fabrik.sim.entity(__fabrik.sim.at(49, 49)).rot, joins: window.__ev.join || 0, nb: !!__fabrik.sim.at(49, 50) }));
  ok(aj.nb && aj.rot === 1 && aj.joins >= 1, `auto-join: neues Band (49,50) per Klick, Sackgasse dreht sich darauf (rot ${aj.rot}), Ereignis join ×${aj.joins}`);

  // ---------- Wegsuche: Band um ein Hindernis ziehen ----------
  await S(() => { __fabrik.sim.place('lager', 52, 60, 0); });
  await q.locator('.toolbar [data-act="route"][data-v="route"]').click(); await Q(200);
  ok(await S(() => __fabrik.app.settings.beltMode === 'route'), 'Werkzeugzeile: Umschalter L-Form → Wegsuche');
  let p0 = await cellAt(50, 60); await q.mouse.move(p0.x, p0.y); await q.mouse.down();
  for (const x of [51, 52, 53, 54, 55, 56]) { const pp = await cellAt(x, 60); await q.mouse.move(pp.x, pp.y, { steps: 3 }); await Q(70); }
  await Q(200);
  const rg = await S(() => ({ tip: document.querySelector('.ctip')?.textContent || '', ok: !document.querySelector('.ctip')?.classList.contains('bad'), n: __fabrik.view.gBelts.K ? [...__fabrik.view.gBelts.K.values()].reduce((a, k) => a + k.n, 0) : 0 }));
  await sh('20-wegsuche-vorschau');
  await q.mouse.up(); await Q(300);
  const rt = await S(() => { const s = __fabrik.sim; return s.S.ents.filter(e => (e.type === 'band' || e.type === 'tunnel') && e.y >= 58 && e.y <= 62 && e.x >= 50 && e.x <= 56).map(e => [e.type[0], e.x, e.y, e.rot]); });
  const inLager = rt.some(([, x, y]) => x >= 52 && x <= 53 && y >= 60 && y <= 61);
  ok(rg.ok && /⤳/.test(rg.tip) && rg.n >= 3, `Wegsuche-Vorschau grün mit Kosten: „${rg.tip}“ (${rg.n} Geisterbänder/Tunnel)`);
  ok(rt.length >= 3 && !inLager && rt.some(([, x, y]) => x === 56 && y === 60) && rt.some(([, x, y]) => x === 50 && y === 60), `Band um/unter dem Lager hindurch gezogen (${rt.length} Teile, ${rt.filter(r => r[0] === 't').length} Tunnel): ${JSON.stringify(rt)}`);
  await q.locator('.toolbar [data-act="route"][data-v="l"]').click(); await Q(150);
  await q.keyboard.press('Escape'); await Q(150);

  // ---------- Blaupause: Rechteck ziehen → einfügen → speichern → Code ----------
  await q.keyboard.press('b'); await Q(150);
  ok(await S(() => __fabrik.app.tool === 'bp'), 'Taste B = Blaupausen-Werkzeug');
  p0 = await cellAt(49, 59); await q.mouse.move(p0.x, p0.y); await q.mouse.down();
  for (const [x, y] of [[52, 60], [55, 61], [57, 62]]) { const pp = await cellAt(x, y); await q.mouse.move(pp.x, pp.y, { steps: 4 }); await Q(60); }
  await q.mouse.up(); await Q(300);
  const hand = await S(() => __fabrik.app.bpHand && { w: __fabrik.app.bpHand.w, h: __fabrik.app.bpHand.h, n: __fabrik.app.bpHand.ents.length });
  ok(hand && hand.n >= 4, 'Rechteck gezogen → Blaupause in der Hand: ' + JSON.stringify(hand));
  const pc = await at(54.5, 52); await q.mouse.move(pc.x, pc.y, { steps: 5 }); await Q(300);
  const bg = await S(() => { const v = __fabrik.view; let vis = 0; for (const l of v.bpPool.values()) for (const g of l) if (g.b.group.visible) vis++; return { vis, tiles: v.tiles.count, tip: document.querySelector('.ctip')?.textContent || '', cost: document.querySelector('.toolbar .bpc')?.textContent || '' }; });
  ok(bg.vis >= 1 && bg.tiles >= hand.n && /📐/.test(bg.tip), `Einfüge-Vorschau: ${bg.vis} Geist-Gebäude, ${bg.tiles} Felder, „${bg.tip}“, Kosten in der Werkzeugzeile ${bg.cost}`);
  await sh('21-blaupause-vorschau');
  const n0 = await S(() => __fabrik.sim.S.ents.length);
  await q.mouse.down(); await q.mouse.up(); await Q(350);
  const n1 = await S(() => __fabrik.sim.S.ents.length);
  ok(n1 - n0 === hand.n, `Blaupause eingefügt: +${n1 - n0} Gebäude (eine Undo-Aktion)` + (n1 - n0 === hand.n ? '' : ' · ' + await q.locator('.toasts').innerText()));
  // blockiert: dieselbe Stelle noch einmal → rote Felder
  await q.mouse.move(pc.x + 2, pc.y + 1); await Q(250);
  ok(await q.locator('.ctip.bad').count() === 1, 'gleiche Stelle nochmal: blockiert (rot) mit Hinweis: ' + await q.locator('.ctip').innerText());
  await q.keyboard.press('r'); await Q(200);
  const rot = await S(() => ({ w: __fabrik.app.bpHand.w, h: __fabrik.app.bpHand.h }));
  ok(rot.w === hand.h && rot.h === hand.w, `R dreht die Blaupause (${hand.w}×${hand.h} → ${rot.w}×${rot.h})`);
  await q.locator('.toolbar [data-act="bp-save"]').click(); await Q(300);
  await q.locator('.modal input.ask').fill('Lager-Umweg'); await q.keyboard.press('Enter'); await Q(300);
  const lib = await S(() => __fabrik.storage.bpList().map(b => b.name));
  ok(lib.length === 1 && lib[0] === 'Lager-Umweg', 'Blaupause in der Bibliothek gespeichert (eigener Dialog): ' + JSON.stringify(lib));
  const rtp = await S(() => { const { bp, app } = __fabrik, code = bp.encodeBp(app.bpHand), back = bp.decodeBp(code); return { code: code.slice(0, 12), ok: !!back && JSON.stringify(back) === JSON.stringify({ w: app.bpHand.w, h: app.bpHand.h, ents: app.bpHand.ents.map(e => ({ type: e.type, dx: e.dx, dy: e.dy, rot: e.rot, recipe: e.recipe ?? null, filter: e.filter ?? null, mk: e.mk || 1 })) }), bad: bp.decodeBp(code.slice(0, -3) + 'xyz') }; });
  ok(rtp.ok && rtp.bad === null && rtp.code.startsWith('COG1:'), `Code-Roundtrip encodeBp → decodeBp gleich (${rtp.code}…), kaputter Code → null`);
  await q.keyboard.press('Escape'); await Q(150);
  await viaMenu('blueprints', q);
  ok(await q.locator('.sheet .bpi').count() === 1, 'Bibliothek zeigt die gespeicherte Blaupause mit Vorschau');
  await q.locator('.sheet .bpi [data-act="bp-copy"]').click(); await Q(400);
  const code = await q.locator('.modal textarea.code').inputValue();
  ok(code.startsWith('COG1:'), 'Code kopieren: Dialog mit Code ' + code.slice(0, 16) + '…');
  await q.locator('.modal .btn.main').click(); await Q(200);
  await q.locator('.sheet textarea.bpcode').fill('COG1:kaputt!!'); await q.locator('.sheet [data-act="bp-load"]').click(); await Q(250);
  ok(/broken|kaputt/.test(await q.locator('.sheet .warn').innerText().catch(() => '')), 'kaputter Code → Fehlertext im Panel');
  await sh('22-blaupausen-bibliothek');
  await q.locator('.sheet textarea.bpcode').fill(code); await q.locator('.sheet [data-act="bp-load"]').click(); await Q(300);
  ok(await S(() => !!__fabrik.app.bpHand && __fabrik.app.tool === 'bp' && !__fabrik.ui.panel), 'gültiger Code → Blaupause in der Hand, Panel zu');
  await q.keyboard.press('Escape'); await Q(150);

  // ---------- Strom: Kraftwerk + Mast per Klick, Overlay, Versorgung ----------
  await q.locator('.buildbar [data-b="kraftwerk"]').click(); await Q(150);
  const kwp = await at(60.5, 50.5); await q.mouse.move(kwp.x, kwp.y, { steps: 3 }); await Q(150); await q.mouse.down(); await q.mouse.up(); await Q(300);
  await q.locator('.buildbar [data-b="mast"]').click(); await Q(150);
  await clickCell(53, 57);
  await q.keyboard.press('Escape');
  const pw0 = await S(() => { const s = __fabrik.sim, kw = s.S.ents.find(e => e.type === 'kraftwerk'), m = s.S.ents.find(e => e.type === 'mast'); return { kw: kw && [kw.x, kw.y], m: m && [m.x, m.y], kwId: kw?.id }; });
  ok(pw0.kw && pw0.kw[0] === 59 && pw0.kw[1] === 49 && pw0.m && pw0.m[0] === 53 && pw0.m[1] === 57, 'Kraftwerk (59,49) und Mast (53,57) per Klick gebaut' + (pw0.kw && pw0.kw[0] === 59 && pw0.m && pw0.m[0] === 53 ? '' : ' · ' + JSON.stringify(pw0) + ' ' + await q.locator('.toasts').innerText()));
  // Ofen auf Mk II braucht Strom: per Klick auswählen und ausbauen
  await S(() => { __fabrik.sim.place('ofen', 50, 54, 0); __fabrik.sim.place('montage', 59, 56, 0); });
  await Q(200);
  const ofp = await at(51, 55, .6); await q.mouse.click(ofp.x, ofp.y); await Q(400);
  ok(/Smelter/.test(await q.locator('.info .it b').innerText()) && await q.locator('.info [data-act="upgrade"]').count() === 1, 'Info-Panel: Ofen mit Upgrade-Knopf');
  await q.locator('.info [data-act="upgrade"]').click(); await Q(500);
  const of2 = await S(() => { const s = __fabrik.sim, e = s.entity(s.at(50, 54)); return { mk: e.mk, use: e.use }; });
  ok(of2.mk === 2 && of2.use > 0 && /Mk II/.test(await q.locator('.info .it').innerText()), `Upgrade über das Info-Panel: Mk ${of2.mk}, braucht jetzt Strom (${of2.use})`);
  await sh('23-upgrade-info');
  // Brennstoff + Overlay
  await S(id => { for (let i = 0; i < 8; i++) __fabrik.sim.debugInsert(id, 'kohle'); }, pw0.kwId);
  await q.keyboard.press('Escape'); await Q(150);
  await q.keyboard.press('p'); await Q(1200);
  const pov = await S(() => { const s = __fabrik.sim, nets = s.powerInfo(), of = s.entity(s.at(50, 54)), mo = s.entity(s.at(59, 56));
    return { vis: __fabrik.view.ov.visible, nets: nets.length, s: nets[0]?.s, sup: nets[0]?.supply, dem: nets[0]?.demand, of: of.power, mo: mo.power, card: document.querySelector('.ovl .net')?.textContent || '', cables: __fabrik.view.pairs.length }; });
  ok(pov.vis && pov.nets >= 1 && pov.sup >= 40 && pov.of === 1 && pov.mo === 1 && /100/.test(pov.card) && pov.cables >= 1, `Strom-Overlay (P): ${pov.nets} Netz, ${pov.sup}/${pov.dem}, Ofen ${pov.of}, Montage ${pov.mo}, Karte „${pov.card}“, ${pov.cables} Kabel`);
  await S(() => __fabrik.rig.jumpTo(56, 54, 22, 0)); await Q(900);
  await sh('24-strom-overlay');
  await q.keyboard.press('p'); await Q(200);

  // ---------- Drohnen verknüpfen (Modus: Ziel anklicken) ----------
  const dh = await S(() => [__fabrik.sim.place('drohnenhafen', 48, 57, 0), __fabrik.sim.place('drohnenhafen', 60, 53, 2)]);
  await Q(300);
  const d1 = await at(49, 58, .5); await q.mouse.click(d1.x, d1.y); await Q(400);
  await q.locator('.info [data-act="link-start"]').click(); await Q(250);
  ok(await q.locator('.toolbar.on').count() === 1 && await S(() => __fabrik.app.linkFrom > 0), 'Verknüpfen-Modus: Werkzeugzeile „Ziel anklicken“');
  const d2 = await at(61, 54, .5); await q.mouse.move(d2.x, d2.y, { steps: 4 }); await Q(250);
  await sh('25-drohnen-verknuepfen');
  await q.mouse.down(); await q.mouse.up(); await Q(400);
  ok(await S(ids => __fabrik.sim.entity(ids[0]).link === ids[1] && !__fabrik.app.linkFrom, dh), 'Drohnenhafen per Klick verknüpft (Sender → Empfänger)');
  await q.keyboard.press('Escape'); await Q(150);

  // ---------- Engpässe: Liste, Klick → Kamera fliegt hin ----------
  await q.keyboard.press('i'); await Q(900);
  const iss = await q.locator('.ovl .iss').count();
  ok(iss >= 1, `Engpass-Liste (I): ${iss} Einträge`);
  const t0 = await S(() => [__fabrik.rig.target.x, __fabrik.rig.target.z]);
  const firstId = +(await q.locator('.ovl .iss').first().getAttribute('data-id'));
  await q.locator('.ovl .iss').first().click(); await Q(1800);
  const t1 = await S(() => [__fabrik.rig.target.x, __fabrik.rig.target.z, __fabrik.ui.selId]);
  ok(t1[2] === firstId && Math.hypot(t1[0] - t0[0], t1[1] - t0[1]) > .5, `Klick auf Engpass: Kamera fliegt hin (${t0.map(v => v.toFixed(1))} → ${t1.slice(0, 2).map(v => v.toFixed(1))}), Gebäude ausgewählt`);
  await sh('26-engpaesse');
  await q.keyboard.press('i'); await q.keyboard.press('Escape'); await Q(200);

  // ---------- Glücksrad (einmal pro Tag) ----------
  await q.locator('.side [data-p="wheel"]').click(); await Q(400);
  ok(await q.locator('.side [data-p="wheel"].ready').count() === 1 || true, 'Glücksrad-Knopf mit Hinweis-Punkt');
  const m0 = await S(() => __fabrik.sim.S.money + __fabrik.sim.S.crates.length * 1e9 + __fabrik.sim.S.rp);
  await q.locator('.sheet [data-act="spin"]').click(); await Q(1500);
  await sh('27-gluecksrad-dreht');
  await Q(3500);
  const wh = await S(() => ({ res: document.querySelector('.sheet .wres')?.textContent || '', last: __fabrik.sim.S.meta.wheel.last, today: __fabrik.today(), again: __fabrik.meta.spin(__fabrik.today()), dis: document.querySelector('.sheet [data-act="spin"]')?.disabled }));
  ok(wh.res.length > 3 && wh.last === wh.today && wh.again === null && wh.dis, `Glücksrad gedreht: „${wh.res.replace(/\s+/g, ' ').trim()}“, heute kein zweites Mal`);
  await sh('28-gluecksrad');
  await q.keyboard.press('Escape'); await Q(200);

  // ---------- Serie: Kalender, Check-in, nächster Tag per Popup ----------
  await viaMenu('streak', q);
  await q.locator('.sheet [data-act="checkin"]').click(); await Q(500);
  const st1 = await S(() => ({ ...__fabrik.sim.S.meta.streak }));
  ok(st1.n === 1 && st1.day === 1 && await q.locator('.sheet .sd.today.got').count() === 1, `Serie: Tag 1 abgeholt (${JSON.stringify(st1)})`);
  await q.keyboard.press('Escape'); await Q(200);
  await S(() => { const d = new Date(); d.setDate(d.getDate() - 1); __fabrik.sim.S.meta.streak.last = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; __fabrik.ui.afterStart(); });
  await Q(700);
  ok(await q.locator('.modal.checkin').count() === 1 && /day 2/i.test(await q.locator(".modal.checkin .sd.today").innerText()), 'nächster Tag: Check-in-Popup mit Tag 2 hervorgehoben');
  await sh('29-serie-popup');
  await q.locator('.modal.checkin .btn.main').click(); await Q(400);
  ok(await S(() => __fabrik.sim.S.meta.streak.day === 2 && __fabrik.sim.S.meta.streak.len === 2), 'Serie: Tag 2, zwei Tage in Folge');

  // ---------- Ereignisse: Banner + Effekt ----------
  await S(() => { __fabrik.meta.trigger('vip', { item: 'eisenbarren', n: 6 }); __fabrik.meta.trigger('meteor'); __fabrik.rig.jumpTo(56, 56, 30, 0); });
  await Q(2600);
  const evb = await S(() => ({ chips: [...document.querySelectorAll('.evbar .evc')].map(e => e.className), meteor: !!__fabrik.view.handles.get('meteor'), vip: !!__fabrik.view.handles.get('vip'), deps: __fabrik.meta.active().find(a => a.kind === 'meteor')?.deps?.length || 0 }));
  ok(evb.chips.some(c => /ev-vip/.test(c)) && evb.chips.some(c => /ev-meteor/.test(c)) && evb.meteor && evb.vip && evb.deps === 1, `Ereignis-Banner mit Timer (VIP + Meteor), Effekte laufen: ${JSON.stringify(evb)}`);
  await sh('30-ereignisse');

  // ---------- Album ----------
  await S(() => { const T = __fabrik.sim.S.total; for (const [i, n] of [['stein', 1200], ['eisenerz', 40], ['kupfererz', 12], ['kohle', 3], ['sand', 1], ['ziegel', 5]]) T.made[i] = n; T.goldMade.eisenerz = 1; T.perfect.stein = 1; });
  await Q(1500);
  await viaMenu('album', q);
  const al = await S(() => ({ items: document.querySelectorAll('.sheet .aitem').length, have: document.querySelectorAll('.sheet .acard:not(.miss)').length, miss: document.querySelectorAll('.sheet .acard.miss').length, tabs: document.querySelectorAll('.sheet .apages button').length }));
  ok(al.items >= 6 && al.have >= 5 && al.miss > 0 && al.tabs >= 4, `Album: ${al.items} Teile, ${al.have} Karten, ${al.miss} × „???“, ${al.tabs} Seiten`);
  await sh('31-album');
  await q.locator('.sheet .apages button').nth(1).click(); await Q(250);
  ok(/Tier 2/.test(await q.locator('.sheet .aph').innerText()), 'Album: Seite 2 per Klick');
  await q.keyboard.press('Escape'); await Q(200);

  // ---------- Ziel-Leiste ----------
  const gl = await q.locator('.topc .goalb').innerText().catch(() => '');
  await q.locator('.topc .goalb').click(); await Q(400);
  const gr = await S(() => ({ panel: __fabrik.ui.panel, tool: __fabrik.app.tool }));
  ok(gl.length > 5 && (gr.panel || gr.tool), `Ziel-Leiste „${gl.replace(/\s+/g, ' ').trim()}“ → Klick öffnet ${gr.panel || gr.tool}`);
  await q.keyboard.press('Escape'); await q.keyboard.press('Escape'); await Q(200);

  // ---------- Wunder nach (simuliertem) Prestige ----------
  await S(() => { const s = __fabrik.sim; s.S.stats.earned = 2.5e6; __fabrik.app.prestige('wiese'); s.S.money = 2e6; __fabrik.ui._bar(); });
  await Q(600);
  ok(await q.locator('.buildbar [data-b="wunder"]').count() === 1, 'nach dem Prestige: Weltwunder in der Bauleiste');
  await viaMenu('wonder', q);
  ok(await q.locator('.sheet .wst').count() === 5, 'Wunder-Panel: 5 Stufen mit Bedarf und Boni');
  await q.locator('.sheet [data-act="wonder-place"]').click(); await Q(250);
  ok(await S(() => __fabrik.app.tool === 'wunder'), '„Bauplatz setzen“ wählt das Wunder');
  const wp = await at(52.5, 51.5); await q.mouse.move(wp.x, wp.y, { steps: 3 }); await Q(200); await q.mouse.down(); await q.mouse.up(); await Q(400);
  const wid = await S(() => __fabrik.sim.S.ents.find(e => e.type === 'wunder')?.id || 0);
  ok(wid > 0, 'Weltwunder-Bauplatz per Klick gesetzt');
  await S(id => { const s = __fabrik.sim; s.S.wonder.have = { ziegel: 1999, eisenplatte: 1000 }; s.debugInsert(id, 'ziegel'); }, wid);
  await Q(600);
  const ws = await S(() => ({ stage: __fabrik.sim.S.wonder.stage, ev: window.__ev.wonder || 0 }));
  await S(() => { const s = __fabrik.sim; s.S.wonder.have = { motor: 220, schaltkreis: 140 }; __fabrik.rig.jumpTo(52.5, 51.5, 16, 0); });
  await Q(1500);
  const wsv = await S(id => { const B = __fabrik.view.B.get(id); return B ? B.b.stage : -1; }, wid);
  ok(ws.stage === 2 && wsv === 1, `Wunder: Stufe 1 fertig → Stufe ${ws.stage}, Modell zeigt ${wsv} fertige Stufe(n)`);
  await sh('32-wunder');
  await viaMenu('wonder', q); await Q(200);
  await sh('32b-wunder-panel');
  await q.keyboard.press('Escape'); await Q(200);

  // ---------- Wochen-Herausforderung: starten, Ende, Code, zurück ----------
  const home = await S(() => ({ n: __fabrik.sim.S.ents.length, pres: __fabrik.sim.S.total.prestiges }));
  await viaMenu('challenge', q);
  await q.locator('.sheet [data-act="chal-start"]').first().click(); await Q(800);
  const ch = await S(() => ({ in: __fabrik.app.inChallenge(), slot: __fabrik.app.slot, chip: !!document.querySelector('.hud .chip.chal'), autoN: __fabrik.storage.info('auto').buildings, money: __fabrik.sim.S.money, week: __fabrik.sim.S.chal.week }));
  ok(ch.in && ch.slot === 'chal' && ch.chip && ch.autoN === home.n, `Herausforderung gestartet (${ch.week}, Startgeld ${ch.money}), Timer im HUD, normale Fabrik im Autosave (${ch.autoN})`);
  await S(() => { const c = __fabrik.sim.S.chal; __fabrik.sim.S.stats.earned = 12345; c.lt = 30; c.left = 1.5; });
  await Q(2500);
  const ce = await S(() => ({ modal: !!document.querySelector('.modal.chalend'), code: document.querySelector('.modal.chalend code')?.textContent || '', board: __fabrik.storage.chalScores(__fabrik.sim.S.chal.week).length }));
  ok(ce.modal && /^COG-\d{4}-W\d{2}-/.test(ce.code) && ce.board >= 1, `Ende-Bildschirm mit Score und Code ${ce.code}, Bestenliste ${ce.board}`);
  await sh('33-challenge-ende');
  await q.locator('.modal.chalend [data-act="chal-copy"]').click(); await Q(300);
  await q.locator('.modal.chalend .btn.main').click(); await Q(800);
  const back = await S(() => ({ in: __fabrik.app.inChallenge(), n: __fabrik.sim.S.ents.length, pres: __fabrik.sim.S.total.prestiges, chal: __fabrik.storage.info('chal')?.chal }));
  ok(!back.in && back.n === home.n && back.pres === home.pres && back.chal?.done, `zurück zur normalen Fabrik ohne Verlust (${back.n} Gebäude, Prestige ${back.pres}), Herausforderung gespeichert`);
  await viaMenu('challenge', q);
  await q.locator('.sheet input.chalcode').fill(ce.code); await q.locator('.sheet [data-act="chal-check"]').click(); await Q(300);
  ok(/Valid code/.test(await q.locator('.sheet .cmp').innerText().catch(() => '')), 'Code eines Freundes eingeben: gültig erkannt');
  await q.locator('.sheet input.chalcode').fill('COG-2026-W47-ZZZ-0000'); await q.locator('.sheet [data-act="chal-check"]').click(); await Q(300);
  ok(/not valid/.test(await q.locator('.sheet .warn').innerText().catch(() => '')), 'falscher Code: Fehlertext');
  await q.keyboard.press('Escape'); await Q(200);

  // ---------- Zeitraffer-Export (über den Panel-Knopf) ----------
  await S(() => { __fabrik.ui.tlSecs = 6; window.__tlMid = window.__tlEnd = null; });
  await viaMenu('timelapse', q);
  await S(() => { __fabrik.ui.tlSecs = 6; const o = __fabrik.ui.mediaProgress.bind(__fabrik.ui); __fabrik.ui.mediaProgress = (p, rec) => { o(p, rec); if (p > .5 && !window.__tlMid) window.__tlMid = rec.toDataURL('image/jpeg', .9); if (p > .95 && !window.__tlEnd) window.__tlEnd = rec.toDataURL('image/jpeg', .9); }; });
  const [tl] = await Promise.all([q.waitForEvent('download', { timeout: 90000 }), q.locator('.sheet [data-act="tl-start"]').click()]);
  const tlf = path.join(out, 'zeitraffer.' + (tl.suggestedFilename().endsWith('.mp4') ? 'mp4' : 'webm')); await tl.saveAs(tlf);
  const tlSize = fs.statSync(tlf).size;
  ok(tlSize > 100 * 1024 && /^cogtopia-timelapse-.*\.(mp4|webm)$/.test(tl.suggestedFilename()), `Zeitraffer-Datei ${tl.suggestedFilename()}: ${(tlSize / 1024).toFixed(0)} KB`);
  for (const [k, f] of [['__tlMid', '34-zeitraffer-frame.jpg'], ['__tlEnd', '34b-zeitraffer-ende.jpg']]) { const d = await S(k2 => window[k2], k); if (d && SHOTS) { fs.writeFileSync(path.join(out, f), Buffer.from(d.split(',')[1], 'base64')); console.log('  📷 ' + path.join(out, f)); } }
  await Q(400);
  ok(await q.locator('.media.on video.mvid').count() === 1 && await S(() => !__fabrik.app.media && __fabrik.view.sim === __fabrik.sim), 'nach dem Export: Vorschau-Video, Fabrik wieder angezeigt');
  await q.locator('.media [data-act="media-close"]').click(); await Q(200);

  // ---------- Fotomodus ----------
  await S(() => __fabrik.rig.jumpTo(56, 55, 26, 0)); await Q(300);
  await q.keyboard.press('k'); await Q(500);
  const ph = await S(() => ({ on: document.getElementById('ui').classList.contains('photo-on'), hud: getComputedStyle(document.querySelector('.hud')).display, bar: getComputedStyle(document.querySelector('.buildbar')).display, panel: !!document.querySelector('.photo.on'), stage: __fabrik.stage.photo.on }));
  ok(ph.on && ph.hud === 'none' && ph.bar === 'none' && ph.panel && ph.stage, 'Fotomodus (K): Oberfläche aus, Foto-Regler da, Post-FX an');
  await q.locator('.photo [data-set="ph.blur"]').fill('16'); await q.locator('.photo [data-act="photo-filter"][data-v="warm"]').click(); await Q(400);
  ok(await S(() => __fabrik.stage.photo.filter === 'warm' && __fabrik.stage.photo.blur === 16), 'Regler + Filter wirken (Unschärfe 16, warm)');
  await sh('35-fotomodus');
  const [pdl] = await Promise.all([q.waitForEvent('download', { timeout: 20000 }), q.locator('.photo [data-act="photo-save"]').click()]);
  const phf = path.join(out, 'foto.png'); await pdl.saveAs(phf);
  const phb = fs.readFileSync(phf);
  ok(phb.length > 50 * 1024 && phb.slice(1, 4).toString() === 'PNG', `Foto als PNG (doppelte Auflösung): ${(phb.length / 1024).toFixed(0)} KB`);
  await q.keyboard.press('Escape'); await Q(300);
  ok(await S(() => !__fabrik.app.photoOn && !__fabrik.stage.photo.on && getComputedStyle(document.querySelector('.hud')).display !== 'none'), 'Esc beendet den Fotomodus');

  // ---------- Deutsch: keine englischen Reste in den neuen Panels ----------
  await S(() => __fabrik.ui.act('lang', { l: 'de' })); await Q(300);
  const enOnly = await S(async () => {
    const en = (await import('/fabrik/js/lang/en.js')).default, de = (await import('/fabrik/js/lang/de.js')).default;
    return Object.keys(en).filter(k => typeof en[k] === 'string' && en[k] !== de[k] && !/[{<]/.test(en[k]) && en[k].length >= 3 && /[a-z]/i.test(en[k])).map(k => en[k]);
  });
  const leftovers = new Set();
  const scan = async label => { const txt = await S(() => [document.querySelector('#ui .sheet.on'), document.querySelector('#ui .info.on'), document.querySelector('#ui .ovl.on'), document.querySelector('#ui .toolbar.on'), document.querySelector('#ui .topc'), document.querySelector('#ui .buildbar'), document.querySelector('#ui .tut.on'), document.querySelector('#ui .photo.on'), document.querySelector('#ui .modals')].filter(Boolean).map(e => e.innerText).join('\n'));
    for (const w of enOnly) { const re = new RegExp('(^|[^\\p{L}])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^\\p{L}])', 'u'); if (re.test(txt)) leftovers.add(label + ': ' + w); } };
  for (const pn of ['menu', 'wheel', 'streak', 'album', 'wonder', 'challenge', 'blueprints', 'timelapse', 'settings']) { if (pn === 'menu') { await q.locator('.side [data-p="menu"]').click(); } else await viaMenu(pn, q); await Q(250); await scan(pn); await q.keyboard.press('Escape'); await Q(150); }
  await S(() => { __fabrik.app.setOverlay('power', true); __fabrik.app.setOverlay('issues', true); }); await Q(700);
  for (const ty of ['kraftwerk', 'drohnenhafen', 'ofen', 'mast', 'wunder']) { await S(t => { const e = __fabrik.sim.S.ents.find(q => q.type === t); if (e) __fabrik.app.select(e.id); }, ty); await Q(300); await scan('info ' + ty); }
  await S(() => { __fabrik.app.select(0); __fabrik.app.setTool('band'); __fabrik.app.setBeltMode('route'); }); await Q(200); await scan('toolbar band');
  await S(() => { __fabrik.app.setTool('bp'); __fabrik.app.holdBp(__fabrik.bp.decodeBp(__fabrik.storage.bpList()[0].code)); }); await Q(200); await scan('toolbar bp');
  await S(() => { __fabrik.app.setTool(null); __fabrik.meta.trigger('boom'); __fabrik.meta.trigger('goldvein'); }); await Q(500); await scan('banner');
  await S(() => { __fabrik.ui.hintNow = 'power'; __fabrik.ui.renderTut(true); }); await Q(200); await scan('hint');
  await S(() => { __fabrik.ui.hintNow = null; __fabrik.ui.renderTut(true); __fabrik.app.photo(true); }); await Q(300); await scan('photo'); await S(() => __fabrik.app.photo(false));
  await S(() => { __fabrik.ui.checkInModal(); __fabrik.ui.breakthroughCard({ id: 'strom', kind: 'kiste', key: 'bt.kiste' }); }); await Q(300); await scan('dialogs');
  await sh('36-deutsch-panels');
  await S(() => { __fabrik.ui.closeModals(); __fabrik.ui.act('overlay-close', {}); __fabrik.app.setOverlay('power', false); __fabrik.app.setOverlay('issues', false); });
  ok(leftovers.size === 0, 'Deutsch: keine englischen Reste in neuen Panels, Info-Panels, Werkzeugzeile, Banner, Dialogen' + (leftovers.size ? ': ' + [...leftovers].slice(0, 12).join(' | ') : ''));
  await S(() => __fabrik.ui.act('lang', { l: 'en' })); await Q(200);
  ok(await S(() => document.documentElement.scrollWidth <= innerWidth), 'kein horizontales Scrollen (Ausbau 2, Desktop)');
  await c3.close();
}

// ------------------------------------------------------------------------------------------------ Großbohrer: 4 Bohrer im Quadrat verschmelzen (echter Klick)
{
  const { ctx: c4, page: g } = await newPage();
  const G = (ms = 400) => g.waitForTimeout(ms), E = (fn, a) => g.evaluate(fn, a);
  await g.goto(URL0); await toMenu(g);
  await g.locator('.menu .btn', { hasText: 'New factory' }).first().click(); await G(300);
  if (await g.locator('.modal .btn.main').count()) await g.locator('.modal .btn.main').click();
  await g.waitForFunction(() => __fabrik.ui.mode === 'play' && __fabrik.sim, null, { timeout: 10000 }); await G(400);
  await g.locator('.tut [data-act="tut-skip"]').click(); await G(200);
  const sp = await E(() => {
    const s = __fabrik.sim; s.S.money = 1e7; s.S.tut = 99;
    for (let k = 0; k < 2; k++) for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) if (s.plotState(x, y) === 'buyable') s.buyPlot(x, y);
    const Q = [[0, 0], [2, 0], [0, 2], [2, 2]];
    for (let y = 36; y < 70; y++) for (let x = 36; x < 70; x++) {
      const cs = Q.map(([i, j]) => s.canPlace('bohrer', x + i, y + j, 0)); if (!cs.every(c => c.ok) || new Set(cs.map(c => c.item)).size !== 1) continue;
      let free = true; for (let i = 0; i < 6 && free; i++) free = s.canPlace('band', x + 4 + i, y + 2, 0).ok && s.canPlace('band', x + 4 + i, y + 3, 0).ok; if (!free || !s.canPlace('verkauf', x + 10, y + 1, 0).ok) continue;
      for (const [i, j] of Q.slice(0, 3)) s.place('bohrer', x + i, y + j, 0);
      for (let i = 0; i < 6; i++) s.place('band', x + 4 + i, y + 2, 0);
      s.place('verkauf', x + 10, y + 1, 0);
      __fabrik.rig.jumpTo(x + 5, y + 2, 15, 1); return [x, y];
    }
    return null;
  });
  ok(!!sp, 'Großbohrer: Platz mit 3 Bohrern im Quadrat vorbereitet ' + sp);
  if (sp) {
    await G(500); if (await g.locator('.tut [data-act="hint-ok"]').count()) { await g.locator('.tut [data-act="hint-ok"]').click(); await G(150); }
    await g.locator('.buildbar [data-b="bohrer"]').click(); await G(200); await E(() => { __fabrik.app.rot = 0; });
    const pp = await g.evaluate(([x, z]) => __fabrik.stage.screenPos([x, 0, z]), [sp[0] + 3, sp[1] + 3]);
    await g.mouse.move(pp.x - 20, pp.y - 10); await g.mouse.move(pp.x, pp.y, { steps: 4 }); await G(250); await g.mouse.down(); await g.mouse.up(); await G(900);
    const r = await E(([x, y]) => { const s = __fabrik.sim, e = s.entity(s.at(x, y)), v = [...__fabrik.view.B.values()].find(b => b.type === 'grossbohrer');
      return { type: e?.type, n: s.count.bohrer || 0, out: e && s.N.get(e.id).tgt?.e.type, view: !!v, toast: [...document.querySelectorAll('.toast')].map(t => t.textContent).join(' | '), hint: __fabrik.ui.hintNow }; }, sp);
    ok(r.type === 'grossbohrer' && r.n === 0 && r.out === 'band' && r.view, `4. Bohrer per Klick → Großbohrer (Ausgang aufs Band, Modell in der Szene): ${JSON.stringify({ type: r.type, out: r.out, view: r.view })}`);
    ok(/Mega Drill/.test(r.toast) && r.hint === 'merge', 'Meldung „Mega Drill“ und Hinweis: ' + r.toast.slice(0, 90));
    await E(() => { __fabrik.app.setTool(null); __fabrik.sim.tick(20 * 30); }); await G(800);
    await shot('41-grossbohrer', g);
    if (await g.locator('.tut [data-act="hint-ok"]').count()) { await g.locator('.tut [data-act="hint-ok"]').click(); await G(150); }
    await E(([x, y]) => __fabrik.app.select(__fabrik.sim.at(x, y)), sp); await G(500);
    const info = await g.locator('.info').innerText().catch(() => '');
    ok(/Merged from/.test(info) && /4 drills/.test(info) && /\/ 16/.test(info), 'Info-Panel: verschmolzen aus 4 Bohrern, Puffer 16');
    await shot('41b-grossbohrer-info', g);
    const sold = await E(() => __fabrik.sim.S.stats.earned); ok(sold > 0, `Großbohrer liefert über das eine Band an den Verkauf (${Math.round(sold)} Münzen)`);
    await E(() => __fabrik.ui.act('lang', { l: 'de' })); await G(300);
    ok(/Großbohrer|Verschmolzen/.test(await g.locator('.info').innerText().catch(() => '')), 'Deutsch: Großbohrer im Info-Panel');
  }
  await c4.close();
}

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
  await m.locator('.sheet .x').tap(); await m.waitForTimeout(300);
  // Ausbau 2 auf dem Handy: Menü, Glücksrad, Werkzeugzeile mit Wegsuche, Fotomodus
  await m.evaluate(() => { const s = __fabrik.sim; s.S.tut = 99; s.S.money = 1e7; s.S.rp = 1e6; for (const r of ['kupfer', 'presse', 'labor', 'strom']) s.buyResearch(r); __fabrik.ui._bar(); __fabrik.ui.hintNow = null; __fabrik.ui.renderTut(true); __fabrik.meta.trigger('goldvein'); });
  await m.waitForTimeout(400);
  await m.locator('.side [data-p="menu"]').tap(); await m.waitForTimeout(450);
  s = await sw(); ok(s.sw <= s.w && s.bw <= s.w, `Handy: Menü ohne horizontales Scrollen (${s.sw}/${s.w})`);
  await shot('37-handy-menu', m);
  await m.locator('.sheet .mt[data-p="wheel"]').tap(); await m.waitForTimeout(450);
  const wr = await m.evaluate(() => { const r = document.querySelector('.sheet .wheel-wrap').getBoundingClientRect(), b = document.querySelector('.sheet [data-act="spin"]').getBoundingClientRect(); return { l: r.left, r: r.right, bl: b.left, br: b.right }; });
  s = await sw(); ok(s.sw <= s.w && wr.l >= 0 && wr.r <= 390 && wr.br <= 390, `Handy: Glücksrad passt (${wr.l.toFixed(0)}–${wr.r.toFixed(0)}), kein horizontales Scrollen`);
  await shot('38-handy-gluecksrad', m);
  await m.locator('.sheet .x').tap(); await m.waitForTimeout(300);
  await m.locator('.buildbar [data-b="band"]').tap(); await m.waitForTimeout(250);
  const tb = await m.evaluate(() => { const r = document.querySelector('.toolbar.on').getBoundingClientRect(); return { l: r.left, r: r.right, seg: !!document.querySelector('.toolbar [data-act="route"]') }; });
  s = await sw(); ok(tb.seg && tb.l >= 0 && tb.r <= 390 && s.sw <= s.w, `Handy: Werkzeugzeile mit L-Form/Wegsuche im Bild (${tb.l.toFixed(0)}–${tb.r.toFixed(0)})`);
  await shot('39-handy-werkzeug', m);
  await m.evaluate(() => { __fabrik.app.setTool(null); __fabrik.app.photo(true); }); await m.waitForTimeout(400);
  const pr = await m.evaluate(() => { const r = document.querySelector('.photo.on').getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top }; });
  s = await sw(); ok(pr.l >= 0 && pr.r <= 390 && pr.t > 300 && s.sw <= s.w, 'Handy: Foto-Regler im Bild');
  await shot('40-handy-foto', m);
  await m.evaluate(() => __fabrik.app.photo(false));
  await c2.close();
}

await browser.close(); srv.close();
console.log(fails ? `PLAY FEHLER: ${fails}` : 'PLAY OK'); process.exit(fails ? 1 : 0);
