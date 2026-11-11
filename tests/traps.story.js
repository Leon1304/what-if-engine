const CFG = { dur: 29, seed: 6, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'red', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const TT = (i) => 0.8 + i * 1.25;
const K = ['bear', 'pit', 'spikes', 'log', 'pendulum', 'net', 'snare', 'mine', 'flame', 'saw', 'boulder', 'darts', 'cage', 'trapdoor', 'laser', 'electric', 'banana', 'rake', 'gatling', 'rocketT', 'laserT', 'press'];
const CAM = K.flatMap((k, i) => shot('mid', TT(i) - 0.6, 1.25, [i * 14, k === 'log' || k === 'pendulum' || k === 'net' || k === 'snare' || k === 'cage' ? 2 : 1.0, 0], { az: k === 'darts' ? 60 : k === 'boulder' ? 70 : 30, dist: ['gatling', 'rocketT', 'laserT', 'boulder'].includes(k) ? 16 : ['log', 'pendulum', 'net', 'snare', 'cage', 'press'].includes(k) ? 9 : 6.5, h: 1.6, fov: 50, move: 'static', tr: 'cut' }));
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Trap test', STATS = [];
const END = { t: 28.8, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'action', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Test*' };
