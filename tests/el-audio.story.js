const CFG = { dur: 12, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.07, vignette: 0.6, contrast: 1.1,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.3, coverT: 1.2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'elevenlabs audio', big: true, instant: true }];
// v3.25 ElevenLabs music + sounds: musicPrompt (the video's own music), score → sections (the 1.5 s 'action' bit merges into 'tense', the 'none' end stays silent),
// hits with el (own sound, k = fallback), beds with an own prompt (5th element) or the kind's default prompt (AMB_EL)
const CAM = [...shot('wide', 0, 6, [0, 1.5, 0], { az: 20, dist: 18, h: 3, move: 'push', tr: 'cut' }), ...shot('close', 6, 6, 'hero', { az: -20, move: 'static', tr: 'cut' })];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'dusk']];
const PHASES = t => 'Audio';
const STATS = [];
const END = { t: 11.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { musicPrompt: 'dark bluegrass, banjo and fiddle, rural farm at dusk', score: [[0, 'tense'], [4, 'action'], [5.5, 'epic'], [9, 'none']],
  sections: [[0, 1], [5.5, 3]], music: 0.5, sfx: 0.9,
  hits: [{ t: 2, el: 'Old wooden barn door creaking open slowly', dur: 2.5, k: 'door' }, { t: 6, el: 'Tractor engine sputtering to a stop', dur: 3 }, { t: 9, k: 'boom' }],
  amb: [[0, 6, 'farm', 0.6, 'Farm at dusk, crickets starting, distant dog barking, wind in dry corn'], [6, 12, 'night', 0.5]] };
const THUMB = { t: 1.2, text: '*Audio* test' };
