const CFG = { dur: 12, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.07, vignette: 0.6, saturation: 0.96, contrast: 1.14,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.3, coverT: 1.2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', gore: 'blood',
  dofAuto: 1, motionBlur: 'all',
  // v3.23 cinema look: bars (here growing to a wider scope in the night part: t => …), anamorphic streaks, edge fringes, halation
  cinema: { bars: t => 0.085 + 0.04 * sm01((t - 8) / 1.2) } };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'cinema', big: true, instant: true }];
// golden close-up against the sun → dusk street with lamps and headlights (streaks, halation) → night close-up under a lamp with wider bars
const CAM = [
  ...shot('close', 0, 4, 'hero', { az: 25, move: 'push', tr: 'cut' }),
  ...shot('wide', 4, 4, [0, 1.5, 0], { az: 20, dist: 26, h: 2.4, fov: 50, move: 'static', tr: 'cut' }),
  ...shot('close', 8, 4, 'hero', { az: -20, move: 'static', tr: 'cut' })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'golden'], [3.7, 'golden'], [4.0, 'dusk'], [7.7, 'dusk'], [8.0, 'night']];
const PHASES = t => 'Cinema';
const STATS = [];
const END = { t: 11.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 12, 'city', 0.4]] };
const THUMB = { t: 1.2, text: '*Cinema* test' };
