// Speicherplätze im Browser (localStorage). Alles in try/catch: privater Modus oder voller Speicher
// führen zu einer Meldung über onError(schlüssel), nie zu einem Absturz. Meldungen sind i18n-Schlüssel (store.*), die UI übersetzt.
//   insel.slot.<n> = { v, meta: { name, score, tiles, mode, updated, thumb }, S }   (n = 1 … SLOTS)
//   insel.current  = aktiver Platz,  insel.settings = Einstellungen,  insel.lang = Sprache
import { SAVE_VERSION } from './game.js';

export const SLOTS = 5;
const P = 'insel.';
let notify = () => {};
export function onError(fn) { notify = fn || (() => {}); }

function get(k) { try { return localStorage.getItem(P + k); } catch { return null; } }
function del(k) { try { localStorage.removeItem(P + k); return true; } catch { return false; } }
function put(k, v) {
  try { localStorage.setItem(P + k, v); return true; }
  catch (e) {
    const full = e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
    notify(full ? 'store.full' : 'store.blocked');
    return false;
  }
}
const parse = s => { try { return s ? JSON.parse(s) : null; } catch { return null; } };
export function available() { try { const k = P + '__t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch { return false; } }

// ---------- Plätze ----------
function metaOf(S, thumb) {
  return { name: S.name || 'Insel', score: S.score | 0, tiles: Math.max(0, (S.tiles || []).length - 1), mode: S.mode || 'klassisch', updated: Date.now(), thumb: thumb || null };
}
// [{ n, meta, empty }] für alle Plätze
export function list() {
  const out = [];
  for (let n = 1; n <= SLOTS; n++) { const d = parse(get('slot.' + n)); out.push(d && d.S ? { n, meta: d.meta || metaOf(d.S) } : { n, empty: true }); }
  return out;
}
export function load(n) { const d = parse(get('slot.' + n)); return d && d.S ? { meta: d.meta || metaOf(d.S), S: d.S } : null; }
export function firstFree() { return list().find(s => s.empty)?.n || 0; }
// game: Game oder Spielstand S. thumb: dataURL; undefined = altes Vorschaubild behalten
export function save(n, game, thumb) {
  const S = game && game.S ? game.serialize() : game; if (!S || !n) return false;
  const old = thumb === undefined ? load(n)?.meta?.thumb : thumb;
  const d = { v: SAVE_VERSION, meta: metaOf(S, old), S };
  if (put('slot.' + n, JSON.stringify(d))) return true;
  d.meta.thumb = null;                                        // zweiter Versuch ohne Bild
  return put('slot.' + n, JSON.stringify(d));
}
export function remove(n) { const ok = del('slot.' + n); if (current() === n) setCurrent(0); return ok; }
// Kopie in den ersten freien Platz → neue Platznummer (0 = kein Platz frei). word: „Kopie“ in der Sprache der Oberfläche
export function duplicate(n, word = 'Kopie') {
  const d = load(n), to = firstFree(); if (!d || !to) return 0;
  const S = { ...d.S, name: copyName(d.S.name, word), created: Date.now() };
  return put('slot.' + to, JSON.stringify({ v: SAVE_VERSION, meta: { ...metaOf(S, d.meta.thumb) }, S })) ? to : 0;
}
const copyName = (s, w) => { const re = new RegExp(`\\(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?: (\\d+))?\\)$`); return re.test(s) ? s.replace(re, (_, k) => `(${w} ${(+k || 1) + 1})`) : `${s} (${w})`; };
export function rename(n, name) {
  const d = load(n); name = String(name || '').trim().slice(0, 40); if (!d || !name) return false;
  d.S.name = name; d.meta.name = name;
  return put('slot.' + n, JSON.stringify({ v: SAVE_VERSION, meta: d.meta, S: d.S }));
}
export function current() { const n = +get('current'); return n >= 1 && n <= SLOTS && get('slot.' + n) ? n : 0; }
export function setCurrent(n) { return n ? put('current', String(n)) : del('current'); }

// ---------- Datei ----------
export function exportFile(n) {
  const d = load(n); if (!d) return false;
  const blob = new Blob([JSON.stringify({ format: 'schwebeinsel', v: SAVE_VERSION, meta: d.meta, S: d.S })], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = (d.meta.name || 'insel').replace(/[\\/:*?"<>|]+/g, '_').trim() + '.insel.json';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return true;
}
// Datei → Spielstand S (wirft Error, message = i18n-Schlüssel store.*). S.__newer = true, wenn aus neuerer Version.
export async function importFile(file) {
  if (!file) throw new Error('store.noFile');
  if (file.size > 8e6) throw new Error('store.big');
  let d; try { d = JSON.parse(await file.text()); } catch { throw new Error('store.bad'); }
  const S = d && d.S ? d.S : d;
  if (!S || typeof S !== 'object' || !Array.isArray(S.tiles)) throw new Error('store.noIsland');
  if (S.v != null && typeof S.v !== 'number') throw new Error('store.format');
  const out = { ...S }; if ((S.v || 1) > SAVE_VERSION) out.__newer = true;
  if (!out.name) out.name = (file.name || 'Insel').replace(/\.insel\.json$|\.json$/i, '');
  return out;
}

// ---------- Einstellungen ----------
export function loadSettings() { return parse(get('settings')); }
export function saveSettings(s) { return put('settings', JSON.stringify(s)); }
export function loadLang() { return get('lang'); }
export function saveLang(l) { return put('lang', l); }
export function getFlag(k) { return parse(get('flag.' + k)); }
export function setFlag(k, v) { return put('flag.' + k, JSON.stringify(v)); }

// ---------- Vorschaubild ----------
// Kleines JPEG aus app.capture(.25); liefert Promise<dataURL|null>
export async function makeThumb(app, w = 240) {
  try {
    const src = await app.capture(.25); if (!src) return null;
    const img = new Image(); img.src = src; await img.decode();
    const s = Math.min(1, w / img.width), c = document.createElement('canvas');
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', .72);
  } catch { return null; }
}

// ---------- Automatik ----------
// Speichert entprellt nach touch() (z. B. nach jeder Kachel) und alle 20 s, wenn sich etwas geändert hat.
//   const auto = createAutosave({ game, app, slot: () => n, active: () => bool, onSaved })
//   auto.touch(); auto.tick(dt); auto.flush()
export function createAutosave({ game, app, slot, active = () => true, onSaved = () => {}, every = 20, delay = .9 }) {
  let dirty = false, wait = -1, timer = 0, busy = false, lastThumb = 0;
  async function write(withThumb) {
    const n = slot(); if (!n || !game.S || busy) return false;
    busy = true;
    let thumb; if (withThumb && performance.now() - lastThumb > 4000) { thumb = await makeThumb(app); lastThumb = performance.now(); if (!thumb) thumb = undefined; }
    const ok = save(n, game, thumb); busy = false;
    if (ok) { dirty = false; setCurrent(n); onSaved(n); }
    return ok;
  }
  return {
    touch() { dirty = true; wait = delay; },
    tick(dt) {
      if (!active()) return;
      if (wait >= 0 && (wait -= dt) < 0) write(true);
      if ((timer += dt) >= every) { timer = 0; if (dirty || slot()) write(dirty); }
    },
    flush() { if (slot() && game.S) { const ok = save(slot(), game); if (ok) { dirty = false; setCurrent(slot()); } return ok; } return false; },
    now: () => write(true),
    get dirty() { return dirty; },
  };
}
