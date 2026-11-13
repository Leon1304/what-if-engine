const CFG = { dur: 10, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
// v3.5 water: pool with swimmer + shark + drain, red salt lake, underwater sky without an underwater() call (auto: caustics, shafts, marine snow, depth gradient)
const CAM = [
  { t: 0, p: [3.6, 4.4, -1.2], l: [0, 0.6, -6.4], fov: 46, cut: true }, { t: 3, p: [3.4, 4.2, -1.6], l: [0, 0.6, -6.4], fov: 46 },
  { t: 3, p: [-6, 2.2, 26], l: [6, -0.2, 42], fov: 50, cut: true, tr: 'cut' }, { t: 5, p: [-5.5, 2.1, 26.5], l: [6, -0.2, 42], fov: 50 },
  { t: 5, p: [-1.4, 2.6, -1.4], l: [0.4, 0.3, -7], fov: 50, cut: true, tr: 'cut' }, { t: 7, p: [-1.3, 2.5, -1.6], l: [0.4, 0.3, -7], fov: 50 },
  { t: 7, p: [38, -2.2, 100], l: [44, -3.5, 112], fov: 50, cut: true, tr: 'cut' }, { t: 10, p: [39, -2.2, 100.5], l: [44, -3.5, 112], fov: 50 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day'], [6.99, 'day'], [7, 'underwater']], PHASES = t => 'Water', STATS = [];
const END = { t: 9.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'epic', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Test*' };
