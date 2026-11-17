// 3D-Durchgang von Red String (Playwright, echte Klicks ins Engine-iframe): Fall 1 in jeder Sprache aus languages.json.
// Startmenü → Fall → Akte → Tatort (Engine im Live-Modus) → jede Spur von ihrem Standpunkt aus per Mausklick ins Bild finden
// (Behälter: Klick auf den Behälter), Ziel ≥ 44 px, Spurentafeln erscheinen, Sprachwechsel zeichnet den Zettel im Bild neu,
// Neuladen behält den Stand, Nachstellung (seek) zeigt ein anderes Bild. Konsole ohne Fehler.
//   bash krimi/build.sh && node krimi/tools/play.mjs [ausgabeordner] [--soft]   (--soft = Software-Rendering statt GPU)
// Letzte Zeile: PLAY OK
import http from 'http'; import fs from 'fs'; import path from 'path'; import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2), SOFT = args.includes('--soft'); const out = path.resolve(args.find(a => !a.startsWith('--')) || 'work/krimi-play'); fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => {
  let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); if (q.method === 'HEAD') return r.end(); fs.createReadStream(f).pipe(r);
}).listen(0);
const BASE = `http://localhost:${srv.address().port}`;
const C = JSON.parse(fs.readFileSync(path.join(ROOT, 'cases/c01-kuchen/case.json'), 'utf8'));
if (!fs.existsSync(path.join(ROOT, 'cases/c01-kuchen/world.html'))) { console.log('✗ cases/c01-kuchen/world.html fehlt – erst bash krimi/build.sh'); process.exit(1); }
const LANGS = JSON.parse(fs.readFileSync(path.join(ROOT, 'js/lang/languages.json'), 'utf8')).languages.filter(l => !l.draft).map(l => l.code);

let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; return c; };
const W = (p, ms) => p.waitForTimeout(ms);
const browser = await chromium.launch({ args: SOFT ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=metal'] });
const objOf = id => C.objects.find(o => o.id === id);
// order: a clue after the clues it needs
const clues = []; { const left = [...C.clues]; while (left.length) { const i = left.findIndex(k => (k.needs || []).every(n => clues.some(c => c.id === n))); clues.push(...left.splice(i < 0 ? 0 : i, 1)); } }

async function frameOf(p) { const h = await p.waitForSelector('iframe', { timeout: 30000 }); return h; }
const live = (p, js) => p.evaluate(`(()=>{ const L = window.__krimi.app.stage.live; return (${js}); })()`);
async function shotRegion(p, name, clip) { const f = path.join(out, name + '.png'); await p.screenshot({ path: f, clip }); return fs.readFileSync(f); }
function diff(a, b) { if (!a || !b || a.length !== b.length) return 1; let d = 0; for (let i = 0; i < a.length; i += 97) if (a[i] !== b[i]) d++; return d / (a.length / 97); }

for (const code of LANGS) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: code === 'de' ? 'de-DE' : 'en-US' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|favicon/.test(m.text())) errs.push(m.text()); });
  p.on('dialog', d => { errs.push('native dialog'); d.dismiss(); });
  const t0 = Date.now(); await p.goto(BASE + '/index.html'); await p.waitForFunction(() => window.__krimi?.ready === true, null, { timeout: 30000 });
  await p.click(`.lang[data-lang=${code}]`); await W(p, 250);
  await p.click('[data-act=new]'); await W(p, 300); await p.locator('[data-case]').first().click();
  await p.waitForSelector('.dossier', { timeout: 15000 }); await p.click('[data-act=investigate]');
  await p.waitForFunction(() => window.__krimi.app.stage.mode === 'world' && window.__krimi.app.stage.live, null, { timeout: 120000 });
  ok(true, `[${code}] 3D-Welt geladen in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  await W(p, 2500); const fr = await (await frameOf(p)).boundingBox();
  await p.screenshot({ path: path.join(out, `${code}-01-tatort.png`) });
  // every clue by a real click from its standpoint
  for (const k of clues) {
    const target = k.find === 'open' && k.opens ? k.opens : k.obj, view = objOf(k.obj)?.view ?? objOf(target)?.view;
    await p.evaluate(v => window.__krimi.app.stage.inspect(null), null); await W(p, 1100);
    await p.evaluate(v => window.__krimi.app.stage.goto(v), view); await W(p, 1500);
    const r = await live(p, `L.screen(${JSON.stringify(target)})`);
    if (!ok(r && r.onScreen, `[${code}] ${k.id}: ${target} von ${view} aus im Bild`)) continue;
    ok(r.w >= 44 && r.h >= 44, `[${code}] ${k.id}: Ziel ${Math.round(r.w)} × ${Math.round(r.h)} px (≥ 44)`);
    const hit = await live(p, `(L.pick(${r.cx}, ${r.cy}) || {}).id`);
    ok(hit === target, `[${code}] ${k.id}: Klickpunkt trifft ${hit}`);
    await p.mouse.click(fr.x + r.cx, fr.y + r.cy); await W(p, 1800);
    const found = await p.evaluate(id => window.__krimi.app.s.found.includes(id), k.id);
    ok(found, `[${code}] ${k.id} gefunden (Klick ins 3D)`);
    await p.screenshot({ path: path.join(out, `${code}-clue-${k.id}.png`) });
  }
  await p.evaluate(() => window.__krimi.app.stage.inspect(null)); await W(p, 1200);
  await p.evaluate(() => window.__krimi.app.stage.goto('v_back')); await W(p, 1600);
  await p.screenshot({ path: path.join(out, `${code}-02-tafeln.png`) });
  // language switch redraws the note in the picture
  await p.evaluate(() => window.__krimi.app.stage.inspect('fridge_paper')); await W(p, 1600);
  const nr = await live(p, `L.screen('fridge_paper')`), fb = await (await frameOf(p)).boundingBox();   // only the note itself (the header changes with the language too)
  const clip = nr ? { x: fb.x + nr.x, y: fb.y + nr.y, width: Math.max(8, nr.w), height: Math.max(8, nr.h) } : undefined;
  const a = await shotRegion(p, `${code}-03-zettel`, clip); const other = LANGS.find(l => l !== code);
  if (other) { await p.selectOption('#langSel', other); await W(p, 1500); const b = await shotRegion(p, `${code}-03-zettel-${other}`, clip); ok(diff(a, b) > 0.002, `[${code}] Sprachwechsel → ${other}: Zettel im Bild neu gezeichnet`); await p.selectOption('#langSel', code); await W(p, 800); }
  // reload keeps the state, world comes back with it
  const n0 = await p.evaluate(() => window.__krimi.app.s.found.length);
  await p.reload(); await p.waitForFunction(() => window.__krimi?.ready === true, null, { timeout: 30000 }); await W(p, 800);
  if (await p.locator('[data-act=resume]').count()) await p.click('[data-act=resume]');
  if (await p.locator('[data-act=investigate]').count()) await p.click('[data-act=investigate]');
  if (await p.locator('.tab[data-tab=scene]').count()) await p.click('.tab[data-tab=scene]');
  await p.waitForFunction(() => window.__krimi.app.stage?.mode === 'world' && window.__krimi.app.stage.live, null, { timeout: 120000 }).catch(() => {});
  ok(await p.evaluate(() => window.__krimi.app.s?.found.length) === n0, `[${code}] Neuladen: ${n0} Spuren bleiben`);
  // reconstruction: another picture at t = 15 than at the end
  await W(p, 1500); const e1 = await shotRegion(p, `${code}-04-ende`);
  await live(p, 'L.seek(15)'); await W(p, 900); const e2 = await shotRegion(p, `${code}-04-t15`); await live(p, 'L.seek(L.dur)'); await W(p, 300);
  ok(diff(e1, e2) > 0.01, `[${code}] Nachstellung: t = 15 sieht anders aus als der Tatort`);
  ok(!errs.length, `[${code}] Konsole ohne Fehler${errs.length ? ': ' + errs.slice(0, 4).join(' | ') : ''}`);
  await ctx.close();
}
await browser.close(); srv.close();
console.log(fails ? `PLAY FAIL (${fails})` : 'PLAY OK'); process.exit(fails ? 1 : 0);
