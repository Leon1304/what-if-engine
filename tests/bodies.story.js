const CFG = { dur: 16, seed: 9, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'none', grain: 0, vignette: 0.2, saturation: 1.0, contrast: 1.0,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'bodies *test*', big: true, instant: true }];
// v2.41: every build in one line-up (0–4 s idle with body language from the face: calm → scared → sad → happy), everyday clothes,
// gait moods walking past (4–9 s), wind-up before walking off, hands close-up (fingers, grab), ponytail + backpack running, night rim light (12–16 s)
const CAM = [
  ...shot('mid', 0, 4, [2.5, 1.0, 0], { az: 0, dist: 7.5, h: 1.2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 4, 4, [-2.5, 1.0, 8.4], { az: 0, dist: 10, h: 1.2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('close', 8, 2, [20.25, 1.0, 0.3], { az: 35, dist: 2.0, h: 0.25, fov: 36, move: 'static', tr: 'cut' }),
  ...shot('mid', 10, 2, [31, 1.0, 0], { az: -55, dist: 6, h: 1.0, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 12, 4, [7.5, 1.0, 0], { az: 0, dist: 7.5, h: 1.2, fov: 40, move: 'static', tr: 'cut' })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day'], [11.9, 'day'], [12, 'night']];
const PHASES = t => 'Bodies test';
const STATS = [];
const END = { t: 15.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0.5, hits: [] };
const THUMB = { t: 1.2, text: '*Bodies* test' };
