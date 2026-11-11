const CFG = { dur: 20, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'cyan', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  ...shot('mid', 0, 3.00, [0, 2.2, -2.2], { az: 0, dist: 26, h: 0.15, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 3.0, 1.50, [20, 1.0, 0.3], { az: 40, dist: 3.6, h: 0.2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 4.5, 1.50, [38, 1.2, 0], { az: 25, dist: 16, h: 0.35, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 6.0, 1.50, [50, 1.5, 0], { az: 90, dist: 8, h: 0.1, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 7.5, 2.00, [60, 3.2, 4], { az: 55, dist: 11, h: 0.15, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 9.5, 1.00, [0, 1.5, 0], { az: 0, dist: 34, h: 0.25, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 10.5, 1.00, [70, 0.85, 0], { az: 20, dist: 1.0, h: 0.35, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 11.5, 2.00, [80.5, 0.9, 0], { az: 15, dist: 10, h: 0.25, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 13.5, 1.00, [90, 1.5, 0], { az: 0, dist: 2.6, h: 0.05, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 14.5, 2.00, [100, 1.4, 0], { az: 0, dist: 4, h: 0.05, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 16.5, 1.00, [110, 1.6, 0], { az: 0, dist: 6, h: 0.05, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 17.5, 2.50, [0, 2, 0], { az: 0, dist: 30, h: 0.3, fov: 40, move: 'static', tr: 'cut' }),
];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Crowd & physics test', STATS = [];
const END = { t: 19.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'epic', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Test*' };
