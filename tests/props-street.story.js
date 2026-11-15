const CFG = { dur: 15, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
// env-props: every street / yard prop close up (rows A–D), a dressed wall, four suburb houses (yard, xmas, winter, garage / dormer / bay), parked cars; snow from t = 6, night from t = 12
const S = (t, at, o) => shot('mid', t, 0.5, at, { az: 22, h: 1.0, fov: 40, move: 'static', tr: 'cut', ...o });
const CAM = [
  ...S(0.0, [0, 1, 0], { dist: 24, h: 6 }), ...S(0.5, [-13.7, 0.7, 0], { dist: 4.6 }), ...S(1.0, [-6.8, 0.8, 0], { dist: 5.2 }), ...S(1.5, [0.1, 0.5, 0], { dist: 4.4 }), ...S(2.0, [7, 0.6, 0], { dist: 4.4 }), ...S(2.5, [13.9, 0.6, 0], { dist: 5 }),
  ...S(3.0, [-17.7, 0.6, 6], { dist: 5.6 }), ...S(3.5, [-10, 0.6, 6], { dist: 4.6 }), ...S(4.0, [-2.3, 1.6, 6], { dist: 7.5, h: 1.2 }), ...S(4.5, [5.4, 0.5, 6], { dist: 5 }), ...S(5.0, [12, 0.6, 6], { dist: 5 }), ...S(5.5, [18.6, 0.7, 6], { dist: 5.6 }),
  ...S(6.0, [-18.5, 1.2, 14], { dist: 11, h: 3 }), ...S(6.5, [-3, 1.2, 14], { dist: 11, h: 3 }), ...S(7.0, [10.7, 0.5, 14], { dist: 6.5, h: 2 }), ...S(7.5, [20, 0.4, 14], { dist: 5.5, h: 2 }),
  ...S(8.0, [-2, 0, 20], { dist: 10, h: 5 }), ...S(8.5, [16, 0, 20], { dist: 9, h: 4 }), ...S(9.0, [-8, 0, 24], { dist: 7, h: 4 }), ...S(9.5, [48, 1.4, -2], { dist: 16, az: 0, h: 1 }), ...S(10.0, [48, 1.4, -2], { dist: 16, az: 180, h: 1 }),
  ...S(10.5, [0, 2.5, -14], { dist: 32, h: 7, az: 10 }), ...S(11.0, [-18, 1.4, -12], { dist: 7, az: 20 }), ...S(11.5, [-3, 2, -12], { dist: 10, az: 15 }),
  ...S(12.0, [-18, 2.5, -14], { dist: 12, az: 15 }), ...S(12.5, [18, 2.5, -14], { dist: 12, az: -15 }), ...S(13.0, [6, 3, -14], { dist: 11, az: 12 }), ...S(13.5, [-14, 1, -5.5], { dist: 9, h: 3 }),
  ...shot('mid', 14.0, 1.0, [0, 1, 0], { dist: 30, h: 8, az: 25, fov: 44, move: 'static', tr: 'cut' })];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day'], [11.9, 'day'], [12.0, 'night']], PHASES = t => 'Props', STATS = [];
const END = { t: 14.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'calm', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1.5, text: '*Props*' };
