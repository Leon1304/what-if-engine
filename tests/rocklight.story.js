// v3.58 rock lighthouse kit: rockIsland() with two landing gullies, cliffStairs() (+ storm damage), cliffWave(), lighthouse({ kind: 'stone' }) (optic lit, then out), ship('steamer') with
// whistle, costumes keeper + oilskins, interior kind 'keeper' (range, stopped wall clock, coat pegs with an oilskin, unmade box beds, dresser, lamp), ambience gale / shelter, SFX gull
const CFG = { dur: 15, seed: 55, locale: 'en-US', kind: 'history', accent: 'yellow', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.0, contrast: 1.06,
  shadows: true, area: 80, renderScale: 0.75, msaa: 2, sunAz: -40, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [{ t: 0, p: [95, 34, 92], l: [0, 18, 0], fov: 48 }, { t: 3, p: [88, 32, 88], l: [0, 18, 0], fov: 48 },
  { t: 3, cut: true, p: [22, 38, 16], l: [8.6, 42, -4.6], fov: 44 }, { t: 6, p: [21, 39, 15], l: [8.6, 43, -4.6], fov: 42 },
  { t: 6, cut: true, p: [-58, 10, 26], l: [-64, 8, 0], fov: 52 }, { t: 9, p: [-57, 10, 25], l: [-64, 9, 0], fov: 52 },
  { t: 9, cut: true, p: [118, 9, 30], l: [100, 5, 0], fov: 46 }, { t: 12, p: [116, 9, 28], l: [100, 5, 0], fov: 46 },
  { t: 12, cut: true, p: [401.2, 1.6, 2.2], l: [399.6, 1.3, -1.6], fov: 52 }, { t: 15, p: [401.0, 1.6, 2.0], l: [399.6, 1.3, -1.6], fov: 52 }];
const SHAKES = [{ t: 7.0, amp: 0.3, dur: 0.8 }], FLASHES = [], SKY = [[0, 'storm'], [11.9, 'storm'], [12, 'night']], PHASES = t => 'Eilean Mor, 1900';
const STATS = [];
const END = { t: 14.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { style: 'ambient', score: [[0, 'tense']], sections: [[0, 1]], music: 0.3, sfx: 0.9, amb: [[0, 12, 'gale', 0.6], [12, 15, 'shelter', 0.6]], hits: [{ t: 2, k: 'gull', v: 0.6 }] };
const THUMB = { t: 1, text: '*Rock* light' };
