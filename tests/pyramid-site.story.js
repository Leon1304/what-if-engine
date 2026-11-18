// v3.57 pyramid builders (Giza, c. 2560 BC): pyramidSite() (courses, plateau, supply ramp, working front), sled({ kind: 'sledge' }) + haul() (gang on two ropes,
// water man on the deck, wet strip), mudbrick() house / bakery / gallery / tombs, splint(), food conebread / beerjar, costumes egyptworker + egyptoverseer,
// backdrop('nile'); AMB worksite, SFX sledge / heave / thud
const CFG = { dur: 12, seed: 2560, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.0, contrast: 1.05,
  shadows: true, area: 50, renderScale: 0.75, msaa: 2, sunAz: 60, fogScale: 2.4, handheld: 0, coverT: 1, capPos: 'low', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [{ t: 0, p: [6, 1.7, 38], l: [0, 1.3, 30], fov: 52 }, { t: 3, p: [6.5, 1.7, 36], l: [0, 1.3, 28], fov: 52 },
  { t: 3, cut: true, p: [70, 8, 150], l: [0, 22, -220], fov: 50 }, { t: 6, p: [66, 8, 148], l: [0, 22, -220], fov: 50 },
  { t: 6, cut: true, p: [6, 51.5, -176], l: [0, 50, -188], fov: 54 }, { t: 9, p: [6.5, 51.5, -177], l: [0, 50, -188], fov: 54 },
  { t: 9, cut: true, p: [1012, 2.4, 14], l: [1000, 1.2, 2], fov: 52 }, { t: 12, p: [1011, 2.4, 13], l: [1000, 1.2, 2], fov: 52 }];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Giza', STATS = [];
const END = { t: 11.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { style: 'middleeast', score: [[0, 'tense']], music: 0.3, sfx: 0.8, amb: [[0, 12, 'worksite', 0.6]], hits: [{ t: 2, k: 'thud' }, { t: 2.5, k: 'heave' }] };
const THUMB = { t: 1, text: '*Pyramid*' };
