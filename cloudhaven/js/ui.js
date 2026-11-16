// Oberfläche von Cloudhaven: Startmenü, HUD, Bauleiste, Rückmeldungen, Anleitung, Handbuch, Fotomodus, Ende, Einstellungen, Speicherplätze.
//   const ui = new UI(app); ui.frame(dt) jedes Bild; ui.notify(type, data) für App-Ereignisse.
// Alles im DOM über dem 3D-Bild (#ui). Kein window.alert/confirm/prompt. Alle Texte über i18n.js (t, tileName …);
// ui.setLang(l) schaltet die Sprache um und baut alles Sichtbare neu auf.
import { TILES, KINDS, UNLOCKS, GROUP, GROUP_NAMES, CATS, affinity } from './tiles.js';
import { MILESTONES, START_TILES } from './game.js';
import { neighbor, unkey } from './hex.js';
import * as store from './storage.js';
import { t, getLang, setLang, applyDoc, LANGS, LANG_LABEL, phrase, quote, tileName, tileDesc, biomeName, groupName, catName, fmtNum, fmtDate } from './i18n.js';

// ---------- Tabellen (Texte kommen aus i18n.js) ----------
const GROUP_ICON = { wald: '🌲', feld: '🌾', dorf: '🏘️', wasser: '💧', berg: '⛰️' };
const SEASON_ICON = ['🌷', '🌻', '🍂', '❄️'], seasonName = i => t('season.' + i);
const FILTERS = ['normal', 'gold', 'film', 'sw', 'miniatur', 'nacht'];
const WEATHER = ['auto', 'klar', 'gewitter', 'regen', 'schnee', 'nebel'];
const WEATHER_ICON = { gewitter: '⛈️', regen: '🌧️', schnee: '🌨️', nebel: '🌫️' };
const MODE_ICON = { klassisch: '🃏', endlos: '♾️', kreativ: '🎨' };
const modeName = k => t('mode.' + k), modeDesc = k => t('mode.' + k + '.d', { n: START_TILES });
const EDGE_COL = { g: '#6aa84f', w: '#3f8fd0', r: '#a8743f', l: '#8fcbe8' };
const EDGE_KEYS = ['g', 'w', 'r', 'l'], edgeName = e => t('edge.' + e);
const BIOME_COL = { wiese: '#a9d26f', wald: '#4f8a3c', wasser: '#86c3e8', feld: '#e6c55e', dorf: '#dcbf92', berg: '#a3a3a3' };
const REP = { wiese: 'wiese', wald: 'wald', wasser: 'bach', feld: 'feld', dorf: 'haus', berg: 'berg' };   // Vertreter je Biom (ohne Sonder-Vorlieben)
// Geführter Einstieg (Fortschritt in game.S.tut). Texte: tut.<i>.t / .x, need-Labels als Schlüssel
const TUT = [
  { need: [['camRotate', 'tut.0.a'], ['zoom', 'tut.0.b']] },
  { at: 'stack', on: 'place' },
  { at: 'stack', on: 'tileRotate' },
  { on: 'hoverOk', btn: 'gotit' },
  { cat: 'wasser', on: 'place', test: d => d.parts?.some(p => /Bach/.test(p.label || '')), btn: 'later' },
  { cat: 'wohnen', on: 'place', test: d => d.parts?.some(p => p.label === 'Weg verbunden'), btn: 'later' },
  { on: 'buildingClick', point: true, btn: 'later' },
  { on: 'place', test: d => d.milestones?.length > 0 },
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
const fmtDur = s => { s = Math.round(s || 0); const hh = Math.floor(s / 3600), mm = Math.floor(s / 60) % 60; return hh ? `${hh} h ${mm} min` : `${Math.max(1, mm)} min`; };
function ago(ts) {
  const s = (Date.now() - ts) / 1000; if (!ts) return '';
  if (s < 60) return t('ago.now'); if (s < 3600) return t('ago.min', { n: Math.floor(s / 60) }); if (s < 86400) return t('ago.h', { n: Math.floor(s / 3600) });
  return fmtDate(ts);
}
const isField = el => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
const tl = k => `${TILES[k].icon} ${tileName(k)}`;   // Icon + Name
function partLabel(kind, nk, p) {
  if (p.label) return phrase(p.label);
  const A = TILES[kind], B = TILES[nk]; if (!A || !B) return '';
  if (A.likes?.[B.biome] === p.pts) return t('pl.likes', { biome: biomeName(B.biome), tile: tileName(kind) });
  if (B.likes?.[A.biome] === p.pts) return t('pl.happy', { tile: tileName(nk) });
  if (A.biome === B.biome) return t('pl.joined', { g: GROUP[kind] ? groupName(GROUP[kind]) : biomeName(A.biome) });
  return t('pl.next', { tile: tileName(nk) });
}
const edgeAt = (base, i, d = 4.5, y = .6) => { const a = i * Math.PI / 3; return [base[0] + Math.cos(a) * d, base[1] + y, base[2] + Math.sin(a) * d]; };
const up = (p, y) => [p[0], p[1] + y, p[2]];
function edgeSvg(kind) {
  const T = TILES[kind], c = i => { const a = (60 * i - 30) * Math.PI / 180; return [50 + 40 * Math.cos(a), 50 + 40 * Math.sin(a)]; };
  let s = `<svg viewBox="0 0 100 100" aria-label="${t('edges')}"><polygon points="${[0, 1, 2, 3, 4, 5].map(i => c(i).join(',')).join(' ')}" fill="${BIOME_COL[T.biome] || '#ccc'}" opacity=".55"/>`;
  for (let i = 0; i < 6; i++) { const [x1, y1] = c(i), [x2, y2] = c(i + 1); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${EDGE_COL[T.edges[i]]}" stroke-width="9" stroke-linecap="round"/>`; }
  return s + `<text x="50" y="60" text-anchor="middle" font-size="28">${T.icon}</text></svg>`;
}

// Kategorien der Bauleiste aus tiles.js; Arten ohne Kategorie landen unter „Weitere“
function barCats() {
  const seen = new Set(), cats = [];
  for (const c of CATS || []) { const kinds = c.kinds.filter(k => TILES[k] && k !== 'start' && !seen.has(k)); kinds.forEach(k => seen.add(k)); if (kinds.length) cats.push({ ...c, name: catName(c.id), kinds }); }
  const rest = KINDS.filter(k => !seen.has(k));
  if (rest.length) cats.push({ id: 'weitere', name: t('cat.weitere'), icon: '🧩', kinds: rest });
  return cats;
}
// Waagrechtes Scrollen: Mausrad (senkrecht → waagrecht, Raste weich animiert), Trackpad direkt, Ziehen mit der Maus
// mit Schwung, Seiten-Sprünge, Einrasten an Karten. Touch scrollt nativ (CSS scroll-snap). pad = Abstand zum Rand beim Einrasten.
function hscroll(el, { pad = 0, snap, onMove } = {}) {
  let x = el.scrollLeft, t = 0, tau = 80, raf = 0, last = 0, idle = 0, holdT = 0, drag = null, noClick = 0;
  const max = () => Math.max(0, el.scrollWidth - el.clientWidth), clamp = a => Math.max(0, Math.min(max(), a));
  const free = on => { if (on) el.classList.add('free'); else if (!raf && !drag && !holdT) el.classList.remove('free'); };
  const set = a => { x = a; el.scrollLeft = a; onMove?.(); };
  const sync = () => { if (!raf && !drag) x = el.scrollLeft; };
  const pos = c => c.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft;
  // Einrastpunkte (Kartenanfänge), dir: nächster Punkt in diese Richtung
  function snapped(a, dir = 0, from = x) {
    a = clamp(a); if (!snap || max() < 1) return a;
    const pts = [...snap()].filter(c => c.offsetWidth).map(c => clamp(pos(c) - pad)); pts.push(0, max());
    let best = a, bd = Infinity;
    for (const p of pts) { if (dir > 0 && p < from + 2 || dir < 0 && p > from - 2) continue; const d = Math.abs(p - a); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  function step(now) {
    raf = 0; const dt = Math.min(50, Math.max(1, now - last)); last = now;
    const tt = clamp(t), d = tt - x;
    if (Math.abs(d) < .5) { set(tt); free(false); return; }
    set(x + d * (1 - Math.exp(-dt / tau)));
    raf = requestAnimationFrame(step);
  }
  const to = (a, k = 80) => { sync(); t = a; tau = k; free(true); if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; clearTimeout(idle); };
  el.addEventListener('scroll', () => { sync(); onMove?.(); }, { passive: true });
  // Ziehen mit der Maus (Touch scrollt nativ); Klick und Ziehen sauber getrennt
  el.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    stop(); sync(); drag = { id: e.pointerId, x0: e.clientX, s0: x, moved: false, pts: [[e.timeStamp, e.clientX]] };
  });
  el.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    if (!drag.moved) { if (Math.abs(dx) < 6) return; drag.moved = true; try { el.setPointerCapture(e.pointerId); } catch { } free(true); el.classList.add('drag'); }
    set(clamp(drag.s0 - dx));
    drag.pts.push([e.timeStamp, e.clientX]); while (drag.pts.length > 2 && e.timeStamp - drag.pts[0][0] > 90) drag.pts.shift();
  });
  const up = e => {
    if (!drag || e.pointerId !== drag.id) return; const d = drag; drag = null;
    if (!d.moved) return;
    el.classList.remove('drag'); noClick = performance.now();
    const [t0, x0] = d.pts[0], [t1, x1] = d.pts[d.pts.length - 1];
    const v = t1 - t0 > 4 && e.timeStamp - t1 < 80 ? Math.max(-5, Math.min(5, -(x1 - x0) / (t1 - t0))) : 0;   // px/ms
    to(snapped(x + v * 260), Math.abs(v) > .2 ? 170 : 90);
  };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('click', e => { if (performance.now() - noClick < 250) { e.stopPropagation(); e.preventDefault(); } }, true);
  return {
    stop, can: () => max() > 1,
    jump(a) { stop(); set(clamp(a)); },
    hold(ms) { free(true); clearTimeout(holdT); holdT = setTimeout(() => { holdT = 0; free(false); }, ms); },
    wheel(e) {
      let d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (e.deltaMode === 1) d *= 40; else if (e.deltaMode === 2) d *= el.clientWidth * .9;
      if (!d || max() < 1) return;
      const notch = e.deltaMode !== 0 || (Math.abs(d) >= 50 && Number.isInteger(d));   // Mausrad-Raste
      if (notch) { sync(); const base = raf ? t : x; to(snapped(base + d * 1.1, Math.sign(d), base), 70); return; }
      stop(); free(true); set(clamp(x + d));   // Trackpad: direkt folgen, danach einrasten
      idle = setTimeout(() => to(snapped(x), 90), 150);
    },
    page(dir) { sync(); const b = raf ? t : x; to(snapped(b + dir * el.clientWidth * .8, dir, b), 90); },
    ensure(l, r) {   // Bereich [l, r] (Inhaltskoordinaten) sichtbar machen
      sync(); const w = el.clientWidth;
      if (r - l > w - 2 * pad || l < x + pad) to(Math.max(0, l - pad), 80); else if (r > x + w - pad) to(r - w + pad, 80);
    },
    show(c) { const l = pos(c); this.ensure(l, l + c.offsetWidth); },
  };
}

export class UI {
  constructor(app) {
    this.app = app; this.game = app.game;
    this.root = document.getElementById('ui') || document.body.appendChild(h('div', { id: 'ui' }));
    this.root.textContent = '';
    this.mode = 'boot'; this.slot = 0; this.screens = []; this.dialogs = [];
    this.shown = 0; this.lastShown = -1; this.items = []; this.flags = []; this.hov = null; this.tutSeen = new Set();
    this.banners = []; this.bannerBusy = false; this.clockT = 0; this.filter = 'normal'; this.newKinds = new Set();
    applyDoc(); this._build();
    store.onError(k => this.toast(t(k), 'err'));
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
      case 'thumbs': if (this.game.S) this._buildBar(); this._refreshBook(); break;
      case 'zoom': case 'camRotate': case 'tileRotate': this._tutEvent(type, d); break;
      case 'hover': this._hover(d); break;
      case 'buildingClick': this.showInfo(d.name || t('building'), d.text || ''); this._tutEvent('buildingClick', d); break;
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
  confirm({ title, text = '', ok = t('ok'), cancel = t('cancel'), danger = false }) {
    return new Promise(res => {
      const d = this._dialog(res, false);
      d.box.append(h('h2', {}, title), text && h('p', {}, text),
        h('div.row.end', {}, this._btn(cancel, 'ghost', () => d.done(false)), this._btn(ok, danger ? 'danger' : 'main', () => d.done(true), { autofocus: true })));
      d.focus();
    });
  }
  prompt({ title, text = '', value = '', ok = t('ok'), cancel = t('cancel'), max = 40 }) {
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
    this.el.info.append(h('h3', {}, title), text && h('p', {}, text), h('div.x', {}, this._btn('✕', 'ghost small', () => this.hideInfo(), { 'aria-label': t('close') })));
    this.el.info.style.display = ''; this.el.info.style.animation = 'none'; void this.el.info.offsetWidth; this.el.info.style.animation = '';
    this._infoT = setTimeout(() => this.hideInfo(), ms);
  }
  hideInfo() { this.el.info.style.display = 'none'; }
  openMenu() { this._menu(); }
  // Sprache umschalten: Texte sofort neu (HUD, Bauleiste, Anleitung, offene Bildschirme); 3D-Kachelbilder bleiben
  setLang(l) {
    if (!setLang(l)) return false;
    this._buildHud(); if (this.game.S) { this._buildBar(); this._renderAll(); }
    const names = this.screens.map(s => s.name), page = this.bookPage;
    this._closeAll();
    for (const n of names) {
      if (n === 'menu') this._menu(); else if (n === 'settings') this._settings(); else if (n === 'book') this._book(page);
      else if (n === 'islands') this._islands(); else if (n === 'new') this._newIsland(); else if (n === 'end') this._end();
    }
    if (this.mode === 'photo') { this.photoBar?.remove(); this._photoBar(); }
    return true;
  }
  openBook(page) { this._book(page); }
  enterPhoto() { this._enterPhoto(); }

  // ================= Aufbau =================
  _build() {
    const R = this.root, el = this.el = {};
    this._buildHud();
    el.stack = h('div.stackbar');
    el.fx = h('div.fx'); el.banner = h('div.banner'); el.cards = h('div.cards'); el.tut = h('div.tut');
    el.info = h('div.info.panel.live', { style: { display: 'none' } }); el.toasts = h('div.toasts'); el.screens = h('div.screens');
    el.notes = h('div.notes', {}, el.banner, el.cards, el.info, el.toasts);   // auf dem Handy eine Spalte unter dem HUD
    R.append(el.fx, el.hud, el.stack, el.tut, el.notes, el.screens);
    R.classList.add('menu');
  }
  // HUD oben (Punkte, Uhr, Knöpfe); bei Sprachwechsel an derselben Stelle neu
  _buildHud() {
    const el = this.el, old = el.hud, num = el.num?.textContent || '0';
    el.num = h('span.num', {}, num); el.gain = h('span.gain'); el.bar = h('i'); el.next = h('div.next'); el.name = h('span');
    el.score = h('div.score.chip.live', { title: t('hud.scoreTitle') }, h('div.lbl', {}, h('span', {}, t('hud.points')), el.name), h('div', {}, el.num, el.gain), h('div.bar', {}, el.bar), el.next);
    el.clock = h('div.clock.chip');
    el.undo = this._btn('↶', 'icon', () => this._undo(), { title: t('hud.undoT'), kbd: t('kbd.ctrlz'), 'aria-label': t('hud.undo'), 'data-act': 'undo' });
    const btns = h('div.btns.live', {}, el.undo,
      this._btn('📖', 'icon', () => this._book(), { title: t('hud.bookT'), kbd: 'B', 'aria-label': t('hud.book'), 'data-act': 'book' }),
      this._btn('📷', 'icon', () => this._enterPhoto(), { title: t('hud.photoT'), kbd: 'P', 'aria-label': t('hud.photo'), 'data-act': 'photo' }),
      this._btn('☰', 'icon', () => this._menu(), { title: t('hud.menuT'), kbd: 'Esc', 'aria-label': t('hud.menu'), 'data-act': 'menu' }));
    el.hud = h('div.hud', {}, el.score, el.clock, h('div.spacer'), btns);
    if (old) { old.replaceWith(el.hud); this.lastShown = -1; this._hud(); }
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
    return h('div.' + cls, {}, src ? h('img', { src, alt: tileName(k), draggable: 'false' }) : h('span.em', {}, TILES[k].icon));
  }

  // ================= Spielereignisse =================
  _onGame(type, d) {
    if (type === 'reset') { this._clearFx(); this.shown = this.game.S.score; this.lastShown = -1; this._resetBar(); this._renderAll(); }
    else if (type === 'place') { this._keepKind(d.tile.k); this._onPlace(d); this._renderStack(); this._renderFlags(); this._hud(); this.auto.touch(); this._tutEvent('place', d); }
    else if (type === 'stack') { this._renderStack(); }
    else if (type === 'unlock') { this._sfx('unlock'); for (const k of d.kinds || []) this.newKinds.add(k); this._unlockCard(d.kinds || []); this._renderStack(); this._pulseCats(d.kinds || []); }
    else if (type === 'undo') { this._renderAll(); this.auto.touch(); this.toast(t('undo.done')); }
    else if (type === 'end') { clearTimeout(this._endT); this._endT = setTimeout(() => { if (this.mode === 'play' && !this.game.S.stack.length) this._end(); }, 1800); }
  }
  // neue/geladene Insel: Zähler ohne Hüpfen übernehmen; bei einer anderen Insel die Kategorie der Auswahl aufklappen
  _resetBar() {
    const S = this.game.S; if (this.bar) this.bar.prev = null;
    if (!S || this._barFor === S.created) return;
    if (this._barFor != null) this.newKinds.clear();
    this._barFor = S.created;
    if (!this.bar) { this.openCats = null; return; }
    const c = this._catOf(this.game.current()?.k);
    for (const id of [...this.openCats]) if (id !== c) this._setGroup(id, false);
    if (c) this._setGroup(c, true);
    this.activeCat = c;
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
    if (!nu) { this.el.bar.style.width = '100%'; this.el.next.textContent = S.mode === 'kreativ' ? t('hud.allFreeKre') : t('hud.allUnlocked'); return; }
    const prev = Math.max(0, ...UNLOCKS.filter(u => u.at <= v && u.at !== Infinity).map(u => u.at));
    this.el.bar.style.width = (Math.max(0, Math.min(1, (v - prev) / (nu.at - prev))) * 100).toFixed(1) + '%';
    this.el.next.textContent = t('hud.next', { n: fmtNum(nu.at), list: nu.kinds.map(tl).join(', ') });
  }
  _clock() {
    const S = this.game.S, st = this.app.settings || {}; if (!S) return;
    let env = {}; try { env = (typeof this.app.env === 'function' ? this.app.env() : this.app.env) || {}; } catch { }
    const tm = env.time ?? (st.dayCycle === false && st.time != null ? st.time : S.time ?? 12);
    const season = env.season ?? (st.season !== 'auto' && st.season != null ? +st.season : null);
    const ic = tm >= 6 && tm < 8 ? '🌅' : tm >= 8 && tm < 18 ? '☀️' : tm >= 18 && tm < 20.5 ? '🌇' : '🌙';
    const w = WEATHER_ICON[env.weather || (st.weather !== 'auto' ? st.weather : '')] || '';
    const txt = `${ic} ${fmtTime(tm)}${season != null && SEASON_ICON[season] ? ` · ${SEASON_ICON[season]} ${seasonName(season)}` : ''}${w ? ' ' + w : ''} · ${t('hud.day', { n: S.day || 1 })}`;
    if (this.el.clock.textContent !== txt) this.el.clock.textContent = txt;
  }

  // ---------- Bauleiste: Kategorien zum Aufklappen, Karten, seitliches Scrollen ----------
  _catOf(k) { return this.cats?.find(c => c.kinds.includes(k))?.id || null; }
  _buildBar() {
    const S = this.game.S, old = this.bar, keepX = old ? old.track.scrollLeft : 0;
    if (old) { old.sc.stop(); old.ro?.disconnect(); }
    const box = this.el.stack; box.textContent = '';
    const cats = this.cats = barCats(), B = this.bar = { tabs: {}, groups: {}, cards: {}, prev: null, curK: undefined };
    if (!this.openCats) { const c = this._catOf(this.game.current()?.k) || cats[0]?.id; this.openCats = new Set(c ? [c] : []); this.activeCat = c; }
    // aktuelle Auswahl (immer sichtbar, links fest)
    B.curIm = h('div.im'); B.curN = h('span.cn'); B.curFlag = h('span.qf', { hidden: true }); B.curName = h('b'); B.curSub = h('small'); B.tot = h('div.tot');
    B.cur = h('div.bb-cur', { 'aria-live': 'polite' }, h('div.cim', {}, B.curIm, B.curN, B.curFlag), h('div.ctx', {}, B.curName, B.curSub),
      h('div.rot', {}, this._btn('↺', 'small', () => this.app.rotate?.(-1), { title: t('bar.rotL'), 'aria-label': t('bar.rotLa') }),
        this._btn('↻', 'small', () => this.app.rotate?.(1), { title: t('bar.rotR'), 'aria-label': t('bar.rotRa') })), B.tot);
    B.none = h('div.bb-none', {}, h('b', {}, t('bar.empty')), this._btn(t('bar.results'), 'main small', () => this._end(), { 'data-act': 'results' }));
    // Reiter
    B.tabRow = h('div.bb-tabs', { role: 'toolbar', 'aria-label': t('bar.cats') });
    for (const c of cats) {
      const tb = h('button.bb-tab', { type: 'button', 'data-cat': c.id, 'aria-expanded': 'false', title: t('bar.tabToggle', { c: c.name }) },
        h('span.ti', {}, c.icon), h('span.tn', {}, c.name), h('span.ts'), h('span.cv', { 'aria-hidden': 'true' }, '▾'));
      tb.addEventListener('click', () => { this._sfx('click'); this._toggleCat(c.id); });
      B.tabs[c.id] = tb; B.tabRow.append(tb);
    }
    // Karten je Kategorie
    B.track = h('div.bb-track', { 'aria-label': t('bar.pieces') });
    const keys = matchMedia('(hover: hover)').matches;
    for (const c of cats) {
      const g = h('div.bb-grp', { 'data-cat': c.id }, h('div.gi', {}, h('div.gh', {}, h('span', {}, c.icon), c.name), h('div.gc', {}, c.kinds.map((k, i) => this._barCard(k, i, keys)))));
      const on = this.openCats.has(c.id); g.classList.toggle('open', on); if (!on) { g.style.width = '0px'; g.style.display = 'none'; }
      B.groups[c.id] = g; B.track.append(g);
    }
    B.track.append(h('div.bb-hint', {}, t('bar.hint')));
    B.left = h('button.bb-arr.l', { type: 'button', 'aria-label': t('bar.leftA'), title: t('bar.left') }, '‹');
    B.right = h('button.bb-arr.r', { type: 'button', 'aria-label': t('bar.rightA'), title: t('bar.right') }, '›');
    B.wrap = h('div.bb-wrap', {}, B.track, B.left, B.right);
    B.root = h('div.bb.chip.live', {}, B.cur, B.none, B.tabRow, B.wrap);
    const edges = () => this._barEdges();
    B.sc = hscroll(B.track, { pad: 30, snap: () => B.track.querySelectorAll('.bb-grp.open .gh, .bb-grp.open .tc'), onMove: edges });
    B.tabSc = hscroll(B.tabRow, { pad: 20, snap: () => B.tabRow.children, onMove: edges });
    B.left.addEventListener('click', () => { this._sfx('click'); B.sc.page(-1); });
    B.right.addEventListener('click', () => { this._sfx('click'); B.sc.page(1); });
    // Mausrad/Trackpad irgendwo auf der Leiste: seitlich scrollen, nie Kamera oder Seite zoomen
    B.root.addEventListener('wheel', e => {
      e.preventDefault(); if (e.ctrlKey) return;
      (e.target.closest('.bb-tabs') && B.tabSc.can() ? B.tabSc : B.sc).wheel(e);
    }, { passive: false });
    B.ro = typeof ResizeObserver === 'function' ? new ResizeObserver(edges) : null;
    if (B.ro) { B.ro.observe(B.track); B.ro.observe(B.tabRow); for (const g of Object.values(B.groups)) B.ro.observe(g); }
    const hint = keys ? h('div.hint.chip', {}, h('kbd', {}, 'R'), t('bar.kRot'), h('kbd', {}, '1'), '–', h('kbd', {}, '9'), t('bar.kPick'), h('kbd', {}, 'Tab'), t('bar.kCat'), h('kbd', {}, t('kbd.ctrlz')), t('bar.kUndo')) : null;
    box.append(...[hint, B.root].filter(Boolean));
    if (S) this._renderStack();
    B.sc.jump(keepX); requestAnimationFrame(edges);
  }
  _barCard(k, i, keys) {
    const T = TILES[k], src = this._thumb(k), n = h('span.n'), qf = h('span.qf', { hidden: true }), lk = h('span');
    const el = h('div.tc', { role: 'button', tabindex: '0', 'data-kind': k, 'aria-pressed': 'false', title: `${tileName(k)}: ${tileDesc(k)}` },
      h('div.im', {}, src ? h('img', { src, alt: '', draggable: 'false' }) : h('span.em', {}, T.icon)), src && h('div.ic', {}, T.icon),
      h('div.nm', {}, tileName(k)), n, qf, h('div.lock', {}, h('i', {}, '🔒'), lk), h('span.nw', {}, t('bar.new')), keys && i < 9 && h('kbd.key', {}, i + 1));
    el.style.setProperty('--i', i);
    el.addEventListener('click', e => this._choose(k, !!e.target.closest('.qf')));
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._choose(k); } });
    this.bar.cards[k] = { el, n, qf, lk };
    return el;
  }
  // Kategorie auf-/zuklappen. only: alle anderen zu (Tab-Taste)
  _toggleCat(id, { only = false, open } = {}) {
    if (!this.bar?.groups[id]) return;
    const want = open ?? (only || !this.openCats.has(id));
    if (only) for (const c of [...this.openCats]) if (c !== id) this._setGroup(c, false);
    this._setGroup(id, want);
    if (want) this.activeCat = id; else if (this.activeCat === id) this.activeCat = [...this.openCats].pop() || null;
    this._renderStack();
    if (want) { this._revealGroup(id); setTimeout(() => this._revealGroup(id), 380); }
    const tb = this.bar.tabs[this.activeCat]; if (tb) this.bar.tabSc.show(tb);
  }
  _setGroup(id, on) {
    const B = this.bar, g = B.groups[id]; if (!g) return;
    if (on) this.openCats.add(id); else this.openCats.delete(id);
    if (g.classList.contains('open') === on && !g._t) return;
    clearTimeout(g._t); g._t = 0;
    if (!B.root.getClientRects().length) {   // Leiste gerade unsichtbar (Menü): ohne Animation
      g.classList.toggle('open', on); g.classList.remove('pop'); g.style.width = on ? '' : '0px'; g.style.display = on ? '' : 'none'; return;
    }
    B.sc.hold(420);
    const w0 = g.getBoundingClientRect().width;
    if (on) {
      g.style.display = ''; g.style.width = w0 + 'px'; g.classList.add('open', 'pop');
      const w1 = g.firstChild.offsetWidth; void g.offsetWidth; g.style.width = w1 + 'px';
      g._t = setTimeout(() => { g._t = 0; g.style.width = ''; g.classList.remove('pop'); this._barEdges(); }, 760);
    } else {
      g.style.width = w0 + 'px'; void g.offsetWidth; g.classList.remove('open', 'pop'); g.style.width = '0px';
      g._t = setTimeout(() => { g._t = 0; g.style.display = 'none'; this._barEdges(); }, 360);
    }
  }
  // aufgeklappte Kategorie ins Bild scrollen (mit der Breite, die sie nach dem Aufklappen hat)
  _revealGroup(id) {
    const B = this.bar; if (!B || !this.openCats.has(id)) return;
    let x = parseFloat(getComputedStyle(B.track).paddingLeft) || 0;
    for (const c of this.cats) { const g = B.groups[c.id], w = this.openCats.has(c.id) ? g.firstChild.offsetWidth : 0; if (c.id === id) { B.sc.ensure(x, x + w); return; } x += w; }
  }
  _barEdges() {
    const B = this.bar; if (!B) return;
    for (const [el, w] of [[B.track, B.wrap], [B.tabRow, B.tabRow]]) {
      const m = el.scrollWidth - el.clientWidth;
      w.classList.toggle('l', el.scrollLeft > 2); w.classList.toggle('r', el.scrollLeft < m - 2);
    }
  }
  // Bauteil wählen (Klick, Taste). quest: lieber eine Kachel mit Aufgaben-Flagge
  _choose(k, quest = false) {
    const S = this.game.S, T = TILES[k]; if (!S || !T) return;
    if (S.mode === 'kreativ') this.game.setKind(k);
    else {
      const bad = msg => { this._sfx('invalid'); this.toast(msg); const c = this.bar?.cards[k]?.el; if (c) { c.classList.remove('no'); void c.offsetWidth; c.classList.add('no'); } };
      if (!S.unlocked.includes(k)) return bad(t('bar.locked', { tile: tileName(k), n: fmtNum(T.unlock) }));
      const sup = this.game.supply()[k];
      if (!sup?.n) return bad(t('bar.none', { tile: tl(k), more: t(S.mode === 'endlos' ? 'bar.moreEndless' : 'bar.moreGood') }));
      const cur = this.game.current();
      let q = quest && sup.quest > 0;
      if (!quest && cur?.k === k && sup.quest && sup.quest < sup.n) q = !cur.quest;   // zweiter Klick: mit/ohne Aufgabe umschalten
      this.game.pickKind(k, q);
    }
    this._sfx('click'); this.newKinds.delete(k);
    const cat = this._catOf(k); if (cat) { this.activeCat = cat; if (!this.openCats.has(cat)) this._toggleCat(cat, { open: true }); }
    this._renderStack();
    const c = this.bar?.cards[k]?.el; if (c && this.openCats.has(cat)) this.bar.sc.show(c);
  }
  // Nach dem Setzen dieselbe Art behalten (oder eine aus derselben Kategorie), statt zufällig weiterzuspringen
  _keepKind(k) {
    const S = this.game.S; if (!S || S.mode === 'kreativ' || !S.stack.length) return;
    const sup = this.game.supply();
    if (sup[k]?.n) { if (this.game.current()?.k !== k) this.game.pickKind(k); return; }
    const alt = this.cats?.find(c => c.kinds.includes(k))?.kinds.find(x => sup[x]?.n);
    if (alt) this.game.pickKind(alt);
  }
  _pickNth(i) {
    const cat = this.cats?.find(c => c.id === (this.openCats.has(this.activeCat) ? this.activeCat : this._catOf(this.game.current()?.k))) || this.cats?.[0];
    if (!cat) return;
    if (!this.openCats.has(cat.id)) this._toggleCat(cat.id, { open: true });
    if (i < cat.kinds.length) this._choose(cat.kinds[i]);
  }
  _cycleCat(dir) {
    const ids = this.cats?.map(c => c.id); if (!ids?.length) return;
    const cur = ids.indexOf(this.activeCat ?? this._catOf(this.game.current()?.k));
    this._sfx('click'); this._toggleCat(ids[((cur < 0 ? (dir > 0 ? -1 : 0) : cur) + dir + ids.length) % ids.length], { only: true });
  }
  _pulseCats(kinds) {
    for (const id of new Set(kinds.map(k => this._catOf(k)).filter(Boolean))) {
      const tb = this.bar?.tabs[id]; if (!tb) continue;
      tb.classList.remove('pulse'); void tb.offsetWidth; tb.classList.add('pulse'); clearTimeout(tb._p); tb._p = setTimeout(() => tb.classList.remove('pulse'), 2600);
    }
  }
  _renderStack() {
    const S = this.game.S; if (!S) return;
    if (!this.bar) return this._buildBar();
    const B = this.bar, kre = S.mode === 'kreativ', sup = kre ? {} : this.game.supply(), cur = this.game.current(), ck = cur?.k;
    if (ck) this.newKinds.delete(ck);
    B.root.classList.toggle('kre', kre); B.root.classList.toggle('empty', !ck); B.root.classList.toggle('none', !this.openCats.size);
    const prev = B.prev, now = {};
    for (const [k, c] of Object.entries(B.cards)) {
      const lock = !kre && !S.unlocked.includes(k), n = kre ? 0 : sup[k]?.n || 0, q = kre ? 0 : sup[k]?.quest || 0, sel = k === ck;
      now[k] = n;
      c.el.classList.toggle('lock', lock); c.el.classList.toggle('zero', !kre && !lock && !n); c.el.classList.toggle('sel', sel); c.el.classList.toggle('new', this.newKinds.has(k));
      c.el.setAttribute('aria-pressed', sel ? 'true' : 'false');
      c.n.textContent = kre ? '∞' : lock ? '' : n;
      c.lk.textContent = lock ? t('bar.from', { n: fmtNum(TILES[k].unlock) }) : '';
      c.qf.hidden = !q; c.qf.textContent = q > 1 ? `🚩${q}` : '🚩';
      c.qf.title = q ? t('bar.questT', { q }) : '';
      if (prev && prev[k] !== n) { c.el.classList.remove('up', 'down'); void c.el.offsetWidth; c.el.classList.add(n > prev[k] ? 'up' : 'down'); clearTimeout(c._b); c._b = setTimeout(() => c.el.classList.remove('up', 'down'), 700); }
    }
    B.prev = kre ? null : now;
    // Reiter: offen/aktiv, Summe des Vorrats, enthält Auswahl, Aufgaben
    let last = null;
    for (const c of this.cats) {
      const tb = B.tabs[c.id], g = B.groups[c.id], open = this.openCats.has(c.id), act = c.id === this.activeCat && open;
      const sum = c.kinds.reduce((a, k) => a + (sup[k]?.n || 0), 0), qs = c.kinds.some(k => sup[k]?.quest);
      tb.classList.toggle('open', open); tb.classList.toggle('act', act); tb.classList.toggle('has', c.kinds.includes(ck)); tb.setAttribute('aria-expanded', open ? 'true' : 'false');
      tb.lastChild.previousSibling.textContent = kre ? '∞' : sum; tb.classList.toggle('q', !kre && qs); tb.classList.toggle('z', !kre && !sum);
      tb.title = t('bar.tabT', { c: c.name, s: kre ? t('bar.allFree') : t('bar.inStock', { n: sum, q: qs }), open });
      g.classList.toggle('act', act); g.classList.remove('last'); if (open) last = g;
    }
    last?.classList.add('last');
    // aktuelle Auswahl
    if (ck !== B.curK) {
      B.curK = ck; B.curIm.textContent = '';
      if (ck) { const src = this._thumb(ck); B.curIm.append(src ? h('img', { src, alt: '', draggable: 'false' }) : h('span.em', {}, TILES[ck].icon)); B.curName.textContent = tileName(ck); }
      B.curIm.classList.remove('swap'); void B.curIm.offsetWidth; B.curIm.classList.add('swap');
    }
    const n = ck ? sup[ck]?.n || 0 : 0;
    B.curN.textContent = kre ? '∞' : n; B.curN.classList.toggle('inf', kre);
    B.curSub.textContent = kre ? t('bar.free') : S.mode === 'endlos' ? t('bar.endlessN', { n }) : t('bar.stockN', { n });
    B.curFlag.hidden = !cur?.quest; if (cur?.quest) { B.curFlag.textContent = `🚩 +${cur.quest}`; B.curFlag.title = t('bar.quest', { g: GROUP[ck] ? groupName(GROUP[ck]) : t('bar.group'), n: cur.quest }); }
    B.tot.textContent = ''; B.tot.append(h('span', {}, kre ? t('bar.kre') : S.mode === 'endlos' ? t('bar.endless') : t('bar.supply')), h('b', {}, kre || S.mode === 'endlos' ? '∞' : S.stack.length));
    this._barEdges();
  }
  _undo() {
    if (this.mode !== 'play' || !this.game.canUndo()) { if (this.mode === 'play') this.toast(t('undo.none')); return; }
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
    const tile = d.tile, base = this.app.tilePos(tile.q, tile.r), seen = new Set(); let j = 0;
    for (const p of d.parts || []) {
      if (!p.pts) continue; const n = this.game.at(...neighbor(tile.q, tile.r, p.i)), l = partLabel(tile.k, n?.k, p);
      this._pop(edgeAt(base, p.i), '+' + p.pts, seen.has(l) ? '' : l, { delay: 120 * j++ }); seen.add(l);   // gleiche Beschriftung nur einmal
    }
    if (d.perfect) this._perfect(base);
    const edgeB = (d.bonus || 0) - (d.perfect ? 10 : 0);
    if (edgeB > 0) this._pop(up(base, 1.2), '+' + edgeB, t('fx.edge'), { cls: 'gold', delay: 120 * j++ });
    const kl = this.game.S.mode === 'klassisch';
    for (const q of d.quests || []) {
      const [a, b] = unkey(q.key); this._pop(up(this.app.tilePos(a, b), 2.5), '+30', t('fx.quest', { kl }), { cls: 'quest big', delay: 300 });
      setTimeout(() => this._sfx('quest'), 300);
    }
    for (const m of d.milestones || []) this._banner(t('fx.ms', { icon: GROUP_ICON[m.g] || '⭐', g: groupName(m.g), n: m.size }), t('fx.msSub', { p: m.size * 3, kl, n: m.tiles }));
    if (d.total > 0) {
      this.el.gain.textContent = '+' + d.total; this.el.gain.classList.add('on'); this.el.num.classList.add('pop');
      clearTimeout(this._gainT); this._gainT = setTimeout(() => { this.el.gain.classList.remove('on'); this.el.num.classList.remove('pop'); }, 1500);
    }
    this._hover(null);
  }
  _perfect(base) {
    this._sfx('perfect');
    const kl = this.game.S.mode === 'klassisch';
    const it = this._add('perfect', up(base, 2), h('div.in', {}, t('fx.perfect'), h('small', {}, t('fx.perfectSub', { kl }))), 2300);
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
    const card = h('div.ucard.panel.live', {}, h('h3', {}, t('unl.title')),
      h('div.its', {}, kinds.map(k => h('div.it', {}, this._im(k), h('div', {}, h('b', {}, tl(k)), h('p', {}, tileDesc(k)))))),
      kl && h('div.note', {}, t('unl.note')),
      h('div.row.end', {}, this._btn(t('unl.book'), 'ghost small', () => { close(); this._book(this._pageOf(kinds[0])); }),
        this._btn(t('unl.pick'), 'small', () => { close(); this._choose(kinds[0]); }), this._btn(t('unl.ok'), 'main small', () => close(), { 'data-act': 'ok' })));
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
      el.title = t('flag.title', { n: rest, g: groupName(Qs.g) || '' });
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
    if (!ev.ok) card.append(h('div.why', {}, '✋ ' + (ev.why ? phrase(ev.why) : t('hov.nofit'))));
    else {
      card.append(h('div.big' + (ev.pts ? '' : '.zero'), {}, `+${ev.pts}`, h('span', { style: { font: '800 13px var(--font)', color: 'var(--ink2)', marginLeft: '6px' } }, t('points', { c: ev.pts }))));
      const agg = new Map();
      for (const p of ev.parts || []) { if (!p.pts) continue; const n = this.game.at(...neighbor(q, r, p.i)), l = partLabel(kind, n?.k, p); const a = agg.get(l) || { pts: 0, n: 0 }; a.pts += p.pts; a.n++; agg.set(l, a); }
      for (const [l, a] of agg) card.append(h('div.ln', {}, h('span', {}, l + (a.n > 1 ? ` ×${a.n}` : '')), h('b', {}, '+' + a.pts)));
      if (ev.perfect) card.append(h('div.ln', {}, h('span', {}, t('hov.perfect')), h('b', {}, '+10')));
      const eb = (ev.bonus || 0) - (ev.perfect ? 10 : 0); if (eb > 0) card.append(h('div.ln', {}, h('span', {}, t('hov.edge')), h('b', {}, '+' + eb)));
      if (!ev.pts) card.append(h('div.ln', {}, h('span', {}, t('hov.zero'))));
      if (cur?.quest && GROUP[kind]) card.append(h('div.q', {}, t('hov.quest', { g: groupName(GROUP[kind]), n: cur.quest })));
      if (ev.ok) this._tutEvent('hoverOk');
    }
    els.push({ el: h('div', {}, card), pos: up(base, 1.5) });
    for (const p of ev.parts || []) if (p.pts || p.bad) els.push({ el: h('div', {}, h('div.edge' + (p.bad ? '.bad' : ''), {}, p.bad ? '✕' : '+' + p.pts)), pos: edgeAt(base, p.i, 4.2, .4) });
    for (const e of els) { e.el.style.visibility = 'hidden'; this.el.fx.append(e.el); }
    this.hov = { q, r, els };
  }
  _tileInfo(q, r) {
    const t0 = this.game.at(q, r); if (!t0) return; const g = this.game.group(q, r);
    let txt = tileDesc(t0.k); if (g.g) txt += t('info.group', { g: groupName(g.g), n: g.keys.length });
    const Qs = this.game.S.quests[`${q},${r}`]; if (Qs && !Qs.done) txt += t('info.quest', { n: Math.max(0, Qs.n - g.keys.length) });
    this.showInfo(tl(t0.k), txt);
  }

  // ---------- Anleitung ----------
  _tutStep() { const S = this.game.S; return S && this.mode === 'play' && (S.tut | 0) < TUT.length ? S.tut | 0 : -1; }
  _renderTut() {
    const box = this.el.tut; box.textContent = ''; box.className = 'tut';
    if (this.pointer) { this.pointer.el.remove(); this.pointer = null; }
    for (const tb of Object.values(this.bar?.tabs || {})) tb.classList.remove('hint');
    const i = this._tutStep(); if (i < 0) return;
    const st = TUT[i], S = this.game.S;
    if (i === 7 && Object.values(S.ms || {}).some(v => v > 0)) { this._tutNext(); return; }
    if (st.at === 'stack') box.classList.add('at-stack');
    let x = t(`tut.${i}.x`);
    const has = re => S.mode === 'kreativ' || S.stack.some(e => re.test(e.k));
    if (i === 4) x += has(/^(bach|bachk|bachg|quelle|see)$/) ? t('tut.4.has', { cat: '💧 ' + catName('wasser') }) : t('tut.4.no');
    if (i === 5) x += has(/^haus$/) ? t('tut.5.has', { cat: '🏠 ' + catName('wohnen') }) : t('tut.5.no');
    for (const tb of Object.values(this.bar?.tabs || {})) tb.classList.toggle('hint', tb.dataset.cat === st.cat);
    const bub = h('div.bub.panel.live', {}, h('div.st', {}, h('span', {}, t('tut.step', { i: i + 1, n: TUT.length })), h('div.dots', {}, TUT.map((_, j) => h('i' + (j <= i ? '.on' : ''))))),
      h('h4', {}, t(`tut.${i}.t`)), h('p', {}, x),
      st.need && h('div.chk', {}, st.need.map(([k, l]) => h('span' + (this.tutSeen.has(k) ? '.ok' : ''), {}, (this.tutSeen.has(k) ? '✓ ' : '○ ') + t(l)))),
      h('div.row', {}, this._btn(t('tut.skip'), 'ghost small', () => this._tutSkip(), { 'data-act': 'tutSkip' }), h('div.grow'), st.btn && this._btn(t(st.btn), 'small', () => this._tutNext(), { 'data-act': 'tutNext' })));
    box.append(h('div.pip', { 'aria-hidden': 'true' }, '🐦'), bub);
    if (st.point) {
      const ht = [...this.game.board.values()].find(x => x.k === 'haus') || this.game.at(0, 0);
      if (ht) { const el = h('div', {}, h('div.pointer', {}, h('div.in', {}, '👇'))); this.el.fx.append(el); this.pointer = { el, pos: up(this.app.tilePos(ht.q, ht.r), 4) }; }
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
    if (S.tut >= TUT.length) { store.setFlag('tutDone', true); this.toast(t('tut.done')); }
    this._renderTut();
  }
  _tutSkip() { const S = this.game.S; if (!S) return; S.tut = TUT.length; store.setFlag('tutDone', true); this.auto.touch(); this._renderTut(); this.toast(t('tut.skipped')); }

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
  _closeX(fn) { return h('div.x', {}, this._btn('✕', 'ghost icon', fn, { 'aria-label': t('close'), title: t('closeEsc') })); }
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
    if (!store.available()) this.toast(t('err.noStore'), 'err');
    const cur = store.current(), d = cur && store.load(cur);
    try {
      if (d && (!this.game.S || this.game.S.created !== d.S.created)) await this.app.loadGame(d.S);
      else if (!d && !this.game.S) await this.app.newGame({ name: t('island.default') });
    } catch (e) { console.error(e); this.toast(t('err.lastLoad'), 'err'); }
    this.slot = d && this.game.S && this.game.S.created === d.S.created ? cur : 0;
    this._menu();
  }
  _menu() {
    if (this.mode === 'photo') this._exitPhoto();
    this._closeAll(); this.mode = 'menu'; this.root.classList.add('menu'); this._hover(null); this.auto.flush();
    const active = this.slot && this.game.S, cur = store.current(), cd = !active && cur && store.load(cur);
    const items = [];
    const A = act => ({ 'data-act': act });
    if (active) items.push(this._btn([h('span.e', {}, '▶'), t('menu.continue'), h('span.d', {}, `${this.game.S.name} · ${t('pts', { n: fmtNum(this.game.S.score) })}`)], 'main', () => this._play(), A('continue')));
    else if (cd) items.push(this._btn([h('span.e', {}, '▶'), t('menu.continue'), h('span.d', {}, `${cd.meta.name} · ${t('pts', { n: fmtNum(cd.meta.score) })}`)], 'main', () => this._loadSlot(cur), A('continue')));
    items.push(this._btn([h('span.e', {}, '🏝️'), t('menu.new')], active || cd ? '' : 'main', () => this._newIsland(), A('new')),
      this._btn([h('span.e', {}, '🗂️'), t('menu.islands'), h('span.d', {}, `${store.list().filter(s => !s.empty).length} / ${store.SLOTS}`)], '', () => this._islands(), A('islands')),
      this._btn([h('span.e', {}, '🐦'), t('menu.tut')], '', () => this._restartTut(), A('tutorial')),
      this._btn([h('span.e', {}, '📖'), t('menu.book')], '', () => this._book(), A('book')),
      this._btn([h('span.e', {}, '⚙️'), t('menu.settings')], '', () => this._settings(), A('settings')));
    const foot = h('div.foot', {}, active ? t('menu.saved', { n: this.slot }) : t('menu.cozy'));
    const wrap = h('div.title-wrap', {}, h('div.title', {}, h('h1', {}, t('game.title')), h('div.sub', {}, t('game.sub'))), this._langSwitch('langs'), h('div.mmenu.panel', {}, items, foot));
    const s = this._screen(wrap, { dim: false, closable: !!active, name: 'menu' });
    s.scr.style.background = 'radial-gradient(ellipse at center, rgba(255,246,228,.25), rgba(60,40,20,.28))';
    setTimeout(() => items[0]?.focus(), 50);
  }
  _play() {
    this._closeAll(); this.mode = 'play'; this.root.classList.remove('menu'); this._renderAll();
    const S = this.game.S; if (S && S.mode === 'klassisch' && !S.stack.length) setTimeout(() => this._end(), 400);
  }
  async _loadSlot(n) {
    const d = store.load(n); if (!d) { this.toast(t('slot.emptyErr'), 'err'); return; }
    try { if (!this.game.S || this.game.S.created !== d.S.created || this.slot !== n) await this.app.loadGame(d.S); }
    catch (e) { console.error(e); this.toast(t('err.load'), 'err'); return; }
    this.slot = n; store.setCurrent(n); this._play(); this.toast(t('welcomeBack', { name: this.game.S.name }));
  }
  _restartTut() {
    if (this.slot && this.game.S) { this.game.S.tut = 0; this.tutSeen.clear(); this._play(); }
    else this._newIsland({ tut: true });
  }

  // ---------- Neue Insel ----------
  _newIsland({ tut } = {}) {
    const used = new Set(store.list().filter(s => !s.empty).map(s => s.meta.name));
    const free = t('island.names').filter(n => !used.has(n)), name = free[Math.floor(Math.random() * free.length)] || t('island.default');
    let mode = 'klassisch';
    const inp = h('input', { type: 'text', value: name, maxlength: 40, spellcheck: 'false' });
    const modeEls = Object.keys(MODE_ICON).map(k => {
      const el = h('div.mode' + (k === mode ? '.on' : ''), { role: 'radio', tabindex: '0', 'aria-checked': k === mode ? 'true' : 'false', 'data-mode': k }, h('div.e', {}, MODE_ICON[k]), h('b', {}, modeName(k)), h('small', {}, modeDesc(k)));
      const sel = () => { mode = k; modeEls.forEach(e => { e.classList.toggle('on', e === el); e.setAttribute('aria-checked', e === el); }); this._sfx('click'); };
      el.addEventListener('click', sel); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sel(); } });
      return el;
    });
    const slots = store.list(), firstFree = slots.find(s => s.empty)?.n || [...slots].sort((a, b) => a.meta.updated - b.meta.updated)[0].n;
    const slotSel = h('select', {}, slots.map(s => h('option', { value: s.n, selected: s.n === firstFree }, t('new.slotOpt', { n: s.n, x: s.empty ? t('new.free') : t('new.replace', { name: s.meta.name }) }))));
    const tutCb = h('input', { type: 'checkbox', checked: tut ?? !store.getFlag('tutDone') });
    const s = this._screen(this._modal(t('menu.new'),
      this._closeX(() => this._close(s)),
      h('label.f', {}, h('span', {}, t('new.name')), inp),
      h('div.sec', {}, t('new.mode')), h('div.modes', { role: 'radiogroup' }, modeEls),
      h('label.f', {}, h('span', {}, t('new.slot')), slotSel),
      h('label.check', {}, tutCb, t('new.tut')),
      h('div.row.end', {}, this._btn(t('cancel'), 'ghost', () => this._close(s)), this._btn(t('new.create'), 'main', () => go(), { 'data-act': 'create' }))), { name: 'new' });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    setTimeout(() => { inp.focus(); inp.select(); }, 60);
    const go = async () => {
      const n = +slotSel.value, nm = inp.value.trim().slice(0, 40) || t('island.default'), old = store.load(n);
      if (old && !(await this.confirm({ title: t('new.overT'), text: t('new.overX', { name: old.meta.name, p: fmtNum(old.meta.score), n }), ok: t('new.over'), danger: true }))) return;
      try { await this.app.newGame({ mode, name: nm }); } catch (e) { console.error(e); this.toast(t('err.create'), 'err'); return; }
      const S = this.game.S; S.name = nm; S.tut = tutCb.checked ? 0 : TUT.length; this.tutSeen.clear();
      this.slot = n; store.save(n, this.game, null); store.setCurrent(n);
      this._play(); this.toast(t('welcome', { name: nm }));
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
          list.append(h('div.slot.empty', { 'data-slot': sl.n }, h('div.th', {}, '☁️'), h('div.tx', {}, h('b', {}, t('isl.emptySlot', { n: sl.n })), h('small', {}, t('isl.room'))),
            h('div.acts', {}, this._btn(t('menu.new'), 'small', () => this._newIsland()), this._btn(t('isl.fromFile'), 'ghost small', () => { this._importTo = sl.n; file.click(); }))));
          continue;
        }
        const m = sl.meta, cur = this.slot === sl.n;
        list.append(h('div.slot' + (cur ? '.cur' : ''), { 'data-slot': sl.n },
          h('div.th', {}, m.thumb ? h('img', { src: m.thumb, alt: '' }) : '🏝️'),
          h('div.tx', {}, h('b', {}, m.name, cur && h('span.tag', {}, t('isl.active'))), h('small', {}, t('isl.meta', { p: fmtNum(m.score), t: fmtNum(m.tiles), mode: MODE_ICON[m.mode] ? modeName(m.mode) : m.mode })), h('small', {}, t('isl.slot', { n: sl.n, ago: ago(m.updated) }))),
          h('div.acts', {},
            this._btn(t('isl.play'), 'main small', () => this._loadSlot(sl.n), { 'data-act': 'play' }),
            this._btn('✏️', 'small', () => this._rename(sl.n, render), { title: t('isl.rename'), 'aria-label': t('isl.rename'), 'data-act': 'rename' }),
            this._btn('⧉', 'small', () => { const to = store.duplicate(sl.n, t('copy')); if (to) { this.toast(t('isl.copied', { n: to })); render(); } else this.toast(t('isl.noCopy'), 'err'); }, { title: t('isl.copy'), 'aria-label': t('isl.copy'), 'data-act': 'copy' }),
            this._btn('⬇', 'small', () => { if (cur) this.auto.flush(); if (store.exportFile(sl.n)) this.toast(t('isl.exported')); }, { title: t('isl.export'), 'aria-label': t('isl.export'), 'data-act': 'export' }),
            this._btn('🗑', 'small', () => this._remove(sl.n, render), { title: t('isl.del'), 'aria-label': t('isl.del'), 'data-act': 'delete' }))));
      }
    };
    if (this.slot) this.auto.flush();
    render();
    const s = this._screen(this._modal(t('menu.islands'), this._closeX(() => this._close(s)), list, file,
      h('div.row', { style: { marginTop: '14px' } }, this._btn(t('isl.load'), '', () => { this._importTo = 0; file.click(); }), h('div.grow'), this._btn(t('back'), 'ghost', () => this._close(s)))), { name: 'islands' });
    s.scr.firstChild.style.width = 'min(640px, 100%)';
  }
  async _rename(n, render) {
    const d = store.load(n); if (!d) return;
    const name = await this.prompt({ title: t('isl.renameT'), value: d.meta.name, ok: t('isl.rename') }); if (!name) return;
    if (store.rename(n, name)) { if (this.slot === n && this.game.S) { this.game.S.name = name.slice(0, 40); this._hud(); } render(); }
  }
  async _remove(n, render) {
    const d = store.load(n); if (!d) return;
    const ok = await this.confirm({ title: t('isl.delT'), text: t('isl.delX', { name: d.meta.name, p: fmtNum(d.meta.score) }), ok: t('isl.del'), danger: true });
    if (!ok) return;
    store.remove(n); if (this.slot === n) this.slot = 0;
    this.toast(t('isl.deleted', { name: d.meta.name })); render();
  }
  async _import(f, render) {
    let S; try { S = await store.importFile(f); } catch (e) { this.toast(e.message ? t(e.message) : t('isl.readErr'), 'err'); return; }
    const n = (this._importTo && !store.load(this._importTo) ? this._importTo : 0) || store.firstFree();
    if (!n) { this.toast(t('isl.full', { n: store.SLOTS }), 'err'); return; }
    const newer = S.__newer; delete S.__newer;
    if (store.save(n, S, null)) { this.toast(t('isl.imported', { name: S.name, n, newer })); render(); }
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
    const pct = x => t('pct', { n: Math.round(x * 100) });
    const [mus, musV] = range('music', 0, 1, .05, pct), [sfx, sfxV] = range('sfx', 0, 1, .05, pct), [tim, timV] = range('time', 0, 24, .25, fmtTime);
    sfx.addEventListener('change', () => this._sfx('place'));
    const cyc = h('input', { type: 'checkbox', checked: st.dayCycle !== false });
    const sync = () => { tim.disabled = cyc.checked; tim.style.opacity = cyc.checked ? .4 : 1; };
    cyc.addEventListener('change', () => { st.dayCycle = cyc.checked; if (!cyc.checked && st.time == null) st.time = 12; sync(); apply(); }); sync();
    const sel = (key, opts) => { const s = h('select', { 'aria-label': key }, opts.map(([v, l]) => h('option', { value: v, selected: String(st[key]) === String(v) }, l))); s.addEventListener('change', () => { st[key] = s.value === 'auto' ? 'auto' : isNaN(+s.value) ? s.value : +s.value; apply(); }); return s; };
    const s = this._screen(this._modal(t('set.title'), this._closeX(() => this._close(s)),
      h('div.set', {}, h('span', {}, t('set.lang')), this._langSwitch('seg')),
      h('div.sec', {}, t('set.gfx')), h('div.set', {}, h('span', {}, t('set.quality')), seg('quality', ['niedrig', 'mittel', 'hoch'].map(q => [q, t('set.q.' + q)]))),
      h('div.sec', {}, t('set.sound')), h('div.set', {}, h('span', {}, t('set.music')), mus, musV), h('div.set', {}, h('span', {}, t('set.sfx')), sfx, sfxV),
      h('div.sec', {}, t('set.mood')),
      h('label.check', {}, cyc, t('set.cycle')), h('div.set', {}, h('span', {}, t('set.time')), tim, timV),
      h('div.set', {}, h('span', {}, t('set.season')), h('div', { style: { gridColumn: 'span 2' } }, sel('season', [['auto', t('weather.auto')], ...SEASON_ICON.map((ic, i) => [i, `${ic} ${seasonName(i)}`])]))),
      h('div.set', {}, h('span', {}, t('set.weather')), h('div', { style: { gridColumn: 'span 2' } }, sel('weather', WEATHER.map(w => [w, t('weather.' + w)])))),
      h('div.row.end', { style: { marginTop: '8px' } }, this._btn(t('done'), 'main', () => this._close(s), { 'data-act': 'done' }))), { name: 'settings' });
  }
  // Sprachwahl: kind 'langs' = kleine Flaggen im Startmenü, 'seg' = Umschalter in den Einstellungen
  _langSwitch(kind) {
    const cur = getLang(), box = h('div.' + kind, { role: 'radiogroup', 'aria-label': t('menu.lang') });
    for (const l of LANGS) {
      const [flag, ...rest] = LANG_LABEL[l].split(' ');
      const b = h('button', { type: 'button', class: (kind === 'langs' ? 'btn small ' : '') + (l === cur ? 'on' : ''), 'data-lang': l, 'aria-checked': l === cur ? 'true' : 'false', role: 'radio', title: LANG_LABEL[l] },
        kind === 'langs' ? [h('span.fl', {}, flag), ' ', l.toUpperCase()] : LANG_LABEL[l]);
      b.addEventListener('click', () => { if (l === getLang()) return; this._sfx('click'); this.setLang(l); });
      box.append(b);
    }
    return box;
  }

  // ---------- Handbuch ----------
  _pages() {
    const P = [], S = this.game.S, unl = k => !S || S.unlocked.includes(k) || k === 'start';
    const tbl = (head, rows) => h('table.t', {}, h('tr', {}, head.map(x => h('th', {}, x))), rows.map(r => h('tr', {}, r.map(c => c && c.nodeType ? h('td', {}, c) : h('td', typeof c === 'object' && c ? { class: c.cls } : {}, typeof c === 'object' && c ? c.t : c)))));
    const li = key => h('li', { html: key });   // Texte mit <b> aus i18n.js
    // Steuerung
    const ctl = rows => h('div.ctl', {}, rows.flatMap(([a, b]) => [h('kbd', {}, a), h('span', {}, b)]));
    P.push({ ch: t('ch.ctl'), el: [h('h3', {}, t('b.ctl')), h('h4', {}, t('b.mouse')), ctl(t('ctl.maus')), h('h4', {}, t('b.touch')), ctl(t('ctl.touch')), h('h4', {}, t('b.keys')), ctl(t('ctl.keys'))] });
    // Kacheln
    const likers = b => KINDS.filter(k => TILES[k].likes?.[b]).map(k => [k, `${tileName(k)} (${TILES[k].likes[b]})`]);
    const entry = k => {
      const T = TILES[k], src = this._thumb(k), nb = Object.keys(REP).map(b => [b, affinity(k, REP[b])]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
      const lk = likers(T.biome).filter(([j]) => j !== k).map(x => x[1]);
      return h('div.tile-e', { 'data-kind': k },
        h('div.im', {}, src ? h('img', { src, alt: '' }) : T.icon, !unl(k) && h('div.lock', { title: t('b.locked') }, '🔒')),
        h('div', {}, h('b', {}, tl(k)), h('p', {}, tileDesc(k)),
          h('div.k', {}, h('em', {}, t('b.edges')), [...new Set(T.edges)].map(e => `${edgeName(e)} ${[...T.edges].filter(x => x === e).length}×`).join(', ')),
          h('div.k', {}, h('em', {}, t('b.nb')), nb.length ? nb.map(([b, p]) => `${biomeName(b)} ${p}`).join(' · ') : '–'),
          T.likes && h('div.k', {}, h('em', {}, t('b.likes')), Object.entries(T.likes).map(([b, p]) => `${biomeName(b)} (+${p})`).join(', ')),
          lk.length > 0 && h('div.k', {}, h('em', {}, t('b.liked')), lk.join(', ')),
          h('div.k', {}, h('em', {}, t('b.group')), GROUP[k] ? groupName(GROUP[k]) : t('b.noGroup'), ' · ', h('em', {}, t('b.avail')), k === 'start' ? t('b.start') : T.unlock ? t('b.from', { n: fmtNum(T.unlock) }) : t('b.always'))),
        h('div', { html: edgeSvg(k) }));
    };
    const cats = barCats(), home = cats.find(c => c.id === 'wege') || cats[0];   // Dorfbrunnen zu Wege & Plätze
    cats.forEach((c, j) => {
      const ks = [...(c === home ? ['start'] : []), ...c.kinds];
      P.push({ ch: t('ch.tiles'), kinds: ks, el: [h('h3', {}, `${c.icon} ${c.name}`),
        h('div.catnav', {}, cats.map(o => h('button' + (o === c ? '.on' : ''), { type: 'button', 'data-goto': o.kinds[0] }, `${o.icon} ${o.name}`))),
        h('p.cinfo', {}, t('b.cinfo', { n: ks.length, u: ks.filter(unl).length })),
        j === 0 && h('div.legend', {}, EDGE_KEYS.map(e => h('span', {}, h('i', { style: { background: EDGE_COL[e] } }), edgeName(e)))), ks.map(entry)] });
    });
    // Punkte & Regeln
    const B = Object.keys(REP), chR = t('ch.rules');
    P.push({ ch: chR, el: [h('h3', {}, t('b.nbT')), h('p', {}, t('b.nb1')),
      tbl(['', ...B.map(biomeName)], B.map(a => [h('b', {}, biomeName(a)), ...B.map(b => { const p = affinity(REP[a], REP[b]); return { t: p || '·', cls: p >= 3 ? 'hi' : p ? '' : 'lo' }; })])),
      h('p', {}, t('b.nb2'))] });
    P.push({ ch: chR, el: [h('h3', {}, t('b.rulesT')), h('ul', {},
      li(t('r.streams')), li(t('r.paths')), li(t('r.perfect')),
      KINDS.filter(k => TILES[k].edgeBonus).map(k => li(t('r.edge', { tile: tileName(k), n: TILES[k].edgeBonus }))),
      li(t('r.connect')),
      li(t('r.likes', { list: KINDS.filter(k => TILES[k].likes).map(k => `${tileName(k)} (${Object.entries(TILES[k].likes).map(([b, p]) => `${biomeName(b)} ${p}`).join(', ')})`).join(' · ') })),
      li(t('r.undo')))] });
    // Gruppen & Meilensteine
    const members = g => ['start', ...KINDS].filter(k => GROUP[k] === g).map(tileName).join(', '), chG = t('ch.groups');
    P.push({ ch: chG, el: [h('h3', {}, t('b.groupsT')), h('p', {}, t('b.groups1')),
      tbl(t('b.gHead'), Object.keys(GROUP_NAMES).map(g => [`${GROUP_ICON[g]} ${groupName(g)}`, members(g)])),
      tbl(t('b.mHead'), MILESTONES.map((m, j) => [t('nTiles', { n: m, c: m }), `+${m * 3}`, `+${j + 2}`])),
      h('p', { style: { fontSize: '13px', color: 'var(--ink2)' } }, t('b.mFoot')),
      h('h4', {}, t('b.growT')), h('p', {}, t('b.grow'))] });
    P.push({ ch: chG, el: [h('h3', {}, t('b.unlT')), h('p', {}, t('b.unl')),
      tbl(t('b.uHead'), UNLOCKS.filter(u => u.at !== Infinity).map(u => [u.at ? fmtNum(u.at) : t('b.uStart'), u.kinds.map(tl).join(', ')]))] });
    // Aufgaben
    P.push({ ch: t('ch.quests'), el: [h('h3', {}, t('b.questT')), h('p', {}, t('b.q1')), h('p', {}, t('b.q2')), h('p', { html: t('b.q3') }), h('p', {}, t('b.q4'))] });
    // Tipps
    P.push({ ch: t('ch.tips'), el: [h('h3', {}, t('b.tipsT')), h('ul', {}, t('b.tips').map(x => h('li', {}, x))),
      h('h4', {}, t('b.modes')), h('ul', {}, Object.keys(MODE_ICON).map(k => h('li', {}, h('b', {}, `${MODE_ICON[k]} ${modeName(k)}: `), modeDesc(k))))] });
    return P;
  }
  _pageOf(kind) { return this._pages().findIndex(p => p.kinds?.includes(kind)); }
  _book(page) {
    if (this._find('book')) { this._close(this._find('book')); return; }
    if (this.mode === 'photo') return;
    const pages = this._pages(); this.bookPage = page >= 0 ? page : (this.bookPage || 0);
    const chs = [...new Set(pages.map(p => p.ch))];
    const nav = h('nav', {}, h('h2', {}, t('book.title'), h('small.brand', {}, t('game.title')))), body = h('div.body'), info = h('span'), prev = this._btn(t('book.prev'), 'small', () => go(this.bookPage - 1), { 'data-act': 'prev' }), next = this._btn(t('book.next'), 'small', () => go(this.bookPage + 1), { 'data-act': 'next' });
    const tabs = chs.map(c => { const b = h('button', { type: 'button' }, c); b.addEventListener('click', () => { this._sfx('click'); go(pages.findIndex(p => p.ch === c)); }); nav.append(b); return b; });
    const go = i => {
      const P = this._pages(); this.bookPage = Math.max(0, Math.min(P.length - 1, i));
      body.textContent = ''; body.append(...P[this.bookPage].el.flat(3).filter(Boolean)); body.scrollTop = 0;
      tabs.forEach((b, j) => b.classList.toggle('on', chs[j] === P[this.bookPage].ch));
      info.textContent = t('book.page', { i: this.bookPage + 1, n: P.length }); prev.disabled = this.bookPage === 0; next.disabled = this.bookPage === P.length - 1;
    };
    const s = this._screen(h('div.book.panel', { role: 'dialog', 'aria-label': t('hud.book') }, nav, h('div.pg', {}, body, h('div.foot', {}, prev, info, next)), h('div.x', {}, this._btn('✕', 'ghost icon', () => this._close(s), { 'aria-label': t('close') }))), { name: 'book' });
    body.addEventListener('click', e => { const b = e.target.closest('[data-goto]'); if (b) { this._sfx('click'); go(this._pageOf(b.dataset.goto)); } });
    s.go = go; s.scr.firstChild.style.position = 'relative'; go(this.bookPage);
  }
  _refreshBook() { const b = this._find('book'); if (b) b.go(this.bookPage); }

  // ---------- Fotomodus ----------
  _enterPhoto() {
    if (this.mode === 'photo' || !this.game.S) return;
    this._closeAll(); this.mode = 'photo'; this.root.classList.remove('menu'); this.root.classList.add('photo'); this._hover(null);
    this.el.toasts.textContent = ''; this.hideInfo();
    try { this.app.photo?.(true); } catch (e) { console.warn(e); }
    this._photoBar();
    try { this.app.setFilter?.(this.filter); } catch { }
  }
  _photoBar() {
    const fl = h('div.filters', { role: 'radiogroup', 'aria-label': t('ph.filters') });
    for (const k of FILTERS) { const b = h('button', { type: 'button', class: k === this.filter ? 'on' : '', 'data-filter': k }, t('filter.' + k)); b.addEventListener('click', () => { this.filter = k; [...fl.children].forEach(c => c.classList.toggle('on', c === b)); this._sfx('click'); try { this.app.setFilter?.(k); } catch (e) { console.warn(e); } }); fl.append(b); }
    const tlb = this._btn(t('ph.tl'), '', () => this._timelapse(false), { 'data-act': 'timelapse' }), rec = this._btn(t('ph.rec'), '', () => this._timelapse(true), { 'data-act': 'record' });
    this.photoBar = h('div.photobar.panel.live', {}, fl, h('div.row', {}, this._btn(t('ph.snap'), 'main', () => this._snap(), { 'data-act': 'snap' }), tlb, rec, h('div.grow'), this._btn(t('ph.exit'), 'ghost', () => this._exitPhoto(), { kbd: 'Esc', 'data-act': 'exit' })));
    this.el.screens.append(this.photoBar);
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
      this._sfx('photo'); this.toast(t('ph.saved'));
    } catch (e) { console.warn(e); this.toast(t('ph.err'), 'err'); }
  }
  async _timelapse(record) {
    if (this._tl) return; this._tl = true;
    if (this.mode !== 'photo') this._enterPhoto();
    if (this.photoBar) this.photoBar.style.display = 'none';
    this.recPill = h('div.recpill.chip', {}, h('i'), t(record ? 'ph.recording' : 'ph.playing')); this.el.screens.append(this.recPill);
    try { await this.app.timelapse?.({ record }); if (record) this.toast(t('ph.video')); }
    catch (e) { console.warn(e); this.toast(t('ph.tlErr'), 'err'); }
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
    const s = this._screen(this._modal(t('end.title'), this._closeX(() => this._close(s)),
      h('p', {}, t('end.text', { name: S.name })),
      h('div.stats', {}, st(fmtNum(S.score), t('end.points'), '.big'), st(fmtNum(Math.max(0, S.tiles.length - 1)), t('end.tiles')), st(S.stats.perfect || 0, t('end.perfect')),
        st(S.stats.quests || 0, t('end.quests')), st(fmtDur(S.stats.playtime), t('end.time'))),
      best.length > 0 && h('div.sec', {}, t('end.best')), best.length > 0 && h('div.groups', {}, best.map(([g, n]) => h('span', {}, `${GROUP_ICON[g] || ''} ${groupName(g)}: ${n}`))),
      h('div.row', {}, this._btn(t('end.photo'), 'grow', () => this._enterPhoto(), { 'data-act': 'photo' }), this._btn(t('ph.tl'), 'grow', () => this._timelapse(false), { 'data-act': 'timelapse' })),
      h('div.row', { style: { marginTop: '10px' } }, this._btn(t('end.endless'), 'wood grow', () => { this._close(s); this.game.endless(); this.auto.touch(); this.toast(t('end.endlessT')); }, { 'data-act': 'endless' }),
        this._btn(t('end.new'), 'main grow', () => this._newIsland(), { 'data-act': 'new' }))), { name: 'end' });
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
    if (top || this.mode !== 'play' || !this.game.S) return;
    if (/^[1-9]$/.test(k)) { e.preventDefault(); this._pickNth(+k - 1); }
    else if (k === 'Tab') { e.preventDefault(); this._cycleCat(e.shiftKey ? -1 : 1); }
  }
}
