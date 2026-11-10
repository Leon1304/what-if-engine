const CFG = {
  dur: 65.8, seed: 11, locale: 'en-US', badge: 'What if', accent: 'pink',
  filter: 'film', grain: 0.04, vignette: 0.35, saturation: 1.14, contrast: 1.06,
  shadows: true, area: 45, renderScale: 0.75, msaa: 2, sunAz: -55, handheld: 0.7, coverT: 1.2,
  capPos: 'mid', karaoke: true, wordRate: 0.085, voice: 'deep',
  series: { name: 'NPC Life', handle: '@whatifthishappenedscenarios', ep: 1, next: 'part 2' },
  steveTitle: 'Expert (10k hours in GTA 5)',
  cast: {}, transition: 'auto'
};
const LIVE = {};

const BEATS = [
  { t: 0, dur: 4.0, kick: 'What if …', text: 'you were an *NPC* in GTA 6?', big: true, instant: true, say: 'What if you were an N P C in G T A six?' },
  { t: 4.1, dur: 4.1, text: 'Vice City, *launch day.* You sell hot dogs.' },
  { t: 8.3, dur: 4.3, text: 'Your only rule: walk, say *“Nice day,”* repeat. Forever.', say: 'Your only rule: walk, say nice day, repeat. Forever.' },
  { t: 12.7, dur: 3.9, text: 'The *player* spawns. Pure main character energy.' },
  { t: 16.7, dur: 4.3, text: 'He takes your car. You had _one payment left._' },
  { t: 21.1, dur: 4.7, who: 'steve', text: '“NPCs respawn. You’re basically *immortal.*”', say: 'N P Cs respawn. You’re basically immortal. Trust the science, bro.' },
  { t: 25.9, dur: 3.9, sigh: true, text: 'You walk into traffic. *Lowkey* confident.' },
  { t: 29.9, dur: 5.0, stamp: 'wrong', stampAt: 0.7, text: 'Respawn. _$5,000_ hospital bill. *Thanks, Steve.*', say: 'You respawn. Five grand hospital bill. Thanks, Steve.' },
  { t: 35.0, dur: 4.4, text: 'He keeps coming back. You’re his *favorite NPC.*', say: 'He keeps coming back. You’re his favorite N P C.' },
  { t: 39.5, dur: 5.6, text: 'Then the news came on. Your face. _Five stars._' },
  { t: 45.2, dur: 4.1, text: 'The chase goes _straight through_ your hot dog stand.' },
  { t: 49.4, dur: 4.6, text: 'Riding shotgun? *Gerald.* Eating your last hot dog.' }
];

const CAM = [
  { t: 0, p: [5.4, 1.5, 22.0], l: [2.6, 6.4, 0], fov: 50 },
  { t: 4.0, p: [5.0, 1.6, 20.2], l: [2.6, 6.6, 0], fov: 47, e: 'out' },
  { t: 4.0, cut: true, p: [34, 24, 44], l: [4, 5, -6], fov: 46 },
  { t: 6.2, p: [12, 20, 50], l: [2, 5, -6], fov: 46, e: 'inOut', around: [3, -6] },
  ...shot('mid', 6.2, 2.1, [3.2, 1.1, 11.2], { az: 25, dist: 7, h: 1.2, tr: 'zoom' }),
  ...shot('mid', 8.3, 2.2, 'you', { az: 40, dist: 8, h: 1.0, tr: 'whip' }),
  ...shot('close', 10.5, 2.15, 'you', { az: 90, dist: 4.4 }),
  { t: 12.65, cut: true, tr: 'cut', p: [8.4, 2.7, 18.6], l: [11.4, 0.7, 4.0], fov: 46 },
  { t: 14.65, p: [8.7, 2.5, 17.3], l: [11.6, 0.7, 4.0], fov: 44, e: 'lin' },
  ...shot('close', 14.65, 2.0, 'you', { az: 180, dist: 4.4, h: 0.3 }),
  ...shot('mid', 16.65, 2.2, [-2, 1.0, 7.4], { az: 35, dist: 11, h: 2.4, tr: 'whip' }),
  ...shot('close', 18.85, 2.2, 'you', { az: 200, dist: 4.2 }),
  ...shot('close', 21.05, 2.4, 'steve', { az: 30, dist: 4.4, tr: 'zoom' }),
  ...shot('mid', 23.45, 2.4, [8.0, 1.0, 12.2], { az: 15, dist: 8.5, h: 1.0 }),
  ...shot('close', 25.85, 2.0, 'you', { az: 200, dist: 4.6, tr: 'whip' }),
  ...shot('mid', 27.85, 2.0, [5, 1.0, 5.4], { az: -85, dist: 17, h: 3.0 }),
  ...shot('close', 29.85, 2.5, 'you2', { az: 0, dist: 4.6, tr: 'whip' }),
  ...shot('mid', 32.35, 2.6, [-34, 2.0, -3.5], { az: 15, dist: 12, h: 1.5 }),
  ...shot('mid', 34.95, 2.3, [4, 1.5, 5.2], { az: 35, dist: 15, h: 3, tr: 'whip' }),
  ...shot('close', 37.25, 2.2, 'you3', { az: 10, dist: 5.5, h: 1.2 }),
  { t: 39.45, cut: true, tr: 'zoom', p: [15, 8.6, 10], l: [15, 9.6, -5.8], fov: 46 },
  { t: 41.85, p: [15, 9.4, 4.0], l: [15, 9.6, -5.8], fov: 44, e: 'lin' },
  ...shot('close', 41.85, 3.3, 'you3', { az: 0, dist: 4.8, h: 0.8 }),
  ...shot('mid', 45.15, 1.85, 'pcar', { az: 150, dist: 12, h: 2.5, dy: 0.8, tr: 'whip' }),
  { t: 47.0, cut: true, p: [7.8, 1.5, 17.4], l: [2.6, 1.0, 10.6], fov: 48 },
  { t: 49.35, p: [7.2, 1.7, 16.2], l: [2.6, 1.0, 10.6], fov: 46, e: 'lin' },
  ...shot('close', 49.35, 2.4, 'gerald', { az: 62, dist: 3.1, dy: 0.75, h: 0.25, fy: 0.3, tr: 'zoom' }),
  ...shot('close', 51.75, 2.3, 'gerald', { az: 40, dist: 3.6, dy: 0.35, h: 0.5 }),
  { t: 54.05, cut: true, p: [-26, 20, 46], l: [6, 7, -8], fov: 46 },
  { t: 65.8, p: [-34, 24, 52], l: [6, 7, -8], fov: 46, e: 'out', around: [6, -8] }
];
const SLOWMO = [{ t: 46.85, dur: 0.9, rate: 0.3, catch: 0.5 }];
const SHAKES = [{ t: 0, amp: 0.2, dur: 0.6 }, { t: 12.7, amp: 0.3, dur: 0.5 }, { t: 29.5, amp: 0.45, dur: 0.6 }, { t: 47.42, amp: 0.5, dur: 0.8 }];
const FLASHES = [{ t: 4.0, dur: 0.2, a: 0.3 }, { t: 12.7, dur: 0.3, a: 0.5, color: '#7CFF6B' }, { t: 29.5, dur: 0.25, a: 0.5 }, { t: 29.85, dur: 0.3, a: 0.4, color: '#7CFF6B' }, { t: 39.45, dur: 0.2, a: 0.3, color: '#FF3B4A' }, { t: 47.42, dur: 0.35, a: 0.55, color: '#FFD0A0' }];
const SKY = [[0, 'golden'], [30, 'golden'], [40, 'dusk'], [45, 'night']];
const PHASES = t => 'Vice City · ' + clockText(t, 0, CFG.dur, '18:40', '21:15');
const STATS = [
  { label: 'Gerald streak', keys: [[0, 6], [52.2, 6], [52.6, 7]], show: 'b1', up: 'good' },
  { label: 'Nice days said', keys: [[0, 4790], ['b2', 4790], ['b2+3.8', 4812]], show: 'b2', hide: 'b4', pop: false },
  { label: 'Cars stolen', keys: [[0, 0], [17.9, 0], [18.5, 1]], show: 'b4', hide: 'b8', up: 'bad' },
  { label: 'Hospital bill', keys: [[0, 0], ['b7+0.6', 0], ['b7+2.0', 5000]], fmt: n => '$' + Math.round(n).toLocaleString('en-US'), show: 'b7', hide: 'b9', bad: true, up: 'bad' },
  { label: 'Ragdolled', keys: [[0, 1], ['b8+0.6', 1], ['b8+4.0', 17]], show: 'b8', hide: 'b10', up: 'bad', pop: false },
  { label: 'Wanted', keys: [[0, 0], ['b9+2.2', 0], ['b9+4.0', 5]], fmt: n => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n)), show: 'b9', bad: true, pop: false }
];
const END = {
  t: 54.1, q: 'How do *you* escape the player?', opts: ['Hide in the mall', 'Leave Vice City', 'Be the main character'], cta: 'Most votes decides part 2',
  say: 'Mall, leave town, or main character? What would you have done? Drop it in the comments.',
  review: { t: 61.6, stars: 1, title: 'Being an NPC in Vice City', text: 'Great weather. Zero free will.', by: 'You', foot: 'Gerald found this helpful', say: 'One star. Zero free will.' }
};
const AUDIO = {
  mood: 'action', music: 0.55, sfx: 0.95,
  score: [[0, 'action'], [4.1, 'chill'], [16.7, 'action'], [21.1, 'funny'], [35.0, 'action'], [39.5, 'tense'], [45.2, 'action'], [49.4, 'funny']],
  amb: [[0, 29.85, 'ocean', 0.45], [0, 29.85, 'city', 0.5], [29.85, 35.0, 'city', 0.6], [35.0, 65.8, 'ocean', 0.4], [35.0, 65.8, 'city', 0.55], [43.6, 50.5, 'engine', 0.6]],
  sections: [[0, 2], [4.1, 1], [12.7, 2], [16.7, 3], [21.1, 1], [25.9, 2], [29.9, 3], [35.0, 2], [39.5, 2], [45.2, 3], [49.4, 1], [54.1, 1]],
  hits: [
    { t: 0, k: 'boom' }, { t: 12.7, k: 'glitch' }, { t: 12.75, k: 'boom', v: 0.6 }, { t: 17.95, k: 'engine', dur: 3.0, v: 0.8 },
    { t: 26.6, k: 'engine', dur: 3.0, v: 0.7 }, { t: 29.5, k: 'impact' }, { t: 29.55, k: 'crack', v: 0.6 }, { t: 29.9, k: 'glitch' },
    { t: 31.2, k: 'coin' }, { t: 35.74, k: 'impact', v: 0.5 }, { t: 36.74, k: 'impact', v: 0.5 }, { t: 37.74, k: 'impact', v: 0.5 }, { t: 38.74, k: 'impact', v: 0.5 },
    { t: 39.5, k: 'alarm', v: 0.35 }, { t: 41.7, k: 'pop' }, { t: 42.1, k: 'pop' }, { t: 42.5, k: 'pop' }, { t: 42.9, k: 'pop' }, { t: 43.3, k: 'pop' },
    { t: 43.8, k: 'alarm', dur: 6.0, v: 0.3 }, { t: 47.42, k: 'impact' }, { t: 47.45, k: 'crack', v: 0.7 }, { t: 52.4, k: 'ding' }, { t: 54.1, k: 'stinger' }
  ]
};
