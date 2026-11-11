const CFG = { dur: 9, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'blue', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.2, coverT: 1.2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', gore: 'blood' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'falls *test*', big: true, instant: true }];
const CAM = [
  ...shot('mid', 0, 3.2, [1.5, 1.6, 0], { az: 20, dist: 11, h: 1.2, fov: 48, move: 'static', tr: 'cut' }),
  ...shot('mid', 3.2, 2.6, [-4, 0.8, 0], { az: 60, dist: 7, h: 1, fov: 46, move: 'static', tr: 'cut' }),
  ...shot('wide', 5.8, 3.2, [12, 0.5, 0], { az: 35, dist: 16, h: 6, fov: 48, move: 'static', tr: 'cut' })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'Falls test';
const STATS = [];
const END = { t: 8.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 9, 'farm', 0.5]] };
const THUMB = { t: 1.2, text: '*Falls* test' };
