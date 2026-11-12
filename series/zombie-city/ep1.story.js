const CFG = {
  dur: 55.6, seed: 91, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'purple',
  filter: 'film', grain: 0.045, vignette: 0.42, saturation: 1.06, contrast: 1.06,
  shadows: true, area: 40, sunAz: -55, handheld: 0.8, capPos: 'mid', karaoke: true,
  voice: 'deep', gore: 'blood', transition: 'auto',
  series: { name: 'Zombie City', handle: '@whatifthishappenedscenarios', ep: 1, next: 'part 2' },
  steveTitle: 'Zombie Expert (PhD from a cereal box)'
};
const LIVE = {};
const BEATS = [
  { t: 0, dur: 7.0, kick: 'What if …', text: 'zombies took over your *city?*', big: true, instant: true,
    say: 'Your bus just stopped in a zombie outbreak. The last bridge out closes in ten minutes.' },
  { t: 7.2, dur: 4.2, text: 'Last time, *one farm.* This time, the _whole city._' },
  { t: 11.6, dur: 3.5, text: 'They follow *sound.* Then the driver _honks._' },
  { t: 15.3, dur: 5.2, text: 'Doors open. You *run.* Car alarms go off, _one by one._' },
  { t: 20.7, dur: 4.6, text: 'And that *bridge?* Wait till you see who’s _already there._' },
  { t: 25.5, dur: 5.5, who: 'steve', text: '“Zombies can’t see glass. *Hide in the bus shelter.*”',
    say: 'Zombies can’t see glass. Hide in the bus shelter. Trust the science, bro.' },
  { t: 31.2, dur: 1.6, text: '*Steve.* No.' },
  { t: 33.0, dur: 4.9, text: 'Glass on all sides. Faces on *all sides.* _Thanks, Steve._', stamp: 'wrong', stampAt: 3.4 },
  { t: 38.1, dur: 4.1, text: 'You grab an *e-scooter.* Twelve percent battery. _Go._' },
  { t: 42.4, dur: 2.5, text: 'Then the gates start *closing.*' },
  { t: 45.1, dur: 4.5, text: 'Gate: _shut._ Horde: _behind you._ Gerald: across, *eating fries.*', pos: 'low' }
];
const HOOK = [7, 4.6, 11], HOOKL = [-6, 1.8, 2.5];
const CAM = [
  { t: 0, p: HOOK, l: HOOKL, fov: 44 },
  { t: 3.6, p: [5, 4.2, 10], l: HOOKL, fov: 42, e: 'lin' },
  ...shot('mid', 3.6, 3.4, [-6, 1.5, 2.5], { az: 30, dist: 12, h: 2.5, move: 'orbit', turn: 12, tr: 'whip' }),
  { t: 7.0, cut: true, tr: 'zoom', p: [-10, 45, 40], l: [0, 5, -10], fov: 55 },
  { t: 11.6, p: [-6, 54, 46], l: [0, 5, -10], fov: 55, e: 'inOut' },
  { t: 11.6, cut: true, tr: 'whip', p: [-15.8, 2.0, 5.2], l: [-11.6, 1.7, 2.5], fov: 44 },
  { t: 13.6, p: [-15.2, 1.9, 4.8], l: [-11.6, 1.7, 2.5], fov: 40, e: 'lin' },
  { t: 13.6, cut: true, tr: 'cut', p: [-1, 3.2, 12.5], l: [-8, 1.3, 2], fov: 50 },
  { t: 15.1, p: [-1.5, 3.0, 11.5], l: [-8, 1.3, 2], fov: 48, e: 'lin' },
  ...shot('mid', 15.1, 2.5, 'you', { az: 40, dist: 7, h: 1, tr: 'whip' }),
  { t: 17.6, cut: true, tr: 'whip', p: [10, 4, 10], l: [-6, 1.5, 0], fov: 52 },
  { t: 20.5, p: [8, 3.6, 9.5], l: [-6, 1.5, 0], fov: 50, e: 'lin' },
  ...shot('close', 20.5, 3.0, 'you', { az: 178, dist: 3.4, tr: 'zoom' }),
  { t: 23.5, cut: true, tr: 'whip', p: [5, 12, 14], l: [27, 3, 2], fov: 46 },
  { t: 25.5, p: [7, 11, 13], l: [27, 3, 2], fov: 44, e: 'lin' },
  ...shot('close', 25.5, 2.8, 'you', { az: 165, dist: 3.4, tr: 'whip' }),
  ...shot('close', 28.3, 2.9, 'steve', { az: 180, dist: 3.4, tr: 'zoom' }),
  { t: 31.2, cut: true, tr: 'whip', p: [2.0, 10, 0.5], l: [3.4, 0.6, 7.8], fov: 50 },
  { t: 33.0, p: [2.4, 9.2, 1.2], l: [3.6, 0.6, 7.8], fov: 48, e: 'lin' },
  { t: 33.0, cut: true, tr: 'whip', p: [4.6, 4.2, 2.4], l: [4.1, 1.3, 8.0], fov: 46 },
  { t: 37.9, p: [4.4, 3.8, 3.6], l: [4.1, 1.3, 8.0], fov: 42, e: 'lin' },
  ...shot('mid', 37.9, 2.5, 'you', { az: 120, dist: 6.5, h: 1.2, tr: 'whip' }),
  ...shot('mid', 40.4, 2.0, 'you', { az: 60, dist: 9, h: 2 }),
  { t: 42.4, cut: true, tr: 'whip', p: [17, 3.6, 11.5], l: [26, 1.5, 1], fov: 50 },
  { t: 45.1, p: [18.5, 3.3, 10.5], l: [26, 1.5, 1], fov: 48, e: 'lin' },
  { t: 45.1, cut: true, tr: 'whip', p: [31, 2.4, -3.2], l: [20, 1.4, 0.2], fov: 46 },
  { t: 47.3, p: [30, 2.3, -2.6], l: [20, 1.4, 0.2], fov: 44, e: 'lin' },
  ...shot('close', 47.3, 2.5, 'gerald', { az: -70, dist: 3.0, dy: 0.7, h: 0.25, fy: 0.36, tr: 'zoom' }),
  { t: 49.8, cut: true, tr: 'whip', p: [28.5, 4.8, 9.5], l: HOOKL, fov: 46 },
  { t: 55.6, p: HOOK, l: HOOKL, fov: 44, e: 'inOut' }
];
const TEASE = [{ t: 23.6, dur: 0.6, at: 48.3, label: 'At the bridge' }];
const SLOWMO = [{ t: 44.2, dur: 0.9, rate: 0.3 }];
const SHAKES = [{ t: 0, amp: 0.2, dur: 0.6 }, { t: 37.9, amp: 0.3, dur: 0.5 }, { t: 44.6, amp: 0.35, dur: 0.5 }];
const FLASHES = [{ t: 7.0, dur: 0.18, a: 0.25 }, { t: 37.9, dur: 0.2, a: 0.35 }, { t: 45.1, dur: 0.2, a: 0.3 }];
const SKY = [[0, 'golden'], [55.6, 'dusk']];
const PHASES = t => 'Day 1 · ' + clockText(t, 0, CFG.dur, '20:50', '21:00');
const STATS = [
  { label: 'Bridge closes in', type: 'timer', until: 44.6, scale: 14.2, show: 2.4, big: true },
  { label: 'Zombies nearby', value: t => LIVE.z ? LIVE.z(t) : 0, show: 'b2', up: 'bad', pop: false },
  { label: 'Scooter battery', keys: [[0, 12], [38.6, 12], [44.6, 3]], fmt: 'pct', show: 'b8+0.4', crit: 5, up: 'good', hide: 'b10+1' },
  { label: 'Gerald streak', keys: [[0, 8], [47.4, 8], [47.8, 9]], show: 3 }
];
const END = { t: 49.8, q: 'Where do *you* hide?', opts: ['The rooftop', 'The subway tunnels', 'The mall'], cta: 'Comment A, B or C',
  say: 'What would you have done? Most votes decides part two.', loop: 'Next stop —' };
const AUDIO = {
  score: [[0, 'tense'], [15.1, 'action'], [25.5, 'funny'], [33.0, 'horror'], [37.9, 'action'], [45.1, 'tense']], music: 0.42, sfx: 0.85, ambVol: 0.7,
  sections: [[0, 1], [15.1, 3], [25.5, 1], [33.0, 2], [37.9, 3], [45.1, 2], [49.8, 1]],
  amb: [[0, 55.6, 'city', 0.5], [0, 55.6, 'crowd', 0.55]],
  hits: [{ t: 0, k: 'boom', v: 0.6 }, { t: 13.75, k: 'horn', dur: 1.2, v: 0.7 }, { t: 15.0, k: 'door', v: 0.5 },
    { t: 16.4, k: 'caralarm', dur: 2.2, v: 0.45 }, { t: 17.3, k: 'caralarm', dur: 2.4, v: 0.4 }, { t: 18.3, k: 'caralarm', dur: 2.2, v: 0.38 }, { t: 19.3, k: 'caralarm', dur: 1.6, v: 0.35 },
    { t: 21.0, k: 'heartbeat', v: 0.6 }, { t: 37.9, k: 'crack', v: 0.8 }, { t: 40.3, k: 'riser', dur: 2.0, v: 0.6 }, { t: 44.6, k: 'impact', v: 0.7 }, { t: 49.8, k: 'stinger', v: 0.6 }]
};
const THUMB = [
  { t: 47.0, text: '*10* minutes', sub: 'Part 1', cam: { p: [31, 2.6, -3.4], l: [20, 1.4, 0.3], fov: 44 }, rays: true, expr: 'scared' },
  { t: 34.5, text: 'Thanks, *Steve*', sub: 'Part 1', cam: { p: [4.6, 3.0, 4.4], l: [4.1, 1.4, 8.0], fov: 46 }, glow: [50, 64, 30] }
];
