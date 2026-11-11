const CFG = { dur: 9, seed: 3, locale: 'en-US', kind: 'explain', badge: 'Explaining', accent: 'cyan', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05, shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'auto' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 3, text: 'Ocean *blast* test', big: true, instant: true }, { t: 3.2, dur: 2.6, text: 'The sea *bulges.*' }, { t: 6, dur: 2.8, text: 'Cut-away *section.*' }];
const CAM = [
  ...shot('mid', 0, 3, [-3000, -54, 0], { az: 20, dist: 22, h: 2, move: 'orbit', turn: 20 }),
  ...shot('wide', 3, 3, [0, 2, 0], { az: 30, dist: 90, h: 25 }),
  ...shot('mid', 6, 3, [3000, -42, 0], { az: 10, dist: 52, h: 2 })
];
const SHAKES = [], FLASHES = [], SKY = [[0, 'deepsea'], [2.99, 'deepsea'], [3, 'day']], PHASES = t => '', STATS = [];
const END = { t: 8.2, q: 'Test?', opts: ['A', 'B'] };
const AUDIO = { mood: 'none', amb: [[0, 3, 'underwater', 1], [3, 9, 'ocean', 1]] };
const THUMB = { t: 1, text: 'Ocean *test*', cam: { p: [-2985, -52, 18], l: [-3000, -54, 0], fov: 50 } };
