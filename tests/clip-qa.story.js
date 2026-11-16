const CFG = { dur: 13.5, seed: 7, locale: 'en-US', kind: 'story', badge: 'What if', accent: 'blue', filter: 'film', grain: 0.03, vignette: 0.35, saturation: 1.08, contrast: 1.05,
  shadows: true, area: 30, renderScale: 0.75, msaa: 2, sunAz: -35, handheld: 0.2, coverT: 1.2, capPos: 'mid', karaoke: true, wordRate: 0.085, voice: false, series: null, cast: {}, transition: 'cut', gore: 'blood' };
const LIVE = {};
const BEATS = [{ t: 0, dur: 0.4, kick: 'Test', text: 'clip QA *test*', big: true, instant: true }];
const CAM = [   // one cut per group (portrait frames are narrow)
  ...shot('wide', 0, 1, [-3, 1, 4], { az: 0, dist: 8, h: 2, fov: 50, move: 'static', tr: 'cut' }),
  ...shot('wide', 1, 1, [-8.2, 1, 4.5], { az: 90, dist: 4, h: 1.2, fov: 50, move: 'static', tr: 'cut' }),
  ...shot('wide', 2, 1, [5, 1.2, -2.5], { az: 10, dist: 7, h: 1, fov: 50, move: 'static', tr: 'cut' }),
  ...shot('wide', 3, 1, [4.4, 1.2, 18.3], { az: 30, dist: 4, h: 1.5, fov: 55, move: 'static', tr: 'cut' }),
  ...shot('wide', 4, 1, [10, 1.2, 8], { az: 15, dist: 6, h: 1.5, fov: 50, move: 'static', tr: 'cut' }),
  ...shot('wide', 5, 1, [15, 1, 2], { az: 60, dist: 7, h: 3, fov: 50, move: 'static', tr: 'cut' }),
  ...shot('wide', 6, 1, [-0.6, 1, 9], { az: 90, dist: 6, h: 2, fov: 50, move: 'static', tr: 'cut' }),
  ...shot('wide', 7, 1, [103.2, 1, 3.2], { az: 20, dist: 9, h: 3, fov: 50, move: 'static', tr: 'cut' }),
  ...shot('wide', 8, 1.5, [31.5, 0.5, -3], { az: 90, dist: 4, h: 1.2, fov: 50, move: 'static', tr: 'cut' }),   // the tunnel is open on its right side (cut)
  ...shot('wide', 9.5, 1.5, [40, 1.2, 0], { az: 180, dist: 6, h: 0.3, fov: 50, move: 'static', tr: 'cut' }),
  ...shot('wide', 11, 1, [65, 1.3, 0], { az: 60, dist: 9, h: 1.5, fov: 50, move: 'static', tr: 'cut' }),
  ...shot('wide', 12, 1, [80, 1.6, 0], { az: 60, dist: 11, h: 2, fov: 50, move: 'static', tr: 'cut' })
];
const SHAKES = [], FLASHES = [];
const SKY = [[0, 'day']];
const PHASES = t => 'Clip QA test';
const STATS = [];
const END = { t: 13.1, q: 'Test?', opts: ['A', 'B'], cta: 'x' };
const AUDIO = { mood: 'none', music: 0, sfx: 1, hits: [], amb: [[0, 6, 'farm', 0.5]] };
const THUMB = { t: 1.2, text: '*Clip QA* test' };
const QA_OK = [   // tests/run.sh checks the whole audit: only OVERLAP · INSIDE · HEADCLIP may stay open
  [/^HITBOX: 'Door' #\d+ stands/, 'walks through the open front door into the house – the door frame box blocks the doorway (open, figures)'],
  [/^QA: FOOTSLIDE – 'Door'/, 'stops inside the doorway – stop slide (open, figures)'],
  [/^HITBOX: 'Crawl' #\d+ stands/, 'crawls in the 0.95-m tunnel – the hitbox check still takes the crawler for a standing body under the ceiling (open)'],
  [/^QA: VEHICLE – car on drive\(\) #0 drives \/ flies through a building \/ prop at 9\.3 s \(40\.0/, 'motorbike in the 1.7-m tunnel touches a tunnel frame box at the entrance (open, tunnel geometry)'],
  [/^QA: CAMCLIP – shot 10 /, 'camera low behind the rider inside the narrow tunnel on purpose (headDuck test)']
];
