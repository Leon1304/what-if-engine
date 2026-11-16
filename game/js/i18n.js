// Northwood – languages. German is the source language: every player-visible text is written in German in the code and wrapped in T().
// T(de, vars) returns the text in the chosen language; the German text itself is the key into the dictionary (lang/<code>.js).
// Placeholders: T('Noch {n} Plätze frei.', { n }) – never build sentences from pieces or put ${…} inside T(), use {name} instead.
// Texts from the map (labels, notes, signs: userData.label / text in map.glb) go through the same T().
// The language is fixed at page load (URL ?lang=xx › saved choice › browser language › English); setLang() saves the choice and reloads.
// New language: copy lang/en.js to lang/<code>.js, translate the values, add it to LANGS and DICTS below. Check: node tools/i18n.mjs
import EN from './lang/en.js';

export const LANGS = { en: 'English', de: 'Deutsch' };
const DICTS = { en: EN };
const KEY = 'northwood_lang';

function pick() {
  try { const q = new URLSearchParams(location.search).getAll('lang').pop(); if (q && LANGS[q]) return q; } catch { }
  try { const s = localStorage.getItem(KEY); if (s && LANGS[s]) return s; } catch { }
  try { for (const l of navigator.languages || [navigator.language]) { const c = String(l).slice(0, 2).toLowerCase(); if (LANGS[c]) return c; } } catch { }
  return 'en';
}

export const LANG = pick();
const DICT = DICTS[LANG] || null;
const missing = new Set();

// translate one German text; vars fill {name} placeholders (in every language)
export function T(de, vars) {
  if (de == null) return de;
  let s = de;
  if (DICT && de !== '') {
    const tr = DICT[de];
    if (tr !== undefined) s = tr;
    else if (!missing.has(de)) { missing.add(de); if (typeof window !== 'undefined') (window.__i18nMissing ||= []).push(de); }
  }
  return vars ? fill(s, vars) : s;
}

// number-dependent text: TN(n, 'ein Baum', '{n} Bäume') – both forms are keys
export const TN = (n, one, many, vars) => T(n === 1 ? one : many, { n, ...vars });

function fill(s, vars) { return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)); }

// locale for numbers and dates (toLocaleString)
export const LOCALE = LANG === 'de' ? 'de-DE' : 'en-GB';

// static HTML: every element with data-t gets its German innerHTML translated (the German markup is the key)
export function applyDom(root = document) {
  document.documentElement.lang = LANG;
  root.querySelectorAll('[data-t]').forEach(el => { el.innerHTML = T(el.innerHTML.trim()); });
  root.querySelectorAll('[data-t-title]').forEach(el => { el.title = T(el.title); });
}

export function setLang(code) {
  if (!LANGS[code] || code === LANG) return false;
  try { localStorage.setItem(KEY, code); } catch { }
  const u = new URL(location.href); u.searchParams.delete('lang'); location.href = u.toString();
  return true;
}
