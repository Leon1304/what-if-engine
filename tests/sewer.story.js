// v3.49 Victorian London: sewer() with rising tide, side drain, grate with daylight, falling vault bricks; rats() along the wall; costume 'tosher' with lantern light and
// tosherPole(); coin(); the outfall in the river wall, the foreshore (dress('foreshore')), warehouse() and backdrop('victorian'); AMB sewer / river, style victorian
const CFG = { dur: 9, seed: 47, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'cyan', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.0, contrast: 1.05,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -30, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [{ t: 0, p: [0.2, 0.75, -7.4], l: [-0.1, 0.7, -12.5], fov: 54 }, { t: 3, p: [0.2, 0.8, -8.0], l: [-0.1, 0.8, -12.5], fov: 54 },
  { t: 3, cut: true, p: [-9, 2.4, 15], l: [0, 3.2, 0], fov: 52 }, { t: 6, p: [-8, 2.2, 14], l: [0, 3.2, 0], fov: 52 },
  { t: 6, cut: true, p: [0.3, 1.5, -12.6], l: [0, 2.6, -14.8], fov: 60 }, { t: 9, p: [0.3, 1.6, -12.8], l: [0, 3.2, -14.8], fov: 60 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Sewer', STATS = [];
const END = { t: 8.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { style: 'victorian', score: [[0, 'funny']], music: 0.3, sfx: 0.8, amb: [[0, 3, 'sewer', 0.6], [3, 6, 'river', 0.5], [6, 9, 'sewer', 0.6]], hits: [{ t: 1, k: 'slosh' }, { t: 1.5, k: 'clink' }, { t: 2, k: 'scrape' }] };
const THUMB = { t: 1, text: '*Sewer*' };
