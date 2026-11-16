// Screenshots und Messungen der Testinsel (tools/life-demo.html) mit headless Chromium.
//   node cloudhaven/tools/life-shots.mjs <ausgabeordner> name='night=1&cam=…' …
// Gibt je Bild Draw Calls, Bewohner-Zustände, Messwerte und Konsolenfehler aus.
import http from 'http'; import fs from 'fs'; import path from 'path'; import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.resolve(process.argv[2] || 'work/life'); fs.mkdirSync(out, { recursive: true });
const views = process.argv.slice(3).map(a => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const port = srv.address().port;
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
let errors = 0;
for (const [name, query] of views) {
  const page = await browser.newPage({ viewport: { width: +(process.env.W || 1100), height: +(process.env.H || 800) } });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') { console.log(`[${name}] ${m.type()}: ${m.text().slice(0, 600)}`); if (m.type() === 'error') errors++; } });
  page.on('pageerror', e => { console.log(`[${name}] PAGE ERROR: ${e.message}`); errors++; });
  await page.goto(`http://localhost:${port}/tools/life-demo.html?${query}`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 120000 }).catch(() => console.log(`[${name}] timeout`));
  if (process.env.WAIT) { await page.waitForTimeout(+process.env.WAIT); console.log(`[${name}] sound`, JSON.stringify(await page.evaluate(() => window.__sound || null))); }
  const info = await page.evaluate(() => window.__info);
  console.log(`[${name}]`, JSON.stringify(info));
  await page.screenshot({ path: path.join(out, name + '.png') });
  await page.close();
}
await browser.close(); srv.close();
console.log(errors ? `ERRORS: ${errors}` : 'no errors');
