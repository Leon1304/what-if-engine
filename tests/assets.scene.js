  ground({ color: '#8FA860', flat: 200, hills: 0 });
  // farm: barn, silo, windmill, fences, trees (Quaternius farm + nature), a parked car and a taxi driving by
  asset(world, 'farm/barn', 0, -6, { ry: 0.2 }); asset(world, 'farm/silo', 7, -8); asset(world, 'farm/windmill', -9, -12, { ry: 0.6 });
  for (let i = 0; i < 4; i++) asset(world, 'farm/fence', -9 + i * 5.9, 3);
  [[-22, -12, 'nature/commontree_1'], [12, -2, 'nature/pinetree_2'], [-6, 8, 'nature/bush_1'], [9, 6, 'nature/rock_2']].forEach(([x, z, n], i) => asset(world, n, x, z, { ry: i }));
  asset(world, 'cars/normalcar1', 5, 1, { ry: 1.2 });
  const taxi = asset(world, 'cars/taxi', -30, 12, { dyn: true }); drive(taxi, [[-30, 12], [30, 12]], { t0: 0, speed: 8 });
  // KayKit city corner, scaled to metres
  asset(world, 'city/building_a', 18, -10); asset(world, 'city/building_c', 27, -10); asset(world, 'city/road_straight', 18, -1, { ry: Math.PI / 2 }); asset(world, 'city/firehydrant', 14, -4);
  // animals walking (stride from body length), a T-Rex roaring, a horse running
  const cow = model('farmanim/cow'); world.add(cow.root); walk(cow, [[-4, 6], [4, 6]], { t0: 0, speed: 1 });
  const horse = model('farmanim/horse'); world.add(horse.root); walk(horse, [[-20, 0], [-8, 0]], { t0: 8, speed: 6, mode: 'run' });
  const rex = model('dino/trex'); world.add(rex.root); rex.root.position.set(-14, 0, -4); rex.root.rotation.y = 0.8; anim(rex, [[0, 'TRex_Idle'], [9, 'TRex_Attack']]); track('rex', rex);
