// HUD and panels (plain DOM; markup + styles live in index.html).
import { ITEMS, RECIPES, TRADE } from './items.js';

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
  xp(n, why) {
    const d = document.createElement('div'); d.className = 'xpfly'; d.textContent = `+${n} EP${why ? ' · ' + why : ''}`; $('xpbox').appendChild(d);
    setTimeout(() => d.remove(), 1800); while ($('xpbox').children.length > 4) $('xpbox').firstChild.remove();
  }
  level(L, pct, xp) { const k = L + '|' + Math.round(pct); if (k === this._lv) return; this._lv = k; $('lvl').innerHTML = `<b>⭐ Level ${L}</b><div class="tr" title="${xp} EP"><div class="fl" style="width:${pct}%"></div></div>`; }
  fade() { const f = $('fade'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
  renderTrade(g) {
    const S = g.S, eur = v => v.toFixed(2).replace('.', ',') + ' €', talk = [];
    talk.push(S.flags.metKurtTalk ? 'Kurt nickt dir zu. „Was brauchst du?“' : '„Na, auch noch da? Ich bin Kurt. Die anderen sind alle weg – wegen dem Damm, sagen sie. Ich glaub da nicht dran. Ich hab noch Vorräte. Bezahlt wird in Euro – oder ich kauf dir Felle, Fleisch, Fisch und Gemüse ab.“');
    S.flags.metKurtTalk = 1;
    if (!S.dog?.tame) talk.push('„Mein Hund Bello ist mir ausgebüxt. Er streunt oben bei der Burgruine herum. Mit einem Stück Fleisch kriegst du ihn rum.“');
    if (!S.car?.fixed) talk.push('„Dein Auto ist liegengeblieben? Drüben in der Werkstatt von Brandt hängen Keilriemen, und Werkzeug liegt da auch.“');
    const notes = Object.keys(S.notes || {}).length;
    if (notes >= 5 && !S.flags.kurtStory) talk.push('<button data-talk="story">📜 Erzähl Kurt, was in den Notizen steht</button>');
    else if (S.flags.kurtStory) talk.push('„Brandt und seine Sprengungen … Danke, dass du das rausgefunden hast. Das erzähl ich allen, wenn sie zurückkommen.“');
    else if (notes) talk.push(`„Du liest die Zettel der Leute? (${notes}/5) Wenn du alles weißt, erzähl's mir.“`);
    let h = `<h2>🧔 Kurt – Dorfladen <small>Dein Geld: <b>${eur(S.money || 0)}</b></small></h2><div class="talk">${talk.map(t => `<p>${t}</p>`).join('')}</div><div class="tradecols"><div><h3>Kaufen</h3>`;
    for (const [id, pr] of Object.entries(TRADE.buy)) { const it = ITEMS[id]; if (!it) continue;
      h += `<div class="trow"><i>${it.icon}</i><span>${it.name}${it.ammo ? ` (${it.ammo[1]} Schuss)` : ''}</span><em>${eur(pr)}</em><button data-buy="${id}" ${S.money >= pr ? '' : 'disabled'}>Kaufen</button></div>`; }
    h += `</div><div><h3>Verkaufen</h3>`; let any = false;
    for (const [id, pr] of Object.entries(TRADE.sell)) { const n = g.count(id); if (!n) continue; any = true; const it = ITEMS[id];
      h += `<div class="trow"><i>${it.icon}</i><span>${it.name} ×${n}</span><em>${eur(pr)}</em><button data-sell="${id}">1</button><button data-sellall="${id}" class="sec">Alle</button></div>`; }
    if (!any) h += `<p class="hint">Kurt kauft: Felle, Fleisch, Fisch, Gemüse, Goldmünzen, Trockenfleisch, Bretter, Holz, Mehl.</p>`;
    h += `</div></div><p class="hint">E / Esc schließen</p>`; $('tradepanel').innerHTML = h;
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
    const bench = g.build.hasBench(g.P.pos), L = g.progress.level;
    for (const r of RECIPES) {
      if (r.bench && !bench) continue;
      const ok = g.canCraft(r);
      const need = r.desc || Object.entries(r.needs).map(([k, v]) => `${v}× ${ITEMS[k]?.name || k}`).join(' + ');
      h += `<div class="recipe ${ok ? 'ok' : ''}"><div><b>${r.name}</b><small>${need}${r.tools ? ' · Werkzeug: ' + r.tools.map(t => ITEMS[t].name).join(', ') : ''}${r.anyTool ? ' · Werkzeug: ' + r.anyTool.map(t => ITEMS[t].name).join(' oder ') : ''}</small></div>${r.lvl && L < r.lvl ? `<span class="lock">🔒 Level ${r.lvl}</span>` : `<button data-craft="${r.id}" ${ok ? '' : 'disabled'}>Herstellen</button>`}</div>`;
    }
    h += `</div><p class="hint">${bench ? '🛠️ Werkbank in der Nähe: Munition, Angel, Profi-Axt, großer Rucksack, Kerzen.' : 'Mehr Rezepte (Munition, Angel, Profi-Axt …) an einer Werkbank (G → Nützliches).'} · Tab / Esc schließen</p>`;
    $('invpanel').innerHTML = h;
  }
  show(id, on) { $(id).classList.toggle('show', on); }
  read(title, text) { $('reader').innerHTML = `<h2>${title}</h2><p>${text}</p><small>E / Esc schließen</small>`; this.show('reader', true); }
  damage() { this.vignette.classList.remove('hit'); void this.vignette.offsetWidth; this.vignette.classList.add('hit'); }
  setFrost(v) { this.frost.style.opacity = v; }
}
