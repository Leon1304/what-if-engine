const CFG = { dur: 9, seed: 8, locale: 'en-US', kind: 'explain', badge: 'Explaining', accent: 'cyan', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: 200, handheld: 0.2, coverT: 1.2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'beach city *kit*', big: true, instant: true }];
const CAM = [   // 0–4.5 two deco hotels at dusk (neon fin, porch strip, rounded corner) · 4.5–9 iguana clings to a palm, drops at 5.5, lies belly-up
  { t: 0, p: [-4, 2.2, 18], l: [0, 5, 0], fov: 52 }, { t: 4.5, p: [-2, 2.3, 17], l: [0, 5, 0], fov: 52 },
  { t: 4.5, cut: true, p: [2.8, 1.6, 15.8], l: [0.3, 1.6, 13.2], fov: 48 }, { t: 9, p: [2.6, 1.4, 15.6], l: [0.6, 0.6, 13.6], fov: 48 }
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'dusk']];
const PHASES = t => 'Beach city kit test';
const STATS = [];
const END = { t: 8.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 9, 'ocean', 0.4]] };
const THUMB = { t: 1.2, text: '*Deco* hotels' };
