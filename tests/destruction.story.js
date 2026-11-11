const CFG = { dur: 9, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'blue', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.2, coverT: 1.2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', gore: 'blood' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'destruction', big: true, instant: true }];
const CAM = [
  ...shot('wide', 0, 3.2, [-2, 4, 0], { az: 25, dist: 34, h: 9, fov: 50, move: 'static', tr: 'cut' }),
  ...shot('wide', 3.2, 2.2, [24, 7, -6], { az: 20, dist: 44, h: 10, fov: 50, move: 'static', tr: 'cut' }),
  ...shot('wide', 5.4, 3.6, [58, 1.2, 12], { az: 20, dist: 16, h: 4.5, fov: 50, move: 'static', tr: 'cut' })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'Env';
const STATS = [];
const END = { t: 8.95, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 9, 'farm', 0.5]] };
const THUMB = { t: 1.2, text: '*Hitbox* test' };
