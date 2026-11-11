const CFG = {
  dur: 54.55, seed: 11, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'blue',
  filter: 'film', grain: 0.045, vignette: 0.4, saturation: 1.1, contrast: 1.05,
  shadows: true, area: 34, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.7, coverT: 1.0,
  capPos: 'mid', karaoke: true, wordRate: 0.085, voice: 'deep',
  series: { name: 'Earth Glitch', handle: '@whatifthishappenedscenarios', ep: 1, next: 'part 2' },
  steveTitle: 'Gravity Expert (fell off a bike once)',
  cast: {}, statStagger: 0.45, transition: 'auto'
};
const LIVE = {};

const BEATS = [
  { t: 0, dur: 3.0, kick: 'What if …', text: 'gravity turned off for *5~seconds?*', big: true, instant: true, say: 'What if gravity turned off for five seconds?' },
  { t: 3.15, dur: 6.3, text: 'Your backyard just *lifted off.* In five seconds, it all comes down. Where do _you_ land?' },
  { t: 9.6, dur: 5.0, text: 'Let’s slow it down. What goes up comes *down.* Including you.' },
  { t: 14.75, dur: 3.0, text: 'You grab a floating burger. *Priorities.*' },
  { t: 17.9, dur: 4.3, who: 'steve', text: '“Flap your arms. Birds do it *all day.*”', say: 'Flap your arms. Birds do it all day. Trust the science, bro.' },
  { t: 22.35, dur: 4.9, text: 'Nobody asked, Steve. You flap. You *spin.* You go _higher._', stamp: 'wrong', stampAt: 2.3 },
  { t: 27.4, dur: 2.9, text: 'Floating’s easy. *Landing* isn’t.', tone: 'tense' },
  { t: 30.45, dur: 6.0, text: 'Earth spins at *1,600~km/h* — that’s fine. Your floating *pool* isn’t.', say: 'Earth spins at sixteen hundred kilometers an hour. That’s fine. Your floating pool isn’t.' },
  { t: 36.6, dur: 2.2, text: 'Then gravity _remembered_ you.', tone: 'dramatic' },
  { t: 38.95, dur: 5.7, text: 'Twenty-five meters. One trampoline. Over the fence — *into the neighbor’s pool.*', tone: 'excited' },
  { t: 44.8, dur: 3.6, text: 'Gerald never left his chair. *Nobody knows how.*' }
];
const TGV = BEATS[8].t + 0.5;   // gravity comes back (video time = scene time here)
const CEN = t => LIVE.c ? LIVE.c(t) : [-4, 5, 2];

const CAM = [
  { t: 0, p: [2.5, 1.5, 9.8], l: [-3.0, 1.2, 1.5], fov: 54 },
  { t: 3.15, p: [2.0, 1.7, 8.6], l: [-3.2, 1.9, 1.6], fov: 52, e: 'out' },
  ...shot('close', 3.15, 3.0, 'youC', { az: 26, tr: 'zoom' }),
  ...shot('wide', 6.15, 3.45, [0, 4, -1], { dist: 30, h: 9, az: 35, turn: 20 }),
  ...shot('mid', 9.6, 2.5, [-1.8, 2.6, -5.6], { dist: 7, h: 1.2, az: 20, move: 'crane', rise: 2 }),
  { t: 12.1, cut: true, p: [2.5, 1.2, 15], l: CEN, fov: 50, fy: 0.3 },
  { t: 14.75, p: [2.2, 1.0, 13.6], l: CEN, fov: 46, e: 'lin', fy: 0.3 },
  ...shot('close', 14.75, 3.15, 'youC', { az: 26, tr: 'zoom' }),
  ...shot('mid', 17.9, 2.2, 'youC', { az: 50, dist: 6, h: -2, dy: 0.3, dof: 0.4, fy: 0.3 }),
  { t: 20.1, cut: true, tr: 'whip', p: [-3, 9, -9], l: [2, 3, 6], fov: 50 },
  { t: 22.35, p: [-4.5, 10, -8], l: [2, 3.5, 6], fov: 50, e: 'lin', around: [0, 0] },
  ...shot('wide', 22.35, 2.6, 'youC', { dist: 10, h: 1.5, az: 40, dy: 0.3, turn: 18, fy: 0.3 }),
  ...shot('close', 24.95, 2.45, 'youC', { az: 26, dy: 0.3 }),
  { t: 27.4, cut: true, p: t => { const c = CEN(t); return [c[0] + 0.5, c[1] + 3.5, c[2] + 3.5]; }, l: [-4, 0.9, 2], fov: 80, fy: 0.7 },
  { t: 30.3, p: t => { const c = CEN(t); return [c[0] + 0.45, c[1] + 3.2, c[2] + 3.2]; }, l: [-4, 0.9, 2], fov: 76, fy: 0.7, e: 'lin' },
  ...shot('mid', 30.3, 1.9, 'dog', { dist: 5, h: 0.6, az: 30, dy: 0 }),
  { t: 32.2, cut: true, tr: 'whip', p: [26, 36, 30], l: [-1, 12, 0], fov: 48 },
  { t: 34.6, p: [18, 38, 36], l: [-1, 14, 0], fov: 48, e: 'inOut', around: [-1, 0] },
  ...shot('mid', 34.6, 2.0, 'blob', { dist: 13, h: 2.5, az: 25, dy: 2.5 }),
  ...shot('close', 36.6, 2.2, 'youC', { az: 26, dy: 0.3, tr: 'cut' }),
  { t: 38.8, cut: true, tr: 'whip', p: [4.5, 3.4, 11], l: [-3.5, 2.6, 1.5], fov: 52 },
  { t: 40.85, p: [4.0, 3.2, 10.2], l: [-4, 2.6, 1.8], fov: 50, e: 'lin' },
  { t: 40.85, cut: true, tr: 'whip', p: [-8.5, 4.5, 15.5], l: CEN, fov: 50, fy: 0.32 },
  { t: 43.0, p: [-9.5, 4, 14.5], l: CEN, fov: 46, e: 'out', fy: 0.32 },
  ...shot('mid', 43.0, 1.8, 'youC', { az: 25, dist: 6, h: 0.4, dy: 0.5 }),
  ...shot('macro', 44.8, 3.75, 'gerald', { az: 25, dist: 4.0, dy: 0.7, tr: 'zoom' }),
  { t: 48.55, cut: true, tr: 'whip', p: [5.5, 2.4, 13.5], l: [-3, 1.6, 1.5], fov: 50 },
  { t: 54.55, p: [2.5, 1.5, 9.8], l: [-3.0, 1.2, 1.5], fov: 54, e: 'inOut' }
];
const SLOWMO = [{ t: 39.1, dur: 1.0, rate: 0.28, catch: 0.5 }];
const TEASE = [{ t: 'b6+1.2', dur: 0.6, at: 39.6, label: 'At zero' }];
const SHAKES = [{ t: 0, amp: 0.2, dur: 0.6 }, { t: TGV, amp: 0.25, dur: 0.5 }, { t: 38.92, amp: 0.35, dur: 0.6 }, { t: 39.99, amp: 0.3, dur: 0.5 }, { t: 41.85, amp: 0.22, dur: 0.4 }];
const FLASHES = [{ t: TGV, dur: 0.35, a: 0.55, color: '#7FDBFF' }, { t: 41.85, dur: 0.2, a: 0.25 }];
const SKY = [[0, 'day']];
const PHASES = t => t < TGV ? 'Zero-G · slow motion' : 'Gravity: back';
const STATS = [
  { label: 'Gravity back in', type: 'timer', until: TGV, scale: 5 / (TGV - BEATS[1].t), fmt: n => n.toFixed(1) + ' s', big: true, show: 'b1', crit: 1.05, hide: TGV + 3 },
  { label: 'Your height', value: t => LIVE.height ? LIVE.height(t) : 0, fmt: 'height', show: 'b2', up: 'bad', pop: false, hide: 44.5 },
  { label: 'Landing odds', keys: [[0, 80], ['b3+1.6', 80], ['b3+2.2', 74], ['b5+2.0', 74], ['b5+2.6', 45], ['b7+4.6', 45], ['b7+5.2', 31], [TGV, 31], [TGV + 0.6, 6], [39.9, 6], [40.4, 38], [41.7, 38], [42.2, 97]], fmt: 'pct', show: 'b2', up: 'good', crit: 15,
    why: [['b3+2.2', 'burger break'], ['b5+2.6', 'Steve’s advice'], ['b7+5.2', 'pool overhead'], [TGV + 0.6, 'gravity is back'], [40.4, 'trampoline!'], [42.2, 'neighbor’s pool']] },
  { label: 'Gerald streak', keys: [[0, 7], ['b10+0.8', 7], ['b10+1.2', 8]], show: 3 }
];
const END = { t: 48.55, q: 'Which glitch hits *you* next?', opts: ['Earth stops for 1 second', 'The Moon comes twice as close', 'One day lasts a year'], cta: 'Comment A, B or C',
  say: 'What would you have done? Most votes decides part two.', loop: 'So neighbors still ask —' };
const AUDIO = {
  mood: 'tense', music: 0.5, sfx: 0.95,
  score: [[0, 'epic'], [9.6, 'tense'], [17.9, 'funny'], [27.4, 'tense'], [36.6, 'action'], [44.8, 'funny']],
  sections: [[0, 2], [3.15, 1], [9.6, 1], [14.75, 2], [17.9, 1], [22.35, 2], [27.4, 1], [30.45, 2], [36.6, 3], [44.8, 1], [48.55, 1]],
  amb: [[0, 54.55, 'forest', 0.35], [0, TGV + 0.6, 'wind', 0.55]],
  hits: [
    { t: 0, k: 'glitch' }, { t: 0, k: 'boom', v: 0.55 }, { t: 0.12, k: 'whoosh', v: 0.7 }, { t: 27.6, k: 'heartbeat' },
    { t: 33.4, k: 'ticks', dur: 3.6 }, { t: 35.5, k: 'riser', dur: 1.5 }, { t: TGV, k: 'glitch' }, { t: TGV + 0.05, k: 'impact', v: 0.6 },
    { t: TGV + 0.3, k: 'whoosh' }, { t: 38.92, k: 'splash', v: 1 }, { t: 48.55, k: 'stinger' }
  ]
};
const THUMB = [
  { t: 34.4, text: 'Gravity *OFF*', sub: 'Part 1', cam: { p: [4.5, 19.5, 12], l: [-3.2, 24.6, 1.8], fov: 50 }, expr: 'scared', lookCam: true, rays: true },
  { t: 13, text: 'He *never* moved', sub: 'Part 1', cam: { p: [5.4, 0.75, 8.6], l: [2.6, 3.3, 3.2], fov: 52 }, glow: [42, 72, 40], focus: 'gerald', dof: 0.6 }
];
