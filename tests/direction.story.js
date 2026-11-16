// v3.44 directing (docs/API.md "Regie"): CFG.autoCut coverage on the narration, reactCut() look → reaction → reverse shot, and the directing QA —
//   expected (tests/run.sh direction): HOOK (frozen first 0.5 s) · PACING for the one cuts: false shot (5.4–9.4 s) · YOU (a "you" line over a close-up of the neighbour)
//   · MISMATCH ("ninety seconds" vs a timer at 01:11) · ENDCARD (END.t 16 with dur 20) — and nothing else; the 1.4–5.4 s shot is split with a cut to 'you' on "you notice"
const CFG = { pacing: true, endCard: 'quick',   // v3.45: explicit, else endAuto picks the full card for END.t 16 of 20
  autoCut: true, dur: 20, seed: 4, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'cyan', filter: 'none', grain: 0, vignette: 0.2, saturation: 1.0, contrast: 1.0,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -30, handheld: 0, coverT: 3, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', qaSparse: false };
const LIVE = {};
const BEATS = [
  { t: 0, dur: 1.3, text: 'What if the *sky* fell?', big: true, instant: true },
  { t: 1.4, dur: 3.9, text: 'Your neighbour waves at the street. And then you notice *the sky.*' },
  { t: 5.4, dur: 3.9, text: 'Everything goes quiet.' },
  { t: 11.8, dur: 2.0, text: 'Now you have *ninety seconds.*' },
  { t: 13.9, dur: 2.0, text: 'Run.' }
];
const CAM = [
  ...shot('wide', 0, 1.4, [0, 1, 0], { az: 20, dist: 22, h: 6, move: 'static' }),                     // frozen hook → HOOK
  ...shot('mid', 1.4, 4.0, 'other', { az: -60, dist: 9, h: 1.2 }),                                       // split by autoCut ("you notice" → 'you')
  ...shot('mid', 5.4, 4.0, 'you', { az: 20, dist: 7, h: 1, cuts: false }),                              // deliberate long take → PACING
  ...reactCut('you', [0, 9, -30], 9.4, { kind: 'startle', face: 1.0, rev: 1.4 }),                      // look → reaction → reverse shot (9.4–11.8)
  ...shot('close', 11.8, 2.0, 'other', { az: 0, move: 'push' }),                                        // "you" over the neighbour's face → YOU
  ...shot('wide', 13.8, 6.2, [0, 1, 0], { az: 60, dist: 30, h: 10, turn: 30 })                          // split by autoCut up to the end card
];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Direction', STATS = [
  { label: 'Impact in', type: 'timer', until: 19, scale: 10, show: 11.9, big: true }                     // shows 01:11 → MISMATCH with "ninety seconds"
];
const END = { t: 16, q: 'Run or *hide?*', opts: ['Run', 'Hide'], cta: 'Comment A or B', loop: 'Which is why we ask —' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 3, text: '*Direction*' };
