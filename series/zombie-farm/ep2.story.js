const CFG = {
  dur: 58.4, seed: 7, locale: 'en-US', badge: 'What if', accent: '#FFD23F',
  filter: 'film', grain: 0.045, vignette: 0.4, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.7, coverT: 1.4,
  capPos: 'mid', karaoke: true, wordRate: 0.085, voice: 'deep',
  series: { name: 'Zombie Farm', handle: '@whatifthishappenedscenarios', ep: 2, next: 'the other endings',
    prev: { q: 'Silo, cellar or tractor – where do *you* hide?', opts: ['Silo', 'Cellar', 'Tractor'], pick: 1, dur: 3.3 } },
  cast: {}, transition: 'auto'
};
const LIVE = {};

const BEATS = [
  { t: 0, dur: 3.3, text: 'You chose the *cellar.*', say: 'You chose the cellar. Bold.' },
  { t: 3.4, dur: 3.8, text: 'Underground. One door. _No Wi-Fi._' },
  { t: 7.35, dur: 3.9, text: 'They can’t open doors. They *knock.*' },
  { t: 11.4, dur: 4.4, who: 'steve', text: '“Zombies hate *loud music.* Blast it, bro.”' },
  { t: 15.95, dur: 3.9, text: 'They *vibe* with it. _Thanks, Steve._' },
  { t: 20.0, dur: 4.3, text: 'Door: _12%._ Music: *100%.*', say: 'Door: twelve percent. Music: one hundred.' },
  { t: 24.45, dur: 3.4, text: 'And that’s when it got *worse.*' },
  { t: 28.0, dur: 4.0, text: 'Plot twist: zombies *do* get tired.' },
  { t: 32.15, dur: 4.0, text: 'Six hours of dancing. *Knocked out.*' },
  { t: 36.3, dur: 4.0, text: 'You tiptoe out. *Absolute W.*' },
  { t: 40.45, dur: 4.0, pos: 'low', text: 'Gerald? Partied all night. *Unbothered.*' }
];

const CAM = [
  ...shot('mid', 0, 3.35, [-1.2, 0.9, 3.0], { az: 15, dist: 7, h: 2.6 }),
  ...shot('close', 3.35, 3.95, 'farmerIn', { az: 0, tr: 'dip' }),
  ...shot('close', 7.3, 4.05, [-1.0, 1.1, 2.4], { az: 15, dist: 4.5, h: 0.4, tr: 'dip' }),
  ...shot('mid', 11.35, 4.55, [150.8, -38.8, -1.0], { az: -30, dist: 4.2, h: 0.3, tr: 'dip' }),
  ...shot('wide', 15.9, 4.05, [-1.2, 0, 0.5], { az: 40, dist: 34, h: 20, tr: 'dip' }),
  ...shot('mid', 19.95, 4.45, [-1.4, 0.9, 3.4], { az: -20, dist: 6, h: 1.4 }),
  ...shot('mid', 24.4, 3.55, [150, -38.6, -1.6], { az: 15, dist: 4.4, h: 0.5, tr: 'cut' }),
  ...shot('mid', 27.95, 4.15, [-1.2, 1, 1], { az: 10, dist: 14, h: 9, tr: 'dip' }),
  ...shot('close', 32.1, 4.15, [-1.0, 1.3, 2.0], { az: 15, dist: 4, h: 0.3 }),
  ...shot('mid', 36.25, 4.15, 'farmerOut', { az: 140, dist: 7, h: 2, tr: 'dip' }),
  ...shot('close', 40.4, 4.15, 'gerald', { az: 0, dy: 1.0, dist: 4.5, h: 0.2, fy: 0.42, tr: 'zoom' }),
  ...shot('wide', 44.55, 13.85, [-1.2, 0, 2], { az: 20, dist: 40, h: 20 })
];
const SLOWMO = [{ t: 24.9, dur: 0.9, rate: 0.3, catch: 0.5 }];
const SHAKES = [{ t: 0, amp: 0.2, dur: 0.6 }, { t: 24.4, amp: 0.45, dur: 0.9 }];
const FLASHES = [{ t: 3.35, dur: 0.2, a: 0.3 }, { t: 24.4, dur: 0.35, a: 0.55 }];
const SKY = [[0, 'night'], [30, 'night'], [38, 'dawn'], [47, 'day']];
const PHASES = t => 'Night 1 · ' + clockText(t, 0, CFG.dur, '02:58', '06:40');
const STATS = [
  { label: 'Zombies', value: t => LIVE.zombies ? LIVE.zombies(t) : 0, show: 'b1', up: 'bad', pop: false },
  { label: 'Cellar door', keys: [[0, 100], ['b2+0.6', 100], ['b2+1.6', 74], ['b4+0.2', 74], ['b4+1.2', 51], ['b5+0.2', 51], ['b5+0.9', 12], ['b6+0.3', 12], ['b6+0.9', 3]], fmt: 'pct', show: 'b2', hide: 'b9+1', bad: true, up: 'good' },
  { label: 'Survival', keys: [[0, 55], ['b4+0.4', 55], ['b4+1.4', 31], ['b5+0.2', 31], ['b5+0.9', 12], ['b6+0.3', 12], ['b6+0.9', 4], ['b7+0.8', 4], ['b7+1.8', 30], ['b8+0.8', 30], ['b8+1.8', 60], ['b9+0.8', 60], ['b9+1.8', 100]], fmt: 'pct', show: 'b1', up: 'good' },
  { label: 'Gerald streak', keys: [[0, 1], [41.8, 1], [42.2, 2]], show: 'b2', up: 'good' }
];
const END = {
  t: 44.6, ending: { type: 'survived', n: 1, of: 4, title: 'The cellar' }, cta: 'What would you have done?',
  say: 'You survived. Ending one of four.',
  review: { t: 48.6, stars: 4, title: 'Hiding in a cellar', text: 'Great acoustics. Terrible neighbors.', by: 'You', foot: 'Gerald found this helpful', say: 'Four stars. Great acoustics. Terrible neighbors. What would you have done? Drop it in the comments.' }
};
const AUDIO = {
  mood: 'horror', music: 0.55, sfx: 0.95,
  sections: [[0, 1], [3.35, 1], [7.3, 2], [15.9, 3], [19.95, 2], [24.4, 3], [27.95, 2], [32.1, 1], [36.25, 1], [40.4, 2], [44.6, 1]],
  hits: [
    { t: 0, k: 'boom' }, { t: 0.2, k: 'horde', dur: 2.8, v: 0.5 }, { t: 3.6, k: 'impact', v: 0.4 },
    { t: 7.6, k: 'impact', v: 0.35 }, { t: 8.4, k: 'impact', v: 0.35 }, { t: 9.1, k: 'impact', v: 0.4 }, { t: 9.9, k: 'impact', v: 0.4 },
    { t: 13.9, k: 'glitch' }, { t: 15.95, k: 'horde', dur: 4.0, v: 0.8 }, { t: 20.4, k: 'crack' }, { t: 21.6, k: 'crack' },
    { t: 22.8, k: 'riser', dur: 1.6 }, { t: 24.4, k: 'boom' }, { t: 24.8, k: 'crack' }, { t: 28.4, k: 'groan', v: 0.6 },
    { t: 32.6, k: 'wind', dur: 3, v: 0.4 }, { t: 36.4, k: 'tick', v: 0.4 }, { t: 37.2, k: 'tick', v: 0.4 }, { t: 38.0, k: 'tick', v: 0.4 },
    { t: 41.9, k: 'ding' }, { t: 44.6, k: 'stinger' }
  ]
};
