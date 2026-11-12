const CFG = { dur: 20, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'green', filter: 'none', grain: 0, vignette: 0.2, saturation: 1.0, contrast: 1.0,
  shadows: true, area: 50, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'crowd *behaviour*', big: true, instant: true }];
// v3.3 crowds: a zombie horde piles up against a wall, climbs it and pours over (0–11 s); people crossing a square hesitate, glance about,
// trip and fall over each other, zombies with jackets, rags and blood lunge (11–20 s); a far horde uses the simplified far level
const CAM = [
  ...shot('wide', 0, 5, [0, 1, -3], { az: 200, dist: 22, h: 9, fov: 45, move: 'static', tr: 'cut' }),
  ...shot('mid', 5, 6, [0, 2, -2], { az: 20, dist: 11, h: 6, fov: 45, move: 'static', tr: 'cut' }),
  ...shot('wide', 11, 5, [70, 0, 0], { az: 0, dist: 18, h: 9, fov: 45, move: 'static', tr: 'cut' }),
  ...shot('mid', 16, 4, [70, 1, 4], { az: 30, dist: 7, h: 2, fov: 45, move: 'static', tr: 'cut' })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'Crowd behaviour';
const STATS = [];
const END = { t: 19.8, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 8, text: '*Wall* climb' };
