const CFG = { dur: 12, seed: 71, locale: 'en-US', kind: 'truecrime', accent: 'red', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.0, contrast: 1.05,
  shadows: true, area: 60, nightLift: 0.4, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
// v3.29: trijet parked with the airstair down · trijet at night (lit windows, stair open, a man on the stair, he jumps) · 1971 cabin forward + aft (door, stairwell, hatch) · props macro
const CAM = [
  { t: 0, p: [18, 5, -12], l: [0, 4, -15], fov: 50, cut: true }, { t: 2, p: [17, 5.5, -13], l: [0, 4, -15], fov: 50 },
  { t: 2, cut: true, tr: 'cut', follow: 'stair', off: [-7, -0.8, 6], fov: 50, dy: 0, fy: 0.5 }, { t: 3.7, follow: 'stair', off: [-7.5, -1.0, 5.5], fov: 50, dy: 0, fy: 0.5 },
  { t: 3.7, cut: true, tr: 'cut', follow: 'jumper', off: [-2.2, -2.6, 3.6], fov: 56, dy: 0.4, fy: 0.62 }, { t: 5, follow: 'jumper', off: [-2.6, -3.0, 4.2], fov: 56, dy: 0.4, fy: 0.62 },
  { t: 5, p: [-400.05, 2.0, 4.2], l: [-400.3, 1.0, -3.0], fov: 50, cut: true, tr: 'cut' }, { t: 7, p: [-400.05, 1.98, 3.8], l: [-400.3, 1.0, -3.0], fov: 50 },
  { t: 7, p: [-400.1, 1.6, -0.6], l: [-400, 0.8, -6.5], fov: 56, cut: true, tr: 'cut' }, { t: 9, p: [-400.1, 1.55, -0.9], l: [-400, 0.7, -6.5], fov: 56 },
  { t: 9, p: [-799.7, 1.75, 0.95], l: [-800, 0.8, 0], fov: 46, cut: true, tr: 'cut' }, { t: 12, p: [-799.6, 1.75, 1.0], l: [-800, 0.8, 0], fov: 46 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day'], [1.99, 'day'], [2, 'night'], [4.99, 'night'], [5, 'day'], [8.99, 'day'], [9, 'day']], PHASES = t => '1971', STATS = [];
const END = { t: 11.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'tense', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Trijet*' };
