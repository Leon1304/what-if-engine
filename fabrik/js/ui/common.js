// Cogtopia – kleine Helfer für alle Teile der Oberfläche (ui.js, ui/meta.js, ui/tools.js)
import { getLang, fmtNum } from '../i18n.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (s, el = document) => el.querySelector(s);
export const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
// kleine Raten mit einer Nachkommastelle (0,4/s statt 0/s)
export const fmtRate = v => v > 0 && v < 10 ? (Math.round(v * 10) / 10).toFixed(1).replace('.', getLang() === 'de' ? ',' : '.').replace(/[.,]0$/, '') : fmtNum(v);
// Uhr mm:ss (bzw. h:mm:ss)
export const clock = secs => { const s = Math.max(0, Math.ceil(secs)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, r = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(r).padStart(2, '0'); };
export const ROMAN = ['', 'I', 'II', 'III'];
export const pct = v => Math.round(clamp(v) * 100);
// in die Zwischenablage (mit Rückfall für gesperrte Clipboard-API)
export async function copyText(text) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch { /* Rückfall */ }
  try { const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch { return false; }
}

// Panels: Symbol je Panel; rechte Leiste = die häufigsten, der Rest im Menü (☰)
export const PANEL_ICON = { research: '🔬', contracts: '📋', book: '📖', stats: '📈', achievements: '🏆', plots: '🗺️', crates: '🎁', prestige: '🏭', settings: '⚙️', game: '💾',
  menu: '☰', wheel: '🎡', streak: '📅', album: '🗂️', wonder: '🚀', challenge: '🏁', blueprints: '📐', timelapse: '🎬' };
export const SIDE = ['research', 'contracts', 'book', 'crates', 'wheel', 'menu'];
export const MENU = [
  ['factory', ['stats', 'achievements', 'album', 'plots', 'wonder', 'prestige']],
  ['daily', ['wheel', 'streak', 'challenge']],
  ['tools', ['blueprints', 'photo', 'timelapse']],
  ['game', ['settings', 'game']],
];
