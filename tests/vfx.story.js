// v3.44 VFX: lit volumetric puffs — explode() fireball + streak sparks, meteor() rock with plasma trail, smokeColumn(), mushroomCloud(), shockwave() bending trees, storey-band collapse (pancake + topple)
const CFG = { dur: 12, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.04, vignette: 0.35, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 90, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.3, coverT: 4, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', gore: 'goo' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'vfx', big: true, instant: true }];
const CAM = [
  ...shot('wide', 0, 3, [10, 10, -20], { az: 15, dist: 95, h: 22, fov: 50, move: 'static' }),
  ...shot('wide', 3, 3.5, [10, 12, -25], { az: 35, dist: 95, h: 30, fov: 50, move: 'static' }),
  ...shot('wide', 6.5, 5.5, [0, 40, -60], { az: 20, dist: 200, h: 40, fov: 46, move: 'static' })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'VFX';
const STATS = [];
const END = { t: 11.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 12, 'city', 0.4]] };
const THUMB = { t: 4, text: '*Boom*' };
