const CFG = { dur: 9, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
// v2.40.x sea detail: shark bite (mouth follows the snout), whale tail stock + spout, orca, dolphin, jellyfish tentacles, octopus, school
const CAM = [
  ...shot('mid', 0.0, 2.0, 'shark', { az: 55, dist: 9, h: 1, dy: 0, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 2.0, 3.0, 'whale', { az: 60, dist: 30, h: 3, dy: 0, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 5.0, 2.0, [0, -6, 60], { az: 25, dist: 9, h: 0.5, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 7.0, 2.0, 'orca', { az: 50, dist: 14, h: 1, dy: 0, fov: 40, move: 'static', tr: 'cut' })];
const SHAKES = [], FLASHES = [], SKY = [[0, 'underwater']], PHASES = t => 'Sea detail', STATS = [];
const END = { t: 8.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'epic', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Test*' };
