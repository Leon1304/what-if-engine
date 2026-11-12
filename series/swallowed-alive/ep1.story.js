const CFG = {
  dur: 57.9, seed: 21, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'cyan', filter: 'film',
  grain: 0.04, vignette: 0.4, saturation: 1.08, contrast: 1.05, shadows: true, area: 30, renderScale: 0.75, msaa: 2,
  sunAz: -30, handheld: 0.6, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: 'deep', gore: 'off',
  series: { name: 'Swallowed Alive', handle: '@whatifthishappenedscenarios', ep: 1, next: 'part 2' },
  steveTitle: 'Ocean Expert (went to an aquarium once)', cast: {}, transition: 'auto'
};
const LIVE = {};
const BEATS = [
  { t: 0, dur: 4.9, kick: 'What if …', text: 'a sperm whale *swallowed* you… with _90 seconds_ of air?', say: 'What if a sperm whale swallowed you… with ninety seconds of air?', big: true, instant: true },
  { t: 4.9, dur: 4.5, text: 'You came for *whale watching.* The whale came for _lunch._' },
  { t: 9.4, dur: 6.2, text: 'One *selfie* over the rail. Only sperm whales can swallow a human. *Lucky you.*' },
  { t: 15.6, dur: 5.4, text: 'No air in here. Only what’s in your *lungs.* And it’s _diving._' },
  { t: 21.0, dur: 5.8, who: 'steve', text: '“Whales breathe through the top. *Climb out the blowhole.*”', say: 'Whales breathe through the top, bro. Climb out the blowhole. Trust the science, bro.' },
  { t: 26.8, dur: 7.1, text: 'The blowhole only goes to the *lungs.* Steve, please. Soon, this whale does something _gross._', stamp: 'wrong', stampAt: 0.6 },
  { t: 33.9, dur: 2.7, text: 'And that’s when it got *worse.*' },
  { t: 36.6, dur: 6.1, text: 'Stomach one: pure *muscle*, built to crush squid. And your air is _almost gone._' },
  { t: 42.7, dur: 6.2, text: 'Squid beaks scratch its stomach. Your *sneakers* scratch worse. So the whale _throws up._' },
  { t: 48.9, dur: 2.7, text: 'Gerald? Still eating *popcorn.*' }
];
const cl = (v, a, b) => Math.min(b, Math.max(a, v)), HZ = t => (t < 15 ? -3 - 1.15 * cl(t, 0, 4.9) : -1 - 0.85 * cl(t - 15.6, 0, 18.4)) - 1.62;   // head of 'you' in the throat (x 2000, y ≈ 300.7)
const thr = (t0, d, kind, o = {}) => { const v = { front: [0.1, 302.5, 1.1, -1.4, 300.3], ahead: [0.3, 302.2, -3.4, 0.7, 300.7], feet: [0, 302.0, 3.4, -1.6, 300.8] }[kind];
  const P = t => [2000 + v[0], v[1], HZ(t) + v[2] * (o.k ? 1 + o.k * (t - t0) / d : 1)], L = t => [2000, v[4], HZ(t) + v[3]];
  return [{ t: t0, cut: true, tr: o.tr ?? 'cut', p: P(t0), l: L(t0), fov: o.fov ?? 54, dof: 0 }, { t: t0 + d, p: P, l: L, fov: (o.fov ?? 54) - 3, dof: 0 }]; };
const CAM = [
  ...thr(0, 2.5, 'front'),
  ...thr(2.5, 2.4, 'ahead', { k: 0.15 }),
  ...shot('wide', 4.9, 2.7, [0, 1, 0], { az: 35, dist: 26, h: 8, tr: 'dip' }),
  ...shot('close', 7.6, 1.8, 'youA', { az: 0, dist: 3.4 }),
  ...shot('mid', 9.4, 2.6, [1.6, 1.0, 0.5], { az: 75, dist: 10, h: 2 }),
  ...shot('mid', 12.0, 2.2, [3.2, 0.4, -1], { az: 55, dist: 15, h: 2.5, tr: 'cut' }),
  { t: 14.2, cut: true, tr: 'whip', p: [2.8, 1.5, 1.6], l: [0.45, 0.95, -0.44], fov: 46 }, { t: 15.6, p: [2.5, 1.4, 1.3], l: [0.45, 0.95, -0.44], fov: 44 },
  ...thr(15.6, 2.8, 'ahead', { tr: 'zoom' }),
  ...thr(18.4, 2.6, 'front'),
  ...thr(21.0, 2.9, 'feet'),
  ...thr(23.9, 2.9, 'front', { fov: 50 }),
  ...thr(26.8, 3.0, 'ahead', { k: 0.2 }),
  ...thr(29.8, 4.1, 'front'),
  { t: 33.9, cut: true, tr: 'cut', p: [4002.6, 302.6, 3.4], l: [4000, 301.2, 0.6], fov: 54 },
  { t: 36.6, p: [4002.2, 302.3, 3.0], l: [4000, 300.9, 0.6], fov: 52 },
  { t: 36.6, cut: true, p: [3997.2, 303.0, 2.6], l: [4000, 300.8, 0.4], fov: 56 },
  { t: 39.6, p: [3996.6, 303.4, 0.4], l: [4000, 300.9, 0.6], fov: 56, around: [4000, 0.6] },
  ...shot('close', 39.6, 3.1, 'youC', { az: 0, dist: 3.0 }),
  ...shot('mid', 42.7, 2.5, 'youC', { az: 35, dist: 3.4, h: 0.6 }),
  ...shot('mid', 45.2, 2.4, [7.5, 1.6, 5], { az: 100, dist: 17, h: 2, tr: 'whip' }),
  ...shot('close', 47.6, 1.3, 'youD', { az: 80, dist: 4.2 }),
  { t: 48.9, cut: true, tr: 'whip', p: [2.7, 1.45, 1.8], l: [0.45, 0.95, -0.44], fov: 46 }, { t: 51.6, p: [2.4, 1.35, 1.4], l: [0.45, 0.95, -0.44], fov: 42 },
  ...shot('wide', 51.6, 6.3, [3, 0.8, 2], { az: 60, dist: 24, h: 6, move: 'pull' })
];
const SLOWMO = [{ t: 46.5, dur: 1.0, rate: 0.3, catch: 0.5 }];
const TEASE = [{ t: 31.3, dur: 0.6, at: 46.9, label: 'Twenty seconds later' }];
const SHAKES = [{ t: 0, amp: 0.2, dur: 0.6 }, { t: 13.37, amp: 0.35, dur: 0.6 }, { t: 34.2, amp: 0.4, dur: 0.6 }, { t: 43.4, amp: 0.5, dur: 1.2 }, { t: 46.2, amp: 0.35, dur: 0.8 }];
const FLASHES = [{ t: 13.37, dur: 0.25, a: 0.4 }, { t: 33.9, dur: 0.35, a: 0.55, color: '#FFD8C8' }, { t: 46.4, dur: 0.2, a: 0.3 }];
const SKY = [[0, 'day']];
const PHASES = t => t < 4.9 ? 'Inside the whale' : t < 13.4 ? 'One minute earlier' : t < 45.2 ? 'Inside the whale' : 'Back outside';
const STATS = [
  { label: 'Air left', keys: [[0, 90], [13.4, 90], [33.9, 40], [42.7, 16], [46.5, 6], [46.9, 90]], fmt: 'clock', show: 'b1', up: 'good', crit: 20, why: [['b8+3.9', 'fresh air']] },
  { label: 'Depth', keys: [[0, 0], [13.4, 0], [33.9, 300], [44.6, 300], [45.4, 0]], fmt: 'depth', show: 'b3', hide: 'b9', up: 'bad' },
  { label: 'Gerald streak', keys: [[0, 9], [49.4, 9], [49.8, 10]], show: 'b1+1' }
];
const CALLOUTS = [{ t: 'b5+0.8', dur: 2.6, at: 'youHead', kind: 'tag', text: 'No way up' }];
const END = { t: 51.6, q: 'What swallows *you* next?', opts: ['A T. rex', 'A giant frog', 'A washing machine'], say: 'What would you have done? Most votes decides part two.', loop: 'Round two —' };
const AUDIO = {
  score: [[0, 'tense'], [4.9, 'chill'], [12, 'action'], [21, 'funny'], [26.8, 'tense'], [42.7, 'action'], [46.4, 'triumph']],
  music: 0.45, sfx: 0.85, ambVol: 0.7,
  sections: [[0, 1], [4.9, 1], [12, 3], [15.6, 1], [21, 2], [33.9, 3], [36.6, 2], [42.7, 3], [49.1, 1]],
  amb: [[0, 4.9, 'underwater', 0.5], [4.9, 15.6, 'ocean', 0.55], [15.6, 45.2, 'underwater', 0.5], [33.9, 45.2, 'cave', 0.3], [45.2, 57.9, 'ocean', 0.55]],
  hits: [
    { t: 0, k: 'boom' }, { t: 0.2, k: 'heartbeat', dur: 3 }, { t: 12.2, k: 'riser', dur: 1.1 }, { t: 18.4, k: 'heartbeat', dur: 2.5, v: 0.6 },
    { t: 32.6, k: 'riser', dur: 1.3 }, { t: 33.9, k: 'impact' }, { t: 36.9, k: 'groan', v: 0.5 }, { t: 43.4, k: 'groan', v: 0.7 },
    { t: 44.2, k: 'heartbeat', dur: 2 }, { t: 48.0, k: 'applause', v: 0.35 }, { t: 51.6, k: 'stinger' }
  ]
};
const THUMB = [
  { t: 13.1, text: 'Swallowed *alive*', cam: { p: [8.5, 1.0, 9], l: [3.2, 0.5, -1], fov: 48 }, expr: 'panic', rays: true },
  { t: 19.5, text: '_90 seconds_ of air', cam: { p: [2000.1, 302.5, -4.84], l: [2000, 300.3, -7.34], fov: 54 }, expr: 'panic', lookCam: true, glow: true }
];
