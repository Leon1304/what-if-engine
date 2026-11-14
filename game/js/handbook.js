// Survival handbook (key B): a book with chapters – controls, survival values, food, crafting, tools, actions, dangers,
// places and the current task. Food, recipes and tools are generated from ITEMS / RECIPES so the book never goes stale.
import { ITEMS, RECIPES, BLUEPRINTS, WEAPONS, CROPS } from './items.js';
import { DIFF } from './life.js';
import { LEVELS, SIDE } from './progress.js';
import { SEASONS, SEASON_DAYS } from './seasons.js';

const STAT = { hunger: 'Hunger', thirst: 'Durst', warmth: 'Wärme', health: 'Gesundheit', stamina: 'Ausdauer' };
const fx = use => Object.entries(use).map(([k, v]) => `<span class="${v > 0 ? 'pos' : 'neg'}">${STAT[k]} ${v > 0 ? '+' : '−'}${Math.abs(v)}</span>`).join(' ');
const nm = id => id === 'brenn' ? '🪵 Ast oder Brennholz' : `${ITEMS[id]?.icon || ''} ${ITEMS[id]?.name || id}`;
const keyRow = (k, t) => `<tr><td><kbd>${k.split(' / ').join('</kbd> / <kbd>')}</kbd></td><td>${t}</td></tr>`;

export function chapters(g) {
  const S = g.S, found = g.places.filter(p => S.found[p.id]).length;
  const food = Object.entries(ITEMS).filter(([, it]) => it.use);
  const tools = Object.entries(ITEMS).filter(([, it]) => (it.tool || it.equip || it.battery) && !it.use && !it.weapon);
  return [
    { id: 'tasten', icon: '⌨️', t: 'Steuerung', h: `
      <table class="ktab">
        ${keyRow('W A S D', 'laufen')}${keyRow('Maus', 'umschauen')}${keyRow('Shift', 'sprinten (kostet Ausdauer)')}
        ${keyRow('Leertaste', 'springen')}${keyRow('Strg', 'ducken (leise, langsam)')}
        ${keyRow('E', 'benutzen · öffnen · aufheben · durchsuchen · klettern')}
        ${keyRow('F', 'Taschenlampe an/aus')}${keyRow('Linksklick / Rechtsklick', 'ohne Waffe: Taschenlampe an / aus · mit Angel: auswerfen / einholen')}${keyRow('Tab / C', 'Rucksack und Herstellen')}
        ${keyRow('1 – 5 / Mausrad', 'Gegenstand in der Schnellleiste wählen')}${keyRow('Q', 'gewählten Gegenstand essen, trinken oder benutzen')}
        ${keyRow('M', 'Wanderkarte (wenn du sie hast)')}${keyRow('Z (halten)', 'Zeit vorspulen – nur an sicheren Orten')}
        ${keyRow('Linksklick', 'Waffe: schießen / zustechen · beim Bauen: setzen')}${keyRow('E (am Auto)', 'reparieren · tanken · einsteigen / aussteigen; fahren: W S A D')}${keyRow('R', 'nachladen · beim Bauen: drehen')}
        ${keyRow('Rechte Maustaste', 'zielen (Gewehr: Zielfernrohr) · ohne Waffe: Fernglas')}${keyRow('G', 'Baumenü')}${keyRow('X', 'Gebautes abbauen · Bauen abbrechen')}
        ${keyRow('N', 'Wegmarker an deiner Stelle setzen')}${keyRow('B', 'dieses Handbuch')}${keyRow('Esc', 'Pause: Speichern, Laden, Schwierigkeit, Grafik')}
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
    { id: 'bauen', icon: '🔨', t: 'Bauen & Felder', h: `
      <p>Mit <kbd>G</kbd> öffnest du das Baumenü. Wähle einen Bauplan: vor dir erscheint ein Umriss – <b style="color:#2f6b3a">grün</b> = passt, <b style="color:#a33224">rot</b> = geht nicht (der Grund steht unten).
      <kbd>R</kbd> oder Mausrad dreht, Linksklick oder <kbd>E</kbd> baut, <kbd>X</kbd> bricht ab. Später baut <kbd>X</kbd> ein Bauwerk wieder ab (halbes Material zurück).</p>
      <table class="list">${BLUEPRINTS.map(b => `<tr><td>${b.icon} <b>${b.name}</b><br><small>${b.desc}</small></td><td>${b.stages ? b.stages.map((st, i) => `${i + 1}. ${st.name}: ${Object.entries(st.cost).map(([k, n]) => `${n}× ${ITEMS[k].name}`).join(', ')}`).join('<br>') : Object.entries(b.cost).map(([k, n]) => `${n}× ${ITEMS[k].name}`).join(', ')}${b.tools.length ? `<br><small>Werkzeug: ${b.tools.map(t => ITEMS[t].name).join(', ')}</small>` : ''}</td></tr>`).join('')}</table>
      <h4>Material</h4><ul><li><b>Baumstämme:</b> Baum mit der 🪓 Axt fällen (E, 6 Schläge – mit 🪚 Säge 3). Der Baum kippt um; den Stamm am Boden zerlegst du mit E in Baumstämme und Äste.</li>
      <li><b>Bretter:</b> im Rucksack (C) aus einem Baumstamm sägen – mit Axt 2, mit Säge 4.</li><li><b>Steine:</b> Steinhaufen im alten Steinbruch, Mauerschutt an der Burgruine, Säcke.</li>
      <li><b>Werkzeug:</b> 🔨 Hammer (Schuppen, Scheune) · ⛏️ Spaten (Schuppen, Scheune) · 🪚 Säge (Haus Nr. 7 im Dorf).</li></ul>
      <h4>Felder</h4><p>Feld bauen (Spaten), dann mit Saatgut in der Hand <kbd>E</kbd>: pflanzen. Regen oder Gießen (Wasser, Topf) lässt es schneller wachsen. Reif = <kbd>E</kbd> ernten.</p>
      <table class="list">${Object.values(CROPS).map(c => `<tr><td>${c.name}</td><td>${c.hours} Spielstunden · Ernte: ${Object.entries(c.gives).map(([k, n]) => `${n}× ${ITEMS[k].name}`).join(', ')}</td></tr>`).join('')}</table>
      <p class="tip">Die fertige Blockhütte ist dein Zuhause: drinnen greifen keine Tiere an, der Kamin wärmt, du kannst warten (Z) – mit Bett heilt Schlaf schnell.</p>` },
    { id: 'waffen', icon: '🔫', t: 'Waffen & Jagd', h: `
      <p>Wähle eine Waffe in der Schnellleiste (<kbd>1</kbd>–<kbd>5</kbd>). <b>Linksklick</b> schießt, <kbd>R</kbd> lädt nach, die <b>rechte Maustaste</b> zielt genauer (Jagdgewehr: Zielfernrohr).</p>
      <table class="list">${Object.entries(WEAPONS).map(([id, w]) => `<tr><td>${ITEMS[id].icon} <b>${w.name}</b></td><td>${ITEMS[id].desc}<br><small>Schaden ${w.pellets ? w.pellets + ' × ' : ''}${w.dmg} · Reichweite ${w.range} m${w.mag ? ' · Magazin ' + w.mag : ''}</small></td></tr>`).join('')}</table>
      <h4>Wo finde ich was?</h4><ul><li>🔪 Messer: Küche in Haus Nr. 3 (Dorf)</li><li>🔫 Pistole: Spind im Büro der Tankstelle</li><li>🔫 Schrotflinte: an der Wand in der Scheune</li><li>🎯 Jagdgewehr: in Bernds Hochsitz</li><li>🏹 Bogen und Pfeile: selbst herstellen (Messer, Äste, Seil, Steine)</li><li>📦 Munition: neben den Waffen, in vielen Säcken, Spind im Bauwagen, Werkstatt, Anglerhütte, Burg-Truhe · bei Kurt kaufen · selbst machen an der Werkbank (Metall + Sprengpulver, ab Level 4)</li></ul>
      <p class="tip">Erlegte Tiere zerlegst du mit dem Messer (<kbd>E</kbd>): Fleisch (am Feuer braten!) und Felle (2 Felle + Seil = Fellmantel). Schüsse sind laut: Rehe und Wölfe fliehen – Wildschweine und Bären werden wütend.</p>` },
    { id: 'level', icon: '⭐', t: `Level ${g.progress.level} & Nebenaufgaben`, h: `
      <p>Für fast alles bekommst du <b>Erfahrung (EP)</b>: Aufgaben, neue Orte, Bäume fällen, bauen, herstellen, ernten, jagen, angeln, Notizen lesen. Mit jedem Level werden neue Baupläne, Rezepte und Hausausbauten frei.</p>
      <p>Du hast <b>${g.S.xp} EP</b> – Level ${g.progress.level}${g.progress.next() ? `, nächstes Level bei ${g.progress.next()} EP` : ' (Maximum)'}.</p>
      <table class="list">${[2, 3, 4, 5, 6, 7].map(l => `<tr><td>Level ${l} (${LEVELS[l - 1]} EP)</td><td>${g.progress.unlocks(l).replace('Neu: ', '') || '–'}</td></tr>`).join('')}</table>
      <h4>Nebenaufgaben</h4><ul class="quests">${SIDE.map(q => `<li class="${g.S.side[q.id] ? 'done' : 'now'}">${g.S.side[q.id] ? '✔' : '◻'} <b>${q.t}</b>${g.progress.progressText(q)} – ${q.x} <small>(+${q.xp} EP)</small></li>`).join('')}</ul>` },
    { id: 'welt', icon: '🌦️', t: 'Händler, Auto, Wetter', h: `
      <dl><dt>🧔 Kurt (Dorfladen)</dt><dd>Kauft Felle, Fleisch, Fisch, Gemüse, Goldmünzen – verkauft Munition, Saatgut, Werkzeug, Solarlampen, Baustrahler … Das Wechselgeld aus der Kasse der Tankstelle ist dein Startkapital. Du hast <b>${(g.S.money || 0).toFixed(2).replace('.', ',')} €</b>.</dd>
      <dt>🚗 Dein Auto</dt><dd>Keilriemen + Werkzeugkasten aus der Werkstatt „KFZ Brandt“ im Dorf, dann einen vollen Kanister tanken. E = einsteigen, W/S/A/D fahren, E = aussteigen. Auf der Straße schnell, im Wald langsam.</dd>
      <dt>🐕 Bello</dt><dd>Kurts Hund streunt bei der Burgruine. Gib ihm Fleisch – dann folgt er dir, warnt vor Raubtieren und verbeißt Wölfe. E: „Bleib!“ / „Komm!“</dd>
      <dt>🛏️ Schlafen</dt><dd>Im eigenen Bett, in Betten im Dorf, im Wohnwagen oder in der Anglerhütte: E ab 18 Uhr → du wachst um 7 Uhr auf, geheilt. Nicht, wenn Raubtiere in der Nähe sind (außer drinnen).</dd>
      <dt>🎣 Angeln</dt><dd>Angel auswählen, aufs Wasser (Bach oder Waldsee) zielen, Linksklick. Zuckt die Pose: sofort klicken!</dd>
      <dt>🐇 Fallen</dt><dd>Kaninchenfalle weit weg von deiner Hütte aufstellen – mit der Zeit sitzt ein Kaninchen drin. Kaninchen am Feuer braten.</dd>
      <dt>🍂 Jahreszeiten</dt><dd>Alle ${SEASON_DAYS} Tage: ${SEASONS.join(' → ')}. Im Winter Schnee, große Kälte und kein Wachstum auf den Feldern; im Frühling und Sommer wächst alles schneller. Jetzt: <b>${g.seasons.season || ''}</b>.</dd>
      <dt>⛈️ Wetter</dt><dd>Regen, Nebel (kurze Sicht), Gewitter (Blitz und Donner), im Winter Schnee.</dd></dl>` },
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
        <li><b>Säcke:</b> Überall im Wald liegen Jutesäcke mit nützlichen Sachen – E zum Durchsuchen. In der Nähe glitzern Gegenstände leicht.</li>
        <li><b>Brunnen:</b> im Dorf und am Bauernhof gibt es sauberes Wasser (auch für den Topf).</li>
        <li><b>Erkunden:</b> ${g.places.length} Orte gibt es zu entdecken – im Norden das Dorf Tannbach, ein Aussichtsturm, eine Burgruine, ein Steinbruch und eine alte Mühle.</li>
        <li><b>Speichern:</b> <kbd>Esc</kbd> → Spielstand: 3 Speicherplätze + automatisch. Auch nach Updates kannst du weiterspielen.</li>
      </ul>` },
    { id: 'gefahr', icon: '🐺', t: 'Gefahren', h: `
      <dl>
        <dt>🐺 Wölfe</dt><dd>Kommen nachts aus dem Wald, umkreisen dich, beißen zu und ziehen sich kurz zurück. Sie fürchten Licht: leuchte sie mit der 🔦 Lampe an, trag eine Fackel oder bleib am Feuer. In Gebäuden, deiner Hütte und oben auf dem Hochsitz greifen sie nicht an.</dd>
        <dt>🐗 Wildschweine</dt><dd>Tagsüber im Wald. Kommst du zu nah, greifen sie an – kurz und heftig.</dd>
        <dt>🐻 Bären</dt><dd>Selten, vor allem im Norden. Sehr stark, Licht schreckt sie nicht – nur Feuer. Lieber ausweichen oder mit dem Gewehr.</dd>
        <dt>⚙️ Schwierigkeit</dt><dd>${Object.values(DIFF).map(d => `<b>${d.name}</b>`).join(' · ')} – jetzt: <b>${DIFF[g.S.diff]?.name || ''}</b>. Ändern im Startmenü oder mit <kbd>Esc</kbd>.</dd>
        <dt>🥶 Kälte</dt><dd>Nachts und bei Regen draußen sinkt die Wärme schnell. Bei wenig Wärme wirst du langsamer.</dd>
        <dt>🍄 Rote Pilze</dt><dd>Fliegenpilze sind giftig (−35 Gesundheit). Nur braune Pilze essen.</dd>
        <dt>💧 Bachwasser</dt><dd>Ungekocht wird dir oft schlecht. Abkochen!</dd>
        <dt>🪜 Stürze</dt><dd>Wer von hoch oben springt, verletzt sich.</dd>
        <dt>🔦 Batterie</dt><dd>Die Taschenlampe verbraucht Batterie. Batterien gibt es im Laden.</dd>
      </dl>` },
    { id: 'orte', icon: '🗺️', t: `Orte (${found}/${g.places.length})`, h: `
      <ul class="places">${g.places.map(p => `<li class="${S.found[p.id] ? 'on' : ''}">${S.found[p.id] ? '📍 ' + p.name : S.known[p.id] ? '🗺️ ' + p.name + ' (noch nicht besucht)' : '❔ noch nicht entdeckt'}</li>`).join('')}</ul>
      <p class="tip">Mit der 🗺️ Wanderkarte (Laden, Zeitungsständer) zeigt <kbd>M</kbd> alle Orte, die du gefunden hast. Klick auf die Karte setzt einen Wegmarker, <kbd>N</kbd> setzt einen an deiner Stelle – Marker siehst du im Spiel mit Entfernung. Infotafeln (Dorfplatz, Aussichtsturm) tragen weitere Orte ein.</p>` },
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
