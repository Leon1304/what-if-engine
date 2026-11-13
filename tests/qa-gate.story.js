// quality gate (render.mjs --gate): a figure walks backwards on purpose (moonwalk) → QA: BACKWARD; the waiver in QA_OK lets the gate pass
// (tests/run.sh qa-gate also builds the scene without QA_OK and expects --gate to exit 3)
const CFG = { dur: 6, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'blue', filter: 'none', grain: 0, vignette: 0.2, saturation: 1.0, contrast: 1.0,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -30, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [{ t: 0, p: [0, 1.8, 7], l: [0, 1.0, 0], fov: 50 }, { t: 6, p: [1, 1.8, 7], l: [1, 1.0, 0], fov: 50, e: 'inOut' }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Gate', STATS = [];
const END = { t: 5.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 1, text: '*Gate*' };
// deliberate exceptions: [substring or /regex/ of the warning line, reason] — matching lines print as QA-OK and do not count
const QA_OK = [
  [/BACKWARD – .* moves [\d.]+ m\/s against the way it faces/, 'moonwalk gag: the dancer slides backwards on purpose']
];
