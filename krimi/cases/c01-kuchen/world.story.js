// Red String – Fall 1 „Der Kuchen ist weg“ (krimi/cases/c01-kuchen): the kitchen of the club house as a live world for the game.
// The scene clock runs the reconstruction (15:00–15:20 in 40 s, the true sequence); its last frame is the crime scene the player examines
// (CFG.live.start: 'end'). Clues are born at their `born` second (case.json) and lie in the last frame exactly where they are found.
const CFG = { dur: 40, seed: 11, locale: 'en-US', kind: 'story', badge: 'Case File', accent: 'orange', filter: 'film', grain: 0.025, vignette: 0.3, saturation: 1.04, contrast: 1.04,
  shadows: true, area: 40, renderScale: 1, msaa: 0, motionBlur: false, sunAz: -35, handheld: 0, coverT: 39.5, karaoke: false, voice: false, series: null, cast: {}, transition: 'cut', autoCut: false, endCard: 'quick',
  live: { autoplay: false, loop: false, start: 'end', maxW: 1600, bounds: [-2.45, 0.025, -1.95, 2.45, 2.62, 1.95], view: 'v_entry' } };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
// cameras for the reconstruction as a video (teaser / QA); the game uses the orbit camera instead
const CAM = [
  ...shot('wide', 0, 4, [0.2, 0.9, -0.6], { az: -40, dist: 3.4, h: 1.2, fov: 50, move: 'static' }),
  ...shot('mid', 4, 4, [-0.9, 1.0, -1.2], { az: 20, dist: 1.6, h: 0.3, fov: 45, move: 'push' }),
  ...shot('mid', 8, 4.4, [-0.3, 0.7, -0.9], { az: -20, dist: 2.2, h: 0.5, fov: 45, move: 'static' }),
  ...shot('mid', 12.4, 6, [0.2, 0.3, -0.9], { az: -35, dist: 2.0, h: 0.8, fov: 45, move: 'static' }),
  ...shot('mid', 18.4, 7, [1.8, 0.6, -0.4], { az: -60, dist: 2.4, h: 0.6, fov: 48, move: 'static' }),
  ...shot('mid', 25.4, 6, [1.0, 0.5, -1.0], { az: -30, dist: 2.4, h: 0.8, fov: 48, move: 'static' }),
  ...shot('wide', 31.4, 8.6, [0.0, 0.9, -0.4], { az: -55, dist: 3.6, h: 1.2, fov: 50, move: 'static' })];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Case 1', STATS = [];
const END = null;
const AUDIO = { style: 'jazz', score: [[0, 'chill']], music: 0.2, sfx: 1, hits: [] };
const THUMB = { t: 39.5, text: '*Case 1*' };
