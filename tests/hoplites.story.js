const CFG = { dur: 14, seed: 5, locale: 'en-US', kind: 'story', aspect: '16:9', badge: 'Hoplite kit', accent: 'red', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.04, contrast: 1.05,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -40, handheld: 0, coverT: 1.0, capPos: 'low', karaoke: false, subtitles: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', loop: false };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.3, text: ' ', instant: true }];
const CAM = [
  ...shot('mid', 0.0, 1.0, [0, 1.15, 0], { az: 18, dist: 7.4, h: 0.15, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 1.0, 1.0, [0, 1.15, 0], { az: 200, dist: 7.4, h: 0.15, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('close', 2.0, 1.0, [0, 1.25, 20], { az: 28, dist: 2.6, h: 0.1, fov: 34, move: 'static', tr: 'cut' }),
  ...shot('close', 3.0, 1.0, [-0.85, 1.3, 20], { az: 270, dist: 1.9, h: 0.1, fov: 34, move: 'static', tr: 'cut' }),
  ...shot('mid', 4.0, 1.0, [0, 1.0, 12], { az: 0, dist: 7.0, h: 0.2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('close', 5.0, 1.0, [1.0, 1.0, 28], { az: 15, dist: 1.5, h: 0.25, fov: 34, move: 'static', tr: 'cut' }),
  ...shot('close', 6.0, 1.0, [5.5, 1.25, 0], { az: 25, dist: 1.7, h: 0.05, fov: 34, move: 'static', tr: 'cut' }),
  ...shot('close', 7.0, 1.0, [7, 1.25, 0], { az: 330, dist: 1.7, h: 0.05, fov: 34, move: 'static', tr: 'cut' }),
  ...shot('close', 8.0, 1.0, [5.5, 0.5, 0], { az: 40, dist: 1.5, h: 0.1, fov: 34, move: 'static', tr: 'cut' }),
  ...shot('close', 9.0, 1.0, [-3, 1.75, 0], { az: 25, dist: 1.25, h: 0.02, fov: 32, move: 'static', tr: 'cut' }),
  ...shot('close', 10.0, 1.0, [-1.5, 1.35, 0], { az: 205, dist: 2.0, h: 0.1, fov: 34, move: 'static', tr: 'cut' }),
  ...shot('close', 11.0, 2.0, [0, 1.75, 0], { az: 18, dist: 1.4, h: 0.02, fov: 32, move: 'static', tr: 'cut' }),
  ...shot('mid', 13.0, 1.0, [0, 1.2, -15], { az: 28, dist: 11, h: 0.6, fov: 40, move: 'static', tr: 'cut' })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'Hoplites';
const STATS = [];
const END = { t: 14.5, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [] };
const THUMB = { t: 1.0, text: '*Hoplites*' };
