const CFG = { dur: 10, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
// env-props: interior({ clutter }) in six rooms (clock, frames, posters, wall shelf, pegboard — only on free wall), prisonCell clutter, planeCabin clutter
const S = (t, at, o) => shot('mid', t, 0.6, at, { h: 0.1, fov: 52, move: 'static', tr: 'cut', ...o });
const CAM = [
  ...S(0.0, [0, 1.5, -1.2], { dist: 3.6, az: 0 }), ...S(0.6, [-1.5, 1.6, 0], { dist: 3.2, az: 60 }), ...S(1.2, [14, 1.5, -1.2], { dist: 3.6, az: 0 }), ...S(1.8, [28, 1.5, -1.2], { dist: 3.6, az: 0 }), ...S(2.4, [27, 1.6, 0], { dist: 3, az: 60 }),
  ...S(3.0, [42, 1.5, -1.2], { dist: 3.6, az: 0 }), ...S(3.6, [56, 1.5, -1.2], { dist: 3.6, az: 0 }), ...S(4.2, [70, 1.5, -1.2], { dist: 3.6, az: 0 }), ...S(4.8, [70.5, 1.4, 0.5], { dist: 2.6, az: -75 }),
  ...S(5.4, [99.6, 1.3, -2.6], { dist: 2.2, az: 25 }), ...S(6.0, [98.6, 1.0, -1.2], { dist: 1.6, az: 80 }), ...S(6.6, [140, 1.3, -2], { dist: 4, az: 0 }), ...S(7.2, [141.1, 1.7, 1], { dist: 1.5, az: -60 }),
  ...shot('mid', 7.8, 2.2, [0, 1.5, -1.2], { dist: 3.6, az: 0, h: 0.1, fov: 52, move: 'static', tr: 'cut' })];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Rooms', STATS = [];
const END = { t: 9.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'calm', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1.2, text: '*Rooms*' };
