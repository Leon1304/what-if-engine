const CFG = { dur: 14, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'green', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const MW = (ox, oy, oz, ry, lx, ly, lz) => [ox + lx * Math.cos(ry) + lz * Math.sin(ry), oy + ly, oz - lx * Math.sin(ry) + lz * Math.cos(ry)];   // room-local → world
const CAM = [
  { t: 0, p: [0, 1.7, 9], l: [0, 1.4, 0], fov: 52 }, { t: 3, p: [1.2, 1.6, 0.6], l: [-3.5, 1.2, 1.9], fov: 58 },   // fly into the living room, the door opens on a lit hall
  { t: 3, cut: true, p: [0.4, 1.6, -2.0], l: [0, 1.5, 3], fov: 60 }, { t: 4.5, p: [-0.4, 1.6, -2.0], l: [0, 1.6, 3], fov: 60 },   // inside: front wall + ceiling instead of sky and grass
  { t: 4.5, cut: true, p: MW(30, 0, 0, 0.3, 0, 1.7, 3.2), l: MW(30, 0, 0, 0.3, 0, 1.6, -4), fov: 62 }, { t: 6.5, p: MW(30, 0, 0, 0.3, 1.5, 1.7, 2.6), l: MW(30, 0, 0, 0.3, -5.5, 1.5, 2.5), fov: 62 },   // museum: paintings, cases, then the doorway
  { t: 6.5, cut: true, p: MW(-20, 2.5, 0, 0.6, 1.5, 1.6, 1.8), l: MW(-20, 2.5, 0, 0.6, -2, 1.2, -2.5), fov: 62 }, { t: 8, p: MW(-20, 2.5, 0, 0.6, 1.0, 1.6, 1.8), l: MW(-20, 2.5, 0, 0.6, -2, 1.2, -2.5), fov: 62 },   // raised, rotated kitchen
  { t: 8, cut: true, p: [16, 12, 58], l: [0, 0, 40], fov: 50 }, { t: 10, p: [12, 10, 60], l: [0, 0, 40], fov: 50 },   // plaza
  { t: 10, cut: true, p: [2.5, 1.7, 50], l: [0, 1.2, 54.6], fov: 50 }, { t: 12, p: [1.5, 1.6, 51], l: [0, 1.2, 54.6], fov: 50 },   // house: door opens on a hall
  { t: 12, cut: true, p: [30, 1.7, 27.5], l: [30, 1.6, 18], fov: 60 }, { t: 14, p: [31, 1.7, 27.4], l: [30, 1.6, 18], fov: 60 }   // camera outside → the gallery stays open (cut-away)
];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Interiors v3.2', STATS = [];
const END = { t: 13.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'chill', music: 0.25, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Test*' };
