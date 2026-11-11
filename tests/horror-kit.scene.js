ground({ color: '#3A3F35' });
const R = interior(world, 0, 0, { kind: 'shop', w: 8, d: 6, night: true, lamps: true, ceiling: true });
const M = convexMirror(world, 3.6, 2.6, -2.8, { ry: -0.6 });
const you = char('you', { outfit: ['hair', 'short'] }); world.add(you.root); you.root.position.set(1.5, 0, 1.5);
hideDuring(you, [[0, 3]]); lensMask([[0, 3]]);
