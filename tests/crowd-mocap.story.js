// crowd-mocap test (v3.8): horde members move with the mocap clips (walk, zombie walk, idle, flee → jog), behaviour layers on top; o.mocap: false = own poses
const CFG = { dur: 12, seed: 4, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 20, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [{ t: 0, p: [7, 1.3, 1], l: [0, 0.8, 1], fov: 50 }, { t: 5, p: [7, 1.3, 0], l: [0, 0.8, 0], fov: 50 }, { t: 5.01, cut: true, p: [22, 1.8, 8], l: [20, 0.9, 0], fov: 50 }, { t: 12, p: [22, 1.8, 7], l: [20, 0.9, 0], fov: 50 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Crowd mocap', STATS = [];
const END = { t: 11.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 2, text: '*Crowd*' };
