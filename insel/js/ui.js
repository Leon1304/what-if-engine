// Oberfläche der Schwebeinsel: Startmenü, HUD, Stapel, Rückmeldungen, Anleitung, Handbuch, Fotomodus, Ende, Einstellungen, Speicherplätze.
//   const ui = new UI(app); ui.frame(dt) jedes Bild; ui.notify(type, data) für App-Ereignisse.
// Alles im DOM über dem 3D-Bild (#ui). Kein window.alert/confirm/prompt.
import { TILES, KINDS, UNLOCKS, GROUP, GROUP_NAMES, BIOME_NAMES, affinity } from './tiles.js';
import { MILESTONES, START_TILES } from './game.js';
import { neighbor, unkey } from './hex.js';
import * as store from './storage.js';

// ---------- Texte und Tabellen ----------
const GROUP_ICON = { wald: '🌲', feld: '🌾', dorf: '🏘️', wasser: '💧', berg: '⛰️' };
const SEASONS = ['Frühling', 'Sommer', 'Herbst', 'Winter'], SEASON_ICON = ['🌷', '🌻', '🍂', '❄️'];
const FILTERS = [['normal', 'Normal'], ['gold', 'Goldene Stunde'], ['film', 'Film'], ['sw', 'Schwarzweiß'], ['miniatur', 'Miniatur'], ['nacht', 'Nacht']];
const WEATHER = [['auto', 'Automatisch'], ['klar', 'Klar'], ['gewitter', 'Gewitter'], ['regen', 'Regen'], ['schnee', 'Schnee'], ['nebel', 'Nebel']];
const WEATHER_ICON = { gewitter: '⛈️', regen: '🌧️', schnee: '🌨️', nebel: '🌫️' };
const MODES = {
  klassisch: { e: '🃏', name: 'Klassisch', d: `${START_TILES} Kacheln im Stapel. Gute Züge bringen neue – bis der Stapel leer ist.` },
  endlos: { e: '♾️', name: 'Endlos', d: 'Immer Nachschub, kein Ende. Zum entspannten Weiterbauen.' },
  kreativ: { e: '🎨', name: 'Kreativ', d: 'Alle Kacheln frei wählbar. Bau einfach, was dir gefällt.' },
};
const ISLAND_NAMES = ['Wolkenhain', 'Moosbucht', 'Sonnenfels', 'Kleeblatt', 'Himmelsau', 'Federwiese', 'Lindenruh', 'Nebelbach', 'Tannenhügel', 'Honigtal', 'Apfelhain', 'Sternwiese'];
const EDGE_COL = { g: '#6aa84f', w: '#3f8fd0', r: '#a8743f', l: '#8fcbe8' };
const EDGE_NAME = { g: 'Land', w: 'Bach', r: 'Weg', l: 'Seeufer' };
const BIOME_COL = { wiese: '#a9d26f', wald: '#4f8a3c', wasser: '#86c3e8', feld: '#e6c55e', dorf: '#dcbf92', berg: '#a3a3a3' };
const REP = { wiese: 'wiese', wald: 'wald', wasser: 'bach', feld: 'feld', dorf: 'haus', berg: 'berg' };   // Vertreter je Biom (ohne Sonder-Vorlieben)
// Steuerung fürs Handbuch (an main.js anpassen, falls dort andere Tasten gelten)
const CONTROLS = {
  maus: [['Ziehen', 'Insel drehen und kippen'], ['Mausrad', 'heran- und wegzoomen (bis ganz nah)'], ['Klick auf freies Feld', 'Kachel setzen'],
    ['Rechtsklick', 'Kachel drehen'], ['Klick auf Gebäude', 'heranfliegen und Infos lesen']],
  touch: [['Ein Finger ziehen', 'Insel drehen'], ['Zwei Finger', 'zoomen und drehen'], ['Tippen', 'Kachel setzen'], ['↻-Knopf', 'Kachel drehen']],
  keys: [['R', 'Kachel drehen'], ['1 · 2 · 3', 'Kachel aus dem Stapel wählen'], ['Strg + Z', 'Rückgängig (bis zu 10 Kacheln)'], ['B', 'Handbuch'],
    ['P', 'Fotomodus'], ['Esc', 'Menü / zurück']],
};
// Geführter Einstieg (Fortschritt in game.S.tut)
const TUT = [
  { t: 'Willkommen auf deiner Insel!', x: 'Zieh mit der Maus (oder dem Finger), um dich umzusehen, und zoome mit dem Mausrad (oder zwei Fingern).', need: [['camRotate', 'Umsehen'], ['zoom', 'Zoomen']] },
  { t: 'Die erste Kachel', x: 'Unten liegt dein Stapel. Klick auf ein freies Feld am Inselrand – die große Kachel landet dort.', at: 'stack', on: 'place' },
  { t: 'Drehen', x: 'Drück R, mach einen Rechtsklick oder tipp auf ↻, um die Kachel vor dem Setzen zu drehen.', at: 'stack', on: 'tileRotate' },
  { t: 'Punkte-Vorschau', x: 'Fahr über ein freies Feld: Die kleine Karte zeigt vorher, wie viele Punkte du bekommst und warum. Minuspunkte gibt es nie.', on: 'hoverOk', btn: 'Verstanden' },
  { t: 'Bäche verbinden', x: 'Wasserkanten müssen an einen Bach oder See stoßen (oder ins Leere). Leg einen Bach an einen Bach: +3 Punkte.', on: 'place', test: d => d.parts?.some(p => /Bach/.test(p.label || '')), btn: 'Später' },
  { t: 'Ein Haus am Weg', x: 'Häuser haben vorn eine Wegkante. Dreh sie zu einem Weg – zum Beispiel am Brunnen. Weg an Weg: +2.', on: 'place', test: d => d.parts?.some(p => p.label === 'Weg verbunden'), btn: 'Später' },
  { t: 'Ganz nah ran', x: 'Zoom an ein Gebäude heran, bis du die Fenster siehst, und klick es an.', on: 'buildingClick', point: true, btn: 'Später' },
  { t: 'Dein erster Meilenstein', x: 'Bau 5 gleiche Kacheln in einem Stück, etwa 5 Wälder. Meilensteine bringen Punkte und neue Kacheln.', on: 'place', test: d => d.milestones?.length > 0 },
];

// ---------- kleine Helfer ----------
function h(tag, a, ...kids) {
  const [t, ...cls] = tag.split('.'), el = document.createElement(t || 'div');
  if (cls.length) el.className = cls.join(' ');
  for (const [k, v] of Object.entries(a || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(3)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
const fmtTime = x => { x = ((x % 24) + 24) % 24; const hh = Math.floor(x), mm = Math.floor((x - hh) * 60); return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; };
const fmtNum = n => Math.round(n).toLocaleString('de-DE');
const fmtDur = s => { s = Math.round(s || 0); const hh = Math.floor(s / 3600), mm = Math.floor(s / 60) % 60; return hh ? `${hh} h ${mm} min` : `${Math.max(1, mm)} min`; };
function ago(ts) {
  const s = (Date.now() - ts) / 1000; if (!ts) return '';
  if (s < 60) return 'gerade eben'; if (s < 3600) return `vor ${Math.floor(s / 60)} Min.`; if (s < 86400) return `vor ${Math.floor(s / 3600)} Std.`;
  return new Date(ts).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
}
const isField = el => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
const groupOfKind = k => GROUP[k];
function partLabel(kind, nk, p) {
  if (p.label) return p.label;
  const A = TILES[kind], B = TILES[nk]; if (!A || !B) return '';
  if (A.likes?.[B.biome] === p.pts) return `${BIOME_NAMES[B.biome]} für ${A.name}`;
  if (B.likes?.[A.biome] === p.pts) return `${B.name} freut sich`;
  if (A.biome === B.biome) return `${GROUP_NAMES[GROUP[kind]] || BIOME_NAMES[A.biome]} angeschlossen`;
  return `neben ${B.name}`;
}
const edgeAt = (base, i, d = 4.5, y = .6) => { const a = i * Math.PI / 3; return [base[0] + Math.cos(a) * d, base[1] + y, base[2] + Math.sin(a) * d]; };
const up = (p, y) => [p[0], p[1] + y, p[2]];
function edgeSvg(kind) {
  const T = TILES[kind], c = i => { const a = (60 * i - 30) * Math.PI / 180; return [50 + 40 * Math.cos(a), 50 + 40 * Math.sin(a)]; };
  let s = `<svg viewBox="0 0 100 100" aria-label="Kanten"><polygon points="${[0, 1, 2, 3, 4, 5].map(i => c(i).join(',')).join(' ')}" fill="${BIOME_COL[T.biome] || '#ccc'}" opacity=".55"/>`;
  for (let i = 0; i < 6; i++) { const [x1, y1] = c(i), [x2, y2] = c(i + 1); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${EDGE_COL[T.edges[i]]}" stroke-width="9" stroke-linecap="round"/>`; }
  return s + `<text x="50" y="60" text-anchor="middle" font-size="28">${T.icon}</text></svg>`;
}

export class UI {
  constructor(app) {
    this.app = app; this.game = app.game;
    this.root = document.getElementById('ui') || document.body.appendChild(h('div', { id: 'ui' }));
    this.root.textContent = '';
    this.mode = 'boot'; this.slot = 0; this.screens = []; this.dialogs = [];
    this.shown = 0; this.lastShown = -1; this.items = []; this.flags = []; this.hov = null; this.tutSeen = new Set();
    this.banners = []; this.bannerBusy = false; this.clockT = 0; this.filter = 'normal';
    this._build();
    store.onError(t => this.toast(t, 'err'));
    const s = store.loadSettings();
    if (s && app.settings) { Object.assign(app.settings, s); try { app.applySettings?.(app.settings); } catch (e) { console.warn(e); } }
    this.auto = store.createAutosave({ game: this.game, app, slot: () => this.slot, active: () => this.mode === 'play' || this.mode === 'photo' });
    this.game.on((t, d) => this._onGame(t, d));
    addEventListener('keydown', e => this._onKey(e));
    // Eingaben in Feldern und Klicks/Scrollen in der Oberfläche nicht an Kamera-Steuerung (window) weiterreichen
    for (const ev of ['keydown', 'keyup', 'keypress']) this.root.addEventListener(ev, e => { if (isField(e.target) && e.key !== 'Escape') e.stopPropagation(); });
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart', 'mousedown', 'dblclick']) this.root.addEventListener(ev, e => e.stopPropagation(), { passive: true });
    const flush = () => { try { this.auto.flush(); } catch { } };
    addEventListener('pagehide', flush); document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
    if (this.game.S) this._renderAll();
  }

  // ================= öffentliche Schnittstelle =================
  get typing() { return isField(document.activeElement); }
  // true, solange Menüs/Dialoge offen sind oder getippt wird → Kamera/Setzen in main.js pausieren
  get blocking() { return this.screens.length > 0 || this.dialogs.length > 0 || this.mode === 'menu' || this.mode === 'boot' || this.typing; }
  get photo() { return this.mode === 'photo'; }

  notify(type, d = {}) {
    switch (type) {
      case 'ready': this._boot(); break;
      case 'thumbs': this._renderStack(); this._refreshBook(); break;
      case 'zoom': case 'camRotate': case 'tileRotate': this._tutEvent(type, d); break;
      case 'hover': this._hover(d); break;
      case 'buildingClick': this.showInfo(d.name || 'Gebäude', d.text || ''); this._tutEvent('buildingClick', d); break;
      case 'tileInfo': this._tileInfo(d.q, d.r); break;
    }
  }

  frame(dt) {
    dt = Math.min(Math.max(dt || 0, 0), .25);
    const S = this.game.S; if (!S) return;
    if (this.mode === 'play') S.stats.playtime = (S.stats.playtime || 0) + dt;
    this.auto.tick(dt);
    // Punkte zählen hoch
    const target = S.score;
    if (this.shown !== target) { const d = target - this.shown; this.shown += Math.abs(d) < .5 ? d : d * Math.min(1, dt * 5) + Math.sign(d) * dt * 4; }
    const si = Math.round(this.shown);
    if (si !== this.lastShown) { this.lastShown = si; this.el.num.textContent = fmtNum(si); this._progress(); }
    // Elemente an 3D-Positionen
    const now = performance.now(); const sp = p => this.app.screenPos(p) || { visible: false };
    const placed = [];
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (it.until && now > it.until) { it.el.remove(); this.items.splice(i--, 1); continue; }
      const p = sp(it.pos); it.el.style.visibility = p.visible ? '' : 'hidden'; if (!p.visible) continue;
      let y = p.y;
      if (it.stack) {   // Punkte-Schilder einer Kachel nicht übereinander
        const w = it.w || (it.w = it.el.firstChild.offsetWidth || 120);
        for (let n = 0, k = 0; k < placed.length && n < 12; k++) { const o = placed[k]; if (Math.abs(o.x - p.x) < (o.w + w) / 2 + 4 && Math.abs(o.y - y) < 30) { y = o.y - 31; k = -1; n++; } }
        placed.push({ x: p.x, y, w });
      }
      it.el.style.transform = `translate(${p.x.toFixed(1)}px,${y.toFixed(1)}px)`;
    }
    for (const f of this.flags) { const p = sp(f.pos); f.el.style.visibility = p.visible ? '' : 'hidden'; if (p.visible) f.el.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)`; }
    if (this.hov?.els) for (const e of this.hov.els) { const p = sp(e.pos); e.el.style.visibility = p.visible ? '' : 'hidden'; if (p.visible) e.el.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)`; }
    if (this.pointer) { const p = sp(this.pointer.pos); this.pointer.el.style.visibility = p.visible ? '' : 'hidden'; if (p.visible) this.pointer.el.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)`; }
    if ((this.clockT -= dt) <= 0) { this.clockT = .5; this._clock(); }
  }

  toast(text, kind = '') {
    const t = h('div.toast.chip' + (kind ? '.' + kind : ''), {}, text); this.el.toasts.append(t);
    setTimeout(() => t.remove(), 4100);
    while (this.el.toasts.children.length > 3) this.el.toasts.firstChild.remove();
  }
  confirm({ title, text = '', ok = 'OK', cancel = 'Abbrechen', danger = false }) {
    return new Promise(res => {
      const d = this._dialog(res, false);
      d.box.append(h('h2', {}, title), text && h('p', {}, text),
        h('div.row.end', {}, this._btn(cancel, 'ghost', () => d.done(false)), this._btn(ok, danger ? 'danger' : 'main', () => d.done(true), { autofocus: true })));
      d.focus();
    });
  }
  prompt({ title, text = '', value = '', ok = 'OK', cancel = 'Abbrechen', max = 40 }) {
    return new Promise(res => {
      const d = this._dialog(res, null);
      const inp = h('input', { type: 'text', value, maxlength: max, spellcheck: 'false' });
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') d.done(inp.value.trim() || null); });
      d.box.append(h('h2', {}, title), text && h('p', {}, text), h('label.f', {}, inp),
        h('div.row.end', {}, this._btn(cancel, 'ghost', () => d.done(null)), this._btn(ok, 'main', () => d.done(inp.value.trim() || null))));
      setTimeout(() => { inp.focus(); inp.select(); }, 30);
    });
  }
  showInfo(title, text, ms = 10000) {
    this.el.info.textContent = ''; clearTimeout(this._infoT);
    this.el.info.append(h('h3', {}, title), text && h('p', {}, text), h('div.x', {}, this._btn('✕', 'ghost small', () => this.hideInfo(), { 'aria-label': 'Schließen' })));
    this.el.info.style.display = ''; this.el.info.style.animation = 'none'; void this.el.info.offsetWidth; this.el.info.style.animation = '';
    this._infoT = setTimeout(() => this.hideInfo(), ms);
  }
  hideInfo() { this.el.info.style.display = 'none'; }
  openMenu() { this._menu(); }
  openBook(page) { this._book(page); }
  enterPhoto() { this._enterPhoto(); }

  // ================= Aufbau =================
  _build() {
    const R = this.root, el = this.el = {};
    el.num = h('span.num', {}, '0'); el.gain = h('span.gain'); el.bar = h('i'); el.next = h('div.next'); el.name = h('span');
    el.score = h('div.score.chip.live', { title: 'Punkte und nächste Freischaltung' }, h('div.lbl', {}, h('span', {}, 'Punkte'), el.name), h('div', {}, el.num, el.gain), h('div.bar', {}, el.bar), el.next);
    el.clock = h('div.clock.chip');
    el.undo = this._btn('↶', 'icon', () => this._undo(), { title: 'Rückgängig (Strg+Z)', kbd: 'Strg Z', 'aria-label': 'Rückgängig' });
    const btns = h('div.btns.live', {}, el.undo,
      this._btn('📖', 'icon', () => this._book(), { title: 'Handbuch (B)', kbd: 'B', 'aria-label': 'Handbuch' }),
      this._btn('📷', 'icon', () => this._enterPhoto(), { title: 'Fotomodus (P)', kbd: 'P', 'aria-label': 'Fotomodus' }),
      this._btn('☰', 'icon', () => this._menu(), { title: 'Menü (Esc)', kbd: 'Esc', 'aria-label': 'Menü' }));
    el.hud = h('div.hud', {}, el.score, el.clock, h('div.spacer'), btns);
    el.stack = h('div.stackbar');
    el.fx = h('div.fx'); el.banner = h('div.banner'); el.cards = h('div.cards'); el.tut = h('div.tut');
    el.info = h('div.info.panel.live', { style: { display: 'none' } }); el.toasts = h('div.toasts'); el.screens = h('div.screens');
    el.notes = h('div.notes', {}, el.banner, el.cards, el.info, el.toasts);   // auf dem Handy eine Spalte unter dem HUD
    R.append(el.fx, el.hud, el.stack, el.tut, el.notes, el.screens);
    R.classList.add('menu');
  }
  _btn(label, cls, fn, a = {}) {
    const { kbd, ...rest } = a;
    const b = h('button.btn' + (cls ? '.' + cls.split(' ').join('.') : ''), { type: 'button', ...rest }, label, kbd && matchMedia('(hover: hover)').matches && h('kbd', {}, kbd));
    b.addEventListener('click', e => { if (b.disabled) return; this._sfx('click'); fn(e); });
    return b;
  }
  _sfx(name) { try { this.app.audio?.play?.(name); } catch { } }
  _thumb(k) { try { return this.app.thumb?.(k) || null; } catch { return null; } }
  _im(k, cls = 'im') {
    const src = this._thumb(k);
    return h('div.' + cls, {}, src ? h('img', { src, alt: TILES[k].name, draggable: 'false' }) : h('span.em', {}, TILES[k].icon));
  }

  // ================= Spielereignisse =================
  _onGame(type, d) {
    if (type === 'reset') { this._clearFx(); this.shown = this.game.S.score; this.lastShown = -1; this._renderAll(); }
    else if (type === 'place') { this._onPlace(d); this._renderStack(); this._renderFlags(); this._hud(); this.auto.touch(); this._tutEvent('place', d); }
    else if (type === 'stack') { this._renderStack(); }
    else if (type === 'unlock') { this._sfx('unlock'); this._unlockCard(d.kinds || []); }
    else if (type === 'undo') { this._renderAll(); this.auto.touch(); this.toast('Letzte Kachel zurückgenommen.'); }
    else if (type === 'end') { clearTimeout(this._endT); this._endT = setTimeout(() => { if (this.mode === 'play' && !this.game.S.stack.length) this._end(); }, 1800); }
  }
  _renderAll() { this._hud(); this._renderStack(); this._renderFlags(); this._renderTut(); this._progress(); this._clock(); }
  _hud() {
    const S = this.game.S; if (!S) return;
    this.el.name.textContent = S.name || ''; this.el.undo.disabled = !this.game.canUndo();
    this.root.classList.toggle('kreativ', S.mode === 'kreativ');
  }
  _progress() {
    const S = this.game.S; if (!S) return;
    const nu = this.game.nextUnlock(), v = Math.round(this.shown);
    if (!nu) { this.el.bar.style.width = '100%'; this.el.next.textContent = S.mode === 'kreativ' ? '🎨 Kreativ: alle Kacheln frei' : '✨ Alle Kacheln freigeschaltet'; return; }
    const prev = Math.max(0, ...UNLOCKS.filter(u => u.at <= v && u.at !== Infinity).map(u => u.at));
    this.el.bar.style.width = (Math.max(0, Math.min(1, (v - prev) / (nu.at - prev))) * 100).toFixed(1) + '%';
    this.el.next.textContent = `Bei ${fmtNum(nu.at)}: ${nu.kinds.map(k => TILES[k].icon + ' ' + TILES[k].name).join(', ')}`;
  }
  _clock() {
    const S = this.game.S, st = this.app.settings || {}; if (!S) return;
    let env = {}; try { env = (typeof this.app.env === 'function' ? this.app.env() : this.app.env) || {}; } catch { }
    const t = env.time ?? (st.dayCycle === false && st.time != null ? st.time : S.time ?? 12);
    const season = env.season ?? (st.season !== 'auto' && st.season != null ? +st.season : null);
    const ic = t >= 6 && t < 8 ? '🌅' : t >= 8 && t < 18 ? '☀️' : t >= 18 && t < 20.5 ? '🌇' : '🌙';
    const w = WEATHER_ICON[env.weather || (st.weather !== 'auto' ? st.weather : '')] || '';
    const txt = `${ic} ${fmtTime(t)}${season != null && SEASONS[season] ? ` · ${SEASON_ICON[season]} ${SEASONS[season]}` : ''}${w ? ' ' + w : ''} · Tag ${S.day || 1}`;
    if (this.el.clock.textContent !== txt) this.el.clock.textContent = txt;
  }

  // ---------- Stapel ----------
  _card(k, { sel, quest, onclick, i }) {
    const T = TILES[k], src = this._thumb(k);
    const c = h('div.tc' + (sel ? '.sel' : ''), { title: `${T.name}: ${T.desc}`, role: 'button', tabindex: '0', 'aria-pressed': sel ? 'true' : 'false', 'data-kind': k, 'data-i': i },
      h('div.im', {}, src ? h('img', { src, alt: '', draggable: 'false' }) : h('span.em', {}, T.icon)), src && h('div.ic', {}, T.icon),
      h('div.nm', {}, T.name), quest && h('div.qf', { title: `Aufgabe: Gruppe um ${quest} Kacheln vergrößern` }, '🚩 ' + quest));
    c.addEventListener('click', () => { this._sfx('click'); onclick(); });
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onclick(); } });
    return c;
  }
  _renderStack() {
    const S = this.game.S, box = this.el.stack; if (!S) return; box.textContent = '';
    const rot = h('div.rot.live', {}, this._btn('↺', 'small', () => this.app.rotate?.(-1), { title: 'Gegen den Uhrzeigersinn drehen', 'aria-label': 'Links drehen' }),
      this._btn('↻', 'small', () => this.app.rotate?.(1), { title: 'Drehen (R)', 'aria-label': 'Rechts drehen' }));
    if (S.mode === 'kreativ') {
      const cur = S.stack[0]?.k;
      const pal = h('div.palette.chip.live', {}, KINDS.map(k => this._card(k, { sel: k === cur, onclick: () => this.game.setKind(k) })));
      box.append(h('div.stack.chip.live', { style: { padding: '8px' } }, h('div.meta', {}, h('div.cnt', {}, '🎨', h('small', {}, 'Kreativ')), rot)), pal);
      setTimeout(() => { const c = pal.querySelector('.sel'); if (c) pal.scrollLeft = c.offsetLeft - pal.clientWidth / 2 + c.clientWidth / 2; }, 0);
      return;
    }
    const n = Math.min(3, S.stack.length), st = h('div.stack.chip.live');
    if (!n) st.append(h('div', { style: { padding: '8px 14px', fontWeight: 800 } }, 'Der Stapel ist leer.'), this._btn('Auswertung', 'main small', () => this._end()));
    for (let i = 0; i < n; i++) { const e = S.stack[i]; st.append(this._card(e.k, { sel: i === S.pick, quest: e.quest, i, onclick: () => this.game.pick(i) })); }
    if (n) st.append(h('div.meta', {}, h('div.cnt', {}, S.mode === 'endlos' ? '∞' : S.stack.length, h('small', {}, S.mode === 'endlos' ? 'Endlos' : 'im Stapel')), rot));
    box.append(h('div', { style: { position: 'relative' } }, matchMedia('(hover: hover)').matches && n ? h('div.hint.chip', {}, h('kbd', {}, 'R'), ' drehen · ', h('kbd', {}, '1'), '–', h('kbd', {}, '3'), ' wählen · ', h('kbd', {}, 'Strg Z'), ' zurück') : null, st));
  }
  _undo() {
    if (this.mode !== 'play' || !this.game.canUndo()) { if (this.mode === 'play') this.toast('Nichts zum Rückgängigmachen.'); return; }
    if (this.game.undo()) this._sfx('undo');
  }

  // ---------- Rückmeldungen beim Setzen ----------
  _add(cls, pos, inner, life = 2400, delay = 0) {
    const el = h('div.' + cls, {}, inner); el.style.visibility = 'hidden';
    if (delay) el.firstChild.style.animationDelay = delay + 'ms';
    this.el.fx.append(el); const it = { el, pos, until: performance.now() + life + delay }; this.items.push(it); return it;
  }
  _pop(pos, pts, label, { cls = '', delay = 0 } = {}) {
    const it = this._add('pop' + (cls ? '.' + cls.split(' ').join('.') : ''), pos, h('div.in', {}, h('b', {}, pts), label && h('span', {}, label)), 2400, delay);
    it.stack = true; return it;
  }
  _onPlace(d) {
    const t = d.tile, base = this.app.tilePos(t.q, t.r), seen = new Set(); let j = 0;
    for (const p of d.parts || []) {
      if (!p.pts) continue; const n = this.game.at(...neighbor(t.q, t.r, p.i)), l = partLabel(t.k, n?.k, p);
      this._pop(edgeAt(base, p.i), '+' + p.pts, seen.has(l) ? '' : l, { delay: 120 * j++ }); seen.add(l);   // gleiche Beschriftung nur einmal
    }
    if (d.perfect) this._perfect(base);
    const edgeB = (d.bonus || 0) - (d.perfect ? 10 : 0);
    if (edgeB > 0) this._pop(up(base, 1.2), '+' + edgeB, 'Randbonus', { cls: 'gold', delay: 120 * j++ });
    const kl = this.game.S.mode === 'klassisch';
    for (const q of d.quests || []) {
      const [a, b] = unkey(q.key); this._pop(up(this.app.tilePos(a, b), 2.5), '+30', `Aufgabe erfüllt!${kl ? ' +4 Kacheln' : ''}`, { cls: 'quest big', delay: 300 });
      setTimeout(() => this._sfx('quest'), 300);
    }
    for (const m of d.milestones || []) this._banner(`${GROUP_ICON[m.g] || '⭐'} ${m.name}: ${m.size} Kacheln!`, `+${m.size * 3} Punkte${kl ? ` · +${m.tiles} Kacheln` : ''}`);
    if (d.total > 0) {
      this.el.gain.textContent = '+' + d.total; this.el.gain.classList.add('on'); this.el.num.classList.add('pop');
      clearTimeout(this._gainT); this._gainT = setTimeout(() => { this.el.gain.classList.remove('on'); this.el.num.classList.remove('pop'); }, 1500);
    }
    this._hover(null);
  }
  _perfect(base) {
    this._sfx('perfect');
    const kl = this.game.S.mode === 'klassisch';
    const it = this._add('perfect', up(base, 2), h('div.in', {}, 'Perfekt!', h('small', {}, `+10${kl ? ' · +1 Kachel' : ''}`)), 2300);
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2 + Math.random() * .3, r0 = 20 + Math.random() * 20, r1 = 90 + Math.random() * 80;
      const s = h('i.spark', { style: { position: 'absolute', left: 0, top: 0, animationDelay: Math.random() * 200 + 'ms' } });
      s.style.setProperty('--x0', Math.cos(a) * r0 + 'px'); s.style.setProperty('--y0', Math.sin(a) * r0 - 40 + 'px');
      s.style.setProperty('--x1', Math.cos(a) * r1 + 'px'); s.style.setProperty('--y1', Math.sin(a) * r1 - 40 + 'px'); it.el.append(s);
    }
  }
  _banner(title, sub) {
    this.banners.push([title, sub]); if (this.bannerBusy) return;
    const next = () => {
      const b = this.banners.shift(); if (!b) { this.bannerBusy = false; return; }
      this.bannerBusy = true; this._sfx('milestone');
      const el = h('div.ribbon', {}, h('b', {}, b[0]), h('span', {}, b[1])); this.el.banner.textContent = ''; this.el.banner.append(el);
      setTimeout(() => { el.remove(); next(); }, 3450);
    };
    setTimeout(next, 500);
  }
  _unlockCard(kinds) {
    if (!kinds.length) return;
    const kl = this.game.S.mode === 'klassisch';
    const card = h('div.ucard.panel.live', {}, h('h3', {}, '🎁 Neu freigeschaltet!'),
      kinds.map(k => h('div.it', {}, this._im(k), h('div', {}, h('b', {}, `${TILES[k].icon} ${TILES[k].name}`), h('p', {}, TILES[k].desc)))),
      kl && h('div.note', {}, `Je 2 davon liegen jetzt in deinem Stapel.`),
      h('div.row.end', {}, this._btn('Im Handbuch', 'ghost small', () => { close(); this._book(this._pageOf(kinds[0])); }), this._btn('Prima!', 'main small', () => close())));
    const close = () => { if (!card.isConnected) return; card.classList.add('out'); setTimeout(() => card.remove(), 350); };
    this.el.cards.append(card); setTimeout(close, 10000);
  }
  _clearFx() { for (const it of this.items) it.el.remove(); this.items = []; this._hover(null); }

  // ---------- Aufgaben-Flaggen ----------
  _renderFlags() {
    for (const f of this.flags) f.el.remove(); this.flags = [];
    const S = this.game.S; if (!S) return;
    for (const [k, Qs] of Object.entries(S.quests || {})) {
      if (Qs.done || !this.game.board.has(k)) continue;
      const [q, r] = unkey(k), rest = Math.max(0, Qs.n - this.game.group(q, r).keys.length);
      const el = h('div.flag', {}, h('div.in', {}, h('span', {}, `🚩 ${rest}`), h('i')));
      el.title = `Aufgabe: noch ${rest} ${GROUP_NAMES[Qs.g] || ''}-Kacheln anschließen`;
      this.el.fx.append(el); this.flags.push({ el, pos: up(this.app.tilePos(q, r), 2.6), key: k, rest, g: Qs.g });
    }
  }

  // ---------- Vorschau beim Überfahren ----------
  _hover(d) {
    if (this.hov) for (const e of this.hov.els) e.el.remove();
    this.hov = null;
    if (!d || !d.ev || this.mode !== 'play' || !this.game.S) return;
    const { q, r, ev } = d, cur = this.game.current(), kind = d.kind || cur?.k; if (!kind) return;
    const base = this.app.tilePos(q, r), els = [];
    const card = h('div.hover.chip');
    if (!ev.ok) card.append(h('div.why', {}, '✋ ' + (ev.why || 'Hier passt die Kachel nicht.')));
    else {
      card.append(h('div.big' + (ev.pts ? '' : '.zero'), {}, `+${ev.pts}`, h('span', { style: { font: '800 13px var(--font)', color: 'var(--ink2)', marginLeft: '6px' } }, ev.pts === 1 ? 'Punkt' : 'Punkte')));
      const agg = new Map();
      for (const p of ev.parts || []) { if (!p.pts) continue; const n = this.game.at(...neighbor(q, r, p.i)), l = partLabel(kind, n?.k, p); const a = agg.get(l) || { pts: 0, n: 0 }; a.pts += p.pts; a.n++; agg.set(l, a); }
      for (const [l, a] of agg) card.append(h('div.ln', {}, h('span', {}, l + (a.n > 1 ? ` ×${a.n}` : '')), h('b', {}, '+' + a.pts)));
      if (ev.perfect) card.append(h('div.ln', {}, h('span', {}, '✨ Perfekt eingepasst'), h('b', {}, '+10')));
      const eb = (ev.bonus || 0) - (ev.perfect ? 10 : 0); if (eb > 0) card.append(h('div.ln', {}, h('span', {}, '🗼 Randbonus'), h('b', {}, '+' + eb)));
      if (!ev.pts) card.append(h('div.ln', {}, h('span', {}, 'Keine passenden Nachbarn – aber nie Minus.')));
      if (cur?.quest && GROUP[kind]) card.append(h('div.q', {}, `🚩 Aufgabe: ${GROUP_NAMES[GROUP[kind]]} danach um ${cur.quest} vergrößern`));
      if (ev.ok) this._tutEvent('hoverOk');
    }
    els.push({ el: h('div', {}, card), pos: up(base, 1.5) });
    for (const p of ev.parts || []) if (p.pts || p.bad) els.push({ el: h('div', {}, h('div.edge' + (p.bad ? '.bad' : ''), {}, p.bad ? '✕' : '+' + p.pts)), pos: edgeAt(base, p.i, 4.2, .4) });
    for (const e of els) { e.el.style.visibility = 'hidden'; this.el.fx.append(e.el); }
    this.hov = { q, r, els };
  }
  _tileInfo(q, r) {
    const t = this.game.at(q, r); if (!t) return; const T = TILES[t.k], g = this.game.group(q, r);
    let txt = T.desc; if (g.g) txt += ` Gehört zu: ${GROUP_NAMES[g.g]} (${g.keys.length} Kacheln am Stück).`;
    const Qs = this.game.S.quests[`${q},${r}`]; if (Qs && !Qs.done) txt += ` 🚩 Aufgabe: noch ${Math.max(0, Qs.n - g.keys.length)} anschließen.`;
    this.showInfo(`${T.icon} ${T.name}`, txt);
  }

  // ---------- Anleitung ----------
  _tutStep() { const S = this.game.S; return S && this.mode === 'play' && (S.tut | 0) < TUT.length ? S.tut | 0 : -1; }
  _renderTut() {
    const box = this.el.tut; box.textContent = ''; box.className = 'tut';
    if (this.pointer) { this.pointer.el.remove(); this.pointer = null; }
    const i = this._tutStep(); if (i < 0) return;
    const st = TUT[i], S = this.game.S;
    if (i === 7 && Object.values(S.ms || {}).some(v => v > 0)) { this._tutNext(); return; }
    if (st.at === 'stack') box.classList.add('at-stack');
    let x = st.x;
    if (i === 4 && !S.stack.slice(0, 3).some(e => /bach|quelle|see/.test(e.k))) x += ' Noch kein Bach im Stapel? Setz einfach weiter, er kommt bald.';
    if (i === 5 && !S.stack.slice(0, 3).some(e => e.k === 'haus')) x += ' Gerade kein Haus dabei? Es kommt bald.';
    const bub = h('div.bub.panel.live', {}, h('div.st', {}, h('span', {}, `Schritt ${i + 1} von ${TUT.length}`), h('div.dots', {}, TUT.map((_, j) => h('i' + (j <= i ? '.on' : ''))))),
      h('h4', {}, st.t), h('p', {}, x),
      st.need && h('div.chk', {}, st.need.map(([k, l]) => h('span' + (this.tutSeen.has(k) ? '.ok' : ''), {}, (this.tutSeen.has(k) ? '✓ ' : '○ ') + l))),
      h('div.row', {}, this._btn('Anleitung überspringen', 'ghost small', () => this._tutSkip()), h('div.grow'), st.btn && this._btn(st.btn, 'small', () => this._tutNext())));
    box.append(h('div.pip', { 'aria-hidden': 'true' }, '🐦'), bub);
    if (st.point) {
      const t = [...this.game.board.values()].find(t => t.k === 'haus') || this.game.at(0, 0);
      if (t) { const el = h('div', {}, h('div.pointer', {}, h('div.in', {}, '👇'))); this.el.fx.append(el); this.pointer = { el, pos: up(this.app.tilePos(t.q, t.r), 4) }; }
    }
  }
  _tutEvent(name, d) {
    const i = this._tutStep(); if (i < 0) return; const st = TUT[i];
    if (st.need) { if (st.need.some(([k]) => k === name) && !this.tutSeen.has(name)) { this.tutSeen.add(name); if (st.need.every(([k]) => this.tutSeen.has(k))) setTimeout(() => this._tutNext(i), 700); this._renderTut(); } return; }
    if (st.on !== name || (st.test && !st.test(d || {}))) return;
    if (name === 'hoverOk') { if (!this._tutT) this._tutT = setTimeout(() => { this._tutT = null; this._tutNext(i); }, 2500); return; }
    setTimeout(() => this._tutNext(i), name === 'place' ? 900 : 400);
  }
  _tutNext(from) {
    const S = this.game.S; if (!S) return; if (from != null && (S.tut | 0) !== from) return;
    S.tut = (S.tut | 0) + 1; this.auto.touch();
    if (S.tut >= TUT.length) { store.setFlag('tutDone', true); this.toast('🎉 Anleitung geschafft! Alles zum Nachlesen steht im Handbuch (B).'); }
    this._renderTut();
  }
  _tutSkip() { const S = this.game.S; if (!S) return; S.tut = TUT.length; store.setFlag('tutDone', true); this.auto.touch(); this._renderTut(); this.toast('Anleitung übersprungen. Im Menü kannst du sie wiederholen.'); }

  // ================= Bildschirme =================
  _screen(content, { dim = true, closable = true, name = '', onClose } = {}) {
    const scr = h('div.scr' + (dim ? '.dim' : ''), {}, content);
    const s = { scr, closable, name, onClose }; this.screens.push(s); this.el.screens.append(scr);
    scr.addEventListener('pointerdown', e => { if (e.target === scr && closable) this._close(s); });
    this._hover(null);
    return s;
  }
  _close(s = this.screens[this.screens.length - 1]) {
    if (!s) return; const i = this.screens.indexOf(s); if (i < 0) return;
    this.screens.splice(i, 1); s.scr.classList.add('out'); setTimeout(() => s.scr.remove(), 200); s.onClose?.();
  }
  _closeAll() { while (this.screens.length) { const s = this.screens.pop(); s.scr.remove(); s.onClose?.(); } }
  _find(name) { return this.screens.find(s => s.name === name); }
  _modal(title, ...kids) { return h('div.modal.panel', { role: 'dialog', 'aria-label': title }, h('h2', {}, title), ...kids); }
  _closeX(fn) { return h('div.x', {}, this._btn('✕', 'ghost icon', fn, { 'aria-label': 'Schließen', title: 'Schließen (Esc)' })); }
  _dialog(res, cancelVal) {
    const box = h('div.dlg.panel', { role: 'alertdialog' }), scr = h('div.scr.dim', { style: { zIndex: 5 } }, box);
    const d = { box, done: v => { const i = this.dialogs.indexOf(d); if (i >= 0) this.dialogs.splice(i, 1); scr.remove(); res(v); }, cancel: () => d.done(cancelVal),
      focus: () => setTimeout(() => box.querySelector('[autofocus]')?.focus(), 30) };
    scr.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); d.cancel(); } });
    this.dialogs.push(d); this.el.screens.append(scr); return d;
  }

  // ---------- Start & Menü ----------
  async _boot() {
    const boot = document.getElementById('boot'); if (boot) { boot.classList.add('gone'); setTimeout(() => boot.remove(), 900); }
    if (!store.available()) this.toast('Speichern ist in diesem Browser nicht möglich. Sichere deine Insel als Datei.', 'err');
    const cur = store.current(), d = cur && store.load(cur);
    try {
      if (d && (!this.game.S || this.game.S.created !== d.S.created)) await this.app.loadGame(d.S);
      else if (!d && !this.game.S) await this.app.newGame({ name: 'Meine Insel' });
    } catch (e) { console.error(e); this.toast('Die letzte Insel ließ sich nicht laden.', 'err'); }
    this.slot = d && this.game.S && this.game.S.created === d.S.created ? cur : 0;
    this._menu();
  }
  _menu() {
    if (this.mode === 'photo') this._exitPhoto();
    this._closeAll(); this.mode = 'menu'; this.root.classList.add('menu'); this._hover(null); this.auto.flush();
    const active = this.slot && this.game.S, cur = store.current(), cd = !active && cur && store.load(cur);
    const items = [];
    if (active) items.push(this._btn([h('span.e', {}, '▶'), 'Weiterspielen', h('span.d', {}, `${this.game.S.name} · ${fmtNum(this.game.S.score)} P.`)], 'main', () => this._play()));
    else if (cd) items.push(this._btn([h('span.e', {}, '▶'), 'Weiterspielen', h('span.d', {}, `${cd.meta.name} · ${fmtNum(cd.meta.score)} P.`)], 'main', () => this._loadSlot(cur)));
    items.push(this._btn([h('span.e', {}, '🏝️'), 'Neue Insel'], active || cd ? '' : 'main', () => this._newIsland()),
      this._btn([h('span.e', {}, '🗂️'), 'Meine Inseln', h('span.d', {}, `${store.list().filter(s => !s.empty).length} / ${store.SLOTS}`)], '', () => this._islands()),
      this._btn([h('span.e', {}, '🐦'), 'Anleitung'], '', () => this._restartTut()),
      this._btn([h('span.e', {}, '📖'), 'Handbuch'], '', () => this._book()),
      this._btn([h('span.e', {}, '⚙️'), 'Einstellungen'], '', () => this._settings()));
    const foot = h('div.foot', {}, active ? `Wird automatisch gespeichert · Platz ${this.slot}` : 'Gemütlich bauen – ohne Zeitdruck, ohne Verlieren.');
    const wrap = h('div.title-wrap', {}, h('div.title', {}, h('h1', {}, 'Schwebeinsel'), h('div.sub', {}, 'Ein kleines Dorf über den Wolken')), h('div.mmenu.panel', {}, items, foot));
    const s = this._screen(wrap, { dim: false, closable: !!active, name: 'menu' });
    s.scr.style.background = 'radial-gradient(ellipse at center, rgba(255,246,228,.25), rgba(60,40,20,.28))';
    setTimeout(() => items[0]?.focus(), 50);
  }
  _play() {
    this._closeAll(); this.mode = 'play'; this.root.classList.remove('menu'); this._renderAll();
    const S = this.game.S; if (S && S.mode === 'klassisch' && !S.stack.length) setTimeout(() => this._end(), 400);
  }
  async _loadSlot(n) {
    const d = store.load(n); if (!d) { this.toast('Dieser Speicherplatz ist leer.', 'err'); return; }
    try { if (!this.game.S || this.game.S.created !== d.S.created || this.slot !== n) await this.app.loadGame(d.S); }
    catch (e) { console.error(e); this.toast('Die Insel ließ sich nicht laden.', 'err'); return; }
    this.slot = n; store.setCurrent(n); this._play(); this.toast(`Willkommen zurück auf „${this.game.S.name}“!`);
  }
  _restartTut() {
    if (this.slot && this.game.S) { this.game.S.tut = 0; this.tutSeen.clear(); this._play(); }
    else this._newIsland({ tut: true });
  }

  // ---------- Neue Insel ----------
  _newIsland({ tut } = {}) {
    const used = new Set(store.list().filter(s => !s.empty).map(s => s.meta.name));
    const free = ISLAND_NAMES.filter(n => !used.has(n)), name = free[Math.floor(Math.random() * free.length)] || 'Meine Insel';
    let mode = 'klassisch';
    const inp = h('input', { type: 'text', value: name, maxlength: 40, spellcheck: 'false' });
    const modeEls = Object.entries(MODES).map(([k, m]) => {
      const el = h('div.mode' + (k === mode ? '.on' : ''), { role: 'radio', tabindex: '0', 'aria-checked': k === mode ? 'true' : 'false' }, h('div.e', {}, m.e), h('b', {}, m.name), h('small', {}, m.d));
      const sel = () => { mode = k; modeEls.forEach(e => { e.classList.toggle('on', e === el); e.setAttribute('aria-checked', e === el); }); this._sfx('click'); };
      el.addEventListener('click', sel); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sel(); } });
      return el;
    });
    const slots = store.list(), firstFree = slots.find(s => s.empty)?.n || [...slots].sort((a, b) => a.meta.updated - b.meta.updated)[0].n;
    const slotSel = h('select', {}, slots.map(s => h('option', { value: s.n, selected: s.n === firstFree }, `Platz ${s.n}: ${s.empty ? 'frei' : `${s.meta.name} (wird ersetzt)`}`)));
    const tutCb = h('input', { type: 'checkbox', checked: tut ?? !store.getFlag('tutDone') });
    const s = this._screen(this._modal('Neue Insel',
      this._closeX(() => this._close(s)),
      h('label.f', {}, h('span', {}, 'Name deiner Insel'), inp),
      h('div.sec', {}, 'Spielart'), h('div.modes', { role: 'radiogroup' }, modeEls),
      h('label.f', {}, h('span', {}, 'Speicherplatz'), slotSel),
      h('label.check', {}, tutCb, 'Geführte Anleitung zeigen'),
      h('div.row.end', {}, this._btn('Abbrechen', 'ghost', () => this._close(s)), this._btn('🏝️ Insel erschaffen', 'main', () => go()))), { name: 'new' });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    setTimeout(() => { inp.focus(); inp.select(); }, 60);
    const go = async () => {
      const n = +slotSel.value, nm = inp.value.trim().slice(0, 40) || 'Meine Insel', old = store.load(n);
      if (old && !(await this.confirm({ title: 'Platz überschreiben?', text: `„${old.meta.name}“ (${fmtNum(old.meta.score)} Punkte) auf Platz ${n} wird dabei gelöscht.`, ok: 'Überschreiben', danger: true }))) return;
      try { await this.app.newGame({ mode, name: nm }); } catch (e) { console.error(e); this.toast('Die Insel ließ sich nicht erschaffen.', 'err'); return; }
      const S = this.game.S; S.name = nm; S.tut = tutCb.checked ? 0 : TUT.length; this.tutSeen.clear();
      this.slot = n; store.save(n, this.game, null); store.setCurrent(n);
      this._play(); this.toast(`Willkommen auf „${nm}“!`);
      setTimeout(() => this.auto.now(), 1500);
    };
  }

  // ---------- Meine Inseln ----------
  _islands() {
    const list = h('div.slots'), file = h('input', { type: 'file', accept: '.json,.insel.json,application/json', style: { display: 'none' } });
    file.addEventListener('change', () => { const f = file.files[0]; file.value = ''; if (f) this._import(f, render); });
    const render = () => {
      list.textContent = '';
      for (const sl of store.list()) {
        if (sl.empty) {
          list.append(h('div.slot.empty', { 'data-slot': sl.n }, h('div.th', {}, '☁️'), h('div.tx', {}, h('b', {}, `Platz ${sl.n} · frei`), h('small', {}, 'Hier ist Platz für eine neue Insel.')),
            h('div.acts', {}, this._btn('Neue Insel', 'small', () => this._newIsland()), this._btn('Aus Datei', 'ghost small', () => { this._importTo = sl.n; file.click(); }))));
          continue;
        }
        const m = sl.meta, cur = this.slot === sl.n;
        list.append(h('div.slot' + (cur ? '.cur' : ''), { 'data-slot': sl.n },
          h('div.th', {}, m.thumb ? h('img', { src: m.thumb, alt: '' }) : '🏝️'),
          h('div.tx', {}, h('b', {}, m.name, cur && h('span.tag', {}, 'aktiv')), h('small', {}, `${fmtNum(m.score)} Punkte · ${m.tiles} Kacheln · ${MODES[m.mode]?.name || m.mode}`), h('small', {}, `Platz ${sl.n} · ${ago(m.updated)}`)),
          h('div.acts', {},
            this._btn('▶ Spielen', 'main small', () => this._loadSlot(sl.n)),
            this._btn('✏️', 'small', () => this._rename(sl.n, render), { title: 'Umbenennen', 'aria-label': 'Umbenennen' }),
            this._btn('⧉', 'small', () => { const to = store.duplicate(sl.n); if (to) { this.toast(`Kopie auf Platz ${to} angelegt.`); render(); } else this.toast('Kein freier Platz für eine Kopie.', 'err'); }, { title: 'Kopieren', 'aria-label': 'Kopieren' }),
            this._btn('⬇', 'small', () => { if (cur) this.auto.flush(); if (store.exportFile(sl.n)) this.toast('Insel als Datei gesichert.'); }, { title: 'Als Datei sichern', 'aria-label': 'Als Datei sichern' }),
            this._btn('🗑', 'small', () => this._remove(sl.n, render), { title: 'Löschen', 'aria-label': 'Löschen' }))));
      }
    };
    if (this.slot) this.auto.flush();
    render();
    const s = this._screen(this._modal('Meine Inseln', this._closeX(() => this._close(s)), list, file,
      h('div.row', { style: { marginTop: '14px' } }, this._btn('📂 Aus Datei laden…', '', () => { this._importTo = 0; file.click(); }), h('div.grow'), this._btn('Zurück', 'ghost', () => this._close(s)))), { name: 'islands' });
    s.scr.firstChild.style.width = 'min(640px, 100%)';
  }
  async _rename(n, render) {
    const d = store.load(n); if (!d) return;
    const name = await this.prompt({ title: 'Insel umbenennen', value: d.meta.name, ok: 'Umbenennen' }); if (!name) return;
    if (store.rename(n, name)) { if (this.slot === n && this.game.S) { this.game.S.name = name.slice(0, 40); this._hud(); } render(); }
  }
  async _remove(n, render) {
    const d = store.load(n); if (!d) return;
    const ok = await this.confirm({ title: 'Insel löschen?', text: `„${d.meta.name}“ mit ${fmtNum(d.meta.score)} Punkten wird endgültig gelöscht. Tipp: Vorher als Datei sichern (⬇).`, ok: 'Löschen', danger: true });
    if (!ok) return;
    store.remove(n); if (this.slot === n) this.slot = 0;
    this.toast(`„${d.meta.name}“ wurde gelöscht.`); render();
  }
  async _import(f, render) {
    let S; try { S = await store.importFile(f); } catch (e) { this.toast(e.message || 'Die Datei ließ sich nicht lesen.', 'err'); return; }
    const n = (this._importTo && !store.load(this._importTo) ? this._importTo : 0) || store.firstFree();
    if (!n) { this.toast(`Alle ${store.SLOTS} Plätze sind belegt. Lösche zuerst eine Insel.`, 'err'); return; }
    const newer = S.__newer; delete S.__newer;
    if (store.save(n, S, null)) { this.toast(`„${S.name}“ liegt jetzt auf Platz ${n}.${newer ? ' (Aus einer neueren Version – Unbekanntes wird übersprungen.)' : ''}`); render(); }
  }

  // ---------- Einstellungen ----------
  _settings() {
    const st = this.app.settings || (this.app.settings = {});
    const D = { quality: 'mittel', music: .6, sfx: .8, dayCycle: true, time: 12, season: 'auto', weather: 'auto' };
    for (const k in D) if (st[k] === undefined) st[k] = D[k];
    const apply = () => { try { this.app.applySettings?.(st); } catch (e) { console.warn(e); } store.saveSettings(st); this._clock(); };
    const seg = (key, opts) => { const box = h('div.seg', { role: 'radiogroup' }); for (const [v, l] of opts) { const b = h('button', { type: 'button', class: String(st[key]) === String(v) ? 'on' : '' }, l); b.addEventListener('click', () => { st[key] = v; [...box.children].forEach(c => c.classList.toggle('on', c === b)); this._sfx('click'); apply(); }); box.append(b); } return box; };
    const range = (key, min, max, step, fmt) => {
      const v = h('span.v', {}, fmt(st[key])), r = h('input', { type: 'range', min, max, step, value: st[key], 'aria-label': key });
      r.addEventListener('input', () => { st[key] = +r.value; v.textContent = fmt(st[key]); apply(); }); return [r, v];
    };
    const pct = x => Math.round(x * 100) + ' %';
    const [mus, musV] = range('music', 0, 1, .05, pct), [sfx, sfxV] = range('sfx', 0, 1, .05, pct), [tim, timV] = range('time', 0, 24, .25, fmtTime);
    sfx.addEventListener('change', () => this._sfx('place'));
    const cyc = h('input', { type: 'checkbox', checked: st.dayCycle !== false });
    const sync = () => { tim.disabled = cyc.checked; tim.style.opacity = cyc.checked ? .4 : 1; };
    cyc.addEventListener('change', () => { st.dayCycle = cyc.checked; if (!cyc.checked && st.time == null) st.time = 12; sync(); apply(); }); sync();
    const sel = (key, opts) => { const s = h('select', { 'aria-label': key }, opts.map(([v, l]) => h('option', { value: v, selected: String(st[key]) === String(v) }, l))); s.addEventListener('change', () => { st[key] = s.value === 'auto' ? 'auto' : isNaN(+s.value) ? s.value : +s.value; apply(); }); return s; };
    const s = this._screen(this._modal('Einstellungen', this._closeX(() => this._close(s)),
      h('div.sec', {}, 'Grafik'), h('div.set', {}, h('span', {}, 'Qualität'), seg('quality', [['niedrig', 'Niedrig'], ['mittel', 'Mittel'], ['hoch', 'Hoch']])),
      h('div.sec', {}, 'Klang'), h('div.set', {}, h('span', {}, '🎵 Musik'), mus, musV), h('div.set', {}, h('span', {}, '🔔 Effekte'), sfx, sfxV),
      h('div.sec', {}, 'Stimmung'),
      h('label.check', {}, cyc, 'Tag und Nacht wechseln'), h('div.set', {}, h('span', {}, '🕰️ Feste Uhrzeit'), tim, timV),
      h('div.set', {}, h('span', {}, '🍂 Jahreszeit'), h('div', { style: { gridColumn: 'span 2' } }, sel('season', [['auto', 'Automatisch'], ...SEASONS.map((n, i) => [i, `${SEASON_ICON[i]} ${n}`])]))),
      h('div.set', {}, h('span', {}, '☁️ Wetter'), h('div', { style: { gridColumn: 'span 2' } }, sel('weather', WEATHER))),
      h('div.row.end', { style: { marginTop: '8px' } }, this._btn('Fertig', 'main', () => this._close(s)))), { name: 'settings' });
  }

  // ---------- Handbuch ----------
  _pages() {
    const P = [], S = this.game.S, unl = k => !S || S.unlocked.includes(k) || k === 'start';
    const tbl = (head, rows) => h('table.t', {}, h('tr', {}, head.map(x => h('th', {}, x))), rows.map(r => h('tr', {}, r.map(c => c && c.nodeType ? h('td', {}, c) : h('td', typeof c === 'object' && c ? { class: c.cls } : {}, typeof c === 'object' && c ? c.t : c)))));
    // Steuerung
    const ctl = rows => h('div.ctl', {}, rows.flatMap(([a, b]) => [h('kbd', {}, a), h('span', {}, b)]));
    P.push({ ch: 'Steuerung', el: [h('h3', {}, '🎮 Steuerung'), h('h4', {}, 'Maus'), ctl(CONTROLS.maus), h('h4', {}, 'Touch'), ctl(CONTROLS.touch), h('h4', {}, 'Tasten'), ctl(CONTROLS.keys)] });
    // Kacheln
    const kinds = ['start', ...KINDS].sort((a, b) => (a === 'start' ? -1 : b === 'start' ? 1 : TILES[a].unlock - TILES[b].unlock));
    const likers = b => KINDS.filter(k => TILES[k].likes?.[b]).map(k => `${TILES[k].name} (${TILES[k].likes[b]})`);
    const entry = k => {
      const T = TILES[k], src = this._thumb(k), nb = Object.keys(REP).map(b => [b, affinity(k, REP[b])]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
      const lk = likers(T.biome).filter(x => !x.startsWith(T.name + ' '));
      return h('div.tile-e', { 'data-kind': k },
        h('div.im', {}, src ? h('img', { src, alt: '' }) : T.icon, !unl(k) && h('div.lock', { title: 'Noch nicht freigeschaltet' }, '🔒')),
        h('div', {}, h('b', {}, `${T.icon} ${T.name}`), h('p', {}, T.desc),
          h('div.k', {}, h('em', {}, 'Kanten: '), [...new Set(T.edges)].map(e => `${EDGE_NAME[e]} ${[...T.edges].filter(x => x === e).length}×`).join(', ')),
          h('div.k', {}, h('em', {}, 'Punkte je Nachbar: '), nb.length ? nb.map(([b, p]) => `${BIOME_NAMES[b]} ${p}`).join(' · ') : '–'),
          T.likes && h('div.k', {}, h('em', {}, 'Mag besonders: '), Object.entries(T.likes).map(([b, p]) => `${BIOME_NAMES[b]} (+${p})`).join(', ')),
          lk.length > 0 && h('div.k', {}, h('em', {}, 'Wird gemocht von: '), lk.join(', ')),
          h('div.k', {}, h('em', {}, 'Gruppe: '), GROUP[k] ? GROUP_NAMES[GROUP[k]] : 'keine', ' · ', h('em', {}, 'Verfügbar: '), k === 'start' ? 'Startkachel' : T.unlock ? `ab ${fmtNum(T.unlock)} Punkten` : 'von Anfang an')),
        h('div', { html: edgeSvg(k) }));
    };
    for (let i = 0; i < kinds.length; i += 3) P.push({ ch: 'Kacheln', kinds: kinds.slice(i, i + 3), el: [h('h3', {}, `🧩 Kacheln (${i / 3 + 1}/${Math.ceil(kinds.length / 3)})`),
      i === 0 && h('div.legend', {}, Object.entries(EDGE_NAME).map(([e, n]) => h('span', {}, h('i', { style: { background: EDGE_COL[e] } }), n))), kinds.slice(i, i + 3).map(entry)] });
    // Punkte & Regeln
    const B = Object.keys(REP);
    P.push({ ch: 'Punkte & Regeln', el: [h('h3', {}, '⭐ Punkte für Nachbarn'),
      h('p', {}, 'Jede Seite einer neuen Kachel, die an eine andere Kachel stößt, gibt Punkte – je nachdem, wie gut die beiden zusammenpassen. Unpassendes gibt 0, aber nie Minus.'),
      tbl(['', ...B.map(b => BIOME_NAMES[b])], B.map(a => [h('b', {}, BIOME_NAMES[a]), ...B.map(b => { const p = affinity(REP[a], REP[b]); return { t: p || '·', cls: p >= 3 ? 'hi' : p ? '' : 'lo' }; })])),
      h('p', {}, 'Es zählt immer der beste Wert: Hat eine Kachel besondere Vorlieben (etwa die Windmühle für Felder), gilt diese Zahl, wenn sie höher ist.')] });
    P.push({ ch: 'Punkte & Regeln', el: [h('h3', {}, '📜 Sonderregeln'), h('ul', {},
      h('li', {}, h('b', {}, 'Bäche: '), 'Eine Bachkante muss an einen Bach oder ein Seeufer stoßen – oder frei bleiben (dann stürzt ein Wasserfall von der Insel). Bach an Bach und Bach in See geben je ', h('b', {}, '+3'), ' zusätzlich.'),
      h('li', {}, h('b', {}, 'Wege: '), 'Weg an Weg gibt ', h('b', {}, '+2'), ' zusätzlich. Häuser, Höfe und die Kapelle haben eine Wegkante vorn.'),
      h('li', {}, h('b', {}, 'Perfekt eingepasst: '), 'Sind alle 6 Seiten belegt und jede passt (mehr als 0 Punkte), gibt es ', h('b', {}, '+10'), ' und eine Bonus-Kachel.'),
      KINDS.filter(k => TILES[k].edgeBonus).map(k => h('li', {}, h('b', {}, `${TILES[k].name}: `), `${TILES[k].edgeBonus} Punkte je freier Seite beim Setzen – also an den Inselrand damit.`)),
      h('li', {}, h('b', {}, 'Anschließen: '), 'Neue Kacheln müssen an die Insel stoßen.'),
      h('li', {}, h('b', {}, 'Vorlieben: '), KINDS.filter(k => TILES[k].likes).map(k => `${TILES[k].name} (${Object.entries(TILES[k].likes).map(([b, p]) => `${BIOME_NAMES[b]} ${p}`).join(', ')})`).join(' · ')),
      h('li', {}, h('b', {}, 'Rückgängig: '), 'Die letzten 10 Kacheln lassen sich mit Strg+Z zurücknehmen.'))] });
    // Gruppen & Meilensteine
    const members = g => ['start', ...KINDS].filter(k => GROUP[k] === g).map(k => TILES[k].name).join(', ');
    P.push({ ch: 'Gruppen & Meilensteine', el: [h('h3', {}, '🏆 Gruppen & Meilensteine'),
      h('p', {}, 'Gleiche Kacheln, die zusammenhängen, bilden eine Gruppe. Wächst eine Gruppe über eine Schwelle, erreichst du einen Meilenstein.'),
      tbl(['Gruppe', 'Dazu zählen'], Object.keys(GROUP_NAMES).map(g => [`${GROUP_ICON[g]} ${GROUP_NAMES[g]}`, members(g)])),
      tbl(['Gruppengröße', 'Punkte', 'Bonus-Kacheln¹'], MILESTONES.map((m, j) => [`${m} Kacheln`, `+${m * 3}`, `+${j + 2}`])),
      h('p', { style: { fontSize: '13px', color: 'var(--ink2)' } }, '¹ nur im Modus Klassisch. Jede Gruppenart hat ihre eigenen Meilensteine.'),
      h('h4', {}, '🏠 Das Dorf wächst'), h('p', {}, 'Ab 3 Häusern in einem Dorf werden Häuser zweistöckig, ab 6 bekommen sie einen Anbau.')] });
    P.push({ ch: 'Gruppen & Meilensteine', el: [h('h3', {}, '🔓 Freischaltungen'), h('p', {}, 'Mit steigender Punktzahl kommen neue Kachelarten in den Stapel (im Klassisch-Modus gleich je 2 Stück).'),
      tbl(['Punkte', 'Neu'], UNLOCKS.filter(u => u.at !== Infinity).map(u => [u.at ? fmtNum(u.at) : 'Start', u.kinds.map(k => `${TILES[k].icon} ${TILES[k].name}`).join(', ')]))] });
    // Aufgaben
    P.push({ ch: 'Aufgaben', el: [h('h3', {}, '🚩 Aufgaben'),
      h('p', {}, 'Manche Kacheln im Stapel tragen eine rote Flagge mit einer Zahl. Setzt du so eine Kachel, steckt dort eine Aufgabe: Die Gruppe rund um die Kachel soll um so viele Kacheln wachsen.'),
      h('p', {}, 'Über der Kachel weht dann eine Flagge, die anzeigt, wie viele noch fehlen. Ist die Gruppe groß genug, gibt es ', h('b', {}, '+30 Punkte'), ' und im Klassisch-Modus ', h('b', {}, '4 Bonus-Kacheln'), '.'),
      h('p', {}, 'Aufgaben gibt es für Wald, Felder, Dorf, Gewässer und Gebirge. Wiesen und Leuchttürme tragen keine. Im Kreativ-Modus gibt es keine Aufgaben.')] });
    // Tipps
    P.push({ ch: 'Tipps', el: [h('h3', {}, '💡 Tipps'), h('ul', {},
      h('li', {}, 'Schau auf die Vorschau, bevor du klickst: Sie zeigt Punkte und den Grund, falls etwas nicht passt.'),
      h('li', {}, 'Lücken, die auf allen Seiten umbaut sind, sind ideal für „Perfekt“-Züge (+10).'),
      h('li', {}, 'Halte große Gruppen zusammen – Meilensteine bringen viele Punkte und neue Kacheln.'),
      h('li', {}, 'Lass Bäche zum Rand laufen: Eine offene Bachkante wird zum Wasserfall.'),
      h('li', {}, 'Leuchttürme ganz außen setzen: Jede freie Seite zählt.'),
      h('li', {}, 'Windmühle und Bauernhof mitten zwischen die Felder.'),
      h('li', {}, 'Im Fotomodus (P) kannst du Filter wählen und einen Zeitraffer deiner Insel als Video speichern.'),
      h('li', {}, 'Deine Insel speichert sich selbst. Unter „Meine Inseln“ kannst du sie als Datei sichern.')),
      h('h4', {}, 'Spielarten'), h('ul', {}, Object.values(MODES).map(m => h('li', {}, h('b', {}, `${m.e} ${m.name}: `), m.d)))] });
    return P;
  }
  _pageOf(kind) { return this._pages().findIndex(p => p.kinds?.includes(kind)); }
  _book(page) {
    if (this._find('book')) { this._close(this._find('book')); return; }
    if (this.mode === 'photo') return;
    const pages = this._pages(); this.bookPage = page >= 0 ? page : (this.bookPage || 0);
    const chs = [...new Set(pages.map(p => p.ch))];
    const nav = h('nav', {}, h('h2', {}, '📖 Handbuch')), body = h('div.body'), info = h('span'), prev = this._btn('◀ Zurück', 'small', () => go(this.bookPage - 1)), next = this._btn('Weiter ▶', 'small', () => go(this.bookPage + 1));
    const tabs = chs.map(c => { const b = h('button', { type: 'button' }, c); b.addEventListener('click', () => { this._sfx('click'); go(pages.findIndex(p => p.ch === c)); }); nav.append(b); return b; });
    const go = i => {
      const P = this._pages(); this.bookPage = Math.max(0, Math.min(P.length - 1, i));
      body.textContent = ''; body.append(...P[this.bookPage].el.flat(3).filter(Boolean)); body.scrollTop = 0;
      tabs.forEach((b, j) => b.classList.toggle('on', chs[j] === P[this.bookPage].ch));
      info.textContent = `Seite ${this.bookPage + 1} von ${P.length}`; prev.disabled = this.bookPage === 0; next.disabled = this.bookPage === P.length - 1;
    };
    const s = this._screen(h('div.book.panel', { role: 'dialog', 'aria-label': 'Handbuch' }, nav, h('div.pg', {}, body, h('div.foot', {}, prev, info, next)), h('div.x', {}, this._btn('✕', 'ghost icon', () => this._close(s), { 'aria-label': 'Schließen' }))), { name: 'book' });
    s.go = go; s.scr.firstChild.style.position = 'relative'; go(this.bookPage);
  }
  _refreshBook() { const b = this._find('book'); if (b) b.go(this.bookPage); }

  // ---------- Fotomodus ----------
  _enterPhoto() {
    if (this.mode === 'photo' || !this.game.S) return;
    this._closeAll(); this.mode = 'photo'; this.root.classList.remove('menu'); this.root.classList.add('photo'); this._hover(null);
    this.el.toasts.textContent = ''; this.hideInfo();
    try { this.app.photo?.(true); } catch (e) { console.warn(e); }
    const fl = h('div.filters', { role: 'radiogroup', 'aria-label': 'Filter' });
    for (const [k, l] of FILTERS) { const b = h('button', { type: 'button', class: k === this.filter ? 'on' : '' }, l); b.addEventListener('click', () => { this.filter = k; [...fl.children].forEach(c => c.classList.toggle('on', c === b)); this._sfx('click'); try { this.app.setFilter?.(k); } catch (e) { console.warn(e); } }); fl.append(b); }
    const tl = this._btn('▶ Zeitraffer', '', () => this._timelapse(false)), rec = this._btn('🎬 Als Video speichern', '', () => this._timelapse(true));
    this.photoBar = h('div.photobar.panel.live', {}, fl, h('div.row', {}, this._btn('📸 Foto speichern', 'main', () => this._snap()), tl, rec, h('div.grow'), this._btn('✕ Beenden', 'ghost', () => this._exitPhoto(), { kbd: 'Esc' })));
    this.el.screens.append(this.photoBar);
    try { this.app.setFilter?.(this.filter); } catch { }
  }
  _exitPhoto() {
    if (this.mode !== 'photo') return;
    this.photoBar?.remove(); this.photoBar = null; this.recPill?.remove();
    this.filter = 'normal'; try { this.app.setFilter?.('normal'); this.app.photo?.(false); } catch (e) { console.warn(e); }
    this.root.classList.remove('photo'); this._play();
  }
  async _snap() {
    try {
      const url = await this.app.capture(2); if (!url) throw new Error('kein Bild');
      const a = h('a', { href: url, download: `${(this.game.S.name || 'insel').replace(/[\\/:*?"<>|]+/g, '_')}-${new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-')}.png` });
      document.body.append(a); a.click(); a.remove();
      const f = h('div.flash'); document.body.append(f); setTimeout(() => f.remove(), 600);
      this._sfx('photo'); this.toast('📸 Foto gespeichert.');
    } catch (e) { console.warn(e); this.toast('Das Foto ließ sich nicht speichern.', 'err'); }
  }
  async _timelapse(record) {
    if (this._tl) return; this._tl = true;
    if (this.mode !== 'photo') this._enterPhoto();
    if (this.photoBar) this.photoBar.style.display = 'none';
    this.recPill = h('div.recpill.chip', {}, h('i'), record ? 'Video wird aufgenommen …' : 'Zeitraffer läuft …'); this.el.screens.append(this.recPill);
    try { await this.app.timelapse?.({ record }); if (record) this.toast('🎬 Video gespeichert.'); }
    catch (e) { console.warn(e); this.toast('Der Zeitraffer ließ sich nicht abspielen.', 'err'); }
    this.recPill?.remove(); this.recPill = null; this._tl = false;
    if (this.photoBar) this.photoBar.style.display = '';
  }

  // ---------- Ende ----------
  _end() {
    const S = this.game.S; if (!S || this._find('end')) return;
    if (this.mode === 'photo') this._exitPhoto();
    this._closeAll(); this.mode = 'play'; this.root.classList.remove('menu'); this.auto.flush();
    const best = Object.entries(S.best || {}).filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
    const st = (n, l, cls = '') => h('div.stat' + cls, {}, h('b', {}, n), h('span', {}, l));
    const s = this._screen(this._modal('Deine Insel ist fertig!', this._closeX(() => this._close(s)),
      h('p', {}, `„${S.name}“ schwebt in voller Pracht über den Wolken.`),
      h('div.stats', {}, st(fmtNum(S.score), 'Punkte', '.big'), st(Math.max(0, S.tiles.length - 1), 'Kacheln gelegt'), st(S.stats.perfect || 0, 'perfekte Züge'),
        st(S.stats.quests || 0, 'Aufgaben erfüllt'), st(fmtDur(S.stats.playtime), 'Spielzeit')),
      best.length > 0 && h('div.sec', {}, 'Größte Gruppen'), best.length > 0 && h('div.groups', {}, best.map(([g, n]) => h('span', {}, `${GROUP_ICON[g] || ''} ${GROUP_NAMES[g] || g}: ${n}`))),
      h('div.row', {}, this._btn('📷 Fotomodus', 'grow', () => this._enterPhoto()), this._btn('▶ Zeitraffer', 'grow', () => this._timelapse(false))),
      h('div.row', { style: { marginTop: '10px' } }, this._btn('♾️ Endlos weiterbauen', 'wood grow', () => { this._close(s); this.game.endless(); this.auto.touch(); this.toast('Endlos-Modus: Der Stapel füllt sich jetzt immer wieder auf.'); }),
        this._btn('🏝️ Neue Insel', 'main grow', () => this._newIsland()))), { name: 'end' });
    this._sfx('milestone');
  }

  // ---------- Tasten ----------
  _onKey(e) {
    if (this.dialogs.length) { if (e.key === 'Escape') { e.preventDefault(); this.dialogs[this.dialogs.length - 1].cancel(); } return; }
    if (isField(e.target)) { if (e.key !== 'Escape') return; e.target.blur(); }
    const k = e.key, top = this.screens[this.screens.length - 1];
    if (k === 'Escape') {
      e.preventDefault();
      if (top) { if (top.closable) this._close(top); return; }
      if (this.mode === 'photo') { if (!this._tl) this._exitPhoto(); return; }
      if (this.mode === 'play') this._menu();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (k === 'z' || k === 'Z')) { if (!top && this.mode === 'play') { e.preventDefault(); this._undo(); } return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (top?.name === 'book' && (k === 'ArrowRight' || k === 'ArrowLeft')) { top.go(this.bookPage + (k === 'ArrowRight' ? 1 : -1)); return; }
    if (k === 'b' || k === 'B') { if (this.mode === 'play' && (!top || top.name === 'book')) this._book(); return; }
    if (k === 'p' || k === 'P') { if (top || this._tl) return; if (this.mode === 'photo') this._exitPhoto(); else if (this.mode === 'play') this._enterPhoto(); return; }
    if (!top && this.mode === 'play' && /^[1-3]$/.test(k) && this.game.S?.mode !== 'kreativ') this.game.pick(+k - 1);
  }
}
