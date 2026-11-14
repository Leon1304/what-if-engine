  ground({ color: '#8E9A7A', flat: 200, hills: 0 });
  const bad = m => console.error('vehicle-doors: ' + m);
  // hatchback: the driver walks to door_1_out, enter() opens door_1 and sits on seat_driver; then a curve drive (front wheels steer) and a second segment that hands over
  const A = asset(world, 'own/car_hatch', 0, 0, { dyn: true, tint: { paint: '#B03A2E' } });
  if (!A.doors || A.doors.length !== 4 || !A._steer || !(A.wb > 2) || !A.markLocal('seat_driver')) bad('car_hatch doors / steer / marks');
  const d = figure({ shirt: '#2E4A7A', pants: '#2B2F3A', seed: 4 }); world.add(d.root); const o1 = A.at('door_1_out');
  walk(d, [[o1[0] + 2.2, o1[2] - 1.2], [o1[0], o1[2]]], { t0: -1.6, speed: 1.4 });
  enter(d, A, 0.3, { dur: 1.1 });
  drive(A, [[0, 0], [0, 7], [8, 15], [18, 15]], { t0: 2.2, speed: 6, t1: 6.2 });
  drive(A, [[26, 15]], { delay: 0.4, speed: 5 });   // second segment: starts where the first stopped, after 0.4 s
  // van convoy: follows the hatchback's whole track 8 m behind it (waits behind it until it sets off)
  const B = asset(world, 'own/car_van', 0, -8, { dyn: true, tint: { paint: '#3E6E9E' } });
  drive(B, null, { follow: A, gap: 8 });
  DEFER.push(() => { const p = B._posAt(0), q = B._posAt(9); if (Math.abs(p.z + 8) > 0.2 || Math.abs(p.x) > 0.2) bad('convoy start ' + p.x.toFixed(2) + ' ' + p.z.toFixed(2)); if (!(q.x > 8)) bad('convoy did not follow ' + q.x.toFixed(2)); });
  // parked van: cab door (passenger side) and both rear doors open
  const V = asset(world, 'own/car_van', -13, 0, { ry: Math.PI });
  if (!V.doors || V.doors.length !== 4) bad('car_van doors ' + (V.doors?.length ?? 0));
  openDoor(V, 6.4, { i: 1 }); openDoor(V, 6.8, { i: 2 }); openDoor(V, 7.1, { i: 3 });
  // hovercar on the ground: gull-wing door_l swings up (axis z from the build script); kiosk rear door swings out
  const C = asset(world, 'own/cp_hovercar', -16, 8.5, { ry: Math.PI / 2 });
  if (C.doors?.[0]?.userData.axis !== 'z') bad('hovercar door axis');
  openDoor(C, 6.6, { i: 0 });
  const K = asset(world, 'own/cp_kiosk', -9, -7.5, { ry: Math.PI });
  if (K.doors?.[0]?.userData.sign !== -1) bad('kiosk door sign');
  openDoor(K, 7.0);
  for (const [x, z, s] of [[-24, -6, 1], [10, -12, 2], [-4, 20, 3], [24, 4, 4]]) tree(world, x, z, { kind: s % 2 ? 'round' : 'birch' });
