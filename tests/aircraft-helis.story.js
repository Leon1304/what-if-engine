const CFG = { dur: 12, seed: 3, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  ...shot('mid', 0.0, 1.0, 'al', { az: 120, dist: 70, h: 6, dy: 2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 1.0, 1.0, [-100, 32, 200], { az: 30, dist: 18, h: 2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 2.0, 1.0, [0, 22, 200], { az: 30, dist: 30, h: -8, fov: 45, move: 'static', tr: 'cut' }),
  ...shot('mid', 3.0, 1.0, 'ft', { az: 140, dist: 30, h: 4, dy: 0, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 4.0, 1.0, [100, 12, 200], { az: 30, dist: 30, h: 0, fov: 45, move: 'static', tr: 'cut' }),
  ...shot('mid', 5.0, 1.0, 'ce', { az: 150, dist: 22, h: 3, dy: 0, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 6.0, 1.0, 'ft', { az: 140, dist: 30, h: 4, dy: 0, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 7.0, 1.0, 'al', { az: 150, dist: 90, h: 6, dy: 0, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 8.0, 1.0, [200, 3, 200], { az: 200, dist: 24, h: 2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 9.0, 1.0, 'at', { az: 60, dist: 20, h: 3, dy: 0, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 10.0, 2.0, [100, 10, 200], { az: 60, dist: 26, h: 0, fov: 45, move: 'static', tr: 'cut' })];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Action test', STATS = [];
const END = { t: 11.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'epic', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Test*' };

