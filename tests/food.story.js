const CFG = { dur: 12, seed: 3, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  ...shot('mid', 0, 0.40, [-0.36, 0.85, -0.18], { az: 0, dist: 1.1, h: 0.35, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 0.4, 0.40, [0.36, 0.85, -0.18], { az: 0, dist: 1.1, h: 0.35, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 0.8, 0.40, [-0.36, 0.85, 0.18], { az: 0, dist: 1.1, h: 0.35, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 1.2, 0.80, [0.1, 1.4, 12], { az: 0, dist: 1.4, h: 0.0, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 2.0, 3.00, [0.1, 1.4, 12], { az: 50, dist: 1.4, h: 0.0, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 5.0, 1.00, [0.1, 1.45, 12], { az: 30, dist: 1.4, h: 0.0, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 6.0, 1.00, [39.6, 1.0, 0], { az: 0, dist: 1.8, h: 0.5, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 7.0, 1.00, [51.6, 0.9, 0.5], { az: 20, dist: 4.5, h: 1.2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 8.0, 4.00, [53.1, 1.1, 1.2], { az: 60, dist: 2.2, h: 0.3, fov: 40, move: 'static', tr: 'cut' })];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Action test', STATS = [];
const END = { t: 11.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'epic', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Test*' };

