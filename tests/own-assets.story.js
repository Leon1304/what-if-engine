// own Blender models (v3.9): assets/own/<name>.glb built from assets/own/src/<name>.py by tools/blender_asset.py, placed with asset(p, 'own/<name>', …)
const CFG = { dur: 8, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'green', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [{ t: 0, p: [-9, 5, 13], l: [1, 2.2, -5], fov: 50 }, { t: 3.5, p: [-7, 4.5, 11], l: [1, 2.2, -5], fov: 50, e: 'inOut' }, { t: 3.5, cut: true, p: [1.8, 2, 2.5], l: [0, 1.6, -3.5], fov: 45 }, { t: 6, p: [2.4, 2.1, 2.2], l: [0, 1.6, -3.5], fov: 45 }, { t: 6, cut: true, p: [24, 5, -2], l: [15, 2.5, -15], fov: 48 }, { t: 8, p: [25, 5.5, -4], l: [15, 2.5, -15], fov: 48 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Own', STATS = [];
const END = { t: 7.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 2, text: '*Own*' };
