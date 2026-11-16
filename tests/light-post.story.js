// v3.45 light / post-FX / depth of field — EXPECTED: shot 1 (night): a face 0.6 m from the lens while the camera looks 20 m away, a lamp glow({ intensity: 30 }) 1 m above
// a second head → no burnt faces (CFG.lightCap, the even fill light); shot 2 (day sky, camera inside an interior() room) → the fill is on; shot 3: auto depth of field,
// the look-at point 4 m behind the figure → auto focus on the figure (sharp), background soft; shot 4: a white veil (no flash) over the lens 10–11.5 s →
// "QA: WASHOUT – … the whole frame is milky" (the only WASHOUT line). tests/run.sh probes the numbers.
const CFG = { dur: 12.5, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'blue', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', clouds: true };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'light', big: true, instant: true }];
const CAM = [
  { t: 0, p: [0.55, 1.6, 4.6], l: [0, 1.5, -16], fov: 50, dof: 0 }, { t: 3, p: [0.55, 1.6, 4.6], l: [0, 1.5, -16], fov: 50, dof: 0 },     // near face at the lens edge, looking far
  { t: 3, p: [40.6, 1.6, 1.4], l: [39, 1.2, -1.5], fov: 55, cut: true }, { t: 6, p: [40.6, 1.6, 1.4], l: [39, 1.2, -1.5], fov: 55 },    // inside the room
  { t: 6, p: [-10, 1.6, 3.2], l: [-10, 1.4, -2.8], fov: 35, cut: true }, { t: 9, p: [-10, 1.6, 3.2], l: [-10, 1.4, -2.8], fov: 35 },   // figure 1.8 m in front, look-at 6 m
  { t: 9, p: [12, 2.5, 10], l: [0, 1.2, 0], fov: 46, cut: true }, { t: 12.5, p: [12, 2.5, 10], l: [0, 1.2, 0], fov: 46 }               // milky veil
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'night'], [2.95, 'night'], [3, 'day']];
const PHASES = t => 'Light';
const STATS = [];
const END = { t: 12.2, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 12.5, 'wind', 0.4]] };
const THUMB = { t: 1.2, text: '*Light* test' };
