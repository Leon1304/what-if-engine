const CFG = {
  dur: 341.5, seed: 11, locale: 'en-US', kind: 'explain', aspect: '16:9', badge: 'Explaining', accent: 'green',
  filter: 'film', grain: 0.04, vignette: 0.42, saturation: 0.94, contrast: 1.06,
  shadows: true, area: 60, renderScale: 1, msaa: 4, sunAz: -35, handheld: 0.45, coverT: 3,
  capPos: 'low', karaoke: false, subtitles: true, subWords: 16, wordRate: 0.085, voice: 'documentary',
  series: null, cast: {}, statStagger: 0.45, countUp: 0.9, transition: 'auto', loop: false, endDim: 0.3
};
const LIVE = {};

// ---- narration: [caption, spoken text (optional), extra beat fields] ----
const LINES = [
  // cold open
  ['June 6, 1944. Just after 6:30 in the morning, the ramps go down off the coast of Normandy.', 'June sixth, nineteen forty-four. Just after six thirty in the morning, the ramps go down off the coast of Normandy.', { kick: 'Normandy, France' }],
  ['By midnight, about 156,000 Allied soldiers will be ashore on five beaches.', 'By midnight, about a hundred and fifty-six thousand Allied soldiers will be ashore on five beaches.'],
  ['It is the largest invasion ever launched from the sea. This is *D-Day.* Why did it happen, and what happened that day?', 'It is the largest invasion ever launched from the sea. This is D-Day. Why did it happen, and what happened that day?', { kick: 'D-Day · 6 June 1944' }],
  // 1 why
  ['By 1944, Nazi Germany had occupied France and most of Western Europe for four years.', 'By nineteen forty-four, Nazi Germany had occupied France and most of Western Europe for four years.'],
  ['Britain held out across the English Channel, but it could not free the continent on its own.'],
  ['In the east, Germany had invaded the Soviet Union in 1941. That front swallowed millions of soldiers.', 'In the east, Germany had invaded the Soviet Union in nineteen forty-one. That front swallowed millions of soldiers.'],
  ['Soviet leader Joseph Stalin kept demanding a *second front* in the west, to pull German divisions away from his.'],
  ['Once the United States joined the war, the Allies finally had the men, the ships and the factories to try.'],
  ['At the Tehran Conference in late 1943, the Allied leaders agreed to invade northern France the following year.', 'At the Tehran Conference in late nineteen forty-three, the Allied leaders agreed to invade northern France the following year.'],
  ['The plan was code-named *Operation Overlord.* Its goal: land in France, free it, and push on toward Germany.'],
  // 2 the wall
  ['Germany knew an invasion was coming. Along the coast it built the *Atlantic Wall:* bunkers, guns, mines and barbed wire.'],
  ['On the beaches stood thousands of obstacles: steel hedgehogs, wooden stakes topped with mines, and log ramps meant to tear open landing boats.'],
  ['Most German commanders expected the attack where the Channel is narrowest, near Calais, only about 30 kilometers from England.', 'Most German commanders expected the attack where the Channel is narrowest, near Calais, only about thirty kilometers from England.'],
  // 3 the trick
  ['The Allies picked *Normandy* instead. It was less heavily defended, within range of fighter planes from England, and close to the port of Cherbourg.'],
  ['Then they set out to convince Germany of the opposite. In southeast England, they built an army that did not exist.'],
  ['Inflatable rubber tanks, fake landing craft, empty camps and a stream of fake radio messages all pointed at Calais.'],
  ['It worked. Even after the landings began, strong German forces waited near Calais for an attack that never came.'],
  // 4 the weather
  ['The invasion was set for June 5th. But a storm swept across the Channel.', 'The invasion was set for June fifth. But a storm swept across the Channel.', { tone: 'tense' }],
  ['The chief weather forecaster, James Stagg, predicted a short break. General Dwight Eisenhower delayed by one day, then gave the order to go.'],
  ['Waiting longer would have cost weeks, and an even worse storm hit the Channel later that month.'],
  // 5 the night
  ['Shortly after midnight, the invasion began from the air. About 24,000 airborne troops flew toward Normandy in the dark.', 'Shortly after midnight, the invasion began from the air. About twenty-four thousand airborne troops flew toward Normandy in the dark.'],
  ['Paratroopers jumped behind the beaches to seize bridges and crossroads. Many landed miles from where they were meant to.'],
  ['Glider troops landed right next to a bridge over the Caen Canal and captured it within minutes.'],
  ['Out at sea, nearly 7,000 ships and boats were already crossing the Channel.', 'Out at sea, nearly seven thousand ships and boats were already crossing the Channel.'],
  // 6 the landings
  ['At dawn, battleships opened fire on the coastal defenses, and bombers attacked from above.'],
  ['At 6:30, the first Americans landed at *Utah* and *Omaha.* About an hour later, British and Canadian troops landed at *Gold, Juno* and *Sword.*', 'At six thirty, the first Americans landed at Utah and Omaha. About an hour later, British and Canadian troops landed at Gold, Juno and Sword.'],
  ['At Utah, currents pushed the boats onto a less defended part of the beach. Losses there were relatively light.'],
  ['Omaha was the hardest. The bombs had missed many defenses, the sea was rough, and many amphibious tanks sank before reaching the shore.', null, { tone: 'tense' }],
  ['Soldiers had to cross hundreds of meters of open sand under fire from the bluffs. Around 2,400 Americans were killed or wounded there.', 'Soldiers had to cross hundreds of meters of open sand under fire from the bluffs. Around two thousand four hundred Americans were killed or wounded there.', { tone: 'sad' }],
  ['Small groups fought their way up the bluffs, and by nightfall the Americans held a narrow strip of land.'],
  ['To the west, Rangers climbed the 30-meter cliffs of Pointe du Hoc to reach the guns on top. The guns had been moved, but the Rangers found them inland and destroyed them.', 'To the west, Rangers climbed the thirty-meter cliffs of Pointe du Hoc to reach the guns on top. The guns had been moved, but the Rangers found them inland and destroyed them.'],
  ['On the British and Canadian beaches, troops pushed inland. The Canadians at Juno got further than anyone else that day.'],
  ['By midnight, about 156,000 Allied troops were in France. The *Atlantic Wall* had been broken.', 'By midnight, about a hundred and fifty-six thousand Allied troops were in France. The Atlantic Wall had been broken.'],
  // 7 the cost
  ['The price was high. More than 4,400 Allied soldiers were killed on D-Day itself, and at least 10,000 were killed, wounded or missing.', 'The price was high. More than four thousand four hundred Allied soldiers were killed on D-Day itself, and at least ten thousand were killed, wounded or missing.', { tone: 'sad' }],
  ['German losses are estimated at 4,000 to 9,000 men. Thousands of French civilians died in the fighting that followed.', 'German losses are estimated at four thousand to nine thousand men. Thousands of French civilians died in the fighting that followed.', { tone: 'sad' }],
  ['The battle for Normandy lasted until late August. On August 25th, 1944, *Paris* was liberated.', 'The battle for Normandy lasted until late August. On August twenty-fifth, nineteen forty-four, Paris was liberated.'],
  ['Less than a year after D-Day, Germany surrendered. The war in Europe ended in May 1945.', 'Less than a year after D-Day, Germany surrendered. The war in Europe ended in May nineteen forty-five.'],
  ['Today, the beaches are quiet again. The white markers above Omaha Beach show what that one day cost.', null, { tone: 'calm' }]
];
// seconds per beat (spoken length + breath) — from the voice table; est() fills gaps before the first voice pass
const DURS = [8.8, 6.9, 11.4, 7.3, 5.8, 8.5, 8.0, 7.2, 8.4, 8.7, 9.0, 10.0, 8.9, 9.7, 8.5, 8.1, 8.2, 6.2, 10.0, 6.5, 10.3, 8.4, 6.4, 6.2, 6.5, 10.4, 7.9, 9.6, 11.3, 6.9, 12.4, 8.4, 8.2, 12.4, 10.0, 8.5, 8.1, 9.0];
const est = s => s.split(/\s+/).length * 0.4 + (s.match(/[.?!:]/g) || []).length * 0.3 + 0.9;
const BEATS = []; { let t = 0.2; LINES.forEach(([text, say, x], i) => { const d = DURS[i] ?? est(say ?? text); BEATS.push({ t: +t.toFixed(2), dur: +(d - 0.2).toFixed(2), text, ...(say ? { say } : {}), ...(x ?? {}) }); t += d + (x?.pause ?? 0); }); }
const bt = i => BEATS[i].t, be = i => BEATS[i].t + BEATS[i].dur, bm = (i, k) => BEATS[i].t + BEATS[i].dur * k;

// ---- event times for the scene (the short sets its own) ----
const EV = {
  fleet: [[-1, be(2) + 0.3], [bt(17) - 0.3, be(17) + 0.3], [bt(19) - 0.3, be(19) + 0.3], [bt(23) - 0.3, be(32) + 0.3]],
  open: [0, be(2) + 0.3], land: [bt(24), be(31) + 0.3], landArrive: bt(26) + 0.5, heroArrive: bt(27) + 3.2, climb: bt(29) - 2, evening: [bt(32) - 0.2, be(32) + 0.3],
  cliff: [bt(30) - 0.3, be(30) + 0.3], inland: [bt(31) - 0.5, be(31) + 0.3], salvo: [bt(24) + 0.6, bt(24) + 3.4], bomb: bt(24) + 3.2,
  storm: [bt(17) - 0.2, be(19) + 0.2], lens: [[bt(17), be(17)], [bt(19), be(19)]], night: [bt(20) - 0.2, be(22) + 0.3], drop: bt(20) + 4.5, inflate: bt(14) + 1.6, push: bt(15) + 0.6, recon: bt(15) + 3.8, cem: bt(33) - 0.5,
  map: { occ: bt(3) + 0.8, brit: bt(4) + 0.5, east: bt(5) + 1.0, second: bt(6) + 1.6, ships: bt(7) + 0.4, tehran: bt(8) + 2.2, overlord: bt(9) + 0.8, calais: bt(12) + 2.0, normandy: bt(13) + 0.6,
    fake: bt(16) + 0.5, go: bt(18) + 5.5, beaches: bt(25) + 0.4, paris: bt(35) + 0.6, end: bt(36) + 0.6, hide1: be(9) + 0.3, hide2: be(16) + 0.3 }
};
// war maps (world placement shared with the scene)
const EUMAP = { x: 1996.6, z: 0.8, w: 4.8, top: 0.92, reg: [-8.5, 42.4, 14.6, 56.3] }, NMAP = { x: 2004.4, z: 0.6, w: 3.8, top: 0.92, reg: [-1.75, 49.08, 0.45, 49.8] };
const mapP = (M, lon, lat, dy = 0) => { const [a, b, c, d] = M.reg, H = M.w * (d - b) / ((c - a) * Math.cos((b + d) / 2 * Math.PI / 180)); return [M.x + ((lon - a) / (c - a) - 0.5) * M.w, M.top + 0.004 + dy, M.z + ((d - lat) / (d - b) - 0.5) * H]; };
const EU = (lo, la, dy) => mapP(EUMAP, lo, la, dy), NM = (lo, la, dy) => mapP(NMAP, lo, la, dy), MAPA = {};
const add = (P, dx, dy, dz) => [P[0] + dx, P[1] + dy, P[2] + dz];
// map shot: look at A → B (lon/lat), camera h m above the table, offset to the south
const mapShot = (t0, t1, MP, A, B, h0 = 1.6, h1 = 1.3, fov = 44, x = {}) => [{ t: t0, cut: true, p: add(MP(...A), 0.15, h0, h0 * 0.7), l: MP(...A), fov, ...x }, { t: t1, p: add(MP(...B), -0.1, h1, h1 * 0.7), l: MP(...B), fov: fov * 0.96, e: 'inOut' }];
const G3 = (x, z, dy) => () => [x, groundH(x, z) + dy, z];
const K = (t0, t1, p0, l0, p1, l1, fov = 46, x = {}) => [{ t: t0, cut: true, p: p0, l: l0, fov, ...x }, { t: t1, p: p1, l: l1, fov: x.fov1 ?? fov, e: x.e ?? 'inOut' }];

const CAM = [
  // cold open: behind the boat as the ramp drops → beach level → fleet → MG nest → crane
  ...K(0, 3.3, [9, 2.6, 92], [-6, 3.5, 38], [7, 2.4, 86], [-6, 3.5, 36], 48, { tr: 'cut' }),
  ...K(3.3, bm(0, 1) + 0.1, [-1.2, 0.9, 50.5], [-6, 1.5, 59.5], [-1.6, 1.0, 51.8], [-6, 1.4, 58.5], 50, { tr: 'whip' }),
  ...K(bt(1), bm(1, 0.62), [80, 26, 190], [0, 6, 25], [52, 24, 182], [0, 6, 22], 44),
  ...K(bm(1, 0.62), be(1) + 0.15, [59, 9.4, 9], [52, 7, 2], [60.5, 9.8, 7.4], [50, 6.4, 6], 44),
  ...K(bt(2), be(2) + 0.2, [12, 3, 80], [0, 8, 10], [22, 30, 108], [0, 6, 4], 44, { e: 'out' }),
  // 1 why — war room
  ...mapShot(bt(3), be(3), EU, [2.5, 47.4], [3.5, 49.6], 2.3, 2.0, 46),
  ...mapShot(bt(4), be(4), EU, [-2.4, 51.6], [-0.8, 51.2], 1.7, 1.4, 44),
  ...mapShot(bt(5), be(5), EU, [9.5, 51.2], [12.8, 51.6], 1.8, 1.6, 44),
  ...mapShot(bt(6), be(6), EU, [0.5, 50.2], [-0.8, 49.9], 2.0, 1.6, 44),
  ...mapShot(bt(7), be(7), EU, [-7.2, 49.2], [-3.2, 50.4], 1.3, 1.5, 46),
  ...K(bt(8), bm(8, 0.55), [2000.8, 2.5, 6.2], [2000.2, 1.0, 0], [2000.3, 2.3, 5.3], [2000, 1.0, 0], 50),
  ...mapShot(bm(8, 0.55), be(8), EU, [1.0, 52.6], [0.6, 51.4], 1.4, 1.2, 44),
  { t: bt(9), cut: true, p: add(EU(-1.2, 50.6), 0.4, 1.3, 1.0), l: EU(-1.0, 50.4), fov: 46 },
  { t: be(9), p: t => add(MAPA.over ? MAPA.over(t) : EU(1.5, 48.5), 0.3, 1.25, 1.0), l: t => MAPA.over ? MAPA.over(t) : EU(1.5, 48.5), fov: 44, e: 'lin' },
  // 2 the wall — empty beach by day
  ...K(bt(10), bm(10, 0.55), [-70, 13, 88], [-40, 9, 0], [-20, 14, 90], [-5, 9, 0], 44),
  ...shot('mid', bm(10, 0.55), be(10) - bm(10, 0.55), 'cas1', { az: 25, dist: 13, h: 2.5, dy: 2, fov: 46, move: 'push', tr: 'zoom' }),
  ...shot('close', bt(11), bm(11, 0.36) - bt(11), [-11, 0.9, 43], { az: 8, dist: 4.4, h: 0.4, fov: 40, move: 'push', tr: 'whip' }),
  ...shot('close', bm(11, 0.36), bm(11, 0.68) - bm(11, 0.36), 'stake', { az: 35, dist: 7, h: 0.6, dy: 1.6, fov: 42, move: 'push' }),
  ...shot('close', bm(11, 0.68), be(11) - bm(11, 0.68), 'ramp', { az: 70, dist: 5.6, h: 0.6, dy: 1.0, fov: 42, move: 'orbit', turn: 14 }),
  ...mapShot(bt(12), be(12), EU, [0.2, 50.4], [1.5, 51.0], 1.6, 1.0, 44),
  // 3 the trick
  ...mapShot(bt(13), be(13), EU, [-1.2, 50.5], [-1.0, 49.6], 1.5, 1.15, 44),
  ...K(bt(14), bm(14, 0.5), G3(186, -154, 7), G3(152, -192, 1), G3(180, -160, 5.5), G3(150, -194, 1), 44),
  ...K(bm(14, 0.5), be(14), G3(161, -177, 3.2), G3(149, -190, 1.3), G3(159, -179, 2.8), G3(149, -190, 1.3), 46),
  ...K(bt(15), bm(15, 0.55), G3(129, -197, 2.8), G3(133, -182, 1.3), G3(134, -198, 2.6), G3(140, -182, 1.3), 46, { tr: 'whip' }),
  ...K(bm(15, 0.55), be(15), G3(132, -217, 2.2), G3(144, -182, 26), G3(134, -216, 2.2), G3(156, -182, 42), 50),
  ...mapShot(bt(16), be(16), EU, [0.8, 50.6], [1.9, 50.9], 1.5, 1.1, 44),
  // 4 the weather
  ...K(bt(17), be(17), [44, 4.5, 262], [70, 4, 300], [46, 5.2, 266], [70, 5, 300], 46),
  ...K(bt(18), bm(18, 0.4), [2003.2, 1.9, 3.4], [2003.4, 1.6, -4.6], [2003.6, 1.8, 3.0], [2003.4, 1.7, -4.6], 46),
  ...mapShot(bm(18, 0.4), be(18), NM, [-0.9, 49.6], [-0.75, 49.42], 1.3, 0.95, 44),
  ...K(bt(19), be(19), [-20, 10, 250], [-90, 22, 430], [-10, 9, 240], [-90, 20, 430], 46),
  // 5 the night
  ...K(bt(20), bm(20, 0.5), G3(12, -212, 1.8), [0, 100, -120], G3(10, -214, 1.8), [-4, 112, -160], 58),
  ...K(bm(20, 0.5), be(20), [-40, 60, -150], [10, 120, -230], [-34, 64, -160], [10, 120, -250], 50),
  ...K(bt(21), bm(21, 0.55), [30, 40, -190], [0, 70, -250], [26, 30, -196], [0, 40, -250], 50),
  ...K(bm(21, 0.55), be(21), G3(-14, -205, 3), G3(0, -245, 14), G3(-12, -208, 2.6), G3(0, -245, 6), 48),
  ...K(bt(22), be(22), G3(36, -224, 2.4), G3(24, -238, 1.3), G3(34, -228, 2.0), G3(24, -238, 1.2), 46),
  ...K(bt(23), be(23), [10, 4, 150], [-60, 8, 330], [24, 4.4, 150], [-50, 8, 330], 46),
  // 6 the landings
  ...shot('mid', bt(24), bm(24, 0.5) - bt(24), [-90, 10, 430], { az: 245, dist: 95, h: 6, fov: 46, move: 'push' }),
  ...K(bm(24, 0.5), be(24), [30, 30, 60], [-10, 30, -60], [34, 26, 50], [-10, 22, -70], 50),
  ...mapShot(bt(25), be(25), NM, [-0.95, 49.45], [-0.6, 49.4], 2.1, 1.9, 48),
  ...shot('mid', bt(26), be(26) - bt(26), 'utah', { az: 30, dist: 15, h: 2.2, dy: 1.5, fov: 46, move: 'push', tr: 'whip' }),
  ...K(bt(27), bm(27, 0.45), [-18, 4.2, 96], [-4, 3.5, 38], [-16, 3.8, 90], [-4, 3.5, 36], 48),
  ...K(bm(27, 0.45), be(27), [24, 7, 70], [-10, 6, 20], [16, 6, 74], [-10, 6, 18], 46),
  ...K(bt(28), bm(28, 0.5), [-4.5, 1.0, 50], [-8, 1.0, 38], [-5, 0.95, 48.8], [-8, 1.0, 37], 44),
  ...shot('close', bm(28, 0.5), be(28) - bm(28, 0.5), 'cover', { az: 165, dist: 3.4, h: 0.15, dy: 0.7, fov: 40, move: 'push' }),
  ...K(bt(29), be(29), [14, 3, 46], [2, 8, -2], [10, 3.4, 42], [2, 10, -6], 50),
  ...K(bt(30), bm(30, 0.55), [-352, 3, 78], [-365, 16, 45], [-356, 3.4, 72], [-365, 18, 45], 48),
  ...shot('close', bm(30, 0.55), be(30) - bm(30, 0.55), 'ranger', { az: 20, dist: 4.2, h: -0.6, dy: 0.9, fov: 40, move: 'push' }),
  ...K(bt(31), be(31), [26, 20, -20], [6, 17, -48], [22, 19.5, -26], [4, 17, -56], 46),
  ...K(bt(32), be(32) + 0.2, [-30, 22, 110], [0, 4, 30], [-10, 26, 118], [0, 4, 28], 44),
  // 7 the cost
  ...K(bt(33), be(33), [-112, 18.8, -24], [-112, 17.6, -50], [-112, 18.6, -31], [-112, 17.5, -56], 44),
  ...K(bt(34), be(34), [-80, 24, -30], [-112, 17, -45], [-84, 30, -24], [-112, 17, -44], 46),
  ...mapShot(bt(35), be(35), EU, [0.0, 49.2], [2.2, 48.9], 1.5, 1.3, 44),
  ...mapShot(bt(36), be(36), EU, [4.5, 50.0], [9.5, 51.6], 1.9, 2.1, 46),
  ...K(bt(37), CFG.dur, [-112, 19, -62], [-112, 17.5, -40], [-112, 34, -78], [-112, 6, 60], 46, { e: 'inOut' })
];
const SLOWMO = [];
const SHAKES = [{ t: 2.4, amp: 0.18, dur: 0.6 }, { t: bt(24) + 3.6, amp: 0.25, dur: 0.8 }, { t: bt(28) + 1.2, amp: 0.3, dur: 0.6 }];
const FLASHES = [{ t: bt(17) + 1.2, dur: 0.25, a: 0.5 }, { t: bt(19) + 2.1, dur: 0.25, a: 0.45 }];
const SKY = [[0, 'dawn'], [bt(3) - 0.05, 'dawn'], [bt(3), 'day'], [bt(17) - 0.05, 'day'], [bt(17), 'storm'], [bt(18) - 0.05, 'storm'], [bt(18), 'night'], [bt(19) - 0.05, 'night'], [bt(19), 'storm'],
  [bt(20) - 0.05, 'storm'], [bt(20), 'night'], [bt(24) - 0.05, 'night'], [bt(24), 'dawn'], [bt(28), 'day'], [bt(32) - 0.05, 'day'], [bt(32), 'golden'], [CFG.dur, 'golden']];
const PHASES = t => 'June 6, 1944 · ' + clockText(t, 0, bt(3), '06:29', '06:41');
const STEPS = [[bt(3), 'Why'], [bt(10), 'The wall'], [bt(13), 'The trick'], [bt(17), 'The weather'], [bt(20), 'The night'], [bt(24), 'The landings'], [bt(33), 'The cost']];
const STATS = [
  { label: 'Year', type: 'timeline', from: 1939, to: 1945, fmt: 'year', marks: [[1940, 'France falls'], [1941, 'USSR invaded'], [1943, 'Tehran'], [1944, 'D-Day'], [1945, 'War ends']],
    keys: [[bt(3), 1940], [bt(5), 1940], [bt(5) + 1, 1941], [bt(7), 1941], [bt(7) + 1, 1942], [bt(8) + 1.5, 1943], [bt(9) + 1, 1944]], show: bt(3) + 0.3, hide: be(9) },
  { label: 'Troops ashore', keys: [[bt(25), 0], [bt(26) + 1, 0], [bt(27), 9000], [bt(29), 30000], [bt(31), 95000], [bt(32) + 2.5, 156000]], fmt: 'int', show: bt(25) + 0.5, hide: be(32), up: 'good', pop: false }
];
const FACTS = [
  { t: bt(1) + 1.0, dur: 4.2, big: '156,000', text: 'Allied troops landed on *June 6, 1944*', src: 'AP · History.com', count: true },
  { t: bt(20) + 2.2, dur: 4.0, big: '~24,000', text: 'airborne troops landed in the dark', src: 'History Hit · U.S. Army', count: true },
  { t: bt(23) + 0.6, dur: 4.0, big: '~7,000', text: 'ships and boats crossed the Channel', src: 'AP', count: true },
  { t: bt(33) + 1.8, dur: 5.5, big: '4,414', text: 'Allied soldiers confirmed dead on D-Day', src: 'National D-Day Memorial Foundation', count: true }
];
const END = { t: be(37) + 0.4, q: 'What surprised you most about *D-Day?*', opts: ['The rubber army', 'The one-day delay', 'The night jump'] };
const AUDIO = {
  score: [[0, 'none'], [bt(3), 'tense'], [bt(14), 'science'], [bt(16), 'tense'], [bt(17), 'none'], [bt(20), 'tense'], [bt(24), 'none'], [bt(32), 'epic'], [bt(33), 'sad']],
  music: 0.42, sfx: 0.9, ambVol: 0.8,
  amb: [[0, bt(3), 'battle', 1], [0, bt(3), 'surf', 0.6], [bt(3), bt(10), 'hq', 1], [bt(10), bt(12), 'surf', 1], [bt(12), bt(14), 'hq', 1], [bt(14), bt(16), 'farm', 1], [bt(16), bt(17), 'hq', 1],
    [bt(17), bt(18), 'storm', 1], [bt(18), bt(19), 'hq', 0.8], [bt(18), bt(19), 'rain', 0.5], [bt(19), bt(20), 'storm', 1], [bt(20), bt(23), 'planes', 1], [bt(20), bt(23), 'night', 0.6], [bt(23), bt(24), 'ocean', 1],
    [bt(24), bt(25), 'battle', 0.8], [bt(24), bt(25), 'ocean', 0.7], [bt(25), bt(26), 'hq', 0.8], [bt(26), bt(32), 'battle', 1], [bt(26), bt(32), 'surf', 0.6], [bt(32), bt(33), 'surf', 1],
    [bt(33), bt(35), 'wind', 0.6], [bt(33), bt(35), 'farm', 0.4], [bt(35), bt(37), 'hq', 0.8], [bt(37), CFG.dur, 'wind', 0.6], [bt(37), CFG.dur, 'surf', 0.5]],
  hits: [{ t: bt(3) + 2.2, k: 'typewriter', dur: 1.6, v: 0.6 }, { t: bt(8) + 0.6, k: 'typewriter', dur: 1.4, v: 0.6 }, { t: bt(15) + 1.5, k: 'morse', dur: 2.6, v: 0.8 }, { t: bt(18) + 0.3, k: 'morse', dur: 1.8, v: 0.5 },
    { t: bt(14) - 0.2, k: 'whoosh' }, { t: be(37), k: 'stinger', v: 0.5 }]
};
const THUMB = [
  { t: 4.6, text: 'Why *D-Day* happened', cam: { p: [-14.5, 1.4, 49.5], l: [-4.5, 2.0, 59], fov: 44 } },
  { t: bt(1) + 2.5, text: '*156,000* men. One day.', cam: { p: [70, 24, 180], l: [0, 6, 22], fov: 44 } }
];
