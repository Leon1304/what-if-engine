// humans test (v3.4): mocap people with painted clothes — human({ sex, shirt, pants, shoes, sleeves, legs, skin, hair, hairColor, beard }) walking, running, clips via anim()
const CFG = { dur: 12, seed: 3, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 20, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  { t: 0, p: [0, 1.7, 9], l: [0, 1.0, 0], fov: 42 },
  { t: 4, p: [2, 1.7, 8.5], l: [0, 1.0, 0], fov: 42, e: 'inOut' },
  ...shot('close', 4, 4, 'f', { az: 10, dist: 2.6, h: 0.05, dy: 1.45, fy: 0.45, move: 'static', tr: 'cut' }),
  { t: 8, cut: true, p: [6, 2.4, 7], l: [0, 0.9, 0], fov: 44 }, { t: 12, p: [7, 2.8, 5], l: [0, 0.9, 0], fov: 44 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Humans', STATS = [];
const END = { t: 11.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 2, text: '*Humans*' };
