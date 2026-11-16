// HUD and panels (plain DOM; markup + styles live in index.html).
import { ITEMS, RECIPES, TRADE } from './items.js';
import { T, LOCALE } from './i18n.js';

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
    this.clock.innerHTML = `${icon} ${T('Tag {day}', { day })} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}${extra}`;
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
    const s = inv[sel]; $('selname').textContent = s ? (ITEMS[s.id].use ? T('{name} – Q: benutzen', { name: ITEMS[s.id].name }) : ITEMS[s.id].name) : '';
  }
  xp(n, why) {
    const d = document.createElement('div'); d.className = 'xpfly'; d.textContent = T('+{n} EP', { n }) + (why ? ' · ' + why : ''); $('xpbox').appendChild(d);
    setTimeout(() => d.remove(), 1800); while ($('xpbox').children.length > 4) $('xpbox').firstChild.remove();
  }
  level(L, pct, xp) { const k = L + '|' + Math.round(pct); if (k === this._lv) return; this._lv = k; $('lvl').innerHTML = `<b>${T('⭐ Level {n}', { n: L })}</b><div class="tr" title="${T('{n} EP', { n: xp })}"><div class="fl" style="width:${pct}%"></div></div>`; }
  fade() { const f = $('fade'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
  renderTrade(g) {
    const S = g.S, eur = v => v.toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €', talk = [];
    talk.push(S.flags.metKurtTalk ? T('Kurt nickt dir zu. „Was brauchst du?“') : T('„Na, auch noch da? Ich bin Kurt. Die anderen sind alle weg – wegen dem Damm, sagen sie. Ich glaub da nicht dran. Ich hab noch Vorräte. Bezahlt wird in Euro – oder ich kauf dir Felle, Fleisch, Fisch und Gemüse ab.“'));
    S.flags.metKurtTalk = 1;
    if (!S.dog?.tame) talk.push(T('„Mein Hund Bello ist mir ausgebüxt. Er streunt oben bei der Burgruine herum. Mit einem Stück Fleisch kriegst du ihn rum.“'));
    if (!S.car?.fixed) talk.push(T('„Dein Auto ist liegengeblieben? Drüben in der Werkstatt von Brandt hängen Keilriemen, und Werkzeug liegt da auch.“'));
    const notes = Object.keys(S.notes || {}).length;
    if (notes >= 5 && !S.flags.kurtStory) talk.push(`<button data-talk="story">${T('📜 Erzähl Kurt, was in den Notizen steht')}</button>`);
    else if (S.flags.ending === 'wahrheit') talk.push(S.flags.villageBack ? T('„Hörst du das? Kinderlachen in Tannbach! Das haben wir dir zu verdanken. Für dich ist der Kaffee immer umsonst.“') : T('„Brandt sitzt! Ich hab’s im Radio gehört. Bald kommen die Leute zurück.“'));
    else if (S.flags.ending === 'schweigen') talk.push(S.flags.blastDone ? T('„Brandt hat gesprengt. Der halbe Hang ist runter. … Du weißt was darüber, stimmt’s? Na ja. Geschäft ist Geschäft.“') : T('„Du warst am Steinbruch, oder? Du siehst aus, als hättest du was gesehen.“'));
    else if (S.flags.kurtStory && !S.flags.gotRadio) talk.push(`<button data-talk="radio">${T('📻 Kurt nach Neuigkeiten fragen')}</button>`);
    else if (S.flags.kurtStory) talk.push(T('„Brandt und seine Sprengungen … Hast du auf Kanal 7 was gehört? Find raus, was er vorhat!“') + (g.story.pages() ? ' ' + T('(Tagebuchseiten: {n}/6)', { n: g.story.pages() }) : ''));
    else if (notes) talk.push(T('„Du liest die Zettel der Leute? ({n}/5) Wenn du alles weißt, erzähl’s mir.“', { n: notes }));
    let h = `<h2>${T('🧔 Kurt – Dorfladen')} <small>${T('Dein Geld: <b>{money}</b>', { money: eur(S.money || 0) })}</small></h2><div class="talk">${talk.map(t => `<p>${t}</p>`).join('')}</div>${g.orders.html()}<div class="tradecols"><div><h3>${T('Kaufen')}</h3>`;
    for (const [id, pr] of Object.entries(TRADE.buy)) { const it = ITEMS[id]; if (!it) continue;
      h += `<div class="trow"><i>${it.icon}</i><span>${it.name}${it.ammo ? ' ' + T('({n} Schuss)', { n: it.ammo[1] }) : ''}</span><em>${eur(pr)}</em><button data-buy="${id}" ${S.money >= pr ? '' : 'disabled'}>${T('Kaufen')}</button></div>`; }
    h += `</div><div><h3>${T('Verkaufen')}</h3>`; let any = false;
    for (const [id, pr] of Object.entries(TRADE.sell)) { const n = g.count(id); if (!n) continue; any = true; const it = ITEMS[id];
      h += `<div class="trow"><i>${it.icon}</i><span>${it.name} ×${n}</span><em>${eur(pr)}</em><button data-sell="${id}">1</button><button data-sellall="${id}" class="sec">${T('Alle')}</button></div>`; }
    if (!any) h += `<p class="hint">${T('Kurt kauft: Felle, Fleisch, Fisch, Gemüse, Goldmünzen, Trockenfleisch, Bretter, Holz, Mehl.')}</p>`;
    h += `</div></div><p class="hint">${T('E / Esc schließen')}</p>`; $('tradepanel').innerHTML = h;
  }
  hitmark() { const c = $('cross'); c.classList.remove('hit'); void c.offsetWidth; c.classList.add('hit'); }
  renderInventory(g) {
    const inv = g.S.inv, cap = g.capacity(), chest = g.build?.chest;
    let h = '';
    if (chest) {
      const cap = g.build.storeCap(chest), title = { kiste: T('📦 Vorratskiste'), regal: T('🗄️ Regal'), kuehlbox: T('🧊 Kühlbox – hier verdirbt nichts so schnell') }[chest.type] || T('Lager');
      h += `<h2>${title} <small>${T('{n}/{cap} Plätze · ← nimmt, → legt hinein', { n: chest.inv.length, cap })}</small></h2><div class="grid">`;
      for (let i = 0; i < cap; i++) { const s = chest.inv[i], it = s && ITEMS[s.id];
        h += it ? `<div class="cell"><i>${it.icon}</i><div>${it.name}${s.n > 1 ? ' ×' + s.n : ''}</div><small>${g.health.freshText(s)}</small><button data-get="${i}">${T('← Nehmen')}</button></div>` : `<div class="cell empty"></div>`; }
      h += `</div>`;
    }
    h += `<h2>${T('Rucksack')} <small>${T('{n}/{cap} Plätze · Plätze 1–5 = Schnellleiste · Maus auf Gegenstand + Taste 1–5 = dorthin legen', { n: inv.length, cap })}${g.S.flags.fur ? ' · ' + T('🧥 Fellmantel an') : g.S.flags.jacket ? ' · ' + T('🧥 Jacke an') : ''}</small></h2><div class="grid">`;
    for (let i = 0; i < cap; i++) {
      const s = inv[i], it = s && ITEMS[s.id];
      h += it ? `<div class="cell${i < 5 ? ' qb' : ''}${i === g.S.sel ? ' hand' : ''}${it.rare ? ' rare' : ''}" data-i="${i}" title="${it.desc || ''}">${i < 5 ? `<b class="key">${i + 1}</b>` : ''}${it.rare ? `<b class="rr">${T('★ selten')}</b>` : ''}<i>${it.icon}</i><div>${it.name}${s.n > 1 ? ' ×' + s.n : ''}</div>
        <small>${it.desc || (it.use ? Object.entries(it.use).map(([k, v]) => ({ hunger: T('Hunger'), thirst: T('Durst'), warmth: T('Wärme'), health: T('Gesundheit'), stamina: T('Ausdauer') }[k] + (v > 0 ? ' +' : ' ') + v)).join(', ') : '')}${g.health.freshText(s) ? '<br>' + g.health.freshText(s) : ''}</small>
        ${chest ? `<button data-put="${i}">${T('→ In die Kiste')}</button>` : it.use || s.id === 'spieluhr' ? `<button data-use="${i}">${s.id === 'spieluhr' ? T('Aufziehen') : T('Benutzen')}</button>` : it.read ? `<button data-read="${i}">${T('Lesen')}</button>` : ''}${!chest && i !== g.S.sel ? `<button data-hand="${i}" class="drop">${T('✋ In die Hand')}</button>` : ''}<button data-drop="${i}" class="drop">${T('Wegwerfen')}</button></div>`
        : `<div class="cell empty"></div>`;
    }
    h += `</div><h2>${T('Herstellen')} <small>C${g.creative ? ' · ' + T('🎨 Kreativ: alles ohne Material') : ''}</small></h2><div class="recipes">`;
    const bench = g.build.hasBench(g.P.pos) || g.creative, L = g.creative ? 99 : g.progress.level;
    for (const r of RECIPES) {
      if (r.bench && !bench) continue;
      const ok = g.canCraft(r);
      const need = r.desc || Object.entries(r.needs).map(([k, v]) => `${v}× ${ITEMS[k]?.name || k}`).join(' + ');
      h += `<div class="recipe ${ok ? 'ok' : ''}"><div><b>${r.name}</b><small>${need}${r.tools ? ' · ' + T('Werkzeug: {list}', { list: r.tools.map(t => ITEMS[t].name).join(', ') }) : ''}${r.anyTool ? ' · ' + T('Werkzeug: {list}', { list: r.anyTool.map(t => ITEMS[t].name).join(T(' oder ')) }) : ''}</small></div>${r.lvl && L < r.lvl ? `<span class="lock">${T('🔒 Level {n}', { n: r.lvl })}</span>` : `<button data-craft="${r.id}" ${ok ? '' : 'disabled'}>${T('Herstellen')}</button>`}</div>`;
    }
    h += `</div><p class="hint">${bench ? T('🛠️ Werkbank in der Nähe: Munition, Angel, Profi-Axt, großer Rucksack, Kerzen.') : T('Mehr Rezepte (Munition, Angel, Profi-Axt …) an einer Werkbank (G → Nützliches).')} · ${T('Tab / Esc schließen')}</p>`;
    $('invpanel').innerHTML = h;
  }
  // keypad (code locks): digits typed so far
  renderCode(label, typed, n) {
    $('codepanel').innerHTML = `<h2>🔢 ${label}</h2><div class="codedisp">${(typed + '_'.repeat(Math.max(0, n - typed.length))).split('').join(' ')}</div>
      <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map(k => `<button data-key="${k}" class="${typeof k === 'string' ? 'sec' : ''}">${k}</button>`).join('')}</div>
      <p class="hint">${T('Ziffern auch mit der Tastatur · Enter = OK · Esc schließen')}</p>`;
  }
  show(id, on) { $(id).classList.toggle('show', on); }
  read(title, text) { $('reader').innerHTML = `<h2>${title}</h2><p>${text}</p><small>${T('E / Esc schließen')}</small>`; this.show('reader', true); }
  damage() { this.vignette.classList.remove('hit'); void this.vignette.offsetWidth; this.vignette.classList.add('hit'); }
  setFrost(v) { this.frost.style.opacity = v; }
}
