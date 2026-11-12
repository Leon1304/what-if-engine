// faces test (v2.40.5): every expression in close-ups, smooth changes, react() faces, automatic reactions to an explosion and a counter drop, lips without voice (talk)
const CFG = { dur: 30, seed: 5, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 2.0, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const XS = ['calm', 'happy', 'scared', 'angry', 'shout', 'sad', 'surprised', 'smug', 'annoyed', 'disgust', 'confused', 'nervous', 'relieved', 'determined', 'panic', 'deadpan', 'cry', 'blush', 'sweat', 'happy+blush'];
const BEATS = [{ t: 0, dur: 0.2, text: ' ', instant: true }];
const CAM = [
  ...shot('close', 0, 12, 'you', { az: 0, dist: 2.6, h: 0.05, dy: 1.68, fy: 0.45, move: 'static', tr: 'cut', hand: 0 }),
  ...shot('close', 12, 3, 'steve', { az: 20, h: 0.1, dy: 1.68, fy: 0.45, move: 'push', tr: 'cut' }),
  ...shot('macro', 15, 3, 'you', { az: -25, h: 0, dy: 1.68, fy: 0.45, move: 'static', tr: 'cut' }),
  ...shot('close', 18, 6, 'you', { az: 10, h: 0.05, dy: 1.68, fy: 0.45, move: 'static', tr: 'cut' }),
  ...shot('close', 24, 3, 'zed', { az: 0, h: 0.05, dy: 1.6, fy: 0.45, move: 'static', tr: 'cut', dist: 3 }),
  ...shot('close', 27, 3, 'astro', { az: -15, h: 0.05, dy: 1.7, fy: 0.45, move: 'static', tr: 'cut', dist: 3 })];
const SHAKES = [], FLASHES = [], SKY = [[0, 'day']], PHASES = t => 'Faces', STATS = [{ label: 'Hope', value: t => t < 19.5 ? 100 : t < 20.5 ? 100 - (t - 19.5) * 80 : 20, show: 18, hide: 24, up: 'good' }];
const END = { t: 29.9, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [] };
const THUMB = { t: 2, text: '*Faces*' };
