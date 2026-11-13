  ground({ color: '#BFAE86', flat: 200, hills: 0 });
  // crossing at the origin, 16 × 16 m; road pieces (16 wide, 12 long) along z and, turned by 90°, along x. Sidewalk top: y = 0.15
  asset(world, 'own/jlm_road_cross', 0, 0);
  for (const z of [14, 26, 38, -14, -26]) asset(world, 'own/jlm_road', 0, z);
  for (const x of [14, 26, -14, -26]) asset(world, 'own/jlm_road', x, 0, { ry: Math.PI / 2 });
  // traffic lights on the corners, heads facing the traffic that arrives (ry 0 faces +z); one shows red, one green
  const off = '#2A2A2A';
  asset(world, 'own/traffic_light', 5.6, 5.6, { y: 0.15, tint: { light_yellow: off, light_green: off, ped_red: off } });
  asset(world, 'own/traffic_light', -5.6, -5.6, { y: 0.15, ry: Math.PI, tint: { light_red: off, light_yellow: off, ped_green: off } });
  // sidewalk furniture along the +z road (x = ±6.5), bus stop open towards the road, plants
  for (const z of [10, 22, 34]) { asset(world, 'own/street_lamp', 5.6, z, { y: 0.15 }); asset(world, 'own/street_lamp', -5.6, z, { y: 0.15 }); }
  asset(world, 'own/bench', 7.4, 16, { y: 0.15, ry: -Math.PI / 2 }); asset(world, 'own/trash_bin', 7.3, 18.2, { y: 0.15, ry: -Math.PI / 2 });
  asset(world, 'own/bus_stop', -7.0, 28, { y: 0.15, ry: Math.PI / 2 });
  asset(world, 'own/palm_planter', 6.8, 26, { y: 0.15 }); asset(world, 'own/palm_planter', -6.8, 14, { y: 0.15, ry: 2 });
  for (const [x, z] of [[10, 12], [10, 20], [-10, 18], [-10, 36], [12, -10], [-12, -10]]) asset(world, 'own/cypress', x, z, { ry: x + z });
  // traffic: a hatchback drives towards the crossing (right-hand traffic: heading -z keeps to +x), a van is parked, another car waits
  const car = asset(world, 'own/car_hatch', 1.75, 40, { dyn: true, tint: { paint: '#B03A2E' } });
  drive(car, [[1.75, 40], [1.75, 9.5]], { t0: 0, speed: 9 });
  asset(world, 'own/car_van', -3.9, 18, { ry: 0 });
  asset(world, 'own/car_hatch', -1.75, -12, { tint: { paint: '#2E5E8E' } });
  // a house on each side for context
  asset(world, 'own/jlm_house', 15, 22, { ry: -Math.PI / 2 }); asset(world, 'own/jlm_block', -17, 26, { ry: Math.PI / 2 });
