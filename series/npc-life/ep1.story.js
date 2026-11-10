const CFG = {
  dur: 71.4, seed: 11, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'pink',
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
  { t: 4.1, dur: 6.2, text: '*Vice City,* launch day, and millions of players just logged in. You sell hot dogs.' },
  { t: 10.4, dur: 6.0, text: 'Your life is one loop: walk, say *“Nice day,”* walk back. Zero main character energy.', say: 'Your life is one loop: walk, say nice day, walk back. Zero main character energy.' },
  { t: 16.5, dur: 5.9, tone: 'tense', text: 'The *player* spawns right next to you. One look… and he takes _your car._' },
  { t: 22.5, dur: 4.8, who: 'steve', text: '“NPCs respawn. You’re basically *immortal.*”', say: 'N P Cs respawn. You’re basically immortal. Trust the science, bro.' },
  { t: 27.4, dur: 6.0, sigh: true, text: 'You walk into traffic, *fully confident.* Then your own car comes back.' },
  { t: 33.5, dur: 5.9, stamp: 'wrong', stampAt: 0.7, text: 'You respawn at the hospital, with a _$5,000_ bill. *Thanks, Steve.*', say: 'You respawn at the hospital, with a five thousand dollar bill. Thanks, Steve.' },
  { t: 39.5, dur: 6.2, text: 'He keeps coming back. Out of a whole city, you’re his *favorite NPC.*', say: 'He keeps coming back. Out of a whole city, you’re his favorite N P C.' },
  { t: 45.8, dur: 6.4, tone: 'dramatic', text: 'Then the news came on: your face, *five stars,* and every cop in Vice City.' },
  { t: 52.3, dur: 7.6, tone: 'excited', text: 'The chase goes _straight through_ your hot dog stand. Riding shotgun? *Gerald,* eating your last hot dog.' }
];

const CAM = [
  { t: 0, p: [5.4, 1.5, 22.0], l: [2.6, 6.4, 0], fov: 50 },
  { t: 4.0, p: [5.0, 1.6, 20.2], l: [2.6, 6.6, 0], fov: 47, e: 'out' },
  { t: 4.0, cut: true, p: [34, 24, 44], l: [4, 5, -6], fov: 46 },
  { t: 6.6, p: [12, 20, 50], l: [2, 5, -6], fov: 46, e: 'inOut', around: [3, -6] },
  ...shot('mid', 6.6, 2.0, [0, 1, 9], { az: 30, dist: 13, h: 3, tr: 'zoom' }),
  ...shot('close', 8.6, 1.8, 'you', { az: 0, dist: 4.4 }),
  ...shot('mid', 10.4, 2.6, 'you', { az: 40, dist: 8, h: 1.0, tr: 'whip' }),
  ...shot('close', 13.0, 2.0, 'you', { az: 90, dist: 4.4 }),
  ...shot('mid', 15.0, 1.45, [6, 1, 11], { az: -20, dist: 14, h: 4 }),
  { t: 16.45, cut: true, tr: 'cut', p: [8.4, 2.7, 18.6], l: [11.4, 0.7, 4.0], fov: 46 },
  { t: 18.4, p: [8.7, 2.5, 17.3], l: [11.6, 0.7, 4.0], fov: 44, e: 'lin' },
  ...shot('close', 18.4, 1.6, 'you', { az: 180, dist: 4.4, h: 0.3 }),
  ...shot('mid', 20.0, 2.45, [3, 1, 9.5], { az: 25, dist: 15, h: 3, tr: 'whip' }),
  ...shot('close', 22.45, 2.4, 'steve', { az: 30, dist: 4.4, tr: 'zoom' }),
  ...shot('mid', 24.85, 2.5, [8.0, 1.0, 12.2], { az: 15, dist: 8.5, h: 1.0 }),
  ...shot('close', 27.35, 2.15, 'you', { az: 200, dist: 4.6, tr: 'whip' }),
  ...shot('close', 29.5, 1.9, 'you', { az: -90, dist: 4.6 }),
  { t: 31.4, cut: true, p: [15, 2.4, 14], l: [1, 1.2, 5.0], fov: 50 },
  { t: 33.45, p: [14, 2.6, 13], l: [2, 1.4, 5.0], fov: 48, e: 'lin' },
  ...shot('close', 33.45, 2.55, 'you2', { az: 0, dist: 4.6, tr: 'whip' }),
  ...shot('mid', 36.0, 3.45, [-34, 2.0, -3.5], { az: 15, dist: 12, h: 1.5 }),
  ...shot('mid', 39.45, 2.55, [4, 1.5, 5.2], { az: 35, dist: 15, h: 3, tr: 'whip' }),
  ...shot('close', 42.0, 2.0, 'you3', { az: 10, dist: 5.5, h: 1.2 }),
  ...shot('mid', 44.0, 1.75, [0, 1, 5], { az: -30, dist: 18, h: 6 }),
  { t: 45.75, cut: true, tr: 'zoom', p: [15, 8.6, 10], l: [15, 9.6, -5.2], fov: 46 },
  { t: 48.0, p: [15, 9.4, 4.0], l: [15, 9.6, -5.2], fov: 44, e: 'lin' },
  ...shot('close', 48.0, 2.2, 'you3', { az: 0, dist: 4.8, h: 0.8 }),
  ...shot('wide', 50.2, 2.05, [4, 3, 8], { az: 20, dist: 30, h: 10 }),
  ...shot('mid', 52.25, 1.35, 'pcar', { az: 150, dist: 12, h: 2.5, dy: 0.8, tr: 'whip' }),
  { t: 53.6, cut: true, p: [7.8, 1.5, 17.4], l: [2.6, 1.0, 10.6], fov: 48 },
  { t: 56.0, p: [7.2, 1.7, 16.2], l: [2.6, 1.0, 10.6], fov: 46, e: 'lin' },
  ...shot('close', 56.0, 2.0, 'gerald', { az: 62, dist: 4.0, dy: 0.6, h: 0.4, fy: 0.32, fov: 40, tr: 'zoom' }),
  ...shot('close', 58.0, 2.0, 'gerald', { az: 40, dist: 3.6, dy: 0.35, h: 0.5 }),
  { t: 60.0, cut: true, p: [-26, 20, 46], l: [6, 7, -8], fov: 46 },
  { t: 71.4, p: [-34, 24, 52], l: [6, 7, -8], fov: 46, e: 'out', around: [6, -8] }
];
const SLOWMO = [{ t: 53.55, dur: 0.9, rate: 0.3, catch: 0.5 }];
const SHAKES = [{ t: 0, amp: 0.2, dur: 0.6 }, { t: 16.6, amp: 0.3, dur: 0.5 }, { t: 32.6, amp: 0.45, dur: 0.6 }, { t: 54.38, amp: 0.5, dur: 0.8 }];
const FLASHES = [{ t: 4.0, dur: 0.2, a: 0.3 }, { t: 16.6, dur: 0.3, a: 0.5, color: '#7CFF6B' }, { t: 32.6, dur: 0.25, a: 0.5 }, { t: 33.45, dur: 0.3, a: 0.4, color: '#7CFF6B' }, { t: 45.75, dur: 0.2, a: 0.3, color: '#FF3B4A' }, { t: 54.38, dur: 0.35, a: 0.55, color: '#FFD0A0' }];
const SKY = [[0, 'golden'], [38, 'golden'], [46, 'dusk'], [50, 'night']];
const PHASES = t => 'Vice City · ' + clockText(t, 0, CFG.dur, '18:40', '21:20');
const STATS = [
  { label: 'Dignity', type: 'bar', keys: [[0, 100], ['b3+4.6', 100], ['b3+5.2', 70], [32.6, 70], [33.1, 35], ['b6+2.0', 35], ['b6+2.6', 15], ['b8+2.0', 15], ['b8+2.8', 0]], show: 'b2', crit: 5, up: 'good',
    why: [['b3+4.6', 'car stolen'], [32.6, 'hit by own car'], ['b6+2.0', '$5,000 bill'], ['b8+2.0', 'on the news']] },
  { label: 'Nice days said', keys: [[0, 4790], ['b2+0.5', 4790], ['b2+5', 4812]], show: 'b2', hide: 'b3', pop: false },
  { label: 'Hospital bill', keys: [[0, 0], ['b6+0.8', 0], ['b6+2.0', 5000]], fmt: 'money', show: 'b6', hide: 'b8', bad: true, up: 'bad' },
  { label: 'Ragdolled', keys: [[0, 1], ['b7+0.6', 1], ['b7+6.0', 17]], show: 'b7', hide: 'b9', up: 'bad', pop: false, why: [['b7+0.7', 'favorite NPC']] },
  { label: 'Wanted', type: 'stars', keys: [[0, 0], ['b8+2.0', 0], ['b8+3.8', 5]], show: 'b8', bad: true, crit: 5, critAbove: true },
  { label: 'Gerald streak', keys: [[0, 6], [58.3, 6], [58.7, 7]], show: 'b1', up: 'good' }
];
const THUMB = [
  { t: 48.8, text: 'Hot dog guy: *5 stars*', sub: 'NPC Life · Part 1', cam: { p: [5.5, 1.35, 15.6], l: [5.5, 2.6, 10.5], fov: 50 }, expr: 'scared', lookCam: true },
  { t: 32.45, text: '*Respawn* costs _$5,000_', sub: 'NPC Life · Part 1', cam: { p: [9.6, 1.6, 10.8], l: [3.6, 1.7, 5.1], fov: 50 }, expr: 'smug', lookCam: true }
];
const END = {
  t: 60.0, q: 'How do *you* escape the player?', opts: ['Hide in the mall', 'Leave Vice City', 'Be the main character'], cta: 'Most votes decides part 2',
  say: 'Mall, leave town, or main character? What would you have done? Drop it in the comments.',
  review: { t: 67.2, stars: 1, title: 'Being an NPC in Vice City', text: 'Great weather. Zero free will.', by: 'You', foot: 'Gerald found this helpful', say: 'One star. Zero free will.', stats: 'auto' }
};
const AUDIO = {
  mood: 'action', music: 0.55, sfx: 0.95,
  score: [[0, 'action'], [4.1, 'chill'], [16.5, 'tense'], [22.5, 'funny'], [39.5, 'action'], [45.8, 'tense'], [52.3, 'action'], [56.0, 'funny']],
  amb: [[0, 33.45, 'ocean', 0.45], [0, 33.45, 'city', 0.5], [33.45, 39.45, 'city', 0.6], [39.45, 71.4, 'ocean', 0.4], [39.45, 71.4, 'city', 0.55], [50.5, 57.0, 'engine', 0.6]],
  sections: [[0, 2], [4.1, 1], [16.5, 2], [20.5, 3], [22.5, 1], [27.4, 2], [32.6, 3], [33.5, 2], [39.5, 2], [45.8, 2], [50.5, 3], [56.0, 1], [60.0, 1]],
  hits: [
    { t: 0, k: 'boom' }, { t: 16.6, k: 'glitch' }, { t: 16.65, k: 'boom', v: 0.6 }, { t: 20.9, k: 'engine', dur: 3.0, v: 0.8 }, { t: 21.4, k: 'whoosh', v: 0.5 },
    { t: 30.0, k: 'engine', dur: 2.8, v: 0.7 }, { t: 32.6, k: 'impact' }, { t: 32.65, k: 'crack', v: 0.6 }, { t: 33.45, k: 'glitch' }, { t: 35.4, k: 'coin' },
    { t: 40.1, k: 'impact', v: 0.45 }, { t: 41.1, k: 'impact', v: 0.45 }, { t: 42.1, k: 'impact', v: 0.45 }, { t: 43.1, k: 'impact', v: 0.45 }, { t: 44.1, k: 'impact', v: 0.45 }, { t: 45.1, k: 'impact', v: 0.45 },
    { t: 45.9, k: 'alarm', v: 0.35 }, { t: 47.9, k: 'pop' }, { t: 48.3, k: 'pop' }, { t: 48.7, k: 'pop' }, { t: 49.1, k: 'pop' }, { t: 49.5, k: 'pop' },
    { t: 50.5, k: 'alarm', dur: 6.0, v: 0.3 }, { t: 50.95, k: 'riser', dur: 1.3 }, { t: 54.38, k: 'impact' }, { t: 54.4, k: 'crack', v: 0.7 }, { t: 58.5, k: 'ding' }, { t: 60.0, k: 'stinger' }
  ]
};
