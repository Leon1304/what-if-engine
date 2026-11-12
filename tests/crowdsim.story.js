const CFG = { dur: 20, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'green', filter: 'none', grain: 0, vignette: 0.2, saturation: 1.0, contrast: 1.0,
  shadows: true, area: 50, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'crowd *sim*', big: true, instant: true }];
// v3.0 crowd simulation: a horde presses against a fence line, breaks through and surrounds a house (0–12 s), avoiding a parked car and a man in its way;
// a crowd of people in a square flees from a blast in a wave (12–20 s)
const CAM = [
  ...shot('wide', 0, 6, [0, 0, -4], { az: 0, dist: 34, h: 30, fov: 45, move: 'static', tr: 'cut' }),
  ...shot('mid', 6, 6, [-2, 1, -7], { az: 20, dist: 12, h: 7, fov: 45, move: 'static', tr: 'cut' }),
  ...shot('wide', 12, 4, [60, 0, 0], { az: 0, dist: 30, h: 26, fov: 45, move: 'static', tr: 'cut' }),
  ...shot('mid', 16, 4, [60, 1, 0], { az: 20, dist: 9, h: 2, fov: 45, move: 'static', tr: 'cut' })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'Crowd sim';
const STATS = [];
const END = { t: 19.8, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 5, text: '*Crowd* sim' };
