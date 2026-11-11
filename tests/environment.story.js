const CFG = { dur: 9, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'blue', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.2, coverT: 1.2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', gore: 'blood' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: "environment", big: true, instant: true }];
const CAM = [
  ...shot('wide', 0, 3, [0, 1.5, 0], { az: 30, dist: 46, h: 16, fov: 50, move: 'static', tr: 'cut' }),
  ...shot('mid', 3, 3, [0, 1.3, 0], { az: 20, dist: 11, h: 1.7, fov: 50, move: 'static', tr: 'cut' }),
  ...shot('mid', 6, 3, [0, 1.6, 0], { az: -150, dist: 16, h: 2.6, fov: 55, move: 'static', tr: 'cut' })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, "day"], [4.5, "dusk"], [7, "night"]];
const PHASES = t => 'Env';
const STATS = [];
const END = { t: 8.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 9, 'farm', 0.5]] };
const THUMB = { t: 1.2, text: '*Hitbox* test' };
