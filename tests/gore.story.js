const CFG = { dur: 10, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'red', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.2, coverT: 2.6, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', gore: 'blood' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'gore *test*', big: true, instant: true }];
const CAM = [
  ...shot('mid', 0, 5.8, [0, 1.0, -1.5], { az: 25, dist: 11, h: 1.5, fov: 48, move: 'static', tr: 'cut' }),
  ...shot('mid', 5.8, 4.2, [3.4, 1.0, 0], { az: 10, dist: 6.5, h: 0.8, fov: 46, move: 'static', tr: 'cut' })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'Gore test';
const STATS = [];
const END = { t: 9.5, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 10, 'farm', 0.5]] };
const THUMB = { t: 2.6, text: '*Gore* test' };
