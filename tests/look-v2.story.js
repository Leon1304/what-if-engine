const CFG = { dur: 10, seed: 11, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'yellow', filter: 'film', grain: 0.045, vignette: 0.4, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -40, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
// look v2: day → golden → night along the SKY keys (tone curve, separation, vibrance blend), a dark figure in a close shot (lower rim), then a night room (room rig: window key)
const CAM = [
  { t: 0, p: [6, 2.2, 12], l: [0, 1.4, 0], fov: 50 }, { t: 3, p: [4, 1.9, 9], l: [0, 1.3, 0], fov: 50 },   // street with houses, day → golden
  { t: 3, cut: true, p: [1.6, 1.6, 4.4], l: [0, 1.3, 1.5], fov: 45 }, { t: 6, p: [1.2, 1.55, 4.2], l: [0, 1.3, 1.5], fov: 45 },   // dark figure close, golden → night
  { t: 6, cut: true, p: [20.6, 1.6, 2.0], l: [19.2, 1.1, -1.6], fov: 60 }, { t: 10, p: [20.2, 1.6, 2.1], l: [19.4, 1.1, -1.6], fov: 60 }   // inside the night room: moon key from the window, lamp pool
];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day'], [2.5, 'golden'], [4.5, 'night']], PHASES = t => 'Look v2', STATS = [];
const END = { t: 9.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'chill', music: 0.25, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Test*' };
