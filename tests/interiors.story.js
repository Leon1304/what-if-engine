const CFG = { dur: 12, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'green', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const ROOMS_T = ['living', 'kitchen', 'bedroom', 'bathroom', 'office', 'kids', 'cellar', 'garage', 'bunker', 'classroom', 'shop'];
const CAM = ROOMS_T.flatMap((k, i) => shot('mid', 0.25 + i * 1, 1, [i * 14, 1.1, -0.6], { az: 0, dist: 8.5, h: 2.6, fov: 52, move: 'static', tr: 'cut' }));
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Interior test', STATS = [];
const END = { t: 11.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'chill', music: 0.25, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Test*' };
