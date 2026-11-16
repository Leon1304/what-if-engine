// v3.45 sets: hall stub hidden for a figure on the doorstep (no blank wall in the close-up, QA HIDDEN quiet), a room far beyond the ground mesh stands on the ground skirt,
//   Venus plates without COPLANAR, soft gas-giant clouds, the ocean cut-away in deep water, hills backdrop without the AO line
const CFG = { dur: 10, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'green', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  ...shot('close', 0, 2, 'mom', { az: 25, dist: 3.2, tr: 'cut' }),
  ...shot('wide', 2, 2, [400, 1, 0], { az: 20, dist: 18, h: 6, tr: 'cut' }),
  ...shot('mid', 4, 2, [3000, 1, 0], { az: 30, dist: 7, tr: 'cut' }),
  ...shot('mid', 6, 2, 'faller', { az: 20, dist: 6, h: 0.6, tr: 'cut' }),
  ...shot('wide', 8, 2, [-3000, -42, 0], { az: 0, dist: 64, h: 0, tr: 'cut' })
];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day'], [3.99, 'day'], [4, 'venus'], [5.99, 'venus'], [6, 'jupiter'], [7.99, 'jupiter'], [8, 'day']], PHASES = t => 'Sets test', STATS = [];
const END = { t: 9.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'chill', music: 0.25, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Test*' };
