const CFG = { dur: 9, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
// v2.40.x animal detail: chicken + Gerald, planted feet (start / stop / gait change), dog ears, mammoth, moose, snake, spider, frog, bird feathers
const CAM = [
  ...shot('close', 0.0, 1.5, 'gerald', { az: 30, dist: 2.4, dy: 0.6, h: 0.2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 1.5, 2.0, 'hen', { az: 80, dist: 2.6, h: 0.3, dy: 0.3, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 3.5, 2.5, 'horse', { az: 70, dist: 7, h: 0.6, dy: 1.0, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 6.0, 1.5, [40, 1.6, 0], { az: 25, dist: 14, h: 0.3, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 7.5, 1.5, [60.5, 0.15, 0.5], { az: 35, dist: 2.6, h: 1.2, fov: 40, move: 'static', tr: 'cut' })];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Animal detail', STATS = [];
const END = { t: 8.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'epic', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Test*' };
