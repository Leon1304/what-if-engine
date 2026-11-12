const CFG = {
  dur: 58.0, seed: 61, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'green', filter: 'film',
  grain: 0.04, vignette: 0.38, saturation: 1.1, contrast: 1.05, shadows: true, area: 30, renderScale: 0.75, msaa: 2,
  sunAz: -35, handheld: 0.6, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: 'deep', gore: 'off',
  series: { name: 'Monsters Are Back', handle: '@whatifthishappenedscenarios', ep: 1, next: 'part 2' },
  steveTitle: 'Shark Expert (owns a shark-tooth necklace)',
  cast: { you: { shirt: '#F2F2F2', pants: '#2E9E5A', hairStyle: 'short', hat: null, hatStyle: null, top: 'tank' } }, transition: 'auto'
};
const LIVE = {};
const BEATS = [
  { t: 0, dur: 5.2, kick: 'What if …', text: 'a *Megalodon* was in your pool… with _60 seconds_ of air?', say: 'What if a Megalodon was in your pool… with sixty seconds of air?', big: true, instant: true },
  { t: 5.2, dur: 3.4, text: 'Holiday. Pool villa. *One extra guest.*' },
  { t: 8.6, dur: 5.4, text: 'Rule one: don’t touch the water. Rule two: your float is _leaking._' },
  { t: 14.0, dur: 4.7, text: 'It’s *bigger than the pool.* The tail hangs out the back.' },
  { t: 18.7, dur: 5.4, who: 'steve', text: '“Sharks hate splashing, bro. *Splash like crazy.*”', say: 'Sharks hate splashing, bro. Splash like crazy. Trust the science, bro.' },
  { t: 24.1, dur: 4.1, text: 'Splashing sounds like *hurt prey.* Nobody asked, Steve.', stamp: 'wrong', stampAt: 0.5 },
  { t: 28.2, dur: 3.9, text: 'And the pool is about to *lose an argument.*' },
  { t: 32.1, dur: 5.1, text: 'Megalodons died out millions of years ago. *This one missed the memo.*' },
  { t: 37.2, dur: 4.3, text: 'Your float _pops._ You jump for the *diving board.*' },
  { t: 41.5, dur: 6.4, text: 'Then the pool wall *cracks.* The water picks the ocean. And takes the shark along.' },
  { t: 47.9, dur: 3.7, text: 'Gerald? Landed softly. *Still on his flamingo.*' }
];
const SLOWMO = [{ t: 39.8, dur: 0.9, rate: 0.3, catch: 0.5 }];
const TEASE = [{ t: 30.9, dur: 0.6, at: 43.0, label: 'Ten seconds later' }];
const CAM = [
  { t: 0, cut: true, tr: 'cut', p: [1.2, 0.75, -1.2], l: [0, 1.95, -3.0], fov: 62, dof: 0 }, { t: 2.6, p: [0.9, 0.85, -1.8], l: [0, 1.95, -3.0], fov: 58, dof: 0 },
  ...shot('close', 2.6, 2.6, 'you', { az: -30, dist: 3.4 }),
  ...shot('wide', 5.2, 3.4, [0, 1.5, 0], { az: 140, dist: 30, move: 'orbit' }),
  ...shot('close', 8.6, 2.6, 'bed', { az: 120, dist: 2.2 }),
  ...shot('mid', 11.2, 2.8, 'you', { az: 20, dist: 6 }),
  ...shot('wide', 14.0, 4.7, [0, 2, 4], { az: 70, dist: 22, h: 0.25, move: 'crane' }),
  ...shot('close', 18.7, 2.7, 'you', { az: -10 }),
  ...shot('mid', 21.4, 2.7, 'gerald', { az: 140, dist: 4 }),
  ...shot('mid', 24.1, 2.2, 'you', { az: -60, dist: 6, h: 0.3 }),
  ...shot('close', 26.3, 1.9, 'shark', { az: 180, dist: 7 }),
  ...shot('mid', 28.2, 3.9, 'bed', { az: 220, dist: 5 }),
  ...shot('wide', 32.1, 2.6, [0, 1.5, 2], { az: -60, dist: 24, move: 'orbit' }),
  ...shot('close', 34.7, 2.5, 'shark', { az: 150, dist: 6 }),
  ...shot('mid', 37.2, 1.05, 'you', { az: -70, dist: 5.5 }),
  ...shot('mid', 38.25, 1.25, 'you', { az: -50, dist: 5, tr: 'cut' }),
  ...shot('mid', 39.5, 2.0, 'you', { az: -40, dist: 6, h: 0.25 }),
  ...shot('wide', 41.5, 3.0, [0, 1, 7], { az: 80, dist: 26, move: 'pull' }),
  ...shot('mid', 44.5, 3.4, [0, 0, 16], { az: 60, dist: 18 }),
  ...shot('close', 47.9, 3.7, 'gerald', { az: 160, dist: 2.6 }),
  ...shot('mid', 51.6, 6.4, 'you', { az: -15, dist: 7.5, h: 0.12, move: 'push' })
];
const SHAKES = [{ t: 0, amp: 0.15, dur: 0.5 }, { t: 25.3, amp: 0.25, dur: 0.5 }, { t: 40.0, amp: 0.3, dur: 0.6 }, { t: 42.0, amp: 0.5, dur: 1.4 }];
const FLASHES = [{ t: 42.0, dur: 0.2, a: 0.3 }];
const SKY = [[0, 'day']];
const PHASES = t => t < 41.5 ? 'Pool villa' : 'Pool villa (former)';
const STATS = [
  { label: 'Float air', fmt: 'clock', keys: [[0, 60], [5.2, 57], [28.2, 15], [38.0, 0]], show: 'b1', up: 'good', crit: 20 },
  { label: 'Gerald streak', keys: [[0, 10], [49.0, 10], [49.4, 11]], show: 'b1+1' }
];
const RULER = { label: 'Shark vs. pool', show: 'b3', hide: 'b4', min: 0, max: 20, fmt: 'dist', keys: [[14.2, 0], [17.4, 15]], marks: [[10, 'Pool'], [15, 'Shark+']] };
const END = { t: 51.6, q: 'Which monster comes back *next?*', opts: ['A T. rex in the city', 'Mammoths at the mall', 'A kraken in the harbor'], say: 'What would you have done? Most votes decides part two.', loop: 'Next morning, the pool is full again —' };
const AUDIO = {
  score: [[0, 'tense'], [5.2, 'chill'], [8.6, 'tense'], [18.7, 'funny'], [24.1, 'action'], [32.1, 'funny'], [37.2, 'action'], [44.5, 'triumph']],
  music: 0.45, sfx: 0.85, ambVol: 0.7,
  sections: [[0, 1], [5.2, 1], [14.0, 2], [24.1, 3], [32.1, 1], [37.2, 3], [47.9, 1]],
  amb: [[0, 2.6, 'underwater', 0.5], [2.6, 58.0, 'ocean', 0.5]],
  hits: [{ t: 0, k: 'boom' }, { t: 9.0, k: 'pop', v: 0.4 }, { t: 15.0, k: 'impact', v: 0.4 }, { t: 24.3, k: 'splash' }, { t: 24.8, k: 'splash' }, { t: 25.3, k: 'whoosh' },
    { t: 30.6, k: 'riser', dur: 1.2 }, { t: 38.0, k: 'pop' }, { t: 39.9, k: 'heartbeat', dur: 1.2 }, { t: 42.0, k: 'crack' }, { t: 42.3, k: 'splash' }, { t: 49.2, k: 'ding' }, { t: 51.6, k: 'stinger' }]
};
const THUMB = [
  { t: 1.2, text: '_60 seconds_ of air', cam: { p: [1.4, 0.55, -0.4], l: [0, 2.0, -3.0], fov: 64 }, expr: 'panic', rays: true },
  { t: 16.5, text: 'It doesn’t *fit*', cam: { p: [16, 6, 12], l: [0, 1.5, 3], fov: 46 }, expr: 'panic', glow: true }
];
