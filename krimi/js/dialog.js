// Gespräche: Personenliste, Nahaufnahme, Themen, Aussagen als Text, Vorhalten einer Karte.
import { t, tc, hasC } from './i18n.js';
import { h, ico, pic, person, speciesOf, pname, prole, stmtOf, varsOf, pickCard } from './ui.js';

export function createDialog(app, root) {
  const U = () => (app.user.ui ||= {});
  let fresh = new Set(), confused = null;     // gerade neu gehörte Aussagen, letzte verwirrte Antwort (nur Anzeige)
  let lastExpr = {};

  const people = () => (app.c.people || []).filter(p => !p.lab && p.talk !== false && p.hidden !== true);
  const heardOf = pid => (app.s.heard || []).filter(id => stmtOf(app.c, id)?.person === pid);
  const asked = (pid, topic) => (app.c.statements || []).some(st => st.person === pid && st.topic === topic && (app.s.heard || []).includes(st.id));
  const openTopics = pid => app.topicsFor(pid).filter(tp => !asked(pid, tp));

  function render() {
    const c = app.c, s = app.s; if (!c || !s) return;
    const cur = U().person && people().some(p => p.id === U().person) ? U().person : null;
    const sc = root.querySelector('.conv')?.scrollTop || 0;
    root.innerHTML = '';
    const list = h('aside', { class: 'people', 'aria-label': t('ui.talk.people') }, h('h3', {}, t('ui.talk.people')));
    for (const p of people()) {
      const n = openTopics(p.id).length;
      list.append(h('button', { class: 'pbtn', 'aria-current': String(p.id === cur), dataset: { person: p.id }, onclick: () => open(p.id) },
        pic(p.id, { species: speciesOf(p), expr: lastExpr[p.id] || p.mood || 'calm' }),
        h('span', {}, h('b', {}, pname(p.id)), prole(p.id) ? h('small', {}, prole(p.id)) : null),
        n ? h('span', { class: 'badge', 'aria-label': t('ui.talk.newTopics', { n }) }, String(n)) : null));
    }
    const conv = h('div', { class: 'conv' });
    if (!cur) conv.append(h('p', { class: 'empty' }, t('ui.talk.choose')));
    else {
      const p = person(c, cur), expr = lastExpr[cur] || p.mood || 'calm';
      conv.append(h('div', { class: 'closeup' }, pic(cur, { species: speciesOf(p), expr }),
        h('div', {}, h('h2', {}, pname(cur)), prole(cur) ? h('p', {}, prole(cur)) : null, hasC(`person.${cur}.bio`) ? h('p', { class: 'bio' }, tc(`person.${cur}.bio`)) : null)));
      const log = h('div', { class: 'log', 'aria-live': 'polite' });
      const heard = heardOf(cur);
      for (const id of heard) {
        const st = stmtOf(c, id) || { id };
        const isFollow = (c.contradictions || []).some(k => k.follow === id) || st.after || st.follow;
        const tell = String(st.expr || '').split('+').filter(x => x && x !== 'calm' && app.has(`ui.expr.${x}`)).map(x => t(`ui.expr.${x}`)).join(' · ');
        const b = h('div', { class: 'say' + (fresh.has(id) ? ' new' : '') + (isFollow ? ' follow' : '') + (st.kind === 'action' ? ' action' : ''), dataset: { stmt: id } },
          h('q', {}, tc(`stmt.${id}`, varsOf(st))),
          h('div', { class: 'meta' }, tell ? h('span', { class: 'tell' }, tell) : h('span'),
            h('button', { class: 'btn small present', dataset: { act: 'present', stmt: id }, onclick: () => present(cur, id) }, ico('note'), t('ui.talk.present'))));
        log.append(b);
        if (confused === id) log.append(h('div', { class: 'say confused new' }, h('q', {}, t('ui.talk.confused'))));
      }
      if (!heard.length) log.append(h('p', { class: 'empty' }, t('ui.talk.start')));
      conv.append(log);
      const tps = app.topicsFor(cur);
      const box = h('div', { class: 'topics' });
      for (const tp of tps) {
        const done = asked(cur, tp);
        box.append(h('button', { class: 'topic' + (done ? ' done' : ' fresh'), dataset: { topic: tp }, onclick: () => ask(cur, tp) }, ico('chat'), tc(`topic.${tp}`)));
      }
      if (!tps.length) box.append(h('p', { class: 'empty' }, t('ui.talk.noTopics')));
      conv.append(h('div', { class: 'askbar' }, h('h3', { class: 'sec-t' }, t('ui.talk.topics')), box));
    }
    root.append(h('div', { class: 'talk' }, list, conv));
    conv.scrollTop = sc;
    if (fresh.size) { const all = conv.querySelectorAll('.say.new'); const first = all[0]; if (first) conv.scrollTop = Math.max(0, first.offsetTop - 120); }
    fresh = new Set();
  }

  function open(pid) {
    U().person = pid; confused = null; app.touch(); render();
    const p = person(app.c, pid);
    app.stage.say(pid, { expr: lastExpr[pid] || p.mood || 'calm', look: 'cam', shot: 'close' });
    app.lab('talk', pid);
  }
  function ask(pid, topic) {
    const res = app.act({ type: 'ask', person: pid, topic });
    if (!res || res.ok === false) { render(); return; }
    const ids = (res.statements || []).map(x => (typeof x === 'string' ? x : x.id)).filter(Boolean);
    ids.forEach(id => fresh.add(id)); confused = null;
    const last = stmtOf(app.c, ids[ids.length - 1]);
    if (last?.expr) lastExpr[pid] = last.expr;
    const txt = ids.map(id => tc(`stmt.${id}`)).join(' ');
    app.stage.say(pid, { expr: last?.expr || 'calm', talk: Math.max(1.2, txt.length * .055), look: 'cam', shot: 'close' });
    render();
    app.lab('ask', pid + ':' + topic);
  }
  async function present(pid, stmt) {
    const card = await pickCard(app.c, app.cards(), { title: t('ui.talk.presentT'), prefer: 'clue' });
    if (!card) return;
    const res = app.act({ type: 'present', statement: stmt, card: card.id });
    if (res && res.ok && res.follow) {
      const f = typeof res.follow === 'string' ? res.follow : res.follow.id;
      fresh.add(f); confused = null;
      const st = stmtOf(app.c, f); lastExpr[pid] = st?.expr || 'nervous';
      app.stage.say(pid, { expr: lastExpr[pid], react: 'gasp', talk: 2.5, look: 'cam', shot: 'close' });
      app.flash(t('ui.talk.hit'), 'good');
    } else {
      confused = stmt;
      app.stage.say(pid, { expr: 'confused', react: 'shrug', talk: .8, look: 'cam', shot: 'close' });
    }
    render();
  }
  return { render, open, openTopics, current: () => U().person || null };
}
