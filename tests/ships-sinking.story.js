const CFG = { dur: 12, seed: 3, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  ...shot('mid', 0.0, 1.0, [0, 15, 0], { az: 70, dist: 300, h: 30, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 1.0, 1.0, [300, 3, 0], { az: 50, dist: 50, h: 10, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 2.0, 1.0, [-300, 2, 0], { az: 60, dist: 26, h: 6, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 3.0, 1.0, [300, 5, 0], { az: 50, dist: 55, h: 8, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 4.0, 1.0, [0, 15, 0], { az: 70, dist: 300, h: 20, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 5.0, 1.0, [0, 20, 700], { az: 50, dist: 280, h: 60, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 6.0, 1.0, [300, 15, 700], { az: 50, dist: 240, h: 30, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 7.0, 1.0, [-300, 2, 700], { az: 40, dist: 25, h: 5, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 8.0, 1.0, [0, 15, 0], { az: 70, dist: 300, h: 20, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 9.0, 1.0, [300, 5, 0], { az: 50, dist: 55, h: 8, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 10.0, 2.0, [40, 2, 60], { az: 60, dist: 60, h: 8, fov: 40, move: 'static', tr: 'cut' })];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Action test', STATS = [];
const END = { t: 11.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'epic', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Test*' };

