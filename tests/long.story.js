const CFG = { dur: 14, seed: 5, locale: 'en-US', kind: 'explain', aspect: '16:9', badge: 'Explaining', accent: 'green', filter: 'film', grain: 0.03, vignette: 0.4, saturation: 0.95, contrast: 1.05,
  shadows: true, area: 50, sunAz: -35, handheld: 0.3, coverT: 2, capPos: 'low', karaoke: false, subtitles: true, wordRate: 0.085, voice: false, cast: {}, transition: 'auto', loop: false };
// v2.30 test: long-video mode — calm HUD, chapter cards, lower-third fact, subtitles split at a comma, timeline without overlaps, night lift, soft spray, wet sand, 2D map card
const LIVE = {};
const BEATS = [
  { t: 0.2, dur: 3.6, text: 'In 1944, the coast was a wall of bunkers, mines and wire, built to stop any landing from the sea.' },
  { t: 4, dur: 3.8, text: 'At night, the beach was quiet, and the only light came from the moon over the water.' },
  { t: 8, dur: 5.6, text: 'On the map, the plan looked simple: cross the Channel, land on five beaches, and push inland.' }];
const CAM = [
  ...shot('wide', 0, 4, [0, 3, 20], { az: 10, dist: 38, h: 9, move: 'push', tr: 'cut' }),
  ...shot('mid', 4, 4, [0, 1, 34], { az: -20, dist: 16, h: 3, move: 'orbit', turn: 0.3 }),
  ...shot('wide', 8, 6, [0, 3, 20], { az: 25, dist: 40, h: 10, move: 'pull' })];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day'], [3.95, 'day'], [4, 'night'], [7.95, 'night'], [8, 'golden']];
const STEPS = [[0, 'The wall'], [4, 'The night'], [8, 'The plan']];
const STATS = [{ label: 'Year', type: 'timeline', from: 1939, to: 1945, fmt: 'year', marks: [[1940, 'France falls'], [1941, 'USSR invaded'], [1943, 'Tehran'], [1944, 'D-Day'], [1945, 'War ends']],
  keys: [[0.5, 1940], [3, 1944]], show: 0.5, hide: 3.6 }];
const FACTS = [{ t: 4.6, dur: 3, big: '~7,000', text: 'ships and boats crossed the Channel', src: 'AP', count: true }];
const MAP2D = [{ t: 8.6, dur: 5.4, region: 'channel', view: [[-1.2, 50.2, 8], [-0.6, 49.7, 5]],
  arrows: [{ pts: [[-1.1, 50.75], [-0.9, 50.1], [-0.7, 49.45]], t0: 9.4, t1: 11, color: '#2F5D9E', label: 'June 6' }],
  pins: [{ at: [-1.09, 50.8], t0: 9.1, label: 'Portsmouth', color: '#2F5D9E' }], areas: [{ pts: [[-1.3, 49.36], [-0.2, 49.34], [-0.2, 49.28], [-1.3, 49.3]], t0: 11, color: '#B3261E', opacity: 0.4, pulse: true }] }];
const END = { t: 13.2, q: 'What surprised you *most?*', opts: ['The wall', 'The night', 'The plan'] };
const AUDIO = { score: [[0, 'none']], music: 0.4, sfx: 0.9, amb: [[0, 14, 'surf', 1]], hits: [] };
const THUMB = { t: 2, text: 'Why *D-Day* happened' };
