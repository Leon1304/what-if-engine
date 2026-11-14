// Waldtank – survival exploration game. Entry point: renderer, loop, input, menus, map.
// URL parameters (for testing): ?autostart=1 (no pointer lock needed), ?t=21.5 (hour), ?at=x,y,z,yaw (Blender coordinates), ?q=n (quest step), ?power=1,
// ?give=id,id (items), ?diff=aus|leicht|mittel|schwer
import * as THREE from 'three';
import { loadWorld, B } from './world.js';
import { Sky } from './sky.js';
import { Player } from './player.js';
import { Audio } from './audio.js';
import { UI } from './ui.js';
import { Game, SLOTS } from './game.js';
import { DIFF, MAP } from './life.js';
import { Handbook } from './handbook.js';
import { roadX, creekX } from './life.js';
import { ITEMS, WEAPONS } from './items.js';

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
if (Q.has('give')) for (const id of Q.get('give').split(',')) { const [k, n] = id.split(':'); game.add(k, +(n || 1), true); }
if (Q.has('diff')) game.S.diff = Q.get('diff');
game.openPanel = n => openPanel(n);

// ---------------------------------------------------------------- menus
let playing = false, panel = null;
$('loading').classList.remove('show');
$('btn-continue').style.display = game.hasSave() ? '' : 'none';
ui.show('start', !AUTO);
// difficulty (start menu + pause)
function applyDiff(d) { if (!DIFF[d]) return; game.S.diff = d; try { localStorage.setItem('waldtank_diff', d); } catch { }
  document.querySelectorAll('[data-diff]').forEach(b => b.classList.toggle('on', b.dataset.diff === d));
  if (d === 'aus') game.life.animals.filter(a => a.kind !== 'deer').forEach(a => game.life.remove(a)); }
document.querySelectorAll('[data-diff]').forEach(b => b.onclick = () => applyDiff(b.dataset.diff)); applyDiff(game.S.diff);
try { game.hlOn = localStorage.getItem('waldtank_hl') !== '0'; } catch { }
function applyHl() { $('btn-hl').textContent = `✨ Gegenstände hervorheben: ${game.hlOn ? 'an' : 'aus'}`; try { localStorage.setItem('waldtank_hl', game.hlOn ? '1' : '0'); } catch { } }
$('btn-hl').onclick = () => { game.hlOn = !game.hlOn; applyHl(); }; applyHl();
// save slots (pause menu): save / load (load = reload the page and start from that slot, so no state leaks from the current run)
function renderSlots() {
  const fmt = i => i ? `Tag ${i.day}, ${String(Math.floor(i.time)).padStart(2, '0')}:${String(Math.floor(i.time % 1 * 60)).padStart(2, '0')} · ${DIFF[i.diff]?.name || ''} · ${new Date(i.at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}` : 'leer';
  $('slots').innerHTML = SLOTS.map(sl => { const i = game.slotInfo(sl);
    return `<div class="slotrow"><b>${sl === 'auto' ? 'Automatisch' : 'Platz ' + sl}</b><span>${fmt(i)}</span>${sl === 'auto' ? '' : `<button class="sec" data-save="${sl}">Speichern</button>`}<button class="sec" data-load="${sl}" ${i ? '' : 'disabled'}>Laden</button></div>`; }).join('');
}
$('slots').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.save) { game.save(b.dataset.save) ? ui.toast(`💾 Gespeichert in Platz ${b.dataset.save}.`, 'good') : ui.toast('Speichern fehlgeschlagen (Browser-Speicher voll oder gesperrt).', 'warn'); renderSlots(); }
  if (b.dataset.load) { try { sessionStorage.setItem('waldtank_load', b.dataset.load); } catch { } location.reload(); }
});
$('btn-export').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([game.exportSave()], { type: 'application/json' }));
  a.download = `waldtank-tag${game.S.day}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
$('btn-import').onclick = () => $('importfile').click();
$('importfile').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const d = JSON.parse(await f.text()); if (!d.S) throw 0;
  sessionStorage.setItem('waldtank_import', JSON.stringify(d)); location.reload(); } catch { ui.toast('Diese Datei ist kein Waldtank-Spielstand.', 'warn'); } };
function lock() { if (!AUTO) renderer.domElement.requestPointerLock?.(); }
function begin(load) {
  audio.start(); book.show(false); ui.show('start', false); ui.show('pause', false);
  if (load === 'new') { game.wipe(); }
  else if (load === 'load') game.load(slotToLoad);
  else if (load === 'import') game.load(importData);
  playing = true; applyDiff(game.S.diff); ui.renderHotbar(game.S.inv, game.S.sel); lock();
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
$('btn-win-free').onclick = () => { game.freePlay(); lock(); };
// a slot chosen in the pause menu / an imported file: start directly from it
let slotToLoad = null, importData = null;
try { slotToLoad = sessionStorage.getItem('waldtank_load'); sessionStorage.removeItem('waldtank_load'); importData = JSON.parse(sessionStorage.getItem('waldtank_import') || 'null'); sessionStorage.removeItem('waldtank_import'); } catch { }
if (importData) setTimeout(() => { begin('import'); ui.toast('📂 Spielstand importiert.', 'good'); }, 50);
else if (slotToLoad) setTimeout(() => { begin('load'); ui.toast('📂 Spielstand geladen.', 'good'); }, 50);
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === renderer.domElement;
  if (!locked && playing && !panel && !game.S.flags.dead && !game.S.flags.won) { ui.show('pause', true); updatePause(); renderSlots(); }
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
  if (name === 'build') { $('buildpanel').innerHTML = game.build.menuHtml(); ui.show('buildpanel', true); }
  if (name === 'book') book.show(true);
}
function closePanel(silent) {
  if (!panel) return; book.show(false); ui.show('invpanel', false); ui.show('mappanel', false); ui.show('reader', false); ui.show('buildpanel', false); game.build.chest = null; panel = null; if (!silent) lock();
}
$('invpanel').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.use) game.useSlot(+b.dataset.use);
  if (b.dataset.drop) game.drop(+b.dataset.drop);
  if (b.dataset.read) { closePanel(true); panel = 'reader'; game.read(game.S.inv[+b.dataset.read].id); return; }
  if (b.dataset.craft) game.craft(b.dataset.craft);
  if (b.dataset.put) game.build.chestMove(1, +b.dataset.put);
  if (b.dataset.get) game.build.chestMove(-1, +b.dataset.get);
  game.ui.renderInventory(game);
});
$('buildpanel').addEventListener('click', e => { const b = e.target.closest('[data-bp]'); if (!b) return; closePanel(); game.build.start(b.dataset.bp); });
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
    if (['Tab', 'Escape', 'KeyC', 'KeyM', 'KeyE', 'KeyG'].includes(e.code)) { if (e.code === 'KeyC' && panel === 'inv') return; closePanel(); }
    return;
  }
  if (game.build.ghost && ['KeyX', 'Escape', 'KeyG'].includes(e.code)) { game.build.cancel(); ui.toast('Bauen abgebrochen.'); return; }
  player.keys[e.code] = true;
  if (e.repeat) return;
  switch (e.code) {
    case 'KeyE': if (game.build.ghost) game.build.place(); else game.interact(game.findTarget()); break;
    case 'KeyG': if (!game.has('hammer') && !game.has('spaten') && !game.has('axt')) ui.toast('Zum Bauen brauchst du Werkzeug: Hammer (Schuppen), Spaten oder Axt. Unterstand, Feuerstelle und Zaun gehen ohne Hammer.'); openPanel('build'); break;
    case 'KeyR': if (game.build.ghost) game.build.turn(Math.PI / 2); else game.combat.reload(); break;
    case 'KeyX': { const t = game.findTarget(); if (t?.build) game.build.dismantle(t.build); break; }
    case 'KeyN': addMark(player.pos.x, -player.pos.z); break;
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
let rmb = false, lmb = false;
addEventListener('mousedown', e => {
  if (!document.pointerLockElement || panel) return;
  if (e.button === 2) { rmb = true; if (game.has('fernglas') && !game.combat.weapon()) player.zoom = true; }
  if (e.button === 0) { lmb = true; if (game.build.ghost) game.build.place(); else game.combat.fire(); }
});
addEventListener('mouseup', e => { if (e.button === 2) { rmb = false; player.zoom = false; } if (e.button === 0) lmb = false; });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('wheel', e => { if (!document.pointerLockElement) return; if (game.build.ghost) { game.build.turn((e.deltaY > 0 ? 1 : -1) * Math.PI / 12); return; } game.S.sel = (game.S.sel + (e.deltaY > 0 ? 1 : 4)) % 5; ui.renderHotbar(game.S.inv, game.S.sel); });

// ---------------------------------------------------------------- map (M): roads, creek and paths always; places only once found
// (or read on a sign board); waypoints: N sets one where you stand, click on the map sets / removes one
const MX0 = -110, MX1 = 110, MY0 = -110, MY1 = 230, MK = 2;          // Blender metres → canvas pixels (440 × 680)
const mapX = bx => (bx - MX0) * MK, mapY = by => (MY1 - by) * MK;
const MARK_COLS = ['#ff4a3a', '#3aa0ff', '#ffd23a', '#7fdc6a', '#d070ff', '#ff9a3a', '#3ae0d0', '#ffffff'];
function trails() {
  const a = [[46, 5], [51, 7], [56, 9.5], [60.5, 12]]; for (let y = 14; y < 46; y += 4) a.push([creekX(y) - 4.5 - 1.2 * Math.sin(y / 7), y]); a.push([64.5, 49]);
  return [a, [[48, -4], [51, -14], [53, -25], [54, -32]], [[roadX(-38) - 5, -38], [-18, -37], [-27, -41], [-36, -39], [-41, -39.5]],
    [[roadX(120) + 5, 120], [-30, 121], [-5, 118], [26, 121]], [[34, 124], [45, 130], [58, 139]], [[roadX(176) + 6, 176], [-35, 178], [0, 177], [15, 178]],
    [[roadX(80) - 5, 80], [-40, 79], [-62, 76], [-78, 75]]];
}
function addMark(bx, by) {
  const M = game.S.marks;
  if (M.length >= 8) { ui.toast('Höchstens 8 Wegmarker – klick auf der Karte einen alten an, um ihn zu löschen.', 'warn'); return; }
  const near = game.places.filter(p => p.pos && (game.S.found[p.id] || game.S.known[p.id])).sort((a, b) => Math.hypot(a.pos.x - bx, -a.pos.z - by) - Math.hypot(b.pos.x - bx, -b.pos.z - by))[0];
  const label = near && Math.hypot(near.pos.x - bx, -near.pos.z - by) < 25 ? near.name : `Wegmarke ${M.length + 1}`;
  const used = new Set(M.map(m => m.c)); const c = MARK_COLS.find(c => !used.has(c)) || MARK_COLS[0];
  M.push({ x: +bx.toFixed(1), y: +by.toFixed(1), label, c }); audio.sfx('pickup'); ui.toast(`📍 Wegmarker gesetzt: ${label}`);
}
$('mapcanvas').addEventListener('click', e => {
  const c = $('mapcanvas'), r = c.getBoundingClientRect(), px = (e.clientX - r.left) * c.width / r.width, py = (e.clientY - r.top) * c.height / r.height;
  const bx = px / MK + MX0, by = MY1 - py / MK, M = game.S.marks;
  const hit = M.findIndex(m => Math.hypot(m.x - bx, m.y - by) < 6);
  if (hit >= 0) { const [m] = M.splice(hit, 1); ui.toast(`Wegmarker entfernt: ${m.label}`); } else addMark(bx, by);
  drawMap();
});
function drawMap() {
  const c = $('mapcanvas'), x = c.getContext('2d'), Wd = c.width, Ht = c.height, k = MK, X = mapX, Y = mapY;
  x.fillStyle = '#2f4a2a'; x.fillRect(0, 0, Wd, Ht);
  for (let i = 0; i < 1500; i++) { x.fillStyle = i % 3 ? '#35532f' : '#284024'; x.beginPath(); x.arc((i * 97.3) % Wd, (i * 57.7 * 1.3) % Ht, 3 + i % 4, 0, 7); x.fill(); }
  const line = (pts, w, col, dash) => { x.strokeStyle = col; x.lineWidth = w * k; x.setLineDash(dash || []); x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(X(a), Y(b)) : x.moveTo(X(a), Y(b))); x.stroke(); x.setLineDash([]); };
  const road = []; for (let y = MY0; y <= MY1; y += 2) road.push([roadX(y), y]);
  line(road, 22, '#5e7f3c'); line(road, 8, '#8a8377'); line(road, 7, '#3e4044');
  const creek = []; for (let y = MY0; y <= MY1; y += 2) creek.push([creekX(y), y]); line(creek, 4, '#4f8fae');
  for (const t of trails()) line(t, 1.4, '#c9a273', [6, 4]);
  const S = game.S, seen = id => S.found[id] || S.known[id];
  { x.fillStyle = '#55575b'; x.fillRect(X(-2.5), Y(26), 40.5 * k, 50 * k); x.fillStyle = '#e7e2d6'; x.fillRect(X(21), Y(10), 16 * k, 20 * k); }
  if (seen('dorf')) { x.fillStyle = '#c9b48a'; for (const [x0, y0, x1, y1] of [[-78.5, 156, -70.5, 164], [-79.5, 168, -70.5, 180], [-78.5, 184, -70.5, 192], [-78.5, 196, -70.5, 206], [-56.8, 151, -48.8, 159], [-56.8, 206, -48.8, 214], [-54, 194, -42, 201], [-46, 152, -36, 164]])
    x.fillRect(X(x0), Y(y1), (x1 - x0) * k, (y1 - y0) * k); }
  for (const s of game.build.list) { x.fillStyle = s.type === 'feld' ? '#6a4a2a' : '#a07850'; x.fillRect(X(s.x) - 3, Y(-s.z) - 3, 6, 6); }
  const POS = { tanke: [29, 0, '⛽'], hochsitz: [63, 52, '🪜'], feuer: [55, -36, '🔥'], panne: [roadX(-82) + 3, -82, '🚗'], bus: [roadX(40) - 5.2, 40, '🚏'], schuppen: [44, -12, '🛖'], camp: [-46, -40, '🚐'] };
  x.textAlign = 'center';
  for (const p of game.places) {
    if (!seen(p.id) || p.id === 'bach') continue;
    const [bx, by, ic] = POS[p.id] || (p.pos ? [p.pos.x, -p.pos.z, p.icon || '📍'] : []); if (bx === undefined) continue;
    x.globalAlpha = S.found[p.id] ? 1 : .6;
    x.font = '18px system-ui'; x.fillStyle = '#fff'; x.fillText(ic, X(bx), Y(by) + 6); x.font = 'bold 11px system-ui'; x.fillText(p.name.replace(/ „.*“/, ''), X(bx), Y(by) + 22); x.globalAlpha = 1;
  }
  for (const m of S.marks) { x.fillStyle = m.c; x.strokeStyle = '#000'; x.lineWidth = 1.5; x.beginPath(); x.arc(X(m.x), Y(m.y) - 9, 6, 0, 7); x.moveTo(X(m.x) - 5, Y(m.y) - 6); x.lineTo(X(m.x), Y(m.y)); x.lineTo(X(m.x) + 5, Y(m.y) - 6); x.fill(); x.stroke();
    x.font = 'bold 10px system-ui'; x.fillStyle = '#fff'; x.fillText(m.label, X(m.x), Y(m.y) - 18); }
  const p = player.pos, px = X(p.x), py = Y(-p.z);
  x.save(); x.translate(px, py); x.rotate(-player.yaw); x.fillStyle = '#ff4a3a'; x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(0, -10); x.lineTo(7, 8); x.lineTo(0, 4); x.lineTo(-7, 8); x.closePath(); x.fill(); x.stroke(); x.restore();
  const q = game.quests[game.S.quest], t = q?.target?.(); if (t) { x.font = '20px system-ui'; x.fillStyle = '#ffd23a'; x.fillText('★', X(t.x), Y(-t.z) + 7); }
  x.strokeStyle = '#d9c38a'; x.lineWidth = 6; x.strokeRect(3, 3, Wd - 6, Ht - 6);
  x.fillStyle = '#d9c38a'; x.font = 'bold 15px system-ui'; x.textAlign = 'left'; x.fillText('N ↑   Wanderkarte Nordwald', 14, 24);
  const nf = game.places.filter(p => S.found[p.id]).length; x.font = '12px system-ui'; x.fillText(`Entdeckt: ${nf}/${game.places.length} · Klick = Wegmarker setzen/löschen · N = Marker hier`, 14, Ht - 14);
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
  if (active) game.combat.update(dt, 1 - sky.darkness(game.S.time), rmb); else game.combat.update(0, 1 - sky.darkness(game.S.time), false);
  const wantFov = player.zoom ? 20 : game.combat.scope ? 18 : game.combat.aim > .5 ? 58 : 72;
  camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 10); camera.updateProjectionMatrix();
  $('scope').style.display = game.combat.scope ? 'block' : 'none';
  sky.update(game.S.time, player.pos, dt);
  hudT -= dt;
  if (hudT < 0) {
    hudT = .1;
    ui.stats(game.S.stats);
    const extra = (game.strom() ? ' · ⚡' : '') + (game.S.flags.flashOn ? ` · 🔦${Math.round(game.S.battery)}%` : '') + (game.torchOn ? ' · 🔥' : '') + (game.waiting ? ' · ⏩' : '') + (game.roof ? ' · 🏠' : '');
    $('weaponhud').textContent = game.combat.hud();
    $('buildhint').style.display = game.build.ghost ? 'block' : 'none';
    if (game.build.ghost) $('buildhint').textContent = `${game.build.bp.icon} ${game.build.bp.name} – ${game.build.valid ? 'Linksklick / E: hier bauen' : game.build.why} · R / Mausrad: drehen · X: abbrechen`;
    game.highlight(target, player.pos);
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
  // waypoints on screen (pins with distance)
  const pins = $('pins'); let ph = '';
  if (playing) for (const m of game.S.marks) {
    v.copy(B(m.x, m.y, 0)); v.y = player.pos.y + 1.5; const d = Math.hypot(m.x - player.pos.x, m.y + player.pos.z); if (d < 3) continue;
    v.project(camera); if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) continue;
    ph += `<div class="pin" style="left:${(v.x + 1) / 2 * innerWidth}px;top:${(1 - v.y) / 2 * innerHeight}px;--c:${m.c}"><i></i><span>${m.label} · ${Math.round(d)} m</span></div>`;
  }
  if (pins.innerHTML !== ph) pins.innerHTML = ph;
  for (const w of W.waterMeshes) { /* gentle shimmer */ w.material.opacity = .74 + .04 * Math.sin(performance.now() / 700); }
  cullT -= dt; if (cullT < 0) { cullT = .25; W.cull(camera.position); }
  // sun shadow map: every 2nd frame is enough (the shadow matrix stays consistent with the last shadow render)
  renderer.shadowMap.needsUpdate = (frameN++ & 1) === 0 || dt > .03;
  renderer.render(scene, camera);
  game.combat.render(renderer);
}
if (AUTO) { playing = true; ui.renderHotbar(game.S.inv, game.S.sel); }
frame();
