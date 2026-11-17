// Anklage bei der Staatsanwältin: Täter wählen (in späteren Fällen mehrere) und drei Säulen mit je einer Karte belegen.
// Trägt eine Säule nicht, nennt sie sie. Kein Verlieren, nur Rang. Der Entwurf liegt als Nutzerdaten (Karten-Ids) im Spielstand.
import { t, tc, hasC } from './i18n.js';
import { h, ico, pic, speciesOf, pname, prole, cardInfo, pickCard } from './ui.js';

const PILLARS = ['how', 'when', 'why'];

export function createAccuse(app, root) {
  const D = () => (app.user.accuse ||= { who: [], how: null, when: null, why: null });
  let said = null, bad = null;          // letzte Antwort der Staatsanwältin (Schlüssel), abgelehnte Säule

  function render() {
    const c = app.c, s = app.s; if (!c || !s) return;
    const d = D(), cards = app.cards(), byId = new Map(cards.map(k => [k.id, k]));
    for (const p of PILLARS) if (d[p] && !byId.has(d[p])) d[p] = null;
    const sc = root.querySelector('.accuse')?.scrollTop || 0;
    root.innerHTML = '';
    const wrap = h('div', { class: 'accuse' }), inn = h('div', { class: 'acc-in' });
    const line = said ? (hasC(said) ? tc(said) : t(said)) : s.solved ? (hasC('accuse.ok') ? tc('accuse.ok') : t('ui.accuse.solved')) : t('ui.accuse.intro');
    inn.append(h('div', { class: 'dda' }, pic('prosecutor', { expr: bad ? 'angry' : s.solved ? 'happy' : 'calm' }),
      h('div', { class: 'say', 'aria-live': 'polite' }, h('b', {}, t('ui.accuse.dda')), h('q', {}, line))));
    if (s.solved) {
      inn.append(h('div', { class: 'acc-go' }, h('button', { class: 'btn primary', dataset: { act: 'show-solved' }, onclick: () => app.showSolved() }, ico('file'), t('ui.accuse.showSolved'))));
    }
    // Wer?
    inn.append(h('h3', { class: 'sec-t' }, t('ui.accuse.who')));
    const sus = h('div', { class: 'suspects', role: 'group', 'aria-label': t('ui.accuse.who') });
    for (const p of (c.people || []).filter(p => p.suspect && !p.lab)) {
      const on = d.who.includes(p.id);
      sus.append(h('button', { class: 'sus', 'aria-pressed': String(on), dataset: { suspect: p.id }, disabled: s.solved || null,
        onclick: () => { d.who = on ? d.who.filter(x => x !== p.id) : [...d.who, p.id]; bad = null; app.touch(); render(); } },
        pic(p.id, { species: speciesOf(p) }), h('span', {}, h('b', {}, pname(p.id)), prole(p.id) ? h('small', { style: { display: 'block', opacity: .75 } }, prole(p.id)) : null)));
    }
    inn.append(sus);
    // Drei Säulen
    const pil = h('div', { class: 'pillars' });
    for (const p of PILLARS) {
      const k = d[p] ? byId.get(d[p]) : null, info = k ? cardInfo(c, k) : null;
      pil.append(h('div', { class: 'pillar' + (bad === p ? ' bad' : ''), dataset: { pillar: p } },
        h('h4', {}, t(`ui.accuse.${p}`)), h('p', {}, t(`ui.accuse.${p}Q`)),
        h('button', { class: 'slot' + (k ? ' filled' : ''), dataset: { act: 'slot', pillar: p }, disabled: s.solved || null, onclick: () => choose(p) },
          k ? [ico(info.icon), h('span', {}, info.title)] : [ico('pin'), h('span', {}, t('ui.accuse.pick'))])));
    }
    inn.append(pil);
    const ready = d.who.length && PILLARS.every(p => d[p]);
    if (!s.solved) inn.append(h('div', { class: 'acc-go' },
      h('button', { class: 'btn primary', dataset: { act: 'accuse' }, disabled: !ready || null, onclick: submit }, ico('gavel'), t('ui.accuse.go')),
      h('span', { class: 'tries' }, ready ? '' : t('ui.accuse.need'))));
    const n = (s.accusations || []).length;
    if (n) inn.append(h('p', { class: 'tries' }, t('ui.accuse.tries', { n })));
    wrap.append(inn); root.append(wrap); wrap.scrollTop = sc;
  }

  async function choose(p) {
    const k = await pickCard(app.c, app.cards(), { title: t(`ui.accuse.${p}`) + ' – ' + t(`ui.accuse.${p}Q`), prefer: 'insight' });
    if (!k) return;
    D()[p] = k.id; bad = null; said = null; app.touch(); render();
  }
  function submit() {
    const d = D();
    const res = app.act({ type: 'accuse', who: d.who.slice(), how: d.how, when: d.when, why: d.why });
    if (!res) return;
    if (res.ok) { said = 'accuse.ok'; bad = null; render(); app.lab('solved'); setTimeout(() => app.showSolved(true), 450); return; }
    bad = res.reject || null;
    said = bad ? `accuse.reject.${bad}` : 'ui.accuse.rejected';
    render();
    app.lab('reject', bad || '');
  }
  return { render };
}
