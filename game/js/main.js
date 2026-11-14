// Waldtank – survival exploration game. Entry point: renderer, loop, input, menus, map.
// URL parameters (for testing): ?autostart=1 (no pointer lock needed), ?t=21.5 (hour), ?at=x,y,z,yaw (Blender coordinates), ?q=n (quest step), ?power=1
import * as THREE from 'three';
import { loadWorld, B } from './world.js';
import { Sky } from './sky.js';
import { Player } from './player.js';
import { Audio } from './audio.js';
import { UI } from './ui.js';
import { Game } from './game.js';
import { Handbook } from './handbook.js';
import { roadX, creekX } from './life.js';
import { ITEMS } from './items.js';

const $ = id => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const AUTO = Q.has('autostart');

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: AUTO });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
document.body.prepend(renderer.domElement);
const QUALITY = { hoch: [Math.min(devicePixelRatio, 2), 2048, true], mittel: [Math.min(devicePixelRatio, 1.25), 1024, true], niedrig: [.85, 512, false] };
let quality = 'mittel'; try { quality = localStorage.getItem('waldtank_quality') || 'mittel'; } catch { }
let fpsCap = 60; try { const f = localStorage.getItem('waldtank_fps'); if (f !== null) fpsCap = +f; } catch { }
function applyFps(f) { fpsCap = +f; try { localStorage.setItem('waldtank_fps', f); } catch { } document.querySelectorAll('[data-fps]').forEach(b => b.classList.toggle('on', +b.dataset.fps === fpsCap)); }

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .05, 650); scene.add(camera);
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

const ui = new UI(), audio = new Audio(), sky = new Sky(scene);
function applyQuality(q) {
  quality = q; const [pr, sm, sh] = QUALITY[q]; renderer.setPixelRatio(pr);
  sky.sun.shadow.mapSize.set(sm, sm); sky.sun.shadow.map?.dispose(); sky.sun.shadow.map = null; renderer.shadowMap.enabled = sh; renderer.shadowMap.needsUpdate = true;
  scene.traverse(o => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; });
  try { localStorage.setItem('waldtank_quality', q); } catch { }
  document.querySelectorAll('[data-q]').forEach(b => b.classList.toggle('on', b.dataset.q === q));
}

$('loadtext').textContent = 'Lade Wald …';
const W = await loadWorld(scene, p => $('loadbar').style.width = (p * 100).toFixed(0) + '%');
const player = new Player(camera, W, audio);
const game = new Game(scene, camera, W, player, audio, sky, ui);
applyQuality(quality);
window.__game = { game, player, W, scene, camera, renderer, B, THREE };

function spawnAtStart() {
  const s = W.spots.spawn, e = new THREE.Euler().setFromQuaternion(s.quat, 'YXZ');
  const p = s.pos.clone(); p.y = W.groundY(p.x, p.z, p.y + 1) + .02; player.setPose(p, e.y);
}
spawnAtStart();
// testing hooks
if (Q.has('t')) game.S.time = parseFloat(Q.get('t'));
if (Q.has('at')) { const [x, y, z, yaw] = Q.get('at').split(',').map(Number); const p = B(x, y, z); if (!z) p.y = W.groundY(p.x, p.z) + .02; player.setPose(p, (yaw || 0) * Math.PI / 180); }
if (Q.has('q')) game.S.quest = parseInt(Q.get('q'));
if (Q.has('power')) game.S.genFuel = 10;
if (Q.has('pitch')) player.pitch = parseFloat(Q.get('pitch')) * Math.PI / 180;
if (Q.has('give')) for (const id of Q.get('give').split(',')) game.add(id, 1, true);

// ---------------------------------------------------------------- menus
let playing = false, panel = null;
$('loading').classList.remove('show');
$('btn-continue').style.display = game.hasSave() ? '' : 'none';
ui.show('start', !AUTO);
function lock() { if (!AUTO) renderer.domElement.requestPointerLock?.(); }
function begin(load) {
  audio.start(); book.show(false); ui.show('start', false); ui.show('pause', false);
  if (load === 'new') { game.wipe(); }
  else if (load === 'load') game.load();
  playing = true; ui.renderHotbar(game.S.inv, game.S.sel); lock();
  if (load === 'new') ui.toast('Verdammt. Der Motor ist aus. Kein Netz. Und es wird bald dunkel …');
}
const book = new Handbook(game);
$('btn-book').onclick = () => { ui.show('pause', false); openPanel('book'); };
$('btn-book-start').onclick = () => book.show(true, 0);
book.el.addEventListener('click', e => { if (e.target.closest('[data-close]')) { if (panel === 'book') closePanel(); else book.show(false); } });
if (Q.has('book')) { panel = 'book'; book.show(true, +Q.get('book') || 0); }      // test aid: open the handbook at chapter n
$('btn-new').onclick = () => begin('new');
$('btn-continue').onclick = () => begin('load');
$('btn-resume').onclick = () => { ui.show('pause', false); lock(); };
$('btn-restart').onclick = () => { game.wipe(); location.reload(); };
document.querySelectorAll('[data-q]').forEach(b => b.onclick = () => applyQuality(b.dataset.q));
document.querySelectorAll('[data-fps]').forEach(b => b.onclick = () => applyFps(b.dataset.fps)); applyFps(fpsCap);
$('btn-dead-load').onclick = () => location.reload();
$('btn-dead-new').onclick = () => { game.wipe(); location.reload(); };
$('btn-win-new').onclick = () => { game.wipe(); location.reload(); };
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === renderer.domElement;
  if (!locked && playing && !panel && !game.S.flags.dead && !game.S.flags.won) { ui.show('pause', true); updatePause(); }
});
renderer.domElement.addEventListener('click', () => { if (playing && !panel && !document.pointerLockElement) { ui.show('pause', false); lock(); } });
function updatePause() {
  $('found').innerHTML = game.places.map(p => `<li class="${game.S.found[p.id] ? 'on' : ''}">${game.S.found[p.id] ? '📍 ' + p.name : '❔ ???'}</li>`).join('');
}
function openPanel(name) {
  if (panel === name) return closePanel();
  closePanel(true); panel = name; document.exitPointerLock?.();
  if (name === 'inv') { game.ui.renderInventory(game); ui.show('invpanel', true); }
  if (name === 'map') { drawMap(); ui.show('mappanel', true); }
  if (name === 'book') book.show(true);
}
function closePanel(silent) {
  if (!panel) return; book.show(false); ui.show('invpanel', false); ui.show('mappanel', false); ui.show('reader', false); panel = null; if (!silent) lock();
}
$('invpanel').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.use) game.useSlot(+b.dataset.use);
  if (b.dataset.drop) game.drop(+b.dataset.drop);
  if (b.dataset.read) { closePanel(true); panel = 'reader'; game.read(game.S.inv[+b.dataset.read].id); return; }
  if (b.dataset.craft) game.craft(b.dataset.craft);
  game.ui.renderInventory(game);
});
// reader opened by the game (notes, radio)
new MutationObserver(() => { if ($('reader').classList.contains('show') && panel !== 'reader') { panel = 'reader'; document.exitPointerLock?.(); } }).observe($('reader'), { attributes: true });

// ---------------------------------------------------------------- input
addEventListener('keydown', e => {
  if (e.code === 'Tab') e.preventDefault();
  if (book.open && (panel === 'book' || !playing)) {                        // handbook: flip with arrows / A D, close with B / Esc
    if (['ArrowLeft', 'KeyA'].includes(e.code)) book.flip(-1);
    if (['ArrowRight', 'KeyD'].includes(e.code)) book.flip(1);
    if (['ArrowUp', 'ArrowDown'].includes(e.code)) { e.preventDefault(); book.flip(e.code === 'ArrowUp' ? -1 : 1); }
    if (['KeyB', 'Escape'].includes(e.code)) { if (panel === 'book') closePanel(); else book.show(false); }
    return;
  }
  if (!playing || game.S.flags.dead || game.S.flags.won) return;
  if (panel) {
    if (['Tab', 'Escape', 'KeyC', 'KeyM', 'KeyE'].includes(e.code)) { if (e.code === 'KeyC' && panel === 'inv') return; closePanel(); }
    return;
  }
  player.keys[e.code] = true;
  if (e.repeat) return;
  switch (e.code) {
    case 'KeyE': game.interact(game.findTarget()); break;
    case 'KeyF': if (game.has('taschenlampe')) { if (game.S.battery <= 0) ui.toast('Batterie leer.'); else { game.S.flags.flashOn = !game.S.flags.flashOn; audio.sfx('switch'); } } else ui.toast('Du hast keine Taschenlampe.'); break;
    case 'Tab': case 'KeyC': openPanel('inv'); break;
    case 'KeyM': if (game.has('karte')) openPanel('map'); else ui.toast('Du hast keine Karte. Vielleicht gibt es im Laden eine?'); break;
    case 'KeyQ': game.useSlot(game.S.sel); break;
    case 'KeyB': openPanel('book'); break;
    case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': case 'Digit5': game.S.sel = +e.code.slice(5) - 1; ui.renderHotbar(game.S.inv, game.S.sel); break;
  }
});
addEventListener('keyup', e => { player.keys[e.code] = false; });
addEventListener('blur', () => { player.keys = {}; });
addEventListener('mousemove', e => { if (document.pointerLockElement === renderer.domElement) player.look(e.movementX, e.movementY); });
addEventListener('mousedown', e => { if (e.button === 2 && game.has('fernglas') && document.pointerLockElement) player.zoom = true; });
addEventListener('mouseup', e => { if (e.button === 2) player.zoom = false; });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('wheel', e => { if (!document.pointerLockElement) return; game.S.sel = (game.S.sel + (e.deltaY > 0 ? 1 : 4)) % 5; ui.renderHotbar(game.S.inv, game.S.sel); });

// ---------------------------------------------------------------- map (M)
function trails() {
  const a = [[46, 5], [51, 7], [56, 9.5], [60.5, 12]]; for (let y = 14; y < 46; y += 4) a.push([creekX(y) - 4.5 - 1.2 * Math.sin(y / 7), y]); a.push([64.5, 49]);
  return [a, [[48, -4], [51, -14], [53, -25], [54, -32]], [[roadX(-38) - 5, -38], [-18, -37], [-27, -41], [-36, -39], [-41, -39.5]]];
}
function drawMap() {
  const c = $('mapcanvas'), x = c.getContext('2d'), S = c.width, k = S / 220, X = bx => (bx + 110) * k, Y = by => (110 - by) * k;
  x.fillStyle = '#2f4a2a'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) { x.fillStyle = i % 3 ? '#35532f' : '#284024'; x.beginPath(); x.arc((i * 97.3) % S, (i * 57.7 * 1.3) % S, 3 + i % 4, 0, 7); x.fill(); }
  const line = (pts, w, col, dash) => { x.strokeStyle = col; x.lineWidth = w * k; x.setLineDash(dash || []); x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(X(a), Y(b)) : x.moveTo(X(a), Y(b))); x.stroke(); x.setLineDash([]); };
  const road = []; for (let y = -110; y <= 110; y += 2) road.push([roadX(y), y]);
  line(road, 22, '#5e7f3c'); line(road, 8, '#8a8377'); line(road, 7, '#3e4044');
  const creek = []; for (let y = -110; y <= 110; y += 2) creek.push([creekX(y), y]); line(creek, 4, '#4f8fae');
  for (const t of trails()) line(t, 1.4, '#c9a273', [6, 4]);
  x.fillStyle = '#55575b'; x.fillRect(X(-2.5), Y(26), 40.5 * k, 50 * k);
  x.fillStyle = '#e7e2d6'; x.fillRect(X(21), Y(10), 16 * k, 20 * k); x.fillStyle = 'rgba(240,240,235,.8)'; x.fillRect(X(2.5), Y(9.5), 15 * k, 19 * k);
  x.font = `bold ${12}px system-ui`; x.fillStyle = '#fff'; x.textAlign = 'center';
  const poi = (bx, by, icon, name) => { x.font = '18px system-ui'; x.fillText(icon, X(bx), Y(by) + 6); x.font = 'bold 11px system-ui'; x.fillText(name, X(bx), Y(by) + 22); };
  poi(29, 0, '⛽', 'Waldtank'); poi(63, 52, '🪜', 'Hochsitz'); poi(55, -36, '🔥', 'Feuerstelle'); poi(roadX(-82) + 3, -82, '🚗', 'Dein Auto'); poi(roadX(40) - 5.2, 40, '🚏', 'Bus'); poi(44, -12, '🛖', 'Schuppen'); poi(-46, -40, '🚐', 'Wohnwagen');
  const p = player.pos, px = X(p.x), py = Y(-p.z);
  x.save(); x.translate(px, py); x.rotate(-player.yaw); x.fillStyle = '#ff4a3a'; x.beginPath(); x.moveTo(0, -10); x.lineTo(7, 8); x.lineTo(0, 4); x.lineTo(-7, 8); x.closePath(); x.fill(); x.restore();
  const q = game.quests[game.S.quest], t = q?.target?.(); if (t) { x.font = '20px system-ui'; x.fillText('★', X(t.x), Y(-t.z) + 7); }
  x.strokeStyle = '#d9c38a'; x.lineWidth = 6; x.strokeRect(3, 3, S - 6, S - 6);
  x.fillStyle = '#d9c38a'; x.font = 'bold 15px system-ui'; x.textAlign = 'left'; x.fillText('N ↑   Wanderkarte Nordwald', 14, 24);
}

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock(); let hudT = 0, target = null;
const v = new THREE.Vector3();
let frameErr = 0, lastT = 0, frameN = 0, cullT = 0;
function frame(now = 0) {
  requestAnimationFrame(frame);           // schedule first: one exception must never freeze the game
  // frame cap (ProMotion displays run rAF at 120 Hz); menus / pause only 20 FPS – keeps the laptop cool
  const idle = !playing || !!panel || (!AUTO && document.pointerLockElement !== renderer.domElement);
  const cap = idle ? 20 : fpsCap;
  if (cap && !AUTO && now - lastT < 1000 / cap - 2) return;
  lastT = now;
  try { step(); } catch (e) { if (frameErr++ < 3) console.error(e); }
}
function step() {
  const dt = Math.min(.05, clock.getDelta());
  const active = playing && (document.pointerLockElement === renderer.domElement || AUTO) && !panel;
  if (active && !game.S.flags.dead && !game.S.flags.won) { player.update(dt, game); game.update(dt, player.keys); }
  else if (AUTO && !playing) { game.update(dt, {}); player.sync(); }
  camera.fov += ((player.zoom ? 20 : 72) - camera.fov) * Math.min(1, dt * 10); camera.updateProjectionMatrix();
  sky.update(game.S.time, player.pos, dt);
  hudT -= dt;
  if (hudT < 0) {
    hudT = .1;
    ui.stats(game.S.stats);
    const extra = (game.strom() ? ' · ⚡' : '') + (game.S.flags.flashOn ? ` · 🔦${Math.round(game.S.battery)}%` : '') + (game.torchOn ? ' · 🔥' : '') + (game.waiting ? ' · ⏩' : '');
    ui.setClock(game.S.time, game.S.day, extra);
    const q = game.quests[game.S.quest]; ui.setQuest(q ? q.t : '', q ? q.x() : '', game.S.quest + 1, game.quests.length);
    target = active || AUTO ? game.findTarget() : null; ui.setPrompt(game.verb(target));
    ui.setFrost(Math.max(0, (35 - game.S.stats.warmth) / 35) * .8);
  }
  const q = game.quests[game.S.quest], tp = q?.target?.();
  if (tp && playing) {
    v.copy(tp).project(camera); let x = v.x, y = v.y; const behind = v.z > 1;
    if (behind) { x = -x; y = -y; }
    const m = .9; if (behind || Math.abs(x) > m || Math.abs(y) > m) { const s = m / Math.max(Math.abs(x), Math.abs(y)); x *= s; y *= s; }
    ui.setMarker({ x: (x + 1) / 2 * innerWidth, y: (1 - y) / 2 * innerHeight }, tp.distanceTo(player.pos));
  } else ui.setMarker(null);
  for (const w of W.waterMeshes) { /* gentle shimmer */ w.material.opacity = .74 + .04 * Math.sin(performance.now() / 700); }
  cullT -= dt; if (cullT < 0) { cullT = .25; W.cull(camera.position); }
  // sun shadow map: every 2nd frame is enough (the shadow matrix stays consistent with the last shadow render)
  renderer.shadowMap.needsUpdate = (frameN++ & 1) === 0 || dt > .03;
  renderer.render(scene, camera);
}
if (AUTO) { playing = true; ui.renderHotbar(game.S.inv, game.S.sel); }
frame();
