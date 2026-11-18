const CFG = { dur: 8, seed: 9, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'green', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: 50, handheld: 0.2, coverT: 2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', lively: true };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'Foreground *wipes*', big: true, instant: true }];
const CAM = [   // 0–4 sideways tracking past the walker (suburb street: a tree / lamp post slides through the frame edge) · 4–8 a slow orbit round the farmer by the barn
  { t: 0, p: [-6, 1.5, 6], l: [-4, 1.2, 0], fov: 46 }, { t: 4, p: [2, 1.5, 6], l: [3, 1.2, 0], fov: 46, e: 'lin' },
  { t: 4, cut: true, p: [24, 1.6, -5], l: [30, 1.1, -10], fov: 44 }, { t: 8, p: [31, 1.6, -2], around: [30, -10], l: [30, 1.1, -10], fov: 44 }
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'fgWipe test';
const STATS = [];
const END = { t: 7.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 8, 'wind', 0.2]] };
const THUMB = { t: 2, text: '*Wipe*' };
