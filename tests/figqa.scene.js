  ground({ color: '#9AA88A', flat: 300, hills: 0 });
  const add = (f, x, z = 0, ry = 0) => { world.add(f.root); f.root.position.set(x, 0, z); f.root.rotation.y = ry; return f; };
  const L = [
    figure({ build: 'man', shirt: '#3D7BD9', hairStyle: 'short', hair: '#3A2A1E', belt: true }),
    figure({ build: 'woman', shirt: '#D94F3D', hairStyle: 'long', hair: '#5C3F2A', coat: true }),
    figure({ build: 'heavy', shirt: '#3DA56A', sleeves: 'short', hairStyle: 'curly' }),
    figure({ build: 'teen', top: 'hoodie', shirt: '#6A3FA0', hairStyle: 'ponytail', hair: '#1E1A18', backpack: true }),
    figure({ build: 'muscular', shirt: '#2B2F3A', hat: true, hatStyle: 'cap' }),
    figure({ build: 'slim', shirt: '#F2F2F2', hairStyle: 'bun', hair: '#D8B25A', dress: '#E84A5F' }),
    figure({ build: 'old', shirt: '#7B5B43', coat: true, hairStyle: 'bald', beard: 'full' }),
    figure({ kind: 'zombie' })
  ];
  L.forEach((f, i) => { add(f, i * 1.45, 0); f.look = 'cam'; });
  dance(L[0], 0.3, 16, { style: 'hype' }); dance(L[1], 0.3, 16, { style: 'wave' }); react(L[2], 4.6, 'shrug'); gesture(L[3], 6.2, 'clap', { dur: 1.6 }); react(L[4], 8.4, 'facepalm'); dance(L[5], 0.3, 16, { style: 'twist' }); dance(L[6], 0.3, 16, { style: 'disco' }); react(L[7], 14.5, 'hit');
  // moving past (8–12 s): walk, run, sneak, limp
  [['walk', 1.3], ['run', 4], ['sneak', 1], ['limp', 0.9]].forEach(([m, sp], i) => { const f = add(figure({ build: ['man', 'woman', 'teen', 'heavy'][i], coat: i === 1, hairStyle: ['spiky', 'long', 'ponytail', 'short'][i] }), -4 + i * 0.7, 6.4 + i * 1.1, Math.PI / 2);
    walk(f, [[-4 + i * 0.7, 6.4 + i * 1.1], [14, 6.4 + i * 1.1]], { t0: 16.2, speed: sp, mode: m }); });
  // bending (12–16 s): sit, crouch/pet, carry heavy, stumble+fall
  const s = add(figure({ build: 'woman', coat: true, hairStyle: 'long' }), 0.5, 16, 0); sit(s, 20.2, { seat: [0.5, 0.45, 16], t1: 24 });
  const c = add(figure({ build: 'man', top: 'hoodie' }), 2.2, 16, 0); const crate = box(world, 0.5, 0.4, 0.4, '#8C6A44', 2.2, 0, 16.7); carry(c, crate, { pick: 20.4, heavy: true });
  const k = add(figure({ build: 'heavy', sleeves: 'short' }), 4, 16, -0.4); stumble(k, 20.6, { fall: true, getUp: 23 });
  const z = add(figure({ kind: 'zombie', coat: true }), 5.4, 16.3, -0.6); react(z, 20.4, 'hit');
