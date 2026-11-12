  ground({ color: '#9AA88A', flat: 300, hills: 0 });
  const add = (f, x, z = 0, ry = 0) => { world.add(f.root); f.root.position.set(x, 0, z); f.root.rotation.y = ry; return f; };
  const mood = t => t < 1 ? 'calm' : t < 2 ? 'scared' : t < 3 ? 'sad' : t < 4 ? 'happy' : 'calm';
  // line-up: every build + everyday clothes
  const L = [
    figure({ build: 'man', shirt: '#3D7BD9', beard: 'full', hair: '#3A2A1E', belt: true, watch: true }),
    figure({ build: 'woman', shirt: '#D94F3D', hairStyle: 'ponytail', hair: '#5C3F2A', skirt: '#2E3A5C' }),
    figure({ build: 'kid', shirt: '#E3B23C', sleeves: 'short', hairStyle: 'spiky', backpack: '#C0392B' }),
    figure({ build: 'teen', top: 'hoodie', shirt: '#6A3FA0', hairStyle: 'short', hair: '#1E1A18' }),
    figure({ build: 'old', shirt: '#7B5B43', jacket: 'knit', hairStyle: 'bald', beard: 'mustache', glasses: 'readers' }),
    figure({ build: 'heavy', shirt: '#3DA56A', sleeves: 'short', beard: 'stubble', hairStyle: 'buzz' }),
    figure({ build: 'slim', shirt: '#F2F2F2', hairStyle: 'long', hair: '#D8B25A', dress: '#E84A5F' }),
    figure({ build: 'muscular', shirt: '#2B2F3A', sleeves: 'short', beard: 'goatee', hairStyle: 'buzz', hair: '#1E1A18' }),
    figure({ build: 'tall', shirt: '#4F6F8F', coat: true, hairStyle: 'curly' })
  ];
  L.forEach((f, i) => { add(f, i * 1.25, 0); f.expr = mood; f.look = 'cam'; });
  // gait moods walking past (z = 8)
  ['tired', 'proud', 'scared', 'sneaky', 'cool'].forEach((g, i) => { const f = add(figure({ build: i % 2 ? 'woman' : 'man', gait: g, shirt: ['#56613A', '#C0392B', '#3D7BD9', '#2B2622', '#E3B23C'][i] }), -6, 6 + i * 1.2, Math.PI / 2);
    walk(f, [[-6, 6 + i * 1.2], [16, 6 + i * 1.2]], { t0: 4.2 + i * 0.15, speed: 1.3 }); });
  // hands: open, fist, point, grip a rail (close-up 8–10 s)
  const h = add(figure({ shirt: '#3D7BD9', sleeves: 'short' }), 20, 0, 0);
  const rail = box(world, 1.2, 0.05, 0.05, '#8A8F98', 20.6, 1.0, 0.45);
  hands(h, 'open', 8, 8.6, { side: 'L' }); hands(h, 'fist', 8.6, 9.2, { side: 'L' }); hands(h, 'point', 9.2, 10, { side: 'L' });
  grab(h, [20.45, 1.03, 0.45], 8.2, 10, { side: 'R' });
  // ponytail + backpack: stand, wind up, run (10–12 s)
  const r = add(figure({ build: 'woman', hairStyle: 'ponytail', hair: '#B5562A', backpack: true, top: 'hoodie', shirt: '#2E86AB' }), 28, 0, Math.PI / 2);
  walk(r, [[28, 0], [40, 0]], { t0: 10.6, speed: 4.2, mode: 'run' });
  // a background extra (fidgets on his own)
  add(figure({ shirt: '#8E5BD9', build: 'heavy' }), 12, -2, 0);
