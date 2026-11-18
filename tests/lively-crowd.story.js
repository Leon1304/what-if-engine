const CFG = { dur: 8, seed: 3, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'red', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: 30, handheld: 0.2, coverT: 4.5, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', lively: true };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'The crowd *reacts*', big: true, instant: true }];
const CAM = [   // 0–4 behind the crowd: the blast in the distance, heads turn front to back, phones go up · 4–8 from the front: points, gasps, ducks
  { t: 0, p: [0, 2.6, 23], l: [0, 2.2, -10], fov: 48 }, { t: 4, p: [1.5, 2.4, 21.5], l: [0, 2.6, -10], fov: 46 },
  { t: 4, cut: true, p: [-2, 1.7, 5.5], l: [0, 1.4, 13], fov: 50 }, { t: 8, p: [2, 1.7, 5.5], l: [0, 1.4, 13], fov: 50 }
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'dusk']];
const PHASES = t => 'crowd wave test';
const STATS = [];
const END = { t: 7.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 8, 'city', 0.3]] };
const THUMB = { t: 4.5, text: 'Phones *up*' };
