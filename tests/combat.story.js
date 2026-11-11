const CFG = { dur: 26, seed: 3, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.2, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'combat *test*', big: true, instant: true }];
const CAM = [
  ...shot('mid', 0.4, 4.6, [0, 1.2, 0], { az: 20, dist: 6.5, h: 0.6, fov: 46, move: 'static', tr: 'cut' }),
  ...shot('mid', 5.0, 3.6, [40, 1.3, 0.3], { az: 215, dist: 4.6, h: 0.4, fov: 46, move: 'static', tr: 'cut' }),
  ...shot('mid', 8.6, 2.4, [78.5, 1.3, -0.6], { az: 75, dist: 4.6, h: 0.3, fov: 46, move: 'static', tr: 'cut' }),
  ...shot('mid', 11.0, 2.0, [81.2, 1.3, -0.4], { az: 290, dist: 4.6, h: 0.3, fov: 46, move: 'static', tr: 'cut' }),
  ...shot('mid', 13.0, 5.5, [121, 1.6, 2], { az: 45, dist: 15, h: 2, fov: 48, move: 'static', tr: 'cut' }),
  ...shot('mid', 18.5, 6, 'jet', { az: 140, dist: 26, h: 3, fov: 50, move: 'static', tr: 'cut' })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'Combat test';
const STATS = [];
const END = { t: 25.5, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'action', music: 0.25, sfx: 1, hits: [] };
const THUMB = { t: 3.4, text: '*Test*' };
