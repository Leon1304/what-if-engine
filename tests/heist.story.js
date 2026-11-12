const CFG = { dur: 9, seed: 3, handheld: 0.6, renderScale: 0.75, msaa: 2, grain: 0.04, vignette: 0.4, saturation: 1.08, contrast: 1.05, coverT: 4, wordRate: 0.085, locale: 'en-US', kind: 'truecrime', accent: 'red', filter: 'film', shadows: true, area: 30, sunAz: -40, capPos: 'mid', karaoke: true, voice: false, transition: 'auto' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 3, kick: 'What if …', text: 'you guarded the *jewels?*', big: true, instant: true }, { t: 3.2, dur: 3, text: 'The lift goes *up.*' }];
const CAM = [
  { t: 0, p: [3.5, 6.2, 9], l: [0, 5, -3], fov: 50 }, { t: 3, p: [3, 6, 7], l: [0, 5, -3], fov: 48 },
  { t: 3, cut: true, p: [-22, 6, 14], l: [-6, 5, 0], fov: 50 }, { t: 9, p: [-20, 8, 10], l: [-6, 6, 0], fov: 50 }
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'Sun · ' + clockText(t, 0, CFG.dur, '09:30', '09:38');
const STATS = [{ label: 'Jewels gone', keys: [[0, 0], [7, 0], [7.5, 3]], show: 1, up: 'bad' }];
const END = { t: 7, q: 'What do *you* do?', opts: ['Chase', 'Evacuate'], cta: 'Comment A or B', loop: 'So —' };
const AUDIO = { mood: 'tense', amb: [[0, 9, 'indoor', 0.5]] };
const THUMB = { t: 4, text: 'The *heist*' };
