// Cogtopia – Oberfläche der Zusatzsysteme (Mixin für UI): Glücksrad, Tagesserie (Kalender + Check-in), Ereignis-Banner, Ziel-Leiste,
// Durchbruch-Karte, Album, Weltwunder, Wochen-Herausforderung (Start, Timer, Ende, Bestenliste, Codes), Hinweise nach der Anleitung.
import { t, name, desc, fmtNum, fmtTime } from '../i18n.js';
import { ITEMS, BUILDINGS, WONDER, TUTORIAL, BIOMES, COLORS } from '../data.js';
import { WHEEL, STREAK, CARDS, challengeSpec, resultCode, parseResultCode } from '../meta.js';
import * as storage from '../storage.js';
import { esc, clamp, clock, pct, copyText } from './common.js';

const WHEEL_ICON = { geld: '💰', geldgross: '🤑', rp: '🧪', kiste: '🎁', turbo: '⚡', goldregen: '🌟', gutschein: '🎟️', jackpot: '📜' };
const WHEEL_COL = ['#f6c94a', '#7cc06a', '#8a6ad8', '#e8894a', '#5aa8e8', '#f2b818', '#e86a8a', '#d0503a'];
const STREAK_ICON = { kiste: '🎁', geld: '💰', kisten2: '🎁🎁', turbo: '⚡', gutschein: '🎟️', kisten3: '🎁🎁🎁', patent: '📜' };
const EV_ICON = { goldvein: '✨', meteor: '☄️', quake: '🌋', vip: '🚚', boom: '📈', storm: '🌪️' };
const CARD_ICON = { normal: '🃏', gold: '✨', perfect: '⭐', mega: '💎' };
const secsToMidnight = () => { const n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1); return (m - n) / 1000; };
const dateStr = at => { try { return new Date(at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }); } catch { return ''; } };

export const MetaUI = {
  // ===================================================================================== Klicks
  async _actMeta(a, d) {
    const app = this.app, sim = this.sim;
    switch (a) {
      case 'spin': this.spinWheel(); return true;
      case 'checkin': this.doCheckIn(); return true;
      case 'goal': this.goalClick(); return true;
      case 'ev-info': { const k = d.k, A = (app.meta.active() || []).find(x => x.kind === k); this.toast((EV_ICON[k] || '•') + ' ' + (k === 'storm' ? t('event.storm', { secs: sim.S.storm.left }) : t('event.' + k + '.desc', A || {})), 'ok'); return true; }
      case 'album-page': this.albumPage = +d.t; this.renderPanel(true); return true;
      case 'wonder-place': this.closePanel(); app.setTool('wunder'); return true;
      case 'wonder-fly': { const e = sim.S.ents.find(q => q.type === 'wunder'); if (e) app.flyToEntity(e.id); this.closePanel(); return true; }
      case 'chal-start': this.closePanel(); this.closeModals(); app.startChallenge(d.fresh === '1'); return true;
      case 'chal-leave': this.closePanel(); this.closeModals(); app.leaveChallenge(); return true;
      case 'chal-copy': { const ok = await copyText(d.code); this.toast(ok ? '📋 ' + t('ui.codeCopied') : d.code, ok ? 'ok' : 'mute'); return true; }
      case 'chal-check': {
        const inp = this.root.querySelector('input.chalcode'), v = inp ? inp.value : '', r = parseResultCode(v); this._chalFriendIn = v;
        this._chalFriend = v.trim() ? (r ? { ...r } : { bad: true }) : null; this.renderPanel(true); if (r) app.sound?.play('click'); else app.sound?.play('error', { gain: .4 }); return true;
      }
      case 'hint-ok': this.hintDone(); return true;
      case 'chal-close': this.closeModals(); return true;
    }
    return false;
  },

  // ===================================================================================== Ereignisse
  _onEvent2(ev) {
    const app = this.app, sim = this.sim;
    switch (ev.type) {
      case 'power':
        if (ev.kind === 'grace') { this.toast('⚡ ' + t('event.power.grace', ev), 'gold'); this.hint('power', true); }
        else this.toast('⚡ ' + t('event.power.graceEnd'), 'err');
        break;
      case 'storm': this.toast('🌪️ ' + t(ev.on ? 'event.storm' : 'event.stormEnd', ev), ev.on ? 'gold' : 'mute'); break;
      case 'merge': this.toast('⛏️ ' + t('event.merge', { item: ev.item }), 'gold'); this.hint('merge', true); this.renderInfo(true); break;
      case 'build': if (ev.b === 'bohrer' && sim && sim._cnt && sim._cnt('bohrer') >= 3 && !(sim.count.grossbohrer > 0)) this.hint('mergeTip'); break;
      case 'upgrade': if (this._rl('upg', 1.5)) this.toast('⬆ ' + t('event.upgrade', { b: ev.b, mk: ['', 'I', 'II', 'III'][ev.mk] }), 'ok'); this.renderInfo(true); break;
      case 'event': {
        const v = { ...ev }; if (v.secs !== undefined) v.secs = Math.round(v.secs);
        this.toast((EV_ICON[ev.kind] || '•') + ' ' + t(ev.key, v), ev.on ? 'gold' : ev.ok ? 'ok' : 'mute'); this._evSig = null; break;
      }
      case 'wheel': if (!this._spin) { this.toast(WHEEL_ICON[ev.kind] + ' ' + t(ev.key, { ...ev.reward }), 'gold'); app.view.fx.wheelConfetti(app.focusPoint(.4), { big: ev.kind === 'jackpot' }); } break;
      case 'streak': this.toast('📅 ' + t(ev.key, { day: ev.day, ...ev.reward }), 'gold'); if (this.panel === 'streak') this.renderPanel(true); break;
      case 'breakthrough': this.breakthroughCard(ev); break;
      case 'card': if (this._rl('card', 2.5)) this.toast(CARD_ICON[ev.variant] + ' ' + t(ev.key, ev), ev.variant === 'normal' ? 'ok' : 'gold'); if (this.panel === 'album') this.renderPanel(true); break;
      case 'album': this.toast('🗂️ ' + t(ev.key, { tier: ev.tier, color: ev.reward?.color, title: ev.reward?.title }), 'gold'); break;
      case 'wonder': if (ev.launch) this.launchCard(); else this.toast('🚀 ' + t('event.wonder', ev), 'gold'); if (this.panel === 'wonder') this.renderPanel(true); break;
      case 'challengeEnd': this.chalEndModal(ev); break;
      case 'crate': if (ev.kind === 'new' && ['wheel', 'streak', 'bt', 'album', 'vip', 'wonder'].includes(ev.src)) this._pulseCrates(); break;
    }
  },
  _researchHint(id) { if (id === 'strom') this.hint('power'); else if (id === 'upgrade1') this.hint('upgrade'); else if (id === 'drohnen') this.hint('drones'); },

  // ===================================================================================== Bild für Bild (alle 0,25 s)
  _frame2() {
    const app = this.app, sim = this.sim, m = app.meta; if (!sim || !m || !m.f) return;
    const today = app.today(), tutOn = sim.S.tut <= TUTORIAL.length, chal = m.inChallenge();
    // Ziel-Leiste
    const g = !tutOn && !app.photoOn ? m.nextGoals(1)[0] : null;
    const gh = g ? `<button class="goalb" data-act="goal"><i>🎯</i><span class="gt">${esc(t(g.key, g.vars))}</span><span class="bar thin ${g.progress >= 1 ? 'green' : 'gold'}"><i style="width:${(clamp(g.progress) * 100).toFixed(1)}%"></i></span></button>` : '';
    if (gh !== this._goalSig) { this._goalSig = gh; this.el.goal.innerHTML = gh; this._goal = g; }
    // Ereignis-Banner
    const act = (m.active() || []).slice();
    if (sim.S.storm && sim.S.storm.left > 0) act.unshift({ kind: 'storm', left: sim.S.storm.left, secs: 45 });
    const eh = app.photoOn ? '' : act.map(a => {
      const nm = a.kind === 'storm' ? t('ui.storm') : t('event.' + a.kind + '.name'), ic = a.item && ITEMS[a.item] ? this.iIcon(a.item, false, 'sm') : '';
      const prog = a.kind === 'vip' ? `<span class="bar thin gold"><i style="width:${pct((a.have || 0) / Math.max(1, a.n || 1))}%"></i><span>${esc(t('event.vip.progress', a))}</span></span>` : '';
      return `<button class="evc ev-${a.kind}" data-act="ev-info" data-k="${a.kind}"><i class="ei">${EV_ICON[a.kind] || '•'}</i>${ic}<span class="et"><b>${esc(nm)}${a.kind === 'boom' ? ' ×' + (a.mul || 3) : ''}</b><small>⏱ ${clock(a.left)}</small></span>${prog}</button>`;
    }).join('');
    if (eh !== this._evSig) { this._evSig = eh; this.el.evbar.innerHTML = eh; }
    this.el.topc.classList.toggle('on', !!(gh || eh));
    // Schmale Fenster: Leiste unter das HUD, Anleitung darunter
    if (innerWidth < 900) {
      const hb = Math.round(this.el.hud.getBoundingClientRect().bottom + 6) + 'px'; if (this.el.topc.style.top !== hb) this.el.topc.style.top = hb;
      const tb = (gh || eh) ? Math.round(this.el.topc.getBoundingClientRect().bottom + 6) + 'px' : hb; if (this.el.tut.style.top !== tb) this.el.tut.style.top = tb;
    } else if (this.el.topc.style.top || this.el.tut.style.top) { this.el.topc.style.top = ''; this.el.tut.style.top = ''; }
    // Toasts unter die Ziel-/Ereignis-Leiste (Desktop)
    if (innerWidth > 760) { const r = this.el.topc.getBoundingClientRect(), top = (gh || eh) && r.height ? Math.round(r.bottom + 8) + 'px' : ''; if (this.el.toasts.style.top !== top) this.el.toasts.style.top = top; }
    // Abzeichen: Glücksrad drehbar, Serie abholbar
    const spin = !chal && m.canSpin(today), chk = !chal && m.canCheckIn(today);
    const wb = this.el.side.querySelector('[data-p="wheel"]'); if (wb) wb.classList.toggle('ready', spin);
    const mb = this.el.side.querySelector('[data-p="menu"] .badge'); if (mb) { const n = (chk ? 1 : 0); mb.textContent = n || ''; mb.classList.toggle('on', n > 0); }
    // Check-in-Popup, sobald nichts anderes offen ist
    if (this._wantCheckIn && !this.modalOpen && !this.el.overlay.classList.contains('on') && !this.panel && !app.photoOn && !app.media) {
      this._wantCheckIn = false;
      if (chk && (!tutOn || sim.S.total.playtime > 300)) this.checkInModal();
    }
    // Hinweise (nach der Anleitung)
    if ((this._hintT = (this._hintT || 0) + 1) % 8 === 0) {
      if (!this.hintNow && !tutOn) {
        if (sim.S.ents.length >= 30) this.hint('bp');
        if (sim.S.total.prestiges >= 1 && !(sim.count.wunder > 0)) this.hint('wonder');
        const q = (this._hintQ || []).find(h => !this._hintSeen(h)); if (q) this.hint(q);
      }
    }
    this.renderOverlay(false);
  },
  afterStart() { this._wantCheckIn = true; },
  dayTick() { const m = this.app.meta; if (m && m.f && m.canCheckIn(this.app.today())) this._wantCheckIn = true; },

  // ===================================================================================== Ziel-Leiste
  goalClick() {
    const g = this._goal, app = this.app; if (!g) return; const tg = g.target || {};
    app.sound?.play('click');
    switch (tg.type) {
      case 'research': this.openPanel('research'); break;
      case 'building': if (this._usable(tg.id)) app.setTool(tg.id); else this.openPanel('research'); break;
      case 'plot': app.flyToPlot(tg.cx, tg.cy); this.openPanel('plots'); break;
      case 'achievement': this.openPanel('achievements'); break;
      case 'prestige': this.openPanel('prestige'); break;
      case 'wonder': this.openPanel('wonder'); break;
      case 'challenge': this.openPanel('challenge'); break;
    }
  },

  // ===================================================================================== Glücksrad
  _wheelSvg() {
    const n = WHEEL.length, R = 96, seg = 360 / n, P = a => [R * Math.sin(a * Math.PI / 180), -R * Math.cos(a * Math.PI / 180)];
    let s = '';
    WHEEL.forEach((w, i) => {
      const [x1, y1] = P(i * seg - seg / 2), [x2, y2] = P(i * seg + seg / 2);
      s += `<path d="M0 0L${x1.toFixed(2)} ${y1.toFixed(2)}A${R} ${R} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}Z" fill="${WHEEL_COL[i % WHEEL_COL.length]}" stroke="#fff8e6" stroke-width="2.5"/>`;
      const flip = i * seg > 90 && i * seg < 270;                         // untere Hälfte: Text nicht kopfüber
      s += `<g transform="rotate(${i * seg})"><text y="-77" class="wi">${WHEEL_ICON[w.id]}</text><text transform="translate(0 -43) rotate(${flip ? 90 : -90})" class="wl">${esc(t('wheel.seg.' + w.id))}</text></g>`;
    });
    return `<svg viewBox="-100 -100 200 200" aria-hidden="true"><circle r="99" fill="#7a4a2b"/>${s}<circle r="17" fill="#fff8e6" stroke="#d9a514" stroke-width="4"/><circle r="6" fill="#d9a514"/></svg>`;
  },
  _p_wheel() {
    if (this._spin && this.sig.wheel) return this.sig.wheel;              // während der Drehung nichts neu zeichnen
    const app = this.app, m = app.meta, today = app.today(), chal = m.inChallenge(), can = !chal && m.canSpin(today), r = this._wheelRes;
    return `<div class="wheelbox">
        <div class="wheel-wrap"><div class="wheel-ptr"></div><div class="wheel" style="transform:rotate(${(this._wheelRot || 0).toFixed(1)}deg)">${this._wheelSvg()}</div></div>
        <div class="wside">
          ${r ? `<div class="wres panel"><span class="big">${WHEEL_ICON[r.kind]}</span><b>${esc(t('wheel.seg.' + r.kind))}</b><p>${esc(t('wheel.got.' + r.kind, { ...r.reward }))}</p></div>` : ''}
          <button class="btn main big spin" data-act="spin" ${can && !this._spin ? '' : 'disabled'}>🎡 ${esc(can ? t('wheel.spin') : t('ui.spinTomorrow'))}</button>
          <p class="note">${esc(chal ? t('wheel.chalOff') : can ? t('wheel.note') : t('wheel.done') + ' ' + t('ui.nextSpin', { secs: secsToMidnight() }))}</p>
          <div class="wleg">${WHEEL.map(w => `<span class="tag">${WHEEL_ICON[w.id]} ${esc(t('wheel.seg.' + w.id))}</span>`).join('')}</div>
        </div></div>`;
  },
  spinWheel() {
    const app = this.app, m = app.meta, today = app.today();
    if (this._spin || !m.canSpin(today)) return null;
    this._wheelRes = null;
    const r = m.spin(today); if (!r) return null;
    const n = WHEEL.length, seg = 360 / n, cur = this._wheelRot || 0, base = (((-r.seg * seg - cur) % 360) + 360) % 360, jit = (Math.random() - .5) * seg * .55;
    const target = cur + 5 * 360 + base + jit, secs = 4.2;
    this._spin = r; this._wheelRot = target;
    const w = this.el.sheet.querySelector('.wheel'), btn = this.el.sheet.querySelector('[data-act="spin"]');
    if (btn) btn.disabled = true;
    if (w) { w.style.transition = `transform ${secs}s cubic-bezier(.12,.6,.18,1)`; void w.offsetWidth; w.style.transform = `rotate(${target}deg)`; }
    app.sound?.wheelSpin(secs, { segs: n, turns: 5 });
    clearTimeout(this._spinT); this._spinT = setTimeout(() => this._spinDone(), secs * 1000 + 150);
    return r;
  },
  _spinDone() {
    const r = this._spin, app = this.app; this._spin = null; if (!r) return;
    this._wheelRes = r; this.sig.wheel = null;
    app.view.fx.wheelConfetti(app.focusPoint(.4), { big: r.kind === 'jackpot' || r.kind === 'geldgross' });
    this.toast(WHEEL_ICON[r.kind] + ' ' + t('wheel.got.' + r.kind, { ...r.reward }), 'gold');
    if (this.panel === 'wheel') { this.renderPanel(true); const w = this.el.sheet.querySelector('.wheel'); if (w) { w.style.transition = 'none'; w.classList.add('won'); } }
  },

  // ===================================================================================== Tagesserie
  _streakRow(si) {
    const cur = si.can ? si.next : si.day;
    return `<div class="streak">${STREAK.map((k, i) => {
      const d = i + 1, done = si.can ? d < cur && !si.willBreak : d <= cur, today = d === cur;
      return `<div class="sd ${done ? 'done' : ''} ${today ? 'today' : ''} ${today && !si.can ? 'got' : ''} ${d === 7 ? 'big' : ''}"><small>${esc(t('streak.day', { n: d }))}</small><span class="si">${STREAK_ICON[k]}</span><b>${esc(t('streak.reward.' + k))}</b>${done && !today ? '<i class="ck">✓</i>' : today && !si.can ? '<i class="ck">✓</i>' : ''}</div>`;
    }).join('')}</div>`;
  },
  _p_streak() {
    const app = this.app, m = app.meta, si = m.streakInfo(app.today()), chal = m.inChallenge();
    return `${chal ? `<p class="note warn">${esc(t('wheel.chalOff'))}</p>` : ''}<p class="note">${esc(t('streak.note'))}</p>${this._streakRow(si)}
      ${si.willBreak && si.can ? `<p class="warn">💔 ${esc(t('streak.broken'))}</p>` : ''}
      <div class="kvs"><div class="kv"><span>${esc(t('ui.streakNow'))}</span><b>🔥 ${esc(t('streak.len', { n: si.can ? (si.willBreak ? 0 : si.len) : si.len }))}</b></div><div class="kv"><span>${esc(t('chal.best'))}</span><b>${esc(t('streak.best', { n: si.best }))}</b></div></div>
      <div class="row end">${si.can && !chal ? `<button class="btn main big" data-act="checkin">🎁 ${esc(t('streak.claim'))}: ${esc(t('streak.reward.' + STREAK[si.next - 1]))}</button>` : `<span class="tag ok">✓ ${esc(t('streak.done'))}</span>`}</div>`;
  },
  checkInModal() {
    const app = this.app, si = app.meta.streakInfo(app.today()); if (!si.can) return;
    app.sound?.play('streak', { gain: .6 });
    this.modal({ title: '📅 ' + t('streak.title'), cls: 'checkin', html: `<p>${esc(t('ui.checkInText', { n: si.next }))}</p>${this._streakRow(si)}${si.willBreak ? `<p class="warn">💔 ${esc(t('streak.broken'))}</p>` : ''}`,
      buttons: [{ label: t('ui.later'), value: false, cls: 'ghost' }, { label: '🎁 ' + t('streak.claim'), value: true, cls: 'main' }] })
      .then(v => { if (v) this.doCheckIn(); });
  },
  doCheckIn() { const app = this.app, r = app.meta.checkIn(app.today()); if (this.panel === 'streak' || this.panel === 'menu') this.renderPanel(true); return r; },

  // ===================================================================================== Durchbruch / Start
  breakthroughCard(ev) {
    const o = this.el.overlay;
    o.innerHTML = `<div class="rcard panel bt" data-act="overlay-close"><div class="rays"></div><div class="kick">💡 ${esc(t('bt.title'))}</div><h2>${esc(name('research', ev.id))}</h2>
      <div class="bti">${{ refund: '💰', gutschein: '🎟️', kiste: '🎁', rp: '🧪' }[ev.kind] || '✨'}</div><p>${esc(t(ev.key, ev))}</p><button class="btn main">${esc(t('ui.great'))}</button></div>`;
    o.classList.add('on'); clearTimeout(this._ovT); this._ovT = setTimeout(() => { if (o.querySelector('.rcard.bt')) { o.innerHTML = ''; o.classList.remove('on'); } }, 6000);
  },
  launchCard() {
    const o = this.el.overlay;
    o.innerHTML = `<div class="rcard panel launch" data-act="overlay-close"><div class="rays"></div><div class="kick">🚀 ${esc(t('ui.liftoff'))}</div><h2>${esc(name('title', 'tycoon'))}</h2><p>${esc(t('event.launch'))}</p><button class="btn main">${esc(t('ui.great'))}</button></div>`;
    o.classList.add('on'); clearTimeout(this._ovT); this._ovT = setTimeout(() => { if (o.querySelector('.rcard.launch')) { o.innerHTML = ''; o.classList.remove('on'); } }, 9000);
  },

  // ===================================================================================== Album
  _p_album() {
    const al = this.app.meta.album(), pages = al.pages; if (!pages.length) return '';
    if (!pages.some(p => p.tier === this.albumPage)) this.albumPage = pages[0].tier;
    const pg = pages.find(p => p.tier === this.albumPage), have = p => p.items.reduce((s, i) => s + CARDS.filter(c => i.cards[c]).length, 0);
    const card = (it, c) => it.cards[c]
      ? `<span class="acard v-${c}" title="${esc(t('album.card.' + c))}">${this.iIcon(it.item, c === 'gold', 'sm')}<i>${CARD_ICON[c]}</i></span>`
      : `<span class="acard miss" title="${esc(t('album.hint.' + c, { n: it.mega }))}">${esc(t('album.unknown'))}</span>`;
    return `<p class="note">${esc(t('album.note'))}</p>
      <div class="bar big gold"><i style="width:${(al.progress * 100).toFixed(1)}%"></i><span>${esc(t('album.progress', { have: al.have, total: al.total }))}</span></div>
      <div class="seg wrap apages">${pages.map(p => `<button class="${p.tier === pg.tier ? 'on' : ''}" data-act="album-page" data-t="${p.tier}">${esc(t('album.page', { tier: p.tier }))}${p.full ? ' ✓' : ''}</button>`).join('')}</div>
      <div class="apage"><div class="aph"><b>${esc(t('album.page', { tier: pg.tier }))}</b><small>${have(pg)} / ${pg.items.length * 4}</small>${pg.claimed ? `<span class="tag ok">✓ ${esc(t('ui.albumClaimed'))}</span>` : `<span class="tag gold">🎁 ${esc(t('ui.albumReward'))}</span>`}</div>
      <div class="agrid">${pg.items.map(it => {
        const known = CARDS.some(c => it.cards[c]);
        return `<div class="aitem ${known ? '' : 'unk'}"><div class="ain">${known ? this.iIcon(it.item, false, '') : '<span class="q">?</span>'}<b>${esc(known ? name('item', it.item) : t('album.unknown'))}</b><small>${fmtNum(it.made)} / ${fmtNum(it.mega)}</small></div><div class="acs">${CARDS.map(c => card(it, c)).join('')}</div></div>`;
      }).join('')}</div></div>
      ${al.full ? `<p class="note">🏆 ${esc(t('album.full', { title: al.title }))}</p>` : ''}`;
  },

  // ===================================================================================== Weltwunder
  _p_wonder() {
    const sim = this.sim, w = sim.wonder(), unlocked = sim.S.total.prestiges >= (BUILDINGS.wunder.prestige || 1);
    const e = sim.S.ents.find(q => q.type === 'wunder');
    const head = !unlocked ? `<div class="emptybox"><span class="big">🚀</span><p>${esc(t('ui.wonderLocked'))}</p></div>`
      : `<p class="note">${esc(desc('building', 'wunder'))}</p><div class="row">${e ? `<button class="btn" data-act="wonder-fly">👁 ${esc(t('ui.wonderShow'))}</button>` : `<button class="btn main" data-act="wonder-place">📍 ${esc(t('ui.wonderPlace'))} ${this.coin(sim.costOf('wunder'))}</button>`}<span class="grow"></span>${w.done ? `<span class="tag ok">✓ ${esc(t('state.done'))}</span>` : `<span class="tag gold">${esc(t('ui.wonderStage', { n: w.stage, total: w.stages }))}</span>`}</div>`;
    const stages = WONDER.map((st, i) => {
      const k = i + 1, done = w.done || k < w.stage, cur = !w.done && k === w.stage;
      const need = Object.keys(st.need).map(it => { const h = done ? st.need[it] : cur ? Math.min(st.need[it], w.have[it] || 0) : 0;
        return `<div class="need">${this.iIcon(it, false, 'sm')}<span>${esc(name('item', it))}</span><div class="bar thin ${done ? 'green' : ''}"><i style="width:${pct(h / st.need[it])}%"></i></div><b>${fmtNum(h)} / ${fmtNum(st.need[it])}</b></div>`; }).join('');
      return `<div class="wst ${done ? 'done' : cur ? 'cur' : 'lock'}"><div class="wsh"><span class="wn">${k}</span><b>${esc(t('wonder.' + k + '.name'))}</b>${done ? '<span class="tag ok">✓</span>' : cur ? `<span class="tag gold">${esc(t('ui.wonderNow'))}</span>` : '<span class="tag">🔒</span>'}</div>
        <p>🎁 ${esc(t('wonder.' + k + '.desc'))}</p>${need}</div>`;
    }).join('');
    return head + `<h3>${esc(t('ui.wonderStages'))}</h3><div class="wsts">${stages}</div>`;
  },

  // ===================================================================================== Wochen-Herausforderung
  _p_challenge() {
    const app = this.app, week = app.week(), sp = challengeSpec(week), inChal = app.inChallenge(), mc = inChal ? app.meta.challenge() : null;
    const cur = app.chalInfo(), same = cur && cur.chal.week === week, scores = storage.chalScores(week), best = scores.length ? scores[0].score : null;
    const fr = this._chalFriend;
    let h = `<div class="chal panel2"><div class="chh"><span class="big">🏁</span><div><b>${esc(t('chal.week', { week }))}</b><small>${esc(name('biome', sp.biome))} · ${esc(fmtTime(sp.secs))} · ${esc(t('chal.startMoney', { n: sp.startMoney }))}</small></div></div>
      <p>${esc(t('chal.desc', { secs: sp.secs }))}</p>`;
    if (inChal && mc) {
      h += `<div class="kvs"><div class="kv"><span>${esc(t('ui.chalScore'))}</span><b>${this.coin(mc.score)}</b></div><div class="kv"><span>⏱</span><b>${mc.done ? esc(t('chal.over')) : esc(t('chal.left', { secs: mc.left }))}</b></div></div>
        <div class="row"><button class="btn wood" data-act="chal-leave">🏭 ${esc(t('ui.backHome'))}</button>${mc.done ? `<button class="btn main" data-act="chal-start" data-fresh="1">↺ ${esc(t('ui.chalAgain'))}</button>` : ''}</div>`;
    } else {
      const cont = same && !cur.chal.done;
      h += `<div class="row">${cont ? `<button class="btn main big" data-act="chal-start">▶ ${esc(t('chal.continue'))}<small>${esc(t('chal.left', { secs: cur.chal.left }))}</small></button><button class="btn" data-act="chal-start" data-fresh="1">↺ ${esc(t('ui.chalAgain'))}</button>`
        : `<button class="btn main big" data-act="chal-start" data-fresh="1">🏁 ${esc(same && cur.chal.done ? t('ui.chalAgain') : t('chal.start'))}</button>`}</div>
        <p class="note">${esc(t('ui.chalKeep'))}</p>`;
    }
    h += `</div><h3>${esc(t('chal.board'))}</h3>`;
    h += scores.length ? `<ol class="board">${scores.slice(0, 5).map((s, i) => `<li class="${i === 0 ? 'top' : ''}"><span>${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1 + '.'}</span><b>${this.coin(s.score)}</b><small>${esc(dateStr(s.at))}</small></li>`).join('')}</ol>` : `<p class="empty">${esc(t('ui.chalNoScore'))}</p>`;
    if (best !== null) { const code = resultCode(week, best); h += `<div class="code"><span>${esc(t('ui.chalYourCode'))}</span><code>${esc(code)}</code><button class="btn small" data-act="chal-copy" data-code="${esc(code)}">📋 ${esc(t('chal.copy'))}</button></div>`; }
    h += `<h3>${esc(t('chal.enterCode'))}</h3><div class="row"><input class="inp chalcode" data-enter="chal-check" placeholder="COG-${esc(week)}-…" value="${esc(this._chalFriendIn || '')}" aria-label="${esc(t('chal.enterCode'))}" autocomplete="off" spellcheck="false"><button class="btn" data-act="chal-check">✔ ${esc(t('ui.check'))}</button></div>`;
    if (fr) h += fr.bad ? `<p class="warn">${esc(t('chal.codeBad'))}</p>`
      : `<div class="cmp"><p class="ok">✅ ${esc(t('chal.codeOk', fr))}</p>${best !== null && fr.week === week ? `<p><b>${esc(best >= fr.score ? t('ui.chalAhead', { n: best - fr.score }) : t('ui.chalBehind', { n: fr.score - best }))}</b></p>` : fr.week !== week ? `<p class="mute">${esc(t('ui.chalOtherWeek'))}</p>` : ''}</div>`;
    return h;
  },
  chalEndModal(ev) {
    const app = this.app, list = storage.chalAdd(ev.week, ev.score), rank = list.findIndex(s => s.score === Math.floor(ev.score)) + 1;
    app.sound?.play('win'); app.view.fx.wheelConfetti(app.focusPoint(.4), { big: true });
    app.autosave();
    this.modal({ title: '🏁 ' + t('chal.title'), cls: 'chalend', html: `<div class="off"><span class="big">🏆</span><p>${esc(t('chal.end', ev))}</p><b class="amt">${fmtNum(ev.score)}</b>
        ${rank ? `<p class="mute">${esc(t('ui.chalRank', { n: rank }))}</p>` : ''}</div>
        <div class="code"><span>${esc(t('ui.chalYourCode'))}</span><code>${esc(ev.code)}</code><button class="btn small" data-act="chal-copy" data-code="${esc(ev.code)}">📋 ${esc(t('chal.copy'))}</button></div>`,
      buttons: [{ label: t('ui.chalStay'), value: false, cls: 'ghost' }, { label: '🏭 ' + t('ui.backHome'), value: true, cls: 'main' }] })
      .then(v => { if (v) app.leaveChallenge(); });
  },

  // ===================================================================================== Hinweise (einmal je Gerät)
  _hintSeen(id) { return (storage.getSetting('hints', []) || []).includes(id); },
  hint(id, now = false) {
    if (this._hintSeen(id) || this.hintNow === id) return;
    const sim = this.sim; if (!sim) return;
    if (this.hintNow || sim.S.tut <= TUTORIAL.length) { (this._hintQ ||= []).includes(id) || this._hintQ.push(id); if (!now) return; if (this.hintNow) return; if (sim.S.tut <= TUTORIAL.length) return; }
    this.hintNow = id; this.renderTut(true); this.app.sound?.play('levelup', { gain: .35 });
  },
  hintDone() {
    const id = this.hintNow; if (!id) return; const seen = storage.getSetting('hints', []) || [];
    if (!seen.includes(id)) storage.setSetting('hints', [...seen, id]);
    this.hintNow = null; this._hintQ = (this._hintQ || []).filter(h => h !== id); this.renderTut(true);
  },
};
