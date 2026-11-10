const CFG = {
  dur: 60.2, seed: 7, locale: 'en-US', badge: 'What if', accent: '#FFD23F',
  filter: 'film', grain: 0.045, vignette: 0.4, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.7, coverT: 1.0,
  capPos: 'mid', karaoke: true, wordRate: 0.085, voice: 'deep',
  series: { name: 'Zombie Farm', handle: '@whatifthishappenedscenarios', ep: 1, next: 'part 2' },
  cast: {}, transition: 'auto'
};
const LIVE = {};

const BEATS = [
  { t: 0, dur: 3.4, kick: 'What if …', text: 'zombies attacked your *farm?*', big: true, instant: true },
  { t: 3.5, dur: 3.8, text: 'Your farm: 1~house, 1~silo, *0~plan.*', say: 'One house, one silo, zero plan.' },
  { t: 7.45, dur: 3.95, text: 'Zombies are *slow.* But _relentless._' },
  { t: 11.55, dur: 3.75, text: 'And you? *Lowkey* panicking.' },
  { t: 15.45, dur: 4.45, who: 'steve', text: '“Walk like a zombie. *Zero~sus.*”' },
  { t: 20.05, dur: 3.95, text: 'They were not fooled. _Thanks, Steve._' },
  { t: 24.15, dur: 3.75, text: 'The fence? *A few minutes,* max.' },
  { t: 28.05, dur: 3.35, text: 'And that’s when it got *worse.*' },
  { t: 31.55, dur: 3.75, text: 'Barn on _fire._ You? *Cooked.*' },
  { t: 35.45, dur: 3.95, text: 'Plot twist: zombies *can’t climb ladders.*' },
  { t: 39.55, dur: 3.85, text: 'Silo top. *Main character energy.*' },
  { t: 43.55, dur: 3.9, pos: 'low', text: 'Gerald? Survived. *Built different.*' }
];

const CAM = [
  { t: 0, p: [3.6, 2.6, -12.6], l: [2, 0.9, -26], fov: 50 },
  { t: 3.45, p: [3.1, 2.25, -14.6], l: [2, 1.0, -26], fov: 46, e: 'out' },
  { t: 3.45, cut: true, p: [30, 31, 40], l: [0, 0, -4], fov: 44 },
  { t: 7.4, p: [-24, 27, 44], l: [0, 0, -4], fov: 44, e: 'inOut', around: [0, -4] },
  { t: 7.4, cut: true, p: [4.2, 2.4, -5.8], l: [1.5, 1.1, -20], fov: 50 },
  { t: 11.5, p: [3.7, 2.1, -7.6], l: [1.5, 1.1, -20], fov: 47, e: 'lin' },
  ...shot('close', 11.5, 3.9, 'farmerA', { az: 120, dist: 6, h: 0.4, tr: 'zoom' }),
  ...shot('close', 15.4, 4.6, 'farmerA', { az: 150, dist: 5, h: 0.4 }),
  { t: 20.0, cut: true, tr: 'whip', p: [-1.9, 2.6, 7.6], l: [-0.9, 1.0, -6], fov: 46 },
  { t: 24.1, p: [-1.6, 2.4, 6.0], l: [-0.8, 1.0, -8], fov: 44, e: 'lin' },
  ...shot('close', 24.1, 3.9, [1.5, 1.1, -12.4], { az: 0, dist: 4.5, h: 0.3 }),
  { t: 28.0, cut: true, tr: 'cut', p: [14.5, 6.2, 6.5], l: [-3, 1, -9.5], fov: 50 },
  { t: 31.5, p: [13, 6.8, 4.5], l: [-3.2, 1, -9.8], fov: 47, e: 'lin' },
  ...shot('mid', 31.5, 3.9, [7, 3, -5], { az: 60, dist: 16, h: 3 }),
  { t: 35.4, cut: true, tr: 'whip', p: [25, 3.5, 6], l: [10.5, 6.5, -5.5], fov: 50 },
  { t: 39.5, p: [23, 13, 7.5], l: [9.5, 4.5, -6.2], fov: 50, e: 'inOut' },
  ...shot('close', 39.5, 4.0, 'farmer', { az: -120, tr: 'zoom' }),
  ...shot('close', 43.5, 4.05, 'gerald', { az: 30, dy: 1.0, dist: 4.5, h: 0.2, fy: 0.42, tr: 'whip' }),
  { t: 47.55, cut: true, p: [-24, 24, 38], l: [2, 0, -3], fov: 46 },
  { t: 60.2, p: [-29, 30, 45], l: [2, 0, -3], fov: 46, e: 'out' }
];
const SLOWMO = [{ t: 28.4, dur: 1.0, rate: 0.3, catch: 0.5 }];
const SHAKES = [{ t: 0, amp: 0.22, dur: 0.7 }, { t: 28.3, amp: 0.3, dur: 0.6 }, { t: 29.8, amp: 0.55, dur: 1.0 }];
const FLASHES = [{ t: 3.45, dur: 0.2, a: 0.35 }, { t: 28.0, dur: 0.25, a: 0.45 }, { t: 29.8, dur: 0.4, a: 0.6, color: '#FFB070' }, { t: 35.4, dur: 0.18, a: 0.25 }];
const SKY = [[0, 'night'], [47, 'night'], [58, 'dawn']];
const PHASES = t => 'Night 1 · ' + clockText(t, 0, CFG.dur, '23:47', '05:52');
const STATS = [
  { label: 'Zombies', value: t => LIVE.zombies ? LIVE.zombies(t) : 0, show: 'b1', up: 'bad', pop: false },
  { label: 'Fence', keys: [[0, 100], [28.3, 100], [29.6, 0]], fmt: 'pct', show: 'b2', hide: 'b9', bad: true, up: 'good' },
  { label: 'Survival', keys: [[0, 64], ['b3+0.4', 64], ['b3+1.2', 58], ['b5+0.6', 58], ['b5+1.4', 41], [28.3, 41], [29.8, 12], ['b8+1.0', 12], ['b8+1.8', 8], ['b9+1.2', 8], ['b9+2.2', 60], ['b10+0.6', 60], ['b10+1.6', 81]], fmt: 'pct', show: 'b1', up: 'good' },
  { label: 'Gerald streak', keys: [[0, 0], [45.0, 0], [45.4, 1]], show: 'b2', up: 'good' }
];
const END = {
  t: 47.6, q: 'Silo, cellar or tractor – where do *you* hide?', opts: ['Silo', 'Cellar', 'Tractor'], cta: 'Most votes decides part 2',
  say: 'Silo, cellar or tractor? What would you have done? Drop it in the comments.',
  review: { t: 54.6, stars: 1, title: 'Zombies on my farm', text: 'Barn: gone. Vibes: immaculate.', by: 'You', foot: 'Gerald found this helpful', say: 'One star. Barn gone. Vibes immaculate.' }
};
const AUDIO = {
  mood: 'horror', music: 0.55, sfx: 0.95,
  sections: [[0, 1], [3.45, 1], [7.4, 2], [11.5, 1], [15.4, 2], [20.0, 3], [24.1, 2], [28.0, 3], [35.4, 2], [39.5, 2], [43.5, 1], [47.6, 1]],
  hits: [
    { t: 0, k: 'boom' }, { t: 0.15, k: 'horde', dur: 3.0, v: 0.55 }, { t: 5.2, k: 'groan', v: 0.5 }, { t: 7.6, k: 'horde', dur: 3.6, v: 0.8 },
    { t: 12.5, k: 'heartbeat' }, { t: 18.0, k: 'groan', v: 0.6 }, { t: 20.1, k: 'horde', dur: 3.8, v: 0.9 }, { t: 24.6, k: 'crack', v: 0.5 },
    { t: 26.4, k: 'riser', dur: 1.6 }, { t: 26.9, k: 'crack', v: 0.6 }, { t: 28.0, k: 'impact' }, { t: 28.35, k: 'crack' }, { t: 28.9, k: 'crack' },
    { t: 29.8, k: 'boom' }, { t: 29.85, k: 'fire', dur: 14, v: 0.7 }, { t: 31.6, k: 'alarm', v: 0.3 }, { t: 33.4, k: 'ticks', dur: 2.0 },
    { t: 36.2, k: 'ding', v: 0.6 }, { t: 45.2, k: 'ding' }, { t: 47.6, k: 'stinger' }
  ]
};
