const CFG = { dur: 9, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.2, coverT: 1.2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'fire and blast', big: true, instant: true }];
const CAM = [
  ...shot('mid', 0, 3, [0, 1.6, 0], { az: 25, dist: 13, h: 3.5, fov: 50, move: 'static', tr: 'cut' }),
  ...shot('wide', 3, 3, [10, 1, -2], { az: 15, dist: 22, h: 6, fov: 50, move: 'static', tr: 'cut' }),
  ...shot('wide', 6, 3, [-2, 2, -10], { az: -20, dist: 26, h: 7, fov: 52, move: 'static', tr: 'cut' })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'dusk']];
const PHASES = t => 'FX';
const STATS = [];
const END = { t: 8.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 9, 'farm', 0.4]] };
const THUMB = { t: 1.2, text: '*Fire* test' };
