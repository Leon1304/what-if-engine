const CFG = { dur: 15, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
// v3.37 dress() with the prop library: city street (kerb cars, facades, road decals) · apron · tunnel · suburb in half-melted snow (soft snow edges, drifts at the wall, footprints)
const CAM = [
  ...shot('close', 0, 3, 'cw', { az: 40, dist: 3.6 }),
  ...shot('mid', 3, 3, [0, 1.2, -4], { az: 80, dist: 11, h: 2.5, move: 'static' }),
  ...shot('mid', 6, 3, 'crew', { az: -30, dist: 7, h: 1.5, move: 'static' }),
  ...shot('close', 9, 3, 'tw', { az: 180, dist: 3.2, move: 'static' }),
  ...shot('mid', 12, 3, 'sw', { az: 30, dist: 8, h: 2, move: 'static' })];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'dress kit', STATS = [];
const END = { t: 14.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'calm', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 4.5, text: '*Dressed*' };
