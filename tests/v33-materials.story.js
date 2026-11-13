const CFG = { dur: 16, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 40, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  ...shot('mid', 0, 0.75, [-6.6, 0.3, 4.2], { az: 0, dist: 6.5, h: 0.6, fov: 40, move: 'static', tr: 'cut' }),     // material presets on balls
  ...shot('mid', 0.75, 0.75, [0, 0.8, 0], { az: 25, dist: 12, h: 1.8, fov: 46, move: 'static', tr: 'cut' }),        // cars, day
  ...shot('mid', 1.5, 1.5, [12, 1, 0], { az: -30, dist: 14, h: 2, fov: 46, move: 'static', tr: 'cut' }),            // van, pickup, bus
  ...shot('mid', 3, 1.5, [60.05, 0.85, 0], { az: 20, dist: 1.3, h: 0.35, fov: 40, move: 'static', tr: 'cut' }),     // fruit on the kitchen table
  ...shot('mid', 4.5, 1.5, [120, 1.2, 0], { az: 25, dist: 18, h: 3, fov: 40, move: 'static', tr: 'cut' }),          // street at dusk
  ...shot('mid', 6, 2, [120, 1.2, 0], { az: 25, dist: 18, h: 3, fov: 40, move: 'static', tr: 'cut' }),            // same street at night
  ...shot('mid', 8, 2, [205, 30, -45], { az: 10, dist: 80, h: -18, fov: 46, move: 'static', tr: 'cut' }),          // searchlights + lighthouse at night
  ...shot('mid', 10, 1, [301, 3, 0], { az: 20, dist: 20, h: 1, fov: 44, move: 'static', tr: 'cut' }),              // UFO tractor beam
  ...shot('mid', 11, 1, [297, 0.8, 5], { az: 40, dist: 9, h: 1.5, fov: 46, move: 'static', tr: 'cut' }),            // flashlight + headlights with their spots
  ...shot('mid', 12, 4, [120, 0, 62], { az: 30, dist: 24, h: 26, fov: 50, move: 'static', tr: 'cut' })];           // city streetlights from above
const SHAKES = [], FLASHES = [], SKY = [[0, 'day'], [4.4, 'day'], [4.5, 'dusk'], [5.9, 'dusk'], [6, 'night']], PHASES = t => 'Materials test', STATS = [];
const END = { t: 15.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'epic', music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 1, text: '*Test*' };
