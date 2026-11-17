// Gemeinsame Bausteine der Oberfläche: DOM-Helfer, Symbole, Porträt-Ersatz, Fenster, Meldungen, Laborbus-Blasen,
// Kartentexte und Kartenwahl. Kein Satz im Code: alle Texte über t()/tc().
import { t, tc, hasC, tcAny, fmtTime } from './i18n.js';

// ---------- DOM ----------
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(9)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function hash(s) { let x = 2166136261; for (const ch of String(s)) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; }

// ---------- Symbole (eigene SVGs, Linienstil) ----------
const P = {
  file: '<path d="M3 6.5V19a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8.5a1 1 0 0 0-1-1h-8.6L9.6 5.3a1 1 0 0 0-.8-.3H4a1 1 0 0 0-1 1z"/><path d="M7 12h10M7 15.5h6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/>',
  chat: '<path d="M4 5h16v10H9l-4.5 4V15H4z"/><path d="M8 9h8M8 12h5"/>',
  pin: '<circle cx="12" cy="8" r="4"/><path d="M12 12v9M8.5 4.5l7 7"/>',
  gavel: '<path d="M13.5 4.5l6 6M11 7l6 6M12.2 5.8l-4.4 4.4 6 6 4.4-4.4"/><path d="M10 12l-6.5 6.5 2 2L12 14M14 20.5h7"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.6 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.6-3.5-8.5s1-5.9 3.5-8.5z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  play: '<path d="M8 5.5v13l10-6.5z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  rew: '<path d="M11 6l-6 6 6 6M19 6l-6 6 6 6"/>',
  fwd: '<path d="M13 6l6 6-6 6M5 6l6 6-6 6"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="1.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  zoom: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5M10.5 8v5M8 10.5h5"/>',
  open: '<rect x="3.5" y="5" width="17" height="14" rx="1"/><path d="M3.5 11h17M10 8h4M10 14.5h4"/>',
  uv: '<path d="M7 3h6l-1 6H8z"/><path d="M10 9v3M4 21l6-9 6 9"/><path d="M17 5l3-1M17 8h3.5"/>',
  powder: '<path d="M14 3l7 7-4 1-4-4z"/><path d="M13 7L5 15a2.8 2.8 0 1 0 4 4l8-8"/>',
  hand: '<path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4a1.5 1.5 0 0 1 3 0v7M14 10.5V5.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5A6.5 6.5 0 0 1 4 15.8L3 13a1.5 1.5 0 0 1 2.6-1.4L8 14"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  camera: '<path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  note: '<path d="M5 4h14v11l-5 5H5z"/><path d="M14 20v-5h5M8 9h8M8 12.5h5"/>',
  idea: '<path d="M12 3l2.4 5 5.6.8-4 3.9.9 5.5L12 15.6 7.1 18.2l.9-5.5-4-3.9 5.6-.8z"/>',
  place: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  replay: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/><path d="M10.5 9v6l4.5-3z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  door: '<path d="M6 21V4h12v17M4 21h16"/><circle cx="15" cy="12.5" r="1"/>',
};
export function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.search}</svg>`; }
export const ico = name => h('span', { class: 'ico', html: icon(name) });
export function fillIcons(root = document) { for (const e of root.querySelectorAll('[data-ico]')) if (!e.firstChild) e.innerHTML = icon(e.dataset.ico); }
// Fundart → Symbol
export const findIcon = f => ({ look: 'eye', zoom: 'zoom', open: 'open', person: 'hand', combine: 'link', 'tool:uv': 'uv', 'tool:powder': 'powder', 'tool:tape': 'zoom' }[f] || (String(f).startsWith('tool:') ? 'uv' : 'search'));

// ---------- Porträt-Ersatz (bis die Engine Porträts rendert) ----------
const SKIN = ['#e8c4a0', '#d9a77e', '#b97c55', '#8a5a3c', '#f0d2b4'];
const HAIR = ['#2b1d14', '#5a3a22', '#8a6a3e', '#c9a35e', '#9a9a9a', '#6b2b1a'];
const BG = ['#3b4a55', '#4b3d33', '#3c4a3c', '#4a3a4a', '#2f3b4a', '#4d4433'];
export function portrait(id, { expr = 'calm', species } = {}) {
  const x = hash(id), bg = BG[x % BG.length]; expr = exprOf(expr);
  if (species === 'dog') {
    return `<svg viewBox="0 0 100 110" aria-hidden="true"><rect width="100" height="110" fill="${bg}"/>
      <ellipse cx="52" cy="98" rx="38" ry="20" fill="#7a4a24"/>
      <path d="M30 70 Q28 40 50 36 Q74 36 74 62 Q86 66 88 76 Q86 86 72 84 Q60 92 44 88 Q30 84 30 70z" fill="#8b5a2b"/>
      <path d="M34 44 Q20 52 24 78 Q34 74 38 58z" fill="#5c3a1a"/><path d="M68 42 Q82 50 78 74 Q70 70 66 56z" fill="#5c3a1a"/>
      <circle cx="46" cy="58" r="3.6" fill="#1a120c"/><circle cx="62" cy="58" r="3.6" fill="#1a120c"/><circle cx="47" cy="57" r="1.1" fill="#fff"/><circle cx="63" cy="57" r="1.1" fill="#fff"/>
      <ellipse cx="80" cy="74" rx="6" ry="4.5" fill="#1a120c"/>
      <path d="M70 84 q6 4 12 -2" stroke="#1a120c" stroke-width="2" fill="none"/>
      <path d="M78 80 q4 1 7 -1" stroke="#fff" stroke-width="3" fill="none" opacity=".85"/></svg>`;
  }
  const skin = SKIN[(x >>> 3) % SKIN.length], hair = HAIR[(x >>> 6) % HAIR.length], style = (x >>> 9) % 3, coat = BG[(x >>> 12) % BG.length];
  const hairP = ['M30 46 Q30 18 50 18 Q72 18 70 46 Q66 30 50 30 Q36 30 30 46z',
    'M28 52 Q24 16 50 16 Q78 16 72 54 Q70 34 50 28 Q34 34 28 52z',
    'M30 40 Q34 20 52 20 Q70 22 70 40 Q60 30 46 32 Q36 34 30 40z'][style];
  const brow = { angry: 'M38 46 l9 3 M62 46 l-9 3', nervous: 'M38 45 l9 -2 M62 45 l-9 -2', sad: 'M38 46 l9 -2 M62 46 l-9 -2', gasp: 'M38 42 l9 -1 M62 42 l-9 -1' }[expr] || 'M38 45 h9 M53 45 h9';
  const mouth = { happy: 'M42 68 Q50 75 58 68', sad: 'M43 71 Q50 65 57 71', angry: 'M43 70 h14', nervous: 'M43 70 q3.5 -3 7 0 q3.5 3 7 0', gasp: '' }[expr] ?? 'M44 69 Q50 71 56 69';
  const eyeX = expr === 'nervous' ? 2 : 0;
  return `<svg viewBox="0 0 100 110" aria-hidden="true"><rect width="100" height="110" fill="${bg}"/>
    <path d="M14 110 Q16 84 50 82 Q84 84 86 110z" fill="${coat}" stroke="rgba(0,0,0,.25)"/>
    <path d="M42 76 h16 v10 q-8 5 -16 0z" fill="${skin}" opacity=".9"/>
    <ellipse cx="50" cy="52" rx="20" ry="24" fill="${skin}"/>
    <path d="${hairP}" fill="${hair}"/>
    <path d="${brow}" stroke="#2a1d14" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    <circle cx="${43 + eyeX}" cy="53" r="2.4" fill="#1a120c"/><circle cx="${57 + eyeX}" cy="53" r="2.4" fill="#1a120c"/>
    ${mouth ? `<path d="${mouth}" stroke="#5a2a1e" stroke-width="2.4" stroke-linecap="round" fill="none"/>` : '<ellipse cx="50" cy="69" rx="4" ry="5" fill="#5a2a1e"/>'}
    ${expr === 'nervous' ? '<path d="M70 40 q3 6 0 8 q-3 -2 0 -8z" fill="#bfe3ff" stroke="#7fb5e0"/>' : ''}</svg>`;
}
export const pic = (id, o) => h('div', { class: 'pic', html: portrait(id, o) });

// ---------- Fall-Helfer ----------
export const person = (c, id) => (c.people || []).find(p => p.id === id) || { id };
export const speciesOf = p => p?.species || (p?.type && p.type !== 'human' ? p.type : null) || p?.look?.species || null;
// Ausdruck der Engine (EXPRS, auch „nervous+sweat“) → Porträt-Ersatz
const EXPR = { nervous: 'nervous', sweat: 'nervous', panic: 'nervous', scared: 'nervous', guilty: 'nervous', blush: 'nervous',
  angry: 'angry', shout: 'angry', annoyed: 'angry', disgust: 'angry', determined: 'angry',
  sad: 'sad', cry: 'sad', tears: 'sad', happy: 'happy', relieved: 'happy', smug: 'happy', surprised: 'gasp', gasp: 'gasp', confused: 'gasp' };
export const exprOf = e => EXPR[String(e || '').split('+')[0]] || (String(e || '').includes('sweat') ? 'nervous' : 'calm');
export const pname = id => tc(`person.${id}.name`);
export const prole = id => (hasC(`person.${id}.role`) ? tc(`person.${id}.role`) : '');
// Platzhalter eines Datensatzes: { …vars, time (Minuten), name }
export function varsOf(o) {
  if (!o) return undefined;
  const v = { ...(o.vars || {}) };
  for (const k of ['time', 'at', 'when']) if (typeof o[k] === 'number' && v.time == null) v.time = o[k];
  if (typeof o.timeEnd === 'number' && v.timeEnd == null) v.timeEnd = o.timeEnd;
  if (o.person && v.name == null && hasC(`person.${o.person}.name`)) v.name = tc(`person.${o.person}.name`);
  return v;
}
export const stmtOf = (c, id) => (c.statements || []).find(s => s.id === id);
export const clueOf = (c, id) => (c.clues || []).find(s => s.id === id);
export const viewsOf = p => (p?.views || []).map(v => (typeof v === 'string' ? { id: v } : v));
export const placeOf = (c, id) => (c.places || []).find(p => p.id === id);
export function placeOfView(c, view) { return (c.places || []).find(p => viewsOf(p).some(v => v.id === view)); }
export const timeStr = m => (typeof m === 'number' ? fmtTime(m) : (m ?? ''));

// Karte → { title, sub, detail, icon, label }. card.id ist die Id des Bausteins (card.ref = Textschlüssel-Anfang, z. B. „clue.<id>“)
export const factOf = (c, id) => (c.facts || []).find(f => f.id === id);
export function cardInfo(c, card) {
  const r = card.id;
  switch (card.kind) {
    case 'person': return { title: pname(r), sub: prole(r), icon: 'person', label: t('ui.card.person') };
    case 'clue': { const cl = clueOf(c, r); return { title: tc(`clue.${r}`, varsOf(cl)), detail: hasC(`clue.${r}.detail`) ? tc(`clue.${r}.detail`, varsOf(cl)) : '', icon: findIcon(cl?.find), label: t('ui.card.clue') }; }
    case 'statement': { const st = stmtOf(c, r); return { title: tc(`stmt.${r}`, varsOf(st)), sub: st?.person ? pname(st.person) : '', icon: 'note', label: t('ui.card.statement') }; }
    case 'insight': { const f = factOf(c, r) || card; return { title: tc(`fact.${r}`, varsOf(f)), icon: 'idea', label: t('ui.card.insight') }; }
    case 'place': return { title: tc(`place.${r}`), icon: 'place', label: t('ui.card.place') };
    default: return { title: tcAny([`fact.${r}`, `clue.${r}`]) ?? String(r), icon: 'note', label: '' };
  }
}

// ---------- Meldungen ----------
export function toast(text, kind = '', ms = 3200) {
  const box = document.getElementById('toasts'); if (!box) return;
  const el = h('div', { class: 'toast ' + kind, role: 'status' }, text);
  box.append(el); while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 350); }, ms);
}
// Laborbus: kleine Sprechblase (Pia/Otto), Humor, nie Beweis
let labTimer = 0;
export function labSay(who, text, ms = 6500) {
  const box = document.getElementById('lab'); if (!box || !text) return;
  box.innerHTML = '';
  const w = who === 'pia' ? 'pia' : 'otto';
  const el = h('div', { class: 'labmsg', role: 'status' },
    h('div', { class: 'av ' + w, 'aria-hidden': 'true' }, t(`ui.lab.${w}.init`)),
    h('div', { class: 'bub' }, h('b', {}, t(`ui.lab.${w}`)), text));
  box.append(el);
  clearTimeout(labTimer);
  labTimer = setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 450); }, ms);
}

// ---------- Fenster ----------
const stack = [];
export const modalOpen = () => stack.length > 0;
// modal({ cls, title, body: el|fn(el), onClose, wide }) → { el, sheet, close }
export function modal({ cls = '', title, body, onClose, wide = false, label } = {}) {
  const layer = document.getElementById('layer');
  const sheet = h('div', { class: 'sheet ' + cls + (wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': label || title || '' });
  const wrap = h('div', { class: 'modal' }, sheet);
  const x = h('button', { class: 'ib x', 'aria-label': t('ui.close'), title: t('ui.closeEsc'), html: icon('close') });
  let closed = false;
  const api = { el: wrap, sheet, close() { if (closed) return; closed = true; wrap.remove(); const i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1); onClose && onClose(); prevFocus?.focus?.(); } };
  const prevFocus = document.activeElement;
  x.onclick = () => api.close();
  wrap.addEventListener('pointerdown', e => { if (e.target === wrap) wrap._down = true; });
  wrap.addEventListener('click', e => { if (e.target === wrap && wrap._down) api.close(); wrap._down = false; });
  if (title) sheet.append(h('h2', {}, title));
  sheet.append(x);
  if (typeof body === 'function') body(sheet, api); else if (body) sheet.append(body);
  layer.append(wrap); stack.push(api);
  setTimeout(() => (sheet.querySelector('[autofocus]') || sheet.querySelector('button:not(.x), [tabindex]') || x).focus?.({ preventScroll: true }), 30);
  return api;
}
export function closeTop() { const m = stack[stack.length - 1]; if (m) { m.close(); return true; } return false; }
export function closeAll() { while (stack.length) stack[stack.length - 1].close(); }
export function ask(text, { yes = t('ui.yes'), no = t('ui.cancel'), danger = false } = {}) {
  return new Promise(res => {
    let v = false;
    const m = modal({ title: text, onClose: () => res(v), body: s => s.append(h('div', { class: 'row' },
      h('button', { class: 'btn ghost', onclick: () => m.close() }, no),
      h('button', { class: 'btn ' + (danger ? 'primary' : 'paper'), autofocus: true, onclick: () => { v = true; m.close(); } }, yes))) });
  });
}

// ---------- Langes Tippen ----------
// fn(e) nach ms ohne Bewegung; der folgende Klick wird geschluckt
export function longPress(el, fn, ms = 520) {
  let tm = 0, x0 = 0, y0 = 0, fired = false;
  el.addEventListener('pointerdown', e => { if (e.button > 0) return; fired = false; x0 = e.clientX; y0 = e.clientY; clearTimeout(tm); tm = setTimeout(() => { fired = true; fn(e); }, ms); });
  el.addEventListener('pointermove', e => { if (Math.hypot(e.clientX - x0, e.clientY - y0) > 8) clearTimeout(tm); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, () => clearTimeout(tm));
  el.addEventListener('click', e => { if (fired) { e.stopPropagation(); e.preventDefault(); fired = false; } }, true);
  el.addEventListener('contextmenu', e => { if (e.pointerType !== 'mouse') e.preventDefault(); });
}

// ---------- Kartenwahl (Vorhalten, Anklage) ----------
// pickCard(c, cards, { title, kinds }) → Promise<card|null>
const KINDS = ['insight', 'clue', 'statement', 'person', 'place'];
export function pickCard(c, cards, { title = t('ui.pick.title'), prefer } = {}) {
  return new Promise(res => {
    let chosen = null, filter = prefer && cards.some(k => k.kind === prefer) ? prefer : 'all';
    const m = modal({ title, wide: true, onClose: () => res(chosen), body: s => {
      const bar = h('div', { class: 'pickfilter', role: 'toolbar' });
      const grid = h('div', { class: 'picker' });
      const kinds = KINDS.filter(k => cards.some(x => x.kind === k));
      const draw = () => {
        bar.innerHTML = ''; grid.innerHTML = '';
        for (const k of ['all', ...kinds]) bar.append(h('button', { class: 'chip', 'aria-pressed': String(filter === k), dataset: { filter: k }, onclick: () => { filter = k; draw(); } }, t(k === 'all' ? 'ui.pick.all' : `ui.card.${k}s`)));
        const list = cards.filter(x => filter === 'all' || x.kind === filter).sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind));
        if (!list.length) grid.append(h('p', { class: 'nb-empty' }, t('ui.pick.none')));
        for (const k of list) {
          const i = cardInfo(c, k);
          grid.append(h('button', { class: 'pick k-' + k.kind, dataset: { card: k.id }, onclick: () => { chosen = k; m.close(); } },
            h('small', {}, i.label), h('span', {}, i.title), i.sub ? h('small', {}, i.sub) : null));
        }
      };
      draw(); s.append(bar, grid);
    } });
  });
}
