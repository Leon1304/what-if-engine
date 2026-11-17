// v3.52 live mode for the game krimi/ (tests/live-pick): a small room with pickable() things (one tiny → 44 px hull), two standpoints (liveViews), inspect, highlight,
// an event on the game clock (bin lid, liveSince), a note with liveText (live.lang) and an actor (liveActor / live.say). The page opens on the last frame (start: 'end').
const CFG = { dur: 6, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.04, vignette: 0.35, saturation: 1.05, contrast: 1.05,
  shadows: true, area: 20, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.5, coverT: 2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', gore: 'goo',
  live: { autoplay: false, loop: false, start: 'end', bounds: [-2.5, 0, -2, 2.5, 2.7, 1.95] } };
const LIVE = {};   // scene → probe: lid, note, actor
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'live', big: true, instant: true }];
const CAM = [...shot('wide', 0, 6, [0, 0.8, 0], { az: 0, dist: 3.5, h: 1.4, fov: 50, move: 'static' })];   // ignored in live mode (orbit camera), kept for the cover / QA
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'Live';
const STATS = [];
const END = { t: 5.4, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [] };
