  // v3.27 dress(): suburb-winter street — a walker on the pavement, a car on the road, a neighbour at an open front door; close-up, wide and mid shot.
  // tests/run.sh dress builds this; work/cmp/dress-*.jpg compare it with and without the dress() line
  ground({ color: '#E8EEF4', flat: 80, hills: 0 });
  const H = house(world, 0, -7, { w: 6, d: 5, h: 2.8, wall: '#EDE3D0', roof: '#4A3A30', lit: true, chimney: true, flowers: false });
  house(world, -13, -8, { ry: 0.2, wall: '#E2D4BE', roof: '#5A3A2E', flowers: false }); house(world, 13, -8, { ry: -0.2, wall: '#DCCCB4', roof: '#3E3A36', flowers: false });
  road(world, [[-70, 4], [70, 4]], { w: 6 });
  const W = figure({ seed: 4 }); world.add(W.root); W.root.position.set(-9, 0, 0.2); walk(W, [[-9, 0.2], [9, 0.2]], { t0: 0, speed: 1.3 }); track('walker', W);
  const N = figure({ seed: 9 }); world.add(N.root); N.root.position.set(0.4, 0, -3.6); N.root.rotation.y = 0.3; track('neighbour', N); openDoor(H, 5.5);
  const V = vehicle(world, -45, 5.2, { kind: 'car', ry: Math.PI / 2, color: '#B8302A' }); drive(V, [[-45, 5.2], [45, 5.2]], { t0: 0, speed: 9 });
  emit('snow', { at: [0, 0, 0], t0: -2, t1: DUR, rate: 120, size: 0.05, cover: false });
  dress('suburb-winter');
  biome('snow', { backdrop: 'snow' });
