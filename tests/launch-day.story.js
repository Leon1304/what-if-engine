const CFG = { dur: 9, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: 30, handheld: 0.2, coverT: 1.2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'launch day *kit*', big: true, instant: true }];
const CAM = [   // 0–3 room: gamer with gamepad, TV game screen, console, alarm clock · 3–6 generator · 6–9 city blackout wave
  { t: 0, p: [0.6, 1.3, 1.6], l: [-0.2, 0.9, -1.8], fov: 50 }, { t: 3, p: [0.6, 1.3, 1.5], l: [-0.2, 0.9, -1.8], fov: 50 },
  { t: 3, cut: true, p: [6.2, 0.9, 6.3], l: [5, 0.35, 4.5], fov: 42 }, { t: 6, p: [6.0, 0.95, 6.1], l: [5, 0.35, 4.5], fov: 42 },
  { t: 6, cut: true, p: [30, 26, 70], l: [0, 6, -40], fov: 50 }, { t: 9, p: [28, 25, 68], l: [0, 6, -40], fov: 50 }
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'night']];
const PHASES = t => 'Launch day kit test';
const STATS = [];
const END = { t: 8.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 9, 'city', 0.4]] };
const THUMB = { t: 1.2, text: '*Launch* day', cam: { p: [0.4, 1.2, 0.9], l: [-0.4, 1.0, -1.7], fov: 50 } };
