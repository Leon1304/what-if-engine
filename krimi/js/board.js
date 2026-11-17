// Pinnwand: Kork mit Karten (Fotos, Zettel, Karteikarten) und Fäden als SVG.
// Faden ziehen: an der Nadel einer Karte anfassen und auf eine andere Karte ziehen (oder Nadel antippen, dann Zielkarte antippen).
// Auf den Knoten eines Fadens gezogen wird daraus ein Faden zwischen drei Karten. Art vorher wählen: rot / grün / blau.
// Karte verschieben: Karte selbst ziehen (Position landet als Nutzerdaten im Spielstand). Antippen oder langes Tippen = Details.
// Eingerastete Fäden (Schluss gefunden) hängen straff, lockere mit Durchhang.
import { t } from './i18n.js';
import { h, icon, ico, pic, hash, cardInfo, person, speciesOf, longPress, modal, toast, pname } from './ui.js';

const ORDER = ['person', 'clue', 'statement', 'insight', 'place'];
const KINDS = ['red', 'green', 'blue'];
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };

export function createBoard(app, root) {
  let cork, scroller, svg, tmp = null, sel = null, drag = null;
  const shown = new Set();               // schon gezeigte Karten (neue bekommen die Einblend-Animation)
  let animThread = -1, animStart = 0, firstDraw = true;
  const U = () => (app.user.board ||= { pos: {}, kind: 'red', seen: 0 });

  // ---------- Fäden aus dem Spielstand ----------
  function threads() {
    const c = app.c, s = app.s;
    return (s.threads || []).map((th, i) => {
      let from, kind, gives = null;
      if (Array.isArray(th)) { kind = KINDS.includes(th[th.length - 1]) ? th[th.length - 1] : 'red'; from = th.filter(x => !KINDS.includes(x)); }
      else { from = th.from || th.cards || []; kind = th.kind || 'red'; gives = th.gives ?? th.insight ?? null; }
      const key = [...from].sort().join('|');
      if (gives == null && th.ok !== false) {
        const d = (c.deductions || []).find(d => [...d.from].sort().join('|') === key && (!d.kind || d.kind === kind));
        if (d && (s.insights || []).includes(d.gives ?? d.id)) gives = d.gives ?? d.id;
      }
      return { i, from, kind, locked: !!gives || th.ok === true || th.locked === true, gives };
    });
  }

  // ---------- Zeichnen ----------
  function render() {
    const c = app.c, s = app.s; if (!c || !s) return;
    const prevScroll = scroller?.scrollTop || 0;
    root.innerHTML = '';
    const kind = U().kind || 'red';
    const tools = h('div', { class: 'btools', role: 'toolbar', 'aria-label': t('ui.board.kind') },
      h('span', { class: 'lbl' }, t('ui.board.kind')),
      ...KINDS.map(k => h('button', { class: 'spool ' + k, 'aria-pressed': String(kind === k), dataset: { kind: k }, title: t(`ui.board.${k}T`),
        onclick: () => { U().kind = k; app.touch(); render(); } }, h('i'), h('span', {}, t(`ui.board.${k}`)))),
      h('span', { class: 'count' }, t('ui.board.count', { n: (s.threads || []).length, i: app.progress().insights[0], k: app.progress().insights[1] })),
      h('span', { class: 'help' }, sel ? t('ui.board.pickTarget') : t(matchMedia('(max-width: 899px)').matches ? 'ui.board.helpShort' : 'ui.board.help')));
    scroller = h('div', { class: 'cork-scroll' });
    cork = h('div', { class: 'cork' });
    svg = svgEl('svg', { class: 'strings', 'aria-hidden': 'true' });
    cork.append(svg); scroller.append(cork); root.append(h('div', { class: 'board' }, tools, scroller));

    const cards = app.cards().slice().sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
    if (!cards.length) cork.append(h('div', { class: 'empty' }, t('ui.board.empty')));
    const els = new Map();
    for (const k of cards) { const e = cardEl(k); els.set(k.id, e); cork.append(e); }
    layout(cards, els);
    for (const k of cards) {
      if (!firstDraw && !shown.has(k.id)) els.get(k.id).classList.add('born');
      shown.add(k.id);
    }
    firstDraw = false;
    U().seen = cards.length;
    scroller.scrollTop = prevScroll;
    drawStrings();
    if (animThread >= 0) requestAnimationFrame(tick);
  }

  function cardEl(k) {
    const c = app.c, i = cardInfo(c, k), rot = ((hash(k.id) % 7) - 3) * .8;
    const face = h('div', { class: 'face' });
    if (k.kind === 'person') {
      const p = person(c, k.id);
      face.append(h('div', { class: 'photo' }, pic(p.id, { species: speciesOf(p) })), h('b', {}, i.title), ...(i.sub ? [h('small', {}, i.sub)] : []));
    } else if (k.kind === 'clue') {
      const n = (app.s.found || []).indexOf(k.id) + 1;
      face.append(h('div', { class: 'photo' }, ico(i.icon), n ? h('span', { class: 'num' }, String(n)) : null), h('div', { class: 'txt' }, i.title));
    } else {
      face.append(h('div', { class: 'kind' }, i.label), h('div', { class: 'txt' }, i.title), ...(i.sub ? [h('div', { class: 'who' }, '— ' + i.sub)] : []));
    }
    const pin = h('span', { class: 'pin', role: 'button', tabindex: '0', 'aria-label': t('ui.board.pinA', { card: i.title }), title: t('ui.board.pinT') });
    const el = h('div', { class: `card k-${k.kind}`, dataset: { card: k.id }, style: { '--rot': rot + 'deg' }, tabindex: '0', role: 'button', 'aria-label': i.label + ': ' + i.title }, pin, face);
    pin.addEventListener('pointerdown', e => startThread(e, k, el));
    pin.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tapPin(k, el); } });
    el.addEventListener('pointerdown', e => { if (e.target.closest('.pin')) return; startMove(e, k, el); });
    el.addEventListener('keydown', e => { if (e.target !== el) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (sel && sel !== k.id) finishTap(k); else details(k); } });
    longPress(el, () => { drag = null; details(k); });
    return el;
  }

  // Positionen: gespeicherte (vom Spieler verschoben) bleiben, alle anderen fließen in Reihen je Kartenart.
  function layout(cards, els) {
    const W = Math.max(320, scroller.clientWidth || root.clientWidth || 800);
    const pos = U().pos || (U().pos = {});
    const cw = els.size ? els.values().next().value.offsetWidth : 158;
    const pad = W < 520 ? 14 : 24, gap = W < 520 ? 12 : 22, top = 34;
    const cols = Math.max(2, Math.floor((W - 2 * pad + gap) / (cw + gap)));
    const off = Math.max(0, (W - 2 * pad - (cols * cw + (cols - 1) * gap)) / 2);
    const rects = [];
    for (const k of cards) {
      const p = pos[k.id], e = els.get(k.id);
      if (p) {
        const x = Math.round(4 + Math.max(0, Math.min(1, +p[0] || 0)) * (W - cw - 8)), hh = e.offsetHeight;
        let y = Math.max(24, +p[1] || 24);
        // auf einem anderen Bildschirm können gespeicherte Karten übereinander liegen → nur in der Anzeige nach unten schieben
        const over = yy => rects.some(r => x < r[0] + r[2] - 8 && x + cw - 8 > r[0] && yy < r[1] + r[3] - 6 && yy + hh - 6 > r[1]);
        for (let g = 0; g < 80 && over(y); g++) y += 24;
        place(e, x, y); rects.push([x, y, cw, hh]);
      }
    }
    const hit = (x, y, w, hh) => rects.some(r => x < r[0] + r[2] + 6 && x + w + 6 > r[0] && y < r[1] + r[3] + 26 && y + hh + 26 > r[1]);
    let y = top, col = 0, rowH = 0, lastKind = null;
    for (const k of cards) {
      if (pos[k.id]) continue;
      const e = els.get(k.id), hh = e.offsetHeight;
      if (lastKind && lastKind !== k.kind && col > 0) { y += rowH + 30; col = 0; rowH = 0; }
      lastKind = k.kind;
      for (let guard = 0; guard < 400; guard++) {
        if (col >= cols) { y += rowH + 30; col = 0; rowH = 0; }
        const x = pad + off + col * (cw + gap);
        if (!hit(x, y, cw, hh)) { place(e, x, y); rects.push([x, y, cw, hh]); rowH = Math.max(rowH, hh); col++; break; }
        col++;
      }
    }
    const bottom = rects.reduce((m, r) => Math.max(m, r[1] + r[3]), 0);
    cork.style.height = Math.max(scroller.clientHeight, bottom + 60) + 'px';
    svg.setAttribute('width', W); svg.setAttribute('height', cork.offsetHeight);
  }
  const place = (e, x, y) => { e.style.left = x + 'px'; e.style.top = y + 'px'; };
  // gespeichert wird x als Anteil der freien Breite (passt auf jede Bildschirmbreite), y in Pixeln
  const toPos = (x, y) => { const W = cork.clientWidth, cw = cork.querySelector('.card')?.offsetWidth || 158; return [Math.round(Math.max(0, Math.min(1, (x - 4) / Math.max(1, W - cw - 8))) * 1000) / 1000, Math.round(y)]; };
  // Freier Platz für eine neue Karte möglichst nah an (cx, cy), ohne andere Karten zu verdecken
  function freeSpot(cx, cy) {
    const cr = cork.getBoundingClientRect(), W = cork.clientWidth;
    const any = cork.querySelector('.card'), w = any ? any.offsetWidth : 158, hh = 150;
    const rects = [...cork.querySelectorAll('.card')].map(e => { const r = e.getBoundingClientRect(); return [r.left - cr.left, r.top - cr.top, r.width, r.height]; });
    const free = (x, y) => x >= 4 && x + w <= W - 4 && y >= 24 && !rects.some(r => x < r[0] + r[2] + 10 && x + w + 10 > r[0] && y < r[1] + r[3] + 24 && y + hh + 24 > r[1]);
    for (let ring = 0; ring < 60; ring++) {
      const n = Math.max(1, ring * 8);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, x = Math.round(cx - w / 2 + Math.cos(a) * ring * 28), y = Math.round(cy - 20 + Math.sin(a) * ring * 22);
        if (free(x, y)) return [x, y];
      }
    }
    const bottom = rects.reduce((m, r) => Math.max(m, r[1] + r[3]), 0);
    return [Math.round(Math.max(4, Math.min(W - w - 4, cx - w / 2))), Math.round(bottom + 40)];
  }

  // Nadelpunkt einer Karte in Kork-Koordinaten
  function pinXY(id) {
    const e = cork?.querySelector(`.card[data-card="${CSS.escape(id)}"] .pin`); if (!e) return null;
    const r = e.getBoundingClientRect(), cr = cork.getBoundingClientRect();
    return [r.left + r.width / 2 - cr.left, r.top + r.height / 2 - cr.top];
  }
  const sagPath = (a, b, sag) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 + sag; return `M${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`; };
  const sagOf = (a, b, locked, k = 1) => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]); const loose = Math.min(140, 22 + d * .2); return locked ? loose + (3 - loose) * k : loose; };
  // Knoten: Mitte des Fadens (2 Karten) bzw. Schwerpunkt mit Durchhang (3 Karten)
  function knotOf(th) {
    const ps = th.from.map(pinXY).filter(Boolean); if (ps.length < 2) return null;
    if (ps.length === 2) { const [a, b] = ps, s = sagOf(a, b, th.locked); return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + s / 2]; }
    const cx = ps.reduce((m, p) => m + p[0], 0) / ps.length, cy = ps.reduce((m, p) => m + p[1], 0) / ps.length;
    return [cx, cy + (th.locked ? 4 : 30)];
  }
  function drawStrings(now = performance.now()) {
    if (!svg) return;
    svg.querySelectorAll('.th, .knot').forEach(e => e.remove());
    for (const th of threads()) {
      const ps = th.from.map(pinXY); if (ps.some(p => !p)) continue;
      let k = 1;
      if (th.i === animThread) { k = Math.min(1, (now - animStart) / 650); k = 1 - Math.pow(1 - k, 3); }
      const cls = `th ${th.kind} ${th.locked ? 'taut' : 'loose'}`;
      if (ps.length === 2) {
        const [a, b] = ps;
        svg.append(svgEl('path', { class: cls, d: sagPath(a, b, sagOf(a, b, th.locked, k)), 'data-thread': th.i }));
        const kn = knotOf(th); if (kn && !th.locked) svg.append(svgEl('circle', { class: 'knot ' + th.kind, cx: kn[0], cy: kn[1], r: 6, 'data-knot': th.i }));
      } else {
        const kn = knotOf(th);
        const knk = th.locked ? [kn[0], kn[1] - 26 * (1 - k)] : kn;
        for (const p of ps) svg.append(svgEl('path', { class: cls, d: sagPath(p, knk, sagOf(p, knk, th.locked, k) * .6), 'data-thread': th.i }));
        svg.append(svgEl('circle', { class: 'knot ' + th.kind, cx: knk[0], cy: knk[1], r: 7, 'data-knot': th.i }));
      }
    }
    if (tmp) svg.append(tmp);
  }
  function tick(now) { drawStrings(now); if (animThread >= 0 && now - animStart < 700) requestAnimationFrame(tick); else { animThread = -1; drawStrings(); } }

  // ---------- Faden ziehen ----------
  function startThread(e, k, el) {
    if (e.button > 0) return;
    e.preventDefault(); e.stopPropagation();
    const pin = e.currentTarget; pin.setPointerCapture?.(e.pointerId);
    const a = pinXY(k.id); if (!a) return;
    const x0 = e.clientX, y0 = e.clientY; let moved = false, target = null, knot = null;
    tmp = svgEl('path', { class: 'tmp th ' + (U().kind || 'red'), d: '' });
    const move = ev => {
      if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 6) moved = true;
      if (!moved) return;
      autoScroll(ev.clientY);
      const cr = cork.getBoundingClientRect(), p = [ev.clientX - cr.left, ev.clientY - cr.top];
      const a2 = pinXY(k.id) || a;
      tmp.setAttribute('d', sagPath(a2, p, Math.min(60, Math.hypot(p[0] - a2[0], p[1] - a2[1]) * .12)));
      if (!tmp.parentNode) svg.append(tmp);
      ({ target, knot } = dropAt(ev.clientX, ev.clientY, k.id));
      cork.querySelectorAll('.card.target').forEach(c => c.classList.remove('target'));
      svg.querySelectorAll('.knot.hot').forEach(c => c.classList.remove('hot'));
      if (target) cork.querySelector(`.card[data-card="${CSS.escape(target)}"]`)?.classList.add('target');
      if (knot != null) svg.querySelector(`.knot[data-knot="${knot}"]`)?.classList.add('hot');
    };
    const up = ev => {
      pin.removeEventListener('pointermove', move); pin.removeEventListener('pointerup', up); pin.removeEventListener('pointercancel', up);
      stopScroll(); tmp?.remove(); tmp = null;
      cork.querySelectorAll('.card.target').forEach(c => c.classList.remove('target'));
      if (!moved) { tapPin(k, el); return; }
      ({ target, knot } = dropAt(ev.clientX, ev.clientY, k.id));
      if (target) makeThread([k.id, target]);
      else if (knot != null) { const th = threads()[knot]; if (th && !th.from.includes(k.id) && th.from.length === 2) makeThread([...th.from, k.id]); else drawStrings(); }
      else drawStrings();
    };
    pin.addEventListener('pointermove', move); pin.addEventListener('pointerup', up); pin.addEventListener('pointercancel', up);
  }
  // Was liegt unter dem Zeiger? Karte (nicht die eigene) oder Knoten eines Fadens
  function dropAt(x, y, self) {
    const under = document.elementsFromPoint(x, y);
    const card = under.map(e => e.closest?.('.card')).find(c => c && c.dataset.card !== self);
    if (card) return { target: card.dataset.card, knot: null };
    const cr = cork.getBoundingClientRect(), p = [x - cr.left, y - cr.top];
    let best = null, bd = 30;
    for (const th of threads()) { if (th.from.length !== 2) continue; const kn = knotOf(th); if (!kn) continue; const d = Math.hypot(kn[0] - p[0], kn[1] - p[1]); if (d < bd) { bd = d; best = th.i; } }
    return { target: null, knot: best };
  }
  function tapPin(k, el) {
    if (sel === k.id) { sel = null; render(); return; }
    if (sel) { finishTap(k); return; }
    sel = k.id; render();
    cork.querySelector(`.card[data-card="${CSS.escape(k.id)}"]`)?.classList.add('sel');
  }
  function finishTap(k) { const a = sel; sel = null; if (a && a !== k.id) makeThread([a, k.id]); else render(); }

  function makeThread(from) {
    const kind = U().kind || 'red';
    const before = (app.s.threads || []).length;
    const res = app.act({ type: 'thread', from, kind });
    const key = [...from].sort().join('|') + '#' + kind;
    const kept = (app.s.threads || []).some(th => { const a = Array.isArray(th) ? th : [...(th.from || []), th.kind]; return [...a.slice(0, -1)].sort().join('|') + '#' + a[a.length - 1] === key; });
    if (!res || (!res.gives && !res.stored && !kept)) { toast(t('ui.board.bad'), 'err'); render(); return; }
    const gives = res.ok === false ? null : res.gives ?? null;
    animThread = (app.s.threads || []).length > before ? (app.s.threads.length - 1) : -1;
    animStart = performance.now();
    if (gives) {
      // neue Erkenntnis-Karte nahe der Fadenmitte ablegen
      const ps = from.map(pinXY).filter(Boolean);
      const card = app.cards().find(k => k.kind === 'insight' && (k.ref === gives || k.id === gives));
      if (card && ps.length && !U().pos[card.id]) {
        const cx = ps.reduce((m, p) => m + p[0], 0) / ps.length, cy = ps.reduce((m, p) => m + p[1], 0) / ps.length;
        const [fx, fy] = freeSpot(cx, cy + 60); U().pos[card.id] = toPos(fx, fy);
      }
      app.touch();
      render();
      app.onInsight?.(gives, card);
    } else {
      render();
      toast(t('ui.board.loose'), '');
    }
  }

  // ---------- Karte verschieben ----------
  function startMove(e, k, el) {
    if (e.button > 0) return;
    const x0 = e.clientX, y0 = e.clientY, l0 = el.offsetLeft, t0 = el.offsetTop; let moved = false;
    el.setPointerCapture?.(e.pointerId);
    drag = { k };
    const move = ev => {
      if (!drag) return;
      if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 7) return;
      if (!moved) { moved = true; el.classList.add('drag'); }
      autoScroll(ev.clientY);
      const W = cork.clientWidth;
      const x = Math.max(4, Math.min(W - el.offsetWidth - 4, l0 + ev.clientX - x0)), y = Math.max(24, t0 + ev.clientY - y0 + (scroller.scrollTop - st0));
      place(el, x, y);
      if (y + el.offsetHeight + 60 > cork.offsetHeight) { cork.style.height = (y + el.offsetHeight + 60) + 'px'; svg.setAttribute('height', cork.offsetHeight); }
      drawStrings();
    };
    const st0 = scroller.scrollTop;
    const up = () => {
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      stopScroll(); el.classList.remove('drag');
      const was = drag; drag = null;
      if (moved) { U().pos[k.id] = toPos(el.offsetLeft, el.offsetTop); app.touch(); drawStrings(); }
      else if (was) { if (sel && sel !== k.id) finishTap(k); else details(k); }
    };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  }
  // Rand-Scrollen beim Ziehen
  let scrollV = 0, scrollT = 0;
  function autoScroll(y) {
    const r = scroller.getBoundingClientRect(), edge = 46;
    scrollV = y < r.top + edge ? -12 : y > r.bottom - edge ? 12 : 0;
    if (scrollV && !scrollT) scrollT = setInterval(() => { scroller.scrollTop += scrollV; drawStrings(); }, 30);
    if (!scrollV) stopScroll();
  }
  function stopScroll() { clearInterval(scrollT); scrollT = 0; scrollV = 0; }

  // ---------- Details ----------
  function details(k) {
    const c = app.c, i = cardInfo(c, k);
    const linked = threads().filter(th => th.from.includes(k.id));
    modal({ title: i.label, body: s => {
      const big = h('div', { class: 'big' });
      if (k.kind === 'person') { const p = person(c, k.id); big.append(pic(p.id, { species: speciesOf(p) })); }
      else big.append(h('div', { class: 'photo', html: icon(i.icon) }));
      const txt = h('div', {}, h('p', { class: 'txtbig' }, i.title));
      if (i.sub) txt.append(h('p', { class: 'det' }, (k.kind === 'statement' ? '— ' : '') + i.sub));
      if (i.detail) txt.append(h('p', { class: 'det' }, i.detail));
      if (k.kind === 'person' && app.hasCase(`person.${k.id}.bio`)) txt.append(h('p', { class: 'det' }, app.tc(`person.${k.id}.bio`)));
      if (linked.length) {
        txt.append(h('h3', {}, t('ui.board.linked')));
        const ul = h('ul');
        for (const th of linked) ul.append(h('li', {}, t(`ui.board.${th.kind}`) + (th.locked ? ' ✓' : '') + ': ' + th.from.filter(x => x !== k.id).map(x => cardInfo(c, app.cards().find(q => q.id === x) || { id: x, kind: 'clue' }).title).join(' · ')));
        txt.append(ul);
      }
      s.append(h('div', { class: 'cdetail' }, big, txt));
      if (k.kind === 'person' && app.canTalk(k.id)) s.append(h('div', { class: 'row' }, h('button', { class: 'btn paper', onclick: () => { app.closeAll(); app.talkTo(k.id); } }, ico('chat'), t('ui.board.talk'))));
    } });
  }

  window.addEventListener('resize', () => { if (root.offsetParent) render(); });
  return {
    render,
    cancel() { if (sel) { sel = null; render(); return true; } return false; },
    newCount() { return Math.max(0, app.cards().length - (U().seen || 0)); },
    looseCount: () => threads().filter(th => !th.locked).length,
    pinXY,
  };
}
