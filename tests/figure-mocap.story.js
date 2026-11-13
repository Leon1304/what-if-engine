// figure-mocap test (v3.6): the 84 human() clips retargeted onto figure() — anim(f, [[t, clip]]) on a figure, figure({ mocap: true }) gaits, only: 'upper'
const CFG = { dur: 12, seed: 4, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 20, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  { t: 0, p: [0, 1.6, 8], l: [0, 0.9, 0], fov: 44 },
  { t: 4, p: [2, 1.6, 7.5], l: [0, 0.9, 0], fov: 44, e: 'inOut' },
  ...shot('close', 4, 4, 'd', { az: 15, dist: 2.8, h: 0.05, dy: 1.2, fy: 0.45, move: 'static', tr: 'cut' }),
  { t: 8, cut: true, p: [6, 2.2, 6], l: [0, 0.8, 0], fov: 46 }, { t: 12, p: [6.5, 2.6, 4.5], l: [0, 0.8, 0], fov: 46 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Mocap', STATS = [];
const END = { t: 11.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 2, text: '*Mocap*' };
