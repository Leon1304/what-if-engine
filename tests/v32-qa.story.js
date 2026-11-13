// v3.2 look QA test — EXPECTED warnings (node render.mjs v32-qa.html --audit): QA: EMPTY (shot 2, bare sky), QA: CAMCLIP (shot 3, the lens 0.25 m in front of a wall),
// QA: HEADCUT (shot 4, a close-up aimed at the chest). Shot 1 and the cover are normal and must stay quiet. The smoke test only fails on page errors.
const CFG = { dur: 12.5, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'blue', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', clouds: false };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: "look QA", big: true, instant: true }];
const CAM = [
  ...shot('mid', 0, 3, [0, 1.2, 0], { az: 25, dist: 7, h: 1, fov: 46, move: 'static', tr: 'cut' }),          // normal: figure and a house
  { t: 3, p: [0, 1.8, 30], l: [0, 60, -40], fov: 40, cut: true }, { t: 6, p: [0, 1.8, 30], l: [0, 60, -40], fov: 40 },   // EMPTY: nothing but sky
  { t: 6, p: [10.3, 1.5, 2.45], l: [9.6, 1.5, -6], fov: 46, cut: true }, { t: 9, p: [10.3, 1.5, 2.45], l: [9.6, 1.5, -6], fov: 46 },   // CAMCLIP: lens 0.25 m from a wall
  ...shot('close', 9, 3.2, [20, 1.2, 0], { az: 0, dist: 1.6, h: 0, fy: 0.5, fov: 34, move: 'static', dof: 0 })   // HEADCUT: aimed at the chest, the head runs out at the top
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'QA';
const STATS = [];
const END = { t: 12.2, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 12.5, 'farm', 0.5]] };
const THUMB = { t: 1.2, text: '*Look* test' };
