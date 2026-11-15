// Experience and levels + side quests ("Nebenaufgaben").
// XP comes from quests, discoveries, felling, building, crafting, harvesting, hunting, fishing, looting, reading the village notes …
// Levels unlock blueprints, workbench recipes and the cabin extensions (items.js: lvl).
export const LEVELS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000, 5000, 6200, 7600, 9200];
export const levelOf = xp => { let l = 1; while (l < LEVELS.length && xp >= LEVELS[l]) l++; return l; };

// side quests: id, title, text, goal (progress function of the game) and reward
export const SIDE = [
  { id: 'dorf', t: 'Das stille Dorf', x: 'Warum ist Tannbach verlassen? Lies die 5 Notizen (Häuser, Kapelle, Dorfladen, Steinbruch) und erzähl Kurt davon.',
    n: g => Object.keys(g.S.notes).length, max: 5, done: g => g.S.flags.kurtStory, xp: 250, money: 20 },
  { id: 'bello', t: 'Kurts Hund', x: 'Bello streunt bei der Burgruine herum. Gib ihm Fleisch, dann folgt er dir und warnt dich vor Raubtieren.', done: g => g.S.dog?.tame, xp: 150, target: g => g.posOf('ziel_bello') },
  { id: 'felle', t: 'Felle für Kurt', x: 'Kurt zahlt gut für 3 Felle (beim Händler verkaufen).', n: g => g.S.stat.sold_fell || 0, max: 3, xp: 80 },
  { id: 'auto', t: 'Wieder mobil', x: 'Repariere dein Auto: Keilriemen + Werkzeugkasten aus der Werkstatt „KFZ Brandt“ im Dorf, dann einen vollen Kanister in den Tank.', done: g => g.S.car?.fixed && g.S.car?.fuel > 0, xp: 200 },
  { id: 'schatz', t: 'Opa Willis Schatz', x: 'Im Logbuch der Anglerhütte steht etwas von einem Schatz auf der Insel im Waldsee. Nimm das Ruderboot am Steg – und einen Spaten.',
    done: g => g.S.flags.treasure, xp: 150, target: g => g.S.flags.dug ? null : g.posOf('ziel_insel') },
  { id: 'forst', t: 'Der verschwundene Förster', x: 'Das Forsthaus Eichengrund (südlich des Dorfes, westlich der Straße) ist verschlossen. Finde den Schlüssel und lies Hennings Tagebuch.',
    done: g => g.S.flags.diary, xp: 100, target: g => g.posOf('ziel_forsthaus') },
  { id: 'funk', t: 'Funkstille', x: 'Bring die Funkstation auf dem Kahlberg (südwestlich der Tankstelle) wieder auf Sendung: Tür-Code knacken, Notstrom-Aggregat betanken, Sender einschalten.',
    done: g => g.S.flags.funkCalled, xp: 150, target: g => g.posOf('ziel_funkturm') },
  { id: 'pass', t: 'Über den Pass', x: 'Öffne die Schranke am Nordende der Straße (Schlüssel in der Funkstation) und fahr mit dem Auto hinauf ins Gebirge.',
    done: g => g.S.flags.berg, xp: 150 },
  { id: 'henning', t: 'Henning finden', x: 'Förster Henning ist zur Steinberghütte im Gebirge aufgebrochen. Sieh nach, ob es ihm gut geht.',
    done: g => g.S.flags.henning, xp: 200, money: 30, target: g => g.region() === 'berg' ? g.posOf('ziel_henning') : null },
  { id: 'stollen', t: 'Glück auf!', x: 'Im alten Stollen ist der hintere Teil verschüttet. Spreng das Geröll (2 Sprengpulver, Zündschnur = Seil, Feuerzeug) und hol die Bergkristalle.',
    n: g => g.S.stat.kristall || 0, max: 3, xp: 200 },
  { id: 'gipfel', t: 'Gipfelstürmer', x: 'Steig von der Steinberghütte auf den Gipfel des Steinbergs und trag dich ins Gipfelbuch ein.', done: g => g.S.found.gipfel, xp: 120 },
  { id: 'fisch', t: 'Petri Heil', x: 'Fang 3 Fische (Angel: Anglerhütte am Waldsee oder Werkbank).', n: g => g.S.stat.fish || 0, max: 3, xp: 80 },
  { id: 'heim', t: 'Ein Dach über dem Kopf', x: 'Bau eine Blockhütte fertig (G → Bauwerke).', done: g => g.S.flags.cabin, xp: 200 },
  { id: 'ausbau', t: 'Großes Haus', x: 'Bau deine Hütte ganz aus: Anbau, Veranda und Werkstatt.', n: g => Math.max(0, ...g.build.list.filter(s => s.type === 'huette').map(s => s.ext || 0)), max: 3, xp: 300 },
  { id: 'farm', t: 'Selbstversorger', x: 'Ernte 10 Feldfrüchte.', n: g => g.S.stat.harvest || 0, max: 10, xp: 120 },
  { id: 'jagd', t: 'Jäger', x: 'Erlege 5 Tiere.', n: g => g.S.stat.kills || 0, max: 5, xp: 120 },
  { id: 'fallen', t: 'Fallensteller', x: 'Fang 3 Kaninchen mit Fallen.', n: g => g.S.stat.rabbits || 0, max: 3, xp: 80 },
  { id: 'karte', t: 'Kartograf', x: 'Entdecke alle Orte.', n: g => Object.keys(g.S.found).length, max: g => g.places.length, xp: 250 },
];

// badges (Erfolge): checked every second, shown in the handbook (B → Erfolge & Statistik) with the statistics
const st = (g, k) => g.S.stat[k] || 0;
export const BADGES = [
  { id: 'nacht', icon: '🌙', t: 'Erste Nacht', x: 'Die erste Nacht überlebt.', ok: g => g.S.day >= 2 },
  { id: 'gerettet', icon: '🚁', t: 'Gerettet', x: 'Die Bergwacht hat dich geholt.', ok: g => g.S.flags.won || g.S.flags.free },
  { id: 'woche', icon: '📅', t: 'Eine Woche Wildnis', x: '7 Tage überlebt.', ok: g => g.S.day >= 8 },
  { id: 'monat', icon: '🏕️', t: 'Waldläufer', x: '28 Tage überlebt – ein ganzes Jahr mit allen Jahreszeiten.', ok: g => g.S.day >= 29 },
  { id: 'jaeger', icon: '🏹', t: 'Jäger', x: '10 Tiere erlegt.', ok: g => st(g, 'kills') >= 10 },
  { id: 'baer', icon: '🐻', t: 'Bärenstark', x: 'Einen Bären erlegt.', ok: g => st(g, 'kill_bear') >= 1 },
  { id: 'angler', icon: '🎣', t: 'Angelkönig', x: '10 Fische gefangen.', ok: g => st(g, 'fish') >= 10 },
  { id: 'holz', icon: '🪓', t: 'Holzfäller', x: '25 Bäume gefällt.', ok: g => st(g, 'trees') >= 25 },
  { id: 'haus', icon: '🏡', t: 'Baumeister', x: 'Die Blockhütte ganz ausgebaut.', ok: g => g.build.list.some(s => s.type === 'huette' && s.ext >= 3) },
  { id: 'bauer', icon: '🧺', t: 'Bauer', x: '25 Feldfrüchte geerntet.', ok: g => st(g, 'harvest') >= 25 },
  { id: 'saecke', icon: '🎒', t: 'Sammler', x: '20 Säcke durchsucht.', ok: g => st(g, 'sacks') >= 20 },
  { id: 'koch', icon: '🍳', t: 'Lagerfeuerkoch', x: '20 Mahlzeiten am Feuer gekocht.', ok: g => st(g, 'cooked') >= 20 },
  { id: 'arzt', icon: '💊', t: 'Wieder gesund', x: 'Eine Krankheit auskuriert.', ok: g => st(g, 'cured') >= 1 },
  { id: 'hund', icon: '🐕', t: 'Bester Freund', x: 'Bello gezähmt und 5 Funde mit „Such!“ gemacht.', ok: g => g.S.dog?.tame && st(g, 'dogfind') >= 5 },
  { id: 'detektiv', icon: '📜', t: 'Detektiv', x: 'Das Geheimnis von Tannbach gelöst.', ok: g => g.S.flags.kurtStory },
  { id: 'schatz', icon: '🪙', t: 'Schatzsucher', x: 'Opa Willis Schatz auf der Insel gefunden.', ok: g => g.S.flags.treasure },
  { id: 'kapitaen', icon: '🚣', t: 'Kapitän', x: '500 m gerudert.', ok: g => st(g, 'row') >= 500 },
  { id: 'fahrer', icon: '🚗', t: 'Fernfahrer', x: '5 km mit dem Auto gefahren.', ok: g => st(g, 'drive') >= 5000 },
  { id: 'wanderer', icon: '🥾', t: 'Wanderer', x: '20 km zu Fuß gelaufen.', ok: g => st(g, 'walk') >= 20000 },
  { id: 'funker', icon: '📡', t: 'Funker', x: 'Die Funkstation wieder in Betrieb genommen.', ok: g => g.S.flags.funkCalled },
  { id: 'bergfex', icon: '⛰️', t: 'Bergfex', x: 'Über den Pass ins Gebirge gefahren.', ok: g => g.S.flags.berg },
  { id: 'gipfel', icon: '⛳', t: 'Gipfelstürmer', x: 'Auf dem Gipfel des Steinbergs gestanden.', ok: g => g.S.found.gipfel },
  { id: 'spreng', icon: '💥', t: 'Sprengmeister', x: 'Das Geröll im Stollen gesprengt.', ok: g => g.S.flags.blasted },
  { id: 'reich', icon: '💶', t: 'Gute Geschäfte', x: '250 € bei Kurt verdient.', ok: g => st(g, 'earned') >= 250 },
  { id: 'karte', icon: '🗺️', t: 'Kartograf', x: 'Alle Orte entdeckt (Tal und Gebirge).', ok: g => g.places.every(p => g.S.found[p.id]) },
  { id: 'level10', icon: '⭐', t: 'Alter Hase', x: 'Level 10 erreicht.', ok: g => g.progress.level >= 10 },
];
// statistics shown in the handbook: [key, label, format]
export const STATS = [['walk', '🥾 zu Fuß', 'km'], ['drive', '🚗 mit dem Auto', 'km'], ['row', '🚣 gerudert', 'm'], ['trees', '🪓 Bäume gefällt'], ['kills', '🏹 Tiere erlegt'],
  ['kill_wolf', '   davon Wölfe'], ['kill_boar', '   Wildschweine'], ['kill_bear', '   Bären'], ['kill_deer', '   Rehe'], ['kill_gams', '   Gämsen'], ['fish', '🎣 Fische'], ['rabbits', '🐇 Kaninchen aus Fallen'],
  ['harvest', '🧺 Feldfrüchte geerntet'], ['sacks', '🎒 Säcke durchsucht'], ['crafted', '🛠️ Dinge hergestellt'], ['built', '🔨 Bauwerke gebaut'], ['cooked', '🍳 am Feuer gekocht'], ['eaten', '🍽️ gegessen & getrunken'],
  ['ill', '🤧 krank geworden'], ['cured', '💊 wieder gesund'], ['slept', '🛏️ Nächte geschlafen'], ['dogfind', '🐕 Bellos Funde'], ['earned', '💶 bei Kurt verdient', '€'], ['kristall', '💎 Bergkristalle']];

export class Progress {
  constructor(game) { this.g = game; }
  get level() { return levelOf(this.g.S.xp || 0); }
  next() { const l = this.level; return l < LEVELS.length ? LEVELS[l] : null; }
  add(n, why = '') {
    const S = this.g.S, before = this.level; S.xp = (S.xp || 0) + n;
    this.g.ui.xp?.(n, why);
    const after = this.level;
    if (after > before) { this.g.audio.sfx('levelup'); this.g.ui.toast(`⭐ Level ${after}! ${this.unlocks(after)}`, 'good'); }
  }
  unlocks(l) {
    const g = this.g, bp = g.blueprints().filter(b => b.lvl === l).map(b => b.name), ext = g.blueprints().flatMap(b => (b.ext || []).filter(e => e.lvl === l).map(e => e.name));
    const rec = g.recipes().filter(r => r.lvl === l).map(r => r.name), all = [...bp, ...ext, ...rec];
    return all.length ? 'Neu: ' + all.join(', ') : '';
  }
  stat(k, n = 1) { const s = this.g.S.stat; s[k] = (s[k] || 0) + n; }
  // side quests: check every second, reward once
  update() {
    const g = this.g, S = g.S;
    for (const q of SIDE) {
      if (S.side[q.id]) continue;
      const max = typeof q.max === 'function' ? q.max(g) : q.max;
      const ok = q.done ? q.done(g) : (q.n(g) >= max);
      if (ok) { S.side[q.id] = S.day; this.add(q.xp, q.t); if (q.money) S.money += q.money; g.audio.sfx('quest'); g.ui.toast(`✅ Nebenaufgabe erledigt: ${q.t} (+${q.xp} EP${q.money ? `, +${q.money} €` : ''})`, 'good'); }
    }
    this.badges();
  }
  // badges: once per game, small XP bonus
  badges() {
    const g = this.g, S = g.S; S.badges = S.badges || {};
    for (const b of BADGES) if (!S.badges[b.id] && b.ok(g)) { S.badges[b.id] = S.day; this.add(25, ''); g.audio.sfx('badge'); g.ui.toast(`🏅 Abzeichen: ${b.icon} ${b.t} – ${b.x}`, 'good'); }
  }
  active() { return SIDE.filter(q => !this.g.S.side[q.id]); }
  progressText(q) { const g = this.g, max = typeof q.max === 'function' ? q.max(g) : q.max; return q.n ? ` (${Math.min(q.n(g), max)}/${max})` : ''; }
}
