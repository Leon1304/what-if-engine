// v3.19 obstacle rules for movers: asset() models are hitboxes, QA: VEHICLE / BACKWARD (car beside a crowd, walker round a parked van, heli climbing over a house)
const CFG = { dur: 9, seed: 17, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'green', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -30, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [{ t: 0, p: [4, 3.2, 10], l: [0, 1.0, -2], fov: 55 }, { t: 3, p: [4.5, 3.2, 9], l: [0, 1.0, -2], fov: 55, e: 'inOut' },
  { t: 3, cut: true, p: [-2, 2.2, 14], l: [6, 1.2, 0], fov: 55 }, { t: 6, p: [-1.5, 2.2, 13], l: [6, 1.2, -4], fov: 55, e: 'inOut' },
  { t: 6, cut: true, p: [4, 6, 18], l: [-14, 14, -10], fov: 55 }, { t: 9, p: [4, 7, 17], l: [-14, 20, -20], fov: 55, e: 'inOut' }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Movers', STATS = [];
const END = { t: 8.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 1, text: '*Movers*' };
