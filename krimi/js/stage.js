// Brücke zur 3D-Welt. Lädt die Engine-Seite des Falls (cases/<ordner>/world.html) als <iframe> im Live-Modus und spricht
// mit iframe.contentWindow.whatif.live. Gibt es keine Welt-Datei, zeigt sie eine Ersatzansicht (Standpunkte als gezeichnete
// Fläche mit anklickbaren Objekt-Kärtchen aus cluesAt), damit der Fall schon ohne 3D durchspielbar ist.
//
//   const stage = new Stage({ cluesAt })
//   await stage.mount(el, { c, dir, id, lang, state, world })   → 'world' | 'fallback'
//   stage.setState(s)         neuer Spielstand (Spurentafeln, Schlösser, Ereignisse)
//   stage.goto(view)          Standpunkt anfliegen                    → live.view(name)
//   stage.onFind(cb)          Klick auf ein Spurenobjekt: cb({ obj, clues, point })   ← live.on('click')
//   stage.onView(cb)          Spieler wechselt den Standpunkt in der Ansicht: cb(viewId)
//   stage.inspect(obj|null)   Lupen-Modus an/aus                      → live.inspect(id)
//   stage.highlight(obj, on)  Aufleuchten („Spürsinn“)                → live.highlight(id, on)
//   stage.events(list)        Ereignisliste [{ id, at }]              → live.events(list)
//   stage.lang(code)          Texte im Bild neu zeichnen              → live.lang(code)
//   stage.say(person, opts)   Schauspiel-Schicht im Gespräch          → live.say(person, opts)
//   stage.pick(x, y)          → { id, point } | null                   → live.pick(x, y)
//   stage.replay()            Nachstellung mit Regler (Promise, löst beim Schließen auf)
//   stage.seek(t) / play() / pause() / setRate(r), stage.time, stage.dur
//   stage.unmount()
import { t, tc, hasC, fmtClock, fmtTime } from './i18n.js';
import { h, icon, ico, findIcon, hash, viewsOf, placeOf, placeOfView, modal, clueOf, varsOf } from './ui.js';

const SCENE_FINDS = new Set(['look', 'zoom', 'open']);           // in der Ersatzansicht anklickbar (+ alle tool:*)
const sceneFind = f => SCENE_FINDS.has(f) || String(f || '').startsWith('tool:');

export class Stage {
  constructor({ cluesAt } = {}) {
    this.cluesAt = cluesAt || ((c, place) => (c.clues || []).filter(x => x.place === place));
    this.mode = null; this.c = null; this.s = null; this.el = null; this.view = null;
    this._find = []; this._view = []; this.live = null; this.iframe = null; this._q = [];
    this.time = 0; this.dur = 0; this.rate = 1; this.playing = false; this.replaying = false;
    this.touched = new Set();      // angeklickte Extra-Objekte (Thermoskanne …), nur Anzeige
  }

  // ---------- Einbinden ----------
  async mount(el, info) {
    this.unmount();
    this.el = el; this.c = info.c; this.s = info.state || null; this.dir = info.dir; this.code = info.lang;
    this.view = info.state?.view || firstView(this.c);
    this.touched = new Set(info.touched || []);
    const url = new URL('world.html', new URL(info.dir, location.href));
    const force = new URLSearchParams(location.search).get('world');   // ?world=0 = always the stand-in view (tests), ?world=1 = always 3D
    const want = force === '0' ? false : force === '1' || info.world !== false && (info.world === true || await exists(url));
    if (want) { this.mode = 'world'; this._mountWorld(url); }
    else { this.mode = 'fallback'; this._drawFallback(); }
    return this.mode;
  }
  unmount() {
    clearInterval(this._poll); this._poll = 0;
    if (this.el) this.el.innerHTML = '';
    this.live = null; this.iframe = null; this._q = []; this.mode = null;
  }
  onFind(cb) { this._find.push(cb); return () => { this._find = this._find.filter(f => f !== cb); }; }
  onView(cb) { this._view.push(cb); return () => { this._view = this._view.filter(f => f !== cb); }; }
  _emitFind(e) { for (const f of this._find) f(e); }

  // ---------- Zustand ----------
  setState(s) {
    this.s = s;
    if (this.mode === 'fallback') this._drawFallback();
    else this._call('events', this._eventList());
  }
  // Ereignisse der Logik + Spurentafeln für gefundene Spuren (nur abgeleitet, nicht gespeichert)
  _eventList() {
    const s = this.s; if (!s) return [];
    const list = (s.events || []).map(e => ({ ...e }));
    (s.found || []).forEach((id, i) => { const cl = clueOf(this.c, id); if (cl?.obj && sceneFind(cl.find)) list.push({ id: 'found:' + cl.obj, clue: id, n: i + 1, at: 0 }); });
    return list;
  }

  // ---------- Befehle (Welt oder Ersatz) ----------
  goto(view) {
    if (!view) return;
    this.view = view;
    if (this.mode === 'world') this._call('view', view); else this._drawFallback();
  }
  inspect(obj) {
    if (this.mode === 'world') return this._call('inspect', obj ?? null);
    if (obj) this._lupe(obj);
  }
  highlight(obj, on = true) {
    if (this.mode === 'world') return this._call('highlight', obj, !!on);
    const b = this.el?.querySelector(`.obj[data-obj="${CSS.escape(obj)}"]`); if (b) { b.classList.remove('flash'); void b.offsetWidth; if (on) b.classList.add('flash'); }
  }
  events(list) { if (this.mode === 'world') this._call('events', list); }
  lang(code) { this.code = code; if (this.mode === 'world') this._call('lang', code); else if (this.mode) this._drawFallback(); }
  say(person, opts = {}) { if (this.mode === 'world') this._call('say', person, opts); }
  pick(x, y) { return this.mode === 'world' && this.live ? this.live.pick(x, y) : null; }
  seek(tm) { this.time = Math.max(0, Math.min(this.dur || 0, tm)); if (this.mode === 'world') this._call('seek', this.time); this._rpDraw?.(); }
  play() { this.playing = true; if (this.mode === 'world') this._call('play'); this._rpDraw?.(); }
  pause() { this.playing = false; if (this.mode === 'world') this._call('pause'); this._rpDraw?.(); }
  setRate(r) { this.rate = r; if (this.mode === 'world') this._call('setRate', r); this._rpDraw?.(); }

  // ---------- Welt (iframe) ----------
  _mountWorld(url) {
    url.searchParams.set('live', '1'); if (this.code) url.searchParams.set('lang', this.code);
    const f = this.iframe = h('iframe', { src: url.href, title: t('ui.scene.world'), allow: 'fullscreen; autoplay' });
    this.el.append(f);
    const t0 = performance.now();
    this._poll = setInterval(() => {
      let live = null; try { live = f.contentWindow?.whatif?.live || null; } catch { live = null; }
      if (live) { clearInterval(this._poll); this._poll = 0; this._ready(live); }
      else if (performance.now() - t0 > 90000) { clearInterval(this._poll); console.warn('[stage] whatif.live kam nicht – Ersatzansicht'); this.unmountWorldToFallback(); }
    }, 120);
  }
  unmountWorldToFallback() { this.el.innerHTML = ''; this.iframe = null; this.live = null; this.mode = 'fallback'; this._drawFallback(); }
  _ready(live) {
    this.live = live;
    this.dur = +live.dur || 0;
    live.on?.('click', e => {
      if (!e || !e.id) return;
      this._emitFind({ obj: e.id, clues: this._cluesForObj(e.id), point: e.point });
    });
    if (this.code) live.lang?.(this.code);
    live.events?.(this._eventList());
    live.view?.(this.view);
    const q = this._q; this._q = [];
    for (const [m, a] of q) this._call(m, ...a);
  }
  _call(m, ...a) {
    if (!this.live) { if (this.mode === 'world') this._q.push([m, a]); return undefined; }
    try { return typeof this.live[m] === 'function' ? this.live[m](...a) : undefined; } catch (e) { console.warn('[stage] live.' + m, e); }
  }
  _cluesForObj(obj) { return (this.c.clues || []).filter(x => (x.obj === obj || x.opens === obj) && sceneFind(x.find)); }   // a container (bin lid, pocket) finds what is in it

  // ---------- Ersatzansicht ----------
  _objects(placeId) {
    const p = placeOf(this.c, placeId), views = viewsOf(p).map(v => v.id);
    const list = (this.cluesAt(this.c, placeId) || []).filter(x => x && x.obj && sceneFind(x.find));
    const full = list.map(x => ({ ...clueOf(this.c, x.id), ...x }));
    // Standpunkt je Objekt: aus den Daten (view), sonst reihum verteilt
    const objs = new Map(); let i = 0;
    for (const x of full) {
      if (!objs.has(x.obj)) objs.set(x.obj, { obj: x.obj, clues: [], view: x.view || views[i++ % Math.max(1, views.length)] });
      objs.get(x.obj).clues.push(x);
    }
    // Extras ohne Spur (Thermoskanne, Auslöser von Laborsätzen): auch anklickbar
    const trig = new Set([...(this.c.extras?.lab || []).map(l => l.on), this.c.extras?.thermos?.obj].filter(Boolean));
    for (const o of this.c.objects || []) {
      if (o.place !== placeId || objs.has(o.id) || !(o.role === 'extra' || trig.has(o.id))) continue;
      objs.set(o.id, { obj: o.id, clues: [], extra: true, view: o.view || views[i++ % Math.max(1, views.length)] });
    }
    return [...objs.values()];
  }
  markTouched(obj) { this.touched.add(obj); if (this.mode === 'fallback') this._drawFallback(); }
  _drawFallback() {
    const el = this.el; if (!el || !this.c) return;
    const c = this.c, s = this.s || {};
    let place = placeOfView(c, this.view) || (c.places || [])[0];
    if (!place) { el.innerHTML = ''; return; }
    const views = viewsOf(place);
    if (!views.some(v => v.id === this.view)) this.view = views[0]?.id;
    const objs = this._objects(place.id);
    const found = new Set(s.found || []);
    const known = new Set([...(s.found || []), ...(s.heard || []), ...(s.insights || []), ...(s.topics || []).map(String)]);
    const scrollTop = el.querySelector('.fb')?.scrollTop || 0;
    el.innerHTML = '';
    const wrap = h('div', { class: 'fb' });
    // Orte
    const walkable = (c.places || []).filter(p => viewsOf(p).length);
    if (walkable.length > 1) {
      const nav = h('div', { class: 'fb-nav', role: 'toolbar', 'aria-label': t('ui.scene.places') }, h('span', { class: 'lbl' }, t('ui.scene.places')));
      for (const p of walkable) {
        const vs = viewsOf(p), n = this._objects(p.id), open = n.reduce((a, o) => a + o.clues.filter(x => !found.has(x.id)).length, 0);
        nav.append(h('button', { class: 'chip', 'aria-pressed': String(p.id === place.id), dataset: { place: p.id },
          onclick: () => { const v = vs[0]?.id; if (v) this._userView(v); } }, tc(`place.${p.id}`), open ? null : h('span', { class: 'n', html: icon('check') })));
      }
      wrap.append(nav);
    }
    // Standpunkte
    const vnav = h('div', { class: 'fb-nav', role: 'toolbar', 'aria-label': t('ui.scene.views') }, h('span', { class: 'lbl' }, t('ui.scene.views')));
    views.forEach((v, i) => vnav.append(h('button', { class: 'chip', 'aria-pressed': String(v.id === this.view), dataset: { view: v.id }, title: '← →',
      onclick: () => this._userView(v.id) }, hasC(`view.${v.id}`) ? tc(`view.${v.id}`) : t('ui.scene.viewN', { n: i + 1 }))));
    wrap.append(vnav);
    // Raum
    const room = h('div', { class: 'fb-room' });
    room.innerHTML = sketch(this.view);
    room.append(h('div', { class: 'vname' }, tc(`place.${place.id}`) + ' · ' + (hasC(`view.${this.view}`) ? tc(`view.${this.view}`) : '')));
    const box = h('div', { class: 'fb-objs' });
    const here = objs.filter(o => o.view === this.view);
    let n = 0;
    for (const o of here) {
      n++;
      if (o.extra) {
        const done = this.touched.has(o.obj);
        box.append(h('button', { class: 'obj' + (done ? ' found' : ''), dataset: { obj: o.obj }, 'aria-label': t('ui.scene.objN', { n }),
          onclick: () => this._emitFind({ obj: o.obj, clues: [], point: null }) },
          done ? h('span', { class: 'tent' }, '★') : null, ico('eye'), h('span', {}, t('ui.scene.objN', { n })), h('small', {}, done ? t('ui.scene.again') : t('ui.scene.find.look'))));
        continue;
      }
      const all = o.clues, got = all.filter(x => found.has(x.id)), open = all.filter(x => !found.has(x.id));
      const lockedAll = open.length && open.every(x => (x.needs || []).some(nd => !known.has(nd) && !known.has(String(nd))));
      const isFound = !open.length;
      const main = isFound ? got[got.length - 1] : open[0];
      const kind = main.find;
      const label = hasC(`obj.${o.obj}`) ? tc(`obj.${o.obj}`) : isFound ? tc(`clue.${main.id}`, varsOf(main)) : t('ui.scene.objN', { n });
      const verb = isFound ? t('ui.scene.again') : lockedAll ? t('ui.scene.locked') : t(`ui.scene.find.${String(kind).replace(':', '_')}`);
      const num = isFound ? (s.found || []).indexOf(main.id) + 1 : 0;
      const b = h('button', { class: 'obj' + (isFound ? ' found' : '') + (lockedAll ? ' locked' : ''), dataset: { obj: o.obj }, 'aria-label': label + ' – ' + verb,
        onclick: () => {
          if (isFound) return this._lupe(o.obj);
          this._emitFind({ obj: o.obj, clues: open, point: null });
        } },
        isFound ? h('span', { class: 'tent' }, String(num)) : null,
        ico(lockedAll ? 'lock' : findIcon(kind)), h('span', {}, label), h('small', {}, verb));
      box.append(b);
    }
    if (!here.length) box.append(h('p', { class: 'fb-hint', style: { color: 'rgba(240,235,220,.6)' } }, t('ui.scene.nothing')));
    room.append(box);
    wrap.append(room, h('p', { class: 'fb-hint' }, t('ui.scene.fallback')));
    el.append(wrap);
    wrap.scrollTop = scrollTop;
  }
  _userView(v) { this.view = v; this._drawFallback(); for (const f of this._view) f(v); }
  // Standpunkt vor/zurück (Tasten ←/→)
  step(dir) {
    const all = (this.c.places || []).flatMap(p => viewsOf(p).map(v => v.id));
    const i = all.indexOf(this.view); if (i < 0 || !all.length) return;
    const v = all[(i + dir + all.length) % all.length];
    if (this.mode === 'world') { this.goto(v); for (const f of this._view) f(v); } else this._userView(v);
  }
  // Lupen-Modus der Ersatzansicht: Blatt mit den Spuren des Objekts
  _lupe(obj) {
    const s = this.s || {}, found = new Set(s.found || []);
    const list = this._cluesForObj(obj).filter(x => found.has(x.id));
    if (!list.length) return;
    modal({ title: t('ui.scene.lupe'), body: sh => {
      for (const cl of list) {
        sh.append(h('div', { class: 'cdetail' },
          h('div', { class: 'big' }, h('div', { class: 'photo', html: icon(findIcon(cl.find)) })),
          h('div', {}, h('p', { class: 'txtbig' }, tc(`clue.${cl.id}`, varsOf(cl))),
            hasC(`clue.${cl.id}.detail`) ? h('p', { class: 'det' }, tc(`clue.${cl.id}.detail`, varsOf(cl))) : null,
            hasC(`scene.${obj}`) ? h('div', { class: 'scenenote', 'aria-label': t('ui.scene.note') }, tc(`scene.${obj}`)) : null)));
      }
    } });
  }

  // ---------- Nachstellung ----------
  // Welt: Steuerleiste über dem Bild (live.seek/play/pause/setRate). Ersatz: Zeitleiste der Spuren nach `born`.
  replay() {
    if (this.replaying) return this._rpPromise;
    const c = this.c, clues = (c.clues || []).filter(x => typeof x.born === 'number').sort((a, b) => a.born - b.born);
    const want = +c.meta?.replay || Math.max(5, ...clues.map(x => x.born + 3));
    this.dur = this.mode === 'world' ? (+this.live?.dur || want) : want;
    const ck = Array.isArray(c.meta?.clock) && c.meta.clock.length === 2 ? c.meta.clock : null;
    const dayTime = tm => (ck ? fmtTime(ck[0] + (ck[1] - ck[0]) * Math.max(0, Math.min(1, tm / this.dur))) : '');
    this.time = 0; this.rate = 1; this.replaying = true;
    const world = this.mode === 'world';
    const root = h('div', { class: 'replay' + (world ? ' over' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': t('ui.replay.title') });
    document.getElementById('lab')?.replaceChildren();
    const clock = h('div', { class: 'clock', 'aria-live': 'off', title: t('ui.replay.clock') }, '0:00');
    const sub = h('small', { class: 'rp-t' }, '0:00');
    const playB = h('button', { class: 'btn', 'aria-label': t('ui.replay.play'), dataset: { act: 'rp-play' }, onclick: () => (this.playing ? this.pause() : this.play()) });
    const range = h('input', { type: 'range', min: 0, max: String(this.dur), step: '0.1', value: '0', 'aria-label': t('ui.replay.seek'),
      oninput: e => { this.seek(+e.target.value); } });
    const rateB = h('button', { class: 'btn small', dataset: { act: 'rp-rate' }, 'aria-label': t('ui.replay.rate'),
      onclick: () => this.setRate(this.rate === 1 ? .5 : this.rate === .5 ? 2 : 1) });
    const close = h('button', { class: 'btn ghost', dataset: { act: 'rp-close' }, onclick: () => done() }, ico('close'), t('ui.close'));
    const top = h('div', { class: 'rp-top', style: world ? { pointerEvents: 'auto', background: 'rgba(8,6,4,.6)' } : null }, h('h2', {}, t('ui.replay.title')), h('div', { class: 'rp-c' }, clock, sub));
    const body = h('div', { class: 'rp-body' });
    const rows = clues.map(cl => {
      const r = h('button', { class: 'rp-ev', dataset: { clue: cl.id }, onclick: () => this.seek(cl.born) },
        h('span', { class: 't' }, fmtClock(cl.born)), ico(findIcon(cl.find)), h('span', {}, tc(`clue.${cl.id}`, varsOf(cl))));
      body.append(r); return r;
    });
    const bar = h('div', { class: 'rp-bar', style: world ? { pointerEvents: 'auto', background: 'rgba(8,6,4,.6)' } : null },
      h('button', { class: 'btn', 'aria-label': t('ui.replay.back'), onclick: () => this.seek(this.time - 2), html: icon('rew') }), playB,
      h('button', { class: 'btn', 'aria-label': t('ui.replay.fwd'), onclick: () => this.seek(this.time + 2), html: icon('fwd') }),
      h('div', { class: 'rp-track' }, range, h('div', { class: 'rp-marks', 'aria-hidden': 'true' }, clues.map(cl => h('i', { style: { left: (100 * cl.born / this.dur) + '%' }, title: fmtClock(cl.born) })))), rateB, close);
    root.append(top); if (!world) root.append(body); root.append(bar);
    document.body.append(root);
    this._rpDraw = () => {
      clock.textContent = dayTime(this.time) || fmtClock(this.time);
      sub.textContent = fmtClock(this.time) + ' / ' + fmtClock(this.dur);
      range.value = String(this.time);
      playB.innerHTML = icon(this.playing ? 'pause' : 'play');
      playB.setAttribute('aria-label', t(this.playing ? 'ui.replay.pause' : 'ui.replay.play'));
      rateB.textContent = (this.rate === 1 ? '1' : this.rate === .5 ? '½' : '2') + '×';
      let last = null;
      rows.forEach((r, i) => { const on = clues[i].born <= this.time; r.classList.toggle('on', on); r.classList.remove('now'); if (on) last = r; });
      if (last) { last.classList.add('now'); if (this.playing) last.scrollIntoView?.({ block: 'nearest' }); }
    };
    let raf = 0, prev = performance.now();
    const loop = now => {
      const dt = Math.min(.1, (now - prev) / 1000); prev = now;
      if (this.playing) {
        if (world && typeof this.live?.time === 'number') this.time = this.live.time;
        else this.time = Math.min(this.dur, this.time + dt * this.rate);
        if (this.time >= this.dur) this.playing = false;
        this._rpDraw();
      }
      raf = requestAnimationFrame(loop);
    };
    const key = e => {
      if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); e.stopPropagation(); this.playing ? this.pause() : this.play(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); this.seek(this.time - 2); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); this.seek(this.time + 2); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(); }
    };
    window.addEventListener('keydown', key, true);
    let resolve; this._rpPromise = new Promise(r => (resolve = r));
    const done = () => {
      cancelAnimationFrame(raf); window.removeEventListener('keydown', key, true);
      root.remove(); this.replaying = false; this._rpDraw = null; this.pause();
      if (world) this._call('seek', this.live?.dur ?? this.dur);
      resolve();
    };
    this._rpClose = done;
    if (world) this._call('seek', 0);
    this.play(); raf = requestAnimationFrame(loop); this._rpDraw();
    setTimeout(() => playB.focus({ preventScroll: true }), 30);
    return this._rpPromise;
  }
  closeReplay() { this._rpClose?.(); }
}

function firstView(c) { const p = (c.places || [])[0]; return viewsOf(p)[0]?.id || null; }
async function exists(url) {
  try { const r = await fetch(url, { method: 'HEAD', cache: 'no-store' }); return r.ok; } catch { return false; }
}

// Schlichte Kreidezeichnung eines Raums je Standpunkt (aus der Id abgeleitet, immer gleich)
function sketch(id) {
  const x = hash(id || 'v'), L = 'rgba(232,228,214,.32)', L2 = 'rgba(232,228,214,.18)';
  const parts = [];
  parts.push(`<path d="M160 70 H840 V420 H160 Z" stroke="${L}" />`);
  parts.push(`<path d="M0 0 L160 70 M1000 0 L840 70 M0 600 L160 420 M1000 600 L840 420" stroke="${L2}" />`);
  for (let i = 1; i < 6; i++) parts.push(`<path d="M${160 + i * 113} 420 L${-200 + i * 233} 600" stroke="${L2}" />`);
  const pick = (k, n) => ((x >> k) & 0xff) % n;
  const items = [
    () => `<rect x="${200 + pick(2, 120)}" y="110" width="150" height="110" stroke="${L}" /><path d="M${275 + pick(2, 120)} 110 v110 M${200 + pick(2, 120)} 165 h150" stroke="${L2}" />`,
    () => `<rect x="${600 + pick(4, 120)}" y="170" width="110" height="250" stroke="${L}" /><circle cx="${690 + pick(4, 120)}" cy="300" r="5" stroke="${L}" />`,
    () => `<path d="M180 330 H${560 + pick(6, 160)} V420 M180 330 V420 M180 352 H${560 + pick(6, 160)}" stroke="${L}" />`,
    () => `<rect x="${420 + pick(8, 120)}" y="120" width="90" height="300" rx="6" stroke="${L}" /><path d="M${420 + pick(8, 120)} 220 h90" stroke="${L2}" />`,
    () => `<path d="M${330 + pick(10, 200)} 470 h200 M${350 + pick(10, 200)} 470 v80 M${510 + pick(10, 200)} 470 v80" stroke="${L}" />`,
    () => `<path d="M${700 - pick(12, 300)} 100 h160 M${700 - pick(12, 300)} 160 h160 M${700 - pick(12, 300)} 100 v60 M${860 - pick(12, 300)} 100 v60" stroke="${L2}" />`,
  ];
  const a = pick(1, items.length), b = (a + 1 + pick(3, items.length - 1)) % items.length, c2 = (b + 2) % items.length;
  parts.push(items[a](), items[b](), items[c2]());
  return `<svg class="sketch" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" fill="none" stroke-width="2" stroke-linecap="round" aria-hidden="true">${parts.join('')}</svg>`;
}
