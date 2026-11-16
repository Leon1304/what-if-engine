// v3.45 HUD, cards and end card (checked in tests/run.sh with --probe):
//   - STEPS chip + focus counter: the counter starts under the top row (#stage.hastop), the counter's icon sits inside its label line
//   - 'Economy lost' jumps by $7.5M while 'hero' fills the top of the frame (shot 2): the counter leaves the face (hudPlace ≠ centre), its +$… pop-up stays inside the frame
//   - the FACTS card (shot 3, face where the card would be) moves off the face (cardPlace); with CFG.hudDodge off both are reported as QA: HUDFACE
//   - END.t 4 s before the end and no CFG.endCard → the full card (ENDAUTO), on a solid plate; with the loop the card is gone before the dissolve shows the hook
const CFG = { dur: 14, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'blue', filter: 'film', grain: 0.02, vignette: 0.3, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 36, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0, coverT: 1.0, karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', loop: true, pacing: false };
const LIVE = {};
const BEATS = [
  { t: 0.2, dur: 3.4, text: 'The whole city *called in sick.*' },
  { t: 3.8, dur: 3.0, text: 'The economy lost _billions._' },
  { t: 7.0, dur: 3.0, text: 'And nobody *noticed.*' }
];
const STEPS = [[0, 'The city'], [3.8, 'The cost']];
const CAM = [
  ...shot('wide', 0, 3.6, [0, 1.5, 0], { az: 20, dist: 18, h: 3, move: 'static', tr: 'cut' }),
  ...shot('close', 3.6, 3.4, 'hero', { az: 0, dist: 4.2, h: 0.05, fov: 34, fy: 0.16, move: 'static', tr: 'cut', dof: 0, hand: 0 }),   // the face sits top centre (where the counter would be)
  ...shot('close', 7.0, 3.0, 'hero', { az: 0, dist: 1.9, h: 0.05, fov: 34, fy: 0.36, move: 'static', tr: 'cut', dof: 0, hand: 0 }),   // the face sits where the FACTS card would be
  ...shot('wide', 10, 4, [0, 1.5, 0], { az: -30, dist: 16, h: 4, move: 'orbit', tr: 'cut' })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const STATS = [{ label: 'Economy lost', icon: 'money', fmt: 'money', bad: true, keys: [[0, 6.4e6], [4.2, 6.4e6], [5.0, 13.9e6]], show: 0.5 }];
const FACTS = [{ t: 7.3, dur: 2.4, big: '$14M', text: 'lost in *one day*', src: 'Test' }];
const END = { t: 10, q: 'Would *you* stay home?', opts: ['Yes', 'No'], cta: 'Comment A or B', loop: 'Which is why —' };
const AUDIO = { mood: 'none', music: 0, sfx: 0.9, hits: [] };
const THUMB = { t: 1.0, text: '*HUD* test' };
