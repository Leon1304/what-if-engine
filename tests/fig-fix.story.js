const CFG = { dur: 11, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', autoCut: false, dofAuto: 0 };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
// p3 figure fixes: seated / lying figures under low things (no folding), a crawler in a low tunnel (tips forward, hands stay on the floor), crossed arms on every build,
// cower, a coffee sip (hand at the cup), a phone clip with a phone, a motorbike rider (hands on the bars), CPR (hands on the chest), Gerald's glasses, a taxi driver (legs not under the car),
// clothing detail close-up (hem, shoulders, closed eyes, hair vs skin, cap)
const CAM = [
  ...shot('mid', 0, 1, [0.9, 0.95, 0], { az: 20, dist: 4.8, h: 0.4, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 1, 1, [7.1, 0.6, -2.4], { az: 90, dist: 2.6, h: 0.2, fov: 45, move: 'static', tr: 'cut' }),
  ...shot('mid', 2, 1, [14.6, 1.3, 0], { az: 0, dist: 5.2, h: 0.1, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 3, 1, [21.1, 0.9, 0], { az: 0, dist: 5.0, h: 0.2, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 4, 1, [26.0, 1.2, 0], { az: 15, dist: 3.6, h: 0.1, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 5, 1, [32.0, 0.4, 0.6], { az: 70, dist: 3.4, h: 1.0, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 6, 1, [38.1, 0.78, 0.1], { az: 40, dist: 1.1, h: 0.05, fov: 35, move: 'static', tr: 'cut' }),
  ...shot('mid', 7, 1, [44.0, 0.6, 0], { az: 80, dist: 5.5, h: 0.0, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 8, 1.5, [50.6, 1.25, 0], { az: 10, dist: 4.4, h: 0.1, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 9.5, 1.5, [56.0, 1.3, 0], { az: 0, dist: 3.0, h: 0.2, fov: 40, move: 'static', tr: 'cut' })];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Figure fixes', STATS = [];
const END = { t: 10.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'calm', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Figures*' };
