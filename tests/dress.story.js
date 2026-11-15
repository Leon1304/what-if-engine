const CFG = { dur: 9, seed: 11, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: 40, handheld: 0.2, coverT: 7.5, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: '*dress* suburb-winter', big: true, instant: true }];
const CAM = [   // 0–3 close-up on the walker · 3–6 wide over the street · 6–9 mid on the neighbour at the door
  ...shot('close', 0, 3, 'walker', { az: 35, dist: 3.4 }),
  ...shot('wide', 3, 3, [0, 0, -1], { az: 20, dist: 26, h: 9 }),
  ...shot('mid', 6, 3, 'neighbour', { az: -25, dist: 5.5, h: 1.2 })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'dress() test';
const STATS = [];
const END = { t: 8.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 9, 'wind', 0.3]] };
const THUMB = { t: 7.5, text: '*Dressed* street' };
