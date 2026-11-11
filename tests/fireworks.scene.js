ground({ color: '#4E6B34', flat: 30 });
fireworkBox(world, 0, 0, 2);
const h = horde({ n: 40, from: [0, 7], r: 6, to: [0, 0], around: true, stop: 3, t0: -3, t1: -1, rise: false, speed: [0.6, 0.9], gaze: { t: 2.5, at: [0, 24, -14], spread: 0.8 } });
const h2 = horde({ n: 20, from: [-10, 8], r: 4, to: [-4, 0], t0: -2, t1: 0, rise: false, gaze: { t: 3, at: [0, 24, -14], arms: 'up' } });
LIVE.z = t => h.count(t) + h2.count(t);
fireworks({ from: [0, 0.6, 2], at: [0, 22, -14], area: [20, 6, 8], t0: 0.5, t1: 7, every: 0.45 });
