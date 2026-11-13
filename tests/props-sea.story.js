const CFG = { dur: 9, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 60, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.2, coverT: 1.2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'ships and *planes*', big: true, instant: true }];
const CAM = [
  { t: 0, p: [14, 7, 62], l: [0, 1, 38], fov: 50 }, { t: 3, p: [15, 7, 60], l: [0, 1, 37], fov: 50 },
  { t: 3, cut: true, p: [-70, 55, 430], l: [-260, 10, 300], fov: 48 }, { t: 6, p: [-72, 55, 426], l: [-260, 10, 300], fov: 48 },
  { t: 6, cut: true, p: [60, 20, -60], l: [0, 70, -170], fov: 55 }, { t: 9, p: [60, 20, -62], l: [0, 68, -175], fov: 55 }
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'Ships + planes';
const STATS = [];
const END = { t: 8.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 9, 'ocean', 0.4]] };
const THUMB = { t: 1.2, text: 'Ships and *planes*' };
