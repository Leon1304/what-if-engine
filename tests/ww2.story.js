const CFG = { dur: 24, seed: 3, locale: 'en-US', kind: 'explain', accent: 'red', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05, shadows: true, area: 60, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.2, capPos: 'mid', karaoke: true, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'ww2 *kit*', big: true, instant: true }];
const CAM = [
  { t: 0, p: [10, 6, 70], l: [0, 3, 20], fov: 50 }, { t: 3, p: [12, 6, 66], l: [0, 3, 20], fov: 50 },
  { t: 3, cut: true, p: [-5, 18, 20], l: [-8, 14, -6], fov: 48 }, { t: 6, p: [0, 18, 22], l: [-8, 14, -6], fov: 48 },
  { t: 6, cut: true, p: [50, 30, 60], l: [0, 8, 0], fov: 50 }, { t: 9, p: [56, 30, 52], l: [0, 8, 0], fov: 50 },
  ...shot('mid', 9, 3, 'tank', { az: 200, dist: 14, h: 3, move: 'static' }),
  { t: 12, cut: true, p: [-60, 25, -10], l: [-60, 17, -45], fov: 50 }, { t: 15, p: [-58, 25, -12], l: [-60, 17, -45], fov: 50 },
  { t: 15, cut: true, p: [0, 4, -40], l: [0, 60, -60], fov: 60 }, { t: 18, p: [0, 4, -42], l: [0, 60, -60], fov: 60 },
  { t: 18, cut: true, p: [2000, 3.2, 3.6], l: [2000, 0.9, 0.2], fov: 50 }, { t: 24, p: [2000.4, 2.6, 3.0], l: [2000, 0.9, 0.2], fov: 46 }
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'dawn'], [14.9, 'dawn'], [15, 'night']];
const PHASES = t => 'June 6, 1944';
const STATS = [];
const END = { t: 23.6, q: 'Test?', opts: ['A', 'B'] };
const AUDIO = { mood: 'none', sfx: 1, amb: [[0, 12, 'battle', 0.8], [12, 15, 'surf', 0.8], [15, 18, 'planes', 1], [18, 24, 'hq', 1]], hits: [{ t: 16, k: 'whistle', dur: 1 }, { t: 18.5, k: 'morse', dur: 1.5 }, { t: 20, k: 'typewriter', dur: 1.2 }] };
const THUMB = { t: 4, text: '*D-Day* test' };
