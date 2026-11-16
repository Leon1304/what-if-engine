// v3.45 real recordings (checked in tests/run.sh on the rendered audio): every ambience bed with a CC0 loop in sfx/amb-<kind>.mp3 (rain, wind, ocean, city, people,
//   battle, forest, mob) plays 2 s each, then the new one-shots (shot, rifle, punch, heartbeat, fire); each part must be audible and, against AUDIO.real: false
//   (the synthesized versions), within a sane loudness range — no bed blasting or vanishing
const CFG = { dur: 24, seed: 3, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'orange', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'real sounds', big: true, instant: true }];
const CAM = [...shot('wide', 0, 24, [0, 1.5, 0], { az: 20, dist: 14, h: 3, move: 'orbit' })];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'Audio';
const STATS = [];
const END = null;
const AUDIO = { style: 'none', score: [[0, 'none']], music: 0, sfx: 0.9, ambVol: 0.9,
  amb: ['rain', 'wind', 'ocean', 'city', 'people', 'battle', 'forest', 'mob'].map((k, i) => [i * 2, i * 2 + 2, k, 1]),
  hits: [{ t: 16.2, k: 'shot' }, { t: 17.2, k: 'rifle' }, { t: 18.2, k: 'punch' }, { t: 19.2, k: 'heartbeat' }, { t: 21, k: 'fire', dur: 2.5 }] };
const THUMB = { t: 1.0, text: '*Sound* test' };
