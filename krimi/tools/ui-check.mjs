// Oberflächen-Test von Red String im headless Chromium (Playwright), ohne 3D über die Ersatzansicht von stage.js:
// Startmenü (Browsersprache vorausgewählt) → Deutsch → Fall 1 → Akte → alle Spuren anklicken → alle Themen fragen → Vorhalten
// → Fäden per echter Mausbewegung ziehen (auch drei Karten über den Knoten) → mittendrin Englisch (kein roher Schlüssel sichtbar)
// → Neuladen (Stand bleibt) → Anklage erst falsch, dann richtig → Auflösung → Nachstellung. Dazu: alle Ziele ≥ 44 px,
// kein horizontales Scrollen (Handy 390 und 360 px), Konsole ohne Fehler, Screenshots de/en auf Desktop und Handy.
//   node krimi/tools/ui-check.mjs [ausgabeordner] [--overlay <ordner>]   (overlay: Dateien, die in krimi/ fehlen, von dort)
// Letzte Zeile: UI OK
import http from 'http'; import fs from 'fs'; import path from 'path'; import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const oi = args.indexOf('--overlay'); const OVER = oi >= 0 ? path.resolve(args.splice(oi, 2)[1]) : null;
const out = path.resolve(args[0] || 'work/krimi-ui'); fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const resolve = u => { for (const base of [ROOT, OVER].filter(Boolean)) { let f = path.join(base, u); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); if (fs.existsSync(f)) return f; } return null; };
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]); const f = resolve(u);
  if (!f || !f.startsWith(ROOT) && !(OVER && f.startsWith(OVER))) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  if (q.method === 'HEAD') return r.end();
  fs.createReadStream(f).pipe(r);
}).listen(0);
const URL0 = `http://localhost:${srv.address().port}/index.html?world=0`;   // stand-in view (the 3D world has its own test: play.mjs)
if (OVER) for (const f of ['js/logic.js', 'js/case.js', 'cases/index.json']) if (!fs.existsSync(path.join(ROOT, f))) console.log(`  ⚠ ${f} fehlt in krimi/ – Attrappe aus ${OVER}`);

let fails = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; return c; };
const browser = await chromium.launch();
const shots = [];

function watch(page, tag) {
  page.on('console', m => {
    const tx = m.text(), url = m.location()?.url || '';
    if (m.type() === 'error') { if (/fonts\.g|favicon/.test(tx + url) || /world\.html/.test(url)) return; console.log(`  [${tag}] console error: ${tx} ${url}`); fails++; }
    if (m.type() === 'warning' && /\[i18n\]/.test(tx)) { console.log(`  [${tag}] ${tx}`); fails++; }
  });
  page.on('pageerror', e => { console.log(`  [${tag}] PAGE ERROR: ${e.message}\n${(e.stack || '').split('\n').slice(1, 4).join('\n')}`); fails++; });
  page.on('dialog', d => { console.log(`  [${tag}] native dialog!`); fails++; d.dismiss(); });
}
const W = (p, ms = 250) => p.waitForTimeout(ms);
async function shot(p, name) { const f = path.join(out, name + '.png'); await p.screenshot({ path: f }); shots.push(f); }
const ready = p => p.waitForFunction(() => window.__krimi?.ready === true, null, { timeout: 30000 });
const S = p => p.evaluate(() => { const { app } = window.__krimi; return app.s ? JSON.parse(JSON.stringify({ s: app.s, tab: app.user.ui.tab, person: app.user.ui.person, pos: app.user.board.pos })) : null; });
async function closeModals(p) { for (let i = 0; i < 5 && await p.locator('#layer .modal').count(); i++) { await p.keyboard.press('Escape'); await W(p, 120); } }

// Kein roher Schlüssel sichtbar
const RAW = /\b(ui|clue|stmt|person|topic|fact|meta|place|view|lab|hint|accuse|solution|obj|insight)\.[a-z0-9_]+(\.[a-z0-9_]+)*\b/i;
async function noRaw(p, where) {
  const txt = await p.evaluate(() => {
    const parts = [document.body.innerText];
    for (const e of document.querySelectorAll('[title],[aria-label],[placeholder]')) { const r = e.getBoundingClientRect(); if (r.width || r.height) parts.push(e.getAttribute('title') || '', e.getAttribute('aria-label') || '', e.getAttribute('placeholder') || ''); }
    return parts.join('\n');
  });
  const m = txt.match(RAW);
  return ok(!m, `${where}: kein roher Schlüssel sichtbar${m ? ' – gefunden: ' + m[0] : ''}`);
}
// Ziele ≥ 44 px, kein Überlauf nach rechts
async function targets(p, where) {
  const bad = await p.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return null; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return null; return r; };
    const out = [];
    for (const e of document.querySelectorAll('button, a[href], select, input:not([type=hidden]):not(.sr), [role=button], [role=tab], [role=radio], .pin, label.btn')) {
      if (e.closest('[hidden]') || e.disabled) continue;
      if (e.matches('select') && e.closest('label.ib')) continue;     // Sprachwahl: das Etikett drumherum ist das Ziel
      const r = vis(e); if (!r) continue;
      if (r.width < 43.5 || r.height < 43.5) out.push(`${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]} ${Math.round(r.width)}×${Math.round(r.height)} „${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 24)}“`);
    }
    return out.slice(0, 8);
  });
  return ok(!bad.length, `${where}: alle Ziele ≥ 44 px${bad.length ? ' – zu klein: ' + bad.join(' | ') : ''}`);
}
async function noHScroll(p, where) {
  const r = await p.evaluate(() => {
    const W = innerWidth, doc = document.documentElement.scrollWidth;
    const over = [];
    for (const e of document.querySelectorAll('body *')) {
      const b = e.getBoundingClientRect(); if (!b.width || b.right <= W + 1) continue;
      let q = e.parentElement, inner = false;
      while (q && q !== document.body) { const cs = getComputedStyle(q); if (/(auto|scroll|hidden)/.test(cs.overflowX) && q.getBoundingClientRect().right <= W + 1) { inner = true; break; } q = q.parentElement; }
      if (!inner && getComputedStyle(e).position !== 'fixed') over.push(`${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]} → ${Math.round(b.right)}`);
    }
    return { doc, W, over: over.slice(0, 5) };
  });
  return ok(r.doc <= r.W + 1 && !r.over.length, `${where}: kein horizontales Scrollen (${r.doc}/${r.W})${r.over.length ? ' – ' + r.over.join(' | ') : ''}`);
}
const lang = (p, code) => p.selectOption('#langSel', code).then(() => W(p, 350));

// ---------- Spielzüge über die Oberfläche ----------
async function scenePass(p) {
  await p.click('.tab[data-tab=scene]'); await W(p, 150);
  let found = 0;
  const places = await p.locator('.fb-nav [data-place]').evaluateAll(es => es.map(e => e.dataset.place));
  for (const pl of places.length ? places : [null]) {
    if (pl) { await p.click(`.fb-nav [data-place="${pl}"]`); await W(p, 120); }
    const views = await p.locator('.fb-nav [data-view]').evaluateAll(es => es.map(e => e.dataset.view));
    for (const v of views) {
      await p.click(`.fb-nav [data-view="${v}"]`); await W(p, 120);
      for (let guard = 0; guard < 12; guard++) {
        const objs = await p.locator('.obj:not(.found):not(.locked)').evaluateAll(es => es.map(e => e.dataset.obj));
        let any = false;
        for (const o of objs) {
          const n0 = (await S(p)).s.found.length;
          await p.click(`.obj[data-obj="${o}"]`); await W(p, 200);
          const n1 = (await S(p)).s.found.length;
          if (n1 > n0) { found += n1 - n0; any = true; if (!shots.some(f => f.includes('lupe'))) await shot(p, '03-lupe-de'); }
          await closeModals(p);
        }
        if (!any) break;
      }
    }
  }
  return found;
}
async function talkPass(p) {
  await p.click('.tab[data-tab=talk]'); await W(p, 150);
  let n = 0;
  const people = await p.locator('.pbtn').evaluateAll(es => es.map(e => e.dataset.person));
  for (const who of people) {
    await p.click(`.pbtn[data-person="${who}"]`); await W(p, 150);
    for (let guard = 0; guard < 12; guard++) {
      const tp = await p.locator('.topic.fresh').first();
      if (!await tp.count()) break;
      await tp.click(); n++; await W(p, 180);
    }
  }
  return n;
}
async function presentAll(p) {
  const list = await p.evaluate(() => { const { app } = window.__krimi; const ids = new Set(app.cards().map(c => c.id));
    return (app.c.contradictions || []).map(k => ({ ...k, card: [k.card, ...(k.cards || [])].find(x => x && ids.has(x)) }))
      .filter(k => k.card && app.s.heard.includes(k.statement) && !app.s.heard.includes(k.follow)).map(k => ({ ...k, person: app.c.statements.find(s => s.id === k.statement)?.person })); });
  let n = 0;
  for (const k of list) {
    await p.click('.tab[data-tab=talk]'); await W(p, 120);
    await p.click(`.pbtn[data-person="${k.person}"]`); await W(p, 150);
    await p.click(`[data-act=present][data-stmt="${k.statement}"]`); await W(p, 200);
    await p.click('.pickfilter [data-filter=all]'); await W(p, 80);
    await p.click(`.picker [data-card="${k.card}"]`); await W(p, 300);
    if (await p.locator(`.say.follow[data-stmt="${k.follow}"]`).count()) n++;
  }
  return { n, of: list.length };
}
// Faden per Maus: Nadel von a anfassen, bis b ziehen (scrollt am Rand mit, falls b außer Sicht ist)
async function dragThread(p, a, b, toKnot = null) {
  const pa = p.locator(`.card[data-card="${a}"] .pin`); await pa.scrollIntoViewIfNeeded(); await W(p, 80);
  const box = await pa.boundingBox(); if (!box) return false;
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down();
  await p.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2 + 10, { steps: 3 });
  const sc = await p.locator('.cork-scroll').boundingBox();
  const target = async () => {
    if (toKnot != null) { const k = p.locator(`svg.strings circle[data-knot="${toKnot}"]`); return (await k.count()) ? k.boundingBox() : null; }
    return p.locator(`.card[data-card="${b}"]`).boundingBox();
  };
  let tb = await target();
  for (let i = 0; i < 120 && tb && (tb.y + tb.height / 2 < sc.y + 60 || tb.y + tb.height / 2 > sc.y + sc.height - 60); i++) {
    const down = tb.y > sc.y + sc.height / 2;
    await p.mouse.move(sc.x + sc.width / 2, down ? sc.y + sc.height - 12 : sc.y + 12, { steps: 2 }); await W(p, 60);
    tb = await target();
  }
  if (!tb) { await p.mouse.up(); return false; }
  let tx = tb.x + tb.width / 2, ty = toKnot != null ? tb.y + tb.height / 2 : tb.y + Math.min(tb.height / 2, 60);
  if (toKnot == null) {          // sichtbaren Punkt der Zielkarte suchen (nicht von einer anderen Karte verdeckt)
    const pt = await p.evaluate(({ id, r }) => { for (let gy = .5; gy < 1; gy += .15) for (const fy of [gy, 1 - gy]) for (const fx of [.5, .3, .7, .15, .85]) {
      const x = r.x + r.width * fx, y = r.y + r.height * fy; const top = document.elementsFromPoint(x, y).map(e => e.closest?.('.card')).find(Boolean);
      if (top && top.dataset.card === id) return [x, y]; } return null; }, { id: b, r: tb });
    if (pt) [tx, ty] = pt;
  }
  await p.mouse.move(tx, ty, { steps: 14 }); await W(p, 60);
  await p.mouse.up(); await W(p, 250);
  return true;
}
async function deducePass(p) {
  await p.click('.tab[data-tab=board]'); await W(p, 200);
  let made = 0;
  for (let guard = 0; guard < 20; guard++) {
    const d = await p.evaluate(() => { const { app } = window.__krimi; const ids = new Set(app.cards().map(c => c.id));
      return (app.c.deductions || []).find(d => !app.s.insights.includes(d.gives ?? d.id) && d.from.every(f => ids.has(f))) || null; });
    if (!d) break;
    await p.click(`.spool[data-kind="${d.kind || 'red'}"]`); await W(p, 100);
    const i0 = (await S(p)).s.insights.length;
    if (d.from.length === 2) await dragThread(p, d.from[0], d.from[1]);
    else {
      await dragThread(p, d.from[0], d.from[1]);
      const knot = await p.evaluate(() => (window.__krimi.app.s.threads.length - 1));
      await dragThread(p, d.from[2], null, knot);
    }
    const i1 = (await S(p)).s.insights.length;
    if (!ok(i1 > i0, `Faden ${d.kind} ${d.from.join(' + ')} rastet ein → Erkenntnis ${d.gives}`)) break;
    made++;
    if (made === 1) { await W(p, 700); await shot(p, '06-erkenntnis-de'); }
  }
  return made;
}

// ===================================================================================== Desktop
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'de-DE' });
const page = await ctx.newPage(); watch(page, 'desktop');
const t0 = Date.now();
await page.goto(URL0); await ready(page);
ok(true, `Start bis Menü: ${Date.now() - t0} ms`);
ok(await page.locator('.lang[data-lang=de][aria-checked=true]').count() === 1, 'Browsersprache Deutsch vorausgewählt');
const names = await page.locator('.lang').evaluateAll(es => es.map(e => e.textContent.trim()));
ok(names.includes('Deutsch') && names.includes('English') && !names.some(n => /[\u{1F1E6}-\u{1F1FF}]/u.test(n)), `Sprachliste ohne Flaggen, jede in ihrem Namen: ${names.join(', ')}`);
await page.click('.lang[data-lang=en]'); await W(page, 250);
ok(await page.locator('.mtitle').count() && /Settings/.test(await page.innerText('#menu')), 'Menü wechselt sofort auf Englisch');
await shot(page, '01-menu-en');
await page.click('.lang[data-lang=de]'); await W(page, 250);
ok(/Einstellungen/.test(await page.innerText('#menu')), 'zurück auf Deutsch');
ok(await page.evaluate(() => localStorage.getItem('krimi.settings.lang')) === 'de', 'Sprache gespeichert unter krimi.settings.lang');
await shot(page, '01-menu-de'); await noRaw(page, 'Menü'); await targets(page, 'Menü');

await page.click('[data-act=new]'); await W(page, 300);
const caseBtn = page.locator('[data-case]').first(); ok(await caseBtn.count() > 0, 'Fallauswahl zeigt Fälle');
const caseId = await caseBtn.getAttribute('data-case');
await caseBtn.click();
await page.waitForSelector('.dossier', { timeout: 15000 }); await W(page, 400);
ok(true, `Fall ${caseId} geladen, Akte offen`);
ok(await page.evaluate(() => window.__krimi.app.stage.mode) === 'fallback', 'ohne world.html: Ersatzansicht');
await shot(page, '02-akte-de'); await noRaw(page, 'Akte'); await targets(page, 'Akte');
await page.click('[data-act=investigate]'); await W(page, 300);
await shot(page, '03-tatort-de'); await targets(page, 'Tatort');

// Tatort und Gespräche abwechselnd, bis nichts Neues mehr kommt
let f1 = await scenePass(page);
ok(f1 > 0, `Spuren per Klick gefunden: ${f1}`);
// mittendrin Englisch
await lang(page, 'en');
ok(/Scene|Board/.test(await page.innerText('.tabs')), 'Tabs sofort auf Englisch');
await noRaw(page, 'Tatort (en)'); await shot(page, '03-tatort-en');
await lang(page, 'de');
let q1 = await talkPass(page);
ok(q1 > 0, `Themen gefragt: ${q1}`);
await shot(page, '04-gespraech-de');
await lang(page, 'en'); await noRaw(page, 'Gespräch (en)'); await shot(page, '04-gespraech-en'); await targets(page, 'Gespräch'); await lang(page, 'de');
for (let r = 0; r < 6; r++) {
  const pr = await presentAll(page);
  if (pr.of) ok(pr.n === pr.of, `Vorhalten: ${pr.n}/${pr.of} Widersprüche aufgedeckt`);
  const a = await scenePass(page), b = await talkPass(page);
  if (!a && !b && !pr.of) break;
}
const prog = await page.evaluate(() => window.__krimi.app.progress());
ok(prog.clues[0] > 0, `Spuren ${prog.clues[0]}/${prog.clues[1]}`);

// Pinnwand: erst ein lockerer Faden (zwei Personen), dann alle Schlüsse
await page.click('.tab[data-tab=board]'); await W(page, 300);
await shot(page, '05-pinnwand-de'); await targets(page, 'Pinnwand');
{
  const pair = await page.evaluate(() => { const { app } = window.__krimi; const cs = app.cards(); const ded = new Set((app.c.deductions || []).map(d => [...d.from].sort().join('|')));
    for (const a of cs) for (const b of cs) if (a.id < b.id && !ded.has([a.id, b.id].sort().join('|'))) return [a.id, b.id]; return null; });
  if (pair) {
    const n0 = (await S(page)).s.threads.length;
    await page.click('.spool[data-kind=green]'); await dragThread(page, pair[0], pair[1]);
    const st = await S(page);
    ok(st.s.threads.length === n0 + 1 && st.s.insights.length === 0 || st.s.threads.length === n0 + 1, 'lockerer Faden gespeichert');
    ok(await page.locator('svg.strings path.th.loose').count() > 0, 'lockerer Faden hängt durch');
    const tx = await page.locator('#toasts').innerText();
    ok(tx.includes(await page.evaluate(() => window.__krimi.I.t('ui.board.loose'))) && !tx.includes(await page.evaluate(() => window.__krimi.I.t('ui.board.bad'))), 'Meldung: Faden hängt locker');
  }
}
// Karte per Maus verschieben → Position im Spielstand
{
  const id = await page.evaluate(() => window.__krimi.app.cards()[0]?.id);
  const card = page.locator(`.card[data-card="${id}"] .face`); await card.scrollIntoViewIfNeeded();
  const b = await card.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height - 10); await page.mouse.down(); await page.mouse.move(b.x + b.width / 2 + 60, b.y + b.height - 10 + 25, { steps: 8 }); await page.mouse.up(); await W(page, 200);
  const pos = (await S(page)).pos[id];
  ok(Array.isArray(pos), `Karte verschoben, Position gespeichert: ${JSON.stringify(pos)}`);
  await closeModals(page);
}
const made = await deducePass(page);
const insights = await page.evaluate(() => window.__krimi.app.progress().insights);
ok(made > 0 && insights[0] === insights[1], `Erkenntnisse per Faden: ${insights[0]}/${insights[1]}`);
ok(await page.locator('svg.strings path.th.taut').count() > 0, 'eingerastete Fäden straff');
await shot(page, '07-pinnwand-fertig-de');
await lang(page, 'en'); await noRaw(page, 'Pinnwand (en)'); await shot(page, '07-pinnwand-fertig-en'); await lang(page, 'de');
// Details per langem Druck
{
  const id = await page.evaluate(() => window.__krimi.app.cards().find(c => c.kind === 'clue')?.id);
  const card = page.locator(`.card[data-card="${id}"] .face`); await card.scrollIntoViewIfNeeded(); const b = await card.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await W(page, 700); await page.mouse.up(); await W(page, 200);
  ok(await page.locator('#layer .cdetail').count() === 1, 'langes Drücken zeigt Details');
  await shot(page, '08-details-de'); await closeModals(page);
}
// Notizbuch (N) und Hinweis
await page.keyboard.press('n'); await W(page, 250);
ok(await page.locator('.nb').count() === 1, 'N öffnet das Notizbuch');
await page.click('[data-nbtab=statements]'); await W(page, 100);
await shot(page, '09-notizbuch-de'); await noRaw(page, 'Notizbuch'); await targets(page, 'Notizbuch');
await page.click('[data-nbtab=hints]'); await page.click('[data-act=get-hint]'); await W(page, 250);
ok(await page.locator('.nb .nb-list li').count() > 0, 'Hinweis erscheint im Notizbuch');
await lang(page, 'en'); ok(/Notebook/.test(await page.innerText('.nb')), 'Notizbuch wechselt sofort auf Englisch'); await noRaw(page, 'Notizbuch (en)'); await lang(page, 'de');
await closeModals(page);
await page.keyboard.press('Tab'); await W(page, 150);
const tabNow = (await S(page)).tab;
ok(tabNow !== 'board', `Tab schaltet von der Pinnwand zurück (${tabNow})`);
await page.keyboard.press('Tab'); await W(page, 150);
ok((await S(page)).tab === 'board', 'Tab öffnet die Pinnwand');

// Neuladen: Stand und Ansicht bleiben
const before = await S(page);
await page.waitForTimeout(400);
const saveMid = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('krimi.')).map(k => [k, localStorage.getItem(k)])));
await page.reload(); await ready(page); await W(page, 400);
const after = await S(page);
ok(after && JSON.stringify(after.s) === JSON.stringify(before.s), 'nach dem Neuladen: gleicher Spielstand');
ok(after && after.tab === before.tab && JSON.stringify(after.pos) === JSON.stringify(before.pos), `nach dem Neuladen: gleiche Ansicht (${after?.tab}) und Kartenpositionen`);
ok(await page.locator('.lang[aria-checked=true]').count() === 0 && await page.evaluate(() => document.documentElement.lang) === 'de', 'nach dem Neuladen: Deutsch');

// Anklage: erst falsch, dann richtig
await page.click('.tab[data-tab=accuse]'); await W(page, 200);
await shot(page, '10-anklage-de'); await targets(page, 'Anklage');
const plan = await page.evaluate(() => {
  const { app, L } = window.__krimi; const c = app.c, s = app.s, cards = app.cards().map(k => k.id), who = c.solution.who;
  const P = ['how', 'when', 'why'], pick = { how: cards[0], when: cards[0], why: cards[0] };
  for (const p of P) for (const id of cards) { const r = L.apply(c, s, { type: 'accuse', who, ...pick, [p]: id }).result; if (r.ok || (r.reject && P.indexOf(r.reject) > P.indexOf(p))) { pick[p] = id; break; } }
  const wrongWho = (c.people || []).filter(p => p.suspect && !who.includes(p.id)).map(p => p.id)[0];
  const wrongHow = cards.find(id => { const r = L.apply(c, s, { type: 'accuse', who, ...pick, how: id }).result; return r.reject === 'how'; });
  return { who, pick, wrongWho, wrongHow, ok: L.apply(c, s, { type: 'accuse', who, ...pick }).result.ok };
});
ok(plan.ok, `Lösung über die Logik gefunden: ${plan.who.join('+')} · ${plan.pick.how} · ${plan.pick.when} · ${plan.pick.why}`);
const fillPillar = async (p, id) => { await page.click(`[data-act=slot][data-pillar=${p}]`); await W(page, 150); await page.click('.pickfilter [data-filter=all]'); await W(page, 80); await page.click(`.picker [data-card="${id}"]`); await W(page, 150); };
const setWho = async ids => { for (const b of await page.locator('.sus').all()) { const id = await b.getAttribute('data-suspect'); const on = await b.getAttribute('aria-pressed') === 'true'; if (on !== ids.includes(id)) { await b.click(); await W(page, 80); } } };
for (const p of ['how', 'when', 'why']) await fillPillar(p, plan.pick[p]);
if (plan.wrongWho) {
  await setWho([plan.wrongWho]); await page.click('[data-act=accuse]'); await W(page, 300);
  const st = await S(page);
  ok(!st.s.solved && st.s.accusations.length === 1, 'falscher Täter wird abgelehnt (kein Verlieren)');
  ok((await page.innerText('.dda q')).length > 3, `Staatsanwältin: „${(await page.innerText('.dda q')).slice(0, 60)}“`);
  await shot(page, '11-abgelehnt-de');
}
await setWho(plan.who);
if (plan.wrongHow) {
  await fillPillar('how', plan.wrongHow); await page.click('[data-act=accuse]'); await W(page, 300);
  ok(await page.locator('.pillar.bad[data-pillar=how]').count() === 1, 'abgelehnte Säule „Wie“ wird markiert');
  await fillPillar('how', plan.pick.how);
}
await page.click('[data-act=accuse]'); await W(page, 900);
ok((await S(page)).s.solved === true, 'richtige Anklage löst den Fall');
ok(await page.locator('.stamp').count() > 0, 'Stempel GELÖST');
await W(page, 600); await shot(page, '12-geloest-de'); await noRaw(page, 'Auflösung'); await targets(page, 'Auflösung');
await lang(page, 'en'); ok(/SOLVED/.test(await page.innerText('#layer')), 'Auflösung wechselt sofort auf Englisch'); await shot(page, '12-geloest-en'); await noRaw(page, 'Auflösung (en)'); await lang(page, 'de');
await page.click('[data-act=replay]'); await W(page, 500);
ok(await page.locator('.replay').count() === 1, 'Nachstellung startet');
await page.keyboard.press('Space'); await W(page, 100);
ok(await page.evaluate(() => !window.__krimi.app.stage.playing), 'Leertaste pausiert');
const tA = await page.evaluate(() => window.__krimi.app.stage.time);
await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await W(page, 100);
ok(await page.evaluate(() => window.__krimi.app.stage.time) > tA, '→ spult vor');
await page.keyboard.press('Space'); await W(page, 1200);
await shot(page, '13-nachstellung-de'); await targets(page, 'Nachstellung');
await page.keyboard.press('Escape'); await W(page, 200);
ok(await page.locator('.replay').count() === 0, 'Nachstellung schließt');
await closeModals(page);
const saveEnd = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('krimi.')).map(k => [k, localStorage.getItem(k)])));
// Neuladen nach dem Lösen
await page.reload(); await ready(page); await W(page, 300);
ok((await S(page))?.s.solved === true, 'gelöster Fall bleibt nach dem Neuladen gelöst');
await ctx.close();

// Englische Browsersprache → Englisch vorausgewählt; unbekannte (fr) → Englisch
for (const loc of ['en-US', 'fr-FR']) {
  const c2 = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: loc }); const p2 = await c2.newPage(); watch(p2, loc);
  await p2.goto(URL0); await ready(p2);
  ok(await p2.locator('.lang[data-lang=en][aria-checked=true]').count() === 1, `Browsersprache ${loc} → English vorausgewählt`);
  await c2.close();
}

// ===================================================================================== Handy
async function phone(width, height, tag, store, doShots) {
  const c = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'de-DE' });
  const p = await c.newPage(); watch(p, tag);
  await p.goto(URL0); await ready(p);
  await noHScroll(p, `${tag} Menü`); await targets(p, `${tag} Menü`);
  if (doShots) await shot(p, `20-${tag}-menu-de`);
  await p.evaluate(st => { localStorage.clear(); for (const [k, v] of Object.entries(st)) localStorage.setItem(k, v); }, store);
  await p.reload(); await ready(p); await W(p, 400);
  ok(await p.evaluate(() => !!window.__krimi.app.c), `${tag}: Spielstand vom Desktop lädt`);
  for (const code of ['de', 'en']) {
    await p.evaluate(cd => window.__krimi.I.setLang(cd), code); await W(p, 300);
    for (const tab of ['scene', 'talk', 'board', 'accuse']) {
      await p.click(`.tab[data-tab=${tab}]`); await W(p, 250);
      if (tab === 'talk') { const b = p.locator('.pbtn').first(); await b.click(); await W(p, 200); }
      await noHScroll(p, `${tag} ${tab} (${code})`);
      if (code === 'de') await targets(p, `${tag} ${tab}`);
      await noRaw(p, `${tag} ${tab} (${code})`);
      if (doShots) await shot(p, `2${['scene', 'talk', 'board', 'accuse'].indexOf(tab) + 1}-${tag}-${tab}-${code}`);
    }
    await p.click('[data-act=file]'); await W(p, 300); await noHScroll(p, `${tag} Akte (${code})`); if (doShots) await shot(p, `25-${tag}-akte-${code}`); await closeModals(p);
    await p.click('[data-act=notebook]'); await W(p, 300); await noHScroll(p, `${tag} Notizbuch (${code})`); if (doShots) await shot(p, `26-${tag}-notizbuch-${code}`); await closeModals(p);
  }
  // langes Tippen = Details (Touch)
  await p.click('.tab[data-tab=board]'); await W(p, 250);
  const card = p.locator('.card .face').first(); await card.scrollIntoViewIfNeeded(); const b = await card.boundingBox();
  const cdp = await c.newCDPSession(p);
  const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await tp('touchStart', b.x + b.width / 2, b.y + b.height / 2); await W(p, 750); await tp('touchEnd'); await W(p, 300);
  ok(await p.locator('#layer .cdetail').count() === 1, `${tag}: langes Tippen zeigt Details`);
  if (doShots) await shot(p, `27-${tag}-details-de`);
  await closeModals(p);
  await c.close();
}
await phone(390, 844, 'handy', saveMid, true);
await phone(360, 740, 'handy360', saveMid, false);
// gelöster Fall auf dem Handy
{
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'de-DE' });
  const p = await c.newPage(); watch(p, 'handy-gelöst');
  await p.goto(URL0); await ready(p);
  await p.evaluate(st => { localStorage.clear(); for (const [k, v] of Object.entries(st)) localStorage.setItem(k, v); }, saveEnd);
  await p.reload(); await ready(p); await W(p, 300);
  ok(await p.locator('#layer .solved').count() === 1, 'Handy: Auflösung nach dem Neuladen wieder offen');
  if (!await p.locator('#layer .solved').count()) { await p.click('.tab[data-tab=accuse]'); await W(p, 200); await p.click('[data-act=show-solved]'); }
  await W(p, 500);
  await noHScroll(p, 'Handy Auflösung'); await targets(p, 'Handy Auflösung'); await shot(p, '28-handy-geloest-de');
  await p.evaluate(() => window.__krimi.I.setLang('en')); await W(p, 300); await shot(p, '28-handy-geloest-en');
  await p.evaluate(() => window.__krimi.I.setLang('de')); await W(p, 300);
  await p.click('[data-act=replay]'); await W(p, 1500); await noHScroll(p, 'Handy Nachstellung'); await shot(p, '29-handy-nachstellung-de');
  await c.close();
}

await browser.close(); srv.close();
console.log(`  Screenshots (${shots.length}) in ${out}`);
console.log(fails ? `UI FAIL (${fails})` : 'UI OK');
process.exit(fails ? 1 : 0);
