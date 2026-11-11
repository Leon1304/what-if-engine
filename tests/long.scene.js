ground({ size: 360, coast: 40, beach: 30, flat: 60, hills: 6, color: '#5E7C3B', sand: '#D2BE8C' });
water({ level: -0.3, size: 600, seg: 90, color: '#355E70', shallow: '#4E8A8C' });
ridge({ kind: 'bluff', x0: -90, x1: 90, foot: 10, h: 14 });
const B = bunker(world, -8, 6, { kind: 'casemate' }); bunker(world, 14, 8, { kind: 'pillbox' });
beachObstacles(world, { x0: -40, x1: 40, rows: [26, 32], gap: 7, seed: 2 });
for (let i = 0; i < 6; i++) splash(-10 + i * 4, 42, 0.6 + i * 0.5, { size: 1.2 });
emit('spray', { at: [0, 0.2, 44], t0: 0, t1: 14, rate: 30 });
const s = char('soldier', { outfit: 'army' }); walk(s, [[-4, 36], [2, 30], [6, 24]], { t0: 0.5, t1: 7.5, speed: 1.4 });
