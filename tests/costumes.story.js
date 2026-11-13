// v3.18 costumes: figure({ costume: name }) / char('you', { outfit: name }) for the topic list — all of them in rows, one walking
const CFG = { dur: 9, seed: 16, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'green', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: -30, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [{ t: 0, p: [-3.3, 1.3, 2.6], l: [-3.3, 1.0, 0], fov: 50 }, { t: 3, p: [-2.9, 1.3, 2.6], l: [-2.9, 1.0, 0], fov: 50 },
  { t: 3, cut: true, p: [2.5, 1.3, 2.6], l: [2.5, 1.0, 0], fov: 50 }, { t: 6, p: [2.9, 1.3, 2.6], l: [2.9, 1.0, 0], fov: 50 },
  { t: 6, cut: true, p: [10.5, 1.3, 3.0], l: [10.5, 1.0, 0], fov: 50 }, { t: 9, p: [10.2, 1.3, 3.0], l: [10.2, 1.0, 0], fov: 50 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Costumes', STATS = [];
const END = { t: 8.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 1, text: '*Costumes*' };
