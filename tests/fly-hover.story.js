// v3.26 fly(): vertical take-off (takeoff), rounded corners, hover window (hover), a second chained fly() segment with a vertical landing (landing); a plane on a looped square
const CFG = { dur: 18, seed: 31, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'green', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 60, renderScale: 0.75, msaa: 2, sunAz: -30, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  ...shot('wide', 0.0, 3.0, [0, 2, 0], { az: 150, dist: 20, h: 4, fov: 50, move: 'static', tr: 'cut' }),
  ...shot('mid', 3.0, 3.0, 'heli', { az: 120, dist: 22, h: 2, fov: 50, move: 'static', tr: 'cut' }),
  ...shot('mid', 6.0, 5.0, 'heli', { az: 200, dist: 20, h: 1, fov: 50, move: 'static', tr: 'cut' }),
  ...shot('wide', 11.0, 7.0, [26, 3, 8], { az: 160, dist: 26, h: 5, fov: 50, move: 'static', tr: 'cut' })];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Fly', STATS = [];
const END = { t: 17.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 1, text: '*Hover*' };
