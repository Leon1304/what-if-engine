// Cloudhaven – verdrahtet Spiellogik, Welt, Bühne, Kamera, Leben, Ton, Oberfläche und Speichern.
import * as THREE from 'three';
import { Game } from './game.js';
import { TILES, KINDS, GROUP, LEVEL, MERGE, MERGE_MAX } from './tiles.js';
import { key, unkey, center, pixelToHex, edgeMid, INR } from './hex.js';
import { World } from './world.js';
import { Stage, QUALITY } from './stage.js';
import { CameraRig } from './camera.js';
import { Life } from './life.js';
import { Sound } from './audio.js';
import { UI } from './ui.js';
import * as Store from './storage.js';
import { makeThumbs, Recorder } from './media.js';
import { t as tr, phrase, tileName, tileDesc } from './i18n.js';
import { U } from './materials.js';
import { Progress } from './progress.js';
import { Lamps } from './lamps.js';

const Q = new URLSearchParams(location.search);
const canvas = document.getElementById('c');
const DEF = { quality: 'hoch', music: .6, sfx: .8, dayCycle: true, time: 10, season: 'auto', weather: 'auto', visitors: true };
const settings = { ...DEF, ...(Store.loadSettings() || {}) };
// Grafik automatisch, solange der Spieler sie nicht selbst eingestellt hat (qualityAuto !== false):
// Handy → niedrig, Tablet/schwaches Gerät → mittel, sonst hoch. Dazu passt sich die Auflösung der Bildrate an (dynRes).
function autoQuality() {
  const touch = matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 1;
  const small = Math.min(screen.width || innerWidth, screen.height || innerHeight) < 600;
  const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 8;
  if ((touch && small) || mem <= 2 || cores <= 2) return 'niedrig';
  if (touch || cores <= 4 || mem <= 4) return 'mittel';
  return 'hoch';
}
let booting = true;
if (Q.has('q')) { settings.quality = Q.get('q'); settings.qualityAuto = false; }
else if (settings.qualityAuto !== false) settings.quality = autoQuality();

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
  tilePos: (q, r) => { const c = center(q, r); return [c.x, camGround(c.x, c.z), c.z]; },
  screenPos(p) { _v.set(p[0], p[1], p[2]).project(stage.camera); const w = canvas.clientWidth, h = canvas.clientHeight; return { x: (_v.x + 1) / 2 * w, y: (1 - _v.y) / 2 * h, visible: _v.z < 1 && _v.z > -1 }; },
  rotate(dir = 1) { rotO = (rotO + dir + 6) % 6; sound.play('rotate'); ui.notify('tileRotate', { o: rotO }); refreshHover(); },
  photo(on) { photo = on; world.updateSlots(!on); world.clearGhost(); if (!on) stage.setFilter('normal'); },
  capture: s => stage.capture(s),
  setFilter: f => stage.setFilter(f),
  timelapse: opts => runTimelapse(opts),
  applySettings(s) {
    Object.assign(settings, s);
    if (booting && !Q.has('q') && settings.qualityAuto !== false) settings.quality = autoQuality();   // gespeicherter Stand beim Start
    else if (!booting && settings.quality !== stage.qName) settings.qualityAuto = false;              // Spieler hat selbst gewählt
    if (settings.quality !== stage.qName) { stage.setQuality(settings.quality); dyn.reset(); }
    sound.setVolumes(settings.music, settings.sfx);
  },
  env: () => game.S ? { time: game.S.time, season: Math.floor(seasonNow()) % 4, weather } : { time: 10, season: 1, weather: 'klar' },
  newGame(opts) { game.newGame(opts); afterLoad(); },
  loadGame(S) { game.load(S); afterLoad(); },
  focusTile(q, r) { const c = center(q, r); rig.flyTo(new THREE.Vector3(c.x, 0, c.z), 22); },
};
// Detailstufen je Qualität: minPx = kleinste gezeichnete Körpergröße in Bildpunkten, detailFar = Kleinkram bis hier
// shadowK: Schatten werfen nur Körper ab shadowK Schatten-Texeln (kleinere ergeben ohnehin nur weiche Flecken)
// farScale: Pixel-Verhältnis in der Gesamtansicht (Abstand > 90, dort ist der Großteil Tilt-Shift-Unschärfe)
const LOD = { hoch: { minPx: 1, farMinPx: 2.5, detailFar: 110, shadowK: 1.5, farScale: 1 }, mittel: { minPx: 1.5, farMinPx: 3.5, detailFar: 80, shadowK: 2, farScale: .8 }, niedrig: { minPx: 2.2, farMinPx: 4.5, detailFar: 55, shadowK: 2.5, farScale: .85 } };   // farMinPx: in der Gesamtansicht (Tilt-Shift-Unschärfe) gröber

// Dynamische Auflösung: liegt der Median der Bildzeit länger über 25 ms (< 40 fps), Pixel-Verhältnis stufenweise senken;
// läuft es wieder flüssig, langsam anheben (nie über die Stufe, die zuletzt zu langsam war). ?dyn=0 schaltet aus.
const dyn = {
  on: Q.get('dyn') !== '0', far: false, scale: 1, win: [], t0: 0, bad: 0, good: 0, cap: 1, capT: 0,
  reset() { this.scale = 1; this.cap = 1; this.win.length = 0; this.bad = this.good = 0; this.apply(); },
  apply() {
    const base = QUALITY[stage.qName] || QUALITY.mittel, full = Math.min(window.devicePixelRatio || 1, base.dpr);
    const sc = this.scale * (this.far ? (LOD[stage.qName] || LOD.mittel).farScale : 1);   // weit weg: Bild ist größtenteils Tilt-Shift-Unschärfe
    stage.q = { ...base, dpr: sc < 1 ? Math.max(.5, full * sc) : base.dpr, shadowEvery: (base.shadowEvery || 1) * (this.far ? 2 : 1) }; stage.resize();
  },
  frame(now) {
    if (!this.on || document.hidden || recorder.rec || photo || timelapse) { this.win.length = 0; this.t0 = now; return; }
    this.win.push(now); if (now - this.t0 < 1500) return;
    const d = []; for (let i = 1; i < this.win.length; i++) d.push(this.win[i] - this.win[i - 1]);
    this.win = [now]; this.t0 = now; if (d.length < 5) return;
    d.sort((a, b) => a - b); const med = d[d.length >> 1];
    if (med > 25) { this.good = 0; if (++this.bad >= 2 && this.scale > .55) { this.cap = this.scale; this.capT = now; this.scale = Math.max(.5, this.scale * .85); this.bad = 0; this.apply(); } }
    else if (med < 18.5) { this.bad = 0; if (now - this.capT > 30000) this.cap = 1;
      if (++this.good >= 3 && this.scale < 1 && this.scale / .85 < this.cap - 1e-6) { this.scale = Math.min(1, this.scale / .85); this.good = 0; this.apply(); } }
    else { this.bad = 0; this.good = 0; }
  },
};
// Erfolge, Tagesaufgaben, Besucher – muss sich vor der UI am Spiel anmelden
app.progress = new Progress(game, { env: () => app.env(), visitors: () => settings.visitors !== false });
app.progress.on((type, d) => { if (type === 'wishDone') { const [q, r] = unkey(d.key), c = center(q, r); setTimeout(() => life.celebrate('quest', new THREE.Vector3(c.x, 1, c.z), 1), 650); } });
const ui = new UI(app);
booting = false;
window.__insel = { app, game, world, stage, rig, life, sound, ui, THREE, dyn, LOD, lamps, prog: app.progress };

// ---------- Spielstand ----------
function afterLoad() {
  rotO = 0; world.clear(); world.sync(); life.setTiles(world.lifeList()); lampSpots();
  const r = world.bounds(); rig.setBounds(new THREE.Vector3(0, 0, 0), r + 8);
  // Verschmelzen: ganzes Spielfeld im Bild, Ziel etwas zur Kamera hin (unten liegt die Bauleiste)
  const M = game.S.mode === 'verschmelzen', y0 = rig.g.yaw, off = M ? 9 : 0;
  if (!Q.has('cam')) rig.flyTo(new THREE.Vector3(Math.sin(y0) * off, 0, Math.cos(y0) * off), Math.max(38, r * (M ? 3 : 2.1)));
  requestAnimationFrame(() => warmup(false));                // neue Insel: Varianten/Schatten einmal vorab (Start, nicht beim ersten Zoom)
}
// Nachbarn werden nach dem Setzen in den folgenden Bildern neu gebaut (world.queue) → Leben/Laternen nachziehen
let lifeDirty = 0;
world.onRebuilt = (n, grown) => { lifeDirty = 1; if (grown) life.celebrate('dorf', new THREE.Vector3(n.cx, 1, n.cz), 1); };

// Verschmelzen: Treffer je Kettenschritt (aus world._mergeUpdate) → Funken, Lichtsäule, Töne (höhere Stufe = mehr Töne)
world.onMergeFx = (type, d) => {
  if (type !== 'hit') return;
  const p = new THREE.Vector3(d.x, world.groundAt(d.x, d.z) + .4, d.z), big = d.level >= 4;
  life.celebrate(big ? 'unlock' : 'perfect', p, 2 + d.level * .6);
  sound.play('points', { pts: 4 + d.level * 3 });
  sound.play(big ? 'milestone' : 'perfect', { vol: .6 + d.step * .15 });
  if (d.top) { setTimeout(() => { life.celebrate('dorf', p, 9); life._fireworks?.(p, p.y, 10); sound.play('unlock'); }, 250); }   // Endstufe/Burg: Feuerwerk
  ui.notify('mergeHit', d);
};
game.on((type, d) => {
  if (type === 'merge') world.captureMerge(d);                       // Brett schon geändert, Welt noch nicht: Partner als Geister behalten
  else if (type === 'place') {
    const { tile: t } = d, k = key(t.q, t.r), c = center(t.q, t.r);
    world.sync(k); if (d.merges?.length) world.playMerge(d);
    lifeDirty = 1; world.clearGhost(); hover = null;   // Leben/Laternen erst im nächsten freien Bild (life.setTiles ist teuer)
    rig.setBounds(new THREE.Vector3(0, 0, 0), world.bounds() + 8);
    const p = new THREE.Vector3(c.x, .3, c.z);
    setTimeout(() => { life.celebrate('place', p, 1); sound.play('place', { pts: d.total }); if (d.perfect) { sound.play('perfect'); life.celebrate('perfect', p, 1); } }, 520);
    for (const m of d.milestones || []) setTimeout(() => { life.celebrate(m.g, p, m.size); sound.play('milestone'); }, 900);
    for (const qd of d.quests || []) { const [a, b] = unkey(qd.key), cc = center(a, b); setTimeout(() => { life.celebrate('quest', new THREE.Vector3(cc.x, 1, cc.z), 1); sound.play('quest'); }, 1100); }
    if (d.unlocked?.length) setTimeout(() => { life.celebrate('unlock', p, 1); sound.play('unlock'); }, 1400);
    for (const n of world.grown || []) { setTimeout(() => life.celebrate('dorf', new THREE.Vector3(n.cx, 1, n.cz), 1), 700); }
    world.grown = [];
  } else if (type === 'undo') { world.finishMerges(); world.sync(); life.setTiles(world.lifeList()); lampSpots(); }
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
  world.setGhost(cur.k, q, r, rotO, ev.ok); world.setMergePreview(ev.ok ? ev.merges : null, q, r); ui.notify('hover', { q, r, ev, kind: cur.k });
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
  if (game.S.mode === 'verschmelzen' && LEVEL[t.k]) { parts.push(tr('desc.lvl', { n: LEVEL[t.k], m: MERGE_MAX })); if (MERGE[t.k]) parts.push(tr('desc.next', { tile: tileName(MERGE[t.k]) })); return parts.join(' '); }
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
// Ton schon beim ersten Klick/Tastendruck irgendwo (meist im Menü) aufbauen – nicht erst beim ersten Ziehen auf der Insel
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => sound.unlock?.(), { capture: true, once: true });
// Geräusche aus dem Leben (Ballon-Brenner, Platschen, Adler …) leiser mit Abstand
life.onSound = (name, pos) => { const p = Array.isArray(pos) ? pos : [pos.x, pos.y, pos.z]; const cam = stage.camera.position, dd = Math.hypot(p[0] - cam.x, p[1] - cam.y, p[2] - cam.z); const vol = Math.max(0, 1 - dd / 90); if (vol > .03) sound.play(name, { vol }); };
rig.onChange = kind => { if (kind === 'rotate') ui.notify('camRotate'); else if (kind === 'zoom') ui.notify('zoom', { distance: rig.distance }); };

// Kameraziel nah dran nie in einem Gebäude (sonst zieht die Kollision die Kamera hinein)
const FOOT = { haus: 3.1, kapelle: 3.3, hof: 3.4, muehle: 2.5, turm: 1.9, start: 1.1 };
function keepOutOfBuildings(dt = 1 / 60) {
  if (rig.distance > 16 || rig.fly) return;
  const g = rig.goal, [q, r] = pixelToHex(g.t.x, g.t.z), t = game.at(q, r), R0 = t && FOOT[t.k]; if (!R0) return;
  const c = center(q, r), dx = g.t.x - c.x, dz = g.t.z - c.z, d = Math.hypot(dx, dz); if (d >= R0) return;
  const cam = stage.camera.position; let ux = dx, uz = dz; if (d < .05) { ux = cam.x - c.x; uz = cam.z - c.z; }
  // weich hinausschieben (höchstens ~4 m/s), statt das Ziel an den Rand springen zu lassen
  const l = Math.hypot(ux, uz) || 1, tx = c.x + ux / l * R0, tz = c.z + uz / l * R0, mx = tx - g.t.x, mz = tz - g.t.z, L = Math.hypot(mx, mz), k = Math.min(1, 4 * dt / (L || 1));
  g.t.x += mx * k; g.t.z += mz * k;
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
let last = performance.now(), saveTimer = 0, lampVis = true;
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
    keepOutOfBuildings(dt);
    stage.setFocus(rig.target, d);
    world.update(dt); rig.update(dt);
    if (lifeDirty && !world.queue.length && !world.drained && ++lifeDirty > 2) { lifeDirty = 0; life.setTiles(world.lifeList()); lampSpots(); }
    const sc = stage.sun.shadow.camera, LQ = LOD[stage.qName] || LOD.mittel;
    if (Q.get('lod') !== '0') world.updateLod(stage.camera, stage.height * stage.pr, { ...LQ, minPx: dyn.far ? LQ.farMinPx : LQ.minPx, shadowTexel: (sc.right - sc.left) / stage.sun.shadow.mapSize.x * (LQ.shadowK || 1) });
    life.update(dt, clock, { night: U.uNight.value, season, rain: U.uRain.value, camTarget: rig.target, camDist: d });
    stage.update(dt, clock); lamps.update(dt, U.uNight.value, rig.target, d, stage.camera.position);
    // Laternenlichter nur, wenn sie leuchten: 10 Punktlichter kosten in jedem Bildpunkt (beide Varianten übersetzt warmup())
    const lampOn = lamps.lights.some(l => l.intensity > 0); if (lampOn !== lampVis) { lampVis = lampOn; for (const l of lamps.lights) l.visible = lampOn; }
    if (dyn.far ? d < 80 : d > 90) { dyn.far = !dyn.far; dyn.apply(); }       // weit weg: Schatten seltener, Auflösung etwas geringer
    // Nähe für die Atmo
    const near = life.near(rig.target);
    sound.update({ night: U.uNight.value, season, rain: U.uRain.value, camDist: d, near });
    if (timelapse && world.reveal?.done) timelapse.done();
  }
  ui.frame(dt);
  stage.render();
  dyn.frame(now);
}

// ---------- Start ----------
addEventListener('resize', () => stage.resize());
sound.setVolumes(settings.music, settings.sfx);
if (Q.has('cam')) { const [d, yaw, pitch] = Q.get('cam').split(',').map(Number); rig.restore({ target: [0, 0, 0], distance: d, yaw: yaw * Math.PI / 180, pitch: pitch * Math.PI / 180 }); }
requestAnimationFrame(frame);
setTimeout(() => { thumbs = makeThumbs(stage.renderer, ['start', ...KINDS]); ui.notify('thumbs'); warmup(true); }, 50);
// Alle Shader-Varianten einmal vorab übersetzen und zeichnen (sonst hakt das erste Heranzoomen/Nacht/Regen/Vorschau):
// Probe-Meshes je Material + alle versteckten Dinge (Wetter, Luftschiff, Feste …) kurz sichtbar, ohne Sichtkegel-Test,
// in den Szenen-Puffer (gleiche Variante wie im Spiel: ohne Tonemapping, linear) samt Schatten – der Bildschirm bleibt unberührt.
function warmup(full) {
  const r = stage.renderer, scene = stage.scene, probe = full ? world.probe() : null, changed = [];
  try {
    if (probe) { probe.position.copy(rig.target); scene.add(probe); }
    scene.traverse(o => { if (!o.visible && o !== scene && !(o.isMesh && o.material?.visible === false)) { changed.push([o, 'visible', false]); o.visible = true; }
      if ((o.isMesh || o.isPoints || o.isLine) && o.frustumCulled) { changed.push([o, 'frustumCulled', true]); o.frustumCulled = false; } });
    const keep = r.getRenderTarget(), rt = stage.composer.readBuffer;
    r.setRenderTarget(rt);
    for (const on of [true, false]) {                         // mit und ohne Laternenlicht (andere Shader-Variante)
      for (const l of lamps.lights) l.visible = on;
      r.compile(scene, stage.camera); r.shadowMap.needsUpdate = true; r.render(scene, stage.camera);
    }
    for (const l of lamps.lights) l.visible = lampVis;
    r.setRenderTarget(keep);
  } catch (e) { console.warn('warmup', e); }
  for (const [o, k, v] of changed) o[k] = v;
  if (probe) { scene.remove(probe); probe.userData.dispose(); }
  stage._shadowJump = true;
}
ui.notify('ready');
