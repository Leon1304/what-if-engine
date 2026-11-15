  // v3.34: Krampus night kit — figure({ costume: 'krampus' | 'nicholas' }), birchSwitch, torch, crozier, book, treatBoot
  ground({ color: '#E8ECF2', flat: 90, dress: false });
  const K = figure({ costume: 'krampus', eyes: 2.2, seed: 3 }); world.add(K.root); K.root.position.set(0, 0, 0);
  holdItem(K, birchSwitch(null, 0, 0, 0), -1e9, 1e9, { side: 'R' });
  const K2 = figure({ costume: 'krampus', seed: 4, fur: '#4A3A2A', wood: '#9A6A3A' }); world.add(K2.root); K2.root.position.set(30, 0, 0);
  holdItem(K2, torch(null, 0, 0, 0, { light: { dist: 6 } }), -1e9, 1e9, { side: 'R', rot: [0.9, 0, 0] });
  const N = figure({ costume: 'nicholas', seed: 5 }); world.add(N.root); N.root.position.set(-30, 0, 0);
  holdItem(N, crozier(null, 0, 0, 0), -1e9, 1e9, { side: 'R' }); holdItem(N, book(null, 0, 0, 0, { color: '#C9A040', open: 6.4 }), -1e9, 1e9, { side: 'L', off: [0, -0.42, 0.12], rot: [-1.2, 0, 0] });
  treatBoot(null, 60, 0, { swap: [9.0, 'switch'] }); treatBoot(null, 60.45, 0.05, { fill: 'coal', ry: -0.3 });
  glow(0, 2.2, 2.4, { intensity: 1.2, dist: 7, flicker: 0, color: '#FFD8B0' });
