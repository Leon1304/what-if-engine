const CFG = { dur: 9, seed: 3, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  ...shot('mid', 0.0, 1.0, [0, 2.2, 0], { az: 40, dist: 12, h: 0.5, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 1.0, 0.5, [20, 0.5, 0], { az: 60, dist: 6, h: 0.6, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 1.5, 1.0, 'tg', { az: 0, dist: 7, h: 0.2, dy: 0.8, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 2.5, 0.5, [60, 1.0, 0], { az: 60, dist: 5, h: 0.4, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 3.0, 0.5, [80, 2.5, 0], { az: 60, dist: 10, h: 0.4, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 3.5, 0.5, [100, 0.5, 0], { az: 40, dist: 2.5, h: 0.2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 4.0, 0.5, [104, 0.6, 0], { az: 40, dist: 3, h: 0.2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 4.5, 1.0, [0, 1.5, 60], { az: 20, dist: 30, h: 3, fov: 45, move: 'static', tr: 'cut' }),
  ...shot('pov', 5.5, 1.5, 'lion', { pitch: -0.12 }),
  ...shot('mid', 7.0, 1.0, 'lion', { az: 0, dist: 6, h: 0.3, dy: 0.7, fov: 40, move: 'static', tr: 'cut' })];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Action test', STATS = [];
const END = { t: 8.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'epic', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Test*' };
