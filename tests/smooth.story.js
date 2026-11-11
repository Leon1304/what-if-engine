const CFG = { dur: 9, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'blue', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.2, coverT: 1.2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', gore: 'blood' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'smooth *test*', big: true, instant: true }];
const CAM = [
  ...shot('mid', 0, 4.5, [1.6, 1.1, 0], { az: 10, dist: 7, h: 1.6, fov: 46, move: 'static', tr: 'cut' }),
  ...shot('wide', 4.5, 4.5, [12, 0.8, 0], { az: 25, dist: 22, h: 12, fov: 48, move: 'static', tr: 'cut' })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'Smooth test';
const STATS = [];
const END = { t: 8.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 9, 'farm', 0.5]] };
const THUMB = { t: 1.2, text: '*Smooth* test' };
