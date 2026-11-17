// Cogtopia – Werkzeug-Oberfläche (Mixin für UI): Werkzeugzeile (Band L-Form/Wegsuche, Blaupause, Drohnen verknüpfen), Menü (☰),
// Blaupausen-Bibliothek + Codes, Überlagerungs-Karte (Stromnetze, Engpass-Liste), Fotomodus, Zeitraffer-Export, Texteingabe-Dialog.
import { t, name, fmtNum } from '../i18n.js';
import { BUILDINGS, ACHIEVEMENTS } from '../data.js';
import { PHOTO_FILTERS } from '../stage.js';
import { encodeBp, decodeBp } from '../blueprint.js';
import * as storage from '../storage.js';
import * as media from '../media.js';
import { esc, clamp, pct, copyText, PANEL_ICON, MENU } from './common.js';

const BP_COL = { belt: '#3b3f46', tunnel: '#55606a', split: '#6a7a8a', sort: '#6a7a8a', drill: '#b07a3a', machine: '#c8743a', exp: '#8a6ad8', lab: '#6a4aa8', store: '#a0673f', power: '#5a5e72', solar: '#3a78c8', mast: '#888', heater: '#e0703a', drone: '#2a9d8f' };
const FILTER_ICON = { normal: '◯', warm: '🌅', cool: '❄️', noir: '🎞️', vivid: '🌈' };

export const ToolsUI = {
  // ===================================================================================== Klicks
  async _actTools(a, d) {
    const app = this.app, sim = this.sim;
    switch (a) {
      // Blaupausen
      case 'bp-lib': this.openPanel('blueprints'); return true;
      case 'bp-save': await this.bpSaveDialog(); return true;
      case 'bp-place': app.pasteBp(); return true;
      case 'bp-rot': app.rotateTool(); return true;
      case 'bp-drop': app.bpHand = null; app.bpAt = null; this.setTool('bp'); app.refreshGhost(); return true;
      case 'bp-use': { const it = storage.bpList().find(x => x.id === d.id), B = it && decodeBp(it.code); if (!B) { this.toast(t('ui.bpCodeBad'), 'err'); return true; } this.closePanel(); app.holdBp(B); this.toast('📐 ' + t('ui.bpInHand', { name: it.name || t('ui.bp') }), 'ok'); return true; }
      case 'bp-copy': {
        const code = d.id === 'hand' ? encodeBp(app.bpHand) : storage.bpList().find(x => x.id === d.id)?.code; if (!code) return true;
        this._lastCode = code; const ok = await copyText(code);
        if (ok) this.toast('📋 ' + t('ui.bpCopied'), 'ok');
        this.modal({ title: '🔗 ' + t('ui.bpCode'), html: `<p>${esc(t(ok ? 'ui.bpCodeNote' : 'ui.bpCodeManual'))}</p><textarea class="inp code" readonly rows="3">${esc(code)}</textarea>`, buttons: [{ label: t('ui.close'), value: null, cls: 'main' }] });
        setTimeout(() => { const ta = this.el.modals.querySelector('textarea.code'); ta?.select(); }, 40);
        return true;
      }
      case 'bp-rename': { const it = storage.bpList().find(x => x.id === d.id); if (!it) return true; const v = await this.ask({ title: '✏️ ' + t('ui.bpRename'), value: it.name, ok: t('ui.save') }); if (v !== null) { storage.bpRename(it.id, v.trim() || it.name); this.renderPanel(true); } return true; }
      case 'bp-del': { if (await this.confirm(t('ui.delete'), t('ui.bpDelQ'), t('ui.delete'), 'danger')) { storage.bpDelete(d.id); this.renderPanel(true); this.toast('🗑️ ' + t('ui.bpDeleted'), 'mute'); } return true; }
      case 'bp-load': {
        const ta = this.root.querySelector('textarea.bpcode'), v = ta ? ta.value : '', B = decodeBp(v); this._bpIn = v;
        if (!B) { this._bpErr = v.trim() ? t('ui.bpCodeBad') : t('ui.bpCodeEmpty'); this.renderPanel(true); app.sound?.play('error', { gain: .4 }); return true; }
        this._bpErr = null; this._bpIn = ''; this.closePanel(); app.holdBp(B); this.toast('📐 ' + t('ui.bpLoaded', { n: B.ents.length }), 'ok'); return true;
      }
      // Fotomodus
      case 'photo': this.closePanel(); app.photo(true); return true;
      case 'photo-exit': app.photo(false); return true;
      case 'photo-save': app.savePhoto(); return true;
      case 'photo-filter': this._ph.filter = d.v; app.photo(true, this.photoOpts()); this._photoRender(); return true;
      case 'photo-min': this.el.photo.classList.toggle('min'); return true;
      case 'photo-reset': this._ph = null; app.photo(true, this.photoOpts()); app.photoTilt(.5); this._photoRender(); return true;
      // Zeitraffer
      case 'tl-secs': this.tlSecs = +d.v; this.renderPanel(true); return true;
      case 'tl-start': this.closePanel(); app.timelapse({ secs: this.tlSecs || 24 }); return true;
      case 'media-cancel': media.cancel(); return true;
      case 'media-close': this.el.media.classList.remove('on'); this.el.media.innerHTML = ''; if (this._tlUrl) { URL.revokeObjectURL(this._tlUrl); this._tlUrl = null; } return true;
      case 'media-dl': if (this._tlRes) media.download(this._tlRes.blob, this._tlRes.file); return true;
      case 'ovl-off': app.setOverlay(d.k, false); return true;
    }
    return false;
  },

  // ===================================================================================== Werkzeugzeile
  _toolbarHtml(tool) {
    const app = this.app, sim = this.sim, X = `<button class="btn small ghost" data-act="${tool ? 'cancelTool' : 'link-cancel'}">✕ <kbd>Esc</kbd></button>`;
    if (!tool && app.linkFrom) return `<span class="im"><span class="emo">🚁</span></span><span class="tx"><b>${esc(t('ui.linkTitle'))}</b><small>${esc(t('ui.linkPick'))}</small></span>${X}`;
    if (tool === 'remove') return `<span class="im"><span class="emo">🧨</span></span><span class="tx"><b>${esc(t('ui.remove'))}</b><small>${esc(t('ui.hint.remove'))}</small></span>${X}`;
    if (tool === 'bp') {
      const B = app.bpHand;
      if (!B) return `<span class="im"><span class="emo">📐</span></span><span class="tx"><b>${esc(t('ui.bp'))}</b><small>${esc(t('ui.hint.bpSelect'))}</small></span><button class="btn small" data-act="bp-lib">📚 ${esc(t('ui.bpLib'))}</button>${X}`;
      const touch = matchMedia('(pointer: coarse)').matches;
      return `<span class="im"><span class="emo">📐</span></span><span class="tx"><b>${esc(t('ui.bp'))} · ${B.w}×${B.h} · <span class="bpc">${esc(t('ui.bpParts', { n: B.ents.length }))}</span></b><small>${esc(t(touch ? 'ui.hint.bpPasteTouch' : 'ui.hint.bpPaste'))}</small></span>
        <div class="tbb">${touch ? `<button class="btn small main" data-act="bp-place" ${app.bpAt ? '' : 'disabled'}>✓ ${esc(t('ui.bpPlace'))}</button>` : ''}<button class="btn small" data-act="bp-rot">⟳ <kbd>R</kbd></button><button class="btn small" data-act="bp-save">💾 ${esc(t('ui.save'))}</button><button class="btn small" data-act="bp-copy" data-id="hand">🔗 ${esc(t('ui.bpCode'))}</button><button class="btn small ghost" data-act="bp-drop" title="${esc(t('ui.bpDrop'))}">↺</button>${X}</div>`;
    }
    const hk = tool === 'band' ? 'belt' : tool === 'bohrer' ? 'drill' : tool === 'tunnel' ? 'tunnel' : 'build';
    let h = `<span class="im">${this.bIcon(tool)}</span><span class="tx"><b>${esc(name('building', tool))} · ${this.coin(sim.costOf(tool))}</b><small>${esc(t(tool === 'band' && app.settings.beltMode === 'route' ? 'ui.hint.route' : 'ui.hint.' + hk))}</small></span>`;
    if (tool === 'band') h += `<div class="seg mini" title="${esc(t('ui.beltDrag'))}"><button class="${app.settings.beltMode !== 'route' ? 'on' : ''}" data-act="route" data-v="l">⌐ ${esc(t('ui.routeL'))}</button><button class="${app.settings.beltMode === 'route' ? 'on' : ''}" data-act="route" data-v="route">⤳ ${esc(t('ui.route'))} <kbd>F</kbd></button></div>`;
    return h + `<button class="btn small" data-act="rotate">⟳ <kbd>R</kbd></button>${X}`;
  },
  bpCost(c) {
    const el = this.el.toolbar.querySelector('.bpc'); if (!el) return;
    const h = this.coin(c.cost); if (el._h !== h) { el.innerHTML = h; el._h = h; } el.classList.toggle('bad', !c.ok);
    const pb = this.el.toolbar.querySelector('[data-act="bp-place"]'); if (pb) pb.disabled = !this.app.bpAt;
  },
  async bpSaveDialog() {
    const B = this.app.bpHand; if (!B) return;
    const n = storage.bpList().length + 1, v = await this.ask({ title: '💾 ' + t('ui.bpSave'), text: t('ui.bpSaveNote'), value: t('ui.bpDefault', { n }), placeholder: t('ui.bpNamePh'), ok: t('ui.save') });
    if (v === null) return;
    const id = storage.bpSave(v.trim() || t('ui.bpDefault', { n }), encodeBp(B), { w: B.w, h: B.h, n: B.ents.length });
    this.toast(id ? '💾 ' + t('ui.bpSaved', { name: v.trim() || t('ui.bpDefault', { n }) }) : t('ui.saveFail'), id ? 'ok' : 'err');
    if (this.panel === 'blueprints') this.renderPanel(true);
  },
  // eigener Texteingabe-Dialog (statt prompt) → Text | null
  async ask({ title, text = '', value = '', placeholder = '', ok = t('ui.ok') }) {
    const p = this.modal({ title, html: `${text ? `<p>${esc(text)}</p>` : ''}<input class="inp ask" maxlength="40" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="off">`, buttons: [{ label: t('ui.cancel'), value: null, cls: 'ghost' }, { label: ok, value: true, cls: 'main' }] });
    const wrap = this.el.modals.lastElementChild, inp = wrap?.querySelector('input.ask');
    if (inp) { setTimeout(() => { inp.focus(); inp.select(); }, 40); inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); wrap.querySelector('.mbt .btn.main')?.click(); } }); }
    const r = await p; return r ? (inp ? inp.value : '') : null;
  },
  // kleine Vorschau einer Blaupause (SVG)
  bpSvg(B) {
    if (!B) return '';
    const W = B.w, H = B.h, s = 100 / Math.max(W, H);
    const r = B.ents.map(e => { const d = BUILDINGS[e.type]; if (!d) return ''; const c = BP_COL[d.kind] || '#c8743a';
      return `<rect x="${(e.dx * s).toFixed(1)}" y="${(e.dy * s).toFixed(1)}" width="${(d.w * s - .6).toFixed(1)}" height="${(d.h * s - .6).toFixed(1)}" rx="${d.w > 1 ? 2 : .6}" fill="${c}"/>`; }).join('');
    return `<svg viewBox="-2 -2 ${(W * s + 4).toFixed(1)} ${(H * s + 4).toFixed(1)}" class="bpsvg"><rect x="-2" y="-2" width="${(W * s + 4).toFixed(1)}" height="${(H * s + 4).toFixed(1)}" rx="4" fill="#efe0c0"/>${r}</svg>`;
  },

  // ===================================================================================== Menü
  _p_menu() {
    const app = this.app, sim = this.sim, m = app.meta, today = app.today(), chal = app.inChallenge();
    const sub = {
      stats: t('ui.perSec', { n: fmtNum(sim.incomeRate()) }), achievements: `${sim.S.ach.length} / ${Object.keys(ACHIEVEMENTS).length}`,
      album: m.f ? t('album.progress', m.album()) : '', plots: `${sim.S.plots.length}`, wonder: sim.S.total.prestiges >= 1 ? (sim.wonder().done ? '✓' : t('ui.wonderStage', { n: sim.wonder().stage, total: sim.wonder().stages })) : '🔒',
      prestige: chal ? '🔒' : sim.canPrestige() ? '✓' : `${pct(sim.S.stats.earned / 1e6)} %`, wheel: chal ? '🔒' : m.canSpin(today) ? t('ui.ready') : '✓', streak: chal ? '🔒' : m.canCheckIn(today) ? t('ui.ready') : t('streak.len', { n: m.streakInfo(today).len }),
      challenge: chal ? t('ui.running') : app.week(), blueprints: `${storage.bpList().length}`, photo: 'K', timelapse: '9:16', settings: '', game: '',
    };
    const ready = { wheel: !chal && m.canSpin(today), streak: !chal && m.canCheckIn(today), prestige: !chal && sim.canPrestige() };
    return MENU.map(([g, list]) => `<h3>${esc(t('ui.menu.' + g))}</h3><div class="mtiles">${list.map(p => `<button class="mt ${ready[p] ? 'ready' : ''}" data-act="${p === 'photo' ? 'photo' : 'panel'}" data-p="${p}"><span class="mi">${p === 'photo' ? '📷' : PANEL_ICON[p]}</span><b>${esc(t('ui.p.' + p))}</b><small>${esc(sub[p] || '')}</small></button>`).join('')}</div>`).join('');
  },

  // ===================================================================================== Blaupausen
  _p_blueprints() {
    const app = this.app, list = storage.bpList();
    let h = `<p class="note">${esc(t('ui.bpNote'))}</p><div class="row"><button class="btn main" data-act="tool" data-b="bp">📐 ${esc(t('ui.bpNew'))} <kbd>B</kbd></button>${app.bpHand ? `<button class="btn" data-act="bp-save">💾 ${esc(t('ui.bpSaveHand'))}</button>` : ''}</div>`;
    h += list.length ? `<div class="bps">${list.map(it => { const B = decodeBp(it.code);
      return `<div class="bpi">${this.bpSvg(B)}<div class="bpt"><b>${esc(it.name || t('ui.bp'))}</b><small>${B ? `${B.w}×${B.h} · ${esc(t('ui.bpParts', { n: B.ents.length }))}` : esc(t('ui.bpCodeBad'))}</small>
        <div class="bpa"><button class="btn small main" data-act="bp-use" data-id="${esc(it.id)}" ${B ? '' : 'disabled'}>📐 ${esc(t('ui.bpUse'))}</button><button class="btn small" data-act="bp-copy" data-id="${esc(it.id)}" title="${esc(t('ui.bpCode'))}">🔗</button><button class="btn small" data-act="bp-rename" data-id="${esc(it.id)}" title="${esc(t('ui.bpRename'))}">✏️</button><button class="btn small ghost" data-act="bp-del" data-id="${esc(it.id)}" title="${esc(t('ui.delete'))}">🗑️</button></div></div></div>`; }).join('')}</div>`
      : `<div class="emptybox"><span class="big">📐</span><p>${esc(t('ui.bpEmpty'))}</p></div>`;
    h += `<h3>${esc(t('ui.bpImport'))}</h3><textarea class="inp bpcode" rows="2" placeholder="COG1:…" spellcheck="false">${esc(this._bpIn || '')}</textarea>
      ${this._bpErr ? `<p class="warn">${esc(this._bpErr)}</p>` : ''}<div class="row end"><button class="btn" data-act="bp-load">⬆️ ${esc(t('ui.bpCodeLoad'))}</button></div>`;
    return h;
  },

  // ===================================================================================== Überlagerungs-Karte
  renderOverlay(force = false) {
    const app = this.app, sim = this.sim, el = this.el.ovl, on = app.ov || {};
    if (!sim || this.mode !== 'play' || app.photoOn || (!on.power && !on.issues)) { if (el.classList.contains('on')) { el.classList.remove('on'); el.innerHTML = ''; } this._ovlSig = ''; return; }
    if (!force && this.ptrDown) return;
    let h = '';
    if (on.power) {
      const nets = sim.powerInfo();
      h += `<div class="ovs"><div class="ovh"><b>⚡ ${esc(t('ui.ovPower'))}</b><button class="btn icon small ghost" data-act="ovl-off" data-k="power" aria-label="${esc(t('ui.close'))}">✕</button></div>`;
      h += nets.length ? nets.slice(0, 6).map((n, i) => { const s = n.demand > 0 ? Math.min(1, n.supply / n.demand) : 1;
        return `<div class="net ${s < 1 ? 'low' : ''}"><span>${esc(t('ui.gridN', { n: i + 1 }))}</span><div class="bar thin ${s < 1 ? '' : 'green'}"><i style="width:${pct(s)}%"></i></div><b>${fmtNum(n.supply)} / ${fmtNum(n.demand)} · ${pct(s)} %</b></div>`; }).join('')
        : `<p class="note">${esc(t('ui.noGrids'))}</p>`;
      const off = (sim.offgrid || []).length; if (off) h += `<p class="warn">⚡ ${esc(t('ui.offgrid', { n: off }))}</p>`;
      h += '</div>';
    }
    if (on.issues) {
      const list = sim.bottlenecks(6);
      h += `<div class="ovs"><div class="ovh"><b>🩺 ${esc(t('ui.ovIssues'))}</b><button class="btn icon small ghost" data-act="ovl-off" data-k="issues" aria-label="${esc(t('ui.close'))}">✕</button></div>`;
      h += list.length ? list.map(b => { const n = sim.N.get(b.id); if (!n) return '';
        return `<button class="iss s${b.sev >= 2.5 ? 3 : b.sev >= 1.5 ? 2 : 1}" data-act="fly-ent" data-id="${b.id}">${this.bIcon(n.e.type, 'sm')}<span><b>${esc(name('building', n.e.type))}</b><small>${esc(t(b.key, b.vars))}</small></span></button>`; }).join('')
        : `<p class="note">✅ ${esc(t('ui.noIssues'))}</p>`;
      h += '</div>';
    }
    if (h === this._ovlSig && !force) return;
    this._ovlSig = h; el.innerHTML = h; el.classList.add('on');
  },

  // ===================================================================================== Fotomodus
  photoOpts() { const P = this._ph ||= { tiltShift: .65, focus: .45, blur: 8, band: .12, vignette: .45, filter: 'normal', tilt: .5 }; return { tiltShift: P.tiltShift, focus: P.focus, blur: P.blur, band: P.band, vignette: P.vignette, filter: P.filter }; },
  _photoSet(k, v) {
    const P = this._ph ||= {}; this.photoOpts();
    if (k === 'tilt') { P.tilt = +v / 100; this.app.photoTilt(P.tilt); return; }
    if (k === 'blur') P.blur = +v; else P[k] = +v / 100;
    this.app.photo(true, this.photoOpts());
  },
  setPhoto(on) {
    this.root.classList.toggle('photo-on', on);
    if (!on) { this.el.photo.classList.remove('on', 'min'); this.el.photo.innerHTML = ''; this.renderTut(true); this.renderOverlay(true); return; }
    this.el.btip.classList.remove('on'); this.cursorTip(0, 0, null); this.renderTut(true); this.renderOverlay(true);
    this._photoRender(); this.el.photo.classList.add('on');
  },
  _photoRender() {
    const P = this._ph || {}, sl = (k, v, min = 0, max = 100) => `<label class="psl"><span>${esc(t('ui.photo.' + k))}</span><input type="range" min="${min}" max="${max}" value="${Math.round(v)}" data-set="ph.${k}"></label>`;
    this.el.photo.innerHTML = `<div class="ph panel"><div class="phh"><b>📷 ${esc(t('ui.p.photo'))}</b><small>${esc(t('ui.photo.hint'))}</small><button class="btn icon small ghost" data-act="photo-min" aria-label="${esc(t('ui.photo.hide'))}">▾</button></div>
      <div class="phb">${sl('tiltShift', (P.tiltShift ?? .65) * 100)}${sl('focus', (P.focus ?? .45) * 100)}${sl('blur', P.blur ?? 8, 0, 30)}${sl('vignette', (P.vignette ?? .45) * 100)}${sl('tilt', (P.tilt ?? .5) * 100)}
      <div class="seg wrap pf">${PHOTO_FILTERS.map(f => `<button class="${(P.filter || 'normal') === f ? 'on' : ''}" data-act="photo-filter" data-v="${f}">${FILTER_ICON[f] || ''} ${esc(t('ui.photo.f.' + f))}</button>`).join('')}</div></div>
      <div class="row phf"><button class="btn small ghost" data-act="photo-reset">↺</button><span class="grow"></span><button class="btn small" data-act="photo-exit">✕ ${esc(t('ui.photo.exit'))} <kbd>Esc</kbd></button><button class="btn main" data-act="photo-save">📸 ${esc(t('ui.photo.save'))}</button></div></div>`;
  },

  // ===================================================================================== Zeitraffer
  _p_timelapse() {
    const sim = this.sim, mime = media.videoMime(), secs = this.tlSecs || 24, n = sim.S.ents.length;
    return `<div class="tl"><div class="tlprev"><span>🎬</span><b>9:16</b><small>1080 × 1920</small></div><div class="tlb">
      <p>${esc(t('ui.tl.note'))}</p>
      <div class="set"><label>${esc(t('ui.tl.length'))}</label><div class="seg">${[20, 25, 30].map(v => `<button class="${secs === v ? 'on' : ''}" data-act="tl-secs" data-v="${v}">${v} s</button>`).join('')}</div></div>
      <div class="kvs"><div class="kv"><span>${esc(t('ui.tl.format'))}</span><b>${mime ? (mime.startsWith('video/mp4') ? 'MP4' : 'WebM') : '—'}</b></div><div class="kv"><span>${esc(t('ui.tl.steps'))}</span><b>${fmtNum(sim.history().length || n)}</b></div></div>
      ${mime ? '' : `<p class="warn">${esc(t('ui.tl.unsupported'))}</p>`}${n ? '' : `<p class="warn">${esc(t('ui.tl.empty'))}</p>`}
      <div class="row end"><button class="btn main big" data-act="tl-start" ${mime && n ? '' : 'disabled'}>🎬 ${esc(t('ui.tl.start'))}</button></div></div></div>`;
  },
  mediaStart() {
    const el = this.el.media; this.closePanel(); this.closeModals();
    el.innerHTML = `<div class="mbox panel"><div class="mh"><b>🎬 ${esc(t('ui.tl.recording'))}</b><small>${esc(t('ui.tl.wait'))}</small></div><canvas class="mprev" width="270" height="480"></canvas>
      <div class="bar big gold"><i style="width:0%"></i><span>0 %</span></div><div class="row end"><button class="btn ghost" data-act="media-cancel">✕ ${esc(t('ui.cancel'))} <kbd>Esc</kbd></button></div></div>`;
    el.classList.add('on'); this._mprevN = 0;
  },
  mediaProgress(p, rec) {
    const el = this.el.media, bar = el.querySelector('.bar i'), sp = el.querySelector('.bar span'), cv = el.querySelector('canvas.mprev');
    if (bar) bar.style.width = (p * 100).toFixed(1) + '%'; if (sp) sp.textContent = Math.round(p * 100) + ' %';
    if (cv && rec && (this._mprevN++ % 2 === 0)) cv.getContext('2d').drawImage(rec, 0, 0, cv.width, cv.height);
  },
  mediaEnd() { if (!this._tlKeep) { /* Ergebnis folgt in mediaDone */ } },
  mediaDone(res) {
    const el = this.el.media; this._tlRes = res; if (this._tlUrl) URL.revokeObjectURL(this._tlUrl); this._tlUrl = URL.createObjectURL(res.blob);
    el.innerHTML = `<div class="mbox panel done"><div class="mh"><b>🎉 ${esc(t('ui.tl.done'))}</b><small>${esc(res.file)} · ${(res.bytes / 1048576).toFixed(1)} MB</small></div>
      <video class="mvid" src="${this._tlUrl}" controls loop muted playsinline></video>
      <div class="row end"><button class="btn ghost" data-act="media-close">${esc(t('ui.close'))}</button><button class="btn main" data-act="media-dl">⬇️ ${esc(t('ui.tl.download'))}</button></div></div>`;
    el.classList.add('on');
  },
};

