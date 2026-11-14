// crowd-mix test (v3.26): horde({ mix: { woman, kid, old } }) — own proportions, long hair / ponytails / skirts; killNear resolved on the simulated positions; crowd falls buckle
const CFG = { dur: 9, seed: 11, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'blue', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', gore: 'blood' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  ...shot('mid', 0, 3, [0, 0.8, 0], { az: 25, dist: 9, h: 2.4, fov: 44, move: 'static', tr: 'cut' }),
  ...shot('mid', 3, 3, [0, 0.8, 2], { az: 95, dist: 7, h: 1.6, fov: 44, move: 'static', tr: 'cut' }),
  ...shot('mid', 6, 3, [14, 0.8, 2], { az: 20, dist: 9, h: 2.6, fov: 44, move: 'static', tr: 'cut' })
];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Crowd mix', STATS = [];
const END = { t: 8.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 1, text: '*Mix*' };
