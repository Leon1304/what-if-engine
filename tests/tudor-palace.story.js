// v3.48 Tudor palace: interior({ kind: 'tudor' }) (panelling, tapestries, fireplace, leaded windows, four-poster), presence chamber (bed: false), closeStool() lid, foldScreen(),
// coffer() opening, courtProp() set on the table, costumes courtier + tudorKing, music style 'tudor', SFX 'lid'
const CFG = { dur: 10, seed: 47, locale: 'en-US', kind: 'history', accent: 'purple', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: -30, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [{ t: 0, p: [3.6, 1.8, 3.4], l: [-3, 1.4, -2], fov: 55 }, { t: 3, p: [3.3, 1.8, 3.4], l: [-3, 1.4, -2], fov: 55 },
  { t: 3, cut: true, p: [2.75, 1.05, -1.25], l: [2.6, 0.4, -2.6], fov: 45 }, { t: 6, p: [2.7, 1.0, -1.3], l: [2.6, 0.4, -2.6], fov: 45 },
  { t: 6, cut: true, p: [43, 1.7, 2.9], l: [38.5, 1.2, -2], fov: 52 }, { t: 10, p: [42.7, 1.7, 2.9], l: [38.5, 1.2, -2], fov: 52 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Tudor', STATS = [];
const END = { t: 9.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { style: 'tudor', score: [[0, 'chill']], music: 0.3, sfx: 0.8, hits: [] };
const THUMB = { t: 4, text: '*Tudor*' };
