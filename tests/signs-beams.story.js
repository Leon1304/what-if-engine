const CFG = { dur: 9, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'pink', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.2, coverT: 1.2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut',
  channel: '@signs.test' };   // CFG.channel: own handle top-left (default '@whatifthishappenedscenarios', false = none)
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'signs, screens, *beams*', big: true, instant: true }];
const CAM = [
  { t: 0, p: [0, 2.4, 12], l: [0, 2.0, -3], fov: 55 }, { t: 3, p: [0.5, 2.4, 11.5], l: [0, 2.0, -3], fov: 55 },
  { t: 3, cut: true, p: [2.6, 2.0, 2.6], l: [1.4, 2.1, -3], fov: 48 }, { t: 6, p: [2.3, 2.0, 2.3], l: [1.4, 2.1, -3], fov: 48 },
  { t: 6, cut: true, p: [12, 4, 12], l: [0, 1, 3], fov: 52 }, { t: 9, p: [12.5, 4, 11.5], l: [0, 1, 3], fov: 52 }
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'dusk']];
const PHASES = t => 'Signs + beams test';
const STATS = [];
const END = { t: 8.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 9, 'city', 0.4]] };
const THUMB = [{ t: 1.2, text: '*Signs* and screens' }, { t: 7.5, text: 'Light *beams*', sub: 'variant B' }];   // A/B covers (tests/run.sh cover stage)
