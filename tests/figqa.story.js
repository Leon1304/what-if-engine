const CFG = { dur: 24, seed: 11, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'none', grain: 0, vignette: 0.2, saturation: 1.0, contrast: 1.0,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'figure *qa*', big: true, instant: true }];
// v3: figure QA — every build and outfit close up from the front (0–4 s), the back (4–8 s) and the side while moving (8–12 s), bending poses (12–16 s)
const CAM = [
  // 0–16 s: every figure of the line-up close, front (even) and back (odd) · 16–20 s: moving past · 20–24 s: bending poses
  ...[0, 1, 2, 3, 4, 5, 6, 7].flatMap(i => shot('mid', i * 2, 2, [i * 1.45, 1.05, 0], { az: i % 2 ? 160 : 15, dist: 3.2, h: 1.05, fov: 40, move: 'static', tr: 'cut' })),
  ...shot('mid', 16, 4, [4, 1.0, 8], { az: 90, dist: 7, h: 1.0, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 20, 4, [2.5, 0.9, 16], { az: 30, dist: 6, h: 0.9, fov: 40, move: 'static', tr: 'cut' })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'Figure QA';
const STATS = [];
const END = { t: 23.8, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 1.2, text: '*Figure* QA' };
