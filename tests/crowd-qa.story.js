const CFG = { dur: 10, seed: 11, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'green', filter: 'none', grain: 0, vignette: 0.2, saturation: 1.0, contrast: 1.0,
  shadows: true, area: 50, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'crowd *QA*', big: true, instant: true }];
// v3.24 crowd QA by what the viewer sees: a zombie horde crams onto a small goal a few metres in front of the lens (members inside each other close
// to the camera = zero tolerance), a second horde crams together the same way behind the camera (off screen = not counted).
// tests/run.sh checks the QA lines of this scene (whatif.probe('qaCrowds()')).
const CAM = [
  ...shot('mid', 0, 10, [0, 1, 0], { az: 0, dist: 8, h: 1.8, fov: 45, move: 'static', tr: 'cut' })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'Crowd QA';
const STATS = [];
const END = { t: 9.8, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 6, text: '*Crowd* QA' };
