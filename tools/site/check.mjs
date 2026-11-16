#!/usr/bin/env node
// Prüft die gebaute Spielhalle (_site/) im headless Chromium: eine Karte pro Spiel, jeder Link/jedes Cover lädt,
// keine Seitenfehler, Handy ohne seitliches Scrollen, hell/dunkel, „Weiterspielen“ bei vorhandenem Spielstand.
//   node tools/site/build.mjs && node tools/site/check.mjs [bilderordner]   → HUB OK
import fs from 'fs';
import path from 'path';
import http from 'http';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const SITE = path.join(ROOT, '_site');
const out = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (out) fs.mkdirSync(out, { recursive: true });
if (!fs.existsSync(path.join(SITE, 'games.json'))) { console.error('✗ _site/ fehlt – erst node tools/site/build.mjs'); process.exit(1); }
const { games } = JSON.parse(fs.readFileSync(path.join(SITE, 'games.json'), 'utf8'));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => {
  let p = path.join(SITE, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!p.startsWith(SITE) || !fs.existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r);
}).listen(0);
const base = `http://localhost:${srv.address().port}/`;
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
const browser = await chromium.launch();

for (const [name, vp, scheme] of [['desktop-dunkel', { width: 1280, height: 900 }, 'dark'], ['desktop-hell', { width: 1280, height: 900 }, 'light'], ['handy', { width: 375, height: 780 }, 'dark']]) {
  const page = await browser.newPage({ viewport: vp, colorScheme: scheme });
  page.on('pageerror', e => { console.log('  PAGE ERROR ' + e.message); fails++; });
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) { console.log('  console error: ' + m.text()); fails++; } });
  await page.goto(base); await page.waitForTimeout(800);
  const cards = await page.locator('.grid .card').count();
  ok(cards === games.length, `${name}: ${cards} Karten für ${games.length} Spiele`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok(overflow <= 0, `${name}: kein seitliches Scrollen (${overflow}px)`);
  const broken = await page.evaluate(() => [...document.images].filter(i => i.complete && !i.naturalWidth).map(i => i.src));
  ok(!broken.length, `${name}: alle Bilder laden ${broken.join(' ')}`);
  if (out) { await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true }); console.log('  📷 ' + path.join(out, name + '.png')); }
  await page.close();
}

// Links und Cover jedes Spiels
for (const g of games) {
  const r = await fetch(base + g.path); ok(r.ok, `${g.title}: ${g.path} → ${r.status}`);
  if (g.cover) { const c = await fetch(base + g.cover); ok(c.ok, `${g.title}: Cover ${g.cover} → ${c.status}`); }
}

// Spielstand → „Weiterspielen“, Klick merkt „zuletzt gespielt“ und hebt das Spiel hervor
const withSave = games.find(g => g.save && g.status !== 'bald');
if (withSave) {
  const page = await browser.newPage();
  await page.goto(base);
  await page.evaluate(([k, id]) => { localStorage.setItem(k + 'test', '{}'); localStorage.setItem('hub.last.' + id, Date.now()); }, [withSave.save, withSave.id]);
  await page.reload(); await page.waitForTimeout(400);
  const txt = await page.locator(`.grid .play[data-id="${withSave.id}"]`).innerText();
  ok(/Weiterspielen/.test(txt), `${withSave.title}: Knopf „Weiterspielen“ bei Spielstand`);
  ok(await page.locator('.hero h2').innerText() === withSave.title, `${withSave.title}: als „Weiter, wo du warst“ oben`);
  await page.close();
}
await browser.close(); srv.close();
if (fails) { console.log(`HUB FEHLER (${fails})`); process.exit(1); }
console.log('HUB OK');
