const CFG = {
  dur: 54.4, seed: 7, locale: 'en-US', badge: 'What if', accent: '#FFD23F',
  filter: 'film', grain: 0.045, vignette: 0.4, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.7, coverT: 1.2,
  capPos: 'mid', karaoke: true, wordRate: 0.085, voice: 'deep',
  series: { name: 'Zombie Farm', handle: '@whatifthishappenedscenarios', ep: 3, next: 'part 4' },
  cast: {}, transition: 'auto'
};
const LIVE = {};
const F = [1.4, 19];

const BEATS = [
  { t: 0, dur: 3.0, kick: 'What if …', text: 'you built a *hay-bale fortress?*', big: true, instant: true },
  { t: 3.15, dur: 3.6, text: 'Please. I’m begging you. Not the *hay.*' },
  { t: 6.9, dur: 3.4, text: 'Forty bales. One wall. *Zero~doors.*' },
  { t: 10.45, dur: 3.6, text: 'Zombies can’t climb. So they just *push.*' },
  { t: 14.2, dur: 4.2, who: 'steve', text: '“Zombies can’t see *yellow.* Wave at them!”' },
  { t: 18.55, dur: 3.9, text: 'They can see yellow. _Thanks, Steve._' },
  { t: 22.6, dur: 3.6, text: 'Please. Just once. *Make a good choice.*' },
  { t: 26.35, dur: 3.3, text: 'Bales: _33._ Zombies: *too many.*', say: 'Bales: thirty-three. Zombies: too many.' },
  { t: 29.8, dur: 2.8, text: 'And that’s when it got *worse.*' },
  { t: 32.75, dur: 3.6, text: 'Plot twist: zombies *love* a bonfire.' },
  { t: 36.5, dur: 3.6, text: 'They stare. You *tiptoe* out.' },
  { t: 40.25, dur: 3.6, text: 'Gerald sat in the fire. *Unbothered.* Again.' }
];

const CAM = [
  ...shot('mid', 0, 3.1, [F[0], 1.6, F[1] - 1], { az: 15, dist: 14, h: 5.5 }),
  ...shot('close', 3.1, 3.75, 'farmer', { az: 180 }),
  ...shot('wide', 6.85, 3.55, [F[0], 0, F[1]], { az: 30, dist: 26, h: 22 }),
  ...shot('mid', 10.4, 3.75, [F[0], 1.5, F[1] - 7], { az: 0, dist: 9, h: 4 }),
  ...shot('close', 14.15, 4.35, 'farmer', { az: 150 }),
  ...shot('mid', 18.5, 4.05, [F[0] - 2, 1.5, F[1] - 9], { az: 0, dist: 9, h: 3 }),
  ...shot('mid', 22.55, 3.75, [F[0], 1.5, F[1] - 3.5], { az: -90, dist: 13, h: 3.5 }),
  ...shot('close', 26.3, 3.45, [F[0] + 0.5, 1.8, F[1] - 5.5], { az: 0, dist: 6, h: 1.8 }),
  ...shot('mid', 29.75, 2.95, [F[0], 3, F[1] - 2], { az: 40, dist: 18, h: 6, tr: 'cut' }),
  ...shot('close', 32.7, 3.75, [F[0] + 3, 1.6, F[1] - 6.5], { az: 60, dist: 4.5, h: 0.4, tr: 'zoom' }),
  ...shot('mid', 36.45, 3.7, 'farmerOut', { az: 0, dist: 9, h: 3.5 }),
  ...shot('close', 40.15, 3.85, 'gerald', { az: 0, dy: 0.75, dist: 4.5, h: 0.2, tr: 'zoom' }),
  ...shot('wide', 44.0, 10.4, [F[0], 0, F[1] - 4], { az: 20, dist: 40, h: 22 })
];
const SLOWMO = [{ t: 29.95, dur: 1.0, rate: 0.3, catch: 0.5 }];
const SHAKES = [{ t: 0, amp: 0.2, dur: 0.6 }, { t: 29.85, amp: 0.55, dur: 1.0 }];
const FLASHES = [{ t: 3.1, dur: 0.2, a: 0.3 }, { t: 29.75, dur: 0.15, a: 0.5 }, { t: 29.9, dur: 0.4, a: 0.7, color: '#DDE8FF' }, { t: 32.7, dur: 0.2, a: 0.25 }];
const SKY = [[0, 'night'], [29.6, 'night'], [30.4, 'storm'], [45, 'storm'], [53, 'dawn']];
const PHASES = t => 'Night 3 · ' + clockText(t, 0, CFG.dur, '00:31', '05:47');
const STATS = [
  { label: 'Zombies', value: t => LIVE.zombies ? LIVE.zombies(t) : 0, show: 'b1', up: 'bad', pop: false },
  { label: 'Hay bales', value: t => LIVE.bales ? LIVE.bales(t) : 40, show: 'b2', up: 'good' },
  { label: 'Survival', keys: [[0, 46], ['b3+0.8', 46], ['b3+1.8', 38], ['b5+0.4', 38], ['b5+1.4', 21], ['b7+0.2', 21], ['b7+1.0', 12], ['b8+0.2', 12], ['b8+1.0', 4], ['b9+0.8', 4], ['b9+1.8', 35], ['b10+0.8', 35], ['b10+2.4', 81]], fmt: 'pct', show: 'b2', up: 'good' },
  { label: 'Gerald streak', keys: [[0, 1], [41.3, 1], [41.7, 2]], show: 'b1', up: 'good' }
];
const END = {
  t: 44.0, q: 'Fortress gone. What’s *your* plan now?', opts: ['Survive 100 days', 'Hide in the silo', 'Drive to the city'], cta: 'Comment A, B or C',
  say: 'What’s your plan now? What would you have done? Drop it in the comments.',
  review: { t: 49.8, stars: 1, title: 'Hay-bale fortress', text: 'Warm. Way too warm.', by: 'You', foot: 'Gerald found this helpful', say: 'One star. Warm. Way too warm.' }
};
const AUDIO = {
  mood: 'horror', music: 0.55, sfx: 0.95,
  sections: [[0, 1], [3.1, 1], [10.4, 2], [18.5, 3], [22.55, 2], [29.75, 3], [32.7, 2], [36.45, 1], [40.15, 2], [44.0, 1]],
  hits: [
    { t: 0, k: 'boom' }, { t: 0.2, k: 'horde', dur: 2.6, v: 0.5 }, { t: 4.8, k: 'wind', dur: 3, v: 0.5 },
    { t: 9.0, k: 'riser', dur: 1.4 }, { t: 10.4, k: 'impact' }, { t: 10.6, k: 'horde', dur: 3.5, v: 0.75 },
    { t: 11.4, k: 'crack', v: 0.6 }, { t: 13.0, k: 'crack', v: 0.6 }, { t: 18.6, k: 'groan', v: 0.8 }, { t: 19.6, k: 'crack', v: 0.6 },
    { t: 21.8, k: 'crack', v: 0.6 }, { t: 24.3, k: 'crack', v: 0.6 }, { t: 25.0, k: 'heartbeat' }, { t: 26.8, k: 'crack', v: 0.6 },
    { t: 28.2, k: 'riser', dur: 1.55 }, { t: 28.4, k: 'crack', v: 0.6 }, { t: 29.8, k: 'thunder' }, { t: 30.2, k: 'fire', dur: 14, v: 0.75 },
    { t: 36.6, k: 'tick', v: 0.4 }, { t: 37.4, k: 'tick', v: 0.4 }, { t: 38.2, k: 'tick', v: 0.4 }, { t: 41.5, k: 'ding' }, { t: 44.0, k: 'stinger' }
  ]
};
