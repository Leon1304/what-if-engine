// v3.44 sound dynamics (checked in tests/run.sh on the rendered audio): one big hit at 6 s (SHAKES amp 0.6 + explosion) →
//   impactTimes() = [6]; music + ambience near silence in the 0.3 s before it (riser cut), sub-drop on the hit, music back after ~2 s;
//   a sound on every cut: hard cuts → cuthit (quieter when cuts are dense), whip → whoosh; none in the silence before the hit
const CFG = { dur: 12, seed: 3, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'sound dynamics', big: true, instant: true }];
const CAM = [
  ...shot('wide', 0, 2, [0, 1.5, 0], { az: 20, dist: 18, h: 3, move: 'static' }),
  ...shot('wide', 2, 1.2, [0, 1.5, 0], { az: 60, dist: 18, h: 3, move: 'static' }),          // hard cut at 2 (dense: next one 1.2 s later)
  ...shot('wide', 3.2, 2.4, [0, 1.5, 0], { az: 100, dist: 18, h: 3, move: 'static' }),       // hard cut at 3.2
  ...shot('wide', 5.6, 3.4, [0, 1.5, 0], { az: 140, dist: 22, h: 4, move: 'static' }),       // hard cut at 5.6: in the hush before the hit → no sound
  ...shot('wide', 9, 3, [0, 1.5, 0], { az: 180, dist: 18, h: 3, move: 'static', tr: 'whip' })  // whip at 9 → whoosh
];
const SHAKES = [{ t: 6, amp: 0.6, dur: 1 }], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'Audio';
const STATS = [];
const END = { t: 11.6, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { style: 'orchestral', score: [[0, 'tense'], [6, 'epic']], sections: [[0, 2]], music: 0.55, sfx: 0.9, hits: [{ t: 6, k: 'explosion' }], amb: [[0, 12, 'wind', 0.6]] };
const THUMB = { t: 1.0, text: '*Sound* test' };
