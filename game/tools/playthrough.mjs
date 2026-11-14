// Automated playthrough: walks the whole tutorial + main quest by standing at a spot, looking at the object and pressing E
// (the same code path as a player: findTarget() → interact()). Fails on page errors or when a quest step does not advance.
//   node game/tools/playthrough.mjs
import http from 'http'; import fs from 'fs'; import path from 'path'; import { chromium } from 'playwright';
const GAME = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => { const p = path.join(GAME, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
let errors = 0; page.on('pageerror', e => { console.log('PAGE ERROR', e.message); errors++; });
page.on('console', m => { if (m.type() === 'error') { console.log('console error', m.text()); errors++; } });
await page.goto(`http://localhost:${srv.address().port}/index.html?autostart=1`);
await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
await page.evaluate(() => {
  const { game, player, THREE, B } = window.__game;
  window.T = {
    // stand at Blender (x, y) on the ground (or z), look at the interactive's centre (or a Blender point), press E
    at(x, y, z) { const p = B(x, y, 0); p.y = z !== undefined ? B(0, 0, z).y : window.__game.W.groundY(p.x, p.z, 3) + .02; player.setPose(p, player.yaw); game.update(.016, {}); },
    look(name) { const c = typeof name === 'string' ? game.posOf(name) : B(...name); const e = player.cam.position; player.yaw = Math.atan2(-(c.x - e.x), -(c.z - e.z));
      player.pitch = Math.atan2(c.y - e.y, Math.hypot(c.x - e.x, c.z - e.z)); player.sync(); player.cam.updateMatrixWorld(); },
    e() { const t = game.findTarget(); const v = game.verb(t); game.interact(t); return v; },
    tick(s) { for (let i = 0; i < s * 30; i++) { player.update(1 / 30, game); game.update(1 / 30, {}); } },
    use(id) { const i = game.S.inv.findIndex(s => s.id === id); if (i >= 0) game.useSlot(i); },
    q() { return game.S.quest; }, has: id => game.has(id), S: () => game.S,
  };
});
const steps = [
  ['Spawn: 5 m laufen', 'T.at(...(()=>{const s=window.__game.W.spots.spawn.pos; return [s.x, -s.z - 6];})()); T.tick(.2)', 1],
  ['Kofferraum', 'const s=window.__game.game.posOf("Auto_Kofferraum"); T.at(s.x - 1.6, -s.z - 1.2); T.look("Auto_Kofferraum"); r=T.e(); T.tick(1.5)', 2],
  ['Rucksack + Lampe', 'const s=window.__game.game.posOf("Rucksack"); T.at(s.x - 1.2, -s.z - 1.6); T.look("Rucksack"); r=T.e(); T.look("Taschenlampe"); r+=" | "+T.e(); T.tick(.2)', 3],
  ['Tankstelle erreicht', 'T.at(4, -14); T.tick(.2)', 4],
  ['Schiebetür klemmt', 'T.at(19.5, -1.5); T.look("Schiebetuer_S"); r=T.e(); T.tick(.2)', 4],
  ['Hintertür abgeschlossen', 'T.at(38.6, -4.5); T.look("Hintertuer"); r=T.e(); T.tick(.2)', 4],
  ['Blumenkübel → Schlüssel', 'T.at(38.6, -5.6); T.look("Blumenkuebel"); r=T.e(); T.tick(.2)', 4],
  ['Hintertür auf + rein', 'T.at(38.6, -4.5); T.look("Hintertuer"); r=T.e(); T.tick(1.5); T.at(35.5, -4.5, .25); T.tick(.3)', 5],
  ['Chips + Kühlschrank + Wasser', 'T.at(25.3, -5.4, .25); T.look("Chips_1"); r=T.e(); T.at(30.9, -5.1, .25); T.look("Kuehlschranktuer_1"); r+=" | "+T.e(); T.tick(1.5); T.at(31.3, -5.6, .25); T.look("Wasser_1"); r+=" | "+T.e(); T.use("chips"); T.use("wasser"); T.tick(.2)', 6],
  ['Personaltür + Sicherung', 'T.at(32.0, 6.0, .25); T.look("Tuer_Personal"); r=T.e(); T.tick(1.5); T.at(34.4, 5.0, .25); T.look("Sicherungskasten"); r+=" | "+T.e(); T.tick(.2)', 7],
  ['Lagertür + Kanister', 'T.at(35.0, 4.0, .25); T.look("Tuer_Lager"); r=T.e(); T.tick(1.5); T.at(35.0, 1.2, .25); T.look("Kanister"); r+=" | "+T.e(); T.tick(.2)', 8],
  ['Schuppen + Diesel', 'T.at(43.95, -14.3); T.look("Schuppen_Tuer"); r=T.e(); T.tick(1.5); T.at(44.0, -12.3, .12); T.look("Dieselfass"); r+=" | "+T.e(); T.tick(.2)', 9],
  ['Generator', 'T.at(38.6, -1.6); T.look("Generator"); r=T.e(); T.tick(.3)', 10],
  ['Funkgerät (leer)', 'T.at(35.1, 8.5, .25); T.look("Funkgeraet"); r=T.e(); T.tick(.2)', 11],
  ['Notizzettel', 'T.at(35.6, 8.5, .25); T.look("Notizzettel"); r=T.e(); document.getElementById("reader").classList.remove("show"); T.tick(.2)', 12],
  ['Hochsitz: Leiter + Batterie', 'const l=window.__game.W.ladders[0]; const b=l.u.bottom; T.at(b[0]-.6, b[1]); T.look("Hochsitz_Leiter"); r=T.e(); T.tick(3); T.look("Batterie_9V"); r+=" | "+T.e(); T.tick(.2)', 13],
  ['Runterklettern', 'r=T.e(); T.tick(3); r+=" y="+window.__game.player.pos.y.toFixed(2)', 13],
  ['Funkspruch', 'T.at(35.1, 8.5, .25); T.look("Funkgeraet"); r=T.e(); document.getElementById("reader").classList.remove("show"); T.tick(.2)', 14],
  ['Bis Sonnenaufgang', 'const S=T.S(); S.time = 6.4; S.day = 2; S.abs = 30.4; S.stats.hunger=S.stats.thirst=S.stats.warmth=90; T.tick(8)', 15],
];
let ok = true;
// real keyboard: walk, sprint, jump, crouch through the page's own key handlers and render loop
{
  const pos = () => page.evaluate(() => { const p = window.__game.player; return { x: p.pos.x, z: p.pos.z, y: p.pos.y, st: window.__game.game.S.stats.stamina, sp: p.sprint }; });
  await page.evaluate(() => { const s = window.__game.W.spots.spawn.pos; T.at(s.x, -s.z - 4); });
  const a = await pos(); const kb = page.keyboard;
  await kb.down('KeyW'); await page.waitForTimeout(600); await kb.down('ShiftLeft'); await page.waitForTimeout(400); const mid = await pos();
  await page.waitForTimeout(1200); await kb.press('Space'); await page.waitForTimeout(500); await kb.up('ShiftLeft');
  await kb.down('ControlLeft'); await page.waitForTimeout(600); await kb.up('ControlLeft'); await kb.up('KeyW'); await page.waitForTimeout(300);
  const b = await pos(), d = Math.hypot(b.x - a.x, b.z - a.z);
  const pass = d > 3 && mid.sp && b.st < a.st; ok &&= pass;
  console.log(`${pass ? '✓' : '✗'} Tastatur W/Shift/Leertaste/Strg: ${d.toFixed(1)} m gelaufen, sprint=${mid.sp}, Ausdauer ${a.st.toFixed(0)} → ${b.st.toFixed(0)}`);
}
for (const [name, code, want] of steps) {
  const res = await page.evaluate(c => { let r = ''; try { eval(c); } catch (e) { r = 'EXC ' + e.message; } const g = window.__game.game;
    return { r, q: g.S.quest, toasts: [...document.querySelectorAll('.toast')].slice(-2).map(t => t.textContent).join(' / ') }; }, code);
  const pass = res.q >= want; ok &&= pass;
  console.log(`${pass ? '✓' : '✗'} ${name}: quest ${res.q} (soll ≥ ${want}) – E: ${res.r} – ${res.toasts}`);
}
const won = await page.evaluate(() => document.getElementById('win').classList.contains('show'));
console.log(won ? '✓ Sieg-Bildschirm' : '✗ kein Sieg-Bildschirm'); ok &&= won;
await page.screenshot({ path: process.argv[2] || '/tmp/playthrough.png' });
await browser.close(); srv.close();
console.log(ok && !errors ? 'PLAYTHROUGH OK' : `PLAYTHROUGH FAILED (errors: ${errors})`); process.exit(ok && !errors ? 0 : 1);
