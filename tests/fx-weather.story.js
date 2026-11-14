const CFG = { dur: 9, seed: 11, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'blue', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.2, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'weather', big: true, instant: true }];
const CAM = [
  ...shot('wide', 0, 3, [0, 3, -10], { az: 10, dist: 30, h: 4, fov: 55, move: 'static', tr: 'cut' }),
  ...shot('wide', 3, 3, [0, 4, 0], { az: -75, dist: 26, h: 3, fov: 55, move: 'static', tr: 'cut' }),
  ...shot('wide', 6, 3, [0, 5, 50], { az: 180, dist: 40, h: 6, fov: 55, move: 'static', tr: 'cut' })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'storm'], [3, 'day']];
const PHASES = t => 'Weather';
const STATS = [];
const END = { t: 8.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 9, 'farm', 0.4]] };
const THUMB = { t: 1.0, text: '*Storm* test' };
