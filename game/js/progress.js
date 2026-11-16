// Experience and levels + side quests ("Nebenaufgaben").
// XP comes from quests, discoveries, felling, building, crafting, harvesting, hunting, fishing, looting, reading the village notes …
// Levels unlock blueprints, workbench recipes and the cabin extensions (items.js: lvl).
// Titles and texts are translated at load (T); progress is saved by id only (S.side, S.badges).
import { T } from './i18n.js';
export const LEVELS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000, 5000, 6200, 7600, 9200];
export const levelOf = xp => { let l = 1; while (l < LEVELS.length && xp >= LEVELS[l]) l++; return l; };

// side quests: id, title, text, goal (progress function of the game) and reward
export const SIDE = [
  { id: 'dorf', t: T('Das stille Dorf'), x: T('Warum ist Tannbach verlassen? Lies die 5 Notizen (Häuser, Kapelle, Dorfladen, Steinbruch) und erzähl Kurt davon.'),
    n: g => Object.keys(g.S.notes).length, max: 5, done: g => g.S.flags.kurtStory, xp: 250, money: 20 },
  { id: 'wahrheit', t: T('Die Wahrheit über Tannbach'), x: T('Kurt hat dir sein Handfunkgerät gegeben (Kanal 7). Finde Brandts 6 Tagebuchseiten (Werkstatt, Steinbruch, Burgruine, Turm, Stollen …), hör den Funk ab (J) – und entscheide an der Zündmaschine im Steinbruch.'),
    n: g => Object.keys(g.S.diary || {}).length, max: 6, done: g => g.S.flags.ending, xp: 300, show: g => g.S.flags.kurtStory, target: g => Object.keys(g.S.diary || {}).length >= 6 && !g.S.flags.ending ? g.posOf('Zuendmaschine') : null },
  { id: 'bello', t: T('Kurts Hund'), x: T('Bello streunt bei der Burgruine herum. Gib ihm Fleisch, dann folgt er dir und warnt dich vor Raubtieren.'), done: g => g.S.dog?.tame, xp: 150, target: g => g.posOf('ziel_bello') },
  { id: 'felle', t: T('Felle für Kurt'), x: T('Kurt zahlt gut für 3 Felle (beim Händler verkaufen).'), n: g => g.S.stat.sold_fell || 0, max: 3, xp: 80 },
  { id: 'auto', t: T('Wieder mobil'), x: T('Repariere dein Auto: Keilriemen + Werkzeugkasten aus der Werkstatt „KFZ Brandt“ im Dorf, dann einen vollen Kanister in den Tank.'), done: g => g.S.car?.fixed && g.S.car?.fuel > 0, xp: 200 },
  { id: 'schatz', t: T('Opa Willis Schatz'), x: T('Im Logbuch der Anglerhütte steht etwas von einem Schatz auf der Insel im Waldsee. Nimm das Ruderboot am Steg – und einen Spaten.'),
    done: g => g.S.flags.treasure, xp: 150, target: g => g.S.flags.dug ? null : g.posOf('ziel_insel') },
  { id: 'forst', t: T('Der verschwundene Förster'), x: T('Das Forsthaus Eichengrund (südlich des Dorfes, westlich der Straße) ist verschlossen. Finde den Schlüssel und lies Hennings Tagebuch.'),
    done: g => g.S.flags.diary, xp: 100, target: g => g.posOf('ziel_forsthaus') },
  { id: 'funk', t: T('Funkstille'), x: T('Bring die Funkstation auf dem Kahlberg (südwestlich der Tankstelle) wieder auf Sendung: Tür-Code knacken, Notstrom-Aggregat betanken, Sender einschalten.'),
    done: g => g.S.flags.funkCalled, xp: 150, target: g => g.posOf('ziel_funkturm') },
  { id: 'pass', t: T('Über den Pass'), x: T('Öffne die Schranke am Nordende der Straße (Schlüssel in der Funkstation) und fahr mit dem Auto hinauf ins Gebirge.'),
    done: g => g.S.flags.berg, xp: 150 },
  { id: 'henning', t: T('Henning finden'), x: T('Förster Henning ist zur Steinberghütte im Gebirge aufgebrochen. Sieh nach, ob es ihm gut geht.'),
    done: g => g.S.flags.henning, xp: 200, money: 30, target: g => g.region() === 'berg' ? g.posOf('ziel_henning') : null },
  { id: 'stollen', t: T('Glück auf!'), x: T('Im alten Stollen ist der hintere Teil verschüttet. Spreng das Geröll (2 Sprengpulver, Zündschnur = Seil, Feuerzeug) und hol die Bergkristalle.'),
    n: g => g.S.stat.kristall || 0, max: 3, xp: 200 },
  { id: 'grimm', t: T('Der alte Grimm'), x: T('Henning erzählt von einem Riesenbären in der Bärenhöhle am Steinberg. Feuer schreckt ihn nicht – nimm das Gewehr, viel Munition und spring zur Seite, wenn er losstürmt.'),
    done: g => g.S.flags.grimm, xp: 300, money: 40, show: g => g.S.flags.henning, target: g => g.region() === 'berg' && !g.S.flags.grimm ? g.posOf('ziel_grimm') : null },
  { id: 'kurt', t: T('Kurts Stammlieferant'), x: T('Erledige 5 Tagesaufträge von Kurt (jeden Morgen ein neuer Auftrag im Dorfladen).'), n: g => g.S.stat.orders || 0, max: 5, xp: 150, money: 25 },
  { id: 'verstecke', t: T('Geheimverstecke'), x: T('Irgendwo in Tal und Gebirge haben Leute Dinge versteckt: in hohlen Bäumen, Mauern, Nistkästen … Finde alle 6 (Bello hilft mit „Such!“).'), n: g => g.S.stat.stash || 0, max: 6, xp: 200 },
  { id: 'gipfel', t: T('Gipfelstürmer'), x: T('Steig von der Steinberghütte auf den Gipfel des Steinbergs und trag dich ins Gipfelbuch ein.'), done: g => g.S.found.gipfel, xp: 120 },
  { id: 'fisch', t: T('Petri Heil'), x: T('Fang 3 Fische (Angel: Anglerhütte am Waldsee oder Werkbank).'), n: g => g.S.stat.fish || 0, max: 3, xp: 80 },
  { id: 'heim', t: T('Ein Dach über dem Kopf'), x: T('Bau eine Blockhütte fertig (G → Bauwerke).'), done: g => g.S.flags.cabin, xp: 200 },
  { id: 'ausbau', t: T('Großes Haus'), x: T('Bau deine Hütte ganz aus: Anbau, Veranda und Werkstatt.'), n: g => Math.max(0, ...g.build.list.filter(s => s.type === 'huette').map(s => s.ext || 0)), max: 3, xp: 300 },
  { id: 'farm', t: T('Selbstversorger'), x: T('Ernte 10 Feldfrüchte.'), n: g => g.S.stat.harvest || 0, max: 10, xp: 120 },
  { id: 'jagd', t: T('Jäger'), x: T('Erlege 5 Tiere.'), n: g => g.S.stat.kills || 0, max: 5, xp: 120 },
  { id: 'fallen', t: T('Fallensteller'), x: T('Fang 3 Kaninchen mit Fallen.'), n: g => g.S.stat.rabbits || 0, max: 3, xp: 80 },
  { id: 'karte', t: T('Kartograf'), x: T('Entdecke alle Orte.'), n: g => Object.keys(g.S.found).length, max: g => g.places.length, xp: 250 },
];

// badges (Erfolge): checked every second, shown in the handbook (B → Erfolge & Statistik) with the statistics
const st = (g, k) => g.S.stat[k] || 0;
export const BADGES = [
  { id: 'nacht', icon: '🌙', t: T('Erste Nacht'), x: T('Die erste Nacht überlebt.'), ok: g => g.S.day >= 2 },
  { id: 'gerettet', icon: '🚁', t: T('Gerettet'), x: T('Die Bergwacht hat dich geholt.'), ok: g => g.S.flags.won || g.S.flags.free },
  { id: 'packesel', icon: '🎒', t: T('Packesel'), x: T('Den Expeditionsrucksack (48 Plätze) getragen.'), ok: g => g.S.flags.expbag },
  { id: 'woche', icon: '📅', t: T('Eine Woche Wildnis'), x: T('7 Tage überlebt.'), ok: g => g.S.day >= 8 },
  { id: 'monat', icon: '🏕️', t: T('Waldläufer'), x: T('28 Tage überlebt – ein ganzes Jahr mit allen Jahreszeiten.'), ok: g => g.S.day >= 29 },
  { id: 'jaeger', icon: '🏹', t: T('Jäger'), x: T('10 Tiere erlegt.'), ok: g => st(g, 'kills') >= 10 },
  { id: 'baer', icon: '🐻', t: T('Bärenstark'), x: T('Einen Bären erlegt.'), ok: g => st(g, 'kill_bear') >= 1 },
  { id: 'angler', icon: '🎣', t: T('Angelkönig'), x: T('10 Fische gefangen.'), ok: g => st(g, 'fish') >= 10 },
  { id: 'holz', icon: '🪓', t: T('Holzfäller'), x: T('25 Bäume gefällt.'), ok: g => st(g, 'trees') >= 25 },
  { id: 'haus', icon: '🏡', t: T('Baumeister'), x: T('Die Blockhütte ganz ausgebaut.'), ok: g => g.build.list.some(s => s.type === 'huette' && s.ext >= 3) },
  { id: 'bauer', icon: '🧺', t: T('Bauer'), x: T('25 Feldfrüchte geerntet.'), ok: g => st(g, 'harvest') >= 25 },
  { id: 'saecke', icon: '🎒', t: T('Sammler'), x: T('20 Säcke durchsucht.'), ok: g => st(g, 'sacks') >= 20 },
  { id: 'koch', icon: '🍳', t: T('Lagerfeuerkoch'), x: T('20 Mahlzeiten am Feuer gekocht.'), ok: g => st(g, 'cooked') >= 20 },
  { id: 'arzt', icon: '💊', t: T('Wieder gesund'), x: T('Eine Krankheit auskuriert.'), ok: g => st(g, 'cured') >= 1 },
  { id: 'hund', icon: '🐕', t: T('Bester Freund'), x: T('Bello gezähmt und 5 Funde mit „Such!“ gemacht.'), ok: g => g.S.dog?.tame && st(g, 'dogfind') >= 5 },
  { id: 'detektiv', icon: '📜', t: T('Detektiv'), x: T('Das Geheimnis von Tannbach gelöst.'), ok: g => g.S.flags.kurtStory },
  { id: 'schatz', icon: '🪙', t: T('Schatzsucher'), x: T('Opa Willis Schatz auf der Insel gefunden.'), ok: g => g.S.flags.treasure },
  { id: 'kapitaen', icon: '🚣', t: T('Kapitän'), x: T('500 m gerudert.'), ok: g => st(g, 'row') >= 500 },
  { id: 'fahrer', icon: '🚗', t: T('Fernfahrer'), x: T('5 km mit dem Auto gefahren.'), ok: g => st(g, 'drive') >= 5000 },
  { id: 'wanderer', icon: '🥾', t: T('Wanderer'), x: T('20 km zu Fuß gelaufen.'), ok: g => st(g, 'walk') >= 20000 },
  { id: 'funker', icon: '📡', t: T('Funker'), x: T('Die Funkstation wieder in Betrieb genommen.'), ok: g => g.S.flags.funkCalled },
  { id: 'bergfex', icon: '⛰️', t: T('Bergfex'), x: T('Über den Pass ins Gebirge gefahren.'), ok: g => g.S.flags.berg },
  { id: 'gipfel', icon: '⛳', t: T('Gipfelstürmer'), x: T('Auf dem Gipfel des Steinbergs gestanden.'), ok: g => g.S.found.gipfel },
  { id: 'spreng', icon: '💥', t: T('Sprengmeister'), x: T('Das Geröll im Stollen gesprengt.'), ok: g => g.S.flags.blasted },
  { id: 'reich', icon: '💶', t: T('Gute Geschäfte'), x: T('250 € bei Kurt verdient.'), ok: g => st(g, 'earned') >= 250 },
  { id: 'karte', icon: '🗺️', t: T('Kartograf'), x: T('Alle Orte entdeckt (Tal und Gebirge).'), ok: g => g.places.every(p => g.S.found[p.id]) },
  { id: 'level10', icon: '⭐', t: T('Alter Hase'), x: T('Level 10 erreicht.'), ok: g => g.progress.level >= 10 },
  { id: 'wahrheit', icon: '⚖️', t: T('Ehrlich währt am längsten'), x: T('Brandts Plan auffliegen lassen – Tannbach ist wieder bewohnt.'), ok: g => g.S.flags.ending === 'wahrheit' },
  { id: 'schweigen', icon: '🤐', t: T('Schweigegeld'), x: T('Brandts Umschlag genommen und geschwiegen.'), ok: g => g.S.flags.ending === 'schweigen' },
  { id: 'grimm', icon: '🐻', t: T('Bärenbezwinger'), x: T('Den alten Grimm im Gebirge besiegt.'), ok: g => g.S.flags.grimm },
  { id: 'sturm', icon: '🌪️', t: T('Sturmfest'), x: T('3 Unwetter oder Schneestürme sicher überstanden.'), ok: g => st(g, 'storm_ok') >= 3 },
  { id: 'eis', icon: '🧊', t: T('Eisfischer'), x: T('Einen Fisch am Eisloch gefangen.'), ok: g => g.S.flags.iceFish },
  { id: 'stern', icon: '🌠', t: T('Sternengucker'), x: T('10 Sternschnuppen gesehen.'), ok: g => st(g, 'meteor') >= 10 },
  { id: 'album', icon: '📔', t: T('Naturforscher'), x: T('Alle Tiere im Sammelalbum.'), ok: g => g.album && g.album.count('tiere') >= 9 },
  { id: 'verstecke', icon: '🗝️', t: T('Schatzjäger'), x: T('Alle 6 Geheimverstecke gefunden.'), ok: g => st(g, 'stash') >= 6 },
  { id: 'kurt', icon: '📋', t: T('Stammlieferant'), x: T('5 Tagesaufträge für Kurt erledigt.'), ok: g => st(g, 'orders') >= 5 },
];
// statistics shown in the handbook: [key, label, format]
export const STATS = [['walk', T('🥾 zu Fuß'), 'km'], ['drive', T('🚗 mit dem Auto'), 'km'], ['row', T('🚣 gerudert'), 'm'], ['trees', T('🪓 Bäume gefällt')], ['kills', T('🏹 Tiere erlegt')],
  ['kill_wolf', T('   davon Wölfe')], ['kill_boar', T('   Wildschweine')], ['kill_bear', T('   Bären')], ['kill_deer', T('   Rehe')], ['kill_gams', T('   Gämsen')], ['fish', T('🎣 Fische')], ['rabbits', T('🐇 Kaninchen aus Fallen')],
  ['harvest', T('🧺 Feldfrüchte geerntet')], ['sacks', T('🎒 Säcke durchsucht')], ['crafted', T('🛠️ Dinge hergestellt')], ['built', T('🔨 Bauwerke gebaut')], ['cooked', T('🍳 am Feuer gekocht')], ['eaten', T('🍽️ gegessen & getrunken')],
  ['ill', T('🤧 krank geworden')], ['cured', T('💊 wieder gesund')], ['slept', T('🛏️ Nächte geschlafen')], ['dogfind', T('🐕 Bellos Funde')], ['earned', T('💶 bei Kurt verdient'), '€'], ['kristall', T('💎 Bergkristalle')],
  ['orders', T('📋 Aufträge für Kurt')], ['stash', T('🗝️ Verstecke gefunden')], ['meteor', T('🌠 Sternschnuppen gesehen')], ['storms', T('🌪️ Unwetter erlebt')], ['fish_hecht', T('🐟 Hechte')], ['fish_goldforelle', T('🐠 Goldforellen')]];

export class Progress {
  constructor(game) { this.g = game; }
  get level() { return levelOf(this.g.S.xp || 0); }
  next() { const l = this.level; return l < LEVELS.length ? LEVELS[l] : null; }
  add(n, why = '') {
    const S = this.g.S, before = this.level; S.xp = (S.xp || 0) + n;
    this.g.ui.xp?.(n, why);
    const after = this.level;
    if (after > before) { this.g.audio.sfx('levelup'); this.g.ui.toast(T('⭐ Level {n}! {news}', { n: after, news: this.unlocks(after) }), 'good'); }
  }
  // names of the blueprints, extensions and recipes that level l unlocks
  unlockNames(l) {
    const g = this.g, bp = g.blueprints().filter(b => b.lvl === l).map(b => b.name), ext = g.blueprints().flatMap(b => (b.ext || []).filter(e => e.lvl === l).map(e => e.name));
    const rec = g.recipes().filter(r => r.lvl === l).map(r => r.name);
    return [...bp, ...ext, ...rec];
  }
  unlocks(l) { const all = this.unlockNames(l); return all.length ? T('Neu: {list}', { list: all.join(', ') }) : ''; }
  stat(k, n = 1) { const s = this.g.S.stat; s[k] = (s[k] || 0) + n; }
  // side quests: check every second, reward once
  update() {
    const g = this.g, S = g.S;
    for (const q of SIDE) {
      if (S.side[q.id]) continue;
      const max = typeof q.max === 'function' ? q.max(g) : q.max;
      const ok = q.done ? q.done(g) : (q.n(g) >= max);
      if (ok) { S.side[q.id] = S.day; this.add(q.xp, q.t); if (q.money) S.money += q.money; g.audio.sfx('quest'); g.ui.toast(q.money ? T('✅ Nebenaufgabe erledigt: {t} (+{xp} EP, +{money} €)', { t: q.t, xp: q.xp, money: q.money }) : T('✅ Nebenaufgabe erledigt: {t} (+{xp} EP)', { t: q.t, xp: q.xp }), 'good'); }
    }
    this.badges();
  }
  // badges: once per game, small XP bonus
  badges() {
    const g = this.g, S = g.S; S.badges = S.badges || {};
    if (g.creative) return;              // creative mode: no badges
    for (const b of BADGES) if (!S.badges[b.id] && b.ok(g)) { S.badges[b.id] = S.day; this.add(25, ''); g.audio.sfx('badge'); g.ui.toast(T('🏅 Abzeichen: {icon} {t} – {x}', { icon: b.icon, t: b.t, x: b.x }), 'good'); }
  }
  active() { return SIDE.filter(q => !this.g.S.side[q.id] && (!q.show || q.show(this.g))); }
  progressText(q) { const g = this.g, max = typeof q.max === 'function' ? q.max(g) : q.max; return q.n ? ` (${Math.min(q.n(g), max)}/${max})` : ''; }
}
