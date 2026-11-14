// figure-moves test (v3.26): falls that buckle at the knees and a real get-up (LayToIdle for mocap back falls), sit enter / exit clips, moving seats,
// jump start / land clips, Hit_Chest, idleMix, clutch + cpr, swimming, flock; react / gesture / idle / faceFx / hands / b.do in either argument order
const CFG = { dur: 12, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 24, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  ...shot('mid', 0, 3.9, [-3.4, 0.6, -0.4], { az: 30, dist: 7.5, h: 1.2, fov: 44, move: 'static', tr: 'cut' }),
  ...shot('mid', 3.9, 2.5, [3, 0.6, -0.2], { az: -30, dist: 6.5, h: 1.4, fov: 44, move: 'static', tr: 'cut' }),
  ...shot('mid', 6.4, 2.6, [-1.4, 0.7, 9.3], { az: 0, dist: 9.5, h: 2.4, fov: 46, move: 'static', tr: 'cut' }),
  ...shot('wide', 9, 3, [4, 0.5, -8], { az: 30, dist: 11, h: 5, fov: 48, move: 'static', tr: 'cut' })
];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Moves', STATS = [];
const END = { t: 11.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 1, text: '*Moves*' };
