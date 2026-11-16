// v3.47 Tudor town: tudorHouse rows on a cobbleLane, wall lanterns, a cesspit whose boards come off (fumes, stink lines, flies), a rig climbing down and shovelling,
// a horse cart with barrels driving off, a bucket filling, outfit 'tudor', dress('medieval'), surf 'cobble', SFX creak / shovel / slosh / cart / bell, AMB town
const CFG = { dur: 12, seed: 47, locale: 'en-US', kind: 'history', accent: 'lime', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -30, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [{ t: 0, p: [-1, 6.5, 13], l: [0, 3, -8], fov: 50 }, { t: 3, p: [1, 6, 12], l: [0, 3, -8], fov: 50 },
  { t: 3, cut: true, p: [1.2, 2.2, 4.2], l: [6, 0.6, 0], fov: 52 }, { t: 6, p: [1.0, 2.3, 4.0], l: [6, 0.4, 0], fov: 52 },
  { t: 6, cut: true, p: [6.9, -1.7, 0.9], l: [5.2, -1.5, -0.6], fov: 62 }, { t: 9, p: [6.9, -1.6, 0.9], l: [5.2, -0.9, -0.6], fov: 62 },
  { t: 9, cut: true, p: [-1.4, 2.4, -2], l: [1, 1.2, -9], fov: 50 }, { t: 12, p: [-1.2, 2.4, -3], l: [1, 1.2, -11], fov: 50 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'night']], PHASES = t => 'Tudor', STATS = [{ label: 'Stench', keys: [[0, 10], [4, 10], [5, 90]], fmt: 'pct', show: 0.5 }];
const END = { t: 11.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0.8, amb: [[0, 12, 'town', 0.6]], hits: [{ t: 0.2, k: 'bell', v: 0.6 }, { t: 7.5, k: 'slosh', v: 0.6 }] };
const THUMB = { t: 1, text: '*Tudor* town' };
