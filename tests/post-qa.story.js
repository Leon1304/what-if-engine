// v3.44 post-FX QA test — EXPECTED (node render.mjs post-qa.html --audit): QA: LINES + QA: BLOCKY (shot 2: tilt-shift with the old 16-tap blur, CFG.blurLegacy,
// stamps a row of 28 tiny, very hot lamps in the blurred top of the frame into dotted rows and the wall grid into blocks),
// QA: FRINGE (shot 3: hard shake with CFG.fringeMax: 8 → wide colour fringes), QA: WASHOUT (shot 4: a white veil in front of the lens fades out over 0.8 s after the flash).
// Shot 1 stays quiet. tests/run.sh also renders a copy without blurLegacy / fringeMax / washVeil: then all four must be gone (smooth blur, capped fringes, short flashes).
const CFG = { dur: 12.5, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'blue', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', clouds: false,
  blurLegacy: true, fringeMax: 8, washVeil: true };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'post QA', big: true, instant: true }];
const CAM = [
  ...shot('mid', 0, 3, [0, 1.2, 0], { az: 25, dist: 7, h: 1, fov: 46, move: 'static', tr: 'cut' }),                                     // normal: figure and a house
  { t: 3, p: [0, 3, 25], l: [0, 3, 0], fov: 45, cut: true, mini: 1, fy: 0.5 }, { t: 6, p: [0, 3, 25], l: [0, 3, 0], fov: 45, mini: 1, fy: 0.5 },   // LINES + BLOCKY: lamps and wall grid in the blurred top
  { t: 6, p: [-6, 4, 14], l: [0, 1.2, 0], fov: 46, cut: true, mini: 0 }, { t: 9, p: [-6, 4, 14], l: [0, 1.2, 0], fov: 46 },                    // FRINGE: shake
  { t: 9, p: [6, 3, 12], l: [0, 1.2, 0], fov: 46, cut: true }, { t: 12.5, p: [6, 3, 12], l: [0, 1.2, 0], fov: 46 }                    // WASHOUT: flash + veil
];
const SHAKES = [{ t: 6.05, amp: 0.9, dur: 3 }], FLASHES = [{ t: 9.6, dur: 0.3, a: 0.9 }];
const SKY = [[0, 'day']];
const PHASES = t => 'QA';
const STATS = [];
const END = { t: 12.2, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 12.5, 'farm', 0.5]] };
const THUMB = { t: 1.2, text: '*Post* test' };
