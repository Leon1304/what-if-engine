// Smoke test for the game: serves game/, opens it in headless Chromium (?autostart), prints console errors and takes screenshots.
//   node game/tools/shots.mjs [outdir] [name=query …]      e.g.  node game/tools/shots.mjs work/game-shots start="" shop="at=26,-2,0,90&t=21&power=1"
// needs playwright (main checkout's node_modules)
import http from 'http'; import fs from 'fs'; import path from 'path'; import { chromium } from 'playwright';
const GAME = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.resolve(process.argv[2] || 'work/game-shots'); fs.mkdirSync(out, { recursive: true });
const views = process.argv.slice(3).map(a => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; });
if (!views.length) views.push(['start', '']);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.json': 'application/json', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const f = path.join(GAME, decodeURIComponent(q.url.split('?')[0])); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const port = srv.address().port;
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
let errors = 0;
for (const [name, query] of views) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') { console.log(`[${name}] ${m.type()}: ${m.text()}`); if (m.type() === 'error') errors++; } });
  page.on('pageerror', e => { console.log(`[${name}] PAGE ERROR: ${e.message}`); errors++; });
  const t0 = Date.now();
  await page.goto(`http://localhost:${port}/index.html?autostart=1&${query}`);
  await page.waitForFunction(() => window.__game, null, { timeout: 120000 }).catch(() => console.log(`[${name}] timeout`));
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => { const g = window.__game; if (!g) return null; const r = g.renderer.info.render;
    return { calls: r.calls, tris: r.triangles, pos: g.player.pos.toArray().map(v => +v.toFixed(2)), prompt: document.getElementById('prompt').textContent, quest: document.getElementById('quest').innerText.slice(0, 80) }; });
  console.log(`[${name}] ${Date.now() - t0} ms`, JSON.stringify(info));
  await page.screenshot({ path: path.join(out, name + '.png') });
  await page.close();
}
await browser.close(); srv.close();
console.log(errors ? `ERRORS: ${errors}` : 'no errors');
