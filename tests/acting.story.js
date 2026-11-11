const CFG = { dur: 14.5, seed: 3, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  ...shot('mid', 0, 1.20, [2.25, 1.2, 0], { az: 0, dist: 12, h: 0.2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 1.2, 1.00, [0.45, 1.4, 0], { az: 0, dist: 2.4, h: 0.1, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 2.2, 1.00, [17.8, 0.7, 3], { az: 0, dist: 9, h: 0.5, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 3.2, 1.00, [40, 1.8, -0.3], { az: 50, dist: 4, h: 0.2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 4.2, 1.00, [44, 1.2, -1], { az: 90, dist: 6, h: 0.5, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 5.2, 1.00, [61, 0.6, 4], { az: 0, dist: 15, h: 0.5, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 6.2, 0.80, [82.25, 1.1, 0], { az: 0, dist: 12, h: 0.2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 7.0, 0.45, [100.7, 1.3, 0], { az: 0, dist: 4, h: 0.1, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 7.45, 0.35, [103.7, 1.4, 0], { az: 0, dist: 4, h: 0.1, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 7.8, 0.40, [107.05, 1.3, 0], { az: 0, dist: 4, h: 0.1, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 8.2, 0.40, [118, 1.3, 0.6], { az: 90, dist: 5, h: 0.2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 8.6, 0.30, [124.8, 1.0, 0], { az: 0, dist: 5, h: 0.2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 8.9, 0.30, [127.6, 1.4, 0], { az: 0, dist: 4, h: 0.1, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 9.2, 0.40, [140.3, 0.8, 0.15], { az: 0, dist: 3.5, h: 0.3, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 9.6, 0.40, [144, 1.2, 0.7], { az: 90, dist: 4, h: 0.2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 10.0, 0.60, [151, 1.0, 0], { az: 90, dist: 8, h: 0.4, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 10.6, 0.40, [152, 0.6, 1], { az: 0, dist: 8, h: 0.4, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 11.0, 0.30, [158, 1.7, 0], { az: 20, dist: 3, h: 0.1, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 11.3, 0.40, [180.9, 1.6, 0], { az: 0, dist: 3.2, h: 0.1, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 11.7, 0.60, [183.6, 1.5, 0], { az: 0, dist: 10, h: 0.2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 12.3, 0.70, [201, 1.3, 0], { az: 0, dist: 5, h: 0.1, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 13.0, 0.50, [206.65, 1.2, 0], { az: 0, dist: 12, h: 0.2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 13.5, 1.00, [230, 0.6, 1], { az: 20, dist: 10, h: 1.5, fov: 40, move: 'static', tr: 'cut' })];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Action test', STATS = [];
const END = { t: 14.4, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'epic', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Test*' };

