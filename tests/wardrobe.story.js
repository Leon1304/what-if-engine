const CFG = { dur: 17, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'none', grain: 0, vignette: 0.2, saturation: 1.0, contrast: 1.0,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'wardrobe *test*', big: true, instant: true }];
// every hair style, hat, outfit and warrior kind in one line-up, all doing the same thing at the same time:
// 0 idle, 0.7 look far to the side · 1.6 walk · 3.6 run · 5.2 punch · 6.6 cheer · 8 panic · 9.4 sit · 11.4 stop gesture + look at the camera · 13.2 startle · 14 fall / ragdoll
const CAM = [
  ...shot('mid', 0, 6, [7.5, 1.1, 0], { az: 15, dist: 13, h: 1.4, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 6, 6, [36, 1.1, 0], { az: 160, dist: 16, h: 1.6, fov: 40, move: 'static', tr: 'cut' }),
  ...shot('mid', 12, 5, [100, 1.0, 0], { az: 75, dist: 14, h: 2.0, fov: 40, move: 'static', tr: 'cut' })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'Wardrobe test';
const STATS = [];
const END = { t: 16.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0.5, hits: [] };
const THUMB = { t: 1.2, text: '*Wardrobe* test' };
