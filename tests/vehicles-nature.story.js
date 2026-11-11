const CFG = { dur: 18, seed: 3, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  ...shot('mid', 0, 2.50, 'b1', { az: 90, dist: 4, h: 0.3, dy: 1, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 2.5, 1.00, 'b2', { az: 60, dist: 6, h: 0.5, dy: 1, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 3.5, 1.00, 'b3', { az: 90, dist: 4, h: 0.3, dy: 1, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 4.5, 1.00, 'b4', { az: 90, dist: 3.5, h: 0.3, dy: 0.9, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 5.5, 1.50, [-45, 2.5, 40], { az: 30, dist: 40, h: 3, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 7, 1.00, [45, 3, 52], { az: 30, dist: 25, h: 2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 8, 2.80, [200, 6, 2], { az: 45, dist: 24, h: 2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 10.8, 0.40, [215, 1.6, -2], { az: 180, dist: 9, h: 0.4, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 11.2, 0.60, [231, 2.5, 3], { az: 40, dist: 14, h: 1, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 11.8, 0.60, [250, 14, -6], { az: 30, dist: 45, h: 0, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 12.4, 0.60, 'mt', { az: 70, dist: 14, h: 1, dy: 2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 13, 0.60, [293, 17, -3], { az: 20, dist: 35, h: 0, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 13.6, 0.80, [400, 30, -80], { az: 0, dist: 170, h: 20, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 14.4, 0.80, [505, 25, -25], { az: 10, dist: 90, h: 0, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 15.2, 0.60, [600, 5, -25], { az: 30, dist: 60, h: 10, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 15.8, 0.60, [700, 1, 0], { az: 0, dist: 20, h: 6, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 16.4, 0.60, [800, 6, 3], { az: 0, dist: 26, h: 1, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 17.0, 0.50, [847, 1, 0], { az: 0, dist: 34, h: 14, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 17.5, 0.50, [900, 2, 0], { az: 10, dist: 12, h: 0.5, fov: 40, move: 'static', tr: 'cut' })];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Action test', STATS = [];
const END = { t: 17.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'epic', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Test*' };

