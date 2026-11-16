// Cogtopia – Verdrahtung: Bühne, Kamera, Ton, Sim, Ansicht und Oberfläche; feste Sim-Schritte (20/s) mit Akkumulator,
// Rendern mit alpha, Eingabe (Bauen, Bänder ziehen, Abriss, Pipette, Tasten), Spielstände, Autosave, Offline-Zeit.
import * as THREE from 'three';
import { Stage } from './stage.js';
import { CameraRig } from './camera.js';
import { Sound } from './audio.js';
import { setItemLook } from './models/items.js';
import { ITEMS, ITEM_IDS, BUILDINGS, BUILDING_IDS, TUTORIAL } from './data.js';
import { Factory, DT, TPS, PLOT, START_PLOT, DX, DY, MAP } from './sim.js';
import * as storage from './storage.js';
import { t, fmtNum, onLang, getLang } from './i18n.js';
import { View, renderIcons } from './view.js';
import { UI, HOTKEYS } from './ui.js';
import { beltKind } from './models/buildings.js';
import * as bp from './blueprint.js';

setItemLook(ITEMS);                                     // Farben/Formen der Teile aus data.js (vor dem ersten ItemRenderer)

const canvas = document.getElementById('c');
const coarse = matchMedia('(pointer: coarse)').matches;
const settings = {
  quality: storage.getSetting('quality', coarse ? 'mittel' : 'hoch'), grid: storage.getSetting('grid', 'build'),
  music: storage.getSetting('music', true), musicVol: storage.getSetting('musicVol', .45), sfxVol: storage.getSetting('sfxVol', .8),
};
const stage = new Stage(canvas, { quality: settings.quality });
const rig = new CameraRig(stage.camera, canvas, { minDist: 7, maxDist: 95 });
const sound = new Sound({ music: settings.musicVol, sfx: settings.sfxVol, musicOn: settings.music });
const view = new View(stage, { sound });
view.setGrid(settings.grid, false);

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const START = START_PLOT * PLOT + 8;                   // Mitte der Start-Verkaufsstation
// Startabstand: im Hochformat weiter weg, damit das Startgrundstück ins Bild passt
const startDist = (d = 26) => d * Math.min(1.7, Math.max(1, .95 / Math.max(.3, stage.width / stage.height)));

// =====================================================================================================
// App: Zustand + Befehle für die Oberfläche
// =====================================================================================================
const app = {
  stage, rig, sound, view, settings, sim: null, menuSim: null, mode: 'boot', tool: null, rot: 0, fps: 0,
  setTool(tool) {
    this.tool = tool || null; drag = null; view.setGhost(null); ui.cursorTip(0, 0, null);
    view.setGrid(undefined, !!this.tool); ui.setTool(this.tool); ui.renderTut(true); refreshGhost();
    canvas.style.cursor = this.tool === 'remove' ? 'crosshair' : '';
  },
  rotateTool() {
    if (this.tool && this.tool !== 'remove') { this.rot = (this.rot + 1) & 3; sound.play('rotate'); refreshGhost(); return; }
    if (ui.selId && this.sim.rotate(ui.selId)) { sound.play('rotate'); ui.renderInfo(true); }
  },
  pipette(id) {
    const e = this.sim.N.get(id)?.e; if (!e) return;
    if (!this.sim.isUnlocked(e.type)) return;
    this.rot = e.rot; this.select(0); this.setTool(e.type); sound.play('click');
  },
  // Undo kann scheitern: nichts mehr da oder (Rückbau kostet) zu wenig Geld → Fehlerton + Hinweis
  undo() {
    const sim = this.sim; if (!sim) return false;
    const had = (sim.undoStack?.length ?? 1) > 0;
    if (sim.undo()) { ui.renderInfo(true); ui.setTool(this.tool); return true; }
    sound.play('error', { gain: .3 }); ui.toast('↶ ' + t(had ? 'ui.undoPoor' : 'ui.undoNone'), 'err'); return false;
  },
  removeEntity(id) { if (this.sim.remove(id)) this.select(0); },
  select(id) { ui.select(id); view.select(id); },
  focusPoint(y = 0) { return [rig.target.x, y, rig.target.z]; },
  async askPlot(cx, cy) {
    const sim = this.sim, c = sim.canBuyPlot(cx, cy);
    if (c.reason === 'known') return;
    if (c.reason === 'locked') { ui.toast('🔒 ' + t('ui.plotLocked'), 'err'); sound.play('error', { gain: .4 }); return; }
    if (!c.ok) { ui.toast(t('reason.money') + ' ' + t('ui.needCoins', { cost: c.cost }), 'err'); sound.play('error', { gain: .4 }); return; }
    const yes = await ui.confirm('🗺️ ' + t('ui.plots'), t('ui.buyPlotQ', { cost: c.cost }), t('ui.buyPlot', { cost: c.cost }));
    if (!yes) return;
    if (sim.buyPlot(cx, cy)) { rig.setBounds(view.bounds()); rig.flyTo(cx * PLOT + 8, cy * PLOT + 8, Math.max(rig.distance, 30)); ui.renderPanel(true); }
  },
  flyToPlot(cx, cy) { rig.flyTo(cx * PLOT + 8, cy * PLOT + 8, Math.max(26, rig.distance)); },
  // ---------- Spiele ----------
  // Fabrik übernehmen. Erst alles vorbereiten (Datum, Ansicht); scheitert etwas, bleibt der alte Zustand und es gibt einen Fehler-Hinweis.
  start(f, { cam = null } = {}) {
    const prev = this.mode === 'play' ? this.sim : null;
    try {
      if (!f || !f.S) throw new Error('no factory');
      f.setToday(today()); f.events();
      view.setSim(f);
    } catch (e) {
      console.warn('start', e);
      try { if (prev) view.setSim(prev); else enterMenu(); } catch (e2) { console.warn('restore', e2); }
      ui.toast(t('ui.loadFail'), 'err'); sound.play('error', { gain: .4 });
      return false;
    }
    this.sim = f; window.__fabrik.sim = f; ui.closePanel(); ui.closeModals();
    rig.enabled = true; rig.setBounds(view.bounds());
    if (cam) rig.restore(cam); else rig.jumpTo(START, START, startDist(), 0);
    this.mode = 'play'; this.tool = null; this.rot = 0; acc = 0;
    ui.setMode('play'); this.setTool(null); this.select(0);
    this.autosave();
    return true;
  },
  // Bevor Laden/Import/Neue Fabrik den laufenden Stand bzw. den Autosave ersetzt: eigene Rückfrage, dann Sicherung in „backup“.
  // skipAsk: die Rückfrage kam schon (z. B. „Neue Fabrik“ im Menü). Rückgabe false = abgebrochen.
  hasCurrent() { const a = storage.info(storage.AUTO); return !!((this.mode === 'play' && this.sim) || (a && !a.empty && !a.broken)); },
  backupCurrent() {
    if (this.mode === 'play' && this.sim) return storage.save(this.sim, storage.BACKUP, this.savedAt());
    return storage.copy(storage.AUTO, storage.BACKUP);
  },
  async guardReplace({ skipAsk = false } = {}) {
    if (!this.hasCurrent()) return true;
    if (!skipAsk && !(await ui.confirm('📂 ' + t('ui.replaceTitle'), t('ui.replaceConfirm'), t('ui.replaceGo')))) return false;
    this.backupCurrent(); return true;
  },
  // „Neue Fabrik“ fragt in der Oberfläche selbst nach; hier nur die Sicherung des bisherigen Stands
  newGame() {
    if (this.hasCurrent()) this.backupCurrent();
    const ok = this.start(new Factory({ seed: (Math.random() * 2 ** 31) >>> 0 || 1, biome: 'wiese' })); if (ok) sound.play('build'); return ok;
  },
  continueGame() {
    const L = storage.load(storage.AUTO); if (!L) { ui.toast(t('ui.loadFail'), 'err'); return; }
    if (!this.start(L.factory, { cam: storage.getSetting('cam', null) })) return;
    const secs = L.savedAt ? (Date.now() - L.savedAt) / 1000 : 0;
    if (secs >= 30) { const r = L.factory.offline(secs); L.factory.events(); if (r.money > 0) { ui.offlineModal(r); sound.play('jackpot'); } }
  },
  async loadSlot(slot) {
    const L = storage.load(slot); if (!L) { ui.toast(t('ui.loadFail'), 'err'); sound.play('error', { gain: .4 }); return false; }
    // Weiterspielen aus dem Menü ersetzt nichts
    if (!(slot === storage.AUTO && this.mode !== 'play') && !(await this.guardReplace())) return false;
    if (!this.start(L.factory)) return false;
    ui.toast('📂 ' + t('ui.loaded'), 'ok'); return true;
  },
  saveSlot(slot) { if (storage.save(this.sim, slot, this.savedAt())) ui.toast('💾 ' + t('ui.saved', { n: slot }), 'ok'); else ui.toast(t('ui.saveFail'), 'err'); },
  // Zeitstempel für Spielstände: im Hintergrund steht die Sim seit hiddenAt → diesen Zeitpunkt speichern, sonst geht Offline-Zeit verloren
  savedAt() { return document.hidden && hiddenAt ? hiddenAt : Date.now(); },
  autosave() { if (this.mode !== 'play' || !this.sim) return false; storage.setSetting('cam', rig.serialize()); return storage.save(this.sim, storage.AUTO, this.savedAt()); },
  exportSave() {
    const text = storage.exportText(this.sim, Date.now()), fn = storage.exportName('cogtopia-' + today());
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = fn;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    ui.toast('⬇️ ' + t('ui.exported', { file: fn }), 'ok');
  },
  async importText(text) {
    const r = storage.importText(text); if (!r) { ui.toast(t('ui.importFail'), 'err'); sound.play('error'); return false; }
    ui.closeModals();
    if (!(await this.guardReplace())) return false;
    if (!this.start(r.factory)) return false;
    ui.closePanel(); ui.toast('⬆️ ' + t('ui.imported'), 'ok'); return true;
  },
  toMenu() { this.autosave(); this.mode = 'menu'; this.setTool(null); this.sim = null; enterMenu(); },
  prestige(biome) {
    const pts = this.sim.prestige(biome); if (!pts && pts !== 0) return;
    ui.closePanel(); this.select(0); this.setTool(null);
    rig.setBounds(view.bounds()); rig.jumpTo(START, START, startDist(30), 0); this.autosave();
  },
  setQuality(q) { settings.quality = q; storage.setSetting('quality', q); stage.setQuality(q); stage.setBiome(view.biome || 'wiese'); },
  setGridMode(m) { settings.grid = m; storage.setSetting('grid', m); view.setGrid(m, !!this.tool); },
  setMusic(on) { settings.music = on; storage.setSetting('music', on); sound.setMusic(on); },
  setVolumes(m, s, persist = true) {
    if (m !== undefined) settings.musicVol = m; if (s !== undefined) settings.sfxVol = s;
    sound.setVolumes(settings.musicVol, settings.sfxVol);
    if (persist) { storage.setSetting('musicVol', settings.musicVol); storage.setSetting('sfxVol', settings.sfxVol); }
  },
};
const ui = new UI(app); app.ui = ui;
window.__fabrik = { sim: null, view, ui, stage, rig, sound, THREE, app, bp, storage };

// =====================================================================================================
// Startmenü mit lebendiger Fabrik
// =====================================================================================================
function enterMenu() {
  if (!app.menuSim) { app.menuSim = bp.buildDemo(new Factory({ seed: 20261116 })); app.menuSim.tick(TPS * 25); app.menuSim.events(); }
  view.setSim(app.menuSim, { menu: true });
  rig.enabled = false; rig.setBounds(null); rig.jumpTo(START - 1, START - 1, startDist(23), 0);
  app.mode = 'menu'; ui.setMode('menu');
}

// =====================================================================================================
// Eingabe
// =====================================================================================================
let hover = null, drag = null, ptrs = new Set(), rbtn = null, mbtn = null;
const ndc = e => { const r = canvas.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1]; };
const dragTool = () => app.tool === 'band' || app.tool === 'remove';
rig.panGate = () => !dragTool();                              // Linksziehen im Band-/Abrissmodus gehört dem Bauen
const footprint = (type, wx, wz) => { const d = BUILDINGS[type]; return [Math.floor(wx - (d.w - 1) / 2), Math.floor(wz - (d.h - 1) / 2)]; };
function tunnelExit(x, y, rot) {
  const sim = app.sim, R = BUILDINGS.tunnel.range;
  for (let k = 1; k <= R; k++) { const n = sim.nodeAt(x - DX[rot] * k, y - DY[rot] * k); if (n && n.e.type === 'tunnel' && n.e.rot === rot) return !n.e.exit && !n.e.link; }
  return false;
}
function reasonText(c, type) {
  if (c.reason === 'money') return `${t('reason.money')} ${t('ui.needCoins', { cost: c.cost })}`;
  if (c.reason === 'research') return '🔒 ' + t('ui.needsResearch', { id: BUILDINGS[type].unlock });
  return t('reason.' + c.reason);
}
// Vorschau unter dem Zeiger neu berechnen
function refreshGhost() {
  const sim = app.sim;
  if (app.mode !== 'play' || !sim) { view.setGhost(null); ui.cursorTip(0, 0, null); return; }
  const tool = app.tool;
  if (drag && drag.kind === 'belt') return beltGhost();
  if (!tool || !hover) {
    view.setGhost(null); ui.cursorTip(0, 0, null);
    if (hover && !tool) { const p = view.pick(hover.nx, hover.ny); canvas.style.cursor = p && (p.kind === 'gerald' || p.kind === 'entity' || (p.kind === 'plot' && sim.plotState(p.cx, p.cy) === 'buyable')) ? 'pointer' : ''; }
    return;
  }
  if (tool === 'remove') {
    const p = view.pick(hover.nx, hover.ny), e = p && p.kind === 'entity' ? sim.N.get(p.id)?.e : null;
    if (e) { const d = BUILDINGS[e.type]; view.setGhost({ remove: [{ x: e.x, y: e.y, w: d.w, h: d.h }] }); tip(`🧨 ${t('building.' + e.type + '.name')}${e.paid ? ` · +${fmtNum(e.paid)}` : ''}`, false); }
    else { view.setGhost(null); tip(null); }
    return;
  }
  const g = view.groundCell(hover.nx, hover.ny); if (!g) { view.setGhost(null); tip(null); return; }
  const [x, y] = footprint(tool, g.wx, g.wz), rot = app.rot, c = sim.canPlace(tool, x, y, rot);
  const exit = tool === 'tunnel' && tunnelExit(x, y, rot);
  view.setGhost({ type: tool, x, y, rot, ok: c.ok, exit });
  if (c.ok) tip(`${t('building.' + tool + '.name')}${c.item ? ' · ⛏ ' + t('item.' + c.item + '.name') : ''}${exit ? ' · ' + t('ui.tunnelExit') : ''} · 🪙 ${fmtNum(c.cost)}`, true);
  else tip(reasonText(c, tool), false);
}
function tip(text, ok = true) {
  if (!hover || hover.touch || !text) { ui.cursorTip(0, 0, null); return; }
  ui.cursorTip(hover.cx, hover.cy, text.replace(/[&<>]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[s])).replace(/🪙 ?/g, '<i class="coin"></i> '), ok);
}
function beltCells() {
  const d = drag; return bp.lPath(d.sx, d.sy, d.x, d.y, d.axis || 'x', app.rot);
}
function beltGhost() {
  const sim = app.sim, cells = beltCells(); let money = sim.S.money, cost = 0, n = 0;
  const line = cells.map(([x, y, rot], i) => {
    const c = sim.canPlace('band', x, y, rot); let ok = c.ok;
    if (ok && c.cost) { if (money >= c.cost) { money -= c.cost; cost += c.cost; } else ok = false; }
    if (ok) n++;
    const prev = cells[i - 1]; return { x, y, rot, ok, kind: prev && prev[2] !== rot ? beltKind(prev[2], rot) : 'straight' };
  });
  view.setGhost({ line });
  if (hover) tip(`${t('ui.beltLine', { n })} · 🪙 ${fmtNum(cost)}`, n > 0);
}
function removeUnder(nx, ny) {
  const p = view.pick(nx, ny); if (!p || p.kind !== 'entity' || drag.removed.has(p.id)) return;
  drag.removed.add(p.id); if (app.sim.remove(p.id)) { if (ui.selId === p.id) app.select(0); }
}
function placeAt(nx, ny) {
  const sim = app.sim, g = view.groundCell(nx, ny); if (!g) return;
  const [x, y] = footprint(app.tool, g.wx, g.wz), c = sim.canPlace(app.tool, x, y, app.rot);
  if (!c.ok) { ui.toast(reasonText(c, app.tool), 'err'); sound.play('error', { gain: .4 }); return; }
  sim.place(app.tool, x, y, app.rot); refreshGhost();
  if (!sim.isUnlocked(app.tool) || sim.S.money < sim.costOf(app.tool)) { /* Werkzeug bleibt, Vorschau zeigt rot */ }
}
function tapWorld(nx, ny) {
  const sim = app.sim; if (!sim || app.mode !== 'play' || ui.modalOpen) return;
  const p = view.pick(nx, ny);
  if (p && p.kind === 'gerald') { if (sim.clickGerald()) view.geraldClicked(); return; }
  if (app.tool && !dragTool()) { placeAt(nx, ny); return; }
  if (app.tool) return;
  if (p && p.kind === 'entity') { app.select(p.id); sound.play('click', { gain: .5 }); return; }
  if (p && p.kind === 'plot') { app.select(0); app.askPlot(p.cx, p.cy); return; }
  app.select(0);
}
rig.onTap = (nx, ny) => tapWorld(nx, ny);

canvas.addEventListener('pointerdown', e => {
  ptrs.add(e.pointerId); sound.unlock();
  if (e.button === 2) rbtn = { x: e.clientX, y: e.clientY };
  if (e.button === 1) { mbtn = { x: e.clientX, y: e.clientY }; }
  if (ptrs.size > 1 && drag) { drag = null; refreshGhost(); return; }   // zweiter Finger: Kamera übernimmt
  if (app.mode !== 'play' || e.button !== 0 || !dragTool() || ptrs.size > 1 || (e.pointerType === 'mouse' && e.shiftKey)) return;
  const [nx, ny] = ndc(e), g = view.groundCell(nx, ny); if (!g) return;
  hover = { nx, ny, cx: e.clientX, cy: e.clientY, touch: e.pointerType !== 'mouse' };
  drag = { id: e.pointerId, kind: app.tool === 'band' ? 'belt' : 'remove', sx: g.x, sy: g.y, x: g.x, y: g.y, axis: null, x0: e.clientX, y0: e.clientY, moved: false, removed: new Set() };
  if (drag.kind === 'remove') { const p = view.pick(nx, ny); if (p && p.kind === 'gerald') { app.sim.clickGerald() && view.geraldClicked(); drag = null; return; } removeUnder(nx, ny); }
  refreshGhost();
});
canvas.addEventListener('pointermove', e => {
  const [nx, ny] = ndc(e);
  if (drag && drag.id === e.pointerId) {
    hover = { nx, ny, cx: e.clientX, cy: e.clientY, touch: e.pointerType !== 'mouse' };
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 6) drag.moved = true;
    if (drag.kind === 'remove') { removeUnder(nx, ny); refreshGhost(); return; }
    const g = view.groundCell(nx, ny); if (!g) return;
    if (g.x !== drag.x || g.y !== drag.y) {
      drag.x = g.x; drag.y = g.y;
      if (g.x === drag.sx && g.y === drag.sy) drag.axis = null;
      else if (!drag.axis) drag.axis = bp.dragAxis(g.x - drag.sx, g.y - drag.sy);
    }
    beltGhost(); return;
  }
  if (e.pointerType === 'mouse' && !e.buttons) { hover = { nx, ny, cx: e.clientX, cy: e.clientY, touch: false }; refreshGhost(); }
  else if (e.pointerType === 'mouse' && hover) { hover.nx = nx; hover.ny = ny; hover.cx = e.clientX; hover.cy = e.clientY; if (app.tool && !dragTool()) refreshGhost(); }
});
const endPtr = e => {
  ptrs.delete(e.pointerId);
  if (e.button === 2 && rbtn && Math.hypot(e.clientX - rbtn.x, e.clientY - rbtn.y) < 6 && app.mode === 'play') { if (drag) drag = null; else if (app.tool) app.setTool(null); else app.select(0); refreshGhost(); }
  if (e.button === 1 && mbtn && Math.hypot(e.clientX - mbtn.x, e.clientY - mbtn.y) < 6 && app.mode === 'play') { const p = view.pick(...ndc(e)); if (p && p.kind === 'entity') app.pipette(p.id); }
  rbtn = e.button === 2 ? null : rbtn; mbtn = e.button === 1 ? null : mbtn;
  if (!drag || drag.id !== e.pointerId) return;
  const d = drag; drag = null;
  if (e.type === 'pointercancel') { refreshGhost(); return; }
  if (d.kind === 'belt') {
    const sim = app.sim, [nx, ny] = ndc(e);
    if (!d.moved && d.x === d.sx && d.y === d.sy) {
      const p = view.pick(nx, ny); if (p && p.kind === 'gerald') { if (sim.clickGerald()) view.geraldClicked(); refreshGhost(); return; }
      const c = sim.canPlace('band', d.sx, d.sy, app.rot);
      if (c.ok) sim.place('band', d.sx, d.sy, app.rot); else { ui.toast(reasonText(c, 'band'), 'err'); sound.play('error', { gain: .4 }); }
    } else {
      const cells = bp.lPath(d.sx, d.sy, d.x, d.y, d.axis || 'x', app.rot);
      const n = sim.placeLine('band', cells);
      if (!n) { const c = sim.canPlace('band', cells[0][0], cells[0][1], cells[0][2]); ui.toast(reasonText(c.ok ? { reason: 'money', cost: 1 } : c, 'band'), 'err'); sound.play('error', { gain: .4 }); }
      app.rot = cells[cells.length - 1][2];
    }
  }
  if (hover && hover.touch) hover = null;
  refreshGhost();
};
addEventListener('pointerup', endPtr); addEventListener('pointercancel', endPtr);
canvas.addEventListener('pointerleave', () => { if (!drag) { hover = null; refreshGhost(); } });

addEventListener('keydown', e => {
  sound.unlock();
  const tag = document.activeElement?.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (e.key === 'Escape') {
    if (ui.escape()) return;
    if (app.mode !== 'play') return;
    if (drag) { drag = null; refreshGhost(); } else if (app.tool) app.setTool(null); else app.select(0);
    return;
  }
  if (app.mode !== 'play' || ui.modalOpen) return;
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); app.undo(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  const k = e.code;
  if (/^(Digit|Numpad)[1-9]$/.test(k)) { const b = HOTKEYS[+k.slice(-1) - 1]; if (b) ui.act('tool', { b }); }
  else if (k === 'KeyR') app.rotateTool();
  else if (k === 'KeyX') app.setTool(app.tool === 'remove' ? null : 'remove');
  else if (k === 'Delete' || k === 'Backspace') { if (ui.selId) app.removeEntity(ui.selId); else app.setTool(app.tool === 'remove' ? null : 'remove'); }
  else if (k === 'KeyC') { const p = hover ? view.pick(hover.nx, hover.ny) : null; const id = p && p.kind === 'entity' ? p.id : ui.selId; if (id) app.pipette(id); }
});
// erster Kontakt schaltet den Ton frei
addEventListener('pointerdown', () => sound.unlock(), { capture: true });
onLang(() => refreshGhost());

// =====================================================================================================
// Zeit
// =====================================================================================================
let last = performance.now(), acc = 0, hiddenAt = 0, frames = 0, fpsT = last, dayT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now; if (dt > .25) dt = .25; if (dt < 0) dt = 0;
  const sim = app.mode === 'play' ? app.sim : app.menuSim;
  if (sim && !hiddenAt) {                               // im Hintergrund steht die Sim (Nachholen beim Zurückkommen)
    acc += dt; let k = 0;
    while (acc >= DT && k < 12) { sim.tick(1); acc -= DT; k++; }
    if (acc >= DT) acc = DT * .999;
  }
  if (app.mode === 'menu') { rig.g.yaw += dt * .07; }
  rig.update(dt); stage.setFocus(rig.target, rig.distance); stage.update(dt);
  view.update(dt, acc / DT);
  if (sim) {
    const ev = sim.events();
    if (ev.length) {
      view.onEvents(ev);
      if (app.mode === 'play') {
        ui.onEvents(ev);
        for (const x of ev) if (x.type === 'plot') rig.setBounds(view.bounds());
      }
    }
  }
  ui.frame(dt);
  stage.render();
  frames++; if (now - fpsT >= 1000) { app.fps = frames * 1000 / (now - fpsT); frames = 0; fpsT = now; }
  if (app.mode === 'play' && (dayT += dt) > 60) { dayT = 0; app.sim.setToday(today()); }
}

// Hintergrund-Tab: sauber anhalten; beim Zurückkommen kurz nachholen, Längeres über offline()
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); app.autosave(); return; }
  last = performance.now(); acc = 0;
  const away = hiddenAt ? (Date.now() - hiddenAt) / 1000 : 0; hiddenAt = 0;
  if (app.mode !== 'play' || !away) return;
  if (away > .5) app.sim.tick(Math.round(Math.min(away, 4) * TPS));
  if (away > 30) { const r = app.sim.offline(away - 4); if (r.money > 0) ui.offlineModal(r); }
});
addEventListener('pagehide', () => app.autosave());
setInterval(() => app.autosave(), 30000);

// =====================================================================================================
// Los
// =====================================================================================================
enterMenu();
requestAnimationFrame(frame);
requestAnimationFrame(() => setTimeout(() => document.getElementById('boot')?.classList.add('gone'), 250));
setTimeout(() => {
  renderIcons(BUILDING_IDS, ITEM_IDS, { goldItems: [] }).then(ic => { ui.setIcons(ic); window.__fabrik.iconsReady = true; }).catch(e => { console.warn('icons', e); window.__fabrik.iconsReady = true; });
}, 400);
