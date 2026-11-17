// v3.52 crime-scene props (Red String): cake + dome + forks, cake drop / lick / scoop, cherry rollTo, pedal bin, paper wads, biscuit pack, note with magnet,
// coat hooks + rain jacket pocket, wall clock, thermos, evidence markers, cover sheet, powder with shoe print + chalk outline, kitchen with real window and back door,
// detailed counter / stove / fridge (4 cm gap) / sink, apron + flour, dachshund with collar, cream and crumbs, shiftItem, keyed
const CFG = { dur: 12, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.25, saturation: 1.05, contrast: 1.04,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, karaoke: false, voice: false, series: null, cast: {}, transition: 'cut', autoCut: false, endCard: 'quick' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  ...shot('mid', 0, 1.2, [0.2, 1.05, -1.35], { az: 15, dist: 1.25, h: 0.25, fov: 40, move: 'push', tr: 'cut' }),
  ...shot('mid', 1.2, 1.6, [0.2, 0.25, -0.9], { az: 30, dist: 1.6, h: 0.6, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 2.8, 1.4, [-0.6, 0.02, -0.75], { az: 10, dist: 0.6, h: 0.45, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 4.2, 1.4, [1.75, 0.05, -1.55], { az: -30, dist: 0.9, h: 0.12, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 5.6, 1.4, [2.1, 0.7, 0.4], { az: -55, dist: 1.4, h: 0.3, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 7.0, 1.4, [-1.4, 1.5, 1.2], { az: 140, dist: 1.6, h: 0.1, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 8.4, 1.4, [0.0, 0.3, 0.4], { az: 0, dist: 2.2, h: 0.8, fov: 42, move: 'static', tr: 'cut' }),
  ...shot('mid', 9.8, 2.2, [6.5, 0.4, 0.0], { az: 40, dist: 3.2, h: 1.4, fov: 40, move: 'static', tr: 'cut' })];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Crime props', STATS = [];
const END = null;
const AUDIO = { style: 'jazz', score: [[0, 'chill']], music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Props*' };
