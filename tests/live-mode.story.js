// v3.50 live mode (CFG.live): the page as a playable world for the game in sandbox/ — orbit camera instead of CAM, no video HUD, clock through whatif.live
const CFG = { dur: 10, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.04, vignette: 0.35, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 80, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.5, coverT: 2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', gore: 'goo',
  live: { cam: { at: [0, 0, -10], az: 30, el: 35, dist: 110, fov: 45, min: 10, max: 400 }, autoplay: false, loop: false } };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'live', big: true, instant: true }];
const CAM = [...shot('wide', 0, 10, [0, 0, -10], { az: 30, dist: 110, h: 40, fov: 45, move: 'static' })];   // ignored in live mode (orbit camera), kept for the cover / QA
const SHAKES = [{ t: 6.2, amp: 0.4, dur: 0.6 }], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'Live';
const STATS = [
  { label: 'Impact in', type: 'timer', until: 6, show: 0, hide: 6 },
  { label: 'Houses', keys: [[0, 6], [6, 6], [6.6, 2]], show: 0, up: 'good' }
];
const END = { t: 9.4, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 10, 'city', 0.4]] };
