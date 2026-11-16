// v3.44 focus HUD + caption chunks + highlight rule (checked in tests/run.sh with --probe):
//   - no badge, no clock; at most ONE counter on screen, only while it counts (+ statHold) — the countdown at its start and its last seconds, 'Fuel' only while it drops
//   - captions in 2–4-word chunks (never ending on a function word, '17 km' stays together), in the safe zone (lower middle);
//     the close-up of 'hero' (shot 2): its caption never dodges onto the forehead ('high'), v3.45 (a face hit always weighs more than the torso)
//   - '*The air*' → THE stays white, AIR in colour; beat 2's '*isn't*' is a highlight on a function word only → exactly one QA: CAPHL (waived below)
const CFG = { dur: 12, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [
  { t: 0.2, dur: 3.6, text: 'The rock is doing _17 km_ per second, and *the air* burns.' },
  { t: 4.0, dur: 3.8, text: 'It *isn’t* the rock that gets you. It’s the heat.' },
  { t: 8.0, dur: 3.6, text: 'Four million people think it’s a *shooting star.*' }
];
const CAM = [
  ...shot('wide', 0, 4, [0, 1.5, 0], { az: 20, dist: 18, h: 3, move: 'static', tr: 'cut' }),
  ...shot('close', 4, 4, 'hero', { az: 0, dist: 2.8, h: 0.1, fov: 36, fy: 0.42, move: 'static', tr: 'cut', dof: 0, hand: 0 }),   // framed explicitly: the torso fills the safe zone (independent of the shot() defaults)
  ...shot('wide', 8, 4, [0, 1.5, 0], { az: -30, dist: 16, h: 4, move: 'static', tr: 'cut' })
];
const QA_OK = [['QA: CAPHL', 'tests/overlay-hud: beat 1 has the function-word highlight on purpose']];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => clockText(t, 0, CFG.dur, '07:42', '07:44');
const STATS = [
  { label: 'Impact in', type: 'timer', until: 10, show: 0.5, hide: 11 },
  { label: 'Fuel', keys: [[0, 80], [3, 80], [4, 40]], fmt: 'pct', show: 0.5 }
];
const END = { t: 11.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0.9, hits: [] };
const THUMB = { t: 1.0, text: '*HUD* test' };
