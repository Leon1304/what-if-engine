  // env-props interior clutter: six rooms with the default clutter, a walker crossing the living room (routes stay clean), a prison cell and a plane cabin
  ground({ color: '#7FA05A', flat: 300, hills: 0, dress: false });
  const rooms = ['living', 'kitchen', 'bedroom', 'office', 'kids', 'garage'].map((k, i) => interior(world, i * 14, 0, { kind: k }));
  const f = figure({ skin: '#E8B890', shirt: '#D94F3D', pants: '#2E3A5C' }); world.add(f.root); f.root.position.set(-2.6, 0, 1.6); walk(f, [[-2.6, 1.6], [2.6, 1.6], [2.6, 2.4]], { t0: 0.3, speed: 1.1 });
  prisonCell(world, 100, 0, { light: true, tally: 27 });
  planeCabin(world, 140, 0, { rows: [8, 16], light: 1, outside: t => '#A8B4BE', tray: [[12, 'C']] });
  void rooms;
