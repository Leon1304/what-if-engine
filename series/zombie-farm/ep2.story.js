const CFG = {
  dur: 54.4, seed: 7, locale: 'en-US', badge: 'What if', accent: '#FFD23F',
  filter: 'film', grain: 0.045, vignette: 0.4, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.7, coverT: 1.2,
  capPos: 'mid', karaoke: true, wordRate: 0.085, voice: 'deep',
  series: { name: 'Zombie Farm', handle: '@whatifthishappenedscenarios', ep: 2, next: 'part 3' },
  cast: {}, transition: 'auto'
};
const LIVE = {};

const BEATS = [
  { t: 0, dur: 3.0, kick: 'What if …', text: 'you hid in the *cellar?*', big: true, instant: true },
  { t: 3.15, dur: 3.6, text: 'You picked the cellar. *Of course* you did.' },
  { t: 6.9, dur: 3.4, text: 'Underground. One~door. _No~Wi-Fi._' },
  { t: 10.45, dur: 3.6, text: 'Zombies can’t open doors. They just *knock.* Forever.' },
  { t: 14.2, dur: 4.2, who: 'steve', text: '“Zombies hate *loud~music.* Play some.”' },
  { t: 18.55, dur: 3.9, text: 'They don’t hate it. They *love* it. _Thanks, Steve._' },
  { t: 22.6, dur: 3.6, text: 'Remember the silo? Safe. Boring. *Alive.*' },
  { t: 26.35, dur: 3.3, text: 'Door: _12%._ Music: *100%.*', say: 'Door: twelve percent. Music: one hundred.' },
  { t: 29.8, dur: 2.8, text: 'And that’s when it got *worse.*' },
  { t: 32.75, dur: 3.6, text: 'Good news: the cellar has a *tunnel.*' },
  { t: 36.5, dur: 3.6, text: 'It leads straight to the *tractor.*' },
  { t: 40.25, dur: 3.6, text: 'Gerald never left the door. *Nobody knows how.*' }
];

const CAM = [
  ...shot('mid', 0, 3.1, [-1.6, 1.0, 4.8], { az: 30, dist: 10, h: 6 }),
  ...shot('wide', 3.1, 3.75, [0, 0, -3], { az: 30 }),
  ...shot('close', 6.85, 3.55, 'farmerIn', { az: 0, tr: 'dip' }),
  ...shot('mid', 10.4, 3.75, [-1.2, 0.9, 3.0], { az: 15, dist: 7, h: 2.6, tr: 'dip' }),
  ...shot('mid', 14.15, 4.35, [150.8, -38.8, -1.0], { az: -30, dist: 4.2, h: 0.3, tr: 'dip' }),
  ...shot('wide', 18.5, 4.05, [-1.2, 0, 0.5], { az: 40, dist: 34, h: 20, tr: 'dip' }),
  ...shot('mid', 22.55, 3.75, [8, 3, -4], { az: 25, dist: 16, h: 5, move: 'crane' }),
  ...shot('close', 26.3, 3.45, [-1.0, 1.1, 2.4], { az: 15, dist: 4.5, h: 0.4 }),
  ...shot('mid', 29.75, 2.95, [150, -38.6, -1.6], { az: 15, dist: 4.4, h: 0.5, tr: 'cut' }),
  ...shot('close', 32.7, 3.75, 'farmerIn', { az: -20, tr: 'zoom' }),
  ...shot('mid', 36.45, 1.5, [1.4, 1, 6.6], { az: 60, dist: 9, h: 2.6, tr: 'dip' }),
  { t: 37.95, cut: true, tr: 'whip', p: [7.5, 1.1, 16.5], l: [2.4, 1.3, 10.8], fov: 48 },
  { t: 40.15, p: [7, 1.6, 17.2], l: [2.0, 1.4, 24], fov: 48, e: 'inOut' },
  ...shot('close', 40.15, 3.85, 'gerald', { az: 0, dy: 0.45, dist: 3.2, h: 0.3, tr: 'zoom' }),
  ...shot('wide', 44.0, 9.6, [0, 0, 6], { az: 8, dist: 46, h: 20 })
];
const SLOWMO = [{ t: 38.0, dur: 0.9, rate: 0.3, catch: 0.5 }];
const SHAKES = [{ t: 0, amp: 0.2, dur: 0.6 }, { t: 29.75, amp: 0.4, dur: 0.8 }, { t: 38.1, amp: 0.35, dur: 0.6 }];
const FLASHES = [{ t: 3.1, dur: 0.2, a: 0.3 }, { t: 29.75, dur: 0.35, a: 0.55 }, { t: 37.95, dur: 0.2, a: 0.3 }];
const SKY = [[0, 'night'], [40, 'night'], [51, 'dawn']];
const PHASES = t => 'Night 2 · ' + clockText(t, 0, CFG.dur, '01:12', '05:41');
const STATS = [
  { label: 'Zombies', value: t => LIVE.zombies ? LIVE.zombies(t) : 0, show: 'b1', up: 'bad', pop: false },
  { label: 'Cellar door', keys: [[0, 100], ['b3+0.4', 100], ['b3+1.6', 74], ['b5+0.2', 74], ['b5+1.2', 51], ['b7+0.2', 51], ['b7+0.9', 12], ['b8+0.1', 12], ['b8+0.7', 3]], fmt: 'pct', show: 'b3', hide: 'b10+2.5', bad: true, up: 'good' },
  { label: 'Survival', keys: [[0, 58], ['b5+0.6', 58], ['b5+1.4', 31], ['b7+0.2', 31], ['b7+0.9', 9], ['b8+0.1', 9], ['b8+0.7', 3], ['b9+0.6', 3], ['b9+1.4', 22], ['b10+1.6', 22], ['b10+2.6', 74]], fmt: 'pct', show: 'b2', up: 'good' },
  { label: 'Gerald streak', keys: [[0, 0], [41.3, 0], [41.7, 1]], show: 'b1', up: 'good' }
];
const END = {
  t: 44.0, q: 'Tractor’s running. Where do *you* go next?', opts: ['Hay-bale fortress', 'Keep driving', 'Back to the silo'], cta: 'Comment A, B or C',
  say: 'Where do you go next? What would you have done? Drop it in the comments.',
  review: { t: 49.8, stars: 2, title: 'Hiding in a cellar', text: 'Great acoustics. Terrible neighbors.', by: 'You', foot: 'Gerald found this helpful', say: 'Two stars. Great acoustics. Terrible neighbors.' }
};
const AUDIO = {
  mood: 'horror', music: 0.55, sfx: 0.95,
  sections: [[0, 1], [3.1, 1], [10.4, 2], [18.5, 3], [22.55, 2], [29.75, 3], [36.45, 3], [40.15, 2], [44.0, 1]],
  hits: [
    { t: 0, k: 'boom' }, { t: 0.2, k: 'horde', dur: 2.6, v: 0.5 }, { t: 2.6, k: 'impact', v: 0.6 },
    { t: 5.0, k: 'groan', v: 0.5 }, { t: 9.0, k: 'riser', dur: 1.4 }, { t: 10.4, k: 'impact' },
    { t: 10.9, k: 'impact', v: 0.35 }, { t: 11.7, k: 'impact', v: 0.35 }, { t: 12.4, k: 'impact', v: 0.4 }, { t: 13.2, k: 'impact', v: 0.4 },
    { t: 16.9, k: 'glitch' }, { t: 18.5, k: 'horde', dur: 3.8, v: 0.8 }, { t: 25.0, k: 'heartbeat' },
    { t: 26.6, k: 'crack' }, { t: 27.8, k: 'crack' }, { t: 28.2, k: 'riser', dur: 1.55 }, { t: 29.75, k: 'boom' }, { t: 30.1, k: 'crack' },
    { t: 33.6, k: 'ding', v: 0.6 }, { t: 36.5, k: 'impact', v: 0.5 }, { t: 36.95, k: 'engine', dur: 6.5, v: 0.85 },
    { t: 38.15, k: 'crack' }, { t: 38.15, k: 'impact' }, { t: 41.5, k: 'ding' }, { t: 44.0, k: 'stinger' }
  ]
};
