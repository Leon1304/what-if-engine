// v3.44 cover styles: A split (before / after the hit: the same camera 2.5 s before the explosion on top), B number (giant '6,000' + unit from the captions),
// C frame (sharp scene, dark bands, title + bar), D without style → the engine picks one (by kind / seed, different from the others' pick order)
const CFG = { dur: 9, seed: 4, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 6.5, karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [
  { t: 0.2, dur: 4, text: 'One rock. The force of _6,000 Hiroshimas._' },
  { t: 4.4, dur: 4, text: 'And the *barn* is gone.' }
];
const CAM = [...shot('wide', 0, 9, [0, 2, 0], { az: 25, dist: 26, h: 6, move: 'static', tr: 'cut' })];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => '';
const STATS = [];
const END = { t: 8.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0.9, hits: [] };
const THUMB = [
  { t: 6.5, text: 'The barn *vanished*', style: 'split' },
  { t: 6.5, text: 'One *rock*', style: 'number' },
  { t: 6.5, text: 'Barn *gone*', style: 'frame' },
  { t: 6.5, text: 'What *hit* it?' }
];
