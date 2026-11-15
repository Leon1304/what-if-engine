const CFG = { dur: 9, seed: 11, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'blue', filter: 'film', grain: 0.03, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: "roads", big: true, instant: true }];
const CAM = [
  { t: 0, p: [1.2, 7.5, 10], l: [0, 0, -1], fov: 50 },
  { t: 3, p: [36, 16, -22], l: [78, 3, 12], fov: 50, cut: true, tr: 'cut' },
  { t: 6, p: [0.8, 2.6, 12.5], l: [2.6, 0.2, 3.5], fov: 55, cut: true, tr: 'cut' }
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, "day"], [5.9, "night"]];
const PHASES = t => 'Env';
const STATS = [];
const END = { t: 8.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 9, 'city', 0.5]] };
const THUMB = { t: 1.2, text: '*Road* test' };
