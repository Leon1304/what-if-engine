// Cogtopia – Oberfläche: Startmenü, HUD, Bauleiste, Info-Panel, alle Panels (Forschung, Aufträge, Rezeptbuch, Statistik,
// Erfolge, Land, Kisten, Neue Fabrik, Einstellungen, Spielstände), Anleitung, Sprechblasen, Toasts und eigene Dialoge.
// Ausbau 2 in ui/meta.js (Glücksrad, Serie, Ereignisse, Album, Ziele, Wunder, Wochen-Herausforderung, Hinweise) und
// ui/tools.js (Menü, Blaupausen, Überlagerungen, Fotomodus, Zeitraffer) – beide als Mixins auf UI.prototype.
// Alle Texte über i18n (t/name/desc), Zahlen über fmtNum. Klicks per Delegation (data-act), damit Neuzeichnen nichts kaputt macht.
import { t, name, desc, fmtNum, fmtTime, getLang, setLang, onLang, LANGS } from './i18n.js';
import { BUILDINGS, ITEMS, ITEM_IDS, RESEARCH, PATENTS, BIOMES, ACHIEVEMENTS, COLORS, TITLES, TUTORIAL, RECIPES, RAW } from './data.js';
import { PRESTIGE_AT, XP_LV, PLOTS, PLOT, START_PLOT, TAKT_TIME } from './sim.js';
import * as storage from './storage.js';
import { esc, $, clamp, fmtRate, ROMAN, pct, clock, PANEL_ICON, SIDE, MENU } from './ui/common.js';
export { PANEL_ICON, SIDE, MENU };
import { MetaUI } from './ui/meta.js';
import { ToolsUI } from './ui/tools.js';

export const CATS = [
  ['logistics', ['band', 'tunnel', 'verteiler', 'sortierer', 'lager', 'drohnenhafen']],
  ['mining', ['bohrer']],
  ['processing', ['ofen', 'presse', 'drahtzug', 'raffinerie', 'montage']],
  ['power', ['kraftwerk', 'solar', 'mast', 'heizer']],
  ['special', ['verkauf', 'labor', 'experiment', 'wunder']],
];
export const HOTKEYS = ['band', 'bohrer', 'ofen', 'verkauf', 'presse', 'drahtzug', 'montage', 'labor', 'verteiler'];
export const EMO = { band: '➡️', tunnel: '🕳️', verteiler: '🔀', sortierer: '🔃', bohrer: '⛏️', grossbohrer: '⛏️', ofen: '🔥', presse: '🔨', drahtzug: '🧵', montage: '🦾',
  raffinerie: '🛢️', experiment: '🧪', labor: '🔬', verkauf: '💰', lager: '📦', kraftwerk: '🏭', solar: '☀️', mast: '🗼', heizer: '♨️', drohnenhafen: '🚁', wunder: '🚀' };
export const PANELS = Object.entries(PANEL_ICON);
const FLAGS = { en: '🇬🇧', de: '🇩🇪' };
// Taste für Rückgängig: auf dem Mac ⌘Z (main.js nimmt Strg und ⌘), sonst Strg Z / Ctrl Z
const IS_MAC = (() => { try { const n = globalThis.navigator || {}; return /Mac|iPhone|iPad|iPod/i.test(n.userAgentData?.platform || n.platform || ''); } catch { return false; } })();
export const undoKey = () => t(IS_MAC ? 'ui.undoKeyMac' : 'ui.undoKey');
const STATE_CLS = { work: 'ok', wait: 'warn', full: 'bad', norecipe: 'warn', nodeposit: 'bad', idle: 'mute', nopower: 'bad', nofuel: 'bad', nolink: 'warn', done: 'ok' };

export class UI {
  constructor(app) {
    this.app = app; this.root = document.getElementById('ui');
    this.icons = { building: {}, item: {}, gold: {} };
    this.mode = 'boot'; this.panel = null; this.selId = 0; this.shown = 0; this.rpShown = 0; this.tick = 0; this.sig = {};
    this.bubbles = []; this.prestigeBiome = 'wiese'; this.ptrDown = false; this.lastToast = {};
    this.root.innerHTML = this._skeleton();
    this.el = {
      hud: $('.hud', this.root), money: $('.hud .money b', this.root), income: $('.hud .money small', this.root), rp: $('.hud .rp b', this.root),
      boosts: $('.hud .boosts', this.root), side: $('.side', this.root), bar: $('.buildbar', this.root), toolbar: $('.toolbar', this.root),
      info: $('.info', this.root), sheet: $('.sheet', this.root), toasts: $('.toasts', this.root), tut: $('.tut', this.root), anchors: $('.anchors', this.root),
      menu: $('.menu', this.root), modals: $('.modals', this.root), overlay: $('.overlay', this.root), ctip: $('.ctip', this.root), btip: $('.btip', this.root),
      title: $('.hud .ttl', this.root), topc: $('.topc', this.root), goal: $('.topc .goal', this.root), evbar: $('.topc .evbar', this.root),
      ovl: $('.ovl', this.root), photo: $('.photo', this.root), media: $('.media', this.root),
    };
    this.root.addEventListener('click', e => {
      if (e.target === this.el.sheet) { this.closePanel(); return; }
      const el = e.target.closest('[data-act]'); if (!el || el.disabled || el.classList.contains('dis')) return;
      this.app.sound?.unlock(); this.act(el.dataset.act, el.dataset, el, e);
    });
    this.root.addEventListener('input', e => { const el = e.target.closest('[data-set]'); if (el) this._setting(el.dataset.set, el.type === 'checkbox' ? el.checked : el.value, true); });
    this.root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input[data-enter]')) { e.preventDefault(); this.act(e.target.dataset.enter, e.target.dataset, e.target); } });
    this.root.addEventListener('change', e => { const el = e.target.closest('[data-set]'); if (el) this._setting(el.dataset.set, el.type === 'checkbox' ? el.checked : el.value, false); });
    this.root.addEventListener('pointerdown', () => { this.ptrDown = true; }, true);
    addEventListener('pointerup', () => { this.ptrDown = false; }, true);
    this.el.bar.addEventListener('mouseover', e => { const b = e.target.closest('.bb'); if (b) this._btip(b); });
    this.el.bar.addEventListener('mouseout', e => { const b = e.target.closest('.bb'); if (b && !b.contains(e.relatedTarget)) this.el.btip.classList.remove('on'); });
    this.el.side.addEventListener('mouseover', e => { const b = e.target.closest('[data-p]'); if (b) this._stip(b); });
    this.el.side.addEventListener('mouseout', e => { const b = e.target.closest('[data-p]'); if (b && !b.contains(e.relatedTarget)) this.el.btip.classList.remove('on'); });
    this.file = document.createElement('input'); this.file.type = 'file'; this.file.accept = '.json,application/json'; this.file.style.display = 'none';
    this.file.addEventListener('change', () => this._importFile()); document.body.appendChild(this.file);
    onLang(() => this.relang());
    this.relang();
  }
  get sim() { return this.app.sim; }

  // =====================================================================================================
  // Grundgerüst
  // =====================================================================================================
  _skeleton() {
    return `
<div class="hud live">
  <div class="chip money" data-act="panel" data-p="stats"><i class="coin"></i><span><b>0</b><small></small></span></div>
  <div class="chip rp" data-act="panel" data-p="research"><i class="flask">🧪</i><span><b>0</b><small data-t="ui.rpShort"></small></span></div>
  <div class="boosts"></div>
  <div class="ttl"></div>
</div>
<div class="side live"></div>
<div class="toolbar live"></div>
<div class="buildbar live"></div>
<div class="info live"></div>
<div class="tut live"></div>
<div class="anchors"></div>
<div class="toasts"></div>
<div class="ctip"></div>
<div class="btip"></div>
<div class="topc live"><div class="goal"></div><div class="evbar"></div></div>
<div class="ovl live"></div>
<div class="sheet live"></div>
<div class="photo live"></div>
<div class="media live"></div>
<div class="menu live"></div>
<div class="overlay live"></div>
<div class="modals live"></div>`;
  }
  relang() {
    document.documentElement.lang = getLang();
    document.title = t('game.title');
    for (const el of this.root.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
    this._side(); this._bar(); this.sig = {};
    if (this.mode === 'menu') this.showMenu();
    if (this.panel) this.renderPanel(true);
    this.renderInfo(true); this.renderTut(true); this._tool(this.app.tool);
    this.app.view?.relabel();
  }
  setIcons(ic) { this.icons = ic; this._bar(); this.sig = {}; if (this.panel) this.renderPanel(true); this.renderInfo(true); if (this.mode === 'menu') this.showMenu(); }
  bIcon(type, cls = '') { const u = this.icons.building[type]; return u ? `<img class="bi ${cls}" src="${u}" alt="">` : `<span class="emo ${cls}">${EMO[type] || '🏭'}</span>`; }
  iIcon(id, gold = false, cls = '') {
    const u = (gold && this.icons.gold[id]) || this.icons.item[id];
    if (u) return `<img class="ii ${gold ? 'g' : ''} ${cls}" src="${u}" alt="" title="${esc(name('item', id))}">`;
    return `<span class="dot ${cls}" style="background:${ITEMS[id]?.color || '#999'}" title="${esc(name('item', id))}"></span>`;
  }
  coin(n) { return `<span class="cn"><i class="coin"></i>${fmtNum(n)}</span>`; }

  // =====================================================================================================
  // Modus
  // =====================================================================================================
  setMode(m) {
    this.mode = m; this.root.classList.remove('mode-boot', 'mode-menu', 'mode-play'); this.root.classList.add('mode-' + m);
    if (m === 'menu') { this.closePanel(); this.select(0); this.showMenu(); } else this.el.menu.innerHTML = '';
    if (m === 'play') { this.shown = this.sim.S.money; this.rpShown = this.sim.S.rp; this.sig = {}; this.hintNow = null; this._bar(); this.renderTut(true); this.renderOverlay(true); this._goalSig = this._evSig = null; }
    else { this.el.goal.innerHTML = ''; this.el.evbar.innerHTML = ''; this.el.ovl.innerHTML = ''; this.el.ovl.classList.remove('on'); }
  }
  showMenu() {
    const a = storage.info(storage.AUTO), lang = getLang(), other = Object.keys(LANGS).find(l => l !== lang);
    const cont = a && !a.empty && !a.broken;
    this.el.menu.innerHTML = `
<div class="mwrap">
  <div class="logo"><span class="cog">⚙</span><h1>${esc(t('game.title'))}</h1></div>
  <p class="tag">${esc(t('game.tagline'))}</p>
  <div class="mbtns">
    ${cont ? `<button class="btn main big" data-act="continue"><span>▶ ${esc(t('ui.continue'))}</span><small>${esc(this._slotLine(a))}</small></button>` : ''}
    <button class="btn ${cont ? 'wood' : 'main big'}" data-act="new">✚ ${esc(t('ui.newFactory'))}</button>
    <button class="btn" data-act="panel" data-p="challenge">🏁 ${esc(t('chal.title'))}</button>
    <button class="btn" data-act="loadmenu">📂 ${esc(t('ui.load'))}</button>
    <button class="btn" data-act="panel" data-p="settings">⚙️ ${esc(t('ui.settings'))}</button>
  </div>
</div>
<button class="btn langbtn" data-act="lang" data-l="${other}" title="${esc(t('ui.language'))}"><span class="flag">${FLAGS[lang]}</span>${esc(LANGS[lang])}<small>→ ${esc(LANGS[other])}</small></button>
<div class="mfoot">💡 ${esc(t('ui.tip.' + (this._tipN ??= Math.floor(Math.random() * 5))))}</div>`;
  }
  _slotLine(a) {
    if (!a || a.empty) return t('ui.empty');
    if (a.broken) return t('ui.broken');
    const d = a.savedAt ? new Date(a.savedAt) : null;
    const when = d ? d.toLocaleString(getLang() === 'de' ? 'de-DE' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
    return t('ui.slotLine', { when, money: fmtNum(a.money), n: a.buildings, biome: name('biome', a.biome) });
  }

  // =====================================================================================================
  // Seitenknöpfe, Bauleiste, Werkzeugzeile
  // =====================================================================================================
  _side() {
    this.el.side.innerHTML = SIDE.map(p => `<button class="btn icon sb" data-act="panel" data-p="${p}" aria-label="${esc(t('ui.p.' + p))}"><span>${PANEL_ICON[p]}</span>${p === 'crates' || p === 'menu' ? '<i class="badge"></i>' : ''}</button>`).join('');
  }
  _bar() {
    const sim = this.sim, tool = this.app.tool;
    const hk = b => { const i = HOTKEYS.indexOf(b); return i >= 0 ? `<kbd>${i + 1}</kbd>` : ''; };
    const ov = this.app.ov || {}, pw = !sim || sim.S.research.includes('strom') || BIOMES[sim.S.biome]?.allPower;
    let h = `<div class="grp tools"><div class="gl">${esc(t('ui.cat.tools'))}</div><div class="gb">
      <button class="bb tool ${tool === 'remove' ? 'sel' : ''}" data-act="tool" data-b="remove" data-tip="remove"><span class="im"><span class="emo">🧨</span></span><span class="c">${esc(t('ui.remove'))}</span><kbd>X</kbd></button>
      <button class="bb tool" data-act="undo" data-tip="undo"><span class="im"><span class="emo">↶</span></span><span class="c">${esc(t('ui.undo'))}</span><kbd>${esc(undoKey())}</kbd></button>
      <button class="bb tool ${tool === 'bp' ? 'sel' : ''}" data-act="tool" data-b="bp" data-tip="bp"><span class="im"><span class="emo">📐</span></span><span class="c">${esc(t('ui.bp'))}</span><kbd>B</kbd></button>
      ${pw ? `<button class="bb tool ov ${ov.power ? 'sel' : ''}" data-act="overlay" data-k="power" data-tip="ovPower"><span class="im"><span class="emo">⚡</span></span><span class="c">${esc(t('ui.ovPowerShort'))}</span><kbd>P</kbd></button>` : ''}
      <button class="bb tool ov ${ov.issues ? 'sel' : ''}" data-act="overlay" data-k="issues" data-tip="ovIssues"><span class="im"><span class="emo">🩺</span></span><span class="c">${esc(t('ui.ovIssuesShort'))}</span><kbd>I</kbd></button></div></div>`;
    for (const [cat, list0] of CATS) {
      const list = list0.filter(b => this._shown(b)); if (!list.length) continue;
      h += `<div class="grp"><div class="gl">${esc(t('ui.cat.' + cat))}</div><div class="gb">`;
      for (const b of list) {
        const un = this._usable(b);
        h += `<button class="bb ${un ? '' : 'locked'} ${tool === b ? 'sel' : ''}" data-act="tool" data-b="${b}"><span class="im">${this.bIcon(b)}</span><span class="c">${un ? this.coin(sim ? sim.costOf(b) : BUILDINGS[b].cost) : '🔒'}</span>${hk(b)}</button>`;
      }
      h += '</div></div>';
    }
    this.el.bar.innerHTML = h; this._barSig = '';
  }
  // Gebäude in der Bauleiste zeigen? Freigeschaltet oder die Forschung dafür ist gerade kaufbar (Vorschau); Wunder erst nach dem ersten Prestige
  _shown(b) {
    const sim = this.sim, d = BUILDINGS[b]; if (!d) return false;
    if (!sim) return d.unlock === 'start' && !d.prestige;
    if (d.prestige && sim.S.total.prestiges < d.prestige) return false;
    if (sim.isUnlocked(b)) return true;
    const r = RESEARCH[d.unlock]; return !!r && r.req.every(q => sim.S.research.includes(q));
  }
  _usable(b) { const sim = this.sim, d = BUILDINGS[b]; if (!sim) return d.unlock === 'start'; return sim.isUnlocked(b) && !(d.prestige && sim.S.total.prestiges < d.prestige) && !(d.unique && (sim.count[b] || 0) > 0); }
  // günstige Aktualisierung (Kosten, leistbar, gesperrt)
  _barUpdate() {
    const sim = this.sim; if (!sim) return;
    const undo = this.el.bar.querySelector('[data-b="undo"], [data-act="undo"]'), canU = sim.canUndo ? !!sim.canUndo() : true;
    if (undo && undo.classList.contains('dis') === canU) undo.classList.toggle('dis', !canU);
    let sig = sim.S.research.length + '/' + (sim.count.wunder || 0) + ':' + this.app.tool + ':';
    const st = [];
    for (const [, list] of CATS) for (const b of list) { const un = this._usable(b), c = sim.costOf(b); st.push([b, un, c, un && sim.S.money >= c]); sig += (un ? 1 : 0) + ',' + c + ',' + (sim.S.money >= c ? 1 : 0) + ';'; }
    if (sig === this._barSig) return;
    const relock = this._barSig && this._barSig.split(':')[0] !== sig.split(':')[0];
    this._barSig = sig;
    if (relock) { this._bar(); this._barSig = sig; }
    for (const [b, un, c, can] of st) {
      const el = this.el.bar.querySelector(`[data-b="${b}"]`); if (!el) continue;
      el.classList.toggle('locked', !un); el.classList.toggle('poor', un && !can); el.classList.toggle('sel', this.app.tool === b);
      const ce = el.querySelector('.c'); const html = un ? this.coin(c) : '🔒'; if (ce.innerHTML !== html) ce.innerHTML = html;
    }
    this.el.bar.querySelector('[data-b="remove"]')?.classList.toggle('sel', this.app.tool === 'remove');
    this.el.bar.querySelector('[data-b="bp"]')?.classList.toggle('sel', this.app.tool === 'bp');
    for (const k of ['power', 'issues']) this.el.bar.querySelector(`[data-k="${k}"]`)?.classList.toggle('sel', !!this.app.ov?.[k]);
  }
  _btip(b) {
    const ty = b.dataset.b || b.dataset.tip, sim = this.sim; if (!ty) return;
    let h;
    if (ty === 'remove') h = `<b>${esc(t('ui.remove'))} <kbd>X</kbd></b><p>${esc(t('ui.hint.remove'))}</p>`;
    else if (ty === 'undo') h = `<b>${esc(t('ui.undo'))} <kbd>${esc(undoKey())}</kbd></b><p>${esc(t('ui.hint.undo'))}</p>`;
    else if (ty === 'bp') h = `<b>${esc(t('ui.bp'))} <kbd>B</kbd></b><p>${esc(t('ui.hint.bp'))}</p>`;
    else if (ty === 'ovPower') h = `<b>${esc(t('ui.ovPower'))} <kbd>P</kbd></b><p>${esc(t('ui.hint.ovPower'))}</p>`;
    else if (ty === 'ovIssues') h = `<b>${esc(t('ui.ovIssues'))} <kbd>I</kbd></b><p>${esc(t('ui.hint.ovIssues'))}</p>`;
    else {
      const d = BUILDINGS[ty], un = !sim || this._usable(ty), i = HOTKEYS.indexOf(ty);
      h = `<b>${esc(name('building', ty))}${i >= 0 ? ` <kbd>${i + 1}</kbd>` : ''}</b><p>${esc(desc('building', ty))}</p>
        <div class="ln"><span>${esc(t('ui.size'))}</span><span>${d.w}×${d.h}</span></div>
        <div class="ln"><span>${esc(t('ui.cost'))}</span>${this.coin(sim ? sim.costOf(ty) : d.cost)}</div>
        ${un ? '' : `<div class="lock">🔒 ${esc(d.prestige && sim && sim.S.total.prestiges < d.prestige ? t('reason.prestige') : d.unique && sim && sim.count[ty] ? t('reason.unique') : t('ui.needsResearch', { id: d.unlock }))}</div>`}`;
    }
    const tip = this.el.btip; tip.innerHTML = h; tip.classList.add('on');
    const r = b.getBoundingClientRect(), w = tip.offsetWidth;
    tip.style.left = clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8) + 'px'; tip.style.top = (r.top - tip.offsetHeight - 10) + 'px';
  }
  _stip(b) {
    const tip = this.el.btip; tip.innerHTML = `<b>${esc(t('ui.p.' + b.dataset.p))}</b>`; tip.classList.add('on');
    const r = b.getBoundingClientRect(), w = tip.offsetWidth; tip.style.left = (r.left - w - 10) + 'px'; tip.style.top = (r.top + r.height / 2 - tip.offsetHeight / 2) + 'px';
  }
  // Werkzeugzeile über der Bauleiste
  _tool(tool) {
    const el = this.el.toolbar;
    if ((!tool && !this.app.linkFrom) || this.mode !== 'play' || this.app.photoOn) { el.classList.remove('on'); el.innerHTML = ''; this._barSig = ''; return; }
    el.innerHTML = this._toolbarHtml(tool); el.classList.add('on'); this._barSig = '';
  }
  setTool(tool) { this._tool(tool); this._barUpdate(); this.el.btip.classList.remove('on'); }
  // Hinweis am Mauszeiger (Kosten oder Grund)
  cursorTip(x, y, html, ok = true) {
    const el = this.el.ctip; if (!html) { el.classList.remove('on'); return; }
    if (el._h !== html) { el.innerHTML = html; el._h = html; }
    el.classList.add('on'); el.classList.toggle('bad', !ok); el.style.transform = `translate(${Math.round(x + 18)}px, ${Math.round(y + 14)}px)`;
  }

  // =====================================================================================================
  // Klicks
  // =====================================================================================================
  async act(a, d, el) {
    const app = this.app, sim = this.sim;
    switch (a) {
      case 'panel': this.openPanel(d.p === this.panel ? null : d.p); break;
      case 'close': this.closePanel(); break;
      case 'tool': {
        if (d.b !== 'remove' && sim && !sim.isUnlocked(d.b)) { this.toast('🔒 ' + t('ui.needsResearch', { id: BUILDINGS[d.b].unlock }), 'err'); this.app.sound?.play('error', { gain: .4 }); break; }
        app.setTool(app.tool === d.b ? null : d.b); break;
      }
      case 'undo': app.undo(); break;
      case 'rotate': app.rotateTool(); break;
      case 'cancelTool': app.setTool(null); break;
      case 'continue': app.continueGame(); break;
      case 'new': {
        const a0 = storage.info(storage.AUTO);
        if (a0 && !a0.empty && !a0.broken && !(await this.confirm(t('ui.newFactory'), t('ui.newConfirm'), t('ui.newFactory')))) break;
        app.newGame(); break;
      }
      case 'loadmenu': this.loadDialog(); break;
      case 'lang': setLang(d.l); this.app.sound?.play('click'); break;
      // Info-Panel
      case 'info-close': app.select(0); break;
      case 'recipe': if (sim.setRecipe(this.selId, d.r || null)) app.sound?.play('click'); this.renderInfo(true); break;
      case 'filter': if (sim.setFilter(this.selId, d.i || null)) app.sound?.play('click'); this.renderInfo(true); break;
      case 'rot-ent': sim.rotate(this.selId); app.sound?.play('rotate'); this.renderInfo(true); break;
      case 'del-ent': app.removeEntity(this.selId); break;
      case 'pip-ent': app.pipette(this.selId); break;
      // Panels
      case 'research': if (sim.buyResearch(d.id)) this.renderPanel(true); else app.sound?.play('error', { gain: .4 }); break;
      case 'claim': { const r = sim.claimContract(d.i === 'daily' ? 'daily' : +d.i); if (r) { this.renderPanel(true); this.app.view.fx.coins(this.app.focusPoint(1.2), 12, { text: '+' + fmtNum(r.money) }); } break; }
      case 'crate': this.openCrate(+d.i); break;
      case 'tip': { const r = sim.buyTip(); if (r) this.renderPanel(true); break; }
      case 'patent': if (sim.buyPatent(d.id)) this.renderPanel(true); break;
      case 'biome': this.prestigeBiome = d.id; this.renderPanel(true); break;
      case 'prestige': {
        if (!sim.canPrestige()) break;
        if (!(await this.confirm(t('ui.newFactory'), t('ui.prestigeConfirm', { n: sim.prestigePoints(), biome: this.prestigeBiome }), t('ui.prestigeGo')))) break;
        app.prestige(this.prestigeBiome); break;
      }
      case 'plot': app.askPlot(+d.cx, +d.cy); break;
      case 'fly': app.flyToPlot(+d.cx, +d.cy); this.closePanel(); break;
      case 'save': if (await this._overwrite(d.s)) { app.saveSlot(d.s); this.renderPanel(true); } break;
      case 'load': this.closeModals(); await app.loadSlot(d.s); break;
      case 'del-save': if (await this.confirm(t('ui.delete'), t('ui.deleteConfirm'), t('ui.delete'), 'danger')) { storage.remove(d.s); this.renderPanel(true); this.closeModals(); } break;
      case 'export': app.exportSave(); break;
      case 'import': this.file.value = ''; this.file.click(); break;
      case 'tomenu': if (await this.confirm(t('ui.mainMenu'), t('ui.toMenuConfirm'), t('ui.mainMenu'))) app.toMenu(); break;
      case 'color': if (sim.setColor(d.id)) { app.view.applyDeco(); this.renderPanel(true); app.sound?.play('click'); } break;
      case 'title': sim.setTitle(d.id || ''); this.renderPanel(true); break;
      case 'quality': case 'grid': case 'music': this._setting(a, d.v, false); break;
      case 'tut-skip': if (sim) sim.S.tut = TUTORIAL.length + 1; this.renderTut(true); break;
      case 'tut-ok': if (sim) sim.S.tut = TUTORIAL.length + 1; this.renderTut(true); break;
      case 'tut-restart': if (sim) sim.S.tut = 0; this.renderTut(true); this.closePanel(); break;
      case 'overlay-close': this.el.overlay.innerHTML = ''; this.el.overlay.classList.remove('on'); break;
      // Ausbau 2
      case 'overlay': app.setOverlay(d.k); break;
      case 'upgrade': {
        if (sim.upgrade(this.selId)) { this.renderInfo(true); break; }
        const c = sim.canUpgrade(this.selId); this.toast(c.reason === 'money' ? `${t('reason.money')} ${t('ui.needCoins', { cost: c.cost })}` : c.reason === 'research' ? '🔒 ' + t('ui.needsResearch', { id: c.need }) : t('reason.' + c.reason), 'err'); app.sound?.play('error', { gain: .4 }); break;
      }
      case 'link-start': app.startLink(this.selId); break;
      case 'link-clear': sim.link(this.selId, 0); this.renderInfo(true); app.sound?.play('click'); break;
      case 'link-cancel': app.cancelLink(); break;
      case 'fly-ent': app.flyToEntity(+d.id); if (this.panel) this.closePanel(); break;
      case 'autojoin': app.setAutoJoin(d.v === 'on'); this.renderPanel(true); break;
      case 'route': app.setBeltMode(d.v); this.renderPanel(true); break;
      default: await this._actMeta(a, d, el) || await this._actTools(a, d, el);
    }
  }
  _setting(k, v, live) {
    const app = this.app;
    if (k === 'quality') { app.setQuality(v); this.renderPanel(true); }
    else if (k === 'grid') { app.setGridMode(v); this.renderPanel(true); }
    else if (k === 'music') { app.setMusic(v === true || v === 'on'); this.renderPanel(true); }
    else if (k === 'musicVol') app.setVolumes(+v / 100, undefined, !live);
    else if (k === 'sfxVol') { app.setVolumes(undefined, +v / 100, !live); if (!live) app.sound?.play('coin'); }
    else if (k.startsWith('ph.')) this._photoSet(k.slice(3), v);
  }
  async _overwrite(slot) {
    const i = storage.info(slot); if (!i || i.empty) return true;
    return this.confirm(t('ui.save'), t('ui.overwrite', { n: slot }), t('ui.save'));
  }
  async _importFile() {
    const f = this.file.files && this.file.files[0]; if (!f) return;
    const text = await f.text(); await this.app.importText(text);
  }

  // =====================================================================================================
  // Panels
  // =====================================================================================================
  openPanel(p) {
    if (!p) return this.closePanel();
    if (this.mode !== 'play' && p !== 'settings' && p !== 'challenge') return;
    if (p === 'photo') { this.app.photo(true); return; }
    this.panel = p; this.el.sheet.classList.add('on'); this.root.classList.add('sheet-open'); this.el.btip.classList.remove('on'); this.el.sheet.dataset.p = p;
    this.el.sheet.innerHTML = `<div class="card panel"><div class="hd"><span class="pi">${PANEL_ICON[p] || ''}</span><h2>${esc(t('ui.p.' + p))}</h2><button class="btn icon small ghost x" data-act="close" aria-label="${esc(t('ui.close'))}">✕</button></div><div class="bd"></div></div>`;
    this.sig[p] = null; this.renderPanel(true);
    for (const b of this.el.side.querySelectorAll('[data-p]')) b.classList.toggle('on', b.dataset.p === p);
    this.app.sound?.play('click');
    if (p === 'research' || p === 'contracts' || p === 'plots') this.app.panelOpened?.(p);
    this.panelOpened?.(p);
  }
  closePanel() {
    if (!this.panel) return; this.panel = null; this.el.sheet.classList.remove('on'); this.root.classList.remove('sheet-open'); this.el.sheet.innerHTML = '';
    for (const b of this.el.side.querySelectorAll('[data-p]')) b.classList.remove('on');
  }
  renderPanel(force = false) {
    const p = this.panel; if (!p) return;
    const bd = $('.bd', this.el.sheet); if (!bd) return;
    if (!force && this.ptrDown) return;
    const fn = this['_p_' + p]; if (!fn) return;
    const html = fn.call(this);
    if (!force && html === this.sig[p]) return;
    this.sig[p] = html; const st = bd.scrollTop; bd.innerHTML = html; bd.scrollTop = st;
  }

  // ---------- Forschung ----------
  _p_research() {
    const sim = this.sim, list = sim.researchList(), S = sim.S;
    const avail = list.filter(r => !r.known && !(r.missing && r.missing.length)).sort((a, b) => a.cost - b.cost);
    const locked = list.filter(r => r.missing && r.missing.length).sort((a, b) => a.cost - b.cost);
    const done = list.filter(r => r.known);
    const unl = r => {
      const fx = RESEARCH[r.id]?.fx || {}, out = [];
      if (fx.building) out.push(`<span class="un">${this.bIcon(fx.building, 'sm')}${esc(name('building', fx.building))}</span>`);
      if (fx.recipe && RECIPES[fx.recipe]) out.push(`<span class="un">${this.iIcon(RECIPES[fx.recipe].out, false, 'sm')}${esc(name('item', RECIPES[fx.recipe].out))}</span>`);
      return out.join('');
    };
    const price = r => `<div class="price">${this.coin(r.cost)}${r.rp ? `<span class="cn rp">🧪${fmtNum(r.rp)}</span>` : ''}${r.voucher ? `<span class="tag gold">−50 %</span>` : ''}</div>`;
    const card = (r, kind) => `<div class="rc ${kind} ${r.ok ? 'can' : ''}">
      <div class="rt"><b>${esc(name('research', r.id))}</b>${unl(r)}</div>
      <p>${esc(desc('research', r.id))}</p>
      ${kind === 'lock' ? `<div class="req">${esc(t('ui.requires'))}: ${RESEARCH[r.id].req.map(q => `<span class="tag ${S.research.includes(q) ? 'ok' : ''}">${esc(name('research', q))}</span>`).join(' ')}</div>` : ''}
      <div class="rf">${price(r)}${kind === 'av' ? `<button class="btn small ${r.ok ? 'main' : ''}" data-act="research" data-id="${r.id}" ${r.ok ? '' : 'disabled'}>${esc(r.ok ? t('ui.researchBuy') : t('reason.' + r.reason))}</button>` : ''}</div>
    </div>`;
    return `<div class="note">${S.vouchers ? `🎟️ ${esc(t('ui.vouchers', { n: S.vouchers }))} · ` : ''}${esc(t('ui.researchNote', { rp: Math.floor(S.rp) }))}</div>
      <h3>${esc(t('ui.available'))}</h3><div class="grid rg">${avail.map(r => card(r, 'av')).join('') || `<p class="empty">${esc(t('ui.allDone'))}</p>`}</div>
      ${locked.length ? `<h3>${esc(t('ui.lockedRes'))}</h3><div class="grid rg">${locked.map(r => card(r, 'lock')).join('')}</div>` : ''}
      ${done.length ? `<h3>${esc(t('ui.doneRes', { n: done.length, total: list.length }))}</h3><div class="chips">${done.map(r => `<span class="tag ok">✓ ${esc(name('research', r.id))}</span>`).join('')}</div>` : ''}`;
  }
  // ---------- Aufträge ----------
  _p_contracts() {
    const sim = this.sim, S = sim.S;
    const card = (c, i, daily) => {
      const waiting = c.delay > 0, p = clamp(c.have / c.n);
      return `<div class="ct ${daily ? 'daily' : ''} ${c.done ? 'done' : ''} ${waiting ? 'wait' : ''}">
        <div class="ci">${waiting ? '<span class="emo">⏳</span>' : this.iIcon(c.item)}</div>
        <div class="cb">
          ${daily ? `<div class="kick">☀️ ${esc(t('ui.daily'))}</div>` : ''}
          <b>${waiting ? esc(t('ui.nextContract', { secs: c.delay })) : esc(t(daily ? 'contract.daily' : 'contract.deliver', { n: c.n, item: c.item, secs: c.secs }))}</b>
          ${waiting ? '' : `<div class="bar"><i style="width:${(p * 100).toFixed(1)}%"></i><span>${fmtNum(Math.min(c.have, c.n))} / ${fmtNum(c.n)}</span></div>`}
          <div class="cm">${waiting ? '' : `<span>${esc(t('ui.contractReward', { reward: c.reward, n: daily ? 2 : 1 }))}</span>`}${!daily && !waiting && !c.done ? `<span class="left">⏱ ${esc(t('contract.left', { secs: c.left }))}</span>` : ''}</div>
        </div>
        ${c.done && !c.claimed ? `<button class="btn main" data-act="claim" data-i="${i}">${esc(t('ui.claim'))}</button>` : c.claimed ? `<span class="tag ok">✓</span>` : ''}
      </div>`;
    };
    const tips = `<p class="note">${esc(t('ui.contractNote'))}</p>`;
    return tips + `<div class="cts">${S.contracts.map((c, i) => card(c, i, false)).join('')}${S.daily ? card(S.daily, 'daily', true) : ''}</div>`;
  }
  // ---------- Rezeptbuch ----------
  _p_book() {
    const sim = this.sim, b = sim.book(), tip = sim.canTip();
    const ent = e => {
      if (e.found) return `<div class="re found">${e.ins.map(i => this.iIcon(i)).join('<i class="op">+</i>')}<i class="op">=</i>${this.iIcon(e.out)}<span class="rn">${esc(name('recipe', e.id))}</span></div>`;
      if (e.tip) return `<div class="re tip">${e.ins.map(i => this.iIcon(i)).join('<i class="op">+</i>')}<i class="op">=</i><span class="q">?</span><span class="rn">💡 ${esc(t('ui.tipFrom'))}</span></div>`;
      return `<div class="re unk"><span class="q">?</span><i class="op">+</i><span class="q">?</span><i class="op">=</i><span class="q">???</span></div>`;
    };
    const known = Object.keys(RECIPES).filter(r => RECIPES[r].unlock !== 'hidden' && sim.recipeAvailable(r));
    const byB = {}; for (const r of known) (byB[RECIPES[r].building] ||= []).push(r);
    return `<div class="steve"><span class="av">👨‍🔬</span><div class="sb2"><b>${esc(t('steve.name'))}</b><p>${esc(tip.ok || tip.reason === 'money' ? t('ui.steveOffer') : t('steve.noTips'))}</p>
        ${tip.reason === 'known' ? '' : `<button class="btn small ${tip.ok ? 'main' : ''}" data-act="tip" ${tip.ok ? '' : 'disabled'}>${esc(t('steve.tipBuy', { cost: tip.cost }))}</button>`}</div></div>
      <h3>${esc(t('ui.secret', { n: b.found.length, total: b.total }))}</h3>
      <p class="note">${esc(t('ui.secretNote'))}</p>
      <div class="book">${b.entries.map(ent).join('')}</div>
      ${b.fails.length ? `<h3>${esc(t('ui.fails', { n: b.fails.length }))}</h3><div class="chips">${b.fails.map(f => { const [a, c] = f.split('+'); return `<span class="tag fail">${this.iIcon(a, false, 'sm')}+${this.iIcon(c, false, 'sm')} = ${esc(name('item', 'schrott'))}</span>`; }).join('')}</div>` : ''}
      <h3>${esc(t('ui.knownRecipes'))}</h3>
      ${Object.entries(byB).map(([bt, rs]) => `<div class="kr"><span class="kb">${this.bIcon(bt, 'sm')}${esc(name('building', bt))}</span>${rs.map(r => `<span class="re mini">${RECIPES[r].in.map(([i, n]) => (n > 1 ? `<small>${n}×</small>` : '') + this.iIcon(i, false, 'sm')).join('+')}<i class="op">→</i>${RECIPES[r].n > 1 ? `<small>${RECIPES[r].n}×</small>` : ''}${this.iIcon(RECIPES[r].out, false, 'sm')}</span>`).join('')}</div>`).join('')}`;
  }
  // ---------- Statistik ----------
  _p_stats() {
    const sim = this.sim, S = sim.S, st = S.stats, h = sim.incomeHistory(30), max = Math.max(1, ...h);
    const W = 600, H = 120, pts = h.map((v, i) => [i / (h.length - 1) * W, H - 6 - v / max * (H - 16)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    // unbekannte Ids (fremder/neuerer Spielstand) überspringen
    const prod = sim.production(), ids = [...new Set([...Object.keys(prod.made || {}), ...Object.keys(prod.sold || {})])].filter(i => ITEMS[i] && ((prod.made[i] || 0) * 60 >= .05 || (prod.sold[i] || 0) * 60 >= .05))
      .sort((a, b) => (ITEMS[b].value * ((prod.sold[b] || 0) + 1e-3)) - (ITEMS[a].value * ((prod.sold[a] || 0) + 1e-3)));
    const row = (k, v) => `<div class="kv"><span>${esc(t(k))}</span><b>${v}</b></div>`;
    return `<div class="spark"><div class="sl">${esc(t('ui.incomeChart'))}<b>${esc(t('ui.perSec', { n: fmtRate(sim.incomeRate()) }))}</b></div>
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="sg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f2c230" stop-opacity=".55"/><stop offset="1" stop-color="#f2c230" stop-opacity="0"/></linearGradient></defs>
        <path d="${line} L${W} ${H} L0 ${H} Z" fill="url(#sg)"/><path d="${line}" fill="none" stroke="#c98f22" stroke-width="3" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>
        <div class="sx"><span>−30 ${esc(t('unit.min'))}</span><span>${esc(t('ui.now'))}</span></div></div>
      <div class="kvs">${row('ui.st.earned', this.coin(st.earned))}${row('ui.st.sold', fmtNum(st.sold))}${row('ui.st.mined', fmtNum(st.mined))}${row('ui.st.gold', fmtNum(st.gold))}
        ${row('ui.st.crafted', fmtNum(st.crafted))}${row('ui.st.rp', fmtNum(st.rpGain))}${row('ui.st.total', this.coin(S.total.earned))}${row('ui.st.playtime', esc(fmtTime(S.total.playtime)))}${row('ui.st.prestiges', fmtNum(S.total.prestiges))}</div>
      <h3>${esc(t('ui.production'))}</h3>
      ${ids.length ? `<table class="prod"><tr><th></th><th>${esc(t('ui.madeMin'))}</th><th>${esc(t('ui.soldMin'))}</th></tr>${ids.map(i => `<tr><td>${this.iIcon(i, false, 'sm')}${esc(name('item', i))}</td><td>${fmtRate((prod.made[i] || 0) * 60)}</td><td>${fmtRate((prod.sold[i] || 0) * 60)}</td></tr>`).join('')}</table>` : `<p class="empty">${esc(t('ui.noProduction'))}</p>`}`;
  }
  // ---------- Erfolge ----------
  _p_achievements() {
    const sim = this.sim, S = sim.S;
    const rw = r => r.money ? this.coin(r.money) : r.color ? `<span class="sw" style="background:${COLORS[r.color].color}"></span>${esc(name('color', r.color))}` : r.title ? `🏷️ ${esc(name('title', r.title))}` : r.start ? `${esc(t('ui.startBonus'))} ${this.coin(r.start)}` : r.crate ? `🎁 ${esc(t('ui.crate'))}` : '';
    return `<p class="note">${esc(t('ui.achNote', { n: S.ach.length, total: Object.keys(ACHIEVEMENTS).length }))}</p><div class="grid ag">${Object.keys(ACHIEVEMENTS).map(id => {
      const a = ACHIEVEMENTS[id], have = S.ach.includes(id), v = Math.min(a.cond.n, sim.metric(a.cond.m));
      return `<div class="ac ${have ? 'have' : ''}"><span class="tr">${have ? '🏆' : '🔒'}</span><div><b>${esc(name('achievement', id))}</b><p>${esc(desc('achievement', id))}</p>
        ${have ? '' : `<div class="bar thin"><i style="width:${(v / a.cond.n * 100).toFixed(1)}%"></i></div><small>${fmtNum(v)} / ${fmtNum(a.cond.n)}</small>`}<div class="rw">${rw(a.reward)}</div></div></div>`;
    }).join('')}</div>`;
  }
  // ---------- Land ----------
  _p_plots() {
    const sim = this.sim, cost = sim.plotCost();
    let g = '';
    for (let cy = 0; cy < PLOTS; cy++) for (let cx = 0; cx < PLOTS; cx++) {
      const st = sim.plotState(cx, cy), c = sim.canBuyPlot(cx, cy), home = cx === START_PLOT && cy === START_PLOT;
      if (st === 'open') g += `<button class="pc open" data-act="fly" data-cx="${cx}" data-cy="${cy}" title="${esc(t('ui.flyTo'))}">${home ? '🏠' : '✓'}</button>`;
      else if (st === 'buyable') g += `<button class="pc buy ${c.ok ? 'can' : ''}" data-act="plot" data-cx="${cx}" data-cy="${cy}"><i class="coin"></i><small>${fmtNum(cost)}</small></button>`;
      else g += `<span class="pc lock">🔒</span>`;
    }
    return `<p class="note">${esc(t('ui.plotNote'))}</p><div class="minimap">${g}</div>
      <div class="kvs"><div class="kv"><span>${esc(t('ui.plotsOwned'))}</span><b>${sim.S.plots.length} / ${PLOTS * PLOTS}</b></div><div class="kv"><span>${esc(t('ui.nextPlot'))}</span><b>${this.coin(cost)}</b></div></div>`;
  }
  // ---------- Kisten ----------
  _p_crates() {
    const S = this.sim.S;
    if (!S.crates.length) return `<div class="emptybox"><span class="big">🎁</span><p>${esc(t('ui.noCrates'))}</p></div>`;
    return `<p class="note">${esc(t('ui.crateNote'))}</p><div class="crates">${S.crates.map((c, i) => `<button class="cr" data-act="crate" data-i="${i}"><span class="box">🎁</span><b>${esc(t('crate.src.' + c.src))}</b><span class="btn small main">${esc(t('ui.open'))}</span></button>`).join('')}</div>`;
  }
  // ---------- Neue Fabrik / Patente ----------
  _p_prestige() {
    const sim = this.sim, S = sim.S, earned = S.stats.earned, can = sim.canPrestige(), pts = sim.prestigePoints(), bios = sim.biomes();
    if (!bios.includes(this.prestigeBiome)) this.prestigeBiome = 'wiese';
    return `<div class="pres ${can ? 'can' : ''}">
        <p>${esc(t('ui.prestigeText'))}</p>
        <div class="bar big"><i style="width:${(clamp(earned / PRESTIGE_AT) * 100).toFixed(1)}%"></i><span>${fmtNum(earned)} / ${fmtNum(PRESTIGE_AT)}</span></div>
        <div class="kvs"><div class="kv"><span>${esc(t('ui.pointsGain'))}</span><b>📜 ${fmtNum(pts)}</b></div><div class="kv"><span>${esc(t('ui.pointsHave'))}</span><b>📜 ${fmtNum(S.points)}</b></div></div>
        <h3>${esc(t('ui.chooseWorld'))}</h3>
        <div class="worlds">${Object.keys(BIOMES).map(b => { const ok = bios.includes(b); return `<button class="wd ${ok ? '' : 'dis'} ${this.prestigeBiome === b ? 'sel' : ''} w-${b}" data-act="biome" data-id="${b}" ${ok ? '' : 'disabled'}><b>${esc(name('biome', b))}</b><small>${esc(ok ? desc('biome', b) : t('ui.worldLocked'))}</small></button>`; }).join('')}</div>
        <p class="note">${esc(t('ui.keepNote'))}</p>
        <button class="btn ${can ? 'main' : ''} wide" data-act="prestige" ${can ? '' : 'disabled'}>🏭 ${esc(can ? t('ui.prestigeInfo', { n: pts }) : t('ui.prestigeLocked', { n: PRESTIGE_AT }))}</button>
      </div>
      <h3>${esc(t('ui.patentTree'))}</h3>
      <div class="grid rg">${sim.patentList().map(p => `<div class="rc ${p.known ? 'done' : p.ok ? 'can' : ''}">
        <div class="rt"><b>${esc(name('patent', p.id))}</b>${p.known ? '<span class="tag ok">✓</span>' : ''}</div><p>${esc(desc('patent', p.id))}</p>
        ${p.missing && p.missing.length ? `<div class="req">${esc(t('ui.requires'))}: ${p.missing.map(q => `<span class="tag">${esc(name('patent', q))}</span>`).join(' ')}</div>` : ''}
        ${p.known ? '' : `<div class="rf"><div class="price"><span class="cn">📜 ${p.cost}</span></div><button class="btn small ${p.ok ? 'main' : ''}" data-act="patent" data-id="${p.id}" ${p.ok ? '' : 'disabled'}>${esc(p.ok ? t('ui.patentBuy') : t('reason.' + p.reason))}</button></div>`}
      </div>`).join('')}</div>`;
  }
  // ---------- Einstellungen ----------
  _p_settings() {
    const app = this.app, sim = this.sim, lang = getLang(), q = app.settings.quality, gm = app.settings.grid, mu = app.settings.music;
    const seg = (act, cur, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${cur === v ? 'on' : ''}" data-act="${act}" data-v="${v}">${l}</button>`).join('')}</div>`;
    let h = `<div class="set"><label>${esc(t('ui.language'))}</label><div class="seg">${Object.keys(LANGS).map(l => `<button class="${l === lang ? 'on' : ''}" data-act="lang" data-l="${l}">${FLAGS[l]} ${esc(LANGS[l])}</button>`).join('')}</div></div>
      <div class="set"><label>${esc(t('ui.quality'))}</label>${seg('quality', q, [['hoch', esc(t('ui.q.hoch'))], ['mittel', esc(t('ui.q.mittel'))], ['niedrig', esc(t('ui.q.niedrig'))]])}</div>
      <div class="set"><label>${esc(t('ui.music'))}</label>${seg('music', mu ? 'on' : 'off', [['on', esc(t('ui.on'))], ['off', esc(t('ui.off'))]])}<input type="range" min="0" max="100" value="${Math.round(app.settings.musicVol * 100)}" data-set="musicVol" aria-label="${esc(t('ui.music'))}"></div>
      <div class="set"><label>${esc(t('ui.sfx'))}</label><input type="range" min="0" max="100" value="${Math.round(app.settings.sfxVol * 100)}" data-set="sfxVol" aria-label="${esc(t('ui.sfx'))}"></div>
      <div class="set"><label>${esc(t('ui.grid'))}</label>${seg('grid', gm, [['on', esc(t('ui.grid.on'))], ['build', esc(t('ui.grid.build'))], ['off', esc(t('ui.grid.off'))]])}</div>
      <div class="set"><label>${esc(t('ui.autoJoin'))}</label>${seg('autojoin', app.settings.autoJoin ? 'on' : 'off', [['on', esc(t('ui.on'))], ['off', esc(t('ui.off'))]])}<small class="mute">${esc(t('ui.autoJoinNote'))}</small></div>
      <div class="set"><label>${esc(t('ui.beltDrag'))}</label>${seg('route', app.settings.beltMode, [['l', '⌐ ' + esc(t('ui.routeL'))], ['route', '⤳ ' + esc(t('ui.route'))]])}<small class="mute">${esc(t('ui.routeNote'))}</small></div>`;
    if (sim && this.mode === 'play') {
      const S = sim.S;
      h += `<div class="set"><label>${esc(t('ui.color'))}</label><div class="swatches">${S.deco.colors.filter(c => COLORS[c]).map(c => `<button class="swb ${S.deco.color === c ? 'on' : ''}" data-act="color" data-id="${c}" title="${esc(name('color', c))}"><i style="background:${COLORS[c].color}"></i><small>${esc(name('color', c))}</small></button>`).join('')}</div>
        <small class="mute">${esc(t('ui.colorNote'))}</small></div>
        <div class="set"><label>${esc(t('ui.title'))}</label><div class="seg wrap"><button class="${!S.deco.title ? 'on' : ''}" data-act="title" data-id="">${esc(t('ui.none'))}</button>${S.deco.titles.filter(x => TITLES[x]).map(x => `<button class="${S.deco.title === x ? 'on' : ''}" data-act="title" data-id="${x}">${esc(name('title', x))}</button>`).join('')}</div>
        ${S.deco.titles.length ? '' : `<small class="mute">${esc(t('ui.titleNote'))}</small>`}</div>
        <div class="set"><label>${esc(t('ui.tutorial'))}</label><button class="btn small" data-act="tut-restart">↺ ${esc(t('ui.tutRestart'))}</button></div>`;
    }
    h += `<div class="set keys"><label>${esc(t('ui.keys'))}</label><p>${t('ui.keyList', { undo: esc(undoKey()) })}</p></div>`;
    return h;
  }
  // ---------- Spielstände ----------
  _slotName(s) { return s.slot === storage.AUTO ? t('ui.autosave') : s.slot === storage.BACKUP ? t('ui.backup') : t('ui.slot', { n: s.slot }); }
  _p_game() {
    const sl = storage.list(true), fixed = s => s.slot === storage.AUTO || s.slot === storage.BACKUP;
    return `<p class="note">${esc(t('ui.saveNote'))}</p><div class="slots">${sl.map(s => `<div class="slot ${s.empty ? 'empty' : ''} ${s.slot === storage.BACKUP ? 'backup' : ''}"><div class="sn"><b>${esc(this._slotName(s))}</b><small>${esc(s.slot === storage.BACKUP && !s.empty && !s.broken ? t('ui.backupNote') + ' · ' + this._slotLine(s) : this._slotLine(s))}</small></div>
        ${fixed(s) ? '' : `<button class="btn small" data-act="save" data-s="${s.slot}">💾 ${esc(t('ui.save'))}</button>`}
        ${s.empty || s.broken ? '' : `<button class="btn small" data-act="load" data-s="${s.slot}">📂 ${esc(t('ui.load'))}</button>`}</div>`).join('')}</div>
      <div class="row"><button class="btn" data-act="export">⬇️ ${esc(t('ui.export'))}</button><button class="btn" data-act="import">⬆️ ${esc(t('ui.import'))}</button><span class="grow"></span><button class="btn wood" data-act="tomenu">🏠 ${esc(t('ui.mainMenu'))}</button></div>`;
  }
  loadDialog() {
    const sl = storage.list(true).filter(s => !s.empty);
    const html = sl.length ? `<div class="slots">${sl.map(s => `<div class="slot ${s.slot === storage.BACKUP ? 'backup' : ''}"><div class="sn"><b>${esc(this._slotName(s))}</b><small>${esc(this._slotLine(s))}</small></div>
      ${s.broken ? '' : `<button class="btn small main" data-act="load" data-s="${s.slot}">📂 ${esc(t('ui.load'))}</button>`}${s.slot === storage.AUTO ? '' : `<button class="btn small ghost" data-act="del-save" data-s="${s.slot}" title="${esc(t('ui.delete'))}">🗑️</button>`}</div>`).join('')}</div>`
      : `<p class="empty">${esc(t('ui.noSaves'))}</p>`;
    return this.modal({ title: '📂 ' + t('ui.load'), html: html + `<div class="row"><button class="btn small" data-act="import">⬆️ ${esc(t('ui.import'))}</button></div>`, buttons: [{ label: t('ui.close'), value: null, cls: 'ghost' }] });
  }

  // =====================================================================================================
  // Info-Panel (ausgewähltes Gebäude)
  // =====================================================================================================
  select(id) { this.selId = id || 0; this.renderInfo(true); }
  renderInfo(force = false) {
    const el = this.el.info, sim = this.sim, id = this.selId;
    const e = id && sim && this.mode === 'play' ? sim.entity(id) : null;
    if (!e) { if (el.classList.contains('on')) { el.classList.remove('on'); el.innerHTML = ''; } this._infoSig = ''; return; }
    if (!force && this.ptrDown) return;
    const html = this._info(e);
    if (!force && html === this._infoSig) return;
    this._infoSig = html; el.innerHTML = html; el.classList.add('on');
  }
  _info(e) {
    const sim = this.sim, n = sim.N.get(e.id), paid = n ? n.e.paid : 0, belt = e.kind === 'belt' || e.kind === 'tunnel' || e.kind === 'split' || e.kind === 'sort';
    const noXp = belt || e.kind === 'sell' || e.kind === 'store' || ['power', 'solar', 'mast', 'heater', 'drone', 'wonder'].includes(e.kind);
    const stars = noXp ? '' : `<span class="stars">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= e.level ? 'on' : ''}">★</i>`).join('')}</span>`;
    const mk = e.mk ? `<span class="mk mk${e.mk}">Mk ${ROMAN[e.mk]}</span>` : '';
    let xp = '';
    if (!noXp) {
      if (e.level >= 5) xp = `<div class="xp"><div class="bar thin gold"><i style="width:100%"></i></div><small>${esc(t('ui.maxStars'))}</small></div>`;
      else { const a = XP_LV[e.level - 1], b = XP_LV[e.level], p = clamp((e.xp - a) / (b - a)); xp = `<div class="xp"><div class="bar thin gold"><i style="width:${(p * 100).toFixed(1)}%"></i></div><small>${esc(t('ui.xpNext', { xp: Math.floor(e.xp - a), need: b - a, level: e.level + 1 }))}</small></div>`; }
    }
    const kv = (k, v) => `<div class="kv"><span>${esc(k)}</span><b>${v}</b></div>`;
    const net = e.net >= 0 && sim.nets ? sim.nets[e.net] : null;
    const netLine = () => net ? kv('⚡ ' + t('ui.grid1'), `${fmtNum(net.supply)} / ${fmtNum(net.demand)} · ${net.demand > 0 ? pct(net.supply / net.demand) : 100} %`) : '';
    let body = '';
    switch (e.kind) {
      case 'drill':
        body = e.item ? `<div class="kv"><span>${esc(t('ui.mines'))}</span><b>${this.iIcon(e.item, false, 'sm')}${esc(name('item', e.item))}</b></div><div class="kv"><span>${esc(t('ui.speed'))}</span><b>${esc(t('unit.perMin', { n: fmtRate(e.rate * 60) }))}</b></div><div class="kv"><span>${esc(t('ui.outBuf'))}</span><b>${e.out} / ${e.cap ?? 4 * (e.mk || 1)}</b></div>${e.parts ? `<div class="kv"><span>${esc(t('ui.mergedFrom'))}</span><b>⛏️ ${esc(t('ui.mergedN', { n: e.parts }))}</b></div>` : ''}`
          : `<p class="warn">${esc(t('ui.noDeposit'))}</p>`;
        break;
      case 'machine': {
        const auto = e.auto, rs = (e.recipes || []).filter(r => RECIPES[r]);
        const rbtn = (rid, label, on) => `<button class="rb ${on ? 'on' : ''}" data-act="recipe" data-r="${rid || ''}">${label}</button>`;
        const rl = rid => `${RECIPES[rid].in.map(([i, k]) => (k > 1 ? `<small>${k}×</small>` : '') + this.iIcon(i, false, 'sm')).join('+')}<i class="op">→</i>${RECIPES[rid].n > 1 ? `<small>${RECIPES[rid].n}×</small>` : ''}${this.iIcon(RECIPES[rid].out, false, 'sm')}<span class="rnm">${esc(name('recipe', rid))}</span>`;
        body = `<div class="lbl">${esc(t('ui.recipe'))}</div><div class="rbs">${rbtn('', `✨ ${esc(t('ui.auto'))}${auto && RECIPES[e.recipe] ? ` <small>(${esc(name('item', RECIPES[e.recipe].out))})</small>` : ''}`, auto)}${rs.map(r => rbtn(r, rl(r), !auto && e.recipe === r)).join('')}</div>`;
        if (!rs.length) body += `<p class="warn">${esc(t('ui.noRecipes'))}</p>`;
        if (e.inputs.length) body += `<div class="lbl">${esc(t('ui.inputs'))}</div><div class="bufs">${e.inputs.map(x => `<span class="buf ${x.n >= x.need ? 'ok' : ''}">${this.iIcon(x.item, false, 'sm')}<b>${x.n}</b>/${x.need}</span>`).join('')}<span class="buf out">→ <b>${e.out}</b></span></div>`;
        if (e.busy) body += `<div class="bar thin"><i style="width:${(e.progress * 100).toFixed(0)}%"></i></div>`;
        break;
      }
      case 'exp':
        body = `<p class="note">${esc(t('ui.expHint'))}</p><div class="bufs">${[e.a, e.b].map(x => x ? `<span class="buf">${this.iIcon(x, false, 'sm')}${esc(name('item', x))}</span>` : `<span class="buf emp">?</span>`).join('<i class="op">+</i>')}</div>`;
        if (e.busy) body += `<div class="bar thin"><i style="width:${(e.progress * 100).toFixed(0)}%"></i></div>`;
        break;
      case 'lab': body = `<p class="note">${esc(t('ui.labHint'))}</p><div class="kv"><span>${esc(t('ui.queue'))}</span><b>${e.count} / ${6 * (e.mk || 1)}</b></div><div class="kv"><span>${esc(t('ui.rp'))}</span><b>🧪 ${fmtNum(sim.S.rp)}</b></div>`; break;
      case 'sell': {
        const tm = sim.M.taktMax, p = clamp(e.streak / TAKT_TIME);
        body = `<div class="kv"><span>${esc(t('ui.rhythm'))}</span><b class="takt">×${(Math.round(e.takt * 100) / 100).toFixed(2)}</b></div><div class="bar thin green"><i style="width:${(p * 100).toFixed(1)}%"></i></div><small class="mute">${esc(t('ui.taktHint', { max: tm }))}</small>
          <div class="kv"><span>${esc(t('ui.soldHere'))}</span><b>${fmtNum(e.sold)}</b></div>`; break;
      }
      case 'store': body = `<div class="kv"><span>${esc(t('ui.stored'))}</span><b>${e.count} / ${e.cap}</b></div><div class="bar thin"><i style="width:${(e.count / e.cap * 100).toFixed(1)}%"></i></div>`; break;
      case 'sort': {
        const made = new Set([...RAW.filter(r => sim.S.total.made[r]), ...Object.keys(sim.S.total.made)]); if (e.filter && e.filter !== 'gold') made.add(e.filter);
        const items = ITEM_IDS.filter(i => made.has(i));
        body = `<div class="lbl">${esc(t('ui.filter'))} <small class="mute">${esc(t('ui.filterHint'))}</small></div><div class="filt">
          <button class="fb ${!e.filter ? 'on' : ''}" data-act="filter" data-i="">∅<small>${esc(t('ui.none'))}</small></button>
          <button class="fb ${e.filter === 'gold' ? 'on' : ''}" data-act="filter" data-i="gold">✨<small>${esc(t('ui.gold'))}</small></button>
          ${items.map(i => `<button class="fb ${e.filter === i ? 'on' : ''}" data-act="filter" data-i="${i}" title="${esc(name('item', i))}">${this.iIcon(i, false, 'sm')}<small>${esc(name('item', i))}</small></button>`).join('')}</div>`; break;
      }
      case 'tunnel': body = `<div class="kv"><span>${esc(t('ui.tunnel'))}</span><b>${esc(t(e.link ? (e.exit ? 'ui.tunnelExit' : 'ui.tunnelEntry') : 'ui.tunnelOpen'))}</b></div><div class="kv"><span>${esc(t('ui.parts'))}</span><b>${e.count}</b></div>`; break;
      case 'power': {
        const d = BUILDINGS.kraftwerk;
        body = kv('🔥 ' + t('ui.fuel'), `${(d.fuel || []).map(i => this.iIcon(i, false, 'sm')).join('')} ${e.fuel} / ${d.cap || 8}${e.burning ? ' · ' + esc(t('ui.burning')) : ''}`)
          + kv('⚡ ' + t('ui.output'), `${fmtNum(e.out)} / ${fmtNum(d.power)}`) + `<div class="bar thin gold"><i style="width:${pct(e.out / d.power)}%"></i></div>`
          + kv('📡 ' + t('ui.range'), t('ui.tiles', { n: e.range })) + netLine();
        break;
      }
      case 'solar': body = kv('☀️ ' + t('ui.output'), `${fmtRate(e.out)} / ${fmtRate(BUILDINGS.solar.power * (BIOMES[sim.S.biome]?.solarMul || 1))}`) + (sim.S.storm?.left > 0 ? `<p class="warn">🌪️ ${esc(t('ui.stormDark'))}</p>` : '') + kv('📡 ' + t('ui.range'), t('ui.tiles', { n: e.range })) + netLine(); break;
      case 'mast': body = kv('📡 ' + t('ui.range'), t('ui.tiles', { n: e.range })) + (net ? netLine() : `<p class="warn">${esc(t('ui.noGridHere'))}</p>`); break;
      case 'heater': body = `<p class="note">${esc(t('ui.heaterHint'))}</p>` + kv('📡 ' + t('ui.range'), t('ui.tiles', { n: e.range })); break;
      case 'drone': {
        const tg = e.link ? sim.N.get(e.link) : null, from = sim.mn.filter(m => m.kind === 'drone' && m.e.link === e.id);
        body = kv('🚁 ' + t('ui.drones'), `${e.drones}`) + kv('📦 ' + t('ui.parts'), `${e.count} → ${e.out}`)
          + `<div class="kv"><span>${esc(t('ui.sendsTo'))}</span><b>${tg ? `<button class="lnk" data-act="fly-ent" data-id="${tg.id}">${esc(name('building', tg.e.type))} (${tg.e.x}, ${tg.e.y})</button>` : '—'}</b></div>`
          + (from.length ? `<div class="kv"><span>${esc(t('ui.receivesFrom'))}</span><b>${from.map(m => `<button class="lnk" data-act="fly-ent" data-id="${m.id}">(${m.e.x}, ${m.e.y})</button>`).join(' ')}</b></div>` : '')
          + `<div class="row ia2">${this.app.linkFrom === e.id ? `<button class="btn small" data-act="link-cancel">✕ ${esc(t('ui.cancel'))}</button>` : `<button class="btn small main" data-act="link-start">🔗 ${esc(t(tg ? 'ui.relink' : 'ui.link'))}</button>`}${tg ? `<button class="btn small ghost" data-act="link-clear">⛓️‍💥 ${esc(t('ui.unlink'))}</button>` : ''}</div>`;
        break;
      }
      case 'wonder': {
        const w = sim.wonder();
        body = w.done ? `<p class="note">🚀 ${esc(t('diag.wonderDone'))}</p>` : `<div class="lbl">${esc(t('ui.wonderStage', { n: w.stage, total: w.stages }))} · ${esc(t('wonder.' + w.stage + '.name'))}</div>`
          + Object.keys(w.need).map(i => `<div class="need">${this.iIcon(i, false, 'sm')}<span>${esc(name('item', i))}</span><div class="bar thin"><i style="width:${pct((w.have[i] || 0) / w.need[i])}%"></i></div><b>${fmtNum(Math.min(w.have[i] || 0, w.need[i]))} / ${fmtNum(w.need[i])}</b></div>`).join('')
          + `<div class="row ia2"><button class="btn small" data-act="panel" data-p="wonder">🚀 ${esc(t('ui.p.wonder'))}</button></div>`;
        break;
      }
      default: body = `<div class="kv"><span>${esc(t('ui.parts'))}</span><b>${e.count ?? 0} / 4</b></div>${e.blocked ? `<p class="warn">🛋️ ${esc(t('gerald.sit'))}</p>` : ''}`;
    }
    // Durchsatz: liefert / Band / Abnehmer (Bohrer und Maschinen mit Ausgang)
    const fl = (e.kind === 'drill' || e.kind === 'machine') && sim.flow ? sim.flow(e.id) : null;
    const dg0 = fl && sim.diagnose ? sim.diagnose(e.id) : null;
    if (fl && fl.cons.length) {
      const pm = v => t('unit.perMin', { n: fmtRate(v * 60) });
      const take = Number.isFinite(fl.demand) ? pm(fl.demand) : '∞ ' + t('ui.flowAll');
      const cls = v => v < fl.supply * 0.97 ? 'fl-bad' : 'fl-ok';
      body += `<div class="lbl">${esc(t('ui.flow'))}</div>` + kv('⬆ ' + t('ui.flowOut'), `${this.iIcon(fl.item, false, 'sm')}${esc(pm(fl.supply))}`)
        + (Number.isFinite(fl.belt) ? kv('➡️ ' + t('ui.flowBelt'), `<span class="${cls(fl.belt)}">${esc(pm(fl.belt))}</span>`) : '')
        + kv('⬇ ' + t('ui.flowTake') + (fl.main ? ` (${fl.cons.filter(c => c.type === fl.main).length}× ${name('building', fl.main)})` : ''), `<span class="${Number.isFinite(fl.demand) ? cls(fl.demand) : 'fl-ok'}">${esc(take)}</span>`);
      const shown = dg0 && /^diag\.flow/.test(dg0.key);
      if (!shown && fl.wrong.length && !fl.cons.some(c => c.rate > 0)) body += `<p class="warn">${esc(t('diag.flowWrong', { item: fl.item, b: sim.N.get(fl.wrong[0])?.e.type }))}</p>`;
      else if (!shown && fl.limit === 'cons') body += `<p class="warn">${esc(t('diag.flowCons', { item: fl.item, n: Math.round(fl.supply * 60), m: Math.round(fl.demand * 60), k: fl.need, b: fl.main }))}</p>`;
      else if (!shown && fl.limit === 'belt') body += `<p class="warn">${esc(t('diag.flowBelt', { item: fl.item, n: Math.round(fl.supply * 60), m: Math.round(fl.belt * 60) }))}</p>`;
    }
    // Strom (Verbraucher)
    let power = '';
    if (e.use > 0 && (e.power ?? 1) > 0) {
      const p = e.power ?? 1, grace = sim.S.powerGrace > 0;
      power = `<div class="pw ${p <= 0 ? 'bad' : p < 1 ? 'warn' : 'ok'}"><span>⚡ ${esc(t('ui.power'))}</span><b>${p <= 0 ? esc(t('state.nopower')) : pct(p) + ' %'}</b><small>${esc(t('ui.powerUse', { n: e.use }))}${grace && e.net < 0 ? ' · ' + esc(t('ui.grace', { secs: Math.ceil(sim.S.powerGrace) })) : ''}</small></div>`;
    }
    // Diagnose mit Tipp
    let diag = '';
    const dg = sim.diagnose ? sim.diagnose(e.id) : null;
    if (dg && (!belt || dg.state !== 'ok')) diag = `<div class="diag s${dg.sev >= 2.5 ? 3 : dg.sev >= 1.5 ? 2 : dg.sev > 0 ? 1 : 0}"><i>${dg.sev >= 2 ? '⚠️' : dg.sev > 0 ? '💡' : '✅'}</i><span>${esc(t(dg.key, dg.vars))}</span></div>`;
    // Ausbau
    let upg = '';
    const cu = sim.canUpgrade ? sim.canUpgrade(e.id) : null;
    if (cu && cu.reason !== 'noupgrade' && cu.reason !== 'unknown') {
      if (cu.reason === 'maxmk') upg = `<div class="upg max"><span class="mk mk3">Mk III</span><small>${esc(t('reason.maxmk'))}</small></div>`;
      else upg = `<div class="upg"><button class="btn small ${cu.ok ? 'main' : ''}" data-act="upgrade" ${cu.reason === 'research' ? 'disabled' : ''}>⬆ ${esc(t('ui.upgrade', { mk: ROMAN[cu.mk] }))} ${this.coin(cu.cost)}</button>
        <small class="${cu.ok ? 'mute' : 'bad'}">${esc(cu.ok ? t('ui.upgradeFx', { mk: ROMAN[cu.mk] }) + (cu.power ? ' · ' + t('ui.upgradePower', { n: cu.power }) : '') : cu.reason === 'research' ? '🔒 ' + t('ui.needsResearch', { id: cu.need }) : t('reason.' + cu.reason))}</small></div>`;
    }
    const st = e.state === 'norecipe' && e.auto ? 'wait' : e.state;
    return `<div class="ih"><span class="im">${this.bIcon(e.type)}</span><div class="it"><b>${esc(name('building', e.type))} ${mk}</b>${stars}</div><button class="btn icon small ghost x" data-act="info-close" aria-label="${esc(t('ui.close'))}">✕</button></div>
      ${belt ? '' : `<div class="state ${STATE_CLS[st] || ''}"><i></i>${esc(t('state.' + st))}</div>`}${xp}
      ${power}${diag}
      <div class="ib">${body}</div>${upg}
      <div class="ia"><button class="btn small" data-act="rot-ent">⟳ ${esc(t('ui.rotate'))} <kbd>R</kbd></button><button class="btn small" data-act="pip-ent">💧 ${esc(t('ui.copy'))} <kbd>C</kbd></button><button class="btn small danger" data-act="del-ent">🧨 ${esc(t('ui.remove'))}${paid ? ` <small>+${fmtNum(paid)}</small>` : ''}</button></div>`;
  }

  // =====================================================================================================
  // Anleitung
  // =====================================================================================================
  renderTut(force = false) {
    const el = this.el.tut, sim = this.sim;
    for (const x of this.root.querySelectorAll('.pulse')) x.classList.remove('pulse');
    this.tutPoint = null;
    if (sim && this.mode === 'play' && sim.S.tut > TUTORIAL.length && this.hintNow && !this.app.photoOn) {      // Hinweise nach der Anleitung (Strom, Ausbau, Blaupausen)
      const h = this.hintNow, sig = 'hint:' + h + ':' + getLang();
      if (force || sig !== this._tutSig) el.innerHTML = `<span class="pip">💡</span><div class="bub panel hint"><div class="st"><span>${esc(t('ui.hintTitle'))}</span></div><p>${t('hint.' + h, { undo: esc(undoKey()) })}</p><div class="row"><button class="btn small main" data-act="hint-ok">${esc(t('ui.gotIt'))}</button>${h === 'power' ? `<button class="btn small" data-act="overlay" data-k="power">⚡ ${esc(t('ui.ovPower'))}</button>` : h === 'bp' ? `<button class="btn small" data-act="tool" data-b="bp">📐 ${esc(t('ui.bp'))}</button>` : ''}</div></div>`;
      this._tutSig = sig; el.classList.add('on'); return;
    }
    if (!sim || this.mode !== 'play' || sim.S.tut > TUTORIAL.length || this.app.photoOn) { el.classList.remove('on'); el.innerHTML = ''; this._tutSig = ''; return; }
    const h = sim.help();
    const sig = h.key + ':' + getLang() + ':' + h.step;
    if (h.done) {
      if (force || sig !== this._tutSig) el.innerHTML = `<span class="pip">🎉</span><div class="bub panel"><div class="st"><span>${esc(t('ui.tutorial'))}</span><span>${h.total} / ${h.total}</span></div><p>${esc(t('tut.done'))}</p><button class="btn small main" data-act="tut-ok">${esc(t('ui.ok'))}</button></div>`;
    } else {
      if (force || sig !== this._tutSig) el.innerHTML = `<span class="pip">👷</span><div class="bub panel"><div class="st"><span>${esc(t('ui.tutStep', { n: h.step + 1, total: h.total }))}</span><button class="lnk" data-act="tut-skip">${esc(t('ui.tutSkip'))}</button></div>
        <p>${esc(t(h.key))}</p><div class="dots">${Array.from({ length: h.total }, (_, i) => `<i class="${i < h.step ? 'on' : i === h.step ? 'cur' : ''}"></i>`).join('')}</div></div>`;
      const tg = h.target;
      if (BUILDINGS[tg] && tg !== 'verkauf') { const b = this.el.bar.querySelector(`[data-b="${tg}"]`); if (b && this.app.tool !== tg) b.classList.add('pulse'); }
      if (['research', 'contracts', 'plots'].includes(tg)) { const b = this.el.side.querySelector(`[data-p="${tg}"]`); if (b && this.panel !== tg) b.classList.add('pulse'); }
      if (tg === 'verkauf' || tg === 'band') this.tutPoint = 'sell';
      if (tg === 'bohrer' && this.app.tool === 'bohrer') this.tutPoint = 'deposit';
      if (tg === 'ofen' && this.app.tool === 'ofen') this.tutPoint = 'sell';
    }
    this._tutSig = sig; el.classList.add('on');
  }

  // =====================================================================================================
  // Ereignisse → Toasts, Karten, Sprechblasen
  // =====================================================================================================
  onEvents(evs) {
    for (const ev of evs) {
      switch (ev.type) {
        case 'discover': this.recipeCard(ev.recipe); this.bubble('steve', t('steve.eureka'), 3); break;
        case 'fail': if (!ev.known) this.toast('💥 ' + t('event.fail', ev), 'mute'); else this._rl('failk', 12) && this.toast('💥 ' + t('event.failKnown', ev), 'mute'); if (Math.random() < .3) this.bubble('steve', t('steve.explode'), 2.5); break;
        case 'levelup': if (this._rl('lvl', 2.5)) this.toast('⭐ ' + t('event.levelup', ev), 'gold'); break;
        case 'research': this.toast('🔬 ' + t('event.research', ev), 'ok'); this._bar(); this._researchHint(ev.id); break;
        case 'patent': this.toast('📜 ' + t('event.patent', ev), 'ok'); break;
        case 'plot': {
          const ids = Object.keys(ev.found || {});
          this.toast('🗺️ ' + (ids.length ? t('event.plot', { list: ids.map(i => name('item', i)).join(', ') }) : t('event.plotEmpty')), 'ok');
          if (ev.ruin) this.toast('🏚️ ' + t('event.plotRuin'), 'gold'); break;
        }
        case 'crate': if (ev.kind === 'new' && ev.src !== 'contract' && ev.src !== 'daily' && ev.src !== 'ruin') this.toast('🎁 ' + t('event.crate'), 'gold'); this._pulseCrates(); break;
        case 'achievement': this.toast(`<b>🏆 ${esc(t('ui.achievement'))}</b>${esc(name('achievement', ev.id))}`, 'ach', true); break;
        case 'takt': this.toast('🥁 ' + t('event.takt', { takt: Math.round(ev.takt * 10) / 10 }), 'ok'); break;
        case 'prestige': this.toast('🏭 ' + t('event.prestige', { n: ev.points }), 'gold'); break;
        case 'boost': if (ev.end) this.toast('⏱ ' + t('event.turboEnd'), 'mute'); break;
        case 'undo': this.toast('↶ ' + t('event.undo'), 'mute'); break;
        case 'contract':
          if (ev.kind === 'done') this.toast('📋 ' + t('contract.done', ev), 'gold');
          else if (ev.kind === 'expired') this.toast('⌛ ' + t('contract.expired', ev), 'mute');
          else if (ev.kind === 'claimed') this.toast('💰 ' + t('contract.claimed', ev), 'ok');
          if (this.panel === 'contracts') this.renderPanel(true); break;
        case 'gerald':
          if (ev.kind === 'appear') { this.toast('🧢 ' + t('gerald.appear'), 'ok'); this.bubble('gerald', t('gerald.' + (ev.line && ev.line !== 'belt' ? ev.line : 'hi')), 4); }
          else if (ev.kind === 'sit') { this.toast('🛋️ ' + t('gerald.sit'), 'gold'); this.bubble('gerald', t('gerald.belt'), 5); }
          else if (ev.kind === 'click') this.toast('🎁 ' + t('gerald.click'), 'gold');
          break;
        case 'tip': { const m = t('steve.tip', { a: ev.ins[0], b: ev.ins[1] }); this.bubble('steve', m, 6); this.toast('💡 ' + m, 'ok'); break; }
        case 'tut': this.renderTut(true); if (this.sim.S.tut < TUTORIAL.length) this.app.sound?.play('levelup', { gain: .5 }); break;
        default: this._onEvent2(ev);
      }
    }
  }
  _rl(k, secs) { const now = performance.now() / 1000; if ((this.lastToast[k] || -99) + secs > now) return false; this.lastToast[k] = now; return true; }
  toast(text, kind = '', html = false) {
    const el = document.createElement('div'); el.className = 'toast panel ' + kind;
    if (html) el.innerHTML = text; else el.textContent = text;
    this.el.toasts.prepend(el);
    while (this.el.toasts.children.length > (this.panel || innerWidth <= 760 ? 2 : 4)) this.el.toasts.lastChild.remove();
    setTimeout(() => el.remove(), kind === 'ach' ? 5200 : 4000);
  }
  _pulseCrates() { const b = this.el.side.querySelector('[data-p="crates"]'); if (b) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); } }
  bubble(who, text, secs = 4) {
    const old = this.bubbles.find(b => b.who === who); if (old) { old.el.remove(); this.bubbles.splice(this.bubbles.indexOf(old), 1); }
    const el = document.createElement('div'); el.className = 'bubble ' + who; el.innerHTML = `<div class="in"><b>${esc(t(who + '.name'))}</b>${esc(text)}</div>`;
    this.el.anchors.appendChild(el); this.bubbles.push({ who, el, until: performance.now() + secs * 1000 });
  }
  recipeCard(rid) {
    const r = RECIPES[rid]; if (!r) return;
    const o = this.el.overlay;
    o.innerHTML = `<div class="rcard panel" data-act="overlay-close"><div class="rays"></div><div class="kick">✨ ${esc(t('ui.eureka'))}</div><h2>${esc(name('recipe', rid))}</h2>
      <div class="rr">${r.in.map(([i, n]) => (n > 1 ? `<small>${n}×</small>` : '') + this.iIcon(i, false, 'lg')).join('<i class="op">+</i>')}<i class="op">=</i>${r.n > 1 ? `<small>${r.n}×</small>` : ''}${this.iIcon(r.out, false, 'lg')}</div>
      <p>${esc(t('event.discover', { recipe: rid }))}</p><p class="mute">${esc(t('ui.eurekaNote'))}</p><button class="btn main">${esc(t('ui.great'))}</button></div>`;
    o.classList.add('on'); clearTimeout(this._ovT); this._ovT = setTimeout(() => { if (o.querySelector('.rcard')) { o.innerHTML = ''; o.classList.remove('on'); } }, 6500);
  }
  openCrate(i) {
    const res = this.sim.openCrate(i); if (!res) return;
    this.renderPanel(true);
    const o = this.el.overlay; this.app.sound?.play('crate');
    this.app.view.fx.crateOpen(this.app.focusPoint(0));
    const vars = { money: res.money, secs: res.secs, color: res.color, n: res.n };
    const icon = { geld: '💰', turbo: '⚡', gutschein: '🎟️', farbe: '🎨', goldregen: '🌟', patent: '📜' }[res.kind] || '🎁';
    o.innerHTML = `<div class="crate-open" data-act="overlay-close"><div class="cbox"><span class="lid"></span><span class="body">🎁</span></div>
      <div class="reveal panel"><span class="ico">${icon}</span><h2>${esc(name('crate', res.kind))}</h2><p>${esc(t('crate.open.' + res.kind, vars))}</p>
      ${res.kind === 'farbe' ? `<span class="sw big" style="background:${COLORS[res.color]?.color}"></span>` : ''}<button class="btn main">${esc(t('ui.great'))}</button></div></div>`;
    o.classList.add('on');
    setTimeout(() => { if (res.kind === 'goldregen' || res.kind === 'patent' || res.kind === 'turbo') this.app.sound?.play('jackpot'); else this.app.sound?.play('coin', { combo: 1 }); }, 1150);
    clearTimeout(this._ovT); this._ovT = setTimeout(() => { if (o.querySelector('.crate-open')) { o.innerHTML = ''; o.classList.remove('on'); } }, 6000);
    if (res.kind === 'farbe') this.app.view.applyDeco();
  }

  // =====================================================================================================
  // Dialoge (eigene, keine nativen)
  // =====================================================================================================
  modal({ title, html = '', buttons = [{ label: t('ui.ok'), value: true, cls: 'main' }], cls = '' }) {
    return new Promise(res => {
      const wrap = document.createElement('div'); wrap.className = 'mback';
      wrap.innerHTML = `<div class="modal panel ${cls}" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><div class="mb">${html}</div><div class="row end mbt">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-mi="${i}">${esc(b.label)}</button>`).join('')}</div></div>`;
      const done = v => { wrap.remove(); this._modalDone = null; res(v); };
      wrap.addEventListener('click', e => { const b = e.target.closest('[data-mi]'); if (b) { this.app.sound?.play('click'); done(buttons[+b.dataset.mi].value); } else if (e.target === wrap) done(null); });
      this.el.modals.appendChild(wrap); this._modalDone = done;
      setTimeout(() => wrap.querySelector('.mbt .btn:last-child')?.focus(), 30);
    });
  }
  confirm(title, text, yes = t('ui.ok'), cls = 'main') { return this.modal({ title, html: `<p>${esc(text)}</p>`, buttons: [{ label: t('ui.cancel'), value: false, cls: 'ghost' }, { label: yes, value: true, cls }] }); }
  closeModals() { for (const m of [...this.el.modals.children]) m.remove(); this._modalDone = null; }
  get modalOpen() { return this.el.modals.children.length > 0; }
  escape() {
    if (this.el.overlay.classList.contains('on')) { this.act('overlay-close', {}); return true; }
    if (this._modalDone) { this._modalDone(null); return true; }
    if (this.el.modals.children.length) { this.closeModals(); return true; }
    if (this.panel) { this.closePanel(); return true; }
    return false;
  }
  offlineModal(res) {
    return this.modal({ title: '🌙 ' + t('ui.offlineTitle'), cls: 'offline', html: `<div class="off"><span class="big">💰</span><p>${esc(t('offline.welcome', res))}</p><b class="amt">+${fmtNum(res.money)}</b></div>`, buttons: [{ label: t('ui.great'), value: true, cls: 'main' }] });
  }

  // =====================================================================================================
  // Bild für Bild
  // =====================================================================================================
  frame(dt) {
    const sim = this.sim, view = this.app.view, stage = this.app.stage;
    // Sprechblasen + Hinweis-Pfeil
    const now = performance.now();
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i], p = view.anchor(b.who);
      if (now > b.until || (!p && now > b.until - 3000)) { b.el.remove(); this.bubbles.splice(i, 1); continue; }
      if (!p) { b.el.style.display = 'none'; continue; }
      const s = stage.screenPos(p); b.el.style.display = s.visible ? '' : 'none'; b.el.style.transform = `translate(${s.x.toFixed(0)}px, ${s.y.toFixed(0)}px)`;
    }
    this._pointer();
    if (this.mode !== 'play' || !sim || this.app.media) return;
    // Handy: Toasts direkt über dem obersten unteren Element (Bauleiste, Werkzeugzeile, Info-Panel)
    if (innerWidth <= 760 && !this.panel) {
      let top = innerHeight;
      for (const el of [this.el.bar, this.el.toolbar, this.el.info]) if (el === this.el.bar || el.classList.contains('on')) top = Math.min(top, el.getBoundingClientRect().top);
      const b = Math.round(innerHeight - top + 10) + 'px'; if (this.el.toasts.style.bottom !== b) this.el.toasts.style.bottom = b;
    } else if (this.el.toasts.style.bottom) this.el.toasts.style.bottom = '';
    // Geld zählt hoch
    const S = sim.S, m = S.money, d = m - this.shown;
    this.shown = Math.abs(d) < 1 ? m : this.shown + d * Math.min(1, dt * 7);
    const txt = fmtNum(this.shown); if (this.el.money.textContent !== txt) { this.el.money.textContent = txt; if (d > Math.max(50, m * .02)) this._pop(this.el.money); }
    this.rpShown += (S.rp - this.rpShown) * Math.min(1, dt * 6); const rt = fmtNum(this.rpShown); if (this.el.rp.textContent !== rt) this.el.rp.textContent = rt;
    this.tick += dt; if (this.tick < .25) return; this.tick = 0;
    this.el.income.textContent = t('ui.perSec', { n: fmtRate(sim.incomeRate()) });
    // Boosts
    const bs = [];
    if (S.boosts.turbo > 0) bs.push(`<span class="chip boost turbo">⚡ ${esc(t('ui.turbo'))} <b>${esc(fmtTime(S.boosts.turbo))}</b></span>`);
    if (S.boosts.goldrain > 0) bs.push(`<span class="chip boost gold">🌟 ${esc(t('ui.goldrain'))} <b>${S.boosts.goldrain}</b></span>`);
    if (S.vouchers > 0) bs.push(`<span class="chip boost">🎟️ <b>${S.vouchers}</b></span>`);
    const g = sim.gerald(); if (g && g.phase === 'sit') bs.push(`<span class="chip boost warn">🛋️ ${esc(t('ui.geraldSits'))} <b>${Math.ceil(g.sitLeft)}</b></span>`);
    const ch = this.app.meta?.challenge?.(); if (ch) bs.unshift(`<span class="chip boost chal" data-act="panel" data-p="challenge">🏁 <b>${ch.done ? esc(t('ui.chalOver')) : clock(ch.left)}</b></span>`);
    if (sim.S.powerGrace > 0 && sim.offgrid?.length) bs.push(`<span class="chip boost warn" data-act="overlay" data-k="power">⚡ ${esc(t('ui.graceShort'))} <b>${clock(sim.S.powerGrace)}</b></span>`);
    const bh = bs.join(''); if (this.el.boosts._h !== bh) { this.el.boosts.innerHTML = bh; this.el.boosts._h = bh; }
    const tt = S.deco.title ? name('title', S.deco.title) : ''; if (this.el.title.textContent !== tt) this.el.title.textContent = tt;
    const badge = this.el.side.querySelector('[data-p="crates"] .badge'); if (badge) { const c = S.crates.length; badge.textContent = c || ''; badge.classList.toggle('on', c > 0); }
    const ready = S.contracts.some(c => c.done) || (S.daily && S.daily.done && !S.daily.claimed);
    this.el.side.querySelector('[data-p="contracts"]')?.classList.toggle('ready', ready);
    this.el.side.querySelector('[data-p="prestige"]')?.classList.toggle('ready', sim.canPrestige());
    this._barUpdate();
    this.renderPanel(false); this.renderInfo(false); this.renderTut(false);
    this._frame2(dt);
  }
  _pop(el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  _pointer() {
    let el = this._ptrEl; const want = this.mode === 'play' ? this.tutPoint : null;
    if (!want) { if (el) el.style.display = 'none'; return; }
    if (!el) { el = this._ptrEl = document.createElement('div'); el.className = 'pointer'; el.innerHTML = '<div class="in">👇</div>'; this.el.anchors.appendChild(el); }
    let p = null; const sim = this.sim;
    if (want === 'sell') { const s = sim.S.ents.find(e => e.type === 'verkauf'); if (s) p = [s.x + 1, 1.9, s.y + 1]; }
    else if (want === 'deposit') { const o = START_PLOT * PLOT; p = sim.at(o + 11, o + 2) ? [o + 2.5, .5, o + 2.5] : [o + 12, .5, o + 3]; }
    if (!p) { el.style.display = 'none'; return; }
    const s = this.app.stage.screenPos(p); el.style.display = s.visible ? '' : 'none'; el.style.transform = `translate(${s.x.toFixed(0)}px, ${s.y.toFixed(0)}px)`;
  }
}
Object.assign(UI.prototype, MetaUI, ToolsUI);
