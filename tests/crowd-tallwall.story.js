const CFG = { dur: 16, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'green', filter: 'none', grain: 0, vignette: 0.2, saturation: 1.0, contrast: 1.0,
  shadows: true, area: 50, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'tall wall + *heroes*', big: true, instant: true }];
// v3.22: heroes (full figures) at the front of a horde pressing against a 14 m wall: no limb snaps while they creep (gait blends by speed),
// the far side is a real fall (g, the knees take the last half metre). render --audit: no MOTION lines.
const CAM = [
  ...shot('wide', 0, 5, [0, 4, -3], { az: 200, dist: 26, h: 8, fov: 50, move: 'static', tr: 'cut' }),
  ...shot('mid', 5, 5, [0, 5, -5], { az: 250, dist: 17, h: 4, fov: 50, move: 'static', tr: 'cut' }),
  ...shot('wide', 10, 6, [0, 7, 2], { az: 20, dist: 26, h: 6, fov: 50, move: 'static', tr: 'cut' })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => "Tall wall";
const STATS = [];
const END = { t: 15.8, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 11, text: "*Wall* fall" };
