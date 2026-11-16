// Prüft die Oberfläche mit tools/ui-demo.html (echte Spiellogik, Attrappe statt 3D) in headless Chromium.
//   node insel/tools/ui-demo.mjs [ausgabeordner]
// Screenshots aller Bildschirme (Desktop + Handy 390×844), Speichern → Neuladen → Laden, Datei sichern/laden, Löschen mit Rückfrage.
// Endet mit "UI OK" oder "UI FEHLER: n".
import http from 'http'; import fs from 'fs'; import path from 'path'; import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.resolve(process.argv[2] || 'work/insel-ui'); fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const URL0 = `http://localhost:${srv.address().port}/tools/ui-demo.html`;
const browser = await chromium.launch();
let fails = 0;
const ok = (c, msg) => { console.log((c ? '  ok   ' : '  FAIL ') + msg); if (!c) fails++; };
const watch = (page, tag) => {
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) { console.log(`  [${tag}] console error: ${m.text()}`); fails++; } });
  page.on('pageerror', e => { console.log(`  [${tag}] PAGE ERROR: ${e.message}`); fails++; });
  page.on('dialog', d => { console.log(`  [${tag}] native dialog: ${d.type()}`); fails++; d.dismiss(); });
};
const shot = async (page, name) => { await page.screenshot({ path: path.join(out, name + '.png') }); console.log('  📷 ' + name); };
const ready = async page => { await page.waitForFunction(() => window.__ready, null, { timeout: 30000 }); await page.waitForTimeout(900); };
const clickText = (page, sel, text) => page.locator(sel, { hasText: text }).first().click();

// ================= Desktop =================
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
const page = await ctx.newPage(); watch(page, 'desktop');
console.log('Startmenü'); await page.goto(URL0); await ready(page);
ok(await page.locator('.title h1').isVisible(), 'Titel sichtbar'); await shot(page, '01-start');

console.log('Neue Insel');
await clickText(page, '.mmenu .btn', 'Neue Insel'); await page.waitForTimeout(400); await shot(page, '02-neue-insel');
await page.locator('.modal input[type=text]').fill('Testinsel');
await page.keyboard.press('r');                                   // Taste im Feld darf nicht drehen
ok(await page.locator('.modal input[type=text]').inputValue() === 'Testinselr', 'Tippen im Feld landet im Feld');
ok(!(await page.evaluate(() => __app.log.includes('audio:rotate'))), 'R im Eingabefeld dreht nicht');
await page.locator('.modal input[type=text]').fill('Testinsel');
await clickText(page, '.modal .btn', 'Insel erschaffen'); await page.waitForTimeout(700);
ok(await page.evaluate(() => __game.S.name === 'Testinsel' && __game.S.mode === 'klassisch'), 'Insel angelegt');
await shot(page, '03-hud-anleitung');

console.log('Anleitung');
await page.evaluate(() => { __ui.notify('camRotate'); __ui.notify('zoom', { distance: 20 }); }); await page.waitForTimeout(1000);
ok(await page.evaluate(() => __game.S.tut === 1), 'Schritt 1 → 2 nach Umsehen + Zoomen');
await page.evaluate(() => __demo.autoPlace(1)); await page.waitForTimeout(1200);
ok(await page.evaluate(() => __game.S.tut === 2), 'Schritt 2 → 3 nach erster Kachel');
await page.evaluate(() => __app.rotate(1)); await page.waitForTimeout(600);
ok(await page.evaluate(() => __game.S.tut === 3), 'Schritt 3 → 4 nach Drehen');
await page.evaluate(() => __demo.hoverBest()); await page.waitForTimeout(300); await shot(page, '04-vorschau');
await page.waitForTimeout(2600);
ok(await page.evaluate(() => __game.S.tut === 4), 'Schritt 4 → 5 nach Vorschau');
await clickText(page, '.tut .btn', 'Später'); await page.waitForTimeout(200);
await clickText(page, '.tut .btn', 'Später'); await page.waitForTimeout(200);
await shot(page, '05-anleitung-gebaeude');
await page.evaluate(() => __ui.notify('buildingClick', { name: 'Fachwerkhaus', text: 'Hier wohnt Familie Krume.' })); await page.waitForTimeout(600);
ok(await page.evaluate(() => __game.S.tut === 7), 'Schritt 7 → 8 nach Gebäude-Klick');
ok(await page.locator('.info').isVisible(), 'Gebäude-Info sichtbar');

console.log('Punkte-Popups');
await page.evaluate(() => { __demo.force('wald'); __demo.autoPlace(1); __demo.force('wald'); __demo.autoPlace(1); }); await page.waitForTimeout(250);
await page.evaluate(() => { __demo.force('wald'); __demo.autoPlace(1); }); await page.waitForTimeout(450);
ok(await page.locator('.fx .pop').count() > 0, 'Punkte-Popups an den Kanten'); await shot(page, '06-popups');

console.log('Meilenstein');
await page.evaluate(() => { for (let i = 0; i < 4; i++) { __demo.force('wald'); __demo.autoPlace(1); } }); await page.waitForTimeout(1300);
ok(await page.evaluate(() => (__game.S.ms.wald || 0) >= 1), 'Wald-Meilenstein erreicht');
await shot(page, '07-meilenstein');
await page.waitForTimeout(1200);
ok(await page.evaluate(() => __game.S.tut >= 8), 'Anleitung abgeschlossen');

console.log('Freischaltung');
await page.evaluate(() => { __game.S.score = __game.nextUnlock().at - 2; __demo.force('wiese'); __demo.autoPlace(1); }); await page.waitForTimeout(800);
ok(await page.locator('.ucard').count() > 0, 'Freischaltungs-Karte'); await shot(page, '08-freischaltung');

console.log('Perfekt + Aufgabe');
const perfect = await page.evaluate(() => {   // freies Feld ohne Bachkante davor: Nachbarn mit See füllen, dann Wiese hinein → perfekt
  const g = __game, N = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
  for (const [q, r] of g.slots()) {
    if (N.some(([a, b], i) => { const n = g.at(q + a, r + b); return n && g.edges(n)[(i + 3) % 6] === 'w'; })) continue;
    for (let pass = 0; pass < 6; pass++) for (const [a, b] of N) if (!g.at(q + a, r + b)) { __demo.force('see'); if (!g.place(q + a, r + b, 0).ok) g.S.stack.splice(g.S.pick, 1); }
    if (N.some(([a, b]) => !g.at(q + a, r + b))) continue;
    __demo.force('wiese'); return !!g.place(q, r, 0).perfect;
  }
  return false;
});
await page.waitForTimeout(500); ok(perfect, 'Perfekt-Zug'); await shot(page, '09-perfekt');
await page.evaluate(() => { __demo.force('wald', 3); __demo.autoPlace(1); }); await page.waitForTimeout(400);
ok(await page.locator('.fx .flag').count() > 0, 'Aufgaben-Flagge über der Kachel');
await page.evaluate(() => { __demo.force('wald', 2); }); await page.waitForTimeout(200);
ok(await page.locator('.tc .qf').count() > 0, 'Flagge auf Stapel-Kachel'); await shot(page, '10-aufgabe');

console.log('Rückgängig');
const before = await page.evaluate(() => __game.S.tiles.length);
await page.keyboard.press('Control+z'); await page.waitForTimeout(300);
ok(await page.evaluate(n => __game.S.tiles.length === n - 1, before), 'Strg+Z nimmt eine Kachel zurück');

console.log('Handbuch');
await page.keyboard.press('b'); await page.waitForTimeout(400); await shot(page, '11-handbuch-steuerung');
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200); await shot(page, '12-handbuch-kacheln');
await clickText(page, '.book nav button', 'Punkte'); await page.waitForTimeout(200); await shot(page, '13-handbuch-punkte');
await clickText(page, '.book nav button', 'Gruppen'); await page.waitForTimeout(200); await shot(page, '14-handbuch-gruppen');
const pages = await page.locator('.book .foot span').textContent(); console.log('  ' + pages);
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
ok(await page.locator('.book').count() === 0, 'Esc schließt das Handbuch');

console.log('Einstellungen');
await page.keyboard.press('Escape'); await page.waitForTimeout(400);
ok(await page.locator('.mmenu').isVisible(), 'Esc öffnet das Menü');
await clickText(page, '.mmenu .btn', 'Einstellungen'); await page.waitForTimeout(300);
await clickText(page, '.seg button', 'Hoch'); await page.locator('.modal input[type=checkbox]').uncheck();
await page.waitForTimeout(150); await shot(page, '15-einstellungen');
ok(await page.evaluate(() => JSON.parse(localStorage.getItem('insel.settings')).quality === 'hoch'), 'Einstellungen gespeichert');
await clickText(page, '.modal .btn', 'Fertig'); await page.waitForTimeout(300);

console.log('Meine Inseln');
await clickText(page, '.mmenu .btn', 'Meine Inseln'); await page.waitForTimeout(500); await shot(page, '16-inseln');
ok(await page.locator('.slot:not(.empty)').count() === 1, 'eine gespeicherte Insel');
await page.locator('.slot.cur .btn[title=Kopieren]').click(); await page.waitForTimeout(300);
ok(await page.locator('.slot:not(.empty)').count() === 2, 'Kopie angelegt');
// Umbenennen über eigenen Dialog
await page.locator('.slot').nth(1).locator('.btn[title=Umbenennen]').click(); await page.waitForTimeout(250);
await page.locator('.dlg input').fill('Wolkenkopie'); await shot(page, '17-umbenennen'); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
ok(await page.locator('.slot b', { hasText: 'Wolkenkopie' }).count() === 1, 'umbenannt');
// Datei sichern
const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.slot.cur .btn[title="Als Datei sichern"]').click()]);
const file = path.join(out, dl.suggestedFilename()); await dl.saveAs(file);
ok(dl.suggestedFilename() === 'Testinsel.insel.json' && JSON.parse(fs.readFileSync(file, 'utf8')).S.tiles.length > 5, 'Export ' + dl.suggestedFilename());
// Löschen mit eigener Rückfrage
await page.locator('.slot').nth(1).locator('.btn[title=Löschen]').click(); await page.waitForTimeout(300); await shot(page, '18-loeschen-rueckfrage');
ok(await page.locator('.dlg h2', { hasText: 'löschen' }).isVisible(), 'eigene Rückfrage');
await clickText(page, '.dlg .btn', 'Abbrechen'); await page.waitForTimeout(200);
ok(await page.locator('.slot:not(.empty)').count() === 2, 'Abbrechen löscht nicht');
await page.locator('.slot').nth(1).locator('.btn[title=Löschen]').click(); await page.waitForTimeout(250);
await clickText(page, '.dlg .btn', 'Löschen'); await page.waitForTimeout(300);
ok(await page.locator('.slot:not(.empty)').count() === 1, 'gelöscht');
// Datei laden
await page.locator('.modal input[type=file]').setInputFiles(file); await page.waitForTimeout(600);
ok(await page.locator('.slot:not(.empty)').count() === 2, 'Import in freien Platz');
await page.locator('.modal input[type=file]').setInputFiles({ name: 'kaputt.insel.json', mimeType: 'application/json', buffer: Buffer.from('{nix') }); await page.waitForTimeout(300);
ok(await page.locator('.toast.err').count() > 0, 'kaputte Datei → Hinweis'); await shot(page, '19-import');
await page.keyboard.press('Escape'); await page.waitForTimeout(300);

console.log('Fotomodus');
await clickText(page, '.mmenu .btn', 'Weiterspielen'); await page.waitForTimeout(400);
await page.keyboard.press('p'); await page.waitForTimeout(400);
await clickText(page, '.photobar .filters button', 'Goldene'); await page.waitForTimeout(200);
ok(await page.locator('.hud').isHidden(), 'HUD im Fotomodus weg'); await shot(page, '20-fotomodus');
const [ph] = await Promise.all([page.waitForEvent('download'), clickText(page, '.photobar .btn', 'Foto speichern')]);
ok(/\.png$/.test(ph.suggestedFilename()), 'Foto-Download ' + ph.suggestedFilename());
await clickText(page, '.photobar .btn', 'Zeitraffer'); await page.waitForTimeout(400); await shot(page, '21-zeitraffer');
await page.waitForTimeout(1200);
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
ok(await page.evaluate(() => __app.log.includes('photo:false') && __app.log.includes('filter:normal')), 'Fotomodus beendet');

console.log('Speichern → Neuladen → Laden');
await page.evaluate(() => __demo.autoPlace(2)); await page.waitForTimeout(1600);
const snap = await page.evaluate(() => ({ n: __game.S.tiles.length, score: __game.S.score, tut: __game.S.tut }));
await page.reload(); await ready(page); await shot(page, '22-nach-neuladen');
ok(await page.locator('.mmenu .btn', { hasText: 'Testinsel' }).count() === 1, 'Weiterspielen zeigt Testinsel');
await clickText(page, '.mmenu .btn', 'Weiterspielen'); await page.waitForTimeout(500);
const back = await page.evaluate(() => ({ n: __game.S.tiles.length, score: __game.S.score, tut: __game.S.tut }));
ok(JSON.stringify(back) === JSON.stringify(snap), `gleiche Insel nach Neuladen (${back.n} Kacheln, ${back.score} P.)`);

console.log('Ende');
await page.evaluate(() => { __game.S.stack = __game.S.stack.slice(0, 1); __game.S.pick = 0; __game.emit('stack'); __demo.autoPlace(1); }); await page.waitForTimeout(2600);
ok(await page.locator('.modal h2', { hasText: 'fertig' }).isVisible(), 'Endbildschirm'); await shot(page, '23-ende');
await clickText(page, '.modal .btn', 'Endlos'); await page.waitForTimeout(300);
ok(await page.evaluate(() => __game.S.mode === 'endlos' && __game.S.stack.length > 0), 'Endlos weiterbauen');

console.log('Kreativ');
await page.keyboard.press('Escape'); await page.waitForTimeout(300); await clickText(page, '.mmenu .btn', 'Neue Insel'); await page.waitForTimeout(300);
await clickText(page, '.mode', 'Kreativ'); await clickText(page, '.modal .btn', 'Insel erschaffen'); await page.waitForTimeout(400);
await page.locator('.dlg .btn', { hasText: 'Überschreiben' }).click({ timeout: 1000 }).catch(() => {}); await page.waitForTimeout(500);
await page.locator('.palette .tc[data-kind=muehle]').click(); await page.waitForTimeout(200);
ok(await page.evaluate(() => __game.current().k === 'muehle'), 'Palette wählt Kachel'); await shot(page, '24-kreativ');
await ctx.close();

// ================= Handy =================
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const mp = await m.newPage(); watch(mp, 'handy');
await mp.goto(URL0); await ready(mp); await shot(mp, 'm1-start');
await clickText(mp, '.mmenu .btn', 'Neue Insel'); await mp.waitForTimeout(300); await shot(mp, 'm2-neue-insel');
await clickText(mp, '.modal .btn', 'Insel erschaffen'); await mp.waitForTimeout(600); await shot(mp, 'm3-hud');
await mp.evaluate(() => { __ui.notify('camRotate'); __ui.notify('zoom'); }); await mp.waitForTimeout(900);
await mp.evaluate(() => { for (let i = 0; i < 6; i++) { __demo.force('wald'); __demo.autoPlace(1); } }); await mp.waitForTimeout(1000); await shot(mp, 'm4-spiel');
await mp.evaluate(() => { __game.S.score = __game.nextUnlock().at - 2; __demo.force('wiese'); __demo.autoPlace(1); }); await mp.waitForTimeout(700); await shot(mp, 'm5-freischaltung');
await mp.locator('.hud .btn[aria-label=Handbuch]').tap(); await mp.waitForTimeout(400); await mp.locator('.book .foot .btn', { hasText: 'Weiter' }).tap(); await mp.waitForTimeout(200); await shot(mp, 'm6-handbuch');
await mp.locator('.book .x .btn').tap(); await mp.waitForTimeout(300);
await mp.locator('.hud .btn[aria-label=Menü]').tap(); await mp.waitForTimeout(300); await clickText(mp, '.mmenu .btn', 'Meine Inseln'); await mp.waitForTimeout(400); await shot(mp, 'm7-inseln');
await mp.locator('.modal .x .btn').tap(); await mp.waitForTimeout(300); await clickText(mp, '.mmenu .btn', 'Einstellungen'); await mp.waitForTimeout(300); await shot(mp, 'm8-einstellungen');
await mp.locator('.modal .x .btn').tap(); await mp.waitForTimeout(300); await clickText(mp, '.mmenu .btn', 'Weiterspielen'); await mp.waitForTimeout(300);
await mp.locator('.hud .btn[aria-label=Fotomodus]').tap(); await mp.waitForTimeout(300); await shot(mp, 'm9-foto');
// keine waagrechte Überbreite
const wide = await mp.evaluate(() => [...document.querySelectorAll('#ui *')].filter(e => { const r = e.getBoundingClientRect(); return !(r.width === 0 || (r.left > -2 && r.right < innerWidth + 2) || getComputedStyle(e).visibility === 'hidden' || e.closest('.palette,.filters,.fx,nav')); }).map(e => e.className || e.tagName).slice(0, 8));
ok(!wide.length, 'nichts ragt über den Rand (Handy) ' + wide.join(' | '));
await m.close();

await browser.close(); srv.close();
console.log(fails ? `UI FEHLER: ${fails}` : 'UI OK');
process.exit(fails ? 1 : 0);
