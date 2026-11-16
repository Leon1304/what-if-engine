const CFG = { dur: 10, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
// p3 water fx: soft V wakes + hull mask (landing craft, speedboat), splash (drops, crown, foam ring, mist; old-style debris spray near the water),
// smooth storm swell + small lens drops, underwater blast collapse as a volumetric shock shell
const CAM = [
  { t: 0, p: [9, 9, -14], l: [0, 0, 14], fov: 50, cut: true }, { t: 3, p: [9, 9.5, -12], l: [0, 0, 16], fov: 50 },
  { t: 3, p: [7, 3.2, 52], l: [0, 0.8, 62], fov: 46, cut: true, tr: 'cut' }, { t: 5, p: [7.2, 3.2, 52.4], l: [0, 0.8, 62], fov: 46 },
  { t: 5, p: [0, 3, 120], l: [0, 1, 150], fov: 55, cut: true, tr: 'cut' }, { t: 7, p: [0.5, 3, 121], l: [0, 1, 150], fov: 55 },
  { t: 7, p: [3000, -52, 18], l: [3000, -55, 0], fov: 50, cut: true, tr: 'cut' }, { t: 10, p: [3000.5, -52, 18], l: [3000, -55, 0], fov: 50 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day'], [6.99, 'day'], [7, 'deepsea']], PHASES = t => 'Water', STATS = [];
const END = { t: 9.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'epic', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Test*' };
