const CFG = { dur: 12, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'blue', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.2, coverT: 1.2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', gore: 'blood' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: "light", big: true, instant: true }];
// v3.3 light & post: day (wide from above) → golden (close, then wide against the sun: god rays, dust) → night (close and wide: rim light, no black slabs)
const CAM = [
  ...shot('wide', 0, 3, [0, 0, 0], { az: 40, dist: 90, h: 55, fov: 50, move: 'static', tr: 'cut' }),
  ...shot('close', 3, 3, 'hero', { az: 20, move: 'static', tr: 'cut' }),
  ...shot('wide', 6, 1.5, [0, 3, 0], { az: 145, dist: 34, h: 3, fov: 55, move: 'static', tr: 'cut' }),
  ...shot('close', 7.5, 2.5, 'hero', { az: -30, move: 'static', tr: 'cut' }),
  ...shot('wide', 10, 2, [0, 0, 0], { az: 60, dist: 60, h: 30, fov: 50, move: 'static', tr: 'cut' })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, "day"], [2.3, "day"], [2.9, "golden"], [6.9, "golden"], [7.4, "night"]];
const PHASES = t => 'Light';
const STATS = [];
const END = { t: 11.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 12, 'farm', 0.5]] };
const THUMB = { t: 1.2, text: '*Light* test' };
