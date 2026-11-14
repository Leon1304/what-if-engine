const CFG = { dur: 9, seed: 6, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: 30, handheld: 0.2, coverT: 1.2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'camp-out *kit*', big: true, instant: true }];
const CAM = [   // 0–3 tents (one pitches, one gets snow) · 3–6 countdown 3 → 0, glitch · 6–9 messages (strike, then plain)
  { t: 0, p: [4, 2.6, 9], l: [0, 0.6, 0], fov: 50 }, { t: 3, p: [3.6, 2.5, 8.6], l: [0, 0.6, 0], fov: 50 },
  { t: 3, cut: true, p: [0, 3.2, 22], l: [0, 4.5, 10], fov: 50 }, { t: 9, p: [0, 3.3, 21], l: [0, 4.5, 10], fov: 50 }
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'dusk']];
const PHASES = t => 'Camp-out kit test';
const STATS = [];
const END = { t: 8.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 9, 'city', 0.4]] };
const THUMB = { t: 1.2, text: '*Camp* out' };
