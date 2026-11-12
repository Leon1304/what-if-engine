const CFG = { dur: 9, seed: 3, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'red', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 2.5, kick: 'What if …', text: 'you fell into a *salt lake?*', big: true, instant: true }];
const CAM = [
  { t: 0, p: [6, 3, 10], l: [0, 0.3, 0], fov: 48 }, { t: 9, p: [5, 2.5, 8], l: [0, 0.3, 0], fov: 46 }];
const _X = [
  { t: 0, p: [14, 4, 20], l: [0, 1, 0], fov: 46 }, { t: 3, p: [10, 3, 14], l: [0, 1, 0], fov: 46 },
  { t: 3, cut: true, p: [1000, 1.2, 9.5], l: [1000, 1.4, -6], fov: 55 }, { t: 6, p: [1000, 1.2, 4], l: [1000, 1.4, -10], fov: 55 },
  { t: 6, cut: true, p: [2004, 2.4, 5], l: [2000, 0.6, 0], fov: 55 }, { t: 9, p: [2003, 2.2, 4], l: [2000, 0.6, 0], fov: 55 }
];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = [], STATS = [];
const END = { t: 8, q: 'Test?', opts: ['A', 'B'], loop: 'Again —' };
const AUDIO = { mood: 'none', amb: [[0, 9, 'ocean', 0.5]] };
const THUMB = { t: 1, text: '*Whale*' };
