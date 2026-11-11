const CFG = { dur: 15, seed: 3, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  ...shot('mid', 0, 1.00, [2.5, 1.4, 0], { az: 0, dist: 7, h: 0.2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 1.0, 0.50, [0, 0.05, 3.2], { az: 0, dist: 1.0, h: 0.4, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 1.5, 1.00, [10, 1.0, 0], { az: 20, dist: 4, h: 0.3, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 2.5, 0.70, [14, 0.2, 1.5], { az: 60, dist: 3.5, h: 0.6, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 3.2, 0.80, [19.5, 0.2, 1.5], { az: 40, dist: 3, h: 0.5, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 4.0, 0.80, [14.6, 0.25, 3], { az: 70, dist: 1.8, h: 0.2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 4.8, 1.00, [60, 8, 12], { az: 20, dist: 60, h: 4, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 5.8, 0.60, [100, 8, 7], { az: 0, dist: 45, h: 0, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 6.4, 0.60, [140, 3, 9], { az: 0, dist: 35, h: 0, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 7.0, 0.60, [-60, 3, 0], { az: 30, dist: 30, h: 2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 7.6, 0.70, [-100, 1.6, 33], { az: 0, dist: 7, h: 0.3, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 8.3, 0.50, [-100, 5, 2], { az: 0, dist: 32, h: 0, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 8.8, 0.50, [-140, 1.5, 0], { az: 0, dist: 8, h: 0.5, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 9.3, 0.50, [-180, 2, 0], { az: 20, dist: 24, h: 2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 9.8, 0.40, [0, 15, -150], { az: 20, dist: 130, h: 10, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 10.2, 0.40, [30, 1.5, 30], { az: 0, dist: 1.0, h: 0, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 10.6, 0.60, [33, 0.9, 30], { az: 0, dist: 1.6, h: 0.5, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 11.2, 0.80, [40, 1.0, 26], { az: 60, dist: 9, h: 1, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 12.0, 0.80, [52, 2, 30], { az: 0, dist: 10, h: 0.5, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 12.8, 0.80, [63.2, 1.1, 30], { az: 0, dist: 8, h: 0.2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 13.6, 1.40, [61.6, 1.2, 30], { az: 30, dist: 3.5, h: 0.2, fov: 40, move: 'static', tr: 'cut' })];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Action test', STATS = [];
const END = { t: 14.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'epic', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Test*' };

