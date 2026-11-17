// Speichern im Browser (localStorage, Präfix „krimi.“). Alles in try/catch: privater Modus oder voller Speicher
// führen zu einer Meldung über onError(schlüssel), nie zu einem Absturz. Meldungen sind i18n-Schlüssel (ui.store.*).
//   krimi.slot.<n>       = { v, meta: { case, caseV, clues:[n,m], rank, solved, updated, name, thumb }, state, user }
//                          state = Spielstand der Logik (nur Ids, logic.js), user = Nutzerdaten (Kartenpositionen, Notizen, Ansicht)
//   krimi.current        = aktiver Platz (1 … SLOTS)
//   krimi.settings       = Einstellungen (JSON),  krimi.settings.lang = Sprache (unabhängig vom Platz)
// Datei-Sicherung: exportFile / importFile (.krimi.json). Plätze 2–5 und die Datei bedient die Oberfläche ab M1.
export const SLOTS = 5;
const P = 'krimi.';
let notify = () => {};
export function onError(fn) { notify = fn || (() => {}); }

function get(k) { try { return localStorage.getItem(P + k); } catch { return null; } }
function del(k) { try { localStorage.removeItem(P + k); return true; } catch { return false; } }
function put(k, v) {
  try { localStorage.setItem(P + k, v); return true; }
  catch (e) {
    const full = e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
    notify(full ? 'ui.store.full' : 'ui.store.blocked');
    return false;
  }
}
const parse = s => { try { return s ? JSON.parse(s) : null; } catch { return null; } };
export function available() { try { const k = P + '__t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch { return false; } }

// ---------- Plätze ----------
export function list() {
  const out = [];
  for (let n = 1; n <= SLOTS; n++) { const d = parse(get('slot.' + n)); out.push(d && d.state ? { n, meta: d.meta || {} } : { n, empty: true }); }
  return out;
}
export function load(n) { const d = parse(get('slot.' + n)); return d && d.state ? d : null; }
export function firstFree() { return list().find(s => s.empty)?.n || 0; }
// d = { v, meta, state, user }
export function save(n, d) {
  if (!n || !d || !d.state) return false;
  const rec = { ...d, meta: { ...(d.meta || {}), updated: Date.now() } };
  if (rec.meta.thumb === undefined) rec.meta.thumb = load(n)?.meta?.thumb ?? null;
  if (put('slot.' + n, JSON.stringify(rec))) return true;
  rec.meta.thumb = null;                       // zweiter Versuch ohne Vorschaubild
  return put('slot.' + n, JSON.stringify(rec));
}
export function remove(n) { const ok = del('slot.' + n); if (current() === n) setCurrent(0); return ok; }
export function duplicate(n) { const d = load(n), to = firstFree(); if (!d || !to) return 0; return save(to, d) ? to : 0; }
export function rename(n, name) {
  const d = load(n); name = String(name || '').trim().slice(0, 40); if (!d || !name) return false;
  d.meta = { ...d.meta, name }; return save(n, d);
}
export function current() { const n = +get('current'); return n >= 1 && n <= SLOTS && get('slot.' + n) ? n : 0; }
export function setCurrent(n) { return n ? put('current', String(n)) : del('current'); }

// ---------- Datei ----------
export function exportFile(n) {
  const d = load(n); if (!d) return false;
  try {
    const blob = new Blob([JSON.stringify({ format: 'red-string', ...d })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = String(d.meta?.name || d.meta?.case || 'red-string').replace(/[\\/:*?"<>|]+/g, '_').trim() + '.krimi.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return true;
  } catch { return false; }
}
// Datei → { v, meta, state, user } (wirft Error mit i18n-Schlüssel ui.store.*)
export async function importFile(file) {
  if (!file) throw new Error('ui.store.noFile');
  if (file.size > 4e6) throw new Error('ui.store.big');
  let d; try { d = JSON.parse(await file.text()); } catch { throw new Error('ui.store.bad'); }
  if (!d || typeof d !== 'object' || !d.state || typeof d.state !== 'object') throw new Error('ui.store.bad');
  return { v: d.v, meta: d.meta || {}, state: d.state, user: d.user || {} };
}

// ---------- Einstellungen ----------
export function loadSettings() { return parse(get('settings')) || {}; }
export function saveSettings(s) { return put('settings', JSON.stringify(s)); }
export function loadLang() { return get('settings.lang'); }
export function saveLang(l) { return put('settings.lang', l); }

// ---------- Automatik ----------
// Speichert nach touch() (kurz entprellt, z. B. nach jeder Aktion) und alle `every` Sekunden.
//   const auto = createAutosave({ slot: () => n, snapshot: () => d, onSaved })
export function createAutosave({ slot, snapshot, onSaved = () => {}, every = 20, delay = 250 }) {
  let dirty = false, t1 = 0, t2 = 0;
  const write = () => {
    clearTimeout(t1); t1 = 0;
    const n = slot(), d = n && snapshot(); if (!d) return false;
    const ok = save(n, d); if (ok) { dirty = false; setCurrent(n); onSaved(n); }
    return ok;
  };
  const start = () => { if (!t2) t2 = setInterval(() => { if (slot()) write(); }, every * 1000); };
  const stop = () => { clearInterval(t2); t2 = 0; };
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => { if (dirty) write(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && dirty) write(); });
  }
  return {
    touch() { dirty = true; clearTimeout(t1); t1 = setTimeout(write, delay); },
    flush: write, start, stop,
    get dirty() { return dirty; },
  };
}
