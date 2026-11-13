  ground({ color: '#9AAE78', flat: 200, hills: 0 });
  // v3.18 costumes: every figure({ costume }) of the topic list in three rows, plus char('you') in two outfits (keeps the character's skin)
  const NAMES = ['santa', 'elf', 'winter', 'pharaoh', 'galabeya', 'archaeologist', 'tommy', 'german1914',
    'police', 'prisoner', 'guard1960', 'suit', 'stewardess', 'worker', 'smock1911', 'customs',
    'sailor17', 'captain17', 'maya', 'mongol', 'toga', 'pilgrim', 'scrubs', 'feral', 'scientist60s'];
  NAMES.forEach((c, i) => { const row = Math.floor(i / 8), col = i % 8;
    const f = figure({ costume: c, seed: i + 3, expr: 'calm' }); world.add(f.root);
    f.root.position.set((col - 3.5) * 1.15 + (row === 3 ? 4 : 0), 0, -row * 2.4); });
  const y1 = char('you', { outfit: 'pharaoh' }); world.add(y1.root); y1.root.position.set(-6.5, 0, 2.2);
  const y2 = char('you', { outfit: ['santa'] }); world.add(y2.root); y2.root.position.set(-5.2, 0, 2.2);
  const w = figure({ costume: 'tommy', seed: 9 }); world.add(w.root); w.root.position.set(12, 0, -1); walk(w, [[12, -1], [9, -1]], { t0: 0, speed: 1.2 });
  const s = figure({ costume: 'scrubs', mask: true, seed: 4 }); world.add(s.root); s.root.position.set(12, 0, 1);
