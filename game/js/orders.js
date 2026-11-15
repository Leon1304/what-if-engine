// Kurt's daily orders (Tagesaufträge): every morning at 7:00 Kurt has a new wish („Bring mir 5 Fische bis heute Abend“).
// Accept it in his shop, bring the goods before the deadline (20:00, or noon the next day if you accept late) → money + XP.
// State: S.order = { day, id, acc, until, done, fail }.
import { ITEMS } from './items.js';

export const ORDERS = [
  { id: 'fisch', items: ['fisch', 'saibling', 'hecht', 'goldforelle'], n: 5, pay: 30, t: '5 Fische (egal welche)', say: '„Ich hab Appetit auf Fisch. Fünf Stück – Forelle, Hecht, ganz egal.“' },
  { id: 'fell', items: ['fell'], n: 2, pay: 26, t: '2 Felle', say: '„Mein Mantel ist durch. Zwei Felle, dann näh ich mir einen neuen.“' },
  { id: 'fleisch', items: ['fleisch'], n: 4, pay: 20, t: '4 rohes Fleisch', say: '„Für den Räucherofen: vier Stück Fleisch, roh.“' },
  { id: 'holz', items: ['holz'], n: 8, pay: 14, t: '8 Brennholz', say: '„Der Ofen frisst Holz wie nichts. Acht Scheite?“' },
  { id: 'pilze', items: ['steinpilz', 'pfifferling'], n: 4, pay: 16, t: '4 Speisepilze', say: '„Pilze für die Pfanne – Steinpilze oder Pfifferlinge. Keine roten!“', no: ['Winter'] },
  { id: 'kamille', items: ['kraeuter'], n: 4, pay: 12, t: '4 Kamille', say: '„Mein Hals kratzt. Vier Kamille für Tee, bitte.“', no: ['Winter'] },
  { id: 'gemuese', items: ['kartoffel', 'karotte'], n: 6, pay: 18, t: '6 Kartoffeln oder Karotten', say: '„Frisches Gemüse hab ich seit Wochen nicht gesehen. Sechs Stück?“', need: g => g.build.list.some(s => s.type === 'feld') },
  { id: 'braten', items: ['fisch_gebraten', 'fleisch_gebraten', 'kaninchen_gebraten'], n: 3, pay: 22, t: '3 gebratene Mahlzeiten', say: '„Ich bin zu alt zum Kochen. Drei warme Mahlzeiten vom Lagerfeuer?“' },
  { id: 'bretter', items: ['brett'], n: 10, pay: 15, t: '10 Bretter', say: '„Das Ladendach leckt. Zehn Bretter, dann flick ich es.“' },
  { id: 'trocken', items: ['trockenfleisch'], n: 3, pay: 24, t: '3 Trockenfleisch', say: '„Vorrat für den Winter: drei Stück Trockenfleisch.“', need: g => g.build.list.some(s => s.type === 'trockengestell') },
  { id: 'kristall', items: ['bergkristall'], n: 1, pay: 55, t: '1 Bergkristall', say: '„Ein Sammler aus der Stadt will einen Bergkristall. Bring mir einen!“', need: g => g.S.flags.berg },
];
const hash = n => { const s = Math.sin(n * 91.7 + 13.3) * 43758.5453; return s - Math.floor(s); };

export class Orders {
  constructor(game) { this.g = game; this.t = 0; }
  get S() { return this.g.S; }
  // today's order (from 7:00); the order of the day before stays until its deadline if you accepted it
  today() {
    const g = this.g, S = g.S, day = S.time >= 7 ? S.day : S.day - 1; if (day < 1) return null;
    const o = S.order;
    if (o && o.acc && !o.done && !o.fail) return o;
    if (o && o.day === day) return o;
    const ok = ORDERS.filter(x => !(x.no || []).includes(g.seasons.season) && (!x.need || x.need(g)));
    const pick = ok[Math.floor(hash(day) * ok.length)] || ORDERS[0];
    return S.order = { day, id: pick.id };
  }
  def(o = this.today()) { return o && (ORDERS.find(x => x.id === o.id) || ORDERS[0]); }
  have(d) { return d.items.reduce((a, k) => a + this.g.count(k), 0); }
  accept() {
    const S = this.S, o = this.today(); if (!o || o.acc) return;
    o.acc = 1; const base = (S.day - 1) * 24; o.until = S.time < 7 ? base + 12 : S.time < 14 ? base + 20 : base + 36;
    this.g.audio.sfx('quest'); this.g.ui.toast(`📋 Auftrag angenommen: ${this.def(o).t} – bis ${this.left(o)}.`, 'good');
  }
  deliver() {
    const g = this.g, S = g.S, o = this.today(), d = this.def(o); if (!o?.acc || o.done || o.fail || this.have(d) < d.n) return;
    let left = d.n; for (const k of d.items) { const m = Math.min(left, g.count(k)); if (m) { g.take(k, m); left -= m; } }
    o.done = 1; S.money = +(S.money + d.pay).toFixed(2); g.progress.add(45, 'Kurts Auftrag'); g.progress.stat('orders'); g.audio.sfx('coins');
    g.ui.toast(`✅ Kurt: „Danke, genau richtig!“ +${d.pay} € · Morgen früh hat er einen neuen Auftrag.`, 'good');
  }
  left(o) { const h = o.until - (this.S.day - 1) * 24, hh = ((h % 24) + 24) % 24; return `${h >= 24 ? 'morgen ' : ''}${String(Math.floor(hh)).padStart(2, '0')}:00 Uhr`; }
  update(dt) {
    this.t -= dt; if (this.t > 0) return; this.t = 1;
    const o = this.S.order; if (!o?.acc || o.done || o.fail) return;
    if (this.S.abs > o.until) { o.fail = 1; this.g.audio.sfx('error'); this.g.ui.toast(`⏰ Zu spät – Kurts Auftrag „${this.def(o)?.t}“ ist abgelaufen. Morgen gibt es einen neuen.`, 'warn'); }
  }
  // HUD line while an accepted order runs
  hud() { const o = this.S.order; if (!o?.acc || o.done || o.fail) return ''; const d = this.def(o); return `<b>📋 Kurt:</b> ${d.t} (${Math.min(this.have(d), d.n)}/${d.n}) bis ${this.left(o)}`; }
  // the box in Kurt's shop panel
  html() {
    const o = this.today(); if (!o) return ''; const d = this.def(o), S = this.S, have = this.have(d);
    const head = `<div class="order"><b>📋 Tagesauftrag</b> · ${d.say}<br><small>${d.items.map(k => ITEMS[k].icon).join(' ')} ${d.t} · Lohn <b>${d.pay} €</b> + 45 EP</small>`;
    if (o.done) return head + `<br><small>✅ Erledigt – morgen ab 7 Uhr gibt es einen neuen Auftrag.</small></div>`;
    if (o.fail) return head + `<br><small>⏰ Abgelaufen. Morgen ab 7 Uhr gibt es einen neuen Auftrag.</small></div>`;
    if (!o.acc) return head + `<br><button data-order="accept">Annehmen</button></div>`;
    return head + `<br><small>Bis ${this.left(o)} · du hast ${Math.min(have, d.n)}/${d.n}</small> <button data-order="deliver" ${have >= d.n ? '' : 'disabled'}>Abgeben</button></div>`;
  }
}
