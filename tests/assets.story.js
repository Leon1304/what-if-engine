// asset library test (v3.4): CC0 low-poly packs via asset(p, 'pack/name', x, z, …) and rigged library creatures via model('pack/name') + walk/anim
const CFG = { dur: 12, seed: 4, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'green', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  { t: 0, p: [0, 9, 30], l: [0, 2, 0], fov: 46 }, { t: 4, p: [-8, 8, 28], l: [0, 2, 0], fov: 46, e: 'inOut' },
  { t: 4, cut: true, p: [26, 6, 10], l: [18, 4, -8], fov: 50 }, { t: 8, p: [28, 7, 6], l: [18, 4, -8], fov: 50 },
  { t: 8, cut: true, p: [-16, 4, 10], l: [-14, 2, -2], fov: 50 }, { t: 12, p: [-12, 4, 12], l: [-14, 2, -2], fov: 50 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Assets', STATS = [];
const END = { t: 11.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 2, text: '*Assets*' };
