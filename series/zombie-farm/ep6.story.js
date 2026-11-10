const CFG = {
  dur: 56.6, seed: 7, locale: 'en-US', badge: 'What if', accent: '#FFD23F',
  filter: 'film', grain: 0.045, vignette: 0.4, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.7, coverT: 1.4,
  capPos: 'mid', karaoke: true, wordRate: 0.085, voice: 'deep',
  series: { name: 'Zombie Farm', handle: '@whatifthishappenedscenarios', ep: 6, next: 'the next series',
    prev: { q: 'Tractor’s running. Where *now?*', opts: ['Hay-bale fortress', 'Keep driving'], pick: 1, dur: 3.3 } },
  cast: {}, transition: 'auto'
};
const LIVE = {};

const BEATS = [
  { t: 0, dur: 3.3, text: 'You chose to *keep driving.*', say: 'You chose to keep driving. Bold.' },
  { t: 3.35, dur: 3.4, text: 'Sunrise. *Zero zombies.*' },
  { t: 6.8, dur: 3.4, text: 'Fuel: _low._ Vibes: *high.*', say: 'Fuel: low. Vibes: high.' },
  { t: 10.25, dur: 3.5, text: 'I’m not even worried. I’m *tired.*' },
  { t: 13.8, dur: 4.0, who: 'steve', text: '“Drive in *zigzags.* Saves fuel, bro.”' },
  { t: 17.85, dur: 3.6, text: 'It does not. _Thanks, Steve._' },
  { t: 21.5, dur: 3.5, text: 'Fuel: _zero._ Middle of a *corn field.*', say: 'Fuel: zero. Middle of a corn field.' },
  { t: 25.05, dur: 3.0, text: 'And that’s when it got *worse.*' },
  { t: 28.15, dur: 3.6, text: 'The corn was _full of zombies._ Big *L.*' },
  { t: 31.85, dur: 3.6, text: 'No fuel, no plan. *NPC behavior.*' },
  { t: 35.55, dur: 3.6, text: 'They close in. *It’s so over.*' },
  { t: 39.25, dur: 3.8, pos: 'low', text: 'Gerald? *Flew away.* Chickens can’t fly.' }
];

const CAM = [
  ...shot('mid', 0, 3.3, 'tractor', { az: 60, dist: 12, h: 3 }),
  ...shot('wide', 3.3, 3.45, 'tractor', { az: 150, dist: 30, h: 14 }),
  ...shot('close', 6.75, 3.45, 'driver', { az: 90, dist: 4.4 }),
  ...shot('mid', 10.2, 3.55, 'tractor', { az: 70, dist: 10, h: 3.5 }),
  ...shot('close', 13.75, 4.05, 'driver', { az: 90, dist: 4.5 }),
  ...shot('wide', 17.8, 3.65, 'tractor', { az: 120, dist: 20, h: 14 }),
  ...shot('mid', 21.45, 3.55, [4, 1, 24], { az: 110, dist: 10, h: 5 }),
  ...shot('mid', 25.0, 3.1, [4, 1, 24], { az: 90, dist: 9, h: 3, tr: 'cut' }),
  ...shot('wide', 28.1, 3.7, [4, 0, 24], { az: 0, dist: 22, h: 16 }),
  ...shot('close', 31.8, 3.7, 'driver', { az: 90, dist: 3.2, h: 2.2 }),
  ...shot('mid', 35.5, 3.7, [4, 1, 24], { az: 90, dist: 6, h: 5 }),
  ...shot('close', 39.2, 3.95, 'gerald', { az: 90, dy: 0.5, dist: 4.5, h: 0.2, fy: 0.42, tr: 'dip' }),
  ...shot('wide', 43.1, 13.5, [4, 0, 24], { az: 20, dist: 40, h: 22 })
];
const SLOWMO = [{ t: 25.4, dur: 1.0, rate: 0.3, catch: 0.5 }];
const SHAKES = [{ t: 25.1, amp: 0.45, dur: 0.9 }, { t: 35.6, amp: 0.25, dur: 2.5 }];
const FLASHES = [{ t: 3.3, dur: 0.2, a: 0.3 }, { t: 25.0, dur: 0.35, a: 0.5 }, { t: 38.3, dur: 1.0, a: 1, color: '#000000' }];
const SKY = [[0, 'dawn'], [8, 'golden'], [22, 'golden'], [25.4, 'dusk'], [31, 'night'], [56, 'night']];
const PHASES = t => 'Day 2 · ' + clockText(t, 0, CFG.dur, '06:40', '21:15');
const STATS = [
  { label: 'Fuel', keys: [[0, 34], ['b2+0.4', 34], ['b2+1.2', 18], ['b5+0.4', 18], ['b5+1.4', 6], ['b6+0.2', 6], ['b6+0.8', 0]], fmt: 'pct', show: 'b1', bad: true, up: 'good' },
  { label: 'Zombies', value: t => LIVE.zombies ? LIVE.zombies(t) : 0, show: 'b7', up: 'bad', pop: false },
  { label: 'Survival', keys: [[0, 70], ['b5+0.4', 70], ['b5+1.4', 60], ['b6+0.4', 60], ['b6+1.2', 35], ['b7+0.3', 35], ['b7+1.0', 10], ['b8+0.6', 10], ['b8+1.4', 3], ['b9+0.6', 3], ['b9+1.4', 1], ['b10+0.8', 1], ['b10+1.8', 0]], fmt: 'pct', show: 'b1', up: 'good' },
  { label: 'Gerald streak', keys: [[0, 5], [40.5, 5], [40.9, 6]], show: 'b2', up: 'good' }
];
const END = {
  t: 43.15, ending: { type: 'dead', n: 4, of: 4, title: 'Keep driving' }, cta: 'What would you have done?',
  say: 'You didn’t make it. Ending four of four.',
  review: { t: 47.5, stars: 2, title: 'Tractor road trip', text: 'Great views. Zero fuel.', by: 'You', foot: 'Gerald found this helpful', say: 'Two stars. Great views. Zero fuel. What would you have done? Drop it in the comments.' }
};
const AUDIO = {
  mood: 'action', music: 0.55, sfx: 0.95,
  sections: [[0, 2], [3.3, 2], [10.2, 1], [13.75, 2], [17.8, 3], [21.45, 1], [25.0, 3], [31.8, 2], [35.5, 3], [38.3, 0], [39.2, 1], [43.15, 1]],
  hits: [
    { t: 0, k: 'engine', dur: 21, v: 0.7 }, { t: 0, k: 'boom', v: 0.6 }, { t: 7.0, k: 'coin', v: 0.4 }, { t: 15.6, k: 'whoosh', v: 0.5 },
    { t: 19.5, k: 'alarm', v: 0.35 }, { t: 21.0, k: 'glitch', v: 0.5 }, { t: 23.5, k: 'riser', dur: 1.5 }, { t: 25.0, k: 'impact' },
    { t: 25.3, k: 'horde', dur: 6, v: 0.9 }, { t: 25.5, k: 'groan', v: 0.8 }, { t: 33.0, k: 'heartbeat' }, { t: 36.0, k: 'horde', dur: 2.3, v: 1 },
    { t: 38.3, k: 'boom', v: 0.6 }, { t: 39.6, k: 'whoosh' }, { t: 40.6, k: 'ding' }, { t: 43.15, k: 'stinger' }
  ]
};
