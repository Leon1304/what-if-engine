// v3.47 old town + plague doctor: alley() of townhouse()s (sealed doors with doorMark, shutters swing shut at 4 s), belltower() ringing, herbs() kinds, costume 'plaguedoctor',
// surf 'cobble', SFX toll / brush, music style baroque
const CFG = { dur: 10, seed: 47, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'green', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.0, contrast: 1.05,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -30, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [{ t: 0, p: [1.0, 1.75, 2.6], l: [0, 1.5, 0], fov: 42 }, { t: 3, p: [0.7, 1.75, 2.5], l: [0, 1.5, 0], fov: 42 },
  { t: 3, cut: true, p: [0.4, 2.2, -2], l: [-1.0, 3.5, -20], fov: 52 }, { t: 6, p: [0.2, 2.2, -4], l: [-1.0, 3.5, -20], fov: 52 },
  { t: 6, cut: true, p: [12, 8, -14], l: [6, 15, -52], fov: 50 }, { t: 8, p: [11, 8, -15], l: [6, 16, -52], fov: 50 },
  { t: 8, cut: true, p: [5.6, 1.6, 1.9], l: [4.7, 0.95, 0.4], fov: 40 }, { t: 10, p: [5.4, 1.6, 1.7], l: [4.7, 0.95, 0.4], fov: 40 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'dusk'], [5, 'night']], PHASES = t => 'Plague kit', STATS = [];
const END = { t: 9.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { style: 'baroque', score: [[0, 'sad']], music: 0.4, sfx: 0.8, hits: [{ t: 1, k: 'toll' }, { t: 2, k: 'brush' }], amb: [[0, 10, 'night', 0.4]] };
const THUMB = { t: 1, text: '*Plague* kit' };
