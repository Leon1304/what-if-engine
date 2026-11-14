// Feature test (same code paths as the player): sacks, tree felling, building (cabin in 4 stages, door, fireplace), field (plant,
// water, grow, harvest), chest, weapons (pistol vs. wolf, butcher with the knife), difficulty "no enemies", waypoints + map,
// save slot → reload → everything back, loading an old (v1) save.          node game/tools/features.mjs [shots-dir]   → FEATURES OK
import http from 'http'; import fs from 'fs'; import path from 'path'; import { chromium } from 'playwright';
const GAME = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => { const p = path.join(GAME, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const SHOTS = process.argv[2]; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
let errors = 0; page.on('pageerror', e => { console.log('PAGE ERROR', e.message, (e.stack || '').split('\n').slice(1, 3).join(' | ')); errors++; });
page.on('console', m => { if (m.type() === 'error') { console.log('console error', m.text()); errors++; } });
const URL_ = `http://localhost:${srv.address().port}/index.html?autostart=1&t=12`;
await page.goto(URL_); await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
await page.evaluate(() => { localStorage.clear(); });
const helpers = () => {
  const { game, player, B, THREE, W } = window.__game;
  window.T = {
    at(x, y, z) { const p = B(x, y, 0); p.y = z !== undefined ? B(0, 0, z).y : W.groundY(p.x, p.z, 60) + .02; player.setPose(p, player.yaw); game.update(.016, {}); },
    lookP(p) { const e = player.cam.position; player.yaw = Math.atan2(-(p.x - e.x), -(p.z - e.z)); player.pitch = Math.atan2(p.y - e.y, Math.hypot(p.x - e.x, p.z - e.z)); player.sync(); player.cam.updateMatrixWorld(); },
    look(name) { T.lookP(game.posOf(name)); },
    e() { const t = game.findTarget(); const v = game.verb(t); game.interact(t); return v; },
    tick(s, keys = {}) { for (let i = 0; i < s * 30; i++) { player.update(1 / 30, game); game.update(1 / 30, keys); game.combat.update(1 / 30, 1, false); } },
    give(id, n = 1) { game.add(id, n, true); }, n: id => game.count(id), sel(id) { game.S.sel = game.S.inv.findIndex(s => s.id === id); },
  };
};
await page.evaluate(helpers);
const results = [];
const step = async (name, fn, check) => { const r = await page.evaluate(fn); const ok = check(r); results.push([ok, name, r]); console.log(`${ok ? '✓' : '✗'} ${name}: ${typeof r === 'string' ? r : JSON.stringify(r)}`); };
const shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, n + '.png') }); };

await step('Sack durchsuchen', () => { const { game } = window.__game; T.give('rucksack'); const s = game.byName.Sack_0; const c = s.center; T.at(c.x + 1.2, -c.z); T.lookP(c); const v = T.e();
  return { v, stein: T.n('stein'), wasser: T.n('wasser'), searched: !!s.state.searched, flat: s.node.scale.y < .5 }; }, r => r.stein >= 2 && r.searched && r.flat);

await step('Baum fällen + Stamm zerlegen', () => { const { game, W, THREE } = window.__game; T.give('axt');
  const t = W.trees.find(t => !t.fixed && t.kind === 'Fichte' && t.x > -80 && t.x < -40 && -t.z > 40 && -t.z < 100);
  const p = new THREE.Vector3(t.x + 1.5, 0, t.z); T.at(p.x, -p.z); T.lookP(new THREE.Vector3(t.x, window.__game.player.pos.y + 1.2, t.z));
  let v = ''; for (let i = 0; i < 6; i++) v = T.e(); const fell = game.build.falling.length; T.tick(4);
  const L = game.build.logs[0]; if (!L) return { fell, logs: 0 };
  const bb = new THREE.Box3().setFromObject(L.obj), c = bb.getCenter(new THREE.Vector3()).setY(bb.min.y + .28), side = new THREE.Vector3(Math.sin(L.rec.rot), 0, Math.cos(L.rec.rot)).multiplyScalar(1.7); T.at(c.x + side.x, -(c.z + side.z)); T.lookP(c);
  const lv = game.verb(game.findTarget()); for (let i = 0; i < 9; i++) T.e();
  return { v, fell, lv, stamm: T.n('stamm'), ast: T.n('ast'), logsLeft: game.build.logs.length, felled: Object.keys(game.S.felled).length }; }, r => r.fell === 1 && r.stamm === 3 && r.logsLeft === 0 && r.felled === 1);

await step('Blockhütte bauen (4 Abschnitte) + Tür + Kamin', () => { const { game, THREE, player } = window.__game;
  for (const [k, n] of [['stein', 30], ['stamm', 20], ['brett', 15], ['hammer', 1], ['feuerzeug', 1], ['holz', 3]]) T.give(k, n);
  T.at(-30, 200); player.yaw = 0; player.pitch = 0; player.sync(); game.build.start('huette'); game.build.updateGhost();
  const why = game.build.why; game.build.place(); const s = game.build.list[0]; if (!s) return { why };
  const c = new THREE.Vector3(s.x, s.y + .35, s.z + 1.6); T.at(s.x, -s.z - 3.6); T.lookP(c); const v = []; for (let i = 0; i < 3; i++) { v.push(game.verb(game.findTarget())); T.e(); }
  const door = !!s.door, fire = !!s.fire;
  // walk in through the door: open it, go inside, light the fireplace
  s.door.target = 1; T.tick(1.5);
  const dirIn = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), s.rot); const doorW = new THREE.Vector3(-.83, 0, 2.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), s.rot).add(new THREE.Vector3(s.x, 0, s.z));
  T.at(doorW.x, -doorW.z); const goal = new THREE.Vector3(-.6, 0, -.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), s.rot).add(new THREE.Vector3(s.x, 0, s.z));
  for (let i = 0; i < 120 && Math.hypot(goal.x - player.pos.x, goal.z - player.pos.z) > .3; i++) { player.yaw = Math.atan2(-(goal.x - player.pos.x), -(goal.z - player.pos.z)); player.keys = { KeyW: true }; player.update(1 / 30, game); game.update(1 / 30, {}); } player.keys = {};
  const inside = !!game.build.shelter(player.pos), dist = +s.fire.pos.distanceTo(player.cam.position).toFixed(2);
  T.lookP(s.fire.pos.clone().add(new THREE.Vector3(0, .3, 0))); const fv = game.verb(game.findTarget()); T.e();
  return { stage: s.stage, v, door, fire, inside, dist, fv, fireOn: s.fire.on }; }, r => r.stage === 4 && r.door && r.fire && r.inside && r.fireOn);

await step('Feld anlegen, pflanzen, gießen, wachsen, ernten', () => { const { game, player } = window.__game;
  T.give('spaten'); T.give('ast', 4); T.give('saat_kartoffel'); T.give('wasser');
  T.at(-30, 188); player.yaw = 0; player.pitch = -.5; player.sync(); game.build.start('feld'); game.build.updateGhost(); const why = game.build.why; game.build.place();
  const s = game.build.list.find(s => s.type === 'feld'); if (!s) return { why };
  const v1 = game.verb(game.findTarget()); T.e(); const v2 = game.verb(game.findTarget()); T.e();
  game.build.update(0, 3.0); const mid = Math.round(s.field.p * 100); game.build.update(0, 10);
  const v3 = game.verb(game.findTarget()); T.e();
  return { v1, v2, mid, v3, kartoffel: T.n('kartoffel'), saat: T.n('saat_kartoffel') }; }, r => r.kartoffel === 4 && r.saat === 1 && r.mid > 30 && r.mid < 100);

await step('Vorratskiste: einlagern + nehmen', () => { const { game, player } = window.__game;
  T.give('brett', 5); T.at(-24, 192); player.yaw = 0; player.pitch = -.4; player.sync(); game.build.start('kiste'); game.build.updateGhost(); game.build.place();
  const s = game.build.list.find(s => s.type === 'kiste'); if (!s) return { why: game.build.why }; game.build.chest = s;
  const i = game.S.inv.findIndex(x => x.id === 'stein'), before = T.n('stein'); game.build.chestMove(1, i); const inChest = s.inv[0]?.n; game.build.chestMove(-1, 0);
  return { before, inChest, after: T.n('stein') }; }, r => r.inChest === r.before && r.after === r.before);

await step('Pistole gegen Wolf + Zerlegen mit Messer', () => { const { game, player, THREE } = window.__game;
  for (const k of ['chips', 'kekse', 'stein', 'brett', 'stamm', 'ast']) game.S.inv = game.S.inv.filter(x => x.id !== k);
  T.give('pistole'); T.give('patronen_pistole'); T.give('messer'); T.sel('pistole'); game.S.time = 23; game.S.diff = 'mittel';
  T.at(10, 60); player.yaw = 0; player.pitch = 0; player.sync();
  const p = player.pos.clone().add(new THREE.Vector3(0, 0, -7)); p.y = window.__game.W.groundY(p.x, p.z, 60); const a = game.life.spawn('wolf', null, p); a.state = 'roam';
  game.combat.reload(); T.tick(2); let shots = 0;
  for (let i = 0; i < 12 && a.state !== 'dead'; i++) { a.pos.copy(p); a.speed = 0; T.lookP(a.pos.clone().add(new THREE.Vector3(0, .65, 0))); game.combat.cd = 0; if (game.combat.fire()) shots++; if (game.S.mag.pistole === 0) { game.combat.reload(); T.tick(2); } }
  const dead = a.state === 'dead'; T.at(-p.x === 0 ? p.x : p.x, -p.z + 1.4); T.lookP(a.pos.clone().add(new THREE.Vector3(0, .3, 0)));
  const v = game.verb(game.findTarget()); T.sel('messer'); T.e();
  return { shots, dead, v, fleisch: T.n('fleisch'), fell: T.n('fell'), mag: game.S.mag.pistole, ammo: game.S.ammo.pistole }; }, r => r.dead && r.fleisch === 2 && r.fell === 1);

await step('Schwierigkeit „Keine Feinde“: nachts keine Wölfe', () => { const { game } = window.__game;
  game.life.clear(); game.S.diff = 'aus'; game.S.time = 23.5; game.S.day = 3; T.at(-10, 70); T.tick(40);
  const hostile = game.life.animals.filter(a => a.kind !== 'deer').length; game.S.diff = 'schwer'; T.tick(60); const hard = game.life.animals.filter(a => a.kind === 'wolf').length; game.life.clear(); game.S.diff = 'mittel';
  return { hostile, hard }; }, r => r.hostile === 0 && r.hard > 0);

await step('Wegmarker + Karte', () => { const { game } = window.__game; T.give('karte'); game.S.found.dorf = 1;
  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyN' })); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyN' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyN' }));
  return { marks: game.S.marks.length, label: game.S.marks[0]?.label }; }, r => r.marks >= 1);

await step('Speichern Platz 1', () => { const { game } = window.__game; game.S.time = 12; return { ok: game.save('1'), info: game.slotInfo('1') }; }, r => r.ok);
const before = await page.evaluate(() => { const { game } = window.__game; return { n: game.build.list.length, felled: Object.keys(game.S.felled).length, inv: game.S.inv.length, stage: game.build.list[0]?.stage, crop: game.build.list.find(s => s.type === 'feld')?.field, marks: game.S.marks.length }; });
if (SHOTS) { await page.evaluate(() => { const { game, player } = window.__game; const s = game.build.list[0]; T.at(s.x + 7, -s.z - 6); T.lookP(new (window.__game.THREE.Vector3)(s.x, s.y + 1.5, s.z)); }); await page.waitForTimeout(400); await shot('huette'); }
await page.evaluate(() => sessionStorage.setItem('waldtank_load', '1'));
await page.goto(URL_); await page.waitForFunction(() => window.__game, null, { timeout: 120000 }); await page.waitForTimeout(800);
await page.evaluate(helpers);
await step('Laden Platz 1 (nach Neustart)', () => { const { game } = window.__game; return { n: game.build.list.length, felled: Object.keys(game.S.felled).length, inv: game.S.inv.length, stage: game.build.list[0]?.stage, crop: game.build.list.find(s => s.type === 'feld')?.field, marks: game.S.marks.length, door: !!game.build.list[0]?.door }; },
  r => r.n === before.n && r.felled === before.felled && r.inv === before.inv && r.stage === 4 && r.marks === before.marks && r.door);
await step('Alter Spielstand (v1) lädt', () => { const { game } = window.__game;
  const old = { S: { time: 20, day: 2, stats: { health: 80, hunger: 50, thirst: 50, warmth: 50 }, inv: [{ id: 'chips', n: 2 }, { id: 'gibtsnichtmehr', n: 1 }], sel: 0, battery: 50, genFuel: 3, quest: 6, flags: { bag: true }, found: { tanke: 1 } },
    its: { Kanister: { t: 0, s: { taken: 1 } }, AltesObjekt: { t: 1, s: {} } }, fires: [], pos: [25, 1.0, 0], yaw: 0 };
  localStorage.setItem('waldtank_save_v1', JSON.stringify(old)); localStorage.removeItem('waldtank_save_auto');
  const ok = game.load('auto'); return { ok, inv: game.S.inv.map(s => s.id).join(','), stamina: game.S.stats.stamina, diff: game.S.diff, kanister: game.byName.Kanister.node.visible, marks: game.S.marks.length }; },
  r => r.ok && r.inv === 'chips' && r.stamina === 100 && r.kanister === false);
if (SHOTS) {
  await page.evaluate(() => { const { game, player } = window.__game; T.give('gewehr'); T.sel('gewehr'); T.at(-60, 182); player.yaw = 1.2; player.pitch = .05; player.sync(); }); await page.waitForTimeout(500); await shot('dorf_gewehr');
  await page.evaluate(() => { const { game, player } = window.__game; T.give('stamm', 3); T.give('ast', 5); T.give('seil'); T.at(-28, 196); player.yaw = 0; player.pitch = -.25; player.sync(); game.build.start('unterstand'); }); await page.waitForTimeout(500); await shot('ghost');
  await page.evaluate(() => { const { game } = window.__game; game.build.cancel(); game.openPanel('map'); }); await page.waitForTimeout(300); await shot('karte');
}
await browser.close(); srv.close();
const bad = results.filter(r => !r[0]).length + errors;
console.log(bad ? `FEATURES FAILED (${bad})` : 'FEATURES OK'); process.exit(bad ? 1 : 0);
