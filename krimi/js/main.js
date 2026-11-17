// Red String – verdrahtet Sprachen, Startmenü, Akte, Tatort (stage.js), Gespräche, Pinnwand, Anklage, Notizbuch und Speichern.
// Die Spiellogik (logic.js, case.js) kennt keinen Text; alles Sichtbare kommt aus js/lang/ und cases/<ordner>/text/.
import * as L from './logic.js';
import * as CaseIO from './case.js';
import * as I from './i18n.js';
import * as Store from './storage.js';
import { t, tc, hasC } from './i18n.js';
import { h, $, $$, ico, fillIcons, pic, speciesOf, pname, prole, toast, labSay, modal, closeTop, closeAll, modalOpen, ask, cardInfo } from './ui.js';
import { Stage } from './stage.js';
import { createBoard } from './board.js';
import { createDialog } from './dialog.js';
import { createAccuse } from './accuse.js';
import { createNotebook } from './notebook.js';

const TABS = ['scene', 'talk', 'board', 'accuse'];
const menuEl = $('#menu'), gameEl = $('#game');
const settings = { ...Store.loadSettings() };
let index = [], entry = null, slot = 1, reopen = null;

// ---------- App-Zustand (für die Module) ----------
const app = {
  c: null, s: null, user: null, dir: null,
  stage: new Stage({ cluesAt: (c, p) => L.cluesAt(c, p) }),
  act, touch: () => auto.touch(), closeAll,
  cards: () => (app.c && app.s ? L.cards(app.c, app.s) : []),
  topicsFor: p => (app.c && app.s ? (L.topicsFor(app.c, app.s, p) || []).map(x => (typeof x === 'string' ? x : x.id)) : []),
  progress: () => { const p = (app.c && app.s && L.progress(app.c, app.s)) || {}; return { clues: p.clues || [0, 0], insights: p.insights || [0, 0] }; },
  rank: () => (app.c && app.s ? L.rank(app.c, app.s) : 'bronze'),
  has: I.has, hasCase: hasC, tc,
  canTalk: p => (app.c?.people || []).some(x => x.id === p && x.talk !== false),
  talkTo: p => { go('talk'); dialog.open(p); },
  flash: (msg, kind) => toast(msg, kind),
  lab, hint, showSolved,
  onInsight(id, card) { toast(t('ui.toast.insight', { text: cardInfo(app.c, card || { id, kind: 'insight' }).title }), 'good'); lab('insight', id); },
};
const board = createBoard(app, $('#v-board'));
const dialog = createDialog(app, $('#v-talk'));
const accuse = createAccuse(app, $('#v-accuse'));
const notebook = createNotebook(app);

// ---------- Speichern ----------
const snapshot = () => app.c && app.s ? {
  v: L.SAVE_VERSION,
  meta: { case: app.c.id, caseV: app.s.caseV ?? app.c.meta?.version ?? null, clues: app.progress().clues, insights: app.progress().insights, rank: app.rank(), solved: !!app.s.solved },
  state: app.s, user: app.user,
} : null;
const auto = Store.createAutosave({ slot: () => (app.c ? slot : 0), snapshot });
Store.onError(k => toast(t(k), 'err', 5000));
const saveSettings = () => Store.saveSettings(settings);

// ---------- Aktionen ----------
function topicSet() { const out = new Set(); for (const p of app.c.people || []) for (const tp of app.topicsFor(p.id)) out.add(p.id + '\u0000' + tp); return out; }
function act(a) {
  const c = app.c; if (!c || !app.s) return null;
  const t0 = topicSet(), f0 = new Set(app.s.found || []);
  let out;
  try { out = L.apply(c, app.s, a); } catch (e) { console.error('[logic]', a, e); toast(t('ui.err.action'), 'err'); return null; }
  if (!out || !out.state) return out?.result ?? null;
  app.s = out.state;
  auto.touch();
  // Neues, das nicht direkt angeklickt wurde: Themen und Spuren (z. B. aus Aussagen)
  for (const k of topicSet()) if (!t0.has(k)) { const [p, tp] = k.split('\u0000'); toast(t('ui.toast.topic', { name: pname(p), topic: tc(`topic.${tp}`) }), 'new', 4200); }
  if (a.type !== 'find') for (const id of app.s.found || []) if (!f0.has(id)) { toast(t('ui.toast.found', { clue: tc(`clue.${id}`) }), 'new', 4200); lab('find', id); }
  app.stage.setState(app.s);
  header();
  return out.result ?? {};
}
const clock = () => Math.round((Date.now() - (app.user.started || Date.now())) / 100) / 10;

function onFind({ obj, clues }) {
  if (!clues.length) {                                   // Objekt ohne Spur: Thermoskanne, Laborsatz, sonst nur ansehen
    const u = app.user; (u.touched ||= []).includes(obj) || u.touched.push(obj);
    if (app.c.extras?.thermos?.obj === obj && !(u.badges ||= []).includes(app.c.extras.thermos.badge || obj)) { u.badges.push(app.c.extras.thermos.badge || obj); toast(t('ui.badge.thermos'), 'good', 4500); }
    auto.touch(); app.stage.markTouched(obj); app.stage.inspect(obj); lab('obj', obj);
    return;
  }
  const fresh = []; let ok = false;
  for (const cl of clues) {
    // Behälter (opens) zuerst als Ereignis öffnen – nur wenn die Spur jetzt auch gefunden werden kann
    const probe = L.apply(app.c, app.s, { type: 'find', clue: cl.id }).result;
    if (cl.find === 'open' && cl.opens && probe?.ok && probe.new !== false && !(app.s.events || []).some(e => e.id === cl.opens)) act({ type: 'event', id: cl.opens, at: clock() });
    const r = act({ type: 'find', clue: cl.id });
    if (r && r.ok !== false) { ok = true; if (r.new !== false) fresh.push(cl.id); }
  }
  if (!ok) { toast(t('ui.scene.needsT'), 'err'); lab('locked', obj); return; }
  app.stage.highlight(obj, true);
  for (const id of fresh) { toast(t('ui.toast.found', { clue: tc(`clue.${id}`) }), 'new'); lab('find', id); }
  lab('obj', obj);
  app.stage.inspect(obj);
}
function hint() {
  const r = act({ type: 'hint' });
  if (!r || r.ok === false) { toast(t('ui.nb.noHint'), ''); return; }
  (app.user.hints ||= []).push({ level: r.level || 1, text: r.text, args: r.args || {} });
  auto.touch();
  labSay('otto', notebook.hintText(r), 9000);
}

// Laborbus: Pia/Otto-Sätze (lab.*) aus case.extras.lab ({ id, who, on }) oder über Schlüssel lab.<art>.<id> / lab.<id> / lab.<art>
function lab(kind, id = '') {
  const c = app.c; if (!c || !app.user) return;
  const seen = app.user.lab ||= [];
  const match = on => { if (!on) return false; if (Array.isArray(on)) return on.some(match); if (typeof on === 'object') return (on.type || on.kind) === kind && (on.id == null || on.id === id);
    return on === kind || on === `${kind}:${id}` || (id !== '' && on === id); };
  let hit = null;
  const list = Array.isArray(c.extras?.lab) ? c.extras.lab : [];
  hit = list.find(e => e && e.id && !seen.includes(e.id) && match(e.on ?? e.when ?? e.trigger) && hasC(`lab.${e.id}`));
  if (!hit && !list.length) {
    const keys = [id && `${kind}.${id}`, kind === 'find' && id, kind].filter(Boolean);
    const k = keys.find(k => hasC(`lab.${k}`) && !seen.includes(k)); if (k) hit = { id: k };
  }
  if (!hit) return;
  if (!hit.repeat) seen.push(hit.id);
  const who = hit.who || (/^pia/i.test(hit.id) ? 'pia' : /^otto/i.test(hit.id) ? 'otto' : kind === 'find' ? 'pia' : 'otto');
  setTimeout(() => labSay(who, tc(`lab.${hit.id}`)), kind === 'start' ? 900 : 350);
}

// ---------- Ansichten ----------
function go(tab, { save = true } = {}) {
  if (!TABS.includes(tab)) tab = 'scene';
  app.user.ui.tab = tab;
  for (const v of $$('.view')) v.classList.toggle('on', v.dataset.view === tab);
  for (const b of $$('.tab')) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
  renderTab(tab);
  if (tab === 'board') lab('board');
  if (tab === 'accuse') lab('accuse');
  header();
  if (save) auto.touch();
}
function renderTab(tab = app.user?.ui?.tab) {
  if (tab === 'talk') dialog.render(); else if (tab === 'board') board.render(); else if (tab === 'accuse') accuse.render();
}
function header() {
  if (!app.c) return;
  $('#caseTitle').textContent = tc('meta.title');
  const p = app.progress();
  $('#progress').textContent = t('ui.progress', { n: p.clues[0], m: p.clues[1], i: p.insights[0], k: p.insights[1] });
  const badge = (tab, n) => { const b = $(`.tab[data-tab=${tab}]`); b.querySelector('.badge')?.remove(); if (n > 0 && app.user.ui.tab !== tab) b.append(h('span', { class: 'badge', 'aria-hidden': 'true' }, String(n))); };
  badge('talk', (app.c.people || []).reduce((m, x) => m + dialog.openTopics(x.id).length, 0));
  badge('board', board.newCount());
}
function langSelect() {
  const sel = $('#langSel'); sel.innerHTML = '';
  for (const l of I.languages()) sel.append(h('option', { value: l.code, lang: l.code, selected: l.code === I.getLang() || null }, l.name));
  sel.value = I.getLang();
}
$('#langSel').addEventListener('change', e => I.setLang(e.target.value));
function langList() {
  const box = h('div', { class: 'langs', role: 'radiogroup', 'aria-label': t('ui.settings.lang') });
  for (const l of I.languages()) box.append(h('button', { class: 'lang', role: 'radio', lang: l.code, 'aria-checked': String(l.code === I.getLang()), dataset: { lang: l.code },
    onclick: () => I.setLang(l.code) }, l.name));
  return box;
}

// ---------- Startmenü ----------
async function caseTitle(e, lang = I.getLang()) {
  const dir = caseDir(e);
  for (const code of [lang, 'en']) { try { const r = await fetch(new URL(`text/${code}.json`, new URL(dir, location.href))); if (r.ok) { const d = await r.json(); if (d['meta.title']) return d['meta.title']; } } catch {} }
  return e.id;
}
function renderMenu() {
  menuEl.innerHTML = '';
  const saved = Store.current() ? Store.load(Store.current()) : null;
  const actions = h('div', { class: 'mactions' });
  if (saved) {
    const sub = h('div', { class: 'mcont' });
    const e = index.find(x => x.id === saved.meta?.case);
    if (e) caseTitle(e).then(title => { sub.textContent = t('ui.menu.contSub', { title, n: saved.meta?.clues?.[0] ?? 0, m: saved.meta?.clues?.[1] ?? 0, date: I.fmtDate(saved.meta?.updated || Date.now()) }); });
    actions.append(h('button', { class: 'btn primary', dataset: { act: 'continue' }, onclick: () => resume(Store.current()) }, ico('play'), h('span', {}, t('ui.menu.continue'))), sub);
  }
  actions.append(h('button', { class: 'btn ' + (saved ? 'paper' : 'primary'), dataset: { act: 'new' }, onclick: chooseCase }, ico('file'), t('ui.menu.new')));
  actions.append(h('button', { class: 'btn ghost', style: { color: 'var(--ink)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.3)' }, dataset: { act: 'settings' }, onclick: () => openSettings(false) }, ico('menu'), t('ui.menu.settings')));
  menuEl.append(h('div', { class: 'mcard' },
    h('h1', { class: 'mtitle' }, t('ui.game.title'),
      h('span', { class: 'thread', html: '<svg viewBox="0 0 400 26" preserveAspectRatio="none" aria-hidden="true"><circle cx="8" cy="9" r="6" fill="#c8322a"/><circle cx="392" cy="9" r="6" fill="#c8322a"/><path d="M8 9 Q200 34 392 9" fill="none" stroke="#c8322a" stroke-width="3"/></svg>' })),
    h('p', { class: 'msub' }, t('ui.game.sub')),
    h('div', { class: 'mfolder' }, h('h2', {}, t('ui.menu.lang')), langList(), actions),
    h('p', { class: 'mfoot' }, t('ui.menu.foot'))));
}
function showMenu() {
  if (app.c) { auto.flush(); auto.stop(); }
  closeAll(); app.stage.closeReplay?.();
  app.stage.unmount(); app.c = null; app.s = null;
  settings.screen = 'menu'; saveSettings();
  gameEl.hidden = true; menuEl.hidden = false; renderMenu();
}
function chooseCase() {
  if (!index.length) { toast(t('ui.err.noCases'), 'err'); return; }
  const m = modal({ title: t('ui.menu.cases'), body: s => {
    const list = h('div', { class: 'setlist' });
    index.forEach((e, i) => {
      const title = h('b', {}, '…');
      caseTitle(e).then(x => { title.textContent = x; });
      list.append(h('button', { class: 'btn paper', style: { justifyContent: 'flex-start', textAlign: 'left', minHeight: '64px' }, dataset: { case: e.id }, onclick: async () => {
        const cur = Store.current() && Store.load(Store.current());
        if (cur && cur.meta?.case && !(await ask(t('ui.menu.overwrite'), { yes: t('ui.menu.overwriteYes'), danger: true }))) return;
        m.close(); start(e, null);
      } }, ico('file'), h('span', {}, h('span', { style: { display: 'block', font: '400 12px/1.2 var(--type)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink2)' } },
        t('ui.case.no', { n: i + 1 }) + ' · ' + t('ui.case.level', { n: e.level || 1 }) + (e.kind === 'murder' ? ' · ' + t('ui.case.murder') : '')), title)));
    });
    s.append(list);
  } });
}

// ---------- Fall starten / fortsetzen ----------
const caseDir = e => `cases/${e.dir ?? e.folder ?? e.path ?? e.id}/`.replace(/\/+$/, '/');
async function loadCaseData(e) {
  const r = await fetch(new URL('case.json', new URL(caseDir(e), location.href)));
  if (!r.ok) throw new Error('case.json ' + r.status);
  const json = await r.json();
  const c = CaseIO.loadCase ? CaseIO.loadCase(json) : json;
  try { const v = CaseIO.validateCase?.(c); const errs = v && (v.errors || (Array.isArray(v) ? v : null)); if (errs && errs.length) console.warn('[case] ' + errs.length + ' Hinweise', errs.slice(0, 5)); } catch (err) { console.warn('[case]', err); }
  return c;
}
const freshUser = () => ({ ui: { tab: 'scene', person: null }, board: { pos: {}, kind: 'red', seen: 0 }, accuse: { who: [], how: null, when: null, why: null }, hints: [], lab: [], notes: [], touched: [], badges: [], started: Date.now() });

async function start(e, saved) {
  entry = e;
  let c;
  try { c = await loadCaseData(e); } catch (err) { console.error(err); toast(t('ui.err.case'), 'err', 6000); return; }
  app.c = c; app.dir = caseDir(e);
  await I.useCase(app.dir);
  let s = null;
  if (saved?.state) { try { s = L.migrate(c, saved.state); } catch (err) { console.warn('[save] migrate', err); } }
  const fresh = !s;
  app.s = s || L.newState(c);
  app.user = { ...freshUser(), ...(saved && s ? saved.user || {} : {}) };
  for (const [k, v] of Object.entries(freshUser())) if (app.user[k] == null) app.user[k] = v;
  app.user.ui = { tab: 'scene', person: null, ...(app.user.ui || {}) };
  slot = saved?.slot || Store.current() || 1;
  if (!I.hasSaved()) Store.saveLang(I.getLang());               // Sprachwahl mit dem ersten Klick bestätigt
  menuEl.hidden = true; gameEl.hidden = false;
  settings.screen = 'game'; saveSettings();
  langSelect(); I.applyDom(gameEl);
  await app.stage.mount($('.stage-host'), { c, dir: app.dir, id: c.id, lang: I.getLang(), state: app.s, world: e.world, touched: app.user.touched || [] });
  go(app.user.ui.tab || 'scene', { save: false });
  if (app.s.view) app.stage.goto(app.s.view);
  auto.touch(); auto.flush(); auto.start();
  if (fresh) { openFile(); lab('start'); }
  else if (app.user.ui.open === 'file') openFile();
  else if (app.user.ui.open === 'notebook') notebook.open();
  else if (app.s.solved && app.user.ui.open === 'solved') showSolved();
}
async function resume(n) {
  const d = Store.load(n); if (!d) return renderMenu();
  const e = index.find(x => x.id === d.meta?.case) || index.find(x => x.id === d.state?.case);
  if (!e) { toast(t('ui.err.case'), 'err'); return; }
  slot = n; await start(e, { ...d, slot: n });
}
app.stage.onFind(onFind);
app.stage.onView(v => { act({ type: 'view', id: v }); lab('view', v); });

// ---------- Akte ----------
function openFile() {
  const c = app.c; if (!c) return;
  app.user.ui.open = 'file'; auto.touch();
  reopen = openFile;
  const no = index.indexOf(entry) + 1;
  const time = c.meta?.at ?? c.meta?.time;
  const vars = { time: typeof time === 'number' ? time : undefined, n: no };
  // meta.brief: Zeilen „Bezeichnung: Inhalt“ → Karteikarte, sonst Absatz
  const brief = hasC('meta.brief') ? tc('meta.brief', vars).split('\n').filter(Boolean) : [];
  const rows = brief.map(l => { const i = l.indexOf(':'); return i > 0 && i < 32 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : [null, l]; });
  modal({ cls: 'dossier', label: tc('meta.title'), onClose: () => { if (app.user.ui.open === 'file') { app.user.ui.open = null; auto.touch(); } reopen = null; }, body: (s, m) => {
    const dl = h('dl', { class: 'facts' });
    for (const [k, v] of rows) { if (k) dl.append(h('dt', {}, k), h('dd', {}, v)); else dl.append(h('dd', { style: { gridColumn: '1 / -1' } }, v)); }
    dl.append(h('dt', {}, t('ui.file.level')), h('dd', {}, t('ui.case.level', { n: c.meta?.level || 1 }) + (c.meta?.minutes ? ' · ' + t('ui.file.minutes', { n: c.meta.minutes }) : '')));
    const card = h('div', { class: 'card-ix' },
      h('div', { class: 'ctag' }, t('ui.file.tag') + (no > 0 ? ' · ' + t('ui.case.no', { n: no }) : '')),
      h('h2', {}, tc('meta.title')),
      app.s.solved ? h('div', { class: 'stamp' }, t('ui.solved.stamp')) : null,
      dl,
      hasC('meta.intro') ? h('p', { class: 'intro' }, tc('meta.intro', vars)) : null);
    const cast = h('div', { class: 'cast' });
    for (const p of (c.people || []).filter(p => !p.lab)) cast.append(h('div', { class: 'ph' }, pic(p.id, { species: speciesOf(p) }), h('b', {}, pname(p.id)), prole(p.id)));
    s.append(card, h('h3', {}, t('ui.file.people')), cast,
      h('div', { class: 'row' }, h('button', { class: 'btn primary', dataset: { act: 'investigate' }, autofocus: true, onclick: () => { m.close(); go('scene'); } }, ico('search'), t('ui.file.go'))));
  } });
}

// ---------- Auflösung ----------
function showSolved(first = false) {
  if (!app.s?.solved) return;
  app.user.ui.open = 'solved'; auto.touch();
  reopen = () => showSolved(false);
  const r = app.rank(), wrong = (app.s.accusations || []).filter(a => a && (a.reject || a.ok === false)).length;
  const hints = Array.isArray(app.s.hints) ? app.s.hints.length : (+app.s.hints || 0);
  modal({ cls: 'dossier solved', label: t('ui.solved.title'), onClose: () => { if (app.user.ui.open === 'solved') { app.user.ui.open = null; auto.touch(); } reopen = null; }, body: (s, m) => {
    s.append(h('div', { class: 'card-ix' },
      h('div', { class: 'ctag' }, t('ui.solved.title')),
      h('h2', {}, tc('meta.title')),
      h('div', { class: 'stamp' + (first ? ' hit' : '') }, t('ui.solved.stamp')),
      h('p', { class: 'soltext' }, hasC('solution.text') ? tc('solution.text') : ''),
      h('div', { class: 'medal ' + r }, h('div', { class: 'disc', 'aria-hidden': 'true' }, t(`ui.rank.${r}.short`)),
        h('div', {}, h('b', {}, t(`ui.rank.${r}`)), h('small', {}, t('ui.solved.stats', { wrong, hints, loose: board.looseCount() }))))),
      h('div', { class: 'row' },
        h('button', { class: 'btn ghost', onclick: () => { m.close(); showMenu(); } }, t('ui.nav.menu')),
        h('button', { class: 'btn paper', onclick: () => { m.close(); go('board'); } }, ico('pin'), t('ui.nav.board')),
        h('button', { class: 'btn primary', dataset: { act: 'replay' }, autofocus: true, onclick: () => app.stage.replay() }, ico('replay'), t('ui.solved.replay'))));
  } });
}

// ---------- Einstellungen ----------
function openSettings(inGame = true) {
  reopen = () => openSettings(inGame);
  modal({ title: t('ui.settings.title'), onClose: () => { reopen = null; }, body: (s, m) => {
    const list = h('div', { class: 'setlist' });
    list.append(h('h3', {}, t('ui.settings.lang')), langList());
    if (inGame) {
      list.append(h('h3', {}, t('ui.settings.case')),
        h('button', { class: 'btn', dataset: { act: 'file' }, onclick: () => { m.close(); openFile(); } }, ico('file'), t('ui.nav.file')),
        h('button', { class: 'btn', dataset: { act: 'export' }, onclick: () => { auto.flush(); if (Store.exportFile(slot)) toast(t('ui.store.exported'), 'good'); } }, ico('book'), t('ui.settings.export')),
        h('button', { class: 'btn', dataset: { act: 'restart' }, onclick: async () => { if (await ask(t('ui.settings.restartQ'), { yes: t('ui.settings.restart'), danger: true })) { m.close(); Store.remove(slot); start(entry, null); } } }, ico('replay'), t('ui.settings.restart')),
        h('button', { class: 'btn primary', dataset: { act: 'to-menu' }, onclick: () => { m.close(); showMenu(); } }, ico('back'), t('ui.settings.toMenu')));
    } else {
      const inp = h('input', { type: 'file', accept: '.json,application/json', class: 'sr', onchange: async e => {
        try { const d = await Store.importFile(e.target.files[0]); const n = Store.current() || 1; Store.save(n, d); Store.setCurrent(n); m.close(); toast(t('ui.store.imported'), 'good'); renderMenu(); }
        catch (err) { toast(t(err.message?.startsWith('ui.') ? err.message : 'ui.store.bad'), 'err'); } } });
      list.append(h('h3', {}, t('ui.settings.save')), h('label', { class: 'btn' }, ico('file'), t('ui.settings.import'), inp));
    }
    s.append(list);
  } });
}

// ---------- Sprache wechseln: alles sofort ----------
I.onLang(code => {
  fillIcons(); langSelect();
  if (!menuEl.hidden) renderMenu();
  if (app.c) { header(); renderTab(); app.stage.lang(code); notebook.refresh(); }
  if (reopen) { const f = reopen; const stack = $$('#layer .modal'); if (stack.length === 1) { closeAll(); f(); } else { for (const el of $$('#layer .langs')) el.replaceWith(langList()); } }
  else for (const el of $$('#layer .langs')) el.replaceWith(langList());
});

// ---------- Eingabe ----------
for (const b of $$('.tab')) b.addEventListener('click', () => go(b.dataset.tab));
gameEl.addEventListener('click', e => {
  const a = e.target.closest('[data-act]')?.dataset.act; if (!a || !e.target.closest('.bar')) return;
  if (a === 'file') openFile();
  else if (a === 'notebook') { notebook.toggle(); }
  else if (a === 'hint') { notebook.open('hints'); }
  else if (a === 'menu') openSettings(true);
});
let lastTab = 'scene';
window.addEventListener('keydown', e => {
  if (!app.c || gameEl.hidden || app.stage.replaying) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (['input', 'select', 'textarea'].includes(tag)) return;
  if (e.key === 'Escape') { if (board.cancel()) return; if (!closeTop()) openSettings(true); e.preventDefault(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Tab' && !modalOpen()) {
    e.preventDefault();
    if (app.user.ui.tab === 'board') go(lastTab === 'board' ? 'scene' : lastTab); else { lastTab = app.user.ui.tab; go('board'); }
    return;
  }
  const k = e.key.toLowerCase();
  if (k === 'n') { e.preventDefault(); notebook.toggle(); }
  else if (k === 'h') { e.preventDefault(); notebook.open('hints'); }
  else if (!modalOpen() && app.user.ui.tab === 'scene' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); app.stage.step(e.key === 'ArrowLeft' ? -1 : 1); }
  else if (k === ' ' && app.s.solved && !modalOpen()) { e.preventDefault(); app.stage.replay(); }
});
window.addEventListener('beforeunload', () => { if (app.c) auto.flush(); });

// ---------- Start ----------
(async function boot() {
  await I.init();
  fillIcons();
  try { const r = await fetch('cases/index.json'); const d = r.ok ? await r.json() : []; index = Array.isArray(d) ? d : (d.cases || []); } catch { index = []; }
  langSelect(); I.applyDoc();
  $('#boot').classList.add('gone'); setTimeout(() => $('#boot')?.remove(), 700);
  const n = Store.current();
  if (n && settings.screen === 'game' && Store.load(n)) await resume(n);
  else { menuEl.hidden = false; renderMenu(); }
  window.__krimi.ready = true;
})();
window.__krimi = { app, L, I, Store, go, start, resume, showMenu, board, dialog, accuse, notebook, ready: false };
