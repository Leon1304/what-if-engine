  ground({ color: '#7FA05A', flat: 120, hills: 0 });
  // look v2 test: houses + snow-white wall + warm window (day / golden), a figure in black (night close shot), a night room with a window and a lamp
  house(world, -6, -4, { ry: 0.3 }); house(world, 6, -6, { ry: -0.2, color: '#F4F4F2' });
  box(world, 3, 1.2, 0.4, '#F6F6F4', -3, 0, 3);   // near-white wall: must stay white (no tint from separation)
  const a = figure({ shirt: '#D94F3D', seed: 3 }); world.add(a.root); a.root.position.set(-1.5, 0, 0.5); a.root.rotation.y = 0.5;
  const k = figure({ shirt: '#141414', pants: '#101010', shoes: '#0A0A0A', hair: '#0E0C0A', seed: 6 }); world.add(k.root); k.root.position.set(0, 0, 1.5); k.root.rotation.y = 0.6;
  const R = interior(world, 19, -1, { kind: 'living', night: true });
  const m = figure({ shirt: '#1A1A22', pants: '#14141A', seed: 8 }); world.add(m.root); m.root.position.fromArray(R.toWorld(0.6, 0.4)); m.root.rotation.y = 0.4;
