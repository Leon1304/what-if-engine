// Kurt's daily orders (Tagesaufträge): every morning at 7:00 Kurt has a new wish („Bring mir 5 Fische bis heute Abend“).
// Accept it in his shop, bring the goods before the deadline (20:00, or noon the next day if you accept late) → money + XP.
// State: S.order = { day, id, acc, until, done, fail }.
import { ITEMS } from './items.js';
import { T } from './i18n.js';

export const ORDERS = [
  { id: 'fisch', items: ['fisch', 'saibling', 'hecht', 'goldforelle'], n: 5, pay: 30, t: T('5 Fische (egal welche)'), say: T('„Ich hab Appetit auf Fisch. Fünf Stück – Forelle, Hecht, ganz egal.“') },
  { id: 'fell', items: ['fell'], n: 2, pay: 26, t: T('2 Felle'), say: T('„Mein Mantel ist durch. Zwei Felle, dann näh ich mir einen neuen.“') },
  { id: 'fleisch', items: ['fleisch'], n: 4, pay: 20, t: T('4 rohes Fleisch'), say: T('„Für den Räucherofen: vier Stück Fleisch, roh.“') },
  { id: 'holz', items: ['holz'], n: 8, pay: 14, t: T('8 Brennholz'), say: T('„Der Ofen frisst Holz wie nichts. Acht Scheite?“') },
  { id: 'pilze', items: ['steinpilz', 'pfifferling'], n: 4, pay: 16, t: T('4 Speisepilze'), say: T('„Pilze für die Pfanne – Steinpilze oder Pfifferlinge. Keine roten!“'), no: ['Winter'] },
  { id: 'kamille', items: ['kraeuter'], n: 4, pay: 12, t: T('4 Kamille'), say: T('„Mein Hals kratzt. Vier Kamille für Tee, bitte.“'), no: ['Winter'] },
  { id: 'gemuese', items: ['kartoffel', 'karotte'], n: 6, pay: 18, t: T('6 Kartoffeln oder Karotten'), say: T('„Frisches Gemüse hab ich seit Wochen nicht gesehen. Sechs Stück?“'), need: g => g.build.list.some(s => s.type === 'feld') },
  { id: 'braten', items: ['fisch_gebraten', 'fleisch_gebraten', 'kaninchen_gebraten'], n: 3, pay: 22, t: T('3 gebratene Mahlzeiten'), say: T('„Ich bin zu alt zum Kochen. Drei warme Mahlzeiten vom Lagerfeuer?“') },
  { id: 'bretter', items: ['brett'], n: 10, pay: 15, t: T('10 Bretter'), say: T('„Das Ladendach leckt. Zehn Bretter, dann flick ich es.“') },
  { id: 'trocken', items: ['trockenfleisch'], n: 3, pay: 24, t: T('3 Trockenfleisch'), say: T('„Vorrat für den Winter: drei Stück Trockenfleisch.“'), need: g => g.build.list.some(s => s.type === 'trockengestell') },
  { id: 'kristall', items: ['bergkristall'], n: 1, pay: 55, t: T('1 Bergkristall'), say: T('„Ein Sammler aus der Stadt will einen Bergkristall. Bring mir einen!“'), need: g => g.S.flags.berg },
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
    this.g.audio.sfx('quest'); this.g.ui.toast(T('📋 Auftrag angenommen: {what} – bis {time}.', { what: this.def(o).t, time: this.left(o) }), 'good');
  }
  deliver() {
    const g = this.g, S = g.S, o = this.today(), d = this.def(o); if (!o?.acc || o.done || o.fail || this.have(d) < d.n) return;
    let left = d.n; for (const k of d.items) { const m = Math.min(left, g.count(k)); if (m) { g.take(k, m); left -= m; } }
    o.done = 1; S.money = +(S.money + d.pay).toFixed(2); g.progress.add(45, T('Kurts Auftrag')); g.progress.stat('orders'); g.audio.sfx('coins');
    g.ui.toast(T('✅ Kurt: „Danke, genau richtig!“ +{pay} € · Morgen früh hat er einen neuen Auftrag.', { pay: d.pay }), 'good');
  }
  left(o) { const h = o.until - (this.S.day - 1) * 24, hh = ((h % 24) + 24) % 24; const hs = String(Math.floor(hh)).padStart(2, '0'); return h >= 24 ? T('morgen {h}:00 Uhr', { h: hs }) : T('{h}:00 Uhr', { h: hs }); }
  update(dt) {
    this.t -= dt; if (this.t > 0) return; this.t = 1;
    const o = this.S.order; if (!o?.acc || o.done || o.fail) return;
    if (this.S.abs > o.until) { o.fail = 1; this.g.audio.sfx('error'); this.g.ui.toast(T('⏰ Zu spät – Kurts Auftrag „{what}“ ist abgelaufen. Morgen gibt es einen neuen.', { what: this.def(o)?.t }), 'warn'); }
  }
  // HUD line while an accepted order runs
  hud() { const o = this.S.order; if (!o?.acc || o.done || o.fail) return ''; const d = this.def(o); return T('<b>📋 Kurt:</b> {what} ({have}/{n}) bis {time}', { what: d.t, have: Math.min(this.have(d), d.n), n: d.n, time: this.left(o) }); }
  // the box in Kurt's shop panel
  html() {
    const o = this.today(); if (!o) return ''; const d = this.def(o), S = this.S, have = this.have(d);
    const head = `<div class="order"><b>${T('📋 Tagesauftrag')}</b> · ${d.say}<br><small>${d.items.map(k => ITEMS[k].icon).join(' ')} ${T('{what} · Lohn <b>{pay} €</b> + 45 EP', { what: d.t, pay: d.pay })}</small>`;
    if (o.done) return head + `<br><small>${T('✅ Erledigt – morgen ab 7 Uhr gibt es einen neuen Auftrag.')}</small></div>`;
    if (o.fail) return head + `<br><small>${T('⏰ Abgelaufen. Morgen ab 7 Uhr gibt es einen neuen Auftrag.')}</small></div>`;
    if (!o.acc) return head + `<br><button data-order="accept">${T('Annehmen')}</button></div>`;
    return head + `<br><small>${T('Bis {time} · du hast {have}/{n}', { time: this.left(o), have: Math.min(have, d.n), n: d.n })}</small> <button data-order="deliver" ${have >= d.n ? '' : 'disabled'}>${T('Abgeben')}</button></div>`;
  }
}
