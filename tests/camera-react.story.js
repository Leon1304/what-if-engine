// v3.44 camera: low-angle threat shot, over-the-shoulder, handheld with punch-in, blast front hitting the camera (camReact) inside a speed ramp (SLOWMO rampIn / snap),
// tilt-shift policy (CFG.mini only on overviews: close shot 0, far hand key on)
const CFG = { dur: 12, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.045, vignette: 0.4, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 60, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.7, coverT: 1.2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', gore: 'goo',
  mini: { band: 0.1 } };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'camera', big: true, instant: true }];
const CAM = [
  ...shot('low', 0, 3, 'a', { look: [0, 18, -30] }),                         // threat above the hero
  ...shot('ots', 3, 2, 'a', { look: 'b' }),                                    // over a's shoulder onto b
  ...shot('mid', 5, 3, 'a', { az: 150, handheld: 1, punch: 0.5 }),             // blast at 6.0 (scene time) hits the camera, punch-in at 5.5
  ...shot('close', 8, 2, 'a', { az: 180 }),
  { t: 10, p: [60, 50, 60], l: [0, 0, 0], fov: 40, cut: true }, { t: 12, p: [64, 52, 58], l: [0, 0, 0], fov: 40 }   // far hand key: tilt-shift on (policy)
];
const SLOWMO = [{ t: 5.9, dur: 0.8, rate: 0.2, rampIn: 0.1, snap: true }];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'Camera';
const STATS = [];
const END = { t: 11.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 12, 'wind', 0.4]] };
const THUMB = { t: 1.2, text: '*Low* angle' };
