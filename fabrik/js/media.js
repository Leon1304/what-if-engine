// Cogtopia – Medien: Zeitraffer (#14) als 9:16-Video (1080×1920) und Downloads (Foto, Video, Dateien).
// Zeitraffer: Aus history() wird die Fabrik in einer eigenen, unsichtbaren Kopie (nur Darstellung, keine Wirkung auf den Spielstand)
// Schritt für Schritt nachgebaut; die Kamera kreist und zoomt mit der wachsenden Fabrik, am Ende Titelkarte „Cogtopia“ + Kennzahlen.
// Bilder über stage.renderFrame(w, h, { camera }), Aufnahme mit MediaRecorder (MP4, wenn der Browser es kann, sonst WebM).
import * as THREE from 'three';
import { Factory, MAP } from './sim.js';
import { BUILDINGS } from './data.js';
import { t } from './i18n.js';

// ---------------------------------------------------------------------------------------------------- Downloads
export function downloadURL(url, file) {
  const a = document.createElement('a'); a.href = url; a.download = file; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
}
export function download(blob, file) {
  const url = URL.createObjectURL(blob); downloadURL(url, file); setTimeout(() => URL.revokeObjectURL(url), 30000); return url;
}
export const videoMime = () => {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const m of ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1.42E01F', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'])
    try { if (MediaRecorder.isTypeSupported(m)) return m; } catch { /* weiter */ }
  return null;
};

// ---------------------------------------------------------------------------------------------------- Nachbau
// leere Kopie der Fabrik (gleiche Welt, gleiches Land, gleiche Forschung), unendlich Geld, kein Gerald, kein auto-join
function emptyCopy(src) {
  const R = Factory.load(src.toJSON());
  R.opts.autoJoin = false;
  for (const e of [...R.S.ents]) R.remove(e.id);
  R.undoStack.length = 0; R.S.money = 1e15; R.S.ger.wait = 1e9; R.S.ger.on = false; R.events();
  return R;
}
const keyOf = e => e.type + '@' + e.x + ',' + e.y;
function apply(R, o) {
  switch (o.k) {
    case 'b': return R.place(o.type, o.x, o.y, o.rot) != null;
    case 'r': { const id = R.at(o.x, o.y), n = id && R.N.get(id); if (n && n.e.type === o.type && n.e.x === o.x && n.e.y === o.y) return R.remove(id); return false; }
    case 'u': case 'rot': {
      const id = R.at(o.x, o.y), n = id && R.N.get(id); if (!n || n.e.type !== o.type) return false;
      if (o.k === 'rot') { let k = 0; while (n.e.rot !== o.rot && k++ < 4) R.rotate(id); return true; }
      n.e.mk = Math.max(1, Math.min(3, o.mk | 0)); R._fitDrones?.(n.e); R._pdirty = true; return true;
    }
  }
  return false;
}
// Bauschritte: Verlauf + Abgleich mit dem jetzigen Stand (alte Stände ohne Verlauf: alles in Bau-Reihenfolge)
export function replayOps(src) {
  const ops = src.history().filter(h => BUILDINGS[h[2]] && (h[1] === 'b' || h[1] === 'r' || h[1] === 'u')).map(h => ({ k: h[1], type: h[2], x: h[3], y: h[4], rot: h[5], mk: h[6] }));
  const R = emptyCopy(src); for (const o of ops) apply(R, o);
  const have = new Map(R.S.ents.map(e => [keyOf(e), e])), want = new Map(src.S.ents.map(e => [keyOf(e), e]));
  for (const [k, e] of have) if (!want.has(k)) ops.push({ k: 'r', type: e.type, x: e.x, y: e.y });
  for (const e of [...src.S.ents].sort((a, b) => a.id - b.id)) {
    const r = have.get(keyOf(e));
    if (!r) ops.push({ k: 'b', type: e.type, x: e.x, y: e.y, rot: e.rot });
    if (!r || r.rot !== e.rot) ops.push({ k: 'rot', type: e.type, x: e.x, y: e.y, rot: e.rot });
    if ((e.mk || 1) > 1 && (!r || (r.mk || 1) !== e.mk)) ops.push({ k: 'u', type: e.type, x: e.x, y: e.y, mk: e.mk });
  }
  return ops;
}
function bbox(ents, pad = 2) {
  if (!ents.length) return null;
  let x0 = MAP, y0 = MAP, x1 = 0, y1 = 0;
  for (const e of ents) { const d = BUILDINGS[e.type]; if (!d) continue; x0 = Math.min(x0, e.x); y0 = Math.min(y0, e.y); x1 = Math.max(x1, e.x + d.w); y1 = Math.max(y1, e.y + d.h); }
  return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad, cx: (x0 + x1) / 2, cz: (y0 + y1) / 2, size: Math.max(8, Math.hypot(x1 - x0, y1 - y0)) };
}

// ---------------------------------------------------------------------------------------------------- Zeitraffer
let job = null;
export function cancel() { if (job) job.cancel = true; }
export const busy = () => !!job;
const ease = u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;

// exportTimelapse(app, { secs 20–30, w, h, fps, download, onProgress(p, preview) }) → { blob, mime, file, bytes, frames } | null (abgebrochen/nicht möglich)
export async function exportTimelapse(app, opts = {}) {
  const mime = videoMime(); if (!mime) { app.ui?.toast('🎬 ' + t('ui.tl.unsupported'), 'err'); return null; }
  if (job) return null;
  const { stage, view, sound } = app, src = app.sim;
  const secs = clamp(+opts.secs || 24, 3, 60), W = opts.w || 1080, H = opts.h || 1920, fps = opts.fps || 30;
  const ops = replayOps(src), R = emptyCopy(src), fin = bbox(src.S.ents) || { cx: 56, cz: 56, size: 20 };
  const stats = { n: src.S.ents.length, earned: src.S.stats.earned, total: src.S.total.earned, sold: src.S.stats.sold, time: src.S.total.playtime, biome: src.S.biome, factory: (src.S.total.prestiges || 0) + 1 };
  job = { cancel: false };
  app.media = true; app.setTool?.(null); app.select?.(0); app.ui?.mediaStart?.();
  const cam = new THREE.PerspectiveCamera(36, W / H, .1, 1500);
  view.cam = cam; view.setSim(R, { menu: true });
  const shot = document.createElement('canvas'), rec = document.createElement('canvas'); rec.width = W; rec.height = H;
  const ctx = rec.getContext('2d'), stream = rec.captureStream(fps), chunks = [];
  const mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: opts.bitrate || 10e6 });
  mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise(res => { mr.onstop = res; });
  const fontReady = document.fonts?.load ? document.fonts.load('700 120px Fredoka').catch(() => {}) : Promise.resolve();
  await fontReady;
  // Kamera: Mitte/Abstand folgen der wachsenden Fabrik, Umlauf ~300°
  const tgt = new THREE.Vector3(fin.cx, 0, fin.cz); let dist = 22, cxz = [fin.cx, fin.cz];
  const fit = s => Math.max(16, s * 1.65);
  const BUILD = .76;                                         // Anteil der Zeit für den Nachbau, danach Rundflug + Titelkarte
  let done = 0, frames = 0, last = performance.now(), t0 = 0;
  mr.start(250); t0 = performance.now();
  try {
    for (;;) {
      await new Promise(r => requestAnimationFrame(r));
      const now = performance.now(), el = (now - t0) / 1000, dt = Math.min(.1, (now - last) / 1000); last = now;
      const p = clamp(el / secs);
      if (job.cancel) break;
      // Bauschritte bis zum Zeitpunkt
      const want = Math.min(ops.length, Math.ceil(ops.length * ease(clamp(p / BUILD))));
      while (done < want) apply(R, ops[done++]);
      R.tick(2); view.onEvents(R.events());
      // Kamera
      const bb = bbox(R.S.ents) || { cx: fin.cx, cz: fin.cz, size: 10 };
      const k = 1 - Math.exp(-dt * 1.6);
      cxz[0] += (bb.cx - cxz[0]) * k; cxz[1] += (bb.cz - cxz[1]) * k;
      const endZoom = p > BUILD ? ease(clamp((p - BUILD) / (1 - BUILD))) : 0;
      const wantD = fit(bb.size) * (1 + .15 * endZoom); dist += (wantD - dist) * k;
      tgt.set(cxz[0], 0, cxz[1]);
      const yaw = Math.PI * .25 + p * Math.PI * 1.65, pitch = (54 - 8 * endZoom) * Math.PI / 180;
      cam.position.set(tgt.x + Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, tgt.z + Math.cos(yaw) * Math.cos(pitch) * dist);
      cam.lookAt(tgt); cam.updateMatrixWorld();
      stage.setFocus(tgt, dist); stage.update(dt); view.update(dt, 1);
      stage.renderFrame(W, H, { camera: cam, canvas: shot });
      ctx.drawImage(shot, 0, 0); overlay(ctx, W, H, el, secs, p, stats, R.S.ents.length);
      frames++;
      opts.onProgress?.(p, rec); app.ui?.mediaProgress?.(p, rec);
      if (p >= 1) break;
    }
  } catch (e) { console.warn('timelapse', e); job.cancel = true; }
  const cancelled = job.cancel;
  try { mr.stop(); } catch { /* schon aus */ }
  await stopped; stream.getTracks().forEach(tr => tr.stop());
  // aufräumen: zurück zur echten Fabrik
  view.cam = null; view.setSim(src); app.media = false; stage.resize(); job = null;
  app.ui?.mediaEnd?.();
  if (cancelled) { app.ui?.toast('🎬 ' + t('ui.tl.cancelled'), 'mute'); return null; }
  const blob = new Blob(chunks, { type: mime.split(';')[0] }), ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
  const d = new Date(), file = `cogtopia-timelapse-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.${ext}`;
  const res = { blob, mime, file, bytes: blob.size, frames, url: null };
  if (opts.download !== false) res.url = download(blob, file);
  sound?.play('win');
  app.ui?.mediaDone?.(res);
  return res;
}

// Titel am Anfang, Fortschritt der Uhr, Titelkarte mit Kennzahlen am Ende
function overlay(ctx, W, H, el, secs, p, s, nNow) {
  const S = W / 1080, font = (w, px) => `${w} ${Math.round(px * S)}px Fredoka, Nunito, system-ui, sans-serif`;
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const shadow = (b = 18) => { ctx.shadowColor = 'rgba(40,24,10,.55)'; ctx.shadowBlur = b * S; ctx.shadowOffsetY = 4 * S; };
  // Vorspann (2 s)
  const a0 = el < 2.2 ? 1 - clamp((el - 1.6) / .6) : 0;
  if (a0 > 0) {
    ctx.globalAlpha = a0; shadow();
    ctx.fillStyle = '#fff'; ctx.font = font(700, 120); ctx.fillText('Cogtopia', W / 2, H * .14);
    ctx.font = font(600, 46); ctx.fillStyle = '#fff3d0'; ctx.fillText(t('ui.tl.sub', { biome: s.biome, n: s.factory }), W / 2, H * .14 + 110 * S);
  }
  // Zähler unten (während des Baus)
  const a1 = clamp((el - 1) / .6) * (1 - clamp((p - .8) / .06));
  if (a1 > 0) {
    ctx.globalAlpha = a1; shadow(10);
    ctx.font = font(700, 54); ctx.fillStyle = '#fff'; ctx.fillText('🏭 ' + t('ui.tl.count', { n: nNow }), W / 2, H * .92);
  }
  // Titelkarte (letzte 22 %)
  const a2 = clamp((p - .8) / .07);
  if (a2 > 0) {
    ctx.shadowColor = 'transparent'; ctx.globalAlpha = a2;
    const g = ctx.createLinearGradient(0, H * .25, 0, H); g.addColorStop(0, 'rgba(30,18,8,0)'); g.addColorStop(.45, 'rgba(30,18,8,.55)'); g.addColorStop(1, 'rgba(30,18,8,.82)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const y = H * .58, pop = 1 + .06 * (1 - a2);
    ctx.save(); ctx.translate(W / 2, y); ctx.scale(pop, pop); shadow(26);
    ctx.font = font(700, 150); ctx.fillStyle = '#ffd84a'; ctx.fillText('Cogtopia', 0, 0);
    ctx.restore(); shadow(10);
    const rows = [['🏭', t('ui.tl.buildings', { n: s.n })], ['💰', t('ui.tl.earned', { n: s.total })], ['📦', t('ui.tl.sold', { n: s.sold })], ['⏱', t('ui.tl.time', { secs: s.time })]];
    ctx.font = font(600, 50); ctx.fillStyle = '#fff8e8';
    rows.forEach(([ic, tx], i) => { const a = clamp((p - .84 - i * .025) / .04); ctx.globalAlpha = a2 * a; ctx.fillText(ic + '  ' + tx, W / 2, y + (150 + i * 78) * S); });
    ctx.globalAlpha = a2 * clamp((p - .95) / .04); ctx.font = font(600, 38); ctx.fillStyle = '#ffe9a8'; ctx.fillText(t('game.tagline'), W / 2, H * .94);
  }
  ctx.restore();
}
