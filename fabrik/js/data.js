// Cogtopia – reine Spieldaten (keine Logik). Ids sind fest (siehe DESIGN.md), Texte hier nur als englischer Rückfall;
// die Oberfläche holt Namen/Beschreibungen über i18n.js (lang/en.js, lang/de.js).

export const GAME_TITLE = 'Cogtopia';

// ---------- Gegenstände ----------
// value = Grundpreis in Münzen, rp = Forschungspunkte im Labor, tier = Stufe
export const ITEMS = {
  stein:       { name: 'Stone',          value: 1,    color: '#8d8d8d', shape: 'chunk',  tier: 1, rp: 1,  desc: 'Plain rock. Sells for little, smelts into bricks.' },
  eisenerz:    { name: 'Iron Ore',       value: 1,    color: '#9a5b45', shape: 'chunk',  tier: 1, rp: 1,  desc: 'Rusty ore. Smelt it into iron bars.' },
  kupfererz:   { name: 'Copper Ore',     value: 1,    color: '#c27a3a', shape: 'chunk',  tier: 1, rp: 1,  desc: 'Greenish-orange ore. Smelts into copper bars.' },
  kohle:       { name: 'Coal',           value: 1,    color: '#2b2b2e', shape: 'chunk',  tier: 1, rp: 2,  desc: 'Black and dusty. Some secret recipes love it.' },
  sand:        { name: 'Sand',           value: 1,    color: '#e2c98a', shape: 'chunk',  tier: 1, rp: 1,  desc: 'Fine sand. Melt it into glass.' },
  kristall:    { name: 'Crystal',        value: 10,   color: '#6fe3ff', shape: 'chunk',  tier: 2, rp: 5,  desc: 'Rare glowing crystal. Valuable on its own, even more in secret recipes.' },
  oel:         { name: 'Oil',            value: 3,    color: '#3a2f4a', shape: 'orb',    tier: 1, rp: 2,  desc: 'Crude oil. A refinery turns it into plastic.' },
  titanerz:    { name: 'Titanium Ore',   value: 5,    color: '#a9b6c8', shape: 'chunk',  tier: 2, rp: 3,  desc: 'Light, hard ore from the Moon.' },
  ziegel:      { name: 'Brick',          value: 2,    color: '#b5523b', shape: 'box',    tier: 2, rp: 2,  desc: 'Fired stone. Solid and honest.' },
  eisenbarren: { name: 'Iron Bar',       value: 4,    color: '#b8c0c8', shape: 'bar',    tier: 2, rp: 2,  desc: 'Smelted iron. Press it into plates, gears and pipes.' },
  kupferbarren:{ name: 'Copper Bar',     value: 4,    color: '#d8834a', shape: 'bar',    tier: 2, rp: 2,  desc: 'Shiny copper. Draw it into wire.' },
  glas:        { name: 'Glass',          value: 3,    color: '#bfe8f0', shape: 'plate',  tier: 2, rp: 2,  desc: 'Clear glass sheet. For lenses and windows.' },
  titanbarren: { name: 'Titanium Bar',   value: 20,   color: '#dfe7f2', shape: 'bar',    tier: 3, rp: 6,  desc: 'Space-grade metal.' },
  kunststoff:  { name: 'Plastic',        value: 10,   color: '#f2f2ea', shape: 'box',    tier: 3, rp: 4,  desc: 'Refined from oil. Needed for batteries.' },
  eisenplatte: { name: 'Iron Plate',     value: 8,   color: '#9fa8b2', shape: 'plate',  tier: 3, rp: 4,  desc: 'Pressed iron. The base of every circuit.' },
  zahnrad:     { name: 'Gear',           value: 18,   color: '#8f98a3', shape: 'gear',   tier: 3, rp: 5,  desc: 'Two bars pressed into a gear. Motors need them.' },
  kupferdraht: { name: 'Copper Wire',    value: 4,    color: '#e09a5a', shape: 'coil',   tier: 3, rp: 3,  desc: 'A coil of copper wire. One bar makes two.' },
  rohr:        { name: 'Pipe',           value: 7,    color: '#7d8a96', shape: 'pipe',   tier: 3, rp: 4,  desc: 'Iron pipe. Windows and rockets need it.' },
  linse:       { name: 'Lens',           value: 9,   color: '#a6e4ff', shape: 'lens',   tier: 3, rp: 5,  desc: 'Ground glass lens. Lasers need it.' },
  schaltkreis: { name: 'Circuit',        value: 35,   color: '#2f9e5a', shape: 'chip',   tier: 4, rp: 12, desc: 'Plate plus wire. The brain of every machine.' },
  motor:       { name: 'Motor',          value: 55,   color: '#3a5f9e', shape: 'box',    tier: 4, rp: 15, desc: 'Gear plus wire. Makes things spin.' },
  akku:        { name: 'Battery',        value: 32,   color: '#e8c33a', shape: 'box',    tier: 4, rp: 14, desc: 'Stores power. Secret recipes need it.' },
  fenster:     { name: 'Window',         value: 32,   color: '#9fd6e8', shape: 'plate',  tier: 4, rp: 10, desc: 'Glass in a pipe frame.' },
  computer:    { name: 'Computer',       value: 140,  color: '#4a4f5a', shape: 'box',    tier: 5, rp: 40, desc: 'Circuit plus battery. Secret recipe.' },
  roboter:     { name: 'Robot',          value: 400, color: '#d9dde3', shape: 'robot',  tier: 6, rp: 120, desc: 'It waves at you. Secret recipe.' },
  laser:       { name: 'Laser',          value: 85,  color: '#e0443a', shape: 'pipe',   tier: 5, rp: 40, desc: 'Lens plus battery. Pew. Secret recipe.' },
  solarpanel:  { name: 'Solar Panel',    value: 130,  color: '#1f3f7a', shape: 'plate',  tier: 5, rp: 45, desc: 'Window plus circuit. Secret recipe.' },
  rakete:      { name: 'Rocket',         value: 450, color: '#f4f4f4', shape: 'rocket', tier: 6, rp: 150, desc: 'The pride of every factory. Secret recipe.' },
  schrott:     { name: 'Scrap',          value: 1,    color: '#6b5a4a', shape: 'chunk',  tier: 0, rp: 1,  desc: 'A failed experiment. Worth almost nothing.' },
};
export const ITEM_IDS = Object.keys(ITEMS);
export const RAW = ['stein', 'eisenerz', 'kupfererz', 'kohle', 'sand', 'kristall', 'oel', 'titanerz'];
export const GOLD_MUL = 25;

// ---------- Gebäude ----------
// kind: belt | tunnel | split | sort | drill | machine | exp | lab | sell | store
// cost = Grundpreis, scale = Preisanstieg je weiteres Gebäude dieser Art, unlock = 'start' oder Forschungs-Id
export const BUILDINGS = {
  band:       { name: 'Conveyor Belt',    kind: 'belt',    w: 1, h: 1, cost: 1,    scale: 1,    unlock: 'start',      desc: 'Carries parts forward. Up to 4 parts per tile.' },
  tunnel:     { name: 'Tunnel Belt',      kind: 'tunnel',  w: 1, h: 1, cost: 10,   scale: 1,    unlock: 'tunnel',     range: 5, desc: 'Place an entrance, then an exit up to 4 tiles further. Parts travel underneath.' },
  verteiler:  { name: 'Splitter',         kind: 'split',   w: 1, h: 1, cost: 20,   scale: 1,    unlock: 'verteiler',  desc: 'Sends parts left, straight and right in turn.' },
  sortierer:  { name: 'Sorter',           kind: 'sort',    w: 1, h: 1, cost: 40,   scale: 1,    unlock: 'sortierer',  desc: 'The chosen part goes left, everything else straight on.' },
  bohrer:     { name: 'Drill',            kind: 'drill',   w: 2, h: 2, cost: 75, scale: 1.25,  unlock: 'start',      time: 2.0, desc: 'Place on a deposit. Mines the resource underneath.' },
  ofen:       { name: 'Smelter',          kind: 'machine', w: 2, h: 2, cost: 200, scale: 1.2,  unlock: 'start',      desc: 'One ingredient in: bars, glass or bricks out.' },
  presse:     { name: 'Press',            kind: 'machine', w: 2, h: 2, cost: 1200, scale: 1.2,  unlock: 'presse',     desc: 'Bars in: plates, gears or pipes out.' },
  drahtzug:   { name: 'Wire Drawer',      kind: 'machine', w: 2, h: 2, cost: 1500, scale: 1.2,  unlock: 'drahtzug',   desc: 'Copper bars become wire, glass becomes lenses.' },
  montage:    { name: 'Assembler',        kind: 'machine', w: 3, h: 3, cost: 12000, scale: 1.25, unlock: 'montage',    desc: 'Two ingredients in: a component out. Known recipes only.' },
  raffinerie: { name: 'Refinery',         kind: 'machine', w: 3, h: 3, cost: 20000, scale: 1.25, unlock: 'raffinerie', desc: 'Turns oil into plastic.' },
  experiment: { name: 'Experiment Table', kind: 'exp',     w: 3, h: 3, cost: 6000, scale: 1.6, unlock: 'experiment', time: 3, desc: 'Feed any two parts. Maybe you discover a secret recipe, maybe you get scrap.' },
  labor:      { name: 'Lab',              kind: 'lab',     w: 2, h: 2, cost: 2500, scale: 1.3, unlock: 'labor',      time: 0.8, desc: 'Dr. Steve turns parts into research points.' },
  verkauf:    { name: 'Sell Station',     kind: 'sell',    w: 2, h: 2, cost: 250, scale: 1.2,  unlock: 'start',      desc: 'Takes anything from every side and pays coins. Keep the rhythm going.' },
  lager:      { name: 'Storage',          kind: 'store',   w: 2, h: 2, cost: 800, scale: 1.15,  unlock: 'lager',      cap: 200, desc: 'Buffers up to 200 parts and releases them to the front.' },
};
export const BUILDING_IDS = Object.keys(BUILDINGS);

// ---------- Rezepte ----------
// in: [[Gegenstand, Anzahl], …], out/n: Ergebnis, time: Sekunden, unlock: 'start' | Forschungs-Id | 'hidden' (Experimentiertisch)
export const RECIPES = {
  ziegel:      { name: 'Brick',          building: 'ofen',       in: [['stein', 1]],        out: 'ziegel',      n: 1, time: 2.0, unlock: 'start' },
  eisenbarren: { name: 'Iron Bar',       building: 'ofen',       in: [['eisenerz', 1]],     out: 'eisenbarren', n: 1, time: 2.0, unlock: 'start' },
  kupferbarren:{ name: 'Copper Bar',     building: 'ofen',       in: [['kupfererz', 1]],    out: 'kupferbarren',n: 1, time: 2.0, unlock: 'kupfer' },
  glas:        { name: 'Glass',          building: 'ofen',       in: [['sand', 1]],         out: 'glas',        n: 1, time: 2.0, unlock: 'glas' },
  titanbarren: { name: 'Titanium Bar',   building: 'ofen',       in: [['titanerz', 1]],     out: 'titanbarren', n: 1, time: 3.0, unlock: 'titan' },
  kunststoff:  { name: 'Plastic',        building: 'raffinerie', in: [['oel', 1]],          out: 'kunststoff',  n: 1, time: 2.0, unlock: 'raffinerie' },
  eisenplatte: { name: 'Iron Plate',     building: 'presse',     in: [['eisenbarren', 1]],  out: 'eisenplatte', n: 1, time: 2.0, unlock: 'presse' },
  zahnrad:     { name: 'Gear',           building: 'presse',     in: [['eisenbarren', 2]],  out: 'zahnrad',     n: 1, time: 4.0, unlock: 'zahnrad' },
  rohr:        { name: 'Pipe',           building: 'presse',     in: [['eisenbarren', 1]],  out: 'rohr',        n: 1, time: 2.0, unlock: 'rohr' },
  kupferdraht: { name: 'Copper Wire',    building: 'drahtzug',   in: [['kupferbarren', 1]], out: 'kupferdraht', n: 2, time: 2.0, unlock: 'drahtzug' },
  linse:       { name: 'Lens',           building: 'drahtzug',   in: [['glas', 1]],         out: 'linse',       n: 1, time: 2.0, unlock: 'linse' },
  schaltkreis: { name: 'Circuit',        building: 'montage',    in: [['eisenplatte', 1], ['kupferdraht', 2]], out: 'schaltkreis', n: 1, time: 2.0, unlock: 'montage' },
  motor:       { name: 'Motor',          building: 'montage',    in: [['zahnrad', 1], ['kupferdraht', 2]],     out: 'motor',       n: 1, time: 4.0, unlock: 'motor' },
  akku:        { name: 'Battery',        building: 'montage',    in: [['kupferbarren', 1], ['kunststoff', 1]], out: 'akku',        n: 1, time: 2.0, unlock: 'akku' },
  fenster:     { name: 'Window',         building: 'montage',    in: [['glas', 2], ['rohr', 1]],               out: 'fenster',     n: 1, time: 4.0, unlock: 'fenster' },
  // versteckte Rezepte – nur über den Experimentiertisch (oder einen Tipp von Dr. Steve) zu finden
  computer:    { name: 'Computer',       building: 'montage', in: [['schaltkreis', 1], ['akku', 1]],    out: 'computer',    n: 1, time: 2.0, unlock: 'hidden' },
  roboter:     { name: 'Robot',          building: 'montage', in: [['motor', 1], ['computer', 1]],      out: 'roboter',     n: 1, time: 4.0, unlock: 'hidden' },
  laser:       { name: 'Laser',          building: 'montage', in: [['linse', 1], ['akku', 1]],          out: 'laser',       n: 1, time: 2.0, unlock: 'hidden' },
  solarpanel:  { name: 'Solar Panel',    building: 'montage', in: [['fenster', 1], ['schaltkreis', 1]], out: 'solarpanel',  n: 1, time: 4.0, unlock: 'hidden' },
  rakete:      { name: 'Rocket',         building: 'montage', in: [['laser', 1], ['motor', 1]],         out: 'rakete',      n: 1, time: 4.0, unlock: 'hidden' },
  akku_kohle:  { name: 'Coal Battery',   building: 'montage', in: [['kupferbarren', 1], ['kohle', 2]],  out: 'akku',        n: 1, time: 5.0, unlock: 'hidden' },
  eisen_kohle: { name: 'Blast Furnace Trick', building: 'montage', in: [['eisenerz', 2], ['kohle', 1]], out: 'eisenbarren', n: 3, time: 3.0, unlock: 'hidden' },
  linse_kristall:       { name: 'Crystal Lens',     building: 'montage', in: [['kristall', 1], ['glas', 1]],        out: 'linse',       n: 3, time: 3.0, unlock: 'hidden' },
  schaltkreis_kristall: { name: 'Crystal Circuit',  building: 'montage', in: [['kristall', 1], ['kupferdraht', 1]], out: 'schaltkreis', n: 2, time: 4.0, unlock: 'hidden' },
  fenster_ziegel:       { name: 'Brick Window',     building: 'montage', in: [['ziegel', 2], ['glas', 2]],          out: 'fenster',     n: 1, time: 4.0, unlock: 'hidden' },
  roboter_titan:        { name: 'Titanium Robot',   building: 'montage', in: [['titanbarren', 4], ['motor', 1]],    out: 'roboter',     n: 1, time: 8.0, unlock: 'hidden' },
  rakete_titan:         { name: 'Titanium Rocket',  building: 'montage', in: [['titanbarren', 4], ['laser', 1]],    out: 'rakete',      n: 2, time: 8.0, unlock: 'hidden' },
};
export const RECIPE_IDS = Object.keys(RECIPES);
export const HIDDEN_RECIPES = RECIPE_IDS.filter(r => RECIPES[r].unlock === 'hidden');

// ---------- Forschung ----------
// cost = Münzen, rp = Forschungspunkte (Labor), req = Voraussetzungen, fx = Wirkung
// fx: building, recipe, belt/drill/mach/sell/gold/taktMax/xp/rp/offline (additiv)
export const RESEARCH = {
  tunnel:     { name: 'Tunnel Belts',       cost: 250,     rp: 0,    req: [],                       fx: { building: 'tunnel' },     desc: 'Belts that go underground and pop up again a few tiles later.' },
  band1:      { name: 'Belt Speed I',       cost: 300,     rp: 0,    req: [],                       fx: { belt: 0.25 },             desc: 'Belts run 25% faster.' },
  kupfer:     { name: 'Copper Smelting',    cost: 350,     rp: 0,    req: [],                       fx: { recipe: 'kupferbarren' }, desc: 'The smelter learns to make copper bars.' },
  bohr1:      { name: 'Drill Speed I',      cost: 400,     rp: 0,    req: [],                       fx: { drill: 0.25 },            desc: 'Drills mine 25% faster.' },
  verteiler:  { name: 'Splitter',           cost: 500,     rp: 0,    req: ['tunnel'],               fx: { building: 'verteiler' },  desc: 'Split one belt into up to three.' },
  presse:     { name: 'Press',              cost: 1800,    rp: 0,    req: [],                       fx: { building: 'presse', recipe: 'eisenplatte' }, desc: 'A press that turns iron bars into plates.' },
  drahtzug:   { name: 'Wire Drawing',       cost: 2700,    rp: 0,    req: ['kupfer'],               fx: { building: 'drahtzug', recipe: 'kupferdraht' }, desc: 'Copper bars become two coils of wire.' },
  sortierer:  { name: 'Sorter',             cost: 3000,    rp: 0,    req: ['verteiler'],            fx: { building: 'sortierer' },  desc: 'Pick one part type and send it left.' },
  labor:      { name: 'Lab',                cost: 3600,    rp: 0,    req: [],                       fx: { building: 'labor' },      desc: 'Dr. Steve moves in. Parts become research points.' },
  glas:       { name: 'Glassworks',         cost: 4500,    rp: 0,    req: [],                       fx: { recipe: 'glas' },         desc: 'The smelter melts sand into glass.' },
  lager:      { name: 'Storage',            cost: 4500,    rp: 0,    req: ['verteiler'],            fx: { building: 'lager' },      desc: 'A big buffer for 200 parts.' },
  rohr:       { name: 'Pipes',              cost: 6000,    rp: 0,    req: ['presse'],               fx: { recipe: 'rohr' },         desc: 'The press rolls bars into pipes.' },
  zahnrad:    { name: 'Gears',              cost: 7500,    rp: 0,    req: ['presse'],               fx: { recipe: 'zahnrad' },      desc: 'The press stamps two bars into a gear.' },
  band2:      { name: 'Belt Speed II',      cost: 9000,    rp: 40,   req: ['band1', 'labor'],       fx: { belt: 0.25 },             desc: 'Belts run another 25% faster.' },
  gold1:      { name: 'Gold Vein I',        cost: 12000,   rp: 60,   req: ['labor'],                fx: { gold: 0.005 },            desc: 'Golden parts appear twice as often.' },
  montage:    { name: 'Assembly',           cost: 18000,   rp: 80,   req: ['drahtzug', 'presse', 'labor'], fx: { building: 'montage', recipe: 'schaltkreis' }, desc: 'The assembler combines plates and wire into circuits.' },
  linse:      { name: 'Lens Grinding',      cost: 21000,   rp: 120,   req: ['glas', 'drahtzug'],     fx: { recipe: 'linse' },        desc: 'The wire drawer grinds glass into lenses.' },
  bohr2:      { name: 'Drill Speed II',     cost: 24000,   rp: 160,   req: ['bohr1', 'labor'],       fx: { drill: 0.25 },            desc: 'Drills mine another 25% faster.' },
  experiment: { name: 'Experiment Table',   cost: 40000,   rp: 200,  req: ['montage'],              fx: { building: 'experiment' }, desc: 'Combine any two parts and discover secret recipes.' },
  fenster:    { name: 'Windows',            cost: 50000,   rp: 240,  req: ['montage', 'rohr', 'glas'], fx: { recipe: 'fenster' },   desc: 'Glass plus pipe makes a window.' },
  motor:      { name: 'Electric Motor',     cost: 60000,  rp: 300,  req: ['montage', 'zahnrad'],   fx: { recipe: 'motor' },        desc: 'Gear plus wire makes a motor.' },
  takt:       { name: 'Rhythm Keeper',      cost: 60000,  rp: 300,  req: ['labor'],                fx: { taktMax: 0.5 },           desc: 'Sell stations can reach x2.5 rhythm.' },
  sterne:     { name: 'Craftsmanship',      cost: 80000,  rp: 400,  req: ['labor'],                fx: { xp: 1 },                  desc: 'Machines gain stars twice as fast.' },
  raffinerie: { name: 'Refinery',           cost: 80000,  rp: 500,  req: ['montage'],              fx: { building: 'raffinerie', recipe: 'kunststoff' }, desc: 'Turn oil into plastic.' },
  titan:      { name: 'Titanium Smelting',  cost: 100000,  rp: 400,  req: ['glas'],                 fx: { recipe: 'titanbarren' },  desc: 'The smelter learns to melt titanium ore.' },
  labor2:     { name: 'Doctorate',          cost: 100000,  rp: 600,  req: ['labor'],                fx: { rp: 1 },                  desc: 'Dr. Steve finally finishes his thesis: double research points.' },
  akku:       { name: 'Batteries',          cost: 120000,  rp: 600,  req: ['raffinerie'],           fx: { recipe: 'akku' },         desc: 'Copper bar plus plastic makes a battery.' },
  band3:      { name: 'Belt Speed III',     cost: 300000,  rp: 800,  req: ['band2'],                fx: { belt: 0.25 },             desc: 'Belts run another 25% faster.' },
  mach1:      { name: 'Faster Machines',    cost: 380000,  rp: 1000,  req: ['labor'],                fx: { mach: 0.2 },              desc: 'All machines work 20% faster.' },
  gold2:      { name: 'Gold Vein II',       cost: 450000,  rp: 1200,  req: ['gold1'],                fx: { gold: 0.005 },            desc: 'Even more golden parts.' },
  nacht:      { name: 'Night Shift',        cost: 450000,  rp: 1200,  req: ['labor'],                fx: { offline: 0.25 },          desc: 'Your factory earns 25% more while you are away.' },
  markt:      { name: 'Market Power',       cost: 600000,  rp: 1600,  req: ['labor'],                fx: { sell: 0.25 },             desc: 'Everything sells for 25% more.' },
  bohr3:      { name: 'Drill Speed III',    cost: 750000,  rp: 2000, req: ['bohr2'],                fx: { drill: 0.25 },            desc: 'Drills mine another 25% faster.' },
  band4:      { name: 'Belt Speed IV',      cost: 1500000, rp: 4000, req: ['band3'],                fx: { belt: 0.25 },             desc: 'Belts run another 25% faster.' },
  mach2:      { name: 'Overclocking',       cost: 2200000, rp: 6000, req: ['mach1'],                fx: { mach: 0.2 },              desc: 'All machines work another 20% faster.' },
  band5:      { name: 'Belt Speed V',       cost: 3800000, rp: 10000, req: ['band4'],                fx: { belt: 0.25 },             desc: 'The fastest belts in the world.' },
};
export const RESEARCH_IDS = Object.keys(RESEARCH);

// ---------- Patente (Prestige, dauerhaft) ----------
export const PATENTS = {
  startgeld:    { name: 'Seed Capital',       cost: 1, req: [],            fx: { start: 2000 },          desc: 'Every new factory starts with 2,000 extra coins.' },
  goldnase:     { name: 'Nose for Gold',      cost: 1, req: [],            fx: { gold: 0.005 },          desc: 'More golden parts, forever.' },
  schnellband:  { name: 'Slick Belts',        cost: 1, req: [],            fx: { belt: 0.2 },            desc: 'Belts run 20% faster, forever.' },
  tiefbohrer:   { name: 'Deep Drills',        cost: 1, req: [],            fx: { drill: 0.25 },          desc: 'Drills mine 25% faster, forever.' },
  vermesser:    { name: 'Surveyor',           cost: 1, req: [],            fx: { plot: -0.3 },           desc: 'Land costs 30% less.' },
  glueck:       { name: 'Lucky Crates',       cost: 1, req: [],            fx: { luck: 1 },              desc: 'Crates contain better things.' },
  geraldfreund: { name: 'Friend of Gerald',   cost: 1, req: [],            fx: { gerald: 0.5 },          desc: 'Gerald visits 50% more often.' },
  handel:       { name: 'Chamber of Commerce',cost: 2, req: [],            fx: { sell: 0.25 },           desc: 'Everything sells for 25% more, forever.' },
  nachtwache:   { name: 'Night Watch',        cost: 2, req: [],            fx: { offline: 0.25, offlineCap: 4 * 3600 }, desc: 'Offline earnings +25% and up to 12 hours.' },
  taktmeister:  { name: 'Rhythm Master',      cost: 2, req: [],            fx: { taktMax: 0.5 },         desc: 'Sell stations reach a higher rhythm.' },
  forschergeist:{ name: 'Curious Mind',       cost: 2, req: [],            fx: { resCost: -0.25 },       desc: 'Research costs 25% less.' },
  belegschaft:  { name: 'Veteran Crew',       cost: 2, req: [],            fx: { startLvl: 1 },          desc: 'New machines start with 2 stars.' },
  grundwissen:  { name: 'Basic Knowledge',    cost: 3, req: ['forschergeist'], fx: { freeRes: 2000 },    desc: 'All research up to 2,000 coins is known from the start.' },
  vorarbeiter:  { name: 'Foreman',            cost: 3, req: [],            fx: { mach: 0.15 },           desc: 'All machines work 15% faster, forever.' },
  welt_wueste:  { name: 'Desert License',     cost: 2, req: [],            fx: { biome: 'wueste' },      desc: 'Build your next factory in the desert.' },
  welt_eis:     { name: 'Ice License',        cost: 3, req: ['welt_wueste'], fx: { biome: 'eis' },       desc: 'Build your next factory on the ice.' },
  welt_mond:    { name: 'Moon License',       cost: 5, req: ['welt_eis'],  fx: { biome: 'mond' },        desc: 'Build your next factory on the Moon.' },
};
export const PATENT_IDS = Object.keys(PATENTS);

// ---------- Welten ----------
// deposits: Rohstoff → { thr: Schwelle des Rauschens (höher = seltener), scale: Fleckgröße, ring: erst ab diesem Grundstücksring }
export const BIOMES = {
  wiese: { name: 'Green Meadow', ground: '#7fb35a', sky: '#bfe3ff', beltMul: 1, drillMul: 1, valueMul: {},
    deposits: { stein: { thr: 0.73, scale: 5 }, eisenerz: { thr: 0.73, scale: 5 }, kupfererz: { thr: 0.74, scale: 5 }, kohle: { thr: 0.77, scale: 4 },
      sand: { thr: 0.75, scale: 5 }, kristall: { thr: 0.91, scale: 3, ring: 1 }, oel: { thr: 0.82, scale: 4, ring: 1 } },
    desc: 'Where every factory begins. Stone, iron, copper, coal and sand.' },
  wueste: { name: 'Desert', ground: '#e3c27a', sky: '#ffe2b0', beltMul: 1, drillMul: 1,
    valueMul: { glas: 1.5, linse: 1.5, fenster: 1.5, kunststoff: 1.5, akku: 1.5, solarpanel: 1.5, laser: 1.5 },
    deposits: { sand: { thr: 0.62, scale: 6 }, kupfererz: { thr: 0.72, scale: 5 }, oel: { thr: 0.73, scale: 5 }, stein: { thr: 0.77, scale: 5 },
      eisenerz: { thr: 0.77, scale: 4 }, kohle: { thr: 0.85, scale: 4 }, kristall: { thr: 0.93, scale: 3, ring: 1 } },
    desc: 'Lots of sand, copper and oil. Glass and oil products sell for 50% more.' },
  eis: { name: 'Ice World', ground: '#e8f2fa', sky: '#d4ecff', beltMul: 0.85, drillMul: 1, valueMul: { kristall: 2 },
    deposits: { eisenerz: { thr: 0.69, scale: 5 }, kohle: { thr: 0.71, scale: 5 }, kristall: { thr: 0.79, scale: 4 }, stein: { thr: 0.77, scale: 5 },
      kupfererz: { thr: 0.77, scale: 5 }, sand: { thr: 0.81, scale: 4 }, oel: { thr: 0.87, scale: 4, ring: 1 } },
    desc: 'Iron, coal and crystal. Belts are a bit slower in the cold, crystal is worth double.' },
  mond: { name: 'Moon', ground: '#9a9aa2', sky: '#0b0d1a', beltMul: 1, drillMul: 1.3, valueMul: {},
    deposits: { kristall: { thr: 0.75, scale: 4 }, titanerz: { thr: 0.71, scale: 5 }, stein: { thr: 0.71, scale: 5 }, eisenerz: { thr: 0.79, scale: 4 },
      kupfererz: { thr: 0.79, scale: 4 }, sand: { thr: 0.81, scale: 4 }, kohle: { thr: 0.87, scale: 3 }, oel: { thr: 0.89, scale: 3, ring: 1 } },
    desc: 'Crystal and titanium. Low gravity makes drills 30% faster.' },
};
export const BIOME_IDS = Object.keys(BIOMES);

// ---------- Kisten ----------
export const CRATES = {
  geld:      { name: 'Money Bag',       w: 40, desc: 'A sack of coins.' },
  turbo:     { name: 'Turbo',           w: 8,  secs: 60, desc: 'Everything runs twice as fast for 1 minute.' },
  gutschein: { name: 'Research Voucher',w: 14, desc: 'Your next research costs 50% less.' },
  farbe:     { name: 'Belt Color',      w: 12, desc: 'A new color for your belts.' },
  goldregen: { name: 'Gold Rain',       w: 8,  n: 10, desc: 'The next 10 mined parts are golden.' },
  patent:    { name: 'Patent',          w: 2,  desc: 'A free patent point!' },
};
export const CRATE_IDS = Object.keys(CRATES);

// ---------- Bandfarben und Titel (Deko, bleibt über Prestige) ----------
export const COLORS = {
  standard: { name: 'Factory Gray', color: '#3b3f46' },
  rot:      { name: 'Signal Red',   color: '#b8352e' },
  blau:     { name: 'Ocean Blue',   color: '#2e5fb8' },
  gruen:    { name: 'Moss Green',   color: '#3f8a3a' },
  lila:     { name: 'Plum',         color: '#7a3fa0' },
  orange:   { name: 'Safety Orange',color: '#e07a1f' },
  mint:     { name: 'Mint',         color: '#5fc8a8' },
  rosa:     { name: 'Bubblegum',    color: '#e87aa8' },
  schwarz:  { name: 'Midnight',     color: '#1a1b20' },
  gold:     { name: 'Pure Gold',    color: '#e8b931' },
};
export const COLOR_IDS = Object.keys(COLORS);
export const TITLES = {
  lehrling:   { name: 'Apprentice' },
  meister:    { name: 'Master of Belts' },
  millionaer: { name: 'Millionaire' },
  alchemist:  { name: 'Alchemist' },
  baron:      { name: 'Land Baron' },
  schlangen:  { name: 'Belt Snake Charmer' },
  geraldfan:  { name: 'Gerald\'s Best Friend' },
  raketenbauer:{ name: 'Rocket Scientist' },
  haendler:   { name: 'Merchant' },
};
export const TITLE_IDS = Object.keys(TITLES);

// ---------- Erfolge ----------
// cond: { m: Kennzahl, n: Schwelle } (Kennzahlen siehe Factory.metric), reward: money | color | title | start | crate
export const ACHIEVEMENTS = {
  erste_muenze: { name: 'First Coin',          cond: { m: 'sold', n: 1 },          reward: { money: 25 },        desc: 'Sell your first part.' },
  hundert:      { name: 'Hundred Club',        cond: { m: 'sold', n: 100 },        reward: { color: 'rot' },     desc: 'Sell 100 parts.' },
  zehntausend:  { name: 'Mass Production',     cond: { m: 'sold', n: 10000 },      reward: { title: 'meister' }, desc: 'Sell 10,000 parts.' },
  reich1:       { name: 'Pocket Money',        cond: { m: 'earned', n: 1000 },     reward: { start: 100 },       desc: 'Earn 1,000 coins in one factory.' },
  reich2:       { name: 'Serious Business',    cond: { m: 'earned', n: 100000 },   reward: { crate: 1 },         desc: 'Earn 100,000 coins in one factory.' },
  millionaer:   { name: 'Millionaire',         cond: { m: 'earned', n: 1000000 },  reward: { title: 'millionaer' }, desc: 'Earn 1,000,000 coins in one factory.' },
  gold1:        { name: 'Gold Digger',         cond: { m: 'gold', n: 1 },          reward: { crate: 1 },         desc: 'Mine a golden part.' },
  gold50:       { name: 'Golden Touch',        cond: { m: 'gold', n: 50 },         reward: { color: 'gold' },    desc: 'Mine 50 golden parts.' },
  entdecker:    { name: 'Eureka!',             cond: { m: 'found', n: 1 },         reward: { crate: 1 },         desc: 'Discover a secret recipe.' },
  alchemist:    { name: 'Alchemist',           cond: { m: 'found', n: 12 },        reward: { title: 'alchemist' }, desc: 'Discover every secret recipe.' },
  pechvogel:    { name: 'Back to the Drawing Board', cond: { m: 'fails', n: 10 },  reward: { money: 500 },       desc: 'Make scrap 10 times.' },
  auftrag1:     { name: 'Signed and Delivered',cond: { m: 'contracts', n: 1 },     reward: { crate: 1 },         desc: 'Complete a contract.' },
  auftrag25:    { name: 'Reliable Supplier',   cond: { m: 'contracts', n: 25 },    reward: { color: 'blau' },    desc: 'Complete 25 contracts.' },
  taeglich:     { name: 'Daily Grind',         cond: { m: 'daily', n: 1 },         reward: { crate: 1 },         desc: 'Complete a daily contract.' },
  land1:        { name: 'More Room',           cond: { m: 'plots', n: 2 },         reward: { money: 200 },       desc: 'Buy a plot of land.' },
  land10:       { name: 'Land Baron',          cond: { m: 'plots', n: 10 },        reward: { title: 'baron' },   desc: 'Own 10 plots.' },
  stern5:       { name: 'Old Faithful',        cond: { m: 'maxLevel', n: 5 },      reward: { color: 'gruen' },   desc: 'Raise a machine to 5 stars.' },
  baender100:   { name: 'Belt Fan',            cond: { m: 'belts', n: 100 },       reward: { money: 300 },       desc: 'Have 100 belts.' },
  baender1000:  { name: 'Belt Snake Charmer',  cond: { m: 'belts', n: 1000 },      reward: { title: 'schlangen' }, desc: 'Have 1,000 belts.' },
  maschinen25:  { name: 'Industrial Park',     cond: { m: 'machines', n: 25 },     reward: { crate: 1 },         desc: 'Have 25 machines.' },
  takt:         { name: 'In the Groove',       cond: { m: 'taktMax', n: 1 },       reward: { color: 'orange' },  desc: 'Get a sell station to full rhythm.' },
  gerald1:      { name: 'Hello Gerald',        cond: { m: 'gerald', n: 1 },        reward: { money: 100 },       desc: 'Click Gerald the intern.' },
  gerald25:     { name: 'Gerald\'s Best Friend', cond: { m: 'gerald', n: 25 },     reward: { title: 'geraldfan' }, desc: 'Click Gerald 25 times.' },
  forschung10:  { name: 'Curious',             cond: { m: 'research', n: 10 },     reward: { crate: 1 },         desc: 'Finish 10 research projects.' },
  prestige1:    { name: 'Fresh Start',         cond: { m: 'prestiges', n: 1 },     reward: { start: 1000 },      desc: 'Open a new factory.' },
  roboter:      { name: 'Hello, Robot',        cond: { m: 'made_roboter', n: 1 },  reward: { color: 'lila' },    desc: 'Build a robot.' },
  rakete:       { name: 'Liftoff',             cond: { m: 'made_rakete', n: 1 },   reward: { title: 'raketenbauer' }, desc: 'Build a rocket.' },
  kisten:       { name: 'Crate Collector',     cond: { m: 'crates', n: 25 },       reward: { color: 'mint' },    desc: 'Open 25 crates.' },
};
export const ACHIEVEMENT_IDS = Object.keys(ACHIEVEMENTS);

// ---------- Anleitung (Schritte, Fortschritt in S.tut) ----------
// done: Kennzahl ≥ n (siehe Factory.metric)
export const TUTORIAL = [
  { id: 'drill',    done: { m: 'drills', n: 1 },       target: 'bohrer',  text: 'Place a drill on a stone or iron deposit.' },
  { id: 'belt',     done: { m: 'sold', n: 1 },         target: 'band',    text: 'Drag belts from the drill\'s front to the sell station.' },
  { id: 'drill2',   done: { m: 'drills', n: 2 },       target: 'bohrer',  text: 'Place a second drill.' },
  { id: 'smelter',  done: { m: 'made_eisenbarren', n: 1 }, target: 'ofen', text: 'Put a smelter between an iron drill and the sell station: bars are worth four times as much as ore.' },
  { id: 'research', done: { m: 'research', n: 1 },     target: 'research', text: 'Open research and unlock something new.' },
  { id: 'contract', done: { m: 'contracts', n: 1 },    target: 'contracts', text: 'Complete a contract for a crate.' },
  { id: 'plot',     done: { m: 'plots', n: 2 },        target: 'plots',   text: 'Buy a neighboring plot to find new deposits.' },
  { id: 'rhythm',   done: { m: 'taktMax', n: 1 },      target: 'verkauf', text: 'Keep parts arriving at least every 2 seconds: the rhythm doubles your price.' },
];

// ---------- Aufträge ----------
export const CONTRACT = { slots: 3, minSecs: 180, maxSecs: 360, minN: 15, rewardMul: 1, minReward: 30, dailyMul: 4, delay: 60 };   // delay: Sekunden bis zum nächsten Auftrag im Platz

// ---------- Sprechblasen (Texte in lang/*.js, hier nur die Schlüssel) ----------
export const GERALD_LINES = ['hi', 'lunch', 'shortcut', 'oops', 'coffee', 'belt', 'boss', 'shiny'];
export const STEVE_LINES = ['hmm', 'science', 'tip', 'eureka', 'coffee', 'explode'];
