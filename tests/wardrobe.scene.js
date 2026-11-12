  ground({ color: '#9AA88A', flat: 300, hills: 0 });
  const ALL = [], put = (f, x) => { if (!f.root.parent) world.add(f.root); f.root.position.set(x, 0, 0); f.root.rotation.y = 0; ALL.push(f); return f; };
  // hair styles (x 0–15), hats and outfits of 'you' (x 25–47.5), clothes (x 60–72.5), warriors (x 85–112.5)
  ['short', 'buzz', 'spiky', 'long', 'bun', 'curly', 'mohawk'].forEach((h, i) => put(char('you', { outfit: ['hair', h, ['blond', 'ginger', 'black'][i % 3]] }), i * 2.5));
  [['straw'], ['cap'], ['capBack'], ['beanie'], ['cowboy'], ['cap', 'long'], ['beanie', 'bun'], ['straw', 'long'], ['cowboy', 'curly'], ['shades', 'hair', 'spiky']].forEach((o, i) => put(char('you', { outfit: o }), 25 + i * 2.5));
  put(char('steve'), 60); put(figure({ shirt: '#D8C4A0', pants: '#4A3A32', coat: true, hairStyle: 'bun', hair: '#5A3A22', skin: '#EFCFB4' }), 62.5);
  put(figure({ shirt: '#3D7BD9', cape: '#B8302A', hairStyle: 'long', hair: '#2A211D' }), 65); put(figure({ shirt: '#56613A', jacket: true, hold: '#2A2A2A' }), 67.5);
  put(figure({ shirt: '#7B5B43', jacket: 'knit', glasses: 'readers', hairStyle: 'short' }), 70); put(figure({ kind: 'zombie' }), 72.5);
  ['soldier', 'knight', 'viking', 'spartan', 'roman', 'samurai', 'ninja', 'pirate', 'cowboy', 'bandit', 'swat', 'caveman'].forEach((k, i) => put(warrior(k, { seed: 3 + i * 7, ...(i % 3 ? { weapon: false } : {}) }), 85 + i * 2.5));
  ALL.forEach((f, i) => {
    const x = f.root.position.x;
    tick(t => { if (t < 1.6 || t >= 9.4) return; const m = t < 3.6 ? 'walk' : t < 5.2 ? 'run' : t < 6.6 ? 'idle' : t < 8 ? 'cheer' : 'panic'; pose(f, m, t * (m === 'run' ? 8 : 5.4), t, { v: m === 'walk' ? 1.4 : m === 'run' ? 4.5 : 0 }); });
    const side = [x + (i % 2 ? 6 : -6), 1.6, 1.5], ahead = [x, 1.6, 20], mix = (a, b, k) => a.map((v, j) => v + (b[j] - v) * sm01(k));   // look set once as a function of t (smooth hand-overs)
    f.look = t => t < 1.6 ? mix(ahead, side, (t - 0.7) / 0.4) : t < 11.4 ? mix(side, ahead, (t - 1.6) / 0.4) : t < 13.2 ? mix(ahead, camera.position.toArray(), (t - 11.4) / 0.4) : mix(camera.position.toArray(), ahead, (t - 13.2) / 0.4);
    punch(f, 5.6); punch(f, 6.1, { side: 'L' });
    sit(f, 9.4, { t1: 11.4 });
    gesture(f, 11.5, 'stop', { dur: 1.5 }); react(f, 13.2, 'startle');
    if (i % 5 === 4) ragdoll(f, 14, { power: 2.5 }); else fallDown(f, 14, { land: i % 2 ? 'back' : 'front' });
  });
  // real walking: start, stop, turn round, run; turning on the spot
  const w1 = figure({ shirt: '#E3B23C', coat: true, hairStyle: 'long', hair: '#5C3F2A' }); world.add(w1.root); w1.root.position.set(130, 0, -4);
  walk(w1, [[130, -4], [130, 3]], { t0: 0.5, speed: 1.4 }); walk(w1, [[130, 3], [130, -4]], { t0: 6.5, speed: 4.5, mode: 'run' });
  const w2 = char('you', { outfit: ['cowboy'] }); world.add(w2.root); w2.root.position.set(133, 0, 0);
  faceTo(w2, [140, 0], 1, 3); faceTo(w2, [126, 0], 4, 6); faceTo(w2, [133, -8], 7, 9);
