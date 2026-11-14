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
  { id: 'fisch', t: 'Petri Heil', x: 'Fang 3 Fische (Angel: Anglerhütte am Waldsee oder Werkbank).', n: g => g.S.stat.fish || 0, max: 3, xp: 80 },
  { id: 'heim', t: 'Ein Dach über dem Kopf', x: 'Bau eine Blockhütte fertig (G → Bauwerke).', done: g => g.S.flags.cabin, xp: 200 },
  { id: 'ausbau', t: 'Großes Haus', x: 'Bau deine Hütte ganz aus: Anbau, Veranda und Werkstatt.', n: g => Math.max(0, ...g.build.list.filter(s => s.type === 'huette').map(s => s.ext || 0)), max: 3, xp: 300 },
  { id: 'farm', t: 'Selbstversorger', x: 'Ernte 10 Feldfrüchte.', n: g => g.S.stat.harvest || 0, max: 10, xp: 120 },
  { id: 'jagd', t: 'Jäger', x: 'Erlege 5 Tiere.', n: g => g.S.stat.kills || 0, max: 5, xp: 120 },
  { id: 'fallen', t: 'Fallensteller', x: 'Fang 3 Kaninchen mit Fallen.', n: g => g.S.stat.rabbits || 0, max: 3, xp: 80 },
  { id: 'karte', t: 'Kartograf', x: 'Entdecke alle Orte.', n: g => Object.keys(g.S.found).length, max: g => g.places.length, xp: 250 },
];

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
      if (ok) { S.side[q.id] = 1; this.add(q.xp, q.t); if (q.money) S.money += q.money; g.audio.sfx('quest'); g.ui.toast(`✅ Nebenaufgabe erledigt: ${q.t} (+${q.xp} EP${q.money ? `, +${q.money} €` : ''})`, 'good'); }
    }
  }
  active() { return SIDE.filter(q => !this.g.S.side[q.id]); }
  progressText(q) { const g = this.g, max = typeof q.max === 'function' ? q.max(g) : q.max; return q.n ? ` (${Math.min(q.n(g), max)}/${max})` : ''; }
}
