// Kamera seitlich drehen per Knopf: ⟲ ⟳ am rechten Rand (halten = weiterdrehen, Doppelklick = 90°).
// Zusätzlich: seitlich wischen (Trackpad), Alt/Option + Ziehen, Rechtsziehen, Q/E – siehe camera.js.
import { getLang, onLang } from './i18n.js';

export function camButtons(rig, { visible = () => true } = {}) {
  const css = document.createElement('style');
  css.textContent = `
  .camrot { position: fixed; right: 14px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 8px; z-index: 30; transition: opacity .2s; }
  .camrot.off { opacity: 0; pointer-events: none; }
  .camrot button { width: 46px; height: 46px; border-radius: 14px; border: 2px solid #e2cfa8; background: #fff8ea; color: #6b4a2a; font: 700 22px/1 system-ui, sans-serif;
    box-shadow: 0 4px 0 #d8c39a, 0 6px 14px rgba(60,40,20,.18); cursor: pointer; touch-action: none; user-select: none; -webkit-user-select: none; }
  .camrot button:active, .camrot button.hold { transform: translateY(2px); box-shadow: 0 2px 0 #d8c39a, 0 3px 8px rgba(60,40,20,.18); background: #ffefcf; }
  @media (max-width: 520px) { .camrot { right: 8px; top: 38%; } .camrot button { width: 40px; height: 40px; font-size: 19px; } }`;
  document.head.appendChild(css);
  const box = document.createElement('div'); box.className = 'camrot';
  const mk = (sym, dir) => {
    const b = document.createElement('button'); b.textContent = sym; b.dataset.act = dir < 0 ? 'camLeft' : 'camRight';
    let hold = null, last = 0;
    const tick = now => { if (!hold) return; const dt = Math.min(.05, (now - last) / 1000); last = now; rig.rotateBy(dir * 1.6 * dt); requestAnimationFrame(tick); };
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); b.setPointerCapture?.(e.pointerId); b.classList.add('hold'); rig.rotateBy(dir * .12); hold = true; last = performance.now(); requestAnimationFrame(tick); });
    const stop = () => { hold = null; b.classList.remove('hold'); };
    b.addEventListener('pointerup', stop); b.addEventListener('pointercancel', stop); b.addEventListener('lostpointercapture', stop);
    b.addEventListener('dblclick', e => { e.preventDefault(); rig.rotateBy(dir * Math.PI / 2); });
    b.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
    box.appendChild(b); return b;
  };
  const L = mk('⟲', -1), R = mk('⟳', 1);
  const label = () => { const de = getLang() === 'de'; L.title = de ? 'Insel nach links drehen (halten, Doppelklick = 90°)' : 'Rotate the island left (hold, double-click = 90°)'; R.title = de ? 'Insel nach rechts drehen (halten, Doppelklick = 90°)' : 'Rotate the island right (hold, double-click = 90°)'; L.setAttribute('aria-label', L.title); R.setAttribute('aria-label', R.title); };
  label(); onLang?.(label);
  document.body.appendChild(box);
  return { frame() { box.classList.toggle('off', !visible()); }, label };
}
