// Survival handbook (key B): a book with chapters – controls, survival values, food, crafting, tools, actions, dangers,
// places and the current task. Food, recipes and tools are generated from ITEMS / RECIPES so the book never goes stale.
import { ITEMS, RECIPES } from './items.js';

const STAT = { hunger: 'Hunger', thirst: 'Durst', warmth: 'Wärme', health: 'Gesundheit', stamina: 'Ausdauer' };
const fx = use => Object.entries(use).map(([k, v]) => `<span class="${v > 0 ? 'pos' : 'neg'}">${STAT[k]} ${v > 0 ? '+' : '−'}${Math.abs(v)}</span>`).join(' ');
const nm = id => id === 'brenn' ? '🪵 Ast oder Brennholz' : `${ITEMS[id]?.icon || ''} ${ITEMS[id]?.name || id}`;
const keyRow = (k, t) => `<tr><td><kbd>${k.split(' / ').join('</kbd> / <kbd>')}</kbd></td><td>${t}</td></tr>`;

export function chapters(g) {
  const S = g.S, found = g.places.filter(p => S.found[p.id]).length;
  const food = Object.entries(ITEMS).filter(([, it]) => it.use);
  const tools = Object.entries(ITEMS).filter(([, it]) => (it.tool || it.equip || it.battery) && !it.use);
  return [
    { id: 'tasten', icon: '⌨️', t: 'Steuerung', h: `
      <table class="ktab">
        ${keyRow('W A S D', 'laufen')}${keyRow('Maus', 'umschauen')}${keyRow('Shift', 'sprinten (kostet Ausdauer)')}
        ${keyRow('Leertaste', 'springen')}${keyRow('Strg', 'ducken (leise, langsam)')}
        ${keyRow('E', 'benutzen · öffnen · aufheben · durchsuchen · klettern')}
        ${keyRow('F', 'Taschenlampe an/aus')}${keyRow('Tab / C', 'Rucksack und Herstellen')}
        ${keyRow('1 – 5 / Mausrad', 'Gegenstand in der Schnellleiste wählen')}${keyRow('Q', 'gewählten Gegenstand essen, trinken oder benutzen')}
        ${keyRow('M', 'Wanderkarte (wenn du sie hast)')}${keyRow('Z (halten)', 'Zeit vorspulen – nur an sicheren Orten')}
        ${keyRow('Rechte Maustaste', 'Fernglas (wenn du es hast)')}${keyRow('B', 'dieses Handbuch')}${keyRow('Esc', 'Pause, Grafik, Bildrate')}
      </table>
      <p class="tip">Im Buch: <kbd>←</kbd> <kbd>→</kbd> blättern, <kbd>B</kbd> oder <kbd>Esc</kbd> schließen.</p>` },
    { id: 'werte', icon: '❤️', t: 'Überleben', h: `
      <p>Unten links stehen deine fünf Werte. Fällt Hunger, Durst oder Wärme auf null, verlierst du Gesundheit.</p>
      <dl>
        <dt>❤️ Gesundheit</dt><dd>Sinkt durch Wölfe, Stürze, Gift und leere Werte. Steigt langsam von selbst, wenn du satt, nicht durstig und warm bist. Schnell: 🩹 Verband.</dd>
        <dt>🍗 Hunger</dt><dd>Sinkt mit der Zeit, beim Sprinten schneller. Essen aus dem Laden, Dosen, gebratene Pilze.</dd>
        <dt>💧 Durst</dt><dd>Sinkt schneller als Hunger. Getränke, Wasserhahn im WC, abgekochtes Bachwasser.</dd>
        <dt>🌡️ Wärme</dt><dd>Draußen nachts und im Regen sinkt sie schnell. Warm wird dir drinnen mit Strom, am Lagerfeuer, mit Kaffee oder heißer Suppe. Die 🧥 Jacke halbiert den Wärmeverlust.</dd>
        <dt>⚡ Ausdauer</dt><dd>Sprinten und Springen kosten Ausdauer, Stehen und Gehen füllen sie auf. Energydrink: lange sprinten.</dd>
      </dl>
      <p class="tip">Ein Spieltag dauert 24 Minuten (1 Sekunde = 1 Minute). Ab ca. 19 Uhr wird es dunkel.</p>` },
    { id: 'essen', icon: '🍲', t: 'Essen & Trinken', h: `
      <table class="list">${food.map(([, it]) => `<tr><td>${it.icon} ${it.name}${it.poison ? ' ⚠️' : ''}</td><td>${fx(it.use)}</td></tr>`).join('')}</table>
      <p class="tip">Kalte Dosensuppe in der Mikrowelle (Strom), am Feuer oder mit dem Gaskocher erwärmen – warm macht sie viel mehr satt.
      ⚠️ = riskant: Bachwasser immer abkochen, rote Pilze nie essen.</p>` },
    { id: 'herstellen', icon: '🔨', t: 'Herstellen', h: `
      <p>Öffne den Rucksack mit <kbd>Tab</kbd> oder <kbd>C</kbd>. Rezepte, für die du alles hast, leuchten auf.</p>
      <table class="list">${RECIPES.map(r => `<tr><td><b>${r.name}</b></td><td>${Object.entries(r.needs).map(([id, n]) => `${n} × ${nm(id)}`).join(' + ')}${(r.tools || []).length ? `<br><small>Werkzeug: ${r.tools.map(nm).join(', ')}</small>` : ''}</td></tr>`).join('')}</table>
      <h4>Am Feuer (E drücken)</h4>
      <ul><li>🥫 Dosensuppe → 🍲 heiße Suppe</li><li>🫕 Topf mit Bachwasser → abgekochtes Wasser</li><li>🍄 brauner Pilz → 🍳 gebratene Pilze</li><li>ohne etwas davon: Holz nachlegen</li></ul>
      <p class="tip">Brennholz: mit der 🪓 Axt umgestürzte Stämme und Totholz hacken (3 × E = 1 Holz) oder vom Holzstapel hinter der Tankstelle nehmen. Äste liegen im Wald.</p>` },
    { id: 'dinge', icon: '🎒', t: 'Ausrüstung', h: `
      <table class="list">${tools.map(([, it]) => `<tr><td>${it.icon} ${it.name}</td><td>${it.desc || ''}</td></tr>`).join('')}</table>
      <p class="tip">Ohne Rucksack hast du nur 4 Plätze, mit Rucksack 16. Mit <kbd>Tab</kbd> kannst du Dinge benutzen oder wegwerfen.</p>` },
    { id: 'tun', icon: '✋', t: 'Was du tun kannst', h: `
      <p>Schau ein Ding an – erscheint unten ein Hinweis mit <kbd>E</kbd>, kannst du etwas damit machen.</p>
      <ul>
        <li><b>Türen, Schränke, Kühlschränke, Kofferraum</b> öffnen und schließen. Manche Türen sind abgeschlossen – such einen Schlüssel oder nimm ein 🔧 Brecheisen.</li>
        <li><b>Durchsuchen:</b> Blumenkübel, Schränke, Container – oft liegt etwas darin.</li>
        <li><b>Strom:</b> 🛢️ Kanister am Dieselfass (Schuppen) füllen → Stromaggregat hinter dem Haus betanken. Mit Strom gehen Licht, Kühlschränke, Kaffeemaschine, Mikrowelle, Kasse, Schiebetür und Zapfsäulen. Der Tank reicht etwa 10 Stunden – dann nachtanken.</li>
        <li><b>Kaffeemaschine</b> (Strom): heißer Kaffee. <b>Mikrowelle</b> (Strom): Suppe erwärmen. <b>Wasserhahn</b> im WC: trinken.</li>
        <li><b>Lichtschalter</b> hinter der Kasse schaltet das Licht im Laden.</li>
        <li><b>Bach:</b> direkt trinken (riskant) oder mit dem 🍲 Topf Wasser schöpfen und abkochen.</li>
        <li><b>Lagerfeuer:</b> an der alten Feuerstelle oder überall mit „Lagerfeuer (vor dir)“ im Rucksack. Wärmt, hält Wölfe fern, zum Kochen.</li>
        <li><b>Leitern</b> hochklettern (E), oben noch einmal E zum Runterklettern.</li>
        <li><b>Lesen:</b> Zettel, Tagebuch, Fahrplan – sie verraten Hinweise.</li>
        <li><b>Warten</b> (<kbd>Z</kbd> halten): drinnen mit Strom, am brennenden Feuer oder mit 🛌 Schlafsack, wenn keine Wölfe in der Nähe sind.</li>
        <li><b>Erkunden:</b> ${g.places.length} Orte gibt es zu entdecken.</li>
      </ul>` },
    { id: 'gefahr', icon: '🐺', t: 'Gefahren', h: `
      <dl>
        <dt>🐺 Wölfe</dt><dd>Kommen nachts aus dem Wald, umkreisen dich, beißen zu und ziehen sich kurz zurück. Sie fürchten Licht: leuchte sie mit der 🔦 Lampe an, trag eine Fackel oder bleib am Feuer. In der Tankstelle und oben auf dem Hochsitz greifen sie nicht an.</dd>
        <dt>🥶 Kälte</dt><dd>Nachts und bei Regen draußen sinkt die Wärme schnell. Bei wenig Wärme wirst du langsamer.</dd>
        <dt>🍄 Rote Pilze</dt><dd>Fliegenpilze sind giftig (−35 Gesundheit). Nur braune Pilze essen.</dd>
        <dt>💧 Bachwasser</dt><dd>Ungekocht wird dir oft schlecht. Abkochen!</dd>
        <dt>🪜 Stürze</dt><dd>Wer von hoch oben springt, verletzt sich.</dd>
        <dt>🔦 Batterie</dt><dd>Die Taschenlampe verbraucht Batterie. Batterien gibt es im Laden.</dd>
      </dl>` },
    { id: 'orte', icon: '🗺️', t: `Orte (${found}/${g.places.length})`, h: `
      <ul class="places">${g.places.map(p => `<li class="${S.found[p.id] ? 'on' : ''}">${S.found[p.id] ? '📍 ' + p.name : '❔ noch nicht entdeckt'}</li>`).join('')}</ul>
      <p class="tip">Mit der 🗺️ Wanderkarte (liegt im Laden beim Zeitungsständer) siehst du alle Orte mit <kbd>M</kbd>.</p>` },
    { id: 'aufgabe', icon: '⭐', t: 'Aufgaben', h: `
      <ol class="quests">${g.quests.map((q, i) => i < S.quest ? `<li class="done">✔ ${q.t}</li>` : i === S.quest ? `<li class="now"><b>${q.t}</b><br>${q.x()}</li>` : '').join('')}</ol>
      <p class="tip">Der Stern ◇ auf dem Bildschirm zeigt die Richtung zum nächsten Ziel.</p>` },
  ];
}

// open / close / flip; the book is a panel with chapter tabs on the left and a paper page on the right
export class Handbook {
  constructor(game) { this.g = game; this.el = document.getElementById('book'); this.i = 0;
    this.el.addEventListener('click', e => { const b = e.target.closest('[data-ch]'); if (b) { this.i = +b.dataset.ch; this.render(); }
      if (e.target.closest('[data-flip]')) this.flip(+e.target.closest('[data-flip]').dataset.flip); });
  }
  get open() { return this.el.classList.contains('show'); }
  render() {
    const ch = chapters(this.g); this.i = (this.i + ch.length) % ch.length; const c = ch[this.i];
    this.el.innerHTML = `<div class="book">
      <nav>${ch.map((x, k) => `<button data-ch="${k}" class="${k === this.i ? 'on' : ''}">${x.icon} ${x.t}</button>`).join('')}</nav>
      <article><h3>${c.icon} ${c.t}</h3><div class="pg">${c.h}</div>
        <footer><button data-flip="-1">← zurück</button><span>Seite ${this.i + 1} / ${ch.length} · <kbd>←</kbd> <kbd>→</kbd> blättern · <kbd>B</kbd> schließen</span><button data-flip="1">weiter →</button><button data-close>✕</button></footer></article></div>`;
  }
  show(on, chapter) { if (chapter !== undefined) this.i = chapter; if (on) this.render(); this.el.classList.toggle('show', on); }
  flip(d) { this.i += d; this.render(); }
}
