const CFG = { dur: 9, seed: 54, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'green', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: 30, handheld: 0.2, coverT: 1.2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'market *kit*', big: true, instant: true }];
const CAM = [   // 0–5 stock board: rises, breaking news at 3, crash · 5–9 cash pallets popping in
  { t: 0, p: [0, 2.2, 7.5], l: [0, 2.6, 0], fov: 50 }, { t: 5, p: [0.4, 2.2, 7.0], l: [0, 2.6, 0], fov: 50 },
  { t: 5, cut: true, p: [6, 3.2, 14], l: [0, 0.6, 8], fov: 50 }, { t: 7, p: [5.4, 3.0, 13.2], l: [0, 0.6, 8], fov: 50 }, { t: 7, cut: true, p: [18, 3.5, 16], l: [18, 4, 0], fov: 55 }, { t: 9, p: [17, 3.4, 15], l: [18, 4, 0], fov: 55 }
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'Market kit test';
const STATS = [];
const END = { t: 8.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 9, 'people', 0.4]] };
const THUMB = { t: 2.5, text: '*Market* test' };
