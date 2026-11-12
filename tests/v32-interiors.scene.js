  ground({ color: '#7FA05A', flat: 120, hills: 0 });
  // v3.2: camera-aware front wall + ceiling, lit hall behind an open door, museum room, raised + rotated room, plaza, house hall
  const A = interior(world, 0, 0, { kind: 'living' }); openDoor(A, 1.4);
  const M = interior(world, 30, 0, { kind: 'museum', ry: 0.3 });
  const K = interior(world, -20, 0, { kind: 'kitchen', y: 2.5, ry: 0.6 });
  const G2 = interior(world, 30, 22, { kind: 'gallery', w: 9, d: 7 });
  const P = plaza(world, 0, 40, { w: 26, d: 18, style: 'forecourt' });
  const H = house(world, 0, 56, { ry: Math.PI }); openDoor(H, 10.5);
  const v = figure({ shirt: '#3A5A8A', seed: 4 }); world.add(v.root); v.root.position.fromArray(M.toWorld(1.2, 1.2)); v.root.rotation.y = 0.3 + Math.PI;
  const s = figure({ shirt: '#8A3A3A', seed: 9 }); world.add(s.root); sit(s, -1, { seat: P.benches[0] });
