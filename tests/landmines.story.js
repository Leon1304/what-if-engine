const CFG = { dur: 6, seed: 3, locale: 'en-US', kind: 'explain', badge: 'Explaining', accent: 'yellow', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 20, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  ...shot('macro', 0, 2, [0, 0.12, 0], { az: 30, dist: 0.9, move: 'static', tr: 'cut' }),
  ...shot('mid', 2, 2.5, [0, 0.6, 0], { az: 40, dist: 4, h: 0.3, move: 'static', tr: 'cut' }),
  ...shot('mid', 4.5, 1.5, [3, 0.8, 0], { az: 0, dist: 3, h: 0.2, move: 'static', tr: 'cut' })];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Landmine test', STATS = [];
const END = { t: 5.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', sfx: 1, hits: [], amb: [[0, 6, 'wind', 1]] };
const THUMB = { t: 1, text: '*Test*' };
