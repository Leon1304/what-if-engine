// Sprachen für Red String. Alle sichtbaren Texte kommen aus Dateien:
//   js/lang/languages.json        Liste der Sprachen (code, name, dir, locale, hour12, draft)
//   js/lang/<code>.json           Oberfläche (flache Schlüssel „ui.…“)
//   cases/<ordner>/text/<code>.json  Texte des aktiven Falls (flache Schlüssel „meta.title“, „clue.<id>“ …)
// t(key, vars) → Oberfläche, tc(key, vars) → aktiver Fall. Fehlt ein Text, kommt Englisch (Meldung in der Konsole).
// Platzhalter {name}; {time…} mit einer Zahl = Minuten seit Mitternacht → Uhrzeit per Intl, andere Zahlen per Intl.NumberFormat.
// Wahl gespeichert unter krimi.settings.lang (storage.js). Neue Sprache = nur Dateien, kein Code.
import * as Store from './storage.js';

const BASE = new URL('./lang/', import.meta.url);
const FALLBACK = 'en';
let LANGS = [], lang = FALLBACK, meta = null;
let UI = {}, UI_EN = {}, CASE = {}, CASE_EN = {}, caseDir = null;
const warned = new Set(), fns = [], cache = new Map();

async function getJSON(url) {
  const k = String(url);
  if (cache.has(k)) return cache.get(k);
  const p = fetch(k).then(r => (r.ok ? r.json() : null)).catch(() => null);
  cache.set(k, p);
  const v = await p; if (!v) cache.delete(k);
  return v;
}

// ---------- Sprachen ----------
export async function init() {
  const d = await getJSON(new URL('languages.json', BASE));
  const all = (Array.isArray(d) ? d : d?.languages) || [{ code: 'en', name: 'English' }];
  LANGS = all.filter(l => l && l.code && !l.draft);
  UI_EN = (await getJSON(new URL(FALLBACK + '.json', BASE))) || {};
  const saved = Store.loadLang();
  await setLang(saved && LANGS.some(l => l.code === saved) ? saved : detect(), false);
  return lang;
}
export const languages = () => LANGS.slice();
export const getLang = () => lang;
export const langInfo = (c = lang) => LANGS.find(l => l.code === c) || { code: c, name: c, dir: 'ltr', locale: c };
export const hasSaved = () => !!Store.loadLang();
// Browsersprache (navigator.languages) → erste vorhandene Sprache, sonst Englisch
export function detect() {
  const want = (typeof navigator !== 'undefined' && (navigator.languages?.length ? navigator.languages : [navigator.language])) || [];
  for (const w of want) {
    const s = String(w || '').toLowerCase();
    const hit = LANGS.find(l => l.code.toLowerCase() === s) || LANGS.find(l => l.code.toLowerCase() === s.split('-')[0]);
    if (hit) return hit.code;
  }
  return LANGS.some(l => l.code === FALLBACK) ? FALLBACK : (LANGS[0]?.code || FALLBACK);
}
// Sprache wechseln: lädt Oberfläche + Falltexte, dann alle onLang-Hörer (sofort, ohne Neuladen)
export async function setLang(code, save = true) {
  if (!LANGS.some(l => l.code === code)) code = FALLBACK;
  const ui = code === FALLBACK ? UI_EN : await getJSON(new URL(code + '.json', BASE));
  UI = ui || {}; lang = code; meta = langInfo(code);
  if (caseDir) await loadCaseTexts();
  if (save) Store.saveLang(code);
  applyDoc();
  for (const f of fns.slice()) { try { f(code); } catch (e) { console.error(e); } }
  return code;
}
export function onLang(fn) { fns.push(fn); return () => { const i = fns.indexOf(fn); if (i >= 0) fns.splice(i, 1); }; }

// ---------- Falltexte ----------
// dir: URL des Fallordners (endet mit /)
export async function useCase(dir) { caseDir = dir ? new URL(dir, location.href) : null; CASE = {}; CASE_EN = {}; if (caseDir) await loadCaseTexts(); }
async function loadCaseTexts() {
  CASE_EN = (await getJSON(new URL('text/' + FALLBACK + '.json', caseDir))) || {};
  CASE = lang === FALLBACK ? CASE_EN : ((await getJSON(new URL('text/' + lang + '.json', caseDir))) || {});
}

// ---------- Nachschlagen ----------
function look(dict, en, key, where) {
  let v = dict[key];
  if (v == null || v === '') {
    v = en[key];
    const w = where + ':' + lang + ':' + key;
    if (!warned.has(w)) { warned.add(w); console.warn(`[i18n] ${where} „${key}“ fehlt in ${lang}${v == null ? ' und en' : ' → en'}`); }
    if (v == null) return null;
  }
  return v;
}
export function t(key, vars) { const v = look(UI, UI_EN, key, 'ui'); return v == null ? key : fill(v, vars); }
export function tc(key, vars) { const v = look(CASE, CASE_EN, key, 'case'); return v == null ? key : fill(v, vars); }
export const has = key => UI[key] != null || UI_EN[key] != null;
export const hasC = key => CASE[key] != null || CASE_EN[key] != null;
// erster vorhandener Falltext aus einer Liste, sonst null
export const tcAny = (keys, vars) => { for (const k of keys) if (hasC(k)) return tc(k, vars); return null; };

function fill(s, vars) {
  if (typeof s !== 'string') s = String(s);
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => {
    if (!(k in vars)) return m;
    const v = vars[k];
    if (typeof v === 'number') return /^time/i.test(k) ? fmtTime(v) : fmtNum(v);
    return v == null ? '' : String(v);
  });
}

// ---------- Formate ----------
const NF = {}, TF = {};
export const locale = () => meta?.locale || lang;
export function fmtNum(n) { const l = locale(); return (NF[l] ||= new Intl.NumberFormat(l, { maximumFractionDigits: 1 })).format(n || 0); }
// Minuten seit Mitternacht → „15:10“ / „3:10 PM“
export function fmtTime(min) {
  const l = locale(), k = l + (meta?.hour12 ?? '');
  const f = (TF[k] ||= new Intl.DateTimeFormat(l, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC', ...(meta?.hour12 != null ? { hour12: !!meta.hour12 } : {}) }));
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return f.format(new Date(Date.UTC(2000, 0, 1, 0, m)));
}
export const fmtDate = ts => new Date(ts).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
// Sekunden → m:ss (Nachstellung)
export const fmtClock = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// ---------- DOM ----------
// data-t="ui.key" → Text, data-t-title / data-t-aria / data-t-ph → Attribute, data-tc → Falltext. data-t-vars='{"n":3}'
export function applyDom(root = document) {
  if (typeof document === 'undefined') return;
  const vars = el => { try { return el.dataset.tVars ? JSON.parse(el.dataset.tVars) : undefined; } catch { return undefined; } };
  for (const el of root.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t, vars(el));
  for (const el of root.querySelectorAll('[data-tc]')) el.textContent = tc(el.dataset.tc, vars(el));
  for (const el of root.querySelectorAll('[data-t-title]')) el.title = t(el.dataset.tTitle);
  for (const el of root.querySelectorAll('[data-t-aria]')) el.setAttribute('aria-label', t(el.dataset.tAria));
  for (const el of root.querySelectorAll('[data-t-ph]')) el.placeholder = t(el.dataset.tPh);
}
export function applyDoc() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  document.documentElement.dir = meta?.dir || 'ltr';
  document.title = has('ui.game.title') ? t('ui.game.title') : document.title;
  applyDom(document);
}
export const _dicts = () => ({ UI, UI_EN, CASE, CASE_EN });
