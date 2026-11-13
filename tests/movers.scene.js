  ground({ color: '#9AAE78', flat: 200, hills: 0 });
  // v3.19 obstacle rules: asset() models are hitboxes (the walker goes round the parked van), a car on drive() passes a crowd that stands beside the lane,
  // the helicopter climbs over the house before it flies on; QA: VEHICLE / BACKWARD stay empty
  asset(world, 'own/jlm_house', -14, -14, { ry: Math.PI / 2 });
  asset(world, 'own/car_van', 0, -2);
  const w = figure({ costume: 'police', seed: 3 }); world.add(w.root); w.root.position.set(1.4, 0, 4); walk(w, [[1.4, 4], [1.4, -8]], { t0: 0.5, speed: 1.4 });   // grazes the van: pushed past its side
  const car = asset(world, 'own/car_hatch', 6, 20, { dyn: true, ry: Math.PI });
  drive(car, [[6, 20], [6, -20]], { t0: 1, speed: 7 });
  horde({ kind: 'human', n: 14, from: [11, 0], r: 2.2, to: [11, 0], stop: 0, pile: 3, t0: -3, t1: -2, rise: false, speed: [0.3, 0.5] });
  const H = heli(world, { kind: 'rescue', x: -14, y: 3, z: 6, ry: Math.PI });
  fly(H, [[-14, 3, 6], [-14, 4, 5], [-14, 22, 4], [-14, 26, -30], [-14, 28, -60]], { t0: 2, speed: 8, ramp: 1.5 });
