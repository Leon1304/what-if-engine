// What If Town — Spiel-Hülle (M0). Ablauf: ruhige Stadt → Karte wählen → zielen → Klick → Countdown (lädt die neue Welt) → umschalten, abspielen.
import { SCENARIOS, byId } from './scenarios.js';
import { World, camHash } from './world.js';
import { Sound } from './audio.js';

const $ = id => document.getElementById(id);
const host = $('worlds'), sound = new Sound();
const S = {
  mode: 'boot',          // boot · city · aim · countdown · play
  city: null,            // ruhige Stadt (bleibt geladen)
  active: null,          // sichtbare Welt
  pending: null,         // Welt, die im Hintergrund lädt
  scen: null,            // gewähltes Szenario (Karte)
  target: null,          // [x, z] Einschlagsort
  rate: 1,
  timings: {},           // Ladezeiten (ms) für check.mjs / Konsole
  errors: []
};
const MAXR = 260;        // weiter draußen gibt es nur Hügel: dort wird nicht gezielt
const QUALITY = new URLSearchParams(location.search).get('q');   // ?q=low → Welten ohne Schatten (langsame Rechner)

// ---------- Meldungen ----------
let toastT = 0;
function toast(msg, err = false, ms = 3200) { const el = $('toast'); el.textContent = msg; el.classList.toggle('err', err); el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms); }
function hint(html) { const el = $('hint'); if (!html) { el.classList.remove('show'); return; } el.innerHTML = html; el.classList.add('show'); }
function phase(txt) { $('phase').textContent = txt; }
function onWorldError(msg) { S.errors.push(msg); toast('Fehler in der 3D-Welt: ' + msg, true, 6000); }

// ---------- Karten ----------
for (const sc of SCENARIOS) {
  const b = document.createElement('button'); b.className = 'card'; b.dataset.id = sc.id; b.disabled = !!sc.locked;
  b.innerHTML = `<div class="ic">${sc.icon}</div><b>${sc.name}<em>${sc.tag}</em></b><span>${sc.text}</span>`;
  b.title = sc.locked ? `${sc.name} – kommt bald` : `${sc.name}: Ort in der Stadt wählen`;
  b.addEventListener('click', () => { b.blur(); pickCard(sc); });
  $('cards').appendChild(b);
}
function markCard(id) { for (const c of document.querySelectorAll('.card')) c.classList.toggle('sel', c.dataset.id === id); }

// ---------- Welten umschalten ----------
function activate(w) {
  const prev = S.active;
  if (prev && prev !== w && prev.api && w.api) w.api.cam(prev.api.cam());   // Kamera-Stand übernehmen
  w.show(true); if (prev && prev !== w) prev.show(false);
  S.active = w;
  w.api.setRate(S.rate);
  hookKeys(w);
  setupTimeline(w);
}
function hookKeys(w) {   // hat das iframe den Fokus, kommen Tasten dort an: Leertaste, Esc, 1–4, R auch dann für die Hülle
  if (w._keys) return; w._keys = true;
  w.win.addEventListener('keydown', e => onKey(e, true));
}

async function boot() {
  const t0 = performance.now(), tick = setInterval(() => { $('bootmsg').textContent = `Stadt wird gebaut … ${Math.round((performance.now() - t0) / 1000)} s`; }, 250);
  try {
    S.city = new World(host, { s: 'none', q: QUALITY }, { onError: onWorldError }); S.city.loop = true;
    await S.city.ready;
  } catch (e) { clearInterval(tick); $('bootmsg').textContent = 'Die Stadt konnte nicht geladen werden: ' + e.message; return; }
  clearInterval(tick);
  S.timings.city = Math.round(S.city.loadMs); console.log(`[Sandbox] Stadt geladen in ${(S.city.loadMs / 1000).toFixed(1)} s`);
  activate(S.city); S.city.api.seek(0); S.city.api.play();   // seek(0): erstes Bild der Engine kann dt < 0 haben → Schleifen-Uhr springt sonst ans Ende
  $('boot').classList.add('gone'); setTimeout(() => $('boot').remove(), 700);
  toCity();
}
function toCity() {
  S.mode = 'city'; S.scen = null; markCard(null); hint(null);
  phase('Ruhige Stadt · wähle ein Szenario'); $('reset').disabled = true;
}

// ---------- Zielen ----------
let offAim = [];
function stopAim() { for (const f of offAim) f(); offAim = []; S.city?.api?.aim(false); }
async function pickCard(sc) {
  if (sc.locked || S.mode === 'boot' || S.mode === 'countdown') return;
  if (S.active !== S.city) resetCity();
  stopAim(); S.mode = 'aim'; S.scen = sc; markCard(sc.id);
  const L = S.city.api; L.aim(true);
  phase(`${sc.name} · Ort wählen`);
  hint(`Klick auf die Stadt: Ort für <b>${sc.name}</b> wählen · <kbd>Esc</kbd> abbrechen`);
  const inRange = p => p && Math.hypot(p[0], p[2]) < MAXR;
  offAim.push(L.on('move', e => { if (S.mode !== 'aim') return; L.marker(e.point ? e.point : null, sc.aim.r, inRange(e.point) ? sc.aim.color : '#9aa0aa'); }));
  offAim.push(L.on('click', e => { if (S.mode !== 'aim') return;
    if (!inRange(e.point)) { toast('Zu weit draußen – ziel auf die Stadt.'); return; }
    fire(sc, [e.point[0], e.point[2]]); }));
}
function cancel() {
  if (S.mode === 'aim') { stopAim(); S.city.api.marker(null); toCity(); }
  else if (S.mode === 'countdown') { cdAbort = true; S.pending?.destroy(); S.pending = null; S.city.api.marker(null); $('countdown').classList.remove('show'); toCity(); }
}

// ---------- Auslösen: Countdown überdeckt das Laden ----------
let cdAbort = false;
async function fire(sc, at) {
  stopAim(); S.mode = 'countdown'; S.target = at; cdAbort = false; hint(null);
  const L = S.city.api; L.marker([at[0], 0, at[1]], sc.aim.r, sc.aim.color);
  phase(`${sc.name} · Countdown`);
  const r = v => Math.round(v * 10) / 10;
  const w = S.pending = new World(host, { s: sc.id, x: r(at[0]), z: r(at[1]), r: sc.aim.r, from: Math.round(L.cam().az + 110), cam: camHash(L.cam()), play: 0, q: QUALITY }, { onError: onWorldError });
  const t0 = performance.now(), cd = $('countdown'), n = $('cdn'), s = $('cds'); cd.classList.add('show');
  for (const k of [3, 2, 1]) {
    n.className = 'n'; n.textContent = k; void n.offsetWidth; s.textContent = '';
    await new Promise(res => setTimeout(res, 1000)); if (cdAbort) return;
  }
  let done = false; w.ready.then(() => { done = true; }, () => {});
  if (!done) { n.className = 'n small'; }
  while (!done) {   // noch nicht fertig gebaut: kleine Anzeige statt Zahl
    n.textContent = 'Einschlag wird berechnet …'; s.textContent = `${Math.round((performance.now() - t0) / 1000)} s`;
    await new Promise(res => setTimeout(res, 200)); if (cdAbort) return;
  }
  cd.classList.remove('show');
  if (cdAbort || S.pending !== w) return;
  S.timings.scenario = Math.round(w.loadMs); console.log(`[Sandbox] ${sc.name} geladen in ${(w.loadMs / 1000).toFixed(1)} s`);
  // umschalten: alte Szene weg, Stadt pausiert im Hintergrund
  const old = S.active; S.pending = null;
  w.loop = false; w.api.seek(0); activate(w); w.api.play();
  L.marker(null); S.city.api.pause();
  if (old && old !== S.city) old.destroy();
  S.mode = 'play'; $('reset').disabled = false;
  phase(`${sc.name} · Szenario läuft`);
}

function resetCity() {
  if (!S.city) return;
  stopAim(); cancel();
  const old = S.active; if (old === S.city) { toCity(); return; }
  S.city.api.marker(null); activate(S.city); S.city.api.play();
  if (old) old.destroy();
  toCity(); toast('Die Stadt steht wieder.');
}

// ---------- Zeitleiste ----------
const seek = $('seek');
let dragging = false;
function setupTimeline(w) {
  const L = w.api; seek.max = L.dur; seek.disabled = false;
  for (const m of $('track').querySelectorAll('.mark')) m.remove();
  const sc = w.params.s !== 'none' ? byId(w.params.s) : null;
  for (const [t, txt] of sc?.marks ?? []) { const m = document.createElement('div'); m.className = 'mark'; m.style.left = (t / L.dur * 100) + '%'; m.textContent = txt; $('track').appendChild(m); }
  $('restart').disabled = false;
}
seek.addEventListener('input', () => { dragging = true; S.active?.api.seek(+seek.value); });
seek.addEventListener('change', () => { dragging = false; seek.blur(); });
seek.addEventListener('pointerup', () => { dragging = false; });
function togglePlay() { const L = S.active?.api; if (!L) return; if (L.playing) L.pause(); else L.play(); }
function restart() { const L = S.active?.api; if (!L) return; L.seek(0); L.play(); }
function setRate(r) {
  S.rate = r; S.active?.api.setRate(r);
  for (const b of $('speed').children) b.classList.toggle('on', +b.dataset.r === r);
}
$('play').addEventListener('click', e => { e.currentTarget.blur(); togglePlay(); });
$('restart').addEventListener('click', e => { e.currentTarget.blur(); restart(); });
$('reset').addEventListener('click', e => { e.currentTarget.blur(); resetCity(); });
for (const b of $('speed').children) b.addEventListener('click', () => { b.blur(); setRate(+b.dataset.r); });

// ---------- Ton ----------
$('snd').addEventListener('click', async e => {
  const b = e.currentTarget; b.blur();
  if (sound.on) { sound.disable(); b.classList.remove('on'); b.querySelector('.ico').textContent = '🔇'; return; }
  await sound.enable(); b.classList.add('on'); b.querySelector('.ico').textContent = '🔊';
});
$('help').addEventListener('click', e => { e.currentTarget.blur(); $('helpbox').classList.toggle('show'); });

// ---------- Tasten ----------
const FWD = /^(Key[WASDQE]|Arrow(Up|Down|Left|Right))$/;
function onKey(e, fromWorld = false) {
  if (e.target?.tagName === 'INPUT' && e.code !== 'Space' && e.code !== 'Escape') return;
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) togglePlay(); return; }
  if (e.code === 'Escape') { cancel(); $('helpbox').classList.remove('show'); return; }
  if (e.code === 'KeyR' && !e.metaKey && !e.ctrlKey) { restart(); return; }
  const n = '1234'.indexOf(e.key); if (n >= 0 && !e.metaKey && !e.ctrlKey) { setRate([0.25, 0.5, 1, 2][n]); return; }
  if (!fromWorld && FWD.test(e.code) && S.active?.win) {   // Kamera-Tasten an die Welt weiterreichen (die Hülle hat den Fokus)
    e.preventDefault(); S.active.win.dispatchEvent(new KeyboardEvent('keydown', { code: e.code, key: e.key }));
  }
}
window.addEventListener('keydown', e => onKey(e));
window.addEventListener('keyup', e => { if (FWD.test(e.code) && S.active?.win) S.active.win.dispatchEvent(new KeyboardEvent('keyup', { code: e.code, key: e.key })); });
window.addEventListener('blur', () => { if (S.active?.win && document.activeElement?.tagName !== 'IFRAME') S.active.win.dispatchEvent(new Event('blur')); });

// ---------- jedes Bild: Zeitleiste, Zähler, Ton ----------
const statEls = new Map(), fmtT = t => t.toFixed(1).replace('.', ',');
let lastPlaying = null;
function frame() {
  const w = S.active, L = w?.api;
  if (L) {
    const t = L.t, dur = L.dur;
    if (!dragging) seek.value = t;
    seek.style.setProperty('--p', (t / dur * 100).toFixed(2) + '%');
    $('time').textContent = `${fmtT(t)} / ${fmtT(dur)} s`;
    if (L.playing !== lastPlaying) { lastPlaying = L.playing; $('play').textContent = L.playing ? '⏸' : '▶'; }
    let st = []; try { st = L.stats(); } catch (e) {}
    const seen = new Set();
    for (const s of st) {
      seen.add(s.label); let el = statEls.get(s.label);
      if (!el) { el = document.createElement('div'); el.className = 'stat glass'; el.innerHTML = '<small></small><b></b>'; el.firstChild.textContent = s.label; $('stats').appendChild(el); statEls.set(s.label, el); el._v = null; }
      if (el._v !== s.text) { el.lastChild.textContent = s.text; el._v = s.text; }
      el.classList.toggle('bad', s.bad && s.value > 0); el.classList.toggle('hot', s.up === 'bad' && s.value > 0);
    }
    for (const [k, el] of statEls) if (!seen.has(k)) { el.remove(); statEls.delete(k); }
    const box = $('stats'); st.forEach((s, i) => { const el = statEls.get(s.label); if (box.children[i] !== el) box.insertBefore(el, box.children[i] ?? null); });   // Reihenfolge wie in STATS
    if (S.mode === 'play' && !L.playing && t >= dur - 0.01 && !w._endShown) { w._endShown = true; toast('Ende – ↺ für noch einmal, oder ein neues Szenario wählen.', false, 4500); }
  }
  sound.sync(w);
  $('snd').title = sound.on && w && !w.audio ? 'Ton wird berechnet …' : 'Ton an/aus';
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// für tools/check.mjs und zum Ausprobieren in der Konsole
window.sandbox = {
  get mode() { return S.mode; }, get active() { return S.active; }, get city() { return S.city; }, get timings() { return S.timings; }, get errors() { return S.errors; },
  pick: id => pickCard(byId(id)), fire: (id, x, z) => fire(byId(id), [x, z]), reset: resetCity, setRate
};
boot();
