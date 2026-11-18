// v3.54 marsh and leeches: pond() (wade in and out, rings, reeds, cattails, lilies, duckweed), leech() (swims, latches on, swells, peeled into a jar), jar(), costume peasant (man + woman), music style folk, ambience marsh, SFX wade / squelch / plop
const CFG = { dur: 15, seed: 54, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'pink', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -40, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [{ t: 0, p: [9, 4.5, 12], l: [0, 0, 0], fov: 50 }, { t: 3, p: [8, 4, 11], l: [0, 0, 0], fov: 50 },
  { t: 3, cut: true, p: [-0.5, 1.1, 2.4], l: [-0.55, 0.03, 1.3], fov: 40, focus: [-0.55, 0.03, 1.3] }, { t: 6, p: [-0.3, 1.05, 2.3], l: [-0.2, 0.03, 1.1], fov: 40, focus: [-0.2, 0.03, 1.1] },
  { t: 6, cut: true, p: [7.6, 0.7, -2.9], l: [5.6, 0.4, -4.6], fov: 35 }, { t: 9, p: [7.5, 0.7, -3.0], l: [5.6, 0.4, -4.6], fov: 33 },
  { t: 9, cut: true, p: [6.6, 0.75, -5.25], l: [5.6, 0.32, -4.68], fov: 42 }, { t: 12, p: [6.55, 0.75, -5.25], l: [5.6, 0.32, -4.68], fov: 40 },
  { t: 12, cut: true, p: [402.2, 1.6, 2.4], l: [399.6, 1.0, -0.8], fov: 50 }, { t: 15, p: [402.0, 1.6, 2.2], l: [399.6, 1.0, -0.8], fov: 50 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Marsh';
const STATS = [{ label: 'Leeches', value: t => LIVE.n ? LIVE.n(t) : 0, show: 6 }];
const END = { t: 14.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { style: 'folk', score: [[0, 'chill']], sections: [[0, 2]], music: 0.4, sfx: 0.9, amb: [[0, 12, 'marsh', 0.6], [12, 15, 'hum', 0.4]], hits: [] };
const THUMB = { t: 1, text: '*Marsh*' };
