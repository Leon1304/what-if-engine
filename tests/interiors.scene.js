  ground({ color: '#7FA05A', flat: 300, hills: 0 });
  ['living', 'kitchen', 'bedroom', 'bathroom', 'office', 'kids', 'cellar', 'garage', 'bunker', 'classroom', 'shop'].forEach((k, i) => interior(world, i * 14, 0, { kind: k, night: k === 'cellar' || k === 'bunker' }));
