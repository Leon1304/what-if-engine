// own Blender props (v3.13+): one detailed model per topic, assets/own/src/<name>.py → assets/own/<name>.glb
const CFG = { dur: 24, seed: 3, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'green', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [{ t: 0, p: [2.6, 2.3, 4.6], l: [0, 0.8, 0], fov: 50 }, { t: 3, p: [2.2, 2.4, 4.4], l: [0, 0.8, 0], fov: 50, e: 'inOut' },
  { t: 3, cut: true, p: [-4, 1.6, 22.4], l: [3, 1.2, 21.6], fov: 55 }, { t: 6, p: [-3.5, 1.6, 22.4], l: [3, 1.2, 21.6], fov: 55 },
  { t: 6, cut: true, p: [-2, 7, 10], l: [-14, 6, -8], fov: 55 }, { t: 9, p: [-2.6, 7.2, 10], l: [-14, 6, -8], fov: 55 },
  { t: 9, cut: true, p: [-2, 2.2, 10], l: [-8, 1.6, 4], fov: 55 }, { t: 12, p: [-2.2, 2.3, 10], l: [-8, 1.6, 4], fov: 55 },
  { t: 12, cut: true, p: [6, 3.2, 14.6], l: [6, 2.2, 10], fov: 50 }, { t: 15, p: [6.3, 3.2, 14.5], l: [6, 2.2, 10], fov: 50 },
  { t: 15, cut: true, p: [10.6, 1.5, 8.2], l: [10, 1.2, 4], fov: 50 }, { t: 18, p: [11, 1.5, 8.1], l: [10, 1.2, 4], fov: 50 },
  { t: 18, cut: true, p: [-26, 8, 62], l: [-40, 3, 40], fov: 50 }, { t: 21, p: [-24, 8, 61], l: [-40, 3, 40], fov: 50 },
  { t: 21, cut: true, p: [17.2, 2.0, 16.4], l: [16, 0.8, 14], fov: 50 }, { t: 24, p: [17.4, 2.0, 16.3], l: [16, 0.8, 14], fov: 50 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Props', STATS = [];
const END = { t: 23.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 1, text: '*Props*' };
