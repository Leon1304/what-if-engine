const CFG = {
  dur: 56.2, seed: 7, locale: 'en-US', badge: 'What if', accent: '#FFD23F',
  filter: 'film', grain: 0.045, vignette: 0.4, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.7, coverT: 1.4,
  capPos: 'mid', karaoke: true, wordRate: 0.085, voice: 'deep',
  series: { name: 'Zombie Farm', handle: '@whatifthishappenedscenarios', ep: 3, next: 'the other endings',
    prev: { q: 'Silo, cellar or tractor – where do *you* hide?', opts: ['Silo', 'Cellar', 'Tractor'], pick: 0, dur: 3.3 } },
  cast: {}, transition: 'auto'
};
const LIVE = {};

const BEATS = [
  { t: 0, dur: 3.3, text: 'You chose the *silo.*', say: 'You chose the silo. Please, stay up there.' },
  { t: 3.35, dur: 3.4, text: 'Day~1. Food: *corn.* Only corn.', say: 'Day one. Food: corn only.' },
  { t: 6.8, dur: 3.4, text: 'Zombies: _400._ Ladder: *pulled up.*', say: 'Zombies: four hundred. Ladder: pulled up.' },
  { t: 10.25, dur: 3.5, text: 'Day~20. *No cap,* thriving.', say: 'Day twenty. No cap, thriving.' },
  { t: 13.8, dur: 4.0, who: 'steve', text: '“Zombies hate *cardio.* Do jumping jacks!”' },
  { t: 17.85, dur: 3.6, text: 'They *copied* you. _Thanks, Steve._' },
  { t: 21.5, dur: 3.5, text: 'Please. Just *sit still.*' },
  { t: 25.05, dur: 3.0, text: 'Day~98. Corn left: _zero._', say: 'Day ninety-eight. Zero corn.' },
  { t: 28.15, dur: 3.0, text: 'And that’s when it got *worse.*' },
  { t: 31.25, dur: 3.6, text: 'Plot twist: zombies *freeze solid.*' },
  { t: 34.95, dur: 3.6, text: 'Day~100. You just *walk out.*', say: 'Day one hundred. You just walk out.' },
  { t: 38.65, dur: 3.8, pos: 'low', text: 'Gerald? Ate the last corn. *Iconic.*' }
];

const CAM = [
  ...shot('wide', 0, 3.3, [10.5, 2, -5.5], { az: 20, dist: 30, h: 16 }),
  ...shot('close', 3.3, 3.45, 'corn', { az: 60, dist: 4.2, h: 0.9, dy: 0.2, fy: 0.66 }),
  ...shot('close', 6.75, 3.45, 'farmer', { az: 34 }),
  ...shot('wide', 10.2, 3.55, [10.5, 0, -5.5], { az: 60, dist: 34, h: 18, tr: 'dip' }),
  ...shot('close', 13.75, 4.05, 'farmer', { az: 34, dist: 5 }),
  ...shot('mid', 17.8, 3.65, [9, 2, -3], { az: 20, dist: 16, h: 5 }),
  ...shot('mid', 21.45, 3.55, [10.5, 6, -5.5], { az: 34, dist: 18, h: -3, move: 'crane', tr: 'dip' }),
  ...shot('close', 25.0, 3.1, 'corn', { az: 60, dist: 3.6, h: 0.9, dy: 0.2, fy: 0.66, tr: 'dip' }),
  ...shot('wide', 28.1, 3.1, [10.5, 2, -5.5], { az: 0, dist: 28, h: 12, tr: 'cut' }),
  ...shot('mid', 31.2, 3.7, [10.5, 0.8, -1.5], { az: 150, dist: 3.5, h: 7 }),
  ...shot('mid', 34.9, 3.7, 'farmerOut', { az: 20, dist: 7, h: 2.5, tr: 'dip' }),
  ...shot('close', 38.6, 3.95, 'gerald', { az: 34, dy: 1.0, dist: 4.5, h: 0.2, fy: 0.42, tr: 'zoom' }),
  ...shot('wide', 42.55, 13.65, [8, 0, -2], { az: 30, dist: 44, h: 22 })
];
const SLOWMO = [{ t: 28.4, dur: 1.0, rate: 0.3, catch: 0.5 }];
const SHAKES = [{ t: 0, amp: 0.2, dur: 0.6 }, { t: 28.1, amp: 0.45, dur: 0.9 }];
const FLASHES = [{ t: 3.3, dur: 0.2, a: 0.3 }, { t: 28.1, dur: 0.4, a: 0.6, color: '#E8F4FF' }];
const SKY = [[0, 'night'], [10.1, 'night'], [10.3, 'day'], [21.4, 'day'], [21.55, 'golden'], [24.9, 'golden'], [25.05, 'dusk'], [28.0, 'dusk'], [28.15, 'storm'], [34.8, 'storm'], [34.95, 'dawn'], [42, 'dawn'], [48, 'day']];
const PHASES = [[0, 'Day 1'], [10.25, 'Day 20'], [21.5, 'Day 64'], [25.05, 'Day 98'], [28.15, 'Day 99'], [34.95, 'Day 100']];
const STATS = [
  { label: 'Zombies', value: t => LIVE.zombies ? LIVE.zombies(t) : 0, show: 'b1', up: 'bad', pop: false },
  { label: 'Zombie fitness', keys: [[0, 12], ['b5+0.2', 12], ['b5+2.0', 94]], fmt: 'pct', show: 'b5', hide: 'b9+1.2', bad: true, up: 'bad' },
  { label: 'Survival', keys: [[0, 50], ['b5+0.4', 50], ['b5+1.4', 33], ['b7+0.2', 33], ['b7+1.0', 14], ['b8+0.2', 14], ['b8+1.0', 5], ['b9+0.8', 5], ['b9+1.8', 60], ['b10+0.6', 60], ['b10+1.6', 100]], fmt: 'pct', show: 'b2', up: 'good' },
  { label: 'Gerald streak', keys: [[0, 2], [39.9, 2], [40.3, 3]], show: 'b2', up: 'good' }
];
const END = {
  t: 42.6, ending: { type: 'survived', n: 2, of: 4, title: 'The silo' }, cta: 'What would you have done?',
  say: 'You survived. Ending two of four.',
  review: { t: 46.7, stars: 5, title: 'Surviving 100 days', text: 'Corn every day. Would not recommend.', by: 'You', foot: 'Gerald found this helpful', say: 'Five stars. Corn every day. Would not recommend. What would you have done? Drop it in the comments.' }
};
const AUDIO = {
  mood: 'epic', music: 0.55, sfx: 0.95,
  sections: [[0, 1], [3.3, 1], [10.2, 2], [17.8, 3], [21.45, 1], [25.0, 1], [28.1, 3], [31.2, 2], [34.9, 3], [38.6, 2], [42.6, 1]],
  hits: [
    { t: 0, k: 'boom' }, { t: 0.2, k: 'horde', dur: 2.6, v: 0.5 }, { t: 3.5, k: 'coin', v: 0.4 }, { t: 8.8, k: 'riser', dur: 1.4 }, { t: 10.2, k: 'impact' },
    { t: 11.6, k: 'groan', v: 0.5 }, { t: 17.85, k: 'horde', dur: 3.6, v: 0.8 }, { t: 18.0, k: 'ticks', dur: 3.3, v: 0.5 },
    { t: 23.5, k: 'wind', dur: 3, v: 0.5 }, { t: 26.6, k: 'riser', dur: 1.5 }, { t: 28.1, k: 'thunder' }, { t: 28.2, k: 'wind', dur: 6.5, v: 0.8 },
    { t: 31.6, k: 'crack', v: 0.6 }, { t: 33.0, k: 'crack', v: 0.5 }, { t: 34.95, k: 'ding', v: 0.5 }, { t: 40.0, k: 'ding' }, { t: 42.6, k: 'stinger' }
  ]
};
