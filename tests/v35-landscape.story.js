const CFG = { dur: 12, seed: 11, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'blue', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.2, coverT: 1.2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', gore: 'blood' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: "landscape", big: true, instant: true }];
const CAM = [
  ...shot('wide', 0, 3, [0, 1.5, 4], { az: 195, dist: 44, h: 12, fov: 50, move: 'static', tr: 'cut' }),
  ...shot('mid', 3, 3, [-0.75, 1, 6], { az: 0, dist: 7, h: 0.9, fov: 60, move: 'static', tr: 'cut' }),
  ...shot('mid', 6, 3, [0, 4, -60], { az: 0, dist: 70, h: 1.5, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 9, 3, [0, 40, -200], { az: 0, dist: 210, h: -32, fov: 26, move: 'static', tr: 'cut' })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day'], [4.5, 'day'], [6.5, 'dusk'], [9.5, 'night']];
const PHASES = t => 'Land';
const STATS = [];
const END = { t: 11.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 12, 'farm', 0.5]] };
const THUMB = { t: 1.2, text: '*Landscape* test' };
