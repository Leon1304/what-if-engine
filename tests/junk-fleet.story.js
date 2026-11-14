const CFG = { dur: 10, seed: 7, locale: 'en-US', kind: 'history', accent: 'yellow', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 60, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
// v3.27: junk under sail (sails, sweeps, castle, eyes), mast breaking over the side at 3.2 s, dice + tiles tossed on deck, wreck with survey grid on the seabed (underwater from 7 s)
const CAM = [
  { t: 0, p: [34, 9, 30], l: [0, 6, 0], fov: 48, cut: true }, { t: 3, p: [30, 9, 34], l: [0, 6, 0], fov: 48 },
  { t: 3, p: [-30, 8, 22], l: [-60, 7, 0], fov: 50, cut: true, tr: 'cut' }, { t: 5, p: [-29, 8, 23], l: [-60, 6, 0], fov: 50 },
  { t: 5, p: [0.9, 6.3, 3.4], l: [0, 5.9, 2.2], fov: 40, cut: true, tr: 'cut' }, { t: 7, p: [0.8, 6.3, 3.3], l: [0, 5.9, 2.2], fov: 40 },
  { t: 7, p: [1506, -5.5, 9], l: [1500, -8.6, 0], fov: 52, cut: true, tr: 'cut' }, { t: 10, p: [1505, -5.4, 10], l: [1500, -8.6, 0], fov: 52 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day'], [6.99, 'day'], [7, 'underwater']], PHASES = t => '1281', STATS = [];
const END = { t: 9.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'epic', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Junk*' };
