const CFG = { dur: 12, seed: 3, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  ...shot('mid', 0.0, 1.0, [0, 4, 3], { az: 90, dist: 30, h: 0.3, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 1.0, 1.0, [40, 2.5, 1], { az: 70, dist: 13, h: 0.3, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 2.0, 1.0, [80, 3, 2], { az: 60, dist: 16, h: 0.3, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 3.0, 1.0, [120, 2.5, 0], { az: 90, dist: 16, h: 0.3, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 4.0, 1.0, [160, 3, 4], { az: 90, dist: 22, h: 0.3, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 5.0, 1.0, 'dg', { az: 90, dist: 22, h: 0.3, dy: 1, fov: 45, move: 'static', tr: 'cut' }),
  ...shot('mid', 6.0, 1.0, 'rx', { az: 90, dist: 18, h: 0.3, dy: 3, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 7.0, 1.0, 'rp', { az: 90, dist: 7, h: 0.3, dy: 0.8, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 8.0, 4.0, [200, 2.5, 6], { az: 90, dist: 18, h: 0.3, fov: 40, move: 'static', tr: 'cut' })];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Action test', STATS = [];
const END = { t: 11.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'epic', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Test*' };

