// own Blender models, street set (v3.12): road tiles + crossing, cars that drive, traffic lights switched by tint, lamps, benches, plants
const CFG = { dur: 9, seed: 8, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'green', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 60, renderScale: 0.75, msaa: 2, sunAz: -30, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  { t: 0, p: [-3.5, 1.7, 30], l: [0, 1.2, 0], fov: 50 }, { t: 3, p: [-3.5, 1.9, 24], l: [0, 1.2, 0], fov: 50, e: 'inOut' },
  { t: 3, cut: true, p: [24, 26, -26], l: [0, 0, 4], fov: 45 }, { t: 6, p: [20, 26, -28], l: [0, 0, 4], fov: 45, e: 'inOut' },
  { t: 6, cut: true, p: [3.2, 1.6, 12.5], l: [7.2, 2.0, 6.5], fov: 55 }, { t: 9, p: [3.0, 1.7, 12.0], l: [7.2, 2.0, 6.5], fov: 55, e: 'inOut' }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Street', STATS = [];
const END = { t: 8.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 2, text: '*Street*' };
