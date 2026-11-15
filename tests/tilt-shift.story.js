// v3.37 miniature / tilt-shift: shot('mini') from high up (sharp band at the subject, blur above / below, toy colours), a normal shot without it, a shot that blends it in
const CFG = { dur: 12, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.045, vignette: 0.4, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 60, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.7, coverT: 1.2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', gore: 'goo',
  mini: { band: 0.1 } };   // mini as an object: defaults for every key (amount 1 = on everywhere); per key mini: 0 switches it off
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'tilt shift', big: true, instant: true }];
const CAM = [
  ...shot('mini', 0, 4, [0, 0, 0], { az: 30 }),
  ...shot('wide', 4, 4, [0, 0, 0], { az: 20, dist: 30, h: 14, mini: 0, tr: 'cut' }),   // normal lens
  { t: 8, p: [40, 30, 40], l: [0, 0, 0], fov: 40, cut: true, mini: 0 }, { t: 12, p: [44, 52, 44], l: [0, 0, 0], fov: 34, mini: 1 }   // blends into the toy look
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'Tilt shift';
const STATS = [];
const END = { t: 11.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 12, 'city', 0.4]] };
const THUMB = { t: 1.2, text: '*Tiny* city', mini: 1, miniY: 0.55 };
