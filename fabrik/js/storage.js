// Speicherplätze für Cogtopia in localStorage (Präfix fabrik.), Autosave-Platz, Export/Import als JSON-Text (.cogtopia.json).
// Jeder Zugriff in try/catch: privates Fenster, gesperrter Speicher oder Node ohne localStorage dürfen nichts kaputt machen.
import { Factory, SAVE_VERSION } from './sim.js';

export const PREFIX = 'fabrik.';
export const SLOTS = 3;
export const AUTO = 'auto';
export const BACKUP = 'backup';                    // Sicherung des bisherigen Stands, bevor Laden/Import/Neue Fabrik ihn ersetzt
export const EXT = '.cogtopia.json';

let mem = null;   // Ersatzspeicher, falls localStorage fehlt (Node, gesperrt)
function store() {
  try { if (globalThis.localStorage) { const k = PREFIX + '__t'; globalThis.localStorage.setItem(k, '1'); globalThis.localStorage.removeItem(k); return globalThis.localStorage; } } catch { /* gesperrt */ }
  if (!mem) { const m = new Map(); mem = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), key: i => [...m.keys()][i] ?? null, get length() { return m.size; } }; }
  return mem;
}
const slotKey = slot => PREFIX + 'save.' + slot;
function get(k) { try { return store().getItem(k); } catch { return null; } }
function set(k, v) { try { store().setItem(k, v); return true; } catch { return false; } }
function del(k) { try { store().removeItem(k); return true; } catch { return false; } }

// Spielstand + Metadaten als Text
export function serialize(f, meta = {}) {
  return JSON.stringify({ app: 'cogtopia', v: SAVE_VERSION, savedAt: meta.savedAt ?? null, name: meta.name ?? '', state: f.toJSON() });
}
export function parse(text) {
  try {
    const o = typeof text === 'string' ? JSON.parse(text) : text;
    if (!o || typeof o !== 'object') return null;
    const state = o.state && typeof o.state === 'object' ? o.state : o;     // auch nackter Zustand erlaubt
    return { factory: Factory.load(state), savedAt: o.savedAt ?? null, name: o.name ?? '' };
  } catch (e) { return null; }
}

// savedAt (ms seit 1970) kommt von außen, die Sim kennt keine Uhrzeit
export function save(f, slot = AUTO, savedAt = null, name = '') {
  const text = serialize(f, { savedAt, name });
  return set(slotKey(slot), text);
}
export function load(slot = AUTO) { const t = get(slotKey(slot)); return t ? parse(t) : null; }
export function remove(slot) { return del(slotKey(slot)); }
export function info(slot) {
  const t = get(slotKey(slot)); if (!t) return null;
  try {
    const o = JSON.parse(t), S = o.state || o;
    return { slot, savedAt: o.savedAt ?? null, name: o.name ?? '', money: S.money || 0, biome: S.biome || 'wiese', playtime: (S.total && S.total.playtime) || 0,
      earned: (S.stats && S.stats.earned) || 0, prestiges: (S.total && S.total.prestiges) || 0, buildings: Array.isArray(S.ents) ? S.ents.length : 0,
      chal: S.chal && typeof S.chal === 'object' ? { week: S.chal.week, done: !!S.chal.done, left: +S.chal.left || 0, score: +S.chal.score || 0 } : null };
  } catch { return { slot, broken: true }; }
}
// list() → [Autosave, Platz 1…SLOTS]; list(true) zusätzlich die Sicherung (nur wenn vorhanden) direkt nach dem Autosave
export function list(withBackup = false) {
  const out = [info(AUTO)]; for (let i = 1; i <= SLOTS; i++) out.push(info(i));
  const res = out.map((x, i) => x || { slot: i === 0 ? AUTO : i, empty: true });
  if (withBackup) { const b = info(BACKUP); if (b) res.splice(1, 0, b); }
  return res;
}
// Rohtext eines Platzes in einen anderen kopieren (behält savedAt, z. B. Autosave → Sicherung)
export function copy(from, to) { const t = get(slotKey(from)); return t ? set(slotKey(to), t) : false; }

// Export/Import: Text für eine Datei <name>.cogtopia.json
export function exportText(f, savedAt = null, name = '') { return serialize(f, { savedAt, name }); }
export function exportName(base = 'factory') { return String(base).replace(/[^\w-]+/g, '_') + EXT; }
export function importText(text) { return parse(text); }

// kleine Einstellungen (z. B. Lautstärke)
export function getSetting(key, def = null) { const v = get(PREFIX + 'set.' + key); if (v == null) return def; try { return JSON.parse(v); } catch { return def; } }
export function setSetting(key, value) { return set(PREFIX + 'set.' + key, JSON.stringify(value)); }

// ---------- Ausbau 2: Herausforderungs-Platz, Blaupausen-Bibliothek, lokale Bestenliste ----------
export const CHAL = 'chal';                          // eigener Speicherplatz der Wochen-Herausforderung
// Blaupausen: fabrik.bp.<id> → { name, code, at } (bleiben über Prestige und neue Fabriken)
const BP = PREFIX + 'bp.';
function keysWith(pre) { const out = []; try { const s = store(); for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k && k.startsWith(pre)) out.push(k); } } catch { /* egal */ } return out; }
export function bpList() {
  return keysWith(BP).map(k => { try { const o = JSON.parse(get(k)); return o && typeof o.code === 'string' ? { id: k.slice(BP.length), name: String(o.name || ''), code: o.code, at: +o.at || 0, w: o.w | 0, h: o.h | 0, n: o.n | 0 } : null; } catch { return null; } })
    .filter(Boolean).sort((a, b) => b.at - a.at);
}
export function bpSave(name, code, meta = {}, id = null) {
  id = id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
  return set(BP + id, JSON.stringify({ name: String(name || '').slice(0, 40), code, at: Date.now(), w: meta.w | 0, h: meta.h | 0, n: meta.n | 0 })) ? id : null;
}
export function bpRename(id, name) { const t = get(BP + id); if (!t) return false; try { const o = JSON.parse(t); o.name = String(name || '').slice(0, 40); return set(BP + id, JSON.stringify(o)); } catch { return false; } }
export function bpDelete(id) { return del(BP + id); }
// Bestenliste je Woche: fabrik.chal.<week> → [{ score, at }] (beste 10)
const CH = PREFIX + 'chal.';
export function chalScores(week) { try { const a = JSON.parse(get(CH + week) || '[]'); return Array.isArray(a) ? a.filter(x => x && Number.isFinite(x.score)).sort((a, b) => b.score - a.score) : []; } catch { return []; } }
export function chalAdd(week, score, at = Date.now()) {
  const a = chalScores(week); if (!a.some(x => x.at === at)) a.push({ score: Math.floor(score), at });
  a.sort((x, y) => y.score - x.score); set(CH + week, JSON.stringify(a.slice(0, 10))); return a.slice(0, 10);
}
export function chalWeeks() { return keysWith(CH).map(k => k.slice(CH.length)).sort().reverse(); }
