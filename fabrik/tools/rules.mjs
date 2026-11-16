// Regeln der Spiellogik ohne Browser: node fabrik/tools/rules.mjs → letzte Zeile RULES OK (sonst Exit-Code 1)
// Optionen: --quick (ohne Bot-Partie), --bot-hours=N (Länge der Bot-Partie, Standard 4 h Spielzeit, bricht bei Prestige ab), --verbose
import { Factory, SAVE_VERSION, START_MONEY, MAP, PLOT, PLOTS, START_PLOT, DX, DY, DT, TPS, outCell, XP_LV } from '../js/sim.js';
import { ITEMS, ITEM_IDS, RAW, BUILDINGS, BUILDING_IDS, RECIPES, RECIPE_IDS, HIDDEN_RECIPES, RESEARCH, RESEARCH_IDS, PATENTS, PATENT_IDS,
  BIOMES, BIOME_IDS, ACHIEVEMENTS, ACHIEVEMENT_IDS, CRATES, CRATE_IDS, COLORS, TITLES, TUTORIAL } from '../js/data.js';
import { LANGS, DICTS, KINDS, t, name, desc, setLang, getLang, onLang, keys } from '../js/i18n.js';
import * as store from '../js/storage.js';

const ARGS = process.argv.slice(2), QUICK = ARGS.includes('--quick'), VERBOSE = ARGS.includes('--verbose');
const BOT_H = +(ARGS.find(a => a.startsWith('--bot-hours=')) || '=4').split('=')[1];
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
const O = START_PLOT * PLOT;                      // Ursprung des Startgrundstücks (48)
const allResearch = f => { for (const id of RESEARCH_IDS) if (!f.S.research.includes(id)) f.S.research.push(id); f._mods(); };
const rich = f => { f.S.money = 1e40; return f; };
const secs = (f, s) => f.tick(Math.round(s * TPS));
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// =====================================================================================
// 1. Daten vollständig und stimmig
// =====================================================================================
{
  const shapes = ['chunk', 'bar', 'plate', 'gear', 'coil', 'chip', 'box', 'orb', 'pipe', 'lens', 'rocket', 'robot'];
  const want = ['stein', 'eisenerz', 'kupfererz', 'kohle', 'sand', 'kristall', 'oel', 'titanerz', 'ziegel', 'eisenbarren', 'kupferbarren', 'glas', 'titanbarren', 'kunststoff',
    'eisenplatte', 'zahnrad', 'kupferdraht', 'rohr', 'linse', 'schaltkreis', 'motor', 'akku', 'fenster', 'roboter', 'computer', 'laser', 'solarpanel', 'rakete', 'schrott'];
  ok(want.every(i => ITEMS[i]) && ITEM_IDS.length === want.length, 'alle Gegenstands-Ids aus DESIGN.md vorhanden (' + ITEM_IDS.length + ')');
  ok(ITEM_IDS.every(i => { const x = ITEMS[i]; return x.name && x.desc && x.value > 0 && /^#[0-9a-f]{6}$/i.test(x.color) && shapes.includes(x.shape) && Number.isInteger(x.tier) && x.rp > 0; }), 'jeder Gegenstand hat name, desc, value, color, shape, tier, rp');
  const bWant = ['band', 'tunnel', 'verteiler', 'sortierer', 'bohrer', 'ofen', 'presse', 'drahtzug', 'montage', 'raffinerie', 'experiment', 'labor', 'verkauf', 'lager'];
  const sizes = { band: 1, tunnel: 1, verteiler: 1, sortierer: 1, bohrer: 2, ofen: 2, presse: 2, drahtzug: 2, montage: 3, raffinerie: 3, experiment: 3, labor: 2, verkauf: 2, lager: 2 };
  ok(bWant.every(b => BUILDINGS[b] && BUILDINGS[b].w === sizes[b] && BUILDINGS[b].h === sizes[b]) && BUILDING_IDS.length === bWant.length, 'alle Gebäude-Ids mit Größen aus DESIGN.md');
  ok(BUILDING_IDS.every(b => { const d = BUILDINGS[b]; return d.name && d.desc && d.cost > 0 && (d.unlock === 'start' || RESEARCH[d.unlock]?.fx.building === b); }), 'jedes Gebäude: Name, Kosten, Freischaltung über passende Forschung');
  ok(RECIPE_IDS.every(r => { const x = RECIPES[r]; return BUILDINGS[x.building] && ITEMS[x.out] && x.in.every(([i, n]) => ITEMS[i] && n > 0) && x.time > 0 && x.n > 0 && (x.unlock === 'start' || x.unlock === 'hidden' || RESEARCH[x.unlock]); }), 'Rezepte verweisen auf gültige Gebäude/Teile/Forschung');
  ok(RECIPE_IDS.every(r => RECIPES[r].unlock === 'start' || RECIPES[r].unlock === 'hidden' || RESEARCH[RECIPES[r].unlock].fx.recipe === r || RESEARCH[RECIPES[r].unlock].fx.building === RECIPES[r].building), 'Rezept-Freischaltung passt zur Forschung');
  ok(HIDDEN_RECIPES.length >= 8 && HIDDEN_RECIPES.every(r => RECIPES[r].building === 'montage' && RECIPES[r].in.length === 2), `${HIDDEN_RECIPES.length} versteckte Montage-Rezepte mit 2 Zutaten (≥ 8)`);
  const pairs = new Set(HIDDEN_RECIPES.map(r => RECIPES[r].in.map(a => a[0]).sort().join('+')));
  ok(pairs.size === HIDDEN_RECIPES.length, 'versteckte Rezepte haben eindeutige Zutatenpaare');
  ok(['roboter', 'computer', 'laser', 'solarpanel', 'rakete'].every(i => RECIPE_IDS.some(r => RECIPES[r].out === i && RECIPES[r].unlock === 'hidden')), 'Stufe 5+ nur über versteckte Rezepte');
  ok(RESEARCH_IDS.length >= 25 && RESEARCH_IDS.length <= 40 && RESEARCH_IDS.every(r => RESEARCH[r].req.every(q => RESEARCH[q]) && RESEARCH[r].name && RESEARCH[r].desc), `Forschungsbaum: ${RESEARCH_IDS.length} Knoten, Voraussetzungen gültig`);
  // Kein Kreis im Baum, alles erreichbar
  const known = new Set(); let grew = true; while (grew) { grew = false; for (const r of RESEARCH_IDS) if (!known.has(r) && RESEARCH[r].req.every(q => known.has(q))) { known.add(r); grew = true; } }
  ok(known.size === RESEARCH_IDS.length, 'jede Forschung ist erreichbar');
  ok(['band1', 'band2', 'band3', 'band4', 'band5'].every(r => RESEARCH[r]?.fx.belt) && RESEARCH_IDS.some(r => RESEARCH[r].fx.drill) && RESEARCH_IDS.some(r => RESEARCH[r].fx.gold) && RESEARCH.labor, 'Bandtempo I–V, Bohrertempo, Goldchance, Labor');
  ok(PATENT_IDS.length >= 13 && ['wueste', 'eis', 'mond'].every(b => PATENT_IDS.some(p => PATENTS[p].fx.biome === b)) && PATENT_IDS.every(p => PATENTS[p].req.every(q => PATENTS[q])), `${PATENT_IDS.length} Patente, Welten wueste/eis/mond freischaltbar`);
  ok(BIOME_IDS.join() === 'wiese,wueste,eis,mond' && BIOME_IDS.every(b => Object.keys(BIOMES[b].deposits).every(i => RAW.includes(i))), 'vier Welten mit Rohstoff-Vorkommen');
  ok(ACHIEVEMENT_IDS.length >= 22 && ACHIEVEMENT_IDS.every(a => { const x = ACHIEVEMENTS[a], r = x.reward; return x.cond && (r.money || r.color && COLORS[r.color] || r.title && TITLES[r.title] || r.start || r.crate); }), `${ACHIEVEMENT_IDS.length} Erfolge mit gültigen Belohnungen`);
  ok(CRATE_IDS.length >= 6 && CRATE_IDS.every(c => CRATES[c].w > 0), 'Kisten-Gewichte');
  const f = new Factory({ seed: 1 });
  ok(ACHIEVEMENT_IDS.every(a => { const m = ACHIEVEMENTS[a].cond.m; return m.startsWith('made_') ? ITEMS[m.slice(5)] : f.metric(m) !== undefined && ['sold','earned','gold','found','fails','contracts','daily','plots','maxLevel','belts','drills','machines','taktMax','gerald','research','prestiges','crates'].includes(m); }), 'Erfolgs-Kennzahlen bekannt');
}

// =====================================================================================
// 2. Sprachen
// =====================================================================================
{
  const en = new Set(keys('en')), de = new Set(keys('de'));
  const onlyEn = [...en].filter(k => !de.has(k)), onlyDe = [...de].filter(k => !en.has(k));
  ok(!onlyEn.length, 'jeder englische Schlüssel auch auf Deutsch' + (onlyEn.length ? ': ' + onlyEn.slice(0, 8).join(', ') : ''));
  ok(!onlyDe.length, 'kein deutscher Schlüssel ohne Englisch' + (onlyDe.length ? ': ' + onlyDe.slice(0, 8).join(', ') : ''));
  ok(Object.keys(LANGS).join() === 'en,de' && ['en', 'de'].includes(getLang()), 'Sprachen en/de, Start-Sprache ' + getLang() + ' (aus navigator.language)'); setLang('en');
  const tables = { item: ITEMS, building: BUILDINGS, recipe: RECIPES, research: RESEARCH, patent: PATENTS, biome: BIOMES, achievement: ACHIEVEMENTS, crate: CRATES, color: COLORS, title: TITLES };
  let missing = [];
  for (const lang of ['en', 'de']) for (const k of KINDS) for (const id in tables[k]) {
    if (!(`${k}.${id}.name` in DICTS[lang])) missing.push(lang + ':' + k + '.' + id);
    if (tables[k][id].desc && !(`${k}.${id}.desc` in DICTS[lang])) missing.push(lang + ':' + k + '.' + id + '.desc');
  }
  for (const s of TUTORIAL) for (const lang of ['en', 'de']) if (!(`tut.${s.id}` in DICTS[lang])) missing.push(lang + ':tut.' + s.id);
  ok(!missing.length, 'jede Daten-Id hat Namen/Beschreibung in beiden Sprachen' + (missing.length ? ': ' + missing.slice(0, 6).join(', ') : ''));
  let heard = null; const off = onLang(c => { heard = c; });
  const a = name('item', 'eisenerz'); setLang('de'); const b = name('item', 'eisenerz');
  ok(a === 'Iron Ore' && b === 'Eisenerz' && heard === 'de', `Sprachwechsel: ${a} → ${b}, Listener gerufen`);
  ok(t('contract.deliver', { n: 40, item: 'kupferdraht', secs: 240 }) === 'Liefere 40 Kupferdraht in 4 Min.', 'Auftragstext Deutsch: ' + t('contract.deliver', { n: 40, item: 'kupferdraht', secs: 240 }));
  ok(t('event.prestige', { n: 1 }).includes('Patentpunkt ') && t('event.prestige', { n: 3 }).includes('Patentpunkte'), 'Plural Deutsch');
  setLang('en'); off();
  ok(t('contract.deliver', { n: 40, item: 'kupferdraht', secs: 240 }) === 'Deliver 40 Copper Wire in 4 min', 'Auftragstext Englisch: ' + t('contract.deliver', { n: 40, item: 'kupferdraht', secs: 240 }));
  ok(t('unit.coins', { n: 1 }) === '1 coin' && t('unit.coins', { n: 1234 }) === '1,234 coins', 'Plural + Zahlenformat Englisch');
  ok(t('gibt.es.nicht') === 'nicht' && !t('item.ufo.name').includes('.'), 'fehlender Schlüssel zeigt nie den Rohschlüssel');
  ok(desc('item', 'stein').length > 5 && desc('recipe', 'ziegel') === '', 'desc() für Daten');
  // Jede Ereignis-/Sprechblasen-Vorlage, die die Sim verwendet, existiert
  const simKeys = ['contract.deliver', 'contract.daily', 'contract.expired', 'steve.eureka', 'steve.tip', 'offline.welcome', 'tut.done',
    ...TUTORIAL.map(s => 'tut.' + s.id), ...['hi', 'lunch', 'shortcut', 'oops', 'coffee', 'belt', 'boss', 'shiny'].map(l => 'gerald.' + l),
    ...['hmm', 'science', 'tip', 'eureka', 'coffee', 'explode'].map(l => 'steve.' + l), ...CRATE_IDS.map(c => 'crate.open.' + c),
    ...['unknown', 'research', 'bounds', 'plot', 'occupied', 'deposit', 'money', 'rp', 'points', 'known', 'locked'].map(r => 'reason.' + r),
    ...['idle', 'work', 'wait', 'full', 'norecipe', 'nodeposit'].map(s => 'state.' + s)];
  ok(simKeys.every(k => k in DICTS.en && k in DICTS.de), 'alle Text-Schlüssel der Sim vorhanden');
}

// =====================================================================================
// 3. Startzustand
// =====================================================================================
{
  const f = new Factory({ seed: 7 });
  const es = f.entities();
  ok(es.length === 1 && es[0].type === 'verkauf', 'Start: Verkaufsstation steht schon');
  const need = f.costOf('bohrer') + Math.round(BUILDINGS.bohrer.cost * BUILDINGS.bohrer.scale) + 20 * BUILDINGS.band.cost;
  ok(f.S.money >= need, `Startgeld ${f.S.money} reicht für 2 Bohrer + 20 Bänder (${need})`);
  const v = es[0], near = (item) => { for (let y = v.y - 10; y < v.y + 12; y++) for (let x = v.x - 10; x < v.x + 12; x++) { const d = f.deposit(x, y), c = f.canPlace('bohrer', x, y, 0); if (d && d.item === item && c.ok && c.item === item) return true; } return false; };
  ok(near('stein') && near('eisenerz'), 'Stein- und Eisen-Vorkommen in Reichweite (≤ 10 Felder), Bohrer setzbar');
  ok(['wueste', 'eis', 'mond'].every(b => { const g = new Factory({ seed: 3, biome: b }); return g.deposit(O + 2, O + 2)?.item === 'stein' && g.deposit(O + 11, O + 2)?.item === 'eisenerz'; }), 'auch in den anderen Welten Stein und Eisen am Start');
  ok(f.deposit(O + 20, O + 2) === null && f.plotState(START_PLOT + 1, START_PLOT) === 'buyable' && f.plotState(0, 0) === 'locked' && f.plotState(START_PLOT, START_PLOT) === 'open', 'fremdes Land verdeckt, Nachbarn kaufbar');
  ok(f.contracts.length === 3 && f.contracts.every(c => c.n > 0 && c.left > 0 && ITEMS[c.item] && c.key === 'contract.deliver'), 'drei Aufträge, sprachneutral (key + Ids)');
  const c1 = f.canPlace('bohrer', O + 5, O + 5, 0), c2 = f.canPlace('presse', O + 5, O + 5, 0), c3 = f.canPlace('band', O + 20, O, 0), c4 = f.canPlace('band', v.x, v.y, 0);
  ok(c1.reason === 'deposit' && c2.reason === 'research' && c3.reason === 'plot' && c4.reason === 'occupied', `Gründe: ${c1.reason}, ${c2.reason}, ${c3.reason}, ${c4.reason}`);
  ok(f.help().key === 'tut.drill' && f.help().target === 'bohrer', 'Anleitung beginnt beim Bohrer');
}

// Standard-Kette auf dem Startgrundstück: Eisen-Bohrer → 2 Bänder → Ofen → 3 Bänder → Verkauf (55,55)
function chain(f) {
  if (f.S.money < 400) f.S.money += 400;           // Ofen kommt im echten Spiel nach ~1 Minute dazu
  const d = f.place('bohrer', O + 10, O + 2, 2);
  f.placeLine('band', [[O + 9, O + 3, 2], [O + 8, O + 3, 2]]);
  const o = f.place('ofen', O + 6, O + 2, 1);
  f.placeLine('band', [[O + 7, O + 4, 1], [O + 7, O + 5, 1], [O + 7, O + 6, 1]]);
  return { d, o };
}

// =====================================================================================
// 4. Kette Bohrer → Band → Ofen → Band → Verkauf
// =====================================================================================
{
  const f = new Factory({ seed: 11 }); const m0 = f.S.money;
  const { d, o } = chain(f);
  ok(d && o && f.S.ents.length === 8, 'Kette gebaut (Bohrer, Ofen, 5 Bänder)');
  let first = null, firstItem = null;
  for (let i = 0; i < 60 * TPS && first === null; i++) { f.tick(); for (const e of f.events()) if (e.type === 'sold' && first === null) { first = f.time; firstItem = e.item; } }
  ok(first !== null && first < 30, `erstes Geld nach ${first?.toFixed(1)} s (< 30 s) für ${firstItem}`);
  ok(firstItem === 'eisenbarren', 'Ofen hat Eisenerz zu Barren geschmolzen');
  const before = f.S.money; secs(f, 120);
  ok(f.S.money > before + 300, `Kette verdient: +${Math.round(f.S.money - before)} in 2 min`);
  ok(f.S.money > m0, 'Geld liegt über dem Startgeld');
  ok(f.entity(o).state === 'work' || f.entity(o).state === 'wait', 'Ofen-Zustand für die UI: ' + f.entity(o).state);
  ok(f.entity(o).recipe === 'eisenbarren' && f.entity(o).auto === true, 'Ofen hat das Rezept automatisch gewählt');
  ok(f.help().step >= 2, 'Anleitung ist weitergelaufen (Schritt ' + f.help().step + ')');
  // Band-Interpolation liefert Weltkoordinaten auf den Bändern
  let n = 0, inside = true;
  f.forEachItem(0.5, (x, z, id, g, k) => { n++; if (!(x > O + 5 && x < O + 11 && z > O + 2 && z < O + 8)) inside = false; if (typeof k !== 'number') inside = false; });
  ok(n > 0 && inside, `forEachItem: ${n} Teile, alle auf den Bändern`);
}

// Start ohne Hilfe: nur Startgeld, Bohrer + Bänder zur Verkaufsstation
{
  const f = new Factory({ seed: 11 });
  const d = f.place('bohrer', O + 10, O + 2, 1);                 // Eisen, Ausgang (59,52)
  const n = f.placeLine('band', [[59, 52, 1], [59, 53, 1], [59, 54, 2], [58, 54, 2], [57, 54, 1]]);
  const d2 = f.place('bohrer', O + 1, O + 1, 0);                  // Stein, Ausgang (51,50)
  const n2 = f.placeLine('band', [[51, 50, 0], [52, 50, 0], [53, 50, 1], [53, 51, 1], [53, 52, 1], [53, 53, 1], [53, 54, 1], [53, 55, 0], [54, 55, 0]]);
  ok(d && d2 && n === 5 && n2 === 9 && f.S.money >= 0, `Startgeld reicht für 2 Bohrer und ${n + n2} Bänder (Rest ${f.S.money})`);
  let first = null; for (let i = 0; i < 60 * TPS && first === null; i++) { f.tick(); if (f.S.stats.sold) first = f.time; }
  ok(first !== null && first < 30, `erste Münze nach ${first?.toFixed(1)} s (< 30 s)`);
  secs(f, 210); ok(f.S.money >= f.costOf('ofen'), `nach 4 Minuten reicht es für den Ofen (${Math.round(f.S.money)} ≥ ${f.costOf('ofen')})`);
}

// =====================================================================================
// 5. Zählbilanz: keine Teile verloren oder verdoppelt (Seitenzufluss, Sortierer, Tunnel, Verteiler, Lager)
// =====================================================================================
function inTransit(f) {
  let c = f.itemCount();
  for (const e of f.S.ents) { if (e.out) c += e.out.length; if (e.q) c += e.q.length; if (e.inN) for (const v of e.inN) c += v; }
  return c;
}
function uniqueKeys(f) { const s = new Set(); let n = 0; for (const e of f.S.ents) if (e.items) for (const q of e.items) { s.add(q.k); n++; } return s.size === n; }
{
  const f = rich(new Factory({ seed: 5 })); allResearch(f);
  const A = f.place('bohrer', O + 1, O + 1, 0);                   // Stein → (51,50)
  const B = f.place('bohrer', O + 12, O + 1, 2);                  // Eisen → (59,50)
  f.placeLine('band', [[51, 50, 0], [52, 50, 0], [53, 50, 0]]);
  f.placeLine('band', [[59, 50, 2], [58, 50, 2], [57, 50, 2], [56, 50, 2], [55, 50, 2]]);
  f.placeLine('band', [[54, 50, 1], [54, 51, 1]]);                // Zusammenfluss von beiden Seiten
  const so = f.place('sortierer', 54, 52, 1); f.setFilter(so, 'eisenerz');
  f.placeLine('band', [[55, 52, 0]]);
  const t1 = f.place('tunnel', 56, 52, 0);
  f.place('band', 57, 52, 3);                                     // Hindernis über dem Tunnel
  const t2 = f.place('tunnel', 59, 52, 0);
  f.placeLine('band', [[60, 52, 1], [60, 53, 1]]);
  const vB = f.place('verkauf', 60, 54, 0);
  f.placeLine('band', [[54, 53, 1]]);
  const vt = f.place('verteiler', 54, 54, 1);
  f.placeLine('band', [[55, 54, 1], [54, 55, 0], [53, 54, 1]]);
  const la = f.place('lager', 52, 55, 1);
  f.placeLine('band', [[53, 57, 0], [54, 57, 3], [54, 56, 0]]);
  ok(A && B && so && t1 && t2 && vB && vt && la, 'Testnetz gebaut');
  const T1 = f.entity(t1), T2 = f.entity(t2);
  ok(T1.link === t2 && T2.link === t1 && T2.exit && !T1.exit, 'Tunnel-Eingang und -Ausgang gekoppelt');
  let hidden = true, sold = { A: {}, B: {} }, maxBelt = 0, sellSeen = new Set();
  for (let i = 0; i < 6000; i++) {
    f.tick();
    for (const e of f.events()) if (e.type === 'sold') { const k = e.id === vB ? 'B' : 'A'; sold[k][e.item] = (sold[k][e.item] || 0) + 1; }
    if (i % 50 === 0) {
      f.forEachItem(1, (x, z) => { if (z > 52 && z < 53 && x > 57 && x < 59) hidden = false; });
      for (const e of f.S.ents) if (e.type === 'band' && e.items.length > maxBelt) maxBelt = e.items.length;
    }
    if (i % 500 === 0 && !uniqueKeys(f)) { ok(false, 'doppeltes Teil auf den Bändern'); break; }
  }
  const st = f.S.stats, mined = st.mined, out = st.sold + inTransit(f);
  ok(mined === out && st.lost === 0, `Zählbilanz: gefördert ${mined} = verkauft ${st.sold} + unterwegs ${inTransit(f)}`);
  ok(uniqueKeys(f), 'jedes Teil genau einmal (eindeutige Schlüssel)');
  ok(maxBelt <= 4, 'nie mehr als 4 Teile auf einem Band');
  ok((sold.B.eisenerz || 0) > 50 && !sold.B.stein && (sold.A.stein || 0) > 50 && !sold.A.eisenerz, `Sortierer: Eisen links (${sold.B.eisenerz}), Stein geradeaus (${sold.A.stein})`);
  ok(hidden, 'Teile im Tunnel sind unsichtbar (forEachItem)');
  ok(f.entity(la).count >= 0 && f.S.ents.find(e => e.id === la), 'Lager im Durchfluss');
}
// Verteiler gleichmäßig
{
  const f = rich(new Factory({ seed: 5 })); allResearch(f);
  f.place('bohrer', O + 3, O + 1, 1);                              // Stein, Ausgang (52,51)
  f.placeLine('band', [[52, 51, 1], [52, 52, 1]]);
  const vt = f.place('verteiler', 52, 53, 1);
  f.placeLine('band', [[53, 53, 0], [54, 53, 0], [52, 54, 1], [51, 53, 2], [50, 53, 2]]);
  const sR = f.place('verkauf', 55, 52, 0), sS = f.place('verkauf', 52, 55, 0), sL = f.place('verkauf', 48, 52, 0);
  ok(vt && sR && sS && sL, 'Verteiler-Testnetz gebaut');
  f.tick(4000); const c = {}; for (const e of f.events()) if (e.type === 'sold') c[e.id] = (c[e.id] || 0) + 1;
  const v = [c[sR] || 0, c[sS] || 0, c[sL] || 0];
  ok(Math.max(...v) - Math.min(...v) <= 2 && Math.min(...v) > 20, 'Verteiler verteilt reihum: ' + v.join('/'));
  // ein Ausgang blockiert → der Rest geht an die anderen
  f.remove(sS); f.tick(2000); const c2 = {}; for (const e of f.events()) if (e.type === 'sold') c2[e.id] = (c2[e.id] || 0) + 1;
  ok((c2[sR] || 0) > 30 && (c2[sL] || 0) > 30, 'verstopfter Ausgang wird übersprungen');
}
// Stau: volles Band, nichts geht verloren
{
  const f = rich(new Factory({ seed: 5 }));
  f.place('bohrer', O + 1, O + 1, 0); f.placeLine('band', [[51, 50, 0], [52, 50, 0], [53, 50, 0]]);  // endet im Nichts
  f.tick(3000);
  const items = f.itemCount(), buf = f.S.ents.find(e => e.type === 'bohrer').out.length;
  ok(items === 12 && buf === 4 && f.S.stats.mined === items + buf, `Stau: ${items} Teile auf 3 Bändern, Bohrer-Puffer ${buf}, nichts verloren`);
  const r = f.S.ents.filter(e => e.type === 'band').map(e => e.items.map(q => q.p.toFixed(2)).join(',')).join(' | ');
  ok(f.S.ents.filter(e => e.type === 'band').every(e => e.items.every((q, i) => i === 0 || e.items[i - 1].p - q.p >= 0.2499)), 'Abstand im Stau eingehalten: ' + r);
}

// =====================================================================================
// 6. Gold
// =====================================================================================
{
  const f = new Factory({ seed: 3 }); chain(f); f.S.boosts.goldrain = 20; f.M.gold = 0;
  let goldSold = 0, goldMined = 0, goldVal = 0;
  for (let i = 0; i < 3 * 60 * TPS; i++) { f.tick(); for (const e of f.events()) { if (e.type === 'sold' && e.gold) { goldSold++; goldVal = e.value / e.takt; } if (e.type === 'gold') goldMined++; } }
  ok(goldMined === 20 && f.S.stats.gold === 20, 'Goldregen: genau 20 goldene Teile gefördert');
  ok(goldSold === 20, `Gold bleibt durch den Ofen erhalten: ${goldSold} goldene Barren verkauft`);
  ok(Math.abs(goldVal - ITEMS.eisenbarren.value * 25) < 1e-9, `Goldbarren ×25 wert (${goldVal})`);
  const g = new Factory({ seed: 3 }), v = g.S.ents[0].id, m = g.S.money;
  g.debugInsert(v, 'eisenbarren', true); ok(Math.abs(g.S.money - m - ITEMS.eisenbarren.value * 25) < 1e-9, `goldener Eisenbarren bringt ${ITEMS.eisenbarren.value} × 25`);
  // Montage: eine goldene Zutat reicht
  const h = rich(new Factory({ seed: 3 })); allResearch(h);
  const mo = h.place('montage', O + 1, O + 8, 0); h.setRecipe(mo, 'schaltkreis');
  h.debugInsert(mo, 'eisenplatte', true); h.debugInsert(mo, 'kupferdraht'); h.debugInsert(mo, 'kupferdraht');
  h.tick(60); const e = h.S.ents.find(x => x.id === mo);
  ok(e.out.length === 1 && e.out[0] === ITEM_IDS.indexOf('schaltkreis') * 2 + 1, 'Montage: goldene Platte + normaler Draht → goldener Schaltkreis');
  // Gold-Chance aus Forschung/Patenten
  const k = new Factory({ seed: 3 }); const g0 = k.M.gold; k.S.research.push('gold1', 'gold2'); k.S.patents.push('goldnase'); k._mods();
  ok(Math.abs(g0 - 0.005) < 1e-12 && Math.abs(k.M.gold - 0.02) < 1e-12, 'Goldchance 0,5 % → 2 % mit Goldader I+II und Goldnase');
}

// =====================================================================================
// 7. Takt
// =====================================================================================
{
  const f = new Factory({ seed: 3 }), v = f.S.ents[0].id;
  for (let s = 0; s < 70; s++) { f.debugInsert(v, 'stein'); f.tick(TPS); }
  const t70 = f.entity(v).takt;
  ok(t70 > 1.95 && t70 <= 2, `Takt steigt bei lückenlosem Fluss: ×${t70.toFixed(2)} nach 70 s`);
  const ev = f.events(); ok(ev.some(e => e.type === 'takt'), 'Ereignis bei vollem Takt');
  const m = f.S.money; f.debugInsert(v, 'stein'); ok(Math.abs(f.S.money - m - 2 * ITEMS.stein.value) < 1e-9, 'voller Takt verdoppelt den Preis');
  f.tick(Math.round(3 * TPS)); ok(f.entity(v).takt === 1, 'Lücke (3 s) setzt den Takt zurück');
  for (let s = 0; s < 30; s++) { f.debugInsert(v, 'stein'); f.tick(TPS); }
  const t30 = f.entity(v).takt; ok(t30 > 1.45 && t30 < 1.55, `nach 30 s wieder ×${t30.toFixed(2)}`);
}

// =====================================================================================
// 8. Maschinen-Sterne
// =====================================================================================
{
  const f = new Factory({ seed: 3 }); const { o } = chain(f);
  let lv = [];
  for (let i = 0; i < 6 * 60 * TPS; i++) { f.tick(); for (const e of f.events()) if (e.type === 'levelup' && e.id === o) lv.push([e.level, f.time]); }
  const E = f.entity(o);
  ok(lv.length >= 2 && lv[0][0] === 2 && E.level >= 3, `Ofen steigt auf: ${lv.map(([l, t2]) => '★' + l + ' bei ' + fmt(t2)).join(', ')}`);
  ok(E.xp >= XP_LV[E.level - 1] && (E.level === 5 || E.xp < XP_LV[E.level]), 'Erfahrung passt zur Stufe');
  ok(Math.abs(f.starMul(f.S.ents.find(e => e.id === o)) - (1 + 0.1 * (E.level - 1))) < 1e-12, '+10 % Tempo je Stern');
}

// =====================================================================================
// 9. Experimentiertisch und Rezeptbuch
// =====================================================================================
{
  const f = rich(new Factory({ seed: 3 })); allResearch(f);
  const x = f.place('experiment', O + 1, O + 8, 0);
  ok(!f.recipeAvailable('computer') && f.recipesFor('montage').every(r => RECIPES[r].unlock !== 'hidden'), 'versteckte Rezepte sind anfangs unbekannt');
  f.debugInsert(x, 'schaltkreis'); f.debugInsert(x, 'akku'); ok(!f.debugInsert(x, 'stein'), 'Experimentiertisch nimmt genau zwei Teile');
  f.tick(80); let ev = f.events();
  const disc = ev.find(e => e.type === 'discover');
  ok(disc && disc.recipe === 'computer' && disc.item === 'computer' && f.recipeAvailable('computer'), 'Experiment entdeckt Computer (Schaltkreis + Akku)');
  const E = f.S.ents.find(e => e.id === x);
  ok(E.out.length === 1 && E.out[0] >> 1 === ITEM_IDS.indexOf('computer'), 'Experiment liefert das neue Teil');
  ok(f.recipesFor('montage').includes('computer') && f.book().entries.find(b => b.id === 'computer').found, 'ab jetzt in der Montage baubar, im Rezeptbuch');
  f.debugInsert(x, 'stein'); f.debugInsert(x, 'sand'); f.tick(80); ev = f.events();
  const fl = ev.find(e => e.type === 'fail');
  ok(fl && fl.a === 'sand' && fl.b === 'stein' && !fl.known && f.S.book.fails.includes('sand+stein'), 'Fehlkombination gibt Schrott und wird gemerkt');
  ok(E.out.some(c => c >> 1 === ITEM_IDS.indexOf('schrott')), 'Schrott liegt im Ausgang');
  f.debugInsert(x, 'sand'); f.debugInsert(x, 'stein'); f.tick(80); ev = f.events();
  ok(ev.find(e => e.type === 'fail')?.known === true && f.S.book.fails.length === 1, 'bekannte Fehlkombination wird erkannt, nicht doppelt gemerkt');
  // Dr. Steves Tipp
  f.S.money = 1e6; const m = f.S.money, tip = f.buyTip();
  ok(tip && HIDDEN_RECIPES.includes(tip.recipe) && !f.S.book.found.includes(tip.recipe) && f.S.money < m && f.book().entries.find(b => b.id === tip.recipe).ins, `Dr. Steve verrät ${tip?.recipe} (${tip?.ins.join(' + ')})`);
  ok(f.tipCost() > m - f.S.money, 'Tipps werden teurer');
}

// =====================================================================================
// 10. Aufträge und Tagesauftrag
// =====================================================================================
{
  const f = new Factory({ seed: 9 }), v = f.S.ents[0].id;
  f.S.contracts[0] = { item: 'stein', n: 3, have: 0, secs: 60, left: 60, reward: 77, done: false, key: 'contract.deliver' };
  for (let i = 0; i < 3; i++) f.debugInsert(v, 'stein');
  let ev = f.events();
  ok(f.contracts[0].done && ev.some(e => e.type === 'contract' && e.kind === 'done' && e.i === 0 && e.item === 'stein'), 'Auftrag erfüllt (zählt verkaufte Teile)');
  const m = f.S.money, cr = f.S.crates.length, r = f.claimContract(0);
  ok(r && r.money === 77 && Math.abs(f.S.money - m - 77) < 1e-9 && f.S.crates.length === cr + 1, 'Belohnung: Geld + Kiste');
  ok(!f.contracts[0].done && f.contracts[0].have === 0, 'neuer Auftrag im freien Platz');
  ok(f.claimContract(0) === null, 'unerfüllter Auftrag lässt sich nicht abholen');
  const old = f.contracts[1]; old.left = 0.01; f.tick(); ev = f.events();
  ok(ev.some(e => e.type === 'contract' && e.kind === 'expired' && e.i === 1) && f.contracts[1] !== old, 'Auftrag läuft ab und wird ersetzt');
  // Tagesauftrag
  const d = f.setToday('2026-11-16');
  ok(d && d.date === '2026-11-16' && d.n > 0 && ITEMS[d.item] && d.key === 'contract.daily', `Tagesauftrag: ${d.n} ${d.item}`);
  ok(f.setToday('2026-11-16') === d, 'gleicher Tag → gleicher Auftrag');
  for (let i = 0; i < d.n; i++) f.debugInsert(v, d.item);
  ok(f.daily.done, 'Tagesauftrag erfüllt');
  const c0 = f.S.crates.length, rr = f.claimContract('daily');
  ok(rr && rr.crates === 2 && f.S.crates.length === c0 + 2 && f.S.total.daily === 1 && f.claimContract('daily') === null, 'Tagesauftrag: größere Belohnung, 2 Kisten, nur einmal');
  const d2 = f.setToday('2026-11-17'); ok(d2.date === '2026-11-17' && !d2.done, 'neuer Tag → neuer Tagesauftrag');
  const g = new Factory({ seed: 9 }), h = new Factory({ seed: 9 });
  ok(g.setToday('2026-12-01').item === h.setToday('2026-12-01').item, 'Tagesauftrag hängt nur vom Datum (und der Welt) ab');
}

// =====================================================================================
// 11. Grundstücke
// =====================================================================================
{
  const f = new Factory({ seed: 21 }); f.S.money = 1e6;
  const cx = START_PLOT + 1, cy = START_PLOT, c0 = f.plotCost();
  let before = 0; for (let y = cy * PLOT; y < cy * PLOT + PLOT; y++) for (let x = cx * PLOT; x < cx * PLOT + PLOT; x++) if (f.deposit(x, y)) before++;
  const r = f.buyPlot(cx, cy); let after = 0;
  for (let y = cy * PLOT; y < cy * PLOT + PLOT; y++) for (let x = cx * PLOT; x < cx * PLOT + PLOT; x++) if (f.deposit(x, y)) after++;
  ok(r && before === 0 && after > 10 && Object.values(r.found).reduce((a, b) => a + b, 0) === after, `Grundstück gekauft deckt ${after} Vorkommen auf: ${JSON.stringify(r.found)}`);
  ok(f.plotState(cx, cy) === 'open' && f.plotCost() > c0 && f.events().some(e => e.type === 'plot'), `Preis steigt ${c0} → ${f.plotCost()}`);
  ok(!f.buyPlot(0, 0) && f.canBuyPlot(0, 0).reason === 'locked', 'nicht angrenzendes Land ist gesperrt');
  ok(f.canPlace('band', cx * PLOT + 3, cy * PLOT + 3, 0).ok, 'auf neuem Land kann gebaut werden');
  let ruins = 0, crates = 0; const g = new Factory({ seed: 21 }); g.S.money = 1e30;
  for (let k = 0; k < 48; k++) { let done = false; for (let y = 0; y < PLOTS && !done; y++) for (let x = 0; x < PLOTS && !done; x++) if (g.plotState(x, y) === 'buyable') { const c = g.crates?.length; const res = g.buyPlot(x, y); if (res.ruin) ruins++; done = true; } }
  crates = g.S.crates.filter(c => c.src === 'ruin').length;
  ok(g.S.plots.length === 49 && ruins > 3 && crates === ruins, `ganze Karte kaufbar, ${ruins} Ruinen mit Kiste`);
  let kr = 0; for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) if (g.deposit(x, y)?.item === 'kristall') kr++;
  ok(kr > 0, `Kristall kommt vor (${kr} Felder)`);
}

// =====================================================================================
// 12. Gerald
// =====================================================================================
{
  const f = new Factory({ seed: 4 }); chain(f);
  let appeared = false, sat = false, sitStart = 0, blockedOk = true, leftAt = 0, clicks = 0;
  for (let round = 0; round < 60 && !sat; round++) {
    f.S.ger.wait = Math.min(f.S.ger.wait, 0.05); f.tick(2);
    if (f.gerald()) appeared = true;
    if (f.S.ger.belt) {
      for (let i = 0; i < 60 * TPS; i++) {
        f.tick();
        if (f.gerald()?.phase === 'sit') {
          sat = true; sitStart = f.time; const belt = f.S.ents.find(e => e.id === f.S.ger.belt), ps = new Map(belt.items.map(q => [q.k, q.p]));
          const same = () => [...ps].every(([k, p]) => belt.items.find(q => q.k === k)?.p === p);
          f.tick(TPS); if (!same()) blockedOk = false;
          f.tick(TPS); if (!same()) blockedOk = false;
          const e = f.entity(belt.id); if (!e.blocked) blockedOk = false;
          break;
        }
      }
      if (sat) break;
    } else { if (f.clickGerald()) clicks++; }
  }
  ok(appeared && clicks > 0, `Gerald erscheint, Klick gibt Kiste (${clicks}×, Kisten: ${f.S.crates.length})`);
  ok(f.S.crates.filter(c => c.src === 'gerald').length === clicks && f.S.total.gerald === clicks, 'jede Gerald-Kiste gezählt');
  ok(sat && blockedOk, 'Gerald setzt sich auf ein Band und blockiert es');
  for (let i = 0; i < 25 * TPS; i++) { f.tick(); const g = f.gerald(); if (!g || g.phase !== 'sit') { leftAt = f.time; break; } }
  ok(leftAt > 0 && leftAt - sitStart <= 20.01 && f._blockId === 0, `Blockade endet von selbst nach ${(leftAt - sitStart).toFixed(1)} s (≤ 20 s)`);
  const s = f.S.ger; ok(s.wait >= 0, 'Gerald geht wieder');
  // Klick während der Blockade löst sie sofort
  const g2 = new Factory({ seed: 4 }); chain(g2); let freed = false;
  for (let round = 0; round < 80 && !freed; round++) {
    g2.S.ger.wait = Math.min(g2.S.ger.wait, 0.05); g2.tick(2);
    if (!g2.S.ger.belt) { g2.clickGerald(); continue; }
    for (let i = 0; i < 60 * TPS; i++) { g2.tick(); if (g2.gerald()?.phase === 'sit') { g2.clickGerald(); freed = g2._blockId === 0 && !g2.gerald(); break; } }
  }
  ok(freed, 'Klick auf sitzenden Gerald gibt das Band sofort frei');
  // natürlicher Abstand 3–6 Minuten
  const h = new Factory({ seed: 8 }); const times = []; let last = 0;
  for (let i = 0; i < 40 * 60 * TPS; i++) { h.tick(); for (const e of h.events()) if (e.type === 'gerald' && e.kind === 'appear') { times.push(h.time - last); last = h.time; } }
  ok(times.length >= 5 && times.slice(1).every(d => d >= 180 && d <= 420), 'Gerald kommt alle 3–6 Minuten: ' + times.map(d => Math.round(d)).join(', '));
}

// =====================================================================================
// 13. Kisten
// =====================================================================================
{
  const f = new Factory({ seed: 12 }); chain(f); secs(f, 300);
  for (let i = 0; i < 200; i++) f.S.crates.push({ src: 'test' });
  const kinds = {}; let turboSeen = false, m0 = f.S.money, col0 = f.S.deco.colors.length;
  while (f.S.crates.length) { const r = f.openCrate(0); kinds[r.kind] = (kinds[r.kind] || 0) + 1; if (r.kind === 'turbo' && f.M.turbo === 2) turboSeen = true; if (r.kind === 'geld' && !(r.money >= 50)) kinds.bad = 1; }
  ok(CRATE_IDS.filter(c => c !== 'patent').every(c => kinds[c] > 0) && !kinds.bad, 'Kisteninhalte: ' + JSON.stringify(kinds));
  ok(kinds.geld > kinds.goldregen && (kinds.patent || 0) < 15, 'Gewichte: Geld häufig, Patent selten');
  ok(turboSeen && f.S.boosts.turbo > 0 && f.S.vouchers === kinds.gutschein && f.S.boosts.goldrain === CRATES.goldregen.n * kinds.goldregen && f.S.points === (kinds.patent || 0), 'Inhalte wirken (Turbo, Gutscheine, Goldregen, Patentpunkte)');
  ok(f.S.deco.colors.length === col0 + kinds.farbe, 'Bandfarben gesammelt: ' + f.S.deco.colors.join(','));
  const c = f.canResearch('tunnel'); ok(c.voucher && c.cost === Math.round(RESEARCH.tunnel.cost * 0.5), 'Gutschein halbiert die nächste Forschung');
  f.buyResearch('tunnel'); ok(f.S.vouchers === kinds.gutschein - 1, 'Gutschein verbraucht');
  const b0 = f.M.belt; f.S.boosts.turbo = 0.04; f.tick(2); ok(f.M.belt === b0 / 2 && f.M.turbo === 1, 'Turbo läuft ab');
}

// =====================================================================================
// 14. Offline-Einnahmen
// =====================================================================================
{
  const f = new Factory({ seed: 13 }); chain(f); secs(f, 6 * 60);
  const rate = f.incomeRate(), m = f.S.money, r = f.offline(3600);
  ok(rate > 1 && Math.abs(r.money - Math.round(rate * 3600 * 0.5)) <= 1 && Math.abs(f.S.money - m - r.money) < 1e-6, `Offline 1 h: ${r.money} (Schnitt ${rate.toFixed(2)}/s × 50 %)`);
  const r2 = f.offline(20 * 3600);
  ok(r2.seconds === 8 * 3600 && Math.abs(r2.money - Math.round(f.incomeRate() * 8 * 3600 * 0.5)) <= 1, 'Offline: Deckel bei 8 Stunden');
  ok(f.offline(-5).money === 0 && f.offline('quatsch').money === 0, 'Unsinnige Zeiten geben nichts');
  const hist = f.incomeHistory(10); ok(hist.length === 10 && hist.slice(-5).every(v => v > 0), 'Einnahmen-Verlauf je Minute für die Sparkline');
  const g = new Factory({ seed: 13 }); g.S.patents.push('nachtwache'); g._mods(); chain(g); secs(g, 300);
  ok(g.offline(20 * 3600).seconds === 12 * 3600, 'Patent Nachtwache: 12 Stunden');
}

// =====================================================================================
// 15. Prestige
// =====================================================================================
{
  const f = new Factory({ seed: 14 }); chain(f); secs(f, 120);
  f.S.research.push('tunnel'); f.S.book.found.push('laser'); f.S.ach.push('hundert'); f.S.deco.colors.push('rot'); f.S.crates.push({ src: 'x' });
  ok(!f.canPrestige() && f.prestige() === 0, 'Prestige erst ab 1 Mio. verdient');
  f.S.stats.earned = 4e6; const tot = f.S.total.earned;
  ok(f.canPrestige() && f.prestigePoints() === 6, 'Patente = floor(sqrt(4 Mio / 100 000)) = 6');
  const p = f.prestige('mond');
  const S = f.S;
  ok(p === 6 && S.points === 6 && S.biome === 'wiese', 'Prestige gibt 6 Punkte, gesperrte Welt → Wiese');
  ok(S.ents.length === 1 && S.ents[0].type === 'verkauf' && S.research.length === 0 && S.plots.length === 1 && S.stats.earned === 0 && S.rp === 0, 'zurückgesetzt: Gebäude, Forschung, Grundstücke, Verdienst');
  ok(S.money >= START_MONEY && S.money <= START_MONEY + S.bonusStart && S.contracts.length === 3, `Geld zurückgesetzt auf Startgeld (${S.money}, Start-Bonus aus Erfolgen ${S.bonusStart})`);
  ok(S.book.found.includes('laser') && S.ach.includes('hundert') && S.deco.colors.includes('rot') && S.total.earned === tot && S.total.prestiges === 1 && S.crates.length >= 1, 'behalten: Rezeptbuch, Erfolge, Deko, Gesamtstatistik, Kisten');
  ok(f.buyPatent('welt_wueste') && f.biomes().includes('wueste') && !f.buyPatent('welt_mond'), 'Wüstenlizenz gekauft, Mondlizenz braucht erst Eis');
  ok(f.buyPatent('startgeld') && f.S.points === 3, 'Patentpunkte werden ausgegeben');
  f.S.stats.earned = 1e6; const p2 = f.prestige('wueste');
  ok(p2 === 3 && f.S.biome === 'wueste' && f.S.money >= START_MONEY + 2000 && f.S.money <= START_MONEY + 2000 + f.S.bonusStart && f.S.patents.includes('startgeld'), 'zweites Prestige in die Wüste, Startkapital wirkt');
  ok(f.deposit(O + 2, O + 2)?.item === 'stein' && f.canPlace('bohrer', O + 1, O + 1, 0).ok, 'neue Welt mit neuer Karte, Start-Vorkommen da');
  ok(f.S.ach.includes('prestige1') || f.events().some(e => e.type === 'achievement' && e.id === 'prestige1'), 'Erfolg „Neuanfang“');
  const g = new Factory({ seed: 14 }); g.S.patents.push('forschergeist', 'grundwissen'); g._mods(); g.S.stats.earned = 1e6; g.prestige();
  ok(g.S.research.includes('tunnel') && g.S.research.includes('presse') && !g.S.research.includes('labor2'), 'Patent Grundwissen: billige Forschung sofort bekannt (' + g.S.research.length + ')');
}

// =====================================================================================
// 16. Speichern / Laden / Determinismus / alte Stände / Undo
// =====================================================================================
function busyFactory(seed) {
  const f = rich(new Factory({ seed })); allResearch(f);
  chain(f);
  f.place('bohrer', O + 1, O + 1, 0); f.placeLine('band', [[51, 50, 0], [52, 50, 0], [53, 50, 1], [53, 51, 1]]);
  const vt = f.place('verteiler', 53, 52, 1); f.placeLine('band', [[54, 52, 0], [53, 53, 1], [52, 52, 2]]);
  f.place('verkauf', 55, 51, 0); f.place('lager', 52, 54, 1); f.place('labor', 50, 52, 0);
  f.place('bohrer', O + 1, O + 10, 0); const pr = f.place('ofen', O + 3, O + 10, 0);
  const ex = f.place('experiment', O + 5, O + 9, 0); f.placeLine('band', [[56, 59, 0], [57, 59, 0]]);
  f.place('verkauf', 58, 58, 0); f.place('tunnel', 52, 60, 0);
  f.S.ger.wait = 30;
  return f;
}
{
  const f = busyFactory(31); secs(f, 150);
  const j1 = JSON.stringify(f.toJSON());
  const g = Factory.load(j1);
  ok(JSON.stringify(g.toJSON()) === j1, 'Speichern → Laden ergibt denselben Stand');
  f.tick(2000); g.tick(2000);
  const a = JSON.stringify(f.toJSON()), b = JSON.stringify(g.toJSON());
  ok(a === b, 'Determinismus: nach weiteren 2000 Ticks identisch (' + a.length + ' Zeichen)');
  const h1 = busyFactory(31), h2 = busyFactory(31); h1.tick(3000); h2.tick(3000);
  ok(JSON.stringify(h1.toJSON()) === JSON.stringify(h2.toJSON()), 'gleiche Saat + gleiche Aktionen → gleiches Ergebnis');
  ok(f.S.v === SAVE_VERSION && JSON.parse(a).v === SAVE_VERSION, 'Spielstand trägt SAVE_VERSION ' + SAVE_VERSION);
  const js = JSON.parse(a); ok(js.ents.every(e => typeof e.type === 'string' && (!e.items || e.items.every(q => typeof q[0] === 'string'))), 'Spielstand speichert über Namen/Ids');
  // Speicherplätze (ohne localStorage → Ersatzspeicher)
  ok(store.save(f, 1, 123456, 'Test') && store.load(1)?.factory.S.money === f.S.money && store.info(1).name === 'Test' && store.list().length === 4, 'Speicherplatz 1 schreiben/lesen');
  const txt = store.exportText(f, 1, 'x'); ok(store.importText(txt)?.factory.toJSON().ents.length === f.S.ents.length && store.exportName('Meine Fabrik') === 'Meine_Fabrik.cogtopia.json', 'Export/Import als .cogtopia.json');
  ok(store.importText('{kaputt') === null && store.load(3) === null, 'kaputter Import → null, leerer Platz → null');
}
{
  // handgeschriebener alter Stand (Version 0, fehlende Felder, Unbekanntes)
  const old = { seed: 5, money: 500, research: ['tunnel', 'gibtsnicht'], plots: [24, 25, 99],
    ents: [{ type: 'verkauf', x: 55, y: 55 }, { type: 'band', x: 54, y: 55, rot: 0, items: [['stein', 0.4, 1], ['ufo', 0.1, 2]] },
      { type: 'bohrer', x: 49, y: 49, rot: 0 }, { type: 'ufo', x: 1, y: 1 }, { type: 'ofen', x: 50, y: 52, recipe: 'quatsch' }, { type: 'band', x: 54, y: 55 }],
    contracts: [{ item: 'stein', n: 5, have: 1, secs: 100, left: 50, reward: 10, done: false }, { item: 'ufo' }] };
  let f2 = null, err = null; try { f2 = Factory.load(old); f2.tick(200); } catch (e) { err = e; }
  ok(!err && f2 && f2.S.v === SAVE_VERSION && f2.S.ents.length === 4 && f2.S.research.join() === 'tunnel' && f2.S.plots.length === 2, 'alter Stand (v0) lädt, Unbekanntes wird übersprungen' + (err ? ': ' + err.message : ''));
  ok(f2 && f2.S.contracts.length === 3 && f2.S.contracts[0].have >= 1 && f2.S.contracts.every(c => c.key) && f2.S.stats.ring.length === 180 && f2.S.ger.wait >= 0, 'fehlende Felder bekommen Grundwerte');
  ok(f2 && f2.S.ents.every(e => e.id > 0) && new Set(f2.S.ents.map(e => e.id)).size === 4 && f2.S.ents.find(e => e.type === 'ofen').recipe === null, 'Ids vergeben, ungültiges Rezept → automatisch');
  const f3 = Factory.load({}); ok(f3.S.ents.length === 1 && f3.S.money === START_MONEY, 'leerer Stand → neue Fabrik');
}
{
  const f = new Factory({ seed: 6 }); const s0 = JSON.stringify({ m: f.S.money, e: f.toJSON().ents });
  const id = f.place('bohrer', O + 1, O + 1, 0); f.undo();
  ok(JSON.stringify({ m: f.S.money, e: f.toJSON().ents }) === s0, 'Rückgängig: Bauen');
  const n = f.placeLine('band', [[51, 50, 0], [52, 50, 0], [53, 50, 0], [54, 50, 1]]); f.undo();
  ok(n === 4 && JSON.stringify({ m: f.S.money, e: f.toJSON().ents }) === s0, 'Rückgängig: gezogene Bandlinie als ein Schritt');
  f.S.money += 1000; const b = f.place('bohrer', O + 1, O + 1, 0); const o = f.place('ofen', O + 3, O + 1, 0); f.rotate(o); const before = JSON.stringify(f.toJSON().ents);
  f.remove(o); ok(!f.entity(o), 'Abriss'); f.undo(); ok(JSON.stringify(f.toJSON().ents) === before, 'Rückgängig: Abriss (gleiche Id, Drehung, Stufe)');
  f.undo(); ok(f.entity(o).rot === 0, 'Rückgängig: Drehen');
  ok(f.undoStack.length <= 20, 'höchstens 20 Schritte');
  const m = f.S.money; f.remove(b); ok(f.S.money === m + f.costOf('bohrer'), 'Abriss erstattet voll');
  for (let i = 0; i < 30; i++) { f.place('band', 49 + (i % 10), 60 + Math.floor(i / 10), 0); } ok(f.undoStack.length === 20, 'Undo-Stapel auf 20 begrenzt');
  // Band über Band: nur drehen
  const f4 = new Factory({ seed: 6 }); const b1 = f4.place('band', 50, 60, 0), m4 = f4.S.money, b2 = f4.place('band', 50, 60, 1);
  ok(b1 === b2 && f4.entity(b1).rot === 1 && f4.S.money === m4, 'Band auf Band dreht nur (für gezogene Linien)');
}

// =====================================================================================
// 16b. Regressionen aus dem Code-Review (je Fund ein Test; Ausnahmen zählen als Fehlschlag)
// =====================================================================================
const check = (m, fn) => { let r = false, err = ''; try { r = fn(); } catch (e) { err = ' – wirft: ' + e.message; } ok(!!r, m + err); };
const tunnelItemsOk = f => f.S.ents.every(e => {
  if (!e.items) return true; const n = f.N.get(e.id), L = n.len;
  return e.items.every((q, i) => q.p <= L + 1e-9 && q.p >= -1e-9 && (i === 0 || e.items[i - 1].p - q.p >= 0.25 - 1e-9));
});
// Fund 1: Montage-Automatik blockiert bei gemeinsamer Zutat nicht mehr
check('Review 1: Montage-Automatik stellt bei gemeinsamer Zutat um (Draht → Schaltkreis, dann Zahnrad → Motor, Draht bleibt)', () => {
  const f = rich(new Factory({ seed: 3 })); allResearch(f);
  const mo = f.place('montage', O + 2, O + 11, 0), e = f.N.get(mo).e, lost = f.S.stats.lost;
  const a = f.debugInsert(mo, 'kupferdraht'), r1 = e.recipe, b = f.debugInsert(mo, 'zahnrad'), c = f.debugInsert(mo, 'kupferdraht');
  secs(f, 10);
  return a && r1 === 'schaltkreis' && b && c && e.recipe === 'motor' && e.out.length === 1 && f.S.stats.lost === lost;
});
check('Review 1: Montage-Automatik ohne passendes Gemeinsam-Rezept wartet kurz, dann gewinnt das neue Teil (nie Dauerblockade)', () => {
  const f = rich(new Factory({ seed: 3 })); allResearch(f);
  const mo = f.place('montage', O + 2, O + 11, 0), e = f.N.get(mo).e, lost = f.S.stats.lost;
  f.debugInsert(mo, 'eisenplatte');                      // → Schaltkreis; Zahnrad passt zu keinem Rezept mit Platte
  const early = f.debugInsert(mo, 'zahnrad');
  let at = -1; for (let i = 0; i < 10 * TPS; i++) { f.tick(); if (f.debugInsert(mo, 'zahnrad')) { at = i / TPS; break; } }
  return !early && at >= 4 && at <= 6 && e.recipe === 'motor' && e.inN[e.recipe ? 0 : 0] === 1 && f.S.stats.lost === lost + 1;
});
// Fund 4: Verteiler drehen + Rückgängig
check('Review 4: Verteiler drehen + Rückgängig – Teil wählt neu und läuft weiter', () => {
  const f = rich(new Factory({ seed: 3 })); f.S.research.push('verteiler'); f._mods();     // Grund-Bandtempo
  const x = O + 3, y = O + 13, s = f.place('verteiler', x, y, 0);
  f.place('band', x - 1, y, 2); f.place('band', x - 2, y, 2);
  const n = f.N.get(s); f.debugInsert(s, 'stein');
  f.tick(1); f.rotate(s); f.tick(14); const chose = n.e.items[0]?.d === 2;
  f.undo(); f.place('band', x + 1, y, 0); f.place('band', x + 2, y, 0); secs(f, 5);
  return chose && n.e.rot === 0 && n.e.items.length === 0 && f.S.ents.find(e => e.x === x + 2 && e.y === y).items.length === 1;
});
// Fund 5: Tunnel koppeln nach Rückgängig und in beliebiger Bau-Reihenfolge
check('Review 5: Tunnel-Eingang abreißen + Rückgängig → wieder gekoppelt', () => {
  const f = rich(new Factory({ seed: 3 })); allResearch(f);
  const a = f.place('tunnel', O + 1, O + 14, 0), b = f.place('tunnel', O + 4, O + 14, 0);
  f.remove(a); f.undo(); const A = f.N.get(a).e, B = f.N.get(b).e;
  return A.link === b && B.link === a && B.exit && !A.exit && f.N.get(a).len === 3;
});
check('Review 5: erst Ausgang, dann Eingang gebaut → gekoppelt; Teile kommen durch', () => {
  const f = rich(new Factory({ seed: 3 })); allResearch(f);
  const d = f.place('tunnel', O + 9, O + 13, 0), c = f.place('tunnel', O + 6, O + 13, 0);
  f.place('band', O + 10, O + 13, 0); f.place('band', O + 11, O + 13, 0);
  const C = f.N.get(c).e, D = f.N.get(d).e; f.debugInsert(c, 'stein'); secs(f, 8);
  return C.link === d && D.link === c && D.exit && !C.exit && f.N.get(f.at(O + 11, O + 13)).e.items.length === 1;
});
// Fund 6: Rückgängig eines Abrisses nur mit genug Geld
check('Review 6: Abriss rückgängig ohne Geld → abgelehnt (false, Ereignis denied), Geld nie negativ; später möglich', () => {
  const f = new Factory({ seed: 3 }); f.S.money = 1000;
  const o = f.place('ofen', O + 3, O + 12, 0); f.remove(o); f.buyPlot(START_PLOT + 1, START_PLOT); f.events();
  const m = f.S.money, r = f.undo(), ev = f.events(), denied = ev.find(e => e.type === 'denied');
  const kept = f.canUndo() && !f.entity(o) && f.S.money === m;
  f.S.money += 500; const r2 = f.undo();
  return m === 0 && r === false && denied?.reason === 'money' && denied.cost === 200 && kept && r2 === true && !!f.entity(o) && f.S.money === 300;
});
// Fund 8: erledigter Tagesauftrag geht beim Datumswechsel nicht verloren
check('Review 8: erledigter, nicht abgeholter Tagesauftrag wird beim Datumswechsel gutgeschrieben', () => {
  const f = new Factory({ seed: 3 }); f.setToday('2026-11-16'); f.S.daily.done = true; f.events();
  const m = f.S.money, cr = f.S.crates.length, rw = f.S.daily.reward;
  f.setToday('2026-11-17'); const ev = f.events().find(e => e.type === 'contract' && e.kind === 'claimed' && e.daily);
  return f.S.money === m + rw && f.S.crates.length === cr + 2 && f.S.total.daily === 1 && ev?.auto === true && f.S.daily.date === '2026-11-17' && !f.S.daily.done;
});
// Fund 9: Tagesauftrag nach Prestige nicht doppelt
check('Review 9: abgeholter Tagesauftrag ist nach Prestige am selben Tag nicht erneut abholbar', () => {
  const g = new Factory({ seed: 4 }); g.setToday('2026-11-16'); g.S.daily.done = true; const c1 = g.claimContract('daily');
  g.S.stats.earned = 2e6; g.prestige('wiese'); const d = g.setToday('2026-11-16'); g.S.daily.done = true;
  return c1 && d.claimed === true && g.claimContract('daily') === null && g.S.total.daily === 1;
});
check('Review 9: unerledigter Tagesauftrag wird nach Prestige für die neue Fabrik neu ausgelost', () => {
  const g = new Factory({ seed: 4 }); g.setToday('2026-11-16'); g.S.daily.have = 3;
  g.S.stats.earned = 2e6; g.prestige('wiese'); const d = g.setToday('2026-11-16');
  return d && d.have === 0 && !d.done && !d.claimed;
});
// Fund 10: Klick auf das schon gewählte Rezept / Auto verwirft nichts
check('Review 10: gleiches Rezept erneut wählen → Puffer und laufende Fertigung bleiben, kein Undo-Schritt', () => {
  const f = rich(new Factory({ seed: 3 })); allResearch(f);
  const m = f.place('presse', O + 3, O + 12, 0); f.setRecipe(m, 'zahnrad');
  for (let i = 0; i < 5; i++) f.debugInsert(m, 'eisenbarren');
  f.tick(2); const e = f.N.get(m).e, inN = e.inN.join(), craft = e.craft, lost = f.S.stats.lost, u = f.undoStack.length;
  const r = f.setRecipe(m, 'zahnrad');
  return r && craft === 1 && e.inN.join() === inN && e.craft === 1 && f.S.stats.lost === lost && f.undoStack.length === u;
});
check('Review 10: Auto wählen behält Rezept und Puffer; echter Wechsel zählt Verworfenes als verloren', () => {
  const f = rich(new Factory({ seed: 3 })); allResearch(f);
  const mo = f.place('montage', O + 2, O + 11, 0), e = f.N.get(mo).e; f.setRecipe(mo, 'schaltkreis');
  f.debugInsert(mo, 'kupferdraht'); f.debugInsert(mo, 'eisenplatte');
  const lost = f.S.stats.lost; f.setRecipe(mo, null);
  const autoKeeps = e.auto && e.recipe === 'schaltkreis' && e.inN.join() === '1,1' && f.S.stats.lost === lost;
  f.setRecipe(mo, 'motor');                               // Draht passt, Platte nicht
  return autoKeeps && !e.auto && e.recipe === 'motor' && e.inN[e.recipe && 1] === 1 && f.S.stats.lost === lost + 1;
});
// Fund 11: unbekannte Teile-Ids im Import
check('Review 11: Import mit unbekannten Teile-Ids startet vollständig (Statistik, Aufträge, Bänder, Filter, Buch gefiltert)', () => {
  const base = new Factory({ seed: 5 }); base.setToday('2026-11-15');
  const j = base.toJSON(); j.stats.soldBy.titanstaub = 3; j.stats.rate.titanstaub = 0.5; j.stats.made.titanstaub = 1; j.stats.cs.ufo = 1; j.total.made.ufo = 4;
  j.contracts[0].item = 'ufo'; j.daily.item = 'ufo'; j.book.fails.push('stein+ufo'); j.book.found.push('ufo');
  j.ents.push({ type: 'sortierer', x: O + 2, y: O + 2, rot: 0, filter: 'ufo', items: [['ufo', 0.2, 1, -1], ['stein', 0.6, 2, -1]] });
  const r = store.importText(JSON.stringify({ app: 'cogtopia', state: j })), f = r.factory;
  f.setToday('2026-11-16'); for (let i = 0; i < 3; i++) f.S.contracts[i].done = true; f.claimContract(0); secs(f, 30);
  const so = f.S.ents.find(e => e.type === 'sortierer');
  return !('titanstaub' in f.S.stats.soldBy) && !('titanstaub' in f.S.stats.rate) && !('ufo' in f.S.total.made) && f.S.contracts.every(c => ITEMS[c.item])
    && f.S.book.fails.every(c => !c.includes('ufo')) && so.filter === null && so.items.length <= 1 && JSON.stringify(f.toJSON()).indexOf('ufo') < 0;
});
// Fund 12: Import prüft Typen
check('Review 12: Import mit falschen Typen (String-Geld, 1e400, Nicht-Arrays/-Objekte) → Grundwerte, nie Wurf', () => {
  const a = Factory.load({ money: '1000' }), b = Factory.load('{"money":1e400,"rp":-1e400,"tick":"x","stats":{"earned":1e400}}');
  a.S.money += 5;
  const bad = [{ book: { found: 'x' } }, { deco: { colors: 'x' } }, { research: [null] }, { crates: 'x' }, { contracts: 5 }, { ger: null, boosts: null }, { stats: null },
    { total: { made: 5 } }, { plots: [1.5, 'a'] }, { daily: { item: 'stein' } }, { ents: [{ type: 'tunnel', x: 50, y: 50, link: 99, items: [['stein', 'x']] }] },
    { plots: 'x', research: 'abc', ents: [{ type: 'ofen', x: 50, y: 50, recipe: 'ziegel', inN: 'zz', out: 5 }], contracts: [{ item: 'stein', n: 'q' }], stats: { rate: 5, ring: 'x' } },
    { biome: 'constructor', research: ['constructor', 'toString'], patents: ['__proto__'], ents: [{ type: 'constructor', x: 1, y: 1 }, { type: 'band', x: 50, y: 60, items: [['toString', 0.1, 1]] }] },
    { ents: [null, 5, 'x', [1]], contracts: [null, { item: 'stein', n: 1e400, reward: '9', done: 'ja' }], daily: { item: 'stein', date: 5 }, ger: { on: 1, ph: 'tanzen', x: 'a' } }];
  for (const s of bad) { const h = Factory.load(s); h.tick(50); h.toJSON(); h.setToday('2026-01-01'); h.claimContract('daily'); h.claimContract(0);
    const S = h.S; if (![S.money, S.rp, S.tick, S.stats.earned, ...S.contracts.map(c => c.n + c.reward)].every(Number.isFinite) || typeof S.ger.x !== 'number') return false; }
  let threw = 0; for (const s of [null, 5, '"x"', '[1,2]', '{kaputt']) { try { Factory.load(s); } catch (e) { if (/cogtopia/.test(e.message)) threw++; } }
  return a.S.money === START_MONEY + 5 && Number.isFinite(b.S.money) && Number.isFinite(b.S.rp) && b.S.tick === 0 && b.S.stats.earned === 0 && threw === 5 && store.importText('[1,2]') === null;
});
// Fund 13: Tunnel mit kürzerem Abstand neu gekoppelt
check('Review 13: Tunnel kürzer neu gekoppelt → Teile sortiert, p ≤ Länge, Bänder nie p > 1, Bilanz stimmt', () => {
  const f = rich(new Factory({ seed: 3 })); allResearch(f);
  const y = O + 13, x = O + 1, a = f.place('tunnel', x, y, 0), b = f.place('tunnel', x + 5, y, 0);
  for (let i = 1; i <= 6; i++) f.place('band', x + 5 + i, y, 0);
  f.debugInsert(a, 'stein'); f.remove(b);
  const A = f.N.get(a);
  // wie ein voller langer Tunnel: 20 Teile bis p 4,75 (Stand vor dem Abriss des Ausgangs)
  A.e.items.length = 0; for (let i = 0; i < 20; i++) A.e.items.push({ t: 0, g: 0, p: 4.75 - i * 0.25, k: 1000 + i, d: -1, op: 0, oe: a, od: -1, mt: -1 });
  const before = inTransit(f), lost0 = f.S.stats.lost;
  f.place('tunnel', x + 2, y, 0); f.place('band', x + 3, y, 0); f.place('band', x + 4, y, 0); f.place('band', x + 5, y, 0);
  let fine = A.len === 2 && tunnelItemsOk(f), belt1 = true;
  for (let i = 0; i < 40; i++) { f.tick(); if (!tunnelItemsOk(f)) fine = false; for (const e of f.S.ents) if (e.type === 'band' && e.items.some(q => q.p > 1 + 1e-9)) belt1 = false; }
  return fine && belt1 && inTransit(f) + (f.S.stats.lost - lost0) === before;
});

// =====================================================================================
// 17. Performance: 2000 Bänder + 300 Maschinen
// =====================================================================================
{
  const f = rich(new Factory({ seed: 77 })); allResearch(f);
  for (let k = 0; k < 60; k++) for (let y = 0; y < PLOTS; y++) for (let x = 0; x < PLOTS; x++) if (f.plotState(x, y) === 'buyable') f.buyPlot(x, y);
  let mach = 0;
  // Ketten Bohrer → Ofen → Verkauf, alle nebeneinander
  for (let y = 0; y < MAP - 2 && mach < 300; y += 3) for (let x = 0; x < MAP - 6 && mach < 300; x++) {
    const c = f.canPlace('bohrer', x, y, 0);
    if (c.ok && f.canPlace('ofen', x + 2, y, 0).ok && f.canPlace('verkauf', x + 4, y, 0).ok) { f.place('bohrer', x, y, 0); f.place('ofen', x + 2, y, 0); f.place('verkauf', x + 4, y, 0); mach += 3; x += 5; }
  }
  // geschlossene Band-Ringe (10×10), je Band 2 Teile → 4000 bewegte Teile
  let belts = 0;
  const ring = (x0, y0) => {
    for (let i = 0; i < 2; i++) for (let j = 0; j < 10; j++) if (!f.canPlace('band', x0 + i, y0 + j, 0).ok) return false;
    const cells = [[x0, y0, 0]];
    for (let j = 0; j < 9; j++) cells.push([x0 + 1, y0 + j, 1]);
    cells.push([x0 + 1, y0 + 9, 2]);
    for (let j = 9; j > 0; j--) cells.push([x0, y0 + j, 3]);
    f.placeLine('band', cells);
    for (const [x, y] of cells) f.debugInsert(f.at(x, y), 'stein');
    belts += cells.length; return true;
  };
  for (let y0 = 0; y0 + 10 <= MAP && belts < 2000; y0 += 10) for (let x0 = 0; x0 + 2 <= MAP && belts < 2000; x0 += 2) ring(x0, y0);
  // zweites Teil je Band (an der Bandmitte geht nicht – hinten nachschieben nach einem Tick)
  f.tick(6); for (const n of f.bn) if (n.kind === 'belt') f.debugInsert(n.id, 'eisenerz');
  f.tick(200);
  const items = f.itemCount();
  let ms = Infinity; for (let k = 0; k < 4; k++) { const t0 = performance.now(); f.tick(500); ms = Math.min(ms, (performance.now() - t0) / 500); }
  ok(belts >= 2000 && mach >= 300, `große Fabrik: ${belts} Bänder, ${mach} Maschinen, ${items} Teile unterwegs`);
  ok(ms < 1.5, `Tick: ${ms.toFixed(3)} ms (< 2 ms)`);
  let n = 0; f.forEachItem(0.5, () => n++); f.forEachItem(0.5, () => 0); const t1 = performance.now(); let ms2 = Infinity; for (let k = 0; k < 5; k++) { const t1 = performance.now(); f.forEachItem(0.5, () => 0); ms2 = Math.min(ms2, performance.now() - t1); }
  ok(n === f.itemCount() && ms2 < 8, `forEachItem: ${n} Teile in ${ms2.toFixed(2)} ms`);
  const t2 = performance.now(); const ents = f.entities(); const ms3 = performance.now() - t2;
  ok(ents.length === f.S.ents.length, `entities(): ${ents.length} Einträge in ${ms3.toFixed(2)} ms`);
  const t3 = performance.now(); const js = JSON.stringify(f.toJSON()); const g = Factory.load(js); const ms4 = performance.now() - t3;
  ok(g.S.ents.length === f.S.ents.length, `Speichern+Laden der großen Fabrik: ${(js.length / 1024).toFixed(0)} KB in ${ms4.toFixed(0)} ms`);
}

// =====================================================================================
// 18. Bot-Partie: „guter Spieler“ über mehrere Spielstunden (Balancing)
// =====================================================================================
class Bot {
  constructor(f) { this.f = f; this.fails = new Map(); this.expTable = 0; this.labs = 0; this.modules = []; this.plotRev = 0; }
  // ---- Hilfen ----
  blockedSet() {
    const f = this.f, s = new Set();
    for (const n of [...f.bn, ...f.mn]) {
      const e = n.e, add = (x, y) => { if (x >= 0 && y >= 0 && x < MAP && y < MAP && !f.grid[y * MAP + x]) s.add(y * MAP + x); };
      if (n.kind === 'belt' || (n.kind === 'tunnel' && e.exit)) add(e.x + DX[e.rot], e.y + DY[e.rot]);
      else if (n.kind === 'split' || n.kind === 'sort') for (let d = 0; d < 4; d++) add(e.x + DX[d], e.y + DY[d]);
      else if (n.kind !== 'sell' && n.kind !== 'lab' && n.kind !== 'tunnel') add(n.ox, n.oy);
    }
    return s;
  }
  free(x, y, occ) { const f = this.f; return f.isOpen(x, y) && !f.grid[y * MAP + x] && !occ.has(y * MAP + x) && !this.res.has(y * MAP + x); }
  fpFree(x, y, w, h, occ) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (!this.free(x + i, y + j, occ)) return false; return true; }
  fp(x, y, w, h, occ) { const o = new Set(occ); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) o.add((y + j) * MAP + x + i); return o; }
  // Gebäude so setzen, dass Zelle P (Ausgang des Vorgängers, Richtung d) in seiner Rückseite liegt, gleiche Richtung
  straight(P, w, h) { const [x, y, d] = P; return d === 0 ? [x, y - (h >> 1)] : d === 2 ? [x - (w - 1), y - (h >> 1)] : d === 1 ? [x - (w >> 1), y] : [x - (w >> 1), y - (h - 1)]; }
  recipeFor(item) {
    const f = this.f; const rs = RECIPE_IDS.filter(r => RECIPES[r].out === item && f.recipeAvailable(r) && RECIPES[r].building !== 'experiment');
    return rs.find(r => RECIPES[r].unlock !== 'hidden') || rs[0] || null;
  }
  canMake(item, depth = 0) {
    if (depth > 6) return false;
    if (RAW.includes(item)) return this.spotsCount(item) > 0;
    const r = this.recipeFor(item); if (!r || !this.f.isUnlocked(RECIPES[r].building)) return false;
    return RECIPES[r].in.every(([i]) => this.canMake(i, depth + 1));
  }
  spotsCount(item) { const rv = this.f.rev + ':' + this.f.S.plots.length; if (!this.spotCache || this.spotCache.rev !== rv) this.spotCache = { rev: rv, m: {} }; const c = this.spotCache.m; if (!(item in c)) c[item] = this.spots(item, new Set(), 1).length; return c[item]; }
  spots(item, occ, lim = 12) {
    const f = this.f, t = ITEM_IDS.indexOf(item), out = [];
    for (const p of f.S.plots) {
      const cx = p % PLOTS, cy = (p / PLOTS) | 0;
      for (let y = cy * PLOT; y < cy * PLOT + PLOT - 1; y++) for (let x = cx * PLOT; x < cx * PLOT + PLOT - 1; x++) {
        let okc = true, r = 0;
        for (let j = 0; j < 2 && okc; j++) for (let i = 0; i < 2; i++) { const k = (y + j) * MAP + x + i; if (f.dep[k] !== t + 1 || !this.free(x + i, y + j, occ)) { okc = false; break; } r += f.rich[k]; }
        if (okc) out.push([x, y, r]);
      }
    }
    out.sort((a, b) => b[2] - a[2] || (Math.abs(a[0] - 56) + Math.abs(a[1] - 56)) - (Math.abs(b[0] - 56) + Math.abs(b[1] - 56)));
    return out.slice(0, lim);
  }
  // ---- Planung: Erzeuger eines Teils als Generator von Möglichkeiten ----
  *opts(item, occ, depth = 0) {
    let n = 0;
    if (RAW.includes(item)) {
      for (const [x, y] of this.spots(item, occ, 10)) for (let d = 0; d < 4; d++) {
        const [ox, oy] = outCell(x, y, 2, 2, d); if (!this.free(ox, oy, occ)) continue;
        yield { ops: [{ b: 'bohrer', x, y, rot: d }], occ: this.fp(x, y, 2, 2, occ), out: [ox, oy, d] };
        if (++n >= 10) return;
      }
      return;
    }
    const rid = this.recipeFor(item); if (!rid) return;
    const R = RECIPES[rid], B = BUILDINGS[R.building];
    if (R.in.length === 1) {
      for (const o of this.opts(R.in[0][0], occ, depth + 1)) {
        const [x, y] = this.straight(o.out, B.w, B.h), d = o.out[2];
        if (!this.fpFree(x, y, B.w, B.h, o.occ)) continue;
        const [ox, oy] = outCell(x, y, B.w, B.h, d); const oc = this.fp(x, y, B.w, B.h, o.occ); if (!this.free(ox, oy, oc)) continue;
        yield { ops: [...o.ops, { b: R.building, x, y, rot: d, recipe: rid }], occ: oc, out: [ox, oy, d] };
        if (++n >= 4) return;
      }
      return;
    }
    // zwei Zutaten → Montage, Zulieferer über Bänder
    const [i1, i2] = R.in.map(a => a[0]);
    let tries = 0;
    for (const o1 of this.opts(i1, occ, depth + 1)) {
      const occ1 = new Set(o1.occ); occ1.add(o1.out[1] * MAP + o1.out[0]);
      for (const o2 of this.opts(i2, occ1, depth + 1)) {
        if (++tries > 6) return;
        const occ2 = new Set(o2.occ); occ2.add(o2.out[1] * MAP + o2.out[0]);
        const mx = (o1.out[0] + o2.out[0]) >> 1, my = (o1.out[1] + o2.out[1]) >> 1;
        const cand = [];
        for (let dy = -10; dy <= 10; dy++) for (let dx = -10; dx <= 10; dx++) cand.push([mx + dx - 1, my + dy - 1, Math.abs(dx) + Math.abs(dy)]);
        cand.sort((a, b) => a[2] - b[2]);
        let k = 0;
        for (const [x, y] of cand) {
          if (!this.fpFree(x, y, 3, 3, occ2)) continue;
          if (++k > 25) break;
          for (let d = 0; d < 4; d++) {
            const [ox, oy] = outCell(x, y, 3, 3, d); let oc = this.fp(x, y, 3, 3, occ2); if (!this.free(ox, oy, oc)) continue;
            oc.add(oy * MAP + ox);
            const p1 = this.route(o1.out, x, y, d, oc); if (!p1) continue;
            const oc2 = new Set(oc); for (const c of p1) oc2.add(c[1] * MAP + c[0]);
            const p2 = this.route(o2.out, x, y, d, oc2); if (!p2) continue;
            for (const c of p2) oc2.add(c[1] * MAP + c[0]); oc2.delete(oy * MAP + ox);
            const ops = [...o1.ops, ...o2.ops, { b: 'montage', x, y, rot: d, recipe: rid }, { line: p1 }, { line: p2 }];
            yield { ops, occ: oc2, out: [ox, oy, d] };
            if (++n >= 2) return;
            break;
          }
        }
      }
    }
  }
  // Breitensuche: Bänder von Zelle start bis neben die Montage (nicht von vorn)
  route(start, mx, my, md, occ) {
    const inM = (x, y) => x >= mx && x < mx + 3 && y >= my && y < my + 3;
    return this.routeTo(start, (nx, ny, d) => inM(nx, ny) && d !== ((md + 2) & 3), occ);
  }
  routeToSell(start, occ) {
    const f = this.f;
    return this.routeTo(start, (nx, ny) => { const n = f.nodeAt(nx, ny); return !!n && n.kind === 'sell'; }, occ, 30);
  }
  routeTo(start, isGoal, occ, maxLen = 40) {
    const f = this.f, [sx, sy] = start, S0 = sy * MAP + sx;
    if (!this.free(sx, sy, new Set())) return null;
    const prev = new Map([[S0, -1]]), q = [S0]; let goal = -1, gdir = -1;
    for (let qi = 0; qi < q.length && qi < 5000; qi++) {
      const c = q[qi], x = c % MAP, y = (c / MAP) | 0;
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d], ny = y + DY[d];
        if (isGoal(nx, ny, d) && !(c === S0 && d === ((start[2] + 2) & 3))) { goal = c; gdir = d; break; }
      }
      if (goal >= 0) break;
      if (prev.size > 4000) break;
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d], ny = y + DY[d], k = ny * MAP + nx;
        if (nx < 0 || ny < 0 || nx >= MAP || ny >= MAP || prev.has(k)) continue;
        if (c === S0 && d === ((start[2] + 2) & 3)) continue;
        if (!this.free(nx, ny, occ)) continue;
        prev.set(k, c); q.push(k);
      }
    }
    if (goal < 0) return null;
    const path = []; for (let c = goal; c !== -1; c = prev.get(c)) path.unshift(c);
    if (path.length > maxLen) return null;
    const cells = path.map((c, i) => { const x = c % MAP, y = (c / MAP) | 0; let d;
      if (i < path.length - 1) { const n2 = path[i + 1]; d = DX.findIndex((dx, j) => x + dx === n2 % MAP && y + DY[j] === ((n2 / MAP) | 0)); } else d = gdir;
      return [x, y, d]; });
    return cells;
  }
  // ---- Abschätzung: Rate (Teile/s) und Kosten eines Moduls ----
  rate(item, depth = 0) {
    const f = this.f; if (depth > 8) return 0;
    if (RAW.includes(item)) return f.M.drill / BUILDINGS.bohrer.time;
    const r = RECIPES[this.recipeFor(item)];
    let rr = Infinity; for (const [i, n] of r.in) rr = Math.min(rr, this.rate(i, depth + 1) / n);
    return Math.min(rr * r.n, r.n * f.M.mach / r.time);
  }
  cost(item, cnt = {}, depth = 0) {
    const f = this.f, add = b => { const c = Math.round(BUILDINGS[b].cost * Math.pow(BUILDINGS[b].scale, (f.count[b] || 0) + (cnt[b] || 0))); cnt[b] = (cnt[b] || 0) + 1; return c; };
    if (RAW.includes(item)) return add('bohrer');
    const r = RECIPES[this.recipeFor(item)]; let c = add(r.building) + (r.in.length > 1 ? 30 : 0);
    for (const [i] of r.in) c += this.cost(i, cnt, depth + 1);
    return c;
  }
  // ---- Ausführen ----
  execute(plan, final) {
    const f = this.f, placed = [];
    const undo = () => { for (const id of placed.reverse()) f.remove(id); return false; };
    for (const op of plan.ops) {
      if (op.line) { for (const [x, y, d] of op.line) { const id = f.place('band', x, y, d); if (!id) return undo(); placed.push(id); } continue; }
      const id = f.place(op.b, op.x, op.y, op.rot); if (!id) return undo(); placed.push(id);
      if (op.recipe && BUILDINGS[op.b].kind === 'machine') f.setRecipe(id, op.recipe);
    }
    if (final) { const [x, y] = this.straight(plan.out, 2, 2); const id = f.place(final, x, y, plan.out[2]); if (!id) return undo(); placed.push(id); }
    return placed;
  }
  build(item, final = 'verkauf') {
    this.res = this.blockedSet();
    const key = item + ':' + final + ':' + this.f.S.plots.length + ':' + this.f.S.research.length;
    if (this.fails.get(item + final) === key) return false;
    let budget = 0;
    for (const o of this.opts(item, new Set())) {
      if (++budget > 30) break;
      let fin = final;
      const [x, y] = this.straight(o.out, 2, 2);
      if (final === 'verkauf') { const p = this.routeToSell(o.out, o.occ); if (p) { o.ops.push({ line: p }); fin = null; } }
      if (fin && !this.fpFree(x, y, 2, 2, o.occ)) continue;
      const placed = this.execute(o, fin);
      if (!placed && VERBOSE) console.log(`   [bot ${fmt(this.f.time)}] Bauen fehlgeschlagen: ${item}`, JSON.stringify(o.ops).slice(0, 300));
      if (placed) { if (VERBOSE) console.log(`   [bot ${fmt(this.f.time)}] baut ${item}→${final} (${placed.length} Teile, Geld ${Math.round(this.f.S.money)})`); this.modules.push({ item, final, n: placed.length, t: this.f.time }); return true; }
    }
    if (VERBOSE) console.log(`   [bot ${fmt(this.f.time)}] kein Platz für ${item}→${final} (${budget} Varianten, Geld ${Math.round(this.f.S.money)})`);
    this.fails.set(item + final, key);
    return false;
  }
  // ---- Ein Entscheidungsschritt ----
  step() {
    const f = this.f, S = f.S; this.res = this.blockedSet();
    if (f.gerald()) f.clickGerald();
    for (let i = 0; i < S.contracts.length; i++) if (S.contracts[i].done) f.claimContract(i);
    if (S.daily?.done && !S.daily.claimed) f.claimContract('daily');
    while (S.crates.length) f.openCrate(0);
    // Forschung: billigste bezahlbare zuerst, solange sie höchstens 60 % des Geldes kostet
    const rs = RESEARCH_IDS.map(id => [id, f.canResearch(id)]).filter(([, c]) => c.ok && (c.cost <= S.money * 0.6 || (!S.research.length && this.modules.length >= 3))).sort((a, b) => a[1].cost - b[1].cost);
    if (rs.length) { f.buyResearch(rs[0][0]); return; }
    // auf die billigste erreichbare Forschung sparen, wenn sie in ≤ 5 Minuten bezahlbar ist
    const goal = RESEARCH_IDS.map(id => [id, f.canResearch(id)]).filter(([, c]) => c.ok || c.reason === 'money').sort((a, b) => a[1].cost - b[1].cost)[0];
    if (goal && goal[1].ok && this.modules.length >= 3) { f.buyResearch(goal[0]); return; }
    const saving = goal && this.modules.length >= 3 && goal[1].cost <= f.incomeRate() * 300 && goal[1].rp <= S.rp ? goal[1].cost : 0;
    // Experimente: neue Rezepte entdecken, sobald beide Zutaten herstellbar sind
    if (f.isUnlocked('experiment')) {
      const next = HIDDEN_RECIPES.find(r => !S.book.found.includes(r) && RECIPES[r].in.every(([i]) => this.canMake(i)));
      if (next) {
        if (!this.expTable || !f.N.get(this.expTable)) {
          if (S.money > f.costOf('experiment') * 1.5) { this.res = this.blockedSet(); outer: for (const p of S.plots) { const cx = p % PLOTS, cy = (p / PLOTS) | 0; for (let y = cy * PLOT; y < cy * PLOT + 13; y++) for (let x = cx * PLOT; x < cx * PLOT + 13; x++) if (this.fpFree(x, y, 3, 3, new Set()) && this.fpFree(x - 1, y - 1, 5, 5, new Set())) { this.expTable = f.place('experiment', x, y, 0); if (this.expTable) break outer; } } }
        } else {
          const e = S.ents.find(x => x.id === this.expTable);
          if (e.a < 0 && e.b < 0 && !e.craft) { const [a, b] = RECIPES[next].in.map(z => z[0]); f.debugInsert(this.expTable, a); f.debugInsert(this.expTable, b); }
        }
      }
    }
    // Labor, wenn Forschung an Forschungspunkten hängt
    const needRp = RESEARCH_IDS.some(id => { const c = f.canResearch(id); return c.reason === 'rp' || (c.ok === false && c.reason === 'money' && c.rp > S.rp); });
    const wantLabs = Math.min(6, 1 + Math.floor(f.time / 1500));
    if ((needRp || !this.labs) && f.isUnlocked('labor') && this.labs < wantLabs) {
      const best = ['schaltkreis', 'eisenplatte', 'eisenbarren'].find(i => this.canMake(i));
      const need = best ? (this.cost(best) + f.costOf('labor')) * 1.05 : Infinity;
      if (S.money >= need) { if (this.build(best, 'labor')) { this.labs++; return; } }
      else if (need <= f.incomeRate() * 300 && !this.fails.has(best + 'labor')) return;    // fürs Labor sparen
    }
    // Produktionsmodul mit bester Amortisation
    const cands = [];
    for (const item of ITEM_IDS) {
      if (item === 'schrott' || !this.canMake(item)) continue;
      const r = this.rate(item), cost = this.cost(item) + 25, inc = f.val[ITEM_IDS.indexOf(item)] * r * (r >= 0.5 ? 1.8 : 1.2);
      cands.push({ item, cost, inc, score: inc / cost });
    }
    cands.sort((a, b) => b.score - a.score);
    const top = cands[0];
    if (VERBOSE && f.S.tick % (TPS * 600) < 40) console.log(`   [bot ${fmt(f.time)}] Kandidaten: ` + cands.slice(0, 6).map(c => `${c.item} ${Math.round(c.cost)}/${c.inc.toFixed(1)}`).join(', ') + ` | labs ${this.labs} needRp ${needRp} spots stein ${this.spots('stein', new Set(), 3).length} cache ${JSON.stringify(this.spotCache?.m)} plots ${f.S.plots.join()}`);
    for (const c of cands) {
      if (c.score < top.score * 0.6) break;
      if (c.cost <= S.money - saving * 0.5) { if (this.build(c.item)) return; }
      else if (c === top && c.cost < S.money + f.incomeRate() * 60) return;   // kurz sparen lohnt sich
    }
    // Land kaufen, wenn das beste Modul keinen Platz mehr findet oder Land billig ist
    const pc = f.plotCost();
    const stuck = !cands.length || cands.slice(0, 3).some(c => this.fails.has(c.item + 'verkauf'));
    if (pc <= S.money && (stuck || pc < S.money * 0.3)) {
      let best = null;
      for (let y = 0; y < PLOTS; y++) for (let x = 0; x < PLOTS; x++) if (f.plotState(x, y) === 'buyable') { const d = Math.abs(x - START_PLOT) + Math.abs(y - START_PLOT); if (!best || d < best[2]) best = [x, y, d]; }
      if (best) { f.buyPlot(best[0], best[1]); this.fails.clear(); }
    }
  }
}
if (!QUICK) {
  const t0 = performance.now();
  const f = new Factory({ seed: 2026 }), bot = new Bot(f);
  f.setToday('2026-11-16');
  const ms = {}; const mark = (k, v = f.time) => { if (!(k in ms)) ms[k] = v; };
  const timeline = [], buildTimes = [];
  let lastCount = 0; const src = { sold: 0, contract: 0, crate: 0, ach: 0, off: 0 };
  const limit = BOT_H * 3600 * TPS;
  for (let i = 0; i < limit; i++) {
    f.tick();
    if (i % 40 === 0) {
      bot.step();
      if (f.S.stats.sold > 0) mark('firstCoin');
      if (f.S.research.length) mark('firstResearch');
      if (BUILDING_IDS.every(b => f.isUnlocked(b))) mark('allBuildings');
      if (RESEARCH_IDS.every(r => f.S.research.includes(r))) mark('allResearch');
      if (f.S.book.found.length) mark('firstDiscovery');
      if (f.S.plots.length > 1) mark('firstPlot');
      if (f.canPrestige()) mark('prestige');
      const nb = f.S.ents.filter(e => e.type !== 'band').length;
      if (nb > lastCount) { for (let k = lastCount; k < nb; k++) buildTimes.push(f.time); lastCount = nb; }
      for (const e of f.events()) { if (e.type === 'sold') src.sold += e.value; else if (e.type === 'contract' && e.kind === 'claimed') src.contract += e.reward; else if (e.type === 'crate' && e.kind === 'open' && e.content.money) src.crate += e.content.money; else if (e.type === 'achievement' && e.reward.money) src.ach += e.reward.money; else if (e.type === 'offline') src.off += e.money; }
      if (VERBOSE && i % (120 * TPS) === 0) console.log(`   [stat ${fmt(f.time)}] mined ${f.S.stats.mined} gold ${f.S.stats.gold} sold ${JSON.stringify(f.S.stats.soldBy)} made ${JSON.stringify(f.S.stats.made)} turbo ${f.S.boosts.turbo.toFixed(0)} rain ${f.S.boosts.goldrain} M ${JSON.stringify({ d: f.M.drill, m: f.M.mach, s: f.M.sell })}`);
      if (VERBOSE && i % (60 * TPS) === 0) console.log(`   [geld ${fmt(f.time)}] ${JSON.stringify(Object.fromEntries(Object.entries(src).map(([k, v]) => [k, Math.round(v)])))} money ${Math.round(f.S.money)} earned ${Math.round(f.S.stats.earned)}`);
    }
    if (i % (10 * 60 * TPS) === 0 && i) timeline.push({ t: f.time, money: f.S.money, rate: f.incomeRate(), earned: f.S.stats.earned, ents: f.S.ents.filter(e => e.type !== 'band').length, belts: f.count.band || 0, research: f.S.research.length, plots: f.S.plots.length, found: f.S.book.found.length, rp: f.S.rp });
    if (ms.prestige && f.time > ms.prestige + 1) break;
  }
  const secsTook = (performance.now() - t0) / 1000;
  console.log(`  Bot-Partie (${fmt(f.time)} Spielzeit in ${secsTook.toFixed(1)} s):`);
  for (const r of timeline) console.log(`   ${fmt(r.t).padStart(6)}  Geld ${Math.round(r.money).toString().padStart(9)}  ${r.rate.toFixed(1).padStart(7)}/s  verdient ${Math.round(r.earned).toString().padStart(9)}  Gebäude ${String(r.ents).padStart(3)}  Bänder ${String(r.belts).padStart(4)}  Forschung ${String(r.research).padStart(2)}  Land ${r.plots}  Rezepte ${r.found}  FP ${Math.round(r.rp)}`);
  const per = (a, b) => buildTimes.filter(x => x >= a && x < b).length;
  console.log(`   Meilensteine: ${Object.entries(ms).map(([k, v]) => k + ' ' + fmt(v)).join(' · ')}`);
  console.log(`   neue Gebäude (ohne Bänder) je 5 min in der ersten halben Stunde: ${[0, 5, 10, 15, 20, 25].map(m => per(m * 60, m * 60 + 300)).join(', ')}`);
  console.log(`   Module: ${Object.entries(bot.modules.reduce((a, m) => (a[m.item + (m.final === 'labor' ? '→Labor' : '')] = (a[m.item + (m.final === 'labor' ? '→Labor' : '')] || 0) + 1, a), {})).map(([k, v]) => k + '×' + v).join(', ')}`);
  ok(ms.firstCoin < 30, `Bot: erste Münze nach ${ms.firstCoin?.toFixed(1)} s (< 30 s)`);
  ok(ms.firstResearch >= 25 && ms.firstResearch <= 150, `Bot: erste Forschung nach ${fmt(ms.firstResearch ?? 0)} (≈ 1–2 min)`);
  const first30 = per(0, 1800);
  ok(first30 >= 25, `Bot: ${first30} neue Gebäude in den ersten 30 min (≈ eins pro Minute)`);
  ok(ms.allBuildings && ms.allBuildings < 2 * 3600, `Bot: alle Gebäude frei nach ${fmt(ms.allBuildings ?? 0)}`);
  ok(ms.prestige && ms.prestige >= 1.25 * 3600 && ms.prestige <= 3 * 3600, `Bot: Prestige möglich nach ${fmt(ms.prestige ?? 0)} (Bot 1¼–3 h ≙ Mensch grob 2–4 h)`);
  ok(ms.firstDiscovery, `Bot: erstes verstecktes Rezept nach ${fmt(ms.firstDiscovery ?? 0)}`);
}

console.log(fail ? `RULES FAILED (${fail})` : 'RULES OK'); process.exit(fail ? 1 : 0);
