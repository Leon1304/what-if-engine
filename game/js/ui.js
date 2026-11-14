// HUD and panels (plain DOM; markup + styles live in index.html).
import { ITEMS, RECIPES } from './items.js';

const $ = id => document.getElementById(id);
export class UI {
  constructor() {
    this.bars = {}; for (const k of ['health', 'hunger', 'thirst', 'warmth', 'stamina']) this.bars[k] = $('bar-' + k);
    this.toastBox = $('toasts'); this.prompt = $('prompt'); this.clock = $('clock'); this.quest = $('quest');
    this.marker = $('marker'); this.hotbar = $('hotbar'); this.vignette = $('vignette'); this.frost = $('frost');
    this.lastQuest = '';
  }
  toast(text, kind = '') {
    const d = document.createElement('div'); d.className = 'toast ' + kind; d.textContent = text; this.toastBox.appendChild(d);
    while (this.toastBox.children.length > 5) this.toastBox.firstChild.remove();
    setTimeout(() => d.classList.add('out'), 4200); setTimeout(() => d.remove(), 5000);
  }
  setPrompt(t) { if (this.prompt.textContent !== t) this.prompt.textContent = t; this.prompt.style.opacity = t ? 1 : 0; }
  stats(s) {
    for (const k in this.bars) {
      const v = Math.max(0, Math.min(100, s[k])); this.bars[k].style.width = v + '%';
      this.bars[k].parentElement.parentElement.classList.toggle('low', v < 25);
    }
  }
  setClock(h, day, extra) {
    const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    const icon = h > 6.5 && h < 18.4 ? '☀️' : '🌙';
    this.clock.innerHTML = `${icon} Tag ${day} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}${extra}`;
  }
  setQuest(title, text, step, total) {
    const key = title + text; if (key === this.lastQuest) return; this.lastQuest = key;
    this.quest.innerHTML = title ? `<div class="qt">${title}<span>${step ? step + '/' + total : ''}</span></div><div class="qx">${text}</div>` : '';
    this.quest.classList.remove('pulse'); void this.quest.offsetWidth; this.quest.classList.add('pulse');
  }
  setMarker(screen, dist) {
    if (!screen) { this.marker.style.display = 'none'; return; }
    this.marker.style.display = 'block'; this.marker.style.left = screen.x + 'px'; this.marker.style.top = screen.y + 'px';
    this.marker.querySelector('span').textContent = dist < 1000 ? Math.round(dist) + ' m' : '';
  }
  renderHotbar(inv, sel) {
    let h = '';
    for (let i = 0; i < 5; i++) {
      const s = inv[i], it = s && ITEMS[s.id];
      h += `<div class="slot ${i === sel ? 'sel' : ''}"><b>${i + 1}</b>${it ? `<i>${it.icon}</i>${s.n > 1 ? `<em>${s.n}</em>` : ''}` : ''}</div>`;
    }
    this.hotbar.innerHTML = h;
    const s = inv[sel]; $('selname').textContent = s ? ITEMS[s.id].name + (ITEMS[s.id].use ? ' – Q: benutzen' : '') : '';
  }
  hitmark() { const c = $('cross'); c.classList.remove('hit'); void c.offsetWidth; c.classList.add('hit'); }
  renderInventory(g) {
    const inv = g.S.inv, cap = g.capacity(), chest = g.build?.chest;
    let h = '';
    if (chest) {
      h += `<h2>📦 Vorratskiste <small>${chest.inv.length}/20 Plätze · ← nimmt, → legt hinein</small></h2><div class="grid">`;
      for (let i = 0; i < 20; i++) { const s = chest.inv[i], it = s && ITEMS[s.id];
        h += it ? `<div class="cell"><i>${it.icon}</i><div>${it.name}${s.n > 1 ? ' ×' + s.n : ''}</div><button data-get="${i}">← Nehmen</button></div>` : `<div class="cell empty"></div>`; }
      h += `</div>`;
    }
    h += `<h2>Rucksack <small>${inv.length}/${cap} Plätze${g.S.flags.fur ? ' · 🧥 Fellmantel an' : g.S.flags.jacket ? ' · 🧥 Jacke an' : ''}</small></h2><div class="grid">`;
    for (let i = 0; i < cap; i++) {
      const s = inv[i], it = s && ITEMS[s.id];
      h += it ? `<div class="cell" data-i="${i}" title="${it.desc || ''}"><i>${it.icon}</i><div>${it.name}${s.n > 1 ? ' ×' + s.n : ''}</div>
        <small>${it.desc || (it.use ? Object.entries(it.use).map(([k, v]) => ({ hunger: 'Hunger', thirst: 'Durst', warmth: 'Wärme', health: 'Gesundheit', stamina: 'Ausdauer' }[k] + (v > 0 ? ' +' : ' ') + v)).join(', ') : '')}</small>
        ${chest ? `<button data-put="${i}">→ In die Kiste</button>` : it.use ? `<button data-use="${i}">Benutzen</button>` : it.read ? `<button data-read="${i}">Lesen</button>` : ''}<button data-drop="${i}" class="drop">Wegwerfen</button></div>`
        : `<div class="cell empty"></div>`;
    }
    h += `</div><h2>Herstellen <small>C</small></h2><div class="recipes">`;
    for (const r of RECIPES) {
      const ok = g.canCraft(r);
      const need = r.desc || Object.entries(r.needs).map(([k, v]) => `${v}× ${ITEMS[k]?.name || k}`).join(' + ');
      h += `<div class="recipe ${ok ? 'ok' : ''}"><div><b>${r.name}</b><small>${need}${r.tools ? ' · Werkzeug: ' + r.tools.map(t => ITEMS[t].name).join(', ') : ''}${r.anyTool ? ' · Werkzeug: ' + r.anyTool.map(t => ITEMS[t].name).join(' oder ') : ''}</small></div><button data-craft="${r.id}" ${ok ? '' : 'disabled'}>Herstellen</button></div>`;
    }
    h += `</div><p class="hint">Tab / Esc schließen</p>`;
    $('invpanel').innerHTML = h;
  }
  show(id, on) { $(id).classList.toggle('show', on); }
  read(title, text) { $('reader').innerHTML = `<h2>${title}</h2><p>${text}</p><small>E / Esc schließen</small>`; this.show('reader', true); }
  damage() { this.vignette.classList.remove('hit'); void this.vignette.offsetWidth; this.vignette.classList.add('hit'); }
  setFrost(v) { this.frost.style.opacity = v; }
}
