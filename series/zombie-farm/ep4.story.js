const CFG = {
  dur: 54.4, seed: 7, locale: 'en-US', badge: 'What if', accent: '#FFD23F',
  filter: 'film', grain: 0.045, vignette: 0.4, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.7, coverT: 1.2,
  capPos: 'mid', karaoke: true, wordRate: 0.085, voice: 'deep',
  series: { name: 'Zombie Farm', handle: '@whatifthishappenedscenarios', ep: 4, next: 'season 2' },
  cast: {}, transition: 'auto'
};
const LIVE = {};

const BEATS = [
  { t: 0, dur: 3.0, kick: 'What if …', text: 'you had to survive *100~days?*', big: true, instant: true, say: 'What if you had to survive a hundred days?' },
  { t: 3.15, dur: 3.6, text: 'I don’t even get paid for this. *Day~1.*', say: 'I don’t even get paid for this. Day one.' },
  { t: 6.9, dur: 3.4, text: 'Home: one silo. Food: *corn.* Only corn.' },
  { t: 10.45, dur: 3.6, text: 'Day~20. Zombies: still here. *So are you.*', say: 'Day twenty. Zombies: still here. So are you.' },
  { t: 14.2, dur: 4.2, who: 'steve', text: '“Zombies hate *exercise.* Do jumping jacks!”' },
  { t: 18.55, dur: 3.9, text: 'They copied you. Now they’re *fit.* _Thanks, Steve._' },
  { t: 22.6, dur: 3.6, text: 'Day~64. I stopped caring on *day~12.*', say: 'Day sixty-four. I stopped caring on day twelve.' },
  { t: 26.35, dur: 3.3, text: 'Corn: _3~cobs._ Zombies: *400.*', say: 'Corn: three cobs. Zombies: four hundred.' },
  { t: 29.8, dur: 2.8, text: 'And that’s when it got *worse.*' },
  { t: 32.75, dur: 3.6, text: 'Day~99: it snows. Zombies *freeze solid.*', say: 'Day ninety-nine: it snows. Zombies freeze solid.' },
  { t: 36.5, dur: 3.6, text: 'Day~100. You just *walk out.*', say: 'Day one hundred. You just walk out.' },
  { t: 40.25, dur: 3.6, pos: 'low', text: 'Gerald survived all 100 days. *On corn.*', say: 'Gerald survived all hundred days. On corn.' }
];

const CAM = [
  ...shot('wide', 0, 3.1, [10.5, 2, -5.5], { az: 20, dist: 30, h: 16 }),
  ...shot('close', 3.1, 3.75, 'farmer', { az: 34 }),
  ...shot('close', 6.85, 3.55, 'corn', { az: 60, dist: 4.2, h: 0.9, dy: 0.2, fy: 0.66 }),
  ...shot('wide', 10.4, 3.75, [10.5, 0, -5.5], { az: 60, dist: 34, h: 18, tr: 'dip' }),
  ...shot('close', 14.15, 4.35, 'farmer', { az: 34, dist: 5 }),
  ...shot('mid', 18.5, 4.05, [9, 2, -3], { az: 20, dist: 16, h: 5 }),
  ...shot('mid', 22.55, 3.75, [10.5, 6, -5.5], { az: 34, dist: 18, h: -3, move: 'crane', tr: 'dip' }),
  ...shot('close', 26.3, 3.45, 'corn', { az: 60, dist: 3.6, h: 0.9, dy: 0.2, fy: 0.66, tr: 'dip' }),
  ...shot('wide', 29.75, 2.95, [10.5, 2, -5.5], { az: 0, dist: 28, h: 12, tr: 'cut' }),
  ...shot('mid', 32.7, 3.75, [10.5, 0.8, -1.5], { az: 150, dist: 3.5, h: 7 }),
  ...shot('mid', 36.45, 3.7, 'farmerOut', { az: 20, dist: 7, h: 2.5, tr: 'dip' }),
  ...shot('close', 40.15, 3.85, 'gerald', { az: 34, dy: 1.0, dist: 4.5, h: 0.2, fy: 0.42, tr: 'zoom' }),
  ...shot('wide', 44.0, 10.4, [8, 0, -2], { az: 30, dist: 44, h: 22 })
];
const SLOWMO = [{ t: 30.0, dur: 1.0, rate: 0.3, catch: 0.5 }];
const SHAKES = [{ t: 0, amp: 0.2, dur: 0.6 }, { t: 29.75, amp: 0.45, dur: 0.9 }];
const FLASHES = [{ t: 3.1, dur: 0.2, a: 0.3 }, { t: 29.75, dur: 0.4, a: 0.6, color: '#E8F4FF' }];
const SKY = [[0, 'night'], [10.3, 'night'], [10.5, 'day'], [22.45, 'day'], [22.6, 'golden'], [26.2, 'golden'], [26.35, 'dusk'], [29.7, 'dusk'], [29.85, 'storm'], [36.4, 'storm'], [36.55, 'dawn'], [44, 'dawn'], [50, 'day']];
const PHASES = [[0, 'Day 1'], [10.4, 'Day 20'], [22.55, 'Day 64'], [26.3, 'Day 87'], [29.75, 'Day 99'], [36.45, 'Day 100']];
const STATS = [
  { label: 'Zombies', value: t => LIVE.zombies ? LIVE.zombies(t) : 0, show: 'b1', up: 'bad', pop: false },
  { label: 'Zombie fitness', keys: [[0, 12], ['b5+0.2', 12], ['b5+2.2', 94]], fmt: 'pct', show: 'b5', hide: 'b9+1.2', bad: true, up: 'bad' },
  { label: 'Survival', keys: [[0, 50], ['b5+0.4', 50], ['b5+1.6', 33], ['b7+0.2', 33], ['b7+1.0', 14], ['b8+0.2', 14], ['b8+1.0', 5], ['b9+0.8', 5], ['b9+1.8', 60], ['b10+0.6', 60], ['b10+1.8', 100]], fmt: 'pct', show: 'b2', up: 'good' },
  { label: 'Gerald streak', keys: [[0, 2], [41.3, 2], [41.7, 3]], show: 'b1', up: 'good' }
];
const END = {
  t: 44.0, q: 'Season over. What should *season 2* be?', opts: ['Zombies in the city', 'Zombie dinosaurs', 'You are the zombie'], cta: 'Comment A, B or C',
  say: 'What should season two be? What would you have done? Drop it in the comments.',
  review: { t: 49.8, stars: 5, title: 'Surviving 100 days', text: 'Corn every day. Would not recommend.', by: 'You', foot: 'Gerald found this helpful', say: 'Five stars. Corn every day. Would not recommend.' }
};
const AUDIO = {
  mood: 'epic', music: 0.55, sfx: 0.95,
  sections: [[0, 1], [3.1, 1], [10.4, 2], [18.5, 3], [22.55, 1], [26.3, 2], [29.75, 3], [32.7, 2], [36.45, 3], [40.15, 2], [44.0, 1]],
  hits: [
    { t: 0, k: 'boom' }, { t: 0.2, k: 'horde', dur: 2.6, v: 0.5 }, { t: 6.9, k: 'coin', v: 0.4 }, { t: 9.0, k: 'riser', dur: 1.4 }, { t: 10.4, k: 'impact' },
    { t: 12.0, k: 'groan', v: 0.5 }, { t: 18.5, k: 'horde', dur: 3.8, v: 0.8 }, { t: 18.7, k: 'ticks', dur: 3.5, v: 0.5 },
    { t: 25.0, k: 'wind', dur: 3, v: 0.5 }, { t: 28.2, k: 'riser', dur: 1.55 }, { t: 29.75, k: 'thunder' }, { t: 29.9, k: 'wind', dur: 6.5, v: 0.8 },
    { t: 31.2, k: 'crack', v: 0.6 }, { t: 33.4, k: 'crack', v: 0.5 }, { t: 36.45, k: 'ding', v: 0.5 }, { t: 41.5, k: 'ding' }, { t: 44.0, k: 'stinger' }
  ]
};
