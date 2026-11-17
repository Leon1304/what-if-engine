// v3.51 altitude: mountain() peak with climbers + cloudSea() under SKY 'day', airliner over a cloudSea under SKY 'high', balloonChair() with a rider in SKY 'strato'
// over a planet('earth') (curved horizon), faceFx 'boil' on the rider and the balloons bursting one after another
const CFG = { dur: 9, seed: 21, locale: 'en-US', kind: 'explain', accent: 'cyan', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: 30, handheld: 0, coverT: 1, karaoke: true, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  { t: 0, p: [70, 72, 70], l: [12, 62, 6], fov: 50 }, { t: 3, p: [64, 76, 66], l: [12, 64, 6], fov: 50 },
  { t: 3, cut: true, p: [3012, 4, 26], l: [3000, 1.5, 0], fov: 50 }, { t: 6, p: [3010, 4.5, 24], l: [3000, 2.5, 0], fov: 50 },
  ...shot('close', 6, 1.4, 'yu', { az: 29, dist: 1.6 }),
  { t: 7.4, cut: true, p: [6010, 4, 14], l: [6000, 3.5, 0], fov: 50 }, { t: 9, p: [6011, 5, 15], l: [6000, 4.5, 0], fov: 50 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'high'], [3, 'high'], [5.95, 'high'], [6, 'strato']], PHASES = t => 'Altitude', STATS = [];
const END = { t: 8.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0.5, hits: [] };
const THUMB = { t: 1, text: '*Altitude*' };
