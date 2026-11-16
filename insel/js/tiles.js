// Kachelarten. edges: 6 Kantentypen bei Drehung 0 (Kante i zeigt nach 60°·i):
//   g = Land, w = Bach (muss an Bach oder See anschließen), r = Weg (passt am besten an Weg), l = Seeufer (passt an alles, Bach mündet)
// biome: für Nachbarpunkte und Gruppen. likes: Extrapunkte je Nachbar-Biom. unlock: Punktzahl, ab der die Kachel in den Stapel kommt.
export const TILES = {
  start:   { name: 'Dorfbrunnen', icon: '⛲', biome: 'dorf', edges: 'rgggrg', unlock: Infinity, w: 0,
             desc: 'Der Anfang deiner Insel: Brunnen, Wegweiser und eine Bank.' },
  wiese:   { name: 'Wiese', icon: '🌼', biome: 'wiese', edges: 'gggggg', unlock: 0, w: 5,
             desc: 'Blumen, Gras und Bienen. Passt zu allem (1 Punkt je Nachbar).' },
  wald:    { name: 'Wald', icon: '🌲', biome: 'wald', edges: 'gggggg', unlock: 0, w: 7,
             desc: 'Fichten, Buchen, Pilze und Rehe. Wald neben Wald: 3 Punkte.' },
  bach:    { name: 'Bach', icon: '💧', biome: 'wasser', edges: 'wggwgg', unlock: 0, w: 4,
             desc: 'Ein gerader Bach. Bachkanten müssen an Bach oder See stoßen (oder ins Leere: dann stürzt ein Wasserfall von der Insel).' },
  bachk:   { name: 'Bachbiegung', icon: '〰️', biome: 'wasser', edges: 'wgwggg', unlock: 0, w: 3,
             desc: 'Der Bach macht einen Bogen. Bach an Bach: 3 Punkte.' },
  haus:    { name: 'Fachwerkhaus', icon: '🏠', biome: 'dorf', edges: 'rggggg', unlock: 0, w: 5,
             desc: 'Ein Haus mit Garten. Häuser nebeneinander: 3 Punkte. Ab 3 Häusern im Dorf wird es zweistöckig, ab 6 bekommt es einen Anbau.' },
  weg:     { name: 'Weg', icon: '🛤️', biome: 'dorf', edges: 'rggrgg', unlock: 0, w: 3,
             desc: 'Verbindet Häuser. Weg an Weg: 2 Extrapunkte. Zählt zum Dorf.' },
  feld:    { name: 'Feld', icon: '🌾', biome: 'feld', edges: 'gggggg', unlock: 100, w: 5,
             desc: 'Weizen, Kürbis oder Raps – je nach Jahreszeit grün, golden oder abgeerntet. Feld an Feld: 3 Punkte.' },
  muehle:  { name: 'Windmühle', icon: '🌬️', biome: 'feld', edges: 'gggggg', unlock: 100, w: 2, likes: { feld: 4 },
             desc: 'Mahlt das Korn der Felder. 4 Punkte je Feld daneben.' },
  see:     { name: 'See', icon: '🏞️', biome: 'wasser', edges: 'llllll', unlock: 250, w: 3,
             desc: 'Ein stiller See mit Seerosen. Seen verbinden sich, Bäche münden hinein (3 Punkte).' },
  quelle:  { name: 'Quelle', icon: '⛲', biome: 'wasser', edges: 'wggggg', unlock: 250, w: 2,
             desc: 'Hier entspringt ein Bach. Gut, um Bäche zu beenden.' },
  wegk:    { name: 'Wegbiegung', icon: '↪️', biome: 'dorf', edges: 'rgrggg', unlock: 250, w: 2,
             desc: 'Ein Weg mit Kurve.' },
  hof:     { name: 'Bauernhof', icon: '🐄', biome: 'feld', edges: 'rggggg', unlock: 450, w: 2, likes: { feld: 3, dorf: 2 },
             desc: 'Scheune, Kühe und Hühner. 3 Punkte je Feld, 2 je Dorfkachel daneben.' },
  bruecke: { name: 'Brücke', icon: '🌉', biome: 'dorf', edges: 'wrgwrg', unlock: 450, w: 2,
             desc: 'Ein Weg führt über den Bach. Zählt als Dorf und als Bach.' },
  kapelle: { name: 'Kapelle', icon: '⛪', biome: 'dorf', edges: 'rggggg', unlock: 700, w: 1, likes: { dorf: 4 },
             desc: 'Glockenturm und kleiner Friedhof. 4 Punkte je Dorfkachel daneben.' },
  wmuehle: { name: 'Wassermühle', icon: '⚙️', biome: 'dorf', edges: 'wggwgg', unlock: 700, w: 1, likes: { feld: 2 },
             desc: 'Das Mühlrad dreht sich im Bach. Passt an Dorf und Feld.' },
  markt:   { name: 'Marktplatz', icon: '🎪', biome: 'dorf', edges: 'rgrgrg', unlock: 1000, w: 1, likes: { dorf: 4 },
             desc: 'Stände, Wimpel und ein Springbrunnen. 4 Punkte je Dorfkachel daneben.' },
  berg:    { name: 'Berg', icon: '⛰️', biome: 'berg', edges: 'gggggg', unlock: 1000, w: 2, likes: { wald: 2 },
             desc: 'Felsen mit Schneekappe und Stollen. Berg an Berg: 3 Punkte, Wald daneben: 2.' },
  turm:    { name: 'Leuchtturm', icon: '🗼', biome: 'wiese', edges: 'gggggg', unlock: 1400, w: 1, likes: { wasser: 2 }, edgeBonus: 4,
             desc: 'Gehört an den Inselrand: 4 Punkte je freier Seite beim Setzen. Nachts kreist sein Lichtstrahl.' },
};
export const KINDS = Object.keys(TILES).filter(k => k !== 'start');
export const BIOME_NAMES = { wiese: 'Wiese', wald: 'Wald', wasser: 'Wasser', feld: 'Felder', dorf: 'Dorf', berg: 'Berge' };

// Biome, die nebeneinander Punkte geben (symmetrisch, das Maximum zählt)
const AFF = {
  wiese: { wiese: 1, wald: 1, wasser: 1, feld: 1, dorf: 1, berg: 1 },
  wald: { wald: 3, berg: 2, wasser: 1 },
  wasser: { wasser: 2, wald: 1, dorf: 1 },
  feld: { feld: 3, dorf: 1 },
  dorf: { dorf: 3 },
  berg: { berg: 3 },
};
export function affinity(ka, kb) {
  const A = TILES[ka], B = TILES[kb];
  return Math.max(AFF[A.biome]?.[B.biome] || 0, AFF[B.biome]?.[A.biome] || 0, A.likes?.[B.biome] || 0, B.likes?.[A.biome] || 0);
}
export const edgesOf = (kind, rot) => { const e = TILES[kind].edges, o = []; for (let i = 0; i < 6; i++) o[(i + rot) % 6] = e[i]; return o; };

// Gruppen: welche Kacheln zusammen zählen (für Meilensteine, Hausstufen, Aufgaben)
export const GROUP = { wald: 'wald', feld: 'feld', muehle: 'feld', hof: 'feld', haus: 'dorf', weg: 'dorf', wegk: 'dorf', start: 'dorf', bruecke: 'dorf',
  kapelle: 'dorf', markt: 'dorf', wmuehle: 'dorf', bach: 'wasser', bachk: 'wasser', quelle: 'wasser', see: 'wasser', berg: 'berg' };
export const GROUP_NAMES = { wald: 'Wald', feld: 'Felder', dorf: 'Dorf', wasser: 'Gewässer', berg: 'Gebirge' };

// Freischaltungen in Reihenfolge
export const UNLOCKS = [...new Set(KINDS.map(k => TILES[k].unlock))].sort((a, b) => a - b)
  .map(at => ({ at, kinds: KINDS.filter(k => TILES[k].unlock === at) }));
