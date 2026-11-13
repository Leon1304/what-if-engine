// v3.24 adaptive motion blur: a sprinter right past the lens, a car across the frame — mbPlan() picks the sample count (and closes the shutter) per frame, QA: GHOST
const CFG = { dur: 9, seed: 23, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'green', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -30, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [{ t: 0, p: [0, 1.5, 7], l: [0, 1.2, 0], fov: 50 }, { t: 5, p: [0, 1.5, 7], l: [0, 1.2, 0], fov: 50 },
  { t: 5, cut: true, p: [0, 2, 16], l: [0, 1, 0], fov: 50 }, { t: 9, p: [0, 2, 16], l: [0, 1, 0], fov: 50 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Blur', STATS = [];
const MBLUR = [[0.5, 9]];
const END = { t: 8.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 1, text: '*Blur*' };
