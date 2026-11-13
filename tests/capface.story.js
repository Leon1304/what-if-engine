// v3.24 caption-over-face QA test — EXPECTED warning (node render.mjs capface.html --audit): exactly one QA: CAPFACE (shot 1: a close-up whose eyes sit in the frame centre,
// the mid caption "you run a red light" lies across them). Shot 2 is the same close-up with pos: 'low' on its beat and must stay quiet, shot 3 (wide, small faces) too.
// With CFG.capDodge: true (sed in the check) the first caption page moves to the lower third by itself and the line goes away. The smoke test only fails on page errors.
const CFG = { capDodge: false, dur: 9.5, seed: 11, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 7.5, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', clouds: false };
const LIVE = {};
const BEATS = [
  { t: 0.2, dur: 2.6, text: 'You run a red light.' },
  { t: 3.2, dur: 2.6, text: 'Nobody even blinks.', pos: 'low' },
  { t: 6.2, dur: 2.6, text: 'The whole street watches.' }];
const CAM = [
  ...shot('close', 0, 3, 'you', { az: 0, dist: 1.9, h: 0.02, dy: 1.66, fy: 0.5, fov: 40, move: 'static', tr: 'cut', hand: 0, dof: 0 }),   // CAPFACE: eyes in the frame centre
  ...shot('close', 3, 3, 'you', { az: 0, dist: 1.9, h: 0.02, dy: 1.66, fy: 0.5, fov: 40, move: 'static', tr: 'cut', hand: 0, dof: 0 }),   // same, caption low → quiet
  ...shot('wide', 6, 3.5, [0, 1, 0], { az: 30, dist: 14, h: 3, fov: 46, move: 'static', tr: 'cut' })];   // small faces → quiet
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'Captions';
const STATS = [];
const END = { t: 9.2, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [] };
const THUMB = { t: 7.5, text: '*Caption* test' };
