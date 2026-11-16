#!/usr/bin/env node
// Coverbilder für die Spielhalle: öffnet jedes Spiel im headless Chromium und speichert <ordner>/cover.jpg (1600 × 1000).
//   node tools/site/covers.mjs            → alle Spiele mit game.json, denen das Cover fehlt
//   node tools/site/covers.mjs insel game → nur diese (überschreibt)
// Optional in game.json: "coverShot": { "wait": 8000, "click": ["Text oder CSS", …], "eval": "JS vor dem Foto", "hash": "#…" }
import fs from 'fs';
import path from 'path';
import http from 'http';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const want = process.argv.slice(2);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
const srv = http.createServer((q, r) => {
  let p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r);
}).listen(0);
const base = `http://localhost:${srv.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
let made = 0;
for (const d of fs.readdirSync(ROOT)) {
  const mf = path.join(ROOT, d, 'game.json');
  if (!fs.existsSync(mf)) continue;
  const g = JSON.parse(fs.readFileSync(mf, 'utf8'));
  const file = path.join(ROOT, d, g.cover || 'cover.jpg');
  if (want.length ? !want.includes(d) : fs.existsSync(file)) continue;
  const o = g.coverShot || {};
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on('pageerror', e => console.log(`  ${d}: Seitenfehler ${e.message}`));
  await page.goto(`${base}/${d}/${g.entry || ''}${o.hash || ''}`);
  await page.waitForTimeout(o.wait ?? 8000);
  for (const c of o.click || []) {
    const loc = /^[.#\[]/.test(c) ? page.locator(c) : page.getByText(c, { exact: false });
    try { await loc.first().click({ timeout: 4000 }); await page.waitForTimeout(1500); } catch { console.log(`  ${d}: „${c}“ nicht gefunden`); }
  }
  if (o.eval) { await page.evaluate(o.eval); await page.waitForTimeout(o.after ?? 2500); }
  await page.screenshot({ path: file, type: 'jpeg', quality: 86 });
  console.log(`✓ ${path.relative(ROOT, file)}`); made++;
  await page.close();
}
await browser.close(); srv.close();
console.log(`COVERS OK – ${made} Bilder`);
