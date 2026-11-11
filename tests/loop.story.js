const CFG = { dur: 8.4, seed: 3, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'lime', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.4, coverT: 1.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, cast: {}, transition: 'auto',
  series: { name: 'Loop Test', handle: '@test', ep: 1 } };   // v2.23 test: smooth loop — the hook's pre-roll dissolves in over the last 0.6 s (shot at 8 s is mid-dissolve)
const LIVE = {};
const BEATS = [
  { t: 0, dur: 2.4, kick: 'What if …', text: 'your house *walked away?*', big: true, instant: true },
  { t: 2.45, dur: 1, text: 'It *left.*' }];
const CAM = [
  ...shot('wide', 0, 2.5, [0, 2, 0], { az: 20, dist: 14, h: 4, move: 'push', tr: 'cut' }),
  ...shot('mid', 2.45, 2.55, [2, 1.4, 4], { az: -40, dist: 6, h: 1.2, move: 'orbit', turn: 0.4 }),
  ...shot('wide', 5, 3.4, [0, 2, 0], { az: 35, dist: 15, h: 4.5, move: 'pull' })];   // ends near the hook framing → the dissolve reads as one move
const SHAKES = [], FLASHES = [], SKY = [[0, 'golden']], PHASES = t => 'Day 1', STATS = [{ label: 'Steps', value: t => Math.round(t * 40), show: 1, up: 'bad' }];
const END = { t: 3.5, q: 'Follow it or *let it go?*', opts: ['Follow', 'Let go'], cta: 'Comment A or B', say: 'What would you have done?', loop: 'Which is why you should never ask —' };
const AUDIO = { mood: 'funny', music: 0.4, sfx: 1, hits: [{ t: 0, k: 'boom' }], amb: [[0, 8.4, 'farm', 1]] };
const THUMB = { t: 1, text: 'My house *left*' };
