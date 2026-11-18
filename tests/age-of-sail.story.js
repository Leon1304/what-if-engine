// v3.55 Age of Sail warship (Trafalgar 1805): gunDeck() with navalGun() recoil / smoke / port beams, hatch climb, powderMagazine() with the fearnought screen and the light room,
// cartridgeCase() + cartridge(), ship('firstrate') with broadside(), costumes powderboy + sailor1805; AMB gundeck / hold / seabattle, SFX gunrun / felt
const CFG = { dur: 12, seed: 1805, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'blue', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.0, contrast: 1.05,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: 40, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [{ t: 0, p: [0.6, 3.6, 8.5], l: [3.6, 3.0, 0.5], fov: 54 }, { t: 3, p: [0.6, 3.5, 7.8], l: [3.6, 3.0, 0.5], fov: 54 },
  { t: 3, cut: true, p: [2001.1, 1.35, -0.9], l: [1999.9, 1.0, 1.4], fov: 58 }, { t: 6, p: [2001.0, 1.3, -0.8], l: [1999.9, 1.0, 1.4], fov: 58 },
  { t: 6, cut: true, p: [-1040, 14, 40], l: [-1000, 8, 0], fov: 50 }, { t: 9, p: [-1042, 14, 36], l: [-1000, 8, 0], fov: 50 },
  { t: 9, cut: true, p: [1.7, 3.9, -0.4], l: [1.7, 3.0, 2.3], fov: 52 }, { t: 12, p: [1.7, 3.9, -0.2], l: [1.7, 3.0, 2.3], fov: 52 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Trafalgar', STATS = [];
const END = { t: 11.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { style: 'orchestral', score: [[0, 'tense']], music: 0.3, sfx: 0.8, amb: [[0, 3, 'gundeck', 0.6], [3, 6, 'hold', 0.6], [6, 9, 'seabattle', 0.5], [9, 12, 'gundeck', 0.6]], hits: [{ t: 4, k: 'felt' }, { t: 5, k: 'gunrun' }] };
const THUMB = { t: 1, text: '*Powder*' };
