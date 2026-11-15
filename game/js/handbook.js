// Survival handbook (key B): a book with chapters – controls, survival values, food, crafting, tools, actions, dangers,
// places and the current task. Food, recipes and tools are generated from ITEMS / RECIPES so the book never goes stale.
import { ITEMS, RECIPES, BLUEPRINTS, WEAPONS, CROPS, TRADE } from './items.js';
import { DIFF } from './life.js';
import { LEVELS, SIDE, BADGES, STATS } from './progress.js';
import { ILL } from './health.js';
import { SEASONS, SEASON_DAYS } from './seasons.js';
import { ALBUM_IDS } from './album.js';

const STAT = { hunger: 'Hunger', thirst: 'Durst', warmth: 'Wärme', health: 'Gesundheit', stamina: 'Ausdauer' };
const fx = use => Object.entries(use).map(([k, v]) => `<span class="${v > 0 ? 'pos' : 'neg'}">${STAT[k]} ${v > 0 ? '+' : '−'}${Math.abs(v)}</span>`).join(' ');
const nm = id => id === 'brenn' ? '🪵 Ast oder Brennholz' : `${ITEMS[id]?.icon || ''} ${ITEMS[id]?.name || id}`;
const keyRow = (k, t) => `<tr><td><kbd>${k.split(' / ').join('</kbd> / <kbd>')}</kbd></td><td>${t}</td></tr>`;


// ---------------------------------------------------------------- where to get every item (chapter „Fundorte“)
// Built from the world itself (pickups, cupboards, crates with loot, sacks), the recipes, Kurt's shop and the cooking list,
// plus the few sources that are game logic (animals, fishing, fields, filling a can). A test checks that every item has one.
const EXTRA = {
  fleisch: ['🦌 Reh, Wildschwein, Wolf, Bär oder Gämse erlegen und mit dem 🔪 Messer zerlegen (E am Tier)'],
  fell: ['🦌 Tiere erlegen und mit dem 🔪 Messer zerlegen (Reh, Wolf, Gämse 1, Bär 2)'],
  fisch: ['🎣 Angeln am Waldsee, am Bach oder am Bergsee (Angel in der Hand, Linksklick auswerfen, beim Biss einholen)'],
  kaninchen: ['🪤 Kaninchenfalle bauen (G → Nützliches) und am Morgen nachsehen'],
  kartoffel: ['🌱 Feld anlegen (G), Saatkartoffeln setzen, gießen, warten'], karotte: ['🌱 Feld anlegen (G), Karottensamen säen'], kuerbis: ['🌱 Feld anlegen (G), Kürbissamen säen'],
  kanister_voll: ['⛽ Leeren Kanister am Dieselfass im Schuppen oder an der Zapfsäule füllen (E)'],
  topf_wasser: ['💧 Mit dem 🫕 Topf am Bach schöpfen (E) – erst abkochen!'], topf_klar: ['💧 Mit dem 🫕 Topf am Brunnen im Dorf oder an der Regentonne füllen'],
  kaffee: ['☕ Kaffeemaschine in der Tankstelle (braucht Strom)'],
  trockenfleisch: ['🪵 Trockengestell bauen (G), rohes Fleisch aufhängen, 6 Stunden warten'],
  verdorben: ['🤢 Entsteht von selbst, wenn frisches Essen zu lange liegt'],
  stamm: ['🪓 Bäume mit der Axt fällen'], ast: ['🌲 Liegt überall im Wald; beim Fällen fallen Äste ab'], holz: ['🪓 Holzstapel, gefällte Bäume'],
  fliegenpilz: ['🍄 Wächst im Wald (giftig!)'], steinpilz: ['🍄 Wächst im Wald'], kraeuter: ['🌼 Kamille wächst auf Wiesen und an Wegen'],
  bergkristall: ['💎 Erst das Geröll im Stollen sprengen: 2× Sprengpulver + Seil + Feuerzeug'],
  saibling: ['🎣 Angeln im Bergsee (Gebirge)'], hecht: ['🎣 Angeln im Waldsee – im Winter am Eisloch beißen sie am besten'], goldforelle: ['🎣 Selten beim Angeln, überall (am Eisloch doppelt so oft)'],
  meteorit: ['☄️ Ganz selten fällt nachts ein Feuerball vom Himmel – wo er einschlägt, liegt ein Meteorit (Wegmarker „Einschlag“)'], kralle: ['🐻 Den alten Grimm in der Bärenhöhle (Gebirge) erlegen und zerlegen'],
  handfunk: ['🧔 Kurt gibt es dir, wenn du ihm von den 5 Notizen erzählt hast'], pfifferling: ['🍄 Wächst im Wald an den Wegen'], edelweiss: ['🤍 Wächst hoch oben im Fels am Steinberg'],
};
const near = (g, p) => { let best = null, bd = 1e9; for (const pl of g.places) { if (!pl.pos) continue; const d = Math.hypot(pl.pos.x - p.x, pl.pos.z - p.z) - (pl.r || 10); if (d < bd) { bd = d; best = pl; } }   // big places (village) win over small ones nearby
  return best && bd < 35 ? best.name : 'im Wald'; };
export function itemSources(g) {
  if (g._src) return g._src; const src = {}, add = (id, t) => { if (!ITEMS[id]) return; const a = src[id] ||= []; if (!a.includes(t)) a.push(t); };
  let sacks = new Set();
  for (const it of g.W.interactives) {
    const u = it.u || {}, ids = [...(u.item ? [u.item] : []), ...(u.bonus ? [u.bonus] : []), ...(u.loot || []).map(l => l[0])]; if (!ids.length) continue;
    const label = u.label || it.name, sack = /^Sack/.test(it.name);
    for (const id of ids) { if (sack) { sacks.add(id); continue; } add(id, `📍 ${label}${u.interact === 'search' || u.interact === 'drawer' ? ' durchsuchen' : ''} – ${near(g, it.center || it.pivot?.position || it.node.position)}${u.hidden ? ' (vergraben: mit dem Spaten graben)' : ''}`); }
  }
  for (const id of sacks) add(id, '🧺 manchmal in Jutesäcken (überall verteilt, Bello findet sie mit H)');
  for (const r of RECIPES) for (const id in r.gives || {}) add(id, `🔨 Herstellen: ${Object.entries(r.needs).map(([k, n]) => `${n}× ${ITEMS[k]?.name || k}`).join(' + ')}${r.tools ? ' · mit ' + r.tools.map(t => ITEMS[t]?.name).join(', ') : ''}${r.bench ? ' · an der Werkbank' : ''}${r.lvl ? ' · ab Level ' + r.lvl : ''}`);
  for (const [need, id] of g.cookList('wasser')) add(id, `🔥 Am Feuer / Ofen: ${Object.keys(need).map(k => k === 'wasser' ? 'Wasser (Flasche oder Topf)' : ITEMS[k]?.name || k).join(' + ')}`);
  for (const [id, pr] of Object.entries(TRADE.buy)) add(id, `🛒 Bei Kurt im Dorfladen: ${pr} €`);
  for (const [id, a] of Object.entries(EXTRA)) if (!src[id] || ['bergkristall', 'ast', 'kraeuter'].includes(id)) for (const t of a) add(id, t);
  return g._src = src;
}
const CATS = [['🍲 Essen & Trinken', it => it.use], ['🔫 Waffen & Munition', it => it.weapon || it.ammo], ['🪵 Baumaterial', it => it.mat],
  ['🎒 Werkzeug & Ausrüstung', it => it.tool || it.equip || it.battery], ['🗝️ Schlüssel, Hinweise & Sonstiges', () => true]];
function fundorte(g) {
  const src = itemSources(g), done = new Set(); let h = '<p class="tip">Hier steht, wo du jeden Gegenstand findest, kaufst oder herstellst. Orte, die du noch nicht kennst, findest du über die Karte (M) und Infotafeln.</p>';
  for (const [t, f] of CATS) {
    const ids = Object.keys(ITEMS).filter(id => !done.has(id) && f(ITEMS[id])).sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name, 'de')); ids.forEach(id => done.add(id));
    h += `<h4>${t}</h4><table class="list fund">${ids.map(id => `<tr><td>${nm(id)}</td><td>${(src[id] || ['❔ unbekannt']).slice(0, 6).map(x => `<div>${x}</div>`).join('')}${(src[id] || []).length > 6 ? `<div>… und ${src[id].length - 6} weitere Fundstellen</div>` : ''}</td></tr>`).join('')}</table>`;
  }
  return h;
}

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
        ${keyRow('N', 'Wegmarker an deiner Stelle setzen')}${keyRow('H', 'Bello: „Such!“ – er führt dich zu Säcken, Kräutern, Kristallen, Schätzen')}${keyRow('E (am Ruderboot)', 'einsteigen · W S rudern, A D drehen · E aussteigen')}${keyRow('J', 'Tagebuch &amp; Funk: Brandts Tagebuchseiten und Funksprüche')}${keyRow('K · V', 'nur im Kreativ-Modus: Kreativ-Menü · fliegen (Leertaste hoch, Strg runter)')}${keyRow('B', 'dieses Handbuch')}${keyRow('Esc', 'Pause: Speichern, Laden, Schwierigkeit, Grafik')}
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
      <p class="tip">In deine Taschen passen 10 Sachen, mit Rucksack 20. Größer geht's: Großer Rucksack 28 (Werkbank), Trekkingrucksack 36 (Kurt, Steinberghütte), Expeditionsrucksack 48 (Werkbank, Stufe 7). Mit <kbd>Tab</kbd> kannst du Dinge benutzen oder wegwerfen.</p>
      <p class="tip">Die ersten 5 Plätze im Rucksack sind deine Schnellleiste. Etwas anderes in die Hand nehmen: im Rucksack „✋ In die Hand“ – oder mit der Maus auf den Gegenstand zeigen und <kbd>1</kbd>–<kbd>5</kbd> drücken.</p>` },
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
      <dt>⛈️ Wetter</dt><dd>Regen, Nebel (kurze Sicht), Gewitter (Blitz und Donner), im Winter Schnee. Früh am Morgen liegt oft <b>Nebel</b> in den Senken – über dem See, den Wiesen, im Dorf; Hügel und Turm ragen heraus.</dd>
      <dt>🌪️ Unwetter</dt><dd>Ab und zu zieht ein schweres Unwetter auf (im Winter ein Schneesturm). Eine Stunde vorher kommt eine ⚠️ <b>Unwetterwarnung</b> (oben rechts mit Restzeit, auch im Wetterbericht der Funkstation). Draußen prasselt Hagel auf dich ein, Blitze schlagen in der Nähe ein, im Schneesturm erfrierst du schnell. Sicher bist du unter einem Dach, in Häusern, deiner Hütte, im Unterstand oder im Auto.</dd>
      <dt>📋 Kurts Tagesaufträge</dt><dd>Jeden Morgen ab 7 Uhr hat Kurt einen Wunsch („5 Fische bis heute Abend“). Im Laden annehmen, bis zur Frist bringen, abgeben → Geld und EP.</dd>
      <dt>🧊 Winter am See</dt><dd>Im Winter frieren Waldsee und Bergsee zu. Das Eis trägt – du kannst zur Insel laufen (Vorsicht, rutschig!). Mit Axt oder Spaten (<kbd>E</kbd> aufs Eis) hackst du ein Eisloch und angelst darin: Hechte beißen dort am besten.</dd>
      <dt>✨ Nachts</dt><dd>In warmen Nächten tanzen Glühwürmchen über den Wiesen und am Wasser. Bei klarem Himmel ziehen Sternschnuppen vorbei – und ganz selten ein Feuerball.</dd></dl>` },
    { id: 'gesund', icon: '🤧', t: 'Gesundheit & Vorräte', h: `
      <p>Jetzt: ${g.health.label() || '<b>gesund</b> 😊'}</p>
      <dl><dt>${ILL.erk.icon} ${ILL.erk.name}</dt><dd>Holst du dir, wenn dir kalt ist (Wärme unter 30) oder du im Regen draußen nass wirst – im Gebirge besonders schnell. Du hustest, wirst schneller müde und frierst leichter; ab 60 % kommt Fieber dazu (kostet Gesundheit). Warm und satt heilt sie von selbst, im Bett am schnellsten.</dd>
      <dt>${ILL.mag.icon} ${ILL.mag.name}</dt><dd>Von verdorbenem Essen, rohem Fleisch oder Fisch und Bachwasser. Hunger und Durst steigen schneller, ab 50 % sinkt die Gesundheit. Geht nach ein paar Stunden vorbei.</dd>
      <dt>🍵 Kräutertee</dt><dd>Kamille (wächst auf Wiesen und an Wegen, Säcke, Kurt) + Wasser am Feuer oder Gaskocher. Hilft gegen beides und wärmt.</dd>
      <dt>💊 Medizin</dt><dd>Heilt sofort alles. In Säcken, im Forsthaus, in der Steinberghütte und bei Kurt (9 €).</dd></dl>
      <h4>Essen verdirbt</h4><p>Frisches Essen hält nur eine Weile (Stunden = Spielstunden; 1 Spieltag = 24 Minuten). Danach wird es zu 🤢 verdorbenem Essen. Kälte hält es länger frisch: im Winter doppelt so lange, im Gebirge etwas länger – und in der <b>🧊 Kühlbox</b> fünfmal so lange (Anglerhütte, Kurt; mit G aufstellen). 🥓 Trockenfleisch verdirbt nie.</p>
      <table class="list">${Object.values(ITEMS).filter(it => it.spoil).map(it => `<tr><td>${it.icon} ${it.name}</td><td>${it.spoil} h</td></tr>`).join('')}</table>` },
    { id: 'raetsel', icon: '🧩', t: 'Rätsel & Gebirge', h: `
      <dl><dt>🏝️ Opa Willis Schatz</dt><dd>Im Logbuch der Anglerhütte am Waldsee steht, wo der Schatz liegt. Zur Insel kommst du nur mit dem <b>Ruderboot</b> am Steg (das Wasser ist zu tief). Zum Graben brauchst du einen Spaten.</dd>
      <dt>🏠 Forsthaus Eichengrund</dt><dd>Südlich des Dorfes, westlich der Straße. Verschlossen – lies den Zettel an der Tür. Drinnen: Hennings Tagebuch, ein Wandkalender und ein Waffenschrank mit Zahlenschloss.</dd>
      <dt>📡 Funkstation Nordwald</dt><dd>Auf dem Kahlberg südwestlich der Tankstelle (Pfad vom Wohnwagen). Die Stahltür hat ein Tastenfeld – der Code steht irgendwo im Wald. Drinnen hängt der Schlüssel der Pass-Schranke; mit Diesel im Notstrom-Aggregat funkt der Sender: Bergwacht und Wetterbericht.</dd>
      <dt>⛰️ Das Gebirge (zweite Karte)</dt><dd>Schranke am Nordende der Straße aufschließen und mit dem Auto weiterfahren – nach einer halben Stunde Serpentinen bist du im Hochtal am Steinberg. Zurück: einfach die Passstraße bergab fahren. Oben ist es kälter, es schneit statt zu regnen, und statt Rehen leben dort Gämsen.</dd>
      <dt>🛖 Steinberghütte</dt><dd>Förster Henning wartet dort. Betten, Ofen, Vorräte. Von hier führen Pfade zum Gipfelkreuz, zum Bergsee und zum Stollen.</dd>
      <dt>⛏️ Stollen „Glück auf“</dt><dd>Dunkel – Taschenlampe mitnehmen! Hinten ist er verschüttet. Mit 2 Sprengpulver, einer Zündschnur (Seil) und einem Feuerzeug sprengst du das Geröll. Dann schnell weg! Dahinter: Bergkristalle (Kurt zahlt 40 € pro Stück).</dd>
      <dt>🐕 Bello, such!</dt><dd>Ist Bello gezähmt, schickt ihn <kbd>H</kbd> auf die Suche: Er läuft zum nächsten ungeöffneten Sack, zu Kräutern, Pilzen, Kristallen oder Schätzen in bis zu 140 m und bellt dort, bis du kommst (🐾 zeigt, wo er ist).</dd></dl>` },
    { id: 'erfolge', icon: '🏅', t: `Erfolge (${BADGES.filter(b => (g.S.badges || {})[b.id]).length}/${BADGES.length})`, h: `
      <div class="badges">${BADGES.map(b => { const d = (g.S.badges || {})[b.id]; return `<div class="badge ${d ? 'on' : ''}"><i>${d ? b.icon : '🔒'}</i><b>${b.t}</b>${b.x}${d ? `<br><small>Tag ${d}</small>` : ''}</div>`; }).join('')}</div>
      <h4>Statistik</h4><table class="list">${STATS.map(([k, label, unit]) => { const v = g.S.stat[k] || 0; const txt = unit === 'km' ? (v / 1000).toFixed(1).replace('.', ',') + ' km' : unit === 'm' ? Math.round(v) + ' m' : unit === '€' ? v.toFixed(2).replace('.', ',') + ' €' : Math.round(v);
        return `<tr><td>${label}</td><td>${txt}</td></tr>`; }).join('')}<tr><td>📅 Tage überlebt</td><td>${g.S.day - 1}</td></tr><tr><td>📍 Orte entdeckt</td><td>${Object.keys(g.S.found).length} / ${g.places.length}</td></tr>
      <tr><td>✅ Nebenaufgaben</td><td>${Object.keys(g.S.side).length} / ${SIDE.length}</td></tr><tr><td>⭐ Erfahrung</td><td>${g.S.xp} EP (Level ${g.progress.level})</td></tr></table>` },
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
        <dt>🐻 Der alte Grimm</dt><dd>Ein Riesenbär, der in der Bärenhöhle am Steinberg schläft. Kommst du zu nah oder schießt du, wacht er auf. Kein Feuer hält ihn auf. Wenn er sich duckt, stürmt er geradeaus los – <b>spring zur Seite!</b> Unter 40 % wird er rasend. Läufst du weit weg, geht er zurück in die Höhle und erholt sich.</dd>
        <dt>🌪️ Unwetter</dt><dd>Hagel und Blitze draußen, im Winter Schneesturm – rechtzeitig unter ein Dach!</dd>
        <dt>⚙️ Schwierigkeit</dt><dd>${Object.values(DIFF).map(d => `<b>${d.name}</b>`).join(' · ')} – jetzt: <b>${DIFF[g.S.diff]?.name || ''}</b>. Ändern im Startmenü oder mit <kbd>Esc</kbd>.</dd>
        <dt>🥶 Kälte</dt><dd>Nachts und bei Regen draußen sinkt die Wärme schnell. Bei wenig Wärme wirst du langsamer.</dd>
        <dt>🍄 Rote Pilze</dt><dd>Fliegenpilze sind giftig (−35 Gesundheit). Nur braune Pilze essen.</dd>
        <dt>💧 Bachwasser</dt><dd>Ungekocht wird dir oft schlecht. Abkochen!</dd>
        <dt>🪜 Stürze</dt><dd>Wer von hoch oben springt, verletzt sich.</dd>
        <dt>🔦 Batterie</dt><dd>Die Taschenlampe verbraucht Batterie. Batterien gibt es im Laden.</dd>
      </dl>` },
    { id: 'tagebuch', icon: '📖', t: `Tagebuch & Funk (${g.story.pages()}/6)`, h: g.story.html() },
    { id: 'album', icon: '📔', t: `Sammelalbum (${g.album.count()}/${ALBUM_IDS.size})`, h: g.album.html() },
    ...(g.creative ? [{ id: 'kreativ', icon: '🎨', t: 'Kreativ-Modus', h: `<p>Im Kreativ-Modus gibt es keinen Hunger, keinen Durst, keine Kälte und keinen Schaden. Alle Baupläne, Ausbauten und Rezepte gehen ohne Material, Werkzeug und Level – die Blockhütte steht sofort fertig.</p>
      <ul><li><kbd>K</kbd> Kreativ-Menü: jeden Gegenstand holen (Shift+Klick = 10), Uhrzeit, Wetter (auch Unwetter), Jahreszeit (Winter = See friert zu), Ereignisse (Sternschnuppe, Feuerball, Wölfe, weißer Hirsch, Grimm), zu jedem Ort reisen.</li>
      <li><kbd>V</kbd> fliegen: Leertaste hoch, Strg runter, Shift schnell.</li><li>Gespeichert wird in einem eigenen Platz „🎨 Kreativ (auto)“ – dein normales Spiel bleibt unberührt.</li></ul>` }] : []),
    { id: 'fund', icon: '🔎', t: 'Fundorte aller Gegenstände', h: fundorte(g) },
    { id: 'orte', icon: '🗺️', t: `Orte (${found}/${g.places.length})`, h: `
      ${['tal', 'berg'].map(r => `<h4>${r === 'tal' ? '🌲 Nordwald' : '⛰️ Gebirge Steinberg'}</h4><ul class="places">${g.places.filter(p => p.region === r).map(p => `<li class="${S.found[p.id] ? 'on' : ''}">${S.found[p.id] ? '📍 ' + p.name : S.known[p.id] ? '🗺️ ' + p.name + ' (noch nicht besucht)' : '❔ noch nicht entdeckt'}</li>`).join('')}</ul>`).join('')}
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
  index(id) { return Math.max(0, chapters(this.g).findIndex(c => c.id === id)); }
  show(on, chapter) { if (chapter !== undefined) this.i = chapter; if (on) this.render(); this.el.classList.toggle('show', on); }
  flip(d) { this.i += d; this.render(); }
}
