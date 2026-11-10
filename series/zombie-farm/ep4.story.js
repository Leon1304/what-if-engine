const CFG = {
  dur: 57.2, seed: 7, locale: 'en-US', badge: 'What if', accent: '#FFD23F',
  filter: 'film', grain: 0.045, vignette: 0.4, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.7, coverT: 1.4,
  capPos: 'mid', karaoke: true, wordRate: 0.085, voice: 'deep',
  series: { name: 'Zombie Farm', handle: '@whatifthishappenedscenarios', ep: 4, next: 'part 5',
    prev: { q: 'Silo, cellar or tractor – where do *you* hide?', opts: ['Silo', 'Cellar', 'Tractor'], pick: 2, dur: 3.3 } },
  cast: {}, transition: 'auto'
};
const LIVE = {};

const BEATS = [
  { t: 0, dur: 3.3, text: 'You chose the *tractor.*', say: 'You chose the tractor. Sure.' },
  { t: 3.35, dur: 3.4, text: 'Plan: sprint, start, *drive.* Easy.', say: 'Plan: sprint, start, drive. Easy.' },
  { t: 6.8, dur: 3.4, text: 'The tractor: _does not start._' },
  { t: 10.25, dur: 3.5, text: 'I don’t even get *paid* for this.' },
  { t: 13.8, dur: 4.0, who: 'steve', text: '“Tractors start faster if you *yell* at them.”' },
  { t: 17.85, dur: 3.6, text: 'Every zombie *heard it.* _Thanks, Steve._' },
  { t: 21.5, dur: 3.5, text: 'Zombies: _everywhere._ Vibe: *off.*' },
  { t: 25.05, dur: 3.0, text: 'And that’s when it got *worse.*' },
  { t: 28.15, dur: 3.6, text: 'Plot twist: one more yell. *It starts.*' },
  { t: 31.85, dur: 3.6, text: 'Straight through the fence. *Full send.*' },
  { t: 35.55, dur: 3.6, text: 'Sunrise. Open field. *Freedom.*' },
  { t: 39.25, dur: 3.8, pos: 'low', text: 'Gerald? Rode on the hood. *Goated.*' }
];

const CAM = [
  ...shot('mid', 0, 3.3, [1.0, 1, 6.5], { az: 60, dist: 10, h: 3 }),
  ...shot('wide', 3.3, 3.45, [0, 0, 0], { az: 30 }),
  ...shot('close', 6.75, 3.45, 'driver', { az: 20, dist: 4.4 }),
  ...shot('mid', 10.2, 3.55, [3, 1.5, -6], { az: -20, dist: 12, h: 6 }),
  ...shot('close', 13.75, 4.05, 'driver', { az: 20, dist: 4.5 }),
  ...shot('wide', 17.8, 3.65, [2, 0, 1], { az: 20, dist: 30, h: 16 }),
  ...shot('mid', 21.45, 3.55, [2.2, 1.2, 6.2], { az: 120, dist: 9, h: 3 }),
  ...shot('close', 25.0, 3.1, [2.2, 1.8, 6.6], { az: 15, dist: 4.8, h: 0.6, tr: 'cut' }),
  ...shot('close', 28.1, 1.6, 'driver', { az: 20, dist: 4.5, tr: 'cut' }),
  { t: 29.7, cut: true, tr: 'whip', p: [7.0, 1.4, 15.5], l: [2.2, 1.3, 9.0], fov: 50 },
  { t: 31.8, p: [6.5, 1.7, 16.5], l: [1.8, 1.4, 20], fov: 50, e: 'inOut' },
  ...shot('mid', 31.8, 3.7, 'tractor', { az: 40, dist: 10, h: 3 }),
  ...shot('wide', 35.5, 3.7, [1.6, 0, 24], { az: 160, dist: 30, h: 12 }),
  ...shot('close', 39.2, 3.95, 'gerald', { az: 20, dy: 1.0, dist: 4.5, h: 0.2, fy: 0.42, tr: 'zoom' }),
  ...shot('wide', 43.1, 14.1, [1.4, 0, 22], { az: 200, dist: 40, h: 20 })
];
const SLOWMO = [{ t: 29.9, dur: 0.9, rate: 0.3, catch: 0.5 }];
const SHAKES = [{ t: 0, amp: 0.2, dur: 0.6 }, { t: 25.0, amp: 0.45, dur: 0.9 }, { t: 30.0, amp: 0.35, dur: 0.6 }];
const FLASHES = [{ t: 3.3, dur: 0.2, a: 0.3 }, { t: 25.0, dur: 0.35, a: 0.5 }, { t: 28.1, dur: 0.2, a: 0.3 }];
const SKY = [[0, 'night'], [31, 'night'], [36, 'dawn'], [46, 'golden']];
const PHASES = t => 'Night 1 · ' + clockText(t, 0, CFG.dur, '02:58', '06:35');
const STATS = [
  { label: 'Zombies', value: t => LIVE.zombies ? LIVE.zombies(t) : 0, show: 'b1', up: 'bad', pop: false },
  { label: 'Engine', keys: [[0, 0], [7.0, 0], [7.3, 14], [7.8, 0], [8.3, 0], [8.6, 22], [9.1, 0], [16.3, 0], [16.6, 31], [17.2, 0], [28.6, 0], [29.2, 100]], fmt: 'pct', show: 'b2', hide: 'b10', up: 'good', pop: false },
  { label: 'Survival', keys: [[0, 48], ['b2+0.4', 48], ['b2+1.4', 40], ['b5+0.4', 40], ['b5+1.4', 22], ['b6+0.4', 22], ['b6+1.2', 11], ['b7+0.2', 11], ['b7+0.9', 3], ['b8+0.6', 3], ['b8+1.4', 50], ['b9+0.8', 50], ['b9+1.6', 75], ['b10+0.6', 75], ['b10+1.6', 92]], fmt: 'pct', show: 'b1', up: 'good' },
  { label: 'Gerald streak', keys: [[0, 3], [40.5, 3], [40.9, 4]], show: 'b2', up: 'good' }
];
const END = {
  t: 43.15, q: 'Tractor’s running. Where *now?*', opts: ['Hay-bale fortress', 'Keep driving'], cta: 'Most votes decides part 5',
  say: 'Where now? Fortress, or keep driving?',
  review: { t: 47.4, stars: 3, title: 'Escaping by tractor', text: 'Loud. Smelly. Better than walking.', by: 'You', foot: 'Gerald found this helpful', say: 'Three stars. Loud. Smelly. Better than walking. What would you have done? Drop it in the comments.' }
};
const AUDIO = {
  mood: 'action', music: 0.55, sfx: 0.95,
  sections: [[0, 1], [3.3, 2], [6.75, 1], [10.2, 2], [17.8, 3], [21.45, 2], [25.0, 3], [28.1, 3], [35.5, 2], [39.2, 2], [43.15, 1]],
  hits: [
    { t: 0, k: 'boom' }, { t: 0.2, k: 'horde', dur: 2.8, v: 0.5 }, { t: 7.0, k: 'engine', dur: 0.8, v: 0.6 }, { t: 7.8, k: 'glitch', v: 0.4 },
    { t: 8.3, k: 'engine', dur: 0.8, v: 0.6 }, { t: 9.1, k: 'glitch', v: 0.4 }, { t: 11.0, k: 'groan', v: 0.6 }, { t: 16.3, k: 'alarm', v: 0.5 },
    { t: 17.85, k: 'horde', dur: 4.0, v: 0.9 }, { t: 23.5, k: 'riser', dur: 1.5 }, { t: 25.0, k: 'impact' }, { t: 25.3, k: 'groan', v: 0.8 },
    { t: 28.6, k: 'engine', dur: 9, v: 0.9 }, { t: 30.0, k: 'crack' }, { t: 30.0, k: 'impact' }, { t: 36.0, k: 'wind', dur: 3, v: 0.4 },
    { t: 40.6, k: 'ding' }, { t: 43.15, k: 'stinger' }
  ]
};
