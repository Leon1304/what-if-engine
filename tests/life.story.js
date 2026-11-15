const CFG = { dur: 9, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
// v3.44 idle life, attention, new reactions, clothing detail: close-up of a figure posed with a fixed time (still lives), a row of reactions, a crowd that gazes,
// points and gasps, figures that turn to an explosion, one that flees
const CAM = [
  ...shot('mid', 0, 1.6, [0, 1.45, 0], { az: 0, dist: 1.9, h: 0.05, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 1.6, 1.0, [-11.4, 1.0, 0], { az: 0, dist: 7.5, h: 0.3, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 2.6, 2.4, [11.9, 1.0, 0], { az: 0, dist: 13, h: 0.6, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 5.0, 2.0, [26.5, 1.2, 0], { az: 0, dist: 11, h: 1.5, fov: 45, move: 'static', tr: 'cut' }),
  ...shot('mid', 7.0, 2.0, [50, 1.0, 0], { az: 0, dist: 10, h: 1.5, fov: 45, move: 'static', tr: 'cut' })];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Life test', STATS = [];
const END = { t: 8.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'calm', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Life*' };
