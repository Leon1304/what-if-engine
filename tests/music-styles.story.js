const CFG = { dur: 12, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.07, vignette: 0.6, contrast: 1.1,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.3, coverT: 1.2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'music styles', big: true, instant: true }];
// v3.36 AUDIO.style: own music per video from the engine (no ElevenLabs): the mood score keeps tempo/minor-major, the style brings instruments, drums, bass, scale
const CAM = [...shot('wide', 0, 6, [0, 1.5, 0], { az: 20, dist: 18, h: 3, move: 'push', tr: 'cut' }), ...shot('close', 6, 6, 'hero', { az: -20, move: 'static', tr: 'cut' })];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'dusk']];
const PHASES = t => 'Audio';
const STATS = [];
const END = { t: 11.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { style: 'bluegrass', score: [[0, 'tense'], [4, 'action'], [8, 'triumph']], sections: [[0, 1], [4, 2], [8, 3]], music: 0.55, sfx: 0.9,
  hits: [{ t: 9, k: 'boom' }], amb: [[0, 12, 'farm', 0.5]] };
const THUMB = { t: 1.2, text: '*Music* test' };
