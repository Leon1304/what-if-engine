const CFG = { dur: 9, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'blue', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 60, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', gore: 'blood' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'collision QA *test*', big: true, instant: true }];
const CAM = [   // 0–2 wide over the set · 2–4 lens inside a head · 4–6 lens inside a standing crowd · 6–9 the car passing the parked car, the crane load
  { t: 0, p: [10, 40, 60], l: [10, 4, -5], fov: 55 }, { t: 2, p: [10, 40, 58], l: [10, 4, -5], fov: 55, e: 'lin' },
  { t: 2, cut: true, p: [40, 1.55, 0.02], l: [40, 1.55, 6], fov: 50 }, { t: 4, p: [40, 1.55, 0.03], l: [40, 1.55, 6], fov: 50, e: 'lin' },
  { t: 4, cut: true, p: [60, 1.3, 0.25], l: [64, 1.2, 4], fov: 50 }, { t: 6, p: [60, 1.3, 0.26], l: [64, 1.2, 4], fov: 50, e: 'lin' },
  { t: 6, cut: true, p: [92, 6, 2], l: [80, 1, 2], fov: 55 }, { t: 9, p: [92, 6, 3], l: [80, 1, 2], fov: 55, e: 'lin' }
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'Collision QA test';
const STATS = [];
const END = { t: 8.7, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 9, 'city', 0.4]] };
const THUMB = { t: 1, text: '*Collision* QA' };
