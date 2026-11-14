// Quick smoke test: load the game, collect page errors, run a few frames.   node game/tools/smoke.mjs
import http from 'http'; import fs from 'fs'; import path from 'path'; import { chromium } from 'playwright';
const GAME = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => { const p = path.join(GAME, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
let errors = 0; page.on('pageerror', e => { console.log('PAGE ERROR', e.message, e.stack?.split('\n')[1]); errors++; });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') { console.log('console', m.type(), m.text().slice(0, 300)); if (m.type() === 'error') errors++; } });
await page.goto(`http://localhost:${srv.address().port}/index.html?autostart=1&${process.argv[2] || ''}`);
await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
await page.waitForTimeout(1500);
console.log(await page.evaluate(() => { const { game, W } = window.__game; return JSON.stringify({ bp: Object.keys(W.bp).length, trees: W.trees.length, spin: W.spinners.length, inter: W.interactives.length, places: game.places.length }); }));
if (process.argv[3]) await page.screenshot({ path: process.argv[3] });
await browser.close(); srv.close();
console.log(errors ? `SMOKE: ${errors} errors` : 'SMOKE OK');
