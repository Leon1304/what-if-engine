ground({ color: '#6E8A46', flat: 30 });
house(world, 0, 0, {});
tree(world, -6, -3, { kind: 'round' }); tree(world, 6, -5, { kind: 'pine' }); tree(world, -4, 6, { kind: 'birch' });
const you = char('you', { expr: 'scared' }); walk(you, [[4, 6], [1, 4], [-2, 7]], { t0: 0.5, t1: 7.8, speed: 1.2 });
