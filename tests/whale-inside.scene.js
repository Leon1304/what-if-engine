water({ level: 0, waves: 0.3 }); ground({ color: '#2A4A5A', flat: 400, depth: -30 });
const W = sea({ kind: 'spermwhale', x: 0, y: 0.8, z: 0 }); W.do('spout', 0.5); W.do('open', 1.5, { dur: 2 });
const T = innards(world, 1000, 0, { kind: 'throat', len: 16, r: 1.5, squeeze: [[3.5, 6]] });
const S = innards(world, 2000, 0, { kind: 'stomach', r: 4.2, squeeze: [[6.5, 9]] });
glow(1000, 2, -2, { intensity: 30, dist: 14, color: '#FFE0D0', flicker: 0 }); glow(2000, 3, 1, { intensity: 40, dist: 12, color: '#FFE8D0', flicker: 0 });
