// v3.17 hand-over from Blender: movable parts (obj.parts, openDoor, animate), anchors (obj.at / dir / path / lights), walk surface (asset … { walk: true }), camera path (camPath)
const CFG = { dur: 12, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'green', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
// bunker at x 2, z -4, turned 0.35 rad (scene.js); the Blender path flies up to its door, placed with the bunker via track('bunker')
const CAM = [{ t: 0, p: [17, 7, 14], l: [2, 2, -2], fov: 50 }, { t: 2.6, p: [15, 6.5, 15], l: [2, 2, -2], fov: 50, e: 'inOut' },
  ...camPath('bunker_door_in', 2.6, { at: 'bunker' }),
  { t: 5.63, cut: true, p: [-6, 8.5, 10], l: [1, 5.6, -3], fov: 48 }, { t: 8.6, p: [-5.5, 8.6, 10.5], l: [1, 5.6, -3], fov: 48 },
  ...shot('mid', 8.6, 3.4, 'hatch', { az: 200, dist: 7, h: 0.4, dy: -0.4, move: 'static' })];   // back hatch (faces −z, bunker turned 0.35 rad)
const SHAKES = [], FLASHES = [], SKY = [[0, 'golden']], PHASES = t => 'Hand-over', STATS = [];
const END = { t: 11.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 0, hits: [] };
const THUMB = { t: 1, text: '*Bunker*' };
