// own Blender cyberpunk set, part 2 (v3.22): cp_road_cross, cp_stairs (walk surface), cp_kiosk at night; parts, marks, signal tint
const CFG = { dur: 12, seed: 4, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'cyan', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.1, contrast: 1.05,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', clouds: false };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [{ t: 0, p: [-9, 11, 14], l: [2, 0, -4], fov: 55 }, { t: 3, p: [-7, 10, 12], l: [3, 0, -5], fov: 55, e: 'inOut' },
  { t: 3, cut: true, p: [17.5, 2.2, -2.5], l: [12.5, 2.4, -14], fov: 55 }, { t: 7.5, p: [18, 4.5, -5], l: [12.5, 4.6, -17], fov: 55 },
  { t: 7.5, cut: true, p: [-13.4, 1.7, -5.2], l: [-12, 1.5, -11], fov: 50 }, { t: 10, p: [-13.0, 1.7, -5.6], l: [-12, 1.6, -11], fov: 50 },
  { t: 10, cut: true, p: [3.5, 1.7, 3.8], l: [6, 2.8, 6], fov: 55 }, { t: 12, p: [3.2, 1.7, 3.4], l: [6, 2.8, 6], fov: 55 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'night']], PHASES = t => 'Cyber', STATS = [];
const END = { t: 11.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 1, text: '*Neon*' };
