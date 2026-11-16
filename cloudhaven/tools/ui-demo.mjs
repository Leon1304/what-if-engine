// Prüft die Oberfläche mit tools/ui-demo.html (echte Spiellogik, Attrappe statt 3D) in headless Chromium.
//   node cloudhaven/tools/ui-demo.mjs [ausgabeordner]
// Screenshots aller Bildschirme (Desktop + Handy 390×844), Speichern → Neuladen → Laden, Datei sichern/laden, Löschen mit Rückfrage.
// Deutsch (Browser de-DE) wie gehabt, danach Englisch (Browser en-US): keine deutschen Reste, Umschalten, Sprache bleibt nach Neuladen.
// Endet mit "UI OK" oder "UI FEHLER: n".
import http from 'http'; import fs from 'fs'; import path from 'path'; import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.resolve(process.argv[2] || 'work/cloudhaven-ui'); fs.mkdirSync(out, { recursive: true });
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
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true, locale: 'de-DE' });
const page = await ctx.newPage(); watch(page, 'desktop');
console.log('Startmenü'); await page.goto(URL0); await ready(page);
ok(await page.locator('.title h1').isVisible() && await page.locator('.title h1').textContent() === 'Cloudhaven', 'Titel Cloudhaven sichtbar'); await shot(page, '01-start');
ok(await page.evaluate(() => document.documentElement.lang === 'de' && document.title === 'Cloudhaven'), 'Browser de-DE → Deutsch, <html lang=de>');

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
ok(await page.locator('.tc .qf:not([hidden])').count() > 0 && await page.locator('.bb-cur .qf:not([hidden])').count() === 1, 'Flagge auf Bauteil-Karte und an der Auswahl'); await shot(page, '10-aufgabe');

console.log('Rückgängig');
const before = await page.evaluate(() => __game.S.tiles.length);
await page.keyboard.press('Control+z'); await page.waitForTimeout(300);
ok(await page.evaluate(n => __game.S.tiles.length === n - 1, before), 'Strg+Z nimmt eine Kachel zurück');

console.log('Bauleiste');
const bar = () => page.evaluate(() => { const t = document.querySelector('.bb-track'); return { x: t.scrollLeft, max: t.scrollWidth - t.clientWidth, cur: __game.current()?.k, s: __demo.cam.s, open: [...document.querySelectorAll('.bb-grp.open')].map(g => g.dataset.cat) }; });
const tab = id => page.locator(`.bb-tab[data-cat=${id}]`);
const ncat = await page.locator('.bb-tab').count();
ok(await page.evaluate(() => { const t = document.querySelector('.bb-tabs'); return t.scrollWidth <= t.clientWidth + 1; }), 'Desktop: alle Reiter passen in eine Zeile');
ok(ncat >= 7 && await page.locator('.bb .tc').count() >= 37, `Bauleiste: ${ncat} Kategorien, ${await page.locator('.bb .tc').count()} Bauteile`);
// alles zuklappen, dann Wasser auf/zu
for (const id of (await bar()).open) { await tab(id).click(); await page.waitForTimeout(80); }
await page.waitForTimeout(450); await shot(page, '10b-leiste-zu');
ok((await bar()).open.length === 0 && await page.locator('.bb-hint').isVisible(), 'alle Kategorien zugeklappt, Hinweis sichtbar');
ok(/\d/.test(await tab('natur').locator('.ts').textContent()), 'zugeklappter Reiter zeigt Summe: ' + await tab('natur').textContent());
await tab('wasser').click(); await page.waitForTimeout(500);
const wOpen = await page.evaluate(() => document.querySelector('.bb-grp[data-cat=wasser]').getBoundingClientRect().width);
ok(wOpen > 200 && await tab('wasser').getAttribute('aria-expanded') === 'true', `Wasser aufgeklappt (${Math.round(wOpen)} px)`);
await tab('wasser').click(); await page.waitForTimeout(500);
ok(await page.evaluate(() => getComputedStyle(document.querySelector('.bb-grp[data-cat=wasser]')).display === 'none') && await tab('wasser').getAttribute('aria-expanded') === 'false', 'Wasser wieder zugeklappt');
// Auswahl per Klick (Bauteil mit Vorrat, anderes als das aktuelle)
const pickK = await page.evaluate(() => { const s = __game.supply(), c = __game.current().k; return Object.keys(s).find(k => k !== c && s[k].n > 0 && s[k].quest < s[k].n); });
const pickCat = await page.evaluate(k => document.querySelector(`.bb-grp .tc[data-kind=${k}]`).closest('.bb-grp').dataset.cat, pickK);
await tab(pickCat).click(); await page.waitForTimeout(500);
await page.locator(`.bb .tc[data-kind=${pickK}]`).click(); await page.waitForTimeout(250);
ok((await bar()).cur === pickK && await page.locator(`.bb .tc[data-kind=${pickK}].sel`).count() === 1, `Klick wählt ${pickK}, Karte hervorgehoben`);
ok((await page.locator('.bb-cur .ctx b').textContent()).includes(await page.locator(`.bb .tc[data-kind=${pickK}] .nm`).textContent()), 'Auswahl links angezeigt');
// gesperrt und leer
const lockK = await page.evaluate(() => [...document.querySelectorAll('.bb .tc.lock')].map(e => e.dataset.kind)[0]);
if (lockK) {
  const lc = await page.evaluate(k => document.querySelector(`.tc[data-kind=${k}]`).closest('.bb-grp').dataset.cat, lockK);
  if (!(await bar()).open.includes(lc)) { await tab(lc).click(); await page.waitForTimeout(450); }
  await page.locator(`.bb .tc[data-kind=${lockK}]`).click(); await page.waitForTimeout(200);
  ok((await bar()).cur === pickK && /ab \d/.test(await page.locator(`.bb .tc[data-kind=${lockK}] .lock`).textContent()), `gesperrtes ${lockK}: Schloss „${await page.locator(`.bb .tc[data-kind=${lockK}] .lock span`).textContent()}“, Auswahl bleibt`);
}
const zeroK = await page.evaluate(() => {   // eine freigeschaltete Art ganz aus dem Vorrat nehmen
  const S = __game.S, c = __game.current().k, k = S.unlocked.find(k => k !== c && S.stack.some(e => e.k === k)) || S.unlocked.find(k => k !== c);
  const cur = __game.current(); S.stack = S.stack.filter(e => e.k !== k); S.pick = Math.max(0, S.stack.indexOf(cur)); __game.emit('stack'); return k; });
await page.waitForTimeout(100);
ok(zeroK && await page.locator(`.bb .tc[data-kind=${zeroK}] .n`).textContent() === '0', `leeres Bauteil ${zeroK} gedimmt mit „0“`);
// Setzen: Zahl zählt runter und hüpft, Art bleibt gewählt
const n0 = await page.evaluate(k => __game.supply()[k].n, pickK);
await page.evaluate(() => __demo.autoPlace(1)); await page.waitForTimeout(60);
const after1 = await page.evaluate(k => ({ n: __game.supply()[k]?.n || 0, cls: document.querySelector(`.bb .tc[data-kind=${k}]`).className, cur: __game.current()?.k }), pickK);
ok(after1.n === n0 - 1 && /down/.test(after1.cls), `nach dem Setzen ${n0} → ${after1.n}, Zahl hüpft`);
ok(after1.n === 0 || after1.cur === pickK, 'gleiche Art bleibt gewählt, solange Vorrat da ist');
await page.waitForTimeout(800);
// Tasten: Tab wechselt Kategorie, Ziffer wählt
const act0 = await page.evaluate(() => __ui.activeCat);
await page.keyboard.press('Tab'); await page.waitForTimeout(450);
const act1 = await page.evaluate(() => ({ a: __ui.activeCat, open: [...__ui.openCats] }));
ok(act1.a !== act0 && act1.open.length === 1 && act1.open[0] === act1.a, `Tab: ${act0} → ${act1.a} (nur diese offen)`);
await page.keyboard.press('Shift+Tab'); await page.waitForTimeout(450);
ok(await page.evaluate(() => __ui.activeCat) === act0, 'Shift+Tab zurück');
const keyK = await page.evaluate(() => { const c = __ui.cats.find(c => c.id === __ui.activeCat), s = __game.supply(); const i = c.kinds.findIndex(k => s[k]?.n); return i < 0 ? null : [i, c.kinds[i]]; });
if (keyK) { await page.keyboard.press(String(keyK[0] + 1)); await page.waitForTimeout(200); ok((await bar()).cur === keyK[1], `Taste ${keyK[0] + 1} wählt ${keyK[1]}`); }
// alle aufklappen → Leiste läuft über, seitlich scrollen
for (const id of await page.evaluate(() => __ui.cats.map(c => c.id))) if (!(await bar()).open.includes(id)) { await tab(id).click(); await page.waitForTimeout(60); }
await page.waitForTimeout(700); await page.evaluate(() => __ui.bar.sc.jump(0)); await page.waitForTimeout(100);
const b0 = await bar(); ok(b0.max > 300 && b0.x === 0, `alle offen: ${b0.open.length} Kategorien, ${Math.round(b0.max)} px zum Scrollen`);
ok(await page.evaluate(() => document.querySelector('.bb-wrap').classList.contains('r') && !document.querySelector('.bb-wrap').classList.contains('l')), 'Verlauf + Pfeil nur rechts');
await shot(page, '10c-leiste-offen');
const tb = await page.locator('.bb-track').boundingBox();
const zoomLog = () => page.evaluate(() => __app.log.length);
await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2);
await page.mouse.wheel(0, 300); await page.waitForTimeout(600);
const b1 = await bar(); ok(b1.x > 100 && b1.s === b0.s, `Mausrad (senkrecht) scrollt waagrecht: ${Math.round(b1.x)} px, Kamera-Zoom unverändert`);
const snapOk = await page.evaluate(() => { const t = document.querySelector('.bb-track'), r = t.getBoundingClientRect(); return [...t.querySelectorAll('.bb-grp.open .gh, .bb-grp.open .tc')].some(c => Math.abs(c.getBoundingClientRect().left - r.left - 30) < 2) || t.scrollLeft >= t.scrollWidth - t.clientWidth - 1; });
ok(snapOk, 'eingerastet an einer Karte');
await page.mouse.wheel(60, 0); await page.waitForTimeout(500);
ok((await bar()).x > b1.x, 'waagrechtes Wischen (Trackpad) scrollt');
const prevented = await page.evaluate(() => { const t = document.querySelector('.bb-track'), e = new WheelEvent('wheel', { deltaY: -120, ctrlKey: true, bubbles: true, cancelable: true }); t.dispatchEvent(e); return e.defaultPrevented; });
ok(prevented && await page.evaluate(() => visualViewport.scale === 1 && document.scrollingElement.scrollTop === 0), 'Strg+Rad über der Leiste zoomt die Seite nicht');
await shot(page, '10d-leiste-gescrollt');
// Ziehen mit Schwung; Klick und Ziehen getrennt
const curBefore = (await bar()).cur, x0 = (await bar()).x, y = tb.y + tb.height * .6;
await page.mouse.move(tb.x + tb.width * .7, y); await page.mouse.down();
for (let i = 1; i <= 8; i++) { await page.mouse.move(tb.x + tb.width * .7 - i * 30, y); await page.waitForTimeout(12); }
await page.mouse.up(); await page.waitForTimeout(700);
const b2 = await bar(); ok(b2.x > x0 + 150 && b2.cur === curBefore && b2.s === b0.s, `Ziehen scrollt ${Math.round(b2.x - x0)} px (mit Schwung), keine Auswahl ausgelöst`);
// Pfeile
await page.locator('.bb-arr.l').click(); await page.waitForTimeout(600);
const b3 = await bar(); ok(b3.x < b2.x, `Pfeil links: ${Math.round(b2.x)} → ${Math.round(b3.x)}`);
await page.evaluate(() => __ui.bar.sc.jump(0)); await page.waitForTimeout(100);
await page.locator('.bb-arr.r').click(); await page.waitForTimeout(600);
ok((await bar()).x > 200, `Pfeil rechts: 0 → ${Math.round((await bar()).x)}`);
ok(await page.evaluate(() => document.querySelector('.bb-wrap').classList.contains('l')), 'Verlauf links, sobald gescrollt');
// Freischaltung: Reiter pulsiert, Karte „Neu“
await page.evaluate(() => { const nu = __game.nextUnlock(); if (nu) { __game.S.score = nu.at - 1; __demo.force('wiese'); __demo.autoPlace(1); } }); await page.waitForTimeout(250);
ok(await page.locator('.bb-tab.pulse').count() > 0 && await page.locator('.bb .tc.new').count() > 0, 'Freischaltung: Reiter pulsiert, Karte „Neu“');
await shot(page, '10e-freischaltung-leiste');
await page.waitForTimeout(600);
for (let i = 0; i < 4; i++) { const b = page.locator('.ucard .btn', { hasText: 'Prima!' }).first(); if (await b.count()) { await b.click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(400); } }

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
await page.evaluate(() => { __game.S.stack = __game.S.stack.slice(0, 1); __game.S.pick = 0; __game.emit('stack'); __demo.autoPlace(1);
  if (__game.S.stack.length) { __game.S.stack = []; __game.emit('stack'); __game.emit('end', {}); } });   // Bonus-Kacheln (Meilenstein) würden das Ende verschieben
await page.waitForTimeout(400);
ok(await page.locator('.bb-none').isVisible() && await page.locator('.bb-cur').isHidden(), 'leerer Vorrat: Bauleiste zeigt „Auswertung“');
await page.waitForTimeout(2200);
ok(await page.locator('.modal h2', { hasText: 'fertig' }).isVisible(), 'Endbildschirm'); await shot(page, '23-ende');
await clickText(page, '.modal .btn', 'Endlos'); await page.waitForTimeout(300);
ok(await page.evaluate(() => __game.S.mode === 'endlos' && __game.S.stack.length > 0), 'Endlos weiterbauen');

console.log('Kreativ');
await page.keyboard.press('Escape'); await page.waitForTimeout(300); await clickText(page, '.mmenu .btn', 'Neue Insel'); await page.waitForTimeout(300);
await clickText(page, '.mode', 'Kreativ'); await clickText(page, '.modal .btn', 'Insel erschaffen'); await page.waitForTimeout(400);
await page.locator('.dlg .btn', { hasText: 'Überschreiben' }).click({ timeout: 1000 }).catch(() => {}); await page.waitForTimeout(500);
if (await page.locator('.bb-tab[data-cat=land]').getAttribute('aria-expanded') !== 'true') { await page.locator('.bb-tab[data-cat=land]').click(); await page.waitForTimeout(500); }
await page.locator('.bb .tc[data-kind=muehle]').click(); await page.waitForTimeout(200);
ok(await page.evaluate(() => __game.current().k === 'muehle'), 'Kreativ: Klick wählt Kachel');
ok(await page.locator('.bb .tc[data-kind=muehle] .n').textContent() === '∞' && await page.locator('.bb .tc.lock, .bb .tc.zero').count() === 0 && await page.locator('.bb-cur .cn').textContent() === '∞', 'Kreativ: alles frei, Badge ∞');
await page.evaluate(() => __demo.autoPlace(1)); await page.waitForTimeout(200);
ok(await page.evaluate(() => __game.current().k === 'muehle'), 'Kreativ: Auswahl bleibt nach dem Setzen'); await shot(page, '24-kreativ');
await ctx.close();

// ================= Handy =================
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'de-DE' });
const mp = await m.newPage(); watch(mp, 'handy');
await mp.goto(URL0); await ready(mp); await shot(mp, 'm1-start');
await clickText(mp, '.mmenu .btn', 'Neue Insel'); await mp.waitForTimeout(300); await shot(mp, 'm2-neue-insel');
await clickText(mp, '.modal .btn', 'Insel erschaffen'); await mp.waitForTimeout(600); await shot(mp, 'm3-hud');
await mp.evaluate(() => { __ui.notify('camRotate'); __ui.notify('zoom'); }); await mp.waitForTimeout(900);
await mp.evaluate(() => { for (let i = 0; i < 6; i++) { __demo.force('wald'); __demo.autoPlace(1); } }); await mp.waitForTimeout(1000); await shot(mp, 'm4-spiel');
// Handy: Reiterzeile scrollt, Kategorie per Tippen auf, Karten scrollen
ok(await mp.evaluate(() => { const t = document.querySelector('.bb-tabs'); return t.scrollWidth > t.clientWidth && getComputedStyle(t).overflowX === 'auto'; }), 'Handy: Reiterzeile scrollbar');
await mp.locator('.bb-tab[data-cat=land]').tap(); await mp.waitForTimeout(600);
ok(await mp.evaluate(() => __ui.openCats.has('land')), 'Handy: Tippen klappt Landwirtschaft auf');
await mp.evaluate(() => { for (const c of __ui.cats) if (!__ui.openCats.has(c.id)) __ui._toggleCat(c.id, { open: true }); }); await mp.waitForTimeout(700);
ok(await mp.evaluate(() => { const t = document.querySelector('.bb-track'); return getComputedStyle(t).touchAction.includes('pan-x') && t.scrollWidth > t.clientWidth * 3; }), 'Handy: Karten wischbar (pan-x)');
await mp.evaluate(() => __ui.bar.sc.jump(400)); await mp.waitForTimeout(150); await shot(mp, 'm4b-leiste');
const bbBox = await mp.locator('.bb').boundingBox();
ok(bbBox.x >= 0 && bbBox.x + bbBox.width <= 390 && bbBox.y + bbBox.height <= 844 && bbBox.height < 200, `Handy: Leiste ${Math.round(bbBox.width)}×${Math.round(bbBox.height)} im Bild`);
await mp.evaluate(() => { __game.S.score = __game.nextUnlock().at - 2; __demo.force('wiese'); __demo.autoPlace(1); }); await mp.waitForTimeout(700); await shot(mp, 'm5-freischaltung');
await mp.locator('.hud .btn[aria-label=Handbuch]').tap(); await mp.waitForTimeout(400); await mp.locator('.book .foot .btn', { hasText: 'Weiter' }).tap(); await mp.waitForTimeout(200); await shot(mp, 'm6-handbuch');
await mp.locator('.book .x .btn').tap(); await mp.waitForTimeout(300);
await mp.locator('.hud .btn[aria-label=Menü]').tap(); await mp.waitForTimeout(300); await clickText(mp, '.mmenu .btn', 'Meine Inseln'); await mp.waitForTimeout(400); await shot(mp, 'm7-inseln');
await mp.locator('.modal .x .btn').tap(); await mp.waitForTimeout(300); await clickText(mp, '.mmenu .btn', 'Einstellungen'); await mp.waitForTimeout(300); await shot(mp, 'm8-einstellungen');
await mp.locator('.modal .x .btn').tap(); await mp.waitForTimeout(300); await clickText(mp, '.mmenu .btn', 'Weiterspielen'); await mp.waitForTimeout(300);
await mp.locator('.hud .btn[aria-label=Fotomodus]').tap(); await mp.waitForTimeout(300); await shot(mp, 'm9-foto');
// keine waagrechte Überbreite
const wide = await mp.evaluate(() => [...document.querySelectorAll('#ui *')].filter(e => { const r = e.getBoundingClientRect(); return !(r.width === 0 || (r.left > -2 && r.right < innerWidth + 2) || getComputedStyle(e).visibility === 'hidden' || e.closest('.bb-track,.bb-tabs,.filters,.fx,nav')); }).map(e => e.className || e.tagName).slice(0, 8));
ok(!wide.length, 'nichts ragt über den Rand (Handy) ' + wide.join(' | '));
await m.close();

// ================= Englisch =================
// Sichtbarer Text (#ui innerText + title/aria-label) ohne deutsche Reste. Ausnahmen: Inselname, Sprachknopf „Deutsch“.
const DE_WORDS = /[äöüßÄÖÜ]|\b(Kacheln?|Insel\w*|Punkte?|und|oder|mit|der|die|das|eine?|nicht|Wald|Wiese|Bach|Weg|Haus|Dorf|Felder?|Vorrat|Aufgaben?|Spiel\w*|Handbuch|Einstellungen|Menü|zurück|Neu|Tag|Sprache|Strg|Kategorie|Bauleiste|Gruppe|freigeschaltet|Schritt|Seite|Weiter)\b/;
const german = pg => pg.evaluate(re => {
  re = new RegExp(re.slice(1, re.lastIndexOf('/')));
  const ui = document.getElementById('ui'), bad = [], ok = s => /^(🇩🇪 Deutsch|Deutsch|🇩🇪 DE)$/.test(s.trim());
  const visible = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  for (const line of ui.innerText.split('\n')) { const m = line.match(re); if (m && !ok(line)) bad.push(`${line.trim().slice(0, 80)} [${m[0]}]`); }
  for (const e of ui.querySelectorAll('[title],[aria-label]')) { if (!visible(e)) continue; for (const a of ['title', 'aria-label']) { const v = e.getAttribute(a); const m = v && v.match(re); if (m && !ok(v)) bad.push(`@${a}: ${v.slice(0, 80)} [${m[0]}]`); } }
  return [...new Set(bad)];
}, DE_WORDS.toString());
const noGerman = async (pg, where) => { const b = await german(pg); ok(!b.length, `EN ${where}: keine deutschen Reste${b.length ? ' → ' + b.slice(0, 6).join(' | ') : ''}`); };
const e = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true, locale: 'en-US' });
const ep = await e.newPage(); watch(ep, 'english');
console.log('Englisch');
await ep.goto(URL0); await ready(ep);
ok(await ep.evaluate(() => document.documentElement.lang === 'en' && document.title === 'Cloudhaven'), 'Browser en-US → Englisch, <html lang=en>');
ok(await ep.locator('.title .sub').textContent() === 'A little village above the clouds', 'Untertitel englisch');
await noGerman(ep, 'Startmenü'); await shot(ep, 'e1-start-en');
// Umschalter im Startmenü: Deutsch und zurück
await ep.locator('.langs [data-lang=de]').click(); await ep.waitForTimeout(300);
ok(await ep.evaluate(() => document.documentElement.lang === 'de') && await ep.locator('.mmenu .btn[data-act=new]').textContent().then(x => x.includes('Neue Insel')) && await ep.locator('.title .sub').textContent() === 'Ein kleines Dorf über den Wolken', 'Startmenü: 🇩🇪 schaltet sofort auf Deutsch');
await shot(ep, 'e0-start-de');
await ep.locator('.langs [data-lang=en]').click(); await ep.waitForTimeout(300);
ok(await ep.locator('.mmenu .btn[data-act=new]').textContent().then(x => x.includes('New Island')), 'Startmenü: 🇬🇧 zurück auf Englisch');
await ep.locator('.mmenu .btn[data-act=new]').click(); await ep.waitForTimeout(400);
ok(await ep.evaluate(() => { const v = document.querySelector('.modal input[type=text]').value; return ['Cloudgrove', 'Mossy Cove', 'Sunrock', 'Cloverleaf', 'Skymeadow', 'Featherfield', 'Lindenrest', 'Mistbrook', 'Firhill', 'Honeyvale', 'Appleglen', 'Starmeadow'].includes(v); }), 'englischer Inselname vorgeschlagen');
await noGerman(ep, 'Neue Insel'); await shot(ep, 'e2-neue-insel-en');
await ep.locator('.modal input[type=text]').fill('Testisle');
await ep.locator('.modal .btn[data-act=create]').click(); await ep.waitForTimeout(700);
await noGerman(ep, 'HUD + Anleitung'); await shot(ep, 'e3-hud-en');
// spielen: Vorschau, Popups, Meilenstein, Freischaltung, Aufgabe
await ep.evaluate(() => { __ui.notify('camRotate'); __ui.notify('zoom', { distance: 20 }); }); await ep.waitForTimeout(900);
await ep.evaluate(() => __demo.autoPlace(1)); await ep.waitForTimeout(500);
await ep.evaluate(() => __demo.hoverBest()); await ep.waitForTimeout(300); await noGerman(ep, 'Vorschau'); await shot(ep, 'e4-vorschau-en');
await ep.evaluate(() => { for (let i = 0; i < 6; i++) { __demo.force('wald'); __demo.autoPlace(1); } }); await ep.waitForTimeout(700);
await noGerman(ep, 'Popups + Meilenstein'); await shot(ep, 'e5-meilenstein-en');
await ep.evaluate(() => { __game.S.score = __game.nextUnlock().at - 2; __demo.force('wiese'); __demo.autoPlace(1); __demo.force('wald', 3); __demo.autoPlace(1); __demo.force('wald', 2); }); await ep.waitForTimeout(900);
await noGerman(ep, 'Freischaltung + Aufgabe'); await shot(ep, 'e6-freischaltung-en');
// ungültiger Zug: Grund auf Englisch
await ep.evaluate(() => { const g = __game; __demo.force('bach'); for (const [q, r] of g.slots()) for (let o = 0; o < 6; o++) { const ev = g.evaluate('bach', q, r, o); if (!ev.ok && ev.why) { __ui.notify('hover', { q, r, ev }); return; } } }); await ep.waitForTimeout(200);
ok(await ep.locator('.hover .why').count() === 0 || /stream|lake/i.test(await ep.locator('.hover .why').first().textContent()), 'Grund für ungültigen Zug englisch');
await noGerman(ep, 'ungültiger Zug');
// Zahlen 1,000 statt 1.000
await ep.evaluate(() => { __game.S.score = 12345; __ui.shown = 12345; }); await ep.waitForTimeout(300);
ok(await ep.locator('.score .num').textContent() === '12,345', 'Zahlenformat englisch: ' + await ep.locator('.score .num').textContent());
// Bauleiste ganz offen
await ep.evaluate(() => { __ui.hideInfo(); document.querySelector('.toasts').textContent = ''; for (const c of __ui.cats) if (!__ui.openCats.has(c.id)) __ui._toggleCat(c.id, { open: true }); }); await ep.waitForTimeout(800);
await noGerman(ep, 'Bauleiste (alle Kategorien)'); await shot(ep, 'e7-bauleiste-en');
ok(await ep.locator('.bb-tab[data-cat=land] .tn').textContent() === 'Farming' && await ep.locator('.tc[data-kind=haus] .nm').textContent() === 'Timber House', 'Kategorien und Kachel-Namen englisch');
// Handbuch: alle Seiten
await ep.evaluate(() => { for (const c of [...__ui.openCats]) __ui._toggleCat(c, { open: false }); document.querySelector('.ucard')?.remove(); });
await ep.keyboard.press('b'); await ep.waitForTimeout(400);
const nPages = await ep.evaluate(() => __ui._pages().length); let bookBad = [];
for (let i = 0; i < nPages; i++) { bookBad.push(...(await german(ep)).map(x => `S.${i + 1}: ${x}`)); if (i === 1) await shot(ep, 'e8-handbuch-kacheln-en'); if (i === nPages - 3) await shot(ep, 'e9-handbuch-aufgaben-en'); await ep.keyboard.press('ArrowRight'); await ep.waitForTimeout(120); }
ok(!bookBad.length, `EN Handbuch (${nPages} Seiten): keine deutschen Reste${bookBad.length ? ' → ' + bookBad.slice(0, 6).join(' | ') : ''}`);
await ep.keyboard.press('Escape'); await ep.waitForTimeout(300);
// Menü, Einstellungen, Meine Inseln
await ep.keyboard.press('Escape'); await ep.waitForTimeout(400); await noGerman(ep, 'Menü im Spiel');
await ep.locator('.mmenu .btn[data-act=settings]').click(); await ep.waitForTimeout(300); await noGerman(ep, 'Einstellungen'); await shot(ep, 'e10-einstellungen-en');
await ep.locator('.modal .btn[data-act=done]').click(); await ep.waitForTimeout(300);
await ep.locator('.mmenu .btn[data-act=islands]').click(); await ep.waitForTimeout(400); await noGerman(ep, 'Meine Inseln');
await ep.locator('.slot.cur .btn[data-act=copy]').click(); await ep.waitForTimeout(300);
ok(await ep.locator('.slot b', { hasText: 'Testisle (copy)' }).count() === 1, 'Kopie heißt „(copy)“');
await ep.locator('.slot').nth(1).locator('.btn[data-act=delete]').click(); await ep.waitForTimeout(300); await noGerman(ep, 'Löschen-Rückfrage');
await ep.locator('.dlg .btn.danger').click(); await ep.waitForTimeout(300);
await ep.locator('.modal input[type=file]').setInputFiles({ name: 'broken.insel.json', mimeType: 'application/json', buffer: Buffer.from('{nix') }); await ep.waitForTimeout(300);
ok(/valid island file/.test(await ep.locator('.toast.err').last().textContent()), 'Import-Fehler englisch: ' + await ep.locator('.toast.err').last().textContent());
await ep.keyboard.press('Escape'); await ep.waitForTimeout(300);
// Fotomodus und Ende
await ep.locator('.mmenu .btn[data-act=continue]').click(); await ep.waitForTimeout(400);
await ep.keyboard.press('p'); await ep.waitForTimeout(400); await noGerman(ep, 'Fotomodus'); await ep.keyboard.press('Escape'); await ep.waitForTimeout(300);
await ep.evaluate(() => { __game.S.stack = []; __game.emit('stack'); __ui._end(); }); await ep.waitForTimeout(500);
await noGerman(ep, 'Endbildschirm'); await shot(ep, 'e11-ende-en');
ok(/Cloudhaven/.test(await ep.locator('.modal p').first().textContent()), 'Endbildschirm nennt Cloudhaven');
await ep.locator('.modal .btn[data-act=endless]').click(); await ep.waitForTimeout(300);
// Einstellungen: auf Deutsch → sofort deutsch, nach Neuladen weiter deutsch
await ep.keyboard.press('Escape'); await ep.waitForTimeout(300); await ep.locator('.mmenu .btn[data-act=settings]').click(); await ep.waitForTimeout(300);
await ep.locator('.modal .seg [data-lang=de]').click(); await ep.waitForTimeout(300);
ok(await ep.locator('.modal h2').first().textContent() === 'Einstellungen' && await ep.locator('.mmenu .btn[data-act=settings]').textContent().then(x => x.includes('Einstellungen')), 'Einstellungen: Deutsch sofort (Dialog und Menü dahinter)');
await ep.reload(); await ready(ep);
ok(await ep.evaluate(() => document.documentElement.lang === 'de') && await ep.locator('.mmenu .btn[data-act=continue]').textContent().then(x => x.includes('Weiterspielen')), 'Deutsch bleibt nach Neuladen (trotz Browser en-US)');
await ep.locator('.mmenu .btn[data-act=continue]').click(); await ep.waitForTimeout(400);
ok(await ep.locator('.tc[data-kind=haus] .nm').textContent() === 'Fachwerkhaus' && await ep.locator('.score .lbl span').first().textContent() === 'Punkte', 'Spiel nach Neuladen deutsch');
await ep.keyboard.press('Escape'); await ep.waitForTimeout(300);
await ep.locator('.langs [data-lang=en]').click(); await ep.waitForTimeout(300); await ep.reload(); await ready(ep);
ok(await ep.evaluate(() => document.documentElement.lang === 'en'), 'Englisch bleibt nach Neuladen');
await e.close();
// Handy englisch
const em = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-GB' });
const emp = await em.newPage(); watch(emp, 'handy-en');
await emp.goto(URL0); await ready(emp); await noGerman(emp, 'Handy Startmenü'); await shot(emp, 'e12-handy-start-en');
await emp.locator('.mmenu .btn[data-act=new]').tap(); await emp.waitForTimeout(300); await emp.locator('.modal .btn[data-act=create]').tap(); await emp.waitForTimeout(600);
await emp.evaluate(() => { for (let i = 0; i < 6; i++) { __demo.force('wald'); __demo.autoPlace(1); } }); await emp.waitForTimeout(1000);
await noGerman(emp, 'Handy Spiel'); await shot(emp, 'e13-handy-en');
await emp.locator('.hud .btn[data-act=book]').tap(); await emp.waitForTimeout(400); await emp.locator('.book .foot .btn[data-act=next]').tap(); await emp.waitForTimeout(200); await shot(emp, 'e14-handy-handbuch-en');
const wideEn = await emp.evaluate(() => [...document.querySelectorAll('#ui *')].filter(e => { const r = e.getBoundingClientRect(); return !(r.width === 0 || (r.left > -2 && r.right < innerWidth + 2) || getComputedStyle(e).visibility === 'hidden' || e.closest('.bb-track,.bb-tabs,.filters,.fx,nav')); }).map(e => e.className || e.tagName).slice(0, 8));
ok(!wideEn.length, 'Handy EN: nichts ragt über den Rand ' + wideEn.join(' | '));
await em.close();

await browser.close(); srv.close();
console.log(fails ? `UI FEHLER: ${fails}` : 'UI OK');
process.exit(fails ? 1 : 0);
