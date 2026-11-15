// v3.37 asteroidImpact(): rock with plasma trail → flash, fireball, crater, dust wall racing through a small city (towers collapse as it arrives), mushroom cloud
const CFG = { dur: 12, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.045, vignette: 0.4, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 80, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.5, coverT: 2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', gore: 'goo', mini: { amount: 0 } };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'impact', big: true, instant: true }];
const CAM = [
  ...shot('wide', 0, 3, [0, 60, -60], { az: 120, dist: 170, h: 30, fov: 50, move: 'static' }),   // from the side: the rock comes in over the city
  ...shot('mini', 3, 5, [0, 0, -30], { az: 20, dist: 160, h: 130, fov: 40 }),   // toy-model view of the front going through the city
  ...shot('wide', 8, 4, [0, 50, -40], { az: 25, dist: 260, h: 30, fov: 45, move: 'static' })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'Impact';
const STATS = [];
const END = { t: 11.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 12, 'city', 0.4]] };
const THUMB = { t: 5, text: '*Impact*', mini: 1 };
