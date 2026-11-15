// motion fixes: sit on an interior sofa → stand up → walk; chained walks with 90° / 180° turns (turn on the spot); a walk keeps the built facing before t0;
// sprint / jog feet; a chained drive with a 90° corner (arc, no side slip); a jostling crowd (feet planted); enter() into a car seat
const CFG = { dur: 16, seed: 21, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'green', filter: 'none', grain: 0, vignette: 0.2, saturation: 1.0, contrast: 1.0,
  shadows: true, area: 160, renderScale: 0.75, msaa: 2, sunAz: -30, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [{ t: 0, p: [-30, 1.6, 4.6], l: [-30.3, 0.8, -0.6], fov: 50 }, { t: 3, p: [-30, 1.6, 4.6], l: [-30.3, 0.8, -0.6], fov: 50 },
  { t: 3, cut: true, p: [13, 3.2, 12], l: [13, 0.8, 1], fov: 50 }, { t: 6.4, p: [13, 3.2, 12], l: [13, 0.8, 1], fov: 50 },
  { t: 6.4, cut: true, p: [-4, 2.6, 4], l: [4, 0.9, -10], fov: 55 }, { t: 9, p: [-4, 2.6, 0], l: [4, 0.9, -18], fov: 55 },
  { t: 9, cut: true, p: [44, 9, 4], l: [40, 0.5, -16], fov: 55 }, { t: 13, p: [44, 9, 4], l: [40, 0.5, -16], fov: 55 },
  { t: 13, cut: true, p: [70, 2.4, 9], l: [68, 0.8, 0], fov: 50 }, { t: 16, p: [70, 2.4, 9], l: [68, 0.8, 0], fov: 50 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Motion', STATS = [];
const END = { t: 15.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 1, text: '*Motion*' };
