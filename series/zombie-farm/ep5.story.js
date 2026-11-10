const CFG = {
  dur: 56.2, seed: 7, locale: 'en-US', badge: 'What if', accent: '#FFD23F',
  filter: 'film', grain: 0.045, vignette: 0.4, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.7, coverT: 1.4,
  capPos: 'mid', karaoke: true, wordRate: 0.085, voice: 'deep',
  series: { name: 'Zombie Farm', handle: '@whatifthishappenedscenarios', ep: 5, next: 'the other endings',
    prev: { q: 'Tractor’s running. Where *now?*', opts: ['Hay-bale fortress', 'Keep driving'], pick: 0, dur: 3.3 } },
  cast: {}, transition: 'auto'
};
const LIVE = {};
const F = [1.4, 19];

const BEATS = [
  { t: 0, dur: 3.3, text: 'You chose the *fortress.*', say: 'You chose the fortress. Made of hay.' },
  { t: 3.35, dur: 3.4, text: 'Forty bales. One wall. *Zero doors.*' },
  { t: 6.8, dur: 3.4, text: 'Night two. They *found you.*' },
  { t: 10.25, dur: 3.5, text: 'Zombies can’t climb. They just *push.*' },
  { t: 13.8, dur: 4.0, who: 'steve', text: '“Zombies can’t see *yellow.* Wave at them!”' },
  { t: 17.85, dur: 3.6, text: 'They see yellow. _Thanks, Steve._' },
  { t: 21.5, dur: 3.5, text: 'I stopped hoping. *Respectfully.*' },
  { t: 25.05, dur: 3.0, text: 'And that’s when it got *worse.*' },
  { t: 28.15, dur: 3.6, text: 'Dry hay. Lightning. *Who could’ve guessed.*' },
  { t: 31.85, dur: 3.6, text: 'The wall burns. _They walk right in._' },
  { t: 35.55, dur: 3.6, text: 'No plot twist this time. *RIP.*', say: 'No plot twist this time. R.I.P.' },
  { t: 39.25, dur: 3.8, pos: 'low', text: 'Gerald? Sat in the fire. *Unbothered.*' }
];

const CAM = [
  ...shot('mid', 0, 3.3, [F[0], 1.6, F[1] - 1], { az: 15, dist: 14, h: 5.5 }),
  ...shot('wide', 3.3, 3.45, [F[0], 0, F[1]], { az: 30, dist: 26, h: 22 }),
  ...shot('close', 6.75, 3.45, 'farmer', { az: 180 }),
  ...shot('mid', 10.2, 3.55, [F[0], 1.5, F[1] - 7], { az: 0, dist: 10, h: 6 }),
  ...shot('close', 13.75, 4.05, 'farmer', { az: 150 }),
  ...shot('mid', 17.8, 3.65, [F[0] - 2, 1.5, F[1] - 9], { az: 0, dist: 9, h: 3 }),
  ...shot('mid', 21.45, 3.55, [F[0], 1.5, F[1] - 3.5], { az: -90, dist: 13, h: 3.5 }),
  ...shot('mid', 25.0, 3.1, [F[0], 3, F[1] - 2], { az: 40, dist: 18, h: 6, tr: 'cut' }),
  ...shot('mid', 28.1, 3.7, [F[0], 2, F[1] - 2], { az: 120, dist: 14, h: 5 }),
  ...shot('mid', 31.8, 3.7, [F[0], 1, F[1]], { az: 30, dist: 12, h: 7 }),
  ...shot('close', 35.5, 3.7, 'farmerIn', { az: 20, dist: 4.5 }),
  ...shot('close', 39.2, 3.95, 'gerald', { az: 0, dy: 1.0, dist: 4.5, h: 0.2, fy: 0.42, tr: 'dip' }),
  ...shot('wide', 43.1, 13.1, [F[0], 0, F[1] - 2], { az: 20, dist: 40, h: 22 })
];
const SLOWMO = [{ t: 25.25, dur: 1.0, rate: 0.3, catch: 0.5 }];
const SHAKES = [{ t: 0, amp: 0.2, dur: 0.6 }, { t: 25.2, amp: 0.55, dur: 1.0 }];
const FLASHES = [{ t: 3.3, dur: 0.2, a: 0.3 }, { t: 25.0, dur: 0.15, a: 0.5 }, { t: 25.2, dur: 0.4, a: 0.7, color: '#DDE8FF' }, { t: 38.3, dur: 1.0, a: 1, color: '#000000' }];
const SKY = [[0, 'dusk'], [6.8, 'night'], [25.0, 'night'], [25.6, 'storm'], [55, 'storm']];
const PHASES = t => 'Night 2 · ' + clockText(t, 0, CFG.dur, '21:40', '03:10');
const STATS = [
  { label: 'Zombies', value: t => LIVE.zombies ? LIVE.zombies(t) : 0, show: 'b2', up: 'bad', pop: false },
  { label: 'Hay bales', value: t => LIVE.bales ? LIVE.bales(t) : 40, show: 'b1', up: 'good' },
  { label: 'Survival', keys: [[0, 40], ['b3+0.8', 40], ['b3+1.8', 32], ['b5+0.4', 32], ['b5+1.4', 18], ['b7+0.2', 18], ['b7+1.0', 8], ['b8+0.6', 8], ['b8+1.4', 4], ['b9+0.6', 4], ['b9+1.4', 1], ['b10+0.8', 1], ['b10+1.8', 0]], fmt: 'pct', show: 'b1', up: 'good' },
  { label: 'Gerald streak', keys: [[0, 4], [40.5, 4], [40.9, 5]], show: 'b2', up: 'good' }
];
const END = {
  t: 43.15, ending: { type: 'dead', n: 3, of: 4, title: 'The fortress' }, cta: 'What would you have done?',
  say: 'You didn’t make it. Ending three of four.',
  review: { t: 47.5, stars: 1, title: 'Hay-bale fortress', text: 'Warm. Way too warm.', by: 'You', foot: 'Gerald found this helpful', say: 'One star. Warm. Way too warm. What would you have done? Drop it in the comments.' }
};
const AUDIO = {
  mood: 'horror', music: 0.55, sfx: 0.95,
  sections: [[0, 1], [3.3, 1], [10.2, 2], [17.8, 3], [21.45, 1], [25.0, 3], [31.8, 3], [35.5, 2], [38.3, 0], [39.2, 1], [43.15, 1]],
  hits: [
    { t: 0, k: 'boom' }, { t: 4.0, k: 'wind', dur: 3, v: 0.5 }, { t: 6.9, k: 'horde', dur: 3, v: 0.6 },
    { t: 9.0, k: 'riser', dur: 1.2 }, { t: 10.2, k: 'impact' }, { t: 11.0, k: 'crack', v: 0.6 }, { t: 12.6, k: 'crack', v: 0.6 },
    { t: 17.9, k: 'groan', v: 0.8 }, { t: 19.0, k: 'crack', v: 0.6 }, { t: 21.0, k: 'crack', v: 0.6 }, { t: 22.8, k: 'crack', v: 0.6 },
    { t: 23.5, k: 'riser', dur: 1.5 }, { t: 25.0, k: 'thunder' }, { t: 25.4, k: 'fire', dur: 17, v: 0.8 },
    { t: 31.9, k: 'horde', dur: 4.5, v: 0.9 }, { t: 37.0, k: 'heartbeat' }, { t: 38.3, k: 'boom', v: 0.6 }, { t: 40.6, k: 'ding' }, { t: 43.15, k: 'stinger' }
  ]
};
