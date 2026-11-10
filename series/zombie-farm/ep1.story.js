const CFG = {
  dur: 22,                 // seconds (15–60; with all running gags 45–50)
  seed: 7,                 // change for a different random layout
  locale: 'en-US',         // every on-screen text is English
  badge: 'What if',
  accent: '#FFD23F',
  filter: 'film',          // none | film | crt
  grain: 0.045, vignette: 0.4, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, // shadow box half-size in metres (covers the play area)
  renderScale: 0.75,       // 3D resolution vs. output (HUD stays sharp); 1 = full, slower
  msaa: 2,                 // anti-aliasing samples (0 / 2 / 4)
  sunAz: -35,              // sun/moon azimuth in degrees (0 = from +z, i.e. from the camera side)
  handheld: 0.7,           // 0..1 subtle camera drift
  coverT: 1.0,             // thumbnail moment
  capPos: 'mid',           // captions: mid = exact centre of the frame | low = lower third (per beat: pos)
  karaoke: true,           // words appear as if spoken, the current word gets a coloured box
  wordRate: 0.085,         // fastest seconds per word
  voice: 'deep',           // voice-over: deep | deep-uk | narrator | false — or { name, speed: 1.08, pitch: -1.5, gain: 1 }
  series: null,            // { name: 'What If Lab', handle: '@whatiflab', ep: 1, next: 'part 2' } → series intro + outro
  cast: {},                // extra name cards for BEATS[].who, e.g. { mayor: { name: 'The Mayor', role: 'Has a plan' } } (steve is built in)
  transition: 'auto'       // cuts: auto (whip, whip, zoom …) | whip | zoom | dip | blur | cut — per key: tr, td, dir
};
const LIVE = {};           // scene → story bridge (e.g. LIVE.zombies = t => …)

// Captions: *word* = accent, _word_ = red. big = hook size, instant = visible on frame 0, pos 'low' | 'mid'. say: 'other spoken text' | false (silent beat)
// who: 'steve' = Dr. Steve name card above the caption + his own voice (voice: '<preset>' overrides the voice of any beat)
const BEATS = [
  { t: 0, dur: 2.6, kick: 'What if …', text: 'zombies attacked your *farm?*', big: true, instant: true },
  { t: 2.75, dur: 3.2, text: 'Your farm: 1~house, 1~silo, *0~plan.*' },
  { t: 6.15, dur: 3.95, text: 'Zombies are *slow* – but they _never get tired._' },
  { t: 10.3, dur: 2.15, text: 'The fence holds *a few minutes.*' },
  { t: 12.55, dur: 1.6, text: '_Then the barn burns._' },
  { t: 14.35, dur: 3.85, text: 'Your ace: zombies *can’t climb ladders.*' }
];
// Camera keys: p = position, l = look-at, fov (vertical). cut: true = hard cut at t. e = ease into this key. around: [x, z] = arc around that point.
const CAM = [
  { t: 0, p: [3.6, 2.6, -12.6], l: [2, 0.9, -26], fov: 50 },
  { t: 2.6, p: [3.2, 2.3, -14.2], l: [2, 1.0, -26], fov: 46, e: 'out' },
  { t: 2.6, cut: true, p: [30, 31, 40], l: [0, 0, -4], fov: 44 },
  { t: 6.05, p: [-24, 27, 44], l: [0, 0, -4], fov: 44, e: 'inOut', around: [0, -4] },
  { t: 6.05, cut: true, p: [4.2, 2.4, -5.8], l: [1.5, 1.1, -20], fov: 50 },
  { t: 10.2, p: [3.7, 2.1, -7.6], l: [1.5, 1.1, -20], fov: 47, e: 'lin' },
  { t: 10.2, cut: true, p: [14.5, 6.2, 6.5], l: [-3, 1, -9.5], fov: 50 },
  { t: 14.2, p: [13, 6.8, 4.5], l: [-3.2, 1, -9.8], fov: 47, e: 'lin' },
  ...shot('close', 14.2, 1.8, 'farmer', { az: -120, tr: 'zoom' }),   // close-up: the farmer on the silo
  { t: 16, cut: true, tr: 'whip', p: [25, 3.5, 6], l: [10.5, 6.5, -5.5], fov: 50 },
  { t: 18.2, p: [23, 13, 7.5], l: [9.5, 4.5, -6.2], fov: 50, e: 'inOut' },
  { t: 18.2, cut: true, p: [-24, 24, 38], l: [2, 0, -3], fov: 46 },
  { t: 22, p: [-28, 29, 44], l: [2, 0, -3], fov: 46, e: 'out' }
];
// Speed ramp (optional): the scene runs at `rate` for `dur` s, then catches up over `catch` s — captions, sound, camera keep real time
const SLOWMO = [{ t: 11.1, dur: 0.9, rate: 0.3, catch: 0.5 }];
const SHAKES = [{ t: 0, amp: 0.22, dur: 0.7 }, { t: 11.2, amp: 0.25, dur: 0.45 }, { t: 11.85, amp: 0.3, dur: 0.5 }, { t: 12.55, amp: 0.55, dur: 1.0 }];
const FLASHES = [{ t: 2.6, dur: 0.2, a: 0.35 }, { t: 6.05, dur: 0.18, a: 0.25 }, { t: 12.55, dur: 0.4, a: 0.6, color: '#FFB070' }, { t: 14.2, dur: 0.18, a: 0.25 }];
// Sky keys: [t, preset] — blends between consecutive keys. Presets: day golden dusk night dawn storm apocalypse space
const SKY = [[0, 'night'], [17.2, 'night'], [21.5, 'dawn']];
// Top-left time/phase label: function of t, or [[t, text], …]
const PHASES = t => 'Night 1 · ' + clockText(t, 0, CFG.dur, '23:47', '05:52');
// Stats: keys [[t, value], …] or value: t => number (scene time). t may be 'b3', 'b3+0.6', 'end' (story moments), also show/hide.
// fmt: int | pct | dec | (n => text). bad: red accent. up: 'good' | 'bad' (colours changes + pop-up). pop: min. jump for the pop-up | false.
const STATS = [
  { label: 'Zombies', value: t => LIVE.zombies ? LIVE.zombies(t) : 0, show: 'b1', up: 'bad', pop: false },
  { label: 'Fence', keys: [[0, 100], [11.1, 100], [12.6, 0]], fmt: 'pct', show: 'b2', bad: true, up: 'good' },
  { label: 'Survival', keys: [[0, 64], ['b2-0.1', 64], ['b2+0.6', 41], [11.1, 41], [12.6, 12], ['b5+1.2', 12], ['b5+2.4', 81]], fmt: 'pct', show: 'b1', up: 'good' }
];
// End card: question drives comments. review: { t, stars, title, text, by, foot, say } = closing review card (narrator reads it)
const END = { t: 18.3, q: 'Silo, cellar or tractor – where do *you* hide?', opts: ['Silo', 'Cellar', 'Tractor'], cta: 'Comment A, B or C' };
// Sound: mood horror | epic | action | funny | science | chill. sections [t, level 0..3]. sfx kinds: see SND below.
const AUDIO = {
  mood: 'horror', music: 0.55, sfx: 0.95,
  sections: [[0, 1], [2.6, 1], [6.05, 2], [10.2, 3], [14.2, 2], [18.3, 1]],
  hits: [
    { t: 0, k: 'boom' }, { t: 0.15, k: 'horde', dur: 2.3, v: 0.55 }, { t: 2.42, k: 'whoosh' },
    { t: 4.4, k: 'groan', v: 0.5 }, { t: 5.5, k: 'heartbeat' }, { t: 5.88, k: 'whoosh' },
    { t: 6.6, k: 'horde', dur: 3.4, v: 0.8 }, { t: 8.6, k: 'riser', dur: 1.6 }, { t: 10.2, k: 'impact' },
    { t: 11.2, k: 'crack' }, { t: 11.85, k: 'crack' }, { t: 12.55, k: 'boom' }, { t: 12.6, k: 'fire', dur: 5.4, v: 0.7 },
    { t: 14.05, k: 'whoosh' }, { t: 15.6, k: 'ticks', dur: 1.2 }, { t: 16.8, k: 'ding' }, { t: 18.3, k: 'stinger' }
  ]
};
