// p3 FX fixes: lavaLake shader + pure burn(), portal vortex, UFO beam bands, re-entry plasma, explosion fire core, chunk / shard / spark / steam defaults, x-ray on a hidden figure
const CFG = { dur: 10, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.04, vignette: 0.35, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 90, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.5, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', gore: 'goo' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'fx', big: true, instant: true }];
const CAM = [
  ...shot('wide', 0, 2.1, [0, 0, 0], { az: 20, dist: 22, h: 12, fov: 50, move: 'static' }),
  ...shot('mid', 2.1, 1.7, [40, 1.6, 0], { az: 15, dist: 6, h: 1.6, fov: 50, move: 'static' }),
  ...shot('wide', 3.8, 1.4, [80, 5, 0], { az: 10, dist: 22, h: 4, fov: 50, move: 'static' }),
  ...shot('wide', 5.2, 2.6, [130, 50, -110], { az: 0, dist: 90, h: -10, fov: 50, move: 'static' }),
  ...shot('mid', 7.8, 2.2, [158, 1.5, 3], { az: 0, dist: 11, h: 3, fov: 50, move: 'static' })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'FX';
const STATS = [];
const QA_OK = ['SPARSE', 'PACING', 'ENDCARD', 'LENSFX'];
const END = { t: 9.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 10, 'city', 0.4]] };
const THUMB = { t: 1.5, text: '*Lava*' };
