// Notizbuch: gefundene Spuren, gehörte Aussagen, Erkenntnisse und Hinweise in drei Stufen (Otto: „Fassen wir mal zusammen …“).
import { t, tc, hasC, has } from './i18n.js';
import { h, ico, modal, cardInfo, stmtOf, clueOf, varsOf, pname, findIcon } from './ui.js';

const TABS = ['clues', 'statements', 'insights', 'hints'];

export function createNotebook(app) {
  let m = null, tab = 'clues';
  const hintText = x => {
    if (!x) return '';
    const key = x.text || x.key || '';
    const args = { ...(x.args || {}) };
    for (const [k, v] of Object.entries(args)) if (typeof v === 'string') {     // Ids in Platzhaltern lesbar machen
      if (hasC(`clue.${v}`)) args[k] = tc(`clue.${v}`); else if (hasC(`person.${v}.name`)) args[k] = tc(`person.${v}.name`);
      else if (hasC(`fact.${v}`)) args[k] = tc(`fact.${v}`); else if (hasC(`place.${v}`)) args[k] = tc(`place.${v}`);
    }
    return hasC(key) ? tc(key, args) : has(key) ? t(key, args) : tc(key, args);
  };
  const hintList = () => (Array.isArray(app.s.hints) && app.s.hints.length && typeof app.s.hints[0] === 'object' && (app.s.hints[0].text || app.s.hints[0].key)) ? app.s.hints : (app.user.hints || []);

  function draw(sheet) {
    sheet.querySelector('.nb-body')?.remove();
    const body = h('div', { class: 'nb-body' });
    const tabs = h('div', { class: 'nb-tabs', role: 'tablist' });
    for (const k of TABS) tabs.append(h('button', { class: 'chip', role: 'tab', 'aria-pressed': String(tab === k), dataset: { nbtab: k }, onclick: () => { tab = k; draw(sheet); } }, t(`ui.nb.${k}`)));
    body.append(tabs);
    const c = app.c, s = app.s, ul = h('ul', { class: 'nb-list' });
    if (tab === 'clues') {
      (s.found || []).forEach((id, i) => { const cl = clueOf(c, id);
        ul.append(h('li', {}, h('span', { class: 'who' }, '#' + (i + 1) + (cl?.place && hasC(`place.${cl.place}`) ? ' · ' + tc(`place.${cl.place}`) : '')),
          h('b', {}, tc(`clue.${id}`, varsOf(cl))), hasC(`clue.${id}.detail`) ? h('small', {}, tc(`clue.${id}.detail`, varsOf(cl))) : null)); });
      if (!(s.found || []).length) ul.append(h('li', { class: 'nb-empty' }, t('ui.nb.noClues')));
    } else if (tab === 'statements') {
      for (const id of s.heard || []) { const st = stmtOf(c, id);
        ul.append(h('li', {}, h('span', { class: 'who' }, st?.person ? pname(st.person) : ''), h('b', {}, t('ui.quote', { s: tc(`stmt.${id}`, varsOf(st)) })))); }
      if (!(s.heard || []).length) ul.append(h('li', { class: 'nb-empty' }, t('ui.nb.noStatements')));
    } else if (tab === 'insights') {
      for (const k of app.cards().filter(k => k.kind === 'insight')) ul.append(h('li', {}, h('b', {}, cardInfo(c, k).title)));
      if (!(s.insights || []).length) ul.append(h('li', { class: 'nb-empty' }, t('ui.nb.noInsights')));
    } else {
      const got = hintList(), lvl = got.length ? Math.max(...got.map(x => x.level || 1)) : 0;
      body.append(h('div', { class: 'hintbox' }, h('div', { class: 'av otto', 'aria-hidden': 'true' }, t('ui.lab.otto.init')),
        h('div', {}, h('b', {}, t('ui.lab.otto')), h('div', {}, t('ui.nb.hintIntro')))));
      const lv = h('ol', { class: 'levels' });
      for (let i = 1; i <= 3; i++) lv.append(h('li', { class: lvl >= i ? 'on' : '' }, h('i', {}, String(i)), t(`ui.nb.level${i}`)));
      body.append(lv);
      body.append(h('div', { class: 'row', style: { justifyContent: 'flex-start', marginTop: '0' } },
        h('button', { class: 'btn paper', dataset: { act: 'get-hint' }, onclick: () => { app.hint(); draw(sheet); } }, ico('bulb'), t('ui.nb.getHint')),
        h('small', { style: { alignSelf: 'center', color: 'var(--ink2)' } }, t('ui.nb.hintCost'))));
      got.slice().reverse().forEach(x => ul.append(h('li', {}, h('span', { class: 'who' }, t('ui.nb.levelN', { n: x.level || 1 })), h('b', {}, hintText(x)))));
    }
    body.append(ul);
    sheet.append(body);
  }
  function open(which) {
    if (which) tab = which;
    if (m) { draw(m.sheet); return; }
    m = modal({ title: t('ui.nb.title'), cls: 'nb', wide: true, onClose: () => { m = null; }, body: s => draw(s) });
  }
  return {
    open, isOpen: () => !!m, close: () => m?.close(), toggle: w => (m ? m.close() : open(w)),
    refresh() { if (m) { m.sheet.querySelector('h2').textContent = t('ui.nb.title'); draw(m.sheet); } },
    hintText,
  };
}
