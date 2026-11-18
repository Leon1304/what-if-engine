const CFG = { dur: 10, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'yellow', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: 40, handheld: 0.2, coverT: 5, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', lively: true };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: '*Footsteps* and pass-bys', big: true, instant: true }];
const CAM = [   // 0–4.5 mid on the walker (grass → wooden deck → asphalt) · 4.5–7 low at the kerb, the car rushes past · 7–10 the helicopter passes over
  ...shot('mid', 0, 4.5, 'walker', { az: 60, dist: 4.5, h: 1.4 }),
  { t: 4.5, cut: true, p: [2, 1.1, 7.5], l: [-6, 0.9, 4.5], fov: 50 }, { t: 7, p: [2, 1.1, 7.5], l: [6, 0.9, 4.5], fov: 50 },
  { t: 7, cut: true, p: [0, 1.6, 12], l: [-10, 14, 0], fov: 55 }, { t: 10, p: [0, 1.6, 12], l: [12, 14, 0], fov: 55 }
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'footsteps / Doppler test';
const STATS = [];
const END = { t: 9.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 10, 'wind', 0.2]] };
const THUMB = { t: 5, text: '*Lively* sound' };
