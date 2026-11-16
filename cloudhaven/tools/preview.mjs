// Screenshots aus tools/preview.html (headless Chromium, Playwright aus dem Repo).
//   node cloudhaven/tools/preview.mjs <ausgabeordner> name='m=../js/models/house.js&fn=house&a={"stage":2}&cam=10,6,10&look=0,2,0' …
// Gibt je Bild Dreiecke, Markierungen (spots), Teile und Konsolenfehler aus.
import http from 'http'; import fs from 'fs'; import path from 'path'; import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.resolve(process.argv[2] || 'work/cloudhaven-preview'); fs.mkdirSync(out, { recursive: true });
const views = process.argv.slice(3).map(a => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); const p = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const port = srv.address().port;
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
let errors = 0;
for (const [name, query] of views) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  page.on('console', m => { if (m.type() === 'error') { console.log(`[${name}] error: ${m.text()}`); errors++; } });
  page.on('pageerror', e => { console.log(`[${name}] PAGE ERROR: ${e.message}`); errors++; });
  await page.goto(query.startsWith("../tools/") ? `http://localhost:${port}/tools/${query.slice(9)}` : `http://localhost:${port}/tools/preview.html?${query}`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 60000 }).catch(() => console.log(`[${name}] timeout`));
  await page.waitForTimeout(300);
  const info = await page.evaluate(() => window.__info);
  console.log(`[${name}]`, JSON.stringify(info).slice(0, 600));
  await page.screenshot({ path: path.join(out, name + '.png') });
  await page.close();
}
await browser.close(); srv.close();
console.log(errors ? `ERRORS: ${errors}` : 'no errors');
