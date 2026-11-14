const CFG = { dur: 9, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'green', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.2, coverT: 1.2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'props *coverage*', big: true, instant: true }];
const CAM = [
  { t: 0, p: [0.9, 3.4, 15], l: [0.9, 1.0, -1.5], fov: 60 }, { t: 3, p: [1.2, 3.4, 14.5], l: [0.9, 1.0, -1.5], fov: 60 },
  { t: 3, cut: true, p: [41, 7, 16], l: [42, 1.6, 0], fov: 55 }, { t: 6, p: [40.5, 7, 15.5], l: [42, 1.6, 0], fov: 55 },
  { t: 6, cut: true, p: [2000, 2.4, 9], l: [2000, 1.2, -4], fov: 55 }, { t: 9, p: [2000.4, 2.4, 8.6], l: [2000, 1.2, -4], fov: 55 }
];
const SHAKES = [], FLASHES = [{ t: 1.5, dur: 0.15, a: 0.2 }];
const SKY = [[0, 'day'], [5.99, 'day'], [6, 'mars']];
const PHASES = t => 'Props coverage';
const STATS = [];
const END = { t: 8.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 9, 'city', 0.4]] };
const THUMB = { t: 1.2, text: 'Props *coverage*' };
