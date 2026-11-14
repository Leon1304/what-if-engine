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
    give(id, n = 1) { game.add(id, n, true); }, clear(keep = []) { game.S.inv = game.S.inv.filter(x => keep.includes(x.id)); }, n: id => game.count(id), sel(id) { game.S.sel = game.S.inv.findIndex(s => s.id === id); },
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
  const c = L.obj.position.clone().add(new THREE.Vector3(0, .3, 0)), side = new THREE.Vector3(Math.sin(L.rec.rot), 0, Math.cos(L.rec.rot)).multiplyScalar(1.7); T.at(c.x + side.x, -(c.z + side.z)); T.lookP(c);
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

await step('Erfahrung + Level', () => { const { game } = window.__game; const l0 = game.progress.level; game.progress.add(500, 'Test'); return { l0, l1: game.progress.level, xp: game.S.xp }; }, r => r.l1 > r.l0);
await step('Hütte ausbauen (Anbau, Veranda, Werkstatt) + Möbel drinnen', () => { const { game, player, THREE } = window.__game; const B = game.build;
  game.S.xp = 3200; T.clear(['rucksack']); for (const [k, n] of [['stein', 30], ['stamm', 30], ['brett', 30], ['metall', 6], ['hammer', 1]]) T.give(k, n);
  const P = window.__game.B(-38, 214, 0); P.y = window.__game.W.groundY(P.x, P.z, 60); const s = B.make({ type: 'huette', x: P.x, y: P.y, z: P.z, rot: 0, stage: 4 });
  const verbs = [], whyX = []; for (let i = 0; i < 3; i++) { verbs.push(B.verb({ build: s })); const e = B.nextExt(s); whyX.push(B.check(B.extPos(s, e), s.rot, { id: 'ext', size: e.size, ext: 1 }, s, true)); B.interact({ build: s }); }
  const inside = B.room(new THREE.Vector3(s.x + 3.8, s.y + .5, s.z)), shop = B.room(new THREE.Vector3(s.x - 4.0, s.y + .3, s.z));
  const pt = new THREE.Vector3(s.x + .6, s.y + .5, s.z + .3), why = B.check(pt.clone(), 0, { id: 'tisch', size: [1.4, 1.8] }), fy = pt.y, whyF = B.check(pt.clone(), 0, { id: 'feld', size: [2.1, 2.1] });
  const wb = B.make({ type: 'werkbank', x: s.x - 4.3, y: s.y + .12, z: s.z, rot: Math.PI / 2 });
  T.at(-42.3, 214, s.y + .15); const bench = B.hasBench(player.pos);
  return { ext: s.ext, whyX, side: inside?.kind, shop: shop?.i, why, whyF, bench }; }, r => r.ext === 3 && r.side === 'in' && r.shop === 3 && r.why === '' && r.whyF && r.bench);
await step('Werkbank: Munition herstellen', () => { const { game } = window.__game; T.clear(['rucksack', 'axt', 'hammer', 'spaten', 'messer', 'pistole', 'feuerzeug']); T.give('schwarzpulver', 2); T.give('metall', 2); const a0 = game.S.ammo.pistole || 0; const r = game.recipes().find(r => r.id === 'mun_pistole'); const can = game.canCraft(r), bench = game.build.hasBench(game.P.pos), lvl = game.progress.level, need = Object.entries(r.needs).map(([k, n]) => k + game.count(k)); game.craft('mun_pistole'); return { a0, a1: game.S.ammo.pistole, can, bench, lvl, need }; }, r => r.a1 === r.a0 + 8);
await step('Lichter: Fackelhalter + Solarlampe nachts', () => { const { game } = window.__game; const B = game.build;
  T.give('ast', 3); T.give('lappen', 1); T.give('feuerzeug', 1); T.give('solarlampe', 1);
  const p = window.__game.B(-26, 210, 0); p.y = window.__game.W.groundY(p.x, p.z, 60); const f = B.make({ type: 'fackelhalter', x: p.x, y: p.y, z: p.z, rot: 0 }); B.interact({ build: f });
  const q = window.__game.B(-24, 210, 0); q.y = window.__game.W.groundY(q.x, q.z, 60); const l = B.make({ type: 'solarlampe', x: q.x, y: q.y, z: q.z, rot: 0 });
  game.S.time = 23; B.update(.1, .01); return { torch: f.light.power, lamp: l.light.power, scares: B.scaresAt(f.grp.position) }; }, r => r.torch > 10 && r.lamp > 1 && r.scares);
await step('Falle fängt Kaninchen, Zaun hält Tiere', () => { const { game, THREE } = window.__game; const B = game.build; T.clear(['rucksack', 'axt', 'hammer', 'spaten', 'messer', 'pistole', 'feuerzeug']);
  const p = window.__game.B(-13, 10, 0); p.y = window.__game.W.groundY(p.x, p.z, 60); const s = B.make({ type: 'falle', x: p.x, y: p.y, z: p.z, rot: 0 });
  T.at(-13, 40); B.update(0, 30); const caught = s.catch; T.at(-13, 11.3); window.__game.player.yaw = Math.PI; window.__game.player.pitch = -.6; window.__game.player.sync();
  B.interact({ build: s }); const rab = T.n('kaninchen');
  const z = window.__game.B(-13, 16, 0); z.y = window.__game.W.groundY(z.x, z.z, 60); B.make({ type: 'zaun', x: z.x, y: z.y, z: z.z, rot: 0 });
  const w = z.clone().add(new THREE.Vector3(.3, 0, .05)); game.life.fencePush(w, .45);
  return { caught, rab, pushed: +Math.abs(w.z - z.z).toFixed(2) }; }, r => r.caught && r.rab === 1 && r.pushed >= .44);
await step('Ablegen bleibt liegen + aufheben', () => { const { game } = window.__game; T.give('goldmuenze', 1); T.at(-20, 196);
  const i = game.S.inv.findIndex(x => x.id === 'goldmuenze'); game.drop(i); const n1 = game.drops.length, s1 = game.S.drops.length, had = T.n('goldmuenze');
  const r = game.drops[0]; T.lookP(r.g.position.clone().add(new (window.__game.THREE.Vector3)(0, .15, 0))); const v = game.verb(game.findTarget()); T.e(); const back = T.n('goldmuenze');
  T.give('goldmuenze', 1); game.drop(game.S.inv.findIndex(x => x.id === 'goldmuenze'));
  return { n1, s1, had, v, back, left: game.drops.length }; }, r => r.n1 === 1 && r.s1 === 1 && r.had === 0 && r.back === 1 && r.left === 1);
await step('Händler Kurt: Geld, kaufen, verkaufen', () => { const { game } = window.__game; T.give('geld'); T.give('fell', 3); const m0 = game.S.money; const a0 = game.S.ammo.schrotflinte || 0;
  game.buy('patronen_schrot'); game.sell('fell', true); return { m0, money: game.S.money, ammo: (game.S.ammo.schrotflinte || 0) - a0, fell: T.n('fell'), sold: game.S.stat.sold_fell }; }, r => r.m0 >= 43.2 && r.ammo === 10 && r.fell === 0 && r.sold === 3);
await step('Story: 5 Notizen + Kurt', () => { const { game } = window.__game; const v = [];
  for (const n of ['Notiz_Lena', 'Notiz_Gaestebuch', 'Notiz_Aushang', 'Notiz_Huber', 'Notiz_Brandt']) { const it = game.byName[n]; game.interact({ it }); v.push(!!game.S.notes[it.u.note]); game.ui.show('reader', false); }
  game.talk('story'); game.progress.update(); return { v, story: game.S.flags.kurtStory, side: !!game.S.side.dorf }; }, r => r.v.every(Boolean) && r.story && r.side);
await step('Bello füttern → folgt', () => { const { game, player } = window.__game; T.give('fleisch', 1); const D = () => game.life.dog; game.update(.02, {});
  const d = D(); T.at(-d.pos.x === 0 ? 0 : d.pos.x + 1.5, -d.pos.z); T.lookP(d.pos.clone().add(new (window.__game.THREE.Vector3)(0, .5, 0)));
  const v = game.verb(game.findTarget()); T.e(); T.at(-60, 60); const d0 = d.pos.distanceTo(player.pos); T.tick(8); const d1 = d.pos.distanceTo(player.pos);
  return { v, tame: game.S.dog.tame, d0: +d0.toFixed(1), d1: +d1.toFixed(1) }; }, r => r.tame && r.d1 < 6);
await step('Auto reparieren, tanken, fahren', () => { const { game, player } = window.__game; const V = game.vehicle; game.S.time = 12; T.clear(['rucksack', 'messer']);
  T.give('keilriemen'); T.give('werkzeugkasten'); T.give('kanister_voll'); const c = V.pos.clone(); T.at(c.x - 2.2, -c.z); T.lookP(c.clone().add(new (window.__game.THREE.Vector3)(0, .8, 0)));
  const v = []; for (let i = 0; i < 3; i++) { const it = game.byName.Auto_Panne; v.push(game.verb({ it })); game.interact({ it }); }
  const p0 = V.pos.clone(); for (let i = 0; i < 90; i++) { V.update(1 / 30, { KeyW: true }); game.update(1 / 30, {}); } const moved = V.pos.distanceTo(p0), speed = Math.abs(V.v);
  V.exit(); return { v, driving: V.driving, moved: +moved.toFixed(1), kmh: Math.round(speed * 3.6), fixed: game.S.car.fixed, fuel: Math.round(game.S.car.fuel) }; }, r => r.fixed && r.moved > 15 && r.fuel > 90);
await step('Angeln am Waldsee', () => { const { game, player, THREE } = window.__game; T.clear(['rucksack']); T.give('angel'); T.sel('angel'); T.at(-77.2, 18.0, -.1); T.lookP(window.__game.B(-81, 18, -.55));
  const dbg = (() => { const rc = new THREE.Raycaster(game.camera.position, player.forward(new THREE.Vector3()), 0, 16); const h = rc.intersectObjects(window.__game.W.waterMeshes, true)[0]; return { n: window.__game.W.waterMeshes.length, h: h?.distance, nm: h?.object.name, cam: game.camera.position.toArray().map(v => +v.toFixed(1)), sel: game.combat.selected() }; })();
  game.combat.primary(); const cast = !!game.combat.cast; let bite = false;
  for (let i = 0; i < 30 * 14 && !bite; i++) { game.combat.update(1 / 30, 1, false); bite = game.combat.cast?.state === 'bite'; }
  game.combat.primary(); return { cast, bite, fisch: T.n('fisch'), dbg }; }, r => r.cast && r.bite && r.fisch === 1);
await step('Taschenlampe: Linksklick an, Rechtsklick aus', () => { const { game } = window.__game; T.give('taschenlampe'); game.S.sel = 9; game.S.battery = 80;
  game.combat.primary(); const on = game.S.flags.flashOn; game.combat.update(.1, 1, false); const held = game.combat.cur; game.combat.secondary(); return { on, held, off: !game.S.flags.flashOn }; }, r => r.on && r.held === 'taschenlampe' && r.off);
await step('Schlafen bis zum Morgen', () => { const { game } = window.__game; game.life.clear(); game.S.time = 22; game.S.stats.health = 50; const it = game.byName.Haus_9_Bett; T.at(-75.8, 203.6, .31); game.interact({ it }); return game.S.day; }, r => true);
await page.waitForTimeout(1600);
await step('… aufgewacht', () => { const { game } = window.__game; return { time: game.S.time, day: game.S.day, health: Math.round(game.S.stats.health) }; }, r => Math.abs(r.time - 7) < .1 && r.health >= 80);
await step('Jahreszeit Winter: Schnee, kein Wachstum', () => { const { game } = window.__game; const t = game.seasons.targets.find(t => t.kind === 'ground'); const a = t.geo.attributes.color;
  const sum = () => { let v = 0; for (let i = 0; i < a.count; i += 7) v += a.getX(i) + a.getY(i) + a.getZ(i); return v; }; game.S.day = 1; game.seasons.update(.1); const c0 = sum(); game.S.day = 5; game.seasons.update(.1); const c1 = sum(); const w = game.seasons.season;
  const f = game.build.list.find(s => s.type === 'feld'); f.field.crop = 'karotte'; f.field.p = 0; game.build.update(0, 5); const grow = f.field.p;
  game.S.day = 9; game.seasons.update(.1); game.build.update(0, 1); const spring = game.seasons.season, grow2 = f.field.p; game.S.day = 4; game.seasons.update(.1);
  return { w, c0: +c0.toFixed(1), c1: +c1.toFixed(1), kinds: game.seasons.targets.map(t => t.kind + t.geo.attributes.color.count).slice(0, 6).join(), changed: c1 > c0 * 1.05, grow, spring, grow2: +grow2.toFixed(2), back: game.seasons.season }; }, r => r.w === 'Winter' && r.changed && r.grow === 0 && r.spring === 'Frühling' && r.grow2 > 0 && r.back === 'Herbst');
await step('Speichern Platz 1', () => { const { game } = window.__game; game.S.time = 12; return { ok: game.save('1'), info: game.slotInfo('1') }; }, r => r.ok);
const before = await page.evaluate(() => { const { game } = window.__game; return { n: game.build.list.length, felled: Object.keys(game.S.felled).length, inv: game.S.inv.length, stage: game.build.list[0]?.stage, crop: game.build.list.find(s => s.type === 'feld')?.field, marks: game.S.marks.length, drops: game.drops.length, xp: game.S.xp, car: game.vehicle.pos.toArray().map(v => Math.round(v)).join(), dog: game.S.dog.tame, ext: Math.max(...game.build.list.map(s => s.ext || 0)) }; });
if (SHOTS) { await page.evaluate(() => { const { game, player } = window.__game; const s = game.build.list[0]; T.at(s.x + 7, -s.z - 6); T.lookP(new (window.__game.THREE.Vector3)(s.x, s.y + 1.5, s.z)); }); await page.waitForTimeout(400); await shot('huette'); }
await page.evaluate(() => sessionStorage.setItem('waldtank_load', '1'));
await page.goto(URL_); await page.waitForFunction(() => window.__game, null, { timeout: 120000 }); await page.waitForTimeout(800);
await page.evaluate(helpers);
await step('Laden Platz 1 (nach Neustart)', () => { const { game } = window.__game; return { n: game.build.list.length, felled: Object.keys(game.S.felled).length, inv: game.S.inv.length, stage: game.build.list[0]?.stage, crop: game.build.list.find(s => s.type === 'feld')?.field, marks: game.S.marks.length, door: !!game.build.list[0]?.door, drops: game.drops.length, xp: game.S.xp, car: game.vehicle.pos.toArray().map(v => Math.round(v)).join(), dog: game.S.dog.tame, ext: Math.max(...game.build.list.map(s => s.ext || 0)) }; },
  r => r.n === before.n && r.felled === before.felled && r.inv === before.inv && r.stage === 4 && r.marks === before.marks && r.door && r.drops === before.drops && r.xp === before.xp && r.car === before.car && r.dog === before.dog && r.ext === before.ext);
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
