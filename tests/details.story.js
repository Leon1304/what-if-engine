const CFG = { dur: 10, seed: 3, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  ...shot('mid', 0, 1.5, [0, 2, 0], { az: 35, dist: 17, h: 0.4, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 1.5, 1.5, [16, 3, 0], { az: 35, dist: 26, h: 0.4, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 3.0, 1.5, [-12, 1.5, 0], { az: 25, dist: 20, h: 0.2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 4.5, 1.5, [4, 4, 34], { az: 20, dist: 26, h: 0.2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 6.0, 1.0, [68, 2, -20], { az: 20, dist: 36, h: 0.25, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 7.0, 1.0, [10, 2, -300], { az: 30, dist: 48, h: 0.25, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 8.0, 2.0, [0, 2, 0], { az: 35, dist: 17, h: 0.4, fov: 40, move: 'static', tr: 'cut' })];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day'], [7.9, 'day'], [8.0, 'night']], PHASES = t => 'Details', STATS = [];
const END = { t: 9.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'epic', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Test*' };
