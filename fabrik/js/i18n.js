// Sprachwahl für Cogtopia. Englisch ist Standard, Deutsch zweite Sprache; weitere Sprachen: lang/<code>.js anlegen und in DICTS/LANGS eintragen.
// Platzhalter: {name} → vars.name, {name:item} → Name des Gegenstands vars.name (auch building/recipe/research/patent/biome/achievement/crate/color/title),
// {name:num} → Zahl mit Tausendertrennern, {name:time} → Dauer (s/min/h). Plural: Wert als { one, other } (gewählt über vars.n, sonst erste Zahl).
import en from './lang/en.js';
import de from './lang/de.js';
import { ITEMS, BUILDINGS, RECIPES, RESEARCH, PATENTS, BIOMES, ACHIEVEMENTS, CRATES, COLORS, TITLES } from './data.js';

export const LANGS = { en: 'English', de: 'Deutsch' };
export const DICTS = { en, de };
const DATA = { item: ITEMS, building: BUILDINGS, recipe: RECIPES, research: RESEARCH, patent: PATENTS, biome: BIOMES, achievement: ACHIEVEMENTS, crate: CRATES, color: COLORS, title: TITLES };
export const KINDS = Object.keys(DATA);
const KEY = 'fabrik.lang';
const listeners = [];

function detect() {
  try { const s = globalThis.localStorage && globalThis.localStorage.getItem(KEY); if (s && DICTS[s]) return s; } catch { /* kein Speicher */ }
  try { const n = (globalThis.navigator && globalThis.navigator.language) || ''; if (/^de\b/i.test(n) || /^de/i.test(n)) return 'de'; } catch { /* Node */ }
  return 'en';
}
let cur = detect();

export function getLang() { return cur; }
export function setLang(code) {
  if (!DICTS[code] || code === cur) return cur;
  cur = code;
  try { globalThis.localStorage && globalThis.localStorage.setItem(KEY, code); } catch { /* egal */ }
  for (const cb of listeners.slice()) { try { cb(code); } catch (e) { console.error(e); } }
  return cur;
}
export function onLang(cb) { listeners.push(cb); return () => { const i = listeners.indexOf(cb); if (i >= 0) listeners.splice(i, 1); }; }
export function has(key, lang = cur) { return DICTS[lang] && key in DICTS[lang]; }
export function keys(lang) { return Object.keys(DICTS[lang] || {}); }

function raw(key) {
  const d = DICTS[cur];
  if (d && key in d) return d[key];
  if (key in en) return en[key];
  return undefined;
}
export function fmtNum(v) {
  const n = Number(v) || 0, sep = cur === 'de' ? '.' : ',';
  const a = Math.abs(n), s = n < 0 ? '-' : '';
  if (a >= 1e9) return s + (a / 1e9).toFixed(a >= 1e10 ? 1 : 2).replace('.', cur === 'de' ? ',' : '.') + (cur === 'de' ? ' Mrd.' : 'B');
  if (a >= 1e6) return s + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace('.', cur === 'de' ? ',' : '.') + (cur === 'de' ? ' Mio.' : 'M');
  return s + String(Math.round(a)).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}
export function fmtTime(secs) {
  const s = Math.max(0, Math.round(Number(secs) || 0));
  if (s >= 3600) { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return m ? `${h} ${t('unit.h')} ${m} ${t('unit.min')}` : `${h} ${t('unit.h')}`; }
  if (s >= 60) { const m = Math.floor(s / 60), r = s % 60; return r ? `${m} ${t('unit.min')} ${r} ${t('unit.s')}` : `${m} ${t('unit.min')}`; }
  return `${s} ${t('unit.s')}`;
}

export function t(key, vars = {}) {
  let v = raw(key);
  if (v === undefined) {
    const m = /^(\w+)\.([^.]+)\.(name|desc)$/.exec(key);           // Rückfall auf englische Daten
    if (m && DATA[m[1]] && DATA[m[1]][m[2]]) v = DATA[m[1]][m[2]][m[3]] || '';
    else return key.split('.').pop();                                 // nie den ganzen Schlüssel zeigen
  }
  if (v && typeof v === 'object') {
    let n = vars.n;
    if (typeof n !== 'number') for (const k in vars) if (typeof vars[k] === 'number') { n = vars[k]; break; }
    v = (n === 1 ? v.one : v.other) ?? v.other ?? v.one ?? '';
  }
  return String(v).replace(/\{(\w+)(?::(\w+))?\}/g, (_, k, f) => {
    const x = vars[k];
    if (x === undefined || x === null) return '';
    if (!f) return typeof x === 'number' ? fmtNum(x) : String(x);
    if (f === 'num') return fmtNum(x);
    if (f === 'time') return fmtTime(x);
    if (DATA[f]) return name(f, x);
    return String(x);
  });
}
export function name(kind, id) { return t(`${kind}.${id}.name`); }
export function desc(kind, id) { const k = `${kind}.${id}.desc`; return raw(k) !== undefined || DATA[kind]?.[id]?.desc ? t(k) : ''; }
