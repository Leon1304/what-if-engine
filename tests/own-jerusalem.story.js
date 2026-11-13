// own Blender models, Jerusalem set (v3.11): wall run of own/wall_barrier (12 m slots) and own/wall_tower (6 m slots), city of jlm_* behind it
const CFG = { dur: 9, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'green', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 120, renderScale: 0.75, msaa: 2, sunAz: -30, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  { t: 0, p: [-12, 3, 34], l: [0, 12, 0], fov: 60 }, { t: 3, p: [-8, 3.5, 30], l: [0, 12, 0], fov: 60, e: 'inOut' },
  { t: 3, cut: true, p: [-50, 45, 110], l: [0, 6, -25], fov: 45 }, { t: 6, p: [-40, 42, 105], l: [0, 6, -25], fov: 45, e: 'inOut' },
  { t: 6, cut: true, p: [30, 26, -6], l: [0, 8, -50], fov: 50 }, { t: 9, p: [26, 26, -8], l: [0, 8, -50], fov: 50, e: 'inOut' }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Jerusalem', STATS = [];
const END = { t: 8.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 2, text: '*Wall*' };
