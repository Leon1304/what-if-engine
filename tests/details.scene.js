  // v2.40.x object detail and fixes: farm buildings, town, parked aircraft and helis on their gear, boats without bow poles, chained door calls
  ground({ color: '#7FA052', flat: 160, hills: 0 });
  const H = house(world, 0, 0, { lit: 1.4, smoke: true }); openDoor(H, 1); openDoor(H, 3, { angle: 0 }); openDoor(H, 5);   // open, shut (bounces off the frame), open again
  const B = barn(world, 14, 0, {}); openDoor(B, 2); silo(world, 22, -3, {}); windmill(world, 28, 2, {});
  fence(world, [[-4, 5], [6, 5], [8, 9]]); haybale(world, 18, 5); haybale(world, 19.5, 5.6, 0.7); lamp(world, 3, 5.5, {}); flagpole(world, 8, 3, {});
  ['round', 'pine', 'birch', 'dead', 'palm'].forEach((k, i) => tree(world, -20 + i * 3, 0, { kind: k })); rock(world, -15, 4, 1.2); bush(world, -9, 4, { flowers: '#FF6FA0' });
  road(world, [[-40, 40], [60, 40]], { curb: true }); tower(world, -6, 32, { style: 'brick', w: 6, d: 6, h: 14 }); tower(world, 4, 32, { style: 'glass', w: 4, d: 6, h: 20 }); tower(world, 14, 32, { style: 'deco', h: 28 });
  trainStation(world, 40, 20, { len: 24 }); supermarket(world, -40, 20);
  aircraft({ kind: 'cessna', x: 60, z: -20, ry: 0.6 }); heli(world, { kind: 'news', x: 75, z: -20, ry: 0.6 });
  water({ level: -0.3, size: 200, z: -300 }); ship(world, 'speedboat', 0, -300, { ry: 0.6 }); ship(world, 'fishing', 20, -300, { ry: 0.6 });
  window.__D = [H.door, B.door];
