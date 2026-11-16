// Cloudhaven – verdrahtet Spiellogik, Welt, Bühne, Kamera, Leben, Ton, Oberfläche und Speichern.
import * as THREE from 'three';
import { Game } from './game.js';
import { TILES, KINDS, GROUP } from './tiles.js';
import { key, unkey, center, pixelToHex, edgeMid, INR } from './hex.js';
import { World } from './world.js';
import { Stage } from './stage.js';
import { CameraRig } from './camera.js';
import { Life } from './life.js';
import { Sound } from './audio.js';
import { UI } from './ui.js';
import * as Store from './storage.js';
import { makeThumbs, Recorder } from './media.js';
import { t as tr, phrase, tileName, tileDesc } from './i18n.js';
import { U } from './materials.js';
import { Lamps } from './lamps.js';

const Q = new URLSearchParams(location.search);
const canvas = document.getElementById('c');
const DEF = { quality: 'hoch', music: .6, sfx: .8, dayCycle: true, time: 10, season: 'auto', weather: 'auto' };
const settings = { ...DEF, ...(Store.loadSettings() || {}) };
if (Q.has('q')) settings.quality = Q.get('q');

const game = new Game();
const stage = new Stage(canvas, { quality: settings.quality });
const world = new World(stage.scene, game);
const life = new Life(stage.scene, { groundAt: (x, z) => world.groundAt(x, z) });
const sound = new Sound();
const lamps = new Lamps(stage.scene);
const lampSpots = () => lamps.setSpots([...world.T.values()].flatMap(o => o.spots));
let rigD = 0;   // Kollision nur nah dran (weit weg würde das Ziel im Gebäude die Kamera hineinziehen)
// Boden für die Kamera: über freien Feldern/der Leere zählt Inselhöhe (sonst sackt das Ziel auf −60 ab)
const camGround = (x, z) => { const h = world.groundAt(x, z); return h < -5 ? .2 : h; };
const rig = new CameraRig(stage.camera, canvas, { ground: camGround, blockers: () => rigD < 14 ? world.blockers() : [] });
let thumbs = {}, rotO = 0, hover = null, photo = false, timelapse = null, clock = 0;
const recorder = new Recorder(canvas);

// ---------- App-Schnittstelle für die Oberfläche ----------
const _v = new THREE.Vector3();
const app = {
  game, settings, audio: { play: n => sound.play(n) }, _rot: () => rotO,
  thumb: k => thumbs[k] || null,
  tilePos: (q, r) => { const c = center(q, r); return [c.x, world.groundAt(c.x, c.z), c.z]; },
  screenPos(p) { _v.set(p[0], p[1], p[2]).project(stage.camera); const w = canvas.clientWidth, h = canvas.clientHeight; return { x: (_v.x + 1) / 2 * w, y: (1 - _v.y) / 2 * h, visible: _v.z < 1 && _v.z > -1 }; },
  rotate(dir = 1) { rotO = (rotO + dir + 6) % 6; sound.play('rotate'); ui.notify('tileRotate', { o: rotO }); refreshHover(); },
  photo(on) { photo = on; world.updateSlots(!on); world.clearGhost(); if (!on) stage.setFilter('normal'); },
  capture: s => stage.capture(s),
  setFilter: f => stage.setFilter(f),
  timelapse: opts => runTimelapse(opts),
  applySettings(s) { Object.assign(settings, s); stage.setQuality(settings.quality); sound.setVolumes(settings.music, settings.sfx); },
  env: () => game.S ? { time: game.S.time, season: Math.floor(seasonNow()) % 4, weather } : { time: 10, season: 1, weather: 'klar' },
  newGame(opts) { game.newGame(opts); afterLoad(); },
  loadGame(S) { game.load(S); afterLoad(); },
  focusTile(q, r) { const c = center(q, r); rig.flyTo(new THREE.Vector3(c.x, 0, c.z), 22); },
};
const ui = new UI(app);
window.__insel = { app, game, world, stage, rig, life, sound, ui, THREE };

// ---------- Spielstand ----------
function afterLoad() {
  rotO = 0; world.clear(); world.sync(); life.setTiles(world.lifeList()); lampSpots();
  const r = world.bounds(); rig.setBounds(new THREE.Vector3(0, 0, 0), r + 8);
  if (!Q.has('cam')) rig.flyTo(new THREE.Vector3(0, 0, 0), Math.max(38, r * 2.1));
}

game.on((type, d) => {
  if (type === 'place') {
    const { tile: t } = d, k = key(t.q, t.r), c = center(t.q, t.r);
    world.sync(k); life.setTiles(world.lifeList()); lampSpots(); world.clearGhost(); hover = null;
    rig.setBounds(new THREE.Vector3(0, 0, 0), world.bounds() + 8);
    const p = new THREE.Vector3(c.x, .3, c.z);
    setTimeout(() => { life.celebrate('place', p, 1); sound.play('place', { pts: d.total }); if (d.perfect) { sound.play('perfect'); life.celebrate('perfect', p, 1); } }, 520);
    for (const m of d.milestones || []) setTimeout(() => { life.celebrate(m.g, p, m.size); sound.play('milestone'); }, 900);
    for (const qd of d.quests || []) { const [a, b] = unkey(qd.key), cc = center(a, b); setTimeout(() => { life.celebrate('quest', new THREE.Vector3(cc.x, 1, cc.z), 1); sound.play('quest'); }, 1100); }
    if (d.unlocked?.length) setTimeout(() => { life.celebrate('unlock', p, 1); sound.play('unlock'); }, 1400);
    for (const n of world.grown || []) { setTimeout(() => life.celebrate('dorf', new THREE.Vector3(n.cx, 1, n.cz), 1), 700); }
    world.grown = [];
  } else if (type === 'undo') { world.sync(); life.setTiles(world.lifeList()); lampSpots(); }
  else if (type === 'reset') { /* afterLoad übernimmt */ }
  else if (type === 'stack') refreshHover();
});

// ---------- Eingabe ----------
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.2), hit = new THREE.Vector3();
function hexAt(nx, ny) { ray.setFromCamera({ x: nx, y: ny }, stage.camera); if (!ray.ray.intersectPlane(plane, hit)) return null; return pixelToHex(hit.x, hit.z); }
function refreshHover() {
  if (!hover || photo || timelapse || ui.blocking) { if (ui.blocking) world.clearGhost(); return; }
  const [q, r] = hover, cur = game.current();
  if (!cur || game.at(q, r) || !game.slots().some(([a, b]) => a === q && b === r)) { world.clearGhost(); ui.notify('hover', null); return; }
  const ev = game.evaluate(cur.k, q, r, rotO);
  world.setGhost(cur.k, q, r, rotO, ev.ok); ui.notify('hover', { q, r, ev, kind: cur.k });
}
rig.onHover = (nx, ny) => { const h = hexAt(nx, ny); const same = h && hover && h[0] === hover[0] && h[1] === hover[1]; hover = h; if (!same) refreshHover(); };
rig.onTap = (nx, ny, e) => {
  sound.unlock?.();
  if (e?.button === 2) { if (!photo && !timelapse && !ui.blocking) app.rotate(1); return; }
  if (photo || timelapse || ui.blocking) return;
  // Gebäude oder Bewohner angeklickt?
  ray.setFromCamera({ x: nx, y: ny }, stage.camera);
  const pick = ray.intersectObjects([...life.pickables(), ...world.pickables()], false)[0];
  const h = hexAt(nx, ny);
  const onSlot = h && !game.at(...h) && game.slots().some(([a, b]) => a === h[0] && b === h[1]);
  if (onSlot) {
    hover = h; const res = game.place(h[0], h[1], rotO);
    if (!res.ok) { sound.play('invalid'); ui.toast(phrase(res.why), 'err'); }
    return;
  }
  if (pick) {
    const ud = pick.object.userData;
    if (rig.distance > 12) rig.flyTo(pick.point.clone(), 9);
    if (ud.name) ui.notify('buildingClick', { name: ud.name, text: ud.text, person: true });
    else if (ud.tile && (ud.layer === 'bldg' || ud.layer === 'part' || ud.layer === 'glass' || ud.layer === 'glow')) { const t = ud.tile; ui.notify('buildingClick', { name: tileName(t.k), text: describe(t), q: t.q, r: t.r }); }
  }
};
function describe(t) {
  const g = game.group(t.q, t.r), n = g.keys.length, st = game.stageOf(t);
  const parts = [tileDesc(t.k)];
  if (g.g) parts.push(tr('desc.group', { n }));
  if (t.k === 'haus') parts.push(tr('desc.st' + st));
  return parts.join(' ');
}
canvas.addEventListener('dblclick', e => { const r = canvas.getBoundingClientRect(); ray.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -(e.clientY - r.top) / r.height * 2 + 1 }, stage.camera); const p = ray.intersectObjects(world.blockers(), false)[0]; if (p) rig.flyTo(p.point.clone(), 7); });
addEventListener('keydown', e => {
  if (e.target.closest?.('input,textarea,select') || ui.typing || (ui.blocking && !ui.photo)) return;
  sound.unlock?.();
  if (e.code === 'KeyR' && !e.metaKey && !e.ctrlKey) app.rotate(e.shiftKey ? -1 : 1);
  else if (e.code === 'KeyF') app.rotate(-1);
});
rig.onWheel = e => { if (e.shiftKey && !photo && !ui.blocking) { const now = performance.now(); if (now - (rig._wr || 0) > 140) { rig._wr = now; app.rotate(e.deltaY > 0 ? 1 : -1); } return true; } return false; };
rig.onLongPress = (nx, ny) => { const h = hexAt(nx, ny); if (h && game.at(...h)) ui.notify('tileInfo', { q: h[0], r: h[1] }); };
canvas.addEventListener('pointerdown', () => sound.unlock?.());
// Geräusche aus dem Leben (Ballon-Brenner, Platschen, Adler …) leiser mit Abstand
life.onSound = (name, pos) => { const p = Array.isArray(pos) ? pos : [pos.x, pos.y, pos.z]; const cam = stage.camera.position, dd = Math.hypot(p[0] - cam.x, p[1] - cam.y, p[2] - cam.z); const vol = Math.max(0, 1 - dd / 90); if (vol > .03) sound.play(name, { vol }); };
rig.onChange = kind => { if (kind === 'rotate') ui.notify('camRotate'); else if (kind === 'zoom') ui.notify('zoom', { distance: rig.distance }); };

// Kameraziel nah dran nie in einem Gebäude (sonst zieht die Kollision die Kamera hinein)
const FOOT = { haus: 3.1, kapelle: 3.3, hof: 3.4, muehle: 2.5, turm: 1.9, start: 1.1 };
function keepOutOfBuildings() {
  if (rig.distance > 16 || rig.fly) return;
  const g = rig.goal, [q, r] = pixelToHex(g.t.x, g.t.z), t = game.at(q, r), R0 = t && FOOT[t.k]; if (!R0) return;
  const c = center(q, r), dx = g.t.x - c.x, dz = g.t.z - c.z, d = Math.hypot(dx, dz); if (d >= R0) return;
  const cam = stage.camera.position; let ux = dx, uz = dz; if (d < .05) { ux = cam.x - c.x; uz = cam.z - c.z; }
  const l = Math.hypot(ux, uz) || 1; g.t.x = c.x + ux / l * R0; g.t.z = c.z + uz / l * R0;
}

// ---------- Zeitraffer ----------
async function runTimelapse({ record = false } = {}) {
  if (timelapse) return;
  const n = game.S.tiles.length, dur = Math.min(40, Math.max(10, n * .25)), interval = dur / n;
  const camKeep = rig.serialize(); world.clearGhost();
  timelapse = { t0: clock };
  world.startReveal(interval); rig.flyTo(new THREE.Vector3(0, 0, 0), Math.max(40, world.bounds() * 2.2)); rig.autoOrbit(.12);
  if (record) recorder.start(60);
  await new Promise(res => { timelapse.done = res; });
  if (record) await recorder.stop((game.S.name || 'insel').replace(/[^\wäöüÄÖÜß-]+/g, '_') + '-' + tr('file.timelapse'));
  rig.autoOrbit(0); world.stopReveal(); rig.restore(camKeep); timelapse = null;
}

// ---------- Zeit, Jahreszeit, Wetter ----------
let weather = 'klar', weatherUntil = 0, wRand = 1;
const rnd = () => (wRand = (wRand * 16807) % 2147483647) / 2147483647;
function seasonNow() {
  if (settings.season !== 'auto') return +settings.season;
  const d = (game.S.day - 1) + game.S.time / 24; return ((d / 2) % 4 + 4 + 1) % 4;   // Start im Sommer, alle 2 Spieltage weiter
}
function autoWeather(season) {
  const hours = (game.S.day * 24 + game.S.time);
  if (hours < weatherUntil) return weather;
  const r = rnd(), winter = season > 2.6 && season < 3.6;
  weather = winter ? (r < .45 ? 'schnee' : r < .55 ? 'nebel' : 'klar') : r < .14 ? 'regen' : r < .2 ? 'gewitter' : r < .28 && game.S.time < 10 ? 'nebel' : 'klar';
  weatherUntil = hours + (weather === 'klar' ? 4 + rnd() * 6 : 1.5 + rnd() * 2.5);
  return weather;
}

// ---------- Bildschleife ----------
let last = performance.now(), saveTimer = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now; clock += dt;
  const S = game.S;
  if (S) {
    if (settings.dayCycle) { S.time += dt / 20; if (S.time >= 24) { S.time -= 24; S.day++; } } else S.time = +settings.time;
    const season = seasonNow();
    stage.setTime(S.time); stage.setSeason(season);
    const wx = settings.weather === 'auto' ? autoWeather(season) : settings.weather; if (wx !== stage.weather) stage.setWeather(wx);
    const d = rigD = rig.distance;
    keepOutOfBuildings();
    stage.setFocus(rig.target, d);
    world.update(dt); rig.update(dt);
    life.update(dt, clock, { night: U.uNight.value, season, rain: U.uRain.value, camTarget: rig.target, camDist: d });
    stage.update(dt, clock); lamps.update(dt, U.uNight.value, rig.target, d);
    // Nähe für die Atmo
    const near = life.near(rig.target);
    sound.update({ night: U.uNight.value, season, rain: U.uRain.value, camDist: d, near });
    if (timelapse && world.reveal?.done) timelapse.done();
  }
  ui.frame(dt);
  stage.render();
}

// ---------- Start ----------
addEventListener('resize', () => stage.resize());
sound.setVolumes(settings.music, settings.sfx);
if (Q.has('cam')) { const [d, yaw, pitch] = Q.get('cam').split(',').map(Number); rig.restore({ target: [0, 0, 0], distance: d, yaw: yaw * Math.PI / 180, pitch: pitch * Math.PI / 180 }); }
requestAnimationFrame(frame);
setTimeout(() => { thumbs = makeThumbs(stage.renderer, ['start', ...KINDS]); ui.notify('thumbs'); warmup(); }, 50);
// alle Shader einmal vorab übersetzen (sonst hakt das erste Heranzoomen/Nacht/Regen)
function warmup() {
  try { const keep = { t: rig.serialize() }; stage.renderer.compileAsync?.(stage.scene, stage.camera).catch(() => {});
    for (const d of [3, 60]) { rig.jumpTo(rig.target.clone(), d); stage.setFocus(rig.target, d); stage.update(.016, clock); stage.render(); }
    rig.restore(keep.t); } catch (e) { console.warn('warmup', e); }
}
ui.notify('ready');
