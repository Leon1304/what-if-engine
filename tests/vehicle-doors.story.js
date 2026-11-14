// v3.26 vehicle doors and seats: own/car_hatch door parts + enter() from its marks, steering Blender wheels on a curve drive, a van convoy (drive follow),
// own/car_van cab and rear doors, own/cp_hovercar gull-wing door and own/cp_kiosk rear door via openDoor (axis / sign / angle from the build scripts)
const CFG = { dur: 10, seed: 25, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'green', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -30, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [{ t: 0, p: [4.2, 1.7, -3.4], l: [0.7, 0.85, 0.1], fov: 52 }, { t: 3, p: [4.0, 1.7, -3.0], l: [0.7, 0.85, 0.1], fov: 52, e: 'inOut' },
  { t: 3, cut: true, p: [-3.6, 1.3, 11.5], l: [0.6, 0.5, 7.4], fov: 50 }, { t: 6, p: [-3.2, 1.4, 12.5], l: [3.0, 0.6, 10.0], fov: 50, e: 'inOut' },
  { t: 6, cut: true, p: [-10.5, 3.2, 18.5], l: [-14.5, 1.2, 4.5], fov: 55 }, { t: 10, p: [-10.9, 3.2, 18.0], l: [-14.5, 1.2, 4.5], fov: 55, e: 'inOut' }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Doors', STATS = [];
const END = { t: 9.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 1, text: '*Doors*' };
