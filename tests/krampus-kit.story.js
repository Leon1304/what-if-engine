const CFG = { dur: 10, seed: 72, locale: 'en-US', kind: 'horror', accent: 'red', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.0, contrast: 1.05,
  shadows: true, area: 60, nightLift: 0.4, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
// v3.34: costume 'krampus' (front with glowing eyes, back with basket + cowbells), torch held with Idle_Torch_Loop, costume 'nicholas' with crozier + golden book (opens), treatBoot (treats → switch, coal), birchSwitch
const CAM = [
  { t: 0, p: [0.3, 1.75, 3.4], l: [0, 1.45, 0], fov: 42, cut: true }, { t: 2, p: [0.2, 1.7, 3.2], l: [0, 1.45, 0], fov: 42 },
  { t: 2, p: [-1.6, 1.7, -3.0], l: [0, 1.2, 0], fov: 45, cut: true, tr: 'cut' }, { t: 4, p: [-1.8, 1.6, -3.2], l: [0, 1.2, 0], fov: 45 },
  { t: 4, p: [30.6, 1.7, 3.6], l: [30, 1.4, 0], fov: 45, cut: true, tr: 'cut' }, { t: 6, p: [30.4, 1.7, 3.8], l: [30, 1.4, 0], fov: 45 },
  { t: 6, p: [-29.4, 1.6, 3.6], l: [-30, 1.25, 0], fov: 45, cut: true, tr: 'cut' }, { t: 8, p: [-29.5, 1.6, 3.4], l: [-30, 1.25, 0], fov: 45 },
  { t: 8, p: [60.3, 0.8, 1.5], l: [60.2, 0.22, 0], fov: 40, cut: true, tr: 'cut' }, { t: 10, p: [60.3, 0.78, 1.4], l: [60.2, 0.22, 0], fov: 40 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'dusk'], [10, 'dusk']], PHASES = t => 'Dec 5', STATS = [];
const END = { t: 9.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'tense', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Krampus*' };
