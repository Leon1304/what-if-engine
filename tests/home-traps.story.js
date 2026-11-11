const CFG = { dur: 10, seed: 4, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'lime', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  ...shot('mid', 0, 2.5, [-2.6, 0.4, 0], { az: 10, dist: 4.5, h: 0.6, fov: 44, move: 'static', tr: 'cut' }),
  ...shot('mid', 2.5, 3.0, [1.2, -0.6, 0], { az: 0, dist: 11, h: -0.1, fov: 46, move: 'static', tr: 'cut' }),
  ...shot('close', 5.5, 4.5, 'you', { az: -70, tr: 'cut', move: 'static' })];
const SHAKES = [], FLASHES = [], SKY = [[0, 'night']], PHASES = t => 'Home traps test', STATS = [];
const END = { t: 9.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', hits: [] };
