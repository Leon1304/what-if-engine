// own Blender cyberpunk set (v3.20): cp_street, cp_tower, cp_ramen_stall, cp_vending, cp_hovercar at night, neon glow, parts and marks
const CFG = { dur: 15, seed: 3, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'pink', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.1, contrast: 1.05,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', clouds: false };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [{ t: 0, p: [-3, 4.5, 16], l: [3, 6, -6], fov: 55 }, { t: 3, p: [-2.4, 4.3, 14], l: [3, 6, -6], fov: 55, e: 'inOut' },
  { t: 3, cut: true, p: [-4.2, 1.5, 3.8], l: [-6.9, 1.1, 2], fov: 50 }, { t: 6, p: [-4.0, 1.5, 3.4], l: [-6.9, 1.1, 2], fov: 50 },
  { t: 6, cut: true, p: [-6.6, 2.0, 0.6], l: [-12.5, 1.6, -2], fov: 55 }, { t: 9, p: [-6.6, 2.0, -0.4], l: [-12.5, 1.6, -2], fov: 55 },
  { t: 9, cut: true, p: [5, 1.4, 8], l: [10, 14, 0], fov: 60 }, { t: 12, p: [5.5, 1.4, 6], l: [10, 16, 0], fov: 60 },
  { t: 12, cut: true, p: [-3.5, 4.2, 8], l: [-1.75, 3.4, 1], fov: 50 }, { t: 15, p: [-3.2, 4.4, 7.4], l: [-1.75, 3.4, 0], fov: 50 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'night']], PHASES = t => 'Cyber', STATS = [];
const END = { t: 14.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 1, text: '*Neon*' };
